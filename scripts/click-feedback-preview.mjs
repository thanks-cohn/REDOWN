// Ordinary Chromium with mocked extension APIs; never an installed/cloud test.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/package.json':import.meta.url);
const {chromium}=require('playwright');
const output='work/click-feedback-browser';await mkdir(output,{recursive:true});
const html=await readFile('extension/shelf.html','utf8'),css=await readFile('extension/shelf.css','utf8');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:420,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,''));
 await page.addStyleTag({content:css});await page.addStyleTag({path:'extension/save-impact.css'});
 await page.evaluate(()=>{
  window.messages=[];window.changes=[];window.preferences={};window.sequence=0;
  window.chrome={runtime:{id:'fixture',onMessage:{addListener:fn=>messages.push(fn)}},windows:{getCurrent:async()=>({id:7})},tabs:{query:async()=>[{id:1}]},
   storage:{local:{get:async()=>preferences,set:async p=>Object.assign(preferences,p)},onChanged:{addListener:fn=>changes.push(fn)}}};
  window.emit=event=>messages.forEach(fn=>fn({type:'redownClickArrival',id:String(++sequence),at:Date.now(),windowId:7,tabId:1,destination:'provider-card',...event},{id:'fixture'}));
 });
 await page.addScriptTag({path:'extension/shelf-click-feedback.js'});
 await page.addScriptTag({path:'extension/shelf-save-feedback.js'});
 for(const theme of ['porcelain','midnight','neon','ocean'])for(const provider of ['cloudflare','google','dropbox','onedrive']){
  await page.evaluate(({theme,provider})=>{document.documentElement.dataset.shelfTheme=theme;document.querySelector(`[data-provider="${provider}"]`).scrollIntoView({block:'center'});},{theme,provider});
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  await page.evaluate(provider=>emit({provider}),provider);
  await page.waitForFunction(()=>document.querySelector('.redown-click-light'));
  const result=await page.evaluate(provider=>{
   const node=document.querySelector('.redown-click-light'),rect=document.querySelector(`[data-provider="${provider}"]`).getBoundingClientRect();
   return {target:node.dataset.target,x:parseFloat(node.style.left),y:parseFloat(node.style.top),expectedX:rect.left+rect.width/2,expectedY:rect.top+rect.height/2,success:document.querySelectorAll('.provider-save-success').length};
  },provider);
  assert.equal(result.target,provider);assert.ok(Math.abs(result.x-result.expectedX)<.01);assert.ok(Math.abs(result.y-result.expectedY)<.01);assert.equal(result.success,0);
  results.push({theme,provider,...result});
  if(provider==='google')await page.screenshot({path:output+'/'+theme+'.png'});
  await page.waitForFunction(()=>!document.querySelector('.redown-click-light'));
 }
 await page.evaluate(()=>{document.getElementById('clouds-view').hidden=true;document.getElementById('settings-view').hidden=false;emit({provider:'dropbox'});});
 await page.waitForFunction(()=>document.querySelector('.redown-click-light')?.dataset.target==='shelf');
 await page.selectOption('#click2cloud-pulse-destination','provider-card');
 assert.equal(await page.evaluate(()=>preferences.click2CloudPulseDestination),'provider-card');
 await page.waitForFunction(()=>!document.querySelector('.redown-click-light'));
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>emit({provider:'google'}));
 await page.waitForFunction(()=>document.querySelector('.redown-click-light'));
 assert.equal(await page.evaluate(()=>document.querySelector('.redown-click-light').getAnimations()[0].effect.getTiming().duration),180);
 await page.waitForFunction(()=>!document.querySelector('.redown-click-light'));
 assert.deepEqual(errors,[]);
 const sourcePage=await browser.newPage({viewport:{width:900,height:700}});
 await sourcePage.setContent('<body style="background:#17202f;color:white;padding:100px">Source-page click fixture</body>');
 await sourcePage.addScriptTag({path:'extension/click-origin.js'});
 await sourcePage.evaluate(()=>document.dispatchEvent(new MouseEvent('contextmenu',{clientX:177,clientY:240,bubbles:true})));
 const background=await readFile('extension/background.js','utf8');
 const launch=background.slice(background.indexOf('async function launchSaveDroplet'),background.indexOf('// Go Home is a navigation'));
 const arrivals=[];
 const context=vm.createContext({Date,crypto:webcrypto,RedownClickFeedback:{preferences:()=>({shelfColorScheme:'neon'}),providerFor:()=> 'cloudflare',begin:()=>({}),end:()=>true},
  chrome:{runtime:{sendMessage:async event=>arrivals.push(event)},scripting:{executeScript:async options=>[{result:await sourcePage.evaluate(({fn,args})=>(0,eval)('('+fn+')')(...args),{fn:options.func.toString(),args:options.args})}]}}});
 vm.runInContext(launch,context);
 const flight=context.launchSaveDroplet({menuItemId:'v3:destination'},{id:1,windowId:7});
 await sourcePage.waitForFunction(()=>document.querySelector('span'));
 assert.deepEqual(await sourcePage.evaluate(()=>{const orb=document.querySelector('span');return [orb.style.left,orb.style.top];}),['177px','240px']);
 await sourcePage.screenshot({path:output+'/source-flight.png'});
 await flight;assert.equal(arrivals.length,1);assert.equal(await sourcePage.locator('span').count(),0);
 await sourcePage.close();
 await writeFile(output+'/results.json',JSON.stringify({scope:'ordinary Chromium, mocked extension APIs, no installed extension or live providers',cases:results,settingsPersistence:'mock storage',fallback:true,reducedMotion:true,sourceFlight:true,errors},null,2)+'\n');
 console.log(JSON.stringify({cases:results.length,fallback:true,reducedMotion:true,errors,output}));
}finally{await browser.close();}
