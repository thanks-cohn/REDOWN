# Phase 3 isolated reproduction

No production hooks. From repository root after npm ci, create work/phase3/parity.mjs with this exact block and run node work/phase3/parity.mjs. Its fixture helpers originate in unchanged tests/modern-destinations.test.mjs; historical extracts use verified 515c272. Provider, Chrome, credentials and storage are synthetic. The deep-folder picker response is deliberately changed from photos/ to photos/final/ in the mock only. This tests exact target adoption, not provider pagination.

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
const plain=x=>JSON.parse(JSON.stringify(x));
const targets=(ctx,state,entries)=>entries.filter(x=>/^(quick:|simple-option:|nested:)/.test(x.id)).map(x=>{const t=ctx.RedownDestinationConfig.resolve(x.id,state.profiles,state.rightClickMode);return {...plain(x),target:t?{owner:t.owner.id,account:t.profile.accountId,bucket:t.profile.bucketName,prefix:t.prefix}:null};});
const oldjs=execFileSync('git',['show','515c272:extension/options.js'],{encoding:'utf8'}),oldbg=execFileSync('git',['show','515c272:extension/background.js'],{encoding:'utf8'}),oldmodel=execFileSync('git',['show','515c272:extension/nested-locations.js'],{encoding:'utf8'});
async function oldPlan(profiles,mode='simple'){
 const entries=[];const ctx=vm.createContext({ROOT_MENU_ID:'redown',setTimeout,clearTimeout,chrome:{runtime:{},contextMenus:{removeAll:async()=>{},create:item=>entries.push(plain(item))},storage:{local:{get:async()=>({profiles,rightClickMode:mode,simpleLabelFallback:'menu'})}}},getProfiles:async()=>structuredClone(profiles)});
 vm.runInContext(oldmodel,ctx);vm.runInContext(oldbg.slice(oldbg.indexOf('function sanitizeMenuId('),oldbg.indexOf('/* Explicit, opt-in gallery capture')),ctx);await ctx.buildMenus();return entries;
}
// Same real user intent, actual historical selection/add/remove callbacks and current callbacks.
{
 const dom=new JSDOM('<div id="host"></div><div id="status"></div>',{runScripts:'outside-only'}),w=dom.window,state={profiles:initial()},writes=[];
 const folders={'':['photos'],'photos':['final'],'photos/final':[]};w.structuredClone=structuredClone;w.uid=()=> 'added';w.send=async m=>m.type==='cfBuckets'?{ok:true,buckets:[{name:'art'}]}:{ok:true,children:folders[m.parentPrefix]||[]};w.chrome={storage:{local:{get:async()=>structuredClone(state),set:async patch=>{Object.assign(state,structuredClone(patch));writes.push(plain(patch));}}}};
 w.eval('var profiles='+JSON.stringify(initial())+';'+oldjs.slice(oldjs.indexOf('async function saveProfiles()'),oldjs.indexOf('function makeNode('))+oldjs.slice(oldjs.indexOf('function simpleFolderPathEditor('),oldjs.indexOf('function simpleBucketCreator('))+oldjs.slice(oldjs.indexOf('function field('),oldjs.indexOf('function selectField('))+'document.getElementById("host").append(simplePrimaryLocationField(profiles[0]));var extras=simpleExtraOptions(profiles[0]);document.getElementById("host").append(extras);');
 await settle();let bucket=w.document.querySelector('.default-location-builder select');bucket.value='art';bucket.dispatchEvent(new w.Event('change'));await settle();
 let select=w.document.querySelector('.simple-location-row select');select.value='photos';select.dispatchEvent(new w.Event('change'));await settle();
 [...w.document.querySelectorAll('.default-location-builder .simple-location-row button')].find(x=>x.textContent==='+ Child').click();await settle();select=w.document.querySelectorAll('.default-location-builder .simple-location-row select')[1];select.value='final';select.dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,230));
 w.eval('extras.addLocation()');await settle();w.document.querySelector('button.ghost').click();await settle();
 assert.equal(state.profiles[0].defaultPrefix,'photos/final');assert.equal(state.profiles[0].simpleOptions.length,1);
 const legacy=await oldPlan(state.profiles);
 // Recreate UI with only synthetic read response changed, production editor remains byte-identical.
 const deepUiSource=ui.toString().replace("prefix:'photos/'","prefix:'photos/final/'");
 const deepUi=eval('('+deepUiSource+')');const m=await deepUi();
 const rootCard=m.d.querySelector('[data-destination-id="p"]');[...rootCard.querySelectorAll('button')].find(x=>x.textContent==='Choose folder').click();await settle();
 [...m.d.querySelectorAll('button')].find(x=>x.textContent==='art ›').click();await settle();
 [...m.d.querySelectorAll('button')].find(x=>x.textContent==='photos ›').click();await settle();
 [...m.d.querySelectorAll('button')].filter(x=>x.textContent==='Select here').at(-1).click();await settle();
 m.d.getElementById('destination-add').click();await settle();m.d.querySelector('[data-destination-id="extra"] .destination-remove-x').click();await settle();m.d.getElementById('destination-save').click();await settle();
 const modern=plain(m.b.created);assert.equal(m.b.state.profiles[0].defaultPrefix,'photos/final');assert.equal(m.b.state.profiles[0].simpleOptions.length,1);
 observations.push({case:'P1 actual Legacy/current choose bucket + nested folder + add extra + remove original extra',legacy:{profiles:state.profiles,writeCount:writes.length,descriptors:legacy},modern:{profiles:m.b.state.profiles,descriptors:modern,targets:targets(m.b.ctx,m.b.state,modern)},comparison:'Primary quick:p, parent redown and exact a/art/photos/final match. Added UUID and default label differ by editor; full descriptors retained. Legacy autosaves; Modern requires Save.'});dom.window.close();m.dom.window.close();
}
{
 const b=background();const oldRemove=b.ctx.chrome.contextMenus.removeAll;b.ctx.chrome.contextMenus.removeAll=async()=>{throw Error('Injected removeAll rejection');};const draft=b.snapshot();draft.profiles[0].menuLabel='persisted despite removeAll';const result=await b.save(draft);assert.equal(result.ok,true);assert.equal(result.menuUpdated,false);assert.equal(b.state.profiles[0].menuLabel,'persisted despite removeAll');observations.push({case:'P2 removeAll failure',result,state:b.state,created:b.created});b.ctx.chrome.contextMenus.removeAll=oldRemove;
}
{
 const b=background();b.state.profiles[0].nestedMenu.enabled=false;b.state.rightClickMode='nested';await b.ctx.rebuildMenus();const id='nested:p:r:n';assert.equal(b.ctx.RedownDestinationConfig.resolve(id,b.state.profiles,'nested'),null);observations.push({case:'P3 disabled group stale ID',target:null,descriptors:b.created});
}
{
 const b=background();b.state.profiles[0].nestedMenu.roots[0].children=[{id:'one',name:'one',ready:true,children:[{id:'two',name:'two',ready:true,children:[{id:'three',name:'three',ready:true,children:[]}]}]}];b.state.rightClickMode='nested';await b.ctx.rebuildMenus();const historical=await oldPlan(b.state.profiles,'nested'),current=plain(b.created);assert.equal(current.find(x=>x.id==='nested:p:r:three').parentId,'nested:p:r:two');assert.equal(historical.find(x=>x.id==='nested:p:r:three').parentId,'nested:p:r:one');observations.push({case:'P4 actual historical deep flattening versus immediate current ancestry',historical,current,targets:targets(b.ctx,b.state,current)});
}
{
 const b=background(),draft=b.snapshot();draft.profiles[0].menuLabel='first';await b.save(draft);let error;try{await b.save(draft);}catch(e){error=e.message;}assert.match(error,/another window/);observations.push({case:'P5 stale signature',error,storedLabel:b.state.profiles[0].menuLabel});
}
{
 const b=background();b.state.profiles[0].simpleOptions[0].id='p';b.state.profiles[0].simplePrimaryEnabled=false;const draft=b.snapshot();await b.save(draft);observations.push({case:'P6 option IDs may equal profile IDs without collision',targets:targets(b.ctx,b.state,b.created)});
}

