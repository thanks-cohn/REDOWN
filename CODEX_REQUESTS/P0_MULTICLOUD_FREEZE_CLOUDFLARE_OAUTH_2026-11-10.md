# CODEX P0 — REDOWN systemic right-click freeze, missing History, and Cloudflare OAuth failure

**Repository:** thanks-cohn/REDOWN
**Severity:** P0 — CRITICAL / RELEASE BLOCKER
**Investigation date:** 2026-11-10
**Source branch containing this request:** feat/history-shelf-search-queue-vision-2026-11-10
**Suggested isolated implementation branch:** fix/p0-multicloud-freeze-cloudflare-oauth-2026-11-10
**Authoritative incident notes:** NEED_TO_DO/need-to-do-11.10.2026.md

## Mandate

Investigate REDOWN as a SYSTEM, not as four unrelated provider UI problems. Fundamentally establish why right-click saving works for a small number of attempts, then apparently becomes unresponsive across sources, locations, and providers; why failed clicks can vanish from History; and why completing the required Cloudflare authorization flow does not yield a logged-in/ready REDOWN card.

Trace actual execution, establish the first failing checkpoint and mechanism, repair confirmed causes, construct regression tests, and provide independently inspectable evidence. Do NOT hide failure with a repaint, forced reload, timer-based success, speculative OAuth resets, or parallel transfer engine.

Our product promise is persistent, dependable right-click saving anytime and anywhere supported by browser permissions, provider authorization, network, and the actual receiving API. When saving cannot proceed, a received user action must never silently disappear.

## 1. Exact owner-observed incident (corrected chronology)

1. Approximately **11 right-click attempts in total**, spread across Google Drive, Dropbox, and OneDrive. This number refers to ATTEMPTS, NOT successful saves and NOT 11 attempts per provider.
2. Some of those initial attempts failed. On rechecking History and the cloud folders, the owner verified **at least 1–2 genuine saved files with EACH of Google Drive, Dropbox, and OneDrive**. Exact totals and per-attempt chronology are unknown; do not invent them.
3. Subsequently, right-click actions appeared entirely unresponsive, no matter which source website/file, provider, or destination location the owner selected.
4. New actions stopped producing updates in History — **not even failed/error records** — even though the owner tried more right-click saves. Do not infer the events reached REDOWN solely from the user's gesture; confirm entry into Chrome's menu callback.
5. The owner also completes the REQUIRED Cloudflare authorization/approval on Cloudflare's side, yet REDOWN still displays LOGIN! and does not establish a recognized connection. This is not merely an out-of-date label until the actual callback, token persistence and readiness are proven.
6. No independently verified R2 save was established. Cloudflare's counter did not increment; do not infer the save failed solely from the counter or that authorization actually persisted.
7. The owner has specifically prohibited signed-out Explorer debug-banner flickering. Do not add recurring status/debug messages into the FILES Explorer guest view while investigating.

This is an unresolved real-world incident. It is possible that there is one shared failure, multiple simultaneous failures, a combination of provider state faults and an extension-worker fault, or a storage/communication failure. Prove it; do not guess.

## 2. Core questions requiring definitive answers

- At what precise checkpoint do the post-success clicks disappear?
- Does Chrome dispatch contextMenus.onClicked? Does the extension service worker initialize and attach every listener?
- Does REDOWN dispatch to the correct provider? Can one provider failure poison other providers?
- Does a click get an operation ID and durable attempt record BEFORE any asynchronous preflight?
- Can a stale connecting/auth-required status, unresolved promise, missing host permission, blocked queue, lost service-worker message port, stale context menu ID, storage failure, background exception or interrupted worker discard a click?
- Why can History show neither success nor failure? Is there no attempt journal, an early return before History, failed storage, a renderer issue, or a broken archive/receipt pipeline?
- Does the Cloudflare callback reach REDOWN after the owner authorizes? Does it validate OAuth state and PKCE, exchange code, store credentials, refresh account access and publish state?
- Are Cloudflare OAuth failures related to the broader context-menu freeze?
- Are counters inaccurate, or are saves unverified? Reconcile against real destinations and receipts.
- What exact change will prevent recurrence after repeated operations?

