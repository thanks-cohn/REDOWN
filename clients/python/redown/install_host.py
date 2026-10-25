"""Register the native helper for this user. No administrator rights needed."""
import argparse
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
from .native_host import home, HOST_NAME

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--extension-id', required=True, help='Exact ID from chrome://extensions')
    args = parser.parse_args()
    if not re.fullmatch('[a-p]{32}', args.extension_id):
        parser.error('Expected the exact 32-character Chrome extension ID')
    directory = home()
    directory.mkdir(mode=0o700, exist_ok=True)
    if directory.is_symlink():
        raise RuntimeError('Unsafe helper directory')
    if os.name == 'nt':
        import winreg
        identity = subprocess.check_output(['whoami', '/user', '/fo', 'csv', '/nh'], text=True)
        sid = re.search(r'S-1-[0-9-]+', identity).group()
        subprocess.run(['icacls', str(directory), '/reset', '/T'], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['icacls', str(directory), '/inheritance:r', '/grant:r', f'*{sid}:(OI)(CI)F'], check=True, stdout=subprocess.DEVNULL)
        launcher = directory / 'native-host.cmd'
        # CMD quoting rejects metacharacters even in quoted paths.
        if any(c in sys.executable for c in '%!\r\n"'):
            raise RuntimeError('Unsupported Python installation path')
        launcher.write_text(f'@echo off\r\n"{sys.executable}" -m redown.native_host %*\r\n')
        manifest = directory / (HOST_NAME + '.json')
    elif sys.platform == 'linux':
        os.chmod(directory, 0o700)
        launcher = directory / 'native-host'
        launcher.write_text('#!/bin/sh\nexec ' + shlex.quote(sys.executable) + ' -m redown.native_host "$@"\n')
        launcher.chmod(0o700)
        manifest = Path.home() / '.config/google-chrome/NativeMessagingHosts' / (HOST_NAME + '.json')
        manifest.parent.mkdir(parents=True, exist_ok=True)
    else:
        parser.error('Registration currently supports Windows Chrome and Linux Google Chrome')
    origin = f'chrome-extension://{args.extension_id}/'
    (directory / 'host-config.json').write_text(json.dumps({'origin': origin}))
    manifest.write_text(json.dumps({'name': HOST_NAME, 'description': 'REDOWN scoped Python laboratory', 'path': str(launcher), 'type': 'stdio', 'allowed_origins': [origin]}, indent=2))
    if os.name == 'nt':
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, 'Software\\Google\\Chrome\\NativeMessagingHosts\\' + HOST_NAME) as key:
            winreg.SetValueEx(key, '', 0, winreg.REG_SZ, str(manifest))
    print('Registered REDOWN helper for this user. Reload REDOWN and open Python Laboratory.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
