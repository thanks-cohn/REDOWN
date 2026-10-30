/* Modern presentation over the existing profile, Simple and Nested contracts. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),C=RedownDestinationConfig,M=RedownNestedLocations;
  if(!$('destination-mode'))return;
  let profiles=[],accounts=[],mode='simple',expected='',dirty=false,saving=false,mounted=false,epoch=0,reads=0,firstSetupDisclosureInitialized=false,activatingLocation=false;
  const bucketCache=new Map();let unassigned=[];
  const status=text=>$('destination-status').textContent=text;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(text,action,label=text)=>{const n=el('button','',text);n.type='button';n.setAttribute('aria-label',label);n.onclick=()=>Promise.resolve().then(action).catch(error=>status(error.message));return n;};
  const request=async(type,fields={})=>{const r=await chrome.runtime.sendMessage({type,...fields});if(!r?.ok)throw Error(r?.error||'Request failed. Retry.');return r;};
  const usable=()=>profiles.filter(p=>p.type==='cloudflare-r2'&&p.accountId);
  const included=()=>usable().filter(p=>!p.explorerManaged&&p.showInContextMenu!==false).sort((a,b)=>(a.menuOrder??999)-(b.menuOrder??999));
  function changed(){dirty=true;status('Unsaved changes · Save menu to update Chrome.');}
  function setMode(){const nested=mode==='nested';$('destination-mode').setAttribute('aria-pressed',String(nested));$('destination-mode').setAttribute('aria-label','Switch to '+(nested?'Simple':'Nested'));$('destination-simple').hidden=nested;$('destination-nested').hidden=!nested;if(nested&&!mounted)mountNested();}
  function mountNested(){mounted=true;RedownNestedEditor.mount($('destination-nested'),{
    profiles:()=>profiles,existingOnly:true,startCollapsed:true,
    send:async message=>{reads++;try{return await request(message.type,message);}finally{reads--;}} ,
    save:async()=>{changed();},saveOrder:async()=>{profiles.forEach((p,i)=>p.menuOrder=i);changed();}
  });}
  async function load(){
    if(saving)return;if(dirty&&!confirm('Discard unsaved menu edits and reload?'))return;
    const version=++epoch;
    const stored=await chrome.storage.local.get(['profiles','rightClickMode']);
    // The background is authoritative. Another Explorer tab may have just
    // provisioned a bucket before its local storage event reaches this page.
    let latest;try{latest=(await request('profiles')).profiles;}catch{}
    if(version!==epoch)return;
    unassigned=[];profiles=structuredClone(latest||stored.profiles||[]);$('destination-legacy-fallback').hidden=!profiles.some(p=>p.type==='github');mode=M.menuMode(stored.rightClickMode,profiles);expected=C.signature(profiles,mode);dirty=false;mounted=false;
    // Idempotent in-memory migration. It is persisted only on explicit Save.
    for(const p of usable())p.nestedMenu||=M.fromLegacy(p);
    const selector=$('destination-profile');selector.replaceChildren(...usable().map(p=>new Option((p.accountName||p.accountId)+' / '+p.bucketName,p.id)));
    renderSimple();setMode();
    if(!firstSetupDisclosureInitialized){
      firstSetupDisclosureInitialized=true;
      $('destination-first-setup').open=usable().length===0;
    }
    status(usable().length?'Choose a layout and design your right-click menu.':'Choose an existing Cloudflare bucket, then Activate Buckets beside Refresh, or prepare REDOWN storage below.');
    try{accounts=(await request('cfAccounts')).accounts||[];}catch(error){status('Saved destinations loaded. '+error.message);}
  }
  async function save(){
    if(saving)return;
    if(reads){status('Locations are still being checked. Try Save again when loading finishes.');return;}if(unassigned.length)throw Error('Assign a prepared account to every new card before saving.');C.validate(profiles,mode);saving=true;
    // Freeze all editor controls for the bounded save. No in-flight keystroke can be lost.
    const locked=[...$('quick-panel-setup').querySelectorAll('button,input,select')],disabled=locked.map(n=>n.disabled);locked.forEach(n=>n.disabled=true);
    status('Saving and updating Chrome’s menu…');
    try{
      const snapshot=C.project(profiles);
      const result=await request('saveDestinationConfig',{expected,mode,profiles:snapshot});
      expected=result.signature;dirty=false;
      status(result.menuUpdated?'Saved · Chrome’s right-click menu is up to date.':result.error);
    }catch(error){status('Not saved: '+error.message+' Your draft is still here.');}
    finally{saving=false;locked.forEach((n,i)=>{if(n.isConnected)n.disabled=disabled[i];});}
  }
  function rows(){const result=[];for(const p of included()){
    if(p.simplePrimaryEnabled!==false)result.push({p,base:true,id:p.id,label:p.menuLabel||'',bucket:p.simpleBucketName||p.bucketName,prefix:p.defaultPrefix||''});
    for(const item of p.simpleOptions||[])result.push({p,item,id:item.id,label:item.label||'',bucket:item.bucketName||p.bucketName,prefix:item.prefix||''});
  }result.push(...unassigned);return result.sort((a,b)=>(a.base?(a.p.simplePrimaryOrder??999999):(a.item.order??999999))-(b.base?(b.p.simplePrimaryOrder??999999):(b.item.order??999999)));}
  function update(row,key,value){
    row[key]=value;
    if(row.base){row.p[{label:'menuLabel',bucket:'simpleBucketName',prefix:'defaultPrefix'}[key]]=value;}
    else row.item[{label:'label',bucket:'bucketName',prefix:'prefix'}[key]]=value;
    changed();
  }
  function renderSimple(onlyId){
    const host=$('destination-simple');if(!onlyId){for(const b of host.querySelectorAll('button'))b._picker?.close();host.replaceChildren();}else host.querySelector('.destination-empty')?.remove();
    const list=onlyId?rows().filter(row=>row.id===onlyId):rows();if(!list.length)host.append(el('p','destination-empty','Choose your existing Cloudflare bucket, then click Activate Buckets by Refresh. After activation, + Location adds Simple menu destinations.'));
    for(const row of list){
      const card=el('article','destination-card');card.dataset.destinationId=row.id;
      const head=el('div','destination-card-head');
      const label=el('input');label.value=row.label;label.maxLength=60;label.placeholder='Menu label';label.setAttribute('aria-label','Menu label');label.oninput=()=>update(row,'label',label.value);
      const move=delta=>{const entries=rows(),i=entries.findIndex(r=>r.id===row.id),j=i+delta;if(j<0||j>=entries.length)return;[entries[i],entries[j]]=[entries[j],entries[i]];entries.forEach((r,index)=>{if(r.base)r.p.simplePrimaryOrder=index;else r.item.order=index;});changed();renderSimple();};
      head.append(label,button('↑',()=>move(-1),'Move destination up'),button('↓',()=>move(1),'Move destination down'),button('×',()=>{if(row.base)row.p.simplePrimaryEnabled=false;else if(row.draft)unassigned=unassigned.filter(r=>r!==row);else row.p.simpleOptions=row.p.simpleOptions.filter(i=>i!==row.item);changed();renderSimple();},'Remove menu destination'));
      const fields=el('div','destination-card-fields');
      const account=el('select');account.setAttribute('aria-label','Cloudflare account');
      const choices=[...new Map([...accounts.map(a=>[a.id,a]),...usable().map(p=>[p.accountId,{id:p.accountId,name:accounts.find(a=>a.id===p.accountId)?.name||p.accountName||p.accountId}])]).values()];
      if(row.draft)account.add(new Option('Choose account…',''));
      for(const a of choices)account.add(new Option(a.name,a.id));account.value=row.p.accountId;
      const bucket=el('select');bucket.setAttribute('aria-label','Bucket');
      // Prepared profiles are required by the original transfer engine. Discovery is read-only.
      const bucketLabel=el('label','', 'Bucket');bucketLabel.append(bucket);
      const accountLabel=el('label','','Cloudflare account');accountLabel.append(account);
      const destination=el('code','destination-path',row.base&&row.p.defaultPrefix==null?row.bucket+' / Automatic folder by file type (legacy)':row.bucket+'/'+row.prefix);destination.title=destination.textContent;
      const folders=el('div','destination-folders');
      const choose=button('Choose folder',async()=>{
        folders.replaceChildren();folders.hidden=false;
        const picker=RedownDestinationMenus.create({document,
          loadPage:target=>request('cfDestinationFolders',target),
          onChoose:(_op,target)=>{update(row,'prefix',target.prefix.replace(/\/$/,''));destination.textContent=row.bucket+'/'+row.prefix;picker.close();folders.hidden=true;},
          onError:error=>status(error.message),onDismiss:()=>{folders.hidden=true;}
        });
        picker.attach(folders,{operation:'select',accounts:[{id:row.p.accountId}],buckets:new Map([[row.p.accountId,[{name:row.bucket}]]]),source:{accountId:'',bucketName:'',prefix:''},items:[{key:'menu-destination'}]});
        folders.querySelector('button')?.click();
        choose._picker?.close();choose._picker=picker;
      });
      const root=button('Bucket root',()=>{choose._picker?.close();folders.hidden=true;update(row,'prefix','');destination.textContent=row.bucket+'/';});
      const loadBuckets=async()=>{
        if(!row.p.accountId){bucket.replaceChildren(new Option('Activate a bucket to add locations',''));choose.disabled=true;root.disabled=true;return;}
        const version=epoch;bucket.replaceChildren(new Option('Loading buckets…',''));bucket.disabled=true;
        try{let cached=bucketCache.get(row.p.accountId);if(!cached){cached=request('cfBuckets',{accountId:row.p.accountId}).catch(error=>{bucketCache.delete(row.p.accountId);throw error;});bucketCache.set(row.p.accountId,cached);}const result=await cached;if(version!==epoch||!card.isConnected)return;
          bucket.replaceChildren();for(const b of result.buckets||[]){const option=new Option(b.name,b.name);option.disabled=!usable().some(p=>p.accountId===row.p.accountId&&p.bucketName===b.name);if(option.disabled)option.textContent+=' · setup required';bucket.add(option);}
          bucket.value=row.bucket;bucket.disabled=false;
        }catch(error){if(card.isConnected){bucket.replaceChildren(new Option('Could not load buckets',''));status(error.message);}}
      };
      account.onchange=()=>{
        const target=usable().find(p=>p.accountId===account.value);if(!target){status('Prepare storage for this account using Explorer bucket tools or REDOWN setup below.');account.value=row.p.accountId;return;}
        if(row.base){row.p.simplePrimaryEnabled=false;row.item={id:row.id,label:row.label,bucketName:row.bucket,prefix:row.prefix,order:row.p.simplePrimaryOrder};row.base=false;}else if(row.draft){unassigned=unassigned.filter(r=>r!==row);row.draft=false;}else row.p.simpleOptions=row.p.simpleOptions.filter(i=>i!==row.item);row.p=target;if(target.explorerManaged||target.showInContextMenu===false)target.simplePrimaryEnabled=false;target.explorerManaged=false;target.showInContextMenu=true;(target.simpleOptions||=[]).push(row.item);row.item.bucketName=target.bucketName;row.item.prefix='';changed();renderSimple();
      };
      bucket.onchange=()=>{choose._picker?.close();update(row,'bucket',bucket.value);update(row,'prefix','');destination.textContent=bucket.value+'/';};
      fields.append(accountLabel,bucketLabel,choose,root);card.append(head,fields,destination,folders);host.append(card);void loadBuckets();
    }
  }
  $('destination-mode').onclick=()=>{if(saving)return;mode=mode==='simple'?'nested':'simple';changed();setMode();};
  $('destination-add').onclick=async()=>{
    if(saving||activatingLocation)return;
    let activatedSource=null;
    // Adopt the original Cloudflare-created destination if it was prepared
    // in the other Explorer, without requiring a second REDOWN bucket.
    if(!usable().length&&!dirty)try{await load();}catch{}
    if(!usable().length){
      const accountId=$('accounts')?.value||'';
      const bucketName=$('buckets')?.querySelector('button[aria-current]')?.dataset.bucket||'';
      if(!accountId||!bucketName){
        status('Choose a bucket in the Storage Buckets sidebar first. Then click Activate Buckets next to Refresh. No new bucket is required.');
        $('destination-first-setup').open=true;return;
      }
      if(!confirm('Activate your existing Cloudflare bucket '+bucketName+' for REDOWN right-click destinations? This deploys or updates its private REDOWN Worker. It does not enable public file URLs.'))return;
      status('Activating '+bucketName+' so you can add Simple menu locations…');
      activatingLocation=true;$('destination-add').disabled=true;
      try{
        await request('cfProvision',{accountId,bucketName,profileName:bucketName,folders:{},explorerOnly:false});
        await load();activatedSource={accountId,bucketName};
      }catch(error){status('Could not activate '+bucketName+': '+error.message+'. Your Cloudflare bucket was not deleted.');return;}
      finally{activatingLocation=false;$('destination-add').disabled=false;}
      if(!usable().some(p=>p.accountId===accountId&&p.bucketName===bucketName)){status('Activation was not reflected in saved destinations. Check Cloudflare before trying again.');return;}
      $('destination-profile').value=usable().find(p=>p.accountId===accountId&&p.bucketName===bucketName).id;
    }
    const available=usable();
    if(mode==='nested'){
      const p=available.find(p=>p.id===$('destination-profile').value)||available[0];p.explorerManaged=false;p.nestedMenu||=M.fromLegacy(p);p.nestedMenu.enabled=true;
      if(!mounted)mountNested();await RedownNestedEditor.addLocation(p.id);changed();if(activatedSource)document.dispatchEvent(new CustomEvent('redown:destinations-ready',{detail:activatedSource}));return;
    }
    const p=available.find(p=>p.id===$('destination-profile').value)||available[0];
    if(p.explorerManaged||p.showInContextMenu===false)p.simplePrimaryEnabled=false;
    p.explorerManaged=false;p.showInContextMenu=true;
    rows().forEach((r,i)=>{if(r.base)r.p.simplePrimaryOrder=i;else r.item.order=i;});
    const id=crypto.randomUUID();(p.simpleOptions||=[]).push({id,label:'New location',bucketName:p.bucketName,prefix:'',order:rows().length});
    changed();renderSimple(id);if(activatedSource)document.dispatchEvent(new CustomEvent('redown:destinations-ready',{detail:activatedSource}));const last=$('destination-simple').lastElementChild;last?.querySelector('input')?.focus();last?.scrollIntoView?.({block:'nearest'});
  };
  $('destination-save').onclick=()=>save().catch(error=>status(error.message));
  $('destination-reload').onclick=()=>load().catch(error=>status(error.message));
  document.addEventListener('click',event=>{if(!event.target.closest('.destination-card'))for(const b of $('destination-simple').querySelectorAll('button'))b._picker?.close();});
  document.addEventListener('redown:destinations-ready',()=>{if(!dirty&&!saving&&!activatingLocation)void load().catch(error=>status('Refresh destinations: '+error.message));});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||saving||activatingLocation)return;
    if(changes.profiles||changes.rightClickMode){if(dirty){status('Saved configuration changed. Your draft is preserved; Reload before saving.');return;}void load().catch(error=>status(error.message));}
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  void load().catch(error=>status('Could not load destinations: '+error.message));
})();
