/* Pure OneDrive declaration. Only background.js writes native menus. */
(() => {
  'use strict';
  const namespace='provider:onedrive';
  const owns=id=>typeof id==='string'&&(id===namespace||id.startsWith(namespace+':'));
  const contexts=['link','image','video','audio','page'];
  function fragment(state={},root){
    // OAuth feasibility is deliberately not inferred from a persisted connected flag.
    const entries=[{id:namespace,parentId:root,title:'OneDrive',contexts}];
    entries.push({id:namespace+':connect',parentId:namespace,title:state.phase==='connecting'?'Checking OneDrive…':'Log in to OneDrive…',enabled:state.phase!=='connecting',contexts});
    return {providerId:'onedrive',entries};
  }
  function compose(original,provider,root){
    try{
      if(provider?.providerId!=='onedrive'||!Array.isArray(provider.entries)||provider.entries.length!==2||original.length+2>1000)throw Error('capacity');
      const seen=new Set(original.map(e=>e.id));
      for(const [index,e] of provider.entries.entries()){
        if(e.id!==(index?namespace+':connect':namespace)||seen.has(e.id)||e.parentId!==(index?namespace:root)||!seen.has(e.parentId)||typeof e.title!=='string'||!e.title.trim()||e.type&&e.type!=='normal'||e.enabled!==undefined&&typeof e.enabled!=='boolean'||JSON.stringify(e.contexts)!==JSON.stringify(contexts)||Object.keys(e).some(k=>!['id','parentId','title','contexts','enabled','type'].includes(k)))throw Error('ownership');
        seen.add(e.id);
      }
      const result=original.slice(),start=result.findIndex(e=>e.id==='provider:dropbox');
      if(start<0)throw Error('missing predecessor');
      const descendants=new Set(['provider:dropbox']);let at=start+1;
      while(at<result.length&&descendants.has(result[at].parentId)){descendants.add(result[at].id);at++;}
      result.splice(at,0,...provider.entries);
      return {entries:result,error:null};
    }catch{return {entries:original,error:'ONEDRIVE_MENU_FRAGMENT_INVALID'};}
  }
  const revision=s=>JSON.stringify([String(s?.phase||'disconnected').slice(0,32)]);
  const obsolete=ids=>[namespace+':connect'].filter(id=>!ids.has(id));
  globalThis.RedownOneDriveMenu={fragment,compose,owns,revision,obsolete};
})();
