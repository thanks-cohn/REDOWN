// Local-only acceptance: real corpus -> bridge -> production API + Worker -> emulated R2.
// Does not use live credentials and never proves live-provider correctness.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createBridge} from '../tools/lab/bridge.mjs';
import {executeCommand} from '../extension/beta/lab.mjs';
import {fixture} from '../tests/helpers/beta-provider.mjs';
const root=process.cwd(),corpus=path.join(root,'test-fixtures/real-corpus');
const output=path.resolve(process.argv[2]||'work/lab-local-smoke');
if(fs.existsSync(output))throw Error('Use a fresh output directory; evidence is never overwritten');
const candidates=fs.readdirSync(corpus).filter(n=>n!=='manifest.json').map(n=>({name:n,size:fs.statSync(path.join(corpus,n)).size})).sort((a,b)=>a.size-b.size);
const extensions=new Set(),files=[];
for(const f of candidates){const ext=path.extname(f.name);if(extensions.has(ext)||f.size>100000)continue;const first=fs.readFileSync(path.join(corpus,f.name)).subarray(0,128).toString();if(first.startsWith('version https://git-lfs.github.com/spec/v1'))throw Error('Run git lfs pull before smoke');extensions.add(ext);files.push(f.name);if(files.length===24)break;}
if(files.length!==24)throw Error('Need 24 genuine small fixtures across formats');
const token=randomBytes(32).toString('hex'),extensionId='a'.repeat(32),f=await fixture();
const plan={provider:'cloudflare-r2',accountId:'fixture-account',bucketName:'disposable-fixture',destination:'redown-test-lab/local-real-corpus/',corpus,files,operations:['upload','download','copy','rename','move','delete'],operation_files:Object.fromEntries(['copy','rename','move','delete'].map(op=>[op,files.slice(0,2)])),max_files:24,max_bytes:2400000,evidence_mode:'LOCAL_PROVIDER_EMULATION'};
fs.mkdirSync(path.dirname(output),{recursive:true});const planFile=output+'.plan.json';fs.writeFileSync(planFile,JSON.stringify(plan,null,2));
const server=createBridge({root,token,extensionId});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const request=(route,options={})=>fetch(base+route,{...options,headers:{authorization:'Bearer '+token,origin:'chrome-extension://'+extensionId}});
let active=true,pumpError;
const pump=(async()=>{while(active){const {command}=await(await request('/next')).json();if(command){const result=await executeCommand(command,{api:f.api,request});await request('/result',{method:'POST',body:JSON.stringify(result)});}else await new Promise(r=>setTimeout(r,5));}})().catch(e=>pumpError=e);
await new Promise(r=>setTimeout(r,20));
const code=await new Promise(resolve=>{const p=spawn('python',['tools/lab/redown_lab.py','--port',String(server.address().port),'run','--plan',planFile,'--out',output],{env:{...process.env,REDOWN_LAB_TOKEN:token}});const log=fs.createWriteStream(output+'.stdout.json');p.stdout.pipe(log);p.stderr.pipe(process.stderr);p.on('exit',resolve);});
active=false;await pump;server.closeAllConnections();await new Promise(r=>server.close(r));if(pumpError)throw pumpError;
const summary=JSON.parse(fs.readFileSync(path.join(output,'summary.json'),'utf8'));
fs.writeFileSync(path.join(output,'local-provider.json'),JSON.stringify({evidence:'LOCAL_PROVIDER_EMULATION',genuine_cloud_uploads:0,genuine_cloud_downloads:0,unique_real_corpus_files:files.length,formats:extensions.size,remaining_objects:[...f.stored.keys()],counts:summary.counts},null,2));
console.log(JSON.stringify({output,code,files:files.length,counts:summary.counts,bytes:summary.bytes_transferred,cloud_transfers:0}));process.exitCode=code;
