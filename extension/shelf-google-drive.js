(() => {
  'use strict';
  const button=document.getElementById('shelf-google-drive'),label=document.getElementById('shelf-google-label'),status=document.getElementById('shelf-google-status'),folder=document.getElementById('shelf-google-folder');
  if(!button)return;
  function paint(s={}){const connected=s.phase==='connected';button.disabled=false;label.textContent=connected?'GO TO':'LOGIN';button.setAttribute('aria-label',connected?'Go to Google Drive':'LOGIN Google Drive website');button.closest('.destination-tile')?.setAttribute('data-connected',String(connected));status.textContent=connected?'My Drive ready. Saves continue in the background; progress and outcomes appear here and in History.':'Save supported web files to Google Drive without saving a permanent copy to your computer.';folder.hidden=!connected;if(!folder.hidden)folder.href='https://drive.google.com/drive/my-drive';}
  document.getElementById('shelf-google-cancel')?.addEventListener('click',()=>chrome.runtime.sendMessage({type:'googleDriveCancel'}));
  const reauth=document.getElementById('shelf-google-reauth'),login=document.getElementById('shelf-google-login'),authResult=document.getElementById('shelf-google-auth-result')||status;
  let authPending=null;
  async function website(){
    try{await chrome.tabs.create({url:'https://drive.google.com/drive/u/0/my-drive'});authResult.textContent='Website opened. Extension OAuth unchanged; upload readiness not checked.';}
    catch{authResult.textContent='Website could not open. Try LOGIN again.';}
  }
  button.addEventListener('click',website);
  login?.addEventListener('click',website);
  reauth?.addEventListener('click',async()=>{
    if(authPending){authResult.textContent='Still waiting for OAuth. Complete or close the existing sign-in flow; no new grant confirmed.';return;}
    reauth.disabled=true;reauth.setAttribute('aria-busy','true');
    authResult.textContent='Connecting to Google Drive. Consent/sign-in may be required; an existing grant may be reused.';
    // A timeout is an uncertain reply, never permission to open a second OAuth flow.
    const timer=setTimeout(()=>{reauth.disabled=false;reauth.removeAttribute('aria-busy');authResult.textContent='OAuth reply timed out. The existing request may still be running; no grant confirmed.';},30000);
    authPending=Promise.resolve().then(()=>chrome.runtime.sendMessage({type:'googleDriveOpen'}));
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
  chrome.runtime.sendMessage({type:'googleDriveStatus'}).catch(()=>{});
  chrome.storage.local.get('googleDriveState').then(s=>paint(s.googleDriveState));
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.googleDriveState)paint(changes.googleDriveState.newValue);if(changes.googleDriveTransfer){const t=changes.googleDriveTransfer.newValue||{};status.textContent=t.error|| (t.status==='completed'?'Saved and verified in Google Drive.':t.status==='active'?'Saving · '+(Number(t.bytes||0)/1048576).toFixed(1)+' MiB':t.status==='interrupted'?'Connection interrupted. Checking the saved upload before resuming.':t.status||'');}});
})();
