import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import vm from 'node:vm';
const read=p=>readFileSync('extension/'+p,'utf8');
const tick=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
const waitFor=async predicate=>{for(let i=0;i<300;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}assert.ok(predicate(),'condition settled');};
const record=(i=0)=>({id:String(i),filename:i+'.png',sourceUrl:'https://source.invalid/'+i+'.png',ok:true,status:'completed',verified:true,at:new Date().toISOString(),providerKind:'cloudflare',destination:{accountId:'a',bucketName:'private',key:'photos/'+i+'.png'}});
function view(){
 const dom=new JSDOM(read('shelf.html'),{url:'https://extension.invalid/shelf.html#history',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;const close=w.close.bind(w);w.close=()=>{w.dispatchEvent(new w.Event('pagehide'));close();};w.AbortSignal=AbortSignal;w.AbortController=AbortController;
 w.HTMLImageElement.prototype.decode=async()=>{};
 w.URL.revokeObjectURL=()=>{};
 for(const p of ['history-image-source.js','history-image-placeholder.js','history-quick-glance.js'])w.eval(read(p));
 return {dom,w,d:w.document};
}
test('Today reads every local record across archive pages, keeps older pages and Free gallery defaults to ten',async()=>{
 const h=view(),all=Array.from({length:235},(_,i)=>record(i));
 const old=Array.from({length:61},(_,i)=>({...record(235+i),at:'2025-01-01T12:00:00Z'}));
 const context=vm.createContext({indexedDB,IDBKeyRange});vm.runInContext(read('history-archive.js'),context);
 const archive=context.RedownHistoryArchive.create();await archive.importLegacy([...all,...old]);
 assert.equal((await archive.today()).length,235);
 const reads=[];h.w.RedownHistoryArchive={create:()=>({...archive,page:async(o,n)=>{reads.push([o,n]);return archive.page(o,n);}})};
 h.w.chrome={storage:{local:{get:async()=>({transferHistory:[]})},onChanged:{addListener(){}}}};
 h.w.eval(read('shelf-history.js'));await h.w.RedownShelfHistory.open();
 assert.equal(h.d.querySelectorAll('.history-transfer').length,235);
 assert.equal(h.d.querySelector('.history-day').open,true);
 assert.equal(h.d.querySelector('.history-year').open,true);
 assert.equal(h.d.querySelectorAll('.history-image-slot').length,10);
 assert.equal(h.d.querySelector('#history-page-label').textContent,'1 / 3');
 h.d.querySelector('#history-next').click();await waitFor(()=>h.d.querySelector('#history-page-label').textContent==='2 / 3');
 assert.equal(h.d.querySelectorAll('.history-transfer').length,40);assert.equal(reads.at(-1)[0],235);
 await h.w.RedownShelfHistory.open();assert.equal(h.d.querySelectorAll('.history-transfer').length,235);
 h.dom.window.close();
});
function pipeline({count=100,resolve,placeholder,decode}={}){
 const h=view(),observers=[],calls=[],revoked=[],states=[];let active=0,maxActive=0;
 class Observer{constructor(cb,options){this.cb=cb;this.options=options;this.nodes=[];observers.push(this);}observe(n){this.nodes.push(n);}disconnect(){this.stopped=true;}emit(indices){this.cb(this.nodes.map((target,i)=>({target,isIntersecting:indices.includes(i)})));}}
 const root=h.d.querySelector('#history-view');root.hidden=false;
 if(decode)h.w.HTMLImageElement.prototype.decode=decode;
 const source={resolve:async(r,signal,consume)=>{calls.push(r.id);active++;maxActive=Math.max(maxActive,active);try{return resolve?await resolve(r,signal,consume):{image:await consume(new Blob(['png'],{type:'image/png'})),origin:'cloud'};}finally{active--;}}};
 const session=h.w.RedownHistoryQuickGlance.create({root,source,IntersectionObserver:Observer,placeholder,decodeImage:async()=> 'blob:'+Math.random(),revoke:u=>revoked.push(u)});
 for(let i=0;i<count;i++){const row=h.d.createElement('div');root.append(row);session.attach(row,record(i),{onState:state=>states.push({index:i,...state})});}
 session.start();return {...h,session,calls,revoked,observers,states,max:()=>maxActive,root};
}
test('initial ten, three concurrent, batches on approach, bounded retained images, cleanup and interchangeable logo',async()=>{
 const h=pipeline({count:1000,placeholder:{render:d=>{const logo=d.createElement('span');logo.className='static-logo';return logo;}}});
 await tick();assert.equal(h.calls.length,10);assert.ok(h.max()<=3);
 assert.equal(h.d.querySelectorAll('.history-image-slot').length,1000);assert.equal(h.root.querySelectorAll('.history-image-slot img').length,10);
 assert.equal(h.d.querySelectorAll('.static-logo').length,1000);
 h.observers[0].emit([10,11]);await tick();assert.equal(h.calls.length,20);
 for(let i=20;i<150;i+=10){h.observers[0].emit([i]);await tick();assert.ok(h.root.querySelectorAll('.history-image-slot img').length<=30);}
 assert.ok(h.revoked.length>0);
 h.observers[1].emit([140]);assert.equal(h.observers[1].nodes[140].dataset.visible,'true');
 h.observers[1].emit([]);assert.equal(h.observers[1].nodes[140].dataset.visible,'false');
 h.session.dispose();assert.equal(h.root.querySelectorAll('.history-image-slot img').length,0);assert.ok(h.observers.every(o=>o.stopped));h.dom.window.close();
});
test('disposing cancels outstanding requests and discards late responses without wrong-row paint',async()=>{
 const pending=[];const h=pipeline({resolve:(r,signal)=>new Promise(resolve=>pending.push({signal,resolve}))});
 assert.equal(h.calls.length,3);h.session.dispose();assert.ok(pending.every(p=>p.signal.aborted));
 pending.forEach(p=>p.resolve({image:'blob:late',origin:'cloud'}));await tick();assert.equal(h.root.querySelectorAll('.history-image-slot img').length,0);assert.equal(h.root.querySelectorAll('.history-image-origin').length,0);assert.equal(h.revoked.length,3);assert.ok(h.states.every(s=>!s.origin));assert.equal(h.calls.length,3);h.dom.window.close();
});
test('definitive failure stops animation, keeps square and records, and never retries on observer churn',async()=>{
 const h=pipeline({count:12,resolve:async()=>null});await tick();
 assert.equal(h.root.querySelectorAll('[data-state="failed"]').length,10);
 h.observers[0].emit([0]);await tick();assert.equal(h.calls.length,10);
 assert.equal(h.d.querySelectorAll('.history-image-slot').length,12);assert.equal(h.root.querySelectorAll('.history-image-slot img').length,0);
 h.session.dispose();h.dom.window.close();
});
function resolver(options={}){
 const context=vm.createContext({URL,Blob,AbortSignal,Response,console});vm.runInContext(read('history-image-source.js'),context);
 return {api:context.RedownHistoryImageSource,source:context.RedownHistoryImageSource.create(options)};
}
const image=()=>new Response('pixels',{headers:{'content-type':'image/png'}});
test('cloud-first private R2 GET uses exact key, no public URL or provenance; decode failure falls back',async()=>{
 const calls=[],r=record();r.pageUrl='https://private-page.invalid';const before=JSON.stringify(r);
 const {source}=resolver({cloudflare:{request:async(path,options)=>{calls.push(['cloud',path,options]);return image();}},fetch:async(url,options)=>{calls.push(['source',url,options]);return image();}});
 const signal=new AbortController().signal;
 assert.equal((await source.resolve(r,signal)).origin,'cloud');assert.equal(calls.length,1);assert.match(calls[0][1],/private\/objects\/photos\/0.png$/);
 assert.ok(!JSON.stringify(calls).includes(r.sourceUrl));assert.ok(!JSON.stringify(calls).includes(r.pageUrl));
 let decodes=0;const preview=await source.resolve(r,signal,()=>{if(!decodes++)throw Error('bad cloud bytes');return 'decoded';});
 assert.equal(preview.image,'decoded');assert.equal(preview.origin,'source');
 assert.equal(calls.at(-1)[0],'source');assert.equal(calls.at(-1)[2].credentials,'omit');assert.equal(calls.at(-1)[2].referrerPolicy,'no-referrer');assert.equal(JSON.stringify(r),before);
});
test('unsupported/disconnected cloud falls back once, both failures yield no image, MIME and byte limits apply',async()=>{
 const calls=[],{source,api}=resolver({cloudflare:{request:async()=>{throw Error('disconnected');}},fetch:async url=>{calls.push(url);return new Response('html',{headers:{'content-type':'text/html'}});}});
 const r=record(),before=JSON.stringify(r);assert.equal(await source.resolve(r,new AbortController().signal),null);assert.equal(calls.length,1);assert.equal(JSON.stringify(r),before);
 assert.equal(api.eligible({...r,filename:'Web file'}),true);assert.equal(api.eligible({filename:'document.pdf'}),false);
 await assert.rejects(()=>api.imageBlob(new Response('x',{headers:{'content-type':'image/png','content-length':api.MAX_BYTES+1}})));
 let n=0;const stream=new ReadableStream({pull(c){if(n++<5)c.enqueue(new Uint8Array(1024*1024));else c.close();}});
 await assert.rejects(()=>api.imageBlob(new Response(stream,{headers:{'content-type':'image/png'}})));
});
test('Dropbox thumbnail uses recorded file ID and namespace with current scope, OneDrive uses thumbnail without token forwarding',async()=>{
 const calls=[],{source}=resolver({dropbox:{ready:async d=>{assert.equal(d.namespace,'123');return {token:'secret',namespace:'123'};}},
  onedrive:{ready:async d=>{assert.equal(d.driveId,'drive');return {token:'secret'};}},chrome:{storage:{local:{get:async()=>({'dropbox:auth':{accountId:'a',connectionId:'c',namespace:'123'},'onedrive:auth':{accountId:'a',driveId:'drive',rootId:'root',connectionId:'current'}})}}},
  fetch:async(url,options)=>{calls.push([url,options]);return url.includes('graph.microsoft')?Response.json({url:'https://thumb.provider.invalid/image'}):image();}});
 const signal=new AbortController().signal;
 assert.equal((await source.resolve({...record(),providerKind:'dropbox',destination:{accountId:'a',connectionId:'c',namespace:'123',fileId:'id:exact'}},signal)).origin,'cloud');
 assert.match(calls[0][1].headers['Dropbox-API-Arg'],/id:exact/);assert.ok(!JSON.stringify(calls).includes('source.invalid'));
 assert.equal((await source.resolve({...record(),providerKind:'onedrive',destination:{accountId:'a',driveId:'drive',rootId:'root',itemId:'item'}},signal)).origin,'cloud');
 assert.match(calls[1][0],/thumbnails\/0\/medium$/);assert.equal(calls[2][1].headers,undefined);
});
test('stable square, contained aspect ratio, theme primitives, paused offscreen and reduced motion stylesheet contract',()=>{
 const css=read('shelf.css');assert.match(css,/\.history-image-slot\{[^}]*aspect-ratio:1\/1/);
 assert.match(css,/object-fit:contain/);assert.match(css,/animation-play-state:paused/);
 assert.match(css,/data-visible="true".*data-state="loading"/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.history-image-placeholder i/);
});
test('Premium gate enables Today previews once; revocation preserves records',async()=>{
 const h=view(),listeners=[],calls=[];
 h.d.querySelector('#history-view').hidden=false;
 const all=Array.from({length:70},(_,i)=>record(i));
 h.w.IntersectionObserver=class{observe(){}disconnect(){}};
 h.w.RedownHistoryImageSource.shared=()=>({resolve:async(r,signal)=>{calls.push(r.id);return null;}});
 h.w.RedownHistoryArchive={create:()=>({importLegacy:async()=>{},today:async()=>all,page:async()=>({items:all.slice(0,40),total:70})})};
 let enabled=true;
 h.w.chrome={storage:{local:{get:async()=>({transferHistory:[],quickGlancePremiumEnabled:enabled})},onChanged:{addListener:f=>listeners.push(f)}}};
 h.w.eval(read('shelf-history.js'));await h.w.RedownShelfHistory.open();await tick();
 assert.equal(h.d.querySelectorAll('.history-transfer').length,70);assert.equal(h.d.querySelectorAll('.history-image-slot').length,70);assert.equal(calls.length,10);
 h.d.documentElement.dataset.shelfTheme='neon';await tick();assert.equal(calls.length,10);
 enabled=false;listeners[0]({quickGlancePremiumEnabled:{newValue:false}},'local');await tick();
 assert.equal(h.d.querySelectorAll('.history-image-slot').length,10);assert.equal(h.d.querySelectorAll('.history-transfer').length,70);
 enabled=true;listeners[0]({quickGlancePremiumEnabled:{newValue:true}},'local');
 await waitFor(()=>h.d.querySelectorAll('.history-image-slot').length===70);
 const beforeReconnect=calls.length;
 listeners[0]({googleDriveState:{oldValue:{phase:'disconnected'},newValue:{phase:'connected',accountId:'a'}}},'local');
 await waitFor(()=>calls.length>beforeReconnect);
 assert.equal(h.d.querySelectorAll('.history-transfer').length,70);

 h.dom.window.close();
});
test('Google preview reuses noninteractive drive.file auth and checks account; thumbnail URL gets no token',async()=>{
 const calls=[],tokens=[];
 const chrome={runtime:{id:'mkadkgpekmkknfbniacdlmgikihjjepf',getManifest:()=>({oauth2:{client_id:'123-valid.apps.googleusercontent.com',scopes:['https://www.googleapis.com/auth/drive.file']}})},
  identity:{getAuthToken:async o=>{tokens.push(o);return {token:'secret',grantedScopes:o.scopes};}},storage:{local:{set:async()=>{}}}};
 const context=vm.createContext({URL,AbortSignal,chrome,fetch:async(url,options)=>{calls.push([url,options]);
  if(url.includes('/about?'))return Response.json({user:{permissionId:'account'}});
  if(url.includes('/files/'))return Response.json({id:'file',thumbnailLink:'https://lh3.googleusercontent.com/temporary',trashed:false});return image();}});
 vm.runInContext(read('google-drive-stream.js'),context);
 const api=context.RedownGoogleDriveStream.create({resolveName:()=>''}),signal=new AbortController().signal;
 assert.ok((await api.preview({accountId:'account',fileId:'file'},signal)).ok);
 assert.equal(tokens[0].interactive,false);assert.equal(tokens[0].scopes.length,1);
 assert.equal(calls.at(-1)[1].headers,undefined);assert.equal(calls.at(-1)[1].referrerPolicy,'no-referrer');
 await assert.rejects(()=>api.preview({accountId:'different',fileId:'file'},signal));
 assert.equal(calls.filter(([url])=>url.includes('/files/')).length,1);
});
test('cancel while provider auth is pending settles promptly, cancels late bytes, and never starts source fallback',async()=>{
 let finish,cancelled=false,fallback=0;
 const {source}=resolver({cloudflare:{request:()=>new Promise(r=>finish=r)},fetch:async()=>{fallback++;return image();}});
 const controller=new AbortController(),promise=source.resolve(record(),controller.signal);await tick();
 controller.abort();await assert.rejects(promise);
 finish(new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'content-type':'image/png'}}));
 await tick();assert.equal(cancelled,true);assert.equal(fallback,0);
});
test('old Dropbox receipts cannot change the newly connected account state; failed/pending rows can use source only',async()=>{
 let ready=0,reads=0;
 const {source}=resolver({chrome:{storage:{local:{get:async()=>({'dropbox:auth':{accountId:'different',connectionId:'new',namespace:'999'}})}}},dropbox:{ready:async()=>{ready++;throw Error();}},fetch:async()=>{reads++;return image();}});
 const r={...record(),providerKind:'dropbox',destination:{accountId:'old',connectionId:'old',namespace:'123',fileId:'id:old'}},before=JSON.stringify(r);
 assert.ok(await source.resolve(r,new AbortController().signal));assert.equal(ready,0);assert.equal(JSON.stringify(r),before);
 for(const ok of [false,undefined])assert.ok(await source.resolve({...r,ok},new AbortController().signal));
 assert.equal(reads,3);assert.equal(ready,0);
});

