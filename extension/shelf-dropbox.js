(() => {
  'use strict';
  const el=id=>document.getElementById('shelf-dropbox'+id),button=el(''),label=el('-label'),status=el('-status'),open=el('-open'),disconnect=el('-disconnect'),cancel=el('-cancel');
  if(!button)return;let state={},transfer={},busy=false,uiError='';
  function paint(){
    const checking=state.phase==='connected'&&(!Number.isFinite(state.checkedAt)||Date.now()-state.checkedAt>5*60*1000);
    const connected=state.phase==='connected'&&state.rootReady&&!checking,connecting=busy||state.phase==='connecting';
    button.disabled=busy;button.setAttribute('aria-label',checking?'Checking Dropbox':connecting?'Connecting to Dropbox':connected?'Go to Dropbox':'Log in to Dropbox');button.closest('.destination-tile')?.setAttribute('data-connected',String(connected));label.textContent=busy?'···':connected?'GO TO':uiError||state.error?'RETRY':'LOGIN';
    button.title=uiError||state.error||'Connect Dropbox to save web files.';open.hidden=false;disconnect.hidden=!connected&&!checking&&state.phase!=='reconnect';cancel.hidden=!['active','queued','awaiting-auth'].includes(transfer.status);
    status.textContent=checking?'Verifying your Dropbox connection…':uiError||transfer.error||state.error||(transfer.status==='active'?`Saving to Dropbox… ${Math.floor((transfer.bytes||0)/1024)} KiB`:transfer.status==='queued'?'Dropbox save queued.':transfer.status==='completed'?(transfer.verified===true?'Saved to Dropbox.':'Dropbox save needs confirmation. Check Dropbox before retrying.'):connected?'Ready to save to your Dropbox root. You can close the Shelf.':'Save supported web files to Dropbox without a permanent local download.');
  }
  async function send(type){return chrome.runtime.sendMessage({type});}
  button.addEventListener('click',async()=>{if(busy)return;if(state.phase==='connected'&&state.rootReady&&Number.isFinite(state.checkedAt)&&Date.now()-state.checkedAt<5*60*1000){try{await chrome.tabs.create({url:'https://www.dropbox.com/home'});}catch{uiError='Could not open Dropbox. Try again.';paint();}return;}busy=true;uiError='';paint();try{const r=await send('dropboxConnect');if(!r?.ok)uiError=r?.error||'Dropbox login could not start. Check the connection and try again.';}catch(e){uiError='Dropbox sign-in could not start. Check the extension connection and try again.';}finally{busy=false;paint();}});
  disconnect.addEventListener('click',()=>void send('dropboxDisconnect'));
  cancel.addEventListener('click',()=>void send('dropboxCancel'));
  chrome.storage.local.get(['dropbox:state','dropbox:transfer']).then(s=>{state=s['dropbox:state']||{};transfer=s['dropbox:transfer']||{};paint();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes['dropbox:state'])state=changes['dropbox:state'].newValue||{};if(changes['dropbox:transfer'])transfer=changes['dropbox:transfer'].newValue||{};paint();});
  void send('dropboxStatus').catch(()=>{});
})();
