# IMPORTANT — Universal Agentic Test Corpus & Logical Verification Pipeline

**Shared architectural principle for REDOWN and Click2Cloud**  
**Owner directive:** November 3, 2026  
**Status:** NORMATIVE TARGET / ENGINEERING ROADMAP — **not a claim of implementation, executed tests, or release certification**  
**Identical mirrored specification:** `thanks-cohn/REDOWN/IMPORTANT/UNIVERSAL_AGENTIC_TEST_CORPUS_AND_PIPELINE.md` and `thanks-cohn/Click2Cloud/IMPORTANT/UNIVERSAL_AGENTIC_TEST_CORPUS_AND_PIPELINE.md`. Keep both aligned whenever the shared contract changes. Local implementation code and proof remain project-specific.

## 1. The destination: a testable system that teaches future agents how to test systems

The long-term goal is bigger than REDOWN or Click2Cloud: create a **reusable, machine-readable, self-improving testing corpus and execution framework**. A new authorized agent should discover each subsystem's operations, supported states, transition graph, invariants, errors and integrations, then generate meaningful test journeys, run them against **real production-owned code through narrowly authorized adapters**, compare with **independently specified expected results**, diagnose failures, and add every discovered regression to a durable library.

This is the successful idea behind REDOWN's **Python CLI ↔ Universal File API laboratory** extended to **three coordinated foundations**:

1. **BOOT API:** the extension must start, reopen and recover its toolbar/Shelf/popout/context-menu entrypoints across permitted Manifest V3 startup, sleep, suspend, browser restart, storage and permission scenarios.
2. **RIGHT-CLICK API / V3+1:** Simple, Nested and Depth must produce their canonical MenuSpec, full menu tree, omissions, exact action identity, native registration generations, click routes and verified save effects across all supported providers and changing conditions.
3. **UNIVERSAL FILE API:** every supported list/read/create/upload/download/copy/move/rename/delete/mkdir/batch/remote-ingest operation must have correct provider identity, authorization, file bytes, metadata, conflicts, progress, confirmation, recovery and security behavior.

**Cross-domain testing is mandatory:** a menu may be logically correct but absent when BOOT fails; a right-click action may resolve correctly but dispatch to a broken file adapter; a provider may verify an upload while History/Shelf never records the true outcome. Generate and prove these connections, not just isolated modules.

For future projects, **add a new domain adapter and declarative contract**, not a new bespoke scenario-testing architecture.

## 2. The repeatable agentic loop

```text
OWNER-APPROVED FUNCTIONAL CONTRACT AND INDEPENDENT EXPECTED OUTCOMES
  operation catalog · legal states · guards · transitions · side-effect invariants
                     │
                     ▼
SCENARIO GRAPH + GENERATORS
  finite-state enumeration · BFS/DFS · pairwise and targeted 3-way combinations
  temporal event schedules · property-based edge cases · mutation · replay seeds
                     │
                     ▼
THIN LAB CONTROLLER (engineering-only; Node or Python→Node bridge)
                     │
       ┌─────────────┼──────────────┬───────────────────┐
       ▼             ▼              ▼                   ▼
  BOOT adapter   V3+1 adapter   Universal File API   Future adapters
       │          real JS code      real handlers       real system
       └─────────────┼──────────────┴───────────────────┘
                     ▼
ACTUAL RESULT + SIDE-EFFECT JOURNAL + COMPLETE AVAILABLE DIAGNOSTICS
  BOOT receipts · Glaciaring · API/transfer receipts · missing-evidence gaps
                     │
                     ▼
INDEPENDENT EXPECTED-VS-ACTUAL ORACLES
  state, action, menu, native-ACK level, exact destination, bytes, forbidden writes
                     │
                     ▼
PASS / FAIL / PARTIAL / BLOCKED / NOT_TESTED / UNKNOWN / UNSUPPORTED
   source pinned · seed + replay steps · first and independent failure candidates
                     │
                     ▼
AGENT FIXES THE ACTUAL OWNING MODULE
  → reruns failing seed → neighbor/cross-domain checks → full regression suite
  → preserves prior failing receipt and proven fix → repeats
```

A **scenario engine is not a replacement** for the production BOOT owner, Chrome registrar, file engine, OAuth, provider transport, Worker, Explorer, Shelf or History database. The controller orchestrates the real modules. The adapters inject deterministic external conditions *without copying business logic*.

A usable system should make test runs inexpensive, deterministic, scriptable and inspectable; a new agent can begin from existing metadata and prior failure receipts rather than manually rediscovering the project.

