import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');
const signalSource=await readFile(new URL('../extension/storage-signals.js',import.meta.url),'utf8');
const signalScope={};vm.runInNewContext(signalSource,signalScope);
// Fixture boundaries are logical lines, independent of checkout line endings.
const source=(await readFile(new URL('../extension/options.js',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
function harness(){
  const dom=new JSDOM(html,{runScripts:'outside-only'});
  const calls=[],saved=[],opened=[];
  const context=vm.createContext({document:dom.window.document,window:dom.window,debugModeEnabled:false,betaModeEnabled:false,storageTraining:null,bucketLoadVersion:0,RedownStorageSignals:signalScope.RedownStorageSignals,profiles:[],currentAccountId:'account',onboardingConnected:true,onboardingBucketState:'loading',
    explorerBuckets:new Map([['account',[{name:'test-bucket'}]]]),
    goLocation:async(...args)=>opened.push(args),loadExplorerInventory:async()=>{},
    $:id=>dom.window.document.getElementById(id),
    setStatus:(id,text)=>{dom.window.document.getElementById(id).textContent=text;},
    send:async msg=>{calls.push(msg);return {ok:true,buckets:[{name:'test-bucket'}]};},
    addBucketPreset:(...args)=>{calls.push(args);return {ok:true,verified:true};},chrome:{storage:{local:{set:async value=>saved.push(value)}}}});
  vm.runInContext(source.slice(source.indexOf('function isSetupDestination('),source.indexOf('function applyDebugMode(){')),context);
  vm.runInContext(source.slice(source.indexOf('async function refreshBuckets(){'),source.indexOf('async function addBucketPreset(')),context);
  vm.runInContext(source.slice(source.indexOf('function applyDebugMode(){'),source.indexOf('(async()=>{\n  const stored=await chrome.storage.local.get(["profiles"')),context);
  return {dom,context,calls,saved,opened};
}
test('debug-only sections start hidden and toggle exists only inside header disclosure',()=>{
  const h=harness(),d=h.dom.window.document;
  for(const id of ['rfis-section','add-github'])assert.equal(h.dom.window.getComputedStyle(d.getElementById(id)).display,'none');
  assert.ok(d.querySelector('header details:not([open]) #debug-mode-enabled'));
  assert.equal(d.querySelectorAll('#debug-mode-enabled').length,1);
  assert.equal(d.querySelector('.debug-settings'),null);
  assert.equal(d.querySelector('header summary').textContent,'');
  const panel=d.getElementById('nested-menu-editor-panel');
  assert.equal(h.dom.window.getComputedStyle(panel).display,'none','hidden attribute wins over author layout styles');
  h.dom.window.close();
});
test('normal mode has inset repair and Debug Mode restores separate controls',async()=>{
  const h=harness(),d=h.dom.window.document;
  await vm.runInContext('refreshBuckets()',h.context);
  const tile=d.querySelector('.bucket-select'),repair=d.querySelector('.bucket-repair');
  assert.equal(d.querySelectorAll('.bucket-select').length,1);
  assert.equal(tile?.querySelector('button'),null,'repair is a sibling target, never invalid nested button markup');
  assert.equal(tile.querySelector('.bucket-name').textContent,'test-bucket');
  assert.notEqual(h.dom.window.getComputedStyle(repair).display,'none');
  repair.click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls[1][1].forceRepair,true,'normal inset repair explicitly repairs');
  tile.click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(tile.getAttribute('aria-pressed'),'true');
  assert.equal(h.calls[2][0],'test-bucket');assert.equal(h.calls[2].length,1,'single tile invokes normal setup without force repair');
  const toggle=d.getElementById('debug-mode-enabled');toggle.checked=true;
  toggle.dispatchEvent(new h.dom.window.Event('change'));await Promise.resolve();
  assert.equal(h.dom.window.getComputedStyle(repair).display,'none');
  assert.equal(h.dom.window.getComputedStyle(tile).display,'none');
  const debugName=d.querySelector('.bucket-debug-select'),debugRepair=d.querySelector('.bucket-debug-repair');
  assert.notEqual(h.dom.window.getComputedStyle(debugName).display,'none');
  debugName.click();assert.equal(h.calls.length,3,'debug name selection does not provision');
  debugRepair.click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls[3][0],'test-bucket');assert.equal(h.calls[3][1].forceRepair,true);
  assert.equal(h.saved[0].debugModeEnabled,true);
  toggle.checked=false;toggle.dispatchEvent(new h.dom.window.Event('change'));
  assert.notEqual(h.dom.window.getComputedStyle(repair).display,'none');
  assert.equal(h.dom.window.getComputedStyle(debugRepair).display,'none');h.dom.window.close();
});

test('normal primary setup does not invoke the independent inset repair',async()=>{
  const h=harness(),d=h.dom.window.document;
  await vm.runInContext('refreshBuckets()',h.context);
  const use=d.querySelector('.bucket-use');
  assert.notEqual(h.dom.window.getComputedStyle(use).display,'none');
  use.click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls[1][0],'test-bucket');
  assert.equal(h.calls[1].length,1,'normal setup must not force redeployment');
  h.dom.window.close();
});
test('R2 activation is an actionable neutral step, permission failures remain errors',async()=>{
  const h=harness(),d=h.dom.window.document;
  h.context.send=async()=>({ok:false,error:'Please sign up for R2 in the dashboard'});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.equal(d.getElementById('r2-setup').hidden,false);
  assert.match(d.getElementById('r2-dashboard').href,/account\/r2\/overview/);
  h.context.send=async()=>({ok:false,error:'Permission denied'});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.equal(d.getElementById('r2-setup').hidden,true);
  assert.equal(d.getElementById('cf-status').textContent,'Permission denied');
  h.context.send=async()=>({ok:true,buckets:[]});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.match(d.getElementById('cf-status').textContent,/Create one/);
  h.dom.window.close();
});
test('successful provisioning refreshes destination editors and inventory before reporting ready',async()=>{
  const events=[];
  const context=vm.createContext({bucketLoadVersion:0,currentAccountId:'account',onboardingConnected:true,onboardingBucketState:'loading',cfAccounts:[{id:'account',name:'Account'}],profiles:[],
    setStatus:(id,message)=>events.push(message),
    send:async message=>{events.push(message.type);return {ok:true,verification:{workerReachable:true}};},
    chrome:{storage:{local:{get:async()=>({profiles:[{type:'cloudflare-r2',accountId:'account',bucketName:'assets',workerUrl:'https://example.workers.dev',token:'fixture'}],rightClickMode:'simple'})}}},
    RedownNestedLocations:{menuMode:()=> 'simple'},
    renderProfiles:()=>events.push('profiles'),refreshLocationEditors:async()=>events.push('locations'),
    loadExplorerInventory:async()=>events.push('inventory')});
  vm.runInContext(source.slice(source.indexOf('function isSetupDestination('),source.indexOf('function applyOnboarding(')),context);
  vm.runInContext(source.slice(source.indexOf('async function addBucketPreset('),source.indexOf('async function loginRequest(')),context);
  assert.equal((await vm.runInContext('addBucketPreset("assets")',context)).ok,true);
  assert.deepEqual(events.slice(1,5),['cfProvision','profiles','locations','inventory']);
  assert.match(events.at(-1),/verified/);
  events.length=0;
  assert.equal((await vm.runInContext('addBucketPreset("assets")',context)).ok,true);
  assert.ok(!events.includes('cfProvision'),'already configured bucket avoids deployment');
  context.send=async()=>({ok:true});events.length=0;
  const unverified=await vm.runInContext('addBucketPreset("assets",{forceRepair:true})',context);
  assert.equal(unverified.verified,false,'a bare acknowledgement is never live-health proof');
  assert.match(events.at(-1),/configuration saved/);
  assert.doesNotMatch(events.at(-1),/is ready|verified\./);

});

