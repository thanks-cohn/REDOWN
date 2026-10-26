import base64
import hashlib
from pathlib import Path
import tempfile
import threading
import unittest
from redown.adaptive import run, plan, profile, persist
from redown.inventory import inventory
from redown.client import Client, RedownError

class ProviderFixture:
    download=Client.download
    def __init__(self):
        self.objects={};self.calls=[];self.root=dict(provider='extension-r2',account='fixture',container='test-1-new',key='__redown_test__/fixture/')
    def describe(self): return dict(writeEnabled=True,locations=[self.root],limits={'maxBytes':65536},operations=['list','upload','read','metadata','copy','mkdir'])
    def execute(self,operation,**args):
        self.calls.append(operation);dest=args.get('destination',{}).get('key');source=args.get('source',{}).get('key')
        result={}
        if operation=='upload':self.objects[dest]=base64.b64decode(args['bytesBase64'])
        if operation=='copy':self.objects[dest]=self.objects[source]
        if operation=='mkdir':self.objects[dest]=b''
        if operation=='read':
            data=self.objects[source];result=dict(bytesBase64=base64.b64encode(data).decode(),sha256=hashlib.sha256(data).hexdigest())
        return dict(id=str(len(self.calls)),state='completed',result=result)
    def query(self,method,**args):return {'id':args['id'],'state':'available','data':{'operationId':args['id']}}

class AdaptiveTests(unittest.TestCase):
    def test_comprehensive_has_no_sampling_cap_and_explicit_large_file_exclusion(self):
        with tempfile.TemporaryDirectory() as d:
            for n in range(501): (Path(d)/f'{n}.unknown').write_bytes(b'duplicate')
            (Path(d)/'large.bin').write_bytes(b'x'*65537)
            scan=inventory(d,per_extension=None,buffer_bytes=4096)
            p=plan(scan,'Comprehensive')
            self.assertEqual(p['selectedFiles'],501);self.assertEqual(len(p['missing']),1)
            self.assertEqual(len(scan['duplicates'][0]),501)
            report=run(ProviderFixture(),scan,depth='Comprehensive')
            self.assertEqual(report['coverage'],{'PASS':len(p['cases'])})
            self.assertEqual(report['verifiedFiles'],501)
            self.assertEqual(report['verifiedBytes'],501*9)
            self.assertTrue(all(r.get('diskReadbackSha256') for r in report['results'] if r['operation']=='read'))
    def test_offline_reports_and_cancellation(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d)/'empty').touch();scan=inventory(d,per_extension=None)
            r=run(None,scan);self.assertEqual(set(r['coverage']),{'BLOCKED'})
            persist(r,Path(d)/'report.json');self.assertTrue((Path(d)/'report.md').exists())
            stop=threading.Event();stop.set();c=ProviderFixture();r=run(c,scan,cancel=stop)
            self.assertFalse(c.calls);self.assertEqual(set(r['coverage']),{'NOT_TESTED'})
    def test_changed_source_and_uncertainty_preserve_results(self):
        with tempfile.TemporaryDirectory() as d:
            source=Path(d)/'test';source.write_bytes(b'original');scan=inventory(d,per_extension=None);source.write_bytes(b'changed')
            r=run(ProviderFixture(),scan);self.assertEqual(r['results'][1]['error'],'LOCAL_SOURCE_CHANGED')
            source.write_bytes(b'original')
            class Lost(ProviderFixture):
                def execute(self,op,**args):
                    if op=='upload':raise RedownError('TIMEOUT_UNCERTAIN')
                    return super().execute(op,**args)
            r=run(Lost(),scan);self.assertEqual(r['results'][1]['status'],'INDETERMINATE');self.assertEqual(r['results'][2]['status'],'NOT_TESTED')
    def test_profiles_and_stress_are_honest(self):
        self.assertLess(profile('Low RAM')['bufferBytes'],profile('Maximum')['bufferBytes'])
        self.assertEqual(profile('Maximum')['effectiveTransferConcurrency'],1)
        with self.assertRaises(ValueError):profile('Custom',1,99,1)
