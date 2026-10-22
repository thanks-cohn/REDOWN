import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createCollector} from '../agent/explorer/api.mjs';
const code=await readFile('extension/public-addresses.js','utf8'),options=await readFile('extension/options.js','utf8');
const source={accountId:'account-private',bucketName:'bucket-private'};
const snapshot=(addresses)=>({...source,addresses});
const managed={kind:'managed',label:'Cloudflare R2',base:'https://pub-fixture.r2.dev/',state:'configured'};
const custom={kind:'custom',label:'Custom CDN',base:'https://cdn.example.com/',state:'configured'};
const worker={kind:'worker',label:'REDOWN Worker',base:'https://files.example.com/assets/',state:'configured'};
const tick=()=>new Promise(r=>setTimeout(r,0));
function harness({items=[managed],load,copy=async()=>{},width=1366,height=768}={}){
 const dom=new JSDOM('<button id="file">file</button><main></main>',{runScripts:'outside-only'}),w=dom.window,d=w.document;w.innerWidth=width;w.innerHeight=height;w.eval(code);
 const copied=[],states=[],events=[];const ui=w.RedownPublicAddresses.popover({document:d,load:load||(async()=>snapshot(items)),copy:async text=>{copied.push(text);return copy(text);},onState:(message,state)=>states.push({message,state}),onEvent:(context,stage,outcome,details)=>events.push({stage,outcome,details})});
 return {dom,w,d,ui,copied,states,events,show:(key='works/...2/chapter_1/001.webp',extra={})=>ui.show({source,key,name:'001.webp',point:{x:100,y:120},returnFocus:d.getElementById('file'),...extra})};
}
test('one configured URL: whole row copies full exact triple-dot path, stays open and marks Copied',async()=>{
 const h=harness();await h.show();const row=h.d.querySelector('.url-popover-row');assert.equal(row.disabled,false);assert.match(row.textContent,/accessibility not verified/);row.click();await tick();assert.deepEqual(h.copied,['https://pub-fixture.r2.dev/works/...2/chapter_1/001.webp']);assert.match(h.ui.element.textContent,/Copied!/);assert.equal(h.states.at(-1).state,'success');h.ui.close();h.dom.window.close();
});
test('all managed, multiple custom subdomains and Worker assets rows are independent and copy complete addresses',async()=>{
 const h=harness({items:[managed,custom,{...custom,base:'https://media.cdn.example.com/'},worker,custom]});await h.show('a//雪 #?%.txt');const rows=[...h.d.querySelectorAll('.url-popover-row')];assert.equal(rows.length,4);
 for(const row of rows){row.click();await tick();}
 assert.equal(h.copied[1],'https://cdn.example.com/a//%E9%9B%AA%20%23%3F%25.txt');assert.equal(h.copied[2],'https://media.cdn.example.com/a//%E9%9B%AA%20%23%3F%25.txt');assert.equal(h.copied[3],'https://files.example.com/assets/a//%E9%9B%AA%20%23%3F%25.txt');assert.ok(h.events.some(e=>e.details.endpoint==='worker.assets'));h.ui.close();h.dom.window.close();
});
test('disabled/private/pending/unknown endpoints are explained and cannot copy; unsafe share URLs are rejected',async()=>{
 const h=harness({items:[{...managed,state:'restricted'},{...custom,state:'needs-setup'},{...worker,state:'unknown'},...['https://api.cloudflare.com/client/v4','https://dash.cloudflare.com/','https://secret:token@cdn.example.com/','https://cdn.example.com/?token=secret','https://files.example.com/private/object','javascript:alert(1)'].map(base=>({...custom,base}))]});await h.show();const rows=[...h.d.querySelectorAll('.url-popover-row')];assert.equal(rows.length,3);assert.ok(rows.every(r=>r.disabled));rows.forEach(r=>r.click());assert.equal(h.copied.length,0);assert.match(h.ui.element.textContent,/No usable public URL/);assert.doesNotMatch(h.ui.element.textContent,/token=|client\/v4/);h.ui.close();h.dom.window.close();
});
test('empty, failed and wrong-bucket discovery produce useful explanations instead of blank dialogs',async()=>{
 for(const load of [async()=>snapshot([]),async()=>({...snapshot([custom]),bucketName:'other'}),async()=>{throw Error('PRIVATE_TOKEN');},async()=>({ok:false,error:'PRIVATE_TOKEN'})]){
  const h=harness({load});await h.show();assert.match(h.ui.element.textContent,/No public addresses|Could not load file URLs/);assert.doesNotMatch(h.ui.element.textContent,/PRIVATE_TOKEN/);h.ui.close();h.dom.window.close();
 }
});
test('clipboard failure has structured error and no false Copied state or raw browser error',async()=>{
 const h=harness({copy:async()=>{throw Error('SECRET browser detail');}});await h.show();h.d.querySelector('.url-popover-row').click();await tick();assert.match(h.ui.element.textContent,/Clipboard access was denied/);assert.doesNotMatch(h.ui.element.textContent,/Copied!|SECRET/);assert.equal(h.states.at(-1).state,'failed');assert.ok(h.events.some(e=>e.details.code==='EXPLORER_CLIPBOARD_FAILED'));h.ui.close();h.dom.window.close();
});
test('rapid switching and closed dialogs discard stale discovery and clipboard completion',async()=>{
 const waiting=[];let resolveCopy;const h=harness({load:()=>new Promise(r=>waiting.push(r)),copy:()=>new Promise(r=>resolveCopy=r)});
 const old=h.show('old.txt'),fresh=h.show('new.txt');waiting[1](snapshot([custom]));await fresh;waiting[0](snapshot([managed]));await old;assert.match(h.ui.element.textContent,/new.txt/);assert.doesNotMatch(h.ui.element.textContent,/old.txt/);
 h.d.querySelector('.url-popover-row').click();await tick();const count=h.states.length;h.ui.close();resolveCopy();await tick();assert.equal(h.states.length,count);assert.equal(h.ui.element,null);h.dom.window.close();
});
test('keyboard row navigation, focus restoration, outside dismiss and clamped placement fit narrow viewports',async()=>{
 const h=harness({items:[managed,custom,worker],width:390,height:300});await h.show(undefined,{point:{x:389,y:299}});const panel=h.ui.element;panel.getBoundingClientRect=()=>({width:360,height:240});h.w.dispatchEvent(new h.w.Event('resize'));assert.equal(panel.style.left,'22px');assert.equal(panel.style.top,'52px');
 const key=(name)=>h.d.activeElement.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:name,bubbles:true}));key('ArrowUp');assert.equal(h.d.activeElement.textContent.includes('REDOWN Worker'),true);key('Home');assert.match(h.d.activeElement.textContent,/Cloudflare R2/);key('End');assert.match(h.d.activeElement.textContent,/REDOWN Worker/);key('Escape');assert.equal(h.ui.element,null);assert.equal(h.d.activeElement.id,'file');
 await h.show();h.d.body.dispatchEvent(new h.w.Event('pointerdown',{bubbles:true}));assert.equal(h.ui.element,null);h.dom.window.close();
});
test('production URL adapter records redacted discovery and clipboard child operations without exposing URLs or keys',async()=>{
 const h=harness();const c=createCollector({context:'options'});c.setEnabled(true);h.w.RedownPublicAddresses=h.w.RedownPublicAddresses;
 h.w.redownExplorerBridge={collector:c,event:(id,stage,outcome,details)=>c.record(id,{stage,outcome,component:'options',...details})};h.w.workspaceTarget=source;h.w.explorerSource=()=>source;h.w.rootRow=()=>h.d.getElementById('file');h.w.setOperation=()=> 'ticket';h.w.finishOperation=()=>{};h.w.send=async message=>{assert.equal(message.type,'cfPublicAddresses');assert.equal(message.accountId,source.accountId);return snapshot([custom,worker]);};Object.defineProperty(h.w.navigator,'clipboard',{value:{writeText:async()=>{}}});
 h.w.eval(options.slice(options.indexOf('let explorerUrlPopover;'),options.indexOf('async function explorerUploadFiles(')));
 await h.w.copyItemUrl({id:'file',name:'秘密.txt',key:'secret/秘密.txt'});h.d.querySelector('.url-popover-row').click();await tick();await tick();
 const bundle=c.exportBundle();assert.ok(bundle.operations.some(o=>o.operation==='public.urls'));assert.ok(bundle.operations.some(o=>o.operation==='clipboard'&&o.parentId&&o.state==='confirmed'));assert.doesNotMatch(JSON.stringify(bundle),/secret\/|秘密|cdn.example|account-private|bucket-private/);h.w.urlPopover().close();h.dom.window.close();
});

