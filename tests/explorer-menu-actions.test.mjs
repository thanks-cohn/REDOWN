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

test('clipboard publication is transactional and returns the exact captured selection',async()=>{
 const old={entries:[{key:'previous'}]},messages=[];let deny=true;
 const c=vm.createContext({explorerClipboard:old,workspaceTarget:{accountId:'a',bucketName:'b'},accountName:()=>'',setOperation:()=>1,clipboardEntries:items=>items.map(({key})=>({key})),chrome:{storage:{session:{set:async()=>{if(deny)throw Error('denied');}}}},renderFileItems(){},finishOperation:(...args)=>messages.push(args)});
 vm.runInContext(source.slice(source.indexOf('async function setExplorerClipboard('),source.indexOf('\nasync function pasteExplorer(')),c);
 await assert.rejects(c.setExplorerClipboard('copy',[{key:'new'}]),{code:'EXPLORER_CLIPBOARD_FAILED'});
 assert.equal(c.explorerClipboard,old);assert.equal(messages.length,0);
 deny=false;const captured=await c.setExplorerClipboard('copy',[{key:'new'}]);assert.equal(captured,c.explorerClipboard);assert.equal(captured.entries[0].key,'new');
});

test('Move to never pastes a previous clipboard when the requested selection is rejected',async()=>{
 let pastes=0;let configuration;
 const c=vm.createContext({document:{},RedownDestinationMenus:{create:config=>{configuration=config;return {};}},setExplorerClipboard:async()=>undefined,pasteExplorer:async()=>pastes++});
 vm.runInContext(source.slice(source.indexOf('let explorerDestinationMenus;'),source.indexOf('\nfunction showExplorerMenu(')),c);
 c.destinationMenus();await configuration.onChoose('move',{},[],{});assert.equal(pastes,0);
});

test('background Paste retains its opened-menu destination and clipboard after navigation',async()=>{
 const dom=new JSDOM('<div id="explorer-menu"></div>'),calls=[];
 const clipboard={entries:[{key:'file'}]};
 const c=vm.createContext({document:dom.window.document,$:id=>dom.window.document.getElementById(id),explorerUrlPopover:null,explorerDestinationMenus:null,explorerSearchActive:false,explorerArchive:null,workspaceTarget:{},workspacePrefix:'first/',explorerClipboard:clipboard,explorerSource:()=>({accountId:'a',bucketName:'original'}),selectedExplorerItems:()=>[],pasteExplorer:(...args)=>calls.push(args),menuButton:(label,action)=>{const b=dom.window.document.createElement('button');b.textContent=label;b.onclick=()=>action?.();return b;},beginNewFolder(){},requestAnimationFrame:()=>{},innerWidth:800,innerHeight:600});
 vm.runInContext(source.slice(source.indexOf('function showExplorerMenu('),source.indexOf('\nfunction hideExplorerMenu(')),c);
 c.showExplorerMenu(10,10,null);c.workspacePrefix='elsewhere/';c.explorerClipboard={entries:[{key:'wrong'}]};c.explorerSource=()=>({accountId:'a',bucketName:'wrong'});
 await [...dom.window.document.querySelectorAll('button')].find(b=>b.textContent==='Paste').onclick();
 assert.equal(calls[0][0].bucketName,'original');assert.equal(calls[0][0].prefix,'first/');assert.equal(calls[0][1],clipboard);dom.window.close();
});

test('right-click on Explorer home does not require a selected bucket',()=>{
 const dom=new JSDOM('<div id="explorer-menu"></div>');
 const c=vm.createContext({document:dom.window.document,$:id=>dom.window.document.getElementById(id),explorerUrlPopover:null,explorerDestinationMenus:null,explorerSearchActive:false,explorerClipboard:null,workspaceTarget:null,selectedExplorerItems:()=>[],explorerSource:()=>{throw Error('no bucket');},menuButton:label=>{const b=dom.window.document.createElement('button');b.textContent=label;return b;},requestAnimationFrame:()=>{}});
 vm.runInContext(source.slice(source.indexOf('function showExplorerMenu('),source.indexOf('\nfunction hideExplorerMenu(')),c);c.showExplorerMenu(0,0,null);assert.match(dom.window.document.body.textContent,/Refresh buckets/);dom.window.close();
});

test('send records rejected transport through the existing diagnostic bridge and rethrows once',async()=>{
 let failed=0,calls=0;const error=Object.assign(Error('closed channel'),{code:'EXPLORER_MESSAGE_HANDLER_MISSING'}),handle={id:'fixture'};
 const c=vm.createContext({setTimeout,clearTimeout,chrome:{runtime:{sendMessage:async()=>{calls++;throw error;}}},redownExplorerBridge:{beginMessage:async()=>handle,fail:(actual,e)=>{assert.equal(actual,handle);assert.equal(e,error);failed++;}}});
 vm.runInContext(source.slice(source.indexOf('async function send('),source.indexOf('\nasync function saveProfiles(')),c);
 await assert.rejects(c.send({type:'cfTransferObjects'}),{code:'EXPLORER_MESSAGE_HANDLER_MISSING'});assert.equal(failed,1);assert.equal(calls,1);
});
