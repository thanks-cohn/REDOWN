import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createExplorerAPI,createCollector} from '../agent/explorer/api.mjs';
import {fixture,scenarios} from '../scripts/explorer-diagnostic-fixtures.mjs';
for(const name of Object.keys(scenarios))test('safe diagnostic fixture: '+name,async()=>{
 const {bundle,diagnosis}=await fixture(name);assert.equal(bundle.operations[0].origin,'fixture');const result=createExplorerAPI({bundle}).query('getOperationTrace',{id:bundle.operations[0].id});assert.equal(result.state,'available');assert.equal(diagnosis.rootCause,'unknown');assert.ok(diagnosis.findings.some(f=>f.code===scenarios[name][0]));assert.doesNotMatch(JSON.stringify(bundle),/fixture-account|fixture-source|雪|https:\/\//);
});
test('operation tree retains concurrent descendants and malformed/duplicate IDs cannot overwrite imported traces',()=>{
 const collector=createCollector();collector.setEnabled(true);const root=collector.begin('copy'),child=collector.begin('copy',{parentId:root}),other=collector.begin('delete');collector.record(child,{stage:'source.read',component:'worker',status:404,outcome:'failed'});
 assert.deepEqual(collector.getOperationTree(root).descendants.map(op=>op.id),[child]);assert.ok(!collector.getOperationTree(root).descendants.some(op=>op.id===other));assert.ok(collector.diagnose(root).findings.some(f=>f.code==='EXPLORER_HTTP_NOT_FOUND'));
 const data=collector.exportBundle();data.operations.push(data.operations[0]);assert.throws(()=>collector.ingest(data),/DUPLICATE/);
});
test('current architecture references resolve and imported CLI operates outside checkout without executing arbitrary input',()=>{
 const api=createExplorerAPI();assert.deepEqual(api.query('validateArchitecture').data.findings,[]);
 const script=fileURLToPath(new URL('../agent/explorer/cli.mjs',import.meta.url));const run=spawnSync(process.execPath,[script,'explainOperation','--input','{"name":"copy"}'],{cwd:tmpdir(),encoding:'utf8'});assert.equal(run.status,0);assert.equal(JSON.parse(run.stdout).data.name,'copy');
 const invalid=spawnSync(process.execPath,[script,'getOperationTrace','--input','not-json'],{cwd:tmpdir(),encoding:'utf8'});assert.equal(invalid.status,2);assert.equal(JSON.parse(invalid.stdout).error.code,'INVALID_INPUT_OR_BUNDLE');
});
test('actual reported404 case remains open and separates reports, repository and deployed evidence',async()=>{
 const record=JSON.parse(await readFile('docs/explorer/COPY_404_CASE.json','utf8'));assert.equal(record.state,'open');assert.equal(record.versionLayers.installedExtension,'unknown');assert.equal(record.versionLayers.deployedWorker,'unknown');assert.equal(record.resolution,'not established');assert.equal(record.foreverLinks.status,'unknown');
});
