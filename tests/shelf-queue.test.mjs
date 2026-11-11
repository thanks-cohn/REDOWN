import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const tick=()=>new Promise(r=>setImmediate(r)),load=(w,n)=>w.eval(readFileSync('extension/'+n+'.js','utf8'));
async function fixture(hash='',stored={}){
 const dom=new JSDOM(readFileSync('extension/shelf.html','utf8'),{url:'https://shelf.example/shelf.html'+hash,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const local={debugModeEnabled:false,...stored},listeners=[],opened=[],calls=[];let rows=[];
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=(x,y)=>Object.defineProperty(w,'scrollY',{configurable:true,value:y});w.matchMedia=()=>({matches:false});
 const chrome={runtime:{id:'test',getURL:p=>'https://shelf.example/'+p,onMessage:{addListener:()=>{}},sendMessage:async m=>{calls.push(m);if(m.type==='transferQueueV1'){
   if(m.operation==='acknowledge'){const row=rows.find(r=>r.id===m.input.id);row.acknowledged=true;row.actions=[];return {ok:true,result:{acknowledged:true}};}
   return {ok:true,result:{rows,counts:{active:rows.filter(r=>r.state==='queued').length,attention:rows.filter(r=>r.state==='blocked'&&!r.acknowledged).length,pending:rows.filter(r=>r.state!=='verified'&&!r.acknowledged).length},gaps:[],omitted:0}};
 }return {ok:false};}},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,local[k]])),set:async p=>Object.assign(local,p),remove:async k=>delete local[k]},session:{get:async()=>({})},onChanged:{addListener:fn=>listeners.push(fn),removeListener:()=>{}}},tabs:{create:async p=>opened.push(p)},windows:{getCurrent:async()=>({id:1})}};
 w.chrome=chrome;w.RedownChuteStage={parseMB:Number};w.RedownShelfHistory={open:async()=>{}};
 load(w,'transfer-queue');load(w,'shelf');load(w,'shelf-queue');await tick();await tick();
 return {dom,w,local,opened,calls,setRows:async next=>{rows=next;await w.RedownShelfQueue.refresh();},debug:async value=>{local.debugModeEnabled=value;for(const fn of listeners)fn({debugModeEnabled:{newValue:value}},'local');await tick();},close:()=>{w.dispatchEvent(new w.Event('pagehide'));w.close();}};
}
const row=(provider='google',state='blocked')=>({id:webcrypto.randomUUID(),attemptId:webcrypto.randomUUID(),provider,state,code:'SOURCE_RETURNED_HTML',name:'Image fixture.png',receivedAt:Date.now()+1,lastActivityAt:Date.now()+1,bytes:null,total:null,jobLinked:false,attemptOnly:true,historyLinked:false,actions:['view-trace','acknowledge']});
test('Queue Back returns to each actual Shelf section, preserves DOM selection, and Home is unchanged',async()=>{
 const f=await fixture();try{
 const home=f.w.document.getElementById('dashboard').outerHTML;
 for(const section of ['explorer','clouds','history','settings']){
  f.w.location.hash='#'+section;await tick();const panel=f.w.document.getElementById(section+'-view'),input=f.w.document.createElement('input');input.value='preserved selection';panel.append(input);
  f.w.document.getElementById('nav-queue').click();assert.equal(f.w.document.getElementById('queue-view').hidden,false);assert.equal(f.w.document.getElementById('dashboard').outerHTML,home);
  f.w.document.getElementById('queue-back').click();assert.equal(f.w.location.hash,'#'+section);assert.equal(input.value,'preserved selection');assert.equal(input.isConnected,true);
 }
 f.w.document.getElementById('dashboard').click();await tick();assert.equal(f.opened.at(-1).url,'https://shelf.example/beta/explorer.html');
 }finally{f.close();}
});
test('direct Queue link falls back to REMOTES; repeated Queue entry does not stack navigation loops',async()=>{
 const f=await fixture('#queue');try{const n=f.w.history.length;f.w.RedownShelfNavigation.openQueue();f.w.RedownShelfNavigation.openQueue();assert.equal(f.w.history.length,n);f.w.document.getElementById('queue-back').click();assert.equal(f.w.location.hash,'#clouds');}finally{f.close();}
});
test('Debug failure is provider-specific, double-pulse only for live failures; uncertain amber and queued neutral',async()=>{
 const f=await fixture();try{
 const a=row();await f.setRows([a]);assert.equal(f.w.document.querySelector('[data-provider="google"] .queue-card-signal').hidden,true);
 await f.debug(true);const google=f.w.document.querySelector('[data-provider="google"]');assert.equal(google.dataset.queueState,'red');assert.equal(google.classList.contains('queue-failure-flash'),false);
 const b=row('dropbox','queued');await f.setRows([b,a]);assert.equal(f.w.document.querySelector('[data-provider="dropbox"]').dataset.queueState,'neutral');
 const next=row();next.lastActivityAt=Date.now()+100;await f.setRows([next,b]);assert.equal(google.classList.contains('queue-failure-flash'),true);
 google.querySelector('.queue-card-signal').click();assert.match(f.w.location.hash,new RegExp(next.id));assert.equal(f.w.document.querySelector('[data-queue-id="'+next.id+'"]').getAttribute('aria-current'),'true');
 const u=row('onedrive','uncertain');u.code='UNCONFIRMED';await f.setRows([next,b,u]);assert.equal(f.w.document.querySelector('[data-provider="onedrive"]').dataset.queueState,'amber');
 await f.debug(false);assert.equal(google.dataset.queueState,undefined);assert.equal(google.querySelector('.queue-card-signal').hidden,true);
 }finally{f.close();}
});
test('reduced motion is static, names are escaped, unknown length has no invented percentage, counts exclude verified',async()=>{
 const f=await fixture();try{
 await f.debug(true);f.w.matchMedia=()=>({matches:true});const a=row();a.name='<img src=x onerror=alert(1)>';a.lastActivityAt=Date.now()+100;
 const complete=row('dropbox','verified');await f.setRows([a,complete]);f.w.document.getElementById('nav-queue').click();
 assert.equal(f.w.document.querySelector('[data-provider="google"]').classList.contains('queue-failure-flash'),false);assert.equal(f.w.document.querySelector('#queue-rows img'),null);assert.match(f.w.document.getElementById('queue-rows').textContent,/<img src=x/);assert.equal(f.w.document.querySelector('#queue-rows progress'),null);assert.equal(f.w.document.getElementById('queue-count').textContent,'1');
 }finally{f.close();}
});

