# Provider filename, background Drive and Shelf feedback

## Audit and minimal implementation plan (2026-11-02)

Baseline: clean feature branch `codex/flat-provider-native-menus` at
`92ba4071df3d3057f6611a71e00ed5d1ec61c844`. Read the entire November 2
request, referenced read-only audit instructions and existing flat-menu report.
The new owner request authorizes implementation, superseding the old audit-only
scope. Installed Chrome was previously administrator-blocked; no native-visible
or live-provider acceptance is established by that audit.

Affected components inspected: Dropbox API filename parsing (provider requests,
root header, session cursor, autorename commit and metadata proof); Google page
API and transfer page (32 MiB full buffer, app-created REDOWN folder, tab lifetime),
worker dispatch; transfer counter/history archive; Shelf cards, theme, existing
Cloudflare effects, Popup sound preferences; shared menu/V3 preservation fixtures.

Plan:
1. Change Dropbox filename selection only. Preserve its sanitizer and every
   provider request field, source request policy, metadata, receipts and collisions.
2. Replace ordinary Google leaf saves with a durable worker queue and bounded
   resumable upload client. Reacquire cached OAuth noninteractively, checkpoint
   identity/session/offset, reconcile interrupted commits, verify metadata before
   receipts. Default new saves to My Drive root; never create a REDOWN folder.
   Retain the legacy page API as compatibility code, not the ordinary save route.
3. Add a separate per-provider counter alongside the global odometer, based on
   successful durable receipt identities, without resetting either existing state
   or history. Add theme-aware Shelf feedback and independent sound preferences.
4. Run focused and full tests, protected-file comparison, syntax/reliability,
   reproducible Chromium mock visual checks and installed-extension attempt.
   Record blockers honestly; commit/push only this feature branch.

MV3 decision: use the existing worker + alarms pattern, not an offscreen document
with a fictitious keepalive reason. No new manifest/OAuth/host permission. Persist
checkpoints between bounded upload requests; restart probes the Drive session and
refetches source ranges only with a strong validator and known length. Sources
without safe range recovery report interruption rather than splice changed bytes.
No multi-GB buffering, unlimited-size claim, or service-worker immortality claim.

## Implemented behavior and preservation boundary

### Dropbox filename and exact request comparison

Precedence: valid RFC 5987 UTF-8 `filename*` (including language tag), plain quoted
or unquoted Content-Disposition filename, one unambiguous visible matching link's
`download` attribute already accessible through the native gesture, then response
URL / selected URL's last path component. Invalid percent escapes fall through;
query and fragment are never filenames. No query-parameter guessing. A path in a
header contributes only its final component. NFC, control/bidi/path-character
sanitization and the existing 240-byte extension-preserving sanitizer apply.
Known MIME supplies a suffix only to a real extensionless name; a genuine extension
wins on MIME disagreement. Unknown MIME keeps extensionless names. No reliable
name means the existing `Web file` fallback. The existing redirect:error policy is
unchanged: redirects remain unsupported, with no extra fetch or origin inspection.
Only a unique visible exact-link match can supply a DOM hint; restricted frames
and ambiguous matches fall back to the existing source response.

| Provider request | Before and after fields / behavior |
| --- | --- |
| Every Dropbox API call | Authorization, Content-Type, Dropbox-API-Path-Root; same root namespace, credentials:omit, redirect:error, no-referrer, timeout/retry/error policy |
| Session start | Same empty body; Dropbox-API-Arg `{close:false}` |
| Session append | Same bounded bytes; cursor `{session_id,offset}`, `close:false`; exact offset conflict recovery unchanged |
| Finish | Same empty body; cursor unchanged; commit `{path,mode:'add',autorename:true,mute:true,strict_conflict:false}` |
| Metadata readback | Same `{path:receipt.id}`, account pinning, fields and matching proof |
| Receipt/History | Same existing fields, including existing source/page/frame/link provenance retained locally; provider-returned collision name remains authoritative |

**Only `commit.path`'s filename value changes semantically**, for example
`/image` becomes `/猫 photo.png`. No request field/header is removed, renamed or
added. Raw source headers, origin, source/page/link/frame URLs are not added to any
Dropbox request. `autorename:true` continues to let Dropbox produce `(1)`, `(2)`
and later suffixes; its implementation is unchanged. The new test compares the
entire call/proof and session/append/finish source blocks against the feature
baseline, alongside the existing real-byte mocked collision tests. It is not live
Dropbox proof. No Dropbox scope, credential, provider metadata or manifest change.

