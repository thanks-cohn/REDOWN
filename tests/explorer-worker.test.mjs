import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import {createCollector} from "../agent/explorer/api.mjs";
import {createHash,randomUUID} from "node:crypto";

async function workerModule() {
  const background = await readFile(new URL("../extension/background.js", import.meta.url), "utf8");
  const match = background.match(/const WORKER_SOURCE = `([\s\S]*?)`;\r?\n\r?\nfunction/);
  assert.ok(match, "embedded Explorer worker source is present");
  const source = Function(`return \`${match[1]}\``)().replace("__REDOWN_SHARED_SECRET__", "test-secret");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

class MemoryObject {
  constructor(key, bytes, options = {}) {
    this.key = key;
    this.bytes = bytes;
    this.size = bytes.byteLength;
    this.etag = createHash("md5").update(bytes).digest("hex");
    this.version=options.version||randomUUID();
    this.checksums={md5:Uint8Array.from(createHash("md5").update(bytes).digest()).buffer};
    this.httpEtag = `"${this.etag}"`;
    this.uploaded = new Date("2026-10-02T12:00:00Z");
    this.httpMetadata = options.httpMetadata || {};
    this.customMetadata = options.customMetadata || {};
    this.body = new Blob([bytes]).stream();
  }
  writeHttpMetadata(headers) {
    if (this.httpMetadata.contentType) headers.set("content-type", this.httpMetadata.contentType);
    if (this.httpMetadata.cacheControl) headers.set("cache-control", this.httpMetadata.cacheControl);
  }
}

class MemoryBucket {
  objects = new Map();
  async head(key) { return this.objects.get(key) || null; }
  async get(key, options = {}) {
    const object = this.objects.get(key);
    if (!object) return null;
    if(options.onlyIf?.etagMatches&&object.etag!==options.onlyIf.etagMatches)return {etag:object.etag};
    const range = options.range;
    const bytes = range ? object.bytes.slice(range.offset, range.offset + range.length) : object.bytes;
    return new MemoryObject(key, bytes, object);
  }
  async put(key, value, options = {}) {
    const existing=this.objects.get(key);
    if(options.onlyIf instanceof Headers&&options.onlyIf.get('if-none-match')==='*'&&existing)return null;
    if(options.onlyIf?.etagMatches&&existing?.etag!==options.onlyIf.etagMatches)return null;
    const bytes = new Uint8Array(await new Response(value).arrayBuffer());
    if(options.md5&&createHash("md5").update(bytes).digest("hex")!==options.md5)throw Error("Content checksum mismatch");
    const object=new MemoryObject(key,bytes,options);this.objects.set(key,object);return object;
  }
  async delete(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) this.objects.delete(key);
  }
}

