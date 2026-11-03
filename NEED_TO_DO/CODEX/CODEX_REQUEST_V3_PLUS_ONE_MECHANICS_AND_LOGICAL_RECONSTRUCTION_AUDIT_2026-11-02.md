# CODEX REQUEST — SOURCE-FIRST V3 MECHANICS EXTRACTION AND V3+1 LOGICAL FOUNDATION

**Date:** 2026-11-02
**Repository:** `thanks-cohn/REDOWN`
**Required existing branch:** `codex/v3-parity-first-reconstruction`
**Scope:** forensic source inspection, reproducible non-mutating analysis, owner-review documentation, and a next-run design foundation ONLY.
**Not this run:** V3+1 implementation, UI changes, provider integration, production refactoring, bug fixes, migrations, or deployment.

## P0: THE CODE IS THE PRIMARY EVIDENCE — DO NOT BELIEVE DOCUMENTATION AT FACE VALUE

**INSPECT THE ACTUAL CURRENT CODE AND FIND OUT WHAT V3 IS, NOT WHAT THE DOCUMENTATION CLAIMS IT IS.**

The owner wants a source-accurate, traceable, logically understandable reconstruction of the *existing engine's real mechanics* next to the desired behavior of a future **V3+1**. The current code may contradict older reports, approved plans, current specifications, test expectations, or even recent handoffs. Historical documentation is a list of claims to investigate, **not authoritative evidence that something was implemented or works**. First establish the checked-out HEAD/loaded modules and inspect executable source, event listeners, call graphs, data writes, Chrome APIs, actual projected entries, click resolution and save paths. Reproduce with faithful fixtures and controlled fault injection where safe. Use source file/symbol/line or commit anchors and test outputs for every consequential assertion. A passing mock does NOT prove installed Chrome or a real remote save.

For **each** important question use a four-column record:

| CURRENT EXECUTABLE BEHAVIOR (code/fixture evidence) | EXISTING DOCUMENTATION CLAIM (citation and date) | V3+1 OWNER GOAL (proposal, NOT implemented) | MISMATCH, UNCERTAINTY, AND TEST TO RESOLVE |
|---|---|---|---|

Distinguish *observed installed-browser behavior*, *locally reproduced*, *source-confirmed*, *documented only*, *proposed*, *unknown*, and *contradicted*. Never silently promote proposals into current behavior, suppress known regressions, or claim a feature works because an old report says it does.

## 1. PURPOSE AND NON-DESTRUCTIVE BOUNDARY

This run is to deliver the documentation that the owner and ChatGPT will review **before writing a separate Codex implementation request** for V3+1. The owner does **not** authorize changing the current working V3 or introducing a new engine now.

- Audit/extract the *mechanical description* of the live V3 from source, not the production code itself. Preserve production files, tests, configs, manifests, API schemas, credentials, transfer paths, native menus, protected refs and existing Forever Works/frozen evidence.
- Documentation and new read-only evidence files are allowed; commit and push these documents to the named branch, if available.
- No live-cloud writes, Worker deployment, public URL enablement, permission changes, user-object operations, provider credentials, or programmatic operations that mutate a real account.
- Never describe mock evidence as live proof; use a clearly labeled OPEN gate when installed Chrome or a provider cannot be tested.
- Do not reintroduce a Legacy right-click engine or create competing native menu writers.

A completed run is a deep audit and an explainable next-engine design **foundation**, NOT implementation or approval to implement.

## 2. READ THE SOURCE FIRST, THEN TEST THE DOCUMENTATION

Start with `git status`, the actual branch, HEAD SHA, manifest runtime load graph and dependency closure. Inspect the source in execution order before accepting any written architecture claims. At minimum trace:

- `extension/service-worker.js`, `extension/entry-bootstrap.js`, `extension/background.js`: worker startup, toolbar/Shelf independence, menu registration, installed/startup/wake paths, message dispatch, apply transactions, native click routing, transfers.
- `extension/right-click-v3.js`: configuration validation; IDs; eligibility; `simpleTargets`, `simpleProjection`, `narrowEntries`, `narrowResolve`, `roots`, `discover`, `levelProjection`, `project`, `resolve`; migrated/activated buckets and actual data dependencies. Do not assume these symbol names are still accurate: confirm and update source map.
- `extension/beta/right-click-v3-ui.js`, its HTML/CSS imports, tree/folder browser, disclosure arrows, lazy folder retrieval, selection, checkmarks/adding, labels, ordering, mode toggles, drafts, autosave and explicit Apply.
- Cloudflare API helpers and the actual list-objects/prefix/pagination adapter; the existing JSON inventory/snapshot logic, `chrome.storage` writes, cached generations, server/worker boundaries, profiles and permissions.
- Current tests and actual fixture loaders, not just report summaries; existing non-S3 provider contributions and their relation to native registration; Explorer's own context menu versus Chrome's page right-click.

