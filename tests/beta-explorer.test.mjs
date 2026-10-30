import {createBreadcrumbs,orderedBreadcrumbPath} from '../extension/beta/standard-breadcrumbs.mjs';
import {installRemoteDialog} from '../extension/beta/remote-dialog.mjs';
import {installTestItTools} from '../extension/beta/test-it-tools.mjs';
import {installTestIt} from '../extension/beta/test-it.mjs';
import {installTour} from '../extension/beta/tour.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createFileApi,location,prefix,name} from '../extension/beta/file-api.mjs';
import {createR2Adapter,previewType} from '../extension/beta/r2-adapter.mjs';
import {collectDroppedFiles} from '../extension/beta/dropped-files.mjs';
import {normalizeArchiveEntries,archiveFolder,archiveParent,archiveCrumbs,archiveAdjacent} from '../extension/beta/archive-browser.mjs';
const background=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const source={accountId:'fixture-account',bucketName:'disposable-fixture',prefix:''};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
import {fixture} from './helpers/beta-provider.mjs';
test('Beta launcher is separate; original Explorer and context-menu pipeline stay in place',async()=>{
  const html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8'),dom=new JSDOM(html);assert.match(dom.window.document.querySelector('#beta-explorer').textContent,/Beta Explorer/);assert.ok(dom.window.document.querySelector('#dashboard'));dom.window.close();
  const api=await readFile(new URL('../extension/beta/r2-adapter.mjs',import.meta.url),'utf8');assert.doesNotMatch(api,/file-engine/);assert.match(background,/chrome.contextMenus.onClicked.addListener/);
});
test('new API keeps exact prefix identities and rejects invalid locations/names',()=>{assert.equal(prefix('雪//'),'雪//');assert.throws(()=>location({}),/bucket/);assert.throws(()=>name('../bad'));assert.throws(()=>name(' trailing '),/spaces/);});
test('bucket, folder, metadata and Unicode content workflows run through the actual production Worker in memory',async()=>{
  const f=await fixture();assert.equal((await f.api.run('buckets',source)).data.buckets[0].name,source.bucketName);
  let r=await f.api.run('mkdir',{source,name:'雪 folder'});assert.equal(r.state,'completed');assert.ok(f.stored.has('雪 folder/.redown'));
  const payload=Buffer.from('Unicode bytes \0 payload 🌎'),file=new File([payload],'雪 #?.txt',{type:'text/plain'}),k='雪 folder/nested/雪 #?.txt';
  r=await f.api.run('upload',{source,file,key:k});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(hash(f.stored.get(k).bytes),hash(payload));assert.equal(f.stored.get(k).httpMetadata.contentType,'text/plain');assert.ok(![...f.stored.keys()].some(k=>k.startsWith('.redown-beta-uploads/')));
  r=await f.api.run('list',{source:{...source,prefix:'雪 folder/'}});assert.ok(r.data.entries.some(e=>e.folder&&e.key==='雪 folder/nested/'));
  r=await f.api.run('stat',{source,key:k});assert.equal(r.data.object.size,payload.length);
  r=await f.api.run('copy',{source,destination:{...source,prefix:'copies/'},entries:[{key:k}]});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(hash(f.stored.get('copies/雪 #?.txt').bytes),hash(payload));assert.ok(f.stored.has(k));
  r=await f.api.run('rename',{source,entry:{key:k},newName:'renamed.txt'});assert.equal(r.state,'completed',JSON.stringify(r));assert.ok(!f.stored.has(k));assert.equal(hash(f.stored.get('雪 folder/nested/renamed.txt').bytes),hash(payload));
  r=await f.api.run('move',{source,destination:{...source,prefix:'moved/'},entries:[{key:'雪 folder/nested/renamed.txt'}]});assert.equal(r.state,'completed');assert.ok(!f.stored.has('雪 folder/nested/renamed.txt'));assert.equal(hash(f.stored.get('moved/renamed.txt').bytes),hash(payload));
  r=await f.api.run('delete',{source,entries:[{key:'moved/renamed.txt'}]});assert.equal(r.state,'completed');assert.ok(!f.stored.has('moved/renamed.txt'));
});
test('zero bytes, 50 MiB and 51 MiB binary uploads retain bytes and forward File without client-side whole-file buffering',async()=>{
  const f=await fixture();for(const size of [0,50*1024*1024,51*1024*1024]){const bytes=Buffer.alloc(size,0xb7),file=new File([bytes],size?String(size)+'.zip':'empty.dat');file.arrayBuffer=()=>{throw Error('Client must not buffer entire file');};const r=await f.api.run('upload',{source,file,key:file.name});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(hash(f.stored.get(file.name).bytes),hash(bytes));assert.equal(f.requests.findLast(r=>r.options.method==='PUT').options.body,file);}
});
test('Keep Both is default; explicit skip and replace retain accurate bytes',async()=>{
  const f=await fixture();await f.bucket.put('a.txt','original');const file=new File(['replacement'],'a.txt');
  let r=await f.api.run('upload',{source,file,key:'a.txt'});
  assert.equal(r.state,'completed',JSON.stringify(r));
  assert.equal(f.stored.get('a (2).txt').bytes.toString(),'replacement');
  assert.equal(f.stored.get('a.txt').bytes.toString(),'original');
  r=await f.api.run('upload',{source,file,key:'a.txt',conflict:'skip'});
  assert.equal(r.state,'partial');assert.equal(f.stored.get('a.txt').bytes.toString(),'original');
  r=await f.api.run('upload',{source,file,key:'a.txt',conflict:'keep'});
  assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(f.stored.get('a (3).txt').bytes.toString(),'replacement');
  r=await f.api.run('upload',{source,file,key:'a.txt',conflict:'replace'});
  assert.equal(r.state,'completed');assert.equal(f.stored.get('a.txt').bytes.toString(),'replacement');
});
test('populated folder copy, rename and delete use ordinary prefix operations',async()=>{
  const f=await fixture();await f.bucket.put('tree/deep/a.bin','bytes');await f.bucket.put('tree/empty/',new Uint8Array());
  let r=await f.api.run('copy',{source,destination:{...source,prefix:'archive/'},entries:[{key:'tree/',folder:true}]});assert.equal(r.state,'completed');assert.equal(f.stored.get('archive/tree/deep/a.bin').bytes.toString(),'bytes');
  r=await f.api.run('rename',{source,entry:{key:'tree/',folder:true},newName:'renamed'});assert.equal(r.state,'completed',JSON.stringify(r));assert.ok(f.stored.has('renamed/deep/a.bin'));assert.ok(!f.stored.has('tree/deep/a.bin'));
  r=await f.api.run('delete',{source,entries:[{key:'renamed/',folder:true}]});assert.equal(r.state,'completed');assert.ok(![...f.stored.keys()].some(k=>k.startsWith('renamed/')));
});
test('TRUE REMOTE forwards only URL and explicit destination to original ingest, never fetches source bytes locally',async()=>{
  const f=await fixture(),r=await f.api.run('remoteIngest',{destination:{...source,prefix:'雪/'},url:'https://source.invalid/a.mp4'});assert.equal(r.state,'completed');assert.equal(f.requests.length,0);assert.equal(f.messages[0].type,'ingest');assert.equal(f.messages[0].prefix,'雪/');assert.deepEqual(f.messages[0].destination,{...source,accountName:'',prefix:'雪/'});
});
test('uncertain upload is never retried and retains recoverable staging identity',async()=>{
  const f=await fixture();f.disconnect();const r=await f.api.run('upload',{source,file:new File(['bytes'],'a'),key:'a'});assert.equal(r.state,'uncertain');assert.match(r.recoveryKey,/^\.redown-beta-uploads\//);assert.equal(f.requests.filter(r=>r.options.method==='PUT').length,1);assert.ok(!f.stored.has('a'));
});
test('batch cancellation stops remaining items and incomplete moves stay partial',async()=>{
  let count=0;const controller=new AbortController(),api=createFileApi({delete:async()=>{count++;controller.abort();return {completed:1};},move:async()=>({completed:0,copied:1,partialMove:true,errors:['Source retained']})});
  const r=await api.batch('delete',[{},{}],{signal:controller.signal});assert.equal(r.state,'partial');assert.equal(count,1);assert.equal((await api.run('move',{})).state,'partial');assert.equal((await api.run('unsupported',{})).state,'failed');
});
test('download completion requires Chrome completion; folder download fails honestly',async()=>{
  const f=await fixture();await f.bucket.put('a.txt','bytes');const states=[];const r=await f.api.run('download',{source,entry:{key:'a.txt'}},{onProgress:e=>states.push(e.phase)});assert.equal(r.state,'completed');assert.equal(r.data.downloadState,'complete');assert.ok(states.includes('download-complete'));assert.equal((await f.api.run('download',{source,entry:{key:'folder/',folder:true}})).state,'failed');
});
test('upload read-back detects corruption before touching the final destination',async()=>{
  const stored=new Map(),messages=[];const adapter=createR2Adapter({send:async m=>{messages.push(m);throw Error('Must not commit corrupt bytes');},http:{async request(path,options={}){
    if(options.method==='PUT'){stored.set('stage',true);return Response.json({success:true});}
    if(path.includes('/objects/'))return new Response('BAD');
    const u=new URL('https://fixture.invalid'+path),p=u.searchParams.get('prefix');return Response.json({success:true,result:{objects:p?.startsWith('.redown-beta-uploads/')?[{key:p,size:3}]:[]}});
  }}});
  const r=await createFileApi(adapter).run('upload',{source,file:new File(['OK!'],'a'),key:'a'});assert.equal(r.state,'uncertain');assert.match(r.error,/differs/);assert.equal(messages.length,0);
});
async function uiFixture({deletePreferences=null,saved=null,sendOverride=null,httpOverride=null,autoOpen=true,adapterSetup=null,previewPreferences={mode:'window',width:400},tourPreferences=null,autoLoadImages=true}={}){
  const f=await fixture();if(sendOverride||httpOverride){const original=f.adapter;const alternate=createR2Adapter({send:sendOverride?m=>sendOverride(m,f):undefined,http:httpOverride?httpOverride(f.http):f.http});for(const method of ['accounts','buckets','connectionStatus'])if(sendOverride)f.adapter[method]=alternate[method];if(httpOverride)f.adapter.list=alternate.list;}await f.bucket.put('root.txt','payload');await f.bucket.put('Photos/one.jpg','image');adapterSetup?.(f.adapter,f);
  const html=await readFile(new URL('../extension/beta/explorer.html',import.meta.url),'utf8'),ui=await readFile(new URL('../extension/beta/explorer.mjs',import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:'https://extension.fixture/beta/explorer.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};w.fetch=fetch;w.URL.createObjectURL=URL.createObjectURL;w.URL.revokeObjectURL=URL.revokeObjectURL;
  w.eval(await readFile(new URL('../extension/public-addresses.js',import.meta.url),'utf8'));
  w.createBreadcrumbs=createBreadcrumbs;w.orderedBreadcrumbPath=orderedBreadcrumbPath;w.installRemoteDialog=installRemoteDialog;w.installTestItTools=installTestItTools;w.installTestIt=installTestIt;w.installTour=installTour;w.collectDroppedFiles=collectDroppedFiles;Object.assign(w,{normalizeArchiveEntries,archiveFolder,archiveParent,archiveCrumbs,archiveAdjacent});w.prefix=prefix;w.name=name;w.previewType=previewType;w.createFileApi=createFileApi;w.createR2Adapter=()=>Object.fromEntries(Object.entries(f.adapter).map(([method,value])=>[method,typeof value==='function'?(input,options={})=>{
    // jsdom UI and Node fetch run in different realms; bridge cancellation only.
    if(options.signal&&!(options.signal instanceof AbortSignal)){const controller=new AbortController();if(options.signal.aborted)controller.abort();else options.signal.addEventListener('abort',()=>controller.abort(),{once:true});options={...options,signal:controller.signal};}
    return value(input,options);
  }:value]));const storage={betaExplorerDeletePreferences:deletePreferences,cloudflareAuth:{accessToken:'fixture',sessionId:'fixture'},betaExplorerLocation:saved,betaExplorerPreview:previewPreferences,betaExplorerTour:tourPreferences};f.storage=storage;w.chrome={storage:{local:{get:async key=>Object.fromEntries((Array.isArray(key)?key:[key]).map(k=>[k,storage[k]])),set:async values=>Object.assign(storage,values)},onChanged:{addListener(fn){f.authChanged=fn;}}}};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(value){this.returnValue=value;this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  w.document.querySelector('#dialog-confirm').addEventListener('click',e=>{e.preventDefault();w.document.querySelector('#dialog').close('ok');});
  if(autoLoadImages)new w.MutationObserver(()=>{if(!w.document)return;for(const img of w.document.querySelectorAll('#preview-content img:not([data-fixture-loaded])')){img.dataset.fixtureLoaded='true';Object.defineProperties(img,{complete:{value:true},naturalWidth:{value:100}});img.dispatchEvent(new w.Event('load'));}}).observe(w.document.body,{childList:true,subtree:true});
  w.eval(ui.replace(/^import .*;\n/gm,''));
  const settle=async fn=>{for(let i=0;i<600;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}assert.ok(fn(),'UI did not reach expected state');};
  await settle(()=>w.document.querySelector('#buckets button')||(!autoOpen&&['failed','unauthorized','disconnected','empty-buckets'].includes(w.document.querySelector('#dropzone').dataset.state)));if(autoOpen){await settle(()=>w.document.querySelector('[data-key="root.txt"]'));}else await settle(()=>!w.document.querySelector('#refresh').disabled);
  return {...f,dom,w,d:w.document,settle};
}
test('a fresh user gets Side Preview by default, while an existing Window preference remains respected',async()=>{
  const first=await uiFixture({previewPreferences:null});
  try{
    assert.equal(first.d.querySelector('#preview-mode').value,'side');
    assert.equal(first.storage.betaExplorerPreview.mode,'side');
    assert.equal(first.d.querySelector('#side-preview').hidden,false);
  }finally{first.dom.window.close();}
  const existing=await uiFixture({previewPreferences:{mode:'window',width:390}});
  try{
    assert.equal(existing.d.querySelector('#preview-mode').value,'window');
    assert.equal(existing.d.querySelector('#side-preview').hidden,true);
  }finally{existing.dom.window.close();}
});
test('actual Beta UI navigates, multi-selects, copies/pastes, renames, cancels deletion and creates folders through API',async()=>{
  const f=await uiFixture(),{d,w,settle}=f;
  try{
    d.querySelector('[data-key="root.txt"]').click();d.querySelector('#copy').click();d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]'));
    d.querySelector('#paste').click();await settle(()=>d.querySelector('[data-key="Photos/root.txt"]')&&!d.querySelector('#upload').disabled);assert.equal(f.stored.get('Photos/root.txt').bytes.toString(),'payload');assert.ok(f.stored.has('root.txt'));
    d.querySelector('[data-key="Photos/root.txt"]').click();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'F2',bubbles:true}));assert.ok(d.querySelector('#dialog').open);d.querySelector('#dialog-input').value='new 雪.txt';d.querySelector('#dialog-confirm').click();await settle(()=>d.querySelector('[data-key="Photos/new 雪.txt"]')&&!d.querySelector('#upload').disabled);assert.ok(!f.stored.has('Photos/root.txt'));
    d.querySelector('[data-key="Photos/new 雪.txt"]').click();d.querySelector('#delete').click();assert.ok(d.querySelector('#dialog').open);d.querySelector('#dialog-cancel').click();await settle(()=>!d.querySelector('#dialog').open);assert.ok(f.stored.has('Photos/new 雪.txt'));
    d.querySelector('#mkdir').click();d.querySelector('#dialog-input').value='Nested';d.querySelector('#dialog-confirm').click();await settle(()=>d.querySelector('[data-key="Photos/Nested/"]')&&!d.querySelector('#upload').disabled);assert.ok(f.stored.has('Photos/Nested/.redown'));
    d.querySelector('#files').dispatchEvent(new w.KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));assert.equal(d.querySelectorAll('.file[aria-selected=true]').length,3);
    d.querySelector('#filter').value='new 雪';d.querySelector('#filter').dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.file').length,1);
    d.querySelector('#view').click();assert.ok(d.querySelector('#files').classList.contains('grid'));
  }finally{f.dom.window.close();}
});
test('Beta UI disables folder downloads and uses the same API for context menu and keyboard commands',async()=>{
  const f=await uiFixture(),{d,w}=f;
  try{const folder=d.querySelector('[data-key="Photos/"]');folder.click();assert.equal(d.querySelector('#download').disabled,true);folder.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,clientX:10,clientY:10}));const copy=[...d.querySelectorAll('#context button')].find(b=>b.textContent==='Copy');copy.click();assert.match(d.querySelector('#status').textContent,/clipboard/);assert.ok(!d.querySelector('#paste').disabled);d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'x',ctrlKey:true,bubbles:true}));assert.match(d.querySelector('#status').textContent,/ready to move/);}finally{f.dom.window.close();}
});
test('same-folder copy keeps both and never destroys the source',async()=>{const f=await fixture();await f.bucket.put('a.txt','original');let r=await f.api.run('copy',{source,destination:source,entries:[{key:'a.txt'}]});assert.equal(r.state,'partial');r=await f.api.run('copy',{source,destination:source,entries:[{key:'a.txt'}],conflict:'keep'});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(f.stored.get('a (copy).txt').bytes.toString(),'original');assert.equal(f.stored.get('a.txt').bytes.toString(),'original');});
test('folder drag/drop invokes the same real move API and preserves file bytes',async()=>{const f=await uiFixture(),{d,w,settle}=f;try{const file=d.querySelector('[data-key="root.txt"]'),folder=d.querySelector('[data-key="Photos/"]'),transfer={setData(){},effectAllowed:''};file.click();const start=new w.Event('dragstart',{bubbles:true,cancelable:true});Object.defineProperty(start,'dataTransfer',{value:transfer});file.dispatchEvent(start);const drop=new w.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(drop,'dataTransfer',{value:transfer});folder.dispatchEvent(drop);await settle(()=>f.stored.has('Photos/root.txt')&&!d.querySelector('#upload').disabled);assert.equal(f.stored.get('Photos/root.txt').bytes.toString(),'payload');assert.ok(!f.stored.has('root.txt'));}finally{f.dom.window.close();}});
test('unusable page cursors fail rather than silently hiding files',async()=>{const adapter=createR2Adapter({send:async()=>({ok:true}),http:{request:async()=>Response.json({success:true,result:{objects:[],truncated:true}})}});assert.equal((await createFileApi(adapter).run('list',{source})).state,'failed');});

