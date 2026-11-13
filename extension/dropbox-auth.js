/* Dropbox-only PKCE client. Secrets remain in trusted extension storage/memory. */
(() => {
  'use strict';
  const APP_KEY='h0mbahfonf0zkul', ID='mkadkgpekmkknfbniacdlmgikihjjepf';
  const SCOPES=['account_info.read','files.metadata.read','files.content.read','files.content.write'];
  const fail=(message,status='blocked')=>Object.assign(Error(message),{status});
  function create({chrome=globalThis.chrome,fetch=globalThis.fetch,crypto=globalThis.crypto,now=Date.now}={}){
    let access=null,connection=null,epoch=0;
    const get=async key=>(await chrome.storage.local.get(key))[key];
    const state=s=>chrome.storage.local.set({'dropbox:state':s});
    async function secure(){await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});await chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});}
    const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
    function redirect(){const url=chrome.identity.getRedirectURL('dropbox');if(chrome.runtime.id!==ID||url!==`https://${ID}.chromiumapp.org/dropbox`)throw fail('Install REDOWN under its registered extension ID to connect Dropbox.');return url;}
    async function request(url,options){try{return await fetch(url,{...options,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(25000)});}catch{throw fail('Dropbox could not be reached. Try again.','failed');}}
    async function token(params){
      const r=await request('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:APP_KEY})});
      const t=await r.json().catch(()=>({}));
      if(!r.ok||typeof t.access_token!=='string'||!Number.isFinite(t.expires_in)||t.expires_in<=0)throw Object.assign(fail('Dropbox authorization expired or was denied. Reconnect Dropbox.'),{http:r.status});
      if(t.scope&&!SCOPES.every(s=>t.scope.split(' ').includes(s)))throw fail('Dropbox has not granted the required file permissions.');
      return t;
    }
    async function rpcWith(t,path,body,namespace){
      const r=await request('https://api.dropboxapi.com/2/'+path,{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json',...(namespace?{'Dropbox-API-Path-Root':JSON.stringify({'.tag':'root',root:namespace})}:{})},body:JSON.stringify(body)});
      if(!r.ok)throw Object.assign(fail(r.status===401?'Reconnect Dropbox.':'Dropbox root could not be verified.'),{http:r.status});return r.json();
    }
    async function verify(t,expected){
      const a=await rpcWith(t,'users/get_current_account',null);
      if(!/^dbid:[\w-]+$/.test(a.account_id||'')||expected&&a.account_id!==expected)throw fail('Dropbox account changed. Reconnect before saving.');
      const root=a.root_info;
      // Dropbox's documented team-space accounts legitimately have distinct
      // root_namespace_id and home_namespace_id. That is not evidence of a
      // restricted token. Verify the EXACT root with an authenticated API call.
      if(!['user','team'].includes(root?.['.tag'])||!/^\d+$/.test(root.root_namespace_id||'')||!/^\d+$/.test(root.home_namespace_id||''))
        throw fail('Dropbox did not return a valid authorized root. Reconnect Dropbox.');
      // A restricted App Folder grant will fail this exact-root readback.
      // Do not fall back to a different namespace or silently widen access.
      await rpcWith(t,'files/list_folder',{path:'',limit:1},root.root_namespace_id);
      return {provider:'dropbox',accountId:a.account_id,namespace:root.root_namespace_id,root:'/',rootReady:true};
    }
    async function connect(){
      if(connection)return connection;
      connection=(async()=>{
        const ticket=epoch;let uri;try{await secure();uri=redirect();}catch(e){await state({phase:'reconnect',error:e.status?e.message:'Dropbox secure storage is unavailable.'});throw e;}await state({phase:'connecting'});
        try{
          // Include PKCE creation/session writes in the protected region so an
          // early failure cannot strand the Shelf in an unclickable state.
          const verifier=random(),nonce=random(),challenge=b64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
          const attempt={nonce,verifier,at:now()};await chrome.storage.session.set({'dropbox:oauth':attempt});
          const u=new URL('https://www.dropbox.com/oauth2/authorize');u.search=new URLSearchParams({client_id:APP_KEY,response_type:'code',redirect_uri:uri,code_challenge:challenge,code_challenge_method:'S256',state:nonce,token_access_type:'offline',scope:SCOPES.join(' ')});
          if(typeof chrome.identity.launchWebAuthFlow!=='function')throw fail('Chrome cannot open Dropbox authorization in this extension. Reload REDOWN and retry.');
          let response;
          try{response=await chrome.identity.launchWebAuthFlow({url:u.href,interactive:true});}
          catch(e){
            const cancelled=/cancel|denied|closed|user rejected/i.test(String(e?.message||''));
            throw fail(cancelled?'Dropbox login was cancelled.':'Chrome could not open Dropbox sign-in. Verify this extension’s registered ID and OAuth redirect, then retry.',cancelled?'cancelled':'blocked');
          }
          const saved=(await chrome.storage.session.get('dropbox:oauth'))['dropbox:oauth'];
          await chrome.storage.session.remove('dropbox:oauth'); // consume before token exchange; no replay
          const result=new URL(response);
          if(result.origin+result.pathname!==uri||result.username||result.password||result.hash||result.searchParams.getAll('state').length!==1||result.searchParams.get('state')!==nonce||saved?.nonce!==nonce||(now()-saved.at<0||now()-saved.at>10*60*1000)||result.searchParams.has('error')||result.searchParams.getAll('code').length!==1||!result.searchParams.get('code'))throw fail('Dropbox authorization response was invalid or expired.');
          const t=await token({grant_type:'authorization_code',code:result.searchParams.get('code'),code_verifier:verifier,redirect_uri:uri});
          if(!t.refresh_token)throw fail('Dropbox did not grant offline access. Reconnect Dropbox.');
          const identity=await verify(t.access_token,t.account_id);if(ticket!==epoch)throw fail('Dropbox connection cancelled.');
          const auth={...identity,refreshToken:t.refresh_token,connectionId:crypto.randomUUID()};
          await chrome.storage.local.set({'dropbox:auth':auth});access={value:t.access_token,until:now()+t.expires_in*1000,accountId:auth.accountId};
          const connected={...identity,connectionId:auth.connectionId,phase:'connected',checkedAt:now()};await state(connected);return connected;
        }catch(e){access=null;await state({phase:'reconnect',error:e.status?e.message:'Dropbox login could not be completed.'});throw e;}
        finally{await chrome.storage.session.remove('dropbox:oauth');}
      })().finally(()=>{connection=null;});return connection;
    }
    let refreshing;
    async function ready(expected,force=false){
      await secure();const a=await get('dropbox:auth');
      if(!a||expected&&(a.accountId!==expected.accountId||a.connectionId!==expected.connectionId||expected.namespace&&a.namespace!==expected.namespace)){await state({phase:'reconnect',error:'Reconnect the original Dropbox account before saving.'});throw fail('Reconnect the original Dropbox account before saving.');}
      if(!access||access.accountId!==a.accountId||access.until<now()+60000){
        if(!refreshing)refreshing=(async()=>{const ticket=epoch;try{const t=await token({grant_type:'refresh_token',refresh_token:a.refreshToken});const verified=await verify(t.access_token,a.accountId);if(verified.namespace!==a.namespace)throw fail('Dropbox root changed. Reconnect Dropbox.');if(ticket!==epoch)throw fail('Dropbox disconnected.');access={value:t.access_token,until:now()+t.expires_in*1000,accountId:a.accountId};}catch(e){access=null;await state({phase:'reconnect',error:e.status?e.message:'Reconnect Dropbox to verify your account.'});throw e;}})().finally(()=>{refreshing=null;});
        await refreshing;
      }
      if(force){try{const v=await verify(access.value,a.accountId);if(v.namespace!==a.namespace)throw fail('Dropbox root changed.');}catch(e){access=null;await state({phase:'reconnect',error:e.status?e.message:'Reconnect Dropbox to verify your account.'});throw e;}}
      const current=await get('dropbox:auth');if(current?.connectionId!==a.connectionId)throw fail('Dropbox connection changed.');
      const s={provider:'dropbox',accountId:a.accountId,namespace:a.namespace,root:'/',rootReady:true,connectionId:a.connectionId,phase:'connected',checkedAt:now()};const old=await get('dropbox:state');if(force||old?.phase!=='connected'||old?.connectionId!==s.connectionId)await state(s);
      return {...s,token:access.value};
    }
    async function invalidate(){access=null;await state({phase:'reconnect',error:'Reconnect Dropbox.'});}
    async function disconnect(){epoch++;const old=access;access=null;await chrome.storage.local.remove('dropbox:auth');await chrome.storage.session.remove('dropbox:oauth');await state({phase:'disconnected'});if(old)await request('https://api.dropboxapi.com/2/auth/token/revoke',{method:'POST',headers:{Authorization:'Bearer '+old.value}}).catch(()=>{});}
    return {connect,ready,disconnect,invalidate};
  }
  globalThis.RedownDropboxAuth={create,APP_KEY,SCOPES,fail};
})();
