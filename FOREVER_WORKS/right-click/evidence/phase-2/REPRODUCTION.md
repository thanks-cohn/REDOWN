# Local forensic/capture reproduction source

Non-executing documentary source. Run only in a disposable checkout with locked dependencies, never against real browser/provider state. Source pin2e65ba137a35e1656b691fd2fdbf95082a0cdf4e; historical515c272. No production hooks are added.

For the differential, create work/phase2/forensic.mjs from the following block and run node work/phase2/forensic.mjs. It borrows the unchanged existing modern-destinations harness and extracts actual historical functions using git show. Chrome/storage/provider objects are synthetic. The emitted JSON and assertion exit status are evidence.

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
const [model,config,editor,nested,picker,html,bg]=await Promise.all(['extension/nested-locations.js','extension/destination-config.js','extension/beta/destinations.js','extension/nested-menu-editor.js','extension/explorer-destination-menu.js','extension/beta/explorer.html','extension/background.js'].map(read));
const settle=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));};
const initial=()=>[{id:'p',type:'cloudflare-r2',accountId:'a',accountName:'Account',bucketName:'art',workerUrl:'https://fixture.test',token:'fixture',menuLabel:'Art',defaultPrefix:'',showInContextMenu:true,simpleOptions:[{id:'extra',label:'Photos',bucketName:'art',prefix:'photos'}],nestedMenu:{version:1,enabled:true,roots:[{id:'r',bucketName:'art',ready:true,children:[{id:'n',name:'photos',ready:true,children:[]}]}]}}];
function background(){
  const state={profiles:initial(),rightClickMode:'simple'},created=[],mutations=[];
  let failStorage=false,failMenu=false,active=0,maxActive=0;
  const chrome={runtime:{id:'fixture',getURL:p=>'chrome-extension://fixture/'+p},storage:{local:{get:async()=>structuredClone(state),set:async patch=>{if(failStorage)throw Error('Storage full');Object.assign(state,structuredClone(patch));mutations.push(patch);}}},contextMenus:{removeAll:async()=>{active++;maxActive=Math.max(active,maxActive);await new Promise(r=>setImmediate(r));created.length=0;active--;},create:(item,callback)=>{created.push(item);if(callback)queueMicrotask(()=>{if(failMenu)chrome.runtime.lastError={message:'Native error'};callback();delete chrome.runtime.lastError;});}}};
  const ctx=vm.createContext({chrome,structuredClone,setTimeout,clearTimeout,queueMicrotask,ROOT_MENU_ID:'redown',getProfiles:async()=>structuredClone(state.profiles)});
  vm.runInContext(model+config,ctx);
  vm.runInContext(bg.slice(bg.indexOf('function addNestedLocations('),bg.indexOf('/* Explicit, opt-in gallery capture')),ctx);
  const snapshot=()=>({expected:ctx.RedownDestinationConfig.signature(state.profiles,state.rightClickMode),mode:state.rightClickMode,profiles:structuredClone(ctx.RedownDestinationConfig.project(state.profiles))});
  const save=message=>ctx.saveDestinationConfig(message,{url:'chrome-extension://fixture/beta/explorer.html'});
  return {state,created,ctx,save,snapshot,mutations,set failStorage(v){failStorage=v;},set failMenu(v){failMenu=v;},get maxActive(){return maxActive;}};
}
async function ui(preset){
  const listeners=[];const b=background(),calls=[],folders=new Map([['',['photos']]]);if(preset)b.state.profiles=preset;
  const dom=new JSDOM(html,{url:'https://fixture.test/beta/explorer.html',runScripts:'outside-only'}),w=dom.window;
  w.structuredClone=structuredClone;w.confirm=()=>true;
  w.chrome={storage:{local:{get:async()=>structuredClone(b.state)},onChanged:{addListener:fn=>listeners.push(fn)}},runtime:{sendMessage:async m=>{calls.push(m);if(m.type==='cfProvision'){b.state.profiles.push({...initial()[0],id:'adopted-existing',accountId:m.accountId,bucketName:m.bucketName,menuLabel:m.bucketName,simpleOptions:[]});return {ok:true};}if(m.type==='profiles')return {ok:true,profiles:structuredClone(b.state.profiles)};if(m.type==='cfAccounts')return {ok:true,accounts:[{id:'a',name:'Account'}]};if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'art'},{name:'unprepared'}]};if(m.type==='cfFolderChildren')return {ok:true,children:folders.get(m.parentPrefix)||[]};if(m.type==='cfCreateFolder'){folders.set(m.prefix,[...(folders.get(m.prefix)||[]),m.name]);return {ok:true,key:[m.prefix,m.name].filter(Boolean).join('/')+'/'};}if(m.type==='cfDestinationFolders')return {ok:true,folders:[{name:'photos',prefix:'photos/'}],cursor:''};if(m.type==='saveDestinationConfig')try{return await b.save(m);}catch(error){return {ok:false,error:error.message};}throw Error(m.type);}}};
  for(const source of [model,config,nested,picker,editor])w.eval(source);await settle();return {b,calls,dom,w,d:w.document,change:patch=>listeners.forEach(fn=>fn(patch,'local'))};
}

