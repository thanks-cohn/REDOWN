import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';
test('compact launcher replaces destination form without exposing experimental GitHub controls',async()=>{
 const html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8'),dom=new JSDOM(html);
 try{assert.equal(dom.window.document.querySelector('input,select'),null);assert.match(dom.window.document.getElementById('dashboard').textContent,/Go to Dashboard/);assert.doesNotMatch(dom.window.document.body.textContent,/GitHub/);}finally{dom.window.close();}
});
