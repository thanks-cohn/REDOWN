/* Authenticated Cloudflare requests shared by settings and the service worker. */
(() => {
  const API = "https://api.cloudflare.com/client/v4";
  async function boundedFetch(url, options = {}) {
    const {timeoutMs = 30000, ...fetchOptions} = options;
    return fetch(url, {...fetchOptions, signal: AbortSignal.any([
      ...(fetchOptions.signal ? [fetchOptions.signal] : []), AbortSignal.timeout(timeoutMs)
    ])});
  }
  async function auth(rejectedToken, expectedSession) {
    return navigator.locks.request("redown-cloudflare-token", async () => {
      let {cloudflareAuth: current} = await chrome.storage.local.get("cloudflareAuth");
      if (expectedSession !== undefined && current?.sessionId !== expectedSession) throw new Error("Cloudflare connection changed. Refresh this view before trying again.");
      if (!current?.accessToken) throw new Error("Connect Cloudflare first.");
      if(current.reconnectRequired)throw new Error("Cloudflare authorization needs renewal. Click Reconnect Cloudflare; disconnecting is not required.");
      if (current.accessToken !== rejectedToken && (!current.expiresAt || Date.now() < current.expiresAt - 60000)) return current;
      if (!current.refreshToken){
        await chrome.storage.local.set({cloudflareAuth:{...current,reconnectRequired:true}});
        throw new Error("Cloudflare session expired without a refresh token. Click Reconnect Cloudflare; disconnecting is not required.");
      }
      const response = await boundedFetch("https://dash.cloudflare.com/oauth2/token", {
        method:"POST", headers:{"content-type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams({grant_type:"refresh_token",client_id:"d9db0f71eb24cd2eed86b50a650a045e",refresh_token:current.refreshToken})
      });
      const body = await response.json().catch(()=>({}));
      if (!response.ok || !body.access_token){
        if(body.error==='invalid_grant'){
          await chrome.storage.local.set({cloudflareAuth:{...current,reconnectRequired:true}});
          throw new Error("Cloudflare authorization needs renewal. Click Reconnect Cloudflare; disconnecting is not required.");
        }
        throw new Error("Cloudflare access could not be renewed right now. Retry; your saved connection has been retained.");
      }
      current = {...current,reconnectRequired:false,accessToken:body.access_token,refreshToken:body.refresh_token || current.refreshToken,
        expiresAt:body.expires_in ? Date.now()+Number(body.expires_in)*1000 : null};
      await chrome.storage.local.set({cloudflareAuth:current});
      return current;
    });
  }
  async function authenticationRejected(response){
    if(response.status===401)return true;
    if(response.status!==403)return false;
    if(/invalid_token/i.test(response.headers.get("www-authenticate")||""))return true;
    const body=await response.clone().json().catch(()=>({}));
    return (body.errors||[]).some(error=>/authentication error|invalid (?:access )?token|(?:access )?token (?:has )?expired/i.test(error.message||""));
  }
  async function request(path, options = {}) {
    let token = await auth();
    const sessionId=token.sessionId;
    const started=globalThis.performance?.now?.()||0;
    const traceId=globalThis.crypto?.randomUUID?.();
    const read=["GET","HEAD"].includes(String(options.method||"GET").toUpperCase());
    const unchanged=async()=>{
      const {cloudflareAuth:current}=await chrome.storage.local.get("cloudflareAuth");
      if(!current?.accessToken || current.sessionId!==sessionId)throw new Error("Cloudflare connection changed. Refresh this view before trying again.");
    };
    const run = async current => {
      await unchanged();
      const headers = new Headers(options.headers || {});
      headers.set("authorization", `Bearer ${current.accessToken}`);
      if (options.body && !(options.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type","application/json");
      return boundedFetch(API+path,{...options,headers});
    };
    try {
      let response = await run(token);
      if (await authenticationRejected(response) && token.refreshToken) {
        await response.body?.cancel();
        await unchanged();
        token = await auth(token.accessToken,sessionId);
        response = await run(token);
      }
      // One retry for safe reads only. Long Retry-After values are returned to
      // the caller unchanged rather than keeping an MV3 message alive.
      if(read && [429,502,503,504].includes(response.status)){
        const header=response.headers.get("retry-after");
        const delay=header===null?250+Math.floor(Math.random()*250):/^\d+(?:\.\d+)?$/.test(header)?Number(header)*1000:Date.parse(header)-Date.now();
        if(Number.isFinite(delay)&&delay>=0&&delay<=2000){
          await response.body?.cancel();
          await new Promise((resolve,reject)=>{
            if(options.signal?.aborted)return reject(options.signal.reason);
            const onAbort=()=>{clearTimeout(timer);reject(options.signal.reason);};
            const timer=setTimeout(()=>{options.signal?.removeEventListener("abort",onAbort);resolve();},delay);
            options.signal?.addEventListener("abort",onAbort,{once:true});
          });
          await unchanged();
          token=await auth();
          response=await run(token);
        }
      }
      await unchanged();
      try {globalThis.redownRuntimeObserver?.record({requestId:traceId,operation:read?"api.read":"api.write",outcome:response.ok?"success":"failed",code:response.ok?"OK":response.status>=500?"HTTP_5XX":`HTTP_${response.status}`,status:response.status,durationMs:(globalThis.performance?.now?.()||0)-started});} catch {}
      try{globalThis.redownExplorerBridge?.event(options.explorerTrace?.operationId,"api.response",response.ok?"confirmed":"failed",{status:response.status,mechanism:"api",method:String(options.method||"GET").toUpperCase(),endpoint:path.includes("/objects/")?"api.object":"api.list"});}catch{}
      return response;
    } catch(error){
      try {globalThis.redownRuntimeObserver?.record({requestId:traceId,operation:read?"api.read":"api.write",outcome:"failed",code:error?.name==="TimeoutError"?"TIMEOUT":error?.name==="AbortError"?"CANCELLED":"NETWORK",durationMs:(globalThis.performance?.now?.()||0)-started});} catch {}
      throw error;
    }
  }

  function objectPath({accountId,bucketName},key) {
    if (!accountId || !bucketName || !key) throw new Error("Choose a bucket and file first.");
    return `/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/objects/${String(key).split("/").map(encodeURIComponent).join("/")}`;
  }
  // Cloudflare's management API can reject valid keys containing dot-like path
  // segments at its security layer, even when R2 public delivery succeeds.
  // Only fall back when the bucket explicitly enables its managed public domain.
  async function publicObjectUrl(source,key) {
    const path=`/accounts/${encodeURIComponent(source.accountId)}/r2/buckets/${encodeURIComponent(source.bucketName)}/domains/managed`;
    const response=await request(path);
    if(!response.ok)return null;
    const config=await response.json().catch(()=>({}));
    const result=config.result||{};
    if(!result.enabled||!/^pub-[a-f0-9]+\\.r2\\.dev$/i.test(result.domain||''))return null;
    const suffix=String(key).split('/').map(encodeURIComponent).join('/');
    return `https://${result.domain}/${suffix}`;
  }
  async function readableResponse(source,key,signal) {
    const response=await request(objectPath(source,key),{signal,explorerTrace:source.explorerTrace});
    if(response.status!==403)return response;
    const fallback=await publicObjectUrl(source,key).catch(()=>null);
    if(!fallback)return response;
    const result=await boundedFetch(fallback,{signal,credentials:'omit'}).catch(()=>null);
    if(!result?.ok)return response;
    await response.body?.cancel();
    return result;
  }
  async function preview(source,key,type,signal) {
    const response = await readableResponse(source,key,signal);
    if (!response.ok){const error=new Error(`Cloudflare could not read this file (${response.status}).`);error.status=response.status;throw error;}
    const limit = 64*1024*1024;
    if (Number(response.headers.get("content-length")) > limit) { await response.body?.cancel(); throw new Error("This file is too large for an inline preview. Use Download."); }
    const reader = response.body.getReader();
    const chunks=[]; let size=0;
    try {
      while (true) {
        const {done,value}=await reader.read(); if(done) break;
        size+=value.byteLength;
        if(size>limit) throw new Error("This file is too large for an inline preview. Use Download.");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return URL.createObjectURL(new Blob(chunks,{type}));
  }
  async function download(source,key,filename,onState) {
    const current = await auth();
    // Probe only problematic dot-segment keys; preserve the existing direct
    // authenticated Chrome download path for normal keys and private buckets.
    let fallback=null;
    if(String(key).split('/').some(segment=>segment.includes('...'))){
      const probe=await request(objectPath(source,key),{method:'GET',headers:{Range:'bytes=0-0'},timeoutMs:12000});
      if(probe.status===403)fallback=await publicObjectUrl(source,key).catch(()=>null);
      await probe.body?.cancel();
    }
    const id=await chrome.downloads.download({url:fallback||API+objectPath(source,key),
      headers:fallback?[]:[{name:"Authorization",value:`Bearer ${current.accessToken}`}],
      filename:String(filename || key.split("/").pop()).replace(/[\\/:*?"<>|\x00-\x1f]/g,"_"),saveAs:true});
    if(!Number.isInteger(id))throw new Error("Chrome did not start the download. Check Chrome Downloads and try again.");
    // Starting a download is not completion. Report delayed browser failures,
    // which do not reject the downloads.download() promise.
    if(typeof onState==="function"&&chrome.downloads.onChanged){
      let timer,closed=false,interruption="";
      const cleanup=()=>{if(closed)return;closed=true;chrome.downloads.onChanged.removeListener(listener);clearTimeout(timer);};
      const listener=delta=>{
        if(delta.id!==id)return;
        if(delta.state?.current==="interrupted"||delta.error?.current){interruption=delta.error?.current||"interrupted";cleanup();try{onState({state:"interrupted",error:interruption});}catch{}}
        else if(delta.state?.current==="complete"){cleanup();try{onState({state:"complete"});}catch{}}
      };
      chrome.downloads.onChanged.addListener(listener);
      timer=setTimeout(cleanup,30*60*1000);
      // An immediate failure may precede registration of onChanged.
      try{
        const [item]=await chrome.downloads.search({id});
        if(item?.state==="interrupted"){
          cleanup();
          throw new Error(`Chrome could not start this download (${item.error||"interrupted"}). Open Chrome Downloads for details.`);
        }
        if(item?.state==="complete"){cleanup();onState({state:"complete"});}
        if(interruption)throw new Error(`Chrome interrupted this download (${interruption}). Check Chrome Downloads before retrying.`);
      }catch(error){cleanup();throw error;}
    }
    return id;
  }

  globalThis.RedownCloudflareApi={request,preview,download,boundedFetch};
})();
