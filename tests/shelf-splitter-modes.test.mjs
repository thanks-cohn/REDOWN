import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createFileApi} from '../extension/beta/file-api.mjs';
import {mountExplorer} from '../extension/shelf-explorer.mjs';
const tick=()=>new Promise(r=>setTimeout(r,35));
test('Full-range splitter retains virtual anchor at collapse, expands using fresh width, resets and toggles mode without changing path/selection',async()=>{
 const dom=new JSDOM('<section id="mini"></section>',{url:'https://fixture.invalid'}),w=dom.window,d=w.document;
 const old={chrome:globalThis.chrome,add:globalThis.addEventListener,remove:globalThis.removeEventListener};globalThis.chrome={storage:{onChanged:{addListener(){},removeListener(){}}}};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
 let instance,width=300;const source={accountId:'a',bucketName:'b'};
 try{
  instance=mountExplorer({host:d.getElementById('mini'),api:createFileApi({accounts:async()=>({accounts:[]}),list:async()=>({entries:Array.from({length:10000},(_,i)=>({key:`${String(i).padStart(5,'0')}.png`,size:500000})),cursor:''})}),storage:{get:async()=>({shelfExplorerV1:{folderWidth:36}}),set:async()=>{}}});await instance.setActive(true);await tick();
  const list=d.querySelector('.mini-list'),grip=d.querySelector('.mini-column-resize');Object.defineProperty(list,'clientWidth',{get:()=>width});Object.defineProperty(list,'clientHeight',{value:350});
  await instance.model.navigate(source);assert.equal(grip.getAttribute('aria-valuemin'),'0');assert.equal(grip.getAttribute('aria-valuemax'),'100');assert.equal(grip.getAttribute('aria-valuenow'),'50');
  const key=k=>grip.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
  list.scrollTop=30000;list.dispatchEvent(new w.Event('scroll'));await tick();const row=[...d.querySelectorAll('.mini-row')].find(n=>Number(n.dataset.index)>100);row.click();const selected=[...instance.model.state.selected],before=list.scrollTop,keys=[...d.querySelectorAll('.mini-row')].map(n=>n.dataset.key);
  key('End');width=0;await tick();assert.equal(grip.getAttribute('aria-valuenow'),'100');assert.equal(list.scrollTop,before);assert.deepEqual([...d.querySelectorAll('.mini-row')].map(n=>n.dataset.key),keys);
  width=600;key('Home');await tick();assert.equal(grip.getAttribute('aria-valuenow'),'0');assert.ok(list.scrollTop>before);assert.deepEqual([...instance.model.state.selected],selected);assert.equal(instance.model.state.source.bucketName,'b');assert.ok(d.querySelectorAll('.mini-row').length<40);
  key('ArrowRight');assert.equal(grip.getAttribute('aria-valuenow'),'5');await instance.setActive(true);assert.equal(grip.getAttribute('aria-valuenow'),'5','Duplicate route notifications must not reset a live split');grip.dispatchEvent(new w.MouseEvent('dblclick'));assert.equal(grip.getAttribute('aria-valuenow'),'50');
  d.querySelector('[data-action=grid]').click();assert.equal(d.querySelector('[data-action=grid]').textContent,'Detailed');assert.deepEqual([...instance.model.state.selected],selected);
  d.querySelector('[data-action=grid]').click();assert.equal(d.querySelector('[data-action=grid]').textContent,'Large Images');assert.deepEqual([...instance.model.state.selected],selected);assert.equal(instance.model.state.source.bucketName,'b');
 }finally{instance?.dispose();dom.window.close();Object.assign(globalThis,{chrome:old.chrome,addEventListener:old.add,removeEventListener:old.remove});}
});
