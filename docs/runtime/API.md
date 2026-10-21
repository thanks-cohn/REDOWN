# Runtime diagnostics API 1.0.0

This namespace is separate from project/debug 0.1, semantic APIs and Forever versions. It is a working, limited runtime observer, not a complete implementation of the premium assurance request. See [readiness](READINESS.md) and [staged results](IMPLEMENTATION.md).

## Four surfaces and authorization

| Surface | Implemented adapter | Effects / preconditions |
| --- | --- | --- |
| Offline | `agent/runtime/api.mjs`, CLI | Local bounded support import and queries; no Chrome, credentials or cloud calls |
| Passive | `extension/runtime-diagnostics.js`, background message adapter | Debug Mode required; local in-memory events only; settings-page sender required |
| Probe | `scripts/installed-chrome.mjs` | Explicit command launches installed Chromium with temporary profile and trusted static CDP assertions; no login, provisioning or remote fixtures |
| Action | `clear` | Clears local trace only. Does not reset profiles, history, credentials or remote resources |

No general-purpose message executor, arbitrary JavaScript/shell interface or public administrative endpoint is exposed. Chrome harness static evaluation is developer-controlled local test code, not a callable extension API. Cloud probes and destructive actions are not advertised or implemented. Discovery lists unsupported areas. Opening normal Explorer views can still call existing preparation handlers that provision/upgrade Workers; diagnostics never calls these.

## JS and CLI

```sh
node agent/runtime/cli.mjs describe
node agent/runtime/cli.mjs snapshot
node agent/runtime/cli.mjs listTraces /path/to/redown-support.json
node scripts/runtime-conformance.mjs
python tests/runtime-schema-conformance.py
node scripts/runtime-benchmark.mjs
```

```js
import {createRuntimeDiagnostics, inspectBundle} from './agent/runtime/api.mjs';
const offline = createRuntimeDiagnostics({context:'offline'});
offline.query('describe'); // no network or runtime connection
const imported = inspectBundle(sanitizedBundle);
imported.query('listTraces', {after:0, limit:50});
```

From the actual extension's settings DevTools after enabling Debug Mode:

```js
await chrome.runtime.sendMessage({type:'runtimeDiagnosticsV1', operation:'snapshot'});
await chrome.runtime.sendMessage({type:'runtimeDiagnosticsV1', operation:'listTraces', input:{after:0,limit:50}});
```

Settings provides Inspect runtime, Export support bundle and Clear traces controls. It does not add diagnostic data to normal transfer UI.

## Contract

Envelope: `runtimeApiVersion`, UUID `requestId`, per-adapter UUID `runId`, `state`, `data`. Schema: [response](../../schemas/runtime/response-1.0.0.schema.json). Unknown operations return `unsupported / UNSUPPORTED_OPERATION`; non-object input and invalid cursors return `failed / INVALID_INPUT`. No arbitrary input is echoed. Browser envelope additionally carries existing `ok` plus `correlationId`; failures preserve existing message contracts. CLI prints JSON; exit 2 for invalid/unsupported operations, 3 for unavailable adapter, 0 otherwise.

| Operation | Input | Output / limits |
| --- | --- | --- |
| `describe` | object, defaults `{}` | Actual operations, adapter, local effects, unsupported areas, limits |
| `snapshot` | object | Build version, collection state, event count, component unknowns; background adds credential presence, renewal due and reconnect state |
| `listTraces` | `after` nonnegative integer, `limit` 1–100 | Ascending sequence page, nextAfter, oldestSequence. Evicted prefixes are visible |
| `exportSupport` | object | [Bundle schema](../../schemas/runtime/support-bundle-1.0.0.schema.json), UTC export time, bounded events, limitations |
| `clear` | object | Clears observer's local memory; sequence remains monotonic |

Credential presence is not authorization, API reachability, account access, Worker compatibility or bucket health. Snapshot deliberately leaves these unknown. Offline snapshot is unavailable. Export is partial, never release evidence. No adapter currently provides transfer receipts, preview state or complete cross-context spans through this namespace.

Traces have UTC timestamps, per-context run/request IDs, monotonic elapsed durations, sequence, sanitized component operation/outcome/error code, attempt, optional HTTP status and parent ID. Background message correlation IDs and API request IDs are separate spans today; complete end-to-end parent linkage is unfinished. Only background API traffic is observed; direct settings API calls are not aggregated. A response acknowledgement is not object/head/byte verification.

## Privacy, retention and failures

Collection defaults off, follows existing Debug Mode setting, and drops all events when disabled. At most 256 events, 24-hour in-memory TTL, <196608-byte export for adapter-created records. Service-worker restart resets memory and changes runId; it does not pretend to recover old traces. No browser persistence journal is claimed. Unknown optional bundle metadata is accepted by schema but deliberately dropped during re-import for privacy; imported events are re-sanitized and reidentified as offline imports, never upgraded into observed installed runtime evidence.

Only allowlisted operations/outcomes/codes, bounded numbers and UUID correlations enter traces. No URL, token, filename, bucket/account name, destination, response body, stack or raw error text enters the export. Unknown code becomes UNKNOWN. This intentionally limits forensic detail. Instrumentation exceptions are caught and cannot change API/transfer outcomes. Extension permissions are unchanged. No telemetry receiver is added.

Local support exports are user-created files; retention/deletion belongs to the user. Turning off Debug Mode clears memory; Clear traces does not delete an exported file. Existing credentials/history/RFIS storage are not copied into support bundles. Private identifiers used internally by search are not runtime diagnostic exports.

## Progressive search protocol

Existing `cfSearchObjects` is retained for compatibility. GUI now uses `cfSearchStart {targets,query}`, `cfSearchStep {sessionId}`, `cfSearchCancel {sessionId}`. `cfSearchRetry` retries only failed targets for developer callers. These are explicit API listing reads, not passive diagnostics; OAuth renewal can occur but no Worker provisioning is called by the new protocol.

Each caller-driven step reads at most one 1000-object page for each of two targets, awaited with allSettled. No background polling or port keepalive is required. Page requests use the 30-second bounded API fetch (one authentication retry plus one bounded safe-read transient retry at most). UI requests have a 120-second ceiling. A caller cancellation stops accepting results; already dispatched reads may run until their network timeout. Cancellation does not abort those requests yet.

Target/account/bucket validation, deduplication and limits: 100 targets, 8 concurrent sessions per background instance, 5-minute inactivity TTL, 5-minute scan budget checked per step, 100000 examined objects, 1000 pages/target, 2000 results. Limit state is explicit; narrow/restart to continue. Results deduplicate on account+bucket+full key+type. Arrival order is stable: target order then API page order, append-only; fuzzy matching is retained but global final ranking is intentionally removed to prevent row reordering. Result pagination grows without resetting selection or preview; focused rows are restored after renders.

States: scanning, complete (including zero results), partial (target errors), cancelled, limited. A lost/expired/restarted session returns SEARCH_INTERRUPTED. Busy steps fail SEARCH_BUSY. No durable restart/resume claim. Obsolete queries/navigation cancel their sessions and reject late results; credential-generation change cancels sessions. Actual scopes are current **bucket including all folders**, selected account, or all loaded authorized accounts; current-folder/content search is not offered. Inventory errors remain visible. The GUI currently retries by rerunning search; retained failed-target retry is available programmatically. Partial results are never an account-wide completeness guarantee.
