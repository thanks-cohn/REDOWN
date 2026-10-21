# Codex request: REDOWN runtime diagnostics and premium release assurance

Status: implementation request, not implemented capability or release certification.
Repository: `thanks-cohn/remote-download-2-cloudfare` (private).

## Mission

Build an extensive, documented, programmatically queryable runtime debugging and verification surface that lets a new agent investigate REDOWN without guessing, reproduce defects, distinguish causes from symptoms, implement scoped corrections, and prove what actually works. Use it to stabilize the product and determine whether a specific build deserves release-candidate status.

Primary priorities are connection recovery, progressive account-wide search, real installed-extension regression testing, and exact-package store preparation. Also investigate any other barrier to a dependable, polished premium extension. Deliver working diagnostics and verified improvements, not just a proposal, a dashboard of simulated successes, or more source-inspection summaries.

Keep the ordinary interface simple and beautiful. Detailed diagnostics belong behind Debug Mode or in a separate development harness. A failed operation should still provide an understandable ordinary-user message, a correlation code and a useful recovery action.

## 1. Read first and establish current truth

Read `AGENTS.md` and its required references, including engineering handoff, architecture, operation/message catalogs, debug design/API/implementation reports, semantic coverage, and current pre-submission checklist. Inspect the current default branch and store branch; do not assume historical checklist items remain open or fixed. Reconcile resolved items against evidence without erasing the historical record.

Inspect actual code paths for Cloudflare authentication, token refresh, API requests, Worker provisioning, storage listings, Explorer/search, transfers, retries, history, menus, preview state and packaging. The primary extension Worker is embedded `WORKER_SOURCE` in `extension/background.js`, bound to `STORAGE`; `worker/src/index.js` is a different `ASSETS` implementation. Its health is not proof the extension Worker works.

The existing `agent/debug` API is offline and read-only, with frozen 0.1 contracts. Existing semantic navigation does not establish live browser access. Preserve those boundaries and golden fixtures. Implement new runtime capabilities in an explicitly versioned namespace rather than silently expanding read-only operations into network/deployment executors. Never refresh frozen evidence hashes to conceal drift or weaken failing assertions.

Produce an initial findings matrix: capability, actual implementation, known report, source evidence, test evidence, runtime evidence, uncertainty, severity, next verification. Re-measure the current full-suite baseline; earlier failure counts are historical. Classify failures individually, including introduced versus pre-existing failures.

## 2. Architecture and deliverables

Create a small shared diagnostics core, adapters for actual extension runtime contexts, a documented JS API and CLI/harness, versioned JSON schemas, contract fixtures, and an evidence registry. Prefer existing dependencies and cohesive modules over a new framework.

Separate four surfaces explicitly:

1. Offline inspection of code, imported sanitized traces and incident records.
2. Passive runtime observation: extension state, bounded event traces and sanitized health snapshots.
3. Explicit probes: network checks or browser workflows with declared remote effects.
4. Actions: reauthenticate, provision/upgrade Worker, transfer, retry, rename, delete, reset or publish. Never disguise these as health reads.

Discovery must list only implemented capabilities, their adapter availability, permissions, side effects, preconditions and limitations. Missing browser/cloud access must produce `unavailable` or `blocked`, not a green synthetic substitute. Avoid arbitrary code evaluation, unrestricted message execution, shell execution or an externally accessible administrative endpoint.

Expected deliverables:

- Runtime design and threat/privacy boundaries, operation inventory and documented schemas.
- Actual observer/probe adapters, stable query API and reproducible CLI examples.
- Unit, integration, installed-extension and scoped live-cloud test harnesses with distinct evidence labels.
- Sanitized trace export/import and incident/evidence linkage.
- Current readiness report, blocker list and exact-package verification manifest.
- Focused production fixes supported by reproductions, with normal UX preserved.

## 3. Programmatic contract

Design discoverable operations covering the following intentions; names may follow repo conventions. Do not advertise placeholders as implemented:

