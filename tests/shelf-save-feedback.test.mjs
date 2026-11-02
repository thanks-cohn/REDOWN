import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
const html=await readFile('extension/shelf.html','utf8'),code=await readFile('extension/shelf-save-feedback.js','utf8');
function fixture(theme='porcelain',stored={},reduced=false){
 const dom=new JSDOM(html,{url:'https://fixture.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.document.documentElement.dataset.shelfTheme=theme;w.matchMedia=()=>({matches:reduced});
 let now=0,id=0;const tasks=new Map(),listeners=[];
 w.setTimeout=(fn,ms)=>{tasks.set(++id,{at:now+ms,fn});return id;};w.clearTimeout=id=>tasks.delete(id);
 w.chrome={storage:{local:{get:async()=>stored},onChanged:{addListener:fn=>listeners.push(fn)}}};
 w.eval(code);
 const emit=(key,value)=>listeners.forEach(fn=>fn({[key]:{newValue:value}},'local'));
 const cloudflareLogin=()=>{w.document.getElementById('cf-state').dataset.state='connected';emit('cloudflareAuth',{accessToken:'live-token',sessionId:'session-one',expiresAt:Date.now()+60000});};
 const receipt=(provider,id)=>{
  if(provider==='cloudflare')cloudflareLogin();
  if(provider==='dropbox')emit('dropbox:state',{phase:'connected',accountId:'dbid:a',connectionId:'c'});
  emit('providerSaveReceipts',{totals:{[provider]:'1'},latest:{provider,id:provider+':'+id,
   verified:true,accountId:'dbid:a',connectionId:'c',at:Date.now(),
   ...(provider==='cloudflare'?{proof:'r2-head-v1',sessionId:'session-one'}:{})}});
 };
 const advance=ms=>{const end=now+ms;while(true){const next=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;tasks.delete(next[0]);next[1].fn();}now=end;};
 return {dom,w,emit,receipt,cloudflareLogin,advance,text:()=>w.document.querySelector('.provider-save-success')?.textContent,visibility:()=>w.document.querySelector('.provider-save-success')?.style.visibility};
}
test('all four cards hydrate counts without replay; exact classical choreography, duplicate suppression and restart from S',async()=>{
 for(const provider of ['cloudflare','google','dropbox','onedrive']){
  const h=fixture('porcelain',{providerSaveReceipts:{totals:{[provider]:'9'},latest:{id:'old',provider,at:Date.now()}}});await Promise.resolve();
  assert.equal(h.text(),undefined);h.receipt(provider,'one');assert.equal(h.text(),'S');h.advance(1050);assert.equal(h.text(),'SUCCESS!');
  h.advance(200);assert.equal(h.visibility(),'hidden');h.advance(170);assert.equal(h.visibility(),'visible');h.advance(190);assert.equal(h.visibility(),'hidden');h.advance(170);assert.equal(h.visibility(),'visible');
  h.advance(1219);assert.equal(h.text(),'SUCCESS!');h.advance(1);assert.equal(h.text(),undefined);
  h.receipt(provider,'one');assert.equal(h.text(),undefined);h.receipt(provider,'two');assert.equal(h.text(),'S');h.dom.window.close();
 }
});
test('Neon flashes whole word and removes it; reduced motion is static and theme/navigation cancels',async()=>{
 const h=fixture('neon');h.receipt('google','one');assert.equal(h.text(),'SUCCESS!');h.advance(160);assert.equal(h.w.document.querySelector('.provider-save-success').classList.contains('money-flash'),true);h.advance(160);assert.equal(h.w.document.querySelector('.provider-save-success').classList.contains('money-flash'),false);h.advance(720);assert.equal(h.text(),undefined);
 h.receipt('google','two');h.w.document.documentElement.dataset.shelfTheme='midnight';await Promise.resolve();assert.equal(h.text(),undefined);h.dom.window.close();
 const r=fixture('ocean',{},true);r.receipt('dropbox','r');assert.equal(r.text(),'SUCCESS!');r.advance(1599);assert.equal(r.visibility(),'');r.advance(1);assert.equal(r.text(),undefined);r.dom.window.close();
});
test('fresh unique arrival pulses retrigger, stale/future arrivals reject and cleanup is bounded',()=>{
 const h=fixture(),root=h.w.document.documentElement;
 h.emit('redownShelfImpact',{id:'a',at:Date.now()});assert.equal(root.dataset.saveImpact,'true');h.advance(500);
 h.emit('redownShelfImpact',{id:'b',at:Date.now()});h.advance(500);assert.equal(root.dataset.saveImpact,'true');h.advance(350);assert.equal(root.dataset.saveImpact,undefined);
 for(const at of [Date.now()-4000,Date.now()+10000])h.emit('redownShelfImpact',{id:String(at),at});assert.equal(root.dataset.saveImpact,undefined);h.dom.window.close();
});
test('orb geometry remains intact and isolated arrival no longer needs page storage access',async()=>{
 const source=await readFile('extension/background.js','utf8');
 const launch=source.slice(source.indexOf('async function launchSaveDroplet'),source.indexOf('// Go Home is a navigation'));
 const writes=[];let injections=0;
 const session={shelfColorScheme:'ocean',cloudflareAuth:{accessToken:'test-logged-in',expiresAt:Date.now()+60000}};
 const context=vm.createContext({crypto:webcrypto,Date,chrome:{storage:{local:{get:async()=>session,set:async p=>writes.push(p)}},scripting:{executeScript:async options=>{
  injections++;const page=new JSDOM('<body></body>',{runScripts:'outside-only'});const w=page.window;
  w.matchMedia=()=>({matches:false});w.Element.prototype.animate=()=>({finished:Promise.resolve()});
  const fn=w.eval('('+options.func.toString()+')');const result=await fn(...options.args);page.window.close();return [{result}];
 }}}});
 vm.runInContext(await readFile('extension/save-droplet-gate.js','utf8'),context);
 vm.runInContext(launch,context);
 session.cloudflareAuth=null;
 await context.launchSaveDroplet({menuItemId:'v3:folder'}, {id:1});
 assert.equal(injections,0,'logged-out click never shows balls');
 assert.equal(writes.length,0,'logged-out click never announces an arrival');
 session.cloudflareAuth={accessToken:'test-logged-in',expiresAt:Date.now()+60000};
 await context.launchSaveDroplet({menuItemId:'v3:folder'}, {id:1});
 assert.equal(injections,1);assert.equal(writes[0].redownShelfImpact.kind,'arrival');assert.ok(writes[0].redownShelfImpact.id);
 context.chrome.scripting.executeScript=async()=>{throw Error('Restricted page');};
 await context.launchSaveDroplet({}, {id:1});assert.equal(writes.length,1);
 context.chrome.scripting.executeScript=async()=>[{result:{reduced:true}}];
 await context.launchSaveDroplet({}, {id:1});assert.equal(writes[1].redownShelfImpact.kind,'reduced-motion-dispatch');
 assert.match(launch,/duration:860/);assert.doesNotMatch(launch.slice(launch.indexOf('func:async')),/chrome\.storage.*get/);
});
test('hidden arrival is bounded by freshness; reopening hydrates persistence without celebrating old receipts',async()=>{
 const h=fixture();let hidden=true;Object.defineProperty(h.w.document,'visibilityState',{get:()=>hidden?'hidden':'visible'});
 h.emit('redownShelfImpact',{id:'pending',at:Date.now()});assert.equal(h.w.document.documentElement.dataset.saveImpact,undefined);
 hidden=false;h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));assert.equal(h.w.document.documentElement.dataset.saveImpact,'true');
 h.receipt('onedrive','live');assert.equal(h.text(),'S');hidden=true;h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));assert.equal(h.text(),undefined);
 h.dom.window.close();const reopened=fixture('midnight',{providerSaveReceipts:{totals:{onedrive:'2'},latest:{provider:'onedrive',id:'live',at:Date.now()}}});await Promise.resolve();assert.equal(reopened.text(),undefined);assert.equal(reopened.w.document.querySelector('[data-provider="onedrive"] .provider-save-count').textContent,'2');reopened.dom.window.close();
});

