import test from 'node:test';
import assert from 'node:assert/strict';
import {createFileApi} from '../extension/beta/file-api.mjs';
import {createPracticeSession} from '../extension/beta/test-it-session.mjs';
import {exercises} from '../extension/beta/test-it.mjs';
import {createHash} from 'node:crypto';
const source={accountId:'account',bucketName:'bucket',prefix:''};
function fixture(saved){
  const objects=new Map(),events=[],calls=[];let serial=0,storageFail=false,loseReply=false;
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const put=(key,bytes)=>objects.set(key,{key,size:bytes.length,etag:hash(bytes),uploaded:new Date(1700000000000+ ++serial).toISOString(),version:'v'+serial,bytes});
  put('original.txt','original');put('unrelated.txt','unrelated');
  const inspect=key=>{const o=objects.get(key);if(!o)return {object:null};const {bytes,...object}=o;return {object,sha256:hash(bytes),status:200};};
  const adapter={conditionalPracticeMutations:true,list:async({source})=>({entries:[],folderExists:[...objects.keys()].some(k=>k.startsWith(source.prefix))}),mkdir:async({source,name})=>{calls.push('mkdir');put(source.prefix+name+'/.redown','');return {completed:1};},inspect:async({key})=>inspect(key),stat:async({key})=>({object:inspect(key).object}),
    copy:async input=>transfer('copy',input),move:async input=>transfer('move',input),
    rename:async({source,entry,newName})=>transfer('move',{source,destination:{...source,prefix:entry.key.slice(0,entry.key.lastIndexOf('/')+1)},entries:[entry],newName}),
    delete:async({entries})=>{calls.push('delete');for(const e of entries)objects.delete(e.key);return {completed:entries.length};},upload:async()=>{calls.push('upload');return {};}};
  async function transfer(op,{entries,destination,source,newName,conflict}){calls.push(op);const results=[];for(const e of entries){const o=objects.get(e.key);let key=destination.prefix+(newName||e.key.split('/').pop());if(key===e.key&&conflict==='keep')key=destination.prefix+e.key.split('/').pop().replace(/(\.[^.]*)?$/,' (copy)$1');if(objects.has(key)){results.push({sourceKey:e.key,destinationKey:key,status:'conflict'});continue;}put(key,o.bytes);const d=objects.get(key);results.push({sourceKey:e.key,destinationKey:key,sourceEtag:o.etag,sourceVersion:o.version,destinationEtag:d.etag,destinationVersion:d.version,size:d.size,verified:true,status:'copied'});if(op==='move')objects.delete(e.key);}if(loseReply)throw Object.assign(Error('Lost response'),{uncertain:true});return {completed:results.filter(r=>r.status==='copied').length,results};}
  const api=createFileApi(adapter),storage={set:async value=>{if(storageFail)throw Error('Storage unavailable');storage.saved=structuredClone(value.betaExplorerTestIt);storage.ownership=structuredClone(value.betaExplorerTestItOwnership);}},session=createPracticeSession({api,storage,saved,approve:async()=>true,onEvidence:e=>events.push(e)});api.setPolicy(session);session.active=true;
  const copy=(key='original.txt',prefix='practice/')=>api.run('copy',{source,destination:{...source,prefix},entries:[{key}],conflict:'skip'});
  return {objects,put,api,session,events,calls,storage,copy,set storageFail(v){storageFail=v;},set loseReply(v){loseReply=v;}};
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
 assert.equal(f.session.owned(source,'practice/original.txt').id,ownedId);assert.equal(f.storage.ownership.objects[0].id,ownedId);assert.deepEqual([...f.objects],before);assert.deepEqual(f.calls,calls);
});
test('restart retains uncertain operations and old results when reconciliation cannot prove safety',async()=>{
 const f=fixture();f.session.state.records=[{exerciseId:1,verdict:'PASSED'}];f.loseReply=true;await f.copy();const oldId=f.session.state.id;
 await assert.rejects(f.session.restart(),/review/);assert.equal(f.session.state.id,oldId);assert.ok(f.session.state.pending);assert.equal(f.storage.saved.records[0].verdict,'PASSED');assert.deepEqual(f.calls,['copy']);
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


test('two locations must differ, cross-bucket practice fails closed, and only an approved empty folder marker is created',async()=>{
 const f=fixture();await f.session.source(source,'original.txt');
 await assert.rejects(f.session.configureLocations(source,source),/distinct/);
 await assert.rejects(f.session.configureLocations(source,{...source,bucketName:'another',prefix:'B/'}),/Cross-bucket/);
 assert.deepEqual(f.calls,[]);
 await f.session.configureLocations(source,{...source,prefix:'B/'});assert.deepEqual(f.calls,['mkdir']);assert.ok(f.objects.has('B/.redown'));assert.equal(f.session.state.destinations.length,2);
 assert.equal((await f.copy('original.txt','B/')).state,'completed');
 assert.equal((await f.copy('original.txt','unexpected/')).state,'failed');assert.ok(!f.objects.has('unexpected/original.txt'));
 assert.equal((await f.api.run('mkdir',{source,name:'unapproved'})).state,'failed');assert.ok(!f.objects.has('unapproved/.redown'));
});
test('restart preserves provenance but old-session objects cannot be destructively modified in the fresh session',async()=>{
 const f=fixture();await f.copy();await f.session.restart();const count=f.calls.length;
 const r=await f.api.run('delete',{source,entries:[{key:'practice/original.txt'}]});assert.equal(r.state,'failed');assert.match(r.error,/earlier Test It session/);assert.equal(f.calls.length,count);assert.ok(f.objects.has('practice/original.txt'));
});
