# Take the Tour handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `080881a166a8cd7c347be41795c57c2ebd22d6f2`.
The pushed delivery commit includes this handoff; its SHA appears in the delivery response.

**BUILT and LOCALLY TESTED with fixtures. Rendered Chrome and live R2 acceptance remain UNVERIFIED.**

## Delivered

- Header **☰ Explorer menu → Take the Tour** starts or cleanly restarts the walkthrough. The menu closes on launch, outside click or menu Escape. Connection is not required.
- A small optional first-visit welcome offers **Take the Tour**, **Not Now** and X. Dismissal/start and completion are remembered under `betaExplorerTour`; completion includes a timestamp. No file data, auth information or unfinished-step position is persisted. No automatic resume.
- Fifteen cards cover welcome, connection, accounts, bucket opening, files/folders, selection, sort/views, Refresh, operations, transfers, preview modes, preview controls/lightbox, destinations/TRUE REMOTE, preferences/help and completion.
- Five exercises unlock Next only after the relevant existing handler reports an action: successful bucket-root navigation, actual file selection, changed List/Grid view, successful Refresh and supported preview creation/presentation. An ordinary unrelated click does not complete an exercise. Every exercise has **Skip**, including disconnected/empty/error cases. These signals are tutorial acknowledgements, not diagnostic/provider verification.
- **Every card has X. X ends the entire tour immediately**, without confirmation, follow-up or restart. Exit removes the card/highlight, disconnects the observer, unregisters tour listeners and cancels pending animation-frame positioning. It leaves Explorer selection, session, files and preview state alone. Back, Next, Skip and Finish share this lifecycle. Escape exits only from tour focus; it does not cancel an underlying native dialog. Focus returns to a valid prior target or the menu/active dialog.
- Crimson outlines and compact nonmodal cards keep the real controls operable. Positioning prefers space beside/above/below targets, clamps to the viewport, reacts to scroll/resize/DOM changes, and moves the card inside an active dialog so native modality does not make the tour inert. Large surfaces and constrained windows use a clamped corner fallback; pixel-level overlap acceptance remains outstanding.
- `guided-interaction.mjs` is the reusable presentation/navigation lifecycle; `tour.mjs` owns tour content, invitation, persistence and menu. Application-local action signals contain only action names. **Test It, diagnostic logging, JSON exports, exercise generation and cloud mutation automation were not implemented.**

## Files changed

`extension/beta/guided-interaction.mjs`, `extension/beta/tour.mjs`, `extension/beta/explorer.html`, `extension/beta/explorer.css`, `extension/beta/explorer.mjs`, `tests/beta-explorer.test.mjs`, `scripts/syntax-targets.json`, `docs/beta/HANDOFF.md`.

## Verification and limits

- Focused Beta/API/auth/reconnect/copy command: **104 passed, 0 failed**, including **70 Beta tests**. Five new fixture tests cover invitation persistence, menu/restart, X on all 15 steps, Back/Next/Skip, intended-action recognition, disconnected/no-bucket navigation, completion, Escape with preview preserved, no unsolicited file mutations, and narrow viewport coordinate bounds.
- Full `npm test`: **445 tests, 435 passed, 10 failed**. Clean starting-commit archive with the same dependencies: **440 tests, 430 passed, 10 failed**. The ten failure names match the baseline; no frozen evidence or assertions were relaxed.
- Syntax checks include both new modules and pass. `npm run reliability:check` remains failed for pre-existing architecture freshness and full-suite baseline failures.
- Playwright launch: **BLOCKED**, Chromium executable absent. jsdom viewport assertions do not prove rendered geometry, native hit targets, actual focus behavior or screen-reader output. Desktop/laptop/narrow visual acceptance remains to be performed.
- **Live Cloudflare R2: NOT TESTED.** Tutorial exercises use existing user-invoked browsing/preview reads; the tour initiates no provisioning, authentication, upload, download or destructive action. Preview recognition is not evidence of browser decoding or provider acceptance.
- Existing Window/Side Preview and file-selection/context-menu regressions pass. Main, Legacy, Worker provisioning, authentication, transfer limits and API contracts remain unchanged.

