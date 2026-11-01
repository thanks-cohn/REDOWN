# Google Drive direct save — implementation and acceptance

Implemented on `codex/v3-parity-first-reconstruction`, from baseline
`b1c2c162ed207513cbc18c9b4e7494ad1f5e46f8`, for the
[November 1 request](requests/2026-11-01_P0_GOOGLE_DRIVE_DIRECT_SAVE.md).
This is a locally tested candidate, **not installed-browser or live OAuth acceptance**.
No protected V3 changes were needed. Cloudflare R2 remains TRUE REMOTE;
Google Drive is explicitly browser-mediated.

## Architecture and boundaries

The existing background owns the only REDOWN root, Chrome context-menu writer,
serialized reconciliation lane, native click listener and runtime message listener.
The additive Drive declaration uses only `provider:google-drive` IDs. The pure
fragment composer validates ownership, unique IDs, parent-first placement,
cycles/orphans and a conservative 1,000-entry combined-plan capacity. Invalid
fragments return the untouched original plan. Cloudflare's original `project()`
and `resolve()` calls and all their inputs remain unchanged. Google clicks return
before Cloudflare resolution, including unknown Google IDs.

Cloudflare precedes Google; existing controls follow. Google remains present in
all V3 modes and connection states. The existing application-key hash additionally
includes a bounded Drive state/folder revision, with no network calls during
composition. Only acknowledged native menu updates count as registered. Chrome
cannot atomically reorder siblings. On structural changes, the same writer moves
the management control to the end using acknowledged remove/create; the root
survives, and the existing recovery restores management on errors. Known obsolete
Google action IDs are removed even when Chrome's persisted ID cache is missing.
Missing native provider roots are recreated and ordering repaired. This is shared
administrative placement, not a change to any V3 destination or resolver.

The transfer runs in `google-drive-transfer.html`, a visible extension-owned tab,
so ordinary MV3 worker suspension does not own the bytes. A fresh right-click
reuses the tab after a completed operation; an active transfer/connection is
focused instead of interrupted. There is one active transfer and no unbounded
queue. First use of a source origin requires a direct user-click permission grant.
Subsequent authorized right-click saves start after connection/folder validation.
A Google connection click opens the actual Chrome Identity flow in that page.

The client requests only `drive.file`, checks the configured extension ID, retrieves
an account-specific `permissionId` from Drive, and verifies the folder before
advertising readiness. Tokens exist only in page memory and Chrome Identity's
cache. They never enter storage/history/source requests. A Web Lock serializes
folder connection across extension pages; the page also serializes its own calls.
Account-keyed IDs and app-tagged, `drive.file`-accessible folder discovery prevent
adopting an unrelated folder merely named REDOWN. A generated Drive ID is saved
before folder creation: an ambiguous create is reconciled by that ID on reconnect,
not blindly repeated. Disconnect removes the current cached token and readiness;
it leaves saved files and stable folder mappings intact. It does not revoke the
Google account's consent remotely.

Source fetches omit credentials and referrers; redirects fail closed. Only public
HTTPS file URLs are supported. Blob/file URLs, credentials in URLs, literal local
addresses, HTML responses and inaccessible/authenticated sources fail truthfully.
The required Google API host permission is separate from optional HTTPS source
origins, requested one origin at a time. No source receives a Google token.

Bytes stream into a **fixed 32 MiB transient buffer**, then upload in aligned 1 MiB
resumable chunks. There is no giant service-worker Blob, Downloads call, persistent
payload file, new Worker or server relay. SHA-256 calculation and browser networking
can temporarily use additional memory; this is not a zero-cache/disk guarantee.
There is a ten-minute operation deadline, cancellation, progress, bounded session
status probes on transport uncertainty, and 30-second Drive request deadlines.
Source reading is bounded by the operation deadline and size cap.

An upload always creates a new Drive file (KEEP BOTH). The final saved ID, name,
parent, size, app transfer marker and SHA-256 checksum when Google supplies it are
independently read back. Only then does the page show success/Open in Google Drive
and send a verified provider-specific receipt to existing transfer history/counter.
Failure, blocked, cancelled and uncertain outcomes remain distinct. A page close or
restart records an uncertain interrupted transfer; it never automatically replays
it. A cancellation may leave a partial/completed Drive file. Check the folder
before retrying an uncertain operation. There is no cross-browser durable resume.

