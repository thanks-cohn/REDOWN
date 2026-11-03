# CODEX IMPLEMENTATION REQUEST — REDOWN Golden Gallery History
## Premium across the entire archive · Free sampler with centrally configurable quota

**Date:** November 3, 2026  
**Repository:** `thanks-cohn/REDOWN`  
**Priority:** P1 — history experience and Premium differentiation  
**Destination:** Existing REDOWN Shelf → History, NOT a separate gallery or new History engine  
**Status:** OWNER-APPROVED REQUEST; implementation and verification have NOT yet occurred

> **Product goal:** Make REDOWN's History a visually delightful place where people revisit what they wanted to keep: the warmth, beautiful imagery, effortless discovery and restrained composition of early Instagram and Golden Age Pinterest, without cloning their UI. Make a failed save an attractive, useful *recovery opportunity*, not a red error report. Preserve the underlying transfer truth.

## 0. Scope, source-of-truth, and preservation

This is **Codex run 1: History aesthetics, UX, and tier-scoped presentation**. Codex run 2 is an INDEPENDENT P0 investigation/repair of native context-menu startup reliability and provider-failure isolation; that work is specified at [GitHub Issue #47](https://github.com/thanks-cohn/REDOWN/issues/47). DO NOT edit shared context-menu engine, startup, Cloudflare activation, OAuth or remote-save transport in this History run.

Read the repository's `AGENTS.md` and current `main` first. Existing anchors worth examining:

- `extension/shelf-history.js`: date hierarchy, Today records, archive paging, row composition, `quickGlancePremiumEnabled` gate, More/URLs and GO TO.
- `extension/history-quick-glance.js`: existing preview session, square slot, source result, 10-image lazy-fetch *BATCH*, concurrency 3, bounded memory 30, cancellation and image-origin dot placement.
- `extension/history-image-source.js`: existing provider-first and original-source fallback with no-credentials/no-referrer/redirect restrictions.
- `extension/history-image-placeholder.js`: low-cost mathematical placeholder and its interchangeable renderer.
- `extension/shelf.css`: History and theme styles; `.history-image-origin` currently overlays a preview and MUST move OUTSIDE the image.
- `extension/shelf.js` / `extension/shelf.html`: existing temporary Free/Premium segmented membership control, theme routing, History UI.
- `tests/history-quick-glance.test.mjs`, `tests/shelf.test.mjs` and existing History/GO TO regression tests.
- `latest-1132026/CODEX_REQUEST_QUICK_GLANCE_PREMIUM_HISTORY_2026-11-03.md` and `docs/QUICK_GLANCE_PREMIUM_HISTORY_REPORT.md` document earlier goals and baseline behavior. The new OWNER-approved requirements herein supersede their Today-only Premium scope and Free-preview-disabled behavior.

Golden checkpoint remains immutable:
- **Actual annotated tag and checkpoint branch:** `checkpoint/2026-11-03-good-before-p0-menu-startup-repair`
- **Pinned, known-good code commit:** `7b9d1cc7faa7511ed57e9e09b1b5281380fede2d`
- This is a code checkpoint, not a copy of users' local History databases or clouds.
- Work on a focused branch based on the latest `main`; open a PR and report checks. Do not modify/force-move the checkpoint tag/branch, reset main, clear storage, delete records or rewrite saved history.

## 1. The strict tier/presentation contract

**Premium** means the existing temporary Settings switch writes `quickGlancePremiumEnabled === true`. This is a DEVELOPMENT gate, not secure billing proof. Future license entitlement will replace the local override. DO NOT invent a billing service or introduce a second competing Premium flag.

**Free** means the same value is absent/false, and receives the Golden Gallery sampler ONLY for a configurable number of newest Today records.

| Tier | Latest N records from Today | Other Today records | Yesterday / other weeks / past months and years / older archive pages |
|---|---|---|---|
| Free | NEW Golden Gallery layout and previews where eligible, including source-image recovery views for failed records | EXACT existing classic History style and behavior | EXACT existing classic History style and behavior |
| Premium | NEW Golden Gallery layout | NEW Golden Gallery layout | NEW Golden Gallery layout |

**Critical new request: FREE N IS CONFIGURABLE, NOT HARDCODED.** Product may choose 5, 10, 20 or another value later depending on market needs. **Initial launch/default: N = 10.**

Implementation specifics:
1. Introduce ONE authoritative **`freeGalleryEntryLimit`** / `FREE_GALLERY_ENTRY_LIMIT` policy value (choose existing project convention and name). It should be easily discoverable, typed/validated as a finite nonnegative integer in a reasonable safe range, documented, and not repeated as literals throughout rendering, archive, or tests.
2. Use a centralized feature-policy resolver or small configuration module/function; avoid scattering checks like `index < 10` or separate copies in `shelf-history`, CSS and `history-quick-glance`. Changing N from 10 to 5 or 20 should require **one intentional product policy edit**, not reworking DOM, lazy-fetch logic, tests and CSS.
3. This is a **product-controlled setting**, not necessarily an exposed user Settings control: owners can adjust the free tier in code/config for future releases. Do not let clients' local storage freely define a purchase entitlement. It is acceptable for the current temporary development toggle to be user-editable, but label it as such.
4. If a future server-managed/verified product plan supplies N, adapt the resolver without making initial History render rely on remote I/O, account login or new requests. Local settled policy must work offline. Absent/invalid policy should safely default to the documented free limit rather than unlock all records.
5. **Do not confuse N with the existing Quick Glance `BATCH=10`.** `BATCH` is a PERFORMANCE value (how many image fetches to admit per scroll batch). `freeGalleryEntryLimit` is a MARKETING/TIER rule (how many History entries receive gallery treatment). Neither should change the other. E.g. N=20 still fetches in batches of roughly 10; N=5 fetches at most 5 eligible gallery previews.
6. Define "first N" unambiguously: the **N newest chronological Today History records**, regardless of whether each record is success, failure, pending, a known image, another file type or has a recoverable source. Count each record exactly once. Do not use the first N eligible image previews, first N successful saves or N per day group/page. Honor the existing stable timestamp tie-breaker.
7. Today uses the existing local date boundary and timezone semantics. Reevaluate when new records arrive, the date rolls over, or archive contents change. Premium remains all-history regardless of N.
8. Free records beyond N are **not deleted, excluded from navigation, hidden, altered or blocked from export**: just rendered in the existing Classic History style with its existing controls, and without Golden Gallery preview loading.
9. Today remains expanded by default with **ALL Today entries accessible**, not capped at N. The existing Year/Month/Week/Day grouping and older archive pagination remain intact.
10. When switching Free ↔ Premium while viewing an older month/page, preserve the current selection/page and scroll position where practical; repaint in place. Free → Premium applies immediately to that older page; Premium → Free restores Classic there immediately. Do not snap to Today or reset History merely because a membership flag changed.
11. Avoid image requests from ineligible Free entries. Disposing when changing tier cancels/revokes all obsolete preview jobs. There must be no stale origin indicators or switched-mode data leaks.

**Acceptance matrix:** Automated checks should explicitly exercise N=0, 5, 10, 20, more than Today's count, and invalid/missing config, using the same resolver without code changes. N=0 means Free gets no gallery entries but still full Classic History access. Verify an ordinary default N=10 deployment. Tests must prove N counts total records, not images or successful uploads.

## 2. Successful image History row — photographic feed

Keep one elegant vertically stacked post per Golden Gallery row, with warm/clean minimal visual rhythm inspired by Golden Age Pinterest / Instagram. This is the order, NOT an invitation to move data into a new page:

1. **Provider header:** existing provider identity/mark, understated actual timestamp, real **GO TO** action when record is supported. One provider name; no duplication.
2. **Photograph first:** centered, fixed reserved square up to about 240 CSS px, responsive to narrow Shelf, `object-fit:contain`, aspect ratio preserved, no destructive crop or layout jump; existing mathematical loading curves and decode/crossfade retained. No blur/overlay that appears to modify the actual stored image.
3. **Filename** immediately beneath the image, composed like a quiet caption.
4. **Tiny preview-origin dot OUTSIDE photo,** adjacent to the filename or caption. Green means the **bytes actually displayed came from user's recorded cloud**; blue means the **displayed preview was fetched from recorded original source URL**. Nothing in photo pixels, no upper-left dot over the image. Set accessible tooltip/label; show no origin dot until successful decoded presentation. This is PREVIEW ORIGIN, **not** transfer verification.
5. **More**, a compact expandable disclosure immediately below the filename. The owner wants all status/receipt/technical fields/diagnostics inside More, not in the main post.
6. **URLs**, a separate compact expandable disclosure **LAST**, beneath More, for successfully delivered records. Retain full existing recorded source/page/frame/link/cloud/object URL data and existing URL/export behavior. Do NOT place URLs above the photograph.
7. Quiet spacing or understated divider before the next row. No redundant chunky cards or giant headers inside every post.

REMOVE the redundant `Saved to Dropbox` / `Saved to Google Drive` / `Saved to [provider]` line below filename; provider is already in header. Do not scatter “Successful (verified)” text prominently above/below image; keep the underlying truthful receipt within More. Do not remove native GO TO, rename successful-status semantics in storage or lose technical data.

Schematic:

~~~text
  [provider mark] Dropbox               6:43 AM
                                        GO TO

            ┌──────────────────┐
            │ real image       │
            │ untouched        │
            └──────────────────┘
  images (14).jpg               ● Cloud (green)

  + More                                  ⌄
  ─────────────────────────────────────────
  ↗ URLs · 4                              ⌄
~~~

No heavy card chrome; real theme palette should inspire the final layout. Keep control targets keyboard accessible and comfortably clickable.

## 3. Failed transfer History row — beautiful recovery, not a warning log

**Core philosophy:** REDOWN should help a user recognize what they missed and get back to the image. A preview never changes a failed save into a success.

### Theme-relative contrast, NOT a hardcoded failure color
Apply a subtly distinct background surface, fine border and small FAILED-STATUS dot to the failed gallery entry. It can be any tasteful hue that contrasts with that theme's History feed:
- Porcelain: warm parchment / stone / taupe on ivory.
- Midnight: restrained slate or ink blue on dark.
- Ocean: complementary sea-glass / desaturated teal / deep marine.
- Neon: deep violet or charcoal with controlled luminous accent.
Use existing tokens / theme variables and local History classes; respect accessibility contrast, high zoom and reduced motion. **DO NOT hardcode coral universally.** The failure surface communicates distinction without alarming users, even if the status-dot color is hard to distinguish.

**Collapsed failed entry with recoverable source image:**
- Top: small FAILURE STATUS dot, actual timestamp and a **More** disclosure trigger. **No “Saved moment”, no “success”, no large ERROR heading, no raw error code above the fold.**
- Display a beautiful, unobstructed actual source image **when fetch/decode works**. It is a convenience recovery preview, not evidence of an upload.
- Beneath the photo, show **one clickable and recognizable original source-image URL** (short hostname/path label) to revisit what failed to save. The href must be the valid exact recorded URL, not a fabricated stand-in. This is a deliberate usability exception to the previous ordinary-successful-History rule of showing URLs only as non-clickable data.
- No separate URLs expander for failed entries; only **More**.

**Collapsed failed entry if image retrieval fails:**
- Keep it compact: the status dot, timestamp, More and a safe clickable original source URL if present. If no source URL but a valid recorded parent/page URL exists, a clearly labeled Parent page link is an optional recovery path. If neither exists, no made-up URL.
- Don't keep a giant empty square or infinite animation once definitively failed. While loading, reserve geometry to prevent jumping; after definitive source retrieval failure, collapse gracefully without flashing incorrect content.

**Expanded failed entry:**
- Keep timestamp and image (when one exists) visible.
- **Hide the original quick-link from its collapsed location while More is expanded**, avoiding duplicate display.
- Show the full link **inside More**, beneath the image, along with the page/parent URL and all other actual recorded addresses, attempted destination, filename, provider, verified error status, error code, human-friendly error explanation, full recorded diagnostic text and any existing supported Retry action. Omit unavailable fields instead of inventing data.
- Preserve exact URL inspection/copy functionality in expanded diagnostics for technical users.
- Hide all detailed errors and diagnostics in the collapsed feed. **NO separate URLs expander for failed Golden Gallery entries.**

**Failed record example:**

~~~text
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃ [subtle theme-contrasting surface] ┃
  ┃ ● 6:41 AM                More ⌄    ┃
  ┃                                    ┃
  ┃      [source image if works]       ┃
  ┃                                    ┃
  ┃ ↗ images.example.com/photo.jpg    ┃
  ┃      (clickable, source URL)       ┃
  ┃                                    ┃
  ┃ Expanded More:                     ┃
  ┃  - source link moves into details  ┃
  ┃  - status, provider, filename      ┃
  ┃  - full error/diagnostics          ┃
  ┃  - parent URL and all recorded URLs┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
~~~

**Source-only failed-preview policy:** For records with definitive `record.ok === false`, do not imply a cloud object exists or use remote provider reads to provide a misleading cloud preview. Resolve actual recorded original image URL only, with existing bounds; do not initiate Cloudflare account repair or any provider login. If possible, reuse `history-image-source.js`'s safe source-only helper instead of creating a second fetch stack.

### Failure vs pending vs unknown
Not every pending/unverified/cancelled row is a confirmed failure. Preserve the actual status model and select truthful neutral/pending visual semantics. Never mark transfer verified from a successfully displayed image. Provider confirmation alone controls success counters, saved-object controls and GO TO availability.

### URL/link safety
- New clickability applies to the explicitly intended **failed gallery recovery** URL only (and optional parent-page fallback). Ordinary successful URLs remain behind their existing URLs expander and retain the established behavior.
- Only parse and link safe actual recorded `http:` or `https:` addresses with no embedded credentials, unsafe protocols or JS interpolation into HTML. Prefer DOM APIs and existing URL validator; no `innerHTML` for untrusted link text.
- Links open only on deliberate user click with `target="_blank" rel="noopener noreferrer"` or the project's existing safely equivalent mechanism; never auto-open, send unexpected referrers or redirect automatically.
- Show readable truncated hostname/path but keep actual validated URL as link target and full original URL in More when available.
- Do not forward browsing-origin URLs, cookies, page URLs, link/frame URLs or site provenance to cloud-provider APIs; retain existing no-credential/no-referrer and redirect-fail-closed source-fetch rules.
- No new OAuth scopes, public bucket activation, remote writes or cloud mutations.

## 4. Non-image and unavailable image entries

The Golden Gallery treatment is a layout/UX privilege for **records**, not a blanket claim that every record is a photo. Non-image records retain their truthful filename, provider, timestamp, More, GO TO where valid and URLs when appropriate, with beautifully restrained metadata-first spacing. Do not fetch an arbitrary source as an image just to fill whitespace; do not fabricate a thumbnail.

For successful images, if both authorized cloud preview and original source fail: preserve record and its controls, stop animation permanently for that attempt, no fake photo, no false green/blue dot. The successful photo slot's documented stable-geometry contract must still be respected during and after attempted load; choose the least visually disruptive inert/compact failed state consistent with earlier Quick Glance requirements. For definitive *failed-transfer* recovery image requests, collapsed compact/no-image UX takes precedence after retrieval fails.

## 5. Gallery across all History without loading the whole archive

- **Premium covers every date/page**: Today, Yesterday, recent weeks, prior months, years and paginated archive.
- Date grouping and paging still govern data loading; do not fetch an entire archival dataset at once to render a page. Use existing IndexedDB archive and page APIs, don't duplicate History records or create a parallel index.
- The existing thumbnail engine remains bounded: initial ≈10 eligible image jobs, subsequent batches upon scrolling, concurrency cap ≈3, retained preview window ≈30; preserve observer-driven cancellation, visibility, content cleanup and object-URL revocation. Do not couple these performance limits to Free N.
- Handle huge archives, hundreds of Today records, mixed successful/failed rows, sparse image eligibility, collapsed date groups and page switching. Do not download all images just because Premium mode is enabled.
- Preview and disclosure state should not cause accidental re-fetch storms or automatic account/network relogins.
- Reuse actual `RedownHistoryQuickGlance` and `HistoryImagePlaceholder` rather than a second gallery image engine. Refactor minimal stable DOM containers/attachment API as needed so image slot is inserted **before the filename/More/URLs** and the origin indicator is outside the image.
- Avoid layout jumps and clipping in narrow Chrome Shelf widths; treat overflow, long filenames and long URLs elegantly. Native Chrome tabs/sidebar scrolling remain usable.

## 6. Visual design system / theme fidelity

This is NOT a generic tech-dashboard card redesign. Aim for editorial, feminine/masculine-neutral elegant photography presentation—warm, nostalgic early social-photo-web polish, tasteful typography, small marks, deliberate negative space and high-quality rhythm.

- No heavy borders framing every successful post.
- No dense columns/grids. Existing vertical chronological feed remains.
- Photograph is central and unadorned, never shown with status dots stamped on its content.
- More and URLs are clean, quiet, separate disclosures beneath it, exactly in that order for successful records.
- On failures, contrasting surface + simple More, with clickable source and optional photo.
- Porcelain, Midnight, Ocean, Neon all inherit their current overall theme identity and typography; no globally forced ivory color scheme.
- Preserve existing GO TO action, expand/collapse semantics, hover/focus affordances, reduced-motion and accessibility.
- Prevent theme-specific CSS from accidentally changing Free Classic rows outside the preview sample.

## 7. Implementation guidance (keep engine and data separate)

A small, centralized per-row decision is required:

~~~text
policy = resolveHistoryGalleryPolicy({
  premiumEnabled,
  freeGalleryEntryLimit // default 10, product-controlled
})

for (each History record in stable newest-first collection):
  if (policy.premium):
      gallery = true, all dates/pages
  else:
      gallery = isToday(record) && rankAmongTodayRecords(record) < policy.freeGalleryEntryLimit

  gallery
    ? renderGoldenGalleryRecord(record)
    : renderExistingClassicHistoryRecord(record)
~~~

This is conceptual; use project conventions. DO NOT calculate an image-specific rank or count eligible preview slots. If Today is mixed into the special unpaged first page, rank across the **full Today subset**, not across just currently observed DOM nodes. If the archive fallback path is used, preserve the exact same decision and stable sort. Invalid/undated records do not count as Today.

Existing `quickGlancePremiumEnabled` Settings selector must remain the controlling development tier switch, and the current premium-owned feature must automatically show the correct current tier without DevTools. Future purchased licenses will replace the test selector; no billing invention in this request.

If adding new CSS hooks, name them semantically (e.g. `history-gallery-entry` / `history-gallery-failure`) and scope all new styles to opted-in gallery rows, leaving Classic unchanged. Preserve existing classes/contract expected by older tests and external consumers, or update affected tests intentionally with proof of preserved semantics.

## 8. Mandatory acceptance tests

Add/extend focused tests for all the following; do not mark untested behavior complete:

**Tier and configurable Free sample**
1. Free default N=10: exactly 10 newest Today records get gallery; 11th and older are Classic, with all History still present.
2. Free N=5 and N=20 behave with no change to DOM/renderer code except the centrally passed policy/config.
3. Free N=0 and N larger than Today count behave sensibly.
4. Free quota counts *all Today records*, including failed, non-image and pending records, not only successfully loaded previews.
5. Stable tie ordering and Today local-date boundaries, rollover and new records revise which N are included.
6. Premium ignores Free N and applies gallery to ALL Today and every previous week/month/year/page.
7. Switching Free ↔ Premium updates the current page immediately without requiring a Shelf restart or losing History, GO TO, selected groups or pagination state.
8. Membership flag persistence, preexisting Premium-enabled installs, and absence/false gate behavior.

**Aesthetics, semantics and interactions**
9. Successful gallery DOM order: provider/time/GO TO → image square → filename + origin dot OUTSIDE square → More → URLs final.
10. No duplicate “Saved to [provider]” below filename; no success code or diagnostics in collapsed gallery.
11. Cloud-origin green, source-fallback blue based solely on successful displayed bytes, including decode failure; no origin when unresolved; status remains independent.
12. Failed gallery row uses theme-relative distinct surface, status dot, timestamp/More, and source-image preview if available, without a misleading “Saved moment”.
13. Failed collapsed quick original-source URL is safe, clickable and correct; More expansion removes that collapsed copy and includes complete source/parent URLs and recorded diagnostics.
14. Failed entry has **only one More disclosure**, no separate URLs expander; no false GO TO saved destination.
15. Failed record without accessible preview remains compact, source link retained if valid, no endless placeholder; absent/unsafe source shows no fabricated link.
16. Provider/backend errors and detailed diagnostics hidden in collapsed failed gallery; exact recorded text retained inside More.
17. Nonimage/pending/unknown records never masquerade as saved photos or verified failures.
18. All four themes plus responsive narrow widths, focus/keyboard controls, screen reader labels, color-independent failure distinction and reduced-motion.
19. Preview request count/memory/concurrency/cancel/revoke bounds remain intact; Free classic rows make no gallery preview requests.
20. Proper URL sanitization/no opener leakage, no remote upload or public URL mutation triggered by Gallery display, provider accounts remain isolated.
21. Existing classic History rows outside Free N are visually/behaviorally unchanged, including their previous URL and error affordances, even if the new gallery has explicitly different failure source-link semantics.
22. Existing History GO TO, archive pagination, load-more/today expansion, verified transfer receipts and error recovery controls are not regressed.

**Browser acceptance:** Take/provide representative before/after screenshots or available reproducible captures for each theme, with (a) Free Today's first and 11th entries, (b) Free older page, (c) Premium same older page, (d) successful image with clean provenance caption, (e) failed image with source preview and clickable link, (f) failed entry without preview, (g) failure More expanded. If installed-Chrome testing is unavailable, record that clearly; simulations are not live-provider proof.

## 9. Delivery evidence and stop conditions

Execute the repository's mandated verification procedures per `AGENTS.md`, at least focused History/Quick Glance/Shelf tests, relevant UI/GO TO regression suite, `npm run check` and `npm run reliability:check` when feasible. Explain existing baseline failures versus new failures; **never call a partially failing full suite green** or silently update frozen snapshots to mask regressions.

Deliver:
- Code changes on focused branch + PR into `main`.
- Brief architectural explanation of the single Free quota policy and exactly how to change 10 → 5/20 later.
- Current source references to gallery row composition and source-only failure-preview behavior.
- Actual before/after screenshots or previews for Porcelain, Midnight, Ocean and Neon where possible.
- Specific tests run, pass/fail counts, and unresolved real-browser/live-provider verification.
- A short note explicitly saying **no change to startup/menu/P0 Issue #47** and that the checkpoint remains untouched.

### Definition of success

With **Premium** selected, the **entire** existing History archive is the Golden Gallery: beautiful photos leading, filename then More then URLs, source-origin dots outside images, elegant failed-image recovery entries. With **Free**, only the **N newest Today records** have Golden Gallery, **N defaulting to 10 and easily changeable centrally to 5/20**, and the remainder of History continues to look and behave exactly as it did before this change. No underlying record, provider receipt, native menu, cloud object, or History navigation is sacrificed.

**Remember: The image is sacred. Failure is a chance to rediscover, not a wall of diagnostics. The Free quota is a product policy, not a magic number hidden in the renderer.**
