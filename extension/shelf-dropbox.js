(() => {
  'use strict';
  const el=id=>document.getElementById('shelf-dropbox'+id),button=el(''),label=el('-label'),status=el('-status'),open=el('-open'),disconnect=el('-disconnect'),cancel=el('-cancel');
  if(!button)return;let state={},transfer={},uiError='';
  // Error only: visible, compact detail inside this card (not a permanent
  // SUCCESS row or a second counter). The action remains retryable.
  const errorNote=document.createElement('small');
  errorNote.className='dropbox-inline-login-error';
  errorNote.hidden=true;
  button.querySelector('.destination-action-copy')?.append(errorNote);
  function paint(){
    const checking=state.phase==='connected'&&(!Number.isFinite(state.checkedAt)||Date.now()-state.checkedAt>5*60*1000);
    const connected=state.phase==='connected'&&state.rootReady&&!checking;
    const loginError=uiError||(state.phase==='reconnect'||state.phase==='blocked'?state.error:'')||'';
    button.disabled=false;button.setAttribute('aria-label',connected?'Go to Dropbox':'LOGIN Dropbox website');
    const card=button.closest('.destination-tile');
    card?.setAttribute('data-connected',String(connected));
    card?.setAttribute('data-login-error',String(!!loginError));
    errorNote.hidden=!loginError;
    if(loginError)errorNote.textContent=String(loginError).slice(0,160);
    label.textContent=connected?'GO TO':'LOGIN';
    button.title=uiError||state.error||'Connect Dropbox to save web files.';open.hidden=false;disconnect.hidden=!connected&&!checking&&state.phase!=='reconnect';cancel.hidden=!['active','queued','awaiting-auth'].includes(transfer.status);
    status.textContent=checking?'Verifying your Dropbox connection…':uiError||transfer.error||state.error||(transfer.status==='active'?`Saving to Dropbox… ${Math.floor((transfer.bytes||0)/1024)} KiB`:transfer.status==='queued'?'Dropbox save queued.':transfer.status==='completed'?(transfer.verified===true?'Saved to Dropbox.':'Dropbox save needs confirmation. Check Dropbox before retrying.'):connected?'Ready to save to your Dropbox root. You can close the Shelf.':'Save supported web files to Dropbox without a permanent local download.');
  }
  async function send(type){return chrome.runtime.sendMessage({type});}
  const reauth=document.getElementById('shelf-dropbox-reauth'),login=document.getElementById('shelf-dropbox-login'),authResult=document.getElementById('shelf-dropbox-auth-result')||status;
  let authPending=null;
  async function website(){
    try{await chrome.tabs.create({url:'https://www.dropbox.com/home'});authResult.textContent='Website opened. Extension OAuth unchanged; upload readiness not checked.';}
    catch{authResult.textContent='Website could not open. Try LOGIN again.';}
  }
  button.addEventListener('click',website);
  login?.addEventListener('click',website);
  reauth?.addEventListener('click',async()=>{
    if(authPending){authResult.textContent='Still waiting for OAuth. Complete or close the existing sign-in flow; no new grant confirmed.';return;}
    reauth.disabled=true;reauth.setAttribute('aria-busy','true');
    authResult.textContent='Connecting to Dropbox. Consent/sign-in may be required; an existing grant may be reused.';
    // A timeout is an uncertain reply, never permission to open a second OAuth flow.
    const timer=setTimeout(()=>{reauth.disabled=false;reauth.removeAttribute('aria-busy');authResult.textContent='OAuth reply timed out. The existing request may still be running; no grant confirmed.';},30000);
    authPending=Promise.resolve().then(()=>chrome.runtime.sendMessage({type:'dropboxConnect'}));
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
  disconnect.addEventListener('click',()=>void send('dropboxDisconnect'));
  cancel.addEventListener('click',()=>void send('dropboxCancel'));
  chrome.storage.local.get(['dropbox:state','dropbox:transfer']).then(s=>{state=s['dropbox:state']||{};transfer=s['dropbox:transfer']||{};paint();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes['dropbox:state'])state=changes['dropbox:state'].newValue||{};if(changes['dropbox:transfer'])transfer=changes['dropbox:transfer'].newValue||{};paint();});
  void send('dropboxStatus').catch(()=>{});
})();
