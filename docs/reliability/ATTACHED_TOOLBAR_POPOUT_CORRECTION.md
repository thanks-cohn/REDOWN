> Toolbar branding update: [paired Simple/branding repair](../../FOREVER_WORKS/v3/SIMPLE_CLOUDFLARE_AND_TOOLBAR_BRANDING_REPAIR.md) supersedes this report's launch badge/technical-tooltip indications. Genuine failures remain local diagnostics/recovery state. The attached-only opening contract below is retained.

# Shelf-first, native attached pop-out correction

31 October 2026. Required branch: `codex/v3-parity-first-reconstruction`.
Baseline: `1aa1d0ef6692a0e734e3ea7bc674e91e847ba799`. This corrects that commit's toolbar fallback, preserving its independent early launcher, V3 menu reconciliation and local diagnostic ring. Installed Chrome acceptance and the owner's original clean-profile no-op remain open.

## What the previous implementation got wrong

Codex interpreted the earlier fallback language as permission to create a detached window. That misunderstood the intended experience: only Chrome's toolbar-attached action popup is acceptable. Its `entry-bootstrap.js:openToolbarInterface` used `chrome.windows.create({type:'popup',url:'popup.html?recovery=1'})`, remembered/focused the detached window, and raced Shelf opening against a deadline. This was a real production path, not a browser-attached popup.

A second mistake was to interpret a resolved Shelf request with missing readiness acknowledgement as permission to open another interface. A timed-out request can still succeed later; a missing handshake does not prove that the Shelf is absent. Those mechanisms could produce a late or duplicate interface. The previous preference migration also overwrote intentional Popup choices; this correction stops that behavior and restores the existing choice controls. Values already overwritten by the preceding build cannot be reconstructed without external evidence; the user can explicitly reselect Popup.

Inspection found one added `windows.create` launcher call plus window lookup/focus/removal state. There was no new automatic `tabs.create` in the launcher; the earlier pre-1aa repair's tab/Options escape had already been removed. The recovery script's Settings tab is user-invoked and is retained. No `window.open`, manifest `default_popup`, duplicate action listeners or second active menu engine were introduced. The old launcher used `action.setPopup({popup:''})` globally and forced stored `toolbarOpenMode` to Shelf. The corrected code keeps one `onClicked` listener and one native action-configuration queue.

## Final launch contract

| Condition | Implemented behavior |
| --- | --- |
| No explicit preference | Manifest has Shelf path and no default popup; the synchronous toolbar listener requests Shelf before storage/provider/menu work |
| Explicit Popup preference | Configure `popup.html` as the native action popup; Chrome opens it and does not deliver `onClicked` |
| Shelf request resolves, local readiness responds | Record `SHELF_READY`; stop, no fallback |
| Shelf request resolves, readiness cannot be verified | Record API acceptance plus `SHELF_READINESS_UNKNOWN`; native error indication, no second interface |
| Shelf request is still pending at deadline | Indicate pending; expire its recovery authority. A new explicit click may retry Shelf; old completion cannot create a popup |
| Shelf request definitely rejects/throws, or API is absent | Where available, close this window's existing global Shelf and require close acknowledgement. Verify the original tab is still active, arm a tab-only native recovery popup and request `action.openPopup({windowId})` |
| Native `openPopup` succeeds | Record API acceptance, not a rendered-attachment claim; existing compact popup loads with a small recovery explanation |
| Native `openPopup` rejects/is unavailable/times out | Keep the tab-only native popup armed. Badge/tooltip says click once more; that click uses Chrome's own action popup dispatch |
| Recovery popup loads | Directly restore its tab override from saved preference; do not write the preference or depend on background messaging |
| Chrome blocks registration/close/targeting | Record failure and native indication; no detached window, tab, Options page or alternate interface |

