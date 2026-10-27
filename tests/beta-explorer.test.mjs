import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createFileApi,location,prefix,name} from '../extension/beta/file-api.mjs';
import {createR2Adapter,previewType} from '../extension/beta/r2-adapter.mjs';
import {collectDroppedFiles} from '../extension/beta/dropped-files.mjs';
const background=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const source={accountId:'fixture-account',bucketName:'disposable-fixture',prefix:''};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(){
  const embedded=background.match(/const WORKER_SOURCE = `([\s\S]*?)`;\r?\n\r?\nfunction/);
  const code=Function(`return \`${embedded[1]}\``)().replace('__REDOWN_SHARED_SECRET__','fixture-secret');
  const worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
  const stored=new Map(),messages=[],requests=[];let cancelled=false;
  function object(k,bytes,options={}){const md5=createHash('md5').update(bytes).digest();return {key:k,bytes,size:bytes.length,etag:md5.toString('hex'),version:randomUUID(),checksums:{md5:md5.buffer.slice(md5.byteOffset,md5.byteOffset+md5.byteLength)},httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{},body:new Blob([bytes]).stream()};}
  const bucket={
    async head(k){return stored.get(k)||null;},async get(k,options={}){const o=stored.get(k);if(!o)return null;const bytes=options.range?o.bytes.slice(options.range.offset,options.range.offset+options.range.length):o.bytes;return {...o,body:new Blob([bytes]).stream(),arrayBuffer:async()=>Uint8Array.from(bytes).buffer};},
    async put(k,value,options={}){const old=stored.get(k);if(options.onlyIf instanceof Headers&&options.onlyIf.get('if-none-match')==='*'&&old)return null;if(options.onlyIf?.etagMatches&&old?.etag!==options.onlyIf.etagMatches)return null;const bytes=Buffer.from(await new Response(value).arrayBuffer());if(options.md5)assert.equal(createHash('md5').update(bytes).digest('hex'),options.md5);const o=object(k,bytes,options);stored.set(k,o);return o;},
    async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])stored.delete(k);}
  };
  const manage=async(profile,body)=>{const response=await worker.fetch(new Request('https://fixture.workers.dev',{method:'POST',headers:{authorization:'Bearer fixture-secret','content-type':'application/json'},body:JSON.stringify(body)}),{STORAGE:bucket});const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error);return result;};
  const profile={workerUrl:'https://fixture.workers.dev',token:'fixture-secret'};
  const context=vm.createContext({TextEncoder,crypto,cleanExplorerName:n=>{const clean=n.trim();if(!clean||clean.includes('/'))throw Error('Invalid name');return clean;},preparedProfile:async()=>profile,callBucketWorker:manage,transferCounter:{add:async()=>{}},assertExplorerTransferSettings:async()=>{}});
  const extract=(start,end)=>background.slice(background.indexOf(start),background.indexOf(end,background.indexOf(start)));
  vm.runInContext(extract('function cleanExplorerPrefix(','async function workerAcceptsProfile('),context);
  vm.runInContext(extract('async function listAllObjects(','function explorerSearchScore('),context);
  vm.runInContext(extract('async function expandExplorerEntries(','// Explicit Debug action.'),context);
  vm.runInContext(extract('async function explorerDirectoryExists(','function objectKeyFromLocation('),context);
  context.listObjectsPage=async(a,b,p='',cursor='')=>({objects:[...stored.values()].filter(o=>o.key.startsWith(p)).map(({key,size,etag,httpMetadata})=>({key,size,etag,httpMetadata})),cursor:'',truncated:false});
  const send=async m=>{messages.push(m);try{switch(m.type){
    case 'profiles':return {ok:true,profiles:[{id:'fixture-profile',type:'cloudflare-r2',name:'Saved fixture',...source,defaultPrefix:'Photos/',token:profile.token,workerUrl:profile.workerUrl,workerVersion:6}]};
    case 'transferHistory':return {ok:true,transferHistory:[{ok:true,location:'fixture.txt'}]};
    case 'cfPublicAddresses':return {ok:true,accountId:source.accountId,bucketName:source.bucketName,addresses:[{label:'R2 domain',base:'https://fixture.r2.dev',state:'configured'}]};
    case 'cfCreateBucket':return {ok:true,bucket:{name:m.name}};
    case 'cfProvision':return {ok:true,verification:{workerReachable:true},profile:{token:'must-not-leak'}};
    case 'cfAccounts':return {ok:true,accounts:[{id:source.accountId,name:'Fixture'}]};
    case 'cfBuckets':return {ok:true,buckets:[{name:source.bucketName}]};
    case 'cfArchiveEntries':return {ok:true,...await manage(profile,{action:'listArchive',key:m.key})};
    case 'cfExtractArchive':return {ok:true,...await manage(profile,{action:'extractArchiveEntries',key:m.key,entries:m.entries,destinationPrefix:m.destinationPrefix})};
    case 'cfTransferObjects':return {ok:true,...await context.transferExplorerObjects(m)};
    case 'cfRenameEntry':return {ok:true,...await context.renameExplorerEntry(m)};
    case 'cfDeleteObjects':return {ok:true,...await context.deleteExplorerObjects(m)};
    case 'cfCreateFolder':return {ok:true,...await context.createExplorerFolder(m)};
    case 'ingest':return {ok:true,location:'https://fixture.invalid/remote-result'};
    default:throw Error('Unexpected message '+m.type);
  }}catch(e){return {ok:false,error:e.message};}};
  const http={async boundedFetch(url,options){assert.equal(url,profile.workerUrl);assert.equal(JSON.parse(options.body).action,'capabilities');return worker.fetch(new Request(url,options),{STORAGE:bucket});},async request(path,options={}){requests.push({path,options});if(options.method==='PUT'){if(cancelled)throw Error('Disconnected');const k=path.split('/objects/')[1].split('/').map(decodeURIComponent).join('/');await bucket.put(k,options.body,{httpMetadata:{contentType:options.headers['content-type']}});return Response.json({success:true,result:{key:k}});}
    if(path.includes('/objects/')){const k=path.split('/objects/')[1].split('/').map(decodeURIComponent).join('/'),o=stored.get(k);return o?new Response(new Blob([o.bytes]).stream()):new Response(null,{status:404});}
    const u=new URL('https://fixture.invalid'+path),p=u.searchParams.get('prefix')||'',delimiter=u.searchParams.get('delimiter'),delimited=new Set(),objects=[];
    for(const o of stored.values()){if(!o.key.startsWith(p))continue;const relative=o.key.slice(p.length),slash=relative.indexOf('/');if(delimiter&&slash>=0)delimited.add(p+relative.slice(0,slash+1));else objects.push({key:o.key,size:o.size,etag:o.etag});}
    return Response.json({success:true,result:{objects,delimited:[...delimited]}});
  },async download(s,k,n,onState){assert.ok(stored.has(k));onState({state:'complete'});return 123;}};
  const adapter=createR2Adapter({send,http});return {api:createFileApi(adapter),adapter,http,stored,messages,requests,bucket,disconnect(){cancelled=true;}};
}
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
test('conflicts skip, keep both and explicitly replace while preserving accurate bytes',async()=>{
  const f=await fixture();await f.bucket.put('a.txt','original');const file=new File(['replacement'],'a.txt');
  let r=await f.api.run('upload',{source,file,key:'a.txt'});assert.equal(r.state,'partial');assert.equal(f.stored.get('a.txt').bytes.toString(),'original');
  r=await f.api.run('upload',{source,file,key:'a.txt',conflict:'keep'});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(f.stored.get('a (2).txt').bytes.toString(),'replacement');assert.equal(f.stored.get('a.txt').bytes.toString(),'original');
  r=await f.api.run('upload',{source,file,key:'a.txt',conflict:'replace'});assert.equal(r.state,'completed');assert.equal(f.stored.get('a.txt').bytes.toString(),'replacement');
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
async function uiFixture({saved=null,sendOverride=null,httpOverride=null,autoOpen=true}={}){
  const f=await fixture();if(sendOverride||httpOverride){const original=f.adapter;const alternate=createR2Adapter({send:sendOverride?m=>sendOverride(m,f):undefined,http:httpOverride?httpOverride(f.http):f.http});for(const method of ['accounts','buckets','connectionStatus'])if(sendOverride)f.adapter[method]=alternate[method];if(httpOverride)f.adapter.list=alternate.list;}await f.bucket.put('root.txt','payload');await f.bucket.put('Photos/one.jpg','image');
  const html=await readFile(new URL('../extension/beta/explorer.html',import.meta.url),'utf8'),ui=await readFile(new URL('../extension/beta/explorer.mjs',import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:'https://extension.fixture/beta/explorer.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  w.fetch=fetch;w.URL.createObjectURL=URL.createObjectURL;w.URL.revokeObjectURL=URL.revokeObjectURL;
  w.eval(await readFile(new URL('../extension/public-addresses.js',import.meta.url),'utf8'));
  w.collectDroppedFiles=collectDroppedFiles;w.prefix=prefix;w.name=name;w.previewType=previewType;w.createFileApi=createFileApi;w.createR2Adapter=()=>Object.fromEntries(Object.entries(f.adapter).map(([method,value])=>[method,typeof value==='function'?(input,options={})=>{
    // jsdom UI and Node fetch run in different realms; bridge cancellation only.
    if(options.signal&&!(options.signal instanceof AbortSignal)){const controller=new AbortController();if(options.signal.aborted)controller.abort();else options.signal.addEventListener('abort',()=>controller.abort(),{once:true});options={...options,signal:controller.signal};}
    return value(input,options);
  }:value]));const storage={betaExplorerLocation:saved};f.storage=storage;w.chrome={storage:{local:{get:async key=>({[key]:storage[key]}),set:async values=>Object.assign(storage,values)},onChanged:{addListener(fn){f.authChanged=fn;}}}};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(value){this.returnValue=value;this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  w.document.querySelector('#dialog-confirm').addEventListener('click',e=>{e.preventDefault();w.document.querySelector('#dialog').close('ok');});
  w.eval(ui.replace(/^import .*;\n/gm,''));
  const settle=async fn=>{for(let i=0;i<600;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}assert.ok(fn(),'UI did not reach expected state');};
  await settle(()=>w.document.querySelector('#buckets button'));if(autoOpen){await settle(()=>w.document.querySelector('[data-key="root.txt"]'));}else await settle(()=>!w.document.querySelector('#refresh').disabled);
  return {...f,dom,w,d:w.document,settle};
}
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
    d.querySelector('#preferences').click();assert.ok(d.querySelector('#preferences-dialog').open);d.querySelector('#pref-concurrency').value='2';d.querySelector('#pref-upload').value='450';d.querySelector('#preferences-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.match(d.querySelector('#status').textContent,/applied/);
    d.querySelector('[data-key="root.txt"]').click();d.querySelector('#duplicate').click();await settle(()=>f.stored.has('root (copy).txt')&&!d.querySelector('#upload').disabled);assert.equal(f.stored.get('root (copy).txt').bytes.toString(),'payload');
    d.querySelector('[data-key="root.txt"]').click();d.querySelector('#preview').click();await settle(()=>d.querySelector('#preview-dialog').open);assert.equal(d.querySelector('#preview-content pre').textContent,'payload');d.querySelector('#preview-close').click();assert.equal(d.querySelector('#preview-content').children.length,0);
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
  const f=await uiFixture({sendOverride:async m=>m.type==='cfAccounts'?{ok:true,accounts:[{id:source.accountId}]}:m.type==='cfBuckets'?{ok:true,buckets:[{name:source.bucketName}]}:{ok:true,profiles:[]}});try{f.d.querySelector('[data-key="root.txt"]').click();f.d.querySelector('#duplicate').click();await f.settle(()=>/No file changes were sent/.test(f.d.querySelector('#status').textContent));assert.ok(!f.stored.has('root (copy).txt'));assert.ok(!f.messages.some(m=>['cfProvision','cfTransferObjects'].includes(m.type)));f.d.querySelector('#refresh').click();await f.settle(()=>/Set up right-click destination/.test(f.d.querySelector('#status').textContent)&&!f.d.querySelector('#refresh').disabled);assert.ok(f.d.querySelector('#refresh').classList.contains('attention'));}finally{f.dom.window.close();}
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
