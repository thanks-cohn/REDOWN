// Ordinary Chromium with mocked storage, not an installed-extension or cloud test.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/package.json':import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-background-networking']});
const output='work/celestial-preview';await mkdir(output,{recursive:true});
const html=(await readFile('extension/shelf.html','utf8')).replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]+>/g,'');
const css=await readFile('extension/shelf.css','utf8');
const director=await readFile('extension/shelf-celestial.js','utf8'),theme=await readFile('extension/shelf-theme.js','utf8');
const report={scope:'Local ordinary Chromium fixture; mock Chrome storage; no provider calls or unpacked extension.',cases:[]};
try{
 for(const width of [320,390,480])for(const view of ['clouds','history','settings'])for(const lunar of [false,true]){
  const page=await browser.newPage({viewport:{width,height:780},recordVideo:{dir:output,size:{width,height:780}},reducedMotion:'no-preference'});
  await page.setContent(html);await page.addStyleTag({content:css});
  await page.evaluate(({view})=>{
   history.replaceState(null,'','#'+view);
   for(const name of ['clouds','history','settings'])document.getElementById(name+'-view').hidden=name!==view;
   window.commits=[];window.chrome={storage:{local:{get:async()=>({shelfColorScheme:'midnight'}),set:async data=>commits.push({data,time:performance.now(),overlay:!!document.querySelector('.celestial-overlay')})},onChanged:{addListener(){}}}};
  },{view});
  await page.addScriptTag({content:director});await page.addScriptTag({content:theme});
  await page.locator('#theme-toggle').hover();await page.waitForTimeout(300);
  const geometry=await page.evaluate(()=>{
   const orb=document.querySelector('[data-palette="neon"]').getBoundingClientRect(),dash=document.querySelector('#dashboard').getBoundingClientRect();
   return {left:orb.left,right:orb.right,dashboardLeft:dash.left,alternatives:document.querySelectorAll('.celestial-orb').length};
  });assert.equal(geometry.alternatives,3);assert.ok(geometry.left>=0&&geometry.right<geometry.dashboardLeft);
  await page.screenshot({path:`${output}/${width}-${view}-${lunar?'moon':'orb'}-selector.png`});
  await page.evaluate(()=>{
   window.samples=[];const base=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){samples.push({class:this.className?.baseVal??this.className,text:this.textContent,frames,options,time:performance.now()});return base.call(this,frames,options);};
  });
  if(lunar)await page.locator('#theme-toggle').click();else await page.locator('[data-palette="neon"]').click();
  await page.waitForTimeout(lunar?1550:550);
  await page.screenshot({path:`${output}/${width}-${view}-${lunar?'moon':'orb'}-fall.png`});
  await page.waitForFunction(()=>commits.some(x=>x.data.shelfColorScheme));
  const result=await page.evaluate(()=>({samples,commits,overlays:document.querySelectorAll('.celestial-overlay').length,animations:document.getAnimations().length,palette:document.documentElement.dataset.shelfTheme,scrollWidth:document.documentElement.scrollWidth}));
  const impact=result.samples.find(x=>String(x.class).includes('')&&['Future','PERSONAL','HOME'].includes(x.text));
  const flights=result.samples.filter(x=>String(x.class).includes('celestial-falling')&&x.frames.length>100);
  assert.equal(flights.length,1);
  const flight=flights[0];assert.equal(flight.options.easing,'linear');
  const xy=flight.frames.map(f=>f.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px/).slice(1).map(Number));
  assert.ok(xy.at(-1)[1]>700);
  assert.ok(flight.frames.some(f=>Math.abs(f.offset*flight.options.duration-impact.options.delay)<.001));
  assert.ok(impact,`impact ${view} at ${width}`);assert.equal(impact.text,view==='clouds'?'Future':view==='history'?'PERSONAL':'HOME');
  assert.equal(result.overlays,0);assert.equal(result.commits.find(x=>x.data.shelfColorScheme).overlay,false);
  assert.ok(result.scrollWidth<=width);report.cases.push({width,view,lunar,geometry,palette:result.palette,impact:impact.text,commitAfterOverlayRemoval:true});
  await page.waitForTimeout(1700);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  const video=page.video();await page.close();await video.saveAs(`${output}/${width}-${view}-${lunar?'moon':'orb'}.webm`);
 }
 await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
