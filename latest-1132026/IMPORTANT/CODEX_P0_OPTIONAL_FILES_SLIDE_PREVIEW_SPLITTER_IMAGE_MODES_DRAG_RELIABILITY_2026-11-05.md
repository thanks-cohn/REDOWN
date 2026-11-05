# REDOWN — Codex P0: Optional Files Slide-Up, Full-Range Splitter, Responsive Image Modes, Preview Maximize, and Drag/Drop Reliability

**Owner directive:** November 5, 2026  
**Repository:** thanks-cohn/REDOWN  
**Priority:** P0 for broken drag/drop; focused Shelf usability improvements  
**Execution:** Implement on a dedicated feature branch and open a PR. Do NOT merge to main, release, publish, deploy, or mutate real user cloud data without explicit authorization.  
**Status:** Complete owner-authored implementation specification; NOT a claim of implemented functionality or successful browser verification.

## 0 — Read this first: exact, latest owner decisions

1. **THE CURRENT FILES ENTRANCE IS THE DEFAULT.** Do not replace it. Users MAY opt into a simple **Elevator / Slide Up** entrance through Shelf Settings. The current transition/view switching remains the **Normal (Default)** selection.
2. **Elevator means one upward motion, NOT two elevator doors.** When the user clicks FILES with the optional mode selected, the existing File Explorer **enters from below** and **pushes the existing FILES · REMOTES · HISTORY · SETTINGS row upward** as a single continuous movement. The navigation lands at its existing Files-view top position, with Explorer underneath. No logo morph, squash/spread, decorative doors, Rift Mode, particles, cinematic animation, audio, or unrelated shell redesign.
3. **Single-click only SELECTS** a file/image. **Arrow Up/Down only changes selection** when the bottom Preview has not been opened. **Double-click an image explicitly opens it in the existing bottom Preview dock**, NOT in a separate Window Preview. **After it opens**, Up/Down navigates through adjacent eligible images, updating the open bottom Preview. Keep normal folder navigation. No accidental preview read from single-click or arrows before opening.
4. Add a toggle to the **existing bottom Preview dock**: two opposing diagonal triangles (top-right and bottom-left) indicating Expand; the icon changes to inward/retract orientation once expanded. Click once to expand the preview into the **whole Shelf content area beneath the persistent four tabs**; click again to restore **the exact prior dock size**.
5. Let the **middle vertical divider** between cloud/folder rail and file pane move **all the way left or all the way right**, enabling either pane to occupy the full available width. Keep an accessible, discoverable way to recover the collapsed pane and return to 50/50.
6. Make the file-pane view button clearly offer **Detailed** versus **Large Images**. In Large Images mode, the displayed images **grow/shrink continuously as the middle divider moves**, respecting the available file-pane width and each image's aspect ratio. Detailed mode remains readable, useful, and independently selectable. Preserve selection and current file location when switching modes.
7. Diagnose and fix observed cloud-to-web drag failure resembling **"REDOWN could not download this"**. Retain **Universal File API for cloud reads**, **Chutey for browser/website handoff**, and the existing **private staged-file machinery**. A short-lived, reliable staging/queue and carefully bounded retries are wanted; NOT a new cloud engine or native worker installation.
8. Add **Keep files prepared for uploading** under Settings, **OFF by default**. Only keep eligible prepared file bytes when the user opts in, subject to quotas/expiry/clear. The original cloud file is never deleted.

**Keep existing rules:** Shelf starts in REMOTES unless the user already opted into the existing last-view setting; keep all four tabs, History/GO TO, provider access, right-click saves, BOOT behavior, premium previews, source-URL privacy, accurate counters, and themes. Do not change owner-approved REMOTES wording **Your Files · Your Way**.

## 1 — Mandatory source audit / preserve responsibility boundaries

Read AGENTS.md and the current source, existing tests, recent actual evidence, and working code paths before implementing:

- extension/shelf.html, extension/shelf.js, extension/shelf.css, extension/shelf-explorer.mjs, extension/shelf-explorer.css, extension/shelf-explorer-model.mjs;
- extension/chute-drag.mjs, extension/chute-stage.js, extension/chute-worker.js, extension/chute-content.js, extension/beta/file-api.mjs and relevant real provider adapter(s);
- docs/shelf-chute-integration/FILES_LAYOUT_HISTORY_FOLLOWUP.md, CHUTEY_PARITY_IMPLEMENTATION.md, ARCHITECTURE_AND_AUTHORITY.md, DESTINATION_COMPATIBILITY.md, and actual tests;
- any current relevant manifest permissions, storage/cleanup, visual fixture, and test harness.

