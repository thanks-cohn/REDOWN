# Phase 2 successor: current implementation supplement

This supplement does not change the checkpoint model, accepted purpose authority, frozen source digests or prior failures. The original Explorer remains production implementation; the successor is an isolated simulation prototype.

Owner requirement: `Phase/PHASE_2_IMPLEMENTATION_DIRECTIVE.md` §14. Source-backed preservation/rebuild decisions: `docs/phase2/ARCHITECTURAL_INVENTORY.md`. Actual contract and reconstruction instructions: `docs/phase2/ENGINE_API.md`. Acceptance and open milestones: `Phase/PHASE_2_IMPLEMENTATION.md`.

| Responsibility | Legacy | Successor foundation |
|---|---|---|
| Interface | extension/options.html and options.js | extension/beta-explorer.html/css/mjs, gated by existing betaModeEnabled |
| Coordination | options.js, background.js, embedded STORAGE Worker | extension/file-engine/contract.mjs and simulation.mjs; local simulation only |
| Persistent state | Existing profiles/auth/history unchanged | redown.phase2.beta IndexedDB v1, state/snapshot; jobs, receipts, dedupe and fixture objects |
| Evidence | Current baseline and prior preservation corpus | docs/phase2/verification and tests/phase2-* |
| Verification | Fixture/source evidence; live boundaries open | simulated-content-equality; never actual provider evidence |

Rebuild the successor using the existing npm lockfile, Node tests and packaged files. No cloud credentials are needed. Reproduce `node --test tests/phase2-engine.test.mjs tests/phase2-beta.test.mjs`, schema fixture generation and Python schema checks with the existing pinned preservation requirements. Open the dashboard in an approved installed-extension environment; enable Beta Mode and choose Beta Explorer. Start with the simulated providers; existing cloud profiles are not read. Direct page access while disabled must do nothing. Disabling Beta retains snapshots; see the transaction/recovery policy in ENGINE_API.md.

Before retiring legacy: complete real R2 safety/identity/conditional conflict and ambiguous-write tests; implement durable external executor/reconciliation; preserve full keyboard/mouse, preview, URL, pagination and visual obligations; demonstrate second real provider with the same contracts; add gateway adapter, sanitized trace export, performance/accessibility/security acceptance; perform approved installed/live acceptance and an independent cold-agent drill; prove rollback; obtain explicit owner promotion approval. Passing this prototype's tests does not satisfy those gates.

No canonical accepted-intent entities were invented for this increment. Once runtime obligations and mappings are implemented/reviewed, add them through an intentional model migration with actual source/test evidence. Never rewrite frozen baseline evidence to make the successor appear conformant.

## Chrome / crimson Beta presentation

The owner-directed distinct silver/chrome/red/white/black design is recorded in `docs/phase2/CHROME_RED_DESIGN.md` with actual screenshots and ordinary-browser evidence. Preserve the local SVG symbol set, bundled font, responsive sidebar-to-controls layout, grid/list choice, selection/details hierarchy and reduced-motion policy. This is Beta presentation only; simulation and promotion boundaries remain unchanged.
