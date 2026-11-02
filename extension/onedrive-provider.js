/* OneDrive-only background adapter. V3 and the shared native registry stay unchanged. */
(() => {
  'use strict';
  const terminal=new Set(['completed','failed','blocked','cancelled','uncertain','interrupted']);
  const result=(code,error,status='blocked')=>({ok:false,code,error,status});
  function create({chrome=globalThis.chrome,auth=RedownOneDriveAuth.create(),
    api=RedownOneDriveAPI.create(),record=async()=>{}}={}){
    const seen=new WeakSet();let busy=false,running=null,controller=null,active=null,epoch=0;
    const get=async key=>(await chrome.storage.local.get(key))[key];
    const setTransfer=s=>chrome.storage.local.set({'onedrive:transfer':s});
    const problem=e=>({code:e?.code||'ONEDRIVE_FAILED',error:e?.code?e.message:'OneDrive operation failed.',
      status:terminal.has(e?.status)?e.status:'failed',
      ...(e?.code==='ONEDRIVE_UPLOAD_HOST_PERMISSION'&&
         typeof e.uploadOrigin==='string'&&e.uploadOrigin.startsWith('https://')?
        {uploadOrigin:e.uploadOrigin}:{})});
    async function saveRecord(job){
      const ok=job.status==='completed',item=job.item||{},src=job.source||{};
      try{await record({provider:'OneDrive',providerKind:'onedrive',profileId:'onedrive:'+job.accountId,
        profileName:'OneDrive root',deliveryId:'onedrive:'+job.id,transferId:job.id,filename:item.name||job.name,
        status:job.status,ok:ok?true:['failed','blocked'].includes(job.status)?false:undefined,
        verified:ok,sourceUrl:src.sourceUrl,pageUrl:src.pageUrl,srcUrl:src.srcUrl,
        frameUrl:src.frameUrl,linkUrl:src.linkUrl,location:ok?item.webUrl||'':'',
        destination:{provider:'onedrive',accountId:job.accountId,driveId:job.driveId,rootId:job.rootId,
          itemId:item.itemId||'',root:'/'},bytes:ok?item.bytes:job.bytes||0,
        transport:'browser-mediated',error:ok?undefined:job.error});}catch{}
    }
    async function begin(source,identity){
      if(busy){await setTransfer({status:'blocked',code:'ONEDRIVE_BUSY',error:'Another OneDrive save is in progress.'});return;}
      busy=true;const ticket=epoch,job={id:crypto.randomUUID(),name:source.name,source,
        accountId:identity.accountId,driveId:identity.driveId,rootId:identity.rootId,
        status:'active',phase:'source',bytes:0,total:null};
      active=job;controller=new AbortController();
      await setTransfer({status:'active',phase:'source',name:job.name,bytes:0,total:null});
      running=(async()=>{
        try{
          job.item=await api.upload(source,identity,async p=>{
            job.phase=p.phase;job.bytes=p.sent;job.total=p.total;
            await setTransfer({status:'active',phase:p.phase,name:job.name,bytes:p.sent,total:p.total});
          },controller.signal);
          if(ticket!==epoch)throw RedownOneDriveAPI.fail('ONEDRIVE_INTERRUPTED','OneDrive was disconnected.','uncertain');
          job.status='completed';job.bytes=job.item.bytes;
          await setTransfer({status:'completed',name:job.item.name,bytes:job.item.bytes,total:job.item.bytes,
            itemId:job.item.itemId,webUrl:job.item.webUrl||''});
        }catch(e){
          const p=problem(e);
          if(ticket!==epoch&&['committing','verifying'].includes(job.phase)){
            p.code='ONEDRIVE_COMMIT_UNCERTAIN';p.status='uncertain';
            p.error='Final OneDrive commit may have succeeded. Check OneDrive before retrying.';
          }
          job.status=p.status;job.code=p.code;job.error=p.error;
          await setTransfer({status:job.status,code:job.code,error:job.error,name:job.name,
            bytes:job.bytes,total:job.total,...(p.uploadOrigin?{uploadOrigin:p.uploadOrigin}:{})});
        }finally{
          await saveRecord(job);
          if(active===job)active=null;
          controller=null;busy=false;
        }
      })().finally(()=>{running=null;});
    }
    async function dispatch(info){
      if(!info||typeof info!=='object'||!RedownOneDriveMenu.owns(info.menuItemId)||seen.has(info))return;
      seen.add(info);
      if(!['provider:onedrive:connect','provider:onedrive:save-root'].includes(info.menuItemId)){
        await setTransfer({status:'blocked',code:'ONEDRIVE_STALE_MENU',
          error:'Outdated OneDrive menu action. Reopen REDOWN after the menu refreshes.'});return;
      }
      // Permission is declared by Chrome's extension manifest. There are no
      // OneDrive-specific request() calls or additional host approval dialogs.
      try{
        if(info.menuItemId==='provider:onedrive:connect'){await auth.connect();return;}
        const source=RedownOneDriveAPI.sourceSnapshot(info);
        const identity=await auth.ready(null,true);
        await begin(source,identity);
      }catch(e){await setTransfer(problem(e));}
    }
    const ownsMessage=m=>['onedriveConnect','onedriveDisconnect','onedriveStatus','onedriveCancel','onedriveDiagnostic'].includes(m?.type);
    async function message(m,sender){
      const trusted=sender?.id===chrome.runtime.id&&typeof sender.url==='string';
      const page=trusted?sender.url.split(/[?#]/)[0]:'';
      const shelf=page===chrome.runtime.getURL('shelf.html');
      const options=page===chrome.runtime.getURL('options.html');
      if(!shelf&&!(options&&m.type==='onedriveDiagnostic'))
        return result('ONEDRIVE_UNTRUSTED_SENDER','Only REDOWN trusted controls can manage OneDrive.');
      if(m.type==='onedriveDiagnostic'){
        // Debug-only action. The user must explicitly click OneDrive Test.
        const debug=(await get('debugModeEnabled'))===true;
        if(!debug)return result('ONEDRIVE_DEBUG_DISABLED','Enable Debug Mode to run OneDrive Test.');
        return globalThis.RedownOneDriveOAuthDiagnostic?.create().run()||
          result('ONEDRIVE_DIAGNOSTIC_UNAVAILABLE','Microsoft diagnostic is unavailable.');
      }
      try{
        if(m.type==='onedriveConnect'){
          if(busy)return result('ONEDRIVE_BUSY','Finish the current OneDrive save first.');
          const state=await auth.connect();return {ok:true,phase:state.phase,rootReady:state.rootReady};
        }
        if(m.type==='onedriveStatus'){
          const a=await get('onedrive:auth'),s=await get('onedrive:state');
          if(a){
            try{const v=await auth.ready(null,true);return {ok:true,phase:v.phase,rootReady:true};}
            catch(e){return result(e.code||'ONEDRIVE_RECONNECT','Reconnect OneDrive to verify your account.');}
          }
          if(['connected','connecting','blocked'].includes(s?.phase))
            await chrome.storage.local.set({'onedrive:state':{phase:'disconnected'}});
          return {ok:true,phase:'disconnected'};
        }
        if(m.type==='onedriveCancel'){controller?.abort();return {ok:true};}
        if(m.type==='onedriveDisconnect'){
          epoch++;controller?.abort();
          await running?.catch(()=>{});await auth.disconnect();return {ok:true};
        }
      }catch(e){return result(e.code||'ONEDRIVE_CONNECT_FAILED',e?.code?e.message:'OneDrive could not connect.');}
      return result('ONEDRIVE_UNKNOWN_MESSAGE','Unknown OneDrive action.');
    }
    function install(){
      const recover=async()=>{
        const s=await get('onedrive:transfer');
        if(s?.status==='active')
          await setTransfer({...s,status:'uncertain',code:'ONEDRIVE_WORKER_INTERRUPTED',
            error:'Chrome restarted during a OneDrive save. Check the root before retrying.'});
      };
      chrome.runtime.onStartup.addListener(()=>void recover().catch(()=>{}));
      void recover().catch(()=>{});
    }
    return {dispatch,ownsMessage,message,install};
  }
  globalThis.RedownOneDriveProvider={create};
})();