test('late decode from an evicted slot cannot cancel or fail its replacement request',async()=>{
 const decodes=[];
 const h=pipeline({count:100,decode:function(){return new Promise((resolve,reject)=>decodes.push({resolve,reject,image:this}));}});
 await tick();assert.equal(decodes.length,3);assert.equal(h.root.querySelector('.history-image-origin'),null);assert.ok(h.states.every(s=>!s.origin));
 h.observers[0].emit([50]);decodes[1].resolve();await tick();assert.equal(decodes.length,4);
 h.observers[0].emit([0]);decodes[2].resolve();await tick();assert.equal(decodes.length,5);
 // Entry zero has a fresh request now, while its original decode is pending.
 decodes[0].resolve();await tick();
 decodes[4].resolve();await tick();
 assert.equal(h.observers[0].nodes[0].dataset.state,'ready');
 assert.equal(h.observers[0].nodes[0].querySelector('img'),decodes[4].image);
 assert.equal(h.observers[0].nodes[0].querySelector('.history-image-origin'),null);assert.equal(h.states.filter(s=>s.index===0).at(-1).origin,'cloud');
 h.session.dispose();assert.ok(h.states.slice(-100).every(s=>!s.origin));decodes.forEach(d=>d.resolve());await tick();h.dom.window.close();
});

