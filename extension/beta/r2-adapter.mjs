import {providerDefaults,validatePreferences,resolveOptions} from './configuration.mjs';
import {location,key,prefix,name,entry} from './file-api.mjs';
export function previewType(objectKey){
  const ext=objectKey.split('.').pop().toLowerCase();
  const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',pdf:'application/pdf',txt:'text/plain',json:'text/plain',md:'text/plain',csv:'text/plain'};
  return types[ext]||(['markdown','xml','html','htm','js','mjs','ts','tsx','jsx','css','yaml','yml','py','rs','go','java','c','cpp','h','sh','bat','ps1','log'].includes(ext)?'text/plain':ext==='svg'?'image/svg+xml':null);
}
export function createR2Adapter({send=message=>chrome.runtime.sendMessage(message),http=globalThis.RedownCloudflareApi}={}) {
  async function message(type,input={},options={}) {
    options.signal?.throwIfAborted();
    let timer,abort,dispatched=false;const writes=['cfTransferObjects','cfRenameEntry','cfDeleteObjects','cfCreateFolder','ingest','cfCreateBucket','cfProvision','cfExtractArchive'].includes(type);
    try {
      const transport=Promise.resolve().then(()=>{options.signal?.throwIfAborted();dispatched=true;return send({type,...input,...(['cfTransferObjects','cfRenameEntry','cfDeleteObjects','cfCreateFolder','ingest','cfArchiveEntries','cfExtractArchive'].includes(type)?{betaNoProvision:true}:{})});}).catch(error=>{if(writes&&dispatched)throw Object.assign(new Error('Connection lost before a final result. Refresh both locations before retrying.'),{uncertain:true,cause:error});throw error;});
      const result=await Promise.race([transport,new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(Object.assign(Error(writes?'No final response. Refresh both locations before retrying; the operation may have changed files.':'No final response. Refresh and try the read again.'),{uncertain:writes&&dispatched})),options.messageTimeoutMs??providerDefaults.messageTimeoutMs);
        abort=()=>reject(Object.assign(new Error(writes&&dispatched?'Cancellation requested after dispatch. The cloud operation may still complete; inspect before retrying.':'Operation cancelled.'),{name:'AbortError',uncertain:writes&&dispatched}));
        options.signal?.addEventListener('abort',abort,{once:true});
        if(options.signal?.aborted)abort();
      })]);
      if(!result?.ok)throw Object.assign(Error(result?.error || 'Cloudflare did not confirm this request.'),{code:result?.code || result?.diagnosticError?.code,uncertain:writes&&(/did not confirm|may have|not confirmed|timed out|fetch failed|failed to fetch|network/i.test(result?.error||'')||/EXPLORER_(REQUEST_TIMEOUT|RESULT_UNCONFIRMED|NETWORK_ERROR)/.test(result?.diagnosticError?.code||result?.code||''))});
      return result;
    } finally {clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
  }

  const base=l=>`/accounts/${encodeURIComponent(l.accountId)}/r2/buckets/${encodeURIComponent(l.bucketName)}/objects`;
  async function page(target,p='',cursor='',delimiter='/',options={}) {
    const l=location(target),query=new URLSearchParams({per_page:'1000'});
    if(p)query.set('prefix',p);
    if(cursor)query.set('cursor',cursor);
    if(delimiter)query.set('delimiter',delimiter);
    const response=await http.request(base(l)+'?'+query,{signal:options.signal,timeoutMs:options.requestTimeoutMs??providerDefaults.requestTimeoutMs});
    const body=await response.json().catch(()=>null);
    if(!response.ok || body?.success===false){
      // Like Legacy listObjectsPage, retain the provider's diagnostic rather
      // than replacing e.g. 10023 with a generic HTTP 400 message.
      const details=(Array.isArray(body?.errors)?body.errors:[]).map(error=>{
        const code=String(error.code||'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,40);
        const message=String(error.message||'').replace(/Bearer\s+\S+/gi,'Bearer [redacted]').replace(/https?:\/\/\S+/gi,'[URL]').replace(/((?:access_token|refresh_token|authorization|token|secret)\s*[=:]\s*)\S+/gi,'$1[redacted]').slice(0,240);
        return [code,message].filter(Boolean).join(': ');
      }).join('; ');
      const guidance=response.status===401?'Cloudflare session expired. Reconnect Cloudflare.':response.status===403?'Cloudflare denied access. Check account authorization.':response.status===404?'This bucket may no longer exist. Refresh connection discovery.':'Retry Refresh; no files were changed.';
      throw Object.assign(Error(`Cloudflare could not list this folder (HTTP ${response.status}). ${details} ${guidance}`),{code:'HTTP_'+response.status});
    }
    // Legacy accepts both REST envelopes and the top-level objects shape.
    const result=body?.result ?? body,info=body?.result_info || {};
    const objects=Array.isArray(result)?result:result?.objects;
    if(!Array.isArray(objects))throw Error('Cloudflare returned an unreadable listing. Retry Refresh; no files were changed.');
    const next=result?.cursor || info.cursor || '';
    if(typeof next!=='string')throw Error('Cloudflare returned an invalid continuation token. Retry Refresh.');
    const truncated=Boolean(result?.truncated ?? info.is_truncated);
    if(cursor && cursor===next || truncated&&!next)throw Error('Cloudflare returned an incomplete page. Refresh before changing files.');
    return {objects,delimited:Array.isArray(result?.delimited)?result.delimited:Array.isArray(info.delimited)?info.delimited:[],cursor:next};
  }
  async function stat({source,key:k},options={}) {
    const exact=key(k);let cursor='';const seen=new Set();let pages=0;
    do {if(++pages>1000)throw Error('Metadata lookup exceeded its page limit.');const p=await page(source,exact,cursor,'',options);const object=p.objects.find(o=>(o.key||o.name)===exact);if(object)return {object:{...object,key:exact}};cursor=p.cursor;if(seen.has(cursor)&&cursor)throw Error('Repeated metadata page.');seen.add(cursor);}while(cursor);
    return {object:null};
  }
  async function verifyUpload(l,staging,file,options) {
    const {onProgress}=options;
    const deadline=AbortSignal.timeout(options.verificationTimeoutMs);
    const signal=AbortSignal.any([deadline,...(options.signal?[options.signal]:[])]);
    let lastProgress=0;
    async function read(reader){
      let timer,abort;
      try{return await Promise.race([reader.read(),new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(Error('Upload verification stalled. Inspect the temporary upload before retrying.')),options.verificationIdleTimeoutMs);
        abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});
        if(signal.aborted)abort();
      })]);}finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
    }
    const response=await http.request(base(l)+'/'+staging.split('/').map(encodeURIComponent).join('/'),{signal,timeoutMs:options.requestTimeoutMs});
    if(!response.ok || !response.body){await response.body?.cancel();throw Error('Uploaded bytes could not be read back.');}
    const remote=response.body.getReader(),local=file.stream().getReader();
    let expected=new Uint8Array(),offset=0,verified=0;
    try {
      while(true){
        signal?.throwIfAborted();const chunk=await read(remote);if(chunk.done)break;
        if(verified+chunk.value.length>file.size)throw Error('Upload read-back contains extra bytes.');
        for(let index=0;index<chunk.value.length;){
          if(offset===expected.length){const next=await read(local);if(next.done)throw Error('Upload read-back contains extra bytes.');expected=next.value;offset=0;}
          const length=Math.min(expected.length-offset,chunk.value.length-index);
          for(let j=0;j<length;j++)if(expected[offset+j]!==chunk.value[index+j])throw Error('Upload read-back differs from the original file.');
          index+=length;offset+=length;verified+=length;
        }
        if(verified===file.size||Date.now()-lastProgress>=options.progressIntervalMs){lastProgress=Date.now();onProgress?.({phase:'verifying',bytes:verified,totalBytes:file.size});}
      }
      if(verified!==file.size)throw Error('Upload read-back ended early.');
    } finally {await Promise.allSettled([remote.cancel(),local.cancel()]);}
  }
  async function transfer(operation,{source,destination,entries,conflict='skip'},options) {
    const s=location(source),d=location(destination);
    if(!['skip','keep','replace'].includes(conflict))throw Error('Choose a conflict policy.');
    const selected=entries.map(entry);if(!selected.length)throw Error('Select at least one item.');
    const same=s.accountId===d.accountId&&s.bucketName===d.bucketName;
    for(const e of selected){
      const original=e.key.replace(/\/$/,''),leaf=original.slice(original.lastIndexOf('/')+1);
      if(same&&d.prefix+leaf+(e.folder?'/':'')===e.key){
        if(operation==='move')throw Error('Source and destination are the same. No files were changed.');
        if(conflict!=='keep')return {completed:0,conflicts:[{sourceKey:e.key,destinationKey:e.key,status:'conflict'}]};
        const dot=e.folder?-1:leaf.lastIndexOf('.');
        const duplicate=(dot>0?leaf.slice(0,dot):leaf)+' (copy)'+(dot>0?leaf.slice(dot):'');
        e.destinationKey=d.prefix+duplicate+(e.folder?'/':'');
      }
    }
    return message('cfTransferObjects',{operation,source:s,destination:d,entries:selected,conflict},options);
  }
  return {
    crossBucketCopy:true,
    configuration:{defaults:providerDefaults,validate:validatePreferences,resolve:resolveOptions},
    async connectionStatus({source},options={}){
      const l=location(source),result=await message('profiles',{},options);
      const profile=(result.profiles||[]).find(p=>p.type==='cloudflare-r2'&&p.accountId===l.accountId&&(p.bucketName||p.defaultBucketName)===l.bucketName);
      if(!profile?.workerUrl||!profile?.token||!(profile.workerVersion>=5))return {ready:false,reason:'This bucket can be browsed, but file changes need its REDOWN Worker. Use Set up right-click destination.'};
      const response=await http.boundedFetch(profile.workerUrl,{timeoutMs:options.requestTimeoutMs??providerDefaults.requestTimeoutMs,signal:options.signal,method:'POST',cache:'no-store',headers:{authorization:'Bearer '+profile.token,'content-type':'application/json','cache-control':'no-cache'},body:JSON.stringify({action:'capabilities'})});
      const capabilities=await response.json().catch(()=>({}));
      if(response.status===401||response.status===403)return {ready:false,reason:'The bucket Worker rejected its saved authorization. Explicit destination setup is required.'};
      if(!response.ok)throw Error('Bucket Worker connection failed (HTTP '+response.status+'). Refresh before attempting changes.');
      const ready=capabilities.ok===true&&capabilities.workerVersion>=5&&capabilities.safeTransfers===true&&capabilities.storageBound===true;
      return {ready,reason:ready?'Bucket Worker is ready for safe file operations.':'Bucket Worker configuration needs an explicit update. Use Set up right-click destination.'};
    },
    connect:(_,o)=>message('cfConnect',{},o),disconnect:(_,o)=>message('cfDisconnect',{},o),
    accounts:(_,o)=>message('cfAccounts',{},o),buckets:({accountId},o)=>message('cfBuckets',{accountId},o),
    archiveEntries:({source,key:k},o)=>message('cfArchiveEntries',{...location(source),key:key(k)},o),
    async extractArchiveEntry({source,key:k,entry:archiveEntry,destinationPrefix=''},o){
      const result=await message('cfExtractArchive',{...location(source),key:key(k),entries:[key(archiveEntry)],destinationPrefix:prefix(destinationPrefix)},o);
      if(!Array.isArray(result.results)||result.results.length!==1)throw Object.assign(Error('Archive extraction was not confirmed. Inspect the destination before retrying.'),{uncertain:true});
      return {...result,completed:result.results.filter(r=>r.status==='extracted').length,errors:result.results.filter(r=>r.status!=='extracted')};
    },
    async profiles(_,o){const result=await message('profiles',{},o);return {profiles:(result.profiles||[]).filter(p=>p.type==='cloudflare-r2').map(p=>({id:p.id,name:p.name,accountId:p.accountId,accountName:p.accountName,bucketName:p.defaultBucketName||p.bucketName,prefix:p.defaultPrefix||''}))};},
    async transferHistory(_,o){const result=await message('transferHistory',{},o);return {history:result.transferHistory||[]};},
    prepareBucket:({source},o)=>{const l=location(source);return message('cfProvision',{...l,profileName:l.bucketName,folders:{}},o).then(result=>({verification:result.verification}));},
    createBucket:({accountId,name:n},o)=>message('cfCreateBucket',{accountId,name:n},o),
    publicUrls:({source},o)=>message('cfPublicAddresses',location(source),o),
    async list({source,cursor=''},options) {
      const l=location(source),p=await page(l,l.prefix,cursor,'/',options),entries=new Map();
      for(const raw of p.delimited){const k=typeof raw==='string'?raw:raw.prefix;if(k&&k.startsWith(l.prefix))entries.set(k,{key:k,folder:true,displayName:k.slice(l.prefix.length).replace(/\/$/,'')});}
      for(const object of p.objects){const k=String(object.key||object.name||'');if(!k.startsWith(l.prefix)||k===l.prefix)continue;
        const relative=k.slice(l.prefix.length);if(relative==='.redown')continue;const slash=relative.indexOf('/');
        if(slash>=0){const folder=l.prefix+relative.slice(0,slash+1);entries.set(folder,{key:folder,folder:true,displayName:relative.slice(0,slash)});}
        else entries.set(k,{...object,key:k,folder:false,displayName:relative});
      }
      return {entries:[...entries.values()],cursor:p.cursor,folderExists:!l.prefix||p.objects.length>0||p.delimited.length>0};
    },stat,
    async inspect({source,key:k},options={}) {
      const before=(await stat({source,key:k},options)).object;
      if(!before)return {object:null};
      const limit=16*1024*1024;
      if(!Number.isSafeInteger(Number(before.size))||Number(before.size)>limit)throw Error('Choose a practice file no larger than 16 MiB for independent checking.');
      const response=await http.request(base(location(source))+'/'+key(k).split('/').map(encodeURIComponent).join('/'),{signal:options.signal,timeoutMs:options.requestTimeoutMs});
      if(!response.ok||!response.body)throw Error('The file could not be checked.');
      const reader=response.body.getReader(),chunks=[];let size=0;
      try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit)throw Error('Practice file exceeds the checking budget.');chunks.push(part.value);}}finally{await reader.cancel();}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
      const after=(await stat({source,key:k},options)).object;
      const identity=o=>o&&JSON.stringify([o.etag,o.size,o.uploaded||o.last_modified,o.version]);
      if(size!==Number(before.size)||identity(before)!==identity(after))throw Error('The file changed while it was being checked.');
      return {object:after,sha256,status:response.status};
    },
    async mkdir({source,name:n},o){const l=location(source);return message('cfCreateFolder',{...l,name:name(n)},o);},
    copy:(input,o)=>transfer('copy',input,o),move:(input,o)=>transfer('move',input,o),
    rename:({source,entry:e,newName},o)=>message('cfRenameEntry',{source:location(source),entry:entry(e),newName:name(newName)},o),
    delete:({source,entries},o)=>message('cfDeleteObjects',{source:location(source),entries:entries.map(entry)},o),
    async upload({source,file,key:k,conflict='skip'},options={}) {
      options=resolveOptions('upload',{},options);const {signal,onProgress}=options;
      const l=location(source);key(k);
      if(!file || !Number.isSafeInteger(file.size)||file.size<0)throw Error('Choose a local file.');
      if(file.size>300000000)throw Error('This beta uses the existing 300 MB direct upload route. Larger multipart uploads are unfinished.');
      if(!['skip','keep','replace'].includes(conflict))throw Error('Choose a conflict policy.');
      // A unique temporary key keeps the original untouched until the proven
      // Worker conditionally commits the final destination. Never replay PUT.
      if(conflict==='skip' && (await stat({source:l,key:k},options)).object)return {state:'partial',conflicts:[{destinationKey:k,status:'conflict'}]};
      const staging='.redown-beta-uploads/'+crypto.randomUUID()+'/payload';
      let attempted=false;
      try {
        signal?.throwIfAborted();onProgress?.({phase:'uploading',bytes:0,totalBytes:file.size});attempted=true;
        const response=await http.request(base(l)+'/'+staging.split('/').map(encodeURIComponent).join('/'),{method:'PUT',headers:{'content-type':file.type||'application/octet-stream'},body:file,timeoutMs:options.uploadTimeoutMs,signal});
        const body=await response.json().catch(()=>null);
        if(!response.ok || body?.success!==true)throw Error('Upload was not confirmed.');
        const uploaded=await stat({source:l,key:staging},options);
        if(Number(uploaded.object?.size)!==file.size)throw Error('Uploaded file size could not be verified.');
        await verifyUpload(l,staging,file,options);
        signal?.throwIfAborted();onProgress?.({phase:'committing',bytes:file.size,totalBytes:file.size});
        // destinationKey is exact, so a folder upload retains every component.
        const result=await message('cfTransferObjects',{operation:'move',source:l,destination:l,entries:[{key:staging,folder:false,destinationKey:k}],conflict},options);
        if(result.errors?.length || result.conflicts?.length || result.partialMove)return {...result,recoveryKey:staging};
        if(result.completed!==1 || result.results?.[0]?.size!==file.size)throw Error('Final upload destination was not confirmed.');
        return {...result,key:result.results[0].destinationKey,verification:'byte-for-byte staging read-back and provider final copy receipt; not independent final SHA-256'};
      }catch(error){
        if(attempted)throw Object.assign(new Error((error.message||'Upload interrupted.')+' Temporary upload may remain at '+staging+'. Inspect it before retrying.'),{name:error.name,uncertain:true,recoveryKey:staging,code:error.code,cause:error});
        throw error;
      }
    },
    async preview({source,entry:e},options={}) {
      if(e.folder)throw Error('Choose a file to preview.');
      const type=previewType(e.key);if(!type)throw Error('Inline preview is unavailable for this file type. Use Download.');
      const signal=AbortSignal.any([AbortSignal.timeout(options.requestTimeoutMs??providerDefaults.requestTimeoutMs),...(options.signal?[options.signal]:[])]);
      const response=await http.request(base(location(source))+'/'+key(e.key).split('/').map(encodeURIComponent).join('/'),{signal,timeoutMs:options.requestTimeoutMs??providerDefaults.requestTimeoutMs});
      if(!response.ok||!response.body){await response.body?.cancel();throw Error('Cloudflare could not read this preview.');}
      const limit=options.previewMaxBytes??providerDefaults.previewMaxBytes;
      if(Number(response.headers.get('content-length'))>limit){await response.body.cancel();throw Error('Preview exceeds the configured memory budget. Use Download or increase previewMaxBytes.');}
      const reader=response.body.getReader(),chunks=[];let size=0,truncated=false;const textLimit=type==='text/plain'?(options.textPreviewMaxBytes??providerDefaults.textPreviewMaxBytes):Infinity;
      try{while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;const take=Math.min(value.byteLength,textLimit-size);if(size+take>limit)throw Error('Preview exceeds the configured memory budget. Use Download or increase previewMaxBytes.');if(take)chunks.push(value.subarray(0,take));size+=take;if(take<value.byteLength){truncated=true;break;}}}
      finally{await reader.cancel();}
      return {url:URL.createObjectURL(new Blob(chunks,{type})),type,size,truncated};
    },
    async download({source,entry:e},{onProgress}={}) {
      if(e.folder)throw Error('Folder downloads are not implemented in this beta.');
      let completed=false,interrupted='';
      const id=await http.download(location(source),key(e.key),e.displayName||e.key.split('/').pop(),state=>{completed=state.state==='complete';if(state.state==='interrupted')interrupted=state.error||'Interrupted';onProgress?.({phase:'download-'+state.state,error:state.error});});
      if(interrupted)throw Error('Chrome interrupted the download: '+interrupted);
      return {state:completed?'completed':'started',downloadId:id,downloadState:completed?'complete':'started'};
    },
    async remoteIngest({destination,url,filename},options) {
      const l=location(destination),u=new URL(url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Enter an HTTP or HTTPS source URL without credentials.');
      // The original background -> ingestCloudflareAtPrefix -> Worker pipeline
      // acquires source bytes remotely. This client never fetches the source.
      return message('ingest',{destination:l,prefix:l.prefix,sourceUrl:u.href,...(filename?{filename:name(filename)}:{})},options);
    }
  };
}
