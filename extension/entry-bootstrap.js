// Shelf-first toolbar. Opening is independent of storage, menus and providers.
let toolbarAttempt=null;
let recoveryWindowId=null;
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
async function applyToolbarOpenMode(){
  // Clear persistent action popup before any storage read (including failed reads).
  await chrome.action.setPopup({popup:''});
  try{await chrome.sidePanel.setOptions({path:'shelf.html',enabled:true});}
  catch{entryEvidence('toolbar','configure','panel','SHELF_CONFIGURATION_FAILED',false);}
  try{
    const data=await chrome.storage.local.get('toolbarOpenMode');
    if(data.toolbarOpenMode!=='shelf')await chrome.storage.local.set({toolbarOpenMode:'shelf'});
  }catch{entryEvidence('toolbar','migrate','storage','PREFERENCE_STORAGE_UNAVAILABLE',false);}
}
function boundedEntry(operation){
  let timer;
  return Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Entry operation timed out')),150);})]).finally(()=>clearTimeout(timer));
}
async function verifyShelf(windowId){
  // Old Chrome cannot expose contexts: API acceptance is the only evidence.
  if(!chrome.runtime.getContexts)return;
  for(let i=0;i<10;i++){
    try{
      const contexts=await boundedEntry(chrome.runtime.getContexts({contextTypes:['SIDE_PANEL']}));
      if(contexts.some(c=>c.windowId===windowId)){
        const result=await boundedEntry(chrome.runtime.sendMessage({type:'redownShelfReady',windowId}));
        if(result?.ready)return;
      }
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw Error('Shelf readiness unavailable');
}
function openToolbarInterface(tab){
  if(toolbarAttempt)return toolbarAttempt;
  const attemptId=crypto.randomUUID();
  // Must precede all asynchronous work to retain Chrome user activation.
  let opening;
  try{opening=Promise.resolve(chrome.sidePanel.open({windowId:tab.windowId}));}
  catch(error){opening=Promise.reject(error);}
  let deadline;
  toolbarAttempt=Promise.race([opening,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Shelf open timed out')),2500);})]).finally(()=>clearTimeout(deadline)).then(()=>verifyShelf(tab.windowId)).then(()=>{
    entryEvidence('toolbar','open','shelf',chrome.runtime.getContexts?'SHELF_READY':'SHELF_API_ACCEPTED',false,attemptId);
  }).catch(async()=>{
    entryEvidence('toolbar','open','shelf','SHELF_UNAVAILABLE','requested',attemptId);
    try{
      if(recoveryWindowId===null&&chrome.windows.getAll){
        try{
          const windows=await chrome.windows.getAll({populate:true,windowTypes:['popup']});
          recoveryWindowId=windows.find(w=>w.tabs?.some(t=>t.url===chrome.runtime.getURL('popup.html?recovery=1')))?.id??null;
        }catch{ /* Lookup is optional; it must not block recovery creation. */ }
      }
      if(recoveryWindowId!==null){
        try{await chrome.windows.update(recoveryWindowId,{focused:true});entryEvidence('popup','recover','focus','RECOVERY_WINDOW_FOCUSED','accepted',attemptId);return;}
        catch{recoveryWindowId=null;}
      }
      const win=await chrome.windows.create({url:chrome.runtime.getURL('popup.html?recovery=1'),type:'popup',width:360,height:560,focused:true});
      recoveryWindowId=win.id;
      entryEvidence('popup','recover','window','RECOVERY_WINDOW_CREATED','accepted',attemptId);
    }catch{
      entryEvidence('popup','recover','window','ACCESS_BLOCKED','failed',attemptId);
      console.error('REDOWN: Chrome blocked Shelf and recovery window.');
      void chrome.action.setTitle({title:'REDOWN could not open. Reload the extension in Chrome Extensions.'});
    }
  }).finally(()=>{toolbarAttempt=null;});
  return toolbarAttempt;
}
chrome.action.onClicked.addListener(tab=>{void openToolbarInterface(tab);});
chrome.windows.onRemoved.addListener(id=>{if(id===recoveryWindowId)recoveryWindowId=null;});
chrome.runtime.onInstalled.addListener(()=>{void applyToolbarOpenMode().catch(console.error);});
chrome.runtime.onStartup.addListener(()=>{void applyToolbarOpenMode().catch(console.error);});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local'&&changes.toolbarOpenMode)void applyToolbarOpenMode().catch(console.error);
});
void applyToolbarOpenMode().catch(console.error);
