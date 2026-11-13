# CODEX DEVELOPMENT REQUEST — Re-O'Auth + LOGIN buttons, and optional Debug Mode styling ONLY

**Repository:** `thanks-cohn/REDOWN`  
**Required starting point:** restored remote `main` at exactly `4b59b58389aca815bb5a5eaaee66433244f3cc63`.  
**Prepared implementation branch:** `codex/re-oauth-login-only-from-4b59b58-2026-11-12` — created directly from that exact `main` commit.  
**This document is ONLY the assignment. Codex MUST produce IMPLEMENTED, TESTED, COMMITTED AND PUSHED CODE on this development branch, plus a WRITTEN HANDOFF. A plan, investigation, tests alone, or a handoff alone is NOT completion.**  
**Do NOT merge, deploy, release, change GitHub `main`, or modify Click2Cloud.**

## 1. User's exact request — do not reinterpret, expand, or combine tasks

For each of **Google Drive, Dropbox, and OneDrive** in the REDOWN Shelf, expose TWO clear, separately clickable actions, with these exact visible labels:

- **`Re-O'Auth`** — user-clicked **extension OAuth permission/reauthorization** action for the respective provider. Call the provider's EXISTING authorized interactive OAuth entry point. If a grant is missing/expired/revoked and the provider/browser requires consent, launch the official provider consent/sign-in flow from the click. If a valid grant is already present and Chrome/provider returns it without a dialog, honestly report "Already authorized" or a comparably precise result. **Do not claim a new grant or pretend to have opened a popup.** No silent status-only check masquerading as reconnect.
- **`LOGIN`** — open that provider's normal WEB LOGIN/WEBSITE in a Chrome tab, so a signed-out user can sign into their cloud website normally. A signed-in user may simply see their files/home; that is fine. **Do not call the extension's OAuth method from LOGIN**, do not read provider cookies, do not automatically upload, and do not claim website sign-in also refreshed extension OAuth.

This separation is deliberate. **LOGIN is web navigation; Re-O'Auth is extension OAuth permission recovery.** Never combine them or swap their meaning according to a cached `connected` bit.

The three provider cards must KEEP their existing useful **GO TO / open cloud** navigation. Do not remove, rename or repurpose that existing navigation or change what it does. The two requested buttons must remain accessible even if the existing card is showing GO TO, as there can be a working website session with broken extension OAuth. Prefer the smallest compact integration with existing card layout; avoid unnecessary duplicated buttons if an existing website navigation control already fulfills the requested visible LOGIN behavior, but **the user must plainly see independent actions labeled exactly Re-O'Auth and LOGIN**. Preserve counts, cloud logos, existing provider URLs and root/destination identity.

A **Cloudflare R2 working installation is the reference for predictable explicit user-driven authorization**, not authorization to copy its internals into other providers or touch the Cloudflare implementation. Cloudflare currently works for the owner and must remain unchanged.

## 2. Implementation constraints — KEEP THE DIFF SMALL

Inspect actual restored-baseline code before editing:

- `extension/shelf.html` — existing three provider cards, GO TO/LOGIN labels and three-dot menus.
- `extension/shelf-google-drive.js`, `extension/shelf-dropbox.js`, `extension/shelf-onedrive.js` — current UI states and clicks.
- `extension/google-drive-provider.js` exposes `googleDriveOpen` (existing interactive OAuth entry point, authorized from Shelf).
- `extension/dropbox-provider.js` exposes `dropboxConnect` with existing official Dropbox PKCE authentication.
- `extension/onedrive-provider.js` exposes `onedriveConnect` with existing official Microsoft PKCE authentication.
- `extension/google-drive-stream.js`, `extension/dropbox-auth.js`, `extension/onedrive-auth.js` — existing provider auth ownership (inspect for needed permissions and expected responses; **do not rewrite**).
- `extension/shelf.css` — existing provider card and debug-only visual styles.

Implement the shortest safe wiring from **user gesture → existing provider-specific message handler → official existing auth code → honest UI result**. Keep each provider's logic independent. Reuse its current OAuth scope, client configuration, redirect URL, extension ID, account protection and state storage. Do **not** create a second token store, authorization scheduler, polling loop, messaging bus or connection-state projection. No manifest permission expansion without an independently established, clearly explained necessity (prefer existing permissions).

