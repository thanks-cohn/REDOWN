# File Operations contract 0.1.0 — simulation foundation

Authoritative source: `extension/file-engine/contract.mjs`; executor: `simulation.mjs`; browser persistence: `indexeddb-store.mjs`. Tests: `tests/phase2-engine.test.mjs`, `tests/phase2-beta.test.mjs`. Milestones: P2.1 partial / P2.2 simulation prototype. This is a development contract, subject to explicit migration before production use.

`createSimulationEngine(store)` is platform independent. `store.read()` returns a copied snapshot; `store.update(syncFunction)` atomically commits an updated snapshot and returns only after commit. The IndexedDB implementation serializes conflicting transactions across tabs. Production Chrome settings/auth/history/counters are never written. Persistent DB: `redown.phase2.beta`, version 1, object store `state`, snapshot key `snapshot`. Unknown schema versions fail closed; no implicit migration or deletion.

Methods:

- `describe()` advertises only implemented simulation operations and two fake providers. They are **not** R2 and Drive integrations.
- `plan(request)` validates shape, identities, destructive confirmation and provider eligibility; returns executor/conflict/verification policy. It does not execute, reserve a destination or guarantee later success.
- `run(request)` returns a committed job with operation ID, request, executor, events, result/error and receipt. Invalid requests reject before a job exists. Accepted failed operations are journaled. Storage failure rejects rather than returning completion.
- `inspect(id?)` reads a job or bounded history without executing or persisting anything.
- `diagnose(id)` returns event evidence, confirmed facts, missing evidence and conservative retry guidance. No inferred causes are reported as facts.

Every request has `apiVersion:'0.1.0'`, `operation`, `idempotencyKey`; identities contain exact `provider/account/container/key`. Keys are literal, never trimmed, decoded or lowercased. Root keys are permitted only for list; folder keys end in slash. Version, fields, control characters, dot segments, target overlap, type mismatch and destructive confirmation are validated. Request examples:

```json
{"apiVersion":"0.1.0","operation":"copy","idempotencyKey":"request-42","source":{"provider":"fake-r2","account":"demo","container":"sandbox","key":"Welcome.txt"},"destination":{"provider":"fake-drive","account":"demo","container":"sandbox","key":"Copy.txt"}}
```

Supported operations: list (cursor, query, limit), metadata, read (text fixture), copy, move, rename, delete, mkdir, upload (text ≤64 KiB). Clipboard is an interface intent; paste maps to copy/move. Search is a recursive list query; ordinary listing returns immediate children. Cursor binds revision, scope, prefix, query and offset; changed stores reject stale cursors. Mutations refuse all destination conflicts: no overwrite, silent merge, keep-both or replacement policy yet. Recursive operations are all-or-nothing **only inside this fake atomic snapshot**. This is not a provider directory-transaction guarantee.

Move/rename/delete require `confirmed:true`; this is the simulation contract, **not a future real-cloud authorization token**. Fake adapter eligibility is limited to `fake-r2|fake-drive`, account `demo`, container `sandbox`. No credential or cloud adapter exists. An unknown location is rejected; missing object diagnosis requires routing/permissions evidence rather than equating 404 with absence.

A durable per-snapshot idempotency map deduplicates identical requests across engine instances/tabs. Reusing a key with different input fails. It is not a shared production mutation key because Beta cannot invoke production/cloud operations. Capacity fails closed at 500 jobs / 5,000 objects; no automatic pruning of dedupe history. UI actions use fresh request IDs; transport retry callers must reuse the original request/key.

Transitions are validated in contract.mjs. Implemented fake path: requested → validated → planned → queued → executing → verifying → completed, or executing → failed. Other formal states are reserved and are not claimed implemented recovery routes. Fake content equality is labeled `simulated-content-equality`, `providerEvidence:false`; no API acknowledgment, real checksum or downloaded hash is implied. Events share the job ID with sequence, timestamp, stage and source component. They are committed atomically together, not real-time external executor spans.

## Shutdown and rollback

Beta Mode gates the interface, not core semantics. Direct navigation while disabled does not open the database or execute operations. Re-enabling in an already-open page initializes it. A storage change hides the interface, clears transient clipboard/selection/preview and rejects new actions. An already-started synchronous fake transaction either commits completely or aborts; toggling the interface never cancels or deletes it. Reopening inspects retained receipts. Closing during commit follows IndexedDB atomicity; retry with the same ID or inspect before making a fresh request. There is no active external queue to abandon in this prototype. Before asynchronous/cloud executors are installed, implement durable checkpoints, uncertainty reconciliation and explicit cancel/resume policy; reserved states alone are insufficient.

The page provides read-only feature/risk comparison and per-job diagnostics. Full action-level UI spans, secure diagnostic export, gateway registration, adapter negotiation, auth scopes, fault injection, performance benchmarks and actual provider recovery are unfinished. `request.content` and read result bodies are fixture data in the private local simulator; these snapshots are not sanitized support bundles and must not be exported as such.

## Future adapter boundary (specified, not implemented)

A production adapter must expose versioned capabilities, account/container/object identity and revision semantics, list completeness/cursors, read/stat, conditional writes/copy/delete, resumability, auth scopes, limits and native versus fallback operations. Executor and provider must be distinct. It must return operation-bound identity/version/checksum receipts and classify ambiguous outcomes without automatic replay. R2 reuses existing verified algorithms only after contract/fault tests; Google Drive requires actual object IDs and native document semantics separate from Google Cloud Storage. Fake exact-key models do not prove those semantics. Read-only diagnostics must never call preparedProfile or provision a Worker. New adapters cannot be advertised as available until implemented.

Machine-readable structural schema: `extension/file-engine/schema.json`. Runtime validation adds operation-specific and identity safety rules. Validate both; the schema is not an authorization mechanism.
