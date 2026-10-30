# REDOWN Latest Proposals | October 30, 2026

**Status:** PROPOSALS ONLY. None of the features described here is implemented by these documentation commits.

**Target repository:** `thanks-cohn/REDOWN`
**Target branch:** `release/cloudflare-true-remote`
**Date:** 2026-10-30
**Scope:** The modern REDOWN Explorer, with deliberate parity checks against Legacy Explorer. Preserve the protected baseline and private-by-default behavior.

## Proposals

1. [01 | URL List Batch Remote Ingest](01_URL_LIST_BATCH_REMOTE_INGEST.md): Add an uploaded list of source URLs to **Send URL to Cloud**, plus an inspectable programmatic batch interface. Reuse the existing remote ingestion pipeline and batch executor.
2. [02 | Specialty-First Explorer Toolbar](02_SPECIALTY_FIRST_EXPLORER_TOOLBAR.md): Remove duplicated low-frequency actions from the always-visible top command area, not from the product. Retain essentials and foreground distinctive REDOWN operations.
3. [03 | Comic and Image Reading Modes](03_COMIC_AND_IMAGE_READING_MODES.md): Separate preview placement (Window/Side) from reading mode (Single/Continuous Scroll/Two-Page Book). Lazy-load a bounded image window, and support ZIP/CBZ without manual extraction.
4. [04 | Expandable Breadcrumb Hierarchy](04_EXPANDABLE_BREADCRUMB_HIERARCHY.md): Bring the earlier conversation's responsive directory-path presentation into the same proposal collection. Abbreviated ancestors can expand into independent rows in exact path order.
5. [05 | PHASE 2: Scrolldown (Pretty) for Documents & Archives](05_PHASE_2_SCROLLDOWN_PRETTY_DOCUMENT_AND_ARCHIVE_READER.md): A separate styled reader for PDF/DOCX and CBZ/ZIP libraries: active vertically-scrolling file in the center, three previous and three next first-page/cover thumbnails in side rails, Left/Right changes files, Up/Down scrolls pages, background choices Dimmed/Glass/Black, and one-level Escape.
6. [06 | PHASE 3: Directory Reading Modes](06_PHASE_3_DIRECTORY_SCROLLDOWN.md): Treat a whole directory as a reader source, then switch between **Scrolldown, Reader and Magazine** views, including images, **videos**, documents and comics. Keep regular Scrolldown on the original Explorer background; reuse the existing media/page rendering and lazy-loading machinery.
7. [07 | PHASE 4: REDOWN ExtremeScale](07_PHASE_4_EXTREME_SCALE_READER_TILED_RENDERING.md): Extreme PDF and giant-image performance using range-aware fetches, virtual pages, multi-resolution tiles, optional six-plus specialized Worker/service roles and reproducible public benchmarks rather than unsupported unlimited-size promises.
8. [08 | FUTURE PHASE 5: Open API, Desktop Companion & File Intelligence](08_PHASE_5_OPEN_API_DESKTOP_FILE_INTELLIGENCE.md): Shared API concepts for tagging, annotations, model-assisted organization, opt-in local inference/training, portable metadata, and optional native desktop integration; explicit capability permissions and private-by-default processing.

## Reader-phase terminology (important)

- **Phase 1: regular Scrolldown** is the pages of one file/image sequence arranged vertically, with **the original Explorer as the background**. It does not require side rails or any dark overlay. Book mode is separately proposed in Phase 1.
- **Phase 2: Scrolldown (Pretty)** is a distinct enhanced visual reader for multi-document and archive libraries: three preceding/three following first-page or cover images flank the active scrolling document; only Pretty offers Dimmed/Glass/Black backgrounds.
- **Phase 3: directory reading modes** takes a *directory* instead of one document as the reader source. Users can choose **Scrolldown** (continuous mixed-media vertical reading, original Explorer background), **Reader** (focused pages/spreads) or **Magazine** (responsive editorial mixed-media layout). Supported videos get lazy, controlled playback. All use the same logical source/adapters and maintain exact file identities.

## Longer-term architecture

- **Phase 4: ExtremeScale** seeks exceptional verified reading performance for enormous PDFs and images with bounded memory, tiles and appropriately sized rendering services. Multiple Cloudflare Worker roles are optional; benchmark before splitting.
- **Future Phase 5: Open API + Desktop File Intelligence** makes file IDs, metadata, tagging and annotations portable between REDOWN's extension, desktop companion and explicitly authorized third-party integrations. Local models can propose organization and optional approved training; never silently analyze or mutate private files.

## Principles across all proposals

- **No scope creep:** These files document future work; they must not change existing runtime behavior.
- **Reuse production paths:** Do not create duplicate ingestion, transfer, archive parsing, clipboard, or preview engines when existing ones are usable.
- **Preserve actual paths and identities:** UI abbreviations and menus must not rewrite object keys.
- **Privacy by default:** No implicit public bucket activation, exposure of stored source URLs, or remote operations before explicit user action.
- **Verifiable outcomes:** A request dispatched to a Worker is not automatically a verified complete transfer. Surface completed, partial, cancelled, failed and uncertain states.
- **No feature regression:** Keep the Legacy archive browsing, selective extraction, cross-bucket archive transfers, media/3D previews, accessible keyboard actions and remote search in the parity plan.
- **Responsive and polished:** Keep controls usable even when Chrome's Side Panel reduces the Explorer viewport; test small widths and tall/short windows.
- **Test and document before shipping:** Add focused unit/integration checks, real-browser visual tests and failure-mode checks.

## Proposed implementation order

**First:** URL list parser plus preview of batch plan and safe ingestion orchestration.

**Second:** Reader mode/state model, image virtualization, book spreads, then ZIP/CBZ integration. **Phase 3 extends the reader's source to directories and adds mixed-media Scrolldown, Reader and Magazine presentations, including videos**, without duplicating the content engine.

**Third:** Specialty-first toolbar refactor after the actions have reliable deep links and tests.

**Fourth:** Expandable breadcrumb presentation as an independent, non-destructive navigation improvement.

Work may be sequenced differently; none is approved as implemented by this document.
