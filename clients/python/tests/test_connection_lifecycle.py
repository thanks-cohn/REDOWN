"""Real loopback lifecycle fixtures. No installed Chrome or live R2 proof."""
import io
import json
from pathlib import Path
import queue
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from redown.client import RedownError
from redown.extension import ExtensionClient
from redown.native_host import Relay, Server, Handler
from redown.adaptive import run
from redown.inventory import inventory


class ConnectionLifecycleTests(unittest.TestCase):
    def test_pending_timeout_differs_from_uncertain_operation_and_closed_relay(self):
        relay=Relay(io.BytesIO())
        with patch('redown.native_host.PAIRING_TIMEOUT',0.01):
            self.assertEqual(relay.request('client','pair',{})['error']['code'],'PAIRING_TIMEOUT')
        self.assertFalse(relay.pending)
        with patch('redown.native_host.queue.Queue') as queues:
            queues.return_value.get.side_effect=queue.Empty
            self.assertEqual(relay.request('client','execute',{})['error']['code'],'TIMEOUT_UNCERTAIN')
        relay.close()
        self.assertEqual(relay.request('client','pair',{})['error']['code'],'EXTENSION_DISCONNECTED')
        self.assertFalse(relay.pending)

    def test_host_output_failure_is_transport_loss(self):
        relay=Relay(io.BytesIO()); relay.output.close()
        self.assertEqual(relay.request('client','pair',{})['error']['code'],'EXTENSION_DISCONNECTED')
        self.assertFalse(relay.pending)

    def test_real_loopback_concurrent_approval_rejection_and_native_disconnect(self):
        relay=Relay(io.BytesIO()); server=Server(('127.0.0.1',0),Handler);server.relay=relay
        threading.Thread(target=server.serve_forever,daemon=True).start()
        outgoing=queue.Queue()
        relay.send=lambda message: outgoing.put(message)
        with tempfile.TemporaryDirectory() as directory:
            Path(directory,'connection.json').write_text(json.dumps(dict(version=1,host='127.0.0.1',port=server.server_address[1],key=relay.key,expiresAt=time.time()+60)))
            outcomes=queue.Queue()
            def connect(name):
                try: outcomes.put((name,ExtensionClient(name=name)))
                except RedownError as error: outcomes.put((name,error.code))
            with patch('redown.extension.home',return_value=Path(directory)):
                threads=[threading.Thread(target=connect,args=(name,)) for name in ('GUI','CLI')]
                for thread in threads: thread.start()
                requests=[outgoing.get(timeout=2),outgoing.get(timeout=2)]
                for message in requests:
                    if message['input']['name']=='GUI':
                        relay.receive(dict(id=message['id'],response=dict(apiVersion='1.0.0',state='failed',error=dict(code='PAIRING_REJECTED'))))
                    else:
                        # Approval can be delayed without terminating either listener.
                        relay.receive(dict(id=message['id'],response=dict(apiVersion='1.0.0',state='available',data=dict(clientId=message['client']))))
                for thread in threads: thread.join(timeout=2);self.assertFalse(thread.is_alive())
                result=dict(outcomes.get(timeout=2) for _ in threads)
                self.assertEqual(result['GUI'],'PAIRING_REJECTED')
                cli=result['CLI']
                try:
                    failure=queue.Queue()
                    def describe():
                        try: cli.describe()
                        except RedownError as error: failure.put(error.code)
                    thread=threading.Thread(target=describe);thread.start()
                    while True:
                        message=outgoing.get(timeout=2)
                        if message.get('method')=='describe': break
                    relay.close();thread.join(timeout=2)
                    self.assertFalse(thread.is_alive())
                    self.assertEqual(failure.get(timeout=2),'EXTENSION_DISCONNECTED')
                    self.assertTrue(cli._closed)
                finally: cli.close()
        relay.close();server.shutdown();server.server_close()

    def test_failed_connection_preserves_plan_and_primary_error_without_dispatch(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory,'hello.bin').write_bytes(bytes([0,1,2,3,127,128,254,255]))
            scan=inventory(directory,per_extension=None)
            for code in ('PAIRING_TIMEOUT','PAIRING_REJECTED','EXTENSION_DISCONNECTED','SESSION_EXPIRED'):
                snapshots=[]
                report=run(None,scan,depth='Comprehensive',connection_error=code,checkpoint=lambda r:snapshots.append(json.loads(json.dumps(r))))
                self.assertEqual(report['primaryFailure']['code'],code)
                self.assertEqual(report['dispatchedOperations'],0)
                self.assertEqual(report['notAttemptedOperations'],6)
                self.assertEqual(len(report['plan']['cases']),6)
                self.assertTrue(all(r.get('blockedBy')=='connection' and 'error' not in r for r in report['results']))
                self.assertTrue(all(s['primaryFailure']['code']==code for s in snapshots))
                self.assertIsNone(report['destinationRoot'])

    def test_cli_keeps_original_error_in_both_reports(self):
        from redown.lab import main
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory,'samples');source.mkdir();(source/'hello').write_bytes(b'12345678')
            target=Path(directory,'report.json')
            with patch('redown.lab.ExtensionClient',side_effect=RedownError('EXTENSION_DISCONNECTED')),patch('sys.argv',['lab','complete','--directory',str(source),'--depth','Comprehensive','--report',str(target)]):
                self.assertEqual(main(),2)
            report=json.loads(target.read_text())
            self.assertEqual(report['primaryFailure']['code'],'EXTENSION_DISCONNECTED')
            self.assertEqual(report['dispatchedOperations'],0)
            self.assertIn('EXTENSION_DISCONNECTED',target.with_suffix('.md').read_text())
            self.assertIn('connectionAndRunSeconds',report)
