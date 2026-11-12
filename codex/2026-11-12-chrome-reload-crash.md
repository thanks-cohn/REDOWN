# REDOWN P0: Chrome-safe restart, 3D preview disablement, durable crash evidence
Created: 2026-11-12 (America/Chicago)
Baseline checked: main b0797bbdc766caca00c35966fda813de4b737927. Reconfirm main HEAD before editing.

## Mission
After a first-ever user-observed REDOWN crash/apparent disappearance from chrome://extensions, prepare the next safe unpacked-extension update/reload. Stop the known model-viewer WebAssembly CSP error without weakening Chrome security. Add always-on, bounded, persisted diagnostic evidence at early startup and during Shelf open/recovery so a future unexplained disappearance can be investigated.

This is a NARROW CODEX RUN. Do the smallest safe implementation plus focused tests, not a long repository investigation. Keep the current working tree safe. No unrelated fixes, AGENTS/Forever Works audits, provider/OAuth/refactor work, broad test sweeps, or migration. Work on your Codex branch and commit when focused acceptance tests pass.

## Incident facts, not proven causation
On November 12, 2026 about 04:25 Central, the user says the extension disappeared from Chrome Extensions dashboard and later returned; they are unsure if they clicked Reload themselves. Do not label an OS/browser crash as proven by the logs.
Entry-point journal, UTC:
- 10:24:53 and 10:25:00 MENU_CLICK_SAVE, then SAVE_ROUTE_RESOLVED; NOT proof of remote upload completion.
- 10:25:20.041 WORKER_LOAD.
- 10:25:21.017 WORKER_UPDATE.
- 10:25:24.643 SHELF_API_ACCEPTED plus SHELF_READINESS_UNKNOWN.
- Several subsequent MENU_ACKNOWLEDGED events.
Chrome extension errors:
- Entry operation timed out, Context Unknown, stack :0 anonymous. Source message occurs in extension/entry-bootstrap.js, boundedEntry(). verifyShelf() calls getContexts and sendMessage with 150 ms default budget and swallows some exceptions.
- model-viewer.min.js:517 WebAssembly.instantiate() CompileError: extension CSP script-src 'self' blocks wasm-eval and unsafe-eval.
- This model-viewer CSP problem is already mentioned in docs/debug/DBG-004_LOCAL_UPLOAD_FETCH_FAILURE.md as of October 12, 2026. It is a PREEXISTING problem and is not established as the cause of the new apparent crash.
- Forensic health key redownForensicHealthV1 showed pendingDropped 0, pendingFailures 0, storageFailure false, lastFailureAt null. This only describes its storage-health checks, not worker crash status.

## Task A — Disable incompatible GLB/glTF viewer now
Scope: extension/options.html, the related GLB/glTF branch in extension/options.js; relevant focused tests.
1. Stop including the type=module script loading extension/model-viewer.min.js in Options; do not load it through a different dynamic path.
2. Do not delete or rewrite the vendor library; keep its embedded licenses for future restoration.
3. GLB/glTF preview must render a clear fallback: "3D preview temporarily unavailable in this Chrome extension. Download the file to view it locally." Keep original file details, authorized open/download routes, accessible navigation, and existing previews for all other types.
4. Do not add unsafe-eval, wasm-unsafe-eval, new remote scripts, CSP exceptions, or permissions; keep Chrome's extension security unchanged.
5. Focused tests should prove no model-viewer execution on Options load and no broken GLB/glTF navigation/fallback.

