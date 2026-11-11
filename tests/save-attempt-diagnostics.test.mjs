import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,writeFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {worker} from './helpers/background-worker.mjs';
const load=c=>vm.runInContext(readFileSync('extension/runtime-diagnostics.js','utf8'),c);
function collector(local={},fail=false){
 const warnings=[];const c=vm.createContext({crypto:webcrypto,structuredClone,setTimeout,clearTimeout,console:{warn:x=>warnings.push(x)}});load(c);
 const storage={get:async k=>{if(fail)throw Error('private token URL');return {[k]:structuredClone(local[k])};},set:async p=>{if(fail)throw Error('private filename');Object.assign(local,structuredClone(p));}};
 return {trace:c.RedownRuntimeDiagnostics.createAttempts({storage,timeoutMs:10}),warnings,local};
}
test('last 100 redacted attempts are bounded, restart-safe, enum-filtered and nonblocking on storage loss',async()=>{
 const f=collector();await f.trace.ready;
 for(let i=0;i<120;i++){const id=f.trace.begin({menuItemId:'provider:google-drive',srcUrl:'https://private.invalid/secret?token=SECRET'});f.trace.stage(id,'PROVIDER_WRITE',{accountId:'SECRET',reason:'SECRET'});f.trace.finish(id,'FAILED','PROVIDER_FAILED');}
 await f.trace.flush();const snapshot=await f.trace.snapshot();assert.equal(snapshot.attempts.length,100);assert.doesNotMatch(JSON.stringify(snapshot),/SECRET|private.invalid|accountId/);
 const id=f.trace.begin({menuItemId:'provider:dropbox'});await f.trace.flush();
 const restarted=collector(f.local);await restarted.trace.ready;
 assert.equal((await restarted.trace.snapshot()).attempts.find(a=>a.id===id).events.at(-1).outcome,'INTERRUPTED');
 const broken=collector({},true);const bad=broken.trace.begin({menuItemId:'provider:onedrive'});broken.trace.finish(bad,'BLOCKED','STORAGE_UNAVAILABLE');await broken.trace.flush();
 assert.equal((await broken.trace.snapshot()).persistence,'unavailable');assert.equal(broken.warnings.length>0,true);
});
test('durable source is sanitized before inclusion in support exports',async()=>{
 const f=collector({redownSaveAttempts:[{id:webcrypto.randomUUID(),provider:'google',token:'SECRET',events:[{stage:'CLICK_RECEIVED',at:1,url:'SECRET'},{stage:'SECRET',at:2}]}]});await f.trace.ready;
 assert.doesNotMatch(JSON.stringify(await f.trace.snapshot()),/SECRET|token|url/);
});
test('actual native handler records profile-read and route failures before transfer dispatch',async()=>{
 const h=worker();await h.ready();h.context.launchSaveDroplet=()=>{};h.context.notify=async()=>{};
 h.context.getProfiles=async()=>{throw Error('private bucket token SECRET');};
 await h.chrome.contextMenus.onClicked.listeners[0]({menuItemId:'v3:provider:cloudflare',srcUrl:'https://private.invalid/SECRET'},{});
 await h.context.redownSaveAttempts.flush();
 const a=(await h.context.redownSaveAttempts.snapshot()).attempts.at(-1);assert.equal(a.events[0].stage,'CLICK_RECEIVED');assert.equal(a.events.at(-1).reason,'PREFLIGHT_FAILED');assert.equal(h.local.transferHistory[0].ok,false);assert.equal(h.local.redownFailureDot.pending,true);assert.doesNotMatch(JSON.stringify(a),/SECRET|private.invalid/);
});
test('native Cloudflare pipeline verifies exact objects and commits History and counters through 21 clicks',async()=>{
 const h=worker();h.local.cloudflareAuth={accessToken:'synthetic',sessionId:'session',expiresAt:Date.now()+3600000};await h.ready();
 h.context.launchSaveDroplet=()=>{};h.context.notify=async()=>{};
 const remote=new Map();let writes=0;
 h.context.ingestCloudflareAtPrefix=async(p,url,prefix,name,r)=>{
  h.context.redownSaveAttempts.stage(r.attemptId,'AUTH_CHECKED');h.context.redownSaveAttempts.stage(r.attemptId,'ADMITTED');h.context.redownSaveAttempts.stage(r.attemptId,'SOURCE_REQUEST');h.context.redownSaveAttempts.stage(r.attemptId,'PROVIDER_WRITE');
  const key=prefix+'/image-'+(++writes)+'.png';remote.set(key,{key,size:3,etag:'etag-'+writes,customMetadata:{sourceUrl:url}});r.destination={accountId:p.accountId,bucketName:p.bucketName,key};r.bytes=3;return 'https://fixture.invalid/'+writes;
 };
 let reads=0;h.context.callBucketWorker=async(p,request)=>{reads++;return {object:remote.get(request.key)};};
 const click=i=>h.chrome.contextMenus.onClicked.listeners[0]({menuItemId:'v3:one',srcUrl:'https://source.invalid/image-'+i+'.png'},{});
 for(let i=1;i<=21;i++){await click(i);if([1,2,3,5,10,20,21].includes(i)){assert.equal(h.local.providerSaveReceipts.totals.cloudflare,String(i));assert.equal(remote.size,i);}}
 assert.equal(reads,21);assert.equal(h.local.transferCounter.total,'21');assert.equal(h.local.redownDailyVerified.total,'21');
 assert.equal(h.local.transferHistory.filter(e=>e.status==='completed').length,21);
 await h.context.redownSaveAttempts.flush();let snapshot=await h.context.redownSaveAttempts.snapshot();assert.equal(snapshot.attempts.filter(a=>a.events.at(-1).outcome==='COMPLETED').length,21);
 // Inject a read-back mismatch after a real fixture write. It must never count.
 h.context.callBucketWorker=async()=>{reads++;return {object:null};};await click(22);
 assert.equal(h.local.providerSaveReceipts.totals.cloudflare,'21');assert.equal(h.local.transferHistory[0].status,'uncertain');
 await h.context.redownSaveAttempts.flush();snapshot=await h.context.redownSaveAttempts.snapshot();assert.equal(snapshot.attempts.at(-1).events.at(-1).outcome,'UNCERTAIN');
 if(process.env.REDOWN_P0_TRACE)writeFileSync(process.env.REDOWN_P0_TRACE,JSON.stringify({scope:'controlled local native-listener and in-memory remote-object fixture; NOT installed Chrome or live provider',baseline:'44ed072b974aabdfe62c6cc28ba2f561f08ec004',remote:{writes,independentHeads:reads,verified:21,uncertain:1},comparison:[snapshot.attempts[1],snapshot.attempts[2],snapshot.attempts[20],snapshot.attempts[21]],liveAcceptance:{state:'BLOCKED',reason:'Administrator policy disables unpacked extension loading.'}},null,2)+'\n');
});
test('trusted Debug interface exposes attempts; foreign sender and disabled Debug are rejected',async()=>{
 const h=worker();await h.ready();
 const message=(sender,operation)=>new Promise(resolve=>h.chrome.runtime.onMessage.listeners[0]({type:'runtimeDiagnosticsV1',operation},sender,resolve));
 const sender={id:'test',url:h.chrome.runtime.getURL('options.html')};
 assert.equal((await message(sender,'saveAttempts')).ok,false);h.local.debugModeEnabled=true;
 assert.equal((await message({...sender,id:'foreign'},'saveAttempts')).ok,false);
 assert.equal((await message(sender,'saveAttempts')).result.schemaVersion,1);
 assert.equal((await message(sender,'exportSupport')).result.data.schemaVersion,'1.0.0');
});

test('Cloudflare ambiguous dispatched write is uncertain and is never replayed or counted',async()=>{
 const h=worker();await h.ready();h.context.launchSaveDroplet=()=>{};h.context.notify=async()=>{};let writes=0;
 h.context.ingestCloudflareAtPrefix=async(p,url,prefix,name,receipt)=>{writes++;receipt.writeDispatched=true;throw Error('Connection ended after dispatch');};
 await h.chrome.contextMenus.onClicked.listeners[0]({menuItemId:'v3:one',srcUrl:'https://source.invalid/image.png'},{});
 assert.equal(writes,1);assert.equal(h.local.transferHistory[0].status,'uncertain');assert.equal(h.local.transferCounter.total,'0');assert.equal(h.local.providerSaveReceipts,undefined);assert.equal(h.local.redownFailureDot.pending,true);
});
