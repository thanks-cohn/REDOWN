# REDOWN: Evidence-First Reliability Foundation and Live Write Failure Resolution

**Status:** mandatory Codex implementation assignment, NOT a claim of completion
**Repository:** `thanks-cohn/REDOWN`
**Starting point:** latest `main` (`d768294b64cf323d5ef7183f408dadd06e095a7f` at assignment creation); also inspect `fix/python-lab-connection-lifecycle` (`7321381031e901d3e843182bfd283fc9c48bf10c`) and preserve its corrections.
**Owner's objective:** exemplary engineering foundations for an agent-native, provider-independent universal filesystem. Highest available practical standards, verified rather than asserted. Solve the current live write failure and make future failures explainable by the software itself.

## NON-NEGOTIABLE EXECUTION ORDER

**P0: Forensic investigation of the actual write failure.** Do not expand to 2 MiB, implement new providers, or redesign the GUI first.

**P1: Prove and repair the true root cause, preserve original evidence, perform a safely authorized live acceptance test if possible.** If deployment access or local Windows Chrome approval is unavailable, produce executable owner-side probes to obtain missing decisive evidence, and say `UNPROVEN` instead of guessing.

**P2: Make diagnostic completeness and fault isolation an enforceable platform contract across all layers and providers, with tests that fail when errors are flattened or mutation uncertainty is concealed.**

**P3: Integrate with Resource Atlas, AAC, Forever Works, Python SDK/CLI, extension/native bridge and CI; document precisely what was changed, verified, and not verified.**

This is an implementation task, not a research-only memo. Avoid expanding scope before closing the live failure or clearly identifying the single inaccessible observation preventing closure. Keep a usable patch small enough to verify; stage larger architecture under tests and explicit gates.

## Known, original live evidence (preserve verbatim in incident records)

Owner's Windows 11 / Python 3.14.7 / Chrome REDOWN environment:
- `redown-client 0.5.0`, then connection-repair branch installed as `0.5.1`; extension was reported as `0.5.26` before repair.
- Native Messaging host registration succeeded with extension ID `mkadkgpekmkknfbniacdlmgikihjjepf`.
- Initial CLI test: `EXTENSION_DISCONNECTED`, six `BLOCKED`, zero dispatched.
- After connection-lifecycle fixes, CLI pairing succeeded; `connectionError: null`, `dispatchedOperations: 3`; `list: PASS`; eight-byte `hello.bin` upload `FAIL PROVIDER_ERROR`; directory marker (`mkdir`) `FAIL PROVIDER_ERROR`; dependent read/metadata/copy `BLOCKED UPLOAD_NOT_VERIFIED`; zero verified files and bytes.
- Operation IDs upload `f1447436-1a64-4798-a134-e86e61b0aa8c`, mkdir `876c6026-8bce-4786-abf7-74935cbca860`. Provider spans approximately 142.5 ms and 139.9 ms respectively. Both reached execution and failed; no provider-native reason survived in JSON.
- The existing `test-1-new` bucket contains a pre-existing `hello bucket.txt`, which must NOT be modified. No test-uploaded `hello.bin` was visible to the owner.
- **The cause of `PROVIDER_ERROR` is NOT YET KNOWN.** Outdated/misconfigured Worker and loss of exception codes across layers are hypotheses, not findings.
- Existing code uses `extension/lab-worker.mjs` to verify saved Worker identity, OAuth Worker settings/binding and deployed conditional-create capability before making a protected Worker request. Reads and listing do not exercise all the same write dependencies.
- Local simulated tests and source inspection alone do not establish deployed-Worker behavior.

Capture original commands, timestamps, reports, evidence IDs and snapshots in a permanent incident. Never rewrite past observations as a success after repair.

## I. FORCED ROOT-CAUSE INVESTIGATION (prove, don't infer)

1. Read `AGENTS.md`, Phase 2.6-2.8 records, the connection repair branch, Forever Works/AAC constraints, and current tests. Identify exact installed/deployed version distinctions.
2. Trace and instrument *each trust/execution boundary*:
   Python CLI/GUI -> loopback -> native host -> extension background -> scoped session -> canonical API/coordinator -> R2 provider adapter -> `laboratoryCreate` -> Cloudflare Workers control API/worker endpoint -> Worker R2 binding -> object store.
