"""Small desktop laboratory and evidence-producing, read-only conformance runner."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import queue
import tempfile
import threading
import time
from .extension import ExtensionClient, RenewalSchedule
from .client import RedownError
from .inventory import inventory
from .architecture import run as architecture_run, report_json, markdown, exit_code, copy_report, save_architecture_report, progress_text

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
    path.with_suffix('.json').write_text(json.dumps(report, indent=2), encoding='utf-8', newline='\n')
    lines = ['# REDOWN extension laboratory', '', 'Acceptance: ' + report.get('acceptance', 'INCOMPLETE'), '', '| Check | State | Detail |', '| --- | --- | --- |']
    lines.extend('| ' + c['name'] + ' | ' + c['state'] + ' | ' + str(c.get('code', c.get('reason', c.get('operationId', '')))).replace('|', '/') + ' |' for c in report['cases'])
    path.with_suffix('.md').write_text('\n'.join(lines) + '\n', encoding='utf-8', newline='\n')

def gui():
    import tkinter as tk
    from tkinter import ttk, filedialog
    window = tk.Tk(); window.title('REDOWN Python Laboratory'); window.geometry('1000x950')
    client = None; report = None; events = queue.Queue(); busy = False; roots = []
    renewal = RenewalSchedule(); renewal_supported = False
    scan = None; stop = threading.Event()
    state = tk.StringVar(value='Not connected. Start the local connection in REDOWN, then click Connect to extension.')
    ttk.Label(window, textvariable=state, wraplength=850, justify='left').pack(fill='x', padx=8, pady=6)
    connection_bar = ttk.Frame(window); connection_bar.pack(fill='x', padx=8, pady=6)
    tk.Button(connection_bar, text='1. CONNECT TO REDOWN', command=lambda: connect(), font=('Segoe UI', 12, 'bold'), bg='#7254c7', fg='white', activebackground='#5b3ca8', activeforeground='white', padx=20, pady=12, cursor='hand2', relief='raised').pack(fill='x')
    ttk.Button(connection_bar, text='REFRESH CONNECTION / NEW PAIRING', command=lambda: connect(refresh=True)).pack(fill='x', pady=(6, 0))
    ttk.Label(window, text='Start the local connection in REDOWN, connect here, then approve the matching code in REDOWN.', wraplength=850).pack(fill='x', padx=8)
    auto_renew = tk.BooleanVar(value=True)
    ttk.Checkbutton(window, text='Renew Cloudflare OAuth through REDOWN every 40 minutes while connected', variable=auto_renew, command=renewal.reset).pack(anchor='w', padx=8)
    oauth_status = tk.StringVar(value='OAuth renewal: waiting for a connection')
    ttk.Label(window, textvariable=oauth_status, wraplength=850).pack(fill='x', padx=8)
    ttk.Label(window, text='2. Select your authorized test buckets', font=('Segoe UI', 11, 'bold')).pack(anchor='w', padx=8, pady=(10, 4))
    buckets = tk.Listbox(window, selectmode='extended', exportselection=False, height=6); buckets.pack(fill='x')
    actions = ttk.Frame(window); actions.pack(fill='x', padx=8, pady=8)
    actions.columnconfigure((0, 1), weight=1)
    ttk.Style(window).configure('Lab.Action.TButton', font=('Segoe UI', 11, 'bold'), padding=(14, 10))
    directory_bar = ttk.Frame(window); directory_bar.pack(fill='x', padx=8)
    preview = tk.StringVar(value='Choose a directory; sources are never modified. Metadata in reports may be sensitive.')
    ttk.Label(window, textvariable=preview, wraplength=950).pack(fill='x', padx=8)
    limits_bar = ttk.Frame(window); limits_bar.pack(fill='x', padx=8)
    limit_values = []
    for label, default in [('Max entries', '100000'), ('Max file MiB', '1024'), ('Total hash MiB', '4096')]:
        ttk.Label(limits_bar, text=label).pack(side='left')
        value = tk.StringVar(value=default); limit_values.append(value)
        ttk.Entry(limits_bar, textvariable=value, width=10).pack(side='left', padx=4)
    ttk.Label(limits_bar, text='Up to 5 distinct files per extension; read transport currently 64 KiB.').pack(side='left')
    def choose_directory():
        nonlocal scan
        if busy: return
        path = filedialog.askdirectory()
        if path:
            stop.clear()
            try:
                entry_limit, file_mib, total_mib = [int(v.get()) for v in limit_values]
                if min(entry_limit, file_mib, total_mib) < 1: raise ValueError()
            except ValueError:
                state.set('Scan limits must be positive integers.'); return
            work(lambda: inventory(path, cancel=stop, max_files=entry_limit, max_file_bytes=file_mib*1024**2, max_total_bytes=total_mib*1024**2), result_kind='inventory')
    def architecture_tests():
        nonlocal report
        selected = [roots[i] for i in buckets.curselection()]
        if not scan or not selected:
            state.set('Choose a directory and select authorized buckets first.'); return
        stop.clear()
        def run():
            nonlocal report
            report = architecture_run(client, scan, selected, cancel=stop,
                checkpoint=lambda value: events.put(('architecture-checkpoint', json.loads(report_json(value)))),
                progress=lambda row: events.put(('progress', row)))
            return report
        work(run, result_kind='architecture-report')
    def copy_json():
        if report is not None:
            copy_report(window, report)
            state.set('Exact JSON report copied; metadata may be sensitive.')
    def save_exact(kind):
        if report is None: return
        path = filedialog.asksaveasfilename(defaultextension='.' + kind)
        if path:
            text = report_json(report) if kind == 'json' else markdown(report) if 'schemaVersion' in report else '# REDOWN conformance\n\n' + '\n'.join(c['name'] + ': ' + c['state'] for c in report['cases'])
            Path(path).write_text(text, encoding='utf-8', newline='\n')
    for label, callback in [('CHOOSE LOCAL DIRECTORY', choose_directory), ('RUN ARCHITECTURE TESTS', architecture_tests),
                            ('CANCEL RUN / SCAN', stop.set), ('COPY JSON REPORT', copy_json),
                            ('SAVE JSON', lambda: save_exact('json')), ('SAVE MARKDOWN', lambda: save_exact('md'))]:
        ttk.Button(directory_bar, text=label, command=callback).pack(side='left', padx=2)
    ttk.Label(window, text='Advanced: session method and JSON input').pack()
    method = ttk.Combobox(window, values=['describe', 'execute', 'plan', 'jobs', 'inspect', 'evidence', 'resources', 'cancel', 'reconcile']); method.set('describe'); method.pack(fill='x')
    inputs = tk.Text(window, height=7); inputs.insert('1.0', '{}'); inputs.pack(fill='x')
    output = tk.Text(window, height=18); output.pack(fill='both', expand=True)
    def work(fn, result_kind="result"):
        nonlocal busy
        if busy:
            state.set('An operation is already running'); return
        busy = True
        def run():
            try: events.put((result_kind, fn()))
            except Exception as error: events.put(('error', error.code if isinstance(error, RedownError) else type(error).__name__))
            finally: events.put(('done', None))
        threading.Thread(target=run, daemon=True).start()
    def connect(refresh=False):
        def run():
            nonlocal client, roots, renewal_supported, report
            # Never reuse an expired or revoked grant. A refresh is a new, explicitly
            # approved session, not an OAuth token refresh or an operation replay.
            old = client
            client = None
            roots = []
            renewal_supported = False
            report = None
            renewal.reset()
            if old: old.close()
            events.put(('reset', None))
            events.put(('status', 'Refreshing local discovery and requesting a new REDOWN pairing...' if refresh else 'Requesting a new REDOWN pairing...'))
            fresh = ExtensionClient(on_pairing=lambda code: events.put(('status', 'Approve code ' + code + ' in REDOWN')))
            try:
                info = fresh.describe()
            except Exception:
                fresh.close()
                raise
            client = fresh
            roots = info['locations']
            renewal_supported = 'renewAuthorization' in info['methods']
            renewal.reset()
            events.put(('oauth-ready', renewal_supported))
            events.put(('roots', roots))
            events.put(('health', info))
            return info
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
            if path:
                if 'schemaVersion' in report:
                    save_architecture_report(report, Path(path).with_suffix('.json'))
                    save_architecture_report(report, Path(path).with_suffix('.md'), 'md')
                else:
                    save_report(report, path)
                state.set('JSON and Markdown reports saved')
    def root_input():
        selected = buckets.curselection()
        if not selected:
            state.set('Select an authorized bucket in the list first.'); return
        if busy:
            state.set('An operation is already running'); return
        payload = {'request': {'apiVersion': '0.3.0', 'operation': 'list', 'source': roots[selected[0]], 'idempotencyKey': __import__('uuid').uuid4().hex, 'limit': 10}}
        method.set('execute'); inputs.delete('1.0', 'end'); inputs.insert('1.0', json.dumps(payload, indent=2))
        work(lambda: client.query('execute', **payload))
    for index, (text, action) in enumerate([('List selected bucket', root_input), ('Run read-only tests', tests), ('Execute JSON request', execute), ('Export test report', export)]):
        ttk.Button(actions, text=text, command=action, style='Lab.Action.TButton').grid(row=index // 2, column=index % 2, sticky='ew', padx=4, pady=4)
    next_health = time.monotonic() + 30
    def poll():
        nonlocal busy, next_health, scan, report
        while not events.empty():
            kind, value = events.get()
            if kind == 'done': busy = False
            elif kind == 'inventory':
                scan = value
                preview.set(str(len(scan['selected'])) + ' selected, ' + str(scan['selectedBytes']) + ' bytes; ' + str(len(scan['exclusions'])) + ' exclusions; ' + json.dumps(scan['countsByExtension']))
                output.delete('1.0', 'end'); output.insert('1.0', json.dumps(scan, indent=2))
            elif kind == 'progress':
                state.set(progress_text(value))
                output.insert('end', json.dumps(value) + '\n'); output.see('end')
            elif kind == 'architecture-checkpoint':
                report = value
            elif kind == 'architecture-report':
                report = value
                output.delete('1.0', 'end'); output.insert('1.0', report_json(report))
                state.set('Architecture run INCOMPLETE: ' + json.dumps(report['coverage']))
            elif kind == 'reset':
                buckets.delete(0, 'end')
                oauth_status.set('OAuth renewal: waiting for a new approved connection')
            elif kind == 'status': state.set(value)
            elif kind == 'oauth-ready':
                oauth_status.set('OAuth renewal scheduled every 40 minutes' if value else 'Update/reload REDOWN to enable scheduled OAuth renewal')
            elif kind == 'renewal':
                renewal.reset()
                if value.get('state') == 'renewed':
                    oauth_status.set('OAuth renewed through REDOWN at ' + time.strftime('%H:%M') + '; next attempt in 40 minutes')
                else:
                    oauth_status.set('Cloudflare did not provide a refresh token. Automatic renewal is unavailable; use Reconnect Cloudflare when needed.')
            elif kind == 'health':
                expires = value.get('expiresAt')
                until = time.strftime('%H:%M', time.localtime(expires / 1000)) if expires else 'the approved expiry'
                state.set('Connected and authorized until ' + until + '; select test buckets')
                if oauth_status.get() == 'OAuth renewal: waiting for a connection':
                    oauth_status.set('OAuth renewal scheduled every 40 minutes' if renewal_supported else 'Update/reload REDOWN to enable scheduled OAuth renewal')
            elif kind == 'roots':
                buckets.delete(0, 'end')
                for root in value: buckets.insert('end', root['account'] + ' / ' + root['container'])
                state.set('Authorized; select test buckets')
            else:
                output.delete('1.0', 'end'); output.insert('1.0', json.dumps(value, indent=2));
                if kind == 'error':
                    guidance = {
                        'EXTENSION_UNAVAILABLE': 'Local helper unavailable. In REDOWN, keep Python Laboratory open and click Start local connection; check helper registration if it fails.',
                        'EXTENSION_DISCONNECTED': 'REDOWN disconnected. Reopen its Laboratory page, start the local connection, then reconnect here.',
                        'TIMEOUT_UNCERTAIN': 'Connection lost or timed out. Check the REDOWN Laboratory status, then reconnect here.',
                        'AUTHORIZATION_REVOKED_OR_EXPIRED': 'Approval expired or was revoked. Click Connect to extension and approve a new session in REDOWN.',
                        'CLOUDFLARE_RECONNECT_REQUIRED': 'Reconnect Cloudflare in REDOWN; automatic renewal cannot complete without a new sign-in.',
                        'OAUTH_RENEWAL_FAILED': 'OAuth renewal failed. Check REDOWN; no immediate retry or sign-in popup was triggered.',
                        'PAIRING_REJECTED': 'Pairing was rejected in REDOWN. Click REFRESH CONNECTION / NEW PAIRING and approve the new code.',
                        'LOCAL_AUTH_DENIED': 'The local helper rejected an old credential. Restart the REDOWN Laboratory local connection, then click REFRESH CONNECTION / NEW PAIRING.',
                        'SESSION_CLOSED': 'The old session is closed. Click REFRESH CONNECTION / NEW PAIRING after restarting the REDOWN Laboratory connection.'
                    }
                    state.set(value + ': ' + guidance.get(value, 'If the extension was reauthenticated, restart its local connection and click REFRESH CONNECTION / NEW PAIRING.'))
                    if value in ('CLOUDFLARE_RECONNECT_REQUIRED', 'OAUTH_RENEWAL_FAILED'):
                        oauth_status.set(state.get())
                    if value == 'AUTHORIZATION_REVOKED_OR_EXPIRED' and client:
                        client.close()
        if client and not busy and not client._closed and renewal_supported and auto_renew.get() and renewal.claim_due():
            work(lambda: client.query('renewAuthorization'), result_kind='renewal')
        if time.monotonic() >= next_health:
            next_health = time.monotonic() + 30
            if client and not busy and not client._closed:
                work(client.describe, result_kind='health')
        window.after(100, poll)
    def close():
        stop.set()
        if client: client.close()
        window.destroy()
    window.protocol('WM_DELETE_WINDOW', close); poll(); window.mainloop()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['gui', 'conformance', 'scan', 'architecture'], nargs='?', default='gui')
    parser.add_argument('--directory')
    parser.add_argument('--offline', action='store_true', help='Scan/plan without connecting; cloud cases remain blocked')
    parser.add_argument('--max-files', type=int, default=100000)
    parser.add_argument('--max-file-bytes', type=int, default=1024**3)
    parser.add_argument('--max-total-bytes', type=int, default=4*1024**3)
    parser.add_argument('--root', help='Authorized root as JSON')
    parser.add_argument('--source', help='Exact test object identity as JSON')
    parser.add_argument('--expected-sha256')
    parser.add_argument('--report', default='redown-lab-report.json')
    args = parser.parse_args()
    if args.action == 'gui':
        gui(); return 0
    if args.action in ('scan', 'architecture'):
        if not args.directory: parser.error('--directory is required')
        try:
            scan = inventory(args.directory, max_files=args.max_files, max_file_bytes=args.max_file_bytes, max_total_bytes=args.max_total_bytes)
            if args.action == 'scan':
                Path(args.report).write_text(report_json(scan), encoding='utf-8', newline='\n')
                print(report_json(scan), end=''); return 0 if scan['complete'] else 2
            def persist(value):
                # Checkpoint every completed case; previous file is replaced atomically.
                target = Path(args.report)
                temporary = target.with_suffix(target.suffix + '.tmp')
                temporary.write_text(report_json(value), encoding='utf-8', newline='\n'); temporary.replace(target)
            if args.offline:
                report = architecture_run(None, scan, checkpoint=persist, evidence_tier='OFFLINE_NO_PROVIDER')
            else:
                import sys
                try:
                    with ExtensionClient(on_pairing=lambda code: print('Approve code ' + code + ' in REDOWN', file=sys.stderr)) as connected:
                        report = architecture_run(connected, scan, [json.loads(args.root)] if args.root else None, checkpoint=persist)
                except RedownError:
                    report = architecture_run(None, scan, checkpoint=persist)
            Path(args.report).with_suffix('.md').write_text(markdown(report), encoding='utf-8', newline='\n')
            print(report_json(report), end=''); return exit_code(report)
        except (OSError, ValueError) as error:
            print(json.dumps({'status': 'INVALID', 'code': type(error).__name__})); return 4
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