- Describe capabilities, schema versions, adapter status and supported environments.
- Read runtime/build identity and deployment compatibility.
- Read authentication/recovery state without exposing credentials.
- Read component health and dependencies across Explorer, menus, transfers and previews.
- List/get operation traces, errors, active tasks and recent state transitions.
- Inspect a search session: scope, targets, page cursors, progress, matches, partial failures and cancellation.
- Inspect a transfer: intended destination, resolved destination, attempts, write receipt and verification state.
- Inspect preview/navigation state and stale-request decisions.
- Build a declared verification plan; execute only selected authorized probes.
- Read evidence, incident links and release-gate decisions.
- Export a sanitized bounded support bundle.

Every operation needs validated inputs, documented outputs, stable error codes, request/run IDs, deterministic ordering where appropriate, bounded pagination, cancellation where applicable, and explicit timeouts. Responses must identify partial, stale, unknown, unsupported and unavailable states. Preserve unknown optional fields in portable records where feasible. Include conformance and compatibility fixtures; keep runtime API, incident-record, semantic API and Forever versions separate.

## 4. Structured trace and evidence model

Trace an operation end to end: UI trigger → message boundary → background task → auth/refresh → API or Worker request → actual bucket/key → response → persisted receipt/history → Explorer/preview presentation.

Use correlation IDs across contexts and attempts, parent/child span relationships, durations from monotonic clocks and UTC event timestamps. Record component/context, build identity, operation, attempt, state transition, outcome, stable error code, HTTP status where relevant, retryability, cancellation reason and evidence references. Preserve useful causes without exporting raw responses or private URLs.

Represent intended, resolved and confirmed destinations separately. A public `/assets/` URL route is not a storage directory. A successful UI notification, successful HTTP status, returned key, head/read verification and byte/hash verification are separate observations. Never upgrade weak evidence into stronger verification automatically.

Identify evidence scope explicitly: reported, source-inspected, mock/DOM fixture, local integration, installed Chrome, live Cloudflare, packaged candidate or store-distributed build. Bind results to source commit, extension version, package SHA-256, Chrome/OS, adapter version, test scenario, relevant Worker revision/capability and timestamps. Redact environment-specific identity in exports.

Diagnostics must have bounded memory/storage, retention and rotation, export-size limits, clear/reset controls, and support for service-worker restarts. Instrumentation failure must not break a transfer. Avoid heavy synchronous work, unbounded payload capture and verbose always-on logging. Benchmark its overhead with collection disabled and enabled.

## 5. Connection reliability: explicit state and recovery

Investigate why OAuth can appear approved while menus, Explorer or transfers fail. Model authorization, token expiry/refresh, account authorization, API reachability, Worker authentication, Worker compatibility/deployment and bucket access as separate states. Derive health from observations and freshness, not a single `loggedIn` flag. Track passive unknown/stale separately from confirmed failure.

Cover:

- Idle sessions, expiry boundaries, clock skew, refresh-token rotation/revocation and denied consent.
- One refresh in flight across relevant contexts; concurrent requests wait safely and avoid refresh storms.
- Correct treatment of 401, 403, 404, 409/412, 429, 5xx, timeouts, offline state, network changes and unexpected HTML/non-JSON responses.
- No unbounded retry; honor Retry-After and bounded backoff/jitter. Reads and replayable requests differ from non-idempotent writes with ambiguous outcomes.
- Reauthentication refreshes affected views and menu-location state once, preserving drafts, selections and destinations. Manual Refresh remains available with useful status.
- Refresh/listing does not unexpectedly provision or publish storage; disclose existing repair/deployment side effects and separate them where practical.
- MV3 service-worker suspension/restart, browser restart, settings-tab close/reopen, multiple tabs, account switching and permission revocation.
- Unsupported OAuth scopes must not return; inspect the actual registered/documented flow. Do not add `offline_access` by assumption.

Create a deterministic fault-injection harness for these cases, then an explicitly scoped live-session/soak plan. Accelerated fake-clock tests complement but do not replace real elapsed-session evidence. Document actual observed durations; never claim an hour-long run from a fast mock.

Acceptance: every component recovers or presents a precise actionable state; no disconnect/reconnect ritual is required for a recoverable expiry; permanent failures do not loop; wrong-account operations cannot occur during recovery.

## 6. Progressive account-wide search

Confirm the current path: targets derived from loaded account/bucket inventory; entire bucket listing despite folder context; sequential scans; one final response; top-200 truncation; shared message timeout. Treat these as investigation starting points, not permanent specifications.

