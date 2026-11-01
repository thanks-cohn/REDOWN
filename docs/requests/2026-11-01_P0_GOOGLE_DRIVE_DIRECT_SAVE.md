# REDOWN V3 — P0: Google Drive Test OAuth + Browser-Mediated Save

**Repository:** `thanks-cohn/REDOWN`  
**Required implementation branch:** `codex/v3-parity-first-reconstruction`  
**Priority:** P0  
**Action:** Inspect, implement, test, document, commit, and push. **Do not stop at a proposal, scaffold, or audit.**  
**Status of this document:** Implementation request, NOT a claim of completed functionality or approved OAuth.

## P0 HARD SAFETY GATE — V3 ENGINE IS FROZEN, GOOGLE DRIVE IS ADDITIVE ONLY

**Owner's explicit instruction (November 1, 2026): DO NOT TOUCH, REWRITE, REFACTOR, REPAIR, REPLACE, REFORMAT, MIGRATE OR ALTER THE EXISTING V3 RIGHT-CLICK ENGINE.** This is a stronger requirement than ordinary "preserve existing functionality." The successful design is a **new Google Drive provider and a thin additive integration at the existing shared Chrome menu boundary**, not a new version of V3.

### Protected engine and behavior: NO source edits

1. **`extension/right-click-v3.js` is READ-ONLY.** This file owns the existing V3 menu domain, project/resolve semantics, presentation selection, Simple/Nested Narrow/Level(Depth) behavior, location/depth/bucket logic, IDs and configuration validation. Do not modify a single line of it. Do not subclass, wrap, monkeypatch or override its APIs in a way that changes results.
2. Treat the existing V3 state, selected Cloudflare destinations, setup/editor, bucket activation, and V3's right-click menu projection as **immutable inputs** to the new integration. Do not modify the stored `rightClickV3`, `rightClickV3Presentation`, `rightClickV3LevelScopes`, `rightClickActivatedBuckets`, `rightClickV3Inventory` or current Cloudflare profile semantics for Google Drive. Never migrate Google Drive into Cloudflare destination records.
3. Protect existing V3 and legacy support modules, including `extension/right-click-current.js`, `extension/nested-locations.js`, `extension/destination-config.js` and existing editor modules. Do not modify them to add Google Drive.
4. Do not change Cloudflare R2 transfer implementation, bucket setup, storage, authentication, existing right-click destination resolution, Shelf boot/fallback, or its TRUE REMOTE path. Do not take this opportunity to clean up other bugs or rebuild anything.
5. Preserve current V3 menu actions exactly as they are in all three modes. **No reinterpretation or renaming of Cloudflare IDs**. Existing V3 `project()` and `resolve()` MUST receive unchanged inputs, and for any given state return the same output as before this Google Drive feature.

### Only allowed shared-menu integration, if unavoidable

- Chrome has a **single REDOWN root** and the current Chrome menu writer lives in `extension/background.js`. Adding a direct sibling under this root necessarily requires a tiny **additive hook to the menu composition / registration boundary**. This **does not authorize edits to V3's projection, resolver, modes or engine internals.**
- Implement Google Drive-specific behavior in **new, isolated modules** (e.g., a Google provider adapter, Drive OAuth/folder/upload logic, and `google-drive-menu.js` generating unique namespaced child entries). Integrate via the existing menu plan's `create(item)` collection after V3 produces its original entries; append the independent Google entry with `parentId: ROOT_MENU_ID`. Let the **existing one menu writer** reconcile the unified plan. Do NOT create another `chrome.contextMenus.onClicked` listener or a second root/menu registration engine.
- In `extension/background.js`, **permit only the narrowest additive glue** to load the Google module, append its root-level menu entry to the existing `buildMenus()` description, route Google-namespaced clicks **before** existing Cloudflare resolution, and trigger normal reconciliation when Google connection state changes. The pre-existing V3 projection, Cloudflare menu generation, click routes and resolver must be retained without behavioral changes. Avoid extracting or rewriting functions.
- Existing `extension/manifest.json` already contains the Google OAuth Client ID and `drive.file`; changes there, if any, are limited to strictly necessary, separately justified permissions/module registration. Shelf HTML/CSS/JS may gain the requested Google login control, but must not refactor existing Shelf structure or behavior.
- **Prefer an additional function call and early return over modifying any existing V3 condition.** No duplicated `ROOT_MENU_ID`; no alternate authoritative V3 engine; no provider impersonation; no separate `rightClickEngine` toggle; no unrelated changes in `background.js`. Google actions must be isolated from existing `resolveActiveRightClick()` and the R2 save routine.
- **If Google Drive cannot be integrated without modifying V3 core behavior or protected engine files, STOP that portion and explain the exact blocker to the owner. Do not silently violate this gate to make the feature appear complete.** It is acceptable to report a precise integration blocker; not acceptable to retrofit or replace V3 without explicit new authorization.