For the web LOGIN action use existing official website URLs already used in the Shelf:
- Google Drive: `https://drive.google.com/drive/u/0/my-drive`
- Dropbox: `https://www.dropbox.com/home`
- OneDrive personal: `https://onedrive.live.com/`; existing business/document library routing uses `https://www.office.com/launch/onedrive` where applicable.

Use `chrome.tabs.create` from the Shelf click, preserving the existing page/navigation behavior. If provider auth refuses because of an actual missing Chrome host permission, report a specific actionable error and use only an existing user-gesture permission API if already supported by that provider. Never bypass permissions or security checks.

**Mandatory status rules:** Separate "OAuth already valid", "consent/sign-in required", "connecting", "authorization failed/cancelled", "provider network unavailable" and "website opened". Never say "Authorization refreshed" merely because an IPC message returned `ok:true` unless the owned auth handler actually established that result. Avoid permanently disabled controls and repeated unsolicited OAuth windows. A 503 is NOT proof of revoked authorization. A website tab is NOT proof of upload readiness.

**Do NOT touch** upload engines, Cloudflare R2, right-click/menu registration, History, Queue records/operations, save verification, counters, destinations, retry/replay, CAPLESS archive, flight recorder, crash instrumentation, migration, identity configuration, provider API architecture, onboarding, settings, or unrelated themes. No data reset, credential revocation, forced disconnect, cleanup, account switch, or deletion of uncertain jobs. **Do not add Google Disconnect as a hidden third task.** No backport/cherry-pick from November 12's failed `4f03d9e` implementation. That failed rollout is diagnostic history, not a base.

Any required source changes outside Shelf markup/three Shelf provider UI scripts and localized CSS must be *small, directly justified as needed for the existing OAuth message flow*, and explicitly itemized in the handoff. Avoid touching existing provider auth engines unless necessary to make one named button work. Prefer direct reuse.

## 3. Optional visual task — CSS ONLY, strictly below the buttons

The owner dislikes the ugly/debugging provider cards in **Debug Mode**. If safely possible, make the EXISTING provider-specific status chips/card indications look intentional: consistent spacing, legible type, stable row height, no vertical jumping when a message appears, bounded wrapping, good contrast, narrow Shelf behavior, and distinguishable error/attention states. In the current baseline, `extension/shelf-queue.js` renders provider card signals with `.queue-card-signal` and provider data state; inspect that existing output.

**CSS-only:** edit `extension/shelf.css` selectors, never `shelf-queue.js` or provider data/Queue state. Do not hide error messages, invent new debug data or build new cards. Ensure standard (Debug OFF) layout is unchanged. If this cannot be done with a small, reliable CSS-only diff, skip optional polish and explicitly say so in the handoff. **No other UI redesign.**

## 4. Concrete implementation and verification requirements

