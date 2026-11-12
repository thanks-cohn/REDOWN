/* OneDrive-only background adapter. V3 and the shared native registry stay unchanged. */
(() => {
  'use strict';
  const terminal=new Set(['completed','failed','blocked','cancelled','uncertain','interrupted']);
  const result=(code,error,status='blocked')=>({ok:false,code,error,status});
  function create({chrome=globalThis.chrome,auth=RedownOneDriveAuth.create(),
    api=RedownOneDriveAPI.create(),record=async()=>{}}={}){
    let checking=null,lastCheck=0;
    const seen=new WeakSet();let busy=false,running=null,controller=null,active=null,epoch=0,connecting=null;
    const connect=()=>connecting||(connecting=auth.connect().finally(()=>{connecting=null;}));
    const get=async key=>(await chrome.storage.local.get(key))[key];
    const setTransfer=s=>chrome.storage.local.set({'onedrive:transfer':{updatedAt:Date.now(),...s}});
    const problem=e=>({code:e?.code||'ONEDRIVE_FAILED',error:e?.code?e.message:'OneDrive operation failed.',
      status:terminal.has(e?.status)?e.status:'failed',
      ...(e?.code==='ONEDRIVE_UPLOAD_HOST_PERMISSION'&&
         typeof e.uploadOrigin==='string'&&e.uploadOrigin.startsWith('https://')?
        {uploadOrigin:e.uploadOrigin}:{})});
    const pendingReceiptKey='onedrive:verifiedReceiptPendingHistory';
    async function replayVerifiedReceipt(){
      const pending=await get(pendingReceiptKey);
      if(!pending)return;
      // Never upload again here. Reconcile only this specific proven remote item
      // with its existing stable delivery ID. Counter record() is idempotent.
      await record(pending);
      await chrome.storage.local.remove(pendingReceiptKey);
    }
    async function saveRecord(job){
      const ok=job.status==='completed',item=job.item||{},src=job.source||{};
      const entry={code:job.code,phase:job.errorPhase||job.phase,attemptId:src.attemptId,provider:'OneDrive',providerKind:'onedrive',profileId:'onedrive:'+job.accountId,
        profileName:'OneDrive root',deliveryId:'onedrive:'+job.id,transferId:job.id,filename:item.name||job.name,
        status:job.status,ok:ok?true:['failed','blocked'].includes(job.status)?false:undefined,
        verified:ok,sourceUrl:src.sourceUrl,pageUrl:src.pageUrl,srcUrl:src.srcUrl,
        frameUrl:src.frameUrl,linkUrl:src.linkUrl,location:ok?item.webUrl||'':'',
        destination:{provider:'onedrive',accountId:job.accountId,driveId:job.driveId,rootId:job.rootId,
          itemId:item.itemId||'',root:'/'},bytes:ok?item.bytes:job.bytes||0,
        transport:'browser-mediated',error:ok?undefined:job.error};
      if(ok)await chrome.storage.local.set({[pendingReceiptKey]:entry}).catch(()=>{});
      try{
        await record(entry);
        if(ok)await chrome.storage.local.remove(pendingReceiptKey);
      }catch(error){
        // A genuine Graph-proven save may have succeeded while the local
        // History/counter failed. Retain its receipt, expose the accounting
        // issue and allow the worker to reconcile without a second upload.
        console.warn('OneDrive receipt persistence needs retry:',String(error?.message||'storage error'));
        await setTransfer({status:ok?'completed':'uncertain',verified:ok,accountingPending:ok,attemptId:src.attemptId,id:job.id,bytes:ok?item.bytes:job.bytes,
          error:ok?'OneDrive saved the file, but REDOWN History is synchronizing.':job.error||'Transfer receipt unavailable.',
          ...(ok?{itemId:item.itemId,webUrl:item.webUrl||''}:{})}).catch(()=>{});
      }
    }
    async function begin(source,identity){
      if(busy)throw Object.assign(Error('Another OneDrive save is in progress.'),{code:'ONEDRIVE_BUSY',status:'blocked'});
      busy=true;const ticket=epoch,job={id:crypto.randomUUID(),attemptId:source.attemptId,name:source.name,source,
        accountId:identity.accountId,driveId:identity.driveId,rootId:identity.rootId,
        status:'active',phase:'source',at:Date.now(),bytes:0,total:null};
      active=job;controller=new AbortController();
      running=(async()=>{
        try{
          globalThis.RedownForensicDiagnostics?.capture(source.attemptId,'provider-checkpoint',job);
          globalThis.redownSaveAttempts?.stage(source.attemptId,'ADMITTED');
          await setTransfer({status:'active',phase:'source',id:job.id,attemptId:source.attemptId,at:job.at,name:job.name,bytes:0,total:null});
          globalThis.redownSaveAttempts?.stage(source.attemptId,'SOURCE_REQUEST');
          job.item=await api.upload(source,identity,async p=>{
            job.phase=p.phase;job.bytes=p.sent;job.total=p.total;job.sourceBytes=p.acquired??job.sourceBytes??null;
            globalThis.redownSaveAttempts?.phase(source.attemptId,p.phase,{...job,...p});
            await setTransfer({status:'active',phase:p.phase,id:job.id,attemptId:source.attemptId,name:job.name,bytes:p.sent,total:p.total,sourceBytes:job.sourceBytes});
          },controller.signal);
          if(ticket!==epoch)throw RedownOneDriveAPI.fail('ONEDRIVE_INTERRUPTED','OneDrive was disconnected.','uncertain');
          job.status='completed';job.bytes=job.item.bytes;
          await setTransfer({status:'completed',verified:true,phase:'verifying',id:job.id,attemptId:source.attemptId,name:job.item.name,bytes:job.item.bytes,total:job.item.bytes,
            itemId:job.item.itemId,webUrl:job.item.webUrl||''}).catch(()=>{});
        }catch(e){
          globalThis.RedownForensicDiagnostics?.capture(source.attemptId,'error',{error:e,phase:job.phase,component:'unattributed'});
          const p=problem(e);
          if(ticket!==epoch&&['committing','verifying'].includes(job.phase)){
            p.code='ONEDRIVE_COMMIT_UNCERTAIN';p.status='uncertain';
            p.error='Final OneDrive commit may have succeeded. Check OneDrive before retrying.';
          }
          job.errorPhase=e.phase||job.phase;job.status=p.status;job.code=p.code;job.error=p.error;
          await setTransfer({status:job.status,phase:job.errorPhase||job.phase,id:job.id,attemptId:source.attemptId,code:job.code,error:job.error,name:job.name,
            bytes:job.bytes,total:job.total,...(p.uploadOrigin?{uploadOrigin:p.uploadOrigin}:{})});
        }finally{
          try{await saveRecord(job);}
          finally{
            if(active===job)active=null;
            controller=null;busy=false;
          }
        }
      })().finally(()=>{running=null;});
      // Observe asynchronous storage/receipt failures; admission is released above.
      void running.catch(()=>globalThis.redownSaveAttempts?.finish(job.attemptId,'UNCERTAIN','HISTORY_UNAVAILABLE'));
    }
    async function dispatch(info){
      if(!info||typeof info!=='object'||!RedownOneDriveMenu.owns(info.menuItemId)||seen.has(info))return;
      seen.add(info);
      if(info.menuItemId!=='provider:onedrive'){
        await setTransfer({status:'blocked',code:'ONEDRIVE_STALE_MENU',
          error:'Outdated OneDrive menu action. Reopen REDOWN after the menu refreshes.'});return;
      }
      // Permission is declared by Chrome's extension manifest. There are no
      // OneDrive-specific request() calls or additional host approval dialogs.
      try{
        globalThis.redownSaveAttempts?.stage(globalThis.redownSaveAttempts?.forClick(info),'ROUTE_RESOLVED');
        const state=await get('onedrive:state');
        if(state?.phase==='connecting'&&(connecting||!await get('onedrive:auth')))
          throw Object.assign(Error('OneDrive sign-in is pending or was interrupted. Finish or reconnect from Shelf, then click Save again.'),{code:'ONEDRIVE_AUTH_PENDING',status:'blocked'});
        if(!['connected','connecting'].includes(state?.phase)&&!await get('onedrive:auth')){
          globalThis.RedownSaveEvidence?.note(globalThis.redownSaveAttempts?.forClick(info),{phase:'auth',code:'AUTH_PENDING'});
          await connect();
          throw Object.assign(Error('OneDrive sign-in completed. Click the file again to save.'),{code:'ONEDRIVE_CLICK_AGAIN',status:'blocked'});
        }
        const source={...RedownOneDriveAPI.sourceSnapshot(info),attemptId:globalThis.redownSaveAttempts?.forClick(info)};
        const identity=await auth.ready(null,true);
        globalThis.redownSaveAttempts?.stage(source.attemptId,'AUTH_CHECKED');
        await replayVerifiedReceipt();
        await begin(source,identity);
      }catch(e){
        globalThis.RedownForensicDiagnostics?.capture(globalThis.redownSaveAttempts?.forClick(info),'error',{error:e,phase:'auth',component:'unattributed'});
        const p=problem(e);globalThis.RedownSaveEvidence?.failure(globalThis.redownSaveAttempts?.forClick(info),e,'auth');await setTransfer({...p,phase:'auth',attemptId:globalThis.redownSaveAttempts?.forClick(info)});
        await record({provider:'OneDrive',providerKind:'onedrive',status:p.status,phase:'auth',ok:false,
          attemptId:globalThis.redownSaveAttempts?.forClick(info),code:p.code,error:p.error});
      }
    }
    const ownsMessage=m=>['onedriveConnect','onedriveDisconnect','onedriveStatus','onedriveCancel','onedriveDiagnostic'].includes(m?.type);
    async function message(m,sender){
      const trusted=sender?.id===chrome.runtime.id&&typeof sender.url==='string';
      const page=trusted?sender.url.split(/[?#]/)[0]:'';
      const shelf=page===chrome.runtime.getURL('shelf.html');
      const options=page===chrome.runtime.getURL('options.html');
      const recovery=['onedriveConnect','onedriveStatus'].includes(m.type)&&[chrome.runtime.getURL('options.html'),chrome.runtime.getURL('popup.html')].includes(page);
      if(!shelf&&!recovery&&!(options&&m.type==='onedriveDiagnostic'))
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
          let state;if(await get('onedrive:auth')){try{state=await auth.ready(null,true);}catch(e){if(!/ONEDRIVE_(?:INVALID_GRANT|SCOPES|GRAPH_(?:401|403)|NOT_CONNECTED)$/.test(e.code||''))throw e;state=await connect();}}else state=await connect();return {ok:true,phase:state.phase,rootReady:state.rootReady};
        }
        if(m.type==='onedriveStatus'){
          const a=await get('onedrive:auth'),s=await get('onedrive:state')||{};
          if(a&&!checking&&(m.passive!==true||Date.now()-lastCheck>30000)){lastCheck=Date.now();checking=auth.ready(null,true).finally(()=>{checking=null;});checking.catch(()=>{});}if(m.passive!==true&&checking)await checking;
          if(!a&&!connecting&&(s.accountKnown||s.accountId||s.phase==='connected'))await chrome.storage.local.set({'onedrive:state':{...s,phase:'reconnect',accountKnown:true,oauthGrantState:'required',code:'ONEDRIVE_NOT_CONNECTED',error:'OneDrive authorization is unavailable. Use Reconnect OneDrive; previous saves and destinations are preserved.'}});
          const current=await get('onedrive:state')||s;return {ok:true,verificationPending:!!checking,connection:globalThis.RedownProviderConnection?.project('onedrive',current),phase:current.phase||'disconnected',rootReady:current.phase==='connected'&&current.rootReady===true};
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
      void replayVerifiedReceipt().catch(()=>{});
    }
    return {dispatch,ownsMessage,message,install};
  }
  globalThis.RedownOneDriveProvider={create};
})();
