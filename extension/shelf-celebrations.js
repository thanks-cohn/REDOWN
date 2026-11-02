/* Presentation of durable provider receipts. Initial/restored state is silent. */
(() => {
  'use strict';
  const root=document.documentElement;
  const cards=new Map();
  const defaults={neonSuccess:true,volume:.18,effects:true};
  let preferences={...defaults},ready=false,audio=null,values={},lastEvent=null;
  const reduced=()=>!preferences.effects||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||globalThis.matchMedia?.('(forced-colors: active)')?.matches;
  function format(value){const n=String(value||'0');return n.length<=12?n:n[0]+'.'+n.slice(1,4)+'e'+(n.length-1);}
  for(const [provider,selector] of Object.entries({google:'.destination-tile[data-provider="google"]',dropbox:'.destination-tile[data-provider="dropbox"]',onedrive:'.destination-tile[data-provider="onedrive"]',cloudflare:'.cloudflare-hero'})){
    const card=document.querySelector(selector),host=card?.querySelector('.destination-action-copy')||card?.querySelector('#cloudflare');if(!host)continue;
    const feedback=document.createElement('span');feedback.className='provider-feedback';feedback.hidden=true;
    const label=document.createElement('span');label.className='provider-success';label.textContent='SUCCESS!';
    const count=document.createElement('span');count.className='provider-save-count';
    feedback.append(label,count);const free=host.querySelector('.free-storage-label');host.insertBefore(feedback,free);
    const plus=document.createElement('span');plus.className='provider-plus';plus.textContent='+1';plus.setAttribute('aria-hidden','true');plus.hidden=true;card.append(plus);
    cards.set(provider,{card,feedback,label,count,plus,timer:null});
  }
  function paint(state){
    values=state?.totals||{};
    for(const [p,ui] of cards){const value=String(values[p]||'0');ui.feedback.hidden=value==='0';ui.count.textContent=format(value);ui.count.title=value+' successful saves';ui.feedback.setAttribute('aria-label',value+' successful saves');ui.count.style.fontSize=value.length>8?'10px':value.length>5?'11px':'12px';}
  }
  async function unlock(){
    if(reduced()||!preferences.neonSuccess||root.dataset.shelfTheme!=='neon')return;
    try{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;audio||=new Context();if(audio.state==='suspended')await audio.resume();}catch{/* Autoplay denial never affects transfer state. */}
  }
  function sound(){
    if(root.dataset.shelfTheme!=='neon'||!preferences.neonSuccess||reduced()||audio?.state!=='running')return;
    try{
      // Original three-note square-wave chime, synthesized locally; no sample licensing.
      const start=audio.currentTime;
      [659.25,830.61,1318.51].forEach((frequency,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=start+i*.075;o.type='square';o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(Math.max(0,Math.min(.5,preferences.volume))*.18,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.17);o.onended=()=>{o.disconnect();g.disconnect();};});
    }catch{/* Cosmetic audio is best-effort. */}
  }
  function celebrate(event){
    const ui=cards.get(event.provider);if(!ui||document.visibilityState==='hidden'||reduced())return;
    clearTimeout(ui.timer);ui.card.removeAttribute('data-save-celebration');void ui.card.offsetWidth;ui.card.dataset.saveCelebration='true';ui.plus.hidden=root.dataset.shelfTheme!=='neon';
    ui.timer=setTimeout(()=>{ui.card.removeAttribute('data-save-celebration');ui.plus.hidden=true;},1250);sound();
  }
  const neon=document.getElementById('neon-success-sound'),volume=document.getElementById('neon-success-volume'),effects=document.getElementById('save-effects'),odometer=document.getElementById('odometer-sound');
  function controls(){if(neon)neon.checked=preferences.neonSuccess;if(volume)volume.value=String(preferences.volume);if(effects)effects.checked=preferences.effects;}
  async function save(){preferences={neonSuccess:neon?.checked!==false,volume:Number(volume?.value??.18),effects:effects?.checked!==false};await chrome.storage.local.set({providerCelebrationPreferences:preferences});void unlock();}
  for(const control of [neon,volume,effects])control?.addEventListener('change',()=>void save().catch(()=>{}));
  odometer?.addEventListener('change',async()=>{const {popupOdometer={}}=await chrome.storage.local.get('popupOdometer');await chrome.storage.local.set({popupOdometer:{...popupOdometer,version:1,soundEnabled:odometer.checked}});});
  document.addEventListener('pointerdown',()=>void unlock(),{passive:true});document.addEventListener('keydown',()=>void unlock());
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes.providerCelebrationPreferences){preferences={...defaults,...changes.providerCelebrationPreferences.newValue};controls();}
    if(changes.popupOdometer&&odometer)odometer.checked=changes.popupOdometer.newValue?.soundEnabled===true;
    if(!changes.providerSaveCounters)return;
    const state=changes.providerSaveCounters.newValue,event=state?.event,old=changes.providerSaveCounters.oldValue;
    paint(state);
    // No startup/reload catch-up sound, stale events or restored duplicate IDs.
    if(ready&&event&&event.id!==lastEvent&&Date.now()-event.at<5000&&Date.now()>=event.at&&BigInt(event.total)>BigInt(old?.totals?.[event.provider]||'0'))celebrate(event);
    lastEvent=event?.id;
  });
  void chrome.storage.local.get(['providerSaveCounters','providerCelebrationPreferences','popupOdometer']).then(data=>{preferences={...defaults,...data.providerCelebrationPreferences};controls();if(odometer)odometer.checked=data.popupOdometer?.soundEnabled===true;paint(data.providerSaveCounters);lastEvent=data.providerSaveCounters?.event?.id;ready=true;}).catch(()=>{});
  globalThis.addEventListener('pagehide',()=>{for(const ui of cards.values())clearTimeout(ui.timer);void audio?.close().catch(()=>{});});
  globalThis.RedownProviderCelebrations={format};
})();
