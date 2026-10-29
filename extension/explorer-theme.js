/* One Explorer palette, shared between Shelf Settings and Explorer. The
   user's default is to match the Shelf; an independent palette is optional.
   Debug Mode merely reveals existing controls. It does not execute tests. */
(() => {
  const root=document.documentElement;
  const inExplorer=Boolean(document.getElementById('file-workspace'));
  const behavior=document.getElementById('explorer-theme-mode');
  const custom=document.getElementById('explorer-custom-theme');
  const customRow=document.getElementById('explorer-custom-theme-row');
  const debug=document.getElementById('shelf-debug-enabled');
  const testTools=document.querySelector('.test-it-tools-wrap');
  const feedback=document.getElementById('status');
  const keys=['shelfColorScheme','explorerThemeMode','explorerColorScheme','debugModeEnabled'];
  const palettes=new Set(['porcelain','midnight','ocean','neon']);
  const palette=value=>value==='velvet'?'neon':value==='noir'?'ocean':palettes.has(value)?value:'porcelain';
  const behaviorValue=value=>value==='custom'?'custom':'match';
  let snapshot={shelfColorScheme:'porcelain',explorerThemeMode:'match',explorerColorScheme:'midnight',debugModeEnabled:false};
  let revision=0;
  let themeEpoch=0,ready=false,activeTransition=null;
  // Initial hydration is not an animated theme change. Release the first
  // visible frame only after real storage preferences have been applied.
  function finishInitialPaint(){
    if(ready)return;
    ready=true;
    if(inExplorer){
      const reveal=()=>root.removeAttribute('data-explorer-boot');
      if(typeof requestAnimationFrame==='function')requestAnimationFrame(reveal);
      else reveal();
    }
  }
  // Explorer has its own ink reveal. Never animate the initial preferences
  // hydration or a Shelf page; the Shelf owns its existing transition.
  function paintPalette(selected){
    if(root.dataset.explorerTheme===selected)return;
    const epoch=++themeEpoch;
    const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
    if(!inExplorer||!ready||reducedMotion||typeof document.startViewTransition!=='function'){
      activeTransition?.skipTransition?.();
      root.dataset.explorerTheme=selected;
      return;
    }
    try{
      activeTransition?.skipTransition?.();
      const transition=document.startViewTransition(()=>{
        // A newer palette must win even during rapid changes.
        if(epoch===themeEpoch)root.dataset.explorerTheme=selected;
      });
      activeTransition=transition;
      void transition.finished.catch(()=>{}).finally(()=>{
        if(activeTransition===transition)activeTransition=null;
      });
    }catch{root.dataset.explorerTheme=selected;}
  }
  function paint(){
    const mode=behaviorValue(snapshot.explorerThemeMode);
    const selected=palette(mode==='custom'?snapshot.explorerColorScheme:snapshot.shelfColorScheme);
    paintPalette(selected);
    if(behavior)behavior.value=mode;
    if(custom)custom.value=palette(snapshot.explorerColorScheme);
    if(customRow)customRow.hidden=mode!=='custom';
    if(debug)debug.checked=snapshot.debugModeEnabled===true;
    if(testTools){
      const enabled=snapshot.debugModeEnabled===true;
      if(!enabled){
        const menu=document.getElementById('test-it-tools-menu');
        const trigger=document.getElementById('test-it-tools-button');
        if(menu)menu.hidden=true;
        trigger?.setAttribute('aria-expanded','false');
      }
      testTools.hidden=!enabled;
    }
  }
  async function refresh(){
    const ticket=++revision;
    try{
      const data=await chrome.storage.local.get(keys);
      if(ticket!==revision)return;
      snapshot={...snapshot,...data};
      paint();
      finishInitialPaint();
    }catch{
      if(feedback)feedback.textContent='Appearance preferences are unavailable. Showing default colors.';
      // Storage failures must never leave Explorer hidden or unusable.
      paint();
      finishInitialPaint();
    }
  }
  function save(key,value){
    snapshot={...snapshot,[key]:value};
    ++revision;paint();
    void chrome.storage.local.set({[key]:value}).catch(()=>{
      if(feedback)feedback.textContent='Could not save appearance settings.';
      void refresh();
    });
  }
  behavior?.addEventListener('change',()=>save('explorerThemeMode',behaviorValue(behavior.value)));
  custom?.addEventListener('change',()=>save('explorerColorScheme',palette(custom.value)));
  debug?.addEventListener('change',()=>save('debugModeEnabled',debug.checked));
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!keys.some(key=>Object.hasOwn(changes,key)))return;
    ++revision;
    snapshot={...snapshot,...Object.fromEntries(keys.filter(key=>changes[key]).map(key=>[key,changes[key].newValue]))};
    paint();
    finishInitialPaint();
  });
  // Do not style Explorer twice on startup. The first palette paint uses
  // saved preferences; there is no transient Porcelain DOM/layout state.
  if(!inExplorer)paint();
  void refresh();
})();
