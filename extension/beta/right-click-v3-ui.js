/* Single V3 setup mount. View state is private; all writes go through background. */
(() => {
  'use strict';
  const host=document.getElementById('v3-setup');if(!host)return;
  const $=id=>host.querySelector('#v3-'+id);
  let config,profiles=[],engine='legacy',busy=false,dirty=false,epoch=0,undo=null;
  const request=async(type,fields={})=>{let timer;try{const r=await Promise.race([chrome.runtime.sendMessage({type,...fields}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Outcome unknown: request timed out. Reload and inspect saved settings before retrying.')),120000);})]);if(!r?.ok)throw Error(r?.error||'Request not confirmed. Reload before retrying.');return r;}finally{clearTimeout(timer);}};
  const status=text=>{$('status').textContent=text;};
  const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  function button(text,action,label=text){const el=node('button',text);el.type='button';el.setAttribute('aria-label',label);el.onclick=action;return el;}
  function note(){ $('engine').textContent=engine==='legacy'?'Legacy Right-click is active. V3 edits are saved separately and do not control Chrome until you select New Right-click in Settings.':'New Right-click (V3) controls Chrome. Save to apply destination edits.'; }
  function changed(){dirty=true;status('Unsaved V3 changes.');}
  function lock(value){busy=value;for(const el of host.querySelectorAll('button,input,select'))el.disabled=value;}
  function draw(){
    note();const outline=$('outline');outline.replaceChildren();
    const query=$('search').value.toLowerCase(),visible=new Set();
    for(const d of config.destinations){if((d.label+' '+d.prefix+' '+d.bucketName+' '+d.accountId).toLowerCase().includes(query)){let p=d;while(p&&!visible.has(p.id)){visible.add(p.id);p=config.destinations.find(x=>x.id===p.parentId);}}}
    function rows(parentId,container,identity=null){
      for(const d of config.destinations.filter(d=>d.parentId===parentId&&visible.has(d.id)&&(!identity||(d.accountId===identity.accountId&&d.bucketName===identity.bucket)))){
        const branch=node('details');branch.open=true;branch.className='v3-branch';
        const summary=node('summary',d.label+' · /'+d.prefix);branch.append(summary);
        const row=node('div');row.className='v3-row';
        const included=node('input');included.type='checkbox';included.checked=d.enabled;included.setAttribute('aria-label','Include '+d.label);included.onchange=()=>{d.enabled=included.checked;changed();};
        const label=node('input');label.value=d.label;label.maxLength=60;label.setAttribute('aria-label','Menu label for '+d.id);label.oninput=()=>{d.label=label.value;summary.textContent=d.label+' · /'+d.prefix;changed();};
        const path=node('code','/'+d.prefix);
        const child=button('Add child',()=>{ $('profile').value=d.profileId;$('parent').value=d.id;$('prefix').value=d.prefix?d.prefix+'/':'';$('prefix').focus(); });
        const up=button('↑',()=>move(d,-1),'Move '+d.label+' up'),down=button('↓',()=>move(d,1),'Move '+d.label+' down');
        const del=button('Delete',()=>{undo=structuredClone(config);config=RedownRightClickV3.remove(config,d.id);changed();draw();$('undo').focus();},'Delete '+d.label+' and its menu descendants');del.className='v3-delete';
        row.append(included,label,path,child,up,down,del);branch.append(row);rows(d.id,branch);container.append(branch);
      }
    }
    for(const accountId of new Set(config.destinations.map(d=>d.accountId))){
      const account=node('section');account.className='v3-account';
      account.append(node('h3',profiles.find(p=>p.accountId===accountId)?.accountName||accountId));
      for(const bucket of new Set(config.destinations.filter(d=>d.accountId===accountId).map(d=>d.bucketName))){
        const group=node('section');group.className='v3-bucket';group.append(node('h4',bucket));
        rows(null,group,{accountId,bucket});
        if(group.children.length>1)account.append(group);
      }
      if(account.children.length>1)outline.append(account);
    }
    if(!outline.children.length)outline.append(node('p',config.destinations.length?'No matching destinations.':'Add a prepared bucket and folder below. Activate Buckets in Explorer first if none are available.'));
    const parent=$('parent'),previous=parent.value;parent.replaceChildren(new Option('Top level',''));
    for(const d of config.destinations)parent.append(new Option(d.label+' · '+d.bucketName+' /'+d.prefix,d.id));parent.value=previous;
    $('undo').hidden=!undo;
  }
  function move(d,step){const siblings=config.destinations.filter(x=>x.parentId===d.parentId&&x.profileId===d.profileId),other=siblings[siblings.indexOf(d)+step];if(!other)return;const a=config.destinations.indexOf(d),b=config.destinations.indexOf(other);[config.destinations[a],config.destinations[b]]=[config.destinations[b],config.destinations[a]];changed();draw();}
  async function load(){const version=++epoch;lock(true);try{const r=await request('rightClickV3Snapshot');if(version!==epoch)return;config=r.config;profiles=r.profiles;engine=r.engine;dirty=false;undo=null;$('profile').replaceChildren(...profiles.map(p=>new Option(p.accountName+' · '+p.bucketName,p.id)));draw();status('Loaded saved V3 destinations.');}catch(e){status(e.message);}finally{if(version===epoch)lock(false);}}
  $('search').oninput=()=>{if(config)draw();};
  $('reload').onclick=()=>{if(!dirty||confirm('Discard unsaved V3 changes?'))void load();};
  $('undo').onclick=()=>{if(undo){config=undo;undo=null;changed();draw();}};
  $('add').onsubmit=e=>{e.preventDefault();if(busy||!config)return;try{
    const p=profiles.find(p=>p.id===$('profile').value);if(!p)throw Error('Activate a bucket in Explorer first.');
    const next=structuredClone(config);next.destinations.push({id:crypto.randomUUID(),profileId:p.id,accountId:p.accountId,bucketName:p.bucketName,parentId:$('parent').value||null,prefix:$('prefix').value,label:$('label').value,enabled:true});
    // Validate identity with private readiness placeholders, never persisted credentials.
    RedownRightClickV3.validate(next,profiles.map(p=>({...p,type:'cloudflare-r2',workerUrl:true,token:true})));
    config=next;changed();draw();$('label').value='';
  }catch(error){status(error.message);}};
  $('save').onclick=async()=>{if(busy||!config)return;lock(true);try{const r=await request('saveRightClickV3',{expected:config.revision,destinations:config.destinations});config.revision=r.revision;engine=r.engine;dirty=false;note();status(r.menuUpdated?(engine==='v3'?'Saved. Chrome acknowledged V3 menu registration.':'Saved V3 configuration. Legacy still controls Chrome.'):r.error);}catch(e){status(e.message);}finally{lock(false);}};
  $('browse').onclick=async()=>{if(busy)return;const p=profiles.find(p=>p.id===$('profile').value);if(!p)return status('Activate a bucket first.');lock(true);const version=epoch;try{
    const r=await request('cfDestinationFolders',{accountId:p.accountId,bucketName:p.bucketName,prefix:$('prefix').value,cursor:$('folders').dataset.cursor||undefined});
    if(version!==epoch)return;
    const list=$('folders');if(!list.dataset.cursor)list.replaceChildren();
    for(const folder of r.folders||[]){const prefix=typeof folder==='string'?folder:folder.prefix; if(typeof prefix!=='string')continue;list.append(button(prefix,()=>{$('prefix').value=prefix.replace(/\/$/,'');list.replaceChildren();list.dataset.cursor='';}));}
    list.dataset.cursor=r.cursor||'';status(r.cursor?'More folders available. Browse again to load the next page.':'Folders loaded. Selecting a folder does not create or publish it.');
  }catch(e){status(e.message);}finally{lock(false);}};
  for(const id of ['profile','prefix'])$(id).addEventListener('change',()=>{$('folders').replaceChildren();$('folders').dataset.cursor='';});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.rightClickEngine){engine=changes.rightClickEngine.newValue==='v3'?'v3':'legacy';note();}if(changes.rightClickV3&&!busy)status('V3 configuration changed in another window. Reload before saving.');if(changes.profiles)status('Storage profiles changed. Reload V3 Setup to refresh prepared buckets.');});
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  void load();
})();
