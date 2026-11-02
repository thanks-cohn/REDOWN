# P0 — Dropbox login does not open from flat right-click or Shelf LOGIN

**Reported:** 2026-11-02
**Owner observation:** In installed Chrome, selecting `REDOWN → Dropbox` and clicking the Dropbox Shelf LOGIN action both fail to open an interactive Dropbox authorization window.
**Scope:** `CONSOLIDATED`; preserve the single-click flat provider menu, current OneDrive behavior, V3 proof-based success gates, animations and saved History.
**Status:** SOURCE REPAIRS COMMITTED; **LIVE CHROME OAUTH AND REMOTE SAVE NOT VERIFIED. Do not close as resolved based on source edits alone.**
**Priority:** P0 — authentication is unusable.

## Root causes established in source
1. `extension/dropbox-menu.js` declared the flat Dropbox action `enabled:false` whenever persistent `dropbox:state.phase==='connecting'`. That state can survive an interrupted MV3 worker.
2. `extension/shelf-dropbox.js` likewise disabled the LOGIN button while `state.phase==='connecting'`; it also returned before calling `dropboxConnect` in that state, leaving the user with no way to restart OAuth from the card.
3. `extension/dropbox-provider.js` returned immediately upon `state.phase==='connecting'` and took the stored connected projection as sufficient authority for queueing, without ensuring that authorization remained usable.
4. `extension/dropbox-auth.js` performed PKCE initialization before its retry/error `try` block, leaving a potentially stuck `connecting` status on early errors. `launchWebAuthFlow` rejections were displayed generically as cancellation even when Chrome failed to launch a window.

## Corrective source changes on CONSOLIDATED
- Keep native flat Dropbox item clickable across persisted phases. The live OAuth adapter coalesces duplicate attempts; the menu must not assume a persisted `connecting` flag represents an active window.
- Shelf LOGIN remains actionable except during its own synchronous in-flight request; a stale phase no longer blocks retry. Show an error via the existing status/tooltip when connection fails.
- Native handler checks current credential readiness before treating a connected projection as proof of an authorized destination. If stale, it routes through a new OAuth attempt rather than silently returning or falsely declaring success. OAuth starts before queuing/history work and the clicked source is retained for the pending upload.
- Fail closed and report a visible reconnect/error state on PKCE preparation or browser authentication startup failures. Do not expose PKCE verifier, tokens or source provenance to Dropbox.
- Preserve the source permission boundary and current namespace/account pinning. No new OAuth scopes, unverified success or automatic retry of uncertain uploads.

## Still open / related incidents
- Earlier namespace bug: `bugs/CRITICAL/2026-11-01_P0_DROPBOX_RECONNECT_NAMESPACE_REJECTION_AND_MISSING_SAVED_FILES.md`. If Dropbox OAuth opens but fails at root verification, investigate supported root authorization without broadening account scope silently. The login-window repair is not evidence that this provider-root restriction is solved.
- Native source permission may be denied before authorization in some contexts. Confirm behavior in actual Chrome, including first-run source hosts and all-site-access settings.
- Chrome extension ID and Dropbox-app redirect URI must match the registered OAuth configuration; do not bypass validation merely to force the window open.
- The save-impact pulse is not a save receipt. Existing neon/serif SUCCESS! and saved counters must appear **only after independently verified Dropbox completion**.

## Required real-Chrome acceptance
1. Fresh installed extension, disconnected Dropbox: native `REDOWN → Dropbox` initiates OAuth and, after successful sign-in and needed permissions, saves the originally clicked supported file exactly once.
2. Shelf LOGIN initiates OAuth while disconnected, reconnecting and recovering from a simulated old `connecting` projection. The card does not silently do nothing or remain disabled indefinitely.
3. With genuinely valid credentials, subsequent native saves do not reopen login; with revoked credentials, the recovery path is actionable.
4. Cancel, wrong extension ID/redirect, bad nonce, denied source permission and unsupported root report actionable errors. No fabricated completed History, GO TO, counters or SUCCESS!
5. Confirm exact saved Dropbox root, filename and extension, returned file ID, revision, server-side content hash and metadata read-back. No page/source/frame/link URL is transmitted to Dropbox APIs.
6. Verify all four providers and flat Cloudflare-only-nested native menu remain intact; collect real installed-Chrome evidence and record PASS/FAIL/NOT_TESTED.

**Rollback:** Keep previous V3/flat branches and the CONSOLIDATED pre-repair commits. Avoid blanket resets, revoking existing account tokens, deleting queues or rewriting historical success counts.

## November 2 follow-up: RETRY appears but no visible popup

**Owner retest:** after prior fixes, the Shelf says **RETRY**, yet no Dropbox login window is visible. Do not count that as fixed or proven.

Additional root-cause evidence: official Dropbox documentation confirms a legitimate `root_info['.tag']='team'` and a different `root_namespace_id` versus `home_namespace_id` on team-space accounts. The former REDOWN `verify()` rejected both before accepting the login, even if OAuth had already returned a code. Chrome may hide the `launchWebAuthFlow` web view when a provider immediately redirects, so a silent/brief auth flow followed by root rejection can look like no popup. The shipped manifest's public key was checked and derives the expected `mkadkgpekmkknfbniacdlmgikihjjepf` ID; the actual installed Chrome extension ID still needs checking.

**New source change:** `dropbox-auth.js` accepts documented `user` and `team` root types with valid numeric namespace IDs and requires actual authenticated `files/list_folder` readback of the exact `root_namespace_id`. No unrelated namespace fallback, new OAuth permission, or silently widened root authority. `shelf-dropbox.js` visibly shows the sanitized authorization error within the Dropbox card when RETRY is displayed; it no longer hides the reason exclusively in its ellipsis settings. Authentic authentication failures, invalid extension ID/redirect, restrictive app-folder tokens and unavailable root readbacks remain fail-closed.

**NEW acceptance requirement:** owner must actually see a working Dropbox login or verify a silently completed browser identity flow that results in a connected root and a real save. A RETRY label or mocked test is never sufficient. Where a popup truly fails to launch, capture the text now displayed inside the card and Chrome extension service-worker errors. Avoid publishing a claim of full OAuth repair before installed-Chrome evidence.

**Style follow-up:** Neon theme SUCCESS! was enlarged to card-first 39–55px and Cloudflare 44–62px, shrinking only when the measured available text width demands it. This is temporary SUCCESS!, not the counter number. Keep the verified-only animation gate.
