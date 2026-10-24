import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {installBetaExplorer} from '../extension/beta-explorer.mjs';
import {nativeReferenceAdapter,seedNativeReference} from '../extension/file-engine/adapters/native-reference.mjs';
import {initialState} from '../extension/file-engine/simulation.mjs';
test('same Beta renders duplicate native names, navigates stable IDs, copies and reads without path interpretation',async()=>{
 const html=await readFile(new URL('../extension/beta-explorer.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://redown.invalid/beta-explorer.html'}),d=dom.window.document;
 let state=seedNativeReference(initialState());const store={read:async()=>structuredClone(state),update:async fn=>fn(state)},adapter=nativeReferenceAdapter(store),root={provider:adapter.id,account:'reference',container:'drive',locator:{id:'root'}};
 const dir=await adapter.createDirectory({...root,locator:{parentId:'root',name:'Folder'}});await adapter.create({...root,locator:{parentId:dir.identity.locator.id,name:'Nested.txt'}},new TextEncoder().encode('nested'));
 const chrome={storage:{local:{get:async()=>({betaModeEnabled:true})},onChanged:{addListener(){},removeListener(){}}}};
 const controller=installBetaExplorer({document:d,chrome,indexedDB:new IDBFactory(),confirm:()=>true,prompt:()=>null,providerBindings:[{adapter,root,label:'Reference drive'}]});
 try{
  await controller.settle();assert.equal(d.getElementById('status').dataset.state,'completed',d.getElementById('status').textContent);
  const duplicateRows=[...d.querySelectorAll('#files li')].filter(row=>row.textContent.includes('Duplicate.TXT'));assert.equal(duplicateRows.length,2);
  duplicateRows[0].querySelector('input').click();d.getElementById('read').click();await controller.settle();assert.match(d.getElementById('preview').textContent,/different bytes/);
  d.getElementById('copy').click();await controller.settle();
  const folder=[...d.querySelectorAll('#files li')].find(row=>row.textContent.includes('Folder'));folder.querySelector('button').click();await controller.settle();assert.equal(d.querySelector('#files .file-name').textContent,'Nested.txt');d.getElementById('paste').click();await controller.settle();assert.equal(d.querySelectorAll('#files li').length,2);const nestedCopy=state.nativeObjects.find(n=>n.parentId===dir.identity.locator.id&&n.name==='Duplicate.TXT');assert.ok(nestedCopy);assert.match(atob(nestedCopy.bytesBase64),/different bytes/);
  d.getElementById('up').click();await controller.settle();assert.equal(d.querySelectorAll('#files li').length,3);
 }finally{controller.close();dom.window.close();}
});
test('owner-bound Beta cannot escape its advertised path root even with a permissive owner authorizer',async()=>{
 const {memoryAdapter}=await import('../extension/file-engine/adapters/memory.mjs');const dom=new JSDOM(await readFile(new URL('../extension/beta-explorer.html',import.meta.url),'utf8'),{url:'https://redown.invalid'}),d=dom.window.document,state=initialState(),store={read:async()=>structuredClone(state),update:async fn=>fn(state)},adapter=memoryAdapter(store,'fake-r2'),root={provider:'fake-r2',account:'demo',container:'sandbox',key:'Documents/'};
 const controller=installBetaExplorer({document:d,chrome:{storage:{local:{get:async()=>({betaModeEnabled:true})},onChanged:{addListener(){},removeListener(){}}}},indexedDB:new IDBFactory(),providerBindings:[{adapter,root}],authorize:()=>true});try{await controller.settle();d.getElementById('prefix').value='Welcome.txt';d.getElementById('navigation').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await controller.settle();assert.equal(d.getElementById('status').textContent,'AUTHORIZATION_DENIED');}finally{controller.close();dom.window.close();}
});