Only **after** source reconstruction, check `AGENTS.md`, `FOREVER_WORKS/README.md`, `POLICY.md`, `CURRENT_STATE.md`, `TRACEABILITY.md`, `FAILURE_ATLAS.md`, `forever/manifest.json`, `FOREVER_WORKS/v3/HANDOFF_LATEST.md`, `CANONICAL_DESTINATION_AND_MENU_CONTRACT.md`, `P0_MENU_MODE_RECONSTRUCTION_CONTRACT.md`, `P0_V3_ONLY_GLOBAL_BUCKET_ACTIVATION.md`, `NEED_TO_DO/CODEX/logic-tables.md`, `Explanation.md`, latest right-click handoffs and BOOT/toolbar reports. Record when current code confirms, partially supports, or contradicts each claim. Source itself establishes implementation mechanisms, not correctness of intended product behavior.

Respect the *existing owner-approved menu rules* unless clearly marked as a fresh proposal: top-level Simple OR Nested; Nested contains Narrow or Depth (internal `level` compatibility); provider-local default/Home save is distinct from dashboard Home navigation; provider-local siblings/default ordering; no unapproved provider dependency; exact save routing.

## 3. DELIVER A REAL MECHANICS ATLAS, NOT A GENERAL ESSAY

Trace actual calls and state transitions:

```text
installed extension / worker wake
  -> open setup / snapshot
  -> account, bucket and folder presentation
  -> click disclosure arrow / browse / remote listing / cache
  -> selected destination / label / parent relationship / draft
  -> save validation / storage revision and serialization
  -> Simple or Nested(Narrow or Depth) projection
  -> merged Chrome native-menu plan and register/update callbacks
  -> native menu click ID
  -> current-state target resolution / provider authorization
  -> exact save operation
  -> provider-confirmed outcome / History / UI feedback
```

For every arrow identify the **real source file/function**, input and output, identity and schema, ownership, storage keys, writes/side effects, worker lifecycle, error handling, ordering, contention, invalidation, restoration and **which unrelated component can be affected by failure**. Record diagrams plus short readable explanations, not only JSON inventories. State which browser calls are API-acknowledged versus actually visible or tested.

Enumerate module imports, shared mutating state, circular/implicit dependencies, native menu writers and inter-component hazards; show why editing a Narrow routine could affect Simple, Depth, registration, BOOT or Shelf. Do not assert sabotage or an unproven root cause. Trace the actual mechanism.

## 4. SOURCE-ACCURATE SIMPLE / NARROW / DEPTH: SAME PICKER, DIFFERENT EXPRESSIONS

These are *menu presentation rules*, not three independently registered Chrome engines.

**Simple:** a chosen set of exact targets becomes a flat collection of save actions in the provider's native submenu, with optional display labels. Explain the REAL current default destination, provider-local Home leaf/last behavior, added siblings, ordering, IDs, label fallback and click routing. Proposed label fallback for review: bottom directory name by default, bucket name for bucket-root; a Settings preference may affect the fallback without changing target identity.

**Narrow:** the owner should browse through the same intuitive location picker, yet the menu displays only selected/approved targets plus enough natural intermediate ancestry to reach them. Intermediate nodes not selected are navigation only; when a selected parent also has selected descendants, provide an explicit Save here action. Trace what current source *actually* does: parentId relationships, trie derivation, path segments, synthetic nodes, exact actions and eligibility. Explain any divergence from expected visual behavior.

**Depth / internal Level:** no manually curated shortcut tree is required. Selected participating S3 buckets/containers plus numeric depth determine an automatically projected hierarchy from discovered/cached real cloud paths. Explain bucket root at level 0, folders at 1..10, actual prefix/listing pagination, marker/virtual folder semantics, bounded discovery, partial status, freshness, selection and authorization. Depth must not make claims of exhaustive coverage when budgets limit traversal; mode/depth display switching must not be construed as deleting known remote locations.

