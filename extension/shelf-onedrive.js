(() => {
  'use strict';
  const button=document.getElementById('shelf-onedrive'),status=document.getElementById('shelf-onedrive-status');
  if(!button||!status)return;
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      const result=await chrome.runtime.sendMessage({type:'onedriveConnect'});
      status.textContent=result?.error||'OneDrive is unavailable. Microsoft OAuth verification is pending.';
    }catch{status.textContent='OneDrive could not be checked. Reopen the Shelf to try again.';}
    finally{button.disabled=false;}
  });
  // No login, credential read or provider call on Shelf display.
})();
