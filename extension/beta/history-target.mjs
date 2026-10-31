/* Reuse the existing paged exact-key stat operation; no filename inference. */
export async function resolveHistoryTarget(api,locator,{signal}={}){
  if(locator?.provider!=='cloudflare-r2')throw Error('This saved provider is not supported by Explorer.');
  const source={accountId:locator.accountId,bucketName:locator.bucketName,prefix:locator.prefix};
  const result=await api.run('stat',{source,key:locator.key},{signal});
  signal?.throwIfAborted();
  if(result.state!=='completed')throw Error(result.error||'The saved object could not be checked. Refresh or reconnect Cloudflare.');
  const object=result.data?.object;
  if(!object)throw Error('The saved file is no longer at its recorded location. It may have been moved, renamed, or deleted. Refresh the folder or reconnect Cloudflare.');
  if(object.key!==locator.key)throw Error('Cloudflare returned a different object. No file was selected.');
  return {...object,key:locator.key,displayName:locator.filename,folder:false};
}
