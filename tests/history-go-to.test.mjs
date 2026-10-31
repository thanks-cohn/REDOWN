import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {resolveHistoryTarget} from '../extension/beta/history-target.mjs';
import {createR2Adapter} from '../extension/beta/r2-adapter.mjs';
import {createFileApi} from '../extension/beta/file-api.mjs';
const read=p=>readFileSync(p,'utf8'),script=read('extension/history-navigation.js');
const good={id:'saved',ok:true,verified:true,at:new Date().toISOString(),sourceUrl:'https://source.invalid/file.webp',location:'R2: bucket/photos/example (2).webp',destination:{accountId:'a',bucketName:'bucket',prefix:'photos',key:'photos/example (2).webp'}};
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
function view(data={},side=()=>Promise.resolve()){
 const dom=new JSDOM(read('extension/shelf.html'),{url:'https://extension.invalid/shelf.html#history',runScripts:'outside-only'}),w=dom.window,listeners=[],calls=[];
 const local={...data},session={};
 const storage=(values,area)=>({get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,values[k]])),set:async patch=>{Object.assign(values,structuredClone(patch));for(const f of listeners)f(Object.fromEntries(Object.entries(patch).map(([k,v])=>[k,{newValue:v}])),area);},remove:async k=>{delete values[k];}});
 w.chrome={storage:{local:storage(local,'local'),session:storage(session,'session'),onChanged:{addListener:f=>listeners.push(f)}},runtime:{getURL:p=>'https://extension.invalid/'+p},tabs:{getCurrent:async()=>({id:2}),create:async o=>{calls.push(['tab',o]);}},windows:{WINDOW_ID_CURRENT:-2,getCurrent:async()=>({id:7})},sidePanel:{open:o=>{calls.push(['panel',o]);return side();}}};
 w.eval(script);return {dom,w,local,session,calls,nav:w.RedownHistoryNavigation};
}
test('strict receipt eligibility retains exact Keep Both key without source/filename inference',async()=>{
 const h=view();await h.nav.preference;
 const l=h.nav.locator(good);assert.equal(l.key,'photos/example (2).webp');assert.equal(l.prefix,'photos/');assert.equal(l.accountId,'a');
 for(const ok of [false,undefined,null])assert.equal(h.nav.locator({...good,ok}),null);
 for(const status of ['failed','pending','cancelled','uncertain','incomplete','started','accepted'])assert.equal(h.nav.locator({...good,status}),null);
 for(const patch of [{destination:null},{destination:{...good.destination,prefix:42}},{verified:false},{uncertain:true},{verified:undefined,location:undefined},{error:'oops'},{destination:{...good.destination,key:'other/file.webp'}},{destination:{...good.destination,key:'photos/../one'}}])assert.equal(h.nav.locator({...good,...patch}),null);
 assert.equal(h.nav.locator({...good,verified:undefined}).key,l.key,'old exact receipts remain usable');h.dom.window.close();
});
test('default creates and activates a new tab with only an opaque request ID; receipt remains unchanged',async()=>{
 const h=view(),before=JSON.stringify(good);await h.nav.preference;h.nav.open(good);await settle();
 assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'tab');const args=h.calls[0][1];assert.equal(args.active,true);assert.match(args.url,/beta\/explorer.html#history=/);assert.ok(!args.url.includes('bucket')&&!args.url.includes('photos'));
 assert.equal(Object.values(h.session)[0].locator.key,good.destination.key);assert.equal(JSON.stringify(good),before);h.dom.window.close();
});
test('Side Panel invokes open synchronously in the gesture and never creates or activates a tab',async()=>{
 const h=view({historyGoToMode:'side'});await h.nav.preference;h.nav.open(good);assert.equal(h.calls[0][0],'panel');await settle();assert.equal(h.calls.length,1);assert.equal(h.session.historySideNavigation.windowId,7);assert.equal(h.session.historySideNavigation.locator.key,good.destination.key);h.dom.window.close();
});
test('panel failure preserves preference and offers an explicit fallback without opening it',async()=>{
 for(const side of [()=>Promise.reject(Error('gesture denied')),()=>{throw Error('unsupported');}]){
 const h=view({historyGoToMode:'side'},side);await h.nav.preference;h.nav.open(good);await settle();assert.equal(h.calls.filter(x=>x[0]==='tab').length,0);assert.equal(h.local.historyGoToMode,'side');const fallback=h.w.document.querySelector('#history-navigation-status button');assert.equal(fallback.textContent,'Open in New Tab');fallback.click();await settle();assert.equal(h.calls.filter(x=>x[0]==='tab').length,1);h.dom.window.close();}
});
test('preference persists on existing storage and initializes after a restart',async()=>{
 const h=view();await h.nav.preference;const select=h.w.document.getElementById('history-go-to-mode');assert.equal(select.value,'tab');select.value='side';select.dispatchEvent(new h.w.Event('change'));await settle();assert.equal(h.local.historyGoToMode,'side');const restarted=view(h.local);await restarted.nav.preference;await settle();assert.equal(restarted.w.document.getElementById('history-go-to-mode').value,'side');h.dom.window.close();restarted.dom.window.close();
});
test('rapid panel opens discard a late older opening result',async()=>{
 const releases=[];const h=view({historyGoToMode:'side'},()=>new Promise(r=>releases.push(r)));await h.nav.preference;
 h.nav.open(good);h.nav.open({...good,destination:{...good.destination,key:'photos/new.webp'}});releases[1]();await settle();releases[0]();await settle();assert.equal(h.session.historySideNavigation.locator.key,'photos/new.webp');h.dom.window.close();
});
test('expired, future, malformed and reloaded handoffs fail closed',async()=>{
 const h=view();await h.nav.preference;const intent={token:'abc',locator:h.nav.locator(good),issuedAt:Date.now()};assert.ok(h.nav.valid(intent));for(const issuedAt of [0,Date.now()+60000,NaN])assert.ok(!h.nav.valid({...intent,issuedAt}));assert.ok(!h.nav.valid({}));h.dom.window.close();
});
test('History success action is visible, keyboard accessible and does not toggle disclosure; failed DOM is byte identical',async()=>{
 const fail={...good,id:'failed',ok:false,error:'Provider denied access',sourceUrl:'https://source.invalid/'+('long/'.repeat(24))+'file.webp'};
 const rows=[good,fail,{...good,id:'pending',status:'pending'},{id:'old',ok:true,location:'R2: bucket/old',at:good.at}];
 async function render(withNavigation){const h=view({transferHistory:rows});await h.nav.preference;if(!withNavigation)delete h.w.RedownHistoryNavigation;h.w.eval(read('extension/shelf-history.js'));await h.w.RedownShelfHistory.open();return h;}
 const before=await render(false),after=await render(true),doc=after.w.document;
 assert.equal(doc.querySelector('[data-state=failed]').outerHTML,before.w.document.querySelector('[data-state=failed]').outerHTML);
 assert.equal(doc.querySelectorAll('.history-go-to').length,1);const go=doc.querySelector('.history-go-to');assert.equal(go.tagName,'BUTTON');assert.ok(go.getAttribute('aria-label'));assert.ok(!go.hidden);assert.equal(doc.querySelector('[data-state=failed] .history-go-to'),null);
 const disclosure=go.closest('details'),wasOpen=disclosure?.open;go.click();await settle();assert.equal(disclosure?.open,wasOpen);assert.equal(after.calls[0][0],'tab');before.dom.window.close();after.dom.window.close();
});
test('exact lookup uses real paged R2 stat and skips same-name objects and prefixes',async()=>{
 const urls=[];const adapter=createR2Adapter({http:{request:async url=>{urls.push(url);return new Response(JSON.stringify({success:true,result:{objects:urls.length===1?[{key:'photos/example.webp'},{key:'photos/example (2).webp.bak'}]:[{key:good.destination.key,size:12}],cursor:urls.length===1?'next':''}}));}}});
 const api=createFileApi(adapter),l={...good.destination,provider:'cloudflare-r2',prefix:'photos/',filename:'example (2).webp'};
 const result=await resolveHistoryTarget(api,l);assert.equal(result.key,l.key);assert.equal(result.displayName,l.filename);assert.equal(urls.length,2);assert.match(urls[1],/cursor=next/);assert.ok(urls.every(u=>u.includes('/accounts/a/r2/buckets/bucket/objects')));
});
test('missing, moved, deleted, expired authorization, offline and mismatched objects never select substitutes',async()=>{
 const l={...good.destination,provider:'cloudflare-r2'};
 for(const data of [{object:null},{object:{key:'photos/example.webp'}}])await assert.rejects(resolveHistoryTarget({run:async()=>({state:'completed',data})},l),/recorded location|different object/);
 for(const error of ['401 authorization expired','403 denied','offline','provider failure'])await assert.rejects(resolveHistoryTarget({run:async()=>({state:'failed',error})},l),new RegExp(error));
 const abort=new AbortController();abort.abort();await assert.rejects(resolveHistoryTarget({run:async()=>({state:'completed',data:{object:{key:l.key}}})},l,{signal:abort.signal}),/abort/i);
});
test('Setup geometry has no reserved slots and empty statuses collapse; genuine messages remain',()=>{
 const css=read('extension/beta/right-click-v3.css'),ui=read('extension/beta/right-click-v3-ui.js');
 assert.doesNotMatch(css,/min-height:(156|224)px|grid-template-rows:30px 30px/);assert.match(css,/:empty\{display:none/);assert.match(css,/#v3-setup.quick-links-content\{min-height:0\}/);
 assert.doesNotMatch(ui,/Saved configuration loaded\. Chrome readiness|New Right-click \(V3\) controls Chrome/);assert.match(ui,/Configuration changed in another window/);assert.match(ui,/Reload the extension in chrome:\/\/extensions/);
});

// Execute the real integration function with an explicit Explorer lifecycle fixture.
async function navigationHarness(overrides={}){
 const {default:vm}=await import('node:vm');const source=read('extension/beta/explorer.mjs');
 const start=source.indexOf('let historyNavigationEpoch='),end=source.indexOf('void (async()=>{',start);
 const messages=[],selectedRows=[],previews=[],rows=[];
 const context={setTimeout,clearTimeout,AbortController,Date,Set,Error,
   RedownHistoryNavigation:{valid:i=>Boolean(i?.locator)},chrome:{tabs:{getCurrent:async()=>undefined},windows:{getCurrent:async()=>({id:7})}},
   explorerInitialization:Promise.resolve(),busy:false,cloudflareSignedIn:true,accounts:[{id:'a'}],bucketCache:new Map([['a',[{name:'bucket'}]]]),current:null,listingState:'ready',epoch:0,discoveryEpoch:0,
   status:m=>messages.push(m),sameBucket:(a,b)=>a?.accountId===b?.accountId&&a?.bucketName===b?.bucketName,
   loadAccounts:async()=>{},navigate:async t=>{context.current={...t};context.epoch++;},resolveHistoryTarget:async(_,t)=>({key:t.key,displayName:t.filename}),api:{},
   items:[],selected:new Set(),render:()=>{selectedRows.push([...context.selected]);rows.splice(0,rows.length,...context.items.map(i=>({dataset:{key:i.key},scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;}})));},
   $:()=>({value:'',querySelectorAll:()=>rows}),showPreview:async i=>previews.push(i.key),previewType:k=>k.endsWith('.webp')?'image/webp':null,...overrides};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 return {c:context,messages,selectedRows,previews,rows,go:(key='photos/example (2).webp',token=key)=>context.useHistoryNavigation({token,windowId:7,locator:{provider:'cloudflare-r2',accountId:'a',bucketName:'bucket',key,prefix:'photos/',filename:key.split('/').at(-1)}})};
}
test('real Explorer integration selects, scrolls, focuses and invokes the existing preview',async()=>{
 const h=await navigationHarness();await h.go();assert.deepEqual(h.previews,['photos/example (2).webp']);assert.equal(h.rows[0].scrolled,true);assert.equal(h.rows[0].focused,true);assert.deepEqual([...h.c.selected],['photos/example (2).webp']);assert.match(h.messages.at(-1),/Saved file selected/);
});
test('unsupported format is selected and passed to existing preview with truthful navigation status',async()=>{
 const h=await navigationHarness();await h.go('photos/file.bin');assert.deepEqual(h.previews,['photos/file.bin']);assert.match(h.messages.at(-1),/Preview is unavailable/);
});
test('real integration guards rapid requests and late exact lookup responses',async()=>{
 const pending=[];const h=await navigationHarness({resolveHistoryTarget:(_,t)=>new Promise(r=>pending.push(()=>r({key:t.key,displayName:t.filename})))});
 const first=h.go('photos/old.webp');await settle();const second=h.go('photos/new.webp');await settle();pending[1]();await second;pending[0]();await first;assert.deepEqual(h.previews,['photos/new.webp']);assert.deepEqual([...h.c.selected],['photos/new.webp']);
});
test('real integration refuses unavailable account, busy state, expired auth, changed location and deleted target',async()=>{
 for(const overrides of [{accounts:[]},{busy:true},{cloudflareSignedIn:false},{resolveHistoryTarget:async()=>{throw Error('File deleted. Refresh or reconnect.');}}]){
 const h=await navigationHarness(overrides);await h.go();assert.equal(h.previews.length,0);assert.equal(h.selectedRows.length,0);assert.ok(h.messages.at(-1));}
 const h=await navigationHarness();h.c.resolveHistoryTarget=async()=>{h.c.epoch++;return {key:'photos/example (2).webp'};};await h.go();assert.equal(h.previews.length,0);assert.match(h.messages.at(-1),/location changed/);
});
test('actual background dispatcher recognizes Setup requests and identifies unsupported version requests',async()=>{
 const {default:vm}=await import('node:vm');const bg=read('extension/background.js');let listener;
 const c=vm.createContext({crypto:{randomUUID:()=> 'test'},performance,chrome:{runtime:{onMessage:{addListener:f=>listener=f}}},runtimeDiagnostics:{record(){}},rightClickV3Snapshot:async()=>({ok:true,config:{version:1,destinations:[]}})});
 vm.runInContext(bg.slice(bg.indexOf('chrome.runtime.onMessage.addListener')),c);
 const request=type=>new Promise(resolve=>listener({type},{url:'chrome-extension://test/beta/explorer.html'},resolve));
 assert.equal((await request('rightClickV3Snapshot')).ok,true);
 const missing=await request('oldSetupRequest');assert.equal(missing.ok,false);assert.equal(missing.diagnosticError.code,'UNSUPPORTED_REQUEST');assert.match(missing.error,/oldSetupRequest.*Reload the extension/);assert.notEqual(missing.error,'Unknown request');
});
