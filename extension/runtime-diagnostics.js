/* Runtime API 1.0. Deliberately independent of frozen project/debug APIs. */
(() => {
  const VERSION = '1.0.0';
  const operations = ['describe','snapshot','listTraces','exportSupport','clear'];
  const codes = new Set(['OK','HTTP_401','HTTP_403','HTTP_404','HTTP_409','HTTP_412','HTTP_429','HTTP_5XX','NETWORK','TIMEOUT','CANCELLED','UNEXPECTED_RESPONSE','UNKNOWN']);
  function create({context='background',build='unknown',now=()=>Date.now(),monotonic=()=>performance.now(),id=()=>crypto.randomUUID()}={}) {
    context=["background","options","offline","offline-import"].includes(context)?context:"offline";
    build=String(build).slice(0,64);
    let enabled=false, events=[], sequence=0;
    const runId=id();
    const prune=()=>{const cutoff=now()-86400000;events=events.filter(e=>Date.parse(e.at)>=cutoff).slice(-256);};
    function record({operation='message',outcome='unknown',code='UNKNOWN',durationMs=0,status,requestId,parentId,attempt=1}={}) {
      if(!enabled)return;
      try {
        // No arbitrary strings, URLs, identifiers, error text, bodies or destinations.
        const known=['message','api.read','api.write','auth.refresh','search.page','preview'];
        events.push({sequence:++sequence,at:new Date(now()).toISOString(),runId,requestId:/^[a-f0-9-]{36}$/.test(requestId||'')?requestId:id(),
          ...( /^[a-f0-9-]{36}$/.test(parentId||'')?{parentId}:{}),context,build,
          operation:known.includes(operation)?operation:'message',outcome:['success','failed','cancelled','unknown'].includes(outcome)?outcome:'unknown',
          code:codes.has(code)?code:'UNKNOWN',durationMs:Math.max(0,Math.min(3600000,Number(durationMs)||0)),
          attempt:Math.max(1,Math.min(10,Number(attempt)||1)),...(Number.isInteger(status)&&status>=100&&status<=599?{status}:{})});prune();
      } catch { /* Observability must never fail a product operation. */ }
    }
    function query(operation,input={}) {
      const requestId=id();
      const result=(state,data)=>({runtimeApiVersion:VERSION,requestId,runId,state,data});
      if(!input||typeof input!=='object'||Array.isArray(input))return result('failed',{code:'INVALID_INPUT'});
      if(!operations.includes(operation))return result('unsupported',{code:'UNSUPPORTED_OPERATION'});
      if(operation==='describe')return result('available',{operations,adapter:context,permissions:['storage'],sideEffects:'local diagnostics only; no remote requests',limits:{events:256,retentionMs:86400000,exportBytes:196608},unsupported:['cloud probes','transfer verification','preview state','durable task recovery']});
      if(operation==='clear'){events=[];return result('available',{cleared:true});}
      prune();
      if(operation==='snapshot')return result(enabled?'partial':'unavailable',{build,context,collection:enabled?'enabled':'disabled',eventCount:events.length,components:{authorization:'unknown',api:'unknown',worker:'unknown',bucket:'unknown',explorer:'unknown',preview:'unknown'},freshness:'observations only; no health probe'});
      if(operation==='listTraces'){
        const {after=0,limit=50}=input;
        if(!Number.isInteger(after)||after<0||!Number.isInteger(limit)||limit<1||limit>100)return result('failed',{code:'INVALID_INPUT'});
        const page=events.filter(e=>e.sequence>after).slice(0,limit);
        return result(enabled?'available':'unavailable',{events:page,nextAfter:page.at(-1)?.sequence??after,oldestSequence:events[0]?.sequence??null});
      }
      return result(enabled?'partial':'unavailable',{schemaVersion:VERSION,scope:'passive-runtime',build,exportedAt:new Date(now()).toISOString(),events:structuredClone(events),limitations:['No object names or credentials collected','In-memory traces reset on service-worker restart','No installed-Chrome or live-cloud certification']});
    }
    return {record,query,monotonic,setEnabled(value){enabled=value===true;if(!enabled)events=[];}};
  }
  globalThis.RedownRuntimeDiagnostics={VERSION,create};
})();

/* Bounded save-attempt observations, alongside the existing runtime diagnostics.
 * Fixed enums only: never copy native IDs, URLs, errors, accounts or object names. */