**Observed current-code starting points, to verify rather than assume unchanged:**
- Shelf routes in shelf.js set hidden states and dispatch redown:shelf-route.
- The FILES layout currently hides branding/counter with CSS while anchoring the four tabs.
- The folder width setter in shelf-explorer.mjs currently clamps to 15–75 percent and initializes at 50 percent.
- The existing grid/large-images view uses image aspect ratios and variable virtual-row heights; the grid button is currently icon-based.
- The Preview dock is a separate, bottom sibling below the two-pane workspace, starts around 33 percent, and has a constrained resize grip.
- chute-drag.mjs obtains original bytes through API readStream; chute-stage.js uses private IndexedDB and a time-bound staging record; chute-worker.js handles arm/claim/chunk/finish; chute-content.js reconstructs a File and dispatches it to a receiver.
- Existing normal browser handoff limit is 32 MiB, with 8 MiB low-memory limit. Existing stage expiry is around one minute.
- The receiver may report drop_dispatched without proving target attachment or actual upload. Do NOT equate dispatch with success.

Produce a small source/behavior inventory and failure classification before making structural changes. Do not duplicate engines or components.

## 2 — Optional Files entrance: Normal DEFAULT vs Elevator / Slide Up

**Settings UI:** Add a focused control labeled **Files entrance** with:
- **Normal (Default)** — exactly the existing behavior; no new animation.
- **Elevator / Slide Up** — optional simple upward push.

Persist a validated preference in the existing settings store; unknown/legacy values fall back to Normal. Read preference before choosing the entrance to avoid a first-frame flash. Changing the setting must not interrupt current work or require another window.

**Slide-up choreography:**
1. User is on REMOTES, HISTORY, or SETTINGS and explicitly clicks FILES.
2. The existing Explorer arrives from just below the visible Shelf; while rising it pushes the **same real** four-tab navigation row upward.
3. Both move together with a short, smooth transform until the tabs reach the currently designed Files top location; the real Explorer then fills the rest below.
4. Keep text/buttons legible and hit targets working; no duplicate navigation rows, overlay clone, new tab, unnecessary page load, or loss of file state.

The present Files layout, final tab coordinates and Explorer API remain authoritative. Use small reversible CSS/view transition state with bounded duration; do not add a general animation framework. If the layout has not been measured, use a supported layout/transition technique; no magic permanent offsets. The slide should not leave gaps, clip the tabs, or trap focus. Respect prefers-reduced-motion by immediately switching to the final state. Rapid navigation/cancel must settle cleanly. Deep links/GO TO/startup should never be blocked by the entrance and can skip it when appropriate.

**Acceptance:** Normal remains visually/behaviorally identical on fresh install and after upgrade. With the option enabled, FILES click reveals an upward-moving Explorer that pushes the existing four-tab row to the top, after which Explorer is fully usable. Switching back and forth, reopening, and resizing never strand the view.

## 3 — Full travel for the middle divider (folder rail | file pane)

Modify the existing middle resize handle, not the whole window. The allowed range must genuinely cover both extremes:
- **Divider at left edge:** folder/cloud rail collapses; file pane occupies essentially all available width.
- **Divider at right edge:** file pane collapses; folder/cloud rail occupies essentially all available width.
- At all intermediate positions, pane widths update naturally.

Current 15–75 percent clamps, Home/End limits, CSS min-width, virtual-row assumptions, and saved width validation must be reviewed together. Do not merely set width to 0 and leave a trapped or unreachable handle.

**Required usability/safety:**
- The separator stays findable/grabbable at either edge, with a small accessible recovery affordance; keyboard Home/End reach both extremes, arrow keys move it incrementally, and 50/50 reset is discoverable (e.g. double-click separator or accessible reset action).
- Update aria-valuemin/max/now correctly for the full range. No stuck pointer capture or drag conflict with ordinary file dragging.
- Preserve folder/file navigation and selection while a pane is collapsed; avoid reading/rendering a zero-width virtual list and incorrectly resetting its scroll.
- Existing fresh-entry 50/50 split is preserved unless an already accepted user setting says otherwise. Do not silently introduce different defaults.
- On expansion, remeasure visible image cards/virtual-row offsets and restore logical scroll anchor. Do not rely on stale pixel positions after a large width change.
- Resizing remains smooth at narrow Shelf widths, with measured CPU/render cost and no sideways overflow.

