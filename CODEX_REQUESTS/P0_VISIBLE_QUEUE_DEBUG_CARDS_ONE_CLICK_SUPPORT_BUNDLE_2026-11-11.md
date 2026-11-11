# CODEX P0 — Visible Save Queue, Debug Failure Cards, and One-Click Diagnostic Flight Recorder

**Repository:** thanks-cohn/REDOWN ONLY
**Date:** 2026-11-11
**Status:** owner-directed request / NOT implemented or verified by this document
**Priority:** P0 reliability and root-cause observability
**Preserve:** all user History, OAuth credentials, cloud files, destinations, current provider engines and unmerged branch work
**Do not change:** thanks-cohn/Click2Cloud
**Previous investigation:** CODEX_REQUESTS/P0_MULTICLOUD_FREEZE_CLOUDFLARE_OAUTH_2026-11-10.md
**Relevant main source reports:** ROOT_CAUSE_REPORT.md and FIX_REPORT.md at c2be0d1

## 1. Owner's purpose

The owner wants to systematically compare the SAME web file sent to Google Drive, Dropbox, OneDrive and Cloudflare R2. A blocked or failed save should be immediately visible on the relevant REMOTES card, while a real queue and one-click export allow engineers to determine whether the cause was the website/source, a provider's requirements, an authorization problem, or a stalled job.

**Reliability objective:** Every native right-click event REDOWN receives must be durably accepted into its intent/attempt accounting, and must eventually reach a verified successful save or a truthful, actionable blocked, failed or uncertain outcome. This does not mean every website necessarily allows its content to be retrieved. Never fake a 100% remote-save success rate. Measure separately: received-click accounting, recoverable workflows, genuine verified completions, and accurately classified unavoidable failures.

**Observed real-owner History errors:**
- OneDrive BLOCKED: `Source size is not known; OneDrive upload sessions need an exact byte count.`
- Google Drive BLOCKED: `The source returned a web page rather than a file.`
- Dropbox: QUEUED, which is *admission* only and must not be treated as an upload result.

The owner's prior redacted `redown-save-attempts.json` demonstrated received native events and many successful, blocked and uncertain attempts, including some that stopped after SOURCE_REQUEST rather than reaching PROVIDER_WRITE. It did not include exact provider/source exception codes. The existing recorder and History are the foundation for the proposed diagnostics.

## 2. Shelf navigation and the new aesthetic Queue button

**Existing visual architecture:** The Shelf currently has navigation FILES / REMOTES / HISTORY / SETTINGS and a top-right home button (`#dashboard`, "Open REDOWN Home"). Do not redesign or displace these working controls.

- Add a clean, visually balanced **QUEUE** button with a `list-todo`-style icon (three ordered rows with tiny checks or dots), the text `QUEUE` and a small live count of pending, processing or attention-needed jobs. The count MUST reflect authoritative queue state; do not count verified completions as pending. Keep the icon compact, recognizable and consistent with existing Shelf themes (Neon and standard). Use a real accessible button/link with keyboard activation, tooltip and labeled count.
- Preferred location: as a fifth Shelf navigation destination, or an adjacent compact pill integrated with that navigation if there is insufficient horizontal width. The existing four navigation items must remain legible on narrow Shelf widths; responsive layout, not overflow.
- Clicking QUEUE opens a **real Shelf Queue location/view**, not just a counter, decorative drawer, or misleading copy of History. The view includes active, queued, awaiting auth, uncertain and failed items with grouping/filtering. Use shared canonical states from existing queue/attempt/receipt APIs. Closing and reopening Shelf must not discard data.
- **When in QUEUE:** The existing **Home** button MUST remain in the **top-right**, with unchanged current action, icon, accessibility label and visual position. It is not to be replaced by the Queue button or the Back arrow.
- Within the Queue view, show a separate **diagonal arrow pointing up-left `↖`** at the upper-left of the Queue content header. This is the **Back** control. Small premium outline glyph, clear hitbox and tooltip `Back to previous Shelf view`, and accessible name. When clicked, return to the immediately previous Shelf section (FILES, REMOTES, HISTORY or SETTINGS) that actually opened Queue, preserving its navigation state, scroll position and current selection where safely possible.
- Back is **not Home**, and should not send the user to the external dashboard. The Home button continues to open REDOWN Home exactly as before. Back should only navigate within the Shelf. If a user opens Queue directly without a known prior Shelf view, fall back to REMOTES (not a broken browser-history route). Avoid history-stack loops when entering Queue repeatedly.
- Support browser back/forward and hash navigation coherently with existing Shelf route state. Preserve accessibility focus when returning, avoid reinitializing Explorer and avoid Shelf vertical flicker on tab changes.
- The Queue view header should be visually quiet and information-dense: `↖  Queue` plus succinct `X active · Y need attention`, while the Home icon remains fixed at the top right. No giant status banners in signed-out FILES.

