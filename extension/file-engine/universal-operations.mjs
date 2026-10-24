// Operation primitives for API 0.3, under the existing coordinator's journal/state/authorization lifecycle.
import {modelFor} from './provider-contract.mjs';
import {fail,hash,decode,encode} from './engine.mjs';
export async function performUniversal(r,{source:a,destination:b,check,beforeWrite,verified,checkpoint,authorize}){
 const sm=a&&modelFor(a),dm=b&&modelFor(b);
 const allowed=async(source,destination)=>{if(!await authorize({...r,source,destination}))throw fail('AUTHORIZATION_DENIED');};
 const read=async(adapter,id)=>{const value=await adapter.read(id);if(!(value.bytes instanceof Uint8Array)||value.bytes.length>2097152||value.bytes.length!==value.metadata?.size||!modelFor(adapter).matchesMetadata(value.metadata,id)||value.metadata.revision===undefined)throw fail('INVALID_PROVIDER_RESPONSE');return {...value,sha256:await hash(value.bytes)};};
 const remember=async value=>{verified.push(value);await checkpoint();};
 if(r.operation==='metadata'){const m=await a.stat(r.source);if(!m)throw fail('NOT_FOUND_OR_INACCESSIBLE');return m;}
 if(r.operation==='list'){
  const p=await a.list(r.source,{limit:r.limit||50,cursor:r.cursor,query:r.query,sort:r.sort});
  if(!p||!Array.isArray(p.objects)||p.objects.length>(r.limit||50)||typeof p.complete!=='boolean')throw fail('INVALID_PROVIDER_RESPONSE');
  for(const m of p.objects){const identity=sm.identity(m,r.source);a.assertIdentity(identity);if(!await sm.contains(r.source,identity)||!Number.isSafeInteger(m.size)||m.size<0)throw fail('INVALID_PROVIDER_RESPONSE');}
  return {...p,objects:p.objects.map(m=>({...m,identity:sm.identity(m,r.source)}))};
 }
 if(r.operation==='read'){
  if(r.range){const value=await a.read(r.source,{range:r.range});if(!(value.bytes instanceof Uint8Array)||!sm.matchesMetadata(value.metadata,r.source)||value.bytes.length!==Math.min(r.range.length,Math.max(0,value.metadata.size-r.range.offset)))throw fail('INVALID_PROVIDER_RESPONSE');return {...value.metadata,bytesBase64:encode(value.bytes),sha256:await hash(value.bytes)};}
  const value=await read(a,r.source);return {...value.metadata,bytesBase64:encode(value.bytes),content:new TextDecoder().decode(value.bytes),sha256:value.sha256};
 }
 if(['upload','mkdir','ingest'].includes(r.operation)){
  const dest=r.operation==='mkdir'&&dm.directory?dm.directory(r.destination):r.destination;
  if(await b.stat(dest))throw fail('CONFLICT');await check();await allowed(undefined,dest);beforeWrite();
  if(r.operation==='mkdir'){const m=b.createDirectory?await b.createDirectory(dest):await b.create(dest,new Uint8Array(),{});const actual=dm.identity(m,dest);const fresh=await b.stat(actual);if(!fresh?.folder)throw fail('VERIFICATION_DISAGREEMENT');await remember({destination:actual,revision:fresh.revision,size:0,sha256:await hash(new Uint8Array()),kind:'directory'});return {objects:[fresh],identity:actual};}
  if(r.operation==='ingest'){if(!b.ingest)throw fail('PROVIDER_OPERATION_UNSUPPORTED');await b.ingest(dest,{url:r.url,expectedSha256:r.expectedSha256,contentType:r.metadata?.contentType});}
  const bytes=r.operation==='ingest'?null:r.bytesBase64!==undefined?decode(r.bytesBase64):new TextEncoder().encode(r.content);
  const created=bytes?await b.create(dest,bytes,{metadata:r.metadata,idempotencyKey:r.idempotencyKey}):await b.stat(dest),actual=dm.identity(created,dest),fresh=await read(b,actual),expected=bytes?await hash(bytes):r.expectedSha256;
  if(fresh.sha256!==expected)throw fail('VERIFICATION_DISAGREEMENT');await remember({destination:actual,revision:fresh.metadata.revision,size:fresh.bytes.length,sha256:expected});return {objects:[fresh.metadata],identity:actual,sha256:expected};
 }
 if(r.operation==='delete'){
  const m=await a.stat(r.source);if(!m)throw fail('NOT_FOUND_OR_INACCESSIBLE');if(m.folder)throw fail('PROVIDER_OPERATION_UNSUPPORTED');await check();await allowed(r.source,undefined);beforeWrite();await a.delete(r.source,{revision:m.revision});if(await a.stat(r.source))throw fail('DELETE_UNCONFIRMED');return {deleted:[m]};
 }
 if(!['copy','move','rename'].includes(r.operation))throw fail('PROVIDER_OPERATION_UNSUPPORTED');
 const first=await a.stat(r.source);if(!first)throw fail('NOT_FOUND_OR_INACCESSIBLE');
 if(a.id===b.id&&await sm.contains(r.source,r.destination))throw fail('SELF_TARGET');
 if(first.folder&&r.operation!=='copy')throw fail('PROVIDER_OPERATION_UNSUPPORTED');
 let count=0;const copied=[];
 const copyNode=async(source,destination,metadata,depth=0)=>{
  if(++count>1000||depth>32)throw fail('CAPACITY');await check();await allowed(source,destination);
  if(await b.stat(destination))throw fail('CONFLICT');
  if(metadata.folder){
   beforeWrite();const created=b.createDirectory?await b.createDirectory(destination):await b.create(destination,new Uint8Array(),{}),actual=dm.identity(created,destination),folder=await b.stat(actual);if(!folder?.folder)throw fail('VERIFICATION_DISAGREEMENT');
   let cursor;const seen=new Set();do{const page=await a.list(source,{limit:100,cursor});if(!Array.isArray(page.objects)||page.objects.length>100||typeof page.complete!=='boolean')throw fail('INVALID_PROVIDER_RESPONSE');for(const child of page.objects){const identity=sm.identity(child,source);a.assertIdentity(identity);if(!await sm.contains(source,identity)||sm.same(identity,source))throw fail('INVALID_PROVIDER_RESPONSE');await copyNode(identity,dm.child(actual,sm.name(child),child.folder),child,depth+1);}cursor=page.cursor;if(cursor&&seen.has(cursor))throw fail('INVALID_CURSOR');seen.add(cursor);}while(cursor);
   copied.push(folder);return;
  }
  const src=await read(a,source);if(String(src.metadata.revision)!==String(metadata.revision))throw fail('SOURCE_CHANGED');beforeWrite();const created=await b.create(destination,src.bytes,{metadata:{contentType:src.metadata.contentType},idempotencyKey:r.idempotencyKey}),actual=dm.identity(created,destination),dest=await read(b,actual);if(dest.sha256!==src.sha256)throw fail('VERIFICATION_DISAGREEMENT');await remember({source,destination:actual,sourceRevision:src.metadata.revision,revision:dest.metadata.revision,sha256:dest.sha256,size:dest.bytes.length});copied.push(dest.metadata);
 };
 await copyNode(r.source,first.folder&&dm.directory?dm.directory(r.destination):r.destination,first);
 if(r.operation!=='copy')for(const item of verified){await check();await allowed(item.source,item.destination);const dest=await read(b,item.destination);if(dest.sha256!==item.sha256||String(dest.metadata.revision)!==String(item.revision))throw fail('DESTINATION_CHANGED');const src=await a.stat(item.source);if(!src||String(src.revision)!==String(item.sourceRevision))throw fail('SOURCE_CHANGED');await a.delete(item.source,{revision:item.sourceRevision});if(await a.stat(item.source))throw fail('DELETE_UNCONFIRMED');}
 return {objects:copied,sourceRetained:r.operation==='copy'};
}