test('unverified notifications, wrong provider IDs and stale account completions cannot celebrate',()=>{
 const h=fixture();
 for(const latest of [{provider:'dropbox',id:'dropbox:x'},{provider:'google',id:'dropbox:x',verified:true},{provider:'dropbox',id:'dropbox:other',verified:true,accountId:'dbid:other',connectionId:'other'}]){
  h.emit('providerSaveReceipts',{totals:{dropbox:'0'},latest:{...latest,at:Date.now()}});assert.equal(h.text(),undefined);
 }
 h.receipt('dropbox','valid');assert.equal(h.text(),'S');h.dom.window.close();
});
test('all non-Neon themes type each character, retain third hold, hide and repeat without blocking controls',async()=>{
 for(const theme of ['porcelain','midnight','ocean']){
  const h=fixture(theme);h.receipt('google','one');for(let i=1;i<=8;i++){assert.equal(h.text(),'SUCCESS!'.slice(0,i));if(i<8)h.advance(150);}
  h.advance(1950);assert.equal(h.text(),undefined);h.receipt('google','two');assert.equal(h.text(),'S');h.dom.window.close();
 }
 const css=await readFile('extension/shelf.css','utf8');assert.match(css,/"Times New Roman",Times,serif/);assert.match(css,/provider-save-success\{position:absolute;[^}]*pointer-events:none/);assert.match(css,/money-flash\{color:#8fff00/);
});

test('Dropbox disconnect or account switch removes an in-flight celebration',()=>{
 const h=fixture();h.receipt('dropbox','one');assert.equal(h.text(),'S');h.emit('dropbox:state',{phase:'reconnect'});assert.equal(h.text(),undefined);h.advance(4000);assert.equal(h.text(),undefined);h.dom.window.close();
});


test('end-to-end verified storage record increments each actual provider card and animates once',async()=>{
 const transferSource=await readFile('extension/transfer-counter.js','utf8');
 const context=vm.createContext({crypto:webcrypto});
 vm.runInContext(transferSource,context);
 const base=[
  {providerKind:'cloudflare',deliveryId:'cloudflare:one',location:'R2: bucket/file',verified:true,ok:true,status:'completed',bytes:12,
   destination:{accountId:'r2-account',bucketName:'bucket',key:'file'},
   verification:{kind:'r2-head-v1',sessionId:'session-one',key:'file',bytes:12,etag:'etag-one'}},
  {providerKind:'google',deliveryId:'google:one',location:'https://drive.google.com/file/d/one/view',verified:true,ok:true,status:'completed',bytes:12,destination:{provider:'google-drive',fileId:'one',name:'file.bin'}},
  {providerKind:'dropbox',deliveryId:'dropbox:one',location:'',verified:true,ok:true,status:'completed',bytes:12,
   destination:{proofVersion:1,accountId:'dbid:a',connectionId:'c',namespace:'123',root:'/',fileId:'id:file-1',
    revision:'rev1',contentHash:'a'.repeat(64),name:'file.bin',path:'/file.bin',bytes:12}},
  {providerKind:'onedrive',deliveryId:'onedrive:one',location:'',verified:true,ok:true,status:'completed',bytes:12,
   destination:{accountId:'user',driveId:'drive',rootId:'root',itemId:'item-1'}}
 ];
 for(const entry of base){
  const h=fixture('neon');
  if(entry.providerKind==='cloudflare')h.cloudflareLogin();
  if(entry.providerKind==='dropbox')h.emit('dropbox:state',{phase:'connected',accountId:'dbid:a',connectionId:'c'});
  const data={};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const storage={
   get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,clone(data[k])])),
   set:async patch=>{Object.assign(data,clone(patch));for(const [key,value] of Object.entries(patch))h.emit(key,clone(value));}
  };
  const counter=context.RedownTransferCounter.create(storage);
  const card=h.w.document.querySelector('[data-provider="'+entry.providerKind+'"]');
  assert.ok(card,'missing card '+entry.providerKind);
  assert.equal(card.querySelector('.provider-save-count')?.textContent,'0');
  await counter.record(entry);
  assert.equal(data.providerSaveReceipts.totals[entry.providerKind],'1');
  assert.equal(card.querySelector('.provider-save-count').textContent,'1');
  assert.equal(card.querySelector('.provider-save-success')?.textContent,'SUCCESS!');
  h.advance(1040);
  assert.equal(card.querySelector('.provider-save-success'),null);
  await counter.record(entry);
  assert.equal(card.querySelector('.provider-save-count').textContent,'1','repeat must not increment');
  assert.equal(card.querySelector('.provider-save-success'),null,'repeat must not replay');
  const second={...entry,deliveryId:entry.providerKind+':two',
   ...(entry.providerKind==='google'?{destination:{...entry.destination,fileId:'two'}}:{})};
  await counter.record(second);
  assert.equal(card.querySelector('.provider-save-count').textContent,'2');
  assert.equal(card.querySelector('.provider-save-success')?.textContent,'SUCCESS!');
  h.dom.window.close();
 }
});

