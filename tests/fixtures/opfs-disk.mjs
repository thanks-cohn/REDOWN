// OPFS-shaped disk fixture for native integration tests, not browser acceptance.
import {open,readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
export function diskDirectory(root){return {
 async getFileHandle(name){
  const filename=path.join(root,name);
  return {async createWritable(){const file=await open(filename,'wx');return {async write(bytes){await file.writeFile(bytes);},async close(){await file.close();},async abort(){await file.close();}};},async getFile(){
   const file=await open(filename,'r');const size=(await file.stat()).size;await file.close();
   return {size,slice(start,end){return {async arrayBuffer(){const file=await open(filename,'r');try{const bytes=Buffer.alloc(Math.min(end,size)-start);let offset=0;while(offset<bytes.length){const result=await file.read(bytes,offset,bytes.length-offset,start+offset);if(!result.bytesRead)throw Error('TRUNCATED_FIXTURE');offset+=result.bytesRead;}return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length);}finally{await file.close();}}};}};
  }};
 },
 async removeEntry(name){await unlink(path.join(root,name));}
};}
