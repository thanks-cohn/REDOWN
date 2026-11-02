# Shelf save-impact and themed success — 2026-11-02

Implemented on `codex/v3-parity-first-reconstruction`, starting at `c1f0135002ad65158b50221fc4e93a0b93f32a70`. No installed-extension or authenticated provider acceptance is claimed.

## Diagnosis before editing

The baseline focused Shelf/counter run was 39 PASS / 3 FAIL. Recent commits were request clarifications (c1f0135, ef2549f, 5500cf6), not implementation proof.

Dropbox and OneDrive auth correctly call `storage.local.setAccessLevel(TRUSTED_CONTEXTS)`. The source-page injected droplet previously read the theme and wrote `redownShelfImpact` through that restricted API. The outer catch swallowed failures. This is a source-confirmed incompatible storage boundary, not proof of the owner's particular Chrome session. Also, the three non-R2 native dispatchers returned before the only droplet call. The old Shelf listener neither hydrated a fresh arrival nor provided reduced-motion feedback. No theme CSS override of the edge pseudo-element was found.

## Changes and safety boundaries

- `background.js`: read theme in the trusted background, pass only the palette into the existing isolated effect, and await the returned arrival before publishing a UUID/timestamp event. Orb geometry, colors, frames, easing, 860ms flight and source ring remain unchanged. Wire eligible native save IDs for Google, Dropbox and OneDrive without changing provider dispatch or menu composition. Login IDs do not launch it. Restricted injection emits nothing. Reduced motion returns a distinctly tagged `reduced-motion-dispatch` for a static in-Shelf acknowledgement, never a claim of flight or remote success.
- `transfer-counter.js`: under the existing history lock, persist provider totals and stable receipt IDs atomically with the existing counter/history write. Only explicit `ok:true`, `verified:true`, provider-tagged receipts with delivery IDs qualify. Google attribution uses the existing canonical verified file ID in `recordTransfer`; R2 V3 uses a dispatch delivery UUID and its existing HEAD verification. Dropbox/OneDrive use their existing job IDs. Successful Dropbox legacy dedup no longer reserves a delivery ID for a failure. Provider upload, OAuth and receipt-producing modules are unchanged.
- `shelf-save-feedback.js`: separate arrival and receipt consumers; fresh-event hydration for impact only; unique-ID dedup; rapid restart from S; bounded timers; hidden/navigation/theme/pagehide cleanup; static reduced-motion feedback; one accessible announcement per save, outside the visual blinking node. Reopening hydrates totals without replaying SUCCESS. Hidden completions persist totals without playing stale success later.
- `shelf.css`, `save-impact.css`, `shelf.html`, `shelf.js`, `popup.html`: shared pulse styling/consumer for Shelf and attached Popup; restrained italic system-serif success and counters; Neon whole-word green/yellow flashes and initially 52px arcade digits, measured down only when needed. The existing options target stays beside its action. Temporary success is in flow below the existing actions/free-tier copy and the measured readout, avoiding overlap; its added height disappears on cleanup. No permanently reserved SUCCESS row. The Popup retains its existing global odometer and controls.
- New focused tests, browser preview script, report and evidence. Existing tests/checkpoints unchanged. No V3 engine, native composer/writer, permissions, upload semantics, source metadata, privacy restriction, archive code, celestial director, ZIP feature or mascot work changed.

The per-provider caption says **“Verified · from this update”**. Totals start at zero; no reconstruction from the 50-row History window, and no provider lifetime claim. A tooltip gives the first recorded date once available. Unverified legacy/R2 queued receipts do not celebrate. The existing global historical counter remains separate. Dedup IDs are retained locally for exact future dedup; like other local persistence, storage quota/error or deletion can prevent recording, and no unlimited-storage permission was added.

System-serif options were rendered side by side and shown in chat before selecting the Palatino-style system stack (`Iowan Old Style`, `Palatino Linotype`, `Book Antiqua`, `P052`, `Georgia`, serif). Platform fallbacks vary. No remote/bundled new font dependency.

## Exact verification

All evidence below is local fixture/source evidence, never authenticated provider proof.

