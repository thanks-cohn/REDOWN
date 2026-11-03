# CODEX MASTER REQUEST: EXTRACT V3'S ACTUAL MECHANICS, PROVE THE BASELINE, AND PREPARE THE V3+1 FOUNDATION

**Owner request date:** 2026-11-02
**Repository:** thanks-cohn/REDOWN
**Mandatory existing branch:** codex/v3-parity-first-reconstruction
**Execution class:** P0, READ-ONLY PRODUCTION AUDIT / SOURCE EXTRACTION / EVIDENCE / DOCUMENTATION / FUTURE-ENGINE SPECIFICATION INPUTS
**Deliverable:** an intelligible, source-grounded, independently reviewable **V3 Mechanical Reconstruction and V3+1 Gap Dossier**.
**DO NOT BUILD THE NEXT ENGINE IN THIS RUN.**

This is the expanded master request. It complements and takes priority as execution guidance over the earlier request at NEED_TO_DO/CODEX/CODEX_REQUEST_V3_PLUS_ONE_MECHANICS_AND_LOGICAL_RECONSTRUCTION_AUDIT_2026-11-02.md. That earlier request is retained as historical owner direction, not overwritten. Both should inform coverage; if they differ, preserve the distinction in the owner decision register and use this master audit's source-first and non-mutating boundaries.

## A. THE MOST IMPORTANT INSTRUCTION: WHAT IS THE CODE, REALLY?

The owner has repeatedly received explanations of what REDOWN V3 is *supposed to do*, while actual installed behavior differs. This run must break that cycle.

**First discover what is actually implemented, wired, loaded, written, projected, registered, routed, tested and observed. Do not trust an old README, handoff, test name, specification or previous Codex claim as evidence of executable behavior.**

Start with the current branch and exact HEAD. Identify what the installed extension would actually load from the manifest and import graph. Trace code, not just exported names. Independently run existing focused local tests and safe read-only reproductions when the execution environment permits. Cross-check docs only *after* establishing source mechanics. Call out obsolete documentation, stale test expectations, code-path mismatches and contradictory reports explicitly.

Important evidence states, never interchangeable:
- **SOURCE-CONFIRMED:** specific executable code and exact current source anchor.
- **LOCAL-REPRODUCED:** real current implementation exercised in a local/controlled fixture with captured input and output.
- **INSTALLED-CHROME-OBSERVED:** actual installed native-browser action and visible UI; provide environment/build evidence.
- **LIVE-PROVIDER-VERIFIED:** provider-authoritative result, only if separately authorized; this audit does not authorize cloud writes.
- **DOCUMENTED-CLAIM:** assertion in a prior document, not yet confirmed.
- **OWNER-INTENT:** desired design for V3+1, not proof that current V3 already does it.
- **UNKNOWN / CONTRADICTED / BLOCKED:** say why, with minimum necessary evidence.

No fabricated tests, no inferred live success from a callback, no declaring absent behavior just because a symbol search missed dynamic wiring.

## B. MISSION AND NON-DESTRUCTIVE RULES

This is not a production refactor, not a quick fix, and not a new V3+1 engine. **Extract knowledge and reproducible mechanical evidence from the current source**, not production modules out of the running extension. The owner and ChatGPT will use the resulting dossier to design and review a separate, later implementation request.

Allowed: inspect repository and history, read code, execute existing safe local/offline tests, create isolated read-only reproduction fixtures, record diagrams/source maps/sanitized test evidence, write new documentation/evidence files and commit/push those NEW audit materials to this branch.

Not allowed: alter extension source, imports, loaders, manifest, permission scopes, UI, transfer engine, cloud configuration, stored user state, native registration, existing tests or assertions, historical Forever Works evidence, protected tags, or any other production behavior. No cloud deployments, real bucket/folder creations, uploads, remote reads that expose user data, credential retrieval, auth/consent flows, migrations, or public URL changes. Do not touch main or release branches. Use the existing checkout; do not create a worktree unless explicitly required by the environment.

