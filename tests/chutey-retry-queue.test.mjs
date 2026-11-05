import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {IDBFactory} from 'fake-indexeddb';
import {createFileApi} from '../extension/beta/file-api.mjs';
import {createDragBridge,DRAG_TYPE} from '../extension/chute-drag.mjs';
const tick=()=>new Promise(r=>setTimeout(r,20));
const source={accountId:'a',bucketName:'b'},entry={key:'private/name.png',displayName:'name.png',size:3,mime:'image/png'};
const shelf={id:'test',url:'chrome-extension://test/shelf.html'},target={id:'test',url:'https://upload.invalid',tab:{id:4},frameId:0};
function harness(){
 const database=new IDBFactory(),session={},callbacks={};let listener,clock=1000;
 const context=vm.createContext({indexedDB:database,crypto,Blob,Uint8Array,setTimeout,URL,chrome:{runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener:fn=>listener=fn},onStartup:{addListener:fn=>callbacks.startup=fn}},storage:{session:{get:async()=>session,set:async v=>Object.assign(session,v)},onChanged:{addListener:fn=>callbacks.changed=fn}},alarms:{create(){},onAlarm:{addListener(){}}}}});
 vm.runInContext(readFileSync('extension/chute-stage.js','utf8'),context);vm.runInContext(readFileSync('extension/chute-worker.js','utf8'),context);
 const stage=context.RedownChuteStage.createStage({now:()=>clock});
 // Worker uses Date.now, so deterministic expiry assertions use stage directly.
 return {stage,session,callbacks,setClock:v=>clock=v,call:(action,id,sender=target,extra={})=>new Promise(resolve=>listener({type:'redownChuteV1.'+action,id,...extra},sender,resolve)),factory:()=>context.RedownChuteStage.createStage()};
}
async function waitFor(fn){for(let i=0;i<100;i++){if(fn())return;await tick();}throw Error('Timed out waiting for stage');}
test('Explicit retry reuses version-checked original bytes with fresh capability; mutation and revoked auth cannot reuse',async()=>{
 const h=harness(),stage=h.factory(),states=[];let reads=0,version='v1',denied=false;
 const api=createFileApi({stat:async()=>{if(denied)throw Object.assign(Error('private name https://secret.invalid/token'),{code:'HTTP_403'});return {object:{size:3,etag:version}};},readStream:async(_,o)=>{reads++;await o.onChunk(new Uint8Array([9,0,255]));return {};}});
 const bridge=createDragBridge({api,stage,getKeep:async()=>false,send:m=>h.call(m.type.split('.').at(-1),m.id,shelf,m),onState:s=>states.push(s)});
 const drag=()=>{const data=new Map();assert.ok(bridge.start({preventDefault(){assert.fail('Unexpected prevention');},dataTransfer:{setData:(k,v)=>data.set(k,v)}},source,entry));return data.get(DRAG_TYPE);};
 try{
  let id=drag();await waitFor(()=>states.at(-1)?.state==='staged');
  assert.ok((await h.call('claim',id)).ok);assert.deepEqual([...(await h.call('chunk',id,target,{offset:0})).bytes],[9,0,255]);assert.ok((await h.call('finish',id,target,{state:'drop_dispatched'})).ok);
  const old=id;states.length=0;id=drag();assert.notEqual(id,old);await waitFor(()=>states.at(-1)?.state==='staged');assert.equal(reads,1);assert.equal(states.at(-1).code,'REUSED');
  assert.equal((await h.call('arm',old,shelf)).ok,false);assert.equal((await h.call('claim',old)).ok,false);
  assert.ok((await h.call('claim',id)).ok);assert.ok((await h.call('finish',id,target,{state:'failed'})).ok);
  version='same-size-new-version';states.length=0;id=drag();await waitFor(()=>states.at(-1)?.state==='staged');assert.equal(reads,2);
  assert.ok((await h.call('claim',id)).ok);assert.ok((await h.call('finish',id,target,{state:'failed'})).ok);
  denied=true;states.length=0;id=drag();await waitFor(()=>states.at(-1)?.state==='failed');assert.equal(reads,2);assert.equal(await stage.update(id,()=>true),null);
  assert.equal(states.at(-1).code,'HTTP_403');assert.ok(!JSON.stringify(states).includes('secret.invalid'));assert.ok(!JSON.stringify(h.session.redownChuteTraceV1).includes('name.png'));
 }finally{await bridge.dispose();await stage.purge(true);await stage.close();await h.stage.close();}
});
test('Bounded lease queue preserves active transfers; expired/inactive records reclaim space, Clear and logout revoke claims',async()=>{
 const h=harness(),stage=h.factory();try{
  const files=[];for(let i=0;i<4;i++)files.push(await stage.put(new Blob(['abc']),{name:`${i}.txt`,mime:'text/plain'}));
  await assert.rejects(stage.put(new Blob(['x']),{name:'fifth',mime:'text/plain'}),/queue is full/);
  for(const f of files)assert.equal(await stage.update(f.id,()=>true),true);
  assert.ok((await h.call('arm',files[0].id,shelf)).ok);assert.ok((await h.call('claim',files[0].id)).ok);
  assert.equal((await h.call('clear',undefined,target)).ok,false);assert.equal((await h.call('stats',undefined,target)).ok,false);
  assert.ok((await h.call('clear',undefined,shelf)).ok);assert.equal((await stage.stats()).count,0);assert.equal((await h.call('chunk',files[0].id,target,{offset:0})).ok,false);
  await stage.put(new Blob(['x']),{name:'logout',mime:'text/plain'});h.callbacks.changed({cloudflareAuth:{newValue:null}},'local');await tick();assert.equal((await stage.stats()).count,0);
  await stage.put(new Blob(['x']),{name:'restart',mime:'text/plain'});h.callbacks.startup();await tick();assert.equal((await stage.stats()).count,0);
  await stage.put(new Blob(['x']),{name:'optout',mime:'text/plain'});h.callbacks.changed({shelfKeepPreparedV1:{newValue:false}},'local');await tick();assert.equal((await stage.stats()).count,0);
 }finally{await stage.purge(true);await stage.close();await h.stage.close();}
});
test('OFF retry grace, ON expiry and count/byte ceiling are enforced without token rearming',async()=>{
 const h=harness(),stage=h.stage;try{
  const off=await stage.put(new Blob(['abc']),{name:'off',mime:'text/plain'});await stage.update(off.id,v=>{v.claim='owner';v.offset=3;return true;});
  assert.ok(await stage.finish(off.id,'owner','drop_dispatched'));assert.equal(await stage.finish(off.id,'owner','failed'),null);
  h.setClock(30999);assert.ok(await stage.update(off.id,()=>true));h.setClock(31001);assert.equal(await stage.update(off.id,()=>true),null);
  const on=await stage.put(new Blob(['abc']),{name:'on',mime:'text/plain'});await stage.update(on.id,v=>{v.claim='owner';v.keep=true;return true;});assert.ok(await stage.finish(on.id,'owner','failed'));
  h.setClock(31001+599999);assert.ok(await stage.update(on.id,()=>true));h.setClock(31001+600001);await stage.purge();assert.equal((await stage.stats()).count,0);
  const full=await stage.reserve(crypto.randomUUID(),{name:'full',mime:'application/octet-stream',size:32*1048576});
  await assert.rejects(stage.reserve(crypto.randomUUID(),{name:'overflow',mime:'application/octet-stream',size:1}),/queue is full/);assert.ok(await stage.update(full.id,()=>true));
  assert.equal((await stage.stats()).maxBytes,32*1048576);
 }finally{await stage.purge(true);await stage.close();}
});
test('Reused bytes are unavailable until final stat; changed source and Clear never resurrect a reservation',async()=>{
 const h=harness(),stage=h.factory();try{
  const old=await stage.reserve(crypto.randomUUID(),{name:'x',mime:'text/plain',size:3,cacheKey:'identity'});
  await stage.fulfill(old.id,new Blob(['abc']),{cacheKey:'identity',version:'v1'});await stage.retire(old.id);
  const fresh=await stage.reserve(crypto.randomUUID(),{name:'x',mime:'text/plain',size:3,cacheKey:'identity'});
  assert.equal(await stage.reuse(fresh.id,{cacheKey:'identity',version:'v1'}),true);assert.ok((await h.call('arm',fresh.id,shelf)).ok);
  let received=false;const claim=h.call('claim',fresh.id).then(r=>{received=r;return r;});await tick();assert.equal(received,false);
  await stage.purge(true);assert.equal((await claim).ok,false);assert.equal(await stage.activate(fresh.id),null);assert.equal(await stage.fulfill(fresh.id,new Blob(['abc'])),false);
 }finally{await stage.close();await h.stage.close();}
});
test('Low-memory and storage failures refuse safely and report the owning layer without provider details',async()=>{
 let reads=0;const h=harness(),stage=h.factory(),states=[];
 const api=createFileApi({readStream:async(_,o)=>{reads++;await o.onChunk(new Uint8Array([1,2,3]));return {};}}),bridge=createDragBridge({api,stage,maxBytes:8*1048576,onState:s=>states.push(s),send:async()=>({ok:true})});
 try{
  let prevented=false;assert.equal(bridge.start({preventDefault(){prevented=true;}},source,{...entry,size:8*1048576+1}),false);assert.ok(prevented);assert.equal(reads,0);
  const original=stage.fulfill;stage.fulfill=async()=>{throw Error('QuotaExceededError https://private.invalid/source');};
  await assert.rejects(bridge.prepare(source,entry));assert.equal(states.at(-1).layer,'storage');assert.equal(states.at(-1).code,'STORAGE_FAILED');assert.ok(!states.at(-1).message.includes('private.invalid'));assert.equal((await stage.stats()).count,0);stage.fulfill=original;
 }finally{await bridge.dispose();await stage.close();await h.stage.close();}
});
