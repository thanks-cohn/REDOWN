import {resolveHistoryTarget} from './history-target.mjs';
import {createBreadcrumbs,orderedBreadcrumbPath} from './standard-breadcrumbs.mjs';
import {installRemoteDialog} from './remote-dialog.mjs';
import {installTestItTools} from './test-it-tools.mjs';
import {installTestIt} from './test-it.mjs';
import {installTour} from './tour.mjs';
import {createFileApi,prefix,name} from './file-api.mjs';
import {createR2Adapter,previewType} from './r2-adapter.mjs';
import {collectDroppedFiles} from './dropped-files.mjs';
import {normalizeArchiveEntries,archiveFolder,archiveParent,archiveCrumbs,archiveAdjacent} from './archive-browser.mjs';
const $=id=>document.getElementById(id),api=createFileApi(createR2Adapter());
let practice=null;
let current=null,items=[],selected=new Set(),cursor='',epoch=0,busy=false,clipboard=null,anchor=-1,controller=null,history=[],historyIndex=-1,accounts=[],dragState=null;
const bytes=n=>n==null?'—':n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':n<1073741824?(n/1048576).toFixed(1)+' MB':(n/1073741824).toFixed(1)+' GB';
let archivePreviewMode="reader",readerSession=null;
let savedProfiles=[],previewUrl='',previewItem=null,listingState='disconnected',lastLocation=null,discoveryEpoch=0,cloudflareSignedIn=false;
let activationState='idle',activationSource=null,activationReason='',activationEpoch=0;
let activationGlowTimer=null;
function clearActivationGlow(){
  if(activationGlowTimer!==null){clearTimeout(activationGlowTimer);activationGlowTimer=null;}
  $('prepare').removeAttribute('data-effect');
}
function showActivationGlow(effect,{ongoing=false}={}){
  clearActivationGlow();
  const action=$('prepare');
  void action.offsetWidth;
  action.dataset.effect=effect;
  if(!ongoing)activationGlowTimer=setTimeout(()=>{
    if(action.dataset.effect===effect)action.removeAttribute('data-effect');
    activationGlowTimer=null;
  },1150);
}
function paintActivation(){
  const action=$('prepare'),label=action.querySelector('.bucket-activation-label');
  const selected=Boolean(current&&activationSource&&sameBucket(current,activationSource));
  const state=!current?'unselected':selected?activationState:'idle';
  // The primary activation action is always in the toolbar beside Grid View.
  // State affects its message and appearance, never its visibility.
  action.hidden=false;
  action.dataset.state=state;
  action.setAttribute('aria-busy',String(state==='checking'||state==='activating'));
  action.disabled=busy||state==='checking'||state==='activating';
  if(label)label.textContent=state==='checking'?'Checking bucket…':state==='activating'?'Activating…':'Activate Buckets';
  const glyph=action.querySelector('.bucket-activation-glyph');
  if(glyph)glyph.textContent=state==='ready'?'✓':'✦';
  action.title=!current?'Choose a storage bucket to activate REDOWN.'
    :state==='ready'?current.bucketName+' is already activated for REDOWN.'
    :selected&&activationReason?activationReason
    :'Check or activate REDOWN for '+current.bucketName+'. Refresh only reloads files.';
  action.setAttribute('aria-label',!current?'Activate Buckets: choose a storage bucket first'
    :(state==='ready'?'REDOWN already activated for ':'Activate REDOWN for ')+current.bucketName);
}
function resetActivation(){activationEpoch++;clearActivationGlow();activationState='idle';activationSource=null;activationReason='';paintActivation();}
async function checkActivation(source){
  if(!source||!sameBucket(current,source)){resetActivation();return null;}
  const ticket=++activationEpoch;
  activationSource={accountId:source.accountId,bucketName:source.bucketName};
  if(listingState!=='ready'){
    activationState='unknown';
    activationReason=['unauthorized','disconnected'].includes(listingState)
      ? 'Cloudflare authorization needs attention. Reconnect or check R2 permissions before activating.'
      : 'Bucket files could not be checked. Refresh and verify Cloudflare access first.';
    paintActivation();return null;
  }
  activationState='checking';activationReason='Checking the REDOWN Worker configuration for '+source.bucketName;paintActivation();
  const result=await api.run('connectionStatus',{source});
  if(ticket!==activationEpoch||!sameBucket(current,source))return null;
  if(result.state==='completed'){
    activationState=result.data?.ready?'ready':'needed';
    activationReason=result.data?.reason||'REDOWN activation is required for file changes.';
  }else{
    activationState='unknown';
    activationReason='Bucket setup could not be checked: '+(result.error||'Unknown error')+'. This does not establish missing permissions.';
  }
  paintActivation();
  return activationState==='ready'?true:activationState==='needed'?false:null;
}
function paintLogout(auth){
  cloudflareSignedIn=Boolean(auth?.accessToken);
  $('session-actions').hidden=!cloudflareSignedIn;
  $('disconnect').disabled=busy||!cloudflareSignedIn;
}
/* Account discovery indicator is independent of file-list loading. */
function syncAccountPicker(){globalThis.RedownAccountPicker?.sync();}
function accountVisual(next,headline='',detail=''){
  const shell=$('account-chooser');
  if(!shell)return;
  // The signed-out layout is LOGIN from the first visible frame, never the
  // old discovery tile. An authenticated fetch uses the same compact slot.
  const state=next==='loading'&&!cloudflareSignedIn?'disconnected':next;
  shell.dataset.state=state;
  const loginState=state==='unauthorized'||state==='disconnected';
  // Expired sessions may retain a stored token: never display LOGIN and
  // LOG OUT together while reauthorization is required.
  $('session-actions').hidden=loginState||!cloudflareSignedIn;
  const ready=state==='ready'&&$('accounts').options.length>0;
  $('account-picker-caption').hidden=!ready;
  $('accounts').disabled=!ready||busy;
  $('accounts').tabIndex=-1;
  $('accounts').setAttribute('aria-hidden','true');
  const action=$('account-standby-action');
  action.hidden=ready;
  action.disabled=busy||state==='loading';
  action.textContent=loginState?'LOGIN':state==='loading'?'LOADING…':'RETRY';
  action.setAttribute('aria-label',loginState?'Log in to Cloudflare securely':
    state==='loading'?'Loading Cloudflare accounts':'Retry Cloudflare account discovery');
  // Keep diagnostic context accessible without introducing visible layout.
  action.title=detail||headline||'';
  shell.setAttribute('aria-label',ready?'Cloudflare account selector':action.getAttribute('aria-label'));
  syncAccountPicker();
}
$('account-standby-action').addEventListener('click',()=>{
  const state=$('account-chooser').dataset.state;
  if(state==='unauthorized'||state==='disconnected')$('connect').click();
  else void loadAccounts(lastLocation).catch(failure);
});
const bucketCache=new Map();
const sameBucket=(a,b)=>a?.accountId===b?.accountId&&a?.bucketName===b?.bucketName;
function connectionState(state,message){listingState=state;$('dropzone').dataset.state=state;$('refresh').classList.toggle('attention',['failed','unauthorized','disconnected'].includes(state));$('refresh').title=['failed','unauthorized','disconnected'].includes(state)?'Refresh connection and discover buckets':'Refresh files';if(message)status(message);}
function failure(error){const message=error.message||'Request failed.';const state=/authoriz|permission|expired|renew|401|403|authentication/i.test(message)?'unauthorized':/\bconnect cloudflare first|session changed|connection changed/i.test(message)?'disconnected':'failed';connectionState(state,message+' Use Refresh to check the connection, or Connect Cloudflare to renew authorization.');if(state==='unauthorized'||state==='disconnected')accountVisual(state);render();}
async function rememberLocation(target){lastLocation={...target};try{await chrome.storage.local?.set({betaExplorerLocation:lastLocation});}catch{status('Folder loaded, but its location could not be saved.');}}
const context=()=>current?{...current}:null;
const chosen=()=>items.filter(item=>selected.has(item.key));
let lastUrlSelectionFingerprint='';
function announceUrlSelection(){
  const source=context(),one=chosen();
  const key=one.length===1&&!one[0].folder?one[0].key:null;
  const fingerprint=JSON.stringify([source?.accountId,source?.bucketName,key]);
  if(fingerprint===lastUrlSelectionFingerprint)return;
  lastUrlSelectionFingerprint=fingerprint;
  document.dispatchEvent(new CustomEvent('redown:explorer-url-selection',{
    detail:{source:source?{accountId:source.accountId,bucketName:source.bucketName}:null,key}
  }));
}
function status(text){$('status').textContent=text;}
function button(label,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=handler;return b;}
let deletePreferences={confirmBeforeDeleting:true,showDeleteOnDashboard:true};
let explorerQuickFolderButtons=false; // Default: folders are created from the top New folder button.
const breadcrumbs=createBreadcrumbs($('crumbs'),(entry,source)=>{if(!busy)void navigate({...source,prefix:entry.prefix},true,false,'breadcrumb');});
const remoteDialog=installRemoteDialog({document,api,openModal,run,status,getDestination:context,isBusy:()=>busy,cancel:()=>controller?.abort()});
function paintDeletePreferences(){$('delete').hidden=!deletePreferences.showDeleteOnDashboard;}
void chrome.storage.local?.get('betaExplorerDeletePreferences').then(value=>{const saved=value?.betaExplorerDeletePreferences;deletePreferences={confirmBeforeDeleting:saved?.confirmBeforeDeleting!==false,showDeleteOnDashboard:saved?.showDeleteOnDashboard!==false};paintDeletePreferences();}).catch(()=>{});
void chrome.storage.local?.get('betaExplorerInlineFolderButtons').then(value=>{
  explorerQuickFolderButtons=value?.betaExplorerInlineFolderButtons===true;
  if(current)render();
}).catch(()=>{});
function controls(){
  const loading=listingState==='loading',locked=busy||loading||Boolean(current&&listingState!=='ready');
  for(const id of ['accounts','profiles','upload','upload-folder','remote','mkdir','filter','path'])$(id).disabled=locked || (!current&&!['accounts','profiles'].includes(id));
  $('refresh').disabled=busy||loading;
  $('accounts').disabled=busy||$('account-chooser').dataset.state!=='ready';
  $('back').disabled=locked||historyIndex<1;$('forward').disabled=locked||historyIndex>=history.length-1;$('up').disabled=locked||!current?.prefix;
  for(const id of ['copy','cut','delete','duplicate','copy-to','move-to'])$(id).disabled=locked||!selected.size;
  for(const id of ['rename','properties'])$(id).disabled=locked||selected.size!==1;
  $('get-url').disabled=locked||selected.size!==1||Boolean(chosen()[0]?.folder);
  $('archive').disabled=locked||selected.size!==1||chosen()[0]?.folder||!(/\.(zip|cbz)$/i.test(chosen()[0]?.key||''));
  $('preview').disabled=locked||selected.size!==1||(previewMode==='window'&&(!chosen()[0]?.folder&&!previewType(chosen()[0]?.key||'')&&!/\.(zip|cbz)$/i.test(chosen()[0]?.key||'')));
  paintActivation();$('create-bucket').disabled=locked||!$('accounts').value;
  $('download').disabled=locked||!selected.size||chosen().some(e=>e.folder);
  $('paste').disabled=locked||!clipboard||!current;
  $('connect').disabled=busy;$('disconnect').disabled=busy||!cloudflareSignedIn;
  $('selection').textContent=selected.size?selected.size+' selected · '+bytes(chosen().filter(e=>!e.folder).reduce((n,e)=>n+Number(e.size||0),0)):items.length+' items'+(cursor?' · more available':'');
  $('more').hidden=!cursor;$('more').disabled=locked;
  $('cancel').hidden=!busy;
  document.querySelectorAll('#buckets button').forEach(b=>b.disabled=busy);
  syncAccountPicker();
}
function visible(){const query=$('filter').value.toLocaleLowerCase(),sort=$('sort').value;return items.filter(e=>e.displayName.toLocaleLowerCase().includes(query)).sort((a,b)=>Number(b.folder)-Number(a.folder)||(sort==='size'?Number(b.size||0)-Number(a.size||0):sort==='date'?(Date.parse(b.uploaded||b.last_modified)||0)-(Date.parse(a.uploaded||a.last_modified)||0):0)||(sort==='name-desc'?-1:1)*a.displayName.localeCompare(b.displayName,undefined,{numeric:true}));}
function render(){
  const shown=visible();$('files').replaceChildren(...shown.map((item,index)=>{
    const row=document.createElement('div');row.className='file'+(item.folder?' folder':'');row.dataset.key=item.key;row.setAttribute('role','option');row.setAttribute('aria-selected',String(selected.has(item.key)));row.tabIndex=0;
    const title=document.createElement('span');title.className='file-name';const icon=document.createElement('span');icon.className='icon';icon.setAttribute('aria-hidden','true');icon.textContent=item.folder?'▰':(item.displayName.split('.').length>1?item.displayName.split('.').pop().slice(0,4).toUpperCase():'FILE');const text=document.createElement('span');text.className='name';text.textContent=item.displayName;title.append(icon,text);
    const size=document.createElement('span');size.className='file-size';size.textContent=item.folder?'Folder':bytes(item.size);const date=document.createElement('span');date.className='file-date';const d=new Date(item.uploaded||item.last_modified||item.lastModified||'');date.textContent=Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});row.append(title,size,date);
    if(item.folder&&explorerQuickFolderButtons){const plus=button('+',event=>{event.stopPropagation();beginInlineFolder({...context(),prefix:item.key});});plus.className='folder-add';plus.setAttribute('aria-label','Create folder inside '+item.displayName);row.append(plus);}
    row.draggable=true;row.ondragstart=event=>{if(busy||listingState!=='ready'){event.preventDefault();return;}if(!selected.has(item.key)){selected=new Set([item.key]);paintSelection();}dragState={source:context(),entries:chosen().map(e=>({...e})),operation:'move'};event.dataTransfer.setData('application/x-redown-beta','selection');event.dataTransfer.effectAllowed='copyMove';};row.ondragend=()=>{dragState=null;row.classList.remove('drop-target');};
    if(item.folder){row.ondragover=event=>{event.preventDefault();event.stopPropagation();if(!busy&&listingState==='ready'){row.classList.add('drop-target');event.dataTransfer.dropEffect=dragState?(event.ctrlKey||event.metaKey?'copy':'move'):'copy';}};row.ondragleave=()=>row.classList.remove('drop-target');row.ondrop=event=>{event.preventDefault();event.stopPropagation();row.classList.remove('drop-target');if(busy||listingState!=='ready')return;const target={...context(),prefix:item.key};if(dragState){const clip={...dragState,operation:event.ctrlKey||event.metaKey?'copy':'move'};void actions.paste(target,clip,{method:'drop'}).catch(e=>status(e.message));}else void droppedFiles(event,target);};}
    row.onclick=event=>{
      if(busy||listingState!=='ready')return;
      if(event.shiftKey&&anchor>=0){if(!event.ctrlKey&&!event.metaKey)selected.clear();for(const e of shown.slice(Math.min(anchor,index),Math.max(anchor,index)+1))selected.add(e.key);}
      else if(event.ctrlKey||event.metaKey){selected.has(item.key)?selected.delete(item.key):selected.add(item.key);anchor=index;}
      else {selected=new Set([item.key]);anchor=index;}
      paintSelection();
      row.focus({preventScroll:true});
      if(previewMode==='window'&&selected.size===1&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!item.folder&&/\.(zip|cbz)$/i.test(item.key))void actions.archive();
    };
    row.ondblclick=()=>{if(!busy&&listingState==='ready'){if(item.folder)void navigate({...context(),prefix:item.key});else {selected=new Set([item.key]);void (/\.(zip|cbz)$/i.test(item.key)?actions.archive():previewType(item.key)?actions.preview():actions.download());}}};
    row.oncontextmenu=event=>{event.preventDefault();if(busy||listingState!=='ready')return;if(!selected.has(item.key)){selected=new Set([item.key]);paintSelection();}showMenu(event.clientX,event.clientY);};
    return row;
  }));
  $('empty').hidden=shown.length>0;$('empty').textContent=listingState==='loading'?'Loading Cloudflare files…':listingState==='unauthorized'?'Cloudflare authorization required. Reconnect or Refresh.':listingState==='failed'?'Could not load files. Use Refresh to retry safely.':!current?(listingState==='choose'?'Choose a bucket from the sidebar.':listingState==='empty-buckets'?'No accessible R2 buckets were found.':'Connect Cloudflare and use Refresh to discover buckets.'):shown.length?'':$('filter').value?'No matches in the loaded items.':'This folder is empty. Drop a file to make it yours.';
  $('heading').textContent=current?current.bucketName:'Your files, beautifully organized.';
  const path=current?orderedBreadcrumbPath(current):[];
  breadcrumbs.update(path,current?{...current}:null);
  controls();syncSideSelection();practice?.paintOwnership();announceUrlSelection();
}
let commandInvocation=null;
function invokeCommand(id,method,input={}){commandInvocation={method,...input};try{$(id).click();}finally{commandInvocation=null;}}
function guideAction(action,detail={}){if(action==='command')detail={commandId:crypto.randomUUID(),invocation:commandInvocation||{method:'toolbar'},entries:chosen().map(e=>({...e})),source:context(),...detail};document.dispatchEvent(new CustomEvent('redown:gui',{detail:{...detail,commandAction:detail.action,action}}));}
function paintSelection(){document.querySelectorAll('.file').forEach(row=>row.setAttribute('aria-selected',String(selected.has(row.dataset.key))));controls();syncSideSelection();announceUrlSelection();if(chosen().some(e=>!e.folder))guideAction('select-file');}
function progress(event){
  if(event.phase==='item'){$('progress').hidden=false;$('progress').max=event.total;$('progress').value=event.index;status(`Processing item ${event.index+1} of ${event.total}…`);}
  if(event.phase==='uploading')status('Uploading file bytes… Keep this page open.');
  if(event.phase==='verifying'){status('Checking uploaded bytes against your original file…');$('progress').hidden=false;$('progress').max=event.totalBytes||1;$('progress').value=event.bytes;}
  if(event.phase==='committing')status('Upload received. Committing and checking the destination…');
  if(event.phase==='download-complete')status('Download complete (reported by browser). File integrity was not independently verified.');
  if(event.phase==='download-interrupted')status('Download interrupted: '+(event.error||'Check your browser downloads for details.'));
}
async function request(operation,input,options={}) {
  const result=await api.run(operation,input,{onProgress:progress,...options});
  if(['failed','uncertain','cancelled'].includes(result.state))throw Object.assign(Error(result.error),{result,code:result.code});return result;
}
async function listing(add=false){
  if(!current)return;const ticket=++epoch,target=context();
  connectionState('loading','Loading R2 files…');render();
  let result;try{result=await request('list',{source:target,cursor:add?cursor:''},{signal:controller?.signal});}catch(error){if(ticket!==epoch)return;throw error;}if(ticket!==epoch)return;
  connectionState('ready');
  items=add?[...new Map([...items,...result.data.entries].map(e=>[e.key,e])).values()]:result.data.entries;cursor=result.data.cursor;
  selected=new Set([...selected].filter(k=>items.some(e=>e.key===k)));render();return result.data;
}
async function navigate(target,record=true,restore=false,origin=null){
  const previous=context(),testItCorrelation=practice?.capture();
  if(busy)return;cancelInlineFolder();let next;try{next={...target,prefix:prefix(target.prefix||'')};}catch(e){status(e.message);return;}current=next;selected.clear();anchor=-1;items=[];cursor='';$('filter').value='';epoch++;
  if(!sameBucket(previous,next))resetActivation();
  if(record){history=history.slice(0,historyIndex+1);history.push(context());historyIndex=history.length-1;}
  $('accounts').value=next.accountId;syncAccountPicker();paintBuckets(next.accountId);render();
  try{const pending=listing(),ticket=epoch;const result=await pending;if(ticket!==epoch||!result)return;if(restore&&result?.folderExists===false&&sameBucket(current,next)){await navigate({...next,prefix:''},record);status('Saved folder no longer exists. Opened the bucket root.');return;}if(sameBucket(current,next)&&current.prefix===next.prefix){await rememberLocation(next);if(ticket!==epoch||!sameBucket(current,next)||current.prefix!==next.prefix)return;status('Folder refreshed from Cloudflare R2.');if(!sameBucket(previous,next)||activationState==='idle'||activationState==='unknown')void checkActivation(next);guideAction(next.prefix?'folder-open':'bucket-open',{previous,current:context(),origin,completed:true,testItCorrelation});}}catch(e){failure(e);void checkActivation(next);}
}
async function run(task,{refresh=true,checkWorker=refresh}={}) {
  if(busy)return;busy=true;controller=new AbortController();controls();
  try{if(checkWorker&&current)await ensureWorker(context(),controller.signal);controller.signal.throwIfAborted();await task(controller.signal);if(refresh&&current){const outcomeText=$('status').textContent;try{await listing();status(outcomeText);}catch(error){failure(Error(outcomeText+' Folder refresh failed: '+error.message));}}}
  catch(e){status(e.message||'Operation failed. Refresh before retrying.');if(activationState!=='needed')$('refresh').classList.add('attention');}
  finally{busy=false;controller=null;$('progress').hidden=true;controls();}
}
async function ensureWorker(source,signal){
  const result=await request('connectionStatus',{source},{signal});
  if(result.data.ready)return;
  if(sameBucket(current,source)){activationSource={accountId:source.accountId,bucketName:source.bucketName};activationState='needed';activationReason=result.data.reason;paintActivation();}
  throw Error(result.data.reason+' No file changes were sent.');
}
function outcome(result){
  const list=result.results || [result],bad=list.filter(r=>r.state!=='completed'&&r.state!=='started');
  const partial=result.state==='partial'||bad.length;
  const details=[...new Set(list.flatMap(r=>r.error?[r.error]:[...(r.data?.errors||[]).map(e=>typeof e==='string'?e:e.error||'File failed'),...(r.data?.conflicts||[]).map(()=> 'Destination exists; skipped.'),...(r.data?.partialMove?['Some copies succeeded but source deletion was not confirmed.']:[]),...(r.data?.recoveryKey?['Temporary upload retained at '+r.data.recoveryKey]:[])]))];
  status(!partial&&list.every(r=>r.data?.downloadState==='complete')?'Download complete (reported by browser). File integrity was not independently verified.':partial?`Partial result. ${details.join(' ') || 'Stopped before all items completed. Refresh and inspect both locations.'}`:list.some(r=>r.state==='started')?'Download started. Chrome will report completion or interruption.':'Operation completed and provider result confirmed.');
}
function openModal(modal){modal.showModal();document.dispatchEvent(new CustomEvent('redown:modal-open',{detail:{modal}}));}
function dialog(title,{description='',value='',input=true,details='',confirm='Continue',cancel='Cancel',required=true}={}){
  if($('dialog').open)return Promise.resolve(null);
  $('dialog-cancel').textContent=cancel;$('dialog-title').textContent=title;$('dialog-description').textContent=description;$('dialog-input').hidden=!input;$('dialog-label').hidden=!input;$('dialog-input').value=value;$('dialog-input').required=input&&required;$('dialog-details').hidden=!details;$('dialog-details').textContent=details;$('dialog-confirm').textContent=confirm;$('dialog').returnValue='';openModal($('dialog'));
  if(input){$('dialog-input').focus();$('dialog-input').select();}else $(confirm==='Delete permanently'?'dialog-cancel':'dialog-confirm').focus();
  return new Promise(resolve=>$('dialog').addEventListener('close',()=>resolve($('dialog').returnValue==='ok'?(input?$('dialog-input').value:true):null),{once:true}));
}
let inlineFolderSource=null;
function beginInlineFolder(source=context()){
  if(!source||busy)return;
  inlineFolderSource={...source};$('inline-folder').hidden=false;
  $('inline-folder-parent').textContent=source.bucketName+'/'+source.prefix;
  $('inline-folder-status').textContent='';$('inline-folder-name').focus();
}
function cancelInlineFolder(){if(busy)return;$('inline-folder').hidden=true;$('inline-folder-name').value='';inlineFolderSource=null;}
$('inline-folder-cancel').onclick=cancelInlineFolder;
$('inline-folder').onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelInlineFolder();$('mkdir').focus();}};
$('inline-folder').onsubmit=async event=>{
  event.preventDefault();if(!inlineFolderSource||busy)return;
  const source={...inlineFolderSource};let folderName;
  try{folderName=name($('inline-folder-name').value);}catch(error){$('inline-folder-status').textContent=error.message;return;}
  $('inline-folder-status').textContent='Creating…';let created=false;
  await run(async signal=>{
    if(!sameBucket(current,source))throw Error('Bucket changed. Open New folder in the intended location.');
    if(items.some(e=>e.folder&&e.key===source.prefix+folderName+'/'))throw Error('That folder already exists here.');
    await request('mkdir',{source,name:folderName},{signal});
    const result=await request('list',{source:{...source,prefix:source.prefix+folderName+'/'}},{signal});
    if(result.data.folderExists===false)throw Error('Creation was not verified. Refresh before retrying.');
    if(current.prefix===source.prefix){items.push({key:source.prefix+folderName+'/',displayName:folderName,folder:true});render();}created=true;
    $('inline-folder-status').textContent='Folder created.';status('Created '+source.bucketName+'/'+source.prefix+folderName+'/');
  },{refresh:false});
  if(created){cancelInlineFolder();$('mkdir').focus();}else $('inline-folder-status').textContent=$('status').textContent;
};
const actions={
  async archive({startAtEnd=false,classic=false}={}){
    if(!classic&&archivePreviewMode==='reader'){const item=chosen()[0];if(item&&!busy)await showPreview(item);return;}
    if($('preview-dialog').open)$('preview-dialog').close();const e=chosen()[0],source=context();if(!e||e.folder||busy||!(/\.(zip|cbz)$/i.test(e.key)))return;
    await run(async signal=>{
      const result=await request('archiveEntries',{source,key:e.key},{signal});
      const files=normalizeArchiveEntries(result.data.archive?.entries||[]);
      archiveContext={source,key:e.key,name:e.displayName,entries:files,prefix:'',selected:new Set(),previewKey:null,previewTicket:0,previewController:null};
      $('archive-title').textContent=e.displayName;
      $('archive-prefix').value=source.prefix;
      $('archive-status').textContent=files.length+' files indexed. Browse without extraction; tick any files you want to extract.';
      $('archive-all').checked=false;
      openModal($('archive-dialog'));
      // Most CBZ files place pages inside one enclosing directory.
      let first='';for(let depth=0;depth<12;depth++){const listing=archiveFolder(files,first);if(listing.files.length||listing.folders.length!==1)break;first=listing.folders[0].key;}
      renderArchiveFolder(first,{startAtEnd});
      $('archive-close').focus();
    },{refresh:false});
  },
  async preview(){const e=chosen()[0];if(!e||busy)return;if(!e.folder&&/\.(zip|cbz)$/i.test(e.key))return actions.archive();await showPreview(e);},
  async 'get-url'(){const e=chosen()[0],source=context();if(!e||busy)return;
    const menu=globalThis.RedownPublicAddresses.popover({document,load:async source=>(await request('publicUrls',{source})).data,
      enable:source=>chrome.runtime.sendMessage({type:'cfEnablePublicAccess',...source,confirmed:true}),onState:status});
    await menu.show({source,key:e.key,name:e.displayName,returnFocus:$('get-url'),isCurrent:()=>current?.accountId===source.accountId&&current?.bucketName===source.bucketName});
  },
  async duplicate(){if(busy||!selected.size)return;guideAction('command',{action:'duplicate'});await actions.paste(context(),{source:context(),entries:chosen().map(e=>({...e})),operation:'copy',conflict:'keep'});},
  async 'copy-to'(){await chooseTransfer('copy');},
  async 'move-to'(){await chooseTransfer('move');},
  copy(){if(busy||!selected.size)return;clipboard={source:context(),entries:chosen().map(e=>({...e})),operation:'copy'};guideAction('command',{action:'copy',clipboard:{source:clipboard.source,entries:clipboard.entries,operation:clipboard.operation}});status(selected.size+' items copied to REDOWN clipboard.');controls();},
  cut(){if(busy||!selected.size)return;if(practice?.session?.active)practice.session.assertOwned(context(),chosen());clipboard={source:context(),entries:chosen().map(e=>({...e})),operation:'move'};guideAction('command',{action:'cut',clipboard:{source:clipboard.source,entries:clipboard.entries,operation:clipboard.operation}});status(selected.size+' items ready to move. Sources remain until paste.');controls();},
  async paste(destination=context(),clip=clipboard,invocation=commandInvocation||{method:'toolbar'},testItCorrelation){
    if(busy||!clip||!destination)return;if(practice?.session?.active&&clip.operation==='move')practice.session.assertOwned(clip.source,clip.entries);guideAction('command',{action:'paste',invocation,entries:clip.entries,source:clip.source,destination,clipboard:{source:clip.source,entries:clip.entries,operation:clip.operation}});testItCorrelation ||= practice?.capture();const sameFile=clip.operation==='copy'&&sameBucket(clip.source,destination)&&clip.entries.every(e=>e.key===(destination.prefix||'')+e.key.split('/').pop());const conflict=clip.conflict||(practice?.session?.active&&sameFile?'keep':$('conflict').value);
    if(conflict==='replace'&&!await dialog('Replace existing destinations?',{input:false,description:'Matching destination files may be overwritten. Other files remain. This cannot be undone.',confirm:'Replace'}))return;
    await run(async signal=>{if(!sameBucket(destination,current))await ensureWorker(destination,signal);const result=await api.batch(clip.operation,clip.entries.map(e=>({source:clip.source,destination,entries:[e],conflict})),{signal,onProgress:progress,testItCorrelation});outcome(result);if(clip.operation==='move'&&clip===clipboard){const remaining=clip.entries.filter((e,i)=>result.results[i]?.state!=='completed');clipboard=remaining.length?{...clip,entries:remaining}:null;}});
  },
  async rename(){const e=chosen()[0],source=context();if(!e||busy)return;guideAction('command',{action:'rename'});const testItCorrelation=practice?.capture();const n=await dialog('Rename '+e.displayName,{value:e.displayName});if(n===null||n===e.displayName)return;await run(async()=>outcome(await request('rename',{source,entry:e,newName:name(n)},{testItCorrelation})));},
  async delete(){const entries=chosen(),source=context();if(!entries.length||busy)return;if(practice?.session?.active)practice.session.assertOwned(source,entries);guideAction('command',{action:'delete'});const testItCorrelation=practice?.capture();if(deletePreferences.confirmBeforeDeleting&&!await dialog('Delete '+entries.length+' selected items?',{input:false,description:entries.slice(0,8).map(e=>e.displayName).join(', ')+(entries.length>8?' and '+(entries.length-8)+' more':'')+'. Permanently removes these items and every object inside selected folders from '+source.bucketName+'. This cannot be undone.',confirm:'Delete permanently'}))return;await run(async signal=>outcome(await api.batch('delete',entries.map(e=>({source,entries:[e]})),{signal,onProgress:progress,testItCorrelation})));},
  async mkdir(){
    const source=context();if(!source||busy)return;
    // The Explorer's default remains its traditional top-toolbar New folder
    // dialog. Optional inline + buttons on folder rows are independent.
    const value=await dialog('New folder',{description:'Create a folder in '+source.bucketName+'/'+source.prefix,confirm:'Create folder'});
    if(value===null)return;
    let folderName;try{folderName=name(value);}catch(error){status(error.message);return;}
    await run(async signal=>{
      if(!sameBucket(source,current)||source.prefix!==current?.prefix)throw Error('Folder changed. Choose New folder in the intended location.');
      await request('mkdir',{source,name:folderName},{signal});
      status('Created '+source.bucketName+'/'+source.prefix+folderName+'/');
    });
  },
  async download(){const source=context(),entries=chosen();if(!entries.length||entries.some(e=>e.folder)||busy)return;guideAction('command',{action:'download'});const testItCorrelation=practice?.capture();await run(async signal=>outcome(await api.batch('download',entries.map(e=>({source,entry:e})),{signal,onProgress:progress,testItCorrelation})),{refresh:false});},
  async properties(){const e=chosen()[0],source=context();if(!e||busy)return;await run(async()=>{const result=e.folder?{key:e.key,type:'Folder prefix',bucket:source.bucketName,...(await request('list',{source:{...source,prefix:e.key}})).data}:(await request('stat',{source,key:e.key})).data.object;if(!result)throw Error('This file is no longer present. Refresh the folder.');await dialog('Properties',{input:false,details:JSON.stringify(result,null,2),confirm:'Close'});},{refresh:false});},
  async remote(){remoteDialog.open();}
};
for(const [id,action] of Object.entries(actions))$(id).onclick=()=>{try{Promise.resolve(action()).catch(e=>status(e.message));}catch(e){status(e.message);}};
async function upload(files,source=context()){
if(!source||busy||listingState!=='ready'||!files.length)return;
  const conflict=$('conflict').value;
  if(conflict==='replace'&&!await dialog('Replace matching uploaded files?',{input:false,description:'Existing destination files with matching names may be overwritten.',confirm:'Replace'}))return;
  await run(async signal=>{const inputs=files.map(value=>{const file=value.file||value;return {source,file,key:source.prefix+(value.relativePath||file.webkitRelativePath||file.name),conflict};});outcome(await api.batch('upload',inputs,{signal,onProgress:progress}));});
}
$('upload').onclick=()=>$('picker').click();$('upload-folder').onclick=()=>$('folder-picker').click();
for(const id of ['picker','folder-picker'])$(id).onchange=()=>{const files=Array.from($(id).files);$(id).value='';void upload(files).catch(e=>status(e.message));};
$('dropzone').ondragover=event=>{event.preventDefault();if(current&&!busy)$('dropzone').classList.add('drag');};$('dropzone').ondragleave=()=>$('dropzone').classList.remove('drag');
async function droppedFiles(event,target=context()){
  if(!target||busy||listingState!=='ready')return;
  // Capture handles during the drop event, before the browser protects its data store.
  const entries=[...event.dataTransfer.items].map(item=>{const entry=item.webkitGetAsEntry?.(),file=entry?null:item.getAsFile?.();return {kind:item.kind,webkitGetAsEntry:()=>entry,getAsFile:()=>file};}),fallback=[...event.dataTransfer.files];
  const conflict=$('conflict').value;
  if(conflict==='replace'&&!await dialog('Replace matching dropped files?',{input:false,description:'Existing destination files with matching relative paths may be overwritten.',confirm:'Replace'}))return;
  await run(async signal=>{status('Reading dropped folder paths…');const files=await collectDroppedFiles(entries,fallback,{signal,onEntry:count=>status('Found '+count+' files in dropped folders…')});
    if(!files.length){status('No files found. Empty folders were not uploaded.');return;}
    const inputs=files.map(({file,relativePath})=>({source:target,file,key:target.prefix+relativePath,conflict}));outcome(await api.batch('upload',inputs,{signal,onProgress:progress}));
  });
}
$('dropzone').ondrop=event=>{event.preventDefault();$('dropzone').classList.remove('drag');if(listingState!=='ready')return;if(dragState){const clip={...dragState,operation:event.ctrlKey||event.metaKey?'copy':'move'};void actions.paste(context(),clip,{method:'drop'}).catch(e=>status(e.message));}else void droppedFiles(event);};
$('dialog-cancel').onclick=()=>$('dialog').close('cancel');$('sort').onchange=render;$('filter').oninput=render;$('refresh').onclick=()=>run(()=>refreshConnection(),{refresh:false});$('more').onclick=()=>run(()=>listing(true),{refresh:false});
$('path').onclick=async()=>{if(!current||busy)return;const target=context(),p=await dialog('Go to folder',{description:'Enter a bucket-relative folder path. Leave empty for the bucket root.',value:target.prefix,required:false});if(p!==null)void navigate({...target,prefix:p}).catch(e=>status(e.message));};
$('back').onclick=()=>{if(historyIndex>0)void navigate(history[--historyIndex],false);};$('forward').onclick=()=>{if(historyIndex<history.length-1)void navigate(history[++historyIndex],false);};$('up').onclick=()=>{if(current)void navigate({...context(),prefix:current.prefix.replace(/[^/]+\/$/,'')});};
const overflow=document.querySelector('.rd-overflow');overflow.addEventListener('click',event=>{if(event.target.closest('button'))overflow.open=false;});overflow.addEventListener('keydown',event=>{if(event.key==='Escape'){overflow.open=false;overflow.querySelector('summary').focus();event.preventDefault();}});
$('view').onclick=()=>{$('files').classList.toggle('grid');$('view').textContent=$('files').classList.contains('grid')?'List view':'Grid view';guideAction('switch-view');};
$('cancel').onclick=()=>{controller?.abort();status('Stopping the upload or remaining items. A running cloud copy or move may still complete; refresh before retrying.');};
function showMenu(x,y){const menu=$('context');menu.replaceChildren(...['archive','preview','get-url','copy','cut','paste','duplicate','copy-to','move-to','rename','download','properties','delete','mkdir','refresh'].filter(id=>!$(id).disabled).map(id=>{const b=button($(id).textContent,()=>{menu.hidden=true;invokeCommand(id,'contextmenu');});b.dataset.command=id;b.disabled=$(id).disabled;return b;}));menu.hidden=false;menu.style.left=Math.max(0,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(0,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button:not(:disabled)')?.focus();}
document.addEventListener('click',e=>{if(!$('context').contains(e.target))$('context').hidden=true;});
$('dropzone').oncontextmenu=e=>{if(e.target.closest('.file')||busy)return;e.preventDefault();showMenu(e.clientX,e.clientY);};
// Keyboard semantics are determined by the selected item's kind, not the
// number of grid columns. Collection pages own horizontal arrows; media
// owns horizontal file-to-file browsing; documents own vertical reading.
function explorerPreviewKind(item){
  if(!item)return 'none';
  if(item.folder||/\.(zip|cbz)$/i.test(item.key||''))return 'collection';
  const type=previewType(item.key)||'';
  if(type.startsWith('image/')||type.startsWith('video/')||type.startsWith('audio/'))return 'media';
  if(type==='application/pdf'||type.startsWith('text/'))return 'document';
  return 'other';
}
function moveGridItem(direction,{preview=false,skipUnsupported=false}={}){
  const rows=[...$('files').querySelectorAll('.file')];
  const active=document.activeElement?.closest?.('#files .file');
  const picked=chosen().length===1?chosen()[0]:null;
  let index=rows.findIndex(row=>row===active);
  if(index<0&&picked)index=rows.findIndex(row=>row.dataset.key===picked.key);
  if(index<0)return false;
  const byKey=new Map(visible().map(item=>[item.key,item]));
  let nextIndex=index+direction;
  if(skipUnsupported){
    while(nextIndex>=0&&nextIndex<rows.length&&
      explorerPreviewKind(byKey.get(rows[nextIndex].dataset.key))==='other'){
      nextIndex+=direction;
    }
  }
  if(nextIndex<0||nextIndex>=rows.length)return false;
  const target=rows[nextIndex];
  const item=byKey.get(target.dataset.key);
  const wasWindow=previewMode==='window'&&$('preview-dialog').open;
  if(wasWindow)$('preview-dialog').close();
  target.focus({preventScroll:true});target.click();target.scrollIntoView?.({block:'nearest',inline:'nearest'});
  // Keep the read/view experience continuous when the window was already
  // open or an arrow requested a new preview. Never open remote folders.
  if(item&&(preview||wasWindow)&&!(previewMode==='side'&&sideState==='open')&&
      !(previewMode==='window'&&!item.folder&&/\.(zip|cbz)$/i.test(item.key))&&
      (item.folder||previewType(item.key))){
    void showPreview(item);
  }
  return true;
}
function scrollDocumentPreview(direction){
  const view=$('preview-content');
  const scrolling=view.querySelector('pre')||view;
  const delta=Math.max(170,Math.round((scrolling.clientHeight||view.clientHeight||320)*.75));
  if(typeof scrolling.scrollBy==='function')scrolling.scrollBy({top:direction*delta,behavior:'auto'});
  else scrolling.scrollTop+=direction*delta;
}
function navigateSelectedArrow(key,{modal=false}={}){
  const item=chosen().length===1?chosen()[0]:null;
  if(!item)return false;
  const kind=explorerPreviewKind(item),direction=key==='ArrowRight'||key==='ArrowDown'?1:-1;
  const vertical=key==='ArrowUp'||key==='ArrowDown';
  if(vertical){
    if(kind==='document'){
      if(previewItem?.key===item.key)scrollDocumentPreview(direction);
      else void showPreview(item);
      return true;
    }
    // Up/Down is always the explicit escape from ZIP/CBZ and folder reading.
    moveGridItem(direction);
    return true;
  }
  if(kind==='collection'){
    if(readerSession&&previewItem?.key===item.key)void adjacentPreview(direction,key);
    else if(!item.folder&&archivePreviewMode==='classic')void actions.archive({classic:true,startAtEnd:direction<0});
    else void showPreview(item,{startAtEnd:direction<0});
    return true;
  }
  // A document's horizontal arrows leave the document. Individual media
  // horizontally traverses neighboring grid entries, including archives.
  moveGridItem(direction,{preview:kind==='media'||kind==='document'||modal,skipUnsupported:kind==='media'||kind==='document'});
  return true;
}
document.addEventListener('keydown',event=>{
  if(event.target.closest?.('.guide-card,.tour-invitation,.explorer-menu-wrap,.test-it-tools-wrap'))return;
  if(event.key==='Escape'){$('context').hidden=true;return;}
  if(event.target.closest?.('input,select,textarea,dialog,[contenteditable="true"],video,audio,[role="slider"],[role="spinbutton"]')||busy)return;
  const modified=event.ctrlKey||event.metaKey,k=event.key.toLowerCase();
  if(event.altKey&&['ArrowLeft','ArrowRight','ArrowUp'].includes(event.key)){event.preventDefault();$({ArrowLeft:'back',ArrowRight:'forward',ArrowUp:'up'}[event.key]).click();}
  else if(!modified&&!event.altKey&&!event.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&
    (event.target.closest?.('#files,#side-preview')||document.activeElement?.closest?.('#files .file'))){
    if(navigateSelectedArrow(event.key))event.preventDefault();
  }
  else if(event.key==='Backspace'){event.preventDefault();$('up').click();}
  else if(event.key==='F5'){event.preventDefault();$('refresh').click();}
  else if(modified&&event.shiftKey&&k==='n'){event.preventDefault();$('mkdir').click();}
  else if(modified&&k==='a'){event.preventDefault();selected=new Set(visible().map(e=>e.key));paintSelection();}
  else if(modified&&['c','x','v'].includes(k)){event.preventDefault();invokeCommand({c:'copy',x:'cut',v:'paste'}[k],'keyboard',{key:k,ctrl:true});}
  else if(event.key==='F2'){event.preventDefault();$('rename').click();}
  else if(event.key==='Delete'){$('delete').click();}
  else if(event.key==='Enter'&&event.target.closest?.('.file')){event.preventDefault();event.target.closest?.('.file').ondblclick();}
  else if(event.key===' '&&event.target.closest?.('.file')){event.preventDefault();event.target.closest?.('.file').click();}
});

function paintBuckets(accountId){
  const buckets=bucketCache.get(accountId)||[];
  $('buckets').replaceChildren(...buckets.map(bucket=>{
    const target={accountId,accountName:accounts.find(a=>a.id===accountId)?.name||'',bucketName:bucket.name,prefix:''};
    const b=button(bucket.name,()=>navigate(target));
    const icon=document.createElement('span');
    icon.className='sidebar-bucket-icon';icon.setAttribute('aria-hidden','true');
    // Fixed icon markup only; bucket names are inserted as text, never HTML.
    icon.innerHTML='<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="10" cy="4.5" rx="6.5" ry="2.5"/><path d="M3.5 4.5v10.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V4.5M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5"/></svg>';
    const label=document.createElement('span');label.className='sidebar-bucket-name';label.textContent=bucket.name;
    b.replaceChildren(icon,label);b.dataset.bucket=bucket.name;
    b.toggleAttribute('aria-current',sameBucket(current,target));return b;
  }));
  controls();
}
async function loadBuckets(){
  const accountId=$('accounts').value;if(!accountId)return;
  resetActivation();
  const ticket=++discoveryEpoch;epoch++;current=null;items=[];selected.clear();cursor='';
  $('buckets').replaceChildren();connectionState('loading','Discovering R2 buckets…');render();
  try{const result=await request('buckets',{accountId});if(ticket!==discoveryEpoch)return;
    bucketCache.set(accountId,result.data.buckets||[]);paintBuckets(accountId);
    current=null;items=[];selected.clear();cursor='';clipboard=null;history=[];historyIndex=-1;epoch++;
    const buckets=bucketCache.get(accountId),saved=lastLocation?.accountId===accountId&&buckets.some(b=>b.name===lastLocation.bucketName)?lastLocation:null;
    if(saved||buckets.length===1)await navigate(saved||{accountId,bucketName:buckets[0].name,prefix:''},true,Boolean(saved));
    else{connectionState(buckets.length?'choose':'empty-buckets',buckets.length?'Choose a bucket from the sidebar.':'No accessible R2 buckets in this account.');render();}
  }catch(e){if(ticket===discoveryEpoch)failure(e);}
}
async function loadAccounts(preferred=current||lastLocation){
  // Never call Cloudflare accounts while signed out: keep only LOGIN visible.
  if(!cloudflareSignedIn){
    accountVisual('disconnected');
    connectionState('disconnected');
    render();
    return;
  }
  resetActivation();
  const ticket=++discoveryEpoch;epoch++;items=[];selected.clear();cursor='';accountVisual('loading');connectionState('loading','Discovering Cloudflare accounts and R2 buckets…');render();
  try{
    const result=await request('accounts',{});if(ticket!==discoveryEpoch)return;
    accounts=result.data.accounts||[];
    const discoveries=await Promise.allSettled(accounts.map(async a=>({id:a.id,buckets:(await request('buckets',{accountId:a.id})).data.buckets||[]})));
    if(ticket!==discoveryEpoch)return;bucketCache.clear();const errors=[];
    discoveries.forEach((r,i)=>{if(r.status==='fulfilled')bucketCache.set(r.value.id,r.value.buckets);else errors.push((accounts[i].name||accounts[i].id)+': '+r.reason.message);});
    $('accounts').replaceChildren(...accounts.map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name||a.id;return o;}));
    const all=accounts.flatMap(a=>(bucketCache.get(a.id)||[]).map(b=>({accountId:a.id,accountName:a.name||'',bucketName:b.name,prefix:''})));
    const restored=all.find(b=>sameBucket(b,preferred));
    let restoredPrefix='';try{restoredPrefix=prefix(preferred?.prefix||'');}catch{}
    const target=restored?{...restored,prefix:restoredPrefix}:all.length===1?all[0]:null;
    const accountId=target?.accountId||all[0]?.accountId||accounts[0]?.id||'';
    $('accounts').value=accountId;accountVisual(accounts.length?'ready':'empty');paintBuckets(accountId);
    if(target){if(busy){current={...target};const result=await listing();if(result?.folderExists===false&&target.prefix){current.prefix='';await listing();}await rememberLocation(current);}else await navigate(target,true,Boolean(restored));}
    else{current=null;items=[];cursor='';selected.clear();connectionState(all.length?'choose':errors.length?'failed':'empty-buckets',all.length?'Choose a bucket from the sidebar.':'No accessible R2 buckets were found.');render();}
    if(errors.length){if(!all.length)failure(Error(errors.join(' ')));$('refresh').classList.add('attention');status('Some accounts could not be discovered. '+errors.join(' ')+' Use Refresh to retry or Connect Cloudflare to renew authorization.');}
    try{await loadProfiles();}catch(e){status('Files discovery finished; saved destinations unavailable: '+e.message);}
  }catch(e){if(ticket===discoveryEpoch){failure(e);if(!['unauthorized','disconnected'].includes($('account-chooser').dataset.state))accountVisual('failed');}}
}
async function refreshConnection(){
  const testItCorrelation=practice?.capture();
  if(!current){await loadAccounts(lastLocation);if(accounts.length&&listingState!=='failed'&&listingState!=='unauthorized')guideAction('refresh',{testItCorrelation});return;}
  const target=context();
  try{
    const result=await listing();
    if(!result)return;
    await rememberLocation(target);
    status('Folder refreshed · '+target.bucketName+'/'+(target.prefix||'/'));if(activationState==='unknown'||activationState==='needed')void checkActivation(target);guideAction('refresh',{testItCorrelation});
  }catch(error){
    failure(error);void checkActivation(target);
    // Discovery is recovery, not a prerequisite for ordinary folder refresh.
    if(['HTTP_401','HTTP_404'].includes(error.code))await loadAccounts(target);
  }
}
$('accounts').onchange=()=>{syncAccountPicker();return loadBuckets().catch(failure);};
$('connect').onclick=()=>run(async()=>{await request('connect',{});status('Finish Cloudflare sign-in in the window that opened.');},{refresh:false});
$('disconnect').onclick=async()=>{
  if(busy||!cloudflareSignedIn)return;
  if(!await dialog('Log out of Cloudflare?',{
    input:false,
    description:'This signs out of Cloudflare across REDOWN, including the original Explorer and Shelf. Cloud files, saved destinations, and transfer history remain untouched.',
    confirm:'LOG OUT'
  }))return;
  await run(async()=>{
    await request('disconnect',{});
    paintLogout(null);
    resetActivation();current=null;items=[];selected.clear();cursor='';clipboard=null;accounts=[];history=[];historyIndex=-1;bucketCache.clear();
    connectionState('disconnected');
    $('accounts').replaceChildren();accountVisual('disconnected');$('buckets').replaceChildren();
    render();status('Logged out of Cloudflare. Your cloud files remain untouched.');
  },{refresh:false});
};
document.addEventListener('redown:destinations-ready',event=>{
  if(current&&sameBucket(current,event.detail))void checkActivation(context());
});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='session'&&changes.historySideNavigation)void useHistoryNavigation(changes.historySideNavigation.newValue,{side:true});if(area!=='local')return;if(changes.betaExplorerArchivePreview){archivePreviewMode=changes.betaExplorerArchivePreview.newValue==='classic'?'classic':'reader';closePreview();syncSideSelection();}if(changes.betaExplorerInlineFolderButtons){explorerQuickFolderButtons=changes.betaExplorerInlineFolderButtons.newValue===true;if(!explorerQuickFolderButtons)cancelInlineFolder();render();}if(changes.betaExplorerDeletePreferences){const saved=changes.betaExplorerDeletePreferences.newValue;deletePreferences={confirmBeforeDeleting:saved?.confirmBeforeDeleting!==false,showDeleteOnDashboard:saved?.showDeleteOnDashboard!==false};paintDeletePreferences();}if(!changes.cloudflareAuth)return;const before=changes.cloudflareAuth.oldValue,after=changes.cloudflareAuth.newValue;paintLogout(after);if(before?.sessionId===after?.sessionId&&before?.accessToken&&after?.accessToken&&before?.reconnectRequired===after?.reconnectRequired)return;epoch++;for(const id of ['dialog','preview-dialog','preferences-dialog','destination-dialog','archive-dialog','remote-dialog'])if($(id).open)$(id).close('cancel');controller?.abort();resetActivation();current=null;items=[];selected.clear();clipboard=null;$('buckets').replaceChildren();render();discoveryEpoch++;if(after?.accessToken)void loadAccounts(lastLocation).catch(failure);else {accountVisual('disconnected');connectionState('disconnected','Cloudflare session changed. Connect to continue.');render();}});
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});