Do not use automatic snapshots of real private folder names, tokens, URLs or source-page provenance in the audit. Synthetic examples and redacted identifiers are preferred.

If a test command is unsafe or relies on network/cloud mutations, classify it and do not run it. If a relevant test is impossible in this environment, give precise owner reproducibility steps instead of guessing.

## C. FIRST PASS: FORENSIC ENGINE EXTRACTION AND OWNERSHIP

Deliver a source census grounded in current HEAD. Capture:

1. Actual browser entrypoint and service-worker evaluation order: manifest, service-worker wrapper, entry-bootstrap, background, imported modules, Chrome lifecycle listeners, single toolbar opener, Shelf/BOOT survival mechanism.
2. Every V3 source and owner: domain projections, validate/eligible/resolve, runtime configuration, UI controller, folder picker, cloud listing, activated buckets, Level scopes, snapshots, native registrar, click dispatcher, transfer confirmation.
3. Every native contextMenus contributor and writer: Google Drive, Dropbox, OneDrive, Cloudflare/S3, historical/retired routes, registration reconciliation and collision scope. Verify if only one registrar *actually* owns all writers today; never assume the desired invariant is already true.
4. Every saved state key, schema, writer and reader, expected revision, last-writer behavior, async boundary, cache and invalidation trigger. Include chrome.storage.local/session, IndexedDB, and any files/logical JSON representations actually used.
5. UI lifetime, initial render, module initialization, tree expansion state, cached folders, lazy listing, autosave, Apply, optimistic state and rollback. Identify accidental global/shared mutable state.
6. Cloud identity, authorization, provider API calls, bucket enumeration, folder/prefix listing, page cursors, completeness/expiry, and exact transfer routing.
7. Cross-system dependency and failure graph: V3 versus Chrome registration, Shelf, BOOT, Explorer, History, Google Drive, Dropbox, OneDrive and ordinary transfer paths.

For each symbol or behavior, collect path, source anchor/line range, owning module, main callers/callees, inputs and outputs, read/write state, side effects, tests, last relevant commit if useful, and evidence strength. Cite exact HEAD SHA plus file hash for key artifacts; do not rely on line numbers without source revision.

Prefer simple diagrams, tables and human explanations over dumping whole files. Include executable pseudocode extracted from real behavior with comments stating where it diverges from ideal behavior.

## D. THE CENTRAL MODE STUDY: ONE USER EXPERIENCE, DIFFERENT EXPRESSIONS

The owner wants to understand this with certainty: Simple and Narrow can use one clean folder-picker interface without being the same native menu expression; Depth should be an even simpler participating-bucket plus numeric-depth interaction. Be precise about **current implementation** versus **desired V3+1**.

**Current mode structure to verify:** top-level Simple OR Nested; Nested submode Narrow OR Depth (internally sometimes called Level). Do not silently flatten it into three unrelated top-level selections. Proposed rendering may be revisited by owner, but preserve compatible saved values and discover actual current state before design.

### Simple
What exactly does selection mean today? Where are flat entries generated, what decides the provider leaf versus submenu, where do custom Menu Labels come from, how are defaults chosen, how are multiple shortcuts ordered, when does Home represent an exact SAVE rather than REDOWN dashboard navigation, and where are direct menu IDs resolved? Determine what really happens when no destination is configured, one default exists, extra destinations are added, or another provider connects. Compare with owner rules for a clickable provider default, then eligible siblings, separator, provider-local Home LAST (if currently specified), and safe fallbacks. Investigate competing historical reports with Home FIRST; do not quietly resolve the contradiction by citation alone.

### Nested / Narrow
Explain how the SAME browsing control yields an ENTIRELY DIFFERENT menu expression: selected exact save targets and their necessary real path ancestors only. Examine real current natural trie or parentId behavior, structural-only nodes, labels, root identity, disabled ancestors, multiple accounts/buckets, Save here on a selected parent with selected descendants, original array ordering and menu budgets. Record whether current code really builds paths from segments and whether duplicate same-path records behave as documented.

