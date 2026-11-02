/* Pure provider declaration and shared administrative boundary. No native API. */
(() => {
  'use strict';
  const namespace='provider:google-drive';
  const owns=id=>id===namespace||String(id).startsWith(namespace+':');
  function fragment(state={},root){
    const contexts=['link','image','video','audio','page'];
    return {providerId:'google-drive',entries:[
      {id:namespace,parentId:root,title:'Google Drive',enabled:state.phase!=='connecting',contexts}
    ]};
  }

  // Invalid additive fragments never invalidate or remove the original plan.
  function compose(original,provider,root,sibling){
    const ns=sibling?'provider:dropbox':namespace;
    const owned=sibling?(id=>id===ns||String(id).startsWith(ns+':')):owns;
    try{
      if(provider.providerId!==(sibling?'dropbox':'google-drive')||!Array.isArray(provider.entries)||provider.entries.length!==1||original.length+provider.entries.length>1000)throw Error('capacity');
      if(sibling&&(!original.some(e=>e.id==='provider:google-drive')||provider.entries.some(e=>e.id!==ns)))throw Error('action');
      const seen=new Set(original.map(e=>e.id));
      for(const [i,e] of provider.entries.entries()){
        if(!owned(e.id)||seen.has(e.id)||!seen.has(e.parentId)||i===0&&(e.id!==ns||e.parentId!==root)||i>0&&!owned(e.parentId)||e.parentId===root&&i>0)throw Error('ownership');
        seen.add(e.id);
      }
      if(!provider.entries.length)throw Error('empty');
      const result=original.slice();
      // Insert after the complete original Cloudflare subtree, before controls.
      const cloud=result.findIndex(e=>e.id===(sibling?'provider:google-drive':'v3:provider:cloudflare'));
      let at=cloud>=0?cloud+1:result.findIndex(e=>e.id==='redown-manage'||e.id==='redown-mode-separator');
      if(cloud>=0){const descendants=new Set([result[cloud].id]);while(at<result.length&&descendants.has(result[at].parentId)){descendants.add(result[at].id);at++;}}
      if(at<0)at=result.length;
      result.splice(at,0,...provider.entries);return result;
    }catch{return original;}
  }
  const obsolete=ids=>[namespace+':connect',namespace+':save-redown'].filter(id=>!ids.has(id));
  const revision=s=>[String(s?.phase||'disconnected').slice(0,32),String(s?.folderId||'').slice(0,200)].join(':');
  globalThis.RedownGoogleDriveMenu={owns,fragment,compose,composeSibling:(original,provider,root)=>compose(original,provider,root,true),revision,obsolete};
})();
