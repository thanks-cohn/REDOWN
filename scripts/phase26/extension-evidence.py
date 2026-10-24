"""Verify frozen core bytes after the adapter-only extension, without refreshing the freeze."""
import hashlib
import json
from pathlib import Path
freeze=json.loads(Path('verification/phase26/extension-freeze.json').read_text())
files=[{'path':p,'before':expected,'after':hashlib.sha256(Path(p).read_bytes()).hexdigest()} for p,expected in freeze['files'].items()]
report={'version':'1.0.0','exercise':'immutable-reference adapter + owner registration + unchanged inherited contract/Python scenarios','files':files,'unchanged':all(f['before']==f['after'] for f in files),'newAdapter':'extension/file-engine/adapters/immutable-reference.mjs','registration':'tests/providers/immutable-registration.mjs','tests':['tests/provider-immutable-contract.test.mjs','clients/python/tests/test_client.py'],'limitations':['Linux owner-exclusive reference sandbox','not general adversarial host filesystem access','native rename/delete unavailable','full AAC/installed-browser acceptance remains separate']}
Path('verification/phase26/adapter-extension.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'unchanged':report['unchanged'],'files':len(files)}))
if not report['unchanged']:raise SystemExit(1)
