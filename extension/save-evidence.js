/* Fixed-field acquisition evidence shared by the existing provider owners. No URLs or bodies. */
(() => {
  'use strict';
  const codes=new Set(['ONEDRIVE_SOURCE_HTTP','ONEDRIVE_NOT_CONNECTED','ONEDRIVE_SOURCE_INVALID','ONEDRIVE_SOURCE_UNSAFE','ONEDRIVE_BROWSER_SOURCE_UNSUPPORTED','ONEDRIVE_INLINE_INVALID','ONEDRIVE_INLINE_EMPTY','ONEDRIVE_NETWORK','PREFLIGHT_FAILED','ROUTE_REJECTED','OK','PROVIDER_FAILED','SOURCE_RETURNED_HTML','SOURCE_HTTP_ERROR','SOURCE_NETWORK','SOURCE_PERMISSION_DENIED','SOURCE_LENGTH_INVALID','SOURCE_TRUNCATED','SOURCE_CHANGED','SOURCE_TIMEOUT','AUTH_REQUIRED','PERMISSION_DENIED','QUEUE_FULL','AUTH_PENDING','HISTORY_UNAVAILABLE','STORAGE_UNAVAILABLE','UNCONFIRMED','WORKER_RESTART','QUEUE_STALLED','ONEDRIVE_SOURCE_LENGTH_UNKNOWN','ONEDRIVE_SOURCE_BUFFER_LIMIT','ONEDRIVE_SOURCE_LENGTH_MISMATCH','ONEDRIVE_SOURCE_TRUNCATED','ONEDRIVE_SOURCE_ENCODING','ONEDRIVE_BUSY','ONEDRIVE_AUTH_PENDING','ONEDRIVE_CLICK_AGAIN','ONEDRIVE_COMMIT_UNCERTAIN','ONEDRIVE_PROOF_UNCERTAIN','ONEDRIVE_WORKER_INTERRUPTED']);
  function code(value){
    if(codes.has(value))return value;
    if(/^ONEDRIVE_GRAPH_(401|403|404|409|429|507)$/.test(value||''))return value;
    return 'PROVIDER_FAILED';
  }
  function classify(error){
    const alias={ONEDRIVE_SOURCE_HTTP:'SOURCE_HTTP_ERROR',ONEDRIVE_NOT_CONNECTED:'AUTH_REQUIRED',ONEDRIVE_NETWORK:'SOURCE_NETWORK',ONEDRIVE_CANCELLED:'UNCONFIRMED'}[error?.code];if(alias)return alias;
    const explicit=code(error?.code);if(explicit!=='PROVIDER_FAILED')return explicit;
    const text=String(error?.message||error||''); // Matched locally; never retained or exported.
    if(/queue is full/i.test(text))return 'QUEUE_FULL';
    if(/login.*progress|sign-in.*pending/i.test(text))return 'AUTH_PENDING';
    if(/web page|text\/html|HTML/i.test(text))return 'SOURCE_RETURNED_HTML';
    if(/source.*length.*chang|source.*truncat|source.*ended before/i.test(text))return 'SOURCE_TRUNCATED';
    if(/source.*(permission|access).*grant|source access is needed/i.test(text))return 'SOURCE_PERMISSION_DENIED';
    if(/reconnect|authoriz|sign.in|not.connected|account changed/i.test(text))return 'AUTH_REQUIRED';
    if(/source.*(fetch|unavailable)/i.test(text))return 'SOURCE_NETWORK';
    if(error?.http===401)return 'AUTH_REQUIRED';if(error?.http===403)return 'PERMISSION_DENIED';
    return 'PROVIDER_FAILED';
  }
  const mimes=new Set(['image/png','image/jpeg','image/gif','image/webp','image/avif','image/svg+xml','text/html','application/xhtml+xml','application/octet-stream','application/pdf','application/zip','text/plain','video/mp4','audio/mpeg']);
  function sanitize(input={}){
    if(!input||typeof input!=='object'||Array.isArray(input))return {};
    const out={};
    if(input.code!==undefined)out.code=code(input.code);
    for(const k of ['status','httpStatus'])if(Number.isInteger(input[k])&&input[k]>=100&&input[k]<=599)out[k]=input[k];
    for(const [k,allowed] of Object.entries({decision:['recovered','blocked','failed','uncertain','cancelled','interrupted'],expectedMedia:['image','video','audio','unknown'],sniff:['image','html','other','empty','not-read'],role:['source','provider'],phase:['source','queued','auth','starting','session','uploading','committing','verifying','history','wake','alarm','pump'],method:['GET','HEAD','POST','PUT'],contentType:[...mimes,'other','absent'],contentLength:['present','absent','invalid'],contentEncoding:['identity','gzip','br','deflate','other','absent'],redirectPolicy:['error','follow','manual'],redirectOutcome:['not-followed','followed','unknown'],bodyKind:['html','bytes','empty','unknown'],sizeRange:['empty','under-1MiB','1-16MiB','over-16MiB','unknown'],acquisition:['stream','bounded-memory','worker-remote'],category:['auth','permission','rate-limit','server','source','unknown']})){
      if(allowed.includes(input[k]))out[k]=input[k];
    }
    if(Number.isFinite(input.retryAt)&&input.retryAt>=0)out.retryAt=input.retryAt;
    for(const k of ['resumed','wakeRequested'])if(typeof input[k]==='boolean')out[k]=input[k];
    if(typeof input.sourceId==='string'&&/^[a-f0-9]{64}$/.test(input.sourceId))out.sourceId=input.sourceId;
    return out;
  }
  function response(response,role='source',method='GET'){
    const raw=response.headers?.get('content-length'),n=Number(raw),type=(response.headers?.get('content-type')||'').split(';')[0].trim().toLowerCase(),encoding=(response.headers?.get('content-encoding')||'').toLowerCase();
    return sanitize({role,method,httpStatus:response.status,contentType:!type?'absent':mimes.has(type)?type:'other',contentLength:raw===null||raw===undefined?'absent':/^\d+$/.test(raw)&&Number.isSafeInteger(n)?'present':'invalid',contentEncoding:!encoding?'absent':['identity','gzip','br','deflate'].includes(encoding)?encoding:'other',redirectPolicy:'error',redirectOutcome:response.redirected?'followed':'not-followed'});
  }
  function note(attemptId,input){try{globalThis.redownSaveAttempts?.observe(attemptId,sanitize(input));}catch{}}
  function failure(attemptId,error,phase){note(attemptId,{code:classify(error),phase,decision:error?.status,httpStatus:error?.http,role:phase==='source'?'source':'provider'});}
  const fail=(c,message,status='blocked')=>Object.assign(Error(message),{code:c,status});
  async function read(reader,signal){
    let timer,abort;
    try{
      if(signal?.aborted)throw fail('SOURCE_NETWORK','Source read cancelled.','cancelled');
      return await Promise.race([reader.read(),new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(fail('SOURCE_TIMEOUT','The source stopped responding.','interrupted')),25000);
        abort=()=>reject(fail('SOURCE_NETWORK','Source read cancelled.','cancelled'));signal?.addEventListener('abort',abort,{once:true});
      })]);
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async function open(response,{attemptId,signal,expectedMedia='unknown'}={}){
    note(attemptId,{...globalThis.RedownSaveEvidence.response(response),phase:'source'});
    const reader=response.body?.getReader();
    try{
      if(!response.ok||!reader)throw fail('SOURCE_HTTP_ERROR','The source did not provide accessible file bytes.');
      const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
      if(mime==='text/html'||mime==='application/xhtml+xml'){note(attemptId,{phase:'source',expectedMedia,sniff:'not-read'});throw fail('SOURCE_RETURNED_HTML','The source returned a web page. Choose the actual accessible asset, not its page.');}
      const parts=[];let size=0,done=false;
      while(size<256){const part=await read(reader,signal);if(part.done){done=true;break;}if(part.value?.length){parts.push(part.value);size+=part.value.length;}}
      const sample=new Uint8Array(Math.min(size,256));let at=0;
      for(const p of parts){const n=Math.min(sample.length-at,p.length);sample.set(p.subarray(0,n),at);at+=n;if(at===sample.length)break;}
      const text=new TextDecoder().decode(sample).replace(/^\uFEFF/,'').trimStart();
      const markup=text.replace(/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*/i,'');
      const html=/^(?:<!doctype\s+html|<html(?:\s|>)|<head(?:\s|>)|<body(?:\s|>))/i.test(markup)||(expectedMedia==='image'||mime.startsWith('image/'))&&/^<(?:script|form|title|meta|div)(?:\s|>)/i.test(markup);
      if(html){note(attemptId,{phase:'source',expectedMedia,bodyKind:'html',sniff:'html'});throw fail('SOURCE_RETURNED_HTML','The source bytes are an HTML page. Choose the accessible file itself.');}
      const ascii=String.fromCharCode(...sample.subarray(0,12));
      const image=sample[0]===0x89&&ascii.slice(1,4)==='PNG'||sample[0]===255&&sample[1]===216&&sample[2]===255||/^GIF8[79]a/.test(ascii)||ascii.startsWith('RIFF')&&ascii.endsWith('WEBP')||/^<svg(?:\s|>)/i.test(markup);

      note(attemptId,{phase:'source',bodyKind:size?'bytes':'empty',expectedMedia,sniff:!size?'empty':image?'image':'other',acquisition:'stream'});
      let i=0;
      return {read:()=>i<parts.length?Promise.resolve({value:parts[i++],done:false}):done?Promise.resolve({done:true}):read(reader,signal),cancel:async()=>{let t;try{await Promise.race([reader.cancel(),new Promise(r=>{t=setTimeout(r,1000);})]);}finally{clearTimeout(t);}}};
    }catch(error){void reader?.cancel().catch(()=>{});failure(attemptId,error,'source');throw error;}
  }
  globalThis.RedownSaveEvidence={sanitize,response,note,failure,code,classify};
  globalThis.RedownSourceGuard={open,read,fail};
})();
