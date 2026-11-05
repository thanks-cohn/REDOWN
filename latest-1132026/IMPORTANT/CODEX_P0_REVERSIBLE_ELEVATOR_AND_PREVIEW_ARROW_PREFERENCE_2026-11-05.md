# P0 CRUCIAL — Reversible Elevator Exit + Configurable File Explorer Preview Arrow Keys

**Owner clarification:** November 5, 2026. **Priority:** P0, must not be omitted or silently altered.  
**Status:** DOCUMENTED / OPEN; source inspected, no runtime implementation, tests, deployment or production file modification in this change.  
**Repository:** thanks-cohn/REDOWN. **Pinned inspection commit:** `aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1`.

**Related implementation baseline:** [optional Files elevator / preview/splitter/drag request](CODEX_P0_OPTIONAL_FILES_SLIDE_PREVIEW_SPLITTER_IMAGE_MODES_DRAG_RELIABILITY_2026-11-05.md); [slide-preview implementation report](../../docs/shelf-chute-integration/P0_SLIDE_PREVIEW_DRAG_IMPLEMENTATION.md); [original FILES entry tests](../../tests/shelf-files-entrance.test.mjs). This is a **new separate follow-up**, not a rewrite of the original comprehensive spec. The older spec's Up/Down preview browsing rule is superseded by the new default here. Its critical closed-preview selection and explicit-open behavior are NOT superseded.

## 1. CRUCIAL FIX A — Elevator MUST run in reverse when EXITING FILES

### Current verified code

