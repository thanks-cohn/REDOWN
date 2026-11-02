/* REDOWN OneDrive-only Microsoft OAuth PKCE client.
 * Built from the verified Chrome diagnostic. No V3, Dropbox or Google state.
 * Refresh credentials are only available to trusted extension contexts.
 */
(() => {
  'use strict';
  const CLIENT='a8e034a8-6462-4022-b3f3-a79ffb6b1b84';
  const EXTENSION='mkadkgpekmkknfbniacdlmgikihjjepf';
  const SCOPES=['Files.ReadWrite','User.Read','offline_access'];
  const ORIGINS=['https://login.microsoftonline.com/*','https://graph.microsoft.com/*'];
  const AUTH='https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  const TOKEN='https://login.microsoftonline.com/common/oauth2/v2.0/token';
  const GRAPH='https://graph.microsoft.com/v1.0/';
  const fail=(code,message,status='blocked')=>Object.assign(Error(message),{code,status});
  const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  function create({chrome=globalThis.chrome,fetch=globalThis.fetch,crypto=globalThis.crypto,now=Date.now}={}){
    let cached=null,connecting=null,refreshing=null,epoch=0;
    const get=async key=>(await chrome.storage.local.get(key))[key];
    const setState=s=>chrome.storage.local.set({'onedrive:state':s});
    const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
    async function secure(){
      await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
      await chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
    }
    function redirect(){
      const url=chrome.identity.getRedirectURL('onedrive');
      if(chrome.runtime.id!==EXTENSION||url!==`https://${EXTENSION}.chromiumapp.org/onedrive`)
        throw fail('ONEDRIVE_EXTENSION_ID_MISMATCH','The installed REDOWN extension ID does not match the Microsoft registration.');
      return url;
    }
    async function request(url,options={}){
      try{return await fetch(url,{...options,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(25000)});}
      catch{throw fail('ONEDRIVE_NETWORK','Microsoft could not be reached from the extension.','failed');}
    }
    function aadsts(payload){
      const m=String(payload?.error_description||'').slice(0,1024).match(/AADSTS\d{4,8}/);
      return m?.[0]||'';
    }
    async function exchange(params){
      const res=await request(TOKEN,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({client_id:CLIENT,...params})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||typeof data.access_token!=='string'||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<=0)
        throw fail('ONEDRIVE_TOKEN_REJECTED','Microsoft could not complete authentication. '+(aadsts(data)||('HTTP '+res.status)));
      if(data.scope){
        const scopes=data.scope.toLowerCase().split(/\s+/);
        if(!['files.readwrite','user.read'].every(s=>scopes.includes(s)))
          throw fail('ONEDRIVE_SCOPES','Microsoft did not grant the permissions needed for OneDrive.');
      }
      return data;
    }
    async function graph(token,path){
      const res=await request(GRAPH+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
      if(!res.ok)throw fail('ONEDRIVE_GRAPH_'+res.status,'Microsoft Graph could not verify this OneDrive account (HTTP '+res.status+').');
      return res.json().catch(()=>{throw fail('ONEDRIVE_GRAPH_INVALID','Microsoft returned invalid account information.');});
    }
    async function verify(token,expected){
      const [me,drive,root]=await Promise.all([
        graph(token,'me?$select=id'),
        graph(token,'me/drive?$select=id,driveType'),
        graph(token,'me/drive/root?$select=id,folder')
      ]);
      if(typeof me.id!=='string'||!me.id||typeof drive.id!=='string'||!drive.id||
        typeof root.id!=='string'||!root.id||!root.folder)
        throw fail('ONEDRIVE_ROOT_INVALID','OneDrive did not return a verified account, drive and root folder.');
      const identity={provider:'onedrive',accountId:me.id,driveId:drive.id,rootId:root.id,driveType:drive.driveType||'unknown',root:'/',rootReady:true};
      if(expected&&['accountId','driveId','rootId'].some(key=>expected[key]!==identity[key]))
        throw fail('ONEDRIVE_ACCOUNT_CHANGED','The Microsoft account or OneDrive root changed. Disconnect, then sign in again.');
      return identity;
    }
    async function connect(){
      if(connecting)return connecting;
      connecting=(async()=>{
        const ticket=epoch;
        let url;
        try{
          await secure();url=redirect();
          if(!await chrome.permissions.contains({origins:ORIGINS}))
            throw fail('ONEDRIVE_PERMISSION_REQUIRED','Allow Microsoft sign-in and Graph permissions from the Shelf, then try again.');
        }catch(e){await setState({phase:'reconnect',code:e.code||'ONEDRIVE_SECURE_STORAGE',error:e.message||'Secure storage is unavailable.'});throw e;}
        await setState({phase:'connecting'});
        const verifier=random(),nonce=random(),started=now();
        const challenge=b64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
        await chrome.storage.session.set({'onedrive:oauth':{nonce,verifier,started}});
        try{
          const authorize=new URL(AUTH);
          authorize.search=new URLSearchParams({client_id:CLIENT,response_type:'code',response_mode:'query',redirect_uri:url,
            code_challenge:challenge,code_challenge_method:'S256',state:nonce,scope:SCOPES.join(' ')});
          let response;
          try{response=await chrome.identity.launchWebAuthFlow({url:authorize.href,interactive:true});}
          catch{throw fail('ONEDRIVE_AUTH_CANCELLED','Microsoft sign-in was closed or could not complete.');}
          const saved=(await chrome.storage.session.get('onedrive:oauth'))['onedrive:oauth'];
          await chrome.storage.session.remove('onedrive:oauth'); // Consume once, before code redemption.
          let callback;
          try{callback=new URL(response);}catch{throw fail('ONEDRIVE_CALLBACK_INVALID','Microsoft returned an invalid callback.');}
          if(callback.origin+callback.pathname!==url||callback.username||callback.password||callback.hash||
            callback.searchParams.getAll('state').length!==1||callback.searchParams.get('state')!==nonce||
            !saved||saved.nonce!==nonce||saved.verifier!==verifier||
            now()<started||now()-started>10*60*1000||saved.started!==started)
            throw fail('ONEDRIVE_CALLBACK_INVALID','Microsoft authorization callback was mismatched or expired.');
          if(callback.searchParams.has('error'))
            throw fail('ONEDRIVE_AUTH_REJECTED','Microsoft rejected authorization. '+(aadsts({error_description:callback.searchParams.get('error_description')})||''));
          if(callback.searchParams.getAll('code').length!==1||!callback.searchParams.get('code'))
            throw fail('ONEDRIVE_AUTH_CODE_MISSING','Microsoft did not return a usable authorization code.');
          const token=await exchange({grant_type:'authorization_code',code:callback.searchParams.get('code'),code_verifier:verifier,
            redirect_uri:url,scope:SCOPES.join(' ')});
          if(typeof token.refresh_token!=='string'||!token.refresh_token)
            throw fail('ONEDRIVE_OFFLINE_ACCESS','Microsoft did not grant the offline access required for reliable saves.');
          const identity=await verify(token.access_token);
          if(ticket!==epoch)throw fail('ONEDRIVE_DISCONNECTED','OneDrive was disconnected during login.');
          const auth={...identity,refreshToken:token.refresh_token,connectionId:crypto.randomUUID()};
          await chrome.storage.local.set({'onedrive:auth':auth});
          cached={value:token.access_token,until:now()+token.expires_in*1000,connectionId:auth.connectionId};
          const state={...identity,connectionId:auth.connectionId,phase:'connected',checkedAt:now()};
          await setState(state);return state;
        }catch(e){
          cached=null;
          if(ticket===epoch)await setState({phase:'reconnect',code:e.code||'ONEDRIVE_CONNECT_FAILED',error:e.code?e.message:'OneDrive sign-in failed. Reconnect.'});
          throw e;
        }finally{await chrome.storage.session.remove('onedrive:oauth').catch(()=>{});}
      })().finally(()=>{connecting=null;});
      return connecting;
    }
    async function ready(expected=null,force=false){
      await secure();
      const auth=await get('onedrive:auth');
      if(!auth||!auth.connectionId||!auth.refreshToken||!auth.rootReady)
        throw fail('ONEDRIVE_NOT_CONNECTED','Log in to OneDrive from the Shelf before saving.');
      if(expected&&['accountId','driveId','rootId','connectionId'].some(key=>auth[key]!==expected[key]))
        throw fail('ONEDRIVE_ACCOUNT_CHANGED','The OneDrive account changed. Reconnect before trying this save.');
      if(!cached||cached.connectionId!==auth.connectionId||cached.until<now()+60000){
        if(!refreshing)refreshing=(async()=>{
          const ticket=epoch;
          try{
            const token=await exchange({grant_type:'refresh_token',refresh_token:auth.refreshToken,scope:SCOPES.join(' ')});
            const identity=await verify(token.access_token,auth);
            if(ticket!==epoch)throw fail('ONEDRIVE_DISCONNECTED','OneDrive was disconnected.');
            const current=await get('onedrive:auth');
            if(current?.connectionId!==auth.connectionId)throw fail('ONEDRIVE_ACCOUNT_CHANGED','OneDrive connection changed.');
            await chrome.storage.local.set({'onedrive:auth':{...auth,...identity,refreshToken:token.refresh_token||auth.refreshToken}});
            cached={value:token.access_token,until:now()+token.expires_in*1000,connectionId:auth.connectionId};
          }catch(e){
            cached=null;
            if(ticket===epoch)await setState({phase:'reconnect',code:e.code||'ONEDRIVE_REFRESH_FAILED',error:'Reconnect OneDrive to renew and verify access.'});
            throw e;
          }
        })().finally(()=>{refreshing=null;});
        await refreshing;
      }
      if(force){
        try{await verify(cached.value,auth);}
        catch(e){cached=null;await setState({phase:'reconnect',code:e.code||'ONEDRIVE_VERIFY_FAILED',error:'Reconnect OneDrive to verify the original drive.'});throw e;}
      }
      const current=await get('onedrive:auth');
      if(current?.connectionId!==auth.connectionId)throw fail('ONEDRIVE_ACCOUNT_CHANGED','OneDrive connection changed.');
      const state={provider:'onedrive',accountId:auth.accountId,driveId:auth.driveId,rootId:auth.rootId,root:'/',
        rootReady:true,driveType:auth.driveType,connectionId:auth.connectionId,phase:'connected',checkedAt:now()};
      const old=await get('onedrive:state');
      if(force||old?.phase!=='connected'||old?.connectionId!==auth.connectionId)await setState(state);
      return {...state,token:cached.value};
    }
    async function disconnect(){
      epoch++;cached=null;
      await chrome.storage.local.remove(['onedrive:auth','onedrive:transfer','onedrive:trustedUploadOrigins']);
      await chrome.storage.session.remove('onedrive:oauth').catch(()=>{});
      await setState({phase:'disconnected'});
    }
    return {connect,ready,disconnect,verify,fail,ORIGINS};
  }
  globalThis.RedownOneDriveAuth={create,fail,ORIGINS,SCOPES};
})();
