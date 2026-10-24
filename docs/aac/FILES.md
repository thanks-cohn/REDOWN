# Authorized file sessions 1.0.0

The single cold entry is `docs/aac/START_HERE.md`. Filesystem execution delegates to the canonical Universal File API 0.2.0. This interface is an owner-launched JSON-lines process or an embedded session. It is not a network service or MCP server. The optional MCP wrapper was evaluated and deferred: stdio plus a documented schema supplies the required process boundary without an additional protocol dependency or filesystem engine.

Start a credential-free, ephemeral simulation with exactly the desired operations:

```sh
node agent/files/cli.mjs --simulation --operations list,metadata,read,copy
```

Send one JSON object per newline; receive one JSON envelope per line. State survives across lines until process exit. Input is bounded at 3 MiB before parsing; incomplete lines are rejected. Each process has 32 execution attempts, 100 listing items per page, 25 job summaries per page, and the coordinator's existing 2 MiB object ceiling. Large binary reads are explicit operations; discovery and job summaries never return file bodies.

```json
{"method":"describe"}
{"method":"execute","input":{"request":{"apiVersion":"0.2.0","operation":"list","idempotencyKey":"browse-1","source":{"provider":"fake-r2","account":"demo","container":"sandbox","key":"Documents/"},"limit":10}}}
{"method":"execute","input":{"request":{"apiVersion":"0.2.0","operation":"copy","idempotencyKey":"copy-1","source":{"provider":"fake-r2","account":"demo","container":"sandbox","key":"Documents/Example.txt"},"destination":{"provider":"fake-r2","account":"demo","container":"sandbox","key":"Documents/copied.txt"}}}}
{"method":"jobs","input":{"limit":10}}
```

Use the returned job ID for `inspect`, `evidence`, or `resources`:

```json
{"method":"resources","input":{"id":"RETURNED-ID","metric":"getLatencyBreakdown"}}
{"method":"resources","input":{"id":"RETURNED-ID","metric":"getMemoryProfile"}}
{"method":"evidence","input":{"id":"RETURNED-ID"}}
```

`plan` accepts the same request as `execute`. `resources` also permits `getTrace` and `explainSlowdown`. Evidence is HMAC-redacted; whole-runtime memory is not per-file allocation attribution. `inspect` is an explicit scoped job read and may include file result content; use summaries or evidence for compact diagnostics. `cancel` and `reconcile` require those explicit session permissions and a session-owned job; cancellation is cooperative and reconciliation never authorizes replay. Global recovery is deliberately unavailable.

For a real adapter, the trusted owner bootstrap imports `createFileSession` from `agent/files/api.mjs` and calls it with `{engine,scope:{operations,locations,maxOperations}}`. Locations are canonical `{provider,account,container,key}` identities: an empty key grants that container; a trailing slash grants that prefix; other keys grant an exact object. The owner supplies an already configured coordinator with its own authorizer. Effective permissions are their intersection. The agent receives only `session.query(method,input)`. It receives no engine, collector, journal, adapter, bearer, or Cloudflare administration credentials. The session schema is `agent/files/session.schema.json`; operation requests use `extension/file-engine/schema-0.2.json` plus coordinator semantic checks. Session-owned IDs do not confer access after coordinator permission revocation.

Possession of the owner-created stdio pipes or embedded query capability is authorization to use that scope. Do not expose them as an unauthenticated network endpoint. No startup discovers browser sessions, deploys Workers, grants cloud permissions or changes R2 destructive-operation gates. The provided CLI supports simulation only; real integration requires the explicit trusted bootstrap above and separate live verification. Tests: `tests/file-agent-session.test.mjs`, `tests/file-engine-authority.test.mjs`.

## Provider adapter contract for maintenance

Adapters stay in the trusted bootstrap. Every identity is exact `{provider,account,container,key}`. `assertIdentity(identity)` must synchronously reject any wrong account/container/prefix. Declare `capabilities.realProvider`, `atomicCreate`, `atomicConditionalDelete`, `multipart`, and `maxBytes` honestly. A real adapter still requires an explicit coordinator authorizer.

| Method | Contract |
| --- | --- |
| `stat(identity, context?)` | Metadata `{key,size,revision,folder,contentType,...identity}` or null; revision identifies the observed object. |
| `list(identity, {limit,cursor,query,sort,recursive}, context?)` | `{objects,cursor,complete}`; stable bounded pages; reject unsupported query/sort and stale cursors. |
| `read(identity, {range?}, context?)` | `{metadata,bytes:Uint8Array}`; exact full/ranged byte count; no silent truncation. |
| `create(identity, bytes, {metadata,idempotencyKey}, context?)` | Atomic fail-if-present create; no overwrite or ambiguous retry. |
| `delete(identity, {revision}, context?)` | Atomic revision-conditional deletion or explicit unsupported error. R2 lab remains unsupported. |
| `ingest(identity, {url,expectedSha256,contentType}, context?)` | Optional; otherwise unsupported. Worker policy must independently enforce origin/size rules. |

`context.resourceTrace` belongs to the trusted instrumentation path. Never return it to a client. Copy/move/rename are coordinator compositions of these primitives, followed by destination readback; adapters must not implement a second transfer coordinator. Evaluate an adapter using identity, capability, authorization, conflict, malformed-response, timeout, uncertainty, concurrent create and byte-oracle tests in `tests/universal-file-engine.test.mjs` and `scripts/r2-lab/conformance.mjs`. Passing `memoryAdapter` tests is not evidence that a new real provider works.
