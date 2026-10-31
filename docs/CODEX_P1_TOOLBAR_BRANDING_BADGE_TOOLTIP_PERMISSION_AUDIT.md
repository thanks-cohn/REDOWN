# REDOWN P1/P0 UX — Remove False Toolbar Warning, Restore Clean Brand Icon, and Separate Chrome Site Permissions

**Repository:** `thanks-cohn/REDOWN`  
**Mandatory branch:** `codex/v3-parity-first-reconstruction`  
**Owner report:** 2026-10-31 — REDOWN appears fully functional, but the Chrome toolbar icon shows an exclamation indicator and its hover text resembles `Chrome accepted the shelf request; local readiness is unconfirmed. No second panel was opened.` followed by `Wants access to this site`. The warning seriously harms REDOWN branding.  
**Priority:** P1 visual trust regression; escalate to P0 if the exclamation originates from an actual permissions or launch failure.  
**Execution:** Inspect current installed/build sources, diagnose, implement narrow correction, test in real Chrome, document, commit, push. **Not documentation-only.**

## Owner's actual desired outcome
## PRIORITY OVERRIDE — MUST SHIP WITH THE V3 P0 SIMPLE MENU REPAIR (2026-10-31)

The owner explicitly requires this bug fixed **in the SAME Codex Work round** as `docs/CODEX_V3_P0_SIMPLE_CLOUDFLARE_AND_RIGHT_CLICK_FOUNDATION.md`. This page is the detailed supporting source/evidence checklist; its historical P1 label does NOT permit deferring the correction.

**Latest branding contract:** The REDOWN toolbar must NOT display an invented `!` warning or long internal diagnostic tooltip for accepted, pending, missing-handshake or late-successful Shelf requests. Even true launch failures should be explained through the existing accessible Shelf or native icon-attached pop-out/Health & Repair rather than publishing raw event codes on hover. Keep a concise brand-safe action title and true private local evidence. If a Chrome-controlled permission notice says `Wants access to this site`, do not assert the extension can suppress it; inspect scope and explain the browser's independent security UI without changing user consent.

**One click, one interface:** Shelf first; only on confirmed failure and where permitted, the **existing attached** action pop-out, never both/detached windows/tabs. Preserve legitimate temporary transfer feedback and precise diagnostic evidence. This is an **implementation request**, not a cosmetic documentation change.



**Normal healthy behavior:** REDOWN's original branded icon remains fully visible, clean, without a persistent exclamation/warning overlay, grey/error treatment, or developer text in the icon tooltip. Hover should use a short, friendly, accessible title such as `REDOWN — Your cloud companion` (owner-approved branding can be used). A successful or accepted Shelf launch is not an error.

**Real actionable failures:** Keep honest concise user feedback accessible in Shelf/mini-dashboard/Settings diagnostics, without exposing internal event/protocol phrasing in Chrome's tooltip. Do not suppress genuine Chrome permission/security indicators; do not request broad site access merely to remove Chrome's indicator.

**Opening behavior unchanged:** clicking the icon prefers the native REDOWN Shelf. When the Shelf cannot open, the only acceptable automatic fallback is **the existing compact REDOWN action pop-out anchored directly under the toolbar icon**, where supported by Chrome; **never** a detached popup window, unsolicited tab, or both surfaces. A cosmetic correction must not break the P0 first-run launcher.

## SOURCE-CONFIRMED CAUSE — NOT JUST A POSSIBLE BADGE (2026-10-31)

The exact owner-observed toolbar phrase **exists verbatim** in the current V3 source, `extension/entry-bootstrap.js`. Earlier searching only `extension/background.js` missed the imported first-run launcher, because `background.js:1` calls `importScripts("entry-bootstrap.js")`. Codex must treat this as a **confirmed REDOWN-authored false/error-state presentation defect**:

