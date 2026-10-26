import test from 'node:test';import assert from 'node:assert/strict';
import {diagnostic,validDiagnostic,completeness,otlpTrace,responseDiagnostic,goldenSignals} from '../extension/file-engine/diagnostics.mjs';
import {extensionR2Adapter} from '../extension/file-engine/adapters/extension-r2.mjs';
import {authorizeLab} from '../extension/lab-session.mjs';
import {laboratoryCreate,laboratoryDoctor} from '../extension/lab-worker.mjs';
const root={provider:'extension-r2',account:'fixture',container:'test-1-new',key:''};
const profile={type:'cloudflare-r2',accountId:'fixture',bucketName:'test-1-new',scriptName:'lab',workerUrl:'https://lab.account.workers.dev',token:'DO_NOT_EXPORT_SECRET'};
function deps(override={}){return {getProfiles:async()=>[profile],request:async(path,options={})=>path.includes('/objects?')?Response.json({result:[]}):path.includes('/objects/')?new Response(null,{status:404}):Response.json({result:path.endsWith('/settings')?{bindings:[{name:'STORAGE',type:'r2_bucket',bucket_name:'test-1-new'}]}:{subdomain:'account'}}),fetcher:async()=>Response.json({ok:true,labConditionalCreate:true,labMaxBytes:65536,storageBound:true,workerVersion:6}),...override};}
test('diagnostic schema, privacy negative controls, OTLP context and completeness invariants',async()=>{
 const d=diagnostic('PROVIDER_BAD_REQUEST',{stage:'object.stat',httpStatus:400,nativeCode:10021});assert.ok(validDiagnostic(d));assert.equal(completeness(d).state,'PASS');
 for(const bad of [{...d,headers:{authorization:'SECRET'}},{...d,actionableRecovery:'secret/private/key'},{...d,traceId:'0'.repeat(32)},{...d,nativeCode:'Bearer SECRET'},{...d,httpStatus:'403'}])assert.equal(validDiagnostic(bad),false,JSON.stringify(bad));
 assert.equal(completeness({...d,code:'PROVIDER_ERROR'}).state,'FAIL');assert.equal(completeness({...d,mutationPhase:'INDETERMINATE',retrySafety:'SAFE_WITH_FRESH_ID'}).state,'FAIL');
 const otlp=otlpTrace(d,12);assert.equal(otlp.resourceSpans[0].scopeSpans[0].spans[0].traceId,d.traceId);
 assert.deepEqual(goldenSignals([{status:'FAIL',seconds:.1},{status:'INDETERMINATE',seconds:.2}]).latencyMs,[100,200]);
});
for(const status of [400,401,403,404,405,409,429,500,503])test(`native HTTP ${status} survives without provider message or secret`,async()=>{
 const e=await responseDiagnostic(Response.json({errors:[{code:10021,message:'Bearer SECRET /private/key'}]},{status,headers:{'cf-ray':'0123456789abcdef-ORD'}}),{stage:'object.stat',method:'HEAD'});
 assert.ok(validDiagnostic(e.diagnostic));assert.equal(e.diagnostic.httpStatus,status);assert.equal(e.diagnostic.nativeCode,'10021');assert.equal(e.diagnostic.mutationPhase,'NOT_SUBMITTED');assert.ok(!JSON.stringify(e.diagnostic).includes('SECRET'));assert.ok(!JSON.stringify(e.diagnostic).includes('private/key'));
});
test('proven old HEAD failure is avoided with documented exact-prefix metadata, no object write/read body',async()=>{
 const calls=[];const a=extensionR2Adapter({roots:[root],request:async(path,o={})=>{calls.push(o.method||'GET');if(o.method==='HEAD')return new Response(null,{status:405});return Response.json({result:[{key:'existing',size:9000000000,etag:'"r1"'}]});}});
 const meta=await a.stat({...root,key:'existing'});assert.equal(meta.size,9000000000);assert.equal(meta.revision,'r1');assert.deepEqual(calls,['GET']);
});
test('first existence failure preserves native provenance through coordinator, evidence and Atlas',async()=>{
 let creates=0;const g=authorizeLab({roots:[root],write:true,isCurrent:()=>true,createObject:()=>{creates++;},request:async()=>Response.json({errors:[{code:10021,message:'SECRET'}]},{status:400})});
 const info=(await g.query('describe')).data;
 const job=(await g.query('execute',{request:{apiVersion:'0.3.0',operation:'upload',destination:{...info.locations[0],key:info.writePrefix+'hello.bin'},content:'eight',idempotencyKey:'diagnostic-test'}})).data;
 assert.equal(job.error,'PROVIDER_BAD_REQUEST');assert.equal(job.state,'failed');assert.equal(creates,0);assert.equal(job.diagnostic.httpStatus,400);assert.equal(job.diagnostic.operationId,job.id);assert.equal(job.diagnostic.mutationPhase,'NOT_SUBMITTED');
 const evidence=(await g.query('evidence',{id:job.id})).data;assert.deepEqual(evidence.diagnostic,job.diagnostic);
 const trace=(await g.query('resources',{id:job.id,metric:'getTrace'})).data.data;assert.equal(trace.operationId,job.id);assert.ok(trace.spans.some(s=>s.error==='PROVIDER_BAD_REQUEST'));assert.ok(!JSON.stringify(evidence).includes('SECRET'));
});
test('Doctor read-only stages isolate old HEAD, Worker capability and lost acknowledgement without mutation',async()=>{
 let mutations=0;const d=deps({request:async(p,o={})=>p.includes('/objects?')?Response.json({result:[]}):p.includes('/objects/')?new Response(null,{status:o.method==='HEAD'?405:404}):Response.json({result:p.endsWith('/settings')?{bindings:[{name:'STORAGE',type:'r2_bucket',bucket_name:'test-1-new'}]}:{subdomain:'account'}}),fetcher:async(_,o)=>{if(o.headers['x-redown-action'])mutations++;return Response.json({ok:true,labConditionalCreate:true,labMaxBytes:65536,storageBound:true,workerVersion:6});}});
 const report=await laboratoryDoctor(d)(root);assert.equal(mutations,0);assert.equal(report.steps[0].diagnostic.code,'PROVIDER_METHOD_UNSUPPORTED');assert.equal(report.steps[1].httpStatus,404);assert.equal(report.mutationPhase,'NOT_SUBMITTED');assert.ok(!JSON.stringify(report).includes(profile.token));
 const lost=laboratoryCreate(deps({fetcher:async(_,o)=>{if(o.headers['x-redown-action'])throw Error('SECRET');return Response.json({ok:true,labConditionalCreate:true,labMaxBytes:65536,storageBound:true});}}));
 await assert.rejects(lost({...root,key:'x'},new Uint8Array(8)),e=>e.diagnostic.mutationPhase==='INDETERMINATE'&&e.code==='WRITE_UNCERTAIN');
});
for(const fault of ['profile','host','binding','jurisdiction','capability','non-json','network','timeout'])test(`Doctor isolates ${fault} before submission`,async()=>{
 const d=deps();if(fault==='profile')d.getProfiles=async()=>[];
 if(fault==='host')d.getProfiles=async()=>[{...profile,workerUrl:'https://attacker.invalid'}];
 if(['binding','jurisdiction'].includes(fault))d.request=async p=>p.includes('/objects?')?Response.json({result:[]}):p.includes('/objects/')?new Response(null,{status:404}):Response.json({result:p.endsWith('/settings')?{bindings:[{name:'STORAGE',type:'r2_bucket',bucket_name:fault==='binding'?'unrelated':'test-1-new',jurisdiction:fault==='jurisdiction'?'eu':'default'}]}:{subdomain:'account'}});
 if(fault==='capability')d.fetcher=async()=>Response.json({ok:true});
 if(fault==='non-json')d.fetcher=async()=>new Response('<private>');
 if(['network','timeout'].includes(fault))d.fetcher=async()=>{throw Object.assign(Error('SECRET'),{name:fault==='timeout'?'TimeoutError':'TypeError'});};
 const report=await laboratoryDoctor(d)(root);assert.equal(report.status,'FAIL');assert.ok(report.steps.some(s=>s.status==='FAIL'));assert.ok(!JSON.stringify(report).includes(profile.token));assert.ok(report.steps.filter(s=>s.diagnostic).every(s=>validDiagnostic(s.diagnostic)));
});

