// Shelf-first toolbar. Opening is independent of storage, menus and providers.
let toolbarAttempt=null,toolbarGeneration=0,toolbarTarget=null,toolbarPhase='idle';
let entryEvidenceQueue=Promise.resolve();
function entryEvidence(component,operation,stage,code,recovery,attemptId){
  const event={schemaVersion:1,at:new Date().toISOString(),component,operation,stage,code,
    summary:code==='SHELF_UNAVAILABLE'?'Shelf did not become available.':code==='ACCESS_BLOCKED'?'Chrome blocked recovery.':code==='MENU_REGISTRATION_FAILED'?'Native menu registration did not complete.':code,
    recovery:{attempted:!!recovery,status:recovery||'not-needed'},
    attemptId:attemptId||crypto.randomUUID(),version:chrome.runtime.getManifest().version};
  entryEvidenceQueue=entryEvidenceQueue.catch(()=>{}).then(async()=>{
    const data=await chrome.storage.local.get(['entryPointEvidence','rightClickV3']);
    if(component==='context-menu')event.configurationRevision=data.rightClickV3?.revision??null;
    await chrome.storage.local.set({entryPointEvidence:[...(Array.isArray(data.entryPointEvidence)?data.entryPointEvidence:[]).slice(-63),event]});
  }).catch(()=>console.warn('REDOWN local entry-point evidence unavailable'));
}
// One authority: no Chrome-managed parallel panel opening and no detached surfaces.
let toolbarConfiguration=Promise.resolve();
function applyToolbarOpenMode(clearTabs=false){
  const operation=toolbarConfiguration.catch(()=>{}).then(async()=>{
    try{await boundedEntry(chrome.sidePanel?.setPanelBehavior?.({openPanelOnActionClick:false}),1000);}
    catch{entryEvidence('toolbar','configure','behavior','PANEL_BEHAVIOR_FAILED',false);}
    try{await boundedEntry(chrome.sidePanel?.setOptions({path:'shelf.html',enabled:true}),1000);}
    catch{entryEvidence('toolbar','configure','panel','SHELF_CONFIGURATION_FAILED',false);}
    let mode='shelf';
    try{const data=await boundedEntry(chrome.storage.local.get('toolbarOpenMode'),500);mode=data.toolbarOpenMode==='popup'?'popup':'shelf';}
    catch{entryEvidence('toolbar','configure','storage','PREFERENCE_STORAGE_UNAVAILABLE',false);}
    if(clearTabs&&chrome.tabs.query){
      for(const tab of await boundedEntry(chrome.tabs.query({}),1000)){
        if(!Number.isInteger(tab.id))continue;
        const existing=await boundedEntry(chrome.action.getPopup({tabId:tab.id}),1000);
        if(clearTabs!=='preference'&&existing?.startsWith(chrome.runtime.getURL('popup.html')+'?recovery='))continue;
        await boundedEntry(chrome.action.setPopup({tabId:tab.id,popup:mode==='popup'?'popup.html':''}),1000);
      }
    }
    await boundedEntry(chrome.action.setPopup({popup:mode==='popup'?'popup.html':''}),1000);
  });
  toolbarConfiguration=operation;return operation;
}
function boundedEntry(operation,ms=150){
  let timer;
  return Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Entry operation timed out')),ms);})]).finally(()=>clearTimeout(timer));
}
async function verifyShelf(windowId){
  if(!chrome.runtime.getContexts)return false;
  for(let i=0;i<10;i++){
    try{
      const contexts=await boundedEntry(chrome.runtime.getContexts({contextTypes:['SIDE_PANEL']}));
      if(contexts.some(c=>c.windowId===windowId)){
        const result=await boundedEntry(chrome.runtime.sendMessage({type:'redownShelfReady',windowId}));
        if(result?.ready)return true;
      }
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  return false;
}
function launchIndication(windowId,code,title,attemptId){
  entryEvidence('toolbar','open','chrome',code,false,attemptId);
  // Native indication only; no automatic alternate surface on an ambiguous open.
  void chrome.action.setTitle({title}).catch(()=>{});
  void chrome.action.setBadgeText?.({text:'!'}).catch(()=>{});
}
async function recoverAttached(tab,attemptId,generation){
  const current=()=>generation===toolbarGeneration;
  entryEvidence('toolbar','open','shelf','SHELF_UNAVAILABLE','requested',attemptId);
  // Only settled rejection / unavailable API reaches here: no pending open can
  // later race the popup. On supported Chrome also close this window's panel.
  if(chrome.sidePanel?.close){
    try{await boundedEntry(chrome.sidePanel.close({windowId:tab.windowId}),1000);}
    catch{launchIndication(tab.windowId,'SHELF_CLOSE_UNCONFIRMED','REDOWN could not switch safely. Retry the Shelf.',attemptId);return;}
  }
  if(!Number.isInteger(tab.id)){
    launchIndication(tab.windowId,'ATTACHED_POPUP_TARGET_UNAVAILABLE','REDOWN could not target its attached popup. Retry on a browser tab.',attemptId);return;
  }
  try{
    if(chrome.tabs.query){
      const active=await boundedEntry(chrome.tabs.query({active:true,windowId:tab.windowId}),1000);
      if(!active.some(t=>t.id===tab.id)){
        entryEvidence('toolbar','open','popup-target','LAUNCH_SUPERSEDED',false,attemptId);return;
      }
    }
    if(!current())return;
    const popup='popup.html?recovery=1&tabId='+tab.id+'&windowId='+tab.windowId;
    const arm=toolbarConfiguration.catch(()=>{}).then(async()=>{
    if(!current())return;
    await boundedEntry(chrome.action.setPopup({tabId:tab.id,popup}),1000);
    if(!current())return;
    // setPopup only arms the NEXT click. openPopup is the separate best-effort
    // same-click request; support/policy/gesture rejection is never hidden.
    try{
      if(!chrome.action.openPopup)throw Error('unsupported');
      await boundedEntry(chrome.action.openPopup({windowId:tab.windowId}),1000);
      entryEvidence('popup','recover','native-action','ATTACHED_POPUP_ACCEPTED','accepted',attemptId);
    }catch{
      entryEvidence('popup','recover','native-action','ATTACHED_POPUP_NEXT_CLICK','armed',attemptId);
      await chrome.action.setTitle({tabId:tab.id,title:'REDOWN Shelf could not open. Click once more for the attached recovery panel.'});
      await chrome.action.setBadgeText?.({tabId:tab.id,text:'!'});
    }
    });
    toolbarConfiguration=arm;await arm;
  }catch{
    launchIndication(tab.windowId,'ATTACHED_POPUP_BLOCKED','Chrome blocked REDOWN recovery. Reload REDOWN in Chrome Extensions.',attemptId);
  }
}
function openToolbarInterface(tab){
  const target=String(tab.windowId)+':'+String(tab.id);
  if(toolbarAttempt&&(toolbarTarget===target||toolbarPhase==='recovery'))return toolbarAttempt;
  toolbarTarget=target;toolbarPhase='shelf';
  const attemptId=crypto.randomUUID(),generation=++toolbarGeneration;
  let opening;
  // Synchronous call inside Chrome's delivered gesture; no storage or provider wait.
  try{opening=Promise.resolve(chrome.sidePanel.open({windowId:tab.windowId}));}
  catch(error){opening=Promise.reject(error);}
  let deadline;
  // A deadline is an indication, NOT permission to launch a second surface.
  deadline=setTimeout(()=>{
    if(generation!==toolbarGeneration)return;
    ++toolbarGeneration;toolbarAttempt=null;
    launchIndication(tab.windowId,'SHELF_OPEN_PENDING','REDOWN is waiting for Chrome. Click again to retry Shelf; no second panel was opened.',attemptId);
  },2500);
  toolbarAttempt=opening.then(async()=>{
    clearTimeout(deadline);
    if(generation!==toolbarGeneration)return;
    const ready=await verifyShelf(tab.windowId);
    if(generation!==toolbarGeneration)return;
    entryEvidence('toolbar','open','shelf',ready?'SHELF_READY':'SHELF_API_ACCEPTED',false,attemptId);
    if(!ready&&chrome.runtime.getContexts)launchIndication(tab.windowId,'SHELF_READINESS_UNKNOWN','Chrome accepted the Shelf request; local readiness is unconfirmed. No second panel was opened.',attemptId);
    else{
      void chrome.action.setBadgeText?.({text:''}).catch(()=>{});
      void chrome.action.setTitle({title:chrome.runtime.getManifest().name||'REDOWN'}).catch(()=>{});
    }
  },()=>{clearTimeout(deadline);if(generation===toolbarGeneration){toolbarPhase='recovery';return recoverAttached(tab,attemptId,generation);}}).catch(()=>{
    launchIndication(tab.windowId,'LAUNCH_BLOCKED','Chrome blocked REDOWN. Reload the extension in Chrome Extensions.',attemptId);
  }).finally(()=>{if(generation===toolbarGeneration){toolbarAttempt=null;toolbarTarget=null;toolbarPhase='idle';}});
  return toolbarAttempt;
}
chrome.action.onClicked.addListener(tab=>{void openToolbarInterface(tab);});
chrome.runtime.onInstalled.addListener(()=>{void applyToolbarOpenMode(true).catch(console.error);});
chrome.runtime.onStartup.addListener(()=>{void applyToolbarOpenMode(true).catch(console.error);});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local'&&changes.toolbarOpenMode){++toolbarGeneration;toolbarAttempt=null;void applyToolbarOpenMode('preference').catch(console.error);}
});
// Worker activation must not erase a tab's armed next-click recovery override.
void applyToolbarOpenMode().catch(console.error);
