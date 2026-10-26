import json
from pathlib import Path
import sys
import tempfile
import unittest
from redown.client import Client
from redown.doctor import run,save

@unittest.skipUnless(sys.platform.startswith('linux'),'Existing local-reference owner-exclusive adapter is Linux-only')
class NeutralDoctorTests(unittest.TestCase):
    def test_existing_local_adapter_through_real_sdk_and_scoped_doctor(self):
        root=Path(__file__).resolve().parents[3]
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'source.bin';source.write_bytes(bytes([0,255,1]))
            with Client(['node',str(root/'tests/fixtures/provider-neutral-doctor.mjs'),directory],cwd=str(root),timeout=10) as client:
                report=run(client)
                self.assertEqual(report['status'],'PASS')
                self.assertEqual(report['provider'],'local-reference')
                self.assertEqual(report['mutationPhase'],'NOT_SUBMITTED')
                self.assertNotIn('workerVersion',json.dumps(report))
                denied=run(client,smoke=True)
                self.assertEqual(denied['code'],'SEPARATE_WRITE_APPROVAL_REQUIRED')
            self.assertEqual(source.read_bytes(),bytes([0,255,1]))
            save(report,Path(directory)/'doctor.json')
            self.assertEqual(json.loads((Path(directory)/'doctor.json').read_text())['status'],'PASS')
