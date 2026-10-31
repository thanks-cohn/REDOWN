/* Recovery controls deliberately do not depend on background messaging. */
(() => {
 void globalThis.RedownToolbarAppearance?.clean({allTabs:true});
 const recordRetryFailure=()=>{void chrome.storage.local.set({toolbarRecoveryStatus:{at:Date.now(),code:'SHELF_RETRY_REJECTED'}}).catch(()=>{});};
 if(new URLSearchParams(location.search).get('recovery')!=='1')return;
 document.getElementById('recovery').hidden=false;
 const status=document.getElementById('recovery-status');
 const parameters=new URLSearchParams(location.search);
 const tabId=Number(parameters.get('tabId')),ownerWindowId=Number(parameters.get('windowId'));
 // Chrome has already opened the attached popup. Consume its tab-only override;
 // the user's stored preference is untouched, and the next click tries Shelf.
 if(parameters.has('tabId')&&Number.isInteger(tabId)){
   chrome.storage.local.get('toolbarOpenMode').then(data=>chrome.action.setPopup({tabId,popup:data.toolbarOpenMode==='popup'?'popup.html':''})).then(()=>{
     void globalThis.RedownToolbarAppearance?.clean({tabId});
   }).catch(()=>{status.textContent='Chrome could not reset recovery. Reload REDOWN to retry the Shelf.';});
 }
 document.getElementById('retry-shelf').onclick=()=>{
   if(!chrome.sidePanel?.open||!parameters.has('windowId')){status.textContent='Shelf is unavailable. You can keep using this attached panel.';return;}
   // Close the attached panel synchronously before requesting another surface.
   window.close();
   try{void Promise.resolve(chrome.sidePanel.open({windowId:ownerWindowId})).catch(()=>{
     recordRetryFailure();
   });}catch{recordRetryFailure();}
 };
 document.getElementById('support-report').onclick=async()=>{
   try{
     const data=await chrome.storage.local.get(['entryPointEvidence','rightClickMenuStatus','toolbarRecoveryStatus']);
     // Explicit field allowlist: no configuration, destinations or provider data.
     const report={version:chrome.runtime.getManifest().version,recovery:data.toolbarRecoveryStatus?{at:data.toolbarRecoveryStatus.at,code:'SHELF_RETRY_REJECTED'}:null,events:data.entryPointEvidence||[],menuState:data.rightClickMenuStatus?.state||'unknown'};
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