## Exact changes

| File | Purpose |
| --- | --- |
| `extension/background.js` | Additive imports, shared provider composition/freshness, acknowledged administrative ordering/stale-ID recovery, early Drive click/message dispatch and state-triggered reconciliation only |
| `extension/manifest.json` | Add `https://www.googleapis.com/*` host access and optional `https://*/*` source-origin declarations; OAuth client/scopes, public key, boot and R2 permissions unchanged |
| `extension/shelf.html` | Add connection control immediately after the existing eyebrow, before the headline, plus its stylesheet/script |
| `extension/google-drive-menu.js` | Pure Google declaration and shared administrative ownership/merge validation |
| `extension/google-drive-provider.js` | Single-page/job routing, sender-gated receipt/history bridge, interrupted-page recovery; no token/file transport or native writer |
| `extension/google-drive-api.mjs` | Scoped OAuth, account-bound folder lifecycle, bounded source fetch, resumable upload and verification |
| `extension/google-drive-transfer.html` / `.mjs` | Connection, disconnect, source consent, progress/cancel, links and truthful result UI |
| `extension/google-drive-controls.css` | Responsive, theme-inheriting control and transfer-page styles |
| `extension/shelf-google-drive.js` | Shelf state, accessibility status, login and folder link |
| `extension/assets/google-drive.png` / `GOOGLE_DRIVE_ATTRIBUTION.md` | Bundled official Google Drive product icon and Google trademark/source attribution |
| `scripts/syntax-targets.json` | Include all new executable modules in normal syntax checks |
| `scripts/package_chrome_store.py` | Include logo attribution; existing dependency traversal packages the new runtime modules/assets |
| `scripts/google-drive-preservation.mjs` | Replay the immutable original V3 source against active multi-account mode fixtures and compare exact plans/targets |
| `scripts/google-drive-visual.mjs` | Repeatable local Chromium theme/width/state and keyboard fixture |
| `tests/google-drive.test.mjs` | Provider, transport, account/folder, non-interference, native writer mock and sender regression coverage |
| `docs/verification/google-drive/*` | Redacted preservation/test/browser/visual receipts and limited background diff |
| `docs/GOOGLE_DRIVE_DIRECT_SAVE.md` | This implementation/setup/acceptance report |

The service worker, V3 engine/current model/editor, nested locations, destination
configuration, R2 adapter, R2 transfer routines, Shelf boot/fallback, history renderer,
Cloudflare authentication and stored V3/Cloudflare data models were not edited.

## Verification actually performed

| Check | Result / evidence |
| --- | --- |
| Protected V3 engine/support/editor files | Six SHA-256 hashes identical before/after; [before](verification/google-drive/before.json), [after](verification/google-drive/after.json) are byte-for-byte identical |
| V3 plans/IDs/targets/actions | Nine initial deterministic mode/profile scenarios plus [nine supplemental immutable-baseline replays](verification/google-drive/mode-parity.json), including active multi-account Depth inventory and unactivated buckets, retain identical projections and per-ID remote-save resolutions; mixed Google states filter back to original plans |
| R2 transfer routines | `ingestCloudflareAtPrefix` and `saveResolvedRightClick` text hashes identical: [receipt](verification/google-drive/r2-preservation.json) |
| Focused client + existing dispatch/entry tests | **65/65 passed**: `node --test --test-force-exit tests/google-drive.test.mjs tests/right-click-dispatch.test.mjs tests/entry-point-reliability.test.mjs`; [log](verification/google-drive/focused.log) |
| Existing V3 tests, unchanged | Executed in both full comparisons; pre-existing failures remain (including missing globals in older VM fixtures). Not claimed green |
| Full local comparison | Baseline: 82 files, 58 passed, 24 nonpassing. Candidate: 83 files, 59 passed, the same 24 nonpassing; `beta-explorer` hits the 25-second file bound in both. [Comparison](verification/google-drive/suite-comparison.json). The Worker-setup GUI assertion also fails in isolated runs at both revisions. No new nonpassing file; this is **not a full-suite PASS** |
| `npm run check` | Passed, including new module syntax and worker import closure |
| `npm run reliability:check` | **Failed**: syntax, API registry and issue inventory pass; existing architecture freshness and regression debt/incomplete full suite remain. [Summary](verification/google-drive/reliability-summary.json); no historical hashes were refreshed |
| Package audit | `python scripts/package_chrome_store.py --audit-only` passed; 95 runtime/attribution files. License mismatch still blocks release; not a store submission |
| Local Chromium Shelf | **48/48** state/layout checks across porcelain/midnight/ocean/neon at 280/360/760px; native Space-key activation passed. [Metrics](verification/google-drive/visual.json), [porcelain](verification/google-drive/shelf-porcelain.png), [midnight](verification/google-drive/shelf-midnight.png), [ocean](verification/google-drive/shelf-ocean.png), [neon](verification/google-drive/shelf-neon.png). HTTP fixture with mocked Chrome APIs, not installed UI proof |
| Installed candidate | **BLOCKED**, zero assertions: Chromium reports `Loading of unpacked extensions is disabled by the administrator.` [Exact receipt](verification/google-drive/installed-chrome.json). No policy bypass attempted |
| Real Google login / real Chrome PNG and PDF / binary integrity / Downloads observation | **BLOCKED** by installed-extension policy and unavailable owner Chrome/Google session. The binary PNG/PDF and chunk tests exercise the real client against mocked APIs; they do not prove real OAuth/Drive success |
| Live Cloudflare TRUE REMOTE | Not run; no provider mutation or deployment was performed |

