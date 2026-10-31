# REDOWN EMERGENCY P0 — Fresh Chrome Profile Toolbar Does Nothing: Root-Cause Investigation, Complete Failure Matrix, and Fail-Safe Launcher

**Repository:** `thanks-cohn/REDOWN`
**Mandatory branch:** `codex/v3-parity-first-reconstruction`
**Priority:** EMERGENCY P0 — release-blocking first-run failure
**Execution:** Inspect, reproduce, root-cause, implement, regression-test, document, commit, and push. **DO NOT STOP AT AN AUDIT.**
**Owner reproduction (2026-10-31):** Install REDOWN into a **brand-new Chrome browser profile**, then click the installed extension's toolbar icon. **Nothing visible happens.** The owner expects REDOWN Shelf to open on the first click; if Shelf cannot open, the compact REDOWN popup should provide an immediate usable fallback, not a dead icon. This is a genuine owner-observed failure; exact source cause, Chrome version, and installed build have **not** yet been established. Do not attribute it to a specific error without evidence.

## 1. Primary promise and acceptance

> **Every supported click of the enabled REDOWN toolbar icon must result in an accessible REDOWN interface or an explicit, actionable recovery path. Shelf first when selected and supported; compact Popup as the primary emergency alternative; local Shelf tab / Options as last-resort recovery. No invisible failure. No login required to open the interface.**

Prioritize the actual **first click** after a clean installation: empty `chrome.storage.local` / session state, no Cloudflare OAuth, no accounts or buckets, no prior `toolbarOpenMode`, no previously activated worker, no first-run preferences. The user should see REDOWN and a meaningful connect/onboarding action immediately. The Shelf or popup must render offline/local UI without waiting for Cloudflare discovery, menu registration, credentials, or endpoint health.

Preserve existing behavior for returning users who selected Popup or Shelf explicitly, never silently overwrite their saved preference during a fallback. A new browser profile must not depend on settings migrated from another profile.

## 2. Evidence already in source — verify, don't assume

1. `extension/manifest.json` currently declares an MV3 action with icons/title but **no `action.default_popup`**. It declares `side_panel.default_path: shelf.html`, which is not by itself proof that a toolbar click opens it.
2. `extension/background.js` near `applyToolbarOpenMode()` initializes the mode asynchronously from `chrome.storage.local.get('toolbarOpenMode')`, configures `chrome.sidePanel.setOptions`, and calls `chrome.action.setPopup({popup: mode === 'popup' ? 'popup.html' : ''})`. It calls this during worker evaluation, install, startup, and storage changes.
3. `openToolbarInterface(tab)` invokes `chrome.sidePanel.open({windowId:tab.windowId})` within `chrome.action.onClicked` and catches synchronous/rejected failures, then tries `chrome.tabs.create({url: chrome.runtime.getURL('shelf.html')})`, then `chrome.runtime.openOptionsPage()`. **This only helps if `onClicked` actually fires and the worker survives far enough to run the handler.** Existing fallback is Shelf-as-tab, **not the compact `popup.html`** requested by the owner.
4. `tests/entry-point-reliability.test.mjs` already exercises simulated synchronous/rejected/missing sidePanel API and tab/options recovery, but **does not prove a real first-time toolbar click on a clean installed Chrome profile**. Previous emergency handoff `FOREVER_WORKS/v3/P0_TOOLBAR_AND_CONTEXT_MENU_EMERGENCY_REPAIR.md` explicitly reports installed Chrome unavailable, zero real browser assertions. The source-patched incident was never accepted by a real fresh-profile run.
5. The current existing `extension/popup.html` + `popup.js` are present and contain a locally renderable interface. Inspect whether they are robust enough to serve as the first-run emergency fallback with no authentication or connection.
6. **Chrome API constraint:** When an action popup is configured, `chrome.action.onClicked` does **not** fire. `chrome.action.openPopup()` is available in Chrome 127+ but has contextual restrictions; `chrome.sidePanel.open()` needs a user gesture and valid context, while `chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true})` provides a Chrome-owned opening path. **Do not combine popup and onClicked behavior naively** or assume the API will let you open a popup after an arbitrarily delayed rejection. Verify actual supported behavior against official Chrome docs and real Chrome.

Official API references: https://developer.chrome.com/docs/extensions/reference/api/action and https://developer.chrome.com/docs/extensions/reference/api/sidePanel

## 3. Investigate EVERY meaningful route to a dead icon

Construct a **failure-mode matrix** with observed event timeline, the responsible code path, how it reproduces, recovery behavior, automated test ID, and actual Chrome evidence where available. At minimum cover:

