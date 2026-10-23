import test from 'node:test';
import assert from 'node:assert/strict';
import {API_VERSION,transition,validateRequest} from '../extension/file-engine/contract.mjs';
import {initialState,createSimulationEngine} from '../extension/file-engine/simulation.mjs';
function store(){let state=initialState(),tail=Promise.resolve();return {read:async()=>structuredClone(state),update(fn){const task=tail.then(()=>{const next=structuredClone(state),result=fn(next);state=next;return result;});tail=task.catch(()=>{});return task;}};}
const id=(key,provider='fake-r2')=>({provider,account:'demo',container:'sandbox',key});
let sequence=0;const request=(operation,args={})=>({apiVersion:API_VERSION,operation,idempotencyKey:'test-'+(++sequence),...args});
const fixture=()=>{const storage=store();return {storage,engine:createSimulationEngine(storage)};};
test('contract rejects incompatible versions, ambiguous keys, destructive requests and self targets',()=>{
 for(const value of [request('copy',{source:id('Welcome.txt'),destination:id('Welcome.txt')}),request('move',{source:id('Welcome.txt'),destination:id('moved.txt')}),request('read',{source:id('../bad')}),{...request('list',{source:id('')}),apiVersion:'2'},request('copy',{source:id('Documents/'),destination:id('Documents/child/')})])assert.throws(()=>validateRequest(value));
 const job={id:'x',state:'requested',events:[]};assert.throws(()=>transition(job,'completed','fake'),/INVALID_TRANSITION/);
});
test('cross-provider copy and move preserve contents and enforce destination conflicts',async()=>{
 const {engine,storage}=fixture();
 const copy=await engine.run(request('copy',{source:id('Welcome.txt'),destination:id('Copy.txt','fake-drive')}));assert.equal(copy.state,'completed');assert.equal(copy.receipt.providerEvidence,false);
 let snapshot=await storage.read();assert.equal(snapshot.objects.find(o=>o.key==='Copy.txt').content,snapshot.objects.find(o=>o.key==='Welcome.txt').content);
 const before=snapshot.objects;
 const conflict=await engine.run(request('move',{source:id('Welcome.txt'),destination:id('Copy.txt','fake-drive'),confirmed:true}));assert.equal(conflict.error,'CONFLICT');assert.deepEqual((await storage.read()).objects,before);
 const move=await engine.run(request('move',{source:id('Welcome.txt'),destination:id('Moved.txt','fake-drive'),confirmed:true}));assert.equal(move.state,'completed');assert.ok(!(await storage.read()).objects.some(o=>o.provider==='fake-r2'&&o.key==='Welcome.txt'));
});
test('recursive directory copy refuses merge and never changes unrelated destination',async()=>{
 const {engine,storage}=fixture();
 const before=(await storage.read()).objects;
 const bad=await engine.run(request('copy',{source:id('Documents/'),destination:id('Documents/','fake-drive')}));assert.equal(bad.error,'CONFLICT');assert.deepEqual((await storage.read()).objects,before);
 const good=await engine.run(request('copy',{source:id('Documents/'),destination:id('Other/','fake-drive')}));assert.equal(good.state,'completed');assert.ok((await storage.read()).objects.some(o=>o.key==='Other/Example.txt'));
});
test('same idempotency key is executed once across engine instances; different request is rejected',async()=>{
 const {engine,storage}=fixture(),other=createSimulationEngine(storage);
 const input=request('copy',{source:id('Welcome.txt'),destination:id('Once.txt')});
 const [a,b]=await Promise.all([engine.run(input),other.run(input)]);assert.equal(a.id,b.id);assert.equal((await storage.read()).objects.filter(o=>o.key==='Once.txt').length,1);
 await assert.rejects(()=>other.run({...input,destination:id('Twice.txt')}),/IDEMPOTENCY_CONFLICT/);
 assert.equal((await other.inspect()).length,1);
});
test('journal reopening retains exact transitions, receipt, identities and read-only diagnostics',async()=>{
 const {engine,storage}=fixture();const job=await engine.run(request('read',{source:id('Welcome.txt')}));
 const reopened=createSimulationEngine(storage),before=await storage.read();
 const trace=await reopened.diagnose(job.id);assert.deepEqual(trace.evidence.map(e=>e.state),['requested','validated','planned','queued','executing','verifying','completed']);assert.equal(trace.evidence[0].operationId,job.id);
 await reopened.inspect();await reopened.plan(request('copy',{source:id('Welcome.txt'),destination:id('Planned.txt')}));assert.deepEqual(await storage.read(),before);
});
test('list consumes every page and rejects a stale cursor after mutation',async()=>{
 const {engine}=fixture();let cursor,keys=[];do{const job=await engine.run(request('list',{source:id(''),limit:1,...(cursor?{cursor}:{})}));assert.equal(job.state,'completed');keys.push(...job.result.objects.map(o=>o.key));cursor=job.result.cursor;}while(cursor);
 assert.deepEqual(keys,['Documents/','Welcome.txt']);
 const first=await engine.run(request('list',{source:id(''),limit:1}));await engine.run(request('upload',{destination:id('New.txt'),content:'new'}));
 const next=await engine.run(request('list',{source:id(''),cursor:first.result.cursor}));assert.equal(next.error,'STALE_CURSOR');
});
test('unknown routing never implies absence; no real provider is accepted',async()=>{
 const {engine}=fixture();const wrong=await engine.run(request('read',{source:id('Welcome.txt','cloudflare-r2')}));assert.equal(wrong.error,'UNSUPPORTED_PROVIDER');
 const missing=await engine.run(request('read',{source:id('missing')}));assert.equal(missing.error,'NOT_FOUND_OR_INACCESSIBLE');const diagnosis=await engine.diagnose(missing.id);assert.ok(diagnosis.diagnosis.missingEvidence.length);assert.equal(engine.describe().realMutationEnabled,false);
});
test('rename, folder, upload, search, delete keep exact identity and independent receipts',async()=>{
 const {engine,storage}=fixture();
 assert.equal((await engine.run(request('mkdir',{destination:id('New/')}))).state,'completed');
 assert.equal((await engine.run(request('upload',{destination:id('New/ spaced %.txt'),content:'original'}))).state,'completed');
 const renamed=await engine.run(request('rename',{source:id('New/ spaced %.txt'),destination:id('New/renamed.txt'),confirmed:true}));assert.equal(renamed.state,'completed');
 const search=await engine.run(request('list',{source:id(''),query:'renamed'}));assert.deepEqual(search.result.objects.map(o=>o.key),['New/renamed.txt']);
 const result=await engine.run(request('delete',{source:id('New/'),confirmed:true}));assert.equal(result.result.deleted.length,2);assert.ok(!(await storage.read()).objects.some(o=>o.provider==='fake-r2'&&o.key.startsWith('New/')));
});
test('failed persistence cannot return a verified completion',async()=>{
 const engine=createSimulationEngine({read:async()=>initialState(),update:async()=>{throw Error('disk full');}});
 await assert.rejects(()=>engine.run(request('upload',{destination:id('New.txt'),content:'new'})),/disk full/);
});
