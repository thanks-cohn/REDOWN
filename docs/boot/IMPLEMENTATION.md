# Startup BOOT implementation and open acceptance

Branch: `codex/v3-parity-first-reconstruction`. Source baseline:
`5fbcfc07cb16773250692f6c8f304ad65131e345`. This implements local P0 repairs
and BOOT v1. The owner's intermittent installed-Chrome incident remains OPEN.
No installed/browser/provider acceptance or universal availability is claimed.

## Proven causes versus incident hypotheses

The existing Shelf-first synchronous action listener and every-worker menu
reconciliation predate this change (`1aa1d0e`, `d33203d`, `7365086`). The
post-login Explorer change (`d111465`) is separate from initialization.
There is no before/after trace from the owner's broken profile, so its temporal
association with recovery does not establish causality.

Reproduced registration defects in the pinned background:

1. `buildMenus.finish` called `removeAll` when `rightClickNativeIds` was missing,
   even though `ensureMenuAccess` had already restored root/Manage. Thus normal
   fresh load or missing-cache wake deliberately destroyed viable local access.
   A failure then cleared the ID snapshot, sending the next retry down the same
   destructive path. There was no need for HTTP cache involvement.
2. A callback lost after Chrome created a child leaves that child present. A
   later create-only retry cannot safely distinguish it from a duplicate. The
   previous recovery reset the entire tree rather than reconciling the row.
3. Healthy Simple projection deliberately removed recovery Manage. The registered
   status therefore did not mean both root and Manage remained available.
4. Repeated startup/storage/Apply requests queued independent reconciliation
   operations instead of joining one active generation; source inspection and
   storm fixtures demonstrate unnecessary repeated work, not a provider outage.

The deterministic registration comparison (`node scripts/boot-reproduction.mjs`)
runs the pinned background with current shared imports: it proves the changed
registration path, not an entire historical installed build. Before: fresh load
**1 full reset**, missing-cache wake **1 reset**, Manage absent after healthy
Simple projection. After: **0 resets**, surviving root/Manage/destination retained,
Chrome callback registration acknowledged. Receipt:
[before-after.json](verification/before-after.json).

Toolbar gesture/popup policy, worker evaluation failures, stale extension
contexts, profile storage differences and browser registration defects remain
possible factors in the owner's incident. Ordinary page refresh need not restart
MV3 or rebuild menus. HTTP cache clearing, storage deletion and extension reload
are distinct; no cache-clearing/reinstall advice was used to mask an unknown.

## Production changes and ownership

`entry-bootstrap.js` still owns the only action listener and opener; no cloud,
audit or BOOT wait precedes `sidePanel.open` in the gesture. Existing attached
popup recovery, explicit popup preference, window-scoped Shelf handshake and
late-result supersession remain intact. Configuration failures now have honest
terminal receipts, including rejected popup configuration; bounded evidence I/O
cannot permanently hold its diagnostic queue. Install/update/browser-start and
worker-load receipts are distinct.

`background.js` still owns the only native writer/click listener. It updates
known **and unknown-cache** desired rows before trying create. It never performs
normal `removeAll`; only known obsolete/reordered destination rows are removed.
Root and Manage remain. Missing removal is idempotent; other removal failure
remains failed. Unknown historical rows cannot be enumerated or reliably pruned
without their old IDs; current dispatch revalidates CURRENT and fails closed.
This deliberately prioritizes usable entrypoints over destructive cleanup.

One active reconciliation joins overlaps, with at most one trailing pass.
Desired/applied SHA-256 generations, attempt IDs, acknowledgement timestamps and
callback error categories survive interruption. Failure retains known IDs and
last applied generation. Explicit native repair invalidates only the in-memory
plan optimization so it also repairs a missing child when cached receipt matches.
No migration rewrites CURRENT, backups, OAuth state or protected checkpoints.

BOOT delegates to these owners and uses their existing 64-event ring. Settings
Debug actions expose inspection, explicit local repair and sanitized export.
The save/default resolver remains unchanged: provider default/Home saves exactly
the authorized target; `redown-go-home` alone navigates the dashboard. Dispatch
fingerprints and route-resolution receipts identify those paths without leaking
private native IDs. A resolved save route does not mean transfer success; the
existing transfer/read-back/history pipeline owns completion evidence.

