/* Drive-only browser client. Tokens stay in this page's memory. */
export const SCOPE='https://www.googleapis.com/auth/drive.file';
export const MAX_BYTES=32*1024*1024,CHUNK=1024*1024;
const API='https://www.googleapis.com/drive/v3/';
export class DriveError extends Error {constructor(code,status='failed'){super(code);this.code=code;this.status=status;}}
export function sourceURL(value){
  let u;try{u=new URL(value);}catch{throw new DriveError('Choose a public HTTPS file link.','blocked');}
  if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||u.hostname==='localhost'||u.hostname.endsWith('.local')||u.hostname.includes(':')||/^\d+(?:\.\d+){3}$/.test(u.hostname))throw new DriveError('Only public HTTPS file links are supported.','blocked');
  u.hash='';return u;
}
export function folderValid(f){return f&&/^[\w-]+$/.test(f.id)&&f.name==='REDOWN'&&f.mimeType==='application/vnd.google-apps.folder'&&f.trashed===false&&f.appProperties?.redown==='drive-v1';}
export function makeDrive({chrome,fetch:request=globalThis.fetch,crypto=globalThis.crypto,locks=globalThis.navigator?.locks}){
  let token=null,account=null,folder=null,connection=Promise.resolve();
  const state=async(phase,extra={})=>chrome.storage.local.set({googleDriveState:{phase,...extra}});
  async function auth(interactive){
    const manifest=chrome.runtime.getManifest();
    if(chrome.runtime.id!=='mkadkgpekmkknfbniacdlmgikihjjepf')throw new DriveError('Install REDOWN under its configured Chrome extension ID.','blocked');
    if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(manifest.oauth2?.client_id||'')||manifest.oauth2.scopes?.length!==1||manifest.oauth2.scopes[0]!==SCOPE)throw new DriveError('Google OAuth configuration needs attention.','blocked');
    const result=await chrome.identity.getAuthToken({interactive,scopes:[SCOPE],enableGranularPermissions:true});
    token=typeof result==='string'?result:result?.token;
    if(!token||result.grantedScopes&&!result.grantedScopes.includes(SCOPE))throw new DriveError('Google Drive permission was not granted.','blocked');
  }
  async function http(url,options={}){
    const u=new URL(url,API);
    if(u.origin!=='https://www.googleapis.com')throw new DriveError('Untrusted Drive endpoint.','blocked');
    let r;try{r=await request(u.href,{...options,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',headers:{...options.headers,Authorization:'Bearer '+token},signal:options.signal||AbortSignal.timeout(30000)});}catch(e){if(options.signal?.aborted)throw e;throw new DriveError('Google Drive connection interrupted.','uncertain');}
    if(r.status===401){await chrome.identity.removeCachedAuthToken({token});token=null;await state('reconnect');throw new DriveError('Reconnect Google Drive.','blocked');}
    if(r.status===403||r.status===429)throw new DriveError('Google Drive denied access or reached its quota. Try again later.','blocked');
    return r;
  }
  async function json(path,options){const r=await http(path,options);if(!r.ok)throw new DriveError('Google Drive request failed (HTTP '+r.status+').',r.status>=500?'uncertain':'failed');return r.json();}
  async function lookup(id){const r=await http('files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,trashed,appProperties,parents');if(r.status===404)return null;if(!r.ok)throw new DriveError('Could not validate the REDOWN folder.','uncertain');return r.json();}
  async function connectInner(interactive=false){
    const run=connection.catch(()=>{}).then(async()=>{
      await state('connecting');
      try{
        await auth(interactive);
        const about=await json('about?fields=user(permissionId)');
        account=about.user?.permissionId;if(!/^[\w-]+$/.test(account||''))throw new DriveError('Google account could not be verified.');
        const {googleDriveAccounts={}}=await chrome.storage.local.get('googleDriveAccounts');
        let saved=googleDriveAccounts[account],f=saved?.folderId?await lookup(saved.folderId):null;
        if(!folderValid(f)){
          // Restrict discovery to app-owned tagged folders visible to drive.file.
          const q="trashed = false and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and appProperties has { key='redown' and value='drive-v1' }";
          const found=await json('files?spaces=drive&q='+encodeURIComponent(q)+'&fields=files(id,name,mimeType,trashed,appProperties,parents)&pageSize=100');
          f=found.files?.filter(folderValid).sort((a,b)=>a.id.localeCompare(b.id))[0];
          if(!f){
            // Preallocated stable ID makes ambiguous create retries idempotent.
            let id=saved?.pendingId;
            if(!id){id=(await json('files/generateIds?count=1&space=drive&type=files')).ids?.[0];if(!/^[\w-]+$/.test(id||''))throw new DriveError('Google did not allocate a folder ID.');googleDriveAccounts[account]={pendingId:id};await chrome.storage.local.set({googleDriveAccounts});}
            f=await lookup(id);
            if(!f){const r=await http('files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name:'REDOWN',mimeType:'application/vnd.google-apps.folder',parents:['root'],appProperties:{redown:'drive-v1'}})});if(!r.ok&&r.status!==409)throw new DriveError('Folder creation needs reconciliation. Reconnect to check it.','uncertain');f=await lookup(id);}
          }
        }
        if(!folderValid(f))throw new DriveError('The REDOWN folder could not be verified.','blocked');
        folder=f.id;googleDriveAccounts[account]={folderId:folder};await chrome.storage.local.set({googleDriveAccounts});await state('connected',{folderId:folder});return {folderId:folder};
      }catch(e){await state('reconnect');throw e;}
    });connection=run;return run;
  }
  async function connect(interactive=false){return locks?locks.request('redown-google-drive-connection',()=>connectInner(interactive)):connectInner(interactive);}
  async function disconnect(){if(token)await chrome.identity.removeCachedAuthToken({token});token=null;account=null;folder=null;await state('disconnected');}
  async function bytes(url,signal,onProgress){
    let r;try{r=await request(url,{signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});}catch(e){if(signal.aborted)throw e;throw new DriveError('Source unavailable. Redirects and authenticated sources are not supported.','blocked');}
    if(!r.ok||!r.body||r.type==='opaque')throw new DriveError('The source did not provide an accessible file.','blocked');
    if(Number(r.headers.get('content-length'))>MAX_BYTES)throw new DriveError('This file exceeds the 32 MiB limit.','blocked');
    const reader=r.body.getReader(),buffer=new Uint8Array(MAX_BYTES);let count=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;if(count+value.length>MAX_BYTES)throw new DriveError('This file exceeds the 32 MiB limit.','blocked');buffer.set(value,count);count+=value.length;onProgress('Receiving file',count);}}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    if(!count)throw new DriveError('The source file is empty.','blocked');
    const mime=(r.headers.get('content-type')||'application/octet-stream').split(';')[0];
    if(/text\/html|application\/xhtml/i.test(mime))throw new DriveError('Choose a file link rather than a web page.','blocked');
    return {data:buffer.subarray(0,count),mime};
  }
  async function upload(source,{signal,onProgress=()=>{}}){
    if(!token||!folder)throw new DriveError('Connect Google Drive first.','blocked');
    const url=sourceURL(source),origin=url.origin+'/*';
    if(!await chrome.permissions.contains({origins:[origin]}))throw new DriveError('Allow access to this source before saving.','blocked');
    const {data,mime}=await bytes(url.href,signal,onProgress);
    let name;try{name=decodeURIComponent(url.pathname.split('/').pop());}catch{}name=(name||'Web file').replace(/[\x00-\x1f/\\]/g,'_').slice(0,200);
    const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
    const uploadId=crypto.randomUUID();let dispatched=false;
    try{
      const start=await http('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{method:'POST',signal,headers:{'Content-Type':'application/json','X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(data.length)},body:JSON.stringify({name,mimeType:mime,parents:[folder],appProperties:{redownTransfer:uploadId}})});
      if(!start.ok)throw new DriveError('Google could not start the upload.',start.status>=500?'uncertain':'failed');
      const session=start.headers.get('location');
      const target=new URL(session||'https://invalid.invalid');if(target.origin!=='https://www.googleapis.com'||!target.pathname.startsWith('/upload/drive/'))throw new DriveError('Google returned an invalid upload session.');
      let offset=0,fileId=null,probes=0;
      while(offset<data.length){
        signal.throwIfAborted();const end=Math.min(offset+CHUNK,data.length);dispatched=true;
        let r;
        try{r=await http(session,{method:'PUT',signal,headers:{'Content-Type':mime,'Content-Range':`bytes ${offset}-${end-1}/${data.length}`},body:data.subarray(offset,end)});}
        catch(e){if(e.status!=='uncertain'||++probes>3)throw e;r=await http(session,{method:'PUT',signal,headers:{'Content-Range':'bytes */'+data.length},body:new Uint8Array()});}
        if(r.status===308){const range=r.headers.get('range');const next=range?Number(/^bytes=0-(\d+)$/.exec(range)?.[1])+1:0;if(!Number.isSafeInteger(next)||next<offset||next>end||next===offset&&++probes>3)throw new DriveError('Upload progress could not be confirmed.','uncertain');offset=next;onProgress('Uploading to Google Drive',offset);continue;}
        if(!r.ok)throw new DriveError('Upload interrupted (HTTP '+r.status+').',r.status>=500?'uncertain':'failed');
        fileId=(await r.json()).id;if(!/^[\w-]+$/.test(fileId||''))throw new DriveError('Google did not return a file receipt.','uncertain');break;
      }
      if(!fileId)throw new DriveError('Upload completion needs checking in Google Drive.','uncertain');
      const f=await json('files/'+encodeURIComponent(fileId)+'?fields=id,name,parents,size,sha256Checksum,trashed,appProperties',{signal});
      if(f.id!==fileId||f.name!==name||!f.parents?.includes(folder)||f.trashed!==false||Number(f.size)!==data.length||f.appProperties?.redownTransfer!==uploadId||f.sha256Checksum&&f.sha256Checksum!==checksum)throw new DriveError('The saved file could not be verified.','uncertain');
      return {status:'completed',fileId,folderId:folder,name,bytes:data.length,sha256:checksum,checksumVerified:Boolean(f.sha256Checksum)};
    }catch(e){if(signal.aborted)throw new DriveError(dispatched?'Cancelled. A partial or completed file may remain in Google Drive.':'Cancelled.','cancelled');if(dispatched&&e.status==='failed')e.status='uncertain';throw e;}
  }
  return {connect,disconnect,upload};
}
