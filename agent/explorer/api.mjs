import '../../extension/explorer-diagnostics.js';
import model from './model.json' with {type:'json'};
import smoke from './smoke-presets.json' with {type:'json'};
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
export const createCollector=options=>globalThis.RedownExplorerDiagnostics.create({cryptoApi:webcrypto,...options});
export function createExplorerAPI({bundle}={}){
 const core=globalThis.RedownExplorerDiagnostics,collector=createCollector({context:'adapter',...(Number.isFinite(bundle?.exportedAt)?{now:()=>bundle.exportedAt}:{})});collector.setEnabled(true);if(bundle)collector.ingest(bundle);
 const envelope=(state,data,error)=>({explorerDiagnosticVersion:core.VERSION,state,...(data?{data}:{}),...(error?{error:{code:error}}:{})});
 const methods=['listSmokePresets','getSmokePlan','getConnectorCapabilities','describeExplorer','listExplorerOperations','explainOperation','getOperationTrace','getRecentFailures','diagnoseOperation','getObjectIdentityTrace','getWorkerCompatibility','getExplorerState','getFailureDependencies','findRelatedIncidents','getVerificationPlan','exportDiagnosticBundle','validateArchitecture'];
 return {query(operation,input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return envelope('failed',null,'INVALID_INPUT');
  if(!methods.includes(operation))return envelope('failed',null,'UNSUPPORTED_OPERATION');
  if(operation==='listSmokePresets')return envelope('available',smoke);
  if(operation==='getConnectorCapabilities')return envelope('available',smoke.connectors.concat([{id:'universal-file-api',state:'partial',api:JSON.parse(readFileSync(new URL('../../extension/file-engine/catalog.json',import.meta.url),'utf8')),readiness:JSON.parse(readFileSync(new URL('../../extension/file-engine/readiness.json',import.meta.url),'utf8')),execution:false,liveMutation:false,evidenceBoundary:'Read-only catalog and recorded evidence; connected execution requires a separate authorized client'}]));
  if(operation==='getSmokePlan'){const preset=smoke.presets.find(p=>p.id===input.preset);return preset?envelope('available',{...preset,command:['node','scripts/explorer-smoke.mjs','--preset',preset.id],scope:smoke.execution,remoteExecution:false}):envelope('failed',null,'UNKNOWN_SMOKE_PRESET');}
  const trace=collector.getOperationTree(input.id),all=collector.exportBundle().operations;
  if(operation==='describeExplorer')return envelope('available',{operations:methods,version:core.VERSION,limits:core.LIMITS,architecture:model,access:'offline/read-only; no execution, credentials or cloud access',unsupported:['live probing','remote execution','Forever authority','unredacted identity export']});
  if(operation==='listExplorerOperations')return envelope('available',model.operations);
  if(operation==='explainOperation'){const result=model.operations.find(op=>op.name===input.name);return result?envelope('available',result):envelope('failed',null,'UNKNOWN_OPERATION');}
  if(operation==='validateArchitecture'){
   const refs=model.operations.flatMap(op=>op.sourceRefs).concat(model.dom.map(item=>item.ref),model.stateOwners.map(item=>item.ref));
   const findings=refs.flatMap(ref=>{try{const source=readFileSync(new URL('../../'+ref.path,import.meta.url),'utf8');return !source.includes(ref.symbol)?[{code:'MISSING_ANCHOR',path:ref.path,symbol:ref.symbol}]:createHash('sha256').update(source).digest('hex')!==ref.sha256?[{code:'SOURCE_CHANGED',path:ref.path,symbol:ref.symbol}]:[];}catch{return [{code:'SOURCE_UNAVAILABLE',path:ref.path}];}});return envelope(findings.length?'partial':'available',{findings,authority:'source navigation, not runtime proof'});
  }
  if(operation==='getRecentFailures')return envelope(bundle?'available':'unavailable',all.filter(op=>['failed','unknown'].includes(op.state)).slice(-20));
  if(operation==='exportDiagnosticBundle')return envelope(bundle?'available':'unavailable',collector.exportBundle());
  if(operation==='getExplorerState')return envelope('partial',{observations:all.length,active:all.filter(op=>op.state==='running').map(op=>op.id),lastObservedState:all.flatMap(op=>op.events.filter(event=>event.stage==='state')).at(-1)||null,account:'redacted',source:'imported observations only',restart:'incomplete traces are not successful completion'});
  if(operation==='getWorkerCompatibility')return envelope('partial',{requiredSafeTransferVersion:5,requiredDiagnosticProtocol:1,expectedInstrumentedWorkerVersion:6,observations:all.flatMap(op=>op.events.filter(e=>e.workerVersion!==undefined).map(e=>({operationId:op.id,...e}))),repository:'model source refs',extensionObservations:all.map(op=>({version:op.extensionVersion,context:op.context,origin:op.origin})),installedExtension:'not independently authenticated by bundle import',packageHash:'unknown',deployedBinding:'unknown unless independently observed'});
  if(operation==='getFailureDependencies')return envelope(core.taxonomy[input.code]?'available':'unavailable',{code:core.taxonomy[input.code]?input.code:'UNKNOWN_CODE',description:core.taxonomy[input.code]?.[0],sourceRefs:model.operations.filter(op=>['copy','move','preview','download','worker.readiness'].includes(op.name)).flatMap(op=>op.sourceRefs)});
  if(operation==='findRelatedIncidents')return envelope('partial',{incidents:[{id:'EXPLORER-COPY-404-2026-10',path:'docs/explorer/COPY_404_CASE.json',relationship:input.code==='EXPLORER_HTTP_NOT_FOUND'?'matching-observation':'potential; inspect evidence',state:'open',evidence:'user-report; installed/deployed versions unknown'}],historicalDebug:'docs/debug/README.md; independent frozen namespace',foreverLinks:{status:'unknown',links:[]}});
  if(!trace)return envelope('unavailable',null,'TRACE_UNAVAILABLE');
  if(operation==='getOperationTrace')return envelope(trace.truncated?'partial':'available',trace);
  if(operation==='getObjectIdentityTrace')return envelope('partial',{operationId:trace.id,identities:trace.events.filter(e=>e.key||e.bucket||e.binding),scope:'HMAC fingerprints; compare only equal scope IDs; no reverse lookup'});
  const diagnosis=collector.diagnose(input.id);return envelope('partial',operation==='getVerificationPlan'?{operationId:trace.id,steps:diagnosis.verificationPlan}:diagnosis);
 }};
}