- Establish the branch head's ancestor is exactly `4b59b58`. Work **on the already prepared `codex/re-oauth-login-only-from-4b59b58-2026-11-12`**; do not commit on `main` or create a surprise additional implementation branch. Preserve existing untracked and private artifacts. No `reset --hard`, `git clean` or destructive operations.
- Inspect `AGENTS.md` but DO NOT let its broad project backlog enlarge this request. Keep changes small and auditable; no sweeping refactors, generated docs or baseline fixture rewrites.
- Add/update **focused tests** for both independent actions on ALL THREE providers: visible names; distinct click handlers; LOGIN opens correct website and causes **zero OAuth commands**; Re-O'Auth sends exactly the matching sanctioned provider auth command and does not navigate to the website; successful/cancelled/rejected/timeout/network states; already-authorized silent reuse; repeated clicks/coalescing and disabled-state restoration; existing GO TO remains usable.
- Include a test for Google persisted `connected` with an actual auth-required signal: **Re-O'Auth remains available** and reaches `googleDriveOpen` even though GO TO remains available. Test Dropbox and OneDrive independently, not as copies of a fake shared provider.
- Verify provider identity, destination, stored credentials, pending/uncertain operations, R2 behavior and History/counters stay unchanged by either mere button click (except legitimate provider-managed OAuth state update). No automatic save/replay.
- If CSS polish is included, test stable card geometry with/without changing status text at 320/400/480/640px, light/dark and reduced motion; no growing/flickering debug cards. Tests can use mocked Chrome APIs for wiring and UI but MUST be labeled simulated.
- Run existing relevant focused tests and project prescribed checks to the extent practical; report exact commands/results and existing failures honestly. Do not weaken assertions, delete tests, suppress errors or relabel baseline failures as passing.
- Real installed Windows Chrome OAuth cannot be certified by mocked Linux Chromium tests. **Do not block all coding output if real-provider testing is inaccessible**: finish and push the candidate branch, write the handoff, mark real-user/Windows acceptance **PENDING**, and do not merge or declare release-ready.
- Include an owner acceptance checklist: in installed extension, click each LOGIN and confirm website opens (without OAuth), then click Re-O'Auth and confirm official OAuth consent **when required** and the same account remains bound; confirm one fresh small remotely verified save per provider when safely feasible, especially Cloudflare regression. Do not intentionally revoke working grants or repeat uncertain uploads to force a dialog.
- If a genuine technical blocker prevents completing one provider, deliver whatever limited implementation is correct on the branch, give exact blocker/reproducer and tests, and mark task **INCOMPLETE**. Do not call a partial implementation finished.

## 5. REQUIRED CODEx deliverables — no empty run

This is an **implementation assignment**, not a request for an architecture paper.

**Codex must produce ALL of the following, before ending its run:**

1. **Actual changed runtime/UI code** for the two requested actions on Google Drive, Dropbox, and OneDrive (not only Markdown, mockups or tests).
2. **Focused automated test changes and executed test evidence** (accurate pass/fail counts and commands).
3. A **completed, committed and pushed development branch** named exactly `codex/re-oauth-login-only-from-4b59b58-2026-11-12`, based on restored `main` at `4b59b58`. It must contain the implementation and tests. Check that GitHub remote has the commits. **No merge to `main`; no PR auto-merge.**
4. **A written handoff committed on that SAME development branch** at `docs/CODEX_RE_OAUTH_LOGIN_HANDOFF_2026-11-12.md`, which explicitly contains:
   - baseline SHA, final development branch name and final HEAD SHA, and remote GitHub link;
   - concise list of actual changes and every modified file, plus why;
   - exact mapping of each **Re-O'Auth** and **LOGIN** button to its action;
   - test commands, precise outcomes, any failures and what remains unverified;
   - whether optional CSS-only debug polish was included or skipped;
   - explicit preservation/non-regression notes for Cloudflare R2, providers, destinations, Queue, History, credentials and CAPLESS;
   - Windows Chrome/manual OAuth/remote-save acceptance checklist and known blockers;
   - a clear **READY FOR OWNER REVIEW** versus **INCOMPLETE / BLOCKED** status; **never "released" or "live-verified" without evidence**.
5. A final plain-language response stating **what was implemented**, **which branch was pushed**, **the commit SHA**, and linking directly to **the handoff and branch**. Do not stop at "the plan is ready."

**Stop after producing the finished development branch and handoff. Do NOT merge, rebase onto another baseline, rewrite `main`, deploy, publish, or ask the owner to perform destructive setup. Only the owner decides if/when the change goes to `main`.**

## 6. Hard boundaries / regression guard

A passing mocked first-screen click is NOT sufficient. Validate the real provider handler routing and code result all the way to the existing OAuth owner, preserve valid auth as-is, ensure no silent success lies, and prove working provider navigation hasn't been replaced with a status-only no-op. Explicitly test that optional layout does not bounce and that clicking LOGIN never initiates OAuth. Keep the patch reviewably small so a later regression can be traced directly to a changed line.

**Definition of success:** a real implementation on a pushed, reviewable development branch, with truthful test evidence and a committed handoff, containing ONLY the requested provider buttons plus optional CSS-only Debug Mode polish. Nothing else.
