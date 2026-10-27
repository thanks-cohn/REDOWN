# IMPORTANT — MUST APPLY: REDOWN Guided Exercise Laboratory (GEL)

**Status:** OWNER-DIRECTED REQUIREMENT / FORMAL PROPOSAL — NOT YET IMPLEMENTED  
**Priority:** **IMPORTANT — MUST APPLY** when implementing comprehensive GUI acceptance  
**Date:** 2026-10-27  
**Repository:** `thanks-cohn/REDOWN`  
**Placement in delivery sequence:** After the universal file API and basic Cloudflare R2 transfers are verified, integrate with the existing guidance system and GUI. This requirement must not delay urgent bounded-memory transfer reliability or the Cloudflare-only beta release.  
**Hierarchy:** **Session → Section → Test Suite → Exercise**

## 1. Owner directive

Build a lightweight, **text-driven, human-operated, coverage-guided GUI exercise laboratory**. The generator rapidly derives meaningful file-management instructions from existing capability declarations, an approved test corpus, actual available objects, and the verified current test state. The user simply follows one clear instruction at a time inside REDOWN Explorer. The system handles planning, coverage history, evidence, comparison, and reporting.

**FOUNDATIONAL MUST-APPLY RULE: A single session retains a persistent, session-wide record of every issued exercise specification. Never issue an identical exercise specification twice anywhere within that session, even across separate sections or test suites.** Separate sessions may legitimately repeat the same specifications. A session can run for hours, days, or weeks, resume after restart, and continue toward exhaustion of its explicitly defined, finite eligible variation space.

No hidden automatic recycling once coverage is exhausted. Report exhaustion and permit the user to explicitly expand the variation space or start a new session. Re-trying a failed/blocked exercise is a recorded **retry of the same exercise ID**, not a newly issued duplicate. Mark issued, attempted, skipped, failed, and independently verified coverage separately.

This is a **GUI-to-universal-API-to-provider acceptance layer**, not another transfer engine, parallel operations API, speculative architecture rewrite, or substitute for existing CMD/API laboratory acceptance.

## 2. Intended user experience

1. User opens **Guided Exercise Laboratory**, chooses an approved isolated R2 test bucket/prefix, and starts or resumes a session. Default settings should be safe, simple, and sensible.
2. REDOWN discovers actual supported capabilities and inventories the authorized fixture corpus plus relevant cloud objects. Unsupported activities are excluded or clearly flagged rather than silently assumed to work.
3. The UI shows the current **Section / Test Suite / Exercise**, a plain-language instruction with exact source and destination, optional short hint, progress, and accessible controls for Retry, Skip, Pause, and Resume.
4. User performs the action with normal REDOWN GUI features: context menu, browse, drag-and-drop, copy/paste, keyboard, upload, download, search, rename, etc., only where supported.
5. Existing REDOWN logging, guidance, operation coordination, and result codes correlate the user action to the expected exercise. The interface reports completion only when supported evidence warrants it; ambiguous/manual steps may require user confirmation but do not treat that confirmation as proof of cloud correctness.
6. When conclusive verification finishes, REDOWN automatically presents the next exercise. If it cannot safely determine completion, it explains why and offers retry/skip/reconcile rather than inventing PASS.
7. Section checkpoints and final reconciliation produce portable, redactable JSON/JSONL evidence, machine-readable coverage, and a human-readable report. The user never needs to manually calculate hashes or inspect logs for ordinary progress.

The instructions are **text-based and fast to generate**; full scans, remote queries, or hashing are not needed for each generation step. They are only used for necessary inventory, action checks, and verification. Keep baseline observability lightweight; medium/heavy diagnostics are opt-in or triggered by anomalies.

## 3. Hierarchy and coverage model

- **Session:** Durable unit containing seed, finite eligible variation definition, initial and evolving state, session-wide uniqueness ledger, checkpoints, results, and resumable position.
- **Section:** Major user-facing workflow category, e.g., Navigation; Folder Operations; File Operations; Upload; Download; Bulk Activities; Errors and Conflict Handling; Persistence/Recovery; Cross-operation Workflows.
- **Test Suite:** Focused family within a section, e.g., Move Files, Rename Directories, Upload Large Files, Conflicting Destinations, Nested Directory Operations.
- **Exercise:** One concrete, uniquely specified user action or deliberate multi-action workflow with explicit prerequisites, instructions, expected effect, capability requirements, and evidence requirements.

Suggested section catalog is extensible and capability-gated; examples are not promises of shipped features. Include browse, search, sort, refresh, create/rename folders, copy/move/rename/delete objects, upload/download, batch operations, drag/drop, context menu, paste, pagination, unusual filenames, zero-byte and large files, directory depth, duplicate/conflict behavior, failed authorization, interrupted transfers, restart/resume, cancel/retry, and cross-operation workflows where implemented.

