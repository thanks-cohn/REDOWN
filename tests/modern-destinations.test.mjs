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
  const listeners=[];const b=background(),calls=[],folders=new Map([['',['photos']]]);if(preset)b.state.profiles=preset;
  const dom=new JSDOM(html,{url:'https://fixture.test/beta/explorer.html',runScripts:'outside-only'}),w=dom.window;
  w.structuredClone=structuredClone;w.confirm=()=>true;
  w.chrome={storage:{local:{get:async()=>structuredClone(b.state)},onChanged:{addListener:fn=>listeners.push(fn)}},runtime:{sendMessage:async m=>{calls.push(m);if(m.type==='cfProvision'){b.state.profiles.push({...initial()[0],id:'adopted-existing',accountId:m.accountId,bucketName:m.bucketName,menuLabel:m.bucketName,simpleOptions:[]});return {ok:true};}if(m.type==='profiles')return {ok:true,profiles:structuredClone(b.state.profiles)};if(m.type==='cfAccounts')return {ok:true,accounts:[{id:'a',name:'Account'}]};if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'art'},{name:'unprepared'}]};if(m.type==='cfFolderChildren')return {ok:true,children:folders.get(m.parentPrefix)||[]};if(m.type==='cfCreateFolder'){folders.set(m.prefix,[...(folders.get(m.prefix)||[]),m.name]);return {ok:true,key:[m.prefix,m.name].filter(Boolean).join('/')+'/'};}if(m.type==='cfDestinationFolders')return {ok:true,folders:[{name:'photos',prefix:'photos/'}],cursor:''};if(m.type==='saveDestinationConfig')try{return await b.save(m);}catch(error){return {ok:false,error:error.message};}throw Error(m.type);}}};
  for(const source of [model,config,nested,picker,editor])w.eval(source);await settle();return {b,calls,dom,w,d:w.document,change:patch=>listeners.forEach(fn=>fn(patch,'local'))};
}
test('Simple additions are exactly one local card per click; no cloud mutation, IDs and reordering survive save',async()=>{
  const h=await ui();try{const {d,w,b,calls}=h;assert.equal(d.querySelectorAll('.destination-card').length,2);const originalCard=d.querySelector('.destination-card');
    d.getElementById('destination-add').click();d.getElementById('destination-add').click();await settle();assert.equal(d.querySelectorAll('.destination-card').length,4);assert.equal(d.querySelector('.destination-card'),originalCard,'adding a card must not replace existing editor elements');
    const cards=[...d.querySelectorAll('.destination-card')],last=cards.at(-1),id=last.dataset.destinationId;
    const input=last.querySelector('input');input.value='Final art';input.dispatchEvent(new w.Event('input'));
    last.querySelector('[aria-label="Move destination up"]').click();await settle();
    d.getElementById('destination-save').click();await settle();assert.match(d.getElementById('destination-status').textContent,/right-click menu updated/i);
    assert.equal(b.state.profiles[0].simpleOptions.length,3);assert.equal(b.state.profiles[0].simpleOptions.find(x=>x.id===id).label,'Final art');
    assert.ok(b.created.some(x=>x.id==='simple-option:p:'+id&&x.title==='Final art'));
    assert.ok(calls.every(c=>['profiles','cfAccounts','cfBuckets','saveDestinationConfig'].includes(c.type)));
    assert.equal(calls.filter(c=>c.type==='cfBuckets').length,1);
  }finally{h.dom.window.close();}
});
test('mode switches persist immediately, preserve both configurations, and reload restores active layout',async()=>{
  const h=await ui();try{const {d,b}=h;d.getElementById('destination-mode').click();await settle();assert.equal(d.getElementById('destination-simple').hidden,true);assert.equal(b.state.rightClickMode,'nested');
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
    assert.equal(h.d.getElementById('destination-first-setup').open,false,'optional setup stays collapsed until user asks');
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
test('production click listener resolves exact active account, bucket and prefix and rejects stale IDs',async()=>{
  const profiles=initial(),calls=[],history=[],notices=[];let listener,mode='simple';
  const ctx=vm.createContext({structuredClone,chrome:{contextMenus:{onClicked:{addListener:fn=>listener=fn}},storage:{local:{get:async()=>({rightClickMode:mode})}}},
    getProfiles:async()=>structuredClone(profiles),launchSaveDroplet:()=>{},selectedUrl:()=> 'https://fixture.test/photo.jpg',basenameFromUrl:()=> 'photo.jpg',
    ingestCloudflareAtPrefix:async(p,_url,prefix)=>{calls.push({accountId:p.accountId,bucketName:p.bucketName,prefix});return 'saved';},recordTransfer:async r=>history.push(r),notify:async(...args)=>notices.push(args)});
  vm.runInContext(model+config,ctx);
  const start=bg.indexOf('chrome.contextMenus.onClicked.addListener(async (info, tab) => {');
  vm.runInContext(bg.slice(start,bg.indexOf('\n});',start)+4),ctx);
  await listener({menuItemId:'simple-option:p:extra'},{});mode='nested';await listener({menuItemId:'nested:p:r:n'},{});
  assert.deepEqual(calls,[{accountId:'a',bucketName:'art',prefix:'photos'},{accountId:'a',bucketName:'art',prefix:'photos'}]);assert.equal(history.filter(r=>r.ok).length,2);
  profiles[0].nestedMenu.roots=[];await listener({menuItemId:'nested:p:r:n'},{});
  await listener({menuItemId:'tree:p:old'},{});await listener({menuItemId:'simple-option:p:extra'},{});
  mode='simple';profiles[0].simplePrimaryEnabled=false;profiles[0].simpleOptions=[];
  await listener({menuItemId:'quick:p'},{});await listener({menuItemId:'simple-option:p:extra'},{});
  assert.equal(calls.length,2);assert.equal(notices.filter(x=>/inactive or was removed/.test(x[1])).length,5);
});
test('large Simple configurations share one bucket discovery and render without per-card observers',async()=>{
  const presets=initial();presets[0].simpleOptions=Array.from({length:99},(_,i)=>({id:'entry'+i,label:'Entry '+i,bucketName:'art',prefix:''}));const h=await ui(presets);
  try{assert.equal(h.d.querySelectorAll('.destination-card').length,100);assert.equal(h.calls.filter(c=>c.type==='cfBuckets').length,1);assert.doesNotMatch(editor,/MutationObserver|ResizeObserver|requestAnimationFrame|setInterval/);}finally{h.dom.window.close();}
});
test('inactive invalid legacy hierarchy is preserved while saving valid Simple changes',async()=>{
  const b=background();b.state.profiles[0].nestedMenu.roots[0].bucketName='not-prepared';const before=structuredClone(b.state.profiles[0].nestedMenu),draft=b.snapshot();draft.profiles[0].menuLabel='Updated';assert.equal((await b.save(draft)).menuUpdated,true);assert.deepEqual(b.state.profiles[0].nestedMenu,before);
});

test('Simple inline plus creates and verifies exact parent, saves stable routing and Escape cancels',async()=>{
 const h=await ui();try{const {d,w,b}=h;const card=d.querySelector('[data-destination-id="extra"]');
 card.querySelector('[aria-label^="Create folder inside"]').click();await settle();const form=card.querySelector('form'),input=form.querySelector('input');assert.equal(d.activeElement,input);input.value='cancelled';input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await settle();assert.equal(form.hidden,true);assert.ok(!h.calls.some(m=>m.type==='cfCreateFolder'));
 card.querySelector('[aria-label^="Create folder inside"]').click();input.value='new child';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();assert.equal(form.hidden,true);
 const create=h.calls.find(m=>m.type==='cfCreateFolder');assert.equal(create.accountId,'a');assert.equal(create.bucketName,'art');assert.equal(create.prefix,'photos');assert.equal(create.name,'new child');
 d.querySelector('#destination-save').click();await settle();assert.equal(b.state.profiles[0].simpleOptions.find(x=>x.id==='extra').prefix,'photos/new child');assert.ok(b.created.some(x=>x.id==='simple-option:p:extra'));
 }finally{h.dom.window.close();}
});
test('Nested plus exposes focused inline creation and keeps siblings while saving the verified child',async()=>{
 const h=await ui();try{const {d,w,b}=h;d.querySelector('#destination-mode').click();await settle();
 const root=d.querySelector('.nested-roots > .nested-group');root.querySelector('.nested-actions button').click();await settle();
 const input=d.activeElement;assert.ok(input.classList.contains('nested-new'));input.value='new child';input.dispatchEvent(new w.Event('input'));input.closest('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 assert.ok(h.calls.some(m=>m.type==='cfCreateFolder'&&m.prefix===''&&m.name==='new child'));d.querySelector('#destination-save').click();await settle();assert.equal(b.state.profiles[0].nestedMenu.roots[0].children.length,2);assert.ok(b.created.some(x=>x.title==='new child'));
 }finally{h.dom.window.close();}
});
test('mode switch persists without committing a dirty destination label; external mode-only changes preserve and rebase draft',async()=>{
 const h=await ui();try{const {d,w,b}=h;const label=d.querySelector('[data-destination-id="extra"] input');label.value='Draft label';label.dispatchEvent(new w.Event('input'));
 d.querySelector('#destination-mode').click();await settle();assert.equal(b.state.rightClickMode,'nested');assert.equal(b.state.profiles[0].simpleOptions[0].label,'Photos');
 b.state.rightClickMode='simple';h.change({rightClickMode:{oldValue:'nested',newValue:'simple'}});await settle();assert.equal(d.querySelector('#destination-mode').getAttribute('aria-pressed'),'false');assert.equal(label.value,'Draft label');
 d.querySelector('#destination-save').click();await settle();assert.match(d.querySelector('#destination-status').textContent,/right-click menu updated/i);assert.equal(b.state.profiles[0].simpleOptions[0].label,'Draft label');
 }finally{h.dom.window.close();}
});
test('deep native menu preserves every immediate parent, concise labels and exact paths',async()=>{
 const b=background();let children=b.state.profiles[0].nestedMenu.roots[0].children[0].children;for(let i=0;i<5;i++){const node={id:'deep'+i,name:'level'+i,ready:true,children:[]};children.push(node);children=node.children;}
 const draft=b.snapshot();draft.mode='nested';assert.equal((await b.save(draft)).menuUpdated,true);
 const deepest=b.created.find(x=>x.id==='nested:p:r:deep4');assert.equal(deepest.parentId,'nested:p:r:deep3');assert.equal(deepest.title,'level4');
 assert.equal(b.ctx.RedownNestedLocations.destinations(b.state.profiles[0].nestedMenu).find(x=>x.nodeId==='deep4').prefix,'photos/level0/level1/level2/level3/level4');
});

test('Nested full-group removal, Undo, final-root removal and save/reload preserve storage and intentional emptiness',async()=>{
 const presets=initial();presets[0].menuTree=[{id:'old',prefix:'resurrect-me',label:'Old'}];
 const h=await ui(presets);let persisted;
 try{const {d,b}=h;d.querySelector('#destination-mode').click();await settle();
  d.querySelector('.nested-remove').click();await settle();assert.equal(d.querySelectorAll('.nested-card').length,0);assert.match(d.querySelector('.nested-empty').textContent,/No nested/);assert.match(d.querySelector('#destination-status').textContent,/Unsaved/);
  assert.equal(b.state.profiles[0].nestedMenu.roots.length,1,'unsaved deletion must not persist');
  d.querySelector('.nested-undo button').click();await settle();assert.equal(d.querySelectorAll('.nested-card').length,1);
  d.querySelector('[aria-label="Remove this bucket from the nested menu only"]').click();await settle();assert.equal(d.querySelectorAll('.nested-card').length,0);
  d.querySelector('#destination-reload').click();await settle();assert.equal(d.querySelectorAll('.nested-card').length,1,'Reload cancels unsaved removal');
  d.querySelector('.nested-remove').click();await settle();d.querySelector('#destination-save').click();await settle();
  assert.equal(b.state.profiles[0].nestedMenu.roots.length,0);assert.ok(!b.created.some(x=>/^(nested:|tree:)/.test(x.id)));assert.equal(b.state.profiles[0].token,'fixture');assert.equal(b.state.profiles[0].menuTree[0].id,'old');
  d.querySelector('#destination-reload').click();await settle();assert.equal(d.querySelectorAll('.nested-card').length,0);
  await b.ctx.rebuildMenus();assert.ok(!b.created.some(x=>/^(nested:|tree:)/.test(x.id)));
  persisted=structuredClone(b.state.profiles);
  d.querySelector('#destination-add').click();await settle();const select=d.querySelector('.nested-existing');select.value='art';select.dispatchEvent(new h.w.Event('change'));await settle();d.querySelector('#destination-save').click();await settle();
  assert.equal(b.created.filter(x=>x.id.startsWith('nested:')).length,1);assert.ok(!b.created.some(x=>/resurrect/.test(x.title)));assert.ok(h.calls.every(x=>!/^cf(Delete|Create)/.test(x.type)));
 }finally{h.dom.window.close();}
 // Fresh editor/background context simulates an extension process restart.
 const restart=await ui(persisted);try{restart.d.querySelector('#destination-mode').click();await settle();assert.equal(restart.d.querySelectorAll('.nested-card').length,0);assert.ok(!restart.b.created.some(x=>/^(nested:|tree:)/.test(x.id)));}finally{restart.dom.window.close();}
});
test('child, parent and distinct same-account groups remove only their stable definitions',async()=>{
 const presets=initial();presets[0].nestedMenu.roots[0].children[0].children=[{id:'studio',name:'studio',ready:true,children:[]}];
 presets.push({...structuredClone(presets[0]),id:'second',bucketName:'unprepared',simpleOptions:[],nestedMenu:{version:1,enabled:true,roots:[{id:'second-root',bucketName:'unprepared',ready:true,children:[]}]}});
 const h=await ui(presets);try{const {d,b}=h;d.querySelector('#destination-mode').click();await settle();assert.equal(d.querySelectorAll('.nested-card').length,2);assert.match(d.querySelector('[data-menu-profile-id="second"] .meta').textContent,/unprepared/);
 const first=d.querySelector('[data-menu-profile-id="p"]');first.querySelector('.nested-collapse').click();await settle();first.querySelector('[data-node-id="n"] .nested-collapse').click();await settle();
 // Discovery marks an absent studio unavailable, but its definition stays removable.
 d.querySelector('[data-node-id="studio"] .nested-menu-controls [aria-label="Remove this menu branch without deleting any Cloudflare folders"]').click();await settle();d.querySelector('#destination-save').click();await settle();assert.equal(b.state.profiles[0].nestedMenu.roots[0].children[0].children.length,0);
 d.querySelector('[data-node-id="n"] .nested-menu-controls [aria-label="Remove this menu branch without deleting any Cloudflare folders"]').click();await settle();d.querySelector('#destination-save').click();await settle();assert.equal(b.state.profiles[0].nestedMenu.roots[0].children.length,0);assert.equal(b.state.profiles[1].nestedMenu.roots.length,1);
 d.querySelector('[data-menu-profile-id="p"] .nested-remove').click();await settle();assert.equal(d.querySelectorAll('.nested-card').length,1);d.querySelector('[data-menu-profile-id="second"] .nested-remove').click();await settle();d.querySelector('#destination-save').click();await settle();assert.equal(b.state.profiles.length,2);assert.ok(b.state.profiles.every(p=>p.token==='fixture'&&!p.nestedMenu.roots.length));
 }finally{h.dom.window.close();}
});
test('Simple and Nested native builds exclude obsolete trees and legacy-only accounts',async()=>{
 const b=background();b.state.profiles[0].menuTree=[{id:'legacy',label:'Ghost',prefix:'old'}];b.state.profiles.push({id:'legacy-only',type:'cloudflare-r2',explorerManaged:true,menuTree:[{id:'old',label:'Ghost',prefix:'old'}]});b.state.profiles.push({id:'gh',type:'github',menuTree:[{id:'old',label:'Ghost'}]});
 for(const mode of ['simple','nested']){b.state.rightClickMode=mode;await b.ctx.rebuildMenus();assert.ok(!b.created.some(x=>x.title==='Ghost'||/^(tree:|preset:|quick:gh)/.test(x.id)));}
 b.state.profiles[0].nestedMenu={version:1,enabled:true,roots:[]};await b.ctx.rebuildMenus();assert.ok(!b.created.some(x=>x.id.startsWith('nested:')));
});
test('versioned migration is repeat-safe and its menu-only backup preserves original definitions',async()=>{
 const b=background(),before=structuredClone(b.state.profiles);delete b.state.profiles[0].nestedMenu;b.state.profiles[0].menuTree=[{id:'legacy',prefix:'photos'}];
 const draft=b.snapshot(),p=draft.profiles[0];p.nestedMenu={version:1,enabled:true,roots:[]};await b.save(draft);
 assert.equal(b.state.profiles[0].menuConfigVersion,1);assert.ok(b.state.menuConfigurationBackupV1.legacy[0].menuTree.length);assert.ok(!JSON.stringify(b.state.menuConfigurationBackupV1).includes('fixture'));
 const backup=JSON.stringify(b.state.menuConfigurationBackupV1);await b.save(b.snapshot());assert.equal(JSON.stringify(b.state.menuConfigurationBackupV1),backup);
 const p2={...b.state.profiles[0]};delete p2.nestedMenu;b.ctx.RedownNestedLocations.initialize(p2);assert.equal(p2.nestedMenu.roots.length,0);assert.equal(b.state.profiles[0].token,before[0].token);
});
test('legacy preference writes share the modern save lane and cannot rewrite or remove menu profiles',async()=>{
 const b=background(),draft=b.snapshot();draft.profiles[0].menuLabel='Modern label';await b.save(draft);
 const stale=initial();stale[0].menuLabel='Legacy label';stale[0].nestedMenu.roots=[];stale[0].token='stale-secret';stale[0].name='Storage display name';
 await b.ctx.saveStoragePreferences({profiles:stale},{url:'chrome-extension://fixture/options.html'});
 assert.equal(b.state.profiles[0].menuLabel,'Modern label');assert.equal(b.state.profiles[0].nestedMenu.roots.length,1);assert.equal(b.state.profiles[0].token,'fixture');assert.equal(b.state.profiles[0].name,'Storage display name');
 await b.ctx.saveStoragePreferences({profiles:[]},{url:'chrome-extension://fixture/options.html'});assert.equal(b.state.profiles.length,1);
 await assert.rejects(b.ctx.saveStoragePreferences({profiles:stale},{url:'https://untrusted.test'}));
});
test('native creations await parent callbacks and later rebuild wins over an older snapshot',async()=>{
 const b=background(),confirmed=new Set();let generation=0;
 b.ctx.chrome.contextMenus.removeAll=async()=>{b.created.length=0;confirmed.clear();generation++;};
 b.ctx.chrome.contextMenus.create=(item,callback)=>{
   assert.ok(!item.parentId||confirmed.has(item.parentId),'parent callback must precede child API call');
   assert.ok(!Object.hasOwn(item,'destination'),'Chrome receives only API fields');b.created.push(item);
   setTimeout(()=>{confirmed.add(item.id);callback();},2);
 };
 b.state.rightClickMode='nested';const first=b.ctx.rebuildMenus();await new Promise(r=>setTimeout(r,5));b.state.profiles[0].nestedMenu.roots=[];const last=b.ctx.rebuildMenus();await Promise.all([first,last]);
 assert.equal(generation,2);assert.ok(!b.created.some(x=>x.id.startsWith('nested:')));
});
test('deleting all Simple rows remains empty with legacy data through rebuild and readdition',async()=>{
 const b=background();b.state.profiles[0].menuTree=[{id:'old',prefix:'old'}];const draft=b.snapshot();draft.profiles[0].simplePrimaryEnabled=false;draft.profiles[0].simpleOptions=[];await b.save(draft);await b.ctx.rebuildMenus();
 assert.ok(!b.created.some(x=>/^(quick:|simple-option:|tree:)/.test(x.id)));
 const next=b.snapshot();next.profiles[0].simpleOptions=[{id:'new',label:'Research',prefix:'Research',bucketName:'art'}];await b.save(next);
 assert.deepEqual(b.created.filter(x=>/^(quick:|simple-option:|tree:)/.test(x.id)).map(x=>x.title),['Research']);assert.equal(b.ctx.RedownDestinationConfig.resolve('simple-option:p:new',b.state.profiles,'simple').prefix,'Research');
});
test('external profile changes preserve unsaved edits and stale saves still fail',async()=>{
 const h=await ui();try{const {d,w,b}=h;const input=d.querySelector('[data-destination-id="extra"] input');input.value='Draft';input.dispatchEvent(new w.Event('input'));
 b.state.profiles[0].menuLabel='Another window';h.change({profiles:{newValue:structuredClone(b.state.profiles)}});await settle();assert.equal(input.value,'Draft');d.querySelector('#destination-save').click();await settle();assert.match(d.querySelector('#destination-status').textContent,/changed in another window/);assert.equal(b.state.profiles[0].menuLabel,'Another window');
 }finally{h.dom.window.close();}
});
test('blank Nested rows cannot be saved as apparently configured destinations',async()=>{
 const b=background(),draft=b.snapshot();draft.mode='nested';draft.profiles[0].nestedMenu.roots.push({id:'blank',bucketName:'',ready:false,children:[]});await assert.rejects(b.save(draft),/Choose a bucket/);
 const child=b.snapshot();child.mode='nested';child.profiles[0].nestedMenu.roots[0].children.push({id:'blank-child',name:'',ready:false,children:[]});await assert.rejects(b.save(child),/Choose or create/);assert.equal(b.mutations.length,0);
});
test('storage provisioning cannot seed destinations without modern Explorer activation',()=>{
 const start=bg.indexOf('  const profile = {',bg.indexOf('async function deployCloudflareProfile'));
 const end=bg.indexOf('\n  if (existingIndex >= 0)',start);
 function provision(menuActivation){const ctx=vm.createContext({existing:null,menuActivation,explorerOnly:false,crypto:{randomUUID:()=> 'new-profile'},profileName:'Bucket',bucketName:'art',accountId:'a',accountName:'Account',scriptName:'worker',workerUrl:'https://fixture.test',secret:'secret',folders:{},desiredFolders:{},profiles:[]});return vm.runInContext('(function(){'+bg.slice(start,end)+';return profile;})()',ctx);}
 const legacy=provision(false),modern=provision(true);assert.equal(legacy.simplePrimaryEnabled,false);assert.equal(legacy.showInContextMenu,false);assert.equal(legacy.nestedMenu.roots.length,0);assert.equal(legacy.token,'secret');assert.equal(modern.simplePrimaryEnabled,true);assert.equal(modern.showInContextMenu,true);
 const handler=bg.slice(bg.indexOf('if (message?.type === "cfProvision")'),bg.indexOf('if (message?.type === "cfSetAssetCors"'));
 assert.match(handler,/menuActivation=_sender\?\.url/);assert.match(handler,/provisionCloudflareProfile\(\{\.\.\.message,menuActivation\}\)/);
});

test('delayed Worker/domain persistence cannot resurrect a deleted menu or discard other profiles',async()=>{
 const b=background(),stale=structuredClone(b.state.profiles);stale[0].workerUrl='https://new-worker.test';
 const saved=b.snapshot();saved.profiles[0].nestedMenu.roots=[];saved.profiles[0].simplePrimaryEnabled=false;saved.profiles[0].simpleOptions=[];await b.save(saved);
 b.state.profiles.push({...initial()[0],id:'new-authorization',explorerManaged:true});
 const start=bg.indexOf('async function setProfiles('),end=bg.indexOf('// Toolbar status flashes',start);vm.runInContext(bg.slice(start,end),b.ctx);
 await b.ctx.setProfiles(stale);assert.equal(b.state.profiles[0].nestedMenu.roots.length,0);assert.equal(b.state.profiles[0].simpleOptions.length,0);assert.equal(b.state.profiles[0].simplePrimaryEnabled,false);assert.equal(b.state.profiles[0].workerUrl,'https://new-worker.test');assert.equal(b.state.profiles.length,2);
});


test('eight-level shared plan preserves immediate parents, parent save actions and preview parity',async()=>{
 const b=background();let node=b.state.profiles[0].nestedMenu.roots[0];
 for(let depth=1;depth<=8;depth++){node.children=[{id:'level'+depth,name:'folder'+depth,ready:true,children:[]}];node=node.children[0];}
 const draft=b.snapshot();draft.mode='nested';assert.equal((await b.save(draft)).menuUpdated,true);
 const plan=b.ctx.RedownNestedLocations.menuEntries(b.state.profiles,'nested','redown');
 assert.deepEqual(JSON.parse(JSON.stringify(plan)),JSON.parse(JSON.stringify(b.created.filter(x=>x.id.startsWith('nested:')))));
 for(let depth=1;depth<=8;depth++){
  const item=b.created.find(x=>x.id==='nested:p:r:level'+depth);
  assert.equal(item.parentId,depth===1?'nested:p:r:r':'nested:p:r:level'+(depth-1));assert.equal(item.title,'folder'+depth);
  assert.equal(Boolean(b.created.find(x=>x.id===item.id+':send')),depth<8);
  const target=b.ctx.RedownDestinationConfig.resolve(item.id,b.state.profiles,'nested');
  assert.equal(target.prefix,Array.from({length:depth},(_,i)=>'folder'+(i+1)).join('/'));
 }
});
test('pre-redesign right-click selection toolbar is restored without rolling back shared menu authority',async()=>{
 const h=await ui();try{
  const {d,w,b}=h;
  assert.ok(d.querySelector('#quick-panel-setup > .destination-toolbar'));
  assert.equal(d.querySelector('#destination-preview'),null,'the new multi-stage preview is not part of the restored selector');
  assert.ok(d.querySelector('#destination-add'));
  const label=d.querySelector('[data-destination-id="extra"] input');
  label.value='Restored editor';label.dispatchEvent(new w.Event('input'));
  assert.match(d.querySelector('#destination-status').textContent,/Unsaved changes/);
  assert.equal(b.state.profiles[0].simpleOptions[0].label,'Photos','drafts do not mutate saved routing');
  d.querySelector('#destination-save').click();await settle();
  assert.equal(b.state.profiles[0].simpleOptions[0].label,'Restored editor');
  assert.ok(b.created.some(x=>x.title==='Restored editor'),'the restored selector still determines the actual menu');
 }finally{h.dom.window.close();}
});

test('contextual operations stay accessible through named native disclosures',async()=>{
 const h=await ui();try{const {d,w}=h;
 const options=d.querySelector('.destination-entry-options');assert.equal(options.open,false);options.open=true;
 assert.ok(options.querySelector('[aria-label="Remove menu destination"]'));
 d.querySelector('#destination-mode').click();await settle();d.querySelector('.nested-collapse').click();await settle();
 const group=d.querySelector('[data-node-id="n"]'),details=group.querySelector('.nested-menu-controls');
 assert.equal(details.tagName,'DETAILS');assert.equal(details.open,false);details.open=true;
 [...details.querySelectorAll('button')].find(x=>x.textContent==='Create folder at this level').click();await settle();
 assert.equal(group.querySelector('.nested-create').hidden,false);assert.equal(d.activeElement,group.querySelector('.nested-new'));
 group.querySelector('.nested-new').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await settle();
 assert.equal(group.querySelector('.nested-create').hidden,true);assert.equal(h.calls.filter(x=>x.type==='cfCreateFolder').length,0);
 }finally{h.dom.window.close();}
});


test('removed parent send actions no longer resolve after their last child is removed',async()=>{
 const b=background(),draft=b.snapshot();draft.mode='nested';await b.save(draft);
 assert.ok(b.ctx.RedownDestinationConfig.resolve('nested:p:r:r:send',b.state.profiles,'nested'));
 const next=b.snapshot();next.profiles[0].nestedMenu.roots[0].children=[];await b.save(next);
 assert.equal(b.ctx.RedownDestinationConfig.resolve('nested:p:r:r:send',b.state.profiles,'nested'),null);
 assert.ok(!b.created.some(x=>x.id==='nested:p:r:r:send'));
});

test('right-click editor uses product-facing status and keeps dedicated bucket setup optional',async()=>{
 const h=await ui();try{
  const {d}=h;
  assert.equal(d.getElementById('destination-first-setup').open,false);
  assert.match(d.getElementById('destination-first-setup').querySelector('summary').textContent,/Optional: Dedicated REDOWN bucket/);
  d.getElementById('destination-mode').click();await settle();
  assert.match(d.getElementById('destination-status').textContent,/Right-click layout updated/);
  assert.doesNotMatch(d.getElementById('destination-status').textContent,/Chrome/);
 }finally{h.dom.window.close();}
});
