# REDOWN V3 — PARITY-FIRST CLEAN-SLATE RECONSTRUCTION

**Date:** 2026-10-30  
**Repository:** `thanks-cohn/REDOWN`  
**Working branch:** `codex/v3-parity-first-reconstruction`  
**Reference branch:** `release/cloudflare-true-remote`  
**Priority:** P0: regain working current functionality quickly; everything else follows.  
**Status:** Owner direction and implementation request, NOT proof of implemented behavior or accepted Forever Works intent.

## Mission

Build a new REDOWN foundation and NEW Right-click engine with the shortest safe path to today's functional Cloudflare REDOWN. Do **not** keep patching Modern's broken right-click wiring or transplant its old configuration UI. Treat Legacy and current source as behavioral evidence; treat `FOREVER_WORKS` as the primary accumulated evidence and requirements corpus, differentiating source-confirmed facts, owner requirements, proposals, mock tests, actual installed-Chrome tests, and live Cloudflare outcomes.

**Design for future expansion; implement present functionality first.** The architecture must not permanently obstruct additional S3-compatible storage, Google Drive, OneDrive, Dropbox, or MEGA. These adapters, speculative capabilities, and premium features are **not** P0 requirements. Do not delay Cloudflare parity for a generalized provider framework.

## Required repository onboarding

1. Read `AGENTS.md`, `FOREVER_WORKS/README.md`, `FOREVER_WORKS/CURRENT_STATE.md`, and use `node FOREVER_WORKS/tools/query.mjs describe` to discover supported corpus queries.
2. Read `FOREVER_WORKS/right-click/phase-3/README.md` and its actual contracts, especially `UI_TO_WIRING_CONTRACT.md`, `CURRENT_MODERN_END_TO_END.md`, `HISTORICAL_LEGACY_END_TO_END.md`, `WIRING_DIFF_AND_ROOT_CAUSES.md`, `KEEP_REPLACE_DECISION_MATRIX.md`, `CLEAN_ROOM_EDITOR_BLUEPRINT.md`, `REGRESSION_AND_ACCEPTANCE_MATRIX.md`, `FUTURE_PROVIDER_SEAMS.md`, `EVIDENCE_AND_COVERAGE_LEDGER.md`, `HANDOFF_LATEST.md`, and `source-wiring-continuation/README.md`.
3. Inspect actual source at the current branch HEAD rather than assuming the audit's pinned source is still current. Preserve the `right-click-shits` checkpoint, all historical tags, and frozen evidence. No force-push or destructive branch rewrite.
4. Follow the unified agent/reliability API onboarding and applicable commands documented in `AGENTS.md`. Report test failures and installed/provider proof gaps instead of claiming success without verification.

## Binding product decisions

### A. Single visible V3 Right-click Setup

The application's **Right-click section must show ONLY the newly reconstructed V3 Right-click Setup**, regardless of engine selection. Do not show any Legacy setup screen or leftover Modern setup panels. Do not re-skin the old editors, nested orphan account cards, duplicate destination editors, or remnant setup controls and call them V3.

**One explicit visual exception:** preserve the useful **folder outline** concept and account → bucket → folder navigation / hierarchy from the current interface, while permitting a fresh internal implementation and refined Apple/Mac-like visual design. Keep meaningful folder nesting, outline interaction, searchable/reorderable destinations as supported by the evidence, separated logical sections/tabs, deliberate spacing, visible distinct red Delete controls, accessible keyboard and responsive behaviors. This is a reconstruction, not a CSS patch.

### B. Two runtime engines, not two setup screens

In **Settings**, provide an explicit persisted selector:
- **Legacy Right-click**: preservation/fallback/reference runtime, with separate saved configuration.
- **New Right-click (V3)**: clean new engine that uses V3's canonical destination model, menu generator, routing, and transfer integration.

The right-click section **always** displays V3 Setup. If Legacy is active, V3 settings may remain editable but must clearly say they are not currently controlling Chrome's actual context menu. Do not mislead users into believing V3 edits immediately affect Legacy. Switching must be safe, reversible, and persistent across service-worker/extension restarts. Exactly **one** engine owns installed Chrome menu entries at a time. On switch, explicitly reconcile the installed Chrome menu and report failures. No duplicate or stale entries, no silent config overwrites, no cross-engine mutations of saved settings. Keep Legacy's executable path independently functional, not merely an inert reference.

### C. Existing URL system stays

The **current URL system remains in place**, including current URL generation, public/custom domain behavior, existing user-facing workflows, persistence, and internal ownership. It is **out of scope for reconstruction**. Reuse the existing URL contracts and seams. Do not rewrite, rename, remove, or migrate URL internals opportunistically. Any compatibility change must be minimal, documented, and regression-tested. Preserve opt-in/Yes-No consent before enabling bucket-wide public URL functionality as applicable to existing flows. Do not confuse URL-publication behavior with context-menu routing or remote-save ingestion.

### D. Current functionality first

P0 objective: get the new application to verified working parity with today's Cloudflare experience as rapidly as possible. Focus on the end-to-end vertical slice:

