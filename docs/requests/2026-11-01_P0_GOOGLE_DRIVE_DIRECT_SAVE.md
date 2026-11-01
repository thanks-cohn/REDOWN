# REDOWN V3 — P0: Google Drive Test OAuth + Direct Save

**Repository:** `thanks-cohn/REDOWN`  
**Required implementation branch:** `codex/v3-parity-first-reconstruction`  
**Priority:** P0  
**Action:** Inspect, implement, test, document, commit, and push. **Do not stop at a proposal, scaffold, or audit.**  
**Status of this document:** Implementation request, NOT a claim of completed functionality or approved OAuth.

## Owner Google Cloud setup checkpoint (November 1, 2026)

Confirmed in the owner's Google Auth Platform screenshots:

- Google Cloud project: `redown-click2cloud`.
- **Data Access:** `drive.file` was selected and the console displayed **“Data access changes saved!”**.
- **Audience:** **External** / **Testing**, with **one test user** displayed. Do not publish the OAuth app merely to test this implementation.
- **Chrome Extension OAuth Client ID supplied November 1, 2026:** `763628402500-55kpvvm33fvrtcggva4tp2m4te67dghm.apps.googleusercontent.com`. This is a public client identifier, not a client secret. It has been configured under `oauth2` in `extension/manifest.json`, with **only** `https://www.googleapis.com/auth/drive.file` as the OAuth scope. Do not replace it with a web application client or request a client secret.
- **Next action:** Go to **Clients**, open this OAuth client, and confirm its **Application type = Chrome Extension** and its **Item ID = actual installed REDOWN extension ID**. The 32-character ID calculated from the currently committed `manifest.key` is `mkadkgpekmkknfbniacdlmgikihjjepf`. This calculated value must be checked against `chrome://extensions` and the planned Chrome Web Store item; the Client ID alone does NOT prove the Google Console Item ID matches.
- **Implementation still required:** A configured manifest is not functional login, token exchange, automatic REDOWN folder creation, or Google Drive remote upload. Codex must implement and test the full workflow before marking the feature complete.
- **Remaining independent check:** Confirm Google Drive API is enabled in the same project.
- **Privacy:** Do **not** copy the owner's test-user email, OAuth tokens, private information, or passwords into this public repository. Screenshots are evidence of setup only; live OAuth and Drive transfer are **not** yet proven.

## Product result required

A first-time user can:

1. Open REDOWN without connecting a Cloudflare account.
2. Click **Connect Google Drive**.
3. Authorize their Google account using REDOWN's configured Google OAuth client and the **single** Drive permission `https://www.googleapis.com/auth/drive.file`.
4. See a folder named **REDOWN** automatically created in **My Drive** on first successful connection, or reuse a previously created and verified REDOWN app folder on reconnect.
5. Right-click an eligible web file and choose **REDOWN → Google Drive → REDOWN**.
6. Save that file directly into the Google Drive REDOWN folder, **without downloading or staging the file's content on the user's computer** for the supported direct-transfer route.
7. See actual success only when Google Drive confirms the saved object. Offer **Open in Google Drive** and record provider, destination and outcome in REDOWN's transfer history.

The first working slice must handle a normal public PNG and PDF, and must not require public OAuth app verification or Chrome Web Store publication for the owner to test with an explicitly authorized Google OAuth **Testing** user.

**Scope:** Google Drive is distinct from Google Cloud Storage and distinct from Cloudflare R2. Do not pretend Drive is an S3 bucket, do not create fake R2 destinations, and do not require R2 to use Drive.

## Before touching code

- Read `AGENTS.md` and follow its current project onboarding, diagnostics and regression instructions. Inspect the current branch and current handoffs rather than assuming the roadmap is implemented.
- Inspect `extension/manifest.json`, `extension/service-worker.js`, `extension/background.js`, current V3 right-click menu implementation, settings/Shelf, transfer history, and `extension/beta/file-api.mjs` / `extension/beta/r2-adapter.mjs`.
- Determine the smallest provider-discriminated changes that preserve the existing operating extension. Keep V3 as the authoritative right-click engine. Do not rebuild the core R2 engine or replace the service-worker boot path.
- Record current test baseline before editing. Do not misreport existing failures as newly introduced bugs or mark mocked/browserless tests as real OAuth success.

## Google Cloud prerequisites / owner-supplied setup

The owner will perform manual Google Cloud Console setup. Do not make up credential values or claim approval.

