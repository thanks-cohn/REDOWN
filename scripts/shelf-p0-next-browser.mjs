// Actual Shelf modules in Chromium; Chrome/provider boundary is controlled, never live proof.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const root=resolve('extension'),out=resolve(process.env.SHELF_EVIDENCE_DIR||'work/p0/browser');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://fixture').pathname;const file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))throw Error();let body=await readFile(file);if(path==='/shelf.html')body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const report={classification:'Chromium actual UI / mocked Chrome and cloud account transport; no installed extension or live provider proof',browser:browser.version(),errors:[],geometry:[],gestures:{},elevator:[]};
const page=await browser.newPage({viewport:{width:540,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto(base+'/shelf.html');
 await page.evaluate(base=>{
  const listeners=[],local={shelfFilesEntranceV1:'slide-up',transferHistory:[{id:'fixture',filename:'A very long actual filename with spaces and details.png',at:new Date().toISOString(),ok:true,status:'completed',verified:true,providerKind:'cloudflare',sourceUrl:'https://source.invalid/image.png',destination:{accountId:'account',bucketName:'photos',key:'image.png'}},{id:'failed',filename:'failed.pdf',at:new Date().toISOString(),ok:false,error:'Provider unavailable',sourceUrl:'https://source.invalid/failed.pdf'}]};
  window.fixture={local,connected:false,calls:[],emit(key,value){local[key]=value;for(const fn of listeners)fn({[key]:{newValue:value}},'local');}};
  window.chrome={runtime:{id:'fixture',getURL:p=>base+'/'+p,onMessage:{addListener(){}},sendMessage:async m=>{fixture.calls.push(m.type);if(m.type==='cfAccounts')return {ok:true,accounts:fixture.connected?[{id:'account',name:'Verified fixture account'}]:[]};if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'photos'}]};return {ok:true,count:0,bytes:0};}},storage:{local:{get:async()=>({...local}),set:async value=>{for(const [k,v]of Object.entries(value))fixture.emit(k,v);},remove:async()=>{}},session:{get:async()=>({})},onChanged:{addListener:fn=>listeners.push(fn),removeListener:fn=>{const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);}}},tabs:{create:async()=>{}},windows:{getCurrent:async()=>({id:1})}};
  window.RedownCloudflareApi={request:async()=>Response.json({result:{objects:[{key:'cloud.png',size:1}],delimited:[]}})};
 },base);
 for(const name of ['chute-stage.js','shelf-theme.js','explorer-theme.js','history-navigation.js','shelf-history.js','shelf.js','settings-choices.js','shelf-click-feedback.js','right-click-current.js','right-click-backup.js','right-click-backup-settings.js'])await page.addScriptTag({url:base+'/'+name});
 await page.evaluate(()=>import('./shelf-explorer.mjs'));
 await page.locator('#nav-explorer').click();await page.waitForSelector('.mini-row img');await page.waitForTimeout(300);
 assert.deepEqual(await page.locator('.mini-row').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),['REDOWN.svg','Chutey.png']);
 const calls=await page.evaluate(()=>fixture.calls);assert.ok(!calls.some(c=>/upload|prepare|deploy/i.test(c)));report.gestures.offlineBundledSamples=true;
 await page.locator('.mini-row').first().click();assert.equal(await page.locator('.mini-preview').isVisible(),false);
 await page.locator('.mini-row').first().dblclick();await page.waitForSelector('.mini-preview img');
 await page.locator('[data-action=expand-preview]').click();await page.waitForTimeout(200);await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.mini-preview strong').textContent==='Chutey.png');
 assert.equal(await page.locator('#explorer-view').evaluate(n=>n.classList.contains('preview-expanded')),true);
 await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.mini-preview strong').textContent(),'Chutey.png');
 await page.evaluate(()=>fixture.emit('previewNavigationAxisV1','vertical'));await page.keyboard.press('ArrowUp');await page.waitForFunction(()=>document.querySelector('.mini-preview strong').textContent==='REDOWN.svg');
 await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.mini-preview strong').textContent(),'REDOWN.svg');
 await page.keyboard.press('ArrowDown');await page.waitForFunction(()=>document.querySelector('.mini-preview strong').textContent==='Chutey.png');report.gestures.expandedBothAxes=true;
 await page.screenshot({path:out+'/expanded-preview.png'});
 await page.locator('[data-action=expand-preview]').click();assert.equal(await page.locator('.mini-row[aria-selected=true]').getAttribute('aria-label'),'Chutey.png');report.gestures.restoreSelection=true;
 await page.locator('[data-action=close-preview]').click();
 for(let i=0;i<3;i++){
  const nav=page.locator('nav[aria-label=Shelf]');const start=await nav.boundingBox();
  await page.locator('#nav-settings').click();await page.waitForTimeout(75);const middle=await nav.boundingBox(),panel=await page.locator('#explorer-view').boundingBox();
  await page.waitForTimeout(240);const end=await nav.boundingBox();assert.ok(middle.y>start.y&&middle.y<end.y);assert.ok(panel.y>start.y);report.elevator.push({start,middle,end,panel});
  await page.locator('#nav-explorer').click();await page.waitForTimeout(300);
 }
 report.gestures.reverseIntermediate=true;
 // Verify connected/disconnected projection through the same real account discovery.
 await page.evaluate(()=>{fixture.connected=true;fixture.emit('cloudflareAuth',{accessToken:'fixture-placeholder'});});await page.waitForSelector('.mini-node:text("Cloudflare R2")');assert.equal(await page.locator('.mini-row').count(),0);assert.equal(await page.locator('.mini-demo-connect').count(),0);report.gestures.connectedHidesDemo=true;
 await page.locator('.mini-node').first().click();await page.locator('.mini-node').filter({hasText:'photos'}).click();await page.waitForSelector('.mini-row');
 await page.screenshot({path:out+'/connected-files.png'});
 await page.evaluate(()=>{fixture.connected=false;fixture.emit('cloudflareAuth',null);});await page.waitForFunction(()=>document.querySelector('.mini-row')?.getAttribute('aria-label')==='REDOWN.svg');report.gestures.logoutRestoresDemo=true;
 for(const width of [320,390,540,700,900])for(const theme of ['porcelain','midnight','ocean','neon']){
  await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.shelfTheme=theme,theme);
  for(const view of ['explorer','history','settings']){
   await page.evaluate(view=>{location.hash='#'+view;},view);await page.waitForTimeout(100);
   if(view==='history')await page.waitForSelector('.history-transfer');
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,width:innerWidth}));assert.equal(geometry.overflow,false,`${view} ${width} ${theme}`);
   if(view==='settings')assert.equal(await page.locator('.explorer-theme-row:not([hidden]),.icon-background-row').evaluateAll(nodes=>nodes.some(n=>{const a=n.querySelector('span')?.getBoundingClientRect(),b=n.querySelector('.settings-choice-surface')?.getBoundingClientRect();return a&&b&&Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);})),false,'Settings labels and choices must not overlap');
   report.geometry.push({view,width,theme,...geometry});await page.screenshot({path:out+`/${view}-${width}-${theme}.png`,fullPage:true});
  }
 }
 for(const width of [320,390,540,900])for(const theme of ['porcelain','midnight','ocean','neon']){
  await page.setViewportSize({width,height:900});await page.evaluate(theme=>{document.documentElement.dataset.shelfTheme=theme;location.hash='#explorer';},theme);await page.waitForSelector('.mini-row');
  await page.locator('.mini-row').first().dblclick();await page.waitForSelector('.mini-preview img');await page.locator('[data-action=expand-preview]').click();await page.waitForTimeout(200);
  await page.screenshot({path:out+`/expanded-${width}-${theme}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('[data-action=expand-preview]').click();await page.locator('[data-action=close-preview]').click();
  await page.evaluate(()=>{fixture.connected=true;fixture.emit('cloudflareAuth',{accessToken:'fixture-placeholder'});});await page.waitForSelector('.mini-node:text("Cloudflare R2")');
  await page.locator('.mini-node').first().click();await page.locator('.mini-node').filter({hasText:'photos'}).click();await page.waitForSelector('.mini-row');
  await page.screenshot({path:out+`/connected-${width}-${theme}.png`});assert.equal(await page.locator('.mini-demo-connect').count(),0);
  await page.evaluate(()=>{fixture.connected=false;fixture.emit('cloudflareAuth',null);});await page.waitForFunction(()=>document.querySelector('.mini-row')?.getAttribute('aria-label')==='REDOWN.svg');
 }
 await page.evaluate(()=>location.hash='#settings');await page.waitForTimeout(100);
 await page.locator('#files-entrance').evaluate(node=>{node.value='normal';node.dispatchEvent(new Event('change'));});
 await page.waitForTimeout(20);assert.equal(await page.evaluate(()=>fixture.local.shelfFilesEntranceV1),'normal');
 assert.equal(report.errors.length,0,report.errors.join('\n'));
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();server.close();}
console.log(JSON.stringify({screenshots:report.geometry.length+34,gestures:report.gestures,elevatorRounds:report.elevator.length,errors:report.errors}));
