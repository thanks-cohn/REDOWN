import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createResourceAtlas,validateResourceBundle} from '../extension/file-engine/resources.mjs';
import {createFileEngine} from '../extension/file-engine/engine.mjs';
import {memoryAdapter} from '../extension/file-engine/adapters/memory.mjs';
import {r2HttpAdapter} from '../extension/file-engine/adapters/r2-http.mjs';
import {fileStore} from '../scripts/r2-lab/file-store.mjs';
import {initialState} from '../extension/file-engine/simulation.mjs';
import {createDiagnosticAPI} from '../agent/diagnostics/api.mjs';
const delay=n=>new Promise(r=>setTimeout(r,n));
const store=()=>{let s=initialState();return {read:async()=>structuredClone(s),update:async fn=>fn(s)};};
const req=(operation='list')=>({apiVersion:'0.2.0',operation,idempotencyKey:crypto.randomUUID(),source:{provider:'fake-r2',account:'demo',container:'sandbox',key:operation==='list'?'':'Welcome.txt'}});
test('actual engine correlation, bounded traces, supported memory, privacy and gateway methods',async()=>{
 const storage=store(),engine=createFileEngine({store:storage,adapters:[memoryAdapter(storage,'fake-r2')]});
 const job=await engine.run(req('read')),evidence=await engine.resources.exportEvidence();assert.ok(validateResourceBundle(evidence));
 const trace=engine.resources.query('getTrace',{operationId:job.id}).data;assert.equal(trace.state,'completed');assert.ok(trace.spans.some(s=>s.phase==='provider'));assert.ok(trace.spans.some(s=>s.phase==='verification'));assert.ok(trace.spans.some(s=>s.phase==='journal.update'));assert.ok(trace.memoryAfter.heapBytes>0);
 assert.ok(!JSON.stringify(evidence).includes('Welcome.txt'));assert.ok(!JSON.stringify(evidence).includes('sandbox'));
 const gateway=createDiagnosticAPI({resourceBundle:evidence});for(const method of ['describe','snapshot','listTraces','getTrace','getLatencyBreakdown','getMemoryProfile','getBottlenecks','explainSlowdown','exportEvidence'])assert.equal(gateway.query('resources.'+method,['getTrace','getLatencyBreakdown','getMemoryProfile','explainSlowdown'].includes(method)?{operationId:job.id}:{}).state,'available',method);
 assert.equal(gateway.query('resources.compareRuns',{before:job.id,after:job.id}).state,'available');
 assert.equal(createDiagnosticAPI().query('resources.snapshot').state,'unavailable');
 assert.equal(gateway.query('resources.getTrace',{operationId:'absent'}).data.result.error.code,'RESOURCE_TRACE_NOT_FOUND');
 assert.equal(gateway.query('resources.getTrace',{operationId:job.id,mutate:'yes'}).state,'failed');
 for(const mutate of [b=>b.authorization='Bearer SECRET',b=>b.traces[0].state='SECRET',b=>b.traces[0].spans[0].source='private/key',b=>b.snapshot.memory.provenance='SECRET']){const bad=structuredClone(evidence);mutate(bad);assert.equal(validateResourceBundle(bad),false);assert.equal(createDiagnosticAPI({resourceBundle:bad}).query('resources.snapshot').state,'failed');}
});
test('R2 adapter actual HTTP path is observable without leaking bearer or location',async()=>{
 const storage=store(),prefix='__redown_test__/abcd/',adapter=r2HttpAdapter({endpoint:'https://private.invalid',authorization:'Bearer SECRET',prefix,fetcher:async()=>{await delay(110);return Response.json({ok:true,result:{objects:[],folders:[],complete:true}});}}),engine=createFileEngine({store:storage,adapters:[adapter],authorize:()=>true});
 const job=await engine.run({...req(),source:{provider:'r2-lab',account:'lab',container:'test-1-new',key:prefix}});
 assert.equal(job.state,'completed');const trace=engine.resources.query('getTrace',{operationId:job.id}).data;assert.ok(trace.spans.find(s=>s.phase==='network').durationMs>=100);assert.ok(engine.resources.query('getBottlenecks').data.findings.some(f=>f.phase==='network'));const text=JSON.stringify(await engine.resources.exportEvidence());for(const secret of ['SECRET','private.invalid',prefix,'test-1-new'])assert.ok(!text.includes(secret));
});
test('timeouts and journal contention remain classified failures and measured waits',async()=>{
 const storage=store(),adapter=memoryAdapter(storage,'fake-r2');adapter.list=async()=>{await delay(105);throw Object.assign(Error(),{code:'TIMEOUT'});};
 const raw=storage.update;storage.update=async fn=>{await delay(105);return raw(fn);};
 const engine=createFileEngine({store:storage,adapters:[adapter]});const job=await engine.run(req());assert.equal(job.error,'TIMEOUT');const trace=engine.resources.query('getTrace',{operationId:job.id}).data;assert.ok(trace.spans.some(s=>s.phase==='provider'&&s.error==='TIMEOUT'));assert.ok(trace.spans.some(s=>s.phase==='journal.update'&&s.durationMs>=100));
});
test('restart retains finished and interrupted evidence without replay; bounded span storage',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'atlas-'));try{const path=join(dir,'journal.json'),a=createResourceAtlas({store:fileStore(path),maxTraces:3,maxSpans:2});const id=await a.begin('benchmark');for(let i=0;i<5;i++)await a.span(id,'provider','extension/file-engine/adapters/',async()=>{});const reopened=createResourceAtlas({store:fileStore(path)});await reopened.ready;assert.equal(reopened.query('getTrace',{operationId:id}).data.interrupted,true);await a.finish(id);for(let i=0;i<4;i++){const n=await a.begin('benchmark');await a.finish(n);}assert.equal(a.query('listTraces').data.total,3);assert.ok(a.snapshot().dropped>0);}finally{await rm(dir,{recursive:true,force:true});}
});
test('controlled repeated retention is detected, cleanup and unavailable heap are explicit',async()=>{
 const atlas=createResourceAtlas(),releases=[];for(let i=0;i<5;i++){const id=await atlas.begin('benchmark');releases.push(atlas.track('preview',4096));await atlas.finish(id);}assert.ok(atlas.query('getBottlenecks').data.growth.some(g=>g.classification==='repeated-retained-resource-growth'));for(const release of releases){release();release();}assert.equal(atlas.snapshot().resources.preview.bytes,0);assert.ok(atlas.snapshot().memory.unavailable.includes('per-operation-heap-attribution'));
});
test('collector persistence failure never changes filesystem outcome',async()=>{
 const storage=store(),atlas=createResourceAtlas({store:{read:storage.read,update:async()=>{throw Error('private');}}}),engine=createFileEngine({store:storage,resources:atlas,adapters:[memoryAdapter(storage,'fake-r2')]});assert.equal((await engine.run(req())).state,'completed');assert.equal(atlas.snapshot().storage,'unavailable');assert.ok(atlas.snapshot().storageFailures>0);
});
test('real file-journal lock contention produces bounded wait evidence without a filesystem mutation',async()=>{
 const {open}=await import('node:fs/promises');const dir=await mkdtemp(join(tmpdir(),'atlas-lock-'));const path=join(dir,'journal.json');const storage=fileStore(path),engine=createFileEngine({store:storage,adapters:[memoryAdapter(storage,'fake-r2')]});await engine.resources.ready;const lock=await open(path+'.lock','wx');
 try{await assert.rejects(()=>engine.run(req()),e=>e.code==='JOURNAL_BUSY');const evidence=await engine.resources.exportEvidence();assert.ok(evidence.traces.some(t=>t.spans.some(s=>s.phase==='journal.lock'&&s.error==='JOURNAL_BUSY'&&s.durationMs>=400)));assert.equal((await storage.read()).jobs.length,0);}finally{await lock.close();await rm(dir,{recursive:true,force:true});}
});
