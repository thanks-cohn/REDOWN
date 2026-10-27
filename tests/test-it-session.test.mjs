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
  const adapter={conditionalPracticeMutations:true,inspect:async({key})=>inspect(key),stat:async({key})=>({object:inspect(key).object}),
    copy:async input=>transfer('copy',input),move:async input=>transfer('move',input),
    rename:async({source,entry,newName})=>transfer('move',{source,destination:{...source,prefix:entry.key.slice(0,entry.key.lastIndexOf('/')+1)},entries:[entry],newName}),
    delete:async({entries})=>{calls.push('delete');for(const e of entries)objects.delete(e.key);return {completed:entries.length};},upload:async()=>{calls.push('upload');return {};}};
  async function transfer(op,{entries,destination,source,newName,conflict}){calls.push(op);const results=[];for(const e of entries){const o=objects.get(e.key);let key=destination.prefix+(newName||e.key.split('/').pop());if(key===e.key&&conflict==='keep')key=destination.prefix+e.key.split('/').pop().replace(/(\.[^.]*)?$/,' (copy)$1');if(objects.has(key)){results.push({sourceKey:e.key,destinationKey:key,status:'conflict'});continue;}put(key,o.bytes);const d=objects.get(key);results.push({sourceKey:e.key,destinationKey:key,sourceEtag:o.etag,sourceVersion:o.version,destinationEtag:d.etag,destinationVersion:d.version,size:d.size,verified:true,status:'copied'});if(op==='move')objects.delete(e.key);}if(loseReply)throw Object.assign(Error('Lost response'),{uncertain:true});return {completed:results.filter(r=>r.status==='copied').length,results};}
  const api=createFileApi(adapter),storage={set:async value=>{if(storageFail)throw Error('Storage unavailable');storage.saved=structuredClone(value.betaExplorerTestIt);}},session=createPracticeSession({api,storage,saved,approve:async()=>true,onEvidence:e=>events.push(e)});api.setPolicy(session);session.active=true;
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
