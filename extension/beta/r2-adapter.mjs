import {location,key,prefix,name,entry} from './file-api.mjs';
export function createR2Adapter({send=message=>chrome.runtime.sendMessage(message),http=globalThis.RedownCloudflareApi}={}) {
  async function message(type,input={}) {
    let timer;const writes=['cfTransferObjects','cfRenameEntry','cfDeleteObjects','cfCreateFolder','ingest'].includes(type);
    try {
      const transport=Promise.resolve().then(()=>send({type,...input})).catch(error=>{if(writes){error.uncertain=true;error.message='Connection lost before a final result. Refresh both locations before retrying.';}throw error;});
      const result=await Promise.race([transport,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('No final response. Refresh both locations before retrying; the operation may have changed files.'),{uncertain:true})),120000);})]);
      if(!result?.ok)throw Object.assign(Error(result?.error || 'Cloudflare did not confirm this request.'),{code:result?.code || result?.diagnosticError?.code,uncertain:writes&&(/did not confirm|may have|not confirmed|timed out|fetch failed|failed to fetch|network/i.test(result?.error||'')||/EXPLORER_(REQUEST_TIMEOUT|RESULT_UNCONFIRMED|NETWORK_ERROR)/.test(result?.diagnosticError?.code||result?.code||''))});
      return result;
    } finally {clearTimeout(timer);}
  }
  const base=l=>`/accounts/${encodeURIComponent(l.accountId)}/r2/buckets/${encodeURIComponent(l.bucketName)}/objects`;
  async function page(target,p='',cursor='',delimiter='/') {
    const l=location(target),query=new URLSearchParams({per_page:'1000',prefix:p,cursor,delimiter});
    const response=await http.request(base(l)+'?'+query);
    const body=await response.json().catch(()=>null);
    if(!response.ok || body?.success===false || !body || !Array.isArray(body.result) && !Array.isArray(body.result?.objects))throw Error('Cloudflare could not list this folder. Refresh to inspect its current state.');
    const result=body.result,info=body.result_info || {};
    const objects=Array.isArray(result)?result:result.objects;
    const next=result?.cursor || info.cursor || '';
    const truncated=Boolean(result?.truncated ?? info.is_truncated);
    if(cursor && cursor===next || truncated&&!next)throw Error('Cloudflare returned an incomplete page. Refresh before changing files.');
    return {objects,delimited:result?.delimited || info.delimited || [],cursor:next};
  }
  async function stat({source,key:k}) {
    const exact=key(k);let cursor='';const seen=new Set();let pages=0;
    do {if(++pages>1000)throw Error('Metadata lookup exceeded its page limit.');const p=await page(source,exact,cursor,'');const object=p.objects.find(o=>(o.key||o.name)===exact);if(object)return {object:{...object,key:exact}};cursor=p.cursor;if(seen.has(cursor)&&cursor)throw Error('Repeated metadata page.');seen.add(cursor);}while(cursor);
    return {object:null};
  }
  async function verifyUpload(l,staging,file,signal,onProgress) {
    const response=await http.request(base(l)+'/'+staging.split('/').map(encodeURIComponent).join('/'),{signal,timeoutMs:300000});
    if(!response.ok || !response.body){await response.body?.cancel();throw Error('Uploaded bytes could not be read back.');}
    const remote=response.body.getReader(),local=file.stream().getReader();
    let expected=new Uint8Array(),offset=0,verified=0;
    try {
      while(true){
        signal?.throwIfAborted();const chunk=await remote.read();if(chunk.done)break;
        if(verified+chunk.value.length>file.size)throw Error('Upload read-back contains extra bytes.');
        for(let index=0;index<chunk.value.length;){
          if(offset===expected.length){const next=await local.read();if(next.done)throw Error('Upload read-back contains extra bytes.');expected=next.value;offset=0;}
          const length=Math.min(expected.length-offset,chunk.value.length-index);
          for(let j=0;j<length;j++)if(expected[offset+j]!==chunk.value[index+j])throw Error('Upload read-back differs from the original file.');
          index+=length;offset+=length;verified+=length;
        }
        onProgress?.({phase:'verifying',bytes:verified,totalBytes:file.size});
      }
      if(verified!==file.size)throw Error('Upload read-back ended early.');
    } finally {await Promise.allSettled([remote.cancel(),local.cancel()]);}
  }
  async function transfer(operation,{source,destination,entries,conflict='skip'}) {
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
    return message('cfTransferObjects',{operation,source:s,destination:d,entries:selected,conflict});
  }
  return {
    connect:()=>message('cfConnect'),disconnect:()=>message('cfDisconnect'),
    accounts:()=>message('cfAccounts'),buckets:({accountId})=>message('cfBuckets',{accountId}),
    async list({source,cursor=''}) {
      const l=location(source),p=await page(l,l.prefix,cursor),entries=new Map();
      for(const raw of p.delimited){const k=typeof raw==='string'?raw:raw.prefix;if(k&&k.startsWith(l.prefix))entries.set(k,{key:k,folder:true,displayName:k.slice(l.prefix.length).replace(/\/$/,'')});}
      for(const object of p.objects){const k=String(object.key||object.name||'');if(!k.startsWith(l.prefix)||k===l.prefix)continue;
        const relative=k.slice(l.prefix.length);if(relative==='.redown')continue;const slash=relative.indexOf('/');
        if(slash>=0){const folder=l.prefix+relative.slice(0,slash+1);entries.set(folder,{key:folder,folder:true,displayName:relative.slice(0,slash)});}
        else entries.set(k,{...object,key:k,folder:false,displayName:relative});
      }
      return {entries:[...entries.values()],cursor:p.cursor};
    },stat,
    async mkdir({source,name:n}){const l=location(source);return message('cfCreateFolder',{...l,name:name(n)});},
    copy:input=>transfer('copy',input),move:input=>transfer('move',input),
    rename:({source,entry:e,newName})=>message('cfRenameEntry',{source:location(source),entry:entry(e),newName:name(newName)}),
    delete:({source,entries})=>message('cfDeleteObjects',{source:location(source),entries:entries.map(entry)}),
    async upload({source,file,key:k,conflict='skip'},{signal,onProgress}={}) {
      const l=location(source);key(k);
      if(!file || !Number.isSafeInteger(file.size))throw Error('Choose a local file.');
      if(file.size>300000000)throw Error('This beta uses the existing 300 MB direct upload route. Larger multipart uploads are unfinished.');
      if(!['skip','keep','replace'].includes(conflict))throw Error('Choose a conflict policy.');
      // A unique temporary key keeps the original untouched until the proven
      // Worker conditionally commits the final destination. Never replay PUT.
      if(conflict==='skip' && (await stat({source:l,key:k})).object)return {state:'partial',conflicts:[{destinationKey:k,status:'conflict'}]};
      const staging='.redown-beta-uploads/'+crypto.randomUUID()+'/payload';
      let attempted=false;
      try {
        signal?.throwIfAborted();onProgress?.({phase:'uploading',bytes:0,totalBytes:file.size});attempted=true;
        const response=await http.request(base(l)+'/'+staging.split('/').map(encodeURIComponent).join('/'),{method:'PUT',headers:{'content-type':file.type||'application/octet-stream'},body:file,timeoutMs:300000,signal});
        const body=await response.json().catch(()=>null);
        if(!response.ok || body?.success!==true)throw Error('Upload was not confirmed.');
        const uploaded=await stat({source:l,key:staging});
        if(Number(uploaded.object?.size)!==file.size)throw Error('Uploaded file size could not be verified.');
        await verifyUpload(l,staging,file,signal,onProgress);
        signal?.throwIfAborted();onProgress?.({phase:'committing',bytes:file.size,totalBytes:file.size});
        // destinationKey is exact, so a folder upload retains every component.
        const result=await message('cfTransferObjects',{operation:'move',source:l,destination:l,entries:[{key:staging,folder:false,destinationKey:k}],conflict});
        if(result.errors?.length || result.conflicts?.length || result.partialMove)return {...result,recoveryKey:staging};
        if(result.completed!==1 || result.results?.[0]?.size!==file.size)throw Error('Final upload destination was not confirmed.');
        return {...result,key:result.results[0].destinationKey,verification:'byte-for-byte staging read-back and provider final copy receipt; not independent final SHA-256'};
      }catch(error){
        if(attempted){error.uncertain=true;error.recoveryKey=staging;error.message+=' Temporary upload may remain at '+staging+'. Inspect it before retrying.';}
        throw error;
      }
    },
    async download({source,entry:e},{onProgress}={}) {
      if(e.folder)throw Error('Folder downloads are not implemented in this beta.');
      let completed=false,interrupted='';
      const id=await http.download(location(source),key(e.key),e.displayName||e.key.split('/').pop(),state=>{completed=state.state==='complete';if(state.state==='interrupted')interrupted=state.error||'Interrupted';onProgress?.({phase:'download-'+state.state,error:state.error});});
      if(interrupted)throw Error('Chrome interrupted the download: '+interrupted);
      return {state:completed?'completed':'started',downloadId:id,downloadState:completed?'complete':'started'};
    },
    async remoteIngest({destination,url,filename}) {
      const l=location(destination),u=new URL(url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Enter an HTTP or HTTPS source URL without credentials.');
      // The original background -> ingestCloudflareAtPrefix -> Worker pipeline
      // acquires source bytes remotely. This client never fetches the source.
      return message('ingest',{destination:l,prefix:l.prefix,sourceUrl:u.href,...(filename?{filename:name(filename)}:{})});
    }
  };
}
