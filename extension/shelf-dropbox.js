(() => {
  'use strict';
  const el=id=>document.getElementById('shelf-dropbox'+id),button=el(''),label=el('-label'),status=el('-status'),open=el('-open'),disconnect=el('-disconnect'),cancel=el('-cancel'),hint=el('-authorization');
  if(!button)return;let state={},transfer={},busy=false,uiError='';
  // Error only: visible, compact detail inside this card (not a permanent
  // SUCCESS row or a second counter). The action remains retryable.
  const errorNote=document.createElement('small');
  errorNote.className='dropbox-inline-login-error';
  errorNote.hidden=true;
  button.querySelector('.destination-action-copy')?.append(errorNote);
  function paint(){
    const checking=state.phase==='connected'&&(!Number.isFinite(state.checkedAt)||Date.now()-state.checkedAt>5*60*1000);
    const view=RedownProviderConnection.project('dropbox',state,transfer),connected=view.accountKnown,connecting=busy||state.phase==='connecting';if(hint&&hint.textContent!==view.hint)hint.textContent=view.hint;
    const loginError=uiError||(state.phase==='reconnect'||state.phase==='blocked'?state.error:'')||'';
    button.disabled=busy&&view.primary!=='GO TO';button.setAttribute('aria-label',view.primary==='GO TO'?'Go to Dropbox':loginError?'Retry Dropbox login: '+loginError:checking?'Checking Dropbox':connecting?'Connecting to Dropbox':connected?'Go to Dropbox':'Log in to Dropbox');
    const card=button.closest('.destination-tile');
    card?.setAttribute('data-connected',String(connected));
    card?.setAttribute('data-login-error',String(!!loginError));
    errorNote.hidden=!loginError;
    if(loginError)errorNote.textContent=String(loginError).slice(0,160);
    label.textContent=view.primary;
    button.title=uiError||state.error||'Connect Dropbox to save web files.';open.hidden=false;disconnect.hidden=!connected&&!checking&&state.phase!=='reconnect';cancel.hidden=!['active','queued','awaiting-auth'].includes(transfer.status);
    status.textContent=checking?'Verifying your Dropbox connection…':uiError||transfer.error||state.error||(transfer.status==='active'?`Saving to Dropbox… ${Math.floor((transfer.bytes||0)/1024)} KiB`:transfer.status==='queued'?'Dropbox save queued.':transfer.status==='completed'?(transfer.verified===true?'Saved to Dropbox.':'Dropbox save needs confirmation. Check Dropbox before retrying.'):connected?view.hint+'. Website session is unverified.':'Save supported web files to Dropbox without a permanent local download.');
  }
  async function send(type){return chrome.runtime.sendMessage({type,...(/Status$/.test(type)?{passive:true}:{})});}
  button.addEventListener('click',async()=>{if(RedownProviderConnection.project('dropbox',state,transfer).primary==='GO TO'){try{await chrome.tabs.create({url:'https://www.dropbox.com/home'});}catch{uiError='Could not open Dropbox. Try again.';paint();}return;}if(busy)return;busy=true;uiError='';paint();try{const r=await send('dropboxConnect');if(!r?.ok)uiError=r?.error||'Dropbox login could not start. Check the connection and try again.';}catch(e){uiError='Dropbox sign-in could not start. Check the extension connection and try again.';}finally{busy=false;paint();}});
  disconnect.addEventListener('click',()=>void send('dropboxDisconnect'));
  cancel.addEventListener('click',()=>void send('dropboxCancel'));
  chrome.storage.local.get(['dropbox:state','dropbox:transfer']).then(s=>{state=s['dropbox:state']||{};transfer=s['dropbox:transfer']||{};paint();}).catch(()=>{state={statusUnavailable:true};uiError='Dropbox state is unavailable; website session unverified.';paint();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes['dropbox:state'])state=changes['dropbox:state'].newValue||{};if(changes['dropbox:transfer'])transfer=changes['dropbox:transfer'].newValue||{};paint();});
  void send('dropboxStatus').catch(()=>{});
})();
