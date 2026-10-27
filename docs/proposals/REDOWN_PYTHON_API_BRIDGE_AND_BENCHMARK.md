# REDOWN: Thin Python API Bridge, Mixed-File Benchmark, and GUI/API Fault Isolation

**Date:** October 27, 2026  
**Repository:** `thanks-cohn/REDOWN`  
**Branch:** `beta-explorer`  
**Status:** PROPOSAL ONLY — NOT IMPLEMENTED OR LIVE-VERIFIED  
**Related contract:** `docs/beta/REDOWN-COMPREHENSIVE-INTERACTION-TEST-MATRIX.json`  
**Related roadmap:** `DO_NOT_REPEAT_MISTAKES/ROADMAP-2026-10-27.md`

## 1. Objective

After the initial guided **Test It** GUI exercises establish that users can invoke REDOWN's controls correctly, prove the **same underlying file API** with a lightweight programmatic client. The primary goal is **fault isolation**: distinguish defects in GUI event handling, argument construction, rendering and state updates from defects in the shared file API, adapter, Cloudflare R2 interaction, or actual remote data integrity.

Build **one small Python runner** and the **thinnest practical Python-to-existing-JavaScript-API bridge**. Do not build another laboratory, dashboard, parallel provider adapter, or Python rewrite of file-management logic.

A successful API test narrows suspicion away from the shared API **only for that exact operation, input, conditions, and execution path**; it is not a blanket proof of correctness.

## 2. Shared operation path

```text
Human: Beta Explorer GUI ─┐
                          ├─> SAME REDOWN universal file API
Python: thin bridge ──────┘           │
                                      v
                         Existing Cloudflare R2 adapter /
                           existing background/Worker
                                      │
                                      v
                              Real Cloudflare R2
                                      │
                                      v
                       Independent cloud readback/checks
                                      │
                                      v
                       Durable per-operation JSON evidence
```

- **GUI path:** actual mouse, keyboard, context-menu, drag/drop, Preview, and toolbar events, tested separately by Test It.
- **Programmatic path:** Python sends narrowly typed operations to the existing API through a minimal bridge; no simulated clicks and no replacement file implementation.
- **Transport:** first inspect current REDOWN runtime dependencies. If the universal API can execute in Node, prefer a small local process and JSON Lines over stdin/stdout. If Chrome-only APIs are essential, use the smallest appropriately authorized extension/native-messaging boundary; do not claim a Node-only process can call Chrome APIs unchanged.
- **Boundary security:** local-only, explicit invocation, narrow allowlist, validated inputs, no unauthenticated listening HTTP server, no credential disclosure, no silently elevated privileges, and no remote-command execution interface.
- **Operation parity:** same operation definitions, error/result codes, limits, provider adapter, and verification contracts wherever possible; explicitly document any runtime differences.

## 3. Initial 20-minute mixed-file acceptance session

**20 minutes is a maximum session window, not a waiting period or required runtime.** The runner stops scheduling new actions at the deadline and emits honest partial evidence. A pending non-idempotent operation must finish safely, be appropriately cancelled, or be marked UNCERTAIN and reconciled before any retry.

**Initial corpus:** a deterministic directory totaling approximately **500 MiB** (label bytes precisely: MiB versus decimal MB), containing **many** individual files of varying sizes, not one 500 MB file and not an initial hundreds-of-thousands-of-files workload.

Include, as supported and available:
- Empty, one-byte, tiny, small, medium, and larger files, with a spread such as 1 KiB through tens of MiB and selected ~50–100 MiB objects.
- Representative actual content and valid fixtures: TXT/JSON, JPEG/PNG/WebP/GIF, PDF, audio, video, ZIP/CBZ, binary, and explicitly unsupported/corrupt fixtures for safe negative tests.
- Compressible and incompressible data; varied nested directories, duplicate basenames in different paths, spaces, mixed case, Unicode, long names, and special characters acceptable to the provider.
- A reproducible manifest recording relative path, exact bytes, SHA-256, source fixture type, and whether contents are valid. Record empty-folder semantics honestly: R2 object storage may require explicit folder marker representation.

