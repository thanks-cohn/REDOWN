/* Private startup observations only. No URL/error text, provider access or keepalive. */
(() => {
  'use strict';
  const KEY='redownStartupCrashTraceV1',LIMITS={records:384,bytes:192*1024,retentionMs:7*86400000,pending:128};
  const codes=new Set(('WORKER_EVALUATION CORE_IMPORT_BEGIN CORE_IMPORT_READY CORE_IMPORT_FAILED ENTRY_LISTENER_REGISTERED BOOTSTRAP_IMPORT_FAILED PAGE_OPEN PAGE_HIDE PAGE_ERROR WORKER_ERROR TRACE_STORAGE_FAILED UNHANDLED_REJECTION WORKER_SUSPEND_OBSERVED WORKER_SUSPEND_CANCELLED PREVIOUS_EPOCH_STOPPED_REASON_UNKNOWN API_STARTED API_ACCEPTED API_REJECTED API_TIMED_OUT API_LATE_ACCEPTED API_LATE_REJECTED WORKER_LOAD WORKER_UPDATE WORKER_INSTALL BROWSER_START MENU_REGISTRATION_STARTED MENU_ACKNOWLEDGED MENU_SUPERSEDED MENU_REGISTRATION_FAILED TOOLBAR_CONFIGURED TOOLBAR_CONFIGURATION_FAILED TOOLBAR_CONFIGURATION_DEGRADED PANEL_BEHAVIOR_FAILED SHELF_CONFIGURATION_FAILED PREFERENCE_STORAGE_UNAVAILABLE SHELF_REQUEST SHELF_READY SHELF_API_ACCEPTED SHELF_READINESS_UNKNOWN SHELF_OPEN_PENDING SHELF_OPEN_LATE_ACCEPTED SHELF_OPEN_LATE_REJECTED SHELF_OPEN_REJECTED SHELF_REQUEST_JOINED SHELF_ACKNOWLEDGED SHELF_UNAVAILABLE SHELF_CLOSE_UNCONFIRMED ATTACHED_POPUP_TARGET_UNAVAILABLE LAUNCH_SUPERSEDED ATTACHED_POPUP_ACCEPTED ATTACHED_POPUP_NEXT_CLICK ATTACHED_POPUP_BLOCKED LAUNCH_BLOCKED UNCLASSIFIED_ENTRY_EVENT').split(' '));
  const apis=new Set(['entry.unspecified','storage.local.get','storage.local.set','runtime.getContexts','runtime.sendMessage','sidePanel.open','sidePanel.close','sidePanel.setOptions','sidePanel.setPanelBehavior','action.getPopup','action.setPopup','action.openPopup','tabs.query','boot.local-operation','runtime.onInstalled','runtime.onStartup','runtime.onSuspend','runtime.onSuspendCanceled','action.onClicked','page.error','page.unhandledrejection','worker.error','worker.unhandledrejection','contextMenus']);
  const names=new Set(['Error','TypeError','SyntaxError','ReferenceError','RangeError','CompileError','RuntimeError','AbortError','QuotaExceededError','InvalidStateError','SecurityError','UnknownError']);
  const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
  const files=new Set(['service-worker.js','entry-bootstrap.js','background.js','boot.js','options.js','shelf.js','startup-crash-trace.js','forensic-diagnostics.js','forensic-download.js','flight-recorder.js','capless-archive.js','capless-controls.js','provider-connection.js','provider-reconnect.js','google-drive-stream.js','google-drive-provider.js','onedrive-auth.js','onedrive-provider.js','dropbox-auth.js','dropbox-provider.js','model-viewer.min.js']);
  function frames(error){const result=[];for(const m of String(error?.stack||'').matchAll(/([a-z0-9.-]+\.m?js):(\d+):(\d+)/gi))if(files.has(m[1]))result.push({file:m[1],line:Number(m[2]),column:Number(m[3])});return result.slice(0,4);}
  function clean(e){
    const out={id:uuid(e?.id)?e.id:null,workerEpoch:uuid(e?.workerEpoch)?e.workerEpoch:null,contextEpoch:uuid(e?.contextEpoch)?e.contextEpoch:null,at:Number.isFinite(Date.parse(e?.at))?new Date(Date.parse(e.at)).toISOString():null,component:['worker','core','entry','toolbar','shelf','menu','page','storage','popup','context-menu'].includes(e?.component)?e.component:'entry',stage:['evaluation','import','listener','lifecycle','configure','register','open','readiness','recovery','api','fault','document'].includes(e?.stage)?e.stage:'api',code:codes.has(e?.code)?e.code:'UNCLASSIFIED_ENTRY_EVENT',status:['started','accepted','rejected','timed-out','late-accepted','late-rejected','unknown'].includes(e?.status)?e.status:'unknown',version:/^\d+(?:\.\d+){0,3}$/.test(e?.version)?e.version:'unknown'};
    if(apis.has(e?.api))out.api=e.api;
    for(const k of ['elapsedMs','monotonicMs','durationMs','budgetMs'])if(Number.isFinite(e?.[k]))out[k]=Math.max(0,e[k]);
    for(const k of ['requestId','attemptId','previousEpoch'])if(uuid(e?.[k]))out[k]=e[k];
    if(['install','update','chrome_update','shared_module_update'].includes(e?.reason))out.reason=e.reason;
    if(names.has(e?.errorName))out.errorName=e.errorName;
    out.sourceFrames=(Array.isArray(e?.sourceFrames)?e.sourceFrames:[]).filter(f=>files.has(f?.file)&&Number.isSafeInteger(f.line)&&Number.isSafeInteger(f.column)).slice(0,4).map(f=>({file:f.file,line:f.line,column:f.column}));
    return out;
  }
  function create({chrome=globalThis.chrome,context='worker',now=()=>Date.now(),monotonic=()=>globalThis.performance?.now?.()||0,locks=globalThis.navigator?.locks,limits={},coalesceMs=50}={}){
    const bounds={...LIMITS,...limits},epoch=crypto.randomUUID(),started=monotonic();let pending=[],lane=Promise.resolve(),writing=false,scheduled=false,failed=0,dropped=0,uncertain=0,lastStorageErrorName=null,slowOperations=0,lastStorageLatencyMs=null,lastLockWaitMs=null;
    const version=chrome?.runtime?.getManifest?.().version||'unknown';
    const bounded=p=>{let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('trace incomplete'),{code:'TRACE_TIMEOUT'})),1000);})]).finally(()=>clearTimeout(timer));};
    const status=()=>({storageFailures:failed,uncommitted:pending.length,droppedBeforeCommit:dropped,unconfirmedWrites:uncertain,lastStorageErrorName,slowOperations,lastStorageLatencyMs,lastLockWaitMs});
    const warn=()=>{console.warn('REDOWN startup trace incomplete: local diagnostic storage unavailable.',lastStorageErrorName||'UnknownError');};
    async function storageOperation(promise){
      const started=monotonic();let expired=false;
      const timer=setTimeout(()=>{expired=true;slowOperations++;uncertain++;},1000);
      try{return await promise;}finally{clearTimeout(timer);lastStorageLatencyMs=monotonic()-started;if(expired)uncertain=Math.max(0,uncertain-1);}
    }
    async function write(){
      if(writing)return;writing=true;
      try{while(pending.length){
        const batch=pending.splice(0),lost=dropped,failures=failed,unconfirmed=uncertain;
        const commit=async()=>{
          const s=(await storageOperation(chrome.storage.local.get(KEY)))[KEY]||{},events=(Array.isArray(s.events)?s.events:[]).map(clean),existing=new Set(events.map(e=>e.id));
          const additions=batch.filter(e=>!existing.has(e.id));
          if(context==='worker'&&s.lastWorker?.epoch!==epoch){
            if(uuid(s.lastWorker?.epoch)&&!s.lastWorker.graceful)events.push(clean({id:crypto.randomUUID(),at:new Date(now()).toISOString(),workerEpoch:epoch,contextEpoch:epoch,previousEpoch:s.lastWorker.epoch,component:'worker',stage:'lifecycle',code:'PREVIOUS_EPOCH_STOPPED_REASON_UNKNOWN',status:'unknown',version}));
          }
          events.push(...additions);events.sort((a,b)=>(Date.parse(a.at)||0)-(Date.parse(b.at)||0));
          let expired=0,evicted=0;const kept=events.filter(e=>{if(!e.at||Date.parse(e.at)<now()-bounds.retentionMs){expired++;return false;}return true;});
          while(kept.length>bounds.records){kept.shift();evicted++;}
          let bytes=JSON.stringify(kept).length;while(bytes>bounds.bytes&&kept.length){const e=kept.shift();bytes-=JSON.stringify(e).length+1;evicted++;}
          const total=k=>Number.isSafeInteger(s[k])&&s[k]>=0?s[k]:0;
          const lastWorker=context==='worker'?{epoch,at:new Date(now()).toISOString(),graceful:false}:uuid(s.lastWorker?.epoch)?{epoch:s.lastWorker.epoch,at:Number.isFinite(Date.parse(s.lastWorker.at))?new Date(Date.parse(s.lastWorker.at)).toISOString():null,graceful:s.lastWorker.graceful===true}:null;
          await storageOperation(chrome.storage.local.set({[KEY]:{schemaVersion:1,events:kept,lastWorker,dropped:total('dropped')+evicted+lost,expired:total('expired')+expired,storageFailures:total('storageFailures')+failures,unconfirmedWrites:total('unconfirmedWrites')+unconfirmed,...(lastStorageErrorName?{lastStorageErrorName}:{})}}));
        };
        try{const queued=monotonic();const locked=()=>{lastLockWaitMs=monotonic()-queued;return commit();};await (locks?.request?locks.request('redown-startup-crash-trace-v1',locked):locked());dropped=Math.max(0,dropped-lost);failed=Math.max(0,failed-failures);uncertain=Math.max(0,uncertain-unconfirmed);}
        catch(error){lastStorageErrorName=names.has(error?.name)?error.name:'UnknownError';failed++;if(error?.code==='TRACE_TIMEOUT')uncertain+=batch.length;else dropped+=batch.length;record({component:'storage',stage:'fault',code:'TRACE_STORAGE_FAILED',status:'rejected',error});warn();break;}
      }}finally{writing=false;}
    }
    function record(input={}){
      try{const event=clean({...input,id:crypto.randomUUID(),at:new Date(now()).toISOString(),contextEpoch:epoch,workerEpoch:context==='worker'?epoch:undefined,version,elapsedMs:monotonic()-started,monotonicMs:monotonic(),errorName:input.error?.name||input.errorName,sourceFrames:frames(input.error).length?frames(input.error):input.sourceFrames});
        try{globalThis.RedownFlightRecorder?.startup(event);}catch{console.warn("REDOWN flight observer incomplete; startup trace continues.");}
        if(pending.length>=bounds.pending){dropped++;return;}pending.push(event);
        if(!scheduled&&!writing){scheduled=true;lane=lane.catch(()=>{}).then(async()=>{if(coalesceMs)await new Promise(r=>setTimeout(r,coalesceMs));scheduled=false;await write();});}
      }catch{dropped++;}
    }
    async function snapshot(){
      try{const stored=(await bounded(chrome.storage.local.get(KEY)))[KEY]||{},all=(Array.isArray(stored.events)?stored.events:[]).map(clean),recent=all.filter(e=>e.at&&Date.parse(e.at)>=now()-bounds.retentionMs),events=recent.slice(-bounds.records);
        return {schemaVersion:1,scope:'Private startup observations; no browser crash confirmation or provider proof',collectedAt:new Date(now()).toISOString(),status:'partial',limits:bounds,events,lastWorker:uuid(stored.lastWorker?.epoch)?{epoch:stored.lastWorker.epoch,at:Number.isFinite(Date.parse(stored.lastWorker.at))?new Date(Date.parse(stored.lastWorker.at)).toISOString():null,graceful:stored.lastWorker.graceful===true}:null,completeness:{droppedLowerBound:(Number(stored.dropped)||0)+dropped,expired:(Number(stored.expired)||0)+all.length-recent.length,unconfirmedWritesLowerBound:(Number(stored.unconfirmedWrites)||0)+uncertain,storageFailuresLowerBound:(Number(stored.storageFailures)||0)+failed,uncommitted:pending.length,lastStorageErrorName:names.has(stored.lastStorageErrorName)?stored.lastStorageErrorName:lastStorageErrorName,slowOperations,lastStorageLatencyMs,lastLockWaitMs,limitations:['A hard kill can lose uncommitted events; no crash cause can be inferred from missing evidence.','Pending counts cover this collector only; other contexts may have uncommitted events.','Unobserved epoch endings have unknown reasons; idle, reload, update and browser restart can look alike.','Counts are best-effort lower bounds; an interrupted or timed-out write might settle later.']}};
      }catch(error){lastStorageErrorName=names.has(error?.name)?error.name:'UnknownError';warn();return {schemaVersion:1,scope:'Startup observations',status:'unavailable',events:[],completeness:{traceIncomplete:true,...status()}};}
    }
    return {epoch,record,snapshot,async flush(){await lane;},get health(){return status();}};
  }
  function install(context){
    if(globalThis.RedownStartupTrace)return globalThis.RedownStartupTrace;
    const trace=create({context});globalThis.RedownStartupTrace=trace;
    const fault=(code,event)=>trace.record({component:context==='worker'?'worker':'page',stage:'fault',api:(context==='worker'?'worker.':'page.')+(code==='PAGE_ERROR'||code==='WORKER_ERROR'?'error':'unhandledrejection'),code,status:'rejected',error:event.error||event.reason,sourceFrames:frames({stack:(event.filename||'')+':'+(event.lineno||0)+':'+(event.colno||0)})});
    globalThis.addEventListener?.('error',e=>fault(context==='worker'?'WORKER_ERROR':'PAGE_ERROR',e));globalThis.addEventListener?.('unhandledrejection',e=>fault('UNHANDLED_REJECTION',e));
    if(context==='worker'){
      chrome.runtime.onSuspend?.addListener(()=>trace.record({component:'worker',stage:'lifecycle',api:'runtime.onSuspend',code:'WORKER_SUSPEND_OBSERVED',status:'unknown'}));
      chrome.runtime.onSuspendCanceled?.addListener(()=>trace.record({component:'worker',stage:'lifecycle',api:'runtime.onSuspendCanceled',code:'WORKER_SUSPEND_CANCELLED',status:'accepted'}));
    }else{
      trace.record({component:'page',stage:'document',code:'PAGE_OPEN',status:'started'});
      globalThis.addEventListener?.('pagehide',()=>trace.record({component:'page',stage:'document',code:'PAGE_HIDE',status:'unknown'}));
      const attach=()=>{const details=document.getElementById('startup-crash-trace');details?.addEventListener('toggle',async()=>{if(details.open)document.getElementById('startup-crash-trace-output').textContent=JSON.stringify(await trace.snapshot(),null,2);});};
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
    }
    return trace;
  }
  globalThis.RedownStartupCrashTrace={create,install,KEY,LIMITS,clean};
  if(typeof document!=='undefined'&&/\/(options|shelf)\.html$/.test(globalThis.location?.pathname||'')){globalThis.RedownFlightRecorderAPI?.install('page');install('page');}
})();
