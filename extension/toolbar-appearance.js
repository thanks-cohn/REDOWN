/* Remove only REDOWN launch warnings; transfer feedback owns its icon and title. */
(() => {
 const title='REDOWN — Your cloud companion';
 let queue=Promise.resolve();
 const launchTitle=value=>typeof value!=='string'||value===title||['REDOWN','REDOWN-Click2Cloud'].includes(value)||/^(Chrome accepted the Shelf request|Chrome blocked REDOWN|REDOWN (Shelf|could not|is waiting))/.test(value);
 function clean({tabId,allTabs=false}={}){
  const task=queue.catch(()=>{}).then(async()=>{
   const targets=[{}];
   if(Number.isInteger(tabId))targets.push({tabId});
   if(allTabs&&chrome.tabs?.query){
    try{for(const tab of await chrome.tabs.query({}))if(Number.isInteger(tab.id)&&tab.id!==tabId)targets.push({tabId:tab.id});}catch{}
   }
   for(const target of targets){
    try{
     const badge=await chrome.action.getBadgeText?.(target);
     if(badge==='!')await chrome.action.setBadgeText({...target,text:''});
     const current=await chrome.action.getTitle?.(target);
     const globalTitle=await chrome.action.getTitle?.({});
     const desired=/^REDOWN · Transfer/.test(globalTitle||'')?globalTitle:title;
     if(launchTitle(current)&&current!==desired)await chrome.action.setTitle({...target,title:desired});
    }catch{ /* Closed tab / denied cosmetic API cannot block interface access. */ }
   }
  });
  queue=task;return task;
 }
 function feedbackTitle(value){
  const task=queue.catch(()=>{}).then(async()=>{
   await chrome.action.setTitle({title:value});
   const tabs=await chrome.tabs.query({});
   for(const tab of tabs){
    try{const current=await chrome.action.getTitle({tabId:tab.id});
     if(current!==value&&(launchTitle(current)||/^REDOWN · Transfer/.test(current)))await chrome.action.setTitle({tabId:tab.id,title:value});
    }catch{}
   }
  });queue=task;return task;
 }
 globalThis.RedownToolbarAppearance=Object.freeze({title,clean,feedbackTitle});
})();
