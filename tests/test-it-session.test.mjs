import test from 'node:test';
import assert from 'node:assert/strict';
import {createFileApi} from '../extension/beta/file-api.mjs';
import {createPracticeSession} from '../extension/beta/test-it-session.mjs';
import {exercises} from '../extension/beta/test-it.mjs';
import {createHash} from 'node:crypto';
const source={accountId:'account',bucketName:'bucket',prefix:''};
function fixture(saved,recovery=[]){
  const objects=new Map(),events=[],calls=[];let serial=0,storageFail=false,loseReply=false,statFail=false;
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const put=(key,bytes)=>objects.set(key,{key,size:bytes.length,etag:hash(bytes),uploaded:new Date(1700000000000+ ++serial).toISOString(),version:'v'+serial,bytes});
  put('original.txt','original');put('unrelated.txt','unrelated');
  const inspect=key=>{const o=objects.get(key);if(!o)return {object:null};const {bytes,...object}=o;return {object,sha256:hash(bytes),status:200};};
  const adapter={conditionalPracticeMutations:true,list:async({source})=>({entries:[],folderExists:[...objects.keys()].some(k=>k.startsWith(source.prefix))}),mkdir:async({source,name})=>{calls.push('mkdir');put(source.prefix+name+'/.redown','');return {completed:1};},inspect:async({key})=>inspect(key),stat:async({key})=>{if(statFail)throw Error('Destination unavailable');return {object:inspect(key).object};},
    copy:async input=>transfer('copy',input),move:async input=>transfer('move',input),
    rename:async({source,entry,newName})=>transfer('move',{source,destination:{...source,prefix:entry.key.slice(0,entry.key.lastIndexOf('/')+1)},entries:[entry],newName}),
    delete:async({entries})=>{calls.push('delete');for(const e of entries)objects.delete(e.key);return {completed:entries.length};},upload:async()=>{calls.push('upload');return {};}};
  async function transfer(op,{entries,destination,source,newName,conflict}){calls.push(op);const results=[];for(const e of entries){const o=objects.get(e.key);let key=destination.prefix+(newName||e.key.split('/').pop());if(key===e.key&&conflict==='keep')key=destination.prefix+e.key.split('/').pop().replace(/(\.[^.]*)?$/,' (copy)$1');if(objects.has(key)){results.push({sourceKey:e.key,destinationKey:key,status:'conflict'});continue;}put(key,o.bytes);const d=objects.get(key);results.push({sourceKey:e.key,destinationKey:key,sourceEtag:o.etag,sourceVersion:o.version,destinationEtag:d.etag,destinationVersion:d.version,size:d.size,verified:true,status:'copied'});if(op==='move')objects.delete(e.key);}if(loseReply)throw Object.assign(Error('Lost response'),{uncertain:true});return {completed:results.filter(r=>r.status==='copied').length,results};}
  const api=createFileApi(adapter),storage={set:async value=>{if(storageFail)throw Error('Storage unavailable');storage.saved=structuredClone(value.betaExplorerTestIt);storage.ownership=structuredClone(value.betaExplorerTestItOwnership);storage.recovery=structuredClone(value.betaExplorerTestItRecovery);}},session=createPracticeSession({api,storage,saved:structuredClone(saved),recovery,approve:async()=>true,onEvidence:e=>events.push(e)});api.setPolicy(session);session.active=true;
  const copy=(key='original.txt',prefix='practice/')=>api.run('copy',{source,destination:{...source,prefix},entries:[{key}],conflict:'skip'});
  return {objects,put,api,session,events,calls,storage,copy,set storageFail(v){storageFail=v;},set loseReply(v){loseReply=v;},set statFail(v){statFail=v;}};
}
test('exactly sixty practical exercises have unique IDs and real target selectors',()=>{assert.equal(exercises.length,60);assert.deepEqual(exercises.map(e=>e.id),Array.from({length:60},(_,i)=>i+1));assert.ok(exercises.every(e=>e.target.startsWith('#')&&e.text.length>0));});
test('copy first, preserve source, track ancestry through rename/move/copy and safely delete',async()=>{
 const f=fixture();assert.equal((await f.copy()).state,'completed');const first=f.session.owned(source,'practice/original.txt');assert.ok(first.id&&first.receipt.destinationVersion);assert.equal(f.objects.get('original.txt').bytes,'original');
 let r=await f.api.run('rename',{source,entry:{key:first.key},newName:'renamed.txt'});assert.equal(r.state,'completed',JSON.stringify(r));let next=f.session.owned(source,'practice/renamed.txt');assert.equal(next.id,first.id);
 r=await f.api.run('move',{source,destination:{...source,prefix:'other/'},entries:[{key:next.key}],conflict:'skip'});assert.equal(r.state,'completed');next=f.session.owned(source,'other/renamed.txt');assert.equal(next.id,first.id);
 r=await f.copy(next.key,'third/');assert.equal(r.state,'completed');const child=f.session.owned(source,'third/renamed.txt');assert.equal(child.parentId,first.id);
 assert.equal((await f.api.run('delete',{source,entries:[{key:child.key}]})).state,'completed');assert.ok(!f.objects.has(child.key));assert.ok(f.objects.has('original.txt'));assert.ok(f.events.every(e=>e.verdict==='PASSED'));
});
test('originals, lookalikes, user destinations and mixed multi-selections never become destructive targets',async()=>{
 const f=fixture();await f.copy();f.put('practice/fake-copy.txt','original');
 for(const operation of ['delete','move','rename']){const r=await f.api.run(operation,{source,destination:{...source,prefix:'other/'},entries:[{key:'original.txt'}],entry:{key:'original.txt'},newName:'x'});assert.equal(r.state,'failed');}
 assert.throws(()=>f.session.assertOwned(source,[{key:'practice/original.txt'},{key:'unrelated.txt'}]),/protected/);
 assert.equal((await f.api.run('delete',{source,entries:[{key:'practice/fake-copy.txt'}]})).state,'failed');
 f.put('other/original.txt','user-owned');assert.equal((await f.copy('practice/original.txt','other/')).state,'failed');
 assert.equal((await f.api.run('copy',{source,destination:{...source,prefix:'practice/'},entries:[{key:'original.txt'}],conflict:'replace'})).state,'failed');assert.equal(f.objects.get('other/original.txt').bytes,'user-owned');
});
test('same bytes at the same filename do not restore ownership after an external replacement',async()=>{const f=fixture();await f.copy();f.put('practice/original.txt','original');const before=f.calls.length;assert.equal((await f.api.run('delete',{source,entries:[{key:'practice/original.txt'}]})).state,'failed');assert.equal(f.calls.length,before);});
test('unconfirmed writes persist a lock, block dependent writes and are not replayed on Retry',async()=>{const f=fixture();f.loseReply=true;assert.equal((await f.copy()).state,'uncertain');assert.ok(f.storage.saved.pending);const count=f.calls.length;assert.equal((await f.copy()).state,'failed');await assert.rejects(f.session.reconcile(),/review/);assert.equal(f.calls.length,count);assert.equal(f.session.state.objects.length,0);assert.ok(f.objects.has('original.txt'));});
test('storage failure prevents dispatch and session resume preserves copy identities',async()=>{const f=fixture();await f.copy();const saved=f.storage.saved;const resumed=fixture(saved);assert.equal(resumed.session.owned(source,'practice/original.txt').id,f.session.owned(source,'practice/original.txt').id);f.storageFail=true;const count=f.calls.length;assert.equal((await f.copy('original.txt','fresh/')).state,'failed');assert.equal(f.calls.length,count);});
test('unrelated operation classes and folder recursion are blocked during practice',async()=>{const f=fixture();assert.equal((await f.api.run('upload',{})).state,'failed');assert.equal((await f.api.run('delete',{source,entries:[{key:'practice/',folder:true}]})).state,'failed');assert.deepEqual(f.calls,[]);});

