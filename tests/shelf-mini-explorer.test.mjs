import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {IDBFactory} from 'fake-indexeddb';
import {JSDOM} from 'jsdom';
import {createFileApi} from '../extension/beta/file-api.mjs';
import {createR2Adapter} from '../extension/beta/r2-adapter.mjs';
import {createExplorerModel,identity,windowRange} from '../extension/shelf-explorer-model.mjs';
import {createDragBridge,DRAG_TYPE} from '../extension/chute-drag.mjs';
import {mountExplorer} from '../extension/shelf-explorer.mjs';
const settle=()=>new Promise(r=>setTimeout(r,20));
const a={accountId:'account-a',bucketName:'photos',prefix:''},b={accountId:'account-b',bucketName:'photos',prefix:''};
function stageFactory(indexedDB=new IDBFactory(),now=Date.now){return RedownChuteStage.createStage({indexedDB,now});}

test('NAV-01/02: File Explorer is a first-class route and switching never opens a window',async()=>{
 const dom=new JSDOM(readFileSync('extension/shelf.html','utf8'),{url:'https://extension.test/shelf.html#explorer',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;let opened=0;
 w.scrollTo=()=>{};
 w.chrome={storage:{local:{get:async()=>({})},session:{get:async()=>({})},onChanged:{addListener(){}}},runtime:{getURL:p=>'https://extension.test/'+p,sendMessage:async()=>({ok:true,accounts:[]})},tabs:{create:()=>{opened++;}}};
 w.eval(readFileSync('extension/shelf.js','utf8'));
 assert.deepEqual([...w.document.querySelectorAll('nav[aria-label="Shelf"] a')].map(a=>a.hash),['#explorer','#clouds','#history','#settings','#queue']);
 for(const name of ['explorer','clouds','history','settings','queue','explorer']){
  w.location.hash='#'+name;w.dispatchEvent(new w.Event('hashchange'));await settle();
  assert.equal(w.document.getElementById(name+'-view').hidden,false);assert.equal(w.document.querySelector('[aria-current="page"]').id,'nav-'+name);
 }
 assert.equal(opened,0);dom.window.close();
});

test('NAV: REMOTES is the default even though FILES is first; Settings opt into last view and explicit hashes win',async()=>{
 async function boot(stored={},hash=''){
  const dom=new JSDOM(readFileSync('extension/shelf.html','utf8'),{url:'https://extension.test/shelf.html'+hash,runScripts:'outside-only'}),w=dom.window;
  const memory={...stored};
  w.chrome={
   storage:{local:{
    get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,memory[key]])),
    set:async values=>{Object.assign(memory,values);}
   },session:{get:async()=>({})},onChanged:{addListener(){}}},
   runtime:{getURL:p=>'https://extension.test/'+p,sendMessage:async()=>({ok:true,accounts:[]})},
   tabs:{create:async()=>({})}
  };
  w.eval(readFileSync('extension/shelf.js','utf8'));await settle();
  return {dom,w,memory};
 }
 let run=await boot({shelfLastViewV1:'explorer'});
 try{
  assert.equal(run.w.document.querySelector('[aria-current="page"]').textContent,'REMOTES');
  assert.equal(run.w.location.hash,'');
  assert.equal(run.w.document.querySelector('input[name="shelf-start-view-mode"]:checked').value,'remotes');
  assert.equal(run.w.document.querySelector('nav[aria-label="Shelf"] a').textContent,'FILES');
  const last=run.w.document.querySelector('input[name="shelf-start-view-mode"][value="last"]');
  last.checked=true;last.dispatchEvent(new run.w.Event('change',{bubbles:true}));await settle();
  assert.equal(run.memory.shelfStartViewMode,'last');
  assert.equal(run.w.document.querySelector('[aria-current="page"]').textContent,'REMOTES','Changing setting must not navigate away immediately');
 }finally{run.dom.window.close();}
 run=await boot({shelfStartViewMode:'last',shelfLastViewV1:'history'});
 try{
  assert.equal(run.w.location.hash,'#history');
  assert.equal(run.w.document.querySelector('[aria-current="page"]').textContent,'HISTORY');
  assert.equal(run.w.document.querySelector('input[name="shelf-start-view-mode"]:checked').value,'last');
 }finally{run.dom.window.close();}
 run=await boot({shelfStartViewMode:'remotes',shelfLastViewV1:'explorer'},'#settings');
 try{
  assert.equal(run.w.location.hash,'#settings','A deliberate deep link overrides the default');
  assert.equal(run.w.document.querySelector('[aria-current="page"]').textContent,'SETTINGS');
 }finally{run.dom.window.close();}
 run=await boot({shelfStartViewMode:'untrusted',shelfLastViewV1:'explorer'});
 try{assert.equal(run.w.location.hash,'');assert.equal(run.w.document.querySelector('[aria-current="page"]').textContent,'REMOTES');}
 finally{run.dom.window.close();}
 run=await boot({shelfStartViewMode:'last',shelfLastViewV1:'untrusted'});
 try{assert.equal(run.w.location.hash,'');assert.equal(run.w.document.querySelector('[aria-current="page"]').textContent,'REMOTES');}
 finally{run.dom.window.close();}
});

