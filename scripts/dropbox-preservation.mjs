/* Compare the captured pre-edit source and routes; never refresh frozen evidence. */
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const directory='docs/verification/dropbox/',before=JSON.parse(await readFile(directory+'before.json','utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
const old=path=>execFileSync('git',['show',before.commit+':'+path],{encoding:'utf8'});
const hashes={};for(const [path,hash] of Object.entries(before.hashes)){
 const actual=sha(await readFile(path));hashes[path]={before:hash,after:actual,identical:actual===hash,scope:path==='extension/google-drive-menu.js'?'authorized shared composition seam':'protected'};
 if(path!=='extension/google-drive-menu.js')assert.equal(actual,hash,path);
}
function load(source){const c=vm.createContext({TextEncoder});vm.runInContext(source,c);return c;}
const v3=load(await readFile('extension/right-click-v3.js','utf8')).RedownRightClickV3;
assert.equal(await readFile('extension/right-click-v3.js','utf8'),old('extension/right-click-v3.js'));
const originalGoogle=load(old('extension/google-drive-menu.js')).RedownGoogleDriveMenu;
const current=load(await readFile('extension/google-drive-menu.js','utf8'));vm.runInContext(await readFile('extension/dropbox-menu.js','utf8'),current);
const google=current.RedownGoogleDriveMenu,dropbox=current.RedownDropboxMenu,plans=[];
for(const x of before.cases){
 const projected=v3.project(x.state,x.profiles,x.options,x.inventory,'redown',x.at);
 assert.deepEqual(JSON.parse(JSON.stringify(projected)),x.before.projection);
 for(const route of x.before.routes){const r=v3.resolve(route.id,x.state,x.profiles,x.options,x.inventory,x.at);assert.deepEqual(r?JSON.parse(JSON.stringify({profileId:r.owner.id,accountId:r.profile.accountId,bucketName:r.profile.bucketName,prefix:r.prefix})):null,route.target);}
 for(const phase of ['connected','disconnected','reconnect'])for(const dropboxPhase of ['connected','connecting','disconnected','reconnect']){
  const root=[{id:'redown'},...projected.entries,{id:'redown-manage',parentId:'redown'}],state={phase,folderId:'folder'};
  const baseline=originalGoogle.compose(root,originalGoogle.fragment(state,'redown'),'redown');
  const withGoogle=google.compose(root,google.fragment(state,'redown'),'redown');assert.equal(JSON.stringify(withGoogle),JSON.stringify(baseline));
  const combined=google.composeSibling(withGoogle,dropbox.fragment({phase:dropboxPhase,root:'/',rootReady:true,accountId:'dbid:fixture',connectionId:'fixture'},'redown'),'redown');
  const filtered=combined.filter(e=>!dropbox.owns(e.id));assert.equal(JSON.stringify(filtered),JSON.stringify(baseline));
  plans.push({mode:x.options,variant:x.variant,google:phase,dropbox:dropboxPhase,originalPlanSHA256:sha(JSON.stringify(baseline)),filteredCandidateSHA256:sha(JSON.stringify(filtered)),routesSHA256:sha(JSON.stringify(x.before.routes)),identical:true});
 }
}
const background=await readFile('extension/background.js','utf8'),baselineBackground=old('extension/background.js'),routines={};
for(const name of ['ingestCloudflareAtPrefix','saveResolvedRightClick']){
 const extract=s=>{const start=s.indexOf('async function '+name+'(');assert.ok(start>=0);const tail=s.slice(start),end=tail.indexOf('\n}');assert.ok(end>0);return tail.slice(0,end+2);};
 const b=extract(baselineBackground),a=extract(background);assert.equal(a,b);routines[name]={before:sha(b),after:sha(a),identical:true};
}
await writeFile(directory+'after.json',JSON.stringify({baselineCommit:before.commit,scope:'Working-tree source and synthetic deterministic route replay; not installed-browser evidence',hashes,plans,routines},null,2)+'\n');
console.log(`${Object.values(hashes).filter(h=>h.scope==='protected').length} protected files unchanged; ${plans.length} original V3/Google plans and routes identical; two R2 routines unchanged. Shared composer-only diff is authorized and recorded separately.`);
