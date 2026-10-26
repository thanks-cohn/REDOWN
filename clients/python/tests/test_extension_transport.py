import io
import json
import queue
import socket
import struct
import threading
import unittest
import tempfile
from pathlib import Path
import redown.install_host
from redown import connect
from redown.extension import RenewalSchedule
from redown.native_host import Relay, Server, Handler, read_frame, write_frame, MAX_FRAME, AUTHENTICATED_IDLE_TIMEOUT
from redown.client import RedownError
from redown.lab import conformance

class NativeTransportTests(unittest.TestCase):
    def test_forty_minute_schedule_uses_monotonic_time_without_burst_replay(self):
        now = [0]
        schedule = RenewalSchedule(clock=lambda: now[0])
        now[0] = 2399
        self.assertFalse(schedule.claim_due())
        now[0] = 2400
        self.assertTrue(schedule.claim_due())
        self.assertFalse(schedule.claim_due())
        now[0] = 20000
        self.assertTrue(schedule.claim_due())
        self.assertFalse(schedule.claim_due())
        schedule.reset()
        self.assertEqual(schedule.next_due, 22400)

    def test_direct_mode_is_explicitly_unsupported(self):
        with self.assertRaises(RedownError) as error:
            connect(mode="direct-s3")
        self.assertEqual(error.exception.code, "CONNECTION_MODE_UNSUPPORTED")

    def test_frames_fragmentation_and_budget(self):
        stream = io.BytesIO(); write_frame(stream, {'unicode': 'é', 'newline': '\n'}); stream.seek(0)
        self.assertEqual(read_frame(stream)['unicode'], 'é')
        with self.assertRaises(ValueError): read_frame(io.BytesIO(struct.pack('=I', MAX_FRAME + 1)))
        with self.assertRaises(EOFError): read_frame(io.BytesIO(b'\x01'))

    def test_authenticated_listener_and_explicit_pairing(self):
        relay = Relay(io.BytesIO()); server = Server(('127.0.0.1', 0), Handler); server.relay = relay
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            with socket.create_connection(server.server_address) as connection:
                stream = connection.makefile('rwb', buffering=0)
                write_frame(stream, {'key': 'wrong'})
                self.assertEqual(read_frame(stream)['error']['code'], 'LOCAL_AUTH_DENIED'); stream.close()
            with socket.create_connection(server.server_address) as connection:
                stream = connection.makefile('rwb', buffering=0)
                write_frame(stream, {'key': relay.key}); hello = read_frame(stream)
                self.assertIn('clientId', hello)
                write_frame(stream, {'method': 'describe'})
                self.assertEqual(read_frame(stream)['error']['code'], 'PAIRING_REQUIRED')
                # Native side rejection travels back to Python; host cannot approve itself.
                def reject(client, method, inputs):
                    self.assertEqual(method, 'pair')
                    return {'apiVersion': '1.0.0', 'state': 'failed', 'error': {'code': 'PAIRING_REJECTED'}}
                relay.request = reject
                write_frame(stream, {'method': 'pair', 'input': {'name': 'test'}})
                self.assertEqual(read_frame(stream)['error']['code'], 'PAIRING_REJECTED'); stream.close()
        finally:
            relay.close(); server.shutdown(); server.server_close()

    def test_authenticated_idle_timeout_matches_longest_grant(self):
        from types import SimpleNamespace
        relay = Relay(io.BytesIO())
        relay.request = lambda *_: {'apiVersion': '1.0.0', 'state': 'available', 'data': {}}
        incoming = io.BytesIO()
        write_frame(incoming, {'key': relay.key})
        write_frame(incoming, {'method': 'pair', 'input': {'name': 'idle-test'}})
        incoming.seek(0)
        class Connection:
            timeouts = []
            def makefile(self, *_): return incoming
            def settimeout(self, timeout): self.timeouts.append(timeout)
            def sendall(self, data): pass
        connection = Connection()
        Handler(connection, ('127.0.0.1', 12345), SimpleNamespace(relay=relay))
        self.assertEqual(connection.timeouts, [5, 130, AUTHENTICATED_IDLE_TIMEOUT])
        self.assertEqual(AUTHENTICATED_IDLE_TIMEOUT, 8 * 3600)

    def test_disconnect_unblocks_pending_request(self):
        relay = Relay(io.BytesIO()); result = queue.Queue()
        thread = threading.Thread(target=lambda: result.put(relay.request('id', 'describe', {}))); thread.start()
        while not relay.pending: pass
        relay.close(); thread.join(timeout=1)
        self.assertEqual(result.get()['error']['code'], 'EXTENSION_DISCONNECTED')


class WindowsRegistrationContracts(unittest.TestCase):
    def test_windows_registration_uses_exact_origin_and_quoted_interpreter(self):
        from contextlib import nullcontext
        from types import SimpleNamespace
        from unittest.mock import patch
        import redown.install_host as installer
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)/'helper with spaces'
            values=[]
            registry=SimpleNamespace(HKEY_CURRENT_USER=1,REG_SZ=1,CreateKey=lambda *a:nullcontext('key'),SetValueEx=lambda *a:values.append(a))
            with patch.object(installer,'home',return_value=folder),patch.object(installer.os,'name','nt'),patch.object(installer.sys,'argv',['install','--extension-id','a'*32]),patch.object(installer.sys,'executable',r'C:\Program Files\Python\python.exe'),patch.dict('sys.modules',winreg=registry),patch.object(installer.subprocess,'check_output',return_value='"user","S-1-5-21-123"'),patch.object(installer.subprocess,'run'):
                self.assertEqual(installer.main(),0)
            manifest=json.loads((folder/'com.redown.laboratory.json').read_text())
            self.assertEqual(manifest['allowed_origins'],['chrome-extension://'+'a'*32+'/'])
            self.assertIn('"C:\\Program Files\\Python\\python.exe" -m redown.native_host %*',(folder/'native-host.cmd').read_text())
            self.assertTrue(values)

if __name__ == '__main__': unittest.main()
