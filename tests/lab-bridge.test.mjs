import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createBridge} from '../tools/lab/bridge.mjs';
import {executeCommand} from '../extension/beta/lab.mjs';
import {createFileApi} from '../extension/beta/file-api.mjs';
import {fixture} from './helpers/beta-provider.mjs';
const extensionId='a'.repeat(32),token='local-test-secret-'.repeat(3),origin='chrome-extension://'+extensionId;
const scope={accountId:'fixture-account',bucketName:'disposable-fixture',prefix:'redown-test-lab/local-integration/'};
async function server(t,options={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'redown-lab-'));
  const s=createBridge({root,token,extensionId,...options});await new Promise(r=>s.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+s.address().port;
  const request=(route,opts={})=>fetch(base+route,{...opts,headers:{authorization:'Bearer '+token,origin,...opts.headers}});
  t.after(async()=>{s.closeAllConnections();await new Promise(r=>s.close(r));fs.rmSync(root,{recursive:true,force:true});});
  return {root,s,base,request};
}
async function python(args,env={}){return new Promise(resolve=>{const p=spawn('python',['tools/lab/redown_lab.py',...args],{env:{...process.env,REDOWN_LAB_TOKEN:token,...env}});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('exit',code=>resolve({code,out,err}));});}
test('loopback authentication, origin, version, extension-only polling boundaries',async t=>{
  const b=await server(t);
  assert.equal((await fetch(b.base+'/health')).status,401);
  assert.equal((await b.request('/health',{headers:{origin:'https://evil.invalid'}})).status,403);
  assert.equal((await fetch(b.base+'/next',{headers:{authorization:'Bearer '+token}})).status,403);
  await b.request('/next');
  assert.equal((await b.request('/command',{method:'POST',body:JSON.stringify({schema_version:'bad',command_id:'x',operation:'list'})})).status,400);
});
test('deadline reports uncertain completion without replay; expired queued command is not dispatched',async t=>{
  const b=await server(t,{timeoutMs:30});await b.request('/next');
  const r=await b.request('/command',{method:'POST',body:JSON.stringify({schema_version:'1.0',command_id:'timeout',operation:'upload'})});
  assert.equal(r.status,504);assert.equal((await r.json()).state,'uncertain');
  assert.equal((await(await b.request('/next')).json()).command,null);
});
test('scope and unsupported operation rejection happens before API dispatch',async()=>{
  let calls=0;const api={run(){calls++;},version:1,capabilities:[]};
  for(const input of [{source:scope,key:'outside/a'}, {source:{...scope,bucketName:'other'},key:scope.prefix+'a'}, {source:scope,entries:[{key:scope.prefix+'a',destinationKey:'outside/b'}]}]){
    const r=await executeCommand({schema_version:'1.0',command_id:'c',operation:'upload',scope,input},{api});assert.equal(r.state,'failed');
  }
  assert.equal(calls,0);
  assert.equal((await executeCommand({schema_version:'1.0',command_id:'c',operation:'prepareBucket',scope},{api})).code,'UNSUPPORTED_OPERATION');
});
test('streaming API preserves binary/empty bytes, rejects missing objects, respects cancellation',async()=>{
  const f=await fixture();
  for(const bytes of [Buffer.alloc(0),Buffer.from([0,255,1,128])]){
    await f.bucket.put(scope.prefix+'stream',bytes);const chunks=[];
    const r=await f.api.run('readStream',{source:scope,key:scope.prefix+'stream'},{onChunk:c=>chunks.push(Buffer.from(c))});
    assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(r.data.size,bytes.length);assert.deepEqual(Buffer.concat(chunks),bytes);assert.ok(chunks.length);
  }
  assert.equal((await f.api.run('readStream',{source:scope,key:scope.prefix+'missing'},{onChunk(){}})).state,'failed');
  const c=new AbortController();c.abort();assert.equal((await f.api.run('readStream',{source:scope,key:scope.prefix+'stream'},{signal:c.signal,onChunk(){}})).state,'cancelled');
});
test('Python -> real HTTP bridge -> extension dispatcher -> production API/adapter/background/Worker, local provider only',async t=>{
  const b=await server(t),f=await fixture();const corpus=path.join(b.root,'fixtures');fs.mkdirSync(corpus);
  fs.writeFileSync(path.join(corpus,'binary.bin'),Buffer.from([0,255,5,0,128]));fs.writeFileSync(path.join(corpus,'empty.txt'),'');
  const plan={provider:'cloudflare-r2',accountId:scope.accountId,bucketName:scope.bucketName,destination:scope.prefix,corpus,files:['binary.bin','empty.txt'],operations:['upload','download','copy','rename','move','delete'],max_files:2,max_bytes:100};
  const planPath=path.join(b.root,'plan.json'),out=path.join(b.root,'evidence');fs.writeFileSync(planPath,JSON.stringify(plan));
  let active=true;const pump=(async()=>{while(active){const {command}=await(await b.request('/next')).json();if(command){const result=await executeCommand(command,{api:f.api,request:b.request});await b.request('/result',{method:'POST',body:JSON.stringify(result)});}else await new Promise(r=>setTimeout(r,5));}})();
  await new Promise(r=>setTimeout(r,10));
  const result=await python(['--port',String(b.s.address().port),'run','--plan',planPath,'--out',out]);active=false;await pump;
  assert.equal(result.code,0,result.err+result.out);const report=JSON.parse(result.out);assert.equal(report.counts.PASS,12);assert.equal(report.executed,12);assert.equal(report.fixtures_unchanged,true);
  for(const name of ['summary.json','results.csv','journal.jsonl','before.json','after.json','diff.json','summary.md'])assert.ok(fs.existsSync(path.join(out,name)),name);
  assert.ok([...f.stored.keys()].every(k=>k.startsWith(scope.prefix)));assert.ok(![...f.stored.keys()].some(k=>k.includes('_staging/')));
  const journal=fs.readFileSync(path.join(out,'journal.jsonl'),'utf8');assert.ok(!journal.includes('fixture-secret'));assert.ok(!journal.includes(token));
});
test('disk-backed upload interface streams into storage, passes File to existing adapter, removes spool',async()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');let removed=false,writes=0;const chunks=[];
  const directory={getFileHandle:async()=>({createWritable:async()=>new WritableStream({write(c){chunks.push(c);writes++;}}),getFile:async()=>new File(chunks,'spooled')}),removeEntry:async()=>{removed=true;}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{getDirectory:async()=>directory}}});
  try{
    const f=await fixture(),bytes=Buffer.from([255,0,6,128]);
    const response=new Response(new ReadableStream({start(c){c.enqueue(bytes.subarray(0,2));c.enqueue(bytes.subarray(2));c.close();}}),{headers:{'content-length':String(bytes.length)}});
    const r=await executeCommand({schema_version:'1.0',command_id:'spool',operation:'upload',scope,input:{source:scope,key:scope.prefix+'spooled',local_path:'/approved/file'}},{api:f.api,request:async()=>response});
    assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(writes,2);assert.equal(removed,true);assert.deepEqual(f.stored.get(scope.prefix+'spooled').bytes,bytes);assert.ok([...f.stored.keys()].every(k=>k.startsWith(scope.prefix)));
  }finally{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;}
});
test('normative schema publishes wire version, operations and all verification verdicts',async()=>{
  const schema=JSON.parse(fs.readFileSync('tools/lab/protocol.schema.json','utf8'));
  assert.deepEqual(schema.$defs.verification.properties.verdict.enum,['PASS','FAIL','UNSUPPORTED','BLOCKED','TIMEOUT','UNVERIFIED']);
  assert.ok(schema.$defs.command.properties.operation.enum.includes('readStream'));
  assert.equal(schema.$defs.command.properties.schema_version.const,'1.0');
});
test('approved filesystem root and sink chunk sequence are enforced by transport',async t=>{
  const b=await server(t);await b.request('/next');
  const outside=b.root+'-outside.bin';fs.writeFileSync(outside,'private');t.after(()=>fs.rmSync(outside,{force:true}));
  const command={schema_version:'1.0',command_id:'escape',operation:'upload',scope,input:{local_path:outside}};
  const pending=b.request('/command',{method:'POST',body:JSON.stringify(command)});await new Promise(r=>setTimeout(r,5));
  assert.equal((await(await b.request('/next')).json()).command.command_id,'escape');
  assert.equal((await b.request('/file?id=escape')).status,400);
  await b.request('/result',{method:'POST',body:JSON.stringify({schema_version:'1.0',command_id:'escape',state:'failed'})});await pending;
  const p=b.request('/command',{method:'POST',body:JSON.stringify({...command,command_id:'chunks',operation:'readStream'})});await new Promise(r=>setTimeout(r,5));await b.request('/next');
  assert.equal((await b.request('/sink?id=chunks&sequence=1',{method:'POST',body:'bad'})).status,409);
  assert.equal((await b.request('/sink?id=chunks&sequence=0',{method:'POST',body:'bytes'})).status,200);
  assert.equal((await b.request('/sink?id=chunks&sequence=0',{method:'POST',body:'duplicate'})).status,409);
  await b.request('/result',{method:'POST',body:JSON.stringify({schema_version:'1.0',command_id:'chunks',state:'completed',data:{size:5}})});
  const r=await(await p).json();assert.equal(fs.readFileSync(r.download_path,'utf8'),'bytes');assert.equal(r.bytes_received,5);
});
