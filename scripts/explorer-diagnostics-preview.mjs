// Ordinary Chromium rendering of the real Debug inspector with simulated diagnostic bundles.
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fixture} from './explorer-diagnostic-fixtures.mjs';
const output=resolve(process.argv[2]||'work/explorer-diagnostics-preview');await mkdir(output,{recursive:true});
const d=new JSDOM(await readFile('extension/options.html','utf8')).window.document;
const css=d.querySelector('style').textContent.replace(/url\("fonts\/dm-sans-latin-variable.woff"\)/g,'none');
const core=await readFile('extension/explorer-diagnostics.js','utf8'),ui=await readFile('extension/explorer-diagnostics-ui.js','utf8');
const sample=(await fixture('missing-source')).bundle;
const mocks=`const collector=RedownExplorerDiagnostics.create({now:()=>${sample.exportedAt},id:()=> '00000000-0000-4000-8000-000000000099',context:'fixture'});collector.setEnabled(true);collector.ingest(${JSON.stringify(sample)});
const fixture={calls:[],copied:null,downloads:0};globalThis.fixture=fixture;
RedownExplorerDiagnosticUI.install({document,observer:()=>null,copy:async value=>{fixture.copied=value;},download:()=>fixture.downloads++,send:async message=>{fixture.calls.push(message.operation);const trace=collector.getOperationTree(message.input?.id);return {ok:true,result:{state:'partial',data:message.operation==='exportDiagnosticBundle'?collector.exportBundle():message.operation==='diagnoseOperation'?collector.diagnose(message.input.id):trace}};}});
document.getElementById('explorer-diagnostics-panel').open=true;`;
const section=d.querySelector('[data-debug-detail]');section.hidden=false;
const preview=`<!doctype html><html class="debug-mode"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="wrap"><p>Mock diagnostic observations · ordinary Chromium · no extension/cloud execution</p>${section.outerHTML}</div><script>${core}\n${ui}\n${mocks}</script></body></html>`;await writeFile(output+'/preview.html',preview);
const profile=await mkdtemp('/tmp/redown-explorer-ui-'),pause=ms=>new Promise(r=>setTimeout(r,ms));let browser,ws;
try{
 browser=spawn(process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let port;for(let i=0;i<80;i++){try{port=Number((await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);break;}catch{await pause(100);}}if(!port)throw Error('Chromium did not start');
 const info=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();ws=new WebSocket(info.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('Timeout '+method));},10000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 const shot=async name=>{const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);await writeFile(output+'/'+name+'.png',Buffer.from(result.data,'base64'));};
 await evaluate(`document.write(${JSON.stringify(preview)});document.close()`);
 const report={scope:'Ordinary Chromium rendering and real Debug inspector controls; diagnostic input, extension messages and clipboard/download are mocked.',browser:info.Browser,checks:[]};
 for(const width of [1366,390]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false},sessionId);
  await evaluate(`document.getElementById('explorer-diagnostics-inspect').click()`);await pause(100);
  assert.equal(await evaluate(`document.getElementById('explorer-diagnostic-id').options.length`),1);
  await evaluate(`document.getElementById('explorer-diagnostics-trace').click()`);await pause(100);
  assert.match(await evaluate(`document.getElementById('explorer-diagnostics-output').textContent`),/EXPLORER_HTTP_NOT_FOUND/);
  await evaluate(`document.getElementById('explorer-diagnostics-panel').scrollIntoView({block:'start'})`);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));await shot('diagnostic-trace-'+width);
  report.checks.push({width,traceVisible:true,noHorizontalOverflow:true});
 }
 await evaluate(`document.getElementById('explorer-diagnostics-copy').click()`);await pause(50);assert.match(await evaluate('fixture.copied'),/^[a-f0-9-]{36}$/);
 await evaluate(`document.getElementById('explorer-diagnostics-export').click()`);await pause(50);assert.equal(await evaluate('fixture.downloads'),0);
 await evaluate(`document.getElementById('explorer-diagnostics-download').click()`);await pause(50);assert.equal(await evaluate('fixture.downloads'),1);
 const before=await evaluate('fixture.calls.length');await evaluate(`document.documentElement.classList.remove('debug-mode');document.getElementById('explorer-diagnostics-inspect').click()`);await pause(50);assert.equal(await evaluate('fixture.calls.length'),before);
 report.reviewBeforeDownload=true;report.normalModeDoesNotQuery=true;report.copyId=true;await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{ws?.close();if(browser&&browser.exitCode===null){browser.kill();await Promise.race([new Promise(r=>browser.once('exit',r)),pause(1500)]);if(browser.exitCode===null)browser.kill('SIGKILL');}await rm(profile,{recursive:true,force:true,maxRetries:3});}
