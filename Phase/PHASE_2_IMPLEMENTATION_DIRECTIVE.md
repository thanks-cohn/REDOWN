# CODEX IMPLEMENTATION DIRECTIVE
## REDOWN — PHASE 2: Repair
### Reconstruct the File Explorer and Build a Universal, Agent-Accessible File Operations Engine

**Repository:** `thanks-cohn/REDOWN`
**Branch:** `main`
**Primary charter:** `Phase/PHASE_2_REPAIR_RELIABLE_EXPLORER_ENGINE.md`
**Preservation system:** `FOREVER_WORKS/`

## 1. Your assignment

You are authorized to undertake a substantial reconstruction of REDOWN's File Explorer and its underlying File Operations Engine.

**Do not simply patch the existing explorer indefinitely. Build a new, clean implementation based on a thorough inspection of what already exists.**

The existing File Explorer has approximately the desired visual shape and interaction model. Its underlying behavior, however, has accumulated too many failures, inconsistencies, and difficult-to-diagnose execution paths.

Your responsibility is to create a successor that is:

- Exceptionally reliable in everyday and adverse operating conditions.
- Provider-independent, with a stable API capable of supporting multiple cloud storage services.
- Fully observable and programmatically inspectable by human developers and AI coding agents.
- Predictable in its state transitions, outcomes, failure classifications, and recovery procedures.
- Designed for long-term maintenance, even across major Chrome, JavaScript, or cloud-provider changes.
- Compatible with REDOWN's existing product identity, visual direction, and intended workflows.

The objective is to build the foundation of a best-in-class multi-cloud file explorer, capable of competing with rclone, ShareX, SaveAnywhere, and commercial cloud management software.

Do not claim superiority until verified through objective testing.

## 2. Begin by studying the actual implementation

Before writing replacement code, inspect:

1. The current File Explorer's complete implementation, including its HTML, CSS, JavaScript, context menus, navigation, file previews, pagination, uploads, downloads, and file-manipulation operations.
2. The Chrome extension's background service worker, message passing, storage, authentication, and lifecycle handling.
3. Existing Cloudflare R2 integration, Worker endpoints, bucket routing, credential boundaries, and source/destination identity management.
4. Existing agent APIs, diagnostic interfaces, runtime observation mechanisms, and testing tools.
5. Every relevant Forever Works record, especially `CURRENT_STATE.md`, `FAILURE_ATLAS.md`, `GAPS_AND_MIGRATION.md`, `RECONSTRUCTION.md`, and `COLD_AGENT_START_HERE.md`.
6. The Phase 2 engineering charter and current competitive research.
7. Existing tests, historical regression reports, known failures, and prior attempted fixes.

Document exactly what works, what fails, what has only been tested locally, and what remains unverified against real cloud services.

Do not confuse historical test successes with current production reliability.

### Required initial deliverable

Produce an architectural inventory identifying:

- Existing functionality to preserve.
- Existing functionality that must be reconstructed.
- Reusable utilities and successful algorithms.
- Duplicated or conflicting state management.
- Provider-specific logic leaking into the explorer.
- Unreliable or ambiguous file-operation behavior.
- Missing diagnostic and recovery capabilities.
- Existing user-visible interactions that must survive reconstruction.

Retain the original implementation as a reference and fallback while the successor is developed.

## 3. Build the new universal file operations core

Create a single canonical, versioned internal File Operations API.

All user interfaces, provider adapters, execution environments, automation, and diagnostic tools must agree on the same operation semantics.

The API must support at minimum:

**Exploration and organization**

- List files and folders, including complete nested hierarchies.
- Cursor-based pagination and incremental loading.
- Search, filtering, sorting, and refresh.
- File metadata and properties.
- Create folders and navigate accounts, buckets, and storage roots.
- Preserve selection and navigation state.

**File operations**

- Copy and paste.
- Cut and paste.
- Move and rename.
- Delete with appropriate safeguards.
- Upload and download.
- Preview and open files.
- Cross-folder and cross-provider operations.
- Conflict detection and resolution.
- Cancellation, retries, reconciliation, and recovery.

**Operational intelligence**

- Query current capabilities.
- Inspect provider connection state.
- Preview an operation before execution.
- Inspect planned and active jobs.
- View individual execution stages.
- Retrieve verification receipts.
- Classify errors and recommend safe recovery actions.
- Export sanitized diagnostic evidence.

The explorer must never implement provider-specific transfer rules directly inside presentation components.

## 4. Design the cloud adapter architecture

Cloudflare R2 must be the first production adapter, using existing verified behavior where appropriate.

The architecture must accommodate:

- Google Drive.
- Google Cloud Storage.
- Microsoft OneDrive.
- Dropbox.
- Amazon S3.
- Other compatible providers in later phases.

Google Drive and Google Cloud Storage are separate systems and require separate adapters.

