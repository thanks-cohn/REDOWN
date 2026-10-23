import {isJsonNumber,compareNumbers,canonicalLossless} from './lossless-json.js';
import {schemas} from './contracts.js';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !isJsonNumber(v);
// This is the bounded subset used by the core schemas, not a general JSON Schema implementation.
export function structural(value, schema, path, errors) {
  const issue = (code, suffix='') => errors.push({code,path:path+suffix,message:`${code} at ${path+suffix}`});
  if (schema.$ref) {
    const [file,fragment] = schema.$ref.split('#');
    schema = schemas[file];
    if(fragment) for(const part of fragment.slice(1).split('/')) schema=schema[part];
  }
  if(schema.type && !({object, array:Array.isArray,string:v=>typeof v==='string',number:v=>isJsonNumber(v)||(typeof v==='number'&&Number.isFinite(v))})[schema.type](value)) {issue('invalid-type');return;}
  if('const' in schema && value!==schema.const) issue('invalid-value');
  if(schema.enum && !schema.enum.includes(value)) issue(path.endsWith('.replacementClassification')?'invalid-classification':'invalid-value');
  if(typeof value==='string' && schema.pattern && !new RegExp(schema.pattern).test(value)) issue('invalid-value');
  if(isJsonNumber(value)){if(('minimum' in schema&&compareNumbers(value,schema.minimum)<0)||('maximum' in schema&&compareNumbers(value,schema.maximum)>0))issue('invalid-value');}
  else if(typeof value==='number' && (value<schema.minimum || value>schema.maximum)) issue('invalid-value');
  if(object(value)) {
    for(const key of schema.required??[]) if(!Object.hasOwn(value,key)) issue('missing-required','.'+key);
    for(const [key,item] of Object.entries(value)) {
      if(schema.propertyNames) structural(key,schema.propertyNames,path+'.'+key,errors);
      if(schema.properties && Object.hasOwn(schema.properties,key)) structural(item,schema.properties[key],path+'.'+key,errors);
      else if(schema.additionalProperties===false) issue('unknown-field','.'+key);
    }
  }
  if(Array.isArray(value)) {
    if(schema.uniqueItems && new Set(value.map(x=>{try{return isJsonNumber(x)?x.canonical():JSON.stringify(x);}catch{return Symbol();}})).size!==value.length) issue('duplicate-value');
    if(schema.items) value.forEach((item,i)=>structural(item,schema.items,`${path}[${i}]`,errors));
  }
}
export function validateStructure(manifest, records) {
  const errors=[];
  structural(manifest,schemas['manifest.schema.json'],'manifest',errors);
  const kinds=Object.fromEntries(Object.values(schemas).filter(s=>s.properties?.kind).map(s=>[s.properties.kind.const,s]));
  if(!Array.isArray(records)) return [...errors,{code:'invalid-type',path:'records',message:'records must be an array'}];
  const ids=new Set();
  records.forEach((record,i)=>{
    const path=`records[${i}]`;
    if(!object(record)) {errors.push({code:'invalid-record',path,message:'record must be an object'});return;}
    const schema=typeof record.kind==='string'&&Object.hasOwn(kinds,record.kind)?kinds[record.kind]:null;
    if(schema) structural(record,schema,path,errors);
    else errors.push({code:'invalid-kind',path:path+'.kind',message:'unknown record kind'});
    if(typeof record.id==='string') {
      if(ids.has(record.id)) errors.push({code:'duplicate-id',path,message:'duplicate ID'});
      ids.add(record.id);
    }
    if(typeof record.foreverVersion!=='string'||!/^0\.[0-9]+$/.test(record.foreverVersion)) errors.push({code:'unsupported-version',path:path+'.foreverVersion',message:'expected supported 0.x version'});
  });
  if(!object(manifest)||typeof manifest.foreverVersion!=='string'||!/^0\.[0-9]+$/.test(manifest.foreverVersion)) errors.push({code:'unsupported-version',path:'manifest.foreverVersion',message:'expected supported 0.x version'});
  return errors;
}