**Authorize/activate Cloudflare storage → configure bucket and nested folder destination in V3 → generate Chrome right-click menu → click an actual supported webpage URL → route to exactly the chosen destination → execute actual remote save → verify completion before reporting success → show the result in History and Explorer.**

Restore other existing working Explorer actions and transfer handling incrementally: listing, navigation, rename, delete, copy, move, drag-and-drop, search, previews, upload and provider URL integrations, with a documented current-state inventory. Preserve **Keep Both** as the default filename-conflict policy, not Skip; maintain failures/receipts honestly. Do not claim unsupported behavior is working.

Protect the current visual product direction including attractive hierarchy, compact premium layouts, responsive Any Shape principles, and the existing successfully functioning UX features, while rebuilding the V3 Right-click setup from scratch.

## Engineering principles

1. **One authoritative V3 data model** for account/bucket/folder destinations, stable IDs, order, nesting, menu eligibility, and preferences. Explicitly handle deletes, subtree cleanup, duplicates, orphans, and migration boundaries.
2. **One config → validation → menu projection → Chrome registration → click routing chain.** V3 setup and actual menu must agree; verify registration receipts, restart behavior, stale ID handling, activation/deactivation, and errors.
3. **Isolate domain responsibilities:** provider adapter, transfer job/result, right-click menus, persistence/migration, Explorer operations, visual presentation. Avoid needless abstraction and speculative plumbing.
4. **Capability honesty:** future providers may differ in URL ingestion, resumability, auth, public URLs, move semantics, ZIP/CBZ handling and preview support. Only expose proven capabilities; leave extension points without implementing future providers now.
5. **Transfer correctness:** no success/odometer/history-complete event until a save is verified. Failures and ambiguity remain visible. Never label mock or static checks as installed Chrome/live R2 proof.
6. **Security:** credentials remain in supported secure flows; do not log tokens or private file contents; no provider mutations without the owner's authorization and applicable live test safety conditions.
7. **Minimal dependencies, focused contracts, incremental vertical slices**, preserving current proven behaviors. Avoid replacing the entire Explorer or URL subsystem as a prerequisite for first working right-click parity.

## Work sequence and acceptance gates

**Phase 0 — Ground truth and safety.** Inventory current working capabilities and bugs (separate owner reports, source evidence, tests, and live proof). Preserve checkpoints. Produce precise keep/rebuild boundaries and a feature-parity matrix.

**Phase 1 — Small V3 foundation.** Create isolated modules/contracts and test harness; robust versioned canonical destination store; explicit runtime engine selection; URL subsystem remains untouched. No broad redesign required before the first useful slice.

**Phase 2 — First actual Cloudflare vertical slice.** Make V3 configured destination work from UI to Chrome menu through real click, transfer, verified outcome, History and Explorer. Keep Legacy togglable in Settings. Validate actual installed-browser and live-provider behavior when environment and authorization permit; otherwise mark exactly what remains unverified.

**Phase 3 — Achieve current feature parity.** Systematically restore tested operations to the existing functional level and repair documented bugs, including deletion without orphaned cards and menu parity. Use source-backed regression cases and comparative Legacy/V3 observations. Record both successes and failure categories.

**Phase 4 — Refine UI and extensibility.** Once parity is established, improve aesthetic and UX quality, future provider adapters, and paid features in separately prioritized plans. Do not turn these into blockers for P0.

Release gates: no unverified claims; no automatic replacement of existing release behavior; no loss of URL features; menu ownership deterministic; settings persist across restart; correct destination and verified Cloudflare transfer; Legacy remains functional as fallback; feature-parity matrix identifies proven, failed and untested items.

## Deliverables in FOREVER_WORKS/v3/

Maintain:
- `ARCHITECTURE_AND_BOUNDARIES.md` (including non-negotiable URL preservation)
- `PARITY_MATRIX.md` (current → V3, evidence level and statuses)
- `RIGHT_CLICK_ENGINE_SWITCH_CONTRACT.md`
- `CANONICAL_DESTINATION_AND_MENU_CONTRACT.md`
- `CLOUDFLARE_VERTICAL_SLICE.md`
- `PROVIDER_CAPABILITIES_AND_FUTURE_SEAMS.md`
- `UI_ANY_SHAPE_AND_FOLDER_OUTLINE.md`
- `REGRESSION_AND_ACCEPTANCE.md`
- `HANDOFF_LATEST.md` (exact changes, files, tests, results, risks, incomplete work, commit and next task)

Add documents as evidence warrants. Do not pass off proposals as accepted Forever Works schema facts; comply with the corpus's accepted-intent governance.

## Initial execution boundary for Codex

Start by auditing enough current code to make a correct minimal V3 design; write the documents and initial isolated foundation, then prioritize the smallest runnable Chrome/Cloudflare slice. Keep the existing release branch untouched. Make changes in bounded, reviewable increments; test; commit/push to the isolated V3 branch. **Before concluding each run, write a complete handoff** detailing exactly what changed, what did not, test evidence and remaining live verification. Do not let an idealized architecture delay the first functional milestone.

**North star:** Regain today's working REDOWN quickly. Preserve Legacy as a switchable live control/reference, display only the new setup in the Right-click section, preserve the folder outline and current URL subsystem, and leave sensible seams for future providers.