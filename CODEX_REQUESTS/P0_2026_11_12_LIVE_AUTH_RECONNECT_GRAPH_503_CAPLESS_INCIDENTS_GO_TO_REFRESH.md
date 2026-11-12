# CRITICAL P0 Codex follow-up — post-CAPLESS live Windows failures, truthful authentication readiness, GO TO + refresh recovery

**Repository:** `thanks-cohn/REDOWN` only  
**Date:** 2026-11-12 (America/Chicago)  
**Status:** Owner-confirmed live observations plus a **NEW** implementation/investigation request; **not implemented, not live-verified by this document**  
**Priority:** CRITICAL / P0 for the missing OAuth recovery affordance, false readiness, and unresolved extension/recorder reliability; isolate unrelated provider outages  
**Related large original crash/CAPLESS request:** `codex/2026-11-12-p0-crash-root-cause-flight-recorder-capless.md` and its review `docs/P0_CRASH_CAPLESS_REVIEW_2026-11-12.md`  
**Preserve:** existing Chrome user profile, OAuth state, approved accounts, native context-menu configuration, saved destinations, cloud files, pending jobs, original History, receipts, counters, full CAPLESS archive, pinned incident evidence, secure exports and untracked local forensics. No forced reinstall, `git reset --hard`, `git clean`, destructive `chrome.storage` manipulation or credential revocation.

## 1. User-facing desired change: GO TO keeps its job; a small refresh icon handles authorization

**Owner's exact product intent, interpreted as safe behavior:** The prominent provider action remains **GO TO** while the account/site is known to be accessible, with a separate **small refresh/reconnect icon** next to it. The GO TO surface should not unpredictably switch to a misleading all-purpose LOGIN label merely because the *extension's* token expired, a provider API returned 503, or a status check temporarily failed. For a genuinely never-connected or positively signed-out provider, show **LOGIN** for initial connection. Never classify an ambiguous outage or stale status as a conclusive sign-out.

- **Primary `GO TO`:** Open the provider's website or known destination and do not invoke OAuth, retry an upload, mutate account settings, or claim that opening the website proves extension permission. Show GO TO while an account is known/recently verified and navigation is meaningful, including when the browser website session likely still works but extension OAuth must be renewed.
- **Adjacent refresh icon:** An independent, persistently discoverable, keyboard-focusable button with tooltip/accessibility name **Reconnect [provider]** / **Refresh authorization**. Clicking it calls the existing sanctioned provider-specific interactive auth/reverification path from a user gesture. It MUST remain available even when the primary button says GO TO and a stale persisted flag says connected. Provide clear busy, success, declined, error and recovery states; do not start surprise login dialogs in passive background checks.
- **LOGIN:** Reserved for a provider with no prior valid connection or a *reliably established* signed-out/disconnected state that requires onboarding. A real 503, timeout, 429, refresh-in-progress or temporarily unknown readiness is **not** LOGIN. When there is a known account but OAuth grant is revoked, show explicit **Reconnect required** next to the icon and preserve GO TO navigation if meaningful.
- **Important technical limit:** Browser website login state and an extension OAuth token are independent. Chrome extensions cannot safely infer arbitrary provider website cookie/session validity merely from an OAuth token or a navigation URL. Do not add cookie scraping, overbroad host permissions, hidden tabs, invasive probes, or pretend a no-network status check conclusively proves website accessibility. Use clearly named **unknown/unverified** conditions as necessary; preserve navigation capability while explaining uncertain access.
- Preserve the existing compact REDOWN Shelf aesthetic, cloud icons and layout. The refresh icon is secondary but touch/keyboard accessible; it should not accidentally trigger GO TO or vice versa. The same recovery should remain available in the extension popup/Options if the Shelf fails. No duplicated upload/auth code paths.

**Not the requested design:** Replace GO TO with LOGIN whenever the API shows any error; hide reauthorization behind GO TO; treat a provider website tab as token proof; force sign-out or delete a credential on a temporary outage; make users open DevTools to reauthenticate.

## 2. Observed live Windows Chrome incident: Google Drive — concrete recovery proven

The owner demonstrated a *working old session / broken OAuth readiness* inconsistency on 2026-11-12:

1. The REDOWN Shelf showed **GO TO** for Google Drive, preventing the owner from finding a normal LOGIN/RECONNECT control.
2. A native right-click Google save reported `interrupted · PROVIDER_FAILED`. Read-only `chrome.storage.local` inspection exposed:
   - `googleDriveTransfer = { status: "uncertain", error: "OAuth2 not granted or revoked.", bytes: 0, total: null }`.
   - The most recent five Google jobs included **three previously completed** jobs and **two uncertain** jobs.
   - Both uncertain jobs: `phase: "source"`, `code: "PROVIDER_FAILED"`, `error: "OAuth2 not granted or revoked."`, `attempts: 3`, `reported: true`.
3. Source inspection: `extension/shelf-google-drive.js` maps `googleDriveState.phase === "connected"` to label `GO TO` and routes its click to `chrome.tabs.create('https://drive.google.com/...')`. Its startup `googleDriveStatus` does not perform independent OAuth readiness verification.
4. The owner explicitly triggered the existing Shelf-context `chrome.runtime.sendMessage({type:"googleDriveOpen"})` endpoint. REDOWN produced **Google's real authorization/consent form**; after the user authorized, **Google Drive saving worked again** in the owner's real Chrome installation.
5. This supports **missing visible reauthorization access and stale readiness projection** as a reproduced UX failure. It does **not** establish whether the token was naturally expired, permission was revoked, Chrome cache changed, or why authorization stopped working. `0` bytes and a source-phase entry do not prove all remote state absent; inspect actual remote objects before replaying uncertain jobs.

**Target source:** `extension/shelf-google-drive.js`, `extension/google-drive-provider.js`, `extension/google-drive-stream.js`, relevant Shelf markup/CSS, provider status API and focused tests. Existing `googleDriveOpen` interactive auth command is a proven recovery path; reuse rather than replacing provider engine with duplicate login logic.

## 3. Observed OneDrive incident — classify service unavailability, NOT invalid grants

The same owner session encountered native OneDrive `blocked · PROVIDER_FAILED`, confusing quickly closing sign-in popups, and explicit local diagnostics:

- `onedrive:state.phase = "reconnect"`
- `onedrive:state.code = "ONEDRIVE_NETWORK"`
- `onedrive:state.error = "Reconnect OneDrive to renew and verify access."`
- `onedrive:transfer.status = "blocked"`
- `onedrive:transfer.code = "ONEDRIVE_GRAPH_503"`
- `onedrive:transfer.error = "Microsoft Graph could not verify this OneDrive account (HTTP 503)."`
- The owner also observed **503 SERVICE UNAVAILABLE directly when trying to sign in to Microsoft in Chrome**, outside REDOWN.

**Interpretation:** The observed HTTP 503 and network error establish an unavailable Microsoft request/service path, **not** revoked authorization. The closing popup alone cannot prove successful or failed OAuth. Do not claim a particular global Microsoft outage as the proven cause without separately dated, authoritative status evidence.

Source inspection: `extension/onedrive-auth.js` performs official PKCE OAuth, refresh token exchange and Graph checks of `/me`, `/me/drive`, and `/me/drive/root`. `extension/shelf-onedrive.js` invokes `onedriveStatus` from Shelf, and the handler checks readiness; auth failures and transient Graph errors can put state in `reconnect`. The new UX must distinguish:
- reauthentication actually required (revoked/invalid grant, missing scopes, changed identity);
- provider/API/network temporarily unavailable (5xx/429/network timeout);
- in-progress verification (unknown, nonblocking);
- usable existing login/navigation, regardless of the extension's upload readiness.

Never force users to repeat login over and over for Graph 503. Use bounded retry/backoff, preserve tokens and existing provider/account/destination bindings, and show specific actionable errors. Keep one provider's outage from blocking Google/Dropbox/R2.

## 4. Observed CAPLESS and Chrome runtime problems — include in the combined P0 investigation

This is a **different problem family** from OAuth; investigate independently, do not assert a shared cause.

