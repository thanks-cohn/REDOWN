# IMPORTANT | PHASE 2: Scrolldown (Pretty), Document & Archive Carousel Reader

**Status:** PROPOSAL ONLY. Not implemented.
**Date:** 2026-10-30
**Phase:** 2 of the proposed REDOWN reading experience
**Depends on:** [Phase 1: Image and Comic Reading Modes](03_COMIC_AND_IMAGE_READING_MODES.md)
**Followed by:** [Phase 3: Directory Scrolldown](06_PHASE_3_DIRECTORY_SCROLLDOWN.md)
**Applies to:** Both Window Preview and Side Preview, where the layout fits

## Critical distinction: regular Scrolldown is NOT Pretty

**Scrolldown (regular)** means the current file's pages are simply arranged vertically, one after another, and the user scrolls through them. It keeps **the original REDOWN File Explorer background** and normal Explorer context. No black takeover, no dim overlay, no frosted glass, no flanking document gallery, and no change to how the folder looks. It is the simple inline/preview reading mode.

**Scrolldown (Pretty)** is a separate, intentionally immersive presentation:
- Central vertical document/comic reader.
- A left rail of first-page/cover thumbnails of the **three previous files** in the current directory.
- A right rail of first-page/cover thumbnails of the **three following files**.
- Optional **Dimmed**, **Glass** or **Black** backgrounds, **only in Pretty**.
- Left/Right switch between files; Up/Down scroll pages within the active file.
- Escape steps back one interface level, returning to the previous preview state.

Do not force Pretty aesthetics onto regular Scrolldown. Do not silently replace ordinary Scrolldown when enabling Pretty.

## 1. The Pretty composition

The selected document or comic occupies the large, readable center lane. Neighboring files in the same directory become a light, visual reference gallery.

- **Left column:** N-1 at top, N-2 below, then N-3. The nearest previous file is closest to the top of its rail.
- **Center:** N, the active full document or archive, rendered as a continuous stack of pages.
- **Right column:** N+1 at top, N+2 below, then N+3.
- Show up to six neighbor covers, not six full independently rendered documents. Each thumbnail displays the first readable page/cover, a compact title, and file type.
- Allow clicking a neighbor to switch the center; update both rails after navigation. Preserve real filename, identity, directory scope, and sorting.
- Natural filename ordering is an appropriate default for numbered comics; respect an explicit Explorer sort preference. Near boundaries, show only real neighbors without inventing/repeating files.
- Maintain a sense of ordered procession (a *rolling* or *revolving* library), but avoid distracting motion and excessive rendering.
- On narrow Side Preview windows, adapt rails to slim side trays/peeking thumbnails or an accessible list without making the central page unreadable.

## 2. PDFs, Word documents, and other common document types

- Prioritize **PDF** (`.pdf`), then Word **DOCX** (`.docx`); offer `.doc`, `.odt`, `.rtf`, `.pptx`, `.txt`, `.md`, etc. only as verified converters/renderers are added.
- The center shows the selected document's **pages top to bottom**, not merely one image of its first page.
- Display/select/copy actual text and follow links where the format renderer allows it. A page-image fallback must be identified honestly if text cannot be preserved.
- Generate a **first-page thumbnail** of each eligible document for the side rails.
- An existing Cloudflare Worker can authorize, coordinate and cache thumbnail generation. However, a Worker does **not** magically convert arbitrary PDF or Word files to images. Use a validated renderer (e.g., a PDF page renderer in a suitable environment; an isolated Office conversion engine for DOCX), with measured limits and a fallback icon if conversion is unavailable.
- No publishing or public access is needed; everything uses authorized private reads and appropriately scoped cached thumbnails.

## 3. CBZ and ZIP directories get the SAME Pretty experience

**A folder containing many CBZ/ZIP archives must be browseable like a shelf of books.**

- Each eligible archive is one *book* in the directory's file sequence.
- Inspect the archive's index and select its first legitimate image page as its thumbnail/cover. Do **not** blindly use the first raw ZIP entry.
- Ignore directories and common non-page metadata such as `__MACOSX`, `Thumbs.db`, dotfiles, and unrelated XML/text. Use natural page filename ordering, respecting inner folder/chapter ordering.
- If an explicitly identified cover image exists, prefer it when appropriate; otherwise use the first readable image in page order. Preserve the logical reading order even when the displayed cover is a special image.
- The three previous archive covers appear on the left; the three following appear on the right.
- **Left/Right** navigates to the previous/next CBZ or eligible ZIP file in the directory; **Up/Down** scrolls its interior pages vertically.
- A ZIP that contains no supported images is **not** silently treated as a comic. It remains an ordinary archive with an appropriate fallback and traditional file operations.
- For a mixed folder, offer an explicit collection filter (All readable / Documents / Comics & archives) so a user can choose the universe of files to iterate through; preserve their choice.
- **Do not extract every file in an archive** to disk or R2 to obtain the reader. Reuse the existing REDOWN ZIP/CBZ index and per-entry authenticated read paths. Fetch individual compressed entries, decode only as needed, and preserve the untouched original archive.
- Private source identity must include account, bucket, archive key, object version/ETag, and inner entry path; short display labels are never real fetch keys.

