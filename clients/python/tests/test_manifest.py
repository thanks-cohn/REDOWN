import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from redown.inventory import inventory
from redown.manifest import compare
from redown.adaptive import plan


class ManifestTests(unittest.TestCase):
    def fixture(self, folder):
        rows = []
        for size in (65535, 65536, 65537):
            name = 'é space #' + str(size) + '.bin'
            data = b'x' * size
            (folder / name).write_bytes(data)
            rows.append(dict(path=name, bytes=size, sha256=hashlib.sha256(data).hexdigest()))
        (folder / 'manifest.json').write_text(json.dumps(dict(files=rows)), encoding='utf-8')
        return rows

    def test_boundaries_and_explicit_artifacts(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d); self.fixture(folder)
            (folder / 'README.txt').write_bytes(b'notes')
            scan = inventory(d, per_extension=None)
            self.assertEqual(compare(scan)['status'], 'FAIL')
            result = compare(scan, artifacts=['README.txt'])
            self.assertEqual(result['status'], 'PASS')
            self.assertEqual(result['expectedFiles'], 3)
            self.assertEqual(result['expectedBytes'], 196608)
            self.assertEqual({a['classification'] for a in result['artifacts']}, {'MANIFEST', 'DECLARED_ARTIFACT'})
            scan['manifestVerification'] = result
            self.assertEqual(plan(scan, 'Comprehensive')['selectedFiles'], 2)
            self.assertEqual(len(plan(scan, 'Comprehensive')['missing']), 1)

    def test_200_mib_payload_plus_exact_2048_artifact_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d) / 'corpus'; folder.mkdir()
            sizes = [65535, 65536, 65537] + [1024**2] * 7
            sizes.append(200 * 1024**2 - sum(sizes))
            rows = []
            chunk = b'x' * 65536
            for n, size in enumerate(sizes):
                digest = hashlib.sha256(); name = str(n) + '.bin'
                with (folder / name).open('wb') as output:
                    remaining = size
                    while remaining:
                        block = chunk[:min(remaining, len(chunk))]
                        output.write(block); digest.update(block); remaining -= len(block)
                rows.append(dict(path=name, bytes=size, sha256=digest.hexdigest()))
            manifest = json.dumps(dict(files=rows)).encode()
            self.assertLess(len(manifest), 1800)
            (folder / 'manifest.json').write_bytes(manifest + b' ' * (1800-len(manifest)))
            (folder / 'README.txt').write_bytes(b'n' * 248)
            scan = inventory(folder, per_extension=None, buffer_bytes=65536)
            self.assertEqual(scan['hashedFiles'], 13)
            self.assertEqual(scan['hashedBytes'], 209717248)
            self.assertEqual(compare(scan)['status'], 'FAIL')
            result = compare(scan, artifacts=['README.txt'])
            self.assertEqual(result['status'], 'PASS')
            self.assertEqual(result['expectedFiles'], 11)
            self.assertEqual(result['expectedBytes'], 209715200)
            self.assertEqual(sum(a['bytes'] for a in result['artifacts']), 2048)

    def test_mismatch_missing_unexpected_and_unverified_are_distinct(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d); rows = self.fixture(folder)
            (folder / rows[0]['path']).write_bytes(b'y' * 65535)
            (folder / rows[1]['path']).unlink()
            (folder / 'extra').touch()
            result = compare(inventory(d, per_extension=None, max_file_bytes=65536))
            outcomes = {c['code']: c['status'] for c in result['cases']}
            self.assertEqual(outcomes['SIZE_OR_HASH_MISMATCH'], 'FAIL')
            self.assertEqual(outcomes['MISSING_PAYLOAD'], 'FAIL')
            self.assertEqual(outcomes['UNEXPECTED_FILE'], 'FAIL')
            self.assertEqual(outcomes['FILE_BYTE_LIMIT'], 'NOT_TESTED')

    def test_invalid_schema_paths_duplicates_and_hashes_fail_closed(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            valid = dict(path='ok', bytes=0, sha256=hashlib.sha256(b'').hexdigest())
            documents = [dict(files=[]), dict(files=[valid, valid]), dict(files=[{**valid, 'path':'../escape'}]),
                         dict(files=[{**valid, 'path':'C:/escape'}]), dict(files=[{**valid, 'size':0}]),
                         dict(files=[{**valid, 'sha256':'bogus'}]), dict(files=[{**valid, 'bytes':True}])]
            for document in documents:
                (folder / 'manifest.json').write_text(json.dumps(document))
                self.assertEqual(compare(inventory(d, per_extension=None))['status'], 'FAIL')
            (folder / 'manifest.json').write_text('{"files": [], "files": []}')
            self.assertEqual(compare(inventory(d, per_extension=None))['code'], 'DUPLICATE_JSON_KEY')
            (folder / 'manifest.json').unlink()
            self.assertEqual(compare(inventory(d, per_extension=None))['status'], 'NOT_TESTED')
            self.assertEqual(compare(inventory(d, per_extension=None), required=True)['status'], 'FAIL')

    def test_offline_command_without_network_extension_or_gui(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d) / 'corpus'; folder.mkdir(); rows = self.fixture(folder)
            report = Path(d) / 'report.json'
            # In-process entrypoint with hard tripwires catches any accidental GUI,
            # extension construction, or network access; subprocess checks real exit.
            from redown.lab import main
            from unittest.mock import patch
            args = ['redown.lab','complete','--offline','--directory',str(folder),'--report',str(report)]
            with patch.object(sys, 'argv', args), patch('redown.lab.ExtensionClient', side_effect=AssertionError('extension forbidden')), patch('redown.lab.gui', side_effect=AssertionError('GUI forbidden')), patch('socket.socket', side_effect=AssertionError('network forbidden')):
                self.assertEqual(main(), 0)
            value = json.loads(report.read_text())
            self.assertEqual(value['localInventory']['manifestComparison'], 'PASS')
            self.assertEqual(value['dispatchedOperations'], 0)
            self.assertIsNone(value['connectionError'])
            self.assertEqual(value['acceptance'], 'INCOMPLETE')
            self.assertTrue(report.with_suffix('.md').exists())
            (folder / rows[0]['path']).unlink()
            run = subprocess.run([sys.executable, '-m', 'redown.lab', *args[1:]], capture_output=True)
            self.assertEqual(run.returncode, 1, run.stderr)
