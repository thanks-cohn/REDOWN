"""Provider-neutral extension transport. Mode direct-s3 is reserved, unsupported."""
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
