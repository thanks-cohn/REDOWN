(() => {
  'use strict';
  const button=document.getElementById('shelf-google-drive'),label=document.getElementById('shelf-google-label'),status=document.getElementById('shelf-google-status'),folder=document.getElementById('shelf-google-folder');
  if(!button)return;let state={};
  function paint(s={}){state=s;const connected=s.phase==='connected',busy=s.phase==='connecting';button.disabled=busy;label.textContent=busy?'Connecting to Google Drive…':connected?'GO TO Google Drive':s.phase==='reconnect'?'Reconnect Google Drive':'Log in to Google Drive';status.textContent=connected?'REDOWN folder ready. Browser-mediated saves; keep the transfer tab open.':'Save supported web files to Google Drive without saving a permanent copy to your computer.';folder.hidden=!connected||!/^[\w-]+$/.test(s.folderId||'');if(!folder.hidden)folder.href='https://drive.google.com/drive/folders/'+s.folderId;}
  button.addEventListener('click',async()=>{button.disabled=true;try{if(state.phase==='connected')await chrome.tabs.create({url:'https://drive.google.com/drive/u/0/my-drive'});else await chrome.runtime.sendMessage({type:'googleDriveOpen'});}catch{status.textContent=state.phase==='connected'?'Could not open Google Drive. Try again.':'Could not open Google Drive connection. Try again.';}finally{button.disabled=false;}});
  chrome.storage.local.get('googleDriveState').then(s=>paint(s.googleDriveState));
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.googleDriveState)paint(changes.googleDriveState.newValue);});
})();