test('lost mutation messaging is uncertain and never replayed',async()=>{let calls=0;const api=createFileApi(createR2Adapter({send:async()=>{calls++;throw Error('Port closed');}}));const r=await api.run('delete',{source,entries:[{key:'a.txt'}]});assert.equal(r.state,'uncertain');assert.equal(calls,1);});


test('provider defaults, session preferences and operation overrides alter real request deadlines in precedence order',async()=>{
  const f=await fixture();
  await f.api.run('list',{source});assert.equal(f.requests.at(-1).options.timeoutMs,30000);
  f.api.setPreferences({requestTimeoutMs:45000,uploadTimeoutMs:65000,verificationTimeoutMs:55000});
  await f.api.run('list',{source});assert.equal(f.requests.at(-1).options.timeoutMs,45000);
  await f.api.run('list',{source},{requestTimeoutMs:75000});assert.equal(f.requests.at(-1).options.timeoutMs,75000);
  const result=await f.api.run('upload',{source,file:new File(['test'],'deadline.txt'),key:'deadline.txt'},{uploadTimeoutMs:85000});
  assert.equal(result.state,'completed',JSON.stringify(result));assert.equal(f.requests.findLast(r=>r.options.method==='PUT').options.timeoutMs,85000);
  assert.equal(f.api.getPreferences().uploadTimeoutMs,65000);const snapshot=f.api.getDefaults();snapshot.requestTimeoutMs=1;assert.equal(f.api.getDefaults().requestTimeoutMs,30000);
  f.api.setPreferences({});await f.api.run('list',{source});assert.equal(f.requests.at(-1).options.timeoutMs,30000);
});
test('unsupported, inactive, invalid and pagination configuration is rejected before dispatch',async()=>{
  const f=await fixture();
  for(const options of [{multipartThresholdMiB:50},{partSizeMiB:16},{requestTimeoutMs:0},{requestTimeoutMs:Infinity},{requestTimeoutMs:2147483648},{per_page:2000},{batchConcurrency:3},{previewMaxBytes:8}]){
    const before=f.requests.length;const r=await f.api.run('list',{source},options);assert.equal(r.state,'failed',JSON.stringify(options));assert.equal(f.requests.length,before);
  }
  assert.throws(()=>f.api.setPreferences({invented:1}),/Unsupported/);assert.throws(()=>f.api.setPreferences({batchConcurrency:0}),/positive/);
});
test('batch concurrency is effective, keeps input result order, and uncertain outcomes prevent further dispatch',async()=>{
  let active=0,peak=0,release;const gate=new Promise(resolve=>{release=resolve;});
  const configuration=createR2Adapter({}).configuration;
  const api=createFileApi({configuration,stat:async({index})=>{active++;peak=Math.max(peak,active);await gate;active--;return {index};}});
  api.setPreferences({batchConcurrency:2});const pending=api.batch('stat',[{index:0},{index:1},{index:2}],{batchConcurrency:3});
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(peak,3);release();const result=await pending;assert.deepEqual(result.results.map(r=>r.data.index),[0,1,2]);
  let count=0;const uncertain=createFileApi({delete:async()=>{count++;throw Object.assign(Error('Unknown outcome'),{uncertain:true});}});
  const partial=await uncertain.batch('delete',[{},{},{}]);assert.equal(count,1);assert.equal(partial.state,'partial');assert.equal(partial.processed,1);
});
test('message deadline overrides time out safe reads as failed and ambiguous writes as uncertain, without replay',async()=>{
  const sent=[];const api=createFileApi(createR2Adapter({send:m=>{sent.push(m);return new Promise(()=>{});}}));
  let r=await api.run('accounts',{}, {messageTimeoutMs:5});assert.equal(r.state,'failed');
  r=await api.run('delete',{source,entries:[{key:'a'}]},{messageTimeoutMs:5});assert.equal(r.state,'uncertain');assert.equal(sent.length,2);
  const controller=new AbortController();const pending=api.run('move',{source,destination:{...source,prefix:'dest/'},entries:[{key:'a'}]},{signal:controller.signal});await new Promise(resolve=>setTimeout(resolve,0));controller.abort();assert.equal((await pending).state,'uncertain');assert.equal(sent.length,3);
});
test('preview budget overrides affect real streamed reads, preserve bytes, and render HTML as text',async()=>{
  const f=await fixture();await f.bucket.put('page.html','<script>alert(1)</script>');
  let r=await f.api.run('preview',{source,entry:{key:'page.html'}},{previewMaxBytes:4});assert.equal(r.state,'failed');assert.match(r.error,/memory budget/);
  r=await f.api.run('preview',{source,entry:{key:'page.html'}},{previewMaxBytes:100});assert.equal(r.state,'completed');assert.equal(r.data.type,'text/plain');assert.equal(await (await fetch(r.data.url)).text(),'<script>alert(1)</script>');URL.revokeObjectURL(r.data.url);
  assert.equal((await f.api.run('preview',{source,entry:{key:'file.exe'}})).state,'failed');
});
test('300 MB restriction applies only to direct local upload, never to remote ingestion or download',async()=>{
  const f=await fixture();let r=await f.api.run('upload',{source,file:{size:300000001},key:'oversize'});assert.equal(r.state,'failed');assert.match(r.error,/300 MB/);assert.equal(f.requests.length,0);
  r=await f.api.run('remoteIngest',{destination:source,url:'https://source.invalid/huge.zip'});assert.equal(r.state,'completed');assert.equal(f.requests.length,0);
  await f.bucket.put('huge.zip','fixture');r=await f.api.run('download',{source,entry:{key:'huge.zip',size:5000000000}});assert.equal(r.state,'completed');
});
test('saved profiles are redacted, public URLs and explicit setup reuse production services',async()=>{
  const f=await fixture();let r=await f.api.run('profiles');assert.equal(r.data.profiles[0].prefix,'Photos/');assert.ok(!JSON.stringify(r).includes('must-not-leak'));assert.ok(!JSON.stringify(r).includes('workerUrl'));
  r=await f.api.run('prepareBucket',{source});assert.equal(r.data.verification.workerReachable,true);assert.ok(!JSON.stringify(r).includes('must-not-leak'));assert.equal(f.messages.at(-1).type,'cfProvision');
  r=await f.api.run('publicUrls',{source});assert.equal(r.data.addresses[0].base,'https://fixture.r2.dev');
  r=await f.api.run('transferHistory');assert.equal(r.data.history[0].ok,true);
});
test('Beta preferences, duplicate, saved destination and preview are working UI interactions',async()=>{
  const f=await uiFixture(),{d,w,settle}=f;
  try{
    d.querySelector('#preferences').click();assert.ok(d.querySelector('#preferences-dialog').open);d.querySelector('#pref-concurrency').value='2';d.querySelector('#pref-upload').value='450';d.querySelector('#preferences-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle(()=>!d.querySelector('#preferences-dialog').open);assert.match(d.querySelector('#status').textContent,/applied/);
    d.querySelector('[data-key="root.txt"]').click();d.querySelector('#duplicate').click();await settle(()=>f.stored.has('root (copy).txt')&&!d.querySelector('#upload').disabled);assert.equal(f.stored.get('root (copy).txt').bytes.toString(),'payload');
    d.querySelector('[data-key="root.txt"]').click();d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-dialog').open&&d.querySelector('#preview-content pre'));assert.equal(d.querySelector('#preview-content pre').textContent,'payload');d.querySelector('#preview-close').click();assert.equal(d.querySelector('#preview-content').children.length,0);
    d.querySelector('#profiles').value='0';d.querySelector('#profiles').dispatchEvent(new w.Event('change'));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]'));
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',altKey:true,bubbles:true}));await settle(()=>d.querySelector('[data-key="root.txt"]'));
  }finally{f.dom.window.close();}
});

function storedZip(entries) {
  const chunks = [], central = [];
  let offset = 0;
  for (const [name, value] of entries) {
    const nameBytes = new TextEncoder().encode(name), data = new TextEncoder().encode(value), local = new Uint8Array(30 + nameBytes.length + data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length); chunks.push(local);
    const header = new Uint8Array(46 + nameBytes.length), cv = new DataView(header.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true); header.set(nameBytes, 46); central.push(header);
    offset += local.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0), eocd = new Uint8Array(22), ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + eocd.length); let cursor = 0;
  for (const part of [...chunks, ...central, eocd]) { output.set(part, cursor); cursor += part.length; }
  return output;
}