## 3. Trace the entire right-click pipeline

Measure and instrument the existing unified entrypoint:

    browser gesture
      -> Chrome native context menu
      -> chrome.contextMenus.onClicked
      -> provider/menu ID resolved
      -> durable attempt ID and journal entry
      -> source snapshot and permission preflight
      -> actual provider auth, scopes and readiness check
      -> account/destination identity resolved
      -> durable queue job
      -> fetch/stream and provider upload
      -> provider commit, independent verification/proof
      -> durable verified receipt / History
      -> counters and card updates

For EACH transition record a sanitized operation ID, timestamp, component, state, completion/failure code, duration and owner of the next transition. No private content, source/page URLs, auth secrets, bearer links or tokens in traces. Capture what survives service-worker restarts. Find the FIRST missing transition for the reported silent attempts.

Important architectural detail from prior source inspection: the common background.js onClicked handler routes Google/Dropbox/OneDrive to provider-specific handlers BEFORE creating the later Cloudflare-path attempt ID / MENU_CLICK trace. A diagnostic attached only to the latter cannot prove whether non-Cloudflare clicks arrived. Put the receipt-of-click signal BEFORE provider dispatch, without duplicating handler behavior.

Account for both cases: (A) REDOWN truly does not receive the native event; (B) it receives the event but loses it in REDOWN code. Do not manufacture History attempts for gestures Chrome never delivered.

## 4. Audit provider paths, especially every silent return

Start with, but do not limit scope to:

- extension/background.js and extension/entry-bootstrap.js
- extension/google-drive-provider.js and extension/google-drive-stream.js
- extension/dropbox-provider.js, extension/dropbox-auth.js, extension/dropbox-api.js
- extension/onedrive-provider.js, extension/onedrive-auth.js, extension/onedrive-api.js
- extension/cloudflare-auth.js and extension/cloudflare-api.js
- extension/transfer-counter.js, extension/history-archive.js
- extension/shelf-history.js, extension/shelf-save-feedback.js
- menu registration/rebuild modules, BOOT/diagnostics, storage, worker lifecycle, auth and receipt utilities

Source-confirmed hypotheses requiring testing:
- Google Drive dispatch can return while googleDriveState.phase is connecting; some catch paths write only googleDriveTransfer instead of a History event.
- OneDrive dispatch can return during connecting or immediately after invoking auth.connect(); some blocked paths write only onedrive:transfer, not an attempt or History result.
- Dropbox has an already-active authentication path that can write a transfer status and return without a History entry, while other error paths do record.
- Both Google and Dropbox have bounded pending queues, but there is **no established eleven-save ceiling**. Inspect actual job counts, statuses and reported flags before attributing anything to queue saturation.
- Cloudflare card requires a persisted cloudflareAuth accessToken and a succeeding cfAccounts account check before showing a connected/Manage state. Differentiate issuance, verification, saving readiness and UI projection.
- The Google worker uses an upload job ID, while background.js intentionally normalizes verified Google receipts to the real provider file ID before transfer-counter.js. This was investigated; **do not resurrect a speculative counter “fix” without evidence**.

Inspect synchronous exceptions, swallowed errors, asynchronous permission requests, status transitions, stale identities, serialization locks, reported receipts, pending job recovery and one-use menu IDs. Determine whether a generic failure can make the extension permanently inert.

## 5. Cloudflare login: independent end-to-end P0

The owner reports successfully performing Cloudflare's required authorization, but REDOWN still does not log in. Trace the complete sequence:

    LOGIN action
      -> login attempt/session/PKCE record
      -> OAuth window / redirect URL
      -> user authorization
      -> webNavigation/redirect callback delivered
      -> state + verifier + timing validated
      -> code exchanged for access/refresh token
      -> token durably written in chrome.storage.local
      -> account API request and permission/readiness checks
      -> authoritative login and R2 save-readiness state
      -> Shelf/card connected/Manage state propagated
      -> separate R2 Worker/bucket readiness
      -> later TRUE REMOTE save and independent R2 HEAD confirmation