### Visual behavior concept (not code)

    SHELF HEADER                                  [Home icon]
    FILES   REMOTES   HISTORY   SETTINGS   [☷ QUEUE 3]

    [↖]  QUEUE                         2 active · 1 needs attention
    --------------------------------------------------------------
    [Dropbox]       image.webp       QUEUED       View
    [OneDrive]      image.webp       BLOCKED      Source size unavailable
    [Google Drive]  image.webp       BLOCKED      Source returned HTML

The actual live queue must not invent filenames or expected statuses. The illustration above is an example of hierarchy only.

## 3. Debug Mode: red failure signal on affected REMOTES card

- **Debug Mode ON:** A provider card whose most recent *definitive* save outcome is BLOCKED or FAILED **flashes red twice** with restrained premium border/halo animation, then retains a small persistent red status icon/outline until acknowledged or superseded by a newer known state. Respect `prefers-reduced-motion` (static state only). The signal should be available if Shelf opens after the failure; do not flash cards for failures that occurred before this debug session unless intentionally reviewing their state.
- Include a precise sanitized reason when available: `SOURCE_RETURNED_HTML`, `ONEDRIVE_SOURCE_LENGTH_UNKNOWN`, `PERMISSION_DENIED`, `AUTH_REQUIRED`, `QUEUE_FULL`, etc. Provide direct click-through to the exact Queue/History item and diagnostic attempt ID.
- **QUEUED / ACTIVE / VERIFYING:** neutral progress or pending indicator; NEVER flash red just because the upload is not instant. A stalled item becomes amber NEEDS_ATTENTION after a defensible state-dependent timeout, with a clear cause or required check.
- **UNCERTAIN after PROVIDER_WRITE:** amber instead of a definitive red "not saved". The file might exist; instruct user to check provider before retrying, and never automatically replay a possibly committed file.
- **VERIFIED SUCCESS:** existing legitimate success animation and counters only after provider-confirmed proof. Do not count right-click acknowledgement, queue admission, animation or timer as proof.
- **Debug Mode OFF:** preserve current established subtle bottom-left failure laser/history behavior without adding noisy flashing provider cards; preserve accessibility and ordinary success UI. Do not remove programmatic diagnostic tracing merely because visual Debug Mode is off.
- Correlate all statuses with canonical `attemptId` and exact provider; no card-wide global red state for an unrelated provider, no misleading cross-provider condition.

## 4. Unified visible queue backed by the existing silent queues

REDOWN already has individual provider-specific durable queues and transfer projections. Do **not** build a second competing upload engine. Build **one read-only-first aggregator and canonical UI/API projection** over existing provider jobs and the new attempt recorder. Later API commands for retry/pause/cancel must route to the correct owning provider state machine; no ad hoc duplicate sends.

Each visible row should show, where known:
- stable attempt ID, file name or redacted fallback, source origin/site label only when privacy-approved
- selected provider and exact destination reference
- time received, last activity, queue position and priority (if applicable)
- received / waiting-for-login / queued / active / fetching / uploading / verifying / verified / blocked / failed / uncertain / cancelled / needs-attention
- byte totals and progress only when actually known; no fabricated percentage for unknown length
- precise safe error code and actionability (Reconnect, review site, Check destination, Retry when eligible, Cancel, Remove)
- cross-link to History verified receipt or blocked attempt, and troubleshooting trace

