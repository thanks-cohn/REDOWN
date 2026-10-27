/* Ordinary explorer semantics. No dependency on the archived file engine. */
export function location(value) {
  if (!value || typeof value.accountId !== 'string' || !value.accountId || typeof value.bucketName !== 'string' || !value.bucketName) throw Error('Choose a cloud account and bucket first.');
  return {accountId:value.accountId,bucketName:value.bucketName,accountName:value.accountName || '',prefix:prefix(value.prefix || '')};
}
export function key(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\') || new TextEncoder().encode(value).length > 1024 || value.split('/').some(s=>s==='.'||s==='..')) throw Error('Invalid object path.');
  return value;
}
export function prefix(value) { return value ? (key(value).endsWith('/') ? value : value+'/') : ''; }
export function name(value) {
  key(value);if(value!==value.trim())throw Error('Leading or trailing spaces in new names are not supported by the existing provider route.');if(value.includes('/') || !value.trim())throw Error('Enter one file or folder name, without slashes.');return value;
}
export function entry(value) { return {key:key(value.key),folder:value.folder===true,displayName:value.displayName}; }
const methods=['connect','disconnect','accounts','buckets','list','stat','upload','download','mkdir','copy','move','rename','delete','remoteIngest','preview','publicUrls','createBucket','profiles','prepareBucket','transferHistory','archiveEntries','extractArchiveEntry'];
export function createFileApi(adapter) {
  let preferences={};
  const api={version:1,capabilities:Object.freeze(methods.filter(method=>typeof adapter[method]==='function')),
    getPreferences(){return {...preferences};},
    getDefaults(){return {...adapter.configuration?.defaults};},
    setPreferences(value={}){if(!adapter.configuration)throw Error('This adapter has no runtime preferences.');preferences=adapter.configuration.validate(value);return {...preferences};},
    async run(operation,input={},options={}) {
    const id=crypto.randomUUID();
    if(!methods.includes(operation)||typeof adapter[operation]!=='function')return {id,state:'failed',error:'This operation is not implemented.'};
    try {
      options=adapter.configuration?adapter.configuration.resolve(operation,preferences,options):options;
      const onProgress=options.onProgress;options={...options,onProgress:event=>{try{onProgress?.(event);}catch{/* Presentation cannot change a provider outcome. */}}};
      options.signal?.throwIfAborted();options.onProgress({id,operation,phase:'started'});
      const data=await adapter[operation](input,options);
      const partial=Boolean(data?.errors?.length || data?.conflicts?.length || data?.partialMove);
      const state=data?.state || (partial?'partial':'completed');
      options.onProgress?.({id,operation,phase:state});return {id,state,data};
    } catch(error) {
      // Unknown writes must be reconciled, never automatically replayed.
      return {id,state:error.uncertain?'uncertain':error.name==='AbortError'?'cancelled':'failed',error:error.message || 'Operation failed.',code:error.code,recoveryKey:error.recoveryKey};
    }
  },async batch(operation,items,options={}) {
    const concurrency=options.batchConcurrency??preferences.batchConcurrency??adapter.configuration?.defaults.batchConcurrency??1;
    if(!Number.isSafeInteger(concurrency)||concurrency<1)throw Error('batchConcurrency must be a positive safe integer.');
    const results=[];let next=0,halted=false;
    const {batchConcurrency:_,...itemOptions}=options;
    async function worker(){
      while(next<items.length&&!halted&&!options.signal?.aborted){
        const index=next++;
        try{options.onProgress?.({operation,phase:'item',index,total:items.length});}catch{/* Presentation only. */}
        const result=await api.run(operation,items[index],itemOptions);results[index]=result;
        if(result.state==='uncertain')halted=true;
      }
    }
    await Promise.all(Array.from({length:Math.min(concurrency,items.length)},()=>worker()));
    return {state:results.length<items.length?'partial':results.some(r=>!['completed','started'].includes(r.state))?'partial':'completed',results,total:items.length,processed:results.length};
  }};
  return Object.freeze(api);
}
