# MUST ADD: Python CLI Universal File API Verification, 500 MB Fixture Lab, and Multicloud Roadmap

**Repo:** thanks-cohn/REDOWN · **Branch:** beta-explorer · **Status:** Planned / implementation request for Codex · **Priority:** After Legacy/Beta parity audit.  
**Companion JSON example:** [REDOWN-PYTHON-CLI-PROTOCOL-EXAMPLE.json](REDOWN-PYTHON-CLI-PROTOCOL-EXAMPLE.json). This is **illustrative data, not an implemented wire contract or successful test result**.

## 1. Executive objective and sequencing

The goal is to reach 100% **verified success** on supported, well-defined Universal File API operations for a given published test suite, rather than claiming zero defects across every theoretical combination. **Never convert skipped, blocked, partial, timed-out, or unverified operations into a pass.** The test runner should expose failures, error codes, responses, feedback, timestamps, provider details, and replay instructions.

**Phase order:**
1. Finish source-grounded Legacy-vs-Beta capability parity and hard-limit audit; do not recreate existing legacy engines.
2. Provide a real Python CLI ↔ Universal File API bridge and executable protocol/schema. Exercise the exact core API used by Beta Explorer.
3. Run an approximately **500 MB total fixture directory**, mostly small and average-sized varied files, through representative operations and multi-step combinations.
4. Increase **file count**, individual file size, aggregate directory size, nesting depth, concurrency, provider diversity, and adverse conditions in separate measured stages.
5. Once API parity and tests are established, integrate **direct cloud sign-in**, cloud accounts and an easy right-click **Send to Cloud** path. This stage **must not require a Cloudflare account or Worker** from ordinary end users.
6. Only later build the **optional Worker-to-S3 endpoint** architecture for genuinely remote/cloud-to-cloud operations where compatible. Keep direct provider integrations first-class.

Codex must inspect actual code before implementation and keep the plan aligned to the existing Universal File API rather than speculating about its current maturity.

## 2. Python CLI and local fixture layout

```text
REDOWN-TEST-LAB/
  fixtures/                     immutable ~500 MB initial corpus
    empty/                      zero-byte files and empty directory cases
    text/                       txt, csv, json
    documents/                  pdf, docx
    images/                     png, jpg, gif, webp
    audio-video/                representative small/average media
    archives/                   zip, cbz, nested archive samples
    unicode-and-spaces/         unusual but valid names
    trees/                       shallow and deep hierarchy
    duplicates/                 identical content and filename collision cases
  runs/<run-id>/
    workspace/                  disposable copies only
    manifest.json               fixture identity, byte sizes, hashes
    scenario.json               exact inputs, seed and expected outcome
    journal.jsonl               append-only command/event log
    responses.jsonl             typed API receipts and errors
    verification.jsonl          independently measured postconditions
    summary.json                machine-readable run outcome
    summary.md                  human-readable report
    recovery.json               interrupted/pending operations
```

The runner must inventory immutable fixtures and SHA-256 them without reading the entire corpus into RAM. The 500 MB refers to **aggregate fixture bytes**, not a single 500 MB file; copies, workspace, and downloads increase disk space. Use a dedicated test cloud prefix/bucket. Never clean up or overwrite non-test files. Fixture manifest and run ownership provide cleanup constraints.

## 3. Bridge: Python orchestrates, REDOWN performs

Do not build Python's own parallel R2/Drive/Dropbox engine and accidentally test a different implementation. Python should call the **same Universal File API operation handlers and providers** exercised by Beta Explorer, through a narrow authenticated local bridge.

- **Control plane:** versioned JSON command/receipt/events over a suitable native host or loopback transport; match existing REDOWN architecture.
- **Data plane:** streams or chunked local file handles for large files; never shove hundreds of megabytes through one native-messaging JSON message. Keep path access scoped to an explicitly approved fixture/workspace directory.
- **Verification:** Python independently checks existence, counts, paths, source absence after Move, contents/hashes where needed, provider states and partial results; do not trust a mere 'accepted' or 'started' receipt.
- **Correlation:** run ID, command ID, attempt ID, idempotency key, provider request ID, sequence number, original input, expected state, terminal result, independent verification.
- **Persistence:** append-only journal, crash recovery, replay by seed and scenario, no irreversible blind retries, bounded memory, streaming diagnostics and progress.
- **Scope:** copy, rename, move, Cut/Paste semantics, duplicate, delete, mkdir, upload/download, folder traversal, bulk operations, collision strategies, archive and preview paths where supported. Flag missing operations instead of faking them.

CLI commands to design, not assume already implemented: `redown-lab inventory`, `redown-lab run --scenario ... --budget-minutes 40`, `redown-lab status`, `redown-lab replay <run-id> --scenario <id>`, `redown-lab report`, `redown-lab cleanup --run-id ...`. Prefer one implementation and thin entrypoints.

## 4. JSON protocol requirements and error model

