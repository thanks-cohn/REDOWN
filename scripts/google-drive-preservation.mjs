/* Supplemental immutable-baseline replay; never refresh historical evidence. */
import vm from 'node:vm';import {readFile,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const baseline='b1c2c162ed207513cbc18c9b4e7494ad1f5e46f8';
const old=execFileSync('git',['show',baseline+':extension/right-click-v3.js'],{encoding:'utf8'}),current=await readFile('extension/right-click-v3.js','utf8');assert.equal(current,old);
const model=source=>{const c=vm.createContext({TextEncoder,setTimeout,clearTimeout});vm.runInContext(source,c);return c.RedownRightClickV3;};
const before=model(old),after=model(current),at=2000000;
const profiles=[{id:'primary',type:'cloudflare-r2',accountId:'account-a',bucketName:'redown',workerUrl:'https://fixture.invalid',token:'synthetic'},{id:'media',type:'cloudflare-r2',accountId:'account-b',bucketName:'media',workerUrl:'https://fixture.invalid',token:'synthetic'}];
const state={version:1,revision:3,destinations:profiles.flatMap(p=>[{id:p.id+'-root',profileId:p.id,accountId:p.accountId,bucketName:p.bucketName,parentId:null,prefix:'',label:p.bucketName,enabled:true},{id:p.id+'-images',profileId:p.id,accountId:p.accountId,bucketName:p.bucketName,parentId:p.id+'-root',prefix:'images/png',label:'Images',enabled:true}]),levelScopes:{version:1,revision:1,buckets:profiles.map(p=>({id:p.id,profileId:p.id,accountId:p.accountId,bucketName:p.bucketName,enabled:true}))}};
const cases=[];
for(const options of [{style:'simple'},{style:'nested',nested:'narrow',depth:1},{style:'nested',nested:'level',depth:2}]){
 const inventory=options.nested==='level'?await before.discover(state,profiles,options,async(a,b,p)=>({objects:[],delimited:p===''?['images/']:p==='images/'?['images/png/']:[]}),()=>at):null;
 for(const variant of ['active','no-profiles','unactivated']){
  const ps=variant==='no-profiles'?[]:profiles,s=variant==='unactivated'?{...state,activatedBuckets:{buckets:profiles.map(p=>({profileId:p.id,accountId:p.accountId,bucketName:p.bucketName,enabled:false}))}}:state;
  const snapshot=m=>{const projection=m.project(s,ps,options,inventory,'redown',at);return {projection,routes:projection.entries.map(e=>{const r=m.resolve(e.id,s,ps,options,inventory,at);return {id:e.id,action:r?'remote-save':null,target:r?{profileId:r.owner.id,accountId:r.profile.accountId,bucketName:r.profile.bucketName,prefix:r.prefix}:null};})};};
  const b=JSON.parse(JSON.stringify(snapshot(before))),a=JSON.parse(JSON.stringify(snapshot(after)));assert.deepEqual(a,b);cases.push({variant,state:s,profiles:ps,options,inventory,at,before:b,after:a,identical:true});
 }
}
assert.ok(cases.find(c=>c.options.nested==='level'&&c.variant==='active').before.routes.some(r=>r.target?.prefix==='images/png'));
await writeFile('docs/verification/google-drive/mode-parity.json',JSON.stringify({scope:'Supplemental replay of immutable Git baseline and candidate, including multi-account active Depth inventory',baseline,cases},null,2)+'\n');console.log('9 active/empty/unactivated mode snapshots and all resolved actions identical.');