### Nested / Depth
Show actual sources and step-by-step flow from selected *participating bucket* and depth 1..10 through cached/indexed inventory, bounded listing, pagination, native projection, click resolution and partial status. Bucket root counts as 0; provider heading does not consume directory depth. What is actually cached, persisted, reused across depth 5→3→5 and MV3 restart? What is merely promised in old CURRENT-first documentation? Distinguish a remembered path from writable/authorized current destination. Explain why Depth needs no manual shortcut tree. Document Chrome capacity/bounds and inability to fetch on arbitrary native submenu hover.

### Shared picker versus independent states
Precisely determine whether existing Simple and Narrow share stored destination records, labels, ordering, draft state and validation; whether switching modes *merely changes projection* or genuinely changes the saved set; whether Depth mutates or only reads the same data. Reproduce quick changes, stale responses, two editing windows, canceled changes and Apply failures when safely possible. Record three design alternatives for V3+1: (A) shared exact targets but separate mode-specific presentation/alias records; (B) separate configurations using the same location identity; (C) another minimal solution if evidence justifies it. Explain tradeoffs and migration risk. **Do not mark independent mode state as present unless verified.**

For each section use **3–4 simple IF/THEN/ELSE statements** in plain English, plus a worked example and actual call trace. Avoid walls of symbolic proof.

## E. MANDATORY EXHAUSTIVE PATH / ALIAS EXPLANATION

The dossier must make duplicates intuitive to a user and deterministic to a future engineer. Distinguish:
- **real destination identity:** provider kind + connection/account + exact bucket/container + exact object prefix or native folder ID.
- **save shortcut identity:** a distinct stable action even when two shortcuts share a real destination.
- **menu branch/presentation-instance identity:** a navigational visual location; may be synthetic and non-writable.
- **display label:** presentation text, never an authorization token or routing key.
- **selection approval/checkmark:** marks an exact save target in the corresponding mode, not an authorization to expose every unselected ancestor as a save.

For EACH scenario show (a) the picked paths and checkmarks, (b) actual serialized current records, (c) actual Simple projection, (d) actual Narrow projection, (e) exact menu action IDs/resolved canonical targets, (f) V3+1 desired projection, (g) possible failure and test.

**Required cases:**
1. Different final folder, same path prefix: Art/Photography/Weddings versus Art/Photography/Portraits.
2. Different final two levels: Art/Photography/Clients/John versus Art/Photography/Personal/Family.
3. One selected parent and one or more deeper selected descendants, with correct explicit Save here at selected submenu parents.
4. Exact same folder twice with DIFFERENT labels: Client Photography and My Portraits. Both names must be separately selectable; a click must lead to only one exact target and a single save.
5. Same exact folder twice with the SAME visible label; no ID collision; show ambiguity warning but no silent merge.
6. Exact shared folder also has children; display alias actions and descendants without transforming a navigation item into an ambiguous save.
7. User explicitly wants TWO differently named full branches pointing at the same real path (a special branch-presentation instance, not merely a duplicate leaf alias). Explain whether the current schema can do this at all.
8. Different remote folders with the SAME label, same bucket names across accounts, multiple S3 endpoints; never merge by text.
9. Similar-prefix trap: x versus x-extra; case and Unicode-preservation; no accidental prefix matching.
10. Disabled ancestor/child, stale native menu ID, deleted shortcut, revoked/missing connection, invalid path and duplicate record ID.
11. One real target used in both Simple and Narrow but with different selected status, labels or order; distinguish actual current coupling from desired independent editing.
12. Default bucket-root action versus independently named root alias; provider Home SAVE versus REDOWN GO HOME navigation.

Use sample menu trees with explicit markers such as [NAV ONLY], [SAVE], [SAVE HERE], and target tuples. State whether automatic shared-ancestry coalescing is appropriate and when **explicit alternate branch instances** must override that coalescing. Propose a non-janky interface for adding second/third aliases with one contextual "Add another menu entry" affordance, and an advanced intentional "Add alternate branch" only when asked. Describe how multiple labels appear in Setup without creating extra cloud folders. A simple checkmark alone does not represent multiple aliases; say precisely what additional edit control is needed.

