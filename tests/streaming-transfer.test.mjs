import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {createFileEngine} from '../extension/file-engine/engine.mjs';
import {verifiedChunks,readVerifiedStream,hex} from '../extension/file-engine/streaming.mjs';
import {sha256} from '../extension/file-engine/vendor/sha256.mjs';
const root={provider:'fixture',account:'test',container:'test',key:''};
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture({corrupt=false,truncate=false,changed=false}={}){
 let record=null,reads=0,maxChunk=0;let journal={jobs:[],dedupe:{}};
 const adapter={id:'fixture',capabilities:{realProvider:false,atomicCreate:true,atomicConditionalDelete:false},assertIdentity(){},
  async stat(i){return record?{...i,size:record.size,revision:changed&&reads?'changed':'1'}:null;},
  async createStream(i,source,{size}){const digest=createHash('sha256');for await(const bytes of source){maxChunk=Math.max(maxChunk,bytes.length);digest.update(bytes);}record={size,sha256:digest.digest('hex')};},
  async readStream(i){reads++;return {metadata:{...i,size:record.size,revision:'1'},stream:(async function*(){let left=record.size-(truncate?1:0);while(left){const count=Math.min(65536,left),bytes=new Uint8Array(count);if(corrupt)bytes[0]=1;left-=count;yield bytes;}})()};}
 };
 const engine=createFileEngine({store:{read:async()=>structuredClone(journal),update:async fn=>fn(journal)},adapters:[adapter],authorize:()=>true});
 return {engine,get maxChunk(){return maxChunk;},get journal(){return journal;},adapter,set record(v){record=v;}};
}
function request(size,sha){return {apiVersion:'0.3.0',operation:'upload',destination:{...root,key:'file'},idempotencyKey:crypto.randomUUID(),transfer:{size,sha256:sha}};}
async function* zeros(size){for(let offset=0;offset<size;offset+=65536)yield new Uint8Array(Math.min(65536,size-offset));}
function zeroHash(size){const h=createHash('sha256');for(let offset=0;offset<size;offset+=65536)h.update(new Uint8Array(Math.min(65536,size-offset)));return h.digest('hex');}
test('canonical upload exceeds legacy limits; bounded chunks and payload-free journal',async()=>{
 const f=fixture(),size=17*1024*1024+3,expected=zeroHash(size),r=request(size,expected);
 const job=await f.engine.run(r,{transfer:{source:()=>zeros(size)}});
 assert.equal(job.state,'completed',JSON.stringify(job));assert.equal(job.result.sha256,expected);assert.equal(job.checkpoints[0].size,size);assert.ok(f.maxChunk<=65536);
 assert.ok(JSON.stringify(f.journal).length<20000);assert.equal((await f.engine.run(r)).id,job.id);
});
test('truncation, corrupt readback, source revision change and bad local digest never complete',async()=>{
 for(const fault of [{truncate:true},{corrupt:true},{changed:true},{}]){
  const f=fixture(fault),size=100000,expected=zeroHash(size);
  const job=await f.engine.run(request(size,Object.keys(fault).length?expected:'f'.repeat(64)),{transfer:{source:()=>zeros(size)}});
  assert.notEqual(job.state,'completed');assert.ok(['TRUNCATED_READ','VERIFICATION_DISAGREEMENT','SOURCE_CHANGED'].includes(job.error),job.error);assert.equal(job.recovery.replay,false);
 }
});
test('stream read sends bounded chunks to sink and checks independently computed digest',async()=>{
 const f=fixture(),size=3*1024*1024+1;f.record={size};let bytes=0;
 const r={apiVersion:'0.3.0',operation:'read',source:{...root,key:'file'},idempotencyKey:crypto.randomUUID(),transfer:{size}};
 const job=await f.engine.run(r,{transfer:{sink:chunk=>{assert.ok(chunk.length<=262144);bytes+=chunk.length;}}});
 assert.equal(job.state,'completed');assert.equal(bytes,size);assert.equal(job.result.sha256,zeroHash(size));assert.equal(job.result.bytesBase64,undefined);
});
test('incremental SHA-256 matches independent Node hashes at padding and binary boundaries',()=>{
 for(const size of [0,1,55,56,63,64,65,65535,65536,65537,2097153]){
  const bytes=Uint8Array.from({length:size},(_,i)=>i%251),hash=sha256.create();for(let i=0;i<size;i+=37)hash.update(bytes.subarray(i,i+37));
  assert.equal(hex(hash.digest()),checksum(bytes));
 }
});
test('source cancellation is propagated, and authorization is checked between chunks',async()=>{
 let closed=false,checks=0;
 async function* source(){try{yield new Uint8Array(4096);yield new Uint8Array(4096);}finally{closed=true;}}
 await assert.rejects(async()=>{for await(const _ of verifiedChunks(source(),{size:8192,check:()=>{if(++checks===2)throw Object.assign(Error(),{code:'AUTHORIZATION_DENIED'});}})){}},{code:'AUTHORIZATION_DENIED'});
 assert.equal(closed,true);
});
// Optional reproducible local corpus verification. This is not a provider test.
test('generated 200 MiB manifest independently matches incremental byte streaming',{skip:!process.env.REDOWN_CORPUS},async()=>{
 const directory=process.env.REDOWN_CORPUS,manifest=JSON.parse(await readFile(directory+'/manifest.json','utf8'));let total=0;
 for(const row of manifest.files){const path=directory+'/'+row.name;assert.equal((await stat(path)).size,row.bytes);const node=createHash('sha256'),incremental=sha256.create();let size=0;for await(const bytes of createReadStream(path,{highWaterMark:65536})){node.update(bytes);incremental.update(bytes);size+=bytes.length;}assert.equal(node.digest('hex'),row.sha256);assert.equal(hex(incremental.digest()),row.sha256);assert.equal(size,row.bytes);total+=size;}
 assert.equal(total,209715200);
});
