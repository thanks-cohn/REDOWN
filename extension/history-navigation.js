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
  // Serialize instance selection, not file reads. Rapid requests share a new tab.
  let tabLane=Promise.resolve();
  function waitFor(key,timeout){
    return new Promise((resolve,reject)=>{
      const listener=(changes,area)=>{if(area==='session'&&changes[key]?.newValue){cleanup();resolve(changes[key].newValue);}};
      const timer=setTimeout(()=>{cleanup();reject(Error('Explorer did not acknowledge navigation. Reload REDOWN and try again.'));},timeout);
      const cleanup=()=>{clearTimeout(timer);chrome.storage.onChanged.removeListener?.(listener);};
      chrome.storage.onChanged.addListener(listener);
    });
  }
  async function probe(tabId){
    const token=crypto.randomUUID(),key='historyProbe:'+token,reply='historyReply:'+token;
    const response=waitFor(reply,1200);void response.catch(()=>{});
    try{await chrome.storage.session.set({[key]:{token,tabId,issuedAt:Date.now()}});return await response;}
    catch{return null;}finally{await chrome.storage.session.remove([key,reply]);}
  }
  function tab(target,ticket=openingEpoch){
    const run=async()=>{
      if(ticket!==openingEpoch)return;
      const base=chrome.runtime.getURL('beta/explorer.html'),win=await chrome.windows.getCurrent();
      const candidates=chrome.tabs.query?await chrome.tabs.query({url:base+'*'}):[];
      candidates.sort((a,b)=>Number(b.windowId===win.id)-Number(a.windowId===win.id)||Number(b.active)-Number(a.active)||a.id-b.id);
      let existing=null;
      for(const candidate of candidates){
        if(candidate.url?.split(/[?#]/)[0]!==base||candidate.discarded)continue;
        const result=await probe(candidate.id);
        if(ticket!==openingEpoch)return;
        if(result?.ready){existing=candidate;break;}
      }
      const token=crypto.randomUUID(),key='historyNavigation:'+token;
      const intent={token,issuedAt:Date.now(),locator:target,tabId:existing?.id};
      if(ticket!==openingEpoch)return;
      const accepted=waitFor('historyAccepted:'+token,12000);void accepted.catch(()=>{});
      const completed=waitFor('historyResult:'+token,95000);
      void completed.then(result=>{if(ticket===openingEpoch&&result.state==='failed')report(result.error||'Could not locate saved file.');}).catch(e=>{if(ticket===openingEpoch)report(e.message);}).finally(()=>chrome.storage.session.remove([key,'historyResult:'+token,'historyAccepted:'+token]));
      await chrome.storage.session.set({[key]:intent});
      if(existing){
        await chrome.tabs.update(existing.id,{active:true});
        if(existing.windowId!==win.id)await chrome.windows.update(existing.windowId,{focused:true});
      }else{
        try{await chrome.tabs.create({url:base+'#history='+token,active:true});}
        catch(error){await chrome.storage.session.remove(key);throw error;}
      }
      await accepted;
    };
    const operation=tabLane.catch(()=>{}).then(()=>globalThis.navigator?.locks?.request? navigator.locks.request('redown-history-tab',run):run());
    tabLane=operation;return operation;
  }
  function open(record){
    const target=locator(record);if(!target)return;
    const ticket=++openingEpoch;
    const fallback=()=>void tab(target,ticket).catch(e=>report('Could not open Explorer: '+e.message));
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
        void waitFor('historyResult:'+token,95000).then(result=>{if(ticket===openingEpoch&&result.state==='failed')report(result.error||'Could not locate saved file.');}).catch(e=>{if(ticket===openingEpoch)report(e.message,fallback);}).finally(()=>chrome.storage.session.remove('historyResult:'+token));
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
  async function receive(navigate,ready){
    const [ownTab,win]=await Promise.all([chrome.tabs.getCurrent(),chrome.windows.getCurrent()]);
    const handle=async(changes,area)=>{
      if(area!=='session')return;
      for(const [key,change] of Object.entries(changes)){
        const intent=change.newValue;
        if(key.startsWith('historyProbe:')&&ownTab?.id===intent?.tabId&&Date.now()-intent.issuedAt<5000){
          await chrome.storage.session.set({['historyReply:'+intent.token]:{ready:ready(),tabId:ownTab.id}});
        }
        if(key.startsWith('historyNavigation:')&&intent?.tabId===ownTab?.id&&Number.isInteger(ownTab?.id)&&valid(intent))void navigate(intent);
      }
    };
    chrome.storage.onChanged.addListener((c,a)=>void handle(c,a).catch(()=>{}));
    return {tab:ownTab,windowId:win.id};
  }
  globalThis.RedownHistoryNavigation={locator,valid,open,preference,receive};
  if(document.getElementById('history-timeline')){
    chrome.storage.onChanged.addListener((c,a)=>{if(a==='session'&&c.historySideNavigation)void relaySide(c.historySideNavigation.newValue).catch(e=>report(e.message));});
    void chrome.storage.session.get('historySideNavigation').then(s=>relaySide(s.historySideNavigation)).catch(()=>{});
  }
  const select=document.getElementById('history-go-to-mode');
  if(select){void preference.then(()=>{select.value=mode;});select.onchange=async()=>{try{await chrome.storage.local.set({historyGoToMode:select.value==='side'?'side':'tab'});}catch(e){report('Could not save navigation preference: '+e.message);}};}
})();
