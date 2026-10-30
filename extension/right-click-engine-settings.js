(() => {
  const select=document.getElementById('right-click-engine'),apply=document.getElementById('right-click-engine-apply'),status=document.getElementById('right-click-engine-status');
  if(!select||!apply)return;
  chrome.storage.local.get(['rightClickEngine','rightClickMenuStatus']).then(s=>{select.value=s.rightClickEngine==='v3'?'v3':'legacy';if(s.rightClickMenuStatus?.state==='failed')status.textContent=s.rightClickMenuStatus.error;}).catch(()=>{status.textContent='Could not read engine settings.';});
  apply.onclick=async()=>{select.disabled=apply.disabled=true;status.textContent='Reconciling Chrome menu…';try{const r=await chrome.runtime.sendMessage({type:'setRightClickEngine',engine:select.value});if(!r?.ok)throw Error(r?.error||'Engine switch not confirmed. Reload Settings.');status.textContent=r.menuUpdated?'Selected engine saved. Chrome acknowledged menu registration.':r.error;}catch(e){status.textContent=e.message;}finally{select.disabled=apply.disabled=false;}};
  chrome.storage.onChanged.addListener((c,area)=>{if(area==='local'&&c.rightClickEngine)select.value=c.rightClickEngine.newValue==='v3'?'v3':'legacy';});
})();
