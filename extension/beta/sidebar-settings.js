/* One dock, existing Shelf routes and the original destination manager. */
(() => {
  const feedback=document.getElementById('status');
  const report=text=>{if(feedback)feedback.textContent=text;};
  const drawings={
    history:[['circle',{cx:12,cy:13,r:8}],['path',{d:'M12 8v5l3 2M5 3 2 6h5M2 6a12 12 0 0 1 19 1'}]],
    destinations:[['path',{d:'M2 8V5h7l2 3h11v12H2ZM7 14h10m-3-3 3 3-3 3'}]],
    settings:[['path',{d:'m10 2 4 0 1 3 3 1 3 0 2 4-2 2v3l1 3-3 3-3-1h-3l-2 2-4-2v-3l-1-3-3-1V9l3-1 1-3Z'}],['circle',{cx:12,cy:12,r:3}]]
  };
  for(const button of document.querySelectorAll('[data-dock-icon]')){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    for(const [name,attrs] of drawings[button.dataset.dockIcon]||[]){
      const node=document.createElementNS(svg.namespaceURI,name);
      for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
      svg.append(node);
    }
    button.prepend(svg);
  }
  async function openPage(path){
    const url=chrome.runtime.getURL(path),base=url.split('#')[0];
    const tabs=await chrome.tabs.query({url:base});
    const existing=tabs.find(tab=>tab.url?.split('#')[0]===base);
    if(existing){
      await chrome.tabs.update(existing.id,{url,active:true});
      if(Number.isInteger(existing.windowId))await chrome.windows.update(existing.windowId,{focused:true});
    }else await chrome.tabs.create({url});
  }
  function openShelf(view){
    const fallback=()=>openPage('shelf.html#'+view).catch(()=>report('Could not open Shelf. Please try again.'));
    if(!chrome.sidePanel?.open||!chrome.storage.session?.set){void fallback();return;}
    // Preserve Chrome's user gesture: do not await storage/window work first.
    let opening;
    try{opening=chrome.sidePanel.open({windowId:chrome.windows.WINDOW_ID_CURRENT});}
    catch{void fallback();return;}
    const token=crypto.randomUUID();
    const intent=chrome.windows.getCurrent().then(win=>{
      if(!Number.isInteger(win?.id))throw Error('Browser window unavailable');
      return chrome.storage.session.set({shelfOpenIntent:{view,windowId:win.id,issuedAt:Date.now(),token}});
    });
    void Promise.allSettled([opening,intent]).then(async results=>{
      if(results.some(result=>result.status==='rejected')){
        // Clear only our failed request, never a newer navigation request.
        try{
          const data=await chrome.storage.session.get('shelfOpenIntent');
          if(data?.shelfOpenIntent?.token===token)await chrome.storage.session.remove('shelfOpenIntent');
        }catch{}
        await fallback();
      }
    });
  }
  document.getElementById('open-shelf-settings')?.addEventListener('click',()=>openShelf('settings'));
  document.getElementById('transfer-history')?.addEventListener('click',()=>openShelf('history'));
  document.getElementById('open-destinations')?.addEventListener('click',()=>{
    void openPage('options.html#right-click-presets').catch(()=>report('Could not open Destinations. Please try again.'));
  });
})();