## 4. Lazy loading: 5 pages before, 5 pages after

- Keep **the active page plus approximately five preceding and five following pages** in the prioritized render/prefetch neighborhood, subject to a real memory budget.
- Use placeholders with stable page geometry and scroll anchoring so removing previous pages from the DOM never jerks the reading position.
- Identify the active page using viewport observation; eagerly load that page and immediate neighbors before distant pages.
- Limit simultaneous remote requests, rasterization, and decoded image memory. 11 enormous uncompressed pages may be too expensive; adapt down when needed.
- Cancel obsolete requests when scrolling fast or changing documents, revoke blob URLs and release canvas/image resources.
- Each side thumbnail uses only a small page-one/cover image and a separate budget, not 11 pages of its neighbor.
- Keep a reading-position bookmark for the active file when switching to another and back, subject to a clear privacy and retention policy.
- A failed page gets a retryable placeholder in the correct position; never silently skip/reorder pages.

## 5. Keyboard rules and one-level Escape

- **Left Arrow:** previous document/book. **Right Arrow:** next document/book.
- **Up Arrow / Down Arrow:** scroll **inside the currently selected document/book**. Wheel, touch, Page Up/Down and Home/End behave naturally.
- Click thumbnail to switch the active file. Provide visible previous/next controls for touch and accessibility.
- Never steal arrow keys from focused inputs, dropdowns, text selectors, native embedded viewers, zoom controls or nested dialogs.
- **Escape** closes the topmost temporary reader overlay first; otherwise exit **Pretty** back to the prior regular Preview/Explorer level, preserving selection and scroll position. It must not close the entire Explorer or unknowingly discard context.

## 6. Background choice belongs ONLY to Pretty

Provide a **Background** selector when Pretty mode is enabled:
1. **Dimmed:** original Explorer behind a controlled neutral/gray translucent overlay.
2. **Glass:** restrained translucent/frosted panels, refined borders and a sensible non-blur fallback.
3. **Black:** distraction-free black reading background.

The normal Scrolldown remains on **the original Explorer background** and must not inherit these choices. Preserve contrast, focus outlines, reduced-motion preferences and existing window/side preview settings.

## 7. Thumbnail job/cache architecture

1. Enumerate only files visible in the current authorized directory and chosen collection scope.
2. Check a cache keyed by exact file identity, version/ETag and renderer settings. Never show a prior object's cover for a newly replaced file.
3. **CBZ/ZIP:** use existing Worker archive indexing and signed/private entry reads to retrieve the first eligible image. Bound archive index, entry sizes, compression expansion ratio, decode memory and hostile-image handling.
4. **PDF:** render first page with a proven PDF renderer, client- or service-side as appropriate; do not promise native Word/PDF-to-pixels support in ordinary Cloudflare Workers.
5. **DOCX/other office:** send an authorized, bounded job to a sandboxed document conversion engine if configured. If no renderer is available, show a clean file-type card until support exists.
6. Cache private small cover images with authorization, expiration, renderer-version keys, single-flight deduplication and invalidation on content changes.
7. Prioritize main current document, then six visible covers. Avoid background conversions of whole large directories until they are needed.

## 8. Acceptance criteria

- The ordinary Scrolldown remains pages only, inside the original Explorer visual environment; enabling Pretty is explicit and reversible.
- In a folder of ten PDFs, file 7 displays three previous cover previews on the left (6/5/4) and three following covers on the right (8/9/10).
- A folder of ten CBZ/ZIP comics produces equally correct first-image cover thumbnails; Left/Right switches archives and Up/Down scrolls its pages without extracting the whole archive.
- A ZIP containing unrelated binaries and no images does not produce a fake comic cover.
- PDF/DOCX conversions are asynchronous, bounded and honest about unsupported formats.
- Current page ±5 lazy rendering stays bounded; scrolling and switching do not leak canvases/object URLs or jump unexpectedly.
- Dimmed/Glass/Black affect Pretty only; regular Scrolldown always keeps Explorer's background.
- Escape returns one level while retaining directory, source identity, selected file, focus and sensible reading position.
- Narrow Side Preview, keyboard controls, screen readers, failed reads, expired authentication, and malicious archives/documents have test coverage.

**Related future scope:** Phase 3 separately extends regular Scrolldown to **directories as collections**, not merely one open document. See [06](06_PHASE_3_DIRECTORY_SCROLLDOWN.md).
