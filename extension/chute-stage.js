/* REDOWN private Chutey transport; no cloud authority or public URL fallback. */
(() => {
  'use strict';
  const TTL=90000,RETRY_TTL=30000,KEEP_TTL=10*60000,MAX_BYTES=128000000,MAX_FILES=4,CHUNK_BYTES=128*1024;
  const inactive=v=>v.used||['drop_dispatched','failed','cached'].includes(v.state);
  const parseMB=value=>{const n=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;if(!Number.isFinite(n)||n<=0)throw Error('Enter a finite positive number of MB.');return n;};
  const DEFAULT_RETENTION_HOURS=1;
  // Zero means delete as soon as a handoff finishes. Decimal hours are supported.
  const parseRetentionHours=value=>{
    const n=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
    if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(Math.round(n*3600000))||
      Date.now()+Math.round(n*3600000)>8640000000000000)
      throw Error('Enter a nonnegative, finite number of hours.');
    return n;
  };
  const validRetentionMs=value=>Number.isSafeInteger(value)&&value>=0&&value<=8640000000000000-Date.now();
  const lifetime=v=>v.keep===true&&validRetentionMs(v.retentionMs)?v.retentionMs:(v.keep?KEEP_TTL:RETRY_TTL);
  function createStage({indexedDB=globalThis.indexedDB,now=Date.now}={}) {
    let opening;
    function db(){return opening??=new Promise((resolve,reject)=>{
      const r=indexedDB.open('redown-chute-v1',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(Error('Private drag staging unavailable.'));};
    });}
    async function transaction(mode,fn){
      const database=await db();return new Promise((resolve,reject)=>{
        const tx=database.transaction('files',mode),store=tx.objectStore('files');let result;
        tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(Error('Private drag staging interrupted or storage quota exceeded.'));
        fn(store,value=>{result=value;});
      });
    }
    const valid=(id,name,size)=>/^[a-f0-9-]{36}$/.test(id)&&Number.isSafeInteger(size)&&size>=0&&size<=MAX_BYTES&&typeof name==='string'&&name.length>0&&!/[\\/\0\r\n]/.test(name);
    async function purge(all=false){return transaction('readwrite',s=>{
      const r=s.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(all||c.value.expires<=now())c.delete();c.continue();};
    });}
    function capacity(s,records,record,maxBytes,done){
      // Reclaim only inactive records. Never replace another Shelf's live lease.
      let live=records.filter(v=>v.expires>now()&&v.id!==record.id);
      for(const v of records)if(v.expires<=now())s.delete(v.id);
      const bytes=()=>live.reduce((n,v)=>n+(Number.isSafeInteger(v.size)?v.size:v.blob?.size||0),record.size);
      const candidates=live.filter(inactive).sort((a,b)=>a.expires-b.expires);
      while((live.length>=MAX_FILES||bytes()>maxBytes)&&candidates.length){const old=candidates.shift();s.delete(old.id);live=live.filter(v=>v.id!==old.id);}
      if(live.length>=MAX_FILES||bytes()>maxBytes){done(false);return;}
      s.put(record);done(true);
    }
    return {
      async list(limit=20){return transaction('readonly',(store,done)=>{
        const request=store.getAll();request.onsuccess=()=>{
          const entries=request.result.filter(v=>v.expires>now())
            .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,Math.max(1,Math.min(100,limit)))
            .map(v=>({id:v.id,name:v.name,mime:v.mime,size:v.size,state:v.state,
              expires:v.expires,createdAt:v.createdAt||null,completedAt:v.completedAt||null,used:v.used===true,ready:v.ready===true}));
          done(entries);
        };
      });},
      async reserve(id,{name,mime,size,cacheKey='',maxBytes=MAX_BYTES,policyBytes=50000000}) {
        if(!valid(id,name,size)||size>policyBytes)throw Error('File cannot be staged safely.');
        const record={policyBytes,id,blob:null,name,mime,size,cacheKey,createdAt:now(),expires:now()+TTL,armed:false,claim:null,offset:0,state:'preparing',used:false};
        const ok=await transaction('readwrite',(s,done)=>{const r=s.getAll();r.onsuccess=()=>{
          // A reusable candidate will be moved, never copied, after fresh stat.
          const candidate=r.result.find(v=>v.cacheKey&&v.cacheKey===cacheKey&&inactive(v)&&v.blob&&v.expires>now());
          if(candidate){const pending={...record,size:0};capacity(s,r.result,pending,maxBytes,yes=>{if(yes)s.put(record);done(yes);});}
          else capacity(s,r.result,record,maxBytes,done);
        };});
        if(!ok)throw Error('Prepared-file queue is full. Clear Prepared Files or wait for a current handoff to finish.');
        return {id,expires:record.expires,name,mime,size,policyBytes};
      },
      async reuse(id,{cacheKey,version,keep=false,retentionMs=null,maxBytes=MAX_BYTES}){return transaction('readwrite',(s,done)=>{
        const r=s.getAll();r.onsuccess=()=>{
          const records=r.result,v=records.find(v=>v.id===id);if(!v||v.expires<=now()||v.used){done(null);return;}
          v.cacheKey=cacheKey;v.version=version;v.keep=keep===true;v.retentionMs=validRetentionMs(retentionMs)?retentionMs:null;
          const cached=version&&records.find(old=>old.id!==id&&old.expires>now()&&old.cacheKey===cacheKey&&old.version===version&&old.size===v.size&&old.blob&&inactive(old));
          if(cached){v.blob=cached.blob;v.ready=false;v.state='validating';s.delete(cached.id);s.put(v);done(true);return;}
          const others=records.filter(old=>{if(old.id!==id&&old.cacheKey===cacheKey&&inactive(old)){s.delete(old.id);return false;}return true;});
          capacity(s,others,v,maxBytes,ok=>done(ok?false:null));
        };
      });},
      async fulfill(id,blob,metadata={}){return transaction('readwrite',(s,done)=>{
        const r=s.get(id);r.onsuccess=()=>{const v=r.result;
          if(!v||v.expires<=now()||v.blob||v.used||blob.size!==v.size||blob.size>MAX_BYTES){done(false);return;}
          v.blob=blob;v.ready=true;v.state='prepared';v.cacheKey=metadata.cacheKey||v.cacheKey;v.version=metadata.version||v.version;v.keep=metadata.keep===true;v.retentionMs=validRetentionMs(metadata.retentionMs)?metadata.retentionMs:null;s.put(v);done(true);
        };
      });},
      async activate(id){return this.update(id,v=>{if(!v.blob||v.used)return false;v.ready=true;v.state='prepared';return true;});},
      async put(blob,{name,mime}) {
        const id=crypto.randomUUID(),h=await this.reserve(id,{name,mime,size:blob.size});
        if(!await this.fulfill(id,blob))throw Error('Staging expired.');return h;
      },
      async update(id,fn){return transaction('readwrite',(s,done)=>{
        const r=s.get(id);r.onsuccess=()=>{const v=r.result;
          if(!v||v.expires<=now()){if(v)s.delete(id);done(null);return;}
          if(!Number.isSafeInteger(v.size)&&v.blob)v.size=v.blob.size;
          const result=fn(v);if(result!==false)s.put(v);done(result===false?null:result);
        };
      });},
      async retire(id){return this.update(id,v=>{
        if(!v.blob||v.ready===false||v.claim&&!v.used)return false;
        v.used=true;v.armed=false;v.claim=null;v.state='cached';v.completedAt=now();v.expires=now()+lifetime(v);return true;
      });},
      async finish(id,owner,state){return this.update(id,v=>{
        if(v.used||v.claim!==owner||!['drop_dispatched','failed'].includes(state)||state==='drop_dispatched'&&v.offset!==v.size)return false;
        v.used=true;v.armed=false;v.state=state;v.completedAt=now();v.expires=now()+lifetime(v);return true;
      });},
      async stats(){return transaction('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>{const live=r.result.filter(v=>v.expires>now());done({count:live.length,bytes:live.reduce((n,v)=>n+(v.blob?v.blob.size:0),0),maxBytes:MAX_BYTES,maxFiles:MAX_FILES,retrySeconds:RETRY_TTL/1000,keepMinutes:KEEP_TTL/60000});};});},
      async remove(id){return transaction('readwrite',s=>s.delete(id));},purge,
      async close(){if(opening)(await opening).close();opening=null;}
    };
  }
  globalThis.RedownChuteStage=Object.freeze({createStage,parseMB,parseRetentionHours,DEFAULT_RETENTION_HOURS,TTL,RETRY_TTL,KEEP_TTL,MAX_BYTES,MAX_FILES,CHUNK_BYTES});
})();
