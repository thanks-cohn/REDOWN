# Universal File API 0.2 and four-bucket laboratory

This is a working, partial implementation, not Phase 2 acceptance or approval to replace the production Explorer. Start with `extension/file-engine/catalog.json`, `readiness.json`, and `verification/r2-lab/coverage.json`. The authoritative owner specification remains `FOREVER_WORKS/FW-REDOWN-P2-R2-API-PARITY-20261023.md`.

## Run locally

Use Node 22+ with Web Crypto and Python 3 with `jsonschema` and `referencing` (the repository already uses these for schema conformance):

```sh
npm ci --ignore-scripts --no-audit --no-fund
python -m pip install jsonschema==4.26.0
npm run file:verify
npm run beta:selftest
npm run beta:acceptance
npm run check
npm run reliability:check
python scripts/package_chrome_store.py --audit-only
```

`file:verify` covers unit/behavior/fuzz/stateful/fault/concurrency/transport tests, independent JSON Schema negative controls and the actual pinned Forever Works reference API. No cloud credentials are used. Browser acceptance needs Playwright plus a permitted ordinary Chromium executable (`CODEX_PRIMARY_RUNTIME_NODE_MODULES` and `BETA_CHROMIUM_PATH` in this environment); it does not certify an installed extension. The existing package license mismatch intentionally blocks a release package. Full reliability retains historical failing assertions; see checked-in reports. Never refresh frozen hashes to manufacture success.

## Cold agent discovery and execution

`node agent/diagnostics/cli.mjs getConnectorCapabilities` exposes the catalog and readiness through the existing read-only gateway. `extension/file-engine/schema-0.2.json` is JSON Schema 2020-12; runtime validation additionally checks byte lengths, literal paths, capability semantics and UTF-8 boundaries. `catalog.json` links operation IDs (`file.copy`, etc.), executable request examples, controls, source and UX mappings. `describe()` negotiates adapter capabilities. The caller injects a journal and adapters; the core does not know about Beta Mode.

```js
import {createFileEngine} from './extension/file-engine/engine.mjs';
import {memoryAdapter} from './extension/file-engine/adapters/memory.mjs';
import {fileStore} from './scripts/r2-lab/file-store.mjs';
const store=fileStore('work/my-agent/journal.json');
const engine=createFileEngine({store,adapters:[memoryAdapter(store,'fake-r2')]});
const job=await engine.run({apiVersion:'0.2.0',operation:'copy',idempotencyKey:crypto.randomUUID(),
  source:{provider:'fake-r2',account:'demo',container:'sandbox',key:'Welcome.txt'},
  destination:{provider:'fake-r2',account:'demo',container:'sandbox',key:'My-copy.txt'}});
console.log(await engine.exportEvidence(job.id));
```

Engine `plan`/`run` require explicit `authorize(request)` for real providers; default authorization only permits simulated adapters. Adapter possession is an additional capability, never a substitute for authorization. `reconcile` rechecks current read authorization. The inspection gateway cannot execute operations or obtain stored credentials. Raw owner journals include private request/content state; keep them local. Use `exportEvidence` for HMAC-redacted shareable traces. Fingerprints are instance-scoped. They correlate within one instance, not permanently across restarts.

Each accepted request receives a durable operation ID, canonical request fingerprint, persisted state transitions, precise classified error, checkpoint and verification strength. Identical idempotency keys return the same job; different content with that key fails. Atomic IndexedDB transactions and a lock/atomic-rename/fsync file journal prevent two callers reserving the same request. Independent user actions need a deliberately shared idempotency key to be recognized as duplicates. There is no global queue scheduler, distributed ownership lease or fairness guarantee.

## Live laboratory preparation

Live mutations are authorized exclusively in `test-1-new` through `test-4-new`, under a random `__redown_test__/<uuid>/` prefix. Never repurpose an existing Worker, bucket, credential, profile, history or policy. The laboratory Worker is a new temporary resource with only four R2 bindings, pinned fixture URLs, a four-hour lease and the hash of a new random bearer. It has no account credential or production binding. Read the generated deployment plan before using the connected Cloudflare management API.

