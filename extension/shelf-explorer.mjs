/* Mini Explorer: Chute-derived two-pane layout/row gestures, REDOWN file authority.
 * Chute 3f9033b explorer-view.js/css; copyright (c) 2026 Chute contributors.
 * See CHUTE-LICENSE.txt. Adapted for cloud identities and the existing Shelf. */
import {createFileApi} from './beta/file-api.mjs';
import {createR2Adapter,previewType} from './beta/r2-adapter.mjs';
import {createWindowPreview,renderPreview} from './beta/window-preview.mjs';
import {createExplorerModel,identity,windowRange} from './shelf-explorer-model.mjs';
import {createDragBridge} from './chute-drag.mjs';

export function mountExplorer({host,api=createFileApi(createR2Adapter()),storage=chrome.storage.local,document=host.ownerDocument}={}){
  host.innerHTML=`<header class="mini-heading"><div><p class="eyebrow">YOUR CLOUDS · YOUR FILES</p><h1>File Explorer</h1></div><a href="#clouds">Connections ↗</a></header>
  <div class="mini-toolbar"><button data-action="rail" aria-expanded="false" aria-controls="mini-rail">☰ Clouds</button><button data-action="back" aria-label="Back">←</button><button data-action="forward" aria-label="Forward">→</button><button data-action="up" aria-label="Parent folder">↑</button><button data-action="refresh">Refresh</button></div>
  <nav class="mini-crumbs" aria-label="Folder path"></nav>
  <div class="mini-workspace"><aside id="mini-rail" class="mini-rail" aria-label="Your clouds"><div class="mini-tree" role="tree" aria-label="Cloud accounts and folders"></div><p>Other clouds</p><a href="#clouds">Google Drive · Dropbox · OneDrive</a><small>Use Remotes to connect or open these providers. Folder browsing and generic S3 are not available through the current File API.</small></aside>
  <div class="mini-content"><label class="mini-filter">Filter loaded files<input type="search" placeholder="Name contains…" aria-label="Filter loaded files"></label><div class="mini-sort"><select aria-label="Sort loaded files"><option value="name">Name</option><option value="size">Size</option></select><button data-action="folder">New folder</button></div><div class="mini-list" role="listbox" aria-label="Files" aria-multiselectable="true" tabindex="0"><div class="mini-spacer"></div><div class="mini-rows"></div></div><button data-action="more" hidden>Load more files</button></div></div>
  <div class="mini-actions"><button data-action="prepare" disabled>Prepare to drag</button><button data-action="cancel">Cancel drag</button><button data-action="download" disabled>Download</button><button data-action="rename" disabled>Rename</button><button data-action="delete" disabled>Delete</button><button data-action="copy" disabled>Copy</button><button data-action="move" disabled>Move</button><button data-action="paste" disabled>Paste here</button></div>
  <p class="mini-status" role="status" aria-live="polite"></p><p class="mini-drag-status" role="status" aria-live="polite">Select a file, prepare its bytes, then drag to a file upload area. Check acceptance at the destination.</p>
  <section class="mini-preview" hidden aria-label="Side Preview"><header><strong></strong><button data-action="close-preview" aria-label="Close Side Preview">✕</button></header><div class="mini-preview-body"></div></section><dialog class="mini-window-preview"></dialog><dialog class="mini-prompt"><form method="dialog"><label></label><input required autocomplete="off"><p></p><button value="cancel" formnovalidate>Cancel</button><button value="ok">Confirm</button></form></dialog>`;
  const $=selector=>host.querySelector(selector),button=action=>$(`[data-action="${action}"]`),say=message=>{$('.mini-status').textContent=message;};
  const list=$('.mini-list'),rows=$('.mini-rows'),tree=$('.mini-tree');let visible=[],selectedEntry=null,sideAbort=null,sideUrl='',sideEpoch=0,discovery=0,rootAbort=null,initialized=false,activeView=false,focusIndex=0,saved={},saveTimer,treeRestores=0,clipboard=null; 
  const expansions=new Set(),nodes=new Map();let sortedKey='',sortedEntries=null;
  const model=createExplorerModel({api,onChange:paint});
  const bridge=createDragBridge({api,onState:({message})=>{$('.mini-drag-status').textContent=message;}});
  const request=(...args)=>model.request(...args).then(data=>({data}));
  function safe(fn){return (...args)=>{void Promise.resolve().then(()=>fn(...args)).catch(error=>say(error.message||'Could not complete this action.'));};}
  function closeSide(){sideEpoch++;sideAbort?.abort();sideAbort=null;for(const media of $('.mini-preview-body').querySelectorAll('video,audio')){media.pause();media.removeAttribute('src');media.load();}$('.mini-preview-body').replaceChildren();if(sideUrl)URL.revokeObjectURL(sideUrl);sideUrl='';$('.mini-preview').hidden=true;}
  const preview=createWindowPreview({document,dialog:$('.mini-window-preview'),request,previewType,getContext:()=>model.state.source,getItems:()=>model.state.entries,pauseSide:closeSide,onSelection:entry=>select(entry),onDownload:entry=>download(entry)});
  async function side(entry){
    closeSide();if(!previewType(entry.key)||!activeView)return;
    const ticket=sideEpoch,abort=new AbortController();sideAbort=abort;$('.mini-preview').hidden=false;$('.mini-preview strong').textContent=entry.displayName||entry.key;$('.mini-preview-body').textContent='Loading preview…';
    let pending='';
    try{
      const {data}=await request('preview',{source:{...model.state.source},entry},{signal:abort.signal,previewMaxBytes:8*1048576,textPreviewMaxBytes:128*1024});pending=data.url;
      const text=data.type.startsWith('text/')?await (await fetch(pending,{signal:abort.signal})).text():undefined;
      if(ticket!==sideEpoch||abort.signal.aborted)return;
      const media=renderPreview(document,{...data,text,title:entry.displayName||entry.key});sideUrl=pending;pending='';
      media.addEventListener('error',()=>{if(ticket===sideEpoch)$('.mini-preview-body').textContent='Preview unavailable for these bytes or this browser. Use Download to inspect the original.';},{once:true});
      $('.mini-preview-body').replaceChildren(media);
    }catch(error){if(ticket===sideEpoch&&!abort.signal.aborted)$('.mini-preview-body').textContent=error.message;}
    finally{if(pending)URL.revokeObjectURL(pending);}
  }
  function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{
    const source=model.state.source;
    void storage.set({shelfExplorerV1:{source:source?{accountId:source.accountId,bucketName:source.bucketName,prefix:source.prefix||''}:null,expanded:[...expansions].slice(-64),scroll:list.scrollTop}}).catch(()=>{});
  },150);}
  function select(entry,event={}){
    if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey)model.state.selected.clear();
    if((event.ctrlKey||event.metaKey)&&model.state.selected.has(entry.key))model.state.selected.delete(entry.key);else model.state.selected.add(entry.key);
    selectedEntry=entry;renderRows();paintActions();if(!entry.folder)void side(entry);else closeSide();
  }
  function paintActions(){const entries=model.state.entries.filter(e=>model.state.selected.has(e.key)),one=entries.length===1;
    for(const action of ['prepare','download'])button(action).disabled=!one||entries[0].folder;
    for(const action of ['rename','delete','copy','move'])button(action).disabled=!one;
    button('paste').disabled=!clipboard||!model.state.source;
    button('folder').disabled=!model.state.source||model.state.phase!=='ready';
  }
  function renderRows(){
    const query=$('.mini-filter input').value.toLocaleLowerCase(),sort=$('.mini-sort select').value;
    const focused=rows.contains(document.activeElement)?document.activeElement.dataset.index:null;
    if(sortedEntries!==model.state.entries||sortedKey!==query+'|'+sort){
      sortedEntries=model.state.entries;sortedKey=query+'|'+sort;
      visible=model.state.entries.filter(e=>(e.displayName||e.key).toLocaleLowerCase().includes(query)).sort((a,b)=>Number(b.folder)-Number(a.folder)||(sort==='size'?Number(b.size||0)-Number(a.size||0):0)||(a.displayName||a.key).localeCompare(b.displayName||b.key));
    }
    const range=windowRange(visible.length,list.scrollTop,list.clientHeight||384);
    $('.mini-spacer').style.height=range.total+'px';rows.style.top=range.top+'px';rows.replaceChildren();
    for(let index=range.start;index<range.end;index++){
      const entry=visible[index],row=document.createElement('div');row.className='mini-row';row.role='option';row.tabIndex=index===focusIndex?0:-1;row.dataset.index=index;row.setAttribute('aria-selected',String(model.state.selected.has(entry.key)));row.setAttribute('aria-posinset',index+1);row.setAttribute('aria-setsize',visible.length);
      const icon=document.createElement('span');icon.className='mini-icon';icon.textContent=entry.folder?'▰':previewType(entry.key)?.startsWith('image/')?'▧':'▤';icon.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.className='mini-name';name.textContent=entry.displayName||entry.key;name.title=name.textContent;
      const size=document.createElement('small');size.textContent=entry.folder?'Folder':Number.isFinite(Number(entry.size))?`${(Number(entry.size)/1024).toLocaleString(undefined,{maximumFractionDigits:1})} KB`:'File';
      row.append(icon,name,size);row.onclick=event=>{focusIndex=index;select(entry,event);};
      row.ondblclick=safe(()=>entry.folder?navigate({...model.state.source,prefix:entry.key}):preview.open(entry));
      row.onkeydown=event=>{
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();focusIndex=Math.max(0,Math.min(visible.length-1,event.key==='Home'?0:event.key==='End'?visible.length-1:index+(event.key==='ArrowDown'?1:-1)));list.scrollTop=Math.max(0,focusIndex*48-list.clientHeight/2);renderRows();rows.querySelector(`[data-index="${focusIndex}"]`)?.focus();}
        if(event.key===' '){event.preventDefault();select(entry,event);}
        if(event.key==='Enter'){event.preventDefault();safe(()=>entry.folder?navigate({...model.state.source,prefix:entry.key}):preview.open(entry))();}
        if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){event.preventDefault();showMenu(entry,row.getBoundingClientRect(),row);}
      };
      if(!entry.folder){row.draggable=true;row.ondragend=event=>bridge.end(event);row.ondragstart=event=>{
        const handle=bridge.getHandle();
        if(model.state.selected.size>1||!handle||handle.key!==entry.key||handle.source!==identity(model.state.source)){event.preventDefault();$('.mini-drag-status').textContent='Select one file and choose Prepare to drag, then drag again.';return;}
        bridge.begin(event);
      };}
      rows.append(row);
    }
    if(focused!==null)rows.querySelector(`[data-index="${focused}"]`)?.focus({preventScroll:true});
  }
  function paint(){
    const s=model.state;renderRows();paintActions();button('more').hidden=!s.cursor;button('more').disabled=s.phase==='loading';button('back').disabled=s.index<=0;button('forward').disabled=s.index>=s.history.length-1;button('up').disabled=!s.source?.prefix;
    list.setAttribute('aria-busy',String(s.phase==='loading'));
    say(s.phase==='loading'?'Loading folder…':s.phase==='error'?s.error:s.source?`${s.entries.length.toLocaleString()} loaded · ${s.source.bucketName}`:'Choose a cloud account and bucket. Connect in Remotes if needed.');
    $('.mini-crumbs').replaceChildren();if(s.source){
      const parts=(s.source.prefix||'').split('/').filter(Boolean);
      for(let index=-1;index<parts.length;index++){const crumb=document.createElement('button');crumb.textContent=index===-1?s.source.bucketName:parts[index];crumb.onclick=safe(()=>navigate({...s.source,prefix:index<0?'':parts.slice(0,index+1).join('/')+'/'}));$('.mini-crumbs').append(crumb);}
      $('.mini-crumbs').title=`${s.source.accountName||s.source.accountId} / ${s.source.bucketName} / ${s.source.prefix||''}`;
    }
    for(const node of tree.querySelectorAll('[role="treeitem"]'))node.setAttribute('aria-selected',String(node.dataset.source=== (s.source?identity(s.source):'')));
  }
  async function navigate(source,options={}){
    closeSide();preview.close();await bridge.cancel();selectedEntry=null;
    if(!options.append){list.scrollTop=0;focusIndex=0;}
    await model.navigate(source,options);persist();
  }
  function treeNode(label,id,load,source=null,parent=tree){
    const container=document.createElement('div'),item=document.createElement('button'),children=document.createElement('div');
    item.type='button';item.role='treeitem';item.tabIndex=0;item.className='mini-node';item.textContent='▸ '+label;item.title=label;item.setAttribute('aria-expanded','false');item.setAttribute('aria-selected','false');if(source)item.dataset.source=identity(source);
    children.role='group';children.hidden=true;container.append(item,children);parent.append(container);nodes.set(id,{item,children});let loaded=false,pending=false;
    const toggle=async(force)=>{
      const open=force??children.hidden;children.hidden=!open;item.setAttribute('aria-expanded',String(open));item.textContent=(open?'▾ ':'▸ ')+label;
      if(open)expansions.add(id);else expansions.delete(id);persist();
      if(!open||pending||loaded)return;pending=true;children.textContent='Loading…';item.setAttribute('aria-busy','true');
      try{await load(children);loaded=true;if(!children.childNodes.length)children.textContent=source?'No subfolders':'No authorized buckets';}
      catch{children.replaceChildren();const retry=document.createElement('button');retry.textContent='Unavailable · Retry';retry.onclick=safe(()=>{loaded=false;return toggle(true);});children.append(retry);}
      finally{pending=false;item.removeAttribute('aria-busy');}
    };
    item.onclick=safe(async()=>{if(source)await navigate(source);await toggle();});
    item.onkeydown=event=>{
      const items=[...tree.querySelectorAll('[role="treeitem"]')].filter(n=>!n.closest('[hidden]'));
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();items[Math.max(0,Math.min(items.length-1,event.key==='Home'?0:event.key==='End'?items.length-1:items.indexOf(item)+(event.key==='ArrowDown'?1:-1)))]?.focus();}
      if(event.key==='ArrowRight'){event.preventDefault();if(children.hidden)safe(()=>toggle(true))();else children.querySelector('[role="treeitem"]')?.focus();}
      if(event.key==='ArrowLeft'){event.preventDefault();if(!children.hidden)safe(()=>toggle(false))();else parent.parentElement?.querySelector('[role="treeitem"]')?.focus();}
    };
    if(expansions.has(id)&&++treeRestores<=64)safe(()=>toggle(true))();
    return item;
  }
  async function folders(source,container,cursor='',append=false){
    const data=await model.children(source,{cursor});if(!append)container.replaceChildren();
    for(const entry of data.entries.filter(e=>e.folder)){
      const child={...source,prefix:entry.key};treeNode(entry.displayName||entry.key,identity(child),parent=>folders(child,parent),child,container);
    }
    if(data.cursor){const more=document.createElement('button');more.textContent='More folders…';more.onclick=safe(async()=>{more.disabled=true;try{await folders(source,container,data.cursor,true);more.remove();}finally{more.disabled=false;}});container.append(more);}
  }
  async function discover(){
    const ticket=++discovery;rootAbort?.abort();rootAbort=new AbortController();model.reset();closeSide();preview.close();await bridge.cancel();tree.textContent='Checking connections…';nodes.clear();treeRestores=0;
    try{
      const {accounts=[]}=await model.request('accounts',{}, {signal:rootAbort.signal});if(ticket!==discovery)return;tree.replaceChildren();
      for(const account of accounts)treeNode(`Cloudflare R2 · ${account.name||account.id}`,JSON.stringify(['r2',account.id]),async parent=>{
        const result=await model.request('buckets',{accountId:account.id});if(ticket!==discovery)return;parent.replaceChildren();
        for(const bucket of result.buckets||[]){const source={accountId:account.id,accountName:account.name||'',bucketName:bucket.name,prefix:''};treeNode(bucket.name,identity(source),parent=>folders(source,parent),source,parent);}
      });
      if(!accounts.length)tree.textContent='No authorized Cloudflare accounts. Connect in Remotes.';
      const restore=saved.source;
      if(restore&&accounts.some(a=>a.id===restore.accountId)){
        const {buckets=[]}=await model.request('buckets',{accountId:restore.accountId});if(ticket!==discovery)return;
        if(buckets.some(b=>b.name===restore.bucketName)){await navigate(restore);list.scrollTop=Number.isFinite(saved.scroll)?Math.max(0,saved.scroll):0;renderRows();}
      }
    }catch{if(ticket===discovery){tree.textContent='Cloud connection unavailable. Use Refresh or reconnect in Remotes.';say('Could not verify cloud access. Your files were not changed.');}}
  }
  function one(){const entries=model.state.entries.filter(e=>model.state.selected.has(e.key));if(entries.length!==1)throw Error('Select one item.');return entries[0];}
  async function download(entry=one()){const result=await model.request('download',{source:{...model.state.source},entry});say(result.downloadState==='complete'?'Chrome confirmed download completion.':'Download started. Completion has not been observed.');}
  function ask(label,initial='',confirmation=false){
    const dialog=$('.mini-prompt'),input=dialog.querySelector('input');dialog.querySelector('label').textContent=label;input.value=initial;input.hidden=confirmation;input.required=!confirmation;
    return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='ok'?(confirmation?true:input.value):null),{once:true});dialog.returnValue='cancel';dialog.showModal();input.focus();});
  }
  async function mutate(operation,input,source={...model.state.source}){
    if(!model.state.source||identity(source)!==identity(model.state.source))throw Error('Location changed. Select the item again.');await model.request(operation,{source,...input});model.invalidate();
    if(model.state.source&&identity(model.state.source)===identity(source))await navigate(source,{fresh:true,record:false});
    // Tree pages must be rediscovered after any successful mutation.
    saved={source:model.state.source};await discover();say('Operation confirmed by the File API. Folder listings refreshed.');
  }
  button('rail').onclick=()=>{const open=host.classList.toggle('mini-rail-open');button('rail').setAttribute('aria-expanded',String(open));};
  button('back').onclick=safe(async()=>{closeSide();preview.close();await bridge.cancel();await model.travel(-1);persist();});
  button('forward').onclick=safe(async()=>{closeSide();preview.close();await bridge.cancel();await model.travel(1);persist();});
  button('up').onclick=safe(()=>navigate({...model.state.source,prefix:model.state.source.prefix.replace(/[^/]+\/$/,'')}));
  button('refresh').onclick=safe(async()=>{saved={source:model.state.source};model.invalidate();await discover();});
  button('more').onclick=safe(()=>navigate(model.state.source,{append:true,record:false}));
  button('prepare').onclick=safe(async()=>{
    const entry={...one()},source={...model.state.source};entry.mime=entry.httpMetadata?.contentType||previewType(entry.key)||'application/octet-stream';
    await bridge.prepare(source,entry);
  });
  button('cancel').onclick=safe(()=>bridge.cancel());button('close-preview').onclick=closeSide;button('download').onclick=safe(()=>download());
  button('rename').onclick=safe(async()=>{const source={...model.state.source},entry=one(),newName=await ask('Rename item',entry.displayName||entry.key.split('/').filter(Boolean).pop());if(newName)await mutate('rename',{entry,newName},source);});
  button('delete').onclick=safe(async()=>{const source={...model.state.source},entry=one();if(await ask('Delete the selected item from this cloud?','',true))await mutate('delete',{entries:[entry]},source);});
  button('folder').onclick=safe(async()=>{const source={...model.state.source},name=await ask('New folder name');if(name)await mutate('mkdir',{name},source);});
  for(const operation of ['copy','move'])button(operation).onclick=safe(()=>{clipboard={operation,source:{...model.state.source},entries:[{...one()}]};paintActions();say('Choose a destination folder, then Paste here. Conflicts keep both files.');});
  button('paste').onclick=safe(async()=>{if(!clipboard)throw Error('Copy or Move a file first.');const destination={...model.state.source},pending=clipboard;clipboard=null;paintActions();await model.request(pending.operation,{...pending,destination,conflict:'keep'});model.invalidate();if(model.state.source&&identity(model.state.source)===identity(destination))await navigate(destination,{fresh:true,record:false});saved={source:model.state.source};await discover();say('Transfer confirmed by the File API.');});
  list.addEventListener('scroll',()=>{renderRows();persist();},{passive:true});$('.mini-filter input').oninput=()=>{list.scrollTop=0;renderRows();};$('.mini-sort select').onchange=()=>{list.scrollTop=0;renderRows();};
  list.onkeydown=event=>{if(event.target===list&&['Enter','ArrowDown'].includes(event.key)){event.preventDefault();focusIndex=0;list.scrollTop=0;renderRows();rows.firstElementChild?.focus();}};
  const contextMenu=document.createElement('div');contextMenu.className='mini-context';contextMenu.role='menu';contextMenu.hidden=true;host.append(contextMenu);
  function showMenu(entry,point,returnFocus){
    select(entry);contextMenu.replaceChildren();contextMenu.hidden=false;
    returnFocus=rows.querySelector(`[data-index="${visible.indexOf(entry)}"]`)||list;
    contextMenu.style.left=Math.max(4,Math.min(point.x??point.left,document.documentElement.clientWidth-180))+'px';
    contextMenu.style.top=Math.max(4,Math.min(point.y??point.top,(globalThis.innerHeight||600)-270))+'px';
    for(const action of ['prepare','download','rename','delete','copy','move','paste']){
      const original=button(action),item=document.createElement('button');item.type='button';item.role='menuitem';item.textContent=original.textContent;item.disabled=original.disabled;
      item.onclick=()=>{contextMenu.hidden=true;original.click();returnFocus?.focus({preventScroll:true});};contextMenu.append(item);
    }
    contextMenu.querySelector('button:not(:disabled)')?.focus();
    contextMenu.onkeydown=event=>{
      if(event.key==='Escape'){contextMenu.hidden=true;returnFocus?.focus({preventScroll:true});}
      if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const items=[...contextMenu.querySelectorAll('button:not(:disabled)')],index=items.indexOf(document.activeElement);items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}
    };
  }
  const closeContext=event=>{if(!contextMenu.contains(event.target))contextMenu.hidden=true;};
  document.addEventListener('pointerdown',closeContext);
  host.addEventListener('contextmenu',event=>{const row=event.target.closest('.mini-row');if(row){event.preventDefault();showMenu(visible[Number(row.dataset.index)],{x:event.clientX,y:event.clientY},row);}});
  host.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('application/x-redown-chute-v1'))event.dataTransfer.dropEffect='none';});
  async function setActive(value){activeView=value;if(!value){contextMenu.hidden=true;closeSide();preview.close();return;}
    if(initialized)return;initialized=true;
    try{saved=(await storage.get('shelfExplorerV1')).shelfExplorerV1||{};for(const id of Array.isArray(saved.expanded)?saved.expanded.slice(0,64):[])if(typeof id==='string'&&id.length<2048)expansions.add(id);}catch{}
    await discover();
  }
  const changed=(changes,area)=>{
    if(area==='session'&&changes.redownChuteReceipt){const receipt=changes.redownChuteReceipt.newValue;if(receipt?.id===bridge.getHandle()?.id){$('.mini-drag-status').textContent=receipt.state==='drop_dispatched'?'File dispatched. Check the destination: acceptance and upload completion are unverified.':'File handoff failed. Prepare again or use Download and the destination file picker.';}}
    if(area==='local'&&changes.cloudflareAuth){clipboard=null;saved={};expansions.clear();void discover();}
  };
  chrome.storage.onChanged.addListener(changed);
  const view=()=>{void setActive(!host.hidden).catch(()=>say('File Explorer unavailable. Refresh or reconnect in Remotes.'));};
  globalThis.addEventListener('redown:shelf-route',view);globalThis.addEventListener('pagehide',()=>{closeSide();void bridge.dispose();});view();
  return {model,bridge,setActive,discover,dispose(){clearTimeout(saveTimer);document.removeEventListener('pointerdown',closeContext);chrome.storage.onChanged.removeListener?.(changed);globalThis.removeEventListener('redown:shelf-route',view);closeSide();preview.close();model.reset();void bridge.dispose();}};
}
if(globalThis.document?.getElementById('explorer-view'))mountExplorer({host:document.getElementById('explorer-view')});
