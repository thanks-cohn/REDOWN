// One offline entrance to existing project knowledge and Explorer evidence. Never executes a plan.
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import map from './project-map.json' with {type:'json'};
import smoke from '../explorer/smoke-presets.json' with {type:'json'};
import {createIssueInventory} from './issues.mjs';
import {createAdapters} from './adapters.mjs';
import {registry,operations,resolveOperation,validateStructure,validInput} from './registry.mjs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
export function createDiagnosticAPI({bundle,runtimeBundle}={}){
 if(bundle&&Buffer.byteLength(JSON.stringify(bundle))>262144)throw Error('BUNDLE_TOO_LARGE');
 const catalog=registry();
 if(runtimeBundle&&Buffer.byteLength(JSON.stringify(runtimeBundle))>catalog.limits.runtimeBundleBytes)throw Error('BUNDLE_TOO_LARGE');
 const adapters=createAdapters({bundle,runtimeBundle});
 const envelope=(state,data,error)=>{
  const result={diagnosticApiVersion:catalog.gatewayVersion,state,scope:'offline/read-only; repository knowledge and imported observations',...(data===undefined?{}:{data}),...(error?{error:{code:error}}:{})};
  return Buffer.byteLength(JSON.stringify(result))>catalog.limits.responseBytes?{diagnosticApiVersion:catalog.gatewayVersion,state:'failed',scope:result.scope,error:{code:'RESPONSE_TOO_LARGE'}}:structuredClone(result);
 };
 return {query(operation='describe',input={}){
  const resolved=resolveOperation(operation);
  if(resolved.error)return envelope('failed',resolved.candidates?{candidates:resolved.candidates}:undefined,resolved.error);
  if(!validInput(input,resolved.operation))return envelope('failed',undefined,'INVALID_INPUT');
  const owner=resolved.operation.namespace;
  if(owner!=='diagnostics'){
   try{
    const result=adapters.get(owner).query(resolved.operation.name,input);
    const state=result.data?.valid===false?'failed':['available','partial','unavailable','failed'].includes(result.state)?result.state:result.error||result.state==='unsupported'?'failed':result.freshness?.status==='current'?'available':'partial';
    const response=envelope(state,{namespace:owner,operation:resolved.operation.id,nativeVersion:catalog.namespaces.find(n=>n.id===owner).version,authority:resolved.operation.authority,result,evidenceBoundary:owner==='explorer'?(bundle?'Imported redacted observations; not authenticated live truth':'No runtime bundle supplied; project knowledge alone cannot diagnose a live failure'):owner==='runtime'?(runtimeBundle?'Imported passive events, re-sanitized; not a live session':'No runtime bundle supplied; passive runtime observations are unavailable'):'Repository records and source relationships; native provenance/freshness is preserved'});
    if(Buffer.byteLength(JSON.stringify(response))>catalog.limits.responseBytes)return envelope('failed',undefined,'RESPONSE_TOO_LARGE');
    return response;
   }catch{return envelope('failed',undefined,'NAMESPACE_QUERY_FAILED');}
  }
  operation=resolved.operation.name;
  if(operation==='describe')return envelope('available',{operations:operations().map(op=>op.id),aliases:catalog.aliases,execution:false,liveAccess:false,namespaces:catalog.namespaces.map(({operations,...ns})=>({...ns,operationCount:operations.length})),limits:catalog.limits,unsupported:catalog.unimplemented});
  if(operation==='listOperations'){
   const all=operations().filter(op=>!input.namespace||op.namespace===input.namespace),offset=input.offset||0,limit=input.limit??50;
   if(![catalog.gateway.id,...catalog.namespaces.map(n=>n.id)].includes(input.namespace||catalog.gateway.id)||limit<1||limit>100||offset>10000)return envelope('failed',undefined,'INVALID_INPUT');
   return envelope('available',{operations:all.slice(offset,offset+limit),total:all.length,nextOffset:offset+limit<all.length?offset+limit:null});
  }
  if(operation==='resolveOperation'){const found=resolveOperation(input.name);return found.error?envelope('failed',found.candidates?{candidates:found.candidates}:undefined,found.error):envelope('available',found);}
  if(operation==='getOwnership'){
   const owners=catalog.ownership.filter(item=>!input.subject||item.subject===input.subject);
   return owners.length?envelope('available',{owners,unimplemented:catalog.unimplemented}):envelope('unavailable',undefined,'UNKNOWN_SUBJECT');
  }
  if(operation==='getStartGuide')return envelope('available',{steps:[['Discover APIs','diagnostics.describe',{}],['Check routing/ownership','diagnostics.validateRegistry',{}],['Locate subsystem','diagnostics.getProjectMap',{}],['Review current issues','diagnostics.listIssues',{}],['Check local evidence','diagnostics.getVerificationStatus',{}],['Inspect release blockers','diagnostics.getReleaseReadiness',{}],['Choose a smoke test','diagnostics.getTestPlan',{preset:'all'}]].map(([purpose,operation,input])=>({purpose,operation,input})),runtimeEvidence:'Import the matching reviewed bundle explicitly; discovery does not connect to a live extension',forever:'No accepted purpose model or certification is claimed'});
  if(operation==='validateRegistry'){
   const audit=validateStructure();
   for(const ns of catalog.namespaces){
    try{const native=adapters.get(ns.id).query(ns.discovery==='getWorkerCompatibility'?'describeExplorer':ns.discovery,{}),advertised=native.data?.operations;
     if(native.error||native[ns.versionField]!==ns.version||!Array.isArray(advertised))audit.findings.push({code:'ADAPTER_CONTRACT_MISMATCH',namespace:ns.id});
     else{const expected=ns.operations.map(op=>op.name).concat(ns.excluded).sort();if(JSON.stringify([...advertised].sort())!==JSON.stringify(expected))audit.findings.push({code:'OPERATION_DRIFT',namespace:ns.id});}
    }catch{audit.findings.push({code:'ADAPTER_UNAVAILABLE',namespace:ns.id});}
   }
   return envelope(audit.findings.length?'failed':'available',{...audit,scope:'Registry coverage/version/ownership against native discovery; not runtime or semantic completeness'});
  }
  if(['listIssues','getIssue','validateIssues'].includes(operation)){
   const inventory=createIssueInventory({debugQuery:(operation,input)=>adapters.get('debug').query(operation,input)});
   const errors=inventory.findings.filter(f=>f.code!=='STALE_ASSESSMENT');
   if(operation==='validateIssues')return envelope(errors.length?'failed':'available',{valid:!errors.length,findings:inventory.findings,coverage:inventory.coverage,count:inventory.items.length,authority:inventory.authority});
   if(errors.length)return envelope('failed',{findings:inventory.findings,coverage:inventory.coverage},'ISSUE_INVENTORY_INVALID');
   if(operation==='getIssue'){const issue=inventory.items.find(item=>item.id===input.id);return issue?envelope('partial',{issue,authority:inventory.authority}):envelope('unavailable',undefined,'ISSUE_NOT_FOUND');}
   const sourceKinds=['bug-report','release-gate','historical-incident','explorer-incident','regression-debt','code-review'];
   const states=['open','closed','unknown'],assessments=['needs-triage','recorded-only','reported','partially-addressed','source-implemented','source-risk','needs-revalidation'],severities=['critical','high','medium','low','unknown'];
   if(input.sourceKind&&!sourceKinds.includes(input.sourceKind)||input.state&&!states.includes(input.state)||input.assessment&&!assessments.includes(input.assessment)||input.severity&&!severities.includes(input.severity)||input.limit!==undefined&&(input.limit<1||input.limit>100)||input.offset>10000)return envelope('failed',undefined,'INVALID_INPUT');
   const matches=inventory.items.filter(item=>['sourceKind','state','severity'].every(key=>!input[key]||item[key]===input[key])&&(!input.assessment||item.assessment.status===input.assessment));const offset=input.offset||0,limit=input.limit??25;
   return envelope('partial',{issues:matches.slice(offset,offset+limit),total:matches.length,nextOffset:offset+limit<matches.length?offset+limit:null,filters:{sourceKinds,states,assessments,severities},findings:inventory.findings,coverage:inventory.coverage,authority:inventory.authority});
  }
  if(operation==='getProjectMap'){
   const subsystems=map.subsystems.map(s=>{try{const source=read(s.entry);return {...s,source:{state:'present',sha256:createHash('sha256').update(source).digest('hex')},testCoverage:s.tests.length?'listed local presets; results unknown':'no dedicated preset catalogued'};}catch{return {...s,source:{state:'unavailable'}};}});
   return envelope('partial',{...map,namespaces:catalog.namespaces.map(({operations,...ns})=>ns),subsystems,authority:'current file existence/digests and curated navigation; not behavior verification'});
  }
  if(operation==='getVerificationStatus'){
   try{
    const location=new URL('../../work/reliability/latest.json',import.meta.url);if(statSync(location).size>4*1024*1024)return envelope('failed',undefined,'REPORT_TOO_LARGE');
    const report=JSON.parse(readFileSync(location,'utf8'));
    if(report.version!=='1.0.0'||!Array.isArray(report.source?.files)||!report.source.files.length||report.source.files.length>5000)return envelope('failed',undefined,'INVALID_REPORT');
    const root=realpathSync(fileURLToPath(new URL('../../',import.meta.url))),findings=[];
    for(const ref of report.source.files){
     if(typeof ref.path!=='string'||ref.path.split(/[\\/]/).includes('..')||! /^(?:(?:extension|agent|scripts|tests|schemas|local|worker|\.github)\/[a-zA-Z0-9._/-]+|package(?:-lock)?\.json)$/.test(ref.path)||! /^[a-f0-9]{64}$/.test(ref.sha256))return envelope('failed',undefined,'INVALID_REPORT');
     try{const path=realpathSync(new URL('../../'+ref.path,import.meta.url)),rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel))return envelope('failed',undefined,'INVALID_REPORT');if(createHash('sha256').update(readFileSync(path)).digest('hex')!==ref.sha256)findings.push({path:ref.path,code:'SOURCE_CHANGED'});}catch{findings.push({path:ref.path,code:'SOURCE_UNAVAILABLE'});}
    }
    return envelope('partial',{reportedState:['passed','partial','failed'].includes(report.state)?report.state:'unknown',sourceFreshness:findings.length?'stale':'recorded-files-match',findings,finishedAt:typeof report.finishedAt==='string'&&/^\d{4}-\d\d-\d\dT[0-9:.]+Z$/.test(report.finishedAt)?report.finishedAt:null,regression:{passed:Number.isSafeInteger(report.regression?.passed)?report.regression.passed:null,knownFailureCount:report.regression?.knownFailures?.length,newFailureCount:report.regression?.newFailures?.length,incomplete:report.regression?.incomplete},release:'blocked',authority:'Local report is unauthenticated evidence; freshness covers its recorded files, not omitted/untracked files or live behavior'});
   }catch{return envelope('unavailable',undefined,'VERIFICATION_REPORT_UNAVAILABLE');}
  }
  if(operation==='getReleaseReadiness'){
   const gates=JSON.parse(read('docs/runtime/release-gates.json'));
   return envelope('partial',{decisions:gates.decisions,requirements:gates.requirements,authority:'recorded release requirements; historical passes are not fresh runs',localVerificationCommand:['node','scripts/reliability-check.mjs'],releaseCheckCommand:['node','scripts/reliability-check.mjs','--strict'],installedAndLive:'not established by this offline query'});
  }
  if(operation==='getTestPlan'){
   if(!smoke.presets.some(p=>p.id===input.preset)&&input.preset!=='all')return envelope('failed',undefined,'UNKNOWN_PRESET');
   return envelope('available',{command:['node','scripts/explorer-smoke.mjs','--preset',input.preset],execution:false,evidence:'local simulated providers; never live certification'});
  }
  return envelope('failed',undefined,'UNSUPPORTED_OPERATION');
 }};
}
