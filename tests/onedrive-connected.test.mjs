import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
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
    TextDecoder,Uint8Array,AbortSignal,AbortController,Date,console,btoa,setTimeout,clearTimeout});
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
  for(const source of ['https://localhost/a','https://127.0.0.1/a',
    'https://192.168.1.4/a','https://metadata.internal/a','https://[::1]/a'])
    assert.throws(()=>api.sourceURL(source));
  assert.equal(api.sourceURL('http://example.com/file.jpg').protocol,'http:');
  assert.equal(api.sourceURL('https://cdn.example.com:8443/file.jpg').port,'8443');
  assert.equal(api.sourceSnapshot({linkUrl:'http://cdn.example.org/file.txt?secret=1'}).sourceUrl,
    'http://cdn.example.org/file.txt');
  assert.equal(api.fileName('a/../evil?.jpg'),'a_.._evil_.jpg');
  assert.equal(api.sourceSnapshot({srcUrl:'https://cdn.example.org/picture.png?token=secret'}).sourceUrl,
    'https://cdn.example.org/picture.png');
});
test('extensionless OneDrive files recover safe names from response headers and first streamed bytes',async()=>{
  const f=fixture();load(f.context,'onedrive-api.js');
  const resolver=f.context.RedownOneDriveAPI.uploadFileName;
  const headers=fields=>({get:k=>fields[k.toLowerCase()]||null});
  const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
  const zip=new Uint8Array([80,75,3,4,0,0,0,0]);
  assert.equal(resolver('images 2',headers({'content-type':'application/octet-stream'}),png),'images 2.png');
  assert.equal(resolver('images 2',headers({'content-type':'image/jpeg'}),new Uint8Array([1,2,3])),'images 2.jpg');
  assert.equal(resolver('download',headers({'content-disposition':"attachment; filename*=UTF-8''caf%C3%A9.png",
    'content-type':'application/octet-stream'}),png),'café.png');
  assert.equal(resolver('archive',headers({'content-type':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),zip),'archive.docx');
  assert.equal(resolver('unknown',headers({}),new Uint8Array([1,2,3])),'unknown.bin');
  assert.equal(resolver('original.gif',headers({'content-type':'image/png'}),png),'original.gif');
  assert.equal(resolver('download',headers({'content-disposition':'attachment; filename="../unsafe?.png"'}),png),
    '.._unsafe_.png');

  const url='https://cdn.example.org/images%202',uploadUrl='https://sn3302.up.1drv.com/up/fixture';
  let savedName='',bytesSent=0;
  const fetch=async(target,init={})=>{
    if(target===url)return {ok:true,status:200,
      headers:headers({'content-length':String(png.length),'content-type':'application/octet-stream'}),
      body:new ReadableStream({start(c){for(let i=0;i<png.length;i+=2)c.enqueue(png.subarray(i,i+2));c.close();}})};
    if(target.endsWith('/createUploadSession')){
      savedName=JSON.parse(init.body).item.name;
      assert.ok(target.includes(encodeURIComponent(savedName)));
      return {ok:true,status:200,json:async()=>({uploadUrl})};
    }
    if(target===uploadUrl){
      bytesSent+=init.body.length;
      assert.deepEqual(Array.from(init.body),Array.from(png));
      return {ok:true,status:201,json:async()=>({id:'image-item'})};
    }
    if(target.includes('/me/drive/items/image-item?'))
      return {ok:true,status:200,json:async()=>({id:'image-item',name:savedName,size:png.length,
        parentReference:{id:'root',driveId:'drive'},file:{}})};
    throw Error('Unexpected fetch '+target);
  };
  const c=vm.createContext({chrome:f.chrome,fetch,URL,URLSearchParams,TextEncoder,
    Uint8Array,ReadableStream,AbortSignal,AbortController,Date,console,setTimeout,clearTimeout});
  load(c,'onedrive-api.js');
  const source=c.RedownOneDriveAPI.sourceSnapshot({srcUrl:url});
  const receipt=await c.RedownOneDriveAPI.create().upload(source,{
    token:'access',driveId:'drive',rootId:'root',connectionId:'fixture-connection'});
  assert.equal(savedName,'images 2.png');
  assert.equal(receipt.name,'images 2.png');
  assert.equal(receipt.bytes,png.length);
  assert.equal(bytesSent,png.length);
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
    Uint8Array,AbortSignal,AbortController,Date,ReadableStream,console,setTimeout,clearTimeout});
  load(context,'onedrive-api.js');
  const api=context.RedownOneDriveAPI.create();
  const checkpoints=[];
  const item=await api.upload({url:source,name:'image.png'},
    {token:'access',driveId:'drive',rootId:'root'},p=>{checkpoints.push({...p});});
  assert.equal(item.name,'image (1).png');assert.equal(item.bytes,size);
  assert.equal(created.length,1);assert.ok(created[0].url.includes('/items/root:'));assert.ok(created[0].url.endsWith(':/createUploadSession'));
  const requestBody=JSON.parse(created[0].init.body);
  assert.equal(requestBody.item['@microsoft.graph.conflictBehavior'],'rename');
  assert.equal(uploads.length,2);
  assert.equal(uploads[0].init.body.length%(320*1024),0);
  assert.equal(uploads[0].init.headers['Content-Range'],`bytes 0-${uploads[0].init.body.length-1}/${size}`);
  assert.equal(uploads[1].init.headers['Content-Range'],`bytes ${uploads[0].init.body.length}-${size-1}/${size}`);
  assert.ok(uploads.every(x=>!('Authorization' in x.init.headers)));
  assert.equal(proof.length,1);assert.equal(checkpoints.at(-1).phase,'verifying');
});
test('truncated source never sends a final upload chunk or claims success',async()=>{
  const f=fixture(),uploads=[];
  const fetch=async(url)=>{
    if(url==='https://cdn.example.org/a')
      return {status:200,ok:true,headers:{get:k=>k==='content-length'?'99':null},
        body:new ReadableStream({start(c){c.enqueue(new Uint8Array(2));c.close();}})};
    if(url.endsWith('/createUploadSession'))
      return {status:200,ok:true,json:async()=>({uploadUrl:'https://sn3302.up.1drv.com/up/test'})};
    uploads.push(url);
    throw Error('No chunk should be sent');
  };
  const context=vm.createContext({chrome:f.chrome,fetch,URL,URLSearchParams,TextEncoder,
    Uint8Array,ReadableStream,AbortSignal,AbortController,Date,setTimeout,clearTimeout,console});
  load(context,'onedrive-api.js');
  const api=context.RedownOneDriveAPI.create();
  await assert.rejects(api.upload({url:'https://cdn.example.org/a',name:'a'},{
    token:'token',driveId:'drive',rootId:'root'}),e=>e.code==='ONEDRIVE_SOURCE_TRUNCATED');
  assert.equal(uploads.length,0);
});


