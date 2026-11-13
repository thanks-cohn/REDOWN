(() => {
  'use strict';
  const el=id=>document.getElementById('shelf-onedrive'+id);
  const button=el(''),label=el('-label')||button,status=el('-status'),open=el('-open'),disconnect=el('-disconnect'),
    cancel=el('-cancel');
  if(!button||!status)return;
  let state={},transfer={},uiError='';
  function paint(){
    const connected=state.phase==='connected'&&state.rootReady===true;
    button.disabled=false;
    button.setAttribute('aria-label',connected?'Go to OneDrive':'LOGIN OneDrive website');button.closest('.destination-tile')?.setAttribute('data-connected',String(connected));
    label.textContent=connected?'GO TO':'LOGIN';
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
  const reauth=document.getElementById('shelf-onedrive-reauth'),login=document.getElementById('shelf-onedrive-login'),authResult=document.getElementById('shelf-onedrive-auth-result')||status;
  let authPending=null;
  async function website(){
    try{await chrome.tabs.create({url:state.driveType==='business'||state.driveType==='documentLibrary'?'https://www.office.com/launch/onedrive':'https://onedrive.live.com/'});authResult.textContent='Website opened. Extension OAuth unchanged; upload readiness not checked.';}
    catch{authResult.textContent='Website could not open. Try LOGIN again.';}
  }
  button.addEventListener('click',website);
  login?.addEventListener('click',website);
  reauth?.addEventListener('click',async()=>{
    if(authPending){authResult.textContent='Still waiting for OAuth. Complete or close the existing sign-in flow; no new grant confirmed.';return;}
    reauth.disabled=true;reauth.setAttribute('aria-busy','true');
    authResult.textContent='Connecting to OneDrive. Consent/sign-in may be required; an existing grant may be reused.';
    // A timeout is an uncertain reply, never permission to open a second OAuth flow.
    const timer=setTimeout(()=>{reauth.disabled=false;reauth.removeAttribute('aria-busy');authResult.textContent='OAuth reply timed out. The existing request may still be running; no grant confirmed.';},30000);
    authPending=Promise.resolve().then(()=>chrome.runtime.sendMessage({type:'onedriveConnect'}));
    try{
      const r=await authPending;
      if(r?.ok&&r.authorization==='verified')authResult.textContent='OAuth verified. An existing grant may have been reused; no new dialog or grant is confirmed. Upload readiness not checked.';
      else if(r?.ok)authResult.textContent='OAuth reply received, but authorization was not confirmed. No upload readiness claimed.';
      else{
        const detail=String(r?.code||'')+' '+String(r?.error||'');
        if(r?.http>=500||r?.http===429||/503|NETWORK|could not be reached|request interrupted|network|fetch failed/i.test(detail))authResult.textContent='Provider network unavailable. This does not establish revoked authorization. Try Re-O\'Auth later.';
        else if(/cancel|closed|denied|declined|access_denied/i.test(detail))authResult.textContent='Authorization failed or was cancelled/declined. No new grant confirmed.';
        else if(/permission|host access/i.test(detail))authResult.textContent='Authorization permission required. Check REDOWN site access in Chrome and try Re-O\'Auth; no grant confirmed.';
        else if(/not granted|revoked|reconnect|consent|expired/i.test(detail))authResult.textContent='Consent/sign-in required. Try Re-O\'Auth and complete the official sign-in flow; no grant confirmed.';
        else authResult.textContent='Authorization failed. No new grant confirmed. Try Re-O\'Auth again.';
      }
    }catch{authResult.textContent='OAuth reply unavailable or interrupted. No new grant confirmed; check the connection and existing sign-in flow.';}
    finally{clearTimeout(timer);authPending=null;reauth.disabled=false;reauth.removeAttribute('aria-busy');}
  });
  disconnect?.addEventListener('click',()=>void send('onedriveDisconnect').catch(()=>{}));
  cancel?.addEventListener('click',()=>void send('onedriveCancel').catch(()=>{}));
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