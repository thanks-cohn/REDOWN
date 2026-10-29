/* Bounded decorative prelude. Palette persistence belongs exclusively to shelf-theme.js. */
(() => {
  // Sample cubic curves once per selection; WAAPI owns playback, with no render loop.
  function curveFrames(points, origin, rebound=false){
    return Array.from({length:61},(_,i)=>{
      const progress=i/60;
      // The approach has two tangent-matched halves so its visible apex stays
      // inside the narrow header, even when the word is much farther below.
      const split=points.length===7;
      const t=split?(progress<=.5?progress*2:(progress-.5)*2):progress,u=1-t;
      const segment=split?points.slice(progress<=.5?0:3,progress<=.5?4:7):points;
      const coordinate=axis=>u*u*u*segment[0][axis]+3*u*u*t*segment[1][axis]+3*u*t*t*segment[2][axis]+t*t*t*segment[3][axis];
      const stretch=rebound?Math.sin(Math.PI*progress)*.035:Math.sin(Math.PI*progress)*.02;
      return {offset:progress,transform:`translate(${coordinate(0)-origin[0]}px,${coordinate(1)-origin[1]}px) scale(${1-stretch},${1+stretch})`};
    });
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
          const canHit=bounds&&bounds.width>0&&bounds.height>0&&bounds.top<innerHeight;
          if(!canHit)throw Error('No visible springboard');
          const x=bounds.left+bounds.width/2,hitY=bounds.top-12;
          const origin=[sx,sy],hit=[x,hitY],dx=x-sx;
          const lift=Math.min(110,Math.max(42,Math.abs(dx)*.28));
          const crest=Math.max(14,Math.min(sy,hitY)-lift);
          const apexX=sx+dx*.48;
          const approach=[origin,[sx+dx*.12,crest],[apexX-dx*.14,crest],[apexX,crest],
            [apexX+dx*.14,crest],[x-dx*.12,hitY-Math.max(24,Math.abs(hitY-sy)*.3)],hit];
          await animate(object,curveFrames(approach,origin),{duration:840,easing:'cubic-bezier(.3,0,.65,1)'});
          if(controller.signal.aborted)throw Error('Interrupted');
          // Contact is isolated to the word and object; surrounding layout never changes.
          void animate(target,[{transform:'translateY(0) scaleY(1)'},{transform:'translateY(2.5px) scaleY(.95)',offset:.3},{transform:'translateY(0) scaleY(1)'}],{duration:280,easing:'ease-out'}).catch(()=>{});
          const streak=document.createElement('div');streak.className='celestial-streak';
          Object.assign(streak.style,{left:`${bounds.left}px`,top:`${bounds.top+Math.min(bounds.height/2,10)}px`,width:`${bounds.width}px`});overlay.append(streak);
          void animate(streak,[{transform:'scaleX(0)',opacity:0},{transform:'scaleX(1)',opacity:.9,offset:.45},{transform:'scaleX(1)',opacity:0}],{duration:300}).catch(()=>{});
          const contact=`translate(${x-sx}px,${hitY-sy}px)`;
          await animate(object,[{transform:contact+' scale(1,1)'},{transform:contact+' scale(1.12,.86)',offset:.45},{transform:contact+' scale(1,1)'}],{duration:120,easing:'ease-out'});
          // Keep lateral velocity through the final frame. No vertical exit segment.
          const direction=x<innerWidth/2?1:-1;
          const travel=Math.min(100,innerWidth*.24);
          const rise=Math.min(100,Math.max(48,hitY*.5));
          const departure=[hit,[x+direction*travel*.24,hitY-rise*2.3],
            [x+direction*travel*.68,hitY-rise*1.4],[x+direction*travel,innerHeight+40]];
          await animate(object,curveFrames(departure,origin,true),{duration:1020,easing:'cubic-bezier(.18,.12,.65,1)'});
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
})();
