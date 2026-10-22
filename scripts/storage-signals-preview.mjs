// Local mocked HTML interaction evidence only. Never loads the extension or contacts Cloudflare.
// Run from the repository root: node scripts/storage-signals-preview.mjs [output-directory]
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const output=resolve(process.argv[2]||'work/storage-signals-preview');await mkdir(output,{recursive:true});
const html=await readFile('extension/options.html','utf8'),source=await readFile('extension/options.js','utf8');
const signals=await readFile('extension/storage-signals.js','utf8');
const dom=new JSDOM(html),d=dom.window.document;d.getElementById('cloudflare-panel').hidden=false;
const font=await readFile('extension/fonts/dm-sans-latin-variable.woff');
const css=d.querySelector('style').textContent.replace('url("fonts/dm-sans-latin-variable.woff")',`url("data:font/woff;base64,${font.toString('base64')}")`);
const bucketCode=source.slice(source.indexOf('async function refreshBuckets(){'),source.indexOf('async function addBucketPreset('));
const modes=source.slice(source.indexOf('function applyDebugMode(){'),source.indexOf('(async()=>{\n  const stored=await chrome.storage.local.get(["profiles"'));
const body=`<div class="wrap"><header><p>Local mocked preview · no extension or Cloudflare connection</p>${d.getElementById('settings-disclosure').outerHTML}</header>${d.getElementById('cloudflare-panel').outerHTML}<section id="following-section"><h2>Right-click Menu</h2></section>${d.querySelector('[data-debug-detail]').outerHTML}<div id="r2-setup" hidden></div><a id="r2-dashboard" hidden></a><div id="hero-status" hidden></div><div id="profiles-empty" hidden></div>${d.getElementById('add-github').outerHTML}</div>`;
const mocks=`
const $=id=>document.getElementById(id);
let storageTraining=null,currentAccountId='fixture',bucketLoadVersion=0,debugModeEnabled=false,betaModeEnabled=false,onboardingBucketState='choose';
const profiles=[{type:'cloudflare-r2',accountId:'fixture',bucketName:'studio',workerUrl:'https://fixture.invalid',token:'fixture'}];
function isSetupDestination(p){return Boolean(p.workerUrl&&p.token);}
function applyOnboarding(){}
function setStatus(id,text,kind=''){const el=$(id);el.textContent=text;el.className='status '+kind;}
const fixture={calls:[],saved:[]};
const chrome={storage:{local:{set:async value=>fixture.saved.push(value)}}};
const names=['studio','reference-library','client-deliverables','motion','archive','product-renders','sound-library','campaign-deliverables-and-reference-materials','photography','documents','design-system','website-assets'];
async function send(message){fixture.calls.push(message.type);return {ok:true,buckets:names.map(name=>({name}))};}
async function addBucketPreset(name,options){fixture.calls.push(options?.forceRepair?'repair':'select');await new Promise(r=>setTimeout(r,220));if(name==='reference-library')throw Error('Mock connection failed. Retry the repair circle.');return {ok:true,verified:options?.forceRepair===true};}
`;
const init=`$('cf-account').innerHTML='<option>Personal workspace</option>';applyDebugMode();storageTraining=fixture.training=RedownStorageSignals.mountTraining({document});fixture.expansion=RedownStorageSignals.wireBucketExpansion({document,window});fixture.ready=refreshBuckets();globalThis.fixture=fixture;`;
const preview=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${body}<script>${signals}\n${mocks}\n${bucketCode}\n${modes}\n${init}</script></body></html>`;
dom.window.close();await writeFile(output+'/preview.html',preview);
if(process.argv.includes('--fixture-only'))process.exit(0);
const profile=await mkdtemp('/tmp/redown-signals-');const pause=ms=>new Promise(r=>setTimeout(r,ms));let browser,ws;
try{
 browser=spawn(process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let port;for(let i=0;i<80;i++){try{port=Number((await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);break;}catch{await pause(100);}}if(!port)throw Error('Chromium did not start');
 const info=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();ws=new WebSocket(info.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('Timeout '+method));},10000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(result.exceptionDetails)throw Error(result.exceptionDetails.text+': '+result.exceptionDetails.exception?.description);return result.result.value;};
 const shot=async name=>{const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);await writeFile(output+'/'+name+'.png',Buffer.from(result.data,'base64'));};
 await evaluate(`document.open();document.write(${JSON.stringify(preview)});document.close();`);await evaluate('fixture.ready');await evaluate('document.fonts.ready.then(()=>true)');
 const report={scope:'Ordinary Chromium, local mocked HTML and real UI handlers. Not an installed extension or live Cloudflare test.',layouts:[]};
 report.initialAttentionAnimations=await evaluate(`Array.from(document.querySelectorAll('.bucket-repair'),el=>getComputedStyle(el).animationName)`);assert.ok(report.initialAttentionAnimations.every(name=>name==='none'));
 for(const [width,height,buckets] of [[1366,768,1],[1366,768,12],[390,844,12],[1366,768,120],[390,844,120]]){
  await evaluate(`send=async()=>({ok:true,buckets:Array.from({length:${buckets}},(_,i)=>({name:names[i]||'storage-'+i}))});refreshBuckets()`);
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0},sessionId);await pause(100);
  const rest=await evaluate(`(()=>{const g=$('bucket-grid');return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,restHeight:g.parentElement.clientHeight,followingTop:$('following-section').getBoundingClientRect().top+scrollY,restClip:getComputedStyle(g).clipPath,tileHeight:g.querySelector('.bucket').getBoundingClientRect().height,fontLoaded:document.fonts.check('13px "DM Sans"')}})()`);
  assert.ok(rest.scrollWidth<=width);await shot('rest-'+width+'-'+buckets);
  await evaluate(`$('bucket-grid').focus()`);await pause(150);
  const opened=await evaluate(`(()=>{const g=$('bucket-grid'),v=g.parentElement,r=g.getBoundingClientRect();return {anchorHeight:v.clientHeight,expandedHeight:r.height,bottom:r.bottom+scrollY,sectionBottom:$('cloudflare-panel').getBoundingClientRect().bottom+scrollY,openClip:getComputedStyle(g).clipPath,animation:getComputedStyle(g).animationName,duration:getComputedStyle(g).animationDuration,followingTop:$('following-section').getBoundingClientRect().top+scrollY,tileHeight:g.querySelector('.bucket').getBoundingClientRect().height}})()`);
  assert.ok(Math.abs(opened.anchorHeight-opened.expandedHeight)<2,'parent contains scrollport');
  assert.ok(opened.followingTop>=opened.sectionBottom,'following section stays outside storage');
  assert.ok(opened.bottom<=opened.sectionBottom,'grid remains contained');
  assert.ok(Math.abs((opened.followingTop-rest.followingTop)-(opened.anchorHeight-rest.restHeight))<2);
  if(buckets>1)assert.ok(opened.expandedHeight>rest.restHeight);
  assert.equal(opened.duration,'0.1s');
  assert.ok(Math.abs(opened.tileHeight-rest.tileHeight)<1,'tile geometry stays fixed');
  report.layouts.push({...rest,...opened,followingContentDelta:opened.followingTop-rest.followingTop,anchorHeightDelta:opened.anchorHeight-rest.restHeight});await shot('expanded-'+width+'-'+buckets);
  await evaluate(`$('bucket-grid').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await evaluate('document.activeElement.id'),'refresh-storage');
  await evaluate('document.activeElement.blur()');

 }
 await call('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false},sessionId);
 await evaluate(`document.querySelector('.bucket-repair').click()`);await pause(40);
 assert.equal(await evaluate(`document.querySelector('.bucket').dataset.signal`),'working');await shot('working');
 await pause(260);assert.equal(await evaluate(`document.querySelector('.bucket').dataset.signal`),'ready');await shot('verified');
 await pause(2500);report.successPerimeterOpacity=await evaluate(`getComputedStyle(document.querySelector('.bucket-select'),'::after').opacity`);assert.equal(report.successPerimeterOpacity,'0');
 await evaluate(`document.querySelectorAll('.bucket-repair')[1].click()`);await pause(280);
 assert.equal(await evaluate(`document.querySelectorAll('.bucket')[1].dataset.signal`),'repair');await shot('repair-needed');
 await evaluate(`$('debug-mode-enabled').checked=true;$('debug-mode-enabled').dispatchEvent(new Event('change'))`);
 const count=await evaluate('fixture.calls.length');
 await evaluate(`$('run-storage-training').click();$('storage-training').scrollIntoView({block:'center'})`);await pause(950);
 assert.equal(await evaluate('fixture.training.stage'),'refresh');await shot('training-refresh');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false},sessionId);
 await evaluate(`$('storage-training').scrollIntoView({block:'center'})`);await pause(80);
 report.trainingNarrowWidth=await evaluate('document.documentElement.scrollWidth');assert.ok(report.trainingNarrowWidth<=390);await shot('training-narrow');
 await call('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false},sessionId);
 await evaluate(`$('storage-training').scrollIntoView({block:'center'})`);
 await evaluate(`document.querySelectorAll('.signal-demo-action')[1].click()`);await pause(650);
 assert.equal(await evaluate('fixture.training.stage'),'repair');await shot('training-repair');
 await evaluate(`document.querySelectorAll('.signal-demo-action')[2].click()`);await pause(1100);
 assert.equal(await evaluate('fixture.training.stage'),'complete');await shot('training-complete');
 assert.equal(await evaluate('fixture.calls.length'),count);report.trainingMadeNoStorageCalls=true;
 await pause(2400);assert.equal(await evaluate('fixture.training.stage'),'rest');
 await evaluate(`$('exit-storage-training').click()`);assert.equal(await evaluate('document.activeElement.id'),'run-storage-training');
 report.modes=[];
 for(const [beta,debug] of [[true,false],[false,true],[true,true],[false,false]]){
  const result=await evaluate(`(()=>{const b=$('beta-mode-enabled'),d=$('debug-mode-enabled');b.checked=${beta};b.dispatchEvent(new Event('change'));d.checked=${debug};d.dispatchEvent(new Event('change'));return {beta:document.documentElement.classList.contains('beta-mode'),debug:document.documentElement.classList.contains('debug-mode'),githubVisible:getComputedStyle($('add-github')).display!=='none'}})()`);
  assert.equal(result.githubVisible,beta);assert.equal(result.debug,debug);report.modes.push(result);
 }
 await evaluate(`send=async()=>({ok:true,buckets:Array.from({length:120},(_,i)=>({name:'storage-'+i}))});refreshBuckets()`);
 await evaluate(`window.scrollTo(0,0);$('bucket-grid').focus();document.querySelector('.bucket:last-child .bucket-select').focus()`);await pause(150);
 report.lastBucketVisible=await evaluate(`(()=>{const g=$('bucket-grid').getBoundingClientRect(),b=document.querySelector('.bucket:last-child .bucket-select'),r=b.getBoundingClientRect();return r.top>=g.top&&r.bottom<=g.bottom+1&&Boolean(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.bucket'))})()`);
 assert.equal(report.lastBucketVisible,true);await shot('long-list-last-row');
 await evaluate(`$('bucket-grid').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
 report.hiddenRowsDoNotIntercept=await evaluate(`(()=>{const v=document.querySelector('.bucket-grid-viewport').getBoundingClientRect();return !document.elementFromPoint(v.x+20,v.bottom+10)?.closest('#bucket-grid')})()`);
 assert.equal(report.hiddenRowsDoNotIntercept,true);
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
 report.reducedMotion=await evaluate(`(()=>{const el=document.querySelector('.bucket');RedownStorageSignals.paint(el,'working','Checking…');return {glyphAnimation:getComputedStyle(el.querySelector('.signal-glyph')).animationName,gridTransition:getComputedStyle($('bucket-grid').parentElement).transitionDuration}})()`);
 assert.equal(report.reducedMotion.glyphAnimation,'none');assert.equal(report.reducedMotion.gridTransition,'0s');
 await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{
 ws?.close();if(browser&&browser.exitCode===null){browser.kill();await Promise.race([new Promise(r=>browser.once('exit',r)),pause(1500)]);if(browser.exitCode===null)browser.kill('SIGKILL');}
 await rm(profile,{recursive:true,force:true,maxRetries:3});
}
