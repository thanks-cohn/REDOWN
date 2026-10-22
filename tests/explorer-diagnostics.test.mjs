import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,randomUUID} from 'node:crypto';
import {createCollector,createExplorerAPI} from '../agent/explorer/api.mjs';
const source={accountId:'PRIVATE_ACCOUNT',bucketName:'PRIVATE_BUCKET'},key='nested//雪 #?%.txt';
function harness(){const api=createCollector({cryptoApi:webcrypto,extensionVersion:'0.5.13'});api.setEnabled(true);return api;}
test('identity HMAC preserves exact keys, compares only equal scopes and exports no names or secrets',async()=>{
 const api=harness(),id=api.begin('copy');await api.identity(id,source,key);await api.identity(id,source,key);const events=api.getOperationTrace(id).events;assert.equal(events[0].key,events[1].key);assert.equal(events[0].bucket,events[1].bucket);assert.notEqual(events[0].key,events[0].encodedKey);
 const other=harness(),otherId=other.begin('copy');await other.identity(otherId,source,key);assert.notEqual(other.getOperationTrace(otherId).events[0].key,events[0].key);
 api.record(id,{stage:'source.read',component:'worker',status:404,outcome:'failed',token:'SECRET',url:'https://private.invalid',key:'PRIVATE_NAME'});const text=JSON.stringify(api.exportBundle());assert.doesNotMatch(text,/PRIVATE_|SECRET|private.invalid|雪/);assert.equal(api.getOperationTrace(id).events.at(-1).key,undefined);
});
test('404 is an observation; deterministic diagnosis compares API successes without inventing a root cause',async()=>{
 const api=harness(),copy=api.begin('copy'),preview=api.begin('preview');await api.identity(copy,source,key);await api.identity(preview,source,key);api.record(copy,{stage:'source.read',component:'worker',status:404,mechanism:'worker',outcome:'failed'});api.finish(copy,'failed',{status:404,stage:'source.read',component:'worker'});api.finish(preview,'confirmed');
 const result=api.diagnose(copy);assert.equal(result.rootCause,'unknown');assert.ok(result.findings.some(f=>f.code==='API_WORKER_PATH_DIVERGENCE'));assert.deepEqual(result.relatedSuccesses,[preview]);assert.equal(result.findings[0].code,'EXPLORER_HTTP_NOT_FOUND');
});
test('same-scope key disagreement is confirmed while unrelated scopes cannot establish mismatch',async()=>{
 const api=harness(),id=api.begin('copy'),requestId=randomUUID();await api.identity(id,source,key,{requestId});await api.identity(id,source,key.replace('//','/'),{requestId});assert.ok(api.diagnose(id).findings.some(f=>f.code==='EXPLORER_SOURCE_KEY_MISMATCH'));
});
test('bounded collector rejects malformed and oversized imports atomically, preserving prior observations',()=>{
 const api=harness(),id=api.begin('copy');api.record(id,{stage:'intent',component:'options',outcome:'started'});const bundle=api.exportBundle(),before=JSON.stringify(bundle.operations);
 const malformed=structuredClone(bundle);malformed.operations.push({...bundle.operations[0],id:randomUUID(),events:[{stage:'arbitrary',component:'worker'}]});assert.throws(()=>api.ingest(malformed),/INVALID_EXPLORER_EVENT/);assert.equal(JSON.stringify(api.exportBundle().operations),before);
 assert.throws(()=>api.ingest({...bundle,explorerDiagnosticVersion:'99'}));assert.throws(()=>api.ingest({...bundle,secret:'x'.repeat(262144)}));assert.equal(api.record(id,{stage:'bogus',component:'worker'}),false);
});
test('retention, event caps, disabled collection and restart interruption are explicit',()=>{
 let time=0;const api=createCollector({now:()=>time});api.setEnabled(true);const id=api.begin('move');for(let i=0;i<80;i++)api.record(id,{stage:'state',component:'options',outcome:'started'});assert.equal(api.getOperationTrace(id).events.length,64);assert.equal(api.getOperationTrace(id).truncated,true);
 const restarted=harness();restarted.ingest(api.exportBundle(),{restart:true});assert.equal(restarted.getOperationTrace(id),null,'expired fixture is pruned, not silently freshened');
 const restore=createCollector({now:()=>time});restore.setEnabled(true);restore.ingest(api.exportBundle(),{restart:true});assert.equal(restore.getOperationTrace(id).state,'unknown');assert.equal(restore.getOperationTrace(id).error.code,'EXPLORER_RESTART_INTERRUPTED');
 time=86400001;assert.equal(api.getOperationTrace(id),null);api.setEnabled(false);assert.equal(api.begin('copy'),null);
});
test('portable agent API preserves evidence IDs and has no execution or network capabilities',()=>{
 const core=harness(),id=core.begin('copy');core.record(id,{stage:'source.read',component:'worker',outcome:'failed',status:404});core.finish(id,'failed',{status:404});const api=createExplorerAPI({bundle:core.exportBundle()});
 assert.equal(api.query('getOperationTrace',{id}).data.id,id);assert.equal(api.query('diagnoseOperation',{id}).data.rootCause,'unknown');assert.equal(api.query('getOperationTrace',{id:randomUUID()}).state,'unavailable');assert.equal(api.query('shell').error.code,'UNSUPPORTED_OPERATION');assert.equal(api.query('getExplorerState',null).state,'failed');assert.ok(api.query('listExplorerOperations').data.length>=23);
});
