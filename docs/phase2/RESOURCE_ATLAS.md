# Resource Atlas 1.0.0 — implemented, acceptance blocked

Resource Atlas is part of the canonical Universal File API coordinator, shared by Beta's 0.1 facade and its authorized R2 0.2 path. Production Explorer is unchanged. The owner requested Phase 2.4 on 24 October 2026. REDOWN's licensing, visibility and ownership remain unchanged.

## Cold start

Use Node 24 (the existing gateway uses JSON import attributes). Install the locked dependencies with `npm ci --ignore-scripts --no-audit --no-fund`. Python schema checks require `jsonschema==4.26.0`. No diagnostic command connects to a browser or cloud.

```sh
node agent/diagnostics/cli.mjs resources.describe
node --test tests/resource-atlas.test.mjs
node --expose-gc scripts/resource-atlas-benchmark.mjs
python tests/resource-atlas-schema.py
node agent/diagnostics/cli.mjs resources.listTraces --resource-bundle verification/resources/evidence.json
node agent/diagnostics/cli.mjs resources.getBottlenecks --resource-bundle verification/resources/evidence.json
# Copy an operationId returned by listTraces:
node agent/diagnostics/cli.mjs resources.explainSlowdown --resource-bundle verification/resources/evidence.json --input '{"operationId":"REPLACE-WITH-RETURNED-ID"}'
node agent/diagnostics/cli.mjs resources.compareRuns --resource-bundle verification/resources/evidence.json --input '{"before":"FIRST-ID","after":"SECOND-ID"}'
```

The gateway registry owns routing; `agent/resources/api.mjs` is its read-only adapter. All ten operations have input schemas, examples, source/test references and authorization semantics in `agent/resources/contracts.json`. Evidence uses JSON Schema 2020-12 at `agent/resources/evidence.schema.json`; typed result envelopes distinguish available, unavailable and failed. Missing traces return `RESOURCE_TRACE_NOT_FOUND`; absent imports return `RESOURCE_EVIDENCE_UNAVAILABLE`; unsafe imports return a failed gateway namespace query, never echoing the offending value. Unknown arguments fail validation.

| Method | Meaning |
| --- | --- |
| `resources.describe` | Supported phases, counters, boundaries and version; works without evidence |
| `resources.snapshot` | Recorded runtime heap/RSS, owned counters and persistence health |
| `resources.listTraces` | Bounded summaries, offset/limit pagination |
| `resources.getTrace` | Correlated timestamped spans and completion state |
| `resources.getLatencyBreakdown` | Phase totals/count/max; nested spans overlap |
| `resources.getMemoryProfile` | Before/after runtime memory and owned-resource counters |
| `resources.getBottlenecks` | Spans >=100ms, errors, repeated increasing retained counters and possible heap growth |
| `resources.explainSlowdown` | Facts, possible causes and unavailable attribution separately |
| `resources.compareRuns` | Duration and heap-delta difference; warns single samples cannot prove improvement |
| `resources.exportEvidence` | Portable bounded imported/collected observations |

## Runtime integration

`createFileEngine({store,adapters})` automatically creates `engine.resources`, a frozen read-only facade. The owner collector stays private and Beta injects it explicitly. `await engine.resources.exportEvidence()` returns a redacted bundle; save it locally and pass it to the existing gateway with `--resource-bundle`. This is distinct from the private file journal and from file content export. `resources.query(method,input)` uses the same read semantics in-process. `createResourceAtlas({store,enabled:false})` supplies an explicit comparison control; inject it through the engine's `resources` option. It does not authorize file execution.

Every canonical run starts a trace before reservation and finishes it on returned job outcomes or thrown validation/reservation failures. The normal job ID is the correlation ID. Duplicate idempotency requests retain their original job ID; the extra invocation's reservation trace has a separate ID and does not imply a second provider mutation. Provider proxies preserve authorization/capability checks and do not retry. Read buffers are counted until the engine invocation finishes. The current Beta uses text previews: no object URLs, thumbnails or image decoding exist to instrument. Metadata bytes are an estimated 128 bytes per visible row, not a heap measurement.

Beta exposes only diagnostic queries/export through `controller.resources`. UI input spans measure handler execution through authorization/init, not OS-to-browser input delay. UI render spans cover synchronous DOM work, not subsequent browser layout/paint. Preview counters release on replacement, selection, disabling Beta and controller close. Storage-change listener removal and resource cleanup run on close. Startup covers installation to initial engine initialization. The normal gate and production isolation remain intact.

Journal spans cover coordinator reads and transactions. File journal hooks additionally measure local scheduling and lock acquisition; IndexedDB transaction hooks measure completion latency. These are nested within journal totals. R2 transport spans separate fetch-to-headers from response-body wait/JSON decoding. Response byte length and body-phase throughput are observable; this is JSON transport throughput, including base64 overhead, not end-to-end file throughput or a provider server CPU measurement. Error messages, endpoint URLs, authorization, object identities and file content are never copied into spans.

## Evidence and durability

