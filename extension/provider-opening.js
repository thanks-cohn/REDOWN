/* Preferences and future URL launcher for connected cloud providers.
   A native Chrome Split View puts the destination to the left of the active tab.
   This file does not provide provider OAuth or invent saved-file URLs. */
(() => {
  const providers=['google','dropbox','onedrive'];
  const options=new Set(['tab','window','left']);
  const controls=[...document.querySelectorAll('[data-provider-open]')];
  const status=document.getElementById('status');
  const choice=value=>options.has(value)?value:'tab';
  const defaults=()=>({google:'tab',dropbox:'tab',onedrive:'tab'});
  let modes=defaults();
  let pending=Promise.resolve();
  const paint=()=>{
    for(const el of controls)el.value=choice(modes[el.dataset.providerOpen]);
  };
  const allowed=(provider,hostname)=>{
    switch(provider){
      case 'google':return hostname==='drive.google.com';
      case 'dropbox':return hostname==='dropbox.com'||hostname.endsWith('.dropbox.com');
      case 'onedrive':return hostname==='onedrive.live.com'||hostname==='1drv.ms'||hostname==='onedrive.microsoft.com'||hostname.endsWith('.sharepoint.com');
      default:return false;
    }
  };
  const verifiedUrl=(provider,raw)=>{
    const url=new URL(raw);
    if(url.protocol!=='https:'||!allowed(provider,url.hostname.toLowerCase()))throw Error('Unexpected provider destination URL.');
    return url.href;
  };
  const open=async(provider,rawUrl)=>{
    if(!providers.includes(provider))throw Error('Unknown cloud provider.');
    const url=verifiedUrl(provider,rawUrl);
    const stored=await chrome.storage.local.get('providerOpeningModes');
    const mode=choice(stored.providerOpeningModes?.[provider]);
    if(mode==='window')return chrome.windows.create({url});
    if(mode!=='left')return chrome.tabs.create({url});
    // Chrome 155+ supports native Split View. Never resize the user's windows.
    try {
      if(typeof chrome.tabs.createSplit!=='function')throw Error('Split View not supported');
      const [active]=await chrome.tabs.query({active:true,currentWindow:true});
      if(!Number.isInteger(active?.id)||active.splitViewId>=0)throw Error('The current tab cannot be split');
      return await chrome.tabs.create({
        url,windowId:active.windowId,index:active.index,splitWithTabId:active.id,active:true
      });
    }catch{
      if(status)status.textContent='Left-side Split View is unavailable. Opening a new tab instead.';
      return chrome.tabs.create({url});
    }
  };
  // Future OAuth integrations call RedownProviderOpening.open(provider, verifiedFileOrFolderUrl).
  globalThis.RedownProviderOpening=Object.freeze({open});
  const update=async()=>{
    const saved=await chrome.storage.local.get('providerOpeningModes');
    modes={...defaults(),...(saved.providerOpeningModes||{})};
    paint();
  };
  for(const el of controls)el.addEventListener('change',()=>{
    const provider=el.dataset.providerOpen;
    if(!providers.includes(provider))return;
    const selected=choice(el.value);
    const previous=modes[provider];
    modes={...modes,[provider]:selected};
    pending=pending.catch(()=>{}).then(async()=>{
      try {
        // Read fresh before writing to preserve concurrent provider settings.
        const saved=await chrome.storage.local.get('providerOpeningModes');
        await chrome.storage.local.set({
          providerOpeningModes:{...defaults(),...(saved.providerOpeningModes||{}),[provider]:selected}
        });
      }catch{
        modes={...modes,[provider]:previous};
        paint();
        if(status)status.textContent='Could not save the provider opening preference.';
      }
    });
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.providerOpeningModes){
      modes={...defaults(),...(changes.providerOpeningModes.newValue||{})};
      paint();
    }
  });
  void update().catch(()=>{if(status)status.textContent='Provider opening preferences are unavailable.';});
})();
