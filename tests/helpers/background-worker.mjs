import vm from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=readFileSync('extension/background.js','utf8');
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
const noop=async()=>{};
const profile={id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'bucket',workerUrl:'https://fixture.invalid',token:'synthetic',menuConfigVersion:1,simplePrimaryEnabled:true};
const destination={id:'one',profileId:'p',accountId:'a',bucketName:'bucket',prefix:'saved',parentId:null,label:'My files',enabled:true};
export const config=()=>({rightClickV3Migration:{version:1},profiles:[structuredClone(profile)],rightClickEngine:'v3',rightClickV3:{version:1,revision:3,destinations:[structuredClone(destination)]},transferHistory:[{id:'preserved'}],toolbarOpenMode:'shelf'});
export function worker(local=config(),failure={}){
 const native=new Map(failure.nativeEntries||[]),calls=[],warnings=[];
 const popupState=failure.popupState||{global:'',tabs:new Map()},openTabs=[{id:1,windowId:7,active:true}];
 const appearance=failure.appearance||{title:'REDOWN-Click2Cloud',badge:'',tabTitles:new Map(),tabBadges:new Map()};
 const effective=id=>popupState.tabs.has(id)?popupState.tabs.get(id):popupState.global;let active=0,maxActive=0;
 const storage={async get(keys){if(failure.storage)throw Error('storage unavailable');return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(local[k])]));},async set(patch){Object.assign(local,structuredClone(patch));},remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete local[key];}};
 const chrome={runtime:{id:'test',lastError:null,getURL:p=>'chrome-extension://test/'+p,getManifest:()=>({version:'0.5.27'}),onStartup:event(),onInstalled:event(),onMessage:event(),openOptionsPage:async()=>calls.push(['options'])},identity:{getRedirectURL:()=> 'https://test.chromiumapp.org/'},action:{onClicked:event(),getPopup:async o=>{const popup=effective(o.tabId);return popup?'chrome-extension://test/'+popup:'';},setPopup:async o=>{
   calls.push(['popup',o.popup,o.tabId]);if(failure.setPopup)throw Error('popup registration blocked');
   if(Number.isInteger(o.tabId))popupState.tabs.set(o.tabId,o.popup);else popupState.global=o.popup;
 },openPopup:async o=>{
   calls.push(['attached',o]);if(failure.openPopup)throw Error('native popup blocked');
   const tab=openTabs.find(t=>t.windowId===o.windowId&&t.active);if(!tab||!effective(tab.id))throw Error('no configured popup');
 },getBadgeText:async o=>appearance.tabBadges.has(o.tabId)?appearance.tabBadges.get(o.tabId):appearance.badge,setBadgeText:async o=>{calls.push(['badge',o]);if(Number.isInteger(o.tabId))appearance.tabBadges.set(o.tabId,o.text);else appearance.badge=o.text;},getTitle:async o=>appearance.tabTitles.has(o.tabId)?appearance.tabTitles.get(o.tabId):appearance.title,setIcon:noop,setTitle:async o=>{calls.push(['title',o]);if(Number.isInteger(o.tabId))appearance.tabTitles.set(o.tabId,o.title);else appearance.title=o.title;}},storage:{local:storage,session:storage,onChanged:event()},alarms:{onAlarm:event(),create:noop},tabs:{onActivated:event(),query:async q=>openTabs.filter(t=>(!q.active||t.active)&&(!Number.isInteger(q.windowId)||t.windowId===q.windowId)),onRemoved:event(),onUpdated:event(),create:async o=>{calls.push(['tab',o]);if(failure.tab)throw Error('tab unavailable');}},windows:{onFocusChanged:event(),onRemoved:event(),create:async o=>{calls.push(['window',o]);if(failure.window)throw Error('blocked');return {id:42};},update:async()=>{calls.push(['focus']);return {id:42};}},webNavigation:{onBeforeNavigate:event(),onCommitted:event(),onErrorOccurred:event()},sidePanel:{setPanelBehavior:async o=>calls.push(['behavior',o.openPanelOnActionClick]),close:async o=>{calls.push(['panelClose',o]);if(failure.close)throw Error('close unavailable');},setOptions:async()=>{if(failure.options)throw Error('panel configuration unavailable');},open:o=>{calls.push(['panel',o]);if(failure.syncPanel)throw Error('synchronous panel error');return failure.panel?Promise.reject(Error('gesture/panel rejected')):Promise.resolve();}}};
 const callback=(cb,error)=>{chrome.runtime.lastError=error?{message:error}:null;cb?.();chrome.runtime.lastError=null;};
 chrome.contextMenus={onClicked:event(),remove(id,cb){if(failure.removeId===id)return callback(cb,'injected removal failure');native.delete(id);callback(cb);},async removeAll(){calls.push(["removeAll"]);active++;maxActive=Math.max(maxActive,active);await Promise.resolve();active--;if(failure.remove)throw Error('remove unavailable');native.clear();},update(id,patch,cb){if(!native.has(id))return callback(cb,'missing');native.set(id,{...native.get(id),...structuredClone(patch)});callback(cb);},create(item,cb){
   if(failure.create===item.id){failure.create=null;return callback(cb,'injected registration failure');}
   if(failure.allCreates)return callback(cb,'Chrome denied registration');
   if(native.has(item.id))return callback(cb,'duplicate');
   if(item.parentId&&!native.has(item.parentId))return callback(cb,'missing parent');
   native.set(item.id,structuredClone(item));if(failure.dropCallback===item.id){failure.dropCallback=null;return;}callback(cb);
 }};
 const context=vm.createContext({indexedDB:failure.database||new IDBFactory(),chrome,console:{warn:(...x)=>warnings.push(x),error:(...x)=>warnings.push(x)},navigator:{locks:{request:async(n,f)=>f()}},crypto:webcrypto,TextEncoder,TextDecoder,URL,URLSearchParams,setTimeout:(fn,ms,...args)=>setTimeout(fn,ms===5000?25:ms===2500?30:ms,...args),clearTimeout,setInterval,clearInterval,structuredClone,atob,btoa,performance});
 context.importScripts=(...paths)=>paths.forEach(p=>{if(failure.import===p)throw Error('injected import error');return vm.runInContext(readFileSync('extension/'+p,'utf8'),context,{filename:p});});
 let evaluationError;try{vm.runInContext(failure.backgroundSource||source,context,{filename:'background.js'});}catch(error){if(!failure.import)throw error;evaluationError=error;}
 const ready=async()=>{await vm.runInContext('menuRebuildQueue',context).catch(()=>{});await new Promise(r=>setImmediate(r));};
 const click=async tab=>{
   tab={id:1,...tab,active:true};const index=openTabs.findIndex(t=>t.windowId===tab.windowId);
   if(index>=0)openTabs[index]=tab;else openTabs.push(tab);
   const popup=effective(tab.id);
   if(popup)calls.push(['nativePopup',popup]);else chrome.action.onClicked.listeners[0](tab);
   await new Promise(r=>setImmediate(r));
 };
 return {evaluationError,appearance,popupState,openTabs,context,chrome,local,native,calls,warnings,ready,click,get maxActive(){return maxActive;},rebuild:()=>context.rebuildMenus()};
}