Only definite opening failure permits automatic recovery. An ambiguous successful/pending request cannot be converted safely into an automatic popup without risking the owner's no-duplicate rule. In that case REDOWN deliberately retains the Shelf route and reports the uncertainty. If needed, the user can explicitly open Chrome Extensions → REDOWN → Extension options, choose Compact popup in the existing toolbar settings, then close any Shelf and click the icon. That is an intentional preference change through an existing UI, never an automatic tab or forced migration.

Popup arming is per tab; the global Shelf preference is untouched. `setPopup` alone never opens the popup for the click already delivered. The distinct `openPopup` call is best-effort, with a real next-click native route if rejected. Worker activation does not clear an armed recovery override; startup reconciliation preserves it. Explicit preference changes clear stale overrides to the selected mode. Temporary recovery is consumed by the popup's own local script when it loads, so subsequent dispatched clicks follow the saved preference. Chrome itself controls toggling/closing an already-open action popup.

Rapid identical clicks share an attempt. A newer target supersedes a pending older target; expired/superseded rejections cannot open recovery. While recovery itself is being configured, further delivered clicks coalesce. Local configuration and recovery arming share one queue; startup cannot erase a newly armed route. Preference changes invalidate older attempt authority. API/configuration waits are bounded; the Shelf-open deadline is a native indication, never an automatic fallback trigger. Tests shorten that deadline to 30ms and menu callback bounds to 25ms; production uses 2500ms/5000ms.

Retry Shelf in recovery closes the attached popup synchronously before requesting the Shelf from that user gesture. Failed Retry updates a native tooltip rather than resurrecting a second interface. Dashboard, connection, Settings, History, themes, provider code and legitimate user-invoked tab navigation remain. `background.js` V3 registration and protected checkpoints are untouched by this correction.

## Chrome API investigation

Official references fetched 31 October 2026:

- https://developer.chrome.com/docs/extensions/reference/api/action
- https://developer.chrome.com/docs/extensions/reference/api/sidePanel

The action reference states that a configured popup suppresses `onClicked`; tab-specific state takes precedence over global state. `setPopup` configures a document; it is not an opening acknowledgement. `openPopup` is available to ordinary extensions in Chrome127+, with Chrome118–126 restricted to policy-installed extensions. `OpenPopupOptions.windowId` selects the window. We do not assume an awaited Shelf rejection retains a gesture or guarantees that this request will work.

The side-panel reference requires user interaction for `open` (Chrome116+). `setPanelBehavior({openPanelOnActionClick:true})` is a supported Chrome-managed alternative, but it supplies no single failure callback that can reliably coordinate the owner's conditional fallback with a separate handler. The correction explicitly disables that parallel authority. `close` (Chrome141+) resolves after the global panel closes and is a no-op if already closed. `onOpened` (141+) and `onClosed` (142+) report panel state, not a rendered/functional page. Runtime contexts plus the existing window-scoped page response improve local readiness evidence but still cannot establish visual attachment or pixels.

No claim is made that same-click automatic switching is impossible on all supported Chrome versions. The supported action API is attempted after a settled rejection; actual success is unverified here. The older/blocked case has an explicit extra-click strategy. On older Chrome without `sidePanel.close`, conclusive rejection still permits native recovery for that failed request; independently pre-existing Shelf visibility cannot be proven absent. Cross-context, policy, disabled-extension, missing-bootstrap/main-script syntax failures and arbitrarily delayed non-cancellable Chrome IPC remain platform boundaries. API timeouts are uncertainty, not proof of UI failure. There is no universal guarantee when Chrome cannot deliver any executable event.

## Fresh-profile investigation

The original owner-installed no-op is not reproduced in an approved installed environment. Confirmed source risks remain: popup registration suppressing the listener, tab-specific overrides taking priority, worker import errors before listener registration, user-activation constraints and rejected Shelf APIs. Empty-storage fixtures establish local listener delivery/usable route without OAuth or inventory. Injected later provider import failure leaves the early launcher usable. They cannot establish why Chrome delivered no visible result in the owner's profile. No startup exception has been invented as the incident's cause.