### Google background route

The ordinary leaf and Shelf login no longer open a transfer tab. Chrome Identity
uses the existing exact extension ID/client and only `drive.file`; connected saves
use noninteractive cached authorization and verify the pinned account. New source
permissions are requested only on a native gesture, using existing permissions.
Expired/revoked auth is a reconnect state, never bypassed. The queue is bounded to
eight jobs and serialized; concurrent gestures retain distinct job identities.

Each job persists a preallocated Drive file ID, account, filename, MIME, session,
source validator, total and acknowledged offset before/after bounded requests.
The API sends 4 MiB chunks (multiples of Google's 256 KiB rule), with one-chunk
lookahead to avoid declaring EOF before source completion. There is no whole-file
Blob/ArrayBuffer or 32 MiB limit on this route. Drive's finite service size/quota
limits remain (client safety ceiling 5 TiB); the 2 GiB test uses a generated stream,
not a 2 GiB allocation or real upload.

A resumed worker probes the upload session, resumes only with known length and
strong ETag plus exact Content-Range, and reconciles final metadata by the same
preallocated ID. It cannot silently create a second file after an ambiguous finish.
Unsupported safe resume, session expiry, changed account/source, missing permission,
quota and cancellation are truthful interrupted/blocked/uncertain states. Alarms
recover jobs after worker or browser restart; three unsuccessful automatic attempts
end uncertain and require user inspection/new action. Nothing replays consent.
Terminal receipts persist before History recording and replay by durable ID if
recording was interrupted. Old transfer-tab active status becomes uncertain.

New files omit `parents` to use authorized My Drive root. No folder is created,
renamed, moved or deleted; existing auto-created REDOWN folders/account records are
left intact. Google receives `{id,name,mimeType}` (and only an explicitly supplied
job destination's parents), actual bytes and required upload headers. Source and
page provenance never enters the Google request. Same-name saves allocate distinct
files, preserving Drive's existing duplicate-name semantics. Metadata readback
checks ID/name/size/nontrashed state and an explicit parent when present. This is
metadata confirmation, not an independent cryptographic readback of remote bytes.

The retired page client/API remain compatibility source; they are not the ordinary
menu/login route and their old cap/folder behavior is not presented as seamless
implementation evidence. Page-supplied completed receipts are now rejected: only
the worker's verified jobs can produce new Google success receipts.

Official documentation inspected on November 2:
[MV3 lifetime](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
(30-second inactivity/fetch-response limits and five-minute request limit) and
[Drive resumable uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads#resumable)
(256 KiB-aligned chunks, 308/Range progress, session probes). Requests/source reads
are bounded by 25-second timeouts. No claim that an event, alarm, service worker
or source without range validators can run forever. No offscreen permission or
invented offscreen reason was added. Actual long-lived browser execution is unverified.

### Counters, visual lifecycle and audio

`providerSaveCounters` is distinct from `transferCounter` and contains decimal
BigInt totals per Google/Dropbox/OneDrive/Cloudflare plus a durable receipt-ID ledger.
No ledger eviction or intentional reset. Browser finite storage quotas still apply;
a failed local write does not consume the receipt or publish a false count.
Migration unions retained History and the paged local archive, credits only proven
successful receipts, deduplicates operation identities, records its basis/start time,
and retries an unavailable archive. Historical unverified/unidentifiable saves
cannot be reconstructed into an exact all-time total; their absence is not guessed
from the global odometer. Archived history and old global totals are not rewritten.

New Cloudflare completion receipts get a local operation UUID without modifying
the transfer engine, Worker payload or V3 projection/resolution. Existing V3,
CURRENT, destination models and shared registrar are unchanged. Legacy Cloudflare
paths without sufficient receipt evidence are not given a speculative count.
The global odometer retains its original rules, including Dropbox's existing
128-receipt dedupe window. The separate provider ledger remains idempotent even
after that window and the 50-row History window are pruned. This intentionally does
not silently redefine or reset the old global count.

Count and SUCCESS persist after a proven save; no success label appears at zero.
Only a fresh live completion event can trigger a 1.25-second border glint and, in
Neon, centered rising +1 with a two-color glowing square. Initial load, restored
History, duplicate receipt, uncertain/failed/cancelled job or old event is silent.
Normal themes retain their type/palette; Neon alone uses Bitcount Grid Double Ink,
bundled unmodified from google/fonts with its SIL OFL. Full count is in accessible
text/title; large values use a bounded scientific display, without precision loss
in storage. Compact cards stack the same logical flow rather than hiding counts or
covering ⋯. Cloudflare quota badge styling/position is not part of the spacing edit.

The existing `launchSaveDroplet` component is reused verbatim in timing/trajectory
for sibling provider gestures. Its 860 ms orb and 420 ms ring signal dispatch/start,
just as on Cloudflare; they never increment a counter or mean verified success.
Both this effect and the receipt celebration honor reduced motion, forced colors
and the new effects suppression preference. No extra registrar was added.

Neon sound defaults ON, volume 0.18; the original locally synthesized three-note
square-wave chime has no external sample/license dependency. Odometer sound defaults
OFF and uses the existing separate `popupOdometer.soundEnabled` preference, shared
with Shelf, with a distinct short mechanical tick. Existing explicit odometer sound
choices are preserved, never enabled by Neon. Settings expose separate toggles,
volume and effects suppression. Audio is best-effort while a Shelf is open and
Chrome permits an AudioContext after a gesture; a closed Shelf or autoplay denial
is silent, never blocks a save, and never plays catch-up success audio on reopening.
No offscreen/background-audio claim or new permission is made.

## Actual verification

Implementation commit: `cc65f88bd4ad845955d95741b51edda227e3effe` on `codex/flat-provider-native-menus`.
Local Linux / Node 24.19.0 / Chrome 154.0.8037.57. Evidence scope is explicit:

| Verification | Actual result |
| --- | --- |
| Clean baseline `npm test` | 985 total / 888 pass / 97 fail |
| Final implementation `npm test` | 1,024 total / 927 pass / 97 fail; zero newly failing or resolved failure names against the clean branch |
| New `tests/provider-seamless.test.mjs` | 39 / 39 pass, including a generated 2 GiB + 17-byte stream |
| Provider/flat-menu/counter/Popup focused set | 161 total / 158 pass / 3 existing failures |
| `npm run check` | Pass, including classic-worker import closure and new scripts |
| `npm run reliability:check` | FAIL: syntax, registry, issue inventory pass; architecture and historical regression/readiness gates fail |
| Chromium HTTP mock Shelf | 12 theme/width cases (Porcelain, Midnight, Neon × 280/360/480/760), layout/control geometry and independent sound toggle pass |
| Installed Chrome | BLOCKED by administrator: unpacked extensions disabled; zero installed assertions |
| Live Google/Dropbox/OneDrive or Cloudflare readback | NOT RUN; no connected disposable provider/browser environment available |
| Package `--audit-only` | 113 files; ZIP integrity/assets/font/OFL present; existing root/bundled license drift still blocks release |

The focused failures remain the preexisting Dropbox Shelf hash, bundled LICENSE
hash and Popup READY/Dashboard expectation. Frozen evidence assertions were not
weakened/refreshed. Tests that formerly required Google transfer tabs now assert
the durable background route and reject external completed receipts. Two isolated
Popup routing fixtures now provide Chrome's real `crypto` global for receipt IDs;
their routing assertions remain intact. The installed harness now uses the
manifest's actual service-worker filename, fixing the audited background.js mismatch;
administrator policy still prevents reaching that assertion.

The reliability tool compares to its older frozen regression baseline and reports
many baseline debts as new relative to that old checkpoint. The separate evidence
`results.json` compares actual clean-branch and candidate executions and lists all
97 unchanged failure names. Neither result is a green release certificate.
An initial attempted baseline without node_modules failed dependency loading and
was discarded; the recorded baseline was rerun after the prescribed `npm ci`.

Reproduce with:

```sh
node --test tests/provider-seamless.test.mjs
node --test tests/provider-seamless.test.mjs tests/flat-provider-menus.test.mjs tests/google-drive.test.mjs tests/transfer-counter.test.mjs tests/dropbox.test.mjs tests/onedrive.test.mjs tests/popup-folders.test.mjs tests/popup-destinations.test.mjs
npm run check
npm test
npm run reliability:check
node scripts/provider-seamless-visual.mjs
python3 scripts/package_chrome_store.py --audit-only
node scripts/installed-chrome.mjs /absolute/path/to/extension work/installed-chrome.json
```

See [verification evidence](verification/provider-seamless/results.json),
[requirement tests](verification/provider-seamless/requirements.log),
[reliability report](verification/provider-seamless/reliability.json),
[installed blocker](verification/provider-seamless/installed-chrome.json),
[Porcelain](verification/provider-seamless/visual/porcelain-360.png),
[Midnight](verification/provider-seamless/visual/midnight-360.png),
[Neon](verification/provider-seamless/visual/neon-360.png),
[confirmed-save animation frame](verification/provider-seamless/visual/neon-confirmed-save.png),
and [audio Settings](verification/provider-seamless/visual/settings-audio.png).
These screenshots use synthetic on-device receipts in an HTTP fixture, not an
installed extension. Neon at 280px retains a preexisting unrelated footer-link
horizontal overflow; affected provider card/control bounds pass. No whole-page
no-overflow claim. The font/OFL are copied unchanged, including upstream whitespace
on OFL line 21; the whitespace checker flags that vendor-license line only.

## Exact implementation file inventory

- `extension/assets/fonts/BitcountGridDoubleInk-OFL.txt`
- `extension/assets/fonts/BitcountGridDoubleInk.ttf`
- `extension/background.js`
- `extension/dropbox-api.js`
- `extension/dropbox-provider.js`
- `extension/google-drive-provider.js`
- `extension/google-drive-stream.js`
- `extension/popup.js`
- `extension/shelf-celebrations.js`
- `extension/shelf-google-drive.js`
- `extension/shelf-odometer.js`
- `extension/shelf.css`
- `extension/shelf.html`
- `extension/transfer-counter.js`
- `scripts/installed-chrome.mjs`
- `scripts/package_chrome_store.py`
- `scripts/provider-seamless-visual.mjs`
- `scripts/syntax-targets.json`
- `tests/flat-provider-menus.test.mjs`
- `tests/google-drive.test.mjs`
- `tests/popup-destinations.test.mjs`
- `tests/popup-folders.test.mjs`
- `tests/provider-seamless.test.mjs`

The evidence commit additionally adds this report and
`docs/verification/provider-seamless/` (raw baseline/regression/focused/requirements
logs, syntax/reliability/package records, font provenance, installed blocker,
comparison JSON and visual screenshots/results). No manifest, credential, OAuth
scope, V3/CURRENT model, native registrar or embedded R2 Worker body changed.

## Release, acceptance and rollback

This is a feature-branch implementation candidate, not installed/browser/provider
release certification. Do not merge or publish on the strength of mocks. In an
administrator-approved browser, verify the loaded path/extension ID and visible
leaf rows; test connected/disconnected/revoked auth, all five native contexts,
small/large/unknown-length files, concurrent gestures, actual worker/browser restart,
source-range refusal, duplicate receipts, same-name collisions and provider metadata
readback. Exercise three Shelf themes, keyboard ⋯ targets, reduced motion/forced
colors/effects mute, distinct sound toggles, autoplay denial and reopening without
catch-up sound. Verify Cloudflare Simple/Narrow/Depth/CURRENT against saved targets.
No policy bypass or live cloud writes were used during this implementation.

Limitations: existing 97 regression failures; administrator-blocked Chrome;
provider auth/readback and sustained real multi-GB execution unverified. The
worker queue can safely resume only suitably ranged/validated sources; unknown-
length or extensionless inputs do not magically make an unresumable source safe.
No exact historical count is invented for missing receipts. Counter/receipt
storage is finite and audio is subject to Shelf visibility/browser policy.

Rollback: pause/cancel active Google jobs and inspect any uncertain remote file
before restoring the prior version. Revert implementation commit `cc65f88bd4ad845955d95741b51edda227e3effe`
on the feature branch (do not rewrite branch history or main). Retain
`providerSaveCounters`, Google job receipts, legacy History/archive and all provider
credentials; no deletion/reset is required. The old code ignores the new local
keys. Its old Google transfer-page limitations return. The separate documentation/
evidence commit may remain as the audit trail or be reverted independently.
