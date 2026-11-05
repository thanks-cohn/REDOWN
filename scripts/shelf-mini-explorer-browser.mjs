// Controlled ordinary-browser fixture, NOT installed-extension/live-site evidence.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const playwrightPath=process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(pathToFileURL(playwrightPath));
const root=resolve('extension'),out=resolve('docs/shelf-chute-integration/evidence');await mkdir(out,{recursive:true});
const html=(await readFile(root+'/shelf.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://fixture').pathname;
  if(path==='/shelf.html'){res.setHeader('content-type','text/html');res.end(html);return;}
  const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'/'))throw Error('path');
  res.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results={classification:'controlled HTTP fixture; chrome messaging/provider mocked; no installed extension, native or live-site proof',browser:browser.version(),os:process.platform,scenarios:[]};
try{
 for(const lowMemory of [false,true]){
  const context=await browser.newContext({viewport:{width:360,height:1000}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/shelf.html#explorer');
  await page.evaluate(({lowMemory,base})=>{
   Object.defineProperty(navigator,'deviceMemory',{value:lowMemory?4:8});
   const local={},listeners=[],changed=[];
   const emitter={addListener(fn){listeners.push(fn);}};
   window.fixture={calls:[],events:[],local,expected:Array.from(Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMioAAAAASUVORK5CYII='),c=>c.charCodeAt(0))),count:10000,base};
   window.chrome={runtime:{id:'fixture',getURL:p=>base+'/'+p,onMessage:emitter,sendMessage:async m=>{
    fixture.calls.push(m.type);
    if(m.type==='cfAccounts')return {ok:true,accounts:[{id:'a',name:'Account A'},{id:'b',name:'Account B'}]};
    if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'photos'}]};
    return new Promise((resolve,reject)=>{
     const sender={id:'fixture',url:m.type.endsWith('.arm')?base+'/shelf.html':base+'/target.html',tab:{id:2},frameId:0};
     for(const fn of listeners){if(fn(m,sender,resolve)===true)return;}
     reject(Error('Unknown fixture message '+m.type));
    });
   }},storage:{local:{get:async keys=>local,set:async value=>Object.assign(local,value)},session:{get:async()=>({}),set:async value=>{for(const fn of changed)fn(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,{newValue:v}])),'session');}},onChanged:{addListener:fn=>changed.push(fn),removeListener(){}}},tabs:{query:async()=>[{id:2}],sendMessage:async(id,m)=>{for(const fn of listeners)fn(m,{id:'fixture'},()=>{});},create:async()=>{throw Error('Unexpected new window/tab');}},alarms:{create(){},onAlarm:{addListener(){}}}};
   window.RedownCloudflareApi={request:async path=>{
    if(path.includes('?'))return Response.json({result:{objects:Array.from({length:fixture.count},(_,i)=>({key:`file-${String(i).padStart(5,'0')}.png`,size:fixture.expected.length,httpMetadata:{contentType:'image/png'}})),delimited:['Images/']}});
    return new Response(new Uint8Array(fixture.expected));
   }};
  },{lowMemory,base});
  for(const name of ['shelf.js','chute-stage.js','chute-worker.js','chute-image-targets.js','chute-content.js'])await page.addScriptTag({url:base+'/'+name});
  await page.evaluate(async()=>{await import('./shelf-explorer.mjs');});
  await page.getByRole('button',{name:'☰ Clouds'}).click();
  await page.getByRole('treeitem',{name:'Cloudflare R2 · Account A',exact:false}).click();
  await page.getByRole('treeitem',{name:'photos',exact:false}).first().click();
  await page.waitForFunction(()=>document.querySelector('.mini-status').textContent.includes('10,001'));
  const perf=await page.evaluate(()=>{
   const started=performance.now(),list=document.querySelector('.mini-list');
   for(let i=0;i<100;i++){list.scrollTop=i*1500;list.dispatchEvent(new Event('scroll'));}
   const ms=performance.now()-started;list.scrollTop=0;list.dispatchEvent(new Event('scroll'));
   return {scroll100ms:ms,rows:document.querySelectorAll('.mini-row').length};
  });
  if(perf.rows>24)throw Error('Unbounded rows');
  await page.locator('.mini-row').nth(1).click();await page.getByRole('button',{name:'Prepare to drag',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.mini-drag-status').textContent.startsWith('Ready.'));
  await page.evaluate(()=>{
   const input=document.createElement('input');input.type='file';input.id='fixture-upload';input.accept='.png';document.body.append(input);Object.assign(input.style,{position:'fixed',top:'10px',right:'10px',width:'150px',zIndex:'9999'});
   input.addEventListener('change',async()=>{const file=input.files[0];fixture.received={name:file.name,type:file.type,bytes:Array.from(new Uint8Array(await file.arrayBuffer())),size:file.size};});
  });
  await page.evaluate(()=>{for(const type of ['dragstart','dragover','drop','dragend'])document.addEventListener(type,e=>{fixture.events.push({type,target:e.target.textContent,isTrusted:e.isTrusted,types:[...(e.dataTransfer?.types||[])]});},true);});
  await page.locator('.mini-row').nth(1).dragTo(page.locator('#fixture-upload'));
  await page.waitForFunction(()=>fixture.received,{},{timeout:5000}).catch(async error=>{console.log(await page.evaluate(()=>({calls:fixture.calls,status:document.querySelector('.mini-drag-status').textContent,notices:[...document.querySelectorAll('[role=status]')].map(n=>n.textContent),events:fixture.events})));throw error;});
  const receipt=await page.evaluate(()=>fixture.received);
  if(receipt.name!=='file-00000.png'||receipt.type!=='image/png'||receipt.bytes.join(',')!==await page.evaluate(()=>fixture.expected.join(',')))throw Error('File bytes/name mismatch');
  await page.evaluate(()=>{document.getElementById('fixture-upload').remove();document.querySelectorAll('div[role=status]').forEach(n=>{if(n.style.position==='fixed')n.remove();});});
  const listingMeasurements=[];
  for(const count of [1,10,100,1000,10000]){
   await page.evaluate(count=>fixture.count=count,count);const started=Date.now();await page.getByRole('button',{name:'Refresh',exact:true}).click();
   await page.waitForFunction(count=>document.querySelector('.mini-status').textContent.startsWith((count+1).toLocaleString()+' loaded'),count);
   listingMeasurements.push({files:count,navigationMs:Date.now()-started,rows:await page.locator('.mini-row').count()});
  }
  for(const width of [320,360,540,900]){
   await page.setViewportSize({width,height:1000});
   await page.locator('#nav-history').click();await page.locator('#nav-explorer').click();
   if(width===320){if(await page.getByRole('button',{name:'☰ Clouds'}).getAttribute('aria-expanded')==='false')await page.getByRole('button',{name:'☰ Clouds'}).click();await page.screenshot({path:out+`/shelf-narrow-${lowMemory?'low-memory':'normal'}.png`,fullPage:true});}
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Horizontal overflow at '+width);
  }
  await page.screenshot({path:out+`/shelf-expanded-${lowMemory?'low-memory':'normal'}.png`,fullPage:true});
  if(errors.length)throw Error('Browser errors: '+errors.join('; '));
  results.scenarios.push({lowMemoryClassSimulation:lowMemory,listing:10000,...perf,listingMeasurements,receipt,viewportWidths:[320,360,540,900],status:'PASS'});
  await context.close();
 }
 await writeFile(out+'/browser.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
