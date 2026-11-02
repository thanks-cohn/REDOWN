# REDOWN V3 — P0 OneDrive OAuth, One-Click Save, and STRICT Shared-Menu Isolation

**Repo:** thanks-cohn/REDOWN
**MANDATORY branch:** codex/v3-parity-first-reconstruction
**Priority:** P0 (functional OneDrive integration), P0 (zero cross-provider menu regression)
**Status:** Owner-directed IMPLEMENTATION REQUEST, not implemented or tested by this document.
**Execution:** inspect actual head → record baselines/checkpoints → implement in small isolated steps → test and prove non-interference → document findings → commit and push.

**DO NOT STOP AFTER AN AUDIT OR WRITE A NEW ENGINE.** Implement OneDrive only to the extent the actual platform works, report any OAuth/browser/API blockers precisely, and leave the existing functioning providers untouched.

## 1. Exactly what the owner wants

REDOWN already has Cloudflare R2, Google Drive, and Dropbox integration. Add OneDrive as the FOURTH provider to the one REDOWN native Chrome context-menu root and one Shelf:

    REDOWN
      Cloudflare            (existing, no behavior change)
      Google Drive          (existing, no behavior change)
      Dropbox               (existing, no behavior change)
      OneDrive              (NEW, directly below Dropbox)
      [existing management controls; remain last]

And on the Shelf under "YOUR SPACE / TRUE REMOTE", show OneDrive directly BELOW Dropbox and Google Drive with the same first-class connected-provider controls. The OneDrive connection must NOT create an extra toolbar, an independent REDOWN menu, or a REDOWN folder in OneDrive.

**One-time authentication:** A user who is not connected sees a clear "Log in to OneDrive" action in Shelf/native menu. User authenticates via Microsoft's real consent flow. Show verified connection status and account identity; support disconnect/reconnect and safe expiry recovery.

**After login:** A ONE-click native REDOWN → OneDrive action must begin saving the right-clicked eligible web object to the signed-in user's actual OneDrive ROOT, without another chooser or a new visible REDOWN transfer tab/page/window. No automatic folder creation. Opening the external Microsoft OAuth login UI when user explicitly connects is allowed; silently creating another visible transfer page for each save is not the product goal. A Shelf open-OneDrive link is allowed as an explicit action, not as an upload prerequisite.

**Keep Both is DEFAULT:** never silently overwrite a same-named existing file. Use the OneDrive/Microsoft Graph supported conflictBehavior=rename for upload sessions where appropriate, retain and display the actual resulting filename.

**Truth:** If Microsoft Graph/browser security cannot fetch some website URL, or if the no-visible-page approach cannot safely guarantee a transfer, report a typed actionable failure. Do not fabricate an upload, open a transfer page behind the owner's back, download to the local Downloads folder, or imply universal TRUE REMOTE. Cloudflare R2 TRUE REMOTE remains its own independent pipeline; OneDrive may be browser-mediated behind the scenes without user-facing transfer pages when technically supported.

## 2. Extremely strict non-interference / native menu authority (OWNER EMPHASIS)

**MENU REGISTRATION IS VITAL. THIS ADDITION MUST NOT INTERACT WITH THE OTHER ENGINES.**