Implement a search-session protocol with incremental page/bucket results, bounded concurrency, backpressure, cancellation and stale-query protection. Prefer resumable bounded page work or another MV3-safe design over one long message. Do not rely on an open settings tab or assume a port keeps the service worker alive indefinitely. Document restart/resume behavior and chosen transport.

Provide clear scope choices or labels for current folder, current bucket, selected account and all authorized accounts as actually supported. Enumerate targets with visible partial inventory errors; failed bucket inventory must not silently mean an empty account. Distinguish filename/path matching from file-content search.

Requirements:

- Render early matches while remaining targets scan. Show files examined, buckets completed/total where known, matches and partial errors.
- Grow result pagination as matches arrive. Do not invent a final total while scanning.
- Deduplicate by account + bucket + full object key/type, not basename.
- Keep browsing, selected row and preview stable while results arrive; define ranking/update policy so rows do not jump under clicks or keyboard navigation.
- New query, scope change or navigation cancels obsolete work; late responses cannot replace current results.
- Failure in one bucket preserves other matches and supports retrying failed targets.
- Explicit result/memory/time limits with continuation or truncation notices; no silent top-200 completeness claim.
- Navigation through results works across pagination in preview, expanded preview and lightbox; requests use each result's actual account/bucket/key.
- Empty, scanning, partial, cancelled, interrupted and complete are distinct states.

Test large multipage buckets, duplicate names across folders/accounts, slow/erroring buckets, query replacement, account changes, stale responses, cancellation, restart and preview during incremental updates. Record time to first match and overall progress behavior.

## 7. Transfer integrity and durable recovery

Exercise direct remote-to-R2, supported browser-assisted transfers, direct local uploads and any shipped GitHub path separately. Do not claim a universal cloud-only path when browser assistance is used.

Verify nested/simple destination resolution, profile/bucket switching, normalized prefixes, actual write receipts, history links and rename behavior. Reproduce sequential and simultaneous filename collisions. Downloads should preserve existing objects with compact suffixes such as `photo-1.jpg`; current explicit local-upload skip and Explorer copy conflict policies must remain intentional, documented behaviors unless deliberately revised. Conditional writes must prevent races; failed preconditions must not be reported as success.

Test known/unknown content length, large supported files, content-type inference, unsafe names, zero-byte files, interrupted streams and size limits. Verify the actual final key and bytes with benign fixtures; do not mistake cached public content for object truth.

Define retry semantics for ambiguous write outcomes, idempotency and duplicate prevention. A timeout after a committed upload must not silently create another numbered copy on retry. Ensure queue persistence and restart behavior match the shipped promise. If durable queues are absent, implement the necessary bounded design or explicitly retain a release blocker. Never delete local originals until separately authorized and verified.

## 8. Installed-extension regression harness

Create a repeatable Chrome harness that loads the actual extension artifact in an isolated test profile and interacts with real extension contexts. A jsdom page or mocked Chrome API is useful but is not this layer. Detect unsupported automation/environment constraints and report them precisely.

Use benign controlled fixtures and a dedicated R2 test prefix/bucket. Document permissions, resource effects, expected costs and cleanup ownership. Local/mock tests are safe defaults; live writes/provisioning/deletion need explicit scoped authorization. Never modify a user's ordinary data for a test. Clean up only known resources created by that run under its authorized policy.

Minimum workflow matrix:

- Fresh install/setup and upgrade from an existing supported profile.
- Authorization, expiry, reconnect, browser/background restart and multiple settings tabs.
- Simple/nested destination creation, drag and keyboard reorder, persistence and correct saved folder.
- Remote/local/browser-assisted transfer, simultaneous collision, partial failure and retry.
- Explorer folder pagination, refresh, account switch, selection and stale-response protection.
- Progressive multi-bucket search and result navigation across pages.
- Successful-download Location/row opens exact directory and preview pane without forced page scroll; filename behavior stays intentional; never opens lightbox unexpectedly.
- Preview → expanded → collapsed, preview → lightbox → Escape, repeated transitions, arrows, zoom/context menu and loading transitions. Toolbar buttons must derive from actual state and never leak between views.
- Large lists/files, offline mode, denied permissions and malformed remote errors.
- Settings/history persistence, version migration and safe empty/invalid storage recovery.

