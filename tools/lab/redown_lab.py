#!/usr/bin/env python3
"""Owner-controlled REDOWN Universal File API verification. Python standard library."""
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from collections import Counter

VERSION = '1.0'
VERDICTS = ('PASS', 'FAIL', 'UNSUPPORTED', 'BLOCKED', 'TIMEOUT', 'UNVERIFIED')
OPS = ('upload', 'download', 'copy', 'rename', 'move', 'delete')
MAX_UPLOAD = 300000000


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temp.replace(path)


def journal(directory, event):
    with (Path(directory) / 'journal.jsonl').open('a', encoding='utf-8') as f:
        f.write(json.dumps({'time': time.time(), **event}, ensure_ascii=False) + '\n')
        f.flush()
        os.fsync(f.fileno())


def inventory(root, selected=None):
    root = Path(root).resolve(strict=True)
    paths = selected if selected is not None else [p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()]
    records = []
    for name in sorted(paths):
        if not isinstance(name, str) or Path(name).is_absolute() or '\\' in name or any(part in ('.', '..') for part in name.split('/')):
            raise ValueError('Fixture selection requires safe relative POSIX paths')
        p = (root / name).resolve(strict=True)
        if not p.is_relative_to(root) or p.is_symlink() or not p.is_file():
            raise ValueError('Unsafe fixture path: ' + name)
        with p.open('rb') as f:
            if f.read(128).startswith(b'version https://git-lfs.github.com/spec/v1'):
                raise ValueError('Git LFS pointer: ' + name + '; run git lfs install --local; git lfs pull')
        records.append({'path': name, 'bytes': p.stat().st_size, 'sha256': digest(p)})
    # Bind checked-out corpus bytes to committed Git LFS identities when available.
    try:
        repo = Path(subprocess.check_output(['git', '-C', str(root), 'rev-parse', '--show-toplevel'], stderr=subprocess.DEVNULL, text=True).strip())
        for record in records:
            relative = (root / record['path']).relative_to(repo).as_posix()
            pointer = subprocess.check_output(['git', '-C', str(repo), 'show', 'HEAD:' + relative], stderr=subprocess.DEVNULL)
            if pointer.startswith(b'version https://git-lfs.github.com/spec/v1'):
                expected = re.search(rb'oid sha256:([a-f0-9]{64})', pointer)
                size = re.search(rb'\nsize ([0-9]+)', pointer)
                if not expected or not size or expected[1].decode() != record['sha256'] or int(size[1]) != record['bytes']:
                    raise ValueError('Committed Git LFS integrity mismatch: ' + record['path'])
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass  # Non-repository fixtures are hash-inventoried, with optional owner manifest pin.
    if len({r['path'] for r in records}) != len(records):
        raise ValueError('Duplicate fixture selection')
    encoded = json.dumps(records, sort_keys=True, separators=(',', ':')).encode()
    return {'root': str(root), 'files': records, 'file_count': len(records), 'bytes': sum(r['bytes'] for r in records), 'inventory_sha256': hashlib.sha256(encoded).hexdigest()}


class BridgeError(Exception):
    def __init__(self, receipt):
        self.receipt = receipt
        super().__init__(receipt.get('error') or receipt.get('code') or 'Bridge error')