Every adapter must declare its capabilities, including supported operations, object identity conventions, pagination, conflict handling, checksums, resumability, authentication, permissions, provider limits, and native copy/move behavior.

Do not assume all providers support identical semantics.

Where native functionality is missing, the engine must either choose a documented safe fallback or explain that the operation is unavailable.

**Adding a new cloud provider must not require rewriting the File Explorer.**

Prove this with a deterministic fake provider and a second real provider before considering the architecture complete.

## 5. Make the entire engine accessible to AI agents

This is a primary product requirement, not an optional debugging feature.

A completely unfamiliar Codex or ChatGPT Work agent must be able to investigate REDOWN without needing its original developer, previous conversations, or undocumented institutional knowledge.

Provide a documented, machine-readable API exposing the following categories.

### A. Discovery

An agent must be able to ask:

- Which operations exist?
- Which providers are installed?
- Which capabilities does each provider support?
- Which components implement each operation?
- Which versions of the core, adapters, and executors are running?
- Which portions of the system are healthy, degraded, or unverified?

### B. Inspection

An agent must be able to inspect:

- File identity and metadata, subject to authorization.
- Account and storage-container mappings.
- Current explorer and job states.
- Operation history.
- State transitions.
- Executor selection and provider routing.
- Permission and authorization errors.
- Relevant source references.
- Related tests and historical incidents.

### C. Tracing

Every operation must receive a stable operation ID.

Agents must be able to trace an operation through:

`User Interface → File Operations Engine → Execution Adapter → Cloud Provider → Verification → Final Result`

Each transition should expose timestamps, status, correlation identifiers, applicable object identities, error classifications, and verification evidence.

An agent must be able to identify the exact stage at which a failure occurred.

### D. Diagnosis

Provide structured methods to:

- Diagnose an operation.
- Explain an error.
- Identify affected components.
- Differentiate confirmed facts from hypotheses.
- Find related failures.
- Recommend verification steps.
- Determine whether a retry is safe.
- Identify which evidence is missing.

A 404 error must not automatically be interpreted as a missing file. The engine must investigate possible identity, routing, permission, and provider mismatches before making causal claims.

### E. Control and repair

Separate read-only inspection from authorized mutation.

With appropriate permissions, agents should be able to:

- Create operation plans.
- Validate plans.
- Run safe test operations.
- Retry or resume eligible jobs.
- Cancel operations.
- Execute approved file operations.
- Inspect outcomes and recovery options.

Destructive actions must honor authorization boundaries, user confirmation policies, and audit requirements.

Do not give inspection commands hidden mutation side effects.

### F. Preservation

Maintain connections between:

- The canonical operation contract.
- Its implementation.
- Its tests.
- Its runtime events.
- Its known failures.
- Its purpose and safety obligations.
- Its reconstruction requirements.

Integrate these connections with Forever Works.

**An agent should be able to ask what failed, why it failed, what code executed, what data might be affected, and what safely corrects the problem—and receive an evidence-backed answer.**

Where evidence is insufficient, the system must explicitly say so.

## 6. Make operations predictable and recoverable

Implement a formal operation state machine.

At minimum, distinguish:

- Requested.
- Validated.
- Planned.
- Queued.
- Executing.
- Verifying.
- Completed.
- Partially completed.
- Blocked by authorization.
- Failed.
- Cancelled.
- Uncertain.

State transitions must be validated and recorded durably.

For every operation, record the requested action, source identity, destination identity, relevant conflict policy, chosen executor, progress, returned provider evidence, and final outcome.

Use durable operation journals and idempotency mechanisms where supported.

**Never automatically retry an ambiguous write without first reconciling whether it already succeeded.**

A successful API response is not automatically proof of complete data integrity.

Verification levels must distinguish acknowledged requests, observed destination objects, matching metadata, provider checksums, and independently verified content hashes.

### Critical safety invariants

Copy must not modify or remove the source.

Move must not delete the source until the destination has been verified to the required level.

Rename and paste must not silently overwrite unrelated objects.

Delete must operate on the exact intended target.

Folder merges must preserve individual object identities and declared conflict choices.

Multiple destination transfers must report success or failure independently.

An unknown outcome must never be displayed as verified completion.

## 7. Reconstruct the explorer interface without losing its identity

The existing visual presentation is our reference, not something to discard casually.

Preserve or improve:

- Overall layout and navigation.
- Account and storage selection.
- File grid/list presentation.
- Breadcrumbs and folder hierarchy.
- Context menus.
- Keyboard and mouse interactions.
- Search and pagination.
- Previews and lightbox.
- Transfer status.
- File properties.
- Responsive behavior.
- Accessibility.
- Existing deliberate animations and visual identity.

Refactor the interface to consume the new File Operations API rather than invoking cloud logic directly.

