"""Bounded JSON-lines transport over an explicitly owner-launched command."""
from __future__ import annotations
import base64
import io
import hashlib
import os
import json
import queue
import subprocess
import threading
import uuid
from pathlib import Path
from typing import Any, Sequence

MAX_LINE = 3 * 1024 * 1024

from .diagnostics import check_payload

class RedownError(RuntimeError):
    def __init__(self, code: str, diagnostic=None):
        try: check_payload({"diagnostic":diagnostic})
        except ValueError: code="DIAGNOSTICS_LOST"; diagnostic=None
        self.diagnostic = diagnostic
        self.code = code
        super().__init__(code)

class Client:
    def __init__(self, command: Sequence[str], *, cwd: str | None = None, timeout: float = 30):
        if not command or isinstance(command, str) or timeout <= 0:
            raise ValueError("Explicit command and positive timeout required")
        self.timeout = timeout
        self._process = subprocess.Popen(list(command), cwd=cwd, stdin=subprocess.PIPE,
                                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        self._output = io.BufferedReader(self._process.stdout)
        self._lock = threading.Lock()
        self._responses: queue.Queue = queue.Queue(maxsize=1)
        self._closed = False
        self._reader = threading.Thread(target=self._read, daemon=True)
        self._reader.start()

    def _read(self):
        try:
            while True:
                line = self._output.readline(MAX_LINE + 1)
                if not line:
                    self._responses.put(RedownError("SESSION_CLOSED"))
                    return
                if len(line) > MAX_LINE or not line.endswith(b"\n"):
                    self._responses.put(RedownError("RESPONSE_BUDGET"))
                    return
                try:
                    value = json.loads(line)
                except (ValueError, UnicodeError):
                    self._responses.put(RedownError("INVALID_RESPONSE"))
                    return
                self._responses.put(value)
        except (OSError, ValueError):
            if not self._closed:
                self._responses.put(RedownError("SESSION_CLOSED"))

    def query(self, method: str, **inputs: Any) -> Any:
        payload = (json.dumps({"method": method, "input": inputs}, ensure_ascii=False) + "\n").encode()
        if len(payload) > MAX_LINE:
            raise RedownError("INPUT_BUDGET")
        with self._lock:
            if self._closed:
                raise RedownError("SESSION_CLOSED")
            try:
                def write():
                    try:
                        remaining = memoryview(payload)
                        while remaining:
                            count = self._process.stdin.write(remaining)
                            if not count:
                                raise OSError()
                            remaining = remaining[count:]
                    except (OSError, ValueError):
                        pass
                threading.Thread(target=write, daemon=True).start()
                response = self._responses.get(timeout=self.timeout)
            except queue.Empty:
                # Losing framing after a timeout forbids automatic replay of writes.
                self.close()
                raise RedownError("TIMEOUT_UNCERTAIN") from None
            except (OSError, ValueError):
                self.close()
                raise RedownError("SESSION_CLOSED") from None
            if isinstance(response, Exception):
                self.close()
                raise response
            if not isinstance(response, dict) or response.get("apiVersion") != "1.0.0":
                self.close()
                raise RedownError("INCOMPATIBLE_RESPONSE")
            if response.get("state") == "failed":
                raise RedownError(response.get("error", {}).get("code", "SESSION_ERROR"), response.get("error", {}).get("diagnostic"))
            if response.get("state") != "available" or "data" not in response:
                raise RedownError("INVALID_RESPONSE")
            return response["data"]

    def describe(self) -> dict:
        return self.query("describe")

    def execute(self, operation: str, *, idempotency_key: str | None = None, **arguments: Any) -> dict:
        request = {"apiVersion": "0.3.0", "operation": operation,
                   "idempotencyKey": idempotency_key or str(uuid.uuid4()), **arguments}
        result=self.query("execute", request=request)
        try: return check_payload(result)
        except ValueError: raise RedownError("DIAGNOSTICS_LOST") from None

    def upload(self, path: str | Path, destination: dict, **options: Any) -> dict:
        with open(path, "rb") as source:
            data = source.read(2097153)
        if len(data) > 2097152:
            raise RedownError("SIZE_LIMIT")
        return self.execute("upload", destination=destination,
                            bytesBase64=base64.b64encode(data).decode("ascii"), **options)

    def download(self, source: dict, path: str | Path) -> dict:
        job = self.execute("read", source=source)
        if job.get("state") != "completed":
            raise RedownError(job.get("error", "READ_FAILED"), job.get("diagnostic"))
        result = job["result"]
        try:
            data = base64.b64decode(result["bytesBase64"], validate=True)
        except (ValueError, KeyError):
            raise RedownError("INVALID_RESPONSE") from None
        if len(data) > 2097152 or hashlib.sha256(data).hexdigest() != result.get("sha256"):
            raise RedownError("VERIFICATION_DISAGREEMENT")
        destination = Path(path)
        # Exclusive creation prevents silently overwriting an existing local file.
        with open(destination, "xb") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        return job

    def close(self):
        if self._closed:
            return
        self._closed = True
        if self._process.poll() is None:
            self._process.terminate()
        try:
            self._process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            self._process.terminate()
            try:
                self._process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()
        if self._process.stdin:
            self._process.stdin.close()
        if self._process.stdout:
            self._output.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