test('verified public R2 receipt is cloud and Google preview is cloud',async()=>{
 const calls=[];
 const {source}=resolver({
  cloudflare:{request:async()=>{throw Error('signed out');}},
  google:{preview:async d=>{assert.equal(d.fileId,'file');return image();}},
  chrome:{storage:{local:{get:async()=>({googleDriveState:{phase:'connected',accountId:'a'}})}}},
  fetch:async(url,options)=>{calls.push(url);assert.equal(options.referrerPolicy,'no-referrer');return image();}
 });
 const signal=new AbortController().signal,r=record();
 r.destination.publicUrl='https://bucket.invalid/photos/0.png';
 assert.equal((await source.resolve(r,signal)).origin,'cloud');
 assert.deepEqual(calls,[r.destination.publicUrl]);
 assert.equal((await source.resolve({...r,providerKind:'google-drive',destination:{accountId:'a',fileId:'file'}},signal)).origin,'cloud');
});

test('source dots appear independently of successful and failed transfer status',async()=>{
 const h=view();
 const saved=record(),failed={...record(1),ok:false,verified:false,status:'failed'};
 h.d.querySelector('#history-view').hidden=false;
 h.w.RedownHistoryImageSource.shared=()=>({resolve:async()=>({image:'blob:preview',origin:'source'})});
 h.w.chrome={storage:{local:{get:async()=>({transferHistory:[saved,failed],quickGlancePremiumEnabled:true})},onChanged:{addListener(){}}}};
 h.w.eval(read('shelf-history.js'));
 await h.w.RedownShelfHistory.open();await tick();
 const rows=[...h.d.querySelectorAll('.history-transfer')];
 assert.equal(rows.length,2);
 assert.ok(rows.some(row=>row.dataset.state==='failed'));
 assert.ok(rows.some(row=>row.dataset.state==='success'||row.dataset.state==='verified'));
 for(const row of rows){
  assert.ok(row.querySelector('.history-dot'));
  assert.equal(row.querySelectorAll('.history-dot').length,1);
  assert.equal(row.querySelector('.history-image-origin'),null);
  assert.equal(row.dataset.previewOrigin,'source');
  assert.match(row.querySelector('.history-dot').getAttribute('aria-label'),/Transfer: .*Preview from original source/);
 }
 h.dom.window.close();
});

