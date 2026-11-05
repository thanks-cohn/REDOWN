// Immutable, owner-authorized bundled samples. No cloud identity or transfer receipts.
export const demoSource=Object.freeze({accountId:'redown-local-demo',bucketName:'Local Samples',accountName:'REDOWN Demo',prefix:''});
export const demoAssets=Object.freeze([
 {key:'01-REDOWN.svg',displayName:'REDOWN.svg',path:'icon.svg',type:'image/svg+xml'},
 {key:'02-Chutey.png',displayName:'Chutey.png',path:'assets/demo/chutey.png',type:'image/png'}
]);
export function withLocalDemo(remote,{fetchAsset=(path,options)=>fetch(new URL(path,import.meta.url),options),download=options=>chrome.downloads.download(options)}={}){
 let entries;
 async function bytes(asset,signal){const response=await fetchAsset(asset.path,{signal});if(!response.ok)throw Error('Bundled sample unavailable.');return new Blob([await response.arrayBuffer()],{type:asset.type});}
 async function listing(signal){if(!entries)entries=await Promise.all(demoAssets.map(async a=>({...a,folder:false,size:(await bytes(a,signal)).size,httpMetadata:{contentType:a.type},etag:'bundled-v1'})));return entries;}
 return {...remote,capabilities:[...new Set([...(remote.capabilities||[]),'stat','readStream'])],async run(operation,input={},options={}){
  if(input.source?.accountId!==demoSource.accountId)return remote.run(operation,input,options);
  const id=crypto.randomUUID();try{
   options.signal?.throwIfAborted();let data;
   if(operation==='list')data={entries:input.source.prefix?[]:await listing(options.signal),cursor:''};
   else {
    const asset=demoAssets.find(a=>a.key===(input.entry?.key||input.key));if(!asset)throw Error('Choose a bundled sample.');
    if(operation==='stat')data={object:(await listing(options.signal)).find(e=>e.key===asset.key)};
    else if(operation==='preview'){const blob=await bytes(asset,options.signal);if(blob.size>(options.previewMaxBytes??8*1048576))throw Error('Sample exceeds preview budget.');data={url:URL.createObjectURL(blob),type:asset.type,size:blob.size};}
    else if(operation==='readStream'){const blob=await bytes(asset,options.signal);await options.onChunk(new Uint8Array(await blob.arrayBuffer()));data={size:blob.size,status:200};}
    else if(operation==='download'){const url=URL.createObjectURL(await bytes(asset,options.signal));try{await download({url,filename:asset.displayName,saveAs:true});data={downloadState:'started'};}finally{setTimeout(()=>URL.revokeObjectURL(url),60000);}}
    else throw Error('Built-in samples are read-only. Connect Cloudflare for cloud operations.');
   }
   options.signal?.throwIfAborted();return {id,state:'completed',data};
  }catch(error){return {id,state:error.name==='AbortError'?'cancelled':'failed',error:error.message};}
 }};
}

// Reuse provider-owned noninteractive account checks; stored labels alone never
// suppress samples. These clients read identity/root metadata, never upload art.
export async function verifiedOtherProvider(storage,clients=globalThis){
 let saved;try{saved=await storage.get(['googleDriveState','dropbox:auth','onedrive:auth']);}catch{return null;}
 const checks=[];
 if(saved.googleDriveState?.phase==='connected'&&clients.RedownGoogleDriveStream)checks.push(async()=>{await clients.RedownGoogleDriveStream.create().connect(false);return 'Google Drive';});
 if(saved['dropbox:auth']&&clients.RedownDropboxAuth)checks.push(async()=>{const state=await clients.RedownDropboxAuth.create().ready(null,true);return state.phase==='connected'&&state.rootReady?'Dropbox':null;});
 if(saved['onedrive:auth']&&clients.RedownOneDriveAuth)checks.push(async()=>{const state=await clients.RedownOneDriveAuth.create().ready(null,true);return state.phase==='connected'&&state.rootReady?'OneDrive':null;});
 const results=await Promise.allSettled(checks.map(check=>check()));return results.find(r=>r.status==='fulfilled'&&r.value)?.value||null;
}