async function loadProfiles(){
  const result=await request('profiles',{});savedProfiles=result.data.profiles||[];
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a saved destination…';
  $('profiles').replaceChildren(placeholder,...savedProfiles.map((p,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=(p.name||p.bucketName)+' /'+p.prefix;return o;}));
}
$('profiles').onchange=async()=>{const p=savedProfiles[Number($('profiles').value)];if($('profiles').value===''||!p||busy)return;try{if($('accounts').value!==p.accountId){$('accounts').value=p.accountId;syncAccountPicker();await loadBuckets();}await navigate(p);}catch(e){status(e.message);}};
$('create-bucket').onclick=async()=>{const accountId=$('accounts').value;if(!accountId||busy)return;const n=await dialog('Create storage bucket',{description:'Creates an R2 bucket in the selected account. Use 3–63 lowercase letters, numbers, or hyphens.',confirm:'Create bucket'});if(n===null)return;await run(async()=>{await request('createBucket',{accountId,name:n});await loadAccounts({accountId,bucketName:n,prefix:''});status('Bucket created and opened. Destination setup remains available in the sidebar.');},{refresh:false});};
$('prepare').onclick=async()=>{
  const source=context();
  if(busy)return;
  if(!source){
    showActivationGlow('attention');
    status('Choose an existing bucket under Storage Buckets before activating REDOWN.');
    const storage=$('sidebar-storage');if(storage){storage.open=true;storage.scrollIntoView?.({block:'nearest'});}
    return;
  }
  if(activationState==='idle'||activationState==='unknown'||!activationSource||!sameBucket(source,activationSource)){
    showActivationGlow('checking',{ongoing:true});
    await checkActivation(source);
    if(!sameBucket(current,source)){clearActivationGlow();return;}
  }
  if(activationState==='ready'){
    showActivationGlow('success');
    status(source.bucketName+' is already activated for REDOWN.');
    return;
  }
  if(activationState!=='needed'){
    showActivationGlow('attention');
    status('Bucket setup could not be verified. Reconnect or Refresh before activating.');
    return;
  }
  showActivationGlow('confirm');
  if(!await dialog('Activate '+source.bucketName+' for REDOWN?',{input:false,description:'Sets up or updates the REDOWN Worker for this R2 bucket, saves its destination, and prepares default folders. Existing settings are retained. This changes Cloudflare resources; it does not make the bucket public.',confirm:'Activate Buckets'}))return;
  if(!sameBucket(current,source)){clearActivationGlow();status('Bucket selection changed. No activation was sent.');return;}
  activationState='activating';paintActivation();showActivationGlow('working',{ongoing:true});
  let operationCompleted=false,menuUpdated=true;
  await run(async signal=>{
    const result=await request('prepareBucket',{source},{signal});
    operationCompleted=true;menuUpdated=result.data.menuUpdated!==false;
    await loadProfiles();
    document.dispatchEvent(new CustomEvent('redown:destinations-ready',{detail:{accountId:source.accountId,bucketName:source.bucketName}}));
    status(!menuUpdated?(result.data.menuError||'Bucket activated, but the REDOWN right-click menu could not be updated. Use Save menu to retry.'):result.data.verification?.workerReachable?'Bucket activation returned verification. Checking Worker readiness…':'Setup completed, but Worker readiness has not been confirmed.');
  },{checkWorker:false});
  if(!sameBucket(current,source)){clearActivationGlow();return;}
  await checkActivation(source);
  if(!sameBucket(current,source)){clearActivationGlow();return;}
  if(operationCompleted&&menuUpdated&&activationState==='ready'){
    showActivationGlow('success');
    status(source.bucketName+' is activated for REDOWN file operations. Add locations in Right-click setup.');
  }else{
    showActivationGlow('attention');
    if(activationState==='needed')status('Bucket setup returned, but the Worker is not yet ready. Check Cloudflare permissions or Worker configuration.');
  }
};

