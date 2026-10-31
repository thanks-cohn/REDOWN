> Toolbar behavior in this historical report is superseded by [the native attached-pop-out correction](ATTACHED_TOOLBAR_POPOUT_CORRECTION.md). Do not use its detached-window or forced-preference steps. Prior verification is retained as scoped history.

# Toolbar and menu repair: source causes and verification

31 October 2026. Branch `codex/v3-parity-first-reconstruction`; investigated baseline `1a635b942fd1e9b01f183d60db8b17970f084da1`. This implements launch and registration repairs. It does not establish the cause of the owner's installed fresh-profile incident or certify Chrome acceptance.

## Investigation and confirmed mechanisms

| Failure mode | Baseline source / reproduction | Repair |
| --- | --- | --- |
| Saved popup overrides Shelf-first and suppresses action listener | `background.js:applyToolbarOpenMode` reads storage before `action.setPopup`; `toolbar-preferences.js`, Shelf radios store popup. Whole-worker fixture with old popup value configures `popup.html`. Chrome action popup and onClicked are mutually exclusive. A valid popup normally opens; this alone does not prove the reported no-op. | One launcher clears popup before storage, migrates old mode to Shelf, retires conflicting controls. Manifest has no default popup and retains Shelf path. |
| Background dependency failure can precede listener registration | Baseline toolbar registration follows provider and other imports. Injected `cloudflare-api.js` evaluation failure prevents later listeners. No spontaneous import failure reproduced. | `background.js:1` imports a dependency-free `entry-bootstrap.js` which registers toolbar first. Injected later import failure retains working fallback. Syntax failure before any background execution remains outside this guarantee. |
| Shelf rejection fallback violates product contract | Baseline `openToolbarInterface` opens `shelf.html` in a tab, then Options if that fails. Tests reproduce API rejection/synchronous throw/missing API. | Direct gesture-bound Shelf call, bounded readiness, existing `popup.html?recovery=1` in an extension popup window. No automatic tab/Options fallback. |
| Resolved Shelf promise does not establish local UI readiness | Baseline returns after API acceptance; no page acknowledgement. Fixture supplies no Shelf context and reproduces silent acceptance with unavailable UI. | On Chrome with getContexts, window-scoped SIDE_PANEL presence plus local Shelf response after control initialization; bounded checks then recovery. Older Chrome explicitly records API acceptance only. No provider wait. Unrelated Shelf windows do not respond and cannot win Chrome's first-response race. |
| Repeated failed clicks create duplicate UI | Baseline fallback creates a new tab per rejection, no shared operation. Rapid fixture clicks reproduce multiple independent attempts. | One in-flight attempt, reusable popup window ID and Chrome window lookup after worker restart. No closing unrelated windows. |
| Menu access is gated on diagnostic storage | Baseline rebuild writes applying status before establishing base entry. Injected storage failure leaves registration path without guaranteed base access. | Establish root/manage before reading caches or writing status. Independent launcher remains usable when storage fails. |
| Every rebuild destroys acknowledged native state | Baseline `buildMenus.finish` always removeAll, even unchanged projection; repeated Apply/startup/alarm events repeat it. Interrupted/failing reset can leave partial menus. Previous repair restored root after failure but retained the destructive lifecycle. | Retain acknowledged native IDs locally, update existing IDs parent-first, remove obsolete IDs child-first, create missing entries, and recreate destination siblings when their ordered IDs change because Chrome cannot reorder with update(). In-worker identical plans skip native replacement. Restart reconciles stored IDs using Chrome callbacks, never treating stored IDs as proof of native presence. Unknown pre-migration or invalidated registration uses one bounded reset then immediately restores base access. |
| Menu rebuild launches discovery even when only native state needs repair | Baseline `buildMenus` schedules `refreshV3Inventory` after every successful registration; freshness limits some calls but startup can trigger scans. | Registration only uses cached snapshot/inventory. Explicit Refresh and existing Level maintenance alarm own discovery. No new scans/alarms. |

Current navigation anchors: `entry-bootstrap.js:applyToolbarOpenMode`, `openToolbarInterface`, `verifyShelf`, `entryEvidence`; `shelf.js:redownShelfReady` listener; `popup-recovery.js`; `background.js:rebuildMenus`, `ensureMenuAccess`, `removeNativeMenus`, `buildMenus.finish`, `requestMenuRebuild`. Tests identify exact boundary failures rather than asserting installed success from source locations. Line anchors can change; use these unique symbols.

## Lifecycle and independence

Manifest loads background, which registers the launcher before provider imports. Chrome action invokes Shelf synchronously before storage, menus, authorization or inventory. API acceptance proceeds to bounded local document readiness where supported. Shelf local navigation is initialized independently of provider refresh. Recovery window creation is reported as accepted, not rendered/interactive proof. The dedicated recovery script registers before ordinary popup provider initialization; Retry Shelf, Settings navigation and local support export work without background messaging. Explicit popup openings lack the recovery banner.

