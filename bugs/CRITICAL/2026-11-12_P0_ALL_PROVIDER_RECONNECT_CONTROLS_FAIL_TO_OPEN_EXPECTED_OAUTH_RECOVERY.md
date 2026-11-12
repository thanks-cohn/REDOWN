# P0 — Google Drive, Dropbox and OneDrive ↻ recovery problems; Cloudflare R2 still works

**Owner report:** 2026-11-12 (America/Chicago), Windows Chrome, after `main` fast-forward to `7b7f6d1` (REDOWN `0.5.27` source).  
**Status:** **OPEN / owner-observed, installed revision and provider session state not independently verified; root cause not established.**  
**Priority:** P0 — reported failure of recovery across the three non-Cloudflare providers following the November 12 reconnect implementation. **Cloudflare R2 remains functional according to the owner's direct retest.**  
**Do not:** uninstall, wipe extension storage, revoke working credentials, disconnect other providers to reproduce, blind-retry uncertain jobs, recreate destination/root bindings, or claim success based on a cache flag.

## Latest owner observation, quoted and normalized

> "Clicking the refresh button in Google Drive just produces ‘Authorization checked · website session unverified’. None of them produce the pop-out windows that request permission."  
> Google Drive: **GO TO**, new **↻** present; authorization checked / website session unverified; no visible interactive consent.  
> Dropbox: **"Dropbox temporarily unavailable. Try again later."** and ↻; repeated card layout changes after reconnect (see separate P1 UI bug).  
> OneDrive: **"Temporarily unavailable · ONEDRIVE_NETWORK"** and Queue **"blocked · ONEDRIVE_GRAPH_503"**; no observed OAuth popup on refresh.  
> Owner reports **all three refresh controls** fail to open the expected OAuth permission window, and basic recovery appears broken.

**Critical owner clarification:** **Cloudflare R2 still works just as before.** Do not classify this as an across-the-board REDOWN failure or claim every provider's save pipeline is broken. The working Cloudflare path is a valuable in-product negative control: inspect the specific Google/Dropbox/OneDrive auth and status flows and their new shared reconnect UI while protecting Cloudflare's known-good behavior. Working R2 alone does not rule out unrelated browser/worker or shared-interface defects; determine exact scope by observing calls and outcomes.

The owner pasted text with HTML entities and concatenated card labels, so do not treat those snippets as precise DOM output. No screenshot, button-response payload, browser extension error, identity API error, account token grant state or network trace was supplied. Cross-provider no-popup symptoms must not be assumed to share one cause.

## Existing source facts and important nuance

- `extension/provider-reconnect.js` **does** register a click listener and routes `google` → `googleDriveOpen`, `dropbox` → `dropboxConnect`, `onedrive` → `onedriveConnect` with `chrome.runtime.sendMessage`. It prints "Authorization refreshed" if a response has `ok:true`, but that receipt alone does not prove a permission dialog appeared, a fresh grant was issued, or upload readiness.
- Google `google-drive-provider.js` `googleDriveOpen` invokes `connect()`, which uses `api.connect(true)` and Chrome `identity.getAuthToken({interactive:true})` in `google-drive-stream.js`. **A cached already-authorized token can be returned without showing a new window.** "Authorization checked · website session unverified" is not itself proof of failure; a failed actual save/auth-required code combined with missing recovery would be.
- Dropbox `dropbox-provider.js` `dropboxConnect` **first attempts `auth.ready(...,true)` when `dropbox:auth` exists**; only if an error is nontransient does it fall through to interactive `auth.connect()`. `DROPBOX_NETWORK` / `DROPBOX_HTTP_5xx` errors explicitly stop that fallback. Thus in a transient-unavailable state **no OAuth pop-up may be deliberate**, but the user needs actionable feedback and a reliable independent recovery when credentials truly require consent. Check whether failures enter a hot-loop.
- OneDrive `onedrive-provider.js` also distinguishes existing-grant refresh/check from `auth.connect()`; `onedrive-auth.js` supports Chrome `identity.launchWebAuthFlow({interactive:true})` for actual reauthorization. **Graph 503 and source NETWORK do not establish OAuth revocation.** Forcing a consent pop-up during an outage is not necessarily appropriate.
- `extension/provider-connection.js` deliberately labels website session as `unknown` regardless of extension OAuth grant verification. Avoid conflating GO TO website navigation, grant readiness, API reachability and cloud write success.
- Source proof above **does not establish** whether the owner's actual click events reached these handlers, whether a prompt was legitimately unnecessary, whether Chrome blocked a window, or why three providers appear unavailable.

## Reproduction and required investigation

1. Preserve current extension installation and connection settings. On the exact installed unpacked extension, confirm the revision/ID and whether each ↻ click fires once and reaches the intended trusted background message listener. Inspect service-worker errors and return payloads without printing tokens.
2. Record, **for each provider separately**, before/after status: original account identity, `oauthGrantState`, provider reachability, fresh/stale flag, typed code, result `ok`, actual identity/auth API invocation, whether a new interactive consent was genuinely necessary, and any Chrome identity error. Distinguish **no popup required** from **popup requested but not displayed** from **no auth handler invoked**.
3. For Google with a confirmed invalid/missing grant, explicit ↻ must begin sanctioned interactive recovery from the user's gesture; after success, verify the same account and one new safe, disposable cloud save. If the token was still valid, a silent success may be correct but must not claim a website session or cloud-write success.
4. For Dropbox, test existing valid grant, temporarily unavailable status, invalid/revoked grant, and successful explicit reconnect. Preserve namespace/root/connection identity; do not reset or overwrite pending jobs. Provide meaningful feedback when the refresh only performed an API check, and do not continuously replay transient failures.
5. For OneDrive, test Graph 503, network unavailable, 429, invalid grant, and consent required separately. Preserve the saved account/root. An outage should say *temporarily unavailable* with bounded backoff and **not** force OAuth; revoked grant should have a usable official reconnect action.
6. Test independent alternatives: Shelf, Options, popup and the native right-click pipeline; error/timeout/cancel/late-response handling; keyboard activation; extension-worker restart; no extra prompts on passive status checking.
7. Require source-level focused tests **plus installed Windows Chrome evidence**. Neither simulated identity APIs nor screenshot-only success certifies real OAuth.

## Acceptance

- **Cloudflare regression guard:** Before/after any fix, prove the owner's existing Cloudflare R2 login, true-remote save, native context menus, verified result and ordinary Shelf controls remain unchanged and functional. Avoid modifying its provider pipeline to solve independent OAuth-provider issues.

- Every ↻ button works as an actual interactive *recovery entry point* when fresh consent is needed, using existing provider-specific authorized methods, preserving existing account bindings and operations.
- Status text precisely distinguishes *authorization verified*, *authorization required*, *provider temporarily unavailable*, *user cancelled*, and *authorization check failed*. **Never imply refresh/authorization success merely from an `ok:true` envelope when actual grant readiness is unknown.**
- No provider loses independent GO TO navigation or reconnect controls. Cloud API failure in one provider does not break others.
- No UI/card layout jitter as refresh status changes (tracked in separate P1 report).
- No data reset, surprise OAuth on page load, unapproved provider mutation, or blind retry of uncertain uploads.
- This is not yet a verified regression root cause or production fix.

**References:** `docs/P0_AUTH_RECONNECT_CRASH_FOLLOWUP_2026-11-12.md`, `extension/provider-reconnect.js`, `extension/provider-connection.js`, `extension/google-drive-provider.js`, `extension/dropbox-provider.js`, `extension/onedrive-provider.js`.
