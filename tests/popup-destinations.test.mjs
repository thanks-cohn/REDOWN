import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';import vm from 'node:vm';
const html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8'),code=await readFile(new URL('../extension/popup.js',import.meta.url),'utf8'),odometer=await readFile(new URL('../extension/odometer.js',import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
function open({total='0',connected=true,handler,session,preferences,animate=false,audioClass}={}){
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window,calls=[];let changed,opened=0;
 const data={cloudflareAuth:connected?{accessToken:'fixture'}:null,popupOdometer:preferences};
 const jobs=new Map();let clock=0,jobId=0;
 w.matchMedia=()=>({matches:!animate});if(audioClass)w.AudioContext=audioClass;
 if(animate){w.setTimeout=(fn,delay)=>{const id=++jobId;jobs.set(id,{fn,at:clock+delay});return id;};w.clearTimeout=id=>jobs.delete(id);}
 w.chrome={storage:{local:{get:async()=>data,set:async patch=>Object.assign(data,structuredClone(patch))},session:session?{get:async()=>({cloudflareLogin:session})}:undefined,onChanged:{addListener:fn=>changed=fn}},runtime:{openOptionsPage:async()=>{opened++;},sendMessage:async m=>{calls.push(m);return handler?handler(m):m.type==='cfAccounts'?{ok:true,accounts:[]}:m.type==='deliveryCount'?{ok:true,counter:{total}}:m.type==='cfConnect'?{ok:true,pending:true}:m.type==='cfLoginStatus'?{ok:true,phase:'connected'}:null;}}};
 w.eval(odometer);w.eval(code);return {tick:()=>{const [id,job]=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0]||[];if(!job)return false;jobs.delete(id);clock=job.at;job.fn();return true;},w,d:w.document,calls,data,change:patch=>changed(patch,'local'),opened:()=>opened,close:()=>w.close()};
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

test('reopening starts at the last seen count, rolls to the current total and remembers completion',async()=>{
 const h=open({total:'120',animate:true,preferences:{version:1,lastSeenTotal:'10',soundEnabled:false}});
 try{await settle();assert.equal(display(h),'000010');assert.equal(h.d.getElementById('odometer').getAttribute('aria-busy'),'true');let steps=0;while(h.tick()){assert.ok(++steps<30);}await settle();assert.equal(display(h),'000120');assert.equal(h.data.popupOdometer.lastSeenTotal,'120');assert.equal(h.d.getElementById('odometer').hasAttribute('aria-busy'),false);assert.equal(h.data.popupOdometer.soundEnabled,false);}finally{h.close();}
});
test('a newer total interrupts an old roll and final persistence never rolls back',async()=>{
 const h=open({total:'20',animate:true,preferences:{version:1,lastSeenTotal:'10',soundEnabled:false}});
 try{await settle();h.tick();h.change({transferCounter:{newValue:{total:'100'}}});let steps=0;while(h.tick())assert.ok(++steps<30);await settle();assert.equal(display(h),'000100');assert.equal(h.data.popupOdometer.lastSeenTotal,'100');}finally{h.close();}
});
test('reduced motion immediately shows the verified total and the sound preference persists',async()=>{
 const h=open({total:'25',preferences:{version:1,lastSeenTotal:'10',soundEnabled:false}});
 try{await settle();assert.equal(display(h),'000025');assert.equal(h.d.getElementById('counter-sound').getAttribute('aria-pressed'),'false');h.d.getElementById('counter-sound').click();await settle();assert.equal(h.data.popupOdometer.soundEnabled,true);}finally{h.close();}
});

test('the final settled number emits one quiet click and mute suppresses subsequent clicks',async()=>{
 let clicks=0;
 class Audio {state='running';sampleRate=22050;destination={};createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)};}createBufferSource(){return {connect(){},disconnect(){},start(){clicks++;}};}createGain(){return {gain:{value:0},connect(){},disconnect(){}};}close(){return Promise.resolve();}}
 const h=open({total:'50',animate:true,audioClass:Audio,preferences:{version:1,lastSeenTotal:'5',soundEnabled:true}});
 try{await settle();assert.equal(clicks,0);let steps=0;while(h.tick())assert.ok(++steps<30);await settle();assert.equal(clicks,1);h.d.getElementById('counter-sound').click();await settle();h.change({transferCounter:{newValue:{total:'60'}}});steps=0;while(h.tick())assert.ok(++steps<30);await settle();assert.equal(clicks,1);assert.equal(display(h),'000060');assert.equal(h.data.popupOdometer.soundEnabled,false);}finally{h.close();}
});
test('unavailable audio never prevents reaching or saving the verified total',async()=>{
 class Audio {constructor(){throw Error('Audio blocked');}}
 const h=open({total:'8',animate:true,audioClass:Audio,preferences:{version:1,lastSeenTotal:'2',soundEnabled:true}});
 try{await settle();let steps=0;while(h.tick())assert.ok(++steps<30);await settle();assert.equal(display(h),'000008');assert.equal(h.data.popupOdometer.lastSeenTotal,'8');}finally{h.close();}
});
