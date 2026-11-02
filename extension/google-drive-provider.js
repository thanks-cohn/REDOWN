/* One worker-owned queue. Receipts are journaled before History, replayed by ID. */
(() => {
  'use strict';
  const KEY='googleDriveJobs',terminal=new Set(['completed','failed','blocked','cancelled','uncertain']);
  function create({chrome=globalThis.chrome,api,record=async()=>{}}={}){
    let client;const getClient=()=>client||(client=RedownGoogleDriveStream.create({chrome}));
    api=api||{connect:(...args)=>getClient().connect(...args),upload:(...args)=>getClient().upload(...args)};
    let lane=Promise.resolve(),running=null,controller=null,connecting=null;
    const clicks=new WeakSet();
    const serial=fn=>{const p=lane.catch(()=>{}).then(fn);lane=p;return p;};
    const jobs=async()=>(await chrome.storage.local.get(KEY))[KEY]||[];
    async function save(job){return serial(async()=>{
      const all=await jobs(),at=all.findIndex(j=>j.id===job.id);if(at<0)all.push(job);else all[at]=job;
      const done=all.filter(j=>terminal.has(j.status)&&j.reported).slice(-24),pending=all.filter(j=>!terminal.has(j.status)||!j.reported);
      await chrome.storage.local.set({[KEY]:[...done,...pending],googleDriveTransfer:{id:job.id,status:job.status,bytes:job.offset||0,total:job.total??null,error:job.error||''}});
    });}
    async function receipt(job){
      const ok=job.status==='completed',r=job.result;
      await record({provider:'Google Drive',providerKind:'google',profileId:'google-drive:'+job.accountId,profileName:job.folderId?'Google Drive destination':'My Drive',deliveryId:'google:'+job.id,transferId:job.id,filename:r?.name||job.name||'Web file',status:job.status,ok:ok?true:['blocked','failed'].includes(job.status)?false:undefined,verified:ok,location:ok?'https://drive.google.com/file/d/'+r.fileId+'/view':'',destination:{provider:'google-drive',accountId:job.accountId,...r},sourceUrl:job.source?.url,pageUrl:job.source?.pageUrl,srcUrl:job.source?.srcUrl,frameUrl:job.source?.frameUrl,linkUrl:job.source?.linkUrl,bytes:r?.bytes||job.offset||0,transport:'browser-mediated',error:job.error});
      job.reported=true;await save(job);
    }
    async function pump(){
      if(running)return running;
      running=(async()=>{
        const attempted=new Set();
        while(true){
          const job=(await jobs()).find(j=>!attempted.has(j.id)&&(!terminal.has(j.status)||!j.reported));if(!job)break;attempted.add(job.id);
          if(terminal.has(job.status)){if(!job.reported)await receipt(job);continue;}
          controller=new AbortController();
          try{job.status='active';await save(job);job.result=await api.upload(job,save,controller.signal);job.status='completed';job.error='';}
          catch(e){job.error=e.message||'Google save interrupted. Check Drive.';job.status=terminal.has(e.status)?e.status:'interrupted';job.attempts=(job.attempts||0)+1;if(job.status==='interrupted'&&job.attempts>=3)job.status='uncertain';}
          finally{controller=null;}
          await save(job);if(terminal.has(job.status))await receipt(job);
        }
      })().finally(async()=>{running=null;if(!(await jobs()).some(j=>!terminal.has(j.status)||!j.reported))await chrome.alarms.clear?.('google-drive:resume');});return running;
    }
    async function wake(){
      const legacy=(await chrome.storage.local.get('googleDriveTransfer')).googleDriveTransfer;
      if(legacy?.status==='active'&&!(await jobs()).some(j=>j.id===legacy.id))await chrome.storage.local.set({googleDriveTransfer:{status:'uncertain',error:'An earlier transfer-page save was interrupted. Check Drive before saving again.'}});
      await chrome.alarms.create('google-drive:resume',{periodInMinutes:.5});return pump();
    }
    async function enqueue(source,accountId){return serial(async()=>{
      const all=await jobs();if(all.filter(j=>!terminal.has(j.status)||!j.reported).length>=8)throw Error('Google Drive queue is full. Wait, then try again.');
      const job={id:crypto.randomUUID(),accountId,source,status:'queued',offset:0,phase:'source',at:Date.now()};
      all.push(job);await chrome.storage.local.set({[KEY]:all});return job;
    });}
    async function connect(){
      if(connecting)return connecting;
      // Called only from a native click or the Shelf's explicit login button.
      connecting=api.connect(true).finally(()=>{connecting=null;});return connecting;
    }
    async function dispatch(info){
      if(info.menuItemId!=='provider:google-drive'||clicks.has(info))return;clicks.add(info);
      try{
        const source={url:RedownGoogleDriveStream.sourceURL(info.srcUrl||info.linkUrl||info.pageUrl||'').href,...(info.downloadFilename?{downloadFilename:String(info.downloadFilename)}:{}),pageUrl:info.pageUrl||'',srcUrl:info.srcUrl||'',frameUrl:info.frameUrl||'',linkUrl:info.linkUrl||''};
        // Existing broad source grants normally make this unnecessary; request
        // new access only during the initiating browser gesture.
        const access={origins:[new URL(source.url).origin+'/*']};
        const permission=chrome.permissions.request(access);
        const current=await chrome.storage.local.get('googleDriveState');
        if(current.googleDriveState?.phase==='connecting')return;
        const identity=current.googleDriveState?.phase==='connected'&&current.googleDriveState.accountId?Promise.resolve(current.googleDriveState.accountId):connect();
        const [granted,accountId]=await Promise.all([permission,identity]);if(!granted)throw Error('Source access was not granted. Click again to retry.');
        await enqueue(source,accountId);void wake().catch(()=>{});
      }catch(e){await chrome.storage.local.set({googleDriveTransfer:{status:'blocked',error:e.message||'Reconnect Google Drive and try again.'}});}
    }
    const ownsMessage=m=>['googleDriveOpen','googleDriveStatus','googleDriveCancel'].includes(m?.type);
    async function message(m,sender){
      if(sender.id!==chrome.runtime.id||sender.url?.split(/[?#]/)[0]!==chrome.runtime.getURL('shelf.html'))return {ok:false};
      try{
        if(m.type==='googleDriveOpen'){await connect();return {ok:true};}
        if(m.type==='googleDriveStatus'){void wake().catch(()=>{});return {ok:true};}
        if(m.type==='googleDriveCancel'){
          controller?.abort();for(const j of await jobs())if(['queued','interrupted'].includes(j.status)){j.status='cancelled';j.error='Save cancelled.';await save(j);await receipt(j);}return {ok:true};
        }
      }catch{return {ok:false,error:'Google Drive needs attention. Reconnect and try again.'};}return {ok:false};
    }
    function install(){
      chrome.alarms.onAlarm.addListener(a=>{if(a.name==='google-drive:resume')void pump().catch(()=>{});});
      chrome.runtime.onStartup.addListener(()=>void wake().catch(()=>{}));
      chrome.runtime.onInstalled.addListener(()=>void wake().catch(()=>{}));
      void wake().catch(()=>{});
    }
    return {dispatch,message,ownsMessage,install,pump};
  }
  let instance;
  globalThis.RedownGoogleDriveProvider={create,install(record){instance=create({record});instance.install();},dispatch:info=>instance.dispatch(info),message:(m,s)=>instance.message(m,s),ownsMessage:m=>['googleDriveOpen','googleDriveStatus','googleDriveCancel'].includes(m?.type)};
})();
