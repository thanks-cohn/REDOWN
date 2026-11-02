import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto,createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {worker} from './helpers/background-worker.mjs';
const read=p=>readFile(p,'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const files=['dropbox-auth','dropbox-api','dropbox-menu','google-drive-menu','dropbox-provider'];
const sources=Object.fromEntries(await Promise.all(files.map(async n=>[n,await read('extension/'+n+'.js')])));
function context(extra={}){const c=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,URL,URLSearchParams,Uint8Array,Response,AbortController,AbortSignal,setTimeout,clearTimeout,btoa,atob,...extra});for(const s of Object.values(sources))vm.runInContext(s,c);return c;}
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
function fixture(options={}){
 const store={},session={},calls=[],uploads=[],events=[],records=[];let revoked=false,account='dbid:account-a',file=null,offset=0,now=1000,tokenCount=0;
 const storage=data=>({get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(data[k])])),set:async patch=>Object.assign(data,structuredClone(patch)),remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete data[k];},setAccessLevel:async o=>events.push(o.accessLevel)});
 const source=options.source??new Uint8Array([137,80,78,71,0,255]);
 const chrome={runtime:{id:options.badId?'wrong':'mkadkgpekmkknfbniacdlmgikihjjepf',getURL:p=>'chrome-extension://test/'+p,onStartup:{addListener:f=>events.push(f)},onInstalled:{addListener:f=>events.push(f)}},storage:{local:storage(store),session:storage(session)},identity:{getRedirectURL:()=>options.badRedirect?'https://bad.invalid/':`https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/dropbox`,launchWebAuthFlow:async o=>{
  calls.push({oauth:o});if(options.denied)throw Error('cancelled');const u=new URL(o.url);assert.equal(u.origin,'https://www.dropbox.com');assert.equal(u.searchParams.get('client_id'),'h0mbahfonf0zkul');assert.equal(u.searchParams.get('token_access_type'),'offline');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.deepEqual(u.searchParams.get('scope').split(' '),['account_info.read','files.metadata.read','files.content.read','files.content.write']);
  const a=session['dropbox:oauth'];assert.equal(u.searchParams.get('code_challenge'),Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(a.verifier))).toString('base64url'));assert.ok(a.verifier.length>=43);
  if(options.expired)now+=601000;
  return (options.wrongRedirect?'https://bad.invalid/dropbox':u.searchParams.get('redirect_uri'))+'?code=one-use&state='+(options.wrongState?'wrong':u.searchParams.get('state'))+(options.duplicateState?'&state=evil':'');
 }},permissions:{request:async()=>options.permission!==false},alarms:{create:async()=>{},onAlarm:{addListener:f=>events.push(f)}},tabs:{create:()=>{throw Error('VISIBLE TAB');},update:()=>{throw Error('VISIBLE TAB');}},windows:{create:()=>{throw Error('VISIBLE WINDOW');}}};
 const fetch=async(url,o={})=>{
  calls.push({url,o});const u=new URL(url);
  if(u.hostname==='source.invalid'){
   assert.equal(o.headers?.Authorization,undefined);assert.equal(o.credentials,'omit');assert.equal(o.redirect,'error');assert.equal(o.referrerPolicy,'no-referrer');
   if(options.sourceError)throw Error('expired');const start=o.headers?.Range?Number(/bytes=(\d+)-/.exec(o.headers.Range)[1]):0;
   const body=source.subarray(start);return new Response(options.html?'<html>':body,{status:start?options.rangeUnsupported?200:206:200,headers:{'Content-Type':options.html?'text/html':'application/octet-stream',...(options.unknown?{}:{'Content-Length':String(body.length)}),'ETag':options.changed?'"changed"':'"v1"',...(start?{'Content-Range':`bytes ${start}-${source.length-1}/${source.length}`}:{})}});
  }
  assert.ok(['api.dropboxapi.com','content.dropboxapi.com'].includes(u.hostname));
  if(u.pathname==='/oauth2/token'){
   tokenCount++;assert.equal(o.body.get('client_id'),'h0mbahfonf0zkul');assert.equal(o.body.has('client_secret'),false);
   if(options.tokenError||revoked)return json({},400);
   return json({access_token:'PRIVATE_ACCESS',refresh_token:'PRIVATE_REFRESH',expires_in:3600,account_id:account,scope:options.scopeDenied?'account_info.read':'account_info.read files.metadata.read files.content.read files.content.write'});
  }
  assert.equal(o.headers.Authorization,'Bearer PRIVATE_ACCESS');
  if(u.pathname.endsWith('token/revoke')){revoked=true;return json(null);}
  if(u.pathname.endsWith('get_current_account'))return revoked?json({},401):json({account_id:account,root_info:{'.tag':options.team?'team':'user',root_namespace_id:'123',home_namespace_id:options.badRoot?'456':'123'}});
  if(u.pathname.endsWith('list_folder')){assert.equal(JSON.parse(o.body).path,'');return options.rootDenied?json({},403):json({entries:[]});}
  const arg=o.headers['Dropbox-API-Arg']?JSON.parse(o.headers['Dropbox-API-Arg']):null;
  assert.deepEqual(JSON.parse(o.headers['Dropbox-API-Path-Root']),{'.tag':'root',root:'123'});
  if(u.pathname.endsWith('upload_session/start')){offset=0;return json({session_id:'session-1'});}
  if(u.pathname.endsWith('append_v2')){
   if(options.appendHttp)return json({},options.appendHttp,{'Retry-After':'0'});
   assert.ok(o.body.byteLength<=4*1024*1024);if(arg.cursor.offset!==offset)return json({error:{'.tag':'incorrect_offset',correct_offset:offset}},409);
   uploads.push(new Uint8Array(o.body));offset+=o.body.length;
   if(options.lostAppend){options.lostAppend=false;throw Error('lost');}return json(null);
  }
  if(u.pathname.endsWith('upload_session/finish')){
   assert.equal(arg.cursor.offset,offset);assert.equal(arg.commit.mode,'add');assert.equal(arg.commit.autorename,true);assert.ok(!arg.commit.path.slice(1).includes('/'));
   if(options.finishHttp)return json({},options.finishHttp);
   file={'.tag':'file',id:'id:file-'+(calls.filter(c=>c.url?.endsWith('upload_session/finish')).length),name:arg.commit.path.slice(1),path_display:arg.commit.path,path_lower:arg.commit.path.toLowerCase(),size:offset,rev:'revision',content_hash:'a'.repeat(64)};
   if(options.untagged)delete file['.tag'];if(options.lostFinish)throw Error('lost');return json(file);
  }
  if(u.pathname.endsWith('get_metadata'))return json({'.tag':'file',...file,...(options.badReceipt?{size:999}:{})});
  throw Error('Unexpected request '+url);
 };
 const c=context({chrome,fetch});const auth=c.RedownDropboxAuth.create({chrome,fetch,crypto:webcrypto,now:()=>now});
 const api=c.RedownDropboxAPI.create({auth,fetch,sleep:async()=>{}});
 const provider=c.RedownDropboxProvider.create({chrome,auth,api,record:async r=>records.push(plain(r))});
 return {c,chrome,store,session,auth,api,provider,calls,uploads,records,events,source,setAccount:x=>account=x,setRevoked:()=>revoked=true,setNow:x=>now=x,get tokenCount(){return tokenCount;}};
}
async function job(f){const s=await f.auth.connect();return {id:'job',source:{url:'https://source.invalid/カメラ.png'},accountId:s.accountId,connectionId:s.connectionId,offset:0,phase:'source'};}
test('PKCE S256 offline login, exact app, user root, trusted storage and memory-only access token',async()=>{
 const f=fixture();const s=await f.auth.connect();assert.equal(s.root,'/');assert.equal(s.rootReady,true);assert.equal(s.accountId,'dbid:account-a');assert.ok(f.events.every(e=>e==='TRUSTED_CONTEXTS'));assert.equal(f.session['dropbox:oauth'],undefined);assert.doesNotMatch(JSON.stringify(f.store),/PRIVATE_ACCESS|verifier/);assert.equal(f.store['dropbox:auth'].refreshToken,'PRIVATE_REFRESH');
 await f.auth.ready();assert.equal(f.tokenCount,1);await f.auth.disconnect();assert.equal(f.store['dropbox:auth'],undefined);assert.equal(f.store['dropbox:state'].phase,'disconnected');
});
for(const options of [{badId:true},{badRedirect:true},{denied:true},{wrongState:true},{wrongRedirect:true},{expired:true},{duplicateState:true},{tokenError:true},{scopeDenied:true},{team:true},{badRoot:true},{rootDenied:true}])test('OAuth fail-closed '+JSON.stringify(options),async()=>{const f=fixture(options);await assert.rejects(f.auth.connect());assert.notEqual(f.store['dropbox:state']?.phase,'connected');assert.equal(f.store['dropbox:auth'],undefined);assert.equal(f.session['dropbox:oauth'],undefined);});
test('refresh after worker restart is noninteractive, verifies original account; revocation and account switch fail closed',async()=>{
 const f=fixture();const j=await job(f);const fresh=f.c.RedownDropboxAuth.create({chrome:f.chrome,fetch:async(...args)=>{const fn=f.c.fetch;return fn(...args);},crypto:webcrypto});await fresh.ready(j);assert.equal(f.tokenCount,2);assert.equal(f.calls.filter(c=>c.oauth).length,1);
 f.setAccount('dbid:other');const other=f.c.RedownDropboxAuth.create({chrome:f.chrome,fetch:f.c.fetch,crypto:webcrypto});await assert.rejects(other.ready(j));assert.equal(f.store['dropbox:state'].phase,'reconnect');
 f.setAccount('dbid:account-a');f.setRevoked();await assert.rejects(f.auth.ready(j,true));assert.equal(f.store['dropbox:state'].phase,'reconnect');
});
for(const size of [0,19,4*1024*1024+19,33*1024*1024+1])test('verified bounded session upload KEEP BOTH, root and actual bytes size '+size,async()=>{
 const f=fixture({source:new Uint8Array(size).fill(219)}),j=await job(f);const checkpoints=[];const r=await f.api.upload(j,async x=>checkpoints.push(plain(x)),new AbortController().signal);assert.equal(r.bytes,size);assert.equal(r.root,'/');assert.deepEqual(Buffer.concat(f.uploads),Buffer.from(f.source));assert.ok(checkpoints.some(c=>c.phase==='committing'));assert.ok(checkpoints.some(c=>c.phase==='verifying'));assert.equal(r.fileId,'id:file-1');assert.ok(f.calls.some(c=>c.url?.endsWith('get_metadata')));
 assert.ok(!f.calls.some(c=>/create_folder/.test(c.url||'')));assert.doesNotMatch(JSON.stringify(f.records),/PRIVATE_/);
});
test('unknown length uses bounded sessions; Unicode names and dangerous filenames are sanitized',async()=>{
 const f=fixture({unknown:true});const j=await job(f);assert.equal((await f.api.upload(j,async()=>{},new AbortController().signal)).bytes,f.source.length);
 assert.equal(f.c.RedownDropboxAPI.filename('日本語.pdf'),'日本語.pdf');for(const n of ['../a\\b.txt','\u202efake.exe','...','a'.repeat(300)+'.pdf']){const name=f.c.RedownDropboxAPI.filename(n);assert.ok(new TextEncoder().encode(name).length<=240);assert.doesNotMatch(name,/[\\/\u202e]/);}
});
for(const options of [{appendHttp:401},{appendHttp:403},{appendHttp:409},{appendHttp:429},{appendHttp:500},{finishHttp:500},{lostFinish:true},{badReceipt:true},{sourceError:true},{html:true}])test('transport fault never reports success '+JSON.stringify(options),async()=>{
 const f=fixture(options),j=await job(f);await assert.rejects(f.api.upload(j,async()=>{},new AbortController().signal),e=>['blocked','failed','uncertain','interrupted'].includes(e.status));assert.ok(f.calls.filter(c=>c.url?.endsWith('upload_session/finish')).length<=1);assert.ok(!f.records.some(r=>r.ok));
});
test('lost append before checkpoint resumes against server correct_offset without duplication',async()=>{
 const options={source:new Uint8Array(4*1024*1024+17).fill(53),lostAppend:true};const f=fixture(options),j=await job(f);let persisted;
 await assert.rejects(f.api.upload(j,async x=>persisted=plain(x),new AbortController().signal),e=>e.status==='uncertain');assert.equal(persisted.offset,0);
 const r=await f.api.upload(persisted,async()=>{},new AbortController().signal);assert.equal(r.bytes,f.source.length);assert.deepEqual(Buffer.concat(f.uploads),Buffer.from(f.source));
});
test('worker restart resumes exact byte range and safely handles checkpoint at EOF',async()=>{
 for(const eof of [false,true]){
 const f=fixture({source:new Uint8Array(4*1024*1024+17).fill(31)}),j=await job(f);let persisted;
 await assert.rejects(f.api.upload(j,async x=>{persisted=plain(x);if(x.offset&&(eof?x.offset===f.source.length:true))throw Error('simulated worker death');},new AbortController().signal));
 const r=await f.api.upload(persisted,async()=>{},new AbortController().signal);assert.equal(r.bytes,f.source.length);assert.deepEqual(Buffer.concat(f.uploads),Buffer.from(f.source));assert.ok(f.calls.some(c=>c.o?.headers?.Range));
 }
});
test('changed/range-inaccessible source cannot resume, interrupted finish is never replayed',async()=>{
 const opts={source:new Uint8Array(4*1024*1024+17)};const f=fixture(opts),j=await job(f);let persisted;
 await assert.rejects(f.api.upload(j,async x=>{persisted=plain(x);if(x.offset)throw Error('death');},new AbortController().signal));opts.changed=true;await assert.rejects(f.api.upload(persisted,async()=>{},new AbortController().signal),e=>e.status==='interrupted');
 persisted.phase='committing';const n=f.calls.length;await assert.rejects(f.api.upload(persisted,async()=>{},new AbortController().signal),e=>e.status==='uncertain');assert.ok(!f.calls.slice(n).some(c=>c.url?.endsWith('finish')));
});
test('source snapshot chooses clicked media/link before page, preserves context and rejects unsafe URLs',()=>{
 const a=context().RedownDropboxAPI;const s=a.sourceSnapshot({srcUrl:'https://source.invalid/a.png',linkUrl:'https://source.invalid/link',pageUrl:'https://source.invalid/page',frameUrl:'https://source.invalid/frame'});assert.equal(s.url,'https://source.invalid/a.png');assert.equal(s.pageUrl,'https://source.invalid/page');assert.equal(s.frameUrl,'https://source.invalid/frame');
 for(const u of ['http://x.invalid/photo.jpg','http://localhost/image.png','https://127.0.0.1/1','https://172.17.0.1/1','https://[::1]/','http://camera.local/photo.png'])assert.equal(a.sourceURL(u).href,u);
 for(const u of ['blob:https://x.invalid/1','file:///1','data:image/png;base64,AAAA','ftp://x.invalid/p.png','https://user:pass@x.invalid/1'])assert.throws(()=>a.sourceURL(u),e=>e.message.startsWith('REDOWN '));

});
test('HTTP source bytes stream to Dropbox without exposing the source URL or its query',async()=>{
 const f=fixture(),j=await job(f);
 j.source.url='http://source.invalid/photo.png?redown_private_provenance=owner-only';
 const receipt=await f.api.upload(j,async()=>{},new AbortController().signal);
 assert.equal(receipt.bytes,f.source.length);
 assert.ok(f.calls.some(c=>c.url===j.source.url));
 const providerCalls=f.calls.filter(c=>c.url&&new URL(c.url).hostname.endsWith('.dropboxapi.com'));
 assert.ok(providerCalls.some(c=>c.url.endsWith('upload_session/finish')));
 for(const c of providerCalls){
  assert.doesNotMatch(c.url,/redown_private_provenance|source\.invalid/);
  assert.doesNotMatch(JSON.stringify(c.o),/redown_private_provenance|source\.invalid/);
  assert.equal(c.o.referrerPolicy,'no-referrer');
 }
});
test('connected native saves, repeated clicks and multi-chunk transfer use no visible UI; exact job receipts',async()=>{
 const f=fixture({source:new Uint8Array(4*1024*1024+1)});await f.auth.connect();
 const click={menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/file.pdf',pageUrl:'https://source.invalid/page'};
 await f.provider.dispatch(click);await f.provider.pump();await f.provider.dispatch(click);await f.provider.pump();assert.equal(f.records.filter(r=>r.ok).length,1);
 await f.provider.dispatch({...click});await f.provider.pump();assert.equal(f.records.filter(r=>r.ok).length,2);assert.notEqual(...f.records.filter(r=>r.ok).map(r=>r.deliveryId));assert.equal(f.records.find(r=>r.ok).pageUrl,click.pageUrl);assert.doesNotMatch(JSON.stringify(f.records),/PRIVATE_/);
});
test('login via native action resumes exactly one pending click; Shelf login alone creates no job',async()=>{
 const f=fixture();await f.provider.dispatch({menuItemId:'provider:dropbox:connect',linkUrl:'https://source.invalid/file'});await f.provider.pump();assert.equal(f.records.filter(r=>r.ok).length,1);assert.equal(f.calls.filter(c=>c.oauth).length,1);
 const shelf=fixture();assert.equal((await shelf.provider.message({type:'dropboxConnect'},{id:shelf.chrome.runtime.id,url:shelf.chrome.runtime.getURL('shelf.html')})).ok,true);assert.equal(shelf.store['dropbox:jobs'],undefined);
});
test('unknown native IDs and untrusted Shelf messages fail closed; denied source consent cannot save',async()=>{
 const f=fixture({permission:false});await f.provider.dispatch({menuItemId:'provider:dropbox:unknown',linkUrl:'https://source.invalid/file'});assert.equal(f.calls.length,0);await f.provider.dispatch({menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/file'});assert.equal(f.store['dropbox:transfer'].status,'blocked');assert.equal(f.calls.length,0);
 assert.equal((await f.provider.message({type:'dropboxConnect'},{id:'other',url:'https://evil.invalid'})).ok,false);
});
test('crashed OAuth and commit jobs are interrupted/uncertain on wake, with no duplicate commits',async()=>{
 const f=fixture();const j=await job(f);f.store['dropbox:jobs']=[{...j,id:'pending',status:'awaiting-auth'},{...j,id:'commit',status:'active',phase:'committing'}];await f.provider.pump();assert.deepEqual(f.records.filter(r=>!['active','queued'].includes(r.status)).map(r=>r.status),['interrupted','uncertain']);assert.equal(f.calls.filter(c=>c.url?.endsWith('finish')).length,0);await f.provider.pump();assert.equal(f.records.filter(r=>!['active','queued'].includes(r.status)).length,2);
});
test('queue bound preserves existing jobs and reports a clear retry condition',async()=>{
 const f=fixture();const j=await job(f);f.store['dropbox:jobs']=Array.from({length:8},(_,i)=>({...j,id:String(i),status:'queued'}));await f.provider.dispatch({menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/new'});assert.equal(f.store['dropbox:jobs'].length,8);assert.match(f.store['dropbox:transfer'].error,/queue is full/);
});
test('shared composer preserves every V3/Google plan and route, Dropbox leaf ordering and invalid fragment rejection',async()=>{
 const c=context(),g=c.RedownGoogleDriveMenu,d=c.RedownDropboxMenu,b=JSON.parse(await read('docs/verification/dropbox/before.json'));
 vm.runInContext(await read('extension/right-click-v3.js'),c);
 for(const x of b.cases)for(const phase of ['disconnected','connecting','connected','reconnect'])for(const googlePhase of ['connected','disconnected']){
 const projection=c.RedownRightClickV3.project(x.state,x.profiles,x.options,x.inventory,'redown',x.at);assert.deepEqual(plain(projection),x.before.projection);
 for(const route of x.before.routes){const r=c.RedownRightClickV3.resolve(route.id,x.state,x.profiles,x.options,x.inventory,x.at);assert.deepEqual(r?plain({profileId:r.owner.id,accountId:r.profile.accountId,bucketName:r.profile.bucketName,prefix:r.prefix}):null,route.target);}
 const original=g.compose([{id:'redown'},...projection.entries,{id:'redown-manage',parentId:'redown'}],g.fragment({phase:googlePhase,folderId:'folder'},'redown'),'redown');const f=d.fragment({phase,root:'/',rootReady:true,accountId:'dbid:a',connectionId:'connection'},'redown');const combined=g.composeSibling(original,f,'redown');assert.deepEqual(plain(combined.filter(e=>!d.owns(e.id))),plain(original));const idx=combined.findIndex(e=>e.id==='provider:dropbox');assert.ok(g.owns(combined[idx-1].id));assert.equal(combined.at(-1).id,'redown-manage');assert.equal(f.entries.length,phase==='connected'?1:2);
 for(const entries of [[{id:'redown',parentId:'redown'}],[{id:'provider:dropbox',parentId:'provider:google-drive'}],[f.entries[0],{id:'provider:dropbox:alien',parentId:'provider:dropbox'}],[f.entries[0],f.entries[0]],[f.entries[0],{id:'provider:dropbox:connect',parentId:'provider:dropbox:connect'}],Array(1001).fill(f.entries[0])])assert.equal(g.composeSibling(original,{providerId:'dropbox',entries},'redown'),original);
 }
});
test('actual single native writer reconciles transitions/restart/lost IDs and retains management last',async()=>{
 const h=worker();await h.ready();
 for(const phase of ['connected','disconnected','connecting','connected','reconnect']){
 h.local['dropbox:state']={phase,rootReady:true,root:'/',accountId:'dbid:a',connectionId:'connection'};
 await Promise.all([h.rebuild(),h.rebuild()]);assert.equal(h.local.rightClickMenuStatus.state,'registered');const list=[...h.native.values()],roots=list.filter(e=>e.parentId==='redown');assert.equal(roots.at(-1).id,'redown-manage');assert.equal(roots.findIndex(e=>e.id==='provider:dropbox'),roots.findIndex(e=>e.id==='provider:google-drive')+1);assert.equal(list.filter(e=>e.id==='redown').length,1);assert.equal(list.filter(e=>e.parentId==='provider:dropbox').length,phase==='connected'?0:1);
 }
 const restart=worker(structuredClone(h.local));await restart.ready();await restart.rebuild();assert.equal(restart.local.rightClickMenuStatus.state,'registered');restart.native.delete('provider:dropbox');await vm.runInContext('nativeMenuPlan=null;rebuildMenus()',restart.context);assert.ok(restart.native.has('provider:dropbox'));assert.equal(restart.calls.some(c=>c[0]==='removeAll'),false);
});
test('actual native dispatcher isolates all Dropbox IDs before V3 resolver or navigation',async()=>{
 const bg=await read('extension/background.js');let listener;const calls=[];const c=vm.createContext({chrome:{contextMenus:{onClicked:{addListener:f=>listener=f}}},RedownDropboxMenu:context().RedownDropboxMenu,dropboxProvider:{dispatch:async info=>calls.push(info.menuItemId)}});vm.runInContext(bg.slice(bg.indexOf('chrome.contextMenus.onClicked.addListener(async'),bg.indexOf('\nasync function saveResolvedRightClick')),c);
 for(const id of ['provider:dropbox','provider:dropbox:connect','provider:dropbox:unknown'])await listener({menuItemId:id});assert.equal(calls.length,3);assert.equal((bg.match(/contextMenus\.onClicked\.addListener/g)||[]).length,1);
});
test('Shelf Google then Dropbox then original headline; semantic controls and polite status',async()=>{
 const dom=new JSDOM(await read('extension/shelf.html')),d=dom.window.document;assert.ok(d.querySelector('.google-drive-control').nextElementSibling.matches('.dropbox-control'));assert.ok(d.querySelector('.dropbox-control').nextElementSibling.matches('.onedrive-control'));assert.ok(d.querySelector('.onedrive-control').parentElement.matches('.destinations-grid'));assert.ok(d.querySelector('.destinations-grid').nextElementSibling.matches('.eyebrow'));assert.equal(d.querySelector('#shelf-dropbox').tagName,'BUTTON');assert.equal(d.querySelector('#shelf-dropbox-status').getAttribute('aria-live'),'polite');assert.equal(d.querySelector('#shelf-dropbox-open').textContent,'Open Dropbox');assert.match(await read('extension/dropbox-controls.css'),/focus-visible/);dom.window.close();
});
test('protected bytes unchanged except explicitly authorized shared composer hook',async()=>{
 const b=JSON.parse(await read('docs/verification/dropbox/before.json'));for(const [p,h] of Object.entries(b.hashes)){if(p==='extension/google-drive-menu.js')continue;assert.equal(createHash('sha256').update(await readFile(p)).digest('hex'),h,p);}
 for(const n of ['dropbox-auth','dropbox-api','dropbox-menu','dropbox-provider'])assert.doesNotMatch(sources[n],/chrome\.(tabs|windows|downloads|contextMenus)\.|create_folder|workers\.dev|client_secret/);
});
test('history and counter deduplicate Dropbox receipt atomically without changing other provider semantics',async()=>{
 const f=fixture(),c=context({chrome:f.chrome});vm.runInContext(await read('extension/transfer-counter.js'),c);const counter=c.RedownTransferCounter.create(f.chrome.storage.local);const j=await job(f),destination=await f.api.upload(j,async()=>{},new AbortController().signal);const r={providerKind:'dropbox',deliveryId:'dropbox:job-one',status:'completed',verified:true,destination,ok:true,location:'https://www.dropbox.com/home/file'};await counter.record(r);await counter.record(r);assert.equal(f.store.transferCounter.total,'1');assert.equal(f.store.transferHistory.length,1);await counter.record({...r,deliveryId:'dropbox:job-two'});assert.equal(f.store.transferCounter.total,'2');await counter.record({ok:true,location:'https://other.invalid/file'});await counter.record({ok:true,location:'https://other.invalid/file'});assert.equal(f.store.transferCounter.total,'4');
});
test('cancellation, root/account pinning and stale connection jobs never become successful',async()=>{
 const f=fixture();const j=await job(f);const controller=new AbortController();controller.abort();await assert.rejects(f.api.upload(j,async()=>{},controller.signal),e=>['cancelled','blocked'].includes(e.status));assert.equal(f.calls.filter(c=>c.url?.endsWith('finish')).length,0);
 f.store['dropbox:auth'].connectionId='new-connection';await assert.rejects(f.api.upload(j,async()=>{},new AbortController().signal));
});
test('oversized declared length blocks before uploading; no application-specific file size cap',async()=>{
 const f=fixture(),j=await job(f);const fetch=async(u,o)=>u.startsWith('https://source.invalid')?new Response(new Uint8Array(1),{headers:{'Content-Length':String(2*1024**4+1)}}):f.c.fetch(u,o);const api=f.c.RedownDropboxAPI.create({auth:f.auth,fetch});await assert.rejects(api.upload(j,async()=>{},new AbortController().signal),e=>e.status==='blocked');assert.equal(f.calls.filter(c=>c.url?.endsWith('upload_session/start')).length,0);
});
test('verified receipt checkpoint survives restart and replays metadata proof only',async()=>{
 const f=fixture(),j=await job(f);let saved;await assert.rejects(f.api.upload(j,async x=>{saved=plain(x);if(x.phase==='verifying')throw Error('worker gone');},new AbortController().signal));const before=f.calls.filter(c=>c.url?.endsWith('finish')).length;assert.equal((await f.api.upload(saved,async()=>{},new AbortController().signal)).bytes,f.source.length);assert.equal(f.calls.filter(c=>c.url?.endsWith('finish')).length,before);
});
test('worker crash after history write reuses delivery identity and never increments counter twice',async()=>{
 const f=fixture(),j=await job(f),c=context({chrome:f.chrome});vm.runInContext(await read('extension/transfer-counter.js'),c);const counter=c.RedownTransferCounter.create(f.chrome.storage.local);const result=await f.api.upload(j,async()=>{},new AbortController().signal);f.store['dropbox:jobs']=[{...j,status:'completed',result,reported:false}];
 await counter.record({providerKind:'dropbox',deliveryId:'dropbox:'+j.id,status:'completed',verified:true,destination:result,ok:true,location:'https://www.dropbox.com/home/file'});
 const p=f.c.RedownDropboxProvider.create({chrome:f.chrome,auth:f.auth,api:f.api,record:r=>counter.record(r)});await p.pump();assert.equal(f.store.transferCounter.total,'1');assert.equal(f.store.transferHistory.length,1);
});
test('actual native writer recovers partial Dropbox API failure and corrupt/missing native ID caches',async()=>{
 const h=worker(undefined,{create:'provider:dropbox:connect'});await h.ready();await h.rebuild();assert.equal(h.local.rightClickMenuStatus.state,'registered');assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage'));
 delete h.local.rightClickNativeIds;const restarted=worker(structuredClone(h.local),{nativeEntries:[...h.native]});await restarted.ready();await restarted.rebuild();assert.equal(restarted.local.rightClickMenuStatus.state,'registered');assert.equal([...restarted.native.keys()].filter(x=>x==='provider:dropbox').length,1);
});

test('Dropbox finish FileMetadata does not require a union discriminator',async()=>{const f=fixture({untagged:true}),j=await job(f);assert.equal((await f.api.upload(j,async()=>{},new AbortController().signal)).fileId,'id:file-1');});
test('cancel and disconnect stop queued work without cross-account uploads',async()=>{
 const f=fixture(),j=await job(f),sender={id:f.chrome.runtime.id,url:f.chrome.runtime.getURL('shelf.html')};f.store['dropbox:jobs']=[{...j,status:'queued'}];await f.provider.message({type:'dropboxCancel'},sender);await f.provider.pump();assert.equal(f.store['dropbox:jobs'][0].status,'cancelled');assert.equal(f.calls.filter(c=>c.url?.endsWith('finish')).length,0);await f.provider.message({type:'dropboxDisconnect'},sender);assert.equal(f.store['dropbox:auth'],undefined);assert.equal(f.store['dropbox:state'].phase,'disconnected');
});
test('explicit 429 backoff is bounded and can recover; readback retries do not replay finish',async()=>{
 const f=fixture(),j=await job(f);let append=0,metadata=0,sleeps=0;const api=f.c.RedownDropboxAPI.create({auth:f.auth,sleep:async()=>sleeps++,fetch:async(u,o)=>{if(u.endsWith('append_v2')&&append++===0)return json({},429,{'Retry-After':'1'});if(u.endsWith('get_metadata')&&metadata++===0)return json({},503);return f.c.fetch(u,o);}});assert.equal((await api.upload(j,async()=>{},new AbortController().signal)).bytes,f.source.length);assert.equal(sleeps,2);assert.equal(f.calls.filter(c=>c.url?.endsWith('finish')).length,1);
});

test('stale logged-out native leaf records a blocked attempt, never a successful receipt',async()=>{
 const f=fixture();await f.provider.dispatch({menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/a.pdf',pageUrl:'https://source.invalid/page'});
 assert.equal(f.records.length,1);assert.equal(f.records[0].status,'blocked');assert.equal(f.records[0].ok,false);assert.equal(f.records[0].verified,false);assert.equal(f.records[0].location,'');assert.equal(f.calls.length,0);
});
test('unproven persisted completed job becomes uncertain, without replaying a commit',async()=>{
 const f=fixture(),j=await job(f);f.store['dropbox:jobs']=[{...j,status:'completed',result:{name:'phantom.pdf'},reported:false}];await f.provider.pump();
 assert.equal(f.records[0].status,'uncertain');assert.equal(f.records[0].verified,false);assert.equal(f.records[0].location,'');assert.ok(!f.calls.some(c=>c.url?.endsWith('finish')));
});
for(const change of [{content_hash:undefined},{path_display:'/other.png'},{id:'id:other'},{rev:'changed'},{'.tag':'deleted'}])test('exact readback mismatch cannot become successful '+JSON.stringify(change),async()=>{
 const f=fixture(),j=await job(f);const api=f.c.RedownDropboxAPI.create({auth:f.auth,fetch:async(u,o)=>{const r=await f.c.fetch(u,o);return u.endsWith('get_metadata')?json({...await r.json(),...change}):r;}});
 await assert.rejects(api.upload(j,async()=>{},new AbortController().signal),e=>e.status==='uncertain');assert.equal(f.calls.filter(c=>c.url?.endsWith('finish')).length,1);
});
test('readback denial remains uncertain; explicit reconciliation uses ID and never repeats finish',async()=>{
 const f=fixture(),j=await job(f);let unavailable=true;
 const api=f.c.RedownDropboxAPI.create({auth:f.auth,fetch:async(u,o)=>unavailable&&u.endsWith('get_metadata')?json({},403):f.c.fetch(u,o)});
 f.store['dropbox:jobs']=[{...j,status:'queued'}];const p=f.c.RedownDropboxProvider.create({chrome:f.chrome,auth:f.auth,api,record:async r=>f.records.push(plain(r))});await p.pump();
 assert.equal(f.records.at(-1).status,'uncertain');assert.equal(f.records.filter(r=>r.ok).length,0);const commits=f.calls.filter(c=>c.url?.endsWith('finish')).length;
 unavailable=false;await p.message({type:'dropboxStatus'},{id:f.chrome.runtime.id,url:f.chrome.runtime.getURL('shelf.html')});
 assert.equal(f.records.filter(r=>r.ok).length,1);assert.equal(f.records.at(-1).destination.namespace,'123');assert.equal(f.calls.filter(c=>c.url?.endsWith('finish')).length,commits);
});
test('account swap before commit is blocked, namespace snapshot cannot be silently changed',async()=>{
 const f=fixture(),j=await job(f);const api=f.c.RedownDropboxAPI.create({auth:f.auth,fetch:async(u,o)=>{const r=await f.c.fetch(u,o);if(u.endsWith('append_v2'))f.setAccount('dbid:other');return r;}});
 await assert.rejects(api.upload(j,async()=>{},new AbortController().signal));assert.equal(f.calls.filter(c=>c.url?.endsWith('finish')).length,0);
 f.setAccount('dbid:account-a');const next=await job(f);next.namespace='456';await assert.rejects(f.api.upload(next,async()=>{},new AbortController().signal));
});
test('provider attempts, final receipt, archive and both counters share a stable exactly-once boundary',async()=>{
 const f=fixture();await f.auth.connect();vm.runInContext(await read('extension/transfer-counter.js'),f.c);const archived=new Map();const counter=f.c.RedownTransferCounter.create(f.chrome.storage.local,undefined,{append:async r=>archived.set(r.id,plain(r))});
 const p=f.c.RedownDropboxProvider.create({chrome:f.chrome,auth:f.auth,api:f.api,record:r=>counter.record(r)});
 await p.dispatch({menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/a.png',pageUrl:'https://source.invalid/page'});await p.pump();
 const h=f.store.transferHistory;assert.deepEqual(h.map(r=>r.status),['completed','active','queued']);assert.equal(new Set(h.map(r=>r.transferId)).size,1);assert.equal(f.store.transferCounter.total,'1');assert.equal(f.store.providerSaveReceipts.totals.dropbox,'1');
 const done=h[0];await counter.record(done);const revived=f.c.RedownDropboxProvider.create({chrome:f.chrome,auth:f.auth,api:f.api,record:r=>counter.record(r)});await revived.pump();
 assert.equal(f.store.transferCounter.total,'1');assert.equal(archived.size,3);assert.equal(f.store.transferHistory.length,3);assert.equal(done.destination.path,'/a.png');assert.equal(done.pageUrl,'https://source.invalid/page');
});

test('status refresh invalidates a stale connected menu/card projection with no auth',async()=>{
 const f=fixture();f.store['dropbox:state']={phase:'connected',rootReady:true,accountId:'dbid:a',connectionId:'old'};
 const r=await f.provider.message({type:'dropboxStatus'},{id:f.chrome.runtime.id,url:f.chrome.runtime.getURL('shelf.html')});
 assert.equal(r.ok,true);assert.equal(f.store['dropbox:state'].phase,'reconnect');assert.equal(f.records.filter(r=>r.ok).length,0);
 const menu=f.c.RedownDropboxMenu.fragment(f.store['dropbox:state'],'redown');assert.equal(menu.entries[1].id,'provider:dropbox:connect');
});
