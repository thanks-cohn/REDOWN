/* The Shelf shares the real delivery total with the Popup, but owns its
   own last-visible display checkpoint. Closed panels never advance it. */
(() => {
  const host=document.getElementById('shelf-odometer');
  const note=document.getElementById('shelf-counter-note');
  if(!host||!note||!globalThis.RedownOdometer)return;
  const valid=value=>typeof value==='string' && /^(0|[1-9]\d*)$/.test(value);
  const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  let total=null,shown=null,displayed='',loadEpoch=0,ready=false,lastSeen='0';
  let saveQueue=Promise.resolve();
  const saveVisible=()=>{
    if(!valid(shown))return;
    const value=shown;
    // Serialize writes so earlier animation completions cannot overwrite newer values.
    saveQueue=saveQueue.catch(()=>{}).then(()=>chrome.storage.local.set({shelfOdometer:{version:1,lastSeenTotal:value}}));
    void saveQueue.catch(()=>{});
  };
  const reelFor=char=>{
    const wheel=document.createElement('span');wheel.className='wheel';wheel.setAttribute('aria-hidden','true');
    if(!/^[0-9]$/.test(char)){wheel.textContent=char;return wheel;}
    const reel=document.createElement('span');reel.className='reel';
    for(let n=0;n<10;n++){const digit=document.createElement('span');digit.textContent=String(n);reel.append(digit);}
    reel.style.setProperty('--digit',char);wheel.append(reel);return wheel;
  };
  const paint=value=>{
    shown=value;
    const label=value===null?'------':value==='0'?'READY!':value.padStart(6,'0');
    const numeric=/^\d+$/.test(label);
    host.style.setProperty('--digits',label.length);
    host.setAttribute('aria-label',value===null?'Delivery count unavailable':value==='0'?'Ready for your first delivery':value+' files delivered');
    if(host.children.length!==label.length||!numeric||!/^[0-9]+$/.test(displayed)){
      host.replaceChildren(...[...label].map(reelFor));
    }else{
      [...host.children].forEach((wheel,i)=>wheel.firstElementChild?.style.setProperty('--digit',label[i]));
    }
    note.textContent=value===null?'Count unavailable. Reopen REDOWN to retry.':value==='0'?'Your first delivery awaits.':'Every delivery, a little further.';
    displayed=label;
  };
  const roller=RedownOdometer.create({
    paint,
    settled:value=>{
      host.removeAttribute('data-rolling');
      host.removeAttribute('aria-busy');
      paint(value);
      lastSeen=value;
      saveVisible();
    },
    reduced
  });
  const render=value=>{
    if(!ready||document.visibilityState==='hidden')return;
    if(!valid(value)){
      roller.cancel();total=null;
      host.removeAttribute('data-rolling');host.removeAttribute('aria-busy');paint(null);
      return;
    }
    if(value===total)return;
    const previouslyVisible=valid(shown)?shown:valid(lastSeen)?lastSeen:value;
    const start=BigInt(previouslyVisible)<=BigInt(value)?previouslyVisible:value;
    total=value;
    const rolling=start!==value&&!reduced();
    host.toggleAttribute('data-rolling',rolling);
    if(rolling)host.setAttribute('aria-busy','true');
    else host.removeAttribute('aria-busy');
    roller.roll(start,value);
  };
  const refresh=async()=>{
    const epoch=++loadEpoch;
    try{
      const response=await chrome.runtime.sendMessage({type:'deliveryCount'});
      if(epoch!==loadEpoch)return;
      if(!response?.ok||!valid(response.counter?.total))throw Error('Unavailable');
      render(response.counter.total);
    }catch{
      if(epoch!==loadEpoch)return;
      try{
        const {transferCounter}=await chrome.storage.local.get('transferCounter');
        if(epoch!==loadEpoch)return;
        render(transferCounter?.total);
      }catch{if(epoch===loadEpoch)render(null);}
    }
  };
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!changes.transferCounter)return;
    if(!ready)return;
    loadEpoch++;
    const changed=changes.transferCounter.newValue?.total;
    if(valid(changed))render(changed);else void refresh();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      roller.cancel();
      saveVisible(); // Do not silently advance a hidden Shelf.
    }else{
      total=null; // Force a fresh count after being hidden.
      void refresh();
    }
  });
  globalThis.addEventListener('pagehide',()=>{
    roller.cancel();
    // Preserve exactly the number that was visible at the moment of closing.
    saveVisible();
  });
  void (async()=>{
    try{
      const {shelfOdometer}=await chrome.storage.local.get('shelfOdometer');
      if(shelfOdometer?.version===1&&valid(shelfOdometer.lastSeenTotal))lastSeen=shelfOdometer.lastSeenTotal;
    }catch{/* Use the first real count as the baseline if no checkpoint is readable. */}
    ready=true;
    await refresh();
  })();
})();
