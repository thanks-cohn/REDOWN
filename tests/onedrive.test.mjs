import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {worker,config} from './helpers/background-worker.mjs';
const read=p=>readFileSync(p,'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const before=JSON.parse(read('docs/verification/onedrive/before.json'));
const original=execFileSync('git',['show',before.commit+':extension/background.js'],{encoding:'utf8'});
function menu(){const c=vm.createContext({});vm.runInContext(read('extension/onedrive-menu.js'),c);return c.RedownOneDriveMenu;}
const oneState=phase=>({phase,rootReady:true,root:'/',accountId:'ms-account',tenantId:'tenant',driveId:'drive',rootId:'root',connectionId:'test-connection',checkedAt:Date.now()});
test('unmodified protected modules retain checkpoint hashes; authorized Shelf changes are explicit',()=>{
 // The historical OneDrive checkpoint predates the separately authorized Dropbox source fix, Shelf revisions and animation repair.
 // Keep all untouched V3, Cloudflare and provider modules locked to their original hashes.
 const authorized=new Set(['extension/dropbox-api.js','extension/history-navigation.js',
   'extension/options.html','extension/options.js','extension/shelf-dropbox.js',
   'extension/shelf-google-drive.js','extension/shelf-history.js',
   'extension/shelf.css','extension/shelf.html','extension/shelf-celestial.js','extension/shelf.js']);
 for(const [p,h] of Object.entries(before.hashes)){
  if(p==='extension/manifest.json'){
    const baseline=JSON.parse(execFileSync('git',['show',before.commit+':'+p],{encoding:'utf8'}));
    const {optional_host_permissions,...original}=baseline;
    assert.ok(optional_host_permissions.includes('https://*/*'));
    assert.deepEqual(JSON.parse(read(p)),{
      ...original,host_permissions:[...original.host_permissions,'https://*/*','http://*/*']
    });
  }else if(authorized.has(p))assert.ok(readFileSync(p).length>0,p+' must remain present');
  else assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),h,p);
 }
});
test('OneDrive menu shows root save only with a verified connected-state identity',()=>{
 const m=menu();
 for(const phase of ['disconnected','connecting','connected','reconnect','blocked']){
  const fragment=m.fragment(oneState(phase),'redown');assert.equal(fragment.entries.length,2);assert.equal(fragment.entries[1].id,phase==='connected'?'provider:onedrive:save-root':'provider:onedrive:connect');
  assert.equal(fragment.entries[1].enabled,phase!=='connecting');
  assert.deepEqual(plain(m.obsolete(new Set())),['provider:onedrive:connect','provider:onedrive:save-root']);
 }
 for(const id of ['provider:dropbox','provider:google-drive','v3:provider:cloudflare','provider:onedrivex',null,{}])assert.equal(m.owns(id),false);
 assert.equal(m.owns('provider:onedrive:stale'),true);
});
test('invalid OneDrive fragments preserve original identity and exact plan',()=>{
 const m=menu(),base=[{id:'redown'},{id:'provider:dropbox',parentId:'redown'},{id:'redown-manage',parentId:'redown'}];
 const good=m.fragment({},'redown');
 for(const fragment of [null,{}, {...good,providerId:'dropbox'}, {...good,entries:[]}, {...good,entries:[good.entries[0],{...good.entries[1],parentId:'redown'}]}, {...good,entries:[good.entries[0],{...good.entries[1],id:'provider:dropbox:connect'}]}, {...good,entries:[good.entries[0],{...good.entries[1],onclick:'evil'}]}, {...good,entries:[good.entries[0],{...good.entries[1],contexts:['all']}]}, {...good,entries:[good.entries[0],{...good.entries[1],title:''}]}]){
  const result=m.compose(base,fragment,'redown');assert.equal(result.entries,base);assert.equal(result.error,'ONEDRIVE_MENU_FRAGMENT_INVALID');
 }
});
test('actual shared registry across four presentations and all provider connection masks preserves prior routes',async()=>{
 const m=menu();let cases=0;const evidence={scope:'Synthetic native registry and route replay, not installed Chrome or OAuth',baselineCommit:before.commit,plans:{},cases:[]};
 const capture=value=>{const text=JSON.stringify(value),hash=createHash('sha256').update(text).digest('hex');evidence.plans[hash]=value;return hash;};
 for(const mode of ['simple','nested','narrow','depth'])for(let mask=0;mask<16;mask++){
  const local=config();local.rightClickMode=mode==='simple'?'simple':'nested';local.rightClickV3Presentation={style:mode==='simple'?'simple':'nested',nested:mode==='narrow'?'narrow':'level',depth:mode==='depth'?3:1};
  if(!(mask&1))local.profiles=[];
  local.googleDriveState={phase:mask&2?'connected':'disconnected',folderId:'folder'};
  local['dropbox:state']={phase:mask&4?'connected':'disconnected',rootReady:true,root:'/',accountId:'dbid:fixture',connectionId:'fixture'};
  local['onedrive:state']=oneState(mask&8?'connected':'disconnected');
  const old=worker(structuredClone(local),{backgroundSource:original}),next=worker(structuredClone(local));
  await old.ready();await next.ready();await old.rebuild();await next.rebuild();
  const plan=w=>[...w.native].map(([id,e])=>({id,...e}));
  assert.deepEqual(plan(next).filter(e=>!m.owns(e.id)),plan(old),`${mode}/${mask}`);
  const ids=[...next.native.keys()],drop=ids.indexOf('provider:dropbox'),one=ids.indexOf('provider:onedrive');
  assert.ok(one>drop);for(const id of ids.slice(drop+1,one))assert.ok(id.startsWith('provider:dropbox:'));
  assert.ok(one<ids.indexOf('redown-manage'));
  assert.equal(next.chrome.contextMenus.onClicked.listeners.length,1);
  const routes=async w=>JSON.stringify(await vm.runInContext(`(async()=>{const profiles=await getProfiles();return Promise.all(${JSON.stringify([...old.native.keys()])}.map(async id=>[id,await resolveActiveRightClick(id,profiles)]));})()`,w.context));
  const oldRoutes=await routes(old),nextRoutes=await routes(next);assert.equal(nextRoutes,oldRoutes);
  evidence.cases.push({mode,providerConnectionMask:mask,baselinePlan:capture(plan(old)),candidatePlan:capture(plan(next)),baselineRoutes:capture(JSON.parse(oldRoutes)),candidateRoutes:capture(JSON.parse(nextRoutes)),preexistingEntriesIdentical:true});
  for(const key of ['rightClickV3','rightClickV3Presentation','rightClickMode','profiles'])assert.deepEqual(next.local[key],old.local[key]);
  assert.ok(!next.calls.some(c=>c[0]==='removeAll'));cases++;
 }
 assert.equal(cases,64);
 if(process.env.REDOWN_ONEDRIVE_EVIDENCE)writeFileSync(process.env.REDOWN_ONEDRIVE_EVIDENCE,JSON.stringify(evidence,null,2)+'\n');
});
test('bad or throwing fragment keeps original shared native menu; error is provider-local',async()=>{
 for(const expression of ['()=>{throw Error("bad")}', '()=>({providerId:"onedrive",entries:[{id:"provider:dropbox"}]})']){
  const a=worker(config(),{backgroundSource:original}),b=worker(config());await a.ready();await b.ready();
  vm.runInContext(`RedownOneDriveMenu.fragment=${expression}`,b.context);await a.rebuild();await b.rebuild();
  assert.deepEqual([...b.native],[...a.native]);assert.equal(b.local['onedrive:menuError'].code,'ONEDRIVE_MENU_FRAGMENT_INVALID');assert.equal(b.local.rightClickMenuStatus.state,'registered');
 }
});
test('exact existing dispatcher consumes OneDrive once, never routes stale IDs to prior providers',async()=>{
 const w=worker();await w.ready();
 vm.runInContext(`globalThis.dispatched=[];onedriveProvider.dispatch=async info=>dispatched.push(['onedrive',info.menuItemId]);dropboxProvider.dispatch=async info=>dispatched.push(['dropbox',info.menuItemId]);RedownGoogleDriveProvider.dispatch=async info=>dispatched.push(['google',info.menuItemId]);`,w.context);
 const listener=w.chrome.contextMenus.onClicked.listeners[0];
 for(const id of ['provider:onedrive','provider:onedrive:connect','provider:onedrive:stale','provider:dropbox','provider:google-drive:save-redown'])await listener({menuItemId:id},{});
 assert.deepEqual(plain(w.context.dispatched),[['onedrive','provider:onedrive'],['onedrive','provider:onedrive:connect'],['onedrive','provider:onedrive:stale'],['dropbox','provider:dropbox'],['google','provider:google-drive:save-redown']]);
});
test('stale menus, concurrent rebuild and MV3 restart preserve other providers',async()=>{
 const w=worker();await w.ready();await w.rebuild();
 const other=w=>[...w.native].filter(([id])=>!menu().owns(id));const baseline=other(w);
 for(const phase of ['connecting','connected','reconnect','blocked','disconnected']){
  w.local['onedrive:state']=oneState(phase);await Promise.all([w.rebuild(),w.rebuild(),w.rebuild()]);assert.deepEqual(other(w),baseline);
 }
 const listener=w.chrome.contextMenus.onClicked.listeners[0];await listener({menuItemId:'provider:onedrive:stale',srcUrl:'https://example.org/a.png'},{});
 assert.equal(w.local['onedrive:transfer'].status,'blocked');assert.equal(w.local['onedrive:transfer'].code,'ONEDRIVE_STALE_MENU');
 assert.deepEqual(w.local.transferHistory,[{id:'preserved'}]);assert.ok(!w.calls.some(c=>['tab','window'].includes(c[0])));
 const restarted=worker(structuredClone(w.local),{nativeEntries:[...w.native]});await restarted.ready();await restarted.rebuild();assert.deepEqual(other(restarted),baseline);
});
test('OneDrive connection controls stay Shelf-only and stale actions never save',async()=>{
 const w=worker();await w.ready();const p=vm.runInContext('onedriveProvider',w.context),beforeCalls=w.calls.length;
 const sender={id:'test',url:'chrome-extension://test/shelf.html'};
 for(const url of ['https://evil.invalid/shelf.html','chrome-extension://test/options.html','chrome-extension://test/shelf.html/evil'])assert.equal((await p.message({type:'onedriveConnect'},{id:'test',url})).ok,false);
 assert.equal((await p.message({type:'onedriveConnect'},sender)).ok,false);
 assert.equal((await p.message({type:'onedriveStatus'},sender)).ok,true);
 await p.dispatch({menuItemId:'provider:onedrive:unknown'});assert.equal(w.local['onedrive:transfer'].code,'ONEDRIVE_STALE_MENU');
 assert.equal(w.calls.length,beforeCalls);assert.deepEqual(w.local.transferHistory,[{id:'preserved'}]);
 w.local['onedrive:auth']={token:'test'};await p.message({type:'onedriveDisconnect'},sender);assert.equal(w.local['onedrive:auth'],undefined);
});
test('Shelf shows controlled login, diagnostic and root actions without altering other provider markup',async()=>{
 const html=read('extension/shelf.html'),dom=new JSDOM(html,{runScripts:'outside-only'}),d=dom.window.document;
 const calls=[];dom.window.chrome={runtime:{sendMessage:async m=>{calls.push(m);return {ok:false,error:'OAuth verification pending.'};}},permissions:{request:async()=>true},storage:{local:{get:async()=>({})},onChanged:{addListener:()=>{}}}};
 dom.window.eval(read('extension/provider-connection.js'));
 dom.window.eval(read('extension/shelf-onedrive.js'));
 assert.deepEqual(plain(calls),[{type:'onedriveStatus',passive:true}]);assert.ok(html.indexOf('class="google-drive-control destination-tile"')<html.indexOf('class="dropbox-control destination-tile"'));assert.ok(html.indexOf('class="dropbox-control destination-tile"')<html.indexOf('class="onedrive-control destination-tile"'));
 const b=d.getElementById('shelf-onedrive');assert.equal(b.type,'button');assert.equal(d.getElementById(b.getAttribute('aria-describedby')).getAttribute('role'),'status');
 await new Promise(r=>setImmediate(r));b.click();await new Promise(r=>setImmediate(r));assert.deepEqual(plain(calls),[{type:'onedriveStatus',passive:true},{type:'onedriveConnect'}]);assert.match(d.getElementById('shelf-onedrive-status').textContent,/pending/);assert.equal(b.disabled,false);
 for(const id of ['shelf-google-drive','shelf-dropbox','shelf-onedrive','shelf-google-status','shelf-dropbox-status'])assert.ok(d.getElementById(id));
 assert.equal(d.querySelectorAll('.destinations-grid .destination-tile').length,3);assert.equal(d.getElementById('shelf-onedrive-diagnostic'),null);
 dom.window.close();
});

