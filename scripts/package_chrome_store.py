"""Build a deterministic Chrome candidate from an explicit runtime file list.

Uses only Python's standard library. Does not certify policy or live readiness.
"""
import hashlib
import json
from pathlib import Path
import re
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'extension'
FILES = (
    'background.js', 'cloudflare-api.js', 'cloudflare-auth.js', 'runtime-diagnostics.js', 'explorer-diagnostics.js', 'explorer-diagnostics-bridge.js', 'explorer-diagnostics-ui.js', 'search-session.js', 'explorer-destination-menu.js',
    'hitomi-capture.js', 'menu-reorder.js', 'nested-locations.js',
    'nested-menu-editor.js', 'storage-signals.js', 'public-addresses.js', 'explorer-status.js', 'options.html', 'options.js', 'popup.html',
    'popup.js', 'odometer.js', 'transfer-counter.js', 'rfis-index.js', 'model-viewer.min.js', 'manifest.json',
    'icon.svg', 'settings-mascot.js', 'settings-mascot.png', 'LICENSE', 'fonts/OFL.txt', 'fonts/README.md',
    'fonts/dm-sans-latin-variable.woff',
    'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon128.png',
)


def build():
    manifest = json.loads((SOURCE / 'manifest.json').read_text())
    assert manifest['manifest_version'] == 3, 'Expected Manifest V3'
    assert len(manifest['description']) <= 132, 'Description exceeds store limit'
    assert re.fullmatch(r'\d+(\.\d+){0,3}', manifest['version']), 'Invalid version'
    files = set(FILES)
    for name in files:
        assert (SOURCE / name).is_file(), f'Missing release file: {name}'
        assert not (SOURCE / name).is_symlink(), f'Symlink: {name}'
    refs = [manifest['background']['service_worker'], manifest['options_page'],
            manifest['action']['default_popup']]
    for icons in (manifest['icons'], manifest['action']['default_icon']):
        for size, name in icons.items():
            refs.append(name)
            data = (SOURCE / name).read_bytes()
            assert data[:8] == b'\x89PNG\r\n\x1a\n', f'Not PNG: {name}'
            assert struct.unpack('>II', data[16:24]) == (int(size), int(size)), name
    for html in ('options.html', 'popup.html'):
        for ref in re.findall(r'(?:src|href)=["\']([^"\']+)', (SOURCE / html).read_text()):
            if not ref.startswith(('#', 'https:', 'http:', 'data:')):
                refs.append(ref.split('#')[0].split('?')[0])
    for name in refs:
        assert name in files, f'Referenced file excluded: {name}'
    license_drift = (ROOT / 'LICENSE').read_bytes() != (SOURCE / 'LICENSE').read_bytes()
    assert not license_drift or '--audit-only' in __import__('sys').argv, 'License drift: owner reconciliation required; --audit-only creates a blocked diagnostic artifact without changing licenses'
    out = ROOT / 'work' / 'package'
    out.mkdir(parents=True, exist_ok=True)
    archive = out / f'redown-chrome-{manifest["version"]}.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        for name in sorted(files):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, (SOURCE / name).read_bytes())
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None, 'ZIP integrity failure'
        assert set(bundle.namelist()) == files
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    inventory = {name: hashlib.sha256((SOURCE / name).read_bytes()).hexdigest() for name in sorted(files)}
    record = {'licenseDrift': license_drift, 'releaseBlocked': True, 'installationEvidence': 'not run', 'version': manifest['version'], 'archive': archive.name,
              'sha256': digest, 'files': inventory,
              'sourceCommit': __import__('subprocess').check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
              'sourceTreeDirty': bool(__import__('subprocess').check_output(['git','status','--porcelain','--untracked-files=normal'],cwd=ROOT,text=True).strip()),
              'status': 'packaging checks only; live and publisher gates pending'}
    (out / 'chrome-package.json').write_text(json.dumps(record, indent=2) + '\n')
    print(f'{archive}\nSHA-256: {digest}\n{len(files)} allowlisted files; release gates remain in docs/runtime/READINESS.md')


if __name__ == '__main__':
    build()
