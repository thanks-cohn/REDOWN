# IMPORTANT | PHASE 3: Directory Reading Modes (Scrolldown, Reader, Magazine)

**Status:** PROPOSAL ONLY. Not implemented.
**Date:** 2026-10-30
**Phase:** 3 of the proposed REDOWN reading experience
**Depends on:** [Phase 1: Simple continuous page reading](03_COMIC_AND_IMAGE_READING_MODES.md); [Phase 2: Scrolldown (Pretty)](05_PHASE_2_SCROLLDOWN_PRETTY_DOCUMENT_AND_ARCHIVE_READER.md)
**Target:** Modern REDOWN Explorer directory/folder views, in Window or Side Preview as feasible.
**Owner's principle:** Change the reader's **source** from a document to a directory. The reader should intuitively understand the directory as a sequence/collection of media, with the **same reading-mode machinery**, rather than requiring another bespoke viewer.

## 1. A distinct idea from Pretty

**Regular Scrolldown:** Pages of one document, image sequence, PDF or comic appear stacked vertically and scroll naturally. **The original File Explorer remains the background**, without themed takeover or black/dim/glass overlay.

**Scrolldown (Pretty), Phase 2:** The same main vertical reading lane becomes an immersive *multi-file reader*, with three previous first-page/cover tiles on the left and three next covers on the right. Dimmed/Glass/Black are optional only there.

**Phase 3: Directory Scrolldown:** Apply the natural vertical, continuous-reading experience to **an entire directory**. Instead of opening one document at a time, the user can see the directory's readable contents as one ordered scrolling collection. The ordinary Explorer still exists around the experience and retains its original background.

This is not just a longer file list, nor a forced Pretty carousel; it is a new *directory presentation mode*. Users may continue using traditional Grid/List views.

## 2. Phase 3: user-selectable directory reading modes

The directory is not restricted to a single Scrolldown appearance. **Users may change the viewing mode and its settings** on a directory, just as they may on a document. This is opt-in, reversible, and should coexist with existing Grid and List views.

Proposed `View directory as…` choices:

| Mode | Purpose | Primary presentation |
| --- | --- | --- |
| **Scrolldown** | The simplest immersive-through-content browsing without losing Explorer | Sequential images, document pages, video players and readable media blocks stacked **top to bottom**; original Explorer background stays visible |
| **Reader** | Focused reading of the directory as one collection | One logical item/page/spread at a time with page turns or the established **two-page Book** option; clear file/chapter boundaries; stable next/previous navigation |
| **Magazine** | A designed, editorial journey through the directory | Responsive multi-column, mixed-size layouts with featured images, text excerpts, embedded videos, document covers and chapter/section headings; user can move from overview to full-page/full-document reading |

**These are views of the same underlying directory, not independent copies or reuploads.** Reuse the shared page/source adapters, loading budgets, rendering primitives, navigation state and caching from Phases 1–2. Magazine is not an excuse to create an unrelated rendering engine.

Directory mode settings should expose:
- **Reading mode:** Scrolldown / Reader / Magazine. Grid and List remain standard Explorer views.
- **Preview placement:** Window / Side, preserved independently of the reading mode.
- **Media include filter:** All supported / Images / Videos / Documents / Comics & archives, with explicit handling of unsupported files.
- **Ordering:** Inherit Explorer sort by default; natural filenames or curated ordering only when explicitly selected.
- **Density / fitting:** Fit width, original proportions, readable margins; Magazine may add Compact/Comfortable/Editorial density and optional featured-item sizing.
- **Book preferences (when applicable):** single/two-page spreads, cover-alone and optional right-to-left reading.
- **Video preferences:** autoplay **off** by default, muted previews **off** unless explicitly enabled, captions when available, poster/fallback thumbnail and controls; do not autoplay every video while scrolling.
- **Remembering choices:** last-used global preference with optional per-directory overrides keyed by actual authorized location; changing directories must not accidentally propagate a local override to unrelated folders.
- **Background:** Regular directory Scrolldown keeps the **original Explorer background**. Magazine and Reader should harmonize with the existing Explorer theme by default. **Dimmed/Glass/Black remains explicitly scoped to Pretty**, not silently enabled for these modes.

### The deceptively simple architectural shift: source scope

The reader already understands a single document as an ordered sequence of logical items. For Phase 3, make that same interface accept a **directory** as its source:

