/* Navigation model and replaceable presentation slot. No cloud or file operations. */
(() => {
  'use strict';
  const ID='expandable-hierarchy';
  const keyOf=(location,prefix)=>JSON.stringify([location.accountId,location.bucketName,prefix]);
  function model(location){
    if(!location)return [];
    const entries=[{id:keyOf(location,''),fullName:location.bucketName,prefix:'',depth:0}];
    // Retain empty path components and literal Unicode. Never decode or normalize keys.
    const path=location.prefix||'';let end=0;
    while(end<path.length){const slash=path.indexOf('/',end),limit=slash<0?path.length:slash+1;
      entries.push({id:keyOf(location,path.slice(0,limit)),fullName:path.slice(end,slash<0?limit:slash)||'∅',prefix:path.slice(0,limit),depth:entries.length});end=limit;}
    return Object.freeze(entries.map((entry,index)=>Object.freeze({...entry,current:index===entries.length-1})));
  }
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  const initial=name=>(segmenter?segmenter.segment(name.trim())[Symbol.iterator]().next().value?.segment:Array.from(name.trim())[0])||'∅';
  const firstWord=name=>name.trim().split(/\s+/u)[0]||name;
  function rows(entries,expanded){
    const result=[];let row;
    for(const entry of entries.slice(1,-1)){
      if(!row||expanded.has(entry.id)){row={anchor:entry,label:entry.depth===1&&!expanded.has(entry.id)?firstWord(entry.fullName):entry.fullName,trail:[]};result.push(row);}
      else row.trail.push(entry);
    }
    return result;
  }
  const registry=new Map();
  function register(id,factory){if(registry.has(id))throw Error('Navigation presentation already registered');registry.set(id,factory);}
  function createSlot(host,contract,id=ID){
    let view,latest=contract;
    const select=next=>{const factory=registry.get(next);if(!factory)throw Error('Unknown navigation presentation');view?.destroy();host.replaceChildren();view=factory(host);view.update(latest);};
    select(id);
    return {update(next){latest=next;view.update(next);},select,destroy(){view?.destroy();host.replaceChildren();}};
  }
  register(ID,host=>{
    const doc=host.ownerDocument,win=doc.defaultView;
    host.classList.add('rd-bc');
    const shell=doc.createElement('div');shell.className='rd-bc-shell';
    const root=doc.createElement('div');root.className='rd-bc-root';
    const hierarchy=doc.createElement('div');hierarchy.className='rd-bc-hierarchy';hierarchy.setAttribute('aria-label','Expanded directory hierarchy');
    const current=doc.createElement('div');current.className='rd-bc-current';
    const settings=doc.createElement('label');settings.className='rd-bc-setting';
    const toggle=doc.createElement('input');toggle.type='checkbox';toggle.checked=true;
    settings.append(toggle,doc.createTextNode('Expand Before Navigating'));
    shell.append(root,hierarchy,current,settings);host.append(shell);
    let contract,signature='',expanded=new Set(),cache=new Map(),frame=0,destroyed=false;
    const reduced=()=>win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const makeButton=(text,label,action)=>{const b=doc.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.dataset.action=action;return b;};
    const persist=()=>contract.onPreferencesChange?.({expandBeforeNavigating:toggle.checked,expandedIds:[...expanded].slice(-512)});
    function scheduleMeasure(){if(!frame&&!destroyed)frame=win.requestAnimationFrame(()=>{frame=0;for(const row of cache.values()){
      const overflow=row.viewport.scrollWidth>row.viewport.clientWidth+1;
      row.before.hidden=!overflow||row.viewport.scrollLeft<=1;
      row.after.hidden=!overflow||row.viewport.scrollLeft+row.viewport.clientWidth>=row.viewport.scrollWidth-1;
    }});}
    function mutate(id,open){if(open)expanded.add(id);else expanded.delete(id);persist();paint(true,id);}
    function targetButton(entry,label,action){const b=makeButton(label,`${action==='navigate'?'Open':'Expand'} ${entry.fullName}`,action);b.dataset.id=entry.id;return b;}
    function paint(animate=false,focusId=null){
      if(!contract)return;
      const entries=contract.hierarchy,old=new Map();
      if(animate&&!reduced())for(const [id,row] of cache){row.element.getAnimations?.().forEach(a=>a.cancel());old.set(id,row.element.getBoundingClientRect().top);}
      root.replaceChildren();current.replaceChildren();
      if(entries.length){const first=entries[0];const b=targetButton(first,first.fullName,'navigate');if(entries.length===1)b.setAttribute('aria-current','location');root.append(b);}
      if(entries.length>1){const last=entries.at(-1);const b=targetButton(last,last.fullName,'navigate');b.setAttribute('aria-current','location');current.append(b);}
      current.hidden=entries.length<2;
      const next=new Map();
      for(const spec of rows(entries,expanded)){
        let row=cache.get(spec.anchor.id);
        if(!row){const element=doc.createElement('div');element.className='rd-bc-row';
          const anchor=doc.createElement('div');anchor.className='rd-bc-anchor';
          const viewport=doc.createElement('div');viewport.className='rd-bc-viewport';viewport.setAttribute('role','group');viewport.setAttribute('aria-label',`Directories after ${spec.anchor.fullName}`);
          const before=makeButton('‹','Scroll directory trail left','left'),after=makeButton('… ›','Scroll directory trail right','right');before.className='rd-bc-left';after.className='rd-bc-right';before.hidden=after.hidden=true;
          const trail=doc.createElement('div');trail.className='rd-bc-trail';viewport.append(trail);element.append(anchor,viewport,before,after);row={element,anchor,viewport,trail,before,after,trailKey:''};
        }
        const anchorButton=targetButton(spec.anchor,spec.label,'navigate');anchorButton.title=spec.anchor.fullName;
        row.anchor.replaceChildren(anchorButton);
        if(expanded.has(spec.anchor.id)){const collapse=targetButton(spec.anchor,'−','collapse');collapse.setAttribute('aria-label',`Collapse ${spec.anchor.fullName}`);collapse.setAttribute('aria-expanded','true');row.anchor.append(collapse);}
        const trailKey=JSON.stringify([toggle.checked,spec.trail.map(e=>e.id)]);
        if(row.trailKey!==trailKey){row.trailKey=trailKey;row.trail.replaceChildren();for(const entry of spec.trail){
          const group=doc.createElement('span');group.className='rd-bc-segment';
          const b=targetButton(entry,'',toggle.checked?'expand':'navigate');b.title=entry.fullName;b.className='rd-bc-abbreviation';if(toggle.checked)b.setAttribute('aria-expanded','false');
          const short=doc.createElement('span');short.className='rd-bc-initial';short.textContent=initial(entry.fullName);short.setAttribute('aria-hidden','true');
          const full=doc.createElement('span');full.className='rd-bc-full';full.textContent=entry.fullName;full.setAttribute('aria-hidden','true');b.append(short,full);
          const expand=targetButton(entry,'+','expand');expand.className='rd-bc-expand';expand.setAttribute('aria-expanded','false');group.append(b,expand);row.trail.append(group);
        }}
        next.set(spec.anchor.id,row);hierarchy.append(row.element);
      }
      for(const [id,row] of cache)if(!next.has(id))row.element.remove();cache=next;
      if(animate&&!reduced())for(const [id,row] of cache){const top=row.element.getBoundingClientRect().top,previous=old.get(id);row.element.animate?.(previous===undefined?[{opacity:0,transform:'translateY(-5px)'},{opacity:1,transform:'translateY(0)'}]:[{transform:`translateY(${previous-top}px)`},{transform:'translateY(0)'}],{duration:160,easing:'cubic-bezier(.2,.7,.2,1)'});}
      if(focusId){const matches=[...host.querySelectorAll('button[data-id]')].filter(b=>b.dataset.id===focusId);matches.find(b=>b.dataset.action==='navigate')?.focus();if(!matches.some(b=>b.dataset.action==='navigate'))matches[0]?.focus();}
      scheduleMeasure();
    }
    function click(event){const b=event.target.closest('button[data-action]');if(!b||!host.contains(b))return;
      const action=b.dataset.action,id=b.dataset.id;
      if(action==='left'||action==='right'){const row=[...cache.values()].find(r=>r.element.contains(b));row?.viewport.scrollBy?.({left:(action==='left'?-1:1)*Math.max(80,row.viewport.clientWidth*.7),behavior:reduced()?'instant':'smooth'});return;}
      if(action==='expand'||action==='collapse'){mutate(id,action==='expand');return;}
      const entry=contract.hierarchy.find(e=>e.id===id);if(entry)contract.onNavigate(entry);
    }
    function keydown(event){if(event.altKey||event.metaKey||event.ctrlKey)return;
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
        const row=event.target.closest('.rd-bc-row');if(!row)return;const buttons=[...row.querySelectorAll('button[data-id]')],index=buttons.indexOf(event.target);if(index<0)return;
        const target=buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowLeft'?-1:1)))];event.preventDefault();event.stopPropagation();target?.focus();target?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
      }
    }
    function change(){persist();signature='';paint();}
    host.addEventListener('click',click);host.addEventListener('keydown',keydown);host.addEventListener('scroll',scheduleMeasure,true);host.addEventListener('transitionend',scheduleMeasure);toggle.addEventListener('change',change);
    const observer=win.ResizeObserver?new win.ResizeObserver(scheduleMeasure):null;observer?.observe(host);
    return {update(next){if(contract&&next.hierarchy===contract.hierarchy&&next.settings===contract.settings){contract=next;return;}contract=next;const prefs=next.settings||{};const sig=JSON.stringify([next.hierarchy.map(e=>e.id),prefs.expandBeforeNavigating,prefs.expandedIds]);if(signature===sig)return;signature=sig;toggle.checked=prefs.expandBeforeNavigating!==false;expanded=new Set((Array.isArray(prefs.expandedIds)?prefs.expandedIds:[]).filter(id=>typeof id==='string').slice(-512));paint();},destroy(){destroyed=true;observer?.disconnect();win.cancelAnimationFrame(frame);host.removeEventListener('click',click);host.removeEventListener('keydown',keydown);host.removeEventListener('scroll',scheduleMeasure,true);host.removeEventListener('transitionend',scheduleMeasure);toggle.removeEventListener('change',change);for(const row of cache.values())row.element.getAnimations?.().forEach(a=>a.cancel());cache.clear();host.classList.remove('rd-bc');shell.remove();}};
  });
  globalThis.RedownNavigation=Object.freeze({model,rows,register,createSlot,presentationId:ID});
})();