const preferenceFields={batchConcurrency:['pref-concurrency',1],uploadTimeoutMs:['pref-upload',1000],previewMaxBytes:['pref-preview',1048576]};
function paintPreferences(){$('pref-folder-quick-add').checked=explorerQuickFolderButtons;$('pref-archive').value=archivePreviewMode;const values={...api.getDefaults(),...api.getPreferences()};for(const [key,[id,scale]] of Object.entries(preferenceFields))$(id).value=values[key]/scale;$('pref-confirm-delete').checked=deletePreferences.confirmBeforeDeleting;$('pref-show-delete').checked=deletePreferences.showDeleteOnDashboard;$('preferences-error').textContent='';}
$('preferences').onclick=()=>{paintPreferences();openModal($('preferences-dialog'));};
$('preferences-cancel').onclick=()=>$('preferences-dialog').close();
$('preferences-reset').onclick=()=>{api.setPreferences({});$('pref-confirm-delete').checked=true;$('pref-show-delete').checked=true;$('pref-folder-quick-add').checked=false;for(const [key,[id,scale]] of Object.entries(preferenceFields))$(id).value=api.getDefaults()[key]/scale;status('Transfer preferences restored to defaults.');};
$('preferences-form').onsubmit=async event=>{event.preventDefault();try{const values=api.getPreferences();for(const [key,[id,scale]] of Object.entries(preferenceFields))values[key]=Number($(id).value)*scale;await chrome.storage.local.set({betaExplorerInlineFolderButtons:$('pref-folder-quick-add').checked,betaExplorerArchivePreview:$('pref-archive').value,betaExplorerDeletePreferences:{confirmBeforeDeleting:$('pref-confirm-delete').checked,showDeleteOnDashboard:$('pref-show-delete').checked}});deletePreferences={confirmBeforeDeleting:$('pref-confirm-delete').checked,showDeleteOnDashboard:$('pref-show-delete').checked};paintDeletePreferences();explorerQuickFolderButtons=$('pref-folder-quick-add').checked;if(!explorerQuickFolderButtons)cancelInlineFolder();render();archivePreviewMode=$('pref-archive').value;closePreview();syncSideSelection();api.setPreferences(values);$('preferences-dialog').close();status('Transfer preferences applied to this tab.');}catch(e){$('preferences-error').textContent=e.message;}};
// Both presentations own the same viewer DOM and the same universal API read.
let previewMode='side',sideState='closed',previewExpanded=false,previewWidth=400;
let previewEpoch=0,previewController=null,previewIdentity='',lightbox=false;
function setLightbox(active,key){
  lightbox=Boolean(active&&previewMode==='window'&&$('preview-dialog').open);
  $('preview-dialog').classList.toggle('image-lightbox',lightbox);
  if(lightbox)$('preview-dialog').focus();
  guideAction('lightbox-change',{open:lightbox,key});
}
function lightboxControl(){
  $('preview-lightbox').hidden=previewMode!=='window'||(!readerSession&&!(previewType(previewItem?.key||'')||'').startsWith('image/'));
  $('preview-lightbox').disabled=!$('preview-content').querySelector('img');
}
const previewViewer=$('preview-viewer');
function rememberPreview(){try{void chrome.storage.local?.set({betaExplorerPreview:{mode:previewMode,width:previewWidth}})?.catch(()=>{});}catch{/* Browsing remains usable if preferences cannot be saved. */}}
function stopPreviewMedia(unload=false){for(const media of $('preview-content').querySelectorAll('video,audio')){media.pause();if(unload){media.removeAttribute('src');media.load();}}}
function closePreview(preserveLightbox=false){
  if(!preserveLightbox)setLightbox(false);
  readerSession=null;$('preview-previous').disabled=false;$('preview-next').disabled=false;
  ++previewEpoch;previewController?.abort();previewController=null;stopPreviewMedia(true);
  $('preview-content').replaceChildren();if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl='';previewItem=null;previewIdentity='';lightboxControl();$('preview-title').textContent='File preview';$('preview-info').textContent='';
}
function layoutPreview(){
  lightboxControl();
  const side=previewMode==='side',open=side&&sideState!=='closed';
  $('side-preview').hidden=!open;$('preview-divider').hidden=!open||sideState==='minimized';
  $('file-workspace').classList.toggle('with-preview',open);$('file-workspace').classList.toggle('preview-minimized',open&&sideState==='minimized');
  $('file-workspace').classList.toggle('preview-expanded',open&&previewExpanded&&sideState==='open');
  $('side-preview').classList.toggle('minimized',sideState==='minimized');
  $('preview-minimize').hidden=!side;$('preview-expand').hidden=!side;
  $('preview-minimize').textContent=sideState==='minimized'?'+':'−';$('preview-minimize').setAttribute('aria-label',sideState==='minimized'?'Restore preview':'Minimize preview');
  $('preview-expand').textContent=previewExpanded?'⤡':'⤢';$('preview-expand').setAttribute('aria-label',previewExpanded?'Restore preview size':'Expand preview');
  $('preview-mode').value=previewMode;$('preview-mode-inline').value=previewMode;
  $('preview-divider').setAttribute('aria-valuenow',String(previewWidth));
  $('file-workspace').style.setProperty('--preview-width',previewWidth+'px');
}
function presentPreview(){
  if(previewMode==='side'){
    sideState='open';$('side-preview').append(previewViewer);
    if($('preview-dialog').open)$('preview-dialog').close();
  }else{
    $('preview-dialog').append(previewViewer);sideState='closed';
    if(!$('preview-dialog').open){openModal($('preview-dialog'));$('preview-dialog').focus();}
  }
  layoutPreview();
}
function setPreviewMode(mode){
  setLightbox(false);
  previewMode=mode==='side'?'side':'window';
  if(previewItem){presentPreview();lightboxControl();}
  else if(previewMode==='side'){sideState='open';$('side-preview').append(previewViewer);layoutPreview();syncSideSelection();}
  else{sideState='closed';$('preview-dialog').append(previewViewer);layoutPreview();}
  controls();rememberPreview();
}
$('preview-mode').onchange=event=>setPreviewMode(event.target.value);
$('preview-mode-inline').onchange=event=>setPreviewMode(event.target.value);
$('preview-close').onclick=()=>{closePreview();sideState='closed';if($('preview-dialog').open)$('preview-dialog').close();layoutPreview();$('preview').focus();};
$('preview-lightbox').onclick=()=>{if($('preview-content').querySelector('img'))setLightbox(true);};
$('side-preview').tabIndex=0;
$('preview-content').addEventListener('click',event=>{
  if(previewMode==='side'&&event.target.closest?.('img,pre')){
    $('side-preview').focus({preventScroll:true});
  }
});
$('preview-dialog').addEventListener('click',event=>{if(lightbox&&[ $('preview-dialog'),previewViewer,$('preview-content') ].includes(event.target))setLightbox(false);});
$('preview-dialog').addEventListener('cancel',event=>{event.preventDefault();if(lightbox)setLightbox(false,'Escape');else $('preview-close').click();});
document.addEventListener('keydown',event=>{
  if(previewMode!=='window'||!$('preview-dialog').open)return;
  if(event.target.closest?.('.guide-card:not(.test-it-card)'))return;
  if([...document.querySelectorAll('dialog[open]')].at(-1)!==$('preview-dialog'))return;
  if(event.key==='Escape'&&!$('context').hidden){event.preventDefault();event.stopImmediatePropagation();$('context').hidden=true;return;}
  if(event.key!=='Escape'&&event.target.closest?.('.guide-card'))return;
  // Keep all Explorer shortcuts behind the modal, even if focus was elsewhere.
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(lightbox)setLightbox(false,'Escape');else $('preview-close').click();return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
    if(!event.target.closest?.('#preview-dialog'))event.stopImmediatePropagation();return;
  }
  if(event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),video,audio,[role="slider"],[role="spinbutton"]'))return;
  if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  event.stopImmediatePropagation();
  if(navigateSelectedArrow(event.key,{modal:true}))event.preventDefault();
},true);
$('preview-dialog').addEventListener('close',()=>{if(previewMode==='window'&&!$('preview-dialog').open)closePreview();});
$('preview-minimize').onclick=()=>{sideState=sideState==='minimized'?'open':'minimized';if(sideState==='minimized')stopPreviewMedia();layoutPreview();if(sideState==='open')syncSideSelection();};
$('preview-expand').onclick=()=>{previewExpanded=!previewExpanded;sideState='open';layoutPreview();const target=window.matchMedia?.('(max-width:1150px)')?.matches?$('side-preview'):$('file-workspace');target.scrollIntoView?.({block:'start',behavior:'instant'});};
function syncSideSelection(){
  // Navigation, logout and refresh removal invalidate even a collapsed preview.
  if(previewItem&&(!sameBucket(previewItem.source,current)||previewItem.source.prefix!==current?.prefix||!items.some(e=>e.key===previewItem.key))){closePreview();}
  if(previewMode!=='side'||sideState!=='open')return;
  const item=chosen().length===1?chosen()[0]:null;
  if(item){void showPreview(item);return;}
  if(previewItem)closePreview();
  $('preview-content').textContent=selected.size?'Select one item to preview.':'Select a file or folder to preview.';
}
async function showPreview(item,navigation={}){
  const testItCorrelation=practice?.capture();
  const source=context();if(!source)return;
  const identity=JSON.stringify([source.accountId,source.bucketName,source.prefix,item.key,item.size,item.uploaded,item.last_modified,item.lastModified]);
  presentPreview();
  if(identity===previewIdentity){const node=$('preview-content').firstElementChild;if(node&&(node.tagName!=='IMG'||node.complete&&node.naturalWidth))guideAction('preview-open',{currentKey:item.key,mode:previewMode,rendered:true,testItCorrelation});return;}
  closePreview(lightbox);previewIdentity=identity;previewItem={...item,source};lightboxControl();
  $('preview-title').textContent=item.displayName;
  const metadata=[item.folder?'Folder':bytes(item.size),item.folder?'Folder prefix':previewType(item.key)||item.key.split('.').pop().toUpperCase(),source.bucketName+'/'+item.key,item.uploaded||item.last_modified||item.lastModified].filter(Boolean).join(' · ');
  $('preview-info').textContent=metadata;
  const download=()=>{const b=button('Download',()=>{if(!busy&&sameBucket(source,current)){selected=new Set([item.key]);paintSelection();void actions.download();}});return b;};
  if(!item.folder&&/\.(zip|cbz)$/i.test(item.key)){
    if(archivePreviewMode==='reader'){await openArchiveReader(item,source,navigation.startAtEnd===true);return;}
    $('preview-content').textContent='Browse ZIP/CBZ pages without extracting the archive.';
    $('preview-content').append(button('Browse archive →',()=>{if(!busy)void actions.archive({classic:true});}));
    return;
  }
  if(item.folder){await openDirectoryReader(item,source,navigation.startAtEnd===true);return;}
  if(!previewType(item.key)){
    $('preview-content').textContent='Inline preview is unavailable for this format.';
    $('preview-content').append(download());return;
  }
  $('preview-content').textContent='Loading preview…';
  const ticket=previewEpoch,abort=new AbortController();previewController=abort;let ownedUrl='';
  try{
    const result=await request('preview',{source,entry:item},{signal:abort.signal});ownedUrl=result.data.url;
    if(ticket!==previewEpoch||abort.signal.aborted)return;
    const {type,size}=result.data;let node;
    if(type.startsWith('text/')){node=document.createElement('pre');node.textContent=await (await fetch(ownedUrl)).text();}
    else if(type.startsWith('image/')){node=document.createElement('img');node.alt=item.displayName;node.src=ownedUrl;}
    else if(type.startsWith('video/')||type.startsWith('audio/')){node=document.createElement(type.startsWith('video/')?'video':'audio');node.controls=true;node.preload='metadata';node.src=ownedUrl;}
    else{node=document.createElement('iframe');node.title=item.displayName;node.referrerPolicy='no-referrer';node.src=ownedUrl;}
    if(ticket!==previewEpoch||abort.signal.aborted)return;
    if(node.tagName!=='PRE')node.addEventListener('error',()=>{if(ticket===previewEpoch){setLightbox(false);$('preview-lightbox').disabled=true;$('preview-content').textContent='This file could not be displayed. The content may be damaged or unsupported by your browser.';$('preview-content').append(download());}},{once:true});
    previewUrl=ownedUrl;ownedUrl='';
    let announced=false;const rendered=()=>{if(announced||ticket!==previewEpoch||abort.signal.aborted||!node.isConnected)return;if(node.tagName==='IMG'&&(!node.complete||!node.naturalWidth))return;announced=true;guideAction('preview-open',{...navigation,currentKey:item.key,mode:previewMode,rendered:true,testItCorrelation});};
    if(node.tagName==='IMG')node.addEventListener('load',rendered,{once:true});
    $('preview-content').replaceChildren(node);lightboxControl();if(node.tagName!=='IMG'||node.complete)rendered();$('preview-info').textContent=metadata+' · '+type+(result.data.truncated?' · Text preview truncated at '+bytes(size):'');
  }catch(error){if(ticket===previewEpoch&&!abort.signal.aborted){setLightbox(false);previewIdentity='';$('preview-content').textContent=error.message||'Preview failed.';$('preview-content').append(download());}}
  finally{if(ownedUrl)URL.revokeObjectURL(ownedUrl);if(ticket===previewEpoch)previewController=null;}
}
// A directory is a read-only preview collection. We never navigate the
// Explorer path, create files, or download folder contents to preview them.
async function openDirectoryReader(item,source,startAtEnd=false){
  const epochTicket=previewEpoch,abort=new AbortController();previewController=abort;
  const a={kind:'folder',source:{...source,prefix:item.key},key:item.key,entries:[],index:0,ticket:0};
  readerSession=a;
  $('preview-content').textContent='Reading folder contents…';
  $('preview-previous').disabled=true;$('preview-next').disabled=true;
  try{
    let cursor='',pages=0,truncated=false;const entries=[];
    do {
      const result=await request('list',{source:a.source,cursor},{signal:abort.signal});
      if(epochTicket!==previewEpoch||abort.signal.aborted||readerSession!==a)return;
      for(const entry of result.data.entries||[]){
        if(!entry.folder&&previewType(entry.key))entries.push(entry);
      }
      const next=result.data.cursor||'';
      pages++;
      truncated=Boolean(next&&entries.length>=2000);
      if(!next||next===cursor||truncated||pages>=30)break;
      cursor=next;
    }while(true);
    if(epochTicket!==previewEpoch||abort.signal.aborted||readerSession!==a)return;
    const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
    a.entries=entries.sort((x,y)=>collator.compare(x.displayName||x.key,y.displayName||y.key));
    a.truncated=truncated||pages>=30;
    if(!a.entries.length){
      $('preview-content').textContent='No previewable files in this folder. Double-click the folder to open it.';
      $('preview-info').textContent='Folder · No previewable files';
      return;
    }
    await showDirectoryPage(a,startAtEnd?a.entries.length-1:0);
  }catch(error){
    if(epochTicket===previewEpoch&&!abort.signal.aborted&&readerSession===a){
      $('preview-content').textContent=error.message||'Could not read folder contents.';
      $('preview-content').append(button('Retry folder preview',()=>void openDirectoryReader(item,source)));
    }
  }
}
async function showDirectoryPage(a,index){
  if(readerSession!==a||index<0||index>=a.entries.length)return;
  previewController?.abort();
  const abort=new AbortController();previewController=abort;
  const ticket=++a.ticket,epochTicket=previewEpoch,item=a.entries[index];
  a.index=index;
  const active=()=>readerSession===a&&ticket===a.ticket&&epochTicket===previewEpoch&&!abort.signal.aborted;
  const previousUrl=previewUrl;previewUrl='';
  if(previousUrl)URL.revokeObjectURL(previousUrl);
  stopPreviewMedia(true);
  $('preview-previous').disabled=index===0;
  $('preview-next').disabled=index===a.entries.length-1;
  $('preview-info').textContent='File '+(index+1)+' of '+a.entries.length+' · '+(item.displayName||item.key)+(a.truncated?' · More files may be available':'');
  $('preview-content').textContent='Loading file preview…';
  const fail=message=>{
    if(!active())return;
    $('preview-content').textContent=message;
    $('preview-content').append(button('Retry preview',()=>void showDirectoryPage(a,index)));
  };
  let ownedUrl='';
  try{
    const result=await request('preview',{source:a.source,entry:item},{signal:abort.signal});
    if(!active())return;
    ownedUrl=result.data.url;
    const type=result.data.type||previewType(item.key)||'';
    let node;
    if(type.startsWith('image/')){node=document.createElement('img');node.alt=item.displayName||item.key;node.src=ownedUrl;}
    else if(type.startsWith('video/')||type.startsWith('audio/')){
      node=document.createElement(type.startsWith('video/')?'video':'audio');
      node.controls=true;node.preload='metadata';node.src=ownedUrl;
    }else if(type.startsWith('text/')){
      node=document.createElement('pre');
      node.textContent=(await (await fetch(ownedUrl,{signal:abort.signal})).text()).slice(0,1048576);
    }else{
      node=document.createElement('iframe');node.title=item.displayName||item.key;
      node.referrerPolicy='no-referrer';node.src=ownedUrl;
    }
    if(!active())return;
    if(node.tagName!=='PRE')node.addEventListener('error',()=>fail('This file could not be displayed. Continue to another item or retry.'),{once:true});
    previewUrl=ownedUrl;ownedUrl='';
    $('preview-content').replaceChildren(node);lightboxControl();
  }catch(error){if(active())fail(error.message||'Could not preview this folder entry.');}
  finally{if(ownedUrl)URL.revokeObjectURL(ownedUrl);if(active())previewController=null;}
}
async function openArchiveReader(item,source,startAtEnd=false){
  const ticket=previewEpoch,abort=new AbortController();previewController=abort;
  const a={kind:'archive',source,key:item.key,entries:[],index:0,ticket:0};readerSession=a;
  $('preview-content').textContent='Reading archive index…';
  $('preview-previous').disabled=true;$('preview-next').disabled=true;
  try{
    const result=await request('archiveEntries',{source,key:item.key},{signal:abort.signal});
    if(ticket!==previewEpoch||abort.signal.aborted||readerSession!==a)return;
    const entries=normalizeArchiveEntries(result.data.archive?.entries);
    const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
    a.entries=entries.filter(e=>(previewType(e.name)||'').startsWith('image/')).sort((x,y)=>{
      const left=x.name.split('/'),right=y.name.split('/');
      for(let i=0;i<Math.min(left.length,right.length);i++){const order=collator.compare(left[i],right[i]);if(order)return order;}
      return left.length-right.length||(x.name<y.name?-1:x.name>y.name?1:0);
    });
    if(!a.entries.length){$('preview-content').textContent='This archive contains no supported images.';readerBrowseButton();return;}
    await showReaderPage(a,startAtEnd?a.entries.length-1:0);
  }catch(error){if(ticket===previewEpoch&&!abort.signal.aborted){$('preview-content').textContent=error.message;$('preview-content').append(button('Retry archive',()=>void openArchiveReader(item,source)));readerBrowseButton();}}
}
function readerBrowseButton(){
  $('preview-content').append(button('Browse Archive',()=>{if(!busy)void actions.archive({classic:true});}));
}
async function showReaderPage(a,index){
  if(readerSession!==a)return;
  previewController?.abort();const abort=new AbortController();previewController=abort;
  const ticket=++a.ticket,epochTicket=previewEpoch;a.index=index;
  const entry=a.entries[index];
  const active=()=>readerSession===a&&ticket===a.ticket&&epochTicket===previewEpoch&&!abort.signal.aborted;
  $('preview-previous').disabled=index===0;$('preview-next').disabled=index===a.entries.length-1;
  $('preview-info').replaceChildren(document.createTextNode('Page '+(index+1)+' of '+a.entries.length+' · '+entry.name+' '),button('Browse Archive',()=>{if(!busy)void actions.archive({classic:true});}));
  $('preview-content').textContent='Loading page…';lightboxControl();
  const failed=message=>{if(!active())return;$('preview-content').textContent=message;$('preview-content').append(button('Retry page',()=>void showReaderPage(a,index)));readerBrowseButton();lightboxControl();};
  try{
    const result=await request('archiveEntryUrl',{source:a.source,key:a.key,entry:entry.name,contentType:previewType(entry.name)},{signal:abort.signal});
    if(!active())return;
    const url=new URL(result.data.url);if(!['https:','http:'].includes(url.protocol))throw Error('Archive returned an unsupported read URL.');
    const img=document.createElement('img');img.alt=entry.name;img.src=url.href;
    img.addEventListener('error',()=>failed('This page could not be displayed. Retry for a fresh read URL or continue to another page.'),{once:true});
    $('preview-content').replaceChildren(img);lightboxControl();
  }catch(error){if(active())failed(error.message||'Could not load this page.');}
}
async function adjacentPreview(direction,key){if(busy||!previewItem)return;
  if(readerSession){const a=readerSession,next=a.index+direction;if(next>=0&&next<a.entries.length)await (a.kind==='folder'?showDirectoryPage(a,next):showReaderPage(a,next));return;}
  if(!previewItem.folder&&/\.(zip|cbz)$/i.test(previewItem.key)){if($('preview-dialog').open)$('preview-dialog').close();void actions.archive({startAtEnd:direction<0});return;}
  const files=visible().filter(e=>!e.folder&&(lightbox?(previewType(e.key)||'').startsWith('image/'):Boolean(previewType(e.key)))),i=files.findIndex(e=>e.key===previewItem.key),next=i<0?null:files[i+direction];if(next){selected=new Set([next.key]);paintSelection();await showPreview(next,{key,direction,previousKey:files[i].key,invocation:key?'keyboard':'button'});}}
