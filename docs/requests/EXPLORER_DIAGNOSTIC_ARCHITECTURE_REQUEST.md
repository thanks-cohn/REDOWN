# REDOWN — Deep File Explorer Diagnostic API & Agent-Accessible Debugging Architecture

**Repository:** `thanks-cohn/REDOWN`  
**Target branch:** `main`  
**Priority:** Foundational engineering infrastructure  
**Scope:** Complete File Explorer observability, causal debugging, code-to-runtime tracing, and agent-accessible diagnostics

## Mission

Build the most comprehensive, reliable, and deeply inspectable debugging API reasonably possible for REDOWN's File Explorer.

The objective is to make the File Explorer understandable to an unfamiliar software engineer or AI agent without requiring them to manually reconstruct the entire application every time something fails.

We want to fundamentally understand the File Explorer's internal architecture, state, operations, dependencies, runtime behavior, and failure mechanisms.

**Every meaningful File Explorer operation should be traceable from user intent to verified outcome.**

An agent should be able to ask:

- What happened?
- What was supposed to happen?
- Which operation failed?
- Where did it fail?
- Which components participated?
- What exact request was made?
- Which code path constructed that request?
- What response was received?
- Was the failure caused locally, by the Worker, by Cloudflare, or by inconsistent state?
- Can the issue be reproduced?
- What evidence supports the diagnosis?
- Which files and functions need investigation?
- How can a correction be verified without endangering user data?

The API must support answering these questions programmatically, with evidence rather than conjecture.

---

# PART 1 — Investigate Existing Diagnostic Infrastructure

Before implementing anything, inspect the repository's existing:

- Agent API.
- Runtime API.
- Semantic API.
- Debug API and incident records.
- Forever Works integration.
- File Explorer architecture.
- Transfer ledger and verification mechanisms.
- Cloudflare Worker instrumentation.
- Existing tests, fixtures, and diagnostic reports.

Read `AGENTS.md` and the applicable contracts.

Do not build a redundant diagnostic system alongside equivalent existing capabilities.

Instead, identify which components can be reused, extended, or connected.

Preserve existing public API contracts and version boundaries. Introduce appropriately versioned extensions where necessary.

Produce a detailed coverage analysis identifying what agents can already observe and what they cannot.

---

# PART 2 — Complete File Explorer Architecture Map

Construct a machine-readable model of the File Explorer.

It should document and link:

1. UI components and their DOM identities.
2. State owners and state transitions.
3. User actions and event listeners.
4. Context-menu construction and dispatch.
5. Message types and their handlers.
6. Background service-worker operations.
7. Cloudflare API requests.
8. REDOWN Worker endpoints.
9. R2 bucket bindings and capabilities.
10. Object-key and folder-prefix transformations.
11. Authentication and authorization dependencies.
12. Transfer operations and verification stages.
13. Error handling, retries, and recovery paths.
14. Preview, download, and local browser integrations.
15. Caches, pagination, selection, navigation, and refresh logic.

For every operation, connect its entry point to all significant downstream components.

**An agent should be able to navigate from a broken UI control directly to its associated runtime pathway and relevant source code.**

Include source locations, function identifiers, message schemas, dependencies, and relevant tests.

Mark uncertain or dynamically resolved relationships explicitly.

Do not present an inferred architectural relationship as verified fact.

---

# PART 3 — End-to-End Operation Tracing

Implement structured tracing for all supported File Explorer operations.

At minimum, cover:

- Navigation and folder listing.
- Pagination and search.
- Refresh.
- File selection.
- Preview and lightbox.
- Download.
- Upload.
- Copy/Paste.
- Copy to.
- Move/Paste.
- Move to.
- Rename.
- Delete.
- Folder creation.
- Properties.
- Public URL generation.
- Copy public URL.
- Bucket switching.
- Account switching.
- Authentication and reconnection.
- Worker readiness and capability checks.

Each operation must receive a unique operation ID.

Related internal requests should share correlation information so that an agent can reconstruct the complete execution path.

### Required trace stages

For an operation such as Copy to:

1. User initiates the action.
2. Explorer identifies the selected source.
3. Source identity is normalized or preserved.
4. Destination is resolved.
5. UI constructs the operation request.
6. Background handler accepts or rejects it.
7. Worker capability and authorization are checked.
8. Source retrieval begins.
9. Source retrieval succeeds or fails.
10. Destination write begins.
11. Destination write completes or fails.
12. Destination content is verified.
13. Source cleanup occurs only where applicable and safe.
14. UI receives the final result.
15. Operation is recorded with its confirmed or uncertain outcome.

Capture the meaningful transitions rather than indiscriminately recording every low-level function call.

An agent must be able to retrieve the complete trace by operation ID.

---

# PART 4 — Precise Error Codes and Failure Classification

Create a stable, structured, machine-readable error taxonomy.

Do not depend on generic error strings such as:

`Something went wrong`

or:

`Source object was not available`

Instead, errors should have stable identifiers and associated evidence.

Example categories:

- `EXPLORER_SOURCE_NOT_FOUND`
- `EXPLORER_SOURCE_KEY_MISMATCH`
- `EXPLORER_BUCKET_CONTEXT_MISMATCH`
- `EXPLORER_WORKER_NOT_READY`
- `EXPLORER_WORKER_CAPABILITY_MISMATCH`
- `EXPLORER_AUTH_EXPIRED`
- `EXPLORER_REQUEST_TIMEOUT`
- `EXPLORER_DESTINATION_CONFLICT`
- `EXPLORER_COPY_VERIFICATION_FAILED`
- `EXPLORER_UI_STATE_STALE`
- `EXPLORER_MESSAGE_HANDLER_MISSING`
- `EXPLORER_RESULT_UNCONFIRMED`

These are proposed examples, not diagnoses of the current bugs.

Each recorded error should provide:

- Stable code.
- Human-readable description.
- Operation ID.
- Failure stage.
- Responsible component, if established.
- Original HTTP status or relevant error class.
- Safe contextual metadata.
- Retryability classification.
- Potential recovery actions.
- Relevant source-code references.
- Evidence supporting the classification.
- Confidence and remaining uncertainty.

Distinguish the immediate failure from its underlying root cause.

For example, HTTP 404 is an observation. It does not independently establish that the source object is missing.

---

# PART 5 — Deep Identity and Object-Key Diagnostics

This is particularly important given REDOWN's recent Copy/Paste failures.

Build diagnostic capabilities for identifying and comparing the exact source and destination used in an operation.

For each transfer, make it possible to inspect:

- Source account identity.
- Source bucket identity.
- Original object key.
- Encoded request key.
- Worker-bound bucket identity.
- Destination account and bucket.
- Destination object key.
- Expected object metadata.
- Observed object metadata.
- Source retrieval mechanism.
- Worker version and relevant capabilities.
- Content verification results.
- Whether any key transformation occurred.
- Whether source identity remained consistent across components.

Preserve exact keys, including spaces, Unicode, punctuation, and repeated separators.

Do not casually normalize or sanitize existing object identities.

Because object names and URLs may contain private information, sensitive values must be protected by default. Where exact identity comparison is necessary, use safe local inspection, stable fingerprints, explicit authorization, and appropriately redacted export formats.

An agent should be able to establish whether two components disagree about the identity of the same object without exposing the user's private filenames.

---

# PART 6 — Worker and Cloudflare Diagnostic Surface

Extend observability across the extension-to-Worker boundary.

The API should expose safe information about:

- Expected Worker version.
- Observed deployed Worker version, when actually checked.
- Required and advertised capabilities.
- Relevant endpoint availability.
- Request and response stages.
- HTTP status codes.
- Authentication failures.
- Bucket-binding mismatches.
- Timeout boundaries.
- Source-read and destination-write outcomes.
- Transfer verification receipts.

Never assume the installed extension is communicating with the newest repository code.

Distinguish:

**Repository source → packaged extension → installed extension → deployed Worker → observed Cloudflare behavior.**

Record version evidence for each layer when available.

Do not treat a successful health check as proof that every endpoint works.

Worker diagnostics must avoid exposing authorization headers, tokens, credentials, private object contents, or sensitive request parameters.

---

# PART 7 — Agent-Queryable Diagnostic API

Provide a documented API that agents can use without manually searching arbitrary logs.

Suggested operations include:

| API operation | Purpose |
|---|---|
| `describeExplorer()` | Explain architecture and supported capabilities |
| `listExplorerOperations()` | Enumerate supported actions |
| `explainOperation(name)` | Describe the wiring of an operation |
| `getOperationTrace(id)` | Retrieve its runtime execution path |
| `getRecentFailures()` | Return recent classified failures |
| `diagnoseOperation(id)` | Analyze evidence and possible causes |
| `getObjectIdentityTrace(id)` | Compare source/destination identities |
| `getWorkerCompatibility()` | Report observed compatibility evidence |
| `getExplorerState()` | Inspect a sanitized state snapshot |
| `getFailureDependencies(code)` | Find implicated components |
| `findRelatedIncidents(code)` | Identify similar historical failures |
| `getVerificationPlan(id)` | Return safe reproduction and verification steps |
| `exportDiagnosticBundle()` | Generate portable, redacted evidence |

The names are illustrative; adapt them to the existing API architecture.

Provide JSON schemas, version information, deterministic output where applicable, explicit result statuses, and consistent error contracts.

Support access through the existing agent CLI and other appropriate programmatic adapters.

Do not make a proprietary agent framework a requirement.

**Agents should be able to understand REDOWN through documented, portable interfaces.**

---

# PART 8 — Automated Diagnostic Reasoning

Implement an evidence-based diagnostic layer that can compare expected and observed operation behavior.

For example:

If Copy to fails with HTTP 404, but Preview and Download succeed, the API should:

1. Identify the common source object.
2. Compare the different retrieval mechanisms.
3. Compare source identity at each stage.
4. Check Worker compatibility evidence.
5. Identify where the successful and failing execution paths diverge.
6. Produce ranked hypotheses supported by actual observations.
7. Identify any additional evidence necessary to distinguish those hypotheses.
8. Recommend targeted tests or safe inspection actions.

The diagnostic engine must not invent missing runtime facts.

Classify findings as:

- **Confirmed:** Directly demonstrated by evidence.
- **Strongly supported:** Multiple observations support a conclusion.
- **Possible:** Plausible, but unverified.
- **Unknown:** Insufficient evidence.

Preserve alternative hypotheses where appropriate.

Use deterministic rules for known signatures and permit higher-level agent analysis on top of the structured evidence.

Do not require an LLM for routine diagnostic operation.

---

# PART 9 — Reproduction, Simulation, and Safe Fault Injection

Build a comprehensive diagnostic test environment.

It should support reproducible cases for:

- Missing source object.
- Incorrect source key.
- Wrong bucket binding.
- Expired authorization.
- Worker version mismatch.
- Unsupported endpoint.
- Network interruption.
- Source-read failure.
- Destination-write failure.
- Timeout after an ambiguous write.
- Destination conflict.
- Failed content verification.
- Interrupted move before deletion.
- Stale UI state.
- Cross-account and cross-bucket operations.
- Concurrent file operations.
- Multiple nested folder levels.

Use isolated mocks, local fixtures, or explicitly authorized disposable resources.

Test the complete pipeline wherever practical, not merely independent utility functions.

A failing test should produce the same structured evidence format as a real incident.

Fault injection must never target production resources or delete actual user data without separately scoped authorization.

---

# PART 10 — Diagnostic UI and Support Bundles

Introduce a File Explorer diagnostics area within REDOWN's existing Debug Mode.

Keep it hidden from ordinary users unless Debug Mode is enabled.

It should allow developers and authorized users to inspect:

- Recent operations.
- Failed operations.
- Operation IDs.
- Structured error codes.
- Execution stage timelines.
- Observed Worker compatibility.
- Verification status.
- Relevant recovery guidance.

Include a **Copy diagnostic ID** action and a **Generate support bundle** action.

The support bundle should contain enough information for an agent to investigate without reproducing the entire incident manually.

It must be redacted by default and reviewed for sensitive information.

Provide retention limits, size limits, bounded tracing overhead, and a clear method to clear diagnostic records.

Debugging must not cause meaningful performance degradation or leak private bucket contents.

---

# PART 11 — Durable Engineering Knowledge

Integrate the diagnostic API with REDOWN's existing engineering documentation and Forever Works-oriented architectural records.

The system should preserve:

- Historical failure signatures.
- Root-cause findings.
- Relevant source-code relationships.
- Corrective changes.
- Regression tests added.
- Known unresolved conditions.
- Worker and extension compatibility history.
- Evidence showing whether a defect was actually resolved.

