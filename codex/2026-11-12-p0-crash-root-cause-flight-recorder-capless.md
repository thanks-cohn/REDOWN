# REDOWN P0 — Find and repair the disappearing-extension failure; preserve rich crash evidence and opt-in CAPLESS LOGGING

**Date:** 2026-11-12 (America/Chicago)  
**Status:** CRITICAL Codex implementation/investigation brief; no root cause established and no promise that every browser crash can be captured.  
**Starting point:** the **current `origin/main` HEAD**, including commit `dc1a4e136ceffae8749a637c9b90b2f2432445f3` (verify again when starting).  
**Pre-repair historical checkpoint:** tag `95-percent-plus-success` (annotation describes both encouraging testing and serious unknowns; the name is NOT a statistically established lifetime success rate).  
**Related:** `codex/2026-11-12-chrome-reload-crash.md`, `docs/CHROME_RELOAD_STABILITY_2026-11-12.md`, and [issue #60](https://github.com/thanks-cohn/REDOWN/issues/60).

## Branching and integration — owner's explicit instruction

This instruction document and its light starter are stored **on `main`**. Codex MAY create a focused working branch but **MUST branch from the latest `origin/main` after fetching**, not from an old feature branch, `95-percent-plus-success` tag, or its own stale workspace. Suggested name: `codex/p0-crash-root-cause-capless-2026-11-12`. First record `git status --short`, checked-out ref and base SHA. Never reset, clean, overwrite, or discard uncommitted/untracked user artifacts, local ZIPs, cloud settings, auth data, or diagnostic evidence. If working tree is dirty, protect it and avoid destructive checkout.

Implement on that main-based branch, commit narrowly, and target **`main`** through a reviewable PR/merge only after focused acceptance and owner review. Do not pretend a documentation commit means the implementation is merged or live. Do not publish to Chrome Web Store or deploy a provider worker.

## Why this is P0: an extension that vanishes will be abandoned

The user experienced a second REDOWN incident after the prior crash-focused Codex repair. YouTube also failed at about the same time. In `chrome://extensions`, the REDOWN-Click2Cloud v0.5.27 **card was still present**, but normal operation and Options were inaccessible until clicking **Reload**; the card showed an Errors button and Reload rather than a normal enabled state. The existing Errors detail showed `Error: Entry operation timed out`, `Context Unknown`, and an anonymous `:0` stack; **View in DevTools did not open**. This is materially more severe than a normal Shelf disappearing or an MV3 worker becoming idle. We must determine as far as technically possible what state Chrome entered, and prevent recurrence.

The screenshot's old generic timeout wording can be an old retained error and does NOT establish which version produced the current failure. User recently pulled code from `b0797bb` to `dc1a4e1` and reloaded; timing may be relevant, but is not proof of causation. The earlier incident around 10:25Z showed `WORKER_LOAD`, `WORKER_UPDATE` and `SHELF_READINESS_UNKNOWN`. Do not conflate worker install/update/restart with a confirmed Chrome process crash.

**Non-negotiable objective:** Reduce or eliminate the underlying failure, not merely improve log counts. Any defect that makes Chrome mark the extension unusable/unloaded, disables options, prevents toolbar/Shelf, or causes a renderer failure is release-blocking until understood or explicitly bounded with a safe recovery route.

## Real forensic evidence already collected (private; do not commit RAW ZIPs)

Two post-incident ZIPs were inspected locally, labeled `RIGHT AFTER CRASH (1)` and `(2)`. They contain **the same** `startup-crash-trace.json`, but one archive is actually RAW despite "SECURE" in its filename. Do not assume filenames indicate privacy mode. Keep source URLs, account identities and raw errors out of GitHub, tickets and public test fixtures.

Known evidence from those exports:

- **Startup trace:** 384 stored events (384 cap), **at least 895 earlier startup events dropped**, at least **11 unconfirmed writes** and **4 storage failures** (lower bounds). Trace retention is presently 384 records / 192 KiB / seven days. Its presence proves the new diagnostic code ran, not that Chrome's reason for termination is captured.
- **Save forensic history:** 4,000 retained records of **35,417 recorded event attempts**, at least **31,417 dropped/pruned**; two unconfirmed writes and two reported storage failures. These are events, not 35,417 saves. Save-forensics implementation uses 4,000 records / 4 MiB / seven days.
- 2026-11-12 **15:19:42.649Z:** `SHELF_READINESS_UNKNOWN` after a previously accepted Shelf request.
- **15:20:16.374Z, 15:21:15.654Z, 15:21:19.215Z:** `TRACE_STORAGE_FAILED` observations.
- About **15:20:31–15:21:16Z:** four `storage.local.get` / `storage.local.set` calls exceeded the **1,000 ms** diagnostic budget and subsequently completed late (roughly 1.18–1.72 seconds in recorded total durations).
- At **15:28:01Z:** a new worker epoch recorded `CORE_IMPORT_READY`, `WORKER_UPDATE`, `PREVIOUS_EPOCH_STOPPED_REASON_UNKNOWN`. Later entries include interrupted saves with a `WORKER_RESTART` classification in the save ledger.
- An interval of sparse/no observed records precedes the new epoch; absence of logging is NOT proof of a crash or exact onset. The `WORKER_UPDATE` event is *onInstalled reason update*, not a definitive termination cause.
- The simultaneous YouTube incident raises a plausible shared Chrome renderer, GPU process, memory pressure or browser-update hypothesis. We have **no RAM/GPU/process measurements establishing this**.
- Previously observed `model-viewer.min.js` WebAssembly/CSP incompatibility predates this incident. The first repair disabled the viewer without weakening CSP. Do not conclude it caused this new failure merely because it was seen earlier.

## Task 1 — Reconstruct the incident and investigate root cause, systematically

Produce a precise evidence timeline keyed by UTC, local time, worker epoch, extension version/build/commit, browser installation/update and user action where observable. Audit the current `main` implementations before modifying behavior:

- `extension/service-worker.js`: early `importScripts`, core fallback, error handlers and event registration.
- `extension/startup-crash-trace.js`: write pipeline, `chrome.storage.local` lock contention, batch/coalesce behavior, timeouts, recursion/errors, 384-event cap, caller impact and cross-context races.
- `extension/entry-bootstrap.js`: `boundedEntry`, how `entryEvidence` writes to storage, Shelf `sidePanel.open` pending state, context lookup, readiness/timeout/recovery and late settlement; identify whether storage writes serialize behind unrelated work.
- `extension/boot.js`, `extension/background.js`, `extension/shelf.js`/HTML and Options startup: listener registration, long tasks, storage-heavy reads, restarts and dependencies.
- `extension/forensic-diagnostics.js`: IndexedDB transaction and prune pressure, write throughput/backlog and unconfirmed writes under sustained saves. Examine whether verbose logging itself increases instability.
- Any existing `chrome.runtime.onInstalled` and `onSuspend` handlers or multiple extension instances; preserve exact extension ID and avoid introducing duplicate listeners.

Maintain an explicit hypothesis table: **hypothesis, supporting observation, contrary observation, discriminating test, result, confidence**. Prioritize testing slow/contended storage and work queued around Chrome reloads, but do not elevate temporal correlation into causation. Also test Chrome renderer/GPU/memory/process pressure, extension lifecycle/update state and actual service-worker core failures. Instrument things that can distinguish these cases; never claim `reason_unknown` proves a crash.

Where the extension API cannot report root cause, provide **user-guided external evidence collection** (Chrome Errors, `chrome://crashes`, Chrome Task Manager, Windows Reliability Monitor/Event Viewer, available browser crash IDs and exact timestamps), with clear limitations and optional privacy review. Chrome may not expose all browser-level crash dumps to extensions. Do not attempt to bypass Chrome policy, read protected process memory, or silently collect system files.

**Deliver an actual targeted repair** when a reproducible cause or clear code defect is found, with regression tests. If not proven, narrow the hypotheses and harden only the demonstrated failure paths, while explicitly reporting ROOT CAUSE UNRESOLVED. Do not invent fixes or promise zero crashes.

## Task 2 — A real pre-crash flight recorder, not a last-second crash callback

Design and implement a small **always-on crash-safety core** that survives normal service-worker lifecycle churn as far as supported, with optional richer detail under the user's opt-in. Crash capture must operate **before** the incident, not depend on an after-the-fact callback (a hard process kill may run no JavaScript). Persist small durable breadcrumbs promptly using safe nonblocking writes; recover and reconcile last committed checkpoints after reload.

Record feasible structured, typed, sanitized signals:

- Version/build/commit fingerprint; browser/OS/version if legally and technically available; manifest/extension ID as safe non-secret values; UTC and monotonic timing; session/worker/page epoch IDs; sequence IDs and state transitions.
- Worker evaluation/core import begin/ready/failed, listener registration, installed/update/start/suspend/cancel, page/Shelf open/close/unload/error/unhandled promise rejection, unexpected worker restart with UNKNOWN reason, Options unavailable where observable, and outcomes of Chrome API calls with source API, deadline, latency, rejection name and late settlement.
- Toolbar/Shelf opening: action click -> `sidePanel.open` -> getContexts -> handshake -> rendered/ready/unknown, including one pending-operation guard and whether any competing popup/open is attempted.
- Persisted saves and provider job IDs (non-secret correlation only): enqueue, dispatch, upload, verification, receipt, interrupted/uncertain and recovery; distinguish a verified cloud write from an API acknowledgement.
- Diagnostic-health breadcrumbs: per-recorder write latency, timeouts, coalescing, backlog, loss/unconfirmed counts, quota/permission, lock wait duration and storage API errors. Where available, **sample** limited performance signals such as long-task latency, JS heap size or available extension-context memory metrics; mark "unavailable" where Chrome denies them. Do not create a performance-monitoring loop that destabilizes REDOWN.
- Preserve safe bundled source filename/line/column and error names plus **privacy-filtered stack frames** where observable. Support optional user-approved RAW diagnostic mode; never leak signed URLs, cookies, authorization headers, OAuth tokens, private filenames or personally identifying browsing history into default shared logs.
- Preserve a chronological incident bundle with **last-known-good**, **last-started/unsettled**, **last-persisted**, **first recovered**, explicit gaps and unknowns. A crash that destroys in-flight events must appear as "incomplete / unconfirmed", not an invented completion or deletion.

Never monkey-patch broad browser prototypes or install duplicate toolbar handlers just to log. Protect entry-point latency: no critical Chrome gesture handler, `importScripts`, listener registration, provider upload or Shelf open should await a heavyweight log flush. Use minimal synchronous breadcrumbs only where necessary and safe; best-effort async persistence with explicit health.

**Always-on crash incident evidence should not be silently destroyed by the normal telemetry ring:** pin/copy a bounded, privacy-safe incident envelope (e.g., last actionable stage + enough pre/post context) into an incident archive that requires explicit user deletion where feasible, with honest quota limitations. If no reliable incident persistence is possible, show the failure visibly.

## Task 3 — User-controlled CAPLESS LOGGING, with an explicit consent switch

Add a Settings/Options control labeled **CAPLESS LOGGING**, initially **OFF** for everyone (including upgrades). Activating requires a deliberate click/keyboard operation **AND an explicit confirmation** explaining local storage growth, sensitivity, browser performance, and that quota/OS termination can still interrupt recording. Show ON/OFF, chosen storage backend, path/location where appropriate, last confirmed durable sequence, event count, approximate bytes, quota/free space if knowable, backlog, write failures, and **"capture incomplete"** indicators. Deactivation stops future capless writes and **does not erase or overwrite any prior history**. Re-enabling also requires deliberate confirmation. Do not silently opt users in via old Debug Mode settings; only persist a user-confirmed choice, with clear revocation and permission-loss handling.

**When CAPLESS LOGGING is ON, no application-imposed retention cap**: no 4,000 records, 384 startup events, 4 MiB, 192 KiB, seven-day cutoff, rotating overwrite, opportunistic prune, or TTL deletion for enabled archives. Append-only event chronology, with immutable segments and monotonic sequence range tracking. **Unbounded history on disk does not mean infinite RAM, infinite physical disk, or guaranteed data collection if Chrome crashes.** The in-memory buffer must remain small and bounded; if it cannot flush, report gap/loss clearly without blocking normal saves.

Preferred design: a small indexed manifest + append-only, schema-versioned **JSONL segments/chunks** and digest/checkpoint metadata; separate compact **JSON snapshots/aggregate counters** for fast filtering. Ensure each event has stable event ID, sequence, timestamp, epoch, collector, privacy classification and correlation ID. Writes should be durable where supported, serialized/atomic, idempotent, restart-recoverable, and resource-aware. Closed chunks are immutable and never reused; verify checksums and detect gaps. Avoid repeatedly serializing an entire ever-growing array into `chrome.storage.local`.

**Choose a real supported persistence mechanism.** Browser IndexedDB/OPFS/`chrome.storage.local` are persisted on disk but subject to browser quota, eviction, permissions and user clearing. Chrome extensions cannot silently write to arbitrary Windows folders. For user-chosen persistent archival, evaluate a user-gesture File System Access grant if fully supported, or an **optional separately installed native messaging receiver** with narrowly scoped authorized directory access. Verify API support; do not require a privileged native app for ordinary saves. Treat any unavailable backend as an explicit blocker with safe fallback/warning, not as infinite storage. Local encryption and permissions for private RAW logs should be assessed; **do not export or upload RAW logs to any server automatically**.

The ordinary RAW/SECURE forensic exports must remain usable. Add a clear, reviewed **complete capless archive export** (streamed/chunked when necessary; don't read gigabytes into RAM). Include completeness manifests, segment hashes, accepted counts, failure gaps, storage health and event time span. Existing original 7-file Diagnostic Bundle must stay byte-for-byte compatible. Protect existing history, credentials, saved destinations, settings, provider connections, queue and logs in upgrades. Migrate prior retained events **non-destructively** only if correct; irretrievably pruned events cannot be reconstructed.

Make it possible to compute verified success/failure/unknown rates by **source website** (Google Search, Bing, Yahoo, Yandex, other), cloud **destination provider** (Google Drive etc.), account and date window without confusing source site with target cloud or one file with four provider attempts. Keep durable per-attempt counters and known coverage/gaps; avoid percentages with a fabricated denominator. This is helpful but secondary to crash diagnosis.

## Task 4 — Prove the recorder itself does not reintroduce the crash

The proposed CAPLESS system itself is a **high-risk change** while the cause of the disappearance remains unknown. Test whether additional writes, excessive events, per-event JSON array rewrites, lock contention, startup/worker overhead, pending promises, quota exhaustion, listener timing and interrupted commits degrade Chrome stability. These are hypotheses, not known causes.

Minimum focused testing and reporting:

1. Baseline comparison against `95-percent-plus-success` and post-merge `dc1a4e1`: document commit ancestry and applicable behavior. Never check out the tag into the user's live directory, never reset user data.
2. Fresh worker evaluation; import success/failure; exact one toolbar listener; early logging failure; storage read/write delay >1 s; late Chrome API result; competing Shelf-open attempts; read-only diagnostics post-reload.
3. Realistic 900–1,000-save **fixture simulation** (no unwanted real provider writes), then >=50,000 and >=100,000 synthetic events under CAPLESS enabled to prove no old segment is rotated/pruned, stable memory usage, recoverable sequences and truthful stats.
4. Inject killed/aborted writes and partial segments; worker suspension, browser/update/reload semantics, mid-transaction interruption, quota full/denied, permission revoke, duplicated messages and crashing page contexts. Validate replay and completeness flags.
5. Validate that **OFF** mode does not open heavy archives and remains low overhead; ON only after explicit user action; disabling preserves data; both RAW and SECURE exports redact as promised and never silently upload.
6. Test Chrome installed/unpacked extension behavior if available, not only Node mocks; screenshot Options/Shelf and recorded traces, including what happens when extension cannot open its own Options. If unavailable, give precise manual Windows acceptance steps with expected evidence instead of claiming real-Chrome success.
7. Compare Chrome Task Manager memory/GPU behavior when possible; simultaneous YouTube crash remains an external clue, not proof of correlation.
8. Run only scoped tests/syntax/security checks needed for the changed modules. Do not run destructive sweeps or broad unrelated refactors. Record test commands, counts and exact remaining failures.

### Release gates

- **P0 fail** if extension becomes unavailable/disabled or Options inaccessible under a reproducible supported workflow; investigate cause before calling fixed.
- No direct loss/overwrite of forensic events while CAPLESS enabled. If disk writes fail, show a prominent incomplete/archive-stalled signal with sequence gap and preserve previously committed segments; fail the logging guarantee honestly, **not** cloud transfers.
- No data or authorization reset, duplicate menus/listeners, new CSP exceptions, or unknown extra background persistent processes.
- No regression to actual cloud-upload success verification. Browser UI performance and worker startup must not be degraded by diagnostic retention.
- Every incident report must differentiate **observed / inferred / unknown**, with raw private evidence never committed. Every "crash captured" claim must say what was actually persisted; a hard kill may still escape capture.
- **Do not claim crash-free**, do not claim every crash will produce an after-death stack, and do not present the saved tag name as a measured lifetime success rate.

## Deliverables to commit on the main-based working branch

1. Investigation report `docs/` with complete redacted incident timeline, root-cause hypotheses, tests and honest confidence.
2. Focused code changes for any demonstrated failure cause or safe lifecycle hardening.
3. Minimal overhead durable incident flight recorder and explicit failure/gap indications.
4. CAPLESS LOGGING opt-in toggle with confirmed ON/OFF behavior and supported append-only local persistence, preservation/export, and non-destructive upgrade.
5. Focused automated tests and manually reproducible Windows Chrome acceptance steps, especially for unavailable Options.
6. A short change summary, security/privacy notes, test results, limitations, and review-ready PR into `main`. **Stop if a required safety condition cannot be met**; report blocker and safe partial work rather than quietly weakening requirements.

**Reminder:** The owner invested substantial time testing and lost historical forensic events due to the old retention policy. Their evidence is not disposable. Do not erase or silently rotate it again.
