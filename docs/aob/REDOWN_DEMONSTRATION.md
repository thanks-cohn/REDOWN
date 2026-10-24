# REDOWN — Initial AOB Case Study (not a benchmark certification)

**Recorded:** 2026-10-24. **Status:** source-backed candidate evidence, not a validated cross-project AOB score.

## Why REDOWN is a useful first case

REDOWN's Beta Universal File API, read-only diagnostics, Resource Atlas and Agent Accessibility Conformance (AAC) audits provide real artifacts for studying agent operability. This case study *defines the proposed evaluation target*, not a global rank.

At inspected `main` commit `291858d2f0d2e8de34f0dee55f75cfa3c4272e34`, the AAC audit lineage includes a 466-capability inventory, a 749-node / 3,451-edge relationship graph, cold-agent exercises, and explicit safety and certification findings. See `verification/aac/summary.json`, `verification/aac/blind-trials.json`, `docs/aac/PHASE25.md` and `verification/aac/phase25/`. These are **AAC evidence**, not an AOB scoring run.

Phase 2.5 added a permission-scoped JSONL file-session interface (`docs/aac/FILES.md`, `agent/files/`) over the actual Universal File Engine, including discovery, authorized simulated operation, job inspection and Resource Atlas queries. The stock standalone CLI is simulation-only; external R2 sessions require a trusted owner bootstrap. A separate live R2 test subset exists, but R2 destructive operations, full installed-extension acceptance and comprehensive multi-provider claims remain blocked. Read the current readiness reports before reusing historical figures.

## Candidate portable tasks

| Task | REDOWN evidence path | AOB status |
| --- | --- | --- |
| Discover authorized capabilities cold | `docs/aac/START_HERE.md`, `agent/aac/cli.mjs` | Candidate; not AOB certified |
| List/search/copy and verify within simulation | `docs/aac/FILES.md`, `agent/files/cli.mjs` | Candidate; limited to simulation |
| Examine duration/memory of an operation | `docs/phase2/RESOURCE_ATLAS.md`, `agent/resources/` | Candidate; runtime-specific limits |
| Deny restricted mutation | `tests/file-engine-authority.test.mjs` | Candidate; historical repair evidence |
| Real R2 data integrity, safe cleanup | `verification/aac/phase25/live.json` | Candidate; narrow authorized scope |
| Independently repair a bug via agent | `FOREVER_WORKS/AAC/`, relevant tests | Not yet comparable / no AOB trials |

## Integrity boundaries

- One app does not yield an industry benchmark ranking.
- Historical AAC results are not a fresh AOB evaluation; no AOB score is assigned.
- The recent Phase 2.5 evidence states full AAC certification remains blocked; do not convert partial successes into a pass.
- Do not grant unrestricted store access or relax authorization to improve benchmark performance.
- Verify exact git SHA, runtime, tests and evidence in any later published result. Existing source evidence can be stale after changes.

## Next scientific milestone

Implement a provider-neutral AOB task schema and independent runner/oracle outside REDOWN's application API, validate it on at least one different software application, then conduct blinded repeated trials with more than one agent/runtime. Use REDOWN's AAC records as fixtures and documented gaps, not as pre-awarded credit.