Next acceptance: in installed Chrome, accept/decline the invitation, restart through ☰, exercise available reads, exit with X at different steps and from Preview, then verify desktop/narrow card placement and ordinary Explorer interaction. Earlier handoffs below are historical.

---

# Window navigation and image lightbox, October 27, 2026

Branch: **beta-explorer**. Starting commit: `ee63a0904a0eaec3dcf4becf9d40f04c6cd66c0c`.
The delivery commit includes this handoff; its SHA is supplied in the delivery response.

**Implemented and locally tested with fixtures. Browser rendering, installed Chrome and live R2 remain UNVERIFIED.**

- Window Left/Right and existing Previous/Next follow the visible sort/filter, skip folders and unsupported formats, and stop at boundaries. Opening focuses the dialog, so arrows work immediately. Editable/media controls retain their keys; underlying Explorer shortcuts stay behind the modal and resume after closing.
- A square **Open image lightbox** button sits immediately left of X, hidden for non-images and Side Preview, disabled while an image is unavailable.
- Lightbox uses the same dialog, image node and object URL. Its viewport-sized dark presentation hides the header, metadata, controls and borders. Intrinsic image sizing with viewport maxima preserves aspect ratio, avoids unnecessary small-image enlargement and fits without cropping or ordinary scrollbars. No Fullscreen permission or additional read is needed to enter/exit.
- Lightbox arrows traverse images only. First Escape or backdrop click returns to ordinary Window Preview with the current image; second Escape closes. Image clicks do not exit. Native dialog cancellation is handled separately. Loading stays dark; a failed/corrupt image returns to the ordinary error view.
- Existing cancellation/generation checks, bounded reads, media unloading and URL cleanup remain shared. Rapid navigation invalidates old reads and revokes late URLs. Bucket/account/folder/session changes invalidate the same preview. Side mode persistence, resize, minimize, expand, selection updates and formats remain intact.

Changed files: `extension/beta/explorer.html`, `extension/beta/explorer.css`, `extension/beta/explorer.mjs`, `tests/beta-explorer.test.mjs`, `docs/beta/HANDOFF.md`. Main, Legacy, authentication and the universal API were not modified.

## Verification

- Focused Beta/auth/API/copy regressions: **99 passed, 0 failed**, including **65 Beta tests**. Three added interaction regressions cover ordering/filter/boundaries/editable controls/focus, lightbox node/URL reuse and exits, and rapid delayed responses/abort/URL cleanup. Existing dual-mode and file-operation regressions pass.
- Full `npm test`: **440 tests, 430 passed, 10 failed**. Clean starting-commit archive using the same dependencies: **437 tests, 427 passed, 10 failed**. Failure names match the existing ten recorded below; no assertions or frozen hashes were relaxed.
- Syntax, registry validation and issue inventory pass. `npm run reliability:check` remains failed for existing architecture freshness and baseline failures.
- Playwright launch attempted: **BLOCKED**, Chromium executable absent. No desktop/narrow rendering, landscape/portrait/small/wide image decoding, native Chrome focus/keyboard behavior, PDF/codec playback or installed-extension claims are made from jsdom fixtures.
- Live Cloudflare R2: **NOT TESTED**. No cloud mutation, provisioning, deployment or release promotion.

Remaining acceptance: run the requested image shapes and desktop/narrow layouts in installed Chrome against authorized R2 files; verify actual decoding, backdrop hit targets, two-level Escape and immediate keyboard focus. Embedded PDF viewers can own keyboard events inside their document; native browser handling still needs acceptance. Navigation covers currently loaded, filtered entries, without fetching more pages. Earlier handoffs below are historical.

---

# Dual-mode Preview handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `f6f4713d0adeb837ce83773d4f9388f33a26e9a7`.
The delivery commit includes this handoff and verification JSON. Its SHA is in the delivery response and resolves at the branch head.

