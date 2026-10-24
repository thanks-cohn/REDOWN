# REDOWN Phase 2.6 — Universal Agent Control, Python SDK, Cloudflare R2 Integration, and Competitive Filesystem Laboratory

## Mission

Build REDOWN's permanent, production-oriented foundation for externally controlled, agent-native, multi-provider filesystem operations.

**Repository:** `thanks-cohn/REDOWN`  
**Starting branch:** Latest `main`  
**Primary execution environments:** Windows, Linux, macOS, and authorized cloud-based agents  
**Delivery target:** Verified implementation committed, merged, and pushed to `main`, subject to mandatory safety gates.

This is an **implementation assignment**, not a request for architecture proposals, mockups, or documentation alone.

The immediate implementation must produce:

1. A functioning external Python SDK and command-line client.
2. A secure, owner-authorized bridge into REDOWN's actual Universal Filesystem Engine.
3. Real Cloudflare R2 operations using the existing REDOWN engine and provider adapter.
4. Flexible credential handling, including a two-credential cold-agent bootstrap.
5. An extensive real-world file operation and failure-testing laboratory.
6. An initial reproducible competitive benchmark against rclone.
7. Integration with Resource Atlas, AAC, AOB, and Forever Works.
8. A provider-independent architecture that can support future cloud providers and local filesystems without a foundational rewrite.

REDOWN's objective is to become a highly reliable, maintainable and extensible universal file explorer for humans and AI agents.

The long-term competitive ambition is to equal or exceed established tools such as rclone in the reliability and breadth of applicable filesystem operations, while offering an exceptionally polished visual interface and substantially better agent discoverability, diagnosis, verification and maintenance.

**We must earn those advantages through reproducible measurements, not assume them.**

Do not compromise safety, correctness, or architectural portability for a passing demonstration.

REDOWN remains proprietary. Do not modify repository visibility or licensing.

---

# PART I — ARCHITECTURAL FOUNDATIONS

## 1. Inspect the Actual Current Implementation

Before writing code, inspect the latest repository.

Review at minimum:

- `extension/file-engine/engine.mjs`
- `extension/file-engine/adapters/`
- `extension/file-engine/contract.mjs`
- `extension/file-engine/readiness.json`
- `extension/beta-explorer.mjs`
- `agent/files/api.mjs`
- `agent/files/cli.mjs`
- `agent/files/session.schema.json`
- `agent/aac/`
- `agent/resources/`
- `agent/diagnostics/`
- `docs/aac/FILES.md`
- `docs/aac/PHASE25.md`
- `docs/phase2/UNIVERSAL_API_LAB.md`
- `docs/phase2/RESOURCE_ATLAS.md`
- `docs/aob/`
- Existing R2 laboratory scripts
- Existing browser and engine verification suites
- Relevant Forever Works records

Inspect how the production Explorer, Beta Explorer, Universal API, queue, journal, R2 adapter and Resource Atlas currently interact.

Establish which operations are implemented, verified, restricted, simulated, unsupported, or blocked.

Preserve valid working components.

If existing APIs require changes, use versioned compatibility-preserving migrations.

Do not create a second filesystem engine.

## 2. One Canonical Execution Path

All tested REDOWN operations must use this logical architecture:

**Python / Codex / ChatGPT Work / authorized agent / Beta UI**

↓

**REDOWN client or transport interface**

↓

**Authenticated, capability-scoped REDOWN session**

↓

**Canonical Universal Filesystem Engine**

↓

**Provider capability negotiation and authorization**

↓

**Provider adapter**

↓

**Cloudflare R2 or another supported filesystem**

↓

**Independent verification and Resource Atlas evidence**

The same fundamental operations and policies must apply to human UI actions and external-agent actions.

No provider-specific transfer implementation belongs inside the Python SDK.

Do not implement direct boto3 transfers and present them as REDOWN operations.

A separate boto3/S3 client may be used for independent verification or comparison testing, clearly labeled as such.

## 3. Design for Competitive Filesystem Capabilities From the Beginning

REDOWN must not be architecturally limited to small browser uploads or simple object copies.

