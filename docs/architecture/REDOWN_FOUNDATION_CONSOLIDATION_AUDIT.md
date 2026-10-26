# Foundation consolidation audit — before implementation

Base `6767bfb` on latest main; PR #38 and connection repairs are already merged.
This audit records source facts, proposed dispositions and subsequent test evidence.
It does not establish the original live R2 cause or installed Windows acceptance.

## Responsibility and ownership matrix (before / intended after)

| Concern | Authoritative owner / interface | Reads / writes | Must not duplicate | Disposition |
| --- | --- | --- | --- | --- |
| Operations and journal | `file-engine/engine.mjs`, `universal-operations.mjs` | Authorized requests -> one journal, verified receipts | Provider I/O engines in Python, adapter orchestration | KEEP_DISTINCT_WITH_RATIONALE: 0.2/0.3 identity compatibility |
| Provider semantics | `adapters/*`, `provider-contract.mjs` | Native APIs -> capabilities/identities | Global auth, generic journal | KEEP_DISTINCT_WITH_RATIONALE |
| Authorization/session | `scoped-session.mjs`; owner composition `lab-session.mjs`, `agent/files/bootstrap.mjs` | Approved scopes -> scoped calls, owned job IDs | A second generic Doctor gate in R2 session | CONSOLIDATE: optional neutral probe route in existing facade |
| Resource observations | `resources.mjs` / read-only `resourceReader` | Instrumented spans -> bounded Atlas traces | New telemetry/evidence store | KEEP_DISTINCT_WITH_RATIONALE |
| Diagnostic contract | `diagnostic.schema.json`, `diagnostics.mjs` | Safe provenance -> error/projection envelopes | R2 body/header interpretation | CONSOLIDATE provider decoding; GENERATE_FROM_CANONICAL distributions |
| Doctor | Provider probe + scoped route + Python report | Active authorized health snapshot -> local report | Transfer engine, provider HTTP in Python | KEEP_DISTINCT_WITH_RATIONALE, consolidate route |
| AAC | `agent/aac/*` | Claims/evidence -> assessments | Runtime job truth | KEEP_DISTINCT_WITH_RATIONALE |
| Forever Works | `forever/manifest.json`, `FOREVER_WORKS/*` | Obligations, preserved evidence -> records | Live execution/status inference | KEEP_DISTINCT_WITH_RATIONALE |
| Python Lab/SDK | `clients/python/redown/{client,adaptive,lab,doctor}.py` | Local inventory + canonical jobs -> user reports | Provider credentials/native HTTP | KEEP_DISTINCT_WITH_RATIONALE |
| Discovery | `providers.json` vs diagnostic gateway `registry.json` | Provider contracts vs inspection namespaces | Competing routing registries | KEEP_DISTINCT_WITH_RATIONALE: different key spaces and consumers |

## Collision register and justified coexistence

| ID | Overlap / data direction | Failure / synchronization rule | Disposition and trigger |
| --- | --- | --- | --- |
| C1 | JS/Python diagnostic schema and validators | Manual Python copy can drift; nested cause codebook duplicated | GENERATE_FROM_CANONICAL, compiler drift gate, differential tests |
| C2 | Core response helper knows CF body/cf-ray/default provider | Another provider can be mislabeled R2 or lose its native reason | CONSOLIDATE native decoding behind R2 adapter support; core only neutral HTTP mapping |
| C3 | Lab Doctor gate vs scoped facade | New provider requires duplicating routing/validation | CONSOLIDATE in existing facade, owner-injected probe, scope/revocation tests |
| C4 | Coordinator 0.2 vs universal 0.3 operation bodies | Different exact-key/opaque identity compatibility; one lifecycle/journal | DEFER_WITH_RISK: unify only after complete cross-version fault parity |
| C5 | Atlas trace, canonical job evidence, Doctor report | Operation receipt/evidence joins Atlas by operationId; health snapshot has separate time scope | KEEP_DISTINCT_WITH_RATIONALE: reports/projections are not new authoritative stores |
| C6 | Legacy Explorer transport/history, experimental Universal API | Existing user-facing surface differs; promotion remains gated | DEFER_WITH_RISK: no proof safe to delete production Explorer |
| C7 | Generated request/session/provider/diagnostic validators | Different schemas, shared Ajv/esbuild tooling | KEEP_DISTINCT_WITH_RATIONALE: generated deployments; merge build tooling only when useful, not runtime semantics |
| C8 | Python dependency-free validation vs JS Ajv | Runtime/language boundary, bounded supported schema subset | KEEP_DISTINCT_WITH_RATIONALE with cross-language positive/negative fixtures; replace if contract needs unsupported keywords |
| C9 | Core canonical code enum retains LAB_WORKER legacy values | Optional compatibility values, not required fields; unknown canonical values rejected | DEFER_WITH_RISK: future provider uses neutral categories/native mapper; breaking taxonomy migration requires versioning |

