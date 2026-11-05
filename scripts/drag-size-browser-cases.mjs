import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export async function runLarge({page,lowMemory}){
 const results=[];const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 await page.locator('#nav-settings').click();assert.equal(await page.locator('#drag-limit-mb').inputValue(),'50');await page.locator('#nav-explorer').click();
 await page.evaluate(()=>{fixture.largeSize=50000000;});
 for(const [mb,size] of [[50,50000000],[75,75000000],[8,8000001],[50,50000001]]){
  await page.evaluate(()=>document.getElementById('large-input')?.remove());
  await page.locator('#nav-settings').click();await page.locator('#drag-limit-mb').fill(String(mb));await page.locator('#drag-limit-mb').dispatchEvent('change');await page.waitForFunction(mb=>fixture.local.shelfDragLimitMBV1===mb,mb);
  await page.evaluate(size=>{fixture.largeSize=size;fixture.entries=[{key:'original.bin',size,etag:'large-'+size,httpMetadata:{contentType:'application/octet-stream'}}];fixture.received=null;},size);
  await page.locator('#nav-explorer').click();await page.locator('[data-action=refresh]').click();await page.waitForFunction(()=>document.querySelector('.mini-status').textContent.startsWith('1 loaded'));
  await page.evaluate(()=>{if(!document.getElementById('large-input')){const input=document.createElement('input');input.id='large-input';input.type='file';Object.assign(input.style,{position:'fixed',top:'5px',right:'5px',zIndex:99999});document.body.append(input);input.addEventListener('change',async()=>{const f=input.files[0],bytes=await f.arrayBuffer();fixture.received={name:f.name,size:f.size,mime:f.type,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('')};});}});
  const cpuBefore=(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='ScriptDuration').value;const start=Date.now();await page.locator('.mini-row').first().dragTo(page.locator('#large-input'));
  if(size>mb*1000000){await page.waitForFunction(()=>document.querySelector('.mini-drag-status').textContent.includes('larger than'));assert.equal(await page.evaluate(()=>fixture.received),null);results.push({mb,size,rejected:true});continue;}
  await page.waitForFunction(()=>fixture.received,null,{timeout:120000});const received=await page.evaluate(()=>fixture.received);
  const hash=createHash('sha256');for(let offset=0;offset<size;offset+=65536){const bytes=Buffer.alloc(Math.min(65536,size-offset));for(let j=0;j<bytes.length;j++)bytes[j]=(offset+j)%251;hash.update(bytes);}
  assert.equal(received.hash,hash.digest('hex'));assert.equal(received.size,size);assert.equal(received.name,'original.bin');assert.equal(received.mime,'application/octet-stream');results.push({mb,size,...received,scriptMs:1000*((await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='ScriptDuration').value-cpuBefore),elapsedMs:Date.now()-start,storage:await page.evaluate(()=>chrome.runtime.sendMessage({type:'redownChuteV1.stats'})),heap:await page.evaluate(()=>performance.memory?.usedJSHeapSize),accepted:true,verifiedUpload:false});
  await page.waitForFunction(()=>fixture.receipts.at(-1)?.state==='drop_dispatched');
 }
 await cdp.detach();return {lowMemory,results,status:'PASS'};
}