**BUILT and LOCALLY TESTED with fixtures. Rendered-browser, installed-Chrome and live-R2 acceptance remain UNVERIFIED.** This section supersedes historical statements below that docked preview is deferred. The bucket navigation and Refresh fixes remain present. Main, Legacy, authentication, adapter/API contracts and production defaults are unchanged.

## Exact files changed

- `extension/beta/explorer.html`: Preview mode selector, dock host, accessible divider, shared viewer and pane controls. An inline selector also allows switching out of the modal without closing the loaded viewer.
- `extension/beta/explorer.css`: crimson/white dock layout, constrained list/pane widths, compact minimized header, full-height expansion, container-responsive rows and stacked narrow-window layout.
- `extension/beta/explorer.mjs`: shared viewer presentation, persistent mode/width, selection-driven reads, independent cancellation/generation checks, metadata/fallbacks and cleanup.
- `tests/beta-explorer.test.mjs`: ten additional local interaction/lifecycle regressions; the original preview assertion now waits for the loaded text because the dialog visibly opens during loading.
- `scripts/beta-explorer-preview.mjs`: extended normal-webpage Playwright fixture for image decoding, mode switches, pane controls, actual pointer drag and four viewport widths. **Prepared, syntax checked, but browser execution BLOCKED.**
- `docs/beta/HANDOFF.md` and `docs/beta/DUAL_PREVIEW_VERIFICATION-2026-10-27.json`: scope, results, remaining acceptance and unchanged baseline failures.

## Implemented behavior and fixture verification

**Window Preview** remains the default. Toolbar Preview, supported-file double-click and context-menu Preview use the chosen mode. The original image, PDF iframe, safe text/code, video/audio controls, metadata and previous/next paths remain in one shared renderer. Loading is visible inside the preview; failures stay inside it and offer Download. This is DOM/API fixture verification, not browser PDF decoding or codec playback proof.

**Side Preview** uses the same viewer DOM, object URL and universal API operation. Selecting a different file updates the pane without locking navigation or file operations. Selection of a folder shows its prefix; unsupported files show metadata and Download without attempting an unsupported preview read. Multiple/empty selection shows an appropriate placeholder. Closed panes stay closed until Preview is used again.

Mode and preferred width persist under `betaExplorerPreview` in local extension storage. Switching modes moves the existing loaded viewer and does not reread the object. The selector remains available inside the modal. Minimize pauses media and retains the current DOM/URL; Preview restores it without another read if selection/content is unchanged. Close stops/unloads media, releases the URL and returns space to the list; reopening rereads intentionally because closed content was released. Expand/restore changes the workspace viewing height and retains width. The divider uses pointer capture and also supports arrows/Home/End; normal bounds leave at least 280px for each area and cap preferred pane width at 720px.

At viewport widths up to 1150px, the pane stacks below a scrollable file list rather than squeezing rows; horizontal resizing is intentionally hidden there. Expanded narrow preview scrolls into view at viewport height. Desktop expanded mode preserves both the list and divider. These layout rules are implemented; actual desktop/laptop/narrow rendering and hit-target acceptance still need a browser.

Preview requests use their own AbortController and generation, independent of mutation busy state. Obsolete successes/failures cannot repaint a different selection, and late URLs are revoked. Bucket/account/folder changes, deleted selections, auth invalidation and page exit invalidate preview state. Shared API memory budgets, bounded reads and explicit text truncation remain unchanged. Corrupt image/media error events produce an inline fallback. Browser PDF-plugin errors may not dispatch an iframe error event, so native PDF error UI is still possible.

## Verification

**Focused: 96 passed, 0 failed (62 Beta tests). Full suite: 437 tests, 427 passed, 10 failed. Starting commit: 427 tests, 417 passed, the same 10 failure names.** Verification details are recorded in `DUAL_PREVIEW_VERIFICATION-2026-10-27.json`.

