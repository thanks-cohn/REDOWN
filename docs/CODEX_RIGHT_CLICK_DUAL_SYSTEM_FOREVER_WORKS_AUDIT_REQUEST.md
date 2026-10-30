# CODEX P0 AUDIT REQUEST: REDOWN RIGHT-CLICK SYSTEMS, FULL WIRING MAP, PRESENTATION SEPARATION, AND FOREVER WORKS KNOWLEDGE TRANSFER

**Repository:** `thanks-cohn/REDOWN`  
**Mandatory branch:** `release/cloudflare-true-remote`  
**Execution mode:** Documentation-only, source-backed architecture investigation and evidence capture.  
**Priority:** P0, foundational work before authoring a unified Right-click API.  
**Date requested:** 2026-10-30  
**Owner goal:** An unfamiliar agent must be able to explain precisely what the Legacy and New Explorer right-click setups do, which pieces remain shared or distinct, what controls the actual Chrome menu, and how to reconstruct or later refactor them without destroying user intent, visual quality, data, or behavior.

## 0. Immediate instruction: study first, document second

This request asks for **deep comprehension and durable documentation, not a new UI redesign, API implementation, or bug-fix sprint**. The next authorized task, after this audit has been reviewed, will be the design of a unified, inspectable Right-click API. Prepare its evidence-backed foundation now, but do not build or activate it here.

Begin by reading, in order:

1. `AGENTS.md`, then the release-branch HEAD, working-tree status, and recent history.
2. `FOREVER_WORKS/README.md`, `FOREVER_WORKS/POLICY.md`, `FOREVER_WORKS/TRACEABILITY.md`, `FOREVER_WORKS/CURRENT_STATE.md`, `FOREVER_WORKS/GAPS_AND_MIGRATION.md`, `FOREVER_WORKS/COLD_AGENT_START_HERE.md`.
3. `FOREVER_WORKS/CONSUMER_PRESENTATION_CAPTURE.md`, `FOREVER_WORKS/CONSUMER_PRESENTATION_PRESERVATION.md`, `FOREVER_WORKS/CREATORS_NOTES.md`.
4. Existing canonical records, especially `forever/capabilities/redown.capability.destinations.json`, `forever/compatibility/redown.compatibility.destination-state.json`, relevant invariants, implementations, test evidence, and `forever/manifest.json`.
5. The *actual installed* Forever Works v0.1 schema/tool contract, source and provenance rules. Use `FOREVER_WORKS/upstream/forever-works/UPSTREAM.json` and relevant schemas, plus query/validation tools. Do not invent new normative record kinds.
6. `docs/RIGHT_CLICK_STRUCTURE_HANDOFF.md`, `docs/SIMPLE_RIGHT_CLICK_MENU_CONTRACT.md`, `docs/EXPLORER_CONTEXT_MENU_REPORT.md`, `docs/agent/ARCHITECTURE_MAP.md`, `docs/agent/MESSAGE_INVENTORY.md`, `docs/reliability/UNIFIED_AGENT_API.md`, `COMP/FOREVER_WORKS_COLD_AGENT_INGESTION_DIRECTIVE.md`, and related tests and incidents.

These documents are **leads, not substitutes for current source inspection**. Some Forever Works source hashes and tests were pinned to October 23 and therefore predate current work. Document the revision mismatch explicitly. Do not rewrite frozen evidence or imply older local test results verify the current release branch.

### Scope of history

Inspect commits and diffs relevant to the right-click work. Use the repository history to verify, rather than assume, these known landmarks:

- `515c272`: reference before the October 30 dedicated right-click repair/redesign work.
- `16dad07`: early modern-menu authority work.
- `2018b6bd`: related right-click handoff baseline.
- `45e1c71`: later selection-layout redesign.
- Current release-branch HEAD: capture its **actual full SHA**, not the hash written in this request.

The modern right-click selection layout has subsequently been selectively restored from an earlier checkpoint while wiring/safeguards and red deletion controls were retained. Treat **historical UI, current UI, and current execution behavior as separate objects**.

