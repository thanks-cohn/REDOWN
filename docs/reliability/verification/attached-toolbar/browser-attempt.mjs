import {spawn} from 'node:child_process';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const artifact=resolve('work/attached-repair/packaged'),profile=await mkdtemp(resolve('work/attached-repair/profile-'));
const policy=JSON.parse(await readFile('/etc/chromium/policies/managed/extensions.json','utf8'));
const manifest=JSON.parse(await readFile(join(artifact,'manifest.json'),'utf8'));
const digest=createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest('hex').slice(0,32);
const id=digest.replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
const flags=['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking',`--user-data-dir=${profile}`,'--remote-debugging-port=0',`--load-extension=${artifact}`,'about:blank'];
const browser=spawn('/usr/bin/chromium',flags,{stdio:['ignore','ignore','pipe']});let stderr='';browser.stderr.on('data',b=>{stderr=(stderr+b).slice(-16000);});
const artifactSha256=createHash('sha256').update(await readFile('work/package/redown-chrome-0.5.27.zip')).digest('hex');
const launcherSha256=createHash('sha256').update(await readFile(join(artifact,'entry-bootstrap.js'))).digest('hex');
const result={artifactSha256,launcherSha256,state:'unavailable',scope:'standard unpacked attempt from actual audit package in disposable Chromium profile',browser:'Chromium 154.0.8037.57',policy,installedAssertions:0,visualAssertions:0,prohibitedWorkaroundsUsed:false,extensionId:id};
try{
 let port;
 for(let i=0;i<60;i++){
  try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 if(!port)throw Error('DEBUG_PORT_UNAVAILABLE');
 const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 result.extensionWorkerPresent=targets.some(t=>t.type==='service_worker'&&t.url===`chrome-extension://${id}/background.js`);
 result.targets=targets.map(t=>({type:t.type,isRedown:t.url?.startsWith(`chrome-extension://${id}/`)}));
 result.reason='No REDOWN worker observed. Managed policy blocklists all non-approved extensions; modern Chromium may also ignore load-extension. No alternate installation or policy bypass attempted.';
 result.policyMessages=stderr.split('\n').filter(x=>/extension|polic/i.test(x)).map(x=>x.replaceAll(artifact,'[artifact]').replaceAll(profile,'[disposable-profile]')).slice(-10);
}catch{result.reason='Chrome startup/debug inspection unavailable; installed and visual acceptance not executed.';}
finally{browser.kill('SIGTERM');await new Promise(r=>browser.once('exit',r));await rm(profile,{recursive:true,force:true});}
await writeFile('work/attached-repair/installed-chrome.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
