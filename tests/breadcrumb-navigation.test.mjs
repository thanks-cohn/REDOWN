import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const code=readFileSync(new URL('../extension/beta/breadcrumb-navigation.js',import.meta.url),'utf8');
function fixture(settings={}){
 const dom=new JSDOM('<button id="outside">Outside</button><nav id="nav"></nav>',{runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;w.eval(code);const api=w.RedownNavigation,host=w.document.querySelector('nav'),navigations=[],saved=[];
 const location={accountId:'a',bucketName:'Photography',prefix:'Architectural Projects/Modern Buildings/Brutalism/Personal Collections/Creative Archives/Research Projects/Final Portfolio/'};
 let contract={current:location,hierarchy:api.model(location),settings,onNavigate:e=>navigations.push(e),onPreferencesChange:next=>{contract={...contract,settings:next};saved.push(next);}};
 const slot=api.createSlot(host,contract);return {dom,w,api,host,location,slot,navigations,saved,update(){slot.update(contract);},close(){slot.destroy();dom.window.close();}};
}
function action(f,depth,verb){return [...f.host.querySelectorAll(`[data-action="${verb}"]`)].find(b=>b.dataset.id===f.api.model(f.location)[depth].id);}
test('default compression, exact prefixes and duplicate Unicode identities',()=>{
 const f=fixture();try{assert.equal(f.host.querySelector('.rd-bc-anchor').textContent,'Architectural');assert.equal(f.host.querySelector('.rd-bc-current').textContent,'Final Portfolio');assert.equal(f.host.querySelectorAll('.rd-bc-segment').length,5);
 const entries=f.api.model({accountId:'a',bucketName:'b',prefix:'雪//雪/%2F/'});assert.deepEqual(Array.from(entries,e=>e.prefix),['','雪/','雪//','雪//雪/','雪//雪/%2F/']);assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
 const other=f.api.model({accountId:'other',bucketName:'b',prefix:'雪/'});assert.notEqual(entries[1].id,other[1].id);
 }finally{f.close();}
});
test('out-of-order expansion stays ordered, first click expands, second navigates, collapse is independent',()=>{
 const f=fixture();try{action(f,6,'expand').click();action(f,3,'expand').click();action(f,5,'expand').click();
 assert.deepEqual(Array.from(f.host.querySelectorAll('.rd-bc-anchor>button:first-child'),b=>b.textContent),['Architectural','Brutalism','Creative Archives','Research Projects']);assert.equal(f.navigations.length,0);
 action(f,3,'navigate').click();assert.equal(f.navigations[0].prefix,'Architectural Projects/Modern Buildings/Brutalism/');
 action(f,3,'collapse').click();assert.ok(action(f,5,'collapse'));assert.ok(action(f,6,'collapse'));assert.equal(f.navigations.length,1);
 f.update();assert.ok(action(f,5,'collapse'));
 }finally{f.close();}
});
test('disabled expand-first setting navigates directly and explicit expansion remains available',()=>{
 const f=fixture({expandBeforeNavigating:false});try{action(f,3,'navigate').click();assert.equal(f.navigations.length,1);action(f,3,'expand').click();assert.equal(f.navigations.length,1);assert.ok(action(f,3,'collapse'));}finally{f.close();}
});
test('hover does not mutate navigation, focus keyboard is scoped and DOM is retained on unrelated updates',()=>{
 const f=fixture();try{const b=action(f,3,'expand'),row=f.host.querySelector('.rd-bc-row');b.dispatchEvent(new f.w.MouseEvent('mouseover',{bubbles:true}));assert.equal(f.saved.length,0);assert.equal(f.navigations.length,0);
 f.update();assert.equal(f.host.querySelector('.rd-bc-row'),row);assert.equal(action(f,3,'expand'),b);
 b.focus();const e=new f.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true});b.dispatchEvent(e);assert.ok(e.defaultPrevented);assert.notEqual(f.w.document.activeElement,b);
 const outside=f.w.document.querySelector('#outside');outside.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(outside.textContent,'Outside');
 }finally{f.close();}
});
test('rows retain independent scroll positions and preferences survive a replacement',()=>{
 const f=fixture();try{action(f,3,'expand').click();const views=f.host.querySelectorAll('.rd-bc-viewport');views[0].scrollLeft=21;views[1].scrollLeft=47;action(f,5,'expand').click();assert.equal(f.host.querySelectorAll('.rd-bc-viewport')[0].scrollLeft,21);assert.equal(f.host.querySelectorAll('.rd-bc-viewport')[1].scrollLeft,47);
 let destroyed=false;f.api.register('minimal',host=>({update(c){host.textContent=c.hierarchy.map(e=>e.fullName).join(' / ');},destroy(){destroyed=true;}}));f.update();f.slot.select('minimal');assert.match(f.host.textContent,/Final Portfolio/);assert.equal(f.host.classList.contains('rd-bc'),false);f.slot.select('expandable-hierarchy');assert.ok(destroyed);assert.ok(action(f,3,'collapse'));assert.equal(f.navigations.length,0);
 }finally{f.close();}
});
test('deep paths have linear segment ownership, stable order, and no duplicate descendants',()=>{
 const f=fixture();try{const entries=f.api.model({...f.location,prefix:Array.from({length:500},(_,i)=>`雪 ${i}`).join('/')+'/'});const expanded=new Set(entries.filter(e=>e.depth%7===0).map(e=>e.id));const rows=f.api.rows(entries,expanded);const flat=rows.flatMap(r=>[r.anchor,...r.trail]);assert.equal(flat.length,entries.length-2);assert.deepEqual(flat.map(e=>e.id),entries.slice(1,-1).map(e=>e.id));}finally{f.close();}
});
test('CSS selectors are component scoped with no global keyframes, resets or important overrides',()=>{
 const css=readFileSync(new URL('../extension/beta/breadcrumb-navigation.css',import.meta.url),'utf8');assert.doesNotMatch(css,/!important|@keyframes|:root/);for(const line of css.split('\n').filter(l=>l.includes('{')&&!l.startsWith('@')))assert.ok(line.startsWith('.rd-bc'),line);
});

