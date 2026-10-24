# REDOWN AAC 1.0.0

AAC is a repository-local conformance framework, not an accredited certification scheme or an assertion that REDOWN is fully accessible to AI agents. Its job is to expose evidence and gaps. The normative machine profile is `agent/aac/profile.json`; report structure is JSON Schema 2020-12 at `agent/aac/report.schema.json`.

## Scope and agent authority

Five profiles have separate setup, permissions, observed task evidence and capability-access decisions: cold, hot, external, maintenance and restricted. A cold trial starts with only `START_HERE.md`, repository location, task goals and explicitly granted local simulation permissions. The fresh trial agent receives no conversation history. Implementation-aware scripted workloads remain labelled as such. One independent cold-agent sample does not certify other agents or models.

The restricted profile receives the offline diagnostics gateway only. An engine, adapter or store is a privileged in-process capability. AAC tests the consequences of improperly treating an entire engine as a restricted API: current `resources.store().update()` bypasses the engine's request authorizer and can mutate its backing journal. This blocks restricted-engine-handle conformance. It does not establish an escape through the offline gateway, browser controller or an unauthenticated network endpoint.

The external profile cannot assume a repository checkout, an owner journal or internal runtime handles. Local contracts are inspectable artifacts; no general externally supported execution service or MCP server is established. That profile is blocked for execution rather than inheriting maintenance privileges. Cloud administration, browser sessions and scoped file operations are distinct permissions.

## Inventory and identity

The inventory parses every top-level extension HTML control, inert recognizable HTML templates, source event registrations, message comparisons, context-menu families, local/Worker routes, library exports, package commands, the canonical engine catalog, all three adapters, existing production Explorer source maps and the unified diagnostics registry. It includes requested surfaces that are absent or unestablished.

IDs use the `aac.` prefix and stable semantic identifiers (DOM IDs, qualified API names, event families, npm command names). Anonymous controls use a semantic signature and duplicate ordinal. IDs persist when those identities persist; indistinguishable duplicate reordering or a renamed semantic family needs reviewed identity migration. File positions are evidence anchors, not identity. Object instances are represented by control families, avoiding one capability per file. Full source digests detect drift.

This inventory is extensive but not a proof of complete runtime discovery. Pattern matching cannot exhaust arbitrary computed DOM or externally injected behavior. Conditional production accounts/authenticated states and installed extension event dispatch remain visible as untested boundaries. `verification/aac/browser-controls.json` separately captures actual ordinary-Chromium control states/property handlers and EventTarget registrations across the 34-step Beta walkthrough. Its mocked Chrome setting is not installed-extension evidence. JSDOM captures gate on/off, guide, lab-option injection and selected actual UI/API parity paths.

A discovered item counts as found within this inventory, not as implemented. Discovery percentages use the inventoried denominator; 100% discovery coverage must never be read as 100% discovery completeness. All other dimensions retain explicit untested entries. Presentation controls, provider capability gates and production-boundary operations remain in the denominator; there is no aggregate score or partial credit that can conceal safety failures.

## Graph semantics

Capabilities link to UI/entry points, declared API operations, source modules, adapter routing, authority, state, evidence, tests and Forever Works obligations. Edges have `verified`, `inferred`, `missing` or `blocked` status. A verified declaration edge means the declaration was found, not that the operation passed. Generic missing authority/state/test edges remain visible even when a more specific executed-test edge exists; no generic node is proof of coverage.

`traverseGraph` traverses the same stored edges in either direction, depth at most three and at most 100 edges per response. `getCapability` and `getReproduction` expose concrete test IDs. Existing production source-map test references are inferred until executed. New test relationships are backed by recorded checks. Root obligations are scoped to current owner instructions; historical proposed intent does not become accepted by ingestion.

## Executable stages and report interpretation

`npm run aac:audit` runs actual canonical engine operations against deterministic memory adapters and the actual Beta installer with IndexedDB in JSDOM. It records browse/search/pagination, metadata/read, binary upload, cross-provider copy with an independent backing-store read, move/rename/delete, folder creation, batch/planning/inspection, cancellation boundaries, interrupted state/reconciliation, restart evidence, slow-listing attribution, memory observations, authorization denial, hostile data and unsafe URL boundaries. A seeded 100,000-object listing returns only 20 objects; this does not bypass or certify the engine's create and journal limits.