3. Inspect where `PROVIDER_ERROR` is created or substituted. Follow thrown object shapes, `error.code`, serialization, promise rejection, job journal, evidence projection and Python report. Identify the first boundary that loses a more specific cause; prove with regression tests.
4. Check whether Cloudflare `/workers/scripts/{name}/settings` and `/workers/subdomain` requests are working for the selected account and actual deployed script; validate the *current remote Worker*, routing and `STORAGE` bucket binding, not only checked-in source.
5. Check actual capability response: `labConditionalCreate`, expected version, `storageBound`, `labMaxBytes`; distinguish unsupported endpoint, 401/403/404/409/429/5xx, DNS/TLS/network failures, non-JSON responses, CSP restrictions and unexpected shape. Capture safe HTTP status and provider correlation headers where available.
6. Determine separately whether preflight failed before write submission, a write was definitively rejected, a write was accepted but verification failed, or a write outcome is unknown. Never infer absence of object solely from a generic error.
7. Compare `upload` and `mkdir` paths to find their common failing boundary; verify how the extension's saved profile, auth token and Worker URL are obtained and matched. Do not claim a specific failure from coincident timing alone.
8. If the actual cloud deployment is inaccessible, deliver `doctor` probes that run inside the owner's *authorized existing extension session*, without exposing tokens or requiring raw manual browser console snippets. Probe output must include the decisive missing result. Document exact remaining access boundary. No uncontrolled cloud mutation.
9. Finish with a causal conclusion, evidence chain and confidence; if a conclusion remains unproven, explicitly record the precise experiment required. Never call a set of guesses a definitive answer.

## II. REPAIR AND LIVE ACCEPTANCE

- Fix the proven original defect, not merely its surface symptom. Minimize changes and preserve provider-independent API and read-only fallback.
- Deployment/Worker repair must be explicitly scoped to the owner-selected test Worker and bucket. **Do not deploy or modify the owner's live cloud resources without explicit authorization.** Do not repair unrelated Workers, buckets or permissions.
- Re-run the eight-byte immutable test using a fresh, owner-authorized run namespace and separate write permission; guard against ambiguous duplicates/replays and overwrite. Independently check object bytes and SHA-256 through a second read route or dashboard download when available.
- Confirm the `hello bucket.txt` pre-existing object is unchanged. No deletion unless separately explicitly approved and conditional safety verified.
- If no live Chrome/R2 access: provide one copy/paste Windows command that produces an actionable, redacted doctor JSON and an eight-byte smoke report. A lack of real-world acceptance must remain `NOT_TESTED`.
- Never equate `Worker deployed`, `capability advertised`, `request accepted`, `object exists`, and `bytes verified`; these are distinct evidence levels.

## III. THE REDOWN RELIABILITY / OBSERVABILITY STANDARD

Reference modern, official OpenTelemetry (OTel) specs and semantic conventions, W3C Trace Context, and Google SRE reliability practices. Adapt to browser extension/native-host/Worker constraints. **Do not claim merely recording custom spans makes the system OTel-compliant.** Either implement true compatible export/context propagation where feasible or mark compatibility gaps and build an incremental interoperability adapter.

Adopt all SIX complementary disciplines, each with acceptance tests:
1. **Distributed traces:** correlated end-to-end span context and clock-aware timeline across Python, native host, Chrome, coordinator, Worker and provider boundaries; W3C `traceparent` when applicable. No sensitive tokens in baggage/traces.
2. **Structured logs/errors:** machine-parseable severity, component, stage, canonical category, origin, safe provider-native reason, causal chain, correlation, timestamps, recovery and data-sensitivity classification. Log rejection before generic wrapping. Never log credentials, object data or user secrets.
3. **Metrics:** latency distribution, attempted/successful/failed/indeterminate operations, bytes, throughput, queue depth, retries, memory, saturation. Favor Google SRE's latency, traffic, errors and saturation; distinguish service errors from user/provider denials. Low-cardinality aggregations, no per-file path labels or unbounded IDs.
4. **Health and capability checks:** interrogate actual running components, deployment version, binding/identity, permissions and read/write feature readiness. Health check must not mutate. Explicitly report unknowns, partial readiness and stale configuration.
5. **Independent verification:** hash readback and compare persisted object bytes for success claims; distinguish request submission, acknowledgement, persisted state, verification and uncertain outcome. ETag is not assumed SHA-256.
6. **Reproducible diagnostics:** first-class Doctor and self-contained redacted evidence bundle; deterministic injected-fault scenarios, cross-version reproducibility, one-command local probes, permanent incident reproduction instructions.

