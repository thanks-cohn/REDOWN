> Recovery surface correction: the current launcher uses native action-popup recovery only. See [the implementation correction](ATTACHED_TOOLBAR_POPOUT_CORRECTION.md). This remains proposal-only; no new API is implemented.

# Toolbar and native-menu diagnostics: proposal only

Status: design, 31 October 2026. No operations in this document are implemented or advertised. This proposal follows the entry-point repair; it is not a release certificate.

## Existing owners and integration

The unified gateway (`agent/diagnostics/registry.json`, gateway 1.2) already routes offline project, debug, semantic, runtime and Explorer inspection. Extend that entrance; do not add an HTTP server or another agent CLI. Runtime 1.0 owns passive event observation, imported bundles and support exports. Its current observer is Debug-gated, in-memory, capped at 256 events and 24 hours, and resets on suspension. It cannot explain yesterday's launch. Debug 0.1 owns historical incidents and append-only reviewed hypotheses, not browser telemetry. Explorer 1.0 owns transfer-specific traces; neither object receipts nor cloud authorization may be inferred from toolbar success. Project and semantic maps supply navigation, not live observations or accepted intent. Preserve their frozen schemas and evidence hashes.

The repair's local `entryPointEvidence` ring and `rightClickMenuStatus`/native ID inventory are narrow internal implementation records. A future versioned runtime importer should transform these with explicit provenance; do not silently reinterpret them as runtime 1.0 events. The independent `entry-bootstrap.js` launcher is the starting point for fault isolation, not a separate public diagnostic API.

## Evidence contract and event schema

Proposed runtime schema 2.0 (separate from gateway, extension and Forever versions):

```json
{
  "schemaVersion": "2.0.0",
  "eventId": "uuid",
  "attemptId": "uuid",
  "parentEventId": null,
  "runId": "uuid",
  "sequence": 1,
  "timestamp": "2026-10-31T19:00:00Z",
  "monotonicMs": 12,
  "extensionVersion": "example",
  "component": "toolbar",
  "operation": "open-shelf",
  "stage": "chrome-open",
  "status": "failed",
  "error": {"code": "SHELF_OPEN_REJECTED", "message": "Chrome rejected Shelf opening."},
  "configurationRevision": null,
  "recovery": {"attempted": true, "method": "action-popup", "status": "accepted"},
  "evidence": {"source": "chrome-api", "confidence": "observed", "scope": "api-acceptance"}
}
```

Use enums, UUIDs, bounded numbers and fixed safe summaries. No raw exception messages, stack traces, account/bucket/object names, URLs, tokens, page text or arbitrary payloads. Configuration identity must be an opaque generation, never a credential-bearing JSON digest exported for guessing. Null means unavailable. Timestamps are UTC; query presentation requires an explicit timezone. Sequence and run IDs disambiguate wall-clock changes and suspension. An example event above does not establish that an actual rejection occurred.

Retain decoders for runtime 1.0; new major schema requires explicit opt-in import and golden compatibility fixtures. Unknown major versions are unsupported, never guessed. Compatible optional fields must be bounded and sanitized, not copied blindly into exports. Preserve original import hash, transform version and original evidence scope. Imported records remain imported, even when internally consistent.

## Proposed operations through the single registry

| Qualified operation | Purpose and evidence boundary |
| --- | --- |
| `runtime.getRuntimeHealth` | Local component observations and age; never global health certification |
| `runtime.getToolbarStatus` | Last delivered action, request, API acceptance, document readiness and recovery |
| `runtime.getMenuStatus` | Expected generation, callback receipts, interrupted state, base-access evidence |
| `runtime.getLastFailure` | Latest retained failed attempt, or unavailable |
| `runtime.getFailureHistory` | Cursor pagination, explicit retention gaps |
| `runtime.explainFailure` | Evidence-linked explanation, competing hypotheses and unknowns |
| `runtime.traceOperation` | Ordered events for an exact attempt ID; incomplete edges explicit |
| `runtime.compareExpectedActual` | Expected projection versus acknowledged IDs; native visibility unknown |
| `runtime.getRecoveryStatus` | Requested/accepted/document-ready/failed separately |
| `runtime.runSafeChecks` | Local read-only checks; no preparation, scans, registration or cloud requests |
| `runtime.exportSupportReport` | Sanitized user-requested local bundle with retention and platform limits |

Register only when implemented. Keep gateway aliases explicit; qualified names avoid collisions with Explorer explain/trace operations. Bound input to existing gateway limits, pages to 100 and bundle size to the existing 192 KiB limit unless separately versioned. Queries have no repairs or remote side effects. Browser transport must verify exact extension sender URLs and input schema; offline gateway operates only on explicitly supplied sanitized bundles. Cloud credentials are unnecessary. Debug incident linking remains a reviewed append-only action, not automatic incident closure.

## Capture and independence

Register the minimal toolbar launcher and narrow failure hooks before provider imports. The repair now does that. A later provider evaluation failure can leave the launcher alive; a syntax failure in the main script before execution, corrupt bootstrap, missing manifest/resource, disabled extension or policy denial cannot be reliably observed by that same worker. A separately loaded recovery popup may export local evidence when accessible. Do not require a popup handshake to launch the Shelf.

A future minimal manifest background bootstrap could import the main worker inside a guarded boundary and record import failure; evaluate compatibility and listener registration semantics before doing so. No second service worker or perpetual keepalive is available. The bootstrap must remain dependency-free and tiny, with syntax/resource tests. Independent browser/owner evidence is still required when Chrome cannot execute any extension code.

