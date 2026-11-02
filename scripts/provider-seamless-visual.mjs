/* Local Chromium DOM/CSS fixture only. Does not install an extension or use OAuth. */
import {createServer} from 'node:http';import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';import {spawn} from 'node:child_process';import {tmpdir} from 'node:os';import {join,extname} from 'node:path';import assert from 'node:assert/strict';
const out='work/provider-seamless/visual';await mkdir(out,{recursive:true});
const shelf=await readFile('extension/shelf.html','utf8');const control=await readFile('extension/shelf-celebrations.js','utf8');
const fixture=shelf.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('</body>',`<script>globalThis.connectionChanges=[];globalThis.state={providerSaveCounters:{totals:{google:'12345',dropbox:'9007199254740993',onedrive:'123',cloudflare:'456'}}};globalThis.chrome={runtime:{sendMessage:async()=>({ok:true})},storage:{local:{get:async()=>state,set:async p=>Object.assign(state,p)},onChanged:{addListener:f=>connectionChanges.push(f)}}};${control}</script></body>`);
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;const file=p==='/'?null:'extension'+p;if(file?.includes('..'))throw Error();res.setHeader('Content-Type',p==='/'?'text/html':extname(p)==='.css'?'text/css':p.endsWith('.png')?'image/png':'text/plain');res.end(file?await readFile(file):fixture);}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=await mkdtemp(join(tmpdir(),'redown-drive-visual-'));const browser=spawn(process.env.CHROME_BIN||'chromium',['--headless','--no-sandbox','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});let ws;
try{
 let port;for(let i=0;i<100;i++){try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await new Promise(r=>setTimeout(r,100));}}if(!port)throw Error('No Chromium debugger');
 const v=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();ws=new WebSocket(v.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}};
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(Error('CDP timeout'));},10000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await call('Target.createTarget',{url:`http://127.0.0.1:${server.address().port}/`}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
 for(let i=0;i<50;i++){if(await evaluate("!!document.getElementById('shelf-google-drive') && typeof connectionChanges!=='undefined'"))break;await new Promise(r=>setTimeout(r,50));}
 const results=[];
 for(const theme of ['porcelain','midnight','neon'])for(const width of [280,360,480,760]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false},sessionId);
  await evaluate(`document.documentElement.dataset.shelfTheme=${JSON.stringify(theme)};document.querySelectorAll('.destination-word').forEach(n=>n.textContent='GO TO')`);
  await new Promise(r=>setTimeout(r,100));
  const r=await evaluate(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width}};return {overflow:document.documentElement.scrollWidth>innerWidth,outside:[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(n=>({tag:n.tagName,cls:n.className,text:n.textContent.slice(0,70),right:n.getBoundingClientRect().right})),cards:[...document.querySelectorAll('.destination-tile')].map(c=>({card:rect(c),go:rect(c.querySelector('.destination-word')),count:rect(c.querySelector('.provider-save-count')),success:rect(c.querySelector('.provider-success')),free:rect(c.querySelector('.destination-free-storage')),menu:rect(c.querySelector('summary'))}))}})()`);
  // Whole-page overflow includes unrelated preexisting footer links; assert the affected cards below.

  for(const c of r.cards){assert.ok(c.card.right<=width+1);assert.ok(c.free.right<=c.menu.x+2,JSON.stringify({theme,width,c}));assert.ok(c.count.x>=c.go.right-1||c.count.y>=c.go.bottom-1);if(theme==='neon')assert.ok(c.success.y>=c.free.bottom-1);else assert.ok((c.success.x>=c.go.right-1&&c.count.right<=c.free.x+1)||(c.success.y>=c.go.bottom-1&&c.count.bottom<=c.free.y+1),JSON.stringify({theme,width,c}));assert.ok(c.menu.width>=25);}
  results.push({theme,width,...r});
  if(width===360||width===760){const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);await writeFile(join(out,theme+'-'+width+'.png'),Buffer.from(shot.data,'base64'));}
 }
 await call('Emulation.setDeviceMetricsOverride',{width:360,height:1100,deviceScaleFactor:1,mobile:false},sessionId);
 await evaluate("document.documentElement.dataset.shelfTheme='neon';connectionChanges.forEach(f=>f({providerSaveCounters:{oldValue:{totals:{google:'12345'}},newValue:{totals:{google:'12346',dropbox:'9007199254740993',onedrive:'123',cloudflare:'456'},event:{id:'live',provider:'google',total:'12346',at:Date.now()}}}},'local'))");
 await new Promise(r=>setTimeout(r,180));
 const animation=await call('Page.captureScreenshot',{format:'png'},sessionId);await writeFile(join(out,'neon-confirmed-save.png'),Buffer.from(animation.data,'base64'));
 await evaluate("document.getElementById('settings-view').hidden=false;document.getElementById('clouds-view').hidden=true;document.getElementById('settings-view').scrollIntoView();document.getElementById('neon-success-sound').scrollIntoView({block:'center'})");
 await call('Emulation.setDeviceMetricsOverride',{width:360,height:1100,deviceScaleFactor:1,mobile:false},sessionId);
 const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);await writeFile(join(out,'settings-audio.png'),Buffer.from(shot.data,'base64'));
 await evaluate("document.getElementById('odometer-sound').click()");assert.equal(await evaluate('state.popupOdometer.soundEnabled'),true);assert.equal(await evaluate("document.getElementById('neon-success-sound').checked"),true);
 await writeFile(join(out,'results.json'),JSON.stringify({scope:'HTTP mock Shelf in Chromium; not installed Chrome/OAuth',browser:v.Browser,independentAudioToggles:true,results},null,2)+'\n');console.log(`${results.length} layout/state checks; independent audio toggle passed; ${out}`);
}finally{ws?.close();browser.kill();server.close();await new Promise(r=>setTimeout(r,100));await rm(profile,{recursive:true,force:true,maxRetries:5});}
