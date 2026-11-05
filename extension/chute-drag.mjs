import './chute-stage.js';
export const DRAG_TYPE='application/x-redown-chute-v1';
export function createDragBridge({api,stage=globalThis.RedownChuteStage.createStage(),send=m=>chrome.runtime.sendMessage(m),onState=()=>{},maxBytes=globalThis.navigator?.deviceMemory<=4?8*1024*1024:32*1024*1024}={}) {
  let handle=null,controller=null,generation=0,timer;
  const emit=(state,message)=>onState({state,message});
  async function cancel(){++generation;controller?.abort();controller=null;clearTimeout(timer);const previous=handle;handle=null;if(previous)await stage.remove(previous.id);emit('cancelled','Drag preparation cleared.');}
  return {
    version:1,capabilities:()=>({browserRelay:true,native:false,multiple:false,maxBytes}),
    async prepare(source,entry){
      await cancel();const ticket=generation;
      if(entry.folder||!Number.isSafeInteger(Number(entry.size))||Number(entry.size)>maxBytes)throw Error(`Choose one file up to ${maxBytes/1048576} MiB. Use Download and the destination file picker for larger files.`);
      const abort=new AbortController();controller=abort;emit('preparing','Preparing actual file bytes…');
      const chunks=[];let total=0;
      try{
        const stat=async()=>{
          const result=await api.run('stat',{source,key:entry.key},{signal:abort.signal});
          if(result.state!=='completed'||!result.data?.object)throw Error('File no longer available. Refresh the folder.');
          const object=result.data.object;
          return JSON.stringify([object.etag,object.size,object.uploaded||object.last_modified,object.version]);
        };
        const before=api.capabilities?.includes('stat')?await stat():null;
        const result=await api.run('readStream',{source,key:entry.key},{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(60000)]),onChunk:chunk=>{
          abort.signal.throwIfAborted();total+=chunk.byteLength;
          if(total>maxBytes||total>Number(entry.size))throw Error('File exceeds the drag budget or changed. Refresh the folder.');
          chunks.push(chunk);
        }});
        if(result.state!=='completed')throw Error(result.error||'Could not read this file.');
        if(total!==Number(entry.size))throw Error('File size changed. Refresh and prepare again.');
        if(before!==null&&before!==await stat())throw Error('File changed during preparation. Refresh and prepare again.');
        const name=entry.displayName||entry.key.split('/').pop(),mime=entry.httpMetadata?.contentType||entry.mime||'application/octet-stream';
        abort.signal.throwIfAborted();
        const pending=await stage.put(new Blob(chunks,{type:mime}),{name,mime});
        if(ticket!==generation){await stage.remove(pending.id);return null;}
        handle={...pending,key:entry.key,source:JSON.stringify([source.accountId,source.bucketName,source.prefix||''])};timer=setTimeout(()=>{void cancel();},Math.max(0,pending.expires-Date.now()));
        emit('prepared','Ready. Drag the selected file into a file upload area within one minute. Destination acceptance is unverified.');
        return {...handle};
      }catch(error){if(ticket===generation)emit(abort.signal.aborted?'cancelled':'failed',abort.signal.aborted?'Preparation cancelled.':error.message);throw error;}
      finally{chunks.length=0;if(ticket===generation)controller=null;}
    },
    begin(event){
      if(!handle||handle.expires<=Date.now()){event.preventDefault();emit('failed','Choose Prepare to drag first, then drag again.');return false;}
      event.dataTransfer.effectAllowed='copy';
      // No text/URL fallback: unsupported pages must never receive a private URL.
      event.dataTransfer.setData(DRAG_TYPE,handle.id);
      void Promise.resolve().then(()=>send({type:'redownChuteV1.arm',id:handle.id})).then(r=>{if(!r?.ok)emit('failed','Drag expired. Prepare again.');},()=>emit('failed','Worker unavailable. Prepare again.'));
      emit('drag_started','Dragging prepared file. Drop receipt and upload completion are not verified.');return true;
    },
    end(event){
      if(event.dataTransfer?.dropEffect!=='none'||!handle)return;
      const pending=handle;
      // Allow the asynchronous receiver claim before cancelling an outside drop.
      setTimeout(()=>{void stage.update(pending.id,v=>!v.claim).then(unclaimed=>{
        if(unclaimed&&handle?.id===pending.id)return cancel();
      }).catch(()=>{});},500);
    },cancel,dispose:cancel,getHandle:()=>handle?{...handle}:null
  };
}
