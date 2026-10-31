import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {JSDOM} from 'jsdom';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const [domain,bg,ui,html,legacy,legacyModel,legacyEngine]=await Promise.all(['extension/right-click-v3.js','extension/background.js','extension/beta/right-click-v3-ui.js','extension/beta/explorer.html','extension/destination-config.js','extension/nested-locations.js','extension/right-click-legacy.js'].map(read));
const profile={id:'p',type:'cloudflare-r2',accountId:'a',accountName:'Account A',bucketName:'bucket',workerUrl:'https://fixture.invalid',token:'synthetic',menuConfigVersion:1,simplePrimaryEnabled:true,menuLabel:'Legacy',defaultPrefix:'legacy-folder'};
const destination=(id='root',prefix='',parentId=null)=>({id,profileId:'p',accountId:'a',bucketName:'bucket',parentId,prefix,label:id,enabled:true});
const store=()=>({version:1,revision:0,destinations:[destination(),destination('child','one/two','root'),destination('deep','one/two/three','child')]});
function model(timers={}){const c=vm.createContext({TextEncoder,setTimeout,clearTimeout,...timers});vm.runInContext(domain,c);return c.RedownRightClickV3;}
test('V3 domain projects parent-first exact IDs and resolves branch Save here only',()=>{
 const m=model(),s=store(),p=[profile],options={style:'nested',nested:'narrow',depth:1};assert.equal(m.validate(s,p),s);
 assert.deepEqual(Array.from(m.entries(s,p,'redown',options),e=>[e.id,e.parentId]),[['v3:root','redown'],['v3:root:send','v3:root'],['v3:child','v3:root'],['v3:child:send','v3:child'],['v3:deep','v3:child']]);
 assert.equal(m.resolve('v3:deep',s,p,options).prefix,'one/two/three');assert.equal(m.resolve('v3:child',s,p,options),null);assert.equal(m.resolve('v3:child:send',s,p,options).prefix,'one/two');assert.equal(m.resolve('v3:deep:send',s,p,options),null);assert.equal(m.resolve('quick:p',s,p,options),null);
});
test('V3 disabled ancestors, removed subtrees, empty stores and revoked readiness cannot resurrect',()=>{
 const m=model(),s=store();s.destinations[0].enabled=false;assert.equal(m.entries(s,[profile]).length,0);assert.equal(m.resolve('v3:deep',s,[profile]),null);
 const removed=m.remove(store(),'child');assert.equal(removed.destinations.length,1);assert.equal(m.resolve('v3:deep',removed,[profile]),null);assert.equal(m.entries(m.empty(),[profile]).length,0);assert.equal(m.resolve('v3:deep',store(),[{...profile,token:''}]),null);
});
test('V3 rejects collisions, orphans, cycles, cross-account targets, invalid paths and excessive UTF-8',()=>{
 const m=model();for(const mutate of [s=>s.destinations.push(destination()),s=>s.destinations[1].parentId='gone',s=>s.destinations[0].parentId='deep',s=>s.destinations[1].accountId='other',s=>s.destinations[1].prefix='a/../b',s=>s.destinations[1].prefix='a//b',s=>s.destinations[0].prefix='界'.repeat(301),s=>s.destinations[0].id='bad:id']){const s=store();mutate(s);assert.throws(()=>m.validate(s,[profile]));}
});
function background(local={profiles:[structuredClone(profile)]},failure={}){
 const native=[],writes=[],c=vm.createContext({TextEncoder,structuredClone,setTimeout,clearTimeout});
 c.chrome={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,lastError:null},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(local[k])])),set:async patch=>{writes.push(structuredClone(patch));Object.assign(local,structuredClone(patch));}}},contextMenus:{removeAll:async()=>{if(failure.remove)throw Error('remove failed');native.length=0;},create(item,callback){if(failure.create)c.chrome.runtime.lastError={message:'create failed'};else native.push(item);callback?.();c.chrome.runtime.lastError=null;}}};
 vm.runInContext(domain+legacyModel+legacy+legacyEngine,c);c.getProfiles=async()=>structuredClone(local.profiles||[]);c.ROOT_MENU_ID='redown';
 vm.runInContext('let destinationSaveQueue=Promise.resolve();\n'+bg.slice(bg.indexOf('function v3MenuTransaction('),bg.indexOf('/* Explicit, opt-in gallery capture')),c);
 return {c,local,native,writes,call:(type,fields={},page='beta/explorer.html')=>c.v3MenuTransaction({type,...fields},{url:c.chrome.runtime.getURL(page)})};
}
test('actual background switch/save/register/resolve persists independent engines across restart',async()=>{
 const h=background(),old=JSON.stringify(h.local.profiles);const saved=await h.call('saveRightClickV3',{expected:0,destinations:store().destinations});assert.equal(saved.menuUpdated,true);assert.ok(h.native.some(x=>x.id==='quick:p'));assert.equal(JSON.stringify(h.local.profiles),old);
 await h.call('setRightClickEngine',{engine:'v3'},'shelf.html');assert.ok(h.native.some(x=>x.id==='v3:deep'));assert.ok(!h.native.some(x=>x.id==='quick:p'||x.id==='redown-nested-mode'));assert.equal((await h.c.resolveActiveRightClick('v3:deep',h.local.profiles)).prefix,'one/two/three');assert.equal(await h.c.resolveActiveRightClick('quick:p',h.local.profiles),null);
 const restarted=background(structuredClone(h.local));await restarted.c.rebuildMenus();assert.deepEqual(structuredClone(restarted.native),structuredClone(h.native));
 await h.call('setRightClickEngine',{engine:'legacy'},'shelf.html');assert.ok(h.native.some(x=>x.id==='quick:p'));assert.equal(await h.c.resolveActiveRightClick('v3:deep',h.local.profiles),null);assert.equal(h.local.rightClickV3.destinations.length,3);assert.equal(JSON.stringify(h.local.profiles),old);
});
test('actual background stale and unauthorized commits reject; concurrent saves serialize',async()=>{
 const h=background();await assert.rejects(h.call('saveRightClickV3',{expected:0,destinations:[]},'popup.html'));
 const results=await Promise.allSettled([h.call('saveRightClickV3',{expected:0,destinations:store().destinations}),h.call('saveRightClickV3',{expected:0,destinations:[]})]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(h.local.rightClickV3.revision,1);assert.equal(h.local.rightClickV3.destinations.length,3);
});
test('actual Chrome create/remove failures distinguish saved settings from registration',async()=>{
 for(const kind of ['create','remove']){const h=background(undefined,{[kind]:true});const r=await h.call('saveRightClickV3',{expected:0,destinations:store().destinations});assert.equal(r.ok,true);assert.equal(r.menuUpdated,false);assert.equal(h.local.rightClickV3.revision,1);assert.match(r.error,/registration failed/);}
});
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
async function view(engine='legacy'){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://extension.invalid/beta/explorer.html'}),calls=[],listeners=[];
 const w=dom.window;w.TextEncoder=TextEncoder;w.structuredClone=structuredClone;w.confirm=()=>true;
 let current=store(),presentation={style:'simple',nested:'narrow',depth:1};w.chrome={runtime:{sendMessage:async m=>{calls.push(structuredClone(m));if(m.type==='rightClickV3Snapshot')return {ok:true,engine,config:structuredClone(current),presentation,profiles:[profile]};if(m.type==='setRightClickV3Presentation'){presentation=m.presentation;return {ok:true,presentation,engine,menuUpdated:true,menuStatus:{state:'registered'}};}if(m.type==='refreshRightClickV3Inventory')return {ok:true,menuStatus:{state:'partial',warnings:['Inventory is incomplete.']}};if(m.type==='saveRightClickV3'){current={...current,revision:current.revision+1,destinations:m.destinations};return {ok:true,revision:current.revision,engine,menuUpdated:false,error:'Saved; registration failed.'};}if(m.type==='cfDestinationFolders')return {ok:true,folders:[{prefix:'one/two/'}],cursor:''};throw Error(m.type);}},storage:{onChanged:{addListener:f=>listeners.push(f)}}};
 w.eval(domain);w.eval(ui);await settle();return {dom,w,calls,listeners,$:id=>w.document.getElementById('v3-'+id)};
}
test('tree selection, keyboard rename cancellation, autosave deletion and undo never write provider data',async()=>{
 const h=await view('v3');
 const expand=id=>h.$('outline').querySelector('[data-key="'+id+'"] button').click();
 expand('root');expand('child');
 assert.equal(h.$('outline').querySelectorAll('[role=treeitem]').length,5);
 const row=h.$('outline').querySelector('[data-key=child]');row.click();row.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'F2',bubbles:true}));
 let edit=h.$('outline').querySelector('[data-edit]');edit.value='Cancelled';edit.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(h.calls.filter(c=>c.type==='saveRightClickV3').length,0);
 h.$('outline').querySelector('[aria-label="Delete child and its menu descendants"]').click();await settle();
 assert.equal(h.calls.filter(c=>c.type==='saveRightClickV3').at(-1).destinations.length,1);
 h.$('undo').click();await settle();assert.equal(h.calls.filter(c=>c.type==='saveRightClickV3').at(-1).destinations.length,3);
 assert.ok(h.calls.every(c=>['rightClickV3Snapshot','saveRightClickV3'].includes(c.type)));h.dom.window.close();
});
test('contextual addition auto persists, search finds destination and registration retry uses acknowledged revision',async()=>{
 const h=await view('v3');h.$('outline').querySelector('[aria-label="Add destination in bucket"]').click();
 h.$('label').value='Another';h.$('prefix').value='more';h.$('add').dispatchEvent(new h.w.Event('submit',{cancelable:true}));await settle();
 assert.equal(h.calls.filter(c=>c.type==='saveRightClickV3').at(-1).destinations.length,4);
 h.$('search').value='Another';h.$('search').dispatchEvent(new h.w.Event('input'));assert.ok(h.$('outline').textContent.includes('Another'));
 assert.match(h.$('status').textContent,/Unable to update Chrome/);h.$('retry').click();await settle();assert.deepEqual(h.calls.filter(c=>c.type==='saveRightClickV3').map(c=>c.expected),[0,1]);
 h.$('browse').click();await settle();h.$('folders').querySelector('button').click();assert.equal(h.$('prefix').value,'one/two');h.dom.window.close();
});
test('actual click listener waits for V3 read-back before recording completion and never falls back',async()=>{
 const start=bg.indexOf('chrome.contextMenus.onClicked.addListener(async (info, tab) => {'),end=bg.indexOf('\nchrome.runtime.onMessage.addListener',start),source=bg.slice(start,end);
 for(const verified of [true,false]){const records=[],notifications=[];let listener,read=false;
 const c=vm.createContext({chrome:{contextMenus:{onClicked:{addListener:fn=>listener=fn}},storage:{local:{get:async()=>({})}}},launchSaveDroplet(){},getProfiles:async()=>[profile],RedownNestedLocations:{menuMode:()=> 'simple'},resolveActiveRightClick:async()=>({profile,owner:profile,prefix:'one/two'}),selectedUrl:info=>info.linkUrl,basenameFromUrl:()=> 'file.pdf',ingestCloudflareAtPrefix:async(p,url,prefix,name,receipt,noProvision)=>{assert.equal(noProvision,true);receipt.destination={accountId:'a',bucketName:'bucket',key:'one/two/file.pdf'};receipt.bytes=12;return 'existing-url-contract';},callBucketWorker:async()=>{assert.equal(records.length,0);read=true;return {object:{key:'one/two/file.pdf',size:verified?12:13,etag:'etag',customMetadata:{sourceUrl:'https://source.invalid/file.pdf'}}};},recordTransfer:async r=>{assert.equal(read,true);records.push(r);},notify:async(...args)=>notifications.push(args)});
 vm.runInContext(source,c);await listener({menuItemId:'v3:leaf',linkUrl:'https://source.invalid/file.pdf',pageUrl:'https://source.invalid'},{});assert.equal(records.length,1);assert.equal(records[0].ok,verified);assert.equal(records[0].verified,verified?true:undefined);assert.match(notifications[0][0],verified?/complete/:/failed/);
 }
});
test('active HTML/CSS/JS and packaging contain no retired setup mounts/imports/hooks',async()=>{
 const paths=['extension/options.html','extension/options.js','extension/beta/explorer.html','extension/beta/explorer.css','extension/beta/quick-links.js','extension/beta/dashboard.css'];
 for(const path of paths){const s=await read(path);assert.doesNotMatch(s,/RedownNestedEditor|id="quick-panel-setup"|destination-toolbar|destination-simple|destination-nested|nested-menu-editor\.js|src="destinations\.js"|tree-editor|id="right-click-presets"|id="use-simple-menu"|id="add-menu-location"/,path);}
 const css=await read('extension/beta/right-click-v3.css');assert.doesNotMatch(css,/destination-|nested-card|tree-editor/);
 const pack=await read('scripts/package_chrome_store.py');assert.match(pack,/Retired setup reference/);
 assert.equal((html.match(/id="v3-setup"/g)||[]).length,1);
});

