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
 const receipt=(provider,id)=>emit('providerSaveReceipts',{totals:{[provider]:'1'},latest:{provider,id,at:Date.now()}});
 const advance=ms=>{const end=now+ms;while(true){const next=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;tasks.delete(next[0]);next[1].fn();}now=end;};
 return {dom,w,emit,receipt,advance,text:()=>w.document.querySelector('.provider-save-success')?.textContent,visibility:()=>w.document.querySelector('.provider-save-success')?.style.visibility};
}
test('all four cards hydrate counts without replay; exact classical choreography, duplicate suppression and restart from S',async()=>{
 for(const provider of ['cloudflare','google','dropbox','onedrive']){
  const h=fixture('porcelain',{providerSaveReceipts:{totals:{[provider]:'9'},latest:{id:'old',provider,at:Date.now()}}});await Promise.resolve();
  assert.equal(h.text(),undefined);h.receipt(provider,'one');assert.equal(h.text(),'S');h.advance(525);assert.equal(h.text(),'SUCCESS!');
  h.advance(225);assert.equal(h.visibility(),'hidden');h.advance(170);assert.equal(h.visibility(),'visible');h.advance(190);assert.equal(h.visibility(),'hidden');h.advance(170);assert.equal(h.visibility(),'visible');
  h.advance(919);assert.equal(h.text(),'SUCCESS!');h.advance(1);assert.equal(h.text(),undefined);
  h.receipt(provider,'one');assert.equal(h.text(),undefined);h.receipt(provider,'two');assert.equal(h.text(),'S');h.dom.window.close();
 }
});
test('Neon flashes whole word and removes it; reduced motion is static and theme/navigation cancels',async()=>{
 const h=fixture('neon');h.receipt('google','one');assert.equal(h.text(),'SUCCESS!');h.advance(180);assert.equal(h.visibility(),'hidden');h.advance(150);assert.equal(h.visibility(),'visible');h.advance(210);assert.equal(h.text(),undefined);
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
 const context=vm.createContext({crypto:webcrypto,Date,chrome:{storage:{local:{get:async()=>({shelfColorScheme:'ocean'}),set:async p=>writes.push(p)}},scripting:{executeScript:async options=>{
  injections++;const page=new JSDOM('<body></body>',{runScripts:'outside-only'});const w=page.window;
  w.matchMedia=()=>({matches:false});w.Element.prototype.animate=()=>({finished:Promise.resolve()});
  const fn=w.eval('('+options.func.toString()+')');const result=await fn(...options.args);page.window.close();return [{result}];
 }}}});vm.runInContext(launch,context);await context.launchSaveDroplet({}, {id:1});
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