import {execFileSync} from 'node:child_process';
const observations=[];
const snap=h=>({cards:h.d.querySelectorAll('.destination-card').length,savedOptions:h.b.state.profiles[0].simpleOptions?.length||0,status:h.d.getElementById('destination-status').textContent,native:h.b.created.map(x=>({id:x.id,parentId:x.parentId,title:x.title}))});
// These are synthetic offline observations; no browser/provider state is used.
{
 const h=await ui();await h.b.ctx.rebuildMenus();
 h.d.getElementById('destination-add').click();await settle();const before=snap(h);
 assert.equal(before.cards,3);assert.equal(before.savedOptions,1);assert.equal(before.native.filter(x=>/^quick:|^simple-option:/.test(x.id)).length,2);
 h.d.getElementById('destination-save').click();await settle();const after=snap(h);
 assert.equal(after.savedOptions,2);assert.equal(after.native.filter(x=>/^quick:|^simple-option:/.test(x.id)).length,3);
 observations.push({case:'D1 Modern add before/after explicit Save',before,after,result:'CONFIRMED_LOCAL_DIFFERENCE'});h.dom.window.close();
}
{
 const old=execFileSync('git',['show','515c272:extension/options.js'],{encoding:'utf8'});
 const dom=new JSDOM('<div id="host"></div><div id="status"></div>',{runScripts:'outside-only'}),w=dom.window;
 const state={profiles:initial()},writes=[];w.structuredClone=structuredClone;
 w.chrome={storage:{local:{set:async patch=>{Object.assign(state,structuredClone(patch));writes.push(Object.keys(patch));},get:async()=>structuredClone(state)}}};
 w.send=async m=>({ok:true,children:['photos']});
 w.eval('var profiles='+JSON.stringify(initial())+';'+old.slice(old.indexOf('async function saveProfiles()'),old.indexOf('function makeNode('))+old.slice(old.indexOf('function simpleFolderPathEditor('),old.indexOf('function simpleExtraOptions('))+`document.getElementById('host').append(simplePrimaryLocationField(profiles[0]));`);
 await settle();const select=w.document.querySelector('.simple-location-row select');select.value='photos';select.dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,240));
 assert.equal(state.profiles[0].defaultPrefix,'photos');assert.ok(writes.length);
 observations.push({case:'D1 Historical actual Simple selection callback/autosave',revision:'515c272c48f89eb3f509fa2c7a5a02e0db53f66b',savedPrefix:state.profiles[0].defaultPrefix,writes,result:'CONFIRMED_LOCAL_AUTOSAVE'});dom.window.close();
}
{
 const p=initial();delete p[0].nestedMenu;p[0].menuTree=[{id:'old',prefix:'photos',label:'Historical photos',children:[]}];
 const b=background();b.state.profiles=p;b.state.rightClickMode='nested';await b.ctx.rebuildMenus();
 assert.equal(b.created.filter(x=>x.id.startsWith('nested:')).length,0);
 const oldbg=execFileSync('git',['show','515c272:extension/background.js'],{encoding:'utf8'}),oldmodel=execFileSync('git',['show','515c272:extension/nested-locations.js'],{encoding:'utf8'}),oldEntries=[];
 const oldctx=vm.createContext({ROOT_MENU_ID:'redown',setTimeout,clearTimeout,chrome:{runtime:{},contextMenus:{removeAll:async()=>{},create:item=>oldEntries.push(item)},storage:{local:{get:async()=>({profiles:p,rightClickMode:'nested'})}}},getProfiles:async()=>structuredClone(p)});
 vm.runInContext(oldmodel,oldctx);vm.runInContext(oldbg.slice(oldbg.indexOf('function sanitizeMenuId('),oldbg.indexOf('/* Explicit, opt-in gallery capture')),oldctx);await oldctx.buildMenus();assert.ok(oldEntries.some(x=>x.id.startsWith('tree:')));

 const h=await ui(p);h.d.getElementById('destination-mode').click();await settle();
 h.d.getElementById('destination-save').click();await settle();const before=h.d.getElementById('destination-status').textContent;
 assert.match(before,/Choose or create every active Nested folder/);
 h.d.querySelector('.nested-collapse').click();await settle();h.d.getElementById('destination-save').click();await settle();
 const after=snap(h);assert.ok(after.native.some(x=>x.title==='photos'));
 observations.push({case:'D2 Legacy-only migration requires explicit commit and collapsed child discovery',historicalTreeDescriptors:oldEntries.filter(x=>x.id.startsWith('tree:')).map(x=>({id:x.id,parentId:x.parentId,title:x.title})),legacyOnlyNativeDestinations:0,saveBeforeExpand:before,afterExpandAndSave:after,result:'CONFIRMED_LOCAL_MIGRATION_GATE'});h.dom.window.close();
}
{
 const h=await ui();h.b.failMenu=true;h.d.querySelector('.destination-card input').value='Saved but absent';h.d.querySelector('.destination-card input').dispatchEvent(new h.w.Event('input'));h.d.getElementById('destination-save').click();await settle();
 assert.equal(h.b.state.profiles[0].menuLabel,'Saved but absent');assert.equal(h.b.created.length,0);
 observations.push({case:'D3 Persistence success/native create failure',persistedLabel:h.b.state.profiles[0].menuLabel,nativeCount:h.b.created.length,status:h.d.getElementById('destination-status').textContent,result:'CONFIRMED_LOCAL_PARTIAL_SUCCESS'});h.dom.window.close();
}
{
 const b=background();delete b.state.profiles[0].token;await b.ctx.rebuildMenus();
 const id='quick:p';assert.ok(b.created.some(x=>x.id===id));assert.equal(b.ctx.RedownDestinationConfig.resolve(id,b.state.profiles,'simple'),null);
 observations.push({case:'D4 Invalid prepared snapshot descriptor exists but resolver rejects',menuId:id,descriptorPresent:true,resolves:false,result:'CONFIRMED_LOCAL_NOT_NORMAL_VALIDATED_SAVE'});
}
{
 const h=await ui();h.d.getElementById('destination-mode').click();await settle();observations.push({case:'D5 status after mode/readiness',storedMode:h.b.state.rightClickMode,status:h.d.getElementById('destination-status').textContent,result:'LOCAL_OBSERVATION'});h.dom.window.close();
}

