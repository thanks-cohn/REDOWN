import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/shelf-celestial.js',import.meta.url),'utf8');
function fixture({reduced=false,unsupported=false}={}){
 const dom=new JSDOM('<button id="moon">Moon</button><section id="clouds-view"><span data-celestial-target>Future</span></section><section id="history-view"><span data-celestial-target>PERSONAL</span></section><section id="settings-view"><span data-celestial-target>HOME</span></section>',{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,events=[],animations=[];let palette='midnight';
 w.HTMLElement.prototype.getBoundingClientRect=function(){return this.hasAttribute('data-celestial-target')?{left:50,top:200,width:80,height:30}:{left:250,top:20,width:30,height:30};};
 if(!unsupported)w.Element.prototype.animate=function(frames,options){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const item={node:this,frames,options,finished,cancel(){reject(Error('cancelled'));},resolve};animations.push(item);return item;};
 w.eval(source);const toggle=w.document.getElementById('moon');
 const director=w.RedownCelestial({toggle,current:()=>palette,commit:async value=>{palette=value;events.push(value);director.refresh();},reducedMotion:()=>reduced});
 return {w,dom,director,toggle,events,animations,get palette(){return palette;}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('three alternatives exclude active palette; keyboard focus opens and Escape closes',()=>{
 const h=fixture();try{const buttons=[...h.w.document.querySelectorAll('.celestial-orb')];assert.equal(buttons.length,3);assert.ok(buttons.every(b=>b.dataset.palette!=='midnight'));h.toggle.focus();assert.ok(h.toggle.parentElement.classList.contains('celestial-open'));h.toggle.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(!h.toggle.parentElement.classList.contains('celestial-open'));}finally{h.dom.window.close();}
});
test('each view uses its rendered target; palette commits only after fall and pause; no overlays or active animations remain',async()=>{
 for(const view of ['clouds','history','settings']){const h=fixture();try{h.w.history.replaceState(null,'','#'+view);const button=h.w.document.querySelector('[data-palette="neon"]');const task=h.director.select('neon',button,false);assert.equal(h.events.length,0);h.animations[0].resolve();await tick();assert.equal(h.animations.length,2);h.animations[1].resolve();await tick();assert.equal(h.animations[2].node.textContent,view==='clouds'?'Future':view==='history'?'PERSONAL':'HOME');assert.equal(h.events.length,0);h.animations.at(-1).resolve();await tick();assert.equal(h.events.length,0);await task;assert.deepEqual(h.events,['neon']);assert.equal(h.w.document.querySelector('.celestial-overlay'),null);assert.equal(h.w.document.querySelectorAll('.celestial-orb').length,3);}finally{h.dom.window.close();}}
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