Keep presentation state separate from operational state.

The UI should never infer success merely because a promise resolved without an obvious exception.

Where an operation is uncertain, blocked, or partially complete, communicate that accurately.

Do not embark on a major visual redesign until functional parity and critical correctness requirements are met.

The future aesthetic remains polished minimalism combined with restrained steampunk, retro-futuristic spacecraft instrumentation, and carefully authored game-like feedback.

## 8. Engineer for future Chrome and platform changes

Treat Chrome APIs as replaceable external dependencies.

Separate browser-specific functionality from the File Operations Engine.

The engine should be testable without running Chrome.

Do not rely on extension service-worker memory for durable job truth.

Use versioned contracts and documented migration procedures for persistent data.

Provide compatibility tests for changed browser APIs, provider APIs, execution environments, and schema versions.

The future desktop application should be able to reuse the same operation semantics without reproducing browser-specific internal code.

Twenty-year longevity cannot be guaranteed by today's frameworks. It must be pursued through replaceable boundaries, reproducible builds, preservation of intent, and continuous tests.

## 9. Required testing system

Create deterministic fake-provider fixtures and fault-injection tests.

Test at least:

- Incorrect bucket or account routing.
- Cross-bucket Copy/Move/Paste returning 404.
- Permission failures and expired tokens.
- Provider rate limiting and server errors.
- Network interruption during upload.
- Write accepted before connection failure.
- Concurrent creation of the same destination.
- Source renamed or deleted mid-operation.
- Duplicate filenames with different contents.
- Large hierarchies and complete pagination.
- Browser and worker restart.
- Interrupted local-file uploads.
- Cross-provider transfers.
- Recursive directory operations.
- Partial multi-destination delivery.
- User cancellation during different execution stages.
- Corrupt metadata and invalid provider responses.
- Verification disagreement.
- Incompatible adapter and engine versions.

Tests must verify both successful behavior and data preservation during failure.

Add installed-Chrome and authorized real-provider acceptance tests, using dedicated nonproduction data.

Preserve exact results, environments, source commits, and unresolved uncertainty.

## 10. Required implementation milestones

### P2.0 — Discovery and baseline

Inspect source, Forever Works, tests, and existing defects. Produce a verified preservation and replacement inventory.

### P2.1 — Successor architecture

Specify the new API, identities, adapter contracts, state machine, error taxonomy, and diagnostic facilities. Establish deterministic contract tests.

### P2.2 — Core implementation

Build the operational coordinator, job journal, verification, diagnostics, and safe recovery mechanisms.

### P2.3 — R2 integration

Implement the Cloudflare R2 adapter and migrate existing file operations behind the new engine.

### P2.4 — New File Explorer

Reconstruct the explorer using the new API. Preserve the current visual and behavioral obligations. Eliminate direct dependencies on cloud-specific implementation details.

### P2.5 — Portability demonstration

Demonstrate identical explorer contracts against R2 and a fake second provider, then implement and verify Google Drive integration.

### P2.6 — Hardening

Run adversarial tests, real-provider acceptance, performance evaluation, security review, accessibility evaluation, and recovery testing.

### P2.7 — Forever Works inheritance

Update preservation records, source relationships, migration procedures, known failures, acceptance evidence, and cold-agent reconstruction instructions.

Conduct an independent agent inheritance drill.

A milestone cannot be declared complete simply because the corresponding code has been written.

## 11. Migration and release strategy

Develop the successor in isolated modules or a dedicated implementation branch.

Maintain the existing production explorer until the successor passes the required acceptance conditions.

Migrate functionality through compatibility boundaries, with testable rollback.

Never silently migrate, delete, or overwrite user data.

Do not deploy new Workers, change production credentials, or perform destructive cloud operations without separate authorization.

Retire old implementation paths only after functional parity and relevant safety obligations are verified.

Avoid keeping two permanent competing operational engines.

## 12. Required deliverables

Produce:

1. Source-backed architectural audit.
2. Explicit preserve/rebuild decision matrix.
3. Formal File Operations API specification.
4. Machine-readable request, response, and event schemas.
5. Provider adapter specification.
6. Engine implementation with durable state and verification.
7. Reconstructed File Explorer.
8. Agent inspection, tracing, diagnosis, and authorized-control interface.
9. Comprehensive deterministic and integration tests.
10. Migration and rollback instructions.
11. Updated Forever Works records.
12. Evidence-backed acceptance report.

Every deliverable must be linked to its source, tests, and relevant milestone.

## 13. Your first execution

Start by reading the Phase 2 charter and Forever Works documentation.

Inspect the actual current implementation rather than assuming this directive accurately describes every source detail.

Run safe local baseline tests.

Trace Copy, Paste, Move, Rename, Delete, Upload, Download, List, Search, Preview, and authentication from user action through executor and provider.

