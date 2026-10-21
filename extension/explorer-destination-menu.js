/* Local UI only. Each submenu requests one directory page when opened. */
(() => {
  function create({document,loadPage,onChoose,onError,onDismiss=()=>{},viewport=()=>({width:innerWidth,height:innerHeight})}) {
    const panels=[];let hoverTimer;
    const closeFrom=depth=>{
      clearTimeout(hoverTimer);
      for(const panel of panels.splice(depth)){panel.owner.setAttribute('aria-expanded','false');panel.element.remove();}
    };
    function keyboard(menu,depth,event){
      // Menus own keys; do not navigate the underlying Explorer selection.
      event.stopPropagation();
      const buttons=[...menu.querySelectorAll(':scope > button:not(:disabled)')];
      const current=buttons.indexOf(document.activeElement);
      let next;
      if(event.key==='ArrowDown')next=(current+1)%buttons.length;
      if(event.key==='ArrowUp')next=(current-1+buttons.length)%buttons.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=buttons.length-1;
      if(next!==undefined){event.preventDefault();buttons[next]?.focus();}
      if(event.key==='ArrowLeft'||event.key==='Escape'){
        event.preventDefault();
        const panel=panels[depth-1];
        if(panel){closeFrom(depth-1);panel.owner.focus();}
        else {closeFrom(0);menu.hidden=true;onDismiss();}
      }
    }
    function position(panel,owner){
      const rect=owner.getBoundingClientRect(),{width,height}=viewport();
      panel.style.left=`${Math.max(8,Math.min(rect.right-2,width-panel.offsetWidth-8))}px`;
      if(rect.right+panel.offsetWidth>width)panel.style.left=`${Math.max(8,rect.left-panel.offsetWidth+2)}px`;
      panel.style.top=`${Math.max(8,Math.min(rect.top,height-panel.offsetHeight-8))}px`;
    }
    function branch(menu,label,load,depth=0,enabled=true){
      const button=document.createElement('button');button.type='button';button.className='menu-item menu-branch';button.role='menuitem';button.textContent=label+' ›';button.title=label;button.disabled=!enabled;
      button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
      async function open(focus=false){
        if(button.disabled)return;
        clearTimeout(hoverTimer);
        if(panels[depth]?.owner===button){if(focus)panels[depth].element.querySelector('button:not(:disabled)')?.focus();return;}
        closeFrom(depth);
        const element=document.createElement('div');element.className='context-menu explorer-submenu';element.role='menu';element.setAttribute('aria-label',label);
        const panel={owner:button,element,seen:new Set()};panels.push(panel);button.setAttribute('aria-expanded','true');document.body.append(element);
        element.addEventListener('keydown',event=>keyboard(element,depth+1,event));
        element.addEventListener('scroll',()=>closeFrom(depth+1));
        const status=document.createElement('div');status.className='menu-label';status.role='status';status.textContent='Loading…';element.append(status);position(element,button);
        try{
          const entries=await load();if(panels[depth]!==panel)return;
          element.replaceChildren();render(element,entries,depth+1,panel);position(element,button);
          if(focus)element.querySelector('button:not(:disabled)')?.focus();
        }catch(error){
          if(panels[depth]!==panel)return;
          status.textContent='Could not load locations.';element.replaceChildren(status);
          const retry=document.createElement('button');retry.className='menu-item';retry.textContent='Retry';retry.onclick=()=>{closeFrom(depth);return open(true);};element.append(retry);if(focus)retry.focus();
        }
      }
      button.onmouseenter=()=>{clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>void open(),160);};
      button.onmouseleave=()=>clearTimeout(hoverTimer);
      button.onclick=event=>{event?.stopPropagation();return open(true);};
      button.onkeydown=event=>{if(event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();void open(true);}};
      menu.append(button);return button;
    }
    function render(menu,entries,depth,panel){
      for(const entry of entries){
        if(entry.key){if(panel.seen.has(entry.key))continue;panel.seen.add(entry.key);}
        if(entry.children){branch(menu,entry.label,entry.children,depth,entry.enabled!==false);continue;}
        const button=document.createElement('button');button.className='menu-item';button.type='button';button.role='menuitem';button.textContent=entry.label;button.title=entry.label;button.disabled=entry.enabled===false;
        button.onmouseenter=()=>closeFrom(depth);
        button.onclick=async event=>{
          event.stopPropagation();
          if(entry.more){
            button.disabled=true;button.textContent='Loading…';
            try{const extra=await entry.more();if(panels[depth-1]!==panel)return;button.remove();render(menu,extra,depth,panel);position(menu,panel.owner);menu.querySelector('button:not(:disabled):last-child')?.focus();}
            catch{button.disabled=false;button.textContent='Could not load more — retry';}
            return;
          }
          closeFrom(0);const root=document.getElementById('explorer-menu');if(root)root.hidden=true;
          try{await entry.choose?.();}catch(error){onError(error);}
        };
        menu.append(button);
      }
    }
    function attach(root,{operation,accounts,buckets,source,items}){
      const verb=operation==='move'?'Move':'Copy';
      const safeSubtree=destination=>destination.accountId!==source.accountId||destination.bucketName!==source.bucketName||!items.some(i=>i.folder&&destination.prefix.startsWith(i.key.replace(/\/$/,'')+'/'));
      const allowed=destination=>{
        if(destination.accountId!==source.accountId||destination.bucketName!==source.bucketName)return true;
        if(!items.some(i=>i.archiveEntry)&&destination.prefix===source.prefix)return false;
        return safeSubtree(destination);
      };
      function children(destination,cursor=''){
        return async()=>{
          const page=await loadPage({...destination,cursor});
          const entries=cursor?[]:[{label:`${verb} here`,enabled:allowed(destination),choose:()=>onChoose(operation,destination,items,source)}];
          for(const folder of page.folders){const target={...destination,prefix:folder.prefix};entries.push({key:folder.prefix,label:folder.name,children:children(target),enabled:safeSubtree(target)});}
          if(page.cursor)entries.push({label:'More folders…',more:children(destination,page.cursor)});
          if(!page.folders.length&&!page.cursor)entries.push({label:cursor?'No more folders':'No subfolders',enabled:false});
          return entries;
        };
      }
      branch(root,`${verb} to`,async()=>{const entries=accounts.flatMap(account=>(buckets.get(account.id)||[]).map(bucket=>{
        const destination={accountId:account.id,accountName:account.name||'',bucketName:bucket.name,prefix:''};
        return {label:bucket.name+(accounts.length>1?` · ${account.name||account.id}`:''),children:children(destination)};
      }));return entries.length?entries:[{label:'No buckets loaded — refresh Explorer',enabled:false}];},0,items.length>0);
      if(!root.dataset.destinationKeyboard){root.dataset.destinationKeyboard='true';root.addEventListener('keydown',event=>keyboard(root,0,event));root.addEventListener('scroll',()=>closeFrom(0));root.addEventListener('mouseover',event=>{const button=event.target.closest('button');if(button&&!button.hasAttribute('aria-haspopup'))closeFrom(0);});}
    }
    return {attach,close:()=>closeFrom(0)};
  }
  globalThis.RedownDestinationMenus={create};
})();
