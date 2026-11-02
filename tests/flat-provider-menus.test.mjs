import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {worker,config} from './helpers/background-worker.mjs';
const providers=['google-drive','dropbox','onedrive'];
const retired=['provider:google-drive:connect','provider:google-drive:save-redown','provider:dropbox:connect','provider:onedrive:connect','provider:onedrive:save-root'];
const plain=x=>JSON.parse(JSON.stringify(x));
function assertFlat(w){
 const rows=[...w.native.values()];
 for(const p of providers){
  const id='provider:'+p;
  assert.equal(rows.filter(e=>e.id===id).length,1);
  assert.equal(w.native.get(id).parentId,'redown');
  assert.equal(rows.filter(e=>e.parentId===id).length,0);
 }
 assert.deepEqual(rows.filter(e=>e.parentId==='redown').map(e=>e.id),
  ['v3:provider:cloudflare',...providers.map(p=>'provider:'+p),'redown-manage']);
 assert.ok(!w.calls.some(c=>c[0]==='removeAll'));
}
test('flat native rows across all state combinations preserve Cloudflare projection and settings',async()=>{
 const w=worker();await w.ready();await w.rebuild();
 const cloud=()=>plain([...w.native.values()].filter(e=>e.id.startsWith('v3:')));
 const baseline=cloud(),settings=plain(w.local.rightClickV3);
 for(const google of ['connected','disconnected','connecting','reconnect','expired'])
 for(const dropbox of ['connected','disconnected','connecting','reconnect','expired'])
 for(const onedrive of ['connected','disconnected','connecting','reconnect','expired']){
  w.local.googleDriveState={phase:google,folderId:'folder'};
  w.local['dropbox:state']={phase:dropbox,rootReady:true,root:'/',accountId:'dbid:a',connectionId:'c'};
  w.local['onedrive:state']={phase:onedrive,rootReady:true,accountId:'a',driveId:'d',rootId:'r',connectionId:'c'};
  await w.rebuild();assertFlat(w);assert.deepEqual(cloud(),baseline);
  for(const [p,phase] of providers.map((p,i)=>[p,[google,dropbox,onedrive][i]]))assert.equal(w.native.get('provider:'+p).enabled,phase!=='connecting');
 }
 assert.deepEqual(plain(w.local.rightClickV3),settings);
});
test('upgrade retires every old child with missing or persisted ID cache, removal failure and restart',async()=>{
 for(const cache of [false,true]){
  const old=worker();await old.ready();await old.rebuild();
  const native=[...old.native,...retired.map(id=>[id,{id,parentId:id.slice(0,id.lastIndexOf(':')),title:'Old action'}])];
  const local=structuredClone(old.local);
  if(cache)local.rightClickNativeIds=native.map(([id])=>id);else delete local.rightClickNativeIds;
  const failure={nativeEntries:native,removeId:retired[0]},w=worker(local,failure);
  await w.ready();await assert.rejects(w.rebuild());
  assert.equal(w.local.rightClickMenuStatus.state,'failed');
  assert.ok(w.native.has('redown'));assert.ok(w.native.has('redown-manage'));
  const next=worker(structuredClone(w.local),{nativeEntries:[...w.native]});await next.ready();await next.rebuild();
  assertFlat(next);for(const id of retired)assert.equal(next.native.has(id),false);
  assert.equal(next.local.rightClickMenuStatus.state,'registered');
  const again=worker(structuredClone(next.local),{nativeEntries:[...next.native]});await again.ready();await again.rebuild();assertFlat(again);
 }
});
test('Google direct action selects save/connect; busy and retired IDs create no jobs',async()=>{
 const w=worker();await w.ready();const jobs=[];
 w.chrome.tabs.query=async()=>[];w.chrome.tabs.create=async()=>{};
 w.chrome.storage.session.set=async v=>jobs.push(...Object.values(v));
 const p=w.context.RedownGoogleDriveProvider;
 for(const phase of ['connected','disconnected','reconnect','expired']){
  w.local.googleDriveState={phase,folderId:'folder'};
  await p.dispatch({menuItemId:'provider:google-drive',srcUrl:'https://source.invalid/media.png',linkUrl:'https://source.invalid/link'});
  assert.equal(jobs.at(-1).action,phase==='connected'?'save':'connect');assert.equal(jobs.at(-1).sourceUrl,'https://source.invalid/media.png');
 }
 const count=jobs.length;w.local.googleDriveState={phase:'connecting'};
 for(const id of ['provider:google-drive',...retired])await p.dispatch({menuItemId:id});assert.equal(jobs.length,count);
});
test('OneDrive direct state routing preserves exact source and revalidation; obsolete actions never connect or save',async()=>{
 let connects=0,uploads=0,checks=0;const local={};
 const chrome={storage:{local:{get:async key=>({[key]:local[key]}),set:async v=>Object.assign(local,v)}}};
 const c=vm.createContext({chrome,crypto:{randomUUID:()=> 'job'},AbortController,
  RedownOneDriveAuth:{create:()=>({connect:async()=>{connects++;},ready:async()=>{checks++;return {accountId:'a',driveId:'d',rootId:'r'};}})},
  RedownOneDriveAPI:{create:()=>({upload:async source=>{uploads++;assert.equal(source.url,'https://source.invalid/media');return {name:'media',itemId:'i',bytes:1};}}),sourceSnapshot:info=>({url:info.srcUrl})}});
 for(const file of ['onedrive-menu.js','onedrive-provider.js'])vm.runInContext(readFileSync('extension/'+file,'utf8'),c);
 const p=c.RedownOneDriveProvider.create();
 for(const phase of ['disconnected','reconnect','expired','connecting','connected']){
  local['onedrive:state']={phase};await p.dispatch({menuItemId:'provider:onedrive',srcUrl:'https://source.invalid/media'});await new Promise(r=>setImmediate(r));
 }
 assert.equal(connects,3);assert.equal(checks,1);assert.equal(uploads,1);
 for(const id of ['provider:onedrive:connect','provider:onedrive:save-root'])await p.dispatch({menuItemId:id});
 assert.equal(connects,3);assert.equal(uploads,1);assert.equal(local['onedrive:transfer'].code,'ONEDRIVE_STALE_MENU');
});