- Focused command: `node --test tests/beta-explorer.test.mjs tests/cloudflare-api.test.mjs tests/cloudflare-login.test.mjs tests/cloudflare-reconnect.test.mjs tests/explorer-copy.test.mjs`.
- Full suite is exercised by `npm run reliability:check`, using the repository's existing test reporter. Syntax, registry and issue checks are included. The gate remains failed for existing architecture freshness and baseline failures; no frozen hashes, assertions or allowlists were relaxed.
- Starting commit was extracted with `git archive` and tested with the same installed dependencies to compare failure names independently.
- Browser fixture command: `REDOWN_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node scripts/beta-explorer-preview.mjs`.
- Browser fixture is **BLOCKED before any assertions**: Playwright Chromium executable absent. Browser installation was attempted; download returned invalid/truncated archives. No rendering, viewport, pixel, native drag or codec pass is claimed.
- `node scripts/installed-chrome.mjs extension /tmp/redown-dual-chrome.json`: **BLOCKED**, `CHROME_NOT_AVAILABLE_ENOENT`; zero installed assertions.
- Live R2: **NOT TESTED**. No authenticated installed extension/provider context was available. No live cloud writes, provisioning, repair or deployment occurred.

Local tests cover both mode render paths, no-reread switching, saved settings, side selection, context Preview, double-click, previous/next, minimize/reopen, close/reopen, expand/restore, divider handler bounds/persistence and keyboard control, obsolete reads/failures, URL cleanup/media unloading, explicit truncation, failed/corrupt/unsupported previews, bucket/logout invalidation, and file operations/Refresh/deleted-selection pruning with a pane open. Existing bucket A/B/A, auth, API, large-transfer and Worker operation tests remain included.

## Remaining acceptance and highest-value next task

**Run the installed Chrome/live-R2 dual-preview acceptance below before declaring Milestone 2 complete.** Reuse the owner's existing signed-in extension, without changing production defaults.

1. Open a real R2 image in Window Preview using Preview, double-click and context Preview. Verify actual pixels, metadata, loading, previous/next and close/Escape.
2. Switch to Side Preview inside the modal. Verify it docks and preserves the loaded content without another object GET. Select another image; rapidly alternate files and buckets and confirm no stale content.
3. Minimize, then reopen with Preview; close, then reopen again. Expand/restore. Drag the divider and try its keyboard controls. Reopen Beta and confirm selected mode/width persistence. Check a changed selection while minimized.
4. Exercise actual PDF, text/code including truncated large text, video and audio. Confirm playback stops on selection change/minimize/close. Include damaged and unsupported files; check inline metadata/Download and budget failures without navigation disruption.
5. Test 1440px desktop, 1024px laptop, 768px and 390px narrow windows. Verify scrolling, list readability, side stacking, full-height expansion, file context menu and controls. The prepared Playwright fixture covers these widths once Chromium is available.
6. Repeat 1234 → 12345 → 1234 and Refresh within a folder. Confirm previews clear on bucket changes and file operations still work. Use a separately approved disposable prefix for live writes; independently verify bytes when testing transfers.

No local regression failure was introduced relative to the starting commit. Actual browser layout/playback and live R2 behavior are outstanding limitations, not passes. Exhaustive parity, Guided Testing, S3 expansion, multipart transfers and release promotion remain outside this change.

---

# Bucket navigation and Refresh handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `266a391bf4be6ea82b007bbe87632042272a59df`.
The delivery commit contains this handoff; obtain its exact SHA with `git rev-parse HEAD` or the delivery response.

**BUILT and LOCALLY TESTED. Installed-Chrome/live-R2 acceptance remains UNVERIFIED.**
This update supersedes the Refresh behavior described in the historical handoff below.
Legacy remains the unchanged default, and main was not modified.

## Exact files changed

- `extension/beta/explorer.mjs`: bucket/account navigation state, stale-response protection, same-location Refresh, error classification and stale-list interaction guards.
- `extension/beta/r2-adapter.mjs`: Legacy-compatible response envelopes, provider error details/redaction and continuation-token validation.
- `tests/beta-explorer.test.mjs`: eight additional regression tests and updated Refresh expectations; a small fixture hook captures API download routing.
- `docs/beta/HANDOFF.md`: this delivery record.