test('API-01/B: actual R2 adapter listing and authorised readStream feed real staged bytes',async()=>{
 const requests=[],sends=[],data=new Uint8Array([0,255,42,13]);
 const api=createFileApi(createR2Adapter({send:async m=>{sends.push(m);return {ok:true,accounts:[{id:a.accountId}],buckets:[{name:a.bucketName}]};},http:{request:async path=>{
  requests.push(path);if(path.includes('?'))return Response.json({result:{objects:[{key:'image.png',size:4,httpMetadata:{contentType:'image/png'}}],delimited:['Images/']}});
  return new Response(data);
 }}}));
 const model=createExplorerModel({api});await model.navigate(a);
 assert.equal(model.state.entries[0].key,'Images/');const entry=model.state.entries.find(e=>!e.folder);
 const stage=stageFactory(),bridge=createDragBridge({api,stage,maxBytes:1024,send:async()=>({ok:true})});
 const handle=await bridge.prepare(a,entry);assert.equal(handle.source,identity(a));assert.equal(handle.key,'image.png');
 const stored=await stage.update(handle.id,v=>v.blob);assert.deepEqual(new Uint8Array(await stored.arrayBuffer()),data);
 const transfer=new Map();let prevented=false;
 assert.equal(bridge.begin({preventDefault(){prevented=true;},dataTransfer:{setData:(k,v)=>transfer.set(k,v)}}),true);
 assert.equal(transfer.size,1);assert.ok(transfer.has(DRAG_TYPE));assert.equal(prevented,false);
 assert.ok(requests.every(p=>p.startsWith('/accounts/account-a/r2/buckets/photos/objects')));
 assert.ok(!sends.some(m=>/ingest|Provision|Transfer/.test(m.type)));
 await bridge.cancel();assert.equal(await stage.update(handle.id,()=>true),null);await stage.close();
});

test('STATE-01: rapid account navigation discards late response even when transport ignores abort',async()=>{
 let release;const api=createFileApi({list:({source})=>source.accountId===a.accountId?new Promise(r=>release=r):Promise.resolve({entries:[{key:'private-b',folder:false}],cursor:''})});
 const model=createExplorerModel({api});const old=model.navigate(a);await settle();await model.navigate(b);release({entries:[{key:'private-a',folder:false}],cursor:''});await old;
 assert.equal(model.state.source.accountId,b.accountId);assert.deepEqual(model.state.entries.map(e=>e.key),['private-b']);
});