test('real adapter without atomic ownership support blocks all destructive practice operations',async()=>{const api=createFileApi({move:async()=>{throw Error('Must not dispatch');},rename:async()=>{throw Error('Must not dispatch');},delete:async()=>{throw Error('Must not dispatch');}}),session=createPracticeSession({api,storage:{set:async()=>{}},approve:async()=>true});api.setPolicy(session);session.active=true;for(const operation of ['move','rename','delete']){const r=await api.run(operation,{source,destination:source,entries:[{key:'x'}],entry:{key:'x'},newName:'y'});assert.equal(r.state,'failed');assert.match(r.error,/ownership/);}});

test('restart replaces results and session ID, preserves ownership, and never mutates remote files',async()=>{
 const f=fixture();await f.copy();const oldId=f.session.state.id,ownedId=f.session.state.objects[0].id;
 f.session.state.index=42;f.session.state.records=[{exerciseId:1,verdict:'PASSED'}];await f.session.save();
 const before=structuredClone([...f.objects]),calls=[...f.calls];await f.session.restart();
 assert.notEqual(f.session.state.id,oldId);assert.equal(f.session.state.index,0);assert.deepEqual(f.storage.saved.records,[]);
 assert.equal(f.session.owned(source,'practice/original.txt'),undefined);assert.equal(f.session.recovery[0].session.objects[0].id,ownedId);assert.equal(f.storage.ownership.objects[0].id,ownedId);assert.deepEqual([...f.objects],before);assert.deepEqual(f.calls,calls);
});
test('restart archives uncertain operations and old results when reconciliation cannot prove safety',async()=>{
 const f=fixture();f.session.state.records=[{exerciseId:1,verdict:'PASSED'}];f.loseReply=true;await f.copy();const oldId=f.session.state.id;
 const pending=structuredClone(f.session.state.pending);const result=await f.session.restart();assert.equal(result.unfinished,true);assert.notEqual(f.session.state.id,oldId);assert.equal(f.session.state.pending,null);assert.deepEqual(f.storage.saved.records,[]);assert.deepEqual(f.storage.recovery[0].session.pending,pending);assert.equal(f.storage.recovery[0].session.records[0].verdict,'PASSED');assert.deepEqual(f.calls,['copy']);
});
test('restart storage failure keeps current session and results',async()=>{
 const f=fixture();const oldId=f.session.state.id;f.session.state.records=[{exerciseId:1}];f.storageFail=true;
 await assert.rejects(f.session.restart(),/Storage/);assert.equal(f.session.state.id,oldId);assert.equal(f.session.state.records.length,1);
});

