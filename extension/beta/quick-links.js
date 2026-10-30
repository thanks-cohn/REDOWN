/* A thin Explorer presentation over the original REDOWN Cloudflare APIs:
   cfAccounts/cfBuckets, cfSetAssetDomain, cfPublicAddresses and the existing
   profile/provisioning pipeline. Public URL rules belong to public-addresses.js. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const account=$('quick-setup-account'),bucket=$('quick-url-bucket');
  if(!account||!bucket||!globalThis.RedownPublicAddresses)return;
  const setupStatus=$('quick-setup-feedback'),urlStatus=$('quick-url-feedback');
  let accounts=[],buckets=[],accountVersion=0,bucketVersion=0,urlVersion=0,working=false;
  let selectedObject=null,lastAddressSnapshot=null,lastAddressIdentity="",dismissedPublicConsent="";

  async function request(type,fields={}){
    const result=await chrome.runtime.sendMessage({type,...fields});
    if(!result?.ok)throw Error(result?.error||'Cloudflare did not confirm the request.');
    return result;
  }
  const option=(value,label)=>new Option(label,value);
  const report=(node,text)=>{node.textContent=text;};
  function buttons(){
    $('quick-create').disabled=working||!account.value;
    $('quick-url-add').disabled=working||!account.value||!bucket.value;
    $('quick-url-yes').disabled=working;
    $('quick-url-no').disabled=working;
    account.disabled=working||!accounts.length;
    bucket.disabled=working||!buckets.length;
  }
  function selectTab(which,focus=false){
    for(const name of ['setup','urls']){
      const active=which===name,tab=$('quick-tab-'+name);
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
      $('quick-panel-'+name).hidden=!active;
      if(active&&focus)tab.focus();
    }
  }
  for(const name of ['setup','urls']){
    const tab=$('quick-tab-'+name);
    tab.onclick=()=>selectTab(name);
    tab.onkeydown=event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      selectTab(['ArrowLeft','Home'].includes(event.key)?'setup':'urls',true);
    };
  }

  async function loadAccounts(preferred=''){
    const version=++accountVersion;
    account.replaceChildren(option('','Finding your Cloudflare account…'));
    accounts=[];buttons();
    try{
      const result=await request('cfAccounts');
      if(version!==accountVersion)return;
      accounts=result.accounts||[];
      account.replaceChildren(option('','Choose your account…'),...accounts.map(a=>option(a.id,a.name||a.id)));
      account.value=accounts.some(a=>a.id===preferred)?preferred:accounts[0]?.id||'';
      await loadBuckets();
      if(!accounts.length)report(setupStatus,'Connect Cloudflare to begin. No bucket has been created.');
    }catch(error){
      if(version!==accountVersion)return;
      accounts=[];account.replaceChildren(option('','Cloudflare sign-in required'));
      report(setupStatus,error.message);
      bucket.replaceChildren(option('','Choose an account first'));
    }finally{if(version===accountVersion)buttons();}
  }
  async function loadBuckets(preferred=''){
    const version=++bucketVersion,accountId=account.value;
    ++urlVersion; // Cancel any old address render when account changes.
    buckets=[];bucket.replaceChildren(option('',accountId?'Finding buckets…':'Choose an account first'));
    buttons();
    if(!accountId)return;
    try{
      const result=await request('cfBuckets',{accountId});
      if(version!==bucketVersion||account.value!==accountId)return;
      buckets=result.buckets||[];
      bucket.replaceChildren(option('','Choose a bucket…'),...buckets.map(b=>option(b.name,b.name==='redown'?'REDOWN':b.name)));
      bucket.value=buckets.some(b=>b.name===preferred)?preferred:buckets.some(b=>b.name==='redown')?'redown':buckets[0]?.name||'';
      selectedObject=null;lastAddressSnapshot=null;lastAddressIdentity='';
      await loadUrls();
    }catch(error){
      if(version!==bucketVersion)return;
      bucket.replaceChildren(option('','Buckets could not be loaded'));
      report(urlStatus,'Could not load buckets: '+error.message);
    }finally{if(version===bucketVersion)buttons();}
  }
  const empty=()=>{
    const outer=document.createElement('div');outer.className='quick-urls-empty';
    const title=document.createElement('strong');title.textContent='Add Your First URL!';
    const detail=document.createElement('p');
    detail.textContent='Connect a domain to give every saved file a shareable address. REDOWN uses your existing Cloudflare setup and never enables public access silently.';
    outer.append(title,detail);return outer;
  };
  function renderAddresses(snapshot,source,key){
    const container=$('quick-urls-list');container.replaceChildren();
    const exact=typeof key==='string'&&key.length>0;
    $('quick-url-context').textContent=exact
      ? 'Exact URLs for '+key+' · generated using the same source and object key as Get URL.'
      : 'Bucket URL prefixes, not file links. Select one file above to reveal its full address.';
    // Same URL validation, key encoding, eligibility and state as Legacy Explorer.
    const entries=globalThis.RedownPublicAddresses.addresses(snapshot,source,exact?key:undefined);
    const unique=[...new Map(entries.map(entry=>[entry.url,entry])).values()];
    const active=unique.filter(entry=>entry.state==='configured');
    const identity=JSON.stringify([source.accountId,source.bucketName]);
    const showConsent=!active.length&&snapshot.managedPublicAccess==='disabled'&&
      !(snapshot.errors||[]).length&&dismissedPublicConsent!==identity;
    $('quick-url-consent').hidden=!showConsent;
    $('quick-url-count').textContent=String(active.length);
    if(!active.length){container.append(empty());return;}
    for(const entry of active){
      const row=document.createElement('div');row.className='quick-url-row';
      const meta=document.createElement('div');meta.className='quick-url-meta';
      const label=document.createElement('strong');label.textContent=entry.label||'Cloudflare URL';
      const url=document.createElement('code');url.textContent=entry.url;url.title=entry.url;
      const state=document.createElement('small');
      state.textContent=entry.state==='configured'?(exact?'Exact object address · public access not individually verified':'Bucket prefix · not a downloadable file URL'):
        entry.state==='restricted'?'Public access is disabled':
        entry.state==='needs-setup'?'Domain ownership, DNS or SSL needs setup':'Configuration could not be verified';
      meta.append(label,url,state);row.append(meta);
      if(entry.state==='configured'){
        const copy=document.createElement('button');copy.type='button';copy.textContent=exact?'Copy URL':'Copy prefix';
        copy.onclick=async()=>{try{
          await navigator.clipboard.writeText(entry.url);
          report(urlStatus,'URL copied. Actual file accessibility still depends on Cloudflare.');
        }catch{report(urlStatus,'Clipboard unavailable. Select and copy the address shown.');}};
        row.append(copy);
      }
      container.append(row);
    }
  }
  async function loadUrls(key=selectedObject){
    const version=++urlVersion,accountId=account.value,bucketName=bucket.value;
    const source={accountId,bucketName};
    $('quick-url-count').textContent='0';
    $('quick-url-consent').hidden=true;
    if(!accountId||!bucketName){$('quick-urls-list').replaceChildren(empty());return;}
    report(urlStatus,'Checking configured Cloudflare URLs…');
    try{
      const snapshot=await request('cfPublicAddresses',source);
      if(version!==urlVersion||account.value!==accountId||bucket.value!==bucketName)return;
      lastAddressSnapshot=snapshot;lastAddressIdentity=JSON.stringify([accountId,bucketName]);
      renderAddresses(snapshot,source,key);
      report(urlStatus,snapshot.errors?.length?'Some addresses could not be checked. Try refreshing the bucket.':
        key?'Showing URL candidates for the saved object. Public access is not guaranteed.':
        'Only configured public addresses are ready to copy.');
    }catch(error){
      if(version!==urlVersion)return;
      $('quick-urls-list').replaceChildren(empty());
      report(urlStatus,'Could not verify URL configuration: '+error.message);
    }
  }
  account.onchange=()=>{selectedObject=null;dismissedPublicConsent='';void loadBuckets();};
  bucket.onchange=()=>{selectedObject=null;lastAddressSnapshot=null;lastAddressIdentity='';dismissedPublicConsent='';buttons();void loadUrls();};
  $('quick-url-no').onclick=()=>{
    dismissedPublicConsent=JSON.stringify([account.value,bucket.value]);
    $('quick-url-consent').hidden=true;
    report(urlStatus,'This bucket remains private. No public URL was enabled.');
  };
  $('quick-url-yes').onclick=async()=>{
    if(working||!account.value||!bucket.value)return;
    const source={accountId:account.value,bucketName:bucket.value};
    const identity=JSON.stringify([source.accountId,source.bucketName]);
    if(lastAddressIdentity!==identity||lastAddressSnapshot?.managedPublicAccess!=='disabled'||(lastAddressSnapshot?.errors||[]).length){
      report(urlStatus,'Bucket public-access status changed or could not be verified. Reload the bucket URL panel before proceeding.');return;
    }
    working=true;buttons();report(urlStatus,'Enabling and verifying Cloudflare r2.dev access for '+source.bucketName+'…');
    try{
      const result=await chrome.runtime.sendMessage({type:'cfEnablePublicAccess',...source,confirmed:true});
      if(!result?.ok)throw Error(result?.error||'Cloudflare could not confirm public access. Recheck before retrying.');
      dismissedPublicConsent=identity;
      lastAddressSnapshot=null;lastAddressIdentity='';
      await loadUrls();
      report(urlStatus,'Cloudflare verified the public bucket setting. Test an individual file URL before sharing it.');
    }catch(error){
      report(urlStatus,'Public access not confirmed: '+error.message+' Check Cloudflare before retrying.');
      // The write may have succeeded: do not offer an immediate replay.
      dismissedPublicConsent=identity;
      $('quick-url-consent').hidden=true;
    }finally{working=false;buttons();}
  };
  // File selection and right-click Get URL now share the exact R2 key.
  // Reuse the last read-only Cloudflare snapshot rather than hitting the API
  // on each selection or scrolling interaction.
  document.addEventListener('redown:explorer-url-selection',event=>{
    const source=event.detail?.source;
    if(!source||source.accountId!==account.value||source.bucketName!==bucket.value)return;
    const next=typeof event.detail.key==='string'?event.detail.key:null;
    if(selectedObject===next)return;
    selectedObject=next;
    if(lastAddressSnapshot&&lastAddressIdentity===JSON.stringify([source.accountId,source.bucketName])){
      renderAddresses(lastAddressSnapshot,source,selectedObject);
    }else{
      void loadUrls();
    }
  });
  $('quick-create').onclick=async()=>{
    if(working||!account.value)return;
    const menuLabel=$('quick-menu-label').value.trim();
    if(!menuLabel||menuLabel.length>60){report(setupStatus,'Enter a menu label (1–60 characters).');return;}
    if(!confirm('Create or reuse the private Cloudflare R2 bucket named REDOWN and configure its right-click destination? Cloudflare may charge for usage above its free allowance.'))return;
    working=true;buttons();
    report(setupStatus,'Configuring your existing REDOWN storage and right-click menu…');
    try{
      const result=await request('cfSetupRedownQuick',{accountId:account.value,menuLabel,confirmed:true});
      report(setupStatus,result.setup?.verified?'Ready. Right-click a supported file → REDOWN → '+menuLabel+'. Add more Simple destinations above.':'Setup needs verification; check Cloudflare before retrying.');
      await loadBuckets('redown');
      if(result.setup?.verified){
        $('destination-first-setup').open=false;
        document.dispatchEvent(new CustomEvent('redown:destinations-ready',{detail:{accountId:account.value,bucketName:'redown'}}));
      }
    }catch(error){
      report(setupStatus,'Setup not fully confirmed: '+error.message+' Check Cloudflare before retrying.');
    }finally{working=false;buttons();}
  };
  $('quick-url-add').onclick=async()=>{
    if(working||!account.value||!bucket.value)return;
    const website=$('quick-url-input').value.trim();
    if(!website){report(urlStatus,'Enter a domain you control.');return;}
    if(!confirm('Attach '+website+' to '+bucket.value+'? REDOWN may need to prepare this bucket using its existing Cloudflare Worker setup. If public delivery is enabled, anyone with a file URL may access the object. Continue only if you intend to publish this bucket.'))return;
    working=true;buttons();report(urlStatus,'Checking the existing Cloudflare destination…');
    try{
      const accountId=account.value,bucketName=bucket.value;
      const saved=await request('profiles');
      const prepared=(saved.profiles||[]).some(p=>p.type==='cloudflare-r2'&&p.accountId===accountId&&p.bucketName===bucketName);
      if(!prepared){
        report(urlStatus,'Preparing the selected bucket with the original REDOWN Worker setup…');
        await request('cfProvision',{accountId,bucketName,profileName:bucketName,folders:{},explorerOnly:true});
      }
      report(urlStatus,'Attaching your domain through Cloudflare…');
      // Exactly the same operation as Legacy Explorer's "Use domain".
      const result=await request('cfSetAssetDomain',{accountId,bucketName,website});
      lastAddressSnapshot=null;lastAddressIdentity='';
      await loadUrls();
      $('quick-urls-section').open=true;
      if(result.state!=='verified')report(urlStatus,result.message||'Cloudflare has not verified this domain yet. Check DNS and public URL setup.');
      else report(urlStatus,'Domain verified. Check individual file access before sharing.');
      $('quick-url-input').value='';
    }catch(error){
      report(urlStatus,'Domain setup not confirmed: '+error.message+'. Refresh URLs before retrying.');
    }finally{working=false;buttons();}
  };
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.cloudflareAuth)void loadAccounts(account.value);
  });
  async function honorSavedObjectLookup(){
    const params=new URLSearchParams(location.search);
    if(params.has('savedUrlMissing')){
      selectTab('urls');
      report(urlStatus,'No matching saved object in recent REDOWN transfers. Open its bucket and use Get URL to inspect that object.');
      return;
    }
    const token=params.get('savedUrls');
    if(!token||!/^[a-z0-9-]{36}$/i.test(token))return;
    const storageKey='redownUrlLookup:'+token;
    try{
      const data=await chrome.storage.session.get(storageKey);
      await chrome.storage.session.remove(storageKey);
      const lookup=data[storageKey];
      if(!lookup||Date.now()-lookup.createdAt>60000||!accounts.some(a=>a.id===lookup.accountId))return;
      account.value=lookup.accountId;
      await loadBuckets(lookup.bucketName);
      if(bucket.value!==lookup.bucketName)return;
      selectedObject=lookup.key;
      selectTab('urls');
      $('quick-urls-section').open=true;
      await loadUrls(lookup.key);
      $('quick-panel-urls').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){report(urlStatus,'Could not load the saved object: '+error.message);}
  }
  void loadAccounts().then(honorSavedObjectLookup);
})();
