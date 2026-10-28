import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createGuide} from '../extension/beta/guided-interaction.mjs';
import {installTestItTools} from '../extension/beta/test-it-tools.mjs';
const html=readFileSync(new URL('../extension/beta/explorer.html',import.meta.url),'utf8');
function fixture(){return new JSDOM(html,{pretendToBeVisual:true});}
test('drop-up reuses unique action buttons, dismisses, and supports keyboard focus without running actions',()=>{
 const dom=fixture(),doc=dom.window.document,button=doc.querySelector('#test-it-tools-button'),menu=doc.querySelector('#test-it-tools-menu');
 let calls=[];for(const id of ['test-it','test-it-export','test-it-restart','test-it-cleanup']){assert.equal(doc.querySelectorAll('#'+id).length,1);doc.getElementById(id).onclick=()=>calls.push(id);}
 assert.equal(doc.querySelector('#take-tour').parentElement.id,'explorer-menu');
 installTestItTools(doc);button.click();assert.equal(menu.hidden,false);assert.equal(doc.activeElement.id,'test-it');
 const key=k=>doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
 key('ArrowUp');assert.equal(doc.activeElement.id,'test-it-cleanup');key('Home');key('ArrowDown');assert.equal(doc.activeElement.id,'test-it-export');key('Escape');assert.equal(menu.hidden,true);assert.equal(doc.activeElement,button);assert.deepEqual(calls,[]);
 for(const id of ['test-it','test-it-export','test-it-restart','test-it-cleanup']){button.click();doc.getElementById(id).click();assert.equal(menu.hidden,true);}assert.deepEqual(calls,['test-it','test-it-export','test-it-restart','test-it-cleanup']);
 button.click();button.click();assert.equal(menu.hidden,true);button.click();doc.body.click();assert.equal(menu.hidden,true);
 button.click();doc.querySelector('#refresh').focus();assert.equal(menu.hidden,true);dom.window.close();
});
test('only gripper moves Test It, pointer offset and step position survive, resize clamps and controls work',()=>{
 const dom=fixture(),doc=dom.window.document,win=dom.window;
 let exited=0;const guide=createGuide({document:doc,draggable:true,steps:[{title:'One',text:'One'},{title:'Two',text:'Two'}],onExit:()=>exited++});guide.start();
 const card=doc.querySelector('.guide-card'),grip=card.querySelector('.guide-grip');assert.equal(grip.textContent,'⠿');assert.equal(doc.querySelector('#test-it-tools-menu .guide-grip'),null);
 card.getBoundingClientRect=()=>({left:parseFloat(card.style.left),top:parseFloat(card.style.top),width:340,height:260});grip.setPointerCapture=()=>{};
 const pointer=(target,type,x,y)=>{const event=new win.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{button:0,pointerId:1,clientX:x,clientY:y});target.dispatchEvent(event);};
 const start={left:parseFloat(card.style.left),top:parseFloat(card.style.top)};
 pointer(card,'pointerdown',100,100);pointer(card,'pointermove',0,0);assert.equal(parseFloat(card.style.left),start.left);
 pointer(grip,'pointerdown',start.left+10,start.top+10);pointer(grip,'pointermove',start.left+10,start.top+10);assert.equal(parseFloat(card.style.left),start.left);
 pointer(grip,'pointermove',start.left-90,start.top-70);pointer(grip,'pointerup',0,0);assert.equal(parseFloat(card.style.left),start.left-100);
 const moved=card.style.left;card.querySelector('[data-guide-next]').click();assert.equal(card.style.left,moved);card.querySelector('[data-guide-back]').click();assert.equal(card.style.left,moved);
 grip.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));assert.equal(parseFloat(card.style.left),parseFloat(moved)-10);
 Object.defineProperty(win,'innerWidth',{value:360,configurable:true});Object.defineProperty(win,'innerHeight',{value:300,configurable:true});win.dispatchEvent(new win.Event('resize'));
 return new Promise(resolve=>win.requestAnimationFrame(()=>{assert.equal(card.style.left,'10px');assert.ok(parseFloat(card.style.top)<=30);card.querySelector('[data-guide-exit]').click();assert.equal(exited,1);assert.equal(doc.querySelector('.guide-card'),null);dom.window.close();resolve();}));
});
test('Tour has no gripper by default',()=>{const dom=fixture();const guide=createGuide({document:dom.window.document,steps:[{title:'Tour',text:'Tour'}]});guide.start();assert.equal(dom.window.document.querySelector('.guide-grip'),null);guide.stop();dom.window.close();});

