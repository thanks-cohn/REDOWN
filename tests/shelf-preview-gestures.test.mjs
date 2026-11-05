import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createFileApi} from '../extension/beta/file-api.mjs';
import {mountExplorer} from '../extension/shelf-explorer.mjs';
const tick=()=>new Promise(r=>setTimeout(r,25));
test('Preview gestures: select/Space/arrows read nothing; double-click and Enter use one dock, browse images and cancel stale reads',async()=>{
 const dom=new JSDOM('<section id="mini"></section>',{url:'https://fixture.invalid'}),w=dom.window,d=w.document,host=d.getElementById('mini');
 const old={chrome:globalThis.chrome,add:globalThis.addEventListener,remove:globalThis.removeEventListener};
 globalThis.chrome={storage:{onChanged:{addListener(){},removeListener(){}}}};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
 const calls=[],pending=[];let instance;
 const entries=[{key:'folder/',folder:true},{key:'a.png',size:300000},{key:'b.bin',size:1},{key:'c.png',size:300000},{key:'d.png',size:300000}];
 const api=createFileApi({accounts:async()=>({accounts:[]}),list:async()=>({entries,cursor:''}),preview:async(input,options)=>{calls.push(input.entry.key);return new Promise(resolve=>pending.push({key:input.entry.key,options,resolve}));}});
 try{
  instance=mountExplorer({host,api,storage:{get:async()=>({}),set:async()=>{}}});await instance.setActive(true);await tick();
  await instance.model.navigate({accountId:'a',bucketName:'b'});
  const row=key=>[...d.querySelectorAll('.mini-row')].find(n=>n.dataset.key===key),key=(node,k)=>node.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
  row('a.png').click();key(row('a.png'),' ');key(row('a.png'),'ArrowDown');await tick();assert.deepEqual(calls,[]);assert.equal(d.querySelector('.mini-preview').hidden,true);
  row('a.png').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));await tick();assert.deepEqual(calls,['a.png']);assert.equal(d.querySelector('.mini-window-preview').open,false);assert.equal(d.querySelectorAll('.mini-preview').length,1);
  key(row('a.png'),'ArrowDown');await tick();assert.deepEqual(calls,['a.png','c.png']);assert.equal(pending[0].options.signal.aborted,true);assert.deepEqual([...instance.model.state.selected],['c.png']);
  pending[1].resolve({url:'data:image/png;base64,new',type:'image/png'});await tick();pending[0].resolve({url:'data:image/png;base64,old',type:'image/png'});await tick();assert.match(d.querySelector('.mini-preview img').src,/new$/);
  const panel=d.querySelector('.mini-preview'),media=panel.querySelector('img');panel.style.height='143px';panel.getBoundingClientRect=()=>({height:143,top:200});
  d.querySelector('[data-action=expand-preview]').click();assert.equal(host.classList.contains('preview-expanded'),true);assert.equal(d.querySelector('[data-action=expand-preview]').getAttribute('aria-label'),'Restore preview');
  d.querySelector('[data-action=expand-preview]').click();assert.equal(panel.style.height,'143px');assert.equal(panel.querySelector('img'),media);assert.equal(calls.length,2);
  d.querySelector('[data-action=close-preview]').click();key(row('c.png'),'ArrowDown');await tick();assert.equal(calls.length,2);
  key(row('d.png'),'Enter');await tick();assert.equal(calls.at(-1),'d.png');
  await instance.setActive(false);assert.equal(pending.at(-1).options.signal.aborted,true);
 }finally{instance?.dispose();dom.window.close();Object.assign(globalThis,{chrome:old.chrome,addEventListener:old.add,removeEventListener:old.remove});}
});
