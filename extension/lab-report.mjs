import canonicalCodes from './file-engine/diagnostic-codes.mjs';
// Bounded presentation projection. Python owns acceptance; this is not a mutation API.
export const LAB_NAMES = Object.freeze(['INVENTORY_COMPLETE','SCOPE_AUTHORIZED','UPLOAD_VERIFIED','READ_VERIFIED','METADATA_VERIFIED','COVERAGE_LIMITED','AUTH_INTERRUPTED','WRITE_UNCERTAIN','RECOVERY_REQUIRED','ACCEPTANCE_INCOMPLETE']);
const stages = new Set(['Performing preflight','Inventorying files','Hashing local files','Checking authorization','Checking provider capabilities','Preparing test plan','Testing uploads','Verifying downloaded bytes','Checking metadata','Testing copies','Testing directory markers','Recording evidence','Finalizing report']);
const number = x => Number.isSafeInteger(x) && x >= 0 && x <= 1e12;
const explanations = ['All discovered eligible files were inventoried and hashed.','The extension approved the selected test scope; provider permissions are checked per operation.','Uploaded content passed byte and SHA-256 readback verification.','Remote bytes and disk readback matched the expected size and SHA-256.','Remote object size matched the expected source size.','Some coverage is excluded or unavailable.','Authentication or connection lifecycle interrupted operations.','A mutation outcome remains uncertain.','Explicit recovery or reauthorization is required.','Required acceptance conditions remain unsatisfied.'];
const actions = [null,null,null,null,null,'Review exclusions; large-file streaming is unsupported.','Check lifecycle diagnostics and approve a new pairing.','Preserve the checkpoint; reconcile read-only. Never replay writes.','Resolve the blocker and reconcile before a fresh namespace run.','Review outstanding findings; selected-case success is not full acceptance.'];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function projectLabSummary(s, roots, observed = {}) {
  const keys=['format','runId','acceptance','stage','bucket','finished','blocked','completedCases','totalCases','counts','verifiedUploads','verifiedReads','verifiedBytes','excludedFiles','exclusions','codes','problem','nextAction','provenance','findings','omittedFindingGroups'];
  if (!s || typeof s!=='object' || Object.keys(s).some(k=>!keys.includes(k)) || new TextEncoder().encode(JSON.stringify(s)).length>16384 || s.format!=='redown.lab.summary.v1' || !uuid.test(s.runId) || s.acceptance!=='INCOMPLETE' || !stages.has(s.stage) || !roots.some(r=>r.container===s.bucket) || typeof s.finished!=='boolean' || typeof s.blocked!=='boolean') throw Error('INVALID_LAB_REPORT');
  for(const k of ['completedCases','totalCases','verifiedUploads','verifiedReads','verifiedBytes','excludedFiles']) if(!number(s[k])) throw Error('INVALID_LAB_REPORT');
  if(s.completedCases>s.totalCases || !s.counts || Object.keys(s.counts).sort().join()!==['BLOCKED','FAIL','INDETERMINATE','NOT_TESTED','PASS'].join() || Object.values(s.counts).some(v=>!number(v)) || Object.values(s.counts).reduce((a,b)=>a+b,0)!==s.completedCases) throw Error('INVALID_LAB_REPORT');
  if(s.verifiedUploads>(observed.uploads||0) || s.verifiedReads>(observed.reads||0) || s.verifiedBytes>(observed.readBytes||0)) throw Error('UNATTESTED_LAB_VERIFICATION');
  if(!Array.isArray(s.codes) || s.codes.length>10) throw Error('INVALID_LAB_REPORT');
  const codes=s.codes.map(c=>{
    const n=Number(String(c.code).slice(4))-1;
    if(c.code!==`LAB-${String(n+1).padStart(3,'0')}` || n<0 || n>=10 || c.name!==LAB_NAMES[n] || !['PASS','NOT_TESTED','BLOCKED','INDETERMINATE','INCOMPLETE'].includes(c.outcome) || !['confirmed','inferred','unknown'].includes(c.certainty) || !Array.isArray(c.evidenceRefs) || c.evidenceRefs.length>4 || c.evidenceRefs.some(r=>typeof r!=='string'||! /^(inventory|providerCapabilities|destinationRoot|plan\/(missing|untested)|unsupported|connectionError|results(\/[0-9]{1,6})?|pendingOperation|retryRecovery|acceptance|coverage|plan)$/.test(r))) throw Error('INVALID_LAB_REPORT');
    if(n===1 && !observed.scopeAuthorized || n===2 && !s.verifiedUploads || n===3 && !s.verifiedReads || n===4 && !(observed.metadata||0)) throw Error('UNATTESTED_LAB_VERIFICATION');
    // Never display client strings or arbitrary measurement labels, even from approved clients.
    const measurements={};
    for(const k of ['files','bytes','roots','operations','excludedFiles','transportMaxBytes','unsupportedOperations','affectedCases','blockedCases','uncertainWrites','failed','blocked','indeterminate','untestedCases']) if(number(c.measurements?.[k])) measurements[k]=c.measurements[k];
    if(n===2) {measurements.operations=s.verifiedUploads;if((measurements.bytes||0)>(observed.uploadBytes||0)) throw Error('UNATTESTED_LAB_VERIFICATION');}
    if(n===3) {measurements.operations=s.verifiedReads;measurements.bytes=s.verifiedBytes;}
    if(n===4 && (measurements.operations||0)>(observed.metadata||0)) throw Error('UNATTESTED_LAB_VERIFICATION');
    return {code:c.code,name:LAB_NAMES[n],outcome:c.outcome,explanation:explanations[n],measurements,evidenceRefs:c.evidenceRefs,nextAction:actions[n],certainty:c.certainty};
  });
  if(new Set(codes.map(c=>c.code)).size!==codes.length) throw Error('INVALID_LAB_REPORT');
  const priority=[7,6,8,9,5].map(n=>codes.find(c=>c.name===LAB_NAMES[n])).find(Boolean);
  const allowedCodes=new Set([...canonicalCodes,'UPLOAD_NOT_VERIFIED','CANCELLED_OR_PRIOR_UNCERTAINTY','SEPARATE_WRITE_APPROVAL_REQUIRED','SELECT_AUTHORIZED_LAB_BUCKET','LOCAL_SOURCE_CHANGED','ATLAS_CORRELATION_MISMATCH','RESPONSE_CONTRACT_MISMATCH']);
  if(s.findings!==undefined && (!Array.isArray(s.findings)||s.findings.length>20)) throw Error('INVALID_LAB_REPORT');
  const findings=(s.findings||[]).map(f=>{
    if(!['FAIL','BLOCKED','INDETERMINATE','NOT_TESTED'].includes(f.outcome)||!['list','upload','read','metadata','copy','mkdir'].includes(f.operation)||!allowedCodes.has(f.code)||!number(f.count)||!Array.isArray(f.evidenceRefs)||f.evidenceRefs.length>3||f.evidenceRefs.some(r=>!/^results\/[0-9]{1,6}$/.test(r))) throw Error('INVALID_LAB_REPORT');
    return {outcome:f.outcome,operation:f.operation,code:f.code,count:f.count,evidenceRefs:f.evidenceRefs};
  });
  const exclusions={};
  for(const k of ['BOUNDED_TRANSPORT_LIMIT','QUICK_SAMPLE','FILE_BYTE_LIMIT','TOTAL_HASH_BYTE_LIMIT','UNREADABLE_OR_CHANGED','LINK_OR_NONREGULAR','OUTSIDE_ROOT','LINK_OR_JUNCTION_OR_INACCESSIBLE','INACCESSIBLE_DIRECTORY','SCAN_ENTRY_LIMIT_REMAINDER_NOT_SCANNED']) if(number(s.exclusions?.[k])) exclusions[k]=s.exclusions[k];
  return {format:s.format,runId:s.runId,acceptance:s.acceptance,stage:s.stage,bucket:s.bucket,finished:s.finished,blocked:s.blocked,completedCases:s.completedCases,totalCases:s.totalCases,counts:{...s.counts},verifiedUploads:s.verifiedUploads,verifiedReads:s.verifiedReads,verifiedBytes:s.verifiedBytes,excludedFiles:s.excludedFiles,exclusions,findings,omittedFindingGroups:number(s.omittedFindingGroups)?s.omittedFindingGroups:0,codes,problem:priority?.explanation||null,nextAction:priority?.nextAction||null,provenance:'Approved Python report. Python owns acceptance and source/disk hash assertions; extension counters below attest only canonical coordinator evidence.',independentEvidence:{uploads:observed.uploads||0,reads:observed.reads||0,metadata:observed.metadata||0,uploadBytes:observed.uploadBytes||0,readBytes:observed.readBytes||0,providerEvidence:observed.providerEvidence===true}};
}