```ts
type ReaderSource =
  | {kind: "document"; accountId: string; bucketName: string; key: string; version?: string}
  | {kind: "directory"; accountId: string; bucketName: string; prefix: string; recursive: false};

type ReaderItem = {
  sourceKey: string;       // full identity, not a display abbreviation
  fileVersion?: string;
  kind: "image" | "video" | "document" | "archive" | "text" | "folder" | "unsupported";
  orderedPosition: number;
  pages?: PageDescriptor[]; // resolved incrementally for a visible document/archive
  presentation?: {title?: string; cover?: string; aspectRatio?: number};
};
```

This is a **proposed shape**, not an existing API contract. A source adapter produces logical content; Scrolldown, Reader and Magazine each **render that same logical content**. A directory adds file boundaries, pagination, next-file transitions, stable ordering and incremental discovery, but the document's page renderer remains the same. Preserve account/bucket/prefix and ETag/version identity, permission checks, and stable anchors.

## 3. Directory presentation

- Add a discoverable **Scrolldown** option alongside current Grid/List folder views, or offer **View directory in Scrolldown** as a deliberate action; do not change the default folder layout without an explicit user choice.
- In a directory, show its supported files as readable content blocks in the selected sort order: images full-width where suitable; **videos as embedded, controllable players with posters and lazy media loading**; PDFs/Word documents as lazily rendered pages; CBZ/ZIP comics as lazily rendered pages; and ordinary textual formats as safely rendered text where supported. The same source supports Reader and Magazine layouts without changing files.
- Each file has a clear, elegant **filename/identity separator** between its own pages and the next file's pages; visually distinguish source boundaries while avoiding a cluttered wall of cards.
- A folder of twenty comics can therefore become a vertically continuous library; so can a folder of PDFs, a photo archive, or a mixed directory of readable files.
- **Do not silently recurse through every nested subfolder by default.** Show the current directory's immediate children in a defined order. Represent subdirectories as expandable headers or folder navigation links, with an explicit opt-in for recursive/expanded subfolder reading later.
- When the next file is encountered, transition naturally to its first page/cover while preserving that item's identity. Do not generate flattened giant concatenations of all files.
- Source files remain untouched; this is a virtual rendering layer over Cloudflare storage, not extraction/re-upload.
- Support files with no inline renderer using an honest metadata card with Open/Download, not a blank or misleading page.
- Keep folder sorting (name, natural sequence, date, etc.), filters and actual object identities consistent with Explorer.

## 4. Lazy loading and bounded virtualization

- A directory may hold thousands of files, some with hundreds of pages. **Never mount every page of every file into the DOM**.
- Media-aware virtualization matters: mount only nearby video players; use poster images offscreen, pause when out of view, release buffers/streams appropriately, preserve time positions on return, and never let dozens of videos autoplay or download in parallel. Captions, seek, mute and pause controls must remain reachable.
- Maintain a two-tier virtualized logical sequence: first the directory's file list, then page sequences only for nearby/active files.
- For the actively viewed file, initially target **current page ±5** as in Phase 1/2. Nearby next/previous files can contribute just covers/metadata until they enter the viewport.
- Estimate page heights, preserve scroll anchor when entering/leaving a file, and measure/correct layout without visible jumps when exact geometry becomes known.
- Unmount far-away pages and whole remote documents, abort obsolete requests, revoke object URLs and reclaim decoding resources. Concurrency and memory budgets must cover **the whole directory reader**, not separately unlimited budgets per file.
- Incrementally fetch directory listings and render when needed; remain responsive with very large buckets and pagination.
- Track a visible position as `{bucket, directoryPrefix, fileKey, fileVersion, pageIndex, offset}` so scroll and back navigation can restore the correct point without guessing.
- If a file's contents are corrupt/unavailable, retain its place and show a retryable placeholder, then continue on request.

## 5. Navigation, selection and escaping

- Mouse wheel, trackpad and **Up/Down** scroll the whole directory reader naturally.
- Mode-specific navigation: Scrolldown uses continuous vertical scroll; Reader uses explicit page/spread turns and Next File; Magazine navigates editorial sections and opens an item in a focused reader. All modes can jump between files without losing the actual location.
- When a video player, its seek bar, an input, a menu, or another native widget has focus, do not commandeer its arrow keys or Space from playback/selection controls.
- Folder headers, file boundaries and page markers may have explicit Jump to Next/Previous File buttons and optional keyboard shortcuts. Do **not** force Left/Right to mean file-switching in the ordinary directory Scrolldown unless the user activates a dedicated file navigation mode; Phase 2 Pretty specifically owns Left/Right for adjacent documents.
- Clicking a file's header can open its normal Preview or Pretty view without losing the directory Scrolldown position. Returning restores the scroll anchor.
- **Escape goes back one level** to the prior Explorer directory view/preview. A transient lightbox/menu/zoom dismisses first. Preserve folder, selection, filter, sort and scroll offset.
- Do not intercept keyboard arrows from focused controls, native PDF selection/editing, inputs or accessibility widgets.
- Keep accessible semantic headings, page labels, folder navigation, visible controls and keyboard focus restoration.

