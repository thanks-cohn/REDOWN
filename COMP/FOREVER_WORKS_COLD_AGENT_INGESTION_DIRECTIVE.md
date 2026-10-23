# REDOWN → Forever Works: Cold-Agent Ingestion Directive

**Status:** HANDOFF / implementation work not yet performed.
**Priority:** P0 architectural documentation before new consumer-facing features.
**Repositories:** `thanks-cohn/REDOWN` and the canonical Forever Works repository (discover exact current identity; do not guess).
**Read also:** `COMP/README.md`, `COMP/AGENT_API_STRENGTHENING_HANDOFF.md`, all competitor profiles, source README/docs, historical regression notes, tests and code.

## Executive mandate

REDOWN is already near the owner's intended overall UX direction; **do not initiate an unsolicited visual redesign or feature spree.** Instead, make it reconstructible, inspectable, and operable by any authorized *cold agent* that inherits no conversation context and by any *hot agent* taking over in the middle of a job. Convert its real architecture and product purposes into Forever Works' canonical format, preserving both the running implementation and the reasons it must behave as it does.

**Purpose-preserving reconstitution:** existing code is evidence of implementation, not a complete statement of product purpose. Capture user objectives, obligations, constraints, failures, observed behaviors, dependencies, and uncertainty separately. A future agent may replace internals if it can prove user-facing and safety obligations are preserved.

## Initial guardrails

- First locate and read Forever Works' actual format, schema, tools and validations. No invented proprietary schema. If required framework support is missing, create an explicitly provisional mapping and flag the gap.
- Audit the current REDOWN commit and pin SHA/branch/dependencies. Do not infer live product behavior solely from competitor docs, chat summaries or README promises. Every factual description needs file/function/line evidence or a reproducible run/test.
- Mark every observed feature **working / partially working / absent / proposed / uncertain**. Preserve a baseline. No changes to customer data, cloud accounts, published deployments, secrets or destructive resources without separate permission.
- All agent-facing mutation and debugging must honor least privilege, scopes, redaction, user confirmation and event auditability. No secret-bearing diagnostics.

## Required Forever Works knowledge graph

Document and connect these entities with stable IDs and forward/back references:

1. **Purpose & product contract:** why REDOWN exists; one-click DONE, novice simplicity, ordinary browser-first workflow, genuine verified completion, carefully managed errors, small hardware, $5/year vision (commercial proposal, not established entitlement).
2. **Capabilities:** extension, context menu nested/simple modes, location presets, cloud provider connections, remote URL processing, R2 pipeline, file explorer, capture/record concepts, redundancy/dedupe proposals, future desktop. Distinguish product intention from production state.
3. **Architecture:** browser MV3 contexts, popup/shelf, explorer, message passing, queue/persistence, Cloudflare Workers/R2, edge or desktop helper, provider adapters, backend endpoints, deployment/config.
4. **Complete source map:** every package/module/file, public function/class, entry point, call graph, event routes, DOM-to-command mapping, command-to-provider mapping, background/on-device/remote executor separation; capture path and line references.
5. **External APIs & standards:** Chrome extensions (contextMenus, downloads, tabs, scripting, capture, storage, alarms, Native Messaging), Cloudflare R2/Workers auth & endpoints, Google Drive vs GCS, Microsoft/OneDrive, Dropbox, MEGA consumer drive vs MEGA S4, S3-compatible APIs, OAuth scopes/token refresh, browser/CORS/CSP, external competitor API capabilities. Record actual integrations vs envisioned integrations, primary docs link, version and rate-limit/permission assumptions.
6. **Data and state:** entity relationships for account, remote, destination, directory, object, job, transfer attempt, verification receipt, provider capability, API credential reference, policy, replica, duplicate and error; schemas, migrations, lifetimes, invariants.
7. **Operational states:** accepted, scheduled, fetching, staging, uploading, verifying, success, partial, blocked, failed, retry, cancelled, orphan, restored; every transition's trigger, persistence, safety and user-visible message.
8. **Purpose-to-code trace:** for each capability and experience contract, map requirement -> code locations -> tests -> telemetry -> known gaps. For each code entry point map reverse dependency to product purpose, so a future agent knows what must not break.
9. **Bug evidence archive:** Chrome login and Cloudflare expired-session confusion, 403 auth/folder failure, nested context-menu menus both saying Files, three saved destinations but two displayed, nested hierarchy and menu resets, pagination/lightbox, missing File Explorer URLs, failed remote/remote, local→R2, CSP WASM, network/503, upload retry/queue, preview-size, sidebar, state/UI divergence. Mark historical vs reproduced vs fixed; no guessing that a bug remains.
10. **Competitor interface mapping:** profiles under COMP/ (rclone, ShareX, MultCloud, SaveAnywhere, Google Drive etc), feature parity, actual documented APIs and product behaviors, REDOWN comparable surfaces, differentiators, and explicit uncertainty. Do not copy source/design assets without license.
11. **Design semantics:** toolbar icon success/failure flashes fade to original, odometer increments only upon verified result, gentle mechanical arrival without overshoot, optional sounds OFF and system notifications OFF, mascot, keyboard & reduced motion, meaningful status lights, familiar interface shared across eventual desktop/extension.
12. **Evolution model:** planned separate native desktop executable and shared UI/transfer core; user-owned cloud compute whenever possible; no invented requirement to operate Monomedia file-transfer servers; costs and cloud provider permissions transparent.

## Agent-accessible interfaces: inventory FIRST, then proposals