Do not equate file extension with verified valid file content. Prefer deterministic, non-sensitive test files.

**Suggested sequence:**
1. Preflight: inspect supported API operations, credentials/session availability, permissions, corpus manifest, approved target bucket and disposable prefix; take a baseline inventory.
2. List and stat authorized bucket/prefix; confirm listing and pagination without mutation.
3. Upload varied files and nested folders into the designated disposable namespace with existing bounded-memory operation contracts.
4. Freshly list/stat objects and independently read back all objects needed for verified upload outcomes, comparing bytes and SHA-256. Do not infer integrity from a success toast or ETag alone.
5. Exercise copy, duplicate, rename, move, cross-folder operations, and supported cross-bucket operations on **test-owned copies**, preserving the baseline corpus.
6. Download selected files of each size/type class and verify actual bytes against manifest where disk access allows.
7. Exercise conflicts, error responses, and safe cancellations only within supported, explicitly authorized scope; reconcile uncertain writes before retry.
8. Verify resulting inventory and delete **only confirmed test-owned objects** in the approved namespace; report leaks or uncertain leftovers.
9. Flush an append-only JSONL event journal throughout and produce one consolidated versioned results JSON on completion or bounded stop.

Start with sensible bounded concurrency. Do not overload R2 or assume arbitrary transfer size support. Graduated size and high-object-count workloads follow after this baseline; a **single huge file** (500 MB/1 GB or larger) is a **separate later test**, not the initial corpus.

## 4. Evidence: every operation has a record

Every executed command, provider request, failure, timeout, skip, and verification attempt receives a traceable record. An operation may have several correlated request/response events. No operation disappears simply because it failed or the process was interrupted.

**Recommended record fields:**
- schema version, run ID, operation ID, originating exercise/fixture ID, process/environment and adapter version;
- operation type, safe normalized arguments, prerequisite state, local timestamp and monotonic duration anchors;
- sanitized request method, endpoint identity, HTTP status, actual Cloudflare error/result codes and sanitized response body;
- transport/runtime exception, timeout/cancellation/retry state, bytes, throughput where meaningful;
- expected state before and after; actual fresh remote list/stat/readback evidence and SHA-256 where relevant;
- actual GUI or programmatic invocation origin, correlation ID, verification provenance;
- verdict `PASSED`, `FAILED`, `BLOCKED`, `NOT_TESTED`, or `UNCERTAIN`, with machine-readable reason.

**Never** mark PASSED solely because a local wrapper returned success or Cloudflare returned HTTP 2xx. An upload/copy/move/rename must be checked by fresh provider reads; deletion requires confirming targeted absence. Full-content hashes are required whenever preservation of file bytes is the assertion and readback is available. If verification is unavailable, explicitly report it; do not fabricate.

Redact API tokens, secret keys, auth headers, signed URLs, sensitive object paths, and sensitive response fields before writing journal or JSON. Do not store unredacted provider payloads and hope to sanitize only on export. Keep enough sanitized error information to diagnose exact codes such as Cloudflare `10023`.

## 5. Measure laptop-to-cloud latency properly

Capture using a monotonic clock when available and UTC timestamps for correlation:
- **T0:** user GUI interaction or Python command invocation.
- **T1:** REDOWN API dispatch.
- **T2:** HTTP headers arrived (if observable).
- **T3:** response body and API processing completed.
- **T4:** corresponding visible GUI state (GUI route only).
- **T5:** independently verified provider state via fresh read/list/stat/content comparison.

Report action-to-dispatch, request round-trip/processing, action-to-visible-result (GUI), action-to-verified-result, transfer time, bytes and MiB/s, as measured. Record unavailable stages as `null` with reason. The client cannot separate network transit from Cloudflare's private internal execution without server-side timing evidence.

Retain error, cancellation, and slow-tail timings; aggregate count, failures, median, p95 and worst case by operation, file-size class and invocation route when sample sizes are sufficient. Benchmarks should clearly separate cold/warm effects, file-size distribution, number of requests and concurrent operations.

## 6. Controlled Beta versus Legacy comparison

