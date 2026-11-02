/* Local lifetime delivery count. No URLs, names or credentials in counter state. */
(() => {
  function create(storage, locks, archive) {
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
    const counted=entry=>entry?.providerKind==='dropbox'?entry.ok===true&&dropboxProof(entry):delivered(entry);
    function increment(counter,amount){return {...counter,total:String(BigInt(counter.total)+BigInt(amount))};}
    return {
      read:()=>serial(async()=>{const {counter}=await state();await storage.set({transferCounter:counter});return counter;}),
      add:amount=>serial(async()=>{
        if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid completed-file count');
        const {counter}=await state(),next=increment(counter,amount);await storage.set({transferCounter:next});return next;
      }),
      record:entry=>serial(async()=>{
        const {counter,history}=await state(),now=new Date().toISOString();
        // Do not rewrite old History/totals; reject weak NEW Dropbox completions.
        if(entry?.providerKind==='dropbox'&&entry.ok===true&&!dropboxProof(entry))entry={...entry,ok:undefined,verified:false,status:'uncertain',location:'',error:'Dropbox completion lacks verified destination evidence.'};
        // Future verified receipts only: never infer provider lifetime totals from
        // the bounded legacy History window. IDs persist across worker restarts.
        const provider=entry?.providerKind;
        const confirmed=entry?.ok===true&&entry?.verified===true&&
          ['cloudflare','google','dropbox','onedrive'].includes(provider)&&
          typeof entry.deliveryId==='string'&&entry.deliveryId.startsWith(provider+':');
        const storedProviders=confirmed?await storage.get('providerSaveReceipts'):{};
        const providers=storedProviders.providerSaveReceipts||{version:1,startedAt:now,totals:{},ids:[]};
        if(confirmed&&providers.ids.includes(entry.deliveryId))return;
        const providerPatch=confirmed?{providerSaveReceipts:{...providers,
          totals:{...providers.totals,[provider]:String(BigInt(providers.totals[provider]||'0')+1n)},
          ids:[...providers.ids,entry.deliveryId],
          latest:{id:entry.deliveryId,provider,at:Date.now(),verified:true,accountId:entry.destination?.accountId,connectionId:entry.destination?.connectionId}}}:{};
        const dropboxId=counted(entry)&&entry?.providerKind==='dropbox'&&/^dropbox:[\w-]+$/.test(entry.deliveryId||'')?entry.deliveryId:null;
        const deliveredIds=dropboxId?(await storage.get('dropbox:deliveries'))['dropbox:deliveries']||[]:[];
        if(dropboxId&&deliveredIds.includes(dropboxId))return;
        const cleaned=entry?.providerKind!=='dropbox'&&entry?.ok&&entry?.sourceUrl?history.filter(item=>{
          if(item?.ok||item?.sourceUrl!==entry.sourceUrl||entry.profileId&&item?.profileId&&item.profileId!==entry.profileId)return true;
          const age=Math.abs(Date.now()-new Date(item?.at||0).getTime());return !Number.isFinite(age)||age>5*60*1000;
        }):history;
        const saved={...entry,id:provider==='dropbox'&&entry.deliveryId?entry.deliveryId+':'+entry.status:crypto.randomUUID(),at:now};
        // Archive before truncating the legacy 50-row compatibility window.
        // Archival failure must not misreport a completed upload as a failure;
        // the visible window and lifetime count still persist as before.
        if(archive)try{await archive.append(saved);}catch(error){
          console.warn('REDOWN archive unavailable; recent transfer retained:',error?.message||String(error));
        }
        const next=[saved,...cleaned].slice(0,50);
        await storage.set({...providerPatch,transferHistory:next,transferCounter:increment(counter,counted(entry)?1:0),...(dropboxId?{['dropbox:deliveries']:[...deliveredIds,dropboxId].slice(-128)}:{})});
      })
    };
  }
  globalThis.RedownTransferCounter={create};
})();
