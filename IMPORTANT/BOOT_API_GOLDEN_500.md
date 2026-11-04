# IMPORTANT — BOOT API is the reliability axis of REDOWN

**Priority: P0 / launch blocker.**  
**Owner directive:** REDOWN must ALWAYS have a usable entrypoint to the Shelf or the existing attached/extended popup after a legitimate toolbar gesture. Menu work, account state, cloud network, CURRENT persistence and visual effects must not be prerequisites to opening the interface. If Chrome or operating-system policy prevents both supported surfaces, return honest failure evidence rather than claiming opening succeeded.

**Current state (2026-11-03):** Existing BOOT v1, small guarded MV3 service-worker entrypoint, and local regressions exist. An observed **fresh-profile install where the icon did nothing until Chrome Reload** remains OPEN because the original pre-reload Chrome worker/Errors evidence was not collected. Do not report that symptom as solved.

## Immediate execution mandate

Do NOT start a new right-click architectural transplant, premium launch, or store release while the failure-to-open / failure-to-wake P0 is unresolved. Investigate its specific causal boundary, reproduce the known historical regressions, repair only the broken boundary, then prove it stable repeatedly on the actual installed extension. Continue safe independent design work only if the BOOT gate cannot run.

BOOT is the **first operational gate** for every other REDOWN subsystem. All UI rendering, native Chrome menus, cloud adapter readiness, and verified transfer paths depend on a working entrypoint, never the reverse.

This page is the **directive and program index**. The shipped BOOT API contract is [docs/boot/API.md](../docs/boot/API.md), its existing implementation evidence is [docs/boot/IMPLEMENTATION.md](../docs/boot/IMPLEMENTATION.md), and the dedicated [cause/evidence ledger](BOOT_FAILURE_LEDGER.md) separates reproduced defects from unproven possibilities. [AGENTS.md](../AGENTS.md) must point here.

## Existing source confirmed foundations: reuse, do not rebuild

- `extension/manifest.json` points at `service-worker.js`, an early guarded classic MV3 entrypoint that imports the existing `background.js`. The original `entry-bootstrap.js` owns the **single** toolbar listener, Shelf-first gesture and attached popup fallback.
- The BOOT Debug-gated `bootV1` message API in `docs/boot/API.md` already supports local status/audit/history and bounded targeted repair from exact Settings. It does not resurrect a worker that never registers or parses.
- `extension/background.js` owns the single Chrome native registrar and dispatch. REDOWN's durable CURRENT graph and saved-vs-applied native generations must not be reset as a workaround.
- The previous menu `removeAll()` reset when the native-ID cache was missing, lost callback ambiguity, root/Manage disappearance, and non-serialized reconciliation were identified in the earlier pinned reproduction. Retain repaired incremental reconciliation and parent-first registration.
- The audit [final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md](../final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md) documents the production reliability services V3+1 must inherit. The uploaded Universal File API contract's lesson applies: enumerate real user outcomes, fault-inject, perform actions, verify independent receipts, and never equate mock promises with working operations.

**Click2Cloud Golden-case reference:** The owner describes a current **500-case** engine target. Inspected Click2Cloud main head `f69d1e83` and its V3+1 source/contract do not themselves establish a 500-case executable result. That work is a testing **method**, not a claim REDOWN has inherited verified outcomes. REDOWN starts with its own BOOT Golden 500. Do not inflate case counts with repeated labels.

## The Golden 500: automatable, inspectable, repeatable

The Python coordinator `scripts/boot_golden.py` generates exactly **500 reproducible case IDs** (`BOOT-001` … `BOOT-500`), each a unique intersection of **20 lifecycle states × 25 fault profiles**. The Node executor `scripts/boot-golden-matrix.mjs` loads the real current `extension/background.js` and guarded `service-worker.js` into the existing VM harness, injects Chrome API and import faults, exercises a toolbar gesture, and writes one receipt per case. The runtime receipt also distinguishes the 500-case BOOT gate from the cross-subsystem right-click transfer-receipt gate; one must not conceal failure in the other.

Twenty lifecycle families: existing profile, empty storage, missing native-ID cache, disconnected account, popup preference, interrupted/old menu generation, missing/disabled destinations, Nested, Depth, multiple destinations, Worker not prepared, long History, account change, reinstall-like empty storage, cold worker wake, missing child, missing root, and lost cache after restart.

Twenty-five fault profiles cover: no fault; async/sync Shelf refusal; popup launch/configuration refusal; side-panel configuration refusal; storage error; native child/all-create failure; dropped Chrome callback; removal failure; early/late core import failure; close failure; blocked tab/window creation; legacy `removeAll` failure; and paired cascading faults crossing menu, panel, popup and storage boundaries.

Each case checks applicable invariants: **one toolbar owner; at most one context-click owner; zero destructive menu resets; honest failed-core status; root/Manage retention where eligible; an actual toolbar attempt; no detached tabs/windows; unchanged prior History; no inference that native rows are visible from an ACK.** Failures, harness exceptions, missing receipts and incomplete results remain red.

Run from a clean local REDOWN checkout with installed dependencies:

```bash
npm ci
python scripts/boot_golden.py --rounds 2 --rerun-failures 2 --installed-chrome --chrome-cycles 5
```

On Windows PowerShell:

```powershell
npm ci
py -3 scripts/boot_golden.py --rounds 2 --rerun-failures 2 --installed-chrome --chrome-cycles 5 --chrome-bin "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

The coordinator runs source syntax/import checks, the historical native-menu reproduction, BOOT schema conformance, existing focused regression tests, then every generated case twice; it reruns failures separately without hiding earlier failures. It writes `work/boot-golden/cases.json`, per-round and triage JSONL, logs, `report.json`, and `report.md`. Retain the case manifest SHA-256 and failing IDs across agent iterations.

`--installed-chrome` additionally repeats the existing **isolated** real Chrome smoke in a new temporary profile for each cycle (three by default, configurable with \`--chrome-cycles\`) (never the owner's normal Chrome data). It tests installation/worker/context basics but **does NOT automate the actual toolbar-icon gesture, visual Shelf render, or Chrome's pre-reload Errors view**. Therefore its PASS does NOT close the observed incident. If administrator policy blocks unpacked extensions, record BLOCKED, never work around policy.

The Python script is a **test/retest controller, not a self-modifying patch agent**. It writes evidence; Codex or a human reviews a failure, changes the smallest permitted boundary, reruns the exact failing IDs and the full 500, then verifies on Chrome. Do not create an automatic fix that modifies production files blindly from a stack trace.

## Critical fault localization (diagnose the right stage)

```text
Manifest/package valid?
  no  -> MANIFEST_OR_PACKAGE_BLOCKED (Chrome may never register worker)
  yes -> Chrome worker target registered / evaluation attempted?
           no  -> WORKER_NOT_REGISTERED / WORKER_NOT_STARTED / UNKNOWN
           yes -> Guarded entrypoint evaluated?
                    no  -> EARLY_BOOT_PARSE_OR_POLICY (in-worker BOOT cannot run)
                    yes -> Background core import succeeded?
                             no  -> CORE_IMPORT_FAILED; preserve toolbar fallback
                             yes -> Toolbar listener attached exactly once?
                                      no  -> LISTENER_REGISTRATION_FAILED
                                      yes -> Click dispatched?
                                               no  -> CHROME_GESTURE_OR_EVENT_PATH
                                               yes -> Shelf open API accepted?
                                                        no  -> SHELF_OPEN_REJECTED
                                                        yes -> Shelf document handshake?
                                                                 no -> RENDER_OR_CONTEXT_FAILURE
                                                                 yes -> Entry usable; audit menu independently
```

**Never say “service worker failed to start” merely because the icon did nothing.** An MV3 worker being asleep between events is normal. A failing click can be registration, listener, Chrome event, rejected gesture, panel API, document initialization, or visibility. Use evidence with exact Chrome version, extension version/ID, worker target or error, event time, BOOT epoch and correlation ID.

### Specific prior right-click regression to reproduce

1. Cold boot with `rightClickNativeIds` missing while existing rows remain.
2. Chrome menu callback never arrives although it created a child.
3. An update of the active Simple/Narrow/Depth projection occurs while the worker stops.
4. Another writer produces desired/applied generation mismatch, followed by browser restart.
5. A native row disappears while persisted ACK still says registered.
6. One or all native `create` calls fail; a menu parent/root/Manage must survive when Chrome permits.
7. The entire core import fails while the small launcher is intact.
8. First extension install is observed **before** any manual Reload, with no Cloudflare connection.

For each: capture **before**, injected fault, actual registration/open outcome, raw error category, affected call path and **after**. Non-destructive recovery is mandatory. Root/Manage and the basic toolbar opener must never be sacrificed to fix a destination submenu.

### Cross-project regression barrier

When changes touch `background.js`, `service-worker.js`, `entry-bootstrap.js`, `manifest.json`, context menu writer, V3/V3+1 compiler, `CURRENT`, or popup/Shelf wiring, run the BOOT Golden 500 **before merging**. This is especially important for changes in Click2Cloud later transplanted into REDOWN. Its architectural Golden cases do **not** substitute for REDOWN's real installed boot tests.

## Mandatory installed Chrome evidence — separate release gate

Use a disposable fresh Chrome profile, install REDOWN, and **do not click Reload** to hide an initial failure. Before Reload, inspect `chrome://extensions` for the REDOWN service worker, any registration/evaluation exception and its original file/line. Record the Chrome version, extension ID/version, whether the icon click sent an action event, whether `sidePanel.open` was attempted/accepted, and whether `shelf.html` successfully loaded and handshook. Test after an ordinary cold start, after browser shutdown, extension update, native-menu reconfiguration, service worker suspension/wake, with storage unavailable and without any login. Repeat across independent fresh profiles and a preserved existing profile. Do not remove the user's stored data in order to make a defect disappear.

**Success means the actual first gesture opens a rendered, usable Shelf, or the documented attached popup on a supported definitive Shelf rejection, with no forced Reload.** If Chrome cannot provide either, preserve a classified failure receipt; never claim an impossible universal availability guarantee.

## Launch gates (all are required)

- 500 unique cases executed, case manifest and per-case results verified; no regressions, skipped/missing cases or silent flaky passes.
- Existing BOOT tests, historical bug reproducer, schema and syntax checks all green (or any pre-existing failures explicitly classified and fixed before launch).
- Real fresh-profile first click, pop-out fallback, worker wake, restart and menu mutation confirmed **in an allowed installed Chrome environment**. A local mock is insufficient.
- Historical no-boot report localized with pre-Reload evidence, root cause and minimally scoped fix documented in ledger; retest proves correction.
- No new duplicate toolbar listener, menu registrar, cloud service, or History writer; no `removeAll` normal repair; no token leak; no unwanted tabs.
- Root and Manage and stable entrypoints survive menu writer failures; Cloudflare/Drive/Dropbox/OneDrive menu parity rechecked.
- If any gate is FAIL / BLOCKED / NOT_VERIFIED, public release readiness remains BLOCKED. Mark uncertainty, do not announce perfection or overwrite older failing evidence.

**Owner principle:** *Before improving what REDOWN can do, first prove REDOWN can always be entered. Fix the reasons it failed, not the symptoms that made Reload appear to help.*
