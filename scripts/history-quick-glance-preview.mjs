import {createServer} from 'node:http';
import {readFile,writeFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
// Local mock only: never installs the extension or connects a provider.
const base=process.cwd(),out=join(base,'work/quick-glance');
await mkdir(out,{recursive:true});
const scripts=await Promise.all(['history-image-source.js','history-image-placeholder.js','history-quick-glance.js','shelf-history.js'].map(p=>readFile('extension/'+p,'utf8')));
const html=await readFile('extension/shelf.html','utf8');
// A tiny synthetic 80×160 two-color PNG verifies retained aspect ratio.
const portrait=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAFAAAACgCAIAAAAU4XzjAAAA0klEQVR4nO3PQQ2AQBDAwFWFHiTxxtt5QQZJd5IK6Mz1nlXN7wfAwMDAwMDAawKuB1wPuB5wPeB6wPWA6wHXA64HXA+4HnA94HrA9YDrAdcDrgdcD7gecD3gesD1gOsB1wOuB1wPuB5wPeB6wPWA6wHXA64HXA+43pz7WRVwPeB6wPWA6wHXA64HXA+4HnA94HrA9YDrAdcDrgdcD7gecD3gesD1gOsB1wOuB1wPuB5wPeB6wPWA6wHXA64HXA+4HnA94HrA9YDrAdcDrgdcbx34A6bG7wtxdq1ZAAAAAElFTkSuQmCC','base64');
// Optional local photograph for aesthetic review; admission/aspect-ratio tests
// always use the deterministic portrait above. No remote fixture fetches.
const galleryPhoto=process.env.HISTORY_GALLERY_PHOTO?await readFile(process.env.HISTORY_GALLERY_PHOTO):portrait;
const setup=`
 document.getElementById('clouds-view').hidden=true;document.getElementById('history-view').hidden=false;
 document.querySelectorAll('nav[aria-label=Shelf] a').forEach(a=>a.removeAttribute('aria-current'));document.querySelector('nav a[href="#history"]').setAttribute('aria-current','page');
 const at=new Date().toISOString();const records=Array.from({length:120},(_,i)=>({id:String(i),at,ok:true,verified:true,status:'completed',filename:'image'+i+'.png',sourceUrl:location.origin+'/source.png?id='+i,providerKind:'cloudflare',destination:{accountId:'a',bucketName:'private',key:i+'.png'}}));
 globalThis.calls=[];globalThis.changes=[];
 globalThis.chrome={storage:{local:{get:async()=>({transferHistory:records,quickGlancePremiumEnabled:true})},onChanged:{addListener:f=>changes.push(f)}}};
 globalThis.RedownHistoryArchive={create:()=>({importLegacy:async()=>{},today:async()=>records,page:async()=>({items:records.slice(0,40),total:records.length})})};
 let release;const gate=new Promise(r=>release=r);globalThis.releaseImages=release;
 globalThis.RedownCloudflareApi={request:async(path,options)=>{const id=path.split('/').pop().split('.')[0];calls.push({cloud:id});await gate;return fetch('/cloud.png?id='+id,{signal:options.signal});}};
`;
const recoverySetup=setup.replace("globalThis.calls=[];", `
 records.splice(5);
 records.forEach(r=>r.sourceUrl+='&recovery=1');
 records[0].filename='Orbital-Portrait.png';
 records[1].filename='Unavailable-cloud-and-source.png';Object.assign(records[1],{ok:false,verified:false,status:'failed',error:'Original image and cloud preview unavailable.'});
 records[2].filename='Source-fallback.png';
 records[3].filename='A-very-long-filename-with-a-meaningful-description-of-the-photograph-that-wraps-at-narrow-widths.png';
 records[4].filename='Unavailable-original.png';
 for(const i of [3,4])Object.assign(records[i],{ok:false,verified:false,status:'failed',error:'Recorded upload failure: destination unavailable. No file was saved.',pageUrl:location.origin+'/parent-page'});
 globalThis.calls=[];`).replace("fetch('/cloud.png?id='+id", "fetch('/cloud.png?recovery=1&id='+id");
const makeFixture=setup=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('</body>',`<script>${setup}\n${scripts.join('\n')}\nRedownShelfHistory.open();</script></body>`);
const fixture=makeFixture(setup),recoveryFixture=makeFixture(recoverySetup);
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost'),p=u.pathname;
 if(p==='/cloud.png'||p==='/source.png'){
  const fail=p==='/cloud.png'?['1','2'].includes(u.searchParams.get('id')):['1','4'].includes(u.searchParams.get('id'));
  res.statusCode=fail?404:200;res.setHeader('Content-Type',fail?'text/plain':'image/png');res.end(fail?'unavailable':u.searchParams.has('recovery')?galleryPhoto:portrait);return;
 }
 if(p.includes('..'))throw Error('path');res.setHeader('Content-Type',p==='/'?'text/html':extname(p)==='.css'?'text/css':'application/octet-stream');res.end(p==='/'?(u.searchParams.has('recovery')?recoveryFixture:fixture):await readFile(join(base,'extension',p)));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=await mkdtemp(join(tmpdir(),'redown-quick-glance-'));
const browser=spawn('chromium',['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});let ws;
try{
 let port;for(let i=0;i<100;i++){try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();
 ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>reject(Error('CDP timeout')),10000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}console.log(await evaluate('JSON.stringify({calls,states:[...document.querySelectorAll(".history-image-slot")].slice(0,12).map(n=>n.dataset)})'));throw Error('Timeout: '+expression);};
 await call('Emulation.setDeviceMetricsOverride',{width:360,height:850,deviceScaleFactor:1,mobile:false},sessionId);
 await call('Emulation.setTimezoneOverride',{timezoneId:'America/Chicago'},sessionId);
 await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/#history'},sessionId);
 await wait('document.querySelectorAll(".history-image-slot").length===120 && calls.length===3');
 await new Promise(r=>setTimeout(r,350));
 const geometry=`[...document.querySelectorAll('.history-image-slot')].slice(0,10).map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top};})`;
 const before=await evaluate(geometry);before.forEach(r=>assert.ok(Math.abs(r.width-r.height)<.1));
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.history-image-slot[data-visible="true"] i')).animationPlayState`),'running');
 await writeFile(join(out,'loading.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'},sessionId)).data,'base64'));
 await evaluate('releaseImages()');await wait('calls.length===10 && document.querySelectorAll(".history-image-slot[data-state=ready]").length===9');
 const after=await evaluate(geometry);assert.deepEqual(after,before);
 assert.equal(await evaluate('document.querySelectorAll(".history-image-slot[data-state=failed]").length'),1);
 assert.equal(await evaluate(`document.querySelector('.history-image-slot img').naturalHeight/document.querySelector('.history-image-slot img').naturalWidth`),2);
 const themes=[];
 for(const theme of ['porcelain','midnight','ocean','neon']){
  await evaluate(`document.documentElement.dataset.shelfTheme='${theme}'`);const geometryNow=await evaluate(geometry);geometryNow.forEach(r=>assert.ok(Math.abs(r.width-r.height)<.1));themes.push(theme);
  await writeFile(join(out,theme+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'},sessionId)).data,'base64'));
 }
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.history-image-placeholder i')).animationName`),'none');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]},sessionId);
 await evaluate(`document.querySelectorAll('.history-image-slot')[30].scrollIntoView()`);await wait('calls.length>10');await new Promise(r=>setTimeout(r,300));
 const bounded=await evaluate(`({requests:calls.length,images:document.querySelectorAll('.history-image-slot img').length,rows:document.querySelectorAll('.history-transfer').length})`);
 assert.ok(bounded.requests<50);assert.ok(bounded.images<=30);assert.equal(bounded.rows,120);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.history-image-slot i')).animationPlayState`),'paused');
 await evaluate(`location.hash='#clouds'`);await wait('document.querySelectorAll(".history-image-slot img").length===0');
 // Additional production-DOM recovery fixture: every scenario in all themes.
 await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?recovery#history'},sessionId);
 await wait('document.querySelectorAll(".history-transfer").length===5');await evaluate('releaseImages()');
 await wait('document.querySelectorAll(".history-image-slot[data-state=ready]").length===3 && document.querySelectorAll(".history-image-slot[data-state=failed]").length===2');
 const capture=async name=>{
  // Force style resolution, then allow the production decoded-image crossfade
  // to settle before capturing offscreen content in a full-page screenshot.
  await evaluate(`[...document.querySelectorAll('.history-image-slot img')].map(n=>getComputedStyle(n).opacity)`);
  await new Promise(r=>setTimeout(r,300));
  assert.ok(await evaluate(`[...document.querySelectorAll('.history-image-slot[data-state="ready"] img')].every(n=>Number(getComputedStyle(n).opacity)>.99)`));
  await writeFile(join(out,name+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId)).data,'base64'));
 };
 const rowGeometry=()=>evaluate(`(()=>{
  const rows=[...document.querySelectorAll('.history-transfer')];
  return rows.map(row=>{const head=row.querySelector('.history-entry-head'),name=head.querySelector('strong').getBoundingClientRect(),time=head.querySelector('time').getBoundingClientRect();return {oneDot:row.querySelectorAll('.history-dot').length===1,noOverlay:!row.querySelector('.history-image-origin'),fits:time.left>=name.right-1&&time.right<=head.getBoundingClientRect().right+1,dotColor:getComputedStyle(row.querySelector('.history-dot')).backgroundColor,titleColor:getComputedStyle(head.querySelector('strong')).color};});
 })()`);
 const visual=[];
 for(const theme of themes){
  await evaluate(`document.documentElement.dataset.shelfTheme='${theme}';document.querySelector('.history-transfers').scrollIntoView()`);
  const geometry=await rowGeometry();geometry.forEach(row=>assert.ok(row.oneDot&&row.noOverlay&&row.fits));
  assert.notEqual(geometry[0].dotColor,geometry[2].dotColor);
  await capture(theme+'-cloud');
  await evaluate(`document.querySelectorAll('.history-transfer')[2].scrollIntoView()`);await capture(theme+'-source-recovery');
  assert.equal(await evaluate(`getComputedStyle(document.querySelectorAll('.history-transfer')[4].querySelector('.history-image-slot')).display`),'none');
  await evaluate(`document.querySelectorAll('.history-transfer')[4].scrollIntoView()`);await capture(theme+'-no-image');
  await evaluate(`var first=document.querySelector('.history-transfer');first.querySelector('.history-more').open=true;first.querySelector('.history-urls').open=true;first.scrollIntoView()`);
  await new Promise(r=>setTimeout(r,100));await capture(theme+'-expanded');
  await evaluate(`document.querySelectorAll('.history-more,.history-urls').forEach(n=>n.open=false);document.querySelectorAll('.history-transfer')[3].querySelector('.history-more').open=true`);
  await new Promise(r=>setTimeout(r,60));
  assert.equal(await evaluate(`getComputedStyle(document.querySelectorAll('.history-transfer')[3].querySelector('.history-recovery-link')).display`),'none');
  await capture(theme+'-failed-expanded');
  await evaluate(`document.querySelectorAll('.history-more,.history-urls').forEach(n=>n.open=false)`);
  await call('Emulation.setDeviceMetricsOverride',{width:240,height:850,deviceScaleFactor:1,mobile:false},sessionId);
  await evaluate(`document.querySelectorAll('.history-transfer')[3].scrollIntoView()`);
  (await rowGeometry()).forEach(row=>assert.ok(row.fits));await capture(theme+'-narrow');
  // 360px panel at 200% zoom has an effective 180 CSS-pixel viewport.
  await call('Emulation.setDeviceMetricsOverride',{width:180,height:425,deviceScaleFactor:2,mobile:false},sessionId);
  await evaluate(`document.querySelectorAll('.history-transfer')[3].scrollIntoView()`);
  (await rowGeometry()).forEach(row=>assert.ok(row.fits));await capture(theme+'-zoom200');
  await call('Emulation.setDeviceMetricsOverride',{width:360,height:850,deviceScaleFactor:1,mobile:false},sessionId);
  visual.push({theme,geometry,narrow:true,zoom200:true});
 }
 await evaluate(`document.querySelectorAll('.history-more,.history-urls').forEach(n=>n.open=false);document.querySelector('.history-more>summary').focus()`);
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,text:' '},sessionId);
 await call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32},sessionId);
 await wait('document.querySelector(".history-more").open');
 const results={photographicReview:!!process.env.HISTORY_GALLERY_PHOTO,keyboardDisclosure:true,scope:'Local HTTP mock in ordinary Chromium, not installed extension/provider proof',browser:version.Browser,initialPreviewJobs:10,geometryUnchanged:true,portraitAspectRatio:2,reducedMotion:true,themes,bounded,cleanup:true,visual};
 await writeFile(join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
}finally{ws?.close();browser.kill();server.close();await new Promise(r=>setTimeout(r,100));await rm(profile,{recursive:true,force:true,maxRetries:5});}
