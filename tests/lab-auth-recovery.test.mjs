import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {authorizeLab} from '../extension/lab-session.mjs';
const source=await readFile(new URL('../extension/cloudflare-api.js',import.meta.url),'utf8');
function harness(fetcher,patch={}) {
 const state={cloudflareAuth:{accessToken:'OLD_SECRET',refreshToken:'REFRESH_SECRET',sessionId:'grant',expiresAt:Date.now()-1,...patch}};
 let queue=Promise.resolve();
 const context=vm.createContext({fetch:fetcher,Headers,FormData,AbortSignal,URLSearchParams,Date,setTimeout,
 chrome:{storage:{local:{get:async()=>structuredClone(state),set:async p=>Object.assign(state,p)}}},
 navigator:{locks:{request:(_name,fn)=>{const next=queue.catch(()=>{}).then(fn);queue=next;return next;}}}});
 vm.runInContext(source,context);return {state,api:context.RedownCloudflareApi};
}
const root={provider:'extension-r2',account:'a',container:'test-1-new',key:''};
test('simulated expiry rotates once across concurrent requests and retains lab authorization',async()=>{
 let refreshes=0,reads=0;
 const h=harness(async url=>{
  if(url.includes('oauth2/token')){refreshes++;return Response.json({access_token:'NEW_SECRET',refresh_token:'ROTATED_SECRET',expires_in:3600});}
  reads++;return new Response('ok');
 });
 const grant=authorizeLab({roots:[root],request:h.api.request,isCurrent:()=>h.state.cloudflareAuth.sessionId==='grant'});
 await Promise.all([h.api.request('/accounts'),h.api.request('/accounts')]);
 assert.equal(refreshes,1);assert.equal(reads,2);assert.equal(h.state.cloudflareAuth.refreshToken,'ROTATED_SECRET');
 assert.equal((await grant.query('describe')).state,'available');
});
test('missing refresh credential and rejected grant have precise codes and no mutation',async()=>{
 let calls=0;
 const missing=harness(async()=>{calls++;throw Error('unexpected');},{refreshToken:null});
 await assert.rejects(missing.api.request('/accounts'),{code:'OAUTH_REFRESH_UNAVAILABLE'});assert.equal(calls,0);
 const rejected=harness(async()=>{calls++;return Response.json({error:'invalid_grant',error_description:'PRIVATE'},{status:400});});
 await assert.rejects(rejected.api.request('/accounts'),{code:'OAUTH_REFRESH_REJECTED'});
 assert.equal(rejected.state.cloudflareAuth.reconnectRequired,true);
 await assert.rejects(rejected.api.request('/accounts'),{code:'OAUTH_REFRESH_REJECTED'});assert.equal(calls,1);
});
test('transient refresh failure retains credentials without claiming revocation',async()=>{
 const h=harness(async()=>new Response('',{status:503}));
 await assert.rejects(h.api.request('/accounts'),{code:'OAUTH_REFRESH_FAILED'});
 assert.equal(h.state.cloudflareAuth.reconnectRequired,undefined);assert.equal(h.state.cloudflareAuth.accessToken,'OLD_SECRET');
});
test('401 renews but does not replay a mutation; permission denial does not refresh',async()=>{
 let writes=0,refreshes=0;
 const h=harness(async url=>{if(url.includes('oauth2/token')){refreshes++;return Response.json({access_token:'new',expires_in:3600});}writes++;return new Response('',{status:401});},{expiresAt:Date.now()+3600000});
 assert.equal((await h.api.request('/objects',{method:'PUT',body:'payload'})).status,401);
 assert.equal(writes,1);assert.equal(refreshes,1);
 const denied=harness(async()=>new Response('',{status:403}),{expiresAt:Date.now()+3600000});
 assert.equal((await denied.api.request('/accounts')).status,403);
});
test('explicit local revoke, local expiry and provider replacement remain distinct',async()=>{
 let time=0,current=true;
 const g=authorizeLab({roots:[root],request:async()=>{},isCurrent:()=>current,clock:()=>time,ttl:10});
 current=false;assert.equal((await g.query('describe')).error.code,'PROVIDER_SESSION_CHANGED');
 current=true;time=10;assert.equal((await g.query('describe')).error.code,'LOCAL_SESSION_EXPIRED');
 g.revoke();assert.equal((await g.query('describe')).error.code,'AUTHORIZATION_REVOKED');
});
