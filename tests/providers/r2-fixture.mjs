// Executes the real R2 HTTP adapter and Worker handler against an offline binding fixture.
// This proves transport contracts only, never live Cloudflare acceptance.
import worker from '../../worker/laboratory/index.mjs';
import {hash,createFileEngine} from '../../extension/file-engine/engine.mjs';
import {r2HttpAdapter} from '../../extension/file-engine/adapters/r2-http.mjs';
import {createFileSession} from '../../agent/files/api.mjs';
import {initialState} from '../../extension/file-engine/simulation.mjs';
export async function r2Fixture(){
 const objects=new Map();let revision=0;const metadata=o=>({...o,bytes:undefined});
 const bucket={async head(key){const o=objects.get(key);return o?metadata(o):null;},async get(key,{range}={}){const o=objects.get(key);if(!o)return null;const value=range?o.bytes.slice(range.offset,range.offset+range.length):o.bytes;return {...metadata(o),body:new Response(value).body};},
 async list({prefix,limit=50,cursor}){const offset=cursor?Number(cursor):0;if(!Number.isSafeInteger(offset)||offset<0)throw Error();const rows=[...objects.values()].filter(o=>o.key.startsWith(prefix)).sort((a,b)=>a.key<b.key?-1:1);return {objects:rows.slice(offset,offset+limit).map(metadata),truncated:rows.length>offset+limit,cursor:rows.length>offset+limit?String(offset+limit):undefined};},
 async put(key,bytes,{onlyIf,customMetadata,httpMetadata}){if(onlyIf.get('If-None-Match')==='*'&&objects.has(key))return null;const o={key,bytes:Uint8Array.from(bytes),size:bytes.length,etag:'etag-'+(++revision),version:String(revision),customMetadata,httpMetadata};objects.set(key,o);return metadata(o);}};
 const prefix='__redown_test__/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/',token='Bearer offline-fixture-only',env={B0:bucket,RUN_PREFIX:prefix,AUTH_SHA256:await hash(new TextEncoder().encode(token)),EXPIRES_AT:Date.now()+60000};
 const adapter=r2HttpAdapter({endpoint:'https://fixture.invalid/',authorization:token,prefix,fetcher:(url,options)=>worker.fetch(new Request(url,options),env)});
 const state=initialState(),store={read:async()=>structuredClone(state),update:async fn=>fn(state)},root={provider:'r2-lab',account:'lab',container:'test-1-new',key:prefix};
 const engine=createFileEngine({store,adapters:[adapter],authorize:r=>[r.source,r.destination].filter(Boolean).every(i=>i.provider===root.provider&&i.container===root.container&&i.key.startsWith(prefix))});
 const session=createFileSession({engine,scope:{locations:[root],operations:['list','read','metadata','upload','copy','delete','reconcile'],maxOperations:100}});
 return {engine,session,root,child:name=>({...root,key:prefix+name}),objects,adapter,env};
}