## 3. Exhaustiveness: mathematically honest and maximally thorough

**“Every possible scenario” is achievable only for a fully specified finite model within declared bounds.** Real browsers, networks, filenames, timings, concurrency schedules and input streams create unbounded spaces. The pipeline must make this distinction explicit.

Mandatory coverage layers:

- **Requirements:** every supported contract/user-action row has an ID, state/action, expected outcome, independent oracle, source owner, test and required evidence class.
- **Code branches:** inventory actual guards, failure codes, significant decisions, state transitions and cross-module handoffs; flag missing model rows or untested implementation branches; prevent silent exclusions.
- **Finite-state exhaustive tests:** enumerate all reachable states and transitions for bounded submodels (e.g., boot flags, auth readiness, mode selection, native registration status), including rejecting forbidden transitions and detecting unreachable claimed states.
- **Transition coverage:** cover edges, pairs of consecutive edges, relevant cycles, concurrency/interleaving schedules, restart points, idempotency and compensation after uncertain effects.
- **Combinations:** pairwise and targeted 3-way or higher interaction coverage; deliberately cover account×provider×mode, auth×menu generation×MV3 restart, inventory×mode×Worker capability, and click×upload×receipt×History.
- **Boundaries and generated inputs:** empty/deep/wide folder trees, huge listings, duplicated names in distinct accounts, Unicode/path traversal, zero/large bytes, stale/partial pages, retries/timeouts, missing Chrome ACK, revoked grants, interrupted writes, independent simultaneous failures, hostile labels and secrets in error text.
- **Property-based / fuzz / mutation:** generate constrained valid and invalid scenarios, shrink failures to minimal reproducible seeds, and intentionally inject known faulty behavior to prove the independent oracle detects it.
- **Differential tests:** compare same intended action through programmatic API, internal/in-app working menu and Chrome adapter, without treating one potentially buggy output as its own oracle.
- **Cross-version regressions:** ensure approved prior behaviors survive later code changes and that retired/unsupported actions refuse safely.

Measure **covered contract rows, covered source branches, reachable states, transitions, transition pairs, interaction classes, failure categories and independent evidence levels**. Publishing “10,000 runs” without these denominators is not an acceptable coverage report.

When full mathematical completeness is infeasible, report **coverage gaps and why**. A model's complete state search must not be mislabeled proof of the entire uncontrolled environment.

## 4. Domain contracts: each must be independently and jointly testable

| Domain | Source of truth | Critical scenario families | Independent oracle |
|---|---|---|---|
| **BOOT** | Existing real REDOWN BOOT entrypoint and lifecycle owners | clean install/profile, worker absent/asleep, toolbar click while cold, service-worker startup failure, Shelf and popout unavailable, cache clearing, repeated activation, stuck startup, alarms/recovery, permission changes, native root missing | actual reachable entrypoints, exactly one authorized menu writer, proper repair/unknown status, no invented successful boot |
| **RIGHT-CLICK V3+1** | Three independent mode configs/projectors + one canonical MenuSpec/action resolver, registrar and dispatcher | 0/1/many providers, connected/expired/unauthorized, Simple direct leaf, Nested branches/Save here, Depth unconfigured folder discovery, labels/collisions, same name in distinct accounts, stale generation, partial tree, two Apply races, MV3 recovery | independently authored entire/changed menu tree, exact parent/child order/roles and selected canonical target; preserved unrelated provider/mode state |
| **UNIVERSAL FILE API** | Production handlers and approved provider adapters, not an alternate Python file engine | CRUD, streams/batches, conflict KEEP BOTH, nested paths, zero/large files, source capture, auth revocation, readback, safe retry, timeout/uncertain commit, cancellation, remote ingest, History/GO TO | actual original/destination object identity, bytes/SHA-256 and metadata, nonmutation of source unless requested, independently confirmed provider outcome |
| **CROSS-DOMAIN** | Composition of same production owners | worker cold at click, native registration ACK lost after restart, auth revocation during capture, partial Bucket activation with other providers ready, verified upload + failed History, cache restoration + changed menu mode, startup failure with falsely green menu test | joint state invariants, no wrong-provider write, no premature success/counter, truthful BOOT/Glaciaring/File API receipts and complete detected independent faults |

**The right-click menu is an interaction model, not merely a picture.** The test interface must support opening an in-memory menu tree, following actual parent/child IDs, selecting actionable leaves and observing the resulting real engine operation. A mirror can expose logical behavior without repeated manual clicks; a limited but mandatory native Chrome corpus still proves actual browser registration and user event routing.

