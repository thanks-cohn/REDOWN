// Local Chromium mock rendering benchmark. Never installs the extension or contacts cloud services.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
const fixture=process.argv[2]||'work/storage-profile-fixture/preview.html',output=process.argv[3]||'work/storage-expansion-profile';await mkdir(output,{recursive:true});
if(!process.argv[2])await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/storage-signals-preview.mjs','work/storage-profile-fixture','--fixture-only'],{stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Fixture generation failed')));});
const html=await readFile(fixture,'utf8'),profile=await mkdtemp('/tmp/redown-expansion-');
const pause=ms=>new Promise(r=>setTimeout(r,ms));let browser,ws;
try{
 browser=spawn(process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let port;for(let i=0;i<80;i++){try{port=Number((await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);break;}catch{await pause(100);}}if(!port)throw Error('No Chromium debug port');
 const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let id=0,trace=[],layers=[],traceFinished,sessionId,targetId;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Tracing.dataCollected')trace.push(...m.params.value);if(m.method==='Tracing.tracingComplete')traceFinished?.();if(m.method==='LayerTree.layerTreeDidChange'&&m.sessionId===sessionId)layers=m.params.layers||[];const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('Timeout '+method));},20000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 const results=[];
 let variants=process.argv.includes('--ablations')?[
  ['original',''],
  ['instant-height','html:not(.debug-mode) .bucket-grid-viewport{transition:none!important}'],
  ['flat-diagnostic','html:not(.debug-mode) .bucket, .bucket-select{transform-style:flat!important;transform:none!important}.bucket-side{display:none!important}.bucket-surface,.bucket-repair,.bucket-select:after{transform:none!important}']
 ]:[['current','']];
 if(process.argv.includes('--candidate'))variants=[['original',''],['candidate',await readFile(process.argv[process.argv.indexOf('--candidate')+1],'utf8')]];
 if(process.argv.includes('--compare'))variants=[['before','',await readFile(process.argv[process.argv.indexOf('--compare')+1],'utf8')],['after','',html]];
 for(const count of [12,120])for(const [variant,css,caseHtml=html] of variants){
  if(targetId)await call('Target.closeTarget',{targetId});
  ({targetId}=await call('Target.createTarget',{url:'about:blank'}));({sessionId}=await call('Target.attachToTarget',{targetId,flatten:true}));
  layers=[];await call('Performance.enable',{},sessionId);await call('LayerTree.enable',{},sessionId);
  await call('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false},sessionId);
  await evaluate(`document.open();document.write(${JSON.stringify(caseHtml)});document.close();`);await evaluate('fixture.ready');await evaluate('document.fonts.ready.then(()=>true)');
  await evaluate(`send=async()=>({ok:true,buckets:Array.from({length:${count}},(_,i)=>({name:'storage-'+i}))});refreshBuckets()`);
  const controllerPresent=await evaluate(`typeof RedownStorageSignals.wireBucketExpansion==='function'`);
  if(variant==='after'&&!controllerPresent)throw Error('After fixture did not load its expansion controller');
  if(css)await evaluate(`{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.append(s);}`);
  await evaluate(`document.querySelectorAll('.bucket').forEach(el=>RedownStorageSignals.paint(el,'idle','Not checked'));`);
  await pause(300);
  for(let run=0;run<3;run++){
   await evaluate(`document.activeElement?.blur();window.scrollTo(0,0);`);await pause(300);
   const before=Object.fromEntries((await call('Performance.getMetrics',{},sessionId)).metrics.map(x=>[x.name,x.value]));trace=[];
   await call('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,cc',transferMode:'ReportEvents'});
   const frames=await evaluate(`new Promise(resolve=>{const times=[];let previous,firstCallbackDelayMs;const start=performance.now();document.getElementById('bucket-grid').focus();function frame(t){if(firstCallbackDelayMs===undefined)firstCallbackDelayMs=performance.now()-start;if(previous!==undefined)times.push(t-previous);previous=t;if(t-start<480)requestAnimationFrame(frame);else resolve({times,firstCallbackDelayMs,elapsed:t-start});}requestAnimationFrame(frame);})`);
   const after=Object.fromEntries((await call('Performance.getMetrics',{},sessionId)).metrics.map(x=>[x.name,x.value]));
   const done=new Promise(r=>traceFinished=r);await call('Tracing.end');await done;
   const traceStats={};for(const name of ['Layout','UpdateLayoutTree','Paint','RasterTask']){const items=trace.filter(x=>x.name===name&&x.ph==='X');traceStats[name]={count:items.length,totalMs:items.reduce((n,x)=>n+(x.dur||0),0)/1000};}
   const sorted=[...frames.times].sort((a,b)=>a-b),percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0;
   results.push({count,variant,run,controllerPresent,frames:frames.times.length,firstCallbackDelayMs:frames.firstCallbackDelayMs,p50FrameMs:percentile(.5),p95FrameMs:percentile(.95),maxFrameMs:Math.max(...frames.times),framesOver25ms:frames.times.filter(x=>x>25).length,layerCount:layers.length,layoutCount:after.LayoutCount-before.LayoutCount,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,styleCount:after.RecalcStyleCount-before.RecalcStyleCount,styleMs:(after.RecalcStyleDuration-before.RecalcStyleDuration)*1000,taskMs:(after.TaskDuration-before.TaskDuration)*1000,trace:traceStats});
   await writeFile(`${output}/${count}-${variant}-${run}-trace.json`,JSON.stringify({traceEvents:trace}));
  }
 }
 const report={scope:'Local isolated mock fixture in headless Chromium with --disable-gpu. Three focus-open samples per case; not installed-extension, live-cloud, user-hardware, INP or Core Web Vitals evidence.',browser:version.Browser,fixtureHashes:variants.map(([variant,css,content=html])=>({variant,sha256:createHash('sha256').update(content+css).digest('hex')})),results};
 await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(results));
}finally{ws?.close();if(browser&&browser.exitCode===null){browser.kill();await Promise.race([new Promise(r=>browser.once('exit',r)),pause(1500)]);if(browser.exitCode===null)browser.kill('SIGKILL');}await rm(profile,{recursive:true,force:true,maxRetries:3});}
