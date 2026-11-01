# Dropbox OAuth and one-click save

Implemented on `codex/v3-parity-first-reconstruction` for the [November 1 P0 request](requests/2026-11-01_P0_DROPBOX_OAUTH_ONE_CLICK_RIGHT_CLICK_SAVE.md). This is a locally verified implementation candidate. **Installed-extension and real Dropbox acceptance remain blocked, not passed.**

Baseline commit: `0297d0f4439face79e2a16e39d430f1fc7a84e5e`.
Implementation commit: `bdd0b79db2180b860ace5c3a9cb6778ee1059845` (this report/evidence follow-up is a subsequent commit).

## Delivered behavior

The existing shared native writer registers Cloudflare, the complete unchanged Google Drive subtree, then Dropbox at the same provider level, with management last. Connected Dropbox has one actionable `provider:dropbox` leaf: clicking it starts a browser-mediated save into the verified account namespace's root `/`. There is no second Save click, transfer document, Dashboard navigation, Downloads operation, relay, offscreen document or new native click listener. The only authentication UI is Chrome Identity's explicit OAuth flow. A source-origin permission prompt can be required the first time an HTTPS origin is used; it creates no transfer page.

Disconnected Dropbox has `Dropbox → Log in to Dropbox…`. Successful login resumes that pending source snapshot once, within ten minutes and with account checks. Shelf login creates no transfer job. Unknown Dropbox IDs return before V3 routing. Multiple separate authenticated clicks create separate KEEP BOTH jobs; an identical event object is not dispatched twice.

The Shelf control is immediately below Google Drive, before the original headline. It inherits the existing themes and offers connection, checking, connecting, reconnect, disconnect, Open Dropbox and cancellation. Initial loading shows **Checking Dropbox…**, not a login flash; a connection checked more than five minutes ago is reverified before showing connected. Reopening the Shelf does not request OAuth. The original Google control, Cloudflare hero, navigation and odometer remain in place. The diamond is a CSS/text decoration, not a bundled third-party logo.

## Authentication and destination isolation

`dropbox-auth.js` uses public app key `h0mbahfonf0zkul`, Authorization Code + PKCE S256, 256-bit verifier/state, offline authorization and exactly the four requested scopes. It requires the runtime extension ID and `getRedirectURL('dropbox')` to equal the registered `mkadkgpekmkknfbniacdlmgikihjjepf` redirect. Redirect origin/path, credentials, fragment, state/code multiplicity, attempt age and consumed-attempt identity are checked before exchange. No app secret is used.

Only an account-verified refresh credential and exact account/connection/namespace identity persist in `dropbox:auth`. Access tokens remain in worker memory. Local and session storage access is restricted to trusted extension contexts before credential use. Source requests never receive Dropbox authorization. Token/API responses are not logged or exported to History. Explicit disconnect removes credentials locally, cancels queued work and best-effort revokes the current access token; remote revocation cannot be guaranteed while offline.

Refresh is noninteractive and rechecks the original account. The adapter accepts only a personal/user root with matching root/home namespace IDs; listing root must succeed, and OAuth must grant file-content write scope. Every Dropbox file call explicitly binds `Dropbox-API-Path-Root` to that namespace. The publisher's Full Dropbox app configuration remains a prerequisite; no API available here independently certifies App Console settings or production approval. Readiness uses scoped account/root checks; **a successful write is established only by the actual upload and metadata receipt**, never by token presence alone. Team/restricted or changed roots fail closed. Reconnection changes connection identity, preventing old jobs from inheriting a new account's authorization.

No folder-creation endpoint exists in the Dropbox adapter. It never creates `/REDOWN`, `/Apps/REDOWN`, a hidden holding folder or per-transfer folders. Google Drive's separate existing folder behavior is preserved.

## Transfer and recovery contract

One service-worker coordinator runs one active upload and stores a bounded queue of **eight unresolved jobs**, with up to 24 reported terminal checkpoints. A full queue gives a clear wait/retry status. Jobs carry provider, account, connection, source/page/frame/link snapshot, session, offset, validator, length, phase and final receipt. No source payload is persisted. A 30-second Chrome alarm recovers pending work on supported wakes; idle recovery alarms are cleared. Jobs arriving during an active pass can wait until the next alarm. Chrome does not promise an exact wake time.

All file sizes use Dropbox upload sessions: zero-byte start, 4 MiB append buffers and empty finish. This is valid for small/empty files too; no separate single-upload optimization is required. There is no 32 MiB REDOWN cap. The provider ceiling is **2^41 − 2^22 bytes**, per the current Dropbox finish documentation; this is not a promise that Chrome can transport arbitrary huge external files unattended. Transient memory includes the 4 MiB staging buffer, an incoming browser chunk and browser/API buffers. No permanent local download is deliberately created; OS/browser caching or paging is not ruled out.