function manageRequest(body) {
  return new Request("https://bucket.workers.dev/", {
    method: "POST",
    headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

const text = value => new TextEncoder().encode(value);

function storedZip(entries) {
  const chunks = [], central = [];
  let offset = 0;
  for (const [name, value] of entries) {
    const nameBytes = text(name), data = text(value), local = new Uint8Array(30 + nameBytes.length + data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length); chunks.push(local);
    const header = new Uint8Array(46 + nameBytes.length), cv = new DataView(header.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true); header.set(nameBytes, 46); central.push(header);
    offset += local.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0), eocd = new Uint8Array(22), ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + eocd.length); let cursor = 0;
  for (const part of [...chunks, ...central, eocd]) { output.set(part, cursor); cursor += part.length; }
  return output;
}

test("same-bucket transfers stream objects and preserve metadata", async () => {
  const worker = (await workerModule()).default;
  const bucket = new MemoryBucket();
  await bucket.put("images/logo.png", text("logo"), { httpMetadata:{ contentType:"image/png" }, customMetadata:{ owner:"redown" } });
  const response = await worker.fetch(manageRequest({ action:"transferBatch", conflict:"skip", entries:[{ sourceKey:"images/logo.png", destinationKey:"archive/logo.png", sameBucket:true }] }), { STORAGE:bucket });
  const result = await response.json();
  assert.equal(result.results[0].status, "copied");
  assert.equal(new TextDecoder().decode((await bucket.get("archive/logo.png")).bytes), "logo");
  assert.equal((await bucket.head("archive/logo.png")).customMetadata.owner, "redown");
});

test("cross-bucket transfers stay Worker-to-Worker and keep-both resolves conflicts", async () => {
  const worker = (await workerModule()).default;
  const source = new MemoryBucket();
  const destination = new MemoryBucket();
  await source.put("models/ship.glb", text("remote-model"), { httpMetadata:{ contentType:"model/gltf-binary" } });
  await destination.put("ships/ship.glb", text("existing"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "source.workers.dev") return worker.fetch(new Request(input, init), { STORAGE:source });
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(manageRequest({ action:"transferBatch", conflict:"keep", sourceWorkerUrl:"https://source.workers.dev", sourceToken:"test-secret", entries:[{ sourceKey:"models/ship.glb", destinationKey:"ships/ship.glb", sameBucket:false }] }), { STORAGE:destination });
    const result = await response.json();
    assert.equal(result.results[0].destinationKey, "ships/ship (2).glb");
    assert.equal(new TextDecoder().decode((await destination.get("ships/ship (2).glb")).bytes), "remote-model");
  } finally { globalThis.fetch = originalFetch; }
});

test("folder markers, properties, and batched deletes are real R2 operations", async () => {
  const worker = (await workerModule()).default;
  const bucket = new MemoryBucket();
  let response = await worker.fetch(manageRequest({ action:"ensurePrefixes", prefixes:["models/empty"] }), { STORAGE:bucket });
  assert.equal((await response.json()).created[0], "models/empty/.redown");
  response = await worker.fetch(manageRequest({ action:"headObject", key:"models/empty/.redown" }), { STORAGE:bucket });
  assert.equal((await response.json()).object.customMetadata.redownMarker, "true");
  response = await worker.fetch(manageRequest({ action:"deleteKeys", keys:["models/empty/.redown"] }), { STORAGE:bucket });
  assert.deepEqual((await response.json()).deleted, ["models/empty/.redown"]);
  assert.equal(await bucket.head("models/empty/.redown"), null);
});

test("private Explorer reads require auth while explicitly enabled public assets still work", async () => {
  const worker = (await workerModule()).default, bucket = new MemoryBucket();
  await bucket.put("private/story.txt", text("creator notes"), { httpMetadata:{ contentType:"text/plain" } });
  let response = await worker.fetch(new Request("https://bucket.workers.dev/object?key=private%2Fstory.txt"), { STORAGE:bucket, PUBLIC_ASSETS_ENABLED:"false" });
  assert.equal(response.status, 401);
  response = await worker.fetch(new Request("https://bucket.workers.dev/assets/private/story.txt"), { STORAGE:bucket, PUBLIC_ASSETS_ENABLED:"false" });
  assert.equal(response.status, 404, "Explorer preparation does not publish objects");
  response = await worker.fetch(new Request("https://bucket.workers.dev/object?key=private%2Fstory.txt", { headers:{ authorization:"Bearer test-secret", range:"bytes=0-6" } }), { STORAGE:bucket });
  assert.equal(response.status, 206); assert.equal(await response.text(), "creator");
  response = await worker.fetch(new Request("https://bucket.workers.dev/assets/private/story.txt"), { STORAGE:bucket, PUBLIC_ASSETS_ENABLED:"true" });
  assert.equal(response.status, 200); assert.equal(await response.text(), "creator notes");
});

test("short-lived private preview URLs support ranges for text, PDF, and GLB", async () => {
  const worker = (await workerModule()).default, bucket = new MemoryBucket();
  for (const [key, type] of [["notes.txt","text/plain"],["layout.pdf","application/pdf"],["scene.glb","model/gltf-binary"]]) {
    await bucket.put(key, text(`content:${key}`), { httpMetadata:{ contentType:type } });
    const signed = await (await worker.fetch(manageRequest({ action:"createReadUrl", key, ttl:60 }), { STORAGE:bucket })).json();
    const response = await worker.fetch(new Request(signed.url, { headers:{ range:"bytes=0-6" } }), { STORAGE:bucket });
    assert.equal(response.status, 206); assert.equal(await response.text(), "content"); assert.match(response.headers.get("cache-control"), /private/);
  }
});

test("ZIP and CBZ archives are listed as virtual folders and selected entries extract safely", async () => {
  const worker = (await workerModule()).default, bucket = new MemoryBucket();
  await bucket.put("comic.cbz", storedZip([["cover.jpg","cover"],["pages/",""],["pages/001.jpg","one"],["notes.txt","hello"]]));
  let result = await (await worker.fetch(manageRequest({ action:"listArchive", key:"comic.cbz" }), { STORAGE:bucket })).json();
  assert.equal(result.archive.type, "cbz"); assert.deepEqual(result.archive.entries.map(x => x.name), ["cover.jpg","pages/","pages/001.jpg","notes.txt"]);
  assert.equal(result.archive.entries.find(x => x.name === "pages/")?.directory, true);
  result = await (await worker.fetch(manageRequest({ action:"extractArchiveEntries", key:"comic.cbz", entries:["pages/001.jpg"], destinationPrefix:"project" }), { STORAGE:bucket })).json();
  assert.equal(result.results[0].status, "extracted"); assert.equal(new TextDecoder().decode((await bucket.get("project/pages/001.jpg")).bytes), "one");
  const preview = await (await worker.fetch(manageRequest({ action:"createArchiveEntryReadUrl", key:"comic.cbz", entry:"notes.txt", contentType:"text/plain" }), { STORAGE:bucket })).json();
  const previewResponse = await worker.fetch(new Request(preview.url), { STORAGE:bucket });
  assert.equal(previewResponse.status, 200); assert.equal(await previewResponse.text(), "hello");
});

test("archive traversal and malformed archives are rejected", async () => {
  const worker = (await workerModule()).default, bucket = new MemoryBucket();
  await bucket.put("unsafe.zip", storedZip([["../escape.txt","bad"]]));
  let response = await worker.fetch(manageRequest({ action:"listArchive", key:"unsafe.zip" }), { STORAGE:bucket });
  assert.equal(response.status, 400); assert.match((await response.json()).error, /unsafe path/);
  await bucket.put("broken.zip", text("not a zip"));
  response = await worker.fetch(manageRequest({ action:"listArchive", key:"broken.zip" }), { STORAGE:bucket });
  assert.equal(response.status, 400); assert.match((await response.json()).error, /Malformed/);
});

test('management keeps exact Unicode, punctuation and repeated-slash keys; rename preserves bytes',async()=>{
 const worker=(await workerModule()).default,bucket=new MemoryBucket(),key='nested//雪 #?%.txt';
 await bucket.put(key,text('literal payload'),{httpMetadata:{contentType:'text/plain',cacheControl:'max-age=12'},customMetadata:{owner:'fixture'}});
 let result=await(await worker.fetch(manageRequest({action:'headObject',key}),{STORAGE:bucket})).json();assert.equal(result.object.key,key);
 result=await(await worker.fetch(manageRequest({action:'transferBatch',entries:[{sourceKey:key,destinationKey:'other/雪 #?%.txt',sameBucket:true}]}),{STORAGE:bucket})).json();assert.equal(result.results[0].verified,true);assert.equal(result.results[0].size,15);
 assert.equal(new TextDecoder().decode((await bucket.get(key)).bytes),'literal payload');
 result=await(await worker.fetch(manageRequest({action:'renameObject',oldKey:key,newFilename:'new 雪 #?.txt'}),{STORAGE:bucket})).json();assert.equal(result.ok,true);assert.equal(result.key,'nested//new 雪 #?.txt');assert.equal(await bucket.head(key),null);assert.equal((await bucket.head(result.key)).httpMetadata.cacheControl,'max-age=12');
});
test('conditional copies preserve racing destinations and failed verification never reports copied',async()=>{
 const worker=(await workerModule()).default,bucket=new MemoryBucket();await bucket.put('source',text('source'));
 const originalPut=bucket.put.bind(bucket);let race=true;
 bucket.put=async(key,body,opts)=>{if(race&&key==='target'){race=false;await originalPut(key,text('other writer'));}return originalPut(key,body,opts);};
 let result=await(await worker.fetch(manageRequest({action:'transferBatch',entries:[{sourceKey:'source',destinationKey:'target',sameBucket:true}]}),{STORAGE:bucket})).json();assert.equal(result.results[0].status,'conflict');assert.equal(new TextDecoder().decode((await bucket.get('target')).bytes),'other writer');assert.ok(await bucket.head('source'));
 bucket.put=async(key,body,opts)=>{const receipt=await originalPut(key,body,opts);if(key==='corrupt')bucket.objects.delete(key);return receipt;};
 result=await(await worker.fetch(manageRequest({action:'transferBatch',entries:[{sourceKey:'source',destinationKey:'corrupt',sameBucket:true}]}),{STORAGE:bucket})).json();assert.equal(result.results[0].status,'failed');assert.match(result.results[0].error,/verification failed/);assert.ok(await bucket.head('source'));
});
test('move deletion rejects changed sources and changed destinations, then confirms exact deletion',async()=>{
 const worker=(await workerModule()).default,bucket=new MemoryBucket();await bucket.put('source',text('source'));await bucket.put('target',text('source'));
 const expected=[{key:'source',etag:'wrong-version',size:6,destinationKey:'target',destinationEtag:(await bucket.head('target')).etag}];
 let result=await(await worker.fetch(manageRequest({action:'deleteKeys',keys:['source'],expected,sameBucket:true}),{STORAGE:bucket})).json();assert.equal(result.ok,false);assert.ok(await bucket.head('source'));
 expected[0].etag=(await bucket.head('source')).etag;expected[0].destinationEtag='wrong-version';
 result=await(await worker.fetch(manageRequest({action:'deleteKeys',keys:['source'],expected,sameBucket:true}),{STORAGE:bucket})).json();assert.equal(result.ok,false);assert.ok(await bucket.head('source'));
 expected[0].destinationEtag=(await bucket.head('target')).etag;result=await(await worker.fetch(manageRequest({action:'deleteKeys',keys:['source'],expected,sameBucket:true}),{STORAGE:bucket})).json();assert.deepEqual(result.deleted,['source']);assert.equal(await bucket.head('source'),null);assert.ok(await bucket.head('target'));
});
test('large streamed fixture and metadata survive local copy; capabilities reject legacy readiness',async()=>{
 const worker=(await workerModule()).default,bucket=new MemoryBucket(),bytes=new Uint8Array(16*1024*1024);for(let i=0;i<bytes.length;i+=4096)bytes[i]=(i/4096)%251;
 await bucket.put('large.bin',bytes,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{test:'large-local-only'}});
 const result=await(await worker.fetch(manageRequest({action:'transferBatch',entries:[{sourceKey:'large.bin',destinationKey:'large-copy.bin',sameBucket:true}]}),{STORAGE:bucket})).json();assert.equal(result.results[0].verified,true);assert.deepEqual((await bucket.get('large-copy.bin')).bytes,bytes);
 const capabilities=await(await worker.fetch(manageRequest({action:'capabilities'}),{STORAGE:bucket})).json();assert.equal(capabilities.workerVersion,6);assert.equal(capabilities.diagnosticProtocol,1);assert.equal(capabilities.safeTransfers,true);
});
test('archive extraction conflicts preserve existing destination content',async()=>{
 const worker=(await workerModule()).default,bucket=new MemoryBucket();await bucket.put('book.zip',storedZip([['notes.txt','from archive']]));await bucket.put('out/notes.txt',text('keep existing'));
 const result=await(await worker.fetch(manageRequest({action:'extractArchiveEntries',key:'book.zip',entries:['notes.txt'],destinationPrefix:'out'}),{STORAGE:bucket})).json();assert.equal(result.results[0].status,'failed');assert.equal(new TextDecoder().decode((await bucket.get('out/notes.txt')).bytes),'keep existing');
});

async function pipeline(){
 const background=await readFile('extension/background.js','utf8'),worker=(await workerModule()).default;
 const stores={source:new MemoryBucket(),destination:new MemoryBucket()},calls=[];
 const context={deliveryCount:0,transferCounter:{add:async count=>{context.deliveryCount+=count;}},URL,TextEncoder,Headers,Date,console,performance,Set,Map,RedownCloudflareApi:{boundedFetch:async(url,options)=>{
  const bucket=new URL(url).hostname.split('.')[0];calls.push({bucket,body:JSON.parse(options.body)});return worker.fetch(new Request(url,options),{STORAGE:stores[bucket]});
 }},cfJson:async path=>{const parts=path.split("/");return {bindings:[{name:"STORAGE",type:"r2_bucket",bucket_name:parts[parts.indexOf("scripts")+1]}],compatibility_flags:["global_fetch_strictly_public"]};},listObjectsPage:async(a,b,prefix)=>({objects:[...stores[b].objects.values()].filter(o=>o.key.startsWith(prefix)),cursor:"",truncated:false}),listAllObjects:async(a,b,prefix)=>[...stores[b].objects.values()].filter(o=>o.key.startsWith(prefix))};
 vm.createContext(context);vm.runInContext(background.slice(background.indexOf('function cleanExplorerPrefix('),background.indexOf('function objectKeyFromLocation(')),context);
 context.preparedProfile=async(accountId,bucketName)=>({id:bucketName,accountId,bucketName,scriptName:bucketName,workerUrl:`https://${bucketName}.workers.dev`,token:'test-secret'});
 const originalFetch=globalThis.fetch;globalThis.fetch=(url,options)=>{
  const bucket=new URL(url).hostname.split('.')[0];if(stores[bucket])return worker.fetch(new Request(url,options),{STORAGE:stores[bucket]});return originalFetch(url,options);
 };
 return {context,stores,calls,restore(){globalThis.fetch=originalFetch;},request:{source:{accountId:'a',bucketName:'source'},destination:{accountId:'a',bucketName:'destination',prefix:'nested/'},entries:[{key:'雪 #?.txt',folder:false}]}};
}
test('background→actual embedded Worker→in-memory R2 copy/move/rename/delete pipeline verifies content',async()=>{
 const h=await pipeline();try{
  await h.stores.source.put('雪 #?.txt',text('original'),{customMetadata:{owner:'test'},httpMetadata:{contentType:'text/plain',cacheControl:'max-age=23'}});
  let result=await h.context.transferExplorerObjects({...h.request,operation:'copy'});assert.equal(result.completed,1);assert.equal(h.context.deliveryCount,1);assert.ok(await h.stores.source.head('雪 #?.txt'));assert.equal(new TextDecoder().decode((await h.stores.destination.get('nested/雪 #?.txt')).bytes),'original');
  result=await h.context.transferExplorerObjects({...h.request,operation:'move',destination:{...h.request.destination,prefix:'moved/'}});assert.equal(result.completed,1);assert.equal(h.context.deliveryCount,2);assert.equal(await h.stores.source.head('雪 #?.txt'),null);assert.equal((await h.stores.destination.head('moved/雪 #?.txt')).customMetadata.owner,'test');
  result=await h.context.renameExplorerEntry({source:{accountId:'a',bucketName:'destination'},entry:{key:'moved/雪 #?.txt',displayName:'雪 #?.txt'},newName:'renamed #雪.txt'});assert.equal(result.completed,1);assert.equal(await h.stores.destination.head('moved/雪 #?.txt'),null);assert.ok(await h.stores.destination.head('moved/renamed #雪.txt'));
  result=await h.context.deleteExplorerObjects({source:{accountId:'a',bucketName:'destination'},entries:[{key:'moved/renamed #雪.txt'}]});assert.equal(result.completed,1);assert.ok(await h.stores.destination.head('nested/雪 #?.txt'),'unselected object remains');
 }finally{h.restore();}
});
test('background rejects incomplete/incorrect destination receipts and never deletes original',async()=>{
 const h=await pipeline();try{
  await h.stores.source.put('雪 #?.txt',text('original'));const actual=h.context.RedownCloudflareApi.boundedFetch;
  h.context.RedownCloudflareApi.boundedFetch=async(url,options)=>{const response=await actual(url,options),body=JSON.parse(options.body);if(body.action==='transferBatch'){const result=await response.json();result.results[0].verified=false;return Response.json(result);}return response;};
  await assert.rejects(h.context.transferExplorerObjects({...h.request,operation:'move'}),/did not confirm/);assert.ok(await h.stores.source.head('雪 #?.txt'));assert.ok(!h.calls.some(c=>c.body.action==='deleteKeys'));
 }finally{h.restore();}
});
test('background folder copy/rename uses exact descendants; explicit conflicts preserve both sides',async()=>{
 const h=await pipeline();try{
  await h.stores.source.put('folder/雪.txt',text('one'));await h.stores.source.put('folder/deep/.redown',text(''));await h.stores.source.put('folder-other/keep.txt',text('keep'));
  let result=await h.context.transferExplorerObjects({...h.request,entries:[{key:'folder/',folder:true}],operation:'move'});assert.equal(result.completed,2);assert.ok(await h.stores.source.head('folder-other/keep.txt'));assert.ok(await h.stores.destination.head('nested/folder/deep/.redown'));
  await h.stores.source.put('雪 #?.txt',text('original'));await h.stores.destination.put('nested/雪 #?.txt',text('existing'));
  result=await h.context.transferExplorerObjects({...h.request,operation:'move'});assert.equal(result.completed,0);assert.equal(result.conflicts.length,1);assert.ok(await h.stores.source.head('雪 #?.txt'));assert.equal(new TextDecoder().decode((await h.stores.destination.get('nested/雪 #?.txt')).bytes),'existing');
 }finally{h.restore();}
});

test('instrumented cross-Worker copy records exact read/write/verify timeline with no raw keys or seed',async()=>{
 const h=await pipeline(),worker=(await workerModule()).default,collector=createCollector({context:'background'});collector.setEnabled(true);
 try{
  const key='雪 #?.txt';await h.stores.source.put(key,text('original'));
  const id=collector.begin('copy');await collector.identity(id,h.request.source,key);
  const context={protocol:1,operationId:id,scope:collector.identityScope,seed:await collector.keySeed(),sourceBinding:await collector.fingerprint('bucket',JSON.stringify(['a','source'])),expectedBinding:await collector.fingerprint('bucket',JSON.stringify(['a','destination']))};
  const realFetch=globalThis.fetch;globalThis.fetch=(url,options)=>new URL(url).hostname==='source.workers.dev'?worker.fetch(new Request(url,options),{STORAGE:h.stores.source,REDOWN_DIAGNOSTIC_BINDING:JSON.stringify(['a','source'])}):realFetch(url,options);
  const request=manageRequest({action:'transferBatch',sourceWorkerUrl:'https://source.workers.dev',sourceToken:'test-secret',entries:[{sourceKey:key,destinationKey:'nested/'+key,sameBucket:false}]});const headers=new Headers(request.headers);headers.set('x-redown-diagnostic',JSON.stringify(context));
  const result=await(await worker.fetch(new Request(request,{headers}),{STORAGE:h.stores.destination,REDOWN_DIAGNOSTIC_BINDING:JSON.stringify(['a','destination'])})).json();
  assert.equal(result.results[0].verified,true);for(const event of result.explorerDiagnostic.events)collector.record(id,{...event,scope:context.scope});collector.finish(id,'confirmed');
  const stages=collector.getOperationTrace(id).events.map(e=>e.stage);assert.ok(stages.includes('source.read'));assert.ok(stages.includes('destination.write'));assert.ok(stages.includes('destination.verify'));const serialized=JSON.stringify(collector.exportBundle());assert.doesNotMatch(serialized,/雪|test-secret|workers.dev/);assert.ok(!serialized.includes(context.seed));assert.ok(await h.stores.source.head(key));
 }finally{h.restore();}
});
test('wrong source binding fixture produces structured 404 evidence and mismatch without claiming a production cause',async()=>{
 const h=await pipeline(),worker=(await workerModule()).default,collector=createCollector({context:'background'});collector.setEnabled(true);
 try{
  const key='雪 #?.txt';await h.stores.source.put(key,text('original'));
  const id=collector.begin('copy'),preview=collector.begin('preview');await collector.identity(id,h.request.source,key);await collector.identity(preview,h.request.source,key);collector.record(preview,{stage:'api.response',component:'cloudflare',outcome:'confirmed',mechanism:'api',status:200});collector.finish(preview,'confirmed');
  const context={protocol:1,operationId:id,scope:collector.identityScope,seed:await collector.keySeed(),sourceBinding:await collector.fingerprint('bucket',JSON.stringify(['a','source']))};
  globalThis.fetch=(url,options)=>worker.fetch(new Request(url,options),{STORAGE:new MemoryBucket(),REDOWN_DIAGNOSTIC_BINDING:JSON.stringify(['a','wrong-bucket'])});
  const request=manageRequest({action:'transferBatch',sourceWorkerUrl:'https://source.workers.dev',sourceToken:'test-secret',entries:[{sourceKey:key,destinationKey:'copy.txt',sameBucket:false}]});const headers=new Headers(request.headers);headers.set('x-redown-diagnostic',JSON.stringify(context));
  const result=await(await worker.fetch(new Request(request,{headers}),{STORAGE:h.stores.destination})).json();assert.equal(result.results[0].status,'failed');assert.equal(result.results[0].httpStatus,404);
  for(const event of result.explorerDiagnostic.events)collector.record(id,{...event,scope:context.scope});collector.finish(id,'failed',{status:404,stage:'source.read',component:'worker'});
  const diagnosis=collector.diagnose(id);assert.equal(diagnosis.rootCause,'unknown');assert.ok(diagnosis.findings.some(f=>f.code==='EXPLORER_SOURCE_NOT_FOUND'));assert.ok(diagnosis.findings.some(f=>f.code==='EXPLORER_BUCKET_CONTEXT_MISMATCH'));assert.ok(diagnosis.findings.some(f=>f.code==='API_WORKER_PATH_DIVERGENCE'));assert.ok(await h.stores.source.head(key));assert.equal(await h.stores.destination.head('copy.txt'),null);
 }finally{h.restore();}
});

test('read-only source proxy uses HEAD, rejects redirects and never writes/deletes or reads source bytes',async()=>{
 const worker=(await workerModule()).default,bucket=new MemoryBucket(),original=globalThis.fetch;let calls=0;
 try{
  bucket.put=()=>{throw Error('must not write');};bucket.delete=()=>{throw Error('must not delete');};bucket.get=()=>{throw Error('must not read body');};
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(options.method,'HEAD');assert.equal(options.redirect,'manual');assert.equal(new URL(url).searchParams.get('key'),'nested//雪 #?%.txt');return new Response(null,{status:404});};
  const result=await(await worker.fetch(manageRequest({action:'probeSource',key:'nested//雪 #?%.txt',sourceWorkerUrl:'https://source.workers.dev',sourceToken:'test-secret'}),{STORAGE:bucket})).json();assert.equal(result.status,404);assert.equal(result.readOnly,true);assert.equal(calls,1);
  const rejected=await worker.fetch(manageRequest({action:'probeSource',key:'a',sourceWorkerUrl:'https://not-a-worker.invalid',sourceToken:'test-secret'}),{STORAGE:bucket});assert.equal(rejected.status,400);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});

test('directory collision is reported before any child is merged or source is deleted',async()=>{
 const h=await pipeline();try{
  await h.stores.source.put('photos/shared.txt',text('incoming'));
  await h.stores.source.put('photos/new.txt',text('new child'));
  await h.stores.destination.put('nested/photos/shared.txt',text('original'));
  await h.stores.destination.put('nested/photos/only-original.txt',text('original child'));
  const result=await h.context.transferExplorerObjects({...h.request,operation:'move',entries:[{key:'photos/',folder:true}],conflict:'skip'});
  assert.equal(result.completed,0);assert.equal(result.conflicts.length,1);assert.equal(result.conflicts[0].folder,true);
  assert.equal(result.conflicts[0].sourceKey,'photos/');assert.equal(h.calls.length,0);
  assert.equal(await h.stores.destination.head('nested/photos/new.txt'),null);
  assert.equal(new TextDecoder().decode((await h.stores.destination.get('nested/photos/shared.txt')).bytes),'original');
  assert.ok(await h.stores.source.head('photos/new.txt'));
 }finally{h.restore();}
});

test('directory Keep both preserves the entire existing tree and uses one unused sibling for all incoming children',async()=>{
 const h=await pipeline();try{
  await h.stores.source.put('parent/photos.v1 雪/shared.txt',text('incoming'));
  await h.stores.source.put('parent/photos.v1 雪/deep/new.txt',text('new child'));
  await h.stores.destination.put('nested/photos.v1 雪/shared.txt',text('original'));
  await h.stores.destination.put('nested/photos.v1 雪/only-original.txt',text('original child'));
  await h.stores.destination.put('nested/photos.v1 雪 (2)/',text(''));
  const before=new Map([...h.stores.destination.objects].map(([key,o])=>[key,Buffer.from(o.bytes).toString('hex')]));
  const result=await h.context.transferExplorerObjects({...h.request,operation:'copy',entries:[{key:'parent/photos.v1 雪/',folder:true,destinationKey:'nested/photos.v1 雪/'}],conflict:'keep'});
  assert.equal(result.completed,2);assert.equal(result.conflicts.length,0);
  assert.ok(await h.stores.destination.head('nested/photos.v1 雪 (3)/shared.txt'));assert.ok(await h.stores.destination.head('nested/photos.v1 雪 (3)/deep/new.txt'));
  assert.equal(await h.stores.destination.head('nested/photos.v1 雪/deep/new.txt'),null);
  for(const [key,bytes] of before)assert.equal(Buffer.from((await h.stores.destination.get(key)).bytes).toString('hex'),bytes);
  assert.ok(await h.stores.source.head('parent/photos.v1 雪/shared.txt'));
 }finally{h.restore();}
});

test('directory Keep both move verifies the new sibling before deleting exact source children',async()=>{
 const h=await pipeline();try{
  await h.stores.source.put('folder//deep/a.txt',text('new'));
  await h.stores.destination.put('nested/folder/a.txt',text('existing'));
  const result=await h.context.transferExplorerObjects({...h.request,operation:'move',entries:[{key:'folder/',folder:true}],conflict:'keep'});
  assert.equal(result.completed,1);assert.equal(await h.stores.source.head('folder//deep/a.txt'),null);
  assert.ok(await h.stores.destination.head('nested/folder (2)//deep/a.txt'));
  assert.equal(new TextDecoder().decode((await h.stores.destination.get('nested/folder/a.txt')).bytes),'existing');
 }finally{h.restore();}
});

test('cross-bucket settings drift fails before transfer/deletion with a structured diagnostic code',async()=>{
 for(const mode of ['missing-flag','wrong-binding','unavailable']){
  const h=await pipeline();try{
   await h.stores.source.put('雪 #?.txt',text('source'));
   h.context.cfJson=async()=>{if(mode==='unavailable')throw Error('settings unavailable');return {bindings:[{name:'STORAGE',type:'r2_bucket',bucket_name:mode==='wrong-binding'?'unintended':'source'}],compatibility_flags:mode==='missing-flag'?[]:['global_fetch_strictly_public']};};
   const expected=mode==='missing-flag'?'EXPLORER_WORKER_ROUTING_CONFIG':mode==='wrong-binding'?'EXPLORER_BUCKET_CONTEXT_MISMATCH':undefined;
   await assert.rejects(h.context.transferExplorerObjects({...h.request,operation:'move'}),expected?{code:expected}:/settings unavailable/);
   assert.equal(h.calls.length,0);assert.ok(await h.stores.source.head('雪 #?.txt'));assert.equal(h.stores.destination.objects.size,0);
  }finally{h.restore();}
 }
});

test('directory preflight fails closed on incomplete listings and bounds sibling allocation',async()=>{
 const h=await pipeline();try{
  await h.stores.source.put('folder/file',text('source'));
  h.context.listObjectsPage=async()=>({objects:[],truncated:true,cursor:''});
  await assert.rejects(h.context.transferExplorerObjects({...h.request,entries:[{key:'folder/',folder:true}],conflict:'keep'}),/existence could not be confirmed/);assert.equal(h.calls.length,0);
  let reads=0;h.context.listObjectsPage=async()=>{reads++;return {objects:[{key:'occupied'}]};};
  await assert.rejects(h.context.transferExplorerObjects({...h.request,entries:[{key:'folder/',folder:true}],conflict:'keep'}),/available directory name/);assert.equal(reads,65);assert.equal(h.calls.length,0);
 }finally{h.restore();}
});

test('remote ingest exact-folder capability preserves Unicode, reserved characters and repeated separators',async()=>{
 const worker=(await workerModule()).default,bucket=new MemoryBucket(),originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response('new image',{headers:{'content-type':'image/png'}});
 try{
  const caps=await(await worker.fetch(manageRequest({action:'capabilities'}),{STORAGE:bucket})).json();assert.equal(caps.exactIngestPaths,true);
  const folder='works/...2/雪 #?%//deep',r=await(await worker.fetch(manageRequest({sourceUrl:'https://fixture.invalid/photo.png',filename:'photo.png',folder,exactFolder:true}),{STORAGE:bucket})).json();
  assert.equal(r.ok,true,r.error);assert.equal(r.key,folder+'/photo.png');assert.ok(await bucket.head(folder+'/photo.png'));assert.equal(bucket.objects.size,1);
 }finally{globalThis.fetch=originalFetch;}
});

test('laboratory exact creation is bounded, conditional, empty-safe and prefix restricted',async()=>{
  const {default:worker}=await workerModule(); const storage=new MemoryBucket();
  const env={STORAGE:storage};
  const key='__redown_test__/12345678-1234-1234-1234-123456789abc/nested/Unicode #.bin';
  const create=(key,body)=>worker.fetch(new Request('https://bucket.workers.dev/',{method:'POST',headers:{authorization:'Bearer test-secret','x-redown-action':'lab-create','x-redown-key':encodeURIComponent(key)},body}),env);
  const first=await create(key,text('original'));assert.equal(first.status,200);assert.equal((await first.json()).key,key);
  const conflict=await create(key,text('replacement'));assert.equal(conflict.status,409);assert.equal(new TextDecoder().decode(storage.objects.get(key).bytes),'original');
  const empty=await create(key+'.empty',new Uint8Array());assert.equal(empty.status,200);assert.equal(storage.objects.get(key+'.empty').size,0);
  assert.equal((await create('unrelated/object',text('unsafe'))).status,403);
  assert.equal((await create(key+'.large',new Uint8Array(65537))).status,413);
  assert.equal(storage.objects.has(key+'.large'),false);
});
