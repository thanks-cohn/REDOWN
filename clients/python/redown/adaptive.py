"""Executable conditional-write laboratory over the existing authenticated session."""
import base64
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile
import time
import uuid
from .client import RedownError
from .contracts import require_fields
from .lab_results import summarize

PROFILES = {'Low RAM':(32,1,16384), 'Balanced':(128,2,65536), 'Maximum':(512,4,1048576)}

CONNECTION_RECOVERY = {
    'LOCAL_SESSION_EXPIRED': 'The Python approval duration ended. Approve a new pairing; provider renewal cannot extend it.',
    'AUTHORIZATION_REVOKED': 'The local grant was explicitly revoked. Obtain a new explicit approval before continuing.',
    'PROVIDER_SESSION_CHANGED': 'REDOWN credentials were replaced. Approve a new pairing to verify account and scope.',
    'PROVIDER_SESSION_UNAVAILABLE': 'Connect Cloudflare in REDOWN, then approve a new pairing.',
    'OAUTH_REFRESH_UNAVAILABLE': 'Cloudflare supplied no refresh credential. Reconnect Cloudflare, then approve a new pairing.',
    'OAUTH_REFRESH_REJECTED': 'Cloudflare rejected the refresh grant. Revocation versus grant expiry is unproven. Reconnect and approve a new pairing.',
    'OAUTH_REFRESH_FAILED': 'Renewal failed without proof of revocation. Check connectivity/provider status; preserve the checkpoint.',
    'PROVIDER_PERMISSION_DENIED': 'Provider denied access. Check bucket/object permissions; renewal cannot grant permissions.',

    'EXTENSION_UNAVAILABLE': 'Open REDOWN Python Laboratory, start its local connection, then request a new pairing. Check native-host registration for the installed extension ID.',
    'EXTENSION_DISCONNECTED': 'Keep the REDOWN Laboratory tab open. Check its helper status and Chrome native-host error, restart its local connection, then approve a NEW Python pairing.',
    'PAIRING_TIMEOUT': 'Run/connect again and approve the NEW matching code in REDOWN within 120 seconds. Each CLI invocation requires its own approval.',
    'PAIRING_REJECTED': 'Start a new pairing only when ready to approve its matching code and selected scope in REDOWN.',
    'AUTHORIZATION_REVOKED_OR_EXPIRED': 'Obtain a new explicit approval with the required buckets. OAuth renewal does not extend the Python grant.',
    'SESSION_EXPIRED': 'Reconnect Cloudflare in REDOWN and request a new approved Python connection.',
}

def connection_failure(code):
    return dict(status='BLOCKED', code=code, phase='session-establishment',
                recovery=CONNECTION_RECOVERY.get(code, 'Check REDOWN Laboratory status and obtain a new explicit pairing; never replay uncertain writes.'))