## 1. Distinguish four different things before comparing anything

Never collapse all right-click systems into one ambiguous phrase.

**A. Legacy right-click configuration surface:** Older settings/dashboard interface, historically in `extension/options.html`, `extension/options.js` and related modules. Verify its current status: visible, delegated, read-only/inert, compatibility-only, or an active writer. When necessary compare historical revisions to learn what it formerly did.

**B. Modern Explorer Right-click setup:** Current Simple/Nested destination editor under `extension/beta/explorer.html`, driven by `extension/beta/destinations.js` and the shared nested editor. This is intended as the authoritative destination configuration experience. Verify, rather than merely repeat, that intention in the actual save, validation, migration and storage code.

**C. Chrome's native right-click menu:** What a user sees after right-clicking a webpage/link/image. Its entries, hierarchy, IDs, rebuild lifecycle, built-in toggles and click handlers are primarily owned by the browser extension background runtime and Chrome's contextMenus API. Chrome owns native submenu flyout geometry; REDOWN owns menu definitions/routing within API limits.

**D. Explorer's own file/folder context menu:** The menu inside the REDOWN file grid. This is distinct from configuring the browser-native right-click menu. Audit cross-dependencies and name collisions, but do not falsely treat this as the same subsystem.

For each, capture: owner, purpose, audience, entry point, lifecycle, inputs, outputs, authority, rendered state, saved state, side effects and verification.

## 2. Create three intentionally independent maps

### MAP P: PURPOSE / SEMANTICS / PROMISE

Describe, in human-readable, language-independent terms:

- Why REDOWN offers right-click saving: ease, fast return workflows, clear destinations, user-owned storage and dependable feedback.
- Meaning of **Simple**: flat destination actions under REDOWN, independently of remote folder depth.
- Meaning of **Nested**: hierarchical menu navigation through bucket/folder destinations, including actual parent/child identity and "Send here" behavior where implemented.
- Meaning of profile, account, bucket, directory prefix, menu label, root, child, enabled/included, removed, disabled, draft, saved, migrated and legacy.
- Distinction between a **menu destination** and a **real cloud storage resource**. Removing a menu card never authorizes deleting a bucket, R2 object or remote directory.
- User intent from historical/current specifications versus behavior established by source or tests. Explicitly label any contradiction.
- Stable user-facing obligations that must survive a future UI, framework, or provider-adapter replacement.
- Competing interpretation and ambiguity inventory: where product language/UI implies one outcome but wiring achieves another.

Do not treat code behavior as sufficient evidence of the creator's preferred aesthetics. Owner direction, source-declared styling and measured browser rendering must remain separate evidence categories.

### MAP W: WIRING / AUTHORITY / BEHAVIOR

Independently build an end-to-end technical map:

UI event -> handler -> draft model -> validation -> storage write -> mode state -> normalized native menu plan -> Chrome menu creation/removal/reorder -> menu ID -> resolver -> Cloudflare operation -> verification -> user-facing outcome.

For every hop record exact file path, function/symbol, current source line or anchor, persisted keys/fields, input/output shape, side effects, async boundaries, cancellation/races, expected errors, and known test names.

Minimum investigations:

- Legacy editors, callbacks and state writes: actual current writer permissions, historical behavior, options page, fallback links, Chrome `storage.local`/`onChanged` listeners and profile updates.
- Modern editor Simple and Nested: `extension/beta/destinations.js`, `extension/nested-menu-editor.js`, `extension/nested-locations.js`, `extension/destination-config.js`.
- `extension/background.js`: menu building/rebuilding, native context menu registration/removal, `saveDestinationConfig`, profile writes, rightClickMode synchronization, `addNestedLocations`/Simple entries, `RedownDestinationConfig.resolve`, click routing and transfer dispatch. Identify true contemporary symbol names from source.
- Compatibility: `menuTree`, old `tree:` IDs, `fromLegacy`, schema/migration version, safeguards against deleted entries returning, and old settings handlers; classify each mechanism **ACTIVE AND NECESSARY**, **COMPATIBILITY ONLY**, or **OBSOLETE/INERT**, backed by evidence.
- Native `Use nested menu` checkbox versus modern mode switch: who writes, when other windows learn, how unsaved drafts survive, signature/version conflicts, rebuild failure and retry, what happens if mode changes while an operation is pending.
- Create/select existing bucket vs create/select folder vs add a **menu location**: identify which "+" actually calls `cfCreateBucket`, `cfCreateFolder`, or only updates a draft. Track authorization and confirmation. Do not assume buttons sharing the same glyph share semantics.
- Exact menu IDs, ordering, labels, parent ID and resolved accountId/bucketName/prefix, shallow/deep hierarchy, include/exclude, save, remove and Undo.
- Invalid/deleted/stale IDs, concurrent saves, multiple windows, replay of migration, external storage writes, session refresh, provider activation, worker readiness, menu API errors, and partial success.
- Both web URL and file/image native menu entry paths, including click context, target extraction, transfer pipeline, failure reporting, history/provenance/counters if applicable.
- Whether the present modern UI is in fact the *sole* active destination authority. Cite the actual runtime and tests, and leave unresolved installed-browser parity as **NOT_TESTED** rather than declaring victory.
- Any modules shared with Explorer's own file-grid context menu or transfer action menus.

Produce a diagram plus a tabular call graph. Use concrete examples: add a Simple destination; add a Nested child; remove the last root; change mode from Chrome; save while another editor is dirty; click a native menu item; try to select an obsolete ID.

### MAP V: VISUAL PRESENTATION / CSS / LAYOUT / INTERACTION

**Keep this separate from MAP W.** A CSS selector does not own persistence or routing. A callback does not define the intended layout.

Inspect actual HTML elements/IDs/roles, CSS declarations and the computed cascade *as far as source inspection permits* for both historical Legacy and current Modern surfaces:

- HTML/DOM hierarchy, row/card ownership, labels, headers, disclosure menus, nested expansion, remove ×, plus controls, buttons, inputs, dropdowns and setup disclosures.
- CSS source files, selector specificity, competing rules, inheritance, design tokens/variables, media and container queries, theme variants, responsive wrapping, overflow and maximum indentation.
- Positions and sizes of controls, spacing rhythm, card width, row height, focus, hover, contrast, hierarchy, animation, reduced motion, visible/hidden states, affordances and touch/keyboard access.
- How many elements are visible by default and which are buried in options, including the always-visible red × on Simple/Nested cards in the latest implementation.
- Compare Legacy visual organization versus current restored Modern editor: where Legacy was intuitive, where Modern is more capable, what styling is shared, what is duplicated, and what is independently owned.
- Explain how a Nested directory tree renders versus how the actual Chrome native menu renders. Do not claim REDOWN CSS positions Chrome native submenus.
- Demonstrate layout across **wide, narrow, and panel-constrained** widths; distinguish source-backed expected behavior from actual measured screenshots. If browser rendering is unavailable, include reproducible steps, viewport sizes and a **NOT_TESTED** label instead of invented pixel measurements.
- Identify accessibility/focus risks, stale cards/ghost nodes, empty states and duplicate control surfaces. A hidden node and deleted configuration are different facts.

Capture a **style ownership matrix**: UI element -> owning HTML renderer -> CSS files/selectors -> applicable tokens/states -> breakpoint behavior -> semantic control action -> layout verification evidence. The semantic action column is only a cross-reference; full wiring belongs in MAP W.

## 3. Build a TRUE side-by-side Legacy vs Modern comparison

Produce a feature-by-feature matrix with columns:

**Capability/interaction | Legacy historical behavior | Legacy current status | Modern current behavior | Shared code/contract | Difference | Owner of truth | Purpose/obligation | Source evidence | Tests/limitations | Safely reusable?**

Cover at least:

- Choosing account and bucket; selecting directories; folder and bucket creation; plus controls; naming destinations.
- Simple flat menu; Nested hierarchy; labels/fallback labels; ordering; moving; expanding/collapsing; truncation/indentation.
- Adding, editing, excluding, removing, undoing, saving and reloading menu entries.
- Red × visibility and real deletion semantics, including "remove menu group" versus remove child/root and zero-entry states.
- Persisted profiles, migration, versioning, updates from other windows, native checkbox, privilege boundaries.
- Native menu output, exact click routing, errors, Worker/R2 effect.
- Style, responsive behavior, hierarchy, keyboard/a11y, status language, theme changes and onboarding.
- Instrumentation, local tests, installed Chrome coverage and known legacy/current regressions.

Describe both **similarity** and **difference** with actual evidence. Include *which parts of Legacy are safer to retain as private adapters* versus *which parts must never regain menu-writing authority*. No speculative or casual wholesale transplant of Legacy CSS/logic.

## 4. Define authority boundaries and dependency rules

Produce an explicit ownership table:

- Who is allowed to **read** destinations?
- Who is allowed to **edit a local draft**?
- Who is allowed to **persist a destination definition**?
- Who is allowed to **translate the saved model into Chrome menu descriptors**?
- Who actually **creates/removes/rebuilds native menu entries**?
- Who is allowed to **resolve an ID at click time**?
- Who is allowed to **start a transfer**?
- Who is allowed to **create or delete a remote bucket/folder/object**?
- Who owns **styling** and **mode presentation**?
- Which legacy readers/compatibility transforms are still permissible?

For each boundary, record the actual current code, not an idealized contract. Then describe a proposed future boundary in a separate **FUTURE/NOT IMPLEMENTED** column.

Catalog all **write paths** and their permission gates. Treat a legacy destination-writing path that still exists as an architectural finding requiring evidence, not a reason to silently alter it in this audit.

## 5. Forever Works-compatible preservation records

Follow the existing REDOWN Forever Works authority policy. The current graph already has `redown.capability.destinations` and `redown.compatibility.destination-state`; **extend understanding by cross-referencing them**, not by creating duplicate authorities.

Keep stable meaning separate from replaceable implementations:

- **Purpose/intent:** why menu configuration exists, human promise and owner acceptance status.
- **Capability:** what each interface exposes.
- **Invariants:** what must remain true under edits, migration, new CSS, new storage/provider implementations and Chrome rebuilds.
- **Implementation/source map:** what currently does it, exact source revision and evidence.
- **Dependencies/compatibility:** browser APIs, profile format, Cloudflare/R2, migration and sender trust boundary.
- **Behavioral evidence:** which named tests truly exercised which behavior, results/date/baseline, negative cases, current unknowns.
- **Design/presentation preservation:** visual hierarchy, visibility, spacing, responsive and keyboard contracts, distinguished from runtime semantics.
- **Failure/incident history:** known issues with orphaned cards, incorrect menu parity, obsolete writers, legacy resurrection, duplicated labels, source versus browser mismatches and status of fixes.
- **Reconstruction:** how a cold agent could rebuild the module while preserving exact observable behavior and safeguards.

Use the real pinned Forever Works schemas to validate any canonical JSON you propose. Do not insert inferred intent or newly invented IDs into authoritative `forever/manifest.json` or replace historical evidence without owner review. If schema/coverage is inadequate, document the proposed extension and migration as **PROPOSAL**, outside canonical records. Unknown does not become supported merely because it is written down.

Record provenance for each important claim: **SOURCE_INSPECTED**, **LOCAL_TEST_PASS**, **LOCAL_TEST_FAIL**, **HISTORICAL_REPORT**, **OWNER_INTENT**, **INSTALLED_BROWSER_VERIFIED**, **LIVE_PROVIDER_VERIFIED**, or **INFERENCE/UNKNOWN**. Distinguish these classifications from pass/fail outcomes. Use status vocabulary **PASS / FAIL / PARTIAL / BLOCKED / UNSUPPORTED / NOT_TESTED** in the verification matrix.

## 6. Deliverables: permanent, modular documents

Create the following **documentation-only** outputs. Keep existing historical artifacts and their provenance intact. Where a filename already exists, read and extend without erasing history.

