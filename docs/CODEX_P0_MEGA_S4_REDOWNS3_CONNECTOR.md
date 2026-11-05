# CODEX P0 — MEGA S4 (S3-compatible) connector into REDOWN's real Universal File Explorer

**Owner-approved direction:** November 5, 2026  
**Target repository:** `thanks-cohn/REDOWN` (NOT Click2Cloud)  
**Urgency:** make MEGA S4 a genuinely connected, usable cloud in REDOWN ASAP.  
**Status:** implementation request, not evidence the connector is working.

## P0 STOP/GO gate — verify the three supplied variables FIRST

**Strict owner instruction, takes precedence over all later implementation steps:** Before writing the MEGA connector, changing any application source, running any cloud writes, creating buckets, deploying Workers or running destructive tests, verify whether **ONLY** these three privately configured values are sufficient to perform the requested MEGA S4 integration:

```text
MEGA_S4_ENDPOINT
MEGA_S4_ACCESS_KEY_ID
MEGA_S4_SECRET_ACCESS_KEY
```

Do **not** assume a separate `MEGA_S4_REGION` or `MEGA_S4_BUCKET` value exists. **They are optional only if safely discoverable and verified** using the official MEGA S4 documentation, trusted endpoint configuration and read-only API discovery. Never fabricate signing-region data, bucket names or permission scope; never substitute ordinary MEGA Cloud Drive for S4.

**Execute this preflight before implementation:**

1. Inspect the **actual REDOWN Codex execution environment** for the presence of those three variables. Confirm presence and nonempty syntactic form without printing, echoing, writing to artifacts or exposing their values. If any is missing, **STOP** and report the variable name only.
2. Verify that Codex's network policy permits HTTPS access to the specified MEGA S4 endpoint. If network access is blocked or unavailable, **STOP** and label the outcome `PREFLIGHT_BLOCKED_NETWORK` rather than falsely concluding that additional S3 credentials are needed.
3. Consult the official MEGA S4 endpoint/signing documentation. Determine whether signing region can be safely resolved from the endpoint/documented defaults. If not, **STOP** and request precisely `MEGA_S4_REGION`, with an explanation of where the owner can obtain it; do not guess and don't silently use `us-east-1`.
4. Using a bounded, least-privilege **read-only** signed S3 request, prove that the credentials authenticate to the correct MEGA S4 service. If authentication fails, **STOP** with a sanitized reason (`PREFLIGHT_AUTH_FAILED` etc.), not raw server details or secrets.
5. Attempt read-only authorized bucket discovery (`ListBuckets` where supported). If permitted, enumerate only bucket names for the user-facing private report and use a known authorized bucket to attempt read-only `ListObjectsV2` or `HeadBucket` for confirmation. **Do not mistake AccessDenied to ListBuckets for bad credentials**: if bucket discovery is disallowed, **STOP** and request exactly `MEGA_S4_BUCKET`, then resume only after an approved bucket is supplied. If account is valid but has zero buckets, **STOP** and explain that the owner must create or authorize a test bucket; do not create one on the owner's behalf.
6. Do not upload, delete, overwrite, rename, prepare Cloudflare/R2 Workers or perform any other mutation during the preflight. No hidden charges or side effects for “checking.”
7. Produce a concise `GO` or `STOP` summary: credentials present (yes/no), endpoint reachable (yes/no/unknown), signing region verified (yes/no/unknown), authentication verified (yes/no/unknown), test bucket discovered and read-access verified (yes/no/unknown), and whether any *additional* value is required. **Redact the secret and access key ID**. Avoid printing endpoint URLs containing query secrets.
8. **If ANY step is unverified or blocked, STOP execution of this Codex implementation task. Do not edit runtime code or proceed speculatively.** Tell the owner exactly which information, account permission or environment access is missing, and the smallest possible next action. **Proceed with implementation only after a definitive GO and user-authorized test scope.**

The three variables are the **default minimal setup**, not a guarantee that every MEGA account permits automatic region/bucket discovery. This gate is to prove sufficiency, not to demand extra variables for convenience.

## 0. Non-negotiable product direction and task boundary

REDOWN is the intended customer release. Click2Cloud exists to establish a clean baseline/behavioral reference and later a deeply programmatic menu lab. It is **NOT** replacing REDOWN as the shipped product, and this initial task must **not** wholesale transplant Click2Cloud V3+1 or rewrite REDOWN's current native right-click engine.

**NOW (P0):** connect MEGA S4 to REDOWN's existing Universal File API and Explorer, using real S3 credentials provided securely through a trusted runtime. Give MEGA an independent cloud entry/tab/sidebar connection, with real files and operations, without disturbing Cloudflare R2/Drive/Dropbox/OneDrive.

