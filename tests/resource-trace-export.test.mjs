import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {exportTraceEvents} from '../agent/resources/trace-event.mjs';
test('Trace Event export preserves measured duration and correlation without inventing CPU or threads',async()=>{
 const bundle=JSON.parse(await readFile('verification/resources/evidence.json','utf8')),result=exportTraceEvents(bundle);
 assert.equal(result.traceEvents.length,bundle.traces.reduce((n,t)=>n+1+t.spans.length,0));
 for(const trace of bundle.traces){const event=result.traceEvents.find(e=>e.cat==='redown.operation'&&e.args.operationId===trace.operationId);assert.equal(event.dur,trace.durationMs*1000);}
 assert.match(result.metadata.boundary,/not operating-system threads/);assert.equal(result.traceEvents.some(e=>'cpu' in e),false);
 const bad=structuredClone(bundle);delete bad.traces[0].memoryBefore;assert.throws(()=>exportTraceEvents(bad),/INVALID_RESOURCE_BUNDLE/);
});
