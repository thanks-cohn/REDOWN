import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const code=await readFile(new URL('../extension/transfer-counter.js',import.meta.url),'utf8');
function fixture(data={}){const c=vm.createContext({crypto:webcrypto});vm.runInContext(code,c);const storage={get:async()=>structuredClone(data),set:async patch=>Object.assign(data,structuredClone(patch))};return {data,create:()=>c.RedownTransferCounter.create(storage)};}
const success=()=>({ok:true,sourceUrl:'https://fixture.invalid/source',location:'https://fixture.invalid/destination'});
test('new installations start at zero and retained history migrates exactly once',async()=>{
 const h=fixture({transferHistory:[success(),{ok:false},{ok:true,location:'owner/repo → queued'}]}),a=h.create();assert.equal((await a.read()).total,'1');await a.add(1);assert.equal((await h.create().read()).total,'2');assert.equal((await fixture().create().read()).total,'0');
});
test('successful records persist beyond the fifty-entry history limit; failures and dispatches do not count',async()=>{
 const h=fixture(),a=h.create();for(let i=0;i<60;i++)await a.record(success());await a.record({ok:false});await a.record({ok:true,location:'owner/repo → queued'});assert.equal(h.data.transferHistory.length,50);assert.equal((await h.create().read()).total,'60');assert.deepEqual(Object.keys(h.data.transferCounter).sort(),['basis','startedAt','total','version']);
});
test('concurrent completions cannot lose increments or history, including reads interleaved with writes',async()=>{
 const h=fixture(),a=h.create();await Promise.all(Array.from({length:40},(_,i)=>i%2?a.record(success()):a.add(1)));assert.equal((await a.read()).total,'40');assert.equal(h.data.transferHistory.length,20);
});
test('large counts preserve integer precision and invalid increments are rejected',async()=>{
 const h=fixture({transferCounter:{version:1,total:'9007199254740992'}}),a=h.create();await a.add(1);assert.equal((await a.read()).total,'9007199254740993');await assert.rejects(a.add(-1));await assert.rejects(a.add(1.5));
});
test('recording a successful retry retains the previous history cleanup contract',async()=>{
 const h=fixture({transferHistory:[{...success(),ok:false,at:new Date().toISOString()}]}),a=h.create();await a.record(success());assert.equal(h.data.transferHistory.length,1);assert.equal((await a.read()).total,'1');
});
test('durable history retains every event beyond the 50-row compatibility window',async()=>{
  const h=fixture(),a=h.create();
  for(let i=0;i<63;i++)await a.record({...success(),sourceUrl:'https://source.invalid/asset-'+i});
  assert.equal(h.data.transferHistory.length,50);
  assert.equal(h.data.transferHistoryArchiveV1.length,63);
  assert.equal((await a.history()).length,63);
  assert.equal((await h.create().history()).length,63,'journal survives worker recreation');
  assert.equal((await a.read()).total,'63');
});
test('legacy history migrates into archive when a new record is saved without losing old IDs',async()=>{
  const old={id:'legacy-id',ok:false,at:'2023-01-01T00:00:00.000Z',sourceUrl:'https://legacy.invalid'};
  const h=fixture({transferHistory:[old]}),a=h.create();
  assert.equal((await a.history()).length,1,'old records visible before migration');
  await a.record(success());
  assert.equal(h.data.transferHistoryArchiveV1.length,2);
  assert.ok((await a.history()).some(item=>item.id==='legacy-id'));
});
test('archive preserves failed attempts even when legacy recent cleanup replaces a retry',async()=>{
  const h=fixture(),a=h.create();
  await a.record({ok:false,sourceUrl:'https://error.invalid/file',error:'Offline'});
  await a.record({...success(),sourceUrl:'https://error.invalid/file'});
  assert.equal(h.data.transferHistory.length,1,'legacy retry cleanup retained');
  assert.equal((await a.history()).length,2,'audit archive includes both events');
});
test('post-rename updates both full journal and recent cache without changing the event ID',async()=>{
  const h=fixture(),a=h.create();await a.record(success());
  const id=h.data.transferHistory[0].id;
  const updated=await a.update(id,{location:'https://new.invalid/renamed.jpg',renamedAt:'2026-10-30T00:00:00Z'});
  assert.equal(updated.id,id);
  assert.equal(h.data.transferHistoryArchiveV1[0].location,'https://new.invalid/renamed.jpg');
  assert.equal(h.data.transferHistory[0].location,'https://new.invalid/renamed.jpg');
  assert.equal((await a.history())[0].location,'https://new.invalid/renamed.jpg');
  assert.equal((await a.read()).total,'1');
});
test('failed persistence does not publish an in-memory increment; retry reads authoritative storage',async()=>{
 const c=vm.createContext({crypto:webcrypto});vm.runInContext(code,c);let data={transferCounter:{version:1,total:'4'}},fail=true;
 const a=c.RedownTransferCounter.create({get:async()=>structuredClone(data),set:async patch=>{if(fail)throw Error('Storage unavailable');Object.assign(data,patch);}});await assert.rejects(a.add(1));fail=false;assert.equal((await a.read()).total,'4');
});
