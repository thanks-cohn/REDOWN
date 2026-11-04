# BOOT P0 — Failure causality and correction ledger

**Owner-observed incident remains OPEN as of 2026-11-03.**  
Evidence categories are mandatory: `SOURCE_CONFIRMED`, `HARNESS_REPRODUCED`, `INSTALLED_CHROME_REPRODUCED`, `HYPOTHESIS`, `BLOCKED`, `VERIFIED_FIXED_INSTALLED`. Never promote a source review or synthetic injection to a Chrome production root cause.

| Incident / risk | Proven evidence | Existing mitigation / next action | Status |
|---|---|---|---|
| Initial fresh Chrome installation: toolbar click did nothing; manual Reload restored it | Owner observation recorded in `docs/boot/IMPLEMENTATION.md`. No captured pre-Reload `chrome://extensions` worker registration or error data | Fresh-profile controlled test **before Reload**. Capture extension version, worker target, errors/stack, whether action event fired, side-panel request and Shelf render handshake. Compare only afterward to Reload. | **OPEN — mechanism unproven** |
| Native menu lost on fresh load / empty native-ID cache | Prior pinned `buildMenus.finish` ran `removeAll()` even if root/Manage had already been restored; `docs/boot/verification/before-after.json` and `scripts/boot-reproduction.mjs` record harness behavior | Keep update-before-create, avoid normal `removeAll`, retain root/Manage; test missing-cache cold wake, reconfiguration and restart | **SOURCE_CONFIRMED + HARNESS_REPRODUCED; installed retest pending** |
| Callback lost after child native row created | A `chrome.contextMenus.create` callback may be lost while row exists; create-only retry misinterpreted as duplicate and previously led to destructive reset | Same serialized registrar; first attempt update existing IDs, reconcile and ACK matching generation, preserve known IDs on failure | **SOURCE_CONFIRMED + HARNESS_REPRODUCED; installed retest pending** |
| Manage disappearing after healthy Simple projection | Historical Simple branch deliberately omitted Manage even when native registration was considered good | Preserve root and Manage regardless of mode/default destination; assert after all menu projections | **SOURCE_CONFIRMED + HARNESS_REPRODUCED; installed retest pending** |
| Startup/configuration event storm | Concurrent startup/storage/Apply mutations independently queued reconciliation paths | Single-flight menu writer with at most one trailing pass; bounded repair. Test cold/warm wake and two concurrent changes | **SOURCE_CONFIRMED; installed retest pending** |
| Larger background import/parse failure blocks toolbar | Failure injected in `tests/worker-bootstrap-first-install.test.mjs`, existing `service-worker.js` catches core import failure and imports original `entry-bootstrap.js` as fallback when listener missing | Preserve sole original toolbar owner; BOOT reports `CORE_IMPORT_FAILED`, `worker.failed`, not falsely ready. Validate real Chrome fixture and staging. | **HARNESS_REPRODUCED; installed retest pending** |
| Manifest/entrypoint itself fails to register/parse | A worker-internal BOOT API cannot execute when Chrome fails prior to evaluating it | Validate package/manifest classic import closure, inspect native Chrome Errors and DevTools service-worker registration on failure; no claim of self-healing | **HYPOTHESIS for original incident; NOT VERIFIED** |
| Toolbar listener exists, but Chrome does not dispatch click | Could be action popup override, extension context invalidation, browser profile/policy, or event registration race | Record popup configuration, `chrome.action.onClicked` event, worker epoch and affected window; distinguish native popup from listener path | **HYPOTHESIS for original incident** |
| Toolbar click accepted but Shelf is invisible or unrendered | `sidePanel.open` acceptance is not a Shelf document handshake; response can fail/reject or be delayed; popup fallback has Chrome gesture constraints | Observe panel/window context and `redownShelfReady` handshake; only use attached popup on definitive rejection; retain truthful `pending` on uncertain call | **HYPOTHESIS for original incident; incomplete installed proof** |
| Stored ACK says native menu visible even if Chrome row vanished | Chrome native menu has no universal row enumeration API; `registered` only means matching acknowledged generation | Explicit BOOT native repair invalidates cached plan optimization and reconciles, but browser-visual verification remains separate | **SOURCE_CONFIRMED limitation** |
| Installed-Chrome smoke expected old `background.js` URL after manifest switched to `service-worker.js` | In `scripts/installed-chrome.mjs`, the real service-worker target comparison used a stale hardcoded name | Make target detection read `manifest.background.service_worker`; do not misclassify successful worker registration as missing. Browser retest required. | **SOURCE_CONFIRMED test defect; fix in this branch** |
| Chrome administrator policy forbids unpacked loading | Prior `docs/boot/IMPLEMENTATION.md` reports Chrome 154/Linux administrator restriction | Run in authorized normal Windows/Chrome test environment and new temporary profile; never bypass policy | **BLOCKED in previous environment** |

