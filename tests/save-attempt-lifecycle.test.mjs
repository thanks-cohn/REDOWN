import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const tick=()=>new Promise(r=>setImmediate(r));
const load=(c,p)=>vm.runInContext(process.env.REDOWN_P0_BASELINE?execFileSync('git',['show','44ed072b974aabdfe62c6cc28ba2f561f08ec004:extension/'+p+'.js'],{encoding:'utf8'}):readFileSync('extension/'+p+'.js','utf8'),c);
function fixture(kind){
 const local={},records=[],writes=[];let failWrite=false,failRecord=false;
 const chrome={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p},storage:{local:{get:async k=>Object.fromEntries((Array.isArray(k)?k:[k]).map(k=>[k,structuredClone(local[k])])),set:async p=>{if(failWrite){failWrite=false;throw Error('injected storage failure');}Object.assign(local,structuredClone(p));},remove:async k=>delete local[k]}},permissions:{request:async()=>true},alarms:{create:async()=>{},clear:async()=>{}}};
 const record=async e=>{if(failRecord){failRecord=false;throw Error('injected History failure');}records.push(structuredClone(e));};
 const identity={accountId:'account',driveId:'drive',rootId:'root'};
 const auth={ready:async()=>identity,connect:async()=>identity};
 const c=vm.createContext({chrome,crypto:webcrypto,AbortController,URL,console,RedownOneDriveMenu:{owns:id=>String(id).startsWith('provider:onedrive')},RedownOneDriveAuth:{create:()=>auth},RedownOneDriveAPI:{create:()=>({}),sourceSnapshot:i=>({url:i.srcUrl,sourceUrl:i.srcUrl,name:'image.png'})},RedownGoogleDriveStream:{sourceURL:u=>new URL(u)}});
 load(c,kind==='google'?'google-drive-provider':'onedrive-provider');
 const api={connect:async()=>identity.accountId,upload:async(...args)=>{writes.push(args[0]);return {fileId:'file-'+writes.length,itemId:'file-'+writes.length,name:'image.png',bytes:1};}};
 const provider=kind==='google'?c.RedownGoogleDriveProvider.create({chrome,api,record}):c.RedownOneDriveProvider.create({chrome,auth,api,record});
 const click=()=>provider.dispatch({menuItemId:kind==='google'?'provider:google-drive':'provider:onedrive',srcUrl:'https://source.invalid/image.png'});
 return {c,local,records,writes,provider,click,chrome,auth,api,failWrite:()=>failWrite=true,failRecord:()=>failRecord=true};
}
test('Google stale connecting projection does not silently discard an accepted click',async()=>{
 const f=fixture('google');f.local.googleDriveState={phase:'connecting'};
 await f.click();await f.provider.pump();
 assert.equal(f.writes.length,1);assert.equal(f.records.filter(r=>r.ok).length,1);
});
test('OneDrive stale connecting with durable auth revalidates identity and saves',async()=>{
 const f=fixture('onedrive');f.local['onedrive:state']={phase:'connecting'};f.local['onedrive:auth']={connectionId:'existing'};
 await f.click();await tick();assert.equal(f.writes.length,1);assert.equal(f.records.filter(r=>r.ok).length,1);
});
test('OneDrive initial storage write failure releases admission for the next click',async()=>{
 const f=fixture('onedrive');f.local['onedrive:state']={phase:'connected'};
 f.failWrite();await f.click();await tick();await f.click();await tick();
 assert.equal(f.writes.length,1);assert.equal(f.records.filter(r=>r.ok).length,1);
});
test('OneDrive History failure releases admission without replaying a verified upload',async()=>{
 const f=fixture('onedrive');f.local['onedrive:state']={phase:'connected'};
 f.failRecord();await f.click();await tick();await f.click();await tick();
 assert.equal(f.writes.length,2);
});

for(const kind of ['google','onedrive'])test(kind+' stays functional at 1, 2, 3, 5, 10, 20 and 21 saves without Shelf',async()=>{
 const f=fixture(kind);f.local[kind==='google'?'googleDriveState':'onedrive:state']={phase:'connected',accountId:'account'};
 for(let n=1;n<=21;n++){
  await f.click();if(kind==='google')await f.provider.pump();else await tick();
  if([1,2,3,5,10,20,21].includes(n)){assert.equal(f.writes.length,n);assert.equal(f.records.filter(r=>r.ok).length,n);}
 }
 assert.equal(new Set(f.records.filter(r=>r.ok).map(r=>r.deliveryId)).size,21);
});
test('Google admission failure produces failed History with no upload',async()=>{
 const f=fixture('google');f.local.googleDriveState={phase:'connected',accountId:'account'};
 f.local.googleDriveJobs=Array.from({length:8},(_,i)=>({id:'pending-'+i,status:'queued'}));
 await f.click();assert.equal(f.writes.length,0);assert.equal(f.records.at(-1).status,'blocked');assert.match(f.records.at(-1).error,/queue is full/);
});
test('OneDrive connecting without durable authorization records blocked History',async()=>{
 const f=fixture('onedrive');f.local['onedrive:state']={phase:'connecting'};
 await f.click();assert.equal(f.writes.length,0);assert.equal(f.records.at(-1).ok,false);assert.match(f.records.at(-1).error,/pending or was interrupted/);
});

