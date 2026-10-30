# IMPORTANT PROPOSAL: Specialty-First Explorer Toolbar

**Status:** PROPOSAL ONLY, NOT IMPLEMENTED
**Target:** The always-visible command area above the modern Explorer file list.
**Goal:** Remove duplicate commands from the *top surface* while preserving them through right-click context menus, keyboard shortcuts and an overflow command menu. Give primary space to what makes REDOWN distinct.

## Current situation

The modern Explorer exposes a long series of always-visible commands, including New folder, Upload folder, Copy, Cut, Paste, Rename, Duplicate, Copy to, Move to, Open archive, Preview, Get URL, Download, Properties and Delete. The right-click context menu duplicates many of them. At narrow widths, these commands consume excessive rows and visual attention.

## Proposed visible command hierarchy

**Primary actions, always available when applicable:**
- **Send URL to Cloud** (with Single URL + URL List import).
- **Upload Files**.
- **Copy**.
- **Paste**.
- **Move to…** (destination chooser; preserve safe move semantics).
- **Open Archive / Read Comic** when ZIP or CBZ is selected.
- **Read / Preview** for supported media, including the proposed reader modes.
- **Get URL** for exact available object addresses. Its value is distinctive to REDOWN, so prioritize it when a shareable address can be offered.
- **Find in Cloud** or **Search across buckets** only after the underlying capability and scope have been verified; Legacy already has broader remote search than the current visible folder filter.

Use concise control labels and grouping; choose context-sensitive actions rather than displaying every button as enabled/disabled all the time.

**Relocate, do not delete:** Cut, Rename, Duplicate, Delete, Properties, Download, New Folder, Upload Folder, detailed sort options and less frequent transfer variants. Keep these in the right-click menu and a clearly labeled **More** menu. Do not destroy existing keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+V, F2, Delete) or drag-and-drop.

**Move to… must remain accessible** in the top command area as specifically requested; users should not have to rely exclusively on cutting and pasting.

## Specialties deserve first-class surfaces

1. **Virtual ZIP/CBZ Explorer:** Browse nested folders and preview archive contents without manual extraction. The current modern Explorer's archive dialog is not equivalent to all Legacy virtual-folder behavior. Keep selective extraction and cross-location copy in the parity plan.
2. **Comic Reader:** Continuous Scroll and Two-Page Book modes available from folder images and archive entries.
3. **Batch URL Acquisition:** Import a URL List; show live transfer progress, provenance and result export.
4. **File URLs:** Get the real address choices, explicitly consent before enabling bucket-wide public URLs, no fake addresses.
5. **Remote search:** The Legacy Explorer's cross-account/bucket search is a target for modern parity, not something to claim the modern filter already performs.
6. **Rich inspection:** Images, video, audio, text/PDF and GLB/glTF where actually supported. Legacy's model-viewer should be carried into a parity roadmap if absent in modern Explorer.

## Interaction and layout

- Keep navigation controls (Back/Forward/Up/Refresh and address hierarchy) visually separate from file actions. Do not let action rows push long breadcrumbs into arbitrary wrapping.
- One readable high-priority row plus compact overflow, rather than three crowded strips of generic file-manager verbs.
- Toolbar actions derive from the same command registry as right-click and keyboard paths: one action ID, one availability rule, one handler, one permission check. Do not duplicate business logic.
- Contextual states: no selection, ordinary file, image sequence, folder, ZIP/CBZ, multi-selection, disconnected/unauthorized, running operation. Hide actions where inappropriate and supply a discoverable More menu.
- Destructive commands require appropriate confirmation and remain accessible by keyboard and screen reader.
- Preserve the existing **Keep Both** default, copy/move verification requirements and safe behavior for source deletion.
- Do not visually promise support for archive-entry operations that are not implemented. Mark planned or unavailable behaviors clearly.

## Acceptance tests

1. At the narrow Explorer width seen when Chrome's Side Panel is open, controls stay legible, balanced and free from arbitrary multi-row button clutter.
2. Copy, Paste and Move remain directly visible or predictably discoverable without unrelated menus.
3. Every displaced command remains accessible through context menu and/or More with keyboard support.
4. Context, toolbar and keyboard invoke the same command handler and report the same results.
5. ZIP/CBZ file selection foregrounds Open Archive / Read Comic, not generic unrelated operations.
6. No selected file, failed authentication and partial cloud operations show meaningful disabled or empty states without pretending to succeed.
7. Existing file-operation and context-menu regression tests continue to pass.
