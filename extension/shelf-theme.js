/* One saved Shelf palette. Porcelain is the default; dark toggle remembers the last dark palette. */
(() => {
  const choices=[...document.querySelectorAll('input[name="shelf-theme"]')];
  const toggle=document.getElementById('theme-toggle');
  const status=document.getElementById('status');
  const iconBackgroundSelect=document.getElementById('icon-background-mode');
  const iconBackgroundKey='shelfIconBackgroundMode';
  const validIconBackgroundMode=value=>value==='theme'?'theme':'original';
  let iconBackgroundVersion=0,iconBackgroundWriteQueue=Promise.resolve();
  function paintIconBackgroundMode(value){
    const mode=validIconBackgroundMode(value);
    document.documentElement.dataset.shelfIconBackground=mode;
    if(iconBackgroundSelect)iconBackgroundSelect.value=mode;
    globalThis.RedownBrandIcon?.paint(document,document.documentElement.dataset.shelfTheme||'porcelain',mode);
  }
  // Start from the existing icon appearance unless the user opted in.
  paintIconBackgroundMode('original');
  iconBackgroundSelect?.addEventListener('change',()=>{
    const chosen=validIconBackgroundMode(iconBackgroundSelect.value);
    const previous=document.documentElement.dataset.shelfIconBackground;
    const version=++iconBackgroundVersion;
    paintIconBackgroundMode(chosen);
    iconBackgroundWriteQueue=iconBackgroundWriteQueue.catch(()=>{}).then(()=>chrome.storage.local.set({[iconBackgroundKey]:chosen})).catch(()=>{
      if(version===iconBackgroundVersion){
        paintIconBackgroundMode(previous);
        if(status)status.textContent='Could not save the icon background preference.';
      }
    });
  });
  void chrome.storage.local.get(iconBackgroundKey).then(data=>{
    if(iconBackgroundVersion===0)paintIconBackgroundMode(data[iconBackgroundKey]);
  }).catch(()=>{/* Original remains the safe default. */});
  const darkThemes=new Set(['midnight','ocean','neon']);
  const palettes=new Set([...darkThemes,'porcelain']);
  const normalize=value=>value==='velvet'?'neon':value==='noir'?'ocean':palettes.has(value)?value:'porcelain';
  let lastDark='midnight';
  let writeEpoch=0,morphTimer=null,activeTransition=null,pendingSelection=null;
  const morph=()=>{
    if(!toggle||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
    toggle.removeAttribute('data-morphing');
    // Restart the same slosh for light→dark and dark→light.
    void toggle.offsetWidth;
    toggle.dataset.morphing='true';
    clearTimeout(morphTimer);
    morphTimer=setTimeout(()=>toggle.removeAttribute('data-morphing'),1510);
  };
  let celestial;
  const apply=value=>{
    const selected=normalize(value);
    document.documentElement.dataset.shelfTheme=selected;
    globalThis.RedownBrandIcon?.paint(document,selected,document.documentElement.dataset.shelfIconBackground);
    if(darkThemes.has(selected))lastDark=selected;
    for(const input of choices)input.checked=input.value===selected;
    celestial?.refresh();
    const light=selected==='porcelain';
    if(toggle){
      const label=light?'Switch to dark mode':'Switch to light mode';
      toggle.title=label;toggle.setAttribute('aria-label',label);
      toggle.setAttribute('aria-pressed',String(!light));
      toggle.dataset.mode=light?'light':'dark';
    }
  };
  const reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const animateTheme=(selected,epoch)=>{
    if(reducedMotion()||typeof document.startViewTransition!=='function'){
      apply(selected);pendingSelection=null;return;
    }
    try {
      activeTransition?.skipTransition?.();
      const transition=document.startViewTransition(()=>{
        // A superseded transition must not repaint an older palette.
        if(epoch===writeEpoch)apply(selected);
      });
      activeTransition=transition;
      void transition.finished.catch(()=>{}).finally(()=>{
        if(activeTransition===transition){
          activeTransition=null;
          if(pendingSelection===selected)pendingSelection=null;
        }
      });
    } catch {apply(selected);pendingSelection=null;}
  };
  const setTheme=async selected=>{
    const requested=normalize(selected);
    const before=pendingSelection||document.documentElement.dataset.shelfTheme;
    if(requested===before)return;
    const previousDark=lastDark;
    const epoch=++writeEpoch;
    pendingSelection=requested;
    if(darkThemes.has(requested))lastDark=requested;
    if(toggle)toggle.dataset.ready='true';
    if((before==='porcelain')!==(requested==='porcelain'))morph();
    animateTheme(requested,epoch);
    try {
      await chrome.storage.local.set({shelfColorScheme:requested,shelfLastDarkTheme:lastDark});
    } catch {
      if(epoch===writeEpoch){
        activeTransition?.skipTransition?.();
        pendingSelection=null;lastDark=previousDark;apply(before);
        if(status)status.textContent='Could not save your color scheme.';
      }
    }
  };
  for(const input of choices)input.addEventListener('change',()=>{
    if(input.checked){celestial?.cancel();void setTheme(input.value);}
  });
  if(toggle&&globalThis.RedownCelestial)celestial=globalThis.RedownCelestial({toggle,current:()=>document.documentElement.dataset.shelfTheme||'porcelain',commit:setTheme,reducedMotion});
  toggle?.addEventListener('click',()=>{
    if(celestial?.consumeTouch())return;
    const current=pendingSelection||document.documentElement.dataset.shelfTheme;
    const target=current==='porcelain'?lastDark:'porcelain';
    if(celestial)void celestial.select(target,toggle,true);else void setTheme(target);
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes[iconBackgroundKey]){
      const incoming=validIconBackgroundMode(changes[iconBackgroundKey].newValue);
      if(incoming!==document.documentElement.dataset.shelfIconBackground){
        iconBackgroundVersion++;
        paintIconBackgroundMode(incoming);
      }
    }
    if(changes.shelfLastDarkTheme&&darkThemes.has(changes.shelfLastDarkTheme.newValue)){
      lastDark=changes.shelfLastDarkTheme.newValue;
    }
    if(changes.shelfColorScheme){
      const incoming=normalize(changes.shelfColorScheme.newValue);
      if(incoming!==pendingSelection){
        // Other pages can change the saved preference; honor those changes.
        if(activeTransition)activeTransition.skipTransition?.();
        celestial?.cancel();
        writeEpoch++;
        pendingSelection=null;
        apply(incoming);
      }
    }
  });
  apply('porcelain');
  void chrome.storage.local.get(['shelfColorScheme','shelfLastDarkTheme'])
    .then(({shelfColorScheme,shelfLastDarkTheme})=>{
      if(shelfLastDarkTheme==='velvet')lastDark='neon';
      else if(shelfLastDarkTheme==='noir')lastDark='ocean';
      else if(darkThemes.has(shelfLastDarkTheme))lastDark=shelfLastDarkTheme;
      if(writeEpoch===0)apply(shelfColorScheme);
    })
    .catch(()=>{if(status)status.textContent='Color preference unavailable. Showing Porcelain.';})
    .finally(()=>{if(toggle)toggle.dataset.ready='true';});
  globalThis.addEventListener('pagehide',()=>clearTimeout(morphTimer));
})();
