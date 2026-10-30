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
function model(){const c=vm.createContext({TextEncoder});vm.runInContext(domain,c);return c.RedownRightClickV3;}
test('V3 domain projects parent-first exact IDs and resolves branch Send here only',()=>{
 const m=model(),s=store(),p=[profile];assert.equal(m.validate(s,p),s);
 assert.deepEqual(Array.from(m.entries(s,p),e=>[e.id,e.parentId]),[['v3:root','redown'],['v3:root:send','v3:root'],['v3:child','v3:root'],['v3:child:send','v3:child'],['v3:deep','v3:child']]);
 assert.equal(m.resolve('v3:deep',s,p).prefix,'one/two/three');assert.equal(m.resolve('v3:child',s,p),null);assert.equal(m.resolve('v3:child:send',s,p).prefix,'one/two');assert.equal(m.resolve('v3:deep:send',s,p),null);assert.equal(m.resolve('quick:p',s,p),null);
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
 let current=store();w.chrome={runtime:{sendMessage:async m=>{calls.push(structuredClone(m));if(m.type==='rightClickV3Snapshot')return {ok:true,engine,config:structuredClone(current),profiles:[profile]};if(m.type==='saveRightClickV3'){current={...current,revision:current.revision+1,destinations:m.destinations};return {ok:true,revision:current.revision,engine,menuUpdated:false,error:'Saved; registration failed.'};}if(m.type==='cfDestinationFolders')return {ok:true,folders:[{prefix:'one/two/'}],cursor:''};throw Error(m.type);}},storage:{onChanged:{addListener:f=>listeners.push(f)}}};
 w.eval(domain);w.eval(ui);await settle();return {dom,w,calls,listeners,$:id=>w.document.getElementById('v3-'+id)};
}
test('new UI mounts one fresh outline in both engines; deleting ancestor has undo and zero provider writes',async()=>{
 for(const engine of ['legacy','v3']){const h=await view(engine);assert.equal(h.w.document.querySelectorAll('#v3-setup').length,1);assert.equal(h.$('outline').querySelectorAll('.v3-branch').length,3);assert.match(h.$('engine').textContent,engine==='legacy'?/do not control Chrome/:/controls Chrome/);h.$('outline').querySelector('[aria-label="Delete child and its menu descendants"]').click();assert.equal(h.$('outline').querySelectorAll('.v3-branch').length,1);h.$('undo').click();assert.equal(h.$('outline').querySelectorAll('.v3-branch').length,3);assert.deepEqual(h.calls.map(c=>c.type),['rightClickV3Snapshot']);h.dom.window.close();}
});
test('new UI add, search, exact folder discovery and failed-registration receipt retain revision',async()=>{
 const h=await view('v3');h.$('label').value='Another';h.$('prefix').value='more';h.$('add').dispatchEvent(new h.w.Event('submit',{cancelable:true}));assert.equal(h.$('outline').querySelectorAll('.v3-branch').length,4);
 h.$('search').value='Another';h.$('search').dispatchEvent(new h.w.Event('input'));assert.equal(h.$('outline').querySelectorAll('.v3-branch').length,1);
 h.$('save').click();await settle();assert.match(h.$('status').textContent,/registration failed/);h.$('save').click();await settle();assert.deepEqual(h.calls.filter(c=>c.type==='saveRightClickV3').map(c=>c.expected),[0,1]);
 h.$('prefix').value='';h.$('browse').click();await settle();h.$('folders').querySelector('button').click();assert.equal(h.$('prefix').value,'one/two');h.dom.window.close();
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
 for(const listener of h.listeners)listener({rightClickEngine:{newValue:'v3'}},'local');assert.match(h.$('engine').textContent,/controls Chrome/);h.$('reload').click();await settle();assert.equal(h.w.document.querySelectorAll('#v3-setup').length,1);assert.equal(h.w.document.querySelector('#quick-panel-setup,#destination-simple,#destination-nested'),null);h.dom.window.close();
});
test('Settings applies only the engine message and preserves restart-visible registration failure',async()=>{
 const dom=new JSDOM(await read('extension/shelf.html'),{runScripts:'outside-only'}),calls=[];dom.window.chrome={storage:{local:{get:async()=>({rightClickEngine:'v3',rightClickMenuStatus:{state:'failed',error:'Previous registration failed.'}})},onChanged:{addListener(){}}},runtime:{sendMessage:async m=>{calls.push(m);return {ok:true,engine:m.engine,menuUpdated:false,error:'Saved; registration failed.'};}}};dom.window.eval(await read('extension/right-click-engine-settings.js'));await settle();const d=dom.window.document;assert.equal(d.getElementById('right-click-engine').value,'v3');assert.match(d.getElementById('right-click-engine-status').textContent,/Previous registration failed/);d.getElementById('right-click-engine').value='legacy';d.getElementById('right-click-engine-apply').click();await settle();assert.equal(calls.length,1);assert.equal(calls[0].type,'setRightClickEngine');assert.equal(calls[0].engine,'legacy');assert.match(d.getElementById('right-click-engine-status').textContent,/registration failed/);assert.equal(d.querySelector('#v3-setup,#destination-simple'),null);dom.window.close();
});