Design the permanent contracts for:

- Remote and local file listing.
- File metadata.
- Prefix and directory navigation.
- Upload and download.
- Cloud-to-cloud copying.
- Local-to-cloud transfers.
- Cloud-to-local transfers.
- Remote-to-remote ingestion where supported.
- Move and rename.
- Delete and trash semantics.
- Bulk operations.
- Directory synchronization.
- Incremental transfers.
- Resume and restart.
- Streaming and multipart transfer.
- Concurrency.
- Conflict handling.
- Retries.
- Transfer checksums.
- Independent integrity verification.
- Progress and cancellation.
- Durable queues and journals.
- Error recovery and reconciliation.
- Provider-specific capability discovery.
- Resource and performance observability.

Not all these operations must immediately be declared implemented.

Separate:

**Architecturally supported**

**Implemented**

**Tested**

**Real-provider verified**

**Production ready**

An unimplemented feature must have an explicit capability status, not a misleading placeholder.

Choose interfaces and data models that allow these capabilities to be implemented incrementally without rebuilding the Python SDK or canonical coordinator.

In particular, avoid designs that require entire large files to be buffered in memory.

Do not raise existing size limits unless actual streaming, multipart and resource verification justify doing so.

---

# PART II — FLEXIBLE AUTHORIZATION AND TWO-CREDENTIAL BOOTSTRAP

## 4. Mandatory Two-Credential Cold-Agent Experience

A completely unfamiliar authorized agent must be able to begin with:

**Credential A:** GitHub access to the REDOWN repository.

**Credential B:** Cloudflare account or R2 access appropriate to the approved test resources.

These are the preferred minimal user-provided bootstrap credentials.

The user should not normally need to configure REDOWN's internal APIs or understand Worker bindings, filesystem adapter internals, journal formats, or S3 signing.

The bootstrap must discover and configure required nonsecret technical information automatically wherever possible.

Additional credentials, endpoint settings and permissions must remain supported when necessary.

Two credentials are an ergonomic goal, **not an excuse to assume that every Cloudflare credential grants every required capability**.

### Mandatory cold-agent experiment

Provide a new agent with:

- REDOWN's GitHub repository address.
- Authorized GitHub access.
- Authorized Cloudflare access.
- The instruction to bootstrap and run the laboratory.
- No previous project knowledge or private implementation hints.

The agent must independently:

1. Obtain the repository.
2. Find the designated cold-agent entry point.
3. Inspect supported capabilities and test requirements.
4. Identify the appropriate Cloudflare account.
5. Discover authorized R2 test resources.
6. Determine available credential types and permissions.
7. Establish a trusted REDOWN execution session.
8. Configure the Python client.
9. Run simulated tests.
10. Run permitted real-R2 tests.
11. Independently verify remote state.
12. Retrieve Resource Atlas evidence.
13. Identify failures and relevant source.
14. Safely clean up owned fixtures.
15. Produce a reproducible final report.

Record every human intervention and additional credential requirement.

A second experiment must demonstrate safe failure when one of the supplied credentials has insufficient permissions.

Do not conceal configuration requirements or use undocumented privileged shortcuts.

## 5. Support Actual Cloudflare and S3 Authentication Models

Support these distinct credential configurations:

### A. Cloudflare API bearer token

A user supplies a Cloudflare API token.

Use the token only for operations and APIs authorized by its scope.

Discover the account and permitted capabilities where supported.

Where the token is an appropriate R2 API token, apply Cloudflare's documented mapping or supported credential provisioning to establish S3-compatible access.

Do not assume arbitrary Cloudflare API tokens work as S3 credentials.

### B. R2 S3 credentials

Support the conventional configuration used by rclone and S3-compatible clients:

- Access Key ID.
- Secret Access Key.
- S3 endpoint.
- Region or signing region where required.
- Optional session token.
- Optional jurisdiction-specific endpoint.

The endpoint should be discoverable from known account configuration when possible, but manually configurable.

Allow advanced users to supply every value explicitly.

Support multiple endpoint profiles.

### C. Temporary R2 credentials