{
 const p=initial();p[0].defaultPrefix='files';p[0].menuLabel='';const b=background();b.state.profiles=p;await b.ctx.rebuildMenus();
 const current=b.created.find(x=>x.id==='quick:p').title;
 const oldbg=execFileSync('git',['show','515c272:extension/background.js'],{encoding:'utf8'}),oldmodel=execFileSync('git',['show','515c272:extension/nested-locations.js'],{encoding:'utf8'});
 const oldEntries=[];const ctx=vm.createContext({ROOT_MENU_ID:'redown',setTimeout,clearTimeout,chrome:{runtime:{},contextMenus:{removeAll:async()=>{},create:item=>oldEntries.push(item)},storage:{local:{get:async()=>({profiles:p,rightClickMode:'simple',simpleLabelFallback:'bucket'})}}},getProfiles:async()=>structuredClone(p)});
 vm.runInContext(oldmodel,ctx);vm.runInContext(oldbg.slice(oldbg.indexOf('function sanitizeMenuId('),oldbg.indexOf('/* Explicit, opt-in gallery capture')),ctx);await ctx.buildMenus();
 const historic=oldEntries.find(x=>x.id==='quick:p').title;assert.equal(historic,'art');assert.equal(current,'files');
 const prior=JSON.stringify(b.created);b.state.profiles[0].menuTree=[{id:'ghost',prefix:'wrong',label:'Ghost'}];await b.ctx.rebuildMenus();assert.equal(JSON.stringify(b.created),prior);
 observations.push({case:'D6 Owner bucket-name default / Legacy preference differential',syntheticBucket:'art',storedPrefix:'files',storedLabel:'',historicalBucketPreferenceLabel:historic,currentLabel:current,changingOnlyLegacyMenuTreeChangesModernPlan:false,result:'CONFIRMED_LOCAL_NAMING_DIVERGENCE'});
}

