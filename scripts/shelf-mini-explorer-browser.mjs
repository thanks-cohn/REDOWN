// Controlled ordinary-browser fixture, NOT installed-extension/live-site evidence.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const playwrightPath=process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(pathToFileURL(playwrightPath));
const p0=process.env.SHELF_P0==='1';
const quick=process.env.PARITY_QUICK==='1',widths=quick?[360,900]:[320,360,390,540,700,900];
const root=resolve('extension'),out=resolve(process.env.SHELF_EVIDENCE_DIR||'work/shelf-layout-evidence');await mkdir(out,{recursive:true});
const html=(await readFile(root+'/shelf.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://fixture').pathname;
  if(path==='/reference.js'||path==='/reference.css'){res.setHeader('content-type',path.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8');res.end(await readFile(resolve('chute-reference/extension/explorer-view.'+(path.endsWith('.js')?'js':'css'))));return;}
  if(path==='/reference.html'){res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><link rel="stylesheet" href="/reference.css"><style>*{box-sizing:border-box}body{margin:0;background:#11170f;color:#e5eadf;font:12px/1.5 system-ui}#chutey-explorer-view{--chutey-explorer-text:#e5eadf;--chutey-explorer-panel:#20271c;--chutey-explorer-border:#46513d;--chutey-explorer-accent:#bfd492;--chutey-explorer-muted:#b0bba6;--chutey-explorer-background:#11170f}</style><section id="chutey-explorer-view"></section>');return;}
  if(path==='/shelf.html'){res.setHeader('content-type','text/html; charset=utf-8');res.end(html);return;}
  const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'/'))throw Error('path');
  res.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const results={quick,classification:'controlled HTTP fixture; chrome messaging/provider mocked; no installed extension, native or live-site proof',browser:browser.version(),os:process.platform,scenarios:[]};
try{
 for(const lowMemory of [false,true]){
  const context=await browser.newContext({viewport:{width:360,height:1000},...(p0?{recordVideo:{dir:out+'/video',size:{width:900,height:700}}}:{})}),page=await context.newPage();const errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/shelf.html#explorer');
  await page.evaluate(({lowMemory,base})=>{
   Object.defineProperty(navigator,'deviceMemory',{value:lowMemory?4:8});
   const local={},listeners=[],changed=[];
   const emitter={addListener(fn){listeners.push(fn);}};
   window.fixture={reports:[],receipts:[],reads:0,calls:[],events:[],local,expected:Array.from(Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMioAAAAASUVORK5CYII='),c=>c.charCodeAt(0))),count:10000,base};
   window.chrome={runtime:{id:'fixture',getURL:p=>base+'/'+p,onMessage:emitter,sendMessage:async m=>{
    fixture.calls.push(m.type);if(m.type==='redownChuteV1.report')fixture.reports.push({state:m.state,code:m.code,layer:m.layer});
    if(m.type==='redownChuteV1.arm')await new Promise(r=>setTimeout(r,150));
    if(m.type==='cfAccounts')return {ok:true,accounts:[{id:'a',name:'Account A'},{id:'b',name:'Account B'},...Array.from({length:fixture.extraAccounts?80:0},(_,i)=>({id:'extra-'+i,name:'Fixture account '+i}))]};
    if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'photos'}]};
    return new Promise((resolve,reject)=>{
     const sender={id:'fixture',url:/\.(arm|report|stats|clear)$/.test(m.type)?base+'/shelf.html':base+'/target.html',tab:{id:2},frameId:0};
     for(const fn of listeners){if(fn(m,sender,resolve)===true)return;}
     reject(Error('Unknown fixture message '+m.type));
    });
   }},storage:{local:{get:async keys=>local,set:async value=>{Object.assign(local,value);for(const fn of changed)fn(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,{newValue:v}])),'local');}},session:{get:async()=>({}),set:async value=>{if(value.redownChuteReceipt)fixture.receipts.push({state:value.redownChuteReceipt.state});for(const fn of changed)fn(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,{newValue:v}])),'session');}},onChanged:{addListener:fn=>changed.push(fn),removeListener(){}}},tabs:{query:async()=>[{id:2}],sendMessage:async(id,m)=>{for(const fn of listeners)fn(m,{id:'fixture'},()=>{});},create:async()=>{throw Error('Unexpected new window/tab');}},alarms:{create(){},onAlarm:{addListener(){}}}};
   window.RedownCloudflareApi={request:async path=>{
    if(fixture.authExpired)return Response.json({success:false},{status:401});
    if(fixture.offline)throw Error('Fixture offline');
    if(path.includes('?')){
     let objects=fixture.entries||Array.from({length:fixture.count},(_,i)=>({key:`file-${String(i).padStart(5,'0')}.png`,etag:'fixture-v1',size:fixture.expected.length,httpMetadata:{contentType:'image/png'}}));
     const next=fixture.pagination&&!new URL(path,'https://fixture.invalid').searchParams.has('cursor');
     if(fixture.pagination)objects=next?objects.slice(0,2):objects.slice(2);
     return Response.json({result:{objects,delimited:fixture.entries?[]:['Images/'],cursor:next?'fixture-page-2':''}});
    }
    if(fixture.largeSize)return new Response(new ReadableStream({start(controller){let offset=0;this.pull=()=>{};},pull(controller){const offset=this.offset||0;if(offset>=fixture.largeSize){controller.close();return;}const bytes=new Uint8Array(Math.min(65536,fixture.largeSize-offset));for(let i=0;i<bytes.length;i++)bytes[i]=(offset+i)%251;this.offset=offset+bytes.length;controller.enqueue(bytes);}}));
    fixture.reads++;if(fixture.slow)await new Promise(r=>setTimeout(r,700));const objectKey=decodeURIComponent(path.split('/objects/')[1]||'');return new Response(new Uint8Array(fixture.bytesByKey?.[objectKey]||fixture.expected));
   }};
  },{lowMemory,base});
  for(const name of ['shelf.js','chute-stage.js','chute-worker.js','chute-image-targets.js','chute-content.js'])await page.addScriptTag({url:base+'/'+name});
  await page.evaluate(async()=>{await import('./shelf-explorer.mjs');});
  await page.getByRole('treeitem',{name:'Cloudflare R2 · Account A',exact:false}).click();
  await page.getByRole('treeitem',{name:'photos',exact:false}).first().click();
  await page.waitForFunction(()=>document.querySelector('.mini-status').textContent.includes('10,001'));
  if(process.env.SHELF_LARGE==='1'){const {runLarge}=await import('./drag-size-browser-cases.mjs');results.scenarios.push(await runLarge({page,lowMemory}));await context.close();continue;}
  if(p0){const {runP0}=await import('./shelf-p0-browser-cases.mjs');results.scenarios.push(await runP0({page,context,out,lowMemory}));if(errors.length)throw Error(errors.join('; '));await context.close();continue;}
  const perf=await page.evaluate(()=>{
   const started=performance.now(),list=document.querySelector('.mini-list');
   for(let i=0;i<100;i++){list.scrollTop=i*1500;list.dispatchEvent(new Event('scroll'));}
   const ms=performance.now()-started;list.scrollTop=0;list.dispatchEvent(new Event('scroll'));
   return {scroll100ms:ms,rows:document.querySelectorAll('.mini-row').length,maxRows:Math.ceil(list.clientHeight/48)+12};
  });
  if(perf.rows>perf.maxRows)throw Error('Unbounded rows');
  // Cold first drag: no selection/preparation click; intentionally slow cloud read.
  await page.evaluate(()=>{fixture.slow=true;});
  await page.evaluate(()=>{
   const input=document.createElement('input');input.type='file';input.id='fixture-upload';input.accept='.png';document.body.append(input);Object.assign(input.style,{position:'fixed',top:'10px',right:'10px',width:'150px',zIndex:'9999'});
   input.addEventListener('change',async()=>{const file=input.files[0];fixture.received={name:file.name,type:file.type,bytes:Array.from(new Uint8Array(await file.arrayBuffer())),size:file.size};});
  });
  await page.evaluate(()=>{for(const type of ['dragstart','dragover','drop','dragend'])document.addEventListener(type,e=>{fixture.events.push({type,target:e.target.textContent,isTrusted:e.isTrusted,types:[...(e.dataTransfer?.types||[])]});},true);});
  await page.locator('.mini-row').nth(1).dragTo(page.locator('#fixture-upload'));
  await page.waitForFunction(()=>fixture.received,{},{timeout:5000}).catch(async error=>{console.log(await page.evaluate(()=>({calls:fixture.calls,status:document.querySelector('.mini-drag-status').textContent,notices:[...document.querySelectorAll('[role=status]')].map(n=>n.textContent),events:fixture.events})));throw error;});
  const receipt=await page.evaluate(()=>fixture.received);
  if(receipt.name!=='file-00000.png'||receipt.type!=='image/png'||receipt.bytes.join(',')!==await page.evaluate(()=>fixture.expected.join(',')))throw Error('File bytes/name mismatch');
  await page.evaluate(()=>{fixture.slow=false;document.getElementById('fixture-upload').remove();document.querySelectorAll('div[role=status]').forEach(n=>{if(n.style.position==='fixed')n.remove();});});
  const listingMeasurements=[];
  for(const count of [1,10,100,1000,10000]){
   await page.evaluate(count=>fixture.count=count,count);const started=Date.now();await page.getByRole('button',{name:'Refresh',exact:true}).click();
   await page.waitForFunction(count=>document.querySelector('.mini-status').textContent.startsWith((count+1).toLocaleString()+' loaded'),count);
   listingMeasurements.push({files:count,navigationMs:Date.now()-started,rows:await page.locator('.mini-row').count()});
  }
  if(!lowMemory){
  const checks={classification:results.classification,details:[]};
  await page.locator('.mini-row').nth(1).dblclick();await page.waitForSelector('.mini-preview-body img');
  for(const height of [480,700,1000]){
    await page.setViewportSize({width:360,height});
    const detail=await page.evaluate(()=>{
      const host=document.querySelector('#explorer-view'),dock=document.querySelector('.mini-preview'),workspace=document.querySelector('.mini-workspace'),nav=document.querySelector('nav[aria-label=Shelf]');
      return {height:innerHeight,host:host.clientHeight,dock:dock.clientHeight,workspace:workspace.clientHeight,navTop:nav.getBoundingClientRect().top,overflowX:document.documentElement.scrollWidth>innerWidth,overflowY:document.documentElement.scrollHeight>innerHeight};
    });
    if(detail.overflowX||detail.overflowY||detail.workspace<80||detail.navTop>10||detail.dock/detail.host<.25||detail.dock/detail.host>.4)throw Error('Short Shelf '+JSON.stringify(detail));checks.details.push(detail);
  }
  await page.setViewportSize({width:360,height:700});
  const imageWidth=async()=>{const value=await page.waitForFunction(()=>document.querySelector('.mini-row img')?.getBoundingClientRect().width||false);return value.jsonValue();};
  const before=await imageWidth();
  const grip=page.getByRole('separator',{name:'Resize folders and files columns'});await grip.focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(80);
  const after=await imageWidth();
  if(after<=before)throw Error('Images did not enlarge with leftward divider');checks.imageEnlargement={before,after};
  await page.locator('.mini-list').evaluate(n=>n.scrollTop=n.scrollHeight*.5);await page.waitForTimeout(80);
  const selection=await page.evaluate(async()=>{
    const list=document.querySelector('.mini-list'),top=list.getBoundingClientRect().top;
    const row=[...document.querySelectorAll('.mini-row')].find(n=>n.getBoundingClientRect().top>=top&&n.getBoundingClientRect().top<top+list.clientHeight);
    const before=list.scrollTop;row.click();await new Promise(r=>setTimeout(r,100));return {before,after:list.scrollTop};
  });if(Math.abs(selection.after-selection.before)>1)throw Error('Selection moved scroll '+JSON.stringify(selection));checks.selection=selection;
  const originalBytes=await page.evaluate(()=>Array.from(fixture.expected));
  await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=40;canvas.height=80;const c=canvas.getContext('2d');c.fillStyle='#4d9cb4';c.fillRect(0,0,40,80);fixture.expected=Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0));});
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.mini-row img')?.naturalHeight===80);
  await page.waitForTimeout(100);
  const aspect=await page.locator('.mini-row img').first().evaluate(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,naturalWidth:n.naturalWidth,naturalHeight:n.naturalHeight}));
  if(Math.abs(aspect.height/aspect.width-2)>.03)throw Error('Portrait aspect distorted '+JSON.stringify(aspect));checks.portrait=aspect;
  await page.evaluate(bytes=>fixture.expected=Uint8Array.from(bytes),originalBytes);await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.mini-row img')?.naturalWidth===1);
  for(const width of [320,360,390,540,700,900])for(const theme of ['porcelain','midnight','ocean','neon']){
    await page.setViewportSize({width,height:700});await page.locator('#nav-clouds').click();await page.evaluate(theme=>document.documentElement.dataset.shelfTheme=theme,theme);
    const shell=await page.evaluate(()=>({width:innerWidth,theme:document.documentElement.dataset.shelfTheme,overflow:document.documentElement.scrollWidth>innerWidth,nav:[...document.querySelectorAll('nav[aria-label=Shelf] a')].map(n=>({top:n.offsetTop,bottom:n.getBoundingClientRect().bottom})),tagline:document.querySelector('.shelf-assurance').textContent,subtitle:[...document.querySelectorAll('p')].some(n=>n.textContent.includes('Your Passions. Right Here.'))}));
    if(shell.overflow||shell.subtitle||new Set(shell.nav.map(n=>n.top)).size!==1)throw Error('REMOTES overflow '+JSON.stringify(shell));checks.details.push(shell);
    if(width===320)await page.screenshot({path:out+'/remotes-320-'+theme+'.png',fullPage:true});
  }
  await writeFile(out+'/postflight.json',JSON.stringify(checks,null,2));
  await page.locator('#nav-explorer').click();await page.setViewportSize({width:360,height:1000});if(await page.getByRole('button',{name:'Close preview',exact:true}).isVisible())await page.getByRole('button',{name:'Close preview',exact:true}).click();
  }
  // Real keyboard and wheel events use the component's sole file scrollport.
  await page.locator('.mini-list').focus();await page.keyboard.press('End');
  await page.waitForFunction(()=>document.querySelector('.mini-rows').lastElementChild?.getAttribute('aria-posinset')==='10001');
  await page.keyboard.press('Home');await page.keyboard.press('PageDown');
  const keyboardScroll=await page.locator('.mini-list').evaluate(n=>n.scrollTop);if(keyboardScroll<=0)throw Error('PageDown did not advance');
  await page.locator('.mini-list').hover();await page.mouse.wheel(0,500);await page.waitForTimeout(100);
  if(await page.locator('.mini-list').evaluate(n=>n.scrollTop)<=keyboardScroll)throw Error('Wheel did not advance');
  await page.locator('.mini-list').evaluate(n=>n.scrollTop=0);await page.waitForTimeout(40);
  const layouts=[];
  const scrollReceipts=[];
  const reference=await context.newPage();await reference.goto(base+'/reference.html');await page.bringToFront();
  await reference.evaluate(()=>{
    window.chrome={storage:{local:{get:async defaults=>defaults,set:async()=>{},remove:async()=>{}}},runtime:{sendNativeMessage(){}}};
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMioAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    window.ChuteyExplorerAPI={nativeSession:async()=>({read_only:true}),connect(){},content:async()=>new Blob([bytes],{type:'image/png'}),command:async(name)=>{
      if(name==='roots')return {roots:[{handle:'root',name:'Local photos'}]};
      if(name==='resume_location')return {handle:'root',view:{}};
      if(name==='list')return {name:'photos',parent:null,next_offset:null,entries:[{handle:'folder',name:'Images',kind:'directory',size:0},...Array.from({length:30},(_,i)=>({handle:'file-'+i,name:`file-${String(i).padStart(5,'0')}.png`,kind:'file',size:68,mime:'image/png'}))]};
      if(name==='preview')return {preview:'image',size:68};return {};
    }};
  });await reference.addScriptTag({url:base+'/reference.js'});await reference.waitForSelector('.ex-row');
  for(const width of widths){
   console.log('Layout fixture',lowMemory?'8 MiB':'32 MiB',width);
   await page.setViewportSize({width,height:1000});
   await page.locator('#nav-history').click();await page.locator('#nav-explorer').click();
   const grip=page.getByRole('separator',{name:'Resize folders and files columns'});
   await grip.focus();await page.keyboard.press('ArrowRight');
   if(await grip.getAttribute('aria-valuenow')!=='55')throw Error('Keyboard splitter');
   await page.keyboard.press('ArrowLeft');
   // Capture the real Shelf and an equivalently sized original Chutey component.
   for(const mode of ['list','grid']){
    if((await page.locator('[data-action=grid]').getAttribute('aria-pressed')==='true')!==(mode==='grid'))await page.locator('[data-action=grid]').click();
    await page.locator('.mini-list').evaluate(n=>{n.scrollTop=0;});
    await page.locator('.mini-row').nth(1).dblclick();await page.waitForSelector('.mini-preview-body img');
    const layout=await page.evaluate(()=>{
      const host=document.getElementById('explorer-view'),list=host.querySelector('.mini-list'),rail=host.querySelector('.mini-rail'),p=host.querySelector('.mini-preview'),selected=host.querySelector('.mini-row[aria-selected=true]');
      const next=p.nextElementSibling,previous=p.previousElementSibling;
      return {hostWidth:host.clientWidth,hostHeight:host.clientHeight,left:rail.clientWidth,right:list.clientWidth,gutter:host.querySelector('.mini-column-resize').offsetWidth,overflow:document.documentElement.scrollWidth>innerWidth,dock:!list.contains(p)&&p.parentElement===host,above:host.querySelector('.mini-workspace').getBoundingClientRect().bottom<=p.getBoundingClientRect().top+1,navTop:document.querySelector('nav[aria-label=Shelf]').getBoundingClientRect().top,grid:host.querySelector('.mini-rows').classList.contains('mini-grid'),rows:host.querySelectorAll('.mini-row').length};
    });
    if(layout.overflow||!layout.dock||!layout.above||layout.navTop>10||layout.gutter!==8||layout.left<=0||layout.right<=0)throw Error('Layout at '+width+' '+mode+': '+JSON.stringify(layout));
    layouts.push({width,mode,...layout});
    for(const theme of ['porcelain','midnight','ocean','neon']){
      await page.evaluate(theme=>document.documentElement.dataset.shelfTheme=theme,theme);
      for(const dock of [true,false]){
        if(!dock)await page.getByRole('button',{name:'Close preview',exact:true}).click();
        const receipt=await page.evaluate(async()=>{
          const list=document.querySelector('.mini-list'),rows=document.querySelector('.mini-rows');
          const samples=[];let mutations=0;const observer=new MutationObserver(()=>mutations++);observer.observe(rows,{childList:true});
          const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          for(const fraction of [0,.25,.49,.5,.51,.75,1,.5,0]){
            const total=list.scrollHeight;const expected=(total-list.clientHeight)*fraction;list.scrollTop=expected;await frame();
            samples.push({fraction,total,after:list.scrollHeight,expected,actual:list.scrollTop,last:rows.lastElementChild?.getAttribute('aria-posinset')});
          }
          list.scrollTop=list.scrollHeight;await frame();const final=rows.lastElementChild?.getAttribute('aria-posinset');
          observer.disconnect();return {samples,mutations,final,overflow:document.documentElement.scrollWidth>innerWidth};
        });
        if(receipt.overflow||receipt.final!=='10001'||receipt.samples.some(x=>x.total!==x.after||Math.abs(x.expected-x.actual)>1))throw Error('Unstable scroll '+JSON.stringify({width,mode,theme,dock,...receipt}));
        scrollReceipts.push({width,mode,theme,dock,...receipt});
        await page.locator('.mini-list').evaluate(n=>n.scrollTop=0);
        await page.waitForTimeout(40);
        if(!dock){await page.locator('.mini-row').nth(1).dblclick();await page.waitForSelector('.mini-preview-body img');}
      }
      if(!lowMemory)await page.screenshot({path:out+`/layout-${width}-${mode}-${theme}.png`});
    }

    const resize=page.getByRole('separator',{name:'Resize preview',exact:true});await resize.focus();const old=await page.locator('.mini-preview').evaluate(n=>n.offsetHeight);await page.keyboard.press('ArrowUp');if(await page.locator('.mini-preview').evaluate(n=>n.offsetHeight)<=old)throw Error('Preview keyboard resize');
    if(width===900&&mode==='grid'){
     const b=await resize.boundingBox(),before=await page.locator('.mini-preview').evaluate(n=>n.offsetHeight);
     await page.mouse.move(b.x+b.width/2,b.y+3);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y-17,{steps:4});await page.mouse.up();
     if(await page.locator('.mini-preview').evaluate(n=>n.offsetHeight)<=before)throw Error('Pointer preview resize');
    }
    await page.locator('.mini-preview').evaluate(n=>{n.style.height='280px';});
    if(!lowMemory&&!quick){
     await reference.setViewportSize({width:layout.hostWidth,height:layout.hostHeight});
     await reference.locator('#chutey-explorer-view').evaluate((n,height)=>{n.style.height=height+'px';},layout.hostHeight);
     if((await reference.locator('.ex-list').evaluate(n=>n.classList.contains('ex-grid')))!==(mode==='grid'))await reference.locator('[data-action=grid]').click();
     await reference.locator('.ex-list').evaluate(n=>{n.scrollTop=0;});await reference.locator('.ex-row').nth(1).dblclick();await reference.waitForSelector('.ex-preview-body img');
     // Align the comparable read view; native folder-consent controls have no cloud equivalent.
     await reference.locator('.ex-native').evaluate(n=>{n.hidden=true;});
     const redown=await page.locator('#explorer-view').screenshot(),chutey=await reference.locator('#chutey-explorer-view').screenshot();
     const pair=await context.newPage();await pair.setViewportSize({width:layout.hostWidth*2+24,height:layout.hostHeight+50});
     await pair.setContent(`<style>body{margin:0;background:#ddd;font:13px system-ui}.pair{display:flex;gap:24px}figure{margin:0}figcaption{height:30px}img{display:block}</style><div class="pair"><figure><figcaption>Chutey original · ${width}px Shelf · ${mode}</figcaption><img src="data:image/png;base64,${chutey.toString('base64')}"></figure><figure><figcaption>REDOWN · ${width}px Shelf · ${mode}</figcaption><img src="data:image/png;base64,${redown.toString('base64')}"></figure></div>`);
     await pair.screenshot({path:out+`/parity-${width}-${mode}.png`,fullPage:true});await pair.close();await page.bringToFront();
    }
   }
   if(!lowMemory&&!quick)await page.screenshot({path:out+`/shelf-${width}.png`,fullPage:true});
   await page.getByRole('button',{name:'Close preview',exact:true}).click();
  }
  await reference.close();
  // Pointer splitter, persistence and independent right scrolling.
  await page.setViewportSize({width:700,height:1000});
  const split=page.getByRole('separator',{name:'Resize folders and files columns'}),box=await split.boundingBox();
  await page.mouse.move(box.x+4,box.y+50);await page.mouse.down();await page.mouse.move(box.x+44,box.y+50,{steps:5});await page.mouse.up();
  const pointerRatio=Number(await split.getAttribute('aria-valuenow'));if(pointerRatio<=50)throw Error('Pointer splitter');
  await page.waitForFunction(()=>fixture.local.shelfExplorerV1?.folderWidth>50);
  const independent=await page.evaluate(()=>{const left=document.querySelector('.mini-rail'),right=document.querySelector('.mini-list'),before=left.scrollTop;right.scrollTop=900;right.dispatchEvent(new Event('scroll'));return left.scrollTop===before&&right.scrollTop>0;});if(!independent)throw Error('Independent scrolling');
  if(!lowMemory&&!quick){for(const theme of ['porcelain','midnight','ocean','neon']){await page.evaluate(theme=>document.documentElement.dataset.shelfTheme=theme,theme);await page.locator('.mini-list').evaluate(n=>{n.scrollTop=0;});await page.locator('.mini-row').nth(1).click();await page.screenshot({path:out+`/theme-${theme}.png`,fullPage:true});}}
  await page.locator('.mini-list').evaluate(n=>{n.scrollTop=600;});await page.locator('#nav-history').click();await page.locator('#nav-explorer').click();await page.locator('#explorer-view').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('.mini-list').scrollTop===600,{},{timeout:1500}).catch(async()=>{throw Error('Scroll lost switching routes: '+await page.locator('.mini-list').evaluate(n=>n.scrollTop));});
  console.log('Route scroll retained');
  await page.locator('.mini-list').evaluate(n=>{n.scrollTop=0;});
  // Exercise real component paging, auth/offline errors, and both scrollports.
  await page.evaluate(()=>{fixture.count=3;fixture.pagination=true;});await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'Load more files',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.mini-status').textContent.startsWith('4 loaded'));console.log('Pagination passed');
  await page.evaluate(()=>{fixture.pagination=false;fixture.authExpired=true;});await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.mini-status').textContent.includes('HTTP 401'));
  await page.evaluate(()=>{fixture.authExpired=false;fixture.offline=true;});await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.mini-status').textContent.includes('Fixture offline'));
  await page.evaluate(()=>{fixture.offline=false;fixture.count=10000;fixture.extraAccounts=true;});await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.mini-status').textContent.startsWith('10,001 loaded'));
  console.log('Auth/offline recovery passed');
  const leftIndependent=await page.evaluate(()=>{const left=document.querySelector('.mini-rail'),right=document.querySelector('.mini-list');const before=right.scrollTop;left.scrollTop=300;return left.scrollTop>0&&right.scrollTop===before;});if(!leftIndependent)throw Error('Independent left scrolling');
  // Window Preview remains a distinct dedicated action.
  await page.locator('.mini-row').nth(1).dblclick();await page.getByRole('button',{name:'Open in Window',exact:true}).click();await page.waitForSelector('.mini-window-preview[open]');await page.getByRole('button',{name:'Close Window Preview',exact:true}).click();
  if(errors.length)throw Error('Browser errors: '+errors.join('; '));
  results.scenarios.push({lowMemoryClassSimulation:lowMemory,listing:10000,...perf,listingMeasurements,receipt,layouts,scrollReceipts,pointerRatio,independentScroll:independent,leftIndependentScroll:leftIndependent,pagination:true,authExpired:true,offlineRecovery:true,pointerPreviewResize:true,registrationDelayMs:150,viewportWidths:widths,status:'PASS'});
  await context.close();
 }
 await writeFile(out+'/browser.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
}catch(error){for(const ctx of browser.contexts())for(const p of ctx.pages())console.log('Failure snapshot',await p.evaluate(()=>({status:document.querySelector('.mini-status')?.textContent,more:document.querySelector('[data-action=more]')?.outerHTML,calls:window.fixture?.calls.slice(-12),scroll:document.querySelector('.mini-list')?.scrollTop})).catch(()=>({})));throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