Focused mocks cover scope denial/cancel, invalid client and extension ID, 401/reconnect,
revoked scopes, 403/429/5xx, account isolation, reconnect/restart folder reuse,
concurrent folder creation, ambiguous creation, binary PNG/PDF, chunk alignment,
KEEP BOTH, receipt corruption, unknown-size overflow, interrupted upload, cancellation,
source safety/permissions, token separation, no Downloads API, provider click isolation,
invalid subtrees/collisions/capacity, rapid combined rebuilds, stale native caches,
partial native failure/recovery, restart, repeated saves and history sender gates.
Testing-mode allowlisting/Google production verification cannot be proven by mocks.

## Owner's remaining acceptance

The request records owner screenshots confirming Drive API enabled and the existing
Chrome Extension OAuth client matches `mkadkgpekmkknfbniacdlmgikihjjepf`. This implementation
keeps that client and the committed public key; do **not** create a replacement client.
A screenshot/configured manifest is not live authentication proof.

1. Use an administrator-approved Chrome environment that permits the candidate's
   installation under that exact ID. Reload/reinstall this branch's candidate.
2. In the existing `redown-click2cloud` project, confirm Audience is External/Testing,
   the intended account is a Test user, and Data Access contains only `drive.file`.
   Do not publish the test-user email or tokens in this repository.
3. The documented build configuration is `extension/manifest.json` →
   `oauth2.client_id`; it already contains the owner-confirmed public client ID.
   No secret is required. Keep `oauth2.scopes` exactly as committed. If intentionally
   changing the extension key/ID, obtain the matching Chrome Extension client and
   update the explicit expected ID check in `google-drive-api.mjs` together; the
   current candidate intentionally fails on an incorrect installation ID.
4. Connect from the Shelf with Cloudflare disconnected. Verify one REDOWN folder
   appears in My Drive. Right-click disposable PNG and PDF links. On first use,
   approve only the source origin in the transfer tab; keep that tab open. Inspect
   Drive file IDs, parents, binary content/size/checksum and the history receipts.
5. Observe Downloads/filesystem: no deliberate permanent local file should be
   created. Verify the bytes traveled through Chrome and no server relay was used.
6. Restart Chrome; reconnect and confirm the same folder ID and another successful
   save. Revoke access, reconnect, cancel a transfer, deny a source grant, and repeat
   saves. Verify accurate failures/uncertainty rather than a false success.
7. Exercise Simple, Narrow and Level/Depth, empty/disconnected/unactivated Cloudflare,
   rapid mode/login transitions, Shelf/history and existing R2 remote saves. Capture
   native menu ordering and Chrome callback errors independently of local mocks.

All eight real-owner acceptance steps in the request remain **BLOCKED / not run**.
No Google OAuth production verification, Google approval, store acceptance, live
Drive upload or live R2 regression pass is claimed. There is **no blocker requiring
protected V3 code changes**; the outstanding blockers are installed-browser/provider
acceptance and existing repository regression/release debt.