Support short-lived, narrowly scoped delegated credentials where permitted by the provider.

Handle expiration, renewal where authorized, revocation and failure to renew.

Do not silently fall back to broader permanent credentials.

### D. Existing connected Cloudflare authorization

If ChatGPT Work, Codex, another agent, or an authorized service already has supported Cloudflare account access, permit it to perform the setup and resource operations its connection supports.

Do not assume connected-app credentials can be extracted, exported, or transferred into a local Python process.

Use supported connector actions or separately authorized credential provisioning.

### E. Browser-authorized REDOWN session

Where feasible, permit a locally running agent to obtain a narrowly scoped authorization from an existing authenticated REDOWN browser session.

Require explicit user consent and secure origin/caller verification.

Do not extract cookies or browser-held credentials.

### F. Local process authorization

Support private, owner-launched stdio sessions without requiring a separately typed REDOWN agent token.

The user's launch and access to the private process channel establish the permitted session boundary.

### G. Explicit REDOWN agent token

Support restricted agent credentials for authenticated local or remote control channels.

These credentials control REDOWN operations only.

They must not automatically confer Cloudflare administration privileges.

### H. Remote/headless execution

Design for appropriately authenticated HTTPS, short-lived scoped grants, secret managers and CI environments.

Do not deploy an unauthenticated network listener.

Remote transport may be staged, but its future inclusion must not require replacing the canonical engine.

## 6. Credential Security and Discovery

Create a provider-independent credential profile abstraction.

Provide safe commands to:

- List supported authentication methods.
- Discover available credential profiles.
- Test access without exposing secrets.
- Determine missing permissions.
- Show the effective scope of a session.
- Inspect credential expiration.
- Revoke an agent session.
- Change credential profiles.

Prefer OS credential stores, authorized connection managers, scoped environment variables, secure CI secrets or temporary session grants.

Never put credentials into Git URLs, shell history through command arguments, application logs, test reports or source files.

Separate test accounts from production accounts.

Never grant permissions broader than required solely to reduce setup friction.

Produce actionable errors such as:

`R2_S3_CREDENTIALS_REQUIRED`

`INSUFFICIENT_BUCKET_PERMISSION`

`INVALID_R2_ENDPOINT`

`CREDENTIAL_EXPIRED`

`AGENT_SCOPE_DENIED`

`PROVIDER_OPERATION_UNSUPPORTED`

Use the project's established error conventions where possible.

A missing Cloudflare permission must not be misreported as a filesystem engine defect.

---

# PART III — PRODUCTION-ORIENTED PYTHON SDK AND AGENT BRIDGE

## 7. Implement the Python SDK

Create a real Python package, preferably:

`clients/python/redown/`

It should provide a clean, typed, documented interface.

Illustrative API:

```python
from redown import RedownClient

with RedownClient.local(profile="r2-lab") as redown:
    capabilities = redown.describe()

    files = redown.list(
        provider="r2",
        bucket="test-1-new",
        prefix="agent-test/"
    )

    operation = redown.copy(
        source="r2://test-1-new/agent-test/example.bin",
        destination="r2://test-3-new/agent-test/example.bin"
    )

    result = redown.inspect(operation.id)
    verification = redown.verify(operation.id)
    performance = redown.resources(operation.id)
```

This is a proposed user-facing API. Align it with existing REDOWN identity conventions and versioned contracts.

The SDK must provide:

- Typed request/response models.
- Automatic schema validation.
- Clear exceptions.
- Version negotiation.
- Session creation and cleanup.
- File operations.
- Bulk job submission.
- Job status and progress.
- Cancellation where supported.
- Resource Atlas queries.
- Evidence export.
- Capability inspection.
- Configurable operation budgets.
- Explicit transfer timeouts.
- Safe retry semantics.
- Support for programmatic use and command-line use.

The Python SDK should be suitable for long-term reuse, not merely for one test suite.

Avoid unnecessary dependencies.

Provide Python package metadata and tests.

Support Windows, Linux and macOS to the extent possible.

## 8. Python Command-Line Interface

Provide a comprehensive CLI, with commands resembling:

```bash
redown doctor
redown auth status
redown providers
redown capabilities
redown ls r2://test-1-new/
redown upload ./sample.bin r2://test-1-new/lab/
redown copy r2://test-1-new/lab/sample.bin r2://test-3-new/lab/sample.bin
redown jobs
redown verify OPERATION_ID
redown trace OPERATION_ID
redown benchmark --suite core
redown lab run --profile live-r2
redown lab report
```

These are desired examples, not assertions of existing commands.

Prefer understandable help text and machine-readable JSON output.

Support shell automation, exit codes and bounded pagination.

Do not require an AI model to operate the CLI.

## 9. Extend the Authorized REDOWN Bridge

Build on:

- `agent/files/api.mjs`
- `agent/files/cli.mjs`
- The existing session contract.
- Existing engine authorization.
- Resource Atlas.
- AAC discovery infrastructure.

Implement a secure owner-configured real-R2 bootstrap.

The process must:

- Initialize the canonical engine.
- Configure the existing R2 adapter.
- Attach authorized storage and journaling.
- Enforce session scopes.
- Expose only the permitted API surface.
- Preserve operation IDs and diagnostics.
- Protect privileged internals.
- Support safe session termination.

The Python client must not gain direct access to mutable internal stores or Cloudflare secrets.

Retain the option for future MCP, authenticated local HTTP or remote transports as thin adapters over the same interface.

Do not duplicate execution logic between transports.

## 10. Durable Operation Semantics

Design and implement the most important reliability foundations:

- Stable operation identity.
- Idempotency keys.
- Atomic destination creation where supported.
- Conflict detection.
- Exact source and destination identity.
- Explicit uncertainty after interrupted operations.
- Safe reconciliation before retry.
- Durable journal persistence.
- Queue ownership.
- Cancellation semantics.
- Read-after-write verification.
- Prevention of silent overwrites.
- Provider capability negotiation.
- Bounded memory and resource budgets.

For copy, move and rename, preserve the distinction between successful destination creation and safe source deletion.

Never delete a source unless the engine can prove that the required conditions are satisfied.

Unsupported conditional deletion must remain blocked.

Use fault injection to verify these guarantees.

---

# PART IV — REAL CLOUDFLARE LABORATORY

## 11. Four-Bucket R2 Laboratory

Use the existing dedicated test buckets:

- `test-1-new`
- `test-2-new`
- `test-3-new`
- `test-4-new`

Discover and verify their current configuration before testing.

Preserve existing public/private policies.

Use run-specific prefixes with explicit fixture ownership.

Do not mutate unrelated resources.

Test all sixteen directed bucket-pair combinations, including same-bucket cases, where supported.

Use Cloudflare permissions appropriate to the authorized test environment.

Never treat a public `r2.dev` URL as proof of authenticated bucket listing or write permission.

## 12. Comprehensive File Corpus

Create a reproducible file corpus covering:

- Empty files.
- Tiny text files.
- JSON, CSV, HTML, XML and Markdown.
- PDF documents.
- PNG, JPEG, WebP and GIF.
- Audio and video samples.
- ZIP and other archives.
- Arbitrary binary content.
- Extensionless objects.
- Unicode names.
- Long paths and special characters.
- Deep directory structures.
- Thousands of objects.
- Binary files with embedded zero bytes.
- Corrupt or malformed files where relevant.
- Files with identical names but different contents.
- Files with identical contents but different names.

Use deterministic generation and permissively reusable fixtures.

Record expected sizes, SHA-256 checksums and provenance.

Test size boundaries and realistic larger transfers within the engine's current capabilities.

Implement streaming or multipart improvements as necessary and safely achievable; do not claim support for large files until verified.

## 13. Operation and Failure Matrix

Test every supported operation across relevant providers, directions and conditions.

Include:

- Normal success.
- Permission denial.
- Missing source.
- Existing destination.
- Concurrent operations.
- Interrupted network.
- Timeout.
- Throttling.
- Retried request.
- Expired credential.
- Invalid endpoint.
- Restarted Python client.
- Restarted REDOWN session.
- Journal interruption.
- Unexpected provider response.
- Partial destination state.
- Independent verification failure.
- Cleanup failure.