- There is EXACTLY ONE context-menu root, ONE authoritative menu composer/registration pipeline and ONE authoritative chrome.contextMenus.onClicked dispatcher, already in extension/background.js. OneDrive gets a provider-local declaration/adapter, never a second context-menu writer, second root, second click listener or its own removeAll/rebuild engine.
- Keep extension/right-click-v3.js, extension/right-click-current.js, extension/nested-locations.js, extension/destination-config.js, V3 Settings/editor and existing Cloudflare R2 Worker/auth/transfer engines READ-ONLY. Do not "improve", refactor, reformat or change their behavior as a side effect of adding OneDrive.
- Treat extension/google-drive-* and extension/dropbox-* as READ-ONLY, including Google Drive's existing REDOWN folder, OAuth flow, and transfer tab (do NOT change Google behavior in this OneDrive task), and Dropbox's root, queues and OAuth. Do not reuse their credentials, state, menu IDs or save actions.
- Existing extension/google-drive-menu.js has a Google fragment/composer AND a Dropbox-specific composeSibling helper hard-coded to provider:dropbox. **DO NOT use this Dropbox-only branch as a shortcut for OneDrive, do NOT widen its acceptance rules in a way that could break Google or Dropbox, and do NOT add OneDrive by mutating the Google or Dropbox fragment.** Instead add an isolated RedownOneDriveMenu.fragment(state,root), owns(id), revision(state), obsolete(ids) and a validated, additive composer (or minimally extend the ONE shared caller in background.js using a provider-neutral validation seam if tests prove equivalence). Existing Google/Dropbox composers run unmodified.
- Compose in stable parent-before-child order after the ENTIRE Dropbox provider subtree, after Google and Cloudflare, before shared Management controls. Use exclusively owned stable IDs: provider:onedrive, provider:onedrive:connect, and any provider:onedrive:* child IDs actually needed. Keep other native IDs/parents/titles/routes and sibling order unchanged.
- OneDrive menu states: disconnected → non-clickable provider parent + clickable LOGIN child; connecting → safe clearly labeled state; connected AND verified writable ROOT → OneDrive direct SAVE LEAF with no extra click in Simple, same provider-local Home-last convention if actual additional selectable OneDrive targets become supported in later versions. Never turn Cloudflare, Google, Dropbox or OneDrive into a submenu because ANOTHER provider was connected. Do not invent folder enumeration/Narrow/Depth capabilities if not proven.
- NO new fallback to Dashboard on a OneDrive save click. Provider-local "Home" (if ever introduced) means default SAVE DESTINATION and must never be confused with REDOWN Dashboard Home. Use exact menu IDs, not labels, and scope all paths to provider=onedrive + account/tenant/drive identity.
- A click on OneDrive is intercepted by exact OneDrive owns(id) in the EXISTING onClicked handler before any Cloudflare/V3 resolution, then dispatches ONCE to OneDrive. Existing Google/Dropbox/Cloudflare paths remain byte-for-byte equivalent in behavior. Unknown/stale OneDrive child IDs fail closed; cannot fall into V3 as a Cloudflare or Google save.
- OneDrive state revision participates ONLY in the existing menuApplicationKey/reconciliation calculation and the existing serialized rebuildMenus/reconcileMenus routine. Storage state changes trigger only the existing rebuild path. No concurrent rewriters, duplicate listeners, removeAll, accidental parent deletion, false "Applied" receipts or silent partial menu replacing full menu. If OneDrive's fragment is invalid, the original valid Cloudflare/Google/Dropbox menu MUST survive unchanged and a typed OneDrive error is recorded.
- New OneDrive cannot remove any previously registered item via obsolete() except an OWNED OneDrive ID, and cannot reorder or create Google/Dropbox/Cloudflare children. When OneDrive disconnects, only its own native node transitions.
- Handle Chrome MV3 service worker stopped/woken, install/update/cold start, active auth, stale/revoked auth, rapid state changes, repeated Settings Apply, mode switch, large existing native menus, and a provider failing independently. No hidden registration races or duplicate saves.

**REQUIRED PROOF:** Snapshot exact native menu ID/parent/type/title/order and click-routing before and after OneDrive under 0/1/2/3/4 provider connection scenarios and Simple/Nested/Narrow/Depth. Assert that all preexisting entries and all preexisting right-click routes are unchanged (except unavoidable new positions from inserting ONE new provider). Simulate a bad OneDrive fragment, OAuth failure, expired token, incomplete root verification, and MV3 restart: Google/Dropbox/Cloudflare still operate with identical routes. All these tests must pass before claiming P0 acceptance.

