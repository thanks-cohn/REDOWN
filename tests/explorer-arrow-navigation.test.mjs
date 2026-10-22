import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
function harness(){
 const dom=new JSDOM('<div id="explorer" tabindex="0"><aside><button id="sidebar">Bucket</button></aside><input id="search"><div id="workspace-objects"></div><div contenteditable="true" id="editor">Draft</div><div role="menu"><button id="menu-button">Choice</button></div></div>',{runScripts:'outside-only'}),w=dom.window;
 w.eval(`var $=id=>document.getElementById(id);var explorerSelected=new Set(),explorerAnchor=-1,explorerPage=0,explorerPageSize=2,explorerSearchActive=false,explorerUrlPopover=null;
 var items=Array.from({length:5},(_,i)=>({id:'file-'+i,name:'File '+i,kind:'image'}));
 var sortedVisibleItems=()=>items;var selectedExplorerItems=()=>items.filter(x=>explorerSelected.has(x.id));
 var previewExplorerItem=async item=>{globalThis.lastPreview=item.id;};
 function renderFileItems(){const root=$('workspace-objects');root.replaceChildren();items.slice(explorerPage*2,explorerPage*2+2).forEach(item=>{const row=document.createElement('div');row.className='file-row';row.dataset.id=item.id;row.tabIndex=0;row.scrollIntoView=()=>{};row.onclick=e=>selectExplorerItem(item,items.indexOf(item),e);root.append(row);});}
 `);
 w.eval(source.slice(source.indexOf('async function selectSingleExplorerItem('),source.indexOf('async function navigatePreview(')));
 w.eval(source.slice(source.indexOf('function selectExplorerItem('),source.indexOf('async function openExplorerItem(')));
 const start=source.indexOf('  $("explorer").onkeydown = (e) => {');w.eval(source.slice(start,source.indexOf('\n}\nasync function navigateHistory',start)));
 w.eval('renderFileItems();');return {dom,w,d:w.document};
}
test('clicking a replaced row retains focus; arrows iterate files across pages without scrolling the sidebar',async()=>{
 const {dom,w,d}=harness();d.querySelector('.file-row').click();assert.equal(d.activeElement.dataset.id,'file-0');
 for(const expected of ['file-1','file-2','file-3','file-4','file-4']){
  const e=new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});d.activeElement.dispatchEvent(e);await Promise.resolve();
  assert.equal(e.defaultPrevented,true);assert.equal(d.activeElement.dataset.id,expected);assert.equal(w.lastPreview,expected);
 }
 const up=new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true});d.activeElement.dispatchEvent(up);await Promise.resolve();assert.equal(d.activeElement.dataset.id,'file-3');
 assert.notEqual(d.activeElement,d.getElementById('sidebar'));dom.window.close();
});
test('inputs, editable text, menus and handled events retain their keyboard ownership',()=>{
 const {dom,w,d}=harness();d.querySelector('.file-row').click();
 for(const id of ['search','editor','menu-button']){const el=d.getElementById(id);el.focus();const e=new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});el.dispatchEvent(e);assert.equal(e.defaultPrevented,false);assert.equal(d.activeElement,el);}
 const e=new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});e.preventDefault();d.getElementById('explorer').dispatchEvent(e);assert.equal(w.lastPreview,'file-0');dom.window.close();
});
