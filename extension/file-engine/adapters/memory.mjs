import {fail,encode,decode,fileIdentity} from '../engine.mjs';
const same=(a,b)=>['provider','account','container'].every(k=>a[k]===b[k]);
export function memoryAdapter(store,id){
 const info=o=>({...Object.fromEntries(['provider','account','container','key','revision'].map(k=>[k,o[k]])),size:bytes(o).length,folder:o.key.endsWith('/'),contentType:o.contentType||'text/plain'});
 const bytes=o=>o.bytesBase64!==undefined?decode(o.bytesBase64):new TextEncoder().encode(o.content);
 const find=(s,i)=>s.objects.find(o=>same(o,i)&&o.key===i.key);
 return {id,capabilities:{realProvider:false,identity:'exact-key',atomicCreate:true,atomicConditionalDelete:true,multipart:false,maxBytes:2097152},assertIdentity(i){fileIdentity(i,{root:true});if(i.provider!==id||i.account!=='demo'||i.container!=='sandbox')throw fail('UNSUPPORTED_PROVIDER');},
 async stat(i){const s=await store.read(),o=find(s,i);return o?info(o):null;},
 async list(i,{limit=50,cursor,query='',sort='key-asc',recursive=false}={}){const s=await store.read();let offset=0;const signature=JSON.stringify([i,query,sort,recursive]);if(cursor){let c;try{c=JSON.parse(cursor);}catch{throw fail('INVALID_CURSOR');}if(c.revision!==s.revision||c.signature!==signature||!Number.isInteger(c.offset)||c.offset<0)throw fail('STALE_CURSOR');offset=c.offset;}const all=s.objects.filter(o=>same(o,i)&&o.key.startsWith(i.key)&&(recursive||o.key!==i.key)&&(query?o.key.toLowerCase().includes(query.toLowerCase()):recursive||!o.key.slice(i.key.length).replace(/\/$/,'').includes('/'))).sort((a,b)=>(a.key<b.key?-1:a.key>b.key?1:0)*(sort==='key-desc'?-1:1));const objects=all.slice(offset,offset+limit).map(info);return {objects,cursor:offset+limit<all.length?JSON.stringify({revision:s.revision,signature,offset:offset+limit}):null,complete:offset+limit>=all.length};},
 async read(i,{range}={}){const s=await store.read(),o=find(s,i);if(!o)throw fail('NOT_FOUND_OR_INACCESSIBLE');const value=bytes(o);if(range&&range.offset>=value.length)throw fail('INVALID_RANGE');return {metadata:info(o),bytes:range?value.slice(range.offset,range.offset+range.length):value};},
 async create(i,value,{metadata}={}){return store.update(s=>{if(find(s,i))throw fail('CONFLICT');if(s.objects.length>=5000)throw fail('CAPACITY');s.revision++;const object={...i,content:new TextDecoder().decode(value),bytesBase64:encode(value),revision:s.revision,contentType:metadata?.contentType||'text/plain'};s.objects.push(object);return info(object);});},
 async delete(i,{revision}={}){return store.update(s=>{const o=find(s,i);if(!o)throw fail('NOT_FOUND_OR_INACCESSIBLE');if(o.revision!==revision)throw fail('SOURCE_CHANGED');s.objects=s.objects.filter(item=>item!==o);
 s.revision++;});}
 };
}
