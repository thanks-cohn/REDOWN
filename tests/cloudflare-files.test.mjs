import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../extension/cloudflare-api.js',import.meta.url),'utf8');
const settings=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
function harness(fetchImpl=async()=>new Response('image')) {
  const local={cloudflareAuth:{accessToken:'token',refreshToken:'refresh',expiresAt:Date.now()+3600000}};
  const calls=[]; let queue=Promise.resolve();
  const context=vm.createContext({Headers,FormData,AbortSignal,URL,URLSearchParams,Blob,Date,
    navigator:{locks:{request(_name,fn){const result=queue.catch(()=>{}).then(fn);queue=result;return result;}}},
    chrome:{storage:{local:{async get(){return local;},async set(data){Object.assign(local,data);}}},downloads:{async download(options){calls.push(options);return 123;}}},
    fetch:fetchImpl});
  vm.runInContext(source,context);
  return {api:context.RedownCloudflareApi,context,local,calls};
}
const bucket={accountId:'account',bucketName:'bucket'};
test('private WEBP preview reads nested keys without a Worker or background messaging',async()=>{
  const h=harness(async(url,options)=>{
    assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/account/r2/buckets/bucket/objects/folder/a%20%23%3F.webp');
    assert.equal(options.headers.get('authorization'),'Bearer token');
    return new Response('webp-data');
  });
  const url=await h.api.preview(bucket,'folder/a #?.webp','image/webp');
  const response=await fetch(url);
  assert.equal(response.headers.get('content-type'),'image/webp');
  assert.equal(await response.text(),'webp-data');
  URL.revokeObjectURL(url);
});
test('downloads use a header, keep credentials out of URLs and sanitize filenames',async()=>{
  const h=harness();
  assert.equal(await h.api.download(bucket,'folder/a.webp','a:b.webp'),123);
  assert.equal(h.calls[0].headers[0].value,'Bearer token');
  assert.equal(h.calls[0].filename,'a_b.webp');
  assert.ok(!h.calls[0].url.includes('token'));
});
test('concurrent expired requests refresh rotating credentials once',async()=>{
  let refreshes=0;
  const h=harness(async(url,options)=>{
    if(url.endsWith('/oauth2/token')){refreshes++;await Promise.resolve();return Response.json({access_token:'new',refresh_token:'rotated',expires_in:3600});}
    assert.equal(options.headers.get('authorization'),'Bearer new');return new Response('ok');
  });
  h.local.cloudflareAuth.expiresAt=0.1;
  await Promise.all([h.api.request('/one'),h.api.request('/two')]);
  assert.equal(refreshes,1);assert.equal(h.local.cloudflareAuth.refreshToken,'rotated');
});
test('401 refresh retries a private read and denied reads report failure',async()=>{
  let requests=0;
  const h=harness(async url=>url.endsWith('/oauth2/token')?Response.json({access_token:'new',expires_in:3600}):url.endsWith('/domains/managed')?Response.json({success:true,result:{enabled:false}}):new Response('',{status:++requests===1?401:403}));
  await assert.rejects(h.api.preview(bucket,'a.webp','image/webp'),/403/);
  assert.equal(requests,2);
});
test('oversized preview stops without allocating an object URL',async()=>{
  const h=harness(async()=>new Response('data',{headers:{'content-length':String(65*1024*1024)}}));
  await assert.rejects(h.api.preview(bucket,'large.webp','image/webp'),/too large/);
});
test('preview failure replaces spinner and download rejection ends progress',async()=>{
  const root={replaceChildren(){this.textContent='';},append(){},textContent:''};
  const context=vm.createContext({AbortController,URL,document:{createElement(){return {};},querySelectorAll(){return [];}},
    $(){return root;},workspacePreviewRequestId:0,workspacePreviewAbort:null,workspacePreviewUrl:'',
    workspaceLightboxLayer(){return null;},explorerSource(){return bucket;},objectContentType(){return 'image/webp';},
    RedownCloudflareApi:{async preview(){throw new Error('Read denied. Retry.');},async download(){throw new Error('Download denied.');}},
    setOperation(){},finishOperation(text,failed){context.finished={text,failed};}});
  const begin=settings.indexOf('async function showWorkspacePreview('),end=settings.indexOf('\nfunction workspaceLightboxLayer',begin);
  vm.runInContext(settings.slice(begin,end),context);
  await context.showWorkspacePreview({key:'a.webp'});
  assert.equal(root.textContent,'Read denied. Retry.');
  const a=settings.indexOf('async function explorerDownload('),b=settings.indexOf('\nasync function showProperties',a);
  vm.runInContext(settings.slice(a,b),context);
  await context.explorerDownload({key:'a.webp',name:'a.webp'});
  assert.equal(context.finished.failed,true);
  assert.equal(context.finished.text,'Download denied.');
});
test('download reports delayed Chrome interruption and removes its listener',async()=>{
 const h=harness();let listener,removed=0;const outcomes=[];
 h.context.setTimeout=()=>1;h.context.clearTimeout=()=>{};
 h.context.chrome.downloads.onChanged={addListener:fn=>{listener=fn;},removeListener:fn=>{assert.equal(fn,listener);removed++;}};
 h.context.chrome.downloads.search=async()=>[{id:123,state:'in_progress'}];
 await h.api.download(bucket,'folder/a.webp','a.webp',s=>outcomes.push(s));
 listener({id:999,state:{current:'interrupted'},error:{current:'SERVER_UNAUTHORIZED'}});assert.equal(outcomes.length,0);
 listener({id:123,state:{current:'interrupted'},error:{current:'SERVER_UNAUTHORIZED'}});
 assert.equal(outcomes[0].state,'interrupted');assert.equal(outcomes[0].error,'SERVER_UNAUTHORIZED');assert.equal(removed,1);
});
test('download exposes interruption occurring before onChanged registration',async()=>{
 const h=harness();let removed=0;h.context.setTimeout=()=>1;h.context.clearTimeout=()=>{};
 h.context.chrome.downloads.onChanged={addListener(){},removeListener(){removed++;}};
 h.context.chrome.downloads.search=async()=>[{id:123,state:'interrupted',error:'SERVER_FORBIDDEN'}];
 await assert.rejects(h.api.download(bucket,'a.webp','a.webp',()=>{}),/SERVER_FORBIDDEN/);assert.equal(removed,1);
});
test('download completion is reported and an interruption racing the initial lookup cannot become success',async()=>{
 const h=harness();h.context.setTimeout=()=>1;h.context.clearTimeout=()=>{};let listener;const states=[];
 h.context.chrome.downloads.onChanged={addListener(fn){listener=fn;},removeListener(){}};
 h.context.chrome.downloads.search=async()=>[{id:123,state:'complete'}];await h.api.download(bucket,'a.webp','a.webp',state=>states.push(state));assert.equal(states[0].state,'complete');
 h.context.chrome.downloads.search=async()=>{listener({id:123,state:{current:'interrupted'},error:{current:'NETWORK_FAILED'}});return [{id:123,state:'in_progress'}];};await assert.rejects(h.api.download(bucket,'a.webp','a.webp',()=>{}),/NETWORK_FAILED/);
});

