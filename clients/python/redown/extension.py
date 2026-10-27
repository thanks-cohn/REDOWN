"""Provider-neutral extension transport. Mode direct-s3 is reserved, unsupported."""
import sys
import base64
import hashlib
import os
import uuid
from pathlib import Path
import json
import socket
import threading
import time
from .client import Client, RedownError
from .diagnostics import check_payload
from .native_host import home, read_frame, write_frame

class ExtensionClient(Client):
    def __init__(self, *, name='REDOWN Python Laboratory', timeout=130, on_pairing=None):
        self._closed, self._lock = False, threading.Lock()
        self._last_transfer_progress = 0
        self._socket = None
        try:
            endpoint = json.loads((home() / 'connection.json').read_text())
            if endpoint.get('version') != 1 or endpoint.get('host') != '127.0.0.1' or endpoint.get('expiresAt', 0) <= time.time():
                raise RedownError('EXTENSION_UNAVAILABLE')
            self._socket = socket.create_connection(('127.0.0.1', int(endpoint['port'])), timeout=timeout)
            self._stream = self._socket.makefile('rwb', buffering=0)
            write_frame(self._stream, {'key': endpoint['key']})
            hello = read_frame(self._stream)
            if 'clientId' not in hello:
                raise RedownError('LOCAL_AUTH_DENIED')
            self.client_id = hello['clientId']
            if on_pairing:
                on_pairing(self.client_id)
            self.grant = self.query('pair', name=str(name)[:80])
            self._socket.settimeout(40)
        except (OSError, ValueError, KeyError, EOFError, RedownError) as error:
            self.close()
            if isinstance(error, RedownError):
                raise
            raise RedownError('EXTENSION_UNAVAILABLE') from None

    def query(self, method, **inputs):
        with self._lock:
            if self._closed:
                raise RedownError('SESSION_CLOSED')
            try:
                write_frame(self._stream, {'method': method, 'input': inputs})
                result = read_frame(self._stream)
            except socket.timeout:
                self.close()
                raise RedownError('PAIRING_TIMEOUT' if method == 'pair' else 'TIMEOUT_UNCERTAIN') from None
            except (OSError, EOFError):
                self.close()
                raise RedownError('EXTENSION_DISCONNECTED') from None
            except ValueError:
                self.close()
                raise RedownError('INVALID_RESPONSE') from None
            if result.get('apiVersion') != '1.0.0':
                self.close()
                raise RedownError('INCOMPATIBLE_RESPONSE')
            if result.get('state') == 'failed':
                code = result.get('error', {}).get('code', 'SESSION_ERROR')
                if code in ('PAIRING_TIMEOUT', 'PAIRING_REJECTED', 'TIMEOUT_UNCERTAIN', 'EXTENSION_DISCONNECTED'):
                    self.close()
                raise RedownError(code, result.get('error',{}).get('diagnostic'))
            if result.get('state') != 'available' or 'data' not in result:
                raise RedownError('INVALID_RESPONSE')
            try: return check_payload(result['data'])
            except ValueError: raise RedownError('DIAGNOSTICS_LOST') from None

    def _transfer_progress(self, stage, count, total):
        now = time.monotonic()
        if now - self._last_transfer_progress >= 1 or count == total:
            print(json.dumps(dict(stage=stage, bytes=count, totalBytes=total)), file=sys.stderr, flush=True)
            self._last_transfer_progress = now

    def _stream_execute(self, operation, **arguments):
        request = dict(apiVersion='0.3.0', operation=operation,
                       idempotencyKey=arguments.pop('idempotency_key', None) or str(uuid.uuid4()), **arguments)
        self.query('streamExecute', request=request)
        while True:
            status = self.query('streamStatus')
            progress = status.get('progress') or {}
            if progress:
                self._transfer_progress(progress.get('stage', operation), progress['bytes'], progress['total'])
            if not status.get('pending'):
                response = status['response']
                if response.get('state') != 'available':
                    raise RedownError(response.get('error', {}).get('code', 'STREAM_FAILED'))
                return response['data']
            time.sleep(0.25)

    def execute(self, operation, *, idempotency_key=None, **arguments):
        if operation == 'copy' and self.describe().get('limits', {}).get('streaming'):
            return self._stream_execute(operation, idempotency_key=idempotency_key, **arguments)
        return super().execute(operation, idempotency_key=idempotency_key, **arguments)

    def upload(self, path, destination, **options):
        expected_sha256 = options.pop('expected_sha256', None)
        expected_size = options.pop('expected_size', None)
        info = self.describe()
        if not info.get('limits', {}).get('streaming'):
            return super().upload(path, destination, **options)
        source = Path(path)
        before = source.stat()
        digest = hashlib.sha256()
        with source.open('rb') as stream:
            for chunk in iter(lambda: stream.read(262144), b''):
                digest.update(chunk)
        checksum = digest.hexdigest()
        if expected_sha256 is not None and checksum != expected_sha256 or expected_size is not None and before.st_size != expected_size:
            raise RedownError('LOCAL_SOURCE_CHANGED')
        opened = self.query('streamOpen', mode='upload', size=before.st_size, sha256=checksum)
        try:
            count = 0
            with source.open('rb') as stream:
                for chunk in iter(lambda: stream.read(262144), b''):
                    self.query('streamAppend', id=opened['id'], offset=count,
                               bytesBase64=base64.b64encode(chunk).decode('ascii'))
                    count += len(chunk)
                    self._transfer_progress('Sending to extension', count, before.st_size)
            after = source.stat()
            if (before.st_size, before.st_mtime_ns, before.st_ino) != (after.st_size, after.st_mtime_ns, after.st_ino):
                raise RedownError('LOCAL_SOURCE_CHANGED')
            self.query('streamSeal', id=opened['id'])
            return self._stream_execute('upload', destination=destination,
                                        transfer=dict(size=before.st_size, sha256=checksum), **options)
        finally:
            self.query('streamClose', id=opened['id'])

    def download(self, source, path):
        info = self.describe()
        if not info.get('limits', {}).get('streaming'):
            return super().download(source, path)
        metadata = self.execute('metadata', source=source)
        if metadata.get('state') != 'completed':
            raise RedownError(metadata.get('error', 'READ_FAILED'))
        size = metadata['result']['size']
        opened = self.query('streamOpen', mode='read', size=size, sha256=None)
        try:
            job = self._stream_execute('read', source=source, transfer=dict(size=size))
            if job.get('state') != 'completed':
                raise RedownError(job.get('error', 'READ_FAILED'))
            count, digest = 0, hashlib.sha256()
            target = Path(path)
            created = False
            try:
                with target.open('xb') as output:
                    created = True
                    while True:
                        part = self.query('streamPull', id=opened['id'], offset=count)
                        data = base64.b64decode(part['bytesBase64'], validate=True)
                        if len(data) > 262144 or not data and count != size:
                            raise RedownError('TRUNCATED_READ')
                        output.write(data); digest.update(data); count += len(data)
                        self._transfer_progress('Reading verified bytes', count, size)
                        if part['offset'] != count or count > size:
                            raise RedownError('INVALID_RESPONSE')
                        if part['done']:
                            break
                    output.flush(); os.fsync(output.fileno())
                if count != size or digest.hexdigest() != job['result']['sha256']:
                    raise RedownError('VERIFICATION_DISAGREEMENT')
            except Exception:
                if created:
                    target.unlink(missing_ok=True)
                raise
            return job
        finally:
            self.query('streamClose', id=opened['id'])

    def close(self):
        self._closed = True
        if getattr(self, '_socket', None):
            try:
                self._socket.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            self._socket.close()
        if getattr(self, '_stream', None):
            self._stream.close()


class RenewalSchedule:
    """Claim one renewal every forty minutes; delayed/sleeping apps never burst-replay."""
    interval = 40 * 60

    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.reset()

    def reset(self):
        self.next_due = self.clock() + self.interval

    def claim_due(self):
        now = self.clock()
        if now < self.next_due:
            return False
        self.next_due = now + self.interval
        return True
