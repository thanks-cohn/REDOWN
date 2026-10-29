import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/shelf-celestial.js',import.meta.url),'utf8');
function fixture({reduced=false,unsupported=false,width=390,height=780,targetTop=200}={}){
 const dom=new JSDOM('<button id="moon">Moon</button><section id="clouds-view"><span data-celestial-target>Future</span></section><section id="history-view"><span data-celestial-target>PERSONAL</span></section><section id="settings-view"><span data-celestial-target>HOME</span></section>',{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,events=[],animations=[];let palette='midnight';Object.defineProperty(w,'innerWidth',{value:width});Object.defineProperty(w,'innerHeight',{value:height});
 w.HTMLElement.prototype.getBoundingClientRect=function(){return this.hasAttribute('data-celestial-target')?{left:50,top:targetTop,width:80,height:30}:{left:250,top:20,width:30,height:30};};
 if(!unsupported)w.Element.prototype.animate=function(frames,options){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const item={node:this,frames,options,finished,cancel(){reject(Error('cancelled'));},resolve};animations.push(item);return item;};
 w.eval(source);const toggle=w.document.getElementById('moon');
 const director=w.RedownCelestial({toggle,current:()=>palette,commit:async value=>{palette=value;events.push(value);director.refresh();},reducedMotion:()=>reduced});
 return {w,dom,director,toggle,events,animations,get palette(){return palette;}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('three alternatives exclude active palette; keyboard focus opens and Escape closes',()=>{
 const h=fixture();try{const buttons=[...h.w.document.querySelectorAll('.celestial-orb')];assert.equal(buttons.length,3);assert.ok(buttons.every(b=>b.dataset.palette!=='midnight'));h.toggle.focus();assert.ok(h.toggle.parentElement.classList.contains('celestial-open'));h.toggle.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(!h.toggle.parentElement.classList.contains('celestial-open'));}finally{h.dom.window.close();}
});
test('each view uses its rendered target; palette commits only after both arcs and pause; no overlays or active animations remain',async()=>{
 for(const view of ['clouds','history','settings']){const h=fixture();try{h.w.history.replaceState(null,'','#'+view);const button=h.w.document.querySelector('[data-palette="neon"]');const task=h.director.select('neon',button,false);assert.equal(h.events.length,0);h.animations[0].resolve();await tick();assert.equal(h.animations.length,2);const approach=h.animations[1];assert.equal(approach.options.duration,840);assert.equal(approach.frames.length,61);assert.match(approach.frames.at(-1).transform,/translate\(-175px,153px\)/);assert.ok(approach.frames.some(f=>Number(f.transform.match(/,([-.\d]+)px/)[1])<0));h.animations[1].resolve();await tick();assert.equal(h.animations[2].node.textContent,view==='clouds'?'Future':view==='history'?'PERSONAL':'HOME');assert.equal(h.events.length,0);h.animations.at(-1).resolve();await tick();const departure=h.animations.at(-1);assert.equal(departure.options.duration,1020);assert.equal(departure.frames.length,61);const positions=departure.frames.map(f=>f.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px/).slice(1).map(Number));assert.ok(Math.min(...positions.map(p=>p[1]))<positions[0][1]);assert.ok(positions.at(-1)[1]>h.w.innerHeight-35);assert.ok(Math.abs(positions.at(-1)[0]-positions.at(-2)[0])>.1);assert.equal(h.events.length,0);departure.resolve();await tick();assert.equal(h.events.length,0);await task;assert.deepEqual(h.events,['neon']);assert.equal(h.w.document.querySelector('.celestial-overlay'),null);assert.equal(h.w.document.querySelectorAll('.celestial-orb').length,3);}finally{h.dom.window.close();}}
});
test('lunar prelude has a shape-clipped shimmer and circumference trace before travel',async()=>{
 const h=fixture();try{const task=h.director.select('porcelain',h.toggle,true);assert.ok(h.w.document.querySelector('.celestial-glint').parentElement.hasAttribute('clip-path'));assert.equal(h.animations.length,2);h.animations[1].resolve();await tick();assert.equal(h.animations[2].node.getAttribute('class'),'celestial-seal');h.director.cancel();await task;assert.equal(h.events.length,0);assert.equal(h.w.document.querySelector('.celestial-overlay'),null);}finally{h.dom.window.close();}
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

test('two curves adapt to Shelf dimensions and title heights without a vertical exit',async()=>{
 for(const width of [320,390,480])for(const height of [520,900]){
  const h=fixture({width,height,targetTop:height*.3});
  try{
   const task=h.director.select('ocean',h.toggle,false);
   h.animations[0].resolve();await tick();
   const first=h.animations.at(-1);first.resolve();await tick();
   h.animations.at(-1).resolve();await tick();
   const second=h.animations.at(-1);
   const xy=second.frames.map(f=>f.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px/).slice(1).map(Number));
   assert.ok(Math.min(...xy.map(p=>p[1]))<xy[0][1]);
   assert.ok(Math.abs(xy.at(-1)[0]-xy.at(-2)[0])>.1);
   assert.equal(xy.at(-1)[1],height+40-35);
   h.director.cancel();await task;assert.equal(h.events.length,0);
  }finally{h.dom.window.close();}
 }
});