$('preview-previous').onclick=()=>adjacentPreview(-1);$('preview-next').onclick=()=>adjacentPreview(1);
function resizePreview(width){
  const total=$('file-workspace').getBoundingClientRect().width||1000;
  const max=Math.max(280,Math.min(720,total-290));previewWidth=Math.round(Math.max(280,Math.min(max,width)));layoutPreview();
}
$('preview-divider').onpointerdown=event=>{
  if(event.button!==0)return;event.preventDefault();const divider=event.currentTarget;
  divider.setPointerCapture(event.pointerId);
  divider.onpointermove=move=>resizePreview($('file-workspace').getBoundingClientRect().right-move.clientX);
  const finish=()=>{divider.onpointermove=null;rememberPreview();};divider.onpointerup=finish;divider.onpointercancel=finish;divider.onlostpointercapture=finish;
};
$('preview-divider').onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();resizePreview(event.key==='Home'?280:event.key==='End'?720:previewWidth+(event.key==='ArrowLeft'?24:-24));rememberPreview();}};
window.addEventListener('pagehide',event=>{closePreview();if(!event.persisted)breadcrumbs.destroy();});
async function chooseTransfer(operation){
  if(busy||!selected.size)return;const clip={source:context(),entries:chosen().map(e=>({...e})),operation};
  guideAction('command',{action:operation+'-to'});const testItCorrelation=practice?.capture();
  const target=await chooseDestination(operation);if(target)await actions.paste(target,clip,undefined,testItCorrelation);
}
let destinationEpoch=0;
async function destinationBuckets(){
  const ticket=++destinationEpoch;$('destination-confirm').disabled=true;$('destination-error').textContent='';$('destination-bucket').replaceChildren();
  try{const result=await request('buckets',{accountId:$('destination-account').value});if(ticket!==destinationEpoch)return;
    $('destination-bucket').replaceChildren(...(result.data.buckets||[]).map(b=>{const o=document.createElement('option');o.value=b.name;o.textContent=b.name;return o;}));
    if($('destination-account').value===current?.accountId)$('destination-bucket').value=current.bucketName;
    $('destination-confirm').disabled=!$('destination-bucket').value;
  }catch(e){if(ticket===destinationEpoch)$('destination-error').textContent=e.message;}
}
$('destination-account').onchange=destinationBuckets;$('destination-cancel').onclick=()=>$('destination-dialog').close('cancel');
$('destination-form').onsubmit=event=>{event.preventDefault();try{prefix($('destination-prefix').value);$('destination-dialog').close('ok');}catch(e){$('destination-error').textContent=e.message;}};
async function chooseDestination(operation){
  if($('destination-dialog').open)return null;$('destination-title').textContent=(operation==='move'?'Move':'Copy')+' to…';
  $('destination-account').replaceChildren(...accounts.map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name||a.id;return o;}));$('destination-account').value=current.accountId;$('destination-prefix').value=current.prefix;$('destination-dialog').returnValue='';
  openModal($('destination-dialog'));void destinationBuckets();
  return new Promise(resolve=>$('destination-dialog').addEventListener('close',()=>{destinationEpoch++;resolve($('destination-dialog').returnValue==='ok'?{accountId:$('destination-account').value,accountName:accounts.find(a=>a.id===$('destination-account').value)?.name||'',bucketName:$('destination-bucket').value,prefix:prefix($('destination-prefix').value)}:null);},{once:true}));
}
let archiveContext=null;
function archiveControls(){
  const a=archiveContext,selected=a?.selected.size||0,total=a?.entries.length||0;
  $('archive-extract').disabled=busy||!selected;
  $('archive-all').checked=total>0&&selected===total;
  $('archive-all').indeterminate=selected>0&&selected<total;
  $('archive-selection-count').textContent=selected+' of '+total+' files selected for extraction';
}
function stopArchivePreview(){
  const a=archiveContext;if(!a)return;
  a.previewTicket++;a.previewController?.abort();a.previewController=null;
  const stage=$('archive-preview-content');
  for(const media of stage.querySelectorAll('video,audio')){try{media.pause();media.removeAttribute('src');media.load();}catch{}}
  stage.replaceChildren();
}
function archivePreviewButtons(){
  const a=archiveContext,files=a?archiveFolder(a.entries,a.prefix).files:[],key=a?.previewKey;
  const index=files.findIndex(file=>file.key===key);
  $('archive-preview-position').textContent=index<0?'Select a file':(index+1)+' / '+files.length+' · '+files[index].name;
  $('archive-preview-previous').disabled=index<=0;
  $('archive-preview-next').disabled=index<0||index>=files.length-1;
}
async function archiveShowEntry(item){
  const a=archiveContext;if(!a||!item||item.folder)return;
  stopArchivePreview();a.previewKey=item.key;
  // Selection and extraction remain separate operations.
  document.querySelectorAll('#archive-files .archive-entry-row').forEach(row=>{row.dataset.active=String(row.dataset.key===item.key);});
  archivePreviewButtons();
  const stage=$('archive-preview-content'),type=previewType(item.key);
  if(!type||!(type.startsWith('image/')||type.startsWith('video/')||type.startsWith('audio/')||type.startsWith('text/')||type==='application/pdf')){
    stage.textContent='This file type cannot be previewed inline. Select it to extract, or browse another file.';
    return;
  }
  stage.textContent='Loading '+item.name+'…';
  const ticket=a.previewTicket,abort=new AbortController();a.previewController=abort;
  try{
    const result=await request('archiveEntryUrl',{source:a.source,key:a.key,entry:item.key,contentType:type},{signal:abort.signal});
    if(archiveContext!==a||ticket!==a.previewTicket||abort.signal.aborted)return;
    const signed=result.data.url;
    const parsed=new URL(signed);
    if(!['http:','https:'].includes(parsed.protocol))throw Error('Archive preview returned an unsupported URL.');
    let node;
    if(type.startsWith('text/')){
      const response=await fetch(parsed.href,{signal:abort.signal,cache:'no-store',referrerPolicy:'no-referrer'});
      if(!response.ok)throw Error('Entry preview returned HTTP '+response.status);
      if(archiveContext!==a||ticket!==a.previewTicket||abort.signal.aborted)return;
      node=document.createElement('pre');
      const text=await response.text();
      if(archiveContext!==a||ticket!==a.previewTicket||abort.signal.aborted)return;
      node.textContent=text.slice(0,1024*1024);
      if(text.length>1024*1024)node.textContent+='\n\n[Preview limited to 1 MiB]';
    }else if(type.startsWith('image/')){
      node=document.createElement('img');node.alt=item.name;node.src=parsed.href;
    }else if(type.startsWith('video/')||type.startsWith('audio/')){
      node=document.createElement(type.startsWith('video/')?'video':'audio');node.controls=true;node.preload='metadata';node.src=parsed.href;
    }else{
      node=document.createElement('iframe');node.title=item.name;node.referrerPolicy='no-referrer';node.src=parsed.href;
    }
    if(archiveContext!==a||ticket!==a.previewTicket||abort.signal.aborted)return;
    node.addEventListener('error',()=>{if(archiveContext===a&&ticket===a.previewTicket)stage.textContent='This archive entry could not be displayed. Extraction remains available.';},{once:true});
    stage.replaceChildren(node);
  }catch(error){
    if(archiveContext===a&&ticket===a.previewTicket&&!abort.signal.aborted){
      stage.textContent='Preview unavailable: '+(error.message||String(error))+'. You can still extract the selected entry.';
    }
  }finally{if(archiveContext===a&&a.previewController===abort)a.previewController=null;}
}
function renderArchiveFolder(path='',{startAtEnd=false}={}){
  const a=archiveContext;if(!a)return;
  a.prefix=path;stopArchivePreview();a.previewKey=null;
  const listing=archiveFolder(a.entries,path);
  $('archive-up').disabled=!path;
  const crumbs=archiveCrumbs(path);
  $('archive-crumbs').replaceChildren(...crumbs.map((crumb,i)=>{
    const el=button((i?'› ':'')+crumb.name,()=>renderArchiveFolder(crumb.prefix));
    if(i===crumbs.length-1)el.setAttribute('aria-current','location');
    return el;
  }));
  const rows=[];
  for(const item of [...listing.folders,...listing.files]){
    const row=document.createElement('div');row.className='archive-entry-row';row.dataset.key=item.key;row.dataset.active='false';
    if(!item.folder){
      const label=document.createElement('label');label.title='Select '+item.name+' for extraction';
      const check=document.createElement('input');check.type='checkbox';check.value=item.key;check.checked=a.selected.has(item.key);check.setAttribute('aria-label','Extract '+item.name);
      check.addEventListener('change',()=>{check.checked?a.selected.add(item.key):a.selected.delete(item.key);archiveControls();});
      label.append(check);row.append(label);
    }
    const open=button((item.folder?'▰  ':'')+item.name,item.folder?()=>renderArchiveFolder(item.key):()=>void archiveShowEntry(item));
    open.className='archive-entry-open';open.title=item.folder?'Open folder '+item.name:'Preview '+item.name;
    open.setAttribute('aria-label',item.folder?'Open folder '+item.name:'Preview '+item.name);
    row.append(open);
    if(!item.folder){const size=document.createElement('span');size.className='archive-entry-size';size.textContent=bytes(item.size);row.append(size);}
    rows.push(row);
  }
  $('archive-files').replaceChildren(...rows);
  if(!rows.length){const empty=document.createElement('p');empty.className='archive-empty';empty.textContent='This archive folder is empty.';$('archive-files').append(empty);}
  archiveControls();
  if(listing.files.length)void archiveShowEntry(startAtEnd?listing.files.at(-1):listing.files[0]);
  else{$('archive-preview-content').textContent=listing.folders.length?'Open a folder to preview its files.':'No files to preview in this folder.';archivePreviewButtons();}
}
function stepArchivePreview(offset){
  const a=archiveContext;if(!a||!a.previewKey)return;
  const next=archiveAdjacent(archiveFolder(a.entries,a.prefix).files,a.previewKey,offset);
  if(next)void archiveShowEntry(next);
}
$('archive-preview-previous').onclick=()=>stepArchivePreview(-1);
$('archive-preview-next').onclick=()=>stepArchivePreview(1);
$('archive-up').onclick=()=>{if(archiveContext?.prefix)renderArchiveFolder(archiveParent(archiveContext.prefix));};
$('archive-all').onchange=()=>{
  const a=archiveContext;if(!a)return;
  a.selected=$('archive-all').checked?new Set(a.entries.map(e=>e.name)):new Set();
  document.querySelectorAll('#archive-files input[type="checkbox"]').forEach(check=>{check.checked=a.selected.has(check.value);});
  archiveControls();
};
$('archive-close').onclick=()=>$('archive-dialog').close();
$('archive-dialog').addEventListener('close',()=>{stopArchivePreview();archiveContext=null;});
$('archive-cancel').onclick=()=>controller?.abort();
document.addEventListener('keydown',event=>{
  const a=archiveContext;if(!a||!$('archive-dialog').open)return;
  if([...document.querySelectorAll('dialog[open]')].at(-1)!==$('archive-dialog'))return;
  if(event.altKey&&event.key==='ArrowUp'){event.preventDefault();event.stopImmediatePropagation();$('archive-up').click();return;}
  if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(event.target.closest?.('input,select,textarea,[contenteditable="true"],video,audio'))return;
  event.preventDefault();event.stopImmediatePropagation();stepArchivePreview(event.key==='ArrowRight'?1:-1);
},true);
$('archive-extract').onclick=async()=>{
  const a=archiveContext;if(!a||busy||!a.selected.size)return;
  const target={source:a.source,key:a.key};
  let destinationPrefix;
  try{destinationPrefix=prefix($('archive-prefix').value);}catch(error){$('archive-status').textContent=error.message;return;}
  const entries=[...a.selected];
  $('archive-cancel').hidden=false;$('archive-extract').disabled=true;$('archive-all').disabled=true;
  await run(async signal=>{
    const result=await api.batch('extractArchiveEntry',entries.map(entry=>({...target,entry,destinationPrefix})),{
      signal,onProgress:event=>{progress(event);if(event.phase==='item')$('archive-status').textContent='Extracting '+(event.index+1)+' of '+event.total+'…';}
    });
    outcome(result);$('archive-status').textContent=$('status').textContent;
    result.results.forEach((r,i)=>{if(r?.state==='completed')a.selected.delete(entries[i]);});
  },{refresh:false});
  $('archive-cancel').hidden=true;$('archive-all').disabled=false;
  // No extraction changes the virtual archive or its original R2 object.
  if(archiveContext===a)renderArchiveFolder(a.prefix);
};

