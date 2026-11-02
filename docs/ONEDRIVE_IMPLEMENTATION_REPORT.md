# OneDrive staged integration — BLOCKED, not P0 accepted

Request: `docs/requests/2026-11-01_P0_ONEDRIVE_OAUTH_DIRECT_ONE_CLICK_ISOLATED_MENU.md`.
Branch: `codex/v3-parity-first-reconstruction`. Initial head: `db8916a46f6a1a04feca3489e6566582c8a86cbe`.

**Follow-up (November 1, 2026):** An isolated, explicitly triggered Microsoft OAuth/PKCE Chrome diagnostic has been added to the Shelf. It does not enable production OneDrive authentication, root uploads, or save actions. See [ONEDRIVE_OAUTH_DIAGNOSTIC.md](ONEDRIVE_OAUTH_DIAGNOSTIC.md) for the owner's live-browser test, sanitized outcomes and conditional Entra remediation. No real Chrome token redemption has been claimed yet.

**One-click OneDrive uploads are NOT working or enabled in this change.** This is the safe non-auth portion allowed by the request's feasibility gate, not the complete production integration. No successful Microsoft login, token exchange, refresh, root verification or OneDrive transfer is claimed. Do not release this as OneDrive support.

## Auth feasibility gate

Executed the existing isolated installed-Chrome smoke against the actual extension before implementation. Chrome 154.0.8037.57, Linux x64, derived the correct registered extension ID, then rejected `Extensions.loadUnpacked`:

> CDP_-32600: Loading of unpacked extensions is disabled by the administrator.

See `verification/onedrive/installed-chrome.json`. No policy bypass was attempted. There is no attached authenticated Microsoft browser session or Microsoft credential binding in this environment. Consequently the exact registered SPA redirect plus `chrome.identity.launchWebAuthFlow` plus Chrome token redemption **could not be exercised**. Token endpoint HTTP status: NOT_TESTED. Sanitized AADSTS code: NOT_TESTED. A documentation fetch or a fabricated authorization code would not establish code redemption feasibility.

The owner request explicitly says to confirm the real Chrome flow before widespread implementation, stop changing production auth assumptions if the platform is incompatible, and continue isolated non-auth work only when safe. This change therefore deliberately provides no production OAuth client or upload engine. A forged/stale `onedrive:state.phase=connected` cannot enable a save. Native connect reports `ONEDRIVE_OAUTH_NOT_VERIFIED`; Shelf explains the unavailable state on first paint and after an explicit click. Existing History is untouched; blocked staging actions produce no fake file receipt or GO TO URL.

## Implemented safe portion

- `extension/onedrive-menu.js`: pure two-entry, provider-owned declaration, strict additive validator, owned obsolete IDs and revision. Inserts after the entire Dropbox subtree. Invalid/throwing declarations preserve the valid original plan and record `ONEDRIVE_MENU_FRAGMENT_INVALID` separately from the shared native registration acknowledgement.
- `extension/onedrive-provider.js`: fail-closed dispatcher, exact Shelf sender validation, stale action rejection and namespaced status. No credential reads, token exchange, uploads, tabs, windows, Downloads or History writes. Disconnect removes only its own unused credential/state namespace; there is no active queue to cancel.
- `extension/shelf-onedrive.js`, `extension/onedrive-controls.css`: keyboard-native connect action and polite blocked status below Dropbox. No login or status request on display. Connected identity, Open OneDrive, Disconnect and Cancel UI are deferred until real authentication/queue support exists.
- `extension/background.js`: imports and adapter creation; additive composition after unchanged Google/Dropbox composers; revision in the existing application key; obsolete IDs in existing reconciliation; state changes through the existing rebuild path; OneDrive ownership interception in the existing single click dispatcher; exact Shelf message routing.
- `extension/shelf.html`: additive stylesheet, provider row and script. Existing Google and Dropbox control markup remains identical.
- `tests/onedrive.test.mjs`: preservation hashes, actual shared registry comparisons, routes, malformed fragments, blocked/stale state, concurrent rebuilds, restart, sender validation and Shelf interaction. The syntax target list includes the new JavaScript files. Two existing Shelf-order assertions now also require the OneDrive row before the original heading; other provider assertions remain in place.

