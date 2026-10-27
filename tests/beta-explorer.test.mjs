import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createFileApi,location,prefix,name} from '../extension/beta/file-api.mjs';
import {createR2Adapter} from '../extension/beta/r2-adapter.mjs';
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
    async head(k){return stored.get(k)||null;},async get(k){const o=stored.get(k);return o?{...o,body:new Blob([o.bytes]).stream()}:null;},
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
    case 'cfAccounts':return {ok:true,accounts:[{id:source.accountId,name:'Fixture'}]};
    case 'cfBuckets':return {ok:true,buckets:[{name:source.bucketName}]};
    case 'cfTransferObjects':return {ok:true,...await context.transferExplorerObjects(m)};
    case 'cfRenameEntry':return {ok:true,...await context.renameExplorerEntry(m)};
    case 'cfDeleteObjects':return {ok:true,...await context.deleteExplorerObjects(m)};
    case 'cfCreateFolder':return {ok:true,...await context.createExplorerFolder(m)};
    case 'ingest':return {ok:true,location:'https://fixture.invalid/remote-result'};
    default:throw Error('Unexpected message '+m.type);
  }}catch(e){return {ok:false,error:e.message};}};
  const http={async request(path,options={}){requests.push({path,options});if(options.method==='PUT'){if(cancelled)throw Error('Disconnected');const k=path.split('/objects/')[1].split('/').map(decodeURIComponent).join('/');await bucket.put(k,options.body,{httpMetadata:{contentType:options.headers['content-type']}});return Response.json({success:true,result:{key:k}});}
    if(path.includes('/objects/')){const k=path.split('/objects/')[1].split('/').map(decodeURIComponent).join('/'),o=stored.get(k);return o?new Response(new Blob([o.bytes]).stream()):new Response(null,{status:404});}
    const u=new URL('https://fixture.invalid'+path),p=u.searchParams.get('prefix')||'',delimiter=u.searchParams.get('delimiter'),delimited=new Set(),objects=[];
    for(const o of stored.values()){if(!o.key.startsWith(p))continue;const relative=o.key.slice(p.length),slash=relative.indexOf('/');if(delimiter&&slash>=0)delimited.add(p+relative.slice(0,slash+1));else objects.push({key:o.key,size:o.size,etag:o.etag});}
    return Response.json({success:true,result:{objects,delimited:[...delimited]}});
  },async download(s,k,n,onState){assert.ok(stored.has(k));onState({state:'complete'});return 123;}};
  const adapter=createR2Adapter({send,http});return {api:createFileApi(adapter),adapter,stored,messages,requests,bucket,disconnect(){cancelled=true;}};
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
test('zero bytes and 50 MiB binary upload retain bytes and forward File without client-side whole-file buffering',async()=>{
  const f=await fixture();for(const size of [0,50*1024*1024]){const bytes=Buffer.alloc(size,0xb7),file=new File([bytes],size?'big.zip':'empty.dat');file.arrayBuffer=()=>{throw Error('Client must not buffer entire file');};const r=await f.api.run('upload',{source,file,key:file.name});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(hash(f.stored.get(file.name).bytes),hash(bytes));assert.equal(f.requests.findLast(r=>r.options.method==='PUT').options.body,file);}
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
test('download reports started distinctly from Chrome completion; folder download fails honestly',async()=>{
  const f=await fixture();await f.bucket.put('a.txt','bytes');const states=[];const r=await f.api.run('download',{source,entry:{key:'a.txt'}},{onProgress:e=>states.push(e.phase)});assert.equal(r.state,'started');assert.ok(states.includes('download-complete'));assert.equal((await f.api.run('download',{source,entry:{key:'folder/',folder:true}})).state,'failed');
});
test('upload read-back detects corruption before touching the final destination',async()=>{
  const stored=new Map(),messages=[];const adapter=createR2Adapter({send:async m=>{messages.push(m);throw Error('Must not commit corrupt bytes');},http:{async request(path,options={}){
    if(options.method==='PUT'){stored.set('stage',true);return Response.json({success:true});}
    if(path.includes('/objects/'))return new Response('BAD');
    const u=new URL('https://fixture.invalid'+path),p=u.searchParams.get('prefix');return Response.json({success:true,result:{objects:p?.startsWith('.redown-beta-uploads/')?[{key:p,size:3}]:[]}});
  }}});
  const r=await createFileApi(adapter).run('upload',{source,file:new File(['OK!'],'a'),key:'a'});assert.equal(r.state,'uncertain');assert.match(r.error,/differs/);assert.equal(messages.length,0);
});
async function uiFixture(){
  const f=await fixture();await f.bucket.put('root.txt','payload');await f.bucket.put('Photos/one.jpg','image');
  const html=await readFile(new URL('../extension/beta/explorer.html',import.meta.url),'utf8'),ui=await readFile(new URL('../extension/beta/explorer.mjs',import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:'https://extension.fixture/beta/explorer.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  w.prefix=prefix;w.name=name;w.createFileApi=createFileApi;w.createR2Adapter=()=>f.adapter;w.chrome={storage:{onChanged:{addListener(){}}}};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(value){this.returnValue=value;this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  w.document.querySelector('#dialog-confirm').addEventListener('click',e=>{e.preventDefault();w.document.querySelector('#dialog').close('ok');});
  w.eval(ui.replace(/^import .*;\n/gm,''));
  const settle=async fn=>{for(let i=0;i<80;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}assert.ok(fn(),'UI did not reach expected state');};
  await settle(()=>w.document.querySelector('#buckets button'));w.document.querySelector('#buckets button').click();await settle(()=>w.document.querySelector('[data-key="root.txt"]'));
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
