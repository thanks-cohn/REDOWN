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
test('definite Shelf rejection, synchronous throw and missing API use only native attached popup',async()=>{
 for(const failure of [{panel:true},{syncPanel:true},{missing:true}]){
  const h=worker(undefined,failure);if(failure.missing)delete h.chrome.sidePanel.open;
  await h.click({id:1,windowId:7});await h.ready();
  assert.ok(h.calls.some(c=>c[0]==='attached'));assert.match(await h.chrome.action.getPopup({tabId:1}),/^chrome-extension:\/\/test\/popup.html\?recovery=1/);
  assert.equal(h.local.toolbarOpenMode,'shelf');assert.ok(!h.calls.some(c=>['window','tab','options'].includes(c[0])));
 }
 const h=worker(undefined,{panel:true,openPopup:true});await h.click({id:1,windowId:7});await h.ready();
 assert.ok(h.local.entryPointEvidence.some(e=>e.code==='ATTACHED_POPUP_NEXT_CLICK'));
 await h.click({id:1,windowId:7});assert.ok(h.calls.some(c=>c[0]==='nativePopup'));
});

test('explicit Popup preference is preserved even when Shelf configuration fails',async()=>{
 const local=config();local.toolbarOpenMode='popup';const h=worker(local,{options:true});await h.ready();
 assert.equal(await h.chrome.action.getPopup({tabId:1}),'chrome-extension://test/popup.html');await h.click({id:1,windowId:7});
 assert.ok(h.calls.some(c=>c[0]==='nativePopup'));assert.ok(!h.calls.some(c=>c[0]==='panel'));assert.equal(local.toolbarOpenMode,'popup');
 const manifest=JSON.parse(readFileSync('extension/manifest.json','utf8'));assert.equal(manifest.side_panel.default_path,'shelf.html');assert.equal(manifest.action.default_popup,undefined);
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
  const h=worker({...config(),...patch});await h.ready();assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage')||h.native.has('v3:provider:cloudflare'));
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

test('rapid clicks share one failure attempt and Chrome handles subsequent native popup clicks',async()=>{
 const h=worker(undefined,{panel:true});await h.ready();
 h.chrome.action.onClicked.listeners[0]({id:1,windowId:7});h.chrome.action.onClicked.listeners[0]({id:1,windowId:7});
 await h.ready();await h.click({id:1,windowId:7});await h.ready();
 assert.equal(h.calls.filter(c=>c[0]==='attached').length,1);assert.equal(h.calls.filter(c=>c[0]==='panel').length,1);
 assert.ok(!h.calls.some(c=>['window','tab'].includes(c[0])));
});

test('unchanged menu plan performs no destructive registration and discovery',async()=>{
 const h=worker();await h.ready();let removed=0,discovered=0;
 h.chrome.contextMenus.removeAll=async()=>{removed++;};h.context.refreshV3Inventory=async()=>{discovered++;};
 await h.rebuild();await h.rebuild();assert.equal(removed,0);assert.equal(discovered,0);assert.ok(h.native.has('v3:one'));
});
test('unrelated background import failure leaves independently registered toolbar usable',async()=>{
 const h=worker(undefined,{import:'cloudflare-api.js',panel:true});
 assert.ok(h.evaluationError);await h.click({windowId:3});
 assert.ok(h.calls.some(c=>c[0]==='attached'));
});
test('storage failure cannot gate toolbar or base menu access',async()=>{
 const h=worker(undefined,{storage:true,panel:true});await h.ready();await h.click({windowId:3});
 assert.ok(h.calls.some(c=>c[0]==='attached'));assert.ok(h.native.has('redown-manage'));
});
test('Shelf document readiness is window-scoped and successful readiness avoids recovery',async()=>{
 const h=worker();await h.ready();
 h.chrome.runtime.getContexts=async()=>[{windowId:3}];h.chrome.runtime.sendMessage=async m=>({ready:m.windowId===3});
 await h.context.openToolbarInterface({windowId:3});await h.ready();
 assert.ok(!h.calls.some(c=>c[0]==='window'));assert.ok(h.local.entryPointEvidence.some(e=>e.code==='SHELF_READY'));
});
test('accepted Shelf with unconfirmed readiness never opens a second surface',async()=>{
 const h=worker();await h.ready();h.chrome.runtime.getContexts=async()=>[];
 await h.context.openToolbarInterface({id:1,windowId:7});await h.ready();
 assert.ok(!h.calls.some(c=>['attached','window','tab'].includes(c[0])));
 assert.ok(h.local.entryPointEvidence.some(e=>e.code==='SHELF_READINESS_UNKNOWN'));
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
 assert.ok(h.native.has('v3:provider:cloudflare'));assert.ok(!h.native.has('redown-manage'));assert.equal(h.calls.filter(c=>c[0]==='removeAll').length,1);
});
test('fresh empty storage and no OAuth opens Shelf without destination prerequisites',async()=>{
 const h=worker({});await h.ready();await h.click({id:1,windowId:7});await h.ready();
 assert.equal(h.calls.filter(c=>c[0]==='panel').length,1);assert.ok(!h.calls.some(c=>['attached','window','tab'].includes(c[0])));
 assert.ok(h.native.has('v3:provider:cloudflare:setup'));
});
test('missing native openPopup leaves a next-click attached recovery route without changing preference',async()=>{
 const h=worker(undefined,{panel:true});delete h.chrome.action.openPopup;await h.ready();await h.click({id:1,windowId:7});await h.ready();
 const popup=await h.chrome.action.getPopup({tabId:1});assert.match(popup,/recovery=1/);assert.equal(h.local.toolbarOpenMode,'shelf');
 await h.click({id:1,windowId:7});assert.ok(h.calls.some(c=>c[0]==='nativePopup'));
});
test('slow accepted Shelf cannot trigger a timeout popup or late duplicate',async()=>{
 const h=worker();await h.ready();let resolve;h.chrome.sidePanel.open=()=>new Promise(r=>{resolve=r;});
 const request=h.context.openToolbarInterface({id:1,windowId:7});await new Promise(r=>setTimeout(r,45));
 resolve();await request;await h.ready();assert.ok(!h.calls.some(c=>['attached','window','tab'].includes(c[0])));
 assert.ok(h.local.entryPointEvidence.some(e=>e.code==='SHELF_OPEN_PENDING'));
});
test('late rejected expired attempt cannot override a newer successful Shelf',async()=>{
 const h=worker();await h.ready();let reject;h.chrome.sidePanel.open=()=>new Promise((_,r)=>{reject=r;});
 const old=h.context.openToolbarInterface({id:1,windowId:7});await new Promise(r=>setTimeout(r,45));
 h.chrome.sidePanel.open=async()=>{};await h.context.openToolbarInterface({id:1,windowId:7});reject(Error('late rejection'));await old;
 assert.ok(!h.calls.some(c=>['attached','window','tab'].includes(c[0])));
});
test('blocked popup registration produces native error evidence, no alternate windows',async()=>{
 const h=worker(undefined,{panel:true,setPopup:true});await h.ready();await h.click({id:1,windowId:7});await h.ready();
 assert.ok(h.local.entryPointEvidence.some(e=>e.code==='ATTACHED_POPUP_BLOCKED'));
 assert.ok(!h.calls.some(c=>['attached','window','tab','options'].includes(c[0])));
});
test('worker restart preserves armed tab recovery, while preference changes clear stale overrides',async()=>{
 const h=worker(undefined,{panel:true,openPopup:true});await h.ready();await h.click({id:1,windowId:7});await h.ready();
 const next=worker(h.local,{popupState:h.popupState});await next.ready();await next.click({id:1,windowId:7});
 assert.ok(next.calls.some(c=>c[0]==='nativePopup'));assert.ok(!next.calls.some(c=>c[0]==='panel'));
 h.local.toolbarOpenMode='popup';for(const fn of next.chrome.storage.onChanged.listeners)fn({toolbarOpenMode:{newValue:'popup'}},'local');
 await new Promise(r=>setImmediate(r));assert.equal(await next.chrome.action.getPopup({tabId:1}),'chrome-extension://test/popup.html');
});
test('automatic toolbar launcher contains no detached surface API and disables Chrome-managed parallel opening',async()=>{
 const source=readFileSync('extension/entry-bootstrap.js','utf8');assert.doesNotMatch(source,/windows\.(create|update)|tabs\.create|window\.open|openOptionsPage/);
 const h=worker();await h.ready();assert.ok(h.calls.some(c=>c[0]==='behavior'&&c[1]===false));
});
test('tab switch during failure abandons stale recovery instead of opening in another tab',async()=>{
 const h=worker(undefined,{panel:true});await h.ready();h.openTabs[0]={id:99,windowId:7,active:true};
 await h.context.openToolbarInterface({id:1,windowId:7});await h.ready();assert.ok(!h.calls.some(c=>c[0]==='attached'));
 assert.ok(h.local.entryPointEvidence.some(e=>e.code==='LAUNCH_SUPERSEDED'));
});
test('latest different-window click supersedes pending attempt without a stale popup',async()=>{
 const h=worker();await h.ready();let reject;
 h.chrome.sidePanel.open=()=>new Promise((_,r)=>{reject=r;});
 const old=h.context.openToolbarInterface({id:1,windowId:7});h.chrome.sidePanel.open=async()=>{};
 await h.context.openToolbarInterface({id:2,windowId:8});reject(Error('superseded'));await old;
 assert.ok(!h.calls.some(c=>['attached','window','tab'].includes(c[0])));
});