Install, startup and worker-load reconciliation use the same menu queue. Root/manage use callback-scoped lastError and five-second acknowledgement bounds. Projection is deterministic and validated parent-first before destructive operations. An unchanged plan still acknowledges base access; persisted IDs across worker restart are reconciled with updates/create fallback. A failed generation invalidates the stored inventory and records failure, ensuring the next lifecycle rebuild cannot indefinitely preserve partial registration. Apply's existing generation/read-back semantics remain; missing authorization cannot resurrect old destinations. Simple, Narrow and Level domain/editor logic, profiles, History and transfer semantics are preserved. Legacy remains unimported and unselectable.

Chrome offers no atomic menu transaction or native inventory enumeration. The one-time unknown-state reset can still have a small empty interval; extension termination within it is repaired at the next executable lifecycle event. A timed-out Chrome operation may complete later, so it is reported failed/uncertain rather than atomic. Individual update errors fall back to create, then fail explicitly if Chrome denies both. No unbounded retry. An unchanged plan does not cause repeated cloud listing or menu destruction.

## Why previous repairs were insufficient

The preceding emergency report explicitly retained popup preference and tab/Options fallback; those choices conflict with this request's Shelf-first/recovery-window contract. It correctly serialized full rebuilds, acknowledged root management and added worker-load reconciliation, but still reset every generation and launched discovery from registration. Tests exercised rejection and callback failures through mocks while installed Chrome was unavailable. Passing those tests could not establish Chrome gesture handling, popup focus, extension errors or UI rendering. This repair extends the whole-worker fixture and independently tests recovery controls; it does not upgrade mock evidence to installed proof.

## Minimal evidence

`chrome.storage.local.entryPointEvidence`: last 64 fixed-shape local records, timestamps, component, operation, stage, stable code/safe summary, recovery state, attempt UUID, extension version. No remote telemetry. Menu failures record the stopping stage and base-restoration outcome; reused recovery windows record focus acceptance. Existing `rightClickMenuStatus` retains configuration revision, application key, registration state and callback receipt. `rightClickNativeIds` is only a bounded receipt inventory; current validated configuration remains authority. Passive runtime/debug/Explorer APIs are unchanged; the future query design is a separate proposal.

Text logs have trailing whitespace normalized without changing assertions or results. The evidence writer is serialized and cannot gate launching. Storage failure emits a fixed warning; evidence cannot be guaranteed when storage is unavailable. This is an internal bounded repair record, not the future API. There is no per-frame heartbeat, ongoing launch polling or cloud health scan. Success records distinguish Shelf API acceptance, local readiness and recovery-window creation. Neither proves pixels or complete provider usability. A recovery-window lookup/focus is reuse, not a new UI-render acknowledgement.

## Browser verification limitation

This environment has `/usr/bin/chromium`, but `/etc/chromium/policies/managed/extensions.json` sets `ExtensionInstallBlocklist: ["*"]` and permits only a different managed extension. Unpacked REDOWN installation was therefore not attempted through an alternate loading mechanism. Policy was not modified or bypassed. Installed native toolbar gestures, menu visibility, multi-window focus, real MV3 suspension and fresh/upgraded-profile behavior remain **unverified**. Other extensions' menu failures cannot be diagnosed from repository tests. Chrome special/restricted pages may omit extension context menus; verify ordinary HTTPS pages first. Disabled, policy-blocked or unloadable extensions cannot provide an executable event or guaranteed recovery.

## Verification records

See `verification/entry-points/` for exact focused results, full reliability report, branch-baseline failure comparison, syntax/package audit and policy evidence. The baseline is freshly executed from a Git archive of the starting commit using the same locked dependencies; it is not the older seven-failure pinned baseline. Preserve unrelated historical evidence failures rather than refreshing frozen hashes. Full reliability remains a failing/incomplete suite, not a release certificate. The owner checklist identifies all installed-browser acceptance still required.

The future diagnostic API has **not** been implemented. No provider requests, cloud changes, store publication or release deployment were performed for verification. The package audit is a local blocked candidate, not a browser release.

## Exact final local results

- Repair-focused: 79 tests passed, zero failed.
- Broader Shelf/History plus repair run: 97 tests, 91 passed, six pre-existing failures.
- Full `npm run reliability:check`: 700 passed, 71 failed names, incomplete. Fresh archived baseline: 688 passed, 72 failed names. No added failed names. One removed name is the obsolete popup-preference contract test replaced by the Shelf-only migration test, not an independent claim of historical bug closure.
- Syntax, API registry and issue inventory passed. Existing Explorer architecture freshness failed. The runner's older pinned baseline labels 65 failures new and six known; the fresh branch comparison establishes these 71 already existed.
- Local audit packaging succeeded with 79 files; release remains blocked by existing gates. No package was published.

### Current exact source anchors

- `extension/background.js:1` — `importScripts("entry-bootstrap`.
- `extension/entry-bootstrap.js:16` — `async function applyToolbarOpenMode`.
- `extension/entry-bootstrap.js:30` — `async function verifyShelf`.
- `extension/entry-bootstrap.js:45` — `function openToolbarInterface`.
- `extension/background.js:2303` — `async function rebuildMenus`.
- `extension/background.js:2352` — `async function ensureMenuAccess`.
- `extension/background.js:2368` — `async function buildMenus`.
- `extension/shelf.js:117` — `chrome.runtime.onMessage?`.
- `extension/popup-recovery.js:1` — `Recovery controls`.
