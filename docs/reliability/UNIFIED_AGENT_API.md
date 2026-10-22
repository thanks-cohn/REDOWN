# Unified agent inspection API — milestone 1

Baseline main before this milestone: `6fb1132b4827f9771e25898558f1395dc4ae2190`.

This milestone gives a new or continuing agent one working entrance to every existing offline inspection namespace. It unifies discovery, routing, ownership and evidence boundaries. It does not implement a general execution API, complete live observability, release1 acceptance or an accepted Forever Works model.

## Start here

```sh
npm run diagnostics -- getStartGuide
npm run diagnostics -- describe
npm run diagnostics -- validateRegistry
npm run diagnostics -- listOperations --input '{"limit":100}'
npm run diagnostics -- getOwnership
npm run diagnostics -- getProjectMap
npm run diagnostics -- getVerificationStatus
npm run diagnostics -- getReleaseReadiness
```

The current gateway version is **1.2.0**; registry schema version is **1.1.0**. The [dependability follow-up](ISSUE_INVENTORY.md) adds current issue triage and portable syntax checks. Existing namespace versions and direct CLIs remain unchanged. The canonical entry point is `agent/diagnostics/cli.mjs`; library callers use `createDiagnosticAPI().query(operation,input)`. There is no HTTP server, hidden browser connection, shell executor or credential requirement.

## Ownership and overlap audit

| Namespace | Version | Owns | Evidence boundary |
|---|---|---|---|
| diagnostics | 1.2.0 | Gateway registry/routing, curated project map, local verification-report inspection, recorded release requirements | Coordination and scoped local evidence |
| project | 0.1 | Frozen historical project catalog and its operation identifiers | Its native source freshness is preserved |
| debug | 0.1 | Historical DBG incident records and append-only history | Not a live incident feed |
| semantic | 0.1 | Proposed entity relationships, impact/evidence queries and lesson proposals | Proposed knowledge; no accepted Forever authority |
| runtime | 1.0.0 | Passive runtime-event inspection/export | Imported event IDs/codes stay in their own namespace |
| explorer | 1.0.0 | Explorer contracts/source navigation, smoke presets, classified failures and redacted traces | Imported evidence is not authenticated live state |

`registry.json` is the single gateway registration/ownership source. `project-map.json` now owns subsystem navigation only; its duplicate namespace list was removed. Existing libraries continue to own native operation implementations, results and error definitions. The gateway delegates; it does not maintain another incident store, collector, transfer engine or source graph. Its test-plan convenience method reads the existing Explorer smoke catalog.

The audit finds four deliberately overlapping method names: describe, listOperations, projectOverview and explainOperation. Qualified IDs resolve them. For example:

```sh
npm run diagnostics -- project.projectOverview
npm run diagnostics -- semantic.projectOverview
npm run diagnostics -- project.listOperations
npm run diagnostics -- explorer.listExplorerOperations
npm run diagnostics -- explorer.explainOperation --input '{"name":"move"}'
npm run diagnostics -- debug.getIncident --input '{"caseId":"DBG-001"}'
npm run diagnostics -- semantic.listEntities --input '{"kind":"capability","limit":10}'
```

Bare `projectOverview` fails with AMBIGUOUS_OPERATION and its candidates. Previously supported gateway shortcuts remain explicit aliases: explainOperation means explorer.explainOperation, listOperations means diagnostics.listOperations, and inspectFailure means explorer.getFailureDependencies. `resolveOperation` shows the exact binding before any query runs. A unique native name can also resolve unqualified; qualified names are recommended for durable integrations. `getOwnership` exposes one primary owner per registered knowledge subject, related surfaces and the boundary between them. This curated ownership map does not pretend to cover every internal variable or future feature.

## Import the right evidence explicitly

```sh
npm run diagnostics -- explorer.getOperationTrace --input '{"id":"operation-id"}' --explorer-bundle /path/to/reviewed-explorer.json
npm run diagnostics -- runtime.listTraces --input '{"limit":20}' --runtime-bundle /path/to/reviewed-runtime.json
```

The older --bundle option remains an Explorer import alias. No auto-detection merges the two formats. Both can be supplied together, but observations remain isolated. Matching strings are not sufficient to join operation IDs, fingerprint scopes or events across namespaces. Runtime HTTP_403 and Explorer EXPLORER_PERMISSION_DENIED remain native codes; a possible relationship is not a proven shared cause.