const tour=installTour({document,storage:chrome.storage.local});
installTestItTools(document);
practice=installTestIt({document,api,storage:chrome.storage.local,stopTour:()=>tour.guide.stop(),approve:(title,description)=>dialog(title,{input:false,description,confirm:title==='Practice with this file?'?'Yes, use this file':'Approve',cancel:title==='Practice with this file?'?'No':'Cancel'}),getState:()=>({current:context(),selected:chosen().map(e=>({...e})),visible:visible().map(e=>({...e})),grid:$('files').classList.contains('grid'),previewMode,previewKey:previewItem?.key||null,sideState,previewWidth,lightbox})});
render();const explorerInitialization=(async()=>{try{const preferences=await chrome.storage.local?.get(['betaExplorerPreview','betaExplorerArchivePreview']);archivePreviewMode=preferences?.betaExplorerArchivePreview==='classic'?'classic':'reader';const savedPreview=preferences?.betaExplorerPreview;if(savedPreview){previewWidth=Math.max(280,Math.min(720,Number(savedPreview.width)||400));setPreviewMode(savedPreview.mode);}else setPreviewMode('side');}catch{setPreviewMode('side');}try{
  const saved=await chrome.storage.local?.get(['betaExplorerLocation','cloudflareAuth']);
  lastLocation=saved?.betaExplorerLocation||null;
  paintLogout(saved?.cloudflareAuth);
}catch{}
// Once the saved session is known, only authenticated sessions discover
// accounts; no old intermediate tile is ever shown for signed-out sessions.
if(cloudflareSignedIn)await loadAccounts(lastLocation);
else{
  accountVisual('disconnected');
  connectionState('disconnected');
  render();
}})();

