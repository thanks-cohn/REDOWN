# REDOWN — No save balls without login; daily verified toolbar badge

**Date:** November 2, 2026
**Owner report:** REDOWN rendered flying save balls when Cloudflare was not logged in. This could imply that a file had been saved when no authenticated destination existed. Owner also requested a small daily counter on the Chrome toolbar icon so verified saves can be checked without opening Shelf.
**Branch:** `CONSOLIDATED`
**Source status:** Fixed with focused automated tests passing 30/30; live installed-Chrome/provider acceptance remains NOT_TESTED.

## Invariants

1. **No save balls when selected provider is logged out.** Check Cloudflare's existing token/reconnect/expiry state; Google Drive connected account; Dropbox and OneDrive connected state plus matching saved original OAuth grant. Do not launch visual page injection or publish `redownShelfImpact` if absent or stale. Do not initiate a login just to paint a ball.
2. An authenticated ball represents *request/attempt*, not *provider-confirmed success*. If an authenticated save subsequently fails, no success receipt is credited. The Shelf's temporary SUCCESS! remains strictly verified-only.
3. **Daily Chrome action badge:** one verified completion = one count, protected by persistent immutable delivery-ID deduplication; failed, pending, cancelled, uncertain, unverified or repeated receipts do not count. Day follows user's local Chrome calendar. Badge resets to 0 at local midnight and on browser-start/day-change reconciliation. The underlying true count persists in local storage; badge shortens only values above 999 to `999+`.
4. The lifetime global save odometer and historical verified per-provider totals **never reset at midnight**. No extra cloud permission, network call, URL provenance disclosure, or separate save engine is introduced.
5. Theme-aware badge color may change with the Shelf theme; color-only updates do not alter count. The existing R toolbar icon and theme-dependent temporary flashes remain.
6. Single authoritative gate for save energy effects: `extension/save-droplet-gate.js`; no overlapping second login engine.

## Acceptance evidence and outstanding checks

- Automated `tests/daily-save-badge.test.mjs` exercises all four provider successes, duplicates, failures, pending/uncertain saves, midnight rollover, lifetime preservation, and login-gate eligibility.
- `tests/shelf-save-feedback.test.mjs` exercises real ball path with disconnected versus authorized Cloudflare state, preserving orb geometry.
- Focused GitHub Actions: https://github.com/thanks-cohn/REDOWN/actions/runs/41538170112 (30 passed, zero failed at relevant commit).
- **Still required in installed Chrome:** log out of Cloudflare, right-click a save destination, confirm zero balls and no badge increase; log in, save a new file and verify only one badge increment after confirmed R2 read-back; log out and verify effects stop; repeat for Google Drive, Dropbox, and OneDrive where login is functional; confirm local midnight resets badge but not lifetime odometer.
- Daily badge counts **remote files verified as saved**, not files downloaded to the local Windows computer. Do not market it as proof of unverified downloads.
- Existing unrelated regression gates may remain red; the focused check does not certify the entire app.

## Pre-fix owner checkpoint

Run from the repository on Windows, with exact base commit:
```bat
git fetch origin
git tag PRE-DAILY-BADGE-AND-AUTH-BALLS-11022026 d8b627f445dead1a72c1d09df913a370e3fb59db
git push origin PRE-DAILY-BADGE-AND-AUTH-BALLS-11022026
```
This deliberately tags the pre-fix SKI API idea commit, not the later amended branch tip. The owner pushes this tag personally.
