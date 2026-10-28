// Local deterministic session benchmark. No browser rendering or cloud requests.
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createFileApi} from '../extension/beta/file-api.mjs';
const ref=process.argv[2];
const file='extension/beta/test-it-session.mjs';
const code=(ref?execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8'}):await readFile(new URL('../'+file,import.meta.url),'utf8')).replace("'./file-api.mjs'",JSON.stringify(new URL('../extension/beta/file-api.mjs',import.meta.url).href));
const {createPracticeSession}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const source={accountId:'local',bucketName:'memory',prefix:''};
const bytes=Buffer.alloc(1024*1024,7),sha256=createHash('sha256').update(bytes).digest('hex');
const identity=key=>JSON.stringify(['local','memory',key]);
function fixture(count){
 let inspections=0,writes=0,serializedBytes=0;const objects=new Map();
 const object={etag:'etag',size:bytes.length,version:'v1',uploaded:'2026-10-01T00:00:00Z'};
 const record=key=>({id:key,sessionId:'bench',identity:identity(key),source,key,object,sha256,stamp:JSON.stringify([object.etag,object.size,object.uploaded,object.version])});
 objects.set('original',object);
 const saved={version:1,id:'bench',index:count,records:Array.from({length:60},(_,i)=>({exerciseId:i+1,verdict:i<count?'PASSED':'NOT_TESTED'})),originals:[record('original')],objects:Array.from({length:count},(_,i)=>{objects.set('copy'+i,object);return record('copy'+i);}),destinations:[],pending:null};
 const adapter={inspect:async({key})=>{inspections++;return objects.has(key)?{object:objects.get(key),sha256:createHash('sha256').update(bytes).digest('hex')}:{object:null};},stat:async({key})=>({object:objects.get(key)||null}),copy:async({entries,destination})=>{const key=destination.prefix+'original',dest={...object,version:'v2'};objects.set(key,dest);return {completed:1,results:[{sourceKey:entries[0].key,destinationKey:key,status:'copied',verified:true,size:bytes.length,destinationEtag:dest.etag,destinationVersion:dest.version}]};}};
 const api=createFileApi(adapter),session=createPracticeSession({api,saved,approve:async()=>true,storage:{set:async value=>{writes++;serializedBytes+=JSON.stringify(value).length;}}});api.setPolicy(session);session.active=true;
 return {api,session,counts:()=>({inspections,writes,serializedBytes})};
}
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
const results=[];
for(const transitions of [0,20,40,60]){
 const samples=[],heaps=[],counts=[];
 for(let i=0;i<15;i++){
  const f=fixture(transitions),start=performance.now(),heap=process.memoryUsage().heapUsed;
  const result=await f.api.run('copy',{source,destination:{...source,prefix:'new/'},entries:[{key:'original'}],conflict:'skip'});
  if(result.state!=='completed')throw Error(JSON.stringify(result));
  samples.push(performance.now()-start);heaps.push(process.memoryUsage().heapUsed-heap);counts.push(f.counts());
 }
 const f=fixture(transitions);await Promise.all(Array.from({length:20},()=>f.session.saveProgress?.()||f.session.save()));
 results.push({transitions,p50Ms:percentile(samples,.5),p95Ms:percentile(samples,.95),copy:counts[0],progressWritesFor20Calls:f.counts().writes,heapDeltaP50Bytes:percentile(heaps,.5)});
}
console.log(JSON.stringify({ref:ref||'working',environment:process.version,boundary:'Local Node memory-provider benchmark; 1 MiB SHA-256 reads. No network, GUI, browser memory, or live R2 latency measured. Checkpoints seed owned-copy counts, not 60 participant GUI exercises. Heap deltas include GC noise.',samplesPerCheckpoint:15,results},null,2));
