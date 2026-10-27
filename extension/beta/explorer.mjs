import {createFileApi,prefix,name} from './file-api.mjs';
import {createR2Adapter} from './r2-adapter.mjs';
import {collectDroppedFiles} from './dropped-files.mjs';
const $=id=>document.getElementById(id),api=createFileApi(createR2Adapter());
let current=null,items=[],selected=new Set(),cursor='',epoch=0,busy=false,clipboard=null,anchor=-1,controller=null,history=[],historyIndex=-1,accounts=[],dragState=null;
const bytes=n=>n==null?'—':n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':n<1073741824?(n/1048576).toFixed(1)+' MB':(n/1073741824).toFixed(1)+' GB';
let savedProfiles=[],previewUrl='',previewItem=null;
const context=()=>current?{...current}:null;
const chosen=()=>items.filter(item=>selected.has(item.key));
function status(text){$('status').textContent=text;}
function button(label,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=handler;return b;}
function controls(){
  for(const id of ['accounts','profiles','upload','upload-folder','remote','mkdir','refresh','filter','path'])$(id).disabled=busy || (!current&&!['accounts','profiles'].includes(id));
  $('back').disabled=busy||historyIndex<1;$('forward').disabled=busy||historyIndex>=history.length-1;$('up').disabled=busy||!current?.prefix;
  for(const id of ['copy','cut','delete','duplicate','copy-to','move-to'])$(id).disabled=busy||!selected.size;
  for(const id of ['rename','properties','get-url'])$(id).disabled=busy||selected.size!==1;
  $('archive').disabled=busy||selected.size!==1||chosen()[0]?.folder||!(/\.(zip|cbz)$/i.test(chosen()[0]?.key||''));
  $('preview').disabled=busy||selected.size!==1||chosen()[0]?.folder;
  $('prepare').disabled=busy||!current;$('create-bucket').disabled=busy||!$('accounts').value;
  $('download').disabled=busy||!selected.size||chosen().some(e=>e.folder);
  $('paste').disabled=busy||!clipboard||!current;
  $('connect').disabled=busy;$('disconnect').disabled=busy;
  $('selection').textContent=selected.size?selected.size+' selected · '+bytes(chosen().filter(e=>!e.folder).reduce((n,e)=>n+Number(e.size||0),0)):items.length+' items'+(cursor?' · more available':'');
  $('more').hidden=!cursor;$('more').disabled=busy;
  $('cancel').hidden=!busy;
  document.querySelectorAll('#buckets button').forEach(b=>b.disabled=busy);
}
function visible(){const query=$('filter').value.toLocaleLowerCase(),sort=$('sort').value;return items.filter(e=>e.displayName.toLocaleLowerCase().includes(query)).sort((a,b)=>Number(b.folder)-Number(a.folder)||(sort==='size'?Number(b.size||0)-Number(a.size||0):sort==='date'?(Date.parse(b.uploaded||b.last_modified)||0)-(Date.parse(a.uploaded||a.last_modified)||0):0)||(sort==='name-desc'?-1:1)*a.displayName.localeCompare(b.displayName,undefined,{numeric:true}));}
function render(){
  const shown=visible();$('files').replaceChildren(...shown.map((item,index)=>{
    const row=document.createElement('div');row.className='file'+(item.folder?' folder':'');row.dataset.key=item.key;row.setAttribute('role','option');row.setAttribute('aria-selected',String(selected.has(item.key)));row.tabIndex=0;
    const title=document.createElement('span');title.className='file-name';const icon=document.createElement('span');icon.className='icon';icon.setAttribute('aria-hidden','true');icon.textContent=item.folder?'▰':(item.displayName.split('.').length>1?item.displayName.split('.').pop().slice(0,4).toUpperCase():'FILE');const text=document.createElement('span');text.className='name';text.textContent=item.displayName;title.append(icon,text);
    const size=document.createElement('span');size.className='file-size';size.textContent=item.folder?'Folder':bytes(item.size);const date=document.createElement('span');date.className='file-date';const d=new Date(item.uploaded||item.last_modified||item.lastModified||'');date.textContent=Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});row.append(title,size,date);
    row.draggable=true;row.ondragstart=event=>{if(busy){event.preventDefault();return;}if(!selected.has(item.key)){selected=new Set([item.key]);paintSelection();}dragState={source:context(),entries:chosen().map(e=>({...e})),operation:'move'};event.dataTransfer.setData('application/x-redown-beta','selection');event.dataTransfer.effectAllowed='copyMove';};row.ondragend=()=>{dragState=null;row.classList.remove('drop-target');};
    if(item.folder){row.ondragover=event=>{event.preventDefault();event.stopPropagation();if(!busy){row.classList.add('drop-target');event.dataTransfer.dropEffect=dragState?(event.ctrlKey||event.metaKey?'copy':'move'):'copy';}};row.ondragleave=()=>row.classList.remove('drop-target');row.ondrop=event=>{event.preventDefault();event.stopPropagation();row.classList.remove('drop-target');if(busy)return;const target={...context(),prefix:item.key};if(dragState){const clip={...dragState,operation:event.ctrlKey||event.metaKey?'copy':'move'};void actions.paste(target,clip).catch(e=>status(e.message));}else void droppedFiles(event,target);};}
    row.onclick=event=>{
      if(busy)return;
      if(event.shiftKey&&anchor>=0){if(!event.ctrlKey&&!event.metaKey)selected.clear();for(const e of shown.slice(Math.min(anchor,index),Math.max(anchor,index)+1))selected.add(e.key);}
      else if(event.ctrlKey||event.metaKey){selected.has(item.key)?selected.delete(item.key):selected.add(item.key);anchor=index;}
      else {selected=new Set([item.key]);anchor=index;}
      paintSelection();
    };
    row.ondblclick=()=>{if(!busy){if(item.folder)void navigate({...context(),prefix:item.key});else {selected=new Set([item.key]);void (/\.(zip|cbz)$/i.test(item.key)?actions.archive():actions.preview());}}};
    row.oncontextmenu=event=>{event.preventDefault();if(busy)return;if(!selected.has(item.key)){selected=new Set([item.key]);paintSelection();}showMenu(event.clientX,event.clientY);};
    return row;
  }));
  $('empty').hidden=shown.length>0;$('empty').textContent=!current?'Connect Cloudflare and choose a bucket.':shown.length?'':$('filter').value?'No matches in the loaded items.':'This folder is empty. Drop a file to make it yours.';
  $('heading').textContent=current?current.bucketName:'Your files, beautifully organized.';
  $('crumbs').replaceChildren();if(current){$('crumbs').append(button(current.bucketName,()=>navigate({...context(),prefix:''})));let p='';for(const segment of current.prefix.split('/').filter(Boolean)){p+=segment+'/';const target=p;$('crumbs').append(button('› '+segment,()=>navigate({...context(),prefix:target})));}}
  controls();
}
function paintSelection(){document.querySelectorAll('.file').forEach(row=>row.setAttribute('aria-selected',String(selected.has(row.dataset.key))));controls();}
function progress(event){
  if(event.phase==='item'){$('progress').hidden=false;$('progress').max=event.total;$('progress').value=event.index;status(`Processing item ${event.index+1} of ${event.total}…`);}
  if(event.phase==='uploading')status('Uploading file bytes… Keep this page open.');
  if(event.phase==='verifying'){status('Checking uploaded bytes against your original file…');$('progress').hidden=false;$('progress').max=event.totalBytes||1;$('progress').value=event.bytes;}
  if(event.phase==='committing')status('Upload received. Committing and checking the destination…');
  if(event.phase==='download-complete')status('Chrome reports download complete. Independent SHA-256 verification was not performed.');
  if(event.phase==='download-interrupted')status('Download interrupted: '+(event.error||'Open Chrome Downloads for details.'));
}
async function request(operation,input,options={}) {
  const result=await api.run(operation,input,{onProgress:progress,...options});
  if(['failed','uncertain','cancelled'].includes(result.state))throw Object.assign(Error(result.error),{result});return result;
}
async function listing(add=false){
  if(!current)return;const ticket=++epoch,target=context();
  const result=await request('list',{source:target,cursor:add?cursor:''});if(ticket!==epoch)return;
  items=add?[...new Map([...items,...result.data.entries].map(e=>[e.key,e])).values()]:result.data.entries;cursor=result.data.cursor;
  selected=new Set([...selected].filter(k=>items.some(e=>e.key===k)));render();
}
async function navigate(target,record=true){
  if(busy)return;let next;try{next={...target,prefix:prefix(target.prefix||'')};}catch(e){status(e.message);return;}current=next;selected.clear();anchor=-1;items=[];cursor='';$('filter').value='';epoch++;
  if(record){history=history.slice(0,historyIndex+1);history.push(context());historyIndex=history.length-1;}
  document.querySelectorAll('#buckets button').forEach(b=>b.toggleAttribute('aria-current',b.dataset.bucket===current.bucketName));render();
  try{await listing();status('Folder refreshed.');}catch(e){status(e.message);}
}
async function run(task,{refresh=true}={}) {
  if(busy)return;busy=true;controller=new AbortController();controls();
  try{await task(controller.signal);if(refresh&&current){try{await listing();}catch(error){status($('status').textContent+' Folder refresh failed: '+error.message);}}}
  catch(e){status(e.message||'Operation failed. Refresh before retrying.');}
  finally{busy=false;controller=null;$('progress').hidden=true;controls();}
}
function outcome(result){
  const list=result.results || [result],bad=list.filter(r=>r.state!=='completed'&&r.state!=='started');
  const partial=result.state==='partial'||bad.length;
  const details=list.flatMap(r=>r.error?[r.error]:[...(r.data?.errors||[]).map(e=>typeof e==='string'?e:e.error||'File failed'),...(r.data?.conflicts||[]).map(()=> 'Destination exists; skipped.'),...(r.data?.partialMove?['Some copies succeeded but source deletion was not confirmed.']:[]),...(r.data?.recoveryKey?['Temporary upload retained at '+r.data.recoveryKey]:[])]);
  status(!partial&&list.every(r=>r.data?.downloadState==='complete')?'Chrome reports download complete. Independent SHA-256 verification was not performed.':partial?`Partial result. ${details.join(' ') || 'Stopped before all items completed. Refresh and inspect both locations.'}`:list.some(r=>r.state==='started')?'Download started. Chrome will report completion or interruption.':'Operation completed and provider result confirmed.');
}
function dialog(title,{description='',value='',input=true,details='',confirm='Continue',required=true}={}){
  if($('dialog').open)return Promise.resolve(null);
  $('dialog-title').textContent=title;$('dialog-description').textContent=description;$('dialog-input').hidden=!input;$('dialog-label').hidden=!input;$('dialog-input').value=value;$('dialog-input').required=input&&required;$('dialog-details').hidden=!details;$('dialog-details').textContent=details;$('dialog-confirm').textContent=confirm;$('dialog').returnValue='';$('dialog').showModal();
  if(input){$('dialog-input').focus();$('dialog-input').select();}else $('dialog-confirm').focus();
  return new Promise(resolve=>$('dialog').addEventListener('close',()=>resolve($('dialog').returnValue==='ok'?(input?$('dialog-input').value:true):null),{once:true}));
}
const actions={
  async archive(){const e=chosen()[0],source=context();if(!e||e.folder||busy)return;await run(async signal=>{
    const result=await request('archiveEntries',{source,key:e.key},{signal});archiveContext={source,key:e.key};
    $('archive-title').textContent=e.displayName;$('archive-prefix').value=source.prefix;$('archive-status').textContent='';$('archive-all').checked=false;
    $('archive-files').replaceChildren(...(result.data.archive?.entries||[]).filter(e=>!e.directory).map(e=>{const label=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');check.type='checkbox';check.value=e.name;check.onchange=archiveControls;text.textContent=e.name+' · '+bytes(e.size);label.append(check,text);return label;}));
    archiveControls();$('archive-dialog').showModal();
  },{refresh:false});},
  async preview(){const e=chosen()[0];if(e&&!e.folder&&!busy)await showPreview(e);},
  async 'get-url'(){const e=chosen()[0],source=context();if(!e||busy)return;
    const menu=globalThis.RedownPublicAddresses.popover({document,load:async source=>(await request('publicUrls',{source})).data,onState:status});
    await menu.show({source,key:e.key,name:e.displayName,returnFocus:$('get-url'),isCurrent:()=>current?.accountId===source.accountId&&current?.bucketName===source.bucketName});
  },
  async duplicate(){if(busy||!selected.size)return;await actions.paste(context(),{source:context(),entries:chosen().map(e=>({...e})),operation:'copy',conflict:'keep'});},
  async 'copy-to'(){await chooseTransfer('copy');},
  async 'move-to'(){await chooseTransfer('move');},
  copy(){if(busy||!selected.size)return;clipboard={source:context(),entries:chosen().map(e=>({...e})),operation:'copy'};status(selected.size+' items copied to REDOWN clipboard.');controls();},
  cut(){if(busy||!selected.size)return;clipboard={source:context(),entries:chosen().map(e=>({...e})),operation:'move'};status(selected.size+' items ready to move. Sources remain until paste.');controls();},
  async paste(destination=context(),clip=clipboard){
    if(busy||!clip||!destination)return;const conflict=clip.conflict||$('conflict').value;
    if(conflict==='replace'&&!await dialog('Replace existing destinations?',{input:false,description:'Matching destination files may be overwritten. Other files remain. This cannot be undone.',confirm:'Replace'}))return;
    await run(async signal=>{const result=await api.batch(clip.operation,clip.entries.map(e=>({source:clip.source,destination,entries:[e],conflict})),{signal,onProgress:progress});outcome(result);if(clip.operation==='move'&&result.state==='completed')clipboard=null;});
  },
  async rename(){const e=chosen()[0],source=context();if(!e||busy)return;const n=await dialog('Rename '+e.displayName,{value:e.displayName});if(n===null||n===e.displayName)return;await run(async()=>outcome(await request('rename',{source,entry:e,newName:name(n)})));},
  async delete(){const entries=chosen(),source=context();if(!entries.length||busy)return;if(!await dialog('Delete '+entries.length+' selected items?',{input:false,description:'Permanently removes selected files and every object inside selected folders from '+source.bucketName+'. This cannot be undone.',confirm:'Delete permanently'}))return;await run(async signal=>outcome(await api.batch('delete',entries.map(e=>({source,entries:[e]})),{signal,onProgress:progress})));},
  async mkdir(){const source=context();if(!source||busy)return;const n=await dialog('New folder',{description:'Create a folder in '+source.bucketName+'/'+source.prefix});if(n===null)return;await run(async()=>outcome(await request('mkdir',{source,name:name(n)})));},
  async download(){const source=context(),entries=chosen();if(!entries.length||entries.some(e=>e.folder)||busy)return;await run(async signal=>outcome(await api.batch('download',entries.map(e=>({source,entry:e})),{signal,onProgress:progress})),{refresh:false});},
  async properties(){const e=chosen()[0],source=context();if(!e||busy)return;await run(async()=>{const result=e.folder?{key:e.key,type:'Folder prefix',bucket:source.bucketName,...(await request('list',{source:{...source,prefix:e.key}})).data}:(await request('stat',{source,key:e.key})).data.object;if(!result)throw Error('This file is no longer present. Refresh the folder.');await dialog('Properties',{input:false,details:JSON.stringify(result,null,2),confirm:'Close'});},{refresh:false});},
  async remote(){const destination=context();if(!destination||busy)return;const url=await dialog('Send URL to cloud',{description:'Cloudflare fetches the source directly into '+destination.bucketName+'/'+destination.prefix+'. Your computer does not relay the bytes.'});if(!url)return;await run(async()=>{status('Cloudflare is acquiring the remote source…');const result=await request('remoteIngest',{destination,url});status('Remote acquisition confirmed by Worker. Refresh to inspect the saved object.');return result;});}
};
for(const [id,action] of Object.entries(actions))$(id).onclick=()=>{Promise.resolve(action()).catch(e=>status(e.message));};
async function upload(files,source=context()){
if(!source||busy||!files.length)return;
  const conflict=$('conflict').value;
  if(conflict==='replace'&&!await dialog('Replace matching uploaded files?',{input:false,description:'Existing destination files with matching names may be overwritten.',confirm:'Replace'}))return;
  await run(async signal=>{const inputs=files.map(value=>{const file=value.file||value;return {source,file,key:source.prefix+(value.relativePath||file.webkitRelativePath||file.name),conflict};});outcome(await api.batch('upload',inputs,{signal,onProgress:progress}));});
}
$('upload').onclick=()=>$('picker').click();$('upload-folder').onclick=()=>$('folder-picker').click();
for(const id of ['picker','folder-picker'])$(id).onchange=()=>{const files=Array.from($(id).files);$(id).value='';void upload(files).catch(e=>status(e.message));};
$('dropzone').ondragover=event=>{event.preventDefault();if(current&&!busy)$('dropzone').classList.add('drag');};$('dropzone').ondragleave=()=>$('dropzone').classList.remove('drag');
async function droppedFiles(event,target=context()){
  if(!target||busy)return;
  // Capture handles during the drop event, before the browser protects its data store.
  const entries=[...event.dataTransfer.items].map(item=>{const entry=item.webkitGetAsEntry?.(),file=entry?null:item.getAsFile?.();return {kind:item.kind,webkitGetAsEntry:()=>entry,getAsFile:()=>file};}),fallback=[...event.dataTransfer.files];
  const conflict=$('conflict').value;
  if(conflict==='replace'&&!await dialog('Replace matching dropped files?',{input:false,description:'Existing destination files with matching relative paths may be overwritten.',confirm:'Replace'}))return;
  await run(async signal=>{status('Reading dropped folder paths…');const files=await collectDroppedFiles(entries,fallback,{signal,onEntry:count=>status('Found '+count+' files in dropped folders…')});
    if(!files.length){status('No files found. Empty folders were not uploaded.');return;}
    const inputs=files.map(({file,relativePath})=>({source:target,file,key:target.prefix+relativePath,conflict}));outcome(await api.batch('upload',inputs,{signal,onProgress:progress}));
  });
}
$('dropzone').ondrop=event=>{event.preventDefault();$('dropzone').classList.remove('drag');if(dragState){const clip={...dragState,operation:event.ctrlKey||event.metaKey?'copy':'move'};void actions.paste(context(),clip).catch(e=>status(e.message));}else void droppedFiles(event);};
$('dialog-cancel').onclick=()=>$('dialog').close('cancel');$('sort').onchange=render;$('filter').oninput=render;$('refresh').onclick=()=>run(()=>listing(),{refresh:false});$('more').onclick=()=>run(()=>listing(true),{refresh:false});
$('path').onclick=async()=>{if(!current||busy)return;const target=context(),p=await dialog('Go to folder',{description:'Enter a bucket-relative folder path. Leave empty for the bucket root.',value:target.prefix,required:false});if(p!==null)void navigate({...target,prefix:p}).catch(e=>status(e.message));};
$('back').onclick=()=>{if(historyIndex>0)void navigate(history[--historyIndex],false);};$('forward').onclick=()=>{if(historyIndex<history.length-1)void navigate(history[++historyIndex],false);};$('up').onclick=()=>{if(current)void navigate({...context(),prefix:current.prefix.replace(/[^/]+\/$/,'')});};
$('view').onclick=()=>{$('files').classList.toggle('grid');$('view').textContent=$('files').classList.contains('grid')?'List view':'Grid view';};
$('cancel').onclick=()=>{controller?.abort();status('Stopping the upload or remaining items. A running cloud copy or move may still complete; refresh before retrying.');};
function showMenu(x,y){const menu=$('context');menu.replaceChildren(...['archive','preview','get-url','copy','cut','paste','duplicate','copy-to','move-to','rename','download','properties','delete','mkdir'].map(id=>{const b=button($(id).textContent,()=>{menu.hidden=true;$(id).click();});b.disabled=$(id).disabled;return b;}));menu.hidden=false;menu.style.left=Math.max(0,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(0,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button:not(:disabled)')?.focus();}
document.addEventListener('click',e=>{if(!$('context').contains(e.target))$('context').hidden=true;});
$('dropzone').oncontextmenu=e=>{if(e.target.closest('.file')||busy)return;e.preventDefault();showMenu(e.clientX,e.clientY);};
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){$('context').hidden=true;return;}
  if(event.target.closest?.('input,select,textarea,dialog')||busy)return;
  const modified=event.ctrlKey||event.metaKey,k=event.key.toLowerCase();
  if(event.altKey&&['ArrowLeft','ArrowRight','ArrowUp'].includes(event.key)){event.preventDefault();$({ArrowLeft:'back',ArrowRight:'forward',ArrowUp:'up'}[event.key]).click();}
  else if(event.key==='Backspace'){event.preventDefault();$('up').click();}
  else if(event.key==='F5'){event.preventDefault();$('refresh').click();}
  else if(modified&&event.shiftKey&&k==='n'){event.preventDefault();$('mkdir').click();}
  else if(['ArrowDown','ArrowUp'].includes(event.key)&&event.target.closest?.('#files')){event.preventDefault();const rows=[...document.querySelectorAll('.file')],i=rows.indexOf(event.target.closest?.('.file')),next=rows[Math.max(0,Math.min(rows.length-1,i+(event.key==='ArrowDown'?1:-1)))];next?.focus();if(next&&!modified)next.click();}
  else if(modified&&k==='a'){event.preventDefault();selected=new Set(visible().map(e=>e.key));paintSelection();}
  else if(modified&&['c','x','v'].includes(k)){event.preventDefault();$( {c:'copy',x:'cut',v:'paste'}[k]).click();}
  else if(event.key==='F2'){event.preventDefault();$('rename').click();}
  else if(event.key==='Delete'){$('delete').click();}
  else if(event.key==='Enter'&&event.target.closest?.('.file')){event.preventDefault();event.target.closest?.('.file').ondblclick();}
  else if(event.key===' '&&event.target.closest?.('.file')){event.preventDefault();event.target.closest?.('.file').click();}
});
async function loadBuckets(){
  epoch++;items=[];selected.clear();current=null;clipboard=null;history=[];historyIndex=-1;cursor='';$('buckets').replaceChildren();render();const accountId=$('accounts').value;if(!accountId)return;
  const ticket=epoch,result=await request('buckets',{accountId});if(ticket!==epoch)return;
  const buckets=result.data.buckets||[];
  $('buckets').replaceChildren(...buckets.map(bucket=>{const b=button('▱  '+bucket.name,()=>navigate({accountId,accountName:accounts.find(a=>a.id===accountId)?.name||'',bucketName:bucket.name,prefix:''}));b.dataset.bucket=bucket.name;return b;}));
  status(buckets.length?'Choose a bucket to explore.':'No authorized buckets found.');
}
async function loadAccounts(){const result=await request('accounts',{});accounts=result.data.accounts||[];$('accounts').replaceChildren(...accounts.map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name||a.id;return o;}));await loadBuckets();await loadProfiles();}
$('accounts').onchange=()=>loadBuckets().catch(e=>status(e.message));
$('connect').onclick=()=>run(async()=>{await request('connect',{});status('Finish Cloudflare sign-in in the window that opened.');},{refresh:false});
$('disconnect').onclick=async()=>{if(!await dialog('Disconnect Cloudflare?',{input:false,description:'Clears the shared Cloudflare session, including the original Explorer. Cloud files remain untouched.',confirm:'Disconnect'}))return;await run(async()=>{await request('disconnect',{});current=null;items=[];clipboard=null;accounts=[];$('accounts').replaceChildren();$('buckets').replaceChildren();render();status('Cloudflare disconnected.');},{refresh:false});};
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local'||!changes.cloudflareAuth)return;const before=changes.cloudflareAuth.oldValue,after=changes.cloudflareAuth.newValue;if(before?.sessionId===after?.sessionId&&before?.accessToken&&after?.accessToken)return;epoch++;for(const id of ['dialog','preview-dialog','preferences-dialog','destination-dialog','archive-dialog'])if($(id).open)$(id).close('cancel');controller?.abort();current=null;items=[];selected.clear();clipboard=null;$('buckets').replaceChildren();render();if(after?.accessToken)void loadAccounts().catch(e=>status(e.message));else status('Cloudflare session changed. Connect to continue.');});
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});

