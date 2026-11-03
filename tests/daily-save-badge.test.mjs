import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';

const counterSource=await readFile(new URL('../extension/transfer-counter.js',import.meta.url),'utf8');
const badgeSource=await readFile(new URL('../extension/daily-save-badge.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(start=new Date(2026,10,2,15,0)){
  let current=start;
  const state={},changes=[],alarms=[],text=[],colors=[],alarmCalls=[];
  const clone=o=>JSON.parse(JSON.stringify(o));
  const storage={
    get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys])
      .filter(k=>Object.hasOwn(state,k)).map(k=>[k,clone(state[k])])),
    set:async patch=>{
      const old=Object.fromEntries(Object.entries(patch).map(([k])=>[k,state[k]]));
      Object.assign(state,clone(patch));
      const event=Object.fromEntries(Object.entries(patch).map(([k,v])=>[k,{oldValue:old[k],newValue:clone(v)}]));
      for(const fn of changes)fn(event,'local');
    }
  };
  const chrome={
    storage:{local:storage,onChanged:{addListener:f=>changes.push(f)}},
    action:{
      setBadgeText:async v=>text.push(v.text),
      setBadgeBackgroundColor:async v=>colors.push(v.color),
      setBadgeTextColor:async()=>{}
    },
    alarms:{create:async(name,opt)=>alarmCalls.push({name,...opt}),
      onAlarm:{addListener:f=>alarms.push(f)}},
    runtime:{onStartup:{addListener:()=>{}},onInstalled:{addListener:()=>{}}}
  };
  const context=vm.createContext({crypto:webcrypto,console});
  vm.runInContext(counterSource,context);
  vm.runInContext(badgeSource,context);
  const counter=context.RedownTransferCounter.create(storage,null,null,()=>current);
  const badge=context.RedownDailySaveBadge.create({chrome,readDaily:()=>counter.readDaily(),now:()=>current});
  badge.install();
  return {chrome,counter,badge,state,text,colors,alarmCalls,alarms,
    date:d=>{current=d;},last:()=>text.at(-1),flush:async()=>{await settle();await settle();}};
}
const receipt=(provider,id)=>({
  providerKind:provider,deliveryId:provider+':'+id,
  ok:true,verified:true,status:'completed',bytes:18,
  location:provider==='dropbox'||provider==='onedrive'?'':'R2: bucket/file',
  ...(provider==='cloudflare'?{
    destination:{accountId:'r2-owner',bucketName:'bucket',key:'objects/'+id+'.png'},
    verification:{kind:'r2-head-v1',sessionId:'live-session',key:'objects/'+id+'.png',bytes:18,etag:'etag-value'}
  }:{}),
  ...(provider==='google'?{destination:{provider:'google-drive',fileId:id,name:id+'.png'}}:{}),
  ...(provider==='dropbox'?{destination:{
    proofVersion:1,accountId:'dbid:one',connectionId:'current',namespace:'123',root:'/',
    fileId:'id:'+id,revision:'rev',contentHash:'a'.repeat(64),name:id+'.png',path:'/'+id+'.png',bytes:18
  }}:{}),
  ...(provider==='onedrive'?{destination:{accountId:'one',driveId:'drive',rootId:'root',itemId:id}}:{})
});

test('Badge starts at zero, increments on unique verified saves from all four providers',async()=>{
 const f=fixture();await f.flush();assert.equal(f.last(),'0');
 for(const [i,p] of ['cloudflare','google','dropbox','onedrive'].entries()){
   await f.counter.record(receipt(p,'id-'+i));
   await f.flush();
   assert.equal(f.last(),String(i+1),p);
   assert.equal(f.state.providerSaveReceipts.totals[p],'1');
 }
 assert.equal(f.state.redownDailyVerified.total,'4');
 assert.equal(f.state.transferCounter.total,'4');
});

test('Repeat receipts, denied saves, failed and pending jobs do not change daily badge',async()=>{
 const f=fixture();await f.flush();
 const r=receipt('cloudflare','one');
 await f.counter.record(r);await f.flush();assert.equal(f.last(),'1');
 await f.counter.record(r);await f.flush();assert.equal(f.last(),'1');
 for(const entry of [
  {...receipt('cloudflare','failed'),verified:false,ok:false,status:'failed'},
  {...receipt('google','pending'),verified:false,ok:undefined,status:'queued'},
  {...receipt('dropbox','bad-proof'),destination:{accountId:'dbid:one'}},
  {...receipt('onedrive','uncertain'),verified:false,status:'uncertain'}
 ]){
   await f.counter.record(entry);
   await f.flush();
   assert.equal(f.last(),'1');
 }
 assert.equal(f.state.redownDailyVerified.total,'1');
});

test('Local midnight resets only today badge; lifetime total survives and next receipt starts at one',async()=>{
 const f=fixture(new Date(2026,10,2,23,59));
 await f.flush();
 await f.counter.record(receipt('cloudflare','yesterday'));await f.flush();
 assert.equal(f.last(),'1');
 assert.equal(f.alarmCalls.at(-1).when,new Date(2026,10,3,0,0,1).getTime());
 f.date(new Date(2026,10,3,0,1));
 for(const cb of f.alarms)cb({name:'redown-daily-verified-badge-midnight'});
 await f.flush();
 assert.equal(f.last(),'0');
 assert.equal(f.state.redownDailyVerified.day,'2026-11-03');
 assert.equal(f.state.transferCounter.total,'1');
 await f.counter.record(receipt('google','today'));await f.flush();
 assert.equal(f.last(),'1');
 assert.equal(f.state.transferCounter.total,'2');
});

test('Daily badge retains count across worker restart and has bounded display for high values',async()=>{
 const f=fixture();await f.flush();
 await f.counter.record(receipt('cloudflare','one'));await f.flush();
 const before=f.state.redownDailyVerified;
 const restart=f.badge;
 await restart.refresh();
 assert.equal(f.last(),'1');
 assert.equal(f.state.redownDailyVerified.total,before.total);
 assert.equal(restart.preview({version:1,day:before.day,total:'1000'}),'999+');
});
