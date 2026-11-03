# CODEX IMPLEMENTATION REQUEST — REDOWN Golden Gallery: Exact History Layout + Reuse Existing Bullet

**Repository:** `thanks-cohn/REDOWN`  
**Date:** November 3, 2026  
**Priority:** **P1 — URGENT** (visible Premium/History presentation regression)  
**Starting point:** Latest `main`. Implement on a focused branch; open PR to `main` after verification.  
**Destination:** Existing REDOWN **Shelf → History** (NOT a separate gallery, History engine, or mockup).  
**Status of this document:** Owner-approved **implementation request**, not a claim of an implemented fix.

## 0. Executive direction — DO THE ACTUAL CODE CHANGE

The recent Quick Glance commits implemented thumbnails, source fallback, lazy loading, Premium toggle, and origin indicators but **did not implement the owner's desired History composition**. The last Golden Gallery commit `b9522a9` merely added a specification; it did not rewrite the view. This request MUST result in production JavaScript/CSS changes, focused tests, and a real PR — **not another requirements-only commit**.

**These exact owner clarifications override any contradictory layouts in earlier files**, including `latest-1132026/CODEX_REQUEST_GOLDEN_GALLERY_HISTORY_PREMIUM_ALL_FREE_CONFIGURABLE_2026-11-03.md`:

1. **Above the image, show ONLY the filename at left and timestamp at right, with History's EXISTING bullet at the left edge.** No provider name/header; no status paragraph; no inline GO TO; no More/URLs.
2. **Image comes immediately below this header**, centered in its stable square.
3. **Below the image: an expandable More section, then a separate expandable URLs section** for successful gallery saves. A failed gallery save follows the separate recovery contract below.
4. **There is exactly ONE History bullet per entry: reuse the existing `.history-dot`.** Green/blue must recolor *that existing bullet* according to the actual decoded preview origin. **Delete the extra `.history-image-origin` dot** over/on/near the image; do not merely reposition it outside.
5. **No redundant "Saved to [provider]" / verified-status line above the image**, and no competing dot beside the image.
6. These are actual visual and DOM-order acceptance requirements, not just suggestions.

Do not silently replace this with the older "provider header → image → filename" layout. **Name + timestamp are above the image.**

## 1. Audit the real code before editing

Read `AGENTS.md`, the latest main branch, the prior Golden Gallery request, and the actual implementation. High-value anchors (confirm line numbers against latest source):

- `extension/shelf-history.js`: `dayRows` builds `.history-dot`, `.history-entry-head`, provider/provenance disclosures and calls `quickGlance?.attach(body,record)`. At current baseline, `addProvenance` occurs **before** preview attachment: this is the incorrect order.
- `extension/history-quick-glance.js`: `attach` appends a square to `body` and the loader adds a second `span.history-image-origin` *inside* the image slot when decoding completes. Remove this duplicate and communicate preview origin to the existing row/bullet instead.
- `extension/shelf.css`: `.history-transfer` / `.history-dot` existing status styles, `.history-entry-head`, `.history-entry-provenance`, `.history-image-slot` and `.history-image-origin` rules. Rework composition and theme-aware bullet states, not the whole Shelf.
- `extension/history-image-source.js`: cloud-first then recorded-source fallback, using existing permissions and privacy constraints. Preserve source truth; no new uploads.
- `extension/shelf.js` / `extension/shelf.html`: temporary Free/Premium membership switch and History navigation.
- `tests/history-quick-glance.test.mjs`, `tests/shelf.test.mjs`, History/GO TO fixtures, and `scripts/history-quick-glance-preview.mjs`.

Relevant prior commits for context: `e57d30a` Quick Glance; `0ede53d` membership and extra image-origin dot; `18f0285` older dates; merge `7b9d1cc`; `b9522a9` documentation-only Golden Gallery spec. Don't assume commit titles prove installed-Chrome success.

### Why the baseline is wrong

Current `dayRows` appends the header then `addProvenance(body,record,info)`, then `quickGlance?.attach(body,record)`: hence More/URLs and provider/status details sit above the image. Current `history-quick-glance.js` calls `entry.slot.append(image,dot)`, producing an unwanted *second dot*. Current `.history-dot` already exists at the left of each entry. Make the single preexisting bullet the only origin-color signal.

## 2. Exact required successful Golden Gallery DOM/visual hierarchy

