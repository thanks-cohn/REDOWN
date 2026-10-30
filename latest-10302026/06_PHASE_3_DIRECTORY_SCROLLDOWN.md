# IMPORTANT | PHASE 3: Scrolldown for Entire Directories

**Status:** PROPOSAL ONLY. Not implemented.
**Date:** 2026-10-30
**Phase:** 3 of the proposed REDOWN reading experience
**Depends on:** [Phase 1: Simple continuous page reading](03_COMIC_AND_IMAGE_READING_MODES.md); [Phase 2: Scrolldown (Pretty)](05_PHASE_2_SCROLLDOWN_PRETTY_DOCUMENT_AND_ARCHIVE_READER.md)
**Target:** Modern REDOWN Explorer directory/folder views, in Window or Side Preview as feasible.

## 1. A distinct idea from Pretty

**Regular Scrolldown:** Pages of one document, image sequence, PDF or comic appear stacked vertically and scroll naturally. **The original File Explorer remains the background**, without themed takeover or black/dim/glass overlay.

**Scrolldown (Pretty), Phase 2:** The same main vertical reading lane becomes an immersive *multi-file reader*, with three previous first-page/cover tiles on the left and three next covers on the right. Dimmed/Glass/Black are optional only there.

**Phase 3: Directory Scrolldown:** Apply the natural vertical, continuous-reading experience to **an entire directory**. Instead of opening one document at a time, the user can see the directory's readable contents as one ordered scrolling collection. The ordinary Explorer still exists around the experience and retains its original background.

This is not just a longer file list, nor a forced Pretty carousel; it is a new *directory presentation mode*. Users may continue using traditional Grid/List views.

## 2. Directory presentation

- Add a discoverable **Scrolldown** option alongside current Grid/List folder views, or offer **View directory in Scrolldown** as a deliberate action; do not change the default folder layout without an explicit user choice.
- In a directory, show its supported files as readable content blocks in the selected sort order: images full-width where suitable, PDFs/Word documents as lazily rendered pages, CBZ/ZIP comics as lazily rendered pages, and ordinary textual formats as their safely rendered text where supported.
- Each file has a clear, elegant **filename/identity separator** between its own pages and the next file's pages; visually distinguish source boundaries while avoiding a cluttered wall of cards.
- A folder of twenty comics can therefore become a vertically continuous library; so can a folder of PDFs, a photo archive, or a mixed directory of readable files.
- **Do not silently recurse through every nested subfolder by default.** Show the current directory's immediate children in a defined order. Represent subdirectories as expandable headers or folder navigation links, with an explicit opt-in for recursive/expanded subfolder reading later.
- When the next file is encountered, transition naturally to its first page/cover while preserving that item's identity. Do not generate flattened giant concatenations of all files.
- Source files remain untouched; this is a virtual rendering layer over Cloudflare storage, not extraction/re-upload.
- Support files with no inline renderer using an honest metadata card with Open/Download, not a blank or misleading page.
- Keep folder sorting (name, natural sequence, date, etc.), filters and actual object identities consistent with Explorer.

## 3. Lazy loading and bounded virtualization

- A directory may hold thousands of files, some with hundreds of pages. **Never mount every page of every file into the DOM**.
- Maintain a two-tier virtualized logical sequence: first the directory's file list, then page sequences only for nearby/active files.
- For the actively viewed file, initially target **current page ±5** as in Phase 1/2. Nearby next/previous files can contribute just covers/metadata until they enter the viewport.
- Estimate page heights, preserve scroll anchor when entering/leaving a file, and measure/correct layout without visible jumps when exact geometry becomes known.
- Unmount far-away pages and whole remote documents, abort obsolete requests, revoke object URLs and reclaim decoding resources. Concurrency and memory budgets must cover **the whole directory reader**, not separately unlimited budgets per file.
- Incrementally fetch directory listings and render when needed; remain responsive with very large buckets and pagination.
- Track a visible position as `{bucket, directoryPrefix, fileKey, fileVersion, pageIndex, offset}` so scroll and back navigation can restore the correct point without guessing.
- If a file's contents are corrupt/unavailable, retain its place and show a retryable placeholder, then continue on request.

## 4. Navigation, selection and escaping

- Mouse wheel, trackpad and **Up/Down** scroll the whole directory reader naturally.
- Folder headers, file boundaries and page markers may have explicit Jump to Next/Previous File buttons and optional keyboard shortcuts. Do **not** force Left/Right to mean file-switching in the ordinary directory Scrolldown unless the user activates a dedicated file navigation mode; Phase 2 Pretty specifically owns Left/Right for adjacent documents.
- Clicking a file's header can open its normal Preview or Pretty view without losing the directory Scrolldown position. Returning restores the scroll anchor.
- **Escape goes back one level** to the prior Explorer directory view/preview. A transient lightbox/menu/zoom dismisses first. Preserve folder, selection, filter, sort and scroll offset.
- Do not intercept keyboard arrows from focused controls, native PDF selection/editing, inputs or accessibility widgets.
- Keep accessible semantic headings, page labels, folder navigation, visible controls and keyboard focus restoration.

## 5. Visual constraints

- **Original Explorer background remains visible.** No automatically black, gray-dimmed or frosted-glass takeover in regular directory Scrolldown.
- Smooth vertical reading, refined separators, consistent margins and page shadows only where they preserve legibility; the styling must respect the selected Explorer theme.
- Narrow Explorer layouts (including a wide Chrome Side Panel) must remain readable without horizontal overflow or crushed columns.
- This mode is separate from the optional three-left/three-right cover rails of Pretty.
- Respect reduced motion, screen reader preferences, file privacy, and explicit user intent.

## 6. Supported content & archive safety

- Read PDFs, DOCX and other formats only when their adapters/renderers are genuinely available. Where Word conversion needs an isolated service, the UI states that clearly.
- For CBZ/ZIP, re-use REDOWN's validated archive index and individual entry-read routes. Images render in logical page order; an archive without images shows a traditional archive/metadata card.
- Enforce authorization and safety limits for archives and untrusted document conversion, with no automatic public bucket enablement.
- Mixed directories may offer type filters (Images, Documents, Comics & archives, All readable) and a view of skipped/unsupported items.
- No automatic transfer, extraction to R2, folder mutation or mass fetch should result simply from entering Scrolldown.

## 7. Acceptance tests

1. A folder of images renders as one continuous scroll with separators and original Explorer background.
2. A folder of PDFs displays lazily rendered pages across document boundaries with correct filenames and page counts.
3. A folder of CBZ/ZIP comics scrolls pages across archive boundaries without manual extraction; each archive's pages keep natural order.
4. A mixed directory shows each supported file and honest placeholders for unsupported files.
5. A nested folder remains a navigable folder by default; no unintended recursive scanning.
6. In a 1,000-file directory, DOM, memory and network usage stay bounded, including after rapid scrolling.
7. Escape returns one interface level and restores the original directory list location and scroll; reopening Scrolldown can resume the logical anchor.
8. Phase 2 Pretty remains independently selectable; ordinary Scrolldown never inherits Black/Dimmed/Glass backgrounds or the mandatory three-neighbor rails.
9. Existing Grid/List modes, copy/move, filename selection, sort/filter and keyboard navigation keep working.

**Implementation note:** Introduce shared reader primitives (file/page sequence, source adapter, preview cache, virtual scroll, anchor restoration) rather than duplicating full document renderers for individual-file and directory modes.
