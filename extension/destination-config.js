/* Legacy runtime field boundary and resolver. No setup projection or draft writer. */
(() => {
  const fields=['menuConfigVersion','menuLabel','defaultPrefix','simpleBucketName','simpleOptions','simplePrimaryEnabled','simplePrimaryOrder','explorerManaged','showInContextMenu','menuOrder','nestedMenu'];
  function prefix(value){if(typeof value!=='string'||value.length>1024||/[\\\x00-\x1f]/.test(value)||value.split('/').some(p=>p==='.'||p==='..'))throw Error('Choose a valid folder path.');return value;}
  function resolve(menuId,profiles,mode){
    const id=String(menuId),p=profiles.find(p=>p.type==='cloudflare-r2'&&p.id===id.split(':')[1]);
    if(!p||p.explorerManaged)return null;
    let bucket,prefixValue;
    if(mode==='simple'&&p.showInContextMenu!==false){
      if(id===`quick:${p.id}`&&p.simplePrimaryEnabled!==false){bucket=p.simpleBucketName||p.bucketName;prefixValue=p.defaultPrefix;}
      else {const item=(p.simpleOptions||[]).find(x=>id===`simple-option:${p.id}:${x.id}`);if(!item)return null;bucket=item.bucketName||p.bucketName;prefixValue=item.prefix;}
    }else if(mode==='nested'){
      const locations=RedownNestedLocations.destinations(p.nestedMenu);
      const item=locations.find(x=>id===`nested:${p.id}:${x.rootId}:${x.nodeId}`||id===`nested:${p.id}:${x.rootId}:${x.nodeId}:send`);
      if(!item)return null;
      if(id.endsWith(':send')&&!locations.some(child=>child.rootId===item.rootId&&child.ids.length===item.ids.length+1&&(item.ids.length===0||child.ids.at(-2)===item.nodeId)))return null;
      bucket=item.bucketName;prefixValue=item.prefix;
    }else return null;
    const target=profiles.find(q=>q.type==='cloudflare-r2'&&q.accountId===p.accountId&&q.bucketName===bucket&&q.workerUrl&&q.token);
    if(!target)return null;
    try{prefix(prefixValue||'');}catch{return null;}
    return {profile:target,owner:p,prefix:prefixValue||''};
  }
  globalThis.RedownDestinationConfig={fields,prefix,resolve};
})();
