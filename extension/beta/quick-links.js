/* Cloudflare-only Explorer quick setup and public-address management.
   Uses the existing background service, no direct cloud credentials or fake URLs. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const setup=$('quick-panel-setup'),urls=$('quick-panel-urls');
  if(!setup||!urls)return;
  const account=$('quick-setup-account'),bucket=$('quick-url-bucket');
  const setupStatus=$('quick-setup-feedback'),urlStatus=$('quick-url-feedback');
  let accounts=[],buckets=[],selectedAccount='',accountEpoch=0,bucketEpoch=0,urlEpoch=0,busy=false,lookup=null;

  async function send(type,details={}){
    const answer=await chrome.runtime.sendMessage({type,...details});
    if(!answer?.ok)throw Error(answer?.error||'Cloudflare did not confirm this operation.');
    return answer;
  }
  function textStatus(target,message){target.textContent=message||'';}
  function selectedBucket(){return buckets.find(b=>b.name===bucket.value);}
  function setBusy(value){busy=value;$('quick-create').disabled=value||!account.value;
    $('quick-url-add').disabled=value||!selectedBucket();}
  function switchTab(which,focus=false){
    const onUrls=which==='urls';
    setup.hidden=onUrls;urls.hidden=!onUrls;
    for(const [id,active] of [['quick-tab-setup',!onUrls],['quick-tab-urls',onUrls]]){
      const el=$(id);el.setAttribute('aria-selected',String(active));el.tabIndex=active?0:-1;
      if(active&&focus)el.focus();
    }
  }
  for(const which of ['setup','urls']){
    const el=$('quick-tab-'+which);
    el.addEventListener('click',()=>switchTab(which));
    el.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();switchTab(event.key==='ArrowLeft'||event.key==='Home'?'setup':'urls',true);
    });
  }
  async function loadAccounts(preferred=''){
    const ticket=++accountEpoch;
    account.replaceChildren(new Option('Checking Cloudflare accounts…',''));
    account.disabled=true;bucket.replaceChildren(new Option('Choose a bucket…',''));
    setBusy(true);
    try{
      accounts=(await send('cfAccounts')).accounts||[];
      if(ticket!==accountEpoch)return;
      account.replaceChildren(new Option('Select an account…',''),...accounts.map(a=>new Option(a.name||a.id,a.id)));
      account.value=accounts.some(a=>a.id===preferred)?preferred:accounts[0]?.id||'';
      account.disabled=false;selectedAccount=account.value;
      await loadBuckets(account.value);
      if(!accounts.length)textStatus(setupStatus,'Connect Cloudflare to discover an account and enable right-click setup.');
    }catch(error){
      if(ticket!==accountEpoch)return;
      account.replaceChildren(new Option('Cloudflare sign-in needed',''));selectedAccount='';
      textStatus(setupStatus,error.message);
    }finally{if(ticket===accountEpoch)setBusy(false);}
  }
  async function loadBuckets(accountId){
    const ticket=++bucketEpoch;
    selectedAccount=accountId;
    const old=bucket.value;
    bucket.replaceChildren(new Option(accountId?'Loading buckets…':'Select an account first',''));
    buckets=[];setBusy(true);
    if(!accountId){setBusy(false);return;}
    try{
      const result=await send('cfBuckets',{accountId});
      if(ticket!==bucketEpoch)return;
      buckets=result.buckets||[];
      bucket.replaceChildren(new Option('Choose a bucket…',''),...buckets.map(b=>new Option(b.name==='redown'?'REDOWN · redown':b.name,b.name)));
      bucket.value=buckets.some(b=>b.name===old)?old:buckets.some(b=>b.name==='redown')?'redown':buckets[0]?.name||'';
      await loadUrls();
    }catch(error){
      if(ticket!==generation)return;
      bucket.replaceChildren(new Option('Bucket lookup failed',''));
      textStatus(urlStatus,'Could not discover buckets: '+error.message);
    }finally{if(ticket===bucketEpoch)setBusy(false);}
  }
  function publicObjectUrl(base,key){
    const url=new URL(base);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.hostname)return null;
    const suffix=key==null?'':String(key).split('/').map(encodeURIComponent).join('/');
    return url.href.replace(/\/+$/,'')+'/'+suffix;
  }
  function drawEmpty(){
    const wrap=document.createElement('div');wrap.className='quick-urls-empty';
    const head=document.createElement('strong');head.textContent='Add Your First URL!';
    const desc=document.createElement('p');
    desc.textContent='Connect an HTTPS domain you control and REDOWN can generate a shareable URL for every file in that bucket. Public access is never enabled without your confirmation.';
    wrap.append(head,desc);return wrap;
  }
  function renderUrls(data,objectKey=null){
    const list=$('quick-urls-list');list.replaceChildren();
    const addresses=(data.addresses||[]).filter(a=>typeof a.base==='string');
    const eligible=addresses.filter(a=>a.state==='configured');
    $('quick-url-count').textContent=String(eligible.length);
    if(!eligible.length){list.append(drawEmpty());return;}
    for(const item of addresses){
      const link=publicObjectUrl(item.base,objectKey);
      if(!link)continue;
      const row=document.createElement('div');row.className='quick-url-row';
      const meta=document.createElement('div');meta.className='quick-url-meta';
      const title=document.createElement('strong');title.textContent=item.label||'Public URL';
      const code=document.createElement('code');code.textContent=link;code.title=link;
      const note=document.createElement('small');
      note.textContent=item.state==='configured'?'Configured in Cloudflare · object accessibility not individually verified':
        item.state==='needs-setup'?'Domain needs Cloudflare setup':'Not publicly available';
      meta.append(title,code,note);row.append(meta);
      if(item.state==='configured'){
        const copy=document.createElement('button');copy.type='button';copy.textContent='Copy URL';
        copy.addEventListener('click',async()=>{
          try{await navigator.clipboard.writeText(link);textStatus(urlStatus,'URL copied. Actual public file access depends on Cloudflare permissions and propagation.');}
          catch{textStatus(urlStatus,'Clipboard access failed. Select and copy the address instead.');}
        });
        row.append(copy);
      }
      list.append(row);
    }
  }
  async function loadUrls(objectKey=null){
    const accountId=selectedAccount,bucketName=bucket.value;
    if(!accountId||!bucketName){$('quick-url-count').textContent='0';$('quick-urls-list').replaceChildren(drawEmpty());return;}
    const ticket=++urlEpoch;
    textStatus(urlStatus,'Reading Cloudflare public URL configuration…');
    try{
      const result=await send('cfPublicAddresses',{accountId,bucketName});
      if(ticket!==urlEpoch||account.value!==accountId||bucket.value!==bucketName)return;
      renderUrls(result,objectKey);
      textStatus(urlStatus,result.errors?.length?'Some Cloudflare addresses could not be checked. Refresh before copying.':'Configured addresses are displayed below. A configured address does not prove individual files are accessible.');
    }catch(error){if(ticket===urlEpoch){$('quick-urls-list').replaceChildren(drawEmpty());textStatus(urlStatus,'Could not verify public URLs: '+error.message);}}
  }

  account.addEventListener('change',()=>{void loadBuckets(account.value);});
  bucket.addEventListener('change',()=>{setBusy(false);void loadUrls();});
  $('quick-create').addEventListener('click',async()=>{
    if(busy||!account.value)return;
    const label=$('quick-menu-label').value.trim();
    if(!label||label.length>60){textStatus(setupStatus,'Enter a menu label between 1 and 60 characters.');return;}
    if(!confirm('Set up Cloudflare right-click save? REDOWN will create or reuse the private \"redown\" bucket and deploy/verify its R2 Worker. Cloudflare may charge for usage beyond its free allowance.'))return;
    setBusy(true);textStatus(setupStatus,'Checking the REDOWN bucket and configuring the save destination…');
    try{
      const result=await send('cfSetupRedownQuick',{accountId:account.value,menuLabel:label,confirmed:true});
      textStatus(setupStatus,'Ready: '+result.setup.name+' → REDOWN bucket root. Right-click a supported file to save.');
      document.dispatchEvent(new CustomEvent('redown:quick-destination-configured',{detail:{accountId:account.value,bucketName:'redown'}}));
      await loadBuckets(account.value);
    }catch(error){textStatus(setupStatus,'Setup was not fully verified: '+error.message+' Check Cloudflare before retrying.');}
    finally{setBusy(false);}
  });
  $('quick-url-add').addEventListener('click',async()=>{
    if(busy||!account.value||!bucket.value)return;
    let url;
    try{
      url=new URL($('quick-url-input').value.trim());
      if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw Error();
    }catch{textStatus(urlStatus,'Enter an HTTPS hostname you own, such as https://assets.example.com (no paths).');return;}
    if(!confirm('Attach '+url.origin+' to '+bucket.value+'? This changes Cloudflare domain routing and may expose ALL objects in this bucket publicly. Only proceed for a domain you control and intend to publish.'))return;
    setBusy(true);textStatus(urlStatus,'Asking Cloudflare to attach and verify this public hostname…');
    try{
      const result=await send('cfAddBucketUrl',{accountId:account.value,bucketName:bucket.value,website:url.origin,confirmed:true});
      $('quick-url-input').value='';
      await loadUrls();
      textStatus(urlStatus,result.state==='unknown'||result.state==='needs-setup'?result.message||'Cloudflare has not verified the URL yet. Check setup and refresh.':'Cloudflare accepted the domain setup. Verify actual file access before sharing.');
      $('quick-urls-section').open=true;
    }catch(error){textStatus(urlStatus,'No confirmed URL change: '+error.message);}
    finally{setBusy(false);}
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.cloudflareAuth)void loadAccounts(account.value);
  });
  async function openLookup(){
    const params=new URLSearchParams(location.search),token=params.get('savedUrls');
    if(!token||!/^[a-zA-Z0-9-]{10,80}$/.test(token))return;
    const key='redownUrlLookup:'+token;
    try{
      const store=await chrome.storage.session.get(key);
      await chrome.storage.session.remove(key);
      lookup=store[key];if(!lookup||Date.now()-lookup.createdAt>60000)return;
      if(!accounts.some(a=>a.id===lookup.accountId))return;
      account.value=lookup.accountId;
      await loadBuckets(account.value);
      bucket.value=lookup.bucketName;
      switchTab('urls');
      $('quick-urls-section').open=true;
      await loadUrls(lookup.key);
      textStatus(urlStatus,'Showing configured public URL candidates for: '+lookup.key+'. Object access is not guaranteed.');
      $('quick-panel-urls').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){textStatus(urlStatus,'Could not open saved object URLs: '+error.message);}
  }
  void loadAccounts().then(openLookup);
})();
