# Phase 3 reproducible isolated fixtures

Source b7178442c26c7723a9a650613ef65ba38ce26b21; historical 515c272c48f89eb3f509fa2c7a5a02e0db53f66b. Run from repository root with locked npm dependencies in a disposable checkout. All Chrome/storage/provider state is synthetic. No installed Chrome or remote resource is touched. No production functions are reimplemented: exact source slices are evaluated in VM/jsdom; harness preamble is borrowed from unchanged modern-destinations test.

## P1–P6

Create work/phase3/parity.mjs with the following exact script; run `node work/phase3/parity.mjs > work/phase3/parity.json 2> work/phase3/parity.stderr`. Audit invocation exit0. Output lives beside this document as parity.json. P1/P3 resolved projections use current resolver over old snapshots; P4 evaluates actual historical click listener to check old dispatch semantics independently. Stubs do not prove Chrome or R2.

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
const oldRevision=execFileSync('git',['rev-parse','515c272'],{encoding:'utf8'}).trim();
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const old=p=>execFileSync('git',['show',oldRevision+':'+p],{encoding:'utf8'});
const oldOptions=old('extension/options.js'),oldBackground=old('extension/background.js'),oldModel=old('extension/nested-locations.js');
const json=x=>JSON.parse(JSON.stringify(x));
const reports=[];
const capture=(state,items,ctx)=>({profiles:json(ctx.RedownDestinationConfig?.project(state.profiles)||state.profiles.map(({token,workerUrl,...p})=>p)),descriptors:json(items),resolved:items.filter(x=>/^(quick:|simple-option:|nested:)/.test(x.id)).map(x=>{const r=ctx.RedownDestinationConfig.resolve(x.id,state.profiles,state.rightClickMode);return {id:x.id,target:r?{owner:r.owner.id,accountId:r.profile.accountId,bucketName:r.profile.bucketName,prefix:r.prefix}:null};})});
// P1: actual historical selection callbacks; choose bucket, nested folder,
// add extra, remove earlier extra, wait autosave; current UI same intent.
{
 const seed=initial();seed[0].defaultPrefix='photos/deep';seed[0].menuLabel='Art';
 const dom=new JSDOM('<div id="host"></div><div id="extra"></div>',{runScripts:'outside-only'}),w=dom.window;
 let state={profiles:structuredClone(seed),rightClickMode:'simple'},writes=0;
 const entries=[];const ctx=vm.createContext({ROOT_MENU_ID:'redown',setTimeout,clearTimeout,structuredClone,chrome:{runtime:{},contextMenus:{removeAll:async()=>{entries.length=0;},create:x=>entries.push(x)},storage:{local:{get:async()=>structuredClone(state),set:async p=>Object.assign(state,structuredClone(p))}}},getProfiles:async()=>structuredClone(state.profiles)});
 vm.runInContext(oldModel+config,ctx);vm.runInContext(oldBackground.slice(oldBackground.indexOf('function sanitizeMenuId('),oldBackground.indexOf('/* Explicit, opt-in gallery capture')),ctx);
 w.chrome={storage:{local:{get:async()=>structuredClone(state),set:async p=>{Object.assign(state,structuredClone(p));writes++;await ctx.buildMenus();}}}};
 w.send=async m=>m.type==='cfBuckets'?{ok:true,buckets:[{name:'art'}]}:{ok:true,children:m.parentPrefix==='photos'?['deep']:['photos']};
 w.eval('var profiles='+JSON.stringify(seed)+';function uid(){return "parity-added";}function field(t,v,cb){const n=document.createElement("input");n.value=v;n.oninput=()=>{cb(n.value);scheduleSave();};return n;}'+oldOptions.slice(oldOptions.indexOf('async function saveProfiles()'),oldOptions.indexOf('function makeNode('))+oldOptions.slice(oldOptions.indexOf('function simpleFolderPathEditor('),oldOptions.indexOf('function simpleBucketCreator('))+'document.getElementById("host").append(simplePrimaryLocationField(profiles[0]));document.getElementById("extra").append(simpleExtraOptions(profiles[0]));');
 await settle();const bucket=w.document.querySelector('#host [aria-label="Bucket for default Simple destination"]');bucket.value='art';bucket.dispatchEvent(new w.Event('change'));await settle();
 let sel=w.document.querySelector('#host .simple-location-row select');sel.value='photos';sel.dispatchEvent(new w.Event('change'));await settle();
 [...w.document.querySelectorAll('#host button')].find(x=>x.textContent==='+ Child').click();await settle();sel=w.document.querySelectorAll('#host .simple-location-row select')[1];sel.value='deep';sel.dispatchEvent(new w.Event('change'));await settle();
 w.document.querySelector('[data-simple-location-profile]').addLocation();await settle();
 [...w.document.querySelectorAll('#extra button')].find(x=>x.textContent==='Remove option').click();await new Promise(r=>setTimeout(r,240));await settle();await ctx.buildMenus();
 const historical=capture(state,entries,ctx);assert.equal(state.profiles[0].defaultPrefix,'photos/deep');assert.equal(state.profiles[0].simpleOptions.length,1);
 const h=await ui(seed);h.w.crypto.randomUUID=()=> 'parity-added';
 const b=h.d.querySelector('[aria-label="Bucket"]');b.value='art';b.dispatchEvent(new h.w.Event('change'));await settle();
 // Real picker, synthetic paged discovery exposing the same nested target.
 const original=h.w.chrome.runtime.sendMessage;h.w.chrome.runtime.sendMessage=async m=>m.type==='cfDestinationFolders'?{ok:true,folders:m.prefix==='photos/'?[{name:'deep',prefix:'photos/deep/'}]:[{name:'photos',prefix:'photos/'}],cursor:''}:original(m);
 [...h.d.querySelectorAll('button')].find(x=>x.textContent==='Choose folder').click();await settle();
 for(const text of ['art ›','photos ›','deep ›']){[...h.d.querySelectorAll('.explorer-submenu button')].find(x=>x.textContent===text).click();await settle();}
 [...h.d.querySelectorAll('.explorer-submenu button')].filter(x=>x.textContent==='Select here').at(-1).click();await settle();
 h.d.getElementById('destination-add').click();await settle();
 const label=h.d.querySelector('[data-destination-id="parity-added"] input');label.value='';label.dispatchEvent(new h.w.Event('input'));
 h.d.querySelector('[data-destination-id="extra"] .destination-remove-x').click();await settle();
 const before={savedPrefix:h.b.state.profiles[0].defaultPrefix,savedExtra:h.b.state.profiles[0].simpleOptions.map(x=>x.id),draftStatus:h.d.getElementById('destination-status').textContent};
 h.d.getElementById('destination-save').click();await settle();const modern=capture(h.b.state,h.b.created,h.b.ctx);
 assert.equal(h.b.state.profiles[0].defaultPrefix,'photos/deep');assert.deepEqual(h.b.state.profiles[0].simpleOptions.map(x=>x.id),['parity-added']);
 const dest=x=>x.filter(x=>/^(quick:|simple-option:)/.test(x.id));assert.deepEqual(dest(historical.descriptors),dest(modern.descriptors));assert.deepEqual(historical.resolved,modern.resolved);
 reports.push({case:'P1 actual Legacy callbacks vs actual Modern UI same bucket/deep folder/add/remove',result:'PASS',historicalWrites:writes,legacyTiming:'primary debounce 180ms; extra add/remove immediate; observed after 240ms',modernBeforeSave:before,historical,modern,descriptorDiff:[]});dom.window.close();h.dom.window.close();
}
// P2: root removeAll fails before creates: saved configuration survives,
// previous native menu can survive; create failure clears partial native items.
{
 const b=background();await b.ctx.rebuildMenus();const before=json(b.created);let calls=0;
 b.ctx.chrome.contextMenus.removeAll=async()=>{calls++;throw Error('Injected removeAll failure');};
 const draft=b.snapshot();draft.profiles[0].menuLabel='After save';const receipt=await b.save(draft);
 assert.equal(receipt.menuUpdated,false);assert.equal(b.state.profiles[0].menuLabel,'After save');assert.deepEqual(json(b.created),before);assert.equal(calls,1);
 reports.push({case:'P2 removeAll failure',result:'PASS',receipt,savedLabel:b.state.profiles[0].menuLabel,previousRegisteredDescriptors:before,remainingRegisteredDescriptors:json(b.created),interpretation:'mock retained old menu; real rejection may have different side effects, unknown'});
}
// P3: same target through historic/current Nested builders: exact target
// preserved, immediate-parent ancestry intentionally differs at depth >=3.
{
 const profiles=initial();let n=profiles[0].nestedMenu.roots[0];for(let i=1;i<=8;i++){n.children=[{id:'level'+i,name:'level'+i,ready:true,children:[]}];n=n.children[0];}
 const b=background();b.state.profiles=profiles;b.state.rightClickMode='nested';await b.ctx.rebuildMenus();
 const state={profiles,rightClickMode:'nested'},created=[];const ctx=vm.createContext({ROOT_MENU_ID:'redown',setTimeout,clearTimeout,chrome:{runtime:{},contextMenus:{removeAll:async()=>{},create:x=>created.push(x)},storage:{local:{get:async()=>structuredClone(state)}}},getProfiles:async()=>structuredClone(profiles)});
 vm.runInContext(oldModel+config,ctx);vm.runInContext(oldBackground.slice(oldBackground.indexOf('function sanitizeMenuId('),oldBackground.indexOf('/* Explicit, opt-in gallery capture')),ctx);await ctx.buildMenus();
 const historical=capture(state,created,ctx),modern=capture(b.state,b.created,b.ctx);
 const diff=modern.descriptors.filter(x=>x.id.startsWith('nested:')).map(current=>({id:current.id,historical:historical.descriptors.find(x=>x.id===current.id)||null,current})).filter(x=>JSON.stringify(x.historical)!==JSON.stringify(x.current));
 assert.equal(b.ctx.RedownDestinationConfig.resolve('nested:p:r:level8',profiles,'nested').prefix,'level1/level2/level3/level4/level5/level6/level7/level8');
 assert.equal(b.created.find(x=>x.id==='nested:p:r:level8').parentId,'nested:p:r:level7');assert.equal(created.find(x=>x.id==='nested:p:r:level8').parentId,'nested:p:r:level1');
 reports.push({case:'P3 eight levels historic/current actual builders',result:'PASS expected structural divergence',historical,modern,descriptorDiff:diff});
}
// Compare genuine historical/current click listeners, using actual selectedUrl.
async function clicks(source,historical=false){
 const profiles=initial(),calls=[],notices=[],history=[];let listener,mode='simple';
 const ctx=vm.createContext({structuredClone,chrome:{contextMenus:{onClicked:{addListener:fn=>listener=fn}},storage:{local:{get:async()=>({rightClickMode:mode})}}},getProfiles:async()=>structuredClone(profiles),launchSaveDroplet:()=>{},basenameFromUrl:()=> 'fixture.bin',categoryForContext:()=> 'files',ingestCloudflareAtPrefix:async(p,url,prefix)=>{calls.push({accountId:p.accountId,bucketName:p.bucketName,prefix,url});return 'mock-receipt';},recordTransfer:async r=>history.push(r),notify:async(...args)=>notices.push(args)});
 vm.runInContext((historical?oldModel:model)+config,ctx);
 vm.runInContext(source.slice(source.indexOf('function selectedUrl('),source.indexOf('function categoryForContext(')),ctx);
 const start=source.indexOf('chrome.contextMenus.onClicked.addListener(async (info, tab) => {');vm.runInContext(source.slice(start,source.indexOf('\n});',start)+4),ctx);
 const contexts=[{pageUrl:'https://fixture.test/page'},{pageUrl:'https://fixture.test/page',linkUrl:'https://fixture.test/link'},{pageUrl:'https://fixture.test/page',linkUrl:'https://fixture.test/link',srcUrl:'https://fixture.test/image',mediaType:'image'},{pageUrl:'https://fixture.test/page',srcUrl:'https://fixture.test/video',mediaType:'video'}];
 for(const info of contexts)await listener({menuItemId:'simple-option:p:extra',...info},{});
 const valid=calls.length;mode='nested';await listener({menuItemId:'simple-option:p:extra',pageUrl:'https://fixture.test/page'},{});
 const modeMismatch=calls.length-valid;
 profiles[0].simpleOptions=[];await listener({menuItemId:'simple-option:p:extra',pageUrl:'https://fixture.test/page'},{});
 const afterDeleted=calls.length;
 await listener({menuItemId:'simple-option:p:extra:malformed',pageUrl:'https://fixture.test/page'},{});
 return {calls,notices,history,modeMismatch,afterDeleted};
}
{
 const historical=await clicks(oldBackground,true),modern=await clicks(bg);
 assert.deepEqual(historical.calls.slice(0,4),modern.calls);assert.equal(historical.modeMismatch,1);assert.equal(modern.modeMismatch,0);assert.equal(modern.afterDeleted,4);
 reports.push({case:'P4 genuine historical/current click listeners: page/link/image/video, mode mismatch, deleted/malformed',result:'PASS expected safety divergence',historical,modern,interpretation:'Legacy stale Simple ID can transfer while Nested active; Modern rejects freshly. Transfer stub proves dispatch target only, not Worker bytes.'});
}
// P5: Nested validation checks each name, but not assembled prefix length.
{
 const b=background(),draft=b.snapshot();draft.mode='nested';let parent=draft.profiles[0].nestedMenu.roots[0];
 const names=[];for(let i=1;i<=8;i++){const name='x'.repeat(150);names.push(name);parent.children=[{id:'long'+i,name,ready:true,children:[]}];parent=parent.children[0];}
 const receipt=await b.save(draft);const id='nested:p:r:long8';assert.equal(receipt.menuUpdated,true);assert.ok(b.created.some(x=>x.id===id));assert.equal(b.ctx.RedownDestinationConfig.resolve(id,b.state.profiles,'nested'),null);
 reports.push({case:'P5 assembled Nested prefix validation gap',result:'PASS reproduced negative gap',prefixCharacters:names.join('/').length,prefixBytes:Buffer.byteLength(names.join('/')),receipt,descriptor:json(b.created.find(x=>x.id===id)),resolved:null,interpretation:'Save validates names/depth but not concatenated prefix; resolver rejects over1024 JS length. Synthetic, not owner attribution.'});
}
// P6: explorerManaged hides a Nested profile from plan, but active-mode
// validation still examines its enabled model and can reject another edit.
{
 const b=background();const managed=structuredClone(initial()[0]);managed.id='managed';managed.explorerManaged=true;managed.nestedMenu.roots[0].id='managed-root';managed.nestedMenu.roots[0].children=[{id:'managed-blank',name:'',ready:false,children:[]}];b.state.profiles.push(managed);
 const draft=b.snapshot();draft.mode='nested';let error='';try{await b.save(draft);}catch(e){error=e.message;}
 assert.match(error,/Choose or create every active Nested folder/);assert.equal(b.mutations.length,0);
 const plan=b.ctx.RedownNestedLocations.menuEntries(b.state.profiles,'nested','redown');assert.ok(!plan.some(x=>x.id.startsWith('nested:managed:')));
 reports.push({case:'P6 hidden managed Nested profile validates despite planner exclusion',result:'PASS reproduced negative gap',error,storageWrites:b.mutations.length,hiddenProfileHasPlannedEntries:false,interpretation:'Corrupt/imported synthetic managed profile, not normal activation/owner state. Validator selection differs from planner selection.'});
}
console.log(JSON.stringify({revision,oldRevision,scope:'isolated actual-source extraction, synthetic state, no installed Chrome or provider calls',reports},null,2));

```

## D1–D10 recheck

Take the first JavaScript block in `FOREVER_WORKS/right-click/evidence/phase-2/REPRODUCTION.md` without changes, write it to `work/phase3/phase2-recheck.mjs`, run `node work/phase3/phase2-recheck.mjs`. It reads current source paths and historical git objects. Exit0; raw output phase2-recheck.log. The original reproduction names source2e65ba1; this invocation actually evaluates source at the Phase3 pin, whose extension/tests trees are byte-identical.
