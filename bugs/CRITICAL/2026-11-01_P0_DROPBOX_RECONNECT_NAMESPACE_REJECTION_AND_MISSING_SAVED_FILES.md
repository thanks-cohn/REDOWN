# CRITICAL P0: Dropbox reconnect blocked by namespace guard; earlier saved files cannot be located

**Date:** 2026-11-01  
**Repository:** `thanks-cohn/REDOWN`  
**Branch:** `codex/v3-parity-first-reconstruction`  
**Priority:** P0, provider access and saved-file recovery  
**Status:** OPEN — owner-reproduced connection failure; exact source guard identified; live Dropbox account/remote contents NOT inspected; NO code fix or live acceptance.

## Owner's installed-Chrome observations

1. REDOWN displays: **"Dropbox connection needs attention. Reconnect or try again."**
2. Repeated **Reconnect Dropbox** attempts display: **"This Dropbox namespace is restricted or ambiguous. A Full Dropbox user root is required."**
3. Files previously saved through REDOWN **are not visible to the owner**. Their remote existence, location, account/namespace and transfer outcome have **not** been independently verified. Do **not** conclude deletion, failed upload, or successful upload without evidence.

This is a first-class data-recovery/visibility incident as well as an authentication failure. Existing files and local transfer evidence take precedence over another save attempt.

## Source-confirmed mechanisms and boundaries

- `extension/dropbox-auth.js` `verify()` calls `users/get_current_account` and **rejects unless** `root_info['.tag'] === 'user'`, both namespace IDs match and the IDs are numeric. The exact second error above is thrown by this guard. It rejects `team` roots and root/home namespace differences **before testing the effective authorized root**; these conditions alone are not evidence that Dropbox denied access. The guard may also be correctly blocking an unsupported/restricted app configuration; investigate actual provider response first.
- `verify()` then calls `files/list_folder` on `path:''` using `Dropbox-API-Path-Root`. `extension/dropbox-api.js` also pins requests to the stored root namespace. Identity and read/write scope must be validated separately from namespace topology.
- `extension/dropbox-provider.js` `message()` masks errors as **"Dropbox connection needs attention. Reconnect or try again."**; `shelf-dropbox.js` can show a more specific stored error, but the generic RPC response and connect/reconnect UI make recovery opaque.
- `shelf-dropbox.js` hides **Open Dropbox** unless REDOWN considers the connection healthy. Users therefore lose an obvious read-only route to inspect remote files precisely when reconnect fails.
- The upload code commits to `/filename` with `mode:'add'`, `autorename:true`, and independent `files/get_metadata` proof; it does not create folders. `dropbox-provider.js` stores `dropbox:jobs`, `dropbox:transfer` and transfer History receipts, including provider, account, connection, returned file ID/path/filename and terminal outcome. The provider also constructs a Dropbox URL from filename only, which is not sufficient independent proof of an exact remote item.
- `docs/DROPBOX_ONE_CLICK_SAVE.md` expressly states real Dropbox OAuth, installed Chrome, and live upload/readback acceptance were **not tested** during the original implementation. The author's user-root-only restriction is documented design, not proof that it handles all otherwise authorized account topologies.

## Immediate preservation and investigation

- **Do not uninstall the extension, clear Chrome extension storage, disconnect/revoke the account, delete `dropbox:jobs`, or overwrite History** while investigating. Any required reauthentication/migration must be deliberate and preserve sanitized before-state evidence and unrelated provider state. Never export credentials or full private URLs.
- Have the owner check **https://www.dropbox.com/home** and Dropbox Recents under the **same account**. REDOWN should make Open Dropbox available even during a connection error; an external Dropbox browser session is separate from REDOWN OAuth health.
- Compare REDOWN transfer History and `dropbox:jobs` by time, filename, account ID, status (`completed`, `blocked`, `failed`, `uncertain`, `interrupted`), final file ID, actual returned `path_display`, and verification receipt. A `completed` record deserves remote lookup; `uncertain` requires checking Dropbox before resaving; a failed/blocked record is not proof a file exists.
- Capture a **sanitized** `users/get_current_account` result: root-info tag; whether root/home namespace IDs are equal; app scopes and app permission type as verified through authorized configuration; actual `files/list_folder` response/status for selected permitted root; exact account identity. Do not record access/refresh tokens, filenames or private paths in public issues.
- Determine whether a previously saved file is in a personal root, a team-space namespace, a different authorized account, or an app-folder-scoped location. Do not move/delete/duplicate remotely as a diagnostic or silently switch namespace to make tests pass.

## Required correction (not yet implemented)

