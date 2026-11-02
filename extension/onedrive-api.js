/* Direct OneDrive root upload, owned by OneDrive alone.
 * Bounded browser-mediated streaming; no transfer tab, R2 Worker or Downloads.
 * Unknown-length sources, unsafe sources and uncertain commits fail closed.
 */
(() => {
  'use strict';
  const GRAPH='https://graph.microsoft.com/v1.0/';
  const CHUNK=16*320*1024; // 5 MiB; every nonfinal fragment is a multiple of 320 KiB.
  // Known Microsoft upload locations are requested in the initial click gesture.
  // Graph's uploadUrl remains opaque: new hosts require their own Chrome grant.
  const UPLOAD_ORIGINS=[
    'https://*.1drv.com/*','https://*.sharepoint.com/*',
    'https://*.onedrive.com/*','https://*.sharepoint-df.com/*',
    'https://*.my.microsoftpersonalcontent.com/*'
  ];
  const fail=(code,message,status='blocked')=>Object.assign(Error(message),{code,status});
  // URLs are fetched exclusively by REDOWN. Source URLs are never passed to Graph.
  function publicHostname(host){
    host=String(host||'').toLowerCase().replace(/\.$/,'');
    if(!host||!host.includes('.')||host.startsWith('[')||/^\d+(?:\.\d+){3}$/.test(host)||
      host==='localhost'||['.localhost','.local','.internal','.test','.invalid','.example','.onion'].some(s=>host.endsWith(s)))
      return false;
    // Explicit private/reserved IPv4 DNS-literal protection, including leading-zero formats.
    if(/^[0-9.]+$/.test(host)||host==='0.0.0.0')return false;
    return true;
  }
  function sourceURL(value){
    let url;
    try{url=new URL(value);}catch{
      throw fail('ONEDRIVE_SOURCE_INVALID','REDOWN could not read this browser link as a URL.');
    }
    if(!['http:','https:'].includes(url.protocol)){
      throw fail('ONEDRIVE_BROWSER_SOURCE_UNSUPPORTED',
        'This item uses a browser-only or internal URL. Choose an ordinary HTTP(S) file link. REDOWN does not send source links to Microsoft.');
    }
    if(!publicHostname(url.hostname)||url.username||url.password||
       (url.port&&url.port!=='80'&&url.port!=='443'))
      throw fail('ONEDRIVE_SOURCE_UNSAFE',
        'This URL is private, local, or contains credentials. REDOWN will not send it to OneDrive.');
    url.hash='';
    return url;
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
    const picked=info.srcUrl||info.linkUrl||info.pageUrl||'';
    const safe=value=>{
      try{const u=sourceURL(value);u.search='';return u.href;}
      catch{return '';}
    };
    // Inline data URLs are already held by Chrome. They never contain a
    // network source to disclose. Handle their decoded bytes on-device.
    if(typeof picked==='string'&&picked.toLowerCase().startsWith('data:')){
      const comma=picked.indexOf(',');
      if(comma<5)throw fail('ONEDRIVE_INLINE_INVALID','Chrome returned a malformed inline data URL.');
      const mime=picked.slice(5,comma).split(';')[0].toLowerCase();
      const ext=({
        'image/png':'.png','image/jpeg':'.jpg','image/gif':'.gif','image/webp':'.webp',
        'image/svg+xml':'.svg','image/avif':'.avif','application/pdf':'.pdf',
        'text/plain':'.txt','text/html':'.html','audio/mpeg':'.mp3','video/mp4':'.mp4'
      })[mime]||'.bin';
      return {kind:'inline-data',url:picked,name:fileName('inline'+ext),sourceUrl:'',
        pageUrl:safe(info.pageUrl),srcUrl:'',frameUrl:safe(info.frameUrl),linkUrl:''};
    }
    const url=sourceURL(picked);
    const name=fileName(url.pathname.split('/').pop()||'Web file');
    return {kind:'url',url:url.href,name,sourceUrl:safe(url.href),pageUrl:safe(info.pageUrl),
      srcUrl:safe(info.srcUrl),frameUrl:safe(info.frameUrl),linkUrl:safe(info.linkUrl)};
  }
  function knownUploadHost(host){
    const allowed=['.1drv.com','.sharepoint.com','.onedrive.com','.sharepoint-df.com',
      '.my.microsoftpersonalcontent.com','.blob.core.windows.net'];
    return allowed.some(suffix=>String(host||'').toLowerCase().endsWith(suffix));
  }
  function validUploadURL(value){
    let u;
    try{u=new URL(value);}catch{
      throw fail('ONEDRIVE_UPLOAD_URL_INVALID','Graph did not supply a valid upload session URL.');
    }
    // Treat Graph's authenticated upload-session response as the destination
    // authority, not a hard-coded hostname list. Never attach Graph bearer to PUT.
    // A newly encountered HTTPS origin additionally requires a Chrome permission
    // the owner grants in the Shelf. Never persist the opaque upload URL.
    if(u.protocol!=='https:'||u.username||u.password||u.hash||
       !publicHostname(u.hostname)||u.port&&u.port!=='443')
      throw fail('ONEDRIVE_UPLOAD_URL_UNTRUSTED','Graph supplied an unsafe upload destination.');
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
      const abortSource=()=>{void reader?.cancel().catch(()=>{});};
      let total=null;
      const token=identity.token;
      if(!token||!identity.driveId||!identity.rootId)throw fail('ONEDRIVE_NOT_CONNECTED','Reconnect OneDrive before saving.');
      try{
        if(source.kind==='inline-data'){
          if(typeof source.url!=='string'||!source.url.toLowerCase().startsWith('data:'))
            throw fail('ONEDRIVE_INLINE_INVALID','Inline source is invalid.');
          const response=await request(source.url,{method:'GET',signal},60000);
          if(!response.ok)throw fail('ONEDRIVE_INLINE_INVALID','Chrome could not read this inline data.');
          // A data: URL is itself already materialized by Chrome. Blob supplies
          // the exact byte count required by Graph; no disk download occurs.
          const blob=await response.blob();
          total=blob.size;
          if(!Number.isSafeInteger(total)||total<=0)
            throw fail('ONEDRIVE_INLINE_EMPTY','This inline data has no bytes to save.');
          reader=blob.stream().getReader();
        }else{
          const u=sourceURL(source.url);
          const response=await request(u.href,{method:'GET',signal,headers:{Accept:'*/*'}},60000);
          if(!response.ok||!response.body)
            throw fail('ONEDRIVE_SOURCE_HTTP','Chrome could not fetch the source (HTTP '+response.status+').','blocked');
          total=Number(response.headers.get('content-length'));
          if(!Number.isSafeInteger(total)||total<=0||!response.headers.get('content-length'))
            throw fail('ONEDRIVE_SOURCE_LENGTH_UNKNOWN','Source size is not known; OneDrive upload sessions need an exact byte count.');
          if(response.headers.get('content-encoding')&&!['identity',''].includes(response.headers.get('content-encoding').toLowerCase()))
            throw fail('ONEDRIVE_SOURCE_ENCODING','Source compression prevents a reliable byte-counted upload.');
          reader=response.body.getReader();
        }
        signal?.addEventListener('abort',abortSource,{once:true});
        if(signal?.aborted)abortSource();
        phase='session';await onProgress({phase,sent,total});
        const name=fileName(source.name);
        const path='me/drive/items/'+encodeURIComponent(identity.rootId)+':/'+encodeURIComponent(name)+':/createUploadSession';
        session=await graph(token,path,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({item:{'@microsoft.graph.conflictBehavior':'rename',name}}),signal});
        const uploadUrl=validUploadURL(session?.uploadUrl);
        const granted=await chrome.permissions.contains({origins:[uploadUrl.origin+'/*']});
        const approved=(await chrome.storage.local.get('onedrive:trustedUploadOrigins'))['onedrive:trustedUploadOrigins'];
        const ownerApproved=approved?.connectionId===identity.connectionId&&
          Array.isArray(approved?.origins)&&approved.origins.includes(uploadUrl.origin);
        // A source-site permission must never double as consent to upload
        // bytes to that same host if a Graph response is compromised.
        if(!granted||(!knownUploadHost(uploadUrl.hostname)&&!ownerApproved)){
          const error=fail('ONEDRIVE_UPLOAD_HOST_PERMISSION',
            'Confirm the HTTPS upload destination in REDOWN Shelf, then right-click the file again.');
          error.uploadOrigin=uploadUrl.origin; // Origin only; no opaque query token.
          throw error;
        }
        let remainder=null,at=0,done=false;
        phase='uploading';await onProgress({phase,sent,total});
        while(sent<total){
          if(signal?.aborted)throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');
          const wanted=Math.min(CHUNK,total-sent),buffer=new Uint8Array(wanted);
          let used=0;
          while(used<wanted){
            if(!remainder||at>=remainder.length){
              const part=await reader.read();
              if(signal?.aborted)throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');
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
            if(signal?.aborted)throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');
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
      }finally{signal?.removeEventListener('abort',abortSource);await reader?.cancel().catch(()=>{});}
    }
    return {upload,graph};
  }
  globalThis.RedownOneDriveAPI={create,sourceURL,sourceSnapshot,fileName,validUploadURL,
    knownUploadHost,UPLOAD_ORIGINS,CHUNK,fail};
})();
