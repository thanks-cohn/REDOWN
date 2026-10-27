import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {authorizeLab} from '../extension/lab-session.mjs';
import {laboratoryCreateStream} from '../extension/lab-worker.mjs';
import {createStreamSpool} from '../extension/file-engine/stream-spool.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const root={provider:'extension-r2',account:'a',container:'test-1-new',key:''};
function directory(){const files=new Map();return {files,async getFileHandle(name){let chunks=[];files.set(name,chunks);return {async createWritable(){return {async write(bytes){chunks.push(bytes.slice());},async close(){},async abort(){}};},async getFile(){return new Blob(chunks);}};},async removeEntry(name){files.delete(name);}};}
async function worker(){const background=await readFile('extension/background.js','utf8');const match=background.match(/const WORKER_SOURCE = `([\s\S]*?)`;\r?\n\r?\nfunction/);const source=Function(`return \`${match[1]}\``)().replace('__REDOWN_SHARED_SECRET__','test-secret');return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;}
function bucket(){const objects=new Map(),uploads=new Map();const object=(key,bytes)=>({key,size:bytes.length,etag:digest(bytes),httpMetadata:{contentType:'application/octet-stream'},body:new Blob([bytes]).stream()});const api={objects,uploads,
 async head(key){const bytes=objects.get(key);return bytes?object(key,bytes):null;},
 async get(key){return api.head(key);},
 async put(key,source,options){const bytes=new Uint8Array(await new Response(source).arrayBuffer());if(options.onlyIf?.get('if-none-match')==='*'&&objects.has(key))return null;objects.set(key,bytes);return object(key,bytes);},
 async delete(key){objects.delete(key);},
 async createMultipartUpload(key){const id=crypto.randomUUID();uploads.set(id,{key,parts:new Map()});return {uploadId:id};},
 resumeMultipartUpload(key,id){const upload=uploads.get(id);assert.equal(upload.key,key);return {async uploadPart(n,source){const bytes=new Uint8Array(await new Response(source).arrayBuffer());upload.parts.set(n,bytes);return {partNumber:n,etag:digest(bytes)};},async complete(parts){const chunks=parts.map(p=>{const bytes=upload.parts.get(p.partNumber);assert.equal(p.etag,digest(bytes));return bytes;});const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());objects.set(key,bytes);uploads.delete(id);return object(key,bytes);}};}
 };return api;}
