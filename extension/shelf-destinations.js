/* Shelf-only presentation preferences and accessible hover-only cloud option popouts.
 * No cloud auth, transfer, V3 menu or provider state is handled here. */
(() => {
  'use strict';
  const root=document.documentElement;
  const slant=document.getElementById('slant-display-theme');
  const arrow=document.getElementById('slant-display-arrow');
  const arrowRow=document.getElementById('slant-arrow-row');
  const message=document.getElementById('beta-aesthetics-status');
  const displayKey='shelfDestinationDisplay',arrowKey='shelfDestinationArrow';
  const normalize=value=>value==='slant'?'slant':'straight';
  let display='straight',showArrow=false,revision=0;
  function paint(){
    root.dataset.destinationDisplay=display;
    root.dataset.destinationArrow=String(showArrow);
    if(slant)slant.checked=display==='slant';
    if(arrow)arrow.checked=showArrow;
    if(arrowRow)arrowRow.hidden=display!=='slant';
  }
  paint(); // Professional default, without an interim slanted flash.
  async function save(patch){
    const previous={display,showArrow},ticket=++revision;
    if('display' in patch)display=normalize(patch.display);
    if('showArrow' in patch)showArrow=patch.showArrow===true;
    paint();if(message)message.textContent='';
    try{await chrome.storage.local.set({
      [displayKey]:display,[arrowKey]:showArrow
    });}
    catch{
      if(ticket!==revision)return;
      display=previous.display;showArrow=previous.showArrow;paint();
      if(message)message.textContent='Could not save Beta Aesthetics. Try again.';
    }
  }
  slant?.addEventListener('change',()=>void save({display:slant.checked?'slant':'straight'}));
  arrow?.addEventListener('change',()=>void save({showArrow:arrow.checked}));
  chrome.storage.local.get([displayKey,arrowKey]).then(saved=>{
    if(revision)return;display=normalize(saved?.[displayKey]);showArrow=saved?.[arrowKey]===true;paint();
  }).catch(()=>{if(message)message.textContent='Display preferences unavailable. Using the standard layout.';});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||(!changes[displayKey]&&!changes[arrowKey]))return;
    // A save in this Shelf or another Shelf is reflected without reloading.
    if(changes[displayKey])display=normalize(changes[displayKey].newValue);
    if(changes[arrowKey])showArrow=changes[arrowKey].newValue===true;
    ++revision;paint();
  });

  const hoverEnabled=()=>globalThis.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches===true;
  const menus=[...document.querySelectorAll('.destinations-grid .destination-options')];
  for(const details of menus){
    const trigger=details.querySelector('summary');
    const popup=details.querySelector('.destination-options-menu');
    if(!trigger||!popup)continue;
    let closing=null;
    const cancelClose=()=>{if(closing!==null){clearTimeout(closing);closing=null;}};
    const close=()=>{cancelClose();details.open=false;};
    const open=()=>{
      cancelClose();for(const other of menus)if(other!==details)other.open=false;
      details.open=true;
    };
    const scheduleClose=()=>{
      cancelClose();
      closing=setTimeout(()=>{
        closing=null;
        if(hoverEnabled()&&(trigger.matches(':hover')||popup.matches(':hover')))return;
        if(popup.contains(document.activeElement))return; // Keyboard users can navigate the menu.
        details.open=false;
      },160); // Bridge the small visual gap between the dots and the popup.
    };
    trigger.addEventListener('mouseenter',()=>{if(hoverEnabled())open();});
    popup.addEventListener('mouseenter',()=>{if(hoverEnabled())cancelClose();});
    trigger.addEventListener('mouseleave',()=>{if(hoverEnabled())scheduleClose();});
    popup.addEventListener('mouseleave',()=>{if(hoverEnabled())scheduleClose();});
    // A mouse click must not toggle a panel that hover already opened.
    // Touch activation retains the browser's native details/summary toggle.
    trigger.addEventListener('click',event=>{
      if(hoverEnabled())event.preventDefault(); // Hover controls opening; click never toggles it on desktop.
      else {cancelClose();for(const other of menus)if(other!==details)other.open=false;}
    });
    details.addEventListener('focusin',()=>open());
    details.addEventListener('focusout',event=>{
      if(!details.contains(event.relatedTarget)&&!trigger.matches(':hover')&&!popup.matches(':hover'))scheduleClose();
    });
    details.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.stopPropagation();trigger.focus();close();}
    });
  }
  document.addEventListener('pointerdown',event=>{
    for(const details of menus)if(!details.contains(event.target))details.open=false;
  });
  globalThis.addEventListener('pagehide',()=>{for(const details of menus)details.open=false;});
})();
