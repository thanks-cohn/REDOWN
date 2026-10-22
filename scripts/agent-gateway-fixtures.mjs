// Offline contract fixtures. The registry is the operation inventory; no copied provider logic.
import {createDiagnosticAPI} from '../agent/diagnostics/api.mjs';
import {operations} from '../agent/diagnostics/registry.mjs';
export function gatewayFixtures(){
 const api=createDiagnosticAPI();
 const cases=operations().map(op=>{
  const input={};for(const [key,spec] of Object.entries(op.arguments))if(spec.required){
   input[key]=spec.type==='array'?['extension/options.js']:key==='caseId'?'DBG-001':key==='code'?'EXPLORER_PERMISSION_DENIED':key==='preset'?'diagnostics':key==='name'?op.namespace==='diagnostics'?'explorer.explainOperation':'copy':key==='id'?op.namespace==='semantic'?'redown.project':op.namespace==='project'?'context-menu-transfer':'missing': 'fixture';
  }
  return {operation:op.id,input,result:api.query(op.id,input)};
 });
 for(const [operation,input] of [['projectOverview',{}],['runtime.clear',{}],['explorer.explainOperation',{name:'copy',unexpected:true}],['missing.method',{}]])cases.push({operation,input,result:api.query(operation,input)});
 return cases;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])console.log(JSON.stringify(gatewayFixtures()));
