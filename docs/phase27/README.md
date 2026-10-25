# Phase 2.7 — extension-authenticated Python laboratory

Implementation branch; acceptance **incomplete**. No Cloudflare credentials are requested by Python. Start with [verification](IMPLEMENTATION.md). Direct S3 is reserved by `redown.connect(mode=...)` and returns `CONNECTION_MODE_UNSUPPORTED` for every mode except `extension`.

## Windows setup

Python 3.10+ (including Tkinter) and an administrator-approved Chrome installation that permits this REDOWN build are required. The existing installed version must be updated to this branch's extension files: it needs `nativeMessaging` and `laboratory.html`. This session did not install or test Windows Chrome. Do not bypass managed-browser restrictions.

From a checkout of this branch, in PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install ./clients/python
```

Update/load the `extension` directory using your normal approved REDOWN development installation flow. Open `chrome://extensions`, copy REDOWN's exact extension ID, and register the native host for **that** ID:

```powershell
.\.venv\Scripts\python.exe -m redown.install_host --extension-id YOUR_32_CHARACTER_EXTENSION_ID
```

This installs only a per-user native-host registration, launcher, and private discovery directory under your user profile. Keep the virtual environment in place: the launcher refers to its Python executable. The Windows installer restricts that directory's inherited ACL to the current user and fails if ACL setup fails. No administrator elevation is required. A local program running as that same user remains inside the local trust boundary.

1. Reload REDOWN after installing the helper. Connect Cloudflare in REDOWN's usual Settings flow.
2. Open **Python Laboratory** from the link at the bottom of REDOWN Settings.
3. Click **Discover accounts and buckets**, check the authorized test buckets, then **Start local connection**. Non-default jurisdiction buckets are currently omitted.
4. Start the Python app:

```powershell
.\.venv\Scripts\python.exe -m redown.lab gui
```

5. Click **Connect to extension**. Compare the connection code displayed by Python with REDOWN's request. Choose a 1-hour (default), 4-hour or 8-hour approval, then approve the selected buckets or reject it. Client names are self-declared, not verified application identities.
6. The app displays granted account/bucket identities and capabilities. Select test buckets, use **List selected bucket**, then **Execute method**. The JSON input supports all scoped-session methods; copy exact identities from results rather than reconstructing displayed names.
7. Run read-only conformance and export JSON/Markdown reports. To include an object read, enter `{"source": EXACT_OBJECT_IDENTITY}` in the JSON input before running conformance. No arbitrary object is automatically chosen for reading.
8. Use **Reject / revoke** beside a client, or **Revoke all clients and stop**. Grants expire after your selected duration. Authenticated idle connections remain available during that grant; the Python GUI checks connection health every 30 seconds. Closing the laboratory tab or Python process disconnects that connection. Reconnect and approve a new session after expiry.

A disconnected helper may leave a stale discovery file after a crash; Python reports unavailable rather than opening a cloud connection. Starting the helper again replaces it with a fresh random local credential. No manual token entry is needed.

## Agent CLI

Use the same virtual environment; activation is optional. Pairing approval happens on every new CLI connection. For multi-step work use one Python `ExtensionClient`, the GUI, or the conformance command.

```powershell
.\.venv\Scripts\python.exe -m redown.cli --extension describe
.\.venv\Scripts\python.exe -m redown.cli --extension execute --input '{"request":{"apiVersion":"0.3.0","operation":"list","source":{"provider":"extension-r2","account":"EXACT_ACCOUNT_ID","container":"EXACT_BUCKET_NAME","key":""},"idempotencyKey":"NEW_UNIQUE_ID","limit":10}}'
.\.venv\Scripts\python.exe -m redown.lab conformance --report redown-lab-report.json
```

For a byte verification run add `--source` with an exact object identity from listing, and preferably `--expected-sha256` with an independently known checksum. The object must be at most **64 KiB**. Use `--root` to select an authorized test bucket root; otherwise the first granted root is used. A source must belong to that selected bucket. Reports omit contents and redact identities in operation evidence. Keep reports private: provider metadata/diagnostics can still reveal account activity. JSON and Markdown are written side by side. `acceptance: INCOMPLETE` deliberately persists: an automated subset does not certify the complete assignment.

```python
from redown import ExtensionClient
with ExtensionClient(on_pairing=print) as client:
    info = client.describe()
    job = client.execute("list", source=info["locations"][0], limit=10)
    print(client.query("evidence", id=job["id"]))
    print(client.query("resources", id=job["id"], metric="getLatencyBreakdown"))
```

Every filesystem operation runs through `createScopedSession` → `createFileEngine` → `extensionR2Adapter` → existing `RedownCloudflareApi.request`. The old `--command` stdio mode and API 0.2/0.3 remain supported. The SDK has no Cloudflare API calls.

## Current limits and troubleshooting

- The helper reports Chrome’s actual native-host startup/disconnection error in the Laboratory status. An installed Python package alone does not connect it: the browser page must start its local connection and explicitly approve the Python client.

- This connection is **read-only**: list/pagination, metadata, bounded reads and verified local downloads. Upload/copy/mkdir/move/rename/delete are explicitly unsupported here. The existing separate leased-Worker adapter is not used as a substitute for extension authentication.
- No deploy, Worker repair, public-policy change, bucket creation, remote deletion, arbitrary JavaScript, shell command or local filesystem path is exposed by the native relay.
- `EXTENSION_UNAVAILABLE`: open REDOWN's laboratory, register the exact ID using the same installed Python environment, reload the extension, and start its local connection.
- `PAIRING_REJECTED`, `PAIRING_REQUIRED`, `AUTHORIZATION_REVOKED_OR_EXPIRED`: approve a new matching connection with the desired bucket selection.
- `SESSION_UNAVAILABLE`, `SESSION_EXPIRED`, `PROVIDER_PERMISSION_DENIED`: reconnect Cloudflare or inspect actual object-read permission. Being signed in does not prove object API access. No automatic public-URL fallback is used.
- `SIZE_LIMIT` / `RESPONSE_BUDGET`: reduce object/page size. The native transport frames are capped at 512 KiB; this is not streaming or large-file support.
- `TIMEOUT_UNCERTAIN`: connection closes; never replay a write automatically. There are no writes in this mode. Journal/Atlas data is connection-local memory and disappears when its page/session ends; durable reconnect recovery is not implemented.
- Cancellation execution is unsupported for this read-only grant; denial is tested. Python CLI returns 0 for successful queries, 1 for unsuccessful jobs, 2 for transport/input errors. Conformance returns nonzero for failed/blocked execution, while unsupported/untested coverage stays explicit in the report.

Linux Google Chrome registration is also implemented. macOS, other browser registration, Windows native-host launch and real Chrome/provider acceptance remain untested. To remove the Windows helper, stop the laboratory, delete `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.redown.laboratory`, and remove the `.redown-laboratory` directory from your user profile.

## Update to Python client 0.4.1

Close the Python GUI, pull current main, then run `.\.venv\Scripts\python.exe -m pip install --upgrade ./clients/python`. Reload REDOWN and reopen its Laboratory page to restart the native host on the updated Python code. Select buckets and your approval duration, then start the local connection. Relaunch `python -m redown.lab gui` with the virtual-environment interpreter and click **Connect to REDOWN extension** at the top. Approve the matching code in the browser. “Local helper ready” means the browser is waiting for Python to initiate pairing; it does not mean Python is already connected.

Focused follow-up checks: 9 extension/native tests and 11 Python tests pass. See `verification/phase27/connection-followup.json`. These changes do not establish live R2 acceptance or close previous regression failures.
