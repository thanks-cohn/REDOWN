import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=readFileSync('extension/background.js','utf8');
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
const noop=async()=>{};
const profile={id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'bucket',workerUrl:'https://fixture.invalid',token:'synthetic',menuConfigVersion:1,simplePrimaryEnabled:true};
const destination={id:'one',profileId:'p',accountId:'a',bucketName:'bucket',prefix:'saved',parentId:null,label:'My files',enabled:true};
export const config=()=>({rightClickV3Migration:{version:1},profiles:[structuredClone(profile)],rightClickEngine:'v3',rightClickV3:{version:1,revision:3,destinations:[structuredClone(destination)]},transferHistory:[{id:'preserved'}],toolbarOpenMode:'shelf'});
export function worker(local=config(),failure={}){
 const native=new Map(failure.nativeEntries||[]),calls=[],warnings=[];let active=0,maxActive=0;
 const storage={async get(keys){if(failure.storage)throw Error('storage unavailable');return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(local[k])]));},async set(patch){Object.assign(local,structuredClone(patch));},remove:noop};
 const chrome={runtime:{id:'test',lastError:null,getURL:p=>'chrome-extension://test/'+p,getManifest:()=>({version:'0.5.27'}),onStartup:event(),onInstalled:event(),onMessage:event(),openOptionsPage:async()=>calls.push(['options'])},identity:{getRedirectURL:()=> 'https://test.chromiumapp.org/'},action:{onClicked:event(),setPopup:async o=>calls.push(['popup',o.popup]),setIcon:noop,setTitle:noop},storage:{local:storage,session:storage,onChanged:event()},alarms:{onAlarm:event(),create:noop},tabs:{onRemoved:event(),onUpdated:event(),create:async o=>{calls.push(['tab',o]);if(failure.tab)throw Error('tab unavailable');}},windows:{onRemoved:event(),create:async o=>{calls.push(['window',o]);if(failure.window)throw Error('blocked');return {id:42};},update:async()=>{calls.push(['focus']);return {id:42};}},webNavigation:{onBeforeNavigate:event(),onCommitted:event(),onErrorOccurred:event()},sidePanel:{setOptions:async()=>{if(failure.options)throw Error('panel configuration unavailable');},open:o=>{calls.push(['panel',o]);if(failure.syncPanel)throw Error('synchronous panel error');return failure.panel?Promise.reject(Error('gesture/panel rejected')):Promise.resolve();}}};
 const callback=(cb,error)=>{chrome.runtime.lastError=error?{message:error}:null;cb?.();chrome.runtime.lastError=null;};
 chrome.contextMenus={onClicked:event(),remove(id,cb){native.delete(id);callback(cb);},async removeAll(){calls.push(["removeAll"]);active++;maxActive=Math.max(maxActive,active);await Promise.resolve();active--;if(failure.remove)throw Error('remove unavailable');native.clear();},update(id,patch,cb){if(!native.has(id))return callback(cb,'missing');native.set(id,{...native.get(id),...structuredClone(patch)});callback(cb);},create(item,cb){
   if(failure.create===item.id){failure.create=null;return callback(cb,'injected registration failure');}
   if(failure.allCreates)return callback(cb,'Chrome denied registration');
   if(native.has(item.id))return callback(cb,'duplicate');
   if(item.parentId&&!native.has(item.parentId))return callback(cb,'missing parent');
   native.set(item.id,structuredClone(item));if(failure.dropCallback===item.id){failure.dropCallback=null;return;}callback(cb);
 }};
 const context=vm.createContext({chrome,console:{warn:(...x)=>warnings.push(x),error:(...x)=>warnings.push(x)},navigator:{locks:{request:async(n,f)=>f()}},crypto:webcrypto,TextEncoder,TextDecoder,URL,URLSearchParams,setTimeout:(fn,ms,...args)=>setTimeout(fn,ms===5000?25:ms,...args),clearTimeout,setInterval,clearInterval,structuredClone,atob,btoa,performance});
 context.importScripts=(...paths)=>paths.forEach(p=>{if(failure.import===p)throw Error('injected import error');return vm.runInContext(readFileSync('extension/'+p,'utf8'),context,{filename:p});});
 let evaluationError;try{vm.runInContext(source,context,{filename:'background.js'});}catch(error){if(!failure.import)throw error;evaluationError=error;}
 const ready=async()=>{await vm.runInContext('menuRebuildQueue',context).catch(()=>{});await new Promise(r=>setImmediate(r));};
 const click=async tab=>{chrome.action.onClicked.listeners[0](tab);await new Promise(r=>setImmediate(r));};
 return {evaluationError,context,chrome,local,native,calls,warnings,ready,click,get maxActive(){return maxActive;},rebuild:()=>context.rebuildMenus()};
}
