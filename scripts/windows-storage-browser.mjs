// Real Linux Chromium origin storage, disposable profile only. No extension/provider access.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,rm,statfs} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const output=resolve(process.argv[2]||'work/windows-oauth-history/storage-browser.json'),profile=await mkdtemp(join(tmpdir(),'redown-storage-test-')),pause=ms=>new Promise(r=>setTimeout(r,ms));
const result={scope:'Real Linux Chromium IndexedDB quota fault in isolated localhost origin; NOT Windows or extension storage.local or provider acceptance',state:'failed',cases:[],osLowSpaceCases:[{freeBytes:705335296,state:'blocked',reason:'No disposable Windows volume; shared host volume not filled'},{freeBytes:415735808,state:'blocked',reason:'No disposable Windows volume; shared host volume not filled'}]};
let browser,ws;const server=createServer((_req,res)=>res.end('<!doctype html><title>Disposable storage fixture</title>'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{
 const fs=await statfs(profile);result.hostFreeBytes=Number(fs.bavail)*Number(fs.bsize);
 browser=spawn('/usr/bin/chromium',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr.resume();
 let port;for(let i=0;i<100;i++){try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await pause(100);}}
 const version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();result.browser=version.Browser;ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let seq=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('CDP_TIMEOUT')),10000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await call('Target.createTarget',{url:origin}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error('STORAGE_FIXTURE_EVALUATION_FAILED');return r.result.value;};
 await evaluate(`globalThis.writeBytes=async(id,size)=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('disposable',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise(resolve=>{const tx=db.transaction('records','readwrite');const data=new Uint8Array(size);for(let at=0;at<size;at+=65536)crypto.getRandomValues(data.subarray(at,Math.min(size,at+65536)));tx.objectStore('records').put(data,id);tx.oncomplete=()=>{db.close();resolve({state:'committed'});};tx.onabort=()=>{const name=tx.error?.name;db.close();resolve({state:'aborted',exceptionName:name});};});}`);
 result.cases.push({id:'ample-free-small-write',...(await evaluate('writeBytes("small",1024)'))});
 result.beforeQuota=await call('Storage.getUsageAndQuota',{origin},sessionId);
 await call('Storage.overrideQuotaForOrigin',{origin,quotaSize:1048576},sessionId);
 result.afterQuota=await call('Storage.getUsageAndQuota',{origin},sessionId);
 result.cases.push({id:'browser-quota-fault-with-ample-os-disk',...(await evaluate('writeBytes("quota",4*1024*1024)'))});
 result.afterFirstWrite=await call('Storage.getUsageAndQuota',{origin},sessionId);
 if(result.cases[1].state==='committed'){await pause(500);result.cases.push({id:'second-transaction-under-override',...(await evaluate('writeBytes("quota-second",4*1024*1024)'))});}
 await call('Storage.overrideQuotaForOrigin',{origin},sessionId);
 result.cases.push({id:'quota-restored-small-write',...(await evaluate('writeBytes("recovery",1024)'))});
 if(result.cases[0].state!=='committed'||result.cases.at(-1).state!=='committed')throw Error('SMALL_WRITE_ASSERTION_FAILED');if(!result.cases.some(c=>c.exceptionName==='QuotaExceededError')){result.state='blocked';result.code='QUOTA_FAULT_NOT_REPRODUCED';process.exitCode=1;}else result.state='passed';
}catch(e){result.code=String(e.message).slice(0,120);process.exitCode=1;}
finally{ws?.close();if(browser&&browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([new Promise(r=>browser.once('exit',r)),pause(2000)]);if(browser.exitCode===null)browser.kill('SIGKILL');}await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true,maxRetries:3});await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
