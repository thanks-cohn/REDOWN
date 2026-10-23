# Phase 2 implementation — Beta-first foundation

Baseline: `ec6d5cfc964e1fe2b3d73403a5cf8d5dc0555059`. Branch: `phase2/beta-explorer-foundation`. Date: 2026-10-23. Status: **initial simulation increment, not Phase 2 completion**.

The governing directive is [PHASE_2_IMPLEMENTATION_DIRECTIVE.md](PHASE_2_IMPLEMENTATION_DIRECTIVE.md), including all ten owner Beta requirements. Production Explorer JavaScript/background/Worker/auth routes remain unchanged. A single `.beta-only` dashboard entry opens a separate page that checks the same saved `betaModeEnabled` setting before initialization and actions. The successor has no real-provider adapter, no cloud connection access, no production history/counter writes and no automatic promotion.

## Implemented and tested locally

- Versioned exact-identity contract, transition validation and machine-readable request/job/event structural schemas.
- Two deterministic fake providers, complete cursor pages/search, metadata/text reads, text fixture upload, copy/cut/paste, recursive copy/move/delete, rename and folder creation. All conflicts fail without overwrite or merge.
- IndexedDB atomic simulation snapshots; distinct jobs/receipts/deduplication; concurrent tabs serialize requests; identical idempotency keys execute once; storage failures cannot fabricate completion.
- Independent Beta page, existing toggle gating, instant hide, retained jobs, safe reopening, per-job inspect/diagnose and read-only legacy/Beta comparison.
- Existing packaging allowlist extended to include all modules/schema/page/CSS. Package remains audit-only and release-blocked by existing license discrepancy.

## Verification

Pre-edit baseline: **375 tests / 365 pass / 10 fail**. Final full Node suite: **387 tests / 377 pass / the same 10 failures / no skips**. Twelve new focused tests pass. The first full run also exposed a new UI-test cleanup race; the controller now owns its injected dependencies and exposes a settle/close boundary, and the subsequent full suite has no added failure. The older regression policy recognizes only seven of the ten pre-existing failures; its three “new” classifications are not introduced here.

Syntax passes. Structural schema conformance: nine request/job/event fixtures valid; three incompatible fixtures rejected. Preservation model and check-preservation pass. Explorer smoke remains failed at the pre-existing source-map assertion; the map was not refreshed to hide debt. No frozen historical evidence or assertions were altered.

Exact local evidence: [baseline](../docs/phase2/verification/baseline-reliability.json), [full tests](../docs/phase2/verification/full-tests.log), [focused tests](../docs/phase2/verification/focused-tests.log), [schema checks](../docs/phase2/verification/schemas.log), [smoke](../docs/phase2/verification/explorer-smoke.log). Current final reliability summary/source hashes are retained under verification/final-reliability.json after the required check. Source is tested before its commit; report parent SHA plus file digests identify the tested tree.

UI tests use JSDOM and a deterministic IndexedDB implementation (`fake-indexeddb`, development-only, pinned). They establish controller/gate/storage logic, not browser pixels, actual IndexedDB crash durability, installed-extension acceptance or live provider behavior. No browser executable is installed for visual/Chrome acceptance in this environment. No performance advantage or data-integrity superiority is claimed.

## Milestone disposition

| Milestone | State | Remaining gate |
|---|---|---|
| P2.0 discovery | Source audit/local baseline captured; acceptance partial | Installed behavior, actual release artifact rollback and complete runtime inventory |
| P2.1 architecture | Partial contract and fake simulation | General adapter/executor protocol, all operations, version negotiation, full fault matrix |
| P2.2 core | Atomic simulation only | Durable asynchronous journal, external evidence, uncertainty/reconciliation, authorization, cancel/retry/resume |
| P2.3 R2 | Not started | Safe adapter; no legacy operational routing changed |
| P2.4 explorer | Beta simulation shell only | Visual/interaction parity, binary media/download, accessibility, full action traces and export |
| P2.5 portability | Two fakes only | Actual R2 and Google Drive integration/acceptance; fake names are not real adapters |
| P2.6 hardening | Local focused tests | Adversarial external faults, Chrome/restart/real providers, performance/security/accessibility |
| P2.7 inheritance | Supplemental source/test/recovery links | Canonical model update after review, independent agent drill and acceptance |

## Migration and rollback

No existing operational engine or user data is migrated. Switching off the current Beta setting hides the entry and any open Beta interface; it retains the simulation database. Existing Explorer remains available regardless. A started fake transaction commits or aborts atomically; hiding the interface never deletes records or pretends to cancel an external job. This prototype has no external running work. Future asynchronous executors require explicit checkpoint/recovery policy before enabling them.

To remove the prototype, revert the isolated implementation commit(s); do not delete the Beta database or production records as a side effect. No persistent schema upgrade exists; incompatible versions fail closed. Real cloud mutations require dedicated test resources, operation-specific tests and separate explicit authorization. Legacy retirement requires all directive gates plus explicit owner promotion approval.

Next increment: finish the general provider/executor protocol and fault-injection contract first; add full agent gateway integration and action trace coverage; preserve simulation isolation. Then implement a safe, read-only R2 boundary without preparation side effects before seeking real-write acceptance. See [source inventory](../docs/phase2/ARCHITECTURAL_INVENTORY.md), [API](../docs/phase2/ENGINE_API.md) and [Forever Works supplement](../FOREVER_WORKS/PHASE_2_BETA.md).