`check-syntax` now also validates the classic worker import closure and entry
HTML presence. This catches missing imported scripts and ESM-only/parse errors
before an in-worker API could execute. It cannot certify Chrome API policy.

## Executed verification

* `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` succeeded.
* Mandatory getStartGuide, validateRegistry, listIssues, getReleaseReadiness and
  Forever describe executed; readiness remains blocked, not certified.
* Focused BOOT/entry/dispatch/CURRENT: **47 tests, 47 pass, 0 fail, 0 skipped**.
  Includes ten new BOOT tests, callback timeout, targeted removal/create failures,
  missing cache, partial state, blocked Shelf/popup, sender gates, static imports,
  external child loss, read-only/privacy and healthy-repair no-churn assertions.
* **20 consecutive worker activations/toolbar cycles** pass in the harness.
  The measured 20-cycle test took about **125 ms** in one run; scheduler/run
  variation is expected. This is not an installed latency/battery benchmark.
* JSON Schema: **6 valid fixtures**, **3 malformed/version/bounds rejections**.
* Fresh baseline `npm test`: **824 reported tests / 731 pass / 93 fail**.
* Final reliability run: **834 reported tests / 750 pass / 84 fail / 0 skipped**.
  No failure names newly introduced relative to the fresh baseline. Nine names
  no longer fail in this run; that is not proof all those product defects closed.
* `npm run reliability:check` remains **FAILED**. Syntax, API registry and issue
  inventory pass. Explorer architecture freshness was already stale and remains
  failed. The maintained regression baseline recognizes only six of the current
  84 failures; 78 are unexpected against that older inventory. Runner also marks
  execution incomplete because an existing parse-failing Nested test file never
  reaches its historical drag-handle test. No historical assertions/hashes or
  baseline inventory were rewritten. Exact names/categories:
  [test-comparison.json](verification/test-comparison.json).
* `node scripts/installed-chrome.mjs extension work/installed-chrome.json`:
  **BLOCKED**, Chrome 154.0.8037.57/Linux. Administrator disallows unpacked
  loading; zero installed assertions ran. [Chrome receipt](verification/installed-chrome.json).
  No policy bypass, real provider write/deploy or public-access change occurred.

Repeat commands:

```sh
node --test tests/boot.test.mjs tests/entry-point-reliability.test.mjs tests/right-click-dispatch.test.mjs tests/right-click-current.test.mjs
python3 tests/boot-schema-conformance.py
node scripts/boot-reproduction.mjs
npm run reliability:check
```

## Acceptance matrix

Each PASS below is **PASS (harness only)**. None is PASS (installed Chrome).

| ID | Result and evidence boundary |
|---|---|
| B01 | PASS harness empty storage: Shelf gesture, root/Manage, Setup. Native visibility blocked. |
| B02 | PASS harness persisted state and menu wake. Real authorized cold start NOT_VERIFIED. |
| B03 | PASS harness synchronous toolbar call on reconstructed worker. Actual suspension NOT_VERIFIED. |
| B04 | PASS harness surviving native entries and exact dispatch. Real Chrome menu wake NOT_VERIFIED. |
| B05 | PASS harness lifecycle/storm listeners and distinct receipts. Native update lifecycle NOT_VERIFIED. |
| B06 | PASS harness rejection, missing API, blocked popup, pending and late results; no fake render. |
| B07 | PASS harness create/root failure, targeted removal failure, missing callback, bounded recovery. |
| B08 | PASS harness applying/mismatched generations and new-epoch reconciliation. |
| B09 | PASS harness stale/structural IDs fail closed, separate dashboard/Setup/chooser/save paths. |
| B10 | PASS harness exact default transfer/read-back, once per source click; live R2 NOT_VERIFIED. |
| B11 | PASS harness disconnected Setup, revoked/default route denial; toolbar independent. |
| B12 | PARTIAL harness window supersession, independent worker state, exact account authorization; real multi-profile NOT_VERIFIED. |
| B13 | PARTIAL empty storage/restart fixtures and documented data-loss boundaries; destructive browser deletion NOT_RUN. |
| B14 | PASS harness repeated repair single-flight/cap and concurrent event storm; no periodic BOOT loop. |
| B15 | PASS harness version/schema/sender gate, read-only snapshots, sanitized bounded history, no cloud calls. |
| B16 | PASS harness default healthy repair: no writes/reset/token refresh. Explicit repair is intentionally allowed. |
| B17 | PASS harness malformed/partial configuration and missing ID cache retain local access. Broad per-namespace corruption recovery remains existing CURRENT behavior, not newly certified. |
| B18 | PASS static missing import/classic parse fixtures; unrelated runtime import failure preserves early toolbar in harness. Real Chrome error inspection BLOCKED. |
| B19 | BLOCKED/NOT_VERIFIED: owner's broken profile and before/after native traces unavailable. |
| B20 | PASS harness 20 cycles; installed cold/warm cycles BLOCKED/NOT_VERIFIED. |

