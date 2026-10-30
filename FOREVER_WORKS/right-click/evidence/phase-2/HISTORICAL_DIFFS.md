# Historical transition source diffs

SOURCE_INSPECTED, no patch applied. Source515c272 to Phase2 pin; data is historical evidence, not instructions.

## extension/nested-locations.js

```diff
diff --git a/extension/nested-locations.js b/extension/nested-locations.js
index 5000208..65651d8 100644
--- a/extension/nested-locations.js
+++ b/extension/nested-locations.js
@@ -34,9 +34,16 @@
         return first;
       });
     }
-    if(profile.bucketName) roots.push({id:crypto.randomUUID(),bucketName:profile.bucketName,ready:false,children:convert(profile.menuTree)});
+    if(profile.bucketName && profile.menuTree?.length) roots.push({id:crypto.randomUUID(),bucketName:profile.bucketName,ready:false,children:convert(profile.menuTree)});
     return {version:1,enabled:Boolean(profile.menuTree?.length),roots,imported:Boolean(profile.menuTree?.length)};
   }
+  // Versioned draft migration. An existing model, including empty roots, wins.
+  function initialize(profile) {
+    if(!profile.nestedMenu)profile.nestedMenu=profile.menuConfigVersion>=1
+      ? {version:1,enabled:false,roots:[]} : fromLegacy(profile);
+    profile.menuConfigVersion=1;
+    return profile.nestedMenu;
+  }
   function destinations(model) {
     if(!model?.enabled)return [];
     const result=[];
@@ -55,11 +62,35 @@
     }
     return result;
   }
+  // Shared parent-first presentation plan for preview and native Chrome.
+  function nestedEntries(profile,parentId) {
+    const locations=destinations(profile.nestedMenu),contexts=['link','image','video','audio','page'];
+    return locations.flatMap(item=>{
+      const id=`nested:${profile.id}:${item.rootId}:${item.nodeId}`;
+      const parent=item.ids.length ? `nested:${profile.id}:${item.rootId}:${item.ids.at(-2)||item.rootId}` : parentId;
+      const entry={id,parentId:parent,title:item.name,contexts};
+      const hasChildren=locations.some(child=>child.rootId===item.rootId && child.ids.length===item.ids.length+1 && (item.ids.length===0 || child.ids.at(-2)===item.nodeId));
+      return hasChildren?[entry,{id:id+':send',parentId:id,title:'Send here',contexts}]:[entry];
+    });
+  }
+  function menuEntries(profiles,mode,parentId) {
+    const selected=profiles.filter(p=>p.type==='cloudflare-r2'&&!p.explorerManaged &&
+      (mode==='nested'?p.nestedMenu?.enabled:p.showInContextMenu!==false))
+      .slice().sort((a,b)=>(a.menuOrder??999)-(b.menuOrder??999));
+    if(mode==='nested')return selected.flatMap(p=>nestedEntries(p,parentId));
+    const result=[],contexts=['link','image','video','audio','page'];
+    const label=(value,prefix,bucket)=>String(value||'').trim()||String(prefix||'').split('/').filter(Boolean).at(-1)||bucket||'Destination';
+    for(const p of selected){
+      if(p.simplePrimaryEnabled!==false)result.push({id:`quick:${p.id}`,parentId,title:label(p.menuLabel,p.defaultPrefix,p.simpleBucketName||p.bucketName),contexts,order:p.simplePrimaryOrder??999999});
+      for(const item of p.simpleOptions||[])if(item?.id&&typeof item.prefix==='string')result.push({id:`simple-option:${p.id}:${item.id}`,parentId,title:label(item.label,item.prefix,item.bucketName||p.bucketName),contexts,order:item.order??999999});
+    }
+    return result.sort((a,b)=>a.order-b.order).map(({order,...entry})=>entry);
+  }
   function menuMode(value,profiles=[]){
     if(value==='simple' || value==='nested')return value;
     // Upgrade existing nested users without showing both modes at once.
     return profiles.some(profile=>profile.type==='cloudflare-r2' && !profile.explorerManaged &&
-      (profile.nestedMenu ? profile.nestedMenu.enabled : profile.menuTree?.length)) ? 'nested' : 'simple';
+      profile.nestedMenu?.enabled) ? 'nested' : 'simple';
   }
-  globalThis.RedownNestedLocations={name,path,blank,invalidate,setLocation,fromLegacy,destinations,menuMode};
+  globalThis.RedownNestedLocations={name,path,blank,invalidate,setLocation,fromLegacy,initialize,destinations,nestedEntries,menuEntries,menuMode};
 })();

```