## Before/after evidence and acceptance boundaries

| Scenario | Before source/fixture evidence | Corrected local evidence | Installed/visual before and after |
| --- | --- | --- | --- |
| Shelf success | Direct open; readiness timeout could trigger window | Accepted/ready Shelf never triggers popup, including slow completion | Unverified |
| Definite Shelf failure | Detached popup window created | Native `setPopup` then `openPopup`, no window/tab calls | Unverified |
| Native popup unavailable | Detached window used instead | Native override armed for next click; preference preserved | Unverified |
| Explicit Popup choice | Forced to Shelf, choice removed | Choice persists, native popup suppresses listener | Unverified |
| Cold storage/provider unavailable | Early listener independent; detached recovery | Early listener independent; attached recovery | Unverified |
| Rapid/superseded requests | Shared window, but deadline could race late Shelf | Coalescing/generation guards, no timeout fallback | Unverified |
| Chrome blocks surfaces | Window attempt and diagnostic failure | Native indication/evidence only | Unverified |
| Right-click/Dashboard/Settings | Existing V3 and user navigation | Preserved; focused menu and DOM checks | Unverified |

A disposable Chromium154 profile attempted standard unpacked loading from the audit package, with no unsafe extension-debugging switches, alternate installation or policy changes. No REDOWN service worker was observed. `/etc/chromium/policies/managed/extensions.json` blocklists `*` and allows only a different managed extension. Modern Chromium can also ignore the ordinary load-extension flag, so absence is not attributed solely to policy. Installed and visual assertions are zero; no actual toolbar attachment, native gestures, fresh/upgrade first click or suspension is certified. Exact package/launcher hashes and observed targets are retained under `verification/attached-toolbar/installed-chrome.json`.

The helper now models native dispatch: effective per-tab popup wins over global state, a configured popup suppresses the listener, and `openPopup` requires a configured target. Whole-worker tests cover unavailable/throwing/rejected Shelf APIs, blocked/missing popup APIs, empty storage/no OAuth, storage failure, independent import failure, readiness ambiguity, slow/late resolution, rapid clicks, tab switches, two windows, restart/override restoration and preserved preference. DOM tests execute the actual recovery script without background messaging and verify popup closure precedes Retry Shelf. Static checks reject detached/window/tab/Options APIs in the automatic launcher. None is a substitute for a real toolbar gesture or visual screenshot.

The existing full suite remains baseline-failing; exact final counts and failure-name comparison are in the verification directory. No release, provider change, telemetry endpoint, future diagnostic API or historical evidence rewrite is included.

## Final local results

- Focused whole-worker/menu/recovery tests: **88 passed, zero failed**.
- Full `npm run reliability:check`: **709 passed, 71 failed names, incomplete**. The prior exact branch report had **700 passed, the same 71 failed names**; zero added or removed failures.
- Syntax, API registry and issue inventory pass. Existing Explorer architecture freshness fails; historical failure evidence is preserved.
- Local audit package builds with 79 runtime files. Existing release gates remain blocked; nothing was published.
- Installed/visual assertions: **zero**. The packaged Chromium attempt was unavailable as described above.

See [owner acceptance steps](ATTACHED_TOOLBAR_OWNER_CHECKLIST.md) and `verification/attached-toolbar/` for the final source fingerprints, command results, API excerpts and failure-name comparison. The full report's commit identifies the starting tree; its recorded file hashes match the final production/test sources before the correction commit.

## Current source anchors

- `extension/entry-bootstrap.js:17` — `function applyToolbarOpenMode`.
- `extension/entry-bootstrap.js:62` — `async function recoverAttached`.
- `extension/entry-bootstrap.js:104` — `function openToolbarInterface`.
- `extension/popup-recovery.js:8` — `Consume its tab-only override`.
- `extension/shelf.js:60` — `async function refreshPreference`.
