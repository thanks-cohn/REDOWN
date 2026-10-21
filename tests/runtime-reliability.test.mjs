import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createRuntimeDiagnostics,inspectBundle} from '../agent/runtime/api.mjs';
import '../extension/search-session.js';
const apiSource=await readFile(new URL('../extension/cloudflare-api.js',import.meta.url),'utf8');
function authHarness(fetch){
 const state={cloudflareAuth:{accessToken:'old',refreshToken:'refresh',expiresAt:Date.now()+3600000,sessionId:'original'}};
 const c=vm.createContext({fetch,Headers,FormData,AbortSignal,URLSearchParams,Date,setTimeout,chrome:{storage:{local:{get:async()=>structuredClone(state),set:async p=>Object.assign(state,p)}}},navigator:{locks:{request:async(n,fn)=>fn()}}});
 vm.runInContext(apiSource,c);return {api:c.RedownCloudflareApi,state};
}
test('read retry never crosses a newly authorized session',async()=>{
 let calls=0;let h;h=authHarness(async()=>{calls++;h.state.cloudflareAuth={accessToken:'other',refreshToken:'other-refresh',sessionId:'other',expiresAt:Date.now()+3600000};return new Response('',{status:401});});
 await assert.rejects(h.api.request('/accounts/original/r2/buckets'),/connection changed/i);assert.equal(calls,1);
});
test('safe reads honor bounded Retry-After; writes are never replayed on 503',async()=>{
 let calls=0;const h=authHarness(async()=>++calls===1?new Response('',{status:429,headers:{'retry-after':'0'}}):new Response('ok'));
 assert.equal((await h.api.request('/accounts')).status,200);assert.equal(calls,2);
 calls=0;const w=authHarness(async()=>{calls++;return new Response('',{status:503});});assert.equal((await w.api.request('/objects',{method:'PUT',body:'data'})).status,503);assert.equal(calls,1);
});
test('diagnostic exports are bounded, credential-free, disabled by default and rotate',()=>{
 let time=0;const d=createRuntimeDiagnostics({now:()=>time});d.record({operation:'api.read'});assert.equal(d.query('listTraces').data.events.length,0);
 d.setEnabled(true);for(let i=0;i<400;i++)d.record({operation:'api.read',code:'OK',outcome:'success',url:'https://private.invalid/token',token:'SECRET',key:'private-name'});
 const bundle=d.query('exportSupport').data;assert.equal(bundle.events.length,256);assert.ok(JSON.stringify(bundle).length<196608);assert.doesNotMatch(JSON.stringify(bundle),/SECRET|private-name|private.invalid/);
 assert.equal(d.query('listTraces',{limit:101}).data.code,'INVALID_INPUT');assert.equal(d.query('executeShell').state,'unsupported');
 assert.equal(inspectBundle(bundle).query('exportSupport').data.events.length,256);time=86400001;assert.equal(d.query('listTraces').data.events.length,0);
 d.setEnabled(false);assert.equal(d.query('snapshot').state,'unavailable');
});
test('pull search renders early pages, retains partial matches and retries failed targets',async()=>{
 let bad=true;const engine=RedownSearchSessions.create({score:(q,k)=>k.includes(q)?1:-1,listPage:async(a,b,p,c)=>{if(b==='bad'&&bad)throw Error('private response');return {objects:[{key:c?'deep/photo.jpg':'photo.jpg'}],cursor:b==='good'&&!c?'next':''};}});
 const start=engine.start([{accountId:'a',bucketName:'good'},{accountId:'b',bucketName:'bad'}],'photo');const first=await engine.step(start.sessionId);
 assert.equal(first.state,'scanning');assert.equal(first.matches,1);assert.equal(first.errors.length,1);
 const second=await engine.step(start.sessionId);assert.equal(second.state,'partial');assert.equal(second.matches,2);assert.deepEqual(second.results.slice(0,1),first.results);
 bad=false;engine.retry(start.sessionId);const final=await engine.step(start.sessionId);assert.equal(final.state,'complete');assert.equal(final.matches,3);assert.equal(final.results[2].accountId,'b');
});
test('cancel suppresses in-flight results and a restarted adapter reports interrupted',async()=>{
 let release;const engine=RedownSearchSessions.create({score:()=>1,listPage:()=>new Promise(r=>release=r)});const s=engine.start([{accountId:'a',bucketName:'b'}],'x');const pending=engine.step(s.sessionId);engine.cancel(s.sessionId);release({objects:[{key:'x'}],cursor:''});assert.equal((await pending).matches,0);assert.equal(engine.snapshot(s.sessionId).state,'cancelled');
 const restarted=RedownSearchSessions.create({score:()=>1,listPage:async()=>({objects:[]})});assert.throws(()=>restarted.snapshot(s.sessionId),/SEARCH_INTERRUPTED/);
});
test('search detects repeated cursor and exposes result cap instead of silent truncation',async()=>{
 const engine=RedownSearchSessions.create({score:()=>1,listPage:async()=>({objects:[{key:'x'}],cursor:'same'})});const s=engine.start([{accountId:'a',bucketName:'b'}],'x');await engine.step(s.sessionId);const final=await engine.step(s.sessionId);assert.equal(final.state,'partial');assert.equal(final.errors[0].code,'REPEATED_CURSOR');
 const capped=RedownSearchSessions.create({score:()=>1,listPage:async()=>({objects:Array.from({length:3000},(_,i)=>({key:`photo-${i}`})),cursor:''})});const c=capped.start([{accountId:'a',bucketName:'b'}],'photo');const limited=await capped.step(c.sessionId);assert.equal(limited.state,'limited');assert.equal(limited.matches,2000);
});
test('malformed successful listings cannot masquerade as empty buckets',async()=>{
 const source=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
 const context=vm.createContext({URLSearchParams,cfFetch:async()=>new Response('<html>outage</html>'),cloudflareErrorMessage:()=>'',chrome:{storage:{local:{get:async()=>({})}}}});
 vm.runInContext(source.slice(source.indexOf('async function listObjectsPage('),source.indexOf('\nasync function listObjects(',source.indexOf('async function listObjectsPage('))),context);
 await assert.rejects(context.listObjectsPage('a','b'),/unreadable listing/);
 context.cfFetch=async()=>Response.json({success:true,result:{objects:[]}});assert.equal((await context.listObjectsPage('a','b')).objects.length,0);
});
test('progressive UI retains selection, emits early results and rejects late query responses',async()=>{
 const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');const frames=[],nodes={'workspace-objects':{innerHTML:''},'explorer-status':{textContent:''}};
 let release,step=0;const c=vm.createContext({setTimeout,clearTimeout,document:{activeElement:null},$:id=>nodes[id],explorerSearchRequestId:0,explorerSearchSessionId:'',explorerSearchState:'idle',explorerSearchActive:false,explorerSelected:new Set(),explorerPage:0,explorerAnchor:0,explorerNextCursor:'',explorerItems:[],workspaceTarget:{},explorerInventoryErrors:new Map(),explorerSearchTargets:()=>[],fileKind:()=>'',itemDate:()=>null,accountName:()=>'',renderFileItems:()=>frames.push(c.explorerItems.slice()),send:async m=>{
 if(m.type==='cfSearchStart')return {ok:true,search:{sessionId:'session',state:'scanning'}};
 if(m.type==='cfSearchCancel')return {ok:true};
 if(++step===1)return {ok:true,search:{sessionId:'session',state:'scanning',examined:1,completed:0,total:1,matches:1,errors:[],results:[{key:'one.jpg',accountId:'a',bucketName:'b'}]}};
 return new Promise(r=>release=r);
 }});
 vm.runInContext(source.slice(source.indexOf('async function runExplorerSearch('),source.indexOf('\nfunction scheduleExplorerSearch()',source.indexOf('async function runExplorerSearch('))),c);
 const running=c.runExplorerSearch('jpg');for(let i=0;i<20&&!release;i++)await new Promise(r=>setTimeout(r,1));
 assert.equal(frames.length,1);assert.equal(frames[0][0].key,'one.jpg');c.explorerSelected.add(frames[0][0].id);c.explorerSearchRequestId++;
 release({ok:true,search:{sessionId:'session',state:'complete',results:[{key:'late.jpg'}]}});await running;assert.equal(frames.length,1);assert.equal(c.explorerSelected.size,1);
});
test('local upload does not replay an ambiguous write or write after an unknown preflight',async()=>{
 const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
 for(const preflight of ['no','unknown (lookup failed)']){
 let writes=0,ticks=0;const status={};const c=vm.createContext({Date:{now:()=>Date.now()+(ticks++)*60000},Math,setTimeout:fn=>{fn();},uploadTarget:()=>({accountId:'a',bucketName:'b'}),uploadProfile:()=>null,$:id=>id==='local-prefix'?{value:''}:status,inspectLocalUploadObject:async()=>preflight,RedownCloudflareApi:{request:async()=>{writes++;throw Error('transport interrupted after write');}},send:async()=>({ok:false}),categoryFromPrefix:()=>'',renderHistory:async()=>{},workspaceTarget:null});
 vm.runInContext(source.slice(source.indexOf('async function uploadLocalFiles('),source.indexOf('\nfunction ',source.indexOf('async function uploadLocalFiles('))),c);
 await c.uploadLocalFiles([{name:'benign.txt',size:4,type:'text/plain'}]);assert.equal(writes,preflight==='no'?1:0);assert.equal(status.className,'status bad');assert.doesNotMatch(status.textContent,/1 uploaded/);
 }
});