for(const corner of ['nw','ne','sw','se'])test('corner '+corner+' resizes independently of grip, clamps viewport and preserves dimensions',()=>{
 const dom=new JSDOM(html,{pretendToBeVisual:true,url:'https://fixture.invalid'}),doc=dom.window.document,w=dom.window;
 const guide=createGuide({document:doc,draggable:true,steps:[{title:'Resize',text:'Instructions'},{title:'Next',text:'More instructions'}]});guide.start();
 const card=doc.querySelector('.test-it-card');card.getBoundingClientRect=()=>{const left=parseFloat(card.style.left),top=parseFloat(card.style.top),width=parseFloat(card.style.width),height=parseFloat(card.style.height);return {left,top,width,height,right:left+width,bottom:top+height};};
 // Move into the middle to exercise each anchored corner.
 card.style.left='200px';card.style.top='150px';const before=card.getBoundingClientRect(),handle=card.querySelector('[data-resize-corner="'+corner+'"]');handle.setPointerCapture=()=>{};
 const pointer=(type,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{button:0,pointerId:11,clientX:x,clientY:y});handle.dispatchEvent(e);};
 pointer('pointerdown',0,0);pointer('pointermove',corner.includes('w')?-30:30,corner.includes('n')?-30:30);pointer('pointerup',0,0);
 assert.equal(parseFloat(card.style.width),before.width+30);assert.equal(parseFloat(card.style.height),before.height+30);const size=[card.style.width,card.style.height];card.querySelector('[data-guide-next]').click();assert.deepEqual([card.style.width,card.style.height],size);
 assert.equal(card.querySelector('.guide-grip').innerHTML,'<span aria-hidden="true">⠿</span>');assert.ok(card.querySelector('[data-guide-exit]'));assert.ok(card.querySelector('[data-guide-next]'));guide.stop();guide.start();assert.deepEqual([doc.querySelector('.test-it-card').style.width,doc.querySelector('.test-it-card').style.height],size);
 guide.stop();dom.window.close();
});
test('fullscreen preview bounds cannot shrink Test It and narrow viewport keeps panel dimensions usable',()=>{
 const dom=fixture(),doc=dom.window.document,w=dom.window;const preview=doc.querySelector('#preview-dialog');preview.setAttribute('open','');const target=doc.querySelector('#preview-content');target.getBoundingClientRect=()=>({left:0,top:0,right:1024,bottom:768,width:1024,height:768});
 const guide=createGuide({document:doc,draggable:true,steps:[{title:'Lightbox',text:'Readable instructions',target:'#preview-content'}]});guide.start();const card=doc.querySelector('.test-it-card');assert.equal(card.parentElement,preview);assert.equal(card.style.height,'480px');assert.equal(card.style.maxHeight,'748px');
 Object.defineProperties(w,{innerWidth:{value:360},innerHeight:{value:400}});w.dispatchEvent(new w.Event('resize'));
 return new Promise(resolve=>w.requestAnimationFrame(()=>{assert.equal(card.style.width,'340px');assert.equal(card.style.height,'380px');assert.ok(parseFloat(card.style.top)>=10);guide.stop();dom.window.close();resolve();}));
});

test('guide follows actual modal opening order rather than HTML order and restores the prior modal',()=>{
 const dom=fixture(),doc=dom.window.document,w=dom.window;
 const preview=doc.querySelector('#preview-dialog'),confirmation=doc.querySelector('#dialog');
 const guide=createGuide({document:doc,draggable:true,steps:[{title:'Select',text:'Approve the selected copy',target:'#files',action:'confirmed'}]});guide.start();
 const open=modal=>{modal.setAttribute('open','');doc.dispatchEvent(new w.CustomEvent('redown:modal-open',{detail:{modal}}));};
 open(preview);assert.equal(doc.querySelector('.guide-card').parentElement,preview);
 // The confirmation appears FIRST in HTML but LAST in the native top layer.
 open(confirmation);const card=doc.querySelector('.guide-card');assert.equal(card.parentElement,confirmation);
 const input=confirmation.querySelector('input');input.focus();assert.equal(doc.activeElement,input);
 assert.equal(card.querySelector('.guide-grip').textContent,'⠿');assert.equal(card.querySelectorAll('.guide-resize').length,4);
 confirmation.removeAttribute('open');confirmation.dispatchEvent(new w.Event('close'));
 assert.equal(card.parentElement,preview);preview.removeAttribute('open');preview.dispatchEvent(new w.Event('close'));assert.equal(card.parentElement,doc.body);
 guide.stop();dom.window.close();
});
