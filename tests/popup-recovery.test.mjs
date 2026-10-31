import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('extension/popup.html','utf8');
const script=readFileSync('extension/popup-recovery.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function view(recovery=true,mode='shelf'){
 const dom=new JSDOM(html,{url:'https://extension.invalid/popup.html'+(recovery?'?recovery=1&tabId=4&windowId=9':''),runScripts:'outside-only'}),calls=[];
 const w=dom.window;w.close=()=>calls.push(['close']);
 w.chrome={action:{setPopup:async o=>calls.push(['popup',o]),setTitle:async o=>calls.push(['title',o]),setBadgeText:async()=>{}},runtime:{getURL:p=>'chrome-extension://test/'+p,getManifest:()=>({version:'test'})},storage:{local:{get:async key=>{if(key==='toolbarOpenMode')return {toolbarOpenMode:mode};throw Error('storage unavailable');}}},tabs:{create:async o=>calls.push(['tab',o])},sidePanel:{open:o=>{calls.push(['panel',o]);return Promise.resolve();}}};
 w.eval(script);return {dom,w,calls,$:id=>w.document.getElementById(id)};
}
test('native recovery consumes its tab-only override without changing stored preference or using background',async()=>{
 for(const mode of ['shelf','popup']){
  const h=view(true,mode);await tick();assert.equal(h.$('recovery').hidden,false);
  assert.deepEqual(structuredClone(h.calls.find(c=>c[0]==='popup')[1]),{tabId:4,popup:mode==='popup'?'popup.html':''});
  h.$('retry-shelf').click();await tick();const close=h.calls.findIndex(c=>c[0]==='close'),panel=h.calls.findIndex(c=>c[0]==='panel');
  assert.ok(close>=0&&panel>close);assert.equal(h.calls[panel][1].windowId,9);
  h.$('shelf-settings').click();await tick();assert.match(h.calls.find(c=>c[0]==='tab')[1].url,/shelf.html#settings/);
  h.$('support-report').click();await tick();assert.match(h.$('recovery-status').textContent,/unavailable/);h.dom.window.close();
 }
});
test('explicit popup opening has no emergency banner or launch attempt',()=>{
 const h=view(false);assert.equal(h.$('recovery').hidden,true);assert.equal(h.calls.length,0);h.dom.window.close();
});
