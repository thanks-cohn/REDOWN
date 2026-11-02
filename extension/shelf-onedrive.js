(() => {
  'use strict';
  const el=id=>document.getElementById('shelf-onedrive'+id);
  const button=el(''),status=el('-status'),open=el('-open'),disconnect=el('-disconnect'),
    cancel=el('-cancel'),diagnostic=el('-diagnostic'),allowHost=el('-allow-upload-host');
  if(!button||!status)return;
  let state={},transfer={},busy=false,uiError='';
  const origins=['https://login.microsoftonline.com/*','https://graph.microsoft.com/*'];
  function pendingUploadOrigin(){
    if(transfer.code!=='ONEDRIVE_UPLOAD_HOST_PERMISSION')return '';
    try{
      const url=new URL(transfer.uploadOrigin);
      if(url.protocol==='https:'&&url.origin===transfer.uploadOrigin&&!url.username&&!url.password)
        return url.origin;
    }catch{}
    return '';
  }
  function paint(){
    const connected=state.phase==='connected'&&state.rootReady===true;
    const connecting=busy||state.phase==='connecting';
    button.disabled=connecting;
    button.textContent=connecting?'Connecting to OneDrive…':connected?'OneDrive connected':
      state.phase==='reconnect'?'Reconnect OneDrive':'Connect OneDrive';
    open.hidden=!connected;disconnect.hidden=!connected&&state.phase!=='reconnect';
    cancel.hidden=!['active','queued'].includes(transfer.status);
    const pending=pendingUploadOrigin();
    if(allowHost){
      allowHost.hidden=!pending;
      if(pending)allowHost.textContent='Allow upload host: '+new URL(pending).hostname;
    }
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
    if(state.phase==='connected'){void send('onedriveStatus').catch(()=>{});return;}
    busy=true;uiError='';paint();
    try{
      // Permission request is initiated directly from the Shelf user gesture.
      if(!chrome.permissions?.request||!await chrome.permissions.request({origins})){
        uiError='Chrome did not grant Microsoft sign-in and Graph access.';return;
      }
      const r=await send('onedriveConnect');
      if(!r?.ok)uiError=r?.error||'OneDrive login could not complete.';
    }catch{uiError='OneDrive sign-in could not finish. Reopen the Shelf and try again.';}
    finally{busy=false;paint();}
  });
  disconnect?.addEventListener('click',()=>void send('onedriveDisconnect').catch(()=>{}));
  cancel?.addEventListener('click',()=>void send('onedriveCancel').catch(()=>{}));
  allowHost?.addEventListener('click',async()=>{
    const origin=pendingUploadOrigin();
    if(!origin||allowHost.disabled)return;
    allowHost.disabled=true;uiError='';
    try{
      // Chrome host access must be requested directly from this user click.
      // Only the public HTTPS origin, never the temporary upload URL, is shown.
      if(!await chrome.permissions.request({origins:[origin+'/*']})){
        uiError='Chrome did not grant access to the upload host.';return;
      }
      const connected=(await chrome.storage.local.get('onedrive:state'))['onedrive:state'];
      if(connected?.phase!=='connected'||!connected.connectionId){
        uiError='Connect OneDrive before approving an upload destination.';return;
      }
      const prior=(await chrome.storage.local.get('onedrive:trustedUploadOrigins'))['onedrive:trustedUploadOrigins'];
      const list=prior?.connectionId===connected.connectionId&&Array.isArray(prior.origins)?
        prior.origins.filter(x=>typeof x==='string'&&x.startsWith('https://')):[];
      const origins=[...new Set([...list,origin])].slice(-32);
      const {uploadOrigin,...rest}=transfer;
      await chrome.storage.local.set({
        'onedrive:trustedUploadOrigins':{connectionId:connected.connectionId,origins},
        'onedrive:transfer':{...rest,status:'blocked',code:'ONEDRIVE_UPLOAD_HOST_READY',
          error:'Upload host approved. Right-click the file again to save it.'}
      });
      uiError='';
    }catch{uiError='Unable to request the upload-host permission. Try again from the Shelf.';}
    finally{allowHost.disabled=false;paint();}
  });
  diagnostic?.addEventListener('click',async()=>{
    diagnostic.disabled=true;uiError='Requesting permission for Microsoft test…';paint();
    try{
      if(!chrome.permissions?.request||!await chrome.permissions.request({origins})){
        uiError='Microsoft endpoint permission was not granted.';return;
      }
      uiError='Complete Microsoft sign-in in Chrome…';paint();
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
    if(changes['onedrive:transfer'])transfer=changes['onedrive:transfer'].newValue||{};
    paint();
  });
  // Shelf only checks an existing session; no interactive login on display.
  void send('onedriveStatus').catch(()=>{});
})();