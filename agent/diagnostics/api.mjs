// One offline entrance to existing project knowledge and Explorer evidence. Never executes a plan.
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import map from './project-map.json' with {type:'json'};
import smoke from '../explorer/smoke-presets.json' with {type:'json'};
import {createExplorerAPI} from '../explorer/api.mjs';
const methods=['describe','getProjectMap','getReleaseReadiness','getVerificationStatus','getTestPlan','explainOperation','inspectFailure','getOperationTrace','diagnoseOperation','getRecentFailures','validateArchitecture'];
const fields={describe:[],getProjectMap:[],getReleaseReadiness:[],getVerificationStatus:[],getTestPlan:['preset'],explainOperation:['name'],inspectFailure:['code'],getOperationTrace:['id'],diagnoseOperation:['id'],getRecentFailures:[],validateArchitecture:[]};
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
export function createDiagnosticAPI({bundle}={}){
 if(bundle&&Buffer.byteLength(JSON.stringify(bundle))>262144)throw Error('BUNDLE_TOO_LARGE');
 const explorer=createExplorerAPI({bundle});
 const envelope=(state,data,error)=>structuredClone({diagnosticApiVersion:'1.0.0',state,scope:'offline/read-only; repository knowledge and imported observations',...(data===undefined?{}:{data}),...(error?{error:{code:error}}:{})});
 return {query(operation='describe',input={}){
  if(!methods.includes(operation))return envelope('failed',undefined,'UNSUPPORTED_OPERATION');
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!fields[operation].includes(k))||fields[operation].some(k=>typeof input[k]!=='string'||!input[k]||input[k].length>160))return envelope('failed',undefined,'INVALID_INPUT');
  if(operation==='describe')return envelope('available',{operations:methods,execution:false,liveAccess:false,namespaces:map.namespaces,limits:{bundleBytes:262144},unsupported:['automatic repair','arbitrary commands','live browser inspection','complete project call graph','release certification']});
  if(operation==='getProjectMap'){
   const subsystems=map.subsystems.map(s=>{try{const source=read(s.entry);return {...s,source:{state:'present',sha256:createHash('sha256').update(source).digest('hex')},testCoverage:s.tests.length?'listed local presets; results unknown':'no dedicated preset catalogued'};}catch{return {...s,source:{state:'unavailable'}};}});
   return envelope('partial',{...map,subsystems,authority:'current file existence/digests and curated navigation; not behavior verification'});
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
  const target=operation==='inspectFailure'?'getFailureDependencies':operation;
  const result=explorer.query(target,input);
  return envelope(result.state,{namespace:'explorer',result,evidenceBoundary:bundle?'Imported redacted observations; not authenticated live truth':'No runtime bundle supplied; project knowledge alone cannot diagnose a live failure'});
 }};
}
