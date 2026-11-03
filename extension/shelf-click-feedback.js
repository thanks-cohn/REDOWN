/* Live interaction handoff. This module cannot create receipts or celebrations. */
(() => {
  'use strict';
  const root=document.documentElement,runs=new Set(),seen=new Map();
  const windowId=chrome.windows.getCurrent().then(win=>win.id).catch(()=>null);
  const choice=document.getElementById('click2cloud-pulse-destination');
  let preferenceEpoch=0,lifecycle=0;
  const paint=value=>{if(choice)choice.value=value==='provider-card'?'provider-card':'shelf';};
  if(choice){
    choice.addEventListener('change',async()=>{
      preferenceEpoch++;
      try{choice.setCustomValidity('');await chrome.storage.local.set({click2CloudPulseDestination:choice.value});}
      catch{choice.setCustomValidity('Could not save Pulse Destination. Please try again.');choice.reportValidity();}
    });
    const ticket=preferenceEpoch;
    void chrome.storage.local.get('click2CloudPulseDestination').then(data=>{
      if(ticket===preferenceEpoch)paint(data.click2CloudPulseDestination);
    }).catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes.click2CloudPulseDestination){
        preferenceEpoch++;choice.setCustomValidity('');paint(changes.click2CloudPulseDestination.newValue);
      }
    });
  }
  const visible=node=>{
    if(!node||node.closest('[hidden]'))return false;
    const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
    return style.visibility!=='hidden'&&style.display!=='none'&&rect.width>0&&rect.height>0&&
      rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight;
  };
  function reset(){lifecycle++;for(const run of runs){run.animation.cancel();run.node.remove();}runs.clear();}
  function arrive(event){
    if(document.visibilityState==='hidden')return;
    const card=[...document.querySelectorAll('#clouds-view [data-provider]')]
      .find(node=>node.dataset.provider===event.provider);
    const target=event.destination==='provider-card'&&visible(card)?card:null;
    const rect=target?.getBoundingClientRect();
    // Measure at arrival; never retain coordinates across layout changes.
    const x=rect?rect.left+rect.width/2:10,y=rect?rect.top+rect.height/2:Math.max(40,innerHeight*.29);
    const node=document.createElement('span');node.className='redown-click-light';
    node.setAttribute('aria-hidden','true');node.dataset.target=target?event.provider:'shelf';
    node.style.left=x+'px';node.style.top=y+'px';root.append(node);
    const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const animation=node.animate(reduced?[{opacity:.75},{opacity:.75},{opacity:0}]:[
      {opacity:.9,transform:`translate(${10-x}px,${innerHeight*.29-y}px) scale(.45)`},
      {opacity:1,offset:.7,transform:'translate(0,0) scale(1)'},
      {opacity:0,transform:'translate(0,0) scale(1.8)'}
    ],{duration:reduced?180:420,easing:'ease-out'});
    const run={node,animation};runs.add(run);
    void animation.finished.catch(()=>{}).finally(()=>{node.remove();runs.delete(run);});
  }
  chrome.runtime.onMessage.addListener((event,sender)=>{
    if(event?.type!=='redownClickArrival'||sender?.id!==chrome.runtime.id||sender.tab||
       typeof event.id!=='string'||!Number.isFinite(event.at))return;
    const now=Date.now();
    for(const [id,at] of seen)if(now-at>3000)seen.delete(id);
    if(now-event.at<0||now-event.at>3000||seen.has(event.id))return;
    seen.set(event.id,now);
    const ticket=lifecycle;
    void windowId.then(async id=>{
      if(id!==event.windowId||document.visibilityState==='hidden')return;
      const tabs=await chrome.tabs.query({active:true,windowId:id});
      if(ticket!==lifecycle||tabs[0]?.id!==event.tabId||Date.now()-event.at>3000)return;
      arrive(event);
    }).catch(()=>{});
  });
  document.addEventListener('visibilitychange',reset);
  window.addEventListener('hashchange',reset);
  window.addEventListener('pagehide',reset);
  window.addEventListener('resize',reset);
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.addEventListener?.('change',reset);
  new MutationObserver(reset).observe(root,{attributes:true,attributeFilter:['data-shelf-theme']});
})();
