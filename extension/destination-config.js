/* Menu-only projection: profiles remain the single destination store. */
(() => {
  const fields=['menuLabel','defaultPrefix','simpleBucketName','simpleOptions','simplePrimaryEnabled','simplePrimaryOrder','explorerManaged','showInContextMenu','menuOrder','nestedMenu'];
  function project(profiles){return profiles.filter(p=>p.type==='cloudflare-r2').map(p=>({id:p.id,accountId:p.accountId,bucketName:p.bucketName,...Object.fromEntries(fields.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]))}));}
  function signature(profiles,mode){return JSON.stringify([mode,project(profiles)]);}
  function prefix(value){if(typeof value!=='string'||value.length>1024||/[\\\x00-\x1f]/.test(value)||value.split('/').some(p=>p==='.'||p==='..'))throw Error('Choose a valid folder path.');return value;}
  function validate(profiles,mode){
    let count=0;const ids=new Set();
    for(const p of profiles.filter(p=>p.type==='cloudflare-r2')){
      const prepared=bucket=>profiles.some(q=>q.type==='cloudflare-r2'&&q.accountId===p.accountId&&q.bucketName===bucket&&q.workerUrl&&q.token);
      const label=value=>{if(typeof value!=='string'||value.trim().length>60||/[\x00-\x1f]/.test(value))throw Error('Menu labels must be at most 60 characters.');};
      if(mode!=='nested'&&p.showInContextMenu!==false&&!p.explorerManaged){
        if(p.simplePrimaryEnabled!==false){prefix(p.defaultPrefix||'');label(p.menuLabel||'');if(!prepared(p.simpleBucketName||p.bucketName))throw Error('Prepare the selected bucket explicitly before saving.');count++;}
        for(const item of p.simpleOptions||[]){if(!item.id||ids.has(item.id))throw Error('Duplicate destination identifier. Reload the editor.');ids.add(item.id);prefix(item.prefix);label(item.label||'');if(!prepared(item.bucketName||p.bucketName))throw Error('Prepare the selected bucket explicitly before saving.');count++;}
      }
      const walk=(nodes,depth)=>{if(nodes?.length&&depth>8)throw Error('Nested menus support up to eight folder levels.');for(const node of nodes||[]){if(!node.id||ids.has(node.id))throw Error('Duplicate nested identifier.');ids.add(node.id);label(node.label||'');if(node.name)RedownNestedLocations.name(node.name);if(node.ready&&!node.name)throw Error('Choose a folder for each ready destination.');count++;walk(node.children,depth+1);}};
      for(const root of mode==='simple'||!p.nestedMenu?.enabled?[]:p.nestedMenu.roots||[]){if(!root.id||ids.has(root.id))throw Error('Duplicate nested root identifier.');ids.add(root.id);if(root.ready&&!prepared(root.bucketName))throw Error('Prepare the nested bucket explicitly before saving.');label(root.label||'');count++;walk(root.children,1);}
    }
    if(count>500)throw Error('This editor supports up to 500 menu locations in the active layout.');
  }
  globalThis.RedownDestinationConfig={fields,project,signature,prefix,validate};
})();