test('ZIP inspection and individual extraction reuse the real production Worker, preserve paths and reject overwrite',async()=>{
  const f=await fixture();await f.bucket.put('book.zip',storedZip([['notes.txt','original archive bytes'],['nested/page.txt','deep bytes']]));
  const listed=await f.api.run('archiveEntries',{source,key:'book.zip'});assert.equal(listed.state,'completed',JSON.stringify(listed));assert.equal(listed.data.archive.entries.length,2);
  let r=await f.api.run('extractArchiveEntry',{source,key:'book.zip',entry:'nested/page.txt',destinationPrefix:'output/'});assert.equal(r.state,'completed');assert.equal(f.stored.get('output/nested/page.txt').bytes.toString(),'deep bytes');
  await f.bucket.put('output/notes.txt','keep existing');r=await f.api.run('extractArchiveEntry',{source,key:'book.zip',entry:'notes.txt',destinationPrefix:'output/'});assert.equal(r.state,'partial');assert.equal(f.stored.get('output/notes.txt').bytes.toString(),'keep existing');
});
test('archive dialog and destination chooser route actual extraction and copy through API',async()=>{
  const f=await uiFixture(),{d,w,settle}=f;
  try{
    d.querySelector('[data-key="root.txt"]').click();d.querySelector('#copy-to').click();await settle(()=>d.querySelector('#destination-dialog').open&&!d.querySelector('#destination-confirm').disabled);d.querySelector('#destination-prefix').value='Copies/';d.querySelector('#destination-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle(()=>f.stored.has('Copies/root.txt')&&!d.querySelector('#upload').disabled);assert.equal(f.stored.get('Copies/root.txt').bytes.toString(),'payload');assert.ok(f.stored.has('root.txt'));
    await f.bucket.put('book.zip',storedZip([['nested/one.txt','archive bytes']]));d.querySelector('#refresh').click();await settle(()=>d.querySelector('[data-key="book.zip"]')&&!d.querySelector('#upload').disabled);d.querySelector('[data-key="book.zip"]').click();d.querySelector('#archive').click();await settle(()=>d.querySelector('#archive-dialog').open&&!d.querySelector('#upload').disabled);d.querySelector('#archive-all').checked=true;d.querySelector('#archive-all').dispatchEvent(new w.Event('change'));d.querySelector('#archive-prefix').value='Extracted/';d.querySelector('#archive-extract').click();await settle(()=>f.stored.has('Extracted/nested/one.txt')&&!d.querySelector('#upload').disabled);assert.equal(f.stored.get('Extracted/nested/one.txt').bytes.toString(),'archive bytes');assert.ok(f.stored.has('book.zip'));
  }finally{f.dom.window.close();}
});
test('verification deadline and inactivity overrides interrupt stalled read-back without replay or final commit',async()=>{
  for(const mode of ['idle','deadline']){
    let puts=0,commits=0,cancelled=false;
    const http={async boundedFetch(url,options){assert.equal(url,profile.workerUrl);assert.equal(JSON.parse(options.body).action,'capabilities');return worker.fetch(new Request(url,options),{STORAGE:bucket});},async request(path,options={}){
      if(options.method==='PUT'){puts++;return Response.json({success:true});}
      if(path.includes('/objects/'))return new Response(new ReadableStream({cancel(){cancelled=true;}}));
      const p=new URL('https://fixture'+path).searchParams.get('prefix');return Response.json({success:true,result:{objects:p.startsWith('.redown-beta-uploads/')?[{key:p,size:1}]:[]}});
    }};
    const api=createFileApi(createR2Adapter({http,send:async()=>{commits++;return {ok:true};}}));
    const options=mode==='idle'?{verificationIdleTimeoutMs:5,verificationTimeoutMs:100}:{verificationIdleTimeoutMs:100,verificationTimeoutMs:5};
    const result=await api.run('upload',{source,file:new File(['x'],'x.txt'),key:'x.txt'},options);assert.equal(result.state,'uncertain');assert.equal(puts,1);assert.equal(commits,0);assert.equal(cancelled,true);assert.ok(result.recoveryKey);
  }
});
test('observer exceptions never turn confirmed provider changes into failed operations',async()=>{
  let writes=0;const api=createFileApi({delete:async()=>{writes++;return {completed:1};}});const result=await api.batch('delete',[{},{}],{onProgress(){throw Error('UI disconnected');}});assert.equal(result.state,'completed');assert.equal(writes,2);
});

test('dropped directory traversal consumes every reader batch and preserves nested paths without reading payloads',async()=>{
  const a=new File(['a'],'雪.txt'),b=new File(['b'],'b.txt');a.arrayBuffer=b.arrayBuffer=()=>{throw Error('Do not buffer payloads while selecting files');};
  const fileEntry=file=>({name:file.name,isFile:true,file(resolve){resolve(file);}});
  const directory=(name,batches)=>({name,isDirectory:true,createReader(){let index=0;return {readEntries(resolve){resolve(batches[index++]||[]);}};}});
  const folder=directory('Root',[[fileEntry(a)],[directory('Deep',[[fileEntry(b)]])]]);
  const result=await collectDroppedFiles([{kind:'file',webkitGetAsEntry:()=>folder}]);assert.deepEqual(result.map(e=>e.relativePath).sort(),['Root/Deep/b.txt','Root/雪.txt']);assert.equal(result.find(e=>e.relativePath.endsWith('雪.txt')).file,a);
  const controller=new AbortController();controller.abort();await assert.rejects(collectDroppedFiles([{kind:'file',webkitGetAsEntry:()=>folder}],[],{signal:controller.signal}),{name:'AbortError'});
});
test('progress frequency preferences change real verification callbacks',async()=>{
  const counts=[];
  for(const interval of [0,100000]){
    const f=await fixture(),original=f.http.request;f.http.request=async(path,options={})=>{if(path.includes('/objects/')&&!options.method)return new Response(new ReadableStream({start(controller){for(const byte of [65,66,67,68])controller.enqueue(Uint8Array.of(byte));controller.close();}}));return original(path,options);};
    let count=0;const r=await f.api.run('upload',{source,file:new File(['ABCD'],'count.txt'),key:'count.txt'},{progressIntervalMs:interval,onProgress:event=>{if(event.phase==='verifying')count++;}});assert.equal(r.state,'completed',JSON.stringify(r));counts.push(count);
  }
  assert.deepEqual(counts,[4,2]);
});

test('text preview defaults are bounded, and the text byte override changes actual returned content',async()=>{
  const f=await fixture();await f.bucket.put('notes.txt','ABCDEFGH');
  let r=await f.api.run('preview',{source,entry:{key:'notes.txt'}},{textPreviewMaxBytes:4});assert.equal(r.state,'completed');assert.equal(r.data.truncated,true);assert.equal(await (await fetch(r.data.url)).text(),'ABCD');URL.revokeObjectURL(r.data.url);
  r=await f.api.run('preview',{source,entry:{key:'notes.txt'}},{textPreviewMaxBytes:16});assert.equal(r.data.truncated,false);assert.equal(await (await fetch(r.data.url)).text(),'ABCDEFGH');URL.revokeObjectURL(r.data.url);
});
test('dropping a directory on Beta uploads nested file bytes through the universal API',async()=>{
  const f=await uiFixture(),{d,w,settle}=f;
  try{
    const file=new File(['dropped bytes'],'雪.txt');let read=false;
    const directory={name:'Dropped',isDirectory:true,createReader(){return {readEntries(resolve){resolve(read?[]:[{name:file.name,isFile:true,file:resolve=>resolve(file)}]);read=true;}};}};
    const event=new w.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:{items:[{kind:'file',webkitGetAsEntry:()=>directory}],files:[]}});d.querySelector('#dropzone').dispatchEvent(event);
    await settle(()=>f.stored.has('Dropped/雪.txt')&&!d.querySelector('#upload').disabled);assert.equal(f.stored.get('Dropped/雪.txt').bytes.toString(),'dropped bytes');assert.ok(f.requests.some(r=>r.options.method==='PUT'));
  }finally{f.dom.window.close();}
});


test('startup automatically opens the sole bucket and persists folder navigation without provisioning',async()=>{
  const f=await uiFixture();try{assert.ok(f.d.querySelector('[data-key="root.txt"]'));assert.equal(f.storage.betaExplorerLocation.bucketName,source.bucketName);f.d.querySelector('[data-key="Photos/"]').dispatchEvent(new f.w.MouseEvent('dblclick',{bubbles:true}));await f.settle(()=>f.storage.betaExplorerLocation.prefix==='Photos/');assert.ok(!f.messages.some(m=>m.type==='cfProvision'));}finally{f.dom.window.close();}
});
test('startup restores an accessible saved bucket and folder',async()=>{
  const f=await uiFixture({saved:{...source,prefix:'Photos/'},autoOpen:false});try{await f.settle(()=>f.d.querySelector('[data-key="Photos/one.jpg"]'));assert.equal(f.d.querySelector('#heading').textContent,source.bucketName);assert.ok(!f.d.querySelector('[data-key="root.txt"]'));}finally{f.dom.window.close();}
});
test('multiple accounts are discovered and a sole bucket in the second account opens automatically',async()=>{
  const f=await uiFixture({sendOverride:async m=>m.type==='cfAccounts'?{ok:true,accounts:[{id:'empty',name:'Empty'}, {id:source.accountId,name:'Fixture'}]}:m.type==='cfBuckets'?{ok:true,buckets:m.accountId==='empty'?[]:[{name:source.bucketName}]}:{ok:true,profiles:[]}});try{assert.equal(f.d.querySelector('#accounts').value,source.accountId);assert.ok(f.d.querySelector('[data-key="root.txt"]'));}finally{f.dom.window.close();}
});
test('multiple buckets present an immediate choice and Refresh works with no selected bucket',async()=>{
  let discoveries=0;const f=await uiFixture({autoOpen:false,sendOverride:async m=>m.type==='cfAccounts'?{ok:true,accounts:[{id:source.accountId}]}:m.type==='cfBuckets'?(discoveries++,{ok:true,buckets:[{name:source.bucketName},{name:'second-bucket'}]}):{ok:true,profiles:[]}});try{assert.equal(f.d.querySelectorAll('#buckets button').length,2);assert.match(f.d.querySelector('#empty').textContent,/Choose a bucket/);assert.equal(f.d.querySelector('#refresh').disabled,false);f.d.querySelector('#refresh').click();await f.settle(()=>discoveries===2&&!f.d.querySelector('#refresh').disabled);f.d.querySelector('#buckets button').click();await f.settle(()=>f.d.querySelector('[data-key="root.txt"]'));}finally{f.dom.window.close();}
});
test('authorization listing errors remain distinct from empty folders and Refresh recovers',async()=>{
  let denied=true;const f=await uiFixture({autoOpen:false,httpOverride:http=>({...http,request:async(...args)=>denied?Response.json({success:false},{status:403}):http.request(...args)})});try{await f.settle(()=>f.d.querySelector('#dropzone').dataset.state==='unauthorized');assert.match(f.d.querySelector('#empty').textContent,/authorization/);assert.ok(f.d.querySelector('#refresh').classList.contains('attention'));denied=false;f.d.querySelector('#refresh').click();await f.settle(()=>f.d.querySelector('[data-key="root.txt"]')&&!f.d.querySelector('#refresh').disabled);assert.equal(f.d.querySelector('#dropzone').dataset.state,'ready');}finally{f.dom.window.close();}
});
test('missing Worker setup blocks a GUI mutation before any write and Refresh never provisions',async()=>{
  const f=await uiFixture({sendOverride:async m=>m.type==='cfAccounts'?{ok:true,accounts:[{id:source.accountId}]}:m.type==='cfBuckets'?{ok:true,buckets:[{name:source.bucketName}]}:{ok:true,profiles:[]}});try{f.d.querySelector('[data-key="root.txt"]').click();f.d.querySelector('#duplicate').click();await f.settle(()=>/No file changes were sent/.test(f.d.querySelector('#status').textContent));assert.ok(!f.stored.has('root (copy).txt'));assert.ok(!f.messages.some(m=>['cfProvision','cfTransferObjects'].includes(m.type)));f.d.querySelector('#refresh').click();await f.settle(()=>/Live R2 contents refreshed/.test(f.d.querySelector('#status').textContent)&&!f.d.querySelector('#refresh').disabled);assert.equal(f.d.querySelector('#refresh').classList.contains('attention'),false);}finally{f.dom.window.close();}
});


test('a removed saved folder falls back to the live bucket root',async()=>{const f=await uiFixture({saved:{...source,prefix:'removed/'}});try{await f.settle(()=>f.storage.betaExplorerLocation.prefix==='');assert.ok(f.d.querySelector('[data-key="root.txt"]'));}finally{f.dom.window.close();}});
test('Beta refuses missing Worker provisioning while legacy preparation keeps its default behavior',async()=>{
  const start=background.indexOf('async function preparedProfile('),end=background.indexOf('async function callBucketWorker(',start);let deployments=0;
  const context=vm.createContext({getProfiles:async()=>[],workerAcceptsProfile:async()=>false,provisionCloudflareProfile:async()=>{deployments++;return {legacy:true};}});
  vm.runInContext(background.slice(start,end),context);
  await assert.rejects(context.preparedProfile('a','b','',false,null,true),/explicit setup/);assert.equal(deployments,0);
  assert.equal((await context.preparedProfile('a','b')).legacy,true);assert.equal(deployments,1);
});
test('Beta 401 Worker response is not repaired or replayed after readiness changes',async()=>{
  let calls=0,repairs=0;const context=vm.createContext({RedownCloudflareApi:{boundedFetch:async()=>{calls++;return Response.json({ok:false,error:'Unauthorized'},{status:401});}},preparedProfile:async()=>{repairs++;return {};}});
  const start=background.indexOf('async function callBucketWorker('),end=background.indexOf('async function expandExplorerEntries(',start);vm.runInContext(background.slice(start,end),context);
  await assert.rejects(context.callBucketWorker({workerUrl:'https://fixture.invalid',token:'fixture',betaNoRepair:true},{action:'transferBatch'}),/401/);assert.equal(calls,1);assert.equal(repairs,0);
});


test('unsupported formats do not advertise inline Preview in the context menu',async()=>{const f=await uiFixture();try{await f.bucket.put('program.exe','bytes');f.d.querySelector('#refresh').click();await f.settle(()=>f.d.querySelector('[data-key="program.exe"]')&&!f.d.querySelector('#refresh').disabled);const row=f.d.querySelector('[data-key="program.exe"]');row.dispatchEvent(new f.w.MouseEvent('contextmenu',{bubbles:true}));assert.ok(![...f.d.querySelectorAll('#context button')].some(b=>b.textContent==='Preview'));assert.ok([...f.d.querySelectorAll('#context button')].some(b=>b.textContent==='Download'));}finally{f.dom.window.close();}});


test('GUI upload, independent fixture SHA-256, rename, copy, nested move, download and deletion reconcile the file list',async()=>{
  const f=await uiFixture(),{d,w,settle}=f;
  try{
    const bytes=Buffer.alloc(51*1024*1024,0x6d),file=new File([bytes],'disposable-51MiB.bin');file.arrayBuffer=()=>{throw Error('UI must forward the File without buffering it');};
    Object.defineProperty(d.querySelector('#picker'),'files',{configurable:true,value:[file]});d.querySelector('#picker').dispatchEvent(new w.Event('change'));
    await settle(()=>d.querySelector('[data-key="disposable-51MiB.bin"]')&&!d.querySelector('#upload').disabled);
    assert.equal(hash(f.stored.get(file.name).bytes),hash(bytes));
    d.querySelector('[data-key="disposable-51MiB.bin"]').click();d.querySelector('#rename').click();d.querySelector('#dialog-input').value='renamed.bin';d.querySelector('#dialog-confirm').click();await settle(()=>d.querySelector('[data-key="renamed.bin"]')&&!d.querySelector('#upload').disabled);
    d.querySelector('[data-key="renamed.bin"]').click();d.querySelector('#duplicate').click();await settle(()=>d.querySelector('[data-key="renamed (copy).bin"]')&&!d.querySelector('#upload').disabled);
    d.querySelector('[data-key="renamed (copy).bin"]').click();d.querySelector('#cut').click();d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]'));d.querySelector('#paste').click();await settle(()=>d.querySelector('[data-key="Photos/renamed (copy).bin"]')&&!d.querySelector('#upload').disabled);
    assert.equal(hash(f.stored.get('Photos/renamed (copy).bin').bytes),hash(bytes));assert.ok(!f.stored.has('renamed (copy).bin'));
    d.querySelector('[data-key="Photos/renamed (copy).bin"]').click();d.querySelector('#download').click();await settle(()=>/Chrome reports download complete/.test(d.querySelector('#status').textContent)&&!d.querySelector('#upload').disabled);
    d.querySelector('#delete').click();d.querySelector('#dialog-confirm').click();await settle(()=>!f.stored.has('Photos/renamed (copy).bin')&&!d.querySelector('#upload').disabled);assert.ok(!d.querySelector('[data-key="Photos/renamed (copy).bin"]'));assert.equal(hash(f.stored.get('renamed.bin').bytes),hash(bytes));
    assert.ok(f.messages.filter(m=>['cfTransferObjects','cfRenameEntry','cfDeleteObjects'].includes(m.type)).every(m=>m.betaNoProvision===true));
  }finally{f.dom.window.close();}
});


