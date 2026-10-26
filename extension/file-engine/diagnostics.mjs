import canonicalCodes from './diagnostic-codes.mjs';
import validateDiagnostic from './diagnostic-validator.mjs';
// Local, provider-neutral error contract. Never copy messages, URLs, headers or bodies.
export const DIAGNOSTIC_VERSION='redown.diagnostic.v1';
const stable=v=>canonicalCodes.includes(v)?v:'DIAGNOSTICS_LOST';
const id=()=>crypto.randomUUID().replaceAll('-','');
export function traceContext(operationId){
 const candidate=String(operationId||'').replaceAll('-','');
 const traceId=/^[a-f0-9]{32}$/.test(candidate)&&!/^0+$/.test(candidate)?candidate:id();
 const spanId=id().slice(0,16);return {traceId,spanId,traceparent:`00-${traceId}-${spanId}-01`};
}
export function diagnostic(code,{component='coordinator',stage='execution',operation='unknown',provider='unknown',operationId=null,mutationPhase='NOT_SUBMITTED',httpStatus=null,nativeCode=null,requestId=null,method=null,causes=[],context}={}){
 const c=context||traceContext(operationId);
 const safeCause=causes.filter(validDiagnostic).slice(0,3).map(x=>({...x,causes:[]}));
 return {schemaVersion:DIAGNOSTIC_VERSION,eventId:crypto.randomUUID(),timestamp:new Date().toISOString(),traceId:c.traceId,spanId:c.spanId,parentSpanId:null,
 operationId:/^[a-f0-9-]{36}$/.test(operationId||'')?operationId:null,component,stage,operation,provider,
 severity:'ERROR',outcome:mutationPhase==='INDETERMINATE'?'INDETERMINATE':'FAIL',code:stable(code),nativeCode:/^\d{3,8}$/.test(String(nativeCode??''))?String(nativeCode):null,
 httpStatus:Number.isInteger(httpStatus)&&httpStatus>=100&&httpStatus<=599?httpStatus:null,
 requestId:/^[a-f0-9]{16,32}(?:-[A-Z]{3,5})?$/.test(requestId||'')?requestId:null,method:['GET','HEAD','POST','PUT','DELETE'].includes(method)?method:null,
 mutationPhase,retrySafety:mutationPhase==='NOT_SUBMITTED'?'SAFE_WITH_FRESH_ID':mutationPhase==='SUBMITTED_REJECTED'?'DO_NOT_RETRY':'RECONCILE_FIRST',
 causes:safeCause,evidenceRefs:[],actionableRecovery:mutationPhase==='NOT_SUBMITTED'?'Inspect read-only Doctor before any write':'Inspect persisted state independently; never replay an ambiguous write',
 confidence:'OBSERVED',missingEvidence:[],redactionVersion:'allowlist-1',dataSensitivity:'REDACTED'};
}
export function validDiagnostic(d){return !!d && validateDiagnostic(d) && JSON.stringify(d).length<=16384;}
export function errorWithDiagnostic(code,details){const d=diagnostic(code,details);return Object.assign(Error(d.code),{code:d.code,diagnostic:d});}
export async function responseDiagnostic(response,{stage,method='GET',mutationPhase='NOT_SUBMITTED',provider='extension-r2',context}={}){
 // Responses may contain private paths/messages. Only numeric native codes are retained.
 let nativeCode=null;const reader=response.body?.getReader();let bytes=0,chunks=[];
 if(reader)try{while(bytes<8192){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192)break;chunks.push(value);}
 if(bytes<=8192){const data=new Uint8Array(bytes);let n=0;for(const c of chunks){data.set(c,n);n+=c.length;}try{const body=JSON.parse(new TextDecoder().decode(data));nativeCode=body.errors?.[0]?.code;}catch{}}}finally{await reader.cancel().catch(()=>{});}
 const code=({400:'PROVIDER_BAD_REQUEST',401:'SESSION_EXPIRED',403:'PROVIDER_PERMISSION_DENIED',404:'PROVIDER_NOT_FOUND',405:'PROVIDER_METHOD_UNSUPPORTED',409:'CONFLICT',429:'RATE_LIMITED'})[response.status]||(response.status>=500?'PROVIDER_SERVICE_ERROR':'INVALID_PROVIDER_RESPONSE');
 return errorWithDiagnostic(code,{component:'provider-adapter',stage,provider,method,mutationPhase,httpStatus:response.status,nativeCode,requestId:response.headers?.get('cf-ray'),context});
}
export function diagnosticFrom(error,details={}){
 if(error?.diagnostic && !validDiagnostic(error.diagnostic))return diagnostic('DIAGNOSTICS_LOST',details);
 if(validDiagnostic(error?.diagnostic))return {...error.diagnostic,...(details.operationId?{operationId:details.operationId}:{}),...(details.context?{traceId:details.context.traceId}:{}),operation:details.operation||error.diagnostic.operation};
 return diagnostic(error?.code||'DIAGNOSTICS_LOST',details);
}
export function completeness(d){
 const issues=[];if(!validDiagnostic(d))issues.push('INVALID_DIAGNOSTIC');
 if(d?.code==='PROVIDER_ERROR'||d?.code==='DIAGNOSTICS_LOST')issues.push('MISSING_NATIVE_PROVENANCE');
 if(d?.mutationPhase==='VERIFIED'&&d?.outcome!=='PASS')issues.push('FALSE_VERIFIED_OUTCOME');
 if(d?.mutationPhase==='INDETERMINATE'&&d?.retrySafety==='SAFE_WITH_FRESH_ID')issues.push('UNSAFE_RETRY');
 return {state:issues.length?'FAIL':'PASS',issues};
}
export function otlpTrace(d,durationMs=0){
 if(!validDiagnostic(d))throw Error('INVALID_DIAGNOSTIC');
 const end=BigInt(Date.parse(d.timestamp))*1000000n,start=end-BigInt(Math.round(Math.max(0,durationMs)*1e6));
 return {resourceSpans:[{resource:{attributes:[{key:'service.name',value:{stringValue:'redown'}}]},scopeSpans:[{scope:{name:'redown.diagnostics',version:'1'},spans:[{traceId:d.traceId,spanId:d.spanId,name:d.operation+'.'+d.stage,kind:1,startTimeUnixNano:String(start),endTimeUnixNano:String(end),attributes:[{key:'error.type',value:{stringValue:d.code}},{key:'redown.mutation.phase',value:{stringValue:d.mutationPhase}}],status:{code:2,message:d.code}}]}]}]};
}
export function goldenSignals(rows){return {latencyMs:rows.map(x=>x.seconds*1000).filter(Number.isFinite),traffic:rows.length,errors:rows.filter(x=>x.status==='FAIL').length,blocked:rows.filter(x=>x.status==='BLOCKED').length,serviceErrors:rows.filter(x=>x.diagnostic?.httpStatus>=500||['NETWORK_FAILURE','TIMEOUT'].includes(x.diagnostic?.code)).length,providerDenials:rows.filter(x=>[401,403].includes(x.diagnostic?.httpStatus)).length,indeterminate:rows.filter(x=>x.status==='INDETERMINATE').length,saturation:{state:'UNKNOWN'},labels:['operation','status'],scope:'local operation outcomes; no remote telemetry export'};}
