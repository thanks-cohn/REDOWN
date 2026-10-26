// Trusted extension transport. No secrets, URLs, keys or provider messages leave this module.
import { fail } from './file-engine/engine.mjs';
import {responseDiagnostic,errorWithDiagnostic,diagnosticFrom,traceContext,otlpTrace,goldenSignals} from './file-engine/diagnostics.mjs';
async function configured({getProfiles},identity){
 const profile=(await getProfiles()).find(p=>p.type==='cloudflare-r2'&&p.accountId===identity.account&&p.bucketName===identity.container);
 if(!profile?.token||!profile.workerUrl)throw fail('LAB_WORKER_NOT_CONFIGURED');
 let url;try{url=new URL(profile.workerUrl);}catch{throw fail('LAB_WORKER_NOT_CONFIGURED');}
 if(url.protocol!=='https:'||!url.hostname.endsWith('.workers.dev')||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw fail('INVALID_ENDPOINT');
 if(!profile.scriptName)throw fail('LAB_WORKER_IDENTITY_REQUIRED');return {profile,url};
}
async function jsonRead(response,stage,method='GET',context){
 if(!response.ok)throw await responseDiagnostic(response,{stage,method,context});
 try{return await response.json();}catch{throw errorWithDiagnostic('INVALID_PROVIDER_RESPONSE',{component:'worker-transport',stage,method,context});}
}
async function preflight(deps,identity,{isActive=async()=>true,context=traceContext(),steps=[]}={}){
 const check=async()=>{if(!await isActive())throw fail('AUTHORIZATION_DENIED');};
 const step=async(stage,fn)=>{await check();const started=performance.now();try{const data=await fn();steps.push({stage,status:'PASS',durationMs:performance.now()-started});return data;}catch(error){const d=diagnosticFrom(error,{component:'worker-transport',stage,context});steps.push({stage,status:'FAIL',durationMs:performance.now()-started,diagnostic:d});error.diagnostic=d;throw error;}};
 const {profile,url}=await step('validation',()=>configured(deps,identity));
 const settings=await step('worker.settings',async()=>jsonRead(await deps.request(`/accounts/${encodeURIComponent(identity.account)}/workers/scripts/${encodeURIComponent(profile.scriptName)}/settings`),'worker.settings','GET',context));
 const subdomain=await step('worker.subdomain',async()=>jsonRead(await deps.request(`/accounts/${encodeURIComponent(identity.account)}/workers/subdomain`),'worker.subdomain','GET',context));
 await step('validation',async()=>{
  const storage=((settings.result||settings).bindings||[]).find(b=>b.name==='STORAGE'&&b.type==='r2_bucket');
  if(storage?.bucket_name!==identity.container||storage.jurisdiction&&storage.jurisdiction!=='default'||url.hostname!==`${profile.scriptName}.${(subdomain.result||subdomain).subdomain}.workers.dev`)throw fail('LAB_WORKER_BINDING_MISMATCH');
 });
 const capability=await step('worker.capabilities',async()=>{
  let response;try{response=await deps.fetcher(url.href,{method:'POST',headers:{authorization:'Bearer '+profile.token,'content-type':'application/json',traceparent:context.traceparent},body:JSON.stringify({action:'capabilities'}),redirect:'error'});}catch(error){throw errorWithDiagnostic(error?.name==='TimeoutError'?'TIMEOUT':'NETWORK_FAILURE',{component:'worker-transport',stage:'worker.capabilities',method:'POST',context});}
  const info=await jsonRead(response,'worker.capabilities','POST',context);
  if(info.ok!==true||info.labConditionalCreate!==true||info.labMaxBytes!==65536||info.storageBound!==true)throw fail('LAB_WORKER_UPDATE_REQUIRED');
  return info;
 });
 return {profile,url,capability,check};
}
export function laboratoryCreate(deps){
 return async(identity,bytes,{isActive=async()=>true,traceparent}={})=>{
  let context=traceContext();
  if(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/.test(traceparent||'')){const parts=traceparent.split('-');context={traceId:parts[1],spanId:parts[2],traceparent};}
  const {profile,url,check}=await preflight(deps,identity,{isActive,context});await check();
  let response;try{response=await deps.fetcher(url.href,{method:'POST',redirect:'error',headers:{authorization:'Bearer '+profile.token,'content-type':'application/octet-stream','x-redown-action':'lab-create','x-redown-key':encodeURIComponent(identity.key),traceparent:context.traceparent},body:bytes});}
  catch{throw errorWithDiagnostic('WRITE_UNCERTAIN',{component:'worker-transport',stage:'worker.create',method:'POST',mutationPhase:'INDETERMINATE',context});}
  if(!response.ok)throw await responseDiagnostic(response,{stage:'worker.create',method:'POST',mutationPhase:response.status>=500?'INDETERMINATE':'SUBMITTED_REJECTED',context});
  let result;try{result=await response.json();}catch{throw errorWithDiagnostic('WRITE_UNCERTAIN',{component:'worker-transport',stage:'worker.create',method:'POST',mutationPhase:'ACKNOWLEDGED_UNVERIFIED',context});}
  if(result.ok!==true||result.key!==identity.key||result.size!==bytes.length||!result.etag)throw errorWithDiagnostic('WRITE_UNCERTAIN',{component:'worker-transport',stage:'write.verify',method:'POST',mutationPhase:'ACKNOWLEDGED_UNVERIFIED',context});
 };
}
export function laboratoryDoctor(deps){
 return async(identity,{isActive=async()=>true}={})=>{
  const context=traceContext();const steps=[];let capabilities=null;
  const original=deps;deps={...original,request:(path,o={})=>original.request(path,{...o,timeoutMs:4000,signal:AbortSignal.timeout(4000)}),fetcher:(url,o={})=>original.fetcher(url,{...o,timeoutMs:4000,signal:AbortSignal.timeout(4000)})};
  // Read-only probe uses a never-created random object, not any owner fixture.
  const base=`/accounts/${encodeURIComponent(identity.account)}/r2/buckets/${encodeURIComponent(identity.container)}/objects/`;
  const key=(identity.key||'__redown_test__/')+'doctor-'+crypto.randomUUID();
  for(const method of ['HEAD','GET']){
   const stage=method==='HEAD'?'object.stat':'object.read';
   if(!await isActive())throw fail('AUTHORIZATION_DENIED');
   try{const r=await deps.request(base+key.split('/').map(encodeURIComponent).join('/'),{method,redirect:'error'});
    if(r.status===404){await r.body?.cancel();steps.push({stage,method,required:method!=='HEAD',status:'PASS',httpStatus:404,observation:'Random probe absent; this is not proof of write permission'});}
    else if(!r.ok){const e=await responseDiagnostic(r,{stage,method,context});steps.push({stage,method,required:method!=='HEAD',status:'FAIL',diagnostic:e.diagnostic});}
    else{await r.body?.cancel();steps.push({stage,method,required:method!=='HEAD',status:'PASS',httpStatus:r.status,observation:'Object endpoint responded; no bytes exported'});}
   }catch(e){steps.push({stage,method,required:method!=='HEAD',status:'FAIL',diagnostic:diagnosticFrom(e,{component:'doctor',stage,context})});}
  }
  try{
    if(!await isActive())throw fail('AUTHORIZATION_DENIED');
    const q=new URLSearchParams({prefix:key,per_page:'1'});
    const r=await deps.request(base.slice(0,-1)+'?'+q,{method:'GET',redirect:'error'});
    const body=await jsonRead(r,'object.stat','GET',context);
    const rows=Array.isArray(body.result)?body.result:(body.result??body).objects;
    if(!Array.isArray(rows)||rows.length>1)throw fail('INVALID_PROVIDER_RESPONSE');
    steps.push({stage:'object.stat',method:'GET',required:true,status:'PASS',httpStatus:r.status,observation:'Documented metadata-only exact-prefix route responded; no write submitted'});
  }catch(e){steps.push({stage:'object.stat',method:'GET',required:true,status:'FAIL',diagnostic:diagnosticFrom(e,{component:'doctor',stage:'object.stat',context})});}
  try{const p=await preflight(deps,identity,{isActive,context,steps});capabilities={workerVersion:Number.isInteger(p.capability.workerVersion)?p.capability.workerVersion:null,labConditionalCreate:true,labMaxBytes:65536,storageBound:true};}catch{}
  const telemetry={otlp:{resourceSpans:steps.filter(s=>s.diagnostic).flatMap(s=>otlpTrace(s.diagnostic,s.durationMs||0).resourceSpans)},goldenSignals:goldenSignals(steps.map(s=>({status:s.status,diagnostic:s.diagnostic,seconds:Number.isFinite(s.durationMs)?s.durationMs/1000:NaN}))),compatibility:'OTLP JSON interoperability adapter; not complete OTel SDK instrumentation; no outbound export'};
  return {schemaVersion:'redown.doctor.v1',telemetry,provider:'extension-r2',traceId:context.traceId,mutationPhase:'NOT_SUBMITTED',readOnly:true,steps,capabilities,status:steps.some(s=>s.status==='FAIL'&&s.required!==false)?'FAIL':'PASS',missingEvidence:['Owner-authorized fresh write and independent byte readback'],liveWriteAcceptance:'NOT_TESTED'};
 };
}
