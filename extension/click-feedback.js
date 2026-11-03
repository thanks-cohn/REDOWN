/* Interaction metadata only. Never consult credentials or provider state. */
(() => {
  'use strict';
  let preferences={shelfColorScheme:'porcelain',click2CloudPulseDestination:'shelf'};
  const changed=new Set();
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    for(const key of Object.keys(preferences))if(changes[key]){
      changed.add(key);preferences[key]=changes[key].newValue;
    }
  });
  void chrome.storage.local.get(Object.keys(preferences)).then(data=>{
    for(const key of Object.keys(preferences))if(!changed.has(key)&&data[key]!==undefined)preferences[key]=data[key];
  }).catch(()=>{});
  function providerFor(id){
    if(id==='provider:google-drive')return 'google';
    if(id==='provider:dropbox')return 'dropbox';
    if(id==='provider:onedrive')return 'onedrive';
    if(typeof id==='string'&&/^(v3:|quick:|simple-option:|nested:|tree:)/.test(id)&&
       !/:(setup|default-setup|more|separator)$/.test(id))return 'cloudflare';
    return null;
  }
  const pending=new Set();
  chrome.webNavigation.onCommitted.addListener(details=>{
    if(details.frameId===0)for(const run of pending)if(run.tabId===details.tabId)run.cancelled=true;
  });
  chrome.tabs.onRemoved.addListener(tabId=>{
    for(const run of pending)if(run.tabId===tabId)run.cancelled=true;
  });
  globalThis.RedownClickFeedback={providerFor,preferences:()=>({...preferences}),
    begin(tabId){const run={tabId,cancelled:false};pending.add(run);return run;},
    end(run){pending.delete(run);return !run.cancelled;}};
})();
