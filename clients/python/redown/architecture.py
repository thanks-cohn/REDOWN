"""Read-only architecture scenarios through the canonical scoped Universal API."""
import base64
import collections
import hashlib
import json
import time
import uuid
from datetime import datetime, timezone
from .client import RedownError

STATUSES = ('PASS', 'FAIL', 'BLOCKED', 'UNSUPPORTED', 'NOT_TESTED', 'INDETERMINATE')

def report_json(report):
    return json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + '\n'

def markdown(report):
    lines = ['# REDOWN architecture laboratory', '', 'Acceptance: ' + report['acceptance'],
             '', 'Metadata and relative paths may be sensitive.', '', '| Case | Status | Code |', '| --- | --- | --- |']
    for c in report['cases']:
        lines.append('| ' + ' | '.join(str(c.get(k, '')).replace('|', '/').replace('\n', ' ') for k in ('name', 'status', 'code')) + ' |')
    return '\n'.join(lines) + '\n'

def progress_text(row):
    return row['name'] + ': ' + row['status'] + ' ' + (row.get('sample') or '')


def copy_report(widget, report):
    """Tk callback helper: copy exactly the same serialized bytes as SAVE JSON."""
    text = report_json(report)
    widget.clipboard_clear()
    widget.clipboard_append(text)
    return text


def save_architecture_report(report, path, kind='json'):
    from pathlib import Path
    Path(path).write_text(report_json(report) if kind == 'json' else markdown(report), encoding='utf-8', newline='\n')


def exit_code(report):
    counts = report['coverage']
    return 1 if counts.get('FAIL') else 3 if counts.get('INDETERMINATE') else 2 if report['acceptance'] != 'COMPLETE' else 0

def run(client, scan, roots=None, *, progress=None, cancel=None, checkpoint=None, evidence_tier='UNVERIFIED_CONNECTION'):
    report = {'schemaVersion': '1.0.0', 'runId': str(uuid.uuid4()), 'startedAt': datetime.now(timezone.utc).isoformat(),
              'acceptance': 'INCOMPLETE', 'evidenceTier': evidence_tier, 'inventory': scan,
              'privacy': 'Relative paths, hashes and object metadata may be sensitive. Credentials and raw provider responses are excluded.',
              'buckets': [], 'cases': [], 'coverage': {}, 'cleanup': {'state': 'NOT_NEEDED', 'mutationsAttempted': False},
              'recovery': 'No replay or durable cloud resume. Interrupted reads are indeterminate; start a new approved run.'}
    def publish():
        report['coverage'] = dict(collections.Counter(c['status'] for c in report['cases']))
        if checkpoint: checkpoint(report)
    def record(name, status, **data):
        row = {'name': name, 'status': status, 'retries': 0, **data}
        report['cases'].append(row); publish()
        if progress: progress(row)
    def code(error):
        return error.code if isinstance(error, RedownError) else 'INVALID_RESPONSE'
    def state(error):
        c = code(error)
        if c == 'CANCELLED_BEFORE_DISPATCH': return 'NOT_TESTED'
        if c in ('TIMEOUT_UNCERTAIN', 'SESSION_CLOSED', 'EXTENSION_DISCONNECTED', 'SESSION_UNAVAILABLE', 'RATE_LIMITED'): return 'INDETERMINATE'
        if c in ('AUTHORIZATION_DENIED', 'AUTHORIZATION_REVOKED_OR_EXPIRED', 'EXTENSION_UNAVAILABLE', 'OPERATION_BUDGET', 'PROVIDER_PERMISSION_DENIED', 'SESSION_EXPIRED'): return 'BLOCKED'
        if c in ('SIZE_LIMIT', 'PROVIDER_OPERATION_UNSUPPORTED', 'UNSUPPORTED_OPERATION'): return 'UNSUPPORTED'
        return 'FAIL'
    def perform(name, op, source, bucket, expected=None, sample=None, **args):
        start = time.monotonic()
        context = {'bucket': bucket, 'key': source.get('key'), 'sample': sample}
        if cancel and cancel.is_set():
            record(name, 'NOT_TESTED', code='CANCELLED_BEFORE_DISPATCH', **context); return None
        if op not in info['operations']:
            record(name, 'UNSUPPORTED', code='CAPABILITY_UNAVAILABLE', **context); return None
        job = None
        try:
            job = client.execute(op, source=source, **args)
            if job.get('state') != 'completed': raise RedownError(job.get('error', 'OPERATION_FAILED'))
            proof = client.query('evidence', id=job['id'])
            atlas = client.query('resources', id=job['id'], metric='getLatencyBreakdown')
            receipt = job.get('receipt', {})
            if proof.get('id') != job['id'] or receipt.get('operationId') != job['id'] or proof.get('operation') != op or proof.get('state') != 'completed' or proof.get('verification', {}).get('level') != receipt.get('level') or receipt.get('source') != source or atlas.get('state') != 'available' or atlas.get('data', {}).get('operationId') != job['id']:
                raise RedownError('EVIDENCE_CORRELATION_MISMATCH')
            result = job['result']; extra = {}
            if op in ('metadata', 'read'):
                if any(result.get(k) != source.get(k) for k in ('provider', 'account', 'container', 'key')):
                    raise RedownError('IDENTITY_MISMATCH')
            if op == 'read':
                data = base64.b64decode(result['bytesBase64'], validate=True)
                digest = hashlib.sha256(data).hexdigest()
                if len(data) != result['size'] or digest != result['sha256'] or expected and (digest != expected['sha256'] or len(data) != expected['bytes']):
                    raise RedownError('VERIFICATION_DISAGREEMENT')
                # Independently reconstruct a local download and rehash its actual bytes.
                import tempfile
                with tempfile.TemporaryFile() as output:
                    output.write(data); output.seek(0)
                    downloaded = hashlib.file_digest(output, 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else hashlib.sha256(output.read()).hexdigest()
                if downloaded != digest: raise RedownError('VERIFICATION_DISAGREEMENT')
                extra = {'sha256': digest, 'bytes': len(data), 'downloadSha256': downloaded, 'matchesLocalSource': bool(expected)}
            record(name, 'PASS', requestId=hashlib.sha256(job['id'].encode()).hexdigest(),
                   evidence={'operationIdHash': hashlib.sha256(proof['id'].encode()).hexdigest(), 'receiptLevel': receipt.get('level'),
                             'providerEvidenceDeclared': receipt.get('providerEvidence'), 'atlasCorrelated': True},
                   elapsedMs=round((time.monotonic()-start)*1000), **context, **extra)
            return result
        except (RedownError, ValueError, KeyError, TypeError) as error:
            record(name, state(error), code=code(error), elapsedMs=round((time.monotonic()-start)*1000), **context, **({'requestId': hashlib.sha256(job['id'].encode()).hexdigest(), 'jobState': job.get('state')} if job and isinstance(job.get('id'), str) else {}))
            return None
    publish()
    try:
        if client is None: raise RedownError('EXTENSION_UNAVAILABLE')
        info = client.describe()
        authorized = info['locations']
        roots = authorized if roots is None else roots
        if not roots or any(r not in authorized for r in roots): raise RedownError('AUTHORIZATION_DENIED')
        report['capabilities'] = {k: info.get(k) for k in ('operations', 'limits', 'providerContracts', 'unsupported')}
        record('discovery', 'PASS')
        for root in roots:
            bucket = hashlib.sha256(json.dumps(root, sort_keys=True).encode()).hexdigest()[:24]
            report['buckets'].append({'id': bucket, 'provider': root['provider'], 'accountIdHash': hashlib.sha256(str(root.get('account', '')).encode()).hexdigest()[:24], 'containerIdHash': hashlib.sha256(str(root.get('container', '')).encode()).hexdigest()[:24], 'policy': 'UNCHANGED_NOT_INSPECTED'})
            page = perform('list', 'list', root, bucket, limit=2)
            seen = set(); pages = 0
            while page and page.get('cursor') and pages < 5:
                cursor = page['cursor']
                if cursor in seen:
                    record('pagination', 'FAIL', code='REPEATED_CURSOR', bucket=bucket); break
                seen.add(cursor); pages += 1
                page = perform('pagination', 'list', root, bucket, limit=2, cursor=cursor)
            if not pages: record('pagination', 'NOT_TESTED', code='NO_NEXT_PAGE', bucket=bucket)
            elif page and page.get('cursor'): record('pagination-remainder', 'NOT_TESTED', code='PAGE_SAFETY_LIMIT', bucket=bucket)
            if scan['selected'] and 'key' in root:
                perform('prefix-list', 'list', {**root, 'key': scan['selected'][0]['relpath']}, bucket, limit=2)
            record('query-filter', 'UNSUPPORTED', bucket=bucket, code='BRIDGE_DOES_NOT_ADVERTISE_QUERY_FILTERS')
            missing = {**root, 'key': '__redown_missing_' + report['runId']}
            try:
                if cancel and cancel.is_set(): raise RedownError('CANCELLED_BEFORE_DISPATCH')
                if 'key' not in root: raise RedownError('PROVIDER_OPERATION_UNSUPPORTED')
                job = client.execute('metadata', source=missing)
                record('missing-object', 'PASS' if job.get('error') == 'NOT_FOUND_OR_INACCESSIBLE' else 'FAIL', bucket=bucket, code=job.get('error', 'UNEXPECTED_RESULT'))
            except RedownError as error: record('missing-object', state(error), code=error.code, bucket=bucket)
            for sample in scan['selected']:
                if 'key' not in root:
                    record('source-readback', 'UNSUPPORTED', bucket=bucket, sample=sample['relpath'], code='PROVIDER_REQUIRES_EXPLICIT_NONPATH_IDENTITY'); continue
                source = {**root, 'key': sample['relpath']}
                meta = perform('sample-metadata', 'metadata', source, bucket, sample=sample['relpath'])
                if meta is None:
                    record('source-readback', 'NOT_TESTED' if cancel and cancel.is_set() else 'BLOCKED', code='METADATA_UNAVAILABLE_NO_UPLOAD', bucket=bucket, sample=sample['relpath']); continue
                if sample['bytes'] > info.get('limits', {}).get('maxBytes', 0) or meta['size'] > info.get('limits', {}).get('maxBytes', 0):
                    record('source-readback', 'UNSUPPORTED', code='TRANSPORT_BYTE_LIMIT', bucket=bucket, sample=sample['relpath']); continue
                perform('source-readback', 'read', source, bucket, expected=sample, sample=sample['relpath'])
            for op in ('upload', 'mkdir', 'copy', 'move', 'rename', 'delete', 'inter-bucket-transfer', 'versioning', 'idempotency', 'overwrite-preconditions', 'durable-recovery', 'range-read'):
                record(op, 'UNSUPPORTED', bucket=bucket, code='NO_SAFE_APPROVED_BRIDGE_CAPABILITY')
        for name, payload, expected in (
            ('invalid-input', {'request': {}}, 'INVALID_INPUT'),
            ('unauthorized-bucket', {'request': {'apiVersion': '0.3.0', 'operation': 'list', 'source': {**roots[0], 'account': 'unauthorized-' + report['runId']}, 'idempotencyKey': str(uuid.uuid4())}}, 'AUTHORIZATION_DENIED')):
            try:
                if cancel and cancel.is_set():
                    record(name, 'NOT_TESTED', code='CANCELLED_BEFORE_DISPATCH'); continue
                client.query('execute', **payload); record(name, 'FAIL', code='UNEXPECTED_ACCEPTANCE')
            except RedownError as error: record(name, 'PASS' if error.code == expected else state(error), code=error.code)
    except (RedownError, ValueError, KeyError, TypeError) as error:
        record('connection-or-runner', state(error), code=code(error))
        for name in ('list', 'pagination', 'metadata', 'missing-object', 'prefix-list', 'invalid-input', 'unauthorized-bucket'):
            record(name, 'BLOCKED', code='DISCOVERY_OR_AUTHORIZATION_UNAVAILABLE')
        for sample in scan['selected']:
            record('source-readback', 'BLOCKED', code='DISCOVERY_OR_AUTHORIZATION_UNAVAILABLE', sample=sample['relpath'])
        for name in ('upload', 'mkdir', 'copy', 'move', 'rename', 'delete', 'inter-bucket-transfer', 'versioning', 'idempotency', 'overwrite-preconditions', 'durable-recovery', 'range-read'):
            record(name, 'UNSUPPORTED', code='NO_SAFE_APPROVED_BRIDGE_CAPABILITY')
    for name in ('revoked-grant', 'expired-grant', 'interrupted-connection', 'rate-limit', 'timeout', 'media-decode'):
        record(name, 'NOT_TESTED', code='REQUIRES_SEPARATE_FAULT_OR_FORMAT_VALIDATION')
    if not scan['complete']: record('inventory', 'BLOCKED', code='SCAN_INCOMPLETE')
    if not scan['selected']: record('inventory', 'BLOCKED', code='NO_ELIGIBLE_FILES')
    report['finishedAt'] = datetime.now(timezone.utc).isoformat(); publish()
    return report
