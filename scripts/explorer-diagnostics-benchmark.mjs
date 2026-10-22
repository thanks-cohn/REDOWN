// Local collector microbenchmark only, not installed-extension or UI responsiveness evidence.
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {createCollector} from '../agent/explorer/api.mjs';
const api=createCollector(),timed=(fn,count)=>{const samples=[];for(let i=0;i<count;i++){const t=performance.now();fn();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);return {calls:count,meanMs:samples.reduce((a,b)=>a+b,0)/count,p95Ms:samples[Math.floor(count*.95)],maxMs:samples.at(-1)};};
const disabled=timed(()=>api.record(null,{stage:'state',component:'options'}),10000);api.setEnabled(true);const id=api.begin('copy');const enabled=timed(()=>api.record(id,{stage:'worker.response',component:'worker',outcome:'confirmed',status:200}),1000);
const result={scope:'Local Node collector microbenchmark; capped trace, no Chrome/cloud',node:process.version,disabled,enabled,retainedEvents:api.getOperationTrace(id).events.length,truncated:api.getOperationTrace(id).truncated,exportBytes:Buffer.byteLength(JSON.stringify(api.exportBundle()))};await mkdir('work/explorer-benchmark',{recursive:true});await writeFile('work/explorer-benchmark/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