test('403 management read falls back to explicitly enabled public R2 domain for unusual keys',async()=>{
  const h=harness(async(url)=>{
    if(url.includes('/domains/managed'))return Response.json({success:true,result:{enabled:true,domain:'pub-7751cce8ad5b46c6a9533d1c70fc06f9.r2.dev'}});
    if(url.startsWith('https://pub-')){assert.equal(url,'https://pub-7751cce8ad5b46c6a9533d1c70fc06f9.r2.dev/works/...2/chapter_1/001.webp');return new Response('valid-webp');}
    return new Response('Forbidden',{status:403});
  });
  const url=await h.api.preview(bucket,'works/...2/chapter_1/001.webp','image/webp');
  assert.equal(await (await fetch(url)).text(),'valid-webp');URL.revokeObjectURL(url);
});
test('403 does not fall back for private R2 buckets',async()=>{
  const h=harness(async url=>url.includes('/domains/managed')?Response.json({success:true,result:{enabled:false,domain:'pub-7751cce8ad5b46c6a9533d1c70fc06f9.r2.dev'}}):new Response('Forbidden',{status:403}));
  await assert.rejects(h.api.preview(bucket,'works/...2/chapter_1/001.webp','image/webp'),/403/);
});
test('unusual-key download uses enabled public URL only following a denied authenticated probe',async()=>{
  const h=harness(async url=>url.includes('/domains/managed')?Response.json({success:true,result:{enabled:true,domain:'pub-7751cce8ad5b46c6a9533d1c70fc06f9.r2.dev'}}):new Response('Forbidden',{status:403}));
  await h.api.download(bucket,'works/...2/chapter_1/001.webp','001.webp');
  assert.equal(h.calls[0].url,'https://pub-7751cce8ad5b46c6a9533d1c70fc06f9.r2.dev/works/...2/chapter_1/001.webp');
  assert.equal(h.calls[0].headers.length,0);
});


test('explicit renewal refreshes a valid token but returns only safe status',async()=>{
  let calls=0;const h=harness(async(url)=>{assert.equal(url,'https://dash.cloudflare.com/oauth2/token');calls++;return Response.json({access_token:'PRIVATE_NEW_TOKEN',refresh_token:'PRIVATE_REFRESH_TOKEN',expires_in:3600});});
  h.local.cloudflareAuth.sessionId='session';
  const result=await h.api.renewAuthorization('session');
  assert.equal(result.state,'renewed');assert.equal(calls,1);
  assert.equal(h.local.cloudflareAuth.accessToken,'PRIVATE_NEW_TOKEN');
  assert.deepEqual(Object.keys(result).sort(),['expiresAt','state']);
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
test('missing refresh token reports unavailable without breaking a still-valid login',async()=>{
  let calls=0;const h=harness(async()=>{calls++;throw Error();});h.local.cloudflareAuth.sessionId='session';delete h.local.cloudflareAuth.refreshToken;
  const result=await h.api.renewAuthorization('session');assert.equal(result.state,'renewal-unavailable');assert.equal(calls,0);assert.ok(!h.local.cloudflareAuth.reconnectRequired);
  await assert.rejects(h.api.renewAuthorization('other'),{code:'CLOUDFLARE_RECONNECT_REQUIRED'});
});
test('invalid refresh grant requests interactive reconnect without exposing provider errors',async()=>{
  const h=harness(async()=>Response.json({error:'invalid_grant'},{status:400}));h.local.cloudflareAuth.sessionId='session';
  await assert.rejects(h.api.renewAuthorization('session'),{code:'CLOUDFLARE_RECONNECT_REQUIRED'});assert.equal(h.local.cloudflareAuth.reconnectRequired,true);
});