## Standard incident receipt

Record these fields for every observed failure:

```json
{
  "incidentId": "BOOT-INC-...",
  "testCaseId": "BOOT-001",
  "sourceCommit": "<exact tested SHA>",
  "extensionVersion": "<manifest version>",
  "chromeVersion": "<exact>",
  "environment": "vm | installed-chrome | user-observed",
  "initialProfile": "new isolated | preserved existing",
  "reproSteps": [],
  "workerRegistration": "registered | failed | absent | unknown",
  "workerCore": "ready | failed | not-evaluated | unknown",
  "toolbarGesture": "received | not-received | unknown",
  "shelfOpen": "requested | accepted | rejected | pending | not-requested",
  "shelfRendered": "confirmed | failed | unknown",
  "popupFallback": "confirmed | rejected | not-attempted | unknown",
  "menuDesiredGeneration": "<redacted fingerprint or null>",
  "menuAppliedGeneration": "<redacted fingerprint or null>",
  "chromeErrorCategory": "<sanitized code>",
  "evidence": [],
  "causeClassification": "unproven | source-confirmed | browser-reproduced",
  "smallestRepair": "<source paths and change>",
  "regressionCases": [],
  "postFixEvidence": [],
  "installedAcceptance": "PASS | FAIL | BLOCKED | NOT_RUN"
}
```

The literal placeholders are illustrative; generated receipts must use the real value or `null`, not fabricated results. Do not store Chrome profiles, raw URLs, OAuth credentials, file names, bucket names or sensitive page content in the report.

## Correct diagnostic priority on the owner's computer

**Critical: capture before clicking Reload.** First inspect `chrome://extensions` and the extension's Errors and Service worker view, then attempt one ordinary toolbar click, then inspect again. Compare actual worker startup registration, event listener, panel acceptance, and document readiness. If Chrome reports a service-worker registration error before entrypoint evaluation, investigate manifest/packaging/import/syntax. If the worker evaluates and BOOT reports `CORE_IMPORT_FAILED`, inspect the core's first exception. If worker is healthy and click is not delivered, investigate action configuration and Chrome lifecycle. If click is delivered, investigate panel API, window context and document boot. Only then decide what to fix.

Never clear browser cache, reset CURRENT, delete native destinations, force long-running keepalive, disable assertions, or reinstall to conceal an unexplained failure. Preserve the original broken profile or capture redacted evidence first. Synthetic Golden 500 passes are useful regression proof but do not determine the original fault's cause without installed evidence.

## Iteration/closure contract

1. Reproduce case with exact revision, Chrome build and pre-fix error receipt.
2. Identify failing layer and origin error, not a downstream symptom.
3. Apply the smallest fix and preserve source behavior not implicated.
4. Run exact failing Golden IDs, 500 full cases, existing focused BOOT tests, and the real installed Chrome start/first click.
5. Verify restart, menu reconfiguration, Shelf and attached popup without login. No new `removeAll`, duplicate registrar, false save receipt or erased History.
6. Append the cause, fix, before/after, test scope and remaining unknowns here. Close only with actual installed evidence matching the reproduced incident.

**Until step 6 is fulfilled for the original no-boot incident, do not certify release readiness.**
