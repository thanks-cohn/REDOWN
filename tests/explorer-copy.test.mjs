import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const bg=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const ui=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
test('Worker copy requests have a deadline; uncertain outcomes are never replayed',async()=>{
 let calls=0;const c=vm.createContext({RedownCloudflareApi:{boundedFetch:async(url,options)=>{calls++;assert.equal(options.timeoutMs,30000);const e=new Error();e.name='TimeoutError';throw e;}}});
 vm.runInContext(bg.slice(bg.indexOf('async function callBucketWorker('),bg.indexOf('\nasync function expandExplorerEntries',bg.indexOf('async function callBucketWorker('))),c);
 await assert.rejects(c.callBucketWorker({workerUrl:'https://fixture.invalid',token:'fixture'},{action:'transferBatch'}),/30 seconds.*Refresh the destination/);assert.equal(calls,1);
 c.RedownCloudflareApi.boundedFetch=async()=>new Response('<html>outage</html>');
 await assert.rejects(c.callBucketWorker({workerUrl:'https://fixture.invalid'},{action:'transferBatch'}),/did not confirm/);
});
function pasteHarness(retry){
 let calls=0,refreshed=0;const messages=[],status={};const c=vm.createContext({setExplorerStatus:(message)=>{status.textContent=message;},explorerSearchActive:false,explorerClipboard:{operation:'copy',accountId:'a',bucketName:'source',entries:[{key:'file.txt'}]},$:()=>status,setOperation(){},finishOperation:(message,failed)=>messages.push({message,failed}),friendlyError:e=>e.message,prompt:()=> 'Keep both',send:async()=>++calls===1?{ok:true,completed:2,conflicts:[{sourceKey:'file.txt',destinationKey:'file.txt'}]}:retry,browseWorkspace:async()=>{refreshed++;},chrome:{storage:{session:{remove:async()=>{}}}}});
 vm.runInContext(ui.slice(ui.indexOf('async function pasteExplorer('),ui.indexOf('\nasync function moveSelectionTo(',ui.indexOf('async function pasteExplorer('))),c);
 return {c,messages,status,get refreshed(){return refreshed;}};
}
test('failed conflict-resolution copy stays failed instead of reporting zero copied',async()=>{
 const h=pasteHarness({ok:false,error:'Destination unavailable'});await h.c.pasteExplorer({accountId:'a',bucketName:'target',prefix:'deep/'});
 assert.equal(h.messages.at(-1).failed,true);assert.equal(h.status.textContent,'Destination unavailable');assert.equal(h.refreshed,0);
});
test('copy summary includes successful first-pass and conflict-resolution files',async()=>{
 const h=pasteHarness({ok:true,completed:1,errors:[],conflicts:[]});await h.c.pasteExplorer({accountId:'a',bucketName:'target',prefix:'deep/'});
 assert.match(h.messages.at(-1).message,/3 files copied/);assert.match(h.status.textContent,/3 files copied/);assert.equal(h.refreshed,1);
});
test('missing per-file copy receipts cannot become a successful zero-file copy',async()=>{
 const c=vm.createContext({assertExplorerTransferSettings:async()=>{},cleanExplorerPrefix:x=>x,expandExplorerEntries:async()=>[{key:'file.txt'}],preparedProfile:async(a,b)=>({id:b,workerUrl:'https://fixture.invalid',token:'fixture'}),callBucketWorker:async()=>({ok:true,results:[]})});
 vm.runInContext(bg.slice(bg.indexOf('async function transferExplorerObjects('),bg.indexOf('\nasync function deleteExplorerObjects(',bg.indexOf('async function transferExplorerObjects('))),c);
 await assert.rejects(c.transferExplorerObjects({source:{accountId:'a',bucketName:'source'},destination:{accountId:'a',bucketName:'target',prefix:''},entries:[{key:'file.txt'}]}),/did not confirm/);
});
test('forbidden Worker operations report HTTP status without automatic reprovision or replay',async()=>{
 let calls=0,repairs=0;const traces=[];const c=vm.createContext({performance,redownRuntimeObserver:{record:event=>traces.push(event)},RedownCloudflareApi:{boundedFetch:async()=>{calls++;return Response.json({ok:false,error:'Permission denied'},{status:403});}},preparedProfile:async()=>{repairs++;throw Error('must not repair');}});
 vm.runInContext(bg.slice(bg.indexOf('async function callBucketWorker('),bg.indexOf('\nasync function expandExplorerEntries',bg.indexOf('async function callBucketWorker('))),c);
 await assert.rejects(c.callBucketWorker({workerUrl:'https://fixture.invalid',token:'PRIVATE_SECRET'},{action:'transferBatch',entries:[{sourceKey:'PRIVATE_NAME'}]}),/Permission denied.*HTTP 403/);assert.equal(calls,1);assert.equal(repairs,0);assert.equal(traces[0].code,'HTTP_403');assert.doesNotMatch(JSON.stringify(traces),/PRIVATE_SECRET|PRIVATE_NAME/);
});
test('v5 preparation refuses unavailable connections instead of redeploying on network failure',async()=>{
 let deployed=0;const c=vm.createContext({RedownCloudflareApi:{boundedFetch:async()=>{throw Error('Network unavailable');}},getProfiles:async()=>[{type:'cloudflare-r2',accountId:'a',bucketName:'b',workerVersion:5,workerUrl:'https://fixture.invalid',token:'fixture'}],provisionCloudflareProfile:async()=>{deployed++;}});
 vm.runInContext(bg.slice(bg.indexOf('async function workerAcceptsProfile('),bg.indexOf('async function callBucketWorker(')),c);
 await assert.rejects(c.preparedProfile('a','b'),/Network unavailable/);assert.equal(deployed,0);
 c.RedownCloudflareApi.boundedFetch=async()=>Response.json({ok:true,workerVersion:5,safeTransfers:true,storageBound:true});assert.equal((await c.preparedProfile('a','b')).bucketName,'b');
});
test('conflict retry retains earlier failures rather than presenting partial move as success',async()=>{
 let n=0;const messages=[];const c=vm.createContext({setExplorerStatus:()=>{},explorerSearchActive:false,explorerClipboard:{operation:'move',accountId:'a',bucketName:'source',entries:[{key:'a'}]},$:()=>({}),setOperation(){},finishOperation:(...message)=>messages.push(message),friendlyError:e=>e.message,prompt:()=> 'Keep both',send:async()=>++n===1?{ok:true,completed:0,errors:[{error:'Original retained because destination changed'}],conflicts:[{sourceKey:'b',destinationKey:'b'}]}:{ok:true,completed:1,errors:[],conflicts:[]},browseWorkspace:async()=>{},chrome:{storage:{session:{remove:async()=>{throw Error('must retain clipboard');}}}}});
 vm.runInContext(ui.slice(ui.indexOf('async function pasteExplorer('),ui.indexOf('async function moveSelectionTo(')),c);await c.pasteExplorer({accountId:'a',bucketName:'target',prefix:''});assert.equal(messages.at(-1)[1],true);assert.ok(c.explorerClipboard);
});
test('incomplete or cyclic folder listings fail before mutation; exact repeated separators are preserved',async()=>{
 let n=0;const c=vm.createContext({listObjectsPage:async()=>({objects:[],cursor:++n?'repeat':'',truncated:true})});vm.runInContext(bg.slice(bg.indexOf('async function listAllObjects('),bg.indexOf('function explorerSearchScore(')),c);
 await assert.rejects(c.listAllObjects('a','b','folder/'),/repeated a folder page/);c.listObjectsPage=async()=>({objects:[],cursor:'',truncated:true});await assert.rejects(c.listAllObjects('a','b'),/incomplete/);
 vm.runInContext(bg.slice(bg.indexOf('function cleanExplorerPrefix('),bg.indexOf('function cleanExplorerKey(')),c);assert.equal(c.cleanExplorerPrefix('folder//nested/'),'folder//nested/');
});

