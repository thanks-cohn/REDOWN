import {writeFileSync,mkdirSync} from 'node:fs';
import {createSimulationEngine,initialState} from '../extension/file-engine/simulation.mjs';
let snapshot=initialState();
const engine=createSimulationEngine({read:async()=>snapshot,update:async fn=>fn(snapshot)});
const input={apiVersion:'0.1.0',operation:'copy',idempotencyKey:'schema-fixture',source:{provider:'fake-r2',account:'demo',container:'sandbox',key:'Welcome.txt'},destination:{provider:'fake-drive',account:'demo',container:'sandbox',key:'Copied.txt'}};
const job=await engine.run(input);mkdirSync('work/phase2',{recursive:true});writeFileSync('work/phase2/schema-fixtures.json',JSON.stringify([input,job,...job.events],null,2)+'\n');
