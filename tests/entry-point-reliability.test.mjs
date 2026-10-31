import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {worker,config} from './helpers/background-worker.mjs';
test('whole MV3 background with real imports registers handlers and installs root on worker activation',async()=>{
 const h=worker();await h.ready();
 assert.equal(h.chrome.action.onClicked.listeners.length,1);assert.equal(h.chrome.contextMenus.onClicked.listeners.length,1);assert.equal(h.chrome.runtime.onMessage.listeners.length,1);
 assert.ok(h.native.has('redown'));assert.ok(h.native.has('v3:one'));assert.equal(h.local.rightClickMenuStatus.state,'registered');
});
test('toolbar invokes Shelf synchronously within the gesture without storage/menu prerequisites',async()=>{
 const h=worker();h.calls.length=0;h.chrome.action.onClicked.listeners[0]({windowId:7});
 assert.deepEqual(structuredClone(h.calls[0]),['panel',{windowId:7}]);await h.ready();assert.ok(!h.calls.some(c=>c[0]==='tab'));
});
test('rejected, synchronous and unavailable Shelf APIs open recovery popup',async()=>{
 for(const failure of [{panel:true},{syncPanel:true},{missing:true}]){
  const h=worker(undefined,failure);if(failure.missing)delete h.chrome.sidePanel.open;
  await h.click({windowId:7});await h.ready();
  assert.equal(h.calls.find(c=>c[0]==='window')[1].url,'chrome-extension://test/popup.html?recovery=1');assert.equal(h.local.toolbarOpenMode,'shelf');
 }
 const h=worker(undefined,{panel:true,window:true});await h.click({windowId:7});await h.ready();assert.ok(h.local.entryPointEvidence.some(e=>e.code==='ACCESS_BLOCKED'));
});
test('stale popup preference migrates even when panel configuration fails',async()=>{
 const local=config();local.toolbarOpenMode='popup';const h=worker(local,{options:true});await h.ready();assert.ok(h.calls.some(c=>c[0]==='popup'&&c[1]===''));
 const manifest=JSON.parse(readFileSync('extension/manifest.json','utf8'));assert.equal(manifest.side_panel.default_path,'shelf.html');assert.ok(manifest.permissions.includes('sidePanel'));
});
test('failed native child or root creation restores root/management without erasing settings',async()=>{
 for(const id of ['v3:one','redown','redown-manage']){
  const initial=config(),before=structuredClone(initial),h=worker(initial,{create:id});await h.ready();
  assert.ok(h.native.has('redown'),id);assert.ok(h.native.has('redown-manage'),id);assert.equal(h.local.rightClickMenuStatus.state,'failed');
  for(const key of Object.keys(before))assert.deepEqual(h.local[key],before[key]);
  await h.rebuild();assert.ok(h.native.has('v3:one'));assert.equal(h.local.rightClickMenuStatus.state,'registered');
 }
});
test('failed removal retains functional local access; Chrome-wide denial is reported honestly',async()=>{
 const h=worker(undefined,{remove:true});await h.ready();assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage'));assert.equal(h.local.rightClickMenuStatus.state,'failed');
 const blocked=worker(undefined,{allCreates:true});await blocked.ready();assert.equal(blocked.native.size,0);assert.equal(blocked.local.rightClickMenuStatus.state,'failed');assert.ok(blocked.warnings.length);
});
test('partial inventory, invalid cache and malformed configuration cannot prevent local menu access',async()=>{
 for(const patch of [
  {'right-click.json':{schemaVersion:999,inventory:{invalid:true}}},
  {rightClickV3Inventory:{version:1,key:'invalid',complete:false,folders:[]},rightClickV3Presentation:{style:'nested',nested:'level',depth:3}},
  {rightClickV3:{version:1,revision:3,destinations:null}}
 ]){
  const h=worker({...config(),...patch});await h.ready();assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage'));
 }
});
test('worker restart and concurrent startup/install/storage/alarm events share the registration lane',async()=>{
 const local=config(),h=worker(local);await h.ready();const original=structuredClone([...h.native]);
 const restarted=worker(local);await restarted.ready();assert.deepEqual([...restarted.native],original);
 for(let i=0;i<5;i++){
  for(const fn of restarted.chrome.runtime.onStartup.listeners)fn();
  for(const fn of restarted.chrome.runtime.onInstalled.listeners)fn();
  for(const fn of restarted.chrome.storage.onChanged.listeners)fn({rightClickV3Presentation:{newValue:{style:'simple'}}},'local');
  for(const fn of restarted.chrome.alarms.onAlarm.listeners)fn({name:'redown-v3-inventory'});
 }
 await restarted.ready();assert.deepEqual([...restarted.native],original);assert.equal(restarted.maxActive,0); // Persisted IDs reconcile without a destructive reset.
 await restarted.click({windowId:3});assert.ok(restarted.calls.some(c=>c[0]==='panel'));
});
test('recovery management entry uses the existing local Explorer click route',async()=>{
 const h=worker(undefined,{create:'v3:one'});await h.ready();
 await h.chrome.contextMenus.onClicked.listeners[0]({menuItemId:'redown-manage'},{id:1});
 assert.match(h.calls.find(c=>c[0]==='tab')[1].url,/beta\/explorer\.html/);
});