Test **natural dependent workflows**, not solely isolated operations. Example: create folder → upload several different files → rename folder → move subset → copy another → delete an object → refresh/restart → independently verify resulting keys and bytes. Maintain explicit prerequisites and checked current state; an unsuccessful earlier operation must not be assumed to have happened.

## 4. Session-wide non-repetition and exhaustive variation

**Identity:** Canonicalize each exercise specification to a stable signature containing at minimum operation/workflow, chosen object identity and revision (where supported), source/destination, relevant file size/type/name classes, directory shape, interaction channel, starting conditions, expected conflict/error mode, and capability/provider semantics. Persist both full specification and signature.

- Never reissue the same canonical signature anywhere within the *same* session, regardless of section/test suite.
- Strongly prefer **meaningfully different** combinations over superficial file-number substitution. Use coverage dimensions including operation; small/medium/large/zero-byte size class; format/MIME; Unicode, spaces, reserved and boundary-length naming; nesting; single vs bulk; interaction method; destination occupied/empty; failure and recovery condition; and chained workflow.
- Within each planned finite test space, prefer uncovered dimension combinations (coverage-guided randomized ordering), using a saved random seed and deterministic tie-breaking. Randomness selects order/representative inputs, **not** whether required categories get coverage.
- Maintain distinct sets for **issued** (uniqueness), **attempted**, **verified PASS**, **FAIL**, **BLOCKED**, **INDETERMINATE**, **SKIPPED**, and **NOT_TESTED**. A skipped or failed exercise retains its issued identity; explicitly requested retries are tied to it.
- Define the eligible variation universe up front from versioned capabilities, selected corpus, approved paths, configuration and safety rules. Because arbitrary filenames and operation sequences are unbounded, **do not claim mathematically every possible filesystem variation**. Exhaustion means every eligible combination in the session's bounded declared matrix has been issued and appropriately accounted for, with actual success coverage shown separately.
- If source availability or provider capabilities change, record a versioned eligibility revision, explain added/removed candidates, and preserve previously issued signatures and historical denominators. Never silently reset the ledger.
- Session B may repeat a session A instruction. Each has an independent seed, history, evidence and state; optional cross-session analytics may compare them without enforcing global uniqueness.
- Memory/performance: store canonical IDs/coverage bitmap or indexes rather than loading all records into RAM. Use a durable append-only event history with checkpoints and an index that can be rebuilt safely. Generation must remain bounded and responsive for long sessions.

## 5. Verification architecture (four independent concerns)

1. **Expected-state model:** Take an initial snapshot of the isolated test namespace plus known fixture hashes. For each issued exercise, record state preconditions and a deterministic expected transition. Distinguish logical REDOWN folder presentation from actual R2 object keys (prefixes are not native folders).
2. **Observed GUI:** Capture what REDOWN rendered or what interface event was issued, navigation, visible progress, error handling and post-refresh views. GUI-visible success is **not** cloud proof.
3. **Observed universal API:** Correlate existing operation IDs, result codes, progress/retry/cancellation, transport outcomes and checkpoint journal. Do not add competing API or logging subsystems.
4. **Independent provider truth:** Under separately scoped, least-privilege verifier credentials/path, list/read R2 objects and metadata as needed, independently download and SHA-256 selected/required bytes. An R2 success response, ETag, size or matching local JSON assertion alone does not prove content integrity; multipart ETags require special caution.

At session start record a baseline; per operation verify directly impacted objects and invariants; periodically reconcile full namespace at configurable section checkpoints; at session end enumerate and compare entire test scope. Escalate to deeper checks on deletes, multi-object moves, conflicts, interrupted/uncertain transfers, corruption, and unexpected deltas. Strictness modes may choose checksum sampling vs full required byte readback, but reports must identify what was **not independently hashed**. Never claim full byte verification if sampled.

A cross-key move can be copy–verify–delete rather than atomic rename; the specification must accommodate interim states, revision/concurrency checks and non-atomic recovery. A failure is not rewritten as PASS if eventual state is unclear. Re-read/reconcile safely after timeout. No hidden destructive cleanup before evidence capture.

## 6. Session evidence contract

Store a portable session folder, for example:

```text
sessions/<session-id>/
  manifest.json
  exercises.jsonl
  events.jsonl
  checkpoints/
    000-initial.json
    001-section-complete.json
    ...
  coverage.json
  verification.jsonl
  report.json
  report.md
```

Minimum manifest fields: session ID, UTC timestamps, repository/runtime/extension/Worker versions, capability registry version, selected provider and **redacted** scope ID, fixture manifest ID, random seed, generator rules version, eligibility matrix/counts, session state and last checkpoint. Do not commit user filenames, tokens, R2 credentials, presigned URLs, object contents, or sensitive raw reports.