~~~text
[EXISTING BULLET]  Beautiful-Sunset.png           10:42 AM

                   ┌──────────────────────┐
                   │                      │
                   │    REAL PHOTOGRAPH   │
                   │   centered/uncropped │
                   │                      │
                   └──────────────────────┘

    More                                         ▾
    ─────────────────────────────────────────────
    URLs · 4                                     ▾

    [next history entry, with delicate spacing]
~~~

**Structural contract (eligible gallery row):**

~~~text
.history-transfer [same existing list item]
 ├─ .history-dot [ONE existing bullet, recolored on decoded preview]
 └─ .history-transfer-body
     ├─ .history-entry-head
     │   ├─ visible filename (left)
     │   └─ exact local timestamp (right)
     ├─ .history-image-slot [existing centered square / image loader]
     ├─ details.history-more [collapsed by default]
     │   ├─ summary "More"
     │   └─ provenance: provider, destination, verified status,
     │       technical data, supported GO TO, etc.
     └─ details.history-urls [collapsed by default]
         ├─ summary "URLs" / count
         └─ recorded full URL data (existing semantics)
~~~

Do not use `details > summary` around the header as a substitute for More; long filenames must not put the image under an unpredictable expand/collapse container. The filename can gracefully wrap/truncate within its allocated header width and offer full text on hover or in More, but the timestamp stays visible, right aligned. Preserve correct filename for errors and unavailable names; no confusing generic "Error: URL" title across the top if the actual file name is available.

**Header:** filename + timestamp only; existing bullet sits to left of header as the single entry indicator. GO TO must remain operational but move to More for gallery rows. If a record has no valid GO TO destination, never show a fake action.

**Preview:** use original fixed square up to about 240 CSS px, `object-fit:contain`, preserve aspect ratio/pixels, mathematical loader, decoded crossfade, no cropping, no dot overlay, no new decorative badge, no position jump. Leave old Classic History rendering intact for rows not eligible for gallery presentation.

**More:** a consistently available expandable disclosure for *every* gallery entry, not only for exceptionally long names. Content includes actual recorded provider/location, status, useful diagnostics, technical/receipt details, navigation/GO TO and full title if visually truncated. Collapsed state is beautiful/quiet. Avoid duplicate headings or "Saved to X" redundant text in the visual feed.

**URLs:** for successful gallery entries a separate independent disclosure **AFTER More**, never nested before the image or in More. Preserve the existing public/saved/source/page/media/frame/link and current configured Cloudflare URL logic, including exact recorded values and the existing on-open refresh behavior. For ordinary successful records preserve their current non-hyperlinked/copyable data semantics; do not automatically navigate or leak credentials. No URL data loss.

**Theme:** refined minimalist post layout, restrained spacing/dividers, warm photographic-feed visual rhythm for Porcelain and similarly appropriate treatment in Midnight, Ocean and Neon. Use theme tokens rather than imposing one hardcoded accent/background. Narrow Shelf, 200% zoom, long filenames, mobile-like side-panel widths, keyboard navigation and reduced motion must remain usable. Do not add bulky card chrome or another full page.

## 3. CRITICAL: ONE existing bullet, zero extra image-origin dots

The owner explicitly **did not** request an added green/blue dot beside/over the image. The bullet already present on the left of History entries is the *only* bullet to change color.

**Required preview-origin truth:**

| Image preview state | Existing `.history-dot` | Upload truth |
| --- | --- | --- |
| Decoded bytes displayed from recorded user's cloud destination | **Green** | Independent; never assume upload success from image alone |
| Decoded bytes displayed from recorded original source URL | **Blue** | Independent; failed saves may show blue |
| Loading, canceled, no eligible preview, exhausted fallback, or image not yet decoded | Existing/neutral status treatment, **not origin green/blue** | Do not fabricate source or upload success |
| Classic History row outside feature policy | **Existing status bullet behavior unchanged** | Existing behavior unchanged |

Never create `.history-image-origin` or a replacement at another location. Refactor the existing preview session to report a **settled, decoded origin** to its associated row/bullet (e.g. row-local callback/metadata on `attach`); do not match records by filename or leak across rows. Use minimal single authority for origin state, e.g. `data-preview-origin` on the row plus theme-specific CSS specificity that intentionally overrides existing success/failure dot colors only when an origin is confirmed.

