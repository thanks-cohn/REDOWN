/* Direct OneDrive root upload, owned by OneDrive alone.
 * Bounded browser-mediated streaming; no transfer tab, R2 Worker or Downloads.
 * Small unknown-length sources use bounded temporary memory before Graph; uncertain commits fail closed.
 */
(() => {
  'use strict';
  const GRAPH='https://graph.microsoft.com/v1.0/';
  const MATERIALIZE_LIMIT=16*1024*1024;let materializedBytes=0;
  const CHUNK=16*320*1024; // 5 MiB; every nonfinal fragment is a multiple of 320 KiB.
  // Recognition aids only; host access is a browser-level extension permission.
  // Graph's uploadUrl remains opaque and is never persisted.
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
    if(!publicHostname(url.hostname)||url.username||url.password)
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

  const MIME_EXTENSIONS={
    'image/png':'.png','image/jpeg':'.jpg','image/gif':'.gif',
    'image/webp':'.webp','image/avif':'.avif','image/heic':'.heic',
    'image/heif':'.heif','image/svg+xml':'.svg','image/bmp':'.bmp',
    'image/tiff':'.tif','image/x-icon':'.ico',
    'application/pdf':'.pdf','application/zip':'.zip',
    'application/x-zip-compressed':'.zip','application/x-cbz':'.cbz',
    'application/vnd.comicbook+zip':'.cbz',
    'application/x-7z-compressed':'.7z','application/vnd.rar':'.rar',
    'application/x-rar-compressed':'.rar','application/gzip':'.gz',
    'application/x-tar':'.tar','application/json':'.json',
    'application/epub+zip':'.epub',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':'.pptx',
    'application/msword':'.doc','application/vnd.ms-excel':'.xls',
    'application/vnd.ms-powerpoint':'.ppt',
    'text/plain':'.txt','text/html':'.html','text/css':'.css',
    'text/csv':'.csv','text/javascript':'.js',
    'application/javascript':'.js',
    'audio/mpeg':'.mp3','audio/wav':'.wav','audio/x-wav':'.wav',
    'audio/ogg':'.ogg','audio/flac':'.flac',
    'video/mp4':'.mp4','video/webm':'.webm','video/quicktime':'.mov'
  };
  function dispositionName(header){
    const value=String(header||'');
    const extended=/(?:^|;)\s*filename\*\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(value);
    if(extended){
      const raw=(extended[1]??extended[2]).trim();
      const utf8=/^utf-8''(.*)$/i.exec(raw);
      if(utf8)try{return decodeURIComponent(utf8[1]);}catch{}
    }
    const plain=/(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^;]*))/i.exec(value);
    return plain?(plain[1]??plain[2]).replace(/\\(.)/g,'$1').trim():'';
  }
  function magicExtension(bytes){
    if(!bytes||bytes.length<3)return '';
    const has=(...a)=>bytes.length>=a.length&&a.every((b,i)=>bytes[i]===b);
    const ascii=(offset,count)=>bytes.length>=offset+count?
      String.fromCharCode(...bytes.subarray(offset,offset+count)):'';
    if(has(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a))return '.png';
    if(has(0xff,0xd8,0xff))return '.jpg';
    if(ascii(0,6)==='GIF87a'||ascii(0,6)==='GIF89a')return '.gif';
    if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP')return '.webp';
    if(ascii(0,5)==='%PDF-')return '.pdf';
    if(ascii(0,4)==='PK\x03\x04'||ascii(0,4)==='PK\x05\x06')return '.zip';
    if(has(0x1f,0x8b,0x08))return '.gz';
    if(has(0x37,0x7a,0xbc,0xaf,0x27,0x1c))return '.7z';
    if(ascii(0,7)==='Rar!\x1a\x07\x00'||ascii(0,7)==='Rar!\x1a\x07\x01')return '.rar';
    if(ascii(0,4)==='OggS')return '.ogg';
    if(ascii(0,4)==='fLaC')return '.flac';
    if(ascii(0,3)==='ID3')return '.mp3';
    if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WAVE')return '.wav';
    if(ascii(0,4)==='RIFF'&&ascii(8,4)==='AVI ')return '.avi';
    if(ascii(0,4)==='BM')return '.bmp';
    if(ascii(4,4)==='ftyp'){
      const brand=ascii(8,4);
      if(brand==='avif'||brand==='avis')return '.avif';
      if(['heic','heix','hevc','hevx','mif1'].includes(brand))return '.heic';
      if(['isom','iso2','mp41','mp42','M4V ','M4A '].includes(brand))return '.mp4';
    }
    return '';
  }
  function uploadFileName(original,headers,firstBytes){
    const supplied=fileName(original);
    // Preserve a real extension from the URL and never invent one over it.
    if(/\.[\p{L}\p{N}]{1,16}$/u.test(supplied))return supplied;
    const headerName=dispositionName(headers?.get?.('content-disposition'));
    const preferred=headerName?fileName(headerName):supplied;
    if(/\.[\p{L}\p{N}]{1,16}$/u.test(preferred))return preferred;
    const mime=String(headers?.get?.('content-type')||'').split(';')[0].trim().toLowerCase();
    // A strong byte signature outranks a mistaken server MIME type, except
    // that ZIP-based Office/EPUB/comic files need their more specific MIME.
    const specific=MIME_EXTENSIONS[mime]||'';
    const magic=magicExtension(firstBytes);
    const wrappedZip=magic==='.zip'&&['.docx','.xlsx','.pptx','.epub','.cbz'].includes(specific);
    const ext=wrappedZip?specific:magic||specific||'.bin';
    return fileName(preferred+ext);
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
    return {kind:'url',url:url.href,name,mediaType:info.mediaType||'unknown',sourceUrl:safe(url.href),pageUrl:safe(info.pageUrl),
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
    // Extension host access is declared in the manifest. Never persist this URL.
    if(u.protocol!=='https:'||u.username||u.password||u.hash||
       !publicHostname(u.hostname)||u.port&&u.port!=='443')
      throw fail('ONEDRIVE_UPLOAD_URL_UNTRUSTED','Graph supplied an unsafe upload destination.');
    return u;
  }
  function create({chrome=globalThis.chrome,fetch=globalThis.fetch}={}){
    async function request(url,options,timeout=60000,attemptId,role='provider'){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeout);
      if(options?.signal?.aborted){clearTimeout(timer);throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');}
      const abort=()=>controller.abort();
      options?.signal?.addEventListener('abort',abort,{once:true});
      try{const response=await fetch(url,{...options,signal:controller.signal,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer'});globalThis.RedownForensicDiagnostics?.response(attemptId,response,role,options?.method||'GET');return response;}
      catch(error){
        globalThis.RedownForensicDiagnostics?.capture(attemptId,'error',{error,component:'unattributed'});
        if(options?.signal?.aborted)throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');
        throw fail('ONEDRIVE_NETWORK','A OneDrive or source network request was interrupted.','interrupted');
      }finally{clearTimeout(timer);options?.signal?.removeEventListener('abort',abort);}
    }
    async function graph(token,path,options={}){
      const {attemptId,...wireOptions}=options;
      const response=await request(GRAPH+path,{...wireOptions,headers:{
        Authorization:'Bearer '+token,Accept:'application/json',...(options.headers||{})
      }},30000,attemptId);
      globalThis.RedownSaveEvidence?.note(attemptId,{role:'provider',httpStatus:response.status,method:wireOptions.method||'GET',category:response.status===401?'auth':response.status===403?'permission':response.status===429?'rate-limit':response.status>=500?'server':'unknown'});
      if(!response.ok)
        throw fail('ONEDRIVE_GRAPH_'+response.status,'Microsoft Graph request failed (HTTP '+response.status+').',
          [401,403,404,409,429,507].includes(response.status)?'blocked':'failed');
      return response.json().catch(()=>{throw fail('ONEDRIVE_GRAPH_INVALID','Microsoft Graph returned invalid JSON.','failed');});
    }
    async function upload(source,identity,onProgress=async()=>{},signal){
      let reader=null,session=null,phase='source',sent=0,finalAttempt=false;
      let sourceHeaders=null,heldBytes=0;const heldChunks=[];
      const evidence=(data)=>globalThis.RedownSaveEvidence?.note(source.attemptId,data);
      const abortSource=()=>{void reader?.cancel().catch(()=>{});};
      let total=null;
      const token=identity.token;
      if(!token||!identity.driveId||!identity.rootId)throw fail('ONEDRIVE_NOT_CONNECTED','Reconnect OneDrive before saving.');
      try{
        if(source.kind==='inline-data'){
          if(typeof source.url!=='string'||!source.url.toLowerCase().startsWith('data:'))
            throw fail('ONEDRIVE_INLINE_INVALID','Inline source is invalid.');
          const response=await request(source.url,{method:'GET',signal},60000,source.attemptId,'source');
          sourceHeaders=response.headers;
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
          const response=await request(u.href,{method:'GET',signal,headers:{Accept:'*/*'}},60000,source.attemptId,'source');
          sourceHeaders=response.headers;
          evidence({...globalThis.RedownSaveEvidence?.response(response),phase:'source'});
          if(!response.ok||!response.body)
            throw fail('ONEDRIVE_SOURCE_HTTP','Chrome could not fetch the source (HTTP '+response.status+').','blocked');
          evidence({...globalThis.RedownSaveEvidence?.response(response),phase:'source'});
          const lengthHeader=response.headers.get('content-length'),encoding=(response.headers.get('content-encoding')||'identity').toLowerCase();
          total=Number(lengthHeader);
          reader=globalThis.RedownSourceGuard?await RedownSourceGuard.open(response,{attemptId:source.attemptId,signal,expectedMedia:source.mediaType||'unknown'}):response.body.getReader();
          const known=/^\d+$/.test(lengthHeader||'')&&Number.isSafeInteger(total)&&total>0&&encoding==='identity';
          if(!known){
            // Graph requires exact decoded bytes. Materialize only small unknown/compressed sources,
            // before creating any Graph session. Fixed-length larger files retain streaming.
            evidence({phase:'source',code:'ONEDRIVE_SOURCE_LENGTH_UNKNOWN',acquisition:'bounded-memory'});
            total=0;
            while(true){
              const part=globalThis.RedownSourceGuard?await RedownSourceGuard.read(reader,signal):await reader.read();
              if(signal?.aborted)throw fail('ONEDRIVE_CANCELLED','Source acquisition cancelled.','cancelled');
              if(part.done)break;if(!part.value?.length)continue;
              if(materializedBytes+part.value.length>MATERIALIZE_LIMIT)
                throw fail('ONEDRIVE_SOURCE_BUFFER_LIMIT','This unknown-size source exceeds the 16 MiB temporary-memory limit. Choose an accessible fixed-length file or upload the original file.');
              const chunk=part.value.slice();heldChunks.push(chunk);heldBytes+=chunk.length;materializedBytes+=chunk.length;total+=chunk.length;
              await onProgress({phase:'source',sent:0,total:null,acquired:total});
            }
            await reader.cancel().catch(()=>{});
            if(total<=0)throw fail('ONEDRIVE_SOURCE_TRUNCATED','The source contains no readable bytes.','blocked');
            let index=0;reader={read:async()=>index<heldChunks.length?{done:false,value:heldChunks[index++]}:{done:true},cancel:async()=>{}};
            evidence({phase:'source',acquisition:'bounded-memory',decision:'recovered',sizeRange:total<1048576?'under-1MiB':'1-16MiB'});
          }else evidence({phase:'source',acquisition:'stream'});
        }
        signal?.addEventListener('abort',abortSource,{once:true});
        if(signal?.aborted)abortSource();
        // Accumulate at most 16 signature bytes even when a response arrives
        // in tiny stream chunks; preserve the original chunks for upload.
        // No second fetch, disk write or whole-file buffering is introduced.
        const prefixes=[];let sampled=0;
        while(sampled<Math.min(total,16)){
          const part=await reader.read();
          if(part.done)break;
          if(!part.value?.length)continue;
          prefixes.push(part.value);sampled+=part.value.length;
        }
        if(!prefixes.length)throw fail('ONEDRIVE_SOURCE_TRUNCATED',
          'The source contains no readable file bytes.','interrupted');
        const signature=new Uint8Array(Math.min(sampled,16));let copied=0;
        for(const part of prefixes){
          const count=Math.min(part.length,signature.length-copied);
          signature.set(part.subarray(0,count),copied);copied+=count;
          if(copied===signature.length)break;
        }
        let remainder=prefixes.shift(),at=0,done=false;
        const name=uploadFileName(source.name,sourceHeaders,signature);
        phase='session';await onProgress({phase,sent,total});
        const path='me/drive/items/'+encodeURIComponent(identity.rootId)+':/'+encodeURIComponent(name)+':/createUploadSession';
        session=await graph(token,path,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({item:{'@microsoft.graph.conflictBehavior':'rename',name}}),signal,attemptId:source.attemptId});
        const uploadUrl=validUploadURL(session?.uploadUrl);
        // Graph supplies the opaque HTTPS upload destination for this session.
        // Neither its hostname nor the source hostname triggers a Chrome prompt.
        // The manifest declares browser-level network access at install/update.
        phase='uploading';await onProgress({phase,sent,total});
        while(sent<total){
          if(signal?.aborted)throw fail('ONEDRIVE_CANCELLED','OneDrive transfer cancelled.','cancelled');
          const wanted=Math.min(CHUNK,total-sent),buffer=new Uint8Array(wanted);
          let used=0;
          while(used<wanted){
            if(!remainder||at>=remainder.length){
              if(prefixes.length){remainder=prefixes.shift();at=0;continue;}
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
            if((remainder&&at<remainder.length)||prefixes.length)
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
          },body:buffer,signal},90000,source.attemptId);
          if(last){
            if(![200,201].includes(result.status))
              throw fail('ONEDRIVE_COMMIT_UNCERTAIN','Final OneDrive upload response was not confirmed. Check OneDrive before retrying.','uncertain');
            const item=await result.json().catch(()=>({}));
            if(!item.id)throw fail('ONEDRIVE_COMMIT_UNCERTAIN','OneDrive did not confirm the uploaded item ID. Check before retrying.','uncertain');
            sent+=used;phase='verifying';await onProgress({phase,sent,total});
            const verified=await graph(token,'me/drive/items/'+encodeURIComponent(item.id)+'?$select=id,name,size,parentReference,webUrl,file',{signal,attemptId:source.attemptId});
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
        globalThis.RedownSaveEvidence?.failure(source.attemptId,e,phase==='source'?'source':phase);
        if(finalAttempt&&!['ONEDRIVE_PROOF_UNCERTAIN','ONEDRIVE_COMMIT_UNCERTAIN'].includes(e.code))
          throw fail('ONEDRIVE_COMMIT_UNCERTAIN','Final OneDrive commit may have succeeded. Check your drive before retrying.','uncertain');
        if(e.code)throw e;
        throw fail('ONEDRIVE_TRANSFER_INTERRUPTED','OneDrive upload was interrupted. Check the drive before retrying.','interrupted');
      }finally{signal?.removeEventListener('abort',abortSource);await reader?.cancel().catch(()=>{});materializedBytes-=heldBytes;heldChunks.length=0;}
    }
    return {upload,graph};
  }
  globalThis.RedownOneDriveAPI={create,sourceURL,sourceSnapshot,fileName,uploadFileName,validUploadURL,
    knownUploadHost,UPLOAD_ORIGINS,CHUNK,MATERIALIZE_LIMIT,fail};
})();
