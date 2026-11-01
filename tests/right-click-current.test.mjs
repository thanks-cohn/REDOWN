import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {IDBFactory} from 'fake-indexeddb';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../extension/right-click-current.js',import.meta.url),'utf8');
function instance(database=new IDBFactory(),options={}){const c=vm.createContext({structuredClone,Date,crypto:webcrypto});vm.runInContext(source,c);return {api:c.RedownRightClickCurrent,store:c.RedownRightClickCurrent.create(database,options),database};}
const profile={id:'p',accountId:'a',bucketName:'photos',workerUrl:'https://worker.invalid',token:'NEVER_EXPORT'};
const destination=(id='one',prefix='a/b')=>({id,profileId:'p',accountId:'a',bucketName:'photos',prefix,label:id,enabled:true,parentId:null});
const inventory=(nodes,at=1)=>({version:2,key:JSON.stringify([2,0,5,[['s','p','a','photos','','https://worker.invalid']]]),nodes:nodes.map(prefix=>({profileId:'p',accountId:'a',bucketName:'photos',prefix,parent:prefix.includes('/')?prefix.split('/').slice(0,-1).join('/'):prefix?'':null,level:prefix?prefix.split('/').length:0,listed:true,observedAt:at})),frontier:[],at});
test('T11 T17 T18 T19 CURRENT merges partial scans, scopes journal deltas and preserves graph across restart',async()=>{
 const h=instance();const first=inventory(['','a','a/b','a/b/c','a/b/c/d','a/b/c/d/e']);
 await h.store.commitPatch({rightClickV3:{version:1,revision:0,destinations:[destination()]},rightClickV3Inventory:first},{profiles:[profile]});
 const before=await h.store.dump();
 const identical=await h.store.commitPatch({rightClickV3Inventory:inventory(first.nodes.map(n=>n.prefix),2)},{profiles:[profile]});assert.equal(identical.changed,0);
 assert.equal((await h.store.dump()).stores.journal.length,before.stores.journal.length);
 await h.store.commitPatch({rightClickV3Inventory:inventory(['','a'],3)},{profiles:[profile]});
 const restarted=instance(h.database);assert.equal((await restarted.store.readState()).rightClickV3Inventory.nodes.length,6);
 assert.equal((await restarted.store.dump()).stores.journal.length,before.stores.journal.length);
 await restarted.store.commitPatch({rightClickV3:{version:1,revision:1,destinations:[{...destination(),label:'Changed'}]}},{profiles:[profile]});
 assert.equal((await restarted.store.dump()).stores.journal.length,before.stores.journal.length+1);
 assert.ok(!JSON.stringify(await restarted.store.dump()).includes('NEVER_EXPORT'));
});
test('T16 transaction rejection rolls back graph journal pointer and configuration together',async()=>{
 const db=new IDBFactory(),good=instance(db);await good.store.commitPatch({rightClickV3:{version:1,revision:0,destinations:[destination()]}},{profiles:[profile]});
 const before=JSON.stringify((await good.store.dump()).stores),bad=instance(db,{fault(){throw Error('injected crash');}});
 await assert.rejects(bad.store.commitPatch({rightClickV3:{version:1,revision:1,destinations:[destination('two')]}},{profiles:[profile]}),/injected crash/);
 assert.equal(JSON.stringify((await good.store.dump()).stores),before);
});
test('T20 rollover on actual use keeps immutable dated BACKUP distinct from live WORKING; Off keeps journal',async()=>{
 let now=new Date(2026,9,31,12).getTime();const h=instance(undefined,{clock:()=>now});
 await h.store.commitPatch({rightClickV3:{version:1,revision:0,destinations:[destination()]}},{profiles:[profile]});
 const first=JSON.stringify((await h.store.dump()).stores.backups);
 for(let i=1;i<=20;i++)await h.store.commitPatch({rightClickV3:{version:1,revision:i,destinations:[{...destination(),label:'edit'+i}]}},{profiles:[profile]});
 assert.equal(JSON.stringify((await h.store.dump()).stores.backups),first);
 now=new Date(2026,10,4,12).getTime();await h.store.commitPatch({});const next=await h.store.dump();assert.equal(next.stores.backups.length,2);assert.equal(next.stores.backups[1].period,'2026-11-04');assert.ok(next.stores.pointers[0].working.includes('WORKING'));
 await h.store.commitPatch({rightClickV3Presentation:{style:'simple',nested:'narrow',depth:1}},{policy:'off'});assert.equal((await h.store.dump()).stores.backups.length,2);
});
test('T07 equal bucket and folder labels in separate accounts retain independent generations',async()=>{
 const h=instance(),q={...profile,id:'q',accountId:'b'},d=destination();await h.store.commitPatch({rightClickV3:{version:1,revision:0,destinations:[d,{...d,id:'two',profileId:'q',accountId:'b'}]}},{profiles:[profile,q]});
 const before=(await h.store.dump()).stores.pointers.find(p=>p.id.includes('"q"'));
 await h.store.commitPatch({rightClickV3:{version:1,revision:1,destinations:[{...d,label:'edit'},{...d,id:'two',profileId:'q',accountId:'b'}]}},{profiles:[profile,q]});
 assert.deepEqual((await h.store.dump()).stores.pointers.find(p=>p.id.includes('"q"')),before);
});
test('T16 stale native acknowledgment cannot mark a newer CURRENT applied; concurrent tabs roll over once',async()=>{
 const database=new IDBFactory(),one=instance(database),two=instance(database);
 await one.store.commitPatch({rightClickV3:{version:1,revision:0,destinations:[destination()]}},{profiles:[profile]});
 const old=await one.store.generations();
 await two.store.commitPatch({rightClickV3:{version:1,revision:1,destinations:[{...destination(),label:'new'}]}},{profiles:[profile]});
 await one.store.acknowledge(old);assert.ok((await one.store.dump()).stores.pointers.some(p=>p.applied!==p.desired));
 await two.store.acknowledge(await two.store.generations());assert.ok((await one.store.dump()).stores.pointers.every(p=>p.applied===p.desired));
 const count=(await one.store.dump()).stores.backups.length;await Promise.all([one.store.commitPatch({}),two.store.commitPatch({})]);assert.equal((await one.store.dump()).stores.backups.length,count);
});
