// Static allowlist: namespace/operation identity is never inferred from an implementation filename.
import data from './registry.json' with {type:'json'};
export const registry=()=>structuredClone(data);
export function operations(model=data){return structuredClone([model.gateway,...model.namespaces].flatMap(ns=>ns.operations.map(op=>({...op,id:ns.id+'.'+op.name,namespace:ns.id,version:ns.version||model.gatewayVersion,authority:ns.authority||'offline inspection coordination'}))));}
export function resolveOperation(name,model=data){
 if(typeof name!=='string'||name.length>160)return {error:'INVALID_INPUT'};
 const all=operations(model),alias=Object.hasOwn(model.aliases,name)?model.aliases[name]:null;
 const candidates=all.filter(op=>alias?op.id===alias:name.includes('.')?op.id===name:op.name===name);
 if(candidates.length>1)return {error:'AMBIGUOUS_OPERATION',candidates:candidates.map(op=>op.id)};
 if(!candidates.length)return {error:model.namespaces.some(ns=>ns.excluded.some(op=>ns.id+'.'+op===name))?'OPERATION_NOT_EXPOSED':'UNSUPPORTED_OPERATION'};
 return {operation:candidates[0],...(alias?{alias:name}:{} )};
}
export function validateStructure(model=data){
 const findings=[],all=operations(model),ids=all.map(op=>op.id),names=model.namespaces.map(ns=>ns.id);
 for(const id of new Set(ids))if(ids.filter(v=>v===id).length>1)findings.push({code:'DUPLICATE_OPERATION',id});
 if(new Set(names).size!==names.length||names.includes(model.gateway.id))findings.push({code:'DUPLICATE_NAMESPACE'});
 for(const [alias,id] of Object.entries(model.aliases))if(!ids.includes(id)||alias.includes('.'))findings.push({code:'INVALID_ALIAS',alias});
 const subjects=new Set();for(const item of model.ownership){if(subjects.has(item.subject))findings.push({code:'MULTIPLE_OWNERS',subject:item.subject});subjects.add(item.subject);for(const id of [item.owner,...item.related])if(!ids.includes(id))findings.push({code:'UNKNOWN_OWNER',id});}
 const overlaps=[...new Set(all.map(op=>op.name))].map(name=>({name,operations:all.filter(op=>op.name===name).map(op=>op.id)})).filter(item=>item.operations.length>1);
 return {findings,qualifiedOverlaps:overlaps,operationCount:all.length,namespaceCount:names.length};
}
export function validInput(input,operation){
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 try{if(Buffer.byteLength(JSON.stringify(input))>data.limits.inputBytes)return false;}catch{return false;}
 const args=operation.arguments;
 if(Object.keys(input).some(k=>!Object.hasOwn(args,k)))return false;
 return Object.entries(args).every(([name,spec])=>{const value=input[name];if(value===undefined)return !spec.required;if(spec.type==='string')return typeof value==='string'&&value.length>0&&value.length<=512;if(spec.type==='integer')return Number.isSafeInteger(value)&&value>=0;if(spec.type==='array')return Array.isArray(value)&&value.length<=100&&value.every(v=>typeof v==='string'&&v.length<=512);return false;});
}