test('failed, pending and unverified provider records neither increment nor celebrate',async()=>{
 const transferSource=await readFile('extension/transfer-counter.js','utf8');
 const context=vm.createContext({crypto:webcrypto});vm.runInContext(transferSource,context);
 const h=fixture('porcelain'),data={};
 const storage={
  get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,data[k]])),
  set:async patch=>{Object.assign(data,patch);for(const [key,value] of Object.entries(patch))h.emit(key,value);}
 };
 const counter=context.RedownTransferCounter.create(storage);
 for(const entry of [
   {providerKind:'google',deliveryId:'google:failed',ok:false,verified:false,status:'failed',location:''},
   {providerKind:'onedrive',deliveryId:'onedrive:queued',ok:true,verified:false,status:'queued',location:''},
   {providerKind:'dropbox',deliveryId:'dropbox:weak',ok:true,verified:true,status:'completed',location:'',
    destination:{accountId:'dbid:a',connectionId:'c',namespace:'123',root:'/',fileId:'id:one'}}
 ]){
  await counter.record(entry);
  assert.equal(h.w.document.querySelector('[data-provider="'+entry.providerKind+'"] .provider-save-count').textContent,'0');
  assert.equal(h.w.document.querySelector('.provider-save-success'),null);
 }
 assert.equal(data.providerSaveReceipts,undefined);
 h.dom.window.close();
});


