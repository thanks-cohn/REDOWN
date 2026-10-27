"""Read-only restart reconciliation through the canonical SDK, never write replay.

A new read approval may cover the old namespace; a new write approval cannot.
Reports are evidence inputs, never authorization. Provider scope is checked again.
"""
import copy
import hashlib
import re
import tempfile
from pathlib import Path
from .client import RedownError
from .contracts import describe_response


def reconcile(client, previous, checkpoint=None):
    report=copy.deepcopy(previous)
    report['acceptance']='INCOMPLETE'
    report['reconciliation']={'readOnly':True,'automaticWriteRetries':0,'results':[],
                              'continuation':'New mutations require a fresh approved namespace; this command never resumes mutations.'}
    info=describe_response(client.describe())
    root=report.get('destinationRoot')
    if not isinstance(root,dict) or not re.fullmatch(r'__redown_test__/[a-f0-9-]{36}/',root.get('key','')):
        raise RedownError('INVALID_SCOPE')
    if not any(all(r.get(k)==root.get(k) for k in ('provider','account','container')) and root['key'].startswith(r.get('key','')) for r in info['locations']):
        raise RedownError('AUTHORIZATION_DENIED')
    run_id=report.get('runId','')
    if not re.fullmatch(r'[a-f0-9-]{36}',run_id):raise RedownError('INVALID_INPUT')
    rows={r['relpath']:r for r in report.get('inventory',{}).get('selected',[])}
    candidates=[r for r in report.get('results',[]) if r.get('operation') in ('upload','copy','mkdir') and r.get('status')=='INDETERMINATE']
    if report.get('pendingOperation'):candidates.append(report['pendingOperation'])
    seen=set()
    for row in candidates:
        op=row.get('operation'); rel=row.get('file'); source=rows.get(rel,{})
        expected=source.get('sha256'); size=source.get('bytes')
        # Older reports omitted destination; reconstruct only the deterministic lab path.
        key=root['key']+run_id+('/copies/' if op=='copy' else '/uploads/')+(rel or 'directory/')
        destination=row.get('destination') or {**root,'key':key}
        if destination != {**root,'key':key} or op not in ('upload','copy','mkdir'):raise RedownError('INVALID_SCOPE')
        if key in seen:continue
        seen.add(key)
        result={'operation':op,'file':rel,'destination':destination,'status':'INDETERMINATE','writeReplayAllowed':False}
        try:
            if op=='mkdir':
                result['reason']='DIRECTORY_MARKER_REQUIRES_MANUAL_REVIEW'
            elif not re.fullmatch(r'[a-f0-9]{64}',expected or '') or type(size) is not int or size<0 or (not info['limits'].get('streaming') and size>info['limits']['maxBytes']):
                result['reason']='MISSING_OR_UNSUPPORTED_SOURCE_EVIDENCE'
            else:
                with tempfile.TemporaryDirectory(prefix='redown-reconcile-') as directory:
                    target=Path(directory)/'readback.bin'
                    client.download(destination,target)
                    digest_state=hashlib.sha256()
                    with target.open('rb') as stream:
                        for chunk in iter(lambda:stream.read(262144),b''):digest_state.update(chunk)
                    digest=digest_state.hexdigest()
                    if target.stat().st_size==size and digest==expected:
                        result.update(status='CONFIRMED',sha256=digest,verifiedBytes=size)
                    else:result.update(status='CONFLICT',reason='VERIFICATION_DISAGREEMENT')
        except RedownError as error:
            # Missing/inaccessible is not proof that a timed-out write cannot still finish.
            result['error']=error.code
        except OSError:
            result['error']='LOCAL_READBACK_FAILED'
        report['reconciliation']['results'].append(result)
        if checkpoint:checkpoint(report)
        if result.get('error'):break
    return report
