// Normal-webpage fixture only. This does not install an extension or contact R2.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=await import(process.env.REDOWN_PLAYWRIGHT_MODULE||'playwright');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff':'font/woff'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://fixture').pathname));if(!path.startsWith(root))throw Error('Outside fixture root');res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.REDOWN_CHROMIUM_PATH?{executablePath:process.env.REDOWN_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],messages=[];
page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{
  const auth={accessToken:'local-fixture-token',sessionId:'local-fixture-session'};
  window.chrome={storage:{local:{get:async()=>({cloudflareAuth:auth})},onChanged:{addListener(){}}},runtime:{sendMessage:async m=>{
    window.__messages=(window.__messages||[]).concat(m);
    if(m.type==='cfAccounts')return {ok:true,accounts:[{id:'account',name:'Personal workspace'}]};
    if(m.type==='cfBuckets')return {ok:true,buckets:[{name:'creative-studio'},{name:'project-archive'},{name:'weekend-photos'}]};
    if(m.type==='profiles')return {ok:true,profiles:[{id:'saved',type:'cloudflare-r2',name:'Studio files',accountId:'account',bucketName:'creative-studio',defaultPrefix:''}]};
    if(m.type==='cfPublicAddresses')return {ok:true,accountId:'account',bucketName:'creative-studio',addresses:[{label:'R2 public domain',base:'https://fixture.r2.dev',state:'configured'}]};
    if(m.type==='cfArchiveEntries')return {ok:true,archive:{entries:[{name:'notes.txt',size:12},{name:'nested/one.txt',size:24}]}};
    if(m.type==='transferHistory')return {ok:true,transferHistory:[]};
    throw Error('Unsupported fixture mutation: '+m.type);
  }}};
});
await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin===origin)return route.continue();
  if(url.hostname==='api.cloudflare.com'&&url.pathname.includes('/objects')){
    if(url.pathname.includes('/objects/'))return route.fulfill({status:200,body:'A little room for the next idea.\nKeep every detail in order.',headers:{'content-type':'text/plain'}});
    const prefix=url.searchParams.get('prefix')||'';
    return route.fulfill({json:{success:true,result:{delimited:prefix?[]:['Design/','Photography/','Projects/'],objects:prefix?[]:[{key:'Brand direction.pdf',size:2485000,uploaded:'2026-10-20T14:00:00Z'},{key:'Notes for tomorrow.txt',size:2450,uploaded:'2026-10-23T10:30:00Z'},{key:'Studio collection.zip',size:58200000,uploaded:'2026-10-24T08:00:00Z'},{key:'Winter campaign.webp',size:4120000,uploaded:'2026-10-26T16:30:00Z'}]}}});
  }
  return route.abort(); // No external cloud calls are allowed in this fixture.
});
const output=resolve(process.env.REDOWN_PREVIEW_OUTPUT||'/tmp/redown-beta-preview');await mkdir(output,{recursive:true});
try{
  await page.goto(origin+'/extension/beta/explorer.html');await page.getByRole('button',{name:'creative-studio',exact:false}).click();await page.locator('.file').first().waitFor();
  await page.screenshot({path:resolve(output,'desktop.png'),fullPage:true});
  await page.locator('[data-key="Notes for tomorrow.txt"]').click();await page.getByRole('button',{name:'Preview',exact:true}).click();await page.locator('#preview-content pre').waitFor();assert.match(await page.locator('#preview-content pre').textContent(),/next idea/);await page.screenshot({path:resolve(output,'preview.png'),fullPage:true});await page.locator('#preview-close').click();
  await page.getByRole('button',{name:'Get URL',exact:true}).click();await page.locator('.url-popover-row').waitFor();assert.match(await page.locator('.url-popover-row code').textContent(),/Notes%20for%20tomorrow/);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Transfer preferences',exact:true}).click();await page.locator('#pref-concurrency').fill('3');await page.getByRole('button',{name:'Apply',exact:true}).click();assert.match(await page.locator('#status').textContent(),/applied/);
  await page.locator('[data-key="Studio collection.zip"]').click();await page.locator('#archive').click();await page.locator('#archive-files label').first().waitFor();assert.equal(await page.locator('#archive-files label').count(),2);await page.screenshot({path:resolve(output,'archive.png'),fullPage:true});await page.locator('#archive-close').click();
  await page.locator('#copy-to').click();await page.locator('#destination-confirm:not(:disabled)').waitFor();assert.equal(await page.locator('#destination-bucket').inputValue(),'creative-studio');await page.locator('#destination-cancel').click();
  await page.locator('#view').click();await page.screenshot({path:resolve(output,'grid.png'),fullPage:true});
  const widths=[];for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:900});const dimensions=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));widths.push({width,...dimensions});assert.ok(dimensions.content<=dimensions.viewport,JSON.stringify(dimensions));}
  await page.screenshot({path:resolve(output,'mobile.png'),fullPage:true});
  messages.push(...await page.evaluate(()=>window.__messages||[]));assert.deepEqual(errors,[]);assert.ok(messages.some(m=>m.type==='cfPublicAddresses'));
  const report={scope:'Normal Chromium webpage with fixture Chrome messages and intercepted HTTP; no installed extension or live R2',state:'passed',widths,errors,checks:['preview text','public URL API routing','session preferences','archive inspection dialog','destination chooser','grid switch','no horizontal overflow at four widths']};await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
