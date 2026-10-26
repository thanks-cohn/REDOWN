# REDOWN — Foundation Consolidation and Provider-Neutral Reliability Audit

**Assignment type:** Codex implementation and architecture stabilization, not feature expansion.
**Repository:** thanks-cohn/REDOWN.
**At assignment creation:** main `785a55546c09ecc45752cae32d3276c19c8fddd5`; unmerged `fix/evidence-first-write-diagnostics` at `ad5134f75e884de5a9754eb50d267238d5115920`. Recheck both on start.
**Mandatory baseline:** retain connection-repair changes and diagnostics branch unless specific behavior is proven erroneous.
**Owner mandate:** highest practical standards, provider independence, agent-native maintainability, clear responsibility boundaries, low conceptual overhead, honest real-world verification. Consolidate, don't create another overlapping platform.

## Executive purpose

Stabilize REDOWN's Universal File API, provider adapters, Resource Atlas, AAC, Forever Works, Python Laboratory and newly added diagnostics as **one coherent system**. Avoid premature large-file/multipart work, new providers and GUI expansion. Resolve contradictions, prevent duplicated responsibilities, harden contracts and produce a small, testable consolidation patch.

The previous diagnostic branch fixed two **source-backed** defects: HEAD-based metadata preflight on an R2 OAuth route whose documented API uses GET/PUT/DELETE; and flattening of provider errors into PROVIDER_ERROR without safe HTTP/native evidence. Both write and directory-marker creation hit a common destination-stat preflight. These repairs and fault tests are valuable. **The original Windows/R2 live failure is still UNPROVEN** because the original response was lost. Do not retroactively label it fixed or solved.

## Mandatory first action: read and compare rather than rewrite

- Read `AGENTS.md`, all current phase 2.6–2.8 architecture and runbooks, `FOREVER_WORKS/bugs/FW-REDOWN-LIVE-R2-WRITE-PROVIDER-ERROR-20261025.md`, `docs/architecture/REDOWN_DIAGNOSTIC_STANDARD.md`, the last handoff, schema definitions, source, and actual test evidence.
- Compare the diagnostic branch with main. Trace where the connection repair branch was integrated, confirm branch ancestry and unmerged status, and identify contract and test differences.
- Preserve the tagged read-only baseline, original live reports, immutable proof, previously passing behavior and outstanding 9 Node failures. Do not refresh historical evidence to silence failures.
- Produce a compact **responsibility map before changing implementation**. For Universal API, adapter, scoped session, Resource Atlas, AAC, Forever Works, Python Lab and Doctor specify what each owns, reads, writes, must never duplicate, and who is the authoritative source of truth.
- Produce a **coupling map**: Cloudflare Worker/bucket/REST/OAuth concepts versus truly provider-neutral interfaces. Find leaked provider assumptions, rank by real harm and fix only demonstrably harmful ones in this timebox.

## P0: first make the new diagnostics branch safe to rely upon

Check source and executable tests for these invariants:
1. One authoritative versioned `redown.diagnostic.v1` semantics; generated JS/Python copies and validators mechanically agree; stale generated artifacts must fail CI. Duplicate checked-in distributions may remain if generated deterministically and validated.
2. Stable canonical error taxonomy, bounded sanitized provider-native extensions, causal propagation and `DIAGNOSTICS_LOST` when cause is actually lost.
3. One canonical operation ID and correlated evidence chain; Resource Atlas owns operation observations, not Doctor or Python separately. Trace/log/metric projections are views over evidence, not redundant stores and mutable truth.
4. Doctor only invokes read-only authorized capability checks by default, and requires a separately approved isolated write scope for optional smoke. It MUST NOT turn provider errors into false successful health. It must distinguish preflight, submitted, rejected, acknowledged but unverified, verified and indeterminate.
5. Old read-only behavior remains compatible; public Universal API doesn't acquire Cloudflare-required fields or leak token/Worker identity. Provider-specific implementation remains inside adapter/provider infrastructure.
6. No secret/object-content/path leakage in telemetry; no mandatory collector or external service; local-first diagnostics.
7. Correctness before instrumentation: no new telemetry hot-path allocations or giant retention buffers without measurable justification. Instrumentation must not change execution or idempotency semantics.
8. All supported paths have equivalent safety boundaries through the extension, CLI and native host. Fix misleading capability declarations.

If these invariants already hold, document proof and DON'T refactor them gratuitously.

## P1: consolidation with minimal changes

- Reduce overlap instead of introducing new class hierarchies, registries, duplicate data models, loggers, evidence databases or second API versions.
- Consolidate error and evidence projection at existing canonical boundary where appropriate, maintaining published schema/backwards compatibility.
- Correct genuine adapter leakage and shared-layer dependencies on Cloudflare names/types. Supply a neutral reference adapter and contract tests proving no Worker, R2 bucket, OAuth and Cloudflare-specific diagnostic code is required by the Universal API, Python client or generic Doctor.
- Treat provider capabilities as truthfully advertised observed or declared facts, clearly differentiated. Existing extension R2 adapter may remain Worker-based, but generic providers MUST NOT need Workers.
- Reuse Resource Atlas for observation correlation, AAC to audit claims/contracts, Forever Works for preservation/inheritance, Doctor for active checks and lab for test orchestration. Document explicit nonoverlap.
- Rationalize schema generation/validation and retention limits where needed. Do not conflate avoiding bloat with deleting independently necessary negative tests and documentation.
- Preserve security and write safety; never perform infrastructure changes or rewrite stored R2 objects.