test('context menu preserves one Get URL action, performs no eager discovery, and captures source and menu position',async()=>{
 const dom=new JSDOM('<div id="explorer-menu"></div><button id="file"></button>',{runScripts:'outside-only'}),w=dom.window;let calls=0,captured;
 Object.assign(w,{explorerUrlPopover:null,explorerDestinationMenus:null,destinationMenus:()=>({attach(){}}),$:id=>w.document.getElementById(id),hideExplorerMenu:()=>{w.document.getElementById('explorer-menu').hidden=true;},finishOperation(){},explorerSelected:new Set(['file']),selectedExplorerItems:()=>[item],explorerSource:()=>source,explorerClipboard:null,explorerAccounts:[],explorerBuckets:new Map(),workspacePrefix:'works/',rootRow:()=>w.document.getElementById('file'),copyItemUrl:async(value,settings)=>{calls++;captured={value,settings};},openExplorerItem:()=>{throw Error('must not preview');},deleteSelection(){},beginExplorerRename(){},showProperties(){},browseWorkspace(){},requestAnimationFrame:fn=>fn()});
 const item={id:'file',key:'works/...2/chapter_1/001.webp',name:'001.webp',folder:false};
 w.eval(options.slice(options.indexOf('function menuButton('),options.indexOf('let explorerDestinationMenus;')));w.eval(options.slice(options.indexOf('function showExplorerMenu('),options.indexOf('function hideExplorerMenu(')));
 w.showExplorerMenu(300,250,item);const buttons=[...w.document.querySelectorAll('button')].filter(b=>b.textContent==='Get URL');assert.equal(buttons.length,1);assert.equal(calls,0);buttons[0].click();await tick();assert.equal(calls,1);assert.equal(captured.settings.source.bucketName,source.bucketName);assert.equal(captured.settings.point.x,300);assert.equal(captured.settings.anchor,buttons[0]);assert.equal(buttons[0].getAttribute("aria-haspopup"),"menu");assert.equal(w.document.getElementById("explorer-menu").hidden,false);assert.equal(captured.value.key,item.key);assert.ok([...w.document.querySelectorAll('.menu-item')].some(b=>b.textContent==='Properties'));dom.window.close();
});