- Following a full Chrome restart, CAPLESS displayed **CAPTURE INCOMPLETE / ARCHIVE STALLED** although the main append-only archive passed integrity checks, with `pendingSegments: 0`, `writeFailures: 0`, `dropped: 0`, `unconfirmed: 0` and `stalled: false`.
- Owner's large pinned incident checkpoint dump identified **16/16 pinned incidents**: ~15 `PREVIOUS_EPOCH_STOPPED_REASON_UNKNOWN` (can be routine MV3 idle/restart, not confirmed crashes) plus a Shelf readiness incident. `extension/flight-recorder.js` `pin()` aborts its separate IndexedDB `incidents` transaction when `count >= 16`, then sets `health.incidentFailure=true`, `health.incomplete=true` and logs repeatedly at line 526: `REDOWN pinned incident capture incomplete; inspect recorder status.`
- The historical `captureIncomplete` flag is sticky/cached and can appear even when the **current** status says `stalled:false`. A full pinned cache should not be mislabeled as a stalled immutable CAPLESS archive. Preserve the separate evidence first; don't ask the owner to delete incidents just to suppress the warning.
- After Chrome restart, startup diagnostics also observed `chrome.sidePanel.setPanelBehavior` and `chrome.storage.local.get` taking ~5.12–5.18 seconds and both reporting timeout followed by late acceptance. These are real API-latency observations, not definitive root causes of extension disappearance.
- The original serious regression remains unresolved: Chrome once showed REDOWN's extension card with Errors and a Reload button, while Options and normal operation were unavailable until manual Reload; `Entry operation timed out` was seen without a helpful stack; YouTube also had trouble around the incident. Do **not** claim it was a confirmed crash, confirmed GPU failure, a confirmed worker sleep, or fixed merely because logging improved.
- Current owner CAPLESS status later showed `records: 2473`, `segments: 670`, `rawRecords: 1116`, `pendingSegments: 0`, `backlog: 0`, `writeFailures: 0`, `dropped: 0`, `unconfirmed: 0`, `stalled:false`, `captureIncomplete:true`, `incidentFailure:false`, `lastWriteMs: ~26.4`. Earlier archive had `records: 1064`, `segments: 272` and verified integrity. These numbers prove the main recorder **continued appending**, not that every failure was captured or that live cloud saves worked.
- `RAW: true` was active; the owner's local archive has plaintext sensitive-URL risk. **Never commit or upload RAW ZIP/JSON, tokens, private URLs, identities or signed cloud links.** Request only bounded sanitized fields or explicit private export handling.

**Required recorder repair:** Preserve archive and pinned evidence; stop classifying normal ambiguous MV3 worker ends as a stream of pinned faults that quickly fills 16 entries; choose an explicit bounded *fast index* distinct from durable append-only incident history; fix pinned-capacity handling so important real faults remain recoverable; separate `PINNED_CACHE_FULL` (historical/ongoing) vs `ARCHIVE_STALLED` (active) vs `HISTORIC_CAPTURE_INCOMPLETE`; avoid warning spam and false completeness claims. Include fault-injected worker lifecycle / incident store exhaustion regression tests, and measure logging overhead under actual Chrome.

## 5. Implementation plan (narrow per feature, integrated acceptance)

**First inspect latest `origin/main` and previous fixes.** The historic crash/CAPLESS request was already implemented in part. This document is **not** permission to restart implementation from its old baseline or overwrite existing archive. Work from fresh latest main, record SHA and clean/dirty state, and keep changes reviewable.

1. **P0 OAuth recovery affordance and state:** separate primary GO TO / initial LOGIN from an adjacent refresh/reconnect button in Shelf's Google, OneDrive and Dropbox provider tiles. Use existing provider-specific sanctioned connect/reconnect commands. Do not force reconnect for healthy sessions. The refresh button must remain available in GO TO state. Provide supported popup/Options/fallback route if Shelf is down. Preserve provider identity, source URLs and route exactly.
2. **P0 authentication truth:** unify `accountKnown` / `oauthGrantState` / `requiredScopes` / `providerReachability` / `destinationReady` / `lastVerifiedSave` via canonical provider status adapters. Read/write projections may be cached but must be labeled stale/unknown, not treated as live tokens. Noninteractive verification should be bounded, deduplicated and should not block Shelf rendering or menus.
3. **P0 error model:** keep provider-specific codes and origin phases visible in Shelf/History/Queue. Do not collapse `OAuth2 not granted or revoked.`, `ONEDRIVE_GRAPH_503`, `ONEDRIVE_NETWORK`, `HISTORY_UNAVAILABLE`, `WORKER_RESTART`, and `CAPLESS_PINNED_FULL` into a generic `PROVIDER_FAILED`. Distinguish transient from revoked with retryability hints.
4. **P0 safe resume:** after one explicit consent/reconnect, verify the *same* account and destination; reconcile uncertain jobs before retry; don't silently replay duplicate saves. Keep archive/history/counters and prior verified receipts intact. Continue unaffected providers independently.
5. **P0 diagnostics/worker reliability:** fix pinned incident exhaustion and the misleading archive warning, retain the complete event archive, instrument loss and 5s Chrome API stalls without creating endless lifecycle incidents. Investigate the original Options/extension disappearance with evidence; don't declare fixed without live reproducibility.
6. **Preserve UX:** no heavy new Shelf architecture, no unrelated UI redesign, no new general provider permissions or invasive login-state scraping, no duplicate event listeners or OAuth flows, no new automatic external writes.

