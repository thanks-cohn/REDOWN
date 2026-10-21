import {createRuntimeDiagnostics} from '../agent/runtime/api.mjs';
const d=createRuntimeDiagnostics();const sample={operation:'api.read',outcome:'success',code:'OK'};
const result={scope:'local-integration',scenario:'10000 small event calls; microbenchmark, not Windows product responsiveness',iterations:10000};
for(const enabled of [false,true]){d.setEnabled(enabled);const start=performance.now();for(let i=0;i<10000;i++)d.record(sample);result[enabled?'enabledMs':'disabledMs']=performance.now()-start;}
result.retained=d.query('exportSupport').data.events.length;result.exportBytes=Buffer.byteLength(JSON.stringify(d.query('exportSupport').data));console.log(JSON.stringify(result,null,2));
