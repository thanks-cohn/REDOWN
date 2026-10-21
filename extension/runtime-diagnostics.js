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
