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
6. [06 | PHASE 3: Scrolldown for Directories](06_PHASE_3_DIRECTORY_SCROLLDOWN.md): Extend ordinary continuous scrolling across all readable contents of a directory without extracting archives or losing the original Explorer background.

## Reader-phase terminology (important)

- **Phase 1: regular Scrolldown** is the pages of one file/image sequence arranged vertically, with **the original Explorer as the background**. It does not require side rails or any dark overlay. Book mode is separately proposed in Phase 1.
- **Phase 2: Scrolldown (Pretty)** is a distinct enhanced visual reader for multi-document and archive libraries: three preceding/three following first-page or cover images flank the active scrolling document; only Pretty offers Dimmed/Glass/Black backgrounds.
- **Phase 3: directory Scrolldown** takes the *regular* continuous vertical reading experience to the whole directory, stacking the readable contents of many files while retaining the original Explorer background.

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

**Second:** Reader mode/state model, image virtualization, book spreads, then ZIP/CBZ integration.

**Third:** Specialty-first toolbar refactor after the actions have reliable deep links and tests.

**Fourth:** Expandable breadcrumb presentation as an independent, non-destructive navigation improvement.

Work may be sequenced differently; none is approved as implemented by this document.
