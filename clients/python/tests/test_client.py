import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from redown import Client, RedownError

ROOT = Path(__file__).resolve().parents[3]
OPS = 'list,metadata,read,upload,mkdir,copy,move,rename,delete,reconcile'

class ClientTests(unittest.TestCase):
    def test_identical_client_scenarios_across_adapters(self):
        for profile in ['simulation', 'native-reference'] + (['local-reference'] if sys.platform == 'linux' else []):
            with self.subTest(profile=profile), tempfile.TemporaryDirectory() as temporary:
                journal = Path(temporary) / 'journal.json'
                command = ['node', 'agent/files/cli.mjs', '--' + profile, '--operations', OPS, '--journal', str(journal)]
                local_directory = Path(temporary) / 'files'
                if profile == 'local-reference':
                    local_directory.mkdir()
                    config = Path(temporary) / 'owner.json'
                    config.write_text(json.dumps({'adapters': [{'type': 'local-reference', 'directory': str(local_directory)}]}))
                    command = ['node', 'tests/providers/local-entry.mjs', '--config', str(config), '--operations', OPS, '--journal', str(journal)]
                with Client(command, cwd=str(ROOT)) as client:
                    description = client.describe()
                    root = description['locations'][0]
                    native = 'locator' in root
                    def child(name):
                        return {**root, **({'locator': {'parentId': root['locator']['id'], 'name': name}} if native else {'key': name})}
                    payload = bytes(range(256)) * 8
                    created = client.execute('upload', destination=child('corpus.bin'), bytesBase64=base64.b64encode(payload).decode())
                    self.assertEqual(created['state'], 'completed', created)
                    source = created['result']['identity']
                    copied = client.execute('copy', source=source, destination=child('copied.bin'))
                    self.assertEqual(copied['state'], 'completed', copied)
                    target = copied['checkpoints'][0]['destination']
                    read = client.execute('read', source=target)
                    self.assertEqual(base64.b64decode(read['result']['bytesBase64']), payload)
                    trace = client.query('resources', id=copied['id'], metric='getTrace')
                    self.assertEqual(trace['state'], 'available')
                    self.assertEqual(client.query('evidence', id=copied['id'])['fileApiVersion'], '0.3.0')
                    self.assertEqual(client.query('reconcile', id=copied['id'])['replay'], False)
                    conflict = client.execute('upload', destination=child('copied.bin'), content='overwrite')
                    self.assertEqual(conflict['error'], 'CONFLICT')
                    # Oracle uses fresh persisted bytes, independent of session result/readback.
                    state = json.loads(journal.read_text())
                    if profile == 'local-reference':
                        actual = (local_directory / target['key']).read_bytes()
                    else:
                        entries = state['nativeObjects'] if native else state['objects']
                        obj = next(o for o in entries if o.get('id') == target.get('locator', {}).get('id')) if native else next(o for o in entries if o['key'] == target['key'])
                        actual = base64.b64decode(obj['bytesBase64'])
                    self.assertEqual(hashlib.sha256(actual).digest(), hashlib.sha256(payload).digest())
                    deletion = client.execute('delete', source=target, confirmed=True)
                    if profile == 'local-reference':
                        self.assertEqual(deletion['error'], 'UNSUPPORTED_ATOMIC_DELETE')
                    else:
                        self.assertEqual(deletion['state'], 'completed')
                # A new process reads the durable journal but cannot inspect another session's jobs.
                with Client(command, cwd=str(ROOT)) as restarted:
                    with self.assertRaises(RedownError) as denied:
                        restarted.query('inspect', id=copied['id'])
                    self.assertEqual(denied.exception.code, 'AUTHORIZATION_DENIED')

    def test_denial_limits_and_cli(self):
        command = ['node', 'agent/files/cli.mjs', '--simulation', '--operations', 'list']
        with Client(command, cwd=str(ROOT)) as client:
            root = client.describe()['locations'][0]
            with self.assertRaises(RedownError) as denied:
                client.execute('upload', destination={**root, 'key': 'denied'}, content='x')
            self.assertEqual(denied.exception.code, 'AUTHORIZATION_DENIED')
        result = subprocess.run([sys.executable, '-m', 'redown.cli', '--command', json.dumps(command), '--cwd', str(ROOT), 'describe'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('providerContracts', json.loads(result.stdout))

    def test_timeout_closes_without_replay(self):
        with Client([sys.executable, '-c', 'import time; time.sleep(10)'], timeout=0.05) as client:
            with self.assertRaises(RedownError) as error:
                client.describe()
            self.assertEqual(error.exception.code, 'TIMEOUT_UNCERTAIN')
            with self.assertRaises(RedownError) as error:
                client.describe()
            self.assertEqual(error.exception.code, 'SESSION_CLOSED')

if __name__ == '__main__':
    unittest.main()

class TransportSafetyTests(unittest.TestCase):
    def test_malformed_and_oversized_provider_output(self):
        for code, expected in [("print('not JSON', flush=True)", 'INVALID_RESPONSE'), ("import sys; sys.stdout.write('x' * (3*1024*1024+2)); sys.stdout.flush()", 'RESPONSE_BUDGET')]:
            with self.subTest(expected=expected), Client([sys.executable, '-c', code]) as client:
                with self.assertRaises(RedownError) as error:
                    client.describe()
                self.assertEqual(error.exception.code, expected)

    def test_timeout_also_bounds_a_blocked_large_input_write(self):
        with Client([sys.executable, '-c', 'import time; time.sleep(10)'], timeout=0.05) as client:
            started = __import__('time').monotonic()
            with self.assertRaises(RedownError) as error:
                client.query('execute', request={'content': 'x' * 1000000})
            self.assertEqual(error.exception.code, 'TIMEOUT_UNCERTAIN')
            self.assertLess(__import__('time').monotonic() - started, 3)

class ImmutableExtensionTests(unittest.TestCase):
    def test_new_adapter_uses_unchanged_sdk_with_duplicate_nonpath_names(self):
        with tempfile.TemporaryDirectory() as temporary:
            config = Path(temporary) / 'owner.json'
            config.write_text(json.dumps({'adapters': [{'type': 'immutable-reference'}]}))
            command = ['node', 'tests/providers/immutable-entry.mjs', '--config', str(config), '--operations', 'list,metadata,read,upload']
            with Client(command, cwd=str(ROOT)) as client:
                description = client.describe()
                root = description['locations'][0]
                listing = client.execute('list', source=root, limit=1)
                first = listing['result']['objects'][0]
                next_page = client.execute('list', source=root, limit=1, cursor=listing['result']['cursor'])
                second = next_page['result']['objects'][0]
                self.assertEqual(first['name'], second['name'])
                self.assertNotEqual(first['identity'], second['identity'])
                for item, expected in [(first, b'payload-0'), (second, b'payload-1')]:
                    read = client.execute('read', source=item['identity'])
                    self.assertEqual(base64.b64decode(read['result']['bytesBase64']), expected)
                    self.assertEqual(client.query('resources', id=read['id'], metric='getTrace')['state'], 'available')
                denied = client.execute('upload', destination=first['identity'], content='overwrite')
                self.assertEqual(denied['error'], 'PROVIDER_OPERATION_UNSUPPORTED')
