import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';import vm from 'node:vm';
const html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8'),code=await readFile(new URL('../extension/popup.js',import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<16;i++)await new Promise(r=>setImmediate(r));};
function open(store,handler){
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window,calls=[];let changed;
 w.chrome={storage:{local:{get:async()=>structuredClone(store),set:async patch=>Object.assign(store,structuredClone(patch))},onChanged:{addListener:fn=>changed=fn}},runtime:{openOptionsPage(){},sendMessage:async m=>{calls.push(m);return handler(m);}}};w.eval(code);
 return {dom,w,d:w.document,calls,change:()=>changed({profiles:{}},'local'),choose(id){const s=w.document.getElementById('profile');s.value=id;s.dispatchEvent(new w.Event('change'));},folder(i,prefix){const s=w.document.getElementById('folder-level-'+i);s.value=prefix;s.dispatchEvent(new w.Event('change'));},close:()=>w.close()};
}
const store=()=>({cloudflareAuth:{accessToken:'fixture-token'},profiles:[{id:'saved',type:'cloudflare-r2',accountId:'a',bucketName:'same',name:'Saved'}]});
function provider(m){
 if(m.type==='cfAccounts')return {ok:true,accounts:[{id:'a',name:'First account'},{id:'b',name:'Second account'}]};
 if(m.type==='cfBuckets')return {ok:true,buckets:(m.accountId==='a'?['same','new']:['same']).map(name=>({name}))};
 if(m.type==='cfDestinationFolders')return {ok:true,folders:[{name:'child',prefix:m.prefix+'child/'}]};
 if(m.type==='ingest')return {ok:true,location:'stored'};
 throw Error('Unexpected operation');
}
test('popup discovers all connected buckets once per account and opening never prepares or transfers',async()=>{
 const data=store(),h=open(data,provider);try{await settle();const options=[...h.d.getElementById('profile').options];assert.equal(options.length,3);assert.ok(options.some(o=>o.textContent.includes('new')));assert.ok(options.some(o=>o.textContent.includes('Second account')));assert.equal(h.calls.filter(m=>m.type==='cfBuckets').length,2);assert.ok(h.calls.every(m=>['cfAccounts','cfBuckets','cfDestinationFolders'].includes(m.type)));assert.equal(data.profiles.length,1);
 const fresh=options.find(o=>o.textContent.startsWith('new'));h.choose(fresh.value);await settle();h.d.getElementById('url').value='https://fixture.invalid/file';h.d.getElementById('send').click();await settle();assert.equal(h.calls.at(-1).destination.bucketName,'new');assert.equal(h.calls.at(-1).destination.accountId,'a');
 }finally{h.close();}
});
test('account listing failure retains saved destinations with explicit refresh feedback',async()=>{
 const h=open(store(),m=>m.type==='cfAccounts'?{ok:false}:provider(m));try{await settle();assert.equal(h.d.getElementById('profile').value,'saved');assert.match(h.d.getElementById('status').textContent,/could not be refreshed/);assert.equal(h.d.getElementById('bucket-refresh').disabled,false);}finally{h.close();}
});
test('chosen bucket and optional folder levels persist and restore on reopening without a transfer',async()=>{
 const data=store();let h=open(data,provider);try{await settle();const fresh=[...h.d.getElementById('profile').options].find(o=>o.textContent.startsWith('new'));h.choose(fresh.value);await settle();h.folder(0,'child/');h.d.getElementById('folder-deeper').click();await settle();h.folder(1,'child/child/');await settle();assert.equal(data.popupDestination.bucketName,'new');assert.equal(data.popupDestination.prefix,'child/child/');assert.equal(data.popupDestination.depth,2);
 }finally{h.close();}
 h=open(data,provider);try{await settle();assert.match(h.d.getElementById('folder-destination').textContent,/new.*child\/child\//);assert.equal(h.d.querySelectorAll('.folder-level').length,2);assert.equal(h.d.getElementById('send').disabled,false);assert.equal(h.calls.some(m=>m.type==='ingest'),false);}finally{h.close();}
});
test('unavailable remembered bucket or folder blocks Send instead of silently falling back',async()=>{
 for(const missing of ['bucket','folder']){
  const data=store();data.popupDestination={version:1,accountId:'a',bucketName:missing==='bucket'?'gone':'same',profileId:'saved',prefix:'gone/',depth:1};const h=open(data,provider);
  try{await settle();assert.equal(h.d.getElementById('send').disabled,true);assert.match(h.d.getElementById('status').textContent,/unavailable|no longer available/);assert.equal(h.calls.some(m=>m.type==='ingest'),false);}finally{h.close();}
 }
});
test('folder dropdowns and options explicitly use black-on-white native color scheme',async()=>{
 const h=open(store(),provider);try{await settle();const select=h.d.getElementById('folder-level-0'),style=h.w.getComputedStyle(select),option=h.w.getComputedStyle(select.options[0]);assert.equal(style.color,'rgb(17, 17, 17)');assert.equal(style.backgroundColor,'rgb(255, 255, 255)');assert.equal(style.colorScheme,'light');assert.equal(option.color,'rgb(17, 17, 17)');assert.equal(option.backgroundColor,'rgb(255, 255, 255)');}finally{h.close();}
});
test('background accepts a discovered unsaved bucket only after read-only existence validation',async()=>{
 const bg=await readFile(new URL('../extension/background.js',import.meta.url),'utf8'),a=bg.indexOf('if (message?.type === "ingest")'),b=bg.indexOf('if (message?.type',a+10);let uploaded=0,response;
 const c=vm.createContext({message:{type:'ingest',prefix:'child/',sourceUrl:'https://fixture.invalid/file',destination:{accountId:'a',bucketName:'new'}},getProfiles:async()=>[],listBuckets:async()=>[{name:'new'}],cleanExplorerPrefix:x=>x,ingestCloudflareAtPrefix:async p=>{uploaded++;assert.equal(p.bucketName,'new');return 'stored';},recordTransfer:async()=>{},sendResponse:r=>response=r});
 await vm.runInContext('(async()=>{'+bg.slice(a,b)+'})()',c);assert.equal(response.ok,true);assert.equal(uploaded,1);
 c.message.destination.bucketName='missing';await assert.rejects(vm.runInContext('(async()=>{'+bg.slice(a,b)+'})()',c),/no longer available/);assert.equal(uploaded,1);
});

test('connection light verifies reads and reconnects directly without settings or writes',async()=>{
 const data=store();let authorized=false;
 const h=open(data,m=>{
  if(m.type==='cfAccounts'&&!authorized)return {ok:false};
  if(m.type==='cfConnect'){authorized=true;return {ok:true,pending:true};}
  if(m.type==='cfLoginStatus')return {ok:true,phase:'connected'};
  return provider(m);
 });try{await settle();const light=h.d.getElementById('connection');assert.equal(light.dataset.state,'disconnected');assert.match(light.getAttribute('aria-label'),/reconnect/);light.click();assert.equal(light.dataset.state,'checking');assert.equal(light.disabled,true);await settle();assert.equal(light.dataset.state,'connected');assert.equal(light.disabled,false);assert.equal(h.calls.filter(m=>m.type==='cfConnect').length,1);assert.equal(h.calls.some(m=>m.type==='ingest'||m.type==='cfProvision'),false);}finally{h.close();}
});
test('failed sign-in leaves a retryable red light rather than claiming success',async()=>{
 const h=open(store(),m=>m.type==='cfAccounts'?{ok:false}:m.type==='cfConnect'?{ok:true,pending:true}:m.type==='cfLoginStatus'?{ok:true,phase:'failed',error:'Sign-in was closed'}:provider(m));
 try{await settle();h.d.getElementById('connection').click();await settle();assert.equal(h.d.getElementById('connection').dataset.state,'disconnected');assert.equal(h.d.getElementById('connection').disabled,false);assert.match(h.d.getElementById('status').textContent,/closed/);}finally{h.close();}
});
