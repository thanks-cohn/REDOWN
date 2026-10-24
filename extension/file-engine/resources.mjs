import * as inputValidators from './resource-input-validators.mjs';
import validateEvidence from './resource-evidence-validator.mjs';
// Resource Atlas 1.0: allowlisted measurements only. Never accept request metadata or locations.
export const RESOURCE_VERSION='1.0.0';
export const RESOURCE_METHODS=['describe','snapshot','listTraces','getTrace','getLatencyBreakdown','getMemoryProfile','getBottlenecks','explainSlowdown','compareRuns','exportEvidence'];
const clock=()=>performance.now();
const code=e=>/^[A-Z_0-9]{1,64}$/.test(e?.code||'')?e.code:'UNCLASSIFIED';
const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,128}$/.test(id);
export function memorySample(){
 const heap=globalThis.performance?.memory;
 const node=globalThis.process?.release?.name==='node'?globalThis.process.memoryUsage():null;
 return {at:new Date().toISOString(),heapBytes:node?.heapUsed??heap?.usedJSHeapSize??null,processBytes:node?.rss??null,externalBytes:node?.external??null,arrayBufferBytes:node?.arrayBuffers??null,provenance:node?'node.process.memoryUsage':heap?'chromium.performance.memory':'unavailable',unavailable:['worker-memory','per-operation-heap-attribution','cpu-percent','object-url-lifecycle-not-used-by-beta','thumbnail-cache-not-implemented','worker-cpu','exclusive-journal-lock-wait',...(!node?['process-memory','external-memory','array-buffer-memory']:[]),...(!node&&!heap?['js-heap']:[])]};
}
export function createResourceAtlas({store,enabled=true,maxTraces=64,maxSpans=96,slowMs=100,now=clock}={}){
 maxTraces=Math.max(1,Math.min(64,maxTraces));maxSpans=Math.max(1,Math.min(96,maxSpans));
 const traces=[],active=new Map(),resources=new Map();let storage='memory-only',storageFailures=0,dropped=0;
 const ready=store?store.read().then(s=>{const saved=s.resourceAtlas;if(saved?.resourceApiVersion===RESOURCE_VERSION&&Array.isArray(saved.traces)){for(const t of saved.traces.slice(-maxTraces)){if(validateResourceBundle({resourceApiVersion:RESOURCE_VERSION,traces:[t]}))traces.push(structuredClone(t));}storage='restored';}}).catch(()=>{storage='unavailable';storageFailures++;}):Promise.resolve();
 const persist=async()=>{if(!store)return;try{await store.update(s=>{const merged=new Map((s.resourceAtlas?.resourceApiVersion===RESOURCE_VERSION?s.resourceAtlas.traces||[]:[]).filter(validTrace).map(t=>[t.operationId,t]));for(const t of traces)merged.set(t.operationId,t);s.resourceAtlas={resourceApiVersion:RESOURCE_VERSION,traces:structuredClone([...merged.values()].slice(-maxTraces))};});storage='persisted';}catch{storage='unavailable';storageFailures++;}};
 const snapshot=()=>({memory:memorySample(),resources:Object.fromEntries([...resources].map(([k,v])=>[k,{count:v.count,bytes:v.bytes}])),storage,storageFailures,active:active.size,dropped,limits:{maxTraces,maxSpans},scope:'whole runtime memory; counters cover explicitly instrumented owners only'});
 const trim=()=>{while(traces.length>maxTraces){const i=traces.findIndex(t=>!active.has(t.operationId));if(i<0)break;traces.splice(i,1);dropped++;}};
 const api={ready,enabled,
 async begin(operation,id=crypto.randomUUID()){
  await ready;if(!enabled)return null;if(!safeId(id)||! /^(list|metadata|read|upload|ingest|mkdir|copy|move|rename|delete|startup|interaction|benchmark)$/.test(operation))throw Error('INVALID_RESOURCE_OPERATION');
  if(active.size>=maxTraces){dropped++;return null;}
  const t={operationId:id,operation,startedAt:new Date().toISOString(),durationMs:0,state:'running',spans:[],droppedSpans:0,memoryBefore:memorySample(),memoryAfter:null,resourcesBefore:snapshot().resources,resourcesAfter:null};
  traces.push(t);active.set(id,{trace:t,start:now(),releases:[]});trim();await persist();return id;
 },
 async span(id,phase,source,fn){const start=now();try{const value=await fn();api.record(id,phase,source,start);return value;}catch(error){api.record(id,phase,source,start,code(error));throw error;}},
 record(id,phase,source,start,error=null){const entry=active.get(id),t=entry?.trace||traces.find(t=>t.operationId===id);if(!t||!enabled)return;if(!PHASES.includes(phase)||!SOURCES.includes(source))return;if(t.spans.length>=maxSpans){t.droppedSpans++;return;}t.spans.push({phase,source,at:new Date().toISOString(),durationMs:Math.max(0,now()-start),error:error&&/^[A-Z_0-9]{1,64}$/.test(error)?error:null});},
 annotateNetwork(id,httpStatus,transferBytes){const t=active.get(id)?.trace;const span=t?.spans.findLast(s=>s.phase==='network.decode');if(span&&Number.isInteger(httpStatus)&&httpStatus>=100&&httpStatus<=599&&Number.isSafeInteger(transferBytes)&&transferBytes>=0){span.httpStatus=httpStatus;span.transferBytes=transferBytes;span.throughputBps=span.durationMs>0?transferBytes/(span.durationMs/1000):null;}},
 mark(id,phase,source,fn){const start=now();try{return fn();}finally{api.record(id,phase,source,start);}},
 async finish(id,state='completed',error=null){const entry=active.get(id);if(!entry)return;const t=entry.trace;for(const release of entry.releases)release();t.durationMs=Math.max(0,now()-entry.start);t.state=['completed','failed','uncertain','cancelled','partially_completed','blocked_authorization'].includes(state)?state:'failed';t.error=error&&/^[A-Z_0-9]{1,64}$/.test(error)?error:null;t.memoryAfter=memorySample();t.resourcesAfter=snapshot().resources;active.delete(id);trim();await persist();},
 track(kind,bytes=0){if(!KINDS.includes(kind)||!Number.isSafeInteger(bytes)||bytes<0)throw Error('INVALID_RESOURCE');const v=resources.get(kind)||{count:0,bytes:0};v.count++;v.bytes+=bytes;resources.set(kind,v);let released=false;return ()=>{if(released)return;released=true;v.count--;v.bytes-=bytes;};},
 adapter(id,adapter){return new Proxy(adapter,{get(target,key){const value=target[key];if(typeof value!=='function'||!['stat','list','read','create','delete','ingest'].includes(key))return value;return (...args)=>{if(['read','list','delete'].includes(key)&&args.length===1)args.push({});if(key==='create'&&args.length===2)args.push({});return api.span(id,'provider','extension/file-engine/adapters/',async()=>{const result=await value.apply(target,[...args,{resourceTrace:{atlas:api,id}}]);if(result?.bytes instanceof Uint8Array){const release=api.track('transfer-buffer',result.bytes.byteLength);if(active.has(id))active.get(id).releases.push(release);else release();}return result;});};}});},
 store(id,backing=store){return {read:()=>api.span(id,'journal.read','extension/file-engine/engine.mjs',()=>backing.read({resourceTrace:{atlas:api,id}})),update:fn=>api.span(id,'journal.update','extension/file-engine/engine.mjs',()=>backing.update(fn,{resourceTrace:{atlas:api,id}}))};},
 query(method,input={}){return queryResources({resourceApiVersion:RESOURCE_VERSION,traces:structuredClone(traces),snapshot:snapshot()},method,input);},
 snapshot,
 async exportEvidence(){await ready;return api.query('exportEvidence').data;},
 async close(){await ready;await persist();}
 };return api;
}
export const PHASES=['provider','network','network.decode','journal.read','journal.update','journal.lock','journal.queue','verification','ui.render','ui.preview','ui.input','startup','main-thread.longtask','persistence'];
export const SOURCES=['extension/file-engine/engine.mjs','extension/file-engine/adapters/','extension/file-engine/adapters/r2-http.mjs','extension/beta-explorer.mjs','extension/file-engine/indexeddb-store.mjs'];
export const KINDS=['transfer-buffer','metadata-cache','thumbnail-cache','preview','object-url','event-listener','queue','journal'];
function validTrace(t){return validateResourceBundle({resourceApiVersion:RESOURCE_VERSION,traces:[t]});}
export function validateResourceBundle(bundle){
 try{return new TextEncoder().encode(JSON.stringify(bundle)).byteLength<=1048576&&validateEvidence(bundle);}catch{return false;}
}
export function queryResources(bundle,method,input={}){
 const result=(state,data,error)=>({resourceApiVersion:RESOURCE_VERSION,state,...(data?{data}:{}),...(error?{error:{code:error}}:{})});
 if(!RESOURCE_METHODS.includes(method))return result('failed',null,'UNSUPPORTED_OPERATION');
 if(!inputValidators[method](input))return result('failed',null,'INVALID_INPUT');
 if(method==='describe')return result('available',{operations:RESOURCE_METHODS,authorization:'Owner runtime collects locally; gateway imports explicit evidence read-only. No execution, credentials or remote access.',sourceRefs:SOURCES,phases:PHASES,counters:KINDS,errors:['INVALID_INPUT','INVALID_RESOURCE_BUNDLE','RESOURCE_TRACE_NOT_FOUND','RESOURCE_EVIDENCE_UNAVAILABLE'],limits:{maxTraces:64,maxSpans:96},semantics:'Nested provider/network spans overlap; never sum them as exclusive time. Memory is process-wide, not allocation attribution.'});
 if(!bundle)return result('unavailable',null,'RESOURCE_EVIDENCE_UNAVAILABLE');
 if(!validateResourceBundle(bundle))return result('failed',null,'INVALID_RESOURCE_BUNDLE');
 const traces=bundle.traces;
 const breakdown=t=>{const phases={};for(const s of t.spans){const p=phases[s.phase]||{count:0,totalMs:0,maxMs:0};p.count++;p.totalMs+=s.durationMs;p.maxMs=Math.max(p.maxMs,s.durationMs);phases[s.phase]=p;}return {operationId:t.operationId,durationMs:t.durationMs,phases,overlap:true,truncated:t.droppedSpans>0};};
 const bottlenecks=t=>t.spans.filter(s=>s.durationMs>=100||s.error).map(s=>({operationId:t.operationId,...s,classification:s.error?'failure':'slow-span',possibleCause:s.phase.startsWith('journal')?'Journal serialization, persistence or contention; inspect store-specific evidence':s.phase==='network'?'Transport/provider wait; server processing and network cannot be separated here':'Measured phase exceeded 100ms; finer attribution unavailable'}));
 if(method==='snapshot')return result(bundle.snapshot?'available':'unavailable',bundle.snapshot||null,bundle.snapshot?null:'RESOURCE_EVIDENCE_UNAVAILABLE');
 if(method==='exportEvidence')return result('available',structuredClone(bundle));
 if(method==='listTraces'){const offset=input.offset||0,limit=Math.min(input.limit||25,64);return result('available',{traces:traces.slice(offset,offset+limit).map(({spans,memoryBefore,memoryAfter,resourcesBefore,resourcesAfter,...t})=>t),total:traces.length,nextOffset:offset+limit<traces.length?offset+limit:null});}
 if(method==='getBottlenecks'){
  const growth=[];for(const kind of KINDS){const points=traces.filter(t=>t.resourcesAfter?.[kind]).slice(-5).map(t=>t.resourcesAfter[kind].bytes);if(points.length>=3&&points.every((n,i)=>i===0||n>points[i-1]))growth.push({kind,classification:'repeated-retained-resource-growth',samples:points,possibleCause:'Instrumented owner retained increasing bytes across completed workloads; intentional caching remains possible.'});}
  const heaps=traces.filter(t=>t.memoryAfter?.heapBytes!=null).slice(-5).map(t=>t.memoryAfter.heapBytes);
  if(heaps.length>=3&&heaps.every((n,i)=>i===0||n>heaps[i-1]))growth.push({kind:'whole-runtime-heap',classification:'possible-growth',samples:heaps,possibleCause:'GC timing, concurrent tasks, caching or leak; not proof of a leak.'});
  return result('available',{findings:traces.flatMap(bottlenecks).slice(-128),growth,thresholdMs:100});
 }
 if(method==='compareRuns'){const a=traces.find(t=>t.operationId===input.before),b=traces.find(t=>t.operationId===input.after);return a&&b?result('available',{before:a.operationId,after:b.operationId,durationDeltaMs:b.durationMs-a.durationMs,heapDeltaDifferenceBytes:a.memoryAfter?.heapBytes!=null&&b.memoryAfter?.heapBytes!=null?(b.memoryAfter.heapBytes-b.memoryBefore.heapBytes)-(a.memoryAfter.heapBytes-a.memoryBefore.heapBytes):null,comparable:a.operation===b.operation,uncertainty:'Single observations; environment and GC uncontrolled. Use repeated harness runs for inference.'}):result('unavailable',null,'RESOURCE_TRACE_NOT_FOUND');}
 const t=traces.find(t=>t.operationId===input.operationId);if(!t)return result('unavailable',null,'RESOURCE_TRACE_NOT_FOUND');
 if(method==='getTrace')return result('available',{...structuredClone(t),interrupted:t.state==='running',interpretation:t.state==='running'?'Incomplete trace: prior runtime may have stopped; no replay authorized':'measured'});
 if(method==='getLatencyBreakdown')return result('available',breakdown(t));
 if(method==='getMemoryProfile')return result('available',{operationId:t.operationId,before:t.memoryBefore,after:t.memoryAfter,resourcesBefore:t.resourcesBefore,resourcesAfter:t.resourcesAfter,heapDeltaBytes:t.memoryAfter?.heapBytes!=null&&t.memoryBefore?.heapBytes!=null?t.memoryAfter.heapBytes-t.memoryBefore.heapBytes:null,interpretation:'Whole-runtime observations; GC and concurrent tasks confound individual deltas. Resource counters measure explicitly owned lifecycles.'});
 return result('available',{facts:breakdown(t),possibleCauses:bottlenecks(t),unavailable:['exclusive CPU time','server-side processing time','GC-normalized allocation attribution'],memory:queryResources(bundle,'getMemoryProfile',input).data});
}

// The collector is an owner capability. Public clients receive detached observations only.
export function resourceReader(atlas){
 return Object.freeze({ready:atlas.ready,query:(method,input)=>structuredClone(atlas.query(method,input)),snapshot:()=>structuredClone(atlas.snapshot()),exportEvidence:()=>atlas.exportEvidence()});
}