## 3. Existing branch implementation and normative references to inspect first

Read, without rewriting:
- extension/background.js: ROOT_MENU_ID, buildMenus() -> finish(), menuApplicationKey(), rebuildMenus(), reconcileMenus(), native receipts, onClicked, existing provider dispatch / storage change listeners.
- extension/google-drive-menu.js (Google compose + Dropbox-only composeSibling), extension/dropbox-menu.js, extension/google-drive-provider.js, extension/dropbox-provider.js, extension/dropbox-auth.js, extension/dropbox-api.js.
- extension/shelf.html, extension/shelf-google-drive.js, extension/shelf-dropbox.js, extension/shelf.css, extension/manifest.json, extension/service-worker.js, extension/boot.js, extension/history-archive.js and History receipt integration.
- NEED_TO_DO/CODEX/logic-tables.md, NEED_TO_DO/CODEX/Explanation.md, NEED_TO_DO/11012026.md.
- docs/requests/2026-11-01_P0_DROPBOX_OAUTH_ONE_CLICK_RIGHT_CLICK_SAVE.md and docs/requests/2026-11-01_P0_GOOGLE_DRIVE_DIRECT_SAVE.md. Those are reference patterns; OneDrive differs in Microsoft OAuth/Graph and no auto-folder target.
- Existing tests and snapshot fixtures. Record initial head commit and hashes/checkpoint for protected source modules, and a working baseline menu matrix before any change. Do not assume old documents supersede the newer owner direct-save/Home-last contract.

## 4. Microsoft Entra registration ALREADY completed by owner

Application name: REDOWN
Application (client) ID (PUBLIC, safe to embed): a8e034a8-6462-4022-b3f3-a79ffb6b1b84
Supported account types: "Accounts in any organizational directory and personal Microsoft accounts" (multitenant + personal).
Registered redirect URL, currently under **Single-page application (SPA)**:
https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/onedrive
Chrome extension stable ID: mkadkgpekmkknfbniacdlmgikihjjepf
Delegated Microsoft Graph permissions granted/configured for consent: Files.ReadWrite, User.Read.
Publisher domain redown.online verified with Microsoft.
Home: https://redown.online
Privacy: https://redown.online/privacy.html
Terms: https://redown.online/terms.html

Do not create another Microsoft app, ask for a client secret, embed a client secret, or change the Chrome extension ID/key. The public client ID and callback above are authoritative for the current registration.

**P0 AUTH FEASIBILITY GATE BEFORE WIDESPREAD IMPLEMENTATION:** Microsoft treats SPA redirect code redemption differently from native/public-client/browser-extension flows; SPA token exchange typically requires an Origin header and appropriate CORS context, and a token request without the expected Origin may be rejected. Confirm the REAL Chrome extension + chrome.identity.launchWebAuthFlow + Microsoft authorize/token PKCE code redemption behavior using this exact registered SPA redirect and extension origin. Do not assume redirect acceptance proves a working token exchange. Record HTTP status and sanitized AADSTS error codes. If it fails because the SPA/native redirect platform type is incompatible, STOP changing production auth assumptions and give the owner exact minimal Entra platform/redirect configuration steps grounded in Microsoft docs; retain the SAME extension ID and client ID. Never put a secret in the extension or sneak in a server-side credential relay. Continue non-auth isolated work only when technically safe and report the real blocker.

Use authorization code + PKCE S256, strong verifier and state, exact callback validation, one-time code use, login cancellation, explicit request for offline_access where supported, refresh/reconnect handling, minimal Graph scopes and token persistence appropriate for a Chrome extension. State and tokens must be provider-namespaced and protected from content scripts, rendered pages, history logs and arbitrary origins. Keep the authorization browser flow interactive only when user explicitly initiates connect; do not re-prompt on every right click or background boot. Support both personal and work/school accounts, including legitimate enterprise/admin-consent restrictions, with honest errors.

