# REDOWN V3 — P0 Dropbox OAuth + One-Click Native Right-Click Save

**Repository:** `thanks-cohn/REDOWN`  
**Mandatory implementation branch:** `codex/v3-parity-first-reconstruction`  
**Owner request date:** November 1, 2026  
**Priority:** P0 provider integration and non-interference  
**Execution:** INSPECT → BASELINE/PRESERVE → IMPLEMENT → REPRODUCE/FAULT-TEST → VERIFY → DOCUMENT → COMMIT → PUSH.  
**Status:** OWNER IMPLEMENTATION REQUEST. This document is NOT evidence that Dropbox has been implemented or live-tested.

**DO THE IMPLEMENTATION. Do not stop after a proposal, UI mock, scaffold, or design audit.**

## 1. The owner's exact desired behavior

After one-time authorization, the user right-clicks an eligible web file/object and clicks:

```text
REDOWN
├── Cloudflare       (existing; unchanged)
├── Google Drive     (existing; unchanged)
└── Dropbox          (NEW: click = immediate save to connected Dropbox root)
```

**Dropbox must be the next provider, immediately BELOW Google Drive, at the SAME provider level under REDOWN. It must NOT be inside Google Drive's submenu.** Put any existing REDOWN management/navigation controls in their established final position.

**The right-click must directly start saving after login, without opening a new tab, transfer page, external download window, separate chooser, or REDOWN Dashboard.** Chrome's **one-time OAuth consent window** is the only permitted user-facing external authentication UI. There is no requirement to keep the Shelf, a transfer tab, or any other visible page open while saving.

Before connection: `REDOWN → Dropbox → Log in to Dropbox…` (or an equally obvious native setup action) starts the real PKCE OAuth login, not a Dashboard link. When consent completes, if the original right-click file remains safely routable, resume that explicitly user-requested pending save once; do not accidentally double-save. If login started from the Shelf instead, the next `REDOWN → Dropbox` click directly saves.

After verified connection with an unambiguous writable Dropbox root: **`REDOWN → Dropbox` is a direct, actionable leaf in Simple mode, not a submenu containing another "Save" click.** In future, if Dropbox gains configured extra destinations, use the canonical provider convention: configured save choices, one native separator, **Home LAST** as the exact Dropbox default save; provider parent is then non-actionable. Do not invent destination folders just to justify a submenu.

**Shelf requirement:** Place a new attractive **Connect Dropbox / Dropbox connected** control IMMEDIATELY BELOW the existing Google Drive connection control in the Remote Cloud / Your Space area, consistent with REDOWN's Shelf theme, compact sizing, responsive layout, accessibility and keyboard focus. Do not move or redesign Google Drive or the Cloudflare hero. Show connected/reconnect/connecting/error states; offer explicit disconnect and minimal clear status. Once connected, use "Open Dropbox" if a link is helpful; never say "Open REDOWN folder" because no such folder is created.

**NO AUTOMATIC FOLDER CREATION.** The Dropbox application must already be configured by the publisher as **Scoped App (Full Dropbox)**, not App Folder. The initial exact target is the authenticated user's verified Dropbox root (`/`). Do not create `/Apps/REDOWN`, `/REDOWN`, a hidden holding directory, or any per-transfer folder. Do not change Google Drive's separate current folder behavior as part of this request.

**Conflict behavior:** KEEP BOTH by default. Uploads never silently overwrite existing Dropbox user content. Use the Dropbox API's add/autorename behavior and verify the eventual name/path. Repeated save clicks should not misreport a prior success as a new success.

## 2. Immutable architecture / preservation gate

**DO NOT TOUCH, REWRITE, REFACTOR, REPLACE, REFORMAT OR MIGRATE THE V3 ENGINE.** The goal is a thin, isolated Dropbox adapter using the already existing shared native registration path.