test('missing native acknowledgement times out without deleting the root and a later Apply succeeds',async()=>{
 const h=worker(undefined,{dropCallback:'v3:one'});await h.ready();
 assert.equal(h.local.rightClickMenuStatus.state,'failed');assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage'));
 await h.rebuild();assert.equal(h.local.rightClickMenuStatus.state,'registered');
});
test('failed folder discovery leaves root and valid configured destinations accessible',async()=>{
 const h=worker();await h.ready();let listings=0;
 h.context.listObjectsPage=async()=>{listings++;throw Error('synthetic provider unavailable');};
 h.local.rightClickV3Presentation={style:'nested',nested:'level',depth:3};
 h.local.rightClickV3LevelScopes={version:1,revision:1,buckets:[{id:'scope',profileId:'p',accountId:'a',bucketName:'bucket',enabled:true}]};
 await h.context.refreshV3Inventory(true);await h.ready();
 assert.ok(listings>0);assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage'));
 assert.equal(h.local.rightClickV3Inventory.complete,false);assert.equal(h.local.rightClickV3.destinations[0].label,'My files');
 assert.ok(![...h.native.values()].some(item=>/incomplete|could not be read|synthetic provider/.test(item.title||'')));
 await h.click({windowId:9});assert.ok(h.calls.some(c=>c[0]==='panel'));
});

test('a failed rebuild after successful registration preserves a recoverable root instead of clearing everything',async()=>{
 const failure={},h=worker(undefined,failure);await h.ready();assert.ok(h.native.has('v3:one'));
 h.local.rightClickV3.destinations[0].id='changed';failure.create='v3:changed';await assert.rejects(h.rebuild(),/rebuild failed/);
 assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage'));assert.equal(h.local.rightClickMenuStatus.state,'failed');
 await h.click({windowId:4});assert.ok(h.calls.some(c=>c[0]==='panel'));
 await h.rebuild();assert.ok(h.native.has('v3:changed'));
});

test('rapid failures share a recovery window and subsequent failures focus it',async()=>{
 const h=worker(undefined,{panel:true});await h.ready();
 h.chrome.action.onClicked.listeners[0]({windowId:1});h.chrome.action.onClicked.listeners[0]({windowId:1});
 await h.ready();await h.click({windowId:1});await h.ready();
 assert.equal(h.calls.filter(c=>c[0]==='window').length,1);assert.ok(h.calls.some(c=>c[0]==='focus'));
 assert.ok(h.local.entryPointEvidence.some(e=>e.code==='SHELF_UNAVAILABLE'));
});
test('unchanged menu plan performs no destructive registration and discovery',async()=>{
 const h=worker();await h.ready();let removed=0,discovered=0;
 h.chrome.contextMenus.removeAll=async()=>{removed++;};h.context.refreshV3Inventory=async()=>{discovered++;};
 await h.rebuild();await h.rebuild();assert.equal(removed,0);assert.equal(discovered,0);assert.ok(h.native.has('v3:one'));
});
test('unrelated background import failure leaves independently registered toolbar usable',async()=>{
 const h=worker(undefined,{import:'cloudflare-api.js',panel:true});
 assert.ok(h.evaluationError);await h.click({windowId:3});
 assert.ok(h.calls.some(c=>c[0]==='window'));
});
test('storage failure cannot gate toolbar or base menu access',async()=>{
 const h=worker(undefined,{storage:true,panel:true});await h.ready();await h.click({windowId:3});
 assert.ok(h.calls.some(c=>c[0]==='window'));assert.ok(h.native.has('redown-manage'));
});
test('Shelf document readiness is window-scoped and successful readiness avoids recovery',async()=>{
 const h=worker();await h.ready();
 h.chrome.runtime.getContexts=async()=>[{windowId:3}];h.chrome.runtime.sendMessage=async m=>({ready:m.windowId===3});
 await h.context.openToolbarInterface({windowId:3});await h.ready();
 assert.ok(!h.calls.some(c=>c[0]==='window'));assert.ok(h.local.entryPointEvidence.some(e=>e.code==='SHELF_READY'));
});
test('failed Shelf initialization has bounded visible recovery and retained evidence',async()=>{
 const h=worker();await h.ready();h.chrome.runtime.getContexts=async()=>[];
 await h.context.openToolbarInterface({windowId:3});await h.ready();
 assert.ok(h.calls.some(c=>c[0]==='window'));assert.ok(h.local.entryPointEvidence.some(e=>e.code==='SHELF_UNAVAILABLE'));
});
test('worker restart reconciles persisted IDs without native destruction or folder discovery',async()=>{
 const h=worker();await h.ready();
 const next=worker(h.local,{nativeEntries:[...h.native]});await next.ready();
 assert.ok(!next.calls.some(c=>c[0]==='removeAll'));assert.ok(next.native.has('v3:one'));
});
test('an unrelated Shelf window never wins the readiness first-response race',async()=>{
 const source=readFileSync('extension/shelf.js','utf8').split('// Registered only after')[1];
 for(const windowId of [3,8]){
  let listener;const replies=[];
  const context=vm.createContext({chrome:{runtime:{id:'test',onMessage:{addListener:fn=>listener=fn}},windows:{getCurrent:async()=>({id:windowId})}}});
  vm.runInContext('// Registered only after'+source,context);
  listener({type:'redownShelfReady',windowId:3},{id:'test'},r=>replies.push(r));await new Promise(r=>setImmediate(r));
  assert.equal(replies.length,windowId===3?1:0);
 }
});
test('ordered destination changes recreate siblings while retaining root management',async()=>{
 const initial=config();initial.rightClickV3.destinations.push({...initial.rightClickV3.destinations[0],id:'two',label:'Second',prefix:'second'});
 const h=worker(initial);await h.ready();
 h.local.rightClickV3.destinations.reverse();await h.rebuild();
 const ids=[...h.native.keys()];assert.ok(ids.indexOf('v3:two')<ids.indexOf('v3:one'));
 assert.ok(h.native.has('redown-manage'));assert.equal(h.calls.filter(c=>c[0]==='removeAll').length,1);
});
