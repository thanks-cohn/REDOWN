# REDOWN reliability foundation

Start here before adding another feature. The current unified inspection contract and cold-start workflow are in [UNIFIED_AGENT_API.md](UNIFIED_AGENT_API.md). Baseline main: `e91b268107fa4b86aa96bd115aebb4cf0e16f8d9`.
This milestone improves repeatability and investigation; it does not certify worldwide scale, installed Chrome or live transfers.

## One diagnostic entrance

```sh
npm run diagnostics -- describe
npm run diagnostics -- getProjectMap
npm run diagnostics -- explainOperation --input '{"name":"move"}'
npm run diagnostics -- inspectFailure --input '{"code":"EXPLORER_PERMISSION_DENIED"}'
npm run diagnostics -- getTestPlan --input '{"preset":"transfers"}'
npm run diagnostics -- getOperationTrace --input '{"id":"operation-id"}' --bundle /path/to/reviewed-redacted-bundle.json
npm run diagnostics -- getVerificationStatus
npm run diagnostics -- getReleaseReadiness
```

`agent/diagnostics` is an offline facade routing all five existing inspection APIs through the single namespace/ownership registry. It does not replace frozen project/debug/semantic contracts, execute tests, inspect browser data or contact providers. Project knowledge and imported runtime evidence stay distinct. The subsystem map includes core Explorer, auth, ingest, destinations, bridge, Worker and packaging entry points with explicit coverage gaps; it is not an exhaustive call graph. Legacy namespaces retain their own discovery/version contracts.

Queries return diagnosticApiVersion1.2.0, state, scope and data/error. Unknown operations/arguments fail closed. CLI input is bounded; bundles are bounded at256KiB and re-sanitized by the existing Explorer collector. Returned values are copied. Error paths do not echo supplied tokens or malformed bundles. Trace IDs and failure codes route to existing Explorer queries, with an explicit missing-runtime-evidence boundary when no bundle was supplied. Unknown failure codes are unavailable, not a guessed diagnosis.

Verification-report inspection reads only the fixed local `work/reliability/latest.json`, bounds its size, validates repository paths and rejects traversal/outside-root realpaths. It compares hashes for recorded source files. Its `partial` result never certifies a release: local reports are unauthenticated, omitted/untracked sources and live behavior are not established. Rerun after source changes. Results from the older recorded release-gates file are labelled historical requirements, not freshly executed passes.

## Repeatable verification

```sh
npm ci --no-audit --no-fund
npm run reliability:check
npm run reliability:release
```

The explicit runner executes syntax checks, current Explorer architecture validation, gateway registry validation, issue-inventory validation and every tests/*.test.mjs file. It never launches a browser, uses credentials, runs a user-supplied command or mutates cloud resources. Its source inventory records per-file SHA-256, a combined digest, local HEAD and tracked-dirty state for tracked extension/agent/scripts/tests/schemas/local/worker/CI/package sources. This is a scoped source fingerprint, not a full repository tree or a signed attestation. New files must be tracked to appear in that inventory.

The Node event reporter emits test file/name, outcome and exception type/code/operator, rather than arbitrary error bodies. `regression-baseline.json` records the seven known historical failures with reasons. CI accepts only those exact file/name/failure-type combinations as visible debt. Unexpected/changed failures, missing baseline tests, skipped/todo tests, duplicate failure identities, inconsistent exits, execution errors and timeouts fail the gate. Resolved baseline assertions are reported; they are not required to keep failing. Never refresh frozen historical source hashes to satisfy a test.

Exit0 from reliability:check means **no new regression was detected**, not all tests passed. Seven known failures produce state:partial. The report retains those failures, actual counts, stage outputs, source fingerprint and recorded release blockers. `--strict` always returns nonzero while external browser/cloud/package acceptance remains unimplemented; it cannot turn simulated tests into a release certificate. This limitation is deliberate and explicit, rather than silently skipping live gates.

CI runs the local regression ratchet on Node22 and24, uploads its report even on failures, and separately validates runtime/Explorer schemas with a pinned JSON Schema dependency. CI execution itself is not claimed until GitHub Actions runs it. The packaging workflow now uses the existing explicit allowlist/integrity packager and labels its output **audit-only, not release-certified**, including per-file/ZIP hashes and the existing license-drift blocker. It no longer blindly zips the whole extension directory as an apparent release artifact. Existing licenses are preserved.

## Next acceptance work

1. Provide an administrator-approved installed-extension test environment. Do not bypass the existing unpacked-install policy. Exercise the exact audit package: context menus, public URL activation/cancel/copy, preview/navigation, and actual Downloads events.
2. Reproduce cross-bucket Copy/Move with disposable authorized fixtures and correlate source/destination Worker evidence. The existing Copy404 incident remains open. Probe success alone is not a successful transfer.
3. Add real-session expiry/restart/soak evidence and durable operation recovery. Inspect ambiguous writes before retry; verify destination before source deletion.
4. Resolve historical evidence/removed-handle assertions through explicit maintenance decisions, plus the root/bundled license mismatch. No test/assertion was disabled in this milestone.
5. Expand operation contracts and trace completeness through upload/ingest and native destinations; add fault fixtures for each missing completion boundary. Each new provider must advertise its real capabilities and gaps.

For each feature, update the relevant operation/message contract, redacted diagnostic evidence, failure code/recovery guidance, current architecture and a meaningful regression. Record mock versus browser versus live verification separately. Keep ordinary product flows simple; do not expose this machinery as mandatory user steps.


## Verification of this milestone — 22 October 2026

Local Node24.19.0: **305 tests / 298 pass / 7 known historical failures / 0 new failures / 0 skipped**. Syntax and current Explorer architecture checks pass. Seven new foundation tests cover failure ratcheting, incomplete/timeout/skipped/duplicate runs, namespace discovery, contract/trace routing, current subsystem references, CLI input privacy and report boundaries. Runtime schemas: two schemas, five responses and one bundle pass; oversized bundle rejected. Explorer schemas: two schemas and17 simulated bundles pass; unsafe fields rejected. Both workflow YAML files parse locally.

The combined verification report has state:partial and release:blocked. It records164 tracked source files, their hashes and the combined fingerprint. The subsequent API query reports recorded-files-match with no changed-source findings. See [local report](verification/local.json). The audit package passes its34-file allowlist/ZIP integrity checks and preserves license drift; see [package record](verification/package-audit.json). No installed-browser, live-provider, Node22 or remote CI pass is claimed by these local results. No cloud state was changed.


Current follow-up: [portable checks and current issue triage](ISSUE_INVENTORY.md). Query `npm run diagnostics -- listIssues` and `npm run diagnostics -- validateIssues`. The new assessment overlay preserves original history and automatically marks changed evidence as needing revalidation. Standardized, proven and dependable components take priority over new frameworks.
