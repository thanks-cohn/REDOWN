/* Declaration only. The existing shared composer/writer owns registration. */
(() => {
  'use strict';
  const namespace='provider:dropbox',owns=id=>id===namespace||String(id).startsWith(namespace+':');
  function fragment(s={},root){
    const contexts=['link','image','video','audio','page'];
    const entries=[{id:namespace,parentId:root,title:'Dropbox',enabled:s.phase!=='connecting',contexts}];
    return {providerId:'dropbox',entries};
  }
  const revision=s=>JSON.stringify([s?.phase,s?.accountId,s?.connectionId,s?.rootReady,s?.root].map(v=>String(v??'').slice(0,160)));
  const obsolete=ids=>['provider:dropbox:connect'].filter(id=>!ids.has(id));
  globalThis.RedownDropboxMenu={fragment,owns,revision,obsolete};
})();
