import {fail,decode,encode,fileIdentity} from '../engine.mjs';
export const LAB_BUCKETS=Object.freeze(['test-1-new','test-2-new','test-3-new','test-4-new']);
export function r2HttpAdapter({endpoint,authorization,prefix,fetcher=fetch}){
 const url=new URL(endpoint);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))throw fail('INVALID_ENDPOINT');if(url.username||url.password||url.search||url.hash||!/^__redown_test__\/[a-f0-9-]+\/$/.test(prefix))throw fail('INVALID_CONFIGURATION');
 const adapter={id:'r2-lab',capabilities:{realProvider:true,identity:'exact-key',atomicCreate:true,atomicConditionalDelete:false,multipart:false,maxBytes:2097152,delete:'blocked: R2 binding has no atomic revision-conditioned delete'},assertIdentity(i){fileIdentity(i,{root:true});if(i.provider!=='r2-lab'||i.account!=='lab'||!LAB_BUCKETS.includes(i.container)||!i.key.startsWith(prefix))throw fail('SCOPE_DENIED');},
 async rpc(method,i,args={}){adapter.assertIdentity(i);let response;try{response=await fetcher(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{authorization,'content-type':'application/json'},body:JSON.stringify({method,bucket:i.container,key:i.key,...args})});}catch{throw fail('TRANSPORT_FAILURE');}let body;try{body=await response.json();}catch{throw fail('INVALID_PROVIDER_RESPONSE');}if(!response.ok||body.ok!==true)throw fail(/^[A-Z_]{1,64}$/.test(body.code)?body.code:'PROVIDER_ERROR',{status:response.status});return body.result;},
 async stat(i){return adapter.rpc('stat',i);},
 async list(i,{limit=50,cursor,query,sort,recursive=false}={}){if(query||sort&&sort!=='key-asc')throw fail('UNSUPPORTED_QUERY');const p=await adapter.rpc('list',i,{limit,cursor,recursive});if(!p||!Array.isArray(p.objects)||typeof p.complete!=='boolean')throw fail('INVALID_PROVIDER_RESPONSE');return {...p,objects:[...p.objects.map(o=>({...i,...o})),...(p.folders||[]).map(key=>({...i,key,size:0,folder:true,implicit:true}))].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0)};},
 async read(i,{range}={}){const r=await adapter.rpc('read',i,{range});return {metadata:{...i,...r.metadata},bytes:decode(r.bytesBase64)};},
 async create(i,bytes,{metadata}={}){if(bytes.length>2097152)throw fail('SIZE_LIMIT');return adapter.rpc('create',i,{bytesBase64:encode(bytes),contentType:metadata?.contentType});},
 async delete(){throw fail('UNSUPPORTED_ATOMIC_DELETE');},
 async ingest(i,{url,expectedSha256,contentType}){return adapter.rpc('ingest',i,{url,expectedSha256,contentType});}
 };return adapter;
}
