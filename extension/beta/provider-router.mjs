// Selection owns discovery; explicit file identities must match that selection.
// Cross-provider copy requires a separately verified transport, never an R2 fallback.
export function createProviderRouter(providers,initial='r2'){
 let selected=initial;
 const identity=value=>value?.provider==='mega-s4'||value?.accountId?.startsWith('mega-s4:')?'mega-s4':value?.provider||'r2';
 return new Proxy({select(provider){if(!Object.hasOwn(providers,provider))throw Error('Unknown provider.');selected=provider;}},{get(target,key){
  if(key==='select')return target.select;
  if(key==='run')return (operation,input={},options={})=>{
   const locations=[input.source,input.destination].filter(Boolean);
   if(locations.some(l=>identity(l)!==selected))return Promise.resolve({state:'failed',code:'PROVIDER_IDENTITY_MISMATCH',error:'Switch to the matching provider. Cross-provider transfer is not verified.'});
   return providers[selected].run(operation,input,options);
  };
  if(key==='batch')return (operation,items,options={})=>{if(items.some(input=>[input.source,input.destination].filter(Boolean).some(l=>identity(l)!==selected)))return Promise.resolve({state:'partial',results:items.map(()=>({state:'failed',code:'PROVIDER_IDENTITY_MISMATCH',error:'Cross-provider transfer is not verified.'})),processed:0,total:items.length});return providers[selected].batch(operation,items,options);};
  const value=providers[selected][key];return typeof value==='function'?value.bind(providers[selected]):value;
 }});
}
