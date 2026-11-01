import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {worker,config} from './helpers/background-worker.mjs';
const drain=async h=>{await h.ready();await vm.runInContext('entryEvidenceQueue',h.context);};
test('BOOT reads are versioned, sanitized, non-mutating and never call cloud',async()=>{
 const h=worker();await drain(h);const before=structuredClone(h.local),calls=h.calls.length;
 for(const method of ['status','audit','history']){
  const value=await h.context.RedownBoot[method]();assert.equal(value.schemaVersion,1);
  assert.doesNotMatch(JSON.stringify(value),/synthetic|fixture.invalid|accountId|bucketName|accessToken/);
 }
 assert.deepEqual(h.local,before);assert.equal(h.calls.length,calls);
 const status=await h.context.RedownBoot.status();assert.equal(status.components.nativeMenu.state,'registered');
 assert.equal(status.components.nativeMenu.visibleRows,'not-verifiable');assert.equal(status.components.shelf.state,'unknown');assert.notEqual(status.overall,'ready');
});
test('missing ID cache plus surviving rows never resets; lost callback retries same row safely',async()=>{
 const first=worker();await drain(first);delete first.local.rightClickNativeIds;
 const next=worker(first.local,{nativeEntries:[...first.native]});await drain(next);
 assert.equal(next.local.rightClickMenuStatus.state,'registered');assert.ok(next.native.has('v3:one'));assert.ok(next.native.has('redown-manage'));
 assert.ok(!next.calls.some(c=>c[0]==='removeAll'));
 const h=worker(undefined,{dropCallback:'v3:one'});await drain(h);
 assert.equal((await h.context.RedownBoot.status()).components.nativeMenu.state,'failed');
 const result=await h.context.RedownBoot.repair({target:'nativeMenu'});assert.deepEqual([...result.acknowledged],['nativeMenu']);
 assert.equal(result.snapshot.components.nativeMenu.state,'registered');
});
test('interrupted generation is diagnosed after wake, then local reconciliation acknowledges it',async()=>{
 const h=worker();await drain(h);h.local.rightClickMenuStatus.state='applying';h.local.rightClickMenuStatus.appliedGeneration=null;
 const audit=await h.context.RedownBoot.audit();assert.ok(audit.evidence.some(e=>e.code==='INTERRUPTED_OR_PENDING_REGISTRATION'));
 const next=worker(h.local,{nativeEntries:[...h.native]});await drain(next);
 const s=await next.context.RedownBoot.status();assert.notEqual(s.workerEpoch,h.context.RedownBoot.workerEpoch);
 assert.equal(s.components.nativeMenu.desiredGeneration,s.components.nativeMenu.appliedGeneration);
 assert.ok(!next.calls.some(c=>c[0]==='removeAll'));
});
test('repair is single flight, capped, and healthy repair does no configuration writes',async()=>{
 const h=worker();await drain(h);const before=structuredClone(h.local),calls=h.calls.length;
 const result=await h.context.RedownBoot.repair();assert.equal(result.attempted.length,0);assert.deepEqual(h.local,before);assert.equal(h.calls.length,calls);
 const a=h.context.RedownBoot.repair({target:'nativeMenu'}),b=h.context.RedownBoot.repair({target:'nativeMenu'});assert.equal(a,b);await a;
 assert.equal((await h.context.RedownBoot.repair({target:'nativeMenu'})).code,'REPAIR_BOUNDED');
 await assert.rejects(h.context.RedownBoot.repair({target:'cloudflare'}));
});
test('20 worker activations preserve root, exact destinations, history and single listeners',async()=>{
 let local=config(),native=[];const epochs=new Set();
 for(let i=0;i<20;i++){
  const h=worker(local,{nativeEntries:native});await drain(h);
  epochs.add(h.context.RedownBoot.workerEpoch);assert.equal(h.chrome.action.onClicked.listeners.length,1);assert.equal(h.chrome.contextMenus.onClicked.listeners.length,1);
  assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage'));assert.ok(h.native.has('v3:one'));assert.ok(!h.calls.some(c=>c[0]==='removeAll'));
  await h.context.openToolbarInterface({id:1,windowId:7});await drain(h);
  assert.equal(h.calls.filter(c=>c[0]==='panel').length,1);local=h.local;native=[...h.native];
 }
 assert.equal(epochs.size,20);assert.ok(local.entryPointEvidence.length<=64);assert.deepEqual(local.transferHistory,[{id:'preserved'}]);
});
test('BOOT message gate requires exact settings sender, extension ID and Debug Mode',async()=>{
 const h=worker();await drain(h);
 const send=(sender,operation='status')=>new Promise(r=>h.chrome.runtime.onMessage.listeners[0]({type:'bootV1',operation},sender,r));
 const valid={id:'test',url:h.chrome.runtime.getURL('options.html')};
 assert.equal((await send(valid)).code,'DIAGNOSTICS_DISABLED');h.local.debugModeEnabled=true;
 for(const sender of [{...valid,id:'other'},{...valid,url:valid.url+'#spoof'},{...valid,url:'https://example.invalid'}])assert.equal((await send(sender)).code,'DIAGNOSTICS_DISABLED');
 assert.equal((await send(valid)).result.schemaVersion,1);assert.equal((await send(valid,'deploy')).ok,false);
});
test('history remains bounded, chronological, epoch-scoped and rejects unbounded input',async()=>{
 const h=worker();await drain(h);
 for(let i=0;i<80;i++)h.context.entryEvidence('worker','lifecycle','activation','WORKER_LOAD',false);
 await vm.runInContext('entryEvidenceQueue',h.context);const history=await h.context.RedownBoot.history();assert.equal(history.events.length,64);
 assert.ok(history.events.every(e=>e.attemptId&&e.workerEpoch===h.context.RedownBoot.workerEpoch&&e.version));
 await assert.rejects(h.context.RedownBoot.history({limit:65}));
});
test('startup package validates classic imports and catches missing imported script and parse failure',async()=>{
 const {validateStartupPackage}=await import('../scripts/startup-package.mjs');
 const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 assert.equal(validateStartupPackage(process.cwd()).state,'passed');
 const root=mkdtempSync(join(tmpdir(),'redown-boot-'));mkdirSync(join(root,'extension'));
 try{
  const put=(p,s)=>writeFileSync(join(root,'extension',p),s);
  put('manifest.json',JSON.stringify({background:{service_worker:'background.js'},side_panel:{default_path:'shelf.html'},options_page:'options.html'}));
  for(const p of ['shelf.html','options.html','popup.html'])put(p,'');
  put('background.js','importScripts("missing.js");');assert.equal(validateStartupPackage(root).state,'failed');
  put('missing.js','export const invalidClassicWorker=1;');assert.equal(validateStartupPackage(root).state,'failed');
  put('missing.js','const working=1;');assert.equal(validateStartupPackage(root).state,'passed');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('explicit menu repair recovers an externally missing child despite a matching cached plan',async()=>{
 const h=worker();await drain(h);h.native.delete('v3:one');
 assert.equal((await h.context.RedownBoot.status()).components.nativeMenu.state,'registered'); // acknowledged, not enumeration
 const result=await h.context.RedownBoot.repair({target:'nativeMenu'});
 assert.ok(h.native.has('v3:one'));assert.equal(result.acknowledged[0],'nativeMenu');assert.ok(!h.calls.some(c=>c[0]==='removeAll'));
});
test('initial toolbar popup-configuration rejection is degraded and targeted repair acknowledges recovery',async()=>{
 const failure={setPopup:true},h=worker(undefined,failure);await drain(h);
 assert.equal((await h.context.RedownBoot.status()).components.toolbar.state,'degraded');
 failure.setPopup=false;const result=await h.context.RedownBoot.repair({target:'toolbar'});
 assert.equal(result.snapshot.components.toolbar.state,'ready');assert.equal(result.acknowledged[0],'toolbar');
 assert.ok(!h.calls.some(c=>c[0]==='panel'||c[0]==='attached'||c[0]==='tab'));
});
