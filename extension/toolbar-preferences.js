(() => {
 const select=document.getElementById('toolbar-open-mode'),status=document.getElementById('toolbar-mode-status');
 if(!select)return;
 const load=()=>chrome.storage.local.get('toolbarOpenMode').then(data=>{select.value=data.toolbarOpenMode==='popup'?'popup':'shelf';});
 void load().catch(()=>{if(status)status.textContent='Opening preference unavailable.';});
 select.addEventListener('change',async()=>{
   try{await chrome.storage.local.set({toolbarOpenMode:select.value});if(status)status.textContent='Opening preference saved.';}
   catch{if(status)status.textContent='Could not save opening preference.';}
 });
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.toolbarOpenMode)void load().catch(()=>{});});
})();