No component is removed merely to reduce file count. No new registry, database,
telemetry store, diagnostics engine or competing filesystem engine is justified.

## Cloudflare extraction inventory / coupling map

| Existing module/function | Current owner -> target owner | Shared dependencies / difficulty / safety | Decision |
| --- | --- | --- | --- |
| `diagnostics.mjs:responseDiagnostic` body parser, cf-ray, R2 default | Core -> R2 diagnostic support | Existing envelope/status map; small extraction, privacy/compatibility tests essential | MOVE provider parsing, ADAPT_INTERFACE neutral HTTP helper |
| `adapters/extension-r2.mjs` REST paths, metadata and checks | R2 adapter -> unchanged | Engine identity and neutral diagnostics; conditional writes preserved | KEEP_BEHIND_BOUNDARY |
| `extension/lab-worker.mjs` profile/settings/subdomain/STORAGE/capabilities | R2 support composition -> unchanged physical file | OAuth and saved profile secrets stay in extension; moving whole file adds no safety | KEEP_BEHIND_BOUNDARY, document R2-only ownership |
| `lab-session.mjs` four buckets/write prefix/OAuth grants | R2 owner composition -> unchanged | Explicit lab authorization, no generic core bucket list | KEEP_BEHIND_BOUNDARY |
| `lab-session.mjs` Doctor request routing | R2 composition -> scoped facade | Neutral root index / operation, no provider API details | ADAPT_INTERFACE |
| `background.js` embedded STORAGE Worker / provisioning | Existing R2 infrastructure -> unchanged | Production Explorer, deployed compatibility, explicit authorization | KEEP_BEHIND_BOUNDARY |
| `cloudflare-api.js`, `cloudflare-auth.js` | R2 OAuth infrastructure -> unchanged | Native secrets never leave extension | KEEP_BEHIND_BOUNDARY |
| `adapters/r2-http.mjs`, `scripts/r2-lab/*` | Separate leased R2 lab infrastructure -> unchanged | Historical independent acceptance route, not extension evidence | KEEP_BEHIND_BOUNDARY |
| `worker/src/index.js` ASSETS sample | Standalone sample -> unchanged | Not extension runtime or health proof | DEFER_WITH_RATIONALE: no production substitution |
| Python Doctor/Lab extension CLI | Generic reporting over chosen transport | No R2 routes/tokens; GUI extension-first is a product transport choice | KEEP_DISTINCT_WITH_RATIONALE; neutral library fixture required |

The universal identity contract accepts adapter-owned locators; the coordinator
routes by provider and capabilities. R2-specific settings, policies, credentials and
Worker deployment must never become mandatory generic request fields. Ordinary new
provider additions should modify adapter/owner composition and contracts, not core
operations, Atlas, AAC, SDK or Doctor. New semantics beyond current API still need
an explicit versioned contract extension; this is not a promise of limitless parity.

## Verification and decisions after implementation

PENDING. Track exact patches, tests, overhead measurements and inherited failures
here and in `verification/consolidation/`. Initial records predate source edits:
[incident](../../FOREVER_WORKS/bugs/FW-REDOWN-FOUNDATION-CONSOLIDATION-20261025.md).

## After implementation — confirmed decisions

Corrective source commit: `f44cdc4` (full immutable link is in each distinct bug record).

