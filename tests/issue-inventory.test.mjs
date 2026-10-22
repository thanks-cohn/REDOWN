import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createIssueInventory,markdownIssues,applyAssessments,readIssueSource} from '../agent/diagnostics/issues.mjs';
import {createDiagnosticAPI} from '../agent/diagnostics/api.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('all existing bug sections are indexed and native incidents retain separate provenance',()=>{
 const api=createDiagnosticAPI(),check=api.query('validateIssues');assert.equal(check.state,'available');
 const reports=api.query('listIssues',{sourceKind:'bug-report',limit:100});const headers=[...readFileSync('bugs/README.md','utf8').matchAll(/^## /gm)];assert.equal(reports.data.total,headers.length);for(let i=1;i<=17;i++)assert.ok(reports.data.issues.some(item=>item.id==='BUG-'+String(i).padStart(3,'0')));
 const historical=api.query('listIssues',{sourceKind:'historical-incident',limit:100});assert.equal(historical.data.total,3);assert.ok(historical.data.issues.every(i=>i.assessment.confidence==='historical'));
 const copy=api.query('getIssue',{id:'EXPLORER-COPY-404-2026-10'});assert.equal(copy.data.issue.state,'open');assert.equal(copy.data.issue.assessment.confidence,'user-report');
});
test('source assessments never close browser-pending issues and stale evidence invalidates the assessment',()=>{
 const original=markdownIssues('## BUG-001 — Example\n\n**Status:** Open\n');const sectionHash=original[0].source.sha256;
 const note={version:'1.0.0',assessments:[{id:'BUG-001',reportSha256:sectionHash,status:'source-implemented',summary:'Local code changed',severity:'high',reviewedOn:'2026-10-22',evidence:[{path:'extension/example.js',symbol:'correct()',sha256:hash('correct()')}],nextAction:'Verify in Chrome'}]};
 const fresh=applyAssessments(structuredClone(original),note,()=> 'correct()');assert.equal(fresh.items[0].state,'open');assert.equal(fresh.items[0].assessment.status,'source-implemented');
 const stale=applyAssessments(structuredClone(original),note,()=> 'changed()');assert.equal(stale.items[0].assessment.status,'needs-revalidation');assert.equal(stale.findings[0].code,'STALE_ASSESSMENT');
 const changedReport=markdownIssues('## BUG-001 — Example\n\n**Status:** Different report\n');assert.equal(applyAssessments(changedReport,note,()=> 'correct()').items[0].assessment.status,'needs-revalidation');
});
test('inventory supports bounded filtering and stable pagination; unknown identifiers and filters fail explicitly',()=>{
 const api=createDiagnosticAPI(),a=api.query('listIssues',{limit:3}),b=api.query('listIssues',{offset:3,limit:3});assert.equal(a.data.nextOffset,3);assert.equal(new Set([...a.data.issues,...b.data.issues].map(i=>i.id)).size,6);
 const critical=api.query('listIssues',{severity:'critical',limit:100});assert.ok(critical.data.issues.every(i=>i.severity==='critical'));assert.ok(critical.data.issues.some(i=>i.id==='CODE-UPLOAD-CONCURRENT-CREATE'));
 assert.equal(api.query('listIssues',{limit:101}).error.code,'INVALID_INPUT');assert.equal(api.query('listIssues',{state:'healthy'}).error.code,'INVALID_INPUT');assert.equal(api.query('getIssue',{id:'missing'}).error.code,'ISSUE_NOT_FOUND');
});
test('malformed inventory sources do not become a clean empty inventory; unsafe paths are rejected',()=>{
 const bad=createIssueInventory({read:()=>{throw Error('PRIVATE_TOKEN');}});assert.equal(bad.findings[0].code,'ISSUE_SOURCE_UNAVAILABLE');assert.doesNotMatch(JSON.stringify(bad),/PRIVATE_TOKEN/);
 const unknown=applyAssessments(markdownIssues('## BUG-001 — Example\n'),{version:'1.0.0',assessments:[{id:'BUG-001',status:'perfect',evidence:[]}]});assert.equal(unknown.findings[0].code,'INVALID_ASSESSMENT');
 for(const path of ['../outside','extension/../../secrets','extension/credentials.json','/etc/passwd'])assert.throws(()=>readIssueSource(path));
});
test('explicit labels are recorded as partly addressed while the omitted-item report stays open',()=>{
 const api=createDiagnosticAPI(),rows=api.query('listIssues',{assessment:'partially-addressed',limit:100}).data.issues;const menu=rows.find(i=>i.title.includes('duplicate'));assert.ok(menu);assert.equal(menu.state,'open');assert.match(menu.assessment.summary,/Missing configured destinations/);
});