**NEXT (separate, follow-up Codex request):** use the Click2Cloud scaffold and its real-menu semantics as the reference to refactor REDOWN's right-click implementation, preserving actual REDOWN functionality and minimizing disruption. Keep mode configs isolated and honor existing provider-flat-menu rules. No immediate replacement of REDOWN's native menu is authorized by this request.

**LATER (separate task):** amplify the Click2Cloud/REDOWN headless programmatic control surface, develop a focused 500-scenario generated state-transition test suite, iterate based on customer-like actions, and establish cross-domain BOOT + Menu + Universal File API invariants. Do not delay a real MEGA connection for that future test suite. The owner wants reliability backed by real launch gates, not a 500-pass numerical trophy.

**ONGOING RELEASE GATE:** REDOWN's BOOT API and entrypoint must be robust across allowed computer/browser/Windows/MV3 conditions; no silent failure to open, no false “ready.” BOOT coordinates startup, toolbar/Shelf/popout, worker readiness, native-menu recovery and diagnostics, while the Universal File API plus trusted transfer adapter own file bytes. **Do not put file transfer into BOOT just because startup must be reliable.** No promise of functioning on policy-blocked or unsupported computers.

## 1. Actual REDOWN source baseline and reuse boundaries

Inspect in current target branch before editing:
- `extension/beta/file-api.mjs` — **existing** normalized Universal File API operations/capability contract; currently an API created with a single injected adapter.
- `extension/beta/r2-adapter.mjs` — existing Cloudflare-specific adapter and Worker integration, not a generic S3 SDK.
- `extension/beta/explorer.mjs` and HTML/CSS — current Explorer, with `const api=createFileApi(createR2Adapter())` at source baseline. Preserve full Explorer behavior while inserting provider-specific routing.
- `extension/background.js` — actual provisioned R2 `WORKER_SOURCE` and provider message ownership; `worker/src/index.js` is NOT equivalent to the extension's R2 Worker.
- `extension/boot.js`, `extension/entry-bootstrap.js`, `docs/boot/API.md`, `docs/boot/IMPLEMENTATION.md` — startup coordinator and known unresolved installed-Chrome incident.
- `docs/explorer/PROBES_AND_SMOKE.md`, `docs/agent/ARCHITECTURE_MAP.md`, `IMPORTANT/UNIVERSAL_AGENTIC_TEST_CORPUS_AND_PIPELINE.md`, `AGENTS.md`.
- The existing source-specific agent/explorer API and smoke tests: extend exact supported operations/capability reporting rather than claiming blanket parity.

**Design:** `Universal File API → provider-dispatch/router → Cloudflare R2 existing adapter OR MEGA S4 S3 adapter`. Ensure exact provider namespace is part of canonical identity (`provider, connectionId, accountId, bucketName, prefix`) where needed, with explicit backwards-compatible mapping for existing R2 locations; `accountId+bucketName` alone is not sufficient to distinguish providers.

Implement a generic S3-compatible adapter with an explicit `mega-s4` capability profile, not duplicated Explorer or R2 Worker code. Share only appropriate schema/batch/progress/error handling. Do not assume every S3-compatible provider implements all AWS features. Use the first-party MEGA S4 S3 specification: https://github.com/meganz/s4-specs .

## 2. Credentials: secure configuration, least privilege, no secret leakage

Potential values for a **live integration test** (the **P0 STOP/GO gate above is authoritative**; do not demand optional values by default):
- MEGA S4 account with Object Storage enabled.
- One user-created, preferably empty **disposable test bucket** (exact name), only if not discoverable with the three variables and read-only permissions. If unavailable, STOP; avoid deleting or provisioning an arbitrary bucket.
- **Access Key ID** and **Secret Access Key** generated under MEGA **Object storage → Keys**, ideally a restricted S4 user/key with only the necessary bucket permissions. These are not OAuth tokens.
- The actual MEGA S4 S3 endpoint URL; discover signing region from verified documentation/endpoint when possible, otherwise STOP and request it. Use HTTPS, AWS Signature Version 4 and proper endpoint addressing. Confirm which endpoint family MEGA currently documents for this account; do not hardcode an unsupported region from a third-party tutorial.
- Owner's consent to writing/overwriting/deleting **only test objects** inside a dedicated test prefix, and whether real credential-backed live testing is available in the execution environment.