Use deterministic fault injection whenever practical.

Conduct live tests only when the corresponding real-world conditions can be safely established.

Record unsupported combinations explicitly.

## 14. Independent Verification

This is mandatory.

REDOWN must not certify its own file operations solely by returning success.

Use a separately authorized Cloudflare inspection path or independent S3-compatible client to verify:

- Object existence.
- Object size.
- Actual bytes.
- Expected SHA-256.
- Metadata where relevant.
- Source preservation.
- Source removal where valid.
- No unrelated changes.
- Fixture cleanup.

Do not use ETag as a universal substitute for a full-content checksum, particularly for multipart uploads.

Keep the operation path and verification oracle logically separate.

For large data, use streaming verification with bounded memory.

No successful mutation is considered fully verified without the required independent evidence.

Privileged laboratory cleanup must be separately authorized and must never be misrepresented as a REDOWN filesystem operation.

---

# PART V — COMPETITIVE BENCHMARKING

## 15. Treat rclone as a Serious Engineering Reference

Build an initial reproducible comparison with rclone.

Study its relevant capabilities, including:

- Transfer concurrency.
- Large-file support.
- Multipart upload.
- Directory synchronization.
- Checksums.
- Retry and recovery behavior.
- Filters.
- Backend configuration.
- Remote-to-remote operations.
- Resumability.
- Dry-run and destructive-operation safeguards.
- Transfer statistics.
- Automation interfaces.

Record rclone version, configuration and supported R2 semantics.

Do not copy rclone internals or assume REDOWN already matches its functionality.

Identify the aspects where REDOWN is behind, equal or ahead based on measured evidence.

The objective is to learn from established engineering rather than recreate every feature blindly.

## 16. Fair Performance Laboratory

Benchmark comparable workloads using the same:

- Source data.
- Destination account and buckets.
- Test prefixes.
- Machine resources.
- Network conditions.
- Concurrency levels.
- Operation counts.
- File sizes.
- Verification requirements.

Measure:

- Successful operation rate.
- Data-integrity failures.
- Throughput.
- End-to-end latency.
- Time to first completed operation.
- CPU consumption where available.
- Peak and retained memory.
- Retry behavior.
- Completion after interruption.
- Cloud API request counts.
- Estimated storage-operation costs where supported.
- Setup effort.
- Automation effort.
- Agent tool calls and context consumption.

Separate source-provider limitations from REDOWN-specific overhead.

Benchmark cold and warm conditions.

Repeat trials and report dispersion and uncertainty.

Do not select only favorable workloads.

Do not publish a blanket claim that REDOWN is faster or more reliable based on a narrow test.

## 17. Beyond rclone

Design the framework to accommodate:

- SaveAnywhere.
- MultCloud.
- Air Explorer.
- Provider-native clients.
- S3-compatible tools.
- Future multi-cloud explorers.

Only benchmark workflows genuinely comparable under authorized conditions.

For GUI-oriented competitors, use browser or desktop automation where supported and permitted.

Do not invent nonexistent CLI or API capabilities for competitors.

Separate human UX comparisons from transfer-engine performance.

Make REDOWN's benchmark adapters reusable for future products and studies.

---

# PART VI — AGENT OPERABILITY AND SELF-MAINTENANCE

## 18. AOB Integration

Read:

- `docs/aob/README.md`
- `docs/aob/SPECIFICATION.md`
- `docs/aob/RESEARCH_AND_GOVERNANCE.md`
- `docs/aob/REDOWN_DEMONSTRATION.md`

Use the laboratory to begin implementing a portable AOB task runner.

AOB evaluates how well software supports agents, not merely how intelligent an agent happens to be.

Keep task definitions provider-neutral and application-independent.

Record:

- Cold-agent task success.
- Capability discovery effort.
- Actual operation success.
- Verification quality.
- Diagnostic accessibility.
- Recovery effectiveness.
- Human intervention.
- Tool calls.
- Actual model token usage where measurable.
- Resource and context efficiency.
- Source/test discoverability.