test('RAIL: bounded rail reads cannot queue foreground navigation behind slow buckets',async()=>{
 let outstanding=0,peak=0;const releases=[];const api=createFileApi({list:async({source})=>{
  if(source.prefix==='foreground/')return {entries:[],cursor:''};
  outstanding++;peak=Math.max(peak,outstanding);await new Promise(r=>releases.push(r));outstanding--;return {entries:[],cursor:''};
 }});
 const model=createExplorerModel({api}),tasks=Array.from({length:6},(_,i)=>model.children({...a,prefix:i+'/'}));await settle();assert.equal(peak,3);
 await model.navigate({...b,prefix:'foreground/'});assert.equal(model.state.phase,'ready');
 releases.splice(0).forEach(r=>r());await settle();releases.splice(0).forEach(r=>r());await Promise.all(tasks);assert.equal(peak,3);
});

test('RAIL cache: expiry, explicit refresh and auth reset cannot reuse stale rail inflight data',async()=>{
 let calls=0,clock=0;const model=createExplorerModel({api:createFileApi({list:async()=>({entries:[{key:String(++calls)}],cursor:''})}),now:()=>clock});
 await model.children(a);await model.children(a);assert.equal(calls,1);clock=31000;await model.children(a);assert.equal(calls,2);model.invalidate();await model.children(a);assert.equal(calls,3);
 model.reset();await model.children(a);assert.equal(calls,4);
});

test('PERF: 1/10/100/1000/10000 entries keep a bounded render window and account identities distinct',()=>{
 for(const length of [1,10,100,1000,10000])for(const scroll of [0,length*24,Math.max(0,length*48-350)]){
  const range=windowRange(length,scroll,350);assert.ok(range.end-range.start<=20);assert.ok(range.start>=0);assert.ok(range.end<=length);
 }
 assert.notEqual(identity(a),identity(b));
});

test('DND-05: cancelled preparation, size changes, huge/unknown file sizes never leave staging',async()=>{
 const stage=stageFactory();let release;
 const api=createFileApi({readStream:async(_,o)=>{await new Promise(r=>release=r);await o.onChunk(new Uint8Array([1,2]));return {size:2};}});
 const bridge=createDragBridge({api,stage,maxBytes:4});
 await assert.rejects(bridge.prepare(a,{key:'huge',size:5}),/up to/);
 await assert.rejects(bridge.prepare(a,{key:'unknown'}),/up to/);
 const pending=bridge.prepare(a,{key:'small',size:2});await settle();await bridge.cancel();release();await assert.rejects(pending);assert.equal(bridge.getHandle(),null);
 const changed=createDragBridge({api:createFileApi({readStream:async(_,o)=>{await o.onChunk(new Uint8Array([1,2]));return {};}}),stage,maxBytes:4});
 await assert.rejects(changed.prepare(a,{key:'shrunk',size:3}),/size changed/);assert.equal(changed.getHandle(),null);await stage.close();
});

test('DND expiry: parallel Shelf leases survive store reopen within the bounded queue',async()=>{
 const database=new IDBFactory();let clock=100;
 const first=stageFactory(database,()=>clock);const h=await first.put(new Blob(['one']),{name:'one.txt',mime:'text/plain'});
 await first.close();const second=stageFactory(database,()=>clock);assert.ok(await second.update(h.id,()=>true));
 const replacement=await second.put(new Blob(['two']),{name:'two.txt',mime:'text/plain'});assert.equal(await second.update(h.id,()=>true),true,'Another Shelf reservation must not destroy a live handoff');
 clock+=90001;await second.purge();assert.equal(await second.update(replacement.id,()=>true),null);await second.close();
});

