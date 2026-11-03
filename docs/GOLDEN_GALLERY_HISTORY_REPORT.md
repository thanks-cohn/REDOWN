# Golden Gallery History — November 3, 2026

Implemented on `codex/golden-gallery-history`, based on `b9522a9` (latest main at start).

## Product policy and architecture

`extension/history-gallery-policy.js` owns `FREE_GALLERY_ENTRY_LIMIT` (initially **10**). Change that single product constant to **5**, **20**, or another integer to change the shipped Free allowance. The resolver accepts a settled configuration override for future product integration and testing; invalid/missing values fall back to that default. Accepted range: integer 0–1000. No storage-controlled quota, billing service, login, or remote policy fetch is introduced.

The existing `quickGlancePremiumEnabled === true` development selector remains the only Premium switch. Settings explicitly labels its development status. Premium uses gallery presentation on every loaded date/page. Free uses the newest N *total* Today records, including pending, failed and nonimage records. Stable timestamp ties retain collection order (archive cursor order for IndexedDB). Invalid dates are excluded from Today. Today uses local midnight boundaries; an open view checks for rollover every 30 seconds. Incoming records, membership changes and archive refreshes recompute eligibility.

`extension/shelf-history.js` retains its Classic row composition and adds `galleryRow`. Selection uses full Today metadata, matching archive/page structured clones by their existing record IDs. No archive schema, record writes, export behavior, provider transport or parallel History index is added. Today remains fully accessible; older pages stay bounded. Membership repaint retains page/group selection and attempts to restore scroll position.

Success composition is provider/time/GO TO → image → filename/origin → More → URLs. Receipts and technical information remain within More; recorded URLs retain their text-only successful-record behavior and read-only address refresh. Failed rows have a theme-relative surface, labeled failure dot, time, one More disclosure, optional source preview and safe deliberate recovery link. Expanded More hides the quick link and shows full recorded URLs and diagnostics. Failed rows have no URLs drawer or saved-object GO TO.

`extension/history-quick-glance.js` accepts an external `originContainer`, so a decoded-byte origin indicator is appended beside the caption instead of over the image. Existing release/cancellation removes that indicator along with its image. BATCH=10, concurrency=3, retained window=30, source bounds, placeholders and decode behavior are unchanged. Failed recovery slots collapse only after definitive preview failure; successful-image slots retain square geometry.

`extension/history-image-source.js` excludes provider attempts entirely unless `record.ok === true`. Definitive failures use the recorded original source, without provider state reads, login, repair or cloud access. Existing byte/MIME bounds, omitted credentials, no referrer and redirect rejection remain in force. Preview success never changes transfer truth.

## Changed files

- Runtime: `extension/history-gallery-policy.js`, `extension/shelf-history.js`, `extension/history-quick-glance.js`, `extension/history-image-source.js`, `extension/shelf.css`, `extension/shelf.html`.
- Verification: `tests/history-gallery.test.mjs`, `tests/history-quick-glance.test.mjs`, `tests/history-provider-destinations.test.mjs`, `tests/history-go-to.test.mjs`, `tests/brand-and-paginated-history.test.mjs`, `tests/explorer-account-and-history-navigation.test.mjs`, `tests/explorer-neon-history.test.mjs`, `tests/onedrive.test.mjs`, `tests/shelf.test.mjs`.
- Tooling/evidence: `scripts/history-gallery-preview.mjs`, `scripts/history-quick-glance-preview.mjs`, `scripts/syntax-targets.json`, this report and `docs/verification/golden-gallery/`.

Isolated DOM harnesses now load the real policy module and close their windows on failed assertions too, including preview disposal and rollover timers. Provider/footer tests explicitly use older Classic records; new gallery tests exercise the changed Today contract. Frozen catalog/evidence assertions are not rewritten.

## Verification

See [machine-readable results](verification/golden-gallery/test-results.json) for final counts and baseline comparison.

- Focused History/Gallery/Quick Glance/provider/GO TO: **74 passed, 0 failed**.
- Quota matrix: 0, 5, default 10, 20, above Today count, missing/negative/nonfinite/fractional/string values; mixed records, ties, local-day rollover, arrivals, Premium all dates and tier repaint.
- Safety/engine: source-only failed reads, safe recovery URLs, full diagnostics, origin placement/decode/cleanup, cancellation, stale decode, bounds, account isolation and navigation regressions.
- `npm run check`: passed. `git diff --check`: passed.
- Broader History/Shelf/theme suite: **107 tests, 97 passed, 10 failed**, versus **90/80/10** at baseline. The same ten existing failures remain.
- Full suite: **1077 tests, 968 passed, 109 failed**, versus **1060/951/109** at baseline; no added or resolved failure names.
- Full-suite baseline and final runs use `node --test --test-force-exit tests/*.test.mjs` to collect existing failure results despite retained background handles. They are **not green**. Failure names are compared against an unmodified `origin/main` archive with the same dependencies; no baseline failures are waived or repaired in this run.
- `npm run reliability:check` was executed. Its result remains failed; architecture/source-map drift and historical assertions are retained. The initial run hit its 180-second subprocess deadline. After DOM harness cleanup, the final run completed with exit code 1 and no timeout. The reliability reporter observed 970 passes and 111 failures, including two Go Home harness failures absent in the parallel full-run output. Both reproduce on unchanged main in isolation (the source-slicing harness omits chrome.storage); native menu code is untouched. See machine-readable results; no release certification is claimed.

## Browser evidence

Reproduce after captures with `node scripts/history-gallery-preview.mjs`. Reproduce baseline with the original `scripts/history-quick-glance-preview.mjs` at `b9522a9`. Both use ordinary Chromium over a local HTTP fixture with a synthetic portrait PNG, mocked provider/navigation APIs and no installed extension or live provider. These captures verify composition, containment, interaction and cleanup; they do not prove real provider connectivity or photographic content quality.

[All screenshots and browser results](verification/golden-gallery/). Each theme has:

| File suffix | Capture |
|---|---|
| `before.png` | Previous Premium Quick Glance layout |
| `free-today.png` | Free Today, successful photo/header |
| `free-boundary.png` | Last gallery entry and first Classic entry |
| `free-older.png` | Older archive page in Free |
| `premium-older.png` | Same page after Premium switch |
| `failure.png` | Source preview and clickable recovery link |
| `failure-unavailable.png` | Compact recovery after failed retrieval |
| `failure-more.png` | Full failure diagnostics below photo |
| `narrow-focus.png` | 280px viewport, focused More |

Porcelain, Midnight, Ocean and Neon pass the 360px page-overflow check, outside-image origin assertion, tier boundary, older-page preservation, reduced-motion checks and expanded-diagnostics geometry. At 280px all gallery content remains contained and More is focusable. Neon retains an existing navigation-link overflow at this extreme width outside the History gallery. Installed Chrome acceptance remains unavailable under the environment's unpacked-extension restriction; screen-reader and real-provider acceptance remain unverified.

## Preservation

**No change to startup/menu/P0 Issue #47**, OAuth, Cloudflare activation, remote-save transport, History storage schemas or recorded transfer data. No cloud writes or public-access mutation were performed.

The checkpoint branch and annotated tag `checkpoint/2026-11-03-good-before-p0-menu-startup-repair` remain untouched. Remote branch and peeled annotated tag both resolve to `7b9d1cc7faa7511ed57e9e09b1b5281380fede2d`; annotated tag object is `c55c40a09f1aee5d508477c571fa6a0bb069205d`.