- Google Cloud project: `redown-click2cloud` (confirm actual project identity before use).
- Google Drive API: enabled.
- Google Auth Platform → Audience: **External**, **Testing**.
- Add the actual Google account used for live testing under **Test users**.
- Google Auth Platform → Data Access: add **only** `https://www.googleapis.com/auth/drive.file`. Do not add restricted full-Drive, Drive readonly or metadata readonly scopes for this feature.
- Google Auth Platform → Clients: create/use a **Chrome Extension** OAuth client whose Item ID matches the actual extension ID from REDOWN's final manifest/public key and intended Chrome Web Store draft.
- Owner supplies the Chrome Extension OAuth **client ID** through a documented build configuration. The client ID is not a secret; **never require or embed a client secret** in extension code or commits. No personal test-account credentials or OAuth access tokens in source control.
- Use Chrome's supported extension identity and OAuth mechanism (including `chrome.identity.getAuthToken` and `oauth2` manifest configuration where compatible), or document and implement an equally secure browser-extension flow. Obtain only needed scope and bind results to the correct Google account.
- Provide the owner the exact remaining one-time console fields and client-ID injection steps at completion.

## P0 Shelf UI: Google Drive login button at top (owner clarification, November 1, 2026)

**This is a LOGIN / CONNECTION control, not a file-transfer or upload action.**

**Exact placement:** In `extension/shelf.html`, within `#clouds-view > section.overview`, insert the Google Drive connection control **immediately after**:

```html
<p class="eyebrow">YOUR SPACE <span class="eyebrow-dot" aria-hidden="true">·</span> TRUE REMOTE</p>
```

and **before** the existing `<h1 class="overview-title">The Future Is Now. / True Remote Is Here.</h1>`.

Keep the current eyebrow anchored in its existing position. **Push the existing headline and all content beneath it downward naturally using document flow.** Preserve the headline's typography, celestial effects, positioning relationships, connection summary, Cloudflare card, odometer, history, settings, theme switching, and all other Shelf structure. No absolute positioning, overlap, covering, disappearing controls, forced fixed heights, or unexpected scroll jumps.

**Visual requirements:**
- A professional, polished, clearly clickable and keyboard-accessible Google Drive authentication button.
- **Official Google Drive logo on the LEFT**, visually aligned, recognizable, crisp at Shelf widths and high-DPI screens. Bundle a suitable local logo asset with its appropriate rights/attribution. Do not fetch brand assets from the network at runtime.
- The primary unconnected label should be **"Log in to Google Drive"**, not "Send file" or "Upload to Drive". The button launches the authorized Google OAuth connection flow.
- Design follows the currently selected REDOWN Shelf theme with good contrast and restrained, professional outlines, shadows, hover, press, and visible focus behavior. The logo retains accurate brand colors. Use responsive spacing; no giant marketing card or unrelated imagery.
- Loading: "Connecting to Google Drive…" with disabled duplicate-click state; connected: "Google Drive connected" plus a clear action to open the app's `REDOWN` folder; expired/disconnected/error: "Reconnect Google Drive" or "Log in to Google Drive" as appropriate. Do not claim connected before verifying authorization and folder readiness.
- Keep an appropriately labeled status/description adjacent for accessibility without duplicating large panels. Don't make the entire Shelf cloud view conditional on Google connection. Cloudflare remains independently connectable.
- Add/update targeted DOM, keyboard and responsive visual regression tests for this **exact** placement, all supported Shelf themes, small Shelf widths, connection states, and zero overlap/layout displacement.

**No placeholder button:** Wire to the real Google OAuth flow as part of this implementation. If a manual prerequisite blocks live OAuth, report the blocker without showing fake success; do not quietly ship a non-working login button.

## Functional milestones

### A. Connection and user-visible state

Implement clear **Connect Google Drive**, **Connected**, **Reconnect**, and **Disconnect** actions in existing REDOWN controls. Google Drive connection and the Drive save destination must work independently of Cloudflare R2 connection, bucket activation and R2 setup.

- Consent failures, revoked access, expired tokens, user switching, aborted login and offline operation must be recoverable and shown accurately.
- Google authorization must survive ordinary extension worker restarts with supported token retrieval and reauthorization, without saving bearer tokens into arbitrary diagnostics, logs, exported files or repositories.
- A disconnected state must never masquerade as an active save destination.
- Do not show internal setup/debug labels in public Chrome right-click menu items.

### B. Automatic REDOWN folder in My Drive

Once a user has authorized Drive:

- Create an app-owned **REDOWN** folder at the root of My Drive if no validated prior app-owned REDOWN folder is available.
- Save the stable Drive folder ID, keyed to the correct Google account. On reconnect, validate the recorded folder and **reuse it**. If missing or inaccessible, recover safely and clearly.
- Respect `drive.file` limitations. Do not scan arbitrary private files or assume access to every folder that coincidentally has the name REDOWN.
- Serialize concurrent first-run creation attempts. Avoid extra duplicate folders from retries or service-worker races. If an ambiguous create response occurs, reconcile using only permitted app-owned resources rather than blindly repeating.
- Do not ask the user to create a folder manually or click a separate bucket-activation button.

