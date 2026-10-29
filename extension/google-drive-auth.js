/* Google Drive Chrome Identity connector. No credentials stored; only
   verified account display metadata. Interactive consent is click-only. */
(() => {
  'use strict';
  const SCOPE='https://www.googleapis.com/auth/drive.file';
  const KEY='googleDriveConnection';
  const ABOUT='https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)';
  const badge=document.getElementById('google-state');
  const button=document.getElementById('google-connect');
  const status=document.getElementById('status');
  if(!badge||!button)return;
  const clientId=chrome.runtime.getManifest()?.oauth2?.client_id||'';
  const configured=/^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(clientId)&&!/replace|placeholder/i.test(clientId);
  let phase='checking',busy=false,epoch=0,profile=null;
  function paint(next,message){
    phase=next;
    badge.dataset.state=next;
    badge.textContent=next==='connected'?'Connected':next==='checking'?'Checking':next==='setup'?'Setup':next==='error'?'Check login':'Not connected';
    button.disabled=busy||next==='checking';
    button.textContent=busy?'Connecting…':next==='connected'?'Open Google Drive ↗':'LOGIN!';
    button.title=next==='connected'&&profile?.email?'Connected as '+profile.email:next==='setup'?'Google OAuth client ID required':'Google Drive sign-in';
    if(message)status.textContent=message;
    document.dispatchEvent(new Event('redown:provider-connection'));
  }
  async function getToken(interactive=false){
    if(!configured)throw Error('Google OAuth client ID is not configured. See docs/GOOGLE_DRIVE_OAUTH_SETUP.md.');
    const result=await chrome.identity.getAuthToken({interactive,scopes:[SCOPE]});
    if(Array.isArray(result?.grantedScopes)&&!result.grantedScopes.includes(SCOPE))throw Error('Drive permission was not granted.');
    const token=typeof result==='string'?result:result?.token;
    if(!token)throw Error('Google did not return an access token.');
    return token;
  }
  async function about(token){
    const response=await fetch(ABOUT,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if(response.status===401){const e=Error('Google authorization expired.');e.invalidToken=true;throw e;}
    if(!response.ok)throw Error('Google Drive verification failed (HTTP '+response.status+').');
    const value=await response.json();
    if(!value?.user||typeof value.user!=='object')throw Error('Google Drive did not return account information.');
    return {connected:true,email:String(value.user.emailAddress||'').slice(0,254),
      displayName:String(value.user.displayName||'').slice(0,150),verifiedAt:Date.now()};
  }
  async function verify(interactive){
    let token=await getToken(interactive);
    try{return await about(token);}
    catch(e){
      if(!e.invalidToken)throw e;
      await chrome.identity.removeCachedAuthToken({token});
      token=await getToken(interactive);
      return about(token);
    }
  }
  async function login(){
    if(busy)return;
    if(phase==='connected'){
      try{await chrome.tabs.create({url:'https://drive.google.com/drive/my-drive'});}
      catch(e){paint('connected','Could not open Google Drive: '+e.message);}
      return;
    }
    if(!configured){paint('setup','Create a Google Chrome Extension OAuth client ID first. See docs/GOOGLE_DRIVE_OAUTH_SETUP.md.');return;}
    const ticket=++epoch;busy=true;paint('checking');
    try{
      const user=await verify(true);
      if(ticket!==epoch)return;
      await chrome.storage.local.set({[KEY]:user});
      profile=user;paint('connected','Google Drive connected. Right-click upload integration is the next step.');
    }catch(e){if(ticket===epoch)paint('error',e?.message||'Google Drive sign-in failed.');}
    finally{if(ticket===epoch){busy=false;paint(phase);}}
  }
  async function restore(){
    const ticket=++epoch;
    if(!configured){paint('setup');return;}
    paint('checking');
    try{
      const stored=await chrome.storage.local.get(KEY);
      if(ticket!==epoch)return;
      if(!stored[KEY]?.connected){paint('disconnected');return;}
      const user=await verify(false);
      if(ticket!==epoch)return;
      profile=user;paint('connected');
    }catch{if(ticket===epoch)paint('error','Google Drive needs reconnection. Click LOGIN!.');}
  }
  button.addEventListener('click',()=>void login());
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes[KEY]&&!changes[KEY].newValue?.connected){
      epoch++;profile=null;paint('disconnected');
    }
  });
  globalThis.RedownGoogleDriveIdentity=Object.freeze({getAccessToken:()=>getToken(false),refresh:restore,isConfigured:()=>configured});
  void restore();
})();