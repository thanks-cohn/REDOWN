(() => {
  'use strict';
  const button=document.getElementById('shelf-google-drive'),label=document.getElementById('shelf-google-label'),status=document.getElementById('shelf-google-status'),folder=document.getElementById('shelf-google-folder');
  if(!button)return;
  function paint(s={}){const connected=s.phase==='connected',busy=s.phase==='connecting';button.disabled=busy;label.textContent=busy?'Connecting to Google Drive…':connected?'Google Drive connected':s.phase==='reconnect'?'Reconnect Google Drive':'Log in to Google Drive';status.textContent=connected?'REDOWN folder ready. Browser-mediated saves; keep the transfer tab open.':'Save supported web files to Google Drive without saving a permanent copy to your computer.';folder.hidden=!connected||!/^[\w-]+$/.test(s.folderId||'');if(!folder.hidden)folder.href='https://drive.google.com/drive/folders/'+s.folderId;}
  button.addEventListener('click',async()=>{button.disabled=true;try{await chrome.runtime.sendMessage({type:'googleDriveOpen'});}catch{status.textContent='Could not open Google Drive connection. Try again.';}finally{button.disabled=false;}});
  chrome.storage.local.get('googleDriveState').then(s=>paint(s.googleDriveState));
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.googleDriveState)paint(changes.googleDriveState.newValue);});
})();