- `extension/right-click-v3.js` is **READ-ONLY**. Preserve `project()`, `resolve()`, modes, existing menu IDs, destination identities and projection semantics, Simple/Nested Narrow/Nested Depth/Level 1–10, Cloudflare routing and right-click editor behavior byte-for-byte.
- Also protect `extension/right-click-current.js`, `extension/nested-locations.js`, `extension/destination-config.js` and the current setup/editor engine files. Do not mutate the Cloudflare V3 state, `rightClickV3`, `rightClickV3Presentation`, `rightClickV3LevelScopes`, `rightClickV3Inventory` or activated bucket records.
- **Cloudflare TRUE REMOTE** API/worker/upload/R2 provisioning and OAuth remain untouched. **Google Drive's** `google-drive-*` modules, browser-mediated transfer tab, OAuth, folder strategy, and existing menu destinations remain untouched. Fixing/changing their behavior is a separate request.
- No second top-level `REDOWN` native menu, no alternate `chrome.contextMenus` writer, no second authoritative `onClicked` listener, no provider-specific copy of the V3 engine, no new engine selector.
- `extension/background.js` already owns the single REDOWN root, serialized native menu reconciliation, menu generation/apply acknowledgment, and native click dispatch. The new provider must plug into that **existing single ownership point**. Change only the smallest additive lines there, with a limited diff and preserved existing behavior.
- The existing `extension/google-drive-menu.js` defines `RedownGoogleDriveMenu`, namespaced Google IDs, a `fragment`/`compose` pattern, and validates ownership/parent-first placement before the one writer. **Use/reuse its existing shared menu composition/registration authority.** If necessary, make a minimal provider-neutral additive composer hook at that boundary; do not give Dropbox its own registrar and do not fork the current Google implementation into a second writer.
- Create provider-local files/modules, for example `extension/dropbox-auth.js`, `dropbox-api.js`, `dropbox-menu.js`, `dropbox-provider.js`, `shelf-dropbox.js`, and minimal style additions. Actual names may follow project conventions. Dropbox owns **only** `provider:dropbox` and descendant native IDs, `dropbox:*` storage/transfer/connection keys and Dropbox API routes.
- Compose Dropbox **after the complete Google Drive provider subtree** and before existing management controls. Never let Google or Dropbox child IDs share parent IDs, routes, account or token state. When Google is disconnected, the Dropbox position must still remain after Google's provider entry.
- Validate provider fragments against duplicate IDs, alien parent IDs, cycles/orphans, capacity, stable order, provider ownership and correct namespaced actions. Invalid Dropbox fragments must fail closed without removing existing V3/Google menu items.
- Preserve the native menu after browser restart/service-worker termination, reinstallation/update where supported, and mode changes. State changes trigger existing serialized reconciliation, **not** live network/menu construction at right-click time.
- A Dropbox native click must dispatch by exact `provider:dropbox` ID and verified Dropbox connection identity **before** any Cloudflare V3 resolver can interpret it. Unknown `provider:dropbox:*` IDs must fail closed; never be treated as Cloudflare saves or Dashboard navigation.
- Include Dropbox connection/revision in the menu's existing bounded application-key/reconciliation freshness calculation without altering V3 data inputs. Acknowledged Chrome registration must be evidence of what is installed; label/UI changes alone are not proof.
- Provider-local states, CURRENT/backup/JSON/JSONL if applicable, History receipts, menu target IDs, OAuth and permissions must be isolated by exact provider + account IDs, not just "Dropbox" display text.
- If implementing the feature **requires a protected V3 or Cloudflare engine edit**, do not violate the gate. Isolate the blocker with reproducible evidence and report it explicitly.

**Before editing:** capture the head commit, the protected file SHA-256 hashes, existing V3 native menu plans, all Cloudflare canonical account/bucket/prefix click routes, and Google provider routes. **After editing:** identical protected hashes and identical original routes/plans when filtering out only Dropbox-owned IDs; provide a small, auditable diff for shared glue.

## 3. Existing repo references / required reading

Read first:

1. `AGENTS.md` and its diagnostic/runbook obligations.
2. `NEED_TO_DO/CODEX/logic-tables.md` and `NEED_TO_DO/CODEX/Explanation.md`. These are the latest normative menu behavior. In particular: provider leaf when one verified default; extras, separator, Home LAST when expanded; Home is **SAVE**, never Dashboard navigation.
3. `docs/CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md`, respecting November 1 supersession.
4. `docs/requests/2026-11-01_P0_GOOGLE_DRIVE_DIRECT_SAVE.md` and `docs/GOOGLE_DRIVE_DIRECT_SAVE.md` for proven provider isolation, menu composer/writer and preservation patterns.
5. `extension/background.js`, `extension/google-drive-menu.js`, `extension/google-drive-provider.js`, `extension/shelf-google-drive.js`, `extension/shelf.html`, `extension/manifest.json`, and relevant tests.

**Do not interpret old Google "REDOWN folder" naming as authority to create one in Dropbox.**

## 4. Dropbox developer app / OAuth configuration

Publisher has created a **Full Dropbox Scoped App** called REDOWN with the following public identifiers:

```text
Dropbox App Key (PUBLIC client identifier): h0mbahfonf0zkul
REDOWN Chrome extension ID: mkadkgpekmkknfbniacdlmgikihjjepf
Registered Chrome identity redirect:
https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/dropbox
```

App Secret is **NOT** part of the extension. NEVER request, embed, commit or transmit the Dropbox App Secret. Do not embed test-generated access tokens.

Publisher selected these scopes: `account_info.read`, `files.metadata.read`, `files.content.read`, `files.content.write`. Do not add `account_info.write`, permanent delete, sharing management, metadata-write, team/OpenID scopes or broad unnecessary permissions without a separately justified feature and explicit owner consent.

- Implement Dropbox OAuth 2.0 **Authorization Code + PKCE (S256)** via `chrome.identity.launchWebAuthFlow`, with a cryptographically random verifier/challenge/state, exact redirect validation and token exchange. Use `chrome.identity.getRedirectURL('dropbox')`; verify that the actual built/runtime extension ID matches the registered redirect. No client secret.
- Request `token_access_type=offline` so a refresh token is provided. Refresh short-lived access tokens noninteractively; user interaction only when initial approval, reauthorization or revoked consent is genuinely required.
- Do not conflate the Google `manifest.oauth2` settings with Dropbox OAuth; Dropbox has its own app key, authorization URL, token endpoint, scopes and account identity.
- Validate `state` and authorization response; reject mismatched redirect, canceled consent, expired attempt, code replay, token errors and incorrect account. No arbitrary redirect acceptance.
- Persist the least material necessary in extension-only trusted storage; ideally access tokens in memory/session with securely scoped refresh-token storage, restricted against content-script access. Never put a token in URL fragments, content scripts, ordinary history receipts, debug logs or page requests. Support explicit disconnect, auth revocation/reconnect and account-switch without cross-account transfer.
- On a previously authorized install, reopening the Shelf must show verified/recently checked connection state without flashing login or opening the OAuth window. A stale refresh token is never "Connected" just because one exists.
- Provider readiness requires verified account identity plus an authorized, unambiguous writable root destination, not merely OAuth success. Fail closed on root/namespace restrictions; do not auto-create a folder as a workaround.
- Test developer-only access and show production approval as a **separate publisher rollout prerequisite**, not a consumer login blocker or false claim of production approval.

## 5. Real one-click Dropbox saving, NO VISIBLE TRANSFER PAGE

**This is the primary acceptance criterion, not optional styling.**

- After login, clicking the native leaf `REDOWN → Dropbox` **starts the file transfer immediately**. No `dropbox-transfer.html` tab, no Google-style keep-this-tab-open page, no browser downloads UI, no Shelf reopening requirement, no separate save dialog for the default root, no manual queue confirmation.
- An OAuth popup during explicit first login is allowed. Normal authenticated saves **must not** open a new tab or window. Use an extension background-supported transfer coordinator and the minimum standards-compliant invisible execution mechanism only if it is genuinely needed and supported by Chrome. If an offscreen document is considered, document the legitimate `chrome.offscreen` reason, permissions and lifecycle; do not abuse it to fake permanent background lifetime.
- **Manifest V3 lifecycle is real:** service workers can be suspended, network calls time out, and extension updates/restarts interrupt work. Design durable, bounded transfer-job checkpoints with resumable Dropbox upload sessions where possible, background retry/backoff within provider rules, crash-safe ownership, and an honest `interrupted/uncertain` state. Do not claim unlimited unattended execution; test suspension/restart and do not silently duplicate saves. The absence of a visible page is a hard UX gate, not license to fake reliability.
- Transfer source bytes from authorized, fetchable web source URLs to Dropbox via network streaming/chunking using bounded memory. **Never call `chrome.downloads.download`, write a permanent local download, stage files in R2, send Dropbox tokens to a third-party/Cloudflare relay, or pass tokens to page origins.** Browser networking may process transient bytes; describe it accurately as browser-mediated where applicable, not equivalent to Cloudflare server-side TRUE REMOTE.
- Remove arbitrary REDOWN-specific 32 MiB or similar upload caps. Support Dropbox `/2/files/upload` when appropriate and `/2/files/upload_session/start`, `append_v2`, `finish` for larger transfers. Use provider-supported chunk limits, bounded buffers, offset/checkpoint validation, resumability and server errors. The Dropbox session API has per-request limits and a provider file-size ceiling of roughly 2 TiB; **this is not a guarantee that arbitrary huge external URLs are transferable in one Chrome session**. No unsupported "5 TB" claim.
- If network permissions, browser lifetime, source authentication, inaccessible redirects, blob URLs, signed URLs expiring, CORS, anti-hotlink, missing length, large unknown-length files or provider constraints prevent a save, report the actual condition without pretending success. Do not install an unwanted transfer-tab fallback. If an interactive permission grant is unavoidable, request it via an appropriate explicit browser/extension permission prompt, then resume only the original authorized operation. Avoid extra pages.
- Identify the correct source for context-menu link/image/video/audio/page actions; preserve original page/source/frame/link URLs in History when known, and do not silently save the HTML page instead of the clicked file. Include original filename/extension when trustworthy, validate destination path, and sanitize dangerous or ambiguous names.
- Use KEEP BOTH with Dropbox add/autorename semantics, without destructive overwrites. Capture definitive file ID, final path/name, size, revision, and any supported content hash. Verify success from Dropbox's response and where practical independent file metadata/readback. Only then report "Successful".
- Report started/progress/completed/failed/blocked/cancelled/uncertain through existing REDOWN Shelf/History/counter in a provider-tagged, human-readable way. No debug text leak. No "successful" increment until remote commit is verified; a refresh/retry must not increment twice.
- Enforce at-most-one active transfer per explicit click/job or a carefully bounded documented queue, protect against duplicate onClicked/retry/worker revival, and cancel safely. Do not silently drop an explicit subsequent click because a prior save was busy: either queue durably within a stated bound or give a clear, non-intrusive status and safe retry path without opening a tab.
- Authentication errors must never redirect to Dashboard Home. Saved account A's pending job must never run under account B's token. The native click should take a stable, validated source snapshot at click time.

