import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';import {webcrypto,createHash} from 'node:crypto';import {JSDOM} from 'jsdom';
import {makeDrive,sourceURL,SCOPE,MAX_BYTES,CHUNK} from '../extension/google-drive-api.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const [menuSource,bg,before]=await Promise.all([read('extension/google-drive-menu.js'),read('extension/background.js'),read('docs/verification/google-drive/before.json').then(JSON.parse)]);
function menu(){const c=vm.createContext({});vm.runInContext(menuSource,c);return c.RedownGoogleDriveMenu;}
test('protected engine/support/editor hashes and every baseline projection/resolve remain identical',async()=>{
 for(const [p,h] of Object.entries(before.hashes))assert.equal(createHash('sha256').update(await read(p)).digest('hex'),h,p);
 const c=vm.createContext({TextEncoder});vm.runInContext(await read('extension/right-click-v3.js'),c);const m=c.RedownRightClickV3;
 for(const s of before.plans){const projection=m.project(s.state,s.profiles,s.style,null,'redown');assert.deepEqual(JSON.parse(JSON.stringify(projection)),s.projection);for(const route of s.routes){const r=m.resolve(route.id,s.state,s.profiles,s.style,null);assert.deepEqual(r?JSON.parse(JSON.stringify({profileId:r.owner.id,accountId:r.profile.accountId,bucketName:r.profile.bucketName,prefix:r.prefix})):null,route.target);}}
});
test('single root, deterministic siblings, namespace/parent/capacity/cycle rejection; provider states never alter Cloudflare',()=>{
 const m=menu();for(const plan of before.plans)for(const phase of ['connected','disconnected','connecting','reconnect']){
 const original=[{id:'redown'},...plan.projection.entries,{id:'redown-manage',parentId:'redown'}];const f=m.fragment({phase,folderId:'folder'},'redown');const result=m.compose(original,f,'redown');assert.deepEqual(result.filter(e=>!m.owns(e.id)),original);assert.equal(result.filter(e=>e.id==='redown').length,1);assert.equal(result.find(e=>e.id==='provider:google-drive').parentId,'redown');assert.equal(new Set(result.map(e=>e.id)).size,result.length);assert.ok(result.findIndex(e=>e.id==='provider:google-drive')>result.findIndex(e=>String(e.id).startsWith('v3:provider:cloudflare')));assert.equal(result.at(-1).id,'redown-manage');assert.deepEqual(m.compose(original,f,'redown'),result);
 for(const entries of [[{id:'redown',parentId:'redown'}],[{id:'provider:google-drive',parentId:'missing'}],[...f.entries,f.entries[1]],[f.entries[0],{id:'provider:google-drive:cycle',parentId:'provider:google-drive:cycle'}],[f.entries[0],{id:'v3:evil',parentId:f.entries[0].id}],Array(1001).fill(f.entries[0])])assert.equal(m.compose(original,{providerId:'google-drive',entries},'redown'),original);
 }
});
test('actual Google click early return never resolves Cloudflare or invokes R2/dashboard even for unknown IDs',async()=>{
 const source=bg.slice(bg.indexOf('chrome.contextMenus.onClicked.addListener(async'),bg.indexOf('\nasync function saveResolvedRightClick'));
 let listener,calls=[];const m=menu();const c=vm.createContext({chrome:{contextMenus:{onClicked:{addListener:f=>listener=f}}},RedownGoogleDriveMenu:m,RedownGoogleDriveProvider:{dispatch:async info=>calls.push(info.menuItemId)}});vm.runInContext(source,c);
 for(const id of ['provider:google-drive:connect','provider:google-drive:save-redown','provider:google-drive:unknown','provider:google-drive'])await listener({menuItemId:id},{});assert.equal(calls.length,4);
 assert.equal((bg.match(/contextMenus\.onClicked\.addListener/g)||[]).length,1);
});
function fixture(opts={}){
 const store={},requests=[],uploaded=[],source=opts.source||Uint8Array.from([137,80,78,71,13,10,26,10,0,255]);let folder=null,file=null,account='account1',createCount=0,tokenCalls=0;
 const response=(body,status=200,headers={})=>new Response(body===null?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...headers}});
 const chrome={runtime:{id:opts.badId?'wrong-extension':'mkadkgpekmkknfbniacdlmgikihjjepf',getManifest:()=>({oauth2:{client_id:opts.badClient?'bad':'123-test.apps.googleusercontent.com',scopes:[SCOPE]}})},storage:{local:{get:async key=>({[key]:structuredClone(store[key])}),set:async patch=>Object.assign(store,structuredClone(patch))}},permissions:{contains:async()=>opts.permission!==false},identity:{getAuthToken:async()=>{tokenCalls++;if(opts.denied)throw Error('denied');return {token:'private-token',grantedScopes:opts.revoked?[]:[SCOPE]};},removeCachedAuthToken:async()=>{}}};
 async function fetch(url,o={}){
  requests.push({url,options:o});const u=new URL(url);
  if(u.hostname==='source.invalid'){assert.equal(o.headers,undefined);assert.equal(o.credentials,'omit');assert.equal(o.redirect,'error');if(opts.sourceError)throw Error('redirect');return new Response(source,{headers:{'Content-Type':opts.mime||'image/png',...(opts.unknownLength?{}:{'Content-Length':String(opts.size||source.length)})}});}
  assert.equal(u.origin,'https://www.googleapis.com');assert.equal(o.headers.Authorization,'Bearer private-token');
  if(opts.http)return response({},opts.http);
  if(u.pathname.endsWith('/about'))return response({user:{permissionId:account}});
  if(u.pathname.endsWith('/generateIds'))return response({ids:['folder-'+account]});
  if(u.pathname.endsWith('/files')&&o.method==='POST'&&!u.pathname.includes('/upload/')){createCount++;const b=JSON.parse(o.body);folder={...b,trashed:false};if(opts.ambiguousFolder&&createCount===1)throw Error('lost receipt');return response(folder);}
  if(u.pathname.endsWith('/files')&&!o.method)return response({files:folder?[folder]:[]});
  if(u.pathname.includes('/files/folder-'))return response(folder,folder?200:404);
  if(u.pathname.startsWith('/upload/')&&o.method==='POST'){const b=JSON.parse(o.body);assert.deepEqual(b.parents,[folder.id]);file={...b,id:'file1',size:String(source.length),trashed:false,sha256Checksum:createHash('sha256').update(source).digest('hex')};return response({},200,{location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=fixture'});}
  if(u.pathname.startsWith('/upload/')&&o.method==='PUT'){
   if(opts.uploadHttp)return response({},opts.uploadHttp);if(opts.interrupt)throw Error('connection lost');if(opts.abort){opts.controller.abort();throw Error('abort');}
   uploaded.push(new Uint8Array(o.body));const range=o.headers['Content-Range'],match=/bytes (\d+)-(\d+)\/(\d+)/.exec(range);assert.ok(match);const [,a,b,total]=match.map(Number);assert.equal(o.body.length,b-a+1);if(b+1<total){assert.equal(o.body.length%262144,0);return response(null,308,{Range:'bytes=0-'+b});}return response({id:'file1'});
  }
  if(u.pathname.endsWith('/files/file1'))return response({...file,...(opts.badReceipt?{size:'999'}:{})});throw Error('unexpected '+u.href);
 }
 return {store,requests,source,uploaded,chrome,fetch,drive:makeDrive({chrome,fetch,crypto:webcrypto}),get createCount(){return createCount;},setAccount:a=>{account=a;folder=null;},get tokenCalls(){return tokenCalls;}};
}
test('authorized scoped OAuth, serialized folder creation, reconnect reuse, worker/page restart and account isolation',async()=>{
 const f=fixture();await Promise.all([f.drive.connect(true),f.drive.connect(true)]);assert.equal(f.createCount,1);assert.equal(f.store.googleDriveState.phase,'connected');await makeDrive({chrome:f.chrome,fetch:f.fetch,crypto:webcrypto}).connect(false);assert.equal(f.createCount,1);assert.doesNotMatch(JSON.stringify(f.store),/private-token/);f.setAccount('account2');await f.drive.connect(true);assert.equal(f.createCount,2);assert.equal(Object.keys(f.store.googleDriveAccounts).length,2);await f.drive.disconnect();assert.equal(f.store.googleDriveState.phase,'disconnected');
});
test('ambiguous folder create reconciles preallocated ID without another creation',async()=>{const f=fixture({ambiguousFolder:true});await assert.rejects(f.drive.connect(true));await f.drive.connect(true);assert.equal(f.createCount,1);});
for(const opts of [{denied:true},{badClient:true},{badId:true},{revoked:true},{http:401},{http:403},{http:429},{http:500}])test('OAuth failure is recoverable and never connected '+JSON.stringify(opts),async()=>{const f=fixture(opts);await assert.rejects(f.drive.connect(true));assert.equal(f.store.googleDriveState.phase,'reconnect');});
for(const [name,source,mime] of [['PNG',Uint8Array.from([137,80,78,71,13,10,26,10,0,255]),'image/png'],['PDF',new TextEncoder().encode('%PDF-1.7\n%binary\n%%EOF'),'application/pdf'],['chunked',new Uint8Array(CHUNK+123).fill(207),'application/octet-stream']])test(name+' actual browser-client bytes, chunk alignment and verified receipt KEEP BOTH',async()=>{
 const f=fixture({source,mime});await f.drive.connect(true);for(let i=0;i<2;i++){f.uploaded.length=0;const progress=[];const result=await f.drive.upload('https://source.invalid/file.'+name,{signal:new AbortController().signal,onProgress:(...p)=>progress.push(p)});assert.equal(result.status,'completed');assert.equal(result.folderId,'folder-account1');assert.deepEqual(Buffer.concat(f.uploaded),Buffer.from(source));assert.equal(result.bytes,source.length);assert.ok(progress.length);}
 assert.equal(f.requests.filter(r=>r.options.method==='PATCH'||r.options.method==='DELETE').length,0);assert.equal(f.requests.filter(r=>r.url.includes('uploadType=resumable')).length,2);
});
for(const opts of [{interrupt:true},{badReceipt:true},{sourceError:true},{size:MAX_BYTES+1},{permission:false}])test('truthful upload failure '+JSON.stringify(opts),async()=>{const f=fixture(opts);await f.drive.connect(true);await assert.rejects(f.drive.upload('https://source.invalid/file',{signal:new AbortController().signal}),e=>['blocked','uncertain'].includes(e.status));});
test('abort never produces success and URL restrictions reject unsafe sources',async()=>{
 const controller=new AbortController(),f=fixture({abort:true,controller});await f.drive.connect(true);await assert.rejects(f.drive.upload('https://source.invalid/file',{signal:controller.signal}),e=>e.status==='cancelled');for(const url of ['blob:https://source.invalid/id','http://source.invalid/file','https://user:pass@source.invalid/file','https://127.0.0.1/x','https://localhost/x','file:///a'])assert.throws(()=>sourceURL(url));
 for(const p of ['extension/google-drive-api.mjs','extension/google-drive-transfer.mjs','extension/google-drive-provider.js'])assert.doesNotMatch(await read(p),/downloads\.download|writeFile|createWritable|cloudflare|workers\.dev/i,p);
});
test('Shelf connection control exact flow placement, keyboard native button and theme-neutral layout',async()=>{
 const dom=new JSDOM(await read('extension/shelf.html'));const d=dom.window.document,overview=d.querySelector('#clouds-view > section.overview'),control=d.querySelector('.google-drive-control');assert.ok(overview.children[0].matches('.destinations-heading'));assert.ok(overview.children[1].matches('.destinations-grid'));assert.equal(overview.children[1].querySelector('.google-drive-control'),control);assert.ok(overview.children[2].matches('.eyebrow'));assert.ok(overview.children[3].matches('h1.overview-title'));assert.equal(overview.children[1].querySelectorAll('.destination-tile').length,3);assert.equal(d.querySelector('#shelf-google-drive').tagName,'BUTTON');assert.equal(d.querySelector('#shelf-google-drive').type,'button');assert.equal(d.querySelector('#shelf-google-drive').getAttribute('aria-describedby'),'shelf-google-status');assert.match(await read('extension/google-drive-controls.css'),/focus-visible/);assert.doesNotMatch((await read('extension/google-drive-controls.css')).replace(/\.google-drive-button img \{[^}]+\}/,''),/position:\s*absolute|height:\s*\d+px/);dom.window.close();
});
const originalTests=await read('tests/right-click-v3.test.mjs');
const [domain,legacyModel,legacy,legacyEngine,currentSource]=await Promise.all(['extension/right-click-v3.js','extension/nested-locations.js','extension/destination-config.js','extension/right-click-legacy.js','extension/right-click-current.js'].map(read));
const helper=originalTests.slice(originalTests.indexOf('function background('),originalTests.indexOf("test('V3 save/register"));
const makeBackground=new Function('vm','bg','domain','legacyModel','legacy','legacyEngine','currentSource','webcrypto',helper+';return background;')(vm,bg,domain,legacyModel,legacy,legacyEngine,currentSource,webcrypto);
function background(local){const h=makeBackground(local);Object.assign(h.c,{performance,entryEvidence:()=>{},menuDiagnosticSalt:'fixture'});return h;}
test('actual shared native writer mode/provider races, restart, stale cache, partial API failure and recovery preserve root/manage and targets',async()=>{
 const base=before.plans[0],local={profiles:base.profiles,rightClickV3:base.state,rightClickV3Migration:{version:1},rightClickV3Presentation:base.style};
 const h=background(local);vm.runInContext(menuSource,h.c);
 for(const style of [{style:'simple'},{style:'nested',nested:'narrow',depth:1},{style:'nested',nested:'level',depth:2}])for(const phase of ['connected','connecting','reconnect','disconnected']){
   local.rightClickV3Presentation=style;local.googleDriveState={phase,folderId:'folder'};
   await Promise.all([h.c.rebuildMenus(),h.c.rebuildMenus()]);
   assert.equal(local.rightClickMenuStatus.state,'registered');assert.equal(new Set(h.native.map(e=>e.id)).size,h.native.length);
   const roots=h.native.filter(e=>e.parentId==='redown');assert.equal(roots.at(-1).id,'redown-manage');assert.ok(roots.findIndex(e=>e.id==='provider:google-drive')>roots.findIndex(e=>e.id.startsWith('v3:provider:cloudflare')));
   const expected=h.c.RedownRightClickV3.project({...local.rightClickV3,levelScopes:local.rightClickV3LevelScopes,activatedBuckets:local.rightClickActivatedBuckets},local.profiles,style,local.rightClickV3Inventory,'redown').entries;
   for(const entry of expected){const actual=h.native.find(e=>e.id===entry.id);for(const [k,v] of Object.entries(entry))assert.deepEqual(JSON.parse(JSON.stringify(actual[k])),JSON.parse(JSON.stringify(v)));}
 }
 const restart=background(structuredClone(local));vm.runInContext(menuSource,restart.c);await restart.c.rebuildMenus();assert.equal(restart.local.rightClickMenuStatus.state,'registered');assert.equal(restart.native.filter(e=>e.id==='redown').length,1);
 // Simulate Chrome losing destination IDs despite a surviving persisted cache.
 restart.native.splice(0,restart.native.length);await vm.runInContext('nativeMenuPlan=null;rebuildMenus()',restart.c);assert.ok(restart.native.some(e=>e.id==='provider:google-drive'));
 let rejected=false;const create=restart.c.chrome.contextMenus.create;restart.c.chrome.contextMenus.create=(item,cb)=>{if(!rejected&&item.id==='provider:google-drive:connect'){rejected=true;restart.c.chrome.runtime.lastError={message:'simulated native failure'};cb();restart.c.chrome.runtime.lastError=null;}else create(item,cb);};
 restart.local.googleDriveState={phase:'connected',folderId:'folder'};await restart.c.rebuildMenus();restart.local.googleDriveState={phase:'disconnected'};await assert.rejects(restart.c.rebuildMenus());assert.ok(restart.native.some(e=>e.id==='redown'));assert.ok(restart.native.some(e=>e.id==='redown-manage'));await restart.c.rebuildMenus();assert.equal(restart.local.rightClickMenuStatus.state,'registered');
});

for(const uploadHttp of [401,403,429,500])test('mid-upload HTTP '+uploadHttp+' never reports success or replays a file create',async()=>{const f=fixture({uploadHttp});await f.drive.connect(true);await assert.rejects(f.drive.upload('https://source.invalid/file',{signal:new AbortController().signal}),e=>['blocked','uncertain'].includes(e.status));assert.equal(f.requests.filter(r=>r.url.includes('uploadType=resumable')).length,1);if(uploadHttp===401)assert.equal(f.store.googleDriveState.phase,'reconnect');});
test('unknown-length overflow and HTML fail before any Drive upload',async()=>{for(const opts of [{source:new Uint8Array(MAX_BYTES+1),unknownLength:true},{mime:'text/html'}]){const f=fixture(opts);await f.drive.connect(true);await assert.rejects(f.drive.upload('https://source.invalid/file',{signal:new AbortController().signal}),e=>e.status==='blocked');assert.ok(!f.requests.some(r=>r.url.includes('/upload/')));}});
test('cross-page folder creation uses an extension-origin Web Lock',async()=>{const f=fixture();let queue=Promise.resolve(),locksUsed=0;const locks={request:(name,fn)=>{assert.equal(name,'redown-google-drive-connection');locksUsed++;const p=queue.then(fn);queue=p.catch(()=>{});return p;}};const a=makeDrive({chrome:f.chrome,fetch:f.fetch,crypto:webcrypto,locks}),b=makeDrive({chrome:f.chrome,fetch:f.fetch,crypto:webcrypto,locks});await Promise.all([a.connect(true),b.connect(true)]);assert.equal(locksUsed,2);assert.equal(f.createCount,1);});
test('provider receipt gate rejects untrusted pages and malformed success; history retains provider and verified file identity',async()=>{
 const records=[],c=vm.createContext({crypto:webcrypto,chrome:{runtime:{id:'extension',getURL:p=>'chrome-extension://extension/'+p},tabs:{query:async()=>[{}],onRemoved:{addListener(){}}}}});vm.runInContext(await read('extension/google-drive-provider.js'),c);const p=c.RedownGoogleDriveProvider;p.install(async r=>records.push(r));
 const receipt={status:'completed',fileId:'file1',folderId:'folder',bytes:10,name:'file.png'};
 assert.equal((await p.message({type:'googleDriveReceipt',receipt},{id:'evil',url:'https://evil.invalid'})).ok,false);assert.equal(records.length,0);
 const sender={id:'extension',url:'chrome-extension://extension/google-drive-transfer.html#session'};
 assert.equal((await p.message({type:'googleDriveReceipt',receipt:{...receipt,fileId:'https://evil.invalid'}},sender)).ok,false);
 assert.equal((await p.message({type:'googleDriveReceipt',receipt},sender)).ok,true);assert.equal(records[0].provider,'Google Drive');assert.equal(records[0].verified,true);assert.equal(records[0].destination.fileId,'file1');
});
test('repeated saves reuse the owned tab with a fresh job; active transfer is never replaced',async()=>{
 let tabs=[],store={},jobs=[],updates=[];const c=vm.createContext({crypto:webcrypto,chrome:{runtime:{getURL:p=>'chrome-extension://extension/'+p},storage:{local:{get:async k=>Object.fromEntries((Array.isArray(k)?k:[k]).map(key=>[key,store[key]]))},session:{set:async v=>jobs.push(v)}},tabs:{query:async()=>tabs,update:async(id,o)=>updates.push(o),create:async o=>{tabs=[{id:1,url:o.url}];}}}});vm.runInContext(await read('extension/google-drive-provider.js'),c);const p=c.RedownGoogleDriveProvider;
 await p.dispatch({menuItemId:'provider:google-drive:save-redown',srcUrl:'https://source.invalid/first'});assert.equal(jobs.length,1);await p.dispatch({menuItemId:'provider:google-drive:save-redown',srcUrl:'https://source.invalid/second'});assert.equal(jobs.length,2);assert.ok(updates[0].url.includes('?job='));store.googleDriveTransfer={status:'active'};await p.dispatch({menuItemId:'provider:google-drive:save-redown',srcUrl:'https://source.invalid/third'});assert.equal(jobs.length,2);assert.equal(updates.at(-1).url,undefined);
});
test('multi-account active Depth inventory keeps exact native entries, order and per-prefix actions across every Google state',async()=>{
 const receipt=JSON.parse(await read('docs/verification/google-drive/mode-parity.json'));const c=vm.createContext({TextEncoder});vm.runInContext(domain,c);const m=c.RedownRightClickV3,g=menu();
 for(const x of receipt.cases){assert.deepEqual(x.before,x.after);const projection=m.project(x.state,x.profiles,x.options,x.inventory,'redown',x.at);assert.deepEqual(JSON.parse(JSON.stringify(projection)),x.before.projection);for(const route of x.before.routes){const r=m.resolve(route.id,x.state,x.profiles,x.options,x.inventory,x.at);assert.deepEqual(r?JSON.parse(JSON.stringify({profileId:r.owner.id,accountId:r.profile.accountId,bucketName:r.profile.bucketName,prefix:r.prefix})):null,route.target);}
 for(const phase of ['connected','disconnected','connecting','reconnect']){const original=[{id:'redown'},...projection.entries,{id:'redown-manage',parentId:'redown'}];assert.deepEqual(g.compose(original,g.fragment({phase,folderId:'folder'},'redown'),'redown').filter(e=>!g.owns(e.id)),original);}}
});
