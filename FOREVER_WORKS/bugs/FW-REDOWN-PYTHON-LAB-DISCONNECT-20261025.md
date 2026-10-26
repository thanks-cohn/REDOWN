# FW-REDOWN-PYTHON-LAB-DISCONNECT-20261025

Status: investigation opened before code changes. Priority 1: connection lifecycle and failed-connection reporting. Priority 2: desktop layout. Live Windows/Chrome/R2 closure requires owner retest.

## Original observation

Affected baseline: `d768294b64cf323d5ef7183f408dadd06e095a7f`, Python client 0.5.0, extension 0.5.26, Windows 11, Chrome, Python 3.14.7 (owner report). Severity: high, blocks live filesystem testing. GUI layout severity: medium, blocks diagnostic access.

Native registration succeeded: `Registered REDOWN helper for this user. Reload REDOWN and open Python Laboratory.` GUI previously paired, discovered buckets and received explicit write approval. Preflight inventoried `lab-smoke/hello.bin`, 8 bytes, SHA-256 `46d7c9e30f06774ee03af126b95c971f6fe6cc8b70ed27377bd4495b72b9b20a` (owner-provided evidence, independently recheck before acceptance).

Reproduction command from the checkout:

```powershell
.\.venv\Scripts\python.exe -m redown.lab complete --directory .\lab-smoke --depth Comprehensive --profile Balanced --report .\write-report.json
```

CLI displayed `Approve code b8a50c71-1f69-4d4d-aa68-f8b697d3e524 in REDOWN`. Report: `acceptance: INCOMPLETE`, six BLOCKED cases (list/upload/read/metadata/copy/mkdir), each `EXTENSION_UNAVAILABLE`; overall `connectionError: EXTENSION_DISCONNECTED`; capabilities `{}`, roots/destination null, zero verified files/bytes, elapsed 12.669 seconds. No live upload/readback is established. Original report is preserved here as supplied observation, not a local reproduction.

Expected: independently approved CLI connection, correct selected scope and lifetime, bounded writes and verified readback. If pairing fails, report one primary connection failure, dependent cases not dispatched, recovery instructions and preserved plan.

## Initial hypotheses and questions

- Missing or delayed approval: inspect pending lifetime and actual native wait deadlines.
- Laboratory tab close/navigation/restart or host termination: inspect native EOF and port teardown. CLI grants are separate from a previously approved GUI grant.
- OAuth logout/session change: inspect storage listener and grant checks; do not confuse provider renewal with Python grant extension.
- Simultaneous clients: inspect listener slots, per-client scope, pending response correlation and stale UI cleanup.
- Windows framing/launch: inspect binary mode, registration origin, process lifetime and buffered IO. Linux fixtures cannot establish Windows behavior.
- Reporting: inspect CLI exception fallback for masking original error and timing.

## Source references and lifecycle

`clients/python/redown/lab.py` CLI/GUI → `extension.py` authenticated discovery/TCP → `native_host.py` per-client framed relay → `extension/laboratory.mjs` page-owned native port and explicit approval → `lab-session.mjs` → canonical scoped session/engine/extension R2 adapter. The Laboratory page owns this port and grants; it is not owned by the background service worker. Background OAuth changes can stop it. Closing/reloading the page intentionally destroys its connections; durable reconnect is unsupported. Each CLI invocation requires a fresh approval, even while GUI is approved. `adaptive.py` owns the bounded write plan/report. Existing tests: `test_extension_transport.py`, `test_adaptive.py`, `extension-lab-ui.test.mjs`, `extension-laboratory.test.mjs`, `extension-native-e2e.test.mjs`.

## Separate GUI observation

Maximized desktop cannot reach controls/output below the advanced method dropdown. Source uses `1000x950` and a single fixed stacked pack layout with no enclosing scroll container. Verify at laptop sizes and scaled text. Preserve controls and keyboard access; avoid a cosmetic rewrite.

## Initial acceptance

INCOMPLETE. Root cause of the owner's exact 12.669-second disconnect is unproven. No local Chrome/native Windows session or R2 execution has been claimed. Investigation, deterministic reproduction, repair and verification follow below.

## Investigation findings and confidence

**High confidence, source and local fixtures:**

- `Relay.close()` supplies `EXTENSION_DISCONNECTED` to an outstanding request when the native input channel ends. In the reported sequence the CLI is waiting for its own approval, before `describe()` or any operation. A missing approval alone reaches the 120-second relay deadline, not a 12.669-second disconnect. An earlier GUI grant does not approve a second client.
- `lab.py` caught that specific error, ran `adaptive_run(None, ...)`, then appended `connectionError` afterward. The runner therefore manufactured six generic `EXTENSION_UNAVAILABLE` errors. Initial checkpoints could not preserve the actual failure. Its elapsed time also excluded initial pairing; new `connectionAndRunSeconds` includes pairing without changing runner timing semantics.
- Browser pending approvals had no expiry; after host timeout a pending row could remain until the host's `closed` message was processed. Approval could race that cleanup and create an orphan grant. The Reject/revoke handler also resent the original pair response after an already-approved grant was revoked. Closed approved clients left obsolete rows. These are independently repairable lifecycle defects, not proof of the owner's original host termination cause.
- A request registered after `Relay.close()` could wait the full timeout after the close notification had already passed. Host output failure could escape the pending request path. Both now fail immediately with transport loss.
- Desktop source stacks more requested height than an ordinary laptop viewport and supplies no outer scrollbar. This explains unreachable lower controls; source confidence is high, actual Windows visual verification remains pending.

