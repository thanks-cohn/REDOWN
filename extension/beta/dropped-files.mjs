// Retain File handles and relative paths, never materialize file payloads.
// A directory reader can return several batches; an empty batch means exhausted.
export async function collectDroppedFiles(items,files=[],{signal,onEntry}={}) {
  const result=[],stack=[];
  for(const item of items||[]){
    if(item.kind&&item.kind!=='file')continue;
    const entry=item.webkitGetAsEntry?.();
    if(entry)stack.push({entry,parent:''});
    else {const file=item.getAsFile?.();if(file)result.push({file,relativePath:file.name});}
  }
  if(!stack.length&&!result.length)for(const file of files)result.push({file,relativePath:file.webkitRelativePath||file.name});
  while(stack.length){
    signal?.throwIfAborted();const {entry,parent}=stack.pop(),path=parent+entry.name;
    if(entry.isFile){const file=await new Promise((resolve,reject)=>entry.file(resolve,reject));signal?.throwIfAborted();result.push({file,relativePath:path});onEntry?.(result.length);}
    else if(entry.isDirectory){
      const reader=entry.createReader();
      while(true){signal?.throwIfAborted();const children=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!children.length)break;for(const child of children)stack.push({entry:child,parent:path+'/'});}
    }
  }
  signal?.throwIfAborted();return result;
}
