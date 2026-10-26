import json
from pathlib import Path
import tempfile
import unittest
from test_adaptive import ProviderFixture
from redown.adaptive import run
from redown.inventory import inventory
from redown.client import RedownError

class ResultTests(unittest.TestCase):
    def test_evidence_codes_and_exact_exclusions(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d,'ok.bin').write_bytes(b'abc');Path(d,'large.bin').write_bytes(b'x'*65537)
            r=run(ProviderFixture(),inventory(d,per_extension=None))
            codes={c['code']:c for c in r['labSummary']['codes']}
            self.assertEqual(set(codes),{'LAB-001','LAB-002','LAB-003','LAB-004','LAB-005','LAB-006','LAB-010'})
            self.assertEqual(r['labSummary']['exclusions'],{'BOUNDED_TRANSPORT_LIMIT':1})
            self.assertEqual(codes['LAB-006']['measurements']['transportMaxBytes'],65536)
            self.assertEqual(r['labSummary']['acceptance'],'INCOMPLETE')
            self.assertNotIn(d,json.dumps(r['labSummary']))
    def test_acknowledgement_is_not_verification_and_metadata_mismatch_fails(self):
        class Acknowledged(ProviderFixture):
            def query(self,method,**args):
                r=super().query(method,**args)
                if method=='evidence': r.pop('checkpoints',None)
                return r
        class BadMetadata(ProviderFixture):
            def execute(self,op,**args):
                r=super().execute(op,**args)
                if op=='metadata': r['result']={'size':999}
                return r
        with tempfile.TemporaryDirectory() as d:
            Path(d,'x').write_bytes(b'abc');scan=inventory(d,per_extension=None)
            r=run(Acknowledged(),scan)
            self.assertNotIn('LAB-003',[c['code'] for c in r['labSummary']['codes']])
            self.assertEqual(r['results'][1]['status'],'INDETERMINATE')
            r=run(BadMetadata(),scan)
            self.assertNotIn('LAB-005',[c['code'] for c in r['labSummary']['codes']])
            self.assertEqual(next(c for c in r['results'] if c['operation']=='metadata')['status'],'FAIL')
    def test_auth_interruption_has_recovery_codes_and_no_replay(self):
        class Lost(ProviderFixture):
            def execute(self,op,**args):
                if op=='upload': raise RedownError('OAUTH_REFRESH_REJECTED')
                return super().execute(op,**args)
        with tempfile.TemporaryDirectory() as d:
            Path(d,'x').write_bytes(b'abc');c=Lost();r=run(c,inventory(d,per_extension=None))
            codes={c['code'] for c in r['labSummary']['codes']}
            self.assertTrue({'LAB-007','LAB-008','LAB-009','LAB-010'}<=codes)
            self.assertEqual(c.calls,['list'])
    def test_reporting_is_bounded_throttled_and_does_not_change_acceptance(self):
        class Reporting(ProviderFixture):
            def __init__(self): super().__init__();self.reports=[]
            def describe(self): return {**super().describe(),'methods':['labReport']}
            def query(self,method,**args):
                if method=='labReport': self.reports.append(args['summary']);return {'received':True}
                return super().query(method,**args)
        with tempfile.TemporaryDirectory() as d:
            Path(d,'x').write_bytes(b'abc');c=Reporting();r=run(c,inventory(d,per_extension=None))
            self.assertTrue(c.reports[-1]['finished']);self.assertLessEqual(len(c.reports),3)
            self.assertTrue(all(len(json.dumps(s))<16384 for s in c.reports))
            self.assertEqual(c.reports[-1]['acceptance'],r['acceptance'])
