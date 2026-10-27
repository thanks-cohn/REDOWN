"""Deterministic local fixtures only, no Cloudflare acceptance claims."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from test_adaptive import ProviderFixture
from redown.adaptive import run, persist
from redown.inventory import inventory
from redown.client import RedownError
from redown.contracts import checkpoint_view, describe_response
from redown.recovery import reconcile

class RecoveryTests(unittest.TestCase):
    def test_large_streaming_reconciliation_hashes_all_bytes_without_mutations(self):
        import hashlib
        from types import SimpleNamespace
        payload=b'x'*300000+b'end'
        root={'provider':'extension-r2','account':'a','container':'test-1-new','key':'__redown_test__/11111111-1111-4111-8111-111111111111/'}
        run_id='22222222-2222-4222-8222-222222222222'
        previous={'destinationRoot':root,'runId':run_id,'inventory':{'selected':[{'relpath':'large.bin','bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()}]},'results':[{'operation':'copy','file':'large.bin','status':'INDETERMINATE'}]}
        reads=[]
        def download(source,target):
            reads.append(source);target.write_bytes(payload)
        client=SimpleNamespace(describe=lambda:{'methods':['describe','execute'],'locations':[root],'limits':{'maxBytes':65536,'streaming':True}},download=download)
        report=reconcile(client,previous)
        self.assertEqual(report['reconciliation']['results'][0]['status'],'CONFIRMED')
        self.assertEqual(len(reads),1)
        self.assertIn('/copies/large.bin',reads[0]['key'])
        self.assertEqual(previous['results'][0]['status'],'INDETERMINATE')

    def fixture(self, cls=ProviderFixture):
        client=cls()
        client.root['key']='__redown_test__/11111111-1111-4111-8111-111111111111/'
        original=client.describe
        client.describe=lambda:{**original(),'methods':['describe','execute']}
        return client

    def test_first_gui_checkpoint_has_complete_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory,'x').write_bytes(b'abc')
            checkpoints=[]
            report=run(self.fixture(),inventory(directory,per_extension=None),checkpoint=lambda r:checkpoints.append(checkpoint_view(r)))
            self.assertIsNone(checkpoints[0]['currentOperation'])
            self.assertEqual(report['verifiedFiles'],1)
            self.assertEqual(report['verifiedUploads'],1)
            self.assertEqual(report['successfulOperations'],report['dispatchedOperations'])
            self.assertEqual(report['acceptance'],'INCOMPLETE')

    def test_missing_fields_are_redacted_and_actionable(self):
        with self.assertRaises(RedownError) as caught:describe_response({'private_token':'SECRET','locations':[]})
        detail=caught.exception.contract
        self.assertEqual(detail['missingField'],'methods')
        self.assertEqual(detail['component'],'session.describe')
        self.assertEqual(detail['protocolVersion'],'1.0.0')
        self.assertNotIn('SECRET',json.dumps(detail))

    def test_auth_loss_stops_all_later_dispatch(self):
        class Lost(ProviderFixture):
            def execute(self,op,**args):
                if op=='metadata':raise RedownError('OAUTH_REFRESH_REJECTED')
                return super().execute(op,**args)
        with tempfile.TemporaryDirectory() as directory:
            Path(directory,'x').write_bytes(b'abc');Path(directory,'y').write_bytes(b'def')
            report=run(self.fixture(Lost),inventory(directory,per_extension=None),depth='Comprehensive')
            failed=next(i for i,r in enumerate(report['results']) if r.get('error')=='OAUTH_REFRESH_REJECTED')
            self.assertTrue(all(not r['dispatched'] for r in report['results'][failed+1:]))
            self.assertEqual(report['verifiedFiles'],1)
            self.assertEqual(report['acceptance'],'INCOMPLETE')

    def test_crash_after_write_restarts_with_only_hash_verified_readback(self):
        class ProcessDeath(BaseException):pass
        class Crash(ProviderFixture):
            def execute(self,op,**args):
                result=super().execute(op,**args)
                if op=='upload':raise ProcessDeath()
                return result
        with tempfile.TemporaryDirectory() as directory:
            Path(directory,'x').write_bytes(b'abc');scan=inventory(directory,per_extension=None)
            checkpoint=Path(directory,'checkpoint.json');client=self.fixture(Crash)
            with self.assertRaises(ProcessDeath):run(client,scan,checkpoint=lambda r:persist(r,checkpoint))
            saved=json.loads(checkpoint.read_text())
            self.assertEqual(saved['pendingOperation']['status'],'INDETERMINATE')
            client.calls.clear()
            recovered=reconcile(client,saved)
            self.assertEqual(client.calls,['read'])
            self.assertEqual(recovered['reconciliation']['results'][0]['status'],'CONFIRMED')
            self.assertEqual(recovered['acceptance'],'INCOMPLETE')
            self.assertEqual(saved['pendingOperation']['status'],'INDETERMINATE')
            key=saved['pendingOperation']['destination']['key'];client.objects[key]=b'bad'
            self.assertEqual(reconcile(client,saved)['reconciliation']['results'][0]['status'],'CONFLICT')
            self.assertEqual(client.calls,['read','read'])
            tampered=copy.deepcopy(saved);tampered['pendingOperation']['destination']['key']='unrelated'
            with self.assertRaises(RedownError):reconcile(client,tampered)

    def test_malformed_mutation_reply_is_indeterminate_and_halts(self):
        class Malformed(ProviderFixture):
            def execute(self,op,**args):
                result=super().execute(op,**args)
                return {'state':'completed'} if op=='upload' else result
        with tempfile.TemporaryDirectory() as directory:
            Path(directory,'x').write_bytes(b'abc')
            client=self.fixture(Malformed)
            report=run(client,inventory(directory,per_extension=None))
            row=report['results'][1]
            self.assertEqual(row['status'],'INDETERMINATE')
            self.assertEqual(row['responseContract']['missingField'],'id')
            self.assertEqual(client.calls,['list','upload'])
