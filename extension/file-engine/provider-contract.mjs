import validateProvider from './provider-validator.mjs';
// Provider model 1.0.0. Locators are owned by adapters, never interpreted as universal paths.
export const PROVIDER_CONTRACT_VERSION='1.0.0';
export const OPTIONAL_FEATURES=['nativeDirectories','caseSensitive','duplicateNames','stableIds','nativeSearch','recursiveListing','pagination','rangeReads','streamingReads','streamingUploads','multipart','serverCopy','serverMove','conditionalWrites','revisionDelete','conflictSafeRename','timestamps','metadataRead','metadataWrite','sharedLinks','trash','restore','notifications','quotas','rateLimits'];
export const OPTIONAL_OPERATIONS=['sync','incremental','resume','trash','restore','sharedLink','setMetadata','readStream','writeStream'];
const problem=code=>Object.assign(Error(code),{code});
export function validateLocator(id){
 if(!id||typeof id!=='object'||Array.isArray(id)||Object.keys(id).some(k=>!['provider','account','container','locator'].includes(k)))throw problem('INVALID_IDENTITY');
 for(const k of ['provider','account','container'])if(typeof id[k]!=='string'||!id[k]||id[k].length>128)throw problem('INVALID_IDENTITY');
 if(!id.locator||typeof id.locator!=='object'||Array.isArray(id.locator)||Object.getPrototypeOf(id.locator)!==Object.prototype||JSON.stringify(id.locator).length>4096||!Object.keys(id.locator).length||Object.values(id.locator).some(v=>typeof v!=='string'||v.length>2048))throw problem('INVALID_IDENTITY');
 return structuredClone(id);
}
export const pathModel=Object.freeze({
 directory:id=>({...id,key:id.key.endsWith('/')?id.key:id.key+'/'}),
 validate(id){if(typeof id.key!=='string'||id.key.startsWith('/')||/[\u0000-\u001f\\]/.test(id.key)||id.key.split('/').some(x=>x==='.'||x==='..')||new TextEncoder().encode(id.key).length>1024)throw problem('INVALID_IDENTITY');},
 same:(a,b)=>['provider','account','container','key'].every(k=>a[k]===b[k]),
 identity:(m,base)=>({...base,key:m.key}),
 child:(parent,name,folder=false)=>({...parent,key:parent.key+name+(folder?'/':'')}),
 name:m=>m.key.replace(/\/$/,'').split('/').at(-1),
 contains:(scope,id)=>['provider','account','container'].every(k=>scope[k]===id[k])&&(scope.key===id.key||(!scope.key||scope.key.endsWith('/'))&&id.key.startsWith(scope.key)),
 matchesMetadata:(m,id)=>m.key===id.key,
});
export const modelFor=adapter=>adapter.identityModel||pathModel;
export function providerDescription(adapter){
 const custom=adapter.manifest;if(custom){if(!validateProvider(custom)||custom.contractVersion!==PROVIDER_CONTRACT_VERSION||custom.provider!==adapter.id||!custom.features||OPTIONAL_FEATURES.some(k=>typeof custom.features[k]!=='boolean')||!Array.isArray(custom.authentication)||!Array.isArray(custom.checksums))throw problem('INVALID_PROVIDER_CONTRACT');return structuredClone(custom);}
 const real=adapter.capabilities.realProvider,features=Object.fromEntries(OPTIONAL_FEATURES.map(k=>[k,false]));
 Object.assign(features,{caseSensitive:true,recursiveListing:true,pagination:true,rangeReads:true,metadataRead:true,conditionalWrites:!!adapter.capabilities.atomicCreate,revisionDelete:!!adapter.capabilities.atomicConditionalDelete,conflictSafeRename:!!adapter.capabilities.atomicConditionalDelete});
 return {contractVersion:PROVIDER_CONTRACT_VERSION,provider:adapter.id,realProvider:real,identity:{model:'exact-object-key',directories:'prefix',root:{key:''}},features,checksums:['sha256-client-readback'],authentication:[real?'leased-worker-bearer':'owner-process'],consistency:'Provider-specific; fresh readback required',limits:{maxBytes:adapter.capabilities.maxBytes||2097152},operations:{list:'implemented',metadata:'implemented',read:'implemented',upload:'implemented',copy:'coordinator',mkdir:'prefix-marker',move:features.revisionDelete?'coordinator':'unsupported',rename:features.revisionDelete?'coordinator':'unsupported',delete:features.revisionDelete?'implemented':'unsupported',ingest:typeof adapter.ingest==='function'?'implemented':'unsupported',...Object.fromEntries(OPTIONAL_OPERATIONS.map(k=>[k,'unsupported']))}};
}
export function createProviderRegistry(bindings){
 const adapters=[...new Set(bindings.map(b=>b.adapter))],roots=new Set();
 for(const b of bindings){providerDescription(b.adapter);b.adapter.assertIdentity(b.root);const key=JSON.stringify(b.root);if(roots.has(key))throw problem('DUPLICATE_PROVIDER_ROOT');roots.add(key);}
 return Object.freeze({adapters,describe:()=>bindings.map(b=>({root:structuredClone(b.root),label:b.label||b.adapter.id,...providerDescription(b.adapter)})),async contains(scope,id){
  if(!['provider','account','container'].every(k=>scope[k]===id[k]))return false;
  for(const b of bindings.filter(b=>b.adapter.id===id.provider)){try{b.adapter.assertIdentity(scope);b.adapter.assertIdentity(id);const model=modelFor(b.adapter);if(await model.contains(b.root,scope)&&await model.contains(scope,id))return true;}catch{}}
  return false;
 }});
}
