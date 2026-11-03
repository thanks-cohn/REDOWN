# CODEX REQUEST — REDOWN Premium Quick Glance in Existing Shelf History
**Owner-approved specification:** November 3, 2026  
**Status:** Standalone implementation request; NOT a claim of implemented or verified behavior.  
**Scope:** Existing REDOWN Shelf > History; focused additive change only.

## Goal
Make REDOWN the place users return to revisit every image they chose to save: **their visual memory of the internet, across all supported clouds**. This is primarily an inviting revisit/recollection feature, NOT a verification dashboard. Quick Glance is a Premium feature embedded in the **existing** Shelf History.

## Non-negotiable owner UX

1. **Preserve the current Shelf History design exactly in spirit and structure.** History entries are already **vertically stacked one after another** under Today. Enhance those existing rows with centered image previews; do **not** build a thumbnail grid, new page, gallery, carousel, or another History engine. Preserve existing controls, filename, destination, status, dates, GO TO button, themes and order.
2. **Today is expanded by default**, with **all of today's results visible/available to browse**, not a hard cap of 10 or 20 entries. Users can scroll through the whole day. A row being part of Today does NOT mean its image bytes must be downloaded up front.
3. **Light initial work:** Request only about **10 image previews initially**, then async/lazy-load approximately **10 more as scrolling approaches them**. Use IntersectionObserver/fetch or existing equivalents; avoid blocking the Shelf or immediately fetching all today's images. Cap concurrency and decoded image memory; optional bounded active window (~10 preceding and 10 following around the viewport) is a memory target, NOT an entry/scroll limit. Keep History metadata available even if previews have not loaded.
4. **Stable geometry, no teleportation:** Reserve each image's final **square preview slot immediately**. The square does not resize or push rows around on image load. Center the image within this slot, preserving aspect ratio (e.g. `object-fit: contain`).
5. **Mathematical placeholder INSIDE each image square:** While that particular image is loading, fill its already-reserved square with a **mesmerizing, elegant, extremely cheap mathematical animation** (few CSS/SVG curves, for example), matching the Shelf's theme. When the image is decoded and ready, crossfade/swap **only the contents inside that same square** to the centered image. No global loading screen, no full-row spinner, no reflow, no blank flashes.
6. **Replaceable signature:** Isolate the loader appearance behind a tiny replaceable renderer/component (e.g. `HistoryImagePlaceholder`). The owner may later substitute the simple REDOWN logo for the mathematical animation with **no changes to fetching, lazy loading, row geometry or History state**. Prefer existing primitives; no heavyweight animation library. Stop animation while offscreen and offer a static fallback for reduced-motion users.
7. **Failure:** Once a thumbnail has definitively failed both retrieval approaches, stop the animation. Do **not** fabricate an image; show **no image** while retaining the History entry and other controls. Keep stable row geometry after a reserved slot was shown, using an inert unobtrusive empty space if needed. Avoid infinite spinners/retries.

## Provider retrieval order

For each eligible image-history entry:

**A. First:** Try to obtain the **actual stored image** or provider-hosted thumbnail/temporary content URL for that user's recorded cloud destination using current, legitimate auth/permissions. Favor small thumbnails over full-resolution objects. For Cloudflare R2, use authenticated private-object retrieval when allowed; **no public bucket URL is required**. Google Drive, Dropbox and OneDrive may have different API mechanics: inspect their **actual current permissions**, use stored uploaded file/drive IDs or bucket/object keys where possible, and avoid assuming a URL is browser-embeddable or permanent. Never add broad OAuth scopes without clear need and authorization.

**B. Fallback:** If the provider's image/thumbnail is unavailable, try the **recorded original image source URL** (subject to expiration, CORS, hotlink, auth and privacy restrictions). This is a convenience preview, not proof that cloud upload succeeded. Treat image fetch failure as expected, not as corruption of the existing History entry.

**C. Last:** If neither resolves, **no thumbnail**. Preserve the record even if an original website disappeared or a cloud account is disconnected.

Never automatically make private files/buckets public, generate publicly shared access unnecessarily, leak tokens into page contexts, or persist ephemeral signed preview URLs. Follow REDOWN's data minimization principle: no page/source/referrer/link browsing provenance is sent to cloud-provider APIs. Clean up object URLs and requests when no longer needed. The primary goal is easy revisiting, not a cloud-storage verification claim.

## Feature placement and entitlement
- Implement as a **Premium feature** within existing Shelf > History > Today. Reuse existing Premium checks if implemented; if the codebase lacks entitlement infrastructure, build the preview behind a narrowly scoped feature gate and document the integration gap instead of inventing billing.
- Other days remain browsable using the current History navigation behavior; Today is the default.
- Keep other History record types/failed/pending saves usable and truthful. A preview source must never change actual transfer success state or increment save counters.
- Avoid changes to V3 right-click menus, save engines, OAuth flows unless strictly necessary for existing authorized read paths, cloud write behavior, provider cards, or history GO TO routing.

## Performance / architecture expectations
- Inspect existing Shelf/History rendering, saved History schema, and authorized per-provider read/thumbnail APIs before editing. Reuse existing code. Make a small, isolated enhancement: (1) eligibility/source resolver, (2) bounded thumbnail-fetch pipeline, (3) reserved-square preview + swappable loader.
- History entries/scroll remain fast even for days with hundreds or thousands of image saves. Consider viewport-based virtualization only if necessary and without breaking the existing stacked design, sticky date sections, keyboard focus or scroll positions.
- Guard async races when users rapidly scroll, change dates/themes, leave History, disconnect providers or close the Shelf. Preserve the user-facing History record. Use retry/backoff limits rather than busy loops.
- Do not cache original website URLs more broadly, disclose private object paths in UI logs, or create new permissions unless required and approved.

## Acceptance tests and evidence
1. Open History: **Today expanded**, existing vertically stacked rows unchanged; all today's records scrollable.
2. Initial render triggers at most roughly 10 eligible image-preview requests; more occur only near scrolling (roughly 10 per subsequent batch). No bulk fetch for whole day.
3. Each image slot is square, preallocated and centered, whether loading or loaded; incoming image does **not** shift surrounding rows. Loading pattern animates within the slot and swaps to actual image without teleportation.
4. Replace animated placeholder with a static logo via the isolated renderer without modifying data/network/History code. Test reduced-motion fallback.
5. Cloud-first preview success; original URL fallback when cloud preview fails; no image when both fail; History entry always retained.
6. Cloudflare R2 private bucket preview works with authorized access and **without** enabling a public URL. Each regular provider's read method stays inside its actual current scopes, with documented unsupported cases.
7. Scrolling long days remains bounded in request concurrency and memory; stale async responses do not appear on the wrong row/day. Offscreen animations stop; resources are released.
8. Existing GO TO, History export/grouping, statuses, right-click transfers, cloud upload privacy, and success effects remain unaffected.
9. Run focused tests and relevant project checks. State exactly which assertions passed, which failed, baseline failures, and which behaviors were not verified in a real installed Chrome/provider session. No unearned 'complete' claims.

## Delivery
Implement this focused feature in the appropriate REDOWN branch/checkout, with tests and a short evidence-backed implementation report/commit summary. Preserve unrelated behavior. If a provider's current API grant cannot read a file or thumbnail, use the specified fallback rather than silently expanding permissions or changing the product's privacy guarantees.