### Required before/after proof of non-interference

- **Before edits**, record current commit and SHA-256 hashes of the protected V3 engine/support files, and capture authoritative V3 menu plans, projected IDs, targets, account/bucket/prefix resolutions and native-click actions for representative Simple, Nested Narrow, and Nested Level/Depth scenarios. Store redacted, deterministic fixtures/receipts.
- **After edits**, confirm protected file hashes are **identical**. Attach a limited, reviewable `git diff` for the additive `extension/background.js` changes. A changed protected file hash is a **FAIL** and must be reverted before completion.
- Run existing V3 tests unchanged. Test identical Cloudflare menu projection and resolved account/bucket/prefix **before vs. after** adding Google; compare all original entries, labels, parents, order, click routes and actions after filtering out ONLY the new Google-namespaced IDs.
- Test mixed states: Cloudflare Simple + Google connected/disconnected; Nested Narrow + Google connected/disconnected; Nested Level/Depth + Google connected/disconnected; zero Cloudflare profiles; unactivated R2 buckets; repeated provider login/logout; MV3 restart; rapid mode changes; history/shelf. Google must remain a **direct child of REDOWN** with independent Google login/save dispatch; Cloudflare output must remain identical.
- A working Google upload **does not compensate for any change/regression in V3**. Do not report PASS if V3 hashes, behaviors or original routes differ, even if the Drive feature works.
- Commit only narrow, auditable additive changes; explicitly list each modified file and why it was necessary. If additional integration points are needed, seek owner approval rather than making speculative engine changes.

**Priority order:** (1) Preserve V3 engine *exactly*, (2) preserve Cloudflare TRUE REMOTE and existing UI, (3) add independent Google Drive login and browser-mediated save, (4) prove no regression. Never sacrifice (1) or (2) for (3).

## READ FIRST — authoritative browser-mediated transport contract (do not restart the architecture)

**Owner decision, confirmed November 1, 2026:** Google Drive saves are **browser-mediated fetch → upload**. This is the non-negotiable transport model for this P0. It supersedes all older proposals/requests/summaries that refer to Google Drive as TRUE REMOTE, a server-to-server transfer, or a remote relay. **Do not resurrect a server-side transfer solution**, whether a new service, Cloudflare Worker, GitHub Action, backend fetch proxy, server-side URL import, or R2-to-Drive hop. None is needed for the initial Drive feature. **Cloudflare R2's current TRUE REMOTE implementation is an entirely separate workflow and must remain unchanged.**

### Exact data route to implement

```text
User right-clicks a supported web image/file/link
  → REDOWN → Google Drive → REDOWN
  → authenticated Google account and app-owned REDOWN folder ID are resolved
  → Chrome extension fetches the actual source file bytes (subject to permissions/source access)
  → extension keeps those bytes temporarily in a bounded browser transfer context
  → extension uploads the bytes to the Google Drive v3 upload API
  → Drive responds with a real saved file ID and metadata
  → REDOWN verifies the destination/receipt and reports success + Open in Google Drive

NO required Cloudflare login    NO R2 bucket    NO external transfer relay
NO Chrome download dialog       NO user-selected local download directory
NO claim of Google TRUE REMOTE  NO successful status before a Drive receipt
```

The browser **does receive/process the actual payload bytes**. Browser-managed memory, buffering, and streaming are permitted, with explicit size/resource limits. The requirement is **no deliberate saved local copy or `chrome.downloads.download` in the normal Google Drive flow**, **not** a guarantee that Chrome or the operating system will never cache, buffer, or page memory to disk internally. Do not falsely describe browser-mediated Drive as zero local processing or confuse it with the Cloudflare R2 remote-only path.

### Mandatory design and implementation decisions

