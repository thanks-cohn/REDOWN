/* Explicit, ephemeral Microsoft OAuth + PKCE diagnostic.
 * No production account connection, token persistence, uploads, menus or History.
 * This is NOT evidence of live Chrome success until the owner runs it.
 */
(() => {
  'use strict';
  const CLIENT_ID='a8e034a8-6462-4022-b3f3-a79ffb6b1b84';
  const EXTENSION_ID='mkadkgpekmkknfbniacdlmgikihjjepf';
  const ORIGINS=['https://login.microsoftonline.com/*','https://graph.microsoft.com/*'];
  const SCOPES=['Files.ReadWrite','User.Read','offline_access'];
  const AUTH='https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  const TOKEN='https://login.microsoftonline.com/common/oauth2/v2.0/token';
  const GRAPH='https://graph.microsoft.com/v1.0/';
  const outcome=(code,message,stage,extra={})=>({ok:false,code,message,stage,...extra});
  const safeStatus=n=>Number.isInteger(n)&&n>=100&&n<=599?n:undefined;
  function aadsts(value){
    const description=String(value?.error_description||'').slice(0,1024);
    const code=Array.isArray(value?.error_codes)?value.error_codes.find(n=>Number.isSafeInteger(n)):null;
    const match=description.match(/AADSTS(\d{4,8})/i);
    return match?'AADSTS'+match[1]:code!=null?'AADSTS'+code:undefined;
  }
  function create({chrome=globalThis.chrome,fetch=globalThis.fetch,crypto=globalThis.crypto,now=Date.now}={}){
    let running=false;
    const base64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const random=()=>base64(crypto.getRandomValues(new Uint8Array(32)));
    async function request(url,options){
      return fetch(url,{...options,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(25000)});
    }
    async function run(){
      if(running)return outcome('ONEDRIVE_DIAGNOSTIC_BUSY','A Microsoft sign-in test is already running.','start');
      running=true;
      let stage='start';
      try{
        if(chrome.runtime.id!==EXTENSION_ID||chrome.identity.getRedirectURL('onedrive')!==`https://${EXTENSION_ID}.chromiumapp.org/onedrive`)
          return outcome('ONEDRIVE_EXTENSION_ID_MISMATCH','This Chrome extension ID does not match the registered Microsoft callback.','configuration');
        if(!await chrome.permissions.contains({origins:ORIGINS}))
          return outcome('ONEDRIVE_HOST_PERMISSION_REQUIRED','Allow Microsoft sign-in and Microsoft Graph access in the Shelf, then test again.','permissions');
        const redirect=chrome.identity.getRedirectURL('onedrive'),verifier=random(),nonce=random(),start=now();
        const challenge=base64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
        const u=new URL(AUTH);
        u.search=new URLSearchParams({client_id:CLIENT_ID,response_type:'code',redirect_uri:redirect,response_mode:'query',
          scope:SCOPES.join(' '),code_challenge:challenge,code_challenge_method:'S256',state:nonce});
        stage='authorization';
        let callback;
        try{callback=await chrome.identity.launchWebAuthFlow({url:u.href,interactive:true});}
        catch{return outcome('ONEDRIVE_AUTH_WINDOW_FAILED','Microsoft sign-in was cancelled, blocked, or could not finish in Chrome.','authorization');}
        if(typeof callback!=='string')return outcome('ONEDRIVE_AUTH_CALLBACK_MISSING','Chrome did not return an authorization callback.','callback');
        let target;
        try{target=new URL(callback);}catch{return outcome('ONEDRIVE_AUTH_CALLBACK_INVALID','Microsoft returned an invalid callback.','callback');}
        stage='callback';
        if(target.origin+target.pathname!==redirect||target.username||target.password||target.hash||
           now()<start||now()-start>10*60*1000||target.searchParams.getAll('state').length!==1||
           target.searchParams.get('state')!==nonce)
          return outcome('ONEDRIVE_AUTH_CALLBACK_INVALID','Microsoft authorization callback was mismatched or expired.','callback');
        if(target.searchParams.has('error'))
          return outcome('ONEDRIVE_AUTH_REJECTED','Microsoft refused authorization. Check consent and the app registration.','authorization',
            {aadsts:aadsts({error_description:target.searchParams.get('error_description')})});
        if(target.searchParams.getAll('code').length!==1||!target.searchParams.get('code'))
          return outcome('ONEDRIVE_AUTH_CODE_MISSING','No usable authorization code was returned.','callback');
        // The code is consumed only once. No callback URL, verifier or token is logged or persisted.
        stage='token';
        let res,body;
        try{
          res=await request(TOKEN,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
            body:new URLSearchParams({client_id:CLIENT_ID,grant_type:'authorization_code',code:target.searchParams.get('code'),
              redirect_uri:redirect,code_verifier:verifier,scope:SCOPES.join(' ')})});
          body=await res.json().catch(()=>({}));
        }catch{return outcome('ONEDRIVE_TOKEN_NETWORK_ERROR','Chrome could not reach the Microsoft token endpoint.','token');}
        if(!res.ok||typeof body.access_token!=='string'||!body.access_token||!Number.isFinite(body.expires_in)||body.expires_in<=0)
          return outcome('ONEDRIVE_TOKEN_REJECTED','Microsoft did not accept the authorization-code exchange.','token',
            {httpStatus:safeStatus(res.status),aadsts:aadsts(body)});
        // Token remains in this function only and is used for read-only identity/root checks.
        const headers={Authorization:'Bearer '+body.access_token,Accept:'application/json'};
        stage='graph-me';
        let me;
        try{me=await request(GRAPH+'me?$select=id',{headers});}
        catch{return outcome('ONEDRIVE_GRAPH_NETWORK_ERROR','Token exchanged, but Chrome could not reach Microsoft Graph.','graph-me');}
        if(!me.ok)return outcome('ONEDRIVE_GRAPH_IDENTITY_REJECTED','Token exchanged, but Microsoft Graph could not read the account.','graph-me',{httpStatus:safeStatus(me.status)});
        const identity=await me.json().catch(()=>({}));
        if(typeof identity.id!=='string'||!identity.id)
          return outcome('ONEDRIVE_GRAPH_IDENTITY_INVALID','Microsoft Graph did not return a usable identity.','graph-me');
        stage='graph-root';
        let root;
        try{root=await request(GRAPH+'me/drive/root?$select=id,folder',{headers});}
        catch{return outcome('ONEDRIVE_GRAPH_NETWORK_ERROR','Identity verified, but the OneDrive root request failed.','graph-root');}
        if(!root.ok)return outcome('ONEDRIVE_GRAPH_ROOT_REJECTED','Microsoft sign-in worked, but this account\'s OneDrive root was not readable.','graph-root',{httpStatus:safeStatus(root.status)});
        const item=await root.json().catch(()=>({}));
        if(typeof item.id!=='string'||!item.id||!item.folder)
          return outcome('ONEDRIVE_GRAPH_ROOT_INVALID','Microsoft did not return a usable OneDrive root folder.','graph-root');
        return {ok:true,code:'ONEDRIVE_OAUTH_DIAGNOSTIC_PASSED',stage:'graph-root',
          message:'Microsoft login, token exchange, and read-only OneDrive root verification passed in this Chrome extension. Uploads are still disabled.'};
      }catch{
        return outcome('ONEDRIVE_DIAGNOSTIC_ERROR','An unexpected error interrupted the Microsoft sign-in test.',stage);
      }finally{running=false;}
    }
    return {run};
  }
  globalThis.RedownOneDriveOAuthDiagnostic={create,ORIGINS};
})();
