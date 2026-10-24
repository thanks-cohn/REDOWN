import {providerBaseline} from './providers/baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFileEngine} from '../extension/file-engine/engine.mjs';
import {memoryAdapter} from '../extension/file-engine/adapters/memory.mjs';
import {nativeReferenceAdapter,seedNativeReference} from '../extension/file-engine/adapters/native-reference.mjs';
import {initialState} from '../extension/file-engine/simulation.mjs';
import {createFileSession} from '../agent/files/api.mjs';
const request=(operation,args={})=>({apiVersion:'0.3.0',operation,idempotencyKey:crypto.randomUUID(),...args});
function fixture(native=false){let state=seedNativeReference(initialState());const store={read:async()=>structuredClone(state),update:async fn=>fn(state)};const adapter=native?nativeReferenceAdapter(store):memoryAdapter(store,'fake-r2');const root=native?{provider:adapter.id,account:'reference',container:'drive',locator:{id:'root'}}:{provider:adapter.id,account:'demo',container:'sandbox',key:''};const child=(name,parent=root)=>native?{...root,locator:{parentId:parent.locator.id,name}}:{...root,key:parent.key+name};const engine=createFileEngine({store,adapters:[adapter]});const session=createFileSession({engine,scope:{locations:[root],operations:['list','read','metadata','upload','mkdir','copy','move','rename','delete','reconcile'],maxOperations:100}});return {engine,session,root,child,peek:()=>state,adapter,store};}
for(const native of [false,true])test(`universal session baseline: ${native?'native IDs':'object keys'}`,()=>providerBaseline(fixture(native)));
test('native duplicate names remain distinct, ambiguous aliases fail, case-insensitive conflicts preserve bytes',async()=>{
 const f=fixture(true);const ambiguous=await f.engine.run(request('read',{source:f.child('duplicate.txt')}));assert.equal(ambiguous.error,'AMBIGUOUS_IDENTITY');
 const a=await f.engine.run(request('read',{source:{...f.root,locator:{id:'first'}}})),b=await f.engine.run(request('read',{source:{...f.root,locator:{id:'second'}}}));assert.notEqual(a.result.sha256,b.result.sha256);
 const created=await f.engine.run(request('upload',{destination:f.child('Case.txt'),content:'original'}));assert.equal(created.state,'completed');const conflict=await f.engine.run(request('upload',{destination:f.child('CASE.TXT'),content:'changed'}));assert.equal(conflict.error,'CONFLICT');
});
test('native containment denies sibling scopes and checks authority again before writes',async()=>{
 const f=fixture(true);const folder=await f.engine.run(request('mkdir',{destination:f.child('private')}));const inside=folder.result.identity;
 const restricted=createFileSession({engine:f.engine,scope:{locations:[inside],operations:['read','upload','copy'],maxOperations:10}});
 assert.equal((await restricted.query('execute',{request:request('read',{source:{...f.root,locator:{id:'first'}}})})).error.code,'AUTHORIZATION_DENIED');
 const created=await restricted.query('execute',{request:request('upload',{destination:f.child('ok',inside),content:'ok'})});assert.equal(created.data.state,'completed');
 assert.equal((await restricted.query('execute',{request:request('copy',{source:created.data.result.identity,destination:f.child('escape')})})).error.code,'AUTHORIZATION_DENIED');
 const blocked=await f.engine.run(request('upload',{destination:f.child('not-created'),content:'x'}),{authorize:()=>false});assert.equal(blocked.state,'blocked_authorization');assert.equal(await f.adapter.stat(f.child('not-created')),null);
});
test('native stale pages and interrupted jobs never imply safe replay',async()=>{
 const f=fixture(true);const page=await f.adapter.list(f.root,{limit:1});await f.adapter.create(f.child('extra'),new Uint8Array([1]));await assert.rejects(f.adapter.list(f.root,{limit:1,cursor:page.cursor}),{code:'STALE_CURSOR'});
 const job=await f.engine.run(request('upload',{destination:f.child('checkpoint'),content:'value'}));await f.store.update(s=>{s.jobs.find(j=>j.id===job.id).state='executing';});assert.deepEqual((await f.engine.recover()).interrupted,[job.id]);const reconciled=await f.engine.reconcile(job.id);assert.equal(reconciled.replay,false);assert.equal(reconciled.observations[0].hashMatches,true);
});
test('native capabilities refuse rename before changing stable IDs, and malformed pagination is rejected',async()=>{
 const f=fixture(true),source={...f.root,locator:{id:'first'}};const before=JSON.stringify(f.peek().nativeObjects);const job=await f.engine.run(request('rename',{source,destination:f.child('renamed'),confirmed:true}));assert.equal(job.error,'PROVIDER_OPERATION_UNSUPPORTED');assert.equal(JSON.stringify(f.peek().nativeObjects),before);
 const old=f.adapter.list;f.adapter.list=async(...args)=>({...await old(...args),complete:true,cursor:'contradictory'});const invalid=await f.engine.run(request('list',{source:f.root}));assert.equal(invalid.error,'INVALID_PROVIDER_RESPONSE');
});
test('universal transfer rechecks per-child authority and preserves source after corrupt readback',async()=>{
 const f=fixture(true),source={...f.root,locator:{id:'first'}},destination=f.child('corrupt');const originalRead=f.adapter.read;f.adapter.read=async(id,...args)=>{const value=await originalRead(id,...args);if(id.locator.id!==source.locator.id)value.bytes.fill(0);return value;};const job=await f.engine.run(request('move',{source,destination,confirmed:true}));assert.equal(job.error,'PROVIDER_OPERATION_UNSUPPORTED');assert.ok(await f.adapter.stat(source));
 const copy=await f.engine.run(request('copy',{source,destination}));assert.equal(copy.error,'VERIFICATION_DISAGREEMENT');assert.equal(copy.state,'uncertain');assert.ok(await f.adapter.stat(source));
});
test('account and container identity routes multiple instances without aliasing provider data',async()=>{
 const {createProviderRegistry}=await import('../extension/file-engine/provider-contract.mjs');const f=fixture(true);await f.store.update(s=>{s.nativeObjects.push({provider:'native-reference',account:'second-account',container:'drive',id:'root',parentId:null,name:'Other root',folder:true,revision:1});});
 const second=nativeReferenceAdapter(f.store,{account:'second-account'}),root={...f.root,account:'second-account'},registry=createProviderRegistry([{adapter:f.adapter,root:f.root},{adapter:second,root}]),engine=createFileEngine({store:f.store,adapters:registry.adapters});
 assert.equal(await registry.contains(f.root,{...root,locator:{id:'first'}}),false);assert.equal(await second.stat({...root,locator:{id:'first'}}),null);
 const uploaded=await engine.run(request('upload',{destination:{...root,locator:{parentId:'root',name:'account-only'}},content:'isolated'}));assert.equal(uploaded.state,'completed');
 assert.equal(await f.adapter.stat({...f.root,locator:{parentId:'root',name:'account-only'}}),null);
 const read=await engine.run(request('read',{source:uploaded.result.identity}));assert.equal(read.result.content,'isolated');
});