**Never ask owner to paste S3 secrets into chat, GitHub, Codex prompts, committed files, CI logs, browser diagnostics or plaintext extension JavaScript.** Implement a trusted credential intake through REDOWN's existing native companion / local worker where feasible, or an explicitly authorized private signing host. Check which trusted runtime already exists; do not invent a public credential proxy. Sensitive signing material must not be exposed to arbitrary web pages, content scripts, or third-party destination URLs. Do not assert that `chrome.storage.local` is a hardware-backed secret vault. Distinguish a local-only trust decision and security trade-offs in the implementation report. Rotate/revoke test keys if exposed.

Use least-privilege S3 object operations: listing on bucket, GetObject/HeadObject, PutObject, optional DeleteObject/AbortMultipartUpload for explicitly authorized test cleanup. Do not demand root user/admin permissions, cross-bucket wildcard access or bucket deletion for ordinary Explorer use. If key cannot ListBuckets, allow explicitly configured bucket names and verify permitted access.

**NO real credentials needed for headless code construction.** Use synthetic keys for unit tests. Run live smoke only where owner's approved test secret is provided directly to the trusted runtime.

## 3. Real MVP functionality inside REDOWN

The smallest useful vertical slice is: **Add MEGA S4 connection → authenticate/read test bucket → list objects/folders → upload actual file → independently retrieve and verify exact bytes → download/preview → show in Explorer.**

- Add a separate **MEGA S4** cloud entry/tab/expandable sidebar node in REDOWN's existing Explorer. Keep Cloudflare R2 intact. Show Connect/Manage/Disconnect and meaningful connection state, not a fake connected badge.
- Implement S3 listing with delimiter + pagination, GetObject/HEAD, PutObject (small object first), DeleteObject (only under explicit user action), and multipart only after verified capability support. Reuse existing `createFileApi` result schema, original progress and typed `completed/partial/failed/uncertain/cancelled` states.
- Support real nested bucket-relative paths and **S3 implicit folder prefixes**, plus explicit zero-byte folder markers when appropriate. Preserve empty-folder and rename semantics honestly; rename/move often requires copy + separately confirmed delete, never delete source on an unconfirmed destination.
- S3 capability flags per connection: listing, read, write, delete, copy, multipart, previews, folder operations, public URLs, restore/undo when supported. Unsupported features must remain disabled/explained instead of pretending Cloudflare-only functions work with MEGA.
- Handle MEGA S4-specific incompatibilities (e.g. unsupported modern AWS checksum headers, some optional headers, features and bucket operations). Use AWS Signature V4 and path-style or documented supported addressing. Prefer maintained, appropriately scoped S3 tooling rather than an ad-hoc SigV4 implementation; verify browser/runtime packaging and bundle size.
- For cross-cloud copy (R2 ↔ MEGA): choose a secure source GET/stream + authorized destination PUT, with **no intentional local-disk temporary download**. A trusted browser/native/Worker relay may transport bytes, but never send page URL/origin/provenance to providers. Keep browser memory bounded with streaming/multipart where supported; don't promise “unlimited” sizes without tested transfer limits. Object destination names and necessary operation metadata are still allowed.
- Keep **KEEP BOTH** conflict behavior where existing REDOWN policy requires it; do not overwrite user content unexpectedly. Verify exact destination name/key and checksum/byte readback independently. Treat ETag as provider metadata, not universally MD5/content-hash evidence.
- Preserve independent provider cards, existing right-click menus, History and GO TO. It is acceptable for initial P0 to expose MEGA in the Explorer first, if the native right-click provider integration isn't ready, provided scope/status is truthful. A later explicit owner stage handles full MEGA native menu registration without breaking Cloudflare V3.
- Do not accidentally enable public access or deploy billable Workers on connection/inspection. No user-cloud mutations without explicit user authorization.

## 4. BOOT API: separate startup reliability, mandatory no-regression gate

The owner has an explicit priority: REDOWN must OPEN predictably on every **supported** fresh/restart scenario and recover honestly from transient entrypoint faults. The existing `RedownBoot` coordinator is NOT the file-transfer engine. Preserve that separation.

This connector must **not** make opening the Shelf/Explorer wait for MEGA network calls, invalid credentials, timeouts, expensive folder scans, or stalled R2 Workers. Cold browser and dormant MV3 worker must show the product quickly with an honest disconnected/degraded MEGA state. Provider outages must not block other provider tabs.

Run existing BOOT/entry tests after adapter integration, including worker wake/suspend/restart, toolbar click, shelf opening, native menu reconciliation, network unavailable, malformed credentials, incomplete connection, corrupt cached provider state, disconnect/reconnect. One provider failure must not prevent REDOWN opening and functioning for other providers. Record genuine installed-Chrome evidence separately from fixture success. Existing intermittent installed-Chrome startup incident remains OPEN until independently reproduced and fixed.

