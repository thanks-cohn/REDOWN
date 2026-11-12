/* Read-only canonical projection. Existing provider state machines remain the only writers. */
(() => {
  'use strict';
  const KEYS=['googleDriveJobs','dropbox:jobs','onedrive:transfer','onedrive:verifiedReceiptPendingHistory','transferHistory','providerSaveReceipts','transferCounter','redownDailyVerified','googleDriveState','dropbox:state','onedrive:state','cloudflareAuth','cloudflare:verifiedReceiptPendingHistory','entryPointEvidence','debugModeEnabled','redownQueueAcknowledgedV1'];
  const providers=['google','dropbox','onedrive','cloudflare'];
  const phaseStates={source:'fetching',starting:'uploading',session:'uploading',uploading:'uploading',committing:'uploading',verifying:'verifying'};
  const attention=new Set(['failed','blocked','uncertain','interrupted','needs-attention']);
  const active=new Set(['received','queued','active','fetching','uploading','verifying']);
  const number=n=>Number.isSafeInteger(n)&&n>=0?n:null;
  const time=n=>Number.isFinite(n)?n:typeof n==='string'&&Number.isFinite(Date.parse(n))?Date.parse(n):null;
  const safeName=v=>typeof v==='string'&&v?v.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,180):'Name unavailable';
  const kind=v=>providers.includes(v)?v:v==='google-drive'?'google':null;
  const reviewVersion=row=>row.id+'@'+row.state+'@'+(row.outcomeAt??row.lastActivityAt);
  const safeCode=e=>globalThis.RedownSaveEvidence?.classify(e)||'PROVIDER_FAILED';
  function eligibleActions(row){
    return ['view-trace',...(!row.acknowledged&&(['failed','blocked','uncertain','interrupted','needs-attention'].includes(row.state)||row.accountingPending)?['acknowledge']:[]),...(row.historyLinked?['view-history']:[]),...(row.state==='uncertain'||row.state==='interrupted'?['check-destination']:[]),...(/AUTH|PERMISSION|GRAPH_40[13]/.test(row.code)?['review-connection']:[]),...(row.code==='SOURCE_RETURNED_HTML'?['choose-actual-asset']:[])];
  }
  function project(data={},attemptSnapshot={},now=Date.now()){
    const attempts=Array.isArray(attemptSnapshot.attempts)?attemptSnapshot.attempts.slice(-100):[],history=Array.isArray(data.transferHistory)?data.transferHistory.slice(0,50):[],rows=new Map();
    for(const a of attempts){
      if(!a||typeof a!=='object'||!a.id)continue;
      const events=Array.isArray(a.events)?a.events:[],last=events.at(-1),observations=a.observations||[],code=[...observations].reverse().find(e=>e.code)?.code;
      const state=last?.stage!=='TERMINAL'&&observations.at(-1)?.phase==='auth'&&observations.at(-1)?.code==='AUTH_PENDING'?'waiting-for-login':last?.stage==='TERMINAL'?{COMPLETED:'verified',FAILED:'failed',BLOCKED:'blocked',CANCELLED:'cancelled',UNCERTAIN:'uncertain',INTERRUPTED:'interrupted'}[last.outcome]||'received':{SOURCE_REQUEST:'fetching',PROVIDER_WRITE:'uploading',REMOTE_VERIFY:'verifying',ADMITTED:'queued',AUTH_CHECKED:'received',ROUTE_RESOLVED:'received'}[last?.stage]||'received';
      rows.set(a.id,{id:a.id,attemptId:a.id,provider:kind(a.provider)||'unknown',name:'Name unavailable',state,originalState:state,accountingPending:state==='verified'&&last?.reason==='HISTORY_UNAVAILABLE',code:state==='verified'&&last?.reason!=='HISTORY_UNAVAILABLE'?'OK':code||last?.reason||'OK',receivedAt:events[0]?.at??null,lastActivityAt:Math.max(last?.at||0,observations.at(-1)?.at||0)||null,outcomeAt:last?.stage==='TERMINAL'?last.at:null,attemptOnly:true,jobLinked:false,historyLinked:false,bytes:null,total:null,destination:null,sourceId:a.sourceId||observations.find(e=>e.sourceId)?.sourceId||null,evidence:a});
    }
    function mergeJob(provider,job,index,position){
      const attemptId=job.source?.attemptId||job.attemptId,id=attemptId||provider+':'+(job.id||'legacy-'+index),prior=rows.get(id)||{};
      const status=['queued','active','awaiting-auth','completed','failed','blocked','uncertain','cancelled','interrupted'].includes(job.status)?job.status:'needs-attention',terminal=['completed','failed','blocked','uncertain','cancelled','interrupted'].includes(status);
      const ownerProof=job.verified===true||provider==='dropbox'&&job.result?.proofVersion===1&&/^dbid:[\w-]+$/.test(job.accountId||'')&&!!job.connectionId&&/^\d+$/.test(job.namespace||'')&&job.result.accountId===job.accountId&&job.result.connectionId===job.connectionId&&job.result.namespace===job.namespace&&job.result.root==='/'&&job.result.path==='/'+job.result.name&&/^id:[\w-]+$/.test(job.result.fileId||'')&&!!job.result.revision&&/^[a-f0-9]{64}$/.test(job.result.contentHash||'')&&Number.isSafeInteger(job.result.bytes)&&job.result.bytes>=0&&job.result.bytes===job.offset||provider==='google'&&/^[\w-]+$/.test(job.result?.fileId||'')&&Number.isSafeInteger(job.result?.bytes)&&job.result.bytes>=0;
      const state=status==='awaiting-auth'?'waiting-for-login':status==='completed'?(ownerProof?'verified':'verifying'):status==='active'?phaseStates[job.phase]||'active':status||'received';
      const at=time(job.updatedAt)||time(job.at)||prior.lastActivityAt;
      // A resumed job outranks an observer's restart interruption. Its owner, not the recorder, decides recovery.
      const row={...prior,id,attemptId:attemptId||null,provider,name:safeName(job.result?.name||job.name),state,originalState:state,accountingPending:status==='completed'&&(!ownerProof||job.reported===false||job.accountingPending===true||prior.accountingPending===true),code:state==='verified'?(job.reported===false||job.accountingPending===true||prior.accountingPending===true?'HISTORY_UNAVAILABLE':'OK'):job.code?safeCode({code:job.code}):job.error?safeCode({message:job.error}):terminal&&status==='completed'&&state!=='verified'?'UNCONFIRMED':prior.code||'OK',receivedAt:prior.receivedAt||time(job.at)||null,lastActivityAt:Math.max(at||0,prior.lastActivityAt||0)||null,attemptOnly:false,jobLinked:true,historyLinked:prior.historyLinked||false,phase:job.errorPhase||job.phase||null,outcomeAt:terminal?at:null,sourceBytes:number(job.sourceBytes),bytes:number(job.offset??job.bytes),total:number(job.total),queuePosition:status==='queued'?position:null,retryAt:time(job.nextRetryAt)||time(prior.evidence?.observations?.filter(o=>Number.isFinite(o.retryAt)).at(-1)?.retryAt),resumed:typeof job.resumed==='boolean'?job.resumed:(job.attempts||0)>0?true:prior.evidence?.observations?.filter(o=>o.phase==='pump'&&typeof o.resumed==='boolean').at(-1)?.resumed??null,destination:provider==='google'?{provider,accountId:job.accountId,folderId:job.folderId||null,fileId:job.result?.fileId}:provider==='dropbox'?{provider,accountId:job.accountId,namespace:job.namespace,root:'/',path:job.result?.path,fileId:job.result?.fileId}:{provider,accountId:job.accountId,driveId:job.driveId,rootId:job.rootId}};
      rows.set(id,row);
    }
    for(const [provider,key] of [['google','googleDriveJobs'],['dropbox','dropbox:jobs']]){let position=0;for(const [index,job] of (Array.isArray(data[key])?data[key]:[]).slice(-64).entries()){if(!job||typeof job!=='object')continue;if(!['completed','failed','blocked','uncertain','cancelled','interrupted'].includes(job.status))position++;mergeJob(provider,job,index,position);}}
    const one=data['onedrive:transfer'];if(one?.id||one?.attemptId)mergeJob('onedrive',one,0);
    // Receipts are local proof only; reconcile accounting without re-uploading.
    for(const [provider,entry] of [...Object.values(data['cloudflare:verifiedReceiptPendingHistory']||{}).map(e=>['cloudflare',e]),['onedrive',data['onedrive:verifiedReceiptPendingHistory']]]){
      if(!entry?.attemptId||entry.ok!==true||entry.verified!==true||entry.status!=='completed'||data.providerSaveReceipts?.ids?.includes(entry.deliveryId))continue;
      const prior=rows.get(entry.attemptId)||{};
      rows.set(entry.attemptId,{...prior,id:entry.attemptId,attemptId:entry.attemptId,provider,name:safeName(entry.filename),state:'verified',originalState:'verified',verified:true,accountingPending:true,code:'HISTORY_UNAVAILABLE',receivedAt:prior.receivedAt||time(entry.at),lastActivityAt:prior.lastActivityAt||time(entry.at),outcomeAt:prior.outcomeAt||time(entry.at),destination:entry.destination,bytes:number(entry.bytes),historyLinked:prior.historyLinked||false,attemptOnly:prior.attemptOnly??true});
    }
    // Newest terminal History receipt wins over older admission rows for the same attempt.
    const reconciled=new Set();
    for(const [index,h] of history.entries()){
      if(!h||typeof h!=='object')continue;
      const provider=kind(h.providerKind||h.destination?.provider);if(!provider)continue;
      const attemptId=h.attemptId||null,id=attemptId||provider+':'+(h.transferId||h.id||'history-'+index);
      if(reconciled.has(id))continue;
      const definitive=['completed','failed','blocked','uncertain','cancelled','interrupted'].includes(h.status);
      const prior=rows.get(id)||{};
      const verified=h.ok===true&&h.verified===true&&h.status==='completed';
      if(definitive)reconciled.add(id);
      // An old queued History observation cannot hide the current active job.
      const ownerNewer=prior.jobLinked&&active.has(prior.state)&&prior.lastActivityAt>time(h.at);
      const state=definitive&&!ownerNewer?(verified?'verified':h.status==='completed'?'uncertain':h.status):prior.state||h.status||'received';
      rows.set(id,{...prior,id,attemptId,provider,name:safeName(h.filename||h.destination?.name||prior.name),state,originalState:state,code:ownerNewer?prior.code||'OK':verified?'OK':h.error?(safeCode({code:h.code,message:h.error})==='PROVIDER_FAILED'?prior.code||'PROVIDER_FAILED':safeCode({code:h.code,message:h.error})):prior.code||'OK',receivedAt:prior.receivedAt||time(h.at),lastActivityAt:Math.max(prior.lastActivityAt||0,time(h.at)||0)||null,outcomeAt:definitive&&!ownerNewer?time(h.at):prior.outcomeAt??null,accountingPending:verified?false:prior.accountingPending||false,historyLinked:true,historyId:h.id||null,attemptOnly:prior.attemptOnly??true,jobLinked:prior.jobLinked||false,bytes:verified&&!ownerNewer?number(h.bytes):prior.bytes??null,total:prior.total??null,destination:ownerNewer?prior.destination||h.destination||null:h.destination||prior.destination||null,verified:state==='verified'&&verified,receiptId:verified?h.deliveryId||null:null});
    }
    const all=[...rows.values()].map(row=>{
      const age=now-(row.lastActivityAt||now),threshold=row.state==='waiting-for-login'?600000:row.state==='queued'||row.state==='received'?120000:row.state==='uploading'?180000:90000;
      if((active.has(row.state)||row.state==='waiting-for-login')&&age>threshold&&!(row.retryAt&&row.retryAt>now))row={...row,state:'needs-attention',code:row.accountingPending?'HISTORY_UNAVAILABLE':row.state==='queued'?'QUEUE_STALLED':row.state==='waiting-for-login'?'AUTH_PENDING':'UNCONFIRMED',attentionReason:'No new owner observation within the phase deadline; no write is replayed.'};
      const acknowledged=(Array.isArray(data.redownQueueAcknowledgedV1)?data.redownQueueAcknowledgedV1:[]).includes(reviewVersion(row));
      row={...row,acknowledged};
      const reference={};for(const k of ['provider','accountId','bucketName','prefix','key','path','folderId','itemId','fileId','namespace','driveId','rootId','root'])if(typeof row.destination?.[k]==='string')reference[k]=row.destination[k].slice(0,1000);
      return {...row,destination:Object.keys(reference).length?reference:null,actions:eligibleActions(row)};
    }).sort((a,b)=>Number(b.state!=='verified'&&b.state!=='cancelled')-Number(a.state!=='verified'&&a.state!=='cancelled')||(b.receivedAt||0)-(a.receivedAt||0));
    const counts={active:0,waiting:0,attention:0,completed:0,pending:0};
    for(const r of all){if(active.has(r.state))counts.active++;if(r.state==='waiting-for-login')counts.waiting++;if((attention.has(r.state)||r.accountingPending)&&!r.acknowledged)counts.attention++;if(r.state==='verified')counts.completed++;if(active.has(r.state)||(attention.has(r.state)||r.accountingPending)&&!r.acknowledged||r.state==='waiting-for-login')counts.pending++;}
    return {schemaVersion:1,observedAt:now,rows:all.slice(0,100),omitted:Math.max(0,all.length-100),counts,gaps:[],observationScope:'Local owner state and receipts; no provider probe or write',retryPolicy:'No generic replay: use the owning provider after reviewing exact destination and uncertain commits.'};
  }
  function create({storage,attempts,alarms,now=()=>Date.now(),timeoutMs=1000}={}){
    const bounded=async p=>{let t;try{return await Promise.race([p,new Promise((_,j)=>{t=setTimeout(()=>j(Error('unavailable')),timeoutMs);})]);}finally{clearTimeout(t);}};
    async function snapshot(){
      const data={},gaps=[];
      await Promise.all(KEYS.map(async key=>{try{Object.assign(data,await bounded(storage.get(key)));}catch{gaps.push(key);}}));
      let traces={attempts:[],persistence:'unavailable'};try{traces=await bounded(attempts.snapshot());}catch{gaps.push('attempt-recorder');}
      const result=project(data,traces,now());result.scheduler={};
      await Promise.all([['google','google-drive:resume'],['dropbox','dropbox:resume']].map(async([provider,name])=>{try{if(!alarms?.get)throw Error('unavailable');const alarm=await bounded(alarms.get(name));result.scheduler[provider]={state:alarm?'scheduled':'absent',nextWakeAt:Number.isFinite(alarm?.scheduledTime)?alarm.scheduledTime:null};}catch{result.scheduler[provider]={state:'unavailable',nextWakeAt:null};}}));
      result.gaps=gaps;result.tracePersistence=traces.persistence;return {data,traces,result};
    }
    return {snapshot,async acknowledge(id){if(typeof id!=='string'||id.length>200)throw Error('INVALID_ID');const {result,data}=await snapshot();const row=result.rows.find(r=>r.id===id);if(!row)throw Error('NOT_FOUND');const old=Array.isArray(data.redownQueueAcknowledgedV1)?data.redownQueueAcknowledgedV1:[];await storage.set({redownQueueAcknowledgedV1:[...old.filter(v=>typeof v==='string'&&!v.startsWith(id+'@')),reviewVersion(row)].slice(-100)});return {acknowledged:true};},async list(input={}){const {result}=await snapshot();const filters={all:()=>true,active:r=>active.has(r.state),waiting:r=>r.state==='queued'||r.state==='waiting-for-login',attention:r=>attention.has(r.state)||r.accountingPending,completed:r=>r.state==='verified'};const filter=filters[input.filter||'all'];if(!filter)throw Error('INVALID_FILTER');return {...result,rows:result.rows.filter(filter)};},async get(id){const {result}=await snapshot();return result.rows.find(r=>r.id===id)||null;},eligibleActions};
  }
  function client(chrome){return {async acknowledge(id){const r=await chrome.runtime.sendMessage({type:'transferQueueV1',operation:'acknowledge',input:{id}});if(!r?.ok)throw Error('Review could not be saved');return r.result;},async list(input={}){const r=await chrome.runtime.sendMessage({type:'transferQueueV1',operation:'list',input});if(!r?.ok)throw Error('Queue unavailable');return r.result;},async get(id){const r=await chrome.runtime.sendMessage({type:'transferQueueV1',operation:'get',input:{id}});if(!r?.ok)throw Error('Queue unavailable');return r.result;},subscribe(fn){const listener=(changes,area)=>{if(area==='local'&&Object.keys(changes).some(k=>KEYS.includes(k)||k==='redownSaveAttempts'))fn();};chrome.storage.onChanged.addListener(listener);return ()=>chrome.storage.onChanged.removeListener?.(listener);}};}
  globalThis.RedownTransferQueue={project,create,client,eligibleActions,KEYS};
})();
