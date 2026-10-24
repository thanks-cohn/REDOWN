// Trusted owner composition only. Clients receive the scoped session, never these handles.
import {readFileSync} from 'node:fs';
import {createFileEngine,METHODS,fail} from '../../extension/file-engine/engine.mjs';
import {createProviderRegistry} from '../../extension/file-engine/provider-contract.mjs';
import {memoryAdapter} from '../../extension/file-engine/adapters/memory.mjs';
import {nativeReferenceAdapter,seedNativeReference} from '../../extension/file-engine/adapters/native-reference.mjs';
import {r2HttpAdapter,LAB_BUCKETS} from '../../extension/file-engine/adapters/r2-http.mjs';
import {initialState} from '../../extension/file-engine/simulation.mjs';
import {fileStore} from '../../scripts/r2-lab/file-store.mjs';
import {createFileSession} from './api.mjs';
export const adapterFactories=new Map([
 ['simulation',async(store,c)=>({adapter:memoryAdapter(store,c.provider||'fake-r2'),roots:[{provider:c.provider||'fake-r2',account:'demo',container:'sandbox',key:''}]})],
 ['native-reference',async(store)=>{await store.update(s=>{if(!s.nativeObjects?.some(n=>n.provider==='native-reference'))seedNativeReference(s);});return {adapter:nativeReferenceAdapter(store),roots:[{provider:'native-reference',account:'reference',container:'drive',locator:{id:'root'}}]};}],
 ['r2-worker',async(store,c)=>{const authorization=c.authorizationEnv&&process.env[c.authorizationEnv];if(!authorization)throw fail('CREDENTIAL_REQUIRED');return {adapter:r2HttpAdapter({...c,authorization}),roots:LAB_BUCKETS.map(container=>({provider:'r2-lab',account:'lab',container,key:c.prefix}))};}]
]);
export async function bootstrap({profile,operations,journal,config}={}){
 const settings=config||{adapters:!profile||profile==='simulation'?[{type:'simulation',provider:'fake-r2'},{type:'simulation',provider:'fake-drive'}]:[{type:profile}]};
 if(!Array.isArray(settings.adapters)||!settings.adapters.length||settings.adapters.length>16)throw fail('INVALID_CONFIGURATION');
 let state=initialState();const store=journal?fileStore(journal):{read:async()=>structuredClone(state),update:async fn=>fn(state)};
 const bindings=[];for(const c of settings.adapters){const factory=adapterFactories.get(c.type);if(!factory)throw fail('UNSUPPORTED_PROVIDER');const binding=await factory(store,c);for(const root of binding.roots)bindings.push({adapter:binding.adapter,root});}
 // Registry allows many roots for the same registered adapter instance.
 const registry=createProviderRegistry(bindings);
 const policy=structuredClone(settings.scope||{operations:operations||['list','metadata','read'],locations:bindings.map(b=>b.root),maxOperations:100});
 if(settings.scope&&operations)policy.operations=policy.operations.filter(op=>operations.includes(op));
 const expiration=settings.expiresAt?Date.parse(settings.expiresAt):Infinity;if(!Number.isFinite(expiration)&&expiration!==Infinity)throw fail('INVALID_CONFIGURATION');
 const authorize=async r=>{if(Date.now()>=expiration||!policy.operations.includes(r.operation)&&!['recover'].includes(r.operation))return false;for(const id of [r.source,r.destination].filter(Boolean)){let ok=false;for(const scope of policy.locations)if(await registry.contains(scope,id)){ok=true;break;}if(!ok)return false;}return true;};
 const engine=createFileEngine({store,adapters:registry.adapters,authorize});
 // Restart records uncertainty; it never resumes or replays provider writes.
 if(journal)await engine.recover();
 return createFileSession({engine,scope:policy});
}
export const readOwnerConfig=path=>{try{return JSON.parse(readFileSync(path,'utf8'));}catch{throw fail('INVALID_CONFIGURATION');}};