test('Cloudflare SUCCESS is an authenticated verifier event, never a loginless timer',async()=>{
 const h=fixture('neon'),card=h.w.document.querySelector('[data-provider="cloudflare"]');
 const receipt=id=>({provider:'cloudflare',id:'cloudflare:'+id,verified:true,
   proof:'r2-head-v1',sessionId:'session-one',at:Date.now()});
 // A fresh-looking notification without an active login is NOT proof that the
 // currently rendered Shelf may claim a save.
 h.emit('providerSaveReceipts',{totals:{cloudflare:'1'},latest:receipt('first')});
 assert.equal(card.querySelector('.provider-save-success'),null);
 h.advance(3500);assert.equal(card.querySelector('.provider-save-success'),null,
   'timer alone may not create SUCCESS!');
 // Only the original receipt, and only once the same live OAuth session is
 // confirmed, may activate the presentation sequence.
 h.cloudflareLogin();
 assert.equal(card.querySelector('.provider-save-success')?.textContent,'SUCCESS!');
 h.emit('cloudflareAuth',null);
 assert.equal(card.querySelector('.provider-save-success'),null,'logout immediately cancels SUCCESS!');
 h.emit('providerSaveReceipts',{totals:{cloudflare:'2'},latest:receipt('second')});
 assert.equal(card.querySelector('.provider-save-success'),null,'logout cannot celebrate');
 h.w.document.getElementById('cf-state').dataset.state='connected';
 h.emit('cloudflareAuth',{accessToken:'another-session',sessionId:'session-two',expiresAt:Date.now()+60000});
 assert.equal(card.querySelector('.provider-save-success'),null,'wrong OAuth session cannot celebrate');
 h.emit('providerSaveReceipts',{totals:{cloudflare:'3'},latest:{
   ...receipt('unproven'),proof:undefined,sessionId:'session-two'}});
 assert.equal(card.querySelector('.provider-save-success'),null,'no HEAD proof cannot celebrate');
 h.dom.window.close();
});
