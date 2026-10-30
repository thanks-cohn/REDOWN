/* Menu-only projection: profiles remain the single destination store. */
(() => {
  const fields=['menuConfigVersion','menuLabel','defaultPrefix','simpleBucketName','simpleOptions','simplePrimaryEnabled','simplePrimaryOrder','explorerManaged','showInContextMenu','menuOrder','nestedMenu'];
  function project(profiles){return profiles.filter(p=>p.type==='cloudflare-r2').map(p=>({id:p.id,accountId:p.accountId,bucketName:p.bucketName,...Object.fromEntries(fields.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]))}));}
  function signature(profiles,mode){return JSON.stringify([mode,project(profiles)]);}
  function prefix(value){if(typeof value!=='string'||value.length>1024||/[\\\x00-\x1f]/.test(value)||value.split('/').some(p=>p==='.'||p==='..'))throw Error('Choose a valid folder path.');return value;}
  function validate(profiles,mode){
    let count=0;const ids=new Set(),profileIds=new Set();
    for(const p of profiles){if(!p.id||profileIds.has(p.id))throw Error('Duplicate or missing storage profile identifier. Repair profiles before saving.');profileIds.add(p.id);}
    for(const p of profiles.filter(p=>p.type==='cloudflare-r2')){
      const prepared=bucket=>profiles.some(q=>q.type==='cloudflare-r2'&&q.accountId===p.accountId&&q.bucketName===bucket&&q.workerUrl&&q.token);
      const label=value=>{if(typeof value!=='string'||value.trim().length>60||/[\x00-\x1f]/.test(value))throw Error('Menu labels must be at most 60 characters.');};
      if(mode!=='nested'&&p.showInContextMenu!==false&&!p.explorerManaged){
        if(p.simplePrimaryEnabled!==false){prefix(p.defaultPrefix||'');label(p.menuLabel||'');if(!prepared(p.simpleBucketName||p.bucketName))throw Error('Prepare the selected bucket explicitly before saving.');count++;}
        for(const item of p.simpleOptions||[]){if(!item.id||ids.has(item.id))throw Error('Duplicate destination identifier. Reload the editor.');ids.add(item.id);prefix(item.prefix);label(item.label||'');if(!prepared(item.bucketName||p.bucketName))throw Error('Prepare the selected bucket explicitly before saving.');count++;}
      }
      const walk=(nodes,depth)=>{if(nodes?.length&&depth>8)throw Error('Nested menus support up to eight folder levels.');for(const node of nodes||[]){if(!node.id||ids.has(node.id))throw Error('Duplicate nested identifier.');ids.add(node.id);label(node.label||'');if(node.name)RedownNestedLocations.name(node.name);if(!node.ready||!node.name)throw Error('Choose or create every active Nested folder before saving.');count++;walk(node.children,depth+1);}};
      for(const root of mode==='simple'||!p.nestedMenu?.enabled?[]:p.nestedMenu.roots||[]){if(!root.id||ids.has(root.id))throw Error('Duplicate nested root identifier.');ids.add(root.id);if(!root.ready||!root.bucketName)throw Error('Choose a bucket for every active Nested location before saving.');if(root.ready&&!prepared(root.bucketName))throw Error('Prepare the nested bucket explicitly before saving.');label(root.label||'');count++;walk(root.children,1);}
    }
    if(count>500)throw Error('This editor supports up to 500 menu locations in the active layout.');
  }
  function resolve(menuId,profiles,mode){
    const id=String(menuId),p=profiles.find(p=>p.type==='cloudflare-r2'&&p.id===id.split(':')[1]);
    if(!p||p.explorerManaged)return null;
    let bucket,prefixValue;
    if(mode==='simple'&&p.showInContextMenu!==false){
      if(id===`quick:${p.id}`&&p.simplePrimaryEnabled!==false){bucket=p.simpleBucketName||p.bucketName;prefixValue=p.defaultPrefix;}
      else {const item=(p.simpleOptions||[]).find(x=>id===`simple-option:${p.id}:${x.id}`);if(!item)return null;bucket=item.bucketName||p.bucketName;prefixValue=item.prefix;}
    }else if(mode==='nested'){
      const item=RedownNestedLocations.destinations(p.nestedMenu).find(x=>id===`nested:${p.id}:${x.rootId}:${x.nodeId}`||id===`nested:${p.id}:${x.rootId}:${x.nodeId}:send`);
      if(!item)return null;bucket=item.bucketName;prefixValue=item.prefix;
    }else return null;
    const target=profiles.find(q=>q.type==='cloudflare-r2'&&q.accountId===p.accountId&&q.bucketName===bucket&&q.workerUrl&&q.token);
    if(!target)return null;
    try{prefix(prefixValue||'');}catch{return null;}
    return {profile:target,owner:p,prefix:prefixValue||''};
  }
  globalThis.RedownDestinationConfig={fields,project,signature,prefix,validate,resolve};
})();