**If Chrome/API restrictions make a particular invisible large-file scenario impossible, implement the maximum supported no-tab behavior, retain truthful error/uncertain states, and document the exact limitation and reproduction. Do not ship a fake background-success path or violate the no-visible-transfer-page rule.**

## 6. Shelf layout and state

The current Shelf source has a `.google-drive-control` block inside `section.overview`, after the `YOUR SPACE · TRUE REMOTE` eyebrow and before the headline.

Add a new Dropbox control **directly BELOW that Google Drive block**, not in Settings, not below Cloudflare, not in History. Follow existing Shelf styling and its chosen theme (Porcelain/Midnight/Neon), responsive widths, keyboard focus and accessible status announcements.

Expected states:

- Not connected: **Connect Dropbox** button. Clicking initiates real OAuth.
- Connecting: **Connecting to Dropbox…** with safe double-click suppression.
- Connected: **Dropbox connected** and, if useful, an **Open Dropbox** link. Do not suggest a generated REDOWN folder.
- Expired/revoked: **Reconnect Dropbox**. Never show false Connected on a revoked account.
- Transfer running: unobtrusive saving/progress status; Shelf can be closed.
- Transfer failed/uncertain: accurate recovery information in Shelf/History.

Preserve the existing Google button, its data and the Shelf's ODR/odometer, navigation, color schemes, status and Cloudflare section. No hero redesign or unrelated CSS refactor. A Dropbox icon can be bundled appropriately, with attribution and store packaging checks.

## 7. Native menu truth table and ordering (hard tests)

The owner means **click to save**, not a submenu that leads to a page. All normal connected Simple cases must have this semantics:

| State | Chrome native menu | Click result |
|---|---|---|
| Dropbox never connected | `REDOWN → Dropbox → Log in to Dropbox…` | Launch real OAuth; eligible pending clicked file can continue once safely authorized |
| Dropbox connected, one root default | `REDOWN → Dropbox` **DIRECT LEAF** | Save immediately to Dropbox root `/`, NO page/tab |
| Dropbox expired/revoked | Explicit reconnect/setup or safe fail-closed action | Never send to Cloudflare, Google or stale account |
| Dropbox connected, Google disconnected | Cloudflare, Google Drive, **Dropbox** | Dropbox remains after Google; no affected Cloudflare route |
| Dropbox disconnected, Google connected | Cloudflare, Google Drive, **Dropbox** | Google remains fully functional; Dropbox login does not change Google folders |
| Simple with future Dropbox extra destinations | `Dropbox → extras … separator → Home LAST` | Each exact destination saves; Home saves root |
| Nested Narrow/Depth selected for Cloudflare | Same original Cloudflare tree; Dropbox still independently available | No V3 mode or tree change |
| Rapid login/logout/service-worker restart | One REDOWN root; deterministic provider order | No missing/stale/duplicate menu rows |

Never introduce `REDOWN → Dropbox → REDOWN` as the normal connected path. Provider-specific folders are not a prerequisite to saving. Likewise never reinterpret the existing `redown-go-home` command as Dropbox's provider Home.

