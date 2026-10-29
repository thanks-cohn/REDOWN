/* Presentation-only Cloudflare account picker. The existing #accounts select
   remains the sole account state and continues to emit its original change
   event; no duplicate account discovery, storage or API calls. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const shell=$('account-chooser'),native=$('accounts'),trigger=$('account-picker-trigger');
  const menu=$('account-picker-menu'),value=$('account-picker-value');
  if(!shell||!native||!trigger||!menu||!value)return;
  let options=[],activeIndex=-1,search='',lastType=0;

  const open=()=>!menu.hidden;
  function close(refocus=false){
    if(!open())return;
    menu.hidden=true;
    delete shell.dataset.menuOpen;
    trigger.setAttribute('aria-expanded','false');
    menu.removeAttribute('aria-activedescendant');
    if(refocus&&!trigger.hidden&&!trigger.disabled)trigger.focus();
  }
  function sync(){
    const ready=shell.dataset.state==='ready'&&native.options.length>0;
    const selected=Array.from(native.options).find(o=>o.value===native.value);
    const label=selected?.textContent?.trim()||'Choose account';
    if(value.textContent!==label)value.textContent=label;
    if(trigger.title!==label)trigger.title=label;
    if(trigger.hidden===ready)trigger.hidden=!ready;
    const disabled=!ready||native.disabled;
    if(trigger.disabled!==disabled)trigger.disabled=disabled;
    // Keep the real selection accessible to existing code, but never place
    // its invisible native control in the keyboard tab sequence.
    native.tabIndex=-1;
    native.setAttribute('aria-hidden','true');
    if(disabled)close();
  }
  function focusItem(index){
    if(!options.length)return;
    activeIndex=(index+options.length)%options.length;
    const item=menu.children[activeIndex];
    item?.focus();
    if(item)menu.setAttribute('aria-activedescendant',item.id);
  }
  function choose(index){
    const target=options[index];
    if(!target)return;
    close();
    if(native.value!==target.value){
      native.value=target.value;
      native.dispatchEvent(new Event('change',{bubbles:true}));
    }
    sync();
    if(!trigger.hidden&&!trigger.disabled)trigger.focus();
  }
  function show(){
    sync();
    if(trigger.disabled)return;
    options=Array.from(native.options).filter(o=>o.value);
    if(!options.length)return;
    activeIndex=Math.max(0,options.findIndex(o=>o.value===native.value));
    const rows=options.map((option,index)=>{
      const row=document.createElement('div');
      row.id='account-picker-option-'+index;
      row.className='account-picker-option';
      row.setAttribute('role','option');
      row.setAttribute('aria-selected',String(option.value===native.value));
      row.tabIndex=-1;
      const label=document.createElement('span');
      label.className='account-picker-option-name';
      label.textContent=option.textContent;
      label.title=option.textContent;
      const check=document.createElement('span');
      check.className='account-picker-check';
      check.setAttribute('aria-hidden','true');
      check.textContent='✓';
      row.append(label,check);
      row.addEventListener('click',()=>choose(index));
      return row;
    });
    menu.replaceChildren(...rows);
    menu.hidden=false;
    shell.dataset.menuOpen='true';
    trigger.setAttribute('aria-expanded','true');
    search='';
    focusItem(activeIndex);
  }
  trigger.addEventListener('click',()=>{if(open())close(true);else show();});
  trigger.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key))return;
    event.preventDefault();
    show();
    if(open()&&event.key==='End')focusItem(options.length-1);
    else if(open()&&event.key==='Home')focusItem(0);
    else if(open()&&event.key==='ArrowUp')focusItem(Math.max(0,activeIndex-1));
  });
  menu.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close(true);return;}
    if(event.key==='Tab'){close();return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();
      focusItem(event.key==='Home'?0:event.key==='End'?options.length-1:
        activeIndex+(event.key==='ArrowDown'?1:-1));
      return;
    }
    if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(activeIndex);return;}
    if(event.key.length===1&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
      const now=Date.now();
      search=(now-lastType<650?search:'')+event.key.toLocaleLowerCase();
      lastType=now;
      const next=options.findIndex(o=>o.textContent.toLocaleLowerCase().startsWith(search));
      if(next>=0)focusItem(next);
    }
  });
  document.addEventListener('pointerdown',event=>{
    if(open()&&!shell.contains(event.target))close();
  });
  document.addEventListener('focusin',event=>{
    if(open()&&!shell.contains(event.target))close();
  });
  window.addEventListener('pagehide',()=>close());

  globalThis.RedownAccountPicker={sync,close};
  sync();
})();