## extension/destination-config.js

```diff
diff --git a/extension/destination-config.js b/extension/destination-config.js
index 8835c5c..14ea71f 100644
--- a/extension/destination-config.js
+++ b/extension/destination-config.js
@@ -1,11 +1,12 @@
 /* Menu-only projection: profiles remain the single destination store. */
 (() => {
-  const fields=['menuLabel','defaultPrefix','simpleBucketName','simpleOptions','simplePrimaryEnabled','simplePrimaryOrder','explorerManaged','showInContextMenu','menuOrder','nestedMenu'];
+  const fields=['menuConfigVersion','menuLabel','defaultPrefix','simpleBucketName','simpleOptions','simplePrimaryEnabled','simplePrimaryOrder','explorerManaged','showInContextMenu','menuOrder','nestedMenu'];
   function project(profiles){return profiles.filter(p=>p.type==='cloudflare-r2').map(p=>({id:p.id,accountId:p.accountId,bucketName:p.bucketName,...Object.fromEntries(fields.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]))}));}
   function signature(profiles,mode){return JSON.stringify([mode,project(profiles)]);}
   function prefix(value){if(typeof value!=='string'||value.length>1024||/[\\\x00-\x1f]/.test(value)||value.split('/').some(p=>p==='.'||p==='..'))throw Error('Choose a valid folder path.');return value;}
   function validate(profiles,mode){
-    let count=0;const ids=new Set();
+    let count=0;const ids=new Set(),profileIds=new Set();
+    for(const p of profiles){if(!p.id||profileIds.has(p.id))throw Error('Duplicate or missing storage profile identifier. Repair profiles before saving.');profileIds.add(p.id);}
     for(const p of profiles.filter(p=>p.type==='cloudflare-r2')){
       const prepared=bucket=>profiles.some(q=>q.type==='cloudflare-r2'&&q.accountId===p.accountId&&q.bucketName===bucket&&q.workerUrl&&q.token);
       const label=value=>{if(typeof value!=='string'||value.trim().length>60||/[\x00-\x1f]/.test(value))throw Error('Menu labels must be at most 60 characters.');};
@@ -13,10 +14,29 @@
         if(p.simplePrimaryEnabled!==false){prefix(p.defaultPrefix||'');label(p.menuLabel||'');if(!prepared(p.simpleBucketName||p.bucketName))throw Error('Prepare the selected bucket explicitly before saving.');count++;}
         for(const item of p.simpleOptions||[]){if(!item.id||ids.has(item.id))throw Error('Duplicate destination identifier. Reload the editor.');ids.add(item.id);prefix(item.prefix);label(item.label||'');if(!prepared(item.bucketName||p.bucketName))throw Error('Prepare the selected bucket explicitly before saving.');count++;}
       }
-      const walk=(nodes,depth)=>{if(nodes?.length&&depth>8)throw Error('Nested menus support up to eight folder levels.');for(const node of nodes||[]){if(!node.id||ids.has(node.id))throw Error('Duplicate nested identifier.');ids.add(node.id);label(node.label||'');if(node.name)RedownNestedLocations.name(node.name);if(node.ready&&!node.name)throw Error('Choose a folder for each ready destination.');count++;walk(node.children,depth+1);}};
-      for(const root of mode==='simple'||!p.nestedMenu?.enabled?[]:p.nestedMenu.roots||[]){if(!root.id||ids.has(root.id))throw Error('Duplicate nested root identifier.');ids.add(root.id);if(root.ready&&!prepared(root.bucketName))throw Error('Prepare the nested bucket explicitly before saving.');label(root.label||'');count++;walk(root.children,1);}
+      const walk=(nodes,depth)=>{if(nodes?.length&&depth>8)throw Error('Nested menus support up to eight folder levels.');for(const node of nodes||[]){if(!node.id||ids.has(node.id))throw Error('Duplicate nested identifier.');ids.add(node.id);label(node.label||'');if(node.name)RedownNestedLocations.name(node.name);if(!node.ready||!node.name)throw Error('Choose or create every active Nested folder before saving.');count++;walk(node.children,depth+1);}};
+      for(const root of mode==='simple'||!p.nestedMenu?.enabled?[]:p.nestedMenu.roots||[]){if(!root.id||ids.has(root.id))throw Error('Duplicate nested root identifier.');ids.add(root.id);if(!root.ready||!root.bucketName)throw Error('Choose a bucket for every active Nested location before saving.');if(root.ready&&!prepared(root.bucketName))throw Error('Prepare the nested bucket explicitly before saving.');label(root.label||'');count++;walk(root.children,1);}
     }
     if(count>500)throw Error('This editor supports up to 500 menu locations in the active layout.');
   }
-  globalThis.RedownDestinationConfig={fields,project,signature,prefix,validate};
+  function resolve(menuId,profiles,mode){
+    const id=String(menuId),p=profiles.find(p=>p.type==='cloudflare-r2'&&p.id===id.split(':')[1]);
+    if(!p||p.explorerManaged)return null;
+    let bucket,prefixValue;
+    if(mode==='simple'&&p.showInContextMenu!==false){
+      if(id===`quick:${p.id}`&&p.simplePrimaryEnabled!==false){bucket=p.simpleBucketName||p.bucketName;prefixValue=p.defaultPrefix;}
+      else {const item=(p.simpleOptions||[]).find(x=>id===`simple-option:${p.id}:${x.id}`);if(!item)return null;bucket=item.bucketName||p.bucketName;prefixValue=item.prefix;}
+    }else if(mode==='nested'){
+      const locations=RedownNestedLocations.destinations(p.nestedMenu);
+      const item=locations.find(x=>id===`nested:${p.id}:${x.rootId}:${x.nodeId}`||id===`nested:${p.id}:${x.rootId}:${x.nodeId}:send`);
+      if(!item)return null;
+      if(id.endsWith(':send')&&!locations.some(child=>child.rootId===item.rootId&&child.ids.length===item.ids.length+1&&(item.ids.length===0||child.ids.at(-2)===item.nodeId)))return null;
+      bucket=item.bucketName;prefixValue=item.prefix;
+    }else return null;
+    const target=profiles.find(q=>q.type==='cloudflare-r2'&&q.accountId===p.accountId&&q.bucketName===bucket&&q.workerUrl&&q.token);
+    if(!target)return null;
+    try{prefix(prefixValue||'');}catch{return null;}
+    return {profile:target,owner:p,prefix:prefixValue||''};
+  }
+  globalThis.RedownDestinationConfig={fields,project,signature,prefix,validate,resolve};
 })();

```

