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
  function narrowEntries(config,profiles,root='redown'){
    validate(config,profiles);const out=[];
    const walk=(parentId,menuParent)=>{
      for(const d of config.destinations.filter(d=>d.parentId===parentId&&eligible(d,config,profiles))){
        const id='v3:'+d.id;
        out.push({id,parentId:menuParent,title:d.label.trim(),contexts});
        if(config.destinations.some(c=>c.parentId===d.id&&eligible(c,config,profiles))){
          out.push({id:id+':send',parentId:id,title:'Save here',contexts});walk(d.id,id);
        }
      }
    };
    walk(null,root);return out;
  }
  function narrowResolve(id,config,profiles){
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

  // Presentation is deliberately independent of destination revisions and Legacy mode.
  const limits=Object.freeze({depth:10,entries:300,folders:500,pages:80,milliseconds:20000,ttl:300000});
  function presentation(value){
    return {style:value?.style==='nested'?'nested':'simple',nested:value?.nested==='level'?'level':'narrow',depth:Number.isInteger(value?.depth)&&value.depth>=1&&value.depth<=limits.depth?value.depth:1};
  }
  function validatePresentation(value){
    if(!value||!['simple','nested'].includes(value.style)||!['narrow','level'].includes(value.nested)||!Number.isInteger(value.depth)||value.depth<1||value.depth>limits.depth)throw Error('Choose a menu style, nested option and integer depth from 1 to 10.');
    return presentation(value);
  }
  const within=(prefix,root)=>prefix===root||prefix.startsWith(root?root+'/':'');
  function roots(config,profiles){
    validate(config,profiles);
    const candidates=config.destinations.filter(d=>d.parentId===null&&eligible(d,config,profiles));
    return candidates.filter((d,i)=>!candidates.some((other,j)=>other.profileId===d.profileId&&within(d.prefix,other.prefix)&&(other.prefix!==d.prefix||j<i)));
  }
  function inventoryKey(config,profiles,settings){
    return JSON.stringify([config.revision,presentation(settings).depth,roots(config,profiles).map(d=>[d.profileId,d.accountId,d.bucketName,d.prefix,prepared(d,profiles).workerUrl])]);
  }
  function fresh(inventory,key,now=Date.now()){return inventory?.key===key&&Number.isFinite(inventory.at)&&now>=inventory.at&&now-inventory.at<limits.ttl;}
  const compare=(a,b)=>a<b?-1:a>b?1:0;
  function childPrefixes(page,prefix){
    const parent=prefix?prefix+'/':'',children=new Set();
    for(const raw of [...(page.delimited||[]),...(page.objects||[]).map(o=>o.key||o.name||'')]){
      if(typeof raw!=='string'||!raw.startsWith(parent))continue;
      const relative=raw.slice(parent.length),slash=relative.indexOf('/');
      if(slash<=0)continue;
      const child=parent+relative.slice(0,slash);
      // Match the existing exact-prefix save contract; never normalize cloud names.
      if(new TextEncoder().encode(child).length>900||/[\\\x00-\x1f\x7f]/.test(child)||child.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('unsupported-folder');
      children.add(child);
    }
    return [...children].sort(compare);
  }
  async function discover(config,profiles,settings,listPage,clock=()=>Date.now()){
    const options=presentation(settings),start=clock(),key=inventoryKey(config,profiles,options);
    const nodes=roots(config,profiles).map(d=>({profileId:d.profileId,accountId:d.accountId,bucketName:d.bucketName,prefix:d.prefix,parent:null,level:0}));
    const warnings=new Set();let pages=0,halt=false;
    for(let i=0;i<nodes.length&&!halt;i++){
      const node=nodes[i];if(node.level>=options.depth)continue;
      let cursor='';const seen=new Set();
      do{
        if(pages>=limits.pages||nodes.length>=limits.folders||clock()-start>=limits.milliseconds){warnings.add('Inventory limit reached; some folders are not shown.');halt=true;break;}
        let timedOut=false;
        try{
          let timer;
          const remaining=Math.max(1,Math.min(8000,limits.milliseconds-(clock()-start)));
          const page=await Promise.race([listPage(node.accountId,node.bucketName,node.prefix?node.prefix+'/':'',cursor,'/'),new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(Error('timeout'));},remaining);})]).finally(()=>clearTimeout(timer));
          pages++;
          if(page.truncated&&!page.cursor||page.cursor&&(page.cursor===cursor||seen.has(page.cursor)))throw Error('pagination');
          const children=childPrefixes(page,node.prefix);
          for(const prefix of children){
            if(nodes.some(n=>n.profileId===node.profileId&&n.prefix===prefix))continue;
            if(nodes.length>=limits.folders){warnings.add('Folder limit reached; some folders are not shown.');halt=true;break;}
            nodes.push({...node,prefix,parent:node.prefix,level:node.level+1});
          }
          cursor=page.cursor||'';seen.add(cursor);
        }catch{warnings.add('Some folders could not be read; inventory is incomplete.');if(timedOut)halt=true;break;}
      }while(cursor&&!halt);
    }
    // Stable sibling order independent of network completion and provider page order.
    nodes.sort((a,b)=>compare(a.profileId,b.profileId)||compare(a.prefix,b.prefix));
    return {version:1,key,at:clock(),depth:options.depth,nodes,pages,complete:!warnings.size,warnings:[...warnings]};
  }
  const nodeId=n=>'v3:cloud:'+encodeURIComponent(n.profileId)+':'+encodeURIComponent(n.prefix);
  function levelProjection(config,profiles,settings,inventory,root,now){
    const key=inventoryKey(config,profiles,settings),valid=fresh(inventory,key,now),out=[],warnings=[];
    if(!valid)return {entries:out,warnings:['Folder inventory is unavailable or stale. Open Right-click Setup to refresh.'],complete:false};
    warnings.push(...inventory.warnings||[]);
    const authorized=roots(config,profiles),nodes=(inventory.nodes||[]).filter(n=>authorized.some(d=>d.profileId===n.profileId&&d.accountId===n.accountId&&d.bucketName===n.bucketName&&within(n.prefix,d.prefix)));
    function walk(node,parentId){
      const children=nodes.filter(n=>n.profileId===node.profileId&&n.parent===node.prefix&&n.level===node.level+1);
      const id=nodeId(node),cost=children.length?2:1;
      if(out.length+cost>limits.entries){warnings.push('Chrome menu entry limit reached; some folders are not shown.');return;}
      out.push({id,parentId,title:node.prefix.split('/').at(-1)||node.bucketName,contexts});
      if(children.length)out.push({id:id+':send',parentId:id,title:'Save here',contexts});
      for(const child of children)walk(child,id);
    }
    // Preserve bucket headings for authorized subfolder roots, without making
    // ancestors outside the authorized prefix writable.
    for(const profileId of [...new Set(nodes.map(n=>n.profileId))]){
      const top=nodes.filter(n=>n.profileId===profileId&&n.parent===null);
      let parent=root;
      if(!top.some(n=>n.prefix==='')){
        if(out.length>=limits.entries){warnings.push('Chrome menu entry limit reached; some folders are not shown.');break;}
        parent='v3:bucket:'+encodeURIComponent(profileId);out.push({id:parent,parentId:root,title:top[0]?.bucketName||'',contexts});
      }
      for(const n of top)walk(n,parent);
    }
    return {entries:out,warnings:[...new Set(warnings)],complete:!!inventory.complete&&!warnings.length};
  }
  function project(config,profiles,settings,inventory,root='redown',now=Date.now()){
    validate(config,profiles);const options=presentation(settings);
    if(options.style==='nested'&&options.nested==='level')return levelProjection(config,profiles,options,inventory,root,now);
    const all=options.style==='simple'?config.destinations.filter(d=>eligible(d,config,profiles)).map(d=>({id:'v3:'+d.id,parentId:root,title:d.label.trim(),contexts})):narrowEntries(config,profiles,root);
    // Stop before any orphan could be introduced; the full store is never changed.
    const entries=all.slice(0,limits.entries);
    if(all[entries.length]?.id===entries.at(-1)?.id+':send')entries.pop();
    return {entries,complete:all.length===entries.length,warnings:all.length===entries.length?[]:['Chrome menu entry limit reached; some destinations are not shown.']};
  }
  function entries(config,profiles,root='redown',settings,inventory){return project(config,profiles,settings,inventory,root).entries;}
  function resolve(id,config,profiles,settings,inventory,now=Date.now()){
    try{
      const plan=project(config,profiles,settings,inventory,'redown',now),item=plan.entries.find(n=>n.id===id);
      if(!item||plan.entries.some(n=>n.parentId===id))return null;
      const options=presentation(settings);
      if(options.style==='nested'&&options.nested==='level'){
        const node=inventory.nodes.find(n=>nodeId(n)===id||nodeId(n)+':send'===id);
        if(!node)return null;const profile=prepared(node,profiles);return profile?{profile,owner:profile,prefix:node.prefix}:null;
      }
      if(options.style==='nested')return narrowResolve(id,config,profiles);
      const d=config.destinations.find(d=>'v3:'+d.id===id);const profile=prepared(d,profiles);return {profile,owner:profile,prefix:d.prefix};
    }catch{return null;}
  }
  globalThis.RedownRightClickV3=Object.freeze({empty,validate,entries,resolve,remove,presentation,validatePresentation,roots,inventoryKey,fresh,discover,project,limits});
})();
