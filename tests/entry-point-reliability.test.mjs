import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=readFileSync('extension/background.js','utf8');
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
const noop=async()=>{};
const profile={id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'bucket',workerUrl:'https://fixture.invalid',token:'synthetic',menuConfigVersion:1,simplePrimaryEnabled:true};
const destination={id:'one',profileId:'p',accountId:'a',bucketName:'bucket',prefix:'saved',parentId:null,label:'My files',enabled:true};
const config=()=>({profiles:[structuredClone(profile)],rightClickEngine:'v3',rightClickV3:{version:1,revision:3,destinations:[structuredClone(destination)]},transferHistory:[{id:'preserved'}],toolbarOpenMode:'shelf'});
function worker(local=config(),failure={}){
 const native=new Map(),calls=[],warnings=[];let active=0,maxActive=0;
 const storage={async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(local[k])]));},async set(patch){Object.assign(local,structuredClone(patch));},remove:noop};
 const chrome={runtime:{id:'test',lastError:null,getURL:p=>'chrome-extension://test/'+p,getManifest:()=>({version:'0.5.27'}),onStartup:event(),onInstalled:event(),onMessage:event(),openOptionsPage:async()=>calls.push(['options'])},identity:{getRedirectURL:()=> 'https://test.chromiumapp.org/'},action:{onClicked:event(),setPopup:async o=>calls.push(['popup',o.popup]),setIcon:noop,setTitle:noop},storage:{local:storage,session:storage,onChanged:event()},alarms:{onAlarm:event(),create:noop},tabs:{onRemoved:event(),onUpdated:event(),create:async o=>{calls.push(['tab',o]);if(failure.tab)throw Error('tab unavailable');}},windows:{onRemoved:event()},webNavigation:{onBeforeNavigate:event(),onCommitted:event(),onErrorOccurred:event()},sidePanel:{setOptions:async()=>{if(failure.options)throw Error('panel configuration unavailable');},open:o=>{calls.push(['panel',o]);if(failure.syncPanel)throw Error('synchronous panel error');return failure.panel?Promise.reject(Error('gesture/panel rejected')):Promise.resolve();}}};
 const callback=(cb,error)=>{chrome.runtime.lastError=error?{message:error}:null;cb?.();chrome.runtime.lastError=null;};
 chrome.contextMenus={onClicked:event(),async removeAll(){active++;maxActive=Math.max(maxActive,active);await Promise.resolve();active--;if(failure.remove)throw Error('remove unavailable');native.clear();},update(id,patch,cb){if(!native.has(id))return callback(cb,'missing');native.set(id,{...native.get(id),...structuredClone(patch)});callback(cb);},create(item,cb){
   if(failure.create===item.id){failure.create=null;return callback(cb,'injected registration failure');}
   if(failure.allCreates)return callback(cb,'Chrome denied registration');
   if(native.has(item.id))return callback(cb,'duplicate');
   if(item.parentId&&!native.has(item.parentId))return callback(cb,'missing parent');
   native.set(item.id,structuredClone(item));if(failure.dropCallback===item.id){failure.dropCallback=null;return;}callback(cb);
 }};
 const context=vm.createContext({chrome,console:{warn:(...x)=>warnings.push(x),error:(...x)=>warnings.push(x)},navigator:{locks:{request:async(n,f)=>f()}},crypto:webcrypto,TextEncoder,TextDecoder,URL,URLSearchParams,setTimeout:(fn,ms,...args)=>setTimeout(fn,ms===5000?25:ms,...args),clearTimeout,setInterval,clearInterval,structuredClone,atob,btoa});
 context.importScripts=(...paths)=>paths.forEach(p=>vm.runInContext(readFileSync('extension/'+p,'utf8'),context,{filename:p}));
 vm.runInContext(source,context,{filename:'background.js'});
 const ready=async()=>{await vm.runInContext('menuRebuildQueue',context).catch(()=>{});await new Promise(r=>setImmediate(r));};
 const click=async tab=>{chrome.action.onClicked.listeners[0](tab);await new Promise(r=>setImmediate(r));};
 return {context,chrome,local,native,calls,warnings,ready,click,get maxActive(){return maxActive;},rebuild:()=>context.rebuildMenus()};
}
test('whole MV3 background with real imports registers handlers and installs root on worker activation',async()=>{
 const h=worker();await h.ready();
 assert.equal(h.chrome.action.onClicked.listeners.length,1);assert.equal(h.chrome.contextMenus.onClicked.listeners.length,1);assert.equal(h.chrome.runtime.onMessage.listeners.length,1);
 assert.ok(h.native.has('redown'));assert.ok(h.native.has('v3:one'));assert.equal(h.local.rightClickMenuStatus.state,'registered');
});
test('toolbar invokes Shelf synchronously within the gesture without storage/menu prerequisites',async()=>{
 const h=worker();h.chrome.action.onClicked.listeners[0]({windowId:7});
 assert.deepEqual(structuredClone(h.calls[0]),['panel',{windowId:7}]);await h.ready();assert.ok(!h.calls.some(c=>c[0]==='tab'));
});
test('rejected, synchronous and unavailable Shelf APIs open the functional local Shelf',async()=>{
 for(const failure of [{panel:true},{syncPanel:true},{missing:true}]){
  const h=worker(undefined,failure);if(failure.missing)delete h.chrome.sidePanel.open;
  await h.click({windowId:7});await h.ready();
  assert.equal(h.calls.find(c=>c[0]==='tab')[1].url,'chrome-extension://test/shelf.html');assert.equal(h.local.toolbarOpenMode,'shelf');
 }
 const h=worker(undefined,{panel:true,tab:true});await h.click({windowId:7});await h.ready();assert.ok(h.calls.some(c=>c[0]==='options'));
});
test('popup preference applies even when Shelf configuration fails and manifest provides a cold-start path',async()=>{
 const local=config();local.toolbarOpenMode='popup';const h=worker(local,{options:true});await h.ready();assert.ok(h.calls.some(c=>c[0]==='popup'&&c[1]==='popup.html'));
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
 await restarted.ready();assert.deepEqual([...restarted.native],original);assert.equal(restarted.maxActive,1);
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
 failure.create='v3:one';await assert.rejects(h.rebuild(),/rebuild failed/);
 assert.ok(h.native.has('redown'));assert.ok(h.native.has('redown-manage'));assert.equal(h.local.rightClickMenuStatus.state,'failed');
 await h.click({windowId:4});assert.ok(h.calls.some(c=>c[0]==='panel'));
 await h.rebuild();assert.ok(h.native.has('v3:one'));
});
