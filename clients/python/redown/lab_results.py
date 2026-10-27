"""Additive redown.lab.summary.v1 projection of the canonical adaptive report.
No provider text, paths, credentials or payloads cross this projection.
"""
from collections import Counter
import json
from pathlib import Path
CANONICAL_CODES=set(json.loads(Path(__file__).with_name("diagnostic.schema.json").read_text())["properties"]["code"]["enum"])
LOCAL_CODES={"LOCAL_MANIFEST_NOT_VERIFIED","INVALID_OR_EXPIRED_OWNER_SCOPE","INVALID_OWNER_CONFIGURATION","EXISTING_JOURNAL_REQUIRES_RECONCILIATION","OWNER_APPROVAL_REQUIRED","INTERACTIVE_SECRET_ENTRY_REQUIRED","INVALID_LEASE_CREDENTIAL","OWNER_ENGINE_CHECKOUT_REQUIRED","AUTHORIZATION_SCOPE_MISMATCH","UPLOAD_NOT_VERIFIED","CANCELLED_OR_PRIOR_UNCERTAINTY","SEPARATE_WRITE_APPROVAL_REQUIRED","SELECT_AUTHORIZED_LAB_BUCKET","LOCAL_SOURCE_CHANGED","ATLAS_CORRELATION_MISMATCH","RESPONSE_CONTRACT_MISMATCH"}

NAMES = ['INVENTORY_COMPLETE','SCOPE_AUTHORIZED','UPLOAD_VERIFIED','READ_VERIFIED',
         'METADATA_VERIFIED','COVERAGE_LIMITED','AUTH_INTERRUPTED','WRITE_UNCERTAIN',
         'RECOVERY_REQUIRED','ACCEPTANCE_INCOMPLETE']
STAGES = {'list':'Checking provider capabilities','upload':'Testing uploads','read':'Verifying downloaded bytes',
          'metadata':'Checking metadata','copy':'Testing copies','mkdir':'Testing directory markers'}

