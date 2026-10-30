/* Local lifetime delivery count and user-owned history.
 * `transferHistory` stays a 50-item compatibility window.
 * `transferHistoryArchiveV1` preserves the full recorded event journal for
 * History and versioned JSON exports, independently of browsing cache.
 */
(() => {
  const ARCHIVE_KEY='transferHistoryArchiveV1';
  function create(storage,locks) {
    let queue=Promise.resolve();
    const serial=task=>{
      const run=()=>locks?.request?locks.request('redown-transfer-history',task):task();
      const next=queue.catch(()=>{}).then(run);queue=next;return next;
    };
    const delivered=entry=>entry?.ok===true&&typeof entry.location==='string'&&/^(https?:\/\/|R2: )/.test(entry.location);
    const identity=record=>record?.id?'id:'+record.id:'legacy:'+JSON.stringify(record);
    function combine(archive,recent){
      const seen=new Set(archive.map(identity));
      const missing=recent.filter(item=>{const key=identity(item);if(seen.has(key))return false;seen.add(key);return true;});
      return [...archive,...missing].sort((a,b)=>(Date.parse(b?.at)||0)-(Date.parse(a?.at)||0));
    }
    async function state(){
      const stored=await storage.get(['transferCounter','transferHistory',ARCHIVE_KEY]);
      const history=Array.isArray(stored.transferHistory)?stored.transferHistory:[];
      const archive=Array.isArray(stored[ARCHIVE_KEY])?stored[ARCHIVE_KEY]:[];
      const records=combine(archive,history);
      const counter=stored.transferCounter?.version===1&&typeof stored.transferCounter.total==='string'&&/^(0|[1-9]\d*)$/.test(stored.transferCounter.total)
        ?stored.transferCounter
        :{version:1,total:String(history.filter(delivered).length),startedAt:new Date().toISOString(),basis:'retained-history-plus-completions'};
      return {counter,history,records};
    }
    function increment(counter,amount){return {...counter,total:String(BigInt(counter.total)+BigInt(amount))};}
    return {
      read:()=>serial(async()=>{const {counter}=await state();await storage.set({transferCounter:counter});return counter;}),
      add:amount=>serial(async()=>{
        if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid completed-file count');
        const {counter}=await state(),next=increment(counter,amount);await storage.set({transferCounter:next});return next;
      }),
      history:()=>serial(async()=>{const {records}=await state();return records;}),
      update:(id,change)=>serial(async()=>{
        if(typeof id!=='string'||!id)throw Error('Select a recorded history event.');
        const {history,records}=await state(),index=records.findIndex(item=>item?.id===id);
        if(index<0)throw Error('Download history entry was not found');
        const updated={...records[index],...change};
        records[index]=updated;
        const recent=history.map(item=>item?.id===id?updated:item);
        await storage.set({[ARCHIVE_KEY]:records,transferHistory:recent});
        return updated;
      }),
      record:entry=>serial(async()=>{
        const {counter,history,records}=await state(),now=new Date().toISOString();
        const full={id:crypto.randomUUID(),at:now,...entry};
        const cleaned=entry?.ok&&entry?.sourceUrl?history.filter(item=>{
          if(item?.ok||item?.sourceUrl!==entry.sourceUrl||entry.profileId&&item?.profileId&&item.profileId!==entry.profileId)return true;
          const age=Math.abs(Date.now()-new Date(item?.at||0).getTime());return !Number.isFinite(age)||age>5*60*1000;
        }):history;
        // Archive keeps every success, failure and retry; only the legacy
        // compatibility window retains its historical retry cleanup behavior.
        await storage.set({
          [ARCHIVE_KEY]:[full,...records],
          transferHistory:[full,...cleaned].slice(0,50),
          transferCounter:increment(counter,delivered(entry)?1:0)
        });
      })
    };
  }
  globalThis.RedownTransferCounter={create};
})();
