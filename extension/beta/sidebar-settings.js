/* Explorer shortcut to the existing Shelf Settings view. No duplicate
   dashboard preference controls; the Shelf remains the single settings UI. */
(() => {
  const button=document.getElementById('open-shelf-settings');
  const feedback=document.getElementById('status');
  if(!button)return;
  button.addEventListener('click',()=>{
    // Open the side panel synchronously from the real user gesture.
    if(!chrome.sidePanel?.open||!chrome.storage.session?.set){
      if(feedback)feedback.textContent='Shelf Settings is unavailable. Reload REDOWN and try again.';
      return;
    }
    let opening;
    try{opening=chrome.sidePanel.open({windowId:chrome.windows.WINDOW_ID_CURRENT});}
    catch(error){if(feedback)feedback.textContent='Could not open Shelf Settings: '+(error?.message||'Unknown error');return;}
    const intent=chrome.windows.getCurrent().then(win=>{
      if(!Number.isInteger(win?.id))throw Error('Browser window unavailable');
      return chrome.storage.session.set({shelfOpenIntent:{
        view:'settings',windowId:win.id,issuedAt:Date.now(),token:crypto.randomUUID()
      }});
    });
    void Promise.allSettled([opening,intent]).then(results=>{
      if(results.some(result=>result.status==='rejected')){
        void chrome.storage.session.remove('shelfOpenIntent').catch(()=>{});
        if(feedback)feedback.textContent='Could not open Shelf Settings. Please try again.';
      }
    });
  });
})();
