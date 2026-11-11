import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {zipSync,unzipSync,strFromU8} from 'fflate';
const load=(c,name)=>vm.runInContext(process.env.REDOWN_VISIBLE_QUEUE_BASELINE&&name==='onedrive-api'?execFileSync('git',['show','ad9a8f9aa05b857d724c8e5035a1db763edd1e4c:extension/'+name+'.js'],{encoding:'utf8'}):readFileSync('extension/'+name+'.js','utf8'),c,{filename:name+'.js'});
const context=extra=>vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,URL,URLSearchParams,Response,Headers,ReadableStream,AbortSignal,AbortController,structuredClone,setTimeout,clearTimeout,console,...extra});
const plain=x=>JSON.parse(JSON.stringify(x)),id=()=>webcrypto.randomUUID();
function queue(){const c=context();load(c,'save-evidence');load(c,'transfer-queue');load(c,'diagnostic-bundle');return c;}
const attempt=(provider,state,at=1000)=>({id:id(),provider,events:[{stage:'CLICK_RECEIVED',at},{stage:state==='received'?'SOURCE_REQUEST':'TERMINAL',at:at+1,outcome:state}],observations:[]});
test('canonical queue reconciles exact attempts, owner jobs, verified History and stale states without writes',()=>{
 const c=queue(),a=attempt('dropbox','INTERRUPTED'),b=attempt('onedrive','BLOCKED'),d=attempt('google','COMPLETED');
 const data={'dropbox:jobs':[{id:id(),source:{attemptId:a.id},status:'active',phase:'uploading',at:1000,updatedAt:5000,offset:3,total:9}],transferHistory:[{attemptId:d.id,providerKind:'google',status:'completed',ok:true,verified:true,filename:'file.png',at:new Date(5000).toISOString()}]};
 const before=JSON.stringify(data),r=c.RedownTransferQueue.project(data,{attempts:[a,b,d]},6000);
 assert.equal(r.rows.find(r=>r.id===a.id).state,'uploading');assert.equal(r.rows.find(r=>r.id===d.id).state,'verified');assert.equal(r.counts.pending,2);assert.equal(r.counts.completed,1);assert.equal(JSON.stringify(data),before);
});
test('queued stalls become attention after a deadline, future backoff and unknown totals remain honest',()=>{
 const c=queue(),a=attempt('dropbox','received'),data={'dropbox:jobs':[{id:id(),source:{attemptId:a.id},status:'queued',at:1000,updatedAt:2000,offset:0,total:null}]};
 let r=c.RedownTransferQueue.project(data,{attempts:[a]},10000);assert.equal(r.rows[0].state,'queued');assert.equal(r.rows[0].total,null);
 r=c.RedownTransferQueue.project(data,{attempts:[a]},150000);assert.equal(r.rows[0].state,'needs-attention');assert.equal(r.rows[0].code,'QUEUE_STALLED');assert.equal(r.rows[0].actions.includes('retry'),false);
 data['dropbox:jobs'][0].nextRetryAt=160000;r=c.RedownTransferQueue.project(data,{attempts:[a]},150000);assert.equal(r.rows[0].state,'queued');
});
test('review acknowledgement changes only UI metadata and a newer outcome needs review again',async()=>{
 const c=queue(),a=attempt('google','FAILED'),local={redownSaveAttempts:[a]},writes=[];
 const storage={get:async k=>({[k]:local[k]}),set:async p=>{writes.push(p);Object.assign(local,p);}};
 const api=c.RedownTransferQueue.create({storage,attempts:{snapshot:async()=>({attempts:[a],persistence:'available'})},now:()=>5000});
 await api.acknowledge(a.id);assert.deepEqual(Object.keys(writes[0]),['redownQueueAcknowledgedV1']);assert.equal((await api.list()).counts.attention,0);
 a.events.at(-1).at=6000;assert.equal((await api.list()).counts.attention,1);
});
test('unavailable storage produces a bounded partial snapshot without invoking provider wake or network',async()=>{
 const c=queue(),api=c.RedownTransferQueue.create({storage:{get:async()=>{throw Error('SECRET');}},attempts:{snapshot:async()=>{throw Error('SECRET');}}});
 const r=await api.snapshot();assert.ok(r.result.gaps.length>0);const b=c.RedownDiagnosticBundle.build(r);assert.doesNotMatch(JSON.stringify(b),/SECRET/);assert.match(b.files['SUMMARY.md'],/unavailable/);
});
test('one diagnostic ZIP has seven parseable files, stable correlations, precise codes and no private fields',()=>{
 const c=queue(),a=attempt('onedrive','BLOCKED'),b=attempt('google','BLOCKED'),d=attempt('dropbox','received');
 a.observations=[{at:1002,code:'ONEDRIVE_SOURCE_LENGTH_UNKNOWN',contentLength:'absent',phase:'source',token:'SECRET_TOKEN',url:'https://private.example/path?SECRET_QUERY'}];
 b.observations=[{at:1003,code:'SOURCE_RETURNED_HTML',bodyKind:'html',contentType:'text/html',httpStatus:200}];
 const data={cloudflareAuth:{accessToken:'SECRET_TOKEN',refreshToken:'SECRET_REFRESH'},'dropbox:jobs':[{id:id(),source:{attemptId:d.id,url:'https://SECRET_SITE/'},name:'SECRET_FILENAME',accountId:'SECRET_ACCOUNT',status:'queued',at:1,updatedAt:1}],transferHistory:[{providerKind:'onedrive',attemptId:a.id,status:'blocked',ok:false,error:'SECRET_ERROR',filename:'SECRET_FILENAME',destination:{bucketName:'SECRET_BUCKET'},at:new Date(1004).toISOString()}]};
 const result=c.RedownTransferQueue.project(data,{attempts:[a,b,d]},150000),bundle=c.RedownDiagnosticBundle.build({data,traces:{attempts:[a,b,d],persistence:'available'},result},{scope:'simulated fixture; no real provider writes',extensionVersion:'0.5.27',now:1794412800000});
 const bytes=c.RedownDiagnosticBundle.zip(bundle,{zipSync}),files=unzipSync(bytes),names=Object.keys(files).sort();
 assert.deepEqual(names,['README.md','SUMMARY.md','attempts.json','environment.json','history-reconciliation.json','queue.json','source-and-provider-failures.json'].sort());
 for(const name of names)if(name.endsWith('.json'))JSON.parse(strFromU8(files[name]));
 const text=names.map(n=>strFromU8(files[n])).join('\n');assert.doesNotMatch(text,/SECRET|private.example|accessToken|refreshToken/);assert.match(text,/ONEDRIVE_SOURCE_LENGTH_UNKNOWN/);assert.match(text,/SOURCE_RETURNED_HTML/);assert.match(text,/QUEUE_STALLED/);assert.match(text,new RegExp(a.id));assert.ok(bytes.length<524288);
 if(process.env.REDOWN_QUEUE_SAMPLE){mkdirSync(process.env.REDOWN_QUEUE_SAMPLE,{recursive:true});writeFileSync(process.env.REDOWN_QUEUE_SAMPLE+'/'+bundle.filename,bytes);}
});
function oneDrive({headers={'content-length':'3','content-type':'image/png'},body=new Uint8Array([1,2,3]),status=200,putError=false}={}){
 const calls=[],observations=[];const c=context({redownSaveAttempts:{observe:(id,d)=>observations.push(plain(d))}});load(c,'save-evidence');load(c,'onedrive-api');
 const fetch=async(url,init={})=>{calls.push({url,init});if(url==='https://cdn.example.org/image.png')return new Response(body,{headers,status});if(url.endsWith('/createUploadSession'))return Response.json({uploadUrl:'https://sn3302.up.1drv.com/upload'});if(url==='https://sn3302.up.1drv.com/upload'){if(putError)throw Error('socket closed');const range=/bytes (\d+)-(\d+)\/(\d+)/.exec(init.headers['Content-Range']);if(range&&Number(range[2])+1<Number(range[3]))return Response.json({nextExpectedRanges:[String(Number(range[2])+1)+'-']},{status:202});return Response.json({id:'item'},{status:201});}if(url.includes('/items/item?'))return Response.json({id:'item',name:'image.png',size:calls.filter(c=>c.url==='https://sn3302.up.1drv.com/upload').reduce((n,c)=>n+c.init.body.length,0),parentReference:{id:'root',driveId:'drive'},file:{}});throw Error('Unexpected endpoint');};
 const api=c.RedownOneDriveAPI.create({fetch});return {c,calls,observations,upload:signal=>api.upload({url:'https://cdn.example.org/image.png',name:'image.png',attemptId:id()},{token:'private-token',driveId:'drive',rootId:'root'},async()=>{},signal)};
}
for(const headers of [{'content-type':'image/png'},{'content-type':'image/png','content-length':'invalid'},{'content-type':'image/png','content-length':'1','content-encoding':'gzip'}])test('OneDrive determines decoded byte count before Graph: '+JSON.stringify(headers),async()=>{
 const f=oneDrive({headers});const r=await f.upload();assert.equal(r.bytes,3);const put=f.calls.find(c=>c.init.method==='PUT');assert.equal(put.init.headers['Content-Range'],'bytes 0-2/3');assert.equal(put.init.headers.Authorization,undefined);assert.deepEqual(Array.from(put.init.body),[1,2,3]);assert.ok(f.observations.some(o=>o.acquisition==='bounded-memory'));
});
test('OneDrive temporary acquisition is bounded, cancels oversized sources and releases budget',async()=>{
 let reads=0;const body=new ReadableStream({pull(c){if(reads++<17)c.enqueue(new Uint8Array(1024*1024));else c.close();}});
 const f=oneDrive({headers:{'content-type':'image/png'},body});await assert.rejects(f.upload(),e=>e.code==='ONEDRIVE_SOURCE_BUFFER_LIMIT');assert.equal(f.calls.filter(c=>c.url.includes('graph.microsoft')).length,0);
 assert.equal((await oneDrive({headers:{'content-type':'image/png'}}).upload()).bytes,3);
});
for(const options of [{headers:{'content-type':'text/html'},body:'<html>login</html>'},{headers:{'content-type':'image/png'},body:'  <!doctype html><html>Access denied</html>'},{status:403}])test('OneDrive refuses source page/access failure before Graph: '+JSON.stringify(options),async()=>{
 const f=oneDrive(options);await assert.rejects(f.upload(),e=>['SOURCE_RETURNED_HTML','ONEDRIVE_SOURCE_HTTP'].includes(e.code));assert.equal(f.calls.filter(c=>c.url.includes('graph.microsoft')).length,0);
});
test('OneDrive rejects truncated known sources and never commits a fabricated byte count',async()=>{
 const f=oneDrive({headers:{'content-length':'99','content-type':'image/png'}});await assert.rejects(f.upload(),e=>e.code==='ONEDRIVE_SOURCE_TRUNCATED');assert.equal(f.calls.filter(c=>c.init.method==='PUT').length,0);
});
test('OneDrive interrupted final write remains uncertain with exactly one PUT',async()=>{
 const f=oneDrive({putError:true});await assert.rejects(f.upload(),e=>e.status==='uncertain');assert.equal(f.calls.filter(c=>c.init.method==='PUT').length,1);
});
test('Google and Dropbox sniff HTML mislabeled as image before any provider write',async()=>{
 for(const provider of ['google','dropbox']){
  const calls=[],c=context({chrome:{runtime:{id:'mkadkgpekmkknfbniacdlmgikihjjepf',getManifest:()=>({oauth2:{client_id:'123-fixture.apps.googleusercontent.com',scopes:['https://www.googleapis.com/auth/drive.file']}})},identity:{getAuthToken:async()=>({token:'fixture'})},permissions:{contains:async()=>true},storage:{local:{set:async()=>{}}}}});load(c,'save-evidence');
  const fetch=async(url,init={})=>{calls.push({url,init});if(url.includes('/about?'))return Response.json({user:{permissionId:'account'}});if(url==='https://cdn.example.org/a.png')return new Response('<html>Sign in</html>',{headers:{'content-type':'image/png'}});throw Error('Unexpected provider write');};
  let run;
  if(provider==='google'){load(c,'google-drive-stream');const api=c.RedownGoogleDriveStream.create({fetch});run=()=>api.upload({accountId:'account',offset:0,phase:'source',source:{url:'https://cdn.example.org/a.png'}},async()=>{},new AbortController().signal);}
  else{load(c,'dropbox-api');const api=c.RedownDropboxAPI.create({fetch,auth:{ready:async()=>({namespace:'123'})}});run=()=>api.upload({namespace:'123',offset:0,phase:'source',source:{url:'https://cdn.example.org/a.png'}},async()=>{},new AbortController().signal);}
  await assert.rejects(run(),e=>e.code==='SOURCE_RETURNED_HTML');assert.equal(calls.filter(c=>c.init.method==='POST'||c.init.method==='PUT').length,0);
 }
});

