// Explicit opt-in live test. Never prints credentials, URLs or server bodies.
import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {AwsClient} from '../extension/vendor/aws4fetch/aws4fetch.mjs';
import {createS3Adapter} from '../extension/beta/s3-adapter.mjs';
import {createFileApi} from '../extension/beta/file-api.mjs';
const dom=new JSDOM(),api=createFileApi(createS3Adapter({parseXML:t=>new dom.window.DOMParser().parseFromString(t,'application/xml')}));
async function run(op,input,options={}){const r=await api.run(op,input,options);if(r.state!=='completed')throw Error(op+': '+r.state+' '+(r.code||'UNCONFIRMED'));return r.data;}
try{
 await run('connect',{endpoint:process.env.MEGA_S4_ENDPOINT,accessKeyId:process.env.MEGA_S4_ACCESS_KEY_ID,secretAccessKey:process.env.MEGA_S4_SECRET_ACCESS_KEY,region:process.env.MEGA_S4_REGION});
 const {accounts}=await run('accounts',{}),accountId=accounts[0].id;
 const {buckets}=await run('buckets',{accountId});assert(buckets.some(b=>b.name==='test'));
 const source={provider:'mega-s4',connectionId:accountId,accountId,bucketName:'test',prefix:''};
 await run('list',{source});console.log('PASS: adapter authentication, bucket discovery, delimiter listing');
 if(process.argv.includes('--approved-disposable-write')){
  const key='__redown_mega_test__/'+crypto.randomUUID()+'/probe.bin';
  const bytes=crypto.getRandomValues(new Uint8Array(1025)),file=new Blob([bytes]);
  const folderSource={...source,prefix:key.slice(0,key.lastIndexOf('/')+1)};
  await run('mkdir',{source:folderSource,name:'empty'});assert.equal((await run('list',{source:{...folderSource,prefix:folderSource.prefix+'empty/'}})).folderExists,true);
  await run('delete',{source,entries:[{key:folderSource.prefix+'empty/',folder:false}]});
  console.log('PASS: zero-byte folder marker, empty-folder listing and marker cleanup');
  const receipt=await run('upload',{source,key,file,conflict:'keep'});assert.equal(receipt.key,key);assert.equal(receipt.verified,true);
  const chunks=[];await run('readStream',{source,key},{onChunk:c=>chunks.push(c)});
  assert.deepEqual(new Uint8Array(await new Blob(chunks).arrayBuffer()),bytes);
  console.log('PASS: conditional upload and independent exact-byte readback');
  const signer=new AwsClient({accessKeyId:process.env.MEGA_S4_ACCESS_KEY_ID,secretAccessKey:process.env.MEGA_S4_SECRET_ACCESS_KEY,service:'s3',region:process.env.MEGA_S4_REGION,retries:0});
  const endpoint=process.env.MEGA_S4_ENDPOINT;
  const url=new URL((endpoint.includes('://')?endpoint:'https://'+endpoint).replace(/\/$/,'')+'/test/'+key);url.searchParams.set('X-Amz-Expires','60');
  const signed=await signer.sign(url,{method:'GET',aws:{signQuery:true}});
  const remote=await run('remoteIngest',{destination:{...source,prefix:key.slice(0,key.lastIndexOf('/')+1)},url:signed.url,filename:'remote.bin'});
  assert.equal(remote.verified,true);assert.equal(remote.size,bytes.length);
  await run('delete',{source,entries:[{key:remote.key,folder:false}]});assert.equal((await run('stat',{source,key:remote.key})).object,null);
  console.log('PASS: no-disk remote source acquisition, destination byte verification and cleanup');
  await run('delete',{source,entries:[{key,folder:false}]});assert.equal((await run('stat',{source,key})).object,null);
  console.log('PASS: delete of new test object and independent absence check');
 }
}catch(e){console.error('FAIL:',/^[\w :.-]+$/.test(e.message)?e.message:'SANITIZED_TEST_FAILURE');process.exitCode=1;}
finally{await api.run('disconnect');dom.window.close();}