## Task B — Durable EARLY startup, crash-adjacent, and reload diagnostics
Focus on extension/service-worker.js, extension/entry-bootstrap.js, and small related lifecycle hooks in extension/boot.js or extension/background.js; minimal readout/export UI changes only when necessary.
1. Lightweight trace initialized as early as practicable BEFORE importScripts('background.js'); never block synchronous MV3 event listener registration, user-gesture toolbar open, or provider access on a trace write. The original single toolbar click handler and error fallback must remain intact. Avoid duplicate listeners and catch tracing failures.
2. Log compact, bounded, chronological structured events (UTC wall clock plus elapsed monotonic timing when available; worker epoch/request/attempt correlation; build/version; component and Chrome API; stage; accepted/rejected/timed-out/late completion/unknown). Capture worker evaluation/start, core import begin/ready/failure, registered entry listener, onInstalled reason, onStartup, menu registration result, toolbar configuration, Shelf request, getContexts polling, redownShelfReady acknowledgment, readiness outcome and recovery fallback. Record source stack/error name when observable. Also capture unhandledrejection/error events in feasible worker and page contexts without touching every module.
3. The current 150 ms default in verifyShelf and generic "Entry operation timed out" are not diagnostic enough. Attribute precisely which bounded operation timed out, record budget and duration, and use an appropriate readiness timeout without blindly raising every limit. A timeout is NOT cancellation; Chrome work might complete later. Do not start a competing popup/panel while original call is unresolved.
4. Persist trace automatically in a bounded private local store across worker termination, extension reload and browser restart, even with Debug Mode off and Options closed. Use a modest bounded ring (e.g. 256-512 records, max bytes and <=7 day retention) with serialized, best-effort writes; no disk/CPU/storage hammering or MV3 keepalive timer loop. Degradation and dropped events must be explicit. Do not store raw page/source URLs, content, cookies, OAuth secrets, tokens, credentials, or authorization headers in these startup traces.
5. On a new epoch, mark any earlier epoch without an observed graceful completion as "previous epoch stopped; reason unknown," NOT "crash confirmed." Routine MV3 worker sleep, developer Reload, extension update, Chrome restart, and genuine faults are distinct when observable; record uncertainty when not. Chrome does not expose definitive reasons for every shutdown/disappearance.
6. Provide a simple read-only place in REDOWN Options or existing startup inspect UI to view last boot/worker epochs and failure codes after the next reload. Include the new startup-crash-trace.json in the two NEW forensic exports (RAW and SECURE) if a small integration is practical, without changing their existing file contents or button labels. Maintain the ORIGINAL Export Diagnostic Bundle byte-for-byte, including its format/buttons and existing Clear traces semantics. Do not auto-wipe these traces or the save forensic ledger.
7. Ensure a broken core import can still leave a useful early boot trace and preserve recovery Shelf route. If storage is unavailable, preserve best-effort console reporting with honest "trace incomplete" status. Do not invent evidence from a hard browser kill.

## Acceptance gates: focused only
- Tests: cold load, worker new epoch and update, successful boot, thrown background core import, normal idle/reactivation without mislabeling crash, Chrome API rejection/timeout/late settle, Shelf readiness success/unknown, no duplicate click listeners or competing surfaces, storage failure/quota and bounded retention, restart-readable logs, export secure-redaction checks, 3D fallback and unaffected non-3D previews.
- Syntax/manifest/CSP checks and targeted relevant tests only. Note actual pass count.
- Document a short manual Windows Chrome procedure: pull merged code with fast-forward only, Reload unpacked extension, reopen Options/Shelf, inspect startup trace, download secure forensic ZIP and original diagnostic ZIP; do not claim it was live-tested unless it was.
- Do NOT clear, reinstall, or reset the user's extension data. Do not force rollback or reset Git.
- Final Codex report: files changed, tests executed/pass-fail, how to retrieve post-reload traces, known blind spots and remaining root-cause uncertainty. Commit the narrow implementation to Codex's working branch, ready for review/merge, then STOP.

## Critical invariants
Security policy stays strict. The vendor 3D source stays archived. Existing RAW/SECURE and seven-file original diagnostics stay operational and unchanged except an additive startup trace in the new exports. Existing cloud uploads, account tokens, routing, provider counters, History, Shelf interaction, and context-menu saves continue to work. No claim of zero future crashes without installed-Chrome evidence.