def summarize(report):
    rows=report.get('results',[]); scan=report.get('inventory',{}); plan=report.get('plan',{})
    counts={k:sum(r.get('status')==k for r in rows) for k in ('PASS','FAIL','BLOCKED','INDETERMINATE','NOT_TESTED')}
    codes=[]
    def add(n,outcome,explanation,measurements,refs,action=None,certainty='confirmed'):
        codes.append(dict(code=f'LAB-{n:03d}',name=NAMES[n-1],outcome=outcome,explanation=explanation,
                          measurements=measurements,evidenceRefs=refs,nextAction=action,certainty=certainty))
    if scan.get('complete') and not scan.get('exclusions') and scan.get('hashedFiles')==scan.get('discoveredFiles',scan.get('hashedFiles')):
        add(1,'PASS','All discovered eligible files were inventoried and hashed.',{'files':scan['hashedFiles'],'bytes':scan['hashedBytes']},['inventory'])
    if report.get('scopeAuthorized'):
        add(2,'PASS','The extension approved the selected test scope; provider permissions are checked per operation.',{'roots':1},['providerCapabilities','destinationRoot'])
    for n,op,flag,explanation in [(3,'upload','uploadVerified','Uploaded content matched source size and SHA-256 on independent readback.'),(4,'read','readVerified','Remote bytes and disk readback matched the expected size and SHA-256.'),(5,'metadata','metadataVerified','Observed remote object size matched the expected source size.')]:
        matches=[i for i,r in enumerate(rows) if r.get(flag) and r.get('status')=='PASS']
        if matches: add(n,'PASS',explanation,{'operations':len(matches),'bytes':sum(rows[i].get('bytes',0) if op=='upload' else rows[i].get('verifiedBytes',0) for i in matches)},[f'results/{i}' for i in matches[:3]])
    missing=plan.get('missing',[])
    if missing or report.get('unsupported') or report.get('untestedRoots') or plan.get('untested') or not scan.get('complete'):
        reasons=Counter(r.get('reason','UNKNOWN') for r in missing)
        add(6,'NOT_TESTED','Planned coverage has explicit exclusions or unavailable operations.',{'excludedFiles':len(missing),'transportMaxBytes':report.get('providerCapabilities',{}).get('limits',{}).get('maxBytes',65536),'unsupportedOperations':len(report.get('unsupported',[])),**dict(reasons)},['plan/missing','unsupported','plan/untested'],'Review exclusions; run Comprehensive only after Quick is stable. Large-file streaming remains unsupported.')
    from .adaptive import CONNECTION_RECOVERY
    lifecycle=set(CONNECTION_RECOVERY)-{'PROVIDER_PERMISSION_DENIED'}
    auth=[i for i,r in enumerate(rows) if r.get('error') in lifecycle]
    if report.get('connectionError') in lifecycle or auth:
        add(7,'BLOCKED','Authentication or connection lifecycle interrupted the selected operations.',{'affectedCases':len(auth)},['connectionError'] if not auth else [f'results/{auth[0]}'],'Check the original lifecycle code; obtain a new explicit pairing and reconcile uncertain writes.')
    uncertain=[i for i,r in enumerate(rows) if r.get('status')=='INDETERMINATE' and r.get('operation') in ('upload','copy','mkdir')]
    pending=bool(report.get('pendingOperation') and report.get('finished'))
    if uncertain or pending:
        add(8,'INDETERMINATE','A mutation outcome cannot yet be conclusively established.',{'operations':len(uncertain)+int(pending)},[f'results/{i}' for i in uncertain[:3]]+(['pendingOperation'] if pending else []),'Preserve this checkpoint and reconcile read-only. Never replay the mutation.',certainty='unknown')
    if uncertain or pending or counts['BLOCKED'] or auth or report.get('connectionError'):
        add(9,'BLOCKED','Recovery, reconciliation or explicit reauthorization is required.',{'blockedCases':counts['BLOCKED'],'uncertainWrites':len(uncertain)+int(pending)},['results','retryRecovery'],'Resolve the original blocker; reconcile uncertain writes before a fresh namespace run.')
    if report.get('acceptance')!='COMPLETE':
        add(10,'INCOMPLETE','Required Laboratory acceptance conditions remain unsatisfied.',{'failed':counts['FAIL'],'blocked':counts['BLOCKED'],'indeterminate':counts['INDETERMINATE'],'untestedCases':counts['NOT_TESTED']},['acceptance','coverage','plan'],'Review the highest-priority finding and preserve the report; selected-case success is not full acceptance.')
    groups={}
    for i,r in enumerate(rows):
        if r.get('status') not in ('FAIL','BLOCKED','INDETERMINATE','NOT_TESTED'): continue
        code=r.get('error') or report.get('connectionError') or 'DIAGNOSTICS_LOST'
        if code not in CANONICAL_CODES|LOCAL_CODES: code='DIAGNOSTICS_LOST'
        key=(r['status'],r['operation'],code)
        group=groups.setdefault(key,dict(outcome=key[0],operation=key[1],code=code,count=0,evidenceRefs=[]))
        group['count']+=1
        if len(group['evidenceRefs'])<3: group['evidenceRefs'].append(f'results/{i}')
    findings=sorted(groups.values(),key=lambda f:({'INDETERMINATE':0,'FAIL':1,'BLOCKED':2,'NOT_TESTED':3}[f['outcome']],f['operation'],f['code']))
    report['failureAnalysis']=findings
    priority=next((c for n in (8,7,9,10,6) for c in codes if c['code']==f'LAB-{n:03d}'),None)
    exclusions=Counter(r.get('reason','UNKNOWN') for r in missing)
    stage='Finalizing report' if report.get('finished') else STAGES.get((report.get('currentOperation') or {}).get('operation'),'Performing preflight')
    return dict(format='redown.lab.summary.v1',runId=report['runId'],acceptance=report['acceptance'],
                stage=stage,bucket=(report.get('destinationRoot') or {}).get('container'),finished=bool(report.get('finished')),
                blocked=bool(counts['BLOCKED'] or counts['INDETERMINATE'] or report.get('connectionError')),
                completedCases=len(rows),totalCases=len(plan.get('cases',[])),counts=counts,
                verifiedUploads=sum(bool(r.get('uploadVerified')) and r.get('status')=='PASS' for r in rows),
                verifiedReads=sum(bool(r.get('readVerified')) and r.get('status')=='PASS' for r in rows),
                verifiedBytes=report.get('verifiedBytes',0),excludedFiles=len(missing),exclusions=dict(exclusions),
                findings=findings[:20],omittedFindingGroups=max(0,len(findings)-20),codes=codes,problem=priority['explanation'] if priority else None,nextAction=priority['nextAction'] if priority else None,
                provenance='approved-python-client; acceptance and local hashing are Python assertions, not extension attestation')


def publish_progress(client, stage, completed=0):
    """Best-effort read-only display update; never alters a test outcome."""
    if client:
        from .client import RedownError
        try: client.query('labReport', progress={'stage':stage,'completed':completed})
        except RedownError: pass
