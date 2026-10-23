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
test('failed persistence does not publish an in-memory increment; retry reads authoritative storage',async()=>{
 const c=vm.createContext({crypto:webcrypto});vm.runInContext(code,c);let data={transferCounter:{version:1,total:'4'}},fail=true;
 const a=c.RedownTransferCounter.create({get:async()=>structuredClone(data),set:async patch=>{if(fail)throw Error('Storage unavailable');Object.assign(data,patch);}});await assert.rejects(a.add(1));fail=false;assert.equal((await a.read()).total,'4');
});