// No provider-specific Doctor/SDK rewrite is needed to preserve the same envelope.
for(const provider of ['drive-fixture','local-fixture','s3-fixture'])test(`generic coordinator preserves ${provider} diagnostics`,async()=>{
 const {createFileEngine}=await import('../extension/file-engine/engine.mjs');
 const {errorWithDiagnostic}=await import('../extension/file-engine/diagnostics.mjs');
 const state={jobs:[],objects:[],dedupe:{}};const store={read:async()=>structuredClone(state),update:async fn=>fn(state)};
 const adapter={id:provider,capabilities:{realProvider:false,atomicCreate:false},assertIdentity(){},async stat(){throw errorWithDiagnostic('PROVIDER_PERMISSION_DENIED',{stage:'object.stat',provider,nativeCode:10000});}};
 const engine=createFileEngine({store,adapters:[adapter],authorize:()=>true});
 const job=await engine.run({apiVersion:'0.3.0',operation:'metadata',source:{provider,account:'fixture',container:'fixture',key:'hidden'},idempotencyKey:crypto.randomUUID()});
 assert.equal(job.diagnostic.provider,provider);assert.equal(job.diagnostic.nativeCode,'10000');assert.equal(job.diagnostic.mutationPhase,'NOT_SUBMITTED');assert.equal((await engine.exportEvidence(job.id)).diagnostic.operationId,job.id);
});

test('published Doctor schema accepts actual probe output and rejects secret fields',async()=>{
 const {default:Ajv}=await import('ajv/dist/2020.js');const {default:formats}=await import('ajv-formats');const {readFileSync}=await import('node:fs');
 const ajv=new Ajv({strict:false});formats(ajv);const validate=ajv.compile(JSON.parse(readFileSync('extension/file-engine/doctor.schema.json')));
 const report=await laboratoryDoctor(deps())(root);assert.ok(validate(report),JSON.stringify(validate.errors));assert.equal(validate({...report,authorization:'Bearer SECRET'}),false);
});
