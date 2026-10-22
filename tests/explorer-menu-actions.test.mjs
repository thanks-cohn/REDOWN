import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
test('menu actions surface synchronous and asynchronous errors',async()=>{
 const dom=new JSDOM('');const messages=[];
 const c=vm.createContext({document:dom.window.document,hideExplorerMenu(){},finishOperation:(m,failed)=>messages.push({m,failed})});
 vm.runInContext(source.slice(source.indexOf('function menuButton('),source.indexOf('\nfunction showExplorerMenu(',source.indexOf('function menuButton('))),c);
 for(const action of [()=>{throw Error('Denied');},async()=>{throw Error('Offline');}])await c.menuButton('Download',action).onclick();
 assert.deepEqual(messages,[{m:'Denied',failed:true},{m:'Offline',failed:true}]);dom.window.close();
});
test('Copy confirms internal clipboard contents without copying file bytes or moving originals',async()=>{
 const patches=[],messages=[];const c=vm.createContext({workspaceTarget:{accountId:'a',bucketName:'b'},accountName:()=>'',setOperation:()=>"clipboard-ticket",clipboardEntries:items=>items.map(({key})=>({key})),chrome:{storage:{session:{set:async p=>patches.push(p)}}},renderFileItems(){},finishOperation:(...m)=>messages.push(m)});
 vm.runInContext(source.slice(source.indexOf('async function setExplorerClipboard('),source.indexOf('\nasync function pasteExplorer(',source.indexOf('async function setExplorerClipboard('))),c);
 await c.setExplorerClipboard('copy',[{key:'folder/benign.txt'}]);assert.equal(patches[0].explorerClipboard.operation,'copy');assert.equal(patches[0].explorerClipboard.entries[0].key,'folder/benign.txt');assert.match(messages[0][0],/REDOWN/);assert.match(messages[0][0],/Paste/);
});
test('Properties message reads exact control-plane metadata without preparing a Worker',async()=>{
 const bg=await readFile('extension/background.js','utf8'),calls=[];let result;
 const c=vm.createContext({message:{type:'cfObjectProperties',accountId:'a',bucketName:'b',key:'nested/雪 #?.png'},cleanExplorerKey:key=>key,listObjectsPage:async(a,b,key)=>{calls.push({a,b,key});return {objects:[{key,size:0,http_metadata:{contentType:'image/png'},custom_metadata:{owner:'fixture'},last_modified:'today'}]};},sendResponse:value=>result=value});
 const snippet=bg.slice(bg.indexOf('if (message?.type === "cfObjectProperties")'),bg.indexOf('if (message?.type === "cfPrivateObjectUrl")'));
 await vm.runInContext('(async()=>{'+snippet+'})()',c);assert.equal(result.object.key,'nested/雪 #?.png');assert.equal(result.object.size,0);assert.equal(result.object.httpMetadata.contentType,'image/png');assert.equal(calls.length,1);
});
test('operation feedback renders untrusted filenames/error text literally',()=>{
 const dom=new JSDOM('<div id="explorer-operation"></div>');const c=vm.createContext({document:dom.window.document,$:id=>dom.window.document.getElementById(id),uid:()=> 'fixture',safeUiMessage:s=>s,explorerOperation:null});
 vm.runInContext(source.slice(source.indexOf('function setOperation('),source.indexOf('function finishOperation(')),c);c.setOperation('copy','<img src=x> literal filename');assert.equal(dom.window.document.querySelector('img'),null);assert.match(dom.window.document.body.textContent,/<img src=x>/);dom.window.close();
});
