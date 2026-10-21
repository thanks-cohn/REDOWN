import {mkdir,writeFile} from 'node:fs/promises';
import {createRuntimeDiagnostics} from '../agent/runtime/api.mjs';
const api=createRuntimeDiagnostics({context:'offline',build:'contract-fixture'});api.setEnabled(true);api.record({operation:'api.read',outcome:'failed',code:'HTTP_403',status:403});
await mkdir('work/runtime-contracts',{recursive:true});
for(const operation of ['describe','snapshot','listTraces','exportSupport','clear'])await writeFile(`work/runtime-contracts/${operation}.json`,JSON.stringify(api.query(operation))+'\n');