{
 const b=background(),p=initial();delete p[0].nestedMenu;p[0].menuTree=[{id:'old',prefix:'photos',label:'Old label',children:[]}];b.state.profiles=p;delete b.state.rightClickMode;await b.ctx.rebuildMenus();
 const oldbg=execFileSync('git',['show','515c272:extension/background.js'],{encoding:'utf8'}),oldmodel=execFileSync('git',['show','515c272:extension/nested-locations.js'],{encoding:'utf8'}),oldState={profiles:p},entries=[];
 const ctx=vm.createContext({ROOT_MENU_ID:'redown',setTimeout,clearTimeout,chrome:{runtime:{},contextMenus:{removeAll:async()=>{},create:item=>entries.push(item)},storage:{local:{get:async()=>structuredClone(oldState),set:async patch=>Object.assign(oldState,patch)}}},getProfiles:async()=>structuredClone(p)});
 vm.runInContext(oldmodel,ctx);vm.runInContext(oldbg.slice(oldbg.indexOf('function sanitizeMenuId('),oldbg.indexOf('/* Explicit, opt-in gallery capture')),ctx);await ctx.buildMenus();
 assert.equal(oldState.rightClickMode,'nested');assert.equal(b.state.rightClickMode,'simple');
 observations.push({case:'D7 Mode inference on old-only profile with no stored mode',historicalMode:oldState.rightClickMode,currentMode:b.state.rightClickMode,result:'CONFIRMED_CONDITIONAL_COMPATIBILITY_DIVERGENCE'});
}
{
 const b=background();b.state.profiles[0].id='synthetic:colon';const draft=b.snapshot();let error=null;
 try{await b.save(draft);}catch(e){error=e.message;}
 assert.equal(error,null);const id='quick:synthetic:colon';assert.ok(b.created.some(x=>x.id===id));assert.equal(b.ctx.RedownDestinationConfig.resolve(id,b.state.profiles,'simple'),null);
 observations.push({case:'D8 Colon profile ID accepted by validation but not resolver',syntheticProfileId:'synthetic:colon',saveAccepted:true,descriptorPresent:true,resolves:false,result:'CONFIRMED_NEGATIVE_ID_GRAMMAR_GAP; normal UUID creation does not produce this ID'});
}

{
 const p=initial(),other=structuredClone(p[0]);other.id='second-profile';other.bucketName='unprepared';other.menuLabel='';other.simpleOptions=[];other.nestedMenu.roots[0].id='other-root';other.nestedMenu.roots[0].bucketName='unprepared';other.nestedMenu.roots[0].children=[];p.push(other);
 const h=await ui(p);h.d.getElementById('destination-mode').click();await settle();const headings=[...h.d.querySelectorAll('.nested-heading h3')].map(n=>n.textContent);
 assert.deepEqual(headings,['Account','Account']);assert.equal(h.d.querySelectorAll('.nested-card').length,2);
 observations.push({case:'D9 Same account multiple prepared profiles creates repeated account headings',profileCount:2,groupCount:2,headings,roots:['art','unprepared'],result:'CONFIRMED_DOM_IDENTITY_CLARITY_CASE; CSS hides group meta; not an orphaned data writer'});h.dom.window.close();
}

