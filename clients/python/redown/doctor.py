"""Read-only, extension-authenticated Doctor. Optional smoke needs separate write approval."""
from pathlib import Path
import json
import tempfile
from .client import RedownError
from .adaptive import run as laboratory_run
from .inventory import inventory

EXIT={'PASS':0,'FAIL':1,'BLOCKED':2,'INDETERMINATE':3,'UNSUPPORTED':4}
def run(client,*,operation='upload',smoke=False):
    report={'schemaVersion':'redown.doctor.v1','status':'BLOCKED','readOnly':not smoke,'steps':[],
            'liveWriteAcceptance':'NOT_TESTED','missingEvidence':[]}
    try:
        info=client.describe()
        if 'doctor' not in info.get('methods',[]):
            report.update(status='UNSUPPORTED',code='UPDATE_EXTENSION_REQUIRED');return report
        report.update(client.query('doctor',operation=operation,rootIndex=0))
        report['readOnly']=not smoke
        if smoke:
            if not info.get('writeEnabled'):
                report.update(status='BLOCKED',code='SEPARATE_WRITE_APPROVAL_REQUIRED');return report
            if report['status']!='PASS':
                report['smoke']={'status':'BLOCKED','reason':'Doctor preflight failed; no mutation dispatched'};return report
            with tempfile.TemporaryDirectory(prefix='redown-eight-byte-') as d:
                (Path(d)/'hello.bin').write_bytes(bytes([0,1,2,3,127,128,254,255]))
                evidence=laboratory_run(client,inventory(d,per_extension=None),depth='Comprehensive')
            report['smoke']=evidence
            rows=evidence['results']
            report['status']='INDETERMINATE' if any(x['status']=='INDETERMINATE' for x in rows) else 'FAIL' if any(x['status']=='FAIL' for x in rows) else 'BLOCKED' if any(x['status']!='PASS' for x in rows) else 'PASS'
            # Only the actual returned read hash is evidence; never label fixture/local tests live.
            report['mutationPhase']='VERIFIED' if report['status']=='PASS' and evidence['verifiedFiles'] else 'INDETERMINATE' if report['status']=='INDETERMINATE' else 'ACKNOWLEDGED_UNVERIFIED' if any(x['operation']=='upload' and x['status']=='PASS' for x in rows) else 'NOT_SUBMITTED'
            report['liveWriteAcceptance']='OWNER_REVIEW_REQUIRED'
    except RedownError as e:
        report.update(status='INDETERMINATE' if e.code=='TIMEOUT_UNCERTAIN' else 'BLOCKED',code=e.code,diagnostic=e.diagnostic)
        report['missingEvidence']=['Authorized existing extension session and actual provider response']
    return report

def save(report,path):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    text=json.dumps(report,indent=2,ensure_ascii=True)+'\n'
    tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(text,encoding='utf-8');tmp.replace(path)
    path.with_suffix('.md').write_text('# REDOWN Doctor\n\n```json\n'+text+'```\n',encoding='utf-8')
