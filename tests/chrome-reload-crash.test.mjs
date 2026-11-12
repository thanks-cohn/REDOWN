import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {webcrypto,createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {unzipSync,strFromU8} from 'fflate';
import {worker} from './helpers/background-worker.mjs';
const base='653ad9b5fdd59532df571514fc60053d8a7b13bb',code=readFileSync('extension/startup-crash-trace.js','utf8'),entry=readFileSync('extension/service-worker.js','utf8'),pause=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(local={},options={}){
 let failure=false;const warnings=[],handlers={};const storage={get:async k=>{if(failure)throw new DOMException('PRIVATE quota path','QuotaExceededError');return {[k]:structuredClone(local[k])};},set:async p=>{if(failure)throw new DOMException('PRIVATE','QuotaExceededError');Object.assign(local,structuredClone(p));}};
 const runtime={getManifest:()=>({version:'0.5.27'}),onSuspend:{addListener:f=>handlers.suspend=f},onSuspendCanceled:{addListener:f=>handlers.canceled=f}},chrome={storage:{local:storage},runtime};
 let clock=100000;const locks={request:async(_name,f)=>f()};
 const c=vm.createContext({crypto:webcrypto,chrome,navigator:{locks},performance,setTimeout,clearTimeout,console:{warn:(...x)=>warnings.push(x)},addEventListener:(name,f)=>handlers[name]=f});vm.runInContext(code,c);
 const trace=c.RedownStartupCrashTrace.create({chrome,now:()=>clock,locks,...options});
 return {local,c,trace,chrome,handlers,warnings,fail:v=>failure=v,advance:n=>clock+=n};
}
test('cold worker records evaluation/import/listener/menu/toolbar, with exactly one opener',async()=>{
 const h=worker(undefined,{backgroundSource:entry});await h.ready();await h.context.entryEvidenceQueue;await h.context.RedownStartupTrace.flush();const snapshot=await h.context.RedownStartupTrace.snapshot(),codes=snapshot.events.map(e=>e.code);
 for(const expected of ['WORKER_EVALUATION','CORE_IMPORT_BEGIN','CORE_IMPORT_READY','ENTRY_LISTENER_REGISTERED','MENU_ACKNOWLEDGED','TOOLBAR_CONFIGURED'])assert.ok(codes.includes(expected),expected);
 assert.equal(h.chrome.action.onClicked.listeners.length,1);assert.equal(h.chrome.contextMenus.onClicked.listeners.length,1);assert.equal(h.context.RedownBoot.workerEpoch,h.context.RedownStartupTrace.epoch);
});
test('thrown core import leaves early persisted failure and the original recovery listener',async()=>{
 const h=worker(undefined,{backgroundSource:entry,import:'background.js'});await h.context.entryEvidenceQueue;await h.context.RedownStartupTrace.flush();const snapshot=await h.context.RedownStartupTrace.snapshot();assert.ok(snapshot.events.some(e=>e.code==='CORE_IMPORT_FAILED'));assert.equal(h.chrome.action.onClicked.listeners.length,1);assert.equal(h.context.RedownWorkerCoreStatus,'failed');assert.equal(h.chrome.contextMenus.onClicked.listeners.length,0);
 let calls=0;h.chrome.sidePanel.open=async()=>{calls++;};await h.context.openToolbarInterface({id:1,windowId:7});assert.equal(calls,1);
});
test('reactivation marks predecessor reason unknown; install/update/start are separate observations',async()=>{
 const h=worker(undefined,{backgroundSource:entry});await h.ready();await h.context.RedownStartupTrace.flush();const old=h.context.RedownStartupTrace.epoch;
 const next=worker(h.local,{backgroundSource:entry,nativeEntries:[...h.native]});await next.ready();next.chrome.runtime.onInstalled.listeners[0]({reason:'update'});next.chrome.runtime.onStartup.listeners[0]();await next.context.entryEvidenceQueue;await next.context.RedownStartupTrace.flush();const s=await next.context.RedownStartupTrace.snapshot();assert.ok(s.events.some(e=>e.code==='PREVIOUS_EPOCH_STOPPED_REASON_UNKNOWN'&&e.previousEpoch===old));assert.ok(s.events.some(e=>e.code==='WORKER_UPDATE'&&e.reason==='update'));assert.ok(s.events.some(e=>e.code==='BROWSER_START'));assert.ok(!JSON.stringify(s.events).includes('crash confirmed'));
});
test('bounded Chrome API names timeout precisely and records late success and rejection without cancellation',async()=>{
 const h=worker(undefined,{backgroundSource:entry});await h.ready();const attemptId=webcrypto.randomUUID();let resolve;
 const original=new Promise(r=>resolve=r);await assert.rejects(h.context.boundedEntry(original,5,'runtime.getContexts',attemptId),e=>e.code==='ENTRY_TIMEOUT'&&e.operation==='runtime.getContexts'&&e.budgetMs===5);resolve([]);await pause(2);
 await assert.rejects(h.context.boundedEntry(()=>{throw Object.assign(new Error('PRIVATE_URL https://secret.invalid/?token=X'),{name:'TypeError'});},20,'runtime.sendMessage',attemptId));
 let reject;const pending=new Promise((_,r)=>reject=r);await assert.rejects(h.context.boundedEntry(pending,5,'runtime.sendMessage',attemptId));reject(Error('PRIVATE late rejection'));await pause(2);await h.context.RedownStartupTrace.flush();const s=await h.context.RedownStartupTrace.snapshot(),events=s.events.filter(e=>e.attemptId===attemptId);
 assert.ok(events.some(e=>e.code==='API_TIMED_OUT'&&e.api==='runtime.getContexts'&&e.budgetMs===5));assert.ok(events.some(e=>e.code==='API_LATE_ACCEPTED'));assert.ok(events.some(e=>e.code==='API_REJECTED'&&e.errorName==='TypeError'));assert.ok(events.some(e=>e.code==='API_LATE_REJECTED'));assert.doesNotMatch(JSON.stringify(s),/PRIVATE|secret.invalid|token=X/);
});
test('Shelf readiness tolerates a 200ms contexts response, and unknown readiness never triggers another surface',async()=>{
 const h=worker(undefined,{backgroundSource:entry});await h.ready();h.chrome.runtime.getContexts=async()=>{await pause(200);return [{windowId:7}];};h.chrome.runtime.sendMessage=async()=>({ready:true});assert.equal(await h.context.verifyShelf(7,webcrypto.randomUUID()),true);
 h.chrome.runtime.getContexts=async()=>[];const before=h.calls.filter(c=>['attached','window','tab'].includes(c[0])).length;assert.equal(await h.context.verifyShelf(8,webcrypto.randomUUID()),false);assert.equal(h.calls.filter(c=>['attached','window','tab'].includes(c[0])).length,before);
});
test('a pending native open remains single after its deadline, then records its late completion',async()=>{
 const h=worker(undefined,{backgroundSource:entry});await h.ready();let resolve,opens=0;h.chrome.sidePanel.open=()=>{opens++;return new Promise(r=>resolve=r);};const first=h.context.openToolbarInterface({id:1,windowId:7});await pause(45);assert.equal(h.context.openToolbarInterface({id:1,windowId:7}),first);assert.equal(h.context.openToolbarInterface({id:2,windowId:8}),first);assert.equal(opens,1);resolve();await first;await h.context.RedownStartupTrace.flush();const s=await h.context.RedownStartupTrace.snapshot();assert.ok(s.events.some(e=>e.code==='SHELF_OPEN_PENDING'));assert.ok(s.events.some(e=>e.code==='SHELF_OPEN_LATE_ACCEPTED'));assert.ok(!h.calls.some(c=>['attached','window','tab'].includes(c[0])));
});
test('ring retention/bytes and storage rejection are bounded and restart-readable without touching user state',async()=>{
 const f=fixture({transferHistory:[{id:'keep'}],cloudflareAuth:{accessToken:'PRIVATE_TOKEN'}},{limits:{records:3,bytes:2000,retentionMs:100}});for(let i=0;i<6;i++)f.trace.record({component:'worker',stage:'evaluation',code:'WORKER_EVALUATION',status:'started'});await f.trace.flush();let s=await f.trace.snapshot();assert.equal(s.events.length,3);assert.equal(s.completeness.droppedLowerBound,3);assert.deepEqual(f.local.transferHistory,[{id:'keep'}]);assert.equal(f.local.cloudflareAuth.accessToken,'PRIVATE_TOKEN');
 f.advance(101);f.trace.record({code:'CORE_IMPORT_READY',status:'accepted'});await f.trace.flush();s=await f.trace.snapshot();assert.equal(s.events.length,1);assert.equal(s.completeness.expired,3);
 f.fail(true);assert.doesNotThrow(()=>f.trace.record({code:'CORE_IMPORT_FAILED',status:'rejected'}));await f.trace.flush();assert.equal((await f.trace.snapshot()).status,'unavailable');assert.ok(f.warnings.length>0);f.fail(false);f.trace.record({code:'CORE_IMPORT_READY'});await f.trace.flush();assert.ok((await f.trace.snapshot()).completeness.storageFailuresLowerBound>=1);
 const next=fixture(f.local);assert.ok((await next.trace.snapshot()).events.length>0);
 const tiny=fixture({}, {limits:{bytes:1}});tiny.trace.record({code:'CORE_IMPORT_READY'});await tiny.trace.flush();assert.equal((await tiny.trace.snapshot()).events.length,0);
});
test('page error/rejection collection and read-only Options disclosure use safe frames only',async()=>{
 const local={},dom=new JSDOM('<details id="startup-crash-trace"><summary>Startup trace</summary><pre id="startup-crash-trace-output"></pre></details>',{url:'https://extension.test/options.html',runScripts:'outside-only'}),w=dom.window;
 w.chrome={runtime:{getManifest:()=>({version:'0.5.27'})},storage:{local:{get:async k=>({[k]:local[k]}),set:async p=>Object.assign(local,p)}}};w.crypto.randomUUID=()=>webcrypto.randomUUID();w.console.warn=()=>{};w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const error=Object.assign(new Error('PRIVATE page URL token'),{name:'CompileError',stack:'PRIVATE function https://secret.invalid/options.js:517:9\nhttps://secret.invalid/private-name.js:1:2'});w.dispatchEvent(new w.ErrorEvent('error',{error}));const rejection=new w.Event('unhandledrejection');rejection.reason=error;w.dispatchEvent(rejection);await w.RedownStartupTrace.flush();const snapshot=await w.RedownStartupTrace.snapshot();assert.ok(snapshot.events.some(e=>e.code==='PAGE_ERROR'&&e.errorName==='CompileError'));assert.ok(snapshot.events.some(e=>e.code==='UNHANDLED_REJECTION'));assert.doesNotMatch(JSON.stringify(snapshot),/PRIVATE|https:|secret.invalid|private-name/);
 w.document.getElementById('startup-crash-trace').open=true;w.document.getElementById('startup-crash-trace').dispatchEvent(new w.Event('toggle'));await pause(5);assert.match(w.document.getElementById('startup-crash-trace-output').textContent,/PAGE_ERROR/);w.close();
});
function previewFixture(){
 const dom=new JSDOM('<section id="workspace-preview"></section><section id="workspace-objects"></section>',{url:'https://extension.test/options.html',runScripts:'outside-only'}),w=dom.window,nav=[];let fetches=0;
 Object.assign(w,{$:id=>w.document.getElementById(id),workspacePreviewRequestId:0,workspacePreviewAbort:null,workspacePreviewUrl:'',workspacePreviewExpanded:false,setOperation:()=>({}),finishOperation:()=>{},setWorkspacePreviewProgress:()=>{},workspaceLightboxOpen:()=>false,setWorkspacePreviewLightbox:()=>{},setWorkspacePreviewExpanded:()=>{},navigatePreview:n=>nav.push(n),explorerSource:()=>({accountId:'fixture',bucketName:'fixture'}),formatBytes:n=>n+' bytes',fetch:async()=>{fetches++;return {ok:true,status:200,text:async()=> 'text preview'};}});
 const options=readFileSync('extension/options.js','utf8');w.eval(options.slice(options.indexOf('function objectContentType('),options.indexOf('function setWorkspacePreviewProgress(')));
 return {dom,w,nav,get fetches(){return fetches;}};
}
test('GLB/glTF fall back without model-viewer execution while details/open link and navigation remain',async()=>{
 const f=previewFixture();try{for(const obj of [{key:'model.glb',size:12},{key:'model.gltf',contentType:'application/json',size:15},{key:'model.glb',contentType:'application/octet-stream',size:12}]){
 await f.w.showWorkspacePreview(obj,null,'https://fixture.invalid/authorized-file');const d=f.w.document;assert.match(d.getElementById('workspace-preview').textContent,/3D preview temporarily unavailable in this Chrome extension\. Download the file to view it locally\./);assert.equal(d.querySelector('model-viewer'),null);assert.ok(d.querySelector('.preview-details').textContent.includes(obj.key));assert.equal(d.querySelector('.preview-url').href,'https://fixture.invalid/authorized-file');d.querySelector('[aria-label="Previous file"]').click();d.querySelector('[aria-label="Next file"]').click();
 }assert.deepEqual(f.nav,[-1,1,-1,1,-1,1]);assert.equal(f.fetches,0);}finally{f.dom.window.close();}
});
test('image/video/audio/PDF/text previews retain their renderers',async()=>{
 const f=previewFixture();try{for(const [key,selector] of [['photo.png','img'],['movie.mp4','video'],['audio.mp3','audio'],['document.pdf','iframe'],['notes.txt','pre.text-preview']]){await f.w.showWorkspacePreview({key,size:1},null,'https://fixture.invalid/authorized-file');assert.ok(f.w.document.querySelector(selector),key);assert.ok(f.w.document.querySelector('.preview-details'));}}finally{f.dom.window.close();}
});
test('vendor, manifest/CSP, original diagnostics and all existing button IDs/labels remain intact',()=>{
 const old=path=>execFileSync('git',['show',base+':'+path]);for(const path of ['extension/model-viewer.min.js','extension/manifest.json','extension/diagnostic-download.js','extension/diagnostic-bundle.js'])assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),createHash('sha256').update(old(path)).digest('hex'),path);
 const before=new JSDOM(old('extension/options.html').toString()),after=new JSDOM(readFileSync('extension/options.html','utf8'));try{assert.ok(![...after.window.document.scripts].some(s=>s.src.includes('model-viewer')));for(const button of before.window.document.querySelectorAll('button[id]'))assert.equal(after.window.document.getElementById(button.id)?.outerHTML,button.outerHTML,button.id);}finally{before.window.close();after.window.close();}
});
test('new RAW and SECURE exports add only the same safe startup JSON; existing forensic file contents stay unchanged',async()=>{
 const f=fixture();f.trace.record({code:'CORE_IMPORT_FAILED',component:'core',stage:'import',status:'rejected',error:new Error('PRIVATE_AUTH https://secret.invalid')});await f.trace.flush();
 const dom=new JSDOM('<button id="forensic-export-raw"></button><button id="forensic-export-secure"></button><p id="forensic-export-status"></p>',{url:'https://extension.test/options.html',runScripts:'outside-only'}),w=dom.window,blobs=[];
 w.TextEncoder=TextEncoder;w.Uint8Array=Uint8Array;w.Blob=Blob;w.confirm=()=>true;w.chrome={storage:{local:{get:async()=>({})}}};w.RedownStartupTrace=f.trace;w.RedownForensicDiagnostics={create:()=>({snapshot:async()=>({completeness:{storedRecords:1,droppedRecords:0,storageFailureCount:0}})}),build:async(_,mode)=>({filename:mode+'.zip',files:{'forensics.json':'UNCHANGED '+mode,'README.md':'UNCHANGED README'}})};w.URL.createObjectURL=b=>{blobs.push(b);return 'blob:fixture';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};w.eval(readFileSync('extension/vendor/fflate.js','utf8'));w.eval(readFileSync('extension/forensic-download.js','utf8'));
 try{for(const id of ['forensic-export-raw','forensic-export-secure']){w.document.getElementById(id).click();for(let n=0;n<60&&w.document.getElementById(id).disabled;n++)await pause(5);}assert.equal(blobs.length,2);for(let i=0;i<2;i++){const files=unzipSync(new Uint8Array(await blobs[i].arrayBuffer()));assert.equal(Object.keys(files).length,3);assert.equal(strFromU8(files['forensics.json']),'UNCHANGED '+(i?'SECURE':'RAW'));assert.equal(strFromU8(files['README.md']),'UNCHANGED README');const text=strFromU8(files['startup-crash-trace.json']);assert.ok(text.includes('CORE_IMPORT_FAILED'));assert.doesNotMatch(text,/PRIVATE_AUTH|secret.invalid/);}}finally{w.close();}
});

test('worker error/rejection and suspend/cancel signals remain observations, never confirmed crashes',async()=>{
 const f=fixture();const trace=f.c.RedownStartupCrashTrace.install('worker');assert.equal(f.c.RedownStartupCrashTrace.install('worker'),trace);f.handlers.suspend();f.handlers.canceled();f.handlers.error({error:Object.assign(new Error('PRIVATE worker source URL'),{stack:'at chrome-extension://id/background.js:23:8'})});f.handlers.unhandledrejection({reason:new TypeError('PRIVATE token')});await trace.flush();const s=await trace.snapshot();for(const code of ['WORKER_SUSPEND_OBSERVED','WORKER_SUSPEND_CANCELLED','WORKER_ERROR','UNHANDLED_REJECTION'])assert.ok(s.events.some(e=>e.code===code),code);assert.doesNotMatch(JSON.stringify(s),/PRIVATE|source URL|chrome-extension:/);
});