Once Beta's actual API and GUI paths are independently verified, build **an equivalent supported workload** for the existing Legacy Explorer.

- Audit the actual Legacy operations and limits, not assumptions based on labels or appearance.
- Use the same deterministic corpus, approved disposable R2 context, fixtures and independent verification requirements.
- Same laptop, account, region and comparable network conditions; alternate run order across repeated trials to reduce time-of-day/network bias.
- Keep Legacy production behavior unchanged. Any Legacy harness must invoke its **real supported path**, not substitute the Beta API while claiming a Legacy measurement.
- Record `NOT_SUPPORTED` as a capability assessment distinct from FAILED; don't force operations through unsupported Legacy paths.
- Benchmark TRUE REMOTE URL-to-cloud separately from laptop-to-R2 upload; their byte paths differ.

**Diagnostic matrix:**

| GUI | Python/bridge API | First investigation target |
| --- | --- | --- |
| Fail | Pass, identical inputs/conditions | GUI handler, arguments, integration, rendering or state transitions |
| Fail | Fail in same way | Shared API, adapter, provider response, credentials or environment |
| Slow | Fast on equivalent work | GUI overhead or differences in interaction workflow |
| Pass | Fail | Bridge/runtime parity, auth/context/argument differences |
| Pass | Pass | Tested path meets specified acceptance checks, not all possible scenarios |

Do not overclaim a root cause from correlation alone; compare trace IDs, exact inputs, execution routes and provider evidence.

## 7. Phased implementation and exit gates

**Phase A — GUI acceptance:** `Take the Tour` remains instructional; `Test It` exercises the 60-action session described by `docs/beta/REDOWN-COMPREHENSIVE-INTERACTION-TEST-MATRIX.json`. Confirm actual GUI-to-API invocation and per-action JSON evidence. Incomplete live Chrome/R2 tests remain unverified, not passed.

**Phase B — Thin bridge:** add one minimal Python client and a minimal JS bridge to the **same universal API**, with a small verified smoke set (list, stat, scoped upload/download, copy/move/rename/delete if implemented) and independent evidence. Verify true implementation path parity, not a second Python storage client.

**Phase C — 500 MiB mixed directory:** execute bounded 20-minute real R2 session with progressive operations, full manifest and per-operation journal; report attempted, confirmed, unverified, and remaining objects. Never substitute mock fixtures for live pass claims.

**Phase D — Coverage expansion:** more objects, boundary sizes, formats, nested paths, conflicts, interruptions, concurrency, edge cases; only then a separate single very large file and multipart/limit tests.

**Phase E — Legacy equivalence:** verify Legacy through its actual implementation, compare only supported equivalent scenarios and produce repeatable benchmarks and a capability-gap ledger.

**Success criteria:** demonstrable common API operation parity; independently verified changes to real disposable R2 objects; per-operation provider diagnostics and measured latencies; reproducible, versioned JSON reports; and a comparison that localizes likely faults without confusing GUI, API, bridge, or provider failures.

## 8. Non-goals and constraints

- No new REST/S3 storage engine in Python, no wholesale rewrite, no external dashboard, no extra permanent service, no speculative provider expansion.
- Do not remove Legacy features, modify `main`, alter production permissions/limits or silently provision resources.
- Protect existing user data: explicit approval for live writes, unique disposable prefix, pre-operation safety validation, narrowly scoped cleanup.
- Do not conflate *the GUI invoked the API correctly* with *the cloud changed correctly*: test both layers.
- Do not claim universal correctness after one 20-minute pass; this is a high-confidence measured baseline for tested operations and conditions.
- Prefer one small runner, one bridge, one manifest, append-only JSONL and one final JSON over a large test framework.

## 9. Next implementation request

After the user approves implementation, read this proposal, current actual API/adapter and existing testing contracts. Build the smallest end-to-end Python bridge smoke test first, prove it reaches the existing universal API (not a parallel storage client), and only then run the full approved 500 MiB/20-minute workload. Deliver working code, precise evidence, outstanding gaps and a commit on `beta-explorer`; finish as soon as verified, without filling time artificially.