Prefer a provider-local auth file (extension/onedrive-auth.js), API file (onedrive-api.js), provider/queue controller (onedrive-provider.js), pure menu fragment (onedrive-menu.js), and Shelf controller/styles (shelf-onedrive.js, onedrive-controls.css) with a minimal shared composition/dispatch/storage listener import.

## 5. Save to user's OneDrive ROOT, no REDOWN folder

- Verify connection identity via Graph /me, /me/drive or matching supported delegated endpoints. Store stable provider/account/tenant/drive identification. Do not assume that a successful OAuth token means the OneDrive drive is provisioned, writable or has space. For work/school users, handle missing/unprovisioned drives, admin restrictions, 403/404, expired access and quota honestly.
- Initial default destination is the authenticated user's actual OneDrive root (Graph drive/root), without creating any REDOWN folder, or adopting Google's Google Drive folder behavior. Do not access other users' drives or shared drives without separate explicit supported features.
- Right-click any eligible link/image/video/audio/page where the source is a supported retrievable file. Store the clicked pageUrl, srcUrl, linkUrl, frameUrl and actual source used when available, not invented provenance.
- Source URL is not a guaranteed file: validate HTTPS/HTTP policy, file type and actual bytes, redirects, cookie/auth gating, signed URL expiry, user authorization/permission, CORS/host restrictions, errors, non-file pages and ambiguous filenames. Never treat HTML error responses as a successfully saved image/video. Avoid blindly fetching private/internal endpoints based on untrusted webpage source or passing user tokens to origin websites.
- No arbitrary tiny 32 MiB source cap added by REDOWN; inspect supported Graph and browser limits and use bounded-memory streaming/resumable processing for realistic large transfers. Where unsupported in a particular context, show the real platform/permission limitation rather than promise "any size" or exhaust RAM.
- Use Microsoft Graph small-file content PUT only where supported and safe, and Microsoft Graph createUploadSession for larger files. For upload sessions: conflictBehavior="rename" (KEEP BOTH), correct root path, sequential ranged PUTs and a known total length, non-final range chunk size a multiple of 320 KiB, range sizes < 60 MiB, bounded retries/backoff, expiration recovery, cancellation, final metadata readback/proof. Respect 429/Retry-After, 401 reauth once with controlled retry, 403 policy, 404 drive/session, 409 conflict, 507 quota and opaque failures. Always verify the returned item ID, actual destination, filename and size before a confirmed receipt.
- IMPORTANT: Microsoft is transitioning aspects of OneDrive for Business/SharePoint preauthenticated upload URLs. Do not hard-code the assumption that every uploadUrl is forever a no-Authorization preauth URL. Check the current official Graph and Microsoft 365 developer guidance for uploadUrl host authorization, tenant/SPO tokens and cutoff timing; handle only verified supported modes, never send Graph bearer tokens to arbitrary redirect/upload origins.
- No tab/window/Downloads used for the transfer. Use supported MV3 extension context with a bounded queue, checkpointing/ID correlation, transfer lifecycle, and service-worker suspension/restart recovery as technically feasible; do not promise true resumability if source bytes/source streaming cannot be restored. No silent retry that duplicates a saved file. Always permit cancellation when possible, avoid spinning or leaking signed upload URLs.
- Keep distinct history fields providerKind=onedrive, account/tenant/drive/item IDs, requested source and actual source, completed/failed/blocked/uncertain/interrupted status. On restart or uncertain final commit, reconcile with Graph before any retry. Do NOT invent successful GO TO, public URLs or Explorer support absent a real OneDrive adapter for those features.
- Real REDOWN user-facing no-new-tab UX: single native click → upload starts invisibly behind the Shelf with real progress/status → verified file in root → History receipt. User should not need a special onboarding folder, a second save click, or a separate page to keep transfer running.

## 6. Shelf order and appearance