## 8. Verification, tests and evidence

Add focused reproducible automated tests, including:

1. Exact menu ordering, original Cloudflare + Google entries, Dropbox immediately **after Google's whole subtree**; one root, no duplicate IDs, all parent-first; management controls retain final placement.
2. Connect/disconnect/revoke account, invalid fragments, stale native ID cache, Chrome onStartup/onInstalled, worker restart, update/reconciliation and multiple rapid state transitions.
3. Simple direct actionable Dropbox leaf and no intermediate "Save" menu child. OAuth-only pre-connection login action. Future expansion with Home LAST consistent with normative contract.
4. Scoped OAuth PKCE state/verifier/challenge, offline refresh, app-key use, redirect equality, wrong extension ID failure, denial, stale/compromised response, account switch and secure storage/access boundaries.
5. **No new visible tab/window for any already-connected save**, even multi-chunk saves, retry, worker wake, and ordinary failures. Verify with browser tab/window spies and actual installed-browser validation where accessible. OAuth login window only when necessary.
6. Full Dropbox root target; no automatic ``/Apps/REDOWN`` or ``/REDOWN`` folder creation. KEEP BOTH/autorename, Unicode filenames, conflicts, empty/huge/unknown-length inputs and verified successful upload.
7. Dropbox upload-session offset, chunk/size rules, API 401/409/429/5xx, backoff, timeout, interrupted session, retry, cancellation, duplicate-click protection, correct existing-file behavior, and ambiguous commit verification.
8. Source-context extraction, origin permission behavior, OAuth vs source error separation, and no token leakage to source origins/logs/History.
9. Existing Google Drive transfer tab and folder function exactly as before; Cloudflare True Remote operations exactly as before; original V3 Simple/Narrow/Depth golden snapshots, original account/bucket/prefix resolution and current-state retention unchanged.
10. Shelf order Google **then** Dropbox, all visual themes/widths, keyboard focus, status announcements, History/GOTO/odometer, download count only after verified completion.

Follow `AGENTS.md` baseline diagnostics. Run relevant syntax/check/test scripts and focused existing Google, right-click-dispatch, V3, Chrome boot and packaging tests. If baseline unrelated tests fail, report exact baseline failures rather than weakening/skipping assertions. Where installed Chrome/provider credentials are unavailable, distinguish mock/synthetic tests from live Dropbox/OAuth/browser results. Do not assert live proof without testing.

Produce a concise implementation/verification report in `docs/` or `docs/verification/dropbox/`: before/after commit and protected SHA checks, source file inventory, route-menu diff, redacted test logs, real-browser test status, OAuth/transfer constraints, final changes and remaining blockers. Avoid tokens and sensitive names.

## 9. Completion gates

**PASS only if:**

- New Dropbox button appears immediately **below Google Drive** on the Shelf and real OAuth login works.
- Once connected and default verified, native **REDOWN → Dropbox** click **directly saves** to Dropbox root, without transfer tab/page or a forced new folder.
- Dropbox appears immediately after Google Drive in the same shared REDOWN native menu, using **the already existing single menu registration/writer**, no collision, no second engine and no separate native click listener.
- Existing Google Drive and Cloudflare workflows still operate; every protected V3/Cloudflare engine file has the same SHA as baseline and existing golden routes are preserved.
- Tokens and provider account identities stay isolated; conflict policy is KEEP BOTH; success/history has independently grounded remote verification and failure states are truthful.
- All feasible automated and installed-browser tests have evidence, with untested limitations named explicitly.
- Implementation code + report are committed and pushed to the requested branch. **A written plan without code is not completion.**

## 10. Final Codex response

Report: branch and commit SHA, files added/modified, exact UX/menu result, actual OAuth status, confirmed no-tab behavior, verified root/no-folder behavior, Dropbox upload/session tests, before/after V3 hashes, Google/Cloudflare regression results, installed Chrome/live provider pass/fail/not-tested counts, and links to the evidence.

**External authoritative references:**

- Dropbox authorization / PKCE / offline tokens: https://docs.dropboxapi.com/riviera/docs/get-started/authorization
- Dropbox upload sessions: https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload-session-start
- Dropbox append: https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload-session-append-v-2
- Dropbox finish: https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload-session-finish
- Chrome MV3 service-worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Chrome Identity API: https://developer.chrome.com/docs/extensions/reference/api/identity
- Chrome offscreen API: https://developer.chrome.com/docs/extensions/reference/api/offscreen
