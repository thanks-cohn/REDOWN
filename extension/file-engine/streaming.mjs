// Bounded, backpressured byte verification shared by the canonical operations.
// Hash implementation: @noble/hashes, MIT; vendored for extension CSP/offline use.
import {sha256} from './vendor/sha256.mjs';
import {fail} from './engine.mjs';
import {modelFor} from './provider-contract.mjs';
export const STREAM_CHUNK_BYTES = 256 * 1024;
export function hex(bytes) { return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''); }
export async function* verifiedChunks(source, {size, expectedSha256, chunkBytes=STREAM_CHUNK_BYTES, check=async()=>{}, onProgress=()=>{}}={}) {
 if(!Number.isSafeInteger(size)||size<0||!Number.isInteger(chunkBytes)||chunkBytes<4096||chunkBytes>2*1024*1024)throw fail('INVALID_STREAM');
 const digest=sha256.create();let count=0;
 for await(const input of source){
  if(!(input instanceof Uint8Array))throw fail('INVALID_STREAM');
  for(let offset=0;offset<input.length;offset+=chunkBytes){
   await check();const bytes=input.subarray(offset,offset+chunkBytes);count+=bytes.length;
   if(count>size)throw fail('SOURCE_CHANGED');digest.update(bytes);yield bytes;
   await onProgress({bytes:count,total:size});
  }
 }
 await check();if(count!==size)throw fail('TRUNCATED_READ');
 if(expectedSha256 && hex(digest.digest())!==expectedSha256)throw fail('VERIFICATION_DISAGREEMENT');
}
export async function readVerifiedStream(adapter,identity,{sink,check=async()=>{},onProgress=()=>{},expectedSha256,expectedSize}={}){
 if(typeof adapter.readStream!=='function')throw fail('PROVIDER_OPERATION_UNSUPPORTED');
 const {metadata,stream}=await adapter.readStream(identity);
 if(!metadata||!modelFor(adapter).matchesMetadata(metadata,identity)||!metadata.revision||!Number.isSafeInteger(metadata.size)||metadata.size<0)throw fail('INVALID_PROVIDER_RESPONSE');
 if(expectedSize!==undefined&&metadata.size!==expectedSize)throw fail('VERIFICATION_DISAGREEMENT');
 const digest=sha256.create();let count=0;
 for await(const bytes of verifiedChunks(stream,{size:metadata.size,check,onProgress})){
  digest.update(bytes);if(sink)await sink(bytes,count);count+=bytes.length;
 }
 const checksum=hex(digest.digest());
 if(expectedSha256&&checksum!==expectedSha256)throw fail('VERIFICATION_DISAGREEMENT');
 const fresh=await adapter.stat(identity);
 if(!fresh||String(fresh.revision)!==String(metadata.revision)||fresh.size!==count)throw fail('SOURCE_CHANGED');
 return {metadata,size:count,sha256:checksum};
}