- **Fresh-profile bootstrap:** empty, missing, malformed, delayed or rejected local/session storage; no OAuth; no existing windows/tabs, chrome://newtab, chrome://extensions, normal HTTPS pages; first click immediately after installing the unpacked/store-equivalent package.
- **Manifest/packaging:** mismatched packaged versus working-tree files, missing `shelf.html`, `popup.html`, scripts/CSS/icons, bad resource path, invalid action/panel declarations or CSP; wrong active build/version/extension ID; fresh profile extension disabled, unpinned (different from broken) or administratively blocked.
- **Worker lifecycle:** worker fails to parse/import, missing dependency, uncaught top-level exception, importScripts failure, startup race, worker sleeps/wakes, onInstalled/onStartup misinterpretation, competing event listeners, runtime suspend between click and open, outdated worker after update.
- **Toolbar API:** no `action.onClicked` delivery; popup configured so handler never fires; stray tab-specific/global `setPopup` override; `action.disable` / action settings; late `setPopup` call after user clicks; multiple asynchronous preference applications racing and ending in incorrect mode.
- **Panel API:** absent/disabled `sidePanel` permission or API, `sidePanel.setOptions` failure, missing default path, disabled tab-specific option, wrong window/tab ID, null `tab.windowId`, unsupported window context, `sidePanel.open` synchronous throw, promise rejection, apparent success with panel not rendered, user gesture lost after an `await`, Chrome native side-panel open-on-click behavior inconsistent with manual click.
- **Fallback API:** `chrome.action.openPopup` unavailable/rejected (and whether it can run during the original gesture), popup not configured, popup document or script fails to render, Chrome tab fallback rejected, Options fallback rejected, duplicate fallback windows/tabs, popup/tab and side panel both opening unexpectedly.
- **Rendering and connectivity:** Shelf/popup shows nothing because DOM script crashed, missing required element, unhandled startup rejection, indefinite loading shell, no Cloudflare token, login errors, offline mode, accounts/bucket inventory failure, failed context-menu registration, stale persisted defaults. Verify the UI shell remains usable with no connection and that failed network checks do not block first paint.
- **Profile and restart state:** two profiles with different settings, extension reload, browser relaunch, service-worker forced stop, first install and reinstallation after old extension data, pinned/unpinned action, browser extension settings/policy; do not rely on other profile's cookies, permissions, cached state or OAuth.

Separate **application bugs** from Chrome-disabled extensions/policy restrictions or unsupported browser contexts, where REDOWN cannot override Chrome. In the latter case, document real restrictions and provide the best supported user action without pretending extension code can force Chrome UI to appear.

## 4. Implement the actual emergency launcher

**A. First paint is sacred.** The UI launcher depends only on packaged local extension assets and a valid toolbar gesture. **Do not await** storage, auth, account lists, worker provisioning, context menus, analytics, or folder enumeration before establishing a reliable access path. On a clean install the user sees useful REDOWN onboarding whether logged in or not.

**B. Shelf first, then Popup, then local recovery.** Use Chrome-supported native action/side-panel APIs, a minimal deterministic bootstrap and a small single-owner state machine. Discover and choose a **proven** configuration that can actually guarantee the fallback on the first click across supported Chrome versions. Preferred order: Shelf in the selected window → compact `popup.html` if the API and gesture allow → existing local `shelf.html` tab → `options.html` with a recovery explanation. If same-click popup is technically unavailable, make that limitation explicit, build the strongest possible first-click local fallback, and arrange popup safely for subsequent clicks without silently changing the user's permanent preference. Do **not** claim guaranteed same-click popup fallback without installed-Chrome proof. Preserve Popup-mode users' native action popup as their first choice.

**C. No recursion or false success.** Avoid a fallback triggered by a fallback, infinite new tabs, unsolicited popups, notification spam or panel/popup both opening. A click may resolve to one visible outcome. Treat a resolved `sidePanel.open` as an API acknowledgement, not proof of a rendered usable Shelf; verify actual UI for acceptance. Handle cases where popup and onClicked are mutually exclusive. Never swallow a failed opening with `console.warn` alone.

**D. Recoverability from early worker faults.** Challenge whether the handler can fail before registration; isolate essential toolbar bootstrap from large imported modules and provider/menu initialization without creating a second contradictory launcher. Compare Chrome-managed `setPanelBehavior` vs `action.onClicked` vs manifest-declared popup fail-safe. If one has an unrecoverable startup window, design a supported bootstrap that is demonstrably less fragile. Do not patch by arbitrarily retrying the same rejected API call or pretending a manifest popup and action listener will both execute.

