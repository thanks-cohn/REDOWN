/* Direct OneDrive root upload, owned by OneDrive alone.
 * Bounded browser-mediated streaming; no transfer tab, R2 Worker or Downloads.
 * Unknown-length sources, unsafe sources and uncertain commits fail closed.
 */
(() => {
  'use strict';
  const GRAPH='https://graph.microsoft.com/v1.0/';
  const CHUNK=16*320*1024; // 5 MiB; every nonfinal fragment is a multiple of 320 KiB.
  const UPLOAD_ORIGINS=['https://*.1drv.com/*','https://*.sharepoint.com/*'];
  const fail=(code,message,status='blocked')=>Object.assign(Error(message),{code,status});
  function sourceURL(value){
    let url;
    try{url=new URL(value);}catch{throw fail('ONEDRIVE_SOURCE_INVALID','Right-click a supported public HTTPS file or link.');}
    const host=url.hostname.toLowerCase();
    if(url.protocol!=='https:'||url.username||url.password||!host.includes('.')||host.startsWith('[')||
      host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||
      host.endsWith('.test')||host.endsWith('.invalid')||host.endsWith('.example')||
      /^(?:0|10|127|169\.254|192\.168|172\.(?:1[6-9]|2\d|3[01]))\./.test(host))
      throw fail('ONEDRIVE_SOURCE_UNSAFE','OneDrive right-click save accepts public HTTPS files only.');
    url.hash='';return url;
  }
  function fileName(value){
    let raw=String(value||'Web file');
    try{raw=decodeURIComponent(raw);}catch{}
    let name=raw.normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|#%\u202a-\u202e\u2066-\u2069]/g,'_').replace(/[. ]+$/,'').trim();
    if(!name||/^\.+$/.test(name))name='Web file';
    const ext=/\.[\p{L}\p{N}]{1,16}$/u.exec(name)?.[0]||'';
    if(new TextEncoder().encode(name).length>240){
      name=name.slice(0,name.length-ext.length);
      while(name&&new TextEncoder().encode(name+ext).length>240)name=Array.from(name).slice(0,-1).join('');
      name=(name||'Web file')+ext;
    }
    return name;
  }
  function sourceSnapshot(info){
    const url=sourceURL(info.srcUrl||info.linkUrl||info.pageUrl||'');
    const name=fileName(url.pathname.split('/').pop()||'Web file');
    const safe=value=>{
      try{const u=sourceURL(value);u.search='';return u.href;}
      catch{return '';}
    };
    return {url:url.href,name,sourceUrl:safe(url.href),pageUrl:safe(info.pageUrl),srcUrl:safe(info.srcUrl),
      frameUrl:safe(info.frameUrl),linkUrl:safe(info.linkUrl)};
  }
  function validUploadURL(value){
    let u;
    try{u=new URL(value);}catch{throw fail('ONEDRIVE_UPLOAD_URL_INVALID','Microsoft supplied an invalid upload session URL.');}
    const host=u.hostname.toLowerCase();
    if(u.protocol!=='https:'||u.username||u.password||u.hash||
      !(host.endsWith('.1drv.com')||host.endsWith('.sharepoint.com')))
      throw fail('ONEDRIVE_UPLOAD_URL_UNTRUSTED','Microsoft returned an upload host outside approved OneDrive endpoints.');
    return u;
  }
  function create({chrome=globalThis.chrome,fetch=globalThis.fetch}={}){
    async function request(url,options,timeout=60000){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeout);
      if(options?.signal?.aborted){clearTimeout(timer);throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');}
      const abort=()=>controller.abort();
      options?.signal?.addEventListener('abort',abort,{once:true});
      try{return await fetch(url,{...options,signal:controller.signal,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer'});}
      catch{
        if(options?.signal?.aborted)throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');
        throw fail('ONEDRIVE_NETWORK','A OneDrive or source network request was interrupted.','interrupted');
      }finally{clearTimeout(timer);options?.signal?.removeEventListener('abort',abort);}
    }
    async function graph(token,path,options={}){
      const response=await request(GRAPH+path,{...options,headers:{
        Authorization:'Bearer '+token,Accept:'application/json',...(options.headers||{})
      }},30000);
      if(!response.ok)
        throw fail('ONEDRIVE_GRAPH_'+response.status,'Microsoft Graph request failed (HTTP '+response.status+').',
          [401,403,404,409,429,507].includes(response.status)?'blocked':'failed');
      return response.json().catch(()=>{throw fail('ONEDRIVE_GRAPH_INVALID','Microsoft Graph returned invalid JSON.','failed');});
    }
    async function upload(source,identity,onProgress=async()=>{},signal){
      let reader=null,session=null,phase='source',sent=0,finalAttempt=false;
      let total=null;
      const token=identity.token;
      if(!token||!identity.driveId||!identity.rootId)throw fail('ONEDRIVE_NOT_CONNECTED','Reconnect OneDrive before saving.');
      try{
        const u=sourceURL(source.url);
        const response=await request(u.href,{method:'GET',signal,headers:{Accept:'*/*'}},60000);
        if(!response.ok||!response.body)
          throw fail('ONEDRIVE_SOURCE_HTTP','The source could not be downloaded (HTTP '+response.status+').','blocked');
        total=Number(response.headers.get('content-length'));
        if(!Number.isSafeInteger(total)||total<=0||!response.headers.get('content-length'))
          throw fail('ONEDRIVE_SOURCE_LENGTH_UNKNOWN','This source does not disclose its total size. A verified OneDrive upload session requires a known byte count.');
        if(response.headers.get('content-encoding')&&!['identity',''].includes(response.headers.get('content-encoding').toLowerCase()))
          throw fail('ONEDRIVE_SOURCE_ENCODING','The source uses content encoding that prevents a reliable byte-counted upload.');
        reader=response.body.getReader();
        phase='session';await onProgress({phase,sent,total});
        const name=fileName(source.name);
        const path='me/drive/items/'+encodeURIComponent(identity.rootId)+':/'+encodeURIComponent(name)+':/createUploadSession';
        session=await graph(token,path,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({item:{'@microsoft.graph.conflictBehavior':'rename',name}}),signal});
        const uploadUrl=validUploadURL(session?.uploadUrl);
        if(!await chrome.permissions.contains({origins:[uploadUrl.origin+'/*']}))
          throw fail('ONEDRIVE_UPLOAD_HOST_PERMISSION','The Microsoft upload endpoint is not authorized in Chrome. Enable OneDrive upload-host access in the Shelf.');
        let remainder=null,at=0,done=false;
        phase='uploading';await onProgress({phase,sent,total});
        while(sent<total){
          if(signal?.aborted)throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');
          const wanted=Math.min(CHUNK,total-sent),buffer=new Uint8Array(wanted);
          let used=0;
          while(used<wanted){
            if(!remainder||at>=remainder.length){
              const part=await reader.read();
              if(part.done){done=true;break;}
              remainder=part.value;at=0;
              if(!remainder?.length)continue;
            }
            const count=Math.min(wanted-used,remainder.length-at);
            buffer.set(remainder.subarray(at,at+count),used);used+=count;at+=count;
          }
          if(used!==wanted)throw fail('ONEDRIVE_SOURCE_TRUNCATED','Source ended before the advertised byte count.','interrupted');
          const last=sent+used===total;
          if(last){
            // Before final PUT, inspect the stream for bytes beyond Content-Length.
            // No replay is safe after a final commit attempt.
            if(remainder&&at<remainder.length)
              throw fail('ONEDRIVE_SOURCE_LENGTH_MISMATCH','Source contained more bytes than advertised.','interrupted');
            const extra=await reader.read();
            if(!extra.done)
              throw fail('ONEDRIVE_SOURCE_LENGTH_MISMATCH','Source exceeded its advertised size.','interrupted');
          }
          phase=last?'committing':'uploading';await onProgress({phase,sent,total});
          if(last)finalAttempt=true;
          const result=await request(uploadUrl.href,{method:'PUT',headers:{
            'Content-Range':'bytes '+sent+'-'+(sent+used-1)+'/'+total,
            'Content-Type':'application/octet-stream'
          },body:buffer,signal},90000);
          if(last){
            if(![200,201].includes(result.status))
              throw fail('ONEDRIVE_COMMIT_UNCERTAIN','Final OneDrive upload response was not confirmed. Check OneDrive before retrying.','uncertain');
            const item=await result.json().catch(()=>({}));
            if(!item.id)throw fail('ONEDRIVE_COMMIT_UNCERTAIN','OneDrive did not confirm the uploaded item ID. Check before retrying.','uncertain');
            sent+=used;phase='verifying';await onProgress({phase,sent,total});
            const verified=await graph(token,'me/drive/items/'+encodeURIComponent(item.id)+'?$select=id,name,size,parentReference,webUrl,file',{signal});
            if(verified.id!==item.id||verified.size!==total||typeof verified.name!=='string'||!verified.name||
              verified.parentReference?.id!==identity.rootId||
              verified.parentReference?.driveId&&verified.parentReference.driveId!==identity.driveId||
              !verified.file)
              throw fail('ONEDRIVE_PROOF_UNCERTAIN','Saved item metadata did not prove a complete file in your OneDrive root.','uncertain');
            return {itemId:verified.id,name:verified.name,bytes:verified.size,driveId:identity.driveId,
              rootId:identity.rootId,webUrl:typeof verified.webUrl==='string'&&verified.webUrl.startsWith('https://')?verified.webUrl:''};
          }
          if(result.status!==202)throw fail('ONEDRIVE_RANGE_UNCERTAIN','OneDrive did not acknowledge the uploaded range.','uncertain');
          const acknowledged=await result.json().catch(()=>({}));
          const next=String(acknowledged?.nextExpectedRanges?.[0]||'');
          if(next&&!next.startsWith(String(sent+used)+'-'))
            throw fail('ONEDRIVE_RANGE_UNCERTAIN','OneDrive reported an unexpected next byte range.','uncertain');
          sent+=used;await onProgress({phase:'uploading',sent,total});
        }
        throw fail('ONEDRIVE_TRANSFER_INCOMPLETE','The OneDrive upload did not complete.','uncertain');
      }catch(e){
        if(finalAttempt&&!['ONEDRIVE_PROOF_UNCERTAIN','ONEDRIVE_COMMIT_UNCERTAIN'].includes(e.code))
          throw fail('ONEDRIVE_COMMIT_UNCERTAIN','Final OneDrive commit may have succeeded. Check your drive before retrying.','uncertain');
        if(e.code)throw e;
        throw fail('ONEDRIVE_TRANSFER_INTERRUPTED','OneDrive upload was interrupted. Check the drive before retrying.','interrupted');
      }finally{await reader?.cancel().catch(()=>{});}
    }
    return {upload,graph};
  }
  globalThis.RedownOneDriveAPI={create,sourceURL,sourceSnapshot,fileName,validUploadURL,UPLOAD_ORIGINS,CHUNK,fail};
})();
