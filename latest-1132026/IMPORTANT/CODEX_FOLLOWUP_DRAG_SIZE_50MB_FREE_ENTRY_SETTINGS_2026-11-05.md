# CODEX FOLLOW-UP — Drag-and-Drop File-Size Settings and Verified 50 MB Default

**Date:** November 5, 2026  
**Repository:** `thanks-cohn/REDOWN`  
**Status:** Follow-up implementation request, NOT complete or verified  
**Dependency:** [Existing comprehensive Codex request](CODEX_P0_OPTIONAL_FILES_SLIDE_PREVIEW_SPLITTER_IMAGE_MODES_DRAG_RELIABILITY_2026-11-05.md)  
**Change policy:** Implement in the same feature branch/PR as the parent request if it is still in progress, otherwise a narrowly scoped follow-up branch/PR. Never overwrite/duplicate the parent specification; never merge to main or deploy without authorization.

## Owner correction and exact requirement

**This is a SEPARATE follow-up, not an edit to the parent request.** The previous parent specification was restored unchanged. The following owner direction supersedes its historical 32 MiB / 8 MiB drag-size restrictions **only in the file-size configuration and required transport-capacity scope**. Its other instructions—Universal File API owns original cloud reads, Chutey owns the drop handoff, stage/queue/retry, honest receipts, privacy, first-attempt reliability, and no new engine—remain mandatory.

1. **Default drag-and-drop file-size limit = 50 MB** for ordinary users/fresh installs. Use decimal MB consistently: 50 MB = 50,000,000 bytes. Preserve valid existing explicit user preferences when upgrading.
2. In Shelf **Settings**, add **Drag-and-drop file-size limit (MB)** as a **free-entry numeric field**, not a slider, dropdown, preset menu, or range-bound selection.
3. User may type **8**, **50**, **75**, **100**, **500**, or **any other finite positive numeric MB amount**. **Do not impose an arbitrary product/UI maximum or force the user to choose from predefined values.** Invalid/negative/zero/NaN/infinite input must be rejected clearly; do not silently clamp or change the stored value. Offer **Reset to default (50 MB)**.
4. The chosen number is the user's **configured per-file policy limit**, not a promise that Chrome, a device, a provider, or every third-party webpage can transfer that size. Display any actual runtime/provider/destination restrictions honestly and give a useful supported fallback. No false success, no silent reset to 8 MB because of device-memory heuristics.
5. **50 MB transfers must actually work** through at least a controlled end-to-end browser receiving fixture (original bytes, size, MIME and filename checked). Changing the field or constants without real delivery evidence does **not** satisfy this request.
6. **The original drag-and-drop failure still takes priority.** Fix first-gesture, authenticated read, stage/claim, dispatch and target compatibility defects before declaring the increased capacity a success. Honor the parent request's genuine website acceptance tests and honest unsupported-target reporting.

## Existing code and changes to coordinate

Audit the latest implementation first, especially:
- `extension/chute-drag.mjs` (current default 32 MiB / 8 MiB on low-memory; size checks, source stat/readStream);
- `extension/chute-stage.js` (`MAX_BYTES` and private IndexedDB staging);
- `extension/chute-worker.js` (claim/chunk/finish and staging cleanup);
- `extension/chute-content.js` (receiver's hard-coded 32 MiB budget and File reconstruction);
- `extension/shelf.html`, `shelf.js` and relevant Settings preferences;
- Universal File API, existing tests/fixtures, and stage/queue/retry improvements from the parent request.

The whole pipeline must apply the **same validated configured byte limit** consistently. It is not sufficient to raise only the first check: remove or revise hidden `32 MiB` or `8 MiB` rejection points, transport timeouts and incomplete-message/claim assumptions as needed. Be careful not to break existing one-use authorization, source integrity, exact original bytes, bounded storage, cleanup and error states.

## Large-file architecture and safety

- Make a **minimum 50 MB** default handoff operational, without freezing the Shelf, accumulating excessive RAM copies or making expensive repeated downloads.
- Review bounded reads/chunks and memory-to-storage transitions; prefer safe streaming or chunked storage and reuse the **existing** adapter, File API, and one shared authorized companion *if necessary*. Do NOT create another cloud engine, a second worker install, a debug popup, or an unintended Windows Downloads file.
- Keep storage quotas/resource budgets explicit. An unbounded numeric Settings field **does not authorize unlimited RAM/disk allocation**. If a requested size exceeds available resources, fail predictably **before destructive or misleading effects** and explain the real constraint.
- Retain privacy minimization: only original bytes and essential filename/type metadata go to the authorized receiver; no source/page URLs, credentials, private history, or browsing provenance to a destination provider.
- Honor the parent request's **Keep files prepared for uploading** setting (OFF by default), bounded grace/retry semantics and **Clear Prepared Files** operation; do not make retention indefinite simply because the numeric limit is higher.
- When a website/browser rejects file drops or requires an untrusted event to act as trusted, report unsupported behavior instead of claiming success or circumventing platform security.

## Test/acceptance matrix (mandatory)

1. **8 MB configured**: user can lower the size and the limit is genuinely enforced.
2. **Default 50 MB**: a real ~50,000,000-byte file moves through the full cloud-read / staged-file / receiver path into a controlled HTML upload fixture, preserving size, content hash, MIME and filename, without false completion.
3. **Just over 50 MB with default**: rejected with an accurate configured-limit message, not a generic "could not download".
4. **75 MB or 100 MB configured**: larger valid user entry saves, displays correctly and transfers successfully where supported; otherwise surface actual measured platform constraints, without pretending the UI setting equals capacity.
5. **Any other valid positive number**: accept/persist the value in Settings without a preset-only or arbitrary maximum; for impractically huge values, avoid allocation until a transfer begins and enforce real resource availability safely.
6. **Low-memory device simulation**: do not quietly substitute 8 MB; stress test controlled 50 MB handoff or report a concrete resource failure without browser lockup.
7. **Lifecycle/reliability**: first drag, receiver claims before byte completion, repeat/retry with valid newly authorized capability, worker suspension/restart, auth expiry, storage quota, explicit clear/retention change, cancellation, stale/orphan cleanup, source changed during read, concurrent drags, and unsupported sites.
8. **Live sites**: report separately for ChatGPT, Google image-upload targets and Yandex when feasible; distinguish "drop dispatched" from accepted attachment or completed upload. A controlled fixture is required but **not sufficient** to advertise universal live-site compatibility.
9. Record precise commands/results, current and baseline failing **test names**, CPU/RAM/storage measurements, and supported vs unverified browser/OS proof. Do not call a partial passing test suite production acceptance.

## Deliverables and completion rule

- Implement as a **follow-up** to the existing comprehensive request, without changing its other UI requirements (optional elevator, preview selection/double-click/arrow browsing, expand/retract, full-range splitter, Detailed/Large Images).
- Provide updated UI, transport/config changes, focused regression tests, benchmark evidence, a destination compatibility matrix and accurate remaining constraints.
- Use a dedicated branch/PR or append a clearly identified commit to the active implementation PR. **Do not merge to main.**
- **Done means:** on a clean profile the setting displays **50 MB**; user can type **8 MB or any other valid positive MB number**; the actual original **50 MB** file is delivered end-to-end in a controlled browser test; and no hidden 8/32 MiB ceiling, false success, or worker/Explorer regression remains.