No new menu writer, root, click listener, `removeAll`, registration engine, credential relay, client secret, Graph permission, source host grant or transfer page. `manifest.json`, extension key, all Google/Dropbox modules, V3, destination configuration, nested locations, shared Shelf CSS, boot/service worker, history archive and Cloudflare modules retain their checkpoint hashes (109 unchanged extension files; see `verification/onedrive/preservation.json`). The embedded Cloudflare Worker is unchanged; only provider seams in background.js changed. The shared registration routine remains the sole authority, including its existing serialized reconciliation and Chrome acknowledgements. A valid shared receipt acknowledges only the actually registered plan; the separate OneDrive error never claims OneDrive is applied or ready.

`verification/onedrive/before.json` contains the initial checkpoint and protected hashes. `verification/onedrive/menu-matrix.json` stores deduplicated exact before/after native entries, ordered IDs/parents/types/titles and V3 route results for 64 synthetic configurations (four presentations × sixteen provider connection masks). OneDrive connected flags are deliberately blocked states, not authenticated connections. This is mock registry/source proof, not installed Chrome proof or a claim that four providers are operational. Existing provider auth and upload tests remain independent mock proof.

## Existing Microsoft configuration and minimal next steps

Keep the owner's app/client ID `a8e034a8-6462-4022-b3f3-a79ffb6b1b84`, extension ID `mkadkgpekmkknfbniacdlmgikihjjepf`, redirect `https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/onedrive`, multitenant + personal accounts and delegated `Files.ReadWrite`, `User.Read`. Request `offline_access` during the future authorization-code + PKCE flow. No configuration change has been established as necessary; no Entra changes were made.

On an administrator-approved Chrome installation that permits this extension:

1. Record exact installed extension ID and callback from `chrome.identity.getRedirectURL('onedrive')`. Test in an isolated approved profile; never reuse another provider's auth state.
2. From an explicit user connect gesture, run Microsoft `/common/oauth2/v2.0/authorize`, `response_type=code`, S256 PKCE, strong one-use verifier/state, exact registered redirect, minimal delegated scopes plus `offline_access`. Validate exact callback origin/path, state uniqueness/expiry and one-use code before redemption. Do not log the callback, code, verifier or tokens.
3. Redeem from the actual extension worker at `/common/oauth2/v2.0/token` using form encoding and no secret. Inspect the browser-generated Origin and sanitized HTTP/AADSTS results. Do not manufacture an Origin header in extension code or substitute curl/server redemption as proof of Chrome compatibility.
4. If SPA redemption succeeds, retain SPA configuration and test refresh after worker restart and expiry. If the actual exchange fails due to SPA Origin/platform requirements, record the actual status/code first. Microsoft documents that SPA redirects cannot be used for non-SPA flows and redemption without Origin fails. In Entra admin center → App registrations → REDOWN → Authentication, move this exact redirect from Single-page application to Mobile and desktop applications (custom redirect) for a public-client/native PKCE flow, retaining both IDs. Remove the conflicting SPA registration for that URI rather than inventing a second callback. Enable public-client flows only if the tested native flow requires it; no implicit grant or client secret. Retest authorization, redemption and renewal. This is a conditional remediation, not a diagnosis from an unperformed exchange.
5. Verify `/me`, `/me/drive`, `/me/drive/root`, stable account/tenant/drive/root identity, provisioning/quota and actual writable root via an explicitly authorized test save. A successful token or root GET alone is not write proof. Repeat personal and work/school; distinguish admin consent, policy restrictions and unprovisioned drives.

## Upload requirements still to implement after the gate

The following are **NOT_IMPLEMENTED / NOT_TESTED**, not hidden feature promises:

