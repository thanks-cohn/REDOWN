import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/explorer-destination-menu.js',import.meta.url),'utf8');
function harness(loadPage=async()=>({folders:[],cursor:''})){
 const dom=new JSDOM('<div id="explorer-menu" role="menu"></div>',{runScripts:'outside-only'});dom.window.eval(source);const choices=[],errors=[];
 const menus=dom.window.RedownDestinationMenus.create({document:dom.window.document,loadPage,onChoose:async(...args)=>choices.push(args),onError:e=>errors.push(e),viewport:()=>({width:800,height:600})});
 const root=dom.window.document.getElementById('explorer-menu');
 const attach=operation=>menus.attach(root,{operation,accounts:[{id:'a',name:'Account'}],buckets:new Map([['a',[{name:'current'},{name:'archive'}]]]),source:{accountId:'a',bucketName:'current',prefix:'work/'},items:[{key:'work/file.txt'}]});
 const buttons=()=>[...dom.window.document.querySelectorAll('.explorer-submenu')].at(-1)?.querySelectorAll('button');
 return {dom,menus,root,attach,choices,errors,buttons};
}
test('Move to and Copy to expose buckets then arbitrary folder levels, retaining exact prefixes',async()=>{
 const reads=[];const h=harness(async target=>{reads.push(target);return {folders:target.prefix.split('/').filter(Boolean).length<5?[{name:'next',prefix:target.prefix+'next/'}]:[],cursor:''};});
 h.attach('copy');assert.equal(reads.length,0);await h.root.querySelector('button').onclick({stopPropagation(){}});
 assert.equal(h.buttons().length,2);assert.match(h.buttons()[0].textContent,/current/);
 await h.buttons()[1].onclick({stopPropagation(){}});assert.equal(reads.length,1);
 for(let i=0;i<5;i++)await [...h.buttons()].find(b=>b.textContent==='next ›').onclick({stopPropagation(){}});
 await [...h.buttons()].find(b=>b.textContent==='Copy here').onclick({stopPropagation(){}});
 assert.equal(h.choices[0][0],'copy');assert.equal(h.choices[0][1].bucketName,'archive');assert.equal(h.choices[0][1].prefix,'next/'.repeat(5));assert.equal(h.dom.window.document.querySelectorAll('.explorer-submenu').length,0);h.dom.window.close();
});
test('current bucket remains available for sibling destinations and same-folder choice is disabled',async()=>{
 const h=harness(async t=>({folders:t.prefix===''?[{name:'work',prefix:'work/'},{name:'sibling',prefix:'sibling/'}]:[],cursor:''}));h.attach('move');await h.root.querySelector('button').onclick({stopPropagation(){}});await h.buttons()[0].onclick({stopPropagation(){}});
 await [...h.buttons()].find(b=>b.textContent==='work ›').onclick({stopPropagation(){}});assert.equal([...h.buttons()].find(b=>b.textContent==='Move here').disabled,true);
 h.menus.close();await h.root.querySelector('button').onclick({stopPropagation(){}});await h.buttons()[0].onclick({stopPropagation(){}});await [...h.buttons()].find(b=>b.textContent==='sibling ›').onclick({stopPropagation(){}});await [...h.buttons()].find(b=>b.textContent==='Move here').onclick({stopPropagation(){}});assert.equal(h.choices[0][1].prefix,'sibling/');h.dom.window.close();
});
test('folder pages append via More folders and closed menus ignore late replies',async()=>{
 let release;const h=harness(async t=>t.cursor?{folders:[{name:'second',prefix:'second/'}],cursor:''}:{folders:[{name:'first',prefix:'first/'}],cursor:'next'});h.attach('copy');await h.root.querySelector('button').onclick({stopPropagation(){}});await h.buttons()[1].onclick({stopPropagation(){}});await [...h.buttons()].find(b=>b.textContent==='More folders…').onclick({stopPropagation(){}});assert.ok([...h.buttons()].some(b=>b.textContent==='first ›'));assert.ok([...h.buttons()].some(b=>b.textContent==='second ›'));h.menus.close();h.dom.window.close();
 const stale=harness(()=>new Promise(r=>release=r));stale.attach('copy');await stale.root.querySelector('button').onclick({stopPropagation(){}});const loading=stale.buttons()[1].onclick({stopPropagation(){}});stale.menus.close();release({folders:[],cursor:''});await loading;assert.equal(stale.dom.window.document.querySelectorAll('.explorer-submenu').length,0);stale.dom.window.close();
});
test('keyboard arrows navigate menus and Escape returns to parent without changing Explorer',async()=>{
 const h=harness();h.attach('move');const owner=h.root.querySelector('button');await owner.onclick({stopPropagation(){}});const first=h.buttons()[0];first.focus();first.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(h.dom.window.document.activeElement,h.buttons()[1]);h.buttons()[1].dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(h.dom.window.document.activeElement,owner);assert.equal(owner.getAttribute('aria-expanded'),'false');h.dom.window.close();
});
test('failed lazy folder reads offer retry and never execute a transfer',async()=>{
 let fail=true;const h=harness(async()=>{if(fail)throw Error('network');return {folders:[],cursor:''};});h.attach('move');await h.root.querySelector('button').onclick({stopPropagation(){}});await h.buttons()[0].onclick({stopPropagation(){}});assert.equal(h.buttons()[0].textContent,'Retry');assert.equal(h.choices.length,0);fail=false;await h.buttons()[0].onclick();assert.equal(h.buttons()[0].textContent,'Move here');h.dom.window.close();
});
