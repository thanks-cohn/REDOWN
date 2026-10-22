// Deterministic, isolated diagnostic simulations. No Chrome installation or cloud access.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCollector} from '../agent/explorer/api.mjs';
export const scenarios={
 'missing-source':['EXPLORER_SOURCE_NOT_FOUND','source.read',404],
 'wrong-key':['EXPLORER_SOURCE_KEY_MISMATCH','source.identity'],
 'wrong-binding':['EXPLORER_BUCKET_CONTEXT_MISMATCH','worker.check'],
 'expired-authorization':['EXPLORER_AUTH_EXPIRED','worker.response',401],
 'worker-version':['EXPLORER_WORKER_CAPABILITY_MISMATCH','worker.check'],
 'unsupported-endpoint':['EXPLORER_HTTP_NOT_FOUND','worker.response',404],
 'network-interruption':['EXPLORER_NETWORK_ERROR','source.read'],
 'source-read':['EXPLORER_SOURCE_NOT_FOUND','source.read',404],
 'destination-write':['EXPLORER_RESULT_UNCONFIRMED','destination.write',500],
 'ambiguous-timeout':['EXPLORER_REQUEST_TIMEOUT','destination.write'],
 'conflict':['EXPLORER_DESTINATION_CONFLICT','destination.write',409],
 'verification-failed':['EXPLORER_COPY_VERIFICATION_FAILED','destination.verify'],
 'interrupted-move':['EXPLORER_RESTART_INTERRUPTED','source.cleanup'],
 'stale-ui':['EXPLORER_UI_STATE_STALE','ui.result'],
 'cross-account':['EXPLORER_BUCKET_CONTEXT_MISMATCH','source.identity'],
 'concurrent-source-change':['EXPLORER_SOURCE_CHANGED','source.cleanup'],
 'nested-key':['EXPLORER_SOURCE_KEY_MISMATCH','source.identity']
};
export async function fixture(name){
 if(!scenarios[name])throw Error('UNKNOWN_FIXTURE');let count=1;
 const api=createCollector({now:()=>1792627200000,id:()=>`00000000-0000-4000-8000-${String(count++).padStart(12,'0')}`,context:'fixture',extensionVersion:'fixture'});api.setEnabled(true);api.useIdentityContext({scope:api.runId,seed:'a'.repeat(64)});
 const [code,stage,status]=scenarios[name],id=api.begin(name==='interrupted-move'?'move':'copy',{origin:'fixture'}),source={accountId:'fixture-account',bucketName:'fixture-source'};await api.identity(id,source,'nested//雪 #?%.txt');
 if(['wrong-key','nested-key'].includes(name))await api.identity(id,source,'nested/雪 #?%.txt');
 if(name==='cross-account')await api.identity(id,{...source,accountId:'fixture-other-account'},'nested//雪 #?%.txt');
 if(name==='wrong-binding')api.record(id,{stage,component:'worker',outcome:'failed',binding:await api.fingerprint('bucket','wrong'),expectedBinding:await api.fingerprint('bucket','expected'),bindingDeclared:true});
 if(name==='worker-version')api.record(id,{stage,component:'worker',outcome:'failed',workerVersion:4,protocol:0,safeTransfers:false});
 api.record(id,{stage,component:'worker',outcome:['ambiguous-timeout','interrupted-move'].includes(name)?'unknown':'failed',status,code});api.finish(id,['ambiguous-timeout','interrupted-move'].includes(name)?'unknown':'failed',{code,status,stage,component:'worker'});
 return {bundle:api.exportBundle(),diagnosis:api.diagnose(id)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const output=resolve(process.argv[2]||'work/explorer-fault-fixtures');await mkdir(output,{recursive:true});for(const name of Object.keys(scenarios)){const result=await fixture(name);await writeFile(`${output}/${name}.json`,JSON.stringify(result.bundle,null,2)+'\n');await writeFile(`${output}/${name}.diagnosis.json`,JSON.stringify(result.diagnosis,null,2)+'\n');}console.log(`${Object.keys(scenarios).length} simulated fixtures generated; no live evidence`);}