1. Implement through the existing V3 right-click engine and a **provider-specific Google Drive route** with independent IDs and authentication state. Do not introduce another menu writer, new REDOWN root, or alter Cloudflare Simple/Narrow/Depth mode behavior.
2. Choose a **supported Chrome extension execution context** able to run the source fetch and Drive upload. Inspect MV3 background/service-worker lifecycle, required host permissions, redirects and response streaming capabilities; use a persistent extension-owned page/offscreen document when justified, not a brittle worker-only giant buffer. Use bounded chunks, explicit progress/uncertain states and user-visible cancellation. Explain any platform lifetime limitations.
3. For permitted public sources, obtain actual bytes using `fetch`/streaming in the extension's authorized context. Request only appropriate host access, ideally optional per-source origins instead of excessive wildcard permissions. If a site blocks access, requires credentials not available to the extension, or serves an unsupported `blob:` URL, return a truthful limitation instead of silently falling back to a disk download.
4. Upload **those same bytes** directly from the Chrome extension to the Google Drive v3 upload endpoint using a token obtained from the configured Chrome OAuth client. Authorization headers go **only** to Google's permitted API hosts, never to arbitrary website URLs. Protect token, sensitive URLs and bytes from logs, public pages and untrusted site contexts.
5. Create/reuse the **single app-owned `My Drive/REDOWN` folder** for that Google account, with stable Drive ID, correct parent on each file, safe race handling and KEEP BOTH semantics. A file is **not** saved just because the source fetch completed; require a verified Google Drive file receipt.
6. A first-time user needs only **Log in to Google Drive** in the Shelf, then the independent **REDOWN → Google Drive → REDOWN** menu to save. The Shelf login button belongs **immediately under `YOUR SPACE · TRUE REMOTE`**, with Google's logo on the left; the existing headline and everything below move downward naturally without layout redesign. Google Drive is always a direct child of the REDOWN right-click root regardless of Cloudflare's chosen mode.
7. Keep the previous Cloudflare R2 TRUE REMOTE flow and all established Shelf, menu, history, Explorer, and service-worker boot functions intact; add no changes to the public website in this engineering task.

### Stop conditions and proof: when this is NOT complete

Mark an acceptance case **FAIL** or **BLOCKED**, not PASS, if: Google OAuth is only configured but no login works; a Google Drive folder is only drawn in the UI, not created or reused in the real account; the browser payload transfer is replaced by a remote service; `chrome.downloads.download` or an explicit local file is required for an eligible normal save; a Google menu option sends the user to Cloudflare setup/dashboard or an R2 bucket; Drive returns no verified file ID/parent; a cancelled or interrupted upload reports completed; or R2 behavior regresses.

**Evidence expected:** (a) real Chrome login with the listed Google OAuth Testing user; (b) right-click public PNG and PDF, with source bytes passing through Chrome, no intentional local download; (c) matching Drive bytes/file metadata under the **REDOWN** folder, with real Drive IDs; (d) Google menu stays independent across Cloudflare Simple/Nested Narrow/Depth/Disconnected; (e) reconnect and worker restart; (f) saved logs/results with sensitive data redacted. Automated mocks help, but are not an adequate substitute for the live installed-extension test.

**Implementation priority:** Deliver a small end-to-end functioning slice first, not a new architectural proposal. If a platform limit blocks an individual source or file size, document the exact limit, implement the smallest safe supported behavior, and mark the unsupported case clearly. **Never change the owner's browser-mediated decision to avoid a test blocker.**

## Owner Google Cloud setup checkpoint (November 1, 2026)

Confirmed in the owner's Google Auth Platform screenshots:

- Google Cloud project: `redown-click2cloud`.
- **Data Access:** `drive.file` was selected and the console displayed **“Data access changes saved!”**.
- **Audience:** **External** / **Testing**, with **one test user** displayed. Do not publish the OAuth app merely to test this implementation.
- **Chrome Extension OAuth Client ID supplied November 1, 2026:** `763628402500-55kpvvm33fvrtcggva4tp2m4te67dghm.apps.googleusercontent.com`. This is a public client identifier, not a client secret. It has been configured under `oauth2` in `extension/manifest.json`, with **only** `https://www.googleapis.com/auth/drive.file` as the OAuth scope. Do not replace it with a web application client or request a client secret.
- **Confirmed by owner screenshot, November 1, 2026:** In Google Auth Platform → Clients, the existing OAuth client is of type **Chrome Extension** and its **Item ID is exactly `mkadkgpekmkknfbniacdlmgikihjjepf`**, matching the owner's installed REDOWN extension ID and the extension's committed public key. The displayed OAuth Client ID matches `extension/manifest.json`. **Do not create a replacement OAuth client.**
- **Implementation still required:** A configured manifest is not functional login, token exchange, automatic REDOWN folder creation, or Google Drive browser-mediated upload. Codex must implement and test the full workflow before marking the feature complete.
- **Google Drive API:** Confirmed **Enabled** in the same `redown-click2cloud` project in the owner's Google Cloud API/Service Details screenshot.
- **Privacy:** Do **not** copy the owner's test-user email, OAuth tokens, private information, or passwords into this public repository. Screenshots are evidence of setup only; live OAuth and Drive transfer are **not** yet proven.