## extension/beta/destinations.js

```diff
diff --git a/extension/beta/destinations.js b/extension/beta/destinations.js
index 95152f4..abcc450 100644
--- a/extension/beta/destinations.js
+++ b/extension/beta/destinations.js
@@ -3,15 +3,26 @@
   'use strict';
   const $=id=>document.getElementById(id),C=RedownDestinationConfig,M=RedownNestedLocations;
   if(!$('destination-mode'))return;
-  let profiles=[],accounts=[],mode='simple',expected='',dirty=false,saving=false,mounted=false,epoch=0,reads=0,firstSetupDisclosureInitialized=false,activatingLocation=false;
+  let profiles=[],accounts=[],mode='simple',expected='',dirty=false,saving=false,mounted=false,epoch=0,reads=0,activatingLocation=false;
   const bucketCache=new Map();let unassigned=[];
-  const status=text=>$('destination-status').textContent=text;
+  const status=text=>{$('destination-status').textContent=text;renderPreview();};
+  function renderPreview(){
+    const host=$('destination-preview');if(!host)return;
+    host.replaceChildren();const root=el('ul','destination-preview-tree'),parents=new Map([['redown',root]]);
+    root.setAttribute('aria-label','REDOWN');host.append(root);
+    try{for(const entry of M.menuEntries(profiles,mode,'redown')){
+      const li=el('li'),caption=el('span','',entry.title),children=el('ul');
+      li.append(caption,children);(parents.get(entry.parentId)||root).append(li);parents.set(entry.id,children);
+      const target=C.resolve(entry.id,profiles,mode);if(target)caption.title=target.profile.accountId+' / '+target.profile.bucketName+'/'+target.prefix;
+    }if(!root.childElementCount)root.append(el('li','','No active destinations.'));
+    }catch{host.textContent='Complete the destination selections to preview this draft.';}
+  }
   const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
   const button=(text,action,label=text)=>{const n=el('button','',text);n.type='button';n.setAttribute('aria-label',label);n.onclick=()=>Promise.resolve().then(action).catch(error=>status(error.message));return n;};
   const request=async(type,fields={})=>{const r=await chrome.runtime.sendMessage({type,...fields});if(!r?.ok)throw Error(r?.error||'Request failed. Retry.');return r;};
   const usable=()=>profiles.filter(p=>p.type==='cloudflare-r2'&&p.accountId);
   const included=()=>usable().filter(p=>!p.explorerManaged&&p.showInContextMenu!==false).sort((a,b)=>(a.menuOrder??999)-(b.menuOrder??999));
-  function changed(){dirty=true;status('Unsaved changes · Save menu to update Chrome.');}
+  function changed(){dirty=true;status('Unsaved changes · Save menu to apply them.');}
   function setMode(){const nested=mode==='nested';$('destination-mode').setAttribute('aria-pressed',String(nested));$('destination-mode').setAttribute('aria-label','Switch to '+(nested?'Simple':'Nested'));$('destination-simple').hidden=nested;$('destination-nested').hidden=!nested;if(nested&&!mounted)mountNested();}
   function mountNested(){mounted=true;RedownNestedEditor.mount($('destination-nested'),{
     profiles:()=>profiles,existingOnly:true,allowFolderCreation:true,startCollapsed:true,
@@ -26,15 +37,11 @@
     // provisioned a bucket before its local storage event reaches this page.
     let latest;try{latest=(await request('profiles')).profiles;}catch{}
     if(version!==epoch)return;
-    unassigned=[];profiles=structuredClone(latest||stored.profiles||[]);$('destination-legacy-fallback').hidden=!profiles.some(p=>p.type==='github');mode=M.menuMode(stored.rightClickMode,profiles);expected=C.signature(profiles,mode);dirty=false;mounted=false;
+    unassigned=[];profiles=structuredClone(latest||stored.profiles||[]);$('destination-legacy-fallback').hidden=true;mode=M.menuMode(stored.rightClickMode,profiles);expected=C.signature(profiles,mode);dirty=false;mounted=false;
     // Idempotent in-memory migration. It is persisted only on explicit Save.
-    for(const p of usable())p.nestedMenu||=M.fromLegacy(p);
-    const selector=$('destination-profile');selector.replaceChildren(...usable().map(p=>new Option((p.accountName||p.accountId)+' / '+p.bucketName,p.id)));
+    for(const p of usable()){M.initialize(p);p.defaultPrefix??='';}
+    const selector=$('destination-profile');selector.replaceChildren(...usable().map(p=>new Option((p.accountName||'Account')+' · '+p.accountId+' / '+p.bucketName,p.id)));
     renderSimple();setMode();
-    if(!firstSetupDisclosureInitialized){
-      firstSetupDisclosureInitialized=true;
-      $('destination-first-setup').open=usable().length===0;
-    }
     status(usable().length?'Choose a layout and design your right-click menu.':'Choose an existing Cloudflare bucket, then Activate Buckets beside Grid view, or prepare REDOWN storage below.');
     try{accounts=(await request('cfAccounts')).accounts||[];}catch(error){status('Saved destinations loaded. '+error.message);}
   }
@@ -43,12 +50,12 @@
     if(reads){status('Locations are still being checked. Try Save again when loading finishes.');return;}if(unassigned.length)throw Error('Assign a prepared account to every new card before saving.');C.validate(profiles,mode);saving=true;
     // Freeze all editor controls for the bounded save. No in-flight keystroke can be lost.
     const locked=[...$('quick-panel-setup').querySelectorAll('button,input,select')],disabled=locked.map(n=>n.disabled);locked.forEach(n=>n.disabled=true);
-    status('Saving and updating Chrome’s menu…');
+    status('Saving your REDOWN right-click menu…');
     try{
       const snapshot=C.project(profiles);
       const result=await request('saveDestinationConfig',{expected,mode,profiles:snapshot});
       expected=result.signature;dirty=false;
-      status(result.menuUpdated?'Saved · Chrome’s right-click menu is up to date.':result.error);
+      status(result.menuUpdated?'Saved · REDOWN right-click menu updated.':result.error);
     }catch(error){status('Not saved: '+error.message+' Your draft is still here.');}
     finally{saving=false;locked.forEach((n,i)=>{if(n.isConnected)n.disabled=disabled[i];});}
   }
@@ -64,23 +71,34 @@
   }
   function renderSimple(onlyId){
     const host=$('destination-simple');if(!onlyId){for(const b of host.querySelectorAll('button'))b._picker?.close();host.replaceChildren();}else host.querySelector('.destination-empty')?.remove();
-    const list=onlyId?rows().filter(row=>row.id===onlyId):rows();if(!list.length)host.append(el('p','destination-empty','Choose your existing Cloudflare bucket, then click Activate Buckets by Grid view. After activation, + Location adds Simple menu destinations.'));
+    const list=onlyId?rows().filter(row=>row.id===onlyId):rows();if(!list.length)host.append(el('p','destination-empty','No Simple destinations configured. Use + Location to add one. Activate a bucket beside Grid view if needed.'));
     for(const row of list){
       const card=el('article','destination-card');card.dataset.destinationId=row.id;
       const head=el('div','destination-card-head');
       const label=el('input');label.value=row.label;label.maxLength=60;label.placeholder='Menu label';label.setAttribute('aria-label','Menu label');label.oninput=()=>update(row,'label',label.value);
       const move=delta=>{const entries=rows(),i=entries.findIndex(r=>r.id===row.id),j=i+delta;if(j<0||j>=entries.length)return;[entries[i],entries[j]]=[entries[j],entries[i]];entries.forEach((r,index)=>{if(r.base)r.p.simplePrimaryOrder=index;else r.item.order=index;});changed();renderSimple();};
-      head.append(label,button('↑',()=>move(-1),'Move destination up'),button('↓',()=>move(1),'Move destination down'),button('×',()=>{if(row.base)row.p.simplePrimaryEnabled=false;else if(row.draft)unassigned=unassigned.filter(r=>r!==row);else row.p.simpleOptions=row.p.simpleOptions.filter(i=>i!==row.item);changed();renderSimple();},'Remove menu destination'));
+      const options=el('details','destination-entry-options');options.append(el('summary','','Entry options'));
+      // Keep deletion visible on every card, never buried in Entry options.
+      // The X edits the right-click menu draft only; it never deletes R2 data.
+      const remove=button('×',()=>{
+        if(row.base)row.p.simplePrimaryEnabled=false;
+        else if(row.draft)unassigned=unassigned.filter(r=>r!==row);
+        else row.p.simpleOptions=row.p.simpleOptions.filter(i=>i!==row.item);
+        changed();renderSimple();
+      },'Remove menu destination');
+      remove.className='destination-remove-x';
+      head.append(label,remove);
+      options.append(button('↑',()=>move(-1),'Move destination up'),button('↓',()=>move(1),'Move destination down'));
       const fields=el('div','destination-card-fields');
       const account=el('select');account.setAttribute('aria-label','Cloudflare account');
       const choices=[...new Map([...accounts.map(a=>[a.id,a]),...usable().map(p=>[p.accountId,{id:p.accountId,name:accounts.find(a=>a.id===p.accountId)?.name||p.accountName||p.accountId}])]).values()];
       if(row.draft)account.add(new Option('Choose account…',''));
-      for(const a of choices)account.add(new Option(a.name,a.id));account.value=row.p.accountId;
+      for(const a of choices)account.add(new Option(a.name+' · '+a.id,a.id));account.value=row.p.accountId;
       const bucket=el('select');bucket.setAttribute('aria-label','Bucket');
       // Prepared profiles are required by the original transfer engine. Discovery is read-only.
       const bucketLabel=el('label','', 'Bucket');bucketLabel.append(bucket);
       const accountLabel=el('label','','Cloudflare account');accountLabel.append(account);
-      const destination=el('code','destination-path',row.base&&row.p.defaultPrefix==null?row.bucket+' / Automatic folder by file type (legacy)':row.bucket+'/'+row.prefix);destination.title=destination.textContent;
+      const destination=el('code','destination-path',row.bucket+'/'+row.prefix);destination.title=destination.textContent;
       const folders=el('div','destination-folders');
       const choose=button('Choose folder',async()=>{
         folders.replaceChildren();folders.hidden=false;
@@ -110,10 +128,10 @@
       const creator=el('form','destination-inline-create');creator.hidden=true;
       const input=el('input');input.placeholder='New folder name…';input.setAttribute('aria-label','New folder inside this destination');input.required=true;input.autocomplete='off';
       const feedback=el('span');feedback.setAttribute('role','status');
-      const create=el('button','','✓');create.type='submit';create.setAttribute('aria-label','Create folder');
+      const create=el('button','','Create folder');create.type='submit';create.setAttribute('aria-label','Create folder');
       const cancel=button('×',()=>{creator.hidden=true;input.value='';feedback.textContent='';},'Cancel folder creation');
       creator.append(input,create,cancel,feedback);
-      const plus=button('+',()=>{creator.hidden=false;input.focus();},'Create folder inside '+row.bucket+'/'+row.prefix);
+      const plus=button('Create folder',()=>{creator.hidden=false;input.focus();},'Create folder inside '+row.bucket+'/'+row.prefix);
       creator.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel.click();plus.focus();}};
       creator.onsubmit=async event=>{
         event.preventDefault();if(saving||reads)return;
@@ -127,11 +145,11 @@
           const check=await request('cfFolderChildren',{...target,parentPrefix:target.prefix});
           if(!(check.children||[]).includes(child))throw Error('Creation was not verified. Refresh before retrying.');
           update(row,'prefix',M.path(target.prefix,child));destination.textContent=row.bucket+'/'+row.prefix;
-          choose._picker?.close();folders.hidden=true;input.value='';creator.hidden=true;status('Folder verified. Save menu to add this destination to Chrome.');
+          choose._picker?.close();folders.hidden=true;input.value='';creator.hidden=true;status('Folder created. Save menu to add this destination.');
         }catch(error){feedback.textContent=error.message;}
         finally{reads--;locked.forEach((n,i)=>{if(n.isConnected)n.disabled=previous[i];});}
       };
-      fields.append(accountLabel,bucketLabel,choose,root,plus);card.append(head,fields,destination,creator,folders);host.append(card);void loadBuckets();
+      fields.append(accountLabel,bucketLabel,choose);options.append(root,plus);card.append(head,fields,destination,options,creator,folders);host.append(card);void loadBuckets();
     }
   }
   $('destination-mode').onclick=async()=>{
@@ -140,7 +158,7 @@
     try{
       const result=await request('saveDestinationConfig',{expected,mode:next,profiles:[]});
       expected=result.signature;mode=next;setMode();
-      status(result.menuUpdated?(dirty?'Layout updated in Chrome. Your unsaved destination edits are preserved.':'Layout updated in Chrome.'):result.error);
+      status(result.menuUpdated?(dirty?'Right-click layout updated. Unsaved destination changes are preserved.':'Right-click layout updated.'):result.error);
     }catch(error){status('Layout was not changed: '+error.message+' Your draft is preserved.');}
     finally{saving=false;$('destination-mode').disabled=false;}
   };
@@ -170,7 +188,7 @@
     }
     const available=usable();
     if(mode==='nested'){
-      const p=available.find(p=>p.id===$('destination-profile').value)||available[0];p.explorerManaged=false;p.nestedMenu||=M.fromLegacy(p);p.nestedMenu.enabled=true;
+      const p=available.find(p=>p.id===$('destination-profile').value)||available[0];if(p.explorerManaged||p.showInContextMenu===false)p.simplePrimaryEnabled=false;p.explorerManaged=false;M.initialize(p);p.nestedMenu.enabled=true;
       if(!mounted)mountNested();await RedownNestedEditor.addLocation(p.id);changed();if(activatedSource)document.dispatchEvent(new CustomEvent('redown:destinations-ready',{detail:activatedSource}));return;
     }
     const p=available.find(p=>p.id===$('destination-profile').value)||available[0];
@@ -186,7 +204,7 @@
   document.addEventListener('redown:destinations-ready',()=>{if(!dirty&&!saving&&!activatingLocation)void load().catch(error=>status('Refresh destinations: '+error.message));});
   chrome.storage.onChanged.addListener((changes,area)=>{
     if(area!=='local'||saving||activatingLocation)return;
-    if(changes.profiles||changes.rightClickMode){if(dirty){if(changes.rightClickMode){mode=M.menuMode(changes.rightClickMode.newValue,profiles);setMode();}status('Saved configuration changed. Your draft is preserved; Reload before saving.');return;}void load().catch(error=>status(error.message));}
+    if(changes.profiles||changes.rightClickMode){if(dirty){if(changes.rightClickMode&&!changes.profiles){const before=JSON.parse(expected);mode=M.menuMode(changes.rightClickMode.newValue,profiles);expected=JSON.stringify([mode,before[1]]);setMode();status('Right-click layout changed in another window. Your unsaved edits are preserved.');return;}status('Saved configuration changed. Your draft is preserved; Reload before saving.');return;}void load().catch(error=>status(error.message));}
   });
   window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
   void load().catch(error=>status('Could not load destinations: '+error.message));

```