test('enabling Premium on an older page keeps the page and open date, loading only its previews',async()=>{
 const h=view(),listeners=[],calls=[];
 try{
  h.d.querySelector('#history-view').hidden=false;
  const today=Array.from({length:41},(_,i)=>record(i));
  const old={...record(41),at:'2024-05-14T12:00:00Z'};
  let enabled=false;
  h.w.chrome={storage:{local:{get:async()=>({transferHistory:[...today,old],quickGlancePremiumEnabled:enabled})},onChanged:{addListener:f=>listeners.push(f)}}};
  h.w.RedownHistoryImageSource.shared=()=>({resolve:async row=>{
   calls.push(row.id);
   return {image:'blob:older-preview',origin:'cloud'};
  }});
  h.w.eval(read('shelf-history.js'));
  await h.w.RedownShelfHistory.open();
  h.d.querySelector('#history-next').click();
  await waitFor(()=>h.d.querySelector('#history-page-label').textContent==='2 / 2');
  for(const group of h.d.querySelectorAll('#history-timeline details')){
   if(!group.open&&group.querySelector('.history-transfer'))group.querySelector('summary').click();
  }
  await tick();
  const beforePremium=calls.length;
  enabled=true;
  listeners[0]({quickGlancePremiumEnabled:{newValue:true}},'local');
  await waitFor(()=>h.d.querySelector('[data-preview-origin=cloud]'));
  assert.equal(h.d.querySelector('#history-page-label').textContent,'2 / 2');
  assert.equal(h.d.querySelector('.history-day').open,true);
  assert.equal(h.d.querySelector('.history-transfer').dataset.previewOrigin,'cloud');
  assert.deepEqual(calls.slice(beforePremium),[old.id]);
  h.d.querySelector('#history-view').hidden=true;
  enabled=false;
  listeners[0]({quickGlancePremiumEnabled:{newValue:false}},'local');
  h.d.querySelector('#history-view').hidden=false;
  await h.w.RedownShelfHistory.open();
  assert.equal(h.d.querySelector('#history-page-label').textContent,'2 / 2');
  assert.equal(h.d.querySelector('.history-day').open,true);
  assert.equal(h.d.querySelector('.history-image-slot'),null);

 }finally{h.dom.window.close();}
});