test('Legacy pre-v1 tree remains executable without restoring its setup or mutating profiles',async()=>{
 const p={...profile,menuConfigVersion:undefined,nestedMenu:undefined,menuTree:[{id:'section',label:'Archive',children:[{id:'leaf',label:'Letters',prefix:'Historical/Letters',children:[]}]}]};
 const h=background({profiles:[p],rightClickMode:'nested'}),before=JSON.stringify(h.local.profiles);await h.c.rebuildMenus();assert.ok(h.native.some(e=>e.id==='tree:p:section.leaf'&&e.parentId==='tree:p:section'));const result=await h.c.resolveActiveRightClick('tree:p:section.leaf',h.local.profiles);assert.equal(result.prefix,'Historical/Letters');assert.equal(await h.c.resolveActiveRightClick('tree:p:section',h.local.profiles),null);assert.equal(JSON.stringify(h.local.profiles),before);await h.call('setRightClickEngine',{engine:'v3'},'shelf.html');assert.equal(await h.c.resolveActiveRightClick('tree:p:section.leaf',h.local.profiles),null);
});

test('actual V3 ingest preserves the existing transport and URL contract with an exact non-provisioning target',async()=>{
 for(const key of ['one/two/file.pdf','wrong/file.pdf']){let sent,readiness;const receipt={};const c=vm.createContext({fetch:async(url,options)=>{sent={url,options};return {ok:true,text:async()=>JSON.stringify({ok:true,key,bytes:12,publicUrl:'https://existing.example/assets/'+key})};},preparedProfile:async(...args)=>{readiness=args;return profile;},cleanExplorerPrefix:x=>x,publicAssetUrl:()=>{throw Error('URL fallback must not run');}});vm.runInContext(bg.slice(bg.indexOf('async function ingestCloudflareAtPrefix('),bg.indexOf('async function ingestCloudflare(')),c);const run=c.ingestCloudflareAtPrefix(profile,'https://source.invalid/file.pdf','one/two','file.pdf',receipt,true);if(key.startsWith('wrong'))await assert.rejects(run,/different folder/);else {assert.equal(await run,'https://existing.example/assets/one/two/file.pdf');assert.equal(receipt.bytes,12);assert.equal(receipt.destination.key,key);}assert.equal(readiness[5],true);assert.equal(sent.options.method,'POST');assert.equal(sent.url,profile.workerUrl);assert.deepEqual(JSON.parse(sent.options.body),{sourceUrl:'https://source.invalid/file.pdf',folder:'one/two',exactFolder:true,filename:'file.pdf',publicBaseUrl:'https://fixture.invalid/assets'});}
});
test('package closure includes V3, Legacy and Settings and excludes all retired setup code',async()=>{
 const result=spawnSync('python3',['scripts/package_chrome_store.py','--audit-only'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const record=JSON.parse(await read('work/package/chrome-package.json'));for(const path of ['shelf.html','right-click-engine-settings.js','right-click-v3.js','right-click-legacy.js','beta/right-click-v3-ui.js','beta/right-click-v3.css'])assert.ok(record.files[path],path);for(const path of ['nested-menu-editor.js','beta/destinations.js','menu-reorder.js'])assert.ok(!record.files[path],path);assert.equal(record.releaseBlocked,true);
});

test('setup snapshot is sender-gated and exposes no credential or legacy menu state',async()=>{
 const h=background();await assert.rejects(h.c.rightClickV3Snapshot({url:h.c.chrome.runtime.getURL('popup.html')}));const snapshot=await h.c.rightClickV3Snapshot({url:h.c.chrome.runtime.getURL('beta/explorer.html')});assert.equal(snapshot.engine,'legacy');assert.deepEqual(Object.keys(snapshot.profiles[0]).sort(),['accountId','accountName','bucketName','id']);assert.equal(JSON.stringify(snapshot).includes('synthetic'),false);
});
test('storage preferences retain every literal DOM dependency after old setup removal',async()=>{
 const page=new JSDOM(await read('extension/options.html')),code=await read('extension/options.js');for(const match of code.matchAll(/\$\("([^"\n]+)"\)/g))assert.ok(page.window.document.getElementById(match[1]),match[1]);page.window.close();
});
test('real shared tabs, engine events and reload can only return to the single V3 setup',async()=>{
 const h=await view('legacy'),send=h.w.chrome.runtime.sendMessage;h.w.chrome.runtime.sendMessage=async m=>m.type==='cfAccounts'?{ok:true,accounts:[]}:send(m);
 h.w.eval(await read('extension/public-addresses.js'));h.w.eval(await read('extension/beta/quick-links.js'));await settle();
 h.w.document.getElementById('quick-tab-urls').click();assert.equal(h.$('setup').hidden,true);h.w.document.getElementById('quick-tab-setup').click();assert.equal(h.$('setup').hidden,false);
 for(const listener of h.listeners)listener({rightClickEngine:{newValue:'v3'}},'local');assert.equal(h.$('engine').textContent,'');h.$('reload').click();await settle();assert.equal(h.w.document.querySelectorAll('#v3-setup').length,1);assert.equal(h.w.document.querySelector('#quick-panel-setup,#destination-simple,#destination-nested'),null);h.dom.window.close();
});
test('Settings applies only the engine message and preserves restart-visible registration failure',async()=>{
 const dom=new JSDOM(await read('extension/shelf.html'),{runScripts:'outside-only'}),calls=[];dom.window.chrome={storage:{local:{get:async()=>({rightClickEngine:'v3',rightClickMenuStatus:{state:'failed',error:'Previous registration failed.'}})},onChanged:{addListener(){}}},runtime:{sendMessage:async m=>{calls.push(m);return {ok:true,engine:m.engine,menuUpdated:false,error:'Saved; registration failed.'};}}};dom.window.eval(await read('extension/right-click-engine-settings.js'));await settle();const d=dom.window.document;assert.equal(d.getElementById('right-click-engine').value,'v3');assert.match(d.getElementById('right-click-engine-status').textContent,/Previous registration failed/);d.getElementById('right-click-engine').value='legacy';d.getElementById('right-click-engine-apply').click();await settle();assert.equal(calls.length,1);assert.equal(calls[0].type,'setRightClickEngine');assert.equal(calls[0].engine,'legacy');assert.match(d.getElementById('right-click-engine-status').textContent,/registration failed/);assert.equal(d.querySelector('#v3-setup,#destination-simple'),null);dom.window.close();
});
test('rapid edits serialize snapshots and advance only acknowledged revisions',async()=>{
 const h=await view('v3');let release;const send=h.w.chrome.runtime.sendMessage;let first=true;
 h.w.chrome.runtime.sendMessage=async m=>{if(m.type==='saveRightClickV3'&&first){first=false;await new Promise(r=>release=r);}return send(m);};
 const check=()=>h.$('outline').querySelector('[aria-label="Include root in Chrome"]');check().click();check().click();release();await settle();
 const calls=h.calls.filter(c=>c.type==='saveRightClickV3');assert.deepEqual(calls.map(c=>c.expected),[0,1]);assert.equal(calls[0].destinations[0].enabled,false);assert.equal(calls[1].destinations[0].enabled,true);h.dom.window.close();
});
test('stale revision never automatically retries or drops retained edit',async()=>{
 const h=await view('v3');h.w.chrome.runtime.sendMessage=async()=>{throw Error('V3 destinations changed. Reload before saving.');};
 h.$('outline').querySelector('[aria-label="Include root in Chrome"]').click();await settle();
 assert.match(h.$('status').textContent,/Changes retained/);assert.equal(JSON.parse(h.w.sessionStorage.getItem('redown-v3-recovery')).destinations[0].enabled,false);h.dom.window.close();
});
test('tree Home End arrows and selection use roving focus independently of inclusion',async()=>{
 const h=await view('v3'),tree=h.$('outline'),first=tree.querySelector('[role=treeitem]');first.focus();first.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'End'}));
 assert.equal(h.w.document.activeElement.dataset.key,'root');assert.equal(tree.querySelectorAll('[tabindex="0"]').length,1);assert.equal(h.calls.filter(c=>c.type==='saveRightClickV3').length,0);h.dom.window.close();
});

