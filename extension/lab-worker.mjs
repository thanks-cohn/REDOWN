// Trusted extension transport. Saved profile secrets never cross native messaging.
import { fail } from './file-engine/engine.mjs';
export function laboratoryCreate({getProfiles, fetcher, request}) {
  return async (identity, bytes, {isActive = async () => true} = {}) => {
    const check = async () => { if (!await isActive()) throw fail("AUTHORIZATION_DENIED"); };
    await check();
    const profiles = await getProfiles();
    const profile = profiles.find(p => p.type === 'cloudflare-r2' && p.accountId === identity.account && p.bucketName === identity.container);
    if (!profile?.token || !profile.workerUrl) throw fail('LAB_WORKER_NOT_CONFIGURED');
    let url;
    try { url = new URL(profile.workerUrl); } catch { throw fail('LAB_WORKER_NOT_CONFIGURED'); }
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.pathname !== '/' || url.username || url.password || url.search || url.hash) throw fail('INVALID_ENDPOINT');
    if (!profile.scriptName || typeof request !== 'function') throw fail('LAB_WORKER_IDENTITY_REQUIRED');
    // Fresh OAuth settings prove which bucket STORAGE actually names. Never prepare/deploy.
    try {
      const settingsResponse=await request(`/accounts/${encodeURIComponent(identity.account)}/workers/scripts/${encodeURIComponent(profile.scriptName)}/settings`);
      const subdomainResponse=await request(`/accounts/${encodeURIComponent(identity.account)}/workers/subdomain`);
      if(!settingsResponse.ok || !subdomainResponse.ok)throw fail('LAB_WORKER_SETTINGS_DENIED');
      const settings=await settingsResponse.json(), subdomain=await subdomainResponse.json();
      const bindings=(settings.result || settings).bindings || [];
      const storage=bindings.find(b=>b.name==='STORAGE'&&b.type==='r2_bucket');
      if(storage?.bucket_name!==identity.container || storage.jurisdiction && storage.jurisdiction!=='default' || url.hostname!==`${profile.scriptName}.${(subdomain.result||subdomain).subdomain}.workers.dev`)throw fail('LAB_WORKER_BINDING_MISMATCH');
    } catch(error) { throw fail(error.code || 'LAB_WORKER_SETTINGS_UNAVAILABLE'); }
    await check();
    const headers = {authorization:'Bearer '+profile.token, 'content-type':'application/json'};
    let response;
    try {
      response = await fetcher(url.href,{method:'POST',headers,body:JSON.stringify({action:'capabilities'}),redirect:'error'});
      const info = await response.json();
      if (!response.ok || info.ok !== true || info.labConditionalCreate !== true || info.labMaxBytes !== 65536 || info.storageBound !== true) throw fail('LAB_WORKER_UPDATE_REQUIRED');
    } catch (error) { throw fail(error.code || 'LAB_WORKER_UNAVAILABLE'); }
    await check();
    try {
      response = await fetcher(url.href,{method:'POST',redirect:'error',headers:{authorization:headers.authorization,'content-type':'application/octet-stream','x-redown-action':'lab-create','x-redown-key':encodeURIComponent(identity.key)},body:bytes});
    } catch { throw fail('WRITE_UNCERTAIN'); }
    if (!response.ok) {
      await response.body?.cancel();
      throw fail(response.status===409?'CONFLICT':response.status===403?'PROVIDER_PERMISSION_DENIED':response.status===401?'SESSION_EXPIRED':'WRITE_UNCERTAIN');
    }
    try {
      const result = await response.json();
      if (result.ok !== true || result.key !== identity.key || result.size !== bytes.length || !result.etag) throw fail('WRITE_UNCERTAIN');
    } catch { throw fail('WRITE_UNCERTAIN'); }
  };
}
