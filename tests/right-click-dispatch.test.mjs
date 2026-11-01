import test from 'node:test';
import assert from 'node:assert/strict';
import {worker} from './helpers/background-worker.mjs';
const profile={id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'redown',workerUrl:'https://worker.invalid',token:'fixture'};
function fixture(){
 const h=worker({profiles:[structuredClone(profile)],rightClickV3Migration:{version:1},rightClickV3:{version:1,revision:0,destinations:[]}}),saves=[],history=[];
 h.context.launchSaveDroplet=()=>{};h.context.notify=async()=>{};
 h.context.ingestCloudflareAtPrefix=async(p,url,prefix,name,receipt)=>{saves.push({profileId:p.id,bucket:p.bucketName,prefix,url});receipt.destination={accountId:p.accountId,bucketName:p.bucketName,key:'file'};receipt.bytes=1;return 'fixture receipt';};
 h.context.callBucketWorker=async()=>({object:{key:'file',size:1,etag:'fixture',customMetadata:{sourceUrl:saves.at(-1).url}}});h.context.recordTransfer=async r=>history.push(r);
 return {...h,saves,history};
}
const dispatch=(h,info)=>h.chrome.contextMenus.onClicked.listeners[0](info,{id:1,url:'https://page.invalid/'});
const message=(h,body)=>new Promise(resolve=>h.chrome.runtime.onMessage.listeners[0](body,{url:h.chrome.runtime.getURL('right-click-chooser.html')},resolve));
test('T01 T13 T14 T15 actual handler selects five Chrome source contexts and dispatches zero or one transfer',async()=>{
 const h=fixture();await h.ready();
 for(const info of [{linkUrl:'https://source.invalid/link'},{srcUrl:'https://source.invalid/image',mediaType:'image'},{srcUrl:'https://source.invalid/video',mediaType:'video'},{srcUrl:'https://source.invalid/audio',mediaType:'audio'},{pageUrl:'https://source.invalid/page'}]){
  const count=h.saves.length;await dispatch(h,{...info,menuItemId:'v3:provider:cloudflare'});assert.equal(h.saves.length,count+1);assert.equal(h.saves.at(-1).url,info.srcUrl||info.linkUrl||info.pageUrl);assert.equal(h.saves.at(-1).bucket,'redown');assert.equal(h.saves.at(-1).prefix,'');assert.equal(h.history.at(-1).verified,true);
 }
 for(const id of ['v3:missing','v3:provider:cloudflare:separator','redown-setup'])await dispatch(h,{menuItemId:id,linkUrl:'https://source.invalid/link'});
 assert.equal(h.saves.length,5);assert.ok(!h.calls.some(c=>c[0]==='tab'&&c[1].url.endsWith('beta/explorer.html')));
 h.local.profiles[0].token='';await dispatch(h,{menuItemId:'v3:provider:cloudflare',linkUrl:'https://source.invalid/link'});assert.equal(h.saves.length,5);
});
test('T24 authenticated chooser preserves original object, consumes intent once and rejects stale routes',async()=>{
 const h=fixture();await h.ready();
 await dispatch(h,{menuItemId:'v3:provider:cloudflare:more',linkUrl:'https://source.invalid/original'});
 const url=h.calls.find(c=>c[0]==='tab')[1].url,id=url.split('#')[1];assert.ok(id);
 const list=await message(h,{type:'rightClickChooserList',id});assert.equal(list.ok,true);assert.equal(list.entries.length,1);
 const chosen=await message(h,{type:'rightClickChooserSave',id,destinationId:list.entries[0].id});assert.equal(chosen.ok,true);assert.equal(h.saves.length,1);assert.equal(h.saves[0].url,'https://source.invalid/original');
 const again=await message(h,{type:'rightClickChooserSave',id,destinationId:list.entries[0].id});assert.equal(again.ok,false);assert.equal(h.saves.length,1);
});
