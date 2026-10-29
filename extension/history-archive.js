/* REDOWN's durable local transfer archive. Legacy transferHistory remains a
   50-entry compatibility window; this IndexedDB log keeps the full recorded
   history (subject to the browser's finite local storage quota).
   No network calls and no Cloudflare permissions. */
(() => {
  'use strict';
  const DB='redown-transfer-archive',STORE='records';
  function create(database=globalThis.indexedDB){
    let connection;
    const open=()=>{
      if(!database)return Promise.reject(Error('On-device history archive is unavailable.'));
      if(connection)return connection;
      connection=new Promise((resolve,reject)=>{
        const request=database.open(DB,1);
        request.onupgradeneeded=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains(STORE)){
            const store=db.createObjectStore(STORE,{keyPath:'id'});
            store.createIndex('timeline',['time','id'],{unique:false});
          }
        };
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error||Error('History archive could not open.'));
        request.onblocked=()=>reject(Error('History archive is blocked by another open extension page.'));
      }).catch(error=>{connection=null;throw error;});
      return connection;
    };
    const normalized=(entry)=>{
      const time=typeof entry.at==='string'?Date.parse(entry.at):NaN;
      return {id:entry.id, time:Number.isFinite(time)?time:0, entry};
    };
    async function write(entries){
      const valid=entries.filter(entry=>entry&&typeof entry.id==='string'&&entry.id);
      if(!valid.length)return;
      const db=await open();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
        for(const item of valid)store.put(normalized(item));
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error||Error('History archive write failed.'));
        tx.onabort=()=>reject(tx.error||Error('History archive write aborted.'));
      });
    }
    async function page(offset=0,limit=50){
      const db=await open();
      const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
      const safeLimit=Math.max(1,Math.min(100,Math.floor(Number(limit)||50)));
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE),index=store.index('timeline');
        const count=store.count(),items=[];
        let total=0,remaining=safeLimit,skipped=false;
        count.onsuccess=()=>{total=count.result;};
        const request=index.openCursor(null,'prev');
        request.onsuccess=()=>{
          const cursor=request.result;
          if(!cursor||remaining<=0)return;
          if(!skipped&&safeOffset){skipped=true;cursor.advance(safeOffset);return;}
          skipped=true;
          items.push(cursor.value.entry);
          remaining--;
          if(remaining>0)cursor.continue();
        };
        tx.oncomplete=()=>resolve({items,total});
        tx.onerror=()=>reject(tx.error||Error('History archive read failed.'));
        tx.onabort=()=>reject(tx.error||Error('History archive read aborted.'));
      });
    }
    function migrateLegacy(entries){
      const seen=new Map();
      return (Array.isArray(entries)?entries:[]).filter(e=>e&&typeof e==='object').map(entry=>{
        if(entry.id)return entry;
        // Older entries predate IDs. Derive a stable local identifier so
        // reopening History does not duplicate the retained same records.
        const source=JSON.stringify(entry),count=seen.get(source)||0;
        seen.set(source,count+1);
        let hash=2166136261;
        for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
        return {...entry,id:'legacy-'+(hash>>>0).toString(36)+'-'+count};
      });
    }
    return {append:entry=>write([entry]),importLegacy:entries=>write(migrateLegacy(entries)),page};
  }
  globalThis.RedownHistoryArchive={create};
})();
