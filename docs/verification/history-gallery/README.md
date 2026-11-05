# History Golden Gallery implementation verification

Base: `5041b5763541812c505c9cde6e8f79cb23a7b193` (latest fetched `main`, November 3, 2026).

Production changes are in `extension/shelf-history.js`, `extension/history-quick-glance.js`, and `extension/shelf.css`. No archive schema, upload engine, provider authorization, public-access consent, or native menu changes.

- Gallery header contains only filename and local time; the stable centered preview follows, then native More and separate successful URLs disclosures. Supported GO TO is inside More. Successful rows without recorded addresses retain an honest URLs · 0 drawer. Classic rendering remains outside the tier/date quota.
- Exactly one existing `.history-dot` is recolored by a row-local decoded-origin callback. `.history-image-origin` creation and styling are removed. Loading, disposal, refresh, tier/page changes, connection changes and stale requests cannot retain a confirmed origin. Preview origin never changes transfer state or receipts. The existing bullet's accessible label reports both transfer status and preview origin.
- Free selects the newest ten total Today records, including non-images and failures, before image eligibility; Premium covers all dates/pages. `FREE_GALLERY_ENTRY_LIMIT` is the single presentation setting, independent of BATCH/CONCURRENCY/WINDOW. All records and archive pages remain available. Membership remains the existing local development toggle, not billing enforcement.
- Failed gallery rows keep their filename, theme-relative surface, safe recorded recovery URL and independently truthful failure status. Opening More hides the quick link and exposes full recovery URLs, attempted destination, error and diagnostics. Exhausted failed previews collapse the empty square; there is no failed URLs drawer or fabricated retry.

## Automated checks

`node --test tests/history-quick-glance.test.mjs tests/history-go-to.test.mjs tests/history-provider-destinations.test.mjs`: **61 passed, 0 failed**, including 20 Quick Glance/DOM tests. Policy coverage includes 0/5/10/20, oversized, missing/invalid limits, mixed records, stable timestamp ties, local Today, and Premium archive switching. Other coverage includes exact DOM order, short/long More, URL data/on-open refresh, no duplicate dots, deferred decode and eviction races, cancellation, recovery link safety, pending/failure truth, pagination and bounded loading.

`npm run check`: passed. `git diff --check`: passed.

`npm run reliability:check`: full suite **957 passed / 111 failed**; failed overall. An untouched `git archive` of the base in the same environment produced **953 passed / the same 111 failed tests**. There are **zero additional failure identities**. The existing recorded regression baseline is stale: the runner labels 105 existing failures as new, six as known, and one removed expected test as unseen/incomplete. This is not a green suite. Syntax, registry and issue-inventory stages pass. The architecture stage remains partial/failing; its entire response is identical on untouched base. Frozen evidence and baseline assertions were not rewritten. See `baseline-comparison.json` for every baseline failure identity.

## Actual Chromium rendering

`node scripts/history-quick-glance-preview.mjs` runs production History JS/CSS in the existing Shelf HTML with local HTTP provider/storage mocks, not a static HTML recreation. Chrome 154 verifies initial ten jobs, three-job concurrency (also unit tested), stable uncropped portrait geometry, at most 30 retained images, viewport admission, cleanup, reduced motion, one existing bullet per row, no overlay dot, cloud/source color distinction, timestamp clearance at 360/240/180 CSS pixels, and native keyboard disclosure operation.

For the committed photographic screenshots:

```sh
curl -fL https://raw.githubusercontent.com/scikit-image/scikit-image/v0.24.0/skimage/data/astronaut.png -o work/gallery-astronaut.png
HISTORY_GALLERY_PHOTO=work/gallery-astronaut.png node scripts/history-quick-glance-preview.mjs
```

The optional local PNG is used only for aesthetic review; the deterministic admission/aspect-ratio checks always use the synthetic 80×160 portrait. Photograph provenance and checksum are in `photo-source.json`. No network fetch occurs inside the fixture script. Images are decoded through the production source/preview pipeline and screenshots wait for its crossfade to settle. Screenshot times use America/Chicago.

Each theme (Porcelain, Midnight, Ocean, Neon) has:

- `*-source-recovery.png`: cloud green bullet, source blue bullet, failed source preview, compact no-image failures, closed More/URLs.
- `*-expanded.png`: successful More and URLs open.
- `*-failed-expanded.png`: failed More open, full recorded error/URLs and no duplicate recovery link.
- `*-narrow.png`: 240 CSS-pixel Shelf, long filenames and visible time.
- `*-zoom200.png`: effective 180 CSS-pixel viewport with 2× device scale, equivalent History layout pressure to a 360px panel at 200% zoom.

Actual screenshots were visually inspected across all four themes. Review corrected legacy failure-color specificity, missing disclosure arrows, clipped transitional disclosure content, and narrow navigation overflow. Browser assertions also check final-image opacity before each evidence capture.

## Evidence boundaries

Installed extension testing remains administrator-blocked per repository instructions; that policy was not bypassed. Local HTTP mock results do not certify installed Chrome, real provider credentials/bytes, or deployed behavior. The 200% scenario is effective viewport/device-scale emulation, not an installed browser zoom setting. Broader pre-existing Shelf header behavior at extremely narrow widths is outside this focused History change. No deployment, public-access change, upload, merge, or billing integration was performed.