test('inline add controls retain click focus and own keys without selecting the tree',async()=>{
 const h=await view('v3');h.$('outline').querySelector('[aria-label="Add destination in bucket"]').click();
 const bucket=h.$('outline').querySelector('[data-key="bucket:p"]');
 assert.equal(bucket.getAttribute('aria-selected'),'true');
 for(const id of ['label','prefix','profile','parent']){
  const input=h.$(id);input.focus();input.click();assert.equal(h.w.document.activeElement,input,id+' click focus');
  const e=new h.w.KeyboardEvent('keydown',{key:'r',bubbles:true,cancelable:true});input.dispatchEvent(e);
  assert.equal(e.defaultPrevented,false,id+' native key ownership');assert.equal(h.w.document.activeElement,input);
 }
 h.$('label').value='Multi character';h.$('prefix').value='new/path';
 h.$('add').dispatchEvent(new h.w.Event('submit',{cancelable:true,bubbles:true}));await settle();
 const created=h.w.document.activeElement;assert.equal(created.getAttribute('role'),'treeitem');assert.match(created.getAttribute('aria-label'),/^Multi character/);
 assert.equal(created.getAttribute('aria-selected'),'true');assert.match(h.$('status').textContent,/Unable to update Chrome/);
 h.dom.window.close();
});
test('contextual plus selects its owner and Escape restores that row without saving',async()=>{
 const h=await view('v3'),root=h.$('outline').querySelector('[data-key=root]');
 root.querySelector('[aria-label="Add child destination to root"]').click();assert.equal(h.$('parent').value,'root');
 h.$('label').focus();h.$('label').click();assert.equal(h.w.document.activeElement,h.$('label'));
 h.$('label').dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.equal(h.$('add').hidden,true);assert.equal(h.w.document.activeElement,root);
 assert.equal(h.calls.filter(c=>c.type==='saveRightClickV3').length,0);h.dom.window.close();
});
test('folder redraw preserves inline draft focus and anchor, checkbox redraw preserves its control',async()=>{
 const h=await view('v3');h.$('outline').querySelector('[aria-label="Add destination in bucket"]').click();
 let release;const send=h.w.chrome.runtime.sendMessage;
 h.w.chrome.runtime.sendMessage=async m=>{if(m.type==='cfDestinationFolders')await new Promise(r=>release=r);return send(m);};
 h.$('outline').querySelector('[aria-label="Load folders in bucket"]').click();
 h.$('label').focus();h.$('label').value='Draft';h.$('label').setSelectionRange(2,2);release();await settle();
 assert.equal(h.w.document.activeElement,h.$('label'));assert.equal(h.$('label').value,'Draft');assert.equal(h.$('label').selectionStart,2);
 assert.equal(h.$('add').parentElement.dataset.key,'bucket:p');h.$('cancel').click();
 let check=h.$('outline').querySelector('[aria-label="Include root in Chrome"]');check.focus();check.click();await settle();
 check=h.$('outline').querySelector('[aria-label="Include root in Chrome"]');assert.equal(h.w.document.activeElement,check);assert.equal(check.checked,false);
 h.dom.window.close();
});
test('tree shortcuts require actual tree focus and ignore composition and modified keys',async()=>{
 const h=await view('v3'),root=h.$('outline').querySelector('[data-key=root]');
 h.$('search').focus();root.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'F2',bubbles:true}));assert.equal(h.$('outline').querySelector('[data-edit]'),null);
 root.focus();for(const flags of [{isComposing:true},{ctrlKey:true},{metaKey:true},{altKey:true}])root.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'F2',bubbles:true,...flags}));
 assert.equal(h.$('outline').querySelector('[data-edit]'),null);assert.equal(h.w.document.activeElement,root);h.dom.window.close();
});

