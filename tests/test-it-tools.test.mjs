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