// Session-backed handoff survives MV3 suspension; only opaque IDs enter the URL.
let historyNavigationEpoch=0,historyNavigationAbort=null,consumedHistoryToken=null,latestHistoryAt=0,historyNavigationTimer=null;
async function useHistoryNavigation(intent,{side=false}={}){
  if(!globalThis.RedownHistoryNavigation?.valid(intent)||intent.token===consumedHistoryToken)return;
  if(side){
    const [tab,win]=await Promise.all([chrome.tabs.getCurrent(),chrome.windows.getCurrent()]);
    if(tab||win.id!==intent.windowId)return;
    await chrome.storage.session.set({historySideAcknowledged:{token:intent.token}});
  }
  if(intent.issuedAt<latestHistoryAt)return;latestHistoryAt=intent.issuedAt||Date.now();
  consumedHistoryToken=intent.token;
  const ticket=++historyNavigationEpoch;
  historyNavigationAbort?.abort();
  clearTimeout(historyNavigationTimer);
  closePreview();
  const abort=new AbortController();historyNavigationAbort=abort;
  const timer=historyNavigationTimer=setTimeout(()=>{if(ticket!==historyNavigationEpoch)return;discoveryEpoch++;epoch++;status('Saved-file navigation timed out. Use History GO TO again or reconnect Cloudflare.');abort.abort(Error('Saved-file navigation timed out. Use History GO TO again or reconnect Cloudflare.'));},90000);
  const active=()=>{abort.signal.throwIfAborted();if(ticket!==historyNavigationEpoch)throw Error('Navigation superseded.');};
  try{
    await explorerInitialization;active();
    if(busy)throw Error('Explorer is busy. Finish or cancel the current operation, then use GO TO again.');
    if(!cloudflareSignedIn)throw Error('Connect Cloudflare, then use History GO TO again.');
    await chrome.storage.session.set({['historyAccepted:'+intent.token]:{state:'accepted'}});active();
    const target=intent.locator;
    status('Locating the exact saved file…');
    await loadAccounts(target);active();
    if(!accounts.some(a=>a.id===target.accountId)||!(bucketCache.get(target.accountId)||[]).some(b=>b.name===target.bucketName))throw Error('The recorded account or bucket is unavailable. Refresh or reconnect Cloudflare, then use GO TO again.');
    await navigate(target);active();
    if(!sameBucket(current,target)||current.prefix!==target.prefix||listingState!=='ready')throw Error('Could not load the recorded folder. Refresh or reconnect Cloudflare, then use GO TO again.');
    const locationEpoch=epoch;
    const item=await resolveHistoryTarget(api,target,{signal:abort.signal});active();
    if(epoch!==locationEpoch||!sameBucket(current,target)||current.prefix!==target.prefix)throw Error('Explorer location changed. Use GO TO again.');
    if(!items.some(e=>e.key===item.key))items.push(item);
    $('filter').value='';selected=new Set([item.key]);render();
    const row=[...$('files').querySelectorAll('[data-key]')].find(n=>n.dataset.key===item.key);
    row?.scrollIntoView({block:'nearest'});row?.focus({preventScroll:true});
    await showPreview(item);active();
    await chrome.storage.session.set({['historyResult:'+intent.token]:{state:'completed'}});
    status('Saved file selected. '+(!previewType(item.key)&&!/\.(zip|cbz)$/i.test(item.key)?'Preview is unavailable for this format.':''));
  }catch(error){if(ticket===historyNavigationEpoch){status(error.message||'Saved-file navigation was interrupted. Use History GO TO again.');await chrome.storage.session.set({['historyResult:'+intent.token]:{state:'failed',error:error.message}});}}
  finally{clearTimeout(timer);if(ticket===historyNavigationEpoch)historyNavigationAbort=null;}
}
void (async()=>{
  if(!globalThis.RedownHistoryNavigation)return;
  await globalThis.RedownHistoryNavigation.receive(useHistoryNavigation,()=>cloudflareSignedIn);
  const token=new URLSearchParams(location.hash.slice(1)).get('history');
  if(token&&/^[a-zA-Z0-9-]{1,80}$/.test(token)){
    const key='historyNavigation:'+token,data=await chrome.storage.session.get(key);
    const intent=data[key];
    if(!globalThis.RedownHistoryNavigation?.valid(intent)){
      await explorerInitialization;status('Saved-file navigation expired or was interrupted by an extension reload. Use History GO TO again.');return;
    }
    await useHistoryNavigation(intent);
    await chrome.storage.session.remove(key);
  }else{
    const data=await chrome.storage.session.get('historySideNavigation');
    await useHistoryNavigation(data.historySideNavigation,{side:true});
  }
})().catch(error=>status('Could not restore saved-file navigation: '+error.message));