The coordinator checkpoints each acknowledged append. On worker revival it resumes only with a known total and strong ETag, a matching `If-Match`/Range response, exact Content-Range and unchanged validator. It handles a checkpoint exactly at EOF. Replaying an append whose acknowledgement was lost accepts only Dropbox's exact expected next offset; other offsets fail closed. Unknown-length sources stream normally, but interrupted sources without strong resumability evidence require an explicit new save. Expired URLs, HTML, redirects, credentials, blob/file/local URLs, inaccessible sources and unsupported byte ranges are reported truthfully. Credentials/referrers are omitted from source requests.

Provider requests and each source read have 25-second deadlines. Explicit 429 responses use at most two bounded backoffs; read-only metadata checks may retry 5xx. Ambiguous start/append/finish writes are not blindly replayed. A crash in the durable `committing` phase is **uncertain** and requires checking Dropbox before another save; it never automatically repeats finish. A persisted final receipt can resume independent metadata verification without another upload. Cancellation during commit/verification is uncertain because a remote file may exist. Cancellation earlier can leave an abandoned provider session, not a deliberately published file.

Finish uses `mode:add`, `autorename:true`, never overwrite. The final file ID, name, root path, byte size, revision and supplied content hash are captured and independently checked with `files/get_metadata`. The client does not independently recompute Dropbox's content hash; live binary integrity remains part of owner acceptance. Only verified remote completion becomes Successful or increments the counter. A Dropbox-only delivery ledger is saved in the existing counter/history write so a crash after recording cannot count the same job again. Existing Google/Cloudflare counting semantics are unchanged. Source context and provider/account/root receipts remain in History; original Cloudflare History GO TO behavior is unchanged. Dropbox does not pretend to be an R2 Explorer location; Open Dropbox is provided on the Shelf.

## Changed files

| Files | Purpose |
| --- | --- |
| `extension/dropbox-auth.js` | Isolated PKCE, refresh, account/root checks and disconnect |
| `extension/dropbox-api.js` | Safe source handling, bounded upload sessions, offset recovery and metadata proof |
| `extension/dropbox-menu.js` | Pure native declaration, exact namespace and bounded revision |
| `extension/dropbox-provider.js` | Worker queue, checkpoint/receipt recovery, sender-gated Shelf actions |
| `extension/shelf-dropbox.js`, `dropbox-controls.css` | Connection/progress controls and theme-inheriting responsive styling |
| `extension/background.js` | 22 additive lines and three replacements: imports, compose/freshness/obsolete-ID hooks and early dispatch; no V3/R2 routine edits |
| `extension/google-drive-menu.js` | Minimal authorized shared-composer sibling hook; original Google declaration and route behavior preserved |
| `extension/shelf.html`, `manifest.json` | Adjacent Shelf block/assets; three Dropbox host permissions; Google OAuth/key and existing permissions preserved |
| `extension/transfer-counter.js` | Four additive lines and one replacement for Dropbox-only delivery deduplication |
| `scripts/syntax-targets.json`, `dropbox-preservation.mjs`, `dropbox-visual.mjs` | Syntax/import closure, immutable Git replay and local Chromium fixture |
| `tests/dropbox.test.mjs` | 52 focused Dropbox cases |
| `tests/google-drive.test.mjs` | Update only Shelf sibling-placement assertion for the explicitly requested adjacent Dropbox control |
| `docs/verification/dropbox/*`, this report | Source hashes, route comparisons, test and browser/package evidence |

## Verification actually performed