## Fixes and Legacy comparison

The empty-cursor correction `266a391` is the starting HEAD and remains present: the first request omits `cursor`; subsequent pages preserve opaque returned tokens. The existing 1,000-object page size and pagination workflow were not changed.

Legacy `background.js:listObjectsPage` conditionally includes prefix/cursor/delimiter, accepts array/nested/top-level object envelopes and reads folders/cursors from result or result_info. Beta now follows that parsing behavior, including top-level objects it previously rejected. Provider failures now retain HTTP status plus Cloudflare code/message, so 10023 is visible rather than hidden behind a generic HTTP 400. Bearer values, URL strings and labeled credentials are redacted from provider error messages.

Legacy `options.js:browseWorkspace` snapshots the location and rejects stale generations. Beta retains its existing listing epoch and now also prevents superseded navigation from saving its location or changing completion feedback. Buckets remain clickable during a read, allowing a newer choice to take precedence. Account changes immediately invalidate the previous listing and clear old sidebar controls. History navigation paints the correct account and bucket sidebar. Clicking a bucket clears the previous rows, selection, filter and continuation token before loading its root.

Legacy bucket tiles ultimately select a target and call `goLocation`; their circular repair targets also perform explicit preparation. Beta adapts the target/context and generation behavior, while leaving Worker provisioning behind the existing explicitly confirmed setup action. No Legacy source was edited, and provisioning is not a prerequisite for browsing.

The single top Refresh now reads the current account/bucket/prefix directly through the existing universal API. It retains history, clipboard, filter and surviving selections, updates metadata, removes vanished selections and clears the attention indicator after success. It does not enumerate accounts/buckets or probe Worker readiness for an ordinary successful reload. No current selection triggers discovery; HTTP 401/404 during refresh triggers recovery discovery. Other failures retain the location and actionable errors. Missing Worker setup continues to block mutations honestly, while successful browsing can clear the listing attention indicator. Failed/loading listings block stale-row file interactions.

An added expired-auth test also exposed an existing classification bug: “Reconnect Cloudflare” matched the old disconnected regex before the HTTP 401/expired-auth check. Authorization errors now retain the proper authorization state.

## Actual verification

- Focused command: `node --test tests/beta-explorer.test.mjs tests/cloudflare-api.test.mjs tests/cloudflare-login.test.mjs tests/cloudflare-reconnect.test.mjs tests/explorer-copy.test.mjs`: **86 passed, 0 failed**, including **52 Beta tests**.
- Final full `npm test`: **427 tests, 417 passed, 10 failed**.
- Clean starting-commit archive with the same installed dependencies: **419 tests, 409 passed, 10 failed**. Failure names match exactly; no new failure names.
- Syntax, API registry and issue inventory pass. `npm run reliability:check` remains failed because architecture freshness and the existing full-suite failures are not release-green. Frozen hashes/assertions/allowlists were not changed.
- Installed-Chrome attempt: `node scripts/installed-chrome.mjs extension /tmp/redown-chrome.json`: **BLOCKED**, `CHROME_NOT_AVAILABLE_ENOENT`; zero installed assertions executed.
- Live R2: **NOT TESTED**. No authenticated installed-extension context or live R2 credential was available to this checkout. No cloud mutation, repair or deployment was performed.

New local GUI/adapter coverage includes distinct 1234/12345 object sets, A/B/A switching, folder refresh, history after refresh, selection and context-menu Download routing, delayed success/failure isolation, actual fixture-empty results, HTTP 400/403/401, network failure, expired-auth recovery, session invalidation during a read, metadata replacement/deleted selections, and all three Legacy listing envelopes with opaque continuation tokens. Existing local fixture operation tests still exercise uploads, copy/move/rename/delete and the embedded production Worker. These are fixtures, not installed/provider proof.