### Mandatory versioned diagnostic envelope

Design `redown.diagnostic.v1` (schema + negative controls) as a standard shared by all provider adapters and transport boundaries. Compatible additive fields may include:

- `schemaVersion`, `eventId`, `timestamp`, `traceId`, `spanId`, `parentSpanId`, `operationId`, `idempotencyKeyHash`.
- `component`, `stage`, `operation`, `provider` (when safely disclosed), `severity`, `outcome`.
- `code` universal stable category, `nativeCode` and safe provider status, `origin`, `causes` preserving structured nesting, and optional sanitized provider request IDs.
- `authorizationState`, `capabilityState`, `deploymentVersion`, `credentialState` only as booleans/states, never secrets.
- `mutationPhase` one of `NOT_SUBMITTED`, `SUBMITTED_REJECTED`, `ACKNOWLEDGED_UNVERIFIED`, `VERIFIED`, `INDETERMINATE`; `retrySafety` one of `SAFE_WITH_FRESH_ID`, `RECONCILE_FIRST`, `DO_NOT_RETRY`, `UNKNOWN`.
- `evidenceRefs`, `actionableRecovery`, `confidence`, `missingEvidence`, `redactionVersion`.

Specify invariants, bounded size, schema validation, backwards compatibility, ordering, safe provider code allowlists, provenance and serialization. Never turn a known specific cause into generic `PROVIDER_ERROR` at another layer. Never fabricate fields, claim submission occurred when preflight failed, or infer safe retries from an exception alone. If even the error envelope cannot be carried, return a typed `DIAGNOSTICS_LOST` with boundary evidence.

### Provider independence and privacy

- Define a core error taxonomy and adapter extension mechanism supporting Cloudflare R2 and future Google Drive, Dropbox, OneDrive, local filesystem and S3-compatible providers without rewriting Doctor, SDK or diagnostics.
- Enforce boundary tests from provider-native error to Resource Atlas -> native messaging -> Python -> JSON/Markdown report, verifying original safe cause and IDs survive.
- Make telemetry useful **offline, locally and without any cloud telemetry account**. Optional exporter/integration must be opt-in; no mandatory monitoring service, secrets export or unexpected outbound logging.
- Bound memory/disk retention, support explicit export and data minimization. Require redaction/adversarial tests against tokens, authorization headers, full object keys and private content.
- Model partial and stale evidence explicitly, not as success.

## IV. PROGRAMMATIC DOCTOR, NOT ANOTHER GUI WORKAROUND

Provide a stable CLI such as `python -m redown.lab doctor --operation upload --report redown-doctor.json`, with read-only default, and an exact schema. Doctor should:
- Obtain current capability and authorized scope through the normal extension bridge.
- Inspect the actual selected R2 Worker identity, deployed capability response, bucket binding and version; distinguish verified, contradicted, blocked and unobservable checks.
- Never need new Cloudflare tokens, direct S3 credentials or separate Python provider code.
- Provide a stage-by-stage result, decisive root cause if proven, sanitized native diagnostic response, missing evidence and a concrete next action.
- Optional mutation probe requires explicit write approval and isolated unique run namespace; never overwrites/deletes pre-existing data.
- Exit codes must distinguish healthy, fail, blocked, indeterminate and unsupported; output useful on failure and disconnect.
- Provide reproducible integration into Resource Atlas and the broader agent API, not a one-off R2-only CLI.
- Avoid GUI dependency; fix is testable and actionable on Windows from PowerShell.

## V. TESTING MUST EXERCISE ERRORS, NOT ONLY HAPPY PATHS

Build a fault injection matrix with **at least**:
- Missing or stale Worker; bad host; wrong account/binding/jurisdiction; missing Worker capability; revoked permission; incorrect profile.
- Worker/control API 401, 403, 404, 409, 429, 500/503; network/TLS failures; timeout; malformed/non-JSON payload; declared-size mismatch.
- Native host failure, dropped connection, pairing rejection/timeout, expired OAuth and extension reload.
- Conditional create conflict; accepted write/lost acknowledgement; readback hash mismatch; stale idempotency journal; source changed.
- Logs/trace/diagnostic propagation and redaction at every boundary, including empty/partial/unknown outcomes.
- Successful small-file creation and independent readback against an injected provider, then clearly labeled owner-run *live* R2 acceptance.