test('an actual pending OAuth observation is waiting-for-login, not a stalled upload or success',()=>{
 const c=queue(),a=attempt('google','received');a.events.at(-1).stage='ROUTE_RESOLVED';a.observations=[{at:1001,phase:'auth',code:'AUTH_PENDING'}];
 const r=c.RedownTransferQueue.project({}, {attempts:[a]},2000);assert.equal(r.rows[0].state,'waiting-for-login');assert.equal(r.counts.waiting,1);assert.equal(r.counts.completed,0);
});

test('last-100 export remains bounded at maximum recorder depth without dropping source evidence',()=>{
 const c=queue(),attempts=Array.from({length:100},(_,i)=>({id:id(),provider:['google','dropbox','onedrive','cloudflare'][i%4],sourceId:'a'.repeat(64),sourceEvidence:{contentType:'image/png',contentLength:'absent',bodyKind:'bytes',sourceId:'a'.repeat(64)},events:Array.from({length:24},(_,j)=>({stage:j===0?'CLICK_RECEIVED':j===23?'TERMINAL':'PROVIDER_WRITE',at:1000+i*100+j,durationMs:1,...(j===23?{outcome:'UNCERTAIN',reason:'UNCONFIRMED'}:{})})),observations:Array.from({length:20},(_,j)=>({at:1000+i*100+j,role:'provider',method:'POST',httpStatus:503,phase:'uploading',code:'UNCONFIRMED',category:'server',contentType:'application/octet-stream',contentLength:'present',contentEncoding:'identity',redirectPolicy:'error',redirectOutcome:'not-followed',bodyKind:'bytes',sizeRange:'1-16MiB',acquisition:'stream',decision:'uncertain',sourceId:'a'.repeat(64),resumed:true,wakeRequested:true}))}));
 const result=c.RedownTransferQueue.project({}, {attempts},20000),bundle=c.RedownDiagnosticBundle.build({data:{},traces:{attempts,persistence:'available'},result});
 const zip=c.RedownDiagnosticBundle.zip(bundle,{zipSync}),files=unzipSync(zip);assert.equal(JSON.parse(strFromU8(files['attempts.json'])).attempts.length,100);assert.ok(bundle.metadataBytes<=2097152);assert.ok(zip.length<=524288);assert.equal(JSON.parse(strFromU8(files['source-and-provider-failures.json'])).observations.length,2000);
});
test('source HMAC distinguishes query-selected assets, survives pruning, and never exports its key or URL',async()=>{
 const local={},c=context();load(c,'save-evidence');load(c,'runtime-diagnostics');
 const storage={get:async k=>({[k]:structuredClone(local[k])}),set:async p=>Object.assign(local,structuredClone(p))};
 const trace=c.RedownRuntimeDiagnostics.createAttempts({storage});await trace.ready;
 const a=trace.begin({menuItemId:'provider:google-drive',srcUrl:'https://private.example/SECRET_PATH?token=SECRET_A'}),b=trace.begin({menuItemId:'provider:dropbox',srcUrl:'https://private.example/SECRET_PATH?token=SECRET_B'}),same=trace.begin({menuItemId:'provider:onedrive',srcUrl:'https://private.example/SECRET_PATH?token=SECRET_A#fragment'});
 for(let i=0;i<100;i++){if((await trace.snapshot()).attempts.every(a=>a.sourceId))break;await new Promise(r=>setTimeout(r,10));}
 trace.observe(a,{phase:'source',contentType:'image/png',contentLength:'absent'});
 for(let i=0;i<40;i++){trace.observe(a,{phase:'uploading',role:'provider',httpStatus:200});trace.stage(a,i%2?'PROVIDER_WRITE':'SOURCE_REQUEST');}
 const snapshot=await trace.snapshot(),first=snapshot.attempts.find(x=>x.id===a),second=snapshot.attempts.find(x=>x.id===b);
 assert.match(first.sourceId,/^[a-f0-9]{64}$/);assert.notEqual(first.sourceId,second.sourceId);assert.equal(first.sourceId,snapshot.attempts.find(x=>x.id===same).sourceId);assert.equal(first.sourceEvidence.contentType,'image/png');assert.equal(first.events[0].stage,'CLICK_RECEIVED');assert.ok(first.events.length<=24);assert.doesNotMatch(JSON.stringify(snapshot),/SECRET|private.example/);assert.equal(JSON.stringify(snapshot).includes(local.redownSourceFingerprintKeyV1),false);await trace.flush();
});

