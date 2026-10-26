import test from 'node:test';
import assert from 'node:assert/strict';
import {projectLabSummary,LAB_NAMES} from '../extension/lab-report.mjs';
import {authorizeLab} from '../extension/lab-session.mjs';
const root={provider:'extension-r2',account:'fixture',container:'test-1-new',key:''};
const runId='11111111-1111-4111-8111-111111111111';
function summary(){return {format:'redown.lab.summary.v1',runId,acceptance:'INCOMPLETE',stage:'Performing preflight',bucket:root.container,finished:false,blocked:false,completedCases:0,totalCases:5,counts:{PASS:0,FAIL:0,BLOCKED:0,INDETERMINATE:0,NOT_TESTED:0},verifiedUploads:0,verifiedReads:0,verifiedBytes:0,excludedFiles:0,exclusions:{},codes:[],problem:null,nextAction:null,provenance:'SECRET'};}
test('report projection rejects spoofed verification, oversized data and unsafe references',()=>{
 const s=summary();s.verifiedUploads=1;
 assert.throws(()=>projectLabSummary(s,[root]),/UNATTESTED/);
 s.verifiedUploads=0;s.codes=[{code:'LAB-003',name:LAB_NAMES[2],outcome:'PASS',certainty:'confirmed',evidenceRefs:['results/1'],explanation:'SECRET',measurements:{operations:1}}];
 assert.throws(()=>projectLabSummary(s,[root]),/UNATTESTED/);
 s.codes=[];s.problem='SECRET';s.nextAction='SECRET';s.exclusions={SECRET:12};
 assert.ok(!JSON.stringify(projectLabSummary(s,[root])).includes('SECRET'));
 s.extra='forbidden';assert.throws(()=>projectLabSummary(s,[root]));delete s.extra;
 s.problem='x'.repeat(16384);assert.throws(()=>projectLabSummary(s,[root]));
 s.problem=null;s.bucket='another-bucket';assert.throws(()=>projectLabSummary(s,[root]));
});
test('same-session canonical evidence bounds reports, deduplicates replay and revocation blocks reports',async()=>{
 const objects=new Map(),reports=[];let calls=0;
 const grant=authorizeLab({roots:[root],write:true,isCurrent:()=>true,onLabReport:r=>reports.push(r),
 createObject:async(i,b)=>{calls++;objects.set(i.key,b)},request:async(path,options={})=>{
   calls++;
   if(path.includes('?')){const prefix=new URL('https://fixture'+path).searchParams.get('prefix')||'';return Response.json({result:[...objects].filter(([k])=>k.startsWith(prefix)).map(([key,b])=>({key,size:b.length,etag:'r1'}))});}
   const key=path.split('/objects/')[1]?.split('/').map(decodeURIComponent).join('/');
   const b=objects.get(key);return b?new Response(options.method==='HEAD'?null:b,{headers:{etag:'r1','content-length':String(b.length)}}):new Response(null,{status:404});
 }});
 const info=(await grant.query('describe')).data;
 const request={apiVersion:'0.3.0',operation:'upload',idempotencyKey:'same',destination:{...info.locations[0],key:info.writePrefix+runId+'/uploads/x'},content:'abc'};
 const job=(await grant.query('execute',{request})).data;assert.equal(job.state,'completed');
 await grant.query('execute',{request});
 const s=summary();s.verifiedUploads=1;s.codes=[{code:'LAB-003',name:LAB_NAMES[2],outcome:'PASS',certainty:'confirmed',evidenceRefs:['results/1'],explanation:'SECRET',measurements:{operations:1,SECRET:2}}];
 const before=calls;assert.equal((await grant.query('labReport',{summary:s})).state,'available');assert.equal(calls,before,'report cannot perform provider requests');
 assert.equal(reports[0].independentEvidence.uploads,1);assert.ok(!JSON.stringify(reports).includes('SECRET'));
 const falseBytes={...s,verifiedBytes:999};assert.equal((await grant.query('labReport',{summary:falseBytes})).error.code,'UNATTESTED_LAB_VERIFICATION');
 s.verifiedUploads=2;assert.equal((await grant.query('labReport',{summary:s})).error.code,'UNATTESTED_LAB_VERIFICATION');
 s.verifiedUploads=1;s.runId=crypto.randomUUID();assert.equal((await grant.query('labReport',{summary:s})).error.code,'UNATTESTED_LAB_VERIFICATION');
 grant.revoke();assert.equal((await grant.query('labReport',{summary:summary()})).error.code,'AUTHORIZATION_REVOKED');
});
test('progress uses bounded fixed stages without provider operations',async()=>{
 let progress;const grant=authorizeLab({roots:[root],isCurrent:()=>true,onLabReport:()=>{},onLabProgress:p=>progress=p,request:()=>{throw Error('No request allowed')}});
 assert.equal((await grant.query('labReport',{progress:{stage:'Hashing local files',completed:2221}})).state,'available');
 assert.equal(progress.hashedFiles,2221);assert.equal(progress.totalCases,undefined);
 assert.equal((await grant.query('labReport',{progress:{stage:'SECRET',completed:0}})).error.code,'INVALID_LAB_REPORT');
});
