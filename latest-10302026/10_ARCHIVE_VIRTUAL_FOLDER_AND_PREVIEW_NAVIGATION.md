# 10 — Legacy-derived ZIP/CBZ virtual folder browsing and page preview

**Branch:** `release/cloudflare-true-remote`
**Scope:** Phase 1 incremental archive-read refinement; no new reader engine and no cross-cloud changes.
**Status:** Code committed with pure-model and UI regression tests. Source syntax and pure-model checks completed; actual installed Chrome and R2 signed-entry rendering still need verification.

## What made the Legacy archive viewer feel like a directory

Legacy `extension/options.js` stores the archive's full indexed entries in `explorerArchive`, and `renderArchiveFolder(prefix)` projects those names into *immediate folders* and *immediate files*:

- `Book/Chapter/001.webp` appears under a virtual `Book` folder at the root.
- Opening `Book/` reveals `Chapter/`; opening `Book/Chapter/` reveals `001.webp`.
- No R2 ZIP object mutation or extraction is needed to navigate.
- `cfArchiveEntries` asks the existing Worker for `listArchive`; `cfArchiveEntryUrl` asks it for `createArchiveEntryReadUrl` for the selected individual entry.
- Extraction remains the independent `cfExtractArchive` route.

The former Beta archive dialog instead renders every ZIP/CBZ item as an extraction checkbox, with optional nested `<details>`, but no individual entry-reading state.

## Phase 1 adaptation (implemented)

- `extension/beta/archive-browser.mjs`: pure Legacy-style virtual directory projection, natural page ordering, parent/breadcrumb paths, safe index paths, next/previous page lookup.
- `extension/beta/file-api.mjs` + `r2-adapter.mjs`: add `archiveEntryUrl` as a **read** operation through the original `cfArchiveEntryUrl` message, not an extraction operation. The read route requests `betaNoProvision`; missing Worker is an explicit error rather than silently deploying one.
- `extension/background.js`: honor the no-provision flag for signed archive entry reads.
- `extension/beta/explorer.html` / `explorer.css`: convert the archive dialog to a small, polished virtual directory browser with Up, hierarchical breadcrumb, per-folder file list, adjacent Preview **Previous/Next**, and selection controls for optional extraction. Supports narrow viewports and ordinary keyboard focus.
- `extension/beta/explorer.mjs`: one archive index is loaded for the session, directories are projected locally, and only selected compatible individual entries request signed preview URLs. Images, audio, video, PDF and text are eligible when the signed endpoint/browser support rendering; unsupported formats show a non-destructive notice. ArrowLeft/ArrowRight in the reader traverses the current folder's files, while Alt+ArrowUp moves to its parent. Entering a single enveloping folder automatically makes common comic archives easier to read. Click/select in Explorer, then left/right on the ZIP row or Preview's previous/next control to enter the reader, or use **Open ZIP/CBZ**, Preview/Read, or double click.
- Extract selected stays distinct, only moves explicitly checked entries to the requested R2 destination and must preserve the original ZIP/CBZ. Selecting all checks every indexed file even across subfolders, while users can select individual files across multiple virtual directories.

## Important limits

This is a **virtual directory inside the archive reader**, not an R2 filesystem folder and not a new copy of the entire Explorer engine. It does not automatically change the top-level Explorer breadcrumb path, move archive entries, or download/extract the full archive. Browser preview requires the existing Worker to return a valid signed entry URL; CORS or MIME handling may limit inline text/PDF rendering. Do not claim these live routes are verified until tested against an installed Chrome extension and real R2 ZIP/CBZ files.

The attached Phase 1 request includes separate toolbar, breadcrumb and URL List features. This follow-up changes only archive browsing, preview traversal, and necessary read/API glue; do not interpret it as implementing the rest of Phase 1.

## Verification

- `tests/archive-browser.test.mjs`: nested paths, natural sorting, adjacent-page bounds, parent breadcrumbs, ignored unsafe path entries.
- `tests/beta-explorer.test.mjs`: CBZ selection via ArrowRight, virtual-folder opening, Previous/Next and ArrowLeft, signed per-entry URL route, no implicit Worker provisioning, optional single-entry extraction without modifying archive.
- `tests/helpers/beta-provider.mjs`: fixture archive preview responses. This is not evidence of a real signed URL rendering in Chrome.

**Manual acceptance:** Open a CBZ with two or more chapter folders, click chapter, use ← → (and Previous/Next), return Up and re-enter, check one file and Extract Selected, inspect original unchanged, close/reopen, test failed read URL and reduced-motion/narrow layout. Verify text and PDFs with actual signed URL content-type/CORS.