The ten unchanged full-suite failure names are:

1. offline discovery advertises only implemented operations and distinct versions
2. catalog IDs, evidence labels, source hashes and references are internally consistent
3. real discovery, case, history, filters and validation are deterministic and honest
4. original case and proposal Markdown bytes are retained from pinned upstream
5. current architecture references resolve and imported CLI operates outside checkout without executing arbitrary input
6. explicit labels are recorded as partly addressed while the omitted-item report stays open
7. Nested drag-handle keyboard move saves sibling order with descendants and paths intact
8. successful provisioning refreshes destination editors and inventory before reporting ready
9. real vertical contract resolves intent, three upload invariants, handlers, current source and regression
10. full finite public coverage inventory resolves strata and all canonical case links

## Remaining limitations and next action

The owner's live incident is not independently reproduced or certified fixed here. Reuse the existing signed-in Chrome installation to open 1234, 12345, then 1234; confirm the provider's actual contents each time. Open a nested folder and Refresh, confirm the path and metadata remain correct, then select a real file and check its context operations. Exercise a valid paginated bucket and an empty bucket. Record exact provider errors if any remain. Use a separately approved disposable prefix for write-operation acceptance.

That installed-Chrome/live-R2 navigation test is the highest-priority next action. No exhaustive parity audit, Guided Testing, Preview pane, provider expansion or release promotion was started. Existing direct-upload limits and unfinished folder-download/durable-recovery capabilities remain as described below.

---

# Beta Explorer handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `44f8505648b9b1008d93999a17ce3efbe9627a67`.

**Implementation commit: `9c06ce16896fd69e5ba9e177964501e1010cf218`.** The subsequent documentation commit contains this handoff and the verification record. Its final delivery SHA is provided in the delivery message and resolves through the branch head.

Status: **BUILT and LOCALLY TESTED. Milestone 1 live acceptance is UNVERIFIED.** No release, default-interface change, main update, deployment or live cloud mutation was performed. Original Explorer remains the default. This session implements the immediate roadmap, not the later parity inventory, Guided Testing system or docked Preview pane.

## What works in local product-path tests

- Existing shared Cloudflare authentication is reused. Beta discovers accounts and buckets automatically, including accounts beyond the first. A sole accessible bucket opens immediately; multiple buckets appear as direct sidebar choices.
- Successfully visited bucket/folder locations persist under `betaExplorerLocation`. Startup validates bucket accessibility before restoration. Removed saved folders fall back to the live bucket root; inaccessible saved buckets do not block available choices.
- The existing adapter lists actual Cloudflare REST objects when used in an authenticated installed extension. No simulated objects or new file engine were added to the product.
- Existing GUI selection, multi-selection, folder double-click, supported preview, clipboard, duplicate, rename, copy/move destinations, delete, upload, folder upload, dropped files/folders, download, properties, navigation/history/breadcrumbs, sort/filter and keyboard paths remain routed through the same universal API.
- A new GUI-driven 51 MiB fixture test uploads a File, checks stored bytes independently with SHA-256, renames, duplicates, cuts/pastes into a nested folder, checks bytes again, receives simulated Chrome download completion, and deletes the disposable copy. The original stays intact.
- Context menus omit unavailable commands. Unsupported preview formats offer Download; double-click downloads those files instead of advertising a nonexistent inline viewer. Existing ZIP/CBZ and supported preview behavior is preserved.
- Mutations refresh the visible list and retain their outcome message. Listing/loading/empty/disconnected/authorization/failure states are distinct; failed folder reads do not masquerade as empty folders.

## Intelligent Refresh and explicit setup

Refresh remains usable without a selected bucket. It refreshes live account/bucket discovery, restores a still-accessible location, reloads file contents, and reads Worker capabilities for the selected bucket. It identifies partial account discovery, auth/listing and Worker readiness failures. An outlined attention state points to intervention.

