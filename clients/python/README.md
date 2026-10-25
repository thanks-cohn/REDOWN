# REDOWN Python client 0.3.0

This client launches an explicitly supplied owner command and talks to the existing scoped JSON-lines session. The canonical engine executes all provider work. Python contains no provider authentication or transfer implementation. Node 22+ and Python 3.10+ are required. The repository remains proprietary.

Install in a virtual environment from the repository root:

```sh
python -m venv .venv
# Linux/macOS:
. .venv/bin/activate
# Windows PowerShell instead:
# .venv/Scripts/Activate.ps1
python -m pip install ./clients/python
npm ci --ignore-scripts --no-audit --no-fund
redown --command '["node","agent/files/cli.mjs","--simulation","--operations","list,metadata,read,upload,copy"]' describe
```

Use the repository as the working directory, or pass `--cwd` with its absolute path. PowerShell and POSIX shells accept the single-quoted JSON array above. Windows and macOS were not executed in this run; the Linux-only local reference adapter refuses other platforms explicitly.

The command-line interface accepts session methods `describe`, `execute`, `plan`, `jobs`, `inspect`, `evidence`, `resources`, `cancel` and `reconcile`, with JSON method arguments in `--input`. It emits JSON and uses exit code 0 for successful queries, 1 for unsuccessful job states and 2 for transport/input errors. Each CLI invocation owns a new session; use Python for a multi-step session or a persistent owner process. Do not expect another session's job IDs to grant access.

```python
from redown import Client

command = ["node", "agent/files/cli.mjs", "--native-reference",
           "--operations", "list,metadata,read,upload,copy,reconcile"]
with Client(command) as client:
    info = client.describe()
    root = info["locations"][0]
    listing = client.execute("list", source=root, limit=10)
    # Preserve returned identities. Never derive IDs by interpreting displayed names.
    source = listing["result"]["objects"][0]["identity"]
    read = client.execute("read", source=source)
    trace = client.query("resources", id=read["id"], metric="getLatencyBreakdown")
```

`execute(operation, idempotency_key=..., **arguments)` is provider-neutral. `upload(local_path, destination)` and `download(source, local_path)` handle bounded local bytes; downloads exclusively create a new file after checking SHA-256. Inspect returned job states explicitly: execution may return a failed/uncertain job rather than a transport exception. Reconciliation never authorizes automatic replay. A transport timeout closes the connection and reports `TIMEOUT_UNCERTAIN`.

The current engine limit remains 2 MiB/object. This package does not claim streaming, multipart, automatic restart/resume or large-file support. Input and response lines are capped at 3 MiB. A full raw inspection of a large job can exceed this response budget; prefer `evidence`, job summaries and Resource Atlas queries. Job persistence does not persist another session's authority.

## Trusted owner profiles

Launch `node agent/files/cli.mjs --config OWNER_JSON --operations list,read,upload,copy --journal PRIVATE_JOURNAL`. A profile selects adapter factories and optionally exact session `scope` and `expiresAt`. The CLI operations intersect configured scope. Journal files contain private request bodies; keep them outside Git. No network listener, browser credential extraction or automatic deployment occurs.

An explicitly provisioned leased R2 Worker profile is:

```json
{"adapters":[{"type":"r2-worker","endpoint":"https://YOUR-LEASED-WORKER.workers.dev","prefix":"__redown_test__/YOUR-UUID/","authorizationEnv":"REDOWN_LAB_AUTH"}]}
```

The owner supplies the leased bearer through that environment variable. The session never returns it. Only the existing four dedicated buckets and prefix are accepted. R2 move/rename/delete remain blocked without atomic revision-conditioned deletion. Conventional S3 credentials, Cloudflare API-token provisioning, OAuth renewal/revocation and general credential-profile management are unfinished interfaces, not supported credential substitutes. See [the implementation report](../../docs/phase26/IMPLEMENTATION.md).

Run `PYTHONPATH=clients/python python -m unittest discover -s clients/python/tests -v` on POSIX, or install the package then `python -m unittest discover -s clients/python/tests -v` on any supported Python environment.

## Extension connection (0.4.0)

`ExtensionClient` and `redown --extension` use the authenticated extension after explicit approval, without cloud credentials. `python -m redown.lab gui` starts the desktop laboratory; `redown-lab conformance` writes JSON/Markdown evidence. Install/register the native helper first. See [Windows setup and exact limits](../../docs/phase27/README.md). Extension mode is currently read-only with 64 KiB reads; the older stdio mode retains its own capabilities and limits.
