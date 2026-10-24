# FW-REDOWN-P2-R2-API-PARITY-20261023 — Live Adapter and Agent Verification Contract

Status: SPECIFIED / NOT IMPLEMENTED. This record is a Forever Works purpose-and-evidence handoff, not proof of REDOWN production readiness.
Repository: thanks-cohn/REDOWN
Origin baseline main: db694ad68395aca492af11d875c97d012c520c48
Record identity: fw.redown.phase2.r2-api-parity.2026-10-23.v1
Owner intent: A single documented, secure, provider-independent filesystem API must power every UX/UI operation and permit cold agents to independently inspect, test, verify, diagnose, and repair it.

## Purpose and non-negotiable obligations
- Treat local and remote locations as consistent provider-scoped file systems without hiding semantic differences.
- All user actions (browse, select, search, sort, metadata, preview, download, upload, mkdir, copy, paste, move, rename, delete, batch, progress, cancel, retry, resume where supported) map to the canonical engine; the UI must not duplicate transfer logic.
- Explicitly report unsupported provider capabilities and verification strength. Never interpret a cloud acknowledgment as byte-integrity proof.
- Destructive moves cannot delete the original until the destination is committed and independently verified under its declared assurance policy.
- Every agent invocation has identity, bounded authorization, idempotency key, typed errors, observable state transitions, and a durable evidence trail.
- Cold agent discovery must explain API signatures, schemas, examples, constraints, source locations, runtime dependencies, tests, and limitations; machine-readable indexes take precedence over prose alone.

## Cloudflare resources (created and independently confirmed by connector)
Account: use connected Cloudflare account; never store account credentials in repo.
- test-1-new: test-only bucket with public r2.dev access ENABLED; https://pub-25920d47f1304399ac6595978b656919.r2.dev
- test-2-new: test-only bucket with public r2.dev access DISABLED; no public URL for intended use.
Names and exposure are deliberate. No production bucket is authorized for mutation. Public fixture objects must not contain confidential data. Do not disable privacy protections elsewhere.

## Current implementation evidence / limits
- docs/phase2/ENGINE_API.md; extension/file-engine/contract.mjs; simulation.mjs; schema.json
- docs/phase2/WALKTHROUGH_AND_ACCEPTANCE.md; extension/file-engine/acceptance.mjs; tests/phase2-engine.test.mjs
- docs/reliability/UNIFIED_AGENT_API.md; agent/diagnostics/registry.json
- Version 0.1.0 currently supports fake-r2/fake-drive only; state journal and simulation-only verification exist.
- Browser QA entry: window.RedownBetaQA. Unified gateway is currently read-only inspection; not a live file mutation service.
- Repository reports 20 focused Node tests, 12 simulated core checks, 34 browser feature cases passing; 10 historical failures in a 395-test run. These are recorded claims, not fresh live acceptance.
- Live Cloudflare connector verified authenticated account access, bucket listing, object listing/reading. THIS IS NOT REDOWN ENGINE PASS EVIDENCE.

## Required architecture
1. Provider-neutral FileIdentity and ProviderCapabilities types; account/container/object identity; provider-independent canonical operations and explicit feature negotiation.
2. Provider adapter interface with list/pagination, stat, byte-stream read/write, server-side copy when available, conditional mutation, multipart/resume availability, delete, revisions/etags/checksums, auth refresh and typed failures. Never assume S3 paths equal Drive object IDs.
3. Executor/coordinator independent of provider adapter, UI and transport. Durable journal, checkpoints, bounded retries, exponential backoff, cancellation, uncertain outcome reconciliation, dedupe, concurrency/rate limiting and byte-level verification.
4. Same engine invoked by UI, CLI, headless harness, browser QA and permission-scoped agent entry. Inspection API and mutation API may be separate security domains but must share authoritative operation IDs and schemas.
5. No credentials in logs; redact object contents and private key names as appropriate; structured opt-in evidence export; least-privilege tokens.
6. All operations must expose inspectable preconditions, outcomes, irreversibility, state and recovery guidance.

## Verification harness specification
- Tier 0: compile/type/schema/lint/syntax, API examples validation and registry consistency.
- Tier 1: deterministic in-memory provider contract, fixtures, property-based/path-edge tests and idempotency.
- Tier 2: isolated R2 emulator/local integration with fault injection: network interruption, 401/403, 404 ambiguity, 409/412, 429/503, short reads, checksum mismatch, duplicate requests, crash/restart, pagination mutation, folder prefixes and Unicode.
- Tier 3: connector-authorized live Cloudflare R2 tests, using test-1-new and test-2-new ONLY and unique per-run prefix e.g. __redown_test__/run-id/. No test may overwrite pre-existing objects. All deletions restricted to exact manifest-owned fixtures with post-delete verification.
- Tier 4: real Chrome extension/UI-to-engine parity, keyboard, drag/drop, selection, previews, progress, errors, responsive viewport and accessibility.
- Tier 5: cross-provider adapter conformance with a SECOND REAL PROVIDER before multi-cloud release, plus benchmark comparisons against rclone/other products using identical workloads and honest measurements.
- One command must execute each tier where authorized; nonzero exit for failures. CI runs deterministic tiers; live tiers gated by explicit environment and credentials.
- Report manifest includes git SHA, versions, provider, authorization scope, fixture namespace, tests, assertions, operation IDs, timestamps, redacted traces, expected/observed hashes, source preserved flag, per-operation verification strength, cleanup inventory and unresolved conditions.
- Negative cases must prove failure safety, not merely return an error. Simulated assertions are never promoted to live evidence.

## Concrete conformance cases
list pages (including >1 page); stat; create folder; upload 0 B, text, binary, Unicode names and medium/large multipart; download/readback SHA-256; copy same-bucket and cross-bucket; safe move; rename; recursive folder semantics; delete exact target; duplicate conflict; cancellation; restart; access denied private anonymous; public read of fixture on test-1-new; anonymous denial on test-2-new; credential expiry; rate-limit retry; concurrent conflict; source retention on failed destination; cleanup correctness. Implement only what provider APIs can actually express and report supported/fallback/unsupported accurately.

## Required handoff and acceptance
Build a smoke test and reusable conformance test library (not a one-off script). Emit machine-readable API reference, examples, feature-to-method matrix, error taxonomy, adapter compliance report, production-readiness gate, security notes and a cold-agent START-HERE guide. Link each purpose and obligation to implementation symbols, test IDs and evidence artifacts through Forever Works records; keep unresolved gaps explicit. Do not claim ready until installed UI and real R2 have been exercised with destination readback. Record immutable evidence; avoid unrelated production changes.

## Next agent workflow
Inspect current main and baseline, identify and preserve sound code; propose incremental migration; implement adapter and harness in isolated branch; run offline tests first; verify private/public flags and isolated fixtures before any live write; conduct live tests; repair failures; publish evidence and executable commands; open PR. Never modify arbitrary buckets, Workers, production access policy, or user data.

## Design decision log
D1: API-first; interface is a client. D2: Provider capability negotiation over lowest-common-denominator deception. D3: Verification evidence stronger than logs. D4: All data-destructive testing scoped to newly created isolated fixture keys. D5: Forever Works cold-agent discoverability is a mandatory deliverable, not post-hoc documentation.