## P2: integrate true acceptance and diagnostic gates

- Create fault-injected contract tests: native safe cause/status survives adapter -> coordinator -> journal/Atlas -> scoped session -> native messaging -> Python -> JSON/Markdown, with no false certainty about write outcome.
- Add at least one provider-neutral fake reference adapter and an independent non-Cloudflare filesystem adapter contract test. It may be local/offline; don't introduce a new production connector just to prove the architecture.
- Test schema parity across JS/Python; verify generated copies match canonical version.
- Make CI fail on *new* contract divergence, missing known cause, untrue capability, unverified success or unsafe retry, without masking inherited unrelated regressions.
- Benchmark diagnostic overhead in a representative local path. Set evidence-supported budgets only, not invented performance claims.
- Audit and categorize the 9 inherited Node failures and historical Forever Works drift: explain root categories, what consolidation affects, and separately track repair debt. Do not broaden into fixing unrelated failures unless they block contract integrity.

## P3: practical Windows/live proof remains the next acceptance gate

- Preserve the new Doctor and provide exact commands to install/use `fix/evidence-first-write-diagnostics` or a tested successor branch. The *read-only* Doctor output from the owner's authenticated Chrome session is the decisive missing evidence for the historical write failure.
- Treat actual deployed Worker identity/binding/capabilities as runtime facts, not source assumptions. Provide a **one-command** read-only Doctor report and conditional write smoke plan, with a new owner-approved scope, no automatic replay and independent R2 dashboard SHA-256 check.
- If no live Chrome access, don't state “fixed live” or stall the full consolidation. Mark live acceptance as NOT_TESTED and provide a minimal, deterministic owner action with report to supply.
- Before allowing 2 MiB or unlimited file-size work, insist on verified small-file write and safe diagnostic evidence.

## The principle: simplify by enforcing ownership

Required target architecture:
- Universal API: operations and provider-neutral invariants;
- Provider adapter: provider-native identity, capability mapping and semantics;
- Session/authorization: scopes, revocation, mutation safety;
- Resource Atlas: canonical evidence/correlation and bounded provenance;
- Diagnostic schema: single contract and safe error projection, not a competing engine;
- Doctor: live capability and health probes, consumes canonical evidence;
- AAC: evaluates claimed capability and diagnostic completeness;
- Forever Works: purpose, obligations, design decisions and reconstruction;
- Python Lab: corpus planning, real conformance operations and user reports, not a second filesystem implementation.

Map the existing code to these owners, identify any violations, show exactly how modifications remove a violation and prove via tests. Avoid rewriting a working subsystem just because an idealized diagram looks cleaner.

## Deliverables

1. `docs/architecture/REDOWN_FOUNDATION_CONSOLIDATION_AUDIT.md`: before/after responsibility map, Cloudflare coupling map, overlap/duplication inventory with evidence, categorized debts and decisions KEEP/CONSOLIDATE/DEFER/REMOVE.
2. Tested minimal source changes for confirmed issues, including contract test(s), no speculative refactor.
3. CI/contract enforcement and cross-language schema agreement proof; results with historical regressions separated.
4. Updated Forever Works engineering obligations without rewriting frozen historical evidence.
5. `docs/phase28/CONSOLIDATED_OWNER_ACCEPTANCE.md` with Windows read-only Doctor and subsequent *separately approved* eight-byte write + independent hash-check procedure. No unrelated live cloud mutations.
6. A concise follow-up decision: whether `fix/evidence-first-write-diagnostics` can be merged, which exact blockers remain, and what observation would close the write incident.

## 30-minute execution contract and handoff

Start a 30-minute best-effort timebox. Record elapsed start/end times accurately. At or before minute 25, commit and push a durable handoff to `docs/assignments/handoffs/REDOWN_CONSOLIDATION_HANDOFF.md`: HEAD/branch status, tested changes, source-backed findings, completed/blocked tasks, exact tests/failures, root-cause certainty, pending owner actions, and a successor starter prompt. Do not sacrifice the handoff to finish refactoring. Minutes 25–30 are for completing highest-value safe checks and updating the handoff. Stop initiating work at 30 minutes and deliver immediately. If no precise timer is available, disclose the limitation; don't fabricate compliance.

Branch from the current diagnostic branch so its connection repair is preserved. Push tested commits to a dedicated consolidation branch. **Do not automatically merge**. Do not change Cloudflare infrastructure without explicit owner approval. Do not claim certification without live acceptance. If the timebox only permits an audit and one substantial fix, ship that tested work and evidence rather than layering another half-built subsystem.

## Final report format

Explain **what was already sound**, **where bloat/duplication actually exists**, **which Cloudflare assumptions are merely adapter implementation**, **which violate provider neutrality**, **what was consolidated (and why)**, **test evidence**, **remaining unknown live failure cause**, **exact owner Windows command**, branch/commit links and handoff link. Make clear the difference between code fixes and a proven live cure.

The assignment's measure of success is simpler architecture with stronger evidence, **not** more files, more abstraction, inflated test counts, or a claim that all future bugs are impossible.
