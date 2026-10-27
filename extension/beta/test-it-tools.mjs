// Presentation only: the existing Test It button handlers own all actions and state.
export function installTestItTools(doc){
  const button=doc.getElementById('test-it-tools-button'),menu=doc.getElementById('test-it-tools-menu'),wrap=button.parentElement;
  const items=()=>[...menu.querySelectorAll('button:not(:disabled)')];
  function close(restore=false){menu.hidden=true;button.setAttribute('aria-expanded','false');if(restore)button.focus();}
  function open(last=false){menu.hidden=false;button.setAttribute('aria-expanded','true');const list=items();(last?list.at(-1):list[0])?.focus();}
  button.addEventListener('click',()=>menu.hidden?open():close(true));
  button.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();open(event.key==='ArrowUp');}});
  menu.addEventListener('click',event=>{if(event.target.closest('button'))close(menu.contains(doc.activeElement));});
  wrap.addEventListener('keydown',event=>{
    if(menu.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
    if(event.key==='Tab'){close();return;}
    const list=items(),index=list.indexOf(doc.activeElement);let next;
    if(event.key==='ArrowDown')next=(index+1)%list.length;
    if(event.key==='ArrowUp')next=(index-1+list.length)%list.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=list.length-1;
    if(next!==undefined){event.preventDefault();event.stopPropagation();list[next]?.focus();}
  });
  doc.addEventListener('click',event=>{if(!wrap.contains(event.target))close();});
  doc.addEventListener('focusin',event=>{if(!wrap.contains(event.target))close();});
}
