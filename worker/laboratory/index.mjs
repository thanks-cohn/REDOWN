// Temporary R2 laboratory transport: four bindings, one leased run prefix, no production capability.
const names=['test-1-new','test-2-new','test-3-new','test-4-new'];
const error=(code,status=400)=>Object.assign(new Error(code),{code,status});
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
const encode=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const decode=text=>{if(typeof text!=='string'||text.length>2796208||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw error('INVALID_BYTES');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));};
async function bounded(body,max){if(!body)return new Uint8Array();const reader=body.getReader(),chunks=[];let total=0;try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>max)throw error('SIZE_LIMIT',413);chunks.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}const bytes=new Uint8Array(total);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}return bytes;}
const metadata=o=>({key:o.key,size:o.size,revision:o.version||o.etag,etag:o.etag,contentType:o.httpMetadata?.contentType||'application/octet-stream',folder:o.key.endsWith('/')});
export default {async fetch(request,env){let stage="request";try{
 if(request.method!=='POST')throw error('METHOD_NOT_ALLOWED',405);
 if(Date.now()>Number(env.EXPIRES_AT))throw error('LEASE_EXPIRED',403);
 const token=request.headers.get('authorization')||'';if(token.length>256||await sha(new TextEncoder().encode(token))!==env.AUTH_SHA256)throw error('UNAUTHORIZED',401);
 if(!/^__redown_test__\/[a-f0-9-]+\/$/.test(env.RUN_PREFIX))throw error('INVALID_CONFIGURATION',500);
 const body=JSON.parse(new TextDecoder().decode(await bounded(request.body,3*1024*1024))),index=names.indexOf(body.bucket);if(index<0)throw error('BUCKET_DENIED',403);const bucket=env['B'+index];if(!bucket)throw error('BINDING_MISSING',500);
 if(typeof body.key!=='string'||!body.key.startsWith(env.RUN_PREFIX)||new TextEncoder().encode(body.key).length>1024||/[\u0000-\u001f\\]/.test(body.key)||body.key.split('/').some(s=>s==='.'||s==='..'))throw error('SCOPE_DENIED',403);
 let result;
 if(body.method==='stat'){const o=await bucket.head(body.key);result=o?metadata(o):null;}
 else if(body.method==='list'){if(body.limit!==undefined&&(!Number.isInteger(body.limit)||body.limit<1||body.limit>1000))throw error('INVALID_LIMIT');const page=await bucket.list({prefix:body.key,limit:body.limit||50,...(body.cursor?{cursor:body.cursor}:{}),...(body.recursive?{}:{delimiter:'/'})});result={objects:page.objects.map(metadata),folders:page.delimitedPrefixes||[],cursor:page.truncated?page.cursor:null,complete:!page.truncated};}
 else if(body.method==='read'){const o=await bucket.get(body.key,{...(body.range?{range:body.range}:{})});if(!o)throw error('NOT_FOUND_OR_INACCESSIBLE',404);if(o.size>2097152)throw error('SIZE_LIMIT',413);const bytes=await bounded(o.body,2097152);result={metadata:metadata(o),bytesBase64:encode(bytes),sha256:await sha(bytes)};}
 else if(body.method==='create'||body.method==='ingest'){
  let bytes;
  if(body.method==='ingest'){const allowed=JSON.parse(env.FIXTURE_URLS||'[]');if(!allowed.includes(body.url))throw error('SOURCE_DENIED',403);stage='source.fetch';const remote=await fetch(body.url,{redirect:'manual',signal:AbortSignal.timeout(15000)});if(!remote.ok)throw error('SOURCE_HTTP_ERROR',502);stage='source.read';bytes=await bounded(remote.body,2097152);if(await sha(bytes)!==body.expectedSha256)throw error('SOURCE_HASH_MISMATCH',412);}
  else bytes=decode(body.bytesBase64);
  if(bytes.length>2097152)throw error('SIZE_LIMIT',413);
  stage='destination.write';const object=await bucket.put(body.key,bytes,{onlyIf:new Headers({'If-None-Match':'*'}),customMetadata:{redownLab:env.RUN_PREFIX},httpMetadata:{contentType:body.contentType||'application/octet-stream',cacheControl:'no-store'}});if(!object)throw error('CONFLICT',409);result=metadata(object);
 }
 else if(body.method==='cleanup'){const o=await bucket.head(body.key);if(!o)result={absent:true};else{if(o.customMetadata?.redownLab!==env.RUN_PREFIX||o.etag!==body.etag)throw error('OWNERSHIP_MISMATCH',412);await bucket.delete(body.key);if(await bucket.head(body.key))throw error('DELETE_UNCONFIRMED',409);result={absent:true};}}
 else throw error('UNSUPPORTED_OPERATION');
 return Response.json({ok:true,version:'1.0.0',result},{headers:{'cache-control':'no-store'}});
 }catch(e){return Response.json({ok:false,code:e.code||'TRANSPORT_FAILURE',stage,sourceError:stage==='source.fetch'?String(e.message||'').replace(/https?:\/\/\S+/g,'[public-source]').slice(0,180):undefined,errorType:['Error','TypeError','RangeError','TimeoutError','AbortError'].includes(e.name)?e.name:'Error'},{status:e.status||500,headers:{'cache-control':'no-store'}});}}};
