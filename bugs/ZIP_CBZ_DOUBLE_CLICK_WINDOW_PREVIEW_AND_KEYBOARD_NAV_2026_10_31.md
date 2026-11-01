# BUG — ZIP/CBZ do not reliably open Window Preview; reader arrow-key behavior is inconsistent

**Observed:** 2026-10-31 (owner's installed Chrome report)
**Repository:** `thanks-cohn/REDOWN` · **Branch:** `codex/v3-parity-first-reconstruction`
**Priority:** P0 for archive-reader usability · **Status:** OPEN, documentation only
**Surface:** Explorer list/grid → ZIP / CBZ double-click → Window Preview / archive reader

## Owner-observed defects

**A. Opening is inconsistent.** Double-clicking a supported `.zip` or `.cbz` in Explorer sometimes does **not** launch its dedicated Window Preview/reader. It should do so reliably on the **first** double-click, including when Side Preview is already open. The Side Preview must survive closing the reader.

**B. Keyboard controls behave differently from the intended reader model.** In the one case where an archive did open in Window Preview, the user could not navigate through it as expected with arrow keys. The owner specifically wants the following **when focus is in the archive reader**:

| Key | Required semantics |
|---|---|
| **Left** | Previous **internal** page/image/reader item in the current ZIP/CBZ |
| **Right** | Next **internal** page/image/reader item in the current ZIP/CBZ |
| **Up** | Previous **outer Explorer** item/archive in the current folder/list, with an appropriate preview transition |
| **Down** | Next **outer Explorer** item/archive in the current folder/list, with an appropriate preview transition |

The user should not have to abandon the reader merely to move to the next file, and must not silently lose their place. Preserve existing boundary and focus rules where applicable; document exact behavior for first/last internal page and outer item and for non-archive neighbors. **Up/Down means outer item navigation in reader context, not page scrolling,** unless focus explicitly belongs to a text input/scroll widget where the navigation shortcut must be suspended.

## Reproduction in real Chrome

1. Open a bucket/folder with several ZIP and CBZ files plus surrounding items, in list or grid view.
2. Double-click one archive with Side Preview open; repeat with Side Preview closed and with an archive already selected.
3. Confirm that the first double-click opens a dedicated Window Preview/reader, not only an inline preview, file selection, browser download, or plain folder navigation.
4. While archive reader has keyboard focus, press Left/Right repeatedly; examine internal page transitions and visible page indicator.
5. Press Up and Down; confirm movement to adjacent **outer** Explorer item and reader/preview context transitions.
6. Close via Escape/close; verify Side Preview, current folder, selection and scroll position persist.

The observations are from the owner; the report has **not** reproduced them via installed-Chrome instrumentation and does not assert a source-level root cause.

## Correct behavior / acceptance

- Double-click is an explicit Window Preview request, independent of saved Side/Window preference and whether Side Preview is mounted.
- One archive reader remains open, correctly renders ZIP/CBZ entries **without requiring extraction**, and its Left/Right move through valid internal content.
- Up/Down move to previous/next outer Explorer item within the active listing, using deterministic sorting and boundaries; do not confuse this with Up one directory, which belongs to Explorer outside reader focus.
- File names, internal page identity, outer item identity and reader progress are tracked independently so direction changes never jump to an unrelated bucket or corrupt archive state.
- Mouse/onscreen Previous/Next must have clear semantics consistent with the focused context; if needed label page navigation separately from outer-item navigation.
- Handling an archive that lacks previewable images, contains nested folders, or has a corrupt/large entry produces a safe error or reader fallback, not a blank modal or uncontrolled download.
- The separate Window Preview can close without destructively removing the existing Side Preview, its object URLs, selection or scroll.
- Explicit modifiers, interactive controls, text inputs and screen readers retain accessible focus semantics; Escape dismisses the intended topmost surface.
- No read/write/delete permissions or cloud object identities change.
- Add regression tests for first double-click, Side Preview coexistence, both ZIP and CBZ, grid/list, left/right internal pages, up/down outer items, boundaries, focus, Escape, archive errors and repeated open/close.

## Related specifications

- `NEED_TO_DO/11012026.md` P1.1 / P1.4: double-click always enters Window Preview and preview lifecycles are independent.
- Existing ZIP/CBZ reader behavior and legacy archive preview contracts must be inspected, not deleted to make the tests pass.
- Companion future onboarding idea: [ARCHIVE_HELPFUL_COMMENTS_ARROW_HINT_IDEA_2026_10_31.md](ARCHIVE_HELPFUL_COMMENTS_ARROW_HINT_IDEA_2026_10_31.md).

## Scope

**Documentation only.** No new reader architecture or keyboard remapping has been implemented or browser-tested by this report.