Have Codex derive and publish a **normative JSON Schema** from actual runtime request/response contracts (versioned `schema_version`, schemas for command, per-item result, event, error, verification and summary), with tests for schema validity and examples. The committed companion JSON is an initial illustration only. Implement a stable machine-readable response surface:

- Status: `accepted`, `in_progress`, `completed`, `partial`, `failed`, `blocked`, `canceled`, `timed_out`, `uncertain`. Separate **provider status** from **verification verdict**.
- Codes: `OK`, `INVALID_REQUEST`, `SOURCE_NOT_FOUND`, `DESTINATION_EXISTS`, `AUTH_REQUIRED`, `AUTH_EXPIRED`, `AUTH_SCOPE_INSUFFICIENT`, `PROVIDER_UNAVAILABLE`, `RATE_LIMITED`, `UNSUPPORTED_OPERATION`, `SIZE_LIMIT_EXCEEDED`, `TIMEOUT`, `PARTIAL_TRANSFER`, `INTEGRITY_MISMATCH`, `CANCELED`, `INTERNAL_ERROR`; map existing REDOWN/provider codes carefully and avoid lossy translation.
- Each error contains `code`, `category`, human-readable `message`, `stage`, `retryable`, optional bounded `retry_after_seconds`, original HTTP/provider code where safe, item-level identity, actionable `suggested_action`, and diagnostic/correlation ID.
- Include run and operation timestamps, duration, bytes, count, retries, response/error, stdout or stderr/exit codes for CLI, independent observations, expected and actual postconditions, plus reproducible seed.
- Failures should remain machine-parsable and also produce short readable Markdown summaries. Redact bearer tokens, credentials, secrets, private content and sensitive URLs from reports.
- Document exactly what a success means for every operation, with independent checks. A failed verification overrides a successful provider receipt for the final test verdict.
- Each run exports structured summary JSON, event JSONL, verification JSONL and readable MD. Provide an explicit versioning/migration policy.

**Do not report 100% by excluding inconvenient tests.** Show passed/requested, failed, skipped, blocked, unverified and timed-out separately. Publish coverage against supported capabilities, with unsupported entries tracked as parity gaps.

## 5. 40-minute test window and OAuth behavior

Target a **40-minute maximum planned run window (2,400 seconds)**, with a soft stop around 38 minutes, enough time for checkpoints, in-flight reconciliation and reports. This is a throughput/run-scheduling preference, **not a reliable way to prevent OAuth token expiration**; token lifetimes vary and may be shorter.

Implement expiration-aware credential handling and resumable run journals:
- Acquire access only through provider-approved authorization. Refresh tokens when available and permitted, with minimal scopes; otherwise pause cleanly for interactive reauthorization and resume by saved run ID.
- Do not persist raw OAuth tokens in reports or source files. Respect revocation, token expiry, provider quota/rate limits and 429 retry guidance.
- If auth expires during a run, record `AUTH_EXPIRED` or `AUTH_REQUIRED`, preserve verified progress and receipts, and resume the incomplete work after authorization. Avoid replaying destructive operations without reconciling their actual outcome.
- Restrict each run to a bounded deadline, bounded concurrency, cost budgets and storage prefixes, with graceful stop and separate per-command deadlines.

## 6. Testing strategy: variety first, scale later

**Stage A: Functionality and diversity.** Approximately 500 MB total across small/average files, numerous extensions, zero-byte objects, ASCII/Unicode/space-heavy names, nested folders, duplicates and collision cases. Run each supported operation alone and in realistic sequences across local and R2 contexts. Examples: `mkdir→upload→rename→copy→move→download→hash-verify→delete`; `cut→paste→rename-back`; `bulk-copy→partial-conflict→retry→cleanup`.

**Stage B: File count.** Hold average size similar, increase from tens to hundreds, thousands and then larger batches; benchmark listing pagination, selection, memory, batching, error reporting, journal and cleanup costs.

**Stage C: Individual size.** Hold count low and grow through discovered boundaries to hundreds of MB and multi-GB files, testing streaming/multipart/range/resume rather than artificial buffers.

**Stage D: Aggregate size and providers.** Multi-GB corpora, concurrent workloads, folders, mixed providers and intentional interruptions, with provider quotas/cost accounting. Use coverage design such as pairwise combinations and deterministic randomized sequence generation instead of pretending to exhaust every permutation.

Publish a capability × operation × file size × file count × path depth × conflict mode × provider × transfer-direction matrix. A phase passes only when every required supported test in its published acceptance suite is independently verified. Failed conditions are not hidden.

## 7. Direct multicloud connection: easy new-user experience (no Cloudflare prerequisite)

After API parity and CLI qualification, provide supported connectors for selected cloud providers (candidate roadmap: Google Drive, Dropbox, OneDrive; choose actual launch list after provider API/OAuth research and capability audit). Make the **first onboarding path** simple:

1. User clicks **Connect cloud** and selects a provider.
2. REDOWN opens the provider's official OAuth authorization screen using authorization code + PKCE where supported, system browser or approved extension flow, explicit redirect URI and state verification.
3. User consents to the **minimal scopes** required for the selected operations; REDOWN completes the grant and stores credentials via an appropriate OS/browser secure mechanism.
4. User chooses a destination folder (and optional default). Show connection name, account and accessible scopes; offer Disconnect/Reconnect.
5. Once supported native/extension integration is installed, user right-clicks a local file and selects **Send to Cloud → Provider → Destination**, receiving progress and an independently checked completion. Include permissions and platform-specific setup clearly but avoid demanding Cloudflare setup.
6. Allow revocation, expired-token recovery, multiple accounts and accessible error messages. Keep provider API differences explicit (Drive uses its own file model, not an S3 bucket).

Credential handling must avoid exposing secrets to Python test reports, logs or web pages; scope native-host file access to authorized user selections, origin/extension ID and OS account, protect local bridge against arbitrary callers, and never use unauthenticated loopback endpoints for privileged file actions. Prefer established OAuth libraries and provider-supported flows to custom token exchange machinery.

**Authentication is provider-specific**. OAuth is not a universal replacement for S3 access credentials: some services provide OAuth API tokens, whereas S3-compatible endpoints commonly use endpoint URLs and signed requests/short-lived credentials. Define a pluggable credential interface without pretending every provider speaks the same auth protocol.

## 8. Later Worker-to-S3 remote phase

Only **after** direct provider connectors and local-to-cloud commands work, investigate an optional Cloudflare Worker that orchestrates **true remote S3-compatible transfers** where providers actually expose compatible S3 endpoints. This is not a replacement for direct Drive/Dropbox APIs.

- Define provider descriptor: endpoint, region, bucket, credentials reference, capabilities, multipart/range/stream support, metadata and checksums. Never hardcode secrets or embed long-term key material in a URL.
- Secure account linking and credential lifecycle; server-side secrets in the appropriate encrypted storage/secret manager, key rotation, least privilege, revocation, audit and per-tenant isolation.
- S3 requests should use appropriate signing and provider-supported auth, not assume OAuth bearer tokens work on S3 APIs. Workers must consider execution, body, memory, streaming and request limits; for large operations use durable resumable orchestration where required, rather than a single long Worker request.
- Provide explicit direction and transport reporting: local→cloud, cloud→local, cloudA→cloudB; prove cloud-to-cloud bytes flow remotely without quietly routing through the user's device.
- Build clear retry, multipart, per-part checksum/verification, conflicts, progress, cancellation, idempotency, cleanup and reconciliation. Keep shared Universal File API commands stable.
- Where no S3 compatibility exists, route through a direct provider adapter rather than claiming unsupported universal S3 integration.

## 9. Permanent deliverables Codex must produce

Before implementation Codex must inspect existing code and the Legacy/Beta audit and then create/update (use existing directories, avoid duplicating plans):
1. A versioned **normative JSON Schema** plus validated example request, success, partial and error envelopes; use the companion sample as a starting reference.
2. Python CLI bridge technical design, transport limits, auth boundary, filesystem scope, and exact Universal File API mapping.
3. Initial 500 MB fixture manifest format, corpus generator, scenario DSL, run journal and replay design.
4. Error-code taxonomy, response/event contract, verification and 100%-pass acceptance definition.
5. A phased performance/scale plan with 40-minute windows, auth lifecycle and resource budgets.
6. Direct provider OAuth/onboarding and right-click-to-cloud design without mandatory Cloudflare setup.
7. Separate optional Worker-to-S3 remote-transfer architecture, security and actual provider compatibility assessment.
8. A coverage matrix and versioned acceptance tests and CI checklist.
9. Links from `docs/beta/HANDOFF.md` and relevant `DO_NOT_REPEAT_MISTAKES/` index/roadmap, with maintenance instructions: update protocol, capabilities and test matrix in the same commit as changes.

## 10. Implementation boundaries and final request

**Immediate requested Codex work:** inspect current architecture, refine and commit the JSON protocol/schema and durable Markdown specification with code-grounded interfaces, issue/response codes and phased implementation plan. If the present Universal File API bridge already exists, characterize it accurately; otherwise label it PROPOSED. Do not announce implementation of Python/cloud connectors/Worker-to-S3 until those later phases are separately authorized.

**Next feature stage:** after parity baseline approval, implement the smallest viable Python CLI that drives actual existing Universal File API operations against the 500 MB *aggregate* fixture directory, with receipts and independent verification, then incrementally grow the suite.

**Final goal:** 100% independently verified results within a defined supported-operation acceptance suite, zero hidden/skipped failures, an expanding parity matrix, and a simple direct provider login + right-click upload experience that does not require ordinary users to understand Cloudflare. **Cloudflare Worker-to-S3 is an optional later remote orchestration capability, not a prerequisite to direct cloud login.**

**Deliver:** exact inspected commit, schema/docs links, current-vs-proposed status, highest-risk capability gaps, test evidence, and pushed commit SHA on `beta-explorer`.
