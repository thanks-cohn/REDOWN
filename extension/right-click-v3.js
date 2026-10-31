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
  const identity=d=>JSON.stringify([d.profileId,d.accountId,d.bucketName]);
  const pathId=(d,prefix)=>'v3:path:'+encodeURIComponent(JSON.stringify([d.profileId,d.accountId,d.bucketName,prefix]));
  function narrowEntries(config,profiles,root='redown'){
    validate(config,profiles);const groups=new Map(),out=[];
    for(const d of config.destinations.filter(d=>eligible(d,config,profiles))){
      const key=identity(d);let node=groups.get(key);
      if(!node){node={scope:d,prefix:'',name:d.bucketName,records:[],children:new Map()};groups.set(key,node);}
      for(const part of d.prefix?d.prefix.split('/'):[]){
        if(!node.children.has(part))node.children.set(part,{scope:d,prefix:node.prefix?node.prefix+'/'+part:part,name:part,records:[],children:new Map()});
        node=node.children.get(part);
      }
      node.records.push(d);
    }
    function walk(n,parent,bucket=false){
      const single=!bucket&&n.records.length===1,d=single?n.records[0]:null;
      const id=d?'v3:'+d.id:pathId(n.scope,n.prefix),branch=bucket||n.children.size||n.records.length>1;
      const collision=[...groups.values()].filter(g=>g.name===n.name).length>1;
      out.push({id,parentId:parent,title:d?d.label.trim():bucket&&collision?n.name+' · '+n.scope.accountId+' · '+n.scope.profileId:n.name,contexts});
      if(d&&branch)out.push({id:id+':send',parentId:id,title:'Save here',contexts});
      if(!single)for(const record of n.records)out.push({id:'v3:'+record.id,parentId:id,title:record.label.trim(),contexts});
      for(const child of n.children.values())walk(child,id);
    }
    for(const g of groups.values())walk(g,root,true);
    return out;
  }
  function narrowResolve(id,config,profiles){
    const d=config.destinations.find(d=>'v3:'+d.id===id||'v3:'+d.id+':send'===id);
    if(!d)return null;
    const profile=prepared(d,profiles);return profile?{profile,owner:profile,prefix:d.prefix}:null;
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
  const emptyScopes=()=>({version:1,revision:0,buckets:[]});
  function validateScopes(value,profiles){
    if(value?.version!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.buckets)||value.buckets.length>200)throw Error('Invalid Level bucket selection.');
    const ids=new Set(),tuples=new Set();
    for(const d of value.buckets){
      if(!/^[a-zA-Z0-9_-]{1,80}$/.test(d.id)||ids.has(d.id)||tuples.has(identity(d))||typeof d.enabled!=='boolean'||!prepared(d,profiles))throw Error('Choose an activated bucket for Level.');
      ids.add(d.id);tuples.add(identity(d));
    }
    return value;
  }
  function roots(config,profiles){
    const scopes=config.levelScopes||emptyScopes();
    // Revoked scopes fail closed independently; never fall back to shortcuts.
    return (scopes.buckets||[]).filter(d=>d.enabled&&prepared(d,profiles)).map(d=>({...d,prefix:''}));
  }
  function inventoryKey(config,profiles,settings){
    return JSON.stringify([2,config.levelScopes?.revision||0,presentation(settings).depth,roots(config,profiles).map(d=>[d.id,d.profileId,d.accountId,d.bucketName,'',prepared(d,profiles).workerUrl])]);
  }
  function fresh(inventory,key,now=Date.now()){return inventory?.key===key&&Number.isFinite(inventory.at)&&now>=inventory.at&&now-inventory.at<limits.ttl;}
  const compare=(a,b)=>a<b?-1:a>b?1:0;
  function childPrefixes(page,prefix){
    if(!page||page.delimited!==undefined&&!Array.isArray(page.delimited)||page.objects!==undefined&&!Array.isArray(page.objects)||(page.delimited||[]).some(p=>typeof p!=='string'||!p.endsWith('/'))||(page.objects||[]).some(o=>!o||typeof (o.key||o.name)!=='string'))throw Error('invalid-page');
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
  async function discover(config,profiles,settings,listPage,clock=()=>Date.now(),previous=null){
    const options=presentation(settings),start=clock(),key=inventoryKey(config,profiles,options);
    const nodes=roots(config,profiles).map(d=>({profileId:d.profileId,accountId:d.accountId,bucketName:d.bucketName,prefix:d.prefix,parent:null,level:0}));
    const warnings=new Set();let pages=0,halt=false;
    const perBucket=Math.max(1,Math.floor(limits.folders/Math.max(1,nodes.length)));
    // Reuse only matching authorized buckets with fresh root observations.
    const oldKey=(()=>{try{return JSON.parse(previous?.key||'null');}catch{return null;}})();
    const newKey=JSON.parse(key);
    const reusable=nodes.filter(root=>previous?.version===2&&clock()>=(previous.nodes?.find(n=>identity(n)===identity(root)&&n.prefix==='')?.observedAt||previous.at)&&clock()-(previous.nodes?.find(n=>identity(n)===identity(root)&&n.prefix==='')?.observedAt||previous.at)<limits.ttl*12&&oldKey?.[2]===options.depth&&oldKey?.[3]?.some(tuple=>JSON.stringify(tuple)===JSON.stringify(newKey[3].find(t=>t[1]===root.profileId))));
    for(const root of reusable){
      const saved=(previous.nodes||[]).filter(n=>identity(n)===identity(root));
      if(!saved.length)continue;
      Object.assign(root,saved.find(n=>n.prefix==='')||{});
      const children=saved.filter(n=>n.prefix).sort((a,b)=>a.level-b.level||compare(a.prefix,b.prefix));
      if(children.length>=perBucket)root.partial=true;
      for(const n of children.slice(0,perBucket-1))if(nodes.length<limits.folders)nodes.push({...n});
    }
    const queue=[],retries=[];
    for(const node of nodes){
      if(node.level>=options.depth||node.listed&&!node.partial)continue;
      const frontier=(previous?.frontier||[]).find(t=>t.profileId===node.profileId&&t.prefix===node.prefix);
      queue.push({node,cursor:reusable.some(r=>identity(r)===identity(node))?frontier?.cursor||'':'',seen:frontier?.seen||[]});
    }
    while(queue.length&&!halt){
      const task=queue.shift(),node=task.node;if(node.level>=options.depth)continue;
      if(pages>=limits.pages||nodes.length>=limits.folders||clock()-start>=limits.milliseconds){warnings.add('Inventory limit reached; some folders are not shown.');queue.unshift(task);break;}
      let timedOut=false;
      try{
        let timer;const remaining=Math.max(1,Math.min(8000,limits.milliseconds-(clock()-start)));
        pages++;
        const page=await Promise.race([listPage(node.accountId,node.bucketName,node.prefix?node.prefix+'/':'',task.cursor,'/'),new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(Error('timeout'));},remaining);})]).finally(()=>clearTimeout(timer));
        if(page.truncated&&!page.cursor||page.cursor&&(page.cursor===task.cursor||task.seen.includes(page.cursor)))throw Error('pagination');
        for(const prefix of childPrefixes(page,node.prefix)){
          if(nodes.some(n=>identity(n)===identity(node)&&n.prefix===prefix))continue;
          if(nodes.filter(n=>identity(n)===identity(node)).length>=perBucket){node.partial=true;warnings.add('Folder limit reached; some folders are not shown.');break;}
          const child={...node,prefix,parent:node.prefix,level:node.level+1};nodes.push(child);queue.push({node:child,cursor:'',seen:[]});
        }
        if(page.cursor)queue.push({node,cursor:page.cursor,seen:[...task.seen,page.cursor]});
        node.listed=!page.cursor;node.observedAt=clock();
      }catch{node.listed=false;retries.push(task);warnings.add('Some folders could not be read; inventory is incomplete.');if(timedOut)halt=true;}
    }
    if(nodes.some(n=>n.partial))warnings.add('Folder limit reached; some folders are not shown.');
    // Stable sibling order independent of network completion and provider page order.
    nodes.sort((a,b)=>compare(a.profileId,b.profileId)||compare(a.prefix,b.prefix));
    const observations=roots(config,profiles).map(d=>({profileId:d.profileId,accountId:d.accountId,bucketName:d.bucketName,checked:!!nodes.find(n=>identity(n)===identity(d)&&n.prefix==='')?.listed,knownFolders:nodes.filter(n=>identity(n)===identity(d)).length-1,observedAt:nodes.find(n=>identity(n)===identity(d)&&n.prefix==='')?.observedAt||null,complete:!nodes.some(n=>identity(n)===identity(d)&&n.level<options.depth&&(!n.listed||n.partial))}));
    return {version:2,key,at:clock(),depth:options.depth,nodes,pages,observations,frontier:[...queue,...retries].map(t=>({profileId:t.node.profileId,prefix:t.node.prefix,cursor:t.cursor,seen:t.seen})),unknownRemaining:!!warnings.size,complete:!warnings.size&&!nodes.some(n=>n.partial),warnings:[...warnings]};
  }
  const nodeId=n=>'v3:cloud:'+encodeURIComponent(JSON.stringify([n.profileId,n.accountId,n.bucketName,n.prefix]));
  function levelProjection(config,profiles,settings,inventory,root,now){
    const key=inventoryKey(config,profiles,settings),valid=fresh(inventory,key,now),out=[],warnings=[];
    if(!roots(config,profiles).length)return {entries:out,warnings:['Select participating buckets in Level setup.'],complete:false};
    if(!valid)inventory={nodes:[],warnings:['Folder discovery is pending.'],observations:[],at:now,complete:false};
    warnings.push(...inventory.warnings||[]);
    const authorized=roots(config,profiles),nodes=(inventory.nodes||[]).filter(n=>authorized.some(d=>d.profileId===n.profileId&&d.accountId===n.accountId&&d.bucketName===n.bucketName&&within(n.prefix,d.prefix)));
    for(const d of authorized)if(!nodes.some(n=>identity(n)===identity(d)&&n.prefix===''))nodes.push({...d,prefix:'',parent:null,level:0});
    // Reserve every root before breadth-first allocation. Each folder reserves
    // its parent Save here atomically; later buckets cannot be starved by DFS.
    const pending=nodes.filter(n=>n.parent===null).map(n=>({node:n,parentId:root}));
    const byParent=n=>nodes.filter(c=>identity(c)===identity(n)&&c.parent===n.prefix&&c.level===n.level+1);
    while(pending.length){
      const {node,parentId}=pending.shift(),id=nodeId(node),children=byParent(node),cost=children.length?2:1;
      if(out.length+cost>limits.entries){warnings.push('Chrome menu entry limit reached; some folders are not shown.');continue;}
      const collision=nodes.filter(n=>n.parent===null&&n.bucketName===node.bucketName).length>1;
      const title=node.prefix.split('/').at(-1)||node.bucketName+(collision?' · '+node.accountId+' · '+node.profileId:'');
      out.push({id,parentId,title,contexts});
      if(children.length)out.push({id:id+':send',parentId:id,title:'Save here',contexts});
      for(const child of children)pending.push({node:child,parentId:id});
    }
    return {entries:out,summary:{depth:presentation(settings).depth,knownFolders:Math.max(0,nodes.length-authorized.length),rootsChecked:(inventory.observations||[]).filter(o=>o.checked).length,rootsTotal:authorized.length,ageMs:now-inventory.at},warnings:[...new Set(warnings)],complete:!!inventory.complete&&!warnings.length};
  }
  // A Simple provider surface is a projection, never an edit to saved labels/paths.
  function simpleTargets(config,profiles){
    const ready=profiles.filter(p=>p.type==='cloudflare-r2'&&p.bucketName==='redown'&&typeof p.accountId==='string'&&p.accountId&&p.workerUrl&&p.token&&!config.activatedBuckets?.buckets?.some(d=>d.profileId===p.id&&d.enabled===false)).sort((a,b)=>compare(a.id,b.id));
    const chosen=config.defaultBucket;
    const accounts=new Set(ready.map(p=>p.accountId));
    const main=chosen?ready.find(p=>p.id===chosen.profileId&&p.accountId===chosen.accountId&&chosen.bucketName==='redown'):accounts.size===1?ready[0]:null;
    const primary=main?{profileId:main.id,accountId:main.accountId,bucketName:'redown',prefix:''}:null;
    const extra=config.destinations.filter(d=>eligible(d,config,profiles)&&!(primary&&d.accountId===primary.accountId&&d.bucketName==='redown'&&d.prefix===''&&['REDOWN','redown','Cloudflare'].includes(d.label.trim()))).map(d=>({id:'v3:'+d.id,title:d.label.trim(),target:d}));
    const seen=new Set();
    for(const d of activated(config,profiles)){
      const bucket=JSON.stringify([d.accountId,d.bucketName]);
      if(seen.has(bucket)||primary&&d.accountId===primary.accountId&&d.bucketName==='redown')continue;
      seen.add(bucket);
      if(extra.some(e=>e.target.accountId===d.accountId&&e.target.bucketName===d.bucketName&&e.target.prefix===''))continue;
      extra.push({id:bucketId(d),title:d.bucketName,target:{...d,prefix:''}});
    }
    const used=new Set(primary?['REDOWN']:[]);
    for(const item of extra){
      const base=item.title;let title=base,i=1;
      if(extra.some(e=>e!==item&&e.title===base&&e.target.accountId!==item.target.accountId))title=base+' · '+item.target.accountId;
      const seed=title;while(used.has(title))title=seed+' · '+(++i);used.add(title);item.title=title;
    }
    return {primary,extra};
  }
  function simpleProjection(config,profiles,root){
    const {primary,extra}=simpleTargets(config,profiles);
    if(!extra.length)return {entries:[{id:primary?'v3:cloudflare':'v3:cloudflare-setup',parentId:root,title:'Cloudflare',contexts}],complete:true,warnings:primary?[]:['Choose and activate the default redown bucket.']};
    const entries=[{id:'v3:cloudflare',parentId:root,title:'Cloudflare',contexts},
      {id:primary?'v3:cloudflare-default':'v3:cloudflare-default-setup',parentId:'v3:cloudflare',title:primary?'REDOWN':'Set up REDOWN…',contexts}];
    const overflow=extra.length>limits.entries-2,shown=extra.slice(0,limits.entries-2-(overflow?1:0));
    entries.push(...shown.map(({id,title})=>({id,title,parentId:'v3:cloudflare',contexts})));
    if(overflow)entries.push({id:'v3:cloudflare-more',parentId:'v3:cloudflare',title:'More destinations…',contexts});
    return {entries,complete:!overflow,warnings:[...(!primary?['Choose and activate the default redown bucket.']:[]),...(overflow?['Chrome menu entry limit reached; use More destinations.']:[])]};
  }
  function project(config,profiles,settings,inventory,root='redown',now=Date.now()){
    if(Array.isArray(config.destinations))config={...config,destinations:config.destinations.filter(d=>prepared(d,profiles))};
    validate(config,profiles);const options=presentation(settings);
    if(options.style==='simple')return simpleProjection(config,profiles,root);
    if(options.style==='nested'&&options.nested==='level'){
      const plan=levelProjection(config,profiles,options,inventory,root,now);
      const missing=activated(config,profiles).filter(d=>!roots(config,profiles).some(q=>identity(q)===identity(d)));
      if(missing.length){plan.entries.unshift({id:'v3:buckets',parentId:root,title:'Buckets',contexts},...missing.map(d=>({id:bucketId(d),parentId:'v3:buckets',title:d.bucketName,contexts})));if(plan.entries.length>limits.entries){plan.entries.length=limits.entries;plan.complete=false;}}
      return plan;
    }
    const all=options.style==='simple'?config.destinations.filter(d=>eligible(d,config,profiles)).map(d=>({id:'v3:'+d.id,parentId:root,title:d.label.trim(),contexts})):narrowEntries(config,profiles,root);
    // Stop before any orphan could be introduced; the full store is never changed.
    const buckets=activated(config,profiles);
    if(buckets.length){const roots=[{id:'v3:buckets',parentId:root,title:'Buckets',contexts},...buckets.map(d=>({id:bucketId(d),parentId:'v3:buckets',title:d.bucketName+(buckets.some(q=>q.bucketName===d.bucketName&&q.accountId!==d.accountId)?' · '+d.accountId:''),contexts}))];all.unshift(...roots);}
    const entries=all.slice(0,limits.entries);
    if(all[entries.length]?.id===entries.at(-1)?.id+':send')entries.pop();
    return {entries,complete:all.length===entries.length,warnings:all.length===entries.length?[]:['Chrome menu entry limit reached; some destinations are not shown.']};
  }
  function entries(config,profiles,root='redown',settings,inventory){return project(config,profiles,settings,inventory,root).entries;}
  function resolve(id,config,profiles,settings,inventory,now=Date.now()){
    try{
      const plan=project(config,profiles,settings,inventory,'redown',now),item=plan.entries.find(n=>n.id===id);
      if(!item||plan.entries.some(n=>n.parentId===id))return null;
      if(presentation(settings).style==='simple'&&['v3:cloudflare','v3:cloudflare-default'].includes(id)){
        const target=simpleTargets(config,profiles).primary,profile=target&&prepared(target,profiles);
        return profile?{profile,owner:profile,prefix:''}:null;
      }
      const bucket=activated(config,profiles).find(d=>bucketId(d)===id);
      if(bucket){const profile=prepared(bucket,profiles);return {profile,owner:profile,prefix:''};}
      const options=presentation(settings);
      if(options.style==='nested'&&options.nested==='level'){
        const node=[...(inventory?.nodes||[]),...roots(config,profiles)].find(n=>nodeId({...n,prefix:n.prefix||''})===id||nodeId({...n,prefix:n.prefix||''})+':send'===id);
        if(!node)return null;const profile=prepared(node,profiles);return profile?{profile,owner:profile,prefix:node.prefix||''}:null;
      }
      if(options.style==='nested')return narrowResolve(id,config,profiles);
      const d=config.destinations.find(d=>'v3:'+d.id===id);const profile=d&&prepared(d,profiles);return profile?{profile,owner:profile,prefix:d.prefix}:null;
    }catch{return null;}
  }
  const bucketId=d=>'v3:bucket:'+encodeURIComponent(JSON.stringify([d.profileId,d.accountId,d.bucketName]));
  const activated=(config,profiles)=>(config.activatedBuckets?.buckets||[]).filter(d=>d.enabled&&prepared(d,profiles));
  function migrate(stored,profiles){
    const source=stored.rightClickV3||empty(),config={...(source.defaultBucket?{defaultBucket:source.defaultBucket}:{}),version:1,revision:(Number.isSafeInteger(source.revision)?source.revision:0)+1,destinations:[]},recovery=[];
    const add=(raw,origin)=>{
      const d={...raw,parentId:null};
      try{validate({...empty(),destinations:[d]},profiles);if(config.destinations.length>=200)throw Error('Destination limit reached.');}
      catch(error){recovery.push({origin,record:raw,reason:error.message});return;}
      if(!config.destinations.some(q=>q.id===d.id||q.profileId===d.profileId&&q.prefix===d.prefix&&q.label===d.label))config.destinations.push(d);
    };
    for(const d of Array.isArray(source.destinations)?source.destinations:[])add(d,'v3');
    // Preserve a valid existing hierarchy; incompatible parent chains stay flat
    // with their exact original record in the recovery snapshot.
    for(const d of config.destinations){const original=(Array.isArray(source.destinations)?source.destinations:[]).find(q=>q.id===d.id);if(!original?.parentId)continue;d.parentId=original.parentId;try{validate(config,profiles);}catch{d.parentId=null;recovery.push({origin:'v3-parent',record:original,reason:'Parent hierarchy requires review.'});}}
    let i=0;
    const legacy=(owner,bucket,prefix,label,enabled)=>{
      const profile=profiles.find(p=>p.type==='cloudflare-r2'&&p.accountId===owner.accountId&&p.bucketName===bucket&&p.workerUrl&&p.token);
      add({id:(()=>{let id;do{id='migrated-'+(++i);}while(config.destinations.some(d=>d.id===id));return id;})(),profileId:profile?.id||owner.id,accountId:owner.accountId,bucketName:bucket,prefix:prefix||'',label:String(label||prefix?.split('/').at(-1)||bucket||'Destination'),enabled:enabled!==false,parentId:null},'legacy');
    };
    for(const p of [...profiles].sort((a,b)=>(a.menuOrder??999)-(b.menuOrder??999))){
      if(p.type!=='cloudflare-r2'||p.explorerManaged)continue;
      const shortcuts=[{bucketName:p.simpleBucketName||p.bucketName,prefix:p.defaultPrefix,label:p.menuLabel||p.name,enabled:p.simplePrimaryEnabled!==false,order:p.simplePrimaryOrder??999999},...(p.simpleOptions||[])];
      for(const d of shortcuts.sort((a,b)=>(a.order??999999)-(b.order??999999)))legacy(p,d.bucketName||p.bucketName,d.prefix,d.label,p.showInContextMenu!==false&&d.enabled!==false);
      try{for(const d of globalThis.RedownNestedLocations.destinations({...p.nestedMenu,enabled:true}))legacy(p,d.bucketName,d.prefix,d.name,p.showInContextMenu!==false&&p.nestedMenu?.enabled===true);}
      catch{recovery.push({origin:'legacy-nested',record:p.nestedMenu,reason:'Saved folder hierarchy requires review.'});}
      const walk=nodes=>{for(const n of nodes||[]){legacy(p,p.bucketName,n.prefix,n.label||n.name,p.showInContextMenu!==false&&n.enabled!==false);walk(n.children);}};
      if(!p.nestedMenu)walk(p.menuTree);
    }
    return {config,recovery};
  }
  globalThis.RedownRightClickV3=Object.freeze({empty,migrate,validate,entries,resolve,remove,presentation,validatePresentation,emptyScopes,validateScopes,roots,inventoryKey,fresh,discover,project,limits});
})();
