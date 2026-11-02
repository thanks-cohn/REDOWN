import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto,createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
const read=p=>readFile(p,'utf8');
const sources=await Promise.all(['extension/dropbox-api.js','extension/google-drive-stream.js','extension/google-drive-provider.js','extension/transfer-counter.js'].map(read));
const plain=x=>JSON.parse(JSON.stringify(x));
function context(extra={}){const c=vm.createContext({URL,TextEncoder,TextDecoder,Uint8Array,AbortController,AbortSignal,Response,ReadableStream,crypto:webcrypto,setTimeout,clearTimeout,console,...extra});for(const s of sources)vm.runInContext(s,c);return c;}
const c=context();
function responseName(cd,url='https://source.invalid/image',mime='image/png',hint){const r=new Response('',{headers:{'Content-Type':mime,...(cd?{'Content-Disposition':cd}:{})}});Object.defineProperty(r,'url',{value:url});return c.RedownDropboxAPI.selectFilename(r,{url,downloadFilename:hint});}
for(const [cd,url,mime,hint,expected] of [
 ["attachment; filename=plain.png; filename*=UTF-8'en'%E7%8C%AB%20photo.png",undefined,undefined,undefined,'猫 photo.png'],
 ['attachment; filename="a;b.pdf"',undefined,'image/jpeg',undefined,'a;b.pdf'],
 ["attachment; filename*=UTF-8''bad%XX; filename=good.pdf",undefined,undefined,undefined,'good.pdf'],
 ['', 'https://source.invalid/image?filename=secret.png','image/png','Visible cat.png','Visible cat.png'],
 ['', 'https://source.invalid/final/%E7%8C%AB.jpg?x=private#no','image/png',undefined,'猫.jpg'],
 ['attachment; filename="../unsafe.pdf"',undefined,undefined,undefined,'unsafe.pdf'],
 ['', 'https://source.invalid/download','application/pdf',undefined,'download.pdf'],
 ['', 'https://source.invalid/download','application/octet-stream',undefined,'download'],
 ['', 'https://source.invalid/','image/png',undefined,'Web file'],
 ['attachment; filename=".."','https://source.invalid/','image/png',undefined,'Web file'],
 ["attachment; filename*=UTF-8''a%E2%80%AEb.png",undefined,undefined,undefined,'a_b.png']
])test('filename precedence and sanitization '+expected,()=>assert.equal(responseName(cd,url,mime,hint),expected));
test('Dropbox provider transport, commit, proof and numeric collision implementation are byte-preserved',async()=>{
 const {execFileSync}=await import('node:child_process');const before=execFileSync('git',['show','92ba407:extension/dropbox-api.js'],{encoding:'utf8'}),after=sources[0];
 for(const [a,b] of [['    async function call(','    async function upload('],['        if(!job.session){','    return {upload,proof,call};']])assert.equal(after.slice(after.indexOf(a),after.indexOf(b)),before.slice(before.indexOf(a),before.indexOf(b)));
 assert.equal(after.slice(after.indexOf('  function filename('),after.indexOf('  // Only names')),before.slice(before.indexOf('  function filename('),before.indexOf('  function sourceSnapshot(')));
 for(const p of ['extension/right-click-v3.js','extension/right-click-current.js','extension/nested-locations.js','extension/destination-config.js','extension/right-click-legacy.js'])assert.equal(createHash('sha256').update(await read(p)).digest('hex'),createHash('sha256').update(execFileSync('git',['show','92ba407:'+p])).digest('hex'),p);
});
function driveFixture(opts={}){
 const store={},requests=[],checkpoints=[],uploaded=[],files=new Map(),sessions=new Map();let tokenCalls=[],sourceReads=0,maxBody=0,interrupted=false;
 const size=opts.size??(1024*1024+17),account=()=>opts.account||'account1';
 const chrome={runtime:{id:'mkadkgpekmkknfbniacdlmgikihjjepf',getManifest:()=>({oauth2:{client_id:'123-test.apps.googleusercontent.com',scopes:['https://www.googleapis.com/auth/drive.file']}})},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(store[k])])),set:async patch=>Object.assign(store,structuredClone(patch))}},permissions:{contains:async()=>opts.permission!==false},identity:{getAuthToken:async o=>{tokenCalls.push(o.interactive);if(opts.denied)throw Error('denied');return {token:'token',grantedScopes:['https://www.googleapis.com/auth/drive.file']};},removeCachedAuthToken:async()=>{}}};
 const json=(x,status=200,headers={})=>new Response(status===308?null:JSON.stringify(x),{status,headers});
 async function fetch(url,o={}){
  requests.push({url,method:o.method,headers:o.headers,body:typeof o.body==='string'?JSON.parse(o.body):o.body?.length});
  if(url.startsWith('https://source.invalid/')){
   assert.equal(o.headers?.Authorization,undefined);assert.equal(o.credentials,'omit');assert.equal(o.referrerPolicy,'no-referrer');assert.equal(o.redirect,'error');
   const start=o.headers?.Range?Number(/bytes=(\d+)-/.exec(o.headers.Range)[1]):0;let n=start;
   const body=new ReadableStream({pull(controller){sourceReads++;if(n>=size){controller.close();return;}const count=Math.min(65536,size-n),bytes=new Uint8Array(count);bytes.fill(n/65536%251);n+=count;controller.enqueue(bytes);}});
   return new Response(body,{status:start||o.headers?.Range?206:200,headers:{'Content-Type':opts.html?'text/html':'application/octet-stream',...(opts.noEtag?{}:{ETag:opts.changed&&start?'"changed"':'"stable"'}),...(opts.unknown?{}:{'Content-Length':String(size-start)}),...(o.headers?.Range?{'Content-Range':`bytes ${start}-${size-1}/${size}`} :{}),'Content-Disposition':'attachment; filename="real.bin"'}});
  }
  assert.equal(new URL(url).origin,'https://www.googleapis.com');assert.equal(o.headers.Authorization,'Bearer token');
  if(url.includes('/about?'))return json({user:{permissionId:account()}});
  if(url.includes('/generateIds?'))return json({ids:['file'+(sessions.size+1)]});
  if(url.includes('/files/file')){const id=/\/files\/(file\d+)/.exec(url)[1];return json(files.get(id)||{},files.has(id)?200:404);}
  if(o.method==='POST'&&url.includes('uploadType=resumable')){
   const metadata=JSON.parse(o.body);assert.deepEqual(Object.keys(metadata).sort(),['id','mimeType','name']);assert.equal(metadata.name,'real.bin');const session='https://www.googleapis.com/upload/drive/v3/files?upload_id='+metadata.id;
   sessions.set(session,{offset:0,metadata});return json({},200,{Location:opts.badEndpoint?'https://evil.invalid/upload':session});
  }
  if(o.method==='PUT'&&sessions.has(url)){
   const session=sessions.get(url),range=o.headers['Content-Range'];
   if(range.startsWith('bytes */'))return files.has(session.metadata.id)?json({id:session.metadata.id}):json(null,308,session.offset?{Range:'bytes=0-'+(session.offset-1)}:{});
   const m=/^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(range);assert.ok(m,range);const start=Number(m[1]),end=Number(m[2])+1;
   assert.equal(start,session.offset);assert.equal(o.body.length,end-start);assert.ok(o.body.length<=4*1024*1024);maxBody=Math.max(maxBody,o.body.length);
   if(opts.interrupt&&!interrupted&&start>=4*1024*1024){interrupted=true;throw Error('lost request');}
   if(opts.http)return json({},opts.http);
   session.offset=end;uploaded.push({start,end});
   if(m[3]!=='*'&&end===Number(m[3])){files.set(session.metadata.id,{id:session.metadata.id,name:session.metadata.name,size:String(opts.badReceipt?size+1:size),trashed:false,parents:['opaque-root']});if(opts.lostFinal&&!interrupted){interrupted=true;throw Error('final acknowledgement lost');}return json({id:session.metadata.id});}
   return json(null,308,{Range:'bytes=0-'+(end-1)});
  }
  throw Error('unexpected request '+url);
 }
 const api=c.RedownGoogleDriveStream.create({chrome,fetch});
 const job={id:'job',accountId:'account1',source:{url:'https://source.invalid/image?private=never-send',pageUrl:'https://private.invalid/page'},offset:0,phase:'source'};
 const checkpoint=async j=>{checkpoints.push(structuredClone(j));};
 return {api,job,checkpoint,chrome,fetch,store,requests,uploaded,opts,checkpoints,get tokenCalls(){return tokenCalls;},get maxBody(){return maxBody;},get sourceReads(){return sourceReads;}};
}
for(const opts of [{},{size:36*1024*1024+9},{size:2*1024*1024*1024+17},{size:5*1024*1024,unknown:true}])test('Drive bounded streaming and provider-only metadata '+JSON.stringify(opts),async()=>{
 const f=driveFixture(opts);const result=await f.api.upload(f.job,f.checkpoint,new AbortController().signal);assert.equal(result.bytes,opts.size??1048593);assert.equal(result.name,'real.bin');assert.equal(result.fileId,'file1');assert.ok(f.maxBody<=4*1024*1024);assert.ok(f.tokenCalls.every(x=>x===false));
 assert.doesNotMatch(JSON.stringify(f.requests.filter(x=>x.url.includes('googleapis.com'))),/source.invalid|private.invalid|private=|pageUrl|sourceUrl|frameUrl|linkUrl/);
 assert.equal(f.requests.filter(x=>x.method==='POST').length,1);assert.ok(!f.requests.some(x=>x.url.includes('folders')));
});
test('worker restart probes acknowledged offset and resumes source with strong ETag',async()=>{
 const f=driveFixture({size:10*1024*1024+5,interrupt:true});await assert.rejects(f.api.upload(f.job,f.checkpoint,new AbortController().signal),e=>e.status==='interrupted');assert.equal(f.job.offset,4*1024*1024);
 const recovered=structuredClone(f.job),api=c.RedownGoogleDriveStream.create({chrome:f.chrome,fetch:f.fetch});const result=await api.upload(recovered,f.checkpoint,new AbortController().signal);assert.equal(result.bytes,f.opts.size);assert.equal(f.requests.filter(x=>x.method==='POST').length,1);assert.ok(f.requests.some(x=>x.headers?.['If-Match']==='"stable"'));
});
test('lost final acknowledgement reconciles preallocated file ID without another create or source fetch',async()=>{
 const f=driveFixture({lostFinal:true});await assert.rejects(f.api.upload(f.job,f.checkpoint,new AbortController().signal));const n=f.sourceReads;const result=await c.RedownGoogleDriveStream.create({chrome:f.chrome,fetch:f.fetch}).upload(structuredClone(f.job),f.checkpoint,new AbortController().signal);assert.equal(result.fileId,'file1');assert.equal(f.sourceReads,n);assert.equal(f.requests.filter(x=>x.method==='POST').length,1);
});
for(const opts of [{permission:false},{html:true},{badReceipt:true},{badEndpoint:true},{http:401},{http:403},{http:429},{denied:true}])test('Drive failure never yields a completion '+JSON.stringify(opts),async()=>{const f=driveFixture(opts);await assert.rejects(f.api.upload(f.job,f.checkpoint,new AbortController().signal));});
for(const opts of [{changed:true},{noEtag:true}])test('unsafe source resume is rejected '+JSON.stringify(opts),async()=>{const f=driveFixture({...opts,size:10*1024*1024,interrupt:true});await assert.rejects(f.api.upload(f.job,f.checkpoint,new AbortController().signal));await assert.rejects(c.RedownGoogleDriveStream.create({chrome:f.chrome,fetch:f.fetch}).upload(f.job,f.checkpoint,new AbortController().signal));});
test('Google account change blocks before source or upload; permission scope stays drive.file',async()=>{const f=driveFixture({account:'other'});await assert.rejects(f.api.upload(f.job,f.checkpoint,new AbortController().signal));assert.equal(f.sourceReads,0);assert.equal(f.requests.length,1);});
function counterFixture(initial={}){const data=structuredClone(initial),storage={get:async()=>structuredClone(data),set:async p=>Object.assign(data,structuredClone(p))};return {data,create:()=>c.RedownTransferCounter.create(storage)};}
const receipt=(provider,id)=>({ok:true,verified:true,providerKind:provider,deliveryId:provider+':'+id,location:'https://provider.invalid/file',bytes:1});
test('provider counters survive pruning, restart, duplicate replay and huge totals; failures do not celebrate',async()=>{
 const f=counterFixture(),counter=f.create();for(let i=0;i<150;i++)await counter.record(receipt('dropbox','j'+i));await f.create().record(receipt('dropbox','j0'));assert.equal(f.data.providerSaveCounters.totals.dropbox,'150');assert.equal(f.data.transferCounter.total,'151'); // Preserve the existing global Dropbox 128-receipt window; provider lifetime ledger is independent.
 await counter.record(receipt('google-drive','g'));await counter.record(receipt('onedrive','m'));const event=plain(f.data.providerSaveCounters.event);
 for(const status of ['failed','blocked','cancelled','uncertain','interrupted'])await counter.record({...receipt('google-drive',status),ok:undefined,status,verified:false});assert.deepEqual(plain(f.data.providerSaveCounters.event),event);
 f.data.providerSaveCounters.totals.google='9007199254740992';await f.create().record(receipt('google-drive','g2'));assert.equal(f.data.providerSaveCounters.totals.google,'9007199254740993');
});
test('provider migration uses only retained proven receipts and leaves existing global count intact',async()=>{
 const e={...receipt('dropbox','old'),id:'old-history'},f=counterFixture({transferCounter:{version:1,total:'12345'},transferHistory:[e,e,{ok:true,location:'https://x'},receipt('google-drive','g')]});await f.create().read();assert.equal(f.data.transferCounter.total,'12345');assert.deepEqual(f.data.providerSaveCounters.totals,{google:'1',dropbox:'1',onedrive:'0',cloudflare:'0'});assert.equal(f.data.providerSaveCounters.event,undefined);await f.create().record(e);assert.equal(f.data.providerSaveCounters.totals.dropbox,'1');
});
test('all provider counts are atomic with History; failed storage cannot consume a receipt',async()=>{
 const data={},storage={get:async()=>structuredClone(data),set:async patch=>{if(!data.allowed)throw Error('disk');Object.assign(data,structuredClone(patch));}},counter=c.RedownTransferCounter.create(storage);await assert.rejects(counter.record(receipt('google-drive','id')));data.allowed=true;await counter.record(receipt('google-drive','id'));assert.equal(data.providerSaveCounters.totals.google,'1');assert.equal(data.transferCounter.total,'1');
});
test('Shelf restored receipts stay silent; live success, reduced effects, layout and independent defaults',async()=>{
 const dom=new JSDOM(await read('extension/shelf.html'),{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,listeners=[];let notes=0;
 w.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){return {frequency:{},connect(){},start(){notes++;},stop(){},disconnect(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}close(){return Promise.resolve();}};
 w.chrome={storage:{local:{get:async()=>({providerSaveCounters:{totals:{google:'12'},event:{id:'restored',provider:'google',total:'12',at:Date.now()}}}),set:async()=>{}},onChanged:{addListener:f=>listeners.push(f)}}};w.matchMedia=()=>({matches:false});w.eval(await read('extension/shelf-celebrations.js'));await new Promise(r=>setImmediate(r));
 const card=w.document.querySelector('[data-provider="google"]');assert.equal(card.querySelector('.provider-save-count').textContent,'12');assert.ok(!card.hasAttribute('data-save-celebration'));assert.equal(w.document.getElementById('odometer-sound').checked,false);assert.equal(w.document.getElementById('neon-success-sound').checked,true);
 w.document.documentElement.dataset.shelfTheme='neon';w.document.dispatchEvent(new w.Event('pointerdown'));const changes={providerSaveCounters:{oldValue:{totals:{google:'12'}},newValue:{totals:{google:'13'},event:{id:'live',provider:'google',total:'13',at:Date.now()}}}};listeners[0](changes,'local');assert.equal(card.dataset.saveCelebration,'true');assert.equal(card.querySelector('.provider-plus').hidden,false);assert.equal(notes,3);
 card.removeAttribute('data-save-celebration');listeners[0](changes,'local');assert.ok(!card.hasAttribute('data-save-celebration'));assert.equal(card.querySelectorAll('.provider-success').length,1);assert.equal(notes,3);
 listeners[0]({providerCelebrationPreferences:{newValue:{effects:false}}},'local');listeners[0]({providerSaveCounters:{oldValue:{totals:{google:'13'}},newValue:{totals:{google:'14'},event:{id:'quiet',provider:'google',total:'14',at:Date.now()}}}},'local');assert.ok(!card.hasAttribute('data-save-celebration'));
 assert.equal(notes,3);assert.equal(w.RedownProviderCelebrations.format('12345678901234567890'),'1.234e19');assert.match(await read('extension/popup.js'),/soundEnabled=false/);dom.window.close();
});
function queueFixture(initial={},upload=async job=>({fileId:'file1',name:'real.bin',bytes:9})){
 const store=structuredClone(initial),records=[],events=[];
 const chrome={runtime:{id:'extension',getURL:p=>'chrome-extension://extension/'+p,onStartup:{addListener(){}},onInstalled:{addListener(){}}},permissions:{request:async()=>true},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(store[k])])),set:async patch=>Object.assign(store,structuredClone(patch))}},alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener:f=>events.push(f)}}};
 const api={connect:async()=>{store.googleDriveState={phase:'connected',accountId:'account1'};return 'account1';},upload};
 const provider=c.RedownGoogleDriveProvider.create({chrome,api,record:async r=>records.push(plain(r))});return {store,records,provider,chrome,api};
}
test('Google direct saves are queued with no tabs; concurrent clicks, stale IDs and duplicate callback recovery',async()=>{
 const f=queueFixture({googleDriveState:{phase:'connected',accountId:'account1'}}),info={menuItemId:'provider:google-drive',srcUrl:'https://source.invalid/file'};
 await f.provider.dispatch(info);await f.provider.dispatch(info);await f.provider.pump();assert.equal(f.records.length,1);assert.equal(f.records[0].verified,true);assert.equal(f.records[0].deliveryId,'google-drive:'+f.store.googleDriveJobs[0].id);
 for(const id of ['provider:google-drive:connect','provider:google-drive:save-redown'])await f.provider.dispatch({...info,menuItemId:id});assert.equal(f.store.googleDriveJobs.length,1);
 await Promise.all(Array.from({length:3},()=>f.provider.dispatch({...info})));await f.provider.pump();assert.equal(f.records.length,4);assert.equal(new Set(f.records.map(r=>r.deliveryId)).size,4);
 // Crash after durable completion, before report acknowledgement: same identity.
 const j=f.store.googleDriveJobs[0];j.reported=false;const g=queueFixture(f.store);await g.provider.pump();assert.equal(g.records.length,1);assert.equal(g.records[0].deliveryId,'google-drive:'+j.id);
});
test('Google pending jobs recover, failures never produce success, and external receipts are rejected',async()=>{
 const f=queueFixture({googleDriveJobs:[{id:'pending',status:'active',accountId:'account1',source:{url:'https://source.invalid/f'},offset:0}]},async()=>{throw Object.assign(Error('uncertain'),{status:'uncertain'});});await f.provider.pump();assert.equal(f.records[0].status,'uncertain');assert.notEqual(f.records[0].ok,true);assert.equal(f.records[0].verified,false);
 assert.equal((await f.provider.message({type:'googleDriveReceipt',receipt:{status:'completed'}},{id:'extension',url:'chrome-extension://extension/google-drive-transfer.html'})).ok,false);
 assert.equal((await f.provider.message({type:'googleDriveOpen'},{id:'evil',url:'https://evil.invalid'})).ok,false);
});
test('Dropbox captures only an already-visible matching download name, without forwarding extra provider metadata',async()=>{
 const dom=new JSDOM('<a href="https://source.invalid/file" download="Visible.pdf">Get file</a>',{url:'https://page.invalid/',runScripts:'outside-only'}),a=dom.window.document.querySelector('a');a.getBoundingClientRect=()=>({width:80,height:20,bottom:20,top:0,right:80,left:0});
 const data={'dropbox:state':{phase:'connected',accountId:'account',connectionId:'connection'}},captured=[],records=[];
 const chrome={storage:{local:{get:async k=>({[k]:structuredClone(data[k])}),set:async p=>Object.assign(data,structuredClone(p))}},permissions:{request:async()=>true},alarms:{create:async()=>{},clear:async()=>{}},scripting:{executeScript:async o=>{assert.equal(o.target.tabId,9);assert.equal(o.target.frameIds[0],2);const fn=dom.window.eval('('+o.func.toString()+')');return [{result:fn(...o.args)}];}}};
 const d=context({chrome});vm.runInContext(await read('extension/dropbox-provider.js'),d);
 const provider=d.RedownDropboxProvider.create({chrome,auth:{},api:{upload:async job=>{captured.push(plain(job.source));return {name:job.source.downloadFilename,bytes:1};}},record:async r=>records.push(plain(r))});
 await provider.dispatch({menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/file',pageUrl:'https://page.invalid/',frameId:2},{id:9});await provider.pump();assert.equal(captured[0].downloadFilename,'Visible.pdf');assert.equal(records[0].filename,'Visible.pdf');assert.equal(records[0].pageUrl,'https://page.invalid/');dom.window.close();
});
test('archive migration deduplicates receipt identities and retries unavailable archive without resetting totals',async()=>{
 const data={transferCounter:{version:1,total:'77'}},storage={get:async()=>structuredClone(data),set:async p=>Object.assign(data,structuredClone(p))};let available=false;
 const e={...receipt('dropbox','archived'),id:'archive-row'},archive={page:async()=>{if(!available)throw Error('blocked');return {items:[e,e],total:2};}};
 const counter=c.RedownTransferCounter.create(storage,null,archive);await counter.read();assert.equal(data.providerSaveCounters.recovery,'archive-unavailable-at-migration');available=true;await counter.read();assert.equal(data.providerSaveCounters.totals.dropbox,'1');assert.equal(data.transferCounter.total,'77');assert.equal(data.providerSaveCounters.recovery,undefined);await counter.record(e);assert.equal(data.providerSaveCounters.totals.dropbox,'1');
});
test('Google same-name saves get distinct durable file IDs without overwriting another file',async()=>{
 const f=driveFixture();const first=await f.api.upload(f.job,f.checkpoint,new AbortController().signal),second=await f.api.upload({...f.job,id:'second',fileId:undefined,session:undefined,offset:0,phase:'source'},f.checkpoint,new AbortController().signal);assert.equal(first.name,second.name);assert.notEqual(first.fileId,second.fileId);assert.ok(f.requests.every(r=>r.method!=='PATCH'&&r.method!=='DELETE'));
});
test('pre-cancelled Google saves never fetch source or produce a receipt',async()=>{const f=driveFixture(),controller=new AbortController();controller.abort();await assert.rejects(f.api.upload(f.job,f.checkpoint,controller.signal),e=>e.status==='cancelled');assert.equal(f.requests.length,0);});