## 4 — Detailed / Large Images view and divider-responsive media

The current grid/list toggle should become an obvious **Detailed / Large Images** control (segmented button or accessible toggle; use existing aesthetic and space constraints). Its actual state and labels must match the view. Reuse the current grid/list model; do not create two separate file renderers.

**Large Images mode:**
- Each picture uses the actual current **file-pane width**, and must **visibly grow as the divider moves left** and **shrink as it moves right**. Keep images properly scaled to their actual aspect ratios, avoid distortion, clipping and unexplained fixed thumbnail squares.
- Retain the existing one-image-per-row media presentation where applicable, with filename on hover/focus and accessible names. Non-image files retain polished type icon/name treatment.
- Recalculate responsive width/height and virtual-row geometry during divider travel; throttle/reconcile appropriately (e.g. animation-frame coalescing) to prevent jitter and runaway rerender.
- Avoid eager original-image downloads on every resize. Preserve current lazy thumbnail/preview resource and memory limits; do not display a blurry stretched icon as if it were the verified full-resolution file.
- As the file pane approaches 0 width, do not divide by zero, generate invalid heights, or lose row selection/scroll anchor. On reopening, remeasure from current pane width.

**Detailed mode:**
- Show normal readable file rows with the information the authorized File API actually provides (e.g. name, type/size if available); do not fabricate metadata.
- Remain usable at very narrow pane widths, with suitable truncation/overflow handling.
- Never change selection or cloud path just because the view is toggled. Preserve the user's mode selection consistently with current preferences, and keep keyboard access.

Test photo portrait/landscape/ultrawide, no-image files, very long filenames, 1/100/10,000 rows, rapid splitter movement, and the bottom Preview being open at the same time.

## 5 — Bottom Preview: select, explicit open, arrow browsing, and Expand / Restore

**Latest owner correction: this is an exact Shelf gesture contract, not optional styling.**

**Before the bottom Preview is opened:**
- Single-clicking an image/file **SELECTS ONLY**. It updates row highlight, focus and available actions but **does not open, replace or automatically load the bottom Preview**.
- Arrow Up / Arrow Down through the file list **moves selection ONLY**. It must never create/open the preview panel while the preview is closed. Space also selects only. This applies in Detailed and Large Images modes.
- A double-click on an **image** opens that image in the **existing bottom Preview dock**. Do **not** call the separate Window Preview for this action. For keyboard accessibility, offer an explicit Enter/Preview action with equivalent behavior; do not overload mere selection or arrow movement.
- Double-clicking a folder continues to navigate into it, not preview it. Handle image/file types consistently with actual preview capabilities.

**After a double-click has opened the bottom Preview:**
- Arrow Up / Arrow Down can browse the neighboring eligible **images** in current sorted/filtered file-list order. Change the highlighted selection and **update the already-open bottom Preview** with the newly chosen image; no repeated double-click required.
- Do not open another window/dialog and do not reopen/create another Preview dock for each arrow. Reuse the current dock and renderer; cancel stale reads so rapid navigation always shows the most recently chosen image.
- Skip folders/non-image entries for image browsing where appropriate; keep sensible boundaries, selection/focus visibility, list scroll anchoring, and accessible announcements. If navigation changes the folder or Preview is closed, return to **selection-only** arrow behavior.
- Preserve the existing full Window Preview as a distinct affordance (e.g. dedicated Open in Window action), NOT the default double-click result.

