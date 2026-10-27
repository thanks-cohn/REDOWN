// Runtime preferences are deliberately limited to options with real consumers.
// Pagination and provider protocol restrictions are not preferences.
export const providerDefaults=Object.freeze({
  messageTimeoutMs:120000,requestTimeoutMs:30000,uploadTimeoutMs:300000,
  verificationTimeoutMs:300000,verificationIdleTimeoutMs:30000,
  progressIntervalMs:100,previewMaxBytes:64*1024*1024,textPreviewMaxBytes:512*1024,batchConcurrency:1
});
const message=['messageTimeoutMs'];
export const operationOptions=Object.freeze({
  archiveEntries:message,extractArchiveEntry:message,profiles:message,prepareBucket:message,transferHistory:message,connect:message,disconnect:message,accounts:message,buckets:message,createBucket:message,
  list:['requestTimeoutMs'],stat:['requestTimeoutMs'],mkdir:message,copy:message,move:message,rename:message,delete:message,
  remoteIngest:message,publicUrls:message,
  preview:['requestTimeoutMs','previewMaxBytes','textPreviewMaxBytes'],download:[],
  upload:['messageTimeoutMs','requestTimeoutMs','uploadTimeoutMs','verificationTimeoutMs','verificationIdleTimeoutMs','progressIntervalMs']
});
export function validatePreferences(value={}) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Preferences must be an object.');
  for(const [k,v] of Object.entries(value)) {
    if(!Object.hasOwn(providerDefaults,k))throw Error('Unsupported option: '+k);
    if(!Number.isSafeInteger(v)||v<(k==='progressIntervalMs'?0:1))throw Error(k+' must be a '+(k==='progressIntervalMs'?'nonnegative':'positive')+' safe integer.');
    if(k.endsWith('Ms')&&v>2147483647)throw Error(k+' exceeds the browser timer range.');
  }
  return {...value};
}
export function resolveOptions(operation,preferences,options={}) {
  const allowed=operationOptions[operation]||[];
  const overrides=Object.fromEntries(Object.entries(options).filter(([k])=>!['signal','onProgress'].includes(k)));
  validatePreferences(overrides);
  for(const k of Object.keys(overrides))if(!allowed.includes(k))throw Error(k+' is not supported for '+operation+'.');
  return {...Object.fromEntries(allowed.map(k=>[k,options[k]??preferences[k]??providerDefaults[k]])),signal:options.signal,onProgress:options.onProgress};
}
