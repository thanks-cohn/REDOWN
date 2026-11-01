// Modal surfaces own every request and URL they create. Side readers never lend resources.
export function renderPreview(document,{type,url,text,title}){
  const tag=type.startsWith('text/')?'pre':type.startsWith('image/')?'img':type.startsWith('video/')?'video':type.startsWith('audio/')?'audio':'iframe';
  const node=document.createElement(tag);
  if(tag==='pre')node.textContent=text;
  else node.src=url;
  if(tag==='img')node.alt=title;
  if(tag==='iframe'){node.title=title;node.referrerPolicy='no-referrer';}
  if(tag==='video'||tag==='audio'){node.controls=true;node.preload='metadata';}
  return node;
}
export function createWindowPreview({document,dialog,request,previewType,getContext,getItems,pauseSide,onSelection=()=>{},onEvent=()=>{},onDownload=null,label="Window Preview",urls=URL}){
  const viewer=document.createElement('div');viewer.className='window-viewer';
  viewer.innerHTML='<div class="preview-header"><h2></h2><div class="preview-controls"><button type="button" data-lightbox>Lightbox</button><button type="button" data-close aria-label="Close Window Preview">✕</button></div></div><div class="window-content" aria-live="polite"></div><p class="window-info"></p><div class="preview-footer"><button data-previous>← Previous</button><button data-next>Next →</button></div>';
  dialog.append(viewer);dialog.removeAttribute('aria-labelledby');dialog.setAttribute('aria-label',label);
  const content=viewer.querySelector('.window-content'),title=viewer.querySelector('h2'),light=viewer.querySelector('[data-lightbox]');
  const info=viewer.querySelector('.window-info');
  let epoch=0,controller=null,url='',item=null,source=null,returnFocus=null,immersive=false,onlyLightbox=false,collection=null,readEntry=null;
  function failure(message){content.textContent=message;light.disabled=true;light.hidden=true;if(onDownload){const button=document.createElement('button');button.textContent='Download';button.onclick=()=>onDownload(item,source);content.append(button);}}
  function clear(){++epoch;controller?.abort();controller=null;for(const media of content.querySelectorAll('video,audio')){media.pause();media.removeAttribute('src');media.load();}content.replaceChildren();if(url)urls.revokeObjectURL(url);url='';}
  function finish(){
    const wasImmersive=immersive;clear();dialog.classList.remove('window-lightbox');immersive=false;item=null;
    const focus=returnFocus;returnFocus=null;focus?.focus?.({preventScroll:true});
    if(wasImmersive)onEvent('lightbox-change',{open:false,key:'Escape'});
  }
  function close(){if(dialog.open)dialog.close();finish();}
  function exitTop(){if(immersive&&!onlyLightbox){immersive=false;dialog.classList.remove('window-lightbox');light.focus();onEvent('lightbox-change',{open:false,key:'Escape'});}else close();}
  async function open(entry,{lightbox=false,context=getContext(),read=null,immersiveView=false,navigation={},entries=null,readItem=null}={}){
    if(!context||!previewType(entry.key))return;
    viewer.hidden=false;
    if(!dialog.open)returnFocus=document.activeElement;
    clear();item={...entry};source={...context};collection=entries;readEntry=readItem;onlyLightbox=lightbox;immersive=lightbox||immersiveView;
    pauseSide();title.textContent=entry.displayName||entry.key;light.disabled=true;
    dialog.classList.toggle('window-lightbox',immersive);
    if(!dialog.open)dialog.showModal();dialog.focus();content.textContent='Loading preview…';info.textContent='';
    const ticket=epoch,abort=new AbortController();controller=abort;let pending='';
    try{
      const result=await (read?read(abort.signal):readItem?readItem(entry,abort.signal):request('preview',{source,entry},{signal:abort.signal}));pending=result.data.url;
      if(ticket!==epoch||abort.signal.aborted)return;
      const {type}=result.data;
      const text=type.startsWith('text/')?await (await fetch(pending,{signal:abort.signal})).text():undefined;
      if(ticket!==epoch||abort.signal.aborted)return;
      if(lightbox&&!type.startsWith('image/')){close();return;}
      const node=renderPreview(document,{type,url:pending,text,title:title.textContent});url=pending;pending='';
      node.addEventListener('error',()=>{if(ticket===epoch){failure('This file could not be displayed. The content may be damaged or unsupported by your browser.');}},{once:true});
      content.replaceChildren(node);light.disabled=!type.startsWith('image/');light.hidden=light.disabled;info.textContent=type+(result.data.truncated?' · Text preview truncated at '+result.data.size+' bytes':'');
      let announced=false;const announce=()=>{if(announced||ticket!==epoch||!node.isConnected||node.tagName==='IMG'&&(!node.complete||!node.naturalWidth))return;announced=true;onEvent('preview-open',{...navigation,currentKey:entry.key,mode:'window',rendered:true});};
      node.addEventListener('load',announce,{once:true});announce();
    }catch(error){if(ticket===epoch&&!abort.signal.aborted)failure(error.message||'Preview failed.');}
    finally{if(pending)urls.revokeObjectURL(pending);if(ticket===epoch)controller=null;}
  }
  function adjacent(direction,key){const entries=(collection||getItems()).filter(e=>!e.folder&&(immersive?(previewType(e.key)||'').startsWith('image/'):previewType(e.key)));const index=entries.findIndex(e=>e.key===item?.key),next=entries[index+direction];if(next){const previousKey=item.key;onSelection(next);void open(next,{lightbox:onlyLightbox,immersiveView:immersive,context:source,entries:collection,readItem:readEntry,navigation:{previousKey,direction,invocation:key?'keyboard':'button',key}});}}
  viewer.querySelector('[data-close]').onclick=close;
  light.onclick=()=>{if(!light.disabled){immersive=true;dialog.classList.add('window-lightbox');dialog.focus();onEvent('lightbox-change',{open:true});}};
  viewer.querySelector('[data-previous]').onclick=()=>adjacent(-1);viewer.querySelector('[data-next]').onclick=()=>adjacent(1);
  dialog.addEventListener('cancel',event=>{event.preventDefault();exitTop();});
  dialog.addEventListener('close',()=>{if(!dialog.open)finish();});
  dialog.addEventListener('click',event=>{if(event.target===dialog||immersive&&event.target===content)exitTop();});
  document.addEventListener('keydown',event=>{if(viewer.hidden||!dialog.open||[...document.querySelectorAll('dialog[open]')].at(-1)!==dialog)return;if(event.target.closest?.('.guide-card:not(.test-it-card)'))return;if(event.key!=='Escape'&&event.target.closest?.('.guide-card'))return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();exitTop();}else if(['ArrowLeft','ArrowRight'].includes(event.key)&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.target.closest?.('input,textarea,select,video,audio,[contenteditable], [role=slider], [role=spinbutton]')){event.preventDefault();event.stopImmediatePropagation();adjacent(event.key==='ArrowRight'?1:-1,event.key);}else if(['ArrowUp','ArrowDown'].includes(event.key)&&content.querySelector('pre,iframe')){event.preventDefault();event.stopImmediatePropagation();const node=content.querySelector('pre')||content;node.scrollTop+=(event.key==='ArrowDown'?1:-1)*Math.max(170,node.clientHeight*.75);}else if(!event.target.closest?.('.guide-card'))event.stopImmediatePropagation();},true);
  return {open,close,getState:()=>({open:dialog.open,key:item?.key||null,lightbox:immersive})};
}