## Product result required

A first-time user can:

1. Open REDOWN without connecting a Cloudflare account.
2. Click **Connect Google Drive**.
3. Authorize their Google account using REDOWN's configured Google OAuth client and the **single** Drive permission `https://www.googleapis.com/auth/drive.file`.
4. See a folder named **REDOWN** automatically created in **My Drive** on first successful connection, or reuse a previously created and verified REDOWN app folder on reconnect.
5. Right-click an eligible web file and choose **REDOWN → Google Drive → REDOWN**.
6. For supported files, **Chrome/REDOWN receives the file bytes and uploads them into the Google Drive REDOWN folder**. This is a browser-mediated transfer, not cloud-to-cloud TRUE REMOTE. Use transient browser memory/streaming; do not leave an ordinary file in the user's Downloads folder or other persistent local location.
7. See actual success only when Google Drive confirms the saved object. Offer **Open in Google Drive** and record provider, destination and outcome in REDOWN's transfer history.

The first working slice must handle a normal public PNG and PDF through a browser-mediated fetch-and-upload path, and must not require public OAuth app verification or Chrome Web Store publication for the owner to test with an explicitly authorized Google OAuth **Testing** user.

**Scope and architecture distinction:** Google Drive is distinct from Google Cloud Storage and Cloudflare R2. **The Google Drive path is deliberately browser-mediated, unlike REDOWN's existing R2 TRUE REMOTE path.** Do not pretend Drive is an S3 bucket, create fake R2 destinations, require R2 to use Drive, or provision a new server-side transfer service for this Google Drive feature.

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

## P0 Context menu: independent Google Drive entry under REDOWN (owner clarification, November 1, 2026)

**Invariant: Google Drive is a direct child of the ONE existing `REDOWN` Chrome right-click root regardless of Cloudflare's presentation mode.** This is independent of Cloudflare's own Simple, Nested/Narrow, and Nested/Level(Depth) settings, bucket activation, selected account, destinations and connection state.

**Illustrative target (exact Cloudflare children remain whatever V3 already produces):**

```text
Right-click file/link/image
└─ REDOWN
   ├─ Google Drive  ▸                   [always a direct child]
   │  └─ REDOWN                         [save to app folder, if connected]
   │     or Log in to Google Drive…     [connection action, if disconnected]
   ├─ [Cloudflare V3 destination rows, using whichever display mode owner chose]
   └─ Manage destinations…
```

- Do **not** put Google Drive under a Cloudflare account, bucket, `Cloudflare setup`, nested category, or Cloudflare mode-specific subtree.
- Do **not** introduce another top-level REDOWN root or a second independent Chrome menu writer. Use the existing authoritative `extension/background.js` `buildMenus()`/reconciliation system to combine provider-independent root children and Cloudflare V3's existing projection. Keep the current `ROOT_MENU_ID` and Chrome context applicability; order with provider entries clearly distinguishable.
- The Google entry remains present across **Simple, Nested/Narrow, and Nested/Level(Depth)**, including when Cloudflare is disconnected, has zero profiles, or has not activated buckets. Cloudflare's own children may vary, but Google Drive's root child is NOT controlled by Cloudflare's selected display mode.
- Give Google menu IDs an isolated, deterministic namespace (e.g., `v3:provider:google-drive:root`, `v3:provider:google-drive:save-redown`, `v3:provider:google-drive:connect`), separate from Cloudflare's IDs. Provider-specific click dispatch must route the Drive IDs to the Google Drive adapter **before** Cloudflare's existing `resolveActiveRightClick()` / R2 destination save path; never fall through to Cloudflare setup, Dashboard Home, or an R2 bucket.
- Native menu updates/rebuilds must **atomically reconcile the combined plan** using unique IDs and parent-first ordering. No duplicate entries, missing parent, stranded stale IDs, lost provider menus, or transient contradictory actions during mode changes/connection changes/service-worker restarts. Existing `redown-setup`, `redown-manage` and `v3:provider:cloudflare:* ` actions retain their original meaning.
- **Connected:** `REDOWN → Google Drive → REDOWN` initiates the eligible file save to the verified app-owned Drive folder; **disconnected:** `REDOWN → Google Drive → Log in to Google Drive…` takes the user to the actual Google OAuth flow; **connecting/not ready:** provide safe non-saving guidance or a disabled/not-ready state. Menu clicks must never report successful transfer until Google confirms the operation.
- Keep the Shelf's separately specified Google login button. The right-click connection entry complements it, not substitutes for it.
- No forced Cloudflare restructure. Preserve current V3 Simple/Narrow/Depth labels, ordering, settings, selection, existing destination paths and operation routing.
- Tests: assert correct root parentage, uniqueness, stable Google appearance and click routing for each Cloudflare mode and disconnected/connected transitions, Cloudflare no-profiles setup, rapid mode switching, repeated menu rebuilds, fresh installation, and MV3 worker restart. Confirm a Google save cannot invoke R2 handling or Dashboard navigation, and Cloudflare operations still work.

