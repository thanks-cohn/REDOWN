# Adaptive Laboratory authentication interruption and checkpoint contract failure

Status: source repairs and deterministic local regression evidence; Windows/native Chrome and live R2 acceptance NOT TESTED. Original authentication incident cause remains UNPROVEN.
Base: main `30e27a4` (2026-10-26 UTC). Repair branch: `fix/lab-auth-recovery`.

## Owner observation and protected evidence

Windows 11, reported Python 0.5.3, Quick, Balanced, directory
`C:\Users\jg202\Downloads\REDOWN-Samples-20261024-212219`:
2,221 inventoried files / 157,571,693 bytes; 183 PASS, 1 BLOCKED,
1 INDETERMINATE, 741 NOT_TESTED; 185 dispatched; 61 read-verified files /
676,836 verified bytes; acceptance INCOMPLETE. Dashboard sign-in occurred
shortly before AUTHORIZATION_REVOKED_OR_EXPIRED and an uncertain RTF upload.
The raw incident checkpoint, OAuth HTTP response, token expiry and grant expiry
were not supplied to this checkout. Main's package was 0.5.2, not the reported
0.5.3; installed source identity is another unresolved variable.

Protected historical namespace:
`test-1-new / __redown_test__/f5bd82cf-6161-4c3d-84e1-fa087e91868f/`.
No provider request, mutation, deletion, deployment or policy change was made in
this assignment. Reconciliation of this namespace is an owner-run read-only step.

## Confirmed source findings versus hypotheses

1. **GUI KeyError reproduced:** adaptive.run calls save() before assigning
   currentOperation. The GUI checkpoint callback indexed that field directly.
   Pairing again cannot repair this producer/consumer contract error. The first
   checkpoint now initializes both currentOperation and pendingOperation.
2. lab-session.active previously combined explicit local revoke, local TTL expiry,
   changed OAuth session ID, missing access credential and reconnectRequired into
   AUTHORIZATION_REVOKED_OR_EXPIRED. This code cannot establish provider revocation.
3. cloudflare-auth.storeCloudflareToken mints a new session ID after an explicit
   REDOWN OAuth callback. laboratory binds grants to that ID and stops the native
   connection on replacement. That behavior prevents carrying an old bucket grant
   into a possibly different account. It remains intentional.
4. cloudflare-api.auth already uses the shared Web Lock and refreshes credentials
   within sixty seconds of expiry; rotation preserves the session ID. GUI renewal
   also exists but cannot run while its worker is busy. Per-request renewal is the
   primary protection for long CLI and GUI runs, without a second auth manager.
5. Ordinary dashboard navigation has no storage-writing handler in REDOWN. OAuth
   completion requires the recorded login tab, exact redirect URI and OAuth state.
   A deterministic navigation fixture leaves credentials and lab scope unchanged.
   **Dashboard navigation causing provider revocation is not established.**
6. Refresh errors were generic Error values, flattened to NETWORK_FAILURE by the
   Cloudflare adapter. Returned invalid_grant means refresh was rejected; it does
   not distinguish expired grants from provider-side revocation.
7. The old runner could continue dispatch after a non-mutating auth interruption.
   It persisted results after operations but not write intent before dispatch.

Possible original causes: approved local duration elapsed, REDOWN reconnect changed
session ID, disconnect/revoke, or refresh rejection. Original logs/expiry and
installed commit are required to choose between these. Do not promote a hypothesis.

Official reference inspected through Cloudflare docs:
https://developers.cloudflare.com/workers/wrangler/commands/general/
Wrangler supports refresh of expired OAuth tokens. This is not proof that the
registered REDOWN OAuth client receives refresh credentials or that dashboard
login invalidates them. No new scopes or credentials were requested.

## Contracts and repairs

- Cloudflare details stay in cloudflare-api.js and extension-r2.mjs. Existing
  serialized refresh, rotation and per-request proactive expiry check remain.
- Authenticated transport renews after a rejected request, but only safe reads
  are replayed. A mutation is never replayed by this transport.
- lab-session reports local lifecycle failures separately, with the canonical
  redacted diagnostic envelope. Python grant lifetime is never extended by OAuth.
- Shared diagnostic schema, generated validator/code list and Python schema copy
  contain the new codes. No provider response text, token or refresh credential is
  placed in diagnostics. Error strings are never copied from provider bodies.
- contracts.py validates required response fields before GUI consumption and
  returns component, missing field, protocol version, code and recommended action.
  It includes no response values. GUI shows the structured detail, not KeyError.
- adaptive persists and fsyncs mutation intent before upload/copy/mkdir dispatch,
  then atomically replaces the JSON checkpoint. Successfully recorded results stay
  present; interruption halts later operations. Final checkpoints retain uncertain
  destinations. Dispatched, successful, verified-upload and read-hash-verified
  counts are separate. Full acceptance remains INCOMPLETE because unsupported
  coverage and live gates are not satisfied, even if all selected cases pass.

