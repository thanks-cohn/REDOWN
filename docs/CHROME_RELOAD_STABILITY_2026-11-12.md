# Chrome-safe reload and persistent startup evidence

Date: November 12, 2026 (America/Chicago). Request: `codex/2026-11-12-chrome-reload-crash.md`.
Confirmed main before editing: `653ad9b5fdd59532df571514fc60053d8a7b13bb`.
Working branch: `fix/chrome-safe-reload-trace-2026-11-12`. Commit-only implementation; no merge, deployment, reinstall, policy change or cloud mutation.

## Repair

Options no longer loads `model-viewer.min.js`. Its vendor bytes/licenses, existing renderer code behind a disabled gate and styling remain preserved. GLB/glTF files, including JSON/octet-stream metadata cases, show:

> 3D preview temporarily unavailable in this Chrome extension. Download the file to view it locally.

Existing details, authorized original-file link, previous/next navigation, lightbox controls and image/video/audio/PDF/text renderers remain. No CSP, manifest, permissions or remote scripts were changed. The known CSP/Wasm incompatibility is preexisting; removing it does **not** establish the cause of the reported disappearance.

`startup-crash-trace.js` initializes before the large background import. Synchronous listener registration and user-gesture opening do not wait for persistence. It observes worker evaluation, core import, the original listener, install/update/start, menu registration, toolbar configuration, Shelf requests/readiness, API rejection/timeout/late settlement, recovery, worker/page errors and unhandled rejections. It includes UTC timestamps, monotonic elapsed/duration measurements, version, epoch/request/attempt correlations, named APIs and safe source frames/error names when available.

The private key `redownStartupCrashTraceV1` holds up to 384 events / 192 KiB of event metadata / seven days. Writers serialize using the existing Web Locks platform where available, coalesce pending batches, and do not run heartbeat/keepalive loops. Queue losses, expiry, storage failures and unconfirmed timed-out writes are distinguished. Writes are best-effort; failure produces a fixed console warning and incomplete status. Nothing clears this trace or the existing save-forensic ledger automatically except bounded trace retention.

A new worker records `PREVIOUS_EPOCH_STOPPED_REASON_UNKNOWN` when its predecessor has no observed graceful ending. This is **not crash confirmation**. Suspend/cancel signals, onInstalled reason and browser startup remain separate observations. Page traces contain no raw URLs, content, account/credential data or arbitrary error messages; source frames are restricted to known bundled filenames and line/column numbers.

Shelf readiness now uses specifically named `runtime.getContexts` (up to 600 ms) and readiness acknowledgment (up to 1,000 ms), within a bounded four-second readiness window. Other existing API budgets are retained. A warning deadline does not cancel Chrome work. An unresolved `sidePanel.open` stays guarded against a competing open, even after the warning; late acceptance/rejection is journaled. The original single opener and attached recovery route remain.

## Retrieve after the next reload

Open Options → existing Developer/Debug diagnostics → expand **Startup/reload trace (read-only)**. Debug Mode is needed only for the existing controls' visibility; recording itself is always on. This read does not activate the worker, repair entrypoints or probe providers.

The existing **Export All Diagnostic Data (RAW)** and **Export Secure Diagnostic Data** additionally contain `startup-crash-trace.json`. Their `forensics.json`, README and button labels/workflows are preserved. Startup JSON is already privacy-filtered in both views. If the collector is unavailable, the added file reports that explicitly.

The original **Export Diagnostic Bundle** builders/handler are byte-for-byte unchanged and still produce their established seven-file format. Existing Clear traces, startup actions, Explorer diagnostics and all preexisting button IDs/labels remain intact.

## Changed files