test('late metadata enrichment does not restart a definitive failure flash',async()=>{
 const f=await fixture();try{await f.debug(true);const a=row();a.outcomeAt=Date.now()+50;a.lastActivityAt=a.outcomeAt;await f.setRows([a]);const card=f.w.document.querySelector('[data-provider="google"]');assert.equal(card.classList.contains('queue-failure-flash'),true);card.dispatchEvent(Object.assign(new f.w.Event('animationend'),{animationName:'queue-failure-pulse'}));assert.equal(card.classList.contains('queue-failure-flash'),false);a.lastActivityAt+=100;await f.setRows([a]);assert.equal(card.classList.contains('queue-failure-flash'),false);}finally{f.close();}
});

test('Queue filters and provider groups use the same canonical rows',async()=>{
 const f=await fixture();try{const a=row('google','blocked'),b=row('dropbox','queued'),c=row('onedrive','verified');await f.setRows([a,b,c]);f.w.RedownShelfNavigation.openQueue();const filter=f.w.document.getElementById('queue-filter');filter.value='completed';filter.dispatchEvent(new f.w.Event('change'));assert.equal(f.w.document.querySelectorAll('.queue-row').length,1);assert.match(f.w.document.querySelector('.queue-row').textContent,/OneDrive/);filter.value='all';filter.dispatchEvent(new f.w.Event('change'));const group=f.w.document.getElementById('queue-group');group.value='provider';group.dispatchEvent(new f.w.Event('change'));assert.equal(f.w.document.querySelectorAll('.queue-provider-heading').length,3);}finally{f.close();}
});

test('opt-in last-view preference can restore Queue with a safe REMOTES Back fallback',async()=>{
 const f=await fixture('',{shelfStartViewMode:'last',shelfLastViewV1:'queue'});try{await new Promise(r=>setTimeout(r,30));assert.equal(f.w.location.hash,'#queue');assert.equal(f.w.document.getElementById('queue-view').hidden,false);f.w.document.getElementById('queue-back').click();assert.equal(f.w.location.hash,'#clouds');}finally{f.close();}
});