**The key comparison:** Show an identical selection of two paths in the SAME picker, then render it once as Simple and once as Narrow, and contrast with Depth's provider-discovered view. Trace current UI state and persistence: does it *actually* share destination records across modes, or save mode-specific sets? Which settings survive reload, switching, rapid edits or stale acknowledgments? Do not assert independence that current code does not deliver. The V3+1 goal is independent per-mode presentation/edit state as decided by owner, while reusing components, provider references, stable adapters and registrar rather than reinventing everything.

Use **3–4 simple IF/THEN/ELSE rules per section**, plus ordinary prose and deterministic examples; no mountains of formal proof notation.

## 5. MANDATORY PATH-COLLISION, DUPLICATE LABEL AND ALTERNATE BRANCH CASES

This is central, not optional. Reproduce from the actual V3 schema and projection/resolver, then show the proposed V3+1 behavior, with input records, ASCII menu trees, action IDs, exact resolved target tuples, and UI interactions for EVERY case below.

1. **Common ancestors, diverge at last folder**:
   `bucket/Art/Photography/Weddings` and `bucket/Art/Photography/Portraits`. One common Art/Photography branch, two exact save leaves.
2. **Diverge at last two levels**:
   `bucket/Art/Photography/Clients/John` vs `bucket/Art/Photography/Personal/Family`. Branch at the first differing segment; no duplicate shared ancestry.
3. **Selected parent AND its descendant(s)**:
   `bucket/Art`, `bucket/Art/Photography`, `bucket/Art/Photography/Portraits`. Each approved target remains saveable, the parents use explicit Save here actions.
4. **Exact same real location with different shortcut labels**:
   Both aliases target `bucket/Art/Photography/Portraits`, displayed as `Client Photography` and `My Portraits`. Separate shortcut/action IDs, same exact save target, no duplicate remote folder, no duplicate save per click.
5. **Same exact target aliases plus selected children**: differentiate folder-as-navigation and alias actions under it; descendants still accessible.
6. **Two full named visual branches into the SAME physical path**: distinguish simple leaf aliases from *explicit user-created alternate branch instances*. Do not auto-clone an entire branch merely because a second alias is added. Show independent branch IDs and their labels.
7. **Same visible label, different targets** and **same bucket names across accounts/providers**: deterministic display disambiguation, stable IDs, no merging or routing by text.
8. **Disabled ancestor, deleted destination, stale native ID, revoked provider permission, x versus x-extra, missing remote folder, page limitations, reordered siblings, rapid mode switch**.
9. **Same real target in Simple and Narrow with different user labels/selections**: explain actual current storage coupling and proposed mode isolation.

