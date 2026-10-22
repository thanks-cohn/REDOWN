import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createCollector} from '../agent/explorer/api.mjs';
import '../extension/explorer-diagnostics-bridge.js';
const html=await readFile('extension/options.html','utf8'),ui=await readFile('extension/explorer-diagnostics-ui.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('Debug inspector selects traces, copies ID, previews redacted bundle before download and clears safely',async()=>{
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window;w.eval(ui);w.document.documentElement.classList.add('debug-mode');
 const collector=createCollector({context:'background'});collector.setEnabled(true);const id=collector.begin('copy');collector.record(id,{stage:'source.read',component:'worker',status:404,outcome:'failed'});collector.finish(id,'failed',{status:404});
 const calls=[],copies=[],downloads=[];w.RedownExplorerDiagnosticUI.install({document:w.document,observer:()=>null,copy:async value=>copies.push(value),download:value=>downloads.push(value),send:async message=>{calls.push(message.operation);if(message.operation==='clear'){collector.setEnabled(false);collector.setEnabled(true);return {ok:true,result:{data:{cleared:true}}};}return {ok:true,result:{explorerDiagnosticVersion:'1.0.0',state:'partial',data:message.operation==='exportDiagnosticBundle'?collector.exportBundle():message.operation==='diagnoseOperation'?collector.diagnose(message.input.id):collector.getOperationTree(message.input.id)}};}});
 const click=async id=>{w.document.getElementById(id).click();await tick();};
 await click('explorer-diagnostics-inspect');assert.equal(w.document.getElementById('explorer-diagnostic-id').value,id);await click('explorer-diagnostics-trace');assert.match(w.document.getElementById('explorer-diagnostics-output').textContent,/EXPLORER_HTTP_NOT_FOUND/);
 await click('explorer-diagnostics-copy');assert.deepEqual(copies,[id]);await click('explorer-diagnostics-export');assert.equal(downloads.length,0);assert.equal(w.document.getElementById('explorer-diagnostics-download').hidden,false);await click('explorer-diagnostics-download');assert.equal(downloads.length,1);
 await click('explorer-diagnostics-clear');assert.equal(collector.exportBundle().operations.length,0);assert.equal(w.document.getElementById('explorer-diagnostic-id').options.length,0);
 w.document.documentElement.classList.remove('debug-mode');w.document.documentElement.classList.add('beta-mode');const before=calls.length;await click('explorer-diagnostics-inspect');assert.equal(calls.length,before);dom.window.close();
});
test('bridge shares local fingerprint context and keeps concurrent message IDs and parent chains separate',async()=>{
 const stored={debugModeEnabled:true},listeners=[];let bridge;
 const chrome={runtime:{getManifest:()=>({version:'0.5.14'}),getURL:path=>'chrome-extension://fixture/'+path,sendMessage:async()=>({ok:true,context:await bridge.sessionContext()})},storage:{local:{get:async()=>stored,set:async value=>Object.assign(stored,value),remove:async key=>delete stored[key]},onChanged:{addListener:fn=>listeners.push(fn)}}};
 bridge=globalThis.RedownExplorerBridge.install({context:'background',chrome});await bridge.ready;const front=globalThis.RedownExplorerBridge.install({context:'options',chrome});await front.ready;
 const source={accountId:'private',bucketName:'private'},id=front.collector.begin('preview');await front.collector.identity(id,source,'雪 #?.png');const child=await front.beginMessage({type:'cfTransferObjects',operation:'copy'});const accepted=await bridge.accept({type:'cfTransferObjects',source,entries:[{key:'雪 #?.png'}],explorerTrace:child.wire},{url:chrome.runtime.getURL('options.html')});
 assert.equal(accepted.operationId,child.id);assert.equal(front.collector.getOperationTrace(id).events[0].key,bridge.collector.getOperationTrace(child.id).events.find(e=>e.key).key);
 const second=await front.beginMessage({type:'cfDeleteObjects'});assert.notEqual(second.id,child.id);assert.equal(await bridge.accept({type:'cfDeleteObjects'},{url:'https://untrusted.invalid'}),null);
 const secret=(await bridge.sessionContext()).seed;assert.ok(!JSON.stringify(bridge.collector.exportBundle()).includes(secret));listeners.forEach(fn=>fn({debugModeEnabled:{newValue:false}},'local'));assert.equal(front.collector.exportBundle().operations.length,0);assert.equal(bridge.collector.exportBundle().operations.length,0);
});
test('legacy Worker404 is marked as reported evidence rather than invented structured source telemetry',async()=>{
 const chrome={runtime:{getManifest:()=>({version:'0.5.14'}),getURL:path=>'chrome-extension://fixture/'+path},storage:{local:{get:async()=>({debugModeEnabled:true}),set:async()=>{},remove:async()=>{}},onChanged:{addListener(){}}}};
 const bridge=globalThis.RedownExplorerBridge.install({context:'background',chrome});await bridge.ready;const trace=await bridge.accept({type:'cfTransferObjects',source:{accountId:'a',bucketName:'b'},entries:[{key:'fixture'}]},{url:chrome.runtime.getURL('options.html')});
 const result=bridge.complete({explorerTrace:trace},{ok:true,results:[{status:'failed',error:'Source object was not available (HTTP 404)'}]});assert.equal(result.error.code,'EXPLORER_HTTP_NOT_FOUND');assert.ok(result.events.some(e=>e.status===404&&e.evidence==='legacy-worker-message'));assert.ok(!result.events.some(e=>e.binding));assert.equal(result.error.rootCause,'unknown');bridge.collector.setEnabled(false);
});