### C. Direct remote URL → Google Drive

- Implement the smallest real **Google Drive provider** route through REDOWN's existing destination/operation architecture, and use the existing V3 context-menu selection and history system.
- The direct remote route must transfer **file payload bytes without fetching them into Chrome, downloading them to the user's disk, or passing the payload through the extension**. Only destination metadata and controls needed to initiate/observe the operation should traverse Chrome.
- Implement or reuse a secure remote transfer execution boundary without exposing the user's Google credential to untrusted source hosts or unrelated recipients. Do not log, publish or unnecessarily persist credentials, sensitive source URLs, or transfer payloads. Validate redirects, source eligibility and address safety; enforce resource limits.
- Use the official Google Drive v3 file upload API. Support correct metadata (including `parents: [REDOWN_FOLDER_ID]`), original filename/MIME type when available, reliable upload completion and appropriate resumable upload/retry handling. Implement honest size limits rather than pretending any large file works.
- REDOWN's conflict default is **KEEP BOTH**. Do not overwrite or destroy existing same-named Drive files; Drive IDs, not bucket/object keys, identify saved files.
- After upload, record and verify the resulting Drive file `id`, name and parent folder, and check size/checksum when available. Preserve a clear difference between `completed`, `failed`, `cancelled`, `blocked` and `uncertain`. An upload with an ambiguous network result must not be labeled completed.
- Return a safe user-usable Google Drive file link and show it in **Open in Google Drive** / transfer history.
- Eligible first test sources: a public PNG URL and a public PDF URL, saved into REDOWN on the user's own Drive.
- If a URL is behind authentication, is a `blob:` / locally generated file, denies remote fetching, or cannot be directly transferred safely, **do not silently use a browser download as a fallback and call it direct**. Explain the limitation.

### D. Preserve existing REDOWN behavior

- The Cloudflare R2 route must remain functional. No regressions to the main Shelf, Explorer, preview/lightbox navigation, service worker startup/fallback, saved settings, menus, history, or bucket activation.
- The V3 right-click menu should contain **REDOWN → Google Drive → REDOWN** when ready. A disconnected destination can offer a connection action, but must never navigate to Dashboard Home and falsely imply a save occurred.
- Do not expose implementation machinery in customer-facing copy or modify `thanks-cohn/redown-website`. Product copy should focus on the outcome: **"Save supported web files directly to your cloud without downloading them to your computer first."**
- The repository is currently public. Treat all committed text and code as publicly visible; do not commit sensitive credentials, private architecture notes or unpublished deployment details.

## Test and acceptance requirements

Automated tests must cover at least: authorized Testing-mode login; denied/cancelled login; 401/reconnect and revoked scope; account isolation; manifest extension ID/client mismatch; folder create and reconnect reuse; race/duplicate prevention; public PNG and PDF; correct destination folder; KEEP BOTH; real Drive response parsing; upload interruption/ambiguous status; 403/429/5xx; ordinary MV3 worker restart; URL redirect/safety restrictions; and preservation of the V3/R2 boot/right-click paths.

**Critical invariant test:** In the eligible direct-transfer route, file content must never pass through the browser's download API, local storage or an extension payload buffer. A fake/mock server asserting no browser payload is useful, but is not live proof.

**Required real-owner acceptance (mark BLOCKED until credentials/test user exist):**

1. Install the actual REDOWN candidate under its intended extension ID in a clean Chrome profile.
2. Use the owner's Google account, which was added to the OAuth Test users list. Connect without any Cloudflare connection.
3. Confirm **REDOWN** appears in My Drive once and only once.
4. Right-click a disposable public PNG, choose **REDOWN → Google Drive → REDOWN**, then verify the actual content and file ID in Drive.
5. Repeat with a disposable public PDF. Confirm the original file contents and accurate Drive size/checksum evidence where possible.
6. Restart Chrome and reconnect. Confirm the same folder is reused and a new save works.
7. Revoke Google Drive permission and verify REDOWN shows a clear recovery path.
8. Verify the direct-transfer test did not store the file on the computer.

Record exact files modified, commits, test commands/results, a real browser/provider evidence matrix, any required one-time owner action, and remaining limits. Do not claim OAuth production verification, Google approval, or Chrome Store acceptance.

## Source-of-truth references

- Google Drive scope classification: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Google Drive folders: https://developers.google.com/workspace/drive/api/guides/folder
- Google Drive uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Google Drive files/create: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
- Chrome extension identity API: https://developer.chrome.com/docs/extensions/reference/api/identity
- Chrome extension OAuth manifest: https://developer.chrome.com/docs/extensions/reference/manifest/oauth2

**Done means an implemented and tested end-to-end slice, not merely a written plan.** If live account access or test configuration is missing, deliver working code/tests, state the precise blocker, and hand the owner the next setup action without fabricating PASS.
