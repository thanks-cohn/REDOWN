(() => {
  const root=document.getElementById('toolbar-mode-control');
  if(!root)return;
  const toggle=document.getElementById('toolbar-mode-toggle');
  const menu=document.getElementById('toolbar-mode-menu');
  const feedback=document.getElementById('toolbar-mode-feedback');
  const choices=[...menu.querySelectorAll('[data-toolbar-mode]')];
  let mode='shelf';
  const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
  const paint=()=>{
    toggle.textContent='Opens: '+(mode==='popup'?'Popup':'Shelf')+' ▾';
    for(const item of choices){
      const selected=item.dataset.toolbarMode===mode;
      item.setAttribute('aria-checked',String(selected));
      item.querySelector('.mode-check').textContent=selected?'✓':'';
    }
  };
  toggle.addEventListener('click',()=>{
    menu.hidden=!menu.hidden;
    toggle.setAttribute('aria-expanded',String(!menu.hidden));
    if(!menu.hidden)choices.find(item=>item.dataset.toolbarMode===mode)?.focus();
  });
  for(const item of choices)item.addEventListener('click',async()=>{
    const next=item.dataset.toolbarMode;
    close();
    if(next===mode){toggle.focus();return;}
    try{
      await chrome.storage.local.set({toolbarOpenMode:next});
      mode=next;paint();feedback.textContent='Preference saved';
    }catch(error){feedback.textContent='Could not save preference: '+error.message;}
    toggle.focus();
  });
  document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){close();toggle.focus();}});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.toolbarOpenMode){
      mode=changes.toolbarOpenMode.newValue==='popup'?'popup':'shelf';paint();
    }
  });
  chrome.storage.local.get('toolbarOpenMode').then(data=>{
    mode=data.toolbarOpenMode==='popup'?'popup':'shelf';paint();
  }).catch(error=>{feedback.textContent='Preference unavailable: '+error.message;});
  paint();
})();