// Bucket navigation regressions use distinct REST data for each bucket, rather
// than the historical single-bucket store shared by the operation fixtures.
const twoBuckets=async m=>m.type==='cfAccounts'?{ok:true,accounts:[{id:source.accountId}]}:m.type==='cfBuckets'?{ok:true,buckets:[{name:'1234'},{name:'12345'}]}:{ok:true,profiles:[]};
function bucketResponse(path){
  const url=new URL('https://fixture'+path),bucket=url.pathname.split('/buckets/')[1].split('/')[0],p=url.searchParams.get('prefix')||'';
  return Response.json({success:true,result:[{key:p+bucket+'.txt',size:bucket==='1234'?4:5}],result_info:{delimited:p?[]:['Folder/']}});
}
test('sidebar A/B/A, folder Refresh, history, selection and context Download keep the exact bucket',async()=>{
  let discoveries=0;const paths=[],downloads=[];
  const f=await uiFixture({autoOpen:false,adapterSetup:adapter=>{adapter.download=async input=>{downloads.push(input);return {downloadState:'complete'};};},sendOverride:async m=>{if(m.type==='cfBuckets')discoveries++;return twoBuckets(m);},httpOverride:http=>({...http,request:async path=>{paths.push(path);return bucketResponse(path);}})});
  const {d,w,settle}=f;const click=b=>d.querySelector(`[data-bucket="${b}"]`).click();
  try{
    for(const b of ['1234','12345','1234']){click(b);await settle(()=>d.querySelector(`[data-key="${b}.txt"]`));assert.equal(d.querySelectorAll('.file:not(.folder)').length,1);assert.equal(d.querySelector('#heading').textContent,b);assert.equal(d.querySelector('[aria-current]').dataset.bucket,b);}
    d.querySelector('[data-key="Folder/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Folder/1234.txt"]'));
    d.querySelector('[data-key="Folder/1234.txt"]').click();const before=paths.length;d.querySelector('#refresh').click();await settle(()=>paths.length>before&&!d.querySelector('#refresh').disabled);
    assert.equal(discoveries,1);assert.equal(f.storage.betaExplorerLocation.prefix,'Folder/');assert.equal(new URL('https://fixture'+paths.at(-1)).searchParams.get('prefix'),'Folder/');assert.equal(d.querySelector('[data-key="Folder/1234.txt"]').getAttribute('aria-selected'),'true');assert.equal(d.querySelector('#refresh').classList.contains('attention'),false);
    d.querySelector('[data-key="Folder/1234.txt"]').dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true}));[...d.querySelectorAll('#context button')].find(b=>b.textContent==='Download').click();await settle(()=>downloads.length===1&&!d.querySelector('#download').disabled);assert.equal(downloads[0].source.bucketName,'1234');assert.equal(downloads[0].entry.key,'Folder/1234.txt');
    d.querySelector('#back').click();await settle(()=>d.querySelector('[data-key="1234.txt"]'));d.querySelector('#back').click();await settle(()=>d.querySelector('[data-key="12345.txt"]'));assert.equal(d.querySelector('[aria-current]').dataset.bucket,'12345');
    assert.ok(!f.messages.some(m=>m.type==='cfProvision'));
  }finally{f.dom.window.close();}
});
test('slow bucket success and failure cannot overwrite a newer bucket or its saved location',async()=>{
  for(const rejectOld of [false,true]){
    let release;const f=await uiFixture({autoOpen:false,sendOverride:twoBuckets,httpOverride:http=>({...http,request:path=>path.includes('/1234/')?new Promise((resolve,reject)=>{release=()=>rejectOld?reject(Error('old network failure')):resolve(bucketResponse(path));}):Promise.resolve(bucketResponse(path))})});
    try{const {d,settle}=f;d.querySelector('[data-bucket="1234"]').click();await settle(()=>release);assert.equal(d.querySelector('[data-bucket="12345"]').disabled,false);d.querySelector('[data-bucket="12345"]').click();await settle(()=>d.querySelector('[data-key="12345.txt"]'));release();await new Promise(r=>setTimeout(r,20));assert.equal(d.querySelector('#heading').textContent,'12345');assert.ok(!d.querySelector('[data-key="1234.txt"]'));assert.equal(f.storage.betaExplorerLocation.bucketName,'12345');assert.equal(d.querySelector('#dropzone').dataset.state,'ready');}finally{f.dom.window.close();}
  }
});
test('genuine empty bucket and network/400/403 failures stay distinct and retry in place',async()=>{
  for(const mode of ['empty','network','bad-cursor','denied']){
    let recover=false;const f=await uiFixture({autoOpen:false,httpOverride:http=>({...http,request:async path=>{
      if(recover)return http.request(path);
      if(mode==='empty')return Response.json({success:true,result:[],result_info:{}});
      if(mode==='network')throw Error('Failed to fetch');
      return Response.json({success:false,errors:[{code:mode==='bad-cursor'?10023:10000,message:mode==='bad-cursor'?'Continuation token is not valid.':'Permission denied'}]},{status:mode==='bad-cursor'?400:403});
    }})});
    try{const {d,settle}=f;assert.equal(d.querySelector('#dropzone').dataset.state,mode==='empty'?'ready':mode==='denied'?'unauthorized':'failed');if(mode==='empty')assert.match(d.querySelector('#empty').textContent,/empty/);if(mode==='bad-cursor')assert.match(d.querySelector('#status').textContent,/10023: Continuation token is not valid/);recover=true;d.querySelector('#refresh').click();await settle(()=>d.querySelector('[data-key="root.txt"]')&&!d.querySelector('#refresh').disabled);assert.equal(f.storage.betaExplorerLocation.bucketName,source.bucketName);assert.equal(d.querySelector('#refresh').classList.contains('attention'),false);}finally{f.dom.window.close();}
  }
});
test('Legacy listing envelopes retain folders, metadata and opaque continuation tokens',async()=>{
  for(const shape of ['array','nested','top-level']){
    const paths=[];const token='opaque+/= token';const adapter=createR2Adapter({http:{request:async path=>{
      paths.push(path);const next=paths.length===1?token:'';const objects=[{key:paths.length===1?'first.txt':'second.txt',size:7,uploaded:'2026-10-27'}],delimited=['Photos/'];
      return Response.json(shape==='array'?{success:true,result:objects,result_info:{cursor:next,delimited}}:shape==='nested'?{success:true,result:{objects,delimited,cursor:next}}:{objects,delimited,cursor:next});
    }}}),api=createFileApi(adapter);
    const a=await api.run('list',{source});assert.equal(a.state,'completed');assert.equal(a.data.cursor,token);assert.ok(a.data.entries.some(e=>e.folder&&e.key==='Photos/'));assert.equal(a.data.entries.find(e=>e.key==='first.txt').size,7);assert.equal(new URL('https://fixture'+paths[0]).searchParams.has('cursor'),false);assert.equal(new URL('https://fixture'+paths[0]).searchParams.get('per_page'),'1000');
    const b=await api.run('list',{source,cursor:a.data.cursor});assert.equal(b.state,'completed');assert.equal(b.data.cursor,'');assert.equal(new URL('https://fixture'+paths[1]).searchParams.get('cursor'),token);
  }
});
test('provider errors retain HTTP/code detail with secret and URL redaction',async()=>{
  const api=createFileApi(createR2Adapter({http:{request:async()=>Response.json({success:false,errors:[{code:10023,message:'Continuation token is not valid. Bearer private-token access_token=private-value https://private.invalid/?token=secret'}]},{status:400})}}));
  const r=await api.run('list',{source});assert.equal(r.state,'failed');assert.equal(r.code,'HTTP_400');assert.match(r.error,/10023: Continuation token is not valid/);assert.doesNotMatch(r.error,/private-token|private-value|private.invalid/);
});

test('Refresh updates metadata and prunes deleted selections without account rediscovery',async()=>{
  let size=7,deleted=false,discoveries=0;
  const f=await uiFixture({autoOpen:false,sendOverride:async m=>{if(m.type==='cfBuckets')discoveries++;return m.type==='cfAccounts'?{ok:true,accounts:[{id:source.accountId}]}:m.type==='cfBuckets'?{ok:true,buckets:[{name:source.bucketName}]}:{ok:true,profiles:[]};},httpOverride:http=>({...http,request:async()=>Response.json({success:true,result:[...(!deleted?[{key:'metadata.txt',size}]:[])]})})});
  try{const {d,settle}=f;d.querySelector('[data-key="metadata.txt"]').click();size=400;d.querySelector('#refresh').click();await settle(()=>d.querySelector('.file-size')?.textContent==='400 B'&&!d.querySelector('#refresh').disabled);assert.equal(d.querySelector('.file').getAttribute('aria-selected'),'true');deleted=true;d.querySelector('#refresh').click();await settle(()=>!d.querySelector('#refresh').disabled&&!d.querySelector('.file'));assert.equal(d.querySelector('#delete').disabled,true);assert.equal(discoveries,1);}finally{f.dom.window.close();}
});
test('expired listing credentials show authorization detail and connection recovery can retry discovery',async()=>{
  let expired=true,discoveries=0;const f=await uiFixture({autoOpen:false,sendOverride:async m=>{if(m.type==='cfBuckets')discoveries++;return m.type==='cfAccounts'?{ok:true,accounts:[{id:source.accountId}]}:m.type==='cfBuckets'?{ok:true,buckets:[{name:source.bucketName}]}:{ok:true,profiles:[]};},httpOverride:http=>({...http,request:async path=>expired?Response.json({success:false,errors:[{code:10000,message:'Authentication error'}]},{status:401}):http.request(path)})});
  try{const {d,settle}=f;assert.equal(d.querySelector('#dropzone').dataset.state,'unauthorized');assert.match(d.querySelector('#status').textContent,/401.*10000: Authentication error/);d.querySelector('#refresh').click();await settle(()=>discoveries===2&&!d.querySelector('#refresh').disabled);assert.equal(d.querySelector('#dropzone').dataset.state,'unauthorized');expired=false;d.querySelector('#refresh').click();await settle(()=>d.querySelector('[data-key="root.txt"]')&&!d.querySelector('#refresh').disabled);assert.equal(d.querySelector('#refresh').classList.contains('attention'),false);}finally{f.dom.window.close();}
});
test('session invalidation clears the old bucket and ignores its delayed response',async()=>{
  let release;const f=await uiFixture({autoOpen:false,sendOverride:twoBuckets,httpOverride:http=>({...http,request:path=>new Promise(resolve=>{release=()=>resolve(bucketResponse(path));})})});
  try{const {d,settle}=f;d.querySelector('[data-bucket="1234"]').click();await settle(()=>release);f.authChanged({cloudflareAuth:{oldValue:{sessionId:'old',accessToken:'fixture'},newValue:null}},'local');release();await new Promise(r=>setTimeout(r,20));assert.equal(d.querySelector('#dropzone').dataset.state,'disconnected');assert.equal(d.querySelectorAll('.file').length,0);assert.equal(d.querySelectorAll('#buckets button').length,0);assert.equal(d.querySelector('#refresh').classList.contains('attention'),true);}finally{f.dom.window.close();}
});

