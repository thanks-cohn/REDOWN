# History GO TO and V3 Setup handoff

30 October 2026, America/Chicago. Branch `codex/v3-parity-first-reconstruction`.

**Implementation committed and locally tested. Native browser/live acceptance and the owner's exact Unknown request incident remain open.**

Published implementation commit: **`0e49a5c4f730d528e1201b720f571ab0409701c6`**, tree `44759330b14255b6b629387752517376f5e3192f`. Local implementation `a780611` has the identical tested tree. Command-line push credentials were unavailable, so the connected GitHub app publishes that tree. This handoff and its evidence are in the following documentation delivery commit; its exact SHA is in the delivery response and branch history.

Protected `V3-MENU-MODES-BEFORE-HISTORY-REPAIR` remains annotated object `cff7020054885e95a3f313cacd38f37218f9e735`, peeled `46b03c66735aef6efd7395b19f4d8c02484ae947`. Protected `BASE-v3` remains annotated object `322358123d78cebad75ee4503f30c33cfa34459c`, peeled `209a52cd1515d44f0dab005e26b738e678c29b65`. No protected ref is moved.

Read [the full implementation/receipt/routing/limitations report](HISTORY_GO_TO_IMPLEMENTATION.md). Previous [menu presentation](MENU_PRESENTATION_IMPLEMENTATION.md) and [tree/focus implementation](TREE_EDITOR_IMPLEMENTATION.md) remain authoritative historical reports for their scopes.

## Delivered behavior

- GO TO appears immediately on eligible successful Shelf History rows and Legacy Options success rows. A shared validator requires an exact recorded Cloudflare account, bucket and key, successful completion semantics and no explicit failure/uncertainty. No destination inference from source URLs or display filenames. Old exact receipts work; unresolvable historical entries stay unchanged.
- New Tab is the default. A newly created active Explorer tab consumes an opaque expiring session handoff, discovers the exact account/bucket/folder, uses the existing paginated exact-key stat lookup, selects/scrolls/focuses the exact object and invokes the unchanged existing preview. Keep Both consumes the returned final key. Unsupported formats remain selected with existing preview-unavailable presentation.
- Existing Settings persists `historyGoToMode` in local storage. Side Panel calls Chrome's open API inside the original gesture, relays only within a real matching-window panel and leaves browser tabs/webpages untouched. Rejections or missing acknowledgements show an explicit New Tab fallback, without taking it or changing the preference. Chrome/user settings control side placement.
- Receipts from ordinary ingest and direct uploads retain their actual destination fields. No transfer algorithm, Worker source, public URL behavior or preview renderer is replaced. New destination metadata does not claim stronger verification than those existing paths actually perform.
- Request tokens, expiring session storage, aborts and directory/discovery epochs guard stale navigation. Missing/deleted/moved/renamed objects and expired authorization fail with recovery guidance. Extension-reload loss is reported. MV3 suspension does not own the frontend/session handoff.
- Setup no longer reserves 156/224px header minima, fixed hidden-control/status tracks or an enclosing minimum panel height. Empty statuses collapse. The two rejected routine strings are removed. Tree rendering and focus/editing/checkbox/delete/autosave mechanisms remain intact.
- The generic background fallback now identifies unsupported request types with `UNSUPPORTED_REQUEST` and a reload recovery step. Current Setup request types all have handlers, and the actual dispatcher acknowledges the current snapshot in the regression. **The owner's exact failing operation/installed background was unavailable. A stale background is a hypothesis; the original incident has not been reproduced or conclusively fixed.**

## Verification

Evidence: `history-navigation-evidence/`.

- Final focused tests: **54 pass, 0 fail** (16 new History/navigation tests, 38 existing V3 tests). Includes failed-row exact DOM equivalence, collapsed-row action and click isolation, eligibility, settings restart, tab/panel call separation, explicit fallback, late opening/read races, Keep Both identity, real R2-adapter pagination, exact account/bucket/key, selection/scroll/focus/existing preview, unsupported format, missing/auth/offline errors, malformed/expired handoffs and real dispatcher behavior.
- Final `npm run reliability:check`: **621 pass, 69 failed names, incomplete**. Syntax, API registry and issue inventory pass; architecture freshness fails. No additional failed names versus the archived prior V3 full run. No assertions/historical hashes were weakened. Final report source hashes match all tested committed source files.
- Fresh protected-baseline broader Shelf/History run: **5 pass / 4 fail**, reproducing the same four broader History/Shelf failures. Their original logs are retained. This is a fresh bounded baseline comparison, not a fresh full pristine test run.
- `preservation.json`: existing History renderer is identical after excluding only the conditional action insertion; original History CSS prefix, preview function, tree renderer, Cloudflare client, public-address library, archive, transfer counter, V3/Legacy domain and manifest preserved.
- Installed Chrome: **blocked, `CHROME_NOT_AVAILABLE_ENOENT`, zero assertions**. No visual geometry, true tab activation/panel placement, native keyboard, screen reader or MV3 live proof. **No live Cloudflare verification performed.**
- Earlier intermediate logs remain labeled separately; the final JSON/log and focused-final log describe the delivered source. The one removed-routine-text test expectation was updated to require its absence while keeping the surrounding engine events/tree/reload assertions.

## Remaining acceptance

Install in an approved Chrome environment and inspect desktop/narrow Setup geometry, all tree interactions and progressive modes. Save a disposable authorized Cloudflare object, including a Keep Both collision, then verify both GO TO opening preferences, exact selection and supported preview. Verify actual panel failure fallback, reload/MV3 interruption and keyboard/screen-reader behavior. Capture the named Setup operation if the owner-reported unsupported request recurs and establish its actual installed source/version mismatch before claiming closure.

The current Beta Explorer has no GLB/GLTF inline preview route; unsupported formats use existing behavior. Existing architecture/test debt remains. These local passes do not certify complete P0 browser/live acceptance.
