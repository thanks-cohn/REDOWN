import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {positionHistoryGoToLanding} from '../extension/beta/history-preview-landing.mjs';

const rect=(top,bottom)=>({top,bottom});
const viewport=()=>{const moves=[];return {innerHeight:800,moves,getComputedStyle:()=>({getPropertyValue:()=> '16px'}),scrollBy:o=>moves.push(o)};};

test('GO TO aligns ordinary preview with shared 16px Expand clearance',()=>{
  const win=viewport(),workspace={},preview={getBoundingClientRect:()=>rect(420,930)};
  positionHistoryGoToLanding({preview,workspace,viewport:win});
  assert.deepEqual(win.moves,[{top:146,behavior:'instant'}]);
});
test('GO TO keeps ordinary pane size and avoids unnecessary viewport scrolling',()=>{
  const win=viewport(),preview={getBoundingClientRect:()=>rect(250,740)};
  positionHistoryGoToLanding({preview,workspace:{},viewport:win});
  assert.deepEqual(win.moves,[]);
});
test('GO TO scrolls selected row inside the file list, not the whole Explorer page',()=>{
  const win=viewport(),list={scrollHeight:1200,clientHeight:300,scrollTop:50,getBoundingClientRect:()=>rect(200,500)};
  const files={closest:()=>list};
  const row={getBoundingClientRect:()=>rect(520,560),scrollIntoView:()=>{throw Error('scrolled entire document');}};
  positionHistoryGoToLanding({row,files,preview:{getBoundingClientRect:()=>rect(200,720)},workspace:{},viewport:win});
  assert.equal(list.scrollTop,110);assert.deepEqual(win.moves,[]);
});
test('GO TO with no side preview does not change document scroll',()=>{
  const win=viewport();positionHistoryGoToLanding({workspace:{},viewport:win});assert.deepEqual(win.moves,[]);
});

const background=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
function homeHarness(tabs){
  const events=[];
  const chrome={runtime:{getURL:path=>'chrome-extension://redown/'+path},tabs:{
    query:async args=>{events.push({op:'query',...args});return tabs;},
    update:async(id,options)=>{events.push({op:'update',id,...options});return {id,...options};},
    create:async options=>{events.push({op:'create',...options});return options;}
  }};
  const start=background.indexOf('async function openRedownHome(tab){');
  const end=background.indexOf('\nchrome.contextMenus.onClicked.addListener',start);
  assert.ok(start>=0&&end>start,'Go Home implementation must exist before native click handler');
  const context=vm.createContext({chrome});
  vm.runInContext(background.slice(start,end)+'\nthis.openHome=openRedownHome;',context);
  return {open:context.openHome,events};
}
test('Go Home reuses an existing nonsplit Explorer and clears stale GO TO deep links',async()=>{
  const url='chrome-extension://redown/beta/explorer.html';
  const h=homeHarness([{id:3,windowId:10,url:url+'#history=token',index:1,active:false},{id:5,windowId:10,url:'https://elsewhere.invalid'}]);
  await h.open({windowId:10});
  assert.equal(h.events[0].op,'query');assert.equal(h.events[0].windowId,10);
  assert.equal(h.events[1].op,'update');assert.equal(h.events[1].id,3);
  assert.equal(h.events[1].url,url);assert.equal(h.events[1].active,true);
  assert.equal(h.events.length,2);
});
test('Go Home does not hijack a split Explorer; opens normal home tab instead',async()=>{
  const url='chrome-extension://redown/beta/explorer.html';
  const h=homeHarness([{id:3,windowId:10,url,splitViewId:12}]);
  await h.open({windowId:10});
  assert.equal(h.events[1].op,'create');assert.equal(h.events[1].url,url);
  assert.equal(h.events[1].windowId,10);assert.equal(h.events[1].active,true);
});
test('native context menu registers Go Home instead of saved URL lookup action',()=>{
  assert.match(background,/id:"redown-go-home",parentId:ROOT_MENU_ID,title:"Go Home"/);
  assert.match(background,/if\(info.menuItemId==="redown-go-home"\)/);
  assert.doesNotMatch(background,/id:"redown-saved-urls",parentId:ROOT_MENU_ID/);
});
