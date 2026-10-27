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
const methods=['connect','disconnect','accounts','buckets','list','stat','upload','download','mkdir','copy','move','rename','delete','remoteIngest'];
export function createFileApi(adapter) {
  const api={version:1,capabilities:Object.freeze([...methods]),async run(operation,input={},options={}) {
    const id=crypto.randomUUID();
    if(!methods.includes(operation))return {id,state:'failed',error:'This operation is not implemented.'};
    try {
      options.signal?.throwIfAborted();options.onProgress?.({id,operation,phase:'started'});
      const data=await adapter[operation](input,options);
      const partial=Boolean(data?.errors?.length || data?.conflicts?.length || data?.partialMove);
      const state=data?.state || (partial?'partial':'completed');
      options.onProgress?.({id,operation,phase:state});return {id,state,data};
    } catch(error) {
      // Unknown writes must be reconciled, never automatically replayed.
      return {id,state:error.uncertain?'uncertain':error.name==='AbortError'?'cancelled':'failed',error:error.message || 'Operation failed.',code:error.code,recoveryKey:error.recoveryKey};
    }
  },async batch(operation,items,options={}) {
    const results=[];
    for(let index=0;index<items.length;index++) {
      if(options.signal?.aborted)break;
      options.onProgress?.({operation,phase:'item',index,total:items.length});
      const result=await api.run(operation,items[index],options);results.push(result);
      if(result.state==='uncertain')break;
    }
    return {state:results.length<items.length?'partial':results.some(r=>!['completed','started'].includes(r.state))?'partial':'completed',results,total:items.length,processed:results.length};
  }};
  return Object.freeze(api);
}