test('Free policy counts newest total Today records with stable ties and validated single quota',()=>{
 const h=view();h.d.querySelector('#history-timeline').remove();h.w.eval(read('shelf-history.js'));
 const api=h.w.RedownShelfHistory,now=new Date(),all=Array.from({length:25},(_,i)=>({...record(i),at:new Date(now.getTime()-i*1000).toISOString(),filename:i%2?'file.pdf':'image.png',ok:i%3===0?false:true}));
 const old={...record(30),at:new Date(now.getFullYear()-1,0,1).toISOString()};
 // Pin the records to local noon so the test also works just after midnight.
 all.forEach((r,i)=>r.at=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12,0,25-i).toISOString());
 for(const n of [0,5,10,20,100]){
  const selected=api.galleryRecords([...all].reverse().concat(old),false,n,now);
  assert.deepEqual([...selected].map(r=>r.id),all.slice(0,n).map(r=>r.id));
 }
 for(const n of [undefined,null,-1,2.5,'5',NaN,Infinity])assert.equal(api.galleryLimit(n),10);
 assert.equal(api.galleryRecords([old,...all],true,0,now).size,26);
 const ties=[record(41),record(42)];ties[1].at=ties[0].at;
 assert.equal([...api.galleryRecords(ties,false,1)][0],ties[0]);h.dom.window.close();
});

