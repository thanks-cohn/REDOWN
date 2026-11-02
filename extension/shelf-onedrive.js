(() => {
  'use strict';
  const el=id=>document.getElementById('shelf-onedrive'+id);
  const button=el(''),status=el('-status'),open=el('-open'),disconnect=el('-disconnect'),
    cancel=el('-cancel'),diagnostic=el('-diagnostic');
  if(!button||!status)return;
  let state={},transfer={},busy=false,uiError='';
  function paint(){
    const connected=state.phase==='connected'&&state.rootReady===true;
    const connecting=busy||state.phase==='connecting';
    button.disabled=connecting;
    button.textContent=connecting?'Connecting to OneDrive…':connected?'GO TO OneDrive':
      state.phase==='reconnect'?'Reconnect OneDrive':'Connect OneDrive';
    open.hidden=!connected;disconnect.hidden=!connected&&state.phase!=='reconnect';
    cancel.hidden=!['active','queued'].includes(transfer.status);
    const size=transfer.total&&transfer.bytes!=null?
      Math.floor(100*transfer.bytes/transfer.total)+'%':((transfer.bytes||0)/1024|0)+' KiB';
    status.textContent=uiError||transfer.error||state.error||
      (transfer.status==='active'?'Saving '+(transfer.name||'file')+' to OneDrive… '+size:
      transfer.status==='completed'?'Saved '+(transfer.name||'file')+' to your OneDrive root.':
      transfer.status==='uncertain'?'OneDrive save may have completed. Check the root before retrying.':
      connected?'Ready. Right-click a supported HTTP(S) file → REDOWN → OneDrive → Save to OneDrive root.':
      'Connect OneDrive to enable right-click root saves. No REDOWN folder will be created.');
  }
  const send=type=>chrome.runtime.sendMessage({type});
  button.addEventListener('click',async()=>{
    if(busy)return;
    const alreadyConnected=state.phase==='connected'&&state.rootReady===true;
    if(alreadyConnected){try{const url=state.driveType==='business'||state.driveType==='documentLibrary'?'https://www.office.com/launch/onedrive':'https://onedrive.live.com/';await chrome.tabs.create({url});}catch{uiError='Could not open OneDrive. Try again.';paint();}return;}
    busy=true;uiError='';paint();
    try{
      // Chrome host access is an extension-level install/update permission.
      // Microsoft sign-in is only needed when not already connected.
      const r=await send(alreadyConnected?'onedriveStatus':'onedriveConnect');
      if(!r?.ok)uiError=r?.error||'OneDrive setup could not complete.';
    }catch{uiError='OneDrive sign-in could not finish. Reopen the Shelf and try again.';}
    finally{busy=false;paint();}
  });
  disconnect?.addEventListener('click',()=>void send('onedriveDisconnect').catch(()=>{}));
  cancel?.addEventListener('click',()=>void send('onedriveCancel').catch(()=>{}));
  diagnostic?.addEventListener('click',async()=>{
    diagnostic.disabled=true;uiError='Requesting permission for Microsoft test…';paint();
    try{
      uiError='Checking the Microsoft sign-in connection…';paint();
      const r=await send('onedriveDiagnostic');
      uiError=(r?.ok?'Verified: ':'Not verified: ')+(r?.message||'OneDrive diagnostic did not return a result.')+
        (r?.aadsts?' ['+r.aadsts+']':'')+(r?.httpStatus?' (HTTP '+r.httpStatus+')':'')+
        (r?.code?' ['+r.code+']':'');
    }catch{uiError='OneDrive sign-in diagnostic could not finish.';}
    finally{diagnostic.disabled=false;paint();}
  });
  chrome.storage.local.get(['onedrive:state','onedrive:transfer']).then(s=>{
    state=s['onedrive:state']||{};transfer=s['onedrive:transfer']||{};paint();
  }).catch(()=>{uiError='OneDrive state is unavailable.';paint();});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes['onedrive:state']){state=changes['onedrive:state'].newValue||{};uiError='';}
    if(changes['onedrive:transfer']){
      transfer=changes['onedrive:transfer'].newValue||{};
      // Save events supersede an old diagnostic message.
      uiError='';
    }
    paint();
  });
  // Shelf only checks an existing session; no interactive login on display.
  void send('onedriveStatus').catch(()=>{});
})();