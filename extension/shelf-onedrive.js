(() => {
  'use strict';
  const el=id=>document.getElementById('shelf-onedrive'+id);
  const button=el(''),label=el('-label')||button,status=el('-status'),open=el('-open'),disconnect=el('-disconnect'),
    cancel=el('-cancel'),hint=el('-authorization');
  if(!button||!status)return;
  let state={},transfer={},busy=false,uiError='';
  function paint(){
    const view=RedownProviderConnection.project('onedrive',state,transfer),connected=view.accountKnown;
    if(hint&&hint.textContent!==view.hint)hint.textContent=view.hint;
    const connecting=busy||state.phase==='connecting';
    button.disabled=connecting&&view.primary!=='GO TO';
    button.setAttribute('aria-label',view.primary==='GO TO'?'Go to OneDrive':connecting?'Connecting to OneDrive':'Log in to OneDrive');button.closest('.destination-tile')?.setAttribute('data-connected',String(connected));
    label.textContent=view.primary;
    open.hidden=!connected;disconnect.hidden=!connected&&state.phase!=='reconnect';
    cancel.hidden=!['active','queued'].includes(transfer.status);
    const size=transfer.total&&transfer.bytes!=null?
      Math.floor(100*transfer.bytes/transfer.total)+'%':((transfer.bytes||0)/1024|0)+' KiB';
    status.textContent=uiError||transfer.error||state.error||
      (transfer.status==='active'?'Saving '+(transfer.name||'file')+' to OneDrive… '+size:
      transfer.status==='completed'?'Saved '+(transfer.name||'file')+' to your OneDrive root.':
      transfer.status==='uncertain'?'OneDrive save may have completed. Check the root before retrying.':
      connected?view.hint+'. Website session is unverified.':
      'Connect OneDrive to enable right-click root saves. No REDOWN folder will be created.');
  }
  const send=type=>chrome.runtime.sendMessage({type,...(/Status$/.test(type)?{passive:true}:{})});
  button.addEventListener('click',async()=>{
    const alreadyConnected=RedownProviderConnection.project('onedrive',state,transfer).primary==='GO TO';
    if(alreadyConnected){try{const url=state.driveType==='business'||state.driveType==='documentLibrary'?'https://www.office.com/launch/onedrive':'https://onedrive.live.com/';await chrome.tabs.create({url});}catch{uiError='Could not open OneDrive. Try again.';paint();}return;}
    if(busy)return;busy=true;uiError='';paint();
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
  chrome.storage.local.get(['onedrive:state','onedrive:transfer']).then(s=>{
    state=s['onedrive:state']||{};transfer=s['onedrive:transfer']||{};paint();
  }).catch(()=>{state={statusUnavailable:true};uiError='OneDrive state is unavailable; website session unverified.';paint();});
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