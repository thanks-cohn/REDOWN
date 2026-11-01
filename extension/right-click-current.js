/* CURRENT and its JSONL journal share one IndexedDB transaction. Chrome menus
 * and independent user files are deliberately outside that transaction. */
(() => {
  'use strict';
  const fields=['rightClickV3','rightClickV3Presentation','rightClickV3LevelScopes','rightClickActivatedBuckets','rightClickV3Inventory'];
  const clone=value=>structuredClone(value);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('CURRENT transaction aborted.'));});
  const safe=(value)=>{
    if(Array.isArray(value))return value.map(safe);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!/(token|password|cookie|secret|credential|authorization|publicUrl)/i.test(key)).map(([key,v])=>[key,safe(v)]));
    return value;
  };
  function namespace(d,endpoint=''){
    return JSON.stringify(['cloudflare-r2',d.profileId,d.accountId,endpoint,d.bucketName]);
  }
  function period(date,policy){
    if(policy==='off')return 'live';
    const d=new Date(date);if(policy==='weekly')d.setDate(d.getDate()-(d.getDay()+6)%7);
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function create(database=globalThis.indexedDB,{clock=()=>Date.now(),fault=()=>{}}={}){
    let opening;
    const open=()=>opening??=new Promise((resolve,reject)=>{
      if(!database){reject(Error('Directory storage is unavailable.'));return;}
      const r=database.open('redown-right-click-current',1);
      r.onupgradeneeded=()=>{for(const name of ['state','records','journal','pointers','backups'])r.result.createObjectStore(name,{keyPath:'id'});};
      r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};
      r.onerror=()=>{opening=null;reject(r.error);};r.onblocked=()=>{opening=null;reject(Error('Close other REDOWN windows and retry.'));};
    });
    async function readState(profiles=null){
      const db=await open(),tx=db.transaction(['state','records'],'readonly'),finished=done(tx);
      const [rows,records]=await Promise.all(['state','records'].map(name=>request(tx.objectStore(name).getAll())));await finished;
      const state=Object.fromEntries(rows.map(r=>[r.id,r.value]));
      if(state.rightClickV3Inventory){
        const inventory=state.rightClickV3Inventory;
        if(profiles&&globalThis.RedownRightClickV3){
          const key=RedownRightClickV3.inventoryKey({...state.rightClickV3,levelScopes:state.rightClickV3LevelScopes},profiles,state.rightClickV3Presentation);
          if(key!==inventory.key){inventory.key=key;inventory.at=0;inventory.complete=false;}
        }
        let tuples=[];try{tuples=JSON.parse(inventory.key)[3]||[];}catch{}
        inventory.nodes=records.filter(r=>r.kind==='directory'&&tuples.some(t=>r.namespace===namespace({profileId:t[1],accountId:t[2],bucketName:t[3]},t[5]))).map(r=>({...r.value,...(inventory.verifications||[]).find(v=>v.id===r.id)?.value}));
      }
      return state;
    }
    async function commitPatch(raw,{profiles=[],policy='daily'}={}){
      if(!['daily','weekly','off'].includes(policy))throw Error('Choose Daily, Weekly or Off.');
      const patch=Object.fromEntries(fields.filter(k=>Object.hasOwn(raw,k)).map(k=>[k,safe(raw[k])]));
      const db=await open(),tx=db.transaction(['state','records','journal','pointers','backups'],'readwrite'),finished=done(tx);
      try{
        const stores=Object.fromEntries(['state','records','journal','pointers','backups'].map(n=>[n,tx.objectStore(n)]));
        const [stateRows,oldRecords,pointers]=await Promise.all(['state','records','pointers'].map(n=>request(stores[n].getAll())));
        const old=Object.fromEntries(stateRows.map(r=>[r.id,r.value])),records=new Map(oldRecords.map(r=>[r.id,r])),changes=new Map();
        const add=(ns,kind,id,value)=>{
          const key=JSON.stringify([ns,kind,id]),previous=records.get(key);
          if(same(previous?.value,value))return;
          const record={id:key,namespace:ns,kind,value};records.set(key,record);
          if(!changes.has(ns))changes.set(ns,[]);changes.get(ns).push({record,previous:previous?.value});
        };
        const ns=d=>namespace(d,profiles.find(p=>p.id===d.profileId&&p.accountId===d.accountId&&p.bucketName===d.bucketName)?.workerUrl||'');
        for(const key of ['rightClickV3','rightClickV3LevelScopes','rightClickActivatedBuckets'])if(Object.hasOwn(patch,key)){
          const property=key==='rightClickV3'?'destinations':'buckets',before=old[key]?.[property]||[],after=patch[key]?.[property]||[];
          for(const d of after)add(ns(d),key,d.id,d);
          for(const d of before)if(!after.some(q=>q.id===d.id))add(ns(d),key,d.id,{...d,enabled:false,removed:true});
          if(key==='rightClickV3'&&!same(old[key]?.defaultBucket,patch[key]?.defaultBucket))add('settings',key,'default',patch[key]?.defaultBucket||null);
        }
        if(Object.hasOwn(patch,'rightClickV3Presentation'))add('settings','presentation','menu',patch.rightClickV3Presentation);
        if(patch.rightClickV3Inventory){
          const inv=patch.rightClickV3Inventory;let tuples=[];try{tuples=JSON.parse(inv.key)[3]||[];}catch{throw Error('Invalid directory identity.');}
          for(const node of inv.nodes||[]){
            const tuple=tuples.find(t=>t[1]===node.profileId&&t[2]===node.accountId&&t[3]===node.bucketName);if(!tuple)throw Error('Unbound directory identity.');
            const {listed,observedAt,partial,...semantic}=node;
            add(namespace(node,tuple[5]),'directory',node.prefix,semantic);
          }
          patch.rightClickV3Inventory={...inv,verifications:(inv.nodes||[]).map(node=>({id:JSON.stringify([namespace(node,tuples.find(t=>t[1]===node.profileId&&t[2]===node.accountId&&t[3]===node.bucketName)?.[5]),'directory',node.prefix]),value:{listed:node.listed,observedAt:node.observedAt,partial:node.partial}}))};delete patch.rightClickV3Inventory.nodes;
        }
        const now=clock(),date=period(now,policy);
        for(const ns of new Set([...pointers.map(p=>p.id),...changes.keys()])){
          const prior=pointers.find(p=>p.id===ns),generation=prior?.generation||0;
          const rollover=prior?.period!==date;
          if(rollover&&policy!=='off'){
            const id=JSON.stringify([ns,date]);
            if(!await request(stores.backups.get(id)))stores.backups.add({id,namespace:ns,period:date,capturedAt:now,generation,records:oldRecords.filter(r=>r.namespace===ns)});
          }
          const delta=changes.get(ns)||[];
          for(let i=0;i<delta.length;i++){
            const {record,previous}=delta[i];stores.records.put(record);
            stores.journal.add({id:JSON.stringify([ns,generation+1,i]),namespace:ns,generation:generation+1,at:now,kind:record.kind,recordId:record.id,previous,current:record.value});
          }
          if(delta.length||rollover)stores.pointers.put({id:ns,generation:generation+(delta.length?1:0),period:date,working:JSON.stringify([ns,date,'WORKING']),updatedAt:now,desired:generation+(delta.length?1:0),applied:prior?.applied??null});
        }
        for(const [id,value] of Object.entries(patch))if(!same(old[id],value))stores.state.put({id,value});
        fault('beforeCommit',tx);
        await finished;return {changed:[...changes.values()].reduce((n,a)=>n+a.length,0)};
      }catch(error){try{tx.abort();}catch{}await finished.catch(()=>{});throw error;}
    }
    async function dump(){
      const db=await open(),tx=db.transaction(['state','records','journal','pointers','backups'],'readonly'),finished=done(tx);
      const names=['state','records','journal','pointers','backups'];const values=await Promise.all(names.map(n=>request(tx.objectStore(n).getAll())));await finished;
      return {schemaVersion:1,format:'redown-right-click',exportedAt:clock(),requiresReconnect:true,journalJSONL:values[names.indexOf('journal')].map(event=>JSON.stringify(event)).join('\n'),stores:Object.fromEntries(names.map((n,i)=>[n,values[i]]))};
    }
    async function generations(){
      const db=await open(),tx=db.transaction('pointers','readonly'),finished=done(tx);const rows=await request(tx.objectStore('pointers').getAll());await finished;return rows.map(p=>({id:p.id,desired:p.desired}));
    }
    async function acknowledge(expected=[]){
      const db=await open(),tx=db.transaction('pointers','readwrite'),finished=done(tx),store=tx.objectStore('pointers');
      const pointers=await request(store.getAll());for(const p of pointers)if(expected.some(e=>e.id===p.id&&e.desired===p.desired))store.put({...p,applied:p.desired});await finished;
    }
    async function restore(bundle){
      globalThis.RedownRightClickBackup.validate(bundle);
      const db=await open(),names=['state','records','journal','pointers','backups'],tx=db.transaction(names,'readwrite'),finished=done(tx);
      try{
        const existing=await request(tx.objectStore('records').getAll());
        if(existing.some(r=>r.kind!=='presentation'))throw Error('CURRENT already exists. Restore into a new extension profile to avoid overwriting your records.');
        for(const name of names)tx.objectStore(name).clear();
        for(const name of names)for(const row of bundle.stores[name])tx.objectStore(name).add(name==='pointers'?{...row,applied:null}:clone(row));
        fault('beforeRestoreCommit',tx);await finished;
      }catch(error){try{tx.abort();}catch{}await finished.catch(()=>{});throw error;}
    }
    return {readState,commitPatch,dump,acknowledge,generations,restore};
  }
  globalThis.RedownRightClickCurrent=Object.freeze({create,period,safe});
})();
