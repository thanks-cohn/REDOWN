import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

const ID='mkadkgpekmkknfbniacdlmgikihjjepf';
const REDIRECT=`https://${ID}.chromiumapp.org/onedrive`;
const TOKEN='https://login.microsoftonline.com/common/oauth2/v2.0/token';
const source=readFileSync('extension/onedrive-oauth-diagnostic.js','utf8');

function fixture(options={}){
  const calls=[],auth=[],grants=[];
  const chrome={
    runtime:{id:options.id||ID},
    identity:{
      getRedirectURL:()=>options.redirect||REDIRECT,
      async launchWebAuthFlow({url,interactive}){
        auth.push({url,interactive});
        if(options.authError)throw Error('synthetic auth cancellation');
        const state=new URL(url).searchParams.get('state');
        return options.callback?.(state)||REDIRECT+'?code=test-code&state='+encodeURIComponent(state);
      }
    },
    permissions:{async contains(details){grants.push(details);return options.permission!==false;}}
  };
  const fetch=async (url,init)=>{
    calls.push({url,init});
    if(options.fetchError)throw Error('synthetic network error');
    const response=(status,body)=>({ok:status===200,status,json:async()=>body});
    if(url===TOKEN)return response(options.tokenStatus||200,options.tokenStatus?
      {error_description:'AADSTS9002327: synthetic sensitive response',error_codes:[9002327]}:
      {access_token:'test-access',refresh_token:'test-refresh',expires_in:3600});
    if(url.includes('/v1.0/me?$select=id'))return response(options.identityStatus||200,{id:'test-identity'});
    if(url.includes('/v1.0/me/drive/root?'))return response(options.rootStatus||200,{id:'test-root',folder:{childCount:0}});
    throw Error('Unexpected URL '+url);
  };
  const context=vm.createContext({chrome,fetch,crypto:webcrypto,URL,URLSearchParams,TextEncoder,
    Uint8Array,AbortSignal,Date,btoa,console});
  vm.runInContext(source,context,{filename:'onedrive-oauth-diagnostic.js'});
  const diagnostic=vm.runInContext('RedownOneDriveOAuthDiagnostic.create()',context);
  return {diagnostic,calls,auth,grants,chrome};
}

test('registered Chrome ID and callback required before any network/auth',async()=>{
  const f=fixture({id:'unregistered'});
  assert.equal((await f.diagnostic.run()).code,'ONEDRIVE_EXTENSION_ID_MISMATCH');
  assert.equal(f.auth.length,0);assert.equal(f.calls.length,0);
});
test('Microsoft site access must be explicitly granted',async()=>{
  const f=fixture({permission:false});
  assert.equal((await f.diagnostic.run()).code,'ONEDRIVE_HOST_PERMISSION_REQUIRED');
  assert.equal(f.auth.length,0);assert.equal(f.calls.length,0);
  assert.deepEqual(JSON.parse(JSON.stringify(f.grants[0].origins)),
    ['https://login.microsoftonline.com/*','https://graph.microsoft.com/*']);
});
test('PKCE, one-time matching state, code exchange and read-only Graph root proof',async()=>{
  const f=fixture(),result=await f.diagnostic.run();
  assert.equal(result.ok,true);assert.equal(result.code,'ONEDRIVE_OAUTH_DIAGNOSTIC_PASSED');
  assert.equal(f.auth.length,1);assert.equal(f.auth[0].interactive,true);
  const u=new URL(f.auth[0].url),params=u.searchParams;
  assert.equal(u.origin,'https://login.microsoftonline.com');
  assert.equal(params.get('client_id'),'a8e034a8-6462-4022-b3f3-a79ffb6b1b84');
  assert.equal(params.get('redirect_uri'),REDIRECT);assert.equal(params.get('response_type'),'code');
  assert.equal(params.get('code_challenge_method'),'S256');
  assert.ok(params.get('state').length>=32);
  assert.equal(params.get('scope'),'Files.ReadWrite User.Read offline_access');
  const exchange=f.calls.find(c=>c.url===TOKEN),body=new URLSearchParams(exchange.init.body);
  const bytes=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(body.get('code_verifier')));
  const challenge=btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  assert.equal(params.get('code_challenge'),challenge);
  assert.equal(body.get('code'),'test-code');
  assert.equal(body.get('grant_type'),'authorization_code');
  assert.equal(exchange.init.headers['Content-Type'],'application/x-www-form-urlencoded');
  assert.equal(f.calls.length,3);
  assert.ok(f.calls.every(c=>c.url===TOKEN||c.url.startsWith('https://graph.microsoft.com/v1.0/')));
  assert.ok(f.calls.every(c=>c.init.method!=='PUT'&&c.init.method!=='PATCH'));
  assert.equal(JSON.stringify(result).includes('test-access'),false);
  assert.equal(JSON.stringify(result).includes('test-identity'),false);
});
test('mismatched state and callback are rejected before token exchange',async()=>{
  for(const callback of [
    ()=>REDIRECT+'?code=x&state=wrong',
    state=>'https://attacker.invalid/onedrive?code=x&state='+state,
    state=>REDIRECT+'?code=a&code=b&state='+state,
    state=>REDIRECT+'?code=a&state='+state+'&state='+state
  ]){
    const f=fixture({callback}),result=await f.diagnostic.run();
    assert.equal(result.ok,false);assert.equal(f.calls.length,0);
  }
});
test('Microsoft SPA exchange rejection exposes only sanitized HTTP and AADSTS code',async()=>{
  const f=fixture({tokenStatus:400}),result=await f.diagnostic.run();
  assert.equal(result.code,'ONEDRIVE_TOKEN_REJECTED');
  assert.equal(result.httpStatus,400);assert.equal(result.aadsts,'AADSTS9002327');
  assert.equal(f.calls.length,1);
  assert.equal(JSON.stringify(result).includes('synthetic sensitive'),false);
});
test('valid OAuth token does not imply a readable or writable OneDrive root',async()=>{
  const f=fixture({rootStatus:403}),result=await f.diagnostic.run();
  assert.equal(result.code,'ONEDRIVE_GRAPH_ROOT_REJECTED');
  assert.equal(result.httpStatus,403);assert.equal(result.ok,false);
});
test('authentication popup cancellation is not misreported as token failure',async()=>{
  const f=fixture({authError:true}),result=await f.diagnostic.run();
  assert.equal(result.code,'ONEDRIVE_AUTH_WINDOW_FAILED');assert.equal(f.calls.length,0);
});
test('OAuth diagnostic never modifies manifest/V3/native menu or uses permanent credentials',()=>{
  assert.doesNotMatch(source,/chrome\.storage\.(?:local|sync)\.set\(/);
  assert.doesNotMatch(source,/contextMenus|\.downloads\.|\.tabs\.create|createUploadSession/);
  assert.doesNotMatch(source,/client_secret|Authorization:\s*'Basic/);
  assert.ok(readFileSync('extension/background.js','utf8').includes('importScripts("onedrive-oauth-diagnostic.js")'));
});