Create `FOREVER_WORKS/right-click/` with:

1. **README.md**: cold-agent route, pinned revision, ten-minute understanding path, document links, verification status.
2. **PURPOSE_AND_INVARIANTS.md**: owner promise, Simple/Nested definitions, safety obligations, stable versus replaceable boundaries, source vs intent.
3. **SURFACE_INVENTORY.md**: Legacy historical/current, Modern Explorer, Chrome native context menu and Explorer file context menu, DOM entry points and ownership.
4. **LEGACY_SOURCE_MAP.md**: complete historical and current legacy paths, functionality, imports, saved fields, current authority classification and migration.
5. **MODERN_SOURCE_MAP.md**: precise DOM/render, events, models, validation, data ownership, red × and controls.
6. **WIRING_AND_STATE.md**: end-to-end call and message graphs, modes, storage, async races and error states with exact source anchors.
7. **PRESENTATION_AND_CSS.md**: separate visual layer study, styles/selectors/tokens/breakpoints, design intent and known rendering gaps.
8. **SIDE_BY_SIDE_MATRIX.md**: required comparison and reusability decisions, source and test citations per row.
9. **CHROME_RUNTIME_AND_SECURITY.md**: native menu build, click IDs, transfer, trust/permissions, Legacy isolation and provider boundaries.
10. **BEHAVIORAL_TESTS_AND_GAPS.md**: evidence matrix, failed/unknown gates, reproductions and browser acceptance plan.
11. **RIGHT_CLICK_API_READINESS.md**: **proposal only** for a future unified Right-click inspection/API module, grounded in identified owners, normalized descriptors and stable contracts.
12. **COLD_AGENT_RECONSTRUCTION.md**: cold-agent study drills, precise steps to follow a behavior end to end, impact-analysis recipes, safe reconstruction proof.
13. **SOURCE_INDEX.json**: a machine-readable **documentary index** mapping each chapter/claim to source path + revision + symbol + current lines, tests/evidence and confidence. Clearly mark it **non-normative index**, not a replacement Forever Works schema.

Make all references relative and navigable from the root README. Where possible, add navigational pointers from existing Forever Works documentation without editing frozen historical snapshots. Do not regenerate canonical evidence hashes to make validation appear successful.

### Proposed Right-click API blueprint, NOT implementation

In `RIGHT_CLICK_API_READINESS.md` propose a small read-only inspection vocabulary such as:

- `describeRightClick()`: versions, sources, states, capabilities, provenance.
- `listSurfaces()` / `getSurface(id)`: Legacy, Modern, native Chrome and file Explorer menu.
- `traceRightClickAction(actionId)`: event -> save/model/native plan -> resolver -> result, with evidence.
- `getMenuPlan(mode, snapshot)`: deterministic dry-run of the descriptor plan, with no Chrome mutation.
- `compareMenuConfigurations()`: draft versus persisted versus last-known browser build, explicitly distinguishing unverifiable live state.
- `getMenuAuthorityMap()`: every writer/reader, confidence and side-effect classification.
- `getVisualContract(surfaceId)`: DOM/CSS ownership and responsive acceptance without pretending it is transfer wiring.
- `evaluateRightClickChange(proposedChange)`: affected contracts/invariants/tests and migration implications.

Do not assert these operations currently exist. Specify candidate inputs/outputs, redacted data, error semantics, revision handling, authorization scopes, minimal conformance fixtures and reconstruction benefits as a proposal. Discuss using the existing `agent/diagnostics` registry rather than inventing a parallel inspection gateway. The API is a *future follow-up*, not part of this run.

## 7. Verification and cold-agent test

Try read-only, offline checks if the environment has the dependencies. Suggested:

- `node FOREVER_WORKS/tools/query.mjs describe`
- `node FOREVER_WORKS/tools/query.mjs validateModel`
- `node FOREVER_WORKS/tools/check-preservation.mjs`
- `python3 FOREVER_WORKS/tools/validate.py` (only when prerequisites available)
- Relevant destination/menu tests, including `tests/modern-destinations.test.mjs`, `tests/nested-locations.test.mjs`, `tests/simple-menu-flat.test.mjs`, `tests/menu-reorder.test.mjs`, and additional discovered suites. Prefer targeted runs first.
- Link each result to revision, command, exit status and captured output. Do not represent mocks as installed Chrome acceptance.

