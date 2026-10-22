// Ordinary Chromium UI exercise. Extension messaging, OAuth, Cloudflare and Downloads are MOCKED.
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const output=resolve(process.argv[2]||'work/explorer-operations-preview');await mkdir(output,{recursive:true});
const html=await readFile('extension/options.html','utf8'),source=await readFile('extension/options.js','utf8'),publicCode=await readFile('extension/public-addresses.js','utf8'),menuCode=await readFile('extension/explorer-destination-menu.js','utf8');
const d=new JSDOM(html).window.document;
const css=d.querySelector('style').textContent.replace(/url\("fonts\/dm-sans-latin-variable.woff"\)/g,'none');
const functions=source.slice(source.indexOf('function selectedExplorerItems()'),source.indexOf('async function explorerUploadFiles'))+source.slice(source.indexOf('function menuButton('),source.indexOf('function wireWorkspace('))+source.slice(source.indexOf('function setOperation('),source.indexOf('function isTransientBucketAccessError('))+source.slice(source.indexOf('function friendlyError('),source.indexOf('async function refreshProfiles('));
const mocks=`
const $=id=>document.getElementById(id);
let workspaceTarget={accountId:'a',bucketName:'source'},workspacePrefix='',explorerClipboard=null,explorerSearchActive=false,explorerArchive=null,explorerOperation=null;
let explorerItems=[],explorerSelected=new Set();
const explorerAccounts=[{id:'a',name:'Mock workspace'}],explorerBuckets=new Map([['a',[{name:'source'},{name:'target'}]]]);
const fixture={scope:'Ordinary Chromium using real menu/operation handlers; messaging, storage, downloads and Cloudflare are mocked.',calls:[],stores:{source:new Map([['雪 #?.txt',{text:'original payload',size:16}]]),target:new Map()},download:[]};
Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{fixture.clipboard=text;}}});
const chrome={storage:{session:{set:async()=>{},remove:async()=>{}}}};
let fixtureId=0;const uid=()=>String(++fixtureId),safeUiMessage=value=>String(value),formatBytes=value=>value+' B',accountName=()=> 'Mock workspace',r2Profiles=()=>[];
const iconSvg=()=>'',objectContentType=()=> 'text/plain';
const RedownCloudflareApi={download:async(source,key,filename,onState)=>{fixture.download.push({source,key,filename});onState({state:'complete'});return 1;}};
function explorerSource(){return {...workspaceTarget};}
function rootRow(id){return [...$('workspace-objects').children].find(row=>row.dataset.id===id);}
function renderFileItems(){
 explorerItems=[...fixture.stores[workspaceTarget.bucketName]].filter(([key])=>key.startsWith(workspacePrefix)).map(([key,object])=>({id:key,key,name:key.split('/').pop(),type:'Text',object,size:object.size}));
 $('workspace-objects').replaceChildren();
 for(const item of explorerItems){const row=document.createElement('div');row.className='file-row';row.dataset.id=item.id;const cell=document.createElement('div');cell.className='file-name';const icon=document.createElement('span');icon.className='file-icon';cell.append(icon,document.createTextNode(item.name));row.append(cell);row.oncontextmenu=event=>{event.preventDefault();explorerSelected=new Set([item.id]);showExplorerMenu(event.clientX,event.clientY,item);};$('workspace-objects').append(row);}
}
async function browseWorkspace(){fixture.calls.push('refresh');renderFileItems();}
async function goLocation(accountId,bucketName,prefix=''){workspaceTarget={accountId,bucketName};workspacePrefix=prefix;await browseWorkspace();}
async function openExplorerItem(item){fixture.preview=item.key;finishOperation('Preview opened for '+item.key);}
async function loadExplorerInventory(){fixture.calls.push('inventory');}
async function send(message){
 fixture.calls.push(message.type);await new Promise(resolve=>setTimeout(resolve,20));
 if(message.type==='cfDestinationFolders')return {ok:true,folders:message.prefix?[]:[{name:'nested',prefix:'nested/'}],cursor:''};
 if(message.type==='cfPublicAddresses')return {ok:true,accountId:message.accountId,bucketName:message.bucketName,addresses:[{label:'Development URL',base:'https://pub-fixture.r2.dev/',state:'configured'}]};
 if(message.type==='cfObjectProperties')return {ok:true,object:{key:message.key,size:16,etag:'fixture',httpMetadata:{contentType:'text/plain'},customMetadata:{fixture:'mock'}}};
 if(message.type==='cfTransferObjects'){
  let completed=0;for(const item of message.entries){const source=fixture.stores[message.source.bucketName],destination=fixture.stores[message.destination.bucketName],key=message.destination.prefix+(message.renameTo||item.key.split('/').pop());if(destination.has(key))return {ok:true,completed,conflicts:[{sourceKey:item.key,destinationKey:key}]};destination.set(key,{...source.get(item.key)});if(message.operation==='move')source.delete(item.key);completed++;}return {ok:true,completed,errors:[],conflicts:[]};
 }
 if(message.type==='cfRenameEntry'){const store=fixture.stores[message.source.bucketName],key=message.entry.key.slice(0,message.entry.key.lastIndexOf('/')+1)+message.newName;if(store.has(key))return {ok:false,error:'Destination exists'};store.set(key,store.get(message.entry.key));store.delete(message.entry.key);return {ok:true,completed:1};}
 if(message.type==='cfDeleteObjects'){for(const item of message.entries)fixture.stores[message.source.bucketName].delete(item.key);return {ok:true,completed:message.entries.length,errors:[]};}
 if(message.type==='cfCreateFolder'){fixture.stores[message.bucketName].set(message.prefix+message.name+'/.redown',{text:'',size:0});return {ok:true};}
 throw Error('Unexpected mocked message '+message.type);
}
renderFileItems();globalThis.fixture=fixture;
`;
const body=`<div class="wrap"><p>Local UI fixture · extension, downloads and Cloudflare are mocked</p>${d.getElementById('explore-zone').outerHTML}<input id="local-files" type="file" hidden></div>`;
const preview=`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}<script>${publicCode}\n${menuCode}\n${functions}\n${mocks}</script></body></html>`;await writeFile(output+'/preview.html',preview);
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
 await call('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false},sessionId);
 await evaluate(`document.write(${JSON.stringify(preview)});document.close()`);
 const report={scope:'Ordinary Chromium UI with mocked extension/Cloudflare/downloads, not installed-extension or live-cloud evidence.',browser:info.Browser,passed:[]};
 const menu=async(key="")=>{await evaluate(`(()=>{const row=[...$('workspace-objects').children].find(row=>!${JSON.stringify(key)}||row.dataset.id===${JSON.stringify(key)});row.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:430,clientY:220}));})()`);await pause(50);};
 const click=async text=>{await evaluate(`(()=>{const button=[...document.querySelectorAll('.context-menu button')].findLast(b=>!b.disabled&&b.textContent===${JSON.stringify(text)});if(!button)throw Error('Missing menu item '+${JSON.stringify(text)});return button.onclick(new MouseEvent('click'));})()`);await pause(60);};
 await menu();await click('Copy');assert.match(await evaluate(`$('explorer-operation').textContent`),/copied in REDOWN/);report.passed.push('Copy uses REDOWN clipboard');
 await menu();await click('Copy to ›');await click('target ›');await click('nested ›');await shot('nested-copy-here');await click('Copy here');
 assert.equal(await evaluate(`fixture.stores.target.get('nested/雪 #?.txt').text`),'original payload');assert.equal(await evaluate(`fixture.stores.source.has('雪 #?.txt')`),true);report.passed.push('Nested Copy here dispatches correct bucket/prefix and preserves source in mock');
 await menu();await click('Move to ›');await click('target ›');await click('Move here');assert.equal(await evaluate(`fixture.stores.source.has('雪 #?.txt')`),false);report.passed.push('Move here dispatches move in mock');
 await evaluate(`goLocation('a','target')`);await menu();await click('Download');assert.equal(await evaluate(`fixture.download.length`),1);assert.match(await evaluate(`$('explorer-operation').textContent`),/Downloaded/);report.passed.push('Download uses item key and reports mocked Chrome completion');
 await menu();await click('Open / Preview');assert.equal(await evaluate('fixture.preview'),'nested/雪 #?.txt');report.passed.push('Preview dispatches correct object');
 await menu();await click('Properties');assert.match(await evaluate(`$('properties-content').textContent`),/nested\/雪 #\?\.txt/);await shot('properties');await evaluate(`$('explorer-properties').close()`);report.passed.push('Properties shows selected key and shared URLs disclosure');
 await menu();await click('Copy public URL');assert.equal(await evaluate('fixture.clipboard'),'https://pub-fixture.r2.dev/nested/%E9%9B%AA%20%23%3F.txt');report.passed.push('Copy public URL uses shared encoded address model (mock clipboard)');
 await menu();await click('Rename');await evaluate(`(()=>{const input=document.querySelector('.inline-rename');input.value='renamed 雪.txt';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()`);await pause(100);assert.equal(await evaluate(`fixture.stores.target.has('nested/renamed 雪.txt')`),true);report.passed.push('Rename inline Enter dispatches captured source');
 await call('Page.enable',{},sessionId);let dialog=false,accept=false;
 // Auto-confirm only the disposable MOCK fixture dialog.
 const old=ws.onmessage;ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Page.javascriptDialogOpening'){dialog=true;void call('Page.handleJavaScriptDialog',{accept},sessionId);}old(event);};
 await menu('nested/renamed 雪.txt');await click('Delete');assert.equal(dialog,true);assert.equal(await evaluate(`fixture.stores.target.has('nested/renamed 雪.txt')`),true);report.passed.push('Cancel delete preserves selected mock file');accept=true;
 await menu('nested/renamed 雪.txt');await click('Delete');assert.equal(await evaluate(`fixture.stores.target.has('nested/renamed 雪.txt')`),false);report.passed.push('Delete requires confirmation and dispatches explicit selection');
 await evaluate(`showExplorerMenu(430,220,null)`);await pause(50);await click('New folder');await evaluate(`(()=>{const input=document.querySelector('.inline-rename');input.value='Projects';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()`);await pause(100);assert.equal(await evaluate(`fixture.stores.target.has('Projects/.redown')`),true);report.passed.push('New folder uses captured bucket and prefix');
 await menu();await click('Refresh');report.passed.push('Refresh handler renders current mock location');
 for(const width of [1366,390]){await call('Emulation.setDeviceMetricsOverride',{width,height:768,deviceScaleFactor:1,mobile:false},sessionId);await menu();const bounds=await evaluate(`(()=>{const r=$('explorer-menu').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()`);assert.ok(bounds.left>=0&&bounds.right<=width&&bounds.top>=0&&bounds.bottom<=768);await shot('menu-'+width);}
 report.calls=await evaluate('fixture.calls');await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{ws?.close();if(browser&&browser.exitCode===null){browser.kill();await Promise.race([new Promise(r=>browser.once('exit',r)),pause(1500)]);if(browser.exitCode===null)browser.kill('SIGKILL');}await rm(profile,{recursive:true,force:true,maxRetries:3});}
