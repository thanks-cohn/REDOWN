from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
from redown.client import Client, RedownError
from redown.standalone import StandaloneClient, validate, OPERATIONS


def scope():
    return dict(expiresAt=datetime.fromtimestamp(time.time()+600, timezone.utc).isoformat(),
                adapters=[dict(type='r2-worker', endpoint='https://owner-test.example.workers.dev',
                               prefix='__redown_test__/abc-123/', authorizationEnv='REDOWN_TEST_LEASE')],
                scope=dict(operations=list(OPERATIONS), maxOperations=100,
                           locations=[dict(provider='r2-lab',account='lab',container='test-1-new',key='__redown_test__/abc-123/')]))


class StandaloneTests(unittest.TestCase):
    def test_expiry_scope_and_provider_are_fail_closed(self):
        good = scope()
        self.assertEqual(validate(good)['container'], 'test-1-new')
        changes = [lambda c:c.update(expiresAt='bad'),
                   lambda c:c.update(expiresAt='2000-01-01T00:00:00Z'),
                   lambda c:c.update(expiresAt='2099-01-01T00:00:00Z'),
                   lambda c:c['scope']['locations'][0].update(container='production'),
                   lambda c:c['scope']['operations'].append('delete'),
                   lambda c:c['adapters'][0].update(type='simulation'),
                   lambda c:c['adapters'][0].update(endpoint='http://owner.example'),
                   lambda c:c['adapters'][0].update(prefix='unscoped/'),
                   lambda c:c['adapters'][0].update(authorizationEnv='PATH')]
        for change in changes:
            c = scope(); change(c)
            with self.assertRaises(RedownError): validate(c)

    def test_no_process_or_secret_request_before_explicit_approval(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'scope.json'; path.write_text(json.dumps(scope()))
            with patch.object(Client, '__init__') as start:
                with self.assertRaisesRegex(RedownError, 'OWNER_APPROVAL_REQUIRED'):
                    StandaloneClient(path, Path(d)/'new-journal', prompt=lambda _: 'no', secret=lambda _:self.fail('secret requested'))
                start.assert_not_called()
            journal = Path(d)/'existing'; journal.touch()
            with self.assertRaisesRegex(RedownError, 'EXISTING_JOURNAL'):
                StandaloneClient(path, journal, prompt=lambda _:self.fail('approval requested'))

    def test_existing_engine_launch_receives_isolated_hidden_credential(self):
        with tempfile.TemporaryDirectory() as d:
            config = scope(); root = validate(config)
            path = Path(d)/'scope.json'; path.write_text(json.dumps(config))
            description = dict(locations=[root], limits={'maxBytes':2097152})
            token = 'Bearer ' + 'a'*64
            with patch.object(Client, '__init__', return_value=None) as start, patch.object(Client, 'describe', return_value=description):
                client = StandaloneClient(path,Path(d)/'journal',prompt=lambda _:root['container']+' '+root['key'],secret=lambda _:token)
                command = start.call_args.args[0]
                self.assertEqual(command[:2], ['node','agent/files/cli.mjs'])
                self.assertNotIn(token, ' '.join(command))
                self.assertEqual(start.call_args.kwargs['env']['REDOWN_TEST_LEASE'], token)
                self.assertFalse(Path(command[3]).exists())
                self.assertTrue(client.describe()['writeEnabled'])