test('reduced motion bypasses row animations and lifecycle releases observers/listeners',()=>{
 const f=fixture();let disconnected=0,observed=0,animations=0;try{
 f.w.ResizeObserver=class{observe(){observed++;}disconnect(){disconnected++;}};
 f.w.matchMedia=()=>({matches:true});f.w.Element.prototype.animate=()=>{animations++;return {cancel(){}};};
 f.slot.select('expandable-hierarchy');assert.equal(observed,1);action(f,3,'expand').click();assert.equal(animations,0);
 const detached=action(f,5,'expand');const before=f.saved.length;f.slot.destroy();assert.equal(disconnected,1);detached.click();assert.equal(f.saved.length,before);assert.equal(f.host.children.length,0);
 }finally{f.close();}
});
test('malformed saved expansion data cannot break navigation',()=>{
 const f=fixture({expandedIds:{invalid:true}});try{assert.ok(action(f,3,'expand'));action(f,3,'expand').click();assert.equal(f.navigations.length,0);}finally{f.close();}
});

test('HTML loads isolated assets before Explorer and packaging includes both runtime assets',()=>{
 const html=readFileSync(new URL('../extension/beta/explorer.html',import.meta.url),'utf8');
 const packaging=readFileSync(new URL('../scripts/package_chrome_store.py',import.meta.url),'utf8');
 assert.ok(html.indexOf('src="breadcrumb-navigation.js"')<html.indexOf('src="explorer.mjs"'));
 assert.match(html,/href="breadcrumb-navigation.css"/);assert.match(packaging,/'beta\/breadcrumb-navigation.js'/);assert.match(packaging,/'beta\/breadcrumb-navigation.css'/);
});
