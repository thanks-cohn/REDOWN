/* Quick Glance reads only recorded destinations, inside the trusted Shelf.
   No provenance goes to provider APIs; no signed URL or image is persisted. */
(() => {
  'use strict';
  const MAX_BYTES=4*1024*1024;
  const imageType=/^image\/(?:jpeg|png|webp|gif|avif|bmp|x-icon|vnd\.microsoft\.icon)$/i;
  function sourceURL(value){
    try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}
  }
  function eligible(record){
    const d=record.destination||{};
    let path='';try{path=new URL(record.sourceUrl).pathname;}catch{}
    return record.category==='2d'||/^image\//i.test(record.contentType||record.mimeType||'')||
      [record.filename,d.name,d.key,path].some(v=>/\.(?:jpe?g|png|gif|webp|avif|bmp|ico)$/i.test(v||''));
  }
  async function imageBlob(response,signal){
    const type=(response.headers.get('content-type')||'').split(';')[0].trim();
    if(!response.ok||!imageType.test(type)||Number(response.headers.get('content-length'))>MAX_BYTES){
      await response.body?.cancel();throw Error('Preview unavailable');
    }
    const reader=response.body?.getReader();if(!reader)throw Error('Preview unavailable');
    const chunks=[];let size=0;
    try{while(true){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>MAX_BYTES)throw Error('Preview too large');chunks.push(value);
    }}finally{await reader.cancel().catch(()=>{});}
    return new Blob(chunks,{type});
  }
  function readWithAbort(read,signal){
    signal.throwIfAborted();
    return new Promise((resolve,reject)=>{
      const abort=()=>reject(signal.reason);
      signal.addEventListener('abort',abort,{once:true});
      Promise.resolve().then(read).then(response=>{
        if(signal.aborted){void response?.body?.cancel().catch(()=>{});return;}
        resolve(response);
      },reject).finally(()=>signal.removeEventListener('abort',abort));
    });
  }
  function create({fetch=globalThis.fetch,chrome=globalThis.chrome,cloudflare=globalThis.RedownCloudflareApi,
    google=globalThis.RedownGoogleDriveStream?.create(),dropbox=globalThis.RedownDropboxAuth?.create(),
    onedrive=globalThis.RedownOneDriveAuth?.create()}={}){
    const request=(url,signal,options={})=>fetch(url,{...options,signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error'});
    async function cloud(record,signal){
      const d=record.destination||{},kind=String(record.providerKind||d.provider||record.provider||'').toLowerCase();
      if(record.ok!==true)throw Error('No saved destination');
      if(kind.includes('google')&&d.fileId&&d.accountId){
        const saved=(await chrome.storage.local.get('googleDriveState')).googleDriveState;
        if(saved?.phase!=='connected'||saved.accountId!==d.accountId)throw Error('Account unavailable');
        return google.preview(d,signal);
      }
      if(kind.includes('dropbox')&&d.fileId&&d.accountId&&d.connectionId&&d.namespace){
        const saved=(await chrome.storage.local.get('dropbox:auth'))['dropbox:auth'];
        if(!saved||['accountId','connectionId','namespace'].some(k=>saved[k]!==d[k]))throw Error('Account unavailable');
        const auth=await dropbox.ready(d);
        return request('https://content.dropboxapi.com/2/files/get_thumbnail_v2',signal,{method:'POST',headers:{
          Authorization:'Bearer '+auth.token,'Dropbox-API-Path-Root':JSON.stringify({'.tag':'root',root:auth.namespace}),
          'Dropbox-API-Arg':JSON.stringify({resource:{'.tag':'path',path:d.fileId},format:'jpeg',size:'w256h256',mode:'fitone'})}});
      }
      if(kind.includes('onedrive')&&d.itemId&&d.accountId&&d.driveId&&d.rootId){
        const saved=(await chrome.storage.local.get('onedrive:auth'))['onedrive:auth'];
        if(!saved||['accountId','driveId','rootId'].some(k=>saved[k]!==d[k]))throw Error('Account unavailable');
        const auth=await onedrive.ready({...d,connectionId:saved.connectionId});
        const response=await request('https://graph.microsoft.com/v1.0/drives/'+encodeURIComponent(d.driveId)+'/items/'+encodeURIComponent(d.itemId)+'/thumbnails/0/medium',signal,{headers:{Authorization:'Bearer '+auth.token}});
        if(!response.ok)throw Error('Thumbnail unavailable');
        const data=await response.json(),url=sourceURL(data.url);
        if(!url||!url.startsWith('https:'))throw Error('Thumbnail unavailable');
        return request(url,signal); // Temporary provider URL; never attach a token.
      }
      if(d.accountId&&d.bucketName&&typeof d.key==='string'&&d.key&&!d.key.split('/').some(v=>v==='.'||v==='..')&&(!kind||kind.includes('cloudflare'))){
        // Management object GET already supports private R2. No preparation,
        // Worker deployment, public-domain discovery or access setting mutation.
        const path='/accounts/'+encodeURIComponent(d.accountId)+'/r2/buckets/'+encodeURIComponent(d.bucketName)+'/objects/'+d.key.split('/').map(encodeURIComponent).join('/');
        return cloudflare.request(path,{signal,cache:'no-store',referrerPolicy:'no-referrer'});
      }
      throw Error('No authorized preview method');
    }
    async function resolve(record,signal,consume=async blob=>blob){
      // Decode failure is also a cloud failure, so it still reaches source fallback.
      const d=record.destination||{};
      const kind=String(record.providerKind||d.provider||record.provider||'').toLowerCase();
      const publicUrl=record.ok===true&&record.verified===true&&kind.includes('cloudflare')&&
        d.bucketName&&d.key&&sourceURL(d.publicUrl);
      const attempts=[['cloud',()=>cloud(record,signal)]];
      if(publicUrl&&publicUrl.startsWith('https:'))attempts.push(['cloud',()=>request(publicUrl,signal)]);
      attempts.push(['source',()=>{
        const url=sourceURL(record.sourceUrl);if(!url)throw Error('No image source');return request(url,signal);
      }]);
      for(const [origin,read] of attempts){
        try{
          signal.throwIfAborted();
          const image=await consume(await imageBlob(await readWithAbort(read,signal),signal));
          return {image,origin};
        }
        catch{signal.throwIfAborted();}
      }
      return null;
    }
    return {resolve};
  }
  // Share existing auth-client refresh lanes across disposable row sessions.
  let sharedSource;
  globalThis.RedownHistoryImageSource={create,shared:()=>sharedSource||(sharedSource=create()),eligible,sourceURL,imageBlob,MAX_BYTES};
})();
