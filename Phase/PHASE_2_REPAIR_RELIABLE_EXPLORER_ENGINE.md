# PHASE 2 — Repair: REDOWN Explorer & File Operations Engine

**Status:** Owner-directed engineering charter; not an implementation-complete claim  
**Date:** 2026-10-23  
**Repository:** thanks-cohn/REDOWN  
**Priority:** Critical correctness and recoverability before feature expansion  
**Working title:** **PHASE 2 — Repair: The Reliable Explorer and Universal File Operations Engine**

## Mission

Make REDOWN's file explorer and underlying operations engine exceptionally dependable, transparent, performant, and maintainable. The existing interface has roughly the intended shape. Its internals have too many failure modes. We explicitly authorize substantial **selective reconstruction** of unreliable inner workings where evidence shows that incremental patching is less safe than replacement; this is **not** permission for a blind, all-at-once rewrite or loss of known working behavior.

Design for twenty-year survivability: browser API changes, provider replacements, new execution locations, and language/framework migrations should normally require replacing an adapter, not reimplementing the user's workflows. Our competitive benchmarks include SaveAnywhere, rclone, ShareX, Google's right-click Drive integrations, and serious multi-cloud explorers; no superiority claim is accepted without independent user-journey measurement.

**Product invariant:** When REDOWN reports an operation complete, its outcome must be established at the stated verification strength. When it cannot establish the outcome, it must say *unknown/partial* and preserve a safe recovery path.

## Primary decision

Create **one canonical, versioned REDOWN File Operations Engine API** as the authority for operation intent, source/destination identity, execution state, failure taxonomy, and verification evidence. Keep the current polished REDOWN interface as a consumer. Do **not** build another competing diagnostics or provider API. Existing agent/explorer, agent/diagnostics, and runtime APIs are valuable observation/inspection interfaces but are **not** currently the operational file engine; adapt them to observe the canonical engine.

The engine delegates provider-specific calls to capability-declaring adapters (first Cloudflare R2; next Google Drive as architectural proof, then others). The Chrome/MV3 interface and future desktop app are separate clients; browser, Worker, and local helper executors are distinct execution adapters. Never imply a provider is implemented simply because its adapter is planned.

## Evidence, not assumptions

Start with: `FOREVER_WORKS/README.md`, `CURRENT_STATE.md`, `FAILURE_ATLAS.md`, `GAPS_AND_MIGRATION.md`, `PROVIDERS.md`, `COLD_AGENT_START_HERE.md`, `CONSUMER_PRESENTATION_CAPTURE.md`, `COMP/README.md`, `COMP/AGENT_API_STRENGTHENING_HANDOFF.md`, and current source/tests. The preservation checkpoint `424f29e5a4216085fa24ffd1a48b79f4123d6f8f` reported 365 local passing tests and 10 failures, including stale Explorer architecture anchors. That is **historical local evidence, not live Chrome/provider certification**. Re-run against current HEAD before proposing fixes; preserve frozen historical artifacts instead of silently rewriting them.

Known high-risk areas from the preserved failure atlas (verify current state independently):
- Cross-bucket Copy/Move/Paste HTTP 404 despite preview/download working; identify exact account, bucket, key, worker, binding, and runtime version at every hop.
- BUG-019 directory-merge/keep-both safety; source fixes exist, but installed data-integrity acceptance remains unverified.
- Non-atomic upload absent-check followed by PUT; overlapping writers and ambiguous retries must be safe.
- Job and File object lifetime bound to settings page; crash/browser restart persistence missing.
- Missing/mislabeled right-click destinations, stale menu rebuilding, 403 auth vs permissions, provider binding uncertainty.
- Explorer diagnostic source-map staleness, test failures, license/release issues, missing live acceptance.
Do not mark any incident resolved on the strength of a historical report or mocked test alone.

## Nonnegotiable engine contracts