- `entry-bootstrap.js:56–61` defines `launchIndication(...)`, which changes the toolbar title via `chrome.action.setTitle({title})` and draws a **literal `!`** via `chrome.action.setBadgeText({text:'!'})`.
- `entry-bootstrap.js:124–129` calls `launchIndication(..., 'SHELF_READINESS_UNKNOWN', 'Chrome accepted the Shelf request; local readiness is unconfirmed. No second panel was opened.')` when `chrome.sidePanel.open()` resolved successfully but `verifyShelf()` could not establish a readiness handshake. This **does not prove Shelf failed**; it must never paint a failure icon or raw diagnostic tooltip.
- `entry-bootstrap.js:112–119` also starts a **2,500ms deadline** that sets `!` and a failure-like title for `SHELF_OPEN_PENDING` and increments `toolbarGeneration`. If Chrome opens the Shelf only after the timeout, the late success response is ignored by that generation check and may leave the false warning **stuck indefinitely**. Fix the lifecycle, not only the string.
- `entry-bootstrap.js:86–97` also uses a per-tab `!` badge/title on genuine attached-popup fallback failure. Preserve genuine actionable recovery signaling, but never allow a stale per-tab override to make an otherwise healthy icon look broken after later success. Resolve global vs tab-specific precedence and deterministic cleanup.
- `extension/shelf.js:118–123` listens for `redownShelfReady` and responds only when its actual Chrome window matches. A transient/non-delivered handshake is uncertain, not a confirmed failure. Audit the readiness implementation for real Chrome behavior and whether it can truthfully provide stronger evidence.
- Separately, `Wants access to this site` is a **Chrome-owned localization string** (`IDS_EXTENSIONS_WANTS_ACCESS_TO_SITE`), not the `entry-bootstrap.js` action title. Inspect permissions/site access and advise accurately without bypassing the browser's permission indication.

**Immediate code-change directive:** Remove the `SHELF_READINESS_UNKNOWN` and non-failure `SHELF_OPEN_PENDING` paths from warning-colored action title/badge presentation, restore normal icon/title when requests are accepted or resolve late, keep their detailed evidence locally in Diagnostics, and keep Shelf-first/no-dual-UI behavior unchanged. Do **not** simply mask `!` while leaving incorrect launch generations or pending state unbounded.

## Diagnosis — mandatory evidence before code edits

1. **Check the exact installed extension build and the first-run launcher.** The quoted message and literal `!` were **located in the current branch's `extension/entry-bootstrap.js`**, imported at the top of `extension/background.js`; the initial search limited to `background.js` missed it. Confirm the installed artifact matches the current branch before attributing the browser symptom definitively; compare SHA/version and test in real Chrome.
2. With user consent in a disposable Chrome profile, capture screenshot of the icon/exclamation and the full hover tooltip, Chrome version, exact tab URL category **without logging private URLs**, extension ID/build version and whether the Shelf actually rendered.
3. On the affected tab query safely: `chrome.action.getTitle({tabId})`, `chrome.action.getTitle({})`, `chrome.action.getBadgeText({tabId})`, `chrome.action.getBadgeText({})`, `chrome.action.getPopup({tabId})`, `chrome.action.isEnabled(tabId)`, and examine active tab-specific and global `setTitle`, `setBadgeText`, `setIcon`, `setBadgeBackgroundColor`, `setPopup` and launch-diagnostic paths. Read manifest `action.default_title`. Record redacted results.
4. **Identify the badge source explicitly:** (a) text/badge placed by REDOWN, (b) icon drawn/overlaid by REDOWN, (c) Chrome-controlled site access/permissions indicator, (d) other Chrome or policy indicator. The owner says everything works; no inference of actual error solely from `readiness unconfirmed`.
5. **Separate two tooltip owners.** `Chrome accepted the Shelf request; local readiness is unconfirmed. No second panel was opened.` is **confirmed REDOWN-authored** in `entry-bootstrap.js:126` and must not be customer-facing when the Shelf works. `Wants access to this site` is a localized **Chromium UI string** about site-access permissions, not a normal string REDOWN can remove using `setTitle`. Confirm Chrome's own UI in an actual browser.
6. Audit whether `activeTab`, `scripting`, `webNavigation`, and declared `host_permissions` materially cause Chrome's site-access state on common webpages, and whether each is genuinely necessary for existing REDOWN features. Chrome permissions are browser/user-controlled; **never disable security indicators, silently grant broader permissions, or strip required permissions just to hide a message**. If a permission is truly unused, propose/test removing it only after dependency audit.
7. Test Chrome site-access configurations `On click` / `On specific sites` / `On all sites` as user-controlled states, and compare Chrome-controlled tooltip lines. Do not change the user's permission choices automatically or suggest broad access as a branding hack.

