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
