# IMPORTANT | PHASE 4: REDOWN ExtremeScale, Extreme-Size PDF and Image Reading

**Status:** PROPOSAL ONLY. No runtime implementation.
**Date:** October 30, 2026
**Branch:** `release/cloudflare-true-remote`
**Dependencies:** Phase 1 Scrolldown; Phase 2 Scrolldown (Pretty); Phase 3 directory Scrolldown, Reader, and Magazine.

## Vision and differentiator

The owner wants REDOWN to develop *street credibility* with verifiable demonstrations of enormous PDF page counts, high-resolution scans, comics, and huge raster images loading rapidly and stably in-browser, akin to the responsiveness of efficient lightweight desktop readers. A convincing, reproducible public benchmark is a major reason for users to try the product.

**Goal:** Show the largest *practically supported* document/image collections, with rapid time to first page, fluid random page jumps, zoom, bounded browser memory, and graceful behavior under bad networks. Do **not** promise universal unlimited file sizes or absence of every failure.

Potential public tagline: **"Read the impossible without loading the impossible."** This is aspirational, not a benchmark result.

## The key technical distinction

**PDF transport:** R2 supports byte ranges. PDF.js can request parts of PDFs if the private gateway correctly implements Range, HTTP 206, Content-Range, Content-Length, validators and accepts progressive access. Pages map to PDF objects that may be scattered in the source, not contiguous byte chunks.

**Huge image transport:** Arbitrary JPEG/PNG byte chunks are *not* independently decodable rectangular tiles. Truly enormous originals need a compatible region decoder or one-time preprocessing into a **multi-resolution tile pyramid**, where the client downloads only currently visible 256px or 512px tiles at the appropriate zoom level.

**Compute and memory:** A decoded RGBA 512x512 tile is ~1 MiB. A 100,000x100,000 monolithic 8-bit RGBA image is ~37.3 GiB before decoder and GPU overhead. Browser canvas/image decoder limits, GPU textures, memory, CPU, bandwidth, latency and source-format characteristics all matter. A smaller on-screen CSS size does not eliminate the decoded source allocation.

## Explore SIX OR MORE Workers, without assuming more is automatically better

The user's proposal is **not capped at two Workers**. Six or more independent Cloudflare Workers/services may be worthwhile when they have clear duties and benchmarked benefits. Distinguish *logical service roles* from independent deployed Workers.

1. **Private File Gateway:** identity/authentication, exact R2 key/version validation, byte-range reads, conditional response handling, and private archive entry reads.
2. **Index/Metadata Worker:** page count, dimensions, archive index, page geometry, and directory media manifests; stores only bounded metadata.
3. **Resolution Planner:** viewport, zoom and device-pixel-ratio based choice of tile resolution and available levels; returns manifest and priorities.
4. **Render Orchestrator:** deduplicates heavy conversion tasks, controls concurrency, cost quotas, retries, cancellation and durable status.
5. **Tile/Preview Delivery:** serves private versioned tiles, low-resolution overview, cover image caches, and scoped expiring access.
6. **Telemetry and Benchmark Service:** collects rendering latency, cache hit rates, memory estimates, failure modes and cost, without leaking user file content.
7. **Optional Prefetch Scheduler:** prioritizes active visible tiles and upcoming pages while avoiding overfetch and head-of-line blocking.
8. **Optional Document Conversion Coordinator:** bridges to an isolated PDF/image/Office renderer when browser-safe rendering is insufficient.

These are candidate roles. **A Cloudflare Worker isolate still has its own runtime/memory limits; six Workers do not combine into one giant image-decoding heap.** A web-browser **Web Worker** is different from a Cloudflare Worker. Test whether combining some roles into fewer services is faster and cheaper.

**Heavy processing:** For exceptionally large PDFs/raster inputs, dispatch a bounded task to a resource-equipped **Cloudflare Container** or comparable isolated native rendering service (e.g. PDFium/MuPDF, libvips, with validated inputs). Another edge Worker by itself may not be appropriate for conversion. Use queues/workflows for durable jobs rather than a request that stays open indefinitely. Require explicit cost controls, quotas, privacy and correct source versioning.

## Reader pipeline

