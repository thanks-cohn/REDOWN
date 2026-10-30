/* V3 menu domain. No DOM, credentials, provider writes or legacy UI adapters. */
(() => {
  'use strict';
  const empty=()=>({version:1,revision:0,destinations:[]});
  const contexts=['link','image','video','audio','page'];
  const prepared=(d,profiles)=>profiles.find(p=>p.type==='cloudflare-r2'&&p.id===d.profileId&&p.accountId===d.accountId&&p.bucketName===d.bucketName&&p.workerUrl&&p.token);
  function validate(config,profiles){
    if(config?.version!==1||!Number.isSafeInteger(config.revision)||config.revision<0||!Array.isArray(config.destinations)||config.destinations.length>200)throw Error('Invalid V3 destination store.');
    const ids=new Set();
    for(const d of config.destinations){
      if(!/^[a-zA-Z0-9_-]{1,80}$/.test(d.id)||ids.has(d.id))throw Error('Invalid or duplicate destination ID.');
      ids.add(d.id);
      if(typeof d.label!=='string'||!d.label.trim()||d.label.length>60||/[\x00-\x1f\x7f]/.test(d.label))throw Error('Enter a menu label of 1–60 characters.');
      if(typeof d.prefix!=='string'||new TextEncoder().encode(d.prefix).length>900||/[\\\x00-\x1f\x7f]/.test(d.prefix)||d.prefix&&d.prefix.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Use an exact folder path without empty or dot segments (maximum 900 UTF-8 bytes).');
      if(typeof d.enabled!=='boolean'||!prepared(d,profiles))throw Error('Activate this account and bucket in Explorer before saving.');
    }
    for(const d of config.destinations){
      const seen=new Set([d.id]);let current=d,depth=0;
      while(current.parentId!==null){
        const parent=config.destinations.find(p=>p.id===current.parentId);
        if(!parent||seen.has(parent.id)||++depth>7||parent.profileId!==current.profileId||!current.prefix.startsWith(parent.prefix?parent.prefix+'/':'' )||current.prefix===parent.prefix)throw Error('Invalid destination hierarchy.');
        seen.add(parent.id);current=parent;
      }
    }
    return config;
  }
  function eligible(d,config,profiles){
    const seen=new Set();
    while(d){if(seen.has(d.id)||!d.enabled||!prepared(d,profiles))return false;seen.add(d.id);if(d.parentId===null)return true;d=config.destinations.find(p=>p.id===d.parentId);}
    return false;
  }
  function entries(config,profiles,root='redown'){
    validate(config,profiles);const out=[];
    const walk=(parentId,menuParent)=>{
      for(const d of config.destinations.filter(d=>d.parentId===parentId&&eligible(d,config,profiles))){
        const id='v3:'+d.id;
        out.push({id,parentId:menuParent,title:d.label.trim(),contexts});
        if(config.destinations.some(c=>c.parentId===d.id&&eligible(c,config,profiles))){
          out.push({id:id+':send',parentId:id,title:'Send here',contexts});walk(d.id,id);
        }
      }
    };
    walk(null,root);return out;
  }
  function resolve(id,config,profiles){
    if(typeof id!=='string'||!/^v3:[a-zA-Z0-9_-]+(?::send)?$/.test(id))return null;
    try{validate(config,profiles);}catch{return null;}
    const d=config.destinations.find(d=>d.id===id.split(':')[1]);
    if(!d||!eligible(d,config,profiles))return null;
    const branch=config.destinations.some(c=>c.parentId===d.id&&eligible(c,config,profiles));
    if(branch!==id.endsWith(':send'))return null;
    const profile=prepared(d,profiles);return {profile,owner:profile,prefix:d.prefix};
  }
  function remove(config,id){
    const ids=new Set([id]);let size;
    do{size=ids.size;for(const d of config.destinations)if(ids.has(d.parentId))ids.add(d.id);}while(size!==ids.size);
    return {...config,destinations:config.destinations.filter(d=>!ids.has(d.id))};
  }
  globalThis.RedownRightClickV3=Object.freeze({empty,validate,entries,resolve,remove});
})();
