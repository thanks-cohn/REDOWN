/* Preserved release menu engine plus engine-only pre-v1 tree fallback.
 * No setup view, editor state, migration writer or provider mutation lives here. */
(() => {
  'use strict';
  const contexts=['link','image','video','audio','page'];
  const oldTree=(p,mode)=>mode==='nested'&&p.type==='cloudflare-r2'&&!p.explorerManaged&&p.showInContextMenu!==false&&!p.nestedMenu&&!(p.menuConfigVersion>=1)&&Array.isArray(p.menuTree)&&p.menuTree.length;
  const segment=id=>String(id||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  function entries(profiles,mode,root){
    const old=profiles.filter(p=>oldTree(p,mode));
    const plan=RedownNestedLocations.menuEntries(profiles.filter(p=>!old.includes(p)),mode,root);
    for(const p of old){
      if(!p.workerUrl||!p.token)continue;
      const parent='preset:'+p.id;plan.push({id:parent,parentId:root,title:p.menuLabel||p.name||p.bucketName,contexts});
      const walk=(nodes,parentId,path)=>{for(const n of nodes){const part=segment(n.id);if(!part)throw Error('Legacy tree has a missing ID. Use V3 Setup.');const next=[...path,part],id='tree:'+p.id+':'+next.join('.');plan.push({id,parentId,title:n.label||n.name||n.prefix||'Destination',contexts});if(n.children?.length)walk(n.children,id,next);}};
      walk(p.menuTree,parent,[]);
    }
    return plan;
  }
  function resolve(id,profiles,mode){
    const current=RedownDestinationConfig.resolve(id,profiles,mode);if(current)return current;
    const match=String(id).match(/^tree:([^:]+):(.+)$/);if(!match)return null;
    const p=profiles.find(p=>p.id===match[1]&&oldTree(p,mode)&&p.workerUrl&&p.token);if(!p)return null;
    let nodes=p.menuTree,node;
    for(const part of match[2].split('.')){const found=nodes.filter(n=>segment(n.id)===part);if(found.length!==1)return null;node=found[0];nodes=node.children||[];}
    if(!node||nodes.length)return null;
    const prefix=node.prefix??'';try{RedownDestinationConfig.prefix(prefix);}catch{return null;}
    return {profile:p,owner:p,prefix};
  }
  globalThis.RedownRightClickLegacy=Object.freeze({entries,resolve});
})();