Chrome exposes API rejections and callback-scoped `runtime.lastError`, document contexts, runtime messaging and extension error pages/worker console. It does not give ordinary extensions a reliable native-menu enumeration/visibility API, a universal extension-error-history reader, or evidence of every undelivered toolbar click. Other extensions failing simultaneously supports a browser hypothesis, not proof of REDOWN's cause. Document presence is not proof of rendered pixels, accessibility, user focus or usable provider connection. Never call a popup-window creation receipt full UI verification.

## Persistence, correlation and failure handling

Proposed bounded local journal: 256 redacted events, 24-hour TTL initially; explicitly evaluate a seven-day failure-only cap of 64 incidents if yesterday-based support requires it. One writer lane in the bootstrap/runtime adapter; complete snapshots with schema/generation and persisted high-water sequence. `chrome.storage.local.set` acknowledgement means accepted write, not a cross-record transaction or guaranteed disk fsync. A crash can lose the latest pending event. Mark requested attempts without terminal events interrupted/unknown on the next activation; never replay transfers.

Write failure must not block launch. Retain a bounded in-memory suffix, emit a fixed console warning, and export `persistence: unavailable` when a UI is reachable. Do not retry storage indefinitely. Avoid logging successful repeated no-change checks; reserve capacity for terminal failures. Generate an attempt ID at delivered event entry, carry it through open/readiness/recovery and link menu Apply to its configuration generation. Cross-context messages must validate exact attempt/window scope and expiry. Do not infer causation from timestamps or equal unrelated IDs.

## Classification and state model

Classify `BOOTSTRAP_IMPORT_FAILED`, `EVENT_DELIVERY_UNKNOWN`, `SHELF_API_UNAVAILABLE`, `SHELF_OPEN_REJECTED`, `SHELF_READINESS_TIMEOUT`, `UI_RESOURCE_UNAVAILABLE`, `RECOVERY_OPEN_REJECTED`, `STORAGE_UNAVAILABLE`, `CONFIG_INVALID`, `MENU_PROJECTION_FAILED`, `MENU_ACK_TIMEOUT`, `MENU_NATIVE_REJECTED`, `MENU_STATE_UNKNOWN`, `CHROME_RESTRICTED_CONTEXT`, and separate cloud authorization/network errors. Provider failure never implies launch failure. Raw platform errors may only be mapped to allowlisted categories.

Toolbar: READY → SHELF_REQUESTED → SHELF_CONFIRMED, or SHELF_FAILED → RECOVERY_REQUESTED → RECOVERY_OPENED/ACCESS_BLOCKED. Include API-accepted and document-ready evidence scopes; confirmed does not imply a working cloud provider. Menu: expected → reconciling → acknowledged/superseded/partial/failed; retain base-access acknowledgement independently. Neither Chrome menus nor local records support a multi-entry atomic transaction.

## Answering the owner's questions

For “Why did REDOWN fail yesterday at 3:42 PM?”, require the user's timezone/date, find retained attempts in that UTC interval, return event IDs and observed transitions. A Chrome rejection is observed; why Chrome revoked a gesture may remain unknown. No matching event means no retained evidence, not proof Chrome delivered no click. Explain retention/storage gaps and boot identity. For a missing menu, show configuration generation, acknowledged root/manage, stale/missing expected IDs and last native error; actual OS menu visibility remains unobserved unless a human/browser observation is attached. A cold agent starts at the gateway guide, imports the support bundle, queries the exact attempt, then follows source links and relevant test presets. It need not reconstruct the entire transfer call graph.

## Prevention and acceptance

Startup usability requires a registered launch listener, manifest Shelf path, reachable local recovery controls and an independent menu-base reconciliation lane; cloud sign-in/inventory are optional. Tests must fail when listeners disappear, bootstrap import closure breaks, a stale popup preference intercepts actions, a readiness acknowledgement hangs, or a rebuild erases basic access. Native IDs are receipts, not a second configuration authority; validate against current projection and authorization before routing any click. Interrupted reconciliation re-runs once at the next supported lifecycle opportunity using cached inventory. No periodic cloud scans solely to prove launch health.

Regression checks compare the extension build and schema version with a version-tagged failure baseline after an update, without claiming that an increased event count alone proves regression. Add approved installed-Chrome fresh/upgrade/restart tests and owner-visible observations; retain local mocks as a separate evidence tier. Support export must work without provider access and redact seeded secrets. The diagnostics component itself must tolerate storage and messaging failure and never gate interface opening.

## Phases, scope and risks

1. Two to three engineering days: review event/privacy schema, retention and compatibility fixtures; extend runtime bundle validation and registry ownership design.
2. Three to five days: bounded persistent recorder, independent bootstrap fault capture, scoped correlation and UI acknowledgements, storage failure tests.
3. Three to five days: read-only runtime queries and gateway registration/import; evidence-linked explanations and safe export.
4. Three to five days: approved real-Chrome fresh/upgrade/suspension/window/fault tests, update regression fixtures and support instructions.

Estimate: 11–18 engineering days plus Chrome/owner acceptance availability, not a delivery promise. Principal risks are MV3 termination, missing Chrome introspection, activation timing, multi-window identity, acknowledgement races, storage quotas and privacy regressions. Acceptance requires bounded resources, secret-free exports, offline queries, truthful unknowns, old-format imports, no cloud calls from safe checks, no duplicate recovery windows, and evidence for injected failures across every boundary. None of these proposed interfaces is implemented in this repair.
