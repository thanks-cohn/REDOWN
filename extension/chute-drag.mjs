import './chute-stage.js';
export const DRAG_TYPE='application/x-redown-chute-v1';
export function createDragBridge({api,stage=globalThis.RedownChuteStage.createStage(),send=m=>chrome.runtime.sendMessage(m),onState=()=>{},getKeep=async()=>{
    const storage=globalThis.chrome?.storage?.local;
    if(!storage?.get)return true;
    const data=await storage.get('shelfGuaranteeDragDropV1');
    return data.shelfGuaranteeDragDropV1!==false;
  },
  getRetentionHours=async()=>{
    const storage=globalThis.chrome?.storage?.local;
    if(!storage?.get)return globalThis.RedownChuteStage.DEFAULT_RETENTION_HOURS;
    const data=await storage.get('shelfDragRetentionHoursV1');
    try{return globalThis.RedownChuteStage.parseRetentionHours(data.shelfDragRetentionHoursV1??1);}
    catch{return globalThis.RedownChuteStage.DEFAULT_RETENTION_HOURS;}
  },maxBytes=50000000}={}) {
  let handle=null,controller=null,generation=0,timer;
  const emit=(state,message,layer='source',code='NONE')=>{
    onState({state,message,layer,code});
    if(['attempted','reading','staged','failed','cancelled'].includes(state))void Promise.resolve().then(()=>send({type:'redownChuteV1.report',state,layer,code})).catch(()=>{});
  };
  const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
  const sourceIdentity=(source,entry)=>JSON.stringify([source.accountId,source.bucketName,entry.key]);
  async function discard(id){try{await stage.remove(id);}catch{/* Best-effort cleanup must not hide the owning storage failure. */}}
  async function release(retry=false){
    ++generation;controller?.abort();controller=null;clearTimeout(timer);const previous=handle;handle=null;
    if(previous){if(!retry||!await stage.retire(previous.id).catch(()=>false)){
      // An already claimed, materialized handoff belongs to its receiver until
      // finish/expiry. A new gesture must not delete it across Shelf instances.
      const inFlight=retry&&await stage.update(previous.id,v=>!!v.blob&&v.ready!==false&&!!v.claim&&!v.used).catch(()=>false);
      if(!inFlight)await discard(previous.id);
    }}
  }
  async function cancel(){await release();emit('cancelled','');}
  async function suspend(){const retain=handle&&await stage.update(handle.id,v=>!!v.blob&&v.ready!==false&&(v.keep===true||!!v.claim&&!v.used)).catch(()=>null);if(retain)await release(true);else await cancel();}
  const valid=(entry,limit=maxBytes)=>!entry.folder&&Number.isSafeInteger(Number(entry.size))&&Number(entry.size)>=0&&Number(entry.size)<=limit&&Number(entry.size)<=globalThis.RedownChuteStage.MAX_BYTES;
  return {
    version:1,setLimitMB(value){const n=globalThis.RedownChuteStage.parseMB(value);maxBytes=Math.min(Number.MAX_SAFE_INTEGER,Math.floor(n*1000000));},capabilities:()=>({browserRelay:true,native:false,multiple:false,maxBytes}),
    async prepare(source,entry,reservation=null){
      if(!reservation)await cancel();const ticket=generation,policyBytes=reservation?.policyBytes??maxBytes;
      if(!valid(entry,policyBytes))throw Error(`Choose one file up to ${maxBytes/1000000} MB. Use Download and the destination file picker for larger files.`);
      const abort=new AbortController();controller=abort;
      // One deadline covers both metadata checks and the read, not 60s each.
      const signal=AbortSignal.any([abort.signal,AbortSignal.timeout(60000)]);
      const chunks=[];let total=0,layer='source',code='READ_FAILED',pending=reservation;
      emit('reading','Loading file for this drop…');
      try{
        const cacheKey=await digest(sourceIdentity(source,entry));
        const keep=await Promise.resolve().then(getKeep).catch(()=>true);
        const retentionHours=await Promise.resolve().then(getRetentionHours)
          .then(globalThis.RedownChuteStage.parseRetentionHours)
          .catch(()=>globalThis.RedownChuteStage.DEFAULT_RETENTION_HOURS);
        const retentionMs=Math.round(retentionHours*3600000);
        signal.throwIfAborted();
        if(!pending){layer='storage';code='STORAGE_FAILED';pending=await stage.reserve(crypto.randomUUID(),{name:entry.displayName||entry.key.split('/').pop(),mime:entry.httpMetadata?.contentType||entry.mime||'application/octet-stream',size:Number(entry.size),cacheKey,maxBytes:globalThis.RedownChuteStage.MAX_BYTES,policyBytes});}
        handle={...pending,key:entry.key,source:JSON.stringify([source.accountId,source.bucketName,source.prefix||''])};
        const stat=async()=>{
          layer='source';code='READ_FAILED';const result=await api.run('stat',{source,key:entry.key},{signal});
          if(result.state!=='completed'||!result.data?.object){code=/^HTTP_\d{3}$/.test(result.code)?result.code:'READ_FAILED';throw Error('File no longer available. Refresh the folder or reconnect.');}
          return result.data.object;
        };
        const before=api.capabilities?.includes('stat')?await stat():null;
        const fingerprint=o=>o&&JSON.stringify([o.etag,o.size,o.uploaded||o.last_modified,o.version]);
        const version=before&&(before.etag||before.version)?await digest(fingerprint(before)):'';
        const eligibleKeep=keep===true&&!!version;
        if(before&&Number(before.size)!==Number(entry.size)){code='SOURCE_CHANGED';throw Error('File changed. Refresh the folder.');}
        layer='storage';code='STORAGE_FAILED';const reused=await stage.reuse(pending.id,{cacheKey,version,keep:eligibleKeep,retentionMs,maxBytes:globalThis.RedownChuteStage.MAX_BYTES});
        if(reused===null){code='STORAGE_FAILED';throw Error('Prepared-file queue unavailable. Clear Prepared Files or retry.');}
        if(!reused){
          layer='source';code='READ_FAILED';const result=await api.run('readStream',{source,key:entry.key},{signal,onChunk:chunk=>{
            signal.throwIfAborted();total+=chunk.byteLength;
            if(total>policyBytes||total>Number(entry.size)){code='SIZE_CHANGED';throw Error('File exceeds the drag budget or changed. Refresh the folder.');}
            chunks.push(chunk);
          }});
          if(result.state!=='completed'){if(/^HTTP_\d{3}$/.test(result.code))code=result.code;throw Error('Could not read this file. Reconnect or Refresh before dragging again.');}
          if(total!==Number(entry.size)){code='SIZE_CHANGED';throw Error('File size changed. Refresh and drag again.');}
        }
        if(before!==null&&fingerprint(before)!==fingerprint(await stat())){code='SOURCE_CHANGED';throw Error('File changed during preparation. Refresh and drag again.');}
        signal.throwIfAborted();if(ticket!==generation)throw signal.reason||Error('Drag cancelled.');
        layer='storage';code='STORAGE_FAILED';
        if(!reused){const payload=new Blob(chunks,{type:pending.mime});chunks.length=0;if(!await stage.fulfill(pending.id,payload,{cacheKey,version,keep:eligibleKeep,retentionMs}))throw Error('Drag expired. Drag the file again.');}
        if(reused&&!await stage.activate(pending.id))throw Error('Drag expired. Drag again.');
        timer=setTimeout(()=>{if(handle?.id===pending.id){handle=null;controller?.abort();void stage.purge().catch(()=>{});}},Math.max(0,pending.expires-Date.now()));
        timer.unref?.();emit('staged',reused?'Prepared bytes reused after checking current cloud access and version.':'File ready for this drop. Check attachment acceptance at the destination.','storage',reused?'REUSED':'NONE');
        return {...handle};
      }catch(error){
        if(pending)await discard(pending.id);
        if(ticket===generation){handle=null;emit(signal.aborted?'cancelled':'failed',signal.aborted?'Drag cancelled or timed out. Drag again.':layer==='storage'?'Private staging unavailable or full. Clear Prepared Files, or use Download and the destination picker.':error.message,layer,signal.aborted?'CANCELLED':code);}
        throw error;
      }finally{chunks.length=0;if(ticket===generation)controller=null;}
    },
    start(event,source,entry){
      if(!valid(entry)){event.preventDefault();emit('failed',`Use Download and the destination file picker for files larger than ${maxBytes/1000000} MB or unknown sizes. This browser relay also has a 128 MB aggregate buffering budget; use Download and the destination picker above that budget.`);return false;}
      const clearing=release(true),ticket=generation,id=crypto.randomUUID();let preparing=false,startLayer='storage';const policyBytes=maxBytes;
      handle={id,expires:Date.now()+globalThis.RedownChuteStage.TTL};
      event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData(DRAG_TYPE,id);
      emit('attempted','Dragging file. Keep Explorer open while the destination receives it.');
      void (async()=>{
        await clearing;if(ticket!==generation)return;
        const cacheKey=await digest(sourceIdentity(source,entry));
        const pending=await stage.reserve(id,{name:entry.displayName||entry.key.split('/').pop(),mime:entry.httpMetadata?.contentType||entry.mime||'application/octet-stream',size:Number(entry.size),cacheKey,maxBytes:globalThis.RedownChuteStage.MAX_BYTES,policyBytes});
        if(ticket!==generation){await discard(id);return;}
        handle={...pending,key:entry.key,source:JSON.stringify([source.accountId,source.bucketName,source.prefix||''])};
        startLayer='broker';const armed=await send({type:'redownChuteV1.arm',id});
        if(ticket!==generation)return;
        if(!armed?.ok)throw Error('Browser handoff unavailable. Use Download and the destination file picker.');
        preparing=true;await this.prepare(source,entry,pending);
      })().catch(async()=>{if(ticket===generation){await discard(id);if(handle?.id===id)handle=null;if(!preparing)emit('failed','File handoff unavailable. Drag again, or use Download and the destination file picker.',startLayer,startLayer==='storage'?'STORAGE_FAILED':'ARM_FAILED');}});
      return true;
    },
    begin(event){
      if(!handle||handle.expires<=Date.now()){event.preventDefault();emit('failed','Drag the file again.');return false;}
      // Legacy explicit prepare still arms once. Natural retries use start(),
      // which always creates a fresh opaque one-use capability.
      event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData(DRAG_TYPE,handle.id);
      void send({type:'redownChuteV1.arm',id:handle.id}).then(r=>{if(!r?.ok)emit('failed','Drag expired. Drag again.');}).catch(()=>emit('failed','Worker unavailable. Drag again.'));return true;
    },
    end(event){
      if(event.dataTransfer?.dropEffect!=='none'||!handle)return;const pending=handle;
      const endTimer=setTimeout(()=>{void stage.update(pending.id,v=>({unclaimed:!v.claim&&!v.used})).then(result=>{
        if((!result||result.unclaimed)&&handle?.id===pending.id)return cancel().then(()=>emit('cancelled','No file handoff observed. Use Download and the destination file picker if needed.'));
      }).catch(()=>{});},750);endTimer.unref?.();
    },cancel,suspend,dispose:suspend,getHandle:()=>handle?{...handle}:null
  };
}
