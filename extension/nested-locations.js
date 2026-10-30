/* Nested menu locations share the same hierarchy in settings and background. */
(() => {
  function name(value) {
    const clean=String(value || '').trim();
    if(!clean || clean==='.' || clean==='..' || /[\\/\x00-\x1f]/.test(clean)) throw new Error('Enter one folder name, without slashes.');
    return clean;
  }
  function path(parent,child) { return [String(parent || '').replace(/^\/+|\/+$/g,''),name(child)].filter(Boolean).join('/'); }
  function blank() { return {id:crypto.randomUUID(),name:'',ready:false,children:[]}; }
  function invalidate(node) {
    node.ready=false;node.needsSelection=true;
    for(const child of node.children || []) invalidate(child);
  }
  function setLocation(node,value) {
    if(node.name!==value) for(const child of node.children || []) invalidate(child);
    node.name=value; node.ready=true;delete node.needsSelection;
  }
  function fromLegacy(profile) {
    const roots=[];
    function convert(items,parent='') {
      return (items || []).map(old => {
        const full=String(old.prefix || '').trim().replace(/^\/+|\/+$/g,'');
        // Preserve explicit descendant paths; old bare names become actual children.
        const relative=parent && full.startsWith(parent+'/') ? full.slice(parent.length+1) : full;
        const segments=relative.split('/').filter(Boolean);
        if(!segments.length) return {...blank(),previousLabel:old.label || '',children:convert(old.children,parent)};
        let first=null,last=null,current=parent;
        for(const segment of segments) {
          const entry={...blank(),name:segment,previousLabel:old.label || ''};
          if(last)last.children.push(entry);else first=entry;
          last=entry; current=path(current,segment);
        }
        last.children=convert(old.children,current);
        return first;
      });
    }
    if(profile.bucketName && profile.menuTree?.length) roots.push({id:crypto.randomUUID(),bucketName:profile.bucketName,ready:false,children:convert(profile.menuTree)});
    return {version:1,enabled:Boolean(profile.menuTree?.length),roots,imported:Boolean(profile.menuTree?.length)};
  }
  // Versioned draft migration. An existing model, including empty roots, wins.
  function initialize(profile) {
    if(!profile.nestedMenu)profile.nestedMenu=profile.menuConfigVersion>=1
      ? {version:1,enabled:false,roots:[]} : fromLegacy(profile);
    profile.menuConfigVersion=1;
    return profile.nestedMenu;
  }
  function destinations(model) {
    if(!model?.enabled)return [];
    const result=[];
    function walk(nodes,root,parent,ids) {
      for(const node of nodes || []) {
        if(!node.ready || !node.name)continue;
        const prefix=path(parent,node.name),chain=[...ids,node.id];
        result.push({rootId:root.id,bucketName:root.bucketName,nodeId:node.id,ids:chain,prefix,name:node.label||node.name});
        walk(node.children,root,prefix,chain);
      }
    }
    for(const root of model.roots || []) {
      if(!root.ready || !root.bucketName)continue;
      result.push({rootId:root.id,bucketName:root.bucketName,nodeId:root.id,ids:[],prefix:'',name:root.label||root.bucketName});
      walk(root.children,root,'',[]);
    }
    return result;
  }
  // Shared parent-first presentation plan for preview and native Chrome.
  function nestedEntries(profile,parentId) {
    const locations=destinations(profile.nestedMenu),contexts=['link','image','video','audio','page'];
    return locations.flatMap(item=>{
      const id=`nested:${profile.id}:${item.rootId}:${item.nodeId}`;
      const parent=item.ids.length ? `nested:${profile.id}:${item.rootId}:${item.ids.at(-2)||item.rootId}` : parentId;
      const entry={id,parentId:parent,title:item.name,contexts};
      const hasChildren=locations.some(child=>child.rootId===item.rootId && child.ids.length===item.ids.length+1 && (item.ids.length===0 || child.ids.at(-2)===item.nodeId));
      return hasChildren?[entry,{id:id+':send',parentId:id,title:'Send here',contexts}]:[entry];
    });
  }
  function menuEntries(profiles,mode,parentId) {
    const selected=profiles.filter(p=>p.type==='cloudflare-r2'&&!p.explorerManaged &&
      (mode==='nested'?p.nestedMenu?.enabled:p.showInContextMenu!==false))
      .slice().sort((a,b)=>(a.menuOrder??999)-(b.menuOrder??999));
    if(mode==='nested')return selected.flatMap(p=>nestedEntries(p,parentId));
    const result=[],contexts=['link','image','video','audio','page'];
    const label=(value,prefix,bucket)=>String(value||'').trim()||String(prefix||'').split('/').filter(Boolean).at(-1)||bucket||'Destination';
    for(const p of selected){
      if(p.simplePrimaryEnabled!==false)result.push({id:`quick:${p.id}`,parentId,title:label(p.menuLabel,p.defaultPrefix,p.simpleBucketName||p.bucketName),contexts,order:p.simplePrimaryOrder??999999});
      for(const item of p.simpleOptions||[])if(item?.id&&typeof item.prefix==='string')result.push({id:`simple-option:${p.id}:${item.id}`,parentId,title:label(item.label,item.prefix,item.bucketName||p.bucketName),contexts,order:item.order??999999});
    }
    return result.sort((a,b)=>a.order-b.order).map(({order,...entry})=>entry);
  }
  function menuMode(value,profiles=[]){
    if(value==='simple' || value==='nested')return value;
    // Upgrade existing nested users without showing both modes at once.
    return profiles.some(profile=>profile.type==='cloudflare-r2' && !profile.explorerManaged &&
      profile.nestedMenu?.enabled) ? 'nested' : 'simple';
  }
  globalThis.RedownNestedLocations={name,path,blank,invalidate,setLocation,fromLegacy,initialize,destinations,nestedEntries,menuEntries,menuMode};
})();