**Unproven:** what closed the owner's native channel at 12.669 seconds. Candidate events include Laboratory navigation/reload/closure, explicit stop/restart, Cloudflare session-ID change, native process termination or Chrome launch/framing failure. No correlated browser/native logs were supplied. Native binary mode was already enabled on Windows; no evidence justifies replacing framing, assuming Python 3.14 incompatibility, increasing approval time to hours, moving grants into the service worker or weakening owner approval.

OAuth renewal and scope enforcement were inspected: renewal uses the extension credential flow, not Python credentials; it does not extend the Python grant. Existing checks for expiry, revocation, changed OAuth session, cross-bucket/account/prefix access and write approval remain intact. Native host accepts at most eight authenticated clients; grants and request IDs are per-client. Local discovery files can become stale after crashes, and starting a second Laboratory page replaces discovery without migrating prior grants. Durable reconnect is still unsupported. Native process stdin EOF exits its server; Python exit closes its socket and triggers grant cleanup once the handler reads EOF. An exit during pending approval can require the bounded 120-second wait before cleanup; no automatic recovery is asserted.

## Root cause disposition

Confirmed root causes of the **misleading report** and **GUI inaccessibility** are the exception fallback and fixed stacked layout above. Confirmed pairing lifecycle defects are covered by new fixtures. Confidence in the exact cause of the original Windows transport loss is **undetermined**. This issue remains **OPEN: local Windows/Chrome/R2 retest required**, with a tested repair candidate. No successful live transfer or complete bug closure is claimed.

## Repair and changed files

| File | Change |
| --- | --- |
| `clients/python/redown/native_host.py` | Pair timeout becomes `PAIRING_TIMEOUT`; requests after close and native-output failure become disconnect; safe stderr channel-closure class. Existing uncertain operation timeout retained. |
| `clients/python/redown/extension.py` | Distinguish socket pairing timeout, EOF/disconnect and malformed frames; close failed pairing transports. No reconnect or replay. |
| `extension/laboratory.mjs` | Visible/focused pending code, 120-second timeout, wall-clock expiry guard, timer cancellation, stale-approval rejection, per-client row cleanup and no duplicate pair reply on revoke. |
| `clients/python/redown/adaptive.py` | Shared connection recovery mapping, primary failure, dependent blocked references, preserved plan, explicit dispatch/not-attempted counts in every checkpoint. |
| `clients/python/redown/lab.py` | CLI preserves original setup error and total connection/run time; GUI uses the same classification, retains its last connection failure, and gets scrollable content plus independent diagnostic scrollbar. |
| `clients/python/redown/gui_layout.py` | Standard Tk canvas/scrollbars, focus visibility, native text/list/dropdown wheel behavior and horizontal access for constrained widths. |
| `clients/python/pyproject.toml` | Installable patch version 0.5.1. |
| `clients/python/tests/test_connection_lifecycle.py` | Five regression tests including real authenticated loopback/concurrent clients and exact CLI report retention. |
| `clients/python/tests/test_gui_layout.py` | Real Tk geometry/focus test, explicitly skipped without display. |
| `tests/extension-lab-ui.test.mjs` | Delayed approval, simultaneous pending clients, expiry, suspended-timer wall-clock guard and stale button protection. |
| `docs/phase28/README.md`, `CONNECTION_RECOVERY.md` | Branch installation, error recovery, Windows GUI and exact eight-byte live retest. |
| This report and `verification/lab-disconnect/` | Original observations, baseline/repair results and permanent maintenance record. |

No OAuth credentials, provider adapter implementation, canonical engine, conditional-create semantics, namespace selection, approval duration, write-scope limits, source preservation or delete policy changed. Transport EOF during a mutation still yields INDETERMINATE in the runner; timeout remains uncertain and no write is replayed. New report fields are additive under the existing adaptive 2.8.0 format; read-only architecture report schema is unchanged.

## Verification and baseline comparison

Linux Node 24.22.1; Python local runtime. Logs are retained under [verification/lab-disconnect](../../verification/lab-disconnect/).