Browsing needs no Worker initialization. File changes require a ready safe-transfer Worker. Missing or obsolete setup produces an actionable message pointing to the existing **Set up right-click destination** button. That button still requires explicit confirmation and invokes the original provisioning service. Original advanced settings and Simple/Nested menu configuration remain available through the sidebar link.

`connectionStatus` is one additional read operation on the existing API. It reads saved profiles internally, checks the production Worker capabilities contract, and returns only readiness/reason, never credentials.

A small additive background-service change honors Beta's `betaNoProvision` flag. Beta copy/move/rename/delete/mkdir, archive operations and TRUE REMOTE refuse implicit Worker provisioning. A Worker 401 after readiness does not trigger repair/replay for these Beta calls. **Legacy calls omit the flag and retain their existing defaults.** This shared-file change is necessary to enforce the requested infrastructure safety boundary, not a replacement transfer implementation.

## Verification

| Check | Result | Evidence scope |
| --- | --- | --- |
| Beta tests | 45 passed, 0 failed | jsdom GUI and provider/Worker fixtures |
| Focused Beta, copy, Worker, auth/session/reconnect tests | 109 passed, 0 failed | local fixtures |
| Full suite | 419 tests: 409 passed, 10 failed | local repository |
| Starting-commit full suite | 408 tests: 398 passed, same 10 failure names | clean git-archive baseline, same dependencies |
| Syntax, API registry, issue inventory | passed | local checks |
| Architecture/reliability gate | failed | architecture already partial on baseline; stored allowlist recognizes only 7 of the 10 baseline test failures |
| Installed extension | BLOCKED | `CHROME_NOT_AVAILABLE_ENOENT`, no Chrome executable |
| Live R2 and original installed Chrome TRUE REMOTE | UNVERIFIED | no authenticated installed extension or approved disposable namespace available |

The full suite is **not green**. No failing assertions, frozen historical hashes or regression allowlists were relaxed. Exact failure names, scoped commands, source SHA-256 values and the blocked Chrome attempt are recorded in [MILESTONE1-VERIFICATION-2026-10-27.json](MILESTONE1-VERIFICATION-2026-10-27.json).

The local fixture exercises the actual embedded production Worker. It does not prove Cloudflare permissions, installed-extension UI behavior, downloaded disk contents or production memory use. Chrome downloads are simulated. No live access, deployment or live SHA-256 pass is claimed.

## Remaining work and restrictions

- Owner-installed Chrome must demonstrate login/discovery, real files, navigation and the full disposable-object lifecycle. This is the outstanding Milestone 1 exit gate.
- Existing direct local-upload route still limits files to **300,000,000 bytes**. Existing Worker TRUE REMOTE limits/deadlines remain in force. No multipart or unrestricted-size claim is made; pagination is unchanged.
- Folder downloads, preserving empty dropped directories and durable transfer recovery remain incomplete. Filtering covers loaded items; it is not a new recursive search implementation.
- A saved empty R2 folder is recognized through its existing marker objects. R2 has no native empty directories.
- Full Legacy-versus-Beta parity, the complete right-side Preview pane and Guided Testing remain deferred.

## Owner action and next highest-value task

Load this branch in an approved Chrome extension environment and use the existing Cloudflare login. Beta should open the last accessible location or sole bucket automatically. If writes need setup, confirm the existing destination setup button for the intended bucket.

Use an explicitly disposable prefix in an owner-approved R2 bucket. Upload the existing 51 MiB case, independently download/read it and compare SHA-256, then rename, duplicate, move to a nested folder, download and compare again, delete only the disposable objects, and Refresh to confirm provider state. Separately exercise the original Chrome right-click TRUE REMOTE path with an approved URL. Capture actual errors if anything fails.

**Next highest-value task:** execute that installed-Chrome/live-R2 acceptance workflow and fix any observed product-path failures before beginning Milestone 2. The implementation is not promoted to the default.

Publication uses the connected GitHub Git-data API because terminal push lacks credentials. Updates use an expected-head lease, without force. Local and published Git trees are compared before delivery.