function transport(handler,storage){return {getProfiles:async()=>[{type:'cloudflare-r2',accountId:'a',bucketName:'test-1-new',workerUrl:'https://lab.account.workers.dev',scriptName:'lab',token:'test-secret'}],request:async path=>Response.json({result:path.endsWith('/settings')?{bindings:[{type:'r2_bucket',name:'STORAGE',bucket_name:'test-1-new'}]}:{subdomain:'account'}}),fetcher:(url,options)=>handler.fetch(new Request(url,options),{STORAGE:storage})};}
test('existing embedded Worker multipart route conditionally publishes and cleans only its staging object',async()=>{
 const storage=bucket(),handler=await worker(),create=laboratoryCreateStream(transport(handler,storage));
 const bytes=Uint8Array.from({length:9*1024*1024+7},(_,i)=>i%251),identity={...root,key:'__redown_test__/'+crypto.randomUUID()+'/file'};let checkpoints=0;
 await create(identity,(async function*(){for(let i=0;i<bytes.length;i+=65536)yield bytes.subarray(i,i+65536);})(),{size:bytes.length,onCheckpoint:()=>{checkpoints++;}});
 assert.equal(checkpoints,2);assert.equal(storage.objects.size,1);assert.equal(digest(storage.objects.get(identity.key)),digest(bytes));
 await assert.rejects(create(identity,(async function*(){yield bytes;})(),{size:bytes.length}),{code:'CONFLICT'});
 assert.equal(storage.objects.size,1);
});
test('multipart interruption retains checkpoint and does not publish truncated input',async()=>{
 const storage=bucket(),handler=await worker(),create=laboratoryCreateStream(transport(handler,storage));let checkpoint;
 const identity={...root,key:'__redown_test__/'+crypto.randomUUID()+'/file'};
 await assert.rejects(create(identity,(async function*(){yield new Uint8Array(8*1024*1024);})(),{size:9*1024*1024,onCheckpoint:p=>{checkpoint=p;}}),{code:'TRUNCATED_READ'});
 assert.equal(checkpoint.parts.length,1);assert.equal(storage.objects.has(identity.key),false);
});
test('extension session spools bounded frames, executes canonical upload asynchronously, streams readback',async()=>{
 const dir=directory(),objects=new Map(),bytes=Uint8Array.from({length:2*1024*1024+1},(_,i)=>i%251);
 const createObject=async()=>{throw Error('legacy path must not execute');};
 const grant=authorizeLab({roots:[root],write:true,isCurrent:()=>true,getStreamDirectory:async()=>dir,createObject,
  createStream:async(i,source)=>{const chunks=[];for await(const chunk of source)chunks.push(chunk.slice());objects.set(i.key,new Uint8Array(await new Blob(chunks).arrayBuffer()));},
  request:async(path)=>{if(path.includes('?')){const prefix=new URL('https://fixture'+path).searchParams.get('prefix');return Response.json({result:[...objects].filter(([key])=>key.startsWith(prefix)).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,Number(new URL('https://fixture'+path).searchParams.get('per_page'))||50).map(([key,b])=>({key,size:b.length,etag:digest(b)}))});}const key=path.split('/objects/')[1].split('/').map(decodeURIComponent).join('/'),data=objects.get(key);return data?new Response(data,{headers:{etag:digest(data),'content-length':String(data.length)}}):new Response(null,{status:404});}});
 const query=async(method,input={})=>{const response=await grant.query(method,input);assert.equal(response.state,'available',JSON.stringify(response));return response.data;};
 const info=await query('describe');assert.equal(info.limits.streaming,true);const destination={...info.locations[0],key:info.writePrefix+'file'};
 const opened=await query('streamOpen',{mode:'upload',size:bytes.length,sha256:digest(bytes)});
 for(let i=0;i<bytes.length;i+=262144)await query('streamAppend',{id:opened.id,offset:i,bytesBase64:Buffer.from(bytes.subarray(i,i+262144)).toString('base64')});
 await query('streamSeal',{id:opened.id});
 await query('streamExecute',{request:{apiVersion:'0.3.0',operation:'upload',idempotencyKey:crypto.randomUUID(),destination,transfer:{size:bytes.length,sha256:digest(bytes)}}});
 let status;do{await new Promise(r=>setImmediate(r));status=await query('streamStatus');}while(status.pending);
 assert.equal(status.response.data.state,'completed',JSON.stringify(status));assert.equal(status.response.data.checkpoints[0].sha256,digest(bytes));
 await query('streamClose',{id:opened.id});
 const copied={...destination,key:destination.key+'-copy'};
 await query('streamExecute',{request:{apiVersion:'0.3.0',operation:'copy',idempotencyKey:crypto.randomUUID(),source:destination,destination:copied}});
 do{await new Promise(r=>setImmediate(r));status=await query('streamStatus');}while(status.pending);
 assert.equal(status.response.data.state,'completed',JSON.stringify(status));
 assert.equal(digest(objects.get(copied.key)),digest(bytes));
 assert.equal(digest(objects.get(destination.key)),digest(bytes));
 const read=await query('streamOpen',{mode:'read',size:bytes.length,sha256:null});
 const response=await query('execute',{request:{apiVersion:'0.3.0',operation:'read',idempotencyKey:crypto.randomUUID(),source:destination,transfer:{size:bytes.length}}});assert.equal(response.state,'completed');
 const hash=createHash('sha256');let count=0,part;do{part=await query('streamPull',{id:read.id,offset:count});const chunk=Buffer.from(part.bytesBase64,'base64');hash.update(chunk);count+=chunk.length;}while(!part.done);
 assert.equal(count,bytes.length);assert.equal(hash.digest('hex'),digest(bytes));await query('streamClose',{id:read.id});assert.equal(dir.files.size,0);
 grant.revoke();assert.equal((await grant.query('streamOpen')).error.code,'AUTHORIZATION_REVOKED');
});
test('spool rejects wrong offsets, unsealed source, oversize frames and changed source hashes',async()=>{
 const spool=createStreamSpool({getDirectory:async()=>directory()});const opened=await spool.query('streamOpen',{mode:'upload',size:2,sha256:digest(new Uint8Array(2))});
 await assert.rejects(spool.resolve({operation:'upload',transfer:{size:2,sha256:digest(new Uint8Array(2))}}),{code:'STREAM_NOT_SEALED'});
 await assert.rejects(spool.query('streamAppend',{id:opened.id,offset:1,bytesBase64:'AAA='}),{code:'INVALID_INPUT'});
 await spool.query('streamAppend',{id:opened.id,offset:0,bytesBase64:'AQI='});
 await assert.rejects(spool.query('streamSeal',{id:opened.id}),{code:'VERIFICATION_DISAGREEMENT'});await spool.clear();
});
