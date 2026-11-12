/* One bounded worker queue. No tabs, windows, downloads, relay or native writer. */
(() => {
  'use strict';
  const KEY='dropbox:jobs',LIMIT=8,terminal=new Set(['completed','failed','blocked','cancelled','uncertain','interrupted']);
  function create({chrome=globalThis.chrome,auth=RedownDropboxAuth.create(),api,record=async()=>{}}={}){
    api=api||RedownDropboxAPI.create({auth});let lane=Promise.resolve(),running=null,controller=null,stopping=false;const seenClicks=new WeakSet();const pendingAuth=new Set();
    const serial=fn=>{const p=lane.catch(()=>{}).then(fn);lane=p;return p;};
    const get=async key=>(await chrome.storage.local.get(key))[key];
    const jobs=async()=>await get(KEY)||[];
    async function save(job){job.updatedAt=Date.now();globalThis.redownSaveAttempts?.phase(job.source?.attemptId,job.phase,job);await serial(async()=>{const all=await jobs(),at=all.findIndex(j=>j.id===job.id);if(at<0)all.push(job);else all[at]=job;const pending=all.filter(j=>!terminal.has(j.status)||!j.reported),done=all.filter(j=>terminal.has(j.status)&&j.reported).slice(-24);await chrome.storage.local.set({[KEY]:[...done,...pending],'dropbox:transfer':{id:job.id,status:job.status,verified:job.verified===true,bytes:job.offset||0,total:job.total??null,error:job.error||''}});});}
    async function receipt(job){
      const r=job.result;
      if(job.status==='completed'&&!(r?.proofVersion===1&&/^dbid:[\w-]+$/.test(job.accountId||'')&&!!job.connectionId&&/^\d+$/.test(job.namespace||'')&&r.accountId===job.accountId&&r.connectionId===job.connectionId&&r.namespace===job.namespace&&r.root==='/'&&r.path==='/'+r.name&&/^id:[\w-]+$/.test(r.fileId||'')&&r.revision&&/^[a-f0-9]{64}$/.test(r.contentHash||'')&&r.bytes===job.offset)){
        job.status='uncertain';job.error='Stored Dropbox completion lacks exact destination proof. Check Dropbox before retrying.';
      }
      const success=job.status==='completed';job.verified=success;
      await record({code:job.code,attemptId:job.source?.attemptId,provider:'Dropbox',providerKind:'dropbox',profileId:'dropbox:'+job.accountId,profileName:'Dropbox root',deliveryId:'dropbox:'+job.id,transferId:job.id,filename:r?.name||job.name||'Web file',status:job.status,ok:success?true:['failed','blocked'].includes(job.status)?false:undefined,verified:success,sourceUrl:job.source?.sourceUrl,pageUrl:job.source?.pageUrl,frameUrl:job.source?.frameUrl,linkUrl:job.source?.linkUrl,location:'', // Dropbox returns no account-bound web URL; never invent a file link.
        destination:{provider:'dropbox',accountId:job.accountId,connectionId:job.connectionId,root:'/',namespace:job.namespace,...r},bytes:r?.bytes||job.offset||0,transport:'browser-mediated',error:job.error});
      if(terminal.has(job.status)){job.reported=true;await save(job);}
    }
    async function pump(){
      if(running)return running;
      running=(async()=>{
        const attempted=new Set();
        while(!stopping){
          const job=(await jobs()).find(j=>!attempted.has(j.id)&&(!terminal.has(j.status)||!j.reported));
          if(!job)break;
          attempted.add(job.id);globalThis.RedownSaveEvidence?.note(job.source?.attemptId,{phase:'pump',resumed:job.status!=='queued'});
          if(terminal.has(job.status)){if(!job.reported)await receipt(job);continue;}
          if(job.status==='awaiting-auth'){
            if(pendingAuth.has(job.id))continue;
            job.status='interrupted';job.error='Dropbox login was interrupted. Reconnect and click Save again.';await save(job);await receipt(job);continue;
          }
          controller=new AbortController();
          try{
            job.status='active';await save(job);await receipt(job);
            job.result=await api.upload(job,save,controller.signal);job.status='completed';job.error='';
          }catch(e){globalThis.RedownSaveEvidence?.failure(job.source?.attemptId,e,job.phase);job.code=globalThis.RedownSaveEvidence?.classify(e);job.status=terminal.has(e.status)?e.status:'interrupted';job.error=e.status?e.message:'Dropbox save was interrupted. Check Dropbox before retrying.';if(job.phase==='committing'&&job.status==='cancelled'){job.status='uncertain';job.error='Dropbox commit was cancelled or interrupted. Check Dropbox before retrying.';}}
          finally{controller=null;}
          await save(job);await receipt(job);
        }
      })().finally(async()=>{running=null;const pending=(await jobs()).some(j=>!terminal.has(j.status)||!j.reported);if(!pending)await chrome.alarms.clear?.('dropbox:resume');});return running;
    }
    async function enqueue(source,identity,status='queued'){
      return serial(async()=>{
        const all=await jobs();if(all.filter(j=>!terminal.has(j.status)||!j.reported).length>=LIMIT){await chrome.storage.local.set({'dropbox:transfer':{status:'blocked',error:'Dropbox queue is full (8 saves). Wait, then click again.'}});return null;}
        const job={id:crypto.randomUUID(),provider:'dropbox',source,...identity,status,offset:0,phase:'source',at:Date.now(),updatedAt:Date.now()};all.push(job);await chrome.storage.local.set({[KEY]:all,'dropbox:transfer':{id:job.id,status,bytes:0}});return job;
      });
    }
    async function captureDownloadName(source,info,tab){
      if(!Number.isInteger(tab?.id)||!chrome.scripting?.executeScript||source.url!==info.linkUrl)return;
      try{
        const results=await chrome.scripting.executeScript({target:{tabId:tab.id,...(Number.isInteger(info.frameId)?{frameIds:[info.frameId]}:{})},world:'ISOLATED',args:[source.url],func:url=>{
          const names=new Set();let n=0;
          for(const a of document.querySelectorAll('a[download][href]')){
            if(++n>800)break;const r=a.getBoundingClientRect();
            if(a.href===url&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&a.download.trim())names.add(a.download.slice(0,1000));
          }
          return names.size===1?[...names][0]:null;
        }});
        const names=[...new Set(results.map(r=>r.result).filter(n=>typeof n==='string'&&n))];
        if(names.length===1)source.downloadFilename=names[0];
      }catch{/* Restricted frames cannot supply a name; use the existing response. */}
    }
    async function dispatch(info,tab){
      if(info.menuItemId!=='provider:dropbox'||seenClicks.has(info))return;seenClicks.add(info);
      let source,permission;
      try{
        source={...RedownDropboxAPI.sourceSnapshot(info),attemptId:globalThis.redownSaveAttempts?.forClick(info)};
        globalThis.redownSaveAttempts?.stage(source.attemptId,'ROUTE_RESOLVED');
        // Invoke the browser prompt directly in the native click gesture, before awaiting storage.
        permission=chrome.permissions.request({origins:[RedownDropboxAPI.sourceURL(source.url).origin+'/*']});
      }catch(e){const job={id:crypto.randomUUID(),source:{attemptId:globalThis.redownSaveAttempts?.forClick(info)},status:'blocked',error:e.status?e.message:'No supported file was clicked.'};await save(job);await receipt(job);return;}
      try{
        const s=await get('dropbox:state');
        const wasConnected=s?.phase==='connected'&&s.rootReady===true&&s.accountId&&s.connectionId&&s.namespace;
        // Opening Dropbox login must not be hidden behind a separate source-host
        // permission result. Both are independently required for a remote save.
        const earlyLogin=wasConnected?null:auth.connect();
        void earlyLogin?.catch(()=>{});
        if(!await permission)throw RedownDropboxAuth.fail('Source access was not granted. Dropbox login may continue, but no file was saved. Click again after granting access.');
        await captureDownloadName(source,info,tab);
        // The stored state is only a projection: MV3 can suspend the worker
        // while "connecting" or after refresh expiry. Never silently return
        // or enqueue a save on state alone.
        let identity;
        if(wasConnected){
          try{
            identity=await auth.ready(undefined,false);
            if(identity.accountId!==s.accountId||identity.connectionId!==s.connectionId||identity.namespace!==s.namespace)
              throw RedownDropboxAuth.fail('Dropbox account state changed. Reconnect before saving.');
          }catch{identity=null;}
        }
        if(identity){
          globalThis.redownSaveAttempts?.stage(source.attemptId,'AUTH_CHECKED');
          const job=await enqueue(source,{accountId:identity.accountId,connectionId:identity.connectionId,namespace:identity.namespace});
          if(job){globalThis.redownSaveAttempts?.stage(source.attemptId,'ADMITTED');await receipt(job);void wake().catch(()=>{});}
          else await record({attemptId:source.attemptId,providerKind:'dropbox',status:'blocked',ok:false,error:'Dropbox queue is full (8 saves). Wait, then click again.'});
          return;
        }
        // Disconnected, stale "connecting", or failed refresh: login and then
        // continue this same click. Auth client deduplicates active OAuth.
        if(pendingAuth.size){const error='Dropbox login is already in progress. Finish login, then click this file again.';await chrome.storage.local.set({'dropbox:transfer':{status:'blocked',error}});await record({attemptId:source.attemptId,providerKind:'dropbox',status:'blocked',ok:false,error});return;}
        const old=await get('dropbox:auth');
        const login=earlyLogin||auth.connect(); // Start OAuth before queuing and History work.
        void login.catch(()=>{}); // Paired with awaited login below; no unhandled rejection.
        const job=await enqueue(source,{},'awaiting-auth');if(!job){await record({attemptId:source.attemptId,providerKind:'dropbox',status:'blocked',ok:false,error:'Dropbox queue is full (8 saves). Wait, then click again.'});await login.catch(()=>{});return;}
        pendingAuth.add(job.id);await receipt(job);
        try{
          const identity=await login;if((await jobs()).find(j=>j.id===job.id)?.status!=='awaiting-auth')return;if(old?.accountId&&old.accountId!==identity.accountId)throw RedownDropboxAuth.fail('Dropbox account changed. Click the file again to save to this account.');
          if(Date.now()-job.at>10*60*1000)throw RedownDropboxAuth.fail('Pending save expired. Click the file again.');
          Object.assign(job,{accountId:identity.accountId,connectionId:identity.connectionId,namespace:identity.namespace,status:'queued'});await save(job);await receipt(job);globalThis.redownSaveAttempts?.stage(source.attemptId,'AUTH_CHECKED');globalThis.redownSaveAttempts?.stage(source.attemptId,'ADMITTED');void wake().catch(()=>{});
        }catch(e){globalThis.RedownForensicDiagnostics?.capture(source.attemptId,'error',{error:e,phase:'auth',component:'unattributed'});job.status='blocked';job.error=e.status?e.message:'Dropbox login could not be completed.';await save(job);await receipt(job);}
        finally{pendingAuth.delete(job.id);}
      }catch(e){globalThis.RedownForensicDiagnostics?.capture(source.attemptId,'error',{error:e,component:'unattributed'});const job={id:crypto.randomUUID(),source,status:'blocked',error:e.status?e.message:'Dropbox could not start saving.'};await save(job);await receipt(job);}
    }
    async function wake(){
      for(const job of await jobs())if(!terminal.has(job.status))globalThis.RedownSaveEvidence?.note(job.source?.attemptId,{phase:'wake',wakeRequested:true});
      // Periodic alarm is a recovery trigger, not a permanent worker keepalive.
      await chrome.alarms.create('dropbox:resume',{periodInMinutes:0.5});return pump();
    }
    const ownsMessage=m=>['dropboxConnect','dropboxDisconnect','dropboxStatus','dropboxCancel'].includes(m?.type);
    async function message(m,sender){
      if(sender.id!==chrome.runtime.id||sender.url?.split(/[?#]/)[0]!==chrome.runtime.getURL('shelf.html'))return {ok:false};
      try{
        if(m.type==='dropboxConnect'){await auth.connect();return {ok:true};}
        if(m.type==='dropboxDisconnect'){
          stopping=true;controller?.abort();await running?.catch(()=>{});
          for(const job of await jobs())if(!terminal.has(job.status)){job.status='cancelled';job.error='Dropbox disconnected.';await save(job);await receipt(job);}
          await auth.disconnect();stopping=false;return {ok:true};
        }
        if(m.type==='dropboxCancel'){
          controller?.abort();
          for(const job of await jobs())if(['queued','awaiting-auth'].includes(job.status)){job.status='cancelled';job.error='Dropbox save cancelled.';await save(job);await receipt(job);}
          return {ok:true};
        }
        if(m.type==='dropboxStatus'){
          const a=await get('dropbox:auth');if(a){await auth.ready(undefined,true);
            // Explicit Shelf refresh reconciles known commits by ID only, never uploads again.
            for(const job of await jobs())if(job.status==='uncertain'&&job.receipt){
              try{await auth.ready(job,true);job.result=await api.proof(job.receipt,job);job.status='completed';job.error='';job.reported=false;await receipt(job);}catch{/* Retain uncertain evidence. */}
            }
          }
          else if(['connecting','connected'].includes((await get('dropbox:state'))?.phase))await chrome.storage.local.set({'dropbox:state':{phase:'reconnect',error:'Reconnect Dropbox to verify your account.'}});
          void wake();return {ok:true};
        }
      }catch(e){return {ok:false,error:e.status?e.message:'Dropbox connection needs attention. Reconnect or try again.'};}
      return {ok:false};
    }
    function install(){
      chrome.alarms.onAlarm.addListener(a=>{if(a.name==='dropbox:resume')void pump().catch(()=>{});});
      chrome.runtime.onStartup.addListener(()=>{void wake().catch(()=>{});});
      chrome.runtime.onInstalled.addListener(()=>{void wake().catch(()=>{});});
      void wake().catch(()=>{});
    }
    return {dispatch,message,ownsMessage,install,pump};
  }
  globalThis.RedownDropboxProvider={create};
})();
