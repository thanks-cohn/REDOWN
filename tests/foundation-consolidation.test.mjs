import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {compileDiagnosticSchema} from '../scripts/compile-diagnostic-schema.mjs';
import {diagnostic,validDiagnostic,responseDiagnostic} from '../extension/file-engine/diagnostics.mjs';
import {createFileEngine} from '../extension/file-engine/engine.mjs';
import {createFileSession} from '../agent/files/api.mjs';
import {localReferenceAdapter} from '../extension/file-engine/adapters/local-reference.mjs';
import {memoryAdapter} from '../extension/file-engine/adapters/memory.mjs';
import {initialState} from '../extension/file-engine/simulation.mjs';

test('one generator owns JS/Python schema artifacts and detects every stale distribution',async()=>{
 const root=await mkdtemp(join(tmpdir(),'redown-schema-owner-'));
 try{
  await mkdir(join(root,'extension/file-engine'),{recursive:true});await mkdir(join(root,'clients/python/redown'),{recursive:true});
  for(const file of ['diagnostic.schema.json','doctor.schema.json'])await copyFile('extension/file-engine/'+file,join(root,'extension/file-engine',file));
  const artifacts=await compileDiagnosticSchema({root});assert.equal(artifacts.length,4);await compileDiagnosticSchema({root,check:true});
  for(const artifact of artifacts){
   await writeFile(join(root,artifact),(await readFile(join(root,artifact),'utf8'))+'\n');
   await assert.rejects(compileDiagnosticSchema({root,check:true}),/DIAGNOSTIC_ARTIFACT_DRIFT/);
   await compileDiagnosticSchema({root});
  }
 }finally{await rm(root,{recursive:true,force:true});}
});

test('JS, packaged Python and independent JSON Schema agree on causal/privacy mutations',()=>{
 const base=diagnostic('PROVIDER_BAD_REQUEST',{stage:'object.stat',httpStatus:400,nativeCode:10021});
 const cause=diagnostic('NETWORK_FAILURE',{stage:'object.read'});
 const cases=[base,{...base,causes:[cause]},{...base,causes:[{...cause,causes:[cause]}]},
  {...base,authorization:'secret'}, {...base,traceId:'0'.repeat(32)}, {...base,httpStatus:true},
  {...base,nativeCode:'١٠٠٢١'}, {...base,nativeCode:'SECRET'}, {...base,causes:[{...cause,headers:{authorization:'secret'}}]},
  {...base,missingEvidence:['secret/path']},{...base,code:'UNREGISTERED'}, {...base,eventId:'f'.repeat(32)}];
 const expected=cases.map(validDiagnostic);
 const code=`import json,sys\nfrom redown.diagnostics import check_payload,SCHEMA\nfrom jsonschema import Draft202012Validator,FormatChecker\nv=Draft202012Validator(SCHEMA,format_checker=FormatChecker())\nrows=json.load(sys.stdin)\ndef native(row):\n try: check_payload({'diagnostic':row}); return True\n except ValueError: return False\nprint(json.dumps({'python':[native(r) for r in rows],'standard':[v.is_valid(r) for r in rows]}))`;
 const run=spawnSync('python',['-c',code],{input:JSON.stringify(cases),encoding:'utf8',env:{...process.env,PYTHONPATH:resolve('clients/python')},timeout:15000});
 assert.equal(run.status,0,run.stderr);const actual=JSON.parse(run.stdout);assert.deepEqual(actual.python,expected);assert.deepEqual(actual.standard,expected);
});

test('shared HTTP diagnostics do not decode Cloudflare headers/body or require R2',async()=>{
 const r=Response.json({errors:[{code:10021,message:'private'}]},{status:403,headers:{'cf-ray':'0123456789abcdef-ORD'}});
 const error=await responseDiagnostic(r,{provider:'local-reference',stage:'object.stat'});
 assert.equal(error.diagnostic.provider,'local-reference');assert.equal(error.diagnostic.nativeCode,null);assert.equal(error.diagnostic.requestId,null);assert.equal(r.bodyUsed,false);await r.body.cancel();
});