In the existing Shelf's "YOUR SPACE / TRUE REMOTE" area, the complete vertical order must be Google Drive → Dropbox → OneDrive. Do not move or restyle other provider controls. OneDrive gets own status (Checking, Connect, Connected, Reconnect, Transfer in progress, Failure), connected Microsoft account identity, Open OneDrive (explicit user action), Disconnect, and Cancel queue where relevant. No auth on mere Shelf display. Only load provider CSS/scripts via same safe existing Shelf pattern. Verify responsive narrow Shelf, dark/neon/porcelain themes, focus/keyboard and stable first paint.

## 7. Tests and acceptance: failures MUST NOT bleed into other providers

Required automated tests using real menu plan/registry mocks plus installed Chrome as possible:
1. Baseline and after: Cloudflare leaf/submenus, Google actions and REDOWN Google folder untouched, Dropbox direct root save untouched. OneDrive inserts ONLY immediately after full Dropbox subtree.
2. Provider-local namespace: all OneDrive IDs parent-owned, unique, never dispatched to Cloudflare/Google/Dropbox. One onClicked handler and one contextMenus registration owner. Exactly ONE transfer per right-click.
3. Connected/disconnected/reconnect state changes, multiple Microsoft accounts switching, refresh errors, startup, worker termination, rapid menu rebuild and old/unknown IDs. OneDrive failures cannot remove or redirect existing menu items or falsely mark them Applied.
4. Simple vs Nested/Narrow/Depth and 0-4 providers: V3 state/config/serialized CURRENT/working/backups unchanged; still valid Cloudflare/Google/Dropbox entries remain, even when OneDrive fragment is invalid, app login fails or root is not writable.
5. OneDrive personal AND work/school auth test, with explicit consent, PKCE callback validation, token exchange and refresh, no client secret; include Entra SPA redirect/Origin failure reproduction gate.
6. Real small image and file, larger file through upload session, duplicate Keep Both, valid root location/filename, file metadata read-back, quota/403, 401 refresh, 429, cancel, intermittent network, service-worker restart and a private/rejected source. No unsupported success claims.
7. Verify no new REDOWN transfer tab, popup, local Downloads, stray folders, unsolicited public file sharing or automatic external upload. Authenticate via Microsoft only on explicit user consent.
8. Screenshot/record installed-Chrome menu order and Shelf connection controls, real redown.online consent branding when shown, and truthful History receipt. If live testing is unavailable, label it NOT_TESTED with exact reproduction steps, rather than PASS.

**Stop/fail-closed rule:** If the minimum P0 proof that existing Cloudflare, Google and Dropbox menu behavior is unchanged fails, do NOT present this as ready for release. Repair the isolated composition or roll back the OneDrive addition only. Do not "fix" other providers by rewriting them.

## 8. Deliverable / owner handoff

Commit to exact branch with:
- Source changes only where needed for the new OneDrive adapter and the ONE shared registration call site; a safe rollback.
- Automated tests + test receipts showing preserved old provider behavior and truthful OneDrive results, and any NOT_TESTED real-Chrome cases.
- Documentation explaining exact existing Microsoft configuration, OAuth token exchange outcome, any Entra changes the owner must make, host permission security, provider root semantics, upload limitations, disabled/unavailable states, and real transfer guarantees.
- Precise before/after file list; SHA-256 or comparable file equality checks for protected files; no changes to V3 engine, Cloudflare/Google/Dropbox implementations, or their account credentials.
- Commit hash, branch, remaining blockers, and explicit statement whether ONE-click OneDrive upload to root is genuinely working.

Official technical references for Codex to verify against live docs:
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
- https://devblogs.microsoft.com/microsoft365dev/pre-authenticated-tempauth-urls-are-retiring-move-to-microsoft-entra-id-tokens-before-april-1-2027/

**Do not falsely claim a previously successful OneDrive login or real upload; neither has yet been shown to work.**
