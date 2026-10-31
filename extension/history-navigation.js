/* Credential-free saved-object receipts and acknowledged History navigation. */
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
  const normalized=value=>value==='side'||value==='split'?'split':'tab';
  const preference=chrome.storage.local.get('historyGoToMode').then(async s=>{
    mode=normalized(s.historyGoToMode);
    if(s.historyGoToMode==='side')await chrome.storage.local.set({historyGoToMode:'split'});
  });
  chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.historyGoToMode)mode=normalized(c.historyGoToMode.newValue);});
  function report(message,fallback){
    const target=document.getElementById('history-navigation-status')||document.getElementById('status');if(!target)return;
    target.textContent=message;
    if(fallback){const b=document.createElement('button');b.type='button';b.textContent='Open in Tab';b.onclick=fallback;target.append(' ',b);}
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
  const inSplit=t=>Number.isInteger(t?.splitViewId)&&t.splitViewId>=0;
  const explorerURL=()=>chrome.runtime.getURL('beta/explorer.html');
  const isExplorer=t=>t.url?.split(/[?#]/)[0]===explorerURL();
  async function verifyPair(explorer,webpage,windowId){
    const tabs=await chrome.tabs.query({windowId});
    const left=tabs.find(t=>t.id===explorer.id),right=tabs.find(t=>t.id===webpage.id);
    if(!left||!right||left.windowId!==windowId||right.windowId!==windowId||
       !inSplit(left)||left.splitViewId!==right.splitViewId||left.index>=right.index)
      throw Error('Chrome did not confirm Explorer on the left. Arrange or close this split, then retry GO TO.');
    return left;
  }
  async function chooseInstance(openMode,win,ticket){
    let tabs=chrome.tabs.query?await chrome.tabs.query({windowId:win.id}):[];
    tabs=tabs.filter(t=>t.windowId===win.id);
    let webpage=null;
    if(openMode==='split'){
      const version=globalThis.navigator?.userAgent?.match(/(?:Chrome|Chromium)\/(\d+)/)?.[1];
      if(version&&Number(version)<155||typeof chrome.tabs.createSplit!=='function')throw Error('Split View requires Chrome 155+ with the Split View extension API enabled. Update Chrome or open in a tab.');
      const active=tabs.find(t=>t.active);
      webpage=isExplorer(active||{})&&inSplit(active)?tabs.find(t=>t.id!==active.id&&t.splitViewId===active.splitViewId):active;
      if(!webpage||isExplorer(webpage)||webpage.url&&!/^https?:\/\//.test(webpage.url))throw Error('Select the original webpage in this window, then retry GO TO.');
      if(webpage.discarded||webpage.frozen)throw Error('Activate the original webpage before creating Split View.');
      if(inSplit(webpage)){
        const pair=tabs.find(t=>t.id!==webpage.id&&t.splitViewId===webpage.splitViewId&&isExplorer(t));
        if(!pair)throw Error('This webpage is already in another Split View. Close that split or open in a tab.');
        const checked=await verifyPair(pair,webpage,win.id);
        if(!(await probe(checked.id))?.ready)throw Error('The paired Explorer is not ready. Activate it, connect Cloudflare and retry.');
        return {existing:checked,webpage};
      }
    }
    const candidates=tabs.filter(t=>isExplorer(t)&&!inSplit(t)&&
      (openMode!=='split'||t.pinned===webpage.pinned&&t.groupId===webpage.groupId));
    candidates.sort((a,b)=>Number(b.active)-Number(a.active)||a.id-b.id);
    let existing=null;
    for(const candidate of candidates){
      if(candidate.discarded||candidate.frozen)await chrome.tabs.update(candidate.id,{active:true});
      const result=await probe(candidate.id);if(ticket!==openingEpoch)return {};
      if(result?.ready){existing=candidate;break;}
    }
    if(!existing&&candidates.length)throw Error('An existing Explorer is not ready. Activate it, connect Cloudflare and retry GO TO.');
    if(openMode==='split'&&existing){
      // Move only REDOWN. Never unpin, ungroup, navigate or reload the webpage.
      const fresh=await chrome.tabs.get(webpage.id);
      if(fresh.windowId!==win.id||inSplit(fresh))throw Error('The webpage moved or joined another split. Retry GO TO.');
      await chrome.tabs.move(existing.id,{index:fresh.index-(existing.index<fresh.index?1:0)});
      await chrome.tabs.createSplit([existing.id,webpage.id]);
      existing=await verifyPair(existing,webpage,win.id);
    }
    return {existing,webpage};
  }
  function tab(target,ticket=openingEpoch,openMode='tab'){
    const run=async()=>{
      if(ticket!==openingEpoch)return;
      const win=await chrome.windows.getCurrent();
      const {existing,webpage}=await chooseInstance(openMode,win,ticket);
      if(ticket!==openingEpoch)return;
      const token=crypto.randomUUID(),key='historyNavigation:'+token;
      const intent={token,issuedAt:Date.now(),locator:target,tabId:existing?.id};
      const accepted=waitFor('historyAccepted:'+token,12000);void accepted.catch(()=>{});
      const completed=waitFor('historyResult:'+token,95000);
      void completed.then(result=>{if(ticket===openingEpoch&&result.state==='failed')report(result.error||'Could not locate saved file.');}).catch(e=>{if(ticket===openingEpoch)report(e.message);}).finally(()=>chrome.storage.session.remove([key,'historyResult:'+token,'historyAccepted:'+token]));
      await chrome.storage.session.set({[key]:intent});
      if(existing)await chrome.tabs.update(existing.id,{active:true});
      else{
        try{
          const options={url:explorerURL()+'#history='+token,active:true,windowId:win.id};
          if(openMode==='split'){
            const fresh=await chrome.tabs.get(webpage.id);
            if(fresh.windowId!==win.id||inSplit(fresh))throw Error('The webpage moved or joined a split. Retry GO TO.');
            Object.assign(options,{splitWithTabId:fresh.id,index:fresh.index,pinned:fresh.pinned});
          }
          const created=await chrome.tabs.create(options);
          if(openMode==='split')await verifyPair(created,webpage,win.id);
        }catch(error){await chrome.storage.session.remove(key);throw error;}
      }
      await Promise.race([accepted,completed.then(result=>{if(result.state==='failed')throw Error(result.error||'Could not locate saved file.');})]);
    };
    const operation=tabLane.catch(()=>{}).then(()=>globalThis.navigator?.locks?.request? navigator.locks.request('redown-history-tab',run):run());
    tabLane=operation;return operation;
  }
  function open(record){
    const target=locator(record);if(!target)return;
    const ticket=++openingEpoch;
    const fallback=()=>{if(ticket!==openingEpoch)return;void tab(target,ticket).catch(e=>report('Could not open Explorer: '+e.message));};
    void preference.then(()=>tab(target,ticket,mode)).catch(e=>{
      if(ticket===openingEpoch)report('Could not open Explorer: '+e.message,mode==='split'?fallback:undefined);
    });
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
  const select=document.getElementById('history-go-to-mode');
  if(select){void preference.then(()=>{select.value=mode;});select.onchange=async()=>{try{await chrome.storage.local.set({historyGoToMode:normalized(select.value)});}catch(e){report('Could not save navigation preference: '+e.message);}};}
})();