test('OneDrive Test from Dashboard is gated by Debug Mode and trusted sender',async()=>{
 const w=worker();
 await w.ready();
 const p=vm.runInContext('onedriveProvider',w.context);
 const sender={id:'test',url:'chrome-extension://test/options.html'};
 const blocked=await p.message({type:'onedriveDiagnostic'},sender);
 assert.equal(blocked.code,'ONEDRIVE_DEBUG_DISABLED');
 assert.equal((await p.message({type:'onedriveConnect'},{id:'test',url:'https://untrusted.invalid/'})).code,'ONEDRIVE_UNTRUSTED_SENDER');
 w.local.debugModeEnabled=true;
 vm.runInContext('globalThis.RedownOneDriveOAuthDiagnostic={create:()=>({run:async()=>({ok:true,code:"ONEDRIVE_DIAGNOSTIC_TEST"})})}',w.context);
 const allowed=await p.message({type:'onedriveDiagnostic'},sender);
 assert.equal(allowed.code,'ONEDRIVE_DIAGNOSTIC_TEST');
 assert.equal((await p.message({type:'onedriveDiagnostic'},{id:'foreign',url:sender.url})).code,'ONEDRIVE_UNTRUSTED_SENDER');
 assert.equal((await p.message({type:'onedriveDiagnostic'},{id:'test',url:'https://untrusted.invalid/options.html'})).code,'ONEDRIVE_UNTRUSTED_SENDER');
});