{
 const b=background(),prefix='é'.repeat(600);b.state.profiles[0].defaultPrefix=prefix;
 b.ctx.RedownDestinationConfig.validate(b.state.profiles,'simple');
 const worker=vm.runInNewContext(bg.slice(bg.indexOf('const WORKER_SOURCE ='),bg.indexOf('function bytesToBase64Url'))+'WORKER_SOURCE');
 const ctx=vm.createContext({TextEncoder});vm.runInContext(worker.slice(worker.indexOf('function exactObjectKey('),worker.indexOf('function checksumHex(')),ctx);
 assert.throws(()=>ctx.exactObjectKey(prefix),/Invalid object key/);
 observations.push({case:'D10 Menu prefix character limit versus Worker UTF-8 key limit',characters:prefix.length,bytes:new TextEncoder().encode(prefix).length,menuValidationAccepted:true,workerKeyValidationAccepted:false,result:'CONFIRMED_SYNTHETIC_SIZE_BOUNDARY; not owner profile or actual write'});
}
console.log(JSON.stringify({sourceRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Isolated current jsdom/VM harness and extracted historical actual functions. Chrome/provider mocked; not installed or live evidence.',observations},null,2));

```

## Standalone layout captures

Create each listed file at its work/right-click or work/phase2 location, then generate visual.html/legacy.html. Serve repository root on127.0.0.1:8765 and run standalone Chromium with DevTools on127.0.0.1:9222 using a disposable user-data-dir. No extension is installed. The headless --no-sandbox switch concerns this container process, not extension policy; do not disable managed extension restrictions. Run the capture scripts to emit PNGs/measurements. Outermost fixture CSS intentionally uses body display:block/padding16, max1100px and optional320px panel, so measurements are not full-app geometry.

### work/right-click/visual-fixture.mjs

```javascript
import fs from 'node:fs/promises';
let html=await fs.readFile('extension/beta/explorer.html','utf8');
const setup=html.slice(html.indexOf('<section class="quick-links-panel"'),html.indexOf('<footer>'));
const mock=`
const params=new URLSearchParams(location.search);
const nested=params.get('mode')==='nested';
const p={id:'synthetic-profile',type:'cloudflare-r2',accountId:'synthetic-account',accountName:'Synthetic account with a deliberately long display name',bucketName:'synthetic-bucket',workerUrl:'https://fixture.invalid',token:'synthetic-not-a-secret',menuLabel:'Reference destination',defaultPrefix:'photos/final',simpleOptions:[{id:'second',label:'Second destination with a long label',bucketName:'synthetic-bucket',prefix:'archive'}],nestedMenu:{version:1,enabled:true,roots:[{id:'root',bucketName:'synthetic-bucket',ready:true,children:[]}]}};
let parent=p.nestedMenu.roots[0];for(let i=1;i<=8;i++){const node={id:'node-'+i,name:'level-'+i,ready:true,children:[]};parent.children.push(node);parent=node;}
const state={profiles:[p],rightClickMode:nested?'nested':'simple'};
window.confirm=()=>true;
window.chrome={storage:{local:{get:async()=>structuredClone(state)},onChanged:{addListener(){}}},runtime:{sendMessage:async m=>{
if(m.type==='profiles')return {ok:true,profiles:structuredClone(state.profiles)};
if(m.type==='cfAccounts')return {ok:true,accounts:[{id:'synthetic-account',name:'Synthetic account'}]};
if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'synthetic-bucket'}]};
if(m.type==='cfFolderChildren'){let level=(m.parentPrefix||'').split('/').filter(Boolean).length;return {ok:true,children:level<8?['level-'+(level+1)]:[]};}
return {ok:false,error:'Fixture forbids mutations'};
}}};`;
const scripts=['nested-locations.js','destination-config.js','nested-menu-editor.js','explorer-destination-menu.js'].map(s=>`<script src="/extension/${s}"></script>`).join('');
await fs.writeFile('work/right-click/visual.html',`<!doctype html><html data-explorer-theme="porcelain"><head><meta charset="utf-8"><link rel="stylesheet" href="/extension/beta/explorer.css"><style>body{display:block!important;height:auto!important;overflow:auto!important;margin:0;padding:16px}#fixture-panel{max-width:1100px;margin:auto}body.constrained #fixture-panel{width:320px;max-width:100%}</style></head><body><div id="fixture-panel">${setup}</div><script>${mock}\nif(params.has('panel'))document.body.classList.add('constrained');</script>${scripts}<script src="/extension/beta/destinations.js"></script></body></html>`);

```

### work/right-click/legacy-fixture.mjs

```javascript
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const get=p=>execFileSync('git',['show','515c272:'+p],{encoding:'utf8'});
const html=get('extension/options.html'),js=get('extension/options.js');
const styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n').replaceAll("url('fonts/","url('/extension/fonts/");
const simple=js.slice(js.indexOf('function simpleFolderPathEditor('),js.indexOf('function simpleExtraOptions('));
const nested=get('extension/nested-menu-editor.js'),model=get('extension/nested-locations.js');
const mock=`const profile={id:'synthetic-profile',type:'cloudflare-r2',accountId:'synthetic-account',accountName:'Synthetic historical account',bucketName:'synthetic-bucket',defaultPrefix:'level-1/level-2',nestedMenu:{version:1,enabled:true,roots:[{id:'root',bucketName:'synthetic-bucket',ready:true,children:[{id:'child',name:'level-1',ready:true,children:[{id:'grandchild',name:'level-2',ready:true,children:[]}]}]}]}};const send=async m=>{if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'synthetic-bucket'}]};if(m.type==='cfFolderChildren'){const n=(m.parentPrefix||'').split('/').filter(Boolean).length;return {ok:true,children:n<2?['level-'+(n+1)]:[]};}return {ok:false,error:'Historical fixture forbids mutation'};};const scheduleSave=()=>{};`;
await fs.writeFile('work/right-click/legacy.html',`<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style><style>body{display:block!important;height:auto!important;overflow:auto!important;margin:0;padding:16px}#fixture-panel{max-width:1100px;margin:auto}body.constrained #fixture-panel{width:320px;max-width:100%}</style></head><body><div id="fixture-panel"><section class="section"><h2>Historical Legacy rendering fixture — 515c272</h2><p>Synthetic data; no extension installed; mutation handlers denied.</p><article class="card" id="simple"><h3>Simple primary location</h3></article><div id="destination-nested"></div></section></div><script>${mock}\n${model}\n${nested}\n${simple}\ndocument.getElementById('simple').append(simplePrimaryLocationField(profile));RedownNestedEditor.mount(document.getElementById('destination-nested'),{profiles:()=>[profile],send,save:async()=>{},saveOrder:async()=>{}});if(new URLSearchParams(location.search).has('panel'))document.body.classList.add('constrained');</script></body></html>`);

```

### work/phase2/capture.mjs

```javascript
import fs from 'node:fs/promises';
const cases=[['wide-simple',1440,1000,''],['narrow-simple',320,800,''],['panel-simple',1440,1000,'&panel=1'],['wide-nested',1440,1000,'&mode=nested'],['narrow-nested',320,800,'&mode=nested'],['panel-nested',1440,1000,'&mode=nested&panel=1']];
const results=[];
for(const [name,width,height,query] of cases){
 const target=await (await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'})).json();
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,m=>m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
 await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:8765/work/right-click/visual.html?fixture=1'+query});
 // Await actual rendering and asynchronous mock discovery, rather than load event alone.
 await call('Runtime.evaluate',{expression:`new Promise(resolve=>{let tries=0;const check=()=>{if(document.querySelector('.destination-card,.nested-card')&&document.querySelector('.destination-existing')===null&&++tries>8)resolve(true);else setTimeout(check,30)};check()})`,awaitPromise:true});
 if(query.includes('nested'))await call('Runtime.evaluate',{expression:`(async()=>{for(let i=0;i<9;i++){for(const b of document.querySelectorAll('.nested-collapse[aria-expanded="false"]'))b.click();await new Promise(r=>setTimeout(r,40));}})()`,awaitPromise:true});
 const measured=await call('Runtime.evaluate',{expression:`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};const panel=document.getElementById('fixture-panel');const stage=document.querySelector('.destination-stage');const xs=[...document.querySelectorAll('.destination-remove-x,.nested-remove,.nested-inline-remove,.location-level-remove,.nested-actions button')].filter(n=>n.getBoundingClientRect().width&&['×','Remove'].includes(n.textContent.trim()));return {viewport:{width:innerWidth,height:innerHeight},panel:rect(panel),stage:rect(stage),documentWidth:document.documentElement.scrollWidth,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,renderedRemovalCount:xs.length,removals:xs.map(n=>({class:n.className,box:rect(n),display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility,opacity:getComputedStyle(n).opacity,color:getComputedStyle(n).color})),nestedDepth:[...document.querySelectorAll('[data-depth]')].map(n=>({depth:n.dataset.depth,box:rect(n)})),status:document.getElementById('destination-status').textContent}})()`,returnByValue:true});
 const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile('FOREVER_WORKS/right-click/evidence/phase-2/'+name+'.png',Buffer.from(screenshot.data,'base64'));
 results.push({name,...measured.result.value,evidenceClass:'LOCAL_TEST_PASS',verificationScope:'Rendered standalone HTML fixture with real CSS/renderer and synthetic Chrome/provider responses; not installed-extension or live-provider proof'});
 ws.close();await fetch('http://127.0.0.1:9222/json/close/'+target.id);
}
await fs.writeFile('FOREVER_WORKS/right-click/evidence/phase-2/layout-measurements.json',JSON.stringify(results,null,2)+'\n');console.log(results.map(r=>({name:r.name,panelWidth:r.panel.width,overflow:r.horizontalOverflow,xCount:r.renderedRemovalCount}))); 

```

### work/phase2/capture-legacy.mjs

```javascript
import fs from 'node:fs/promises';
const cases=[['legacy-wide',1440,1000,''],['legacy-narrow',320,800,''],['legacy-panel',1440,1000,'&panel=1']];
const results=[];
for(const [name,width,height,query] of cases){
 const target=await (await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'})).json();
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,m=>m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
 await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:8765/work/right-click/legacy.html?fixture=1'+query});
 // Await actual rendering and asynchronous mock discovery, rather than load event alone.
 await call('Runtime.evaluate',{expression:`new Promise(resolve=>{let tries=0;const check=()=>{if(document.querySelector('.destination-card,.nested-card')&&document.querySelector('.destination-existing')===null&&++tries>8)resolve(true);else setTimeout(check,30)};check()})`,awaitPromise:true});
 if(query.includes('nested'))await call('Runtime.evaluate',{expression:`(async()=>{for(let i=0;i<9;i++){for(const b of document.querySelectorAll('.nested-collapse[aria-expanded="false"]'))b.click();await new Promise(r=>setTimeout(r,40));}})()`,awaitPromise:true});
 const measured=await call('Runtime.evaluate',{expression:`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};const panel=document.getElementById('fixture-panel');const stage=document.querySelector('.section');const xs=[...document.querySelectorAll('.destination-remove-x,.nested-remove,.nested-inline-remove,.location-level-remove,.nested-actions button')].filter(n=>n.getBoundingClientRect().width&&['×','Remove'].includes(n.textContent.trim()));return {viewport:{width:innerWidth,height:innerHeight},panel:rect(panel),stage:rect(stage),documentWidth:document.documentElement.scrollWidth,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,renderedRemovalCount:xs.length,removals:xs.map(n=>({class:n.className,box:rect(n),display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility,opacity:getComputedStyle(n).opacity,color:getComputedStyle(n).color})),nestedDepth:[...document.querySelectorAll('[data-depth]')].map(n=>({depth:n.dataset.depth,box:rect(n)})),status:document.getElementById('destination-status')?.textContent||'Historical synthetic fixture'}})()`,returnByValue:true});
 const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile('FOREVER_WORKS/right-click/evidence/phase-2/'+name+'.png',Buffer.from(screenshot.data,'base64'));
 results.push({name,...measured.result.value,evidenceClass:'LOCAL_TEST_PASS',verificationScope:'Rendered standalone HTML fixture with historical 515c272 CSS/renderer and synthetic Chrome/provider responses; not installed-extension or live-provider proof'});
 ws.close();await fetch('http://127.0.0.1:9222/json/close/'+target.id);
}
await fs.writeFile('FOREVER_WORKS/right-click/evidence/phase-2/legacy-layout-measurements.json',JSON.stringify(results,null,2)+'\n');console.log(results.map(r=>({name:r.name,panelWidth:r.panel.width,overflow:r.horizontalOverflow,xCount:r.renderedRemovalCount}))); 

```