**Acceptance:** No matter what Cloudflare mode the user chooses, the REDOWN right-click menu retains a direct **Google Drive** child, and selecting its REDOWN folder saves to Drive without collision with Cloudflare.

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

### C. Browser-mediated file transfer → Google Drive (NOT remote/cloud-to-cloud)

**Authoritative owner correction, November 1, 2026: The browser gets the file and hands it off to Google Drive. This is an intentional SaveAnywhere-style, browser-mediated flow. Never implement the earlier server-side TRUE REMOTE requirement for Google Drive.**

- Implement the smallest real **Google Drive provider** route through REDOWN's existing destination/operation architecture, using the current V3 context-menu selection and transfer history. The transfer executor **runs in an appropriate Chrome extension context**, fetching eligible file bytes from the source and then uploading those bytes with the user's authorized Google Drive access token to Google Drive.
- **Browser flow:** select a file URL → obtain applicable source access → receive bytes through the extension's permitted `fetch`/streaming mechanism → send them to Drive's upload endpoint → confirm Drive returned the saved file. The data is intentionally **handled by Chrome/REDOWN in memory**. **Do not write a permanent file into Downloads or another local directory** as part of the normal flow; do not invoke `chrome.downloads.download` to simulate a zero-disk path. Transient memory buffering is allowed and expected. Do not falsely call this path TRUE REMOTE.
- **Avoid a separate backend** for this Drive slice: no automatic new Worker/server/relay provisioning, no requirement for user Cloudflare setup, and no passing Drive credentials to arbitrary servers or source websites. The extension fetches the source with narrowly scoped host access and sends authenticated uploads only to Google Drive; preserve browser/OAuth privacy. Evaluate optional host permissions and per-site consent instead of indiscriminately requesting all URLs.
- Choose a runtime robust to MV3 service-worker suspension. Inspect existing extension/Shelf/offscreen/background architecture and use the smallest supportable browser-owned transfer context. Bound queues/memory; stream or chunk when platform constraints require; keep transfer session state and user-visible progress. Provide honest size limits, recoverability and clear partial/uncertain states. Never load an unbounded large file as a single in-memory Blob.
- **Use official Google Drive v3 file upload APIs**, preferably resumable upload for variable/large sizes: start upload session, send correctly aligned chunks where supported, handle `308` continuation, `401` reauthorization, quota/rate limits, aborts and retries, and independently verify the resulting file. Set correct `name`, MIME type and `parents: [REDOWN_FOLDER_ID]`; preserve arbitrary binary bytes. Resumable upload is a **transfer protocol**, not a claim that every interrupted Chrome tab/worker session can automatically recover.
- Some sites need cookies, headers, a temporary grant, or a tab-specific user gesture; others block extension fetch, require login or generate `blob:` links. Implement supported source-handling paths **only with user authorization and accurate success signals**. Don't claim every website works or access content in a manner that bypasses authentication or permissions. If a source is inaccessible, say so rather than silently writing a browser download or claiming a remote transfer.
- Never include Google OAuth tokens in source fetches, site-facing requests, logs, export bundles, telemetry or untrusted pages. Avoid leaking private source URLs. Verify redirects and source integrity; handle aborts and errors safely.
- REDOWN's conflict default is **KEEP BOTH**. Google Drive identifies files by Drive IDs and permits duplicate names. Never destructively overwrite an existing file as the default.
- After upload, record and verify the Drive file `id`, name and parent folder, and compare size/checksum when available. Distinguish `completed`, `failed`, `cancelled`, `blocked` and `uncertain`; do not mark success from a local fetch alone.
- Return a safe **Open in Google Drive** link. Record the correct provider and destination in REDOWN history.
- Required first tests: a public PNG and PDF using real bytes sent **through Chrome** to the test user's `My Drive/REDOWN` folder. Inspect binary integrity, progress and whether a persistent local file was created.
- **No change whatsoever to the existing Cloudflare R2 TRUE REMOTE route.** The two transport models are intentionally different and must never get conflated.


