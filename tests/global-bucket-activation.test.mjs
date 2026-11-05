import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {worker,config} from './helpers/background-worker.mjs';
const read=p=>readFileSync(p,'utf8');
const source=read('extension/background.js'),explorer=read('extension/beta/explorer.mjs');
const auth={accessToken:'synthetic',sessionId:'session'};
const sender=h=>({url:h.chrome.runtime.getURL('beta/explorer.html')});
const activate=(h,fields={})=>h.context.activateAllBuckets({confirmed:true,...fields},sender(h));
const send=(h,message)=>new Promise(resolve=>h.chrome.runtime.onMessage.listeners[0](message,sender(h),resolve));
async function fixture({failBucket,accountFailure=false,mode}={}){
 const local={cloudflareAuth:structuredClone(auth),profiles:[],...(mode?{rightClickV3Presentation:mode}:{})};
 const h=worker(local);await h.ready();const calls={accounts:0,buckets:[],prepare:[],check:[]};
 h.context.listCloudflareAccounts=async()=>{calls.accounts++;return [{id:'a',name:'A'},{id:'b',name:'B'},{id:'a',name:'A duplicate'}];};
 h.context.listBuckets=async id=>{calls.buckets.push(id);if(accountFailure&&id==='b')throw Error('permissions');return [{name:id==='a'?'alpha':'beta'},{name:id==='a'?'alpha':'beta'}];};
 h.context.preparedProfile=async(accountId,bucketName)=>{
  calls.prepare.push([accountId,bucketName]);if(bucketName===failBucket)throw Error('provider denied');
  let p=local.profiles.find(p=>p.accountId===accountId&&p.bucketName===bucketName);
  if(!p){p={id:'profile-'+accountId,type:'cloudflare-r2',accountId,bucketName,workerUrl:'https://'+accountId+'.fixture.invalid',token:'synthetic',workerVersion:6,explorerManaged:true};local.profiles.push(p);}
  return structuredClone(p);
 };
 h.context.workerAcceptsProfile=async p=>{calls.check.push(p.id);return true;};
 h.context.listObjectsPage=async()=>({objects:[],delimited:[]});
 return {...h,providerCalls:calls,clearFailure(){failBucket=undefined;accountFailure=false;}};
}
test('fresh install initializes V3; reload and restored legacy preference cannot reactivate Legacy',async()=>{
 const h=worker({profiles:[]});await h.ready();assert.equal(h.local.rightClickEngine,'v3');assert.equal(h.local.rightClickV3.destinations.length,0);assert.equal(h.local.rightClickV3Migration.version,1);
 h.local.rightClickEngine='legacy';await h.rebuild();assert.equal(h.local.rightClickEngine,'v3');
 const restart=worker(structuredClone(h.local));await restart.ready();assert.equal(restart.local.rightClickEngine,'v3');assert.ok(restart.native.has('v3:provider:cloudflare:setup'));
 await assert.rejects(h.context.v3MenuTransaction({type:'setRightClickEngine',engine:'legacy'},sender(h)),/only supported/);
});
test('migration preserves custom labels, disabled entries, ordering and incompatible originals for recovery',async()=>{
 const local=config();delete local.rightClickV3Migration;local.rightClickEngine='legacy';Object.assign(local.profiles[0],{menuLabel:'My primary',defaultPrefix:'original',simpleOptions:[{id:'two',prefix:'two',label:'Keep me',order:1,enabled:false},{id:'bad',prefix:'../bad',label:'Recover me',order:2}]});
 const before=JSON.stringify(local.profiles);const h=worker(local);await h.ready();
 assert.equal(JSON.stringify(local.profiles),before);assert.ok(local.rightClickV3.destinations.some(d=>d.label==='My primary'&&d.prefix==='original'));assert.ok(local.rightClickV3.destinations.some(d=>d.label==='Keep me'&&!d.enabled));assert.equal(local.rightClickV3.destinations[0].label,'My files');assert.ok(local.rightClickV3Migration.recovery.some(d=>d.record.label==='Recover me'));assert.equal(local.rightClickV3Recovery.original.profiles[0].simpleOptions[1].prefix,'../bad');
 const snapshot=await h.context.rightClickV3Snapshot(sender(h));assert.equal(snapshot.migrationRecoveryCount,1);assert.ok(!JSON.stringify(snapshot).includes('synthetic'));
});
test('actual dispatcher activates all accounts once, ignores Explorer selection, deduplicates and acknowledges roots',async()=>{
 const h=await fixture();h.local.betaExplorerLocation={accountId:'a',bucketName:'alpha'};
 const r=await send(h,{type:'activateAllBuckets',confirmed:true,source:{accountId:'a',bucketName:'alpha'}});
 assert.equal(r.ok,true);assert.equal(r.activation.state,'ready');assert.equal(r.activation.menuUpdated,true);assert.deepEqual(h.providerCalls.buckets,['a','b']);assert.deepEqual(h.providerCalls.prepare,[['a','alpha'],['b','beta']]);assert.equal(h.local.profiles.length,2);assert.equal(h.local.rightClickActivatedBuckets.buckets.length,2);assert.equal(h.local.rightClickV3LevelScopes.buckets.length,2);
 assert.equal(h.local.rightClickMenuStatus.state,'registered');assert.equal(h.local.rightClickMenuStatus.applicationKey,await h.context.menuApplicationKey());
 for(const bucket of ['alpha','beta'])assert.ok([...h.native.values()].some(e=>e.title===bucket));
 const first=JSON.stringify(h.local.rightClickV3);await activate(h);assert.equal(h.local.profiles.length,2);assert.equal(h.local.rightClickActivatedBuckets.revision,2);assert.equal(JSON.stringify(h.local.rightClickV3),first);
});
test('partial bucket failure retains usable successes and Retry Failed Buckets prepares only failed buckets',async()=>{
 const h=await fixture({failBucket:'beta'});let r=await activate(h);assert.equal(r.activation.state,'partial');assert.equal(h.local.rightClickActivatedBuckets.buckets.length,1);assert.ok([...h.native.values()].some(d=>d.title==='alpha'));assert.ok(![...h.native.values()].some(d=>d.title==='beta'));
 h.clearFailure();h.providerCalls.prepare.length=0;r=await activate(h,{retryFailed:true});assert.equal(r.activation.state,'ready');assert.deepEqual(h.providerCalls.prepare,[['b','beta']]);assert.equal(h.local.profiles.length,2);
});
test('account permission failure is partial and a retry discovers newly available buckets',async()=>{
 const h=await fixture({accountFailure:true});const r=await activate(h);assert.equal(r.activation.state,'partial');assert.equal(r.activation.accountErrors[0].accountId,'b');assert.equal(h.local.rightClickActivatedBuckets.buckets.length,1);
 h.clearFailure();assert.equal((await activate(h,{retryFailed:true})).activation.state,'ready');
});
test('native registration failure never reports Activated and Retry reuses prepared buckets',async()=>{
 const h=await fixture();const real=h.chrome.contextMenus.create;h.chrome.contextMenus.create=(item,cb)=>{if(item.id.startsWith('v3:bucket:')){h.chrome.runtime.lastError={message:'Denied'};cb();h.chrome.runtime.lastError=null;}else real(item,cb);};
 const r=await activate(h);assert.equal(r.activation.menuUpdated,false);assert.equal(r.activation.state,'partial');assert.equal(h.local.rightClickActivatedBuckets.buckets.length,2);
 h.chrome.contextMenus.create=real;h.providerCalls.prepare.length=0;assert.equal((await activate(h,{retryFailed:true})).activation.state,'ready');assert.equal(h.providerCalls.prepare.length,0);
});
test('unverified Worker, foreign sender and missing login cannot authorize activation',async()=>{
 const h=await fixture();h.context.workerAcceptsProfile=async()=>false;assert.equal((await activate(h)).activation.state,'partial');assert.equal(h.local.rightClickActivatedBuckets,undefined);
 await assert.rejects(h.context.activateAllBuckets({confirmed:true},{url:'https://example.invalid'}),/from Explorer/);await assert.rejects(h.context.activateAllBuckets({},sender(h)),/from Explorer/);
 delete h.local.cloudflareAuth;await assert.rejects(activate(h),/Connect to Cloudflare/);
});
test('concurrent clicks share the operation and do not duplicate provider provisioning',async()=>{
 const h=await fixture();let release;h.context.listCloudflareAccounts=()=>new Promise(r=>release=r);
 const first=activate(h);while(!release)await new Promise(r=>setImmediate(r));const second=await activate(h);assert.equal(second.activation.state,'running');release([{id:'a'}]);await first;assert.equal(h.providerCalls.prepare.length,1);
});
test('saved jobs resume pending buckets after restart; interrupted discovery truthfully requires retry',async()=>{
 const h=await fixture();await activate(h);h.local.rightClickGlobalActivation.state='running';h.local.rightClickGlobalActivation.phase='preparing';h.local.rightClickGlobalActivation.buckets[1].state='pending';h.providerCalls.prepare.length=0;await h.context.resumeGlobalActivation();assert.equal(h.local.rightClickGlobalActivation.state,'ready');assert.deepEqual(h.providerCalls.prepare,[['b','beta']]);
 h.local.rightClickGlobalActivation.state='running';h.local.rightClickGlobalActivation.phase='discovering';await h.context.resumeGlobalActivation();assert.equal(h.local.rightClickGlobalActivation.state,'failed');assert.match(h.local.rightClickGlobalActivation.error,/interrupted/);
});
test('real paginated account and bucket discovery handles both pages and rejects repeated cursors',async()=>{
 const urls=[];const c=vm.createContext({URLSearchParams,cloudflareErrorMessage:(_,m)=>m,cfFetch:async url=>{
  urls.push(url);let body;if(url.startsWith('/accounts?'))body={success:true,result:url.includes('page=2')?[{id:'last'}]:Array.from({length:50},(_,i)=>({id:String(i)})),result_info:{total_pages:2}};
  else body={result:{buckets:[{name:url.includes('cursor=next')?'second':'first'}],cursor:url.includes('cursor=next')?'':'next'}};
  return {ok:true,json:async()=>body};
 }});vm.runInContext(source.slice(source.indexOf('async function listCloudflareAccounts()'),source.indexOf('async function createBucket(')),c);
 assert.equal((await c.listCloudflareAccounts()).length,51);assert.deepEqual(Array.from(await c.listBuckets('a'),d=>d.name),['first','second']);assert.ok(urls.some(u=>u.includes('cursor=next')));
 c.cfFetch=async()=>({ok:true,json:async()=>({result:{buckets:[],cursor:'same'}})});await assert.rejects(c.listBuckets('a'),/did not advance/);
});
test('Simple retains roots; Narrow only configured paths; Depth only participating roots',async()=>{
 const h=await fixture();await activate(h);const profiles=h.local.profiles;const m=h.context.RedownRightClickV3;
 const cfg={...h.local.rightClickV3,activatedBuckets:h.local.rightClickActivatedBuckets,levelScopes:h.local.rightClickV3LevelScopes};
 cfg.destinations=[{id:'custom',profileId:profiles[0].id,accountId:'a',bucketName:'alpha',label:'Custom path',prefix:'Images/Photos',enabled:true,parentId:null}];
 for(const presentation of [{style:'simple'},{style:'nested',nested:'narrow'},{style:'nested',nested:'level',depth:10}]){
  const plan=m.project(cfg,profiles,presentation,null);
  if(presentation.nested==='narrow'){
    assert.ok(!plan.entries.some(e=>e.title==='beta'));
    assert.equal(m.resolve('v3:custom',cfg,profiles,presentation,null)?.prefix,'Images/Photos');
  }else for(const b of ['alpha','beta'])assert.ok(plan.entries.map(e=>m.resolve(e.id,cfg,profiles,presentation,null)).some(t=>t?.profile.bucketName===b&&t.prefix===''),b);
  if(!presentation.nested)assert.equal(m.resolve('v3:custom',cfg,profiles,presentation,null)?.prefix,'Images/Photos');
 }
 cfg.levelScopes.buckets[1].enabled=false;const level={style:'nested',nested:'level',depth:10};const plan=m.project(cfg,profiles,level,null);assert.ok(!plan.entries.some(e=>m.resolve(e.id,cfg,profiles,level,null)?.profile.bucketName==='beta'));
});
test('two native root clicks use distinct save destinations and verify the existing transfer completion path',async()=>{
 const h=await fixture();await activate(h);const transfers=[],receipts=[];
 h.context.launchSaveDroplet=()=>{};h.context.notify=async()=>{};h.context.recordTransfer=async r=>receipts.push(r);
 h.context.ingestCloudflareAtPrefix=async(p,url,prefix,filename,receipt)=>{transfers.push([p.accountId,p.bucketName,prefix]);receipt.destination={accountId:p.accountId,bucketName:p.bucketName,key:filename};receipt.bytes=12;return 'private saved object';};
 h.context.callBucketWorker=async(p,body)=>({object:{key:body.key,size:12,etag:'fixture',customMetadata:{sourceUrl:'https://example.invalid/file.pdf'}}});
 for(const bucket of ['alpha','beta']){h.local.betaExplorerLocation={accountId:'elsewhere',bucketName:'unrelated'};const item=[...h.native.values()].find(e=>e.title===bucket);await h.chrome.contextMenus.onClicked.listeners[0]({menuItemId:item.id,linkUrl:'https://example.invalid/file.pdf',pageUrl:'https://example.invalid/'},{id:1});}
 assert.deepEqual(transfers,[['a','alpha',''],['b','beta','']]);assert.equal(receipts.length,2);assert.ok(receipts.every(r=>r.ok&&r.verified));
});
function activationView(h,signedIn=true){
 const dom=new JSDOM(read('extension/beta/explorer.html'),{url:'https://extension.test/beta/explorer.html'}),d=dom.window.document,statuses=[];
 const chrome={storage:{local:h.chrome.storage.local,onChanged:{addListener(){}}},runtime:{sendMessage:message=>send(h,message)}};
 const code=explorer.slice(explorer.indexOf('let globalActivation='),explorer.indexOf('function resetActivation()'))+explorer.slice(explorer.indexOf("$('prepare').onclick=async()=>{"),explorer.indexOf('\n\nconst preferenceFields='));
 const create=new Function('document','chrome','accounts','bucketCache','cloudflareSignedIn','$','clearActivationGlow','loadProfiles','showActivationGlow','status','CustomEvent',"const activeProvider='r2';\n"+code+';return {loadGlobalActivation,paintActivation};');
 const view=create(d,chrome,[{id:'a'},{id:'b'}],new Map([['a',[{name:'alpha'}]],['b',[{name:'beta'}]]]),signedIn,id=>d.getElementById(id),()=>{},async()=>{},()=>{},s=>statuses.push(s),dom.window.CustomEvent);
 return {dom,d,button:d.getElementById('prepare'),view,statuses};
}
test('actual activation button highlights global prerequisite after login, invokes background and clears glow only after verified completion',async()=>{
 const h=await fixture();const f=activationView(h);
 await f.view.loadGlobalActivation();assert.equal(f.button.dataset.state,'needed');assert.equal(f.button.disabled,false);assert.equal(f.d.documentElement.dataset.activationPrerequisite,'true');
 await f.button.onclick();assert.equal(f.button.dataset.state,'ready');assert.equal(f.button.textContent.trim(),'✓Buckets Activated');assert.equal(f.d.documentElement.dataset.activationPrerequisite,'false');assert.equal(h.providerCalls.prepare.length,2);assert.match(f.statuses.at(-1),/Chrome acknowledged/);f.dom.window.close();
});
test('signed-out activation is disabled; pending requests disable duplicate clicks; failed activation remains retryable',async()=>{
 const h=await fixture({failBucket:'beta'});let f=activationView(h,false);await f.view.loadGlobalActivation();assert.equal(f.button.disabled,true);assert.equal(f.button.dataset.state,'unselected');await f.button.onclick();assert.equal(h.providerCalls.accounts,0);f.dom.window.close();
 f=activationView(h);await f.view.loadGlobalActivation();let release;h.context.listCloudflareAccounts=()=>new Promise(r=>release=r);const first=f.button.onclick();assert.equal(f.button.disabled,true);assert.match(f.button.textContent,/Activating Buckets/);await f.button.onclick();while(!release)await new Promise(r=>setImmediate(r));release([{id:'a'},{id:'b'}]);await first;assert.equal(f.button.disabled,false);assert.match(f.button.textContent,/Retry Failed Buckets/);assert.equal(f.button.dataset.state,'needed');assert.ok(!f.statuses.some(s=>/All eligible buckets are activated/.test(s)));f.dom.window.close();
});
test('guidance has one prerequisite owner, moving green border, visible focus and static reduced-motion treatment',()=>{
 const css=read('extension/beta/explorer.css');assert.match(css,/html\[data-activation-prerequisite="true"\] \.guide-highlight:not\(#prepare\)/);assert.match(css,/conic-gradient\(from var\(--rd-activation-angle\)/);assert.match(css,/@keyframes rd-activation-border/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.actions #prepare\[data-state="needed"\]::after\{animation:none/);assert.match(css,/#prepare\.bucket-activation:focus-visible/);
});
test('new bucket preparation uses existing private Explorer Worker configuration and activation invokes no public visibility API',async()=>{
 let options;const c=vm.createContext({getProfiles:async()=>[],provisionCloudflareProfile:async o=>{options=o;return o;}});vm.runInContext(source.slice(source.indexOf('async function preparedProfile('),source.indexOf('async function callBucketWorker(')),c);await c.preparedProfile('a','alpha','',false,null,false,true);assert.equal(options.privateActivation,true);assert.equal(options.explorerOnly,true);assert.equal(options.bucketName,'alpha');
 const code=source.slice(source.indexOf('async function activateAllBuckets('),source.indexOf('async function v3PresentationSnapshot('));assert.doesNotMatch(code,/enableBucketPublicAccess|cfEnablePublicAccess|configureAssetDomain|scope:/);
});

test('private activation never inherits the historical implicit public-assets default',()=>{
 const code=source.slice(source.indexOf('  const publicAssetsEnabled ='),source.indexOf('  const secretKey =',source.indexOf('  const publicAssetsEnabled =')));
 const evaluate=new Function('privateActivation','existing','explorerOnly',code+'return publicAssetsEnabled;');
 assert.equal(evaluate(true,{explorerManaged:false},false),false);assert.equal(evaluate(true,{publicAssetsEnabled:false},false),false);assert.equal(evaluate(true,{publicAssetsEnabled:true},false),true);assert.equal(evaluate(true,null,true),false);
});


// The Explorer sends this event after activation; V3 must refresh in place instead
// of requiring a full Explorer reload or another bucket inventory scan.
function mountV3Setup(h){
 const dom=new JSDOM(read('extension/beta/explorer.html'),{url:'https://extension.test/beta/explorer.html',runScripts:'outside-only'});
 const {window}=dom,listeners=[];
 window.structuredClone=structuredClone;
 window.confirm=()=>false;
 window.chrome={runtime:{sendMessage:m=>send(h,m)},storage:{onChanged:{addListener:fn=>listeners.push(fn)}}};
 window.eval(read('extension/right-click-v3.js'));
 window.eval(read('extension/beta/right-click-v3-ui.js'));
 return {dom,document:window.document,listeners,ready:()=>waitFor(()=>window.document.getElementById('v3-outline').textContent.includes('Activate a bucket'))};
}
async function waitFor(predicate){
 for(let i=0;i<80;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,1));}
 assert.fail('V3 setup did not refresh after activation');
}
test('global Activate Buckets refreshes the V3 Setup tree and bucket dropdown without page reload',async()=>{
 const h=await fixture(),view=mountV3Setup(h),d=view.document;
 await view.ready();
 assert.match(d.getElementById('v3-outline').textContent,/Activate a bucket/);
 const before=d.getElementById('v3-setup');
 const activation=await activate(h);
 assert.equal(activation.activation.state,'ready');
 d.dispatchEvent(new view.dom.window.CustomEvent('redown:destinations-ready'));
 await waitFor(()=>d.getElementById('v3-profile').options.length===2&&d.getElementById('v3-outline').textContent.includes('alpha')&&d.getElementById('v3-outline').textContent.includes('beta'));
 assert.equal(d.getElementById('v3-setup'),before);
 assert.equal(d.getElementById('v3-save').textContent,'Saved');
 assert.equal(d.getElementById('v3-level-buckets').querySelectorAll('input[type=checkbox]:checked').length,2);
 view.dom.window.close();
});
test('storage change refresh preserves search, expanded tree, scroll and unfinished Add Destination form',async()=>{
 const h=await fixture(),view=mountV3Setup(h),d=view.document;
 await view.ready();await activate(h);
 d.dispatchEvent(new view.dom.window.CustomEvent('redown:destinations-ready'));
 await waitFor(()=>d.getElementById('v3-profile').options.length===2);
 const search=d.getElementById('v3-search');search.value='alpha';search.dispatchEvent(new view.dom.window.Event('input',{bubbles:true}));
 const outline=d.getElementById('v3-outline');outline.scrollTop=65;
 const add=d.querySelector('button[aria-label="Add destination in alpha"]');
 assert.ok(add);add.click();
 const prefix=d.getElementById('v3-prefix');prefix.value='unfinished/path';prefix.focus();
 const oldSelection=d.getElementById('v3-profile').value;
 h.local.profiles.push({id:'profile-c',type:'cloudflare-r2',accountId:'c',accountName:'C',bucketName:'gamma',workerUrl:'https://c.fixture.invalid',token:'synthetic'});
 for(const listener of view.listeners)listener({profiles:{newValue:h.local.profiles}},'local');
 await waitFor(()=>d.getElementById('v3-profile').options.length===3);
 assert.equal(d.getElementById('v3-profile').value,oldSelection);
 assert.equal(search.value,'alpha');
 assert.equal(outline.scrollTop,65);
 assert.equal(prefix.value,'unfinished/path');
 assert.equal(d.activeElement,prefix);
 view.dom.window.close();
});