test('normal onboarding progressively reveals tools only for a completed destination; debug bypasses gating',async()=>{
  const h=harness(),d=h.dom.window.document;
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(d.documentElement.classList.contains('onboarding-pending'));
  for(const id of ['right-click-presets','local-tools','downloads-zone']){
    // local-tools also has its existing disconnected hidden flag.
    assert.equal(h.dom.window.getComputedStyle(d.getElementById(id)).display,'none');
  }
  h.context.send=async()=>({ok:true,buckets:[]});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.ok(d.getElementById('create-bucket').classList.contains('setup-go'));
  assert.equal(d.querySelector('#onboarding-step'),null);
  assert.ok(!d.documentElement.classList.contains('storage-pending'));
  h.context.profiles=[{type:'cloudflare-r2',bucketName:'assets'}];
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(d.documentElement.classList.contains('onboarding-pending'),'bucket selection alone cannot unlock tools');
  h.context.profiles=[{type:'cloudflare-r2',workerUrl:'https://fixture.workers.dev',token:'fixture',explorerManaged:true}];
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(d.documentElement.classList.contains('onboarding-pending'),'Explorer-only preparation cannot complete right-click setup');
  h.context.profiles[0].explorerManaged=false;
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(!d.documentElement.classList.contains('onboarding-pending'));
  assert.notEqual(h.dom.window.getComputedStyle(d.getElementById('right-click-presets')).display,'none');
  assert.ok(!d.documentElement.classList.contains('storage-pending'));
  h.context.onboardingBucketState='loading';
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(!d.documentElement.classList.contains('storage-pending'),'returning users keep Storage during refresh');
  h.context.onboardingConnected=false;
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(d.documentElement.classList.contains('onboarding-pending'));
  const toggle=d.getElementById('debug-mode-enabled');toggle.checked=true;
  toggle.dispatchEvent(new h.dom.window.Event('change'));await Promise.resolve();
  assert.notEqual(h.dom.window.getComputedStyle(d.getElementById('right-click-presets')).display,'none');
  toggle.checked=false;toggle.dispatchEvent(new h.dom.window.Event('change'));await Promise.resolve();
  assert.equal(h.dom.window.getComputedStyle(d.getElementById('right-click-presets')).display,'none');
  h.dom.window.close();
});