function workerHarness(database=new IDBFactory()){
 let listener;const context=vm.createContext({indexedDB:database,crypto,Blob,Uint8Array,console,setTimeout,URL,chrome:{runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener:fn=>listener=fn}},tabs:{query:async()=>[],sendMessage:async()=>{}},alarms:{create(){},onAlarm:{addListener(){}}}}});
 vm.runInContext(readFileSync('extension/chute-stage.js','utf8'),context);vm.runInContext(readFileSync('extension/chute-worker.js','utf8'),context);
 return {stage:context.RedownChuteStage.createStage(),call:(type,id,sender,more={})=>new Promise(resolve=>listener({type:'redownChuteV1.'+type,id,...more},sender,resolve))};
}

test('DND security: exact Shelf arm, one-use claim, tab/frame binding, ordered chunks, restart and bounded retry retention',async()=>{
 const database=new IDBFactory(),h=workerHarness(database),shelf={id:'test',url:'chrome-extension://test/shelf.html'},target={id:'test',url:'https://target.invalid',tab:{id:3},frameId:0};
 const file=await h.stage.put(new Blob(['actual file']),{name:'actual.txt',mime:'text/plain'});
 assert.equal((await h.call('arm',file.id,target)).ok,false);
 assert.equal((await h.call('arm',file.id,shelf)).ok,true);
 const restarted=workerHarness(database);
 assert.equal((await restarted.call('claim',file.id,target)).name,'actual.txt');
 assert.equal((await h.call('claim',file.id,{...target,tab:{id:4}})).ok,false);
 assert.equal((await h.call('chunk',file.id,{...target,frameId:1},{offset:0})).ok,false);
 assert.equal((await h.call('chunk',file.id,{...target,url:'https://other.invalid'},{offset:0})).ok,false);
 const chunk=await h.call('chunk',file.id,target,{offset:0});assert.equal(Buffer.from(chunk.bytes).toString(),'actual file');
 assert.equal((await h.call('chunk',file.id,target,{offset:0})).ok,false);
 await h.call('finish',file.id,target,{state:'drop_dispatched'});assert.equal(await h.stage.update(file.id,v=>v.state),'drop_dispatched');
 assert.equal((await h.call('arm',file.id,shelf)).ok,false,'Consumed capability never rearms');
 assert.equal((await h.call('chunk',file.id,target,{offset:0})).ok,false);
 await h.stage.remove(file.id);
 await h.stage.close();await restarted.stage.close();
});

test('Mini UI: real File API account tree, selection is not download, virtual rows and navigation survive tab switch',async()=>{
 const dom=new JSDOM('<section id="mini"></section>',{url:'https://fixture.invalid'}),d=dom.window.document;
 const oldChrome=globalThis.chrome,oldAdd=globalThis.addEventListener,oldRemove=globalThis.removeEventListener;
 globalThis.chrome={storage:{onChanged:{addListener(){},removeListener(){}}}};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
 const calls=[];const api=createFileApi({accounts:async()=>({accounts:[{id:'account-a',name:'Account A'},{id:'account-b',name:'Account B'}]}),buckets:async()=>({buckets:[{name:'photos'}]}),list:async input=>{calls.push(['list',input]);return {entries:Array.from({length:10000},(_,i)=>({key:`f${i}.bin`,size:i,displayName:`File ${i}`})),cursor:''};},download:async()=>{calls.push(['download']);return {};}});
 let instance;
 try{
  instance=mountExplorer({host:d.getElementById('mini'),api,storage:{get:async()=>({}),set:async()=>{}}});await instance.setActive(true);await settle();
  assert.match(d.querySelector('.mini-tree').textContent,/Account A/);assert.match(d.querySelector('.mini-tree').textContent,/Account B/);
  d.querySelector('[role=treeitem]').click();await settle();const bucket=[...d.querySelectorAll('[role=treeitem]')].find(n=>n.textContent.includes('photos'));bucket.click();await settle();
  assert.equal(instance.model.state.entries.length,10000);assert.ok(d.querySelectorAll('.mini-row').length<=20);
  d.querySelector('.mini-row').click();await settle();assert.equal(calls.filter(c=>c[0]==='download').length,0);assert.equal(instance.model.state.selected.size,1);
  d.querySelector('.mini-row').dispatchEvent(new dom.window.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:10,clientY:10}));
  const menu=d.querySelector('.mini-context');assert.equal(menu.hidden,false);menu.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.hidden,true);assert.equal(d.activeElement.isConnected,true);assert.equal(d.activeElement.role,'option');
  await instance.setActive(false);await instance.setActive(true);assert.equal(instance.model.state.selected.size,1);assert.equal(instance.model.state.source.accountId,'account-a');
  const filter=d.querySelector('.mini-filter input');filter.value='no matching file';filter.dispatchEvent(new dom.window.Event('input'));assert.equal(instance.model.state.selected.size,0);assert.equal(d.querySelector('[data-action=delete]').disabled,true);assert.equal(d.querySelectorAll('.mini-row').length,0);
 }finally{instance?.dispose();dom.window.close();globalThis.chrome=oldChrome;globalThis.addEventListener=oldAdd;globalThis.removeEventListener=oldRemove;}
});

