import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const code=await readFile(new URL('../extension/transfer-counter.js',import.meta.url),'utf8');
function fixture(data={}){const c=vm.createContext({crypto:webcrypto});vm.runInContext(code,c);const storage={get:async()=>structuredClone(data),set:async patch=>Object.assign(data,structuredClone(patch))};return {data,create:()=>c.RedownTransferCounter.create(storage)};}
const success=()=>({ok:true,sourceUrl:'https://fixture.invalid/source',location:'https://fixture.invalid/destination'});
function verified(provider,id='stable'){
 const entry={...success(),verified:true,status:'completed',providerKind:provider,
   deliveryId:provider+':'+id,bytes:1};
 if(provider==='cloudflare')return {...entry,
   destination:{accountId:'r2-account',bucketName:'saved',key:'files/'+id+'.pdf'},
   verification:{kind:'r2-head-v1',sessionId:'live-login',key:'files/'+id+'.pdf',bytes:1,etag:'etag-'+id}};
 if(provider==='google')return {...entry,destination:{provider:'google-drive',fileId:id,name:id+'.pdf'}};
 if(provider==='dropbox')return {...entry,location:'',
   destination:{proofVersion:1,accountId:'dbid:a',connectionId:'c',namespace:'123',root:'/',
   fileId:'id:'+id,revision:'rev-'+id,contentHash:'a'.repeat(64),path:'/a.pdf',name:'a.pdf',bytes:1}};
 if(provider==='onedrive')return {...entry,location:'',
   destination:{provider:'onedrive',accountId:'account',driveId:'drive',rootId:'root',itemId:id}};
 throw Error('Unexpected provider');
}
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
test('provider receipt counts require verified attribution, persist deduplication and never hydrate legacy counts',async()=>{
 const h=fixture({transferHistory:[success()]}),a=h.create();await a.read();assert.equal(h.data.providerSaveReceipts,undefined);
 for(const provider of ['cloudflare','google','dropbox','onedrive']){
  const receipt=verified(provider,'stable');
  await a.record({...receipt,verified:false,deliveryId:provider+':unverified'});assert.equal(h.data.providerSaveReceipts?.totals[provider],undefined);
  for(const status of ['cancelled','uncertain','blocked','active'])await a.record({...receipt,ok:undefined,verified:false,status});
  await a.record({...receipt,ok:false});assert.equal(h.data.providerSaveReceipts?.totals[provider],undefined);
  await a.record(receipt);const total=h.data.transferCounter.total;
  await h.create().record(receipt);assert.equal(h.data.transferCounter.total,total);
  assert.equal(h.data.providerSaveReceipts.totals[provider],'1');
  await h.create().record(verified(provider,'second'));assert.equal(h.data.providerSaveReceipts.totals[provider],'2');
 }
 assert.equal(h.data.providerSaveReceipts.ids.length,8);
 assert.deepEqual(Object.keys(h.data.providerSaveReceipts.latest).sort(),['accountId','at','connectionId','id','provider','verified']);
});

test('weak Dropbox success cannot count or erase failed attempts and preserves existing lifetime totals',async()=>{
 const old={ok:false,providerKind:'dropbox',sourceUrl:'https://fixture.invalid/source',at:new Date().toISOString(),error:'denied'};
 const h=fixture({transferCounter:{version:1,total:'900'},transferHistory:[old]}),a=h.create();
 await a.record({...success(),providerKind:'dropbox',deliveryId:'dropbox:weak',verified:true,status:'completed'});
 assert.equal(h.data.transferCounter.total,'900');assert.equal(h.data.providerSaveReceipts,undefined);assert.equal(h.data.transferHistory.length,2);assert.equal(h.data.transferHistory[0].status,'uncertain');assert.equal(h.data.transferHistory[0].location,'');assert.deepEqual(h.data.transferHistory[1],old);
});


test('no provider can count a failed or pending upload merely because a valid proof object exists',async()=>{
 const h=fixture(),a=h.create();
 for(const provider of ['cloudflare','google','dropbox','onedrive']){
  const good=verified(provider,provider+'-good');
  for(const changed of [
   {...good,ok:false},
   {...good,status:'failed'},
   {...good,status:'pending'},
   {...good,verified:false}
  ])await a.record(changed);
  assert.equal(h.data.providerSaveReceipts?.totals?.[provider],undefined);
  await a.record(good);
  assert.equal(h.data.providerSaveReceipts.totals[provider],'1');
  const n=h.data.transferCounter.total;
  await a.record({...good,deliveryId:provider+':different-but-failed',ok:false});
  assert.equal(h.data.transferCounter.total,n);
  assert.equal(h.data.providerSaveReceipts.totals[provider],'1');
 }
 assert.equal(h.data.redownDailyVerified.total,'4');
});
