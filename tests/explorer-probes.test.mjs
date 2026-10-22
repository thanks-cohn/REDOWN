import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto,randomUUID} from 'node:crypto';
import vm from 'node:vm';
import {createCollector,createExplorerAPI} from '../agent/explorer/api.mjs';
import '../extension/explorer-diagnostics-bridge.js';
const bg=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const target={accountId:'private-account',bucketName:'private-bucket'};
function probeHarness({badBinding=false,missingFlag=false,legacy=false,directStatus=200,proxyStatus=200}={}){
 const collector=createCollector({context:'background'});collector.setEnabled(true);
 const calls=[],profile={...target,type:'cloudflare-r2',workerUrl:'https://fixture.workers.dev',token:'PRIVATE_TOKEN',scriptName:'private-script'};
 const bridge={collector,event(id,stage,outcome,details){collector.record(id,{stage,outcome,component:'background',...details});},wire:async trace=>trace,workerEvents(){}};
 const context=vm.createContext({TextEncoder,URL,crypto:webcrypto,RedownExplorerDiagnostics:globalThis.RedownExplorerDiagnostics,redownExplorerBridge:bridge,
  getProfiles:async()=>[profile],
  cfJson:async(path,options)=>{calls.push({kind:'settings',options});return {bindings:[{type:'r2_bucket',name:'STORAGE',bucket_name:badBinding?'different':target.bucketName}],compatibility_flags:missingFlag?[]:['global_fetch_strictly_public']};},
  cfFetch:async(path,options)=>{calls.push({kind:'api',options});return new Response('x',{status:200});},
  RedownCloudflareApi:{boundedFetch:async(url,options)=>{calls.push({kind:'direct',options});assert.equal(options.method,'HEAD');assert.equal(options.redirect,'manual');return new Response(null,{status:directStatus});}},
  callBucketWorker:async(profile,body,allowRepair)=>{calls.push({kind:body.action,allowRepair});assert.equal(allowRepair,false);return body.action==='capabilities'?{ok:true,readOnlyProbe:!legacy}:{ok:true,readOnly:true,status:proxyStatus};},
  preparedProfile(){throw Error('PROVISIONING FORBIDDEN');},provisionCloudflareProfile(){throw Error('PROVISIONING FORBIDDEN');}
 });
 vm.runInContext(bg.slice(bg.indexOf('let explorerProbeRunning='),bg.indexOf('async function transferExplorerObjects(')),context);
 return {context,collector,calls,profile,input:{source:target,destination:target,key:'nested//雪 #?%.txt'}};
}
test('explicit probe compares provider, API, direct and destination-Worker paths without writes or private export',async()=>{
 const h=probeHarness(),result=await h.context.probeExplorerSource(h.input);
 assert.equal(result.state,'available');assert.equal(result.data.readOnly,true);assert.equal(result.data.checks.length,5);assert.ok(result.data.checks.every(c=>c.state==='passed'));
 assert.equal(h.calls.filter(c=>c.kind==='probeSource').length,1);
 assert.doesNotMatch(JSON.stringify({result,bundle:h.collector.exportBundle()}),/private-account|private-bucket|PRIVATE_TOKEN|private-script|雪|workers.dev/);
});
test('probe flags incorrect provider bindings and routing configuration; proxy 404 never means automatic missing-object repair',async()=>{
 const h=probeHarness({badBinding:true,missingFlag:true,proxyStatus:404});const result=await h.context.probeExplorerSource(h.input);
 assert.equal(result.state,'partial');assert.equal(result.data.checks[0].bindingMatches,false);assert.equal(result.data.checks[0].publicFetchEnabled,false);assert.equal(result.data.checks.at(-1).status,404);assert.equal(result.data.diagnosis.rootCause,'unknown');
});
test('legacy Worker lacks proxy capability explicitly; no speculative transfer or deployment occurs',async()=>{
 const h=probeHarness({legacy:true});const result=await h.context.probeExplorerSource(h.input);assert.equal(result.state,'partial');assert.equal(result.data.checks.at(-1).state,'unsupported');assert.ok(!h.calls.some(c=>c.kind==='probeSource'));
});
test('probe requires Debug, exact bounded file input and configured workers.dev endpoints',async()=>{
 const h=probeHarness();h.collector.setEnabled(false);await assert.rejects(h.context.probeExplorerSource(h.input),/Debug/);assert.equal(h.calls.length,0);
 h.collector.setEnabled(true);await assert.rejects(h.context.probeExplorerSource({...h.input,key:'x'.repeat(1025)}),/Choose/);
 h.profile.workerUrl='https://attacker.invalid';await assert.rejects(h.context.probeExplorerSource(h.input),/saved workers.dev/);assert.equal(h.calls.length,0);
});
test('probe stops scheduling reads after clear or disable and rejects concurrent invocations',async()=>{
 const h=probeHarness();let release,entered;const started=new Promise(r=>{entered=r;});h.context.cfJson=async()=>new Promise(r=>{release=r;entered();});const first=h.context.probeExplorerSource(h.input);await started;
 await assert.rejects(h.context.probeExplorerSource(h.input),/already running/);h.collector.setEnabled(false);release({bindings:[],compatibility_flags:[]});await assert.rejects(first,/cleared or disabled/);assert.equal(h.calls.length,0);
});
test('diagnosis does not confuse different files or descendants with identity drift; explicit same-item mismatch is detected',async()=>{
 const c=createCollector();c.setEnabled(true);const id=c.begin('copy'),child=c.begin('copy',{parentId:id});
 await c.identity(id,target,'file-a',{requestId:randomUUID()});await c.identity(id,target,'file-b',{requestId:randomUUID()});await c.identity(child,target,'file-c');
 assert.ok(!c.diagnose(id).findings.some(f=>f.code==='EXPLORER_SOURCE_KEY_MISMATCH'));
 const requestId=randomUUID(),expectedKey=await c.fingerprint('key','file-a');await c.identity(child,target,'wrong',{requestId,expectedKey});
 const finding=c.diagnose(id).findings.find(f=>f.code==='EXPLORER_SOURCE_KEY_MISMATCH');assert.equal(finding.evidence[0].operationId,child);
});
test('expired diagnoses are unavailable; unknown smoke and connectors cannot imply implemented support',()=>{
 let now=0;const c=createCollector({now:()=>now});c.setEnabled(true);const id=c.begin('copy');now=86400001;assert.equal(c.diagnose(id).status,'unavailable');
 const api=createExplorerAPI();assert.equal(api.query('getSmokePlan',{preset:'arbitrary shell'}).error.code,'UNKNOWN_SMOKE_PRESET');assert.equal(api.query('getSmokePlan',{preset:'transfers'}).data.remoteExecution,false);assert.equal(api.query('getConnectorCapabilities').data.find(c=>c.id==='github').state,'planned');
});
test('provisioning includes explicit public Worker fetch compatibility without weakening verified transfers',()=>{
 const start=bg.indexOf('  const metadata = {',bg.indexOf('const scriptName = existing?.scriptName'));
 const context=vm.createContext({accountId:'a',bucketName:'b',explorerOnly:true,existing:null});
 vm.runInContext(bg.slice(start,bg.indexOf('  const form = new FormData();',start))+'\nglobalThis.metadata=metadata;',context);
 assert.ok(context.metadata.compatibility_flags.includes('global_fetch_strictly_public'));
 assert.equal(context.metadata.bindings.find(b=>b.name==='STORAGE').bucket_name,'b');
});

test('a multi-file 404 cannot borrow an unrelated preview success to imply path divergence',async()=>{
 const c=createCollector();c.setEnabled(true);const id=c.begin('copy'),preview=c.begin('preview');
 await c.identity(id,target,'a');await c.identity(id,target,'b');await c.identity(preview,target,'a');c.finish(preview,'confirmed');
 c.record(id,{stage:'source.read',component:'worker',status:404,outcome:'failed'});
 assert.ok(!c.diagnose(id).findings.some(f=>f.code==='API_WORKER_PATH_DIVERGENCE'));
 const requestId=randomUUID();await c.identity(id,target,'b',{requestId});c.record(id,{stage:'source.read',component:'worker',status:404,outcome:'failed',requestId});
 assert.ok(!c.diagnose(id).findings.some(f=>f.code==='API_WORKER_PATH_DIVERGENCE'));
});
