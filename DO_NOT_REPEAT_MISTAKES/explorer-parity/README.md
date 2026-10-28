# Living Legacy ↔ Beta Explorer audit

Status: **AUDITED / implementation and installed acceptance open**. Updated 2026-10-28 (America/Chicago). Inspected `beta-explorer` at `a7effa80b20a4d12f9e6837486ff1d7f7e52ebd9`. Owner: REDOWN maintainer; subsequent operation authors maintain these references.

This is the maintained discovery baseline required by [the committed request](../MUST-AUDIT-LEGACY-VS-BETA-EXPLORER-PARITY-AND-FILE-LIMITS.md), not a release certificate. Source and tests were inspected on the same revision. No production behavior was changed in this audit.

- [Action-level capability matrix](LEGACY-VS-BETA-EXPLORER-CAPABILITY-MATRIX.md)
- [Size, count, path, memory and time limit register](EXPLORER-FILE-SIZE-AND-HARD-LIMIT-REGISTER.md)
- [Dependency-aware parity roadmap](BETA-EXPLORER-PARITY-ROADMAP.md)
- [Reuse and bloat assessment](EXPLORER-ARCHITECTURE-REUSE-AND-BLOAT-AUDIT.md)
- [Acceptance, boundaries and actual verification](EXPLORER-PARITY-ACCEPTANCE-AND-REGRESSION-PLAN.md)
- [Evidence directory](evidence/): source hashes, search hits, test outputs and machine-readable results.

**Precedence:** latest owner instruction → current executable code and observed behavior → current tests and these maintained references → dated handoffs/proposals. Tests prove only their exercised environment. Historical snapshots and the Forever corpus remain frozen. A source anchor points to the inspected revision, not an assertion of deployed identity. Relative source links resolve from this directory; symbols remain useful after line drift.

**Evidence vocabulary:** VERIFIED means an explicitly identified local probe/test passed; CODE-INFERRED means an inspected execution path exists or is absent; UNVERIFIED means installed Chrome, deployed Worker, credentials, provider behavior, large real data, or rendered UX was not exercised. All matrix runtime conclusions default to CODE-INFERRED; local test coverage is separately identified. Owner reports in the consolidated bug document are retained historical observations, not new acceptance by this audit. No cloud reads/mutations/deployments, real user file transfers or paid large-file experiments were performed.

**Maintenance rule:** whenever a file operation, hardcoded limit, transport route or provider capability changes, update its matrix/register rows AND corresponding regression tests in the same PR/commit. Record the new inspected revision/date and actual verification; retain previous evidence. Do not mark an absent test as passing, rewrite historical hashes, or silently remove a protective limit.

Contributor checklist:

- Trace GUI → universal API/adapter → shared client/background → Worker/provider → receipt and read-back.
- Compare the same file/type/direction/count/credentials in Legacy and Beta; separate ordinary mode from Test It.
- Update exact units, inclusive/exclusive boundary, error, memory behavior, cancellation and uncertain-write handling.
- Run boundary/focused checks, full suite and reliability; identify baseline failures by name.
- Obtain installed/browser/provider evidence before closing live gaps. Record remaining UNVERIFIED cases.
- Link the same roadmap from handoffs; reuse shared components before adding code or dependencies.

Preserved tags: `test-it-chrome-56-of-60-2026-10-28` and `test-it-before-question-history-2026-10-28`; this audit does not move tags or modify main. [Current handoff](../../docs/beta/HANDOFF.md), [integrated product roadmap](../ROADMAP-2026-10-27.md), and [Chrome report](../../docs/beta/BUGS-TEST-IT-REAL-CHROME-2026-10-28.md) retain history and live blockers.

Integration note: before push, two concurrent documentation-only commits (`e2d0bf4`, `dc1eb4b`) were preserved by rebase. All 32 inspected implementation/configuration hashes still match. The newly committed [Python CLI/multicloud follow-on request](../MUST-ADD-PYTHON-CLI-UNIVERSAL-FILE-API-TEST-AND-MULTICLOUD-ROADMAP.md) remains planned, after this audit; its example JSON is not a working protocol or passing evidence.
