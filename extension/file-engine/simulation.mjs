import {API_VERSION,OPERATIONS,validateRequest,transition,fault,sameLocation,explainError} from './contract.mjs';
export const PROVIDERS = Object.freeze(['fake-r2','fake-drive']);
const writable=['copy','move','rename','delete','mkdir','upload'];
const token=id=>JSON.stringify([id.provider,id.account,id.container,id.key]);
const scope=id=>JSON.stringify([id.provider,id.account,id.container]);
export function initialState() {
  const objects=[];
  for(const provider of PROVIDERS) for(const [key,content] of [['Welcome.txt','Welcome to REDOWN Beta. These are simulated files.'],['Documents/',''],['Documents/Example.txt','A nested simulated document.']]) objects.push({provider,account:'demo',container:'sandbox',key,content,revision:1});
  return {schemaVersion:1,revision:1,objects,jobs:[],dedupe:{}};
}
function checkState(state) {
  if (!state||state.schemaVersion!==1||!Array.isArray(state.objects)||!Array.isArray(state.jobs)||!state.dedupe) throw fault('INCOMPATIBLE_JOURNAL');
}
function available(id) {
  if (!id||!PROVIDERS.includes(id.provider)||id.account!=='demo'||id.container!=='sandbox') throw fault('UNSUPPORTED_PROVIDER');
}
function execute(state,request) {
  const {operation,source,destination}=request;
  if(source)available(source);if(destination)available(destination);
  const find=id=>state.objects.find(o=>token(o)===token(id));
  const info=o=>({provider:o.provider,account:o.account,container:o.container,key:o.key,revision:o.revision,size:new TextEncoder().encode(o.content).length,folder:o.key.endsWith('/')});
  if(operation==='list') {
    let offset=0;
    if(request.cursor) {
      let cursor;try{cursor=JSON.parse(request.cursor);}catch{throw fault('INVALID_CURSOR');}
      if(cursor.revision!==state.revision||cursor.scope!==scope(source)||cursor.prefix!==source.key||cursor.query!==(request.query||'')||!Number.isInteger(cursor.offset)||cursor.offset<0)throw fault('STALE_CURSOR');
      offset=cursor.offset;
    }
    const all=state.objects.filter(o=>sameLocation(o,source)&&o.key.startsWith(source.key)&&o.key!==source.key&&(request.query?o.key.toLowerCase().includes(request.query.toLowerCase()):!o.key.slice(source.key.length).replace(/\/$/,'').includes('/'))).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
    const limit=request.limit||50,objects=all.slice(offset,offset+limit).map(info);
    return {objects,cursor:offset+limit<all.length?JSON.stringify({revision:state.revision,scope:scope(source),prefix:source.key,query:request.query||'',offset:offset+limit}):null,complete:offset+limit>=all.length};
  }
  if(['metadata','read'].includes(operation)) {
    const object=find(source);if(!object)throw fault('NOT_FOUND_OR_INACCESSIBLE');
    return {...info(object),...(operation==='read'?{content:object.content}:{} )};
  }
  let selected=[];
  if(source){selected=state.objects.filter(o=>sameLocation(o,source)&&(o.key===source.key||source.key.endsWith('/')&&o.key.startsWith(source.key)));if(!selected.length)throw fault('NOT_FOUND_OR_INACCESSIBLE');}
  if(operation==='delete'){state.objects=state.objects.filter(o=>!selected.includes(o));state.revision++;return {deleted:selected.map(info)};}
  // Atomic simulation-only snapshot: all conflicts discovered before any object changes.
  const additions=['mkdir','upload'].includes(operation)?[{...destination,content:request.content||'',revision:1}]:selected.map(o=>({...destination,key:destination.key+o.key.slice(source.key.length),content:o.content,revision:1}));
  if(additions.some(o=>find(o)||state.objects.some(existing=>sameLocation(existing,o)&&o.key.endsWith('/')&&existing.key.startsWith(o.key))))throw fault('CONFLICT');
  if(state.objects.length+additions.length>5000)throw fault('CAPACITY');
  state.objects.push(...additions);
  // Exact byte comparison is possible here only because the entire fake store is in one transaction.
  if(additions.some((o,i)=>o.content!==(['mkdir','upload'].includes(operation)?request.content||'':selected[i].content)))throw fault('VERIFICATION_DISAGREEMENT');
  if(['move','rename'].includes(operation))state.objects=state.objects.filter(o=>!selected.includes(o));
  state.revision++;
  return {objects:additions.map(info),sourceRetained:!['move','rename'].includes(operation)};
}
export function createSimulationEngine(store,{uuid=()=>crypto.randomUUID(),now=()=>new Date().toISOString()}={}) {
  return {
    describe(){return {apiVersion:API_VERSION,scope:'simulation-only',operations:OPERATIONS,providers:PROVIDERS.map(id=>({id,version:API_VERSION,realCloud:false,identity:'exact-key within account/container',operations:OPERATIONS,conditionalCreate:true,nativeAtomicSnapshot:true,verification:'simulated-content-equality',authentication:'none; no credentials accessed',resumability:'atomic local transaction; no external transfer'})),realMutationEnabled:false,sourceRefs:['extension/file-engine/contract.mjs','extension/file-engine/simulation.mjs'],testRefs:['tests/phase2-engine.test.mjs'],remaining:['R2 adapter','Google Drive adapter','external executor','durable asynchronous recovery','gateway integration','live acceptance']};},
    async inspect(id){const state=await store.read();checkState(state);return structuredClone(id?state.jobs.find(j=>j.id===id)||null:state.jobs);},
    async diagnose(id){const job=await this.inspect(id);return job?{id,state:job.state,evidence:job.events,diagnosis:job.error?explainError(job.error):{confirmedFacts:['Simulation transaction completed.'],hypotheses:[],missingEvidence:['Installed Chrome and real-provider evidence']}}:null;},
    async plan(input){const request=validateRequest(input);if(request.source)available(request.source);if(request.destination)available(request.destination);return {apiVersion:API_VERSION,request,mutates:writable.includes(request.operation),executor:'local-atomic-simulation',conflict:'fail-without-overwrite',verification:'simulated-content-equality',realCloud:false};},
    async run(input){
      const request=validateRequest(input),fingerprint=JSON.stringify(request);
      return store.update(state=>{
        checkState(state);
        const prior=Object.hasOwn(state.dedupe,request.idempotencyKey)?state.dedupe[request.idempotencyKey]:null;
        if(prior){if(prior.fingerprint!==fingerprint)throw fault('IDEMPOTENCY_CONFLICT');return structuredClone(state.jobs.find(j=>j.id===prior.id));}
        if(state.jobs.length>=500)throw fault('CAPACITY');
        const job={apiVersion:API_VERSION,id:uuid(),request:structuredClone(request),executor:'local-atomic-simulation',state:'requested',events:[],receipt:null};
        job.events.push({sequence:1,operationId:job.id,state:'requested',stage:'request',at:now(),component:'file-engine/simulation.mjs'});
        transition(job,'validated','validation',now);transition(job,'planned','planning',now);transition(job,'queued','queue',now);transition(job,'executing','provider.simulated',now);
        const candidate=structuredClone(state);
        try {
          job.result=execute(candidate,request);transition(job,'verifying','verification.simulated',now);
          job.receipt={level:'simulated-content-equality',providerEvidence:false,operationId:job.id,source:request.source||null,destination:request.destination||null};
          transition(job,'completed','result',now);state.objects=candidate.objects;state.revision=candidate.revision;
        } catch(error){job.error=error.code||'INVALID_PROVIDER_RESPONSE';transition(job,'failed','provider.simulated',now);}
        state.jobs.push(job);Object.defineProperty(state.dedupe,request.idempotencyKey,{value:{fingerprint,id:job.id},enumerable:true,configurable:true,writable:true});
        return structuredClone(job);
      });
    }
  };
}