Queue promises:
1. A received click has an immediately traceable journal entry before any provider early return. The queue UI may show a separate "Attempt only" record where admission did not occur.
2. Distinguish queued intent from buffered source bytes, uploaded bytes, and verified cloud file. Neither a URL nor queue row guarantees source remains retrievable.
3. A queued Dropbox transfer must advance or show *why* it cannot: waiting on auth, worker wake/alarm, source accessibility, queued behind active job, bounded retry, stalled worker or non-retryable error. Queue status cannot remain `queued` forever without a documented timeout/attention state.
4. Browser restart, worker suspension or Shelf closure must not erase valid pending intent; reconcile on restart from the authoritative store, never blindly replay uncertain commits.
5. Use provider-scoped concurrency, rate/backoff and resource budgets; do not let a OneDrive failure poison Dropbox/Google/Cloudflare.
6. Provide simple filters: All, Active, Waiting, Needs attention, Completed; keep a small recent window and archive older outcomes in History. Avoid unbounded client UI/render work.
7. Any Retry must validate authorization, exact previously chosen destination and provider proof/idempotency; require user confirmation for uncertain writes.
8. One canonical API (e.g. transferQueue.list/get/subscribe/eligibleActions) feeds GUI. Document observed truth versus speculative status, and do not introduce secret parallel upload code.

## 5. One-click comprehensive forensic export

Extend the existing `Export support bundle` and `Export save attempts` features into **one compact `REDOWN-DIAGNOSTIC-YYYY-MM-DD.zip`** launched by a button such as `Export Diagnostic Bundle`. This is an explicit local download; never upload it automatically.

Use the existing source-of-truth diagnostics, authorized storage snapshots and queue projections. Contents should be small, bounded, versioned and useful without source-code access:
- `SUMMARY.md`: automatic failure counts by provider and code, last-success / first-failure transition, incomplete attempts, queue stalls, key correlations, missing evidence, environment scope and honest confidence.
- `attempts.json`: bounded correlated save-attempt traces with exact sanitized stage/outcome/reason enums and timings, including when tracing/persistence unavailable.
- `queue.json`: provider states, pending/active/retry timers, admission reason, phase, last activity, safe counts, reconciliation keys.
- `history-reconciliation.json`: count and linkage of received clicks → jobs → History/verified receipts → counters; no made-up successes.
- `environment.json`: extension/app version, build commit if baked in, browser version if available, extension worker startup/interruption observations, enabled Debug flag, schema versions.
- `source-and-provider-failures.json`: redacted file-acquisition and provider-response diagnostics with allowed fields below.
- `README.md`: privacy warning, redaction scope, what data can and cannot prove, retrieval instructions for Codex/Claude.

**Essential added observability:**
- HTTP response status, safe response Content-Type, present/absent/invalid Content-Length, Content-Encoding, redirect-follow policy/outcome, whether HTML or actual bytes were observed, source method and optional response-size range.
- Provider-specific error code, sanitized server category/status and phase (without response body tokens); OneDrive exact length rejection, Google page-versus-file mismatch and Dropbox queue stalls should be immediately distinguishable instead of generic PROVIDER_FAILED.
- Stage duration and terminal decision; distinguish source acquisition failed BEFORE any upload from provider write/verification failed AFTER possible upload.
- Local time correlation of errors and successful retries to the same asset when available, using privacy-preserving stable identifiers only.
- An explicit evidence gap marker when Chrome didn't deliver a click, worker died, storage was inaccessible or provider status was unavailable.

**Privacy and safety:** never export OAuth tokens, cookies, private keys, raw signed URLs, source/page URL query parameters, private file bytes or account-scoped secrets. Default to redacted host/category; if exact private URLs are ever necessary, require a separate deliberate review/consent flow and never add them silently to a support bundle. Include disclosure/preview of metadata fields and size bound; warn user before sharing. Protect extension-private logs from foreign frames/websites.