test('restart refuses an operation still in flight without resetting results',async()=>{
 const f=fixture();let finish;const oldId=f.session.state.id;
 const running=f.session.run('list',{}, {},()=>new Promise(resolve=>{finish=resolve;}));
 assert.equal(f.session.busy,true);await assert.rejects(f.session.restart(),/current file operation/);assert.equal(f.session.state.id,oldId);
 finish({entries:[]});await running;assert.equal(f.session.busy,false);await f.session.restart();assert.notEqual(f.session.state.id,oldId);
});


test('no destination setup: same-folder Keep Both and arbitrary folders work without creating folders',async()=>{
 const f=fixture();assert.equal((await f.api.run('copy',{source,destination:source,entries:[{key:'original.txt'}],conflict:'keep'})).state,'completed');
 assert.ok(f.session.owned(source,'original (copy).txt'));assert.equal((await f.copy('original.txt','chosen/')).state,'completed');assert.ok(f.session.owned(source,'chosen/original.txt'));
 assert.ok(!f.calls.includes('mkdir'));assert.equal((await f.api.run('mkdir',{source,name:'unapproved'})).state,'failed');
});
test('cross-bucket destination requires an explicit adapter capability',async()=>{
 const f=fixture();const r=await f.api.run('copy',{source,destination:{...source,bucketName:'other'},entries:[{key:'original.txt'}],conflict:'skip'});assert.equal(r.state,'failed');assert.match(r.error,/Cross-bucket/);assert.deepEqual(f.calls,[]);
});
test('restart preserves provenance but old-session objects cannot be destructively modified in the fresh session',async()=>{
 const f=fixture();await f.copy();await f.session.restart();const count=f.calls.length;
 const r=await f.api.run('delete',{source,entries:[{key:'practice/original.txt'}]});assert.equal(r.state,'failed');assert.match(r.error,/earlier Test It session/);assert.equal(f.calls.length,count);assert.ok(f.objects.has('practice/original.txt'));
});