(() => {
  const stages=new Set(['CLICK_RECEIVED','ROUTE_RESOLVED','AUTH_CHECKED','ADMITTED','SOURCE_REQUEST','PROVIDER_WRITE','REMOTE_VERIFY','HISTORY_COMMIT','COUNTER_COMMIT','TERMINAL']);
  const terminals=new Set(['COMPLETED','FAILED','BLOCKED','CANCELLED','UNCERTAIN','INTERRUPTED']);
  const reasons=new Set(['OK','ROUTE_REJECTED','PREFLIGHT_FAILED','PROVIDER_FAILED','AUTH_PENDING','QUEUE_FULL','HISTORY_UNAVAILABLE','STORAGE_UNAVAILABLE','WORKER_RESTART','UNCONFIRMED','DIAGNOSTICS_UNAVAILABLE']);
  const reasonAllowed=value=>reasons.has(value)||globalThis.RedownSaveEvidence?.code(value)!==undefined&&globalThis.RedownSaveEvidence.code(value)!=='PROVIDER_FAILED';
  const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
  function createAttempts({storage,now=()=>Date.now(),id=()=>crypto.randomUUID(),timeoutMs=1000}={}){
    const key='redownSaveAttempts',clicks=new WeakMap();let attempts=[],unavailable=false,lane=Promise.resolve(),writing=false,dirty=false;
    const bounded=async p=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('diagnostics unavailable')),timeoutMs);})]);}finally{clearTimeout(timer);}};
    const signal=()=>{unavailable=true;console.warn('REDOWN save attempt diagnostics unavailable; inspect extension Errors.');};
    const clean=a=>{
      if(!uuid(a?.id)||!['cloudflare','google','dropbox','onedrive','unknown'].includes(a.provider))return null;
      const events=(Array.isArray(a.events)?a.events:[]).filter(e=>stages.has(e.stage)&&Number.isFinite(e.at)).slice(-24).map(e=>({stage:e.stage,at:e.at,...(Number.isFinite(e.durationMs)?{durationMs:Math.max(0,Math.min(86400000,e.durationMs))}:{}),...(terminals.has(e.outcome)?{outcome:e.outcome}:{}),...(reasonAllowed(e.reason)?{reason:e.reason}:{})}));
      return {id:a.id,provider:a.provider,events,...(/^[a-f0-9]{64}$/.test(a.sourceId||'')?{sourceId:a.sourceId}:{}),sourceEvidence:globalThis.RedownSaveEvidence?.sanitize(a.sourceEvidence)||{},observations:(Array.isArray(a.observations)?a.observations:[]).slice(-20).filter(o=>Number.isFinite(o.at)).map(o=>({at:o.at,...(globalThis.RedownSaveEvidence?.sanitize(o)||{})}))};
    };
    const ready=(async()=>{
      try{
        const saved=await bounded(storage.get(key));
        const old=(Array.isArray(saved[key])?saved[key]:[]).slice(-100).map(clean).filter(Boolean);
        for(const a of old)if(a.events.at(-1)?.stage!=='TERMINAL'){globalThis.RedownForensicDiagnostics?.capture(a.id,'restart',{component:'runtime',interruption:'observer-restart',reason:'WORKER_RESTART'});a.events.push({stage:'TERMINAL',at:now(),outcome:'INTERRUPTED',reason:'WORKER_RESTART'});}
        attempts=[...old.filter(a=>!attempts.some(b=>b.id===a.id)),...attempts].slice(-100);
      }catch{signal();}
    })();
    function persist(){
      dirty=true;if(writing)return;writing=true;
      lane=(async()=>{await ready;while(dirty){dirty=false;await bounded(storage.set({[key]:structuredClone(attempts)}));}})()
        .catch(()=>{dirty=false;signal();}).finally(()=>{writing=false;if(dirty)persist();});
    }
    function stage(attemptId,stage,extra={}){
      if(stages.has(stage))globalThis.RedownForensicDiagnostics?.capture(attemptId,'stage',{stage,...extra});
      const a=attempts.find(a=>a.id===attemptId);
      if(!a||!stages.has(stage)||a.events.at(-1)?.stage==='TERMINAL')return;
      if(a.events.at(-1)?.stage===stage)return;
      const at=now(),previous=a.events.at(-1)?.at??at;
      a.events.push({stage,at,durationMs:Math.max(0,Math.min(86400000,at-previous)),...(terminals.has(extra.outcome)?{outcome:extra.outcome}:{}),...(reasonAllowed(extra.reason)?{reason:extra.reason}:{})});
      if(a.events.length>24)a.events=[a.events[0],...a.events.slice(-23)];persist();
    }
    let sourceKey;
    const fingerprint=async value=>{
      const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return null;
      if(!sourceKey)sourceKey=(async()=>{
        const name='redownSourceFingerprintKeyV1',stored=await bounded(storage.get(name));let raw=stored[name];
        if(typeof raw!=='string'||!/^[a-f0-9]{64}$/.test(raw)){raw=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');await bounded(storage.set({[name]:raw}));}
        return crypto.subtle.importKey('raw',Uint8Array.from(raw.match(/../g),v=>parseInt(v,16)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      })();
      const key=await sourceKey,result=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(u.origin+u.pathname+u.search));
      return Array.from(new Uint8Array(result),b=>b.toString(16).padStart(2,'0')).join('');
    };
    function observe(attemptId,input,captured=false){
      if(!captured)globalThis.RedownForensicDiagnostics?.capture(attemptId,'observation',input);
      try{const a=attempts.find(a=>a.id===attemptId),safe=globalThis.RedownSaveEvidence?.sanitize(input);if(!a||!safe||!Object.keys(safe).length)return;
        if(safe.sourceId)a.sourceId=safe.sourceId;
        if(safe.role==='source'||safe.phase==='source')a.sourceEvidence={...(a.sourceEvidence||{}),...safe};
        a.observations=[...(a.observations||[]),{at:now(),...safe}].slice(-20);persist();
      }catch{/* Evidence cannot block transfer. */}
    }
    return {ready,observe,
      begin(info){
        if(clicks.has(info))return clicks.get(info);
        const attemptId=id(),menu=String(info?.menuItemId||'');
        const provider=menu.startsWith('provider:google-drive')?'google':menu.startsWith('provider:dropbox')?'dropbox':menu.startsWith('provider:onedrive')?'onedrive':/^(v3:|quick:|simple-option:|nested:|tree:)/.test(menu)?'cloudflare':'unknown';
        globalThis.RedownForensicDiagnostics?.capture(attemptId,'click',{provider,sourceUrl:info.srcUrl||info.linkUrl||info.pageUrl,srcUrl:info.srcUrl,linkUrl:info.linkUrl,pageUrl:info.pageUrl,frameUrl:info.frameUrl,mediaType:info.mediaType,sourceKind:info.mediaType||'context-menu',filename:info.downloadFilename,menuItemId:menu,stage:'CLICK_RECEIVED'});
        clicks.set(info,attemptId);attempts.push({id:attemptId,provider,events:[{stage:'CLICK_RECEIVED',at:now()}]});attempts=attempts.slice(-100);persist();
        void fingerprint(info.srcUrl||info.linkUrl||info.pageUrl||'').then(sourceId=>{if(sourceId)observe(attemptId,{sourceId});}).catch(()=>{});return attemptId;
      },
      forClick:info=>clicks.get(info),stage,
      dispatched:attemptId=>attempts.find(a=>a.id===attemptId)?.events.some(e=>e.stage==='PROVIDER_WRITE')===true,
      phase(attemptId,phase,details){globalThis.RedownForensicDiagnostics?.capture(attemptId,'provider-checkpoint',{phase,...details});const step={source:'SOURCE_REQUEST',uploading:'PROVIDER_WRITE',committing:'PROVIDER_WRITE',verifying:'REMOTE_VERIFY'}[phase];if(step)stage(attemptId,step);},
      reconcile(attemptId){globalThis.RedownForensicDiagnostics?.capture(attemptId,'reconcile',{component:'runtime',phase:'history'});const a=attempts.find(a=>a.id===attemptId),last=a?.events.at(-1);if(last?.stage==='TERMINAL'&&last.outcome==='COMPLETED'&&last.reason==='HISTORY_UNAVAILABLE'){a.events.pop();persist();}},
      finish(attemptId,outcome,reason='UNCONFIRMED'){stage(attemptId,'TERMINAL',{outcome,reason});},
      async snapshot(){await ready;return {schemaVersion:1,scope:'save-attempt-observations',persistence:unavailable?'unavailable':'available',fallback:unavailable?'Inspect extension Errors; saving remains independent.':null,attempts:structuredClone(attempts),limitations:['Stage entry is not remote completion proof.','Interrupted means the observer restarted; inspect provider receipts before retrying.','No native event can be observed when Chrome does not deliver it.']};},
      async flush(){await lane;}
    };
  }
  globalThis.RedownRuntimeDiagnostics.createAttempts=createAttempts;
})();
