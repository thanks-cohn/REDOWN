/* Isolated from the file engine, menus, History and BOOT. */
(() => {
  'use strict';
  const {createStage,CHUNK_BYTES}=RedownChuteStage,stage=createStage();
  const shelf=sender=>sender?.id===chrome.runtime.id&&sender.url?.split(/[?#]/)[0]===chrome.runtime.getURL('shelf.html');
  const receiver=sender=>sender?.id===chrome.runtime.id&&Number.isInteger(sender.tab?.id)&&/^https?:\/\//.test(sender.url||'');
  const owner=sender=>`${sender.tab.id}:${sender.frameId??0}:${new URL(sender.url).origin}`;
  const safe=()=>({ok:false,error:'Drag expired or unavailable. Drag the file again in File Explorer.'});
  async function handle(m,s){
    if(m.type==='redownChuteV1.arm'){
      if(!shelf(s))return safe();
      const armed=await stage.update(m.id,v=>{if(v.claim)return false;v.armed=true;v.state='drag_started';return true;});
      if(!armed)return safe();
      return {ok:true};
    }
    if(m.type==='redownChuteV1.claim'){
      if(!receiver(s))return safe();
      // Reserve receiver ownership atomically before waiting for cloud bytes.
      // State is in IndexedDB; a suspended/recreated worker never reassigns it.
      let claimed=false;
      for(let attempt=0;attempt<600;attempt++){
        const result=await stage.update(m.id,v=>{
          if(!v.armed||v.claim&&(!claimed||v.claim!==owner(s)))return false;
          if(!claimed){v.claim=owner(s);claimed=true;}
          return v.blob?{name:v.name,mime:v.mime,size:v.blob.size}:{pending:true};
        });
        if(result&&!result.pending)return {ok:true,...result};
        if(!result&&(claimed||attempt>=20))return safe();
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      return safe();
    }
    if(m.type==='redownChuteV1.chunk'){
      if(!receiver(s)||!Number.isSafeInteger(m.offset)||m.offset<0)return safe();
      const blob=await stage.update(m.id,v=>{
        if(!v.blob||v.claim!==owner(s)||v.offset!==m.offset||m.offset>=v.blob.size&&v.blob.size!==0)return false;
        const part=v.blob.slice(m.offset,m.offset+CHUNK_BYTES);v.offset+=part.size;return part;
      });
      return blob?{ok:true,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))}:safe();
    }
    if(m.type==='redownChuteV1.finish'){
      if(!receiver(s))return safe();
      const result=await stage.update(m.id,v=>{
        if(v.claim!==owner(s))return false;
        if(!['drop_dispatched','failed'].includes(m.state))return false;
        v.state=m.state;return true;
      });
      if(result){
        await stage.remove(m.id);
        await chrome.storage?.session?.set({redownChuteReceipt:{id:m.id,state:m.state,at:Date.now()}});
      }
      return {ok:!!result};
    }
    return safe();
  }
  chrome.runtime.onMessage.addListener((m,s,respond)=>{
    if(!/^redownChuteV1\.(arm|claim|chunk|finish)$/.test(m?.type||''))return false;
    if(typeof m.id!=='string'||!/^[a-f0-9-]{36}$/.test(m.id)){respond(safe());return false;}
    handle(m,s).then(respond,()=>respond(safe()));return true;
  });
  const purge=()=>{void stage.purge().catch(()=>{});};
  purge();chrome.alarms.create('redown-chute-cleanup-v1',{periodInMinutes:1});
  chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='redown-chute-cleanup-v1')purge();});
})();
