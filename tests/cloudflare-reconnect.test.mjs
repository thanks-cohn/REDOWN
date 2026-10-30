import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');
test('verified reconnect refreshes both editors and Explorer, coalescing concurrent refresh requests',async()=>{
  const dom=new JSDOM(html,{runScripts:'outside-only'}),calls=[];
  const simple=dom.window.document.createElement('div');simple.className='cloudflare-location-refresh';
  simple.refreshCloudflareLocations=async()=>calls.push('simple');dom.window.document.body.append(simple);
  const cache=new Map([['stale',[]]]),otherCache=new Map([['stale',[]]]);
  const ctx=vm.createContext({document:dom.window.document,window:dom.window,
    $:id=>dom.window.document.getElementById(id),
    chrome:{storage:{local:{get:async()=>({cloudflareAuth:{accessToken:'verified'}})}}},
    profiles:[],cfAccounts:[],currentAccountId:'retained-account',onboardingConnected:false,onboardingBucketState:'loading',
    defaultLocationPrefixCache:cache,presetLocationCache:otherCache,
    RedownNestedEditor:{refresh:()=>calls.push('nested')},
    send:async()=>({ok:true,accounts:[{id:'another-account'},{id:'retained-account'}]}),
    refreshBuckets:async()=>calls.push('buckets'),
    loadExplorerInventory:async()=>calls.push('explorer'),setStatus:(id,text)=>{dom.window.document.getElementById(id).textContent=text;},safeUiMessage:x=>x,friendlyError:x=>String(x)
  });
  vm.runInContext(source.slice(source.indexOf('function isSetupDestination('),source.indexOf('function applyDebugMode(){')),ctx);
  vm.runInContext(source.slice(source.indexOf('async function refreshLocationEditors(){'),source.indexOf('async function refreshBuckets(){')),ctx);
  const a=vm.runInContext('refreshCloudflare()',ctx),b=vm.runInContext('refreshCloudflare()',ctx);
  assert.equal(a,b);
  await a;
  assert.deepEqual(calls,['buckets','simple','nested','explorer']);
  assert.equal(cache.size,0);assert.equal(otherCache.size,0);
  assert.equal(ctx.currentAccountId,'retained-account');
  const send=ctx.send;
  ctx.send=async()=>({ok:false,error:'Cloudflare session expired. Reconnect Cloudflare.'});
  assert.equal(await vm.runInContext('refreshCloudflare()',ctx),false);
  assert.equal(dom.window.document.getElementById('connect-cloudflare').hidden,false);
  assert.match(dom.window.document.getElementById('hero-status').textContent,/session expired/);
  assert.match(dom.window.document.getElementById('menu-location-status').textContent,/session expired/);
  ctx.send=send;
  const refresh=dom.window.document.getElementById('refresh-menu-locations');refresh.click();
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(refresh.disabled,false);
  assert.match(dom.window.document.getElementById('menu-location-status').textContent,/Locations refreshed/);
  assert.doesNotMatch(dom.window.document.getElementById('menu-location-status').textContent,/session expired|Connect Cloudflare/);
  ctx.rightClickMode='simple';
  dom.window.document.getElementById('right-click-mode-status').className='status bad';
  vm.runInContext(source.slice(source.indexOf('function renderRightClickMode(){'),source.indexOf('async function chooseRightClickMode(')),ctx);
  vm.runInContext('renderRightClickMode()',ctx);
  assert.equal(dom.window.document.getElementById('right-click-mode-status').className,'meta');
  assert.match(dom.window.document.getElementById('right-click-mode-status').textContent,/Legacy menu settings are read-only/);
  dom.window.close();
});

test('slow bucket loading does not block locations, Explorer, or connection refresh',async()=>{
 const dom=new JSDOM(html,{runScripts:'outside-only'}),calls=[];let finish;
 const ctx=vm.createContext({document:dom.window.document,window:dom.window,
  $:id=>dom.window.document.getElementById(id),
  chrome:{storage:{local:{get:async()=>({cloudflareAuth:{accessToken:'fixture'}})}}},
  profiles:[],cfAccounts:[],currentAccountId:'account',onboardingConnected:false,onboardingBucketState:'loading',
  send:async()=>({ok:true,accounts:[{id:'account'}]}),applyOnboarding(){},
  refreshBuckets:()=>{calls.push('buckets');return new Promise(resolve=>finish=resolve);},
  refreshLocationEditors:async()=>calls.push('locations'),loadExplorerInventory:async()=>calls.push('explorer'),
  setStatus(){},safeUiMessage:x=>x,friendlyError:x=>String(x)
 });
 vm.runInContext(source.slice(source.indexOf('let cloudflareRefreshTask=null;'),source.indexOf('$("r2-check").addEventListener')),ctx);
 assert.equal(await ctx.refreshCloudflare(),true);
 assert.deepEqual(calls,['buckets','locations','explorer']);
 finish();await Promise.resolve();dom.window.close();
});

test('an invalidated connection reply cannot replace a newer account view',async()=>{
 const dom=new JSDOM(html,{runScripts:'outside-only'});let finishOld,calls=0;
 const ctx=vm.createContext({document:dom.window.document,window:dom.window,
  $:id=>dom.window.document.getElementById(id),bucketLoadVersion:0,
  chrome:{storage:{local:{get:async()=>({cloudflareAuth:{accessToken:'fixture'}})}}},
  profiles:[],cfAccounts:[],currentAccountId:'',onboardingConnected:false,onboardingBucketState:'loading',
  send:()=>++calls===1?new Promise(resolve=>finishOld=resolve):Promise.resolve({ok:true,accounts:[{id:'new-account'}]}),
  applyOnboarding(){},refreshBuckets:async()=>{},refreshLocationEditors:async()=>{},loadExplorerInventory:async()=>{},
  setStatus(){},safeUiMessage:x=>x,friendlyError:x=>String(x)
 });
 vm.runInContext(source.slice(source.indexOf('let cloudflareRefreshTask=null;'),source.indexOf('$("r2-check").addEventListener')),ctx);
 const old=ctx.refreshCloudflare();await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof finishOld,"function");ctx.invalidateCloudflareView();
 assert.equal(await ctx.refreshCloudflare(),true);assert.equal(ctx.currentAccountId,'new-account');
 finishOld({ok:true,accounts:[{id:'old-account'}]});assert.equal(await old,false);
 assert.equal(ctx.currentAccountId,'new-account');dom.window.close();
});
