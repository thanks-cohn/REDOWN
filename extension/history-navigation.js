/* Credential-free saved-object receipts and gesture-preserving History navigation. */
(() => {
  const lifetime=120000;
  function locator(record){
    if(record?.ok!==true||record.verified===false||record.uncertain===true||record.error||
      /pending|cancel|uncertain|incomplete|failed|started|accepted/i.test([record.status,record.state].filter(Boolean).join(' ')))return null;
    if(record.verified!==true&&!(typeof record.location==='string'&&/^(https?:\/\/|R2: )/.test(record.location)))return null;
    const d=record.destination;
    if(!d||!['accountId','bucketName','key'].every(k=>typeof d[k]==='string'&&d[k].length)||
      record.provider&& !['cloudflare','cloudflare-r2','Cloudflare R2'].includes(record.provider))return null;
    if(d.key.endsWith('/')||/[\\\x00-\x1f]/.test(d.key)||d.key.split('/').some(p=>!p||p==='.'||p==='..'))return null;
    const prefix=d.key.slice(0,d.key.lastIndexOf('/')+1);
    if(d.prefix!==undefined&&typeof d.prefix!=='string')return null;
    if(d.prefix!==undefined&&d.prefix.replace(/\/$/,'')!==prefix.replace(/\/$/,''))return null;
    return {provider:'cloudflare-r2',accountId:d.accountId,bucketName:d.bucketName,key:d.key,prefix,filename:d.key.split('/').at(-1)};
  }
  function valid(intent){return intent?.locator&&locator({ok:true,verified:true,destination:intent.locator})&&typeof intent.token==='string'&&Number.isFinite(intent.issuedAt)&&Date.now()-intent.issuedAt<lifetime&&intent.issuedAt<=Date.now()+1000;}
  let mode='tab',openingEpoch=0;
  const acknowledgements=new Map();
  chrome.storage.onChanged.addListener((c,a)=>{if(a==='session'&&c.historySideAcknowledged){const token=c.historySideAcknowledged.newValue?.token;const timer=acknowledgements.get(token);if(timer){clearTimeout(timer);acknowledgements.delete(token);}}});
  const preference=chrome.storage.local.get('historyGoToMode').then(s=>{mode=s.historyGoToMode==='side'?'side':'tab';});
  chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.historyGoToMode)mode=c.historyGoToMode.newValue==='side'?'side':'tab';});
  function report(message,fallback){
    const target=document.getElementById('history-navigation-status')||document.getElementById('status');if(!target)return;
    target.textContent=message;
    if(fallback){const b=document.createElement('button');b.type='button';b.textContent='Open in New Tab';b.onclick=fallback;target.append(' ',b);}
  }
  async function tab(target){
    const token=crypto.randomUUID(),key='historyNavigation:'+token;
    await chrome.storage.session.set({[key]:{token,issuedAt:Date.now(),locator:target}});
    try{await chrome.tabs.create({url:chrome.runtime.getURL('beta/explorer.html')+'#history='+token,active:true});}
    catch(error){await chrome.storage.session.remove(key);throw error;}
  }
  function open(record){
    const target=locator(record);if(!target)return;
    const ticket=++openingEpoch;
    const fallback=()=>void tab(target).catch(e=>report('Could not open Explorer: '+e.message));
    if(mode!=='side'){fallback();return;}
    if(!chrome.sidePanel?.open||!chrome.storage.session){report('Side Panel is unavailable in this browser.',fallback);return;}
    // No asynchronous work before open: Chrome requires the original click gesture.
    let opening;try{opening=chrome.sidePanel.open({windowId:chrome.windows.WINDOW_ID_CURRENT});}
    catch(e){report('Could not open Side Panel: '+e.message,fallback);return;}
    const token=crypto.randomUUID();
    void (async()=>{
      try{
        await opening;
        if(ticket!==openingEpoch)return;
        const win=await chrome.windows.getCurrent();
        if(ticket!==openingEpoch)return;
        const timer=setTimeout(()=>{acknowledgements.delete(token);if(ticket===openingEpoch)report('Explorer did not acknowledge Side Panel navigation. Reload REDOWN and try again.',fallback);},12000);
        acknowledgements.set(token,timer);
        await chrome.storage.session.set({historySideNavigation:{token,windowId:win.id,issuedAt:Date.now(),locator:target}});
      }catch(e){clearTimeout(acknowledgements.get(token));acknowledgements.delete(token);if(ticket===openingEpoch)report('Could not open Side Panel: '+e.message,fallback);}
    })();
  }
  async function relaySide(intent){
    if(!valid(intent))return;
    const [tab,win]=await Promise.all([chrome.tabs.getCurrent(),chrome.windows.getCurrent()]);
    if(tab||win.id!==intent.windowId)return; // A Shelf tab must never redirect.
    const current=await chrome.storage.session.get('historySideNavigation');
    if(current.historySideNavigation?.token!==intent.token)return;
    const key='historyNavigation:'+intent.token;
    await chrome.storage.session.set({[key]:intent,historySideAcknowledged:{token:intent.token}});
    location.href=chrome.runtime.getURL('beta/explorer.html')+'#history='+intent.token;
  }
  globalThis.RedownHistoryNavigation={locator,valid,open,preference};
  if(document.getElementById('history-timeline')){
    chrome.storage.onChanged.addListener((c,a)=>{if(a==='session'&&c.historySideNavigation)void relaySide(c.historySideNavigation.newValue).catch(e=>report(e.message));});
    void chrome.storage.session.get('historySideNavigation').then(s=>relaySide(s.historySideNavigation)).catch(()=>{});
  }
  const select=document.getElementById('history-go-to-mode');
  if(select){void preference.then(()=>{select.value=mode;});select.onchange=async()=>{try{await chrome.storage.local.set({historyGoToMode:select.value==='side'?'side':'tab'});}catch(e){report('Could not save navigation preference: '+e.message);}};}
})();
