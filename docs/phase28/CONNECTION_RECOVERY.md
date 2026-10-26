# Python laboratory connection recovery (0.5.1)

The non-GUI connection investigation has priority over the desktop layout repair.
Full diagnostic record: [FW-REDOWN-PYTHON-LAB-DISCONNECT-20261025](../../FOREVER_WORKS/bugs/FW-REDOWN-PYTHON-LAB-DISCONNECT-20261025.md).

## Install this repair on Windows

Close Python first. From your existing checkout in PowerShell (preserve unrelated local changes):

```powershell
git fetch origin
git switch fix/python-lab-connection-lifecycle
git pull --ff-only origin fix/python-lab-connection-lifecycle
.\.venv\Scripts\python.exe -m pip install --upgrade ./clients/python
.\.venv\Scripts\python.exe -m pip show redown-client
.\.venv\Scripts\python.exe -m redown.install_host --extension-id mkadkgpekmkknfbniacdlmgikihjjepf
```

Expected package version: **0.5.1**. Use the exact extension ID currently displayed
in `chrome://extensions`; replace the example if it differs. Reload REDOWN there.
The extension must load this checkout's `extension` directory. A Store installation
does not update when you pull Git. Reopen the browser Python Laboratory page,
discover/select dedicated test buckets, and start its local connection. Keep the
tab open, including while using CLI. Closing/reloading it revokes all its grants
and terminates the native host. Restarting only the background service worker
does not inherently recreate this page-owned connection.

## Pairing and diagnostics

Every new CLI or GUI connection gets a new code and needs its own explicit approval.
A previous GUI approval does not approve a CLI. Compare the complete codes yourself;
there is no Python-supplied approval-code override. Reject mismatched codes. Pending
requests expire after **120 seconds**. The browser scrolls/focuses the new request;
it does not steal focus from another browser tab. Native host fallback enforces the
same timeout if browser timers are delayed. The SDK's initial socket deadline is
130 seconds; authenticated request deadline is 40 seconds, host RPC deadline 35.
Custom SDK deadlines can shorten this wait. Approved idle host connections last up
to eight hours, but the chosen 1/4/8-hour grant and OAuth authorization are checked
on every query. OAuth renewal does not extend that grant.

| Error | Recovery |
| --- | --- |
| `EXTENSION_UNAVAILABLE` | Start the browser local helper; check exact ID, interpreter and per-user registration. |
| `PAIRING_TIMEOUT` | Start a new Python connection; approve the new matching code within 120 seconds. |
| `PAIRING_REJECTED` | Start a new connection when ready to approve the intended scope. |
| `EXTENSION_DISCONNECTED` | Inspect browser Laboratory status and native-host error, keep the page open, restart local connection and pair again. Native stderr records channel closure class without credentials. |
| `AUTHORIZATION_REVOKED_OR_EXPIRED` | Obtain a new owner grant. This existing combined code is retained because the scoped contract combines these states. |
| `SESSION_EXPIRED` / `CLOUDFLARE_RECONNECT_REQUIRED` | Reconnect Cloudflare in REDOWN, then start a fresh approved Python connection. |
| `TIMEOUT_UNCERTAIN` | An RPC timed out; do not replay a write. Inspect retained namespace before starting a new run. |

Connection failure produces `primaryFailure`, the original `connectionError`,
recovery guidance and the full plan. Dependent results reference `blockedBy:
connection`, without pretending the provider rejected six operations.
`dispatchedOperations` counts planned filesystem cases submitted to the SDK, not
provider-confirmed operations or total RPCs (evidence/Atlas queries are excluded).
`notAttemptedOperations` counts processed cases not submitted. Zero dispatch is
explicit. `elapsedSeconds` measures runner time; CLI `connectionAndRunSeconds`
additionally includes initial pairing. Reports preserve INCOMPLETE acceptance.

## Repeat the authenticated eight-byte test

1. Connect Cloudflare in REDOWN Settings. In browser Laboratory, select one dedicated
   `test-1-new` through `test-4-new` bucket, separately check write approval, select
   duration and start the local connection. Existing Worker prerequisites remain in
   [the write runbook](README.md); do not provision/repair unrelated buckets.
2. In PowerShell:

```powershell
New-Item -ItemType Directory -Force .\lab-smoke | Out-Null
[IO.File]::WriteAllBytes((Join-Path $PWD 'lab-smoke\hello.bin'), [byte[]](0,1,2,3,127,128,254,255))
Get-FileHash .\lab-smoke\hello.bin -Algorithm SHA256
.\.venv\Scripts\python.exe -m redown.lab complete --directory .\lab-smoke --depth Comprehensive --profile Balanced --report .\write-report.json
```

3. Immediately approve the **new CLI code** in the browser within 120 seconds.
   Keep the browser Laboratory open. Expected source hash:
   `46d7c9e30f06774ee03af126b95c971f6fe6cc8b70ed27377bd4495b72b9b20a`.
4. Inspect both report files. Successful bounded execution should show six PASS
   cases, one verified file/eight verified bytes and no connection failure.
   CLI still exits 2 for deliberately INCOMPLETE wider coverage. Locate
   `<destinationRoot.key><runId>/uploads/hello.bin`, download it separately from
   the R2 dashboard and hash that downloaded file. Preserve this independent
   result, browser status and reports. Never use a fixture receipt as live proof.
5. Revoke access. No automatic deletion or write retry is performed. Inspect
   uncertain outcomes before a new grant/run; never reuse an uncertain write.

## Desktop verification

```powershell
.\.venv\Scripts\python.exe -m redown.lab gui
$env:PYTHONPATH = (Join-Path $PWD 'clients\python')
.\.venv\Scripts\python.exe -m unittest discover -s clients/python/tests -p test_gui_layout.py -v
```

At 1366x768 and Windows 100%, 150% and 200% scaling, maximize and restore the app.
Reach all connection, preflight, report and advanced controls with Tab/Shift+Tab.
Use the outer vertical/horizontal scrollbars to reach every section, then scroll
inside the diagnostic text separately. Tab focus scrolls controls into view.
Mouse-wheel handling preserves native text/list/dropdown scrolling. The automated
Tk test uses a real display and 1024x600 with 1x/2x Tk scaling; it skips explicitly
when no display is present. It cannot substitute for installed Windows visual QA.
