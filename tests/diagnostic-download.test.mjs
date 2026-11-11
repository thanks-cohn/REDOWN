import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {webcrypto} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
test('offline export does not contact an unresponsive worker and still yields a safe stored-metadata ZIP',async()=>{
 const dom=new JSDOM('<button data-diagnostic-export>Export Diagnostic Bundle</button><p id="diagnostic-bundle-status"></p>',{url:'https://extension.test/shelf.html',runScripts:'outside-only'}),w=dom.window,blobs=[];
 const local={cloudflareAuth:{accessToken:'SECRET_ACCESS'},entryPointEvidence:[{code:'CORE_IMPORT_FAILED',at:new Date().toISOString(),private:'SECRET_DETAIL'}],redownSaveAttempts:[{id:webcrypto.randomUUID(),provider:'google',events:[{stage:'CLICK_RECEIVED',at:Date.now()}]}]};
 let messages=0;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.Uint8Array=Uint8Array;w.Blob=Blob;w.chrome={runtime:{sendMessage:()=>{messages++;return new Promise(()=>{});},getManifest:()=>({version:'0.5.27'})},storage:{local:{get:async k=>({[k]:local[k]})}}};
 const original=w.setTimeout.bind(w);w.setTimeout=(fn,ms)=>original(fn,ms===5000?10:ms);w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:fixture';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 for(const file of ['save-evidence.js','transfer-queue.js','diagnostic-bundle.js','vendor/fflate.js','diagnostic-download.js'])w.eval(readFileSync('extension/'+file,'utf8'));
 assert.equal(blobs.length,0);w.document.querySelector('button').click();
 for(let i=0;i<80&&!blobs.length;i++)await new Promise(r=>setTimeout(r,10));
 try{
  assert.equal(blobs.length,1,w.document.getElementById('diagnostic-bundle-status').textContent);const files=unzipSync(new Uint8Array(await blobs[0].arrayBuffer())),environment=JSON.parse(strFromU8(files['environment.json']));
  assert.equal(messages,0);assert.equal(environment.background,'not-contacted');assert.equal(environment.tracePersistence,'stored-only');assert.equal(environment.workerObservations[0].code,'CORE_IMPORT_FAILED');assert.doesNotMatch(Object.values(files).map(v=>strFromU8(v)).join('\n'),/SECRET_ACCESS|SECRET_DETAIL/);
 }finally{w.close();}
});
