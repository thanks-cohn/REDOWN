// Local ordinary Chromium + mock storage. Never installed-extension/cloud proof.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/package.json':import.meta.url);
const {chromium}=require('playwright');
const output='docs/verification/shelf-save-feedback';await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname;if(path.includes('..'))throw Error();let data=await readFile('extension'+(path==='/'?'/shelf.html':path));if(path==='/'||path==='/shelf.html')data=Buffer.from(data.toString().replace(/<script[\s\S]*?<\/script>/g,''));res.setHeader('Content-Type',path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':path.endsWith('.woff')?'font/woff':path.endsWith('.woff2')?'font/woff2':path.endsWith('.png')?'image/png':'text/html');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const cases=[];
async function setup(width,theme,reduced=false,video=false){
 const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:reduced?'reduce':'no-preference',...(video?{recordVideo:{dir:output,size:{width,height:1100}}}:{})});await page.goto(origin);await page.evaluate(theme=>{
  document.documentElement.dataset.shelfTheme=theme;window.events=[];window.chrome={storage:{local:{get:async()=>({})},onChanged:{addListener:fn=>events.push(fn)}}};
  window.emit=(key,newValue)=>events.forEach(fn=>fn({[key]:{newValue}},'local'));
  for(const id of ['shelf-google-label','shelf-dropbox-label','shelf-onedrive-label'])document.getElementById(id).textContent='GO TO';
 },theme);await page.evaluate(()=>{window.baselineScrollWidth=document.documentElement.scrollWidth;});await page.addScriptTag({url:origin+'/shelf-save-feedback.js'});await page.evaluate(()=>document.fonts.ready);return page;
}
try{
 for(const width of [320,390,480])for(const theme of ['porcelain','midnight','ocean','neon']){
  const page=await setup(width,theme,false,width===390);
  for(const value of ['0','1','10','999','10000','90071992547409931234567890']){
   await page.evaluate(value=>emit('providerSaveReceipts',{totals:Object.fromEntries(['cloudflare','google','dropbox','onedrive'].map(p=>[p,value]))}),value);
   const sizes=await page.evaluate(()=>[...document.querySelectorAll('.provider-save-count')].map(e=>({font:parseFloat(getComputedStyle(e).fontSize),width:e.getBoundingClientRect().width,available:e.parentElement.clientWidth})));
   for(const s of sizes)assert.ok(s.width<=s.available+1,JSON.stringify({width,theme,value,s}));
   if(theme==='neon'&&value==='0')assert.ok(sizes.every(s=>s.font>=50));
   cases.push({width,theme,value,sizes});
  }
  await page.evaluate(()=>{for(const provider of ['cloudflare','google','dropbox','onedrive'])emit('providerSaveReceipts',{totals:{cloudflare:'10000',google:'999',dropbox:'10',onedrive:'1'},latest:{provider,id:crypto.randomUUID(),at:Date.now()}});});
  await page.waitForTimeout(theme==='neon'?80:580);
  assert.equal(await page.locator('.provider-save-success').count(),4);
  await page.screenshot({path:`${output}/${width}-${theme}-success.png`,fullPage:true});
  await page.waitForTimeout(2400);
  assert.equal(await page.locator('.provider-save-success').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=Math.max(innerWidth,baselineScrollWidth)),JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})))));
  await page.screenshot({path:`${output}/${width}-${theme}-idle.png`,fullPage:true});
  const video=page.video();await page.close();if(video)await video.saveAs(`${output}/390-${theme}.webm`);
 }
 const page=await setup(320,'neon',true);
 await page.evaluate(()=>{emit('providerSaveReceipts',{totals:{google:'1'},latest:{provider:'google',id:'reduced',at:Date.now()}});});
 assert.equal(await page.locator('.provider-save-success').textContent(),'SUCCESS!');await page.screenshot({path:output+'/reduced.png',fullPage:true});await page.waitForTimeout(1700);assert.equal(await page.locator('.provider-save-success').count(),0);await page.close();
 const zoom=await setup(390,'neon');await zoom.evaluate(()=>{document.body.style.zoom='1.5';emit('providerSaveReceipts',{totals:{cloudflare:'90071992547409931234567890',google:'10000',dropbox:'999',onedrive:'10'}});});await zoom.waitForTimeout(200);
 assert.ok(await zoom.evaluate(()=>[...document.querySelectorAll('.provider-save-count')].every(e=>e.scrollWidth<=e.parentElement.clientWidth)));await zoom.screenshot({path:output+'/390-zoom150.png',fullPage:true});await zoom.close();
 // Interaction flight/surface verification lives in click-feedback-preview.mjs.
 await writeFile(output+'/report.json',JSON.stringify({scope:'Local Chromium mock storage only; no authenticated providers',cases,reducedMotion:'PASS',cleanup:'PASS'},null,2));
 console.log(`PASS: ${cases.length} count/width/theme combinations, 12 animation cleanups, reduced motion`);
}finally{await browser.close();server.close();}
