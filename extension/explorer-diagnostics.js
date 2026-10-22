/* Explorer diagnostics 1.0.0. Bounded, redacted, dependency-free; never performs cloud operations. */
(function(root){
'use strict';
const VERSION='1.0.0',LIMITS=Object.freeze({operations:64,events:64,identities:16,bytes:262144,retentionMs:86400000});
const operations=['context.menu','navigation','listing','pagination','search','refresh','selection','preview','lightbox','download','upload','copy','move','rename','delete','folder.create','properties','public.urls','clipboard','bucket.switch','account.switch','auth','worker.readiness','archive'];
const stages=['intent','ui.request','ui.result','message.accept','message.result','source.identity','destination.identity','worker.check','worker.request','worker.response','source.read','destination.write','destination.verify','source.cleanup','api.request','api.response','browser.request','browser.result','state','interrupted'];
const components=['options','background','worker','cloudflare','chrome','adapter','fixture'];
const taxonomy={
 EXPLORER_URL_DISCOVERY_FAILED:['File URL configuration discovery failed.','refresh-configuration'],
 EXPLORER_URL_UNAVAILABLE:['No eligible configured shareable address was observed.','review-public-configuration'],
 EXPLORER_SELECTION_EMPTY:['No files were selected for the action.','select-file'],
 EXPLORER_CLIPBOARD_EMPTY:['The REDOWN file clipboard is empty.','copy-selection'],
 EXPLORER_DESTINATION_REQUIRED:['No destination bucket was selected.','choose-destination'],
 EXPLORER_CLIPBOARD_FAILED:['The browser did not confirm clipboard writing.','retry-clipboard'],
 EXPLORER_HTTP_NOT_FOUND:['An endpoint returned HTTP 404; the root cause is unknown.','inspect-route'],
 EXPLORER_SOURCE_NOT_FOUND:['The addressed storage binding did not contain the exact requested key.','compare-identities'],
 EXPLORER_SOURCE_KEY_MISMATCH:['Comparable source-key fingerprints disagree.','inspect-key-construction'],
 EXPLORER_BUCKET_CONTEXT_MISMATCH:['Comparable bucket-context fingerprints disagree.','inspect-binding'],
 EXPLORER_WORKER_ROUTING_CONFIG:['Public Worker-to-Worker fetch is missing its explicit routing compatibility flag.','review-routing-configuration'],
 EXPLORER_WORKER_NOT_READY:['Worker execution/readiness could not be established.','check-worker'],
 EXPLORER_WORKER_CAPABILITY_MISMATCH:['Observed Worker capabilities do not satisfy the request.','review-worker-version'],
 EXPLORER_AUTH_EXPIRED:['Authorization was rejected; token expiry is not independently established.','reconnect'],
 EXPLORER_PERMISSION_DENIED:['Access was forbidden; permission or policy needs inspection.','inspect-permissions'],
 EXPLORER_REQUEST_TIMEOUT:['Request deadline elapsed; a write may have committed.','inspect-destination-before-retry'],
 EXPLORER_DESTINATION_CONFLICT:['Destination exists or changed during the operation.','choose-conflict-action'],
 EXPLORER_COPY_VERIFICATION_FAILED:['Destination verification did not establish the expected object.','preserve-source'],
 EXPLORER_UI_STATE_STALE:['An older UI response was discarded.','refresh-view'],
 EXPLORER_MESSAGE_HANDLER_MISSING:['No compatible message handler was observed.','check-extension-version'],
 EXPLORER_RESULT_UNCONFIRMED:['Available evidence does not establish completion.','collect-evidence'],
 EXPLORER_NETWORK_ERROR:['Transport failed without an authoritative object result.','inspect-connection'],
 EXPLORER_SOURCE_CHANGED:['Source version changed before cleanup.','preserve-source'],
 EXPLORER_RESTART_INTERRUPTED:['Collection restarted while the operation was incomplete.','inspect-outcome-before-retry']
};
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const cleanId=value=>uuid(value)?value:null;
function classify({status,httpStatus,code,name}={}){
 if(!Number.isInteger(status))status=httpStatus;
 if(taxonomy[code])return code;
 if(name==='TimeoutError')return 'EXPLORER_REQUEST_TIMEOUT';
 if(name==='AbortError')return 'EXPLORER_RESULT_UNCONFIRMED';
 return ({401:'EXPLORER_AUTH_EXPIRED',403:'EXPLORER_PERMISSION_DENIED',404:'EXPLORER_HTTP_NOT_FOUND',409:'EXPLORER_DESTINATION_CONFLICT',412:'EXPLORER_DESTINATION_CONFLICT'})[status]||'EXPLORER_RESULT_UNCONFIRMED';
}
function failure(code,stage,component,status){
 code=taxonomy[code]?code:'EXPLORER_RESULT_UNCONFIRMED';
 return {code,description:taxonomy[code][0],stage,component,httpStatus:Number.isInteger(status)&&status>=100&&status<=599?status:null,retryability:['EXPLORER_DESTINATION_CONFLICT','EXPLORER_PERMISSION_DENIED'].includes(code)?'requires-action':'inspect-before-retry',recovery:[taxonomy[code][1]],confidence:'confirmed-observation',rootCause:'unknown'};
}
function safeEvent(event,sequence,now){
 if(!event||!stages.includes(event.stage)||!components.includes(event.component))return null;
 const out={sequence,at:Number.isFinite(event.at)?event.at:now(),stage:event.stage,component:event.component,outcome:['started','confirmed','failed','unknown','cancelled','discarded'].includes(event.outcome)?event.outcome:'unknown'};
 if(Number.isInteger(event.status)&&event.status>=100&&event.status<=599)out.status=event.status;
 if(taxonomy[event.code])out.code=event.code;
 if(Number.isInteger(event.workerVersion)&&event.workerVersion>=0&&event.workerVersion<1000)out.workerVersion=event.workerVersion;
 if(Number.isInteger(event.protocol)&&event.protocol>=0&&event.protocol<100)out.protocol=event.protocol;
 if(typeof event.safeTransfers==='boolean')out.safeTransfers=event.safeTransfers;
 for(const field of ['selectedCount','loadedCount','previewGeneration'])if(Number.isSafeInteger(event[field])&&event[field]>=0)out[field]=event[field];
 for(const field of ['hasClipboard','betaMode','debugMode','bindingMatches','publicFetchEnabled'])if(typeof event[field]==='boolean')out[field]=event[field];
 if(typeof event.bindingDeclared==='boolean')out.bindingDeclared=event.bindingDeclared;
 if(Number.isSafeInteger(event.size)&&event.size>=0)out.size=event.size;
 for(const key of ['account','bucket','key','encodedKey','etag','binding','expectedBinding','origin','expectedOrigin','expectedKey'])if(hex(event[key]))out[key]=event[key];
 if(['source.provider-settings','destination.provider-settings','source.api-read','source.direct-head','source.via-destination-head'].includes(event.probe))out.probe=event.probe;
 if(Number.isFinite(event.durationMs)&&event.durationMs>=0)out.durationMs=event.durationMs;
 if(uuid(event.scope))out.scope=event.scope;
 if(uuid(event.requestId))out.requestId=event.requestId;
 if(['api','worker','browser','local'].includes(event.mechanism))out.mechanism=event.mechanism;
 if(['literal','path','query'].includes(event.encoding))out.encoding=event.encoding;
 if(['GET','HEAD','POST','PUT','DELETE'].includes(event.method))out.method=event.method;
 if(['structured-worker','legacy-worker-message','transport','ui'].includes(event.evidence))out.evidence=event.evidence;
 if(['worker.manage','worker.object','api.object','api.list','api.domains','chrome.download','local.clipboard','r2.managed','r2.custom','worker.assets','provider.public'].includes(event.endpoint))out.endpoint=event.endpoint;
 if(['source','destination'].includes(event.role))out.role=event.role;
 return out;
}
function create({now=()=>Date.now(),id=()=>crypto.randomUUID(),cryptoApi=root.crypto,context='background',extensionVersion='unknown'}={}){
 let enabled=false,records=[],sequence=0,seed=null;const runId=id();let identityScope=runId,keyPromise=null,keyMaterial=null;
 function prune(){const cutoff=now()-LIMITS.retentionMs;records=records.filter(op=>op.startedAt>=cutoff).slice(-LIMITS.operations);while(records.length&&JSON.stringify(records).length>LIMITS.bytes-4096)records.shift();}
 function begin(operation,{operationId,parentId,origin='runtime'}={}){
  if(!enabled||!operations.includes(operation))return null;
  const existing=records.find(op=>op.id===operationId);if(existing)return existing.id;
  const op={id:cleanId(operationId)||id(),parentId:cleanId(parentId),operation,origin:['runtime','fixture','user-report'].includes(origin)?origin:'runtime',context,runId,extensionVersion:/^[a-zA-Z0-9.+_-]{1,64}$/.test(extensionVersion)?extensionVersion:'unknown',startedAt:now(),state:'running',events:[],truncated:false};
  records.push(op);prune();return op.id;
 }
 function record(operationId,event){
  try{if(!enabled)return false;const op=records.find(op=>op.id===operationId);if(!op)return false;const safe=safeEvent(event,++sequence,now);if(!safe)return false;
   if(op.events.length>=LIMITS.events){op.truncated=true;return false;}op.events.push(safe);if(sequence%16===0)prune();return true;
  }catch{return false;}
 }
 function finish(operationId,state='unknown',error){
  try{const op=records.find(op=>op.id===operationId);if(!enabled||!op)return;
   op.state=['confirmed','failed','unknown','cancelled'].includes(state)?state:'unknown';
   if(error)op.error=failure(classify(error),stages.includes(error.stage)?error.stage:'message.result',components.includes(error.component)?error.component:'background',error.status);prune();
  }catch{}
 }
 async function keySeed(){if(!seed)seed=Array.from(cryptoApi.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');return seed;}
 async function fingerprint(kind,value,secret){
  const raw=String(value??'');const material=secret||await keySeed();
  if(keyMaterial!==material){keyMaterial=material;keyPromise=cryptoApi.subtle.importKey('raw',new TextEncoder().encode(material),{name:'HMAC',hash:'SHA-256'},false,['sign']);}
  const key=await keyPromise;
  const hash=await cryptoApi.subtle.sign('HMAC',key,new TextEncoder().encode(kind+'\0'+raw));return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
 }
 async function identity(operationId,source,key,{role='source',stage='source.identity',encoding='path',requestId,expectedKey}={}){
  try{if(!enabled||!uuid(operationId))return;
   const values=await Promise.all([fingerprint('account',source?.accountId),fingerprint('bucket',JSON.stringify([source?.accountId,source?.bucketName])),fingerprint('key',key),fingerprint('key',encoding==='literal'?String(key??''):encoding==='query'?encodeURIComponent(String(key??'')):String(key??'').split('/').map(encodeURIComponent).join('/'))]);
   record(operationId,{stage,component:context,role,encoding,requestId,expectedKey,scope:identityScope,account:values[0],bucket:values[1],key:values[2],encodedKey:values[3],outcome:'confirmed'});
  }catch{}
 }
 function exportBundle(){prune();return {explorerDiagnosticVersion:VERSION,scope:'redacted-explorer',runId,exportedAt:now(),limits:LIMITS,operations:JSON.parse(JSON.stringify(records)),limitations:['Fingerprints comparable only within their recorded scope','No credentials, private names, URLs or contents','Binding declaration is not platform binding introspection','Collection is bounded and may be truncated','Observed completion is not automatically byte verification']};}
 function ingest(bundle,{restart=false}={}){
  if(!bundle||bundle.explorerDiagnosticVersion!==VERSION||!Array.isArray(bundle.operations)||bundle.operations.length>LIMITS.operations||JSON.stringify(bundle).length>LIMITS.bytes)throw Error('INVALID_EXPLORER_BUNDLE');
  const staged=[],ids=new Set();
  for(const raw of bundle.operations){
   if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("INVALID_EXPLORER_OPERATION");
   if(ids.has(raw.id))throw Error("DUPLICATE_EXPLORER_OPERATION");ids.add(raw.id);
   if(!uuid(raw.id)||!operations.includes(raw.operation)||!Array.isArray(raw.events)||raw.events.length>LIMITS.events||!Number.isFinite(raw.startedAt))throw Error('INVALID_EXPLORER_OPERATION');
   const clean={id:raw.id,parentId:cleanId(raw.parentId),operation:raw.operation,origin:['runtime','fixture','user-report'].includes(raw.origin)?raw.origin:'runtime',context:components.includes(raw.context)?raw.context:'adapter',runId:cleanId(raw.runId)||runId,extensionVersion:/^[a-zA-Z0-9.+_-]{1,64}$/.test(raw.extensionVersion)?raw.extensionVersion:'unknown',startedAt:raw.startedAt,state:['running','confirmed','failed','unknown','cancelled'].includes(raw.state)?raw.state:'unknown',events:raw.events.map((event,i)=>safeEvent(event,i+1,now)),truncated:raw.truncated===true};
   if(clean.events.some(event=>!event))throw Error('INVALID_EXPLORER_EVENT');
   if(raw.error)clean.error=failure(classify(raw.error),stages.includes(raw.error.stage)?raw.error.stage:'message.result',components.includes(raw.error.component)?raw.error.component:'adapter',raw.error.httpStatus);
   if(restart&&clean.state==='running'){clean.state='unknown';clean.error=failure('EXPLORER_RESTART_INTERRUPTED','interrupted','adapter');clean.events.push({sequence:clean.events.length+1,at:now(),stage:'interrupted',component:'adapter',outcome:'unknown'});clean.events=clean.events.slice(-LIMITS.events);}
   staged.push(clean);
  }
  for(const clean of staged){const old=records.findIndex(op=>op.id===clean.id);if(old>=0)records[old]=clean;else records.push(clean);}
  prune();
 }
 function tree(operationId){
  const trace=records.find(op=>op.id===operationId);if(!trace)return null;
  const ids=new Set([operationId]);for(let round=0;round<LIMITS.operations;round++){const before=ids.size;for(const op of records)if(ids.has(op.parentId))ids.add(op.id);if(ids.size===before)break;}
  return {...JSON.parse(JSON.stringify(trace)),descendants:records.filter(op=>op.id!==operationId&&ids.has(op.id)).map(op=>JSON.parse(JSON.stringify(op))),parentAvailable:trace.parentId?records.some(op=>op.id===trace.parentId):true};
 }
 function diagnose(operationId){
  prune();const op=records.find(op=>op.id===operationId);if(!op)return {status:'unavailable',findings:[],missing:['operation trace']};
  const group=tree(operationId);const findings=[],events=[op,...group.descendants].flatMap(item=>item.events.map(event=>({...event,operationId:item.id})));
  const add=(confidence,code,evidence,missing)=>findings.push({confidence,kind:confidence==='possible'||confidence==='unknown'?'hypothesis':'observation',code,description:taxonomy[code]?.[0]||code,evidence,missing});
  for(const event of events.filter(event=>event.status===404))add('confirmed','EXPLORER_HTTP_NOT_FOUND',[{operationId:event.operationId,sequence:event.sequence}],['Root cause requires route, binding and exact-key evidence']);
  for(const event of events.filter(event=>event.code==='EXPLORER_SOURCE_NOT_FOUND'))add('confirmed',event.code,[{operationId:event.operationId,sequence:event.sequence}],['A missing key in the addressed binding does not prove the intended bucket lacks it']);
  for(const event of events.filter(e=>e.binding&&e.expectedBinding&&e.binding!==e.expectedBinding))add('confirmed','EXPLORER_BUCKET_CONTEXT_MISMATCH',[{operationId:event.operationId,sequence:event.sequence}],['This compares declared binding context; provider binding introspection is still required']);
  for(const event of events.filter(e=>e.code&&taxonomy[e.code]&&e.code!=='EXPLORER_SOURCE_NOT_FOUND'))add('confirmed',event.code,[{operationId:event.operationId,sequence:event.sequence}],['Recorded error signature is an observation; its underlying cause may remain unknown']);
  for(const event of events.filter(e=>Number.isInteger(e.workerVersion)&&e.workerVersion<5))add('confirmed','EXPLORER_WORKER_CAPABILITY_MISMATCH',[{operationId:event.operationId,sequence:event.sequence}],['Inspect required endpoint and deployed configuration before repair']);
  const identities=events.filter(e=>e.key&&e.role==='source');
  const ref=event=>({operationId:event.operationId,sequence:event.sequence});
  // Different batch items are different objects, not mismatches. Legacy traces
  // without an explicit item correlation cannot establish identity drift.
  for(const event of identities)if(event.scope&&event.expectedKey&&event.key!==event.expectedKey)add('confirmed','EXPLORER_SOURCE_KEY_MISMATCH',[ref(event)],[]);
  const correlated=new Map();
  for(const b of identities){
   if(!b.scope||!b.requestId)continue;
   const groupKey=b.operationId+':'+b.scope+':'+b.requestId,a=correlated.get(groupKey);
   if(!a){correlated.set(groupKey,b);continue;}
   if(a.key!==b.key)add('confirmed','EXPLORER_SOURCE_KEY_MISMATCH',[ref(a),ref(b)],[]);
   if(a.bucket&&b.bucket&&a.bucket!==b.bucket)add('confirmed','EXPLORER_BUCKET_CONTEXT_MISMATCH',[ref(a),ref(b)],[]);
  }
  for(const event of events.filter(e=>e.origin&&e.expectedOrigin&&e.origin!==e.expectedOrigin))add('confirmed','EXPLORER_WORKER_NOT_READY',[ref(event)],['Observed endpoint origin differs from the requested origin']);
  const candidates=identities.filter(e=>e.bucket&&e.scope),uniqueKeys=new Set(candidates.map(e=>e.scope+':'+e.bucket+':'+e.key));
  const notFound=events.filter(e=>e.status===404);
  const failedKeys=new Set(identities.filter(e=>e.requestId&&notFound.some(f=>f.operationId===e.operationId&&f.requestId===e.requestId)).map(e=>e.key));
  const comparable=candidates.filter(e=>failedKeys.has(e.key)||(uniqueKeys.size===1&&notFound.length));
  const peers=records.filter(other=>other.id!==op.id&&['preview','download'].includes(other.operation)&&other.state==='confirmed'&&other.events.some(e=>comparable.some(match=>e.key===match.key&&e.bucket===match.bucket&&e.scope===match.scope)));
  if(peers.length&&events.some(e=>e.status===404))add('strongly-supported','API_WORKER_PATH_DIVERGENCE',events.filter(e=>e.status===404).map(e=>({operationId:e.operationId,sequence:e.sequence})),['Inspect Worker route and binding; API success does not prove Worker identity']);
  const apiProbe=events.find(e=>e.probe==='source.api-read'&&e.outcome==='confirmed');
  const proxyFailure=events.find(e=>e.probe==='source.via-destination-head'&&e.outcome==='failed');
  if(apiProbe&&proxyFailure)add('strongly-supported','API_WORKER_PATH_DIVERGENCE',[ref(apiProbe),ref(proxyFailure)],['Same probe: API read succeeds while destination-Worker source access fails; inspect route/configuration and exact identity']);
  if(!findings.length)add('unknown','EXPLORER_RESULT_UNCONFIRMED',[],['No deterministic failure signature is established']);
  findings.sort((a,b)=>['confirmed','strongly-supported','possible','unknown'].indexOf(a.confidence)-['confirmed','strongly-supported','possible','unknown'].indexOf(b.confidence));
  return {status:'partial',operationId,findings,relatedSuccesses:peers.map(p=>p.id),rootCause:'unknown',missing:['Installed extension build identity','Observed provider binding settings','Live destination read/hash unless separately recorded'],verificationPlan:['Use explicitly authorized disposable objects','Compare same-scope source identity fingerprints across API and Worker','Inspect observed Worker version and binding declaration versus provider settings','Copy once, independently read/hash destination and confirm source remains','Do not replay an ambiguous write; inspect destination first']};
 }
 return {getOperationTree:tree,markTruncated(operationId){const op=records.find(op=>op.id===operationId);if(op)op.truncated=true;},begin,record,finish,identity,fingerprint,keySeed,runId,get identityScope(){return identityScope;},useIdentityContext(value){if(enabled&&uuid(value?.scope)&&hex(value?.seed)){identityScope=value.scope;seed=value.seed;return true;}return false;},exportBundle,ingest,diagnose,setEnabled(value){enabled=value===true;if(!enabled){records=[];seed=null;identityScope=id();}},get enabled(){return enabled;},getOperationTrace(operationId){prune();const op=records.find(op=>op.id===operationId);return op?JSON.parse(JSON.stringify(op)):null;}};
}
root.RedownExplorerDiagnostics={VERSION,LIMITS,operations,stages,components,taxonomy,classify,create};
})(globalThis);