On preview eviction, refresh, tier switch, date switch, rerender, unmount, provider disconnect, failed decode, and source fallback, clear or update the old origin immediately. Never leave stale green/blue dots on recycled rows. Avoid races in late promises. No orange/coral hardcoded failure dot is necessary for gallery rows — transfer failures remain independently exposed with theme-relative entry surface/More and accessible status semantics.

Keep the actual transfer state (`completed`/`failed`/`pending`), verified receipts, GO TO availability and counters untouched. A **blue** origin bullet may coexist with **failed transfer**. Ensure screen-reader text conveys both preview origin and transfer status: do not rely solely on color; use a meaningful aria-label/title on the existing bullet or row. Preserve a visible focus state for any interactive disclosure. The bullet need not become a button.

**Acceptance gate:** inspect actual rendered DOM and assert exactly one `.history-dot` per row and zero `.history-image-origin` anywhere within/around the photo; ensure no pseudo-element introduces a second origin dot.

## 4. Free/Premium policy — do not regress the requested segmentation

This is the latest approved product contract from the prior Golden Gallery request and should be implemented in production if not yet present:

- **Premium:** `quickGlancePremiumEnabled === true` (temporary development switch). Golden Gallery presentation for eligible History entries on **all dates/pages**, including Today, Yesterday, older weeks/months/years and paginated archive.
- **Free:** Golden Gallery only for the **newest N total Today entries** (initial default **N = 10**). All remaining Today records and all older dates/pages retain **exact Classic History layout and functionality**. This is a *presentation* quota, not a History retention/storage limit.
- Introduce **one centrally configured** `freeGalleryEntryLimit`/`FREE_GALLERY_ENTRY_LIMIT` policy, validated nonnegative integer. Changing N to 5 or 20 requires only a single policy value change. Include tests for 0/5/10/20, invalid/missing values and N larger than Today.
- N counts the latest **total History records**, regardless of image eligibility, success/failure, rather than eligible pictures or verified uploads. Maintain stable chronological ordering/tie-breaker and local Today cutoff.
- **Do not confuse Free N with the existing `BATCH=10` thumbnail work-admission size**. Preserve initial ~10 image requests, 3 concurrent jobs, 30-slot window/cancellation and bounded image memory. Premium may display all entries without eagerly fetching all images.
- All Today rows remain accessible; do not cap the list at N. Preserve Year → Month → Week → Day hierarchy, previous dates/pages and IDB archive. Switching tiers in an older page applies/removes styling immediately without throwing the user back to Today; preserve scroll/location where practical.
- In Free, do not fetch previews for ineligible Classic rows. Do not duplicate feature flags or invent billing/entitlement APIs. Document current local-toggle limitation.

If `main` has already implemented part of this, preserve it and fix only unmet criteria.

## 5. Failed Golden Gallery entries — beautiful recovery, truthful transfer

For failure/pending entries inside the Golden Gallery quota, do not create a harsh log or pretend an upload succeeded.

**Collapsed failed row:**
- The same minimal header (available filename at left, timestamp at right) with the **existing bullet only**.
- A theme-relative, subtly distinct row surface/border, not a universal coral/red failure card. Porcelain may use warm stone/taupe, Midnight muted slate, Ocean desaturated marine, Neon violet/charcoal; obey readability/contrast.
- When recorded source image is actually decodable, display the original image using the existing bounded preview pipeline even if cloud upload failed.
- Under that failed image, show one *safe, clickable* recorded original source-image URL label (actual original href, recognizable short hostname/path). This is an explicit recovery exception to successful rows' non-clickable URL data. If the source is unavailable and preview fails definitively, collapse/remove the empty square gracefully and leave a compact recoverable source or (if available) parent-page link.
- **More** remains below the image/source recovery link. No extra standalone URLs disclosure for failed gallery rows.
- When More is open, hide the collapsed quick-link and present the complete source URL, page/parent URL, attempted destination, full recorded error and diagnostic fields *inside* More instead. Avoid duplicate visible links. Include Retry only if the existing system really supports a safe deliberate retry; never fabricate one.
- Pending/unverified states remain neutral and distinct from confirmed failures; don't collapse them into verified success or arbitrary failure.
- The origin bullet may be **blue even on a failed save**; visual/status/a11y treatment must independently communicate failed transfer.
- Absolutely no invented URL, fake saved file, auto-publication of private buckets, background upload, or new provider permissions.

## 6. Boundaries / preservation

