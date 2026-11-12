/* Local lifetime delivery count. No URLs, names or credentials in counter state. */
(() => {
  function create(storage, locks, archive, clock=()=>new Date()) {
    let queue=Promise.resolve();
    const serial=task=>{
      const run=()=>locks?.request?locks.request('redown-transfer-history',task):task();
      const next=queue.catch(()=>{}).then(run);queue=next;return next;
    };
    const dropboxProof=entry=>{const d=entry?.destination;return entry?.verified===true&&/^dropbox:[\w-]+$/.test(entry.deliveryId||'')&&entry.status==='completed'&&d?.proofVersion===1&&/^dbid:[\w-]+$/.test(d.accountId||'')&&!!d.connectionId&&/^\d+$/.test(d.namespace||'')&&d.root==='/'&&/^id:[\w-]+$/.test(d.fileId||'')&&!!d.revision&&/^[a-f0-9]{64}$/.test(d.contentHash||'')&&typeof d.name==='string'&&!!d.name&&!d.name.includes('/')&&d.path==='/'+d.name&&Number.isSafeInteger(d.bytes)&&d.bytes>=0;};
    const delivered=entry=>entry?.ok===true&&typeof entry.location==='string'&&/^(https?:\/\/|R2: )/.test(entry.location);
    async function state(){
      const stored=await storage.get(['transferCounter','transferHistory']);
      const history=Array.isArray(stored.transferHistory)?stored.transferHistory:[];
      if(stored.transferCounter?.version===1&&typeof stored.transferCounter.total==='string'&&/^(0|[1-9]\d*)$/.test(stored.transferCounter.total))return {counter:stored.transferCounter,history};
      return {counter:{version:1,total:String(history.filter(delivered).length),startedAt:new Date().toISOString(),basis:'retained-history-plus-completions'},history};
    }
    // OneDrive's Graph upload path independently GET-verifies the exact
    // uploaded item ID, parent root and byte count. A missing optional webUrl
    // must not erase a genuine completed save from the lifetime odometer.
    const onedriveProof=entry=>entry?.providerKind==='onedrive'&&entry.ok===true&&
      entry.verified===true&&entry.status==='completed'&&
      /^onedrive:[\w-]+$/.test(entry.deliveryId||'')&&
      typeof entry.destination?.accountId==='string'&&!!entry.destination.accountId&&
      typeof entry.destination?.itemId==='string'&&!!entry.destination.itemId&&
      typeof entry.destination?.driveId==='string'&&!!entry.destination.driveId&&
      typeof entry.destination?.rootId==='string'&&!!entry.destination.rootId&&
      Number.isSafeInteger(entry.bytes)&&entry.bytes>=0;
    // Verifier-backed cloud proofs are required before the provider card,
    // daily badge or SUCCESS! is allowed to claim a new save.
    const cloudflareProof=entry=>{
      const v=entry?.verification,d=entry?.destination;
      return entry?.providerKind==='cloudflare'&&entry?.ok===true&&
        entry?.verified===true&&entry?.status==='completed'&&
        /^cloudflare:[\w-]+$/.test(entry.deliveryId||'')&&
        v?.kind==='r2-head-v1'&&typeof v.sessionId==='string'&&!!v.sessionId&&
        typeof d?.accountId==='string'&&!!d.accountId&&
        typeof d.bucketName==='string'&&!!d.bucketName&&
        typeof d.key==='string'&&!!d.key&&d.key===v.key&&
        Number.isSafeInteger(entry.bytes)&&entry.bytes>=0&&v.bytes===entry.bytes&&
        typeof v.etag==='string'&&!!v.etag;
    };
    const googleProof=entry=>entry?.providerKind==='google'&&
      entry?.ok===true&&entry?.verified===true&&entry?.status==='completed'&&
      /^google:[\w-]+$/.test(entry.deliveryId||'')&&
      typeof entry.destination?.fileId==='string'&&
      /^[\w-]+$/.test(entry.destination.fileId)&&
      entry.deliveryId==='google:'+entry.destination.fileId;
    const providerProof=entry=>entry?.ok===true&&entry?.verified===true&&
      entry?.status==='completed'&&(
      entry.providerKind==='cloudflare'?cloudflareProof(entry):
      entry.providerKind==='google'?googleProof(entry):
      entry.providerKind==='dropbox'?dropboxProof(entry):
      entry.providerKind==='onedrive'?onedriveProof(entry):false);
    // Provider-attributed saves can advance the lifetime odometer only through
    // the SAME verifier that authorizes the card and daily toolbar badge.
    // Legacy un-attributed History keeps its historical compatibility rule.
    const counted=entry=>['cloudflare','google','dropbox','onedrive'].includes(entry?.providerKind)?
      providerProof(entry):delivered(entry);
    function increment(counter,amount){return {...counter,total:String(BigInt(counter.total)+BigInt(amount))};}
    // Local calendar dates, not an arbitrary rolling 24h window. The service
    // worker's local timezone is the user's Chrome system timezone.
    const localDay=when=>{
      const d=when instanceof Date?when:new Date(when);
      return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    };
    const validDaily=(v,day)=>v?.version===1&&v.day===day&&
      typeof v.total==='string'&&/^(0|[1-9]\d*)$/.test(v.total);
    const freshDaily=day=>({version:1,day,total:'0'});
    async function dailyState(){
      const today=localDay(clock());
      const stored=(await storage.get('redownDailyVerified')).redownDailyVerified;
      return {daily:validDaily(stored,today)?stored:freshDaily(today),reset:!validDaily(stored,today)};
    }
    const storageFailure=(error,entry,operation)=>{
      globalThis.RedownForensicDiagnostics?.capture(entry?.attemptId,'error',{error,component:'runtime',phase:'history',storageArea:'local',storageOperation:operation});
      const names=['QuotaExceededError','AbortError','InvalidStateError','UnknownError','NotFoundError','VersionError','SecurityError','DataError','ConstraintError','TransactionInactiveError','TypeError'];
      const exceptionName=names.includes(error?.name)?error.name:/quota|QUOTA_BYTES|disk.*full/i.test(String(error?.message||''))?'QuotaExceededError':'Error';
      globalThis.RedownSaveEvidence?.note(entry?.attemptId,{phase:'history',code:'HISTORY_UNAVAILABLE',storageArea:'local',storageOperation:operation,exceptionName});
      const failure=new Error('REDOWN local History accounting is unavailable.');
      return Object.assign(failure,{localHistoryFailure:true,remoteVerified:providerProof(entry),exceptionName,storageOperation:operation});
    };
    return {
      isVerifiedReceipt:providerProof,
      read:()=>serial(async()=>{const {counter}=await state();await storage.set({transferCounter:counter});return counter;}),
      readDaily:()=>serial(async()=>{
        const {daily,reset}=await dailyState();
        if(reset)await storage.set({redownDailyVerified:daily});
        return daily;
      }),
      add:amount=>serial(async()=>{
        if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid completed-file count');
        const {counter}=await state(),next=increment(counter,amount);await storage.set({transferCounter:next});return next;
      }),
      record:entry=>serial(async()=>{
        let operation='state-read';
        try{
        const {counter,history}=await state(),now=new Date().toISOString();
        // Do not rewrite old History/totals; reject weak NEW Dropbox completions.
        if(entry?.providerKind==='dropbox'&&entry.ok===true&&!dropboxProof(entry))entry={...entry,ok:undefined,verified:false,status:'uncertain',location:'',error:'Dropbox completion lacks verified destination evidence.'};
        // Future verified receipts only: never infer provider lifetime totals from
        // the bounded legacy History window. IDs persist across worker restarts.
        const provider=entry?.providerKind;
        const confirmed=providerProof(entry);
        operation='receipt-read';
        const storedProviders=confirmed?await storage.get('providerSaveReceipts'):{};
        const providers=storedProviders.providerSaveReceipts||{version:1,startedAt:now,totals:{},ids:[]};
        if(confirmed&&providers.ids.includes(entry.deliveryId))return {newVerified:false,duplicate:true};
        const providerPatch=confirmed?{providerSaveReceipts:{...providers,
          totals:{...providers.totals,[provider]:String(BigInt(providers.totals[provider]||'0')+1n)},
          ids:[...providers.ids,entry.deliveryId],
          latest:{id:entry.deliveryId,provider,at:Date.now(),verified:true,accountId:entry.destination?.accountId,connectionId:entry.destination?.connectionId,
            ...(provider==='cloudflare'?{sessionId:entry.verification.sessionId,proof:'r2-head-v1'}:{})}}}:{};
        // This badge is a calendar-day count of VERIFIED new cloud files, not
        // attempted clicks, local browser downloads, or the lifetime odometer.
        // Commit the daily increment atomically alongside the provider receipt.
        // Never infer historical days from the bounded 50-row History.
        operation='daily-read';
        const day=confirmed?(await dailyState()).daily:null;
        const dailyPatch=confirmed?{redownDailyVerified:{...day,total:String(BigInt(day.total)+1n)}}:{};
        const dropboxId=counted(entry)&&entry?.providerKind==='dropbox'&&/^dropbox:[\w-]+$/.test(entry.deliveryId||'')?entry.deliveryId:null;
        operation='dedupe-read';
        const deliveredIds=dropboxId?(await storage.get('dropbox:deliveries'))['dropbox:deliveries']||[]:[];
        if(dropboxId&&deliveredIds.includes(dropboxId))return {newVerified:false,duplicate:true};
        const cleaned=entry?.providerKind!=='dropbox'&&entry?.ok&&entry?.sourceUrl?history.filter(item=>{
          if(item?.ok||item?.sourceUrl!==entry.sourceUrl||entry.profileId&&item?.profileId&&item.profileId!==entry.profileId)return true;
          const age=Math.abs(Date.now()-new Date(item?.at||0).getTime());return !Number.isFinite(age)||age>5*60*1000;
        }):history;
        const saved={...entry,id:confirmed?entry.deliveryId+':completed':provider==='dropbox'&&entry.deliveryId?entry.deliveryId+':'+entry.status:crypto.randomUUID(),at:now};
        // Archive before truncating the legacy 50-row compatibility window.
        // Archival failure must not misreport a completed upload as a failure;
        // the visible window and lifetime count still persist as before.
        if(archive)try{await archive.append(saved);}catch(error){
          globalThis.RedownForensicDiagnostics?.capture(entry?.attemptId,'error',{error,component:'runtime',phase:'history',storageArea:'indexedDB',storageOperation:'archive-write'});
          globalThis.RedownSaveEvidence?.note(entry?.attemptId,{phase:'history',code:'HISTORY_UNAVAILABLE',storageArea:'indexedDB',storageOperation:'archive-write',exceptionName:['QuotaExceededError','AbortError','InvalidStateError','UnknownError','VersionError','SecurityError'].includes(error?.name)?error.name:'Error'});
          console.warn('REDOWN archive unavailable; recent transfer retained:',error?.message||String(error));
        }
        const next=[saved,...cleaned].slice(0,50);
        operation='local-commit';
        await storage.set({...providerPatch,...dailyPatch,transferHistory:next,transferCounter:increment(counter,counted(entry)?1:0),...(dropboxId?{['dropbox:deliveries']:[...deliveredIds,dropboxId].slice(-128)}:{})});
        return {newVerified:confirmed};
        }catch(error){throw storageFailure(error,entry,operation);}
      })
    };
  }
  globalThis.RedownTransferCounter={create};
})();