async function loadProfiles(){
  const result=await request('profiles',{});savedProfiles=result.data.profiles||[];
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a saved destination…';
  $('profiles').replaceChildren(placeholder,...savedProfiles.map((p,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=(p.name||p.bucketName)+' /'+p.prefix;return o;}));
}
$('profiles').onchange=async()=>{const p=savedProfiles[Number($('profiles').value)];if($('profiles').value===''||!p||busy)return;try{if($('accounts').value!==p.accountId){$('accounts').value=p.accountId;await loadBuckets();}await navigate(p);}catch(e){status(e.message);}};
$('create-bucket').onclick=async()=>{const accountId=$('accounts').value;if(!accountId||busy)return;const n=await dialog('Create storage bucket',{description:'Creates an R2 bucket in the selected account. Use 3–63 lowercase letters, numbers, or hyphens.',confirm:'Create bucket'});if(n===null)return;await run(async()=>{await request('createBucket',{accountId,name:n});await loadBuckets();status('Bucket created. Choose it to browse or set up right-click destinations.');},{refresh:false});};
$('prepare').onclick=async()=>{const source=context();if(!source||busy)return;if(!await dialog('Set up right-click destination?',{input:false,description:'Deploys or updates the existing REDOWN Worker for '+source.bucketName+' and saves a destination profile. Existing profile settings are retained. Creates default destination folders. This uses the original setup service.',confirm:'Set up destination'}))return;await run(async signal=>{const result=await request('prepareBucket',{source},{signal});await loadProfiles();status(result.data.verification?.workerReachable?'Destination setup verified by the original service. Configure Simple or Nested menus in Original Explorer settings.':'Setup returned without reachability verification. Check Original Explorer settings.');});};
$('transfer-history').onclick=()=>run(async()=>{const result=await request('transferHistory',{});await dialog('Recent transfers',{input:false,details:JSON.stringify(result.data.history,null,2),confirm:'Close',description:'Original transfer history. Local Beta uploads and copies are not included.'});},{refresh:false});
const preferenceFields={batchConcurrency:['pref-concurrency',1],uploadTimeoutMs:['pref-upload',1000],previewMaxBytes:['pref-preview',1048576]};
function paintPreferences(){const values={...api.getDefaults(),...api.getPreferences()};for(const [key,[id,scale]] of Object.entries(preferenceFields))$(id).value=values[key]/scale;$('preferences-error').textContent='';}
$('preferences').onclick=()=>{paintPreferences();$('preferences-dialog').showModal();};
$('preferences-cancel').onclick=()=>$('preferences-dialog').close();
$('preferences-reset').onclick=()=>{api.setPreferences({});paintPreferences();status('Transfer preferences restored to defaults.');};
$('preferences-form').onsubmit=event=>{event.preventDefault();try{const values=api.getPreferences();for(const [key,[id,scale]] of Object.entries(preferenceFields))values[key]=Number($(id).value)*scale;api.setPreferences(values);$('preferences-dialog').close();status('Transfer preferences applied to this tab.');}catch(e){$('preferences-error').textContent=e.message;}};
function closePreview(){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';previewItem=null;$('preview-content').replaceChildren();}
$('preview-close').onclick=()=>$('preview-dialog').close();$('preview-dialog').addEventListener('close',closePreview);
async function showPreview(item){
  const source=context();await run(async signal=>{
    status('Loading preview…');const result=await request('preview',{source,entry:item},{signal});signal.throwIfAborted();
    if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=result.data.url;previewItem=item;
    const {type,size}=result.data;let node;
    if(type.startsWith('text/')){node=document.createElement('pre');node.textContent=await (await fetch(previewUrl)).text();}
    else if(type.startsWith('image/')){node=document.createElement('img');node.alt=item.displayName;node.src=previewUrl;}
    else if(type.startsWith('video/')||type.startsWith('audio/')){node=document.createElement(type.startsWith('video/')?'video':'audio');node.controls=true;node.src=previewUrl;}
    else{node=document.createElement('iframe');node.title=item.displayName;node.referrerPolicy='no-referrer';node.src=previewUrl;}
    $('preview-title').textContent=item.displayName;$('preview-content').replaceChildren(node);$('preview-info').textContent=bytes(size)+' · '+type+(result.data.truncated?' · Text preview truncated':'');
    if(!$('preview-dialog').open)$('preview-dialog').showModal();status('Preview loaded.');
  },{refresh:false});
}
async function adjacentPreview(direction){if(busy||!previewItem)return;const files=visible().filter(e=>!e.folder),i=files.findIndex(e=>e.key===previewItem.key),next=files[i+direction];if(next)await showPreview(next);}
$('preview-previous').onclick=()=>adjacentPreview(-1);$('preview-next').onclick=()=>adjacentPreview(1);
async function chooseTransfer(operation){
  if(busy||!selected.size)return;const clip={source:context(),entries:chosen().map(e=>({...e})),operation};
  const target=await chooseDestination(operation);if(target)await actions.paste(target,clip);
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
  $('destination-dialog').showModal();void destinationBuckets();
  return new Promise(resolve=>$('destination-dialog').addEventListener('close',()=>{destinationEpoch++;resolve($('destination-dialog').returnValue==='ok'?{accountId:$('destination-account').value,accountName:accounts.find(a=>a.id===$('destination-account').value)?.name||'',bucketName:$('destination-bucket').value,prefix:prefix($('destination-prefix').value)}:null);},{once:true}));
}
let archiveContext=null;
function archiveControls(){const checks=[...document.querySelectorAll('#archive-files input')],count=checks.filter(c=>c.checked).length;$('archive-extract').disabled=busy||!count;$('archive-all').checked=checks.length>0&&count===checks.length;$('archive-all').indeterminate=count>0&&count<checks.length;}
$('archive-all').onchange=()=>{document.querySelectorAll('#archive-files input').forEach(c=>c.checked=$('archive-all').checked);archiveControls();};
$('archive-close').onclick=()=>$('archive-dialog').close();$('archive-cancel').onclick=()=>controller?.abort();
$('archive-extract').onclick=async()=>{if(!archiveContext||busy)return;const target={...archiveContext};let destinationPrefix;try{destinationPrefix=prefix($('archive-prefix').value);}catch(e){$('archive-status').textContent=e.message;return;}
  const entries=[...document.querySelectorAll('#archive-files input:checked')].map(c=>c.value);if(!entries.length)return;
  $('archive-cancel').hidden=false;$('archive-extract').disabled=true;document.querySelectorAll('#archive-files input').forEach(c=>c.disabled=true);$('archive-all').disabled=true;
  await run(async signal=>{const result=await api.batch('extractArchiveEntry',entries.map(entry=>({...target,entry,destinationPrefix})),{signal,onProgress:event=>{progress(event);if(event.phase==='item')$('archive-status').textContent='Extracting '+(event.index+1)+' of '+event.total+'…';}});outcome(result);$('archive-status').textContent=$('status').textContent;for(let i=0;i<result.results.length;i++)if(result.results[i].state==='completed'){const check=[...document.querySelectorAll('#archive-files input')].find(c=>c.value===entries[i]);if(check)check.checked=false;}});
  $('archive-cancel').hidden=true;document.querySelectorAll('#archive-files input').forEach(c=>c.disabled=false);$('archive-all').disabled=false;archiveControls();
};
render();void loadAccounts().catch(e=>status(e.message));
