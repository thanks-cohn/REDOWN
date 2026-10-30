import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {parseUrlList} from '../extension/beta/url-list.mjs';
import {createBreadcrumbs,orderedBreadcrumbPath} from '../extension/beta/standard-breadcrumbs.mjs';
import {installRemoteDialog} from '../extension/beta/remote-dialog.mjs';
const html=await readFile(new URL('../extension/beta/explorer.html',import.meta.url),'utf8');
test('URL list preserves source lines, handles BOM, CRLF, blanks, comments and canonical duplicates',()=>{
 const r=parseUrlList('\uFEFF# list\r\n https://example.com/a \r\n\r\nhttps://EXAMPLE.com/a\nhttp://example.com/b\nfile:///secret\nhttps://user:pass@example.com\nnot a URL\nhttps://example.com/a b');
 assert.equal(r.total,7);assert.deepEqual(r.entries,[{line:2,url:'https://example.com/a'},{line:5,url:'http://example.com/b'}]);assert.equal(r.duplicates[0].line,4);assert.deepEqual(r.invalid.map(x=>x.line),[6,7,8,9]);
});
test('breadcrumb presentation compresses actual container width, preserves hierarchy and exact Unicode keys',()=>{
 const dom=new JSDOM('<nav></nav>',{pretendToBeVisual:true}),w=dom.window,host=w.document.querySelector('nav');let width=250;
 Object.defineProperty(host,'clientWidth',{get:()=>width});w.HTMLElement.prototype.getBoundingClientRect=function(){return {width:this.classList.contains('rd-crumb-unit')?70:0};};
 const source={bucketName:'Storage',prefix:'雪//Creative/Collection/Photography/Portfolio/'},path=orderedBreadcrumbPath(source),calls=[];
 const view=createBreadcrumbs(host,(entry,source)=>calls.push([entry,source]));view.update(path,source);
 assert.deepEqual([...host.querySelectorAll('.rd-crumb-menu button')].map(e=>e.textContent),['雪','Creative','Collection']);
 host.querySelector('.rd-crumb-menu button').click();assert.equal(calls[0][0].prefix,'雪//');assert.equal(calls[0][1],source);
 assert.equal(path[2].prefix,'雪//Creative/');assert.equal(path.at(-1).prefix,source.prefix);assert.equal(host.querySelector('[aria-current]').textContent,'Portfolio');
 width=1000;view.update(path,{...source,accountId:'changed'});assert.equal(host.querySelector('details'),null);assert.equal(host.querySelectorAll('button').length,6);view.destroy();dom.window.close();
});
function remoteFixture(responses){const dom=new JSDOM(html,{pretendToBeVisual:true}),d=dom.window.document,calls=[],signal=new AbortController();let destination={bucketName:'fixture',accountId:'fixture',prefix:'a/'};
 const ui=installRemoteDialog({document:d,api:{run:async(op,input)=>{calls.push([op,input]);return responses.shift()||{state:'completed'};}},openModal:el=>el.setAttribute('open',''),run:async fn=>fn(signal.signal),status(){},getDestination:()=>destination,isBusy:()=>false});
 return {dom,d,calls,signal,ui,setDestination:v=>destination=v};}
test('URL approval uses snapshotted destination, submits sequentially, and never retries an uncertain write',async()=>{
 const f=remoteFixture([{state:'completed'},{state:'uncertain',error:'Inspect destination'}]);f.ui.open();const input=f.d.querySelector('#remote-single');input.value='https://example.com/a\nhttps://example.com/b';
 // File input is parsed as text. Simulate selected UTF-8 list with a File-like object.
 const picker=f.d.querySelector('#remote-list');Object.defineProperty(picker,'files',{value:[{name:'list.txt',size:100,text:async()=> 'https://example.com/a\nhttps://example.com/b\nhttps://example.com/c'}]});await picker.onchange();
 assert.equal(f.calls.length,0);assert.equal(f.d.querySelector('#remote-submit').disabled,false);f.setDestination({bucketName:'other',prefix:''});
 await f.d.querySelector('#remote-form').onsubmit({preventDefault(){}});assert.equal(f.calls.length,2);assert.equal(f.calls[0][1].destination.bucketName,'fixture');assert.match(f.d.querySelector('#remote-summary').textContent,/1 completed.*1 pending.*1 uncertain/);assert.equal(f.d.querySelector('#remote-export').hidden,false);f.dom.window.close();
});
test('cancelled pending sources are not submitted; invalid list cannot be approved',async()=>{
 const f=remoteFixture([]);f.ui.open();const input=f.d.querySelector('#remote-single');input.value='javascript:alert(1)';input.oninput();assert.equal(f.d.querySelector('#remote-submit').disabled,true);
 input.value='https://example.com/a';input.oninput();f.signal.abort();await f.d.querySelector('#remote-form').onsubmit({preventDefault(){}});assert.equal(f.calls.length,0);assert.match(f.d.querySelector('#remote-summary').textContent,/1 cancelled/);f.dom.window.close();
});