Limits: 64 traces, 96 spans per trace, bounded active collection and one MiB gateway import. Overflow increments dropped counts. Export exposes truncation. Start/finish snapshots persist in the injected journal; unfinished `running` traces survive restart as incomplete evidence without replay. Intermediate spans since the last persistence boundary can be lost in a crash. Completed UI spans are flushed after rendering/preview. Diagnostics share the existing journal, with no second credential/profile store. Persistence failures are counted and reported without converting successful file work into failure. Multi-instance writes merge stored trace IDs, but an existing instance is a pinned local view; recreate it to read another executor's evidence.

Node supplies `process.memoryUsage`; Chromium may supply `performance.memory`; unsupported metrics are null plus explicit unavailable labels. Whole-runtime heap samples include concurrent tasks, GC and diagnostics. Repeated increasing owned counters are evidence of retained resources, with intentional caching still a possible cause. Increasing heap samples alone are hypotheses, never proof of a leak. Lifecycle counters only cover instrumented owners, not all allocations or arbitrary application listeners.

## Reproduction and current limits

The seeded harness exercises startup, 100/1,000/10,000 seeded listings, repeated navigation, concurrent reads, intentional retained preview counters and cleanup, and alternating enabled/disabled overhead samples with confidence intervals. Engine tests inject a 110ms HTTP response, timeout and 105ms journal delay. Durable restart tests reopen the actual file journal; existing Beta tests cover IndexedDB restart and atomic transaction behavior. The existing browser walkthrough now exports actual UI/provider spans to `verification/resources/browser-evidence.json`.

The 10,000 inventory is seeded directly; memory-adapter creates remain limited to 5,000 and engine jobs to 500. This is a bounded workload, not a long-running usage certification. No automatic cache-eviction policy, allocator profiler, browser process memory, worker heap/CPU, GC-normalized leak verdict, main-thread long-task observer, real input-event delay, layout/paint profiler or interrupted-transfer throughput certification is implemented. Phase names for future measurements do not establish collection. Existing operation/fault tests remain necessary; exhaustive coverage of every requested workload is not claimed.

The live four-bucket run in `verification/resources/live-lab.json` has 72 passed, 29 failed and 16 blocked assertions. The first bucket's early requests produced INVALID_PROVIDER_RESPONSE; dependent source-based checks then failed. This evidence does not establish the cause of those invalid responses, or prove those failures were caused by instrumentation. No blind write retry was introduced. Cleanup returned no failures and management-API inspection independently found all four exclusive run prefixes empty. The temporary Worker was deleted and a subsequent read confirmed absence. `live-evidence.json` contains actual R2 spans. Existing R2 atomic destructive-operation gates remain closed.

The Phase 2.4 implementation was merged to main before Phase 2.5. Its historical acceptance remains blocked; branch placement does not turn that failed run into a pass. Preserve the failed live run, remaining measurement gaps and existing baseline failures. A successor must reproduce the invalid live responses with numeric HTTP status/body-length evidence, repair or classify them, extend missing workloads, rerun browser/live/schema/overhead/safety checks and only then consider the owner's requested merge. Never weaken source verification, four-bucket restrictions or uncertain-write recovery to obtain a green result.

The checked-in paired benchmark uses the uninstrumented coordinator at starting commit
`c5017e2be5e6d4370ab522214b3187efeaca86ed`: 2.787ms enabled versus 2.593ms baseline,
about +0.195ms (+7.51%) per 1,000-file listing in this environment. The mean confidence
intervals overlap; this is a measured sample, not a stable cross-machine guarantee.
Reproduce the comparison without modifying the working checkout:

```sh
git show c5017e2be5e6d4370ab522214b3187efeaca86ed:extension/file-engine/engine.mjs > /tmp/redown-resource-baseline.mjs
RESOURCE_BASELINE_MODULE=/tmp/redown-resource-baseline.mjs npm run resources:benchmark
```

Without `RESOURCE_BASELINE_MODULE`, the benchmark compares enabled collection with disabled
collection while retaining wrapper overhead. Do not confuse that control with the full
uninstrumented baseline. Durable-store and browser overhead are not yet quantified.

## Phase 2.5 contract and export repair

The runtime validator is compiled from the authoritative `agent/resources/evidence.schema.json` using Ajv 2020-12 and bundled for browsers. Rebuild with `node scripts/compile-resource-schema.mjs`; `--check` detects generated drift. Install Python `jsonschema[format]==4.26.0` for the independent agreement test. Required fields, nested unknown fields, formats, privacy labels and numeric boundaries are enforced at import and journal restoration. The one MiB UTF-8 import budget is an additional transport limit. Existing valid 1.0.0 producer evidence remains covered by regression tests.

`node scripts/resource-trace-export.mjs EVIDENCE.json > trace.json` exports Chrome Trace Event JSON for compatible timeline viewers. Logical lanes carry operation IDs; no OS-thread or OTLP claim is made. Span starts are reconstructed from completion wall timestamps and measured durations, so clock adjustments/millisecond precision limit alignment. Unsupported CPU, Worker and layout/paint measurements remain unavailable. Phase 2.5 paired overhead is in `verification/aac/phase25/resource-benchmark/benchmark.json`; its disabled-collector control retains wrapper overhead.

The Phase 2.5 fresh leased four-bucket subset passed 21 checks with no cleanup failures.
`verification/aac/phase25/live.json` is bound to runtime source digests;
`live-management-cleanup.json` records separate management reads and temporary Worker removal.
This does not erase Phase 2.4's failed run or resolve broader real-provider durability acceptance.