- C1: implemented. Root diagnostic event semantics are authoritative once; shallow
  causes reference the root with zero nested causes. The existing generator now
  owns diagnostic JS, codebook, Doctor JS and Python distribution. Tests corrupt
  each artifact and require drift failure. JS/Python/independent jsonschema agree
  on cause nesting, unknown fields, trace IDs, numeric types, Unicode/native-code
  digit semantics and privacy mutations. No new schema or protocol version.
- C2: implemented. `adapters/r2-diagnostics.mjs` owns Cloudflare body/cf-ray parsing.
  Core only classifies HTTP and accepts already sanitized caller-native metadata;
  default provider is unknown. Existing R2 fault tests preserve their exact evidence.
- C3: implemented. `createScopedSession({probe})` optionally owns one Doctor route.
  It validates selector/input, coordinator authority before AND after the callback,
  existing execution budget and published Doctor output. Required failed/untested
  steps cannot accompany PASS; malformed diagnostics and mutation claims are rejected.
  R2 lab composition only injects its active provider probe and retains OAuth,
  namespace and four-bucket write authorization. R2-specific unsupported health
  operations remain inside R2 support. No callback means no advertised Doctor.
- Fake neutral-reference and the EXISTING local-reference adapter use this hook;
  actual filesystem bytes remain unchanged. The real Python Client over stdio runs
  that same local Doctor without extension, Worker, OAuth or cloud tokens. Optional
  smoke is still denied without separate write approval. No production provider was
  invented or registered merely to make a portability claim.

The existing R2 `lab-worker.mjs` remains physically where deployed imports expect it;
it is explicitly R2 support, not generic Doctor orchestration. The new 14-line native
parser support module is a boundary extraction, not a framework. The independent
local fixture owns no production provider state; only the existing adapter operates
on its owner-exclusive temporary directory. Node and Python validation remain
separate deployments of one contract, with differential tests preventing drift.

## Measurement, inherited debt and limits

The benchmark uses actual local-reference filesystem metadata failures (64 operations,
three trials) and 10,000 envelope validations. Atlas on/off includes journal/cloning
and collector costs; it does NOT isolate diagnostic-only overhead. Raw before, loaded
after and isolated-after runs are retained. Before medians: 63.85 ms with Atlas off,
228.01 ms with Atlas on, 38.50 ms for 10k validations. Isolated-after medians:
65.83 ms / 220.51 ms / 40.37 ms respectively. A concurrently loaded run was slower
and is not erased. No significant speedup, cross-machine performance guarantee,
new retention buffer or arbitrary CI timing budget is claimed. Existing hard limits
(16 KiB envelope, 3 flat causes, 64 Atlas traces, bounded native frames and job ring)
remain the enforceable resource bounds. Optimize only with representative evidence.

Nine inherited Node failure categories are outside this consolidation:

| Category | Exact scope | Disposition / next action |
| --- | --- | --- |
| Frozen source evidence | 2 agent catalog, 2 debug, 2 semantic tests | Preserve immutable snapshots; separately version a replacement/freshness migration |
| Removed UI feature | Nested drag-handle expectation | Owner-approved UI/test expectation decision, not schema/Doctor work |
| Issue disposition | Partly-addressed label assertion | Reconcile issue inventory with current source under its own owner |
| Provisioning sequencing | Destination-editor refresh mock | Isolate current setup/message contract under its own UI test |

The existing reliability ratchet recognizes seven as known and still labels two
historically reproduced failures new. Preserve that failed release state; do not
relabel it as certification. Forever Works frozen source freshness is separate,
also failing; its preservation evaluator passes. Exact logs are retained.

Remaining risks/deferred work: C4/C6 legacy operation and Explorer orchestration;
numeric-only native code representation and legacy LAB_WORKER code compatibility;
partial OTLP/clock/Worker instrumentation; dependency-free Python validator is a
bounded current-contract implementation, not a general JSON Schema engine; no
fleet report rotation; installed Windows/live R2 acceptance. New semantics beyond
ordinary existing operations may require a versioned contract extension. None of
these gaps justifies another engine, generic provider registry or telemetry store.

Decision: consolidation-ready as a bounded source foundation with the stated
contract gates, NOT universally certified or live-write accepted. The owner Doctor
response and independent byte readback are still the only route to closing the
historical write incident. Larger transfers remain deferred.