```sh
npm run file:prepare -- <authorized-workers-subdomain>
npm run file:deployment-plan
```

Preparation refuses to overwrite existing local config. Archive completed evidence and remove only obsolete local config before preparing a fresh run. Keep `work/r2-lab-secrets.json` private; never paste it into diagnostics or a PR. The nonsecret deployment payload is `work/r2-lab-deploy-code.json`. With the connected Cloudflare tool, first GET `/accounts/<account>/workers/scripts/<new-name>` and require 404/nonexistence. Then execute its generated code once, and enable the new Worker's workers.dev endpoint with POST `/accounts/<account>/workers/scripts/<new-name>/subdomain`, body `{ "enabled": true, "previews_enabled": false }`. Do not run deployment against a preexisting script. No bucket/domain policy change is necessary.

```sh
REDOWN_ALLOW_LIVE_R2=1 npm run file:live
REDOWN_ALLOW_LIVE_R2=1 npm run file:live-ui
```

The live command exits nonzero for failures, blocked scenarios or incomplete cleanup. A nonzero result with 20 capability blocks is intentional, not release success. It writes a fixture manifest *before* each mutation, durable raw journal and structured report under `work/r2-lab/<uuid>/`. The UI command uses the actual Beta page with a fresh ordinary Chromium profile and loopback authenticated proxy. The true bearer never enters the browser. It verifies upload, text preview, copy and fresh source/destination hashes, records its fixture manifest and cleans both objects. This is not installed-extension, credential-sharing or all-controls acceptance.

`conformance.mjs` accepts an engine, provider locations and an independent remote oracle; reuse this interface for a second real provider. The R2 oracle bypasses the engine and adapter result path and reads the Worker R2 binding afresh; it still shares the transport Worker. Public fixtures get an additional anonymous r2.dev hash read. Management-API cleanup inspection provides a separate channel. Do not describe the oracle as a completely independent provider implementation.

Budgets: 2 MiB/object, 256 manifest objects, 2,000 counted harness requests, 32 MiB cumulative **oracle-read** bytes; recursive operations stop at 1,000 entries and batch concurrency is at most four. These are distinct limits, not a total account bandwidth quota. The UI proxy separately caps 100 forwarded requests and 3 MiB/request. There is no large streaming/multipart certification.

## Corpus and evidence

The generator `python scripts/r2-lab/generate-fixtures.py` deterministically creates newly authored CC0 files: PNG, SVG, PDF, WAV, ZIP, HTML, JSON, CSV, multilingual/emoji text, empty bytes and arbitrary binary. `test-fixtures/r2-lab/manifest.json` pins cryptographic hashes and sizes. Their CC0 dedication applies only to these fixtures, not REDOWN's application license. Workers fetch immutable commit-pinned public repository URLs, refuse redirects and verify expected hashes before writing. No third-party copyright or mutable arbitrary download source is needed. Add a licensed source only with its license, immutable URL/hash, bounded size and an explicit allowlist update.

`verification/r2-lab/initial-failed.json` retains the actual failed attempt: Workers rejected `redirect: 'error'` for remote fetch. The corrected Worker uses `manual` and rejects non-success responses, including redirects. Downstream failures from that first attempt remain recorded; they were not erased. `previous-live-pass.json` records an earlier corrected 97 passed / 0 failed / 20 blocked subset across all sixteen ordered bucket-copy directions, conflict preservation, eleven ingested file types per bucket, ranges, pagination, create races and public/private checks. `live-ui.json` is the separate ordinary Chromium/live-provider subset. Simulated browser evidence is labelled separately. Named matrix passes establish only those assertions, not exhaustive coverage of a category. The normalized matrix uses `rowFields` and integer dictionary references (`dimensions`, `statuses`, `reasons`); the final cell contains assertion IDs. Every cell of the Cartesian product is present, including blocked and not-applicable cells.

