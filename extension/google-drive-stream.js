/* Durable MV3 Drive client. Bounded buffers; no foreground tab or provenance upload. */
(() => {
  'use strict';
  const SCOPE='https://www.googleapis.com/auth/drive.file',CHUNK=4*1024*1024,MAX=5*1024**4;
  const fail=(message,status='blocked')=>Object.assign(Error(message),{status});
  function sourceURL(value){const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw fail('Choose an HTTP(S) file link without embedded credentials.');u.hash='';return u;}
  function create({chrome=globalThis.chrome,fetch=globalThis.fetch,resolveName=(r,s)=>RedownDropboxAPI.selectFilename(r,s)}={}){
    let token;
    async function authorize(interactive=false){
      const manifest=chrome.runtime.getManifest();
      if(chrome.runtime.id!=='mkadkgpekmkknfbniacdlmgikihjjepf'||!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(manifest.oauth2?.client_id||'')||manifest.oauth2.scopes?.length!==1||manifest.oauth2.scopes[0]!==SCOPE)throw fail('Google OAuth configuration needs attention.');
      const r=await chrome.identity.getAuthToken({interactive,scopes:[SCOPE],enableGranularPermissions:true});
      token=typeof r==='string'?r:r?.token;
      if(!token||r.grantedScopes&&!r.grantedScopes.includes(SCOPE))throw fail('Reconnect Google Drive.');
    }
    function endpoint(path){const u=new URL(path,'https://www.googleapis.com/drive/v3/');if(u.origin!=='https://www.googleapis.com'||!/^\/(?:upload\/)?drive\/v3\//.test(u.pathname))throw fail('Invalid Google upload endpoint.');return u.href;}
    async function http(path,options={}){
      let r;try{r=await fetch(endpoint(path),{...options,headers:{...options.headers,Authorization:'Bearer '+token},credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});}catch{throw fail('Google request interrupted. The saved job will be checked before retrying.','interrupted');}
      if(r.status===401){await chrome.identity.removeCachedAuthToken({token});token=null;await chrome.storage.local.set({googleDriveState:{phase:'reconnect'}});throw fail('Reconnect Google Drive.');}
      if(r.status===403||r.status===429)throw fail('Google access or quota needs attention. Try again later.');
      return r;
    }
    async function json(path,options){const r=await http(path,options);if(!r.ok)throw fail('Google request failed (HTTP '+r.status+').',r.status>=500?'interrupted':'failed');return r.json();}
    async function identity(interactive=false){
      await authorize(interactive);
      const about=await json('about?fields=user(permissionId)');
      const accountId=about.user?.permissionId;if(!/^[\w-]+$/.test(accountId||''))throw fail('Google account could not be verified.');
      return accountId;
    }
    async function connect(interactive=false){try{const accountId=await identity(interactive);await chrome.storage.local.set({googleDriveState:{phase:'connected',accountId,destination:'root'}});return accountId;}catch(e){await chrome.storage.local.set({googleDriveState:{phase:'reconnect'}});throw e;}}
    async function proof(job,signal){
      const r=await http('files/'+encodeURIComponent(job.fileId)+'?fields=id,name,size,trashed,parents',{signal});
      if(r.status===404)return null;
      if(!r.ok)throw fail('Google receipt cannot yet be checked.','interrupted');
      const f=await r.json();
      if(f.id!==job.fileId||f.name!==job.name||f.trashed!==false||!Number.isSafeInteger(job.total)||Number(f.size)!==job.total||job.folderId&&!f.parents?.includes(job.folderId))throw fail('Google receipt did not confirm the save. Check Drive.','uncertain');
      return {fileId:f.id,name:f.name,bytes:job.total,...(job.folderId?{folderId:job.folderId}:{})};
    }
    function acknowledged(r,total){
      const range=r.headers.get('Range');if(!range)return 0;
      const m=/^bytes=0-(\d+)$/.exec(range),n=m?Number(m[1])+1:NaN;
      if(!Number.isSafeInteger(n)||n<0||total!==null&&n>total)throw fail('Google returned an invalid upload offset.','uncertain');return n;
    }
    async function upload(job,checkpoint,signal){
      if(signal?.aborted)throw fail('Google save cancelled.','cancelled');
      const accountId=await identity(false);
      if(signal?.aborted)throw fail('Google save cancelled.','cancelled');
      if(accountId!==job.accountId)throw fail('Google account changed. Reconnect and start a new save.');
      // A final PUT may have completed before the worker checkpoint. Reconcile
      // the preallocated ID, never allocate another file or replay a create.
      if(job.phase==='verifying'||job.phase==='committing'){
        const result=await proof(job,signal);if(result)return result;
      }
      if(job.session){
        const probe=await http(job.session,{method:'PUT',headers:{'Content-Range':'bytes */'+(job.total??'*')},body:new Uint8Array(),signal});
        if(probe.ok){const result=await proof(job,signal);if(result)return result;throw fail('Google completion could not be verified.','uncertain');}
        if(probe.status===404||probe.status===410)throw fail('Google upload session expired. Check Drive before starting a new save.','uncertain');
        if(probe.status!==308)throw fail('Google upload session needs checking.','interrupted');
        job.offset=acknowledged(probe,job.total);await checkpoint(job);
        if(!job.etag||job.etag.startsWith('W/')||!Number.isSafeInteger(job.total))throw fail('This source cannot safely resume. Start a new save after checking Drive.','interrupted');
      }
      const offset=job.offset||0,requestOffset=offset&&offset===job.total?offset-1:offset;
      const headers=job.session?{Range:'bytes='+requestOffset+'-', 'If-Match':job.etag}:undefined;
      const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(abort,25000);let response,reader;
      try{
        const source=sourceURL(job.source.url);
        if(!await chrome.permissions.contains({origins:[source.origin+'/*']}))throw fail('Source access is needed. Right-click again to grant it.');
        response=await fetch(source.href,{...(headers?{headers}:{}),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});clearTimeout(timer);
        reader=response.body?.getReader();if(!response.ok||!reader)throw fail('Source did not provide an accessible file.');
        const mime=(response.headers.get('Content-Type')||'application/octet-stream').split(';')[0];
        if(/text\/html|application\/xhtml/i.test(mime))throw fail('The source returned a web page rather than a file.');
        const len=response.headers.get('Content-Length'),length=len===null?null:Number(len);
        if(length!==null&&(!Number.isSafeInteger(length)||length<0||length+requestOffset>MAX))throw fail('Source exceeds Google Drive’s supported file size.');
        if(job.session){
          if(response.status!==206||response.headers.get('ETag')!==job.etag||response.headers.get('Content-Range')!==`bytes ${requestOffset}-${job.total-1}/${job.total}`||length!==null&&length+requestOffset!==job.total)throw fail('Source changed or cannot resume byte ranges.','interrupted');
        }else{
          if(response.status!==200)throw fail('Unexpected partial source response.');
          job.total=length;job.etag=response.headers.get('ETag');job.name=resolveName(response,job.source);job.mime=mime;
          if(!job.fileId){job.fileId=(await json('files/generateIds?count=1&space=drive&type=files',{signal})).ids?.[0];if(!/^[\w-]+$/.test(job.fileId||''))throw fail('Google did not allocate a file ID.');}
          job.phase='starting';await checkpoint(job);
          const metadata={id:job.fileId,name:job.name,mimeType:mime,...(job.folderId?{parents:[job.folderId]}:{})};
          const start=await http('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':mime,...(length!==null?{'X-Upload-Content-Length':String(length)}:{})},body:JSON.stringify(metadata),signal});
          if(!start.ok)throw fail('Google could not start the upload.',start.status>=500||start.status===409?'uncertain':'failed');
          job.session=endpoint(start.headers.get('Location')||'https://invalid.invalid');job.phase='uploading';job.offset=0;await checkpoint(job);
        }
        // At most two upload chunks plus one browser stream chunk are retained.
        const buffer=new Uint8Array(CHUNK);let used=0,discard=offset-requestOffset;
        async function send(final){
          if(job.offset+used>MAX)throw fail('Source exceeds Google Drive’s supported file size.');
          if(final){if(job.total!==null&&job.offset+used!==job.total)throw fail('Source length changed.','interrupted');job.total=job.offset+used;job.phase='committing';await checkpoint(job);}
          const end=job.offset+used;
          const range=used?`bytes ${job.offset}-${end-1}/${final?job.total:job.total??'*'}`:'bytes */'+job.total;
          const r=await http(job.session,{method:'PUT',headers:{'Content-Type':job.mime,'Content-Range':range},body:buffer.slice(0,used),signal});
          if(r.status===308){const next=acknowledged(r,job.total);if(next!==end||final)throw fail('Google did not confirm this chunk.','interrupted');job.offset=next;used=0;job.phase='uploading';await checkpoint(job);return;}
          if(!r.ok)throw fail('Google upload interrupted (HTTP '+r.status+').',r.status>=500?'interrupted':'failed');
          if(!final)throw fail('Google completed before the source ended.','uncertain');
          const receipt=await r.json();if(receipt.id!==job.fileId)throw fail('Google returned a different file receipt.','uncertain');
          job.offset=end;used=0;job.phase='verifying';await checkpoint(job);
        }
        while(true){
          signal?.throwIfAborted();let readTimer;
          const part=await Promise.race([reader.read(),new Promise((_,reject)=>{readTimer=setTimeout(()=>{abort();reject(fail('Source stream interrupted.','interrupted'));},25000);})]).finally(()=>clearTimeout(readTimer));
          if(part.done)break;
          let at=Math.min(discard,part.value.length);discard-=at;
          while(at<part.value.length){if(used===CHUNK)await send(false);const n=Math.min(CHUNK-used,part.value.length-at);buffer.set(part.value.subarray(at,at+n),used);used+=n;at+=n;}
        }
        await send(true);const result=await proof(job,signal);if(!result)throw fail('Google saved file is not yet visible.','interrupted');return result;
      }catch(e){
        if(signal?.aborted)throw fail('Google save cancelled. Check Drive if the final chunk was sent.',['committing','verifying'].includes(job.phase)?'uncertain':'cancelled');
        if(e.status)throw e;throw fail('Source or Google connection interrupted.','interrupted');
      }finally{clearTimeout(timer);controller.abort();signal?.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});}
    }
    return {connect,upload,proof};
  }
  globalThis.RedownGoogleDriveStream={create,sourceURL,CHUNK,MAX,SCOPE};
})();
