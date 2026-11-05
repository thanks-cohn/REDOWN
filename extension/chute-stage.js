/* REDOWN transport v1 for the Chute-derived browser handoff. No cloud engine.
 * Private extension IndexedDB; deliberately no localhost or native fallback. */
(() => {
  'use strict';
  const TTL=60000,MAX_BYTES=32*1024*1024,CHUNK_BYTES=128*1024;
  function createStage({indexedDB=globalThis.indexedDB,now=Date.now}={}) {
    let opening;
    function db(){return opening??=new Promise((resolve,reject)=>{
      const r=indexedDB.open('redown-chute-v1',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(Error('Private drag staging unavailable.'));};
    });}
    async function transaction(mode,fn){
      const database=await db();
      return new Promise((resolve,reject)=>{
        const tx=database.transaction('files',mode),store=tx.objectStore('files');let result;
        tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(Error('Private drag staging interrupted.'));
        fn(store,value=>{result=value;});
      });
    }
    async function purge(all=false){return transaction('readwrite',(s)=>{
      const r=s.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(all||c.value.expires<=now())c.delete();c.continue();};
    });}
    return {
      async reserve(id,{name,mime,size}) {
        if(!/^[a-f0-9-]{36}$/.test(id)||!Number.isSafeInteger(size)||size<0||size>MAX_BYTES||!name||/[\\/\0\r\n]/.test(name))throw Error('File cannot be staged safely.');
        const record={id,blob:null,name,mime,size,expires:now()+TTL,armed:false,claim:null,offset:0,state:'preparing'};
        await transaction('readwrite',s=>{s.clear();s.put(record);});
        return {id,expires:record.expires,name,mime,size};
      },
      async fulfill(id,blob){return transaction('readwrite',(s,done)=>{
        const r=s.get(id);r.onsuccess=()=>{const v=r.result;
          if(!v||v.expires<=now()||v.blob||blob.size!==v.size||blob.size>MAX_BYTES){done(false);return;}
          v.blob=blob;v.state=v.armed?'drag_started':'prepared';s.put(v);done(true);
        };
      });},
      async put(blob,{name,mime}) {
        if(!Number.isSafeInteger(blob.size)||blob.size>MAX_BYTES||!name||/[\\/\0\r\n]/.test(name))throw Error('File cannot be staged safely.');
        const record={id:crypto.randomUUID(),blob,name,mime,expires:now()+TTL,armed:false,claim:null,offset:0,state:'prepared'};
        // Atomic replace bounds total persisted bytes to one file, across Shelf instances.
        await transaction('readwrite',(s)=>{s.clear();s.put(record);});
        return {id:record.id,expires:record.expires,name,mime,size:blob.size};
      },
      async update(id,fn){return transaction('readwrite',(s,done)=>{
        const r=s.get(id);r.onsuccess=()=>{
          const v=r.result;if(!v||v.expires<=now()){if(v)s.delete(id);done(null);return;}
          const result=fn(v);if(result!==false)s.put(v);done(result===false?null:result);
        };
      });},
      async remove(id){return transaction('readwrite',s=>s.delete(id));},purge,
      async close(){if(opening)(await opening).close();opening=null;}
    };
  }
  globalThis.RedownChuteStage=Object.freeze({createStage,TTL,MAX_BYTES,CHUNK_BYTES});
})();