A run is not clean merely because deletion returned success. Cleanup checks manifest hash/ownership/etag, deletes only exact owned keys, confirms each absence, lists the entire run prefix and then uses the management API to corroborate emptiness. Never purge an entire bucket or delete any bucket. Cleanup is a **lab-only** manifest procedure, not the general engine's safe deletion API. It assumes an exclusive run prefix: R2 head-then-delete is not atomic against a hostile concurrent replacement. Remove only this newly created Worker after cleanup with DELETE `/accounts/<account>/workers/scripts/<new-name>`; corroborate 404. Preserve failures and leftovers rather than guessing. A lease expiration blocks requests, not physical object retention; inspect the manifest through authorized management tools if a lease expires before cleanup.

## Recovery, rollback and migration

Turning off existing `betaModeEnabled` hides the interface and rejects new UI work, while the current page's in-flight work reaches its safe boundary. It does not silently cancel it. Closing the page can interrupt execution. Reopen owner state and call `recover()` only when the prior executor is known stopped: active requested/validated/planned/queued/executing/verifying jobs become `uncertain`, never replayed. `reconcile(id)` reads surviving destinations under current authorization without modifying remote state or claiming automatic safe retry. Inspect source and destination before issuing a separately authorized new request. Cancellation is cooperative between bounded steps: an accepted write may remain, with partial/uncertain state and checkpoints; no automatic destructive compensation is attempted. Concurrent `recover()` against a running owner is unsupported.

The production Explorer remains on its original implementation. Beta 0.1 clients use a compatibility projection over the same canonical coordinator as 0.2 programmatic clients. Existing Beta snapshots retain their schema; old incompatible dedupe fingerprints fail conservatively rather than rerun. Only Beta's own IndexedDB is written. No production credentials are read: live UI configuration is explicit and ephemeral, restricted by the adapter and Worker. Legacy/Beta comparison remains observational, never double execution. The additive Forever companion uses the real pinned 0.1 schemas and preserves frozen historical intent/evidence.

Retiring legacy requires **all** authoritative Phase 2 acceptance gates, every UX control mapped and accepted, safe destructive operations, failure/restart recovery, installed-extension/security/accessibility verification, a second distinct real provider, performance/competitor comparisons, reviewed credential/profile/history migration and rollback, resolved machine-readable blockers, and explicit owner promotion approval. Current blockers also include binary/media UI (the current UI uploads/previews small text fixtures), R2 search/reverse sort, context menus/drag-and-drop/multi-selection, keep-both/overwrite, multipart, local/cross-computer adapters, automatic retry/resume and queue leases. These must remain unavailable or clearly unsupported until implemented and tested.

A later repeated-prefix validation attempt hit `JOURNAL_BUSY` after a concurrent create and retained a lock with an interrupted job. The manifest cleanup completed; `journal-lock-failed.json` preserves all failures. Local durable-client tests pass, but the live lock cause is unresolved and remains a readiness blocker. Do not remove a lock while another owner might be running; preserve the journal, establish that its owner stopped, inspect/reconcile and use a new run prefix. The fresh-prefix rerun in `live.json` finished with 96 passed / 1 failed (`JOURNAL_MISSING` in a concurrent upload) / 20 blocked; `fresh-prefix-failed.json` retains the same attempt separately. The delivery journal now detects backward sequence changes and refuses further writes; its rollback regression passes offline. Neither that guard nor the earlier passing run closes the live durability issue. All three remote prefixes were independently found empty; the newly created Worker was deleted and its absence confirmed in `final-cleanup-and-teardown.json`.

Resource Atlas instrumentation and its current acceptance blockers are documented in
[RESOURCE_ATLAS.md](RESOURCE_ATLAS.md). Its read-only `resources.*` operations use the
existing diagnostics gateway; actual coordinator/adapter spans do not imply universal
provider readiness or close the failures recorded by the live laboratory.