```text
REDOWN Reader (Single / Scrolldown / Pretty / Directory / Magazine)
    |
    +--> Private gateway --> R2 HTTP ranges --> PDF.js visible pages
    |                                           (client Web Worker)
    |
    +--> Metadata/catalog --> Tile manifest and zoom levels
                                 |
                                 +--> cached authorized tiles from R2 --> browser viewport
                                 |
                                 +--> missing tiles --> bounded render queue
                                                         |
                                                   native renderer/container
                                                         |
                                                   private R2 tile pyramid
                                                         |
                                                   viewport-composited tiles
```

The same renderer/caching layer should support all earlier phases. It changes **source adapter**, not the fundamental document reader, when a directory rather than one file is the input.

## Requirements

- Virtualize the page stream. Start with current page and about five before/after **where memory permits**; a 100,000-page PDF must not create a 100,000-page DOM.
- Separate document metadata, page text/links/annotations, low-resolution previews, raster tiles and decoded GPU assets. Preserve searchable/selectable PDF text where feasible.
- Maintain stable scroll and zoom anchors; fill low-resolution tiles first and progressively refine. Avoid flashes/blank pages and repeated network downloads.
- Track memory in bytes, not simply by tile count; cap browser decode bytes, cached DOM/canvas/image bitmaps, network concurrency, job queue and storage consumption. Decrease prefetch and quality under pressure.
- Preserve private-by-default file access; source keys and version/ETag go into tile cache identity. Prevent cross-user cache leakage and stale images after object replacement.
- Keep originals untouched. Store temporary derivatives separately and with explicit retention/cleanup controls. Never automatically enable public bucket access.
- Avoid unbounded conversion or surprise bills. Before invoking heavyweight processing, show quota/cost implications or use the user's configured budget. Provide honest fallback or download.
- Handle expired permissions, corrupt PDFs, unsupported image codecs, missing tiles, damaged source ranges, renderer termination and recovery without a frozen UI.
- Distinguish successfully opened file, successfully rendered page, and successfully displayed **full-detail** tiles; do not count low-res thumbnails as successful original-resolution imaging.

## Reproducible Street-Cred Scoreboard

Measure and publish **results, not boasts**:
- Highest real and synthetic PDF page counts successfully navigated, including a jump near the end.
- Largest original PDFs by byte size and largest/most complicated individual pages rendered.
- Largest original image pixel dimensions whose **full detail** was actually accessible via tiles.
- Time to first usable page/tile; p50/p95 page turns; p50/p95 zoom-to-sharp and random page jump.
- Browser memory plateau, estimated decoded/GPU assets, request concurrency and renderer crash/recovery.
- Network bytes used for first page and random jump; verified 206 partial-response evidence.
- Cache hits, conversion processing time and **cost per document**, storage used by derivative tile pyramids.
- Cold and warm cache results on documented hardware, browser, network bandwidth and file identities.

Test corpus: 10, 100, 1,000, 10,000 and 100,000+ valid synthetic PDF pages when feasible, alongside representative difficult real files. Test 8K/16K/32K/64K and higher-resolution images through a real tile-generation path; modest-memory laptops; constrained network; 30-minute sustained scrolling/zoom; rapid jumping; and an interrupted render service.

## Acceptance criteria

1. Very large page counts do not yield proportional DOM or decoded-image growth.
2. A verified page jump near the end does not require rendering intermediate pages.
3. 206 range reads are observed, not merely assumed; incorrect 200 responses do not count as successful ranges.
4. A huge image previously unsuitable for a single canvas becomes navigable with individually decoded high-detail tiles if a safe conversion path exists.
5. User can zoom and scroll while only visible/nearby regions remain active, and the browser remains responsive within a measured budget.
6. Corrupt pages, source replacement, job failures and authentication expiry recover gracefully with transparent warnings.
7. One, two, four and six-plus Worker/service architectures are compared; only justified partitioning is retained.
8. Public benchmarks contain repro details, clear limitations and cost accounting, never unverified superlatives.

## Relevant official references (reverify limits before implementing)

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- https://developers.cloudflare.com/containers/
- https://developers.cloudflare.com/workflows/
- https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html

**Principle:** Deliver *only the pixels needed right now*, at the resolution necessary for the current viewport.
