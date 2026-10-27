"""Chrome-launched, authenticated loopback relay. Never handles cloud credentials."""
import hmac
import json
import os
from pathlib import Path
import queue
import secrets
import socketserver
import struct
import sys
import threading
import time
import uuid

MAX_FRAME = 512 * 1024
HOST_NAME = 'com.redown.laboratory'
AUTHENTICATED_IDLE_TIMEOUT = 8 * 60 * 60
PAIRING_TIMEOUT = 120

def home():
    return Path.home() / '.redown-laboratory'

def read_exact(stream, length):
    chunks = bytearray()
    while len(chunks) < length:
        part = stream.read(length - len(chunks))
        if not part:
            raise EOFError()
        chunks.extend(part)
    return bytes(chunks)

def read_frame(stream):
    size = struct.unpack('=I', read_exact(stream, 4))[0]
    if not 0 < size <= MAX_FRAME:
        raise ValueError('FRAME_BUDGET')
    value = json.loads(read_exact(stream, size))
    if not isinstance(value, dict):
        raise ValueError('INVALID_FRAME')
    return value

def write_frame(stream, value):
    data = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
    if len(data) > MAX_FRAME:
        raise ValueError('FRAME_BUDGET')
    remaining = memoryview(struct.pack('=I', len(data)) + data)
    while remaining:
        count = stream.write(remaining)
        if not count:
            raise OSError('CONNECTION_CLOSED')
        remaining = remaining[count:]
    stream.flush()

def failure(code):
    return {'apiVersion': '1.0.0', 'state': 'failed', 'error': {'code': code}}

class Relay:
    def __init__(self, output):
        self.output, self.lock = output, threading.Lock()
        self.pending, self.pending_lock = {}, threading.Lock()
        self.key = secrets.token_urlsafe(32)
        self.slots = threading.BoundedSemaphore(8)
        self.alive = True

    def send(self, value):
        with self.lock:
            write_frame(self.output, value)

    def request(self, client, method, inputs):
        if method not in ('pair', 'describe', 'execute', 'plan', 'jobs', 'inspect', 'evidence', 'resources', 'cancel', 'reconcile', 'renewAuthorization', 'doctor', 'labReport', 'streamExecute', 'streamStatus', 'streamOpen', 'streamAppend', 'streamSeal', 'streamPull', 'streamClose') or not isinstance(inputs, dict):
            return failure('INVALID_INPUT')
        request_id, response = str(uuid.uuid4()), queue.Queue(maxsize=1)
        with self.pending_lock:
            if not self.alive:
                return failure('EXTENSION_DISCONNECTED')
            self.pending[request_id] = response
        try:
            self.send({'type': 'request', 'client': client, 'id': request_id, 'method': method, 'input': inputs})
            return response.get(timeout=PAIRING_TIMEOUT if method == 'pair' else 35)
        except queue.Empty:
            return failure('PAIRING_TIMEOUT' if method == 'pair' else 'TIMEOUT_UNCERTAIN')
        except (OSError, ValueError):
            return failure('EXTENSION_DISCONNECTED')
        finally:
            with self.pending_lock:
                self.pending.pop(request_id, None)

    def receive(self, message):
        with self.pending_lock:
            target = self.pending.get(message.get('id'))
            if target and target.empty():
                target.put_nowait(message.get('response', failure('INVALID_RESPONSE')))

    def close(self):
        with self.pending_lock:
            self.alive = False
            for target in self.pending.values():
                if target.empty():
                    target.put_nowait(failure('EXTENSION_DISCONNECTED'))

class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        relay = self.server.relay
        if not relay.slots.acquire(blocking=False):
            return
        client = str(uuid.uuid4())
        try:
            self.connection.settimeout(5)
            hello = read_frame(self.rfile)
            if not isinstance(hello.get('key'), str) or not hmac.compare_digest(hello['key'], relay.key):
                write_frame(self.wfile, failure('LOCAL_AUTH_DENIED'))
                return
            self.connection.settimeout(130)
            write_frame(self.wfile, {'clientId': client})
            paired = False
            while relay.alive:
                message = read_frame(self.rfile)
                method = message.get('method')
                if not paired and method != 'pair':
                    write_frame(self.wfile, failure('PAIRING_REQUIRED'))
                    continue
                if paired and method == 'pair':
                    write_frame(self.wfile, failure('ALREADY_PAIRED'))
                    continue
                response = relay.request(client, method, message.get('input', {}))
                write_frame(self.wfile, response)
                if method == 'pair':
                    paired = response.get('state') == 'available'
                    if not paired:
                        return
                    # Keep authenticated idle sessions usable for the full owner-selected grant.
                    # Provider authorization/expiry remains enforced by the extension on every query.
                    self.connection.settimeout(AUTHENTICATED_IDLE_TIMEOUT)
                if response.get('error', {}).get('code') in ('TIMEOUT_UNCERTAIN', 'EXTENSION_DISCONNECTED'):
                    return
        except (OSError, EOFError, ValueError, TypeError):
            pass
        finally:
            try:
                relay.send({'type': 'closed', 'client': client})
            except (OSError, ValueError):
                pass
            relay.slots.release()

class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = False

def main():
    if os.name == 'nt':
        import msvcrt
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    directory = home()
    config = json.loads((directory / 'host-config.json').read_text())
    # Chrome's manifest allowlist plus exact invocation origin. Neither is an OS identity proof.
    if len(sys.argv) < 2 or sys.argv[1] != config['origin']:
        return 2
    relay = Relay(sys.stdout.buffer)
    server = Server(('127.0.0.1', 0), Handler)
    server.relay = relay
    endpoint = directory / 'connection.json'
    record = {'version': 1, 'host': '127.0.0.1', 'port': server.server_address[1], 'key': relay.key, 'expiresAt': time.time() + 24 * 3600}
    temporary = directory / ('connection-' + str(uuid.uuid4()) + '.tmp')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as out:
        json.dump(record, out)
    os.replace(temporary, endpoint)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    relay.send({'type': 'ready'})
    try:
        while True:
            relay.receive(read_frame(sys.stdin.buffer))
    except (EOFError, OSError, ValueError, TypeError) as error:
        print('REDOWN native channel closed: ' + type(error).__name__, file=sys.stderr)
    finally:
        relay.close()
        server.shutdown()
        server.server_close()
        try:
            if json.loads(endpoint.read_text()).get('key') == relay.key:
                endpoint.unlink()
        except (OSError, ValueError):
            pass
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
