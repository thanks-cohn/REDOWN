"""CMD approval for the existing owner-launched universal engine session.

This consumes an already provisioned, short-lived test Worker lease. It neither
creates Cloudflare credentials nor borrows an extension/browser session.
"""
import getpass
import json
import os
from pathlib import Path
import re
import tempfile
import time
from datetime import datetime
from .client import Client, RedownError

OPERATIONS = ('list', 'metadata', 'read', 'upload', 'copy', 'mkdir')


def validate(config, now=None):
    now = time.time() if now is None else now
    try:
        expiry = datetime.fromisoformat(config['expiresAt'].replace('Z', '+00:00')).timestamp()
        if not now < expiry <= now + 4 * 3600:
            raise ValueError()
        adapters = config['adapters']
        if len(adapters) != 1 or adapters[0]['type'] != 'r2-worker':
            raise ValueError()
        adapter = adapters[0]
        from urllib.parse import urlsplit
        url = urlsplit(adapter['endpoint'])
        if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment:
            raise ValueError()
        if not re.fullmatch(r'__redown_test__/[a-f0-9-]+/', adapter['prefix']):
            raise ValueError()
        if not re.fullmatch(r'REDOWN_[A-Z0-9_]{1,64}', adapter['authorizationEnv']):
            raise ValueError()
        scope = config['scope']; locations = scope['locations']
        if len(locations) != 1:
            raise ValueError()
        root = locations[0]
        if root != dict(provider='r2-lab', account='lab', container=root['container'], key=adapter['prefix']):
            raise ValueError()
        if root['container'] not in ['test-1-new', 'test-2-new', 'test-3-new', 'test-4-new']:
            raise ValueError()
        if set(scope['operations']) != set(OPERATIONS) or not 1 <= scope['maxOperations'] <= 100000:
            raise ValueError()
        return root
    except (KeyError, TypeError, ValueError, AttributeError):
        raise RedownError('INVALID_OR_EXPIRED_OWNER_SCOPE') from None


class StandaloneClient(Client):
    def __init__(self, config_path, journal, *, prompt=input, secret=getpass.getpass):
        config_path = Path(config_path)
        try:
            if config_path.stat().st_size > 65536:
                raise ValueError()
            config = json.loads(config_path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            raise RedownError('INVALID_OWNER_CONFIGURATION') from None
        root = validate(config)
        journal = Path(journal).resolve()
        # Never reuse a journal or replay its uncertain writes in a fresh run.
        journal.parent.mkdir(parents=True, exist_ok=True)
        if journal.exists():
            raise RedownError('EXISTING_JOURNAL_REQUIRES_RECONCILIATION')
        phrase = root['container'] + ' ' + root['key']
        if prompt('Approve test writes, retained objects, and scope until ' + config['expiresAt'] +
                  '\nWorker endpoint: ' + config['adapters'][0]['endpoint'] + '\nType exactly ' + phrase + ': ') != phrase:
            raise RedownError('OWNER_APPROVAL_REQUIRED')
        environment = os.environ.copy()
        # Always ask for this lease explicitly; do not silently inherit credentials.
        import sys
        if secret is getpass.getpass and not sys.stdin.isatty():
            raise RedownError('INTERACTIVE_SECRET_ENTRY_REQUIRED')
        token = secret('Leased Worker bearer credential (hidden; no account API token): ')
        if not re.fullmatch(r'Bearer [a-f0-9]{64}', token):
            raise RedownError('INVALID_LEASE_CREDENTIAL')
        environment[config['adapters'][0]['authorizationEnv']] = token
        repo = Path(__file__).resolve().parents[3]
        if not (repo / 'agent/files/cli.mjs').is_file():
            raise RedownError('OWNER_ENGINE_CHECKOUT_REQUIRED')
        # Snapshot approved non-secret settings so a concurrent edit cannot widen scope.
        with tempfile.TemporaryDirectory(prefix='redown-owner-scope-') as folder:
            snapshot = Path(folder) / 'owner.json'
            snapshot.write_text(json.dumps(config), encoding='utf-8')
            super().__init__(['node', 'agent/files/cli.mjs', '--config', str(snapshot),
                              '--operations', ','.join(OPERATIONS), '--journal', str(journal)],
                             cwd=str(repo), timeout=60, env=environment)
            try:
                description = super().describe()
                if description['locations'] != [root]:
                    raise RedownError('AUTHORIZATION_SCOPE_MISMATCH')
            except Exception:
                self.close()
                raise
        self._expires = config['expiresAt']

    def describe(self):
        info = super().describe()
        # Interface compatibility only: authorization remains in the scoped session
        # and engine. Its adapter performs conditional create and verified readback.
        info.update(writeEnabled=True, expiresAt=self._expires)
        info['limits']['maxBytes'] = min(info['limits']['maxBytes'], 2097152)
        return info
