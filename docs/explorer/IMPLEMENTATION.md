# Explorer diagnostics implementation stages

## Stage A — architecture and portable diagnostic core

Existing surfaces were inspected before implementation. Project API0.1 navigates pinned source, debug0.1 reads historical incident journals, semantic API models proposed relationships, and runtime1.0 records bounded HTTP/message observations. Runtime1.0 cannot return an Explorer operation timeline or exact identity comparisons. None safely executes a remote agent command. Frozen historical contracts/hashes remain unchanged; no accepted Forever model exists. New Explorer diagnostic1.0 is an additive domain-specific adapter, reusing the same dependency-free collector pattern and Debug authorization boundary rather than replacing these namespaces.

Machine map: `agent/explorer/model.json` connects23 Explorer operations, source symbols, DOM identities, state owners, messages, retrieval mechanisms, transformations and tests. `validateArchitecture` exposes unresolved/stale anchors; these are implementation-navigation observations, never runtime/Forever intent proof. The offline `agent/explorer/cli.mjs` adds no credentials/network/execution surface.

Core:64 operations×64 events maximum,24h retention,262144-byte export cap; HMAC-SHA256 identities scoped to a random run key that is never exported. Unknown raw fields, tokens, URLs and names are dropped. Whole import validates before application. Restart can mark unfinished work unknown; eviction/truncation and observation-only outcomes remain explicit. Diagnostic rules distinguish HTTP404 from a source lookup miss, compare exact key/bucket fingerprints only in the same scope, and compare API successes with Worker failures without inventing a root cause.

StageA tests: six new core/API cases passed (HMAC/privacy,404/path divergence,identity drift,atomic malformed import/bounds,retention/restart/disabled collection,portable queries). Runtime instrumentation and installed/deployed evidence are not part of StageA; they follow separately. No incident is closed by this stage.
