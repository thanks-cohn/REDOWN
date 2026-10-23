import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';import vm from 'node:vm';
const html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8'),code=await readFile(new URL('../extension/popup.js',import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
function open({total='0',connected=true,handler,session}={}){
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window,calls=[];let changed,opened=0;
 const data={cloudflareAuth:connected?{accessToken:'fixture'}:null};
 w.chrome={storage:{local:{get:async()=>data},session:session?{get:async()=>({cloudflareLogin:session})}:undefined,onChanged:{addListener:fn=>changed=fn}},runtime:{openOptionsPage:async()=>{opened++;},sendMessage:async m=>{calls.push(m);return handler?handler(m):m.type==='cfAccounts'?{ok:true,accounts:[]}:m.type==='deliveryCount'?{ok:true,counter:{total}}:m.type==='cfConnect'?{ok:true,pending:true}:m.type==='cfLoginStatus'?{ok:true,phase:'connected'}:null;}}};
 w.eval(code);return {w,d:w.document,calls,data,change:patch=>changed(patch,'local'),opened:()=>opened,close:()=>w.close()};
}
const display=h=>[...h.d.querySelectorAll('.wheel')].map(w=>w.querySelector('.reel')?.style.getPropertyValue('--digit')||w.textContent).join('');
test('green zero-delivery state reads READY! and Dashboard opens the existing options page',async()=>{
 const h=open();try{await settle();assert.equal(h.d.getElementById('connection').dataset.state,'connected');assert.equal(display(h),'READY!');assert.equal(h.d.getElementById('odometer').disabled,true);h.d.getElementById('dashboard').click();await settle();assert.equal(h.opened(),1);assert.ok(h.calls.every(m=>['cfAccounts','deliveryCount'].includes(m.type)));}finally{h.close();}
});
test('red connection shows LOGIN in the same odometer and clicking it starts direct sign-in',async()=>{
 const h=open({connected:false,total:'27'});try{await settle();assert.equal(display(h),'LOGIN!');assert.equal(h.d.getElementById('odometer').disabled,false);h.data.cloudflareAuth={accessToken:'fixture'};h.d.getElementById('odometer').click();assert.equal(h.d.getElementById('connection').dataset.state,'checking');await settle();assert.equal(display(h),'000027');assert.equal(h.calls.filter(m=>m.type==='cfConnect').length,1);assert.equal(h.opened(),0);}finally{h.close();}
});
test('failed or canceled login stays red and retryable without resetting the total',async()=>{
 const h=open({connected:false,handler:m=>m.type==='deliveryCount'?{ok:true,counter:{total:'9'}}:m.type==='cfConnect'?{ok:true}:m.type==='cfLoginStatus'?{ok:true,phase:'failed',error:'Sign-in was closed'}:{ok:false}});
 try{await settle();h.d.getElementById('connection').click();await settle();assert.equal(display(h),'LOGIN!');assert.equal(h.d.getElementById('connection').disabled,false);assert.match(h.d.getElementById('status').textContent,/closed/);}finally{h.close();}
});
test('odometer carries digits, expands beyond six places and retains exact large totals',async()=>{
 const h=open({total:'999999'});try{await settle();assert.equal(display(h),'999999');h.change({transferCounter:{newValue:{total:'1000000'}}});assert.equal(display(h),'1000000');h.change({transferCounter:{newValue:{total:'9007199254740993'}}});assert.equal(display(h),'9007199254740993');assert.match(h.d.getElementById('odometer').getAttribute('aria-label'),/9007199254740993 files/);}finally{h.close();}
});
test('late count response cannot overwrite a newer storage count',async()=>{
 let release;const h=open({handler:m=>m.type==='deliveryCount'?new Promise(r=>release=r):{ok:true,accounts:[]}});try{await settle();h.change({transferCounter:{newValue:{total:'2'}}});release({ok:true,counter:{total:'1'}});await settle();assert.equal(display(h),'000002');}finally{h.close();}
});
test('reopening during OAuth resumes background login without opening duplicate windows',async()=>{
 const h=open({session:{phase:'authorizing'}});try{await settle();assert.equal(h.calls.some(m=>m.type==='cfConnect'),false);assert.ok(h.calls.some(m=>m.type==='cfLoginStatus'));assert.equal(h.d.getElementById('connection').dataset.state,'connected');}finally{h.close();}
});
test('count failure never invents a zero count or hides the disconnected LOGIN action',async()=>{
 for(const connected of [true,false]){const h=open({connected,handler:m=>m.type==='deliveryCount'?{ok:false}:{ok:true,accounts:[]}});try{await settle();assert.equal(display(h),connected?'------':'LOGIN!');assert.doesNotMatch(display(h),/READY/);}finally{h.close();}}
});
test('background accepts a discovered unsaved bucket only after read-only existence validation',async()=>{
 const bg=await readFile(new URL('../extension/background.js',import.meta.url),'utf8'),a=bg.indexOf('if (message?.type === "ingest")'),b=bg.indexOf('if (message?.type',a+10);let uploaded=0,response;
 const c=vm.createContext({message:{type:'ingest',prefix:'child/',sourceUrl:'https://fixture.invalid/file',destination:{accountId:'a',bucketName:'new'}},getProfiles:async()=>[],listBuckets:async()=>[{name:'new'}],cleanExplorerPrefix:x=>x,ingestCloudflareAtPrefix:async p=>{uploaded++;assert.equal(p.bucketName,'new');return 'stored';},recordTransfer:async()=>{},sendResponse:r=>response=r});
 await vm.runInContext('(async()=>{'+bg.slice(a,b)+'})()',c);assert.equal(response.ok,true);assert.equal(uploaded,1);
 c.message.destination.bucketName='missing';await assert.rejects(vm.runInContext('(async()=>{'+bg.slice(a,b)+'})()',c),/no longer available/);assert.equal(uploaded,1);
});