Capture assertions, sanitized console errors, relevant state/trace snapshots, screenshots only when useful, and artifact identity. Reproduce failures before fixing; add meaningful regression tests at the correct layer. Keep failures visible rather than catching everything into a pass.

## 9. Premium product quality audit

Audit beyond functional correctness, prioritized by user impact:

- Data safety and accurate success/failure messages; no misleading destination or completeness claims.
- Responsiveness on realistic modest Windows hardware and constrained viewports; define justified budgets and measure actual list/search/preview workloads.
- Bounded memory, lazy media loading, abort/cancel behavior, object-URL cleanup, event-listener cleanup and no background polling storms.
- Clear section hierarchy, compact single-row pagination where space permits, consistent spacing/buttons, long account/path containment and usable narrow layouts.
- Keyboard-only operation, visible focus, accessible names/status announcements, contrast, reduced motion and touch/pointer drag alternatives.
- Reliable user-facing recovery without exposing implementation jargon; diagnostic detail available through Debug Mode.
- Dependency/runtime asset integrity, minimum permissions, remote-code/CSP exposure, injection handling and credential isolation.
- Maintainability: explicit state transitions, one source of truth, documented ownership, no colliding CSS patches or duplicated auth/retry state machines.

Implement justified high-impact fixes with measured evidence. Keep unrelated redesigns and speculative premium features out of the stabilization scope. Mark optional polish separately from launch blockers.

## 10. Store and exact-package verification

Reconcile `docs/PRE_SUBMISSION_CHECKLIST.md` against current source and packaging. Check current official Chrome Web Store/extension documentation when making policy or platform claims; cite authoritative sources and date the review. Do not represent an internal audit as Google approval or legal certification.

Audit shipped permission/host callers, optional access, privacy/data inventory, local credentials/history/diagnostics retention, exports, third-party assets/licenses, listing claims, supported sites/transfer paths and reviewer setup. Hidden/debug features still count if shipped. Do not silently alter licensing or publish a privacy policy with invented operator details.

Validate manifest, packaged assets/icons/fonts, bundled scripts, CSP, absence of secrets/development files, versioning and identity/OAuth redirect compatibility. Build reproducibly from an explicit allowlist; inventory files and hash the final ZIP. Test that exact artifact through an appropriate install/distribution mechanism and record its extension ID and build identity. Distinguish unpacked extracted-package testing, actual packaged installation and store-distributed installation. State unavailable layers honestly.

Do not auto-submit, publish, pay fees or change publisher/account ownership. Prepare reviewable artifacts and identify missing user-supplied identity/URLs. Branch synchronization must preserve store-specific changes; never reset the store branch wholesale to main.

## 11. Sequenced implementation and acceptance

Proceed in independently reviewable stages:

1. Baseline/inventory, contracts, risk map and instrumented operation IDs.
2. Passive runtime adapters, traces, support export and privacy/bounds tests.
3. Auth recovery instrumentation, reproductions and targeted reliability fixes.
4. Progressive search protocol/UI and regression coverage.
5. Transfer integrity/retry scenarios and installed-Chrome workflow harness.
6. Soak/performance/accessibility audits, exact-package checks and readiness decision.

At each stage record what was implemented, commands run, actual outcomes, environmental limits and remaining blockers. Continue all independent work when a live environment is unavailable; leave a precise runnable handoff instead of stopping the entire project or inventing evidence. Update progress documentation so another agent can resume without reconstructing this conversation.

A release-gate record must classify each requirement as passed, failed, blocked, not run or explicitly out of scope, with severity and evidence. A blocker cannot become passed because code exists, a schema validates or a commit is merged. Define separate beta, release-candidate and public-launch decisions. Critical data-loss/auth/security problems block launch; unresolved test failures require diagnosis and explicit treatment. No arbitrary readiness percentage or guarantee of zero bugs.

## 12. Final handoff

Commit coherent changes and push tested implementation to main under the user's standing instruction; do not force-push or overwrite unrelated work. Update the store branch only when requested or separately authorized. Never deploy customer resources merely to publish code.

Provide: implementation summary, API/CLI quick start, evidence matrix, exact test results including known failures, reproduced/fixed incidents, package identity, unresolved launch blockers, available runtime limits, and the next smallest verification step. Link the concrete documents and changes. Keep the ordinary-user final summary concise while making detailed evidence available in the repository.