test('DND identity: same-sized object replacement between read and stat rejects staging',async()=>{
 let version=0;const stage=stageFactory(),api=createFileApi({stat:async()=>({object:{size:2,etag:String(++version)}}),readStream:async(_,o)=>{await o.onChunk(new Uint8Array([1,2]));return {};}}),bridge=createDragBridge({api,stage,maxBytes:4});
 await assert.rejects(bridge.prepare(a,{key:'file',size:2}),/changed during/);assert.equal(bridge.getHandle(),null);await stage.close();
});

test('DND negative: synthetic page drops and unrelated native drags are never intercepted',()=>{
 const dom=new JSDOM('<input type="file">',{url:'https://target.invalid',runScripts:'outside-only'}),w=dom.window;let messages=0;
 w.chrome={runtime:{id:'test',onMessage:{addListener(){}},sendMessage(){messages++;}}};
 w.eval(readFileSync('extension/chute-content.js','utf8'));
 const event=new w.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:{types:[DRAG_TYPE],getData:()=>crypto.randomUUID()}});
 w.document.querySelector('input').dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(messages,0);dom.window.close();
});

test('Site heuristics identify Lens/Search/Yandex Images without claiming Drive/Gemini support',()=>{
 const source=readFileSync('extension/chute-image-targets.js','utf8');
 for(const [url,expected] of [['https://lens.google.com/',true],['https://www.google.com/imghp',true],['https://www.google.co.uk/search?q=image',true],['https://yandex.com/images/',true],['https://drive.google.com/drive/',false],['https://gemini.google.com/app',false],['https://google.com.evil.invalid/',false],['https://mail.yandex.com/',false]]){
  const dom=new JSDOM('',{url,runScripts:'outside-only'});dom.window.eval(source);assert.equal(!!dom.window.RedownChuteImageTargets,expected,url);dom.window.close();
 }
});