Official Chrome references: https://developer.chrome.com/docs/extensions/reference/api/action ; https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions ; Chromium UI string `IDS_EXTENSIONS_WANTS_ACCESS_TO_SITE` (Chrome-owned).

## Narrow implementation — acceptance first

- Restore the expected branded action icon/tooltip in normal operation, including empty first-install state, no auth, success, Shelf request accepted, Shelf actually ready, and toolbar-attached popup recovery. Internal launch events and incomplete readiness instrumentation belong in **Diagnostics**, not the action title.
- **Unconfirmed local readiness is neither an error nor a request for permission.** Represent it as neutral/pending internally, not permanent `!` badge, red icon, or alarming tooltip. Only a *verified actionable* failure earns a visible error state; clear it deterministically when the condition resolves. Preserve accessible status elsewhere.
- Clear REDOWN-created false/stale badges using the supported action API and check per-tab overrides versus global state. Do not indiscriminately clear badges belonging to legitimate transfer progress; preserve transient SNES/odometer success/failure feedback if currently enabled.
- Make every transition deterministic across tab switches, worker suspension/restart, browser reopen, extension reload and fresh profile: no stale `!` stuck after Shelf successfully opens. A failed readiness ping must not keep the icon in error after Chrome accepted the opening and UI is available.
- If the `!` or `Wants access to this site` is Chrome-owned and reflects the user's site-access decision, **don't claim REDOWN can cosmetically erase it**. Document the honest platform boundary and seek a minimally permissioned design only if it preserves requested site-dependent functionality. Never deceive users about needed site permissions.
- No broad refactors, new opening surfaces, unsolicited windows/tabs or changes to cloud authorization. No code that suppresses browser permission prompts.

## Required real-browser regression matrix

1. **Fresh Chrome profile, no Cloudflare login:** REDOWN icon retains clean brand and friendly title, click opens Shelf or compliant attached pop-out, no invented error overlay.
2. **Shelf successfully renders:** no `!`, no `readiness unconfirmed` customer tooltip, no second panel.
3. **Side-panel open promise resolves without an observable readiness signal:** neutral status, not an alarming failure; no duplicate UI.
4. **Side-panel launch truly rejects:** compliant fallback/diagnostics; genuine error recoverable and cleared after success.
5. **Transfer success and real transfer failure:** existing intentional transient icon feedback still works and returns to branded steady state.
6. **Per-tab and global badge/title overrides:** stale badge and tooltip cleared; switch tabs, reload browser/extension, and verify.
7. **Chrome site access On click / specific / all:** distinguish Chrome native `Wants access` or warning badge from REDOWN-owned overlays. Never auto-grant or request unnecessary broader site access. Test on restricted pages too.
8. **Two windows/profiles and rapid clicks:** no duplicate UI, no uncontrolled badge/title flicker, no breaking right-click saving.
9. **Installed Chrome proof:** screenshot icon and complete hover tooltip before/after, test unmodified packaged extension vs corrected build, record exact Chrome/REDOWN versions and test evidence separately from mocks.

## Documentation and release decision

Document source-confirmed root causes and whether each visual component is authored by REDOWN or Chrome. Mark genuine Chrome-controlled access wording as an external permission indicator rather than pretending it can be hidden. Update `bugs/README.md`, `NEED_TO_DO/10312026.md` and a focused `FOREVER_WORKS/v3/` implementation report. Run appropriate focused and full reliability tests; no claim of installed-Chrome acceptance without it. Commit and push to required branch; preserve all protected checkpoints.

**One-line acceptance:** **Healthy REDOWN looks healthy. Its normal branded icon and title remain clean. Diagnostics stay inside Diagnostics. Real Chrome permission notices remain truthful. Shelf-first and icon-attached fallback behavior remain intact.**
