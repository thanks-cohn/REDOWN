export function orderedBreadcrumbPath(source){
  const value=source.prefix||'',matches=[...value.matchAll(/[^/]+/g)];
  return [{label:source.bucketName,prefix:''},...matches.map((m,i)=>({label:m[0],prefix:i===matches.length-1?value:value.slice(0,matches[i+1].index)}))];
}
/* Presentation-only contract: update(ordered {label,prefix}[], source), destroy().
   Paths remain opaque; Explorer owns navigation and directory identity. */
export function createBreadcrumbs(host,onNavigate){
  const doc=host.ownerDocument,win=doc.defaultView;let path=[],source=null,fingerprint='',frame=0,disposed=false;
  host.classList.add('rd-crumbs');
  const make=(entry,index)=>{const unit=doc.createElement('span');unit.className='rd-crumb-unit';if(index){const sep=doc.createElement('span');sep.className='rd-crumb-separator';sep.textContent='›';sep.setAttribute('aria-hidden','true');unit.append(sep);}const b=doc.createElement('button');b.type='button';b.textContent=entry.label;b.title=entry.label;if(index===path.length-1)b.setAttribute('aria-current','page');b.onclick=()=>onNavigate(entry,source);unit.append(b);return unit;};
  function paint(){
    frame=0;host.replaceChildren();if(!path.length)return;
    const units=path.map(make);host.append(...units);
    const available=host.clientWidth;if(!available)return;
    const widths=units.map(e=>e.getBoundingClientRect().width);
    if(widths.reduce((a,b)=>a+b,0)<=available)return;
    if(path.length<4)return;
    // Root + parent + current are retained; older ancestors join the menu first.
    let first=path.length-2,total=widths[0]+widths.at(-2)+widths.at(-1)+54;
    while(first>1&&total+widths[first-1]<=available){first--;total+=widths[first];}
    const hidden=path.slice(1,first);if(!hidden.length)return;
    const unit=doc.createElement('span');unit.className='rd-crumb-unit';
    const sep=doc.createElement('span');sep.className='rd-crumb-separator';sep.textContent='›';sep.setAttribute('aria-hidden','true');
    const more=doc.createElement('details');more.className='rd-crumb-more';const summary=doc.createElement('summary');summary.textContent='…';summary.setAttribute('aria-label','Hidden parent folders');
    const menu=doc.createElement('div');menu.className='rd-crumb-menu';hidden.forEach(entry=>{const b=doc.createElement('button');b.type='button';b.textContent=entry.label;b.title=entry.label;b.onclick=()=>{more.open=false;onNavigate(entry,source);};menu.append(b);});more.append(summary,menu);unit.append(sep,more);host.replaceChildren(units[0],unit,...units.slice(first));
  }
  const schedule=()=>{if(!disposed&&!frame)frame=win.requestAnimationFrame(paint);};
  const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(schedule):null;observer?.observe(host);
  const outside=e=>{if(!host.contains(e.target))host.querySelectorAll('details[open]').forEach(d=>d.open=false);};
  const key=e=>{if(e.key==='Escape'){const d=host.querySelector('details[open]');if(d){d.open=false;d.querySelector('summary').focus();e.preventDefault();}}};
  doc.addEventListener('click',outside);host.addEventListener('keydown',key);
  doc.fonts?.ready.then(schedule);
  return {update(next,context){const id=JSON.stringify([next,context]);if(id===fingerprint)return;fingerprint=id;path=next.map(e=>({...e}));source=context;paint();},destroy(){disposed=true;observer?.disconnect();win.cancelAnimationFrame(frame);doc.removeEventListener('click',outside);host.removeEventListener('keydown',key);}};
}