| Check | Actual result |
| --- | --- |
| Required diagnostics | Start guide and registry available; issue/readiness reports partial. [Receipt](verification/dropbox/diagnostics.json) |
| Protected source | **16/16 identical SHA-256**, including V3/current/config/editor, Cloudflare and Google transport/auth/UI files. The expressly authorized shared-composer hook is recorded separately. [Before](verification/dropbox/before.json), [after](verification/dropbox/after.json) |
| V3 engine SHA-256 | Before and after: `e5867f4d7fb06a20654f5f38a80c7927c1a6e4f23b3d2d908b34d509ebd13975` |
| Original plans and account/bucket/prefix routes | **108/108** comparisons identical after filtering only Dropbox IDs, across Simple/Narrow/Depth, active/empty/unactivated profiles and mixed Google/Dropbox states. Both R2 save-routine text hashes identical. [Replay](verification/dropbox/after.json) |
| Shared glue | [Small auditable diff](verification/dropbox/shared-glue.diff); one root/writer/native click listener retained |
| Focused Dropbox + Google + native dispatch + entry tests | **117/117 pass**, including **52 Dropbox tests**. [Log](verification/dropbox/focused.log) |
| Full `npm test` | Baseline **873: 783 pass / 90 fail**; candidate **925: 835 pass / the same 90 fail**. No added/resolved failure identities. The suite is **not green**. [Exact comparison](verification/dropbox/suite-comparison.json), [baseline log](verification/dropbox/baseline-tests.log), [candidate log](verification/dropbox/candidate-tests.log) |
| Cloudflare regressions | Protected bytes and original routes unchanged; full-suite failure identities unchanged. Existing Cloudflare mock failures remain; no live Cloudflare claim |
| Syntax/import closure | `npm run check` passes, including classic worker import closure. [Log](verification/dropbox/syntax.log) |
| Reliability | **Failed**, with architecture freshness and historical regression debt/incomplete classification retained. Syntax, API registry and issue inventory pass. Fresh branch comparison above, not the stale historical registry, establishes no added failure identities. [Receipt](verification/dropbox/reliability.json) |
| Packaging | Audit passes with **101 runtime/attribution files**, all six new Dropbox assets checked against ZIP bytes. Existing license drift still blocks release. Not a Store submission. [Inventory](verification/dropbox/package.json) |
| Local Chromium Shelf | **48/48** theme/width/state checks plus native keyboard Space activation pass; four themes at 280/360/760px. [Metrics](verification/dropbox/visual.json), [Porcelain](verification/dropbox/shelf-porcelain.png), [Midnight](verification/dropbox/shelf-midnight.png), [Ocean](verification/dropbox/shelf-ocean.png), [Neon](verification/dropbox/shelf-neon.png). HTTP fixture, mocked Chrome APIs |
| Installed Chrome | **One blocked installation attempt; 0 installed assertions.** Chrome 154 reports `Loading of unpacked extensions is disabled by the administrator.` No policy bypass attempted. [Exact receipt](verification/dropbox/installed-chrome.json) |
| Live OAuth/provider | **0 live OAuth passes, 0 real Dropbox uploads, 0 live Google/Cloudflare transfers.** No owner provider session/credentials were available; installed-extension policy also blocks acceptance. Mock no-tab/root/autorename results are not live proof |

Tests cover PKCE/offline scope and redirect/state failures, revoked/mismatched accounts, trusted storage, zero-byte/Unicode/unknown-length/>32 MiB uploads, 401/403/409/429/5xx, bounded backoff, metadata corruption, lost append acknowledgement, range/EOF recovery, interrupted commit/receipt recovery, cancellation, queue bounds, duplicate history delivery, exact native ordering and invalid fragments, stale native caches, partial registration failure, restart and source/token isolation. Tests do not simulate every possible provider error or prove arbitrary-size browser lifetime.

## Remaining installed-owner acceptance

Use an administrator-approved Chrome installation under the exact registered extension ID. The publisher must retain a **Full Dropbox Scoped App** and the four requested scopes/redirect. Developer-only app access can be exercised by authorized developer/test accounts; production app approval is a **separate publisher rollout prerequisite**, not a reason to block otherwise valid development login.

The following **eight live groups are NOT TESTED / blocked**:

1. Real PKCE login from Shelf with Cloudflare/Google independently disconnected; correct root/account and no generated folders.
2. Real native menu ordering/Chrome acknowledgements after startup/update and Simple/Narrow/Depth changes.
3. Right-click PNG/PDF saves with Shelf closed; observe zero transfer tabs/windows/Downloads and verify actual binary contents/metadata.
4. Repeat saves of the same name; confirm KEEP BOTH/final paths and one count per verified click.
5. Large/unknown-length and range-capable sources; stop/restart Chrome during append, at EOF and during commit; verify resumable versus uncertain behavior.
6. Source-origin consent denial, signed-link expiry, redirects/HTML, offline operation and provider throttling.
7. Revocation, refresh, disconnect, cancellation and account switch without wrong-account work or double receipts.
8. Existing real Google transfer-tab/folder workflow, Cloudflare TRUE REMOTE saves, Shelf/History GO TO/odometer and approved packaging.

There is no protected-engine implementation blocker. Installed/provider acceptance, existing branch regression debt and publisher/release gates remain open. No deployment, provider configuration change, production file mutation or Store publication was performed.

Authoritative references consulted: [Dropbox OAuth](https://developers.dropbox.com/oauth-guide), [finish endpoint and precise size limit](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload-session-finish), [Chrome lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [Chrome Identity](https://developer.chrome.com/docs/extensions/reference/api/identity).