test('activation stays in connection header; Storage appears only after R2 is available',async()=>{
  const h=harness(),d=h.dom.window.document;
  h.context.onboardingConnected=false;
  vm.runInContext('applyOnboarding()',h.context);
  assert.equal(h.dom.window.getComputedStyle(d.getElementById('cloudflare-panel')).display,'none');
  assert.equal(d.getElementById('r2-setup').hidden,true);
  h.context.onboardingConnected=true;
  h.context.send=async()=>({ok:false,error:'Please sign up for R2'});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.equal(d.getElementById('r2-setup').closest('section').id,'connections');
  assert.equal(d.getElementById('r2-setup').hidden,false);
  assert.equal(h.dom.window.getComputedStyle(d.getElementById('cloudflare-panel')).display,'none');
  h.context.send=async()=>({ok:true,buckets:[{name:'assets'}]});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.equal(d.getElementById('r2-setup').hidden,true);
  assert.ok(!d.documentElement.classList.contains('storage-pending'));
  assert.ok(!d.getElementById('create-bucket').classList.contains('setup-go'));
  assert.equal(d.querySelectorAll('.bucket-select').length,1);
  assert.ok(!d.querySelector('.bucket-use').classList.contains('setup-go'),'bucket surfaces retain their own material rather than green CTA styling');
  assert.ok(d.documentElement.classList.contains('onboarding-pending'));
  h.dom.window.close();
});

test('settings disclosure dismisses outside and Escape restores focus',()=>{
  const h=harness(),d=h.dom.window.document;
  vm.runInContext(source.slice(source.indexOf('function wireSettingsDisclosure(){'),source.indexOf('function applyDebugMode(){')),h.context);
  const disclosure=d.getElementById('settings-disclosure');
  disclosure.open=true;
  d.getElementById('debug-mode-enabled').click();
  assert.equal(disclosure.open,true,'inside interaction retains disclosure');
  d.getElementById('connections').click();assert.equal(disclosure.open,false);
  disclosure.open=true;
  d.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(disclosure.open,false);
  assert.equal(d.activeElement,disclosure.querySelector('summary'));
  h.dom.window.close();
});

test('bucket action keeps its name during setup and blocks duplicate clicks',async()=>{
 const h=harness(),d=h.dom.window.document;let finish,calls=0;
 h.context.addBucketPreset=()=>{calls++;return new Promise(resolve=>finish=resolve);};
 await vm.runInContext('refreshBuckets()',h.context);
 const tile=d.querySelector('.bucket-select');tile.click();tile.click();
 assert.equal(calls,1);assert.equal(tile.getAttribute('aria-busy'),'true');assert.equal(tile.querySelector('.bucket-name').textContent,'test-bucket');
 assert.equal(tile.querySelector('.bucket-status').textContent,'Setting up…');finish({ok:true,verified:true});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(tile.disabled,false);assert.equal(tile.querySelector('.bucket-status').textContent,'Verified — ready');assert.equal(tile.hasAttribute('aria-busy'),false);h.dom.window.close();
});