Instrument and prove the first failing step. Review callback matching and multiple webNavigation listeners; window closure, alarms and MV3 suspension; redirect and OAuth client settings; PKCE storage; state races; timeouts; token rotation and refresh locks; invalid_grant/reconnectRequired; API 401/403; account-listing permissions; stale UI data projections and chrome.storage.onChanged handling.

DO NOT conflate these statuses:
- no token or authorization failed
- OAuth token persisted but account-access verification pending/failed
- authenticated but scopes/permissions insufficient
- authenticated but R2 not enabled
- authenticated but Worker or bucket not set up
- expired/refresh-needed credentials
- fully ready to save
- transfer completed and independently verified

After Cloudflare authorization, never pretend success without a verified saved token, but never remain indefinitely in silent LOGIN either: show a precise actionable state and preserve valid credentials when an API check is merely transient. Check new and previously-used Chrome profiles. Do NOT manipulate production Cloudflare resources, revoke tokens, create buckets or provision Workers solely for diagnosis.

## 6. History silence and mandatory attempt accounting

Every REDOWN context-menu event that the extension actually receives MUST be durably traceable even if no provider upload begins.

Use the existing API-first engine / diagnostic infrastructure, not a second transfer system. Where no early durable intent record exists, add one at the earliest safe callback boundary:

- operation ID (collision-resistant, stable)
- time received, requested provider, selected destination identifier if known
- current status: received, queued, auth_required, preparing, transferring, verifying, verified, blocked, interrupted, failed, cancelled or uncertain as appropriate
- sanitized failure reason, last checkpoint and recovery action
- linkage to an eventual provider-verifier-backed receipt without counting twice
- persistence acknowledgment and restart recovery behavior

Received gesture != successful upload != verified receipt. Never show SUCCESS!, increment verified counts or add a fabricated provider file because of a click, queue acceptance, response timeout, or GUI animation. Existing History for verified saves remains authoritative; if attempt journal and History are distinct views, provide a clear user-accessible way to inspect both and correlate them, without hiding missing-attempt failures.

If writing attempts or History fails, surface that *specific failure* in programmatic diagnostics and an appropriate user-visible failure surface, without creating an infinite retry loop or status-bar flicker. Implement idempotency, bounded retries and independent provider isolation. No duplicate file commits after uncertain outcomes; reconcile with provider proof.

## 7. Time-dependent failure and composed-system investigation

Reproduce repeated mixed success/failure and examine:
- MV3 worker suspension, installation, extension update and browser restart
- listener registration and initialization exceptions
- Chrome context-menu removal/rebuild/duplicate handlers
- source access permission prompts / permission denial
- OAuth connecting state that never settles; lost callback / failed refresh
- unresolved promises, navigator.locks contention and queue serialization
- retry/backoff that becomes permanent or exceeds job caps
- active jobs blocking later queued jobs
- network faults, HTTP 401/403/429, timeouts and quota limits
- IndexedDB/chrome.storage quota, race, interrupted writes or stale state
- error notifications, History archival and UI subscriptions
- loss of host access when switching websites
- a failure in one provider affecting unrelated provider requests

Compare first attempts, later attempts and restart/reconnect attempts using sanitized, correlated trace IDs. Do NOT assert the number 11 is a built-in threshold.

## 8. Correctness and product invariants

Preserve these non-negotiable rules:

1. One engine: GUI-to-API parity and no overlapping auth/save controllers.
2. No received right-click silently vanishes.
3. Login != operational readiness != verified provider save.
4. Independent provider failures never poison unrelated providers.
5. Every pending operation eventually settles, times out, or remains visibly recoverable.
6. Explicit exact-destination reauthorization and safe resume where possible.
7. Provider upload bytes + filename/extension and required destination metadata ONLY — never send source/page URLs to providers.
8. Cloudflare R2 TRUE REMOTE remains Worker fetch, no silent browser-disk fallback; independently verify object via R2 HEAD before SUCCESS!.
9. Genuine provider-verified receipt is required for sound, animation, History success and counters.
10. No unsafe replay or duplicate upload when the final commit is uncertain.
11. Signed-out Explorer remains visually stable and free of diagnostic banners; retain programmatic Debug access.
12. No bloat, speculative workarounds, hidden fallback paths or documentation-only compliance.

