/* Isolated from the file engine, menus, History and BOOT. */
(() => {
  'use strict';
  const {createStage,CHUNK_BYTES}=RedownChuteStage,stage=createStage();
  const shelf=sender=>sender?.id===chrome.runtime.id&&sender.url?.split(/[?#]/)[0]===chrome.runtime.getURL('shelf.html');
  const receiver=sender=>sender?.id===chrome.runtime.id&&Number.isInteger(sender.tab?.id)&&/^https?:\/\//.test(sender.url||'');
  const owner=sender=>`${sender.tab.id}:${sender.frameId??0}:${new URL(sender.url).origin}`;
  const safe=()=>({ok:false,error:'Drag expired or unavailable. Drag the file again in File Explorer.'});
  let traceQueue=Promise.resolve();
  function trace(layer,state,code='NONE'){traceQueue=traceQueue.catch(()=>{}).then(()=>appendTrace(layer,state,code));return traceQueue;}
  async function appendTrace(layer,state,code){
    const safeCode=/^(NONE|HTTP_[0-9]{3}|READ_FAILED|SOURCE_CHANGED|SIZE_CHANGED|STORAGE_FAILED|ARM_FAILED|CLAIM_FAILED|CHUNK_FAILED|TARGET_REJECTED|CANCELLED|REUSED)$/.test(code)?code:'NONE';
    const data=await chrome.storage?.session?.get?.('redownChuteTraceV1');
    const previous=Array.isArray(data?.redownChuteTraceV1)?data.redownChuteTraceV1:[];
    await chrome.storage?.session?.set?.({redownChuteTraceV1:[...previous.slice(-31),{layer,state,code:safeCode,at:Date.now()}]});
  }
  async function handle(m,s){
    if(['redownChuteV1.stats','redownChuteV1.clear','redownChuteV1.report'].includes(m.type)){
      if(!shelf(s))return safe();
      if(m.type.endsWith('.stats'))return {ok:true,...await stage.stats()};
      if(m.type.endsWith('.clear')){await stage.purge(true);await chrome.storage?.session?.set?.({redownChuteClearedV1:Date.now()});return {ok:true};}
      if(!['attempted','reading','staged','failed','cancelled'].includes(m.state)||!['source','storage','broker'].includes(m.layer))return safe();
      await trace(m.layer,m.state,m.code).catch(()=>{});return {ok:true};
    }
    if(m.type==='redownChuteV1.arm'){
      if(!shelf(s))return safe();
      const armed=await stage.update(m.id,v=>{if(v.claim||v.used)return false;v.armed=true;v.state='drag_started';return true;});
      if(!armed)return safe();
      return {ok:true};
    }
    if(m.type==='redownChuteV1.claim'){
      if(!receiver(s))return safe();
      // Reserve receiver ownership atomically before waiting for cloud bytes.
      // State is in IndexedDB; a suspended/recreated worker never reassigns it.
      let claimed=false;
      for(let attempt=0;attempt<750;attempt++){
        const result=await stage.update(m.id,v=>{
          if(v.used||v.claim&&(!claimed||v.claim!==owner(s)))return {denied:true};
          if(!v.armed)return false;
          if(!claimed){v.claim=owner(s);claimed=true;}
          return v.blob&&v.ready!==false?{name:v.name,mime:v.mime,size:v.blob.size}:{pending:true};
        });
        if(result?.denied)return safe();
        if(result&&!result.pending){void trace('receiver','claimed').catch(()=>{});return {ok:true,...result};}
        if(!result&&(claimed||attempt>=50))return safe();
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      return safe();
    }
    if(m.type==='redownChuteV1.chunk'){
      if(!receiver(s)||!Number.isSafeInteger(m.offset)||m.offset<0)return safe();
      const blob=await stage.update(m.id,v=>{
        if(v.used||v.ready===false||!v.blob||v.claim!==owner(s)||v.offset!==m.offset||m.offset>=v.blob.size&&v.blob.size!==0)return false;
        const part=v.blob.slice(m.offset,m.offset+CHUNK_BYTES);v.offset+=part.size;return part;
      });
      return blob?{ok:true,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))}:safe();
    }
    if(m.type==='redownChuteV1.finish'){
      if(!receiver(s))return safe();
      const result=await stage.finish(m.id,owner(s),m.state);
      if(result){
        await chrome.storage?.session?.set({redownChuteReceipt:{id:m.id,state:m.state,at:Date.now()}});
        await trace('receiver',m.state,m.code).catch(()=>{});
      }
      return {ok:!!result};
    }
    return safe();
  }
  chrome.runtime.onMessage.addListener((m,s,respond)=>{
    if(!/^redownChuteV1\.(arm|claim|chunk|finish|stats|clear|report)$/.test(m?.type||''))return false;
    if(!['redownChuteV1.stats','redownChuteV1.clear','redownChuteV1.report'].includes(m.type)&&(typeof m.id!=='string'||!/^[a-f0-9-]{36}$/.test(m.id))){respond(safe());return false;}
    handle(m,s).then(respond,()=>respond(safe()));return true;
  });
  chrome.storage?.onChanged?.addListener?.((changes,area)=>{if(area==='local'&&(changes.cloudflareAuth||changes.shelfKeepPreparedV1?.newValue!==true&&changes.shelfKeepPreparedV1))void stage.purge(true).catch(()=>{});});
  chrome.runtime.onStartup?.addListener(()=>{void stage.purge(true).catch(()=>{});});
  const purge=()=>{void stage.purge().catch(()=>{});};
  purge();chrome.alarms.create('redown-chute-cleanup-v1',{periodInMinutes:1});
  chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='redown-chute-cleanup-v1')purge();});
})();
