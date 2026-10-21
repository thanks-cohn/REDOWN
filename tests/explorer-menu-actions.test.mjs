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
 const patches=[],messages=[];const c=vm.createContext({workspaceTarget:{accountId:'a',bucketName:'b'},accountName:()=>'',clipboardEntries:items=>items.map(({key})=>({key})),chrome:{storage:{session:{set:async p=>patches.push(p)}}},renderFileItems(){},finishOperation:(...m)=>messages.push(m)});
 vm.runInContext(source.slice(source.indexOf('async function setExplorerClipboard('),source.indexOf('\nasync function pasteExplorer(',source.indexOf('async function setExplorerClipboard('))),c);
 await c.setExplorerClipboard('copy',[{key:'folder/benign.txt'}]);assert.equal(patches[0].explorerClipboard.operation,'copy');assert.equal(patches[0].explorerClipboard.entries[0].key,'folder/benign.txt');assert.match(messages[0][0],/REDOWN/);assert.match(messages[0][0],/Paste/);
});