Investigate composition effects: separate subsystems may each pass isolation tests yet together deadlock, discard clicks, or corrupt their shared state. Create explicit integration tests for such interactions.

## 9. Tests and acceptance gates

Create deterministic tests for:
- right-click received then auth stuck at connecting
- provider connected then token expires / refresh fails / reconnects
- unknown/stale/removed context-menu ID
- missing source permission
- serial queue stalled, saturated and recovered
- failed provider upload with durable failure record
- no provider connectivity
- worker suspend after every checkpoint, then resume
- Chrome startup/reload with pending work
- History write or archive failure
- repeated clicks during an active save
- failed Cloudflare callback, PKCE mismatch, window close, transient account API failure
- successful OAuth callback/token exchange and display state propagation
- account connected but no R2 scope/bucket/Worker readiness
- network loss and all of HTTP 401, 403, 429, 500 and 503
- Google/Dropbox/OneDrive isolation while another provider fails
- counters remain untouched on pending/failed/uncertain handoffs
- no missing attempted event for any context-menu action actually delivered

Run an initial approximately 11-attempt mixed-success/failure scenario reflecting the owner account; then 50–100 sequential attempts across the three non-R2 providers, rotating providers and sources/locations. Exercise OAuth and recovery repeatedly. Confirm number of received gestures equals number of durable attempt records (with explicit accounting for storage faults), and verified destination files match History receipts and lifetime counters.

Do real installed Chrome tests and real provider-save verification if access and credentials are available. Clearly separate simulated fixture success from genuine provider receipts. Do not claim real testing if it was not performed. If a live test requires owner action, document the exact prerequisite and continue all feasible offline tests.

## 10. Work isolation, safety, and priorities

- Read the repo's existing README, AGENTS, reliability documents, relevant instructions and the authoritative 11/10 incident notes first.
- Preserve the current working feature branch and all of its unmerged drag queue/Explorer/History changes.
- Create a dedicated P0 fix branch, preferably fix/p0-multicloud-freeze-cloudflare-oauth-2026-11-10, from an appropriate validated base; clearly state your chosen base and rationale. Do not reset, force-push, merge or deploy unrelated branches. Never modify main directly.
- Prioritize this reliability blocker over future UI/design enhancements and experimental drag-drop improvements.
- Do not touch live user Cloudflare buckets/Workers/accounts or external provider data without explicit appropriate approval. Avoid exposing secrets or private source URLs in trace artifacts.
- Make focused, evidence-supported fixes with tests. Keep old verified saves and History intact.
- Document any inability to execute live browser/provider checks; no unsupported release claims.

## 11. Required evidence-backed final report

Provide:
A. **Exact reproduction:** steps, environment/build, known preconditions, owner-observed versus reproduced behavior.
B. **First missing checkpoint:** timeline of successful and failing click IDs; clear source of lost attempts.
C. **Confirmed causes:** exact source functions/lines, proof and impact. Label unproven hypotheses honestly.
D. **Cloudflare OAuth diagnosis:** callback, token, API readiness and UI states with exact failure point; state whether correlated with global freeze.
E. **History silence cause:** why attempts, failed receipts or renderer entries did not appear.
F. **Fixes and safeguards:** smallest coherent changes, state-machine invariants, no bloat.
G. **Tests and evidence:** exact command/results, simulated vs real browser vs independently verified cloud files; coverage of restarts, 50–100 attempts and failures.
H. **Risks and blockers:** known remaining failure modes, any owner action needed.
I. **Release gate verdict:** PASS or BLOCKED and reasons. A green syntax/unit suite alone is NOT a pass.

## Final directive

REDOWN must not save 1–2 files to each provider and then become completely inert. A delivered native context-menu event MUST be accepted, durably accounted for, executed when authorized, or produce a clear failure and recovery route. A completed user Cloudflare authorization must lead to an accurately represented authentication outcome, not indefinite LOGIN with no explanation.

**Find the first failure. Prove how it propagates. Repair the root causes. Prevent silent recurrence. Validate sustained operation. Do not declare this P0 fixed without evidence.**
