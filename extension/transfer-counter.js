/* Local lifetime delivery count. No URLs, names or credentials in counter state. */
(() => {
  function create(storage, locks, archive) {
    let queue=Promise.resolve();
    const serial=task=>{
      const run=()=>locks?.request?locks.request('redown-transfer-history',task):task();
      const next=queue.catch(()=>{}).then(run);queue=next;return next;
    };
    const delivered=entry=>entry?.ok===true&&typeof entry.location==='string'&&/^(https?:\/\/|R2: )/.test(entry.location);
    async function state(){
      const stored=await storage.get(['transferCounter','transferHistory']);
      const history=Array.isArray(stored.transferHistory)?stored.transferHistory:[];
      if(stored.transferCounter?.version===1&&typeof stored.transferCounter.total==='string'&&/^(0|[1-9]\d*)$/.test(stored.transferCounter.total))return {counter:stored.transferCounter,history};
      return {counter:{version:1,total:String(history.filter(delivered).length),startedAt:new Date().toISOString(),basis:'retained-history-plus-completions'},history};
    }
    const providerFor=e=>e?.providerKind==='google-drive'||e?.provider==='Google Drive'?'google':e?.providerKind==='dropbox'||e?.provider==='Dropbox'?'dropbox':e?.providerKind==='onedrive'||e?.provider==='OneDrive'?'onedrive':e?.destination?.bucketName?'cloudflare':null;
    const receiptSuccess=e=>delivered(e)&&(e.verified===true||providerFor(e)==='cloudflare'&&Number.isSafeInteger(e.bytes)&&e.bytes>=0&&e.destination?.key);
    const receiptId=e=>typeof e?.deliveryId==='string'?e.deliveryId:typeof e?.transferId==='string'?e.transferId:null;
    async function providerState(history){
      const saved=(await storage.get('providerSaveCounters')).providerSaveCounters;
      if(saved?.version===1&&saved.totals&&saved.credited&&!saved.recovery)return saved;
      const value=saved?.version===1&&saved.totals&&saved.credited?saved:{version:1,totals:{google:'0',dropbox:'0',onedrive:'0',cloudflare:'0'},credited:{},basis:'retained-verified-receipts-plus-completions',startedAt:new Date().toISOString()};
      // No inference from the global odometer, provider quota or old unverified rows.
      const ingest=entries=>{for(const e of entries){const p=providerFor(e),id=receiptId(e)||e?.id;if(!p||!id||!receiptSuccess(e))continue;const key=p+':'+id;if(Object.hasOwn(value.credited,key))continue;value.credited[key]=true;value.totals[p]=String(BigInt(value.totals[p])+1n);}};
      ingest(history);
      if(archive?.page)try{
        let offset=0,page;
        do{page=await archive.page(offset,100);ingest(page.items);offset+=page.items.length;}while(page.items.length&&offset<page.total);
        value.basis='archived-and-retained-verified-receipts-plus-completions';delete value.recovery;
      }catch{value.recovery='archive-unavailable-at-migration';}

      return value;
    }
    function increment(counter,amount){return {...counter,total:String(BigInt(counter.total)+BigInt(amount))};}
    return {
      read:()=>serial(async()=>{const {counter,history}=await state();const providers=await providerState(history);await storage.set({transferCounter:counter,providerSaveCounters:providers});return counter;}),
      add:amount=>serial(async()=>{
        if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid completed-file count');
        const {counter}=await state(),next=increment(counter,amount);await storage.set({transferCounter:next});return next;
      }),
      record:entry=>serial(async()=>{
        const {counter,history}=await state(),now=new Date().toISOString();
        const providers=await providerState(history),provider=providerFor(entry),operation=receiptId(entry),key=provider&&operation?provider+':'+operation:null;
        const countProvider=provider&&key&&receiptSuccess(entry)&&!Object.hasOwn(providers.credited,key);
        if(countProvider){providers.credited[key]=true;providers.totals[provider]=String(BigInt(providers.totals[provider]||'0')+1n);providers.event={id:operation,provider,total:providers.totals[provider],at:Date.now()};}
        // Durable receipt identities have no rolling eviction window. Restored
        // successful callbacks cannot count or celebrate again after History pruning.
        if(key&&receiptSuccess(entry)&&!countProvider&&provider!=='dropbox'){await storage.set({providerSaveCounters:providers});return;}
        const dropboxId=entry?.providerKind==='dropbox'&&/^dropbox:[\w-]+$/.test(entry.deliveryId||'')?entry.deliveryId:null;
        const deliveredIds=dropboxId?(await storage.get('dropbox:deliveries'))['dropbox:deliveries']||[]:[];
        if(dropboxId&&deliveredIds.includes(dropboxId)){await storage.set({providerSaveCounters:providers});return;}
        const cleaned=entry?.ok&&entry?.sourceUrl?history.filter(item=>{
          if(item?.ok||item?.sourceUrl!==entry.sourceUrl||entry.profileId&&item?.profileId&&item.profileId!==entry.profileId)return true;
          const age=Math.abs(Date.now()-new Date(item?.at||0).getTime());return !Number.isFinite(age)||age>5*60*1000;
        }):history;
        const saved={...entry,id:crypto.randomUUID(),at:now};
        // Archive before truncating the legacy 50-row compatibility window.
        // Archival failure must not misreport a completed upload as a failure;
        // the visible window and lifetime count still persist as before.
        if(archive)try{await archive.append(saved);}catch(error){
          console.warn('REDOWN archive unavailable; recent transfer retained:',error?.message||String(error));
        }
        const next=[saved,...cleaned].slice(0,50);
        await storage.set({providerSaveCounters:providers,transferHistory:next,transferCounter:increment(counter,delivered(entry)?1:0),...(dropboxId?{['dropbox:deliveries']:[...deliveredIds,dropboxId].slice(-128)}:{})});
      })
    };
  }
  globalThis.RedownTransferCounter={create};
})();
