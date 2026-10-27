// Native messaging transports bounded frames; OPFS owns temporary bytes on disk.
// One spool per grant prevents unbounded file/handle accumulation. No cloud credentials.
import {decode,encode,fail} from './engine.mjs';
import {sha256} from './vendor/sha256.mjs';
import {hex} from './streaming.mjs';
export function createStreamSpool({getDirectory=()=>navigator.storage.getDirectory(),active=async()=>true}={}){
 let entry=null;
 const assertActive=async()=>{if(!await active())throw fail('AUTHORIZATION_DENIED');};
 const clear=async()=>{const previous=entry;entry=null;if(previous){try{await previous.writer?.abort();}finally{await previous.directory.removeEntry(previous.name).catch(()=>{});}}};
 return {
  async query(method,input={}){
   await assertActive();
   if(!input||typeof input!=='object'||Array.isArray(input))throw fail('INVALID_INPUT');
   if(method==='streamOpen'){
    if(Object.keys(input).sort().join()!=='mode,sha256,size'||!['upload','read'].includes(input.mode)||!Number.isSafeInteger(input.size)||input.size<0||!(input.mode==='read'&&input.sha256===null)&&! /^[a-f0-9]{64}$/.test(input.sha256))throw fail('INVALID_INPUT');
    if(entry)throw fail('STREAM_BUSY');
    const directory=await getDirectory(),name='redown-transfer-'+crypto.randomUUID();
    const handle=await directory.getFileHandle(name,{create:true});
    entry={directory,name,handle,mode:input.mode,size:input.size,sha256:input.sha256,offset:0,digest:sha256.create(),writer:await handle.createWritable()};
    return {id:name,chunkBytes:262144};
   }
   if(!entry||input.id!==entry.name)throw fail('STREAM_NOT_FOUND');
   if(method==='streamClose'){if(Object.keys(input).join()!=='id')throw fail('INVALID_INPUT');await clear();return {closed:true};}
   if(method==='streamAppend'){
    if(Object.keys(input).sort().join()!=='bytesBase64,id,offset'||entry.mode!=='upload'||!entry.writer||input.offset!==entry.offset)throw fail('INVALID_INPUT');
    const bytes=decode(input.bytesBase64);if(!bytes.length||bytes.length>262144||entry.offset+bytes.length>entry.size)throw fail('INVALID_BYTES');
    await entry.writer.write(bytes);entry.digest.update(bytes);entry.offset+=bytes.length;return {bytes:entry.offset};
   }
   if(method==='streamSeal'){
    if(Object.keys(input).join()!=='id'||entry.mode!=='upload'||entry.offset!==entry.size||!entry.writer)throw fail('TRUNCATED_READ');
    if(hex(entry.digest.digest())!==entry.sha256)throw fail('VERIFICATION_DISAGREEMENT');
    await entry.writer.close();entry.writer=null;entry.sealed=true;return {bytes:entry.offset};
   }
   if(method==='streamPull'){
    if(Object.keys(input).sort().join()!=='id,offset'||entry.mode!=='read'||entry.writer||input.offset!==entry.offset)throw fail('INVALID_INPUT');
    const file=await entry.handle.getFile();const bytes=new Uint8Array(await file.slice(entry.offset,entry.offset+262144).arrayBuffer());
    entry.offset+=bytes.length;return {bytesBase64:encode(bytes),offset:entry.offset,done:entry.offset===entry.size};
   }
   throw fail('UNSUPPORTED_OPERATION');
  },
  async resolve(request){
   await assertActive();
   const current=entry;
   if(!current||request.operation!==current.mode||request.transfer.size!==current.size||(request.transfer.sha256??null)!==current.sha256)throw fail('STREAM_NOT_FOUND');
   if(current.mode==='upload'){
    if(!current.sealed)throw fail('STREAM_NOT_SEALED');
    const file=await current.handle.getFile();
    return {source:async function*(){for(let offset=0;offset<file.size;offset+=262144){await assertActive();yield new Uint8Array(await file.slice(offset,offset+262144).arrayBuffer());}}};
   }
   return {sink:async(bytes,offset)=>{await assertActive();if(offset!==current.offset)throw fail('INVALID_STREAM');await current.writer.write(bytes);current.offset+=bytes.length;}};
  },
  async finish(request,job){
   if(!entry||!request.transfer||entry.mode!=='read')return;
   if(job.state==='completed'&&entry.offset===entry.size){await entry.writer.close();entry.writer=null;entry.offset=0;}
   else await clear();
  },
  clear
 };
}
