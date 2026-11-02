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

  const diagnostic=document.getElementById('shelf-onedrive-diagnostic');
  diagnostic?.addEventListener('click',async()=>{
    diagnostic.disabled=true;
    status.textContent='Requesting permission to contact Microsoft for this test…';
    try{
      // The manifest already declares an optional HTTPS host pattern. Ask only for
      // the Microsoft endpoints, synchronously from the user's explicit click.
      const origins=['https://login.microsoftonline.com/*','https://graph.microsoft.com/*'];
      if(!chrome.permissions?.request||!await chrome.permissions.request({origins})){
        status.textContent='Microsoft endpoint permission was not granted. No sign-in test was run.';
        return;
      }
      status.textContent='Complete Microsoft sign-in in the Chrome window…';
      const result=await chrome.runtime.sendMessage({type:'onedriveDiagnostic'});
      const label=result?.message||'OneDrive diagnostic did not return a result.';
      status.textContent=(result?.ok?'Verified: ':'Not verified: ')+label+
        (result?.aadsts?' ['+result.aadsts+']':'')+
        (result?.httpStatus?' (HTTP '+result.httpStatus+')':'')+
        (result?.code?' ['+result.code+']':'');
    }catch{
      status.textContent='OneDrive sign-in test could not finish. Open Chrome extension errors and retry.';
    }finally{diagnostic.disabled=false;}
  });
  // No login, credential read or provider call on Shelf display.
})();
