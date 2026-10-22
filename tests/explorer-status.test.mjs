import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile('extension/options.js','utf8'),module=await readFile('extension/explorer-status.js','utf8');
function harness(){
 const dom=new JSDOM('<div id="explorer-status"></div><div id="explorer-operation" aria-live="polite"></div>'),d=dom.window.document,timers=[];let id=0;
 const c=vm.createContext({document:d,$:id=>d.getElementById(id),uid:()=>String(++id),safeUiMessage:String,explorerOperation:null,setTimeout:fn=>{timers.push(fn);return timers.length;}});vm.runInContext(module,c);vm.runInContext(source.slice(source.indexOf('function setExplorerStatus('),source.indexOf('function isTransientBucketAccessError(')),c);
 return {c,d,dom,timers};
}
test('one semantic mapping colors pending, completed, error, mixed and cancelled without trusting message wording',()=>{
 const h=harness();for(const [state,color] of [['running','running'],['done','success'],['failed','failed'],['partial','partial'],['cancelled','cancelled']]){
  const ticket=h.c.setOperation('copy','Operation message');h.c.finishOperation(state==='partial'?'2 copied · 1 failed':state==='cancelled'?'Operation cancelled':'Operation message',state==='failed',ticket,state);
  assert.equal(h.d.getElementById('explorer-operation').dataset.explorerState,color);assert.equal(h.d.getElementById('explorer-status').dataset.explorerState,color);
 }h.dom.window.close();
});
test('older operation callbacks, stale detail messages and old expiry timers cannot overwrite new feedback',()=>{
 const h=harness(),old=h.c.setOperation('copy','Copying…'),fresh=h.c.setOperation('download','Downloading…');h.c.finishOperation('Old copy failed',true,old);h.c.setExplorerStatus('Old details','failed',old);assert.equal(h.d.getElementById('explorer-status').textContent,'');assert.equal(h.c.explorerOperation.id,fresh);assert.equal(h.c.explorerOperation.state,'running');
 h.c.finishOperation('Done',false,fresh);const first=h.timers.at(-1);h.c.finishOperation('New terminal feedback',false,fresh,'partial');first();assert.ok(h.c.explorerOperation);assert.match(h.d.getElementById('explorer-operation').textContent,/New terminal/);
 h.timers.at(-1)();h.c.setOperation('status','New terminal feedback','partial');assert.match(h.d.getElementById('explorer-operation').textContent,/New terminal/);h.dom.window.close();
});
test('download acceptance stays neutral; only native completion turns green and user cancellation stays neutral',async()=>{
 const h=harness();let callback;Object.assign(h.c,{explorerSource:()=>({accountId:'a',bucketName:'b'}),RedownCloudflareApi:{download:async(a,b,c,fn)=>{callback=fn;}}});vm.runInContext(source.slice(source.indexOf('async function explorerDownload('),source.indexOf('let explorerPropertiesVersion=')),h.c);
 await h.c.explorerDownload({name:'file.txt',key:'file.txt'});assert.equal(h.c.explorerOperation.state,'running');callback({state:'complete'});assert.equal(h.d.getElementById('explorer-operation').dataset.explorerState,'success');
 await h.c.explorerDownload({name:'second.txt',key:'second.txt'});callback({state:'interrupted',error:'USER_CANCELED'});assert.equal(h.c.explorerOperation.state,'cancelled');assert.match(h.c.explorerOperation.message,/cancelled/);h.dom.window.close();
});
test('late completion of a previous download leaves a new active download neutral',async()=>{
 const h=harness(),callbacks=[];Object.assign(h.c,{explorerSource:()=>({accountId:'a',bucketName:'b'}),RedownCloudflareApi:{download:async(a,b,c,fn)=>callbacks.push(fn)}});vm.runInContext(source.slice(source.indexOf('async function explorerDownload('),source.indexOf('let explorerPropertiesVersion=')),h.c);
 await h.c.explorerDownload({name:'first.txt',key:'first.txt'});await h.c.explorerDownload({name:'second.txt',key:'second.txt'});callbacks[0]({state:'complete'});assert.equal(h.c.explorerOperation.state,'running');assert.match(h.c.explorerOperation.message,/second.txt/);h.dom.window.close();
});
test('partial Copy and Delete receipts use amber rather than success or an entirely failed operation',async()=>{
 const h=harness();Object.assign(h.c,{explorerSearchActive:false,explorerClipboard:{operation:'copy',accountId:'a',bucketName:'b',entries:[{key:'file'}]},friendlyError:e=>e.message,send:async()=>({ok:true,completed:2,errors:[{error:'Denied'}],conflicts:[]}),browseWorkspace:async()=>{},chrome:{storage:{session:{remove:async()=>{}}}}});vm.runInContext(source.slice(source.indexOf('async function pasteExplorer('),source.indexOf('async function moveSelectionTo(')),h.c);await h.c.pasteExplorer({accountId:'a',bucketName:'d'});assert.equal(h.c.explorerOperation.state,'partial');assert.match(h.c.explorerOperation.message,/2 files completed.*1 failed/);
 Object.assign(h.c,{selectedExplorerItems:()=>[{key:'file',name:'file'}],confirm:()=>true,explorerSource:()=>({accountId:'a',bucketName:'b'}),clipboardEntries:x=>x});vm.runInContext(source.slice(source.indexOf('async function deleteSelection('),source.indexOf('function beginExplorerRename(')),h.c);await h.c.deleteSelection();assert.equal(h.d.getElementById('explorer-operation').dataset.explorerState,'partial');h.dom.window.close();
});
test('rendered colors have sufficient text contrast for the provided dark and light surface palettes',()=>{
 const rgb=hex=>hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const luminance=hex=>rgb(hex).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
 for(const color of ['edf1f8','83d9b3','ff9aaa','e3c087'])assert.ok(contrast(color,'172239')>=4.5,color);
 for(const color of ['253247','146542','ac263e','7b510c'])assert.ok(contrast(color,'ffffff')>=4.5,color);
});

test('late folder listing cannot repaint the newer folder or its status',async()=>{
 const h=harness(),waiting=[];const objects=h.d.createElement('div');objects.id='workspace-objects';h.d.body.append(objects);
 Object.assign(h.c,{workspaceTarget:{accountId:'a',bucketName:'old'},workspacePrefix:'old/',explorerDestinationMenus:null,explorerRawObjects:[],explorerNextCursor:'',explorerPage:0,explorerSelected:new Set(),explorerItems:[],send:message=>new Promise(resolve=>waiting.push({message,resolve})),buildDirectoryItems:objects=>objects,renderFileItems(){},renderExplorerChrome(){}});
 vm.runInContext(source.slice(source.indexOf('let explorerBrowseGeneration='),source.indexOf('function renderFileItems(')),h.c);
 const old=h.c.browseWorkspace();h.c.workspaceTarget={accountId:'a',bucketName:'new'};h.c.workspacePrefix='new/';const fresh=h.c.browseWorkspace();
 waiting[1].resolve({ok:true,objects:[{key:'new/file'}]});await fresh;waiting[0].resolve({ok:true,objects:[{key:'old/file'}]});await old;assert.equal(h.c.explorerItems[0].key,'new/file');assert.equal(h.c.explorerOperation.state,'done');assert.equal(waiting[0].message.bucketName,'old');assert.equal(waiting[1].message.bucketName,'new');h.dom.window.close();
});