1. **Support Dropbox's actual authorized namespace model**: distinguish personal `user` roots, `team` roots with root/home differences, and genuinely restricted or ambiguous grants using Dropbox's documented account/root metadata and API outcomes. Do not treat `root_namespace_id !== home_namespace_id` as automatic rejection. When the app lacks Full Dropbox permission or a team namespace is not authorized, fail clearly; never bypass scopes, team membership, or the intended root-only/no-folder destination.
2. Preserve **provider/account/root/namespace isolation** across initial OAuth, refresh, reconnect, restart, job resume and shared Chrome menu dispatch. Require an explicit, verified selected destination if there are multiple legitimate writable roots; do not silently promote the wrong namespace.
3. **Expose actionable error states**: distinct unsupported app configuration, missing scopes, 401/revocation, team authorization denied, namespace changed, remote listing forbidden, and transient network errors. Keep meaningful diagnostics available without leaking secrets.
4. **Recover visibility of prior saves**: retain transfer History and durable receipts; offer a read-only, user-initiated way to reconcile a verified `completed` upload's exact Dropbox file ID/path against the original account and namespace. Show truthful `not verified`, `not found`, `different account/root`, or `possible uncertain commit` states instead of inventing deletion or completion. Do not overwrite or retry ambiguous upload commits automatically.
5. Keep **Open Dropbox** available when signed out/reconnect is needed, with clear separation between the Dropbox website and REDOWN's connected account status. Expose verified filename, root/account and exact destination from the upload receipt; avoid constructing a misleading proof link from basename alone.
6. Keep existing Cloudflare, Google Drive, OneDrive, V3 right-click save engine, Boot/Current menu writer, history, and all independent provider destinations unchanged. No unapproved remote mutations or changes to Dropbox folder-creation behavior.

## Acceptance / regression gates

- [ ] Installed Chrome reproduces the original pair of errors on the affected account and records redacted root metadata and provider HTTP responses without leaking credentials.
- [ ] Valid personal Dropbox root reconnects; authorized team-root/root-vs-home variations connect to the correct explicitly verified namespace, and truly restricted/app-folder-only permissions fail with a specific explanation.
- [ ] Required file scopes, account changes, namespace changes, expired tokens and revoked team access remain fail-closed; refresh/restoration cannot cross account or root boundaries.
- [ ] Existing verified Dropbox files can be found by exact receipt ID/path in the correct original account/namespace **without uploading them again**, if Dropbox confirms they exist. Uncertain/failed transfers remain honestly classified.
- [ ] A newly authorized test PNG/PDF is right-click saved to the intended root with no REDOWN/Apps subfolders, autorename KEEP BOTH, verified metadata/readback and visible filename/location. No fake success.
- [ ] Open Dropbox remains usable on reconnect errors; precise safe errors reach Shelf and diagnostics, while native Chrome menu/other cloud providers remain operational.
- [ ] Tests cover user/team/root-home mismatch, app-folder/restricted scopes, invalid/ambiguous roots, same filenames in different accounts, revoked grants, reboot/refresh, missing remote files, uncertain commits, and real installed-Chrome + live Dropbox acceptance. Mock passes alone do not close this P0.

## Related source and tracking

- [November 1 actionable NEED_TO_DO](../../NEED_TO_DO/11012026.md), **P0.8 — Dropbox reconnect and missing-file recovery**.
- [Dropbox implementation report and original live-test boundary](../../docs/DROPBOX_ONE_CLICK_SAVE.md).
- Code: [Dropbox auth](../../extension/dropbox-auth.js), [Dropbox worker/provider](../../extension/dropbox-provider.js), [Dropbox API](../../extension/dropbox-api.js), [Shelf Dropbox UI](../../extension/shelf-dropbox.js).
- [REDOWN bug inventory](../README.md).

**Classification:** Documentation of owner-reported and source-confirmed issues only. No production code change, OAuth reconfiguration, external Dropbox read, file recovery, upload, deployment, test execution, or proof of fix was performed.


## 2 November implementation follow-up — live incident remains OPEN

Local receipt/counter integrity hardening, exact readback checks, attempt History, stale-auth status repair, safe known-ID reconciliation and verified-only theme choreography are implemented on the working branch. See [actual implementation and verification report](../../docs/DROPBOX_VERIFIED_SAVE_REPORT_2026-11-02.md). No installed Chrome or authenticated Dropbox proof was obtained; the installed phantom-save cause, historical false-count assessment and team/root-home selection remain unresolved. Prior observations above are retained. No historical counts or owner records were rewritten.