Define the identities precisely and mark **CURRENT vs PROPOSED**: provider connection identity; real location identity (provider/connection/container/exact prefix or folder ID); individual shortcut/save action identity; menu branch-instance/presentation identity. Label never grants authorization. One cloud location may have multiple aliases, even two identical labels (warn but don't merge). Selection checkmark means exact save permission for that menu configuration; showing a navigational ancestor does NOT implicitly approve it.

Explicitly answer:
- Does current V3 validation permit multiple same-path entries? Under what IDs/parent constraints?
- Do current Narrow projection functions merge or separate them? How are duplicate branches handled today? Is the behavior actually tested?
- What menu projection happens when a shortcut is also a parent of selected children?
- How does a first-time user add ONE alias, a SECOND alias with a custom name, or intentionally add a named alternate branch without exposing overwhelming controls?
- Why can't mode-specific labels be stored solely on the real cloud location record?
- What exact key/revision migration would future separate mode configurations require, and how do we preserve existing user data?

## 6. THE “BROWSE FOLDERS” DEFECT — EXPLAIN THE REAL CAUSE

Current reported issue: on first entering Right-Click Setup the tree disclosure arrows do not meaningfully expand until the user separately clicks **Browse Folders**. Investigate actual tree state initialization, `draw()`, `browse()`, folders cache, `expanded` state, UI event handlers, snapshot/listing and provider auth. Confirm the cause from source/fixture; no guessing. Show the event/call diagram for **first-open**, **first expand**, **cache hit**, **cache miss**, **expired credentials**, **empty bucket**, **large paginated bucket**, and **partial request failure**.

V3+1 UX goal: connection and bucket roots visible promptly; click a folder arrow and the requested children load automatically if absent; browsing is not an extra mandatory step; choosing a save destination is a checkmark/one obvious action; optional label can be edited without changing actual folder. User can apply without performing a full-cloud scan. Record performance/read budget strategy, skeleton/loading/empty/error states, keyboard/typeahead and focus, lazy caching/invalidation, work cancellation and safety. Current findings and desired behavior must be in separate columns.

## 7. S3 ADAPTER-READY DESIGN — NO CLOUD PROVIDER BENEATH CLOUDFLARE

S3-compatible connections (including Cloudflare R2, MEGA S4 where its implemented API permits, and future S3 endpoints) should be siblings under REDOWN. Each S3 connection gets its own provider/connection identity, bucket inventory, optional mode choice, labels, index and exact destination routing, but reuses a logically stable S3 adapter contract and menu projection conventions. Make a **contract proposal**, not an implementation:

- Connection setup: endpoint, region/signing details, access-key ID and secret/access token as required; secure credential ownership; discover only buckets permitted by scope; capability and permission validation; avoid assuming all S3-compatible vendors implement every optional operation.
- Adapter operations for container inventory, immediate folder-prefix listing/pagination, exact location resolution, authorized save delegation, and capability/error classification.
- Provider-neutral S3 location tree outputs, opaque IDs and exact native provider targets; explicit policy for virtual prefix folders and partial/stale observations.
- A **test-only fictional S3 adapter** as V3+1 conformance gate: plug in a new vendor with same-name buckets, duplicate aliases, empty folders and failures without editing Simple/Narrow/Depth algorithms.
- Cloudflare R2 must be one sibling, not a namespace housing other S3 providers.
- Google Drive, Dropbox and OneDrive are **independent provider engines**: no V3 imports or reliance on V3 storage, S3 index, startup or transfer. They can adopt the same Simple/Narrow/Depth *user-facing conventions* with their own backends and share only the narrow native Chrome menu registration boundary. Show exact preservation of isolation and per-provider menu ownership/failure domains.
- One native menu registrar owns Chrome API orchestration, collisions, stable IDs and reconciliation; it must not destructively reset other providers when V3 has a failed plan. Clarify that Chrome's menu API is not truly atomic and that UI/logical rollback guarantees must be truthful.

## 8. JSON/CURRENT/DAILY/WEEKLY: VERIFY THE MECHANICS BEFORE PROPOSING CHANGE

Find what CURRENT/WORKING/BACKUP, `right-click.json`, inventory keys, snapshot generations, journals or per-provider metadata ACTUALLY exist today and where they are persisted. List exact read/write paths, scope, TTL, indexing completeness, revival on MV3 worker restarts, data loss boundaries, and whether a “daily.json” or “weekly.json” file is implemented at all. Never claim an owner wish exists in code.

V3+1 goal for owner review: S3 connection-specific `current.json` as fresh committed knowledge, bounded `daily/<date>.json`, `weekly/<week>.json` snapshots and validated completeness/freshness state, without secrets or browsing provenance. The index should be separate from UI menu configuration and should serve V3 S3 Depth and possibly the S3 Explorer without coupling V3 to other cloud engines. Explain Chrome MV3 scheduling limits and conditions for truly unattended snapshots, consistency models, atomic local commits where possible, backup retention/pruning, and what happens on an interrupted scan, missing permission or deleted cloud prefix. History snapshots are not live authorization.

## 9. PROPOSE THE ISOLATION BOUNDARIES; DO NOT BUILD THEM YET

Create a proposed ownership map with contracts for:
- Service-worker boot/Shelf (must remain responsive even if V3 fails).
- Independent provider registration and credentials.
- Folder browser / lazy listing / cached cloud location index.
- Canonical S3 location identities.
- Shortcut/alias configuration and optional branch presentation identities.
- Pure Simple projection; pure Narrow projection; bounded Depth discovery/projection.
- Mode-specific UI drafts, switching, validation, save, rollback/reconcile.
- Common native-menu descriptor format and the single shared Chrome registrar.
- Exact route/click resolution, transfer execution, provider-verified receipts, History.
- Evidence/diagnostic logging, recovery and Forever Works protections.

For each provide: WHAT IT OWNS; WHAT IT MUST NOT OWN; contract input/output; allowed calls; persistence owner; failure blast radius; unit/integration/installed acceptance. Make the distinction between **shared picker UI** and **independent Simple/Narrow output/configuration** unmistakable. Identify current code entanglements with a proposed non-destructive extraction sequence. Do not suggest a wholesale rewrite when a narrow stable boundary suffices.

## 10. REQUIRED DELIVERABLES — DURABLE, READABLE, TRACEABLE

Under a new directory `FOREVER_WORKS/v3-plus-one-audit/`, deliver:

1. **START_HERE.md** — short navigation and what is verified vs unverified; explain the engine to a new agent and the owner in plain English.
2. **CURRENT_ENGINE_MECHANICS.md** — full source-first call/ownership/lifecycle diagram with cited code anchors, actual behavior and trace paths.
3. **MODE_COMPARISON_AND_TREE_CASES.md** — Simple/Narrow/Depth source behavior versus owner goals, exact duplicate/overlapping path examples, UI checkmarks and aliases, output trees and route tables.
4. **UI_BROWSE_FIRST_OPEN_ROOT_CAUSE.md** — verified explanation of Browse Folders dependency, cache/async/first-open state and concrete proposed lazy interaction.
5. **STORAGE_JSON_AND_S3_ADAPTER_BOUNDARIES.md** — current actual JSON snapshot/index behavior versus future current/daily/weekly concepts, exact S3 adapter and independent non-S3 provider boundaries.
6. **CURRENT_VS_V3PLUS1_GAP_MATRIX.md** — one row per requirement with source evidence, doc claim, owner goal, uncertainty, complexity/risk and candidate test.
7. **V3PLUS1_NEXT_RUN_BLUEPRINT.md** — logically ordered, *proposed* stages to later create a new V3+1, including preservation/migration, capability interfaces, isolation, mode projections, UI reconstruction, new S3 adapter and production gates. No implementation in this run.
8. **EVIDENCE.md** and machine-readable non-secret evidence/fixtures where useful — commands, HEAD, hashes/anchors, tests, exact baseline failures, mock-versus-installed distinction, reproduced counterexamples and unresolved questions.

Use 3–4 plain IF/THEN statements per major topic in documents plus normal explanations; add diagrams/tables where they clarify, not pages of abstract formal logic. Link back to actual current code and exact fixture outputs. If relevant old documentation conflicts with current source, mark it **CONTRADICTED**, not smoothed over.

## 11. COMPLETION AND QUALITY GATES

- **G1 Source:** Every major current-state claim has a checked current source anchor; docs alone are never proof.
- **G2 Execution:** Core projection and routing scenarios exercised using actual current algorithms in a controlled harness, when safely possible. If not possible, mark UNVERIFIED and give reproducible next steps.
- **G3 Modes:** Simple/Narrow/Depth and Nested-level compatibility documented with identical-input examples and exact current-vs-desired differences.
- **G4 Duplicates:** The ten overlap/alias/branch cases answered at both UI and algorithm levels; stable IDs and precise save-route resolution demonstrated or marked gaps.
- **G5 Browse UX:** First-open/arrow/Browse Folders issue traced to real event and state logic; concrete lazy-loading contract recorded, not implemented.
- **G6 Isolation:** Side-effect/import graph shows potential Shelf/BOOT/registrar and non-S3 provider impact, plus proposed independent failure boundaries.
- **G7 JSON/S3:** What persists TODAY is proved separately from future index/snapshot/adapter proposals.
- **G8 Honesty:** All tests, historical debt, missing Chrome/live evidence, unapproved owner decisions and platform constraints labeled.
- **G9 Preservation:** No production or frozen historical content changed; only new authorized docs/evidence committed; protected branches/tags untouched.
- **G10 Handoff:** A fresh agent could read START_HERE and answer “what is V3 now, how exactly does it work, why is it fragile, what will V3+1 be, and which next implementation request should be issued?” without guessing.

Finish with a concise owner-readable summary, links to every deliverable, branch/commit SHA, the most important source-proved gaps, the unresolved design choices to review with ChatGPT, and a proposed *future* V3+1 implementation sequence. Do **not** start that future run in this task.

**Owner's guiding principle:** The replacement must be boring, logical, auditable, and durable: one user intent -> one deterministic menu description -> one exact authorized destination -> one verified save. Shared UI does not mean shared mode state; shared Chrome registration does not mean shared provider engines. Capture the mechanics now so that the NEXT implementation request can be correct.
