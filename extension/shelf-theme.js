/* One saved Shelf palette. Porcelain is the default; dark toggle remembers the last dark palette. */
(() => {
  const choices=[...document.querySelectorAll('input[name="shelf-theme"]')];
  const toggle=document.getElementById('theme-toggle');
  const status=document.getElementById('status');
  const darkThemes=new Set(['midnight','noir','neon']);
  const palettes=new Set([...darkThemes,'porcelain']);
  const normalize=value=>value==='velvet'?'neon':palettes.has(value)?value:'porcelain';
  let lastDark='midnight';
  let writeEpoch=0,morphTimer=null;
  const morph=()=>{
    if(!toggle||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
    toggle.removeAttribute('data-morphing');
    // Restart the same slosh for light→dark and dark→light.
    void toggle.offsetWidth;
    toggle.dataset.morphing='true';
    clearTimeout(morphTimer);
    morphTimer=setTimeout(()=>toggle.removeAttribute('data-morphing'),850);
  };
  const apply=value=>{
    const selected=normalize(value);
    document.documentElement.dataset.shelfTheme=selected;
    if(darkThemes.has(selected))lastDark=selected;
    for(const input of choices)input.checked=input.value===selected;
    const light=selected==='porcelain';
    if(toggle){
      const label=light?'Switch to dark mode':'Switch to light mode';
      toggle.title=label;toggle.setAttribute('aria-label',label);
      toggle.setAttribute('aria-pressed',String(!light));
      toggle.dataset.mode=light?'light':'dark';
    }
  };
  const setTheme=async selected=>{
    const before=document.documentElement.dataset.shelfTheme;
    const previousDark=lastDark;
    if(toggle)toggle.dataset.ready='true';
    if((before==='porcelain')!==(normalize(selected)==='porcelain'))morph();
    apply(selected);
    const epoch=++writeEpoch;
    try {
      await chrome.storage.local.set({shelfColorScheme:selected,shelfLastDarkTheme:lastDark});
    } catch {
      if(epoch===writeEpoch){
        lastDark=previousDark;apply(before);
        if(status)status.textContent='Could not save your color scheme.';
      }
    }
  };
  for(const input of choices)input.addEventListener('change',()=>{
    if(input.checked)void setTheme(input.value);
  });
  toggle?.addEventListener('click',()=>{
    const current=document.documentElement.dataset.shelfTheme;
    void setTheme(current==='porcelain'?lastDark:'porcelain');
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes.shelfLastDarkTheme&&darkThemes.has(changes.shelfLastDarkTheme.newValue)){
      lastDark=changes.shelfLastDarkTheme.newValue;
    }
    if(changes.shelfColorScheme)apply(changes.shelfColorScheme.newValue);
  });
  apply('porcelain');
  void chrome.storage.local.get(['shelfColorScheme','shelfLastDarkTheme'])
    .then(({shelfColorScheme,shelfLastDarkTheme})=>{
      if(shelfLastDarkTheme==='velvet')lastDark='neon';
      else if(darkThemes.has(shelfLastDarkTheme))lastDark=shelfLastDarkTheme;
      if(writeEpoch===0)apply(shelfColorScheme);
    })
    .catch(()=>{if(status)status.textContent='Color preference unavailable. Showing Porcelain.';})
    .finally(()=>{if(toggle)toggle.dataset.ready='true';});
  globalThis.addEventListener('pagehide',()=>clearTimeout(morphTimer));
})();
