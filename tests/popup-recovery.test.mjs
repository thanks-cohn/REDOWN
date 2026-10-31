import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('extension/popup.html','utf8');
const script=readFileSync('extension/popup-recovery.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function view(recovery=true){
 const dom=new JSDOM(html,{url:'https://extension.invalid/popup.html'+(recovery?'?recovery=1':''),runScripts:'outside-only'}),calls=[];
 const w=dom.window;w.chrome={runtime:{getURL:p=>'chrome-extension://test/'+p,getManifest:()=>({version:'test'})},storage:{local:{get:async()=>{throw Error('storage unavailable');}}},windows:{getLastFocused:async()=>({id:9})},tabs:{create:async o=>calls.push(o)},sidePanel:{open:o=>{calls.push(o);return Promise.resolve();}}};
 w.eval(script);return {dom,w,calls,$:id=>w.document.getElementById(id)};
}
test('recovery interface and retry work without background messaging or provider connection',async()=>{
 const h=view();await tick();assert.equal(h.$('recovery').hidden,false);
 h.$('retry-shelf').click();await tick();assert.equal(h.calls[0].windowId,9);
 h.w.chrome.sidePanel.open=()=>Promise.reject(Error('blocked'));h.$('retry-shelf').click();await tick();assert.match(h.$('recovery-status').textContent,/keep using/);
 h.$('shelf-settings').click();await tick();assert.match(h.calls[1].url,/shelf.html#settings/);
 h.$('support-report').click();await tick();assert.match(h.$('recovery-status').textContent,/unavailable/);h.dom.window.close();
});
test('explicit popup opening does not claim emergency recovery',()=>{
 const h=view(false);assert.equal(h.$('recovery').hidden,true);h.dom.window.close();
});