function health(provider){return {schemaVersion:'redown.doctor.v1',status:'PASS',readOnly:true,mutationPhase:'NOT_SUBMITTED',provider,steps:[{stage:'provider.list',status:'PASS'}],liveWriteAcceptance:'NOT_TESTED'};}
async function sessionFor(adapter,root,probe){
 const state=initialState();const store={read:async()=>structuredClone(state),update:async fn=>fn(state)};
 let active=true;const engine=createFileEngine({store,adapters:[adapter],authorize:()=>active});
 const session=createFileSession({engine,scope:{operations:['list','metadata','read'],locations:[root],maxOperations:10},probe});
 return {session,revoke:()=>{active=false;}};
}

test('provider-neutral fake Doctor uses the same facade and cannot bypass authorization',async()=>{
 const state=initialState();const store={read:async()=>structuredClone(state),update:async fn=>fn(state)};const adapter=memoryAdapter(store,'neutral-reference');
 const root={provider:adapter.id,account:'demo',container:'sandbox',key:''};let report=health(adapter.id),calls=0;
 const f=await sessionFor(adapter,root,async()=>{calls++;return report;});
 assert.ok((await f.session.query('describe')).data.methods.includes('doctor'));
 assert.equal((await f.session.query('doctor')).data.status,'PASS');
 assert.equal((await f.session.query('doctor',{rootIndex:1})).error.code,'INVALID_INPUT');
 assert.equal((await f.session.query('doctor',{url:'https://unapproved.invalid'})).error.code,'INVALID_INPUT');
 report={...health(adapter.id),steps:[{stage:'provider.list',status:'FAIL'}]};
 assert.equal((await f.session.query('doctor')).error.code,'DIAGNOSTICS_LOST');
 f.revoke();assert.equal((await f.session.query('doctor')).error.code,'AUTHORIZATION_DENIED');assert.equal(calls,2);
 const unsupported=await sessionFor(adapter,root);assert.ok(!(await unsupported.session.query('describe')).data.methods.includes('doctor'));
 assert.equal((await unsupported.session.query('doctor')).error.code,'PROVIDER_OPERATION_UNSUPPORTED');
});

test('independent real local filesystem Doctor needs no Worker, bucket, OAuth or core edits',{skip:process.platform!=='linux'},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'redown-local-doctor-'));
 try{
  await writeFile(join(directory,'source.bin'),Buffer.from([0,255,1]));const adapter=await localReferenceAdapter(directory);
  const root={provider:adapter.id,account:'owner',container:'sandbox',key:''};
  const f=await sessionFor(adapter,root,async(identity,{operation})=>{
   assert.equal(operation,'upload');const rows=await adapter.list(identity,{limit:1});assert.equal(rows.objects.length,1);return health(adapter.id);
  });
  const result=await f.session.query('doctor',{operation:'upload'});assert.equal(result.data.status,'PASS');assert.equal(result.data.provider,adapter.id);
  assert.deepEqual(await readFile(join(directory,'source.bin')),Buffer.from([0,255,1]));
  const denied=await f.session.query('execute',{request:{apiVersion:'0.3.0',operation:'upload',idempotencyKey:'no-write-grant',destination:{...root,key:'not-created'},content:'unsafe'}});
  assert.equal(denied.error.code,'AUTHORIZATION_DENIED');
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('R2-only unsupported health operations remain behind the provider boundary',async()=>{
 const {laboratoryDoctor}=await import('../extension/lab-worker.mjs');
 const result=await laboratoryDoctor({request:()=>{throw Error('No probe permitted');},getProfiles:()=>{throw Error('No probe permitted');}})({provider:'extension-r2'},{operation:'delete'});
 assert.equal(result.status,'UNSUPPORTED');assert.equal(result.mutationPhase,'NOT_SUBMITTED');
});