REDOWN must receive no favorable assumptions or automatic credit.

Do not assign an industry rank before cross-project validation.

AOB must remain potentially independent of REDOWN and compatible with non-REDOWN applications.

## 19. Resource Atlas Integration

Every relevant test should correlate with REDOWN's Resource Atlas.

Use operation IDs to retrieve:

- Latency breakdown.
- Transfer duration.
- Network timing where measurable.
- Provider adapter timing.
- Journal overhead.
- Queue waiting.
- Retry behavior.
- Memory observations.
- Error classification.
- Cleanup evidence.
- Available resource bottlenecks.

Distinguish measured values from estimates.

Do not misrepresent runtime heap changes as precise per-operation memory attribution.

Measure instrumentation overhead.

Preserve bounded, queryable evidence instead of dumping enormous diagnostic bundles into agent context.

## 20. AAC Integration

Extend the Agent Accessibility Conformance framework to verify that external Python operations correspond to the Beta UI's canonical capabilities.

For each operation, provide machine-readable relationships linking:

**Agent command → session authorization → engine operation → provider adapter → result → verification → Resource Atlas → source code → test → Forever Works record.**

Identify discrepancies.

The Python client is not allowed to succeed by bypassing a restriction that applies to the Beta Explorer.

Make API/UI parity part of ongoing regression verification.

## 21. Forever Works and Agent Self-Maintenance

Record the new architecture and tests through Forever Works.

A cold agent should be able to:

1. Discover the implementation.
2. Reproduce a failure.
3. Run the Python client against the same operation.
4. Examine its diagnostics.
5. Identify the responsible source.
6. Propose a repair.
7. Execute regression tests.
8. Compare before/after evidence.
9. Verify no unrelated regressions.
10. Preserve the purpose and obligations of modified components.

Use Purpose-Preserving Reconstitution principles.

Do not make preservation records depend on one agent framework.

An authorized future agent should be able to replace obsolete components while retaining their required behavior and constraints.

---

# PART VII — DELIVERY AND ACCEPTANCE

## 22. Required Artifacts

Deliver all of the following:

1. Installable Python SDK.
2. Python CLI.
3. Authorized local REDOWN execution bridge.
4. Trusted real-R2 bootstrap.
5. Credential profiles and permission discovery.
6. Two-credential cold-agent bootstrap workflow.
7. Conventional S3 credential configuration.
8. Versioned request and response contracts.
9. Comprehensive simulated test suite.
10. Real-R2 test suite.
11. Reproducible file corpus.
12. Independent integrity verifier.
13. Safe fixture cleanup.
14. Resource Atlas correlation.
15. Initial rclone benchmark harness.
16. At least one real rclone comparison where available.
17. Portable AOB task/evidence foundation.
18. AAC integration.
19. Forever Works records.
20. Documentation for Windows, Linux and macOS.
21. Machine-readable implementation and test status.
22. A prioritized capability-gap matrix against rclone.

All components must be functional where reported as implemented.

Do not substitute conceptual documentation for runnable deliverables.

## 23. Acceptance Demonstration A — Simulation

From a clean environment:

- Install the Python package.
- Launch an authorized simulated REDOWN session.
- Discover capabilities.
- List and inspect files.
- Create and copy a test fixture.
- Independently verify the result.
- Retrieve Resource Atlas evidence.
- Demonstrate authorization denial.
- Export a report.
- Exit cleanly.

This must work without Cloudflare credentials.

## 24. Acceptance Demonstration B — Real R2

Using an authorized test configuration:

- Establish Cloudflare credentials.
- Discover the permitted buckets.
- Launch an actual REDOWN engine session.
- Upload a generated fixture.
- Copy it across permitted R2 buckets.
- Read back the destination.
- Independently verify bytes and metadata.
- Record resource performance.
- Demonstrate a blocked unsafe operation.
- Inspect the operation journal.
- Confirm fixture cleanup through an independent authorized path.
- Produce a reproducible evidence report.

No direct boto3 operation may substitute for a REDOWN mutation.

