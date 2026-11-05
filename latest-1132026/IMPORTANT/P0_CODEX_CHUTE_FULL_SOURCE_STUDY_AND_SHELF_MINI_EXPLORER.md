# P0 — Chute source-study contract for REDOWN Shelf Mini Explorer

**Date:** 2026-11-04
**Status:** Codex implementation request; not yet implemented or end-to-end verified
**Repositories:** `thanks-cohn/REDOWN` (destination) and `thanks-cohn/chute` (upstream reference)
**Priority:** P0 next Codex run

## Non-negotiable instruction

Do not imitate Chute from a screenshot, a README, or a description. **Study the current Chute `main` source itself**, including actual HTML, CSS, JavaScript, tests, extension background/service-worker, and Windows native bridge/runtime. REDOWN's existing Shelf and Explorer are the host. Deliver an elegant, fast, compact file explorer *within* the Shelf, with real Chute-powered drag-out to tested third-party file/image upload surfaces.

## Full source reference requirements

1. Check out the freshest upstream `thanks-cohn/chute` `main`, pin its exact SHA, and make its complete relevant source available locally to the REDOWN Codex workspace under `reference/chute/` (prefer a reproducible Git subtree or a documented pinned source sync). **Do not copy only the worker, README, or a few front-end files.** Include HTML, CSS, JS, manifests/configuration, native bridge/runtime, assets and tests needed to trace implementation. Do not include generated binaries, caches, secrets, tokens, private data, or redundant packaged outputs.
2. Keep Chute independently maintained. The reference is not an automatically packaged runtime dependency. Document an unambiguous process to update the pinned upstream snapshot and note local changes. Prefer explicit APIs/shared modules over forking the same feature twice.
3. Start with a source-map report containing exact source files and call chains: DOM + visual layout; stylesheet tokens, responsive rules and states; user interactions; selection; dragstart/drop/data transfer; host permissions and browser security constraints; local bridge protocols; staging bytes and content types; file and folder lifecycle; performance/concurrency, error/retry handling and tests. Distinguish confirmed working behavior from assumptions and README claims.
4. Trace the real payload from provider cloud bytes to drag event/native bridge to destination site. Preserve original file bytes, filename, extension and correct MIME; do not substitute a URL, thumbnail, or fake visual drag for a true accepted file.

## Architectural authority — owner's definitive clarification (2026-11-04)

**REDOWN's Universal File API is the sole authoritative engine behind the Shelf File Explorer. Chute is not the Explorer backend.** Borrow Chute's intuitive Shelf layout, interaction patterns, and proven drag-and-drop/Windows bridge capabilities only, with clean adapters. Do not clone Chute's own file-management data model or replace REDOWN's Universal File API with Chute's API.

**Left-hand cloud navigation rail:**
- The Shelf Mini Explorer shows **all connected/authorized cloud providers in a left sidebar**, designed to remain navigable at Shelf widths and in expanded/popout views; icons and readable labels are theme-aware.
- Cloud entries become expandable/collapsible navigation trees **where their actual provider capabilities and permissions allow**; S3-compatible connections, buckets, and authorized prefixes/folders are a primary requirement. Multiple S3 accounts/endpoints are distinct, never incorrectly nested under Cloudflare. Show buckets as expandable nodes, and their folder paths below.
- Non-S3 providers (Google Drive, Dropbox, OneDrive, etc.) appear in the same rail, and can offer expand/collapse when their Universal File API adapters support authorized listing; otherwise fall back gracefully to opening their existing view. Do not fabricate folder access.
- The active selection in the left rail determines what the **Universal File API** lists in the content pane. Lazy-load children on expand; cache/paginate safely. Preserve stable selection, scroll, keyboard operation, breadcrumbs, provider identity, account boundaries, and permissions.
- The left sidebar is a **presentation/navigation component**, not a separate storage engine. The existing REDOWN Universal File API remains responsible for provider authentication/capability checks, list, navigate, preview, file operations, and bytes retrieval; use it for the same source of truth across full Explorer and Shelf.
- Chute contributes visual/interaction references (HTML/CSS/JS), draggable cards, drag choreography, and the transport/staging bridge needed to turn Universal File API file bytes into genuine external drops. It must not become a competing source for cloud file state.
- Avoid packing the full desktop tree into a narrow Shelf: collapsible rail, compact labels, sensible overflow, and responsive alternatives. Existing Shelf History, GO TO, Quick Glance, preview behaviors, themes and popout should not regress.

