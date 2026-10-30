import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
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
  const b=background(),calls=[];if(preset)b.state.profiles=preset;
  const dom=new JSDOM(html,{url:'https://fixture.test/beta/explorer.html',runScripts:'outside-only'}),w=dom.window;
  w.structuredClone=structuredClone;w.confirm=()=>true;
  w.chrome={storage:{local:{get:async()=>structuredClone(b.state)},onChanged:{addListener:()=>{}}},runtime:{sendMessage:async m=>{calls.push(m);if(m.type==='cfProvision'){b.state.profiles.push({...initial()[0],id:'adopted-existing',accountId:m.accountId,bucketName:m.bucketName,menuLabel:m.bucketName,simpleOptions:[]});return {ok:true};}if(m.type==='profiles')return {ok:true,profiles:structuredClone(b.state.profiles)};if(m.type==='cfAccounts')return {ok:true,accounts:[{id:'a',name:'Account'}]};if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'art'},{name:'unprepared'}]};if(m.type==='cfFolderChildren')return {ok:true,children:['photos']};if(m.type==='cfDestinationFolders')return {ok:true,folders:[{name:'photos',prefix:'photos/'}],cursor:''};if(m.type==='saveDestinationConfig')try{return await b.save(m);}catch(error){return {ok:false,error:error.message};}throw Error(m.type);}}};
  for(const source of [model,config,nested,picker,editor])w.eval(source);await settle();return {b,calls,dom,w,d:w.document};
}
test('Simple additions are exactly one local card per click; no cloud mutation, IDs and reordering survive save',async()=>{
  const h=await ui();try{const {d,w,b,calls}=h;assert.equal(d.querySelectorAll('.destination-card').length,2);const originalCard=d.querySelector('.destination-card');
    d.getElementById('destination-add').click();d.getElementById('destination-add').click();await settle();assert.equal(d.querySelectorAll('.destination-card').length,4);assert.equal(d.querySelector('.destination-card'),originalCard,'adding a card must not replace existing editor elements');
    const cards=[...d.querySelectorAll('.destination-card')],last=cards.at(-1),id=last.dataset.destinationId;
    const input=last.querySelector('input');input.value='Final art';input.dispatchEvent(new w.Event('input'));
    last.querySelector('[aria-label="Move destination up"]').click();await settle();
    d.getElementById('destination-save').click();await settle();assert.match(d.getElementById('destination-status').textContent,/up to date/);
    assert.equal(b.state.profiles[0].simpleOptions.length,3);assert.equal(b.state.profiles[0].simpleOptions.find(x=>x.id===id).label,'Final art');
    assert.ok(b.created.some(x=>x.id==='simple-option:p:'+id&&x.title==='Final art'));
    assert.ok(calls.every(c=>['profiles','cfAccounts','cfBuckets','saveDestinationConfig'].includes(c.type)));
    assert.equal(calls.filter(c=>c.type==='cfBuckets').length,1);
  }finally{h.dom.window.close();}
});
test('mode switches preserve both configurations, remain drafts until save, and reload restores active layout',async()=>{
  const h=await ui();try{const {d,b}=h;d.getElementById('destination-mode').click();await settle();assert.equal(d.getElementById('destination-simple').hidden,true);assert.equal(b.state.rightClickMode,'simple');
    d.getElementById('destination-save').click();await settle();assert.equal(b.state.rightClickMode,'nested');assert.equal(b.state.profiles[0].simpleOptions[0].id,'extra');assert.ok(b.created.some(x=>x.id==='nested:p:r:n'));assert.ok(b.created.some(x=>x.title==='Send here'));assert.ok(!b.created.some(x=>x.id.startsWith('quick:')));d.getElementById('destination-reload').click();await settle();assert.equal(d.getElementById('destination-mode').getAttribute('aria-pressed'),'true');
    d.getElementById('destination-mode').click();await settle();assert.equal(d.querySelectorAll('.destination-card').length,2);d.getElementById('destination-save').click();await settle();assert.equal(b.state.profiles[0].nestedMenu.roots[0].children[0].id,'n');
    assert.doesNotMatch(d.querySelector('.destination-mode').textContent,/\b(?:ON|OFF)\b/);
  }finally{h.dom.window.close();}
});
test('existing folder picker routes exact prefix without creating folders or provisioning',async()=>{
  const h=await ui();try{const {d,b}=h;[...d.querySelectorAll('.destination-card button')].find(b=>b.textContent==='Choose folder').click();await settle();
    [...d.querySelectorAll('.explorer-submenu button')].find(b=>b.textContent==='art ›').click();await settle();
    const photo=[...d.querySelectorAll('.explorer-submenu button')].find(b=>b.textContent==='photos ›');assert.ok(photo);photo.click();await settle();
    const select=[...d.querySelectorAll('.explorer-submenu button')].filter(b=>b.textContent==='Select here').at(-1);assert.ok(select);select.click();await settle();d.getElementById('destination-save').click();await settle();assert.equal(b.state.profiles[0].defaultPrefix,'photos');assert.ok(!h.calls.some(c=>/Create|Provision|Setup/.test(c.type)));
  }finally{h.dom.window.close();}
});
test('collapsed Nested nodes load lazily, labels do not alter paths, and sibling moves persist',async()=>{
  const presets=initial();presets[0].nestedMenu.roots[0].children.push({id:'sibling',name:'photos',label:'Other view',ready:true,children:[]});
  const h=await ui(presets);try{const {d,w,b}=h;d.getElementById('destination-mode').click();await settle();assert.equal(h.calls.filter(c=>c.type==='cfFolderChildren').length,0);
    d.querySelector('.nested-collapse').click();await settle();const group=d.querySelector('[data-node-id="n"]');assert.ok(group);
    const label=group.querySelector('.nested-menu-controls input');label.value='Portfolio';label.dispatchEvent(new w.Event('change'));await settle();group.querySelector('[aria-label="Move menu entry down"]').click();await settle();d.getElementById('destination-save').click();await settle();assert.equal(b.state.profiles[0].nestedMenu.roots[0].children[1].id,'n');assert.ok(b.created.some(x=>x.title==='Portfolio'));assert.equal(b.ctx.RedownNestedLocations.destinations(b.state.profiles[0].nestedMenu).find(x=>x.nodeId==='n').prefix,'photos');
  }finally{h.dom.window.close();}
});
test('stale concurrent saves reject rather than overwrite newer changes; storage failures leave old config intact',async()=>{
  const b=background(),one=b.snapshot(),two=b.snapshot();one.profiles[0].menuLabel='New';two.profiles[0].menuLabel='Old';
  const result=await Promise.allSettled([b.save(one),b.save(two)]);assert.equal(result[0].status,'fulfilled');assert.equal(result[1].status,'rejected');assert.equal(b.state.profiles[0].menuLabel,'New');assert.equal(b.maxActive,1);
  const failed=b.snapshot();failed.profiles[0].menuLabel='Lost';b.failStorage=true;await assert.rejects(b.save(failed),/Storage full/);assert.equal(b.state.profiles[0].menuLabel,'New');
});
test('native Chrome callback errors preserve saved configuration and successful retry rebuilds it',async()=>{
  const b=background(),draft=b.snapshot();draft.profiles[0].menuLabel='Saved';b.failMenu=true;const result=await b.save(draft);assert.equal(result.menuUpdated,false);assert.equal(b.state.profiles[0].menuLabel,'Saved');b.failMenu=false;assert.equal((await b.save(b.snapshot())).menuUpdated,true);
});
test('invalid paths, duplicate IDs, unprepared buckets and excessive hierarchy fail before persistence',async()=>{
  for(const alter of [p=>p.simpleOptions[0].prefix='../escape',p=>p.simpleOptions.push({...p.simpleOptions[0]}),p=>p.simpleOptions[0].bucketName='unknown',p=>{let n=p.nestedMenu.roots[0];for(let i=0;i<10;i++){n.children=[{id:'depth'+i,name:'folder',ready:true,children:[]}];n=n.children[0];}}]){const b=background(),draft=b.snapshot();alter(draft.profiles[0]);if(draft.profiles[0].nestedMenu.roots[0].children[0]?.id==='depth0')draft.mode='nested';await assert.rejects(b.save(draft));assert.equal(b.mutations.length,0);}
});
test('primary removal only suppresses its menu and keeps profile and remote routing credentials',async()=>{
  const b=background(),draft=b.snapshot();draft.profiles[0].simplePrimaryEnabled=false;await b.save(draft);assert.ok(!b.created.some(x=>x.id==='quick:p'));assert.ok(b.created.some(x=>x.id==='simple-option:p:extra'));assert.equal(b.state.profiles[0].token,'fixture');assert.equal(b.state.profiles.length,1);
});
test('modern menu navigation and quick setup preserve selected mode in source',()=>{
  const setup=bg.slice(bg.indexOf('async function setupRedownQuickDestination'),bg.indexOf('async function ensureWorkersSubdomain'));assert.doesNotMatch(setup,/rightClickMode\s*:\s*["']simple/);assert.match(bg,/beta\/explorer.html#explorer-destinations/);
});
test('Add Location without a prepared bucket explains activation instead of creating unusable draft cards',async()=>{
  const h=await ui([]);try{
    h.d.getElementById('destination-add').click();h.d.getElementById('destination-add').click();await settle();
    assert.equal(h.d.querySelectorAll('.destination-card').length,0);
    assert.match(h.d.getElementById('destination-status').textContent,/Choose a bucket|Activate Buckets/);
    assert.equal(h.calls.filter(c=>c.type==='cfProvision').length,0);
    assert.equal(h.calls.filter(c=>c.type==='saveDestinationConfig').length,0);
    assert.equal(h.d.getElementById('destination-first-setup').open,true);
  }finally{h.dom.window.close();}
});
test('Add Location can activate an existing Cloudflare bucket without creating another R2 bucket',async()=>{
  const h=await ui([]);try{
    const {d,w}=h;
    const accounts=d.getElementById('accounts');accounts.add(new w.Option('Account','a'));accounts.value='a';
    const existing=d.createElement('button');existing.dataset.bucket='art';existing.setAttribute('aria-current','');d.getElementById('buckets').append(existing);
    d.getElementById('destination-add').click();await settle();
    assert.equal(h.calls.filter(c=>c.type==='cfProvision').length,1);
    assert.equal(h.calls.filter(c=>c.type==='cfCreateBucket').length,0);
    assert.ok(d.querySelector('.destination-card'));
    assert.ok(h.b.state.profiles.some(p=>p.bucketName==='art'));
    assert.match(d.getElementById('destination-status').textContent,/Unsaved changes/);
  }finally{h.dom.window.close();}
});
test('account edits retain the destination identifier and route it through that account’s prepared profile',async()=>{
  const presets=initial();presets.push({...presets[0],id:'second',accountId:'b',bucketName:'video',explorerManaged:true,simpleOptions:[],nestedMenu:{version:1,enabled:false,roots:[]}});
  const h=await ui(presets);try{const select=h.d.querySelector('[data-destination-id="extra"] [aria-label="Cloudflare account"]');select.value='b';select.dispatchEvent(new h.w.Event('change'));await settle();h.d.getElementById('destination-save').click();await settle();assert.ok(!h.b.state.profiles[0].simpleOptions.length);assert.equal(h.b.state.profiles[1].simpleOptions[0].id,'extra');assert.equal(h.b.state.profiles[1].simpleOptions[0].bucketName,'video');assert.ok(h.b.created.some(x=>x.id==='simple-option:second:extra'));}finally{h.dom.window.close();}
});
test('production Simple and Nested click branches hand the exact account, bucket and prefix to the existing transfer engine',async()=>{
  const profiles=initial(),calls=[],history=[];
  const ctx=vm.createContext({profiles,sourceUrl:'https://fixture.test/photo.jpg',basenameFromUrl:()=> 'photo.jpg',ingestCloudflareAtPrefix:async(p,_url,prefix)=>{calls.push({accountId:p.accountId,bucketName:p.bucketName,prefix});return 'saved';},recordTransfer:async r=>history.push(r),notify:async()=>{}});vm.runInContext(model,ctx);
  const simple=bg.slice(bg.indexOf('  const extraSimpleMatch='),bg.indexOf('  const quickMatch =',bg.indexOf('  const extraSimpleMatch=')));
  const nestedClick=bg.slice(bg.indexOf('  const nestedMatch=String(info.menuItemId).match'),bg.indexOf('  const treeMatch =',bg.indexOf('  const nestedMatch=String(info.menuItemId).match')));
  ctx.info={menuItemId:'simple-option:p:extra'};await vm.runInContext('(async()=>{'+simple+'})()',ctx);
  ctx.info={menuItemId:'nested:p:r:n'};await vm.runInContext('(async()=>{'+nestedClick+'})()',ctx);
  assert.deepEqual(calls,[{accountId:'a',bucketName:'art',prefix:'photos'},{accountId:'a',bucketName:'art',prefix:'photos'}]);assert.equal(history.filter(r=>r.ok).length,2);
});
test('large Simple configurations share one bucket discovery and render without per-card observers',async()=>{
  const presets=initial();presets[0].simpleOptions=Array.from({length:99},(_,i)=>({id:'entry'+i,label:'Entry '+i,bucketName:'art',prefix:''}));const h=await ui(presets);
  try{assert.equal(h.d.querySelectorAll('.destination-card').length,100);assert.equal(h.calls.filter(c=>c.type==='cfBuckets').length,1);assert.doesNotMatch(editor,/MutationObserver|ResizeObserver|requestAnimationFrame|setInterval/);}finally{h.dom.window.close();}
});
test('inactive invalid legacy hierarchy is preserved while saving valid Simple changes',async()=>{
  const b=background();b.state.profiles[0].nestedMenu.roots[0].bucketName='not-prepared';const before=structuredClone(b.state.profiles[0].nestedMenu),draft=b.snapshot();draft.profiles[0].menuLabel='Updated';assert.equal((await b.save(draft)).menuUpdated,true);assert.deepEqual(b.state.profiles[0].nestedMenu,before);
});
