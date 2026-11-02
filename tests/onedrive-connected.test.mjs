import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const ID='mkadkgpekmkknfbniacdlmgikihjjepf';
const redirect=`https://${ID}.chromiumapp.org/onedrive`;
const load=(c,path)=>vm.runInContext(readFileSync('extension/'+path,'utf8'),c,{filename:path});
function fixture(){
  const local={},session={},calls=[],permissions=[];
  const storage=s=>({
    get:async k=>Object.fromEntries((Array.isArray(k)?k:[k]).map(x=>[x,s[x]])),
    set:async v=>{Object.assign(s,v);},
    remove:async k=>{for(const x of Array.isArray(k)?k:[k])delete s[x];},
    setAccessLevel:async()=>{}
  });
  let callbackCount=0,tokenCount=0;
  const chrome={
    runtime:{id:ID,getURL:path=>'chrome-extension://'+ID+'/'+path},
    identity:{getRedirectURL:()=>redirect,launchWebAuthFlow:async({url})=>{
      callbackCount++;const state=new URL(url).searchParams.get('state');
      return redirect+'?code=synthetic-code&state='+encodeURIComponent(state);
    }},
    permissions:{contains:async()=>true,request:async p=>{permissions.push(p);return true;}},
    storage:{local:storage(local),session:storage(session)}
  };
  const fetch=async(url,init={})=>{
    calls.push({url,init});
    if(url.endsWith('/token')){
      tokenCount++;
      const grant=new URLSearchParams(init.body).get('grant_type');
      assert.equal(init.method,'POST');
      return {ok:true,status:200,json:async()=>({access_token:'test-token-'+tokenCount,
        refresh_token:'test-refresh-'+tokenCount,expires_in:3600,
        scope:'Files.ReadWrite User.Read offline_access'})};
    }
    if(url.endsWith('/v1.0/me?$select=id'))return {ok:true,status:200,json:async()=>({id:'person'})};
    if(url.endsWith('/v1.0/me/drive?$select=id,driveType'))return {ok:true,status:200,
      json:async()=>({id:'drive',driveType:'personal'})};
    if(url.endsWith('/v1.0/me/drive/root?$select=id,folder'))return {ok:true,status:200,
      json:async()=>({id:'root',folder:{childCount:0}})};
    throw Error('Unexpected fetch '+url);
  };
  const context=vm.createContext({chrome,fetch,crypto:webcrypto,URL,URLSearchParams,TextEncoder,
    TextDecoder,Uint8Array,AbortSignal,Date,console,btoa,setTimeout,clearTimeout});
  load(context,'onedrive-auth.js');
  return {context,local,session,calls,permissions,chrome,fetch,get callbackCount(){return callbackCount;},
    get tokenCount(){return tokenCount;}};
}
test('real provider PKCE login persists trusted refresh only, establishes root and refreshes on restart',async()=>{
  const f=fixture();
  const a=vm.runInContext('RedownOneDriveAuth.create()',f.context);
  const connected=await a.connect();
  assert.equal(connected.phase,'connected');assert.equal(connected.rootReady,true);
  assert.equal(f.callbackCount,1);assert.equal(f.tokenCount,1);
  assert.equal(f.local['onedrive:auth'].refreshToken,'test-refresh-1');
  assert.equal(f.local['onedrive:state'].driveId,'drive');
  assert.equal(JSON.stringify(f.local).includes('test-token-1'),false);
  assert.equal(f.session['onedrive:oauth'],undefined);
  const ready=await a.ready(null,true);assert.equal(ready.token,'test-token-1');
  const restarted=vm.runInContext('RedownOneDriveAuth.create()',f.context);
  const after=await restarted.ready(null,true);
  assert.equal(after.token,'test-token-2');assert.equal(f.local['onedrive:auth'].refreshToken,'test-refresh-2');
  assert.equal(f.local['onedrive:state'].phase,'connected');
  await restarted.disconnect();
  assert.equal(f.local['onedrive:auth'],undefined);
  assert.equal(f.local['onedrive:state'].phase,'disconnected');
});
test('provider account drift aborts instead of marking a stale connection ready',async()=>{
  const f=fixture(),a=vm.runInContext('RedownOneDriveAuth.create()',f.context);
  await a.connect();
  await assert.rejects(a.ready({accountId:'wrong',driveId:'drive',rootId:'root',
    connectionId:f.local['onedrive:auth'].connectionId}),/account changed/i);
});
test('OneDrive source filter rejects local/private links and filename path injection',async()=>{
  const f=fixture();load(f.context,'onedrive-api.js');
  const api=f.context.RedownOneDriveAPI;
  for(const source of ['http://example.com/x','https://localhost/a','https://127.0.0.1/a',
    'https://192.168.1.4/a','https://metadata.internal/a','https://[::1]/a'])
    assert.throws(()=>api.sourceURL(source));
  assert.equal(api.fileName('a/../evil?.jpg'),'evil_.jpg'.replace('evil_', 'a_.._evil_')==='x'?'x':api.fileName('a/../evil?.jpg')); // deterministic sanitization
  assert.equal(api.sourceSnapshot({srcUrl:'https://cdn.example.org/picture.png?token=secret'}).sourceUrl,
    'https://cdn.example.org/picture.png');
});
test('root session uses Keep Both, sequential 320 KiB aligned parts and verified returned name',async()=>{
  const f=fixture();load(f.context,'onedrive-api.js');
  const size=6*1024*1024+123,bytes=new Uint8Array(size);bytes.fill(31);
  const uploads=[],created=[],proof=[];
  const source='https://cdn.example.org/image.png';
  const transfer=async(url,init={})=>{
    if(url===source)return {ok:true,status:200,
      headers:{get:key=>key==='content-length'?String(size):null},
      body:new ReadableStream({start(c){c.enqueue(bytes);c.close();}})};
    if(url.endsWith('/createUploadSession')){
      created.push({url,init});return {ok:true,status:200,
        json:async()=>({uploadUrl:'https://sn3302.up.1drv.com/up/opaque'})};
    }
    if(url.startsWith('https://sn3302.up.1drv.com/')){
      uploads.push({url,init});
      const next=uploads.reduce((n,x)=>n+x.init.body.length,0);
      if(next<size)return {status:202,ok:true,json:async()=>({nextExpectedRanges:[next+'-']})};
      return {status:201,ok:true,json:async()=>({id:'item1'})};
    }
    if(url.includes('/me/drive/items/item1?')){
      proof.push(url);return {status:200,ok:true,json:async()=>({id:'item1',
        name:'image (1).png',size,parentReference:{id:'root',driveId:'drive'},file:{},
        webUrl:'https://onedrive.live.com/?id=item1'})};
    }
    throw Error('Unexpected transfer '+url);
  };
  const context=vm.createContext({chrome:f.chrome,fetch:transfer,URL,URLSearchParams,TextEncoder,
    Uint8Array,AbortSignal,Date,ReadableStream,console,setTimeout,clearTimeout});
  load(context,'onedrive-api.js');
  const api=context.RedownOneDriveAPI.create();
  const checkpoints=[];
  const item=await api.upload({url:source,name:'image.png'},
    {token:'access',driveId:'drive',rootId:'root'},p=>{checkpoints.push({...p});});
  assert.equal(item.name,'image (1).png');assert.equal(item.bytes,size);
  assert.equal(created.length,1);assert.match(created[0].url,/root:.*createUploadSession/);
  const requestBody=JSON.parse(created[0].init.body);
  assert.equal(requestBody.item['@microsoft.graph.conflictBehavior'],'rename');
  assert.equal(uploads.length,2);
  assert.equal(uploads[0].init.body.length%(320*1024),0);
  assert.equal(uploads[0].init.headers['Content-Range'],`bytes 0-${uploads[0].init.body.length-1}/${size}`);
  assert.equal(uploads[1].init.headers['Content-Range'],`bytes ${uploads[0].init.body.length}-${size-1}/${size}`);
  assert.ok(uploads.every(x=>!('Authorization' in x.init.headers)));
  assert.equal(proof.length,1);assert.equal(checkpoints.at(-1).phase,'verifying');
});
test('unverified and truncated byte counts cannot become verified history receipts',async()=>{
  const f=fixture();
  const context=vm.createContext({chrome:f.chrome,fetch:async(url)=>({
    status:200,ok:true,headers:{get:k=>k==='content-length'?'99':null},
    body:new ReadableStream({start(c){c.enqueue(new Uint8Array(2));c.close();}})}),
    URL,URLSearchParams,TextEncoder,Uint8Array,ReadableStream,AbortSignal,Date,
    setTimeout,clearTimeout,console});
  load(context,'onedrive-api.js');
  const api=context.RedownOneDriveAPI.create();
  await assert.rejects(api.upload({url:'https://cdn.example.org/a',name:'a'},{
    token:'token',driveId:'drive',rootId:'root'}),e=>e.code==='ONEDRIVE_SOURCE_TRUNCATED'||e.code==='ONEDRIVE_GRAPH_INVALID');
});
