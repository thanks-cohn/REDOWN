import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const code=await readFile('extension/public-addresses.js','utf8'),background=await readFile('extension/background.js','utf8'),options=await readFile('extension/options.js','utf8');
const source={accountId:'a',bucketName:'b'},managed={label:'Development URL',base:'https://pub-fixture.r2.dev/',state:'configured'},custom={label:'Custom domain',base:'https://images.example/',state:'configured'};
const snapshot=(addresses)=>({...source,addresses});
function harness(){const dom=new JSDOM('<main></main>',{runScripts:'outside-only'});dom.window.eval(code);return {dom,api:dom.window.RedownPublicAddresses,d:dom.window.document};}
test('all address combinations stay contextual and encode full literal object paths',()=>{
 const {dom,api}=harness();
 for(const list of [[],[managed],[custom],[managed,custom]]){
  assert.equal(api.addresses(snapshot(list),source).length,list.length);
  assert.equal(api.addresses(snapshot(list),{...source,bucketName:'elsewhere'}).length,0);
  assert.equal(api.addresses(snapshot(list),{...source,accountId:'other'}).length,0);
  for(const item of api.addresses(snapshot(list),source,'nested/a #?% 雪.png'))assert.ok(item.url.endsWith('/nested/a%20%23%3F%25%20%E9%9B%AA.png'));
  for(const item of api.addresses(snapshot(list),source))assert.ok(item.url.endsWith('/'));
 }
 assert.equal(api.addresses(snapshot([{base:'javascript:alert(1)'}]),source).length,0);dom.window.close();
});
test('disclosure is absent without addresses, collapsed initially, contextual and copy/open errors visible',async()=>{
 const {dom,api,d}=harness();let list=[],copied='',opened='';
 const ui=api.disclosure({document:d,source,key:'folder/file.txt',load:async()=>snapshot(list),copy:async text=>{copied=text;},open:async url=>{opened=url;}});d.body.append(ui.host);
 await ui.refresh();assert.equal(ui.host.children.length,0);
 list=[managed,custom];await ui.refresh();const details=ui.host.querySelector('details');assert.equal(details.open,false);assert.equal(details.querySelector('summary').textContent,'URLs');
 const buttons=ui.host.querySelectorAll('button');buttons[0].click();buttons[1].click();await Promise.resolve();assert.equal(copied,'https://pub-fixture.r2.dev/folder/file.txt');assert.equal(opened,copied);
 assert.match(ui.host.textContent,/not verified/);
 details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));await ui.refresh();assert.equal(ui.host.querySelector('details').open,true);
 list=[{...managed,state:'restricted'},{...custom,state:'needs-setup'}];await ui.refresh();assert.ok([...ui.host.querySelectorAll('button')].every(b=>b.disabled));dom.window.close();
});
test('older asynchronous refresh and cancelled responses cannot replace newer configuration',async()=>{
 const {dom,api,d}=harness();const waiting=[];const ui=api.disclosure({document:d,source,load:()=>new Promise(resolve=>waiting.push(resolve))});
 const old=ui.refresh(),fresh=ui.refresh();waiting[1](snapshot([custom]));await fresh;waiting[0](snapshot([managed]));await old;assert.match(ui.host.textContent,/images.example/);assert.doesNotMatch(ui.host.textContent,/r2.dev/);
 const late=ui.refresh();ui.cancel();waiting[2](snapshot([managed]));await late;assert.doesNotMatch(ui.host.textContent,/r2.dev/);dom.window.close();
});
function backgroundHarness(overrides={}){
 const profile={id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'b',scriptName:'redown-b',workerUrl:'https://fixture.workers.dev',publicAssetsEnabled:true};let stored=[profile];const calls=[];
 const context={URL,Promise,encodeURIComponent,isVerifiedWorkerHealth:b=>b?.service==='REDOWN',getProfiles:async()=>structuredClone(stored),setProfiles:async value=>{stored=value;},cfJson:async(path,opts)=>{calls.push({path,opts});if(path.includes('/workers/domains'))return opts?{hostname:'cdn.example',service:'redown-b'}:[{hostname:'cdn.example',service:'redown-b',enabled:true}];if(path.endsWith('/managed'))return {domain:'pub-fixture.r2.dev',enabled:true};if(path.endsWith('/custom'))return {domains:[{domain:'images.example',enabled:true,status:{ssl:'pending',ownership:'active'}}]};return {};},configureBucketAssetCors:async()=>{},provisionCloudflareProfile:async()=>stored[0],RedownCloudflareApi:{boundedFetch:async()=>({ok:true,json:async()=>({service:'REDOWN'})})},...overrides};
 vm.createContext(context);vm.runInContext(background.slice(background.indexOf('function normalizeWebOrigin('),background.indexOf('async function configureBucketAssetCors('))+background.slice(background.indexOf('async function configureAssetDomain('),background.indexOf('function publicAssetUrl(')),context);return {context,calls,stored:()=>stored};
}
test('discovery is read-only; pending, disabled, and cross-bucket configurations remain distinct',async()=>{
 const h=backgroundHarness();const result=await h.context.bucketPublicAddresses('a','b');assert.equal(result.addresses.length,3);assert.equal(result.addresses[1].state,'needs-setup');assert.ok(h.calls.every(c=>!c.opts));
 const other=await h.context.bucketPublicAddresses('a','different');assert.ok(!other.addresses.some(a=>a.label.includes('Worker')));
});
test('attachment requires exact read-back; public connection verification and setup failures are separate',async()=>{
 const h=backgroundHarness();let r=await h.context.configureAssetDomain('a','b','cdn.example');assert.equal(r.state,'verified');assert.match(r.message,/individual file access has not been tested/);assert.equal(h.stored()[0].customAssetDomain,'cdn.example');
 h.context.provisionCloudflareProfile=async()=>{throw Error('Worker unavailable');};r=await h.context.configureAssetDomain('a','b','cdn.example');assert.equal(r.state,'needs-setup');assert.match(r.message,/Worker unavailable/);
 h.context.cfJson=async(path,opts)=>opts?{}:[];r=await h.context.configureAssetDomain('a','b','wrong.example');assert.equal(r.state,'unknown');
 h.context.cfJson=async()=>{throw Error('Permission denied');};await assert.rejects(h.context.configureAssetDomain('a','b','cdn.example'),/Permission denied/);
});
test('Normal Mode attachment feedback stays visible and does not overwrite background profiles',async()=>{
 const {dom,d}=harness();let resolve;const profile={...source,id:'p'};
 dom.window.send=message=>message.type==='cfPublicAddresses'?Promise.resolve({...snapshot([managed]),ok:true}):new Promise(r=>resolve=r);
 dom.window.eval(options.slice(options.indexOf('function assetCorsControl('),options.indexOf('function renderRightClickMode(')));
 const ui=dom.window.assetCorsControl(profile);d.body.append(ui);const button=ui.querySelector('button');button.click();assert.equal(button.textContent,'Attaching…');assert.equal(ui.querySelector('[role=status]').hidden,false);
 resolve({ok:true,hostname:'cdn.example',state:'attached',message:'Attached — public connection not verified.',profile:{customAssetDomain:'cdn.example'}});await new Promise(r=>setTimeout(r,0));assert.match(ui.textContent,/Attached — public connection not verified/);assert.equal(button.disabled,false);assert.equal(profile.customAssetDomain,'cdn.example');dom.window.close();
});
test('domain refresh updates every connected disclosure for that bucket, preserves expansion and leaves other media/buckets alone',async()=>{
 const {dom,api,d}=harness();let domain='https://old.example/';const calls=[];
 const make=(bucket,key)=>api.disclosure({document:d,source:{accountId:'a',bucketName:bucket},key,load:async()=>{calls.push(bucket);return {accountId:'a',bucketName:bucket,addresses:[{label:'Custom domain',base:domain,state:'configured'}]};}});
 const settings=make('b'),preview=make('b','nested/雪 #?.png'),other=make('other','private.txt'),detached=make('b','gone.txt');
 const media=d.createElement('img');media.src='blob:existing-preview';d.body.append(media,settings.host,preview.host,other.host);await Promise.all([settings.refresh(),preview.refresh(),other.refresh(),detached.refresh()]);
 preview.host.querySelector('details').open=true;domain='https://new.example/assets/';calls.length=0;
 await api.refreshVisible(d,{accountId:'a',bucketName:'b'});assert.deepEqual(calls,['b','b']);assert.match(preview.host.textContent,/new.example\/assets\/nested\/%E9%9B%AA%20%23%3F.png/);assert.equal(preview.host.querySelector('details').open,true);assert.match(settings.host.textContent,/new.example\/assets\//);assert.match(other.host.textContent,/old.example/);assert.match(detached.host.textContent,/old.example/);assert.equal(media.src,'blob:existing-preview');dom.window.close();
});
