// 0.1 compatibility facade. All execution is delegated to the canonical 0.2 coordinator.
import {API_VERSION,OPERATIONS,validateRequest,explainError} from './contract.mjs';
import {createFileEngine,FILE_API_VERSION} from './engine.mjs';
import {memoryAdapter} from './adapters/memory.mjs';
export const PROVIDERS=Object.freeze(['fake-r2','fake-drive']);
export function initialState() {
  const objects=[];
  for(const provider of PROVIDERS) for(const [key,content] of [['Welcome.txt','Welcome to REDOWN Beta. These are simulated files.'],['Documents/',''],['Documents/Example.txt','A nested simulated document.']]) objects.push({provider,account:'demo',container:'sandbox',key,content,revision:1});
  return {schemaVersion:1,revision:1,objects,jobs:[],dedupe:{}};
}

const project=job=>{if(!job)return null;if(job.request.source?.provider==='r2-lab'||job.request.destination?.provider==='r2-lab')return structuredClone(job);const {checkpoints,recovery,cancelRequested,writeAttempted,...result}=structuredClone(job);result.apiVersion=API_VERSION;result.request.apiVersion=API_VERSION;result.events=result.events.map(event=>({...event,component:'file-engine/simulation.mjs'}));if(result.receipt)result.receipt.level='simulated-content-equality';return result;};
export function createSimulationEngine(store,options={}){
 const {extraAdapters=[],...coreOptions}=options;const core=createFileEngine({store,adapters:[...PROVIDERS.map(id=>memoryAdapter(store,id)),...extraAdapters],...coreOptions});
 return {
 describe(){return {apiVersion:API_VERSION,scope:extraAdapters.length?'test-laboratory':'simulation-only',operations:OPERATIONS,providers:PROVIDERS.map(id=>({id,version:API_VERSION,realCloud:false,identity:'exact-key within account/container',operations:OPERATIONS,verification:'simulated-content-equality'})),realMutationEnabled:extraAdapters.length>0,canonicalEngineVersion:FILE_API_VERSION,sourceRefs:['extension/file-engine/engine.mjs','extension/file-engine/simulation.mjs'],testRefs:['tests/phase2-engine.test.mjs'],remaining:['live UI cutover','Google Drive adapter','durable external recovery','live acceptance']};},
 async inspect(id){const jobs=await core.inspect(id);return Array.isArray(jobs)?jobs.map(project):project(jobs);},
 async diagnose(id){const job=await this.inspect(id);return job?{id,state:job.state,evidence:job.events,diagnosis:job.error?explainError(job.error):{confirmedFacts:[job.receipt?.providerEvidence?'Canonical coordinator completed a live lab operation at the stated verification strength.':'Canonical coordinator completed the simulated operation.'],hypotheses:[],missingEvidence:['Installed Chrome and real-provider evidence']}}:null;},
 async plan(input){const r=validateRequest(input);await core.plan({...r,apiVersion:FILE_API_VERSION});return {apiVersion:API_VERSION,request:r,mutates:!['list','metadata','read'].includes(r.operation),executor:'canonical-coordinator',conflict:'fail-without-overwrite',verification:'simulated-content-equality',realCloud:false};},
 async runCanonical(input){return core.run(input);},
 async run(input){const request=validateRequest(input);return project(await core.run({...request,apiVersion:FILE_API_VERSION}));}
 };
}
