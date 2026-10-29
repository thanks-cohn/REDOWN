(() => {
  const select=document.getElementById('toolbar-open-mode');
  const status=document.getElementById('toolbar-mode-status');
  if(!select)return;
  chrome.storage.local.get('toolbarOpenMode').then(({toolbarOpenMode})=>{
    select.value=toolbarOpenMode==='popup'?'popup':'shelf';
  }).catch(error=>{status.textContent='Unable to read toolbar preference: '+error.message;});
  select.addEventListener('change',async()=>{
    try{await chrome.storage.local.set({toolbarOpenMode:select.value});status.textContent='Saved. Your toolbar will use '+(select.value==='popup'?'the compact popup.':'the Shelf.');}
    catch(error){status.textContent='Unable to save preference: '+error.message;}
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.toolbarOpenMode)select.value=changes.toolbarOpenMode.newValue==='popup'?'popup':'shelf';
  });
})();
