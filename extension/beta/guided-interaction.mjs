// Small presentation/navigation primitive. Signals indicate GUI actions, not test evidence.
export function createGuide({document:doc,steps,onFinish=()=>{},onExit=()=>{},onStep=()=>{},onSkip=()=>{},onRetry=null,startIndex=0,allowBack=true,autoAdvance=false,draggable=false}){
  const win=doc.defaultView;let index=0,card=null,highlight=null,previousFocus=null,observer=null,frame=0,completed=false;
  let manualPosition=null,drag=null,resizing=null,preferredSize=null;
  const modalOrder=[];
  function activeModal(){return [...modalOrder].reverse().find(modal=>modal.open)||doc.activeElement?.closest?.('dialog[open]')||[...doc.querySelectorAll('dialog[open]')].at(-1);}
  function modalOpened(event){const modal=event.detail?.modal;if(!modal?.open)return;const old=modalOrder.indexOf(modal);if(old>=0)modalOrder.splice(old,1);modalOrder.push(modal);position();}
  function modalClosed(){position();}
  if(draggable)try{const saved=JSON.parse(win.localStorage.getItem('redown-test-it-size'));if(Number.isFinite(saved?.width)&&Number.isFinite(saved?.height))preferredSize=saved;}catch{}
  const $=selector=>card.querySelector(selector);
  function clearHighlight(){highlight?.classList.remove('guide-highlight');highlight=null;}
  function position(){
    frame=0;if(!card)return;
    const modal=activeModal(),host=modal||doc.body;
    if(card.parentElement!==host)host.append(card);
    clearHighlight();const selector=typeof steps[index].target==='function'?steps[index].target():steps[index].target;const target=doc.querySelector(selector);
    if(target&&(!modal||modal.contains(target)))highlight=target;
    highlight?.classList.add('guide-highlight');
    const rect=(highlight||modal)?.getBoundingClientRect(),gap=12,margin=10;
    const width=win.innerWidth,height=win.innerHeight;
    card.style.maxHeight=Math.max(1,height-margin*2)+'px';
    if(draggable){card.style.width=Math.min(Math.max(320,preferredSize?.width||360),Math.max(1,width-margin*2))+'px';card.style.height=preferredSize?Math.min(Math.max(240,preferredSize.height),Math.max(1,height-margin*2))+'px':'';}
    const box=card.getBoundingClientRect(),cw=box.width||Math.min(340,width-20),ch=box.height||260;
    // Prefer a side with room; fall back above/below. Underlying controls remain clickable.
    let left=width-cw-margin,top=height-ch-margin;
    if(rect){
      if(rect.right+gap+cw<=width-margin){left=rect.right+gap;top=rect.top;}
      else if(rect.left-gap-cw>=margin){left=rect.left-gap-cw;top=rect.top;}
      else if(rect.bottom+gap+ch<=height-margin){left=rect.left;top=rect.bottom+gap;}
      else if(rect.top-gap-ch>=margin){left=rect.left;top=rect.top-gap-ch;}
      else {
        const corners=[[margin,margin],[width-cw-margin,margin],[margin,height-ch-margin],[width-cw-margin,height-ch-margin]];
        const overlap=([x,y])=>Math.max(0,Math.min(x+cw,rect.right+gap)-Math.max(x,rect.left-gap))*Math.max(0,Math.min(y+ch,rect.bottom+gap)-Math.max(y,rect.top-gap));
        [left,top]=corners.sort((a,b)=>overlap(a)-overlap(b))[0];
      }
    }
    if(draggable&&!manualPosition){
      const tools=doc.querySelector('.test-it-tools-wrap')?.getBoundingClientRect();
      if(tools&&left+cw>tools.left-gap&&top+ch>tools.top-gap)top=tools.top-ch-gap;
    }
    if(manualPosition){left=manualPosition.left;top=manualPosition.top;}
    if(!draggable&&rect&&selector?.startsWith('#preview-')&&left<rect.right+gap&&left+cw>rect.left-gap&&top<rect.bottom+gap&&top+ch>rect.top-gap){top=rect.bottom+gap;if(top+ch>height-margin){top=margin;card.style.maxHeight=Math.max(80,rect.top-gap-margin)+'px';}}
    const menu=draggable&&doc.querySelector('#test-it-tools-menu:not([hidden])')?.getBoundingClientRect();
    if(menu&&left+cw>menu.left-gap&&left<menu.right+gap&&top+ch>menu.top-gap&&top<menu.bottom+gap){
      if(menu.top-ch-gap>=margin)top=menu.top-ch-gap;
      else if(menu.left-cw-gap>=margin)left=menu.left-cw-gap;
      else top=margin;
    }
    card.style.left=Math.max(margin,Math.min(left,width-cw-margin))+'px';
    card.style.top=Math.max(margin,Math.min(top,height-ch-margin))+'px';
    if(manualPosition)manualPosition={left:parseFloat(card.style.left),top:parseFloat(card.style.top)};
  }
  function placeManual(width,height){
    card.style.left=Math.max(10,Math.min(manualPosition.left,win.innerWidth-width-10))+'px';
    card.style.top=Math.max(10,Math.min(manualPosition.top,win.innerHeight-height-10))+'px';
    manualPosition={left:parseFloat(card.style.left),top:parseFloat(card.style.top)};
  }
  function installGrip(){
    const grip=doc.createElement('button');grip.type='button';grip.className='guide-grip';
    grip.setAttribute('aria-label','Move Test It panel');grip.title='Drag to move; arrow keys move 10 pixels, Shift + arrow moves 1 pixel';
    grip.innerHTML='<span aria-hidden="true">⠿</span>';card.prepend(grip);card.classList.add('test-it-card');
    grip.addEventListener('pointerdown',event=>{
      if(event.button!==0||drag||resizing)return;event.preventDefault();event.stopPropagation();
      const rect=card.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,width:rect.width,height:rect.height};
      grip.focus({preventScroll:true});grip.setPointerCapture(event.pointerId);
    });
    grip.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;event.preventDefault();event.stopPropagation();
      manualPosition={left:drag.left+event.clientX-drag.x,top:drag.top+event.clientY-drag.y};placeManual(drag.width,drag.height);
    });
    const release=event=>{if(!drag||event.pointerId!==drag.id)return;event.stopPropagation();drag=null;};
    grip.addEventListener('pointerup',release);grip.addEventListener('pointercancel',release);grip.addEventListener('lostpointercapture',release);
    grip.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
    grip.addEventListener('keydown',event=>{
      const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta)return;
      event.preventDefault();event.stopPropagation();const rect=card.getBoundingClientRect(),step=event.shiftKey?1:10;
      manualPosition={left:rect.left+delta[0]*step,top:rect.top+delta[1]*step};position();
    });
  }
  function installResize(){
    for(const corner of ['nw','ne','sw','se']){
      const handle=doc.createElement('span');handle.className='guide-resize guide-resize-'+corner;handle.dataset.resizeCorner=corner;handle.setAttribute('aria-hidden','true');card.append(handle);
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0||drag||resizing)return;event.preventDefault();event.stopPropagation();
        const box=card.getBoundingClientRect();resizing={id:event.pointerId,x:event.clientX,y:event.clientY,left:box.left,top:box.top,right:box.right,bottom:box.bottom,corner};handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('pointermove',event=>{
        if(!resizing||event.pointerId!==resizing.id)return;event.preventDefault();event.stopPropagation();
        const r=resizing,dx=event.clientX-r.x,dy=event.clientY-r.y,west=corner.includes('w'),north=corner.includes('n');
        const minW=Math.min(320,win.innerWidth-20),minH=Math.min(240,win.innerHeight-20);
        const left=west?Math.max(10,Math.min(r.left+dx,r.right-minW)):r.left;
        const top=north?Math.max(10,Math.min(r.top+dy,r.bottom-minH)):r.top;
        const right=west?r.right:Math.min(win.innerWidth-10,Math.max(r.right+dx,r.left+minW));
        const bottom=north?r.bottom:Math.min(win.innerHeight-10,Math.max(r.bottom+dy,r.top+minH));
        preferredSize={width:right-left,height:bottom-top};manualPosition={left,top};card.style.width=preferredSize.width+'px';card.style.height=preferredSize.height+'px';placeManual(preferredSize.width,preferredSize.height);
      });
      const release=event=>{if(!resizing||event.pointerId!==resizing.id)return;event.stopPropagation();resizing=null;try{win.localStorage.setItem('redown-test-it-size',JSON.stringify(preferredSize));}catch{}};
      for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,release);
      handle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
    }
  }
  function schedule(){if(card&&!frame)frame=win.requestAnimationFrame(position);}
  function stop(finished=false){
    if(!card)return;const ownedFocus=card.contains(doc.activeElement);
    doc.removeEventListener('redown:modal-open',modalOpened);doc.removeEventListener('close',modalClosed,true);
    win.removeEventListener('resize',schedule);doc.removeEventListener('scroll',schedule,true);doc.removeEventListener('redown:gui',signal);doc.removeEventListener('keydown',keydown,true);win.removeEventListener('pagehide',exit);
    observer?.disconnect();observer=null;if(frame)win.cancelAnimationFrame(frame);frame=0;
    drag=null;resizing=null;clearHighlight();card.remove();card=null;
    if(ownedFocus){const modal=activeModal();const target=previousFocus?.isConnected&&!previousFocus.closest('[hidden]')&&(!modal||modal.contains(previousFocus))?previousFocus:modal||doc.querySelector('#explorer-menu-button');target?.focus({preventScroll:true});}
    previousFocus=null;(finished?onFinish:onExit)();
  }
  function exit(){stop();}
  function keydown(event){if(event.defaultPrevented||draggable&&doc.querySelector('dialog[open],#context:not([hidden]),#test-it-tools-menu:not([hidden])'))return;if(event.key==='Escape'&&card?.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();stop();}}
  function signal(event){if(card&&draggable&&event.detail?.action==='test-it-tools-open'){position();return;}if(card&&steps[index].action===event.detail?.action){completed=true;$('[data-guide-status]').textContent='Action recognized. Continue when you’re ready.';$('[data-guide-next]').disabled=false;schedule();if(autoAdvance)advance();}}
  function show(){
    completed=false;clearHighlight();const step=steps[index];onStep(index);
    $('[data-guide-progress]').textContent=`${index+1} of ${steps.length}`;
    $('[data-guide-title]').textContent=step.title;$('[data-guide-text]').textContent=typeof step.text==='function'?step.text():step.text;
    $('[data-guide-status]').textContent=step.action?'Try this in the Explorer, or choose Skip.':'';
    $('[data-guide-back]').hidden=!allowBack;$('[data-guide-back]').disabled=index===0;$('[data-guide-skip]').hidden=!step.action;
    $('[data-guide-next]').textContent=index===steps.length-1?'Finish':'Next';$('[data-guide-next]').disabled=Boolean(step.action);
    highlight?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});position();$('[data-guide-exit]').focus({preventScroll:true});
  }
  function advance(){if(index===steps.length-1)stop(true);else{index++;show();}}
  function start(){
    if(card)stop();index=startIndex;previousFocus=doc.activeElement;
    card=doc.createElement('section');card.className='guide-card';card.setAttribute('role','region');card.setAttribute('aria-label',allowBack?'Take the Tour':'Test It');
    card.innerHTML='<button type="button" class="guide-exit" data-guide-exit aria-label="Exit entire tour">✕</button><div data-guide-progress class="eyebrow" role="status" aria-live="polite" aria-atomic="true"></div><h2 data-guide-title></h2><p data-guide-text></p><p data-guide-status role="status" aria-live="polite"></p><div class="guide-actions"><button type="button" data-guide-retry hidden>Retry</button><button type="button" data-guide-back>Back</button><button type="button" data-guide-skip>Skip</button><button type="button" data-guide-next class="primary">Next</button></div>';
    if(draggable){installGrip();installResize();}
    doc.body.append(card);$('[data-guide-exit]').onclick=exit;$('[data-guide-back]').onclick=()=>{if(index>0){index--;show();}};$('[data-guide-retry]').hidden=!onRetry;$('[data-guide-retry]').onclick=()=>onRetry?.(index);$('[data-guide-skip]').onclick=()=>{onSkip(index);advance();};$('[data-guide-next]').onclick=()=>{if(!steps[index].action||completed)advance();};
    doc.addEventListener('redown:modal-open',modalOpened);doc.addEventListener('close',modalClosed,true);
    win.addEventListener('resize',schedule);doc.addEventListener('scroll',schedule,true);doc.addEventListener('redown:gui',signal);doc.addEventListener('keydown',keydown,true);win.addEventListener('pagehide',exit);
    observer=new win.MutationObserver(changes=>{if(changes.some(change=>!card?.contains(change.target)))schedule();});observer.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});show();
  }
  return {start,stop,message(text){if(card&&$('[data-guide-status]').textContent!==text){$('[data-guide-status]').textContent=text;schedule();}},get active(){return Boolean(card);}};
}