const simple={style:'simple',nested:'narrow',depth:1},narrow={...simple,style:'nested'},level={style:'nested',nested:'level',depth:2};
test('Simple defaults to ordered direct shortcuts; Narrow preserves duplicate identities and Save here',()=>{
 const m=model(),s=store();s.destinations.forEach(d=>d.label='Duplicate');const before=JSON.stringify(s);
 const flat=m.project(s,[profile]);assert.deepEqual(Array.from(flat.entries,e=>[e.id,e.parentId,e.title]),s.destinations.map(d=>['v3:'+d.id,'redown','Duplicate']));
 for(const d of s.destinations)assert.equal(m.resolve('v3:'+d.id,s,[profile]).prefix,d.prefix);
 const nested=m.project(s,[profile],narrow);assert.equal(nested.entries[1].title,'Save here');assert.equal(m.resolve('v3:root',s,[profile],narrow),null);assert.equal(m.resolve('v3:root:send',s,[profile],narrow).prefix,'');
 assert.equal(m.resolve('v3:deep',s,[profile],narrow).prefix,'one/two/three');assert.equal(m.resolve('v3:child:send',s,[profile],simple),null);assert.equal(JSON.stringify(s),before);
});
function folderFixture(){
 const calls=[];const tree={'':['images','videos'],'images':['memes','artwork'],'images/memes':['funny'],'videos':['clips']};
 return {calls,list:async(a,b,p,cursor,delimiter)=>{calls.push({a,b,p,cursor,delimiter});return {delimited:(tree[p.replace(/\/$/,'')]||[]).map(n=>p+n+'/'),objects:[],cursor:''};}};
}
test('Level depth 1–10 is counted from authorized root; true names, siblings and exact routing',async()=>{
 const m=model(),s={version:1,revision:0,destinations:[{...destination(),label:'Virtual label'}]},before=JSON.stringify(s);
 for(let depth=1;depth<=10;depth++){
  const fixture=folderFixture(),settings={...level,depth};const inventory=await m.discover(s,[profile],settings,fixture.list);const plan=m.project(s,[profile],settings,inventory);
  assert.equal(plan.complete,true);assert.equal(plan.entries[0].title,'bucket');assert.ok(plan.entries.some(e=>e.title==='images'));assert.ok(plan.entries.some(e=>e.title==='videos'));assert.ok(!plan.entries.some(e=>e.title==='Virtual label'));
  assert.equal(plan.entries.some(e=>e.title==='memes'),depth>=2);assert.equal(plan.entries.some(e=>e.title==='funny'),depth>=3);
  assert.equal(m.resolve('v3:cloud:p::send',s,[profile],settings,inventory).prefix,'');
  for(const entry of plan.entries){const target=m.resolve(entry.id,s,[profile],settings,inventory);if(!target)continue;assert.equal(target.profile.accountId,'a');assert.equal(target.profile.bucketName,'bucket');assert.equal(target.owner.id,'p');}
  assert.ok(fixture.calls.every(c=>c.a==='a'&&c.b==='bucket'&&c.delimiter==='/'));
 }
 assert.equal(JSON.stringify(s),before);
});
test('Level scopes configured roots, collapses overlapping roots and never reads unrelated profiles',async()=>{
 const m=model(),s=store();s.destinations[0].prefix='authorized';s.destinations[1].prefix='authorized/sub';s.destinations[2].prefix='authorized/sub/deep';s.destinations.push({...destination('overlap','authorized/sub'),parentId:null});
 const unrelated={...profile,id:'other',accountId:'unrelated',bucketName:'secret'};const calls=[];
 const inventory=await m.discover(s,[profile,unrelated],level,async(a,b,p)=>{calls.push([a,b,p]);return {delimited:[p+'child/','outside/'],objects:[]};});
 assert.equal(m.roots(s,[profile,unrelated]).length,1);assert.ok(calls.every(([a,b,p])=>a==='a'&&b==='bucket'&&p.startsWith('authorized/')));
 const entries=m.project(s,[profile,unrelated],level,inventory).entries;assert.equal(entries[0].title,'bucket');assert.equal(entries[1].title,'authorized');assert.ok(!entries.some(e=>e.title==='secret'||e.title==='outside'));
 assert.equal(m.resolve('v3:bucket:p',s,[profile,unrelated],level,inventory),null);
 const revoked={...profile,token:''};assert.equal(m.resolve(entries.at(-1).id,s,[revoked],level,inventory),null);
});
test('Level paginates files-only pages, deduplicates and sorts exact cloud names without writes',async()=>{
 const m=model(),s={...store(),destinations:[destination()]},calls=[];
 const inventory=await m.discover(s,[profile],{...level,depth:1},async(a,b,p,c)=>{calls.push(c);return c?{delimited:['Z/','A/','Z/'],objects:[{key:'A/.redown'}]}:{objects:[{key:'plain.txt'}],cursor:'next',truncated:true};});
 assert.deepEqual(calls,['','next']);assert.equal(inventory.complete,true);
 assert.deepEqual(Array.from(m.project(s,[profile],{...level,depth:1},inventory).entries,e=>e.title),['bucket','Save here','A','Z']);
});
test('Level rejects broken pagination, provider failures and unsupported paths as incomplete',async()=>{
 const m=model(),s={...store(),destinations:[destination()]};
 for(const list of [async()=>({objects:[],truncated:true}),async()=>({delimited:[],cursor:'same'}),async()=>{throw Error('synthetic private provider response');},async()=>({delimited:['bad\\name/']})]){
  const inventory=await m.discover(s,[profile],level,list);assert.equal(inventory.complete,false);assert.ok(inventory.warnings.length);assert.ok(!JSON.stringify(inventory).includes('private provider response'));
 }
});
test('Level bounds folder count, pages, elapsed budget and menu entries with visible partial status',async()=>{
 const m=model(),s={...store(),destinations:[destination()]};
 const many=await m.discover(s,[profile],{...level,depth:1},async()=>({delimited:Array.from({length:1000},(_,i)=>'folder'+i+'/')}));assert.equal(many.nodes.length,m.limits.folders);assert.equal(many.complete,false);
 const plan=m.project(s,[profile],{...level,depth:1},many);assert.ok(plan.entries.length<=m.limits.entries);assert.ok(plan.warnings.some(w=>/menu entry limit/.test(w)));
 let page=0;const paged=await m.discover(s,[profile],level,async()=>({objects:[],cursor:String(++page)}));assert.equal(page,m.limits.pages);assert.equal(paged.complete,false);
 let clock=0;const timed=await m.discover(s,[profile],level,async()=>({objects:[]}),()=>clock+=m.limits.milliseconds);assert.equal(timed.pages,0);assert.equal(timed.complete,false);
 const ids=new Set(['redown']);for(const entry of plan.entries){assert.ok(ids.has(entry.parentId));assert.ok(!ids.has(entry.id));ids.add(entry.id);}
});
test('Level cache survives serialization; expiry, root changes and wrong depth fail closed',async()=>{
 const m=model(),s={...store(),destinations:[destination()]},f=folderFixture(),inventory=await m.discover(s,[profile],level,f.list),copy=JSON.parse(JSON.stringify(inventory));
 const id='v3:cloud:p:images:send';assert.equal(m.resolve(id,s,[profile],level,copy).prefix,'images');
 assert.equal(m.resolve(id,s,[profile],level,copy,copy.at+m.limits.ttl),null);assert.equal(m.project(s,[profile],level,copy,'redown',copy.at+m.limits.ttl).complete,false);
 assert.equal(m.resolve(id,{...s,revision:1},[profile],level,copy),null);assert.equal(m.resolve(id,s,[profile],{...level,depth:3},copy),null);
 for(const value of [0,-1,1.5,11,NaN,'2'])assert.throws(()=>m.validatePresentation({...level,depth:value}));
});
test('presentation transitions serialize independently, retain Level depth 5 and persist across background restart',async()=>{
 const h=background({profiles:[profile],rightClickV3:store(),rightClickEngine:'v3'}),before=JSON.stringify(h.local.rightClickV3);let previous=simple;
 for(const options of [narrow,{...level,depth:5},narrow,{...level,depth:5},{style:'simple',nested:'level',depth:5},{...level,depth:5}]){
  const r=await h.call('setRightClickV3Presentation',{expectedPresentation:JSON.stringify(previous),presentation:options});assert.equal(r.menuUpdated,true);previous=options;assert.equal(JSON.stringify(h.local.rightClickV3),before);
 }
 h.c.listObjectsPage=async()=>{throw Error('synthetic unavailable');};await h.c.refreshV3Inventory(); // mock provider unavailable: explicitly partial, never fake complete
 const restarted=background(structuredClone(h.local));await restarted.c.rebuildMenus();assert.deepEqual(restarted.local.rightClickV3Presentation,{...level,depth:5});assert.equal(restarted.local.rightClickMenuStatus.state,'partial');assert.ok(restarted.native.some(e=>e.id==='redown-v3-inventory-status'&&e.enabled===false));
 await assert.rejects(h.call('setRightClickV3Presentation',{expectedPresentation:JSON.stringify(simple),presentation:narrow}),/another window/);
 await assert.rejects(h.call('setRightClickV3Presentation',{expectedPresentation:JSON.stringify(previous),presentation:simple},'options.html'),/V3 Setup/);
});
test('actual Level background inventory registration and click resolver retain exact authorized targets across restart',async()=>{
 const h=background({profiles:[profile],rightClickV3:{...store(),destinations:[destination()]},rightClickEngine:'v3',rightClickV3Presentation:level});const f=folderFixture();h.c.listObjectsPage=f.list;
 await h.c.refreshV3Inventory();assert.equal(h.local.rightClickMenuStatus.state,'registered');assert.ok(h.native.some(e=>e.title==='artwork'));assert.ok(h.native.every(e=>!Object.hasOwn(e,'destination')));
 const id='v3:cloud:p:images:send';assert.equal((await h.c.resolveActiveRightClick(id,h.local.profiles)).prefix,'images');assert.equal(await h.c.resolveActiveRightClick('v3:root',h.local.profiles),null);
 const restarted=background(structuredClone(h.local));restarted.c.listObjectsPage=()=>{throw Error('Fresh cache must avoid network');};await restarted.c.rebuildMenus();await restarted.c.refreshV3Inventory();assert.equal((await restarted.c.resolveActiveRightClick(id,restarted.local.profiles)).prefix,'images');
 assert.equal(h.local.rightClickV3.destinations.length,1);assert.deepEqual(h.local.profiles,[profile]);
});
test('late Level discovery cannot apply after roots change; concurrent refreshes share one inventory',async()=>{
 const h=background({profiles:[profile],rightClickV3:{...store(),destinations:[destination()]},rightClickEngine:'v3',rightClickV3Presentation:{...level,depth:1}});let release,calls=0;
 h.c.listObjectsPage=async()=>{calls++;await new Promise(r=>release=r);return {delimited:['stale/']};};
 const first=h.c.refreshV3Inventory(),second=h.c.refreshV3Inventory();await settle();assert.equal(calls,1);
 h.local.rightClickV3={version:1,revision:1,destinations:[]};release();await Promise.all([first,second]);await settle();assert.ok(!h.local.rightClickV3Inventory?.nodes.some(n=>n.prefix==='stale'));
});
test('header progressive controls preserve the tree and form focus, validate depth and remember hidden choices',async()=>{
 const h=await view('v3'),tree=h.$('outline'),row=tree.querySelector('[data-key=root]');
 assert.equal(h.$('nested').hidden,true);assert.equal(h.$('depth-row').hidden,true);
 h.$('style').querySelector('[value=nested]').click();await settle();assert.equal(h.$('nested').hidden,false);assert.equal(h.$('depth-row').hidden,true);assert.equal(tree.querySelector('[data-key=root]'),row);
 h.$('nested').querySelector('[value=level]').click();await settle();assert.equal(h.$('depth-row').hidden,false);
 h.$('depth').value='5';h.$('depth').dispatchEvent(new h.w.Event('change'));await settle();h.$('style').querySelector('[value=simple]').click();await settle();h.$('style').querySelector('[value=nested]').click();await settle();assert.equal(h.$('depth').value,'5');assert.equal(h.$('nested').querySelector('[value=level]').checked,true);
 h.$('depth').value='1.5';h.$('depth').dispatchEvent(new h.w.Event('change'));assert.equal(h.$('depth').value,'5');assert.match(h.$('presentation-status').textContent,/integer/);
 h.$('outline').querySelector('[aria-label="Add destination in bucket"]').click();h.$('prefix').value='draft';h.$('prefix').focus();
 for(const listener of h.listeners)listener({rightClickMenuStatus:{newValue:{state:'partial',warnings:['Some folders are not shown.']}}},'local');assert.equal(h.w.document.activeElement,h.$('prefix'));assert.equal(h.$('prefix').value,'draft');
 assert.equal(h.calls.filter(c=>c.type==='saveRightClickV3').length,0);assert.ok(h.$('style').querySelector('legend'));assert.equal(h.$('depth').getAttribute('aria-label'),'Cloud directory depth');h.dom.window.close();
});
test('rapid presentation changes retain native radio focus and serialize the latest desired mode',async()=>{
 const h=await view('v3'),send=h.w.chrome.runtime.sendMessage;let release,first=true;
 h.w.chrome.runtime.sendMessage=async m=>{if(m.type==='setRightClickV3Presentation'&&first){first=false;await new Promise(r=>release=r);}return send(m);};
 const radio=h.$('style').querySelector('[value=nested]');radio.focus();radio.click();assert.equal(h.$('style').disabled,false);assert.equal(h.w.document.activeElement,radio);
 h.$('nested').querySelector('[value=level]').click();h.$('depth').value='5';h.$('depth').dispatchEvent(new h.w.Event('change'));release();await settle();
 const calls=h.calls.filter(c=>c.type==='setRightClickV3Presentation');assert.equal(calls.length,2);assert.deepEqual(calls.at(-1).presentation,{...level,depth:5});assert.equal(calls.at(-1).expectedPresentation,JSON.stringify(narrow));assert.equal(h.$('depth').value,'5');h.dom.window.close();
});
test('a timed-out read halts traversal instead of accumulating unresolved remote requests',async()=>{
 const m=model({setTimeout:fn=>{queueMicrotask(fn);return 0;},clearTimeout(){}}),s={...store(),destinations:[destination(),destination('other','other')]};let calls=0;
 const inventory=await m.discover(s,[profile],level,()=>{calls++;return new Promise(()=>{});});assert.equal(calls,1);assert.equal(inventory.complete,false);assert.ok(inventory.warnings.length);
});
test('periodic maintenance leaves Legacy and non-Level V3 alone; credential changes clear inventory before rebuilding',async()=>{
 const alarms=[],listeners=[],calls=[],local={rightClickEngine:'legacy',rightClickV3Presentation:level};
 const c=vm.createContext({RedownRightClickV3:model(),chrome:{runtime:{onInstalled:{addListener(){}},onStartup:{addListener(){}}},alarms:{create:(...args)=>alarms.push(args),onAlarm:{addListener:fn=>listeners.push(fn)}},storage:{local:{get:async()=>local,set:async patch=>{calls.push('invalidate');Object.assign(local,patch);}},onChanged:{addListener:fn=>listeners.push(fn)}}},rebuildMenus:async()=>calls.push('rebuild')});
 vm.runInContext(bg.slice(bg.indexOf('chrome.runtime.onInstalled.addListener(rebuildMenus);'),bg.indexOf('/* Cosmetic only. A context-menu gesture')),c);
 assert.equal(alarms[0][1].periodInMinutes,5);listeners[0]({name:'redown-v3-inventory'});await settle();assert.deepEqual(calls,[]);
 local.rightClickEngine='v3';local.rightClickV3Presentation=narrow;listeners[0]({name:'redown-v3-inventory'});await settle();assert.deepEqual(calls,[]);
 local.rightClickV3Presentation=level;listeners[0]({name:'redown-v3-inventory'});await settle();assert.deepEqual(calls,['rebuild']);calls.length=0;
 listeners[1]({profiles:{newValue:[profile]}},'local');await settle();assert.deepEqual(calls,['invalidate','rebuild']);assert.equal(local.rightClickV3Inventory,null);
});
