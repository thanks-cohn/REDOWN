import {initialState} from './simulation.mjs';
import {fault} from './contract.mjs';
// One namespaced database; transaction ownership is shared across tabs by IndexedDB.
// No Chrome settings, production history, profiles, tokens or counters are written here.
export async function openBetaStore(indexedDB=globalThis.indexedDB) {
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('redown.phase2.beta',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onerror=()=>reject(fault('STORAGE_FAILED'));
    request.onblocked=()=>reject(fault('STORAGE_BLOCKED'));
    request.onsuccess=()=>resolve(request.result);
  });
  db.onversionchange=()=>db.close();
  const transaction=(write,fn,context)=>new Promise((resolve,reject)=>{
    let output;const started=performance.now();
    const tx=db.transaction('state',write?'readwrite':'readonly'),objects=tx.objectStore('state');
    tx.oncomplete=()=>{context?.resourceTrace?.atlas.record(context.resourceTrace.id,'persistence','extension/file-engine/indexeddb-store.mjs',started);resolve(output);};tx.onabort=()=>reject(fault('STORAGE_FAILED'));tx.onerror=()=>{};
    const request=objects.get('snapshot');
    request.onsuccess=()=>{
      try {const state=request.result||initialState();output=fn(state);if(output&&typeof output.then==='function')throw fault('ASYNC_TRANSACTION_FORBIDDEN');if(write)objects.put(state,'snapshot');}
      catch(error){tx.onabort=()=>reject(error);tx.abort();}
    };
  });
  return {read:context=>transaction(false,state=>structuredClone(state),context),update:(fn,context)=>transaction(true,fn,context),close:()=>db.close()};
}