| Check | Result |
|---|---|
| `node --test tests/shelf-save-feedback.test.mjs tests/transfer-counter.test.mjs tests/shelf-celestial.test.mjs tests/right-click-dispatch.test.mjs` | PASS: 26/26, including failure/uncertain/cancelled exclusion, durable duplicate suppression, restricted injection, static reduced-motion dispatch, fresh/duplicate/stale/future arrivals, hidden/reopen, exact timed choreography and actual V3 dispatch |
| `node --test tests/google-drive.test.mjs tests/dropbox.test.mjs tests/onedrive.test.mjs tests/right-click-dispatch.test.mjs tests/global-bucket-activation.test.mjs` | FAIL overall: 115 PASS / 2 FAIL. Dropbox's existing `shelf-google-drive.js` checkpoint drift; OneDrive checkpoint now flags the authorized Popup markup wiring. No assertions or frozen hashes updated. |
| `node scripts/shelf-save-feedback-preview.mjs` | PASS: 72 count/width/theme combinations, 12 success cleanup cases; static reduced motion, Popup pulse and cleanup, 150% zoom, original source-orb browser flight/arrival/cleanup. Counts: 0,1,10,999,10000,90071992547409931234567890; widths: 320,390,480; themes: Porcelain, Midnight, Ocean, Neon. |
| Existing `shelf-celestial.test.mjs` | PASS: all 12 tests; source unchanged |
| `CHROMIUM_PATH=/usr/bin/chromium node scripts/shelf-celestial-preview.mjs` | FAIL: 320px Neon nav overflow; unchanged starting snapshot also fails (one run instead reached the pre-existing all-document-animation assertion, 4 versus 0). Wider 390/480 diagnostic run also hits that existing assertion. Flight/contact/overlay cleanup checks before that assertion pass; 390px orb video captured. Not a green full visual suite. |
| `npm run reliability:check` | FAIL: 889 PASS / 97 FAIL, versus untouched c1f0135 snapshot 884 PASS / 96 FAIL. All baseline failures remain; the only additional failing test is the OneDrive protected-Popup hash guard above. Syntax, registry and issue inventory stages PASS; architecture freshness FAIL. Runner marks regression incomplete against its older recorded baseline. |
| `git diff --check`; explicit syntax checks | PASS |
| Installed Chrome, real side-panel/toolbar behavior and authenticated provider acceptance | NOT_TESTED; no disposable authenticated provider setup or installed extension used. Repository records an unpacked-Chrome administrator restriction; not bypassed or independently retried here. |

The preview measures new content against the original page width. It does not hide the pre-existing ~329px Neon navigation width at a 320px viewport. New count widths fit their cards. Browser videos are ordinary Chromium with mocked Chrome storage and synthetic fixture notifications; labels/receipts in these fixtures are not actual cloud saves.

## Provider acceptance matrix

| Case | R2 | Google Drive | Dropbox | OneDrive |
|---|---|---|---|---|
| Local verified receipt gating, correct card and persistent/deduplicated count | PASS | PASS | PASS | PASS |
| Local non-success/cancelled/uncertain exclusion | PASS | PASS | PASS | PASS |
| Local repeated different IDs / restart dedup | PASS | PASS | PASS | PASS |
| Source audit of supported native dispatch wiring / login exclusion | PASS | PASS | PASS | PASS |
| Authenticated supported right-click + permitted arrival | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| Real final verified save + correct card/count | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| Real failure, cancellation or uncertain commit | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| Real OAuth/connection without saving and repeated jobs | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |

## Operator acceptance

1. Load the branch in an administrator-approved extension environment. Open Shelf and connect the four providers using existing controls. Connection alone must not celebrate or increase provider counts.
2. On a supported ordinary HTTPS source, use each provider's native save action. Confirm exactly one original source orb and a short Shelf-edge pulse at arrival; verify restricted Chrome pages do not claim a flight. In reduced motion expect a short static edge cue instead.
3. Wait for genuine verified completion. Confirm only the destination card celebrates and its measured count increments once. For Porcelain/Midnight/Ocean check S → SUCCESS!, OFF/ON/OFF/ON, third hold, then removal. Neon shows the entire green/yellow word, flashes briefly, then removes it.
4. Repeat saves rapidly; test failure, cancel/uncertainty, theme switching, hidden/reopened Shelf and worker restart. No false success or duplicate count. Compare History and the independent global odometer without assuming equal measurement periods. Check 320/390px, large values and reduced motion.
5. Repeat the impact check in attached Popup. Its global odometer remains the existing presentation. Check provider-card success in Shelf.

## Evidence

[Evidence directory](verification/shelf-save-feedback/) contains screenshots, four theme `.webm` recordings, source-orb recording, celestial-orb recording, font comparison, count geometry report, focused/provider logs, baseline full event log and final reliability JSON. `scripts/shelf-save-feedback-preview.mjs` reproduces the new visual fixture; Chromium and Playwright/ffmpeg are environment tools, not new project dependencies.
