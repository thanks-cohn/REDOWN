/* V3 tree editor. Canonical configuration and all writes remain background-owned. */
(() => {
'use strict';
const host=document.getElementById('v3-setup');if(!host)return;
const $=id=>host.querySelector('#v3-'+id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let config,profiles=[],engine='legacy',selected='',undo=null,pending=false,saving=false,blocked=false,editing=null;
const expanded=new Set(),folders=new Map();
let addAnchor='',typeahead='',typedAt=0;
const status=t=>{$('status').textContent=t;};
const request=async(type,fields={})=>{let timer;try{const r=await Promise.race([chrome.runtime.sendMessage({type,...fields}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Outcome unknown: request timed out.')),30000);})]);if(!r?.ok)throw Error(r?.error==='Unknown request'?'The running REDOWN background does not support '+type+'. Reload the extension in chrome://extensions, then reload Explorer.':r?.error||'Request not acknowledged.');return r;}finally{clearTimeout(timer);}};
function button(text,label,fn){const b=el('button',text);b.type='button';b.setAttribute('aria-label',label);b.onclick=e=>{e.stopPropagation();const owner=b.closest('[role=treeitem]');if(owner)select(owner.dataset.key);fn();};return b;}
let applyEpoch=0,applyPending=true,applying=false,applyError='',lastMenuStatus=null,applicationKey=null;
function paintApply(){
 const b=$('save');b.disabled=applying||!config||!applyPending;
 b.dataset.state=applying?'applying':applyError?'failed':applyPending?'pending':'saved';
 b.textContent=applying?'Applying…':applyError?'Retry Apply':applyPending?'Save Changes':'Saved';
 $('apply-status').textContent=applyError||(!applyPending?'Applied to Chrome.':engine!=='v3'?'Legacy is active. Select New Right-click in Settings to apply V3.':pending||saving||presentationDraft||presentationSaving||scopeDraft||scopeSaving?'Saving choices… Apply will wait for persistence.':'Changes saved automatically; apply to confirm Chrome.');
}
function dirty(){applyEpoch++;applyPending=true;applyError='';paintApply();}
function applyFailed(message){applyPending=true;applyError=message;paintApply();}
let levelScopes=RedownRightClickV3.emptyScopes(),acknowledgedScopes=levelScopes,scopeSaving=false,scopeDraft=false;
const scopePopover=el('details');scopePopover.id='v3-bucket-picker';
const scopeSummary=el('summary','Buckets');scopeSummary.setAttribute('aria-label','Choose participating buckets');
const scopeBox=el('fieldset');scopeBox.id='v3-level-buckets';scopePopover.append(scopeSummary,scopeBox);$('depth-row').after(scopePopover);
scopePopover.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();scopePopover.open=false;scopeSummary.focus();}};
document.addEventListener('pointerdown',e=>{if(!scopePopover.contains(e.target))scopePopover.open=false;});
function paintScopes(){
 const active=document.activeElement,focusId=active?.dataset.scope;
 scopePopover.hidden=menuPresentation.style!=='nested'||menuPresentation.nested!=='level';
 if(scopePopover.hidden)scopePopover.open=false;
 scopeSummary.textContent='Buckets · '+levelScopes.buckets.filter(b=>b.enabled).length;
 scopeBox.replaceChildren(el('legend','Participating buckets'));
 const available=d=>profiles.some(p=>p.id===d.profileId&&p.accountId===d.accountId&&p.bucketName===d.bucketName);
 if(levelScopes.buckets.some(d=>!available(d))){const remove=el('button','Remove unavailable buckets');remove.type='button';remove.onclick=()=>void saveScopes(levelScopes.buckets.filter(available));scopeBox.append(remove);}
 if(!profiles.length)scopeBox.append(el('small','Activate a bucket in Explorer to include it here.'));
 for(const p of profiles){const label=el('label'),input=el('input');input.type='checkbox';input.dataset.scope=p.id;input.checked=levelScopes.buckets.some(d=>d.profileId===p.id&&d.accountId===p.accountId&&d.bucketName===p.bucketName&&d.enabled);
 input.onchange=()=>{const buckets=levelScopes.buckets.filter(d=>d.profileId!==p.id);if(input.checked)buckets.push({id:crypto.randomUUID(),profileId:p.id,accountId:p.accountId,bucketName:p.bucketName,enabled:true});void saveScopes(buckets);};
 const name=el('span',p.bucketName),account=el('small',(p.accountName||p.accountId)+(profiles.filter(q=>q.accountId===p.accountId&&q.bucketName===p.bucketName).length>1?' · '+p.id:'')),text=el('span');text.append(name,account);label.append(input,text);scopeBox.append(label);}
 if(focusId){[...scopeBox.querySelectorAll('input')].find(i=>i.dataset.scope===focusId)?.focus();}
}
async function saveScopes(buckets){
 dirty();levelScopes={...levelScopes,buckets};scopeDraft=true;paintScopes();if(scopeSaving)return;
 scopeSaving=true;
 try{
  do{const target=structuredClone(levelScopes.buckets),r=await request('setRightClickV3LevelScopes',{expected:acknowledgedScopes.revision,buckets:target});
   acknowledgedScopes=r.levelScopes;levelScopes.revision=acknowledgedScopes.revision;menuFeedback(r.menuStatus);
   if(JSON.stringify(levelScopes.buckets)===JSON.stringify(target))break;
  }while(true);
  scopeDraft=false;
 }catch(e){
  try{const r=await request('rightClickV3Snapshot');if(JSON.stringify(r.levelScopes?.buckets)===JSON.stringify(levelScopes.buckets)){acknowledgedScopes=r.levelScopes;levelScopes.revision=r.levelScopes.revision;scopeDraft=false;}}catch{}
  applyFailed(e.message+' Bucket choices retained. Retry Apply.');
 }
 finally{scopeSaving=false;paintScopes();paintApply();}
}
let menuPresentation=RedownRightClickV3.presentation(),acknowledgedPresentation=menuPresentation,presentationSaving=false,presentationDraft=false;
function menuFeedback(menuStatus){
 lastMenuStatus=menuStatus||lastMenuStatus;
 if(menuStatus?.state==='failed')applyFailed(menuStatus.error||'Chrome registration failed. Retry Apply.');
 else if(menuStatus&&menuStatus.state!=='registered'){applyPending=true;paintApply();}
 const target=$('presentation-status');if(!target)return;
 const options=menuPresentation;
 if(menuStatus?.state==='failed'){target.textContent=menuStatus.error||'Chrome menu registration failed.';return;}
 if(engine!=='v3'){target.textContent='Saved for New Right-click. Legacy is active.';return;}
 if(options.style==='nested'&&options.nested==='level'){
   const at=menuStatus?.inventoryAt;
   target.textContent=menuStatus?.warnings?.length?menuStatus.warnings.join(' '):at?'Folders checked '+new Date(at).toLocaleTimeString()+'. Reload refreshes.':'Folder inventory pending. Reload to refresh.';
   const summary=menuStatus?.summary;if(summary)target.textContent+=' Depth '+summary.depth+' · '+summary.knownFolders+' known folders · '+summary.rootsChecked+'/'+summary.rootsTotal+' bucket roots checked. Explorer shows the full paged directory.';
 }else target.textContent=menuStatus?.state==='registered'?'Chrome menu updated.':'';
}
function paintPresentation(){
 $('context-text').textContent=menuPresentation.style==='simple'?'Flat configured destinations':menuPresentation.nested==='narrow'?'Configured destinations, naturally organized':'Real bucket folders · Depth '+menuPresentation.depth;
 paintScopes();
 const active=document.activeElement;
 for(const kind of ['style','nested']){
  $(kind).disabled=false;
  for(const input of $(kind).querySelectorAll('input'))input.checked=input.value===menuPresentation[kind];
 }
 $('nested').hidden=menuPresentation.style!=='nested';
 $('depth-row').hidden=menuPresentation.style!=='nested'||menuPresentation.nested!=='level';
 $('depth').value=menuPresentation.depth;$('depth').disabled=false;
 if($('nested').hidden&&$('nested').contains(active)||$('depth-row').hidden&&$('depth-row').contains(active))$('style').querySelector('input:checked')?.focus();
}
async function savePresentation(next){
 try{menuPresentation=RedownRightClickV3.validatePresentation(next);}catch(e){$('presentation-status').textContent=e.message;return;}
 dirty();presentationDraft=true;paintPresentation();if(presentationSaving)return;
 presentationSaving=true;$('presentation-status').textContent='Updating Chrome…';
 try{
  // Native radio keys keep focus while rapid changes queue behind acknowledged saves.
  do{
   const target={...menuPresentation},expectedPresentation=JSON.stringify(acknowledgedPresentation);
   const r=await request('setRightClickV3Presentation',{expectedPresentation,presentation:target});
   acknowledgedPresentation=r.presentation||target;menuFeedback(r.menuStatus);
   if(!r.menuUpdated)$('presentation-status').textContent=r.error||'Saved; Chrome menu registration failed.';
   if(JSON.stringify(menuPresentation)===JSON.stringify(target))break;
  }while(true);
 }catch(e){$('presentation-status').textContent=e.message+' Choice retained; reload or choose again to retry.';applyFailed(e.message+' Choice retained. Retry Apply.');}
 finally{
  const desired=JSON.stringify(menuPresentation);
  try{const r=await request('rightClickV3Snapshot');acknowledgedPresentation=RedownRightClickV3.presentation(r.presentation);
   if(JSON.stringify(menuPresentation)===desired){
    if(JSON.stringify(acknowledgedPresentation)!==desired)$('presentation-status').textContent+=' Saved state differs; your choice is retained as an unsaved draft.';
   }
  }catch{}
  presentationDraft=JSON.stringify(menuPresentation)!==JSON.stringify(acknowledgedPresentation);presentationSaving=false;paintPresentation();paintApply();
  if(JSON.stringify(menuPresentation)!==desired)void savePresentation(menuPresentation);
 }

}
for(const kind of ['style','nested'])$(kind).onchange=e=>{if(e.target.matches('input[type=radio]'))void savePresentation({...menuPresentation,[kind]:e.target.value});};
$('depth').onchange=()=>{if(!$('depth').validity.valid||!$('depth').value){$('presentation-status').textContent='Depth must be an integer from 1 to 10.';$('depth').value=menuPresentation.depth;return;}void savePresentation({...menuPresentation,depth:Number($('depth').value)});};
function note(){$('engine').textContent=engine==='v3'?'':'Legacy Right-click is active. V3 edits do not control Chrome until selected in Settings.';}
function validate(next){RedownRightClickV3.validate(next,profiles.map(p=>({...p,type:'cloudflare-r2',workerUrl:true,token:true})));}
function change(fn){try{const next=structuredClone(config);fn(next);validate(next);undo=structuredClone(config.destinations);config=next;dirty();pending=true;sessionStorage.setItem('redown-v3-recovery',JSON.stringify(config));draw();void flush();}catch(e){status(e.message);}}
async function flush(){if(saving||blocked||!pending)return;saving=true;pending=false;const snapshot=structuredClone(config.destinations);status('Saving… Updating Chrome…');try{
 const r=await request('saveRightClickV3',{expected:config.revision,destinations:snapshot});config.revision=r.revision;if(!pending)sessionStorage.removeItem('redown-v3-recovery');else sessionStorage.setItem('redown-v3-recovery',JSON.stringify(config));engine=r.engine;note();
 status(r.menuUpdated?(engine==='v3'?'Saved and ready':'Saved. Legacy controls Chrome.'):'Configuration saved. Unable to update Chrome. Retry.');$('retry').hidden=r.menuUpdated;
}catch(e){pending=true;blocked=true;applyFailed(e.message);status(e.message+' Changes retained in this window. Reload to reconcile before retrying.');}finally{saving=false;paintApply();if(pending&&!blocked)void flush();}}
function focusSelected(){const row=[...$('outline').querySelectorAll('[role=treeitem]')].find(n=>n.dataset.key===selected);row?.focus();}
function select(key){selected=key;for(const row of $('outline').querySelectorAll('[role=treeitem]')){row.tabIndex=row.dataset.key===key?0:-1;row.setAttribute('aria-selected',String(row.dataset.key===key));}}
function rename(d){typeahead='';select(d.id);editing=d.id;draw();const input=$('outline').querySelector('input[data-edit]');input?.focus();input?.select();}
function remove(d){const count=config.destinations.length-RedownRightClickV3.remove(config,d.id).destinations.length;if(count>1&&!confirm('Remove '+d.label+' and '+(count-1)+' child destinations from the menu? Cloud folders are kept.'))return;change(next=>{next.destinations=RedownRightClickV3.remove(next,d.id).destinations;});$('undo').focus();}
function move(d,step){const siblings=config.destinations.filter(x=>x.parentId===d.parentId&&x.profileId===d.profileId),other=siblings[siblings.indexOf(d)+step];if(!other)return;change(next=>{const a=next.destinations.findIndex(x=>x.id===d.id),b=next.destinations.findIndex(x=>x.id===other.id);[next.destinations[a],next.destinations[b]]=[next.destinations[b],next.destinations[a]];});focusSelected();}
function add(p,d=null,path=''){typeahead='';if(editing){editing=null;draw();}addAnchor=d?.id||'bucket:'+p.id;select(addAnchor);$('add').hidden=false;$('profile').value=p.id;$('parent').value=d?.id||'';$('prefix').value=path|| (d?.prefix?d.prefix+'/':'');$('label').value='';$('folders').replaceChildren();const anchor=[...$('outline').querySelectorAll('[role=treeitem]')].find(n=>n.dataset.key===(d?.id||'bucket:'+p.id));anchor?.append($('add'));$('prefix').focus();}
async function browse(p,prefix='',cursor){const key=p.id+':'+prefix;try{status('Loading folders…');const r=await request('cfDestinationFolders',{accountId:p.accountId,bucketName:p.bucketName,prefix,cursor});const values=(r.folders||[]).map(f=>(typeof f==='string'?f:f.prefix)?.replace(/\/$/, '')).filter(Boolean);folders.set(key,{values:cursor?[...(folders.get(key)?.values||[]),...values]:values,cursor:r.cursor});draw();status('Folders loaded.');}catch(e){status(e.message);}}
function draw(){
 // Rendering must not turn an editor/control interaction into tree navigation.
 const outline=$('outline'),active=document.activeElement,form=$('add');
 const renameInput=outline.querySelector('input[data-edit]'),renameDraft=renameInput?{id:editing,value:renameInput.value,start:renameInput.selectionStart,end:renameInput.selectionEnd}:null;
 const inForm=form.contains(active),owner=active?.closest('[role=treeitem]');
 const owned=owner&&outline.contains(owner),key=owner?.dataset.key;
 const controls=owned?[...owner.querySelector('.v3-row').querySelectorAll('button,input,select,summary')]:[];
 const controlIndex=controls.indexOf(active),onItem=active===owner;
 const openActions=[...outline.querySelectorAll('details[open]')].map(n=>n.closest('[role=treeitem]').dataset.key);
 note();if(form)host.append(form);outline.replaceChildren();outline.setAttribute('role','tree');const query=$('search').value.trim().toLowerCase();
 const parent=$('parent'),oldParent=parent.value;parent.replaceChildren(new Option('Bucket root',''));for(const d of config.destinations)parent.append(new Option(d.label+' /'+d.prefix,d.id));parent.value=oldParent;
 const matches=d=>(d.label+' '+d.prefix+' '+d.bucketName+' '+d.accountId).toLowerCase().includes(query);
 function row(key,label,path,container,children,actions,d=null){
 const item=el('div');item.setAttribute('role','treeitem');item.dataset.key=key;item.tabIndex=-1;item.setAttribute('aria-label',label+(path?' · '+path:''));item.setAttribute('aria-selected',String(selected===key));
 if(children)item.setAttribute('aria-expanded',String(expanded.has(key)||!!query));
 const line=el('div');line.className='v3-row';const toggle=button(children?(expanded.has(key)||query?'⌄':'›'):'·','Expand or collapse '+label,()=>{expanded.has(key)?expanded.delete(key):expanded.add(key);draw();focusSelected();if(expanded.has(key)&&key.startsWith('folder:')){const profile=profiles.find(p=>key.startsWith('folder:'+p.id+':'));const prefix=key.slice(('folder:'+profile.id+':').length);if(!folders.has(profile.id+':'+prefix))void browse(profile,prefix);}});toggle.tabIndex=-1;line.append(toggle,el('span','📁'));
 if(d){const check=el('input');check.type='checkbox';check.checked=d.enabled;check.setAttribute('aria-label','Include '+label+' in Chrome');check.onchange=()=>change(next=>{next.destinations.find(x=>x.id===d.id).enabled=check.checked;});check.onclick=e=>{e.stopPropagation();select(key);};line.append(check);}
 if(d&&editing===d.id){const input=el('input');input.dataset.edit='';input.value=renameDraft?.id===d.id?renameDraft.value:d.label;input.maxLength=60;input.setAttribute('aria-label','Rename '+label);input.onclick=e=>e.stopPropagation();const confirm=()=>{const value=input.value;try{const next=structuredClone(config);next.destinations.find(x=>x.id===d.id).label=value;validate(next);}catch(e){status(e.message);input.focus();return;}editing=null;select(d.id);change(next=>{next.destinations.find(x=>x.id===d.id).label=value;});focusSelected();};input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();confirm();}if(e.key==='Escape'){editing=null;select(d.id);draw();focusSelected();}};line.append(input,button('✓','Confirm rename',confirm),button('×','Cancel rename',()=>{editing=null;select(d.id);draw();focusSelected();}));}
 else {const title=el('span',label);title.className='v3-name';title.title=path||label;line.append(title);}
 const ops=el('span');ops.className='v3-actions';const primary=actions.filter((a,i)=>i===0||a.className==='v3-delete'||a.textContent==='Browse folders');const secondary=actions.filter(a=>!primary.includes(a));for(const action of primary)ops.append(action);if(secondary.length){const more=el('details'),summary=el('summary','More');summary.setAttribute('aria-label','More actions for '+label);more.append(summary,...secondary);more.onclick=e=>e.stopPropagation();ops.append(more);}line.append(ops);item.append(line);if(path){const full=el('small',path);full.className='v3-path';full.title=path;item.append(full);}
 item.onfocus=e=>{if(e.target===item)select(key);};
 item.onclick=e=>{if(e.target.closest('[role=treeitem]')!==item||e.target.closest('form,input,select,textarea,button,a,summary,details,[contenteditable]'))return;e.stopPropagation();select(key);item.focus();};item.onkeydown=e=>{
 if(e.target!==item||document.activeElement!==item||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;const rows=[...outline.querySelectorAll('[role=treeitem]')],i=rows.indexOf(item);let target;
 if(e.key==='ArrowDown')target=rows[i+1];if(e.key==='ArrowUp')target=rows[i-1];if(e.key==='Home')target=rows[0];if(e.key==='End')target=rows.at(-1);
 if(e.key==='ArrowRight'&&children){if(!expanded.has(key))toggle.click();else target=item.querySelector(':scope > [role=group] > [role=treeitem]');}
 if(e.key==='ArrowLeft'){if(expanded.has(key)){expanded.delete(key);draw();focusSelected();}else target=item.parentElement.closest('[role=treeitem]');}
 if(e.key==='Enter'){select(key);if(children)toggle.click();e.preventDefault();return;}
 if(d&&e.key==='F2'){rename(d);}if(d&&e.key==='Delete')remove(d);if(d&&e.key===' '){change(next=>{const n=next.destinations.find(x=>x.id===d.id);n.enabled=!n.enabled;});focusSelected();}
 if(e.key.length===1&&e.key!==' '){const now=Date.now();typeahead=(now-typedAt<700?typeahead:'')+e.key.toLowerCase();typedAt=now;const repeated=[...typeahead].every(c=>c===typeahead[0]),prefix=repeated?typeahead[0]:typeahead;target=(prefix.length>1?[item]:[]).concat(rows.slice(i+1),rows.slice(0,i)).find(n=>n.getAttribute('aria-label').toLowerCase().startsWith(prefix));e.preventDefault();}else{typeahead='';}
 if(target){select(target.dataset.key);target.focus();}if(target||['ArrowDown','ArrowUp','Home','End','ArrowRight','ArrowLeft','F2','Delete',' '].includes(e.key))e.preventDefault();};
 container.append(item);const group=el('div');group.setAttribute('role','group');if(children&&(expanded.has(key)||query)){item.append(group);return group;}return null;
 }
 for(const accountId of new Set(profiles.map(p=>p.accountId))){const accountProfiles=profiles.filter(p=>p.accountId===accountId);const ak='account:'+accountId;const ag=row(ak,accountProfiles[0].accountName||accountId,'',outline,true,[]);if(!ag)continue;
 for(const p of accountProfiles){const bk='bucket:'+p.id;const bg=row(bk,p.bucketName,'',ag,true,[button('+','Add destination in '+p.bucketName,()=>add(p)),button('Browse folders','Load folders in '+p.bucketName,()=>browse(p))]);if(!bg)continue;
 function destinations(parentId,container){for(const d of config.destinations.filter(x=>x.profileId===p.id&&x.parentId===parentId)){if(query&&!matches(d)&&!config.destinations.some(x=>x.prefix.startsWith(d.prefix+'/')&&matches(x)))continue;const del=button('Delete','Delete '+d.label+' and its menu descendants',()=>remove(d));del.className='v3-delete';const group=row(d.id,d.label,p.bucketName+'/'+d.prefix,container,config.destinations.some(x=>x.parentId===d.id),[button('+','Add child destination to '+d.label,()=>add(p,d)),button('Rename','Rename '+d.label,()=>rename(d)),button('↑','Move '+d.label+' up',()=>move(d,-1)),button('↓','Move '+d.label+' down',()=>move(d,1)),del],d);if(group)destinations(d.id,group);}}
 destinations(null,bg);
 function cloud(prefix,container){const data=folders.get(p.id+':'+prefix);if(!data)return;for(const path of data.values){if(path===prefix)continue;if(query&&!path.toLowerCase().includes(query))continue;const key='folder:'+p.id+':'+path;const cg=row(key,path.split('/').at(-1),p.bucketName+'/'+path,container,true,[button('+','Use '+path+' as destination',()=>add(p,null,path)),button('↻','Load subfolders of '+path,()=>browse(p,path))]);if(cg)cloud(path,cg);}if(data.cursor)container.append(button('Load more','Load more folders',()=>browse(p,prefix,data.cursor)));}cloud('',bg);
 }}
 if(!profiles.length)outline.append(el('p','Activate a bucket in Explorer to add destinations.'));
 const rows=[...outline.querySelectorAll('[role=treeitem]')];if(!rows.some(n=>n.dataset.key===selected))selected=rows[0]?.dataset.key||'';select(selected);$('undo').hidden=!undo;
 for(const row of rows)if(openActions.includes(row.dataset.key)){const details=row.querySelector('.v3-row details');if(details)details.open=true;}
 // Keep the same inline form and geometry when folder loading or edits redraw rows.
 if(!form.hidden){const anchor=rows.find(n=>n.dataset.key===addAnchor);if(anchor)anchor.append(form);else form.hidden=true;}
 if(inForm&&!form.hidden)active.focus();
 else if(owned){const row=rows.find(n=>n.dataset.key===key);const replacements=row?[...row.querySelector('.v3-row').querySelectorAll('button,input,select,summary')]:[];const replacement=onItem?row:replacements[controlIndex];(replacement||rows.find(n=>n.dataset.key===selected))?.focus();if(replacement?.hasAttribute('data-edit')&&renameDraft)replacement.setSelectionRange(renameDraft.start,renameDraft.end);}

}
async function load(){if(saving||presentationSaving||scopeSaving||applying){status('Wait for the current save before reloading.');return;}try{const r=await request('rightClickV3Snapshot');config=r.config;const recovery=sessionStorage.getItem('redown-v3-recovery');if(recovery){status('Recovered changes available in this window.');const draft=JSON.parse(recovery);if(confirm('Restore retained destination edits? They will be checked against the saved revision.')){config=draft;pending=true;blocked=true;}else sessionStorage.removeItem('redown-v3-recovery');}profiles=r.profiles;levelScopes=r.levelScopes||RedownRightClickV3.emptyScopes();acknowledgedScopes=structuredClone(levelScopes);scopeDraft=false;engine=r.engine;menuPresentation=RedownRightClickV3.presentation(r.presentation);acknowledgedPresentation=menuPresentation;presentationDraft=false;applicationKey=r.applicationKey;paintPresentation();menuFeedback(r.menuStatus);applyPending=!!pending||r.engine!=='v3'||r.menuStatus?.state!=='registered'||!applicationKey||r.menuStatus.applicationKey!==applicationKey||r.menuStatus.complete===false||(menuPresentation.style==='nested'&&menuPresentation.nested==='level'&&(!r.menuStatus.inventoryAt||Date.now()-r.menuStatus.inventoryAt>=RedownRightClickV3.limits.ttl));applyError=r.menuStatus?.state==='failed'?r.menuStatus.error:'';paintApply();pending=!!sessionStorage.getItem('redown-v3-recovery');blocked=pending;$('profile').replaceChildren(...profiles.map(p=>new Option(p.accountName+' · '+p.bucketName,p.id)));for(const p of profiles){expanded.add('account:'+p.accountId);expanded.add('bucket:'+p.id);}draw();status(pending?'Retained edits restored. Reload after reviewing to reconcile with saved configuration.':'');}catch(e){status(e.message);}}
$('search').oninput=()=>config&&draw();$('reload').onclick=()=>{if(!pending||confirm('Reload saved configuration and discard retained local changes?')){sessionStorage.removeItem('redown-v3-recovery');void load().then(async()=>{if(menuPresentation.style==='nested'&&menuPresentation.nested==='level'){try{const r=await request('refreshRightClickV3Inventory');menuFeedback(r.menuStatus);}catch(e){$('presentation-status').textContent=e.message;}}});}};
$('undo').onclick=()=>{if(!undo)return;const previous=undo;undo=null;change(next=>{next.destinations=previous;});};
$('retry').onclick=()=>{if(blocked)return status('Reload to reconcile retained changes first.');pending=true;void flush();};
$('cancel').onclick=()=>{$('add').hidden=true;select(addAnchor);focusSelected();};$('add').onclick=e=>e.stopPropagation();$('add').onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();$('add').hidden=true;select(addAnchor);focusSelected();}};
$('folders').onkeydown=e=>{if(e.key==='Escape'&&!$('add').hidden){e.preventDefault();e.stopPropagation();$('cancel').click();}};
$('add').onsubmit=e=>{e.preventDefault();const p=profiles.find(p=>p.id===$('profile').value);if(!p)return;const before=config,id=crypto.randomUUID();change(next=>{next.destinations.push({id,profileId:p.id,accountId:p.accountId,bucketName:p.bucketName,parentId:$('parent').value||null,prefix:$('prefix').value.replace(/\/$/,''),label:$('label').value,enabled:true});});if(config!==before){$('add').hidden=true;let parent=$('parent').value;while(parent){expanded.add(parent);parent=config.destinations.find(d=>d.id===parent)?.parentId;}expanded.add('account:'+p.accountId);expanded.add('bucket:'+p.id);selected=id;draw();focusSelected();}};
$('browse').onclick=async()=>{const p=profiles.find(p=>p.id===$('profile').value);if(!p)return;try{const r=await request('cfDestinationFolders',{accountId:p.accountId,bucketName:p.bucketName,prefix:$('prefix').value});$('folders').replaceChildren();const filter=el('input');filter.type='search';filter.placeholder='Filter folders…';filter.setAttribute('aria-label','Filter existing folders');filter.oninput=()=>{for(const choice of $('folders').querySelectorAll('button'))choice.hidden=!choice.textContent.toLowerCase().includes(filter.value.toLowerCase());};$('folders').append(filter);for(const f of r.folders||[]){const path=(typeof f==='string'?f:f.prefix).replace(/\/$/,'');$('folders').append(button(path,'Choose '+path,()=>{$('prefix').value=path;$('label').value||=path.split('/').at(-1)||p.bucketName;$('prefix').focus();}));}status(r.cursor?'More folders exist. Enter a narrower path to browse.':'Folders loaded.');}catch(e){status(e.message);}};
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.rightClickV3LevelScopes&&!scopeSaving){acknowledgedScopes=changes.rightClickV3LevelScopes.newValue||RedownRightClickV3.emptyScopes();if(!scopeDraft)levelScopes=acknowledgedScopes;dirty();paintScopes();}if(changes.rightClickV3Presentation&&!presentationSaving){dirty();acknowledgedPresentation=RedownRightClickV3.presentation(changes.rightClickV3Presentation.newValue);if(!presentationDraft)menuPresentation=acknowledgedPresentation;else $('presentation-status').textContent='Saved presentation changed. Your unsaved choice is retained; reload or choose again to retry.';paintPresentation();}if(changes.rightClickMenuStatus)menuFeedback(changes.rightClickMenuStatus.newValue);if(changes.rightClickEngine){dirty();engine=changes.rightClickEngine.newValue==='v3'?'v3':'legacy';note();}if(changes.rightClickV3&&!saving){if(pending){blocked=true;status('Configuration changed in another window. Local changes retained; reload to reconcile.');}else void load();}});
$('save').onclick=async()=>{
 if(applying)return;applying=true;paintApply();
 try{
  const deadline=Date.now()+35000;
  while(saving||presentationSaving||scopeSaving){if(Date.now()>deadline)throw Error('A save is still pending. Wait and retry Apply.');await new Promise(r=>setTimeout(r,25));}
  if(blocked){
   const r=await request('rightClickV3Snapshot');
   if(JSON.stringify(r.config.destinations)===JSON.stringify(config.destinations)){config.revision=r.config.revision;pending=false;blocked=false;sessionStorage.removeItem('redown-v3-recovery');}
   else if(r.config.revision===config.revision)blocked=false;
   else throw Error('Destinations changed in another window. Local edits retained; reload and review before applying.');
  }
  if(pending)await flush();
  if(presentationDraft)await savePresentation(menuPresentation);
  if(scopeDraft)await saveScopes(levelScopes.buckets);
  if(pending||blocked||presentationDraft||scopeDraft)throw Error('Some choices are not persisted. Review the error and retry Apply.');
  const ticket=applyEpoch;
  const r=await request('applyRightClickV3',{expected:config.revision,expectedScopes:levelScopes.revision,expectedPresentation:JSON.stringify(menuPresentation)});
  applicationKey=r.applicationKey;menuFeedback(r.menuStatus);
  if(ticket!==applyEpoch)throw Error('New changes arrived during application. Apply again to include them.');
  if(r.engine!=='v3')throw Error('V3 choices are saved. Select New Right-click in Settings, then retry Apply.');
  if(!r.menuUpdated||r.menuStatus?.state!=='registered'||r.menuStatus.complete===false||!applicationKey||r.menuStatus.applicationKey!==applicationKey)throw Error(r.menuStatus?.warnings?.join(' ')||r.error||'Chrome has not confirmed the complete current menu. Retry Apply.');
  applyPending=false;applyError='';
 }catch(e){applyFailed(e.message);}
 finally{applying=false;paintApply();}
};
setInterval(()=>{if(!applyPending&&menuPresentation.style==='nested'&&menuPresentation.nested==='level'&&Date.now()-(lastMenuStatus?.inventoryAt||0)>=RedownRightClickV3.limits.ttl){applyPending=true;paintApply();}},30000);
window.addEventListener('beforeunload',e=>{if(pending||saving||presentationSaving||scopeSaving||scopeDraft||presentationDraft||applying){e.preventDefault();e.returnValue='';}});void load();
})();