1. **Identity:** stable logical operation and item references include provider, account, namespace/container, provider-native ID or exact key, version/etag when available, and case/path semantics; never assume filename is identity.
2. **Operations:** list/tree, cursor pagination, stat, search, inspect/properties, new folder, copy, cut/paste, move, rename, delete, upload, download, preview, and restore/retry; clearly distinguish UI clipboard intent from actual writes.
3. **State machine:** requested → validated → planned → queued → executing → verifying → completed, partially_completed, blocked_auth, failed, cancelled, or **uncertain**; record durable monotonic events and permitted transitions.
4. **Planning & capabilities:** declare atomicity, case sensitivity, native move/copy support, conditional writes, versioning, permissions, limits, checksum support, cursor semantics, and cost/executor constraints. Never simulate nonexistent provider guarantees.
5. **Safety:** source is untouched during copy; a move may remove source **only after** destination verification to the required strength. Never silently overwrite or merge distinct directory identities. Destructive cleanup requires exact target, conflict policy, applicable confirmation, and auditability. Support safe dry-run plans.
6. **Durability:** idempotency keys where feasible, persistent job journal, source/destination receipts, safe retry/reconcile after ambiguous response, crash-safe stage checkpoints; identify unresumable local File handles honestly.
7. **Verification:** distinguish accepted API response, object-exists/metadata check, provider checksum, and verified content hash; surface actual evidence and remaining uncertainty. Avoid claiming cryptographic verification where impossible.
8. **Observability:** trace UI → engine → executor → provider → verification → user result with operation/correlation IDs, stage, timestamp, request identity fingerprints, response/error class, and recommended recovery. Redact credentials, signed URLs, and private content by default. Read-only diagnosis must not provision resources or mutate cloud files.
9. **Compatibility:** typed machine-readable versioned schemas; explicit migration of persisted data and settings; client-adapter version negotiation; provider-specific contract tests; replaceable Chrome MV3 boundary; avoid in-memory service worker globals as durable truth.
10. **Performance and experience:** responsive, incremental explorer navigation with complete listings and stable selection, bounded resource use, accessibility, keyboard/mouse parity, and refined visual feedback. Success animation/odometer must reflect verified outcomes; notifications and sound remain opt-in.

## Milestone recovery map (gated, no calendar promises)

### R0 — Freeze and reproduce the current truth
- Capture HEAD SHA, release/build artifact and manifest, dependency lock, known usable workflows, current failure inventory and tested rollback.
- Run baseline tests, reliability checks, architecture validation and existing Explorer smoke presets; distinguish fixture, installed Chrome, and live provider evidence.
- **Exit:** an independent agent can rebuild/test the baseline, identify known failures, and restore the previous verified artifact.

### R1 — Eliminate critical data-safety defects
- Isolate repros for cross-bucket 404, wrong source/destination bindings, directory merge/overwrite, upload races, ambiguous write/retry, permission/auth issues.
- Freeze unsafe destructive routes behind explicit safe failure gates until validated. Apply targeted emergency fixes; do not mask failures by rewriting test expectations.
- **Exit:** authorized real-provider tests demonstrate correct bytes/keys/identity and no data loss across copy, cut/paste, move, delete and conflict scenarios; previously open severe issues have evidence-backed disposition.

### R2 — Specify and test the canonical engine
- Publish semantic operation contracts, typed request/response and event schemas, capabilities, identity rules, verification levels, error taxonomy and transition table.
- Build deterministic fake-provider and fault-injection fixtures: 404, 403, 429, timeout after accepted PUT, stale cursors, duplicate names, concurrent writers, crash/restart, malicious/malformed metadata.
- **Exit:** one inspectable test harness can predict valid transitions and verify obligations without Chrome or cloud credentials.

### R3 — Durable coordinator and recovery journal
- Implement crash-safe operation and receipt persistence, reconciliation, resumability constraints, idempotency policy, cancellation semantics and per-target partial results.
- **Exit:** close/reopen and simulated interruption tests never fabricate DONE or double count; uncertain jobs are interrogated rather than blindly replayed.