test('production stylesheet makes URL menu a visible fixed overlay above the context menu',async()=>{
 const html=await readFile('extension/options.html','utf8');const dom=new JSDOM(html);const panel=dom.window.document.createElement('section');panel.className='url-popover';dom.window.document.body.append(panel);const css=dom.window.getComputedStyle(panel);assert.equal(css.position,'fixed');assert.ok(Number(css.zIndex)>50);assert.equal(css.overflow,'auto');dom.window.close();
});
test('anchored submenu opens to the left near the viewport edge and ArrowLeft returns to its parent',async()=>{
 const h=harness({width:800});const anchor=h.d.getElementById('file');anchor.getBoundingClientRect=()=>({left:600,right:790,top:100});await h.show(undefined,{anchor,returnFocus:anchor});h.ui.element.getBoundingClientRect=()=>({width:420,height:200});h.w.dispatchEvent(new h.w.Event('resize'));assert.equal(h.ui.element.style.left,'176px');assert.equal(h.ui.element.getAttribute('role'),'menu');assert.equal(anchor.getAttribute('aria-expanded'),'true');h.d.activeElement.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(h.ui.element,null);assert.equal(h.d.activeElement,anchor);assert.equal(anchor.getAttribute('aria-expanded'),'false');h.dom.window.close();
});

test('actual Get URL parent click keeps context menu visible and opens a copyable child menu',async()=>{
 const h=harness();h.d.body.insertAdjacentHTML('beforeend','<div id="explorer-menu"></div>');
 Object.assign(h.w,{$:id=>h.d.getElementById(id),hideExplorerMenu:()=>{h.d.getElementById('explorer-menu').hidden=true;},finishOperation(){},copyItemUrl:(item,settings)=>h.show(item.key,settings)});
 h.w.eval(options.slice(options.indexOf('function menuButton('),options.indexOf('let explorerDestinationMenus;')));
 const button=h.w.urlMenuButton({key:'exact/...2/file.webp'},source,{x:100,y:100});h.d.getElementById('explorer-menu').append(button);button.click();await tick();
 assert.equal(h.d.getElementById('explorer-menu').hidden,false);assert.equal(h.ui.element.getAttribute('role'),'menu');assert.equal(button.getAttribute('aria-expanded'),'true');h.d.querySelector('.url-popover-row').click();await tick();assert.match(h.copied[0],/exact\/\.\.\.2\/file.webp$/);assert.match(h.ui.element.textContent,/Copied!/);h.ui.close();h.dom.window.close();
});
