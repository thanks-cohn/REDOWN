/* Explicit offline download: do not message/wake a worker that may recover queued writes. */
(() => {
  let archive;
  async function collect(){
    if(globalThis.top&&globalThis.top!==globalThis.self)throw Error('Open REDOWN controls in their own window.');
    const queue=RedownTransferQueue.create({storage:chrome.storage.local,alarms:chrome.alarms,attempts:{snapshot:async()=>{
      const stored=await chrome.storage.local.get('redownSaveAttempts');
      return {attempts:Array.isArray(stored.redownSaveAttempts)?stored.redownSaveAttempts:[],persistence:Array.isArray(stored.redownSaveAttempts)?'stored-only':'unavailable'};
    }}});
    const snapshot=await queue.snapshot();let archiveCount=null,timer;
    try{snapshot.data.cloudflareLogin=(await Promise.race([chrome.storage.session.get('cloudflareLogin'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('session unavailable')),1000);})])).cloudflareLogin;}catch{}finally{clearTimeout(timer);}
    try{
      if(!globalThis.RedownHistoryArchive)throw Error('unavailable');
      const page=await Promise.race([(archive||(archive=RedownHistoryArchive.create())).page(0,1),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('archive unavailable')),1000);})]);archiveCount=page.total;
    }catch{}finally{clearTimeout(timer);}
    let storageCapacity={osFreeBytes:null};
    try{storageCapacity=await Promise.race([(async()=>{const [localBytes,estimate]=await Promise.all([chrome.storage.local.getBytesInUse?.(null),navigator.storage?.estimate?.()]);return {localBytes,quotaBytes:chrome.storage.local.QUOTA_BYTES,originUsage:estimate?.usage,originQuota:estimate?.quota,osFreeBytes:null};})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('capacity unavailable')),1000);})]);}catch{}finally{clearTimeout(timer);}
    const browserVersion=globalThis.navigator?.userAgent?.match(/(?:Chrome|Chromium)\/[\d.]+/)?.[0]||'unknown';
    return RedownDiagnosticBundle.build(snapshot,{extensionVersion:chrome.runtime.getManifest().version,browserVersion,archiveCount,storageCapacity,backgroundState:'not-contacted',scope:'Local stored metadata only: no background activation or provider probes; volatile/uncommitted observations and current writer readiness are unavailable'});
  }
  for(const button of document.querySelectorAll('[data-diagnostic-export]'))button.addEventListener('click',async()=>{
    const output=document.getElementById('diagnostic-bundle-status')||document.getElementById('runtime-diagnostics-output');
    button.disabled=true;
    try{
      const bundle=await collect(),bytes=RedownDiagnosticBundle.zip(bundle,fflate);
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
      const link=document.createElement('a');link.href=url;link.download=bundle.filename;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
      if(output)output.textContent=`Saved ${bundle.filename} (${Math.ceil(bytes.length/1024)} KiB). Review SUMMARY.md and missing evidence before sharing. No cloud requests were made.`;
    }catch(error){if(output)output.textContent=error.message||'Local diagnostic export unavailable.';}
    finally{button.disabled=false;}
  });
})();
