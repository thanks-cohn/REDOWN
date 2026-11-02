/* Declaration only. The existing shared composer/writer owns registration. */
(() => {
  'use strict';
  const namespace='provider:dropbox',owns=id=>id===namespace||String(id).startsWith(namespace+':');
  function fragment(s={},root){
    const contexts=['link','image','video','audio','page'];
    const ready=s.phase==='connected'&&s.rootReady===true&&s.root==='/'&&/^dbid:[\w-]+$/.test(s.accountId||'')&&!!s.connectionId;
    const entries=[{id:namespace,parentId:root,title:'Dropbox',contexts}];
    if(!ready)entries.push({id:namespace+':connect',parentId:namespace,title:s.phase==='connecting'?'Connecting to Dropbox…':s.phase==='reconnect'?'Reconnect Dropbox…':'Log in to Dropbox…',enabled:s.phase!=='connecting',contexts});
    return {providerId:'dropbox',entries};
  }
  const revision=s=>JSON.stringify([s?.phase,s?.accountId,s?.connectionId,s?.rootReady,s?.root].map(v=>String(v??'').slice(0,160)));
  const obsolete=ids=>['provider:dropbox:connect'].filter(id=>!ids.has(id));
  globalThis.RedownDropboxMenu={fragment,owns,revision,obsolete};
})();
