# Phase 2.6 — Foundational Requirement: Universal API and Adapter-Only Provider Expansion

This section is a mandatory architectural acceptance requirement for the entire REDOWN Phase 2.6 assignment.

## Non-Negotiable Objective

REDOWN must be designed as a provider-independent universal filesystem platform from the beginning.

Cloudflare R2 is the first real provider used to establish and verify the architecture. It must not define the architecture's permanent limitations.

**Adding Google Drive, Dropbox, OneDrive, MEGA, another S3-compatible service, a local filesystem, or a future provider must ordinarily require implementing and registering a provider adapter—not rewriting the Universal API, Python SDK, transfer coordinator, journal, Resource Atlas, AAC, AOB, or Explorer interface.**

The architecture must support provider evolution through versioned capability contracts and compatibility-preserving extensions.

## 1. Establish the Universal Filesystem Model

Define stable, provider-neutral abstractions for:

- Provider identity and account identity.
- Storage containers and roots.
- Files, folders and virtual directories.
- Object identity and revision.
- File metadata, timestamps and MIME types.
- Checksums and integrity evidence.
- Listing, searching, filtering and pagination.
- Reads, writes and byte streams.
- Upload and download.
- Server-side and client-mediated copy.
- Move and rename.
- Delete, trash and restore where supported.
- Batch operations and directory synchronization.
- Cancellation and recovery.
- Provider authorization.
- Job lifecycle and persistence.
- Errors, partial success and uncertain outcomes.
- Capability negotiation.
- Performance instrumentation.
- Independent verification.

Do not assume every provider has traditional directories, globally unique paths, the same character restrictions, the same checksum algorithm or identical consistency guarantees.

Represent provider-specific semantics explicitly rather than silently discarding them.

## 2. Make Provider Capabilities Declarative

Every adapter must expose a versioned capability description.

It should state whether the provider supports, among other things:

- Native directories versus object prefixes.
- Case sensitivity.
- Duplicate names.
- Stable object IDs.
- Native search.
- Recursive listing.
- Pagination.
- Range reads.
- Streaming uploads.
- Multipart or resumable uploads.
- Server-side copy and move.
- Conditional writes.
- Revision-aware deletion.
- Conflict-safe rename.
- Checksums and supported algorithms.
- Modification timestamps.
- Metadata read/write.
- Shared links.
- Trash and restore.
- Change notifications.
- Quotas and rate limits.
- Authentication methods.

These capabilities must be machine-readable and available to both humans and agents.

Unsupported operations must be explicit.

The engine must select safe fallbacks only where their correctness and authorization requirements can be established.

For example, a cross-provider move may require verified copy followed by conditional deletion, not an assumed atomic rename.

## 3. Adapter-Only Expansion Acceptance Test

Create at least two independent adapter implementations against the same contracts.

Use the real Cloudflare R2 adapter and the existing simulation adapter as initial foundations.

Add an independent reference adapter or contract fixture designed specifically to challenge R2-specific assumptions. It should model capabilities that differ significantly from object storage, such as native directories, stable IDs, case-insensitive names or duplicate filenames.

Demonstrate that the same Python SDK and Universal API test scenarios operate against each adapter without changing their core implementation.

Add contract tests verifying:

- Capability negotiation.
- Unsupported feature handling.
- Identity semantics.
- Pagination.
- Conflict behavior.
- Integrity verification.
- Authorization.
- Journal and job lifecycle.
- Resource Atlas instrumentation.
- Recovery semantics.

Make these tests mandatory for every future provider.

## 4. Universal Transfer Coordinator

Keep transfer orchestration outside individual providers.

Adapters implement their supported primitives.

The universal coordinator manages:

- Transfer planning.
- Chunk and stream scheduling.
- Bounded buffering.
- Safe concurrency.
- Progress.
- Retries.
- Conflict policies.
- Idempotency.
- Verification.
- Journaling.
- Cancellation.
- Recovery.
- Source preservation.
- Provider capability negotiation.

Where two providers support a safe optimized transfer, permit an adapter-specific optimization through a declared capability and verified execution path.

Never duplicate the entire transfer engine inside a provider adapter.

## 5. Authentication Must Also Be Adapter-Oriented

Every provider declares supported credential types.

The universal credential layer handles identity, authorization scope, expiration, renewal, revocation and secure secret references.

R2 may use Cloudflare API authorization, S3 access-key credentials, or supported temporary credentials.

Google Drive may use OAuth.

Other providers may use API keys, service accounts, delegated tokens or additional security mechanisms.

All must connect to the same REDOWN authorization and agent-session model.

The Python client must not contain provider-specific authentication implementations.

## 6. Universal Test and Benchmark Harness

Every adapter must inherit the same core verification suite.

The suite must exercise:

- Discovery.
- Listing.
- Metadata.
- Data integrity.
- Copying.
- Transfers.
- Safe deletion where supported.
- Permission denial.
- Conflicts.
- Concurrency.
- Interruption.
- Recovery.
- Pagination.
- Resource usage.

Provider-specific tests extend this suite without replacing it.

The competitive laboratory must compare REDOWN against rclone and other relevant implementations through equivalent workloads, not merely compare documentation or advertised features.

## 7. Demonstrate No Foundational Rewrite Is Required

The delivery must include a concrete extension exercise:

1. Implement a new independent adapter.
2. Register its capabilities.
3. Configure its credentials or simulated authorization.
4. Run the existing Python SDK against it.
5. Run the universal contract suite.
6. Complete file operations where supported.
7. Retrieve Resource Atlas diagnostics.
8. Produce AAC evidence.
9. Demonstrate which core engine, Python SDK and Beta Explorer files remained unchanged.

Report any unavoidable core changes and explain whether they represent a genuine missing universal abstraction or an implementation defect.

Do not fabricate adapter portability by restricting the test to features R2 already supports.

## 8. Versioning and Long-Term Compatibility

Use stable contracts, semantic versioning, capability negotiation and compatibility tests.

New capabilities should normally be introduced additively.

Do not make every provider implement every possible feature.

Avoid a bloated universal interface that becomes impossible for smaller providers to satisfy.

Permit provider extensions without contaminating the core API.

Maintain documented migration rules for changes that genuinely require a new contract version.

Preserve Purpose-Preserving Reconstitution obligations through Forever Works.

## Final Architectural Acceptance Criterion

**The universal engine must survive the addition of new providers.**

**The Python SDK must survive the addition of new providers.**

**The Beta Explorer must survive the addition of new providers.**

**The testing laboratory must automatically gain a useful baseline of coverage for every new provider.**

**AAC and Resource Atlas must observe every new provider through the same diagnostic framework.**

Cloudflare R2 is our first proving ground, not our architectural ceiling.

Our ultimate goal is a filesystem platform whose capabilities can grow to meet or exceed mature competitors without repeatedly rebuilding its foundations.
