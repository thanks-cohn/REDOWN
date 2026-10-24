// Independent reference adapter for an owner-exclusive Linux sandbox, not a general host mount.
// External concurrent directory replacement is outside this fixture's trust contract.
import {lstat,realpath,readdir,open,mkdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,sep} from 'node:path';
import {pathModel,OPTIONAL_FEATURES} from '../provider-contract.mjs';
const fail=code=>Object.assign(Error(code),{code});
export async function localReferenceAdapter(directory){
 if(process.platform!=='linux')throw fail('REFERENCE_PLATFORM_UNSUPPORTED');
 const root=await realpath(directory),id='local-reference';
 const assertIdentity=i=>{pathModel.validate(i);if(i.provider!==id||i.account!=='owner'||i.container!=='sandbox')throw fail('SCOPE_DENIED');};
 const identity=key=>({provider:id,account:'owner',container:'sandbox',key});
 const target=async i=>{assertIdentity(i);const path=resolve(root,i.key);if(path!==root&&!path.startsWith(root+sep))throw fail('SCOPE_DENIED');let cursor=root;for(const part of i.key.split('/').filter(Boolean)){cursor=resolve(cursor,part);try{if((await lstat(cursor)).isSymbolicLink())throw fail('SYMLINK_DENIED');}catch(e){if(e.code==='ENOENT')break;throw e;}}return path;};
 const stat=async i=>{try{const s=await lstat(await target(i),{bigint:true});if(!s.isDirectory()&&!s.isFile())throw fail('SPECIAL_FILE_DENIED');return {...identity(i.key),size:s.isDirectory()?0:Number(s.size),folder:s.isDirectory(),revision:`${s.dev}-${s.ino}-${s.size}-${s.mtimeNs}`,contentType:'application/octet-stream',modifiedAt:new Date(Number(s.mtimeMs)).toISOString()};}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const adapter={id,assertIdentity,identityModel:pathModel,capabilities:{realProvider:true,atomicCreate:true,atomicConditionalDelete:false,maxBytes:2097152},
 manifest:{contractVersion:'1.0.0',provider:id,realProvider:true,identity:{model:'sandbox-relative-key',directories:'native',root:{key:''}},features:{...Object.fromEntries(OPTIONAL_FEATURES.map(k=>[k,false])),nativeDirectories:true,caseSensitive:true,pagination:true,rangeReads:true,conditionalWrites:true,timestamps:true,metadataRead:true},checksums:['sha256-client-readback'],authentication:['owner-process'],consistency:'Owner-exclusive Linux reference sandbox; external directory replacement forbidden',limits:{maxBytes:2097152},operations:{list:'implemented',metadata:'implemented',read:'implemented',upload:'implemented',mkdir:'implemented',copy:'coordinator',move:'unsupported',rename:'unsupported',delete:'unsupported',ingest:'unsupported',sync:'unsupported',trash:'unsupported',restore:'unsupported'}},stat,
 async list(i,{limit=50,cursor,query='',sort='key-asc',recursive=false}={}){
  if(recursive)throw fail('PROVIDER_OPERATION_UNSUPPORTED');const parent=await stat(i);if(!parent?.folder)throw fail('NOT_A_DIRECTORY');let offset=0;if(cursor){let c;try{c=JSON.parse(cursor);}catch{throw fail('INVALID_CURSOR');}if(c.key!==i.key||c.revision!==parent.revision||c.query!==query||c.sort!==sort)throw fail('STALE_CURSOR');offset=c.offset;if(!Number.isSafeInteger(offset)||offset<0)throw fail('INVALID_CURSOR');}
  const entries=(await readdir(await target(i),{withFileTypes:true})).filter(e=>e.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(a.name<b.name?-1:1)*(sort==='key-desc'?-1:1));
  const objects=[];for(const e of entries.slice(offset,offset+limit)){if(e.isSymbolicLink())throw fail('SYMLINK_DENIED');const m=await stat(identity(i.key+e.name+(e.isDirectory()?'/':'')));if(!m)throw fail('SOURCE_CHANGED');objects.push(m);}
  const more=offset+limit<entries.length;return {objects,complete:!more,cursor:more?JSON.stringify({key:i.key,revision:parent.revision,query,sort,offset:offset+limit}):null};
 },
 async read(i,{range}={}){const before=await stat(i);if(!before)throw fail('NOT_FOUND_OR_INACCESSIBLE');if(before.folder)throw fail('IS_A_DIRECTORY');if(before.size>2097152)throw fail('SIZE_LIMIT');const handle=await open(await target(i),constants.O_RDONLY|constants.O_NOFOLLOW);try{const buffer=new Uint8Array(2097153);let size=0;while(size<buffer.length){const {bytesRead}=await handle.read(buffer,size,buffer.length-size,null);if(!bytesRead)break;size+=bytesRead;}if(size>2097152)throw fail('SIZE_LIMIT');const bytes=buffer.slice(0,size);const after=await stat(i);if(before.revision!==after?.revision||bytes.length!==before.size)throw fail('SOURCE_CHANGED');return {metadata:before,bytes:range?bytes.slice(range.offset,range.offset+range.length):bytes};}finally{await handle.close();}},
 async create(i,bytes,{metadata}={}){if(bytes.length>2097152)throw fail('SIZE_LIMIT');if(metadata?.contentType&&metadata.contentType!=='application/octet-stream')throw fail('PROVIDER_OPERATION_UNSUPPORTED');let handle;try{handle=await open(await target(i),'wx',0o600);}catch(e){if(e.code==='EEXIST')throw fail('CONFLICT');throw e;}try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}return stat(i);},
 async createDirectory(i){try{await mkdir(await target(i),{mode:0o700});}catch(e){if(e.code==='EEXIST')throw fail('CONFLICT');throw e;}return stat(i);},
 async delete(){throw fail('UNSUPPORTED_ATOMIC_DELETE');}
 };return adapter;
}
