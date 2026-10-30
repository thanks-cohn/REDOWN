# IMPORTANT PROPOSAL: Smart Scroll and Two-Page Comic Reader

**Status:** PROPOSAL ONLY, NOT IMPLEMENTED
**Targets:** Both **Window Preview** and **Side Preview** in modern Explorer, and ZIP/CBZ content inspection.
**Goal:** A useful reader for comics, scanned pages, illustrations and ordered image folders without downloading and unpacking everything manually.

## Two independent settings (do not combine them)

**Preview placement**
- Window Preview
- Side Preview

**Reading mode**
- Single Image (current behavior / baseline)
- **Continuous Scroll** (also called Webtoon/Vertical Scroll)
- **Two-Page Book** (paired pages side-by-side)

Both dropdowns should be visible in the preview controls when relevant. A user can choose any reading mode in either Window or Side placement. Persist both independently and retain the user's existing window/side preference. A mode can be disabled with an explanation when the selection is not an image sequence.

## Continuous Scroll: bounded windowed rendering

- Build a stable **logical page list** from images in the current folder or within a ZIP/CBZ. Use natural filename ordering (for example, `page2` precedes `page10`) with an optional manual sort override.
- Render images in a continuous vertical flow. Preload a bounded neighborhood, suggested initial target **five pages before and five pages after the active page**. The active page and adjacent pages must remain present.
- Use `IntersectionObserver` or equivalent viewport tracking, stable item keys, and placeholder/sizer elements so earlier pages can unmount without scroll position jumping. Track the active reading anchor and pixel offset across DOM changes.
- The 5+5 amount is a **starting policy**, not a hard memory guarantee. Adapt to available device memory, actual decoded image size, velocity, network and measured performance. Avoid decoding all pages when a CBZ contains hundreds of high-resolution images.
- Cancel obsolete fetches on rapid jumps, throttle prefetch, release object URLs, dispose image bitmaps and revoke temporary archive-entry URLs where appropriate. Do not claim memory is released until references have been dropped.
- On failures, show a retryable placeholder in the correct page position. Do not reorder or skip pages silently.
- Provide page progress, jump-to-page, next/previous and return-to-last-position. Optional full-width fit and zoom controls. Respect reduced-motion and accessible focus.

## Two-Page Book

- Display a synchronized pair as a spread, maintaining the original sequential order.
- Default left-to-right reading; add a future right-to-left option for manga and mirrored spread navigation. Page numbers, visible page labels and keyboard arrows must reflect this choice.
- Optional cover-page-alone setting; if there is an odd page count, display the last page with a blank companion rather than repeating or dropping an image.
- Fit pages to the available Window or Side container without distortion. Preserve each image's aspect ratio. In a narrow Side Preview, fit both pages at a readable scale if possible, or offer a clearly signaled single-page responsive fallback without changing the saved book-mode choice.
- Use a small bounded prefetch window around the current spread, avoid decoding the entire book and cancel obsolete requests when the user jumps.
- Permit click, keyboard and accessible buttons to turn pages. Expose current spread and total page count.

## ZIP / CBZ integration

- Legacy Explorer already supports opening ZIP/CBZ as a virtual directory, browsing nested entries and fetching individual entry previews. Modern Explorer currently has an **archive dialog for extraction** rather than equivalent full virtual-folder reading.
- Build the reader over the existing archive entry listing and read-URL services instead of extracting entire archives by default. Do not invent a separate unzip engine.
- Preserve archive-entry identity (archive key + entry path + bucket/account) for all page requests. Avoid using a shortened display name as the fetch key.
- Handle large, encrypted, malformed and unsupported archives explicitly. Respect current archive safety limits, expiring signed URLs and Cloudflare access checks.
- For nested directories in an archive, offer a scoped chapter/page list. Do not silently interleave unrelated folders.
- Do not assume a CBZ is always images only; filter supported content with clear count/omission reporting.

## UI acceptance tests

1. Switching Window ↔ Side preserves the chosen reading mode and current page; switching Single ↔ Scroll ↔ Book preserves the reading location where possible.
2. Continuous Scroll keeps only a bounded number of decoded pages mounted while maintaining smooth anchored scrolling over a 500-page simulated comic.
3. Rapid scrolling and switching folders do not show stale images or leak object URLs.
4. Two-Page Book shows correct spreads for odd/even counts, cover-alone and RTL reading; never duplicates or drops a page.
5. Side Preview stays responsive and does not force the entire Explorer into uncontrolled horizontal scrolling.
6. ZIP/CBZ reading requests individual entries and does not require extracting all archive contents.
7. Failure, cancellation, authorization expiry, keyboard and screen-reader flows are tested. No fake successful preview state.
8. Existing image, audio, video, PDF, text and other previews keep their working Single mode paths.