- [`extension/shelf.js` lines 15–40](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/shelf.js#L15-L40): `shelfFilesEntranceV1` is `normal` by default and `slide-up` opt-in. An explicit FILES click computes before/after geometry, animates the **real Explorer rising from below** and **real** FILES · REMOTES · HISTORY · SETTINGS nav row being physically pushed UP to final position. Animation duration currently 240 ms.
- [`extension/shelf.js` lines 80–81](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/shelf.js#L80-L81): when hash leaves `#explorer`, `settleEntrance()` simply cancels the animation and calls the route renderer. **No inverse/downward animation is implemented in that path.** This is the concrete missing behavior.
- [`extension/shelf.html`](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/shelf.html) has the real four-tab row, odometer, FILES and other views; no copy/duplicate nav should be introduced.
- [`tests/shelf-files-entrance.test.mjs`](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/tests/shelf-files-entrance.test.mjs) currently checks opt-in upward entrance and Normal. Add reverse cases, not just initial frame checks.

### Required interaction sequence

1. **Normal (DEFAULT):** Keep the current instantaneous transition **both entering FILES and leaving FILES**, including first installation, old settings/unknown values and returning from another view. Do not switch the default to Elevator.
2. **Elevator / Slide Up selected in Settings:** Clicking FILES while coming from REMOTES, HISTORY or SETTINGS produces the existing simple physical **rising File Explorer PUSHING the original nav row upward**. No elevator doors, no logo morph, no decorative extra panels or duplicate nav.
3. **Now the crucial reverse:** When the user clicks REMOTES, HISTORY or SETTINGS while FILES is showing, **the actual Explorer travels DOWN out of the Shelf, and the same original nav row follows/unpushes DOWN to its normal non-FILES resting position.** This should visually read as the exact inverse of the entrance, with matching easing/short duration/contact motion and without flashing another view early over the moving Explorer.
4. Once reverse completes, the requested REMOTES/HISTORY/SETTINGS view is usable at the original intended layout position. The next explicit FILES click rises normally again; repeated exit/reentry never drifts or accumulates transforms/offsets.
5. **Interruption is mandatory:** If the user rapidly switches FILES → REMOTES → FILES, or FILES → HISTORY → SETTINGS, stop/rebase/retarget from the **current visual position**, don't pop, get stuck, create two animations or ignore a click. All transitions are bounded, cancellable and deterministic.
6. Preserve user focus, selection, file scroll, preview state, tab hit targets, connected state, other view scroll and measured divider geometry. Reverse is a *visual layout transition*, not a file operation, disconnection or reinitialization.
7. **Reduced-motion:** Immediately route to the final correct view and coordinates without animation. Likewise, startup hash, History GO TO, automation/deep-link, service worker wake and non-user navigation must NOT wait for an animated handoff. No accidental reverse on initial Shelf opening to REMOTES.
8. **Resize or closing the Shelf mid-flight:** Cancel/settle to exactly one valid final layout. No ghost navigation row, overlay, blank gap, pointer-blocking animation layer or stale transform.
9. Retain the currently implemented **slide-up** preference key/values unless a narrow compatible migration is necessary. Reverse is automatically paired with Elevator ON; it is not an independently configured animation switch.

**Implementation guidance, not a second UI engine:** Source-own the navigation/animation decision in the existing `extension/shelf.js` route path. Capture pre/post geometry for exit (FILES nav position vs non-FILES nav position) and perform the inverse Web Animations or equivalent while preserving the live view until the transition ends. Cancel/commit rapidly and never allow a late finish callback to route back to stale tabs. Use one animation controller/epoch for enter and exit. CSS-only fake reversal or an animated clone is unacceptable.

### Elevator acceptance matrix (P0)

- [ ] Normal preference: REMOTES → FILES and FILES → REMOTES/HISTORY/SETTINGS are unchanged, without animation.
- [ ] Elevator preference: REMOTES → FILES shows real Explorer rising and real navigation pushed upward.
- [ ] Elevator preference: **FILES → REMOTES/HISTORY/SETTINGS** shows **Explorer going down and real navigation returning downward**; verify actual intermediate geometry, not just final state.
- [ ] Round trip three times: identical resting coordinates before/after with no cumulative drift or blank.
- [ ] Rapid clicks, Escape/cancel where relevant, page/hash change, disable elevator mid-flight, resize, reload and reduced motion: stable correct view.
- [ ] No new window, tab, extra navigation clone, blocked controls, duplicate event handlers or accidental file transfers.
- [ ] Validate Standard/Midnight/Porcelain/Neon themes and compact/full Shelf heights.

## 2. CRUCIAL FIX B — Fully EXPANDED Preview MUST permit directory traversal, with configurable arrow axis

### The exact owner-reported defect: Preview cannot browse after FULL EXPAND

**Fix the expanded state specifically.** When the user selects a file, opens the bottom Preview, and clicks **Expand Preview** to maximize it within FILES, the **same fully expanded Preview must allow Previous/Next traversal of the current directory**. The user must NOT need to restore the panel, click an obscured file row, double-click again, or open a separate Window/Lightbox to advance.

- **User-selectable keyboard axis in Shelf Settings:** **Left / Right (default)** means Left=Previous, Right=Next; **Up / Down (alternative)** means Up=Previous, Down=Next. Exactly one pair is active per setting, persisted and applied to the fully expanded Preview without reopening it.
- Once expanded, arrow navigation acts from a **visible/focusable Preview surface**, not from hidden underlying file rows. The selected item and the displayed preview advance together; the panel **remains expanded** throughout.
- Preserve the real currently sorted/filtered directory's eligible items; no accidental switching folders, buckets, cloud accounts, tabs, or preview modes. Skip ineligible folders/files according to supported preview types; stop at boundaries without wrap or bogus reads. Async responses are cancellable/latest-wins.
- Upon **Restore**, retain the last traversed file's Preview and its underlying selection, scroll into view safely when list becomes visible, and retain keyboard usability. Expanding again should continue navigation from that item.
- Existing nonexpanded Preview should respect the same keyboard preference; when Preview is **closed**, Up/Down moves file-list selection as before and should never open the Preview by itself. Inputs, text editing, splitters, document scroll and media controls retain their own keyboard semantics.
- **SOURCE-VERIFIED ROOT MECHANISM TO INVESTIGATE:** `toggleExpand()` in [shelf-explorer.mjs lines 60–110](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/shelf-explorer.mjs#L60-L110) makes all siblings of the Preview `inert` and `browseImage()` is reached through file-row and Preview key handlers currently hardcoded to Up/Down. [shelf-explorer.css lines 158–160](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/shelf-explorer.css#L158-L160) hides the other content while expanded. **Keep the background inert/hidden**; attach reliable keyboard handling to the expanded Preview rather than removing this safety isolation.
- Add/verify visible Previous/Next controls on expanded Preview if necessary for pointer and accessible navigation. Their semantics remain previous/next regardless of the chosen keyboard axis.

### Current verified code

- [`extension/shelf-explorer.mjs` lines 95–110](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/shelf-explorer.mjs#L95-L110) currently calls `browseImage()` for **ArrowUp/ArrowDown** when the bottom preview is open, skipping non-images; [lines 160–163](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/shelf-explorer.mjs#L160-L163) also runs that path from file rows. This is the key Shelf behavior to update.
- [`extension/beta/explorer.mjs` lines 420–454](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/beta/explorer.mjs#L420-L454) already has mixed arrow semantics based on media vs documents/collections; [`extension/beta/window-preview.mjs` lines 52–60](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/extension/beta/window-preview.mjs#L52-L60) already uses Left/Right for Window Preview. Reuse/adapt rather than creating an unrelated keyboard system.
- [`docs/shelf-chute-integration/P0_SLIDE_PREVIEW_DRAG_IMPLEMENTATION.md`](https://github.com/thanks-cohn/REDOWN/blob/aab3e3e4cb5e0c67c7cf4f1b079e60552ad13fd1/docs/shelf-chute-integration/P0_SLIDE_PREVIEW_DRAG_IMPLEMENTATION.md) documents **closed Preview** selection-only, double-click/Enter to open the EXISTING bottom Preview, and race-safe browsing using the same dock. All of that must continue to work.
- The older implementation request prescribed Up/Down for open bottom Preview. **This latest owner decision supersedes it.**

### Settings behavior (owner requirement)

Add one small, obvious control in **Shelf Settings** (and the equivalent shared Explorer setting, if a separate full Explorer settings surface exists):

**Preview navigation keys**
- **Left / Right (DEFAULT)** — Left Arrow = Previous; Right Arrow = Next.
- **Up / Down** — Up Arrow = Previous; Down Arrow = Next.

Persist a validated preference in the existing local settings system; missing/unknown/legacy values resolve to **Left / Right**. No need to reopen the Shelf, rescan cloud storage or reload a directory for setting changes to apply. Existing user selection/preview and saved unrelated preferences must remain intact. Use **one shared preference** for the same REDOWN preview behavior across Shelf FILES, full Explorer, and Window Preview/Lightbox as applicable; do not create competing defaults. Keep visual Previous/Next buttons available wherever already supported and ensure their actions always match the keyboard preference.

### Preview rules

1. **Only while a preview is ALREADY open/active** may the configured arrow pair advance to the next/previous eligible item in the **currently displayed directory**, using its current sorted/filtered order, including the active cloud account/bucket/prefix identity. Preserve any established preview-eligibility rules per viewer; skip folders/unsupported items rather than entering or renaming them. Do not jump to other directories or another provider tab.
2. **Default: Left = Previous / Right = Next**. When the user opts into Up/Down, map Up = Previous / Down = Next. Only the selected arrow pair should be preview-advance keys; the other axis retains ordinary focus/tree/scroll behavior appropriate to the specific UI.
3. **Preview closed:** Arrow Up/Down in the file list still navigate/select rows normally; arrows must **never open** the bottom preview automatically. Single click selects, double-click/Enter explicitly opens the existing bottom Preview. This remains true when the settings preference is changed.
4. **Preview open:** Moving to an adjacent eligible item selects/highlights that item in the file directory, scrolls it into view when necessary, and updates the SAME already-open Preview. No double-click requirement on subsequent items, no new modal/window for each arrow, no new Preview dock.
5. **Boundaries:** First/last item yields a quiet stable no-op with correct disabled Previous/Next button state where available; there is no accidental wrap to a different folder. Empty folder, one previewable item, deleted/moved item, freshly filtered directory and incomplete paginated list must not crash or invent neighboring files. Handle sort/filter changes consistently.
6. **Rapid input:** Last selected item wins; cancel/discard stale async previews and prevent late image/file bytes from flashing. Keep the preview visible and size/Expanded state stable.
7. **Do not hijack arrow keys** in text fields, selects, dialogs, menu trees, sliders/splitters (their own accessibility keys remain), or while modifier shortcuts are used. Respect focus and event propagation: only one action per keypress, no multiple concurrent listeners navigating twice.
8. **Documents/archives:** Do not break reader paging, text/PDF vertical scroll, ZIP/CBZ gallery navigation, video/audio controls, or lightbox Escape. Where the optional Up/Down mode creates a conflict with content scrolling, preview navigation should be scoped to the preview navigator/file selection, and scrolling/paging remain explicitly usable (wheel, Page Up/Down, focused content), with clear keyboard precedence. Don't silently repurpose every ArrowUp/ArrowDown in a document.
9. **Provider safety:** No navigation gesture writes, copies, transfers, opens download, signs in, changes buckets, or mutates cloud files. It reads only eligible previews and preserves exact authorized provider/account/bucket/folder.
10. **Visible arrows:** Preserve existing Previous/Next controls, make them respond consistently to the chosen mapping, and retain keyboard-accessible/accessible descriptions. The setting chooses keyboard axes; it does NOT change arrow button icon directions unless separately designed.

### Preview acceptance matrix (P0)

- [ ] Fresh install or missing/invalid preference → Left/Right selected in Settings.
- [ ] Preview closed → Left/Right does not summon a Preview; Up/Down selects list rows; Enter/double-click explicitly opens it.
- [ ] **With Preview FULLY EXPANDED**, three images in one directory → Left/Right by default navigates Previous/Next in the SAME expanded panel. No Restore or fresh double-click required; correct underlying file remains selected.
- [ ] **With Preview FULLY EXPANDED**, switch Settings to Up/Down → Up previous, Down next; Left/Right no longer advance preview; switch applies immediately and persists across Shelf/background restart.
- [ ] Switch back → Left/Right returns without data loss or forced preview re-open.
- [ ] Folders, unsupported files, mixed media, archives/PDF/text, filtered/sorted/paginated files, duplicated names, rapid keystrokes and last-image boundaries yield deterministic navigation.
- [ ] Window Preview/Lightbox and full Explorer respect the configured pair where applicable, while keeping document scroll and tree/splitter keyboard access.
- [ ] Keyboard does not fire when editing filename, renaming, in Settings, a menu, tree, input/select, or resizing preview/Explorer splitters.
- [ ] In both keyboard modes, traversal keeps Preview **fully expanded**; restoring preserves last traversed file and selection; scrolling, responsive layout and failed remote reads stay stable.
- [ ] Run source-level unit tests and a real installed-Chrome interaction for Shelf and full Explorer. Report separately what is verified/not tested.

## 3. Source-level implementation map and non-regression boundaries

| Existing file | Minimal expected change |
| --- | --- |
| `extension/shelf.js` | Reuse current Files entrance pref and animator; add actual **inverse** exit animation in the same navigation lifecycle, deterministic cancellation/epoch and reduced-motion bypass |
| `extension/shelf.html` | Add **Preview navigation keys: Left/Right (default) or Up/Down** Settings control; keep Normal/Elevator setting as before |
| `extension/shelf-explorer.mjs` | Fix expanded Preview traversal on the visible focusable panel (not inert file rows). Read/watch single validated preference, default Left/Right vs optional Up/Down; preserve selection-only when preview closed and selected file after Restore |
| `extension/beta/explorer.mjs` | Consume same preference with document/archive/folder key precedence; continue exact current sorted/filtered directory behavior |
| `extension/beta/window-preview.mjs` | Honor preference when preview modal is open while preserving previous/next buttons and content scrolling |
| `extension/shelf.css` / `extension/shelf-explorer.css` | Only scoped, tasteful Settings/animation visual adjustments as required; no duplicate animation framework |
| Tests under `tests/`, `scripts/` | Add reverse-geometry and gesture/navigation/settings tests, source fixture + installed Chrome when available; no invented pass claim |

**Do not alter:** canonical Universal File API, underlying Cloudflare R2 TRUE REMOTE, provider authentication, CURRENT V3 native menu, multi-S3 tab architecture, Shelf default REMOTES/startup, 50/50 File Explorer split preference, bottom Preview dock, Chutey drag/drop or History GO TO. No cloud object writes or remote login needed to validate these two UI defects.

## 4. Codex handoff / stopping rules

Audit source at referenced commit and latest branch first. Implement only these two urgent changes in a focused independently reviewable branch/PR, not a disruptive rewrite; keep the comprehensive existing slide/preview tests. Document the exact key pref and fallback, screen-by-screen keyboard ownership, source changes, and actual test receipts. No production Cloudflare Worker updates or remote object writes. Distinguish tests run from merely planned test criteria. Owner acceptance requires observed **reverse travel** and **Left/Right default preview browsing**, not merely a setting label or a mocked menu preview.

**One-line acceptance:** Elevator ON makes FILES slide **UP when entering and DOWN when leaving** while the same real nav row returns with it; with the Explorer Preview **fully expanded**, it navigates neighboring files **without restoring**, using **Left/Right by default or Up/Down as selected in Settings**.