function dropboxFixture(){
 const local={'dropbox:state':{phase:'connected',rootReady:true,accountId:'dbid:fixture',connectionId:'conn',namespace:'123'}},records=[],writes=[];let historyFail=false,hold=null;
 const chrome={storage:{local:{get:async k=>({[k]:structuredClone(local[k])}),set:async p=>Object.assign(local,structuredClone(p))}},permissions:{request:async()=>true},alarms:{create:async()=>{},clear:async()=>{}}};
 const auth={ready:async()=>local['dropbox:state'],connect:async()=>{throw Error('Unexpected OAuth');}};
 const api={upload:async(job,checkpoint)=>{writes.push(job.id);if(hold)await hold;job.offset=3;job.phase='verifying';await checkpoint(job);return {proofVersion:1,accountId:job.accountId,connectionId:job.connectionId,namespace:job.namespace,root:'/',name:'image.png',path:'/image.png',fileId:'id:'+job.id,revision:'rev',contentHash:'a'.repeat(64),bytes:3};}};
 const c=vm.createContext({chrome,crypto:webcrypto,AbortController,URL,console,RedownDropboxAuth:{fail:message=>Object.assign(Error(message),{status:'blocked'})},RedownDropboxAPI:{sourceSnapshot:i=>({url:i.srcUrl,sourceUrl:i.srcUrl}),sourceURL:u=>new URL(u)}});load(c,'dropbox-provider');
 const recreate=()=>c.RedownDropboxProvider.create({chrome,auth,api,record:async e=>{if(historyFail&&e.status==='completed'){historyFail=false;throw Error('injected History outage');}records.push(structuredClone(e));}});
 const provider=recreate();
 return {provider,recreate,local,records,writes,hold:p=>hold=p,failHistory:()=>historyFail=true,click:()=>provider.dispatch({menuItemId:'provider:dropbox',srcUrl:'https://source.invalid/image.png'})};
}
test('Dropbox full queue records an explicit rejected attempt without adding a job or opening OAuth',async()=>{
 const f=dropboxFixture();f.local['dropbox:jobs']=Array.from({length:8},(_,i)=>({id:String(i),status:'queued'}));
 await f.click();assert.equal(f.local['dropbox:jobs'].length,8);assert.equal(f.writes.length,0);assert.match(f.records.at(-1).error,/queue is full/);assert.equal(f.records.at(-1).ok,false);
});
test('Dropbox completed checkpoint survives History failure; recovery never uploads it again',async()=>{
 const f=dropboxFixture();f.failHistory();await f.click();await f.provider.pump().catch(()=>{});
 assert.equal(f.local['dropbox:jobs'][0].status,'completed');assert.equal(f.writes.length,1);
 f.provider=f.recreate();await f.provider.pump();assert.equal(f.writes.length,1);assert.equal(f.records.filter(r=>r.ok).length,1);
});
test('Dropbox drains a second click arriving during a slow upload in the same pump',async()=>{
 const f=dropboxFixture();let release;f.hold(new Promise(r=>release=r));
 await f.click();await tick();await f.click();release();await f.provider.pump();
 assert.equal(f.writes.length,2);assert.equal(f.records.filter(r=>r.ok).length,2);
});
test('Dropbox remains functional through 21 saves without Shelf',async()=>{
 const f=dropboxFixture();for(let i=1;i<=21;i++){await f.click();await f.provider.pump();assert.equal(f.records.filter(r=>r.ok).length,i);}
 assert.equal(new Set(f.writes).size,21);
});

test('OneDrive real in-flight login cannot save against previous durable account',async()=>{
 const f=fixture('onedrive');let release;
 f.auth.connect=()=>new Promise(r=>release=r);
 const login=f.provider.message({type:'onedriveConnect'},{id:'test',url:f.chrome.runtime.getURL('shelf.html')});
 await tick();f.local['onedrive:state']={phase:'connecting'};f.local['onedrive:auth']={connectionId:'previous'};
 await f.click();assert.equal(f.writes.length,0);assert.equal(f.records.at(-1).status,'blocked');
 release({phase:'connected',rootReady:true});assert.equal((await login).ok,true);
});
test('ten rapid Google clicks respect the existing eight-job bound and record every rejection',async()=>{
 const f=fixture('google');f.local.googleDriveState={phase:'connected',accountId:'account'};let release;
 const gate=new Promise(r=>release=r),original=f.api.upload;f.api.upload=async(...args)=>{await gate;return original(...args);};
 await Promise.all(Array.from({length:10},()=>f.click()));
 assert.equal(f.local.googleDriveJobs.length,8);assert.equal(f.records.filter(r=>r.status==='blocked').length,2);
 release();await f.provider.pump();assert.equal(f.records.filter(r=>r.ok).length,8);assert.equal(f.writes.length,8);
});
test('ten rapid OneDrive clicks admit one and persist nine explicit busy outcomes',async()=>{
 const f=fixture('onedrive');f.local['onedrive:state']={phase:'connected'};let release;
 const gate=new Promise(r=>release=r),original=f.api.upload;f.api.upload=async(...args)=>{await gate;return original(...args);};
 await Promise.all(Array.from({length:10},()=>f.click()));
 assert.equal(f.records.filter(r=>r.status==='blocked').length,9);release();await tick();assert.equal(f.writes.length,1);assert.equal(f.records.filter(r=>r.ok).length,1);
});
test('ten rapid Dropbox clicks respect eight-job admission and drain without Shelf or alarm',async()=>{
 const f=dropboxFixture();let release;f.hold(new Promise(r=>release=r));
 await Promise.all(Array.from({length:10},()=>f.click()));assert.equal(f.local['dropbox:jobs'].length,8);assert.equal(f.records.filter(r=>r.status==='blocked').length,2);
 release();await f.provider.pump();assert.equal(f.writes.length,8);assert.equal(f.records.filter(r=>r.ok).length,8);
});