function switchPreview(f,mode){f.d.querySelector('#preview-mode').value=mode;f.d.querySelector('#preview-mode').dispatchEvent(new f.w.Event('change'));}
test('dual preview moves one loaded viewer between window and side without another read',async()=>{
  let reads=0;const f=await uiFixture({adapterSetup:a=>{const preview=a.preview;a.preview=(...args)=>{reads++;return preview(...args);};}});
  try{const {d,settle}=f;d.querySelector('[data-key="root.txt"]').click();d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-content pre'));const viewer=d.querySelector('#preview-content pre');assert.ok(d.querySelector('#preview-dialog').open);
    d.querySelector('#preview-mode-inline').value='side';d.querySelector('#preview-mode-inline').dispatchEvent(new f.w.Event('change'));
    assert.equal(d.querySelector('#preview-dialog').open,false);assert.equal(d.querySelector('#side-preview').hidden,false);assert.equal(d.querySelector('#side-preview pre'),viewer);assert.equal(reads,1);assert.equal(f.storage.betaExplorerPreview.mode,'side');
    switchPreview(f,'window');assert.ok(d.querySelector('#preview-dialog').open);assert.equal(d.querySelector('#preview-dialog pre'),viewer);assert.equal(reads,1);d.querySelector('#preview-close').click();assert.equal(d.querySelector('#preview-content').children.length,0);
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('side minimize, close, reopen, expand, resize keyboard, selection and saved settings work',async()=>{
  let reads=0;const f=await uiFixture({previewPreferences:{mode:'side',width:480},adapterSetup:a=>{const preview=a.preview;a.preview=(...args)=>{reads++;return preview(...args);};}});
  try{const {d,w,settle}=f;assert.equal(d.querySelector('#preview-mode').value,'side');assert.equal(d.querySelector('#file-workspace').style.getPropertyValue('--preview-width'),'480px');
    d.querySelector('[data-key="root.txt"]').click();await settle(()=>d.querySelector('#side-preview pre'));assert.equal(d.querySelector('#side-preview pre').textContent,'payload');
    d.querySelector('#preview-minimize').click();assert.ok(d.querySelector('#side-preview').classList.contains('minimized'));d.querySelector('#preview').click();assert.ok(!d.querySelector('#side-preview').classList.contains('minimized'));assert.equal(reads,1);
    d.querySelector('#preview-expand').click();assert.ok(d.querySelector('#file-workspace').classList.contains('preview-expanded'));d.querySelector('#preview-expand').click();assert.ok(!d.querySelector('#file-workspace').classList.contains('preview-expanded'));
    d.querySelector('#preview-divider').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(f.storage.betaExplorerPreview.width,504);
    d.querySelector('#preview-close').click();assert.equal(d.querySelector('#side-preview').hidden,true);assert.ok(!d.querySelector('#file-workspace').classList.contains('with-preview'));d.querySelector('#preview').click();await settle(()=>d.querySelector('#side-preview pre'));assert.equal(reads,2);
    d.querySelector('[data-key="Photos/"]').click();assert.match(d.querySelector('#preview-content').textContent,/Folder in/);assert.equal(d.querySelector('#preview-title').textContent,'Photos');assert.equal(d.querySelector('#preview').disabled,false);
    d.querySelector('[data-key="root.txt"]').dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true}));[...d.querySelectorAll('#context button')].find(b=>b.dataset.command==='preview').click();await settle(()=>d.querySelector('#side-preview pre'));assert.equal(d.querySelector('#preview-title').textContent,'root.txt');
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('side unsupported file metadata and Download fallback make no preview read',async()=>{
  let previews=0,downloads=0;const f=await uiFixture({adapterSetup:a=>{a.preview=()=>{previews++;throw Error('must not preview');};a.download=async()=>{downloads++;return {downloadState:'complete'};};}});
  try{const {d,settle}=f;await f.bucket.put('program.exe','binary');d.querySelector('#refresh').click();await settle(()=>d.querySelector('[data-key="program.exe"]'));switchPreview(f,'side');d.querySelector('[data-key="program.exe"]').click();assert.match(d.querySelector('#preview-content').textContent,/unavailable/);assert.match(d.querySelector('#preview-info').textContent,/6 B.*EXE/);d.querySelector('#preview-content button').click();await settle(()=>downloads===1&&!d.querySelector('#download').disabled);assert.equal(previews,0);assert.equal(d.querySelector('#dropzone').dataset.state,'ready');
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('rapid selections discard stale success/failure URLs, abort reads, and keep navigation unlocked',async()=>{
  for(const rejectOld of [false,true]){
    let release,oldSignal;const revoked=[];const f=await uiFixture({adapterSetup:a=>{const preview=a.preview;a.preview=(input,options)=>input.entry.key==='root.txt'?new Promise((resolve,reject)=>{oldSignal=options.signal;release=()=>rejectOld?reject(Error('old failure')):resolve({url:URL.createObjectURL(new Blob(['old'],{type:'text/plain'})),type:'text/plain',size:3});}):preview(input,options);}});
    try{const {d,settle}=f;const original=URL.revokeObjectURL;f.w.URL.revokeObjectURL=url=>{revoked.push(url);original(url);};switchPreview(f,'side');d.querySelector('[data-key="root.txt"]').click();await settle(()=>release);assert.equal(d.querySelector('#refresh').disabled,false);assert.equal(d.querySelector('#copy').disabled,false);d.querySelector('[data-key="Photos/"]').click();assert.equal(oldSignal.aborted,true);release();await new Promise(r=>setTimeout(r,20));assert.equal(d.querySelector('#preview-title').textContent,'Photos');assert.match(d.querySelector('#preview-content').textContent,/Folder/);assert.equal(revoked.length,rejectOld?0:1);assert.equal(d.querySelector('#dropzone').dataset.state,'ready');
    }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
  }
});
test('both modes render images PDF text video audio; side double click and previous/next share renderer',async()=>{
  const f=await uiFixture();try{const {d,w,settle}=f;const files=[['a.jpg','img'],['b.pdf','iframe'],['c.txt','pre'],['d.mp4','video'],['e.mp3','audio']];for(const [key] of files)await f.bucket.put(key,'fixture payload');d.querySelector('#refresh').click();await settle(()=>d.querySelector('[data-key="a.jpg"]'));
    for(const mode of ['window','side']){switchPreview(f,mode);for(const [key,tag] of files){d.querySelector('[data-key="'+key+'"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('#preview-title').textContent===key&&d.querySelector('#preview-content '+tag));assert.equal(d.querySelector('#preview-dialog').open,mode==='window');if(mode==='window')d.querySelector('#preview-close').click();} }
    d.querySelector('[data-key="a.jpg"]').click();await settle(()=>d.querySelector('#preview-content img'));d.querySelector('#preview-next').click();await settle(()=>d.querySelector('#preview-title').textContent==='b.pdf'&&d.querySelector('#preview-content iframe'));d.querySelector('#preview-previous').click();await settle(()=>d.querySelector('#preview-title').textContent==='a.jpg');
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('side preview failure remains local, retry works, and corrupt media shows Download',async()=>{
  let fail=true;const f=await uiFixture({adapterSetup:a=>{const preview=a.preview;a.preview=(...args)=>fail?Promise.reject(Error('Configured preview memory budget exceeded')):preview(...args);}});
  try{const {d,w,settle}=f;switchPreview(f,'side');d.querySelector('[data-key="root.txt"]').click();await settle(()=>/memory budget/.test(d.querySelector('#preview-content').textContent));assert.equal(d.querySelector('#dropzone').dataset.state,'ready');assert.equal(d.querySelector('#copy').disabled,false);fail=false;d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-content pre'));d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]'));d.querySelector('[data-key="Photos/one.jpg"]').click();await settle(()=>d.querySelector('#preview-content img'));d.querySelector('#preview-content img').dispatchEvent(new w.Event('error'));assert.match(d.querySelector('#preview-content').textContent,/damaged/);assert.ok(d.querySelector('#preview-content button'));
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('bucket changes and logout invalidate pending side preview including minimized content',async()=>{
  let release;const f=await uiFixture({autoOpen:false,sendOverride:twoBuckets,httpOverride:http=>({...http,request:async path=>bucketResponse(path)}),adapterSetup:a=>{a.preview=()=>new Promise(resolve=>{release=()=>resolve({url:URL.createObjectURL(new Blob(['old'])),type:'text/plain',size:3});});}});
  try{const {d,settle}=f;d.querySelector('[data-bucket="1234"]').click();await settle(()=>d.querySelector('[data-key="1234.txt"]'));switchPreview(f,'side');d.querySelector('[data-key="1234.txt"]').click();await settle(()=>release);d.querySelector('#preview-minimize').click();d.querySelector('[data-bucket="12345"]').click();await settle(()=>d.querySelector('[data-key="12345.txt"]'));release();await new Promise(r=>setTimeout(r,20));assert.ok(!d.querySelector('#preview-content pre'));assert.equal(d.querySelector('#preview-title').textContent,'File preview');f.authChanged({cloudflareAuth:{oldValue:{sessionId:'old',accessToken:'fixture'},newValue:null}},'local');assert.equal(d.querySelector('#preview-content').children.length,0);
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('pointer divider respects list/pane bounds and persists width; media cleanup revokes only owned URLs',async()=>{
  const f=await uiFixture();try{const {d,w,settle}=f;switchPreview(f,'side');const divider=d.querySelector('#preview-divider');let capture;divider.setPointerCapture=id=>{capture=id;};d.querySelector('#file-workspace').getBoundingClientRect=()=>({right:1000,width:1000});divider.onpointerdown({button:0,preventDefault(){},currentTarget:divider,pointerId:7});assert.equal(capture,7);divider.onpointermove({clientX:10});assert.equal(d.querySelector('#file-workspace').style.getPropertyValue('--preview-width'),'710px');divider.onpointermove({clientX:990});assert.equal(d.querySelector('#file-workspace').style.getPropertyValue('--preview-width'),'280px');divider.onpointerup();assert.equal(f.storage.betaExplorerPreview.width,280);
    await f.bucket.put('song.mp3','fixture');d.querySelector('#refresh').click();await settle(()=>d.querySelector('[data-key="song.mp3"]'));const revoked=[];f.w.URL.revokeObjectURL=url=>{revoked.push(url);URL.revokeObjectURL(url);};d.querySelector('[data-key="song.mp3"]').click();await settle(()=>d.querySelector('#preview-content audio'));const media=d.querySelector('#preview-content audio'),url=media.src;let pauses=0,loads=0;media.pause=()=>pauses++;media.load=()=>loads++;d.querySelector('#preview-minimize').click();assert.equal(pauses,1);assert.equal(loads,0);assert.equal(revoked.length,0);d.querySelector('#preview').click();assert.equal(d.querySelector('#preview-content audio'),media);d.querySelector('#preview-close').click();assert.equal(pauses,2);assert.equal(loads,1);assert.equal(media.hasAttribute('src'),false);assert.deepEqual(revoked,[url]);
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('truncation is explicit in shared preview metadata and survives mode changes',async()=>{
  const f=await uiFixture({adapterSetup:a=>{a.preview=async()=>({url:URL.createObjectURL(new Blob(['bounded text'],{type:'text/plain'})),type:'text/plain',size:12,truncated:true});}});
  try{const {d,settle}=f;d.querySelector('[data-key="root.txt"]').click();d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-content pre'));assert.match(d.querySelector('#preview-info').textContent,/Text preview truncated at 12 B/);switchPreview(f,'side');assert.equal(d.querySelector('#side-preview pre').textContent,'bounded text');assert.match(d.querySelector('#preview-info').textContent,/truncated/);
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('side preview stays usable through copy, rename, Refresh and deleted selection pruning',async()=>{
  const f=await uiFixture();try{const {d,settle}=f;switchPreview(f,'side');d.querySelector('[data-key="root.txt"]').click();await settle(()=>d.querySelector('#side-preview pre'));d.querySelector('#copy').click();assert.equal(d.querySelector('#paste').disabled,false);d.querySelector('#rename').click();d.querySelector('#dialog-input').value='renamed.txt';d.querySelector('#dialog-confirm').click();await settle(()=>d.querySelector('[data-key="renamed.txt"]')&&!d.querySelector('#upload').disabled);assert.ok(!d.querySelector('#side-preview pre'));d.querySelector('[data-key="renamed.txt"]').click();await settle(()=>d.querySelector('#side-preview pre'));assert.equal(d.querySelector('#preview-title').textContent,'renamed.txt');await f.bucket.delete('renamed.txt');d.querySelector('#refresh').click();await settle(()=>!d.querySelector('#refresh').disabled);assert.ok(!d.querySelector('#side-preview pre'));assert.equal(d.querySelector('#preview-title').textContent,'File preview');assert.equal(d.querySelector('#side-preview').hidden,false);assert.equal(d.querySelector('#dropzone').dataset.state,'ready');
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});

const previewKey=(f,key,target=f.d)=>target.dispatchEvent(new f.w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
async function imageNavigationFixture(options={}){
  const f=await uiFixture(options);
  for(const key of ['a.jpg','b.exe','c.pdf','d.png','e.mp4','f.webp','g.gif'])await f.bucket.put(key,'fixture');
  f.d.querySelector('#refresh').click();await f.settle(()=>f.d.querySelector('[data-key="g.gif"]'));
  f.d.querySelector('[data-key="a.jpg"]').dispatchEvent(new f.w.MouseEvent('dblclick',{bubbles:true}));
  await f.settle(()=>f.d.querySelector('#preview-content img'));return f;
}
test('Window arrows skip unsupported files and folders, respect visible sort/filter, boundaries and editable controls',async()=>{
  const f=await imageNavigationFixture();const {d,settle}=f;
  try{
    assert.equal(d.activeElement,d.querySelector('#preview-dialog'));previewKey(f,'ArrowLeft',d.activeElement);assert.equal(d.querySelector('#preview-title').textContent,'a.jpg');
    previewKey(f,'ArrowRight',d.querySelector('#preview-mode-inline'));assert.equal(d.querySelector('#preview-title').textContent,'a.jpg');
    previewKey(f,'ArrowRight');await settle(()=>d.querySelector('#preview-content iframe'));assert.equal(d.querySelector('#preview-title').textContent,'c.pdf');assert.ok(d.querySelector('#preview-lightbox').hidden);
    previewKey(f,'ArrowLeft');await settle(()=>d.querySelector('#preview-content img'));assert.equal(d.querySelector('#preview-title').textContent,'a.jpg');
    d.querySelector('#sort').value='name-desc';d.querySelector('#sort').dispatchEvent(new f.w.Event('change'));
    previewKey(f,'ArrowRight');assert.equal(d.querySelector('#preview-title').textContent,'a.jpg');previewKey(f,'ArrowLeft');await settle(()=>d.querySelector('#preview-content iframe'));
    d.querySelector('#preview-close').click();d.querySelector('#filter').value='.png';d.querySelector('#filter').dispatchEvent(new f.w.Event('input'));
    d.querySelector('[data-key="d.png"]').dispatchEvent(new f.w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('#preview-content img'));previewKey(f,'ArrowRight');previewKey(f,'ArrowLeft');assert.equal(d.querySelector('#preview-title').textContent,'d.png');
    previewKey(f,'Escape');assert.equal(d.querySelector('#preview-dialog').open,false);previewKey(f,'a',d.querySelector('#files'));d.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));assert.equal(d.querySelectorAll('.file[aria-selected=true]').length,1);
  }finally{d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('image lightbox reuses the same URL/node, skips non-images, handles backdrop and two-level Escape/cancel',async()=>{
  let reads=0;const f=await imageNavigationFixture({adapterSetup:a=>{const original=a.preview;a.preview=(...args)=>{reads++;return original(...args);};}});const {d,settle}=f,dialog=d.querySelector('#preview-dialog');
  try{
    const image=d.querySelector('#preview-content img'),url=image.src,open=d.querySelector('#preview-lightbox');assert.equal(open.nextElementSibling.id,'preview-close');assert.equal(open.hidden,false);assert.equal(open.disabled,false);
    open.click();assert.ok(dialog.classList.contains('image-lightbox'));assert.equal(d.querySelector('#preview-content img'),image);assert.equal(reads,1);image.click();assert.ok(dialog.classList.contains('image-lightbox'));
    previewKey(f,'ArrowRight');await settle(()=>d.querySelector('#preview-title').textContent==='d.png'&&d.querySelector('#preview-content img'));assert.ok(dialog.classList.contains('image-lightbox'));previewKey(f,'ArrowLeft');await settle(()=>d.querySelector('#preview-title').textContent==='a.jpg'&&d.querySelector('#preview-content img'));
    const last=d.querySelector('#preview-content img');previewKey(f,'Escape');assert.equal(dialog.classList.contains('image-lightbox'),false);assert.equal(dialog.open,true);assert.equal(d.querySelector('#preview-content img'),last);assert.equal(reads,3);assert.notEqual(last.src,url);
    open.click();d.querySelector('#preview-content').click();assert.equal(dialog.classList.contains('image-lightbox'),false);assert.equal(dialog.open,true);
    open.click();const cancel=new f.w.Event('cancel',{cancelable:true});dialog.dispatchEvent(cancel);assert.equal(cancel.defaultPrevented,true);assert.equal(dialog.classList.contains('image-lightbox'),false);assert.equal(dialog.open,true);
    previewKey(f,'Escape');assert.equal(dialog.open,false);assert.equal(d.querySelector('#preview-content').childElementCount,0);
  }finally{d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('rapid lightbox arrows abort old reads, revoke late URLs and preserve latest image and mode',async()=>{
  let release,signal;const revoked=[];
  const f=await imageNavigationFixture({adapterSetup:a=>{const original=a.preview;a.preview=(input,options)=>input.entry.key==='d.png'?new Promise(resolve=>{signal=options.signal;release=()=>resolve({url:URL.createObjectURL(new Blob(['old'])),type:'image/png',size:3});}):original(input,options);}});
  const {d,settle}=f;try{
    const original=URL.revokeObjectURL;f.w.URL.revokeObjectURL=url=>{revoked.push(url);original(url);};
    d.querySelector('#preview-lightbox').click();previewKey(f,'ArrowRight');await settle(()=>release);previewKey(f,'ArrowRight');await settle(()=>d.querySelector('#preview-title').textContent==='f.webp'&&d.querySelector('#preview-content img'));assert.equal(signal.aborted,true);
    const latest=d.querySelector('#preview-content img').src;release();await new Promise(r=>setTimeout(r,20));assert.equal(d.querySelector('#preview-content img').src,latest);assert.ok(d.querySelector('#preview-dialog').classList.contains('image-lightbox'));assert.equal(revoked.length,2);
    previewKey(f,'ArrowRight');await settle(()=>d.querySelector('#preview-title').textContent==='g.gif'&&d.querySelector('#preview-content img'));previewKey(f,'ArrowRight');assert.equal(d.querySelector('#preview-title').textContent,'g.gif');
    d.querySelector('#preview-close').click();assert.equal(revoked.length,4);assert.equal(d.querySelector('#preview-dialog').classList.contains('image-lightbox'),false);
  }finally{d.querySelector('#preview-close').click();f.dom.window.close();}
});

function tourMenu(f){f.d.querySelector('#explorer-menu-button').click();f.d.querySelector('#take-tour').click();}
function tourNext(f,count=1){for(let i=0;i<count;i++){const next=f.d.querySelector('[data-guide-next]');if(next.disabled)f.d.querySelector('[data-guide-skip]').click();else next.click();}}
test('tour invitation declines once, remains optional, and manual menu restart resets all steps',async()=>{
  const f=await uiFixture();try{const {d}=f;assert.ok(d.querySelector('.tour-invitation'));assert.equal(d.querySelector('.guide-card'),null);
    d.querySelector('[data-tour-decline]').click();assert.equal(d.querySelector('.tour-invitation'),null);assert.equal(f.storage.betaExplorerTour.invitationDismissed,true);
    d.querySelector('#explorer-menu-button').click();assert.equal(d.querySelector('#explorer-menu').hidden,false);assert.equal(d.querySelector('#explorer-menu-button').getAttribute('aria-expanded'),'true');d.querySelector('#take-tour').click();assert.equal(d.querySelector('#explorer-menu').hidden,true);assert.equal(d.querySelector('[data-guide-progress]').textContent,'1 of 15');
    tourNext(f,2);assert.equal(d.querySelector('[data-guide-progress]').textContent,'3 of 15');d.querySelector('[data-guide-back]').click();assert.equal(d.querySelector('[data-guide-progress]').textContent,'2 of 15');tourMenu(f);assert.equal(d.querySelectorAll('.guide-card').length,1);assert.equal(d.querySelector('[data-guide-progress]').textContent,'1 of 15');
    d.querySelector('[data-guide-exit]').click();assert.equal(d.querySelector('.guide-card'),null);assert.equal(d.querySelector('.guide-highlight'),null);
    d.querySelector('[data-key="root.txt"]').click();assert.equal(d.querySelector('#copy').disabled,false);d.querySelector('#copy').click();assert.match(d.querySelector('#status').textContent,/clipboard/);
    const again=await uiFixture({tourPreferences:f.storage.betaExplorerTour});try{assert.equal(again.d.querySelector('.tour-invitation'),null);tourMenu(again);assert.ok(again.d.querySelector('.guide-card'));again.d.querySelector('[data-guide-exit]').click();}finally{again.dom.window.close();}
  }finally{f.dom.window.close();}
});
test('every tour card has an X that exits everything immediately, preserving selection and session',async()=>{
  const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{
    const {d}=f;d.querySelector('[data-key="root.txt"]').click();const beforeMessages=f.messages.length,beforeKeys=[...f.stored.keys()];
    for(let step=0;step<15;step++){tourMenu(f);tourNext(f,step);assert.equal(d.querySelector('[data-guide-progress]').textContent,`${step+1} of 15`);assert.ok(d.querySelector('[data-guide-exit]'));d.querySelector('[data-guide-exit]').click();assert.equal(d.querySelectorAll('.guide-card,.guide-highlight').length,0);assert.equal(d.querySelector('[data-key="root.txt"]').getAttribute('aria-selected'),'true');assert.equal(d.querySelector('.tour-invitation'),null);}
    assert.equal(f.messages.length,beforeMessages);assert.deepEqual([...f.stored.keys()],beforeKeys);
    await new Promise(r=>setTimeout(r,30));assert.equal(d.querySelectorAll('.guide-card,.guide-highlight').length,0);
  }finally{f.dom.window.close();}
});
test('tour recognizes completed bucket, selection, view, refresh and preview actions through actual UI handlers',async()=>{
  const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,settle,w}=f;tourMenu(f);tourNext(f,3);
    const next=()=>d.querySelector('[data-guide-next]');assert.equal(next().disabled,true);d.querySelector('#heading').click();assert.equal(next().disabled,true);
    d.querySelector('#buckets button').click();await settle(()=>!next().disabled);assert.match(d.querySelector('[data-guide-status]').textContent,/recognized/);next().click();tourNext(f);assert.equal(next().disabled,true);
    d.querySelector('[data-key="Photos/"]').click();assert.equal(next().disabled,true);d.querySelector('[data-key="root.txt"]').click();assert.equal(next().disabled,false);next().click();assert.equal(next().disabled,true);d.querySelector('#sort').dispatchEvent(new w.Event('change'));assert.equal(next().disabled,true);d.querySelector('#view').click();assert.equal(next().disabled,false);
    next().click();assert.equal(next().disabled,true);d.querySelector('#refresh').click();await settle(()=>!next().disabled);tourNext(f,3);assert.equal(d.querySelector('[data-guide-progress]').textContent,'11 of 15');assert.equal(next().disabled,true);
    d.querySelector('[data-key="root.txt"]').click();d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-content pre')&&!next().disabled);await new Promise(r=>setTimeout(r,30));assert.equal(d.querySelector('.guide-card').parentElement,d.querySelector('#preview-dialog'));
    d.querySelector('[data-guide-exit]').click();assert.equal(d.querySelector('#preview-dialog').open,true);assert.equal(d.querySelector('#preview-content pre').textContent,'payload');d.querySelector('#preview-close').click();
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('tour completion and Escape clean up without cancelling active preview; no automatic resume',async()=>{
  const f=await uiFixture();try{const {d,w,settle}=f;d.querySelector('[data-tour-start]').click();tourNext(f,14);assert.equal(d.querySelector('[data-guide-next]').textContent,'Finish');d.querySelector('[data-guide-next]').click();assert.equal(d.querySelectorAll('.guide-card,.guide-highlight').length,0);assert.equal(f.storage.betaExplorerTour.completed,true);assert.ok(f.storage.betaExplorerTour.completedAt);
    d.querySelector('[data-key="root.txt"]').click();d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-content pre'));tourMenu(f);await new Promise(r=>setTimeout(r,30));const x=d.querySelector('[data-guide-exit]');x.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(d.querySelector('.guide-card'),null);assert.equal(d.querySelector('#preview-dialog').open,true);d.querySelector('#preview-close').click();
    const again=await uiFixture({tourPreferences:f.storage.betaExplorerTour});try{assert.equal(again.d.querySelector('.guide-card,.tour-invitation'),null);tourMenu(again);assert.equal(again.d.querySelector('[data-guide-progress]').textContent,'1 of 15');assert.equal(again.storage.betaExplorerTour.completed,true);again.d.querySelector('[data-guide-exit]').click();}finally{again.dom.window.close();}
  }finally{f.d.querySelector('#preview-close').click();f.dom.window.close();}
});
test('disconnected tour, missing files, narrow viewport and unavailable interactions always allow Skip and X',async()=>{
  const f=await uiFixture({autoOpen:false,sendOverride:async m=>m.type==='cfAccounts'?{ok:false,error:'Connect Cloudflare first.'}:{ok:true,profiles:[]}});try{const {d,w}=f;Object.defineProperty(w,'innerWidth',{value:360,configurable:true});Object.defineProperty(w,'innerHeight',{value:640,configurable:true});tourMenu(f);tourNext(f,3);assert.match(d.querySelector('[data-guide-text]').textContent,/No buckets/);assert.equal(d.querySelector('[data-guide-next]').disabled,true);assert.equal(d.querySelector('[data-guide-skip]').hidden,false);tourNext(f,11);assert.equal(d.querySelector('[data-guide-next]').textContent,'Finish');const card=d.querySelector('.guide-card');assert.ok(parseFloat(card.style.left)>=10);assert.ok(parseFloat(card.style.top)>=10);card.querySelector('[data-guide-exit]').click();assert.equal(d.querySelectorAll('.guide-card,.guide-highlight').length,0);assert.equal(d.querySelector('#connect').disabled,false);
  }finally{f.dom.window.close();}
});


test('Test It uses the existing guide: sixty contextual targets, X on every exercise, all-result export state and no exit cleanup',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,w,settle}=f;
 d.querySelector('#test-it-tools-button').click();d.querySelector('#test-it').click();await settle(()=>d.querySelector('.guide-card'));
 const progressBefore=JSON.stringify(f.storage.betaExplorerTestIt);
 d.querySelector('#test-it-tools-button').click();d.querySelector('#test-it-tools-button').click();assert.equal(JSON.stringify(f.storage.betaExplorerTestIt),progressBefore);
 assert.equal(d.activeElement.id,'test-it-tools-button');
 for(let i=0;i<60;i++){
   assert.equal(d.querySelector('[data-guide-progress]').textContent,`Question ${i+1} of 60`);
   assert.ok(d.querySelector('.guide-highlight'),'Exercise has a real highlight');
   assert.ok(d.querySelector('[data-guide-exit]'));assert.ok(d.querySelector('[data-guide-retry]'));
   if(i<59)d.querySelector('[data-guide-skip]').click();
 }
 await settle(()=>f.storage.betaExplorerTestIt?.records.length===60);
 assert.equal(f.storage.betaExplorerTestIt.records.length,60);
 assert.ok(f.storage.betaExplorerTestIt.records.every(r=>r.verdict==='NOT_TESTED'));
 d.querySelector('[data-guide-exit]').click();assert.equal(d.querySelectorAll('.guide-card,.guide-highlight').length,0);
 assert.ok(f.stored.has('root.txt'));assert.ok(f.stored.has('Photos/one.jpg'));
 d.querySelector('#test-it').click();assert.equal(d.querySelector('[data-guide-progress]').textContent,'Question 60 of 60');d.querySelector('[data-guide-exit]').click();
 }finally{f.dom.window.close();}
});
test('Test It blocks original deletion and cut through real toolbar handlers',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,settle}=f;d.querySelector('#test-it').click();await settle(()=>d.querySelector('.guide-card'));d.querySelector('[data-key="root.txt"]').click();d.querySelector('#delete').click();await settle(()=>d.querySelector('#status').textContent.includes('protected'));assert.equal(d.querySelector('#dialog').open,false);assert.ok(f.stored.has('root.txt'));d.querySelector('#cut').click();await settle(()=>d.querySelector('#status').textContent.includes('protected'));assert.equal(d.querySelector('#paste').disabled,true);d.querySelector('[data-guide-exit]').click();}finally{f.dom.window.close();}
});

test('Restart Test It confirms, replaces saved results, reopens exercise one and preserves files',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{
 const {d,settle}=f;d.querySelector('#test-it').click();await settle(()=>d.querySelector('.guide-card'));
 d.querySelector('[data-guide-skip]').click();await settle(()=>f.storage.betaExplorerTestIt?.index===1);
 const oldId=f.storage.betaExplorerTestIt.id,before=[...f.stored.keys()];
 d.querySelector('#test-it-restart').click();await settle(()=>d.querySelector('#dialog').open);
 d.querySelector('#dialog-cancel').click();await settle(()=>!d.querySelector('#dialog').open);assert.equal(f.storage.betaExplorerTestIt.id,oldId);await new Promise(resolve=>setImmediate(resolve));
 d.querySelector('#test-it-restart').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-confirm').click();
 await settle(()=>f.storage.betaExplorerTestIt.id!==oldId&&d.querySelector('[data-guide-progress]')?.textContent==='Question 1 of 60');
 await settle(()=>f.storage.betaExplorerTestIt?.records.length===60);
 assert.equal(f.storage.betaExplorerTestIt.index,0);assert.ok(f.storage.betaExplorerTestIt.records.every(r=>r.verdict==='NOT_TESTED'&&r.observedGuiInteraction===null));
 assert.deepEqual([...f.stored.keys()],before);assert.ok(f.storage.betaExplorerTestItOwnership);d.querySelector('[data-guide-exit]').click();
 }finally{f.dom.window.close();}
});

async function practiceAt(f,index){const {d,settle}=f;d.querySelector('#test-it').click();await settle(()=>d.querySelector('.guide-card'));for(let i=0;i<index;i++)d.querySelector('[data-guide-skip]').click();}
async function approvePracticeSource(f){const {d,w,settle}=f;
 d.querySelector('[data-key="root.txt"]').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-confirm').click();
 await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
}
test('Test It context Copy commits clipboard, preserves method requirement, survives navigation and independently verifies Paste into a chosen folder',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,w,settle}=f;await practiceAt(f,20);await approvePracticeSource(f);
 assert.equal(d.querySelector('[data-guide-progress]').textContent,'Question 22 of 60');assert.doesNotMatch(d.querySelector('[data-guide-text]').textContent,/Location [AB]/);assert.equal(d.querySelector('#destination-dialog').open,false);
 d.querySelector('#copy').click();assert.equal(d.querySelector('[data-guide-next]').disabled,true,'Toolbar cannot satisfy context-menu exercise');
 const row=d.querySelector('[data-key="root.txt"]');row.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,clientX:10,clientY:10}));[...d.querySelectorAll('#context button')].find(b=>b.textContent==='Copy').click();
 assert.equal(d.querySelector('[data-guide-next]').disabled,false);await settle(()=>f.storage.betaExplorerTestIt?.records[21].verdict==='PASSED');assert.equal(f.storage.betaExplorerTestIt.records[21].observedGuiInteraction.input.context,true);
 d.querySelector('[data-guide-next]').click();d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]'));
 assert.equal(d.querySelector('#paste').disabled,false);d.querySelector('#paste').click();await settle(()=>f.storage.betaExplorerTestIt?.records[22].verdict==='PASSED');
 assert.equal(hash(f.stored.get('Photos/root.txt').bytes),hash(f.stored.get('root.txt').bytes));assert.equal(f.storage.betaExplorerTestIt.objects[0].sessionId,f.storage.betaExplorerTestIt.id);assert.equal(f.storage.betaExplorerTestIt.records[22].sha256Comparisons.length,1);await settle(()=>d.querySelector('[data-key="Photos/root.txt"]')&&!d.querySelector('#upload').disabled);assert.equal(f.storage.betaExplorerTestIt.records[22].actualApiOperation,'copy','Refresh read must not overwrite copy evidence');
 // Generic Copy exercises observe all command methods, while Ctrl+C remains specific.
 for(let i=22;i<50;i++)d.querySelector('[data-guide-skip]').click();d.querySelector('[data-key="Photos/root.txt"]').click();d.querySelector('#copy').click();assert.equal(d.querySelector('[data-guide-next]').disabled,true);
 d.querySelector('#files').dispatchEvent(new w.KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true}));assert.equal(d.querySelector('[data-guide-next]').disabled,false);
 const before=hash(f.stored.get('root.txt').bytes);d.querySelector('[data-guide-exit]').click();assert.equal(hash(f.stored.get('root.txt').bytes),before);
 }finally{f.dom.window.close();}
});
test('Test It observes real Preview arrow transitions and Escape closes Lightbox with guide focus without dismissing Test It',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,w,settle}=f;await f.bucket.put('Photos/two.jpg','second image');
 d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/two.jpg"]'));await practiceAt(f,13);
 d.querySelector('[data-key="Photos/one.jpg"]').click();d.querySelector('#preview').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
 d.querySelector('[data-guide-exit]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 // Arrow navigation from actual preview focus, the guide deliberately owns arrows on its controls.
 d.querySelector('#preview-dialog').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
 d.querySelector('#preview-dialog').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
 d.querySelector('#preview-lightbox').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
 assert.equal(d.querySelector('[data-guide-progress]').textContent,'Question 18 of 60');assert.ok(d.querySelector('#preview-dialog').classList.contains('image-lightbox'));
 d.querySelector('[data-guide-exit]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.ok(d.querySelector('.guide-card'));assert.ok(d.querySelector('#preview-dialog').open);assert.equal(d.querySelector('#preview-dialog').classList.contains('image-lightbox'),false);assert.equal(d.querySelector('[data-guide-next]').disabled,false);
 await settle(()=>f.storage.betaExplorerTestIt?.records[17].verdict==='PASSED');d.querySelector('[data-guide-exit]').click();
 }finally{f.dom.window.close();}
});

for(const nested of [false,true])test('parent breadcrumb observes completed navigation including '+(nested?'nested click targets':'root parent'),async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,w,settle}=f;
 if(nested)await f.bucket.put('Photos/child/item.txt','child');
 d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]'));
 if(nested){d.querySelector('[data-key="Photos/child/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/child/item.txt"]'));}
 await practiceAt(f,2);const buttons=d.querySelectorAll('#crumbs button'),parent=buttons[buttons.length-2];
 const click=nested?parent.appendChild(d.createElement('span')):parent;click.click();assert.equal(d.querySelector('[data-guide-next]').disabled,true,'wait for completed listing');
 await settle(()=>!d.querySelector('[data-guide-next]').disabled);assert.equal(f.storage.betaExplorerTestIt.records[2].verdict,'PASSED');
 }finally{f.dom.window.close();}
});
test('breadcrumb grandparent and non-breadcrumb parent navigation do not pass parent exercise',async()=>{
 for(const viaUp of [false,true]){const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,w,settle}=f;
 await f.bucket.put('Photos/child/item.txt','child');d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/child/"]'));
 d.querySelector('[data-key="Photos/child/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/child/item.txt"]'));await practiceAt(f,2);
 d.querySelector(viaUp?'#up':'#crumbs button').click();await settle(()=>d.querySelector(viaUp?'[data-key="Photos/one.jpg"]':'[data-key="root.txt"]'));assert.equal(d.querySelector('[data-guide-next]').disabled,true);
 }finally{f.dom.window.close();}}
});
test('image buttons await actual load, reject repeated load and error, then recognize next and previous',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true},autoLoadImages:false});try{const {d,w,settle}=f;
 await f.bucket.put('Photos/two.jpg','second');d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/two.jpg"]'));await practiceAt(f,13);
 const load=img=>{Object.defineProperties(img,{complete:{value:true,configurable:true},naturalWidth:{value:100,configurable:true}});img.dispatchEvent(new w.Event('load'));};
 d.querySelector('[data-key="Photos/one.jpg"]').click();d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-content img'));assert.equal(d.querySelector('[data-guide-next]').disabled,true);load(d.querySelector('#preview-content img'));assert.equal(d.querySelector('[data-guide-next]').disabled,false);d.querySelector('[data-guide-next]').click();
 d.querySelector('#preview-content img').dispatchEvent(new w.Event('load'));assert.equal(d.querySelector('[data-guide-next]').disabled,true);
 d.querySelector('#preview-next').click();await settle(()=>d.querySelector('#preview-content img')?.alt==='two.jpg');assert.equal(d.querySelector('[data-guide-next]').disabled,true);load(d.querySelector('#preview-content img'));assert.equal(d.querySelector('[data-guide-next]').disabled,false);d.querySelector('[data-guide-next]').click();
 d.querySelector('#preview-previous').click();await settle(()=>d.querySelector('#preview-content img')?.alt==='one.jpg');assert.equal(d.querySelector('[data-guide-next]').disabled,true);load(d.querySelector('#preview-content img'));assert.equal(d.querySelector('[data-guide-next]').disabled,false);
 d.querySelector('[data-guide-next]').click();d.querySelector('#preview-next').click();await settle(()=>d.querySelector('#preview-content img')?.alt==='two.jpg');d.querySelector('#preview-content img').dispatchEvent(new w.Event('error'));assert.equal(d.querySelector('[data-guide-next]').disabled,true);
 }finally{f.dom.window.close();}
});
test('Test It same-folder Paste creates a distinct remotely verified copy without destination configuration',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,settle}=f;await practiceAt(f,20);await approvePracticeSource(f);
 d.querySelector('[data-key="root.txt"]').dispatchEvent(new f.w.MouseEvent('contextmenu',{bubbles:true}));[...d.querySelectorAll('#context button')].find(b=>b.textContent==='Copy').click();d.querySelector('[data-guide-next]').click();d.querySelector('#paste').click();
 await settle(()=>f.storage.betaExplorerTestIt?.records[22].verdict==='PASSED');assert.ok(f.stored.has('root (copy).txt'));assert.ok(f.stored.has('root.txt'));assert.equal(f.storage.betaExplorerTestIt.objects[0].key,'root (copy).txt');assert.equal(d.querySelector('#destination-dialog').open,false);assert.equal(d.querySelector('.practice-locations'),null);
 }finally{f.dom.window.close();}
});

