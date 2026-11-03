import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {worker} from './helpers/background-worker.mjs';
const source=await readFile('extension/background.js','utf8');
const launch=source.slice(source.indexOf('async function launchSaveDroplet'),source.indexOf('// Go Home is a navigation'));
const metadata=await readFile('extension/click-feedback.js','utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
function background(stored={}){
 const messages=[],injections=[],navigation=event(),changes=event();
 const chrome={storage:{local:{get:async()=>stored},onChanged:changes},webNavigation:{onCommitted:navigation},tabs:{onRemoved:event()},
 runtime:{sendMessage:async e=>{messages.push(e);}},scripting:{executeScript:async options=>{injections.push(options);return [{result:{arrived:true}}];}}};
 const c=vm.createContext({chrome,crypto:webcrypto,Date});vm.runInContext(metadata,c);vm.runInContext(launch,c);
 return {c,chrome,messages,injections,navigation,changes};
}
test('no auth/storage/network await precedes injection, with logged-out, expired, unavailable and connected providers',async()=>{
 for(const stored of [{},{cloudflareAuth:{expiresAt:0}}, {googleDriveState:{phase:'error'}}, {cloudflareAuth:{accessToken:'fixture'}}]){
  const h=background(stored);await settle();
  h.chrome.storage.local.get=()=>{throw Error('interaction must not read storage');};
  h.c.listCloudflareAccounts=()=>{throw Error('interaction must not call cloud');};
  h.c.fetch=()=>{throw Error('interaction must not call network');};
  for(const [id,provider] of [['v3:folder','cloudflare'],['provider:google-drive','google'],['provider:dropbox','dropbox'],['provider:onedrive','onedrive']]){
   const n=h.injections.length,p=h.c.launchSaveDroplet({menuItemId:id},{id:1,windowId:7});
   assert.equal(h.injections.length,n+1,'injected synchronously, before any await');await p;
   assert.equal(h.messages.at(-1).provider,provider);
  }
 }
});
test('rapid clicks remain distinct; navigation suppresses arrival; restrictions and reduced motion use live surface fallback',async()=>{
 const h=background({click2CloudPulseDestination:'provider-card'});await settle();
 await Promise.all(Array.from({length:12},()=>h.c.launchSaveDroplet({menuItemId:'v3:x'},{id:1,windowId:7})));
 assert.equal(h.injections.length,12);assert.equal(new Set(h.messages.map(e=>e.id)).size,12);
 assert.ok(h.messages.every(e=>e.destination==='provider-card'));
 h.chrome.scripting.executeScript=async()=>{throw Error('restricted page');};
 await h.c.launchSaveDroplet({menuItemId:'v3:x'},{id:1,windowId:7});assert.equal(h.messages.length,13);
 let resolve;h.chrome.scripting.executeScript=()=>new Promise(r=>resolve=r);
 const run=h.c.launchSaveDroplet({menuItemId:'v3:x'},{id:1,windowId:7});
 h.navigation.listeners.forEach(fn=>fn({frameId:0,tabId:1}));resolve([{result:{arrived:true}}]);await run;
 assert.equal(h.messages.length,13);
 h.chrome.scripting.executeScript=async()=>[{result:{cancelled:true}}];
 await h.c.launchSaveDroplet({menuItemId:'v3:x'},{id:1,windowId:7});assert.equal(h.messages.length,13);
 h.chrome.scripting.executeScript=async()=>[{result:{reduced:true}}];
 await h.c.launchSaveDroplet({menuItemId:'v3:x'},{id:1,windowId:7});assert.equal(h.messages.length,14);
});
test('real page function uses captured origin and removes motion on pagehide',async()=>{
 const h=background();await h.c.launchSaveDroplet({menuItemId:'v3:x'},{id:1});
 const options=h.injections[0],dom=new JSDOM('<body></body>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.matchMedia=()=>({matches:false});w.eval(await readFile('extension/click-origin.js','utf8'));
 w.document.dispatchEvent(new w.MouseEvent('contextmenu',{clientX:123,clientY:234,bubbles:true}));
 let reject;w.Element.prototype.animate=()=>({finished:new Promise((_,r)=>reject=r),cancel(){reject(Error('cancelled'));}});
 const result=w.eval('('+options.func.toString()+')')(...options.args);
 assert.equal(w.document.querySelector('span').style.left,'123px');assert.equal(w.document.querySelector('span').style.top,'234px');
 w.dispatchEvent(new w.Event('pagehide'));assert.equal((await result).cancelled,true);assert.equal(w.document.querySelector('span'),null);dom.window.close();
});
test('native dispatcher acknowledges before slow resolution; no replay from transfer completion; controls do not pulse',async()=>{
 const h=worker(),pulses=[];await h.ready();h.context.launchSaveDroplet=async info=>pulses.push(info.menuItemId);
 let finish;h.context.getProfiles=()=>new Promise(r=>finish=r);h.context.resolveActiveRightClick=async()=>null;h.context.notify=async()=>{};
 const click=h.chrome.contextMenus.onClicked.listeners[0]({menuItemId:'v3:provider:cloudflare'},{id:1,windowId:7});
 assert.deepEqual(pulses,['v3:provider:cloudflare']);finish([]);await click;assert.equal(pulses.length,1);
 for(const id of ['redown-go-home','redown-setup','v3:provider:cloudflare:setup','v3:provider:cloudflare:more','v3:provider:cloudflare:separator'])assert.equal(h.context.RedownClickFeedback.providerFor(id),null);
});
const html=await readFile('extension/shelf.html','utf8'),shelf=await readFile('extension/shelf-click-feedback.js','utf8');
function surface(stored={}){
 const dom=new JSDOM(html,{url:'https://fixture.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const listeners=[],changes=[],writes=[],animations=[];
 w.matchMedia=()=>({matches:false});
 w.chrome={runtime:{id:'self',onMessage:{addListener:fn=>listeners.push(fn)}},windows:{getCurrent:async()=>({id:7})},tabs:{query:async()=>[{id:1}]},
 storage:{local:{get:async()=>stored,set:async patch=>{writes.push(patch);Object.assign(stored,patch);}},onChanged:{addListener:fn=>changes.push(fn)}}};
 w.Element.prototype.animate=function(frames,options){const run={node:this,frames,options,cancel(){run.cancelled=true;}};animations.push(run);return {...run,finished:new Promise(()=>{})};};
 w.eval(shelf);let seq=0;
 const emit=(patch={},sender={id:'self'})=>listeners.forEach(fn=>fn({type:'redownClickArrival',id:String(++seq),at:Date.now(),windowId:7,tabId:1,provider:'cloudflare',destination:'provider-card',...patch},sender));
 return {dom,w,emit,changes,writes,animations,stored};
}
test('all provider cards use actual geometry; hidden or offscreen cards fall back; live IDs deduplicate without suppressing distinct clicks',async()=>{
 const h=surface();await settle();
 for(const theme of ['neon','porcelain','midnight','ocean'])for(const provider of ['cloudflare','google','dropbox','onedrive']){
  h.w.document.documentElement.dataset.shelfTheme=theme;await settle();
  const card=h.w.document.querySelector(`[data-provider="${provider}"]`);
  card.getBoundingClientRect=()=>({left:40,top:100,width:200,height:80,right:240,bottom:180});
  h.emit({provider});await settle();const node=h.w.document.querySelector('.redown-click-light');
  assert.equal(node.dataset.target,provider);assert.equal(node.style.left,'140px');assert.equal(node.style.top,'140px');
  assert.equal(h.w.document.querySelector('.provider-save-success'),null);
 }
 h.emit({id:'same'});h.emit({id:'same'});h.emit({id:'distinct'});await settle();assert.equal(h.w.document.querySelectorAll('.redown-click-light').length,3);
 h.w.document.querySelector('[data-provider="cloudflare"]').getBoundingClientRect=()=>({left:40,top:2000,width:200,height:80,right:240,bottom:2080});
 h.emit();await settle();assert.equal(h.animations.at(-1).node.dataset.target,'shelf');
 h.w.document.getElementById('clouds-view').hidden=true;h.emit();await settle();assert.equal(h.animations.at(-1).node.dataset.target,'shelf');
 h.w.dispatchEvent(new h.w.Event('pagehide'));assert.equal(h.w.document.querySelector('.redown-click-light'),null);h.dom.window.close();
});
test('hidden, stale, wrong window/tab and page-origin events cannot replay; preference persists across new surfaces',async()=>{
 const h=surface();await settle();
 h.emit({at:Date.now()-4000});h.emit({at:Date.now()+1000});h.emit({windowId:8});h.emit({tabId:2});h.emit({}, {id:'self',tab:{id:1}});await settle();assert.equal(h.animations.length,0);
 let hidden=true;Object.defineProperty(h.w.document,'visibilityState',{get:()=>hidden?'hidden':'visible'});
 h.emit();await settle();hidden=false;h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));await settle();assert.equal(h.animations.length,0);
 const choice=h.w.document.getElementById('click2cloud-pulse-destination');assert.equal(choice.value,'shelf');choice.value='provider-card';choice.dispatchEvent(new h.w.Event('change'));await settle();
 assert.equal(h.writes.length,1);const reopened=surface(h.stored);await settle();assert.equal(reopened.w.document.getElementById('click2cloud-pulse-destination').value,'provider-card');
 assert.equal(reopened.animations.length,0);h.dom.window.close();reopened.dom.window.close();
});