| Code | Evidence / meaning | Action |
| --- | --- | --- |
| LOCAL_SESSION_EXPIRED | Extension clock reached approved TTL | New explicit pairing |
| AUTHORIZATION_REVOKED | Local grant revoke() called | New explicit approval; never bypass |
| PROVIDER_SESSION_CHANGED | Stored OAuth session identity replaced | Verify account/scope with new pairing |
| PROVIDER_SESSION_UNAVAILABLE | No stored access credential | Connect provider, then pair |
| OAUTH_REFRESH_UNAVAILABLE | Expiring/rejected access token without refresh credential | Reconnect provider, then pair |
| OAUTH_REFRESH_REJECTED | Token endpoint returned invalid_grant | Reconnect; provider revocation vs expiry unproven |
| OAUTH_REFRESH_FAILED | Refresh response failed without invalid_grant | Check provider/connectivity; credentials retained |
| EXTENSION_DISCONNECTED | Native socket/relay lost | Restart helper and pair; reconcile writes first |
| PROVIDER_PERMISSION_DENIED | Provider HTTP 403 without auth rejection | Inspect permissions; refresh cannot add access |
| NETWORK_FAILURE / PROVIDER_SERVICE_ERROR | Transport loss / provider service response | Preserve evidence; reconcile uncertain writes |
| RESPONSE_CONTRACT_MISMATCH | Required allowlisted field absent | Update/reload both components; preserve checkpoint |

A renewable access-token expiry is handled inside the existing adapter refresh
flow; successful renewal produces no failure. A provider-side explicit revocation
cannot be inferred from invalid_grant. Explicit local revocation is distinguishable.

## Persistent recovery and safety

`python -m redown.lab reconcile --from-report ORIGINAL.json --report RECOVERY.json`
uses a NEW approved **read-only bucket grant** and the canonical Client.download
path. It checks scope/account/container, the lab UUID prefix, run ID and exact
recorded destination. It checks saved uncertain uploads/copies and pending writes
left by a process crash. Older reports can reconstruct the deterministic destination
from their root/run ID/relative path. Remote bytes must match saved source size and
SHA-256, including exclusive temporary-file download and disk readback hashing.
Matching content is CONFIRMED; changed content is CONFLICT. Missing/inaccessible
objects remain INDETERMINATE, never an instruction to retry. Directory markers stay
indeterminate pending manual review. Original results are preserved; acceptance is
not promoted. No write, overwrite or delete is exposed by reconciliation.

**Limitation:** full automatic write continuation across re-pairing is not implemented.
New write grants mint different namespaces; bypassing this would defeat scope.
Read-only reconciliation can resume verification after restart. Fresh testing uses
a fresh grant/namespace. Existing coordinator journal remains connection-local;
this patch persists Laboratory intent/results, not a competing transfer engine.
Power loss after network dispatch but before result persistence is covered by the
pre-dispatch intent. Disk failure, loss of the report, or tampered reports cannot
be claimed recoverable. A matching hash establishes destination contents, not a
claim about which request originally wrote them.

## Reproduction and regression evidence

See `verification/lab-auth-recovery/RESULTS.md` for exact commands and results.
New tests: tests/lab-auth-recovery.test.mjs, the dashboard-navigation test in
cloudflare-login.test.mjs, and clients/python/tests/test_auth_recovery.py.
They cover concurrent normal rotation, missing credentials, invalid_grant, transient
refresh failure, no mutation replay on 401, permission denial, local revoke/expiry,
first GUI checkpoint, redacted missing-field diagnostics, halt after auth loss,
process death after destination write, read-only restart/hash reconciliation,
conflicting contents and tampered destination refusal. Existing native transport
fixtures cover socket loss; existing renewal tests cover schedule and grant TTL.

These are simulated providers/local integration, not Windows/Chrome/live evidence.

## Windows owner verification

Close old Python GUI and stop the extension Laboratory connection first.

```powershell
cd "$env:USERPROFILE\Desktop\Extension\remote-download-2-cloudfare"
git fetch origin
git switch fix/lab-auth-recovery
git pull --ff-only
.\.venv\Scripts\python.exe -m pip install --upgrade ./clients/python
.\.venv\Scripts\python.exe -c "from importlib.metadata import version; print(version('redown-client'))"
.\.venv\Scripts\python.exe -m redown.lab gui
```

Expected client version 0.5.4. Reload the unpacked REDOWN extension at
chrome://extensions, reopen its Laboratory, restart local connection and approve
matching Python code. Select a dedicated bucket; separate write approval generates
a fresh namespace. Run Quick on the same directory. During the run, navigate/sign
in to the ordinary Cloudflare dashboard. Do not explicitly disconnect/reconnect
REDOWN during this navigation test. Save JSON and compare selected-case outcomes,
read hashes, remaining work and diagnostic provenance, not only dispatch counts.
Test actual token expiry with a sufficiently long approved duration and selected
workload; do not edit tokens or force revocation of a production grant.

To reconcile a previously saved interrupted run, restart the local connection with
write approval unchecked and test-1-new selected; run:

```powershell
$interruptedReport = Read-Host 'Full path to the original interrupted JSON report'
.\.venv\Scripts\python.exe -m redown.lab reconcile --from-report "$interruptedReport" --report ".\redown-reconciliation.json"
```

Approve its new matching READ-ONLY pairing. Exit 0 means all identified uncertain
candidates were confirmed; it does not certify the whole original run. Exit 2 means
review remaining uncertainty. Inspect the saved report. Never reuse a new write
grant to overwrite the old namespace. Keep the original report unchanged.

## Follow-up gates

Owner Windows GUI and native integration, real token expiry/rotation, dashboard
navigation during work, read-only reconciliation of original RTF, and fresh-run
SHA-256 evidence are required. Future full write continuation needs an explicit
bounded approval contract covering the same namespace, compatibility with the
canonical coordinator's persisted journal, and destructive-action denial tests.
Do not silently expand new grant scope or assert original incident closure.
