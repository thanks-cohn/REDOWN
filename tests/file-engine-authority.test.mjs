import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../agent/aac/scenarios.mjs';

const id=key=>({provider:'fake-r2',account:'demo',container:'sandbox',key});
const request=(operation,args)=>({apiVersion:'0.2.0',operation,idempotencyKey:crypto.randomUUID(),...args});

test('denied engine exposes no collector, store, adapters or implementation helper',async()=>{
 const f=fixture({authorize:()=>false}),before=f.peek();
 assert.equal(Object.isFrozen(f.engine),true);assert.equal(Object.isFrozen(f.engine.resources),true);
 for(const key of ['store','adapter','begin','finish','track','record','span','close'])assert.equal(f.engine.resources[key],undefined,key);
 for(const key of ['_run','store','adapters','authorize'])assert.equal(f.engine[key],undefined,key);
 assert.throws(()=>f.engine.resources.store('audit').update(s=>{s.objects=[];}),TypeError);
 assert.throws(()=>{f.engine.plan=()=>true;},TypeError);
 const bundle=await f.engine.resources.exportEvidence();bundle.traces.push({operationId:'injected'});
 const snap=f.engine.resources.snapshot();snap.resources.journal={count:100,bytes:100};
 assert.deepEqual(await f.engine.inspect(),[]);assert.deepEqual(f.peek(),before);
 assert.deepEqual(await f.engine.recover(),{interrupted:[],replay:false});assert.deepEqual(f.peek(),before);
});

test('job inspection, cancellation, recovery, duplicate receipt and reconcile obey revocation',async()=>{
 let mode='owner';const f=fixture({authorize:r=>mode==='owner'||mode==='read'&&['list','read','metadata'].includes(r.operation)});
 const input=request('read',{source:id('Welcome.txt')}),done=await f.engine.run(input);
 await f.store.update(s=>s.jobs.push({id:'pending',request:input,state:'queued',events:[]}));
 mode='read';await assert.rejects(()=>f.engine.cancel('pending'),e=>e.code==='AUTHORIZATION_DENIED');
 const before=f.peek();await f.engine.recover();assert.deepEqual(f.peek(),before);
 mode='denied';assert.equal(await f.engine.inspect(done.id),null);
 await assert.rejects(()=>f.engine.cancel('pending'),e=>e.code==='AUTHORIZATION_DENIED');
 await assert.rejects(()=>f.engine.reconcile(done.id),e=>e.code==='AUTHORIZATION_DENIED');
 await assert.rejects(()=>f.engine.run(input),e=>e.code==='AUTHORIZATION_DENIED');
 assert.equal((await f.engine.inspect()).length,0);
 mode='owner';const job=await f.engine.inspect(done.id);job.request.source.key='changed';assert.equal((await f.engine.inspect(done.id)).request.source.key,'Welcome.txt');
 f.adapters[0].capabilities.authorization='Bearer SECRET';assert.equal(f.engine.describe().providers[0].authorization,undefined);
 const description=f.engine.describe();description.providers[0].atomicCreate=false;assert.equal(f.engine.describe().providers[0].atomicCreate,true);
});

test('caller trace collision cannot rewrite an existing job',async()=>{
 const f=fixture(),first=await f.engine.run(request('read',{source:id('Welcome.txt')}));
 const before=await f.engine.inspect(first.id);
 await assert.rejects(()=>f.engine.run(request('read',{source:id('Documents/Example.txt')}),{traceId:first.id}),e=>e.code==='TRACE_ID_CONFLICT');
 assert.deepEqual(await f.engine.inspect(first.id),before);
});
