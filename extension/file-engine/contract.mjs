// Platform-independent contract. Beta is an interface policy, never a core flag.
export const API_VERSION = '0.1.0';
export const OPERATIONS = Object.freeze(['list','metadata','read','copy','move','rename','delete','mkdir','upload']);
export const STATES = Object.freeze({
  requested:['validated','failed','cancelled'], validated:['planned','failed'],
  planned:['queued','blocked_authorization','cancelled','failed'], queued:['executing','cancelled'],
  executing:['verifying','failed','uncertain','cancelled','partially_completed'],
  verifying:['completed','failed','uncertain','partially_completed'],
  completed:[], partially_completed:[], blocked_authorization:[], failed:[], cancelled:[], uncertain:[]
});
export function fault(code) { return Object.assign(new Error(code), {code}); }
export function identity(value, {root=false}={}) {
  if (!value || Object.keys(value).some(k=>!['provider','account','container','key'].includes(k))) throw fault('INVALID_IDENTITY');
  for (const field of ['provider','account','container']) if (typeof value[field]!=='string'||!value[field]||value[field].length>128) throw fault('INVALID_IDENTITY');
  if (typeof value.key!=='string'||(!root&&!value.key)||value.key.length>1024||/[\u0000-\u001f\\]/.test(value.key)||value.key.startsWith('/')||value.key.split('/').some(s=>s==='.'||s==='..')) throw fault('INVALID_IDENTITY');
  return structuredClone(value); // Exact keys are never trimmed, decoded or lowercased.
}
export const sameLocation=(a,b)=>a.provider===b.provider&&a.account===b.account&&a.container===b.container;
export function validateRequest(input) {
  if (!input || input.apiVersion!==API_VERSION) throw fault('INCOMPATIBLE_VERSION');
  if (Object.keys(input).some(k=>!['apiVersion','operation','source','destination','content','idempotencyKey','confirmed','cursor','limit','query'].includes(k))) throw fault('INVALID_REQUEST');
  if (!OPERATIONS.includes(input.operation)) throw fault('UNSUPPORTED_OPERATION');
  if (typeof input.idempotencyKey!=='string'||!input.idempotencyKey||input.idempotencyKey.length>128) throw fault('INVALID_REQUEST');
  const read=['list','metadata','read'].includes(input.operation);
  if (input.operation==='list') {
    identity(input.source,{root:true});
    if (input.source.key&&!input.source.key.endsWith('/')) throw fault('INVALID_IDENTITY');
    if (input.limit!==undefined&&(!Number.isInteger(input.limit)||input.limit<1||input.limit>100)) throw fault('INVALID_REQUEST');
    if (input.query!==undefined&&(typeof input.query!=='string'||input.query.length>128)) throw fault('INVALID_REQUEST');
    if (input.cursor!==undefined&&(typeof input.cursor!=='string'||input.cursor.length>4096)) throw fault('INVALID_CURSOR');
  } else if (!['mkdir','upload'].includes(input.operation)) identity(input.source);
  if (['copy','move','rename','mkdir','upload'].includes(input.operation)) identity(input.destination);
  if (['mkdir'].includes(input.operation)&&!input.destination.key.endsWith('/')) throw fault('INVALID_IDENTITY');
  if (input.operation==='upload'&&(input.destination.key.endsWith('/')||typeof input.content!=='string'||new TextEncoder().encode(input.content).length>65536)) throw fault('INVALID_REQUEST');
  if (['move','rename','delete'].includes(input.operation)&&input.confirmed!==true) throw fault('CONFIRMATION_REQUIRED');
  if (!read&&['copy','move','rename'].includes(input.operation)) {
    const {source:s,destination:d}=input;
    if (s.key.endsWith('/')!==d.key.endsWith('/')) throw fault('INVALID_IDENTITY');
    if (sameLocation(s,d)&&(s.key===d.key||s.key.endsWith('/')&&d.key.startsWith(s.key))) throw fault('SELF_TARGET');
    if (input.operation==='rename'&&(!sameLocation(s,d)||s.key.replace(/\/$/,'').split('/').slice(0,-1).join('/')!==d.key.replace(/\/$/,'').split('/').slice(0,-1).join('/'))) throw fault('INVALID_REQUEST');
  }
  return structuredClone(input);
}
export function transition(job,state,stage,now=()=>new Date().toISOString()) {
  if (!STATES[job.state]?.includes(state)) throw fault('INVALID_TRANSITION');
  job.state=state;
  job.events.push({sequence:job.events.length+1,operationId:job.id,state,stage,at:now(),component:'file-engine/simulation.mjs'});
}
export function explainError(code) {
  const known={CONFLICT:'Destination retained. Choose another exact destination.',CONFIRMATION_REQUIRED:'Explicit confirmation is required before destructive simulation.',INCOMPATIBLE_VERSION:'Use the advertised contract version.',NOT_FOUND_OR_INACCESSIBLE:'Check provider, account, container, key and authorization; absence is not established.',STALE_CURSOR:'Refresh the listing before continuing.',STORAGE_FAILED:'No completion receipt is available. Inspect persisted state before retrying.',UNSUPPORTED_PROVIDER:'No real-cloud adapter is installed.',CAPACITY:'Simulation capacity reached; no automatic history deletion is performed.'};
  return {code,confirmedFacts:[known[code]||'The requested operation was rejected.'],hypotheses:[],safeToRetry:false,missingEvidence:code==='NOT_FOUND_OR_INACCESSIBLE'?['Independent routing, authorization and object observations']:[]};
}