**Provider isolation matters:** Google Drive, Dropbox and OneDrive remain separate direct native leaf rows, not nested under Cloudflare; future S3 providers have their own provider namespace. The Cloudflare Nested/Depth engine cannot silently mutate other provider registrations, credentials or user folders.

## 5. Corpus format and permanent learning

A stable, versioned **cross-project scenario manifest** should describe each tested behavior with:

```json
{
  "schemaVersion": "1.0",
  "domain": "right-click",
  "scenarioId": "RC-NATIVE-ACK-LOSS-001",
  "ownerContractRef": "source file + stable clause",
  "initialState": {"mode": "nested", "chromeAck": "pending"},
  "actions": ["apply latest MenuSpec", "lose native callback", "restart MV3 worker"],
  "inject": [{"boundary": "chrome.contextMenus.callback", "outcome": "missing"}],
  "expected": {"appliedGeneration": "must not advance without matching ACK"},
  "forbidden": ["invent applied status", "upload to stale route"],
  "oracles": ["state invariants", "independent native-plan projection"],
  "evidenceClassesRequired": ["ENGINE_INTEGRATION", "INSTALLED_CHROME"],
  "seed": 20261103
}
```

The example is an **illustrative schema, not an already supported CLI or executed test**.

Per execution, produce a versioned `manifest`, `results.jsonl`, `coverage.json`, `failures.json`, reproducible `seed`/minimal steps, expected-vs-actual diff, linked code/test owner, snapshot/build hash, timing/memory metrics and user-safe Glaciaring/BOOT/API receipts.

**Permanent regression rule:** every accepted defect adds an immutable scenario reference, minimized seed, observed failure, correction commit, passing rerun proof, and affected neighboring/cross-domain suites. The corpus retains its historical failure evidence even after a fix, and exposes archived baseline failures without falsely claiming current breakage.

**Agent handoff protocol:** provide discoverable `describeCorpus`, `listDomains`, `listOperations`, `listScenarios`, `getCoverage`, `reproduce` and `exportAgentReceipt` equivalents. The exact API names are design targets, not promises of existing endpoints. A new agent should know the schemas, its capabilities, known failures, fixtures and available authorized test profiles without reading an entire repo unaided.

For new systems, write a **domain descriptor**, a safe **real-implementation adapter**, owned **independent oracles**, a **fault catalog**, a **coverage mapping**, and add targeted fixtures; the shared generator/replay/reporting kernel remains unchanged. Do not allow imported untrusted project text to become privileged executable instructions.

## 6. Prevent agentic cheating, false confidence and missed defects

These are **acceptance invariants**, not optional efficiency guidance:

1. **Never use the implementation as its own golden oracle.** Expected behavior comes from approved user requirements and independently authored assertions, not the current compiler's menu output.
2. **Never suppress, sample away or skip mandatory error/decision observations** to make results green or reduce debugger work. Optimize low overhead through compact signals and deferred queries, retaining explicit drop/eviction/missing markers.
3. **Never stop checking after the first suspected root cause.** Detect independent failures, secondary fault chains, absent checkpoints and uncertain observations; don't turn unknowns into PASS.
4. **Never weaken/alter a golden assertion simply to match defective code.** A genuine contract change needs explicit owner review and impact analysis, not unreviewed test regeneration.
5. **Never count identical behavioral scenarios with only renamed objects or seeds as unique goldens.** 1,000 distinct Click2Cloud journeys is a **target**; generated 10,000+ variations are **separate workload/coverage evidence**.
6. **Never equate a 900+ logical-pass intermediate milestone with launch approval.** One critical wrong-account write, false success, privacy failure or broken BOOT behavior blocks release, regardless of green count.
7. **Never count a fake Chrome callback, DOM mirror, emulator or available Worker as real installed-browser or authenticated-cloud proof.** Preserve `UNIT`, `INJECTED_INTEGRATION`, `INSTALLED_CHROME`, `LIVE_PROVIDER`, `HISTORY`, `PERFORMANCE` and `MIGRATION` evidence classes separately.
8. **Never make unsupported features appear actionable.** Explicitly label genuine unsupported requests and verify a safe refusal. Failure and unobservability are always visible, not hidden behind a pass rate.

## 7. Performance and safety limits