for(const operation of ['rename','move','delete'])test('restart after interrupted '+operation+' retains exact evidence and changes no cloud objects',async()=>{
 const f=fixture();await f.copy();const own=f.session.state.objects[0];
 f.session.state.pending={operation,source,entries:[{key:own.key}],destinations:operation==='delete'?[]:[{source:{...source,prefix:'other/'},key:'other/changed.txt',absent:true}],receipts:[],startedAt:123};
 // Simulate suspension after a provider changed the source, before local confirmation.
 f.objects.delete(own.key);if(operation!=='delete')f.put('other/changed.txt','original');
 await f.session.save();const prior=structuredClone(f.storage.saved),objects=structuredClone([...f.objects]),calls=[...f.calls];
 const resumed=fixture(prior);for(const [key] of resumed.objects)resumed.objects.delete(key);for(const [key,obj] of objects)resumed.objects.set(key,obj);
 await resumed.session.restart();assert.deepEqual(resumed.storage.recovery[0].session,prior);assert.equal(resumed.storage.recovery[0].reconciliation.status,'needs-review');assert.deepEqual([...resumed.objects],objects);assert.deepEqual(resumed.calls,[]);assert.deepEqual(f.calls,calls);
 assert.equal((await resumed.api.run('delete',{source,entries:[{key:'other/changed.txt'}]})).state,'failed');
});
test('uncertain destination reads are archived, no retry occurs, and old destinations stay reserved',async()=>{
 const f=fixture();f.loseReply=true;await f.copy();f.objects.delete('practice/original.txt');
 const pending=structuredClone(f.session.state.pending);await f.session.restart();assert.deepEqual(f.session.recovery[0].session.pending,pending);
 const count=f.calls.length;assert.equal((await f.copy()).state,'failed');assert.equal(f.calls.length,count);
 f.loseReply=false;assert.equal((await f.copy('original.txt','fresh/')).state,'completed');
 assert.equal((await f.api.run('delete',{source,entries:[{key:'fresh/original.txt'}]})).state,'completed');
 assert.ok(f.objects.has('original.txt'));
});
test('recovery survives reload, repeated restart, ordinary saves and attempted old-object deletion',async()=>{
 const f=fixture();await f.copy();await f.session.restart();const recovery=structuredClone(f.storage.recovery);
 const resumed=fixture(f.storage.saved,recovery);await resumed.session.save();assert.deepEqual(resumed.storage.recovery,recovery);
 assert.equal((await resumed.api.run('delete',{source,entries:[{key:'practice/original.txt'}]})).state,'failed');
 await resumed.session.restart();assert.equal(resumed.storage.recovery.length,2);assert.deepEqual(resumed.storage.recovery[0],recovery[0]);assert.equal(resumed.storage.ownership.objects.length,1);
});
test('failed archive persistence preserves pending, ownership and old saved results; retry succeeds',async()=>{
 const f=fixture();f.loseReply=true;await f.copy();const before=structuredClone(f.session.state),persisted=structuredClone(f.storage.saved);
 f.storageFail=true;await assert.rejects(f.session.restart(),/Recovery details could not be saved/);assert.deepEqual(f.session.state,before);assert.deepEqual(f.storage.saved,persisted);assert.deepEqual(f.storage.recovery,[]);
 f.storageFail=false;await f.session.restart();assert.deepEqual(f.storage.recovery[0].session,before);
});
test('mutations during restart reconciliation are blocked even with practice temporarily inactive',async()=>{
 const f=fixture();await f.copy();let release;const checking=new Promise(resolve=>{release=resolve;});
 // A separate policy fixture permits holding the inspect adapter across restart.
 let session,hold=false,calls=0;
 const api=createFileApi({inspect:async()=>{if(hold)await checking;return {object:{etag:'x',size:1,version:'1'},sha256:'h'};},copy:async()=>{calls++;}});
 const original={identity:JSON.stringify(['account','bucket','x']),source,key:'x',stamp:JSON.stringify(['x',1,null,'1']),sha256:'h'};
 session=createPracticeSession({api,storage:{set:async()=>{}},saved:{id:'old',version:1,index:0,originals:[original],objects:[],destinations:[],records:[],pending:null},approve:async()=>true});api.setPolicy(session);session.active=true;hold=true;
 const restart=session.restart();await new Promise(resolve=>setTimeout(resolve,0));assert.equal((await api.run('copy',{})).state,'failed');assert.equal(calls,0);release();await restart;
});

test('restart preserves uncertain destination evidence when read-only stat fails',async()=>{
 const f=fixture();f.loseReply=true;await f.copy();f.objects.delete('practice/original.txt');f.statFail=true;
 const before=structuredClone(f.session.state);await f.session.restart();assert.deepEqual(f.storage.recovery[0].session,before);
 assert.equal(f.storage.recovery[0].reconciliation.status,'needs-review');assert.deepEqual(f.calls,['copy']);
});

test('capable adapter cross-bucket copy verifies exact destination while unrelated remote objects stay unowned',async()=>{
 const from={...source,prefix:'source/'},to={...source,bucketName:'other',prefix:'chosen/'},hash='same-bytes',object={etag:'etag',size:3,version:'v1'};
 const objects=new Map([[JSON.stringify([from.bucketName,'source/file.txt']),{object,sha256:hash}],[JSON.stringify([to.bucketName,'chosen/unrelated.txt']),{object,sha256:hash}]]),get=(source,key)=>objects.get(JSON.stringify([source.bucketName,key]));let writes=0;
 const api=createFileApi({crossBucketCopy:true,inspect:async({source,key})=>get(source,key)||{object:null},stat:async({source,key})=>({object:get(source,key)?.object||null}),copy:async({source,destination,entries})=>{writes++;const sourceKey=entries[0].key,destinationKey=destination.prefix+'file.txt';objects.set(JSON.stringify([destination.bucketName,destinationKey]),{object:{...object,version:'v2'},sha256:hash});return {completed:1,results:[{sourceKey,destinationKey,status:'copied',verified:true,destinationVersion:'v2',destinationEtag:'etag',size:3}]};}});
 const session=createPracticeSession({api,storage:{set:async()=>{}},approve:async()=>true});api.setPolicy(session);session.active=true;
 assert.equal((await api.run('copy',{source:from,destination:to,entries:[{key:'source/file.txt'}],conflict:'skip'})).state,'completed');assert.equal(writes,1);assert.equal(session.owned(to,'chosen/file.txt').source.bucketName,'other');assert.equal(session.owned(from,'source/file.txt'),undefined);assert.equal(session.owned(to,'chosen/unrelated.txt'),undefined);
 assert.equal(session.state.lastVerifiedOperation.changes[0].source.bucketName,'other');
});
