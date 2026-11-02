import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html=await readFile(new URL('../extension/shelf.html',import.meta.url),'utf8');
const script=await readFile(new URL('../extension/shelf-destinations.js',import.meta.url),'utf8');
const css=await readFile(new URL('../extension/shelf.css',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function fixture(stored={},fine=true){
  const dom=new JSDOM(html,{url:'https://redown.invalid/shelf.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,events=[],reads=[];
  w.matchMedia=query=>({matches:fine&&query==='(hover: hover) and (pointer: fine)'});
  w.chrome={storage:{local:{
    get:async keys=>{reads.push(keys);return Object.fromEntries(keys.map(k=>[k,stored[k]]));},
    set:async patch=>{
      Object.assign(stored,patch);
      for(const fn of events)fn(Object.fromEntries(Object.entries(patch).map(([k,newValue])=>[k,{newValue}])), 'local');
    }
  },onChanged:{addListener:fn=>events.push(fn)}}};
  w.eval(script);
  const d=w.document;
  return {dom,w,d,stored,reads,slant:d.getElementById('slant-display-theme'),
    arrow:d.getElementById('slant-display-arrow'),arrowRow:d.getElementById('slant-arrow-row'),
    menus:[...d.querySelectorAll('.destinations-grid .destination-options')]};
}
function change(h,input,checked){
  input.checked=checked;
  input.dispatchEvent(new h.w.Event('change',{bubbles:true}));
}
const evt=(h,type)=>new h.w.MouseEvent(type,{bubbles:false,cancelable:true});

test('professional default has straight Right2Click heading, no slant, and no compass arrow',async()=>{
  const h=fixture();
  await settle();
  assert.equal(h.d.documentElement.dataset.destinationDisplay,'straight');
  assert.equal(h.d.documentElement.dataset.destinationArrow,'false');
  assert.equal(h.slant.checked,false);
  assert.equal(h.arrow.checked,false);
  assert.equal(h.arrowRow.hidden,true);
  assert.equal(h.d.querySelector('.destinations-straight-title').textContent,'Right2Click, Anywhere.');
  assert.equal(h.d.querySelector('.destinations-subtitle').textContent,'Your Clouds. Right Here.');
  assert.equal(h.d.querySelectorAll('.destinations-grid .destination-tile').length,3);
  assert.ok(h.d.querySelector('#beta-aesthetics > summary'));
  assert.equal(h.d.querySelector('#beta-aesthetics > summary').textContent.trim(),'Beta Aesthetics');
  assert.match(css,/:root\[data-destination-display="slant"\].*destinations-slant-title/);
  assert.match(css,/:root\[data-destination-display="slant"\]\[data-destination-arrow="true"\].*destinations-compass/);
  h.dom.window.close();
});

test('Slant Display Theme and its optional arrow persist independently, returning to straight leaves arrow hidden',async()=>{
  const saved={},h=fixture(saved);
  await settle();
  change(h,h.slant,true);await settle();
  assert.equal(saved.shelfDestinationDisplay,'slant');
  assert.equal(h.arrowRow.hidden,false);
  assert.equal(h.d.documentElement.dataset.destinationArrow,'false');
  change(h,h.arrow,true);await settle();
  assert.equal(saved.shelfDestinationArrow,true);
  assert.equal(h.d.documentElement.dataset.destinationArrow,'true');
  change(h,h.slant,false);await settle();
  assert.equal(saved.shelfDestinationDisplay,'straight');
  assert.equal(saved.shelfDestinationArrow,true,'remember optional arrow only for future slant');
  assert.equal(h.arrowRow.hidden,true);
  assert.equal(h.d.documentElement.dataset.destinationDisplay,'straight');
  const second=fixture(saved);await settle();
  assert.equal(second.slant.checked,false);
  assert.equal(second.arrow.checked,true);
  change(second,second.slant,true);await settle();
  assert.equal(second.arrowRow.hidden,false);
  assert.equal(second.d.documentElement.dataset.destinationArrow,'true');
  second.dom.window.close();h.dom.window.close();
});

test('three-dot options open on hover, allow travel to popup, and close after leaving popup',async()=>{
  const h=fixture(),[first,second]=h.menus;
  const dots=first.querySelector('summary'),popup=first.querySelector('.destination-options-menu');
  await settle();
  assert.equal(first.open,false);
  dots.dispatchEvent(evt(h,'mouseenter'));
  assert.equal(first.open,true);
  assert.equal(second.open,false);
  dots.dispatchEvent(evt(h,'mouseleave'));
  await delay(30);
  popup.dispatchEvent(evt(h,'mouseenter'));
  await delay(190);
  assert.equal(first.open,true,'crossing the gap must not close the popup');
  popup.dispatchEvent(evt(h,'mouseleave'));
  await delay(190);
  assert.equal(first.open,false,'leaving both areas dismisses automatically');
  first.querySelector('summary').dispatchEvent(evt(h,'mouseenter'));
  second.querySelector('summary').dispatchEvent(evt(h,'mouseenter'));
  assert.equal(first.open,false,'only one options popup at once');
  assert.equal(second.open,true);
  h.dom.window.close();
});

test('desktop clicking the dots cannot immediately close a popup that hover opened',async()=>{
  const h=fixture();
  const first=h.menus[0],dots=first.querySelector('summary');
  dots.click();
  assert.equal(first.open,false,'desktop click alone does not open the hover menu');
  dots.dispatchEvent(evt(h,'mouseenter'));
  dots.click();
  assert.equal(first.open,true,'clicking while hovered never toggles the popup closed');
  h.dom.window.close();
});

test('keyboard can focus, operate and Escape out; touch keeps native summary activation',async()=>{
  const h=fixture(),first=h.menus[0],dots=first.querySelector('summary');
  dots.focus();
  assert.equal(first.open,true);
  dots.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(first.open,false);
  h.dom.window.close();

  const touch=fixture({},false);
  const summary=touch.menus[0].querySelector('summary');
  summary.click();
  assert.equal(touch.menus[0].open,true);
  summary.click();
  assert.equal(touch.menus[0].open,false);
  touch.dom.window.close();
});

test('other Shelf windows can update Beta Aesthetics without a reload',async()=>{
  const h=fixture();
  await settle();
  const changes={shelfDestinationDisplay:{newValue:'slant'},shelfDestinationArrow:{newValue:true}};
  // Dispatch through the same storage notification route used by other REDOWN pages.
  const listeners=[];
  // A new minimal instance verifies the external-change contract via the registered hook.
  const d=new JSDOM(html,{runScripts:'outside-only'});
  d.window.matchMedia=()=>({matches:false});
  d.window.chrome={storage:{local:{get:async()=>({}),set:async()=>{}},onChanged:{addListener:fn=>listeners.push(fn)}}};
  d.window.eval(script);await settle();
  listeners[0](changes,'local');
  assert.equal(d.window.document.documentElement.dataset.destinationDisplay,'slant');
  assert.equal(d.window.document.documentElement.dataset.destinationArrow,'true');
  d.window.close();h.dom.window.close();
});