## F. INVESTIGATE THE FIRST-OPEN FOLDER TREE DEFECT FROM CODE

Owner report: opening Right-Click Setup currently requires pressing "Browse Folders" before left-side disclosure arrows meaningfully reveal folders. That is unacceptable for V3+1.

**Do NOT assume the cause.** Reproduce and trace initial account/bucket snapshot; view construction; folder-cache initialization; expanded set; row/disclosure event; browse handler; list request; caching; rerender; errors. Identify exactly where clicking an arrow fails to request children, renders only cached children or lacks data. Separate first-installed profile, prepared connections, empty bucket, large bucket, cache hit, cold cache, expired credentials, partial list and multiple bucket cases.

V3+1 proposed minimum user journey:
1. Open Setup: known providers/accounts and bucket roots are shown immediately as data permits, with a trustworthy loading state otherwise.
2. Click a folder arrow: expand immediately; missing children are lazily requested automatically, in bounded pages with clear progress and no second "Browse Folders" prerequisite.
3. Navigate to the desired folder; check it as an exact save destination; optionally edit/add alias display name.
4. Preview and Apply. Do not require a whole-provider scan, hidden reload, or long re-authorization for every navigation action.

Assess perceived latency, race cancellation, keyboard focus/typeahead, accessible tree semantics, scroll preservation, loading/error/empty affordances, pagination, stale/cached items, refresh, disclosure state persistence and "single obvious next step" design. Explain how both Simple and Narrow use the identical picker without coupling the resulting menu configurations.

No UI implementation in this run.

## G. CURRENT JSON, CURRENT/WORKING/BACKUP, AND FUTURE INDEXING

Inventory every real JSON and persistence mechanism: chrome.storage keys (including any logical "right-click.json"), current/desired/applied menu generations, known-folder memory, revision counters, IndexedDB, logs, filesystem artifacts, actual journal/checkpoints, and any CURRENT/WORKING/BACKUP records. Demonstrate what is WRITTEN and READ TODAY, with exact code, data structure and lifecycle.

Some documentation claims JSONL, CURRENT-first durable directory knowledge, daily/weekly checkpoints and live convergence. Others say parts remain proposals. **Prove which parts are real at this HEAD; explicitly mark anything not implemented.**

Proposed V3+1 S3-index architecture for future owner review:
- One connection-scoped knowledge graph containing exact authorized container/folder identities, source of observation, generation, timestamps, stale/complete/partial flags, pagination/frontier and bounded change history.
- A current.json-like logically current state; optional period snapshots (daily and weekly), diff/journal or equivalent; precise policy for whether they are stored files versus logical database records, and which parts are UI configuration.
- Scope/key isolation across S3 connections, and separation of cloud index from mode-specific shortcuts/labels.
- Preserve remembered valid observations when a read fails, without treating stale memory as live write permission. Never infer remote deletion from incomplete scan.
- Chrome MV3 does not promise perpetual execution; provide honest event-driven periodic rotation and optional backend scheduler only if separately authorized; no fake every-midnight claim.
- No credentials, tokens, private URLs, page-source history or browsing provenance in indexed schema or exported evidence.
- Crash recovery, safe versioning, migration, backup retention/pruning, and actual persistence-after-uninstall limitations.

Compare three possible models (reuse existing stored V3 inventory, evolve existing CURRENT mechanisms if real, new provider-scoped index contract) on compatibility and cost. Do not mandate a new database without proof it is necessary.

## H. S3 ADAPTER FRAMEWORK VS INDEPENDENT NON-S3 SYSTEMS

The owner wants a provider-neutral **S3 V3+1** engine. Cloudflare R2 is the currently proved baseline to inspect; MEGA S4 and other future S3-compatible endpoints should be added *through adapters*, not by branching S3 menu algorithms per vendor. S3 providers are **siblings under REDOWN**, never nested underneath the Cloudflare menu simply because Cloudflare was first.

