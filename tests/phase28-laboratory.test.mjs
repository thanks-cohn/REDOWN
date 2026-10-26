import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeLab} from '../extension/lab-session.mjs';
import {laboratoryCreate} from '../extension/lab-worker.mjs';
const root={provider:'extension-r2',account:'a',container:'test-1-new',key:''};
function fixture(){
 const objects=new Map();let puts=0;
 return {objects,get puts(){return puts;},createObject:async(i,b)=>{puts++;if(objects.has(i.key))throw Object.assign(Error(),{code:'CONFLICT'});objects.set(i.key,b.slice());},request:async(path,options={})=>{
  if(path.includes('?')){const prefix=new URL('https://fixture'+path).searchParams.get('prefix')||'';const entries=[...objects].filter(([k])=>k.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)).slice(0,1).map(([key,b])=>({key,size:b.length,etag:'revision-'+b.length}));return Response.json({result:entries});}
  const key=path.split('/objects/')[1]?.split('/').map(decodeURIComponent).join('/');
  if(!objects.has(key))return new Response(null,{status:404});
  const b=objects.get(key);return new Response(options.method==='HEAD'?null:b,{headers:{etag:'revision-'+b.length,'content-length':String(b.length)}});
 }};
}
const req=(operation,args={})=>({request:{apiVersion:'0.3.0',operation,idempotencyKey:crypto.randomUUID(),...args}});
test('write approval confines all operations to an extension-minted namespace and preserves idempotency',async()=>{
 const f=fixture();const grant=authorizeLab({roots:[root],write:true,...f,isCurrent:()=>true});
 const info=(await grant.query('describe')).data;assert.ok(info.writeEnabled);assert.match(info.locations[0].key,/^__redown_test__\/[a-f0-9-]{36}\/$/);
 const dest={...info.locations[0],key:info.writePrefix+'hello.bin'};
 const upload=req('upload',{destination:dest,bytesBase64:Buffer.from([0,255,10]).toString('base64')});
 const job=(await grant.query('execute',upload)).data;assert.equal(job.state,'completed',JSON.stringify(job));
 assert.equal((await grant.query('execute',upload)).data.id,job.id);assert.equal(f.puts,1);
 assert.equal((await grant.query('execute',req('upload',{destination:dest,content:'overwrite'}))).data.error,'CONFLICT');assert.equal(f.puts,1);
 for(const identity of [{...dest,key:'unrelated'}, {...dest,container:'test-2-new'},{...dest,account:'other'}])assert.equal((await grant.query('execute',req('upload',{destination:identity,content:'bad'}))).error.code,'AUTHORIZATION_DENIED');
 const copy=(await grant.query('execute',req('copy',{source:dest,destination:{...dest,key:dest.key+'.copy'}}))).data;assert.equal(copy.state,'completed');assert.equal(f.objects.size,2);
 const mkdir=(await grant.query('execute',req('mkdir',{destination:{...dest,key:info.writePrefix+'nested/'}}))).data;assert.equal(mkdir.state,'completed');
 for(const operation of ['delete','move','rename'])assert.equal((await grant.query('execute',req(operation,{source:dest,...(operation==='delete'?{}:{destination:{...dest,key:dest.key+'.new'}}),confirmed:true}))).error.code,'AUTHORIZATION_DENIED');
 grant.revoke();assert.equal((await grant.query('describe')).error.code,'AUTHORIZATION_REVOKED_OR_EXPIRED');
 assert.throws(()=>authorizeLab({roots:[{...root,container:'unrelated'}],write:true,...f,isCurrent:()=>true}),{code:'LAB_BUCKET_REQUIRED'});
});
test('ambiguous writes are not retried, and old Worker capabilities block before upload',async()=>{
 let calls=[];
 const create=laboratoryCreate({getProfiles:async()=>[{type:'cloudflare-r2',accountId:'a',bucketName:'test-1-new',workerUrl:'https://lab.account.workers.dev',scriptName:'lab',token:'SECRET'}],request:async path=>Response.json({result:path.endsWith('/settings')?{bindings:[{type:'r2_bucket',name:'STORAGE',bucket_name:'test-1-new'}]}:{subdomain:'account'}}),fetcher:async(url,options)=>{calls.push(options);return Response.json({ok:true,storageBound:true,safeTransfers:true});}});
 await assert.rejects(create({...root,key:'x'},new Uint8Array()),{code:'LAB_WORKER_UPDATE_REQUIRED'});assert.equal(calls.length,1);
 calls=[];const f=fixture();let writes=0;
 const g=authorizeLab({roots:[root],write:true,...f,createObject:async()=>{writes++;throw Object.assign(Error(),{code:'WRITE_UNCERTAIN'});},isCurrent:()=>true});
 const info=(await g.query('describe')).data;const r=req('upload',{destination:{...info.locations[0],key:info.writePrefix+'x'},content:'x'});
 assert.equal((await g.query('execute',r)).data.state,'uncertain');assert.equal((await g.query('execute',r)).data.state,'uncertain');assert.equal(writes,1);
});
test('rolling session keeps writes usable beyond 500 operations without replaying evicted history',async()=>{
 const f=fixture();const g=authorizeLab({roots:[root],write:true,...f,isCurrent:()=>true});const info=(await g.query('describe')).data;
 let first;
 for(let n=0;n<510;n++){
  const r=req('upload',{destination:{...info.locations[0],key:info.writePrefix+n},content:'x'});if(!first)first=r;
  const job=(await g.query('execute',r)).data;assert.equal(job?.state,'completed',JSON.stringify(job));
 }
 assert.equal((await g.query('execute',first)).error.code,'IDEMPOTENCY_HISTORY_EXPIRED');assert.equal(f.puts,510);
});
test('revocation during Worker preflight prevents mutation; wrong binding never reaches Worker',async()=>{
 let active=true,uploads=0;
 const settings={bindings:[{type:'r2_bucket',name:'STORAGE',bucket_name:'test-1-new'}]};
 const getProfiles=async()=>[{type:'cloudflare-r2',accountId:'a',bucketName:'test-1-new',workerUrl:'https://lab.account.workers.dev',scriptName:'lab',token:'SECRET'}];
 const request=async p=>Response.json({result:p.endsWith('/settings')?settings:{subdomain:'account'}});
 const create=laboratoryCreate({getProfiles,request,fetcher:async(url,options)=>{
  if(options.headers['x-redown-action'])uploads++;
  active=false;return Response.json({ok:true,labConditionalCreate:true,labMaxBytes:65536,storageBound:true});
 }});
 await assert.rejects(create(root,new Uint8Array(),{isActive:()=>active}),{code:'AUTHORIZATION_DENIED'});assert.equal(uploads,0);
 const bad=laboratoryCreate({getProfiles,request:async p=>Response.json({result:p.endsWith('/settings')?{bindings:[{type:'r2_bucket',name:'STORAGE',bucket_name:'unrelated'}]}:{subdomain:'account'}}),fetcher:()=>{throw Error('must not reach Worker');}});
 await assert.rejects(bad(root,new Uint8Array()),{code:'LAB_WORKER_BINDING_MISMATCH'});
});
