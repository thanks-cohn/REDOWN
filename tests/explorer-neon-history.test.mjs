import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync('extension/'+p,'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function entrance(values={shelfColorScheme:'neon'},{reduced=false,support=true,fail=false,pending=false}={}){
  const dom=new JSDOM(read('beta/explorer.html'),{url:'https://extension.test/beta/explorer.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,timers=new Map(),frames=[],listeners=[],transitions=[];let id=0;
  w.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id};w.clearTimeout=id=>timers.delete(id);
  w.requestAnimationFrame=fn=>frames.push(fn);
  w.matchMedia=()=>({matches:reduced,addEventListener(){}});
  w.CSS={supports:()=>support,registerProperty(){}};
  w.chrome={storage:{local:{get:()=>fail?Promise.reject(Error()):pending?new Promise(()=>{}):Promise.resolve(values)},onChanged:{addListener:fn=>listeners.push(fn)}}};
  w.document.startViewTransition=callback=>{
    let finish;const transition={callback,finished:new Promise(resolve=>finish=resolve),skipTransition(){finish()},finish};
    transitions.push(transition);callback();return transition;
  };
  w.eval(read('explorer-theme.js'));await settle();
  const frame=()=>{while(frames.length)frames.shift()()};
  const tick=ms=>{for(const [id,timer] of [...timers])if(timer.ms===ms){timers.delete(id);timer.fn()}};
  return {dom,w,root:w.document.documentElement,timers,transitions,listeners,frame,tick};
}
test('saved match and independent NEON enter white, shimmer first, then one spatial liquid transition and cleanup',async()=>{
  for(const values of [{shelfColorScheme:'neon'},{shelfColorScheme:'ocean',explorerThemeMode:'custom',explorerColorScheme:'neon'}]){
    const s=await entrance(values);s.frame();
    assert.equal(s.root.dataset.explorerTheme,'neon');assert.equal(s.root.dataset.explorerWhite,'true');assert.equal(s.root.dataset.explorerEntrance,'shimmer');assert.equal(s.transitions.length,0);
    s.tick(1050);assert.equal(s.transitions.length,1);assert.equal(s.root.dataset.explorerWhite,undefined);assert.equal(s.root.dataset.explorerEntrance,'liquid');
    assert.ok(s.w.document.getElementById('explorer-arrival-outlines'));
    s.transitions[0].finish();await settle();assert.equal(s.root.dataset.explorerEntrance,undefined);assert.equal(s.w.document.getElementById('explorer-arrival-outlines'),null);assert.equal(s.timers.size,0);s.dom.window.close();
  }
});
test('reduced motion, unsupported rendering and other palettes bypass entrance',async()=>{
  for(const [values,options] of [[{shelfColorScheme:'neon'},{reduced:true}],[{shelfColorScheme:'neon'},{support:false}],...[ 'porcelain','midnight','ocean'].map(p=>[{shelfColorScheme:p},{}])]){
    const s=await entrance(values,options);s.frame();assert.equal(s.root.dataset.explorerTheme,values.shelfColorScheme);assert.equal(s.root.hasAttribute('data-explorer-boot'),false);assert.equal(s.root.dataset.explorerEntrance,undefined);assert.equal(s.timers.size,0);s.dom.window.close();
  }
});
test('failed or stalled storage always releases boot gate; late known palette remains authoritative',async()=>{
  for(const options of [{fail:true},{pending:true}]){
    const s=await entrance({},options);if(options.pending)s.tick(2500);s.frame();assert.equal(s.root.hasAttribute('data-explorer-boot'),false);assert.equal(s.root.dataset.explorerWhite,undefined);
    s.listeners[0]({shelfColorScheme:{newValue:'neon'}},'local');assert.equal(s.root.dataset.explorerTheme,'neon');assert.notEqual(s.root.dataset.explorerEntrance,'shimmer');s.transitions.at(-1)?.finish();s.dom.window.close();
  }
});
test('pointer, keyboard, resize, background and watchdog interruption release temporary resources',async()=>{
  for(const type of ['pointerdown','keydown','resize','visibilitychange','watchdog']){
    const s=await entrance();s.frame();s.tick(1050);
    if(type==='watchdog')s.tick(6500);
    else if(type==='resize')s.w.dispatchEvent(new s.w.Event(type));
    else{if(type==='visibilitychange')Object.defineProperty(s.w.document,'visibilityState',{value:'hidden'});s.w.document.dispatchEvent(new s.w.Event(type));}
    await settle();assert.equal(s.root.dataset.explorerEntrance,undefined);assert.equal(s.w.document.getElementById('explorer-arrival-outlines'),null);assert.equal(s.timers.size,0);s.dom.window.close();
  }
});
test('new palette wins during startup without replaying introduction',async()=>{
  const s=await entrance();s.frame();s.tick(1050);s.listeners[0]({shelfColorScheme:{newValue:'ocean'}},'local');await settle();assert.equal(s.root.dataset.explorerTheme,'ocean');assert.equal(s.root.dataset.explorerWhite,undefined);assert.equal(s.root.dataset.explorerEntrance,undefined);s.transitions.at(-1).finish();s.dom.window.close();
});
test('white treatment changes no geometry; shared sweep and outline ring use the same wave radii',()=>{
  const css=read('beta/explorer.css');const white=css.slice(css.indexOf(':root[data-explorer-white]'),css.indexOf('/* One non-interactive'));
  assert.doesNotMatch(white,/font(?:-size|-family)?\s*:|padding\s*:|border-width\s*:|border-radius\s*:/);
  assert.match(css,/translateX\(112vw\)[\s\S]*translateX\(-32vw\)/);
  assert.match(css,/::view-transition-new\(explorer-arrival\)[\s\S]*explorer-dual-ink-reveal 4\.1s/);
  assert.match(css,/circle at left bottom/);assert.match(css,/circle at right top/);assert.match(css,/mask-composite:add/);
  assert.match(css,/\.sidebar-scroll\{flex:1;min-height:0;overflow:auto/);assert.match(css,/height:100dvh/);
});
async function archive(records=[],hash='#history',failure=false){
  const dom=new JSDOM(read('shelf.html'),{url:'https://extension.test/shelf.html'+hash,runScripts:'outside-only'}),w=dom.window,listeners=[];let gets=0;
  w.chrome={storage:{local:{async get(){gets++;if(failure)throw Error();return {transferHistory:records}},async set(){}},onChanged:{addListener:fn=>listeners.push(fn)}},runtime:{getURL:p=>p},tabs:{async create(){}}};
  w.eval(read('shelf-history.js'));w.eval(read('shelf.js'));await settle();
  return {dom,w,doc:w.document,listeners,get gets(){return gets},retry(){failure=false}};
}
test('real history is sorted by timestamps with year/month/day hierarchy and faithful outcomes',async()=>{
  const records=[{at:'2025-01-01T15:00:00Z',filename:'old',ok:true,location:'R2: bucket/old'},{at:'2026-10-28T15:00:00Z',filename:'failed',ok:false,error:'Denied'},{at:'2026-10-29T15:00:00Z',filename:'dispatch',ok:true,location:'repo → file'},{at:'2026-09-01T15:00:00Z',filename:'sep'}, {at:'invalid',filename:'undated'}];
  const s=await archive(records);assert.equal(s.doc.getElementById('history-view').hidden,false);
  assert.deepEqual([...s.doc.querySelectorAll('.history-year>summary')].map(x=>x.textContent),['2026','2025','Unknown date']);
  assert.deepEqual([...s.doc.querySelectorAll('.history-transfer>strong')].map(x=>x.textContent),['dispatch','failed','sep','old','undated']);
  assert.match(s.doc.querySelector('.history-transfer').textContent,/Accepted · completion unverified/);assert.match(s.doc.querySelector('[data-state=failed]').textContent,/Failed.*Denied/);
  assert.ok(s.doc.querySelector('.history-year').open);assert.equal(records.length,5);s.dom.window.close();
});
test('calendar grouping uses local dates near midnight, not UTC date slicing',async()=>{
  const old=process.env.TZ;process.env.TZ='America/Chicago';
  try{
    const s=await archive([{at:'2026-10-29T04:59:00Z'},{at:'2026-10-29T05:01:00Z'}]);
    const groups=s.w.RedownShelfHistory.group([{at:'2026-10-29T04:59:00Z'},{at:'2026-10-29T05:01:00Z'}]);
    assert.deepEqual([...groups.get('2026').get('9').keys()],['29','28']);s.dom.window.close();
  }finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});
test('empty, read failure and retry states are honest; missing metadata is not invented or executed',async()=>{
  const s=await archive([], '#history',true);assert.match(s.doc.getElementById('history-status').textContent,/Could not read/);assert.equal(s.doc.getElementById('history-retry').hidden,false);s.retry();s.doc.getElementById('history-retry').click();await settle();assert.match(s.doc.getElementById('history-status').textContent,/No transfers yet/);
  const info=s.w.RedownShelfHistory.describe({filename:'<img onerror=alert(1)>',status:'Interrupted'});assert.equal(info.detail,'');assert.equal(info.status,'Interrupted');assert.equal(info.state,'unknown');s.dom.window.close();
});
test('large retained histories render in bounded increments and unrelated storage changes do no history work',async()=>{
  const records=Array.from({length:1200},(_,i)=>({at:new Date(1793293200000-i*60000).toISOString(),filename:'file-'+i}));
  const s=await archive(records);assert.equal(s.doc.querySelectorAll('.history-transfer').length,100);const row=s.doc.querySelector('.history-transfer'),gets=s.gets;
  s.listeners.forEach(fn=>fn({shelfColorScheme:{newValue:'ocean'}},'local'));await settle();assert.equal(s.gets,gets);assert.equal(s.doc.querySelector('.history-transfer'),row);
  s.doc.getElementById('history-more').click();assert.equal(s.doc.querySelectorAll('.history-transfer').length,200);
  s.w.location.hash='#clouds';s.w.dispatchEvent(new s.w.HashChangeEvent('hashchange'));assert.equal(s.doc.getElementById('clouds-view').hidden,false);assert.equal(s.doc.getElementById('history-view').hidden,true);s.dom.window.close();
});
async function dock({sidePanel=true,reject=false,existing=false}={}){
  const dom=new JSDOM(read('beta/explorer.html'),{url:'https://extension.test/beta/explorer.html',runScripts:'outside-only'}),w=dom.window,calls=[],session={};
  w.chrome={runtime:{getURL:p=>'https://extension.test/'+p},windows:{WINDOW_ID_CURRENT:-2,async getCurrent(){calls.push(['window']);return {id:7}},async update(...args){calls.push(['focus',...args])}},
    storage:{session:{async set(value){Object.assign(session,value);calls.push(['intent',value])},async get(){return session},async remove(key){delete session[key]}}},
    tabs:{async query(){return existing?[{id:9,windowId:7,url:'https://extension.test/shelf.html#clouds'}]:[]},async create(o){calls.push(['create',o])},async update(...args){calls.push(['update',...args])}}};
  if(sidePanel)w.chrome.sidePanel={open(options){calls.push(['open',options]);return reject?Promise.reject(Error()):Promise.resolve()}};
  w.eval(read('beta/sidebar-settings.js'));return {dom,w,calls,session,doc:w.document};
}
test('dock generates exactly three local accessible SVGs; History and Settings keep user gesture and scoped Shelf intents',async()=>{
  const s=await dock();assert.equal(s.doc.querySelectorAll('.sidebar-dock svg').length,3);assert.deepEqual([...s.doc.querySelectorAll('.sidebar-dock button')].map(x=>x.textContent),['History','Destinations','Settings']);
  for(const [id,view] of [['transfer-history','history'],['open-shelf-settings','settings']]){s.calls.length=0;s.doc.getElementById(id).click();assert.equal(s.calls[0][0],'open');await settle();assert.equal(s.session.shelfOpenIntent.view,view);assert.equal(s.session.shelfOpenIntent.windowId,7);}
  assert.equal(s.doc.querySelector('.sidebar-dock #connect'),null);s.dom.window.close();
});
test('missing or failed sidePanel falls back to one reusable Shelf tab and Destinations opens original manager',async()=>{
  for(const options of [{sidePanel:false},{reject:true},{sidePanel:false,existing:true}]){
    const s=await dock(options);s.doc.getElementById('transfer-history').click();await settle();const nav=s.calls.find(x=>x[0]===(options.existing?'update':'create'));assert.equal(nav.at(-1).url,'https://extension.test/shelf.html#history');s.dom.window.close();
  }
  const s=await dock();s.doc.getElementById('open-destinations').click();await settle();assert.equal(s.calls.find(x=>x[0]==='create')[1].url,'https://extension.test/options.html#right-click-presets');s.dom.window.close();
});
test('an open Shelf consumes only fresh intents for its own window and returns to Remote Cloud',async()=>{
  const s=await archive([], '#clouds'),session={},removed=[];
  s.w.chrome.windows={async getCurrent(){return {id:7}}};
  s.w.chrome.storage.session={async get(){return session},async remove(key){removed.push(key);delete session[key]}};
  async function intent(value){session.shelfOpenIntent=value;s.listeners.forEach(fn=>fn({shelfOpenIntent:{newValue:value}},'session'));await settle();}
  const base={view:'history',windowId:7,issuedAt:Date.now(),token:'one'};
  for(const value of [{...base,windowId:8},{...base,issuedAt:Date.now()-20000},{...base,view:'unknown'}]){await intent(value);assert.equal(s.w.location.hash,'#clouds');}
  await intent(base);assert.equal(s.w.location.hash,'#history');assert.equal(s.doc.getElementById('history-view').hidden,false);assert.equal(removed.length,1);
  s.w.location.hash='#clouds';s.w.dispatchEvent(new s.w.HashChangeEvent('hashchange'));await intent(base);assert.equal(s.w.location.hash,'#clouds');
  await intent({...base,view:'settings',token:'two'});assert.equal(s.doc.getElementById('settings-view').hidden,false);s.dom.window.close();
});
test('transition errors and hidden initialization fall back to the finished saved palette',async()=>{
  const s=await entrance();s.frame();s.w.document.startViewTransition=()=>{throw Error('unavailable')};s.tick(1050);assert.equal(s.root.dataset.explorerTheme,'neon');assert.equal(s.root.dataset.explorerEntrance,undefined);assert.equal(s.timers.size,0);s.dom.window.close();
  const hidden=await entrance();Object.defineProperty(hidden.w.document,'visibilityState',{value:'hidden'});hidden.frame();assert.equal(hidden.root.dataset.explorerTheme,'neon');assert.equal(hidden.root.dataset.explorerEntrance,undefined);assert.equal(hidden.root.hasAttribute('data-explorer-boot'),false);hidden.dom.window.close();
});