Propose a precise S3 adapter contract and explain how connection credentials/endpoint/scope are validated and stored privately, how bucket/container roots are enumerated, how folder-like prefixes are listed and paginated, how exact save targets resolve and how capability failures are represented. Use a fictional S3 fixture to test vendor/connection isolation. Distinguish S3 prefixes, virtual folders, directory markers, native provider IDs and optional API features. A success callback is not provider-confirmed stored object truth.

**Critically:** Google Drive, Dropbox and OneDrive must remain independent provider implementations. They do not import or depend on S3 V3 modules, S3 index or S3 credentials, and S3 V3 does not import their internals. They can reuse the *same understandable user-facing Simple/Narrow/Depth conventions*, implemented behind their own provider interfaces. Only the narrowly defined Chrome native-menu registrar/protocol is shared among their independently generated menu contributions. Audit actual current wiring for departures from this vision; don't claim these boundaries are already proven.

Provider branches must be independent: a failure to enumerate MEGA must not destroy Cloudflare entries; a V3 failure must not disable Google Drive, Dropbox, OneDrive, Shelf or BOOT; a non-S3 change must not corrupt an S3-specific configuration. Clarify that truly independent *failure behavior* requires test coverage at shared registration and worker-bootstrap boundaries, not merely separate files.

Also explain the optional future reusable S3 Explorer and side-by-side S3 connections; keep Explorer UX from becoming a hard dependency of native menu registration or save routing.

## I. FAILURE MECHANICS, DEBUGGING, AND FOREVER WORKS

Document the entire exact operation chain:

    service worker evaluation / BOOT -> toolbar/Shelf setup entry
    -> UI folder browsing / provider listing -> selected target / aliases
    -> validated draft -> persisted config and revision
    -> Simple or Nested(Narrow/Depth) projection -> native menu descriptor
    -> shared registrar reconciliation / Chrome callback acknowledgment
    -> click ID -> current authorized destination resolution
    -> provider-specific transfer -> provider-confirmed receipt / History/UI

For each arrow: inputs, outputs, owner, async side effects, data store, expected failure, timeout, retry limits, cancellation, stale race and what still works if that arrow fails. Identify dangerous global reset, overwrites, fallback to unintended default, duplicate dispatch, optimistic UI falsely reporting Applied, crash between persisted config and native API reconciliation, and worker suspend/restart issues.

Use **Forever Works** for preservation of confirmed capabilities, invariants, dependencies, observed evidence and failures. Maintain a **Mechanics Atlas** alongside it for human-readable call traces, state machines, dataflow examples and event-by-event reproduction. Map both concepts to the actual installed framework and upstream schema; do not invent normative Forever Works entity types or promote unapproved intent. Frozen evidence and existing failures remain frozen. Record new tests separately with observed source hash.

Fault-injection matrix: incorrect/stale native ID; failed Chrome update/create/remove; lost menu-registration callback; storage read/write rejection; worker import error; Shelf start when V3 core fails; depth timeout; repeated cursor; corrupt cache; missing profile; changed account/connection; stopped scan; two concurrent saves; two setup windows; duplicate labels; provider adapter list failure. Test only in non-mutating local fixtures or declare OPEN.

**Important:** "Forever Works" is a preservation methodology, not a claim that zero future bugs are possible. The desired architectural property is that a localized change has a narrow, testable blast radius and clear rollback.

## J. COMPARISON: ACTUAL WORKING SYSTEM VS OWNER'S V3+1 VISION

Produce a detailed two-lane, versioned comparison by subsystem:

| Requirement / case | ACTUAL current code and result | Claim in current/historical docs | Desired V3+1 | What is already reliable | What is broken/unknown | Dependency and migration risk | Necessary proof or owner decision |
|---|---|---|---|---|---|---|---|