- Provider-local protected PKCE session, token persistence/rotation, automatic noninteractive renewal, revocation/expiry handling and account-switch isolation.
- Bounded streaming queue, source permission/URL validation, actual byte and MIME checks, private/internal endpoint protection, redirect/cookie/signed URL errors. No arbitrary 32 MiB cap is introduced; no size is currently supported.
- Saving directly to the signed-in drive root, default Keep Both (`@microsoft.graph.conflictBehavior: rename`), actual returned filename, sequential known-total upload sessions, chunks divisible by 320 KiB and less than 60 MiB, bounded backoff, 401 refresh, 403/404/409/429/507 handling, cancellation and expiration handling.
- Worker suspension recovery with durable identity-bound checkpoints, source validators/ranges where possible, uncertain-final-commit reconciliation before replay, no duplicate save, and final Graph metadata proof of item, parent root, size and actual name.
- Accurate completed/failed/blocked/uncertain/interrupted History receipts with real source context and account/tenant/drive/item identity. This staging adapter creates no OneDrive History entries.
- Connected Shelf controls, theme/narrow layout and focus screenshots in real extension context.

Do not assume every Graph uploadUrl remains an unauthenticated preauth URL. The current Graph upload-session reference says not to include Authorization on preauthenticated PUTs; the Microsoft 365 developer retirement announcement explicitly includes createUploadSession, announces behavior changes beginning April 1, 2027, and describes tenant opt-in Graph URLs (Graph-token audience) versus SharePoint URLs needing SharePoint Online audience tokens. Implement only a tested explicit host/audience/mode policy. Never send a Graph bearer to an arbitrary uploadUrl/redirect or silently request broad SharePoint permissions.

## Live acceptance still required

Every real provider case is NOT_TESTED here: personal and work/school consent/branding, SPA token exchange, refresh/revocation/account switch, small image/file, larger session upload, duplicate Keep Both, root metadata readback, quota/403/401/429, cancellation/network fault, service-worker stop/wake, private/rejected source, no transfer tab/Downloads/stray folder/public share, installed menu order/screenshots, Shelf themes and connected History receipt. Reproduce by connecting explicitly in approved Chrome, saving controlled public test files with known bytes (including one larger than a chunk), repeating the same filename, comparing root item metadata and bytes, then exercising each fault without replaying ambiguous commits. Capture redacted receipts/screenshots only; never archive tokens, signed upload URLs or private filenames.

## Rollback

Revert this single implementation commit on the requested branch. It adds no credentials or remote objects. The original provider files are unchanged; existing native IDs and shared registration reconcile without the additive OneDrive entries on next rebuild. No cloud rollback or account migration is required.

## Official references checked

Fetched successfully (HTTP 200) during this session; these reads are documentation evidence only:

- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow — SPA Origin/platform restrictions, PKCE and token renewal.
- https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0 — rename conflict behavior, known total, sequential ranges and chunk limits.
- https://devblogs.microsoft.com/microsoft365dev/pre-authenticated-tempauth-urls-are-retiring-move-to-microsoft-entra-id-tokens-before-april-1-2027/ — affected APIs, tenant opt-in and audience-specific authorization.

Exact automated verification results are recorded in `verification/onedrive/results.json`. Full-suite baseline failures are preserved, not repaired or reclassified as live proof.

Final local results: targeted provider/OneDrive suite **94/94 pass**; OneDrive **9/9 pass**; previously affected extracted dispatcher checks **2/2 pass**. Full baseline **925 tests / 835 pass / 90 fail**; final full candidate **934 tests / 844 pass / the same 90 fail**, with no newly failing names. `npm run check` and `git diff --check` pass. `npm run reliability:check` remains failed/release-blocked; its exact stages and regression classifications are recorded in the results receipt. These results do not satisfy installed-browser/provider acceptance.

The reliability runner’s `newFailures` field compares against its older checked-in baseline. It is not the direct initial-head comparison for this task; the direct comparison in `failureComparison` retains the same 90 failing names. No frozen baseline, evidence hash or assertion was refreshed to obtain this result.
