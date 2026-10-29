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
  const keys=['shelfColorScheme','explorerThemeMode','explorerColorScheme','shelfIconBackgroundMode','debugModeEnabled'];
  const palettes=new Set(['porcelain','midnight','ocean','neon']);
  const palette=value=>value==='velvet'?'neon':value==='noir'?'ocean':palettes.has(value)?value:'porcelain';
  const behaviorValue=value=>value==='custom'?'custom':'match';
  let snapshot={shelfColorScheme:'porcelain',explorerThemeMode:'match',explorerColorScheme:'midnight',shelfIconBackgroundMode:'original',debugModeEnabled:false};
  let revision=0;
  let themeEpoch=0,ready=false,activeTransition=null;
  let entranceTimer=null,watchdog=null,bootTimer=null,arrival=null;
  const motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedMotion=()=>motion?.matches===true;
  const onVisibility=()=>{if(document.visibilityState!=='visible')interruptEntrance();};
  const onMotion=event=>{if(event.matches)interruptEntrance();};
  function clearEntrance(){
    if(entranceTimer!==null)clearTimeout(entranceTimer);
    if(watchdog!==null)clearTimeout(watchdog);
    entranceTimer=watchdog=null;
    arrival?.remove();arrival=null;
    root.removeAttribute('data-explorer-white');
    root.removeAttribute('data-explorer-entrance');
    document.removeEventListener?.('pointerdown',interruptEntrance,true);
    document.removeEventListener?.('keydown',interruptEntrance,true);
    document.removeEventListener?.('scroll',interruptEntrance,true);
    document.removeEventListener?.('visibilitychange',onVisibility);
    globalThis.removeEventListener?.('pagehide',interruptEntrance);
    globalThis.removeEventListener?.('resize',interruptEntrance);
    motion?.removeEventListener?.('change',onMotion);
  }
  function interruptEntrance(){
    if(!root.dataset.explorerEntrance)return;
    activeTransition?.skipTransition?.();
    clearEntrance();
  }
  function canEnter(){
    return root.dataset.explorerTheme==='neon'&&!reducedMotion()&&
      document.fonts?.status!=='loading'&&
      document.visibilityState==='visible'&&typeof document.startViewTransition==='function'&&
      globalThis.CSS?.supports?.('mask-composite','add')===true&&
      typeof globalThis.CSS?.registerProperty==='function';
  }
  function arrivalOutlines(){
    // Read geometry once, before inserting the one temporary SVG. No observers,
    // per-element timers, cloned controls or ongoing layout measurements.
    const shapes=[...document.querySelectorAll('.toolbar,#dropzone,.account-chooser,.sidebar-dock,.quick-links-content,.quick-links-tabs button,.quick-url-row,.activity')]
      .slice(0,40).map(node=>({rect:node.getBoundingClientRect(),radius:parseFloat(getComputedStyle(node).borderRadius)||7}));
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id='explorer-arrival-outlines';svg.setAttribute('aria-hidden','true');
    svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
    for(const {rect,radius} of shapes){
      if(!rect.width||!rect.height||rect.bottom<0||rect.top>innerHeight)continue;
      const outline=document.createElementNS(svg.namespaceURI,'rect');
      for(const [key,value] of Object.entries({x:rect.x+1,y:rect.y+1,width:Math.max(0,rect.width-2),height:Math.max(0,rect.height-2),rx:radius}))outline.setAttribute(key,String(value));
      svg.append(outline);
    }
    return svg;
  }
  function flood(){
    entranceTimer=null;
    if(!canEnter()){clearEntrance();return;}
    root.dataset.explorerEntrance='liquid';
    try{
      arrival=arrivalOutlines();
      const transition=document.startViewTransition(()=>{
        root.removeAttribute('data-explorer-white');
        if(arrival)document.body.append(arrival);
      });
      activeTransition=transition;
      void transition.finished.catch(()=>{}).finally(()=>{
        if(activeTransition===transition){activeTransition=null;clearEntrance();}
      });
    }catch{clearEntrance();}
  }
  // Hydrate final NEON geometry before exposing the architectural treatment.
  // The single existing View Transition captures white, then reveals real NEON.
  function finishInitialPaint(){
    if(ready)return;
    ready=true;
    if(bootTimer!==null)clearTimeout(bootTimer);
    if(!inExplorer)return;
    const reveal=()=>{
      if(canEnter()){
        root.dataset.explorerWhite='true';
        root.dataset.explorerEntrance='shimmer';
        document.addEventListener('pointerdown',interruptEntrance,true);
        document.addEventListener('keydown',interruptEntrance,true);
        document.addEventListener('visibilitychange',onVisibility);
        document.addEventListener('scroll',interruptEntrance,{capture:true,passive:true});
        globalThis.addEventListener?.('pagehide',interruptEntrance);
        globalThis.addEventListener?.('resize',interruptEntrance);
        motion?.addEventListener?.('change',onMotion);
        entranceTimer=setTimeout(flood,1050);
        watchdog=setTimeout(interruptEntrance,6500);
      }
      root.removeAttribute('data-explorer-boot');
    };
    // Font readiness is bounded and cosmetic; it never holds file API startup.
    const frame=()=>typeof requestAnimationFrame==='function'?requestAnimationFrame(reveal):reveal();
    if(root.dataset.explorerTheme==='neon'&&!reducedMotion()&&document.fonts?.ready&&typeof setTimeout==='function'){
      let fontTimer;
      void Promise.race([document.fonts.ready,new Promise(resolve=>{fontTimer=setTimeout(resolve,700);})])
        .catch(()=>{}).finally(()=>{clearTimeout(fontTimer);frame();});
    }else frame();
  }
  // Initial preference hydration chooses geometry; the optional NEON entrance
  // runs afterward. Shelf continues to own its existing transition.
  function paintPalette(selected){
    if(root.dataset.explorerTheme===selected)return;
    if(root.dataset.explorerEntrance)interruptEntrance();
    const epoch=++themeEpoch;
    const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
    if(!inExplorer||!ready||root.dataset.explorerBoot==='pending'||reducedMotion||typeof document.startViewTransition!=='function'){
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
    if(inExplorer)globalThis.RedownBrandIcon?.paint(document,selected,mode==='match'?snapshot.shelfIconBackgroundMode:'theme');
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
      if(ticket!==revision)return;
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
  if(inExplorer&&typeof setTimeout==='function')bootTimer=setTimeout(()=>{paint();finishInitialPaint();},2500);
  void refresh();
})();