Identify the smallest independently testable architectural boundary for the new engine.

Then begin implementation of the foundational contract and its deterministic tests.

**Do not begin by replacing the whole UI, removing existing code, deploying Workers, or adding Google Drive.**

Proceed incrementally through the milestones, committing reviewable changes with corresponding tests and documentation.

If the new design reveals that a substantial existing component should be rebuilt rather than repaired, perform the reconstruction behind a compatibility boundary and provide evidence supporting the decision.

## Final governing principle

**Build an engine whose behavior is understandable before execution, observable during execution, verifiable after execution, and recoverable when execution fails.**

The file explorer must become an exceptionally trustworthy interface to this engine.

The cloud providers may change. Chrome may change. The implementation language may change.

But the meanings of Copy, Move, Paste, Delete, Upload, Download, Verify, and Recover must remain precise and preserved.

Our aim is not merely a file explorer that works today.

**Our aim is an explorer that unfamiliar agents and engineers can understand, maintain, diagnose, improve, and reconstruct decades from now without losing its fundamental guarantees.**


## 14. Governing Beta-first implementation and release policy (owner addendum, 2026-10-23)

This section overrides any earlier wording that could imply immediate replacement of the production explorer.

1. Preserve the existing File Explorer and its implementation. Do not remove, replace or substantially alter it during successor development. Keep it independently available with Beta Mode on or off.
2. Extend the existing dashboard/settings `betaModeEnabled` toggle and `.beta-only` gating. When enabled, expose a clearly labeled **Beta Explorer** entry. Gate direct entry and operation routing too; CSS alone is insufficient. Do not introduce a second Beta flag.
3. Route Beta Explorer exclusively to the successor File Operations Engine. Retain legacy routing until formal migration approval. Keep the core independent of the Beta interface policy.
4. Existing authorized accounts/buckets may eventually be shared through a scoped connection boundary. Do not corrupt credentials, profiles, settings, production transfer history or counters. Sharing connections does not authorize cloud mutation or preparation/deployment.
5. Separate Beta jobs, queues, receipts, logs and experimental settings using explicitly versioned namespaces. Opening both explorers must never duplicate a mutation. Protect cross-tab execution and request idempotency.
6. Trace Beta actions through source, destination, provider, executor, operation ID, state transitions, error classification, verification and recovery. Clearly label missing evidence and simulation-only outcomes.
7. Provide read-only legacy/Beta comparison of feature parity, supported operations, test failures, performance and unresolved risks. Never execute duplicate real mutations for comparison.
8. Start with simulated providers and dedicated test buckets. Real-cloud mutations require passing operation-specific safety tests and separate explicit authorization. A visible Beta switch or a saved cloud connection is not this authorization.
9. Switching off Beta hides the interface immediately and preserves both implementations' data. Do not silently cancel or abandon active work. Document shutdown, inspection, cancellation and recovery policy before asynchronous executors are enabled.
10. No automatic promotion. Retire legacy only after all Phase 2 acceptance conditions, rollback evidence, Forever Works inheritance and **explicit owner approval** of promotion.

Inspect the actual implementation of Beta Mode before extending it. Maintain both implementations, their differences and retirement requirements in Forever Works without rewriting frozen evidence. Proceed incrementally under this policy.

## 15. Owner follow-up — seamless storage and autonomous proof

The intended product is a dependable local/remote file-browser ecosystem: plug in an authorized provider and use familiar laptop-like operations, including previews. Future transfers between the owner's computers require a separate authorized device/transport design. The goal is to become the preferred ecosystem through verified capability and reliability; do not claim competitor parity from design, a walkthrough or mock tests.

Provide a modifiable layer of short instructions and anchored help. Its first five steps are suitable for new-user onboarding; extended steps cover all present controls and core workflows. The same stable feature identities must support autonomous agent/browser acceptance. A human should not be required to click through the initial verification. Keep source intent, UI interaction, actual execution, outcome verification and failure recovery traceable with IDs and explicit evidence scopes.

An agent must be able to discover checks, execute safe isolated acceptance, inspect failures through browser-console/API evidence, verify source preservation and destination contents, and export a structured result. Console logs and promise completion alone are insufficient. Separate observed actions, human reports, automated assertions, unavailable capabilities and real-provider proof. Preserve failures and missing evidence. A green subset never certifies absent local/cloud adapters, binary transfers, restart recovery or future cross-computer operation.

Implement guidance without hidden file mutations. Autonomous tests use a fresh isolated simulator/browser profile first, and only separately authorized test resources for live providers. Maintain the Beta gate, existing Explorer, namespace isolation, safety invariants, migration/rollback and explicit promotion approval from section 14. See `docs/phase2/WALKTHROUGH_AND_ACCEPTANCE.md` for the implemented testing layer and current readiness boundaries.