test('Natural drag: first gesture synchronously carries only a reference, slow bytes arrive after drop without preparation',async()=>{
 const database=new IDBFactory(),worker=workerHarness(database),stage=stageFactory(database);let release,reads=0;
 const api=createFileApi({readStream:async(_,o)=>{reads++;await new Promise(r=>release=r);await o.onChunk(new Uint8Array([9,0,255]));return {};}});
 const bridge=createDragBridge({api,stage,send:m=>worker.call('arm',m.id,{id:'test',url:'chrome-extension://test/shelf.html'})});
 const transfer=new Map();let prevented=false;
 assert.equal(reads,0);
 assert.equal(bridge.start({preventDefault(){prevented=true;},dataTransfer:{setData:(k,v)=>transfer.set(k,v)}},a,{key:'private/image.png',displayName:'image.png',size:3,mime:'image/png'}),true);
 assert.equal(prevented,false);assert.equal(transfer.size,1);assert.match(transfer.get(DRAG_TYPE),/^[a-f0-9-]{36}$/);
 await settle();assert.equal(reads,1);
 const receiver={id:'test',url:'https://upload.invalid',tab:{id:9},frameId:0};let resolved=false;
 const claim=worker.call('claim',transfer.get(DRAG_TYPE),receiver).then(r=>{resolved=true;return r;});await settle();assert.equal(resolved,false);
 release();const meta=await claim;assert.equal(meta.name,'image.png');assert.equal(meta.mime,'image/png');assert.equal(meta.size,3);
 assert.equal((await worker.call('claim',transfer.get(DRAG_TYPE),{...receiver,frameId:1})).ok,false);
 const chunk=await worker.call('chunk',transfer.get(DRAG_TYPE),receiver,{offset:0});assert.deepEqual([...chunk.bytes],[9,0,255]);
 await worker.call('finish',transfer.get(DRAG_TYPE),receiver,{state:'drop_dispatched'});
 await bridge.dispose();await stage.close();await worker.stage.close();
});

test('Natural drag: cancellation during cloud read cannot fulfill a replaced reservation',async()=>{
 let release;const stage=stageFactory(),api=createFileApi({readStream:async(_,o)=>{await new Promise(r=>release=r);await o.onChunk(new Uint8Array([1]));return {};}});
 const bridge=createDragBridge({api,stage,send:async()=>({ok:true})}),data=new Map();
 bridge.start({preventDefault(){},dataTransfer:{setData:(k,v)=>data.set(k,v)}},a,{key:'one.bin',size:1});await settle();
 await bridge.cancel();release();await settle();assert.equal(await stage.update(data.get(DRAG_TYPE),()=>true),null);assert.equal(bridge.getHandle(),null);await stage.close();
});

test('Shelf History integration authorizes exact account/bucket/key and selects paged saved item without downloading',async()=>{
 const dom=new JSDOM('<section id="mini"></section>',{url:'https://fixture.invalid'}),d=dom.window.document;
 const originals={chrome:globalThis.chrome,add:globalThis.addEventListener,remove:globalThis.removeEventListener,nav:globalThis.RedownHistoryNavigation};let reveal;
 globalThis.chrome={storage:{onChanged:{addListener(){},removeListener(){}}}};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
 globalThis.RedownHistoryNavigation={receiveShelf:async fn=>{reveal=fn;return ()=>{};}};
 const calls=[];let missing=false;
 const api=createFileApi({accounts:async()=>({accounts:[{id:a.accountId}]}),buckets:async()=>({buckets:[{name:a.bucketName}]}),list:async()=>({entries:[{key:'same-name.png',folder:false}],cursor:'more'}),stat:async input=>{calls.push(input);return {object:missing?null:{key:input.key,size:1}};}});
 let instance;
 try{
  instance=mountExplorer({host:d.getElementById('mini'),api,storage:{get:async()=>({shelfExplorerV1:{folderWidth:36}}),set:async()=>{}}});await instance.setActive(true);await settle();
  const target={...a,provider:'cloudflare-r2',key:'nested/same-name.png',prefix:'nested/',filename:'same-name.png'};
  await reveal(target);
  assert.equal(d.querySelector('.mini-column-resize').getAttribute('aria-valuenow'),'50');
  assert.deepEqual([...instance.model.state.selected],['nested/same-name.png']);
  assert.equal(d.querySelector('.mini-row[aria-selected=true]').dataset.key,'nested/same-name.png');
  assert.equal(calls[0].source.accountId,a.accountId);assert.equal(calls[0].source.bucketName,a.bucketName);
  missing=true;await assert.rejects(reveal(target),/no longer/);assert.equal(instance.model.state.selected.size,0);
 }finally{instance?.dispose();dom.window.close();globalThis.chrome=originals.chrome;globalThis.addEventListener=originals.add;globalThis.removeEventListener=originals.remove;globalThis.RedownHistoryNavigation=originals.nav;}
});