## 6. Investigate the actual user failures, don't merely relabel them

**OneDrive unknown source length:** The current `extension/onedrive-api.js` explicitly rejects a network response without a valid positive Content-Length (`ONEDRIVE_SOURCE_LENGTH_UNKNOWN`) before Graph's upload session, because OneDrive upload ranges need an exact count. Reproduce sources with chunked transfer, compressed encoding, no Content-Length, malformed headers, denied access and short/truncated bodies. Evaluate a **bounded, transparent, authorization-safe source pre-materialization strategy** (stream to bounded temporary storage or RAM only when appropriate) which determines actual byte length before initiating OneDrive upload; preserve larger-file support via a proven streaming alternative where available. Do not fabricate content length, silently exhaust RAM, persist unrestricted user content, or bypass access controls. Expose exact failure and a safe site-specific recovery action when acquisition is impossible.

**Google HTML rather than file:** Source may be an HTML landing page, auth gate, hotlink protection or other site-returned page. Distinguish response status, safe content type, first-byte sniff against expected media, redirects, source URL choice and source permission. Never upload an HTML page labeled as an image. Offer a legitimate supported way to target the actual asset or use user-authorized browser bytes when technically available; never bypass paywalls, cookies or security without permission.

**Dropbox QUEUED:** Instrument enqueue → wake/alarm → pump admission → source fetch → upload → verification/receipt, and document whether queue remains queued due to provider concurrency, unfulfilled auth, worker suspension, permissions or a real service error. Show time in queue and whether the job was resumed. Queue accepted is not completed; never increment counters until verified.

**Cloudflare:** Preserve TRUE REMOTE Worker fetch; do not silently route R2 through browser disk or use an unverified completion. Prior OAuth recognition failure remains P0 if it persists despite observed completed save attempts; independently reconcile UI login state with token/account/Worker readiness and verified R2 object existence.

## 7. Verification and release gates

- Mock tests for failing source HTML, unknown size, Dropbox permanently queued, auth denied, stale connected, worker restart, queue full, history unavailable, storage unavailable, uncertain commit, correctly verified success, safe retry/reconciliation.
- Real installed Chrome checks: same *legitimately accessible* image/link across all four provider destinations, new sources and formats, 50+ attempts, browser restart and service-worker suspend/restart, with actual destination files checked. Record why a site is unsupported rather than claiming every source must be retrievable.
- UI acceptance: actual correct provider flashes twice red only on definite failure in Debug Mode; other providers untouched; amber uncertain; queued neutral; reduced-motion static; persistent badge; tap → exact attempt. Test narrow side panel, keyboard/a11y, several Shelf themes.
- Nav acceptance: Queue button icon + live pending count; Queue view with working upper-left diagonal `↖ Back` returning to prior Shelf section, current Home button stays top-right unchanged; reload/deeplink fallback and no navigation loops.
- Bundle acceptance: one click exports a valid, parseable, bounded ZIP; files present with coherent stable attempt IDs, rich precise codes and automatic summary; no sensitive tokens/URLs; offline diagnostics do not trigger network actions; export works for partial storage failure with clear missing-data declaration.
- Full reliability gates must be evaluated honestly. Explicit PASS/BLOCKED by category; distinguish fixture tests, installed Chrome, and real provider verification. Do not say 100% real saves succeed unless backed by a defined production-like test and independently checked receipts.

## 8. Repository and change-safety instructions

Work in REDOWN only, preferably a dedicated P0 fix branch from the latest appropriate base. Never modify main directly, Click2Cloud, live buckets, production OAuth credentials or existing files without explicit consent. Do not overwrite queues/History, reset credentials, or clean local untracked files. Preserve API-first design, verified remote success semantics, the extension's privacy requirements and existing visual layout.

**Required delivery:** exact source fixes, tests and real/browser limitations, concise design changes, and sample redacted one-click diagnostic ZIP proving it makes the recent Google/OneDrive/Dropbox failures specifically diagnosable. The request itself is not a fix.
