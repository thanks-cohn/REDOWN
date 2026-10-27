// Existing Beta Explorer, connected to the existing authenticated Cloudflare adapter.
globalThis.REDOWN_CLOUDFLARE_BOOTSTRAP=true;
const {installBetaExplorer}=await import('./beta-explorer.mjs');
import {extensionR2Adapter} from './file-engine/adapters/extension-r2.mjs';
import {laboratoryCreateStream} from './lab-worker.mjs';
const saved=await chrome.storage.local.get(['profiles','cloudflareAuth']);
const profiles=(saved.profiles||[]).filter(p=>p.type==='cloudflare-r2'&&p.accountId&&p.bucketName);
const sessionId=saved.cloudflareAuth?.sessionId;
const authorize=async()=>{const current=(await chrome.storage.local.get('cloudflareAuth')).cloudflareAuth;return !!current?.accessToken&&!current.reconnectRequired&&current.sessionId===sessionId;};
if(!profiles.length||!await authorize()){
 document.getElementById('gate').textContent='Connect Cloudflare and configure an R2 bucket in REDOWN Settings, then reopen the Beta Explorer.';
 document.getElementById('explorer').hidden=true;
}else{
 const roots=profiles.map(p=>({provider:'extension-r2',account:p.accountId,container:p.bucketName,key:''}));
 const deps={request:RedownCloudflareApi.request,getProfiles:async()=>(await chrome.storage.local.get('profiles')).profiles||[],fetcher:(...args)=>RedownCloudflareApi.boundedFetch(...args)};
 const createStream=laboratoryCreateStream(deps);
 const adapter=extensionR2Adapter({request:RedownCloudflareApi.request,roots,createObject:async(i,bytes)=>createStream(i,(async function*(){yield bytes;})(),{size:bytes.length,check:async()=>{if(!await authorize())throw Object.assign(Error(),{code:'AUTHORIZATION_DENIED'});}}),createStream});
 installBetaExplorer({document,chrome,providerBindings:roots.map((root,i)=>({root,adapter,label:profiles[i].bucketName})),authorize});
 document.querySelector('.notice p').textContent='Cloudflare R2 connected. Uploads and copies use the universal file API with independent SHA-256 readback. Existing destinations are preserved.';
}
