/* Recovery controls deliberately do not depend on background messaging. */
(() => {
 if(new URLSearchParams(location.search).get('recovery')!=='1')return;
 document.getElementById('recovery').hidden=false;
 const status=document.getElementById('recovery-status');
 document.getElementById('retry-shelf').onclick=()=>{
   // windows.getCurrent would consume user activation; this window ID is cached below.
   try{Promise.resolve(chrome.sidePanel.open({windowId:ownerWindowId})).then(()=>{status.textContent='Shelf opening requested. Keep this window available until it opens.';}).catch(()=>{status.textContent='Shelf still cannot open. You can keep using this recovery window.';});}
   catch{status.textContent='Shelf is unavailable. You can keep using this recovery window.';}
 };
 let ownerWindowId;
 chrome.windows.getLastFocused({windowTypes:['normal']}).then(win=>{ownerWindowId=win.id;}).catch(()=>{});
 document.getElementById('support-report').onclick=async()=>{
   try{
     const data=await chrome.storage.local.get(['entryPointEvidence','rightClickMenuStatus']);
     // Explicit field allowlist: no configuration, destinations or provider data.
     const report={version:chrome.runtime.getManifest().version,events:data.entryPointEvidence||[],menuState:data.rightClickMenuStatus?.state||'unknown'};
     const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
     const link=document.createElement('a');link.href=url;link.download='redown-support.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
     status.textContent='Local support report exported.';
   }catch{status.textContent='Local evidence is unavailable. Chrome may be blocking extension storage.';}
 };
 // Settings remains usable even when the Shelf route is broken.
 document.getElementById('shelf-settings').addEventListener('click',event=>{
   event.stopImmediatePropagation();
   chrome.tabs.create({url:chrome.runtime.getURL('shelf.html#settings')}).catch(()=>{status.textContent='Chrome blocked Settings.';});
 });
})();