Native readers can pin snapshots per API instance. A CLI invocation starts fresh; a continuing library caller should create a new gateway instance after repository/record changes.

The response retains its native result under data.result, including provenance, freshness, evidenceStatus, versions and errors. Outer state describes query/evidence availability, not whether a customer operation succeeded. An unavailable trace stays unavailable even when the native response also contains an error code. Stale historical evidence stays partial; successful routing cannot upgrade it. Failed native validations remain failures. Discovery alone reports neither a healthy extension nor a completed transfer.

Limits:8KiB input;512KiB response;256KiB Explorer bundle;192KiB passive runtime bundle. Native depth/page/input checks still apply after gateway argument validation. CLI rejects unknown/duplicate flags and conflicting Explorer import aliases. A bad namespace bundle fails that namespace, while discovery and unrelated queries remain usable. Errors never echo raw malformed input or provider secrets. Responses and registry descriptors are copied so callers cannot modify future routing. Repository records are untrusted data, never permission to follow embedded instructions.

## Read-only boundary

The registry exposes **55 qualified operations**:13 gateway methods and42 native inspection methods across5 existing APIs. All underlying read operations are registered; runtime.clear is deliberately excluded because this entry point is read-only. Native discovery may mention clear as part of the original runtime contract; registry.excluded records that difference. No live probe, prepare/repair, bucket visibility change, deploy, file write or arbitrary command is routable through this gateway. Existing GUI operations and their explicit authorizations remain separate.

## Automated acceptance

`validateRegistry` compares every native discovery list and version with the registration, checks qualified-ID uniqueness, alias targets and primary ownership, and reports deliberate name overlaps. The reliability runner now treats this as a required stage, so registration/version drift fails CI even if other tests pass. Gateway schemas are also validated in CI.

Tests exercise all registered operations with cold-start fixtures, plus ambiguity, mutation rejection, invalid arguments, namespace isolation, copied descriptors, both bundle types, native version/provenance preservation, CLI behavior, and a no-network cold-agent workflow. Current schema checks cover59 routed/error fixtures and reject unexpected envelope fields, unsupported states/versions and expanded limits. These checks establish the offline interface milestone; they are not browser/provider acceptance.

No frozen project/debug/semantic source files, historical hashes, original case Markdown or debug journal entries are rewritten. Existing seven regression failures remain debt, not hidden passes. Direct legacy CLIs remain usable for compatibility, but new agents should begin at this gateway. Proposed operations must never be added to discovery as though implemented.

## Handoff after this milestone

1. Complete installed Chrome and disposable live-provider acceptance, resolve release1 defects and disposition the existing regression debt. The Copy404 incident remains open.
2. Expand runtime correlation/recovery where evidence is still missing; keep it available through the same gateway rather than creating another competing diagnostic entrance.
3. Prepare the Forever Works handoff only after explicit review of purposes, obligations, constraints and remaining uncertainty. This milestone supplies implementation evidence and accessible contracts, not accepted purpose or certification.


## Original milestone verification — 22 October 2026 (gateway1.1.0 snapshot)

Local Node24.19.0: **316 total tests /309 pass /7 retained historical failures /0 new failures /0 skipped**. All three reliability stages pass: syntax, current Explorer architecture and native API registry/version/ownership validation. The 17 focused foundation/gateway tests pass, including10 new routing/ownership/import/cold-start tests. Gateway schemas validate all56 fixtures; Explorer schemas validate17 bundles; runtime schemas validate five responses and one bundle. Bounds/extra-field rejection checks pass. Current verification API reports recorded-files-match over172 tracked source files with no stale findings.

Exact evidence: [local report](verification/unified-agent-api/local.json), [gateway registry audit](verification/unified-agent-api/registry.json), [focused tests](verification/unified-agent-api/focused.log), [schema checks](verification/unified-agent-api/schemas.log). The local report's tracked-dirty state and file hashes describe the tested source before the implementation commit. The published commit is recorded in the delivery response; it cannot be embedded in itself.

The offline inspection milestone is implemented and locally verified. Remote CI execution, installed-extension behavior, live Cloudflare transfers, historical-debt disposition, release1 readiness and accepted Forever Works purpose remain unverified/open. No provider configuration, customer file, extension permission or ordinary GUI operation was changed for this milestone.
