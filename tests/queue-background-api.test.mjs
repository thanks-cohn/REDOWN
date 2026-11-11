import test from 'node:test';
import assert from 'node:assert/strict';
import {worker} from './helpers/background-worker.mjs';
import {webcrypto} from 'node:crypto';
const send=(h,m,s={id:'test',url:h.chrome.runtime.getURL('shelf.html')+'#queue'})=>new Promise(resolve=>h.chrome.runtime.onMessage.listeners[0](m,s,resolve));
test('trusted Queue and bundle interfaces are local, bounded and reject foreign websites/frames',async()=>{
 const h=worker();await h.ready();let requests=0;h.context.fetch=async()=>{requests++;throw Error('Unexpected network');};
 for(const sender of [{id:'test',url:h.chrome.runtime.getURL('shelf.html'),frameId:2},{id:'foreign',url:h.chrome.runtime.getURL('shelf.html')},{id:'test',url:'https://host.invalid/shelf.html'},{id:'test',url:h.chrome.runtime.getURL('shelf.html/foreign')}])assert.equal((await send(h,{type:'transferQueueV1',operation:'list'},sender)).code,'UNTRUSTED_SENDER');
 const attemptId=webcrypto.randomUUID();h.local['dropbox:jobs']=[{id:webcrypto.randomUUID(),source:{attemptId},status:'queued',at:Date.now(),updatedAt:Date.now(),offset:0,total:null}];
 const before=JSON.stringify(h.local['dropbox:jobs']),list=await send(h,{type:'transferQueueV1',operation:'list'});assert.equal(list.ok,true);assert.equal(list.result.rows.find(r=>r.id===attemptId).state,'queued');
 const one=await send(h,{type:'transferQueueV1',operation:'get',input:{id:attemptId}});assert.equal(one.result.attemptId,attemptId);
 const actions=await send(h,{type:'transferQueueV1',operation:'eligibleActions',input:{id:attemptId}});assert.equal(actions.result.includes('retry'),false);
 assert.equal((await send(h,{type:'transferQueueV1',operation:'retry',input:{id:attemptId}})).code,'UNSUPPORTED_OPERATION');
 h.local.cloudflareAuth={accessToken:'SECRET_TOKEN',refreshToken:'SECRET_REFRESH'};
 const bundle=await send(h,{type:'diagnosticBundleV1',operation:'export'});assert.equal(bundle.ok,true);assert.equal(Object.keys(bundle.result.files).length,7);assert.doesNotMatch(JSON.stringify(bundle),/SECRET_TOKEN|SECRET_REFRESH/);assert.equal(requests,0);assert.equal(JSON.stringify(h.local['dropbox:jobs']),before);
});