test('OneDrive fixed-length sources above the temporary acquisition limit retain streamed upload',async()=>{
 const size=18*1024*1024;let sent=0;const body=new ReadableStream({pull(c){if(sent>=size){c.close();return;}c.enqueue(new Uint8Array(1024*1024));sent+=1024*1024;}});
 const f=oneDrive({headers:{'content-length':String(size),'content-type':'image/png'},body});const result=await f.upload();assert.equal(result.bytes,size);assert.equal(f.calls.filter(c=>c.init.method==='PUT').length,4);assert.equal(f.observations.some(o=>o.acquisition==='bounded-memory'),false);
});
test('HTML with an XML/comment preamble is still blocked when mislabeled as an image',async()=>{
 const f=oneDrive({headers:{'content-type':'image/png'},body:'<?xml version="1.0"?><!-- login --><html><body>Denied</body></html>'});await assert.rejects(f.upload(),e=>e.code==='SOURCE_RETURNED_HTML');assert.equal(f.calls.filter(c=>c.url.includes('graph.microsoft')).length,0);
});

test('verified owner completions outside the recent History window are not counted as pending',()=>{
 const c=queue(),job={id:id(),source:{attemptId:id()},accountId:'account',status:'completed',reported:true,result:{fileId:'actual_file_id',name:'file.png',bytes:3},at:1000,updatedAt:2000};
 const queued={id:id(),source:{attemptId:id()},status:'queued',at:4000,updatedAt:4000};
 const r=c.RedownTransferQueue.project({googleDriveJobs:[job,queued]}, {attempts:[]},5000);assert.equal(r.counts.completed,1);assert.equal(r.counts.pending,1);assert.equal(r.rows.find(r=>r.id===queued.source.attemptId).queuePosition,1);
});
test('older failed History cannot repaint a newer active owner job or its chosen destination',()=>{
 const c=queue(),attemptId=id(),job={id:id(),source:{attemptId},status:'active',phase:'uploading',accountId:'actual-account',at:1000,updatedAt:5000,offset:1,total:3};
 const r=c.RedownTransferQueue.project({googleDriveJobs:[job],transferHistory:[{providerKind:'google',attemptId,status:'blocked',ok:false,error:'Reconnect Google Drive',destination:{accountId:'old-account'},at:new Date(2000).toISOString()}]},{attempts:[]},6000);
 assert.equal(r.rows[0].state,'uploading');assert.equal(r.rows[0].code,'OK');assert.equal(r.rows[0].destination.accountId,'actual-account');assert.equal(r.rows[0].bytes,1);
});

