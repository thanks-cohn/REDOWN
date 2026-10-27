// Small presentation/navigation primitive. Signals indicate GUI actions, not test evidence.
export function createGuide({document:doc,steps,onFinish=()=>{},onExit=()=>{},onStep=()=>{},onSkip=()=>{},onRetry=null,startIndex=0,allowBack=true,autoAdvance=false}){
  const win=doc.defaultView;let index=0,card=null,highlight=null,previousFocus=null,observer=null,frame=0,completed=false;
  const $=selector=>card.querySelector(selector);
  function clearHighlight(){highlight?.classList.remove('guide-highlight');highlight=null;}
  function position(){
    frame=0;if(!card)return;
    const modal=[...doc.querySelectorAll('dialog[open]')].at(-1),host=modal||doc.body;
    if(card.parentElement!==host)host.append(card);
    clearHighlight();const selector=typeof steps[index].target==='function'?steps[index].target():steps[index].target;const target=doc.querySelector(selector);
    if(target&&(!modal||modal.contains(target)))highlight=target;
    highlight?.classList.add('guide-highlight');
    const rect=highlight?.getBoundingClientRect(),gap=12,margin=10;
    const width=win.innerWidth,height=win.innerHeight;
    card.style.maxHeight=Math.max(80,height-margin*2)+'px';
    const box=card.getBoundingClientRect(),cw=box.width||Math.min(340,width-20),ch=box.height||260;
    // Prefer a side with room; fall back above/below. Underlying controls remain clickable.
    let left=width-cw-margin,top=height-ch-margin;
    if(rect){
      if(rect.right+gap+cw<=width-margin){left=rect.right+gap;top=rect.top;}
      else if(rect.left-gap-cw>=margin){left=rect.left-gap-cw;top=rect.top;}
      else if(rect.bottom+gap+ch<=height-margin){left=rect.left;top=rect.bottom+gap;}
      else if(rect.top-gap-ch>=margin){left=rect.left;top=rect.top-gap-ch;}
      else {left=width-cw-margin;top=height-ch-margin;}
    }
    card.style.left=Math.max(margin,Math.min(left,width-cw-margin))+'px';
    card.style.top=Math.max(margin,Math.min(top,height-ch-margin))+'px';
  }
  function schedule(){if(card&&!frame)frame=win.requestAnimationFrame(position);}
  function stop(finished=false){
    if(!card)return;const ownedFocus=card.contains(doc.activeElement);
    win.removeEventListener('resize',schedule);doc.removeEventListener('scroll',schedule,true);doc.removeEventListener('redown:gui',signal);doc.removeEventListener('keydown',keydown,true);win.removeEventListener('pagehide',exit);
    observer?.disconnect();observer=null;if(frame)win.cancelAnimationFrame(frame);frame=0;
    clearHighlight();card.remove();card=null;
    if(ownedFocus){const modal=[...doc.querySelectorAll('dialog[open]')].at(-1);const target=previousFocus?.isConnected&&!previousFocus.closest('[hidden]')&&(!modal||modal.contains(previousFocus))?previousFocus:modal||doc.querySelector('#explorer-menu-button');target?.focus({preventScroll:true});}
    previousFocus=null;(finished?onFinish:onExit)();
  }
  function exit(){stop();}
  function keydown(event){if(event.key==='Escape'&&card?.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();stop();}}
  function signal(event){if(card&&steps[index].action===event.detail?.action){completed=true;$('[data-guide-status]').textContent='Action recognized. Continue when you’re ready.';$('[data-guide-next]').disabled=false;if(autoAdvance)advance();}}
  function show(){
    completed=false;clearHighlight();const step=steps[index];onStep(index);
    $('[data-guide-progress]').textContent=`${index+1} of ${steps.length}`;
    $('[data-guide-title]').textContent=step.title;$('[data-guide-text]').textContent=typeof step.text==='function'?step.text():step.text;
    $('[data-guide-status]').textContent=step.action?'Try this in the Explorer, or choose Skip.':'';
    $('[data-guide-back]').hidden=!allowBack;$('[data-guide-back]').disabled=index===0;$('[data-guide-skip]').hidden=!step.action;
    $('[data-guide-next]').textContent=index===steps.length-1?'Finish':'Next';$('[data-guide-next]').disabled=Boolean(step.action);
    position();highlight?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});position();$('[data-guide-exit]').focus({preventScroll:true});
  }
  function advance(){if(index===steps.length-1)stop(true);else{index++;show();}}
  function start(){
    if(card)stop();index=startIndex;previousFocus=doc.activeElement;
    card=doc.createElement('section');card.className='guide-card';card.setAttribute('role','region');card.setAttribute('aria-label',allowBack?'Take the Tour':'Test It');
    card.innerHTML='<button type="button" class="guide-exit" data-guide-exit aria-label="Exit entire tour">✕</button><div data-guide-progress class="eyebrow" role="status" aria-live="polite" aria-atomic="true"></div><h2 data-guide-title></h2><p data-guide-text></p><p data-guide-status role="status" aria-live="polite"></p><div class="guide-actions"><button type="button" data-guide-retry hidden>Retry</button><button type="button" data-guide-back>Back</button><button type="button" data-guide-skip>Skip</button><button type="button" data-guide-next class="primary">Next</button></div>';
    doc.body.append(card);$('[data-guide-exit]').onclick=exit;$('[data-guide-back]').onclick=()=>{if(index>0){index--;show();}};$('[data-guide-retry]').hidden=!onRetry;$('[data-guide-retry]').onclick=()=>onRetry?.(index);$('[data-guide-skip]').onclick=()=>{onSkip(index);advance();};$('[data-guide-next]').onclick=()=>{if(!steps[index].action||completed)advance();};
    win.addEventListener('resize',schedule);doc.addEventListener('scroll',schedule,true);doc.addEventListener('redown:gui',signal);doc.addEventListener('keydown',keydown,true);win.addEventListener('pagehide',exit);
    observer=new win.MutationObserver(schedule);observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});show();
  }
  return {start,stop,message(text){if(card)$('[data-guide-status]').textContent=text;},get active(){return Boolean(card);}};
}