- The scenario kernel and verbose reporting run **outside ordinary customer click/boot/file hot paths**. The released product contains only strictly necessary, efficient, permission-protected telemetry or small stable interfaces; an optional authorized Debug Mode may request more detail.
- Measure passive vs disabled vs explicit debug profiles under **identical critical coverage requirements**. Track p50/p95/p99, heap/memory and dropped/evicted observations. Do not trade away detection for speed.
- Test providers using **deterministic memory/emulated fixtures by default**. Live tests require a separate explicit, appropriately authorized disposable scope; no arbitrary bucket writes, costly loops, unauthorized billing, OAuth escalation or source-page URL leakage. A token alone does not imply approval for thousands of cloud mutations.
- Tests must distinguish **read-only modeling**, local mocked effects, installed browser effects and real provider writes. Never blindly replay uncertain writes.
- Protect credentials, account identities, original source/page URLs and private filenames in committed fixtures, traces and cross-agent handoff exports.
- The presence of an existing BOOT repair method is not license for agents to self-repair or mutate real user environments without authorization.

## 8. Project-specific starting points (follow actual repository state)

**REDOWN**:
- `docs/boot/API.md` — real BOOT namespace and evidence semantics.
- `NEED_TO_DO/CODEX/CODEX_P0_STARTUP_BOOT_API_AND_ENTRYPOINT_RELIABILITY.md` — BOOT scenarios and self-heal engineering contract.
- `docs/beta/PYTHON_CLI_UNIVERSAL_API_HANDOFF.md` — original Python-to-real-Universal-API lab details, limits and historical evidence.
- `docs/reliability/UNIFIED_AGENT_API.md` — existing read-only diagnostics discovery and scope.
- `final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md` — preserve proven right-click and provider mechanisms.
- `latest-1132026/CLICK2CLOUD_TRANSPLANT_THEN_STANDALONE_DEVELOPER_RELEASE_ROADMAP.md` — transplant first, then standalone Click2Cloud API product.

**Click2Cloud** (engineering branch `feat/glaciaring-agent-debug` at initial authorship):
- `AGENTS.md` — developer principle of real-engine scenario iteration.
- `docs/milestones/V3P1_GOLDEN_500_SCENARIO_ATLAS.json` — **500 authored scenario descriptions**, not executable passes.
- `docs/CODEX_EXPAND_GOLDEN_500_TO_1000_AND_VALIDATE_V3P1.md` — Codex request for distinct 1,000-case behavioral constitution plus running lab.
- `docs/milestones/V3P1_SCENARIO_LAB_PRELAUNCH.md` — M0–M10 acceptance gates.
- `docs/GLACIARING_EVIDENCE.md` — historical implementation/coverage/latency evidence, not release proof.

Any source path not in the current checkout must be explicitly fetched from the other repo/branch; **do not pretend a documented cross-project reference exists locally**.

## 9. Engineering milestones — how we build the general-purpose pipeline

| Gate | Deliverable | Required proof |
|---|---|---|
| **U0 — Discover and pin** | Audit actual BOOT, V3+1, file API and diagnostics owners, hashes, existing tests, failures and capabilities; preserve baseline | Source map, current test command/results, known gaps, no invented evidence |
| **U1 — Unified contracts** | Versioned domain schema for operations, states/guards, transitions, effects, errors, permissions, oracles and evidence classes | Schema validation, traceable requirements and unsupported/unknown catalog |
| **U2 — Shared runner** | Fast deterministic controller and adapter protocol invoking actual JS modules; optional thin Python CLI | One command executes/replays a real source-owned test per domain; no alternate engine |
| **U3 — Generation & search** | Bounded exhaustive finite FSM, state graph, pairwise/t-way, interleaving and property/fuzz/mutation suite | Auditable full state/edge enumeration under declared bounds, deterministic seed and shrinking, no count padding |
| **U4 — Diagnostics & oracles** | Glaciaring + BOOT + File API evidence mapping, independent assertions, mixed-domain receipts and fault completeness | Detect intentional wrong route, missing ACK, falsely green upload, worker boot failure and simultaneous independent defects |
| **U5 — Whole-product simulations** | Cross-domain journeys: cold boot → native menu → selected cloud save → independently confirmed file → verified History; recover under interruption | Per-stage actual state/receipt, exact forbidden effects, every missing stage visible |
| **U6 — External acceptance** | Approved installed Chrome MV3 tests + authorized scoped real provider readback + staged REDOWN transplant/rollback | Real installed/browser event evidence, provider byte/hash proof, startup/History, performance/rollback |
| **U7 — Reusable agent product** | Versioned documentation, adapter starter kit, schemas, safe API/CLI, example domains, corpus packages and coverage certificate | A fresh agent implements a fourth synthetic/real adapter and reuses generation, replay and reporting without modifying the test kernel |