test('failed parent listing never completes breadcrumb exercise',async()=>{
 let fail=false;const f=await uiFixture({tourPreferences:{invitationDismissed:true},httpOverride:http=>({...http,request:async(...args)=>{if(fail)throw Error('Fixture listing unavailable');return http.request(...args);}})});
 try{const {d,w,settle}=f;d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]'));await practiceAt(f,2);fail=true;d.querySelector('#crumbs button').click();await settle(()=>d.querySelector('#dropzone').dataset.state==='failed');assert.equal(d.querySelector('[data-guide-next]').disabled,true);}finally{f.dom.window.close();}
});

test('Previous uses active preview after extra navigation, for buttons and arrows, without obsolete Next baseline',async()=>{
 for(const keyboard of [false,true]){const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,w,settle}=f;
 await f.bucket.put('Photos/two.jpg','second');await f.bucket.put('Photos/three.jpg','third');
 d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/two.jpg"]'));await practiceAt(f,13);
 d.querySelector('[data-key="Photos/one.jpg"]').click();d.querySelector('#preview').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
 d.querySelector('#preview-next').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
 // Next again during Previous changes the active starting image legitimately.
 d.querySelector('#preview-next').click();await settle(()=>d.querySelector('#preview-content img')?.alt==='two.jpg');assert.equal(d.querySelector('[data-guide-next]').disabled,true);
 if(keyboard)d.querySelector('#preview-dialog').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));else d.querySelector('#preview-previous').click();
 await settle(()=>!d.querySelector('[data-guide-next]').disabled);assert.equal(f.storage.betaExplorerTestIt.records[15].verdict,'PASSED');assert.equal(d.querySelector('#preview-content img').alt,'three.jpg');
 }finally{f.dom.window.close();}}
});
test('production copy indicators survive List, Grid and refresh; original verifies automatically and ordinary R2 rename and keyboard movement succeed',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,settle}=f;await practiceAt(f,20);await approvePracticeSource(f);
 d.querySelector('[data-key="root.txt"]').dispatchEvent(new f.w.MouseEvent('contextmenu',{bubbles:true}));[...d.querySelectorAll('#context button')].find(b=>b.textContent==='Copy').click();d.querySelector('[data-guide-next]').click();d.querySelector('#paste').click();
 await settle(()=>f.storage.betaExplorerTestIt?.records[22].verdict==='PASSED'&&d.querySelector('[data-key="root (copy).txt"].test-owned-copy'));
 const labels=()=>{assert.equal(d.querySelector('[data-key="root (copy).txt"] .test-ownership-label').textContent,'Test Copy');assert.equal(d.querySelector('[data-key="root.txt"] .test-ownership-label').textContent,'Original · Protected');assert.equal(d.querySelector('[data-key="root.txt"]').classList.contains('test-owned-copy'),false);};labels();
 d.querySelector('#view').click();labels();d.querySelector('#refresh').click();await settle(()=>!d.querySelector('#refresh').disabled);labels();
 d.querySelector('[data-guide-next]').click();await settle(()=>f.storage.betaExplorerTestIt.records[23].verdict==='PASSED');assert.match(d.querySelector('[data-guide-text]').textContent,/Original:.*root.txt/);assert.match(d.querySelector('[data-guide-text]').textContent,/Your copy:.*root \(copy\).txt/);
 // An existing original cannot be renamed through the real dialog either.
 d.querySelector('[data-key="root.txt"]').click();d.querySelector('#rename').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-input').value='original-renamed.txt';d.querySelector('#dialog-confirm').click();await settle(()=>d.querySelector('#status').textContent.includes('protected')&&!d.querySelector('#refresh').disabled);assert.ok(f.stored.has('root.txt'));assert.ok(!f.stored.has('original-renamed.txt'));
 // Exercise the unchanged ordinary adapter and embedded Worker routes.
 d.querySelector('[data-key="root (copy).txt"]').click();d.querySelector('#rename').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-input').value='renamed.txt';d.querySelector('#dialog-confirm').click();await settle(()=>d.querySelector('[data-key="renamed.txt"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 assert.ok(f.stored.has('root.txt'));assert.ok(!f.stored.has('root (copy).txt'));assert.ok(f.stored.has('renamed.txt'));
 d.querySelector('[data-key="renamed.txt"]').click();d.querySelector('#files').dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'x',ctrlKey:true,bubbles:true,cancelable:true}));assert.ok(f.stored.has('renamed.txt'));
 d.querySelector('[data-key="Photos/"]').dispatchEvent(new f.w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]')&&!d.querySelector('#refresh').disabled);
 d.querySelector('#files').dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'v',ctrlKey:true,bubbles:true,cancelable:true}));await settle(()=>d.querySelector('[data-key="Photos/renamed.txt"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 assert.ok(!f.stored.has('renamed.txt'));assert.ok(f.stored.has('root.txt'));assert.equal(d.querySelector('#paste').disabled,true);assert.equal(f.storage.betaExplorerTestIt.pending,null);

 }finally{f.dom.window.close();}
});