async function galleryView(records,{premium=true,resolve=async()=>({image:'blob:decoded',origin:'cloud'})}={}){
 const h=view(),listeners=[];h.d.querySelector('#history-view').hidden=false;
 h.w.IntersectionObserver=class{observe(){}disconnect(){}};
 h.w.RedownHistoryImageSource.shared=()=>({resolve});
 h.w.RedownHistoryNavigation={openable:r=>r.ok===true,open:r=>h.opened=r.id,cloudTarget:()=>null};
 h.w.chrome={storage:{local:{get:async()=>({transferHistory:records,quickGlancePremiumEnabled:premium})},onChanged:{addListener:f=>listeners.push(f)}},runtime:{sendMessage:async message=>{
  h.messages.push(message);return message.type==='cfObjectProperties'?{ok:true,object:{key:records[0].destination.key}}:{ok:true,addresses:[{state:'configured',label:'Custom',base:'https://cdn.invalid/'}]};
 }}};
 h.messages=[];h.listeners=listeners;h.w.eval(read('shelf-history.js'));await h.w.RedownShelfHistory.open();await tick();return h;
}
test('rendered gallery success order, minimal header, short/long More, genuine navigation and independent refreshed URLs',async()=>{
 const saved={...record(),pageUrl:'https://page.invalid/view',srcUrl:'https://media.invalid/image',frameUrl:'https://frame.invalid/',linkUrl:'https://link.invalid/',location:'https://recorded.invalid/file'};
 const h=await galleryView([saved,{...record(1),filename:'long-'.repeat(100)+'.png'},{...record(2),sourceUrl:''}]);
 try{
  const rows=h.d.querySelectorAll('.history-transfer');
  for(const row of rows){
   assert.equal(row.querySelectorAll('.history-dot').length,1);assert.equal(row.querySelector('.history-image-origin'),null);
   const body=row.querySelector('.history-transfer-body');
   assert.deepEqual([...body.children].map(n=>n.className),['history-entry-head','history-image-slot','history-more','history-url-disclosure history-urls']);
   const head=body.firstElementChild;assert.deepEqual([...head.children].map(n=>n.tagName),['STRONG','TIME']);
   assert.ok(!head.querySelector('button,details,small'));assert.equal(row.querySelector('.history-more').open,false);
   assert.match(row.querySelector('.history-more').textContent,/Successful \(verified\).*Cloudflare R2/s);
   assert.match(row.querySelector('.history-more').textContent,/accountId: a/);
   assert.equal(row.dataset.previewOrigin,'cloud');assert.match(row.querySelector('.history-dot').getAttribute('aria-label'),/Successful \(verified\).*your cloud/);
  }
  assert.match(rows[2].querySelector('.history-urls').textContent,/URLs · 0.*No recorded URLs/s);
  rows[0].querySelector('.history-go-to').click();assert.equal(h.opened,saved.id);
  const urls=rows[0].querySelector('.history-urls');
  for(const key of ['sourceUrl','pageUrl','srcUrl','frameUrl','linkUrl','location'])assert.ok(urls.textContent.includes(saved[key]));
  assert.equal(urls.querySelector('a'),null);urls.open=true;await waitFor(()=>h.messages.length===2);
  assert.equal(h.messages.length,2);assert.match(urls.textContent,/https:\/\/cdn.invalid\/photos\/0.png/);
  urls.dispatchEvent(new h.w.Event('toggle'));await tick();assert.equal(h.messages.length,2);
  h.w.dispatchEvent(new h.w.Event('pagehide'));assert.equal(rows[0].dataset.previewOrigin,undefined);
 }finally{h.dom.window.close();}
});
test('failed gallery recovery, exhausted image collapse state, pending truth and unsafe URLs',async()=>{
 const failed={...record(1),ok:false,status:'failed',verified:false,error:'Full recorded failure diagnostics'};
 const h=await galleryView([failed,{...record(2),ok:false,status:'failed'},{...record(3),ok:undefined,status:'pending',verified:false},{...record(4),ok:false,sourceUrl:'https://user:secret@unsafe.invalid/img.png',pageUrl:'https://parent.invalid/page'}],{resolve:async r=>r.id==='2'?null:{image:'blob:decoded',origin:'source'}});
 try{
  const rows=h.d.querySelectorAll('.history-transfer');const row=rows[0];
  assert.equal(row.dataset.state,'failed');assert.equal(row.dataset.previewOrigin,'source');
  assert.equal(row.querySelector('.history-entry-head strong').textContent,'1.png');
  const recovery=row.querySelector('.history-recovery-link');assert.equal(recovery.href,failed.sourceUrl);assert.equal(recovery.referrerPolicy,'no-referrer');
  assert.equal(row.querySelector('.history-urls'),null);const more=row.querySelector('.history-more');
  more.open=true;await waitFor(()=>recovery.hidden);assert.equal(recovery.hidden,true);
  assert.ok(more.textContent.includes(failed.sourceUrl));assert.ok(more.textContent.includes(failed.error));assert.match(more.textContent,/bucketName: private/);
  more.open=false;await waitFor(()=>!recovery.hidden);assert.equal(recovery.hidden,false);
  assert.equal(rows[1].querySelector('.history-image-slot').dataset.state,'failed');assert.equal(rows[1].dataset.previewOrigin,undefined);
  assert.ok(rows[1].querySelector('.history-recovery-link'));assert.equal(rows[2].dataset.state,'unknown');
  assert.match(rows[2].querySelector('.history-dot').getAttribute('aria-label'),/pending.*original source/);
  assert.equal(rows[3].querySelector('.history-recovery-link').href,'https://parent.invalid/page');
 }finally{h.dom.window.close();}
});
test('mixed Free DOM preserves all Today records and Classic outside total-record quota',async()=>{
 const all=Array.from({length:15},(_,i)=>({...record(i),filename:i<5?'file.pdf':i+'.png',sourceUrl:i<5?'https://source.invalid/file.pdf':record(i).sourceUrl,destination:{...record(i).destination,key:i<5?'file.pdf':i+'.png'}}));
 all.forEach(r=>r.at=all[0].at);
 const h=await galleryView(all,{premium:false,resolve:async()=>null});
 try{
  assert.equal(h.d.querySelectorAll('.history-transfer').length,15);assert.equal(h.d.querySelectorAll('.history-gallery').length,10);
  assert.equal(h.d.querySelectorAll('.history-image-slot').length,5);assert.equal(h.d.querySelectorAll('.history-transfer:not(.history-gallery) .history-more').length,0);
 }finally{h.dom.window.close();}
});