### D. Preserve existing REDOWN behavior

- The Cloudflare R2 route must remain functional. No regressions to the main Shelf, Explorer, preview/lightbox navigation, service worker startup/fallback, saved settings, menus, history, or bucket activation.
- The V3 right-click menu should contain **REDOWN → Google Drive → REDOWN** when ready. A disconnected destination can offer a connection action, but must never navigate to Dashboard Home and falsely imply a save occurred.
- Do not expose implementation machinery in customer-facing copy or modify `thanks-cohn/redown-website`. Product copy should focus on the accurate user outcome: **"Save supported web files to your Google Drive without saving a permanent copy to your computer."** Distinguish this browser-mediated Drive path from the TRUE REMOTE R2 path in any user-facing explanation of how transfer types differ.
- The repository is currently public. Treat all committed text and code as publicly visible; do not commit sensitive credentials, private architecture notes or unpublished deployment details.

## Test and acceptance requirements

Automated tests must cover at least: authorized Testing-mode login; denied/cancelled login; 401/reconnect and revoked scope; account isolation; manifest extension ID/client mismatch; folder create and reconnect reuse; race/duplicate prevention; public PNG and PDF; correct destination folder; KEEP BOTH; real Drive response parsing; upload interruption/ambiguous status; 403/429/5xx; ordinary MV3 worker restart; URL redirect/safety restrictions; and preservation of the V3/R2 boot/right-click paths.

**Critical invariant test (corrected):** For Google Drive, **file bytes MUST pass through an authorized browser/extension transfer context** and reach the Google upload API unchanged. A bounded buffer or stream is valid; a permanent file written to Downloads or disk is not the normal path. Assert there is no `chrome.downloads.download` call or persistent file creation in the successful browser-mediated flow. Validate upload chunks, size, MIME type, failure/abort and accuracy of the destination receipt. Browserless mocks do not prove real Chrome behavior.

**Required real-owner acceptance (mark BLOCKED until credentials/test user exist):**

1. Install the actual REDOWN candidate under its intended extension ID in a clean Chrome profile.
2. Use the owner's Google account, which was added to the OAuth Test users list. Connect without any Cloudflare connection.
3. Confirm **REDOWN** appears in My Drive once and only once.
4. Right-click a disposable public PNG, choose **REDOWN → Google Drive → REDOWN**, then verify the actual content and file ID in Drive.
5. Repeat with a disposable public PDF. Confirm the original file contents and accurate Drive size/checksum evidence where possible.
6. Restart Chrome and reconnect. Confirm the same folder is reused and a new save works.
7. Revoke Google Drive permission and verify REDOWN shows a clear recovery path.
8. Verify the **browser-mediated** transfer relayed the real bytes through Chrome, did not create a permanent file in Downloads, and did not provision or use a separate server-side file relay.

Record exact files modified, commits, test commands/results, a real browser/provider evidence matrix, any required one-time owner action, and remaining limits. Do not claim OAuth production verification, Google approval, or Chrome Store acceptance.

## Source-of-truth references

- Google Drive scope classification: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Google Drive folders: https://developers.google.com/workspace/drive/api/guides/folder
- Google Drive uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Google Drive files/create: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
- Chrome extension identity API: https://developer.chrome.com/docs/extensions/reference/api/identity
- Chrome extension OAuth manifest: https://developer.chrome.com/docs/extensions/reference/manifest/oauth2

**Done means an implemented and tested end-to-end slice, not merely a written plan.** If live account access or test configuration is missing, deliver working code/tests, state the precise blocker, and hand the owner the next setup action without fabricating PASS.
