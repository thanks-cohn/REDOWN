/* Browser-mediated bounded streaming, Dropbox upload sessions and metadata proof. */
(() => {
  'use strict';
  const CHUNK=4*1024*1024,MAX=2**41-2**22;
  const fail=(message,status='blocked')=>Object.assign(Error(message),{status});
  function sourceURL(value){
    let u;try{u=new URL(value);}catch{throw fail('No supported file URL was clicked.');}
    // Chrome fetches the clicked source; Dropbox receives bytes, never this source URL.
    // Dropbox itself does not require public HTTPS source URLs.
    if(!['http:','https:'].includes(u.protocol))throw fail('REDOWN cannot directly fetch browser-only or local file URLs. Use an HTTP(S) link that Chrome can fetch.');
    if(u.username||u.password)throw fail('REDOWN cannot fetch a source URL containing embedded credentials.');
    u.hash='';return u;
  }
  function filename(value){
    let name=String(value||'Web file').normalize('NFC').replace(/[\x00-\x1f\x7f/\\:<>"|?*\u202a-\u202e\u2066-\u2069]/g,'_').replace(/[. ]+$/,'').trim();
    if(!name||/^\.+$/.test(name))name='Web file';
    // Dropbox paths are UTF-8; bound by bytes, preserving code points and extension.
    const ext=/\.[\p{L}\p{N}]{1,16}$/u.exec(name)?.[0]||'';
    if(new TextEncoder().encode(name).length>240){name=name.slice(0,name.length-ext.length);while(new TextEncoder().encode(name+ext).length>240)name=Array.from(name).slice(0,-1).join('');name+=ext;}
    return name;
  }
  function selectFilename(response,source={}){
    const cd=response.headers.get('Content-Disposition')||'';
    let name='';
    const extended=/(?:^|;)\s*filename\*\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(cd);
    if(extended){
      const value=(extended[1]||extended[2]||'').trim();
      const match=/^UTF-8'[^']*'(.*)$/i.exec(value);
      if(match)try{name=decodeURIComponent(match[1]);}catch{/* Try the plain filename. */}
    }
    if(!name){const plain=/(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"\r\n])*)"|([^;\r\n]*))/i.exec(cd);name=(plain?.[1]?.replace(/\\(.)/g,'$1')||plain?.[2]||'').trim();}
    if(!name)name=source.downloadFilename||'';
    if(!name)try{
      const u=sourceURL(response.url||source.url);
      name=decodeURIComponent(u.pathname.split('/').pop()||'');
    }catch{/* Keep existing safe fallback. */}
    // A header containing a path contributes only its last filename component.
    name=String(name).split(/[\\/]/).pop();
    if(!name||/^\.+$/.test(name))return filename();
    // Never replace a genuine extension on MIME disagreement. Extensionless
    // real names gain only a small known MIME suffix; unknown MIME stays intact.
    const types={'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/avif':'avif','application/pdf':'pdf','video/mp4':'mp4','audio/mpeg':'mp3','application/zip':'zip'};
    const ext=types[(response.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase()];
    if(ext&&!/\.[^ .]+$/.test(name))name+='.'+ext;
    return filename(name);
  }
  function sourceSnapshot(info){
    const url=sourceURL(info.srcUrl||info.linkUrl||info.pageUrl||'').href;
    return {url,sourceUrl:url,pageUrl:info.pageUrl||'',frameUrl:info.frameUrl||'',linkUrl:info.linkUrl||'',mediaType:info.mediaType||'',...(info.downloadFilename?{downloadFilename:String(info.downloadFilename)}:{})};
  }
  function create({auth,fetch=globalThis.fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}={}){
    async function call(path,body,identity,signal,{binary=false,arg,retry=false}={}){
      for(let attempt=0;attempt<3;attempt++){
        if(signal?.aborted)throw fail('Dropbox save cancelled. Check Dropbox if a commit had started.','cancelled');
        const a=await auth.ready(identity);
        const headers={Authorization:'Bearer '+a.token,'Content-Type':binary?'application/octet-stream':'application/json','Dropbox-API-Path-Root':JSON.stringify({'.tag':'root',root:a.namespace})};
        if(arg)headers['Dropbox-API-Arg']=JSON.stringify(arg).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
        let r;
        try{r=await fetch('https://'+(binary?'content':'api')+'.dropboxapi.com/2/'+path,{method:'POST',headers,body:binary?body:JSON.stringify(body),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});}
        catch(error){globalThis.RedownForensicDiagnostics?.capture(identity?.source?.attemptId,'error',{error,component:'unattributed'});throw fail(signal?.aborted?'Dropbox save cancelled.':'Dropbox request interrupted. Check Dropbox before retrying.',signal?.aborted?'cancelled':'uncertain');}
        globalThis.RedownForensicDiagnostics?.response(identity?.source?.attemptId,r,'provider','POST');
        globalThis.RedownSaveEvidence?.note(identity?.source?.attemptId,{role:'provider',httpStatus:r.status,method:'POST',phase:identity?.phase,category:r.status===401?'auth':r.status===403?'permission':r.status===429?'rate-limit':r.status>=500?'server':'unknown'});
        const data=await r.json().catch(()=>null);
        if(r.ok)return data;
        if(r.status===401){await auth.invalidate();throw fail('Dropbox authorization expired. Reconnect Dropbox.');}
        // Only explicit throttling and read-only calls are replayed; never ambiguous commits.
        if(attempt<2&&(r.status===429||retry&&r.status>=500)){
          const delay=Number(r.headers.get('Retry-After')||2**attempt);
          if(!Number.isFinite(delay)||delay>20)throw fail('Dropbox is busy. Try again later.','failed');
          globalThis.RedownSaveEvidence?.note(identity?.source?.attemptId,{role:'provider',phase:identity?.phase,httpStatus:r.status,category:'rate-limit',retryAt:now()+Math.max(1,delay)*1000});
          await sleep(Math.max(1,delay)*1000);continue;
        }
        const e=fail(r.status===409?'Dropbox rejected the upload offset, path or session.':r.status===403?'Dropbox does not permit saving to this root.':r.status===429?'Dropbox is busy. Try again later.':'Dropbox could not complete the request.',r.status>=500?'uncertain':'failed');e.http=r.status;e.detail=data;throw e;
      }
    }
    async function proof(receipt,job,signal){
      if(!receipt||receipt['.tag']&&receipt['.tag']!=='file'||!/^id:[\w-]+$/.test(receipt.id||'')||!Number.isSafeInteger(receipt.size)||receipt.size!==job.offset||!receipt.rev||!receipt.name||receipt.path_display!=='/'+receipt.name||!receipt.path_lower||receipt.path_lower.slice(1).includes('/'))throw fail('Dropbox receipt could not be verified. Check Dropbox.','uncertain');
      const ext=/\.[^.]+$/.exec(job.name||'')?.[0]||'';
      if(ext&&!receipt.name.endsWith(ext))throw fail('Dropbox returned a different file extension. Check Dropbox.','uncertain');
      if(!/^[a-f0-9]{64}$/.test(receipt.content_hash||''))throw fail('Dropbox receipt is incomplete. Check Dropbox.','uncertain');
      let m;try{m=await call('files/get_metadata',{path:receipt.id},job,signal,{retry:true});}catch{throw fail('Dropbox commit needs metadata confirmation. Check Dropbox before retrying.','uncertain');}
      if(m?.id!==receipt.id||m.rev!==receipt.rev||m.size!==receipt.size||m.path_lower!==receipt.path_lower||m.name!==receipt.name||m.path_display!==receipt.path_display||m['.tag']!=='file'||m.content_hash!==receipt.content_hash)throw fail('Dropbox metadata did not confirm the save. Check Dropbox.','uncertain');
      return {proofVersion:1,namespace:job.namespace,fileId:m.id,path:m.path_display,name:m.name,revision:m.rev,bytes:m.size,contentHash:m.content_hash,accountId:job.accountId,connectionId:job.connectionId,root:'/'};
    }
    async function upload(job,checkpoint,signal){
      if(!Number.isSafeInteger(job.offset)||job.offset<0||job.offset>MAX)throw fail('Dropbox upload checkpoint is invalid. Retry as a new save.');
      const identity=await auth.ready(job);
      if(job.namespace&&job.namespace!==identity.namespace)throw fail('Dropbox destination root changed. Reconnect before saving.');
      job.namespace=identity.namespace;await checkpoint(job);
      if(signal?.aborted)throw fail('Dropbox save cancelled.','cancelled');
      if(job.phase==='committing')throw fail('The previous Dropbox commit was interrupted. Check Dropbox before saving again.','uncertain');
      if(job.receipt)return proof(job.receipt,job,signal);
      const u=sourceURL(job.source.url),offset=job.offset||0;
      if(job.session&&(!job.etag||job.etag.startsWith('W/')||!Number.isSafeInteger(job.total)))throw fail('This source cannot safely resume after interruption. Retry as a new save.','interrupted');
      const requestOffset=offset&&offset===job.total?offset-1:offset;let discard=offset-requestOffset;
      const headers=offset?{Range:'bytes='+requestOffset+'-','If-Match':job.etag}:{};
      const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(abort,25000);let response;
      try{response=await fetch(u.href,{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',...(offset?{headers}:{}),signal:controller.signal});}
      catch{clearTimeout(timer);signal?.removeEventListener('abort',abort);throw fail(signal?.aborted?'Dropbox save cancelled.':'Source file could not be fetched. Check access, redirects or an expired link.',signal?.aborted?'cancelled':'blocked');}
      clearTimeout(timer);
      const reader=globalThis.RedownSourceGuard?await RedownSourceGuard.open(response,{attemptId:job.source?.attemptId,signal,expectedMedia:job.source?.mediaType||'unknown'}):response.body?.getReader();
      try{
        if(!response.ok||!reader)throw fail('Source file is unavailable.');
        const mime=(response.headers.get('Content-Type')||'').toLowerCase();if(mime.includes('text/html')||mime.includes('application/xhtml'))throw fail('The clicked URL returned a web page instead of a file.');
        const len=response.headers.get('Content-Length'),length=len!==null?Number(len):null;
        if(length!==null&&(!Number.isSafeInteger(length)||length<0||length+offset>MAX))throw fail('Source exceeds Dropbox’s supported file size.');
        if(offset){
          if(response.status!==206||response.headers.get('ETag')!==job.etag||response.headers.get('Content-Range')!==`bytes ${requestOffset}-${job.total-1}/${job.total}`||length!==null&&requestOffset+length!==job.total)throw fail('Source changed or does not support safe byte-range resume.','interrupted');
        }else{
          if(response.status!==200)throw fail('Unexpected partial source response.');
          if(job.session&&(response.headers.get('ETag')!==job.etag||length!==job.total))throw fail('Source changed during upload recovery.','interrupted');
          job.total=length;job.etag=response.headers.get('ETag');
          job.name=selectFilename(response,job.source);await checkpoint(job);
        }
        if(!job.session){
          const s=await call('files/upload_session/start',new Uint8Array(),job,signal,{binary:true,arg:{close:false}});
          if(typeof s?.session_id!=='string')throw fail('Dropbox upload session was not acknowledged.','uncertain');
          job.session=s.session_id;job.phase='uploading';await checkpoint(job);
        }
        const buffer=new Uint8Array(CHUNK);let used=0;
        async function append(){
          if(job.offset+used>MAX)throw fail('Source exceeds Dropbox’s supported file size.');
          const size=used;
          try{await call('files/upload_session/append_v2',buffer.subarray(0,size),job,signal,{binary:true,arg:{cursor:{session_id:job.session,offset:job.offset},close:false}});}
          catch(e){
            const d=e.detail?.error,lookup=d?.['.tag']==='lookup_failed'?d.lookup_failed:d;
            // Replaying an acknowledged-but-not-checkpointed append is safe only at exact next offset.
            if(e.http!==409||lookup?.['.tag']!=='incorrect_offset'||lookup.correct_offset!==job.offset+size)throw e;
          }
          job.offset+=size;used=0;job.phase='uploading';await checkpoint(job);
        }
        while(true){
          if(signal?.aborted)throw fail('Dropbox save cancelled.','cancelled');
          let readTimer;const timeout=new Promise((_,reject)=>{readTimer=setTimeout(()=>{controller.abort();reject(fail('Source stopped responding.','interrupted'));},25000);});
          let part;try{part=await Promise.race([reader.read(),timeout]);}finally{clearTimeout(readTimer);}
          if(part.done)break;
          const skip=Math.min(discard,part.value.length);discard-=skip;
          for(let at=skip;at<part.value.length;){const n=Math.min(CHUNK-used,part.value.length-at);buffer.set(part.value.subarray(at,at+n),used);used+=n;at+=n;if(used===CHUNK)await append();}
        }
        if(used)await append();
        if(job.total!==null&&job.offset!==job.total)throw fail('Source length changed during transfer.','interrupted');
        await auth.ready(job,true);
        job.phase='committing';await checkpoint(job); // Never replay finish after a worker crash.
        const receipt=await call('files/upload_session/finish',new Uint8Array(),job,signal,{binary:true,arg:{cursor:{session_id:job.session,offset:job.offset},commit:{path:'/'+job.name,mode:'add',autorename:true,mute:true,strict_conflict:false}}});
        job.receipt=receipt;job.phase='verifying';await checkpoint(job);
        return await proof(receipt,job,signal);
      }catch(e){
        globalThis.RedownSaveEvidence?.failure(job.source?.attemptId,e,job.phase==='source'?'source':job.phase);
        if(signal?.aborted)throw fail(['committing','verifying'].includes(job.phase)?'Dropbox commit was interrupted. Check Dropbox before retrying.':'Dropbox save cancelled.',['committing','verifying'].includes(job.phase)?'uncertain':'cancelled');
        if(e.status)throw e;throw fail('Source stream was interrupted. Retry as a new save if it cannot resume.','interrupted');
      }finally{controller.abort();signal?.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});}
    }
    return {upload,proof,call};
  }
  globalThis.RedownDropboxAPI={create,sourceURL,sourceSnapshot,filename,selectFilename,CHUNK,MAX};
})();