test('Graph upload host uses one-time site grant, never a per-host confirmation or source URL',async()=>{
  const f=fixture();
  const source='https://cdn.example.org/file.bin?private=source-query';
  const opaque='https://edge-upload.public-cloud.net/new/session?uploadToken=SECRET';
  const chunks=[];
  const transfer=async(url,init={})=>{
    if(url===source)return {ok:true,status:200,
      headers:{get:key=>key==='content-length'?'3':null},
      body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array([7,8,9]));controller.close();}})};
    if(url.endsWith('/createUploadSession'))return {ok:true,status:200,
      json:async()=>({uploadUrl:opaque})};
    if(url===opaque){chunks.push(init);return {ok:true,status:201,json:async()=>({id:'uploaded-item'})};}
    if(url.includes('me/drive/items/uploaded-item?'))return {ok:true,status:200,
      json:async()=>({id:'uploaded-item',name:'file.bin',size:3,
        parentReference:{id:'root',driveId:'drive'},webUrl:'https://onedrive.live.com/?id=uploaded-item',file:{}})};
    throw Error('Unexpected URL '+url);
  };
  const context=vm.createContext({chrome:f.chrome,fetch:transfer,URL,URLSearchParams,
    TextEncoder,Uint8Array,ReadableStream,AbortSignal,AbortController,Date,setTimeout,clearTimeout,console});
  load(context,'onedrive-api.js');
  const api=context.RedownOneDriveAPI.create();
  const identity={token:'synthetic-graph-token',driveId:'drive',rootId:'root',connectionId:'account-1'};
  f.chrome.permissions.contains=async()=>false;
  const denied=await api.upload({kind:'url',url:source,name:'file.bin'},identity).catch(e=>e);
  assert.equal(denied.code,'ONEDRIVE_SITE_PERMISSION_REQUIRED');
  assert.equal(chunks.length,0);
  f.chrome.permissions.contains=async()=>true;
  const receipt=await api.upload({kind:'url',url:source,name:'file.bin'},identity);
  assert.equal(receipt.itemId,'uploaded-item');
  assert.equal(chunks.length,1);
  assert.equal(chunks[0].headers.Authorization,undefined);
  assert.equal(chunks[0].referrerPolicy,'no-referrer');
  assert.equal(JSON.stringify(chunks[0]).includes(source),false);
  assert.equal(JSON.stringify(chunks[0]).includes('synthetic-graph-token'),false);
});
test('source link provenance stays in REDOWN; Graph gets filename and bytes only',async()=>{
  const f=fixture();
  const snapSource='http://cdn.example.org/picture.png?sourceTracking=PRIVATE';
  load(f.context,'onedrive-api.js');
  const snap=f.context.RedownOneDriveAPI.sourceSnapshot({
    srcUrl:snapSource,pageUrl:'https://origin.example.org/private-page?secret=yes',
    frameUrl:'https://frame.example.org/view?password=no'
  });
  assert.equal(snap.url,snapSource); // Private to REDOWN's worker.
  assert.equal(snap.sourceUrl,'http://cdn.example.org/picture.png');
  assert.equal(snap.pageUrl,'https://origin.example.org/private-page');
  assert.equal(snap.frameUrl,'https://frame.example.org/view');
  const all=[];
  const fetch=async(url,init={})=>{
    all.push({url,init});
    if(url===snapSource)return {status:200,ok:true,headers:{get:k=>k==='content-length'?'2':null},
      body:new ReadableStream({start(c){c.enqueue(new Uint8Array([3,4]));c.close();}})};
    if(url.endsWith('/createUploadSession'))return {status:200,ok:true,
      json:async()=>({uploadUrl:'https://sn3302.up.1drv.com/up/SIGNED-TOKEN'})};
    if(url==='https://sn3302.up.1drv.com/up/SIGNED-TOKEN')
      return {status:201,ok:true,json:async()=>({id:'item'})};
    if(url.includes('me/drive/items/item?'))return {status:200,ok:true,json:async()=>({
      id:'item',name:'picture.png',size:2,parentReference:{id:'root',driveId:'drive'},file:{}})};
    throw Error('Unexpected URL');
  };
  const context=vm.createContext({chrome:f.chrome,fetch,URL,URLSearchParams,TextEncoder,Uint8Array,
    ReadableStream,AbortSignal,AbortController,Date,console,setTimeout,clearTimeout});
  load(context,'onedrive-api.js');
  const item=await context.RedownOneDriveAPI.create().upload(snap,{
    token:'test',driveId:'drive',rootId:'root',connectionId:'conn'});
  assert.equal(item.bytes,2);
  const outgoing=all.filter(x=>x.url!==snapSource);
  assert.ok(outgoing.every(x=>!JSON.stringify(x).includes('cdn.example.org')));
  assert.ok(outgoing.every(x=>!JSON.stringify(x).includes('origin.example.org')));
  assert.ok(outgoing.every(x=>!JSON.stringify(x).includes('frame.example.org')));
  assert.ok(outgoing.every(x=>x.init.referrerPolicy==='no-referrer'));
});
test('inline data sources are decoded within Chrome and never serialized as origin or Graph metadata',async()=>{
  const f=fixture();load(f.context,'onedrive-api.js');
  const uri='data:text/plain;base64,SGVsbG8gUkVET1dO';
  const snap=f.context.RedownOneDriveAPI.sourceSnapshot({
    srcUrl:uri,pageUrl:'https://example.org/inline?source=private'});
  assert.equal(snap.kind,'inline-data');
  assert.equal(snap.name,'inline.txt');
  assert.equal(snap.sourceUrl,'');
  assert.equal(snap.srcUrl,'');
  assert.equal(snap.pageUrl,'https://example.org/inline');
  const calls=[];
  const fetch=async(url,init={})=>{
    calls.push({url,init});
    if(url===uri)return new Response(new TextEncoder().encode('Hello REDOWN'));
    if(url.endsWith('/createUploadSession'))return {status:200,ok:true,
      json:async()=>({uploadUrl:'https://sn3302.up.1drv.com/up/inline'})};
    if(url==='https://sn3302.up.1drv.com/up/inline')return {status:201,ok:true,
      json:async()=>({id:'inline-item'})};
    if(url.includes('me/drive/items/inline-item?'))return {status:200,ok:true,
      json:async()=>({id:'inline-item',name:'inline.txt',size:12,
        parentReference:{id:'root',driveId:'drive'},file:{}})};
    throw Error('Unexpected URL '+url);
  };
  const c=vm.createContext({chrome:f.chrome,fetch,URL,URLSearchParams,Response,TextEncoder,
    Uint8Array,ReadableStream,AbortSignal,AbortController,Date,console,setTimeout,clearTimeout});
  load(c,'onedrive-api.js');
  const receipt=await c.RedownOneDriveAPI.create().upload(snap,{
    token:'graph',driveId:'drive',rootId:'root',connectionId:'conn'});
  assert.equal(receipt.bytes,12);
  assert.ok(calls.filter(x=>x.url!==uri).every(x=>!JSON.stringify(x).includes('data:')));
});
test('Graph destination URL rejects private, insecure and credential-bearing addresses without exposing tokens',()=>{
  const f=fixture();load(f.context,'onedrive-api.js');
  const api=f.context.RedownOneDriveAPI;
  for(const value of ['http://upload.example.org/file','https://127.0.0.1/up',
    'https://localhost/up','https://host.invalid/up','https://user:password@valid-domain.net/up',
    'https://valid-domain.net/up#fragment','https://[::1]/up']){
    assert.throws(()=>api.validUploadURL(value));
  }
  assert.equal(api.validUploadURL('https://new-graph-origin.public-cloud.net/up?token=private').hostname,
    'new-graph-origin.public-cloud.net');
});


