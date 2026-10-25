"""Offline safety/count tests; bytes are synthetic, not format-validity evidence."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

path = Path(__file__).resolve().parents[3] / 'scripts/fixtures/complete-corpus.py'
spec = importlib.util.spec_from_file_location('fixture_collector', path)
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

def setup(root):
    folder = root / 'blank-files-main/files'
    folder.mkdir(parents=True)
    (folder / 'files.json').write_text(json.dumps({'files': [{'type': 'png'}]}))
    (folder / 'one.png').write_bytes(b'one')
    (folder / 'duplicate.png').write_bytes(b'one')
    return folder

def row(data, name='sample.png'):
    return {'extension': 'png', 'size': len(data), 'sha': hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest(), 'repo': 'fixture/repo', 'commit': 'pinned', 'path': 'test/' + name, 'url': 'https://raw.githubusercontent.com/fixture/repo/pinned/' + name}

class FixtureCollectorTests(unittest.TestCase):
    def test_distinct_hashes_not_copies_and_provenance_survives_resume(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); setup(root)
            rows = [row(b'one', 'same.png'), row(b'two', 'different.png')]
            fetch = lambda url, limit: b'one' if url.endswith('same.png') else b'two'
            report = collector.collect(root, per_type=2, repositories=['fixture/repo'], candidate_reader=lambda _: rows, fetch=fetch)
            self.assertEqual(report['downloadedFiles'], 1)
            self.assertEqual(report['gaps'], [])
            manifest = json.loads((root / 'corpus-files.json').read_text())
            downloaded = next(item for item in manifest if item['path'].startswith('additional-samples/'))
            self.assertTrue(downloaded['source'].endswith('different.png'))
            resumed = collector.collect(root, per_type=2, repositories=[], candidate_reader=lambda _: [], fetch=fetch)
            self.assertEqual(resumed['downloadedFiles'], 0)
            manifest = json.loads((root / 'corpus-files.json').read_text())
            self.assertEqual(next(item for item in manifest if item['path'] == downloaded['path'])['source'], downloaded['source'])

    def test_gaps_stay_visible_and_wrong_git_blob_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); setup(root)
            report = collector.collect(root, per_type=5, repositories=['fixture/repo'], candidate_reader=lambda _: [row(b'new')], fetch=lambda *_: b'bad')
            self.assertEqual(report['status'], 'INCOMPLETE')
            self.assertEqual(report['gaps'][0]['missing'], 4)
            self.assertEqual(report['downloadedFiles'], 0)
            self.assertTrue(report['errors'])

    def test_budget_and_symlink_output_fail_before_download(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); setup(root)
            with self.assertRaisesRegex(ValueError, 'budget'):
                collector.collect(root, max_bytes=10, repositories=[])
            outside = root.parent / (root.name + '-outside')
            try:
                (root / 'additional-samples').symlink_to(outside, target_is_directory=True)
            except OSError:
                return  # Symlink creation may be denied on Windows; budget check still ran.
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                collector.collect(root, repositories=[])

if __name__ == '__main__': unittest.main()
