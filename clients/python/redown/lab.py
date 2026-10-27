"""Small desktop laboratory and evidence-producing, read-only conformance runner."""
from .lab_results import publish_progress
from .contracts import checkpoint_view, describe_response
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
from .adaptive import profile as resource_profile, run as adaptive_run, plan as adaptive_plan, persist as adaptive_persist, CONNECTION_RECOVERY
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
            record(operation, 'untested' if operation in info['operations'] else 'unsupported', reason='Use RUN COMPLETE LABORATORY for separately approved writes' if operation in info['operations'] else 'Selected grant/provider does not authorize this mutation')
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
    from .gui_layout import scrollable_content
    root_window = tk.Tk(); root_window.title('REDOWN Python Laboratory')
    root_window.geometry(f'{min(1000, root_window.winfo_screenwidth()-80)}x{min(850, root_window.winfo_screenheight()-100)}')
    window = scrollable_content(root_window)
    client = None; report = None; events = queue.Queue(); busy = False; roots = []
    last_connection_error = None
    renewal = RenewalSchedule(); renewal_supported = False
    scan = None; stop = threading.Event(); active_report_path = None
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
    ttk.Label(limits_bar, text='All files inventoried within these explicit limits; cloud files limited to 64 KiB.').pack(side='left')
    profile_bar=ttk.Frame(window); profile_bar.pack(fill='x',padx=8)
    depth=tk.StringVar(value='Quick'); resource=tk.StringVar(value='Balanced')
    for label,value,choices in [('Test depth',depth,['Quick','Comprehensive','Stress']),('Resources',resource,['Low RAM','Balanced','Maximum','Custom'])]:
        ttk.Label(profile_bar,text=label).pack(side='left')
        ttk.Combobox(profile_bar,textvariable=value,values=choices,state='readonly',width=16).pack(side='left')
    custom=[]
    custom_bar=ttk.Frame(window); custom_bar.pack(fill='x',padx=8)
    for label,default in [('Memory target MiB','128'),('Concurrency','2'),('Buffer bytes','65536')]:
        ttk.Label(custom_bar,text=label).pack(side='left'); value=tk.StringVar(value=default);custom.append(value)
        ttk.Entry(custom_bar,textvariable=value,width=8).pack(side='left')
    ttk.Label(window,text='Memory is a target. Native requests are serialized (effective network concurrency 1). Stress adds repeat reads; interruption/pressure tests remain untested.',wraplength=950).pack(fill='x',padx=8)
    def resources(): return resource_profile(resource.get(),*[int(v.get()) for v in custom])
    def preflight():
        if not scan: state.set('Choose a local directory first.'); return
        try: value=adaptive_plan(scan,depth.get(),resources())
        except ValueError as error: state.set(str(error)); return
        output.delete('1.0','end');output.insert('1.0',json.dumps(value,indent=2))
        state.set('Preflight: '+str(value['selectedFiles'])+' files; '+str(value['plannedOperations'])+' operations; '+str(value['estimatedTransferBytes'])+' estimated wire bytes. Review exclusions, disk, costs and required permissions below.')
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
            try: settings=resources()
            except ValueError as error: state.set(str(error)); return
            work(lambda: inventory(path, progress=lambda p: publish_progress(client,**p), per_extension=None, buffer_bytes=settings['bufferBytes'], cancel=stop, max_files=entry_limit, max_file_bytes=file_mib*1024**2, max_total_bytes=total_mib*1024**2), result_kind='inventory')
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
    def complete_tests():
        nonlocal report, active_report_path
        if not scan: state.set('Choose a directory and review Preflight first.'); return
        selected=[roots[i] for i in buckets.curselection()]
        if len(selected)>1: state.set('Select exactly one bucket for this laboratory run.'); return
        if client and not selected: state.set('Select one authorized bucket.'); return
        try: settings=resources()
        except ValueError as error: state.set(str(error)); return
        stop.clear()
        target=Path('redown-lab-runs') / (time.strftime('%Y%m%d-%H%M%S')+'-'+__import__('uuid').uuid4().hex[:8]+'.json')
        active_report_path=target
        chosen_depth=depth.get()
        def checkpoint(value):
            adaptive_persist(value,target)
            events.put(('adaptive-checkpoint',checkpoint_view(value)))
        connected = client if client and not client._closed else None
        work(lambda: adaptive_run(connected,scan,depth=chosen_depth,resources=settings,roots=selected or None,cancel=stop,checkpoint=checkpoint,connection_error=last_connection_error if not connected else None),result_kind='adaptive-report')
    def latest_report():
        if active_report_path and active_report_path.exists():
            return json.loads(active_report_path.read_text(encoding='utf-8'))
        return report
    def copy_json():
        report=latest_report()
        if report is not None:
            copy_report(window, report)
            state.set('Exact JSON report copied; metadata may be sensitive.')
    def save_exact(kind):
        report=latest_report()
        if report is None: return
        path = filedialog.asksaveasfilename(defaultextension='.' + kind)
        if path:
            text = report_json(report) if kind == 'json' else '# REDOWN adaptive laboratory\n\n```json\n'+report_json(report)+'```\n' if report.get('schemaVersion')=='2.8.0' else markdown(report) if 'schemaVersion' in report else '# REDOWN conformance\n\n' + '\n'.join(c['name'] + ': ' + c['state'] for c in report['cases'])
            Path(path).write_text(text, encoding='utf-8', newline='\n')
    for label, callback in [('CHOOSE LOCAL DIRECTORY', choose_directory), ('PREFLIGHT', preflight),
                            ('CANCEL RUN / SCAN', stop.set), ('COPY JSON REPORT', copy_json),
                            ('SAVE JSON', lambda: save_exact('json')), ('SAVE MARKDOWN', lambda: save_exact('md'))]:
        ttk.Button(directory_bar, text=label, command=callback).pack(side='left', padx=2)
    tk.Button(window,text='RUN COMPLETE LABORATORY',command=complete_tests,font=('Segoe UI',12,'bold'),bg='#7254c7',fg='white',padx=12,pady=10).pack(fill='x',padx=8,pady=6)
    ttk.Label(window, text='Advanced API controls: session method and JSON input').pack()
    method = ttk.Combobox(window, values=['describe', 'execute', 'plan', 'jobs', 'inspect', 'evidence', 'resources', 'cancel', 'reconcile']); method.set('describe'); method.pack(fill='x')
    inputs = tk.Text(window, height=7); inputs.insert('1.0', '{}'); inputs.pack(fill='x')
    ttk.Label(window, text='Results and diagnostics').pack(anchor='w', padx=8)
    output_frame = ttk.Frame(window); output_frame.pack(fill='both', expand=True)
    output = tk.Text(output_frame, height=18, wrap='word'); output.pack(side='left', fill='both', expand=True)
    output_scroll = ttk.Scrollbar(output_frame, orient='vertical', command=output.yview)
    output_scroll.pack(side='right', fill='y'); output.configure(yscrollcommand=output_scroll.set)
    def work(fn, result_kind="result"):
        nonlocal busy
        if busy:
            state.set('An operation is already running'); return
        busy = True
        def run():
            try: events.put((result_kind, fn()))
            except Exception as error:
                if getattr(error, 'contract', None): events.put(('contract-error', error.contract))
                else: events.put(('error', error.code if isinstance(error, RedownError) else 'UNEXPECTED_LOCAL_FAILURE'))
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
                info = describe_response(fresh.describe())
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
        report=latest_report()
        if report:
            path = filedialog.asksaveasfilename(defaultextension='.json')
            if path:
                if report.get('schemaVersion')=='2.8.0':
                    adaptive_persist(report,Path(path).with_suffix('.json'))
                elif 'schemaVersion' in report:
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
        nonlocal busy, next_health, scan, report, last_connection_error
        while not events.empty():
            kind, value = events.get()
            if kind == 'done': busy = False
            elif kind == 'inventory':
                scan = value
                preview.set(str(len(scan['selected'])) + ' selected, ' + str(scan['selectedBytes']) + ' bytes; ' + str(len(scan['exclusions'])) + ' exclusions; ' + json.dumps(scan['countsByExtension']))
                preflight()
            elif kind == 'progress':
                state.set(progress_text(value))
                output.insert('end', json.dumps(value) + '\n'); output.see('end')
            elif kind in ('adaptive-checkpoint','adaptive-report'):
                if kind=='adaptive-report': report=value
                state.set(str(value.get('currentOperation') or 'Finished')+'; completed '+str(value['completedCases'])+'; remaining '+str(value['remainingCases'])+'; verified '+str(value['verifiedFiles'])+' files / '+str(value['verifiedBytes'])+' bytes; '+str(round(value.get('bytesPerSecond') or 0))+' verified B/s; CPU '+str(round(value.get('cpuSeconds',0),2))+'s; '+json.dumps(value['coverage'])+'; ETA '+str(round(value['estimatedRemainingSeconds'] or 0))+'s. Checkpoints: redown-lab-runs/')
                if kind=='adaptive-report': output.delete('1.0','end');output.insert('1.0',json.dumps(value,indent=2))
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
                last_connection_error = None
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
                if kind == 'contract-error':
                    state.set(value['code'] + ': ' + value['component'] + ' missing ' + value['missingField'] + '. ' + value['recommendedAction'])
                if kind == 'error':
                    if value in CONNECTION_RECOVERY or value in ('LOCAL_AUTH_DENIED','SESSION_CLOSED','TIMEOUT_UNCERTAIN'):
                        last_connection_error = value
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
                    guidance.update(CONNECTION_RECOVERY)
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
        root_window.destroy()
    root_window.protocol('WM_DELETE_WINDOW', close); poll(); root_window.mainloop()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['gui', 'conformance', 'scan', 'architecture', 'complete', 'doctor', 'reconcile'], nargs='?', default='gui')
    parser.add_argument('--operation',choices=['upload','mkdir','read','copy','metadata','list'],default='upload')
    parser.add_argument('--smoke',action='store_true',help='Explicitly request fresh eight-byte write after Doctor; extension write approval still required')
    parser.add_argument('--directory')
    parser.add_argument('--owner-config', help='Explicit expiring standalone universal-engine owner scope JSON; complete action only')
    parser.add_argument('--journal', help='New durable standalone engine journal path')
    parser.add_argument('--depth',choices=['Quick','Comprehensive','Stress'],default='Quick')
    parser.add_argument('--profile',choices=['Low RAM','Balanced','Maximum','Custom'],default='Balanced')
    parser.add_argument('--memory-mib',type=int,default=128)
    parser.add_argument('--concurrency',type=int,default=2)
    parser.add_argument('--buffer-bytes',type=int,default=65536)
    parser.add_argument('--offline', action='store_true', help='Scan/plan without connecting; cloud cases remain NOT_TESTED')
    parser.add_argument('--max-files', type=int, default=100000)
    parser.add_argument('--max-file-bytes', type=int, default=1024**3)
    parser.add_argument('--max-total-bytes', type=int, default=4*1024**3)
    parser.add_argument('--root', help='Authorized root as JSON')
    parser.add_argument('--source', help='Exact test object identity as JSON')
    parser.add_argument('--expected-sha256')
    parser.add_argument('--manifest', help='Relative SHA-256 JSON manifest path; defaults to manifest.json when present')
    parser.add_argument('--artifact', action='append', default=[], help='Exact relative non-payload artifact path, repeatable; never exempted by pattern')
    parser.add_argument('--from-report', help='Saved interrupted Adaptive Laboratory JSON; reconciliation only')
    parser.add_argument('--report', default='redown-lab-report.json')
    args = parser.parse_args()
    if args.owner_config and (args.action != 'complete' or args.offline or not args.journal):
        parser.error('--owner-config requires online complete and --journal')
    if args.action == 'gui':
        gui(); return 0
    if args.action == 'reconcile':
        from .recovery import reconcile
        import sys
        if not args.from_report: parser.error('--from-report is required')
        if Path(args.from_report).resolve()==Path(args.report).resolve(): parser.error('Choose a separate --report to preserve original evidence')
        previous=json.loads(Path(args.from_report).read_text(encoding='utf-8'))
        try:
            with ExtensionClient(on_pairing=lambda code: print('Approve READ-ONLY code '+code+' in REDOWN',file=sys.stderr)) as connected:
                report=reconcile(connected,previous,checkpoint=lambda r: adaptive_persist(r,args.report))
            adaptive_persist(report,args.report)
            print(json.dumps(report['reconciliation'],indent=2))
            return 0 if all(r['status']=='CONFIRMED' for r in report['reconciliation']['results']) else 2
        except RedownError as error:
            print(json.dumps({'code':error.code,'action':'Obtain a read-only bucket grant covering the saved namespace; never replay uncertain writes.'})); return 2
    if args.action == 'doctor':
        from .doctor import run as doctor_run, save as doctor_save, EXIT
        import sys
        try:
            with ExtensionClient(on_pairing=lambda code: print('Approve code '+code+' in REDOWN',file=sys.stderr)) as connected:
                report=doctor_run(connected,operation=args.operation,smoke=args.smoke)
        except RedownError as error:
            report={'schemaVersion':'redown.doctor.v1','status':'BLOCKED','readOnly':True,'code':error.code,'diagnostic':error.diagnostic,'steps':[],'liveWriteAcceptance':'NOT_TESTED'}
        doctor_save(report,args.report); print(json.dumps(report,indent=2)); return EXIT[report['status']]
    if args.action == 'complete':
        if not args.directory: parser.error('--directory is required')
        if Path(args.report).resolve().is_relative_to(Path(args.directory).resolve()):
            parser.error('Save --report outside the source corpus to preserve input files')
        settings=resource_profile(args.profile,args.memory_mib,args.concurrency,args.buffer_bytes)
        def scan_files(connected=None):
            import sys
            def scan_progress(stage, completed=0):
                print(json.dumps(dict(stage=stage, completed=completed)), file=sys.stderr, flush=True)
                publish_progress(connected, stage, completed)
            scan_progress('Inventorying files')
            scan = inventory(args.directory,per_extension=None,buffer_bytes=settings['bufferBytes'],max_files=args.max_files,max_file_bytes=args.max_file_bytes,max_total_bytes=args.max_total_bytes,progress=lambda p: scan_progress(**p))
            from .manifest import compare
            scan['manifestVerification'] = compare(scan, args.manifest or 'manifest.json', args.artifact, required=bool(args.manifest))
            return scan
        last_progress = [0.0]
        def checkpoint(r):
            adaptive_persist(r,args.report)
            if r.get('finished') or time.monotonic() - last_progress[0] >= 1:
                import sys
                last_progress[0] = time.monotonic()
                print(json.dumps({k:r.get(k) for k in ('currentOperation','completedCases','remainingCases','verifiedFiles','verifiedBytes','elapsedSeconds','bytesPerSecond','ramObservation','coverage')}, ensure_ascii=True), file=sys.stderr, flush=True)
        if args.offline:
            # Local-only execution must never instantiate the extension or claim a
            # provider authorization failure. Cloud operations remain NOT_TESTED.
            scan = scan_files()
            planned = adaptive_plan(scan, depth=args.depth, resources=settings)
            report = {
                'schemaVersion': 'redown.lab.offline.v1',
                'mode': 'OFFLINE_LOCAL_ONLY',
                'acceptance': 'INCOMPLETE',
                'localInventory': {
                    'status': 'FAIL' if scan['manifestVerification']['status'] == 'FAIL' else 'PASS' if scan['complete'] and not scan['exclusions'] and scan['manifestVerification']['status'] in ('PASS', 'NOT_TESTED') else 'INCOMPLETE',
                    'hashedFiles': scan['hashedFiles'],
                    'hashedBytes': scan['hashedBytes'],
                    'exclusions': scan['exclusions'],
                    'sha256': 'COMPUTED_PER_FILE',
                    'manifestComparison': scan['manifestVerification']['status'],
                    'manifestVerification': scan['manifestVerification'],
                },
                'inventory': scan,
                'plan': planned,
                'coverage': {'NOT_TESTED': planned['plannedOperations']},
                'dispatchedOperations': 0,
                'connectionError': None,
                'cloudEvidence': 'NOT_TESTED',
                'nextAction': 'Local inventory completed. Cloud transfers require a separate explicitly authorized online run.',
            }
            target = Path(args.report)
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(target.suffix + '.tmp')
            temporary.write_text(json.dumps(report, indent=2, ensure_ascii=True) + '\n', encoding='utf-8')
            temporary.replace(target)
            summary = ['# REDOWN offline CMD Laboratory', '', 'Cloud acceptance: INCOMPLETE; no cloud operations dispatched.', '', 'Local inventory: ' + report['localInventory']['status'], 'Hashed files: ' + str(scan['hashedFiles']) + '; bytes: ' + str(scan['hashedBytes']), 'Manifest comparison: ' + scan['manifestVerification']['status'], '', '```json', json.dumps(scan['manifestVerification'], indent=2, ensure_ascii=True), '```', '']
            target.with_suffix('.md').write_text('\n'.join(summary), encoding='utf-8')
            print(json.dumps({
                'mode': report['mode'],
                'localInventory': report['localInventory'],
                'acceptance': report['acceptance'],
                'coverage': report['coverage'],
                'dispatchedOperations': 0,
                'connectionError': None,
                'report': args.report,
                'nextAction': report['nextAction'],
            }))
            return 1 if report['localInventory']['status'] == 'FAIL' else 0 if report['localInventory']['status'] == 'PASS' else 2
        else:
            import sys
            connection_started=time.monotonic()
            scan=None
            try:
                if args.owner_config:
                    from .standalone import StandaloneClient
                    session = StandaloneClient(args.owner_config, args.journal)
                else:
                    session = ExtensionClient(on_pairing=lambda code: print('Approve code '+code+' in REDOWN',file=sys.stderr))
                with session as connected:
                    scan=scan_files(connected)
                    report=adaptive_run(connected if scan['manifestVerification']['status'] not in ('FAIL', 'INCOMPLETE') else None,scan,connection_error='LOCAL_MANIFEST_NOT_VERIFIED' if scan['manifestVerification']['status'] in ('FAIL', 'INCOMPLETE') else None,depth=args.depth,resources=settings,roots=[json.loads(args.root)] if args.root else None,checkpoint=checkpoint)
            except RedownError as error:
                report=adaptive_run(None,scan if scan is not None else scan_files(),depth=args.depth,resources=settings,connection_error=error.code,checkpoint=checkpoint)
            report['connectionAndRunSeconds']=time.monotonic()-connection_started
            checkpoint(report)
        print(json.dumps({'acceptance':report['acceptance'],'coverage':report['coverage'],'connectionError':report.get('connectionError'),'dispatchedOperations':report['dispatchedOperations'],'recovery':report.get('primaryFailure',{}).get('recovery'),'report':args.report,'resultCodes':[c['code']+' '+c['name'] for c in report['labSummary']['codes']],'nextAction':report['labSummary']['nextAction']}))
        return 1 if any(r['status'] in ('FAIL','INDETERMINATE') for r in report['results']) else 2
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