**E. Transparent and private diagnostics.** Add tiny bounded launch receipts: event received, opening mode, chosen window, side-panel configured/attempted/accepted/failed, popup attempted/failed, tab fallback attempted/failed, UI ready acknowledged when observable, and Chrome error category. Include timestamp, Chrome version, extension build version and no secrets. Make the evidence accessible via an emergency local interface / Options or a safe **Copy Launch Diagnostics** control when feasible. No silent remote transmission; no private paths, tokens, user URLs or account IDs in logs. When Chrome blocks all opening APIs, record the failure and provide an actionable recovery route if a Chrome-owned UI is reachable; do not claim fully automatic recovery when no event/API is delivered.

**F. Preserve appearance and features.** Reuse existing Shelf and popup, retain their theme, odometer, Settings, Home, History and connections. Preserve V3-only menu engine, existing cloud activation and transfer paths, protected checkpoints, and current user preferences. Do not redesign Shelf or add external servers or new libraries without demonstrated need. Ensure reliable keyboard/mouse opening, accessible failure/repair copy, reduced motion and focus.

## 5. Acceptance evidence — required, not optional

Execute a fresh-profile end-to-end test **with the real installed extension** on a supported Chrome build whenever the runner permits. A simulated `chrome.action.onClicked` call alone does not test the first-click contract. Where Chrome installation is blocked, write an explicit blocked evidence record, preserve a manual reproduction script for the owner and **do not mark emergency resolved**.

Minimum actual-browser test sequence:

1. Create new disposable Chrome profile with no REDOWN state. Install exact built extension artifact and record exact extension ID/version/Chrome version/manifest hash. Do not sign into Cloudflare.
2. Immediately click the **real extension toolbar icon** once: Shelf appears and renders local controls. If side-panel path is deliberately failed, verify the approved same-click popup fallback where technically supported, otherwise a visibly useful local tab and a functional Popup recovery on the next click. Never a blank nothing.
3. Test actual Popup-mode preference and reload: native popup opens on each click; switching to Shelf takes effect deterministically without tab-specific overrides lingering.
4. Inject and verify: `sidePanel.setOptions` rejects; `sidePanel.open` synchronously throws, rejects, is missing, or reports success but UI fails to paint; `action.setPopup` rejects/returns late; missing/null `windowId`; absent local/session storage; invalid persisted preference; worker import/initialization failure; popup script/render failure; options/tab fallback failures.
5. Simulate or force worker suspension, browser restart, extension update/reload, first click on `chrome://newtab` and regular HTTPS page, two browser windows and two different Chrome profiles; no duplicated UI or wrong-window routing.
6. With no auth, use connect/onboarding. With valid auth, verify existing Shelf functions and native right-click transfer unchanged. Recheck the previously reported no-toolbar/no-native-menu combined incident and ensure menu failure does not prevent UI opening.
7. Add a permanent clean-install smoke test to release/packaging checks, plus deterministic unit + integration tests that run **actual background source with imports**, simulate event suppression when a popup exists, and assert exactly one observable fallback. Test user gesture semantics with installed Chrome, not just mocks.
8. Capture exact observed before/after results, screenshots or short screen capture, Chrome event traces and safe diagnostics. Verify accessibility and first-paint with slow/offline network and no credentials. Track original trigger confidence separately from discovered secondary weaknesses.

**Ship gate:** Block release until fresh-profile first-click behavior is accepted in installed Chrome or explicitly disclosed as unverified; no source-only 'all tests pass' report may claim closure of the actual installed-browser incident.

## 6. Delivery

Read `AGENTS.md`, `FOREVER_WORKS/v3/HANDOFF_LATEST.md`, `FOREVER_WORKS/v3/P0_TOOLBAR_AND_CONTEXT_MENU_EMERGENCY_REPAIR.md`, `NEED_TO_DO/10312026.md`, current `extension/background.js`, `extension/manifest.json`, `extension/shelf.html`, `extension/shelf.js`, `extension/popup.html`, `extension/popup.js`, `tests/entry-point-reliability.test.mjs` and packaging/test helpers. Perform full causal analysis before editing. Implement the minimum reliable and auditable change; test with real Chrome if available; document incident evidence in `FOREVER_WORKS/v3/`, update `bugs/README.md` and `NEED_TO_DO/10312026.md`, run focused tests and `npm run reliability:check`, then commit and push to the mandatory branch. Keep protected tags unchanged.

**Owner's final acceptance:** *A stranger installs REDOWN into a brand-new Chrome profile, clicks the icon, and REDOWN actually appears—Shelf if possible, popup/recovery interface otherwise. A missing login or one broken subsystem never leaves a dead icon.*