**BOOT controls readiness/recovery and bounded entrypoint diagnosis; Universal File API/provider adapter controls transfer.**

## 5. Codex implementation order (P0 first, no scenario-project detour)

1. Inspect current REDOWN branch and available local trust/credential transport; identify the least invasive provider-router seam and test/runtime constraints.
2. Build the generic S3-compatible adapter and `mega-s4` explicit capability profile using first-party MEGA S4 API spec; unit test SigV4, endpoint, unsupported headers, pagination, implicit prefix, uncertain writes and wrong-account isolation using synthetic credentials.
3. Add secure credential configuration/connection flow and MEGA entry in existing Explorer; don't bury the connect control in Settings alone.
4. Deliver an actual real-file MVP: List → upload → HEAD/GET → byte-verify → refresh Explorer → download, preserving R2 behavior. If live keys are unavailable, finish offline pieces and supply exact local secure test instructions; mark LIVE_PROVIDER blocked.
5. Add copy/move/delete/rename, multipart, bulk/drag-drop and cross-cloud transfer incrementally as independently verified. Any unsupported operation should report its limitation honestly; avoid UI buttons that silently fail.
6. Run focused tests, `npm run check`, relevant existing `npm run explorer:smoke -- --preset all`, and BOOT tests from `docs/boot/IMPLEMENTATION.md`; do not reset baselines or weaken assertions. Review `npm run reliability:check`/readiness.
7. Supply a reproducible installed Windows/Chrome acceptance checklist: clean connected MEGA test account, bucket listing, fresh/empty nested folder, file write/byte readback, restart, tab switch, R2 nonregression and failure/reconnect. No mock-only “worked” declarations.
8. Commit changes to an explicit development branch. Do NOT merge/deploy to REDOWN production, rotate user's cloud keys or modify Cloudflare resources unless the owner separately authorizes the action. Include exact changed files, SHA, tests, known blockers and follow-up tasks.

## 6. Release phases — do not conflate

**Phase A / now:** REDOWN real MEGA S4 connector, testable Explorer tab, verified files, no regressions and a startup BOOT smoke gate. The immediate demo is MEGA and R2 coexisting under one Universal File API.

**Phase B / next:** REDOWN menu refactor using Click2Cloud's V3+1 scaffold as a **behavioral and structural reference** for Simple/Narrow/Depth, not an unconditional engine replacement. Preserve real existing REDOWN native saves; remedy their defects via shared canonical models/programmatic inspection where safe.

**Phase C / later:** Fully versioned headless, permission-gated programmatic menu/file/BOOT interfaces; automate a targeted **500-case test corpus**, with agent-generated customer journeys (create destination, edit, hide, delete config without deleting cloud objects, multiple accounts, mistaken bucket, unreachable provider, deep/wide folder nesting, auth loss, Chrome restarts, concurrent saves, conflicts, ambiguous transfers, GUI-vs-native differential). Use the existing `IMPORTANT/UNIVERSAL_AGENTIC_TEST_CORPUS_AND_PIPELINE.md` standard, and strengthen it iteratively. Keep independent oracles for true provider effects.

**Phase D / launch readiness:** BOOT/transfer/native-menu real-installed acceptance on supported OS/browser configurations, startup reliability under suspend/restart, zero wrong-account writes, zero false verified success, truthful partial/unknown states, privacy and secret-handling checks. No fixed launch date inferred solely from unit-test counts.

## 7. Developer documentation deliverable

Provide a short `docs/MEGA_S4_LOCAL_SETUP.md` with screenshots-neutral user directions: obtain dedicated keys, find exact endpoint/region and bucket, enter into REDOWN's trusted connection UI, select test bucket, run a read-only connection check, approve disposable-prefix test writes, independently verify byte hash, revoke/rotate key. Include examples with **placeholders only**, no actual credentials.

### First-party reference

- MEGA S4 API specification: https://github.com/meganz/s4-specs
- MEGA S4 key setup / endpoints should be confirmed against the current account's official Object storage UI. Never assume standard MEGA Cloud Drive passwords can authenticate the S3 service.

**Owner's concrete acceptance:** Launch REDOWN → it opens, even if MEGA is disconnected → Connect MEGA S4 securely → MEGA bucket appears next to R2 in the real Explorer → upload a file and read back exact bytes from MEGA → switch to R2 and back without losing state or breaking Chrome. Then we tackle menu parity and the 500-case corpus in separate work.
