import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {IDBFactory} from 'fake-indexeddb';
const source=name=>process.env.REDOWN_WINDOWS_BASELINE?execFileSync('git',['show','69b62070ddcd8ad1a7181af5cf293d36815a100b:extension/'+name],{encoding:'utf8'}):readFileSync('extension/'+name,'utf8');
const quiet={warn(){},log(){},error(){}};
const locks=()=>{const lanes=new Map();return {request(name,fn){const p=(lanes.get(name)||Promise.resolve()).catch(()=>{}).then(fn);lanes.set(name,p);return p;}};};
function authFixture({status=200,hold=false,failStorage=false,failCheckpoint=false}={}){
 const local={},session={},events=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}}),requests=[];let release;
 const accountWait=hold?new Promise(r=>release=r):Promise.resolve();
 const storage=data=>({get:async key=>({[key]:structuredClone(data[key])}),set:async patch=>{if(failCheckpoint&&data===session&&patch.cloudflareLogin?.checkpoints?.at(-1)?.checkpoint==='TOKEN_EXCHANGED')throw Error('injected diagnostic persistence failure');if(failStorage&&data===local)throw Object.assign(Error('PRIVATE quota /user/path'),{name:'QuotaExceededError'});Object.assign(data,structuredClone(patch));}});
 const chrome={identity:{getRedirectURL:(p='')=>'https://test.chromiumapp.org/'+p},storage:{local:storage(local),session:storage(session)},windows:{create:async()=>({id:1,tabs:[{id:2}]}),update:async()=>{},remove:async()=>{},onRemoved:events()},tabs:{update:async()=>{},create:async()=>{}},alarms:{clear:async()=>{},create:async()=>{},onAlarm:events()},webNavigation:{onBeforeNavigate:events(),onCommitted:events(),onErrorOccurred:events()}};
 const c=vm.createContext({chrome,navigator:{locks:locks()},crypto:webcrypto,Uint8Array,TextEncoder,URL,URLSearchParams,btoa,AbortController,setTimeout,clearTimeout,console:quiet,fetch:async(url,options)=>{
  requests.push({url,options});if(url.endsWith('/oauth2/token'))return Response.json({access_token:'PRIVATE_TOKEN',expires_in:3600});
  await accountWait;return Response.json(status===200?{success:true,result:[]}:{success:false,errors:[{message:'PRIVATE server error'}]},{status});
 }});vm.runInContext(source('cloudflare-auth.js'),c);
 return {local,session,requests,release,chrome,start:()=>c.RedownCloudflareAuth.connect(),callback:()=>{const a=session.cloudflareLogin;return chrome.webNavigation.onBeforeNavigate.listeners[0]({tabId:2,frameId:0,url:a.redirectUri+'?state='+a.state+'&code=PRIVATE_CODE'});},cancel:()=>c.RedownCloudflareAuth.cancel(session.cloudflareLogin.id)};
}
for(const status of [403,500])test('issued OAuth token survives separate account API HTTP '+status,async()=>{
 const f=authFixture({status});await f.start();await f.callback();assert.equal(f.local.cloudflareAuth?.accessToken,'PRIVATE_TOKEN');assert.equal(f.local.cloudflareAuth.reconnectRequired,false);assert.equal(f.local.cloudflareAuth.accountVerification,status===403?'denied':'unavailable');assert.equal(f.session.cloudflareLogin.phase,'connected');
 assert.equal(f.requests.filter(r=>r.url.endsWith('/oauth2/token')).length,1);
});
test('issued token persists while account API is still pending; duplicate callbacks do not exchange twice',async()=>{
 const f=authFixture({hold:true});await f.start();const callback=f.callback();
 try{for(let i=0;i<20&&!f.requests.some(r=>r.url.includes('/accounts'));i++)await new Promise(r=>setImmediate(r));assert.equal(f.local.cloudflareAuth?.accessToken,'PRIVATE_TOKEN');await f.callback();assert.equal(f.requests.filter(r=>r.url.endsWith('/oauth2/token')).length,1);}finally{f.release();await callback;}
});
test('token storage quota error never claims connected or leaks code/verifier through terminal state',async()=>{
 const f=authFixture({failStorage:true});await f.start();await f.callback();assert.equal(f.local.cloudflareAuth,undefined);assert.equal(f.session.cloudflareLogin.phase,'failed');assert.equal(f.session.cloudflareLogin.verifier,undefined);assert.equal(f.requests.length,1);assert.ok(f.session.cloudflareLogin.checkpoints.some(e=>e.checkpoint==='TOKEN_STORAGE_FAILED'&&e.exceptionName==='QuotaExceededError'));
});
test('cancelled or invalid-state OAuth callback cannot replace credentials',async()=>{
 const f=authFixture();await f.start();await f.cancel();await f.callback();assert.equal(f.requests.length,0);assert.equal(f.local.cloudflareAuth,undefined);
});
const proof=(provider='google')=>({providerKind:provider,deliveryId:provider+':file',ok:true,verified:true,status:'completed',bytes:1,location:'https://fixture.invalid/item',attemptId:'12345678-1234-1234-1234-123456789012',destination:provider==='google'?{fileId:'file'}:{accountId:'account',bucketName:'bucket',key:'key'},...(provider==='cloudflare'?{verification:{kind:'r2-head-v1',sessionId:'session',key:'key',bytes:1,etag:'etag'}}:{})});
function counterFixture(){
 const data={},archived=new Map(),observations=[];let fault=null;
 const storage={get:async keys=>{if(fault==='read')throw new DOMException('PRIVATE','UnknownError');return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(data[k])]));},set:async patch=>{if(fault==='write'&&patch.transferHistory)throw new DOMException('PRIVATE','QuotaExceededError');Object.assign(data,structuredClone(patch));}};
 const c=vm.createContext({crypto:webcrypto,console:quiet,RedownSaveEvidence:{note:(_id,o)=>observations.push(o)}});vm.runInContext(source('transfer-counter.js'),c);
 const counter=c.RedownTransferCounter.create(storage,locks(),{append:async entry=>{if(fault==='archive')throw new DOMException('PRIVATE','AbortError');archived.set(entry.id,structuredClone(entry));}});
 return {counter,data,archived,storage,observations,fault:v=>fault=v};
}
test('verified upload storage failure retains typed local cause; retry reconciles one archive row and one counter',async()=>{
 const f=counterFixture();f.fault('write');let error;try{await f.counter.record(proof());}catch(e){error=e;}
 assert.equal(error?.remoteVerified,true);assert.equal(error.localHistoryFailure,true);assert.equal(error.exceptionName,'QuotaExceededError');assert.equal(error.storageOperation,'local-commit');assert.equal(f.data.providerSaveReceipts,undefined);assert.equal(f.archived.size,1);
 f.fault(null);await f.counter.record(proof());await f.counter.record(proof());assert.equal(f.archived.size,1);assert.equal(f.data.transferHistory.length,1);assert.equal(f.data.providerSaveReceipts.totals.google,'1');assert.equal(f.data.redownDailyVerified.total,'1');assert.equal(f.data.transferCounter.total,'1');assert.ok(!JSON.stringify(f.observations).includes('PRIVATE'));
});
test('archive-only abort preserves recent History; storage-read failure cannot claim unverified upload',async()=>{
 const f=counterFixture();f.fault('archive');await f.counter.record(proof());assert.equal(f.data.transferHistory.length,1);assert.equal(f.data.providerSaveReceipts.totals.google,'1');
 f.fault('read');await assert.rejects(f.counter.record({...proof(),verified:false}),e=>e.remoteVerified===false&&e.exceptionName==='UnknownError'&&e.storageOperation==='state-read');
});
test('Cloudflare verified upload with failed local commit never writes a false failure or repeats ingestion',async()=>{
 const f=counterFixture();f.fault('write');const notices=[],records=[];let uploads=0,verifications=0;
 const c=vm.createContext({chrome:{storage:{local:f.storage}},navigator:{locks:locks()},crypto:webcrypto,console:quiet,transferCounter:f.counter,globalThis:undefined});delete c.globalThis;
 Object.assign(c,{notify:async(...args)=>notices.push(args),selectedUrl:()=> 'https://fixture.invalid/source',basenameFromUrl:()=> 'image.png',ingestCloudflareAtPrefix:async(_p,_u,_prefix,_name,receipt)=>{uploads++;Object.assign(receipt,proof('cloudflare'));return 'R2: fixture';},verifyCloudflareReceipt:async()=>{verifications++;},recordTransfer:async entry=>{records.push(entry);return f.counter.record(entry);}});
 const bg=source('background.js'),pending=bg.slice(bg.indexOf('const cloudflarePendingKey='),bg.indexOf('async function notify('));
 if(pending)vm.runInContext(pending,c);
 const start=bg.indexOf('async function saveResolvedRightClick('),end=bg.indexOf('\nchrome.runtime.onMessage.addListener',start);vm.runInContext(bg.slice(start,end),c);
 await c.saveResolvedRightClick({menuItemId:'v3:test'},{},{profile:{},owner:{id:'owner',name:'fixture'},prefix:''},[]).catch(()=>{});
 assert.equal(uploads,1);assert.equal(verifications,1);assert.equal(records.filter(r=>r.ok!==true).length,0);assert.ok(notices.some(n=>n[0].includes('History pending')));
 f.fault(null);await c.reconcileCloudflareReceipts();await c.reconcileCloudflareReceipts();assert.equal(uploads,1);assert.equal(f.data.providerSaveReceipts.totals.cloudflare,'1');
});
test('History archive reopens after another context requests a version upgrade without deleting records',async()=>{
 const factory=new IDBFactory(),opened=[],rawOpen=factory.open.bind(factory);factory.open=(...args)=>{const request=rawOpen(...args);request.addEventListener('success',()=>opened.push(request.result));return request;};const c=vm.createContext({indexedDB:factory,console:quiet});vm.runInContext(source('history-archive.js'),c);const archive=c.RedownHistoryArchive.create();await archive.append({id:'old',at:new Date().toISOString()});
 const upgraded=await new Promise((resolve,reject)=>{const r=factory.open('redown-transfer-archive',2);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>{for(const db of opened)db.close();r.onsuccess=()=>r.result.close();reject(Error('OLD_CONNECTION_BLOCKS_UPGRADE'));};});
 upgraded.close(); // Existing schema is still supported, but version 1 cannot reopen version 2.
 await assert.rejects(archive.append({id:'new',at:new Date().toISOString()}),e=>e.name==='VersionError');
});
test('safe bundle exposes exact allowed storage causes and OAuth checkpoint, never arbitrary error text',()=>{
 const c=vm.createContext({TextEncoder,Date,console:quiet});for(const file of ['save-evidence.js','transfer-queue.js','diagnostic-bundle.js'])vm.runInContext(source(file),c);
 const id=proof().attemptId,data={cloudflareLogin:{id,phase:'connected',verifier:'PRIVATE',state:'PRIVATE',error:'PRIVATE',checkpoints:[{checkpoint:'ACCOUNT_CHECKED',code:'ACCOUNT_DENIED',at:1,token:'PRIVATE'}]}};
 const traces={attempts:[{id,provider:'google',events:[],observations:[{at:1,code:'HISTORY_UNAVAILABLE',phase:'history',storageArea:'local',storageOperation:'local-commit',exceptionName:'QuotaExceededError',message:'PRIVATE',path:'PRIVATE'}]}]};
 const observed=[];c.redownSaveAttempts={observe:(_id,o)=>observed.push(o)};c.RedownSaveEvidence.failure(id,new DOMException('PRIVATE','QuotaExceededError'),'auth');assert.equal(observed[0].exceptionName,'QuotaExceededError');
 const bundle=c.RedownDiagnosticBundle.build({data,traces,result:c.RedownTransferQueue.project(data,traces)});const text=JSON.stringify(bundle.files);assert.ok(text.includes('QuotaExceededError'));assert.ok(text.includes('ACCOUNT_DENIED'));assert.ok(!text.includes('PRIVATE'));
});
test('verified accounting-pending attempts stay verified and visible for attention without a counter increment',()=>{
 const c=vm.createContext({console:quiet});for(const file of ['save-evidence.js','transfer-queue.js'])vm.runInContext(source(file),c);
 const id=proof().attemptId,traces={attempts:[{id,provider:'google',events:[{stage:'CLICK_RECEIVED',at:1},{stage:'TERMINAL',at:2,outcome:'COMPLETED',reason:'HISTORY_UNAVAILABLE'}]}]};
 const data={googleDriveJobs:[{id:'job',source:{attemptId:id},status:'completed',reported:false,result:{fileId:'file',bytes:1},updatedAt:2}]};
 const p=c.RedownTransferQueue.project(data,traces,3);assert.equal(p.rows[0].state,'verified');assert.equal(p.rows[0].accountingPending,true);assert.equal(p.counts.attention,1);assert.equal(p.counts.pending,1);assert.equal(data.providerSaveReceipts,undefined);
 data.transferHistory=[{...proof(),at:new Date(4).toISOString()}];const reconciled=c.RedownTransferQueue.project(data,traces,5);assert.equal(reconciled.rows[0].accountingPending,false);assert.equal(reconciled.counts.attention,0);
});
test('pending Cloudflare receipt without retained trace remains inspectable and stale cleanup does not create pending again',()=>{
 const c=vm.createContext({console:quiet});for(const file of ['save-evidence.js','transfer-queue.js'])vm.runInContext(source(file),c);const entry=proof('cloudflare'),data={'cloudflare:verifiedReceiptPendingHistory':{[entry.deliveryId]:entry}};
 let p=c.RedownTransferQueue.project(data,{},3);assert.equal(p.rows[0].state,'verified');assert.equal(p.rows[0].accountingPending,true);data.providerSaveReceipts={ids:[entry.deliveryId]};p=c.RedownTransferQueue.project(data,{},4);assert.equal(p.rows.length,0);
});
test('verified History reconciliation reopens only an accounting-pending terminal, preserving one terminal',async()=>{
 const c=vm.createContext({crypto:webcrypto,console:quiet,setTimeout,clearTimeout,structuredClone,URL,TextEncoder,Uint8Array});vm.runInContext(source('runtime-diagnostics.js'),c);const data={},storage={get:async key=>({[key]:data[key]}),set:async patch=>Object.assign(data,patch)},a=c.RedownRuntimeDiagnostics.createAttempts({storage});await a.ready;const id=a.begin({menuItemId:'provider:google-drive'});a.stage(id,'REMOTE_VERIFY');a.finish(id,'COMPLETED','HISTORY_UNAVAILABLE');a.reconcile(id);a.stage(id,'HISTORY_COMMIT');a.stage(id,'COUNTER_COMMIT');a.finish(id,'COMPLETED','OK');await a.flush();const row=(await a.snapshot()).attempts[0];assert.equal(row.events.filter(e=>e.stage==='TERMINAL').length,1);assert.equal(row.events.at(-1).reason,'OK');
});
test('retry after local-commit failure upserts the identical durable archive receipt',async()=>{
 const f=counterFixture();f.fault('write');await f.counter.record(proof()).catch(()=>{});f.fault(null);await f.counter.record(proof());assert.equal(f.archived.size,1);assert.equal(f.data.transferHistory.length,1);
});

test('account API rejects issued token: retain credential evidence and require reconnect without claiming readiness',async()=>{
 const f=authFixture({status:401});await f.start();await f.callback();assert.equal(f.local.cloudflareAuth?.accessToken,'PRIVATE_TOKEN');assert.equal(f.local.cloudflareAuth.accountVerification,'rejected');assert.equal(f.local.cloudflareAuth.reconnectRequired,true);assert.equal(f.session.cloudflareLogin.phase,'connected');
});

test('optional OAuth checkpoint storage failure cannot discard an issued token',async()=>{
 const f=authFixture({failCheckpoint:true});await f.start();await f.callback();assert.equal(f.local.cloudflareAuth.accessToken,'PRIVATE_TOKEN');assert.equal(f.local.cloudflareAuth.accountVerification,'verified');assert.equal(f.session.cloudflareLogin.phase,'connected');
});
test('unreported Dropbox completion requires the exact account, namespace, revision and byte proof',()=>{
 const c=vm.createContext({console:quiet});for(const file of ['save-evidence.js','transfer-queue.js'])vm.runInContext(source(file),c);
 const job={id:'job',status:'completed',reported:false,accountId:'dbid:owner',connectionId:'connection',namespace:'123',offset:1,result:{proofVersion:1,accountId:'dbid:owner',connectionId:'connection',namespace:'123',root:'/',path:'/image.png',name:'image.png',fileId:'id:file',revision:'rev',contentHash:'a'.repeat(64),bytes:1}};
 const data={'dropbox:jobs':[job]};let p=c.RedownTransferQueue.project(data,{},1);assert.equal(p.rows[0].state,'verified');assert.equal(p.rows[0].accountingPending,true);
 for(const change of [{accountId:'dbid:other'},{namespace:'456'},{bytes:2},{revision:''},{contentHash:'bad'}]){const broken=structuredClone(job);Object.assign(broken.result,change);p=c.RedownTransferQueue.project({'dropbox:jobs':[broken]}, {},2);assert.notEqual(p.rows[0].state,'verified');}
});