## Remaining engineering and browser work

The owner's exact recurring failure is not proven fixed by this local work.
No in-worker coordinator can heal a worker that never parses/loads. Chrome's
stalled panel request cannot safely launch a competing popup; it stays pending
with truthful evidence and requires another gesture/platform investigation.
A timed-out repair may still have an underlying Chrome operation in flight;
serialization remains held until settlement or worker termination. A permanently
stalled local CURRENT/storage dependency can therefore require manual worker
restart, rather than unsafe concurrent reconciliation. BOOT never force-clears
that lane or claims its timed-out write was cancelled.

In an administrator-approved Chrome environment, load this branch in a separate
profile and preserve console/service-worker error receipts. Run B01–B20 in fresh
and pre-existing authorized profiles, recording BOOT history/status before and
after browser startup, extension update and explicit worker suspension. Inspect
exact clicked ID transiently in trusted debugger and compare its dispatch kind
and authorized target, never infer it from the label. Confirm real Shelf document
readiness and native menu visibility by user interaction. Save only with explicit
disposable-provider test authorization. Retest the owner's broken profile before
closing the incident; compare extension identity/version, worker epochs and desired/
applied generation receipts. Do not delete their storage to manufacture recovery.


## Fresh-install guarded entrypoint follow-up (November 1, 2026)

**New owner observation:** On an entirely new Chrome profile, REDOWN was
installed and the toolbar click displayed nothing. Without reinstalling,
pressing **Reload** for REDOWN on `chrome://extensions` made the toolbar icon
work. The owner suspects the MV3 worker failed to start. This is **valuable
first-install reproduction evidence**, but *inactive worker*, failed worker
registration/evaluation, missing event dispatch and an accepted-but-invisible
Shelf are still different possible causes; no errors/stack or pre-reload
worker status were captured in this report.

**Source implementation in the follow-up:** The manifest uses a tiny guarded
`service-worker.js` instead of placing `background.js` itself in the manifest.
The wrapper imports the unchanged background and catches synchronous core
script/import failures so the existing, already-early
`entry-bootstrap.js` toolbar opener survives. If no original action
listener was registered, it imports that same launcher once. It does not
create a second launcher or menu writer, make cloud API calls, or assume a
service worker is permanently resident. `boot.status()` now differentiates
a trapped core failure (`worker.failed`, `overall.blocked`) from a healthy
full import; `CORE_IMPORT_FAILED` enters the existing bounded diagnostic ring.
The new bootstrap file is included in startup syntax/package validation.

**Automated coverage added:** `tests/worker-bootstrap-first-install.test.mjs`
models (a) normal core import with one action/menu/message listener,
(b) a core import failure before toolbar registration and fallback to the
same opener with BOOT blocked status, and (c) a failure after early
toolbar registration without duplicate listeners. These are harness
assertions, not the owner's installed-Chrome first-click acceptance. The
existing whole-worker harness still loads `background.js` directly for
backward-compatible core regression coverage.

**Acceptance remains OPEN:** A real fresh-profile installation must now
succeed on its first toolbar click without using the Reload button, and
the Chrome Errors/service-worker status **before** any Reload must be
captured if it still fails. If Chrome refuses to register/launch the small
worker itself, no in-worker BOOT API can revive it; that must be diagnosed
from manifest/package validation and Chrome's extension Errors, not
misreported as a repaired core import. Release and live-provider
verification remain unclaimed until observed in an authorized browser.
