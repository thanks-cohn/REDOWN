/* Mini Explorer: Chute-derived two-pane layout/row gestures, REDOWN file authority.
 * Chute 3f9033b explorer-view.js/css; copyright (c) 2026 Chute contributors.
 * See CHUTE-LICENSE.txt. Adapted for cloud identities and the existing Shelf. */
import {createFileApi} from './beta/file-api.mjs';
import {createR2Adapter,previewType} from './beta/r2-adapter.mjs';
import {createWindowPreview,renderPreview} from './beta/window-preview.mjs';
import {createExplorerModel,identity,offsetRange} from './shelf-explorer-model.mjs';
import {resolveHistoryTarget} from './beta/history-target.mjs';
import {createDragBridge} from './chute-drag.mjs';

export function mountExplorer({host,api=createFileApi(createR2Adapter()),storage=chrome.storage.local,document=host.ownerDocument}={}){
  host.innerHTML=`<div class="mini-toolbar"><button data-action="back" aria-label="Back">‹</button><button data-action="forward" aria-label="Forward">›</button><button data-action="up" aria-label="Parent folder">↑</button><button data-action="roots" aria-label="Cloud roots">⌂</button><button data-action="refresh" aria-label="Refresh">↻</button><nav class="mini-crumbs" aria-label="Folder path"></nav></div>
  <div class="mini-filter"><input type="search" placeholder="Filter loaded files" aria-label="Filter loaded files"><select aria-label="Sort loaded files"><option value="name">Name</option><option value="type">Type</option><option value="date">Date</option><option value="size">Size</option></select><button data-action="grid" aria-label="Large Images" aria-pressed="true" title="Switch between Detailed and Large Images">Large Images</button><button data-action="reset-split" aria-label="Reset columns to 50/50" title="Reset columns to 50/50">½</button></div>
  <div class="mini-workspace"><aside class="mini-rail" aria-label="Your clouds"><div class="mini-tree" role="tree" aria-label="Cloud accounts and folders"></div><a href="#clouds">Connections ↗</a></aside><div class="mini-column-resize" role="separator" tabindex="0" aria-label="Resize folders and files columns; double-click to reset to 50/50" title="Drag or use arrow keys; Home/End collapse; double-click for 50/50" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></div><div class="mini-content"><div class="mini-list" role="listbox" aria-label="Files" aria-multiselectable="true" tabindex="0"><div class="mini-spacer"></div><div class="mini-rows"></div><div class="mini-tail"></div><button data-action="more" hidden>Load more files</button></div></div></div>
  <div class="mini-actions" hidden><button data-action="download" disabled>Download</button><button data-action="rename" disabled>Rename</button><button data-action="delete" disabled>Delete</button><button data-action="copy" disabled>Copy</button><button data-action="move" disabled>Move</button><button data-action="paste" disabled>Paste here</button><button data-action="folder">New folder</button></div>
  <p class="mini-status" role="status" aria-live="polite"></p><p class="mini-drag-status" role="status" aria-live="polite"></p>
  <section class="mini-preview" hidden aria-label="File preview"><div class="mini-resize" role="separator" tabindex="0" aria-label="Resize preview" aria-orientation="horizontal" aria-valuemin="10" aria-valuemax="55" aria-valuenow="33"></div><header><strong></strong><button data-action="window-preview" aria-label="Open in Window" title="Open in Window"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 2h7v7M18 2 9 11M8 3H3v14h14v-5"/></svg></button><button data-action="expand-preview" aria-label="Expand preview" title="Expand preview"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12 2h6v6z M2 12v6h6z" fill="currentColor"/></svg></button><button data-action="close-preview" aria-label="Close preview">×</button></header><div class="mini-preview-body"></div></section><dialog class="mini-window-preview"></dialog><dialog class="mini-prompt"><form method="dialog"><label></label><input required autocomplete="off"><p></p><button value="cancel" formnovalidate>Cancel</button><button value="ok">Confirm</button></form></dialog>`;
  const $=selector=>host.querySelector(selector),button=action=>$(`[data-action="${action}"]`),say=message=>{$('.mini-status').textContent=message;};
  const list=$('.mini-list'),rows=$('.mini-rows'),tree=$('.mini-tree');let visible=[],selectedEntry=null,sideAbort=null,sideUrl='',sideEpoch=0,discovery=0,rootAbort=null,initialized=false,activeView=false,focusIndex=0,saved={},saveTimer,treeRestores=0,clipboard=null; 
  const expansions=new Set(),nodes=new Map();let sortedKey='',sortedEntries=null,grid=true,folderWidth=50,anchor=null,dragging=false,rememberedScroll=0,rememberedRailScroll=0;
  const model=createExplorerModel({api,onChange:paint});
  const bridge=createDragBridge({api,onState:({message})=>{$('.mini-drag-status').textContent=message;}});
  const request=(...args)=>model.request(...args).then(data=>({data}));
  function safe(fn){return (...args)=>{void Promise.resolve().then(()=>fn(...args)).catch(error=>say(error.message||'Could not complete this action.'));};}
  let expanded=false,restoreHeight=0,sideEntry=null,previewAnimation=null;
  function closeSide(replacing=false){if(!replacing){if(expanded)toggleExpand();sideEntry=null;}sideEpoch++;sideAbort?.abort();sideAbort=null;for(const media of $('.mini-preview-body').querySelectorAll('video,audio')){media.pause();media.removeAttribute('src');media.load();}$('.mini-preview-body').replaceChildren();if(sideUrl)URL.revokeObjectURL(sideUrl);sideUrl='';$('.mini-preview').hidden=true;if(!replacing&&$('.mini-preview').contains(document.activeElement))(folderWidth===100?$('.mini-column-resize'):list).focus({preventScroll:true});}
  const preview=createWindowPreview({document,dialog:$('.mini-window-preview'),request,previewType,getContext:()=>model.state.source,getItems:()=>model.state.entries,pauseSide:closeSide,onSelection:entry=>select(entry),onDownload:entry=>download(entry)});
  async function side(entry){
    closeSide(true);if(!previewType(entry.key)||!activeView)return;sideEntry=entry;
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
  // Adapted from Chutey setFolderWidth, positionPreview and ex-resize.
  function setFolderWidth(value){
    const number=Number(value);folderWidth=Number.isFinite(number)?Math.max(0,Math.min(100,number)):50;
    const workspace=$('.mini-workspace');
    workspace.style.gridTemplateColumns=`minmax(0,${folderWidth}fr) 8px minmax(0,${100-folderWidth}fr)`;
    workspace.dataset.collapsed=folderWidth===0?'folders':folderWidth===100?'files':'';
    $('.mini-rail').inert=folderWidth===0;$('.mini-content').inert=folderWidth===100;
    $('.mini-column-resize').setAttribute('aria-valuenow',String(Math.round(folderWidth)));
    $('.mini-column-resize').setAttribute('aria-valuetext',folderWidth===0?'Folders collapsed; files full width':folderWidth===100?'Files collapsed; folders full width':`${Math.round(folderWidth)} percent folders`);
  }
  const grip=$('.mini-column-resize');
  grip.onpointerdown=e=>{if(e.button!==0||dragging)return;grip.setPointerCapture(e.pointerId);e.preventDefault();};
  grip.onpointermove=e=>{if(grip.hasPointerCapture(e.pointerId)){const b=$('.mini-workspace').getBoundingClientRect();if(b.width>8){setFolderWidth((e.clientX-b.left-4)/(b.width-8)*100);scheduleRows();}}};
  const releaseGrip=e=>{if(e?.pointerId!==undefined&&grip.hasPointerCapture(e.pointerId))grip.releasePointerCapture(e.pointerId);persist();};
  grip.onpointerup=grip.onpointercancel=grip.onlostpointercapture=releaseGrip;
  function resetSplit(){setFolderWidth(50);scheduleRows();persist();}
  grip.ondblclick=resetSplit;button('reset-split').onclick=resetSplit;
  grip.onkeydown=e=>{const delta=e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0;if(delta||['Home','End'].includes(e.key)){e.preventDefault();setFolderWidth(e.key==='Home'?0:e.key==='End'?100:folderWidth+delta);scheduleRows();persist();}};
  function toggleExpand(){
    const panel=$('.mini-preview');if(panel.hidden)return;
    previewAnimation?.cancel();const before=panel.getBoundingClientRect(),body=$('.mini-preview-body'),scroll=[body.scrollLeft,body.scrollTop];
    if(!expanded)restoreHeight=before.height;
    expanded=!expanded;host.classList.toggle('preview-expanded',expanded);
    for(const child of host.children)if(!child.matches('.mini-preview,dialog,.mini-context'))child.inert=expanded;
    if(!expanded)panel.style.height=restoreHeight+'px';
    const control=button('expand-preview'),label=expanded?'Restore preview':'Expand preview';control.setAttribute('aria-label',label);control.title=label;control.setAttribute('aria-pressed',String(expanded));
    control.querySelector('path').setAttribute('d',expanded?'M11 9h7V2z M9 11H2v7z':'M12 2h6v6z M2 12v6h6z');
    const after=panel.getBoundingClientRect();
    if(panel.animate&&!document.defaultView.matchMedia?.('(prefers-reduced-motion: reduce)').matches)previewAnimation=panel.animate([{height:before.height+'px',transform:`translateY(${before.top-after.top}px)`},{height:after.height+'px',transform:'translateY(0)'}],{duration:160,easing:'ease-out'});
    body.scrollLeft=scroll[0];body.scrollTop=scroll[1];scheduleRows();
  }
  button('expand-preview').onclick=toggleExpand;
  button('window-preview').onclick=safe(()=>sideEntry&&preview.open(sideEntry));
  const resize=$('.mini-resize');
  function resizePreview(height){if(expanded)return;const value=Math.max(Math.min(96,host.clientHeight*.25),Math.min(host.clientHeight*.55,height));$('.mini-preview').style.height=value+'px';resize.setAttribute('aria-valuenow',Math.round(value/host.clientHeight*100));}
  resize.onpointerdown=e=>{if(e.button===0&&!expanded){resize.setPointerCapture(e.pointerId);e.preventDefault();}};
  resize.onpointermove=e=>{if(resize.hasPointerCapture(e.pointerId))resizePreview($('.mini-preview').getBoundingClientRect().bottom-e.clientY);};
  resize.onkeydown=e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();resizePreview($('.mini-preview').offsetHeight+(e.key==='ArrowUp'?16:-16));}};
  resize.onpointerup=resize.onpointercancel=e=>{if(resize.hasPointerCapture(e.pointerId))resize.releasePointerCapture(e.pointerId);};
  let renderFrame=null,lastRender='';
  const scheduleRows=()=>{if(renderFrame!==null)return;const win=document.defaultView;renderFrame=(win.requestAnimationFrame||((fn)=>setTimeout(fn,16)))(()=>{renderFrame=null;renderRows();});};
  const resizeObserver=globalThis.ResizeObserver?new ResizeObserver(scheduleRows):null;resizeObserver?.observe(list);
  function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{
    const source=model.state.source;
    void storage.set({shelfExplorerV1:{source:source?{accountId:source.accountId,bucketName:source.bucketName,prefix:source.prefix||''}:null,expanded:[...expansions].slice(-64),scroll:list.scrollTop,folderWidth,grid}}).catch(()=>{});
  },150);}
  function select(entry,event={}){
    if(!event.ctrlKey&&!event.metaKey)model.state.selected.clear();
    if(event.shiftKey&&anchor){const a=visible.findIndex(e=>e.key===anchor),b=visible.indexOf(entry);for(const e of visible.slice(Math.max(0,Math.min(a,b)),Math.max(a,b)+1))model.state.selected.add(e.key);}
    else {if((event.ctrlKey||event.metaKey)&&model.state.selected.has(entry.key))model.state.selected.delete(entry.key);else model.state.selected.add(entry.key);anchor=entry.key;}
    selectedEntry=entry;for(const row of rows.querySelectorAll('.mini-row'))row.setAttribute('aria-selected',String(model.state.selected.has(row.dataset.key)));paintActions();
  }
  function openEntry(entry){
    if(entry.folder)return navigate({...model.state.source,prefix:entry.key});
    select(entry);return side(entry);
  }
  function browseImage(index,event){
    if($('.mini-preview').hidden||!sideEntry||!previewType(sideEntry.key)?.startsWith('image/'))return false;
    const delta=event.key==='ArrowDown'?1:-1;let next=index+delta;
    while(next>=0&&next<visible.length&&(visible[next].folder||!previewType(visible[next].key)?.startsWith('image/')))next+=delta;
    if(next<0||next>=visible.length)return true;
    focusIndex=next;select(visible[next]);void side(visible[next]);
    if(!expanded){list.scrollTop=Math.max(0,offsets[next]-list.clientHeight/2);renderRows();rows.querySelector(`[data-index="${next}"]`)?.focus({preventScroll:true});}
    return true;
  }
  $('.mini-preview').addEventListener('keydown',event=>{
    if(['ArrowUp','ArrowDown'].includes(event.key)&&event.target!==resize&&!event.target.matches('input,textarea,select')){event.preventDefault();browseImage(visible.findIndex(e=>e.key===sideEntry?.key),event);}
  });
  function paintActions(){const entries=model.state.entries.filter(e=>model.state.selected.has(e.key)),one=entries.length===1;
    for(const action of ['download'])button(action).disabled=!one||entries[0].folder;
    for(const action of ['rename','delete','copy','move'])button(action).disabled=!one;
    button('paste').disabled=!clipboard||!model.state.source;
    button('folder').disabled=!model.state.source||model.state.phase!=='ready';
  }
  let offsets=[0],layoutEntries=null,layoutKey='',aspectRevision=0;const aspects=new Map();
  function renderRows(){
    if(dragging||host.hidden||!activeView||folderWidth===100)return;
    const query=$('.mini-filter input').value.toLocaleLowerCase(),sort=$('.mini-filter select').value;
    const focused=rows.contains(document.activeElement)?document.activeElement.dataset.index:null;
    if(sortedEntries!==model.state.entries||sortedKey!==query+'|'+sort){
      sortedEntries=model.state.entries;sortedKey=query+'|'+sort;
      visible=model.state.entries.filter(e=>(e.displayName||e.key).toLocaleLowerCase().includes(query)).sort((a,b)=>Number(b.folder)-Number(a.folder)||(sort==='size'?Number(b.size||0)-Number(a.size||0):sort==='date'?String(b.uploaded||'').localeCompare(String(a.uploaded||'')):sort==='type'?String(a.key.split('.').pop()).localeCompare(String(b.key.split('.').pop())):0)||(a.displayName||a.key).localeCompare(b.displayName||b.key));
    }
    // A permanent logical canvas never shrinks while the visible slice changes.
    const width=Math.max(1,list.clientWidth-24),key=[grid,width,aspectRevision,sortedKey].join('|');
    if(layoutEntries!==visible||layoutKey!==key){
      const same=layoutEntries===visible,old=offsetRange(offsets,list.scrollTop,0),fraction=(list.scrollTop-offsets[old.first])/(offsets[old.first+1]-offsets[old.first]||1);
      const next=[0];for(const entry of visible){const image=!entry.folder&&previewType(entry.key)?.startsWith('image/');next.push(next.at(-1)+(grid?(image?width*(aspects.get(entry.key)||1)+16:80)+8:48));}
      offsets=next;layoutEntries=visible;layoutKey=key;
      // Anchor the current item using current geometry, never a saved wheel offset.
      $('.mini-spacer').style.height=offsets.at(-1)+'px';
      if(same&&visible.length)list.scrollTop=offsets[old.first]+fraction*(offsets[old.first+1]-offsets[old.first]);
    }
    const range=offsetRange(offsets,list.scrollTop,list.clientHeight||384);
    const start=range.start,end=range.end;
    const signature=[start,end,key,grid,sortedKey,visible.length,model.state.selected.size,focusIndex].join('|');
    if(lastRender===signature&&rows._entries===model.state.entries)return;
    lastRender=signature;rows._entries=model.state.entries;
    $('.mini-spacer').style.height=range.total+'px';
    $('.mini-tail').style.height='0px';
    rows.style.top=(range.top+6)+'px';
    rows.classList.toggle('mini-grid',grid);
    thumbObserver?.disconnect();thumbQueue.length=0;
    const fragment=document.createDocumentFragment();
    for(let index=start;index<end;index++){
      const entry=visible[index],row=document.createElement('div');row.className='mini-row';if(grid)row.style.setProperty('--mini-media-height',(offsets[index+1]-offsets[index]-8)+'px');row.role='option';row.tabIndex=index===focusIndex?0:-1;row.dataset.index=index;row.dataset.key=entry.key;row.setAttribute('aria-selected',String(model.state.selected.has(entry.key)));row.setAttribute('aria-label',entry.displayName||entry.key);row.title=entry.displayName||entry.key;row.classList.toggle('mini-image',!!previewType(entry.key)?.startsWith('image/'));row.setAttribute('aria-posinset',index+1);row.setAttribute('aria-setsize',visible.length);
      const icon=document.createElement('span');icon.className='mini-icon';icon.textContent=entry.folder?'▰':previewType(entry.key)?.startsWith('image/')?'▧':'▤';icon.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.className='mini-name';name.textContent=entry.displayName||entry.key;name.title=name.textContent;
      const size=document.createElement('small');size.textContent=entry.folder?'Folder':Number.isFinite(Number(entry.size))?`${(Number(entry.size)/1024).toLocaleString(undefined,{maximumFractionDigits:1})} KB`:'File';
      row.append(icon,name,size);row.onclick=event=>{focusIndex=index;select(entry,event);};
      row.ondblclick=safe(()=>openEntry(entry));
      row.onkeydown=event=>{
        if(['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(event.key)){event.preventDefault();if(['ArrowDown','ArrowUp'].includes(event.key)&&browseImage(index,event))return;focusIndex=Math.max(0,Math.min(visible.length-1,event.key==='Home'?0:event.key==='End'?visible.length-1:event.key.startsWith('Page')?offsetRange(offsets,offsets[index]+(event.key==='PageDown'?1:-1)*list.clientHeight,0).first:index+(event.key==='ArrowDown'?1:-1)));list.scrollTop=Math.max(0,offsets[focusIndex]-list.clientHeight/2);select(visible[focusIndex],event);renderRows();rows.querySelector(`[data-index="${focusIndex}"]`)?.focus();}
        if(event.key===' '){event.preventDefault();select(entry,event);}
        if(event.key==='Enter'){event.preventDefault();safe(()=>openEntry(entry))();}
        if(event.key==='Delete'){event.preventDefault();button('delete').click();}
        if(event.key==='F2'){event.preventDefault();button('rename').click();}
        if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){event.preventDefault();showMenu(entry,row.getBoundingClientRect(),row);}
      };
      if(!entry.folder){row.draggable=true;row.ondragend=event=>{bridge.end(event);dragging=false;renderRows();};row.ondragstart=event=>{
        if(!model.state.selected.has(entry.key))select(entry);
        if(model.state.selected.size!==1){event.preventDefault();say('Drag one file at a time. Use Download for other destinations.');return;}
        dragging=bridge.start(event,{...model.state.source},{...entry,mime:entry.httpMetadata?.contentType||previewType(entry.key)||'application/octet-stream'});
      };}
      fragment.append(row);
    }

    rows.replaceChildren(fragment);
    for(const row of rows.children){const entry=visible[Number(row.dataset.index)];if(thumbs.has(entry.key))paintThumb(row,thumbs.get(entry.key));else if(!entry.folder&&previewType(entry.key)?.startsWith('image/')&&Number(entry.size)<=256*1024&&!thumbFailed.has(entry.key))thumbObserver?.observe(row);}
    if(focused!==null)(rows.querySelector(`[data-index="${focused}"]`)||list).focus({preventScroll:true});
  }
  // Chutey lazy queue: three requests, small original images only until the
  // provider exposes a thumbnail capability. At most 16 × 256 KiB URLs.
  const thumbs=new Map(),thumbFailed=new Set(),thumbQueue=[],thumbPending=new Set();let thumbActive=0,thumbEpoch=0;const thumbAbort=new Set();
  function paintThumb(row,url){const epoch=thumbEpoch,img=document.createElement('img');img.alt='';img.onload=()=>{if(epoch!==thumbEpoch||!row.isConnected)return;const ratio=img.naturalHeight/img.naturalWidth;if(Number.isFinite(ratio)&&ratio>0&&aspects.get(row.dataset.key)!==ratio){aspects.set(row.dataset.key,ratio);aspectRevision++;scheduleRows();}};img.src=url;row.querySelector('.mini-icon')?.replaceChildren(img);}
  async function pumpThumb(){
    if(thumbActive>=3||!thumbQueue.length)return;const node=thumbQueue.shift(),entry=model.state.entries.find(e=>e.key===node.dataset.key);
    const token=thumbEpoch+':'+entry?.key;if(!entry||!node.isConnected||thumbPending.has(token)){void pumpThumb();return;}
    const epoch=thumbEpoch,abort=new AbortController();thumbActive++;thumbPending.add(token);thumbAbort.add(abort);
    try{const data=await model.request('preview',{source:{...model.state.source},entry},{signal:abort.signal,previewMaxBytes:256*1024});
      if(epoch!==thumbEpoch){if(data.url)URL.revokeObjectURL(data.url);return;}
      thumbs.set(entry.key,data.url);while(thumbs.size>16){const key=thumbs.keys().next().value;URL.revokeObjectURL(thumbs.get(key));thumbs.delete(key);}
      for(const current of rows.querySelectorAll('.mini-row'))if(current.dataset.key===entry.key)paintThumb(current,data.url);
    }catch{if(epoch===thumbEpoch){thumbFailed.add(entry.key);if(thumbFailed.size>128)thumbFailed.delete(thumbFailed.values().next().value);}}
    finally{thumbActive--;thumbAbort.delete(abort);thumbPending.delete(token);void pumpThumb();}
  }
  const thumbObserver=globalThis.IntersectionObserver?new IntersectionObserver(entries=>{for(const item of entries)if(item.isIntersecting){thumbObserver.unobserve(item.target);thumbQueue.push(item.target);void pumpThumb();}},{root:list}):null;
  function clearThumbs(){aspects.clear();aspectRevision++;thumbEpoch++;thumbObserver?.disconnect();thumbQueue.length=0;for(const abort of thumbAbort)abort.abort();for(const url of thumbs.values())URL.revokeObjectURL(url);thumbs.clear();thumbFailed.clear();}
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
    dragging=false;closeSide();preview.close();clearThumbs();await bridge.cancel();selectedEntry=null;
    if(!options.append){list.scrollTop=0;focusIndex=0;}
    await model.navigate(source,options);persist();
  }
  function treeNode(label,id,load,source=null,parent=tree){
    const container=document.createElement('div'),branch=document.createElement('div'),expand=document.createElement('button'),item=document.createElement('button'),children=document.createElement('div');
    branch.className='mini-branch';expand.type='button';expand.textContent='›';expand.tabIndex=-1;expand.setAttribute('aria-label','Expand '+label);expand.setAttribute('aria-expanded','false');
    item.type='button';item.role='treeitem';item.tabIndex=0;item.className='mini-node';item.textContent=label;item.title=label;item.setAttribute('aria-expanded','false');item.setAttribute('aria-selected','false');if(source)item.dataset.source=identity(source);
    children.role='group';children.hidden=true;branch.append(expand,item);container.append(branch,children);parent.append(container);nodes.set(id,{item,children});let loaded=false,pending=false;
    const toggle=async(force)=>{
      const open=force??children.hidden;children.hidden=!open;item.setAttribute('aria-expanded',String(open));expand.textContent=open?'⌄':'›';expand.setAttribute('aria-expanded',String(open));expand.setAttribute('aria-label',(open?'Collapse ':'Expand ')+label);
      if(open)expansions.add(id);else expansions.delete(id);persist();
      if(!open||pending||loaded)return;pending=true;children.textContent='Loading…';item.setAttribute('aria-busy','true');
      try{await load(children);loaded=true;if(!children.childNodes.length)children.textContent=source?'No subfolders':'No authorized buckets';}
      catch{children.replaceChildren();const retry=document.createElement('button');retry.textContent='Unavailable · Retry';retry.onclick=safe(()=>{loaded=false;return toggle(true);});children.append(retry);}
      finally{pending=false;item.removeAttribute('aria-busy');}
    };
    nodes.get(id).toggle=toggle;
    expand.onclick=safe(()=>toggle());
    item.onclick=safe(()=>source?navigate(source):toggle());
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
    const ticket=++discovery;rootAbort?.abort();rootAbort=new AbortController();model.reset();closeSide();preview.close();clearThumbs();await bridge.cancel();tree.textContent='Checking connections…';nodes.clear();treeRestores=0;
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
  button('roots').onclick=safe(()=>{saved={};return discover();});
  function paintViewMode(){button('grid').setAttribute('aria-pressed',String(grid));button('grid').setAttribute('aria-label',grid?'Large Images; switch to Detailed':'Detailed; switch to Large Images');button('grid').textContent=grid?'Large Images':'Detailed';}
  button('grid').onclick=()=>{grid=!grid;paintViewMode();renderRows();persist();};
  button('back').onclick=safe(async()=>{closeSide();preview.close();clearThumbs();await bridge.cancel();selectedEntry=null;await model.travel(-1);persist();});
  button('forward').onclick=safe(async()=>{closeSide();preview.close();clearThumbs();await bridge.cancel();selectedEntry=null;await model.travel(1);persist();});
  button('up').onclick=safe(()=>navigate({...model.state.source,prefix:model.state.source.prefix.replace(/[^/]+\/$/,'')}));
  button('refresh').onclick=safe(async()=>{saved={source:model.state.source};model.invalidate();await discover();});
  button('more').onclick=safe(()=>navigate(model.state.source,{append:true,record:false}));
  button('close-preview').onclick=()=>{closeSide();renderRows();};button('download').onclick=safe(()=>download());
  button('rename').onclick=safe(async()=>{const source={...model.state.source},entry=one(),newName=await ask('Rename item',entry.displayName||entry.key.split('/').filter(Boolean).pop());if(newName)await mutate('rename',{entry,newName},source);});
  button('delete').onclick=safe(async()=>{const source={...model.state.source},entry=one();if(await ask('Delete the selected item from this cloud?','',true))await mutate('delete',{entries:[entry]},source);});
  button('folder').onclick=safe(async()=>{const source={...model.state.source},name=await ask('New folder name');if(name)await mutate('mkdir',{name},source);});
  for(const operation of ['copy','move'])button(operation).onclick=safe(()=>{clipboard={operation,source:{...model.state.source},entries:[{...one()}]};paintActions();say('Choose a destination folder, then Paste here. Conflicts keep both files.');});
  button('paste').onclick=safe(async()=>{if(!clipboard)throw Error('Copy or Move a file first.');const destination={...model.state.source},pending=clipboard;clipboard=null;paintActions();await model.request(pending.operation,{...pending,destination,conflict:'keep'});model.invalidate();if(model.state.source&&identity(model.state.source)===identity(destination))await navigate(destination,{fresh:true,record:false});saved={source:model.state.source};await discover();say('Transfer confirmed by the File API.');});
  list.addEventListener('scroll',()=>{if(host.hidden||!activeView)return;rememberedScroll=list.scrollTop;scheduleRows();persist();},{passive:true});$('.mini-filter input').oninput=()=>{closeSide();selectedEntry=null;model.state.selected.clear();focusIndex=0;list.scrollTop=0;renderRows();paintActions();};$('.mini-filter select').onchange=()=>{list.scrollTop=0;renderRows();};
  list.onkeydown=event=>{if(event.target===list&&(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')){event.preventDefault();showMenu(null,list.getBoundingClientRect(),list);return;}if(event.target===list&&visible.length&&['Enter','ArrowDown','Home','End','PageDown','PageUp'].includes(event.key)){event.preventDefault();focusIndex=event.key==='End'?visible.length-1:event.key==='Home'?0:offsetRange(offsets,list.scrollTop+(event.key==='PageDown'?list.clientHeight:event.key==='PageUp'?-list.clientHeight:0),0).first;list.scrollTop=offsets[focusIndex];renderRows();rows.querySelector(`[data-index="${focusIndex}"]`)?.focus({preventScroll:true});}};
  const contextMenu=document.createElement('div');contextMenu.className='mini-context';contextMenu.role='menu';contextMenu.hidden=true;host.append(contextMenu);
  function showMenu(entry,point,returnFocus){
    if(entry&&!model.state.selected.has(entry.key))select(entry);contextMenu.replaceChildren();contextMenu.hidden=false;
    returnFocus=rows.querySelector(`[data-index="${visible.indexOf(entry)}"]`)||list;
    contextMenu.style.left=Math.max(4,Math.min(point.x??point.left,document.documentElement.clientWidth-180))+'px';
    contextMenu.style.top=Math.max(4,Math.min(point.y??point.top,(globalThis.innerHeight||600)-270))+'px';
    if(entry&&!entry.folder){for(const [label,run] of [['Preview',()=>side(entry)],['Open in Window',()=>preview.open(entry)]]){const item=document.createElement('button');item.type='button';item.role='menuitem';item.textContent=label;item.disabled=!previewType(entry.key);item.onclick=safe(()=>{contextMenu.hidden=true;return run();});contextMenu.append(item);}}
    for(const action of ['download','rename','delete','copy','move','paste','folder']){
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
  const rememberBeforeRoute=event=>{if(!host.hidden&&event.target.closest('nav[aria-label="Shelf"]')){rememberedScroll=list.scrollTop;rememberedRailScroll=$('.mini-rail').scrollTop;}};
  document.addEventListener('click',rememberBeforeRoute,true);
  host.addEventListener('contextmenu',event=>{const row=event.target.closest('.mini-row');if(row){event.preventDefault();showMenu(visible[Number(row.dataset.index)],{x:event.clientX,y:event.clientY},row);}else if(list.contains(event.target)){event.preventDefault();showMenu(null,{x:event.clientX,y:event.clientY},list);}});
  host.addEventListener('keydown',event=>{if(event.key==='Escape'){contextMenu.hidden=true;closeSide();renderRows();}if(!event.target.closest('input,select,textarea')&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){event.preventDefault();for(const entry of visible)model.state.selected.add(entry.key);renderRows();paintActions();}});
  host.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('application/x-redown-chute-v1'))event.dataTransfer.dropEffect='none';});
  async function setActive(value){if(value===activeView&&initialized){if(initialization)await initialization;return;}activeView=value;if(!value){historyAbort?.abort();dragging=false;contextMenu.hidden=true;closeSide();preview.close();clearThumbs();await bridge.suspend();return;}
    setFolderWidth(50);
    if(initialized){const scroll=rememberedScroll;renderRows();list.scrollTop=scroll;$('.mini-rail').scrollTop=rememberedRailScroll;renderRows();return;}initialized=true;
    initialization=(async()=>{
    try{saved=(await storage.get('shelfExplorerV1')).shelfExplorerV1||{};setFolderWidth(50);grid=saved.grid!==false;paintViewMode();for(const id of Array.isArray(saved.expanded)?saved.expanded.slice(0,64):[])if(typeof id==='string'&&id.length<2048)expansions.add(id);}catch{}
    await discover();
    })();await initialization;
  }
  let historyEpoch=0,historyAbort=null,removeHistoryReceiver=null,initialization=null;
  async function revealHistory(target){
    const ticket=++historyEpoch;historyAbort?.abort();
    const abort=new AbortController();historyAbort=abort;
    const timer=setTimeout(()=>abort.abort(Error('Saved-file navigation timed out. Try GO TO again.')),90000);
    const check=()=>{abort.signal.throwIfAborted();if(ticket!==historyEpoch)throw Error('Navigation superseded.');};
    try{
      await setActive(true);check();if(initialization)await initialization;check();
      const {accounts=[]}=await model.request('accounts',{}, {signal:abort.signal});check();
      if(!accounts.some(a=>a.id===target.accountId))throw Error('The recorded cloud account is unavailable. Reconnect in REMOTES.');
      const {buckets=[]}=await model.request('buckets',{accountId:target.accountId},{signal:abort.signal});check();
      if(!buckets.some(b=>b.name===target.bucketName))throw Error('The recorded bucket is unavailable.');
      const source={accountId:target.accountId,bucketName:target.bucketName,prefix:target.prefix};
      await navigate(source);check();
      if(model.state.phase!=='ready'||identity(model.state.source)!==identity(source))throw Error('Could not load the recorded folder.');
      const item=await resolveHistoryTarget(api,target,{signal:abort.signal});check();
      if(identity(model.state.source)!==identity(source))throw Error('Location changed. Use GO TO again.');
      if(!model.state.entries.some(e=>e.key===item.key))model.state.entries=[...model.state.entries,item];
      $('.mini-filter input').value='';sortedEntries=null;renderRows();
      focusIndex=visible.findIndex(e=>e.key===item.key);model.state.selected.clear();model.state.selected.add(item.key);
      lastRender='';list.scrollTop=offsets[focusIndex];renderRows();
      const row=[...rows.children].find(n=>n.dataset.key===item.key);row?.focus({preventScroll:true});
      say('Exact saved file verified and selected.');
      // Expand only the authorized account/bucket/prefix path, not every cloud.
      const account=nodes.get(JSON.stringify(['r2',target.accountId]));
      await account?.toggle(true);check();
      await nodes.get(identity({...source,prefix:''}))?.toggle(true);check();
      let prefix='';for(const part of target.prefix.split('/').filter(Boolean)){prefix+=part+'/';await nodes.get(identity({...source,prefix}))?.toggle(true);check();}
    }finally{clearTimeout(timer);if(ticket===historyEpoch)historyAbort=null;}
  }
  if(globalThis.RedownHistoryNavigation?.receiveShelf)void globalThis.RedownHistoryNavigation.receiveShelf(revealHistory).then(remove=>removeHistoryReceiver=remove).catch(()=>say('History navigation is unavailable. Try Dashboard in Settings.'));
  const changed=(changes,area)=>{
    if(area==='session'&&changes.redownChuteClearedV1)void bridge.cancel();
    if(area==='local'&&changes.shelfKeepPreparedV1&&changes.shelfKeepPreparedV1.newValue!==true)void bridge.cancel();
    if(area==='session'&&changes.redownChuteReceipt){const receipt=changes.redownChuteReceipt.newValue;if(receipt?.id===bridge.getHandle()?.id){$('.mini-drag-status').textContent=receipt.state==='drop_dispatched'?'File dispatched. Check the destination: acceptance and upload completion are unverified.':'File handoff failed. Try dragging again or use Download and the destination file picker.';}}
    if(area==='local'&&changes.cloudflareAuth){clipboard=null;saved={};expansions.clear();void discover();}
  };
  chrome.storage.onChanged.addListener(changed);
  const view=()=>{void setActive(!host.hidden).catch(()=>say('File Explorer unavailable. Refresh or reconnect in Remotes.'));};
  globalThis.addEventListener('redown:shelf-route',view);globalThis.addEventListener('pagehide',()=>{closeSide();void bridge.dispose();});view();
  return {model,bridge,setActive,discover,dispose(){historyAbort?.abort();removeHistoryReceiver?.();clearTimeout(saveTimer);document.removeEventListener('pointerdown',closeContext);document.removeEventListener('click',rememberBeforeRoute,true);chrome.storage.onChanged.removeListener?.(changed);globalThis.removeEventListener('redown:shelf-route',view);resizeObserver?.disconnect();clearThumbs();closeSide();preview.close();model.reset();void bridge.dispose();}};
}
if(globalThis.document?.getElementById('explorer-view'))mountExplorer({host:document.getElementById('explorer-view')});