test('Beta and Debug are independent, persist separate keys, and do not mutate profiles',async()=>{
 const h=harness(),d=h.dom.window.document;
 h.context.profiles=[{id:'kept',type:'github',token:'fixture'}];
 const before=JSON.stringify(h.context.profiles);
 vm.runInContext('applyDebugMode()',h.context);
 const beta=d.getElementById('beta-mode-enabled'),debug=d.getElementById('debug-mode-enabled');
 for(const [b,g] of [[true,false],[false,true],[true,true],[false,false]]){
  beta.checked=b;beta.dispatchEvent(new h.dom.window.Event('change'));
  debug.checked=g;debug.dispatchEvent(new h.dom.window.Event('change'));await Promise.resolve();
  assert.equal(d.documentElement.classList.contains('beta-mode'),b);
  assert.equal(d.documentElement.classList.contains('debug-mode'),g);
  assert.equal(h.dom.window.getComputedStyle(d.getElementById('add-github')).display==='none',!b);
  assert.equal(d.querySelector('[data-debug-detail]').hidden,!g);
 }
 assert.equal(JSON.stringify(h.context.profiles),before);
 assert.equal(h.saved.length,8);
 for(let i=0;i<8;i+=2){assert.deepEqual(Object.keys(h.saved[i]),['betaModeEnabled']);assert.deepEqual(Object.keys(h.saved[i+1]),['debugModeEnabled']);}
 h.dom.window.close();
});

test('cached configuration stays amber until explicit verification, and failures allow retry',async()=>{
 const h=harness(),d=h.dom.window.document;
 h.context.profiles=[{type:'cloudflare-r2',accountId:'account',bucketName:'test-bucket',workerUrl:'https://fixture.workers.dev',token:'fixture'}];
 await h.context.refreshBuckets();
 const tile=d.querySelector('.bucket'),square=tile.querySelector('.bucket-select'),circle=tile.querySelector('.bucket-repair');
 assert.equal(tile.dataset.signal,'attention');assert.equal(circle.textContent,'↻');
 h.context.addBucketPreset=async()=>({ok:true,verified:false});square.click();await new Promise(r=>setImmediate(r));
 assert.equal(tile.dataset.signal,'attention');assert.doesNotMatch(tile.querySelector('.bucket-status').textContent,/ready/i);
 h.context.addBucketPreset=async()=>{throw Error('Connection timed out. Retry repair.');};circle.click();await new Promise(r=>setImmediate(r));
 assert.equal(tile.dataset.signal,'repair');assert.equal(circle.textContent,'!');assert.equal(circle.disabled,false);
 assert.match(d.getElementById('cf-status').textContent,/timed out/);
 h.context.addBucketPreset=async()=>({ok:true,verified:true});circle.click();await new Promise(r=>setImmediate(r));
 assert.equal(tile.dataset.signal,'ready');assert.equal(circle.textContent,'✓');assert.equal(square.getAttribute('aria-pressed'),'true');
 h.dom.window.close();
});

test('newer bucket loads win even across A-B-A account switches',async()=>{
 const h=harness(),d=h.dom.window.document,finish=[];
 h.context.send=()=>new Promise(resolve=>finish.push(resolve));
 const a=h.context.refreshBuckets();h.context.currentAccountId='second';const b=h.context.refreshBuckets();h.context.currentAccountId='account';const c=h.context.refreshBuckets();
 finish[2]({ok:true,buckets:[{name:'latest'}]});await c;
 finish[0]({ok:false,error:'Old failure'});finish[1]({ok:true,buckets:[{name:'obsolete'}]});await Promise.all([a,b]);
 assert.equal(d.querySelector('.bucket-name').textContent,'latest');assert.doesNotMatch(d.getElementById('cf-status').textContent,/Old failure/);
 assert.equal(d.getElementById('bucket-grid').hasAttribute('aria-busy'),false);
 h.dom.window.close();
});

test('persisted mode combinations restore independently, with Beta off when absent',()=>{
 const init=source.slice(source.lastIndexOf('  profiles=stored.profiles||[];'),source.lastIndexOf('  rightClickMode=RedownNestedLocations.menuMode(stored.rightClickMode,profiles);'));
 for(const stored of [{},{betaModeEnabled:true},{debugModeEnabled:true},{betaModeEnabled:true,debugModeEnabled:true}]){
  const h=harness();h.context.stored=stored;vm.runInContext(init,h.context);
  assert.equal(h.dom.window.document.getElementById('beta-mode-enabled').checked,stored.betaModeEnabled===true);
  assert.equal(h.dom.window.document.getElementById('debug-mode-enabled').checked,stored.debugModeEnabled===true);
  h.dom.window.close();
 }
});

