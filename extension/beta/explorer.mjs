import {createFileApi,prefix,name} from './file-api.mjs';
import {createR2Adapter} from './r2-adapter.mjs';
const $=id=>document.getElementById(id),api=createFileApi(createR2Adapter());
let current=null,items=[],selected=new Set(),cursor='',epoch=0,busy=false,clipboard=null,anchor=-1,controller=null,history=[],historyIndex=-1,accounts=[],dragState=null;
const bytes=n=>n==null?'—':n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':n<1073741824?(n/1048576).toFixed(1)+' MB':(n/1073741824).toFixed(1)+' GB';
const context=()=>current?{...current}:null;
const chosen=()=>items.filter(item=>selected.has(item.key));
function status(text){$('status').textContent=text;}
function button(label,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=handler;return b;}
function controls(){
  for(const id of ['accounts','upload','upload-folder','remote','mkdir','refresh','filter','path'])$(id).disabled=busy || (!current&&!['accounts'].includes(id));
  $('back').disabled=busy||historyIndex<1;$('forward').disabled=busy||historyIndex>=history.length-1;$('up').disabled=busy||!current?.prefix;
  for(const id of ['copy','cut','delete'])$(id).disabled=busy||!selected.size;
  for(const id of ['rename','properties'])$(id).disabled=busy||selected.size!==1;
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
    row.ondblclick=()=>{if(!busy){if(item.folder)void navigate({...context(),prefix:item.key});else {selected=new Set([item.key]);void actions.download();}}};
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
  copy(){if(busy||!selected.size)return;clipboard={source:context(),entries:chosen().map(e=>({...e})),operation:'copy'};status(selected.size+' items copied to REDOWN clipboard.');controls();},
  cut(){if(busy||!selected.size)return;clipboard={source:context(),entries:chosen().map(e=>({...e})),operation:'move'};status(selected.size+' items ready to move. Sources remain until paste.');controls();},
  async paste(destination=context(),clip=clipboard){
    if(busy||!clip||!destination)return;const conflict=$('conflict').value;
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
  await run(async signal=>{const inputs=files.map(file=>({source,file,key:source.prefix+(file.webkitRelativePath||file.name),conflict}));outcome(await api.batch('upload',inputs,{signal,onProgress:progress}));});
}
$('upload').onclick=()=>$('picker').click();$('upload-folder').onclick=()=>$('folder-picker').click();
for(const id of ['picker','folder-picker'])$(id).onchange=()=>{const files=Array.from($(id).files);$(id).value='';void upload(files).catch(e=>status(e.message));};
$('dropzone').ondragover=event=>{event.preventDefault();if(current&&!busy)$('dropzone').classList.add('drag');};$('dropzone').ondragleave=()=>$('dropzone').classList.remove('drag');
async function droppedFiles(event,target=context()){if([...event.dataTransfer.items].some(i=>i.webkitGetAsEntry?.()?.isDirectory)){status('Use Upload folder to preserve a dropped directory tree. No files uploaded.');return;}await upload([...event.dataTransfer.files],target).catch(e=>status(e.message));}
$('dropzone').ondrop=event=>{event.preventDefault();$('dropzone').classList.remove('drag');if(dragState){const clip={...dragState,operation:event.ctrlKey||event.metaKey?'copy':'move'};void actions.paste(context(),clip).catch(e=>status(e.message));}else void droppedFiles(event);};
$('dialog-cancel').onclick=()=>$('dialog').close('cancel');$('sort').onchange=render;$('filter').oninput=render;$('refresh').onclick=()=>run(()=>listing(),{refresh:false});$('more').onclick=()=>run(()=>listing(true),{refresh:false});
$('path').onclick=async()=>{if(!current||busy)return;const target=context(),p=await dialog('Go to folder',{description:'Enter a bucket-relative folder path. Leave empty for the bucket root.',value:target.prefix,required:false});if(p!==null)void navigate({...target,prefix:p}).catch(e=>status(e.message));};
$('back').onclick=()=>{if(historyIndex>0)void navigate(history[--historyIndex],false);};$('forward').onclick=()=>{if(historyIndex<history.length-1)void navigate(history[++historyIndex],false);};$('up').onclick=()=>{if(current)void navigate({...context(),prefix:current.prefix.replace(/[^/]+\/$/,'')});};
$('view').onclick=()=>{$('files').classList.toggle('grid');$('view').textContent=$('files').classList.contains('grid')?'List view':'Grid view';};
$('cancel').onclick=()=>{controller?.abort();status('Stopping the upload or remaining items. A running cloud copy or move may still complete; refresh before retrying.');};
function showMenu(x,y){const menu=$('context');menu.replaceChildren(...['copy','cut','paste','rename','download','properties','delete','mkdir'].map(id=>{const b=button($(id).textContent,()=>{menu.hidden=true;$(id).click();});b.disabled=$(id).disabled;return b;}));menu.hidden=false;menu.style.left=Math.max(0,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(0,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button:not(:disabled)')?.focus();}
document.addEventListener('click',e=>{if(!$('context').contains(e.target))$('context').hidden=true;});
$('dropzone').oncontextmenu=e=>{if(e.target.closest('.file')||busy)return;e.preventDefault();showMenu(e.clientX,e.clientY);};
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){$('context').hidden=true;return;}
  if(event.target.closest?.('input,select,textarea,dialog')||busy)return;
  const modified=event.ctrlKey||event.metaKey,k=event.key.toLowerCase();
  if(modified&&event.shiftKey&&k==='n'){event.preventDefault();$('mkdir').click();}
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
async function loadAccounts(){const result=await request('accounts',{});accounts=result.data.accounts||[];$('accounts').replaceChildren(...accounts.map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name||a.id;return o;}));await loadBuckets();}
$('accounts').onchange=()=>loadBuckets().catch(e=>status(e.message));
$('connect').onclick=()=>run(async()=>{await request('connect',{});status('Finish Cloudflare sign-in in the window that opened.');},{refresh:false});
$('disconnect').onclick=async()=>{if(!await dialog('Disconnect Cloudflare?',{input:false,description:'Clears the shared Cloudflare session, including the original Explorer. Cloud files remain untouched.',confirm:'Disconnect'}))return;await run(async()=>{await request('disconnect',{});current=null;items=[];clipboard=null;accounts=[];$('accounts').replaceChildren();$('buckets').replaceChildren();render();status('Cloudflare disconnected.');},{refresh:false});};
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local'||!changes.cloudflareAuth)return;const before=changes.cloudflareAuth.oldValue,after=changes.cloudflareAuth.newValue;if(before?.sessionId===after?.sessionId&&before?.accessToken&&after?.accessToken)return;epoch++;if($('dialog').open)$('dialog').close('cancel');controller?.abort();current=null;items=[];selected.clear();clipboard=null;$('buckets').replaceChildren();render();if(after?.accessToken)void loadAccounts().catch(e=>status(e.message));else status('Cloudflare session changed. Connect to continue.');});
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
render();void loadAccounts().catch(e=>status(e.message));
