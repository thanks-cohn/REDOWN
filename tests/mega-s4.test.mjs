import test from 'node:test';
import {createProviderRouter} from '../extension/beta/provider-router.mjs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createS3Adapter,megaEndpoint,MEGA_MAX_BYTES} from '../extension/beta/s3-adapter.mjs';
import {createFileApi} from '../extension/beta/file-api.mjs';
const dom=new JSDOM();
function fixture(){
 const objects=new Map(),calls=[];let corrupt=false,failWrite=false;
 const adapter=createS3Adapter({parseXML:t=>new dom.window.DOMParser().parseFromString(t,'application/xml'),fetch:async req=>{
  if(req instanceof URL)return new Response(new Uint8Array([1,2,3]));
  calls.push(req);assert.match(req.headers.get('authorization'),/^AWS4-HMAC-SHA256 /);assert.equal(req.redirect,'error');
  const u=new URL(req.url),k=decodeURIComponent(u.pathname.slice('/test/'.length));
  if(u.pathname==='/')return new Response('<ListAllMyBucketsResult><Buckets><Bucket><Name>test</Name></Bucket></Buckets></ListAllMyBucketsResult>');
  if(u.searchParams.has('list-type'))return new Response('<ListBucketResult><CommonPrefixes><Prefix>folder/</Prefix></CommonPrefixes><Contents><Key>hello.txt</Key><Size>3</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>');
  if(req.method==='HEAD')return objects.has(k)?new Response(null,{headers:{'content-length':objects.get(k).length}}):new Response(null,{status:404});
  if(req.method==='PUT'){assert.equal(req.headers.get('if-none-match'),'*');if(objects.has(k))return new Response(null,{status:412});objects.set(k,new Uint8Array(await req.arrayBuffer()));if(failWrite)throw Error('secret response must never escape');return new Response(null);}
  if(req.method==='DELETE'){objects.delete(k);return new Response(null,{status:204});}
  return new Response(corrupt?new Uint8Array([9]):objects.get(k));
 }});
 const api=createFileApi(adapter);
 return {api,calls,objects,setCorrupt:()=>corrupt=true,setFailWrite:()=>failWrite=true,async connect(){const r=await api.run('connect',{endpoint:'https://s3.ca-vancouver-1.megas4.com',accessKeyId:'synthetic-id',secretAccessKey:'synthetic-secret'});assert.equal(r.state,'completed');const a=await api.run('accounts');const id=a.data.accounts[0].id;return {provider:'mega-s4',connectionId:id,accountId:id,bucketName:'test',prefix:''};}};
}
test('MEGA endpoint rejects credentials, foreign hosts and paths',()=>{for(const u of ['http://s3.x.megas4.com','https://secret@ s3.x.megas4.com','https://evil.example','https://s3.x.megas4.com/?secret=x','https://s3.x.megas4.com/path'])assert.throws(()=>megaEndpoint(u));});
test('real adapter signing, delimiter listing, exact bytes, keep-both and explicit delete',async()=>{const f=fixture(),source=await f.connect();const list=await f.api.run('list',{source});assert.deepEqual(list.data.entries.map(x=>x.key),['folder/','hello.txt']);const file=new Blob(['abc']);let r=await f.api.run('upload',{source,key:'a.txt',file});assert.equal(r.data.verified,true);r=await f.api.run('upload',{source,key:'a.txt',file});assert.equal(r.data.key,'a (1).txt');assert.equal((await f.api.run('delete',{source,entries:[{key:'a.txt'}]})).state,'completed');assert.equal((await f.api.run('stat',{source,key:'a.txt'})).data.object,null);});
test('wrong provider/connection cannot dispatch any request; unsupported operations fail closed',async()=>{const f=fixture(),source=await f.connect(),count=f.calls.length;for(const altered of [{provider:'r2'},{accountId:'other'},{connectionId:'other'},{bucketName:'other'}])assert.equal((await f.api.run('list',{source:{...source,...altered}})).state,'failed');assert.equal(f.calls.length,count);assert.equal((await f.api.run('move',{source})).state,'failed');});
test('ambiguous writes and failed readback are uncertain and never replayed',async()=>{for(const mode of ['setFailWrite','setCorrupt']){const f=fixture(),source=await f.connect();f[mode]();const r=await f.api.run('upload',{source,key:'a',file:new Blob(['abc'])});assert.equal(r.state,'uncertain');assert.equal(f.calls.filter(r=>r.method==='PUT').length,1);assert(!JSON.stringify(r).includes('secret response'));}});
test('disconnect and oversized uploads block dispatch',async()=>{const f=fixture(),source=await f.connect();const before=f.calls.length;assert.equal((await f.api.run('upload',{source,key:'large',file:{size:MEGA_MAX_BYTES+1}})).state,'failed');assert.equal(f.calls.length,before);await f.api.run('disconnect');assert.equal((await f.api.run('list',{source})).state,'failed');assert.equal(f.calls.length,before);});


test('provider router fences explicit identities and batches before invoking either transport',async()=>{let calls=0;const provider={run:async()=>{calls++;return {state:'completed'};},batch:async()=>{calls++;return {state:'completed'};}};const router=createProviderRouter({r2:provider,'mega-s4':provider});assert.equal((await router.run('list',{source:{provider:'mega-s4'}})).state,'failed');assert.equal((await router.batch('copy',[{source:{provider:'mega-s4'}}])).state,'partial');assert.equal(calls,0);router.select('mega-s4');assert.equal((await router.run('list',{source:{provider:'mega-s4'}})).state,'completed');assert.equal((await router.run('copy',{source:{provider:'mega-s4'},destination:{provider:'r2'}})).state,'failed');assert.equal(calls,1);});


test('remote acquisition uses the same conditional writer and byte verification without provenance headers',async()=>{const f=fixture(),source=await f.connect();const r=await f.api.run('remoteIngest',{destination:source,url:'https://source.example/file',filename:'remote.bin'});assert.equal(r.state,'completed');assert.equal(r.data.verified,true);assert.deepEqual([...f.objects.get('remote.bin')],[1,2,3]);const put=f.calls.find(r=>r.method==='PUT');assert(![...put.headers].some(([k,v])=>/referer|source|page/i.test(k)||v.includes('source.example')));});
