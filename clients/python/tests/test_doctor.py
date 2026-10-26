import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from redown.client import RedownError
from redown.doctor import run,save,EXIT
from redown.diagnostics import valid,check_payload,SCHEMA

class DoctorTests(unittest.TestCase):
    def test_unavailable_old_extension_and_separate_write_approval(self):
        class Old:
            def describe(self):return {'methods':[]}
        self.assertEqual(run(Old())['status'],'UNSUPPORTED')
        class Current:
            def describe(self):return {'methods':['doctor'],'writeEnabled':False}
            def query(self,*a,**kw):return {'status':'PASS','readOnly':True,'steps':[]}
        self.assertEqual(run(Current())['status'],'PASS')
        self.assertEqual(run(Current(),smoke=True)['code'],'SEPARATE_WRITE_APPROVAL_REQUIRED')
        class Lost:
            def describe(self):raise RedownError('EXTENSION_DISCONNECTED')
        report=run(Lost());self.assertEqual(report['status'],'BLOCKED')
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'doctor.json';save(report,path);self.assertEqual(json.loads(path.read_text())['code'],'EXTENSION_DISCONNECTED');self.assertTrue(path.with_suffix('.md').exists())
    def test_explicit_smoke_cannot_report_read_only_or_not_submitted_after_verification(self):
        class Current:
            def describe(self):return {'methods':['doctor'],'writeEnabled':True}
            def query(self,*a,**kw):return {'status':'PASS','readOnly':True,'steps':[],'mutationPhase':'NOT_SUBMITTED'}
        evidence={'results':[{'operation':'upload','status':'PASS'},{'operation':'read','status':'PASS'}],'verifiedFiles':1}
        with patch('redown.doctor.laboratory_run',return_value=evidence): report=run(Current(),smoke=True)
        self.assertFalse(report['readOnly']);self.assertEqual(report['mutationPhase'],'VERIFIED')
    def test_invalid_diagnostics_never_reach_reports(self):
        error=RedownError('PROVIDER_ERROR',{'authorization':'Bearer SECRET'})
        self.assertEqual(error.code,'DIAGNOSTICS_LOST');self.assertIsNone(error.diagnostic)
        with self.assertRaises(ValueError):check_payload({'steps':[{'diagnostic':{'code':'SECRET'}}]})
    def test_shared_schema_is_exactly_the_published_contract(self):
        root=Path(__file__).resolve().parents[3]
        self.assertEqual(SCHEMA,json.loads((root/'extension/file-engine/diagnostic.schema.json').read_text()))
