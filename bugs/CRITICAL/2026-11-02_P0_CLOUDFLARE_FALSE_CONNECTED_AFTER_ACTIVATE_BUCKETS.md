# P0 — Cloudflare looks connected but Manage requires another login after Activate Buckets

**Date:** 2026-11-02. **Branch:** `main`. **Status:** OPEN, investigated at source level; actual root cause and real-Chrome reproduction still UNCONFIRMED. This is a serious trust and onboarding defect; no re-login workaround should be mistaken for a fix.

## Owner-reported reproduction

1. Connect Cloudflare from REDOWN.
2. The small Shelf Cloudflare card reports connected or shows **Manage**. The File Explorer also appears signed in, with no visible Login control.
3. Use **Activate Buckets** in Explorer, navigate away/back, then select **Manage** on the Shelf Cloudflare card.
4. REDOWN unexpectedly requires another Cloudflare login, despite the prior displays telling the user the connection was established.

**Expected:** A successfully authorized Cloudflare connection stays usable across Shelf, Explorer, Activate Buckets and Manage for its valid authorization lifetime. Expiration/refresh/permission failure is reported *consistently* and immediately. Valid refresh tokens renew transparently where supported. An unavailable network or failed probe must not silently destroy valid credentials. If reauthorization is actually required, every view must show the same truthful state and recovery action. Never silently ask for broad Cloudflare permissions.

## Code-traced discrepancy (evidence, not a confirmed causal sequence)

- `extension/shelf.js: refreshConnection()`: the card checks presence of `cloudflareAuth.accessToken`, then calls `cfAccounts` and paints `connected` on a successful account list. On later storage changes it rechecks. A transient API error paints `error` rather than clearly distinguishing credential revoked vs offline; a successful prior check may become stale before a later action.
- `extension/beta/explorer.mjs: paintLogout()`: `cloudflareSignedIn=Boolean(auth?.accessToken&&!auth?.reconnectRequired)`. This does **not** independently validate expiration or the latest account API result. On initialization it may briefly/visually appear logged in from the mere presence of a token; `loadAccounts()` subsequently checks real accounts/buckets. Some UI controls still use the cached Boolean.
- `extension/cloudflare-api.js: auth()`: the shared API performs refresh under the `redown-cloudflare-token` lock. When the token expires without a refresh token or a refresh returns `invalid_grant`, it sets `reconnectRequired:true` without discarding the whole credential record. Recoverable failures may preserve it. `request()` retries some read/401 flows; this can change state asynchronously while other views are open.
- `extension/cloudflare-auth.js: storeCloudflareToken()` creates a new `sessionId` for a new OAuth login; ordinary token refresh preserves it. OAuth issuance and account-list verification are separate boundaries, and a network interruption can defer account verification.
- `extension/background.js: activateAllBuckets()/runGlobalActivation()`: activation requires a stored access token/session and performs real Cloudflare account/bucket discovery, worker provisioning and R2 permission checks. This path can surface an expired token or a provider/Worker permission problem that a token-only UI did not detect. Activation does **not** explicitly call Cloudflare logout in the inspected path. It may change saved profile/menu/activation state; do not assume it revoked tokens without evidence.
- `extension/shelf.js: Manage` opens `beta/explorer.html` only when the card's local `cf-state` says connected. If not, it launches a sign-in flow. `extension/beta/explorer.mjs` has its own account state, reconnect recovery and display path. Those independently updated projections can disagree.

**Suspected failure classes to distinguish by evidence:** stale auth projection; actual token expiry/refresh/grant rejection; R2-specific permissions or Worker readiness; session-change race across pages; service-worker suspension between activation and Manage; cached account state; user switched Cloudflare accounts. No one class is established as the live cause from source inspection alone.

## Forensic capture plan (privacy-preserving, read-only)

At each of these points (before activation, immediately after, after returning to Shelf, and after clicking Manage), capture **only** timestamp and safe derived states:

- current view and `cf-state`, `cloudflareSignedIn`, account chooser state, `listingState`, whether action is Manage/Login;
- Boolean token present, refresh token present, `reconnectRequired`, expiry status/bucket (not the raw `expiresAt` if that could correlate identifiable activity), whether `sessionId` stayed the same (compare a locally computed opaque fingerprint, not the secret);
- `cfAccounts` result category (confirmed/401/403/transient network/timeout), per-bucket activation stage/result and `rightClickGlobalActivation.state`, without logging account IDs, bucket names, Worker hosts, profile tokens or response bodies;
- worker restart/order and auth refresh events, with redacted timestamps/correlation IDs; exact user-visible prompts and whether the affected click originated from Shelf vs Explorer.

**Never export access/refresh tokens, OAuth callback codes/state, source URLs or private bucket identifiers into bug receipts.** A current connected user should not have to re-consent merely because a page was reopened.

## Piece-by-piece repair plan (do NOT casually rewrite OAuth)

1. **Test/demonstrate the split:** create focused unit/integration fixtures for token-present+expired, valid refresh, `reconnectRequired`, 401, 403-permissions, offline, successful active account, and activation-induced state updates. Verify no misleading connected UI survives a confirmed invalid login.
2. **Single status authority:** introduce one background-owned projection of the real Cloudflare auth status (e.g., checking, verified, refreshing, reconnect-required, permission-denied, temporarily-unavailable) and expose it to Shelf and Explorer. Preserve token state only inside the existing secure Cloudflare auth module; do not create a second OAuth engine or pollute V3 config.
3. **Refresh and epoch correctness:** on action/activation, use the existing refresh+account verification lane with bounded retries and session/epoch comparison. Do not make network transients trigger fresh login. Cache only a dated, session-matched verification; invalidate it appropriately.
4. **UI alignment:** Shelf Manage, Explorer navigation, its Login/Retry button, and Activate Buckets must all read the same status projection. Show authentic reconnect only when verified necessary; avoid an apparent successful login with a dead Manage action.
5. **Acceptance:** repeatedly connect once, activate all buckets, leave/reopen Shelf, Manage, browse, save and return across worker suspension and token refresh. Validate login persists as long as provider grants allow and every failure reports the true reason. Keep all R2 privacy and verified-save rules. Obtain real installed Chrome evidence before closing P0.

**Out of scope for this report:** rewriting menus or changing Simple/Narrow/Depth while testing auth; that architectural isolation is separately specified in `docs/V3_SIMPLE_NARROW_DEPTH_INDEPENDENT_MODE_PLAN_2026-11-02.md`.