Minimum areas: startup/Shelf, native Chrome registrar, provider root/default Home, Simple flat save, Nested/Narrow trie, Nested/Depth discovery, bucket activation, first-open Browse defect, checkmarks and UI labels, aliases, alternate branches, duplicate paths/IDs, saved mode isolation, JSON persistence, daily/weekly plans, S3 credentials/adapters, Google Drive/Dropbox/OneDrive independence, S3 Explorer/side-by-side, remote save privacy, exact verified transfer, and recovery.

Explicitly document:
- **KEEP AS PROVEN** — real tested behavior and required backward compatibility.
- **KEEP BUT REPAIR** — behavior present but demonstrably deficient.
- **MISSING** — desired behavior absent or not wired.
- **CONFLICTING** — source/docs/owner choices disagree; show evidence and suggested resolution, do not quietly decide.
- **UNKNOWN** — insufficient evidence; give next observable gate.
- **PROPOSAL ONLY** — future design idea, not an existing implementation.

Separate the quality of *user experience* from the existence of technical plumbing. A UI is not intuitive merely because its underlying API functions, nor is a remote save proven by a green DOM test.

## K. DELIVERABLES: WRITE THE DOSSIER FOR THE OWNER AND THE NEXT CODEX SESSION

Create a single navigable folder **FOREVER_WORKS/v3-plus-one-master-audit/** with at least the following durable files. Link all material from 00_START_HERE.md:

1. **00_START_HERE.md:** owner-friendly executive explanation, exact HEAD, scope, findings, what works and breaks, important open gates and reading map. No marketing claims.
2. **01_SOURCE_CENSUS_AND_BOUNDARIES.md:** actual loaded modules, call/writer inventory, ownership graph, source SHA anchors, browser/BO0T/Shelf independence map and non-S3 provider isolation.
3. **02_MECHANICS_ATLAS.md:** entire first-open, browse, select, Apply, register, click, authorize, transfer and receipt execution chains with plain-language explanations.
4. **03_MODES_ACTUAL_VS_DESIRED.md:** identical picker inputs illustrated as Simple vs Nested/Narrow vs Nested/Depth; real current storage coupling and proposed separate mode semantics; mode diagrams and 3–4 IF/THEN rules per subject.
5. **04_DUPLICATES_ALIASES_AND_BRANCH_INSTANCES.md:** every path case in section E, exact IDs/routes and menu trees, and intuitive proposed alias UI with distinction between shared ancestry and alternative named branches.
6. **05_FOLDER_BROWSER_FIRST_OPEN_FORENSICS.md:** source-proved Browse Folders prerequisite chain; first-open/cache/cold/arrow states and future lazy-on-expand contract with failure/latency UX.
7. **06_STORAGE_INDEX_AND_JSON_REALITY.md:** authoritative writers, storage keys, revisions, CURRENT/WORKING/BACKUP/JSON/JSONL truth, existing durability/failures, future daily/weekly candidate contracts.
8. **07_S3_ADAPTER_AND_CLOUD_ISOLATION.md:** S3-only V3+1 contract, sibling providers, test-only adapter, independent Google Drive/Dropbox/OneDrive, shared registrar responsibilities and S3 Explorer considerations.
9. **08_RELIABILITY_FOREVER_WORKS_AND_REGRESSION.md:** exact current evidence levels, unchanged baseline test failures, failure graph, invariants, safe fault-injection matrix, release gates and untouched historical evidence.
10. **09_CURRENT_VS_VISION_GAP_LEDGER.md:** detailed evidence-backed matrix with issue/risk priority, keep/repair/missing/conflicting/unknown classification and test requirements.
11. **10_V3PLUS1_BLUEPRINT_FOR_NEXT_CODEX_REQUEST.md:** **NOT** implementation; minimal safe, ordered, reversible extraction/migration/design stages; acceptance criteria and questions the owner must settle before a later code request.
12. **11_OWNER_DECISION_REGISTER.md:** short natural-language unresolved choices, source of uncertainty, recommended default, consequences; no false owner approval.
13. **12_NEXT_REQUEST_INPUT_CHECKLIST.md:** an assembly checklist for ChatGPT and owner: code anchors, settled behaviors, protected boundaries, migration plan, fixtures, metrics, installed Chrome checks and exact open questions needed to draft the NEXT implementation request.
14. **evidence/** sanitized command logs, fixture inputs/outputs, test output, a JSON source census and reproducible observation recipes where permitted.

Files should be truly substantive; a checklist, summary or repeated promises alone do not qualify. Keep each file internally coherent and easy for another agent to skim and verify. Use hyperlinks and file paths to navigate. Tables and diagrams are welcome; no need for excessive formal logic. **Three or four ordinary IF/THEN/ELSE rules per major topic, with concrete examples, are preferred.**

## L. AUDIT ACCEPTANCE GATES — STOP SHORT OF IMPLEMENTATION

**G01 Branch / safety:** correct checked-out branch, clean source; protected tags and production files unchanged. Store audit output under the new folder only.
**G02 Runtime truth:** actual loaded manifests/imports/event handlers and every native writer accounted for; every significant assertion has verified source anchor.
**G03 Model accuracy:** current Simple/Narrow/Depth paths explained with actual schemas and callable code, not only design docs.
**G04 Human understandability:** read-through examples show shared picker versus different native projections and parent selected + children results.
**G05 Duplicate correctness:** all Section E cases traced and classified; any proposed semantics are explicitly identified as NEW.
**G06 Browse root cause:** source-proven first-open/browser discrepancy with reproduction where possible; exactly why mandatory Browse is needed today, if indeed needed in source.
**G07 Identity / routing:** no route resolved from a label; prove or flag stale ID, same-bucket-named cross-account routes, default Home and selected Explorer paths.
**G08 JSON reality:** every proposed daily/weekly/current capability separated from implemented stores and tests.
**G09 Adapter / isolation:** an implementable S3-only adapter contract proposal and explicit independent non-S3 provider boundaries; common registrar safely merges contributions.
**G10 Evidence honesty:** existing failures retained, no stale hashes refreshed to hide them, tests local versus Chrome/live labeled, untestable behavior OPEN.
**G11 No implementation:** no runtime, UI, manifest, tests, credentials, provider accounts or release artifacts modified by this audit.
**G12 Next-run ready:** another agent and the owner can inspect the dossier, see source-vs-vision gaps and write a tightly scoped V3+1 Codex implementation request without rediscovering fundamental mechanics.

Run applicable safe existing repository diagnostics and focused tests, with exact commands/results and baseline comparisons; no synthetic "all pass" claim. If source changes outside the new audit folder appear in the working tree, report them and do not erase/revert work belonging to others.

## M. REQUIRED END-OF-RUN HANDOFF

Commit and push **only** the new audit documentation/evidence to codex/v3-parity-first-reconstruction. Provide:

- Exact new commit SHA and links to 00_START_HERE.md and the gap ledger.
- Eight to twelve of the most consequential source-proven facts, each with anchors.
- A plain-English answer to: **What does the CURRENT engine actually do, how do Simple/Narrow/Depth differ, why is Browse Folders necessary today, how do duplicate/overlapping aliases route, what storage actually exists, and what would make V3+1 sustainable?**
- A concise owner decision list, with recommended defaults distinguished from approved decisions.
- Actual verification results and any blocked Chrome/live checks.
- The smallest safe proposed sequence for the **next** Codex engineering request, not a new engine or production patch.

**Do not start the next implementation phase.** This run's success is a truthful, understandable, complete mechanical reconstruction from current code, with reliable preservation evidence and a traceable map from the working V3 to the desired V3+1.

**Owner's philosophy:** predictable, standardized and boring engineering underneath; intuitive one-click folder selection above. When a folder is visible, its expansion arrow should work without an extra Browse Folders ritual. When a destination is checked, the save target should be exact. When a menu label is duplicated, identity must still be unambiguous. When S3 providers are added, V3+1 should not require rewriting its three menu algorithms. And when V3 changes, Shelf, BOOT, Google Drive, Dropbox and OneDrive must not break.