## 6. Required acceptance suite — automated and installed Chrome

- **Live owner regression:** saved Google `connected` + `OAuth2 not granted or revoked`; GO TO stays available, refresh icon visible and keyboard-operable, clicking it prompts official Google authorization, and *one* new small right-click save is externally confirmed in Drive with a verified receipt. No DevTools command required.
- **Initial use:** genuinely unconnected provider says LOGIN; connecting changes to GO TO plus independent refresh icon. A transient check failure does **not** erase GO TO or falsely imply login loss.
- **Refresh:** valid existing token refresh silently when supported; invalid/consent-required grant offers manual reconnect; canceled/denied reauth leaves a truthful state, preserved data and no false completion.
- **503:** inject OneDrive Graph HTTP 503 and `ONEDRIVE_NETWORK`; display temporary provider-unavailable status rather than perpetual LOGIN or forced auth. Repeat after recovery to prove bounded retry; preserve access and exact identity.
- **Navigation independence:** browser website works while extension OAuth fails; GO TO still opens site, refresh icon repairs extension authorization independently. Extension OAuth works while website session is logged out; do not equate them.
- **Failure isolation:** Google revoked, OneDrive 503, healthy Dropbox and R2 — healthy saves still work.
- **Retry safety:** Google two uncertain `source` jobs at attempt count 3; reconcile receipts/account/destination before replay. No duplicate upload, fabricated verified status or silent reset.
- **Recorder:** 16 pinned incidents reached with routine worker epochs; preserve history, continue recording meaningful faults, warning says correct cause; current archive remains verified/non-stalled with 0 unconfirmed writes; repeated DevTools console warnings are controlled.
- **Runtime:** simulate slow `sidePanel.setPanelBehavior`, `storage.local.get` (~5s), MV3 restart and Chrome reload; no competing Shelf surfaces or lost listeners; an actual unavailable-Options scenario requires owner-installed proof or an explicit outstanding gap.
- **Performance/a11y:** compact button + adjacent icon at small Shelf width, keyboard/Enter/Space, focus, hover tooltip, screen reader name, busy/disabled interaction, no accidental combined hit targets, high contrast/reduced motion.
- **Safety:** all historical files, UI destinations, jobs, configuration, tokens, installed profile and archive survive. Never export unredacted RAW evidence to public GitHub. No forced provider writes, cloud deletion, permissions bypass or premature success counters.
- **Distinguish** unit tests, synthetic mocks, isolated Chromium, genuine installed Windows Chrome and real provider verification; passing offline tests alone does not certify live stability.

## 7. Deliverables / constraints

Produce a scoped source inventory, root-cause confidence table **observed / inferred / unknown**, focused fixes with tests, non-secret redacted issue report, updated user-facing message texts, explicit Windows Chrome verification steps, before/after storage & incident continuity checks, and reviewable commits/PR grounded in latest main. Preserve existing incident exports, old request files and current branch work.

**No extra owner test is prerequisite to opening this Codex task.** The owner's existing Google authorization recovery is a valid live proof. Optional read-only supplemental testing: a screenshot of Shelf's stale GO TO state and a sanitized one-click save/incident timeline, if safely available. Do not ask the owner to recreate revoked credentials, delete logs or chase an intermittent browser crash on purpose.

**Not yet implemented.** This Codex request documents the new failure classes and desired recovery behavior; it does not assert that any Chrome/provider fix has landed.