test('ordinary Explorer adapter and embedded Worker copy/rename/Cut/Paste/back/duplicate/delete/export sequence',async()=>{
 // Real source routes with a memory R2 binding, not live R2 acceptance.
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL,blobs=[];
 try{const {d,w,settle}=f;d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one.jpg"]'));await practiceAt(f,20);
 d.querySelector('[data-key="Photos/one.jpg"]').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-confirm').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
 d.querySelector('[data-key="Photos/one.jpg"]').dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true}));[...d.querySelectorAll('#context button')].find(b=>b.textContent==='Copy').click();d.querySelector('[data-guide-next]').click();d.querySelector('#paste').click();await settle(()=>d.querySelector('[data-key="Photos/one (copy).jpg"].test-owned-copy'));
 const id=f.storage.betaExplorerTestIt.objects.find(o=>!o.deleted).id,originalHash=hash(f.stored.get('Photos/one.jpg').bytes);
 d.querySelector('[data-guide-next]').click();await settle(()=>f.storage.betaExplorerTestIt.records[23].verdict==='PASSED');
 d.querySelector('[data-guide-next]').click();d.querySelector('[data-guide-skip]').click();assert.equal(d.querySelector('[data-guide-progress]').textContent,'Question 26 of 60');
 d.querySelector('[data-key="Photos/one (copy).jpg"]').click();d.querySelector('#rename').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-input').value='renamed.jpg';d.querySelector('#dialog-confirm').click();await settle(()=>d.querySelector('[data-key="Photos/renamed.jpg"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 assert.equal(f.storage.betaExplorerTestIt.records[25].verdict,'PASSED');d.querySelector('[data-guide-next]').click();
 d.querySelector('[data-key="Photos/renamed.jpg"]').click();d.querySelector('#rename').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-input').value='one (copy).jpg';d.querySelector('#dialog-confirm').click();await settle(()=>f.storage.betaExplorerTestIt.records[26].verdict==='PASSED'&&!d.querySelector('#refresh').disabled);
 assert.equal(f.storage.betaExplorerTestIt.objects.findLast(o=>!o.deleted).id,id);
 // Exercise 34 requires the real keyboard Cut, then 35 requires keyboard Paste.
 tourNext(f,7);
 d.querySelector('[data-key="Photos/one (copy).jpg"]').click();d.querySelector('#files').dispatchEvent(new w.KeyboardEvent('keydown',{key:'x',ctrlKey:true,bubbles:true,cancelable:true}));assert.ok(f.stored.has('Photos/one (copy).jpg'),'Cut does not delete');await settle(()=>f.storage.betaExplorerTestIt.records[33].verdict==='PASSED');d.querySelector('[data-guide-next]').click();
 d.querySelector('#up').click();await settle(()=>d.querySelector('[data-key="root.txt"]')&&!d.querySelector('#refresh').disabled);assert.equal(d.querySelector('#paste').disabled,false);
 d.querySelector('#files').dispatchEvent(new w.KeyboardEvent('keydown',{key:'v',ctrlKey:true,bubbles:true,cancelable:true}));await settle(()=>f.storage.betaExplorerTestIt.records[34].verdict==='PASSED'&&!d.querySelector('#refresh').disabled);assert.ok(!f.stored.has('Photos/one (copy).jpg'));assert.ok(d.querySelector('[data-key="one (copy).jpg"].test-owned-copy'));
 d.querySelector('[data-guide-next]').click();d.querySelector('[data-guide-skip]').click();
 d.querySelector('[data-key="one (copy).jpg"]').click();d.querySelector('#move-to').click();await settle(()=>d.querySelector('#destination-dialog').open&&!d.querySelector('#destination-confirm').disabled);d.querySelector('#destination-prefix').value='Photos/';d.querySelector('#destination-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle(()=>f.storage.betaExplorerTestIt.records[36].verdict==='PASSED'&&!d.querySelector('#refresh').disabled);
 d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/one (copy).jpg"].test-owned-copy'));
 assert.equal(f.storage.betaExplorerTestIt.objects.findLast(o=>!o.deleted).id,id);
 d.querySelector('[data-key="Photos/one (copy).jpg"]').click();d.querySelector('#duplicate').click();await settle(()=>d.querySelector('[data-key="Photos/one (copy) (copy).jpg"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 d.querySelector('[data-key="Photos/one (copy) (copy).jpg"]').click();d.querySelector('#delete').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-confirm').click();await settle(()=>!d.querySelector('[data-key="Photos/one (copy) (copy).jpg"]')&&!d.querySelector('#refresh').disabled);
 assert.equal(hash(f.stored.get('Photos/one.jpg').bytes),originalHash);assert.equal(hash(f.stored.get('Photos/one (copy).jpg').bytes),originalHash);assert.ok(d.querySelector('[data-key="Photos/one (copy).jpg"].test-owned-copy'));assert.match(d.querySelector('[data-guide-text]').textContent,/Your copy:.*Photos\/one \(copy\).jpg/);
 URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:fixture';};URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};d.querySelector('#test-it-export').click();await settle(()=>blobs.length===1);
 const exported=JSON.parse(await blobs[0].text());assert.equal(exported.pending,null);assert.equal(exported.lastVerifiedOperation.operation,'delete');assert.equal(exported.originals[0].sha256,originalHash);assert.equal(exported.objects.findLast(o=>!o.deleted).id,id);
 }finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;f.dom.window.close();}
});

test('Window Preview actual Previous then Next buttons register Next without a cached expected key',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,w,settle}=f;
 await f.bucket.put('Photos/two.jpg','second');d.querySelector('[data-key="Photos/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('[data-key="Photos/two.jpg"]'));
 await practiceAt(f,14);d.querySelector('[data-key="Photos/two.jpg"]').click();d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-content img')?.alt==='two.jpg');
 assert.equal(d.querySelector('[data-guide-next]').disabled,true);
 d.querySelector('#preview-previous').click();await settle(()=>d.querySelector('#preview-content img')?.alt==='one.jpg');assert.equal(d.querySelector('[data-guide-next]').disabled,true);
 d.querySelector('#preview-next').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);assert.equal(f.storage.betaExplorerTestIt.records[14].verdict,'PASSED');assert.equal(d.querySelector('#preview-content img').alt,'two.jpg');
 d.querySelector('[data-guide-next]').click();d.querySelector('#preview-previous').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);assert.equal(f.storage.betaExplorerTestIt.records[15].verdict,'PASSED');
 }finally{f.dom.window.close();}
});


test('production Explorer dialog creates a new Test It destination, preserves selection/clipboard and verifies subsequent Paste without advancing on mkdir',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});try{const {d,w,settle}=f;await practiceAt(f,20);await approvePracticeSource(f);
 d.querySelector('[data-key="root.txt"]').dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true}));[...d.querySelectorAll('#context button')].find(b=>b.textContent==='Copy').click();d.querySelector('[data-guide-next]').click();
 d.querySelector('#mkdir').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-input').value='Fresh destination';d.querySelector('#dialog-confirm').click();
 await settle(()=>d.querySelector('[data-key="Fresh destination/"]')&&!d.querySelector('#mkdir').disabled);
 assert.equal(d.querySelector('[data-key="root.txt"]').getAttribute('aria-selected'),'true');assert.equal(d.querySelector('#paste').disabled,false);
 assert.equal(f.storage.betaExplorerTestIt.index,22);assert.notEqual(f.storage.betaExplorerTestIt.records[22].verdict,'PASSED');assert.equal(f.storage.betaExplorerTestIt.practiceFolders[0].status,'created');
 assert.equal(f.storage.betaExplorerTestIt.objects.length,0);
 d.querySelector('[data-key="Fresh destination/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>d.querySelector('#crumbs').textContent.includes('Fresh destination')&&!d.querySelector('#paste').disabled);
 d.querySelector('#paste').click();await settle(()=>f.storage.betaExplorerTestIt.records[22].verdict==='PASSED'&&!d.querySelector('#refresh').disabled);
 assert.equal(hash(f.stored.get('Fresh destination/root.txt').bytes),hash(f.stored.get('root.txt').bytes));assert.ok(d.querySelector('[data-key="Fresh destination/root.txt"].test-owned-copy'));
 }finally{f.dom.window.close();}
});
test('create-only folder Worker rejects marker races and backend rejects file/prefix collisions',async()=>{
 const f=await fixture();await f.bucket.put('used/file.txt','unrelated');await f.bucket.put('same','unrelated');
 for(const name of ['used','same'])await assert.rejects(f.context.createExplorerFolder({...source,name,createOnly:true}),/already exists/);
 assert.ok(f.stored.has('used/file.txt'));assert.ok(f.stored.has('same'));
 assert.equal((await f.context.createExplorerFolder({...source,name:'fresh',createOnly:true})).key,'fresh/');await assert.rejects(f.context.createExplorerFolder({...source,name:'fresh',createOnly:true}),/already exists/);
});

