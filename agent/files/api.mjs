// Owner creates a session; agents receive this facade, never the coordinator or its store.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {readFileSync} from 'node:fs';
import {validateLocator} from '../../extension/file-engine/provider-contract.mjs';
import {FILE_API_VERSION,METHODS,validate,fileIdentity,fail} from '../../extension/file-engine/engine.mjs';
const requestSchema=JSON.parse(readFileSync(new URL('../../extension/file-engine/schema-0.2.json',import.meta.url)));
const ajv=new Ajv({strict:false});addFormats(ajv);
ajv.addSchema(requestSchema);
ajv.addSchema(JSON.parse(readFileSync(new URL('../../extension/file-engine/schema-0.3.json',import.meta.url))));
const validateRequests=['0.2.0','0.3.0'].map(v=>ajv.getSchema(`urn:redown:file-api:${v}#/$defs/request`));
const validateSession=ajv.compile(JSON.parse(readFileSync(new URL('./session.schema.json',import.meta.url))));
const fields=(input,allowed)=>input&&typeof input==='object'&&!Array.isArray(input)&&Object.keys(input).every(k=>allowed.includes(k));
export function createFileSession({engine,scope}={}){
 if(!engine||!fields(scope,['operations','locations','maxOperations'])||!Array.isArray(scope.operations)||!scope.operations.length||scope.operations.some(x=>![...METHODS,'cancel','reconcile'].includes(x))||!Array.isArray(scope.locations)||!scope.locations.length)throw fail('INVALID_SCOPE');
 const policy=structuredClone(scope);
 for(const location of policy.locations)location.locator?validateLocator(location):fileIdentity(location,{root:true});
 const budget=policy.maxOperations??32;if(!Number.isInteger(budget)||budget<1||budget>100)throw fail('INVALID_SCOPE');
 const owned=new Set();let executions=0;
 const locationAllowed=async id=>{for(const scope of policy.locations)if(await engine.contains(scope,id))return true;return false;};
 const permitted=async r=>{if(!policy.operations.includes(r.operation))return false;for(const id of [r.source,r.destination].filter(Boolean))if(!await locationAllowed(id))return false;return true;};
 const checked=async request=>{if(!validateRequests.some(v=>v(request)))throw fail('INVALID_REQUEST');const r=validate(request);if(!await permitted(r))throw fail('AUTHORIZATION_DENIED');if(r.operation==='list'&&(r.limit??50)>100)throw fail('RESPONSE_BUDGET');return r;};
 const jobFor=async id=>{if(typeof id!=='string'||!owned.has(id))throw fail('AUTHORIZATION_DENIED');const job=await engine.inspect(id);if(!job||!await permitted(job.request))throw fail('AUTHORIZATION_DENIED');return job;};
 const query=async(method,input={})=>{
  try{
   if(typeof method!=='string'||!['describe','execute','plan','inspect','evidence','cancel','reconcile','resources','jobs'].includes(method))throw fail('UNSUPPORTED_OPERATION');
   if(!validateSession({method,input}))throw fail('INVALID_INPUT');
   if(!fields(input,['request','id','limit','offset','metric']))throw fail('INVALID_INPUT');
   const required={describe:[],execute:['request'],plan:['request'],inspect:['id'],evidence:['id'],cancel:['id'],reconcile:['id'],resources:['id','metric'],jobs:['limit','offset']};
   if(!Object.hasOwn(required,method))throw fail('UNSUPPORTED_OPERATION');
   if(Object.keys(input).some(k=>!required[method].includes(k)))throw fail('INVALID_INPUT');
   let data;
   if(method==='describe')data={apiVersion:'1.0.0',fileApiVersion:FILE_API_VERSION,transport:'JSON lines over owner-launched stdio or embedded query',operations:policy.operations,locations:policy.locations,providers:engine.describe().providers.filter(p=>policy.locations.some(l=>l.provider===p.id)),methods:Object.keys(required),requestSchema:'extension/file-engine/schema-0.2.json',supportedVersions:engine.describe().supportedVersions,providerContracts:engine.describe().providerContracts.filter(p=>policy.locations.some(l=>l.provider===p.provider)),requestSchemas:['extension/file-engine/schema-0.2.json','extension/file-engine/schema-0.3.json'],limits:{listPage:100,jobPage:25,maxOperations:budget,remaining:budget-executions,maxBytes:2097152},authorization:'Intersection of owner session scope and coordinator authorizer; process possession is the stdio capability',unsupported:['network service','MCP','global recovery','unscoped journal access'],sourceRefs:['agent/files/api.mjs','extension/file-engine/engine.mjs'],testRefs:['tests/file-agent-session.test.mjs']};
   else if(method==='execute'||method==='plan'){
    const request=await checked(input.request);
    if(method==='plan')data=await engine.plan(request,{authorize:permitted});
    else{if(executions>=budget)throw fail('OPERATION_BUDGET');executions++;data=await engine.run(request,{authorize:permitted});owned.add(data.id);}
   }else if(method==='jobs'){
    const limit=input.limit??25,offset=input.offset??0;if(!Number.isInteger(limit)||limit<1||limit>25||!Number.isInteger(offset)||offset<0||offset>budget)throw fail('INVALID_INPUT');
    const ids=[...owned],jobs=[];for(const id of ids.slice(offset,offset+limit)){const j=await jobFor(id);jobs.push({id:j.id,operation:j.request.operation,state:j.state,error:j.error??null});}
    data={jobs,total:ids.length,nextOffset:offset+limit<ids.length?offset+limit:null};
   }else{
    const job=await jobFor(input.id);
    if(method==='inspect')data=job;
    if(method==='evidence')data=await engine.exportEvidence(job.id);
    if(method==='cancel'||method==='reconcile'){if(!policy.operations.includes(method))throw fail('AUTHORIZATION_DENIED');data=await engine[method](job.id);}
    if(method==='resources'){
     if(!['getTrace','getLatencyBreakdown','getMemoryProfile','explainSlowdown'].includes(input.metric))throw fail('INVALID_INPUT');
     data=engine.resources.query(input.metric,{operationId:job.id});
    }
   }
   return {apiVersion:'1.0.0',state:'available',data:structuredClone(data)};
  }catch(error){return {apiVersion:'1.0.0',state:'failed',error:{code:/^[A-Z_0-9]{1,64}$/.test(error?.code||'')?error.code:'INVALID_INPUT'}};}
 };
 return Object.freeze({query});
}
