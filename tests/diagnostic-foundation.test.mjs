import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createDiagnosticAPI} from '../agent/diagnostics/api.mjs';
import {evaluateRegression} from '../scripts/reliability-policy.mjs';
const known={file:'tests/fixture.test.mjs',name:'known historical assertion',error:{code:'ERR_ASSERTION',operator:'strictEqual'}};
const baseline={failures:[known]},failure={type:'fail',...known},pass={type:'pass',file:known.file,name:known.name};
test('regression ratchet retains explicit debt and rejects new, renamed or changed failure types',()=>{
 const check=events=>evaluateRegression({events,baseline,exitCode:1});
 assert.equal(check([failure]).state,'partial');assert.equal(check([failure,{...failure,name:'new failure'}]).state,'failed');assert.equal(check([{...failure,error:{code:'ERR_ASSERTION',operator:'deepStrictEqual'}}]).state,'failed');assert.equal(check([{...failure,file:'tests/other.test.mjs'}]).state,'failed');
});
test('incomplete, timed-out and malformed test executions cannot satisfy the gate',()=>{
 for(const args of [{events:[],exitCode:0},{events:[pass],exitCode:null},{events:[pass],exitCode:1},{events:[failure],exitCode:0},{events:[failure],exitCode:1,executionError:true},{events:[{...pass,skipped:true}],exitCode:0},{events:[failure,failure],exitCode:1}])assert.equal(evaluateRegression({...args,baseline}).state,'failed');
 const resolved=evaluateRegression({events:[pass],baseline,exitCode:0});assert.equal(resolved.state,'passed');assert.equal(resolved.baselineResolved.length,1);
});
test('unified diagnostics discovers existing namespaces without advertising execution',()=>{
 const api=createDiagnosticAPI(),d=api.query('describe');assert.equal(d.data.execution,false);assert.equal(d.data.liveAccess,false);assert.equal(d.data.namespaces.length,5);assert.equal(api.query('repair').state,'failed');assert.equal(api.query('describe',{command:'rm'}).error.code,'INVALID_INPUT');d.data.namespaces.length=0;assert.equal(api.query('describe').data.namespaces.length,5);
});
test('project map reports current source and explicit coverage gaps without claiming total understanding',()=>{
 const result=createDiagnosticAPI().query('getProjectMap');assert.equal(result.state,'partial');assert.ok(result.data.subsystems.every(s=>s.source.state==='present'&&/^[a-f0-9]{64}$/.test(s.source.sha256)));assert.match(result.data.subsystems.find(s=>s.id==='local-bridge').boundary,/No general/);
});
test('single entry point routes operation contracts, test plans, failures and absent evidence honestly',()=>{
 const api=createDiagnosticAPI();assert.equal(api.query('explainOperation',{name:'move'}).data.result.data.name,'move');assert.match(api.query('getOperationTrace',{id:'missing'}).data.evidenceBoundary,/No runtime bundle/);assert.equal(api.query('getOperationTrace',{id:'missing'}).state,'unavailable');assert.deepEqual(api.query('getTestPlan',{preset:'transfers'}).data.command,['node','scripts/explorer-smoke.mjs','--preset','transfers']);assert.equal(api.query('getTestPlan',{preset:'; bad'}).error.code,'UNKNOWN_PRESET');assert.equal(api.query('inspectFailure',{code:'EXPLORER_PERMISSION_DENIED'}).data.result.state,'available');assert.equal(api.query('getReleaseReadiness').data.decisions.publicLaunch,'blocked');
});
test('diagnostic CLI rejects unknown flags and malformed bundles without echoing secrets',()=>{
 const run=spawnSync(process.execPath,['agent/diagnostics/cli.mjs','describe','--unknown','SECRET_TOKEN'],{encoding:'utf8'});assert.equal(run.status,2);assert.equal(JSON.parse(run.stdout).error.code,'INVALID_INPUT_OR_BUNDLE');assert.doesNotMatch(run.stdout,/SECRET_TOKEN/);
});

test('verification report inspection is read-only, bounded and never certifies a release',()=>{
 const result=createDiagnosticAPI().query('getVerificationStatus');assert.ok(['partial','unavailable'].includes(result.state));if(result.state==='partial'){assert.equal(result.data.release,'blocked');assert.match(result.data.authority,/unauthenticated/);}
});