{
 const b=background();const p=b.state.profiles[0];p.simplePrimaryEnabled=false;p.simpleOptions=[];p.menuConfigVersion=1;p.nestedMenu={version:1,enabled:true,roots:[]};p.menuTree=[{id:'old',prefix:'ghost'}];await b.save(b.snapshot());const first=plain(b.created);await b.ctx.rebuildMenus();assert.ok(!b.created.some(x=>/^(quick:|simple-option:|nested:|tree:)/.test(x.id)));observations.push({case:'P7 versioned empty, delete all, repeat build',first,second:plain(b.created),oldTreeRetained:p.menuTree});
}
{
 const b=background();let children=b.state.profiles[0].nestedMenu.roots[0].children;children.length=0;for(let i=1;i<=8;i++){const n={id:'d'+i,name:'level'+i,ready:true,children:[]};children.push(n);children=n.children;}b.state.rightClickMode='nested';await b.save(b.snapshot());const full=targets(b.ctx,b.state,b.created);assert.equal(full.find(x=>x.id==='nested:p:r:d8').target.prefix,Array.from({length:8},(_,i)=>'level'+(i+1)).join('/'));b.state.profiles[0].nestedMenu.roots[0].children[0].children=[];await b.save(b.snapshot());assert.equal(b.ctx.RedownDestinationConfig.resolve('nested:p:r:d1:send',b.state.profiles,'nested'),null);observations.push({case:'P8 eight levels then branch removal',full,after:targets(b.ctx,b.state,b.created)});
}
{
 const b=background();const p=b.state.profiles[0],other=structuredClone(p);other.id='other';other.bucketName='second';other.simpleOptions=[];other.nestedMenu={version:1,enabled:false,roots:[]};b.state.profiles.push(other);await b.save(b.snapshot());const sameTitle=targets(b.ctx,b.state,b.created);assert.equal(sameTitle.find(x=>x.id==='quick:other').target.bucket,'second');delete b.state.profiles[0].token;await b.ctx.rebuildMenus();assert.equal(b.ctx.RedownDestinationConfig.resolve('quick:p',b.state.profiles,'simple'),null);for(const id of ['tree:p:old','quick:missing','simple-option:p:deleted','nested:p:r:bad','quick:p:bad'])assert.equal(b.ctx.RedownDestinationConfig.resolve(id,b.state.profiles,'simple'),null);observations.push({case:'P9 duplicate titles distinct targets; missing preparation; malformed/stale IDs',sameTitle,invalidPreparedTarget:null});
}
{
 const b=background(),ctx=b.ctx,calls=[],history=[],notices=[];ctx.launchSaveDroplet=()=>{};ctx.selectedUrl=undefined;ctx.basenameFromUrl=u=>u.split('/').at(-1);ctx.ingestCloudflareAtPrefix=async(p,u,prefix,filename,receipt)=>{calls.push({account:p.accountId,bucket:p.bucketName,prefix,url:u,filename});receipt.destination={accountId:p.accountId,bucketName:p.bucketName,prefix,key:prefix+'/'+filename};return 'mock-receipt';};ctx.recordTransfer=async x=>history.push(plain(x));ctx.notify=async(...x)=>notices.push(x);ctx.chrome.contextMenus.onClicked={addListener:fn=>ctx.click=fn};vm.runInContext(bg.slice(bg.indexOf('function selectedUrl('),bg.indexOf('function categoryForContext(')),ctx);vm.runInContext(bg.slice(bg.indexOf('chrome.contextMenus.onClicked.addListener('),bg.indexOf('chrome.runtime.onMessage.addListener(')),ctx);
 for(const input of [{pageUrl:'https://source.invalid/page'},{pageUrl:'https://source.invalid/page',linkUrl:'https://source.invalid/link'},{pageUrl:'https://source.invalid/page',linkUrl:'https://source.invalid/link',srcUrl:'https://source.invalid/image.jpg',mediaType:'image'},{pageUrl:'https://source.invalid/page',srcUrl:'https://source.invalid/movie.mp4',mediaType:'video'}])await ctx.click({menuItemId:'simple-option:p:extra',...input},{id:1,url:input.pageUrl});assert.equal(calls.length,4);assert.equal(calls[2].url,'https://source.invalid/image.jpg');b.state.profiles[0].simpleOptions=[];await ctx.click({menuItemId:'simple-option:p:extra',pageUrl:'https://source.invalid/page'},{id:1});assert.equal(calls.length,4);observations.push({case:'P10 actual click listener all required contexts and deleted target',calls,history,notices});
}