test('Paste uses an explicit operation clipboard even when the global clipboard changes',async()=>{
 const h=pasteHarness({ok:true});let request;
 h.c.send=async message=>{request=message;return {ok:true,completed:1};};
 await h.c.pasteExplorer({accountId:'a',bucketName:'target'}, {operation:'move',accountId:'original',bucketName:'original',entries:[{key:'original.txt'}]});
 assert.equal(request.operation,'move');assert.equal(request.source.bucketName,'original');assert.equal(request.entries[0].key,'original.txt');
});
test('empty clipboard and missing destination produce actionable feedback and no transfer',async()=>{
 const h=pasteHarness({ok:true});let calls=0;h.c.send=async()=>calls++;
 await assert.rejects(h.c.pasteExplorer({accountId:'a',bucketName:'b'},null),{code:'EXPLORER_CLIPBOARD_EMPTY'});
 assert.match(h.status.textContent,/clipboard is empty/);
 await assert.rejects(h.c.pasteExplorer({}),{code:'EXPLORER_DESTINATION_REQUIRED'});assert.equal(calls,0);
});
test('rejected transfer transport clears working status, preserves clipboard and never replays',async()=>{
 const h=pasteHarness({});const clipboard=h.c.explorerClipboard;let calls=0;
 h.c.send=async()=>{calls++;throw Object.assign(Error('private URL must not become feedback'),{name:'TimeoutError'});};
 await assert.rejects(h.c.pasteExplorer({accountId:'a',bucketName:'target'}),{name:'TimeoutError'});
 assert.equal(calls,1);assert.equal(h.c.explorerClipboard,clipboard);assert.match(h.status.textContent,/not confirmed.*Refresh/);assert.doesNotMatch(h.status.textContent,/private URL/);assert.equal(h.messages.at(-1).failed,true);
});

test('directory conflict retry preserves its directory identity and destination root',async()=>{
 const h=pasteHarness({ok:true,completed:2,errors:[],conflicts:[]});let calls=0,retry;
 h.c.send=async message=>{if(++calls===1)return {ok:true,completed:0,conflicts:[{sourceKey:'photos/',destinationKey:'target/photos/',folder:true}]};retry=message;return {ok:true,completed:2,errors:[],conflicts:[]};};
 await h.c.pasteExplorer({accountId:'a',bucketName:'target',prefix:'target/'});
 assert.equal(retry.conflict,'keep');assert.equal(retry.entries[0].folder,true);assert.equal(retry.entries[0].key,'photos/');assert.equal(retry.entries[0].destinationKey,'target/photos/');
});