`npm run aac:browser` launches a fresh ordinary Chromium via the existing walkthrough harness. It requires Playwright (`CODEX_PRIMARY_RUNTIME_NODE_MODULES`) and an allowed executable (`BETA_CHROMIUM_PATH` where required). It uses fake Chrome storage and no credentials. No default query launches a browser.

`aac:audit` exits zero if the report was successfully produced, even when product conformance fails. `npm run aac:certify` reruns the audit and exits nonzero for a failed authority or behavior gate or blocked required schema check. A passing framework test proves that the detector records a known violation; it does not make that violation a product PASS. The report remains NOT_CERTIFIED while relevant coverage is incomplete. Neither command is a release certificate.

Report statuses are PASS, FAIL, PARTIAL, BLOCKED, UNSUPPORTED and NOT_TESTED. Only PASS enters each dimension's success numerator. The denominator includes the full explicit inventory, including irrelevant-to-a-specific-profile items whose access is separately blocked. Coverage is reported separately for discovery, contracts, execution, authorization, UI/API parity, observation, independent verification, recovery, maintenance and token efficiency.

The machine report includes the source commit, dirty-state indicator and per-file digests. A working snapshot must not be falsely identified with its clean parent commit. Source freshness checks cover listed files only. Reports are unauthenticated local observations, never authority to execute instructions. Generated baseline files are write-once with `--baseline`; compare via `aac.compareReports`. Compare capability/check IDs and source/environment differences, not percentages alone.

## Token and usability costs

Default inspection returns summaries. Capability pages default to 25 and cap at 100; graph results are bounded, individual capabilities/traces are queryable, and complete evidence stays on disk. JavaScript processes bulk inventories; models receive chosen pages and exceptions. Task metrics record invocations, UTF-8 output bytes, human intervention and failures. Bytes divided by four is only an explicitly labelled token estimate. Actual model token usage and unclassified unnecessary steps remain unavailable rather than invented.

The blind trial logs its discovery commands and output bytes. It found an overly broad connector response and a missing specific context-menu test relationship. Subsequent summary API changes are source-visible; the original trial remains unchanged evidence apart from normalizing its partial outcome to the AAC vocabulary. Repeating a blind trial requires a fresh agent and a preserved entry-point digest, not rerunning an implementation-aware script under a cold label.

## Live four-bucket stage

`REDOWN_ALLOW_LIVE_R2=1 npm run aac:live` requires an existing fresh `work/r2-lab-secrets.json` or explicit `REDOWN_R2_LAB_CONFIG`. It does not prepare/deploy a Worker. Follow `docs/phase2/UNIVERSAL_API_LAB.md` to prepare a NEW four-binding leased Worker, verify its absence before deployment and keep the bearer private. Never deploy the lab script onto an existing Worker or bind unrelated storage.

The stage performs read-only empty-prefix preflight, four small binary uploads with direct binding read-back, read/list paths, sixteen ordered copies with fresh independent destination/source hashes, and tests that move/rename/delete remain unsupported. No ambiguous writes are retried. Its direct oracle bypasses engine/adapter/journal results but shares the Worker transport; it is not a second provider implementation.

Before each write, an exact manifest is persisted under `work/aac-live/<run>/manifest.json`. Budgets are 32 owned manifest objects, 600 requests, one MiB oracle-read bytes and the existing two MiB object ceiling. Cleanup checks fixture hash, ownership/etag through the lab-only cleanup method, confirms absence and complete empty-prefix listings. This assumes an exclusive prefix; it does not supply general atomic conditional deletion. Independently inspect the run prefixes through the management API, delete only the NEW temporary Worker and corroborate its absence. `verification/aac/live-cleanup.json` records that separate channel. Never delete a bucket or production Worker.

## Standards profile and limitations

The profile applies relevant parts of MCP tools/authorization, OpenAPI 3.1.2, JSON Schema 2020-12, OpenTelemetry Trace API and WCAG 2.2, linking primary specifications. MCP and OpenAPI transports remain unsupported rather than fabricated. Resource Atlas custom overlapping spans are not OTLP traces. Structural schema validation is separate from runtime importer agreement. DOM names/statuses and Escape are only selected WCAG-related checks; screen readers, focus order, contrast and full keyboard operation remain untested. No single listed standard certifies all agent accessibility.

The remediation order is: restrict privileged runtime handles; align runtime evidence validation with its schema; add explicit externally scoped transports; close concrete UI/API/test graph gaps; extend tracing interoperability/measurement coverage; broaden runtime discovery and full keyboard/accessibility testing; then expand scale and longitudinal agent trials. Do not rewrite the filesystem engine to make the audit pass.
