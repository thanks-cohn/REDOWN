(() => {
  'use strict';
  const el=id=>document.getElementById('shelf-dropbox'+id),button=el(''),label=el('-label'),status=el('-status'),open=el('-open'),disconnect=el('-disconnect'),cancel=el('-cancel');
  if(!button)return;let state={},transfer={},busy=false,uiError='';
  function paint(){
    const checking=state.phase==='connected'&&(!Number.isFinite(state.checkedAt)||Date.now()-state.checkedAt>5*60*1000);
    const connected=state.phase==='connected'&&state.rootReady&&!checking,connecting=busy||state.phase==='connecting';
    button.disabled=connecting||checking;label.textContent=checking?'Checking Dropbox…':connecting?'Connecting to Dropbox…':connected?'Dropbox connected':state.phase==='reconnect'?'Reconnect Dropbox':'Connect Dropbox';
    open.hidden=!connected;disconnect.hidden=!connected&&!checking&&state.phase!=='reconnect';cancel.hidden=!['active','queued','awaiting-auth'].includes(transfer.status);
    status.textContent=checking?'Verifying your Dropbox connection…':uiError||transfer.error||state.error||(transfer.status==='active'?`Saving to Dropbox… ${Math.floor((transfer.bytes||0)/1024)} KiB`:transfer.status==='queued'?'Dropbox save queued.':transfer.status==='completed'?'Saved to Dropbox.':connected?'Ready to save to your Dropbox root. You can close the Shelf.':'Save supported web files to Dropbox without a permanent local download.');
  }
  async function send(type){return chrome.runtime.sendMessage({type});}
  button.addEventListener('click',async()=>{if(busy)return;if(state.phase==='connected'){void send('dropboxStatus');return;}busy=true;uiError='';paint();try{const r=await send('dropboxConnect');if(!r?.ok)uiError=r?.error||'Dropbox connection needs attention.';}catch{uiError='Dropbox could not connect. Try again.';}finally{busy=false;paint();}});
  disconnect.addEventListener('click',()=>void send('dropboxDisconnect'));
  cancel.addEventListener('click',()=>void send('dropboxCancel'));
  chrome.storage.local.get(['dropbox:state','dropbox:transfer']).then(s=>{state=s['dropbox:state']||{};transfer=s['dropbox:transfer']||{};paint();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes['dropbox:state'])state=changes['dropbox:state'].newValue||{};if(changes['dropbox:transfer'])transfer=changes['dropbox:transfer'].newValue||{};paint();});
  void send('dropboxStatus').catch(()=>{});
})();
