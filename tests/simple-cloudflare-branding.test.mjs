import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {worker} from './helpers/background-worker.mjs';
const source=readFileSync('extension/right-click-v3.js','utf8');
function domain(){const c=vm.createContext({TextEncoder,setTimeout,clearTimeout});vm.runInContext(source,c);return c.RedownRightClickV3;}
const profile=(id='home',accountId='a',bucketName='redown')=>({id,type:'cloudflare-r2',accountId,bucketName,workerUrl:'https://fixture.invalid',token:'synthetic',workerVersion:6});
const target=(p,id='custom',prefix='photos/2026/final',label='Photography')=>({id,profileId:p.id,accountId:p.accountId,bucketName:p.bucketName,parentId:null,prefix,label,enabled:true});
const config=destinations=>({version:1,revision:1,destinations});
const options={style:'simple',nested:'narrow',depth:5};
test('Simple default leaf routes only to literal redown root, independent of Explorer',()=>{
 const m=domain(),p=profile(),other=profile('other','a','not-redown'),c=config([]),before=JSON.stringify(c),plan=m.project(c,[other,p],options);
 assert.deepEqual(structuredClone(plan.entries.map(e=>[e.id,e.parentId,e.title])),[['v3:cloudflare','redown','Cloudflare']]);
 const route=m.resolve('v3:cloudflare',c,[other,p],options);assert.equal(route.profile.id,'home');assert.equal(route.prefix,'');assert.equal(JSON.stringify(c),before);
});
test('additional deep labels and activated buckets are flat Cloudflare siblings, default first',()=>{
 const m=domain(),p=profile(),b=profile('other','a','Other Bucket'),c={...config([target(p)]),activatedBuckets:{buckets:[{...target(p,'root','','REDOWN')},{...target(b,'other','','Other Bucket')}]}};
 const plan=m.project(c,[p,b],options);assert.deepEqual(Array.from(plan.entries,e=>e.title),['Cloudflare','REDOWN','Photography','Other Bucket']);
 assert.ok(plan.entries.slice(1).every(e=>e.parentId==='v3:cloudflare'));assert.ok(!plan.entries.some(e=>e.title==='Buckets'));assert.equal(m.resolve('v3:cloudflare',c,[p,b],options),null);
 assert.equal(m.resolve('v3:cloudflare-default',c,[p,b],options).prefix,'');assert.equal(m.resolve('v3:custom',c,[p,b],options).prefix,'photos/2026/final');
 c.destinations=[];c.activatedBuckets.buckets=[c.activatedBuckets.buckets[0]];assert.equal(m.project(c,[p,b],options).entries.length,1);
});
test('ambiguous accounts never guess the default; explicit account binds exact redown root',()=>{
 const m=domain(),a=profile(),b=profile('b','b'),c=config([]);
 assert.equal(m.resolve('v3:cloudflare',c,[a,b],options),null);assert.equal(m.project(c,[a,b],options).entries[0].id,'v3:cloudflare-setup');
 c.defaultBucket={profileId:'b',accountId:'b',bucketName:'redown'};assert.equal(m.resolve('v3:cloudflare',c,[a,b],options).profile.id,'b');
 b.token='';assert.equal(m.resolve('v3:cloudflare',c,[a,b],options),null);
});
test('labels and duplicates never change physical routing and do not delete saved records',()=>{
 const m=domain(),p=profile(),c=config([target(p,'one','one','Same'),target(p,'two','two','Same')]),before=JSON.stringify(c);
 const plan=m.project(c,[p],options);assert.equal(new Set(plan.entries.map(e=>e.title)).size,plan.entries.length);
 assert.equal(m.resolve('v3:one',c,[p],options).prefix,'one');assert.equal(m.resolve('v3:two',c,[p],options).prefix,'two');assert.equal(JSON.stringify(c),before);
});
test('native registered Simple menu contains only Cloudflare and actual click retains verified root receipt',async()=>{
 const p=profile(),local={profiles:[p],rightClickV3:config([]),rightClickV3Migration:{version:1},rightClickV3Presentation:options,betaExplorerLocation:{bucketName:'wrong'}};
 const h=worker(local);await h.ready();assert.deepEqual([...h.native.values()].map(e=>e.title),['REDOWN','Cloudflare']);
 let used;const history=[];h.context.ingestCloudflareAtPrefix=async(p,url,prefix,name,receipt)=>{used={id:p.id,bucket:p.bucketName,prefix};receipt.destination={accountId:p.accountId,bucketName:p.bucketName,key:'file.bin'};receipt.bytes=4;return 'local fixture';};
 h.context.callBucketWorker=async()=>({object:{key:'file.bin',size:4,etag:'etag',customMetadata:{sourceUrl:'https://source.invalid/file.bin'}}});h.context.recordTransfer=async r=>history.push(r);h.context.notify=async()=>{};
 await h.chrome.contextMenus.onClicked.listeners[0]({menuItemId:'v3:cloudflare',linkUrl:'https://source.invalid/file.bin'},{});
 assert.deepEqual(used,{id:'home',bucket:'redown',prefix:''});assert.equal(history[0].verified,true);
});
test('global and tab launch warnings clear without touching valid progress badges or transfer titles',async()=>{
 const appearance={title:'Chrome accepted the Shelf request; local readiness is unconfirmed. No second panel was opened.',badge:'!',tabTitles:new Map([[1,'REDOWN Shelf could not open.']]),tabBadges:new Map([[1,'!'],[2,'42']])};
 const h=worker(undefined,{appearance});h.openTabs.push({id:2,windowId:8,active:true});await h.ready();await h.context.RedownToolbarAppearance.clean({allTabs:true});
 assert.equal(appearance.title,'REDOWN — Your cloud companion');assert.equal(appearance.tabTitles.get(1),appearance.title);assert.equal(appearance.badge,'');assert.equal(appearance.tabBadges.get(1),'');assert.equal(appearance.tabBadges.get(2),'42');
 appearance.title='REDOWN · Transfer complete';await h.context.RedownToolbarAppearance.clean({allTabs:true});assert.equal(appearance.title,'REDOWN · Transfer complete');
 await h.context.RedownToolbarAppearance.feedbackTitle('REDOWN — Your cloud companion');assert.equal(appearance.tabTitles.get(1),'REDOWN — Your cloud companion');
});
test('accepted unknown readiness and late Shelf success retain clean branding and never open a second surface',async()=>{
 const h=worker();await h.ready();h.chrome.runtime.getContexts=async()=>[];
 await h.context.openToolbarInterface({id:1,windowId:7});await h.ready();assert.ok(h.local.entryPointEvidence.some(e=>e.code==='SHELF_READINESS_UNKNOWN'));
 delete h.chrome.runtime.getContexts;let done;h.chrome.sidePanel.open=()=>new Promise(r=>{done=r;});const pending=h.context.openToolbarInterface({id:1,windowId:7});await new Promise(r=>setTimeout(r,45));done();await pending;await h.context.RedownToolbarAppearance.clean({allTabs:true});
 assert.equal(h.appearance.title,'REDOWN — Your cloud companion');assert.equal(h.appearance.badge,'');assert.ok(!h.calls.some(c=>c[0]==='badge'&&c[1].text==='!'));assert.ok(!h.calls.some(c=>['attached','tab','window'].includes(c[0])));
 assert.ok(h.local.entryPointEvidence.some(e=>e.code==='SHELF_API_ACCEPTED'));
});
