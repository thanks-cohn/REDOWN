import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const tick=()=>new Promise(r=>setTimeout(r,20));
async function boot(preference,reduced=false){
 const dom=new JSDOM(readFileSync('extension/shelf.html','utf8'),{url:'https://extension.invalid/shelf.html',runScripts:'outside-only'}),w=dom.window;
 const memory={shelfFilesEntranceV1:preference},animations=[];
 w.matchMedia=()=>({matches:reduced});
 w.Element.prototype.animate=function(frames){const record={element:this,frames,cancelled:false,cancel(){this.cancelled=true;}};animations.push(record);return record;};
 w.chrome={storage:{local:{get:async()=>memory,set:async v=>Object.assign(memory,v)},session:{get:async()=>({})},onChanged:{addListener(){}}},runtime:{getURL:p=>p,sendMessage:async()=>({ok:true,accounts:[]})},tabs:{create:async()=>({})}};
 w.eval(readFileSync('extension/shelf.js','utf8'));await tick();return {dom,w,memory,animations};
}
test('Files entrance defaults/legacy stay Normal; opt-in only animates explicit click and cancels on navigation',async()=>{
 for(const pref of [undefined,'legacy','normal','slide-up']){
  const x=await boot(pref);try{
   assert.equal(x.w.document.getElementById('files-entrance').value,pref==='slide-up'?'slide-up':'normal');
   assert.equal(x.w.document.getElementById('clouds-view').hidden,false);
   x.w.document.getElementById('nav-explorer').click();await tick();
   assert.equal(x.w.document.getElementById('explorer-view').hidden,false);
   assert.equal(x.animations.length,pref==='slide-up'?2:0);
   if(pref==='slide-up'){
    assert.equal(x.animations[0].element,x.w.document.querySelector('nav[aria-label="Shelf"]'));
    x.w.location.hash='#history';await tick();assert.ok(x.animations.every(a=>a.cancelled));
   }
  }finally{x.dom.window.close();}
 }
});
test('Files preference persists without navigating; reduced motion and deep links skip entrance',async()=>{
 const x=await boot('slide-up',true);try{
  const control=x.w.document.getElementById('files-entrance');control.value='normal';control.dispatchEvent(new x.w.Event('change'));await tick();
  assert.equal(x.memory.shelfFilesEntranceV1,'normal');assert.equal(x.w.location.hash,'');
  control.value='slide-up';control.dispatchEvent(new x.w.Event('change'));await tick();
  x.w.document.getElementById('nav-explorer').click();await tick();assert.equal(x.animations.length,0);
  x.w.location.hash='#settings';await tick();x.w.location.hash='#explorer';await tick();assert.equal(x.animations.length,0);
 }finally{x.dom.window.close();}
});

test('P0 reverse animates real Explorer and original navigation before committing destination; rapid reentry cancels',async()=>{
 const x=await boot('slide-up');try{
  const d=x.w.document,nav=d.querySelector('nav[aria-label=Shelf]'),panel=d.getElementById('explorer-view');
  nav.getBoundingClientRect=()=>({top:panel.hidden?200:40});panel.getBoundingClientRect=()=>({top:80,height:500});
  x.w.Element.prototype.animate=function(frames){const record={element:this,frames,cancelled:false,cancel(){this.cancelled=true;},finished:new Promise(()=>{})};x.animations.push(record);return record;};
  d.getElementById('nav-explorer').click();await tick();d.getElementById('nav-history').click();await tick();
  assert.equal(panel.hidden,false);assert.equal(x.w.location.hash,'#explorer');
  const reverse=x.animations.slice(-2);assert.equal(reverse[0].element,nav);assert.equal(reverse[1].element,panel);assert.equal(reverse[0].frames.at(-1).transform,'translateY(160px)');assert.ok(parseFloat(reverse[1].frames.at(-1).transform.slice(11))>0);
  d.getElementById('nav-explorer').click();await tick();assert.ok(reverse.every(a=>a.cancelled));assert.equal(d.querySelectorAll('nav[aria-label=Shelf]').length,1);assert.equal(panel.hidden,false);
  x.w.dispatchEvent(new x.w.Event('resize'));assert.ok(x.animations.slice(-2).every(a=>a.cancelled));
 }finally{x.dom.window.close();}
});

test('P0 Settings choice surfaces preserve native IDs, values, change contracts and stored preferences',async()=>{
 const x=await boot('normal');try{
  x.w.eval(readFileSync('extension/settings-choices.js','utf8'));const d=x.w.document;
  for(const select of d.querySelectorAll('#settings-view select')){
   if(select.options.length>4)continue;
   const surface=select.nextElementSibling;assert.equal(surface.getAttribute('role'),'group');assert.equal(surface.querySelectorAll('button').length,select.options.length);
   select.value=select.options.at?select.options.at(-1).value:select.options[select.options.length-1].value;
   assert.equal(surface.querySelector('button[aria-pressed=true]').textContent,select.selectedOptions[0].textContent);
  }
  const axis=d.getElementById('preview-navigation-axis');axis.nextElementSibling.querySelectorAll('button')[1].click();await tick();assert.equal(x.memory.previewNavigationAxisV1,'vertical');
  const entrance=d.getElementById('files-entrance');entrance.nextElementSibling.querySelectorAll('button')[1].click();await tick();assert.equal(x.memory.shelfFilesEntranceV1,'slide-up');
  assert.equal(d.querySelectorAll('#files-entrance').length,1);assert.ok(d.querySelectorAll('.settings-collection').length>=6);
 }finally{x.dom.window.close();}
});
