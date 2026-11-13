// Simulated Chrome/HTTP boundary, REAL Shelf scripts -> provider handler -> auth owner.
// No installed extension, real consent, or remote-save acceptance is claimed.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
const ID='mkadkgpekmkknfbniacdlmgikihjjepf';
const read=f=>readFileSync('extension/'+f,'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const providers=[
  {key:'google',name:'Google Drive',ui:'shelf-google-drive.js',button:'shelf-google-drive',command:'googleDriveOpen',state:'googleDriveState',url:'https://drive.google.com/drive/u/0/my-drive'},
  {key:'dropbox',name:'Dropbox',ui:'shelf-dropbox.js',button:'shelf-dropbox',command:'dropboxConnect',state:'dropbox:state',url:'https://www.dropbox.com/home'},
  {key:'onedrive',name:'OneDrive',ui:'shelf-onedrive.js',button:'shelf-onedrive',command:'onedriveConnect',state:'onedrive:state',url:'https://onedrive.live.com/'}
];
async function fixture(p,{mode='success',driveType='personal',phase='connected'}={}){
  const connected={phase,accountId:p.key==='dropbox'?'dbid:person':'person',rootReady:true,checkedAt:Date.now(),driveType,driveId:'drive',rootId:'root',namespace:'123',destination:'root'};
  const protectedData={destinations:{custom:'unchanged'},googleDriveJobs:[{status:'uncertain'}],'dropbox:jobs':[{status:'uncertain'}],'onedrive:jobs':[{status:'uncertain'}],transferHistory:[{id:'old'}],providerSaveReceipts:['old'],transferCounter:{google:7},redownDailyVerified:{old:2},cfOAuth:{credential:'fixture'},flightRecorder:{pinned:'preserved'},capless:{archive:'preserved'}};
  for(const other of ['dropbox','onedrive'])if(other!==p.key)protectedData[other+':auth']={refreshToken:'untouched-fixture',accountId:'original-'+other};
  const data=structuredClone({...protectedData,...(p.key==='google'?{}:{[p.key+':auth']:{refreshToken:'existing-fixture',accountId:connected.accountId}}),[p.state]:connected}),session={},writes=[],messages=[],tabs=[],requests=[],identities=[],timers=[];
  const storage=s=>({get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,s[k]])),set:async v=>{writes.push(Object.keys(v));Object.assign(s,v);},remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete s[k];},setAccessLevel:async()=>{}});
  let release;
  const gate=new Promise(r=>release=r);
  const chrome={runtime:{id:ID,getURL:f=>`chrome-extension://${ID}/${f}`,getManifest:()=>JSON.parse(read('manifest.json'))},
    storage:{local:storage(data),session:storage(session),onChanged:{addListener:()=>{}}},permissions:{contains:async()=>true},
    tabs:{create:async v=>{tabs.push(v);}},identity:{
      getRedirectURL:path=>`https://${ID}.chromiumapp.org/${path}`,
      getAuthToken:async options=>{
        identities.push({method:'getAuthToken',options});assert.equal(options.interactive,true);
        if(mode==='pending')await gate;
        if(mode==='cancel')throw Error('User cancelled');
        if(mode==='revoked')throw Error('OAuth2 not granted or revoked.');
        return {token:'fixture-access',grantedScopes:['https://www.googleapis.com/auth/drive.file']};
      },
      removeCachedAuthToken:async()=>{throw Error('Unexpected token revocation');},
      launchWebAuthFlow:async options=>{
        identities.push({method:'launchWebAuthFlow',options});assert.equal(options.interactive,true);
        const url=new URL(options.url),state=url.searchParams.get('state');
        assert.equal(url.origin,p.key==='dropbox'?'https://www.dropbox.com':'https://login.microsoftonline.com');
        assert.equal(url.searchParams.get('code_challenge_method'),'S256');
        if(mode==='pending')await gate;
        if(mode==='cancel')throw Error('User cancelled');
        return url.searchParams.get('redirect_uri')+'?state='+encodeURIComponent(state)+(mode==='rejected'?'&error=access_denied':'&code=fixture-code');
      }
    }};
  const fetch=async(url,init={})=>{
    requests.push({url,method:init.method||'GET'});
    if(mode==='network')throw Error('Network offline');
    if(mode==='503')return {ok:false,status:503,json:async()=>({})};
    const response=value=>({ok:true,status:200,json:async()=>value});
    if(p.key==='google'){
      assert.equal(url,'https://www.googleapis.com/drive/v3/about?fields=user(permissionId)');
      return response({user:{permissionId:'person'}});
    }
    if(url.endsWith('/token'))return response({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,account_id:'dbid:person',scope:p.key==='dropbox'?'account_info.read files.metadata.read files.content.read files.content.write':'Files.ReadWrite User.Read offline_access'});
    if(p.key==='dropbox'){
      if(url.endsWith('/users/get_current_account'))return response({account_id:'dbid:person',root_info:{'.tag':'user',root_namespace_id:'123',home_namespace_id:'123'}});
      assert.ok(url.endsWith('/files/list_folder'));assert.equal(JSON.parse(init.body).path,'');return response({entries:[]});
    }
    if(url.endsWith('/me?$select=id'))return response({id:'person'});
    if(url.endsWith('/me/drive?$select=id,driveType'))return response({id:'drive',driveType});
    assert.ok(url.endsWith('/me/drive/root?$select=id,folder'));return response({id:'root',folder:{}});
  };
  const context=vm.createContext({chrome,fetch,crypto:webcrypto,URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,AbortSignal,AbortController,btoa,console,setTimeout,clearTimeout});
  const load=f=>vm.runInContext(read(f),context,{filename:f});
  let provider;
  if(p.key==='google'){
    load('google-drive-stream.js');load('google-drive-provider.js');provider=context.RedownGoogleDriveProvider.create({chrome});
  }else if(p.key==='dropbox'){
    load('dropbox-auth.js');load('dropbox-provider.js');provider=context.RedownDropboxProvider.create({chrome,auth:context.RedownDropboxAuth.create({chrome,fetch}),api:{}});
  }else{
    load('onedrive-auth.js');load('onedrive-provider.js');provider=context.RedownOneDriveProvider.create({chrome,auth:context.RedownOneDriveAuth.create({chrome,fetch}),api:{}});
  }
  let override;
  chrome.runtime.sendMessage=async message=>{
    messages.push(message.type);
    // Initial Shelf status checks are unrelated to the explicit gesture under test.
    if(message.type!==p.command)return {ok:true};
    if(override){if(override instanceof Error)throw override;return override;}
    return provider.message(message,{id:ID,url:chrome.runtime.getURL('shelf.html')});
  };
  const dom=new JSDOM(read('shelf.html'),{runScripts:'outside-only'}),w=dom.window;
  w.chrome=chrome;
  w.setTimeout=(fn,ms)=>{assert.equal(ms,30000);timers.push(fn);return timers.length;};w.clearTimeout=()=>{};
  w.eval(read(p.ui));await tick();
  const el=id=>w.document.getElementById(`shelf-${p.key}-${id}`);
  return {dom,chrome,data,protectedData,writes,messages,tabs,requests,identities,timers,provider,release,
    reauth:el('reauth'),login:el('login'),result:el('auth-result'),button:w.document.getElementById(p.button),
    override:v=>override=v,settle:async()=>{for(let i=0;i<200;i++){await tick();if(i>5&&(!el('reauth').disabled||mode==='pending'))break;await new Promise(r=>setTimeout(r,1));}},
    checkProtected:()=>{for(const [key,value]of Object.entries(protectedData))assert.deepEqual(data[key],value,key);}
  };
}
for(const p of providers){
  test(`SIMULATED ${p.name}: independent visible LOGIN / Re-O'Auth, GO TO, real auth owner, silent grant honesty`,async t=>{
    const f=await fixture(p);t.after(()=>f.dom.window.close());
    assert.equal(f.reauth.textContent,"Re-O'Auth");assert.equal(f.login.textContent,'LOGIN');
    assert.match(f.reauth.getAttribute('aria-label'),new RegExp(p.name));assert.equal(f.result.getAttribute('aria-live'),'polite');
    assert.equal(f.button.querySelector('.destination-word').textContent,'GO TO');
    const before=structuredClone(f.data);f.messages.length=0;
    f.login.click();f.button.click();await f.settle();
    assert.deepEqual(f.tabs.map(x=>x.url),[p.url,p.url]);assert.deepEqual(f.messages,[]);assert.deepEqual(f.data,before);assert.equal(f.identities.length,0);assert.equal(f.requests.length,0);assert.match(f.result.textContent,/Website opened.*OAuth unchanged/);
    f.tabs.length=0;f.reauth.click();f.reauth.click();assert.equal(f.reauth.disabled,true);assert.match(f.result.textContent,/Connecting/);await f.settle();
    assert.deepEqual(f.messages,[p.command]);assert.equal(f.identities.length,1);assert.ok(f.requests.length>0);assert.deepEqual(f.tabs,[]);
    assert.match(f.result.textContent,/OAuth verified.*may have been reused.*no new dialog or grant/);assert.doesNotMatch(f.result.textContent,/refreshed|popup opened/i);
    assert.equal(f.reauth.disabled,false);assert.equal(f.reauth.hasAttribute('aria-busy'),false);f.checkProtected();
    assert.equal(f.data[p.state].accountId,before[p.state].accountId);
    if(p.key==='dropbox')assert.equal(f.data[p.state].namespace,before[p.state].namespace);
    if(p.key==='onedrive'){assert.equal(f.data[p.state].driveId,before[p.state].driveId);assert.equal(f.data[p.state].rootId,before[p.state].rootId);}
    // New explicit gesture may reauthorize again after completion; no automatic loops.
    f.reauth.click();await f.settle();assert.equal(f.messages.length,2);assert.equal(f.identities.length,2);f.checkProtected();
  });
  for(const mode of ['cancel','rejected','network','503'])test(`SIMULATED ${p.name}: ${mode} restores control without fabricated success`,async t=>{
    // Google rejects the granted token through its existing identity owner.
    const f=await fixture(p,{mode:p.key==='google'&&mode==='rejected'?'revoked':mode});t.after(()=>f.dom.window.close());
    f.reauth.click();await f.settle();assert.equal(f.reauth.disabled,false);
    assert.doesNotMatch(f.result.textContent,/OAuth verified|Authorization refreshed|Saved/);
    assert.match(f.result.textContent,mode==='network'||mode==='503'?/network unavailable/:/failed|cancelled|Consent/i);
    assert.equal(f.tabs.length,0);f.checkProtected();
  });
  test(`SIMULATED ${p.name}: timeout retains single in-flight owner; late reply and transport rejection restore controls`,async t=>{
    const f=await fixture(p,{mode:'pending'});t.after(()=>f.dom.window.close());f.messages.length=0;
    f.reauth.click();await f.settle();assert.equal(f.identities.length,1);assert.equal(f.reauth.disabled,true);
    f.timers[0]();assert.equal(f.reauth.disabled,false);assert.match(f.result.textContent,/timed out.*no grant confirmed/);
    f.reauth.click();await f.settle();assert.deepEqual(f.messages,[p.command]);assert.equal(f.identities.length,1);
    // Navigation remains usable even while OAuth is pending.
    f.login.click();f.button.click();await f.settle();assert.equal(f.tabs.length,2);
    f.release();await f.settle();assert.equal(f.reauth.disabled,false);assert.match(f.result.textContent,/OAuth verified/);
    f.override(Error('worker connection lost'));f.reauth.click();await f.settle();assert.equal(f.reauth.disabled,false);assert.match(f.result.textContent,/reply unavailable.*No new grant/);f.checkProtected();
  });
  test(`SIMULATED ${p.name}: website failure and missing permission are explicit and retryable`,async t=>{
    const f=await fixture(p);t.after(()=>f.dom.window.close());f.messages.length=0;
    f.chrome.tabs.create=async()=>{throw Error('No tab');};f.login.click();await f.settle();
    assert.match(f.result.textContent,/Website could not open/);assert.deepEqual(f.messages,[]);
    f.override({ok:false,code:'HOST_PERMISSION_REQUIRED',error:'Allow host access'});f.reauth.click();await f.settle();
    assert.match(f.result.textContent,/permission required.*Chrome/);assert.equal(f.reauth.disabled,false);f.checkProtected();
  });
  test(`SIMULATED ${p.name}: stale connecting, disconnected, reconnect never swap website LOGIN for OAuth`,async()=>{
    for(const phase of ['connecting','disconnected','reconnect']){
      const f=await fixture(p,{phase});try{
        f.messages.length=0;assert.equal(f.button.disabled,false);assert.equal(f.reauth.disabled,false);
        f.login.click();f.button.click();await f.settle();assert.deepEqual(f.tabs.map(x=>x.url),[p.url,p.url]);assert.deepEqual(f.messages,[]);assert.equal(f.identities.length,0);f.checkProtected();
      }finally{f.dom.window.close();}
    }
  });
  test(`SIMULATED ${p.name}: bare ok is not authorization; untrusted sender cannot reach OAuth`,async t=>{
    const f=await fixture(p);t.after(()=>f.dom.window.close());f.override({ok:true});f.reauth.click();await f.settle();assert.match(f.result.textContent,/authorization was not confirmed/);assert.equal(f.identities.length,0);
    const r=await f.provider.message({type:p.command},{id:ID,url:f.chrome.runtime.getURL('options.html')});assert.equal(r.ok,false);assert.equal(f.identities.length,0);
  });
}
test('SIMULATED Google persisted connected + OAuth2 revoked still reaches interactive googleDriveOpen; GO TO stays available',async t=>{
  const p=providers[0],f=await fixture(p,{mode:'revoked'});t.after(()=>f.dom.window.close());
  assert.equal(f.button.querySelector('.destination-word').textContent,'GO TO');f.reauth.click();await f.settle();assert.equal(f.identities[0].options.interactive,true);assert.ok(f.messages.includes('googleDriveOpen'));assert.match(f.result.textContent,/Consent\/sign-in required/);f.button.click();await f.settle();assert.equal(f.tabs[0].url,p.url);assert.equal(f.reauth.disabled,false);
});
for(const driveType of ['business','documentLibrary'])test(`SIMULATED OneDrive ${driveType}: LOGIN and GO TO preserve business website route`,async t=>{
  const f=await fixture(providers[2],{driveType});t.after(()=>f.dom.window.close());f.messages.length=0;f.login.click();f.button.click();await f.settle();assert.deepEqual(f.tabs.map(x=>x.url),['https://www.office.com/launch/onedrive','https://www.office.com/launch/onedrive']);assert.deepEqual(f.messages,[]);
});
test('scope guard: all extension changes stay inside the named button/UI/OAuth-reply allowlist',()=>{
  const allowed=new Set(['shelf.html','shelf.css','shelf-google-drive.js','shelf-dropbox.js','shelf-onedrive.js','google-drive-provider.js','dropbox-provider.js','onedrive-provider.js','dropbox-auth.js'].map(x=>'extension/'+x));
  const changed=execFileSync('git',['diff','--name-only','4b59b58389aca815bb5a5eaaee66433244f3cc63','--','extension/'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  for(const path of changed)assert.ok(allowed.has(path),path);
});
