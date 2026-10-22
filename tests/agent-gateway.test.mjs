import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDiagnosticAPI} from '../agent/diagnostics/api.mjs';
import {registry,operations,resolveOperation,validateStructure} from '../agent/diagnostics/registry.mjs';
import {createAgentApi} from '../agent/api.mjs';
import {createExplorerAPI,createCollector} from '../agent/explorer/api.mjs';
import {createRuntimeDiagnostics} from '../agent/runtime/api.mjs';

test('all five native APIs route through qualified discovery with exact native versions and no registry drift',()=>{
 const api=createDiagnosticAPI(),r=registry();assert.equal(api.query('validateRegistry').state,'available');
 for(const ns of r.namespaces){const result=api.query(ns.id+'.'+(ns.id==='explorer'?'describeExplorer':'describe'));assert.notEqual(result.state,'failed');assert.equal(result.data.namespace,ns.id);assert.equal(result.data.result[ns.versionField],ns.version);}
 assert.equal(operations().length,52);assert.equal(api.query('listOperations',{limit:100}).data.total,52);
});
test('overlapping methods never silently select a namespace; compatibility aliases have explicit owners',()=>{
 const api=createDiagnosticAPI();const ambiguous=api.query('projectOverview');assert.equal(ambiguous.error.code,'AMBIGUOUS_OPERATION');assert.deepEqual(ambiguous.data.candidates,['project.projectOverview','semantic.projectOverview']);
 assert.equal(api.query('resolveOperation',{name:'explainOperation'}).data.operation.id,'explorer.explainOperation');assert.equal(api.query('resolveOperation',{name:'project.explainOperation'}).data.operation.id,'project.explainOperation');
 const list=api.query('listOperations',{namespace:'project',offset:0,limit:2});assert.equal(list.data.operations.length,2);assert.equal(list.data.nextOffset,2);assert.equal(api.query('listOperations',{limit:0}).error.code,'INVALID_INPUT');
});
test('delegation preserves historical provenance and freshness, rather than upgrading stale source evidence',()=>{
 const expected=createAgentApi().query('projectOverview');const actual=createDiagnosticAPI().query('project.projectOverview');assert.deepEqual(actual.data.result,expected);assert.equal(actual.state,'partial');assert.equal(actual.data.authority,'historical-source-catalog');
 const semantic=createDiagnosticAPI().query('semantic.listEntities',{kind:'capability',limit:2});assert.equal(semantic.data.namespace,'semantic');assert.equal(semantic.data.result.semanticApiVersion,'0.1');
 const debug=createDiagnosticAPI().query('debug.listIncidents');assert.equal(debug.data.result.debugApiVersion,'0.1');assert.ok(Array.isArray(debug.data.result.data));
});
test('read-only boundary rejects mutation, namespace injection, extra arguments and unsupported versions',()=>{
 const api=createDiagnosticAPI();for(const name of ['runtime.clear','explorer.runReadOnlyProbe','cloudflare.delete','__proto__.describe','constructor.constructor'])assert.equal(api.query(name).state,'failed');
 assert.equal(api.query('runtime.clear').error.code,'OPERATION_NOT_EXPOSED');assert.equal(api.query('runtime.snapshot',{repair:true}).error.code,'INVALID_INPUT');assert.equal(api.query('project.describe',{apiVersion:'999'}).state,'failed');assert.equal(api.query('semantic.listEntities',{limit:-1}).error.code,'INVALID_INPUT');assert.equal(api.query('explorer.explainOperation',{name:'move',token:'SECRET'}).error.code,'INVALID_INPUT');
});
test('registry audit detects duplicate operation ownership, dangling aliases and duplicate primary owners',()=>{
 const r=registry();r.namespaces[0].operations.push(r.namespaces[0].operations[0]);r.aliases.dangling='missing.method';r.ownership.push({...r.ownership[0]});const codes=validateStructure(r).findings.map(f=>f.code);assert.ok(codes.includes('DUPLICATE_OPERATION'));assert.ok(codes.includes('INVALID_ALIAS'));assert.ok(codes.includes('MULTIPLE_OWNERS'));const leaked=operations();leaked.find(op=>op.id==='explorer.explainOperation').arguments.name.required=false;assert.equal(createDiagnosticAPI().query('explorer.explainOperation').error.code,'INVALID_INPUT');
});
test('Explorer and passive runtime imports remain isolated and re-sanitized',()=>{
 const c=createCollector({context:'options'});c.setEnabled(true);const id=c.begin('copy');c.record(id,{stage:'api.response',component:'cloudflare',outcome:'failed',httpStatus:403,endpoint:'api.object'});c.finish(id,'failed',{code:'EXPLORER_PERMISSION_DENIED'});const bundle=c.exportBundle();
 const runtime=createRuntimeDiagnostics({context:'offline'});runtime.setEnabled(true);runtime.record({operation:'api.read',outcome:'failed',code:'HTTP_403',token:'PRIVATE_TOKEN',url:'https://private.example/'});const runtimeBundle=runtime.query('exportSupport').data;
 const api=createDiagnosticAPI({bundle,runtimeBundle});assert.deepEqual(api.query('explorer.getRecentFailures').data.result,createExplorerAPI({bundle}).query('getRecentFailures'));
 const events=api.query('runtime.listTraces').data.result;assert.equal(events.data.events.length,1);assert.equal(events.data.events[0].code,'HTTP_403');assert.doesNotMatch(JSON.stringify(events),/PRIVATE_TOKEN|private.example/);
 assert.equal(createDiagnosticAPI().query('runtime.listTraces').state,'unavailable');
});
test('a malformed namespace bundle cannot break project discovery or another namespace',()=>{
 const api=createDiagnosticAPI({bundle:{invalid:true}});assert.equal(api.query('describe').state,'available');assert.equal(api.query('runtime.describe').state,'available');assert.equal(api.query('explorer.describeExplorer').error.code,'NAMESPACE_QUERY_FAILED');
});
test('cold agent can discover, resolve, inspect ownership, plan tests and see release blockers without network access',()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('network forbidden');};
 try{const api=createDiagnosticAPI();for(const step of api.query('getStartGuide').data.steps){const result=api.query(step.operation,step.input);assert.notEqual(result.state,'failed');}assert.equal(api.query('getOwnership',{subject:'explorer.trace'}).data.owners[0].owner,'explorer.getOperationTrace');assert.equal(api.query('getOwnership',{subject:'invented'}).state,'unavailable');assert.ok(api.query('getOwnership').data.unimplemented.includes('accepted Forever Works purpose model'));}finally{globalThis.fetch=original;}
});
test('unified CLI supports namespace routing and explicit runtime import; refuses ambiguous or conflicting inputs',()=>{
 const dir=mkdtempSync(join(tmpdir(),'redown-gateway-'));
 try{const file=join(dir,'runtime.json');writeFileSync(file,JSON.stringify({schemaVersion:'1.0.0',events:[]}));
  const run=(...args)=>spawnSync(process.execPath,['agent/diagnostics/cli.mjs',...args],{encoding:'utf8'});
  const imported=run('runtime.snapshot','--runtime-bundle',file);assert.equal(imported.status,0);assert.equal(JSON.parse(imported.stdout).data.namespace,'runtime');assert.equal(run('projectOverview').status,2);
  const invalid=run('describe','--bundle',file,'--explorer-bundle',file);assert.equal(invalid.status,2);assert.doesNotMatch(invalid.stdout,/runtime.json/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('every registered operation has a cold-start fixture and preserves a native result or an explicit evidence boundary',async()=>{
 const {gatewayFixtures}=await import('../scripts/agent-gateway-fixtures.mjs');const cases=gatewayFixtures();
 for(const item of cases.slice(0,operations().length)){assert.notEqual(item.result.error?.code,'NAMESPACE_QUERY_FAILED',item.operation);assert.notEqual(item.result.error?.code,'UNSUPPORTED_OPERATION',item.operation);assert.notEqual(item.result.error?.code,'INVALID_INPUT',item.operation);assert.ok(['available','partial','unavailable','failed'].includes(item.result.state));}
 assert.equal(cases.length,operations().length+4);
});
