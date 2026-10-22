/* Safe adapters around existing product boundaries. Diagnostics never invokes preparation/cloud operations. */
(function(root){
'use strict';
const mapping={cfObjects:'listing',cfBuckets:'account.switch',cfDestinationFolders:'navigation',cfSearchStart:'search',cfSearchStep:'search',cfSearchRetry:'search',cfSearchCancel:'search',cfTransferObjects:'copy',cfRenameEntry:'rename',cfDeleteObjects:'delete',cfCreateFolder:'folder.create',cfObjectProperties:'properties',cfPublicAddresses:'public.urls',cfEnablePublicAccess:'public.urls',cfPrepareBucket:'worker.readiness',cfArchiveEntries:'archive',cfArchiveEntryUrl:'archive',cfExtractArchive:'archive',cfTransferArchive:'archive',cfDownloadObject:'download',cfPrivateObjectUrl:'preview',cfConnect:'auth',cfDisconnect:'auth'};
function install({context,chrome,document}){
 const core=root.RedownExplorerDiagnostics,collector=core.create({context,extensionVersion:chrome.runtime.getManifest().version});
 let parent=null,pendingSave=null,lastId=null,lastClearAt=0,epoch=0,stateProvider=null,probeProvider=null,identityReady=Promise.resolve();
 const key='redownExplorerDiagnostics1';
 const ready=chrome.storage.local.get(['debugModeEnabled',key]).then(async stored=>{collector.setEnabled(stored.debugModeEnabled);if(stored.debugModeEnabled&&stored[key])try{collector.ingest(stored[key],{restart:true});}catch{}
  if(context==='options'&&stored.debugModeEnabled)try{const result=await chrome.runtime.sendMessage({type:"explorerDiagnosticsV1",operation:"sessionContext"});if(result.ok)collector.useIdentityContext(result.context);}catch{}
  if(!stored.debugModeEnabled&&context==='background')void chrome.storage.local.remove(key).catch(()=>{});
 }).catch(()=>{});
 function persist(){if(context!=='background'||!collector.enabled||pendingSave)return;const generation=epoch;pendingSave=setTimeout(()=>{pendingSave=null;if(!collector.enabled||generation!==epoch)return;void chrome.storage.local.set({[key]:collector.exportBundle()}).then(()=>{if(!collector.enabled||generation!==epoch)return chrome.storage.local.remove(key);}).catch(()=>{});},250);}
 chrome.storage.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes.debugModeEnabled){epoch++;lastClearAt=Date.now();collector.setEnabled(changes.debugModeEnabled.newValue);if(context==='options'&&changes.debugModeEnabled.newValue)identityReady=chrome.runtime.sendMessage({type:"explorerDiagnosticsV1",operation:"sessionContext"}).then(result=>{if(result.ok)collector.useIdentityContext(result.context);}).catch(()=>{});if(!changes.debugModeEnabled.newValue){clearTimeout(pendingSave);pendingSave=null;void chrome.storage.local.remove(key).catch(()=>{});}}});
 function begin(operation,options){try{return collector.begin(operation,options);}catch{return null;}}
 function event(id,stage,outcome,details={}){try{collector.record(id,{stage,component:context,outcome,...details});persist();}catch{}}
 function summary(id,value){
  if(!id)return;let error=value?.diagnosticError||value?.results?.find(result=>result.status==='failed')||value?.errors?.[0];
  const legacy=/^Source object was not available \(HTTP (\d{3})\)$/.exec(error?.error||'');
  if(legacy&&!Number.isInteger(error.httpStatus)&&!Number.isInteger(error.status)){
   error={...error,httpStatus:Number(legacy[1]),stage:'source.read',component:'worker'};
   event(id,'source.read','failed',{status:error.httpStatus,code:core.classify(error),mechanism:'worker',endpoint:'worker.object',method:'GET',evidence:'legacy-worker-message'});
  }
  const state=value?.ok===true&&!error&&!value?.partialMove?'confirmed':value?.ok===false||error?'failed':'unknown';
  event(id,'message.result',state,{status:error?.httpStatus||error?.status,code:core.classify(error)});collector.finish(id,state,state==='confirmed'?undefined:{...error,status:error?.httpStatus||error?.status,code:core.classify(error),stage:error?.stage||'message.result',component:error?.component||context});lastId=id;persist();
 }
 async function beginMessage(message){
  try{await ready;if(!mapping[message.type]||!collector.enabled)return null;
   const operation=message.type==='cfTransferObjects'&&message.operation==='move'?'move':mapping[message.type];const id=begin(operation,{parentId:parent});event(id,'ui.request','started');return {id,wire:{operationId:id,operation,parentId:collector.getOperationTrace(id)?.parentId,protocol:1}};
  }catch{return null;}
 }
 async function accept(message,sender){
  try{await ready;if(!collector.enabled||!mapping[message.type]||sender?.url!==chrome.runtime.getURL('options.html'))return null;
   const id=begin(message.type==='cfTransferObjects'&&message.operation==='move'?'move':mapping[message.type],{operationId:message.explorerTrace?.operationId,parentId:message.explorerTrace?.parentId});
   event(id,'ui.request','started');event(id,'message.accept','confirmed');
   const source=message.source||message;for(const item of (message.entries||[message.entry||{key:message.key}]).slice(0,8))if(item?.key)await collector.identity(id,source,item.key,{encoding:"literal"});
   return {operationId:id,protocol:1,scope:collector.identityScope,seed:await collector.keySeed(),sourceBinding:await collector.fingerprint("bucket",JSON.stringify([source?.accountId,source?.bucketName]))};
  }catch{return null;}
 }
 function workerEvents(trace,payload){
  try{if(!trace?.operationId||!payload||payload.protocol!==1||payload.operationId!==trace.operationId||!Array.isArray(payload.events))return;
   if(payload.truncated)collector.markTruncated(trace.operationId);
   for(const item of payload.events.slice(0,32))collector.record(trace.operationId,{...item,component:'worker',scope:trace.scope});persist();
  }catch{}
 }
 function complete(message,value){try{if(!message.explorerTrace?.operationId)return null;summary(message.explorerTrace.operationId,value);return collector.getOperationTrace(message.explorerTrace.operationId);}catch{return null;}}
 async function reply(handle,result){
  try{if(!handle)return;
   if(result?.explorerDiagnostic){const bundle=collector.exportBundle();bundle.operations=[result.explorerDiagnostic];collector.ingest(bundle);event(handle.id,'ui.result',result.ok?'confirmed':'failed');}
   else{event(handle.id,'ui.result','unknown');collector.finish(handle.id,'unknown',{code:'EXPLORER_RESULT_UNCONFIRMED',stage:'ui.result',component:'options'});}
   lastId=handle.id;
  }catch{}
 }
 function wrap(operation,original){return function(...args){
  if(!collector.enabled)return original.apply(this,args);
  const id=begin(operation,{parentId:parent}),previous=parent;parent=id;event(id,'intent','started');let result;
  try{result=original.apply(this,args);}catch(error){event(id,'ui.result','failed',{code:core.classify(error)});collector.finish(id,'failed',{code:core.classify(error),stage:'ui.result',component:context});throw error;}finally{parent=previous;}
  const finish=()=>{event(id,'ui.result','unknown');collector.finish(id,'unknown');lastId=id;};
  if(result&&typeof result.then==='function')return result.then(value=>{finish();return value;},error=>{event(id,'ui.result','failed',{code:core.classify(error)});collector.finish(id,'failed',{code:core.classify(error)});throw error;});finish();return result;
 };}
 function direct(operation,original){return function(source,key,...rest){
  if(!collector.enabled)return original.call(this,source,key,...rest);
  const id=begin(operation,{parentId:parent}),target=source&&typeof source==='object'?{...source,explorerTrace:{operationId:id,protocol:1}}:source;
  if(operation==='download'){
   const callback=rest[1];rest[1]=state=>{
    try{if(state.state==='complete'){event(id,'browser.result','confirmed',{mechanism:'browser'});collector.finish(id,'confirmed');}else if(state.state==='interrupted'){event(id,'browser.result','failed',{code:'EXPLORER_NETWORK_ERROR'});collector.finish(id,'failed',{code:'EXPLORER_NETWORK_ERROR',stage:'browser.result',component:'chrome'});}}catch{}
    callback?.(state);
   };
  }
  event(id,operation==='download'?'browser.request':'api.request','started',{mechanism:operation==='download'?'browser':'api',method:'GET',endpoint:operation==='download'?'chrome.download':'api.object'});
  void ready.then(()=>identityReady).then(()=>collector.identity(id,source,key));
  let result;try{result=original.call(this,target,key,...rest);}catch(error){collector.finish(id,'failed',{code:core.classify(error),stage:'api.response',component:'options'});throw error;}
  return Promise.resolve(result).then(value=>{event(id,operation==='download'?'browser.result':'api.response',operation==='download'?'unknown':'confirmed',{mechanism:operation==='download'?'browser':'api',method:'GET',endpoint:operation==='download'?'chrome.download':'api.object'});if(operation!=='download'||collector.getOperationTrace(id)?.state==='running')collector.finish(id,operation==='download'?'unknown':'confirmed');lastId=id;return value;},error=>{event(id,'api.response','failed',{code:core.classify(error),status:error.status});collector.finish(id,'failed',{code:core.classify(error),status:error.status,stage:'api.response',component:'options'});lastId=id;throw error;});
 };}
 async function wire(trace,profile){try{if(!collector.enabled||!trace?.operationId)return null;return {...trace,protocol:1,scope:collector.identityScope,seed:await collector.keySeed(),expectedOrigin:profile?.workerUrl?await collector.fingerprint("origin",new URL(profile.workerUrl).origin):undefined,expectedBinding:profile?await collector.fingerprint("bucket",JSON.stringify([profile.accountId,profile.bucketName])):trace.sourceBinding};}catch{return null;}}
 function query(operation,input={}){
  if(!collector.enabled)return {explorerDiagnosticVersion:core.VERSION,state:'unavailable',error:{code:'DIAGNOSTICS_DISABLED'}};
  if(operation==='clear'){epoch++;lastClearAt=Date.now();collector.setEnabled(false);collector.setEnabled(true);void chrome.storage.local.remove(key).catch(()=>{});return {explorerDiagnosticVersion:core.VERSION,state:'available',data:{cleared:true}};}
  if(operation==='ingest'){collector.ingest({...input.bundle,operations:input.bundle.operations.filter(op=>op.startedAt>lastClearAt)});persist();return {explorerDiagnosticVersion:core.VERSION,state:'available',data:{imported:true}};}
  const bundle=collector.exportBundle(),trace=collector.getOperationTree(input.id);
  const data=operation==='exportDiagnosticBundle'?bundle:operation==='getRecentFailures'?bundle.operations.filter(op=>['failed','unknown'].includes(op.state)):operation==='getOperationTrace'?trace:operation==='diagnoseOperation'?collector.diagnose(input.id):operation==='getObjectIdentityTrace'?trace?.events.filter(event=>event.key||event.binding):operation==='getWorkerCompatibility'?{requiredSafeTransferVersion:5,expectedDiagnosticWorker:6,observations:bundle.operations.flatMap(op=>op.events.filter(event=>event.workerVersion!==undefined)),providerBinding:'unknown'}:operation==='getExplorerState'?{operations:bundle.operations.map(op=>({id:op.id,operation:op.operation,state:op.state})),lastObservedState:bundle.operations.flatMap(op=>op.events.filter(event=>event.stage==='state')).at(-1)||null,freshness:'last inspected UI snapshot; not an active remote read',runId:collector.runId}:null;
  return {explorerDiagnosticVersion:core.VERSION,state:data?'partial':'unavailable',data};
 }
 return {collector,ready,setProbeProvider(provider){probeProvider=provider;},probeInput(){if(!collector.enabled||!probeProvider)throw Error("Select a file in Explorer first.");return probeProvider();},setStateProvider(provider){stateProvider=provider;},async captureState(){
  try{await ready;await identityReady;if(!collector.enabled||!stateProvider)return;const state=stateProvider(),id=begin('selection');
   const source=state.source||{};event(id,'state','confirmed',{scope:collector.identityScope,account:await collector.fingerprint('account',source.accountId),bucket:await collector.fingerprint('bucket',JSON.stringify([source.accountId,source.bucketName])),key:await collector.fingerprint('key',state.prefix||''),selectedCount:state.selectedCount,loadedCount:state.loadedCount,previewGeneration:state.previewGeneration,hasClipboard:state.hasClipboard,betaMode:state.betaMode,debugMode:state.debugMode});collector.finish(id,'confirmed');
  }catch{}
 },async refreshIdentity(){if(context!=="options")return;const result=await chrome.runtime.sendMessage({type:"explorerDiagnosticsV1",operation:"sessionContext"});if(result.ok)collector.useIdentityContext(result.context);},async sessionContext(){return {scope:collector.identityScope,seed:await collector.keySeed()};},beginMessage,accept,complete,reply,wrap,direct,wire,event,workerEvents,query,get lastId(){return lastId;}};
}
root.RedownExplorerBridge={install,mapping};
})(globalThis);