test('forensic reconciliation links real local receipt IDs without exporting them or attributing a failed attempt',()=>{
 const c=queue(),a=attempt('google','COMPLETED'),b=attempt('google','FAILED'),secretId='google:SECRET_PROVIDER_ITEM';
 const data={transferHistory:[{attemptId:a.id,providerKind:'google',ok:true,verified:true,status:'completed',deliveryId:secretId,at:new Date(2000).toISOString()},{attemptId:b.id,providerKind:'google',ok:false,verified:false,status:'failed',deliveryId:secretId,at:new Date(2001).toISOString()}],providerSaveReceipts:{ids:[secretId],totals:{google:'1'}}};
 const bundle=c.RedownDiagnosticBundle.build({data,traces:{attempts:[a,b],persistence:'available'},result:c.RedownTransferQueue.project(data,{attempts:[a,b]},3000)}),links=JSON.parse(bundle.files['history-reconciliation.json']).links;
 assert.equal(links.find(l=>l.attemptId===a.id).counterReceiptLinked,true);assert.equal(links.find(l=>l.attemptId===b.id).counterReceiptLinked,false);assert.doesNotMatch(JSON.stringify(bundle),/SECRET_PROVIDER_ITEM/);
});

test('OneDrive unknown-length chunks preserve every byte through sniff, acquisition and upload',async()=>{
 let n=0;const body=new ReadableStream({pull(c){if(n===50)c.close();else c.enqueue(new Uint8Array([n++]));}}),f=oneDrive({headers:{'content-type':'application/octet-stream'},body});
 const result=await f.upload();assert.equal(result.bytes,50);assert.deepEqual(Array.from(f.calls.find(c=>c.init.method==='PUT').init.body),Array.from({length:50},(_,i)=>i));
});
test('valid chunked source bytes survive the guard and original Google/Dropbox upload and proof paths',async()=>{
 const payload=Uint8Array.from({length:513},(_,i)=>i%251);
 for(const provider of ['google','dropbox']){
  const chunks=[],c=context({chrome:{runtime:{id:'mkadkgpekmkknfbniacdlmgikihjjepf',getManifest:()=>({oauth2:{client_id:'123-fixture.apps.googleusercontent.com',scopes:['https://www.googleapis.com/auth/drive.file']}})},identity:{getAuthToken:async()=>({token:'fixture'})},permissions:{contains:async()=>true},storage:{local:{set:async()=>{}}}}});load(c,'save-evidence');load(c,'dropbox-api');load(c,'google-drive-stream');
  const item={'.tag':'file',id:'id:uploaded',size:513,rev:'revision',name:'file.bin',path_display:'/file.bin',path_lower:'/file.bin',content_hash:'a'.repeat(64)};
  const fetch=async(url,init={})=>{
   if(url==='https://cdn.example.org/file.bin'){let offset=0;return new Response(new ReadableStream({pull(controller){if(offset>=payload.length)controller.close();else{controller.enqueue(payload.slice(offset,offset+7));offset+=7;}}}),{headers:{'content-type':'application/octet-stream'}});}
   if(url.includes('/about?'))return Response.json({user:{permissionId:'account'}});
   if(url.includes('/generateIds?'))return Response.json({ids:['allocated']});
   if(url.includes('/upload/drive/v3/files')&&init.method==='POST')return new Response(null,{headers:{Location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=fixture'}});
   if(url.includes('/upload/drive/v3/files')&&init.method==='PUT'){chunks.push(new Uint8Array(init.body));return Response.json({id:'allocated'});}
   if(url.includes('/files/allocated?'))return Response.json({id:'allocated',name:'file.bin',size:chunks.reduce((n,c)=>n+c.length,0),trashed:false});
   if(url.endsWith('upload_session/start'))return Response.json({session_id:'fixture'});
   if(url.endsWith('upload_session/append_v2')){chunks.push(new Uint8Array(init.body));return Response.json({});}
   if(url.endsWith('upload_session/finish')||url.endsWith('files/get_metadata'))return Response.json({...item,size:chunks.reduce((n,c)=>n+c.length,0)});
   throw Error('Unexpected endpoint');
  };
  let result;
  if(provider==='google')result=await c.RedownGoogleDriveStream.create({fetch}).upload({accountId:'account',offset:0,phase:'source',source:{url:'https://cdn.example.org/file.bin'}},async()=>{},new AbortController().signal);
  else result=await c.RedownDropboxAPI.create({fetch,auth:{ready:async()=>({token:'fixture',namespace:'123'})}}).upload({accountId:'dbid:fixture',connectionId:'conn',namespace:'123',offset:0,phase:'source',source:{url:'https://cdn.example.org/file.bin'}},async()=>{},new AbortController().signal);
  assert.equal(result.bytes,payload.length);assert.deepEqual(chunks.flatMap(c=>Array.from(c)),Array.from(payload));
 }
});
