import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('lab', Path(__file__).parents[1] / 'tools/lab/redown_lab.py')
lab = importlib.util.module_from_spec(spec); spec.loader.exec_module(lab)


class FakeClient:
    """Explicit unit double, never evidence for real cloud operation."""
    def __init__(self, root, false_success=False, mismatch=False, unsupported=False, interrupt=False):
        self.root = root; self.objects = {}; self.false_success = false_success; self.mismatch = mismatch; self.unsupported = unsupported; self.interrupt = interrupt; self.calls = []
    def request(self, route): return {'approved_root': str(self.root), 'connected': True}
    def call(self, op, inputs, scope, directory=None):
        self.calls.append((op, inputs))
        r = {'state': 'completed', 'data': {}}
        if op == 'capabilities': r['data'] = {'operations': ['listRaw','stat','connectionStatus','upload','readStream','delete'], 'upload_max_bytes': lab.MAX_UPLOAD}
        elif op == 'connectionStatus': r['data'] = {'ready': True}
        elif op == 'listRaw': r['data'] = {'entries': [{'key': k, 'size': len(v)} for k, v in self.objects.items()], 'cursor': ''}
        elif op == 'stat': r['data'] = {'object': {'key': inputs['key'], 'size': len(self.objects[inputs['key']])} if inputs['key'] in self.objects else None}
        elif op == 'upload':
            if self.interrupt: raise KeyboardInterrupt()
            if self.unsupported: return {'state': 'failed', 'code': 'UNSUPPORTED_OPERATION'}
            if not self.false_success: self.objects[inputs['key']] = Path(inputs['local_path']).read_bytes()
        elif op == 'readStream':
            target = self.root / 'read.bin'; target.write_bytes(b'wrong' if self.mismatch else self.objects[inputs['key']]); r['download_path'] = str(target)
        elif op == 'delete': self.objects.pop(inputs['entries'][0]['key'], None)
        return r


class LabTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup); self.root = Path(self.temp.name)
        self.corpus = self.root / 'corpus'; self.corpus.mkdir(); (self.corpus / 'a.bin').write_bytes(b'hello')
        self.plan = {'provider':'cloudflare-r2','accountId':'a','bucketName':'b','destination':'redown-test-lab/unit/','corpus':str(self.corpus),'files':['a.bin'],'operations':['upload','download'],'max_files':1,'max_bytes':5}
    def execute(self, **options):
        client = FakeClient(self.root, **options); directory = self.root / 'run'; result = lab.run(client, self.plan, directory); return client, directory, result
    def test_inventory_hash(self):
        inv = lab.inventory(self.corpus); self.assertEqual(inv['file_count'], 1); self.assertEqual(inv['files'][0]['sha256'], lab.digest(self.corpus/'a.bin'))
    def test_lfs_pointer_rejected(self):
        (self.corpus/'a.bin').write_text('version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 3\n')
        with self.assertRaisesRegex(ValueError, 'LFS pointer'): lab.inventory(self.corpus)
    def test_path_escape_rejected(self):
        (self.root/'outside').write_bytes(b'x')
        with self.assertRaises(ValueError): lab.inventory(self.corpus, ['../outside'])
    def test_manifest_pin_mismatch(self):
        self.plan['inventory_sha256'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'integrity'): lab.validate_plan(self.plan)
    def test_duplicate_selection(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate'): lab.inventory(self.corpus, ['a.bin','a.bin'])
    def test_owner_choices_required(self):
        for field in list(self.plan):
            p = dict(self.plan); del p[field]
            with self.assertRaises(ValueError): lab.validate_plan(p)
    def test_explicit_limits(self):
        for field, value in [('max_files',0),('max_bytes',4),('destination','production/')]:
            p = {**self.plan, field:value}
            with self.assertRaises(ValueError): lab.validate_plan(p)
    def test_dry_run_has_no_provider_calls(self):
        client = FakeClient(self.root); result = lab.run(client,self.plan,self.root/'dry',True)
        self.assertEqual(client.calls, []); self.assertFalse((self.root/'dry').exists()); self.assertFalse(result['mutations'])
    def test_success_and_artifacts(self):
        _, directory, result = self.execute(); self.assertEqual(result['counts']['PASS'], 2); self.assertTrue(result['fixtures_unchanged'])
        for f in ('summary.json','results.csv','journal.jsonl','before.json','after.json','diff.json','summary.md'): self.assertTrue((directory/f).exists())
    def test_false_positive_upload_receipt_fails(self):
        _, _, result = self.execute(false_success=True); self.assertEqual(result['counts']['FAIL'],1); self.assertEqual(result['counts']['PASS'],0); self.assertEqual(result['counts']['BLOCKED'],1)
    def test_independent_hash_mismatch_fails(self):
        _, _, result = self.execute(mismatch=True); self.assertEqual(result['counts']['FAIL'],1); self.assertEqual(result['counts']['PASS'],0)
    def test_unsupported_not_omitted(self):
        _, _, result = self.execute(unsupported=True); self.assertEqual(result['counts']['UNSUPPORTED'],1); self.assertEqual(len(result['results']),2)
    def test_interruption_preserves_ownership_and_reports(self):
        _, directory, result = self.execute(interrupt=True); self.assertEqual(result['state'],'interrupted'); self.assertTrue((directory/'state.json').exists()); self.assertTrue(result['owned']); self.assertEqual(result['counts']['PASS'],0)
    def test_snapshot_diff(self):
        a={'objects':{'a':{'size':1},'b':{'size':2}}}; b={'objects':{'a':{'size':3},'c':{'size':4}}}
        self.assertEqual(lab.diff(a,b,['a']),{'added':['c'],'removed':['b'],'changed':['a'],'unexpected':['b','c']})
    def test_timeout_and_uncertain_verdicts(self):
        self.assertEqual(lab.classify({'code':'TIMEOUT'}),'TIMEOUT'); self.assertEqual(lab.classify({'state':'uncertain'}),'UNVERIFIED')
    def test_cleanup_rejects_unverified_intent(self):
        client,directory,result=self.execute(interrupt=True); answer=lab.cleanup(client,directory,True); self.assertEqual(answer[0]['verdict'],'BLOCKED'); self.assertFalse(any(op=='delete' for op,_ in client.calls))
    def test_cleanup_refuses_changed_content(self):
        client,directory,result=self.execute(); client.objects[self.plan['destination']+'a.bin']=b'other'; answer=lab.cleanup(client,directory,True)
        self.assertEqual(answer[0]['verdict'],'FAIL'); self.assertFalse(any(op=='delete' for op,_ in client.calls))
    def test_cleanup_verifies_absence(self):
        client,directory,result=self.execute(); answer=lab.cleanup(client,directory,True); self.assertEqual(answer[0]['verdict'],'PASS'); self.assertEqual(client.objects,{})

if __name__ == '__main__': unittest.main()