test('variable-aspect offset windows reach the final image at every folder size without losing logical height',async()=>{
 const {offsetRange}=await import('../extension/shelf-explorer-model.mjs');
 for(const count of [1,10,100,1000,10000]){
  const offsets=[0];for(let i=0;i<count;i++)offsets.push(offsets.at(-1)+[48,120,320,80][i%4]);
  for(const fraction of [0,.25,.49,.5,.51,.75,1]){
   const scroll=(offsets.at(-1)-Math.min(350,offsets.at(-1)))*fraction,range=offsetRange(offsets,scroll,350);
   assert.equal(range.total,offsets.at(-1));assert.ok(range.top<=scroll);assert.ok(offsets[range.end]>=Math.min(range.total,scroll+350));
   if(fraction===1)assert.equal(range.end,count);
  }
 }
});

test('P0 bundled local adapter lists exact originals, serves bytes, delegates clouds and rejects all writes',async()=>{
 const {withLocalDemo,demoSource,demoAssets}=await import('../extension/local-demo.mjs');
 const {readFile}=await import('node:fs/promises');const calls=[];
 const remote={capabilities:[],run:async(...args)=>{calls.push(args);return {state:'completed',data:{accounts:[]}};}};
 const api=withLocalDemo(remote,{fetchAsset:async path=>new Response(await readFile('extension/'+path))});
 const list=await api.run('list',{source:demoSource});assert.equal(list.state,'completed');assert.deepEqual(list.data.entries.map(e=>e.displayName),['REDOWN.svg','Chutey.png']);
 assert.deepEqual(await readFile('extension/assets/demo/chutey.png'),await readFile('chute-reference/extension/icons/icon128.png'));
 for(const asset of demoAssets){const entry=list.data.entries.find(e=>e.key===asset.key),chunks=[];
 const result=await api.run('readStream',{source:demoSource,key:entry.key},{onChunk:c=>chunks.push(c)});assert.equal(result.state,'completed');assert.deepEqual(Buffer.concat(chunks),await readFile('extension/'+asset.path));
 const preview=await api.run('preview',{source:demoSource,entry});assert.equal(preview.state,'completed');assert.equal((await fetch(preview.data.url)).headers.get('content-type'),asset.type);URL.revokeObjectURL(preview.data.url);
 for(const operation of ['upload','delete','rename','move','copy','mkdir'])assert.equal((await api.run(operation,{source:demoSource,entry})).state,'failed');
 }
 const stage=stageFactory(),bridge=createDragBridge({api,stage,send:async()=>({ok:true})});
 try{const handle=await bridge.prepare(demoSource,list.data.entries[1]);const blob=await stage.update(handle.id,value=>value.blob);assert.deepEqual(Buffer.from(await blob.arrayBuffer()),await readFile('extension/assets/demo/chutey.png'));}finally{await bridge.cancel();await stage.close();}
 assert.equal(calls.length,0);await api.run('accounts');assert.equal(calls.length,1);
});

test('P0 provider projection requires current provider verification, never a cached connected label',async()=>{
 const {verifiedOtherProvider}=await import('../extension/local-demo.mjs');
 const storage={get:async()=>({googleDriveState:{phase:'connected'},'dropbox:auth':{}})};
 assert.equal(await verifiedOtherProvider(storage,{RedownGoogleDriveStream:{create:()=>({connect:async interactive=>{assert.equal(interactive,false);throw Error('expired');}})}}),null);
 assert.equal(await verifiedOtherProvider(storage,{RedownDropboxAuth:{create:()=>({ready:async(expected,force)=>{assert.equal(force,true);return {phase:'connected',rootReady:true};}})}}),'Dropbox');
 assert.equal(await verifiedOtherProvider({get:async()=>({})},{RedownDropboxAuth:{create(){throw Error('No absent-account checks');}}}),null);
});
