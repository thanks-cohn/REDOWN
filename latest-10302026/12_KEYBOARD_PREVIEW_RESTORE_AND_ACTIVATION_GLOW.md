# REDOWN handoff: contextual preview arrows, compact right-click selector, activation glow

**Date:** 2026-10-30  
**Repository/branch:** `thanks-cohn/REDOWN` / `release/cloudflare-true-remote`  
**Right-click selection restoration reference:** `515c272c48f8`, the release-branch checkpoint before the right-click repair at `16dad07` and the multi-stage UI redesign at `45e1c71`.

## 1. Restoration scope

The right-click **selection and editor presentation** in `extension/beta/explorer.html` and the destination-studio CSS in `extension/beta/explorer.css` were restored from the precise `515c272` source sections, without resetting the branch.

This removes the later four-stage header/editor/preview/commit presentation, restoring the compact single toolbar containing Simple/Nested, prepared bucket selection, + Location, Save menu, and Reload. The newer optional dedicated-bucket disclosure remains collapsed and the rest of Explorer (archive preview, toolbar, URL controls, settings, and Bucket activation) remains current.

**Intentionally preserved, rather than rolled back:** the modern `destinations.js` canonical save path, `nested-menu-editor.js` fixes for removing empty menu groups and confirming cloud folder creation, `nested-locations.js` parent-first menu definitions, current menu routing, and the Legacy write isolation. Restoring those older implementation modules would reintroduce bugs and legacy authority. This is a **section/UI rollback**, not a rollback of browser menu routing or Cloudflare storage.

The modified destination UI test now checks the compact selector and still verifies that changes reach the authoritative native-menu save path.

## 2. Context-aware arrow navigation

The Explorer keyboard handler now classifies the selected item before interpreting arrows:

| Selected object | Left/Right | Up/Down |
| --- | --- | --- |
| ZIP / CBZ | Previous/next image within that archive's existing Preview reader | Previous/next Explorer grid item, leaving archive reading |
| Directory | Previous/next previewable file within the selected directory, without entering it | Previous/next Explorer grid item |
| Single image, audio, video | Previous/next supported Explorer item; encountering a folder or archive changes to its collection mode | Previous/next Explorer grid item |
| Supported text/PDF document | Previous/next supported Explorer item, exiting document-reading context | Open document Preview if necessary; otherwise scroll the preview viewport |
| Unsupported item | Move among Explorer items | Move among Explorer items |

Selecting a file with the mouse focuses its grid row. Clicking displayed image/text in Side Preview focuses the side viewer, so arrow keys operate without needing a second click in a separate control. Text inputs, edit fields, modal confirmations, media controls, the resize divider and instructional overlays keep their own keyboard behavior. Existing Alt+Left, Alt+Right, Alt+Up navigation remains available outside previews and modal interactions.

A windowed Preview routes arrows according to the current item's type instead of always advancing Preview's old generic sequence.

**Directory reader:** a directory now uses the existing read-only list and per-file preview routes. It builds a natural-name-ordered sequence of supported directly contained files, without opening the directory in Explorer or modifying storage. Requests are bounded by 2,000 previewable entries or 30 pages and protect against stale results through epoch/session and AbortController checks. The viewer's Previous/Next controls share the same collection sequence. Nested subdirectories are not recursively traversed by default; users can double-click a directory to enter it.

**ZIP/CBZ reader:** the existing archive index and individually signed entry URL routes are retained. An initial Left enters from the last page; Right enters from the first. No extraction is performed by Preview.

## 3. High-end Activate Buckets motion

The button remains permanently visible immediately after Grid View.

- Click with no selected bucket: brief amber attention glow and a message to select storage, with no provisioning.
- Click on an unknown bucket: soft cyan/teal checking pulse.
- Activation confirmation: brief warm/amber glow, with the existing explicit confirmation still required.
- After approval: restrained cyan-to-teal breathing glow while Cloudflare activation is actually pending.
- On *verified* readiness **and** successful context-menu update: luminous green success sweep that settles into a steady green state.
- On uncertain, incomplete, or failed operation: amber attention finish, never a false green success.

The CSS animation is purely decorative; REDOWN's existing `prepareBucket`, verification and state handling determine outcome. Reduced-motion users see a static contrast state without animated pulsing.

## 4. Files and responsibilities

- `extension/beta/explorer.html`: restored compact selection markup; retained current activation and other features.
- `extension/beta/explorer.css`: restored the prior destination-studio spacing; appended small compatibility rules for current Nested group controls; added activation animations with reduced-motion overrides.
- `extension/beta/explorer.mjs`: verified-only activation glow state, focusable preview, contextual keyboard routing, directory collection preview, natural ordering, bounded directory list, safe asynchronous reads and cancellation.
- `tests/modern-destinations.test.mjs`: adjusted the destination-editor layout assertion while keeping menu-authority coverage.
- `tests/beta-explorer.test.mjs`: added collection, CBZ, document and activation-motion regression cases, and adjusted an old folder-placeholder expectation to the newly implemented reader.

## 5. Verification status and limits

Verified against the saved release-branch source: JavaScript and test modules parse after stripping import statements, right-click markup and restored CSS exist, activation animations and reduced-motion rules exist, and the Explorer contains the new contextual keyboard and directory-preview implementations. Native context-menu routing was deliberately not rewritten; Cloudflare buckets, objects, and credentials were not modified.

**Not yet executed:** complete Node/jsdom test suite, live Cloudflare R2 operations, installed Chrome keyboard/focus tests, and visual animation quality across themes. No results are claimed for those unexecuted checks.

**Known limitations:**
- The built-in Chrome PDF iframe viewer can consume its own keyboard events, which do not necessarily bubble out to REDOWN. Up/Down from REDOWN's focused preview wrapper works for supported text and the outer scroll surface; reliable inner-PDF page navigation requires a document renderer integration or a browser-specific acceptance check.
- Directory preview is nonrecursive; files in subfolders require navigating to the subfolder or a future recursive mode.
- When a selected folder contains more than the bounded number of read entries, Preview indicates additional files may exist.
- The rollback affects the right-click **selection interface**, not the canonical persisted configuration or any stored user destinations.

## 6. Manual acceptance

1. Inspect the Right-click setup tab: pre-redesign compact Simple/Nested selector, prepared bucket select, + Location, Save, Reload. No four-stage pane.
2. Confirm normal Explorer/toolbar, Keep Both, Upload Folder, ZIP/CBZ reader and Bucket URLs are unchanged.
3. Select a CBZ, press Right then Right to advance; press Left to go back; press Up/Down to leave for another grid item.
4. Select a directory in Side Preview, browse contained files with Left/Right, and press Up/Down to move to another grid item without entering the directory.
5. Select an image, use Left/Right to move between supported files; Up/Down still traverses the grid, including collections.
6. Select a supported text document or PDF, press Up/Down to preview/read; use Left/Right to leave it for another item. Validate PDF iframe behavior in installed Chrome specifically.
7. Press Activate Buckets with no selection, on an already-ready bucket, and with an inactive bucket. Verify the correct animation and the existing explicit confirmation. A green finish may appear only after verification.
8. Enable reduced motion and confirm the button uses static state coloring instead of pulsing.
