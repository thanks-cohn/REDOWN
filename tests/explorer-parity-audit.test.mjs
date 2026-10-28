// Audit characterization only: no network, Chrome, credentials or large payloads.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createR2Adapter} from '../extension/beta/r2-adapter.mjs';
import {createFileApi,key} from '../extension/beta/file-api.mjs';
const source={accountId:'audit',bucketName:'fixture',prefix:''};
const sizes=[0,1,1024,1048576,16777216,104857600,299999999,300000000,300000001,1073741824,5368709120,1099511627776];
test('audit: local upload gate routes through 300,000,000 inclusive; larger metadata fails before HTTP',async()=>{
  for(const size of sizes){let calls=0;
    const api=createFileApi(createR2Adapter({http:{request:async()=>{calls++;throw Error('AUDIT_STOP_BEFORE_NETWORK');}}}));
    const r=await api.run('upload',{source,file:{size},key:'fixture.bin'});
    assert.equal(r.state,'failed');assert.equal(calls,size>300000000?0:1);
    assert.match(r.error,size>300000000?/300 MB/:/AUDIT_STOP/);
  }
});
test('audit: inspect 16 MiB boundary checks actual streamed bytes; above metadata budget never reads body',async()=>{
  for(const size of [0,1,16777215,16777216,16777217]){
    let bodies=0;const object={key:'fixture.bin',size,etag:'fixed',version:'v1',uploaded:'2026-10-28'};
    const adapter=createR2Adapter({http:{request:async path=>{
      if(path.includes('?'))return Response.json({success:true,result:{objects:[object]}});
      bodies++;return new Response(new Uint8Array(size));
    }}});
    if(size>16777216){await assert.rejects(adapter.inspect({source,key:object.key}),/16 MiB/);assert.equal(bodies,0);}
    else{const r=await adapter.inspect({source,key:object.key});assert.equal(r.object.size,size);assert.match(r.sha256,/^[a-f0-9]{64}$/);assert.equal(bodies,1);}
  }
});
test('audit: inspect rejects lying metadata once actual stream crosses budget',async()=>{
  const adapter=createR2Adapter({http:{request:async path=>path.includes('?')?Response.json({result:{objects:[{key:'x',size:1}]}}):new Response(new Uint8Array(16777217))}});
  await assert.rejects(adapter.inspect({source,key:'x'}),/checking budget/);
});
test('audit: ordinary copy, download and remote ingest do not inherit inspect/upload gates',async()=>{
  const messages=[];const adapter=createR2Adapter({send:async m=>{messages.push(m);return {ok:true};},http:{download:async(s,k,n,done)=>{done({state:'complete'});return 1;}}});
  for(const size of sizes){await adapter.copy({source,destination:{...source,prefix:'dest/'},entries:[{key:'x',size}]},{});const r=await adapter.download({source,entry:{key:'x',size}},{});assert.equal(r.downloadState,'complete');}
  await adapter.remoteIngest({destination:source,url:'https://example.invalid/large'},{});
  assert.equal(messages.filter(m=>m.type==='cfTransferObjects').length,sizes.length);
  assert.equal(messages.at(-1).type,'ingest');assert.equal(messages.at(-1).betaNoProvision,true);
});
test('audit: preview rejects above configured memory budget and text truncates independently',async()=>{
  for(const size of [63,64,65]){const adapter=createR2Adapter({http:{request:async()=>new Response(new Uint8Array(size),{headers:{'content-length':String(size)}})}});
    if(size>64)await assert.rejects(adapter.preview({source,entry:{key:'x.png'}},{previewMaxBytes:64}),/memory budget/);
    else{const r=await adapter.preview({source,entry:{key:'x.png'}},{previewMaxBytes:64});assert.equal(r.size,size);URL.revokeObjectURL(r.url);}}
  const adapter=createR2Adapter({http:{request:async()=>new Response(new Uint8Array(65))}});
  const r=await adapter.preview({source,entry:{key:'x.txt'}},{previewMaxBytes:64,textPreviewMaxBytes:32});assert.equal(r.size,32);assert.equal(r.truncated,true);URL.revokeObjectURL(r.url);
});
test('audit: exact UTF-8 key budget inclusive, path policy narrower than general R2 keys',()=>{
  assert.equal(key('a'.repeat(1024)).length,1024);assert.throws(()=>key('a'.repeat(1025)),/Invalid object path/);
  assert.equal(key('雪'.repeat(341)+'a').length,342);assert.throws(()=>key('雪'.repeat(342)),/Invalid object path/);
  assert.throws(()=>key('a/../b'));assert.throws(()=>key('a'+String.fromCharCode(92)+'b'));
});