test('a late repair cannot overwrite a newer bucket list or unlock its active operation',async()=>{
 const h=harness(),d=h.dom.window.document;let finish;
 await h.context.refreshBuckets();const old=d.querySelector('.bucket');
 h.context.addBucketPreset=()=>new Promise(resolve=>finish=resolve);old.querySelector('.bucket-repair').click();
 await h.context.refreshBuckets();const current=d.querySelector('.bucket');
 finish({ok:true,verified:true});await new Promise(r=>setImmediate(r));
 assert.equal(current.dataset.signal,'attention');assert.equal(old.isConnected,false);
 assert.equal(current.querySelector('.bucket-repair').disabled,false);h.dom.window.close();
});

test('disabling Debug exits practice without moving focus into hidden diagnostics',async()=>{
 const h=harness(),d=h.dom.window.document;
 let exited;
 h.context.storageTraining={exit:options=>exited=options};
 d.getElementById('debug-mode-enabled').checked=false;
 d.getElementById('debug-mode-enabled').dispatchEvent(new h.dom.window.Event('change'));await Promise.resolve();
 assert.equal(exited.focus,false);assert.equal(d.querySelector('[data-debug-detail]').hidden,true);h.dom.window.close();
});


test('primary bucket action opens Explorer at its root after setup; cached selection does not require redeployment',async()=>{
 for(const verified of [true,false]){
  const h=harness(),d=h.dom.window.document;await h.context.refreshBuckets();let finish;
  h.context.addBucketPreset=()=>new Promise(resolve=>finish=resolve);
  d.querySelector('.bucket-use').click();assert.equal(h.opened.length,0);
  finish({ok:true,verified});await new Promise(r=>setImmediate(r));
  assert.deepEqual(h.opened,[['account','test-bucket','']]);assert.equal(d.activeElement,d.getElementById('explorer'));h.dom.window.close();
 }
});
test('repair, failed setup, refreshed lists and newer Explorer interactions never redirect Explorer',async()=>{
 for(const scenario of ['repair','failed','refreshed','pointerdown','keydown']){
  const h=harness(),d=h.dom.window.document;await h.context.refreshBuckets();let finish;
  h.context.addBucketPreset=()=>new Promise(resolve=>finish=resolve);
  d.querySelector(scenario==='repair'?'.bucket-repair':'.bucket-use').click();
  if(scenario==='refreshed')await h.context.refreshBuckets();
  if(['pointerdown','keydown'].includes(scenario))d.getElementById('explorer').dispatchEvent(new h.dom.window.Event(scenario,{bubbles:true}));
  finish({ok:scenario!=='failed',verified:true});await new Promise(r=>setImmediate(r));assert.equal(h.opened.length,0,scenario);h.dom.window.close();
 }
});
test('missing inventory is refreshed before navigation and navigation failure does not mark a verified bucket broken',async()=>{
 const h=harness(),d=h.dom.window.document;await h.context.refreshBuckets();h.context.explorerBuckets.clear();
 let refreshes=0;h.context.loadExplorerInventory=async()=>refreshes++;
 h.context.goLocation=async()=>{throw Error('Listing unavailable')};
 d.querySelector('.bucket-use').click();await new Promise(r=>setImmediate(r));
 assert.equal(refreshes,1);assert.match(d.getElementById('cf-status').textContent,/configured, but Explorer/);assert.equal(d.querySelector('.bucket').dataset.signal,'ready');h.dom.window.close();
});

test('bucket navigation collapses expansion and focuses Explorer before measuring its top',async()=>{
 for(const reduced of [false,true]){
  const h=harness(),d=h.dom.window.document;await h.context.refreshBuckets();
  h.dom.window.matchMedia=()=>({matches:reduced});
  const viewport=d.querySelector('.bucket-grid-viewport'),explorer=d.getElementById('explorer'),zone=d.getElementById('explore-zone');
  const events=[];const focus=explorer.focus.bind(explorer);
  explorer.focus=options=>{assert.equal(viewport.dataset.dismissed,'true');assert.equal(options.preventScroll,true);events.push('focus');focus(options);};
  zone.scrollIntoView=options=>{assert.equal(viewport.dataset.dismissed,'true');assert.equal(d.activeElement,explorer);assert.equal(options.block,'start');assert.equal(options.behavior,reduced?'instant':'smooth');events.push('scroll');};
  d.querySelector('.bucket-use').focus();d.querySelector('.bucket-use').click();
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(events,['focus','scroll']);h.dom.window.close();
 }
});
