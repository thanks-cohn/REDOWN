/* Isolated extracted-package Chrome smoke; never uses ordinary browser data. */
import {mkdtemp,readFile,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const extension=resolve(process.argv[2]||'extension');
const output=resolve(process.argv[3]||'work/installed-chrome.json');
const profile=await mkdtemp(join(tmpdir(),'redown-chrome-'));
const record={scope:'installed-chrome',installation:'unpacked directory',state:'blocked',scenario:'fresh isolated profile, real service worker and options, passive diagnostics, local persistence',startedAt:new Date().toISOString(),assertions:[],limitations:['No Cloudflare login or remote data','Not a CRX or store-distributed installation','Not the complete workflow matrix']};
let browser,ws;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const manifest=JSON.parse(await readFile(join(extension,'manifest.json'),'utf8'));
 const digest=createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest('hex').slice(0,32);
 const extensionId=digest.replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
 record.extensionId=extensionId;record.extensionVersion=manifest.version;
 browser=spawn(process.env.CHROME_BIN||'/usr/bin/chromium',['--headless=new','--enable-unsafe-extension-debugging','--disable-features=DisableLoadExtensionCommandLineSwitch','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let launchError;browser.on('error',e=>{launchError=e.code;});browser.stderr.resume();
 let port;
 for(let i=0;i<100;i++){if(launchError)throw Error('CHROME_NOT_AVAILABLE_'+launchError);if(browser.exitCode!==null)throw Error('CHROME_EXIT_'+browser.exitCode);try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await pause(100);}}
 if(!port)throw Error('CHROME_DEBUG_PORT_TIMEOUT');
 const version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();record.browser=version.Browser;record.os=process.platform+' '+process.arch;
 ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(('CDP_'+m.error.code+': '+m.error.message).replaceAll(extension,'[artifact]').replaceAll(profile,'[isolated-profile]').slice(0,160))):p.resolve(m.result);}};
 function call(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT_'+method));},10000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
 // Use the browser's declared CDP loading method when available; modern
 // builds may ignore command-line unpacked extension flags.
 const protocol=await (await fetch(`http://127.0.0.1:${port}/json/protocol`)).json();
 if(protocol.domains.some(d=>d.domain==='Extensions'&&d.commands?.some(c=>c.name==='loadUnpacked'))){
   const loadedExtension=await call('Extensions.loadUnpacked',{path:extension});
   if(loadedExtension.id!==extensionId)throw Error('EXTENSION_ID_MISMATCH');
   record.loadMechanism='CDP Extensions.loadUnpacked';
 }else record.loadMechanism='command-line flags';
 const {targetId}=await call('Target.createTarget',{url:`chrome-extension://${extensionId}/options.html`});
 const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error('EXTENSION_EVALUATION_FAILED');return r.result.value;};
 let loaded=false;for(let i=0;i<50;i++){loaded=await evaluate('typeof chrome?.runtime?.getManifest === "function" && !!document.getElementById("debug-mode-enabled")');if(loaded)break;await pause(100);}
 if(!loaded){const info=await call('Target.getTargets');record.targetTypes=info.targetInfos.map(t=>({type:t.type,extension:t.url.startsWith('chrome-extension://')}));record.pageTitle=await evaluate('document.title');throw Error('EXTENSION_NOT_LOADED_OR_AUTOMATION_UNSUPPORTED');}
 record.assertions.push({id:'real-options-context',passed:true});
 const targets=await call('Target.getTargets');if(!targets.targetInfos.some(t=>t.type==='service_worker'&&t.url===`chrome-extension://${extensionId}/background.js`))throw Error('BACKGROUND_SERVICE_WORKER_MISSING');
 record.assertions.push({id:'real-service-worker',passed:true});
 const disabled=await evaluate('chrome.runtime.sendMessage({type:"runtimeDiagnosticsV1",operation:"snapshot"})');
 if(disabled.code!=='DIAGNOSTICS_DISABLED')throw Error('DEBUG_GATE_FAILED');record.assertions.push({id:'debug-disabled',passed:true});
 await evaluate('chrome.storage.local.set({debugModeEnabled:true})');await pause(100);
 const snapshot=await evaluate('chrome.runtime.sendMessage({type:"runtimeDiagnosticsV1",operation:"snapshot"})');
 if(!snapshot.ok||snapshot.result.data.components.authorization!=='disconnected')throw Error('PASSIVE_SNAPSHOT_FAILED');
 record.assertions.push({id:'passive-disconnected-not-green',passed:true});
 const bundle=await evaluate('chrome.runtime.sendMessage({type:"runtimeDiagnosticsV1",operation:"exportSupport"})');
 if(!bundle.ok||bundle.result.data.schemaVersion!=='1.0.0')throw Error('SUPPORT_EXPORT_FAILED');
 record.assertions.push({id:'sanitized-export',passed:true});
 await evaluate('chrome.storage.local.set({rightClickMode:"simple"})');
 await call('Page.reload',{},sessionId);await pause(300);
 if(await evaluate('(await chrome.storage.local.get("rightClickMode")).rightClickMode')!=='simple')throw Error('PERSISTENCE_FAILED');
 record.assertions.push({id:'local-settings-reopen',passed:true});
 record.state='passed';
}catch(e){record.state=record.assertions.length?'failed':'blocked';record.code=String(e.message||'CHROME_UNAVAILABLE').slice(0,160);process.exitCode=1;}
finally{ws?.close();if(browser&&browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([new Promise(r=>browser.once('exit',r)),pause(2000)]);if(browser.exitCode===null)browser.kill('SIGKILL');}await rm(profile,{recursive:true,force:true,maxRetries:3});record.finishedAt=new Date().toISOString();await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));}
