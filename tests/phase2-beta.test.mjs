import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {openBetaStore} from '../extension/file-engine/indexeddb-store.mjs';
import {createSimulationEngine} from '../extension/file-engine/simulation.mjs';
const source={provider:'fake-r2',account:'demo',container:'sandbox',key:'Welcome.txt'};
const input={apiVersion:'0.1.0',operation:'copy',source,destination:{...source,key:'Once.txt'},idempotencyKey:'across-tabs'};
test('IndexedDB serializes concurrent connections, persists receipts, and aborts state on failure',async()=>{
 const factory=new IDBFactory(),a=await openBetaStore(factory),b=await openBetaStore(factory),x=createSimulationEngine(a),y=createSimulationEngine(b);
 const jobs=await Promise.all([x.run(input),y.run(input)]);assert.equal(jobs[0].id,jobs[1].id);assert.equal((await x.inspect()).length,1);
 await assert.rejects(()=>a.update(state=>{state.objects=[];throw Error('interrupt');}),/interrupt/);assert.ok((await b.read()).objects.length);
 a.close();b.close();const reopened=await openBetaStore(factory);assert.equal((await createSimulationEngine(reopened).inspect(jobs[0].id)).state,'completed');reopened.close();
});
test('Beta starts hidden, existing toggle unlocks it, actions trace, disabling retains jobs and blocks actions',async()=>{
 const html=await readFile(new URL('../extension/beta-explorer.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://redown.invalid/beta-explorer.html'});
 const originals=Object.fromEntries(['document','chrome','indexedDB','confirm','prompt'].map(k=>[k,globalThis[k]]));
 const listeners=[];let beta=false,gets=0;const storageWrites=[];
 Object.assign(globalThis,{document:dom.window.document,indexedDB:new IDBFactory(),confirm:()=>true,prompt:()=>null,chrome:{storage:{local:{get:async key=>{assert.equal(key,'betaModeEnabled');gets++;return {betaModeEnabled:beta};},set:async value=>storageWrites.push(value)},onChanged:{addListener:fn=>listeners.push(fn)}}}});
 const until=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}assert.fail('UI condition did not settle');};
 const $=id=>document.getElementById(id);
 try{
  const module=await import('../extension/beta-explorer.mjs?test=gate');await until(()=>gets>0);assert.equal($('explorer').hidden,true);assert.equal($('files').children.length,0);
  beta=true;listeners[0]({betaModeEnabled:{newValue:true}},'local');await until(()=>$('files').children.length===2);
  $('view-list').click();assert.equal($('view-list').getAttribute('aria-pressed'),'true');assert.ok($('files').classList.contains('file-list'));$('view-grid').click();assert.equal($('view-grid').getAttribute('aria-pressed'),'true');
  $('files').querySelectorAll('input')[1].checked=true;$('files').querySelectorAll('input')[1].dispatchEvent(new dom.window.Event('change'));assert.equal($('selection-name').textContent,'Welcome.txt');assert.equal($('read').disabled,false);$('copy').click();await until(()=>$('status').textContent==='Simulated selection copied.');
  $('destination').value='fake-drive';$('prefix').value='Documents/';$('paste').click();await until(()=>$('trace').textContent.includes('completed'));
  const db=await openBetaStore(globalThis.indexedDB),before=await db.read();const inspected=await dom.window.RedownBetaQA.inspectOperation(before.jobs[0].id);assert.equal(inspected.id,before.jobs[0].id);assert.equal(Object.hasOwn(inspected,'request'),false);assert.deepEqual(await db.read(),before);assert.ok(before.jobs.some(j=>j.request.operation==='copy'));
  beta=false;listeners[0]({betaModeEnabled:{newValue:false}},'local');await until(()=>$('explorer').hidden);
  $('paste').click();await new Promise(r=>setTimeout(r,20));assert.deepEqual((await db.read()).jobs,before.jobs);assert.equal(storageWrites.length,0);
  beta=true;listeners[0]({betaModeEnabled:{newValue:true}},'local');await until(()=>!$('explorer').hidden&&$('jobs').options.length>0);assert.ok((await db.read()).jobs.some(j=>j.request.operation==='copy'));db.close();
  assert.equal(document.querySelectorAll('script[type="module"]').length,1);await module.controller.settle();module.controller.close();
 }finally{dom.window.close();for(const [key,value]of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
test('dashboard entry extends original Beta gate without gating legacy explorer or new settings',async()=>{
 const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8'),dom=new JSDOM(html),entry=dom.window.document.getElementById('beta-explorer-entry');
 assert.equal(entry.textContent,'Beta Explorer');assert.ok(entry.classList.contains('beta-only'));assert.equal(entry.getAttribute('href'),'beta-explorer.html');
 assert.equal(dom.window.document.getElementById('workspace-objects').closest('.beta-only'),null);
 const script=await readFile(new URL('../extension/beta-explorer.mjs',import.meta.url),'utf8');assert.doesNotMatch(script,/sendMessage|storage\.local\.set|fetch\(|recordTransfer|transferHistory|cloudflareAuth/);dom.window.close();
});