**Do not equate U7 with public unrestricted API access.** A future developer-facing interface needs explicit provider permission grants, isolated environments, versioning, security and review.

## 10. Definition of success

A successful pipeline allows a fresh agent to ask, **“What can this system do, what does correct behavior look like, how much have we verified, what has failed before, and how can I reproduce a new failure safely?”** It can then automatically execute a large and relevant test campaign through the real system's owners, discover meaningful edge cases, fix code without modifying expectations, and publish grounded evidence.

A **100% pass rate is meaningful only against a transparently declared, complete-for-scope contract and evidence class**. We aim to cover the most important actual and emerging edge cases and maximize automated confidence; no finite corpus proves arbitrary future software defect-free.

**Never rush a product release because a logical suite looks green.** Complete native Chrome, real provider, BOOT, migration and performance gates remain distinct and non-negotiable.

**Owner's final vision:** A beautifully logical, powerful, reusable engineering pipeline. Start with BOOT + RIGHT-CLICK + UNIVERSAL FILE API. Grow it into a standard that future agents and future projects can inherit.

## 11. Clarification: the pipeline must be **iteratively self-correcting**

The owner specifically means **a closed, evidence-driven repair loop**, not just “run many simulations,” collect logs, and ask a human to investigate everything manually.

**Expected development behavior:** once an authorized agent can run the corpus, it should autonomously repeat a bounded cycle against **the actual source-owned system**:

1. **Run and classify** all relevant deterministic goldens, generated tests and required boundaries. Establish the real failing assertion, first observed fault, correlated downstream failures, *independent concurrent failures*, and missing diagnostics.
2. **Reproduce and minimize** every new materially distinct failure to an exact code revision, input state, operation/transition sequence, fault-injection setting, stable seed and independently recorded expected outcome.
3. **Trace causality** using Glaciaring, BOOT receipts and Universal File API operation evidence. Identify the owning module/guard/transition rather than applying speculative GUI-level workarounds. Preserve multiple candidate faults rather than hiding independent breakages.
4. **Form a falsifiable repair hypothesis** with a predicted behavior change, affected neighboring contracts, potential regressions and an explicit reason the change should fix the failure. Record it before touching code.
5. **Patch only the owning implementation** in a disposable branch/worktree with the smallest effective change. Never “fix” a failure by loosening assertions, fabricating provider receipts, changing owner-approved expected output, deleting test cases, or suppressing mandatory diagnostics.
6. **Iterate verification:** rerun the minimized failing case, related state-tree neighbors, affected BOOT↔RIGHT-CLICK↔FILE API handoffs, the full accepted golden regression suite, the generated fault campaigns and the same-profile performance/security gates. If not green, preserve the new evidence and refine the hypothesis; do not claim convergence.
7. **Promote knowledge:** add each genuine new bug to the durable corpus with the original failure receipt, minimal reproducer, correction commit, independent fixed result, neighboring regressions and relevant signatures. Future agents must discover and learn from this record automatically, without rewriting history.
8. **Stop safely:** enforce explicit iteration/time/compute/test-operation budgets and no-progress limits; report `BLOCKED` or `UNKNOWN` with the failed boundary and necessary owner decision. A coding agent may prepare a validated PR, **not unilaterally merge, deploy, spend cloud resources, escalate permissions or self-modify production**.

**Independent convergence certificate:** record before/after coverage by requirements, states, transitions, source branches and proof class; fixed versus newly introduced failures; unverified external gates; last reproducible seed; repaired source hashes; unchanged golden-oracle hashes; diagnostic observation gaps; and benchmark deltas. Zero known local failures does not establish exhaustiveness or live release readiness.

**Prioritize productive iteration over vanity metrics.** The ideal result is fewer human clicks, more precisely reproduced root causes, reversible incremental fixes and permanent learning across REDOWN, Click2Cloud and future systems. A new agent should be able to ask: *“What remains broken, why did prior repairs fail, what invariant do we expect, and which one new source change can I prove works?”*

**Separate AI-proposed repair from user-authorized change:** automated local test/fix/test loops can operate on development sources and clearly permissioned local fixture data. Production deployment, real provider mutations, credential changes, OAuth/billing decisions and source-of-truth requirement changes remain behind explicit approval and separate evidence gates.