Do **not** rewrite the V3 Simple/Narrow/Depth menu compiler, provider native menus, Cloudflare activation, OAuth or transport, provider cards, success animation, toolbar/Shelf failure laser, history archive schema, or existing bucket/public URL consent.

Keep:
- Existing `RedownHistoryQuickGlance` / `RedownHistoryImageSource` / `HistoryImagePlaceholder` shared pipeline and interfaces where possible. Do not create a second thumbnail engine.
- Cloud-first reads and original-source fallback, current permissions, no referrer/credentials/redirect privacy safeguards, exact account identity checks.
- Verified-save gating and cloud upload truth; previews are not transfer receipts.
- Bounded memory, cancelable requests, object URL revocation, no eager full-archive fetch.
- Genuine GO TO navigation, complete historical provenance and provider-specific receipt diagnostics.
- Correct ARIA, keyboard operation, focus ring and reduced-motion behavior.
- No source/page/link/frame/referrer provenance sent to provider APIs.

Do not edit frozen checkpoint branches/tags, drop user records, reset the repository or force-push.

## 7. Deterministic acceptance tests AND visual review

**Add/adjust focused automated assertions against rendered DOM, not only static CSS strings:**

1. Eligible success row child order: existing bullet + filename/time header → image slot → More → separate URLs (last).
2. Header visibly contains only filename/time, no provider/GO TO/status/URL above the photograph.
3. More exists for both short and long filenames and contains provider, status, supported GO TO and technical/receipt data.
4. URLs retains all historical fields and on-open Cloudflare address refresh without duplicate requests/data loss.
5. Existing History bullet reused, *no second origin dot* in or alongside image; test both cloud and source decode.
6. Green/blue origin only after decoded display; failure, pending, canceled, switched page/tier, unmount and stale promise cleanup clear origin as needed.
7. Blue source-preview bullet on a failed-upload row must not set transfer success; failure remains visually and accessibly clear.
8. Failed recovery link uses actual safe recorded source URL; disappears from collapsed location when More opens; expanded More exposes complete diagnostics; no separate failed URLs drawer.
9. No image case gracefully collapses failure placeholder while keeping row and real provenance.
10. Premium all archive vs Free latest N *records* Today; N policy 0/5/10/20/invalid, including mixed images and file types, preserves Classic rows outside quota.
11. No regression in Today metadata completeness, archive paging, GO TO, errors, existing receipts, provider authorization separation, or lazy-loading limits/viewport cancellation.
12. Tests protect caption/time positioning and narrow widths/long names so overlap/truncation cannot hide timestamp or disclosures.
13. Screen-reader label reflects origin and transfer truth without relying solely on dot color.

**Visual proof required:** produce screenshots from a real rendered fixture (and installed Chrome if environment allows), for Porcelain, Midnight, Ocean, Neon, including (a) successful cloud preview (green old bullet), (b) successful source fallback (blue old bullet), (c) failed save with recoverable image/URL, (d) no-image failure, (e) narrow Shelf/long filename, and (f) expanded More/URLs. Inspect screenshots for visual alignment, consistent whitespace, hierarchy and color contrast. Screenshots of a static mockup are not evidence of production code.

Run relevant focused tests, DOM fixture, CSS/syntax checks, `npm run check` and `npm run reliability:check` where feasible. Report exact counts and existing baseline failures; don't pronounce full-suite green if still failing. Do not represent fixture mocks as installed Chrome/provider proof.

## 8. Implementation and delivery

1. Check out current `main` and read `AGENTS.md` + linked specifications. Inspect actual JS/CSS/tests; describe concise root-cause notes.
2. Create a focused branch from current `main`.
3. Implement the actual History DOM/CSS/origin callback/config policy + failed recovery behavior, with no scope creep.
4. Update relevant tests, run them, generate/inspect visual evidence, fix any mismatches.
5. Commit changes and open a PR targeting `main`. **Do not merge without owner review.**
6. Return the branch, PR URL, commit SHA, changed files, visual screenshots/evidence paths, test commands + counts, exact remaining gaps, and explicit confirmation that the *existing* bullet was recolored and the extra origin dot removed.

### Owner's final visual acceptance

> "The only things above the image are the **Name** on the left and **timestamp** on the right. Underneath is the **image**, then expandable **More**, then expandable **URLs**. History already had a bullet next to each entry: change **that existing bullet** green for cloud preview or blue for source preview. **Do not add any other dot by the image.**"

**Ship the real change — not another design-only document.**
