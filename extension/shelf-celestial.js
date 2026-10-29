/* Bounded decorative prelude. Palette persistence belongs exclusively to shelf-theme.js. */
(() => {
  // Piecewise constant gravity, integrated analytically. Lower gravity in a tiny
  // apex band gives continuous velocity and a living suspension, never a hold.
  function flightModel({sx,sy,x,hitY,height,width}){
    const gravity=560, contactDuration=.105;
    function flight(from,apex,to,band,softGravity){
      band=Math.min(band,from-apex,to-apex);
      const edge=apex+band, slowSpeed=Math.sqrt(2*softGravity*band);
      const launchSpeed=Math.sqrt(slowSpeed**2+2*gravity*(from-edge));
      const segments=[];let time=0;
      function add(y,v,g,duration){
        if(duration>0){segments.push({time,duration,y,v,g});time+=duration;}
      }
      add(from,-launchSpeed,gravity,(launchSpeed-slowSpeed)/gravity);
      const apexTime=time+slowSpeed/softGravity;
      add(edge,-slowSpeed,softGravity,2*slowSpeed/softGravity);
      const endSpeed=Math.sqrt(slowSpeed**2+2*gravity*(to-edge));
      add(edge,slowSpeed,gravity,(endSpeed-slowSpeed)/gravity);
      return {duration:time,apexTime,launchSpeed,endSpeed,segments,
        at(t){const segment=segments.find(s=>t<=s.time+s.duration)||segments.at(-1);
          const dt=Math.max(0,Math.min(segment.duration,t-segment.time));
          return {y:segment.y+segment.v*dt+.5*segment.g*dt*dt,vy:segment.v+segment.g*dt,g:segment.g};}};
    }
    const firstApex=Math.max(14,Math.min(sy-14,hitY-18));
    const approach=flight(sy,firstApex,hitY,1,100);
    // Restitution bounds the rebound's energy; keep its apex inside the Shelf.
    const reboundHeight=Math.min(Math.max(0,hitY-18),approach.endSpeed**2*.68**2/(2*gravity));
    const reboundApex=hitY-Math.max(2,reboundHeight);
    const rebound=flight(hitY,reboundApex,height+40,Math.min(5,reboundHeight*.3),45);
    const impact=approach.duration, release=impact+contactDuration;
    const duration=release+rebound.duration;
    const drift=(x<width/2?1:-1)*Math.min(14,(width-x-16)/Math.max(1,rebound.duration), (x-16)/Math.max(1,rebound.duration));
    function at(t){
      if(t<=impact){const state=approach.at(t),u=Math.min(1,t/impact);
        // Smooth guidance is solved before playback, with no late correction.
        return {...state,x:sx+(x-sx)*(u*u*(3-2*u)),scaleX:1,scaleY:1};}
      if(t<release){const u=(t-impact)/contactDuration,squash=Math.sin(Math.PI*u);
        return {x,y:hitY+1.5*squash,vy:0,g:0,scaleX:1+.09*squash,scaleY:1-.12*squash};}
      const state=rebound.at(t-release),stretch=Math.min(.025,Math.abs(state.vy)/24000);
      return {...state,x:x+drift*(t-release),scaleX:1-stretch,scaleY:1+stretch};
    }
    // Include all physical boundaries exactly; regular samples approximate only
    // the browser's interpolation, never the trajectory or the collision time.
    const times=new Set([0,impact,release,duration,approach.apexTime,release+rebound.apexTime,impact+contactDuration/2]);
    for(const [base,part] of [[0,approach],[release,rebound]])for(const s of part.segments){times.add(base+s.time);times.add(base+s.time+s.duration);}
    for(let t=0;t<duration;t+=1/120)times.add(t);
    const frames=[...new Set([...times].map(t=>Math.min(duration,Math.max(0,t))))].sort((a,b)=>a-b).map(t=>{
      const state=at(t);return {offset:t/duration,transform:`translate(${state.x-sx}px,${state.y-sy}px) scale(${state.scaleX},${state.scaleY})`};
    });
    return {frames,duration,impact,release,contactDuration,approach,rebound,at};
  }
  globalThis.RedownCelestial = function({toggle, current, commit, reducedMotion}) {
    const host=document.createElement('div');host.className='celestial-selector';
    toggle.before(host);host.append(toggle);
    const tray=document.createElement('div');tray.className='celestial-tray';
    tray.setAttribute('role','group');tray.setAttribute('aria-label','Choose Shelf palette');host.append(tray);
    const colors={porcelain:'#e8cdae',midnight:'#ec494e',ocean:'#44d7df',neon:'#ff64da'};
    let generation=0, running=null, suppressed=false;
    const close=()=>{host.classList.remove('celestial-open');suppressed=true;};
    const open=()=>{if(!running&&!suppressed)host.classList.add('celestial-open');};
    function refresh(){
      const focused=tray.contains(document.activeElement);
      tray.replaceChildren();
      for(const palette of Object.keys(colors))if(palette!==current()){
        const button=document.createElement('button');button.type='button';button.className='celestial-orb';
        button.dataset.palette=palette;button.style.setProperty('--orb-color',colors[palette]);
        button.setAttribute('aria-label',`Use ${palette==='neon'?'NEON':palette[0].toUpperCase()+palette.slice(1)} theme`);
        button.innerHTML='<span class="celestial-core" aria-hidden="true"></span>';
        button.addEventListener('click',()=>void select(palette,button,false));tray.append(button);
      }
      toggle.setAttribute('aria-description',`Current palette: ${current()}. Focus or hover to reveal three alternative palettes.`);
      if(focused)toggle.focus({preventScroll:true});
    }
    function cancel(){generation++;running?.abort();}
    async function select(palette,source,lunar){
      if(running)return;
      const ticket=++generation, controller=new AbortController();running=controller;
      const animations=new Set();let overlay;
      const animate=(node,frames,options)=>{
        const animation=node.animate(frames,{fill:'forwards',...options});animations.add(animation);
        return animation.finished;
      };
      const abort=()=>{for(const animation of animations)animation.cancel();};
      controller.signal.addEventListener('abort',abort,{once:true});
      const finish=()=>controller.abort();
      const hidden=()=>{if(document.hidden)finish();};
      const leave=()=>{generation++;finish();};
      globalThis.addEventListener('resize',finish);
      globalThis.addEventListener('hashchange',finish);
      globalThis.visualViewport?.addEventListener('resize',finish);
      globalThis.addEventListener('pagehide',leave);
      document.addEventListener('visibilitychange',hidden);
      try {
        if(!reducedMotion()&&typeof source.animate==='function'){
          host.dataset.busy='true';source.classList.add('celestial-selected');
          const start=source.getBoundingClientRect();
          overlay=document.createElement('div');overlay.className='celestial-overlay';overlay.setAttribute('aria-hidden','true');
          overlay.style.setProperty('--orb-color',lunar?'#ff474f':colors[palette]);
          const object=document.createElement('div');object.className='celestial-falling'+(lunar?' celestial-lunar':'');
          object.style.left=`${start.left+start.width/2-12}px`;object.style.top=`${start.top+start.height/2-12}px`;
          if(lunar)object.innerHTML='<svg viewBox="0 0 32 32"><defs><linearGradient id="celestial-glint"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#8effee" stop-opacity="0"/></linearGradient><clipPath id="celestial-lunar-clip"><path d="M24 24A12 12 0 1 1 18 4A10 10 0 0 0 24 24Z"/></clipPath></defs><path class="celestial-moon" d="M24 24A12 12 0 1 1 18 4A10 10 0 0 0 24 24Z" fill="currentColor"/><g clip-path="url(#celestial-lunar-clip)"><rect class="celestial-glint" x="-14" y="0" width="12" height="32" fill="url(#celestial-glint)"/></g><circle class="celestial-seal" cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width=".8" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>';
          else object.innerHTML='<span class="celestial-core"></span>';
          overlay.append(object);document.body.append(overlay);
          if(lunar){
            const moon=object.querySelector('.celestial-moon');
            void animate(object.querySelector('.celestial-glint'),[{transform:'translateX(0)'},{transform:'translateX(48px)'}],{duration:520}).catch(()=>{});
            await animate(moon,[{color:'var(--accent)'},{color:'#fff1fa',offset:.35},{color:'#ff474f'}],{duration:520});
            await animate(object.querySelector('.celestial-seal'),[{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:1}],{duration:540,easing:'ease-out'});
          } else await animate(object,[{opacity:.65,scale:'.8'},{opacity:1,scale:'1'}],{duration:110});
          if(controller.signal.aborted)throw Error('Interrupted');
          const view=document.querySelector(location.hash==='#history'?'#history-view':location.hash==='#settings'?'#settings-view':'#clouds-view');
          const target=view?.querySelector('[data-celestial-target]');
          const bounds=target?.getBoundingClientRect();
          const sx=start.left+start.width/2,sy=start.top+start.height/2;
          const canHit=bounds&&bounds.width>0&&bounds.height>0&&bounds.top>30&&sy>14&&bounds.top<innerHeight;
          if(!canHit)throw Error('No visible springboard');
          const x=bounds.left+bounds.width/2,hitY=bounds.top-12;
          const model=flightModel({sx,sy,x,hitY,height:innerHeight,width:innerWidth});
          const streak=document.createElement('div');streak.className='celestial-streak';
          Object.assign(streak.style,{left:`${bounds.left}px`,top:`${bounds.top+Math.min(bounds.height/2,10)}px`,width:`${bounds.width}px`,opacity:'0'});overlay.append(streak);
          // All three effects use one document-timeline epoch. Contact begins
          // on the exact flight keyframe, independent of promise/task latency.
          const epoch=document.timeline?.currentTime;
          const common={easing:'linear',...(epoch==null?{}:{timeline:document.timeline})};
          const flight=animate(object,model.frames,{...common,duration:model.duration*1000});
          void animate(target,[{transform:'translateY(0) scaleY(1)'},{transform:'translateY(2.5px) scaleY(.96)',offset:model.contactDuration/.28/2},{transform:'translateY(0) scaleY(1)'}],{...common,delay:model.impact*1000,duration:280}).catch(()=>{});
          void animate(streak,[{transform:'translateX(-20%) scaleX(0)',opacity:0},{transform:'translateX(0) scaleX(1)',opacity:.9,offset:.18},{transform:'translateX(20%) scaleX(.7)',opacity:0}],{...common,delay:model.impact*1000,duration:280}).catch(()=>{});
          if(epoch!=null)for(const animation of animations)if(animation.playState!=='finished'&&animation.playState!=='idle')animation.startTime=epoch;
          await flight;
          if(controller.signal.aborted)throw Error('Interrupted');
          // One cancellable pause, after departure and before the existing transition.
          await new Promise(resolve=>{const timer=setTimeout(resolve,150);controller.signal.addEventListener('abort',()=>{clearTimeout(timer);resolve();},{once:true});});
        }
      } catch {/* Interrupted or unsupported decoration still permits the captured choice. */}
      finally {
        controller.signal.removeEventListener('abort',abort);abort();overlay?.remove();
        source.classList.remove('celestial-selected');delete host.dataset.busy;
        globalThis.removeEventListener('resize',finish);globalThis.removeEventListener('hashchange',finish);
        globalThis.visualViewport?.removeEventListener('resize',finish);
        globalThis.removeEventListener('pagehide',leave);document.removeEventListener('visibilitychange',hidden);
        if(running===controller)running=null;close();
      }
      if(ticket===generation)await commit(palette);
    }
    host.addEventListener('pointerenter',()=>{suppressed=false;open();});
    host.addEventListener('pointerleave',()=>{host.classList.remove('celestial-open');suppressed=false;});
    host.addEventListener('focusin',()=>{suppressed=false;open();});
    host.addEventListener('focusout',event=>{if(!host.contains(event.relatedTarget))close();});
    host.addEventListener('keydown',event=>{if(event.key==='Escape'){close();toggle.focus({preventScroll:true});close();event.preventDefault();}});
    // A touch exposes the alternatives; activating the moon again performs its normal toggle.
    toggle.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!host.classList.contains('celestial-open')){suppressed=false;open();toggle.dataset.touchReveal='true';}});
    refresh();
    return {refresh,cancel,select,consumeTouch(){const reveal=toggle.dataset.touchReveal;delete toggle.dataset.touchReveal;return !!reveal;}};
  };
  globalThis.RedownCelestial.flightModel=flightModel;
})();
