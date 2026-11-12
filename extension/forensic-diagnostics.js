/* Automatic save-only forensic evidence. Separate bounded DB; no transfer actions. */
(() => {
  'use strict';
  const DB='redown-save-forensics-v1',HEALTH='redownForensicHealthV1';
  const LIMITS={records:4000,bytes:4*1024*1024,eventBytes:64*1024,queue:256,retentionMs:7*86400000};
  const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
  const scalar=(target,source,keys)=>{for(const key of keys)if(['string','number','boolean'].includes(typeof source?.[key])||source?.[key]===null)target[key]=source[key];return target;};
  const destinationKeys=['provider','accountId','accountName','bucketName','folderId','folderName','prefix','key','path','itemId','fileId','namespace','driveId','rootId','root','name','publicUrl'];
  function evidence(input={}){
    // Explicit fields only. Never enumerate auth, request headers, bodies or tokens.
    const out=scalar({},input,['provider','providerKind','sourceUrl','actualSourceUrl','srcUrl','linkUrl','pageUrl','frameUrl','url','finalUrl','routeChoice','menuItemId','sourceKind','mediaType','filename','name','type','size','bytes','total','offset','sent','acquired','phase','stage','outcome','reason','durationMs','ok','verified','status','code','message','stack','exceptionName','errorName','httpStatus','statusText','redirected','responseType','method','role','category','component','acquisition','retryAt','resumed','wakeRequested','storageArea','storageOperation','deliveryId','transferId','newVerified','duplicate','interruption','redirectPolicy','redirectOutcome','expectedMedia','contentType','contentLength','contentEncoding','sniff','decision','bodyKind']);
    if(input.error!==undefined)out.error=typeof input.error==='string'?input.error:scalar({},input.error,['name','message','stack','code','status']);
    if(input.source)out.source=scalar({},input.source,['url','sourceUrl','pageUrl','srcUrl','linkUrl','frameUrl','mediaType','name','downloadFilename','mime','size']);
    if(input.destination)out.destination=scalar({},input.destination,destinationKeys);
    else {const d=scalar({},input,destinationKeys.filter(k=>!['name','provider','publicUrl'].includes(k)));if(Object.keys(d).length)out.destination=d;}
    if(input.result)out.result=scalar({},input.result,[...destinationKeys,'proofVersion','revision','contentHash','bytes','etag']);
    if(input.verification)out.verification=scalar({},input.verification,['kind','key','bytes','etag']);
    if(input.headers)out.headers=scalar({},input.headers,['content-type','content-length','content-encoding','content-range','location','retry-after','etag','last-modified']);
    return out;
  }
  function capture(attemptId,kind,input){try{globalThis.redownForensicLedger?.record(attemptId,kind,input);}catch{/* Never affect a save. */}}
  function response(attemptId,value,role='source',method='GET'){
    if(!uuid(attemptId))return;
    try{const headers={};for(const key of ['content-type','content-length','content-encoding','content-range','location','retry-after','etag','last-modified']){const v=value.headers?.get(key);if(v!==null&&v!==undefined)headers[key]=v;}
      capture(attemptId,'http',{role,component:role==='source'?'source':'provider',httpStatus:value.status,statusText:value.statusText,finalUrl:value.url||undefined,redirected:value.redirected,responseType:value.type,method,headers});
    }catch{/* No header/body reads beyond the allowed response metadata. */}
  }
  function create({database=globalThis.indexedDB,healthStorage=globalThis.chrome?.storage?.local,now=()=>Date.now(),epoch=crypto.randomUUID(),limits={}}={}){
    const bounds={...LIMITS,...limits},lastStages=new Map();let connection,lane=Promise.resolve(),pending=0,failed=0,skipped=0,priorFailed=0,priorSkipped=0,lastFailureAt=null,healthUnknown=!healthStorage?.get;
    const bounded=promise=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('FORENSIC_STORAGE_TIMEOUT')),2000);})]).finally(()=>clearTimeout(timer));};
    const ready=bounded(Promise.resolve().then(()=>healthStorage?.get(HEALTH))).then(v=>{priorFailed=Number.isSafeInteger(v?.[HEALTH]?.pendingFailures)?v[HEALTH].pendingFailures:0;priorSkipped=Number.isSafeInteger(v?.[HEALTH]?.pendingDropped)?v[HEALTH].pendingDropped:0;lastFailureAt=Math.max(lastFailureAt||0,v?.[HEALTH]?.lastFailureAt||0)||null;}).catch(()=>{healthUnknown=true;});
    let healthBusy=false,healthDirty=false,lastHealthSignature=null;
    function health(){healthDirty=true;if(healthBusy)return;healthBusy=true;void ready.then(async()=>{while(healthDirty){healthDirty=false;const value={version:1,pendingFailures:Math.max(priorFailed,failed),pendingDropped:Math.max(priorSkipped,skipped),lastFailureAt,storageFailure:failed>0||priorFailed>0};const signature=JSON.stringify(value);if(signature!==lastHealthSignature){await healthStorage?.set({[HEALTH]:value});lastHealthSignature=signature;}}}).catch(()=>{healthUnknown=true;}).finally(()=>{healthBusy=false;});}
    function failure(reason='storage'){if(reason==='queue')skipped++;else failed++;lastFailureAt=now();health();console.warn('REDOWN forensic recording unavailable; evidence may be incomplete.');}
    async function open(){
      if(connection)return connection;
      if(!database)throw Error('FORENSIC_STORAGE_UNAVAILABLE');
      const request=database.open(DB,1);let abandoned=false;
      connection=bounded(new Promise((resolve,reject)=>{
        request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('events',{keyPath:'sequence',autoIncrement:true});db.createObjectStore('metadata',{keyPath:'id'});};
        request.onsuccess=()=>{const db=request.result;if(abandoned){db.close();return;}db.onversionchange=()=>{db.close();connection=null;};db.onclose=()=>{connection=null;};resolve(db);};
        request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('FORENSIC_STORAGE_BLOCKED'));
      })).catch(error=>{abandoned=true;connection=null;throw error;});return connection;
    }
    async function append(event,oversized=false){
      const db=await open(),failures=failed,drops=skipped;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(['events','metadata'],'readwrite'),events=tx.objectStore('events'),metadata=tx.objectStore('metadata');
        const request=metadata.get('state');
        request.onsuccess=()=>{
          const state=request.result||{id:'state',version:1,key:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),count:0,bytes:0,observed:0,dropped:0,expired:0,oversized:0,storageFailures:0,startedAt:now()};
          state.storageFailures=Math.max(state.storageFailures,priorFailed)+failures;state.dropped=Math.max(state.dropped,priorSkipped)+drops;state.observed++;
          if(oversized){state.dropped++;state.oversized++;}else {events.add(event);state.count++;state.bytes+=event.recordBytes;}
          const cursor=events.openCursor();cursor.onsuccess=()=>{
            const c=cursor.result;if(!c){metadata.put(state);return;}
            const expired=c.value.at<now()-bounds.retentionMs;
            if(expired||state.count>bounds.records||state.bytes>bounds.bytes){state.count--;state.bytes-=c.value.recordBytes;state.dropped++;if(expired)state.expired++;c.delete();c.continue();}else metadata.put(state);
          };
        };
        tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('FORENSIC_WRITE_FAILED'));
      });
      failed=Math.max(0,failed-failures);skipped=Math.max(0,skipped-drops);priorFailed=0;priorSkipped=0;health();
    }
    function record(attemptId,kind,input={}){
      if(!uuid(attemptId))return;
      try{
        const event={id:crypto.randomUUID(),attemptId,kind,at:now(),workerEpoch:epoch,data:evidence(input)};
        if(event.data.stage){const previous=lastStages.get(attemptId);event.data.durationMs=previous===undefined?'not_recorded':Math.max(0,event.at-previous);lastStages.set(attemptId,event.at);if(lastStages.size>bounds.records)lastStages.delete(lastStages.keys().next().value);}
        try{globalThis.RedownFlightRecorder?.save(event);}catch{console.warn("REDOWN capless observer incomplete; existing forensic capture continues.");}
        event.recordBytes=new TextEncoder().encode(JSON.stringify(event)).length+64;
        if(pending>=bounds.queue){failure('queue');return;}
        pending++;
        lane=lane.catch(()=>{}).then(async()=>{await ready;await bounded(append(event,event.recordBytes>bounds.eventBytes));}).catch(()=>failure()).finally(()=>{pending--;});
      }catch{failure('queue');}
    }
    async function snapshot(){
      await ready;const db=await open();
      const stored=await bounded(new Promise((resolve,reject)=>{const tx=db.transaction(['events','metadata'],'readonly'),records=tx.objectStore('events').getAll(),meta=tx.objectStore('metadata').get('state');tx.oncomplete=()=>resolve({records:records.result,state:meta.result});tx.onabort=tx.onerror=()=>reject(tx.error||Error('FORENSIC_READ_FAILED'));}));
      const state=stored.state||{},records=stored.records.filter(r=>r.at>=now()-bounds.retentionMs),expiredOnRead=stored.records.length-records.length;
      return {schemaVersion:1,collectedAt:now(),scope:'Automatically observed REDOWN save operations only; no remote probes',collection:'automatic-by-default',limits:bounds,records,correlationKey:state.key||null,completeness:{state:'partial',storedRecords:records.length,committedRecordAttempts:state.observed||0,countsAreLowerBounds:true,droppedRecords:Math.max(state.dropped||0,priorSkipped)+skipped+expiredOnRead,expiredRecords:(state.expired||0)+expiredOnRead,oversizedRecords:state.oversized||0,unconfirmedWriteCount:Math.max(state.storageFailures||0,priorFailed)+failed,storageFailureCount:Math.max(state.storageFailures||0,priorFailed)+failed,storageFailure:failed>0||priorFailed>0,healthUnknown,lastFailureAt,pendingRecords:pending,limitations:['Unobserved stages/URLs/errors are not_recorded, never reconstructed.','A crash before a diagnostic commit can lose events; completeness cannot be guaranteed.','Failed/timed-out writes are unconfirmed, not included in the known dropped count; a late commit is possible.','Loss/failure counts are lower bounds across crashes or unavailable health storage; pending health is merged without counting acknowledged debt twice.','Export reads committed metadata; no worker is activated or transfer retried.']}};
    }
    return {record,snapshot,async flush(){await lane;},get health(){return {pending,failed,lastFailureAt,healthUnknown};}};
  }
  const stages=new Set(['CLICK_RECEIVED','ROUTE_RESOLVED','AUTH_CHECKED','ADMITTED','SOURCE_REQUEST','PROVIDER_WRITE','REMOTE_VERIFY','HISTORY_COMMIT','COUNTER_COMMIT','TERMINAL']);
  const providers=new Set(['google','dropbox','onedrive','cloudflare','unknown']);
  async function build(snapshot,mode,legacy=[]){
    if(!['RAW','SECURE'].includes(mode))throw Error('INVALID_FORENSIC_EXPORT');
    const {correlationKey,records,...metadata}=structuredClone(snapshot);
    let key;if(correlationKey)key=await crypto.subtle.importKey('raw',Uint8Array.from(correlationKey.match(/../g),v=>parseInt(v,16)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const identify=async value=>typeof value==='string'&&key?Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join(''):'not_recorded';
    const secure=async record=>{
      const d=record.data||{},data={};
      if(providers.has(d.provider||d.providerKind))data.provider=d.provider||d.providerKind;
      if(stages.has(d.stage))data.stage=d.stage;
      for(const k of ['durationMs','bytes','total','offset','sent','acquired','size','retryAt','httpStatus'])if(Number.isFinite(d[k]))data[k]=d[k];
      for(const k of ['ok','verified','redirected','newVerified','duplicate','resumed','wakeRequested'])if(typeof d[k]==='boolean')data[k]=d[k];
      if(['queued','active','completed','failed','blocked','uncertain','interrupted','cancelled','awaiting-auth'].includes(d.status))data.status=d.status;
      if(['COMPLETED','FAILED','BLOCKED','UNCERTAIN','INTERRUPTED','CANCELLED'].includes(d.outcome))data.outcome=d.outcome;
      if(['source','provider','runtime','permissions','unattributed'].includes(d.component))data.component=d.component;else data.component='unattributed';
      Object.assign(data,globalThis.RedownSaveEvidence?.sanitize({code:d.code||d.reason||(d.error?globalThis.RedownSaveEvidence?.classify(d.error):undefined),phase:d.phase,storageArea:d.storageArea,storageOperation:d.storageOperation,exceptionName:d.exceptionName||d.error?.name,category:d.category,role:d.role,method:d.method})||{});
      const urls={sourceId:d.sourceUrl||d.source?.sourceUrl||d.source?.url,srcId:d.srcUrl,pageId:d.pageUrl||d.source?.pageUrl,linkId:d.linkUrl,finalUrlId:d.finalUrl,redirectId:d.headers?.location,destinationId:d.destination?JSON.stringify(d.destination):undefined,errorId:d.error?JSON.stringify(d.error):d.message};
      for(const [name,value] of Object.entries(urls))if(value!==undefined)data[name]=await identify(value);
      return {sequence:record.sequence,attemptId:uuid(record.attemptId)?record.attemptId:'not_recorded',workerEpoch:uuid(record.workerEpoch)?record.workerEpoch:'not_recorded',at:record.at,kind:['click','stage','observation','error','http','route','provider-checkpoint','receipt','accounting','restart','reconcile'].includes(record.kind)?record.kind:'observation',data};
    };
    const exported=mode==='RAW'?records:await Promise.all(records.map(secure));
    const ids=new Set(records.map(r=>r.attemptId));
    const preexisting=(Array.isArray(legacy)?legacy:[]).slice(-100).filter(a=>uuid(a.id)&&!ids.has(a.id)).map(a=>({attemptId:a.id,provider:providers.has(a.provider)?a.provider:'unknown',sourceUrl:'not_recorded',pageUrl:'not_recorded',error:'not_recorded',scope:'Legacy redacted trace; raw details were not collected',events:(a.events||[]).filter(e=>stages.has(e.stage)).map(e=>({stage:e.stage,at:Number.isFinite(e.at)?e.at:null,...(['COMPLETED','FAILED','BLOCKED','UNCERTAIN','INTERRUPTED','CANCELLED'].includes(e.outcome)?{outcome:e.outcome}:{})}))}));
    const payload={...metadata,view:mode,records:exported,preexistingAttempts:preexisting,missingEvidence:'Fields absent from observed records are not_recorded; no raw data is reconstructed from fingerprints.'};
    const date=new Date(snapshot.collectedAt).toISOString().slice(0,10);
    return {filename:'REDOWN-FORENSIC-'+mode+'-'+date+'.zip',files:{'forensics.json':JSON.stringify(payload,null,2)+'\n','README.md':'# REDOWN '+mode+' save diagnostics\n\n'+(mode==='RAW'?'PRIVATE: literal URLs, signed query secrets, account/destination identifiers and original errors may be present. Review locally before sharing.':'Redacted copy of the same locally stored forensic evidence. HMAC correlations do not expose literal URLs, destination identifiers or original errors.')+'\n\nNo cloud requests, repairs or upload retries. A stage entry is not independent remote proof. Bounded retention and storage failures prevent a completeness guarantee. Legacy raw details are not_recorded.\n'}};
  }
  globalThis.RedownForensicDiagnostics={create,capture,response,build,evidence,DB,HEALTH,LIMITS};
})();
