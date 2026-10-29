import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/shelf-celestial.js',import.meta.url),'utf8');
function fixture({reduced=false,unsupported=false,width=390,height=780,targetTop=200}={}){
 const dom=new JSDOM('<button id="moon">Moon</button><section id="clouds-view"><span data-celestial-target>Future</span></section><section id="history-view"><span data-celestial-target>PERSONAL</span></section><section id="settings-view"><span data-celestial-target>HOME</span></section>',{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,events=[],animations=[];Object.defineProperty(w.document,'timeline',{value:{currentTime:1234}});let palette='midnight';Object.defineProperty(w,'innerWidth',{value:width});Object.defineProperty(w,'innerHeight',{value:height});
 w.HTMLElement.prototype.getBoundingClientRect=function(){return this.hasAttribute('data-celestial-target')?{left:50,top:targetTop,width:80,height:30}:{left:250,top:20,width:30,height:30};};
 if(!unsupported)w.Element.prototype.animate=function(frames,options){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const item={node:this,frames,options,finished,playState:'running',cancelled:false,cancel(){this.cancelled=true;reject(Error('cancelled'));},resolve};animations.push(item);return item;};
 w.eval(source);const toggle=w.document.getElementById('moon');
 const director=w.RedownCelestial({toggle,current:()=>palette,commit:async value=>{palette=value;events.push(value);director.refresh();},reducedMotion:()=>reduced});
 return {w,dom,director,toggle,events,animations,get palette(){return palette;}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('three alternatives exclude active palette; keyboard focus opens and Escape closes',()=>{
 const h=fixture();try{const buttons=[...h.w.document.querySelectorAll('.celestial-orb')];assert.equal(buttons.length,3);assert.ok(buttons.every(b=>b.dataset.palette!=='midnight'));h.toggle.focus();assert.ok(h.toggle.parentElement.classList.contains('celestial-open'));h.toggle.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(!h.toggle.parentElement.classList.contains('celestial-open'));}finally{h.dom.window.close();}
});
test('each rendered word shares the flight collision epoch; persistence waits for offscreen exit and pause',async()=>{
 for(const view of ['clouds','history','settings']){const h=fixture();try{
  h.w.history.replaceState(null,'','#'+view);
  const task=h.director.select('neon',h.w.document.querySelector('[data-palette="neon"]'),false);
  h.animations[0].resolve();await tick();
  const flight=h.animations[1],title=h.animations[2],glint=h.animations[3];
  assert.equal(title.node.textContent,view==='clouds'?'Future':view==='history'?'PERSONAL':'HOME');
  assert.equal(title.options.delay,glint.options.delay);assert.ok([flight,title,glint].every(a=>a.startTime===1234));
  const collision=flight.frames.find(f=>Math.abs(f.offset*flight.options.duration-title.options.delay)<1e-6);
  const xy=collision.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px/).slice(1).map(Number);assert.ok(Math.abs(xy[0]+175)<1e-7&&Math.abs(xy[1]-153)<1e-7);
  assert.ok(flight.options.duration>=1700&&flight.options.duration<=2300);assert.equal(flight.options.easing,'linear');
  assert.equal(h.events.length,0);flight.resolve();await tick();assert.equal(h.events.length,0);
  await task;assert.deepEqual(h.events,['neon']);assert.equal(h.w.document.querySelector('.celestial-overlay'),null);
 }finally{h.dom.window.close();}}
});
test('lunar prelude has a shape-clipped shimmer and circumference trace before travel',async()=>{
 const h=fixture();try{const task=h.director.select('porcelain',h.toggle,true);assert.ok(h.w.document.querySelector('.celestial-glint').parentElement.hasAttribute('clip-path'));assert.equal(h.animations.length,2);h.animations[1].resolve();await tick();assert.equal(h.animations[2].node.getAttribute('class'),'celestial-seal');h.animations[2].resolve();await tick();const flight=h.animations[3];assert.equal(flight.node.className,'celestial-falling celestial-lunar');assert.equal(flight.options.easing,'linear');assert.ok(flight.frames.some(f=>Math.abs(f.offset*flight.options.duration-h.animations[4].options.delay)<1e-6));h.director.cancel();await task;assert.equal(h.events.length,0);assert.equal(h.w.document.querySelector('.celestial-overlay'),null);}finally{h.dom.window.close();}
});
test('repeated activation is bounded; resize finishes captured choice; explicit supersession cancels old commit',async()=>{
 const h=fixture();try{const a=h.director.select('ocean',h.toggle,false);await h.director.select('neon',h.toggle,false);assert.equal(h.animations.length,1);h.w.dispatchEvent(new h.w.Event('resize'));await a;assert.deepEqual(h.events,['ocean']);const b=h.director.select('porcelain',h.toggle,false);h.director.cancel();await b;assert.deepEqual(h.events,['ocean']);assert.equal(h.w.document.querySelector('.celestial-overlay'),null);}finally{h.dom.window.close();}
});
test('reduced motion and absent animation APIs use direct existing commit path',async()=>{
 for(const config of [{reduced:true},{unsupported:true}]){const h=fixture(config);try{await h.director.select('ocean',h.toggle,true);assert.deepEqual(h.events,['ocean']);assert.equal(h.animations.length,0);assert.equal(h.w.document.querySelector('.celestial-overlay'),null);}finally{h.dom.window.close();}}
});

test('actual theme integration preserves independent Explorer settings and restores palette on storage failure',async()=>{
 const html=await readFile(new URL('../extension/shelf.html',import.meta.url),'utf8');
 const theme=await readFile(new URL('../extension/shelf-theme.js',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://fixture.test',runScripts:'outside-only'}),w=dom.window;
 const saved={shelfColorScheme:'midnight',shelfLastDarkTheme:'ocean',explorerThemeMode:'custom',explorerColorScheme:'porcelain'};
 let fail=false;const writes=[];
 w.matchMedia=()=>({matches:true});w.chrome={storage:{local:{get:async()=>({...saved}),set:async patch=>{writes.push(patch);if(fail)throw Error('Full');Object.assign(saved,patch);}},onChanged:{addListener(){}}}};
 try{
  w.eval(source);w.eval(theme);await tick();
  w.document.querySelector('[data-palette="neon"]').click();await tick();
  assert.equal(saved.shelfColorScheme,'neon');assert.equal(saved.explorerThemeMode,'custom');assert.equal(saved.explorerColorScheme,'porcelain');
  assert.ok(writes.every(p=>!('explorerThemeMode' in p)&&!('explorerColorScheme' in p)));
  fail=true;w.document.querySelector('[data-palette="ocean"]').click();await tick();
  assert.equal(w.document.documentElement.dataset.shelfTheme,'neon');assert.match(w.document.getElementById('status').textContent,/Could not save/);
  fail=false;w.document.getElementById('theme-toggle').click();await tick();assert.equal(saved.shelfColorScheme,'porcelain');
  w.document.getElementById('theme-toggle').click();await tick();assert.equal(saved.shelfColorScheme,'neon');
 }finally{dom.window.close();}
});

test('view changes finish safely, closing the panel never commits late, and touch reveals alternatives first',async()=>{
 const h=fixture();try{
  const event=new h.w.Event('pointerdown',{bubbles:true});Object.defineProperty(event,'pointerType',{value:'touch'});h.toggle.dispatchEvent(event);
  assert.equal(h.director.consumeTouch(),true);assert.equal(h.director.consumeTouch(),false);
  const route=h.director.select('ocean',h.toggle,false);h.w.dispatchEvent(new h.w.Event('hashchange'));await route;assert.deepEqual(h.events,['ocean']);
  const closing=h.director.select('neon',h.toggle,true);h.w.dispatchEvent(new h.w.Event('pagehide'));await closing;assert.deepEqual(h.events,['ocean']);assert.equal(h.w.document.querySelector('.celestial-overlay'),null);
 }finally{h.dom.window.close();}
});

test('analytical gravity, apex velocity, rebound energy and exit remain valid across Shelf sizes',()=>{
 const h=fixture();try{
  for(const width of [320,390,480])for(const height of [520,780,900])for(const hitY of [80,height*.3]){
   const m=h.w.RedownCelestial.flightModel({sx:width-55,sy:35,x:90,hitY,height,width});
   for(const part of [m.approach,m.rebound]){
    assert.ok(Math.abs(part.at(part.apexTime).vy)<1e-7);
    for(const t of [part.apexTime+.04,part.duration-.04]){
     const a=part.at(t),b=part.at(t+.01);assert.ok(a.g>0);assert.ok(b.vy>a.vy);assert.ok(b.y>a.y);
    }
   }
   assert.ok(m.at(m.impact-.001).vy>0);assert.ok(m.at(m.release+.001).vy<0);
   assert.ok(m.rebound.launchSpeed<m.approach.endSpeed);
   assert.ok(Math.abs(m.at(m.impact).x-90)<1e-7);assert.ok(Math.abs(m.at(m.impact).y-hitY)<1e-7);
   const compressed=m.at(m.impact+m.contactDuration/2);assert.ok(compressed.scaleY<1);assert.ok(compressed.scaleX>1);
   const apex=m.release+m.rebound.apexTime;
   assert.ok(m.duration>=1.7&&m.duration<=2.3+1e-10);
   assert.ok(m.at(apex-.025).y>m.at(apex).y);
   assert.ok(m.at(apex+.025).y>m.at(apex).y);
   assert.ok(m.at(apex-.1).vy<0);assert.ok(m.at(apex+.1).vy>0);
   assert.ok(m.at(m.duration).y>=height+39.99);
   assert.equal(m.frames.at(-1).offset,1);
  }
 }finally{h.dom.window.close();}
});

test('cancellation during flight and the post-exit pause cleans up and cannot persist',async()=>{
 for(const atPause of [false,true]){const h=fixture();try{
  const task=h.director.select('neon',h.toggle,false);h.animations[0].resolve();await tick();
  if(atPause){h.animations[1].resolve();await tick();}
  h.director.cancel();await task;
  assert.deepEqual(h.events,[]);assert.ok(h.animations.every(a=>a.cancelled));assert.equal(h.w.document.querySelector('.celestial-overlay'),null);
  assert.equal(h.toggle.classList.contains('celestial-selected'),false);
 }finally{h.dom.window.close();}}
});

test('lunar flight has smooth gravity bands and continuous contact and drift velocities',()=>{
 const h=fixture();try{
  for(const height of [520,780,900])for(const hitY of [80,188,270]){
   const m=h.w.RedownCelestial.flightModel({sx:335,sy:35,x:90,hitY,height,width:390}),eps=1e-7;
   for(const part of [m.approach,m.rebound])for(const segment of part.segments.slice(1)){
    const a=part.at(segment.time-eps),b=part.at(segment.time+eps);
    assert.ok(Math.abs(a.y-b.y)<.001);assert.ok(Math.abs(a.vy-b.vy)<.001);assert.ok(Math.abs(a.g-b.g)<.02);
   }
   for(const t of [m.impact,m.release]){
    const a=m.at(t-eps),b=m.at(t+eps);
    assert.ok(Math.abs(a.y-b.y)<.001);assert.ok(Math.abs(a.vy-b.vy)<.02);
    const left=(m.at(t).x-m.at(t-1e-5).x)/1e-5,right=(m.at(t+1e-5).x-m.at(t).x)/1e-5;
    assert.ok(Math.abs(left-right)<.02);
   }
   // Measure time within half a pixel of the apex: a moving, brief suspension.
   const near=part=>{let n=0;for(let t=0;t<part.duration;t+=.001)if(part.at(t).y-part.at(part.apexTime).y<.5)n++;return n*.001;};
   const first=near(m.approach),second=near(m.rebound);
   assert.ok(first>.01&&first<.15);assert.ok(second>first&&second<.2);
  }
 }finally{h.dom.window.close();}
});