Produce an **API census** including *all existing endpoints and interfaces*: REST paths, message type contracts, event buses, storage keys, worker routes, transfer commands, provider operations, queues, debug APIs, UI actions, context-menu IDs, feature flags, extension permissions and future integration seams. For every item record:
- purpose, implementation location, owning executor, caller, auth requirements and granted scopes
- parameters, errors, return type, side effects, idempotency/retry behavior
- diagnostic visibility and safe reproducibility
- coverage/test references and current working status.

Then propose additive, versioned agent-friendly interfaces only where gaps exist:
- read-only `capabilities`, `health`, `architecture`, `inventory`, `job status`, `events`, `provider diagnostic`, `feature status`
- typed `create job`, `retry`, `pause`, `resume`, `cancel`, `validate destination`, `search objects`, `dry-run cleanup`, each with scope checks and approvals
- stable error codes and correlation IDs tracing UI action -> message -> queue -> service worker/native/cloud executor -> provider API -> verification receipt -> UI completion
- machine-readable OpenAPI/JSON Schema or actual canonical Forever Works format, not ad-hoc chat explanations; complete mock fixtures for offline testing
- safe `debug bundle` collecting redacted config, event chronology, active code/version fingerprints, feature flags, dependency summary and reproducible failure evidence.
- provider capability matrix; never imply one cloud's login authenticates another; expired browser session differs from valid longer-lived backend credentials; avoid assuming a bucket can execute code.

## Core investigation scenarios for cold agent

**A. A remote download says Done but file missing:** agent identifies exact UI event, job ID, source URL resolution, transfer engine, queue persistence, destination object, verification receipt, and erroneous success state.

**B. Folder creation responds 403:** agent traces provider-specific OAuth scopes, account identity, endpoint, request and response reason, logs safely, and proposes a testable remedy instead of generic reauthentication.

**C. Context menu loses a destination:** map saved setting -> persistent storage -> menu build -> submenu IDs -> click handler -> transfer target; identify reload/race/depth constraints.

**D. One of three clouds fails:** verify other copies, distinguish policy-intended replicas from accidents, track pending destination, never use surviving-provider credential to bypass denied destination auth, retry only after permission restored.

**E. Crash and recovery:** agent can resume diagnosis from logs without original developer or prior agent memory, and prove correct recovery behavior with local simulation.

## Required deliverables in REDOWN repo

- `FOREVER_WORKS/README.md` — orientation, canonical upstream framework version and current REDOWN coverage.
- `FOREVER_WORKS/INVENTORY.md` — repository, modules, assets, packages, scripts and generated elements.
- `FOREVER_WORKS/ARCHITECTURE.md` — run contexts, dependencies, state routes, sequence diagrams.
- `FOREVER_WORKS/API_CENSUS.md` — *actual* API census with evidence.
- `FOREVER_WORKS/PURPOSES_AND_OBLIGATIONS.md` — the why and acceptance standards.
- `FOREVER_WORKS/TRACEABILITY.md` — requirement ⇄ source ⇄ state ⇄ tests ⇄ telemetry.
- `FOREVER_WORKS/STATES_AND_EVENTS.md` — stable job schema and event lifecycle.
- `FOREVER_WORKS/PROVIDERS.md` — integrations, external docs, scopes, runtime permissions, exceptions.
- `FOREVER_WORKS/FAILURE_ATLAS.md` — proven traces, bug codes, recovery, reproducible fixtures.
- `FOREVER_WORKS/COLD_AGENT_START_HERE.md` — five-minute autonomous orientation, read-only probes, safe debug commands.
- `FOREVER_WORKS/GAPS_AND_MIGRATION.md` — prioritized hardening plan, no unreviewed breaking changes.
- Native Forever Works schema files/index, generated cross-link graph and validation reports **as supported by the actual framework**; above filenames are provisional documentation conventions, not substitutes for it.

## Deliverables and acceptance gates

**Gate 1 — Discovery:** pinned commit, repo inventory, FW spec read, baseline tests collected. Zero guesswork disguised as fact.

**Gate 2 — Ingestion:** real schema populated, forward and reverse links validated; every main feature/endpoint has ownership, purpose, status and source/test trace.

**Gate 3 — Observability:** demonstrate that a cold agent can locate the origin and likely cause of one real or safely simulated malfunction using repo docs and non-secret introspection, with cited code and a reproducer.

**Gate 4 — Inheritance drill:** give a fresh agent only REDOWN repo + FW corpus + permitted tools; it must explain what causes a selected UI behavior, the safe repair path, confidence/unknowns, affected obligations and tests to protect it.

**Gate 5 — Codex plan:** propose small reviewable PRs that close missing APIs and tests; maintain current UI and avoid regression. Do not automatically deploy or make destructive changes.

## Work / Codex execution request

> Read the current REDOWN repository's `COMP/` docs and this directive. Locate the actual Forever Works repository/spec; ingest REDOWN fully into its real schema, separating observed code behavior from stated product purpose. Build comprehensive source/API/state/bug traceability so any cold or hot agent can answer “where did this UI event go, what failed, what verifies success, and how can I test a fix?” without previous conversation context. Map and document every existing integration, internal API and competitor interface before suggesting new APIs. Run cold-agent inheritance drills and baseline regression tests. Deliver a completed FW corpus where possible, identified gaps with source evidence, and only then a phased Codex hardening plan. Preserve the current presentation and working features. Never represent a proposed future feature as already implemented.