test('Shelf grants only an exact upload origin and never persists opaque session tokens',async()=>{
  const dom=new JSDOM('<button id="shelf-onedrive"></button>'+
    '<small id="shelf-onedrive-status"></small>'+
    '<a id="shelf-onedrive-open" hidden></a>'+
    '<button id="shelf-onedrive-disconnect" hidden></button>'+
    '<button id="shelf-onedrive-cancel" hidden></button>'+
    '<button id="shelf-onedrive-allow-upload-host" hidden></button>'+
    '<button id="shelf-onedrive-diagnostic"></button>',{runScripts:'outside-only'});
  const local={
    'onedrive:state':{phase:'connected',rootReady:true,connectionId:'connection-1'},
    'onedrive:transfer':{status:'blocked',code:'ONEDRIVE_UPLOAD_HOST_PERMISSION',
      uploadOrigin:'https://new-graph-origin.public-cloud.net',
      error:'Approve this destination in Shelf.'}
  },listeners=[],requests=[];
  const chrome={
    runtime:{sendMessage:async()=>({ok:true})},
    permissions:{request:async detail=>{requests.push(detail);return true;}},
    storage:{local:{
      get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,local[k]])),
      set:async changes=>{
        const previous=Object.fromEntries(Object.keys(changes).map(k=>[k,{newValue:changes[k],oldValue:local[k]}]));
        Object.assign(local,changes);
        for(const listener of listeners)listener(previous,'local');
      }
    },onChanged:{addListener:fn=>listeners.push(fn)}}
  };
  dom.window.chrome=chrome;
  dom.window.eval(readFileSync('extension/shelf-onedrive.js','utf8'));
  await new Promise(r=>setImmediate(r));
  const button=dom.window.document.getElementById('shelf-onedrive-allow-upload-host');
  assert.equal(button.hidden,false);
  assert.match(button.textContent,/new-graph-origin.public-cloud.net/);
  button.click();
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(JSON.parse(JSON.stringify(requests)),[{origins:['https://new-graph-origin.public-cloud.net/*']}]);
  assert.equal(local['onedrive:trustedUploadOrigins'].connectionId,'connection-1');
  assert.deepEqual(JSON.parse(JSON.stringify(local['onedrive:trustedUploadOrigins'].origins)),['https://new-graph-origin.public-cloud.net']);
  assert.equal(local['onedrive:transfer'].code,'ONEDRIVE_UPLOAD_HOST_READY');
  assert.equal(JSON.stringify(local).includes('uploadToken'),false);
  assert.equal(button.hidden,true);
  dom.window.close();
});
