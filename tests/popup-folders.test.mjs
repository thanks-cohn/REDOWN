import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('background ingest honors explicit root/deep prefixes and preserves the legacy category route',async()=>{
 const bg=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');const start=bg.indexOf('if (message?.type === "ingest")'),end=bg.indexOf('if (message?.type',start+10),snippet=bg.slice(start,end);let result;const calls=[];
 const c=vm.createContext({message:null,getProfiles:async()=>[{id:'a',type:'cloudflare-r2'}],cleanExplorerPrefix:x=>x,ingestCloudflareAtPrefix:async(...args)=>{calls.push({kind:'prefix',args});return 'stored';},ingest:async(...args)=>{calls.push({kind:'category',args});return 'stored';},recordTransfer:async()=>{},sendResponse:r=>result=r});
 for(const prefix of ['', 'works/...2/雪 #?%/']){c.message={type:'ingest',profileId:'a',prefix};await vm.runInContext('(async()=>{'+snippet+'})()',c);assert.equal(result.ok,true);assert.equal(calls.at(-1).kind,'prefix');assert.equal(calls.at(-1).args[2],prefix);}
 c.message={type:'ingest',profileId:'a',category:'files'};await vm.runInContext('(async()=>{'+snippet+'})()',c);assert.equal(calls.at(-1).kind,'category');
});

test('legacy Worker cannot silently normalize an exact destination before capability verification',async()=>{
 const bg=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');let writes=0,exact=false;
 const c=vm.createContext({preparedProfile:async()=>({workerUrl:'https://fixture.invalid'}),cleanExplorerPrefix:x=>x,callBucketWorker:async()=>({exactIngestPaths:exact}),fetch:async(url,options)=>{writes++;const body=JSON.parse(options.body);assert.equal(body.exactFolder,true);return {ok:true,text:async()=>JSON.stringify({ok:true,key:body.folder+'/photo.png',publicUrl:'stored'})};}});
 vm.runInContext(bg.slice(bg.indexOf('async function ingestCloudflareAtPrefix('),bg.indexOf('async function ingestCloudflare(')),c);
 await assert.rejects(c.ingestCloudflareAtPrefix({},'https://fixture.invalid/photo','雪 #?%//deep/','photo.png'),{code:'EXPLORER_WORKER_CAPABILITY_MISMATCH'});assert.equal(writes,0);
 exact=true;assert.equal(await c.ingestCloudflareAtPrefix({},'https://fixture.invalid/photo','雪 #?%//deep/','photo.png'),'stored');assert.equal(writes,1);
});