**Expand / Restore toggle:**
- Add one compact two-triangle toggle to the existing bottom Preview dock.
- **Normal state:** outward-facing diagonally opposed triangles at top-right and bottom-left; accessible name **Expand preview**.
- **Expanded state:** inward-facing/retract triangles; accessible name **Restore preview**.
- First click smoothly maximizes Preview **within the FILES content area only**. FILES / REMOTES / HISTORY / SETTINGS remain visible at the top; tree/list yield space without being destroyed.
- Second click smoothly restores the exact previous dock pixel height, including a user-adjusted size. Preserve selected image, zoom, scroll and active preview where possible, without unnecessary refetch.
- Keep original preview close (X), manual resize, double-click folder navigation, and separate dedicated Window Preview available.
- Handle rapid expand/retract, arrow navigation during preview reads, tab switching, narrow/short Shelf, selected image deleted, and reduced motion. No trapped focus, unintended preview opening, overlaps or stale image flashes.

**Code audit hotspot:** `extension/shelf-explorer.mjs` currently invokes `side(entry)` from `select(entry)`, including arrow navigation, and routes `row.ondblclick` to `preview.open(entry)` (a separate Window Preview). Explicitly remove those **gesture couplings** without breaking selection, drag, folder navigation, ordinary Window Preview or preview file-API permissions. Add event-level tests proving one click and arrow-only movement perform no preview read/open before double-click; then, after image double-click, arrow navigation updates the one bottom Preview.

## 6 — Diagnose first: real source of drag/drop error

Reproduce the reported **REDOWN could not download this** symptom in the real installed path if possible. Determine whether it occurs in:
- Universal File API authorization/stat/readStream/provider response, missing/changed file, timeout, cancelled reads, chunk-size/byte validation, or R2 error;
- private IndexedDB reserve/fulfill/lease expiration, arm/claim race, storage quota, service worker suspension/restart, tab/frame/origin validation, and chunk delivery;
- browser file payload reconstruction, trusted user gesture, file input restrictions, page-specific script acceptance, CSP/host permissions, or target rejecting synthesized events.

Add precise, **redacted stage outcomes** (without tokens, source/page URLs, object provenance, user file bytes, or sensitive names) so later incidents are diagnosable. Report confirmed cause vs suspected cause and test evidence separately. Do not mask a failed cloud read with retries of the wrong layer.

## 7 — Repair the existing Chutey delivery and temporary transfer queue

**Single-owner pipeline:**
Universal File API reads the authorized original file → Chutey adapter prepares short-lived private bytes → receiver receives a legitimate File/DataTransfer where permitted → target acceptance and upload outcome are classified truthfully.

Maintain or enhance existing stage/worker infrastructure rather than creating a new cloud-file engine, replacing V3, installing another native helper, or routing via a public cloud URL. No provenance/source/page URL should reach destination cloud APIs; do not persist provider credentials with prepared files.

**Queue and retry design:**
- One intentionally user-initiated drag must be handled once. Maintain stable source identity and file version; stat-before/after when supported. Preserve exact filename/MIME/original bytes.
- Treat **drop_dispatched** as a handoff event, not a confirmed site acceptance/upload. Current finish cleanup must be evaluated: do not destroy the only reusable copy immediately when the destination outcome is unverified.
- Keep a short bounded retry grace for transient/unverified outcomes; allow another explicitly initiated drag to reuse the prepared bytes safely without another cloud download when source/version/access are still valid.
- A new drag/retry must receive a fresh authorized one-use claim/receiver capability. Never reuse a consumed token across origins or silently replay a write into a website.
- Cancellation, explicit Clear, logout, changed source, revoked permission, expiry, browser restart, and app closure must have defined cleanup/recovery behavior; distinguish deterministic failure from ambiguous receiver status.
- Avoid unbounded files/bytes/count, memory duplication, or storage retained indefinitely. Do not raise the existing 32 MiB normal / 8 MiB low-memory limit by assumption; benchmark before any higher capacity. Do not auto-stage all visible files.
- Do not use native Downloads or display extra Python/debug windows for supported browser handoffs. If website/browser capability forbids delivery, give a clear fallback such as Download + upload picker, not a fabricated success.
- Preserve the existing shared Universal Worker/native-companion future direction. Additional native interop, streaming over 32 MiB and arbitrary Windows OS drag are separate, evidence-gated milestones, not hidden scope of this patch.

**New user setting:** **Keep files prepared for uploading** (OFF by default). When OFF, stage only for current transfer plus bounded retry grace and clean on confirmed completion, cancellation, or expiry. When ON, let the user retain eligible prepared files for later manual reuse, with an explicit storage ceiling, expiry policy, count/space visibility, and **Clear Prepared Files** control. Keep this private extension data distinct from a permanent Windows Downloads copy; browser cleanup may erase it. Opt-in does NOT change cloud originals, grant extra provider permissions, or authorize automatic uploads. On downgrade/opt-out, provide safe cleanup consistent with the policy.

