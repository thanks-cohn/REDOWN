/* Storage feedback and a strictly local training experience. No Chrome/cloud APIs. */
(function(root){
  'use strict';
  const states=Object.freeze({
    idle:{glyph:'↻',label:'Not checked'},
    attention:{glyph:'↻',label:'Check connection'},
    repair:{glyph:'!',label:'Repair needed'},
    working:{glyph:'↻',label:'Checking…'},
    ready:{glyph:'✓',label:'Verified'}
  });
  function paint(el,state,message){
    if(!states[state])throw new Error('Unknown storage signal');
    el.dataset.signalFresh=String(el.dataset.signal!==undefined&&el.dataset.signal!==state);
    el.dataset.signal=state;
    const text=message||states[state].label;
    const caption=el.querySelector('.bucket-status, .signal-demo-status');
    if(caption)caption.textContent=text;
    const lamp=el.querySelector('.bucket-repair, .signal-demo-action');
    if(lamp){
      const glyph=el.ownerDocument.createElement('span');glyph.className='signal-glyph';glyph.setAttribute('aria-hidden','true');glyph.textContent=states[state].glyph;
      lamp.replaceChildren(glyph);
      if(lamp.classList.contains('bucket-repair')){
        const name=el.querySelector('.bucket-name')?.textContent||'bucket';
        lamp.title=`${text} — Verify / repair ${name}`;
        lamp.setAttribute('aria-label',lamp.title);
      }
    }
  }
  // One geometry read on entry/resize, never an animation-frame layout loop.
  function wireBucketExpansion({document,window}){
    const viewport=document.querySelector('.bucket-grid-viewport');
    if(!viewport)return null;
    const grid=document.getElementById('bucket-grid');
    const normal=()=>!document.documentElement.classList.contains('debug-mode');
    function fit(){
      if(!normal())return;
      const top=viewport.getBoundingClientRect().top;
      const last=grid.lastElementChild;
      const contentHeight=last?last.offsetTop+last.offsetHeight+12:viewport.clientHeight;
      const rowHeight=(grid.firstElementChild?.offsetHeight||0)+18;
      const height=Math.max(rowHeight,Math.min(900,contentHeight,window.innerHeight*.75,window.innerHeight-top-12));
      const value=height+'px';
      if(viewport.style.getPropertyValue('--bucket-popup-height')!==value)viewport.style.setProperty('--bucket-popup-height',value);
    }
    function enter(){delete viewport.dataset.dismissed;fit();}
    function dismiss(){
      if(!normal())return;
      viewport.dataset.dismissed='true';
      if(viewport.contains(document.activeElement))document.getElementById('refresh-storage')?.focus();
    }
    viewport.addEventListener('pointerenter',enter);
    viewport.addEventListener('pointerleave',()=>{delete viewport.dataset.dismissed;});
    viewport.addEventListener('focusin',event=>{if(!viewport.contains(event.relatedTarget))enter();});
    grid.addEventListener('keydown',event=>{if(event.key==='Escape'&&normal()){event.preventDefault();dismiss();}});
    document.addEventListener('pointerdown',event=>{
      if(normal()&&!viewport.contains(event.target)&&viewport.contains(document.activeElement))document.activeElement.blur();
    });
    window.addEventListener('resize',()=>{if(viewport.matches(':hover,:focus-within'))fit();});
    return {fit,dismiss};
  }
  function mountTraining({document,schedule=setTimeout,cancel=clearTimeout}){
    const byId=id=>document.getElementById(id),panel=byId('storage-training');
    if(!panel)return null;
    const startButton=byId('run-storage-training'),message=byId('storage-training-message');
    const lamps=byId('storage-training-lamps');
    let generation=0,stage='closed',timers=new Set();
    const tiles=['Connection','Buckets','Worker'].map((name,index)=>{
      const tile=document.createElement('div');tile.className='signal-demo-tile';
      const title=document.createElement('strong');title.textContent=name;
      const status=document.createElement('span');status.className='signal-demo-status';
      const action=document.createElement('button');action.type='button';action.className='signal-demo-action';
      action.setAttribute('aria-label',index===1?'Refresh simulated buckets':index===2?'Repair simulated Worker':'Simulated connection indicator');
      action.addEventListener('click',()=>advance(index));tile.append(title,status,action);lamps.append(tile);return tile;
    });
    function stop(){generation++;for(const timer of timers)cancel(timer);timers.clear();}
    function later(delay,fn){const token=generation;const timer=schedule(()=>{timers.delete(timer);if(token===generation)fn();},delay);timers.add(timer);}
    function show(next,text,signals){
      stage=next;panel.dataset.stage=next;message.textContent=text+' Simulation only — your storage is unchanged.';
      tiles.forEach((tile,i)=>{paint(tile,signals[i][0],signals[i][1]);tile.querySelector('button').disabled=!((next==='refresh'&&i===1)||(next==='repair'&&i===2));});
    }
    const idle=[['idle','Not checked'],['idle','Not checked'],['idle','Not checked']];
    function start(){
      if(panel.closest("[data-debug-detail]")?.hidden)return;
      stop();panel.hidden=false;startButton.setAttribute('aria-expanded','true');
      show('checking','Watch the blue signal: a check is in progress.',[['working','Checking…'],...idle.slice(1)]);
      later(350,()=>show('checking','Now checking the bucket list.',[['ready','Connection checked'],['working','Checking…'],idle[2]]));
      later(850,()=>{show('refresh','Amber means attention. Press the amber Refresh circle.',[['ready','Connection checked'],['attention','Refresh needed'],idle[2]]);tiles[1].querySelector('button').focus();});
    }
    function advance(index){
      if(stage==='refresh'&&index===1){
        show('refreshing','Refreshing the simulated bucket list.',[['ready','Connection checked'],['working','Refreshing…'],idle[2]]);
        later(550,()=>{show('repair','Red means repair. Press the red Repair circle.',[['ready','Connection checked'],['ready','List refreshed'],['repair','Repair needed']]);tiles[2].querySelector('button').focus();});
      }else if(stage==='repair'&&index===2){
        show('repairing','Repairing the simulated Worker.',[['ready','Connection checked'],['ready','List refreshed'],['working','Repairing…']]);
        later(600,()=>show('verified','The simulated Worker answered the check.',[['ready','Connection checked'],['ready','List refreshed'],['ready','Worker verified']]));
        later(950,()=>show('complete','All simulated checks passed. This is the green completion signal.',[['ready','Ready'],['ready','Ready'],['ready','Ready']]));
        later(3350,()=>show('rest','Test complete. Reset to practice again, or Exit.',idle));
      }
    }
    function exit({focus=true}={}){stop();stage='closed';panel.dataset.stage=stage;panel.hidden=true;startButton.setAttribute('aria-expanded','false');if(focus)startButton.focus();}
    startButton.addEventListener('click',start);
    byId('reset-storage-training').addEventListener('click',start);
    byId('exit-storage-training').addEventListener('click',exit);
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();exit();}});
    return {start,reset:start,exit,get stage(){return stage;},destroy(){stop();panel.hidden=true;}};
  }
  root.RedownStorageSignals=Object.freeze({states,paint,wireBucketExpansion,mountTraining});
})(globalThis);
