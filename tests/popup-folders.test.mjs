import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const code=await readFile(new URL('../extension/popup.js',import.meta.url),'utf8'),html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
function harness(list=async message=>({ok:true,folders:[{name:'next 雪…',prefix:message.prefix+'next 雪…/'}],cursor:''})){
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window,calls=[];let onChange;
 const profiles=[{id:'a',type:'cloudflare-r2',accountId:'account',bucketName:'alpha',name:'Alpha'},{id:'b',type:'cloudflare-r2',accountId:'account',bucketName:'beta',name:'Beta'},{id:'g',type:'github',name:'GitHub',repository:'fixture/repo'}];
 w.chrome={storage:{local:{get:async()=>({profiles,betaModeEnabled:true}),set:async()=>{}},onChanged:{addListener:fn=>onChange=fn}},runtime:{openOptionsPage(){},sendMessage:async message=>{calls.push(message);return message.type==='ingest'?{ok:true,location:'https://fixture.invalid/result'}:list(message);}}};w.eval(code);
 const select=(index,value)=>{const el=w.document.getElementById('folder-level-'+index);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 return {dom,w,d:w.document,calls,select,refresh:()=>onChange({profiles:{}},"local"),close:()=>w.close()};
}
test('popup adds arbitrary optional dropdown levels and sends the exact selected prefix',async()=>{
 const h=harness();try{await settle();assert.equal(h.d.querySelectorAll('.folder-level').length,1);assert.equal(h.d.getElementById('folder-deeper').disabled,true);
 let prefix='';for(let i=0;i<7;i++){prefix+='next 雪…/';h.select(i,prefix);if(i<6){h.d.getElementById('folder-deeper').click();await settle();}}
 assert.equal(h.d.querySelectorAll('.folder-level').length,7);assert.equal(h.calls.filter(c=>c.type==='cfDestinationFolders').length,7);
 h.d.getElementById('url').value='https://fixture.invalid/file';h.d.getElementById('send').click();await settle();assert.equal(h.calls.at(-1).prefix,prefix);assert.equal(h.calls.at(-1).profileId,'a');assert.match(h.d.getElementById('status').textContent,/Stored/);
 }finally{h.close();}
});
test('parent changes clear descendants and removing a level restores the parent destination',async()=>{
 const h=harness(async m=>({ok:true,folders:[{name:'one',prefix:m.prefix+'one/'},{name:'two',prefix:m.prefix+'two/'}]}));try{await settle();h.select(0,'one/');h.d.getElementById('folder-deeper').click();await settle();h.select(1,'one/two/');h.d.getElementById('folder-deeper').click();await settle();h.d.getElementById('folder-remove-1').click();assert.equal(h.d.querySelectorAll('.folder-level').length,1);assert.match(h.d.getElementById('folder-destination').textContent,/one\//);
 h.d.getElementById('folder-deeper').click();await settle();h.select(0,'two/');assert.equal(h.d.querySelectorAll('.folder-level').length,1);assert.doesNotMatch(h.d.getElementById('folder-destination').textContent,/one/);
 }finally{h.close();}
});
test('late child and previous-bucket responses cannot contaminate the current dropdowns',async()=>{
 let release;const h=harness(async m=>m.bucketName==='alpha'&&m.prefix?new Promise(r=>release=r):{ok:true,folders:[{name:m.bucketName,prefix:m.prefix+m.bucketName+'/'}]});try{await settle();h.select(0,'alpha/');h.d.getElementById('folder-deeper').click();await settle();const bucket=h.d.getElementById('profile');bucket.value='b';bucket.dispatchEvent(new h.w.Event('change'));await settle();release({ok:true,folders:[{name:'stale',prefix:'alpha/stale/'}]});await settle();assert.equal(h.d.querySelectorAll('.folder-level').length,1);assert.doesNotMatch(h.d.getElementById('folder-levels').textContent,/stale|alpha/);assert.match(h.d.getElementById('folder-destination').textContent,/beta/);
 }finally{h.close();}
});
test('paged folder reads retain earlier choices and failures offer retry without transferring',async()=>{
 let fail=true;const h=harness(async m=>{if(fail)throw Error('private error');return {ok:true,folders:[{name:m.cursor?'second':'first',prefix:m.cursor?'second/':'first/'}],cursor:m.cursor?'':'page2'};});try{await settle();assert.match(h.d.getElementById('folder-levels').textContent,/Retry/);assert.equal(h.calls.some(c=>c.type==='ingest'),false);fail=false;h.d.getElementById('folder-retry-0').click();await settle();h.d.getElementById('folder-retry-0').click();await settle();assert.deepEqual([...h.d.getElementById('folder-level-0').options].map(o=>o.value),['','first/','second/']);
 }finally{h.close();}
});
test('bucket root is explicit and GitHub keeps its category route without a Cloudflare prefix',async()=>{
 const h=harness();try{await settle();h.d.getElementById('url').value='https://fixture.invalid/file';h.d.getElementById('send').click();await settle();assert.equal(h.calls.at(-1).prefix,'');const p=h.d.getElementById('profile');p.value='g';p.dispatchEvent(new h.w.Event('change'));h.d.getElementById('send').click();await settle();assert.equal(Object.hasOwn(h.calls.at(-1),'prefix'),false);assert.equal(h.d.getElementById('cloudflare-folders').hidden,true);assert.equal(h.d.getElementById('category-field').hidden,false);
 }finally{h.close();}
});
test('background ingest honors explicit root/deep prefixes and preserves the legacy category route',async()=>{
 const bg=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');const start=bg.indexOf('if (message?.type === "ingest")'),end=bg.indexOf('if (message?.type',start+10),snippet=bg.slice(start,end);let result;const calls=[];
 const c=vm.createContext({message:null,getProfiles:async()=>[{id:'a',type:'cloudflare-r2'}],cleanExplorerPrefix:x=>x,ingestCloudflareAtPrefix:async(...args)=>{calls.push({kind:'prefix',args});return 'stored';},ingest:async(...args)=>{calls.push({kind:'category',args});return 'stored';},recordTransfer:async()=>{},sendResponse:r=>result=r});
 for(const prefix of ['', 'works/...2/雪 #?%/']){c.message={type:'ingest',profileId:'a',prefix};await vm.runInContext('(async()=>{'+snippet+'})()',c);assert.equal(result.ok,true);assert.equal(calls.at(-1).kind,'prefix');assert.equal(calls.at(-1).args[2],prefix);}
 c.message={type:'ingest',profileId:'a',category:'files'};await vm.runInContext('(async()=>{'+snippet+'})()',c);assert.equal(calls.at(-1).kind,'category');
});

test('legacy Worker cannot silently normalize an exact destination before capability verification',async()=>{
 const bg=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');let writes=0,exact=false;
 const c=vm.createContext({preparedProfile:async()=>({workerUrl:'https://fixture.invalid'}),cleanExplorerPrefix:x=>x,callBucketWorker:async()=>({exactIngestPaths:exact}),fetch:async(url,options)=>{writes++;const body=JSON.parse(options.body);assert.equal(body.exactFolder,true);return {ok:true,text:async()=>JSON.stringify({ok:true,key:body.folder+'/photo.png',publicUrl:'stored'})};}});
 vm.runInContext(bg.slice(bg.indexOf('async function ingestCloudflareAtPrefix('),bg.indexOf('async function ingestCloudflare(')),c);
 await assert.rejects(c.ingestCloudflareAtPrefix({},'https://fixture.invalid/photo','雪 #?%//deep/','photo.png'),{code:'EXPLORER_WORKER_CAPABILITY_MISMATCH'});assert.equal(writes,0);
 exact=true;assert.equal(await c.ingestCloudflareAtPrefix({},'https://fixture.invalid/photo','雪 #?%//deep/','photo.png'),'stored');assert.equal(writes,1);
});

test('parent changes discard pending child replies and background profile refresh preserves a chosen path',async()=>{
 let release;const h=harness(async m=>m.prefix?new Promise(r=>release=r):{ok:true,folders:[{name:'parent',prefix:'parent/'}]});
 try{await settle();h.select(0,'parent/');h.refresh();await settle();assert.equal(h.d.getElementById('folder-level-0').value,'parent/');
 h.d.getElementById('folder-deeper').click();await settle();assert.equal(h.d.getElementById('send').disabled,true);h.select(0,'');assert.equal(h.d.querySelectorAll('.folder-level').length,1);assert.equal(h.d.getElementById('send').disabled,false);
 release({ok:true,folders:[{name:'stale',prefix:'parent/stale/'}]});await settle();assert.doesNotMatch(h.d.getElementById('folder-levels').textContent,/stale/);assert.match(h.d.getElementById('folder-destination').textContent,/Bucket root/);
 }finally{h.close();}
});
