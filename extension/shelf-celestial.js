/* Bounded decorative prelude. Palette persistence belongs exclusively to shelf-theme.js. */
(() => {
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
            void animate(object.querySelector('.celestial-glint'),[{transform:'translateX(0)'},{transform:'translateX(48px)'}],{duration:240}).catch(()=>{});
            await animate(moon,[{color:'var(--accent)'},{color:'#fff1fa',offset:.35},{color:'#ff474f'}],{duration:240});
            await animate(object.querySelector('.celestial-seal'),[{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:1}],{duration:260,easing:'ease-out'});
          } else await animate(object,[{opacity:.65,scale:'.8'},{opacity:1,scale:'1'}],{duration:110});
          if(controller.signal.aborted)throw Error('Interrupted');
          const view=document.querySelector(location.hash==='#history'?'#history-view':location.hash==='#settings'?'#settings-view':'#clouds-view');
          const target=view?.querySelector('[data-celestial-target]');
          const bounds=target?.getBoundingClientRect();
          const sx=start.left+start.width/2,sy=start.top+start.height/2;
          const canHit=bounds&&bounds.width>0&&bounds.top>sy&&bounds.top<innerHeight;
          const x=canHit?bounds.left+bounds.width/2:sx;
          const hitY=canHit?bounds.top+Math.min(bounds.height/2,10):sy;
          const bottom=innerHeight+40, distance=Math.max(1,bottom-sy);
          const fraction=canHit?Math.sqrt(Math.max(0,(hitY-sy)/distance)):0;
          if(canHit){
            await animate(object,[{transform:'translate(0,0)'},{transform:`translate(${x-sx}px,${hitY-sy}px)`}],{duration:650*fraction,easing:'cubic-bezier(.45,0,1,1)'});
            if(controller.signal.aborted)throw Error('Interrupted');
            // Inline-block transform touches only the designated word, without layout writes.
            void animate(target,[{transform:'translateY(0) scaleY(1)',color:'inherit'},{transform:'translateY(2px) scaleY(.94)',color:lunar?'#ff474f':colors[palette],offset:.25},{transform:'translateY(0) scaleY(1)',color:'inherit'}],{duration:230}).catch(()=>{});
            const streak=document.createElement('div');streak.className='celestial-streak';
            Object.assign(streak.style,{left:`${bounds.left}px`,top:`${hitY}px`,width:`${bounds.width}px`});overlay.append(streak);
            void animate(streak,[{transform:'scaleX(0)',opacity:1},{transform:'scaleX(1)',opacity:.8,offset:.4},{transform:'scaleX(1)',opacity:0}],{duration:210}).catch(()=>{});
          }
          await animate(object,[{transform:`translate(${x-sx}px,${canHit?hitY-sy:0}px)`},{transform:`translate(${x-sx}px,${bottom-sy}px)`}],{duration:650*(1-fraction),easing:'ease-in'});
          // One cancellable pause, after departure and before the existing transition.
          await new Promise(resolve=>{const timer=setTimeout(resolve,110);controller.signal.addEventListener('abort',()=>{clearTimeout(timer);resolve();},{once:true});});
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