### R4 — Reconstitute R2 operations behind an adapter
- Migrate Copy/Move/Paste/Rename/Delete first; then Upload/Download/List/Search/Preview as contract coverage allows. Use per-operation parallel verification and reversible cutover, not a big bang.
- Preserve correct existing Explorer appearance and interaction; route both UI and diagnostics to canonical state.
- **Exit:** all prior verified R2 journeys and new failure tests pass through the engine; legacy paths are retired only after parity and rollback proof.

### R5 — Second-provider portability test
- Add a fake second provider before a real Google Drive adapter. Account for Drive-native files and IDs; **Google Drive is not Google Cloud Storage**.
- **Exit:** R2 and Drive share one explorer, clipboard, queue, verification/error presentation, and operation model without provider-specific UI forks.

### R6 — Flagship explorer quality and competitive benchmarking
- Audit full hierarchy, very large paginated folders, keyboard navigation, search, copy/paste, file metadata, preview, and task progress at modest hardware/viewport sizes.
- Benchmark task success, first-save time, failure diagnosis/recovery, responsiveness and accessibility against named alternatives. Apply the minimalist/steampunk/spacecraft design system *on top of verified states*.
- **Exit:** published reproducible results demonstrate which workflows REDOWN wins and where it still trails. Do not claim universal supremacy.

### R7 — Twenty-year maintenance and reconstruction discipline
- Cross-browser/browser-version compatibility suite, contract versioning, migration tests, reproducible builds, dependency/license audits, security and permissions checks, provider compatibility probes, cold-agent handoff/rebuild drills.
- Maintain Forever Works with **current** source links, accepted purpose/obligation boundaries, tests, recorded design/motion details, failed cases, and migration recipes; old historical records stay frozen.
- **Exit:** cold engineers/agents can replace an integration boundary and prove parity without original developer conversations.

## Implementation rules

- Prioritize correctness over expansion. No new cloud integrations until R1–R4's relevant safety gates are met.
- Rebuild a subsystem when measured coupling and defects make replacement safer; retain a compatibility façade and rollback until proofs pass. Reuse sound components, tested semantics and UX rather than rewriting for its own sake.
- No cloud mutation, automatic deployment, credential access, production cleanup, or live repair as a side effect of inspection; live acceptance uses separately authorized safe test data.
- Use explicit acceptance evidence: exact commit, tests, environment, provider scope, logs/receipts (redacted), unresolved unknowns.
- Prefer formal obligations over accidental implementation details: purpose-preserving reconstruction is allowed only when successor behavior meets operational, safety, UX, accessibility and traceability obligations.
- Work remains incremental and reviewable; each milestone includes a current-state diff, regressions, migration and rollback notes. No silent data schema changes.
- Do not conflate Chrome UI, Cloudflare management API, Worker binding, bucket storage, or local helper: these are separate execution/trust boundaries.
- Preserve the working user-facing shape while treating inner-engine reimplementation as a permitted, potentially major undertaking.

## First Codex/Work assignment

**Do R0 and R1 assessment first, then R2 contract design—not a total rewrite.** Inspect current HEAD, Forever Works, failure atlas, operations source, tests and installed-version uncertainty. Report exact call pathways for Copy, Paste, Move, Rename, Delete, Upload, Download, List, Search; compile a failure priority matrix and identify shared state/logic to retain versus replace. Run read-only/local tests, design a canonical engine API and deterministic fake-provider suite, and propose the smallest safe first implementation PR with reversible migration. State any missing evidence explicitly; do not declare success or mutate live cloud storage without separate authorization.

**North star:** the user can save, copy, move, find and recover any supported file, on any supported cloud, and REDOWN can explain *what, where, when, why, how, and with which verification evidence* every time.
