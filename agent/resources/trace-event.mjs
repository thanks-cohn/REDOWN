// Chrome Trace Event JSON interoperability, not OTLP or per-thread CPU attribution.
import {validateResourceBundle} from '../../extension/file-engine/resources.mjs';
export function exportTraceEvents(bundle){
 if(!validateResourceBundle(bundle))throw Error('INVALID_RESOURCE_BUNDLE');
 const traceEvents=[];
 bundle.traces.forEach((trace,index)=>{
  const tid=index+1;
  traceEvents.push({name:trace.operation,cat:'redown.operation',ph:'X',pid:1,tid,ts:Date.parse(trace.startedAt)*1000,dur:trace.durationMs*1000,args:{operationId:trace.operationId,state:trace.state,incomplete:trace.state==='running'}});
  for(const span of trace.spans)traceEvents.push({name:span.phase,cat:'redown.phase',ph:'X',pid:1,tid,ts:Date.parse(span.at)*1000-span.durationMs*1000,dur:span.durationMs*1000,args:{operationId:trace.operationId,source:span.source,error:span.error,...(span.httpStatus?{httpStatus:span.httpStatus,transferBytes:span.transferBytes,throughputBps:span.throughputBps}:{})}});
 });
 return {traceEvents,displayTimeUnit:'ms',metadata:{format:'Chrome Trace Event JSON',boundary:'Logical operation lanes, not operating-system threads. Span starts reconstructed from completion wall timestamp minus monotonic measured duration. Clock adjustments and millisecond timestamps limit alignment. Nested spans overlap. No CPU, layout/paint or Worker measurements are inferred.'}};
}