test('ordinary GUI and embedded Worker move two Test Copies into a new folder',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});
 try{const {d,w,settle}=f;await practiceAt(f,20);await approvePracticeSource(f);
 d.querySelector('#copy').click();d.querySelector('#paste').click();await settle(()=>d.querySelector('[data-key="root (copy).txt"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 d.querySelector('[data-key="root (copy).txt"]').click();d.querySelector('#duplicate').click();await settle(()=>d.querySelector('[data-key="root (copy) (copy).txt"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 while(d.querySelector('[data-guide-progress]').textContent!=='Question 39 of 60')d.querySelector('[data-guide-skip]').click();
 const keys=['root (copy).txt','root (copy) (copy).txt'];d.querySelector('[data-key="'+keys[0]+'"]').click();d.querySelector('[data-key="'+keys[1]+'"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,ctrlKey:true}));
 const ids=f.storage.betaExplorerTestIt.objects.filter(o=>!o.deleted).map(o=>o.id);
 d.querySelector('#mkdir').click();await settle(()=>d.querySelector('#dialog').open);d.querySelector('#dialog-input').value='Batch destination';d.querySelector('#dialog-confirm').click();await settle(()=>d.querySelector('[data-key="Batch destination/"]')&&!d.querySelector('#refresh').disabled);
 for(const key of keys)assert.equal(d.querySelector('[data-key="'+key+'"]').getAttribute('aria-selected'),'true');
 assert.equal(f.storage.betaExplorerTestIt.index,38);assert.notEqual(f.storage.betaExplorerTestIt.records[38].verdict,'PASSED');
 d.querySelector('#move-to').click();await settle(()=>d.querySelector('#destination-dialog').open&&!d.querySelector('#destination-confirm').disabled);d.querySelector('#destination-prefix').value='Batch destination/';d.querySelector('#destination-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 await settle(()=>f.storage.betaExplorerTestIt.records[38].verdict==='PASSED'&&!d.querySelector('#refresh').disabled);
 for(const key of keys){assert.ok(!f.stored.has(key));assert.equal(hash(f.stored.get('Batch destination/'+key).bytes),hash(f.stored.get('root.txt').bytes));}
 assert.deepEqual(f.storage.betaExplorerTestIt.objects.filter(o=>!o.deleted).map(o=>o.id).sort(),ids.sort());
 d.querySelector('[data-key="Batch destination/"]').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await settle(()=>keys.every(key=>d.querySelector('[data-key="Batch destination/'+key+'"].test-owned-copy')));
 d.querySelector('[data-guide-next]').click();
 d.querySelector('[data-key="Batch destination/'+keys[0]+'"]').click();d.querySelector('[data-key="Batch destination/'+keys[1]+'"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,ctrlKey:true}));
 d.querySelector('#move-to').click();await settle(()=>d.querySelector('#destination-dialog').open&&!d.querySelector('#destination-confirm').disabled);d.querySelector('#destination-prefix').value='';d.querySelector('#destination-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 await settle(()=>f.storage.betaExplorerTestIt.records[39].verdict==='PASSED'&&!d.querySelector('#refresh').disabled);
 for(const key of keys){assert.ok(f.stored.has(key));assert.ok(!f.stored.has('Batch destination/'+key));}
 assert.deepEqual(f.storage.betaExplorerTestIt.objects.filter(o=>!o.deleted).map(o=>o.id).sort(),ids.sort());
 }finally{f.dom.window.close();}
});

test('old Workers cannot silently accept create-only practice folders or trigger automatic provisioning',async()=>{
 const calls=[];const code=background.slice(background.indexOf('async function createExplorerFolder('),background.indexOf('function objectKeyFromLocation('));
 const context=vm.createContext({cleanExplorerPrefix:p=>p,cleanExplorerName:n=>n,preparedProfile:async(...args)=>{assert.equal(args.at(-1),true);return {};},callBucketWorker:async(profile,body)=>{calls.push(body.action);return {ok:true};}});vm.runInContext(code,context);
 await assert.rejects(context.createExplorerFolder({...source,name:'new',createOnly:true,betaNoProvision:true}),/create-only folder Worker update/);assert.deepEqual(calls,['capabilities']);
});

test('delayed Chrome completion resolves the original download operation with its ID',async()=>{
 let notify;const api=createFileApi(createR2Adapter({http:{download:async(s,k,n,callback)=>{notify=callback;return 859;}}}));
 let settled=false;const operation=api.run('download',{source,entry:{key:'working.txt'}}).then(r=>{settled=true;return r;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
 notify({state:'complete'});const result=await operation;
 assert.equal(result.state,'completed');assert.equal(result.data.downloadState,'complete');assert.equal(result.data.downloadId,859);
});
test('delayed Chrome interruption never counts as completed',async()=>{
 let notify;const api=createFileApi(createR2Adapter({http:{download:async(s,k,n,callback)=>{notify=callback;return 860;}}}));
 const operation=api.run('download',{source,entry:{key:'working.txt'}});
 await new Promise(resolve=>setImmediate(resolve));notify({state:'interrupted',error:'USER_CANCELED'});
 const result=await operation;assert.equal(result.state,'failed');assert.match(result.error,/USER_CANCELED/);
});

test('source approval owns focus above guide, and context Copy highlights the file then menu item',async()=>{
 const f=await uiFixture({tourPreferences:{invitationDismissed:true}});
 try{const {d,w,settle}=f;await practiceAt(f,20);d.querySelector('[data-key="root.txt"]').click();await settle(()=>d.querySelector('#dialog').open);
 assert.equal(d.querySelector('#dialog-title').textContent,'Practice with this file?');assert.equal(d.querySelector('#dialog-confirm').textContent,'Yes, use this file');assert.equal(d.querySelector('#dialog-cancel').textContent,'No');
 assert.ok(d.querySelector('.guide-card').hidden);assert.ok(!d.querySelector('#dialog').contains(d.querySelector('.guide-card')));assert.equal(d.activeElement.id,'dialog-confirm');
 d.querySelector('#dialog-confirm').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);d.querySelector('[data-guide-next]').click();
 assert.ok(d.querySelector('[data-key="root.txt"]').classList.contains('guide-highlight'));assert.ok(!d.querySelector('#copy').classList.contains('guide-highlight'));
 d.querySelector('[data-key="root.txt"]').dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true}));await settle(()=>d.querySelector('#context [data-command="copy"]').classList.contains('guide-highlight'));
 }finally{f.dom.window.close();}
});
for(const exitGuide of [false,true])test('Test It exercise 57 records delayed Chrome completion, guide exited: '+exitGuide,async()=>{
 let notify;const f=await uiFixture({tourPreferences:{invitationDismissed:true},adapterSetup:(adapter,memory)=>{adapter.download=createR2Adapter({http:{...memory.http,download:async(s,k,n,callback)=>{notify=callback;return 859;}}}).download;}});
 try{const {d,settle}=f;await practiceAt(f,20);await approvePracticeSource(f);d.querySelector('#copy').click();d.querySelector('#paste').click();await settle(()=>d.querySelector('[data-key="root (copy).txt"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 while(d.querySelector('[data-guide-progress]').textContent!=='Question 57 of 60')d.querySelector('[data-guide-skip]').click();
 d.querySelector('[data-key="root (copy).txt"]').click();d.querySelector('#download').click();await settle(()=>Boolean(notify));assert.notEqual(f.storage.betaExplorerTestIt.records[56].verdict,'PASSED');
 if(exitGuide)d.querySelector('[data-guide-exit]').click();
 notify({state:'complete'});await settle(()=>f.storage.betaExplorerTestIt.records[56].verdict==='PASSED');assert.equal(f.storage.betaExplorerTestIt.records[56].providerResponse.downloadId,859);if(exitGuide){d.querySelector('#test-it').click();await settle(()=>!d.querySelector('[data-guide-next]').disabled);}
 }finally{f.dom.window.close();}
});

 test('partial ordinary multi-file Move preserves successful identity and the unresolved copy',async()=>{
 let count=0;const f=await uiFixture({tourPreferences:{invitationDismissed:true},adapterSetup:adapter=>{const move=adapter.move;adapter.move=async(...args)=>{if(++count===2)return {completed:0,errors:[{error:'Injected provider failure'}],results:[{sourceKey:args[0].entries[0].key,status:'failed',stage:'source.read'}]};return move(...args);};}});
 try{const {d,w,settle}=f;await practiceAt(f,20);await approvePracticeSource(f);d.querySelector('#copy').click();d.querySelector('#paste').click();await settle(()=>d.querySelector('[data-key="root (copy).txt"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 d.querySelector('[data-key="root (copy).txt"]').click();d.querySelector('#duplicate').click();await settle(()=>d.querySelector('[data-key="root (copy) (copy).txt"].test-owned-copy')&&!d.querySelector('#refresh').disabled);
 const keys=['root (copy).txt','root (copy) (copy).txt'],ids=f.storage.betaExplorerTestIt.objects.filter(o=>!o.deleted).map(o=>o.id).sort();
 while(d.querySelector('[data-guide-progress]').textContent!=='Question 39 of 60')d.querySelector('[data-guide-skip]').click();
 d.querySelector('[data-key="'+keys[0]+'"]').click();d.querySelector('[data-key="'+keys[1]+'"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,ctrlKey:true}));d.querySelector('#move-to').click();await settle(()=>d.querySelector('#destination-dialog').open&&!d.querySelector('#destination-confirm').disabled);d.querySelector('#destination-prefix').value='Photos/';d.querySelector('#destination-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle(()=>count===2&&!d.querySelector('#refresh').disabled);
 assert.ok(f.stored.has('Photos/'+keys[0]));assert.ok(!f.stored.has(keys[0]));assert.ok(f.stored.has(keys[1]));assert.ok(!f.stored.has('Photos/'+keys[1]));
 assert.deepEqual(f.storage.betaExplorerTestIt.objects.filter(o=>!o.deleted).map(o=>o.id).sort(),ids);assert.notEqual(f.storage.betaExplorerTestIt.records[38].verdict,'PASSED');assert.ok(f.stored.has('root.txt'));
 }finally{f.dom.window.close();}
 });

test('Phase 1 toolbar order, safe default focus, persistent delete preferences and hidden-button shortcut',async()=>{
 const f=await uiFixture();try{const {d,w,settle}=f;
 assert.deepEqual([...d.querySelector('.header-actions').children].map(e=>e.id||e.className),['remote','upload','explorer-menu-wrap']);
 d.querySelector('[data-key="root.txt"]').click();d.querySelector('#delete').click();await settle(()=>d.querySelector('#dialog').open);assert.equal(d.activeElement.id,'dialog-cancel');d.querySelector('#dialog-cancel').click();
 d.querySelector('#preferences').click();d.querySelector('#pref-confirm-delete').checked=false;d.querySelector('#pref-show-delete').checked=false;
 d.querySelector('#preferences-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle(()=>!d.querySelector('#preferences-dialog').open);
 assert.equal(f.storage.betaExplorerDeletePreferences.confirmBeforeDeleting,false);assert.equal(d.querySelector('#delete').hidden,true);
 d.querySelector('#files').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Delete',bubbles:true}));await settle(()=>!f.stored.has('root.txt'));assert.equal(d.querySelector('#dialog').open,false);
 }finally{f.dom.window.close();}
 const reopened=await uiFixture({deletePreferences:{confirmBeforeDeleting:false,showDeleteOnDashboard:false}});try{assert.equal(reopened.d.querySelector('#delete').hidden,true);reopened.d.querySelector('#preferences').click();assert.equal(reopened.d.querySelector('#pref-confirm-delete').checked,false);}finally{reopened.dom.window.close();}
});


test('ZIP/CBZ opens as a navigable virtual folder with next/previous preview and optional extraction',async()=>{
 const f=await uiFixture(),{d,w,settle}=f;
 try{
   await f.bucket.put('comic.cbz',storedZip([['pages/001.webp','page1'],['pages/002.webp','page2'],['other/notes.txt','notes']]));
   d.querySelector('#refresh').click();
   await settle(()=>d.querySelector('[data-key="comic.cbz"]')&&!d.querySelector('#upload').disabled);
   const card=d.querySelector('[data-key="comic.cbz"]');card.click();card.focus();
   card.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
   await settle(()=>d.querySelector('#archive-dialog').open&&d.querySelector('#archive-files [data-key="pages/"]'));
   assert.equal(f.stored.has('comic.cbz'),true,'archive must not be extracted or modified by opening');
   assert.equal(d.querySelector('#archive-up').disabled,true,'root breadcrumb is correct');
   d.querySelector('#archive-files [data-key="pages/"] .archive-entry-open').click();
   await settle(()=>d.querySelector('#archive-preview-position').textContent.includes('001.webp')&&d.querySelector('#archive-preview-content img'));
   assert.equal(d.querySelector('#archive-up').disabled,false);
   d.querySelector('#archive-preview-next').click();
   await settle(()=>d.querySelector('#archive-preview-position').textContent.includes('002.webp')&&d.querySelector('#archive-preview-content img'));
   d.querySelector('#archive-dialog').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
   await settle(()=>d.querySelector('#archive-preview-position').textContent.includes('001.webp'));
   assert.equal(f.messages.filter(m=>m.type==='cfExtractArchive').length,0,'preview must not extract');
   const readRequests=f.messages.filter(m=>m.type==='cfArchiveEntryUrl');
   assert.ok(readRequests.length>=2,'individual previews request signed entry URLs');
   assert.ok(readRequests.every(m=>m.betaNoProvision===true),'archive reads cannot silently provision a Worker');
   const page=d.querySelector('#archive-files [data-key="pages/001.webp"] input[type="checkbox"]');
   page.checked=true;page.dispatchEvent(new w.Event('change',{bubbles:true}));
   d.querySelector('#archive-prefix').value='Unpacked/';
   d.querySelector('#archive-extract').click();
   await settle(()=>f.stored.has('Unpacked/pages/001.webp')&&!d.querySelector('#upload').disabled);
   assert.equal(f.stored.has('Unpacked/pages/002.webp'),false,'extract only checked files');
   assert.equal(f.stored.has('comic.cbz'),true,'original remains intact');
 }finally{f.dom.window.close();}
});