**Required source-of-truth flow:**

```text
Connected cloud accounts (S3/R2, Drive, Dropbox, OneDrive, ...)
                  |
      REDOWN Universal File API
       /                      \
 left provider/tree rail    content listing + preview
       \                      /
          Shelf Mini Explorer
                  |
   Chute-derived drag interaction + bridge
                  |
    verified ChatGPT / Google / Yandex drop
```

**Acceptance guardrail:** Audit that Shelf and full Explorer resolve the same folders/files through the Universal File API (not diverging independent listings); prove an S3 account → bucket → nested folder expansion in the Shelf, and real drag-out of a listed file. Chute integration may not change the Universal File API's role or break cloud saving.

## REDOWN Shelf mini file explorer — UI

- Add a **compact, adorable, premium-quality mini Explorer** integrated into the existing Shelf UI and its themes, not a new floating/debug window. Intuitive like Chute, visually consistent with REDOWN.
- Show existing authenticated cloud providers and navigable authorized folders/files without weakening scopes or bypassing their own APIs. Reuse REDOWN's existing provider/explorer adapters instead of writing an unrelated second file engine.
- Support breadcrumbs, back/up, folder opening, single/multi selection where supported, visible file names, thumbnails/icons, keyboard navigation, loading/empty/error states, scrolling and stable layout. File cards should be draggable without confusing click-to-preview or click-to-open. Preserve existing Shelf tabs, History, GO TO, Quick Glance, Settings, accessibility, responsive dock/popout behavior, and provider sign-in flows.
- Respect current preview conventions (Side Preview, double-click Window Preview), non-overlapping Shelf/popout windows, and theme contrast. Avoid over-engineered UI in a narrow Shelf.
- Prefer virtualized/lazy list and bounded thumbnail decodes. Navigation and drag should remain responsive while previewing HD video or many images. The worker should not globally show 'busy' simply because a folder was clicked.

## Drag-out acceptance

- Enable real user-initiated file drags from REDOWN's Mini Explorer, reusing Chute's proven transfer/bridge mechanism.
- Destination matrix: ChatGPT real attachment drop; Google's named and tested image-search/Lens and/or Drive/Gemini upload surfaces; Yandex's named/tested image-search upload surface. Do not assert universal support on all Google/Yandex pages.
- Support same-window/cross-window handoff within platform and site limits; drop cancellation, unresponsive worker, expiry/reconnect, auth failure, unsupported MIME, large files, multi-file when supported, and OS/browser security restrictions.
- If Chrome's drag APIs cannot yield a real file acceptable to destination, use an explicitly authorized, documented Chute local bridge instead of claiming compatibility. No debug console, Python popup, extra file picker, or unexpected app window at drag time.
- Validate end-to-end that destination actually receives intended bytes; report staging versus accepted upload accurately. Do not claim success based on dragstart, visual animation, or worker acknowledgements alone.
- Keep temporary files private, short-lived and cleaned up. Do not send original web provenance URLs to cloud provider APIs unnecessarily or leak tokens into the reference.

## Delivery phases and evidence

1. **Audit:** source-map Chute's exact HTML/CSS/JS, worker, drag/drop flow, and REDOWN Shelf/explorer locations; pin upstream commit.
2. **Reference:** make the upstream source locally available and document sync/provenance; verify reference excluded from build packaging.
3. **Implementation:** integrate mini Explorer into Shelf using REDOWN's Universal File API exclusively for cloud file operations and Chute's transport exclusively for drag-out; add bounded concurrency/virtualization; avoid regressions.
4. **Testing:** automated unit/integration and manual/browser E2E tests covering file explorer, drag to real ChatGPT/Google/Yandex upload targets, Chrome worker restart, Windows bridge crash/restart, large media/many images, user navigation, popout collision and themes. Record exact browser/OS/site versions, receipt of successful uploads, failures, and limitations.
5. **Delivery:** focused feature branch/PR, changed-file summary, screenshots/test proof, exact upstream Chute SHA and honest compatibility matrix. No push to `main` without review unless separately instructed.

**Marketing condition:** “From your clouds to your AI tools. Just drag and drop.” is prospective copy only, until real destination-site uploads are proven.

**Related requirement:** `latest-1132026/IMPORTANT/MUST_HAVE_CHUTE_DRAG_FROM_REDOWN_TO_CHATGPT_YANDEX_GOOGLE.md`