**Truthful state model:** attempted → reading → staged → receiver claimed → drop dispatched → [accepted if genuinely observable] → [verified complete only with authoritative evidence], with failed/cancelled/expired/unverified outcomes handled explicitly. Never increase verified save counters, create false History success, or celebrate an upload from dispatch alone.

## 8 — Real destination compatibility / tests

Test the real expected interactions, not just script-dispatched events:
- controlled HTML input with byte-for-byte receipt;
- controlled custom drop target;
- ChatGPT attachment interface;
- Google Lens and Google Image Search where appropriate;
- Yandex image upload;
- other relevant targets only if observed/validated.

For each, record installed Chrome version, source provider, drag action, receiver state, exact filename/byte hash or acceptable proof, whether the website visibly accepted the attachment, and whether upload completion can be independently verified. Site-simulated events might be rejected; don't claim any universal web acceptance. Do not assume a successful fixture proves a real website. Use a supported explicit fallback for browser-restricted pages and unsupported targets.

Test slow/auth-expired reads, first-gesture race, source mutation, delayed drop, drop outside page, rapid repeat drags, parallel Shelf instances, same-size changed object, worker restart, tab/origin change, no receiver, storage quota, low RAM, oversized files, cancellation, retry, keep OFF/ON and clear. Assert one-use claims and no cross-origin data exfiltration.

## 9 — Cross-feature integration and regression gates

Build small, separate commits, tests, and rollback boundaries for:
A. Optional Files entrance preference/transition.
B. Full-range middle splitter plus Detailed/Large Images responsiveness.
C. Correct single-click/arrow selection vs double-click bottom Preview open and after-open arrow browsing, plus Preview maximize/restore toggle.
D. Root-cause-driven Chutey transport/queue and Keep-files setting.

Check interaction matrix: normal vs elevator; compact vs wide Shelf; four themes including Neon; 0/25/50/75/100 percent divider; Detailed vs Large Images; Preview closed/normal/maximized, before-open arrow selection, double-click open, after-open arrow browsing; drag initiated during resize or route switch; rapid tab changes; History GO TO; login state changes; keyboard and reduced motion.

**Do not degrade** REMOTES-first startup, source selection, existing paid/free controls, BOOT recovery, actual provider access, Cloudflare saves, flat other-provider right-click menus, History GO TO, Quick Glance, popup/Side Panel coexistence, preview correctness, or source privacy.

Perform the full existing test suite and focused suites, compare failing test **names** with fresh baseline (never claim all-green if preexisting failures remain), static checks/packaging checks, and installed Chrome 155+ plus actual Windows 11 acceptance where available. Do not forge or overwrite historic evidence to erase failures. Record what could not be verified.

## 10 — Required Codex deliverables

1. Source-first map and confirmed/unknown drag failure causes.
2. Working dedicated feature branch and PR with narrow, independently reviewable commits; **no main merge**.
3. Implemented optional Normal-vs-Elevator behavior (Normal default), full-range middle slider and responsive Detailed/Large Images modes, corrected single-click/double-click/arrow Preview behavior, and Preview Expand/Restore.
4. Repaired existing handoff lifecycle with bounded retry staging and OFF-by-default Keep Files preference.
5. Focused tests, full baseline delta, and real browser screenshots/video showing the actual tab push and pane sizing, including extreme splitter positions.
6. Destination compatibility matrix distinguishing simulated dispatch, accepted attachment, verified upload, and unsupported cases.
7. Concrete remaining issues, security/privacy constraints, safe rollback, exact commands/results, commit SHA and PR link.

**One-line success condition:** Default REDOWN looks and works as before; users can opt into a small upward FILES push, move the middle splitter fully to either edge while images responsively resize, double-click to open the bottom image preview, browse with Up/Down only after it opens, expand/retract it, and drag real cloud files to supported web targets with reliable staging, transparent outcomes, bounded retries, and deliberate retention settings.

**This specification is the authoritative owner addendum for this next Codex task and supersedes earlier suggestions to make the elevator effect the default.**