## 6. Visual constraints

- **Original Explorer background remains visible.** No automatically black, gray-dimmed or frosted-glass takeover in regular directory Scrolldown.
- Reader and Magazine default to the same Explorer theme. Preserve existing color schemes and contrast; any alternate immersive background must be a separate, explicitly chosen treatment and must not mutate the definition of regular Scrolldown.
- Smooth vertical reading, refined separators, consistent margins and page shadows only where they preserve legibility; the styling must respect the selected Explorer theme.
- Narrow Explorer layouts (including a wide Chrome Side Panel) must remain readable without horizontal overflow or crushed columns.
- This mode is separate from the optional three-left/three-right cover rails of Pretty.
- Respect reduced motion, screen reader preferences, file privacy, and explicit user intent.

## 7. Supported content & archive safety

- Read PDFs, DOCX and other formats only when their adapters/renderers are genuinely available. Where Word conversion needs an isolated service, the UI states that clearly.
- Include common supported video media (e.g., MP4, WebM) as first-class directory items with HTML playback where browser codecs and private reads allow. Unsupported codecs must get an honest poster/metadata card and Open/Download fallback; a thumbnail Worker cannot be presumed capable of video transcoding.
- For CBZ/ZIP, re-use REDOWN's validated archive index and individual entry-read routes. Images render in logical page order; an archive without images shows a traditional archive/metadata card.
- Enforce authorization and safety limits for archives and untrusted document conversion, with no automatic public bucket enablement.
- Mixed directories may offer type filters (Images, Documents, Comics & archives, All readable) and a view of skipped/unsupported items.
- No automatic transfer, extraction to R2, folder mutation or mass fetch should result simply from entering Scrolldown.

## 8. Acceptance tests

1. A folder of images renders as one continuous scroll with separators and original Explorer background.
2. A folder of PDFs displays lazily rendered pages across document boundaries with correct filenames and page counts.
3. A folder of CBZ/ZIP comics scrolls pages across archive boundaries without manual extraction; each archive's pages keep natural order.
4. A mixed directory shows each supported file and honest placeholders for unsupported files.
5. A nested folder remains a navigable folder by default; no unintended recursive scanning.
6. In a 1,000-file directory, DOM, memory and network usage stay bounded, including after rapid scrolling.
7. Escape returns one interface level and restores the original directory list location and scroll; reopening Scrolldown can resume the logical anchor.
8. Phase 2 Pretty remains independently selectable; ordinary Scrolldown never inherits Black/Dimmed/Glass backgrounds or the mandatory three-neighbor rails.
9. Existing Grid/List modes, copy/move, filename selection, sort/filter and keyboard navigation keep working.
10. A mixed directory containing JPG/PNG, MP4/WebM, PDF, DOCX and CBZ/ZIP can switch **Scrolldown → Reader → Magazine → Grid** without changing source identity, reuploading files or losing the user's current file anchor.
11. In Scrolldown, video cards are visible in directory order, do not autoplay by default, pause/unload when far offscreen, and show accessible playback controls and usable unsupported-codec fallbacks.
12. Reader correctly turns logical pages/spreads, preserves document/file boundaries and exposes next/previous file navigation.
13. Magazine displays a responsive editorial composition with mixed media, readable captions/headings and an explicit Open/Read action. A narrow Side Preview avoids squeezed thumbnails and horizontal overflow.
14. Saved global mode and per-directory overrides remain independent. Regular Scrolldown never inherits Pretty's background overlay.
15. Escape and back navigation preserve the original directory anchor across mode changes; a playing video does not steal navigation keys from focused media controls.

**Implementation note:** Introduce shared reader primitives (file/page sequence, directory/document source adapters, mixed-media descriptors, preview cache, virtual scroll, playback lifecycle, anchor restoration). The core is **source scope + presentation mode**, not a different reader implementation for every directory and file type.