{
 const output=[];
 for(const [version,source] of [['legacy',oldbg],['modern',bg]]){
  const b=background(),ctx=b.ctx,calls=[],history=[];b.state.profiles[0].defaultPrefix='photos/final';
  ctx.launchSaveDroplet=()=>{};ctx.basenameFromUrl=u=>u.split('/').at(-1);ctx.categoryForContext=()=> 'files';ctx.notify=async()=>{};ctx.recordTransfer=async x=>history.push(plain(x));ctx.ingestCloudflareAtPrefix=async(p,url,prefix,filename,receipt)=>{calls.push({account:p.accountId,bucket:p.bucketName,prefix,url,filename});receipt.destination={accountId:p.accountId,bucketName:p.bucketName,prefix,key:prefix+'/'+filename};return 'mock-provider';};ctx.chrome.contextMenus.onClicked={addListener:fn=>ctx.click=fn};
  vm.runInContext(source.slice(source.indexOf('function selectedUrl('),source.indexOf('function categoryForContext(')),ctx);
  vm.runInContext(source.slice(source.indexOf('chrome.contextMenus.onClicked.addListener('),source.indexOf('chrome.runtime.onMessage.addListener(')),ctx);
  await ctx.click({menuItemId:'quick:p',srcUrl:'https://source.invalid/photo.jpg',pageUrl:'https://source.invalid/page'},{id:1});assert.equal(calls.length,1);assert.equal(calls[0].prefix,'photos/final');output.push({version,calls,history});
 }
 assert.deepEqual(output[0].calls,output[1].calls);observations.push({case:'P11 actual historical/current native quick listener same target',output});
}
console.log(JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Synthetic actual-source VM/jsdom. No Chrome installed or providers contacted.',observations},null,2));

```

D1–D10 rerun: extract the first JavaScript block from ../../evidence/phase-2/REPRODUCTION.md into work/phase3/prior-differential.mjs and run node work/phase3/prior-differential.mjs. See prior-differential.json.