Preserve historical evidence rather than rewriting old incidents to appear solved.

When a component changes, update its current architectural mapping without silently altering the historical state under which previous incidents occurred.

An unfamiliar agent should be able to inherit REDOWN, retrieve an incident, understand the relevant implementation, and develop a targeted repair.

---

# PART 12 — First Real Diagnostic: Current Copy/Paste HTTP 404

Use the following reported failure as the first concrete acceptance case:

**Operation:** Copy/Paste and Copy to  
**Observed result:**

`0 files completed · 1 failed. Source object was not available (HTTP 404)`

**Known observations:**

- The affected files can be downloaded.
- The files can be previewed.
- Rename succeeds.
- Upload succeeds.
- Copy/Paste fails.
- Copy to fails with the same message.

The repository inspection previously identified a source Worker read involving:

`GET /object?key=<encoded-source-key>`

Recent engineering documentation also describes Worker v5 requirements and exact-object-key fixes.

Investigate the actual current implementation and distinguish historical code changes from the installed and deployed versions.

Use the new diagnostic architecture to:

1. Trace the failing copy operation.
2. Compare it against a successful download or preview of the same source.
3. Identify the first divergence.
4. Establish whether the failure relates to object identity, Worker routing, bucket binding, authorization, capability mismatch, or another mechanism.
5. Produce a machine-readable diagnostic case.
6. Generate an evidence-backed repair proposal.
7. Implement a correction if the root cause is established and it is safe to do so.
8. Verify that the repaired operation creates a readable destination object without damaging the source.

Do not mark the bug resolved merely because the new diagnostic API can describe it.

---

# PART 13 — Completeness and Verification Standards

The API must be comprehensive, but avoid unnecessary instrumentation, huge logs, uncontrolled performance costs, or speculative abstraction.

Prioritize high diagnostic coverage of actual operation boundaries.

Provide an explicit coverage matrix identifying:

- Operations fully instrumented.
- Operations partially instrumented.
- Runtime boundaries that remain opaque.
- Available and unavailable evidence.
- Tests covering each operation.
- Remaining diagnostic blind spots.

Test the API itself against malformed events, missing fields, races, browser restarts, schema mismatches, large traces, and unavailable Workers.

Ensure failures in the diagnostic system never break normal Explorer operations.

Maintain backwards compatibility or document intentional versioned migrations.

---

# PART 14 — Implementation Deliverables

Produce working implementation, not merely a proposal.

Deliver:

1. A comprehensive File Explorer architectural and diagnostic coverage map.
2. Structured operation tracing.
3. Stable error taxonomy and schemas.
4. Agent-accessible diagnostic API and CLI.
5. Source/destination identity tracing.
6. Worker compatibility diagnostics.
7. Evidence-based failure analysis.
8. Safe reproducible fault fixtures.
9. Debug Mode inspection and support export.
10. Integration with existing incident and engineering records.
11. Automated regression tests.
12. A report investigating the current Copy/Paste 404.
13. Documentation explaining the API to an unfamiliar agent.
14. Actual test results, remaining limitations, and commit hashes.

Implement in coherent, independently testable stages. Do not weaken existing tests or rewrite frozen evidence to manufacture passing results.

Run available validation and distinguish source-only verification from installed Chrome and live R2 evidence.

Commit verified work to `main`.

If a runtime boundary cannot be observed from the available environment, implement the safe instrumentation and provide the exact procedure for collecting the missing evidence rather than claiming the issue is resolved.

---

# Final Design Principle

**REDOWN must become a system that can explain itself.**

An error should not leave us wondering which of dozens of files, handlers, Workers, APIs, or assumptions went wrong.

The File Explorer should expose enough structured information for an agent to reconstruct an operation's history, identify where behavior diverged from intent, trace the relevant source code, and distinguish proven causes from hypotheses.

We are not merely building logging.

We are building **a durable, agent-readable diagnostic model of the File Explorer**, capable of surviving implementation changes, developer handoffs, version differences, and future failures.

The long-term standard is simple:

**When something goes wrong in REDOWN, the system should provide the evidence necessary to understand precisely what happened, what remains unknown, and how to verify the correction.**