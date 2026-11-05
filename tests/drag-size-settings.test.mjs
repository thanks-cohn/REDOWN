import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const tick=()=>new Promise(r=>setTimeout(r,20));
test('Free-entry decimal MB preserves positive values, rejects invalid input without changing policy, and resets to 50',async()=>{
 const dom=new JSDOM(readFileSync('extension/shelf.html','utf8'),{url:'https://extension.invalid/shelf.html#settings',runScripts:'outside-only'}),w=dom.window,memory={shelfDragLimitMBV1:75};
 w.chrome={storage:{local:{get:async()=>memory,set:async v=>Object.assign(memory,v)},session:{get:async()=>({})},onChanged:{addListener(){}}},runtime:{getURL:p=>p,sendMessage:async()=>({ok:true,accounts:[]})},tabs:{create:async()=>({})}};
 try{
  w.eval(readFileSync('extension/chute-stage.js','utf8'));w.eval(readFileSync('extension/shelf.js','utf8'));await tick();const input=w.document.getElementById('drag-limit-mb');assert.equal(input.value,'75');assert.equal(input.hasAttribute('max'),false);assert.equal(input.step,'any');
  for(const n of [8,50,75,100,500,.125,1e100]){input.value=String(n);input.dispatchEvent(new w.Event('change'));await tick();assert.equal(memory.shelfDragLimitMBV1,n);}
  for(const value of ['',0,-1,Infinity,NaN])assert.throws(()=>w.RedownChuteStage.parseMB(value));
  input.value='0';input.dispatchEvent(new w.Event('change'));await tick();assert.equal(memory.shelfDragLimitMBV1,1e100);assert.match(w.document.getElementById('drag-limit-status').textContent,/finite positive/);
  w.document.getElementById('reset-drag-limit').click();await tick();assert.equal(memory.shelfDragLimitMBV1,50);
 }finally{dom.window.close();}
});

test('Policy uses decimal bytes and does not allocate impractical configured amounts',async()=>{
 const {createDragBridge}=await import('../extension/chute-drag.mjs');let reads=0;
 const bridge=createDragBridge({api:{run:async()=>{reads++;}},send:async()=>({ok:true})});
 assert.equal(bridge.capabilities().maxBytes,50000000);bridge.setLimitMB(8);assert.equal(bridge.capabilities().maxBytes,8000000);bridge.setLimitMB(500);assert.equal(bridge.capabilities().maxBytes,500000000);
 let blocked=false;assert.equal(bridge.start({preventDefault(){blocked=true;}},{accountId:'a',bucketName:'b'},{key:'large.bin',size:129000000}),false);assert.equal(blocked,true);assert.equal(reads,0);
});