A cold agent who has only the new README should be able to answer all of the following, with exact code links and honest caveats:

1. Which current editor actually saves the menu, and why does the old settings UI still exist?
2. What does a red × on a Simple card, Nested group, bucket root or child actually remove? Which operations never delete cloud files?
3. Which + creates only a menu destination, which creates an R2 folder, and which (if any) creates an R2 bucket?
4. What precisely happens from toggling Simple/Nested in the Dashboard versus Chrome's native checkbox?
5. What path turns one saved destination into one Chrome menu item and then a specific remote storage prefix?
6. Which parts of CSS and DOM can change without changing authority or routing, and which UI affordances are preservation requirements?
7. Which historical legacy behavior differs from current modern behavior? Which adapter remains necessary?
8. How would a future agent prove that a new Right-click API or a rebuilt UI remains compatible?
9. What evidence currently proves the behavior, and what still requires installed-browser or live-Cloudflare testing?

If a question cannot be supported, write **UNKNOWN** and identify the minimum test or source needed.

## 8. Execution safeguards

- This run is **read-only regarding REDOWN product behavior**. Modify documentation and non-executing documentary indices only.
- Do not change production HTML/CSS/JavaScript, Chrome menus, persisted user profiles, live Cloudflare resources, credentials, Workers, local/browser settings, runtime APIs, canonical model manifest or deployed packages.
- Do not transplant legacy code into the modern editor or re-enable legacy writers.
- Do not create a new executable API in this task.
- Do not edit `AGENTS.md` in a way that contradicts existing onboarding or frozen historical context.
- Do not create an extra worktree; reuse the authorized checkout.
- Remain on `release/cloudflare-true-remote`. Avoid branch switching, wholesale reset, rebase or unrequested merging.
- Do not print credential values, account IDs, private bucket names, file contents or access tokens in documentation or test outputs.
- Keep definitive facts separate from plausible inferences; avoid fabricated screenshots, tests, metrics and third-party API guarantees.
- Preserve the current right-click implementation while auditing; an investigation is not permission for live config writes.

## 9. Time budget and mandatory handoff

Target an **approximately 30-minute bounded Codex run**. Begin the handoff by approximately minute 25. Prioritize precise source maps, complete purpose-versus-wiring-versus-presentation separation, the Legacy/Modern matrix and honest evidence. If time is limited, deliver a complete indexed partial audit with explicit missing sections rather than superficial claims of completeness.

Save a clear handoff as `FOREVER_WORKS/right-click/HANDOFF_LATEST.md` containing:

- Exact branch, starting and final commit SHAs.
- Files created/changed and why; no production file changes.
- Completed, partial, blocked and unverified sections.
- Current authority and compatibility findings, with cited code.
- Local commands attempted and their actual results, baseline differences, unresolved regressions.
- Verification/canonical schema status; accepted versus proposed record status.
- Exact next action and short follow-up Codex prompt for the future API-design phase.
- Any unverified Chrome and Cloudflare gates.

Commit and push the documentation to the mandatory branch if authorized access permits. Confirm actual push/commit outcome; never claim completion before verification.

## 10. Final acceptance standard

This audit succeeds when a fresh agent can reliably separate **why REDOWN has right-click saving**, **what Legacy and Modern interfaces do**, **what the native Chrome runtime actually executes**, **what HTML/CSS/layout communicates**, **which persisted model truly owns menu authority**, and **how to prove a future replacement preserved the contract**.

The goal is not merely to describe the current files. It is to make the subsystem *understandable, auditable and reconstructible*, so our next Right-click API can be built on a precise and durable foundation.

**PURPOSE IS NOT CSS. PRESENTATION IS NOT ROUTING. LEGACY COMPATIBILITY IS NOT LEGACY AUTHORITY.**
