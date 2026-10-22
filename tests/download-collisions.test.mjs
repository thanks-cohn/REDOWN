import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const background=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const match=background.match(/const WORKER_SOURCE = `([\s\S]*?)`;\r?\n\r?\nfunction/);
const source=Function(`return \`${match[1]}\``)().replace('__REDOWN_SHARED_SECRET__','secret');
const worker=(await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
function bucket(race=false){
 const objects=new Map([['memes/photo.jpg','original'],['memes/photo-1.jpg','earlier']]);
 return {objects,async head(key){return objects.has(key)?{}:null;},async put(key,value,options){
  assert.equal(options.onlyIf.get('If-None-Match'),'*');
  const bytes=await new Response(value).text();
  if(race){objects.set(key,'simultaneous');return null;}
  if(objects.has(key))return null;
  objects.set(key,bytes);return {key};
 }};
}
function upload(){return new Request('https://bucket.workers.dev/',{method:'POST',headers:{authorization:'Bearer secret','x-redown-action':'upload-local','x-redown-filename':'photo.jpg','x-redown-folder':'memes','content-type':'image/jpeg'},body:'new image'});}
test('download collision preserves originals and returns numbered key and URL',async()=>{
 const storage=bucket();const response=await worker.fetch(upload(),{STORAGE:storage});const result=await response.json();
 assert.equal(result.ok,true);assert.equal(result.key,'memes/photo-2.jpg');assert.equal(result.filename,'photo-2.jpg');assert.match(result.publicUrl,/photo-2\.jpg$/);
 assert.equal(storage.objects.get('memes/photo.jpg'),'original');assert.equal(storage.objects.get('memes/photo-1.jpg'),'earlier');assert.equal(storage.objects.get(result.key),'new image');
 const next=await (await worker.fetch(upload(),{STORAGE:storage})).json();assert.equal(next.key,'memes/photo-3.jpg');
});
test('concurrent collision never overwrites or reports a successful download',async()=>{
 const storage=bucket(true);const response=await worker.fetch(upload(),{STORAGE:storage});const result=await response.json();
 assert.equal(result.ok,false);assert.match(result.error,/Please retry/);assert.equal(storage.objects.get('memes/photo-2.jpg'),'simultaneous');
});
test('remote download uses numbered key within requested folder',async()=>{
 const storage=bucket();const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('remote image',{headers:{'content-type':'image/jpeg'}});
 try{
 const response=await worker.fetch(new Request('https://bucket.workers.dev/',{method:'POST',headers:{authorization:'Bearer secret','content-type':'application/json'},body:JSON.stringify({sourceUrl:'https://example.com/photo.jpg',folder:'memes',filename:'photo.jpg'})}),{STORAGE:storage});
 const result=await response.json();assert.equal(result.ok,true);assert.equal(result.key,'memes/photo-2.jpg');assert.equal(storage.objects.get(result.key),'remote image');assert.equal(storage.objects.get('memes/photo.jpg'),'original');
 }finally{globalThis.fetch=original;}
});
test('first collision starts at one and a different folder keeps the original name',async()=>{
 const storage=bucket();storage.objects.delete('memes/photo-1.jpg');
 const first=await (await worker.fetch(upload(),{STORAGE:storage})).json();assert.equal(first.key,'memes/photo-1.jpg');
 const request=upload();const headers=new Headers(request.headers);headers.set('x-redown-folder','other');
 const other=await (await worker.fetch(new Request(request,{headers}),{STORAGE:storage})).json();assert.equal(other.key,'other/photo.jpg');
});