| Command | Result |
| --- | --- |
| Baseline `npm test` | 474 tests: 465 pass / 9 fail. |
| Final `npm test` | 474 tests: 465 pass / same 9 fail; no new Node failures. |
| Baseline Python unittest discovery | 31 pass. |
| Final `PYTHONPATH=clients/python python -m unittest discover -s clients/python/tests -v` | 37 run: 36 pass, 1 explicit GUI skip, 0 fail. |
| `npm run lab:test` | 15/15 pass; compiled session validators agree; independent architecture report schema passes. Actual Python/native frames and canonical engine/Atlas traverse an injected provider, not live R2. |
| `npm run providers:test` | 15/15 pass. |
| `npm run resources:test` | 7/7 pass. |
| `npm run aac:test` | 18/18 pass. |
| `npm run file:verify` | 30/30 unit tests and file schema pass; preservation stage fails on existing `SOURCE_DRIFT: extension/file-engine/engine.mjs`. Reproduced from an unmodified baseline archive. |
| `node FOREVER_WORKS/tools/check-preservation.mjs` | Pass. |
| `python FOREVER_WORKS/tools/validate.py` | Fails existing source freshness checks; independently reproduced from an unmodified baseline archive. Frozen records not rewritten. |
| `npm run reliability:check` | Four prerequisite stages pass (syntax/current Explorer map/registry/issues); full regression remains blocked by the nine baseline failures. |
| Startup diagnostics (`getStartGuide`, `validateRegistry`, `listIssues`, `getReleaseReadiness`) and Forever `describe` | Executed; logs retained; readiness is not release certification. |
| Python compileall and `git diff --check` | Pass. |

The nine Node baseline failures retain their names in `baseline-node.log` and `final-node.log`: historical catalog discovery/integrity, historical debug records/pinned Markdown, explicit-label review, removed Nested drag handles, provisioning refresh, semantic vertical contract and finite public coverage. They were not weakened or removed. Full-suite totals stay unchanged because the browser lifecycle scenarios extend an existing test.

Initial schema/AAC attempts lacked `jsonschema`; installed the repository-required `jsonschema[format]==4.26.0`, then reran the affected checks successfully. Earlier intermediate logs are retained rather than passed off as final results. Desktop display is absent, and installing a virtual display failed due to container OS permissions. No bypass was attempted; geometry test skips explicitly. Windows launch/ACL/Chrome native integration, real tab navigation/service-worker restart, real provider grant expiry and live R2 remain manual boundaries. Existing fixture tests verify expiry/revocation/OAuth changes/write denial without claiming those real-platform outcomes.

## Regression protection and reproduction

The five new Python tests reproduce native timeout versus operation uncertainty, request-after-close, failed native output, simultaneous GUI/CLI identities, rejection isolated from approval, native disconnect waking a pending RPC, six dependent cases with zero dispatch and exact JSON/Markdown CLI error retention. UI fixtures approve at 119 seconds, reject expired approval even with suspended timers, and prove stale buttons cannot create grants. Existing security tests continue to enforce explicit write/read grants, revocation during requests, session changes, wrong local credentials, cross-account/bucket/prefix denial and no replay. A mismatched visible pairing code must be rejected by the owner; the protocol has no caller-supplied code that can approve itself.

For independent reruns, install npm dependencies (`npm ci --cache /workspace/.npm-cache --no-audit --no-fund`), Python schema requirements and set `PYTHONPATH=clients/python`. Run the commands in the table. To reproduce historical preservation failures without altering this branch, export the baseline with `git archive d768294b64cf323d5ef7183f408dadd06e095a7f` to a temporary directory and run those two preservation commands there. This investigation did that and retained both baseline logs. Do not refresh historical source digests to turn those failures green.

## Recovery and remaining acceptance

Follow [CONNECTION_RECOVERY.md](../../docs/phase28/CONNECTION_RECOVERY.md) for exact Windows branch installation and eight-byte CLI test. Keep browser Laboratory open, approve the CLI's new matching code within 120 seconds, and retain JSON/Markdown plus independent dashboard-downloaded SHA-256. Inspect native error/status before restarting if it disconnects again. Compare the report's `connectionAndRunSeconds` with pairing and browser events. Never replay an uncertain write; use a new explicitly approved namespace after inspecting retained objects.

Remaining risk: original native termination has no correlated real-platform evidence; GUI focus/scroll geometry needs actual Windows scaling verification; frozen-source regression debt remains; bounded transport still has its existing 64 KiB ceiling and serialized requests. No automatic merge or release is performed. Work is on `fix/python-lab-connection-lifecycle`, based on the recorded baseline; use the branch's Git history for the repair commit (a commit cannot contain its own SHA).


## Consolidation successor after PR #38

PR #38 merged diagnostics and connection repair into main. New consolidation branch
fix/foundation-consolidation starts from 6767bfb; source commit `f44cdc408744a17848d7a66bde24ab241434327a` preserves
those corrections. Doctor's generic routing is now owned once by the scoped facade;
R2 native HTTP parsing stays behind adapters/r2-diagnostics. Schema distributions
are generated from one canonical source. Existing native round-trip/lifecycle tests
pass, alongside independent local filesystem Doctor proof. Original observations above
remain unchanged. This does NOT prove the original live R2 cause or Windows acceptance.

Next owner commands are in docs/phase28/CONSOLIDATED_OWNER_ACCEPTANCE.md; no automatic
Worker repair, infrastructure change or ambiguous write replay is permitted. See
FW-REDOWN-FOUNDATION-CONSOLIDATION-20261025.md and the audit for all dispositions.
