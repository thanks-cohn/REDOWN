# Re-O'Auth / LOGIN implementation handoff — 2026-11-12

**READY FOR OWNER REVIEW. Windows Chrome and live-provider acceptance PENDING.**
No merge, deployment, release certification or real-provider success is claimed.

## Revision and scope

- Repository: [thanks-cohn/REDOWN](https://github.com/thanks-cohn/REDOWN).
- Exact restored main baseline: `4b59b58389aca815bb5a5eaaee66433244f3cc63`.
- Prepared assignment-only commit: `a7b46b8cca6f81ac78ed6758f29e30bc1115d2a6`, whose direct parent is that baseline.
- Development branch: `codex/re-oauth-login-only-from-4b59b58-2026-11-12`.
- Tested implementation HEAD SHA: [`88e92171e3a9b3f6947816167a71c35c9f586e70`](https://github.com/thanks-cohn/REDOWN/commit/88e92171e3a9b3f6947816167a71c35c9f586e70).
- [Final development branch / delivered HEAD](https://github.com/thanks-cohn/REDOWN/tree/codex/re-oauth-login-only-from-4b59b58-2026-11-12).
- Final HEAD SHA, including this documentation-only handoff commit: resolve with `git rev-parse HEAD` on this branch or `git ls-remote origin refs/heads/codex/re-oauth-login-only-from-4b59b58-2026-11-12`. Its literal SHA is supplied in the delivery response. A tracked document cannot embed the SHA of its own containing commit without changing that SHA.

Implemented directly on the prepared branch. No cherry-pick/backport of the failed November 12 rollout, no extra implementation branch and no rebase onto a different baseline. Main was checked at the exact baseline and remains untouched.

## Delivered behavior

Each of the three Shelf cards has separate, always-visible **Re-O'Auth** and **LOGIN** buttons, including when its primary navigation reads GO TO. Existing GO TO and cloud-open links/URLs remain usable. The primary logged-out LOGIN also performs website navigation. Dropbox's old primary RETRY label becomes LOGIN; the authorization error remains visible, while recovery belongs to the explicitly named Re-O'Auth action.

| Provider | Re-O'Auth: existing interactive owner | LOGIN: `chrome.tabs.create` website |
| --- | --- | --- |
| Google Drive | `googleDriveOpen` → provider `connect()` → `RedownGoogleDriveStream.connect(true)` → Chrome `identity.getAuthToken` + Drive account verification | `https://drive.google.com/drive/u/0/my-drive` |
| Dropbox | `dropboxConnect` → `RedownDropboxAuth.connect()` → existing official Dropbox PKCE / `launchWebAuthFlow`, token exchange and exact-root verification | `https://www.dropbox.com/home` |
| OneDrive | `onedriveConnect` → `RedownOneDriveAuth.connect()` → existing official Microsoft PKCE / `launchWebAuthFlow`, token exchange and account/drive/root verification | Personal: `https://onedrive.live.com/`; business/documentLibrary: `https://www.office.com/launch/onedrive` |

LOGIN performs no extension OAuth, cookie read, upload or readiness assertion. GO TO still navigates rather than invoking a status-only substitute. Dedicated labels stay in fixed locations; unconnected cards also retain their primary website LOGIN.

Each provider owns its own single in-flight UI request. Connecting, failed/cancelled, consent/permission required, provider unavailable, uncertain reply and website-open outcomes are explicit. A 30-second one-shot reply timeout restores the button but retains the pending-request guard: repeated gestures cannot open another OAuth flow until the original request settles. The late result can still complete. Navigation remains available throughout. No polling, automatic retries or new authorization service was added.

Successful handlers now return `authorization: 'verified'` only after their existing auth owner has finished. Bare `ok:true` is explicitly unconfirmed. The success text says an existing grant **may have been reused**, confirms neither a new dialog nor a new grant, and claims no verified upload readiness. Chrome does not report whether a new consent dialog was actually displayed. HTTP 503/network outcomes do not establish revoked authorization.

## Every changed file and rationale

| File | Change / reason |
| --- | --- |
| `extension/shelf.html` | Two exact-label controls and a visible live result per card, accessible names, focusable scrollable result. Existing icons, counts, options and identity preserved. |
| `extension/shelf-google-drive.js` | Direct independent Google website/OAuth wiring and truthful results, navigation available during OAuth. |
| `extension/shelf-dropbox.js` | Direct independent Dropbox website/OAuth wiring; preserves existing inline errors and transfer rendering. |
| `extension/shelf-onedrive.js` | Direct independent Microsoft website/OAuth wiring; preserves business URL routing and existing transfer rendering. |
| `extension/shelf.css` | Local styles for the new controls and fixed-height scrollable status only; visible focus, wrapping at narrow widths. |
| `extension/google-drive-provider.js` | **Outside Shelf, necessary OAuth reply adjustment:** verified marker after existing `connect()`; preserve the existing auth exception message so revoked/cancelled/network outcomes can be distinguished. No upload code changed. |
| `extension/dropbox-provider.js` | **Outside Shelf, necessary OAuth reply adjustment:** verified marker after existing `auth.connect()` and forward optional HTTP error status. No queue/status/recovery logic changed. |
| `extension/onedrive-provider.js` | **Outside Shelf, necessary OAuth reply adjustment:** add verified marker to existing successful connect reply. No state machine changed. |
| `extension/dropbox-auth.js` | **Outside Shelf, two metadata-only additions:** attach response HTTP status to existing token/account-root errors. Otherwise the connect reply loses 503 and can look like denial. Existing requests, error text, scopes, validation, persistence and recovery behavior unchanged. |
| `tests/re-oauth-login.test.mjs` | 31 focused tests: actual three UI scripts → actual provider handlers → actual auth owners, with simulated Chrome identity/HTTP boundaries; preservation and source scope guard. |
| `tests/consolidated-dropbox-login.test.mjs` | Two narrowly adapted existing UI tests: stale connecting recovery clicks the new Re-O'Auth button; navigation label expects LOGIN while retaining visible error assertions. No blanket fixture/hash rewrite or disabled test. |
| `scripts/re-oauth-login-browser.mjs` | Reproducible isolated localhost Chromium layout/focus/click fixture using real Shelf HTML/CSS and all three UI scripts, explicitly mocked Chrome APIs. |
| `docs/CODEX_RE_OAUTH_LOGIN_HANDOFF_2026-11-12.md` | This committed review and acceptance handoff. |

**Optional Debug Mode CSS polish: SKIPPED.** `.queue-card-signal`, `shelf-queue.js` and all Queue state/data remain unchanged. The CSS above supports only the requested new controls, with no unrelated theme changes.

## Executed verification

Executed on Linux, host UTC 2026-11-13 (owner request dated November 12). All provider HTTP/identity tests below are **simulations**, not real provider acceptance.

1. `node --test tests/re-oauth-login.test.mjs tests/consolidated-dropbox-login.test.mjs` — **41 tests, 41 pass, 0 fail**. Includes all three independent command mappings, website URLs and zero OAuth on LOGIN/GO TO; silent grant success without popup claims; cancelled, rejected, revoked, network/503, permission failure, bare-ok and transport rejection outcomes; stale connected/connecting states; repeated clicks, timeout and late result; untrusted sender rejection; protected-data snapshots.
2. `node scripts/re-oauth-login-browser.mjs` — **16/16 configurations pass**, each checking all three cards (48 provider/configuration combinations): widths 320/400/480/640px × porcelain/midnight × reduced motion off/on. Checks exact visible labels, buttons fitting inside their cards, minimum 28px height, focus, distinct navigation/OAuth routing, restoration after reply, and stable card height when the new result changes. Local result: `work/re-oauth-login-browser.json`. This is a real Linux Chromium layout test with mocked extension APIs.
3. `npm run check` — **passed, 139 syntax check groups**. Also `node --check tests/re-oauth-login.test.mjs`, `node --check scripts/re-oauth-login-browser.mjs`, and `git diff --check` passed.
4. Broader relevant focused command:

   ```sh
   node --test tests/re-oauth-login.test.mjs tests/google-drive.test.mjs tests/dropbox.test.mjs tests/onedrive-connected.test.mjs tests/consolidated-dropbox-login.test.mjs tests/shelf-destinations.test.mjs
   ```

   **157 tests, 144 pass, 13 fail.** The same five pre-existing test files were executed against a separate `git archive` snapshot of exact baseline `4b59b58`: **126 tests, 113 pass, 13 fail**. All 13 failure identities match. No new failure remains in this selection. Baseline counts are newly measured, not copied from an older report. Logs retained locally at `/tmp/redown-final-focused-tests.txt` and `/tmp/redown-baseline-button-tests.txt`; rerun commands for independent evidence.
5. Mandatory offline `npm run diagnostics -- getStartGuide`, `validateRegistry`, `listIssues`, `getReleaseReadiness` completed. Registry findings empty. Existing release readiness remains **partial/blocked**, not a release certificate.
6. `node scripts/installed-chrome.mjs extension work/re-oauth-installed-chrome.json` — **BLOCKED**, zero installed assertions. Linux Chrome `156.0.8078.79` rejects unpacked installation: `CDP_-32600: Loading of unpacked extensions is disabled by the administrator.` No policy bypass attempted.

The full `npm test` / `npm run reliability:check` wrapper was intentionally not run: this request requires focused scope rather than a broad repository audit or full-suite repair. No frozen source hashes were regenerated to conceal drift. Crash/build instrumentation was left unchanged as instructed.

### The 13 retained baseline failures

These remain unresolved/outside this button request; they are not passing or waived:

| Test file / line | Existing failing test |
| --- | --- |
| `tests/dropbox.test.mjs:139` | login via native action resumes exactly one pending click; Shelf login alone creates no job |
| `tests/dropbox.test.mjs:153` | shared composer preserves every V3/Google plan and route, Dropbox leaf ordering and invalid fragment rejection |
| `tests/dropbox.test.mjs:163` | actual single native writer reconciles transitions/restart/lost IDs and retains management last |
| `tests/dropbox.test.mjs:171` | actual native dispatcher isolates all Dropbox IDs before V3 resolver or navigation |
| `tests/dropbox.test.mjs:178` | protected bytes unchanged except explicitly authorized shared composer hook |
| `tests/dropbox.test.mjs:213` | stale logged-out native leaf records a blocked attempt, never a successful receipt |
| `tests/dropbox.test.mjs:247` | status refresh invalidates a stale connected menu/card projection with no auth |
| `tests/google-drive.test.mjs:17` | actual Google click early return never resolves Cloudflare or invokes R2/dashboard even for unknown IDs |
| `tests/google-drive.test.mjs:68` | actual shared native writer mode/provider races, restart, stale cache, partial API failure and recovery preserve root/manage and targets |
| `tests/google-drive.test.mjs:89` | provider receipt gate rejects untrusted pages and malformed success; history retains provider and verified file identity |
| `tests/google-drive.test.mjs:97` | repeated saves reuse the owned tab with a fresh job; active transfer is never replaced |
| `tests/onedrive-connected.test.mjs:205` | right-click saves never invoke Chrome permission APIs on any source hostname |
| `tests/shelf-destinations.test.mjs:61` | equal minimalist cloud tiles show only an icon and a short action |

## Preservation and limits

- Cloudflare/R2, background/menu ownership, Universal File API, upload/verification engines, destinations, Queue operations, History/archive, receipts, counters, CAPLESS and crash instrumentation source remain unchanged. The extension diff allowlist test enforces the narrow file boundary; the listed provider diffs change only message outcomes, plus Dropbox error metadata.
- No manifest/client ID/scope/redirect/host permission change. No new credential store, token revocation, Google Disconnect, account switch/reset, remote write or automatic uncertain-job replay.
- Simulated LOGIN snapshots preserve all stored data exactly. Simulated OAuth preserves seeded uncertain jobs, destinations, History/counters, Cloudflare credentials and forensic records, plus other providers' refresh credentials; the real auth owners may legitimately update their own auth/session/state. Same-account/root results are asserted. Existing auth ownership/account protections remain as-is; use the same account during manual acceptance.
- Existing provider-specific status/storage behavior is retained. The new OAuth result is an ephemeral Shelf result, not a persisted connection projection or transfer receipt. Provider state/error text elsewhere is not rewritten by this task.
- A genuinely pending OAuth request is coalesced even after the UI wait timer. If Chrome never settles it, no new flow is launched from that Shelf instance; the UI explicitly reports uncertainty. Cross-window coalescing remains owned by the existing provider implementations.
- There are no configured provider credentials in this environment. No Windows machine was available. Installed extension consent, website sign-in redirects, actual existing-grant reuse, same-account behavior with real credentials and genuine remote transfers remain **PENDING**, including Cloudflare regression.

## Owner Windows acceptance checklist — PENDING

Use the existing installed extension ID/profile and approved disposable objects. Reload this development build without uninstalling or clearing storage; preserve the prior build for source rollback. Do not intentionally revoke a working grant to force a dialog.

- [ ] Confirm existing destinations, History, counters, credentials, pending jobs and CAPLESS records are retained; cloud logos/counts and GO TO/open-cloud links remain present.
- [ ] For each of Google Drive, Dropbox and OneDrive, click **LOGIN**: correct official website opens; a signed-in account may show files immediately. No extension OAuth starts, no upload occurs and the Shelf reports only website navigation. Verify business/documentLibrary OneDrive routes to the Office OneDrive site.
- [ ] With GO TO still available, click **Re-O'Auth**. Confirm the existing official extension OAuth flow is used. Consent appears only when Chrome/provider requires it; silent valid-grant reuse must not be described as a new dialog/grant. Keep the same cloud account/root bound.
- [ ] Check cancellation and safely encountered network failure: honest result, retryable control, no fabricated saved receipt or counter increment. During slow consent, repeated clicks should not create duplicate flows; LOGIN and GO TO still work. No intentional revocation or uncertain-upload replay.
- [ ] After authorization, make **one fresh small save per provider** into an approved disposable location, with a unique name. Independently inspect the exact remote object/bytes/account/destination, then verify one History receipt and one verified counter increment. If a result is uncertain, inspect the destination before any retry.
- [ ] Separately check the owner's already-working **TRUE REMOTE Cloudflare R2** save to a disposable object with independent remote verification, unchanged History/receipt/counter semantics. Do not redeploy Workers or recreate resources.
- [ ] Reopen Shelf/restart Chrome and confirm website/OAuth controls and stored configuration remain usable. Visually inspect focus, scrolling long result messages, 320/400/480/640px layouts, light/dark, and reduced motion on Windows.

Review-ready implementation delivered; owner acceptance is still required before any decision about main or release. Stop here: no merge or deployment is part of this delivery.
