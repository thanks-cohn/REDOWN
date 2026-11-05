// Additional owner-contract cases using the existing actual-component HTTP harness.
import assert from 'node:assert/strict';
export async function runP0({page,out,lowMemory}){
 const result={lowMemory,classification:'controlled Chromium HTTP fixture; provider and extension messaging mocked',geometry:[],gestures:{},performance:{},receivers:[]};
 const split=page.locator('.mini-column-resize'),dock=page.locator('.mini-preview'),list=page.locator('.mini-list');
 const pressSplit=async key=>{await split.focus();await page.keyboard.press(key);await page.waitForTimeout(50);};
 await page.locator('.mini-row').nth(1).click();await page.keyboard.press('ArrowDown');await page.keyboard.press('Space');
 assert.equal(await dock.isVisible(),false);result.gestures.selectionOnly=true;
 await page.locator('.mini-row').nth(1).dblclick();await page.waitForSelector('.mini-preview-body img');
 assert.equal(await page.locator('.mini-window-preview').evaluate(n=>n.open),false);
 await page.keyboard.press('ArrowDown');await page.waitForFunction(()=>document.querySelector('.mini-preview strong').textContent==='file-00001.png');result.gestures.imageBrowsing=true;
 await page.locator('.mini-preview').evaluate(n=>n.style.height='157px');
 const before=await dock.evaluate(n=>n.getBoundingClientRect().height);
 await page.getByRole('button',{name:'Expand preview',exact:true}).click();await page.waitForTimeout(190);
 const expanded=await page.evaluate(()=>{const p=document.querySelector('.mini-preview').getBoundingClientRect(),h=document.querySelector('#explorer-view').getBoundingClientRect(),nav=document.querySelector('nav[aria-label=Shelf]').getBoundingClientRect();return {preview:{top:p.top,bottom:p.bottom,height:p.height},host:{top:h.top,bottom:h.bottom,height:h.height},navBottom:nav.bottom};});
 assert.ok(Math.abs(expanded.preview.height-expanded.host.height)<2);assert.ok(expanded.preview.top>=expanded.navBottom);result.gestures.expanded=expanded;
 if(!lowMemory)await page.screenshot({path:out+'/preview-expanded.png'});
 await page.getByRole('button',{name:'Restore preview',exact:true}).click();await page.waitForTimeout(190);assert.equal(await dock.evaluate(n=>n.getBoundingClientRect().height),before);
 result.gestures.restorePixels=before;
 for(const width of [320,390,700,900])for(const theme of ['porcelain','midnight','ocean','neon']){
  await page.setViewportSize({width,height:700});await page.evaluate(theme=>document.documentElement.dataset.shelfTheme=theme,theme);
  for(const percent of [0,25,50,75,100]){
   await pressSplit('Home');for(let i=0;i<percent/5;i++)await page.keyboard.press('ArrowRight');await page.waitForTimeout(50);
   const cell=await page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,width:r.width,right:r.right};};return {percent:Number(document.querySelector('.mini-column-resize').getAttribute('aria-valuenow')),rail:box('.mini-rail'),files:box('.mini-content'),workspace:box('.mini-workspace'),grip:box('.mini-column-resize'),overflow:document.documentElement.scrollWidth>innerWidth,media:document.querySelector('.mini-row img')?.getBoundingClientRect().width};});
   assert.equal(cell.percent,percent);assert.equal(cell.overflow,false);assert.ok(cell.grip.x>=cell.workspace.x&&cell.grip.right<=cell.workspace.right+1);if(percent===0)assert.ok(cell.rail.width<1);if(percent===100)assert.ok(cell.files.width<1);
   result.geometry.push({width,theme,...cell});
   if(!lowMemory&&theme==='porcelain'&&[320,900].includes(width)&&[0,50,100].includes(percent))await page.screenshot({path:out+`/split-${width}-${percent}.png`});
  }
  await page.getByRole('button',{name:'Reset columns to 50/50',exact:true}).click();
 }
 await page.setViewportSize({width:700,height:700});
 // Real pointer travel, frame-coalesced updates, and bounded live DOM.
 const b=await split.boundingBox(),workspace=await page.locator('.mini-workspace').boundingBox();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const metricsBefore=(await cdp.send('Performance.getMetrics')).metrics;
 await page.evaluate(()=>{fixture.rowReplacements=0;fixture.rowObserver=new MutationObserver(records=>fixture.rowReplacements+=records.length);fixture.rowObserver.observe(document.querySelector('.mini-rows'),{childList:true});});
 const started=Date.now();await page.mouse.move(b.x+4,b.y+30);await page.mouse.down();
 for(const x of [workspace.x+4,workspace.x+workspace.width-4,workspace.x+workspace.width/2])await page.mouse.move(x,b.y+30,{steps:40});
 await page.mouse.up();await page.waitForTimeout(80);result.performance.pointer120SamplesMs=Date.now()-started;
 const metricsAfter=(await cdp.send('Performance.getMetrics')).metrics;
 for(const name of ['ScriptDuration','LayoutDuration','RecalcStyleDuration','TaskDuration'])result.performance[name+'Ms']=1000*(metricsAfter.find(x=>x.name===name).value-metricsBefore.find(x=>x.name===name).value);
 result.performance.rowReplacements=await page.evaluate(()=>{fixture.rowObserver.disconnect();return fixture.rowReplacements;});await cdp.detach();
 await split.dblclick();assert.equal(await split.getAttribute('aria-valuenow'),'50');
 // Detailed and Large Images preserve the current selection/path and scroll item.
 const selected=await page.locator('.mini-row[aria-selected=true]').getAttribute('data-key').catch(()=>null);
 await page.locator('[data-action=grid]').click();assert.equal(await page.locator('[data-action=grid]').textContent(),'Detailed');
 await page.locator('[data-action=grid]').click();assert.equal(await page.locator('[data-action=grid]').textContent(),'Large Images');
 if(selected)assert.equal(await page.locator('.mini-row[aria-selected=true]').getAttribute('data-key'),selected);
 await page.getByRole('button',{name:'Close preview',exact:true}).click();
 await list.focus();await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('.mini-rows').lastElementChild?.getAttribute('aria-posinset')==='10001');
 const anchor=await page.locator('.mini-rows').evaluate(n=>n.lastElementChild.dataset.key);await pressSplit('End');await pressSplit('Home');await page.waitForFunction(()=>document.querySelector('.mini-rows').lastElementChild?.getAttribute('aria-posinset')==='10001');
 result.performance.finalAnchor=anchor;result.performance.liveRows=await page.locator('.mini-row').count();assert.ok(result.performance.liveRows<40);
 await page.getByRole('button',{name:'Reset columns to 50/50',exact:true}).click();
 // Natural trusted browser drags, including an unverified custom target. No prior
 // prepare click. Verify the input's independently reconstructed original bytes.
 await list.focus();await page.keyboard.press('Home');await page.waitForTimeout(100);
 await page.evaluate(()=>{
  fixture.slow=true;const input=document.createElement('input');input.type='file';input.id='fixture-upload';input.accept='.png';document.body.append(input);Object.assign(input.style,{position:'fixed',top:'10px',right:'10px',width:'150px',zIndex:'9999'});
  input.addEventListener('change',async()=>{const f=input.files[0];fixture.received={name:f.name,type:f.type,bytes:Array.from(new Uint8Array(await f.arrayBuffer()))};});
 });
 await page.locator('.mini-row').nth(1).dragTo(page.locator('#fixture-upload'));await page.waitForFunction(()=>fixture.received);const input=await page.evaluate(()=>fixture.received);
 assert.equal(input.name,'file-00000.png');assert.equal(input.type,'image/png');assert.deepEqual(input.bytes,await page.evaluate(()=>Array.from(fixture.expected)));result.receivers.push({target:'controlled input',accepted:true,verifiedUpload:false,...input});
 await page.waitForTimeout(150);const reads=await page.evaluate(()=>fixture.reads);
 await page.locator('.mini-row').nth(1).dragTo(page.locator('#fixture-upload'));await page.waitForFunction(()=>document.querySelector('.mini-drag-status').textContent.includes('reused'));
 assert.equal(await page.evaluate(()=>fixture.reads),reads);result.receivers.push({target:'explicit retry',cloudReadReused:true,verifiedUpload:false});
 await page.evaluate(()=>{
  document.getElementById('fixture-upload').remove();const target=document.createElement('div');target.id='custom-drop';target.textContent='Controlled drop target';Object.assign(target.style,{position:'fixed',top:'10px',right:'10px',padding:'15px',zIndex:'9999',background:'white'});document.body.append(target);
  target.addEventListener('drop',async e=>{if(e.dataTransfer.files.length){const f=e.dataTransfer.files[0];fixture.custom={name:f.name,bytes:Array.from(new Uint8Array(await f.arrayBuffer())),trusted:e.isTrusted};}});
 });
 await page.waitForTimeout(150);await page.locator('.mini-row').nth(1).dragTo(page.locator('#custom-drop'));await page.waitForFunction(()=>fixture.custom);
 const custom=await page.evaluate(()=>fixture.custom);assert.deepEqual(custom.bytes,input.bytes);assert.equal(custom.trusted,false);result.receivers.push({target:'controlled custom',accepted:true,verifiedUpload:false,...custom});
 await page.evaluate(()=>document.getElementById('custom-drop').remove());
 // Real decoded portrait/landscape/ultrawide geometry and mixed file rows.
 result.media=[];
 for(const count of [0,1,100,10000]){
  await page.evaluate(count=>{
   fixture.slow=false;fixture.bytesByKey={};
   const images=[[40,80],[120,60],[240,20]].map(([w,h])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#408dbe';x.fillRect(0,0,w,h);x.fillStyle='#f4c56c';x.fillRect(w/4,h/4,w/2,h/2);return Array.from(Uint8Array.from(atob(c.toDataURL('image/png').split(',')[1]),v=>v.charCodeAt(0)));});
   fixture.entries=Array.from({length:count},(_,i)=>{const key=String(i).padStart(5,'0')+(i%4===3?'-'+('long filename ').repeat(20)+'.bin':'.png'),bytes=images[i%3];fixture.bytesByKey[key]=bytes;return {key,size:bytes.length,etag:'media-v1',httpMetadata:{contentType:i%4===3?'application/octet-stream':'image/png'}};});
  },count);
  await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(count=>document.querySelector('.mini-status').textContent.startsWith(count.toLocaleString()+' loaded'),count);
  if(count){
   await page.waitForFunction(()=>document.querySelector('.mini-row img')?.naturalHeight===80);await page.waitForTimeout(100);
   const widths=[];
   for(const percent of [0,50,75]){
    await pressSplit('Home');for(let i=0;i<percent/5;i++)await page.keyboard.press('ArrowRight');await page.waitForTimeout(80);
    const sample=await page.waitForFunction(()=>{const n=document.querySelector('.mini-row[data-key="00000.png"] img'),r=n?.getBoundingClientRect();return r&&r.width>0&&Math.abs(r.height/r.width-2)<.04?{width:r.width,height:r.height,key:n.closest('.mini-row').dataset.key,naturalWidth:n.naturalWidth,naturalHeight:n.naturalHeight}:false;});widths.push(await sample.jsonValue());
   }
   assert.ok(widths[0].width>widths[1].width&&widths[1].width>widths[2].width);for(const r of widths)assert.ok(Math.abs(r.height/r.width-2)<.04,JSON.stringify({count,widths}));
   const aspects=[];
   if(count>2){for(const [key,ratio] of [['00001.png',.5],['00002.png',1/12]]){await page.evaluate(key=>[...document.querySelectorAll('.mini-row')].find(n=>n.dataset.key===key).scrollIntoView({block:'center',behavior:'instant'}),key);await page.waitForFunction(key=>[...document.querySelectorAll('.mini-row')].find(n=>n.dataset.key===key)?.querySelector('img')?.naturalWidth>1,key);await page.waitForTimeout(100);const sample=await page.waitForFunction(({key,ratio})=>{const n=[...document.querySelectorAll('.mini-row')].find(n=>n.dataset.key===key)?.querySelector('img'),b=n?.getBoundingClientRect();return b&&b.width>0&&Math.abs(b.height/b.width-ratio)<.04?{width:b.width,height:b.height}:false;},{key,ratio});const r=await sample.jsonValue();assert.ok(Math.abs(r.height/r.width-ratio)<.04,JSON.stringify({key,ratio,...r}));aspects.push({key,ratio,...r});}}
   result.media.push({count,widths,aspects});
   await page.getByRole('button',{name:'Reset columns to 50/50',exact:true}).click();
   if(count===100&&!lowMemory)await page.screenshot({path:out+'/portrait-landscape-media.png'});
   await page.locator('[data-action=grid]').click();await list.focus();await page.keyboard.press('End');await page.waitForTimeout(70);
   assert.equal(await page.locator('.mini-row').last().getAttribute('aria-posinset'),String(count));await page.locator('[data-action=grid]').click();
  }else assert.equal(await page.locator('.mini-row').count(),0);
 }
 // Actual measured upward transition: the same real nav moves toward the FILES
 // top while Explorer rises from below. Default and reduced motion skip it.
 await page.locator('#nav-settings').click();await page.locator('#files-entrance').selectOption('slide-up');await page.waitForTimeout(50);
 await page.locator('#nav-clouds').click();const navStart=await page.locator('nav[aria-label=Shelf]').evaluate(n=>n.getBoundingClientRect().top);
 await page.locator('#nav-explorer').click();await page.waitForTimeout(40);
 const motion=await page.evaluate(()=>({navTop:document.querySelector('nav[aria-label=Shelf]').getBoundingClientRect().top,explorerTop:document.querySelector('#explorer-view').getBoundingClientRect().top,animations:document.querySelector('nav[aria-label=Shelf]').getAnimations().length}));
 if(!lowMemory)await page.screenshot({path:out+'/slide-during.png'});
 await page.waitForTimeout(280);const navEnd=await page.locator('nav[aria-label=Shelf]').evaluate(n=>n.getBoundingClientRect().top);
 assert.ok(navStart>navEnd);assert.ok(motion.animations>0);assert.ok(motion.navTop>navEnd);result.entrance={navStart,motion,navEnd};
 if(!lowMemory)await page.screenshot({path:out+'/slide-after.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#nav-history').click();await page.locator('#nav-explorer').click();assert.equal(await page.locator('nav[aria-label=Shelf]').evaluate(n=>n.getAnimations().length),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Rapid cancel and route-switch recovery.
 await page.locator('#nav-history').click();await page.locator('#nav-explorer').click();await page.locator('#nav-settings').click();await page.waitForTimeout(280);assert.equal(await page.locator('nav[aria-label=Shelf]').evaluate(n=>n.getAnimations().length),0);
 await page.locator('#keep-prepared-files').check();await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>fixture.local.shelfKeepPreparedV1),true);await page.locator('#clear-prepared-files').click();await page.waitForFunction(()=>document.querySelector('#prepared-files-usage').textContent.startsWith('0 prepared'));
 result.status='PASS';return result;
}
