import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWindowPreview} from '../extension/beta/window-preview.mjs';
function fixture(request){
 const dom=new JSDOM('<button id="opener">Open</button><aside><img src="blob:side"></aside><dialog tabindex="-1"></dialog>',{pretendToBeVisual:true});const {document:d}=dom.window,dialog=d.querySelector('dialog'),revoked=[];
 dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>{dialog.removeAttribute('open');dialog.dispatchEvent(new dom.window.Event('close'));};
 const entries=['a.jpg','b.jpg','c.jpg'].map(key=>({key,displayName:key}));let paused=0;
 const surface=createWindowPreview({document:d,dialog,request,previewType:key=>key.endsWith('.jpg')?'image/jpeg':null,getContext:()=>({accountId:'a',bucketName:'b',prefix:''}),getItems:()=>entries,pauseSide:()=>paused++,urls:{revokeObjectURL:url=>revoked.push(url)}});
 d.querySelector('#opener').focus();return {dom,d,dialog,revoked,surface,entries,get paused(){return paused;}};
}
test('window close preserves underlying side DOM and restores focus, across all side states',async()=>{
 for(const state of ['open','minimized','closed']){
 const f=fixture(async()=>({data:{url:'blob:window',type:'image/jpeg'}})),side=f.d.querySelector('aside'),img=side.firstChild;side.dataset.state=state;side.hidden=state==='closed';side.scrollTop=45;
 await f.surface.open(f.entries[0]);assert.ok(f.dialog.open);assert.equal(side.firstChild,img);assert.equal(f.paused,1);
 f.surface.close();assert.equal(side.dataset.state,state);assert.equal(side.hidden,state==='closed');assert.equal(side.scrollTop,45);assert.equal(img.src,'blob:side');assert.deepEqual(f.revoked,['blob:window']);assert.equal(f.d.activeElement.id,'opener');f.dom.window.close();
 }
});
test('late requests are aborted and their URLs cannot replace the newest window',async()=>{
 let release,signal;const f=fixture(async(_op,input,options)=>input.entry.key==='a.jpg'?new Promise(resolve=>{signal=options.signal;release=()=>resolve({data:{url:'blob:old',type:'image/jpeg'}});}):{data:{url:'blob:new',type:'image/jpeg'}});
 const old=f.surface.open(f.entries[0]);await f.surface.open(f.entries[1]);assert.ok(signal.aborted);release();await old;assert.equal(f.dialog.querySelector('img').src,'blob:new');assert.deepEqual(f.revoked,['blob:old']);f.surface.close();assert.deepEqual(f.revoked,['blob:old','blob:new']);f.dom.window.close();
});
test('Lightbox closes only the top viewing presentation, then Escape closes the window',async()=>{
 const f=fixture(async()=>({data:{url:'blob:image',type:'image/jpeg'}}));await f.surface.open(f.entries[0]);const img=f.dialog.querySelector('img');f.dialog.querySelector('[data-lightbox]').click();assert.ok(f.dialog.classList.contains('window-lightbox'));
 const escape=()=>f.d.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));escape();assert.ok(f.dialog.open);assert.equal(f.dialog.querySelector('img'),img);assert.equal(f.revoked.length,0);escape();assert.ok(!f.dialog.open);assert.deepEqual(f.revoked,['blob:image']);f.dom.window.close();
});
test('side-only Lightbox cancel closes modal without touching the side image',async()=>{
 const f=fixture(async()=>({data:{url:'blob:image',type:'image/jpeg'}}));await f.surface.open(f.entries[0],{lightbox:true});f.dialog.dispatchEvent(new f.dom.window.Event('cancel',{cancelable:true}));assert.ok(!f.dialog.open);assert.equal(f.d.querySelector('aside img').src,'blob:side');f.dom.window.close();
});

test('closing pending modal aborts its read and revokes late results',async()=>{
 let release,signal;const f=fixture(async(_op,_input,options)=>new Promise(resolve=>{signal=options.signal;release=()=>resolve({data:{url:'blob:late',type:'image/jpeg'}});}));const pending=f.surface.open(f.entries[0]);f.surface.close();assert.equal(signal.aborted,true);release();await pending;assert.deepEqual(f.revoked,['blob:late']);assert.equal(f.dialog.querySelector('img'),null);f.dom.window.close();
});
test('window audio cleanup unloads only modal media and pauses side once',async()=>{
 const f=fixture(async()=>({data:{url:'blob:audio',type:'audio/mpeg'}}));let pauses=0,loads=0;f.dom.window.HTMLMediaElement.prototype.pause=function(){pauses++;};f.dom.window.HTMLMediaElement.prototype.load=function(){loads++;};await f.surface.open(f.entries[0]);assert.ok(f.dialog.querySelector('audio'));f.surface.close();assert.equal(pauses,1);assert.equal(loads,1);assert.equal(f.paused,1);assert.equal(f.d.querySelector('aside img').src,'blob:side');f.dom.window.close();
});