class Client:
    def __init__(self, port=8766, timeout=190):
        self.url = 'http://127.0.0.1:' + str(port)
        self.token = os.environ.get('REDOWN_LAB_TOKEN', '')
        self.timeout = timeout
        # Never send the local bearer secret to an inherited HTTP proxy.
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def request(self, route, payload=None):
        req = urllib.request.Request(self.url + route, data=None if payload is None else json.dumps(payload).encode(), headers={'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/json'})
        try:
            with self.opener.open(req, timeout=self.timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            try:
                receipt = json.load(e)
            except (ValueError, OSError):
                receipt = {'code': 'HTTP_' + str(e.code)}
            raise BridgeError(receipt) from e
        except (urllib.error.URLError, socket.timeout, TimeoutError) as e:
            raise BridgeError({'code': 'TIMEOUT' if isinstance(e, (socket.timeout, TimeoutError)) else 'BRIDGE_UNAVAILABLE', 'state': 'uncertain', 'error': 'Bridge unavailable; inspect state before retry.'}) from e

    def call(self, operation, inputs, scope, directory=None):
        command = {'schema_version': VERSION, 'command_id': str(uuid.uuid4()), 'operation': operation, 'input': inputs, 'scope': scope}
        if directory:
            journal(directory, {'phase': 'dispatch', 'command': command})
        try:
            receipt = self.request('/command', command)
            if receipt.get('schema_version') != VERSION or receipt.get('command_id') != command['command_id']:
                raise BridgeError({'code': 'INVALID_RESPONSE', 'state': 'uncertain'})
        except BridgeError as e:
            receipt = {**e.receipt, 'command_id': command['command_id'], 'schema_version': VERSION}
        if directory:
            journal(directory, {'phase': 'receipt', 'receipt': receipt})
        return receipt


def require(receipt):
    if receipt.get('state') != 'completed':
        raise BridgeError(receipt)
    return receipt.get('data') or {}


def snapshot(client, scope, directory=None, max_pages=1000, max_objects=10000):
    """Read-only, paginated listing traversal. Never drives transfers."""
    objects, folders, pages = {}, [scope['prefix']], 0
    while folders:
        folder = folders.pop()
        cursor, seen = '', set()
        while True:
            pages += 1
            if pages > max_pages:
                raise ValueError('Snapshot page budget exceeded')
            data = require(client.call('listRaw', {'source': {**scope, 'prefix': folder}, 'cursor': cursor}, scope, directory))
            if len(objects) + len(data.get('entries', [])) > max_objects:
                raise ValueError('Snapshot object budget exceeded')
            for item in data.get('entries', []):
                k = item['key']
                if not k.startswith(scope['prefix']):
                    raise ValueError('Listing escaped run prefix')
                if item.get('folder'):
                    if k not in objects:
                        folders.append(k)
                    objects[k] = {'key': k, 'folder': True}
                else:
                    objects[k] = {f: item.get(f) for f in ('key', 'size', 'etag', 'uploaded', 'version')}
            cursor = data.get('cursor', '')
            if not cursor:
                break
            if cursor in seen:
                raise ValueError('Repeated snapshot cursor')
            seen.add(cursor)
    return {'scope': scope, 'observed_at': time.time(), 'objects': objects, 'pages': pages, 'hashes': 'not inferred from ETags; see independently downloaded observations'}


def diff(before, after, expected=None):
    a, b = before.get('objects', {}), after.get('objects', {})
    changed = {k for k in a.keys() & b.keys() if a[k] != b[k]}
    added, removed = b.keys() - a.keys(), a.keys() - b.keys()
    result = {'added': sorted(added), 'removed': sorted(removed), 'changed': sorted(changed)}
    if expected is not None:
        result['unexpected'] = sorted((set(added) | set(removed) | changed) - set(expected))
    return result


def classify(receipt):
    code = receipt.get('code', '')
    if code == 'UNSUPPORTED_OPERATION':
        return 'UNSUPPORTED'
    if code == 'TIMEOUT':
        return 'TIMEOUT'
    if code in ('AUTH_REQUIRED', 'BRIDGE_UNAVAILABLE', 'BRIDGE_DISCONNECTED'):
        return 'BLOCKED'
    if receipt.get('state') in ('uncertain', 'cancelled', 'started'):
        return 'UNVERIFIED'
    return 'FAIL'


def validate_plan(plan):
    if not isinstance(plan, dict):
        raise ValueError('Plan must be a JSON object')
    required = ('provider', 'accountId', 'bucketName', 'destination', 'corpus', 'files', 'operations', 'max_files', 'max_bytes')
    for field in required:
        if field not in plan:
            raise ValueError('Owner must select ' + field)
    for field in ('provider', 'accountId', 'bucketName', 'destination', 'corpus'):
        if not isinstance(plan[field], str) or not plan[field]:
            raise ValueError(field + ' must be a nonempty string')
    for field in ('max_files', 'max_bytes'):
        if type(plan[field]) is not int or plan[field] < 1:
            raise ValueError(field + ' must be a positive integer')
    if not isinstance(plan['operations'], list) or any(not isinstance(o, str) for o in plan['operations']):
        raise ValueError('operations must be a list of operation names')
    if not isinstance(plan.get('operation_files', {}), dict):
        raise ValueError('operation_files must be an object')
    if plan['provider'] != 'cloudflare-r2':
        raise ValueError('Only existing Cloudflare R2 adapter is available')
    if not re.fullmatch(r'redown-test-lab/[a-zA-Z0-9-]+/', plan['destination']):
        raise ValueError('Destination must be redown-test-lab/<unique-run-id>/')
    if not isinstance(plan['files'], list) or not plan['files'] or any(not isinstance(f, str) for f in plan['files']) or len(plan['files']) > plan['max_files']:
        raise ValueError('Explicit nonempty file selection within max_files required')
    if not plan['operations'] or len(set(plan['operations'])) != len(plan['operations']):
        raise ValueError('Select unique operations')
    if any(o not in OPS for o in plan['operations']):
        raise ValueError('Unknown operation')
    if plan['operations'][0] != 'upload':
        raise ValueError('Scenario begins with upload to a fresh isolated prefix')
    for op, files in plan.get('operation_files', {}).items():
        if op not in plan['operations'] or not isinstance(files, list) or not files or not set(files).issubset(plan['files']):
            raise ValueError('operation_files must explicitly select fixtures within the plan')
        if op == 'upload' and set(files) != set(plan['files']):
            raise ValueError('Every fixture requires upload in fresh-prefix scenarios')
    inv = inventory(plan['corpus'], plan['files'])
    if inv['bytes'] > plan['max_bytes']:
        raise ValueError('Selected fixture byte budget exceeded')
    if any(f['bytes'] > MAX_UPLOAD for f in inv['files']):
        raise ValueError('Existing provider upload cap is 300 MB per file; larger fixtures are UNSUPPORTED')
    if plan.get('inventory_sha256') and plan['inventory_sha256'] != inv['inventory_sha256']:
        raise ValueError('Manifest integrity mismatch')
    return inv


def selected_operations(plan, fixture):
    selection = plan.get('operation_files', {})
    return [op for op in plan['operations'] if op not in selection or fixture['path'] in selection[op]]


def scope_for(plan):
    return {'accountId': plan['accountId'], 'bucketName': plan['bucketName'], 'prefix': plan['destination']}


def preflight(client, plan, directory=None):
    inv = validate_plan(plan)
    scope = scope_for(plan)
    health = client.request('/health')
    if not Path(inv['root']).is_relative_to(Path(health['approved_root']).resolve()):
        raise ValueError('Corpus is outside the local bridge approved root')
    caps = require(client.call('capabilities', {}, scope, directory))
    available = caps.get('operations', [])
    if any(f['bytes'] > caps.get('upload_max_bytes', 0) for f in inv['files']):
        raise BridgeError({'code': 'UNSUPPORTED_OPERATION', 'error': 'Selected file exceeds current browser data-plane capability; OPFS disk-backed storage required above 16 MiB'})
    needed = {'upload', 'listRaw', 'stat', 'connectionStatus', 'readStream'} | (set(plan['operations']) - {'download'})
    missing = sorted(needed - set(available))
    if missing:
        raise BridgeError({'code': 'UNSUPPORTED_OPERATION', 'error': ', '.join(missing)})
    connection = require(client.call('connectionStatus', {'source': scope}, scope, directory))
    if not connection.get('ready'):
        raise BridgeError({'code': 'AUTH_REQUIRED', 'error': connection.get('reason', 'Provider not ready')})
    state = snapshot(client, scope, directory)
    if state['objects']:
        raise ValueError('Fresh empty run prefix required; existing objects must be reconciled')
    return {'verdict': 'PASS', 'inventory': inv, 'capabilities': caps, 'before': state}


def journal_events(path):
    if not Path(path).exists():
        return
    with Path(path).open(encoding='utf-8') as stream:
        for line in stream:
            try:
                yield json.loads(line)
            except ValueError:
                continue


def recovery_state(directory):
    pending, uncertain = {}, []
    p = Path(directory) / 'journal.jsonl'
    for event in journal_events(p):
        if event.get('phase') == 'dispatch':
            command = event['command']; pending[command['command_id']] = command
        elif event.get('phase') == 'receipt':
            receipt = event['receipt']; command = pending.pop(receipt.get('command_id'), None)
            if receipt.get('state') in ('uncertain', 'cancelled', 'started') or receipt.get('code') == 'TIMEOUT':
                uncertain.append({'command': command, 'receipt': receipt})
    return {'without_terminal_receipt': list(pending.values()), 'requires_reconciliation': uncertain, 'strategy': 'inspect current snapshots and recovery keys; never replay ambiguous writes automatically'}


def emit_report(directory, state):
    results = state.get('results', [])
    counts = {v: sum(r['verdict'] == v for r in results) for v in VERDICTS}
    api_calls = Counter()
    completed_transfers = Counter()
    journal_path = directory / 'journal.jsonl'
    operations = {}
    for event in journal_events(journal_path):
        if event.get('phase') == 'dispatch':
            c = event['command']; operations[c['command_id']] = c['operation']; api_calls[c['operation']] += 1
        elif event.get('phase') == 'receipt':
            r = event['receipt']; op = operations.get(r.get('command_id'))
            if op in ('upload', 'readStream') and r.get('state') == 'completed': completed_transfers[op] += 1
    run_verdict = 'FAIL' if state['state'] == 'failed' else 'BLOCKED' if state['state'] == 'blocked' else 'UNVERIFIED' if state['state'] == 'interrupted' else next((v for v in ('FAIL', 'TIMEOUT', 'UNSUPPORTED', 'BLOCKED', 'UNVERIFIED') if counts[v]), 'PASS')
    if state.get('final_observation') == 'UNVERIFIED' and run_verdict == 'PASS': run_verdict = 'UNVERIFIED'
    summary = {**state, 'run_verdict': run_verdict, 'cleanup': read_json(directory / 'cleanup.json') if (directory / 'cleanup.json').exists() else None, 'recovery': recovery_state(directory), 'api_calls': dict(api_calls), 'completed_client_transfers': dict(completed_transfers), 'byte_accounting': 'Explicit client upload and verification download payloads only; adapter staging read-back and Worker internal copies are additional provider traffic, not measured here', 'schema_version': VERSION, 'counts': counts, 'passed_over_requested': counts['PASS'] / state['requested'] if state['requested'] else 0, 'elapsed_seconds': state.get('finished_at', time.time()) - state['started_at']}
    write_json(directory / 'summary.json', summary)
    fields = ['scenario_id', 'operation', 'fixture', 'verdict', 'api_state', 'code', 'bytes_transferred', 'elapsed_seconds', 'expected_sha256', 'observed_sha256', 'error']
    with (directory / 'results.csv').open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(results)
    (directory / 'summary.md').write_text('# REDOWN owner test evidence\n\n' + '\n'.join([f"- Run: {state['run_id']}", f"- State: {state['state']}; final verdict: {run_verdict}", f"- Requested: {state['requested']}; executed: {state.get('executed', 0)}", f"- Verified PASS/requested: {counts['PASS']}/{state['requested']}", f"- Verdicts: {counts}", f"- Transfer bytes observed: {state.get('bytes_transferred', 0)}", '- API receipts and independent observations are recorded separately in journal.jsonl.', '- Scope of change detection: selected remote prefix and immutable selected local fixtures. Other provider objects are not inspected.', '- No live-provider correctness is implied by local integration tests.']) + '\n', encoding='utf-8')
    with (directory / 'summary.md').open('a', encoding='utf-8') as f:
        inv = state.get('local_before', {})
        f.write('\n- Evidence mode: ' + state.get('evidence_mode', 'see plan/local-provider.json') + '\n')
        f.write(f"- Fixtures: {inv.get('file_count', 0)}; bytes: {inv.get('bytes', 0)}; unchanged: {state.get('fixtures_unchanged', 'pending')}\n")
        f.write(f"- Inventory SHA-256: {inv.get('inventory_sha256', 'unavailable')}\n")
        f.write(f"- Elapsed seconds: {summary['elapsed_seconds']:.3f}; final observation: {state.get('final_observation', 'see after.json')}\n")
        f.write(f"- Unexpected changes: {state.get('unexpected_changes', [])}\n")
        f.write('- Provider limits: 300 MB upload route; 16 MiB fallback without browser disk-backed storage; live Chrome acceptance required.\n')
        if state.get('error'): f.write('- Run error: ' + json.dumps(state['error'], ensure_ascii=False) + '\n')
        failures = [r for r in results if r['verdict'] != 'PASS']
        if failures:
            f.write('\n| Scenario | Operation | Verdict | Error |\n|---|---|---|---|\n')
            for row in failures:
                message = str(row.get('error', row.get('code', ''))).replace('|', '/').replace('\n', ' ')
                f.write(f"| {row['scenario_id']} | {row['operation']} | {row['verdict']} | {message} |\n")
    return summary


def run(client, plan, directory, dry_run=False, retry_of=None):
    inv = validate_plan(plan)
    if dry_run:
        return {'state': 'planned', 'mutations': False, 'plan': plan, 'inventory': inv, 'requested': sum(len(selected_operations(plan, f)) for f in inv['files'])}
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    scope = scope_for(plan)
    write_json(directory / 'plan.json', plan)
    write_json(directory / 'manifest.json', inv)
    state = {'evidence_mode': plan.get('evidence_mode', 'OWNER_PROVIDER_SESSION'), 'run_id': scope['prefix'].split('/')[1], 'scope': scope, 'started_at': time.time(), 'state': 'running', 'requested': sum(len(selected_operations(plan, f)) for f in inv['files']), 'executed': 0, 'results': [], 'bytes_transferred': 0, 'retry_of': retry_of, 'owned': {}, 'local_before': inv}
    before = {'scope': scope, 'objects': {}, 'state': 'UNVERIFIED'}
    write_json(directory / 'before.json', before)
    write_json(directory / 'after.json', before)
    write_json(directory / 'diff.json', {'state': 'UNVERIFIED'})
    emit_report(directory, state)
    completed_ids = set()
    stop_reason = None
    try:
        check = preflight(client, plan, directory)
        before = check['before']
        write_json(directory / 'before.json', before)
        for index, fixture in enumerate(inv['files']):
            original_key = scope['prefix'] + fixture['path']
            current = original_key
            for operation in selected_operations(plan, fixture):
                scenario_id = str(index) + ':' + operation
                started = time.time()
                row = {'scenario_id': scenario_id, 'operation': operation, 'fixture': fixture['path'], 'verdict': 'UNVERIFIED', 'api_state': 'not_dispatched', 'expected_sha256': fixture['sha256'], 'bytes_transferred': 0}
                state['results'].append(row)
                completed_ids.add(scenario_id)
                observed_before = snapshot(client, scope, directory)
                journal(directory, {'phase': 'before', 'scenario_id': scenario_id, 'snapshot': observed_before})
                destination = current
                if operation == 'upload':
                    inputs = {'source': scope, 'key': current, 'local_path': str(Path(inv['root']) / fixture['path']), 'conflict': 'skip'}
                    actual_operation = 'upload'
                    state['owned'][current] = {'sha256': fixture['sha256'], 'bytes': fixture['bytes'], 'verified': False}
                elif operation == 'download':
                    inputs = {'source': scope, 'key': current}
                    actual_operation = 'readStream'
                elif operation in ('copy', 'move'):
                    target = {**scope, 'prefix': scope['prefix'] + operation + '/'}
                    destination = target['prefix'] + current.rsplit('/', 1)[-1]
                    inputs = {'source': scope, 'destination': target, 'entries': [{'key': current, 'folder': False}], 'conflict': 'skip'}
                    actual_operation = operation
                    state['owned'][destination] = {'sha256': fixture['sha256'], 'bytes': fixture['bytes'], 'verified': False}
                elif operation == 'rename':
                    leaf = 'renamed-' + current.rsplit('/', 1)[-1]
                    destination = current.rsplit('/', 1)[0] + '/' + leaf
                    inputs = {'source': scope, 'entry': {'key': current, 'folder': False}, 'newName': leaf}
                    actual_operation = operation
                    state['owned'][destination] = {'sha256': fixture['sha256'], 'bytes': fixture['bytes'], 'verified': False}
                else:
                    inputs = {'source': scope, 'entries': [{'key': current, 'folder': False}]}
                    actual_operation = operation
                row['api_state'] = 'dispatching'
                # Persist ownership intent before dispatch, including ambiguous writes.
                write_json(directory / 'state.json', state)
                receipt = client.call(actual_operation, inputs, scope, directory)
                state['executed'] += 1
                row.update(api_state=receipt.get('state'), code=receipt.get('code', ''), error=receipt.get('error', ''))
                try:
                    observed_after = snapshot(client, scope, directory)
                    journal(directory, {'phase': 'after', 'scenario_id': scenario_id, 'snapshot': observed_after})
                    require(receipt)
                    if operation in ('copy', 'download') and observed_before['objects'].get(current) != observed_after['objects'].get(current):
                        raise ValueError('Original object changed during content-preserving operation')
                    delta = diff(observed_before, observed_after, [current, destination])
                    # Implicit parent folder discovery is expected for nested operations.
                    delta['unexpected'] = [k for k in delta['unexpected'] if not (k.endswith('/') and (current.startswith(k) or destination.startswith(k)))]
                    if delta['unexpected']:
                        raise ValueError('Unexpected object changes: ' + ', '.join(delta['unexpected']))
                    if operation == 'delete':
                        if require(client.call('stat', {'source': scope, 'key': current}, scope, directory)).get('object') is not None:
                            raise ValueError('API success but deleted object remains')
                        state['owned'].pop(current, None)
                    else:
                        metadata = require(client.call('stat', {'source': scope, 'key': destination}, scope, directory)).get('object')
                        if metadata is None or int(metadata.get('size', -1)) != fixture['bytes']:
                            raise ValueError('API success but destination missing or wrong size')
                        # Principal upload+download uses exactly one explicit download per fixture.
                        # Copy/rename/move content verification is an additional selected scenario.
                        if operation != 'upload':
                            read_receipt = receipt if operation == 'download' else client.call('readStream', {'source': scope, 'key': destination}, scope, directory)
                            data = require(read_receipt)
                            path = Path(read_receipt.get('download_path', ''))
                            if not path.is_file():
                                raise ValueError('Missing independently downloaded bytes')
                            row['observed_sha256'] = digest(path)
                            row['bytes_transferred'] += path.stat().st_size
                            if row['observed_sha256'] != fixture['sha256']:
                                raise ValueError('INTEGRITY_MISMATCH')
                            state['owned'][destination] = {'sha256': fixture['sha256'], 'bytes': fixture['bytes'], 'verified': True}
                        else:
                            row['bytes_transferred'] += fixture['bytes']
                        if operation in ('move', 'rename'):
                            if require(client.call('stat', {'source': scope, 'key': current}, scope, directory)).get('object') is not None:
                                raise ValueError('Source still exists after move/rename')
                            state['owned'].pop(current, None)
                        if operation == 'copy':
                            if require(client.call('stat', {'source': scope, 'key': current}, scope, directory)).get('object') is None:
                                raise ValueError('Copy deleted its source')
                        if operation in ('copy', 'move', 'rename'):
                            current = destination
                    # Upload metadata alone cannot prove final content; the download scenario does.
                    row['verdict'] = 'UNVERIFIED' if operation == 'upload' else 'PASS'
                except BridgeError as error:
                    row.update(verdict=classify(error.receipt), error=str(error))
                except (ValueError, OSError) as error:
                    row.update(verdict='FAIL', error=str(error))
                row['elapsed_seconds'] = time.time() - started
                state['bytes_transferred'] += row['bytes_transferred']
                journal(directory, {'phase': 'verification', 'result': row})
                write_json(directory / 'state.json', state)
                emit_report(directory, state)
                if row['verdict'] not in ('PASS', 'UNVERIFIED') or receipt.get('state') != 'completed':
                    stop_reason = 'Stopped after failed/uncertain scenario; reconcile before retry'
                    raise BridgeError({'code': 'STOPPED', 'state': 'uncertain', 'error': stop_reason})
        # A successful principal download upgrades only its matching upload observation.
        for row in state['results']:
            if row['operation'] == 'upload' and any(r['fixture'] == row['fixture'] and r['operation'] == 'download' and r['verdict'] == 'PASS' for r in state['results']):
                row['verdict'] = 'PASS'
        state['state'] = 'completed'
    except (BridgeError, ValueError, OSError, KeyboardInterrupt) as error:
        receipt = error.receipt if isinstance(error, BridgeError) else {'code': 'INTERRUPTED' if isinstance(error, KeyboardInterrupt) else 'PREFLIGHT_FAILED', 'error': str(error)}
        state.update(state='interrupted' if isinstance(error, KeyboardInterrupt) else 'blocked', error=receipt)
        stop_reason = str(error)
    except Exception as error:
        state.update(state='failed', error={'code': 'INTERNAL_ERROR', 'error': str(error)})
        stop_reason = str(error)
    finally:
        for row in state['results']:
            if row.get('api_state') == 'not_dispatched':
                row.update(verdict='BLOCKED', error=stop_reason or 'Not dispatched')
            elif row.get('api_state') == 'dispatching':
                row.update(verdict='UNVERIFIED', error=stop_reason or 'No terminal receipt; inspect remote state')
        for index, fixture in enumerate(inv['files']):
            for operation in selected_operations(plan, fixture):
                sid = str(index) + ':' + operation
                if sid not in completed_ids:
                    state['results'].append({'scenario_id': sid, 'operation': operation, 'fixture': fixture['path'], 'verdict': classify(state['error']) if state.get('error', {}).get('code') in ('UNSUPPORTED_OPERATION', 'TIMEOUT') else 'BLOCKED', 'error': stop_reason or 'Not executed'})
        try:
            after = snapshot(client, scope, directory)
            write_json(directory / 'after.json', after)
            final_diff = diff(before, after, state['owned'])
            final_diff['unexpected'] = sorted(set(final_diff.get('unexpected', [])) | (set(after['objects']) - set(state['owned'])))
            final_diff['missing_verified_owned'] = sorted(k for k, v in state['owned'].items() if v.get('verified') and k not in after['objects'])
            state['final_observation'] = 'PASS'
            state['unexpected_changes'] = final_diff['unexpected']
            if final_diff['unexpected'] or final_diff['missing_verified_owned']:
                state['state'] = 'failed'
            write_json(directory / 'diff.json', final_diff)
        except (BridgeError, ValueError, OSError):
            state['final_observation'] = 'UNVERIFIED'
            write_json(directory / 'after.json', {'state': 'UNVERIFIED', 'error': 'Final remote observation unavailable'})
        try:
            state['local_after'] = inventory(plan['corpus'], plan['files'])
            state['fixtures_unchanged'] = inv['files'] == state['local_after']['files']
            if not state['fixtures_unchanged']:
                state['state'] = 'failed'
        except (ValueError, OSError) as e:
            state.update(fixtures_unchanged=False, state='failed', fixture_error=str(e))
        state['finished_at'] = time.time()
        write_json(directory / 'state.json', state)
        summary = emit_report(directory, state)
    return summary


def cleanup(client, directory, execute=False):
    directory = Path(directory)
    state = read_json(directory / 'state.json')
    scope = state['scope']
    if scope['prefix'] != 'redown-test-lab/' + state['run_id'] + '/':
        raise ValueError('Invalid run ownership')
    results = []
    for k, owned in state['owned'].items():
        if not k.startswith(scope['prefix']) or not owned.get('verified'):
            results.append({'key': k, 'verdict': 'BLOCKED', 'error': 'Not independently verified run-owned content'})
            continue
        metadata = require(client.call('stat', {'source': scope, 'key': k}, scope, directory)).get('object')
        if metadata is None:
            results.append({'key': k, 'verdict': 'PASS', 'action': 'already absent'})
            continue
        if not execute:
            results.append({'key': k, 'verdict': 'UNVERIFIED', 'action': 'would rehash then delete'})
            continue
        r = client.call('readStream', {'source': scope, 'key': k}, scope, directory)
        require(r)
        if digest(r['download_path']) != owned['sha256']:
            results.append({'key': k, 'verdict': 'FAIL', 'error': 'Changed content; refused cleanup'})
            continue
        before = snapshot(client, scope, directory)
        journal(directory, {'phase': 'cleanup.before', 'key': k, 'snapshot': before})
        write_json(directory / 'cleanup.before.json', before)
        receipt = client.call('delete', {'source': scope, 'entries': [{'key': k, 'folder': False}]}, scope, directory)
        after = snapshot(client, scope, directory)
        journal(directory, {'phase': 'cleanup.after', 'key': k, 'snapshot': after})
        write_json(directory / 'cleanup.after.json', after)
        absent = require(client.call('stat', {'source': scope, 'key': k}, scope, directory)).get('object') is None
        results.append({'key': k, 'verdict': 'PASS' if receipt.get('state') == 'completed' and absent else 'FAIL', 'receipt': receipt, 'diff': diff(before, after, [k])})
    write_json(directory / 'cleanup.json', results)
    journal(directory, {'phase': 'cleanup', 'results': results})
    emit_report(directory, state)
    return results


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8766)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('doctor')
    inv = commands.add_parser('inventory'); inv.add_argument('--corpus', required=True); inv.add_argument('--output')
    for command in ('preflight', 'snapshot', 'run'):
        p = commands.add_parser(command); p.add_argument('--plan', required=True)
        if command == 'run':
            p.add_argument('--out', required=True); p.add_argument('--dry-run', action='store_true')
        if command == 'snapshot':
            p.add_argument('--output', required=True)
    for command in ('status', 'report', 'cleanup'):
        p = commands.add_parser(command); p.add_argument('--run', required=True)
        if command == 'cleanup': p.add_argument('--execute', action='store_true')
    p = commands.add_parser('diff'); p.add_argument('--before', required=True); p.add_argument('--after', required=True)
    p = commands.add_parser('retry'); p.add_argument('--run', required=True); p.add_argument('--scenario', action='append', required=True); p.add_argument('--plan', required=True); p.add_argument('--out', required=True); p.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv); client = Client(args.port)
    try:
        if args.command == 'doctor':
            health = client.request('/health')
            result = {'state': 'ready' if health.get('connected') else 'blocked', 'python': sys.version.split()[0], 'bridge': health, 'note': 'Run preflight for selected provider authorization and capabilities'}
        elif args.command == 'inventory':
            result = inventory(args.corpus)
            if args.output: write_json(args.output, result)
        elif args.command in ('run', 'preflight', 'snapshot'):
            plan = read_json(args.plan)
            if args.command == 'run': result = run(client, plan, args.out, args.dry_run)
            elif args.command == 'preflight': result = preflight(client, plan)
            else:
                validate_plan(plan); result = snapshot(client, scope_for(plan)); write_json(args.output, result)
        elif args.command in ('status', 'report'):
            state = read_json(Path(args.run) / 'state.json')
            result = emit_report(Path(args.run), state) if args.command == 'report' else {**state, 'recovery': recovery_state(Path(args.run))}
        elif args.command == 'diff': result = diff(read_json(args.before), read_json(args.after))
        elif args.command == 'cleanup': result = cleanup(client, args.run, args.execute)
        else:
            prior = read_json(Path(args.run) / 'summary.json')
            failed = {r['scenario_id']: r for r in prior['results'] if r['verdict'] != 'PASS'}
            if any(s not in failed for s in args.scenario): raise ValueError('Only selected unsuccessful scenario IDs may be retried')
            plan = read_json(args.plan)
            if plan['destination'] == prior['scope']['prefix']: raise ValueError('Retry requires a fresh prefix; no ambiguous write replay')
            chosen = [failed[s] for s in args.scenario]
            if set(plan['files']) != {r['fixture'] for r in chosen}: raise ValueError('Retry plan must select exactly failed fixtures')
            requested_ops = {r['operation'] for r in chosen} | {'upload', 'download'}
            if set(plan['operations']) != requested_ops: raise ValueError('Retry operations must be selected failed operations plus upload/download prerequisites')
            result = run(client, plan, args.out, args.dry_run, str(Path(args.run).resolve()))
        print(json.dumps(result, indent=2, ensure_ascii=False))
        if args.command == 'cleanup' and args.execute and any(r['verdict'] != 'PASS' for r in result): return 1
        if isinstance(result, dict) and (result.get('run_verdict', 'PASS') != 'PASS' or result.get('state') in ('blocked', 'failed', 'interrupted') or any(result.get('counts', {}).get(v, 0) for v in VERDICTS if v != 'PASS')): return 1
        return 0
    except (BridgeError, ValueError, OSError, KeyError) as error:
        print(json.dumps({'verdict': classify(error.receipt) if isinstance(error, BridgeError) else 'BLOCKED', 'error': str(error)}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
