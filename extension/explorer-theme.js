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
  function paint(){
    const mode=behaviorValue(snapshot.explorerThemeMode);
    const selected=palette(mode==='custom'?snapshot.explorerColorScheme:snapshot.shelfColorScheme);
    root.dataset.explorerTheme=selected;
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
    }catch{if(feedback)feedback.textContent='Appearance preferences are unavailable. Showing default colors.';}
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
  });
  paint();
  void refresh();
})();
