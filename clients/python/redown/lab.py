"""Small desktop laboratory and evidence-producing, read-only conformance runner."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import queue
import tempfile
import threading
from .extension import ExtensionClient
from .client import RedownError

def conformance(client, root=None, source=None, expected_sha256=None):
    report = {'version': '1.0.0', 'mode': 'extension', 'evidenceBoundary': 'Actual connected session; only provider receipts can establish cloud execution', 'cases': []}
    def record(name, state, **extra):
        report['cases'].append({'name': name, 'state': state, **extra})
    def completed(job):
        if job.get('state') != 'completed':
            raise RedownError(job.get('error', 'OPERATION_FAILED'))
        return job
    def evidence(job):
        proof = client.query('evidence', id=job['id'])
        atlas = client.query('resources', id=job['id'], metric='getLatencyBreakdown')
        if atlas.get('state') != 'available' or atlas.get('data', {}).get('operationId') != job['id'] or proof.get('id') != job['id']:
            raise RedownError('ATLAS_CORRELATION_MISMATCH')
        return {'operationId': job['id'], 'evidence': proof, 'resourceAtlas': atlas}
    try:
        info = client.describe()
        record('capability-negotiation', 'passed', fileApiVersion=info['fileApiVersion'], operations=info['operations'])
        root = root or info['locations'][0]
        if root not in info['locations'] or source and any(source.get(k) != root.get(k) for k in ('provider', 'account', 'container')):
            raise RedownError('SELECT_AUTHORIZED_ROOT')
        page = completed(client.execute('list', source=root, limit=2))
        record('listing', 'passed', **evidence(page))
        cursor = page['result'].get('cursor')
        if cursor:
            following = completed(client.execute('list', source=root, limit=2, cursor=cursor))
            record('pagination', 'passed', **evidence(following))
        else:
            record('pagination', 'untested', reason='Selected prefix fits one page')
        if source:
            meta = completed(client.execute('metadata', source=source))
            record('metadata', 'passed', **evidence(meta))
            read = completed(client.execute('read', source=source))
            data = base64.b64decode(read['result']['bytesBase64'], validate=True)
            digest = hashlib.sha256(data).hexdigest()
            if digest != read['result']['sha256'] or (expected_sha256 and digest != expected_sha256):
                raise RedownError('VERIFICATION_DISAGREEMENT')
            record('file-read', 'passed', sha256=digest, size=len(data), independentExpectedHash=bool(expected_sha256), **evidence(read))
            with tempfile.TemporaryDirectory() as directory:
                downloaded = completed(client.download(source, Path(directory) / 'readback.bin'))
                if hashlib.sha256((Path(directory) / 'readback.bin').read_bytes()).hexdigest() != digest:
                    raise RedownError('VERIFICATION_DISAGREEMENT')
                record('download-readback', 'passed', **evidence(downloaded))
        else:
            record('metadata-and-read', 'untested', reason='Supply --source and optionally --expected-sha256; no arbitrary object is read')
        for name, method, inputs in [
            ('invalid-input', 'execute', {'request': {}}),
            ('authorization-denial', 'execute', {'request': {'apiVersion': '0.3.0', 'operation': 'list', 'source': {**root, 'account': 'unauthorized-account'}, 'idempotencyKey': 'negative-scope'}}),
            ('cancellation-denial', 'cancel', {'id': page['id']}),
        ]:
            try:
                client.query(method, **inputs)
                record(name, 'failed', reason='Request unexpectedly accepted')
            except RedownError as error:
                expected = {'invalid-input': 'INVALID_INPUT', 'authorization-denial': 'AUTHORIZATION_DENIED', 'cancellation-denial': 'AUTHORIZATION_DENIED'}[name]
                record(name, 'passed' if error.code == expected else 'failed', code=error.code)
        for operation in ['upload', 'copy', 'move', 'rename', 'mkdir', 'delete']:
            record(operation, 'unsupported', reason='Extension OAuth adapter does not advertise safe mutation primitives')
        for name in ['pairing-rejection', 'revocation', 'session-expiration', 'interruption-recovery', 'backward-compatibility']:
            record(name, 'untested', reason='Requires separate security fixture or interactive test; this run does not award credit')
    except (RedownError, ValueError, KeyError) as error:
        record('runner', 'blocked' if isinstance(error, RedownError) and error.code in ['PROVIDER_PERMISSION_DENIED', 'SESSION_EXPIRED', 'EXTENSION_UNAVAILABLE', 'AUTHORIZATION_REVOKED_OR_EXPIRED'] else 'failed', code=error.code if isinstance(error, RedownError) else 'INVALID_RESPONSE')
    for name in ['capability-negotiation', 'listing', 'pagination', 'metadata', 'file-read', 'download-readback', 'invalid-input', 'authorization-denial', 'cancellation-denial']:
        if not any(c['name'] == name for c in report['cases']):
            record(name, 'untested', reason='Prerequisite or explicit test-object selection unavailable')
    report['acceptance'] = 'INCOMPLETE'
    report['failed'] = sum(c['state'] == 'failed' for c in report['cases'])
    return report

def save_report(report, path):
    path = Path(path)
    path.with_suffix('.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    lines = ['# REDOWN extension laboratory', '', 'Acceptance: ' + report.get('acceptance', 'INCOMPLETE'), '', '| Check | State | Detail |', '| --- | --- | --- |']
    lines.extend('| ' + c['name'] + ' | ' + c['state'] + ' | ' + str(c.get('code', c.get('reason', c.get('operationId', '')))).replace('|', '/') + ' |' for c in report['cases'])
    path.with_suffix('.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')

def gui():
    import tkinter as tk
    from tkinter import ttk, filedialog
    window = tk.Tk(); window.title('REDOWN Python Laboratory'); window.geometry('900x720')
    client = None; report = None; events = queue.Queue(); busy = False; roots = []
    state = tk.StringVar(value='Disconnected')
    ttk.Label(window, textvariable=state).pack(fill='x')
    buckets = tk.Listbox(window, selectmode='extended', height=6); buckets.pack(fill='x')
    ttk.Label(window, text='Methods and JSON input (selected buckets are available below)').pack()
    method = ttk.Combobox(window, values=['describe', 'execute', 'plan', 'jobs', 'inspect', 'evidence', 'resources', 'cancel', 'reconcile']); method.set('describe'); method.pack(fill='x')
    inputs = tk.Text(window, height=7); inputs.insert('1.0', '{}'); inputs.pack(fill='x')
    output = tk.Text(window, height=18); output.pack(fill='both', expand=True)
    def work(fn):
        nonlocal busy
        if busy:
            state.set('An operation is already running'); return
        busy = True
        def run():
            try: events.put(('result', fn()))
            except Exception as error: events.put(('error', error.code if isinstance(error, RedownError) else type(error).__name__))
            finally: events.put(('done', None))
        threading.Thread(target=run, daemon=True).start()
    def connect():
        def run():
            nonlocal client, roots
            if client: client.close()
            client = ExtensionClient(on_pairing=lambda code: events.put(('status', 'Approve code ' + code + ' in REDOWN')))
            info = client.describe(); roots = info['locations']; events.put(('roots', roots)); return info
        work(run)
    def execute():
        selected = method.get(); payload = inputs.get('1.0', 'end').strip()
        work(lambda: client.query(selected, **json.loads(payload)) if client else 'Connect first')
    def tests():
        selected = [roots[i] for i in buckets.curselection()]
        payload = inputs.get('1.0', 'end').strip()
        def run():
            nonlocal report
            if not client: return 'Connect first'
            source = json.loads(payload).get('source')
            reports = [conformance(client, root, source) for root in selected or roots[:1]]
            report = {'acceptance': 'INCOMPLETE', 'cases': [case for item in reports for case in item['cases']]}
            return report
        work(run)
    def export():
        if report:
            path = filedialog.asksaveasfilename(defaultextension='.json')
            if path: save_report(report, path); state.set('JSON and Markdown reports saved')
    def root_input():
        selected = buckets.curselection()
        if selected:
            method.set('execute'); inputs.delete('1.0', 'end'); inputs.insert('1.0', json.dumps({'request': {'apiVersion': '0.3.0', 'operation': 'list', 'source': roots[selected[0]], 'idempotencyKey': __import__('uuid').uuid4().hex, 'limit': 10}}, indent=2))
    for text, action in [('Connect to extension', connect), ('List selected bucket', root_input), ('Execute method', execute), ('Run read-only conformance', tests), ('Export report', export)]:
        ttk.Button(window, text=text, command=action).pack(side='left')
    def poll():
        nonlocal busy
        while not events.empty():
            kind, value = events.get()
            if kind == 'done': busy = False
            elif kind == 'status': state.set(value)
            elif kind == 'roots':
                buckets.delete(0, 'end')
                for root in value: buckets.insert('end', root['account'] + ' / ' + root['container'])
                state.set('Authorized; select test buckets')
            else:
                output.delete('1.0', 'end'); output.insert('1.0', json.dumps(value, indent=2));
                if kind == 'error': state.set(value)
        window.after(100, poll)
    def close():
        if client: client.close()
        window.destroy()
    window.protocol('WM_DELETE_WINDOW', close); poll(); window.mainloop()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['gui', 'conformance'], nargs='?', default='gui')
    parser.add_argument('--root', help='Authorized root as JSON')
    parser.add_argument('--source', help='Exact test object identity as JSON')
    parser.add_argument('--expected-sha256')
    parser.add_argument('--report', default='redown-lab-report.json')
    args = parser.parse_args()
    if args.action == 'gui':
        gui(); return 0
    try:
        import sys
        with ExtensionClient(on_pairing=lambda code: print('Approve code ' + code + ' in REDOWN', file=sys.stderr)) as client:
            report = conformance(client, json.loads(args.root) if args.root else None, json.loads(args.source) if args.source else None, args.expected_sha256)
    except (RedownError, ValueError) as error:
        report = {'acceptance': 'BLOCKED', 'cases': [{'name': 'connection', 'state': 'blocked', 'code': error.code if isinstance(error, RedownError) else 'INVALID_INPUT'}]}
    save_report(report, args.report)
    print(json.dumps(report, indent=2))
    return 1 if report.get('failed') or report['acceptance'] == 'BLOCKED' else 0

if __name__ == '__main__':
    raise SystemExit(main())
