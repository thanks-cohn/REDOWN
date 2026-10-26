# IMPORTANT PROPOSAL: Offline-First Universal Cloud Workspace and Durable Intent Replay

**Status:** IMPORTANT architectural proposal, NOT implemented or verified.  
**Priority:** High, foundational cross-provider capability.  
**Owner decision requested:** Review/accept before implementation.  
**Scope:** REDOWN Explorer, Resource Atlas/RFIS, universal API, provider adapters, transfer coordinator and persistent operation journal.

## Product promise

A user can lose internet connectivity, continue seeing the last-known directory and object structure of their connected clouds, and reorganize it using REDOWN's GUI. The GUI immediately shows the *intended* future structure and marks pending actions. All operations survive browser restarts, machine restarts, and reconnections. Once networking and authorization return, REDOWN safely reconciles remote reality with the queued changes and performs them as soon as practical, without making the user repeat their work.

This applies across providers. Cloudflare R2 is the first validation target, not the permanent architecture. Adding Google Drive, Dropbox, OneDrive, S3-compatible storage or future providers should normally add adapters/capability declarations, not alternate journals, Explorer trees, or coordinators.

## Non-negotiable invariants

1. **One semantic operation system:** Reuse/extend the canonical universal API, Resource Atlas, journal, transfer coordinator and provider adapter capability contracts. No shadow subsystem, duplicate file identity authority or conflicting queue.
2. **Desired vs observed reality:** Maintain separate immutable remote observations (with provenance, revision/version/freshness), local user intent, and rendered projected state. Never present an uncommitted local rename or deletion as remotely completed.
3. **Durability before feedback:** A local mutation must be transactionally committed to a durable journal before the interface claims it is queued. Crashes must not silently lose or duplicate operations.
4. **Safe reconciliation:** Before replay, check remote changes, object identity, permissions, provider capabilities and preconditions. Conflicts pause the affected actions and remain reviewable. Never blind-overwrite or replay destructive operations against changed objects.
5. **Explicit deletion policy:** Destructive actions require affirmative authorization; if an offline-deleted resource changed remotely, stop for user review. Preserve recoverability/rollback where provider capabilities permit. Never claim universal rollback.
6. **Authenticated execution:** Browser, extension and native helper share policy but retain appropriate security boundaries. No long-lived secrets in exported JSON or ordinary logs. Least-privilege, scoped credentials; authenticated local bridge; audit logs with redaction.
7. **Honest state:** Distinguish cached, offline, queued, validating, running, verified, blocked/conflict, failed, cancelled and completed. Connection restored does not mean credentials, permissions or provider quotas are ready.
8. **Agent-first:** All queued intents, dependency plans, risks, evidence, conflict decisions and execution receipts have versioned, structured, authorized universal API access; agent access must not imply permission to mutate clouds.
9. **No unnecessary bloat:** Evolve existing components; document why any new storage mechanism/service cannot fit existing authority. Forever Works preserves rationale, contracts, accepted purpose and test evidence, not fabricated completion.

## UX expectations

- Browse a clearly freshness-stamped cached multi-cloud hierarchy offline.
- Rename, move/copy, create folders, reorder and prepare bulk reorganizations with instant optimistic rendering and unambiguous pending badges.
- Show an inspectable queue: action, source/destination, provider/account, affected count, dependencies, status, retry conditions and conflicts. Support cancel, undo *before execution*, safe edit/reorder of plans and dry-run preview where feasible.
- Give users a policy control: automatically replay approved low-risk changes when online, while pausing destructive/conflicted/privilege-changing changes for confirmation.
- Communicate that some files' contents or destinations may be unavailable offline even if metadata was previously indexed.
- Closing the tab/extension may prevent execution; an authorized running native helper or newly opened browser session can resume. Do not promise background execution without a running executor.

## Persistence and portable plans

Use transactional storage appropriate to execution surface (e.g., IndexedDB in the browser/extension, SQLite for native), rather than assuming a single JSON file provides atomic, concurrent and crash-safe mutation. Expose versioned JSON export/import for portable metadata, operation plans and evidence, redacting credentials and sensitive data by default. Separate sensitive local cache from shareable manifests.

Canonical operation record should include: stable operation/idempotency key, schema version, originating actor and authorization scope, provider/account and adapter version, resource stable IDs plus observed paths, precondition/version fingerprint, desired transformation, dependency edges, creation time, current state, attempt/retry history, conflict classification, and verification evidence/receipts. Support forward schema migrations and explicit recovery from partially committed remote operations.

## Reconnection and execution protocol

