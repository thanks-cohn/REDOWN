/* Local lifetime delivery count. No URLs, names or credentials in counter state. */
(() => {
  function create(storage, locks) {
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
    function increment(counter,amount){return {...counter,total:String(BigInt(counter.total)+BigInt(amount))};}
    return {
      read:()=>serial(async()=>{const {counter}=await state();await storage.set({transferCounter:counter});return counter;}),
      add:amount=>serial(async()=>{
        if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid completed-file count');
        const {counter}=await state(),next=increment(counter,amount);await storage.set({transferCounter:next});return next;
      }),
      record:entry=>serial(async()=>{
        const {counter,history}=await state(),now=new Date().toISOString();
        const cleaned=entry?.ok&&entry?.sourceUrl?history.filter(item=>{
          if(item?.ok||item?.sourceUrl!==entry.sourceUrl||entry.profileId&&item?.profileId&&item.profileId!==entry.profileId)return true;
          const age=Math.abs(Date.now()-new Date(item?.at||0).getTime());return !Number.isFinite(age)||age>5*60*1000;
        }):history;
        const next=[{id:crypto.randomUUID(),at:now,...entry},...cleaned].slice(0,50);
        await storage.set({transferHistory:next,transferCounter:increment(counter,delivered(entry)?1:0)});
      })
    };
  }
  globalThis.RedownTransferCounter={create};
})();