- `extension/startup-crash-trace.js`: bounded persistence, safe readout, lifecycle/page faults and epoch interpretation.
- `extension/service-worker.js`: early trace and core import/fallback observations.
- `extension/entry-bootstrap.js`: precise bounded-operation evidence, readiness budgets and unresolved-open guard.
- `extension/boot.js`: shared worker epoch and named BOOT bounds.
- `extension/options.html`, `extension/options.js`: disable 3D loading/execution, safe fallback and read-only trace disclosure.
- `extension/shelf.html`, `extension/shelf.js`: early page faults and correlated readiness acknowledgment.
- `extension/forensic-download.js`: additive startup JSON in the two new exports only.
- `scripts/syntax-targets.json`: register the new script.
- `tests/chrome-reload-crash.test.mjs`, `tests/entry-point-reliability.test.mjs`, `tests/worker-bootstrap-first-install.test.mjs`, `tests/forensic-diagnostics.test.mjs`: focused coverage and updated safety contracts.
- This report.

## Focused verification

**69 tests passed; zero failed.** Syntax passed for all **11 changed JavaScript files**. Manifest/CSP, vendor-library bytes and original diagnostic builders are hash-compared with the confirmed baseline. `git diff --check` passed.

```sh
node --test tests/chrome-reload-crash.test.mjs \
  tests/worker-bootstrap-first-install.test.mjs tests/entry-point-reliability.test.mjs \
  tests/forensic-diagnostics.test.mjs tests/diagnostic-download.test.mjs tests/boot.test.mjs
```

Coverage: cold boot, core import failure/recovery, new epoch/update/start, suspend/cancel, page/worker faults, precise timeout/rejection/late settlement, readiness success/unknown, no duplicate opener/competing surface, bounded storage/quota degradation, restart-readable logs, read-only disclosure, secure additive export, old controls/format, GLB/glTF fallback and non-3D rendering.

Two existing bootstrap-test assumptions needed correction: a failed core has no menu queue to await, and the isolated Chute message listener also survives core failure. Assertions still require exactly one toolbar opener and correct failed-core status. Two entry tests now assert joining an unresolved native open instead of superseding it, as required by this repair. The forensic preservation test still compares every old button and the complete diagnostic-handler section; its whole-options-file assertion was narrowed because the requested 3D branch must change. No frozen baseline hashes or failure ratchet was reset.

These are controlled Node/JSDOM/Chrome-API fixtures. No installed Windows Chrome, real browser termination/disappearance, CSP execution or real provider acceptance is claimed. No full regression or broad investigation was run.

## Manual Windows Chrome check — after review/merge

1. Preserve the unpacked-extension directory and Chrome profile. Run `git status --short`; if there are local edits, stop and preserve/review them. Fetch, switch to the intended main checkout, and use `git pull --ff-only origin main` once this implementation is merged. Do not reset/force checkout.
2. In the same approved Chrome profile, use **Reload** on the existing unpacked extension at `chrome://extensions`. Do not uninstall, clear storage, reload a different directory/ID, or bypass policy. If Chrome policy prevents Reload, stop and record that blocker.
3. Reopen Options and Shelf normally. Confirm GLB/glTF fallback, normal navigation and a non-3D preview. Expand the read-only startup trace; look for the new worker epoch, core import/listener/readiness results and any named API failure/late result.
4. Download **Export Secure Diagnostic Data** and confirm `startup-crash-trace.json`; also download the original **Export Diagnostic Bundle** for comparison. Do not clear evidence first. Keep any RAW export private; it retains the save ledger's sensitive details.
5. If disappearance recurs, retain the exact wall-clock time, Chrome Errors/policy state and both ZIPs. Do not interpret a missing epoch ending as proof of crash, or menu/Shelf acceptance as remote-transfer proof.

## Remaining uncertainty

The reported disappearance's cause is still unproven. Routine MV3 sleep, developer Reload, update, restart and real faults can lack a final callback. Hard browser/OS termination, storage failure, disabled/removed extension or changed extension ID can prevent or make evidence inaccessible. Uncommitted events can be lost; late storage settlement and cross-context gaps make counts best-effort. Version does not establish an installed Git byte identity. No claim of zero future crashes or live Windows verification is made.