1. Confirm network availability, provider authentication, permission scopes, quotas and adapter capability compatibility.
2. Refresh affected source/destination remote metadata using bounded pagination; compare version/ETag or provider-appropriate evidence with last observations.
3. Compute dependency ordering; coalesce safe adjacent operations only when semantics and auditability are preserved. Avoid cycles and path collisions, including rename swaps.
4. Present dry-run impact and block conflicts. Automatically replay only approved operations within the configured policy.
5. Execute with bounded concurrency, rate-limit handling, exponential backoff/jitter and persistent checkpoints. Assume remote APIs may produce ambiguous outcomes.
6. Resolve ambiguous outcomes by re-observing remote state before retrying. Avoid at-least-once execution accidentally applying an operation twice.
7. Verify success with provider-appropriate identity/version/content or destination checks; do not treat HTTP success alone as proof of final recoverability.
8. Update projected and observed state, record structured receipts, and retain an auditable history. Continue independent queued work when one operation is blocked, respecting dependency graphs.

**Provider nuance:** S3/R2 object stores may emulate folders as prefixes rather than atomic renameable directories. A move may involve copy, verification and then authorized deletion. Cloud-to-cloud movement may require transfer with stronger failure/recovery safeguards. Adapter capability declarations must reflect this honestly.

## Specific risks to design for

- Concurrent edits from another device/agent, renamed parent folders, missing destinations, same-name collisions, permission revocation and stale metadata.
- Partial multi-object moves, shutdown between copy and delete, expired authorization, eventual listing delay, rate limits and network flapping.
- Cross-provider metadata incompatibilities and unsupported operations; show fallback plans or block instead of silently degrading guarantees.
- Malicious cache/plan imports, forged provider metadata, local malware access, origin/CSRF attacks on the helper, injected filenames and path traversal.
- Offline metadata privacy, local encryption options, storage quotas, millions of objects and efficient virtualized Explorer rendering.

## Suggested delivery phases (proposal, not commitment)

**A: Contract and threat model.** Inventory existing queue/journal/Atlas/RFIS/Explorer authorities; propose minimum versioned operation schema, state machine, adapter capabilities, security boundaries and source-of-truth rules. Document overlap and migration, not a parallel system.

**B: R2 offline metadata and local staging.** Cache a verified, freshness-marked directory snapshot, enable create/rename/move plans in Explorer while offline, durable queue persistence, import/export and crash/restart reconstruction. Use fixtures; no live cloud writes during offline tests.

**C: Safe reconnect and reconciliation.** Adapter capability checks, remote revalidation, conflict UX, idempotent replay/verification and real R2 integration tests under explicit authorization.

**D: Agent-native and multi-provider.** Expose structured read/plan/approved-execute operations, add second provider adapter to prove contract portability, test cross-provider scenarios and document Forever Works obligations.

**E: Scale and comparative benchmarks.** Thousands to hundreds of thousands of queued actions, low-memory large directories, repeat disconnects, mass rename/move, provider outages, partial failures, recovery and independent inspection against existing tools.

## Acceptance tests

- Offline Explorer accurately shows last-known cached hierarchy with clear staleness and no invented remote success.
- Queue 1,000 mixed create/rename/move operations offline, restart extension/browser, and recover precisely the same intent graph and projected UI.
- Replay after reconnect against a controlled R2 test environment: all authorized, conflict-free operations verified; no duplicates on repeated restarts or ambiguous responses.
- A remote version changed during outage => destructive/replacing operation blocked for review, unchanged remote data retained.
- Parent/child renames, rename swaps, destination collisions, cycles and mixed provider capabilities give deterministic dependency planning or explicit conflicts.
- Power loss/crash at each journal and remote commit boundary does not cause silent data loss or unsafe repeated destruction.
- Revoked token or unsupported operation pauses safely and resumes only after appropriate authorization/capability recovery.
- JSON round-trip preserves compatible intent and evidence, never exports tokens by default, validates untrusted input and supports migration.
- Independent agents can inspect and explain the same queued plan without creating competing queues or gaining implicit mutation permission.
- Automated unit/property/fault-injection tests, browser installed tests and live provider tests reported separately; only evidence-backed acceptance claims.

## Competitive context and rationale

Offline file sync is not novel. Mountain Duck, Dropbox and Google Drive provide subsets of offline browsing/editing and later synchronization. REDOWN's possible differentiation is a *universal, explicit, agent-readable desired-state plan* spanning providers, with strong provenance, conflict handling, durable replay and verification. Do not claim market uniqueness without current comparative research.

**Decision request:** Accept this as an important architectural direction and schedule contract/threat-model review ahead of implementation. It must not override currently higher-priority non-GUI reliability defects. The ultimate aim is that the user organizes cloud resources once, and REDOWN later reconciles and realizes that intention safely.
