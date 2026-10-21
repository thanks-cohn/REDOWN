import {readFile} from 'node:fs/promises';
import {createRuntimeDiagnostics,inspectBundle} from './api.mjs';
try {
  const [operation='describe',file]=process.argv.slice(2);
  const api=file?inspectBundle(JSON.parse(await readFile(file,'utf8'))):createRuntimeDiagnostics({context:'offline'});
  const result=api.query(operation);
  console.log(JSON.stringify(result,null,2));
  process.exitCode=["failed","unsupported"].includes(result.state)?2:result.state==="unavailable"?3:0;
} catch {console.error(JSON.stringify({runtimeApiVersion:'1.0.0',state:'failed',code:'INVALID_BUNDLE'}));process.exitCode=1;}
