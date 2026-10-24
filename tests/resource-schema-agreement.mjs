import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {validateResourceBundle} from '../extension/file-engine/resources.mjs';
const original=JSON.parse(await readFile('verification/resources/evidence.json','utf8'));
const schema=JSON.parse(await readFile('agent/resources/evidence.schema.json','utf8'));
test('published evidence contract and compiled runtime agree on recursive required fields, types, boundaries and legacy evidence',()=>{
 const cases=[{name:'historical producer evidence',value:original,valid:true},{name:'empty valid bundle',value:{resourceApiVersion:'1.0.0',traces:[]},valid:true}];
 const add=(name,mutate,valid=false)=>{const value=structuredClone(original);mutate(value);cases.push({name,value,valid});};
 function inspect(spec,value,path=[]){
  if(spec.$ref)return inspect(schema.$defs[spec.$ref.split('/').at(-1)],value,path);
  if(spec.anyOf){for(const s of spec.anyOf)if(s.type!=='null')inspect(s,value,path);return;}
  const target=b=>path.reduce((v,k)=>v[k],b);
  if(spec.type==='object'&&value&&typeof value==='object'){
   for(const key of spec.required||[])add('missing '+[...path,key].join('.'),b=>{delete target(b)[key];});
   add('unknown '+path.join('.'),b=>{target(b).unknown='PRIVATE';});
   for(const [key,v] of Object.entries(value))if(spec.properties?.[key])inspect(spec.properties[key],v,[...path,key]);
  }
  if(spec.type==='array'&&value?.length)inspect(spec.items,value[0],[...path,0]);
  if(spec.type==='number'||spec.type==='integer')add('wrong number '+path.join('.'),b=>{const p=path.slice(0,-1).reduce((v,k)=>v[k],b);p[path.at(-1)]='0';});
 }
 inspect(schema,original);
 add('wrong version',b=>{b.resourceApiVersion='2.0.0';});
 add('invalid date',b=>{b.traces[0].startedAt='2026-99-99T00:00:00Z';});
 add('wrong state type',b=>{b.traces[0].state=null;});
 add('secret in unavailable',b=>{b.traces[0].memoryBefore.unavailable.push('Bearer SECRET');});
 for(const n of [64,65])add(n+' traces',b=>{b.traces=Array.from({length:n},()=>structuredClone(b.traces[0]));delete b.snapshot;},n===64);
 for(const n of [96,97])add(n+' spans',b=>{b.traces=[b.traces[0]];b.traces[0].spans=Array.from({length:n},()=>structuredClone(b.traces[0].spans[0]));},n===96);
 const python=spawnSync('python',['-c',`import json,sys\nfrom jsonschema import Draft202012Validator,FormatChecker\ns=json.load(open('agent/resources/evidence.schema.json'))\nv=Draft202012Validator(s,format_checker=FormatChecker())\nprint(json.dumps([v.is_valid(c['value']) for c in json.load(sys.stdin)]))`],{input:JSON.stringify(cases),encoding:'utf8'});
 assert.equal(python.status,0,python.stderr);
 const independent=JSON.parse(python.stdout);
 cases.forEach((c,i)=>{assert.equal(validateResourceBundle(c.value),c.valid,c.name);assert.equal(independent[i],c.valid,'independent '+c.name);});
 assert.equal(validateResourceBundle({resourceApiVersion:'1.0.0',traces:[],snapshot:NaN}),false);
 console.log(JSON.stringify({contract:schema.$id,cases:cases.length,independentValidator:'Python jsonschema 4.26.0'}));
});

test('direct resource queries enforce the same method-specific input contracts as the gateway',async()=>{
 const {queryResources}=await import('../extension/file-engine/resources.mjs');
 const contracts=JSON.parse(await readFile('agent/resources/contracts.json','utf8'));
 for(const operation of contracts.operations){const method=operation.id.split('.').at(-1);for(const input of [null,[],3,{unknown:true}])assert.equal(queryResources(original,method,input).error.code,'INVALID_INPUT',method);}
 for(const method of ['getTrace','getMemoryProfile','getLatencyBreakdown','explainSlowdown','compareRuns'])assert.equal(queryResources(original,method,{}).error.code,'INVALID_INPUT',method);
 assert.equal(queryResources(original,'listTraces',{limit:-1}).error.code,'INVALID_INPUT');
 assert.equal(queryResources(original,'getTrace',{operationId:original.traces[0].operationId}).state,'available');
});

test('imported resource API returns detached snapshots and memory observations',async()=>{
 const {createResourceAPI}=await import('../agent/resources/api.mjs');const api=createResourceAPI({resourceBundle:original});
 const before=api.query('snapshot');const edited=api.query('snapshot');edited.data.memory.heapBytes=0;
 assert.deepEqual(api.query('snapshot'),before);const id=original.traces[0].operationId;
 const memory=api.query('getMemoryProfile',{operationId:id});memory.data.before.heapBytes=0;assert.equal(api.query('getMemoryProfile',{operationId:id}).data.before.heapBytes,original.traces[0].memoryBefore.heapBytes);
});
