/* Legacy runtime hierarchy and menu projection; no setup state or migration. */
(() => {
  function name(value) {
    const clean=String(value || '').trim();
    if(!clean || clean==='.' || clean==='..' || /[\\/\x00-\x1f]/.test(clean)) throw new Error('Enter one folder name, without slashes.');
    return clean;
  }
  function path(parent,child) { return [String(parent || '').replace(/^\/+|\/+$/g,''),name(child)].filter(Boolean).join('/'); }
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
  globalThis.RedownNestedLocations={name,path,destinations,nestedEntries,menuEntries,menuMode};
})();