Use table-driven contract tests, property-based/fuzz tests where suitable, error mutation/negative controls, cross-provider fake adapters, CI quality gates, and version/schema compatibility tests. Test faults not only code branches. Do not suppress pre-existing failures. Track baseline nine Node failures separately and preserve causal evidence. Do not rewrite frozen Forever Works obligations.

## VI. FAILURE-FIRST DEFINITION OF DONE (a CI/review gate)

No new filesystem operation or provider adapter can be called complete unless:
- It has positive and negative contractual tests and an error/cause-preservation test;
- It is observable at all important boundaries;
- It advertises only actually implemented capabilities and verifies deployment readiness independently;
- Mutation state and retry safety are explicit, with independent verification before declaring success;
- It produces an agent-readable Doctor/report for blocked, failed and uncertain operations;
- Its documented manual live acceptance is recorded honestly, with **NOT_TESTED** until executed;
- Its regression suite passes or exact inherited failure debt is reported without hiding new failures;
- An unfamiliar agent can use the evidence to reproduce, understand and repair a failure without relying on developer memory.

Add automated CI checks and Forever Works/AAC obligations reflecting this contract. Implement a `Diagnostic Evidence Completeness` check that fails on missing known error provenance, uncategorized generic error where native cause existed, false verified outcome, missing key lifecycle states or leaked secrets. Do not create vanity percentages; track proven coverage per boundary/scenario.

## VII. INCIDENT AND DOCUMENTATION

Create/update `FOREVER_WORKS/bugs/FW-REDOWN-LIVE-R2-WRITE-PROVIDER-ERROR-20261025.md`.
Include original owner evidence; impact; timeline; distinct known/hypothesized facts; investigation probes and results; *proven* root cause or precise remaining unknown; original diagnostic information-loss mechanism; repairs with linked commits/changed files; security effects; verified tests; deployed/live acceptance state; rollback; runbook; and guardrail tests preventing recurrence.
Create a permanent `docs/architecture/REDOWN_DIAGNOSTIC_STANDARD.md`, schema and concise operator runbook. Link them from `AGENTS.md` and Forever Works, without overwriting historical documentation.

## VIII. DELIVERY AND REPO WORKFLOW

- Inspect latest `main` and existing connection repair branch; do not lose or duplicate its work. Create a fresh feature branch from the appropriate clean source.
- Prioritize functional P0/P1 bug closure and Doctor before broad refactoring. Commit incremental verified milestones; preserve untouched existing functionality and never delete unrelated owner files.
- Run Python, extension/native, provider contracts, Resource Atlas, AAC, Forever Works and full regression tests. Record command and outcome, including limitations.
- Do not merge automatically while root cause is unresolved, diagnostic evidence is inadequate or acceptance/security checks fail. If sufficiently proven and all applicable gates pass, provide an explicit reviewable PR; owner decides merge.
- No unauthorized Cloudflare deployments, bucket modifications or public release.
- Final response: **root cause (or precisely what still makes it unknowable), evidence, concrete repair, why old diagnostics failed, new Doctor output example grounded in tests, passing/failing tests, commit SHA, PR/branch, exact Windows commands and live verification procedure**.
- Be realistic: no agent can guarantee no future bugs. The intended standard is rapid, evidence-backed localization, safe recovery, predictable test gates and no false claims of reliability.

## Primary external references

- OpenTelemetry specification: https://opentelemetry.io/docs/specs/otel/
- OTel context propagation: https://opentelemetry.io/docs/concepts/context-propagation/
- OTel semantic conventions: https://opentelemetry.io/docs/specs/semconv/
- Google SRE monitoring (four golden signals): https://sre.google/sre-book/monitoring-distributed-systems/
- Google SRE troubleshooting, postmortems and incident practice: https://sre.google/sre-book/part-III-practices/

Treat these as standards and guidance to critically map to REDOWN's extension/Worker/agent model, not substitutes for proving live behavior.