def profile(name='Balanced', memory_mib=128, concurrency=2, buffer_bytes=65536):
    if name in PROFILES: memory_mib,concurrency,buffer_bytes=PROFILES[name]
    elif name != 'Custom': raise ValueError('Unknown resource profile')
    if not 8 <= memory_mib <= 16384 or not 1 <= concurrency <= 4 or not 4096 <= buffer_bytes <= 4*1024**2:
        raise ValueError('Memory 8–16384 MiB, concurrency 1–4, buffer 4096–4194304 bytes required')
    effective_buffer=min(buffer_bytes,memory_mib*1024**2//(8*concurrency))
    return dict(name=name,memoryTargetMiB=memory_mib,concurrency=concurrency,requestedBufferBytes=buffer_bytes,bufferBytes=effective_buffer,
                effectiveTransferConcurrency=1,memoryGuarantee=False,
                limitation='Native session serializes requests; buffers govern inventory/local reads. No strict process memory cap.')

def plan(scan, depth='Quick', resources=None, info=None):
    if depth not in ('Quick','Comprehensive','Stress'): raise ValueError('Unknown depth')
    resources=resources or profile()
    ceiling=(info or {}).get('limits',{}).get('maxBytes',65536)
    eligible=[r for r in scan['selected'] if r['bytes']<=ceiling]
    chosen=eligible
    if depth=='Quick':
        groups={}
        for row in eligible:
            key=(row['extension'], 'empty' if row['bytes']==0 else 'small' if row['bytes']<4096 else 'large',row.get('unicodeName',False), min(row['depth'],3))
            groups.setdefault(key,row)
        chosen=list(groups.values())
    cases=[{'operation':'list','file':None,'bytes':0}]
    for n,row in enumerate(chosen):
        # Always transfer every eligible file in comprehensive/stress, including duplicates.
        for op in ['upload','read','metadata'] + (['copy'] if depth!='Quick' and n%10==0 else []):
            cases.append({'operation':op,'file':row['relpath'],'bytes':row['bytes']})
        if depth=='Stress': cases.append({'operation':'read','file':row['relpath'],'bytes':row['bytes'],'probe':'repeat-read-no-write-retry'})
    if chosen: cases.append({'operation':'mkdir','file':None,'bytes':0})
    missing=[{'file':r['relpath'],'status':'UNSUPPORTED','reason':'BOUNDED_TRANSPORT_LIMIT','bytes':r['bytes']} for r in scan['selected'] if r['bytes']>ceiling]
    missing += [{'file':r['relpath'],'status':'NOT_TESTED','reason':'QUICK_SAMPLE'} for r in eligible if r not in chosen]
    missing += [{'file':r['relpath'],'status':'NOT_TESTED','reason':r['reason']} for r in scan['exclusions']]
    transfer=sum(c['bytes']*(2 if c['operation']=='upload' else 3 if c['operation']=='copy' else 1 if c['operation']=='read' else 0) for c in cases)
    return dict(depth=depth,resources=resources,cases=cases,missing=missing,totalFiles=scan.get('discoveredFiles',scan['hashedFiles']),totalBytes=scan.get('discoveredBytes',scan['hashedBytes']),formatDistribution=scan['countsByExtension'],scanComplete=scan['complete'],eligibleFiles=len(eligible),selectedFiles=len(chosen),plannedOperations=len(cases),estimatedTransferBytes=transfer,
                operations=dict(Counter(c['operation'] for c in cases)),diskFreeBytes=shutil.disk_usage(scan['root']).free,temporaryDiskFreeBytes=shutil.disk_usage(tempfile.gettempdir()).free,requiredTemporaryBytes=min(ceiling,max((r['bytes'] for r in chosen),default=0)),
                estimatedSeconds=None,estimateReason='Awaiting actual connected throughput; no fabricated calibration',
                cost={'currency':None,'estimate':None,'reason':'Account billing/free allowance unknown; includes Worker requests, R2 writes, reads and retained storage'},
                permissions=['Separate extension write approval','Dedicated lab bucket','Updated existing REDOWN Worker'],
                untested=['format decoding/corruption','streaming/multipart','interruption/reconnect','resource pressure','cloud conditional deletion','parallel network transfers'])

def persist(report,path):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix(path.suffix+'.tmp')
    with temporary.open('w',encoding='utf-8') as output:
        output.write(json.dumps(report,indent=2,ensure_ascii=True)+'\n'); output.flush(); os.fsync(output.fileno())
    temporary.replace(path)
    if report.get('schemaVersion')=='2.8.0' and not report.get('finished'): return
    lines=['# REDOWN Adaptive Laboratory','', 'Acceptance: '+report['acceptance'],'', '| Operation | File | State | Error |','| --- | --- | --- | --- |']
    summary=report.get('labSummary')
    if summary:
        lines=lines[:3]+['', 'Cases: '+json.dumps(summary['counts']),
            f"Verified uploads: {summary['verifiedUploads']}; reads: {summary['verifiedReads']}; bytes: {summary['verifiedBytes']}.",
            'Excluded files: '+str(summary['excludedFiles'])+'; '+json.dumps(summary['exclusions']),
            '', summary.get('problem') or '', summary.get('nextAction') or '', '']+[
            f"- {c['code']} {c['name']} ({c['outcome']}, {c['certainty']}): {c['explanation']} {json.dumps(c['measurements'])}" for c in summary['codes']]+[
            '', '## Findings', '']+[
            f"- {f['outcome']}: {f['operation']} / {f['code']}: {f['count']} cases. Evidence: {', '.join(f['evidenceRefs'])}" for f in report.get('failureAnalysis',[])]+[
            '', '<details><summary>Full operation evidence</summary>', '', '| Operation | File | State | Error |','| --- | --- | --- | --- |']
    def cell(value): return str(value or '').replace('|','/').replace('\n',' ').replace('\r',' ')
    lines += ['| '+' | '.join(cell(c.get(k)) for k in ('operation','file','status','error'))+' |' for c in report['results']]
    lines += ['', '## Configuration, inventory, plan, evidence and limitations', '', '```json',json.dumps(report,indent=2,ensure_ascii=True),'```','']
    if summary: lines+=['</details>', '']
    md=path.with_suffix('.md'); tmp=md.with_suffix('.md.tmp');tmp.write_text('\n'.join(lines),encoding='utf-8');tmp.replace(md)

def run(client,scan,*,depth='Quick',resources=None,roots=None,cancel=None,checkpoint=None,progress=None,connection_error=None):
    started=time.monotonic(); cpu=time.process_time()
    commit='UNKNOWN'; dirty=None
    for candidate in (Path(__file__).resolve().parents[3],Path.cwd()):
        if not (candidate/'extension/lab-session.mjs').is_file(): continue
        try:
            commit=subprocess.check_output(['git','-C',str(candidate),'rev-parse','HEAD'],stderr=subprocess.DEVNULL,text=True,timeout=2).strip()
            dirty=bool(subprocess.check_output(['git','-C',str(candidate),'status','--porcelain','--untracked-files=no'],stderr=subprocess.DEVNULL,text=True,timeout=2).strip())
            break
        except (OSError,subprocess.SubprocessError): pass
    report=dict(schemaVersion='2.8.0',clientVersion='0.5.5',commit=commit,repositoryDirty=dirty,platform=platform.platform(),acceptance='INCOMPLETE',inventory=scan,results=[],providerCapabilities=None,
                runId=str(uuid.uuid4()),cleanup={'status':'NOT_TESTED','reason':'No deletion authorized or attempted. Inspect retained unique namespace; conditional delete unavailable.'},
                selectedRoots=roots,
                evidenceBoundary='Actual connected session if available; injected providers are not live R2 proof',sourcePreserved=True,currentOperation=None,pendingOperation=None)
    info={}
    if client:
        try: info=client.describe()
        except RedownError as e: connection_error=e.code
    else: connection_error=connection_error or 'EXTENSION_UNAVAILABLE'
    report['providerCapabilities']=info
    report['plan']=plan(scan,depth,resources,info)
    locations=roots or info.get('locations',[])
    # Never use caller-supplied unapproved roots, even when disconnected.
    if not connection_error and any(r not in info.get('locations',[]) for r in locations): connection_error='AUTHORIZATION_DENIED'
    if connection_error:
        report['connectionError']=connection_error
        report['primaryFailure']=connection_failure(connection_error)
        locations=[]
    root=locations[0] if locations else None
    report['destinationRoot']=root
    report['untestedRoots']=locations[1:]  # This bounded runner uses the first chosen bucket only.
    report['unsupported']=[{'operation':op,'status':'UNSUPPORTED','reason':'No safe atomic conditional deletion' if op in ('move','rename','delete') else 'Not implemented in bounded native transport'} for op in ['move','rename','delete','streaming','multipart','durable recovery']]
    report['retryRecovery']={'automaticWriteRetries':0,'resume':'READ_ONLY_RECONCILIATION','policy':'Persist intent before mutations; halt on interruption; reconcile saved destinations with a new read grant. Mutation continuation requires a fresh namespace.'}
    report['scopeAuthorized']=bool(root and info.get('writeEnabled') and not connection_error)
    reporting=bool(client and 'labReport' in info.get('methods',[]))
    last_publish=0.0
    def save():
        nonlocal last_publish, reporting
        report['elapsedSeconds']=time.monotonic()-started
        report['cpuSeconds']=time.process_time()-cpu
        report['coverage']=dict(Counter(r['status'] for r in report['results']))
        report['completedCases']=len(report['results']); report['remainingCases']=len(report['plan']['cases'])-len(report['results'])
        report['successfulOperations']=sum(r['status']=='PASS' for r in report['results'])
        report['verifiedUploads']=sum(bool(r.get('uploadVerified')) and r['status']=='PASS' for r in report['results'])
        report['dispatchedOperations']=sum(bool(r.get('dispatched')) for r in report['results'])
        report['notAttemptedOperations']=sum(not r.get('dispatched',False) for r in report['results'])
        elapsed=report['elapsedSeconds']; transferred=sum(r.get('verifiedBytes',0) for r in report['results'] if r.get('readVerified') and r['status']=='PASS')
        report['verifiedBytes']=transferred
        report['verifiedFiles']=len({r['file'] for r in report['results'] if r['operation']=='read' and r['status']=='PASS'})
        report['bytesPerSecond']=transferred/elapsed if elapsed else None
        report['estimatedRemainingSeconds']=elapsed/len(report['results'])*report['remainingCases'] if report['results'] else None
        try:
            import resource
            peak=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            report['ramObservation']={'status':'PASS','peakProcessBytes':peak*(1 if platform.system()=='Darwin' else 1024),'scope':'Python process peak RSS; includes inventory/report overhead, excludes extension/Chrome'}
        except ImportError:
            report['ramObservation']={'status':'NOT_TESTED','reason':'Process RSS measurement unavailable on this platform'}
        report['labSummary']=summarize(report)
        if checkpoint: checkpoint(report)
        if reporting and (report.get('finished') or time.monotonic()-last_publish>=1):
            last_publish=time.monotonic()
            try: client.query('labReport', summary=report['labSummary'])
            except RedownError as error:
                report['reportingError']=error.code
                reporting=False  # Reporting never retries or changes mutation outcomes.
                if checkpoint: checkpoint(report)
        if progress: progress(report)
    save()
    by_path={r['relpath']:r for r in scan['selected']}; destinations={}; uploads={}; halted=False
    for case in report['plan']['cases']:
        result={**case,'status':'NOT_TESTED','dispatched':False}; begin=time.monotonic(); mutation_started=False
        report['currentOperation']=case; save()
        if cancel and cancel.is_set():
            report['cancelled']=True; halted=True
        try:
            if halted: result['error']='CANCELLED_OR_PRIOR_UNCERTAINTY'
            elif connection_error: result.update(status='BLOCKED',blockedBy='connection',reason='Session was not established; operation not dispatched')
            elif not info.get('writeEnabled'): result.update(status='BLOCKED',error='SEPARATE_WRITE_APPROVAL_REQUIRED')
            elif not root: result.update(status='BLOCKED',error='SELECT_AUTHORIZED_LAB_BUCKET')
            else:
                op=case['operation']; rel=case['file']; row=by_path.get(rel)
                dest=destinations.setdefault(rel,{**root,'key':root['key']+report['runId']+'/uploads/'+(rel or 'directory/')})
                if op=='list':
                    result['dispatched']=True; job=client.execute(op,source=root,limit=10)
                elif op=='upload':
                    source=Path(scan['root'])/rel
                    if source.is_symlink() or not source.resolve().is_relative_to(Path(scan['root'])): raise RedownError('LOCAL_SOURCE_CHANGED')
                    # File size is bounded by negotiated transport before opening/reading.
                    with source.open('rb') as stream:
                        chunks=[]; count=0
                        while count <= info['limits']['maxBytes']:
                            chunk=stream.read(min(report['plan']['resources']['bufferBytes'],info['limits']['maxBytes']+1-count))
                            if not chunk: break
                            chunks.append(chunk);count+=len(chunk)
                        data=b''.join(chunks)
                    if len(data)!=row['bytes'] or hashlib.sha256(data).hexdigest()!=row['sha256']: raise RedownError('LOCAL_SOURCE_CHANGED')
                    mutation_started=True
                    report['pendingOperation']={**case,'destination':dest,'sha256':row['sha256'],'status':'INDETERMINATE'}; save()
                    result['dispatched']=True
                    job=client.execute(op,destination=dest,bytesBase64=base64.b64encode(data).decode('ascii'),idempotency_key=report['runId']+'-'+str(len(report['results'])))
                    uploads[rel]=job.get('state')=='completed'
                elif op=='mkdir':
                    mutation_started=True; report['pendingOperation']={**case,'destination':dest,'status':'INDETERMINATE'}; save()
                    result['dispatched']=True; job=client.execute(op,destination=dest)
                elif not uploads.get(rel): result.update(status='BLOCKED',error='UPLOAD_NOT_VERIFIED'); job=None
                elif op=='copy':
                    mutation_started=True; copy_dest={**dest,'key':root['key']+report['runId']+'/copies/'+rel}
                    report['pendingOperation']={**case,'destination':copy_dest,'sha256':row['sha256'],'status':'INDETERMINATE'}; save()
                    result['dispatched']=True; job=client.execute(op,source=dest,destination=copy_dest)
                elif op=='read':
                    with tempfile.TemporaryDirectory(prefix='redown-readback-') as directory:
                        target=Path(directory)/'readback.bin'
                        result['dispatched']=True; job=client.download(dest,target)
                        with target.open('rb') as readback:
                            result['diskReadbackSha256']=hashlib.file_digest(readback,'sha256').hexdigest() if hasattr(hashlib,'file_digest') else hashlib.sha256(readback.read(65537)).hexdigest()
                        if result['diskReadbackSha256']!=row['sha256']: raise RedownError('VERIFICATION_DISAGREEMENT')
                else:
                    result['dispatched']=True; job=client.execute(op,source=dest)
                if job:
                    require_fields(job, ('id','state'), 'adaptive.execute')
                    result.update(operationId=job['id'],jobState=job['state'])
                    if job.get('diagnostic'): result['diagnostic']=job['diagnostic']
                    if job['state']!='completed':
                        result.update(status='INDETERMINATE' if job['state'] in ('uncertain','partially_completed') else 'BLOCKED' if job.get('error') in CONNECTION_RECOVERY or job.get('error','').startswith(('LAB_','PROVIDER_PERMISSION','OPERATION_BUDGET','CAPACITY')) else 'FAIL',error=job.get('error'))
                        if job['state'] in ('uncertain','partially_completed') or job.get('error') in CONNECTION_RECOVERY or job.get('error') in ('NETWORK_FAILURE','TIMEOUT','SESSION_UNAVAILABLE'): halted=True
                    else:
                        if op=='read':
                            data=base64.b64decode(job['result']['bytesBase64'],validate=True)
                            digest=hashlib.sha256(data).hexdigest()
                            if digest!=row['sha256'] or len(data)!=row['bytes']: raise RedownError('VERIFICATION_DISAGREEMENT')
                            result.update(readVerified=True,sha256=digest,verifiedBytes=len(data),independentIntegrity='Python source SHA-256 vs OAuth readback; creation used Worker STORAGE')
                        if op=='metadata':
                            if job.get('result',{}).get('size')!=row['bytes']: raise RedownError('VERIFICATION_DISAGREEMENT')
                            result['metadataVerified']=True
                        result['status']='PASS'
                    result['evidence']=client.query('evidence',id=job['id'])
                    result['resourceAtlas']=client.query('resources',id=job['id'],metric='getLatencyBreakdown')
                    if op=='upload' and result['status']=='PASS':
                        evidence=result['evidence']
                        matches=[c for c in evidence.get('checkpoints',[]) if c.get('sha256')==row['sha256'] and c.get('size')==row['bytes']]
                        if evidence.get('state')!='completed' or evidence.get('verification',{}).get('level')!='content-sha256' or not matches:
                            raise RedownError('DIAGNOSTICS_LOST')
                        result['uploadVerified']=True
                    if result['evidence'].get('id')!=job['id'] or result['resourceAtlas'].get('state')!='available' or result['resourceAtlas'].get('data',{}).get('operationId')!=job['id']:
                        raise RedownError('ATLAS_CORRELATION_MISMATCH')
        except (RedownError,OSError,ValueError,KeyError) as error:
            if isinstance(error,RedownError) and error.diagnostic: result['diagnostic']=error.diagnostic
            if getattr(error,'contract',None): result['responseContract']=error.contract
            code=error.code if isinstance(error,RedownError) else type(error).__name__
            # Any exception after mutation dispatch requires reconciliation, including malformed replies.
            uncertain=(mutation_started and result['dispatched']) or code in ('TIMEOUT_UNCERTAIN','WRITE_UNCERTAIN','SESSION_CLOSED')
            result.update(status='INDETERMINATE' if uncertain else 'BLOCKED' if code in CONNECTION_RECOVERY or code in ('OPERATION_BUDGET','CAPACITY','AUTHORIZATION_REVOKED_OR_EXPIRED','SESSION_EXPIRED','EXTENSION_UNAVAILABLE') else 'FAIL',error=code)
            if result['status']=='INDETERMINATE' or code in CONNECTION_RECOVERY or code in ('SESSION_CLOSED','SESSION_UNAVAILABLE','NETWORK_FAILURE','TIMEOUT','OAUTH_RENEWAL_FAILED'): halted=True
            result['recovery']=CONNECTION_RECOVERY.get(code,'Preserve checkpoint; reconcile uncertain objects read-only before any continuation.')
        result['seconds']=time.monotonic()-begin
        result['endToEndPayloadBytesPerSecond']=case['bytes']/result['seconds'] if result['status']=='PASS' and case['operation'] in ('upload','read','copy') and result['seconds'] else None
        result['reproduction']='Select the same source and profiles; use a NEW approved namespace. Never replay an uncertain write.'
        if report.get('pendingOperation'):
            result['destination']=report['pendingOperation']['destination']
        report['results'].append(result); report['pendingOperation']=None; save()
    report['currentOperation']=None; report['finished']=True; save()
    return report