Minimum exercise record: stable exercise ID; section/suite; canonical signature; issue timestamp; instruction; exact source/destination and relevant revisions; starting-state prerequisites; expected effects; action method; capability basis; attempts; correlated UI and API operation IDs; evidence references; verification depth; final categorical outcome. Persist events append-only with durable sequence numbers and replay-safe writes. JSON reports summarize, not replace, event history. Use existing result and error contracts wherever possible.

Outcome accounting must separate **issued**, **attempted**, **verified**, **unsupported**, **blocked**, **indeterminate**, **failed**, **skipped**, **untested**, plus legitimate **expected-error PASS** where correct failure handling is verified. Track latency, memory/CPU metrics at low cost, bytes moved, file-size/type/edge-case coverage, GUI/API/provider mismatches, and resumability.

## 7. Safety, isolation and reliability

- Never operate on arbitrary user data or production objects by default. Require explicit authorization for the isolated bucket/prefix and each destructive class of test. Scope and verify permissions before mutations.
- Prefer immutable fixture manifests and generated disposable test objects; clearly label test-created artifacts; constrain and audit cleanup only to proven test-owned objects.
- Preserve user-visible confirmations for genuinely destructive or disruptive operations. Tests must not bypass authorization.
- Durable state transitions and crash recovery: atomic checkpoint writes, idempotent exercise IDs, resumable generator index, duplicate-event tolerance, and reconciliation of in-flight/uncertain outcomes after restart.
- Strongly distinguish simulated faults from real provider observations. Fault-injection needs a controlled approved mechanism and explicit provenance.
- For failure or divergence, stop unsafe dependent chains while allowing unrelated suites to proceed if their prerequisites remain valid.
- Respect storage/egress/request costs and rate limits; permit section-by-section pacing and pause with no background tasks assumed.

## 8. Minimal implementation plan and non-disruption rule

**Do not start GEL before completing the current bounded-memory R2 transfer and basic Explorer/API acceptance priorities.** GEL becomes an **IMPORTANT / MUST APPLY acceptance capability** when the GUI is connected and its functionality is ready to validate.

1. Map existing REDOWN guidance, universal operation registry, results, and Laboratory evidence models. Extend them; no parallel API, second coordinator, or duplicate logger.
2. Implement text-only declarative exercise templates and capability-gated finite variation matrix. Save session seed, eligibility, and durable unique-signature ledger.
3. Add simple guided UI: section/suite progress, instruction, retry/skip/pause/resume, verified status and mismatch details on demand.
4. Implement deterministic expected-state transitions and independent verifier adapter, starting with approved Cloudflare R2; retain ability to add provider-specific verifier semantics later.
5. Validate long-session no-repeat/exhaustion, restart/resume determinism, evolving-state dependent workflows, provider truth checks, failure classification and privacy.
6. Release with documentation, schema definitions, fixtures, reproducible local tests and owner-run real-R2 evidence. Clearly distinguish implementation/test evidence from planned functionality.

### Required acceptance tests

- Same random seed and same initial state/capabilities yield same eligible ordered plan; different seeds change ordering but preserve required coverage.
- No duplicate canonical exercise signatures in a single session across suite or section boundaries, including after crash/restart.
- Sessions can repeat one another without contaminating ledgers.
- Exhausting a finite matrix reports exhaustion with honest issued/verified/blocked/skipped statistics and never silently loops.
- A failed prerequisite prevents impossible follow-on instructions; state changes are reconciled before continued generation.
- User GUI action correlates to the expected universal operation and its actual provider outcome; mismatches are surfaced, not concealed.
- Interrupted session resumes without losing events, duplicating mutations, assuming completion, or resetting uniqueness.
- Independent reads and SHA-256 catch intentionally corrupted bytes and wrong destination keys despite a claimed API success.
- Unsupported capabilities produce transparent exclusion, not fictional action prompts.
- Observer costs remain bounded in default mode, with deeper optional diagnostics.
- All destructive activities stay inside explicit approved test scope and are recoverably auditable.

## 9. Governance and owner priority

**IMPORTANT / MUST APPLY is an owner requirement for the eventual comprehensive GUI acceptance system. It does not assert this proposal is implemented or passed.** Keep the currently agreed release blockers (large-file bounded streaming, reliable R2 transfers, GUI wiring and beta readiness) in front. The fundamental session-wide uniqueness, durable exhaustibility, simple user instructions and independent evidence rules must survive future design simplification.

**Product definition:** REDOWN GEL is a lightweight, text-driven, guided simulation of actual file-explorer use, with session-wide non-repeating instructions, exhaustible declared coverage, persistent reproducibility and independently auditable GUI/API/cloud outcomes.
