import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {IDBFactory} from 'fake-indexeddb';
import {JSDOM} from 'jsdom';
import {unzipSync,strFromU8} from 'fflate';
import {worker} from './helpers/background-worker.mjs';
const load=(c,name)=>vm.runInContext(readFileSync('extension/'+name,'utf8'),c);
function fixture({limits,database=new IDBFactory(),local={},clock={now:1000000}}={}){
 const storage={get:async k=>({[k]:structuredClone(local[k])}),set:async p=>Object.assign(local,structuredClone(p))};
 const c=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,structuredClone,setTimeout,clearTimeout,console:{warn(){}},URL});
 for(const name of ['forensic-diagnostics.js','save-evidence.js','runtime-diagnostics.js'])load(c,name);
 const ledger=c.RedownForensicDiagnostics.create({database,healthStorage:storage,limits,now:()=>clock.now});c.redownForensicLedger=ledger;
 return {c,ledger,storage,local,database,clock};
}
const literal={sourceUrl:'https://cdn.private.invalid/private/a%2Fb.jpg?sig=RAW_SIGNED&x=1#literal',pageUrl:'https://site.private.invalid/private/page?session=RAW_PAGE',srcUrl:'https://cdn.private.invalid/private/a%2Fb.jpg?sig=RAW_SIGNED&x=1#literal',linkUrl:'https://link.private.invalid/f?token=RAW_LINK'};
function seed(f,id=webcrypto.randomUUID()){
 f.ledger.record(id,'click',{...literal,provider:'dropbox',stage:'CLICK_RECEIVED',filename:'RAW_FILENAME.jpg',menuItemId:'RAW_ROUTE',accessToken:'NEVER_TOKEN',cookies:'NEVER_COOKIE',password:'NEVER_PASSWORD'});
 f.ledger.record(id,'route',{destination:{accountId:'RAW_ACCOUNT',bucketName:'RAW_BUCKET',prefix:'RAW_PREFIX',key:'RAW_KEY',token:'NEVER_TOKEN'}});
 f.ledger.record(id,'error',{phase:'source',component:'source',error:Object.assign(new Error('RAW_ERROR https://source.invalid/signed?token=RAW_ERROR_URL'),{code:'SOURCE_HTTP_ERROR',stack:'RAW_STACK'}),headers:{authorization:'NEVER_AUTH','set-cookie':'NEVER_COOKIE','content-type':'image/jpeg'}});
 return id;
}
test('default capture precedes async storage, records full literal data and terminals with Debug/Options absent',async()=>{
 const f=fixture();const trace=f.c.RedownRuntimeDiagnostics.createAttempts({storage:f.storage,now:()=>f.clock.now});f.c.redownSaveAttempts=trace;await trace.ready;
 const id=trace.begin({menuItemId:'provider:dropbox',srcUrl:literal.sourceUrl,pageUrl:literal.pageUrl,linkUrl:literal.linkUrl,mediaType:'image'});
 assert.equal(typeof id,'string');f.clock.now+=50;trace.stage(id,'SOURCE_REQUEST');f.c.RedownSaveEvidence.failure(id,new Error('RAW_ERROR'),'source');trace.finish(id,'FAILED','PROVIDER_FAILED');await f.ledger.flush();
 const snapshot=await f.ledger.snapshot();assert.equal(snapshot.collection,'automatic-by-default');assert.equal(snapshot.records[0].data.sourceUrl,literal.sourceUrl);assert.equal(snapshot.records[0].data.pageUrl,literal.pageUrl);assert.ok(snapshot.records.some(r=>r.data.outcome==='FAILED'));assert.equal(snapshot.records.find(r=>r.data.stage==='SOURCE_REQUEST').data.durationMs,50);assert.ok(snapshot.records.some(r=>r.data.error?.message==='RAW_ERROR'));assert.ok(snapshot.records.every(r=>r.attemptId===id));
 await trace.flush();assert.doesNotMatch(JSON.stringify(f.local.redownSaveAttempts),/RAW_ERROR|RAW_SIGNED|RAW_PAGE|private.invalid/);
});
test('RAW is exact, SECURE is an independent correlated projection; neither export mutates raw storage',async()=>{
 const f=fixture(),id=seed(f);await f.ledger.flush();const snapshot=await f.ledger.snapshot(),before=JSON.stringify(snapshot);
 const raw=await f.c.RedownForensicDiagnostics.build(snapshot,'RAW'),secure=await f.c.RedownForensicDiagnostics.build(snapshot,'SECURE'),secureAgain=await f.c.RedownForensicDiagnostics.build(snapshot,'SECURE');
 const rawText=raw.files['forensics.json'],secureText=secure.files['forensics.json'];for(const secret of ['RAW_SIGNED','RAW_PAGE','RAW_LINK','RAW_ACCOUNT','RAW_BUCKET','RAW_PREFIX','RAW_KEY','RAW_FILENAME','RAW_ERROR','RAW_STACK'])assert.ok(rawText.includes(secret),secret);
 assert.doesNotMatch(rawText,/NEVER_TOKEN|NEVER_COOKIE|NEVER_PASSWORD|NEVER_AUTH/);assert.doesNotMatch(secureText,/RAW_|private.invalid|https?:|correlationKey/);assert.ok(secureText.includes(id));assert.equal(secureText,secureAgain.files['forensics.json']);assert.equal(JSON.stringify(snapshot),before);assert.equal(JSON.stringify(await f.ledger.snapshot()),before);assert.ok(!rawText.includes(snapshot.correlationKey));
 const data=JSON.parse(secureText).records;assert.match(data[0].data.sourceId,/^[a-f0-9]{64}$/);assert.equal(data[2].data.component,'source');assert.equal(data[2].data.code,'SOURCE_HTTP_ERROR');
});
test('save-only HTTP metadata includes observed final/redirect URL and allowed headers but never bodies or credentials',async()=>{
 const f=fixture(),id=webcrypto.randomUUID();let bodyReads=0;
 const response={status:403,statusText:'RAW_HTTP_ERROR',url:'https://private.invalid/final?secret=RAW_FINAL',redirected:true,type:'cors',headers:new Headers({'content-type':'text/html',location:'https://private.invalid/next?sig=RAW_REDIRECT',authorization:'NEVER_AUTH','set-cookie':'NEVER_COOKIE'}),text(){bodyReads++;throw Error('body forbidden');}};
 f.c.RedownForensicDiagnostics.response(undefined,response);f.c.RedownForensicDiagnostics.response(id,response);await f.ledger.flush();const snapshot=await f.ledger.snapshot();assert.equal(snapshot.records.length,1);assert.equal(bodyReads,0);assert.equal(snapshot.records[0].data.finalUrl,response.url);assert.equal(snapshot.records[0].data.headers.location,response.headers.get('location'));
 const secure=JSON.parse((await f.c.RedownForensicDiagnostics.build(snapshot,'SECURE')).files['forensics.json']);assert.equal(secure.records[0].data.httpStatus,403);assert.equal(secure.records[0].data.redirected,true);assert.doesNotMatch(JSON.stringify(secure),/RAW_|private.invalid|NEVER_/);
});
test('restart appends to the same ledger with a new worker epoch and stable URL correlations',async()=>{
 const f=fixture(),id=seed(f);await f.ledger.flush();const old=await f.ledger.snapshot(),next=fixture({database:f.database,local:f.local,clock:f.clock});next.ledger.record(id,'stage',{stage:'TERMINAL',outcome:'FAILED'});await next.ledger.flush();const current=await next.ledger.snapshot();assert.equal(current.records.length,old.records.length+1);assert.notEqual(current.records[0].workerEpoch,current.records.at(-1).workerEpoch);assert.equal(current.correlationKey,old.correlationKey);
});
test('bounds count evictions, expiry and whole oversized events truthfully without truncating URLs',async()=>{
 const f=fixture({limits:{records:2,eventBytes:800,retentionMs:100}}),id=webcrypto.randomUUID();for(let n=0;n<3;n++)f.ledger.record(id,'stage',{stage:'SOURCE_REQUEST',size:n});await f.ledger.flush();let s=await f.ledger.snapshot();assert.equal(s.records.length,2);assert.equal(s.completeness.droppedRecords,1);
 f.ledger.record(id,'click',{sourceUrl:'https://private.invalid/'+ 'x'.repeat(2000)});await f.ledger.flush();s=await f.ledger.snapshot();assert.equal(s.completeness.oversizedRecords,1);assert.equal(s.completeness.droppedRecords,2);assert.ok(!JSON.stringify(s.records).includes('private.invalid'));
 f.clock.now+=101;s=await f.ledger.snapshot();assert.equal(s.records.length,0);assert.equal(s.completeness.expiredRecords,2);assert.equal(s.completeness.droppedRecords,4);
});
test('queue shedding and unavailable storage do not throw into saves; health remains explicit',async()=>{
 const f=fixture({limits:{queue:1}}),id=webcrypto.randomUUID();f.ledger.record(id,'stage',{stage:'ADMITTED'});f.ledger.record(id,'stage',{stage:'PROVIDER_WRITE'});await f.ledger.flush();const s=await f.ledger.snapshot();assert.equal(s.completeness.droppedRecords,1);assert.equal(s.completeness.storageFailureCount,0);
 const broken=fixture({database:null});assert.doesNotThrow(()=>broken.ledger.record(id,'click',literal));await broken.ledger.flush();assert.equal(broken.ledger.health.failed,1);assert.equal(broken.local.redownForensicHealthV1.storageFailure,true);await assert.rejects(broken.ledger.snapshot());assert.equal(broken.local.transferHistory,undefined);
});
test('old redacted events remain separate, missing raw fields are not_recorded, never reconstructed',async()=>{
 const f=fixture(),id=webcrypto.randomUUID();const legacy=[{id,provider:'google',sourceId:'OPAQUE_ONLY',events:[{stage:'TERMINAL',at:1,outcome:'FAILED',secret:'NEVER'}]}];const snapshot=await f.ledger.snapshot();const raw=JSON.parse((await f.c.RedownForensicDiagnostics.build(snapshot,'RAW',legacy)).files['forensics.json']);assert.equal(raw.preexistingAttempts[0].sourceUrl,'not_recorded');assert.equal(raw.preexistingAttempts[0].pageUrl,'not_recorded');assert.doesNotMatch(JSON.stringify(raw),/OPAQUE_ONLY|NEVER/);assert.equal((await f.ledger.snapshot()).records.length,0);
});
test('exactly two buttons are added; every old button, handler file and old ZIP builder remain unchanged',()=>{
 const baseline='77c6c7d15917c75b939f79577aa26244101f354c',before=new JSDOM(execFileSync('git',['show',baseline+':extension/options.html'],{encoding:'utf8'})),after=new JSDOM(readFileSync('extension/options.html','utf8'));
 try{const old=[...before.window.document.querySelectorAll('button')],current=after.window.document;assert.deepEqual([...current.querySelectorAll('button')].filter(b=>!['forensic-export-raw','forensic-export-secure','capless-inspect','capless-export','capless-next-part','flight-inspect','flight-delete-incidents'].includes(b.id)).map(b=>b.outerHTML),old.map(b=>b.outerHTML));assert.equal(current.querySelectorAll('button').length,old.length+7);assert.equal(current.getElementById('forensic-export-raw').textContent,'Export All Diagnostic Data (RAW)');assert.equal(current.getElementById('forensic-export-secure').textContent,'Export Secure Diagnostic Data');
 const marker='// Explicit Debug Mode controls;';assert.equal(readFileSync('extension/options.js','utf8').split(marker)[1],execFileSync('git',['show',baseline+':extension/options.js'],{encoding:'utf8'}).split(marker)[1]);
 for(const file of ['diagnostic-download.js','diagnostic-bundle.js'])assert.equal(readFileSync('extension/'+file,'utf8'),execFileSync('git',['show',baseline+':extension/'+file],{encoding:'utf8'}));
 }finally{before.window.close();after.window.close();}
});
test('two export clicks are local ZIP downloads; RAW cancellation and old Clear traces leave ledger intact',async()=>{
 const f=fixture();seed(f);await f.ledger.flush();const before=JSON.stringify((await f.ledger.snapshot()).records),dom=new JSDOM('<button id="forensic-export-raw">RAW</button><button id="forensic-export-secure">SECURE</button><p id="forensic-export-status"></p>',{url:'https://extension.test/options.html',runScripts:'outside-only'}),w=dom.window,downloads=[];let approved=false,messages=0,confirmations=0;
 w.TextEncoder=TextEncoder;w.Uint8Array=Uint8Array;w.Blob=Blob;w.chrome={storage:{local:f.storage},runtime:{sendMessage(){messages++;throw Error('worker must stay asleep');}}};w.RedownForensicDiagnostics={...f.c.RedownForensicDiagnostics,create:()=>f.ledger};w.confirm=()=>{confirmations++;return approved;};w.URL.createObjectURL=blob=>{downloads.push({blob});return 'blob:fixture';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){downloads.at(-1).filename=this.download;};w.eval(readFileSync('extension/vendor/fflate.js','utf8'));w.eval(readFileSync('extension/forensic-download.js','utf8'));
 try{w.document.getElementById('forensic-export-raw').click();assert.equal(downloads.length,0);assert.equal(confirmations,1);approved=true;
 for(const id of ['forensic-export-raw','forensic-export-secure']){w.document.getElementById(id).click();for(let n=0;n<100&&w.document.getElementById(id).disabled;n++)await new Promise(r=>setTimeout(r,5));}
 assert.equal(downloads.length,2,w.document.getElementById('forensic-export-status').textContent);assert.equal(messages,0);assert.match(downloads[0].filename,/FORENSIC-RAW/);assert.match(downloads[1].filename,/FORENSIC-SECURE/);
 const texts=await Promise.all(downloads.map(async({blob})=>strFromU8(unzipSync(new Uint8Array(await blob.arrayBuffer()))['forensics.json'])));assert.ok(texts[0].includes('RAW_SIGNED'));assert.doesNotMatch(texts[1],/RAW_/);
 const runtime=f.c.RedownRuntimeDiagnostics.create();runtime.query('clear');assert.equal(JSON.stringify((await f.ledger.snapshot()).records),before);
 f.ledger.snapshot=async()=>{throw Error('private storage failure');};w.document.getElementById('forensic-export-secure').click();for(let n=0;n<40&&w.document.getElementById('forensic-export-secure').disabled;n++)await new Promise(r=>setTimeout(r,5));assert.equal(downloads.length,2);assert.match(w.document.getElementById('forensic-export-status').textContent,/storage is unavailable/);assert.equal(w.document.getElementById('forensic-export-secure').disabled,false);
 }finally{w.close();}
});

test('native save handler automatically captures route, exact source, verified receipt and accounting without extra transfer calls',async()=>{
 const h=worker();h.local.cloudflareAuth={accessToken:'NEVER_TOKEN',sessionId:'session',expiresAt:Date.now()+3600000};await h.ready();h.context.launchSaveDroplet=()=>{};h.context.notify=async()=>{};let writes=0,reads=0,extra=0;
 h.context.fetch=async()=>{extra++;throw Error('Unexpected network');};h.context.ingestCloudflareAtPrefix=async(p,url,prefix,name,receipt)=>{writes++;receipt.destination={accountId:p.accountId,bucketName:p.bucketName,key:prefix+'/image.png'};receipt.bytes=3;h.context.redownSaveAttempts.stage(receipt.attemptId,'PROVIDER_WRITE');return 'R2: fixture';};
 h.context.callBucketWorker=async(_p,r)=>{reads++;return {object:{key:r.key,size:3,etag:'observed-etag',customMetadata:{sourceUrl:literal.sourceUrl}}};};
 await h.chrome.contextMenus.onClicked.listeners[0]({menuItemId:'v3:one',srcUrl:literal.sourceUrl,pageUrl:literal.pageUrl},{});await h.context.redownForensicLedger.flush();
 const snapshot=await h.context.redownForensicLedger.snapshot();assert.equal(writes,1);assert.equal(reads,1);assert.equal(extra,0);assert.equal(h.local.transferCounter.total,'1');assert.equal(h.local.providerSaveReceipts.totals.cloudflare,'1');assert.equal(h.local.transferHistory.filter(e=>e.status==='completed').length,1);
 assert.equal(snapshot.records[0].data.sourceUrl,literal.sourceUrl);assert.ok(snapshot.records.some(r=>r.kind==='route'&&r.data.destination?.prefix==='saved'));assert.ok(snapshot.records.some(r=>r.kind==='receipt'&&r.data.verification?.kind==='r2-head-v1'&&r.data.verified===true));assert.ok(snapshot.records.some(r=>r.kind==='accounting'&&r.data.newVerified));assert.doesNotMatch(JSON.stringify(snapshot.records),/NEVER_TOKEN/);
});
test('stale fallback health after a restart does not count acknowledged dropped records twice',async()=>{
 const f=fixture({limits:{queue:1}}),id=webcrypto.randomUUID();f.ledger.record(id,'click',literal);f.ledger.record(id,'stage',{stage:'ADMITTED'});await f.ledger.flush();assert.equal((await f.ledger.snapshot()).completeness.droppedRecords,1);
 f.local.redownForensicHealthV1={pendingDropped:1,pendingFailures:0};const restarted=fixture({database:f.database,local:f.local,clock:f.clock});assert.equal((await restarted.ledger.snapshot()).completeness.droppedRecords,1);restarted.ledger.record(id,'stage',{stage:'TERMINAL',outcome:'FAILED'});await restarted.ledger.flush();assert.equal((await restarted.ledger.snapshot()).completeness.droppedRecords,1);
});
test('byte budget sheds whole events and read exports accurately flag missing evidence',async()=>{
 const f=fixture({limits:{bytes:100,records:100}});f.ledger.record(webcrypto.randomUUID(),'click',literal);await f.ledger.flush();const s=await f.ledger.snapshot();assert.equal(s.records.length,0);assert.equal(s.completeness.droppedRecords,1);assert.equal(s.completeness.state,'partial');
});
