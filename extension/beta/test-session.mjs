// Evidence model for the real Explorer. No transport or cloud mutations here.
export const SCHEMA='redown.guided-testing.results.v1';
export const SPEC_COMMIT=null; // Working specification version is authoritative; historical exports retain their pinned commit.
export const WRITES=new Set(['upload','mkdir','copy','move','rename','delete','remoteIngest','createBucket','prepareBucket','extractArchiveEntry']);
export const IMPLEMENTED=Array.from({length:13},(_,i)=>i+1);
export function validateMatrix(m){
  if(m?.schema!=='redown.guided-testing.master.v1'||m.version!=='2.0.0'||m.exercises?.length!==60)throw Error('Test It requires the authoritative 60-exercise matrix.');
  m.exercises.forEach((e,i)=>{if(e.id!==`S01-${String(i+1).padStart(3,'0')}`||e.order!==i+1||!e.expected?.verification_method||!e.interaction?.method||!Array.isArray(e.prerequisites)||!e.safety||!e.title||!e.instruction||!e.interaction.target||!e.required_logical_objects?.length||!e.backup_requirements||!e.recovery_instructions||!e.mandatory_evidence_fields?.length)throw Error('Invalid exercise definition at '+(i+1));});const seen=new Set();for(const e of m.exercises){if(e.prerequisites.some(id=>!seen.has(id)))throw Error('Invalid prerequisite for '+e.id);seen.add(e.id);}return m;
}
export function createRedactor(){
  const privateValues=new Set();
  const remember=value=>{if(typeof value==='string'&&value)privateValues.add(value);};
  const text=value=>{let s=String(value??'');for(const v of [...privateValues].sort((a,b)=>b.length-a.length))s=s.split(v).join('[private]');return s.replace(/(?:https?:\/\/|blob:|data:)[^\s"'<>]+/gi,'[URL]').replace(/Bearer\s+\S+/gi,'Bearer [redacted]').replace(/((?:authorization|(?:access_|refresh_)?token|secret|password|credential|signature|api[_-]?key)\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,'$1[redacted]').slice(0,1500);};
  // Deliberately project diagnostic fields, never serialize arbitrary provider payloads.
  function response(value){if(!value||typeof value!=='object')return null;const out={};
    for(const k of ['ok','success','code','state','completed','workerVersion'])if(['boolean','number','string'].includes(typeof value[k]))out[k]=typeof value[k]==='string'?text(value[k]):value[k];
    for(const k of ['error','message'])if(typeof value[k]==='string')out[k]=text(value[k]);
    if(Array.isArray(value.errors))out.errors=value.errors.slice(0,40).map(e=>typeof e==='string'?{message:text(e)}:{code:typeof e?.code==='number'?e.code:text(e?.code),message:text(e?.message||e?.error)});
    if(value.diagnosticError)out.diagnosticError=response(value.diagnosticError);
    const r=value.result??value;if(Array.isArray(r.objects))out.object_count=r.objects.length;if(Array.isArray(r.delimited))out.folder_count=r.delimited.length;
    out.omitted_fields='Private identifiers, object names, credentials and payloads are excluded.';return out;
  }
  return {remember,text,response};
}
const clock=()=>({monotonic_ms:performance.now(),utc:new Date().toISOString()});
export function latency(record){
  const t=record.timing,first=record.requests.find(r=>r.kind==='http'),delta=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)?b-a:null;
  return {action_to_dispatch:delta(t.action?.monotonic_ms,first?.dispatch?.monotonic_ms),request_to_response:delta(first?.dispatch?.monotonic_ms,first?.headers?.monotonic_ms),response_processing:delta(first?.headers?.monotonic_ms,first?.processed?.monotonic_ms),request_to_processed:delta(first?.dispatch?.monotonic_ms,first?.processed?.monotonic_ms),action_to_visible_result:delta(t.action?.monotonic_ms,t.visible?.monotonic_ms),action_to_verified_result:delta(t.action?.monotonic_ms,t.verified?.monotonic_ms),verification_request:delta(t.verification_start?.monotonic_ms,t.verified?.monotonic_ms),overall_transfer:null,throughput_mib_s:null};
}
export function createSession(matrix,{version='unknown',now=clock}={}){
  validateMatrix(matrix);const started=new Date().toISOString(),redact=createRedactor();
  const session={schema:SCHEMA,schema_version:'1.0.0',redown_version:version,session_id:'S01-'+crypto.randomUUID(),started_at:started,updated_at:started,environment:{user_agent:globalThis.navigator?.userAgent||'Node fixture',timing_origin:'actual performance.now instrumentation; browser document lifetime'},master:{schema:matrix.schema,version:matrix.version,commit:SPEC_COMMIT,path:'docs/beta/REDOWN-COMPREHENSIVE-INTERACTION-TEST-MATRIX.json'},index:0,paused:true,state:{mutations_enabled:false,approved_scope:null,manifest:[],cleanup:'Practice setup may create protected and working objects. Exercise mutations and automatic cleanup are disabled.'},records:matrix.exercises.map(e=>({exercise_id:e.id,session_id:null,definition_version:matrix.version,feature:e.title,interaction:e.interaction.method,required_user_action:e.instruction,actual_observed_state:null,error_and_cancellation:null,expected:e.expected,observed:{gui_event_detected:false,provider_operation_detected:false},status:'NOT_TESTED',reason:null,disposition:null,evidence_origin:'NOT_OBSERVED',evidence:[],ui_events:[],operations:[],requests:[],timing:{action:null,visible:null,verified:null,verification_start:null},verification:{independently_verified:false,source:null},backup_verification:null,latency_ms:{},unavailable_measurements:['No correlated request observed yet.'],timestamp:null})),known_limitations:['Partial runtime: supported exercise IDs are listed in coverage.','Exercise mutations are disabled during Test It, including Pause. Only explicitly consented setup uploads are permitted.','Background IPC responses are application evidence, not raw provider HTTP responses.','Direct HTTP capture currently covers listing/stat paths only; internal retries are unavailable.','Previously running operations are not cancelled or attributed to Test It.','No disk SHA-256, exercise-mutation readback, archive manifest, rendered-media or live-provider acceptance is claimed; setup alone verifies fresh remote fixture SHA-256.','Visible-result timing records DOM state observed on an animation frame, not physical display scanout.','Cross-document elapsed times are never calculated.']};
  session.records.forEach(r=>r.session_id=session.session_id);
  function current(){return session.records[session.index];}
  function action(event){const r=current();if(r.status==='PASSED')return;r.timing.action??=now();r.timestamp??=r.timing.action.utc;r.ui_events.push({...event,...now()});r.observed.gui_event_detected=true;r.evidence_origin='RUNTIME_INSTRUMENTATION';r.status='UNCERTAIN';r.reason='Action observed; required verification is pending.';}
  function finish(r,checks,source){if(!r.observed.gui_event_detected)throw Error('Cannot verify an exercise without its GUI action.');r.timing.verified=now();r.actual_observed_state={checks,source};r.verification={checks,independently_verified:Object.values(checks).length>0&&Object.values(checks).every(v=>v===true),source};r.status=r.verification.independently_verified?'PASSED':'FAILED';r.reason=r.status==='PASSED'?null:'Observed state did not satisfy the exercise.';r.latency_ms=latency(r);}
  function transport(context,event){if(!context)return;const r=session.records.find(r=>r.exercise_id===context.exercise_id);if(!r)return;let q=r.requests.find(r=>r.request_id===event.request_id);
    if(event.kind.endsWith('dispatch')){q={request_id:event.request_id,operation_id:context.operation_id,exercise_id:r.exercise_id,kind:event.kind.startsWith('http')?'http':'background_ipc',method:event.method||null,endpoint_redacted:event.kind.startsWith('http')?'/accounts/[private]/r2/buckets/[private]/objects':null,message_type:event.message_type||null,dispatch:{monotonic_ms:event.monotonic_ms,utc:event.utc},headers:null,processed:null,http_status:null,provider_code:null,provider_error_codes:[],duration_ms:null,response_redacted:null,error:null,cancelled:false,timeout:false,retry_attempt:null,transferred_bytes:null,outcome_confirmed:false,verification:context.verification===true};r.requests.push(q);}
    if(!q)return;
    const stamp={monotonic_ms:event.monotonic_ms,utc:event.utc};
    if(event.kind==='http-headers'){q.headers=stamp;q.http_status=event.http_status;r.observed.provider_operation_detected=true;}
    if(['http-body','ipc-response'].includes(event.kind)){q.processed=stamp;q.response_redacted=redact.response(event.response);q.provider_code=event.kind==='http-body'?(event.response?.errors?.[0]?.code??event.response?.code??null):null;q.provider_error_codes=event.kind==='http-body'?(event.response?.errors||[]).map(e=>typeof e?.code==='number'?e.code:redact.text(e?.code)):[];q.outcome_confirmed=event.kind==='http-body'&&q.http_status>=200&&q.http_status<300&&event.response?.success!==false;}
    if(event.kind==='http-error'||event.kind==='ipc-error'){q.processed=stamp;q.error=redact.text(event.error);q.cancelled=event.cancelled;q.timeout=event.timeout;}
    if(q.processed)q.duration_ms=q.processed.monotonic_ms-q.dispatch.monotonic_ms;
    r.latency_ms=latency(r);
  }
  function exportData(){session.updated_at=new Date().toISOString();for(const r of session.records){r.latency_ms=latency(r);r.unavailable_measurements=['Missing milestones are null; HTTP round trip includes transport and provider delays; internal server duration is unavailable.'];}
    const counts={};for(const r of session.records)counts[r.status]=(counts[r.status]||0)+1;
    return structuredClone({...session,coverage:{counts,executable_ids:IMPLEMENTED.map(n=>`S01-${String(n).padStart(3,'0')}`),implemented_count:IMPLEMENTED.length,passed:session.records.filter(r=>r.status==='PASSED').map(r=>r.exercise_id),untested_variations:matrix.coverage_scope.dimensions,unimplemented_ids:matrix.exercises.filter(e=>!IMPLEMENTED.includes(e.order)).map(e=>e.id)},cleanup_results:session.state.cleanup,outstanding_test_objects:(session.state.practice_objects||[]).map(o=>({logical_id:o.id,key:o.key,protection:o.protection,last_verified_existence:o.verified_existence,cleanup_eligible:false})).concat((session.state.manifest||[]).filter(e=>e.recovery_key).map(e=>({key:e.recovery_key,last_verified_existence:null,cleanup_eligible:false})))});
  }
  return {session,redact,current,action,finish,transport,now,exportData};
}