If required permissions are unavailable, explicitly report the blocker. Do not fabricate live acceptance.

## 25. Acceptance Demonstration C — Cold-Agent Bootstrap

Give an unfamiliar authorized agent only the repository location, designated GitHub access, Cloudflare access and testing authorization.

It should independently establish the laboratory.

When additional technical configuration is required, the agent must discover and configure it automatically where permitted.

If an additional credential is genuinely needed, the system must request the exact credential type and scope rather than fail mysteriously.

Measure manual intervention.

Repeat with insufficient permissions to verify safe refusal.

## 26. Acceptance Demonstration D — Competitive Comparison

Install and configure an appropriate rclone version in an isolated test environment.

Run equivalent REDOWN and rclone workflows against authorized R2 test fixtures.

Compare actual measured outcomes.

Report performance and reliability honestly.

Identify features available in rclone but not yet implemented in REDOWN.

Publish a prioritized remediation matrix.

A successful benchmark does not require REDOWN to defeat rclone immediately.

It requires trustworthy, reproducible measurements that can guide REDOWN toward competitive parity and improvement.

## 27. Verification and Security Gates

Run all applicable existing suites, including AAC, Resource Atlas, Universal File API, schema checks, browser tests, reliability checks and Python tests.

Add dedicated authorization and credential-leak tests.

Test exact scope enforcement across process and session boundaries.

Confirm that no secrets are committed or present in generated evidence.

Ensure any live fixtures were cleaned up independently.

Preserve historical failures and acceptance evidence.

Do not change tests or scoring rules solely to produce passing results.

## 28. Implementation Strategy

This assignment should be implemented incrementally, but every stage must respect the final architecture.

Suggested order:

**Foundation:** Python SDK, stable session transport, schemas, simulation tests.

**Real cloud:** Trusted R2 bootstrap, credential profiles, independent verification.

**Reliability:** Durable jobs, fault injection, streaming and multipart improvements where feasible.

**Competitive lab:** rclone harness, equivalent workloads, baseline measurements.

**Agent integration:** Cold-agent bootstrap, AAC/AOB, Resource Atlas and Forever Works.

Do not abandon the assignment after only completing its easiest components.

If some capabilities cannot safely be completed, implement the verified foundation, mark exact unfinished interfaces, and provide executable follow-up acceptance criteria.

Avoid speculative placeholders that force later architectural rewrites.

## 29. Merge and Push to Main

Work on an isolated branch.

Commit implementation, tests, evidence, documentation and preservation records.

Run all relevant checks.

Review the final diff.

Where the required acceptance and security gates pass, merge and push the verified work to `main`.

If critical gates remain failed, retain the branch and report the exact blockers.

Do not falsely certify incomplete work.

Provide the final branch name, commit SHA, verification results and state of `main`.

---

# PERMANENT ENGINEERING PRINCIPLES

REDOWN is not intended to become a thin visual wrapper around Cloudflare R2.

Nor is it intended to become a fragile imitation of rclone.

It should become a universal, provider-independent filesystem platform whose implementation remains replaceable and maintainable.

A human should be able to operate it through an exceptionally intuitive, enjoyable interface.

An AI agent should be able to operate the same capabilities through an exceptionally clear, authorized programmatic interface.

A future maintainer should be able to understand its architecture, reproduce its failures, measure its performance and improve its implementation without relying on the original developer's private knowledge.

**Design for competitive correctness, reliability and scalability from the beginning.**

**Design for provider portability from the beginning.**

**Design for agent discoverability, observability and maintainability from the beginning.**

**Design for secure, flexible authentication from the beginning.**

**Design for independent verification from the beginning.**

Preserve the freedom to replace implementations without losing their purposes.

Learn from rclone's maturity, from successful browser-extension workflows, from modern cloud APIs, and from the best human interface designs.

Then improve REDOWN through actual evidence.

**The goal is not simply a better file explorer today. The goal is a file explorer whose architecture allows it to keep becoming better as technology advances.**

Implement Phase 2.6, demonstrate real results, document the remaining gaps, and push verified work to `main`.