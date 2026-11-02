/* One bounded worker queue. No tabs, windows, downloads, relay or native writer. */
(() => {
  'use strict';
  const KEY='dropbox:jobs',LIMIT=8,terminal=new Set(['completed','failed','blocked','cancelled','uncertain','interrupted']);
  function create({chrome=globalThis.chrome,auth=RedownDropboxAuth.create(),api,record=async()=>{}}={}){
    api=api||RedownDropboxAPI.create({auth});let lane=Promise.resolve(),running=null,controller=null,stopping=false;const seenClicks=new WeakSet();const pendingAuth=new Set();
    const serial=fn=>{const p=lane.catch(()=>{}).then(fn);lane=p;return p;};
    const get=async key=>(await chrome.storage.local.get(key))[key];
    const jobs=async()=>await get(KEY)||[];
    async function save(job){await serial(async()=>{const all=await jobs(),at=all.findIndex(j=>j.id===job.id);if(at<0)all.push(job);else all[at]=job;const pending=all.filter(j=>!terminal.has(j.status)||!j.reported),done=all.filter(j=>terminal.has(j.status)&&j.reported).slice(-24);await chrome.storage.local.set({[KEY]:[...done,...pending],'dropbox:transfer':{id:job.id,status:job.status,verified:job.verified===true,bytes:job.offset||0,total:job.total??null,error:job.error||''}});});}
    async function receipt(job){
      const r=job.result;
      if(job.status==='completed'&&!(r?.proofVersion===1&&/^dbid:[\w-]+$/.test(job.accountId||'')&&!!job.connectionId&&/^\d+$/.test(job.namespace||'')&&r.accountId===job.accountId&&r.connectionId===job.connectionId&&r.namespace===job.namespace&&r.root==='/'&&r.path==='/'+r.name&&/^id:[\w-]+$/.test(r.fileId||'')&&r.revision&&/^[a-f0-9]{64}$/.test(r.contentHash||'')&&r.bytes===job.offset)){
        job.status='uncertain';job.error='Stored Dropbox completion lacks exact destination proof. Check Dropbox before retrying.';
      }
      const success=job.status==='completed';job.verified=success;
      await record({provider:'Dropbox',providerKind:'dropbox',profileId:'dropbox:'+job.accountId,profileName:'Dropbox root',deliveryId:'dropbox:'+job.id,transferId:job.id,filename:r?.name||job.name||'Web file',status:job.status,ok:success?true:['failed','blocked'].includes(job.status)?false:undefined,verified:success,sourceUrl:job.source?.sourceUrl,pageUrl:job.source?.pageUrl,frameUrl:job.source?.frameUrl,linkUrl:job.source?.linkUrl,location:'', // Dropbox returns no account-bound web URL; never invent a file link.
        destination:{provider:'dropbox',accountId:job.accountId,connectionId:job.connectionId,root:'/',namespace:job.namespace,...r},bytes:r?.bytes||job.offset||0,transport:'browser-mediated',error:job.error});
      if(terminal.has(job.status)){job.reported=true;await save(job);}
    }
    async function pump(){
      if(running)return running;
      running=(async()=>{
        for(const saved of await jobs()){
          if(stopping)break;
          const job=(await jobs()).find(j=>j.id===saved.id);if(!job)continue;
          if(terminal.has(job.status)){if(!job.reported)await receipt(job);continue;}
          if(job.status==='awaiting-auth'){
            if(pendingAuth.has(job.id))continue;
            job.status='interrupted';job.error='Dropbox login was interrupted. Reconnect and click Save again.';await save(job);await receipt(job);continue;
          }
          controller=new AbortController();
          try{
            job.status='active';await save(job);await receipt(job);
            job.result=await api.upload(job,save,controller.signal);job.status='completed';job.error='';
          }catch(e){job.status=terminal.has(e.status)?e.status:'interrupted';job.error=e.status?e.message:'Dropbox save was interrupted. Check Dropbox before retrying.';if(job.phase==='committing'&&job.status==='cancelled'){job.status='uncertain';job.error='Dropbox commit was cancelled or interrupted. Check Dropbox before retrying.';}}
          finally{controller=null;}
          await receipt(job);
        }
      })().finally(async()=>{running=null;const pending=(await jobs()).some(j=>!terminal.has(j.status)||!j.reported);if(!pending)await chrome.alarms.clear?.('dropbox:resume');});return running;
    }
    async function enqueue(source,identity,status='queued'){
      return serial(async()=>{
        const all=await jobs();if(all.filter(j=>!terminal.has(j.status)||!j.reported).length>=LIMIT){await chrome.storage.local.set({'dropbox:transfer':{status:'blocked',error:'Dropbox queue is full (8 saves). Wait, then click again.'}});return null;}
        const job={id:crypto.randomUUID(),provider:'dropbox',source,...identity,status,offset:0,phase:'source',at:Date.now()};all.push(job);await chrome.storage.local.set({[KEY]:all,'dropbox:transfer':{id:job.id,status,bytes:0}});return job;
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
        source=RedownDropboxAPI.sourceSnapshot(info);
        // Invoke the browser prompt directly in the native click gesture, before awaiting storage.
        permission=chrome.permissions.request({origins:[RedownDropboxAPI.sourceURL(source.url).origin+'/*']});
      }catch(e){const job={id:crypto.randomUUID(),status:'blocked',error:e.status?e.message:'No supported file was clicked.'};await save(job);await receipt(job);return;}
      try{
        if(!await permission)throw RedownDropboxAuth.fail('Source access was not granted. Click again to retry.');
        await captureDownloadName(source,info,tab);
        const s=await get('dropbox:state');
        if(s?.phase==='connected'&&s.rootReady===true&&s.accountId&&s.connectionId&&s.namespace){
          const job=await enqueue(source,{accountId:s.accountId,connectionId:s.connectionId,namespace:s.namespace});if(job){await receipt(job);void wake();}return;
        }
        // Disconnected flat menu: authenticate, then resume this exact queued click.
        if(s?.phase==='connecting')return;
        if(pendingAuth.size){await chrome.storage.local.set({'dropbox:transfer':{status:'blocked',error:'Dropbox login is already in progress. Finish login, then click this file again.'}});return;}
        const old=await get('dropbox:auth'),job=await enqueue(source,{},'awaiting-auth');if(!job)return;pendingAuth.add(job.id);await receipt(job);
        try{
          const identity=await auth.connect();if((await jobs()).find(j=>j.id===job.id)?.status!=='awaiting-auth')return;if(old?.accountId&&old.accountId!==identity.accountId)throw RedownDropboxAuth.fail('Dropbox account changed. Click the file again to save to this account.');
          if(Date.now()-job.at>10*60*1000)throw RedownDropboxAuth.fail('Pending save expired. Click the file again.');
          Object.assign(job,{accountId:identity.accountId,connectionId:identity.connectionId,namespace:identity.namespace,status:'queued'});await save(job);await receipt(job);void wake();
        }catch(e){job.status='blocked';job.error=e.status?e.message:'Dropbox login could not be completed.';await save(job);await receipt(job);}
        finally{pendingAuth.delete(job.id);}
      }catch(e){const job={id:crypto.randomUUID(),source,status:'blocked',error:e.status?e.message:'Dropbox could not start saving.'};await save(job);await receipt(job);}
    }
    async function wake(){
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
