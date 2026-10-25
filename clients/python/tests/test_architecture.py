import hashlib
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from redown.inventory import inventory
from redown.architecture import run, report_json, exit_code

ROOT = Path(__file__).resolve().parents[3]

class ArchitectureTests(unittest.TestCase):
    def test_real_pack(self):
        scan = inventory(ROOT / 'test-fixtures/architecture-samples')
        self.assertEqual(scan['hashedFiles'], 60)
        self.assertEqual(len(scan['countsByExtension']), 32)
        self.assertEqual(scan, inventory(ROOT / 'test-fixtures/architecture-samples'))
        for sample in scan['selected']:
            raw = (ROOT / 'test-fixtures/architecture-samples' / sample['relpath']).read_bytes()
            self.assertEqual(sample['sha256'], hashlib.sha256(raw).hexdigest())
            self.assertEqual(sample['bytes'], len(raw))
        self.assertTrue(all(c['selected'] >= 1 for c in scan['countsByExtension'].values()))

    def test_nested_targets_duplicates_links_and_diversity(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); (root / 'nested').mkdir()
            for ext, count in [('PNG', 423), ('pdf', 3), ('heic', 1)]:
                for i in range(count):
                    (root / 'nested' / f'{i:04}.{ext}').write_bytes(str(i).encode() + b'x'*i)
            (root / 'duplicate.png').write_bytes((root / 'nested/0000.PNG').read_bytes())
            (root / '.hidden').write_bytes(b'')
            try: (root / 'cycle').symlink_to(root, target_is_directory=True)
            except OSError: pass
            scan = inventory(root)
            self.assertEqual([scan['countsByExtension'][e]['selected'] for e in ['.png', '.pdf', '.heic']], [5, 3, 1])
            pngs = [s for s in scan['selected'] if s['extension']=='.png']
            self.assertEqual(len({s['sha256'] for s in pngs}), 5)
            self.assertEqual(max(s['bytes'] for s in pngs), 425)
            self.assertTrue(any(e['reason']=='DUPLICATE_CONTENT_WITHIN_EXTENSION' for e in scan['exclusions']))
            self.assertEqual(scan, inventory(root))

    def test_limits_empty_cancel_and_offline_report(self):
        with tempfile.TemporaryDirectory() as temp:
            self.assertEqual(inventory(temp)['selected'], [])
            (Path(temp)/'big.bin').write_bytes(b'12345')
            scan = inventory(temp, max_file_bytes=2)
            self.assertEqual(scan['exclusions'][0]['reason'], 'FILE_BYTE_LIMIT')
            stop = threading.Event(); stop.set()
            self.assertFalse(inventory(temp, cancel=stop)['complete'])
            checkpoints = []
            report = run(None, scan, checkpoint=lambda r: checkpoints.append(report_json(r)), evidence_tier='OFFLINE_NO_PROVIDER')
            self.assertEqual(report['acceptance'], 'INCOMPLETE')
            self.assertEqual(exit_code(report), 2)
            self.assertFalse(report['cleanup']['mutationsAttempted'])
            self.assertEqual(json.loads(checkpoints[-1]), report)
            self.assertEqual(json.loads(report_json(report)), report)

    def test_copy_save_and_cli_parity(self):
        from redown.architecture import copy_report, save_architecture_report
        import subprocess
        import sys
        class Clipboard:
            def clipboard_clear(self): self.text = ''
            def clipboard_append(self, text): self.text += text
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)/'source'; folder.mkdir()
            (folder/'unicode-雪.txt').write_bytes(b'fixture')
            report = run(None, inventory(folder))
            widget = Clipboard(); copied = copy_report(widget, report)
            target = Path(temp)/'saved.json'; save_architecture_report(report, target)
            self.assertEqual(widget.text, copied)
            self.assertEqual(target.read_text(), copied)
            cmd = [sys.executable, '-m', 'redown.lab', 'architecture', '--offline', '--directory', str(folder), '--report', str(target)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(json.loads(result.stdout), json.loads(target.read_text()))
            self.assertEqual(json.loads(result.stdout)['inventory'], inventory(folder))
            result = subprocess.run(cmd + ['--max-files', '0'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 4)

    def test_mismatched_evidence_and_uncertain_transport_never_pass(self):
        from redown.client import RedownError
        class Broken:
            def describe(self):
                return {'locations': [{'provider':'fixture','account':'a','container':'b','key':''}], 'operations':['list','metadata','read'], 'limits':{'maxBytes':65536}}
            def execute(self, op, **kwargs):
                if op == 'metadata': raise RedownError('TIMEOUT_UNCERTAIN')
                return {'state':'completed','id':'job','receipt':{'operationId':'job','source':kwargs['source']},'result':{}}
            def query(self, method, **kwargs):
                if method == 'evidence': return {'id':'wrong'}
                return {'state':'available','data':{'operationId':'job'}}
        with tempfile.TemporaryDirectory() as temp:
            (Path(temp)/'file.txt').write_bytes(b'hello')
            report = run(Broken(), inventory(temp), evidence_tier='MOCKED_PROVIDER')
            self.assertEqual(report['cases'][1]['status'], 'FAIL')
            self.assertTrue(any(c['status']=='INDETERMINATE' for c in report['cases']))
            self.assertFalse(any(c['status']=='PASS' for c in report['cases'] if c['name'] in ['list','source-readback']))

    def test_case_collision_zero_bytes_and_scan_limit(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root/'A.TXT').write_bytes(b'')
            (root/'a.txt').write_bytes(b'different')
            scan = inventory(root)
            if len(list(root.iterdir())) == 2:
                self.assertEqual(scan['caseCollisions'], [['A.TXT', 'a.txt']])
            self.assertTrue(any(row['zeroBytes'] for row in scan['selected']))
            self.assertFalse(inventory(root, max_files=1)['complete'])

    def test_symlink_outside_root_never_hashed(self):
        with tempfile.TemporaryDirectory() as temp, tempfile.TemporaryDirectory() as outside:
            (Path(outside)/'secret.txt').write_bytes(b'outside')
            try:
                (Path(temp)/'directory-link').symlink_to(outside, target_is_directory=True)
                (Path(temp)/'file-link.txt').symlink_to(Path(outside)/'secret.txt')
            except OSError:
                self.skipTest('OS does not permit creating symlinks')
            scan = inventory(temp)
            self.assertEqual(scan['hashedFiles'], 0)
            self.assertEqual(len(scan['exclusions']), 2)

    def test_cancel_prevents_following_dispatch_including_negatives(self):
        stop = threading.Event()
        class CancelledClient:
            calls = 0
            def describe(self):
                return {'locations': [{'provider':'fixture','account':'a','container':'b','key':''}], 'operations':['list','metadata','read']}
            def execute(self, *args, **kwargs):
                self.calls += 1
                raise AssertionError('Cancellation must prevent dispatch')
            def query(self, *args, **kwargs):
                raise AssertionError('Cancellation must prevent negative dispatch')
        with tempfile.TemporaryDirectory() as temp:
            (Path(temp)/'file.txt').write_bytes(b'hello')
            stop.set(); client = CancelledClient()
            report = run(client, inventory(temp), cancel=stop)
            self.assertEqual(client.calls, 0)
            self.assertFalse(any(c['status']=='PASS' for c in report['cases'] if c['name']!='discovery'))
            self.assertTrue(any(c['code']=='CANCELLED_BEFORE_DISPATCH' for c in report['cases'] if 'code' in c))

    def test_progress_without_sample_is_safe_for_gui_callback(self):
        from redown.architecture import progress_text
        self.assertEqual(progress_text({'name':'list','status':'PASS','sample':None}), 'list: PASS ')
        self.assertEqual(progress_text({'name':'read','status':'PASS','sample':'雪.png'}), 'read: PASS 雪.png')

    def test_no_overall_sixty_file_cap(self):
        with tempfile.TemporaryDirectory() as temp:
            for i in range(75):
                (Path(temp)/f'file.ext{i}').write_bytes(str(i).encode())
            scan = inventory(temp)
            self.assertEqual(len(scan['selected']), 75)
            self.assertEqual(len(scan['countsByExtension']), 75)
