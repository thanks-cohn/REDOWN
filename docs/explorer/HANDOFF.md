# Explorer diagnostics handoff — 22 October 2026

## Delivery and status

User requested saving and pushing all progress before further investigation. This is a diagnostic implementation and tested preview-URL refresh correction, **not a verified repair of the installed Copy/Move/Paste failure**. The incident remains open in `COPY_404_CASE.json` and its append-only `incidents/copy-404.jsonl` journal. No accepted Forever intent or live incident closure is claimed.

Implementation commits: `a3b22ab` portable core/API; `975b3f9` extension/Worker/Debug integration; `f2868d4` fault fixtures, schemas, architecture refresh tooling and incident record. Merge `f0166c5` preserves upstream `5db380c` automatic CORS serialization fix. The subsequent handoff commit contains this document and final merged-source map/evidence.

## Findings and hypotheses

The user reports Rename, Upload and Download work, while Copy, Move to and Paste fail. The exact warning is `0 files completed · 1 failed. Source object was not available (HTTP 404)`.

In inspected source this wording is emitted by the cross-Worker source-read branch: destination Worker POST transferBatch → source Worker GET `/object?key={encoded-whole-key}`. Preview/Download use the OAuth objects API; Rename follows same-bucket verified transfer. Success on these paths therefore does not establish the cross-Worker read is healthy. This is a source-supported distinction, not proof that installed/deployed versions match current source.

Possible causes: a stale source Worker URL/version/profile, an unintended Worker R2 binding, exact-key divergence, or Worker-to-Worker routing behavior. None is established. Public Cloudflare documentation research did not establish a routing restriction as the cause. Do not apply a speculative retry, rebind customer storage, or declare the source missing solely from HTTP404. In-memory actual-code cross-Worker copy succeeds; a deliberately wrong binding reproduces a404. That fixture demonstrates a possible mechanism, not the user's root cause.

## Implemented behavior

- Explorer diagnostic1.0: bounded structured events, per-operation/parent IDs, HMAC identity comparisons, encoding and endpoint classifications, version/capability observations, uncertainty/truncation, deterministic diagnoses and portable offline queries.
- Debug-only inspector, copy diagnostic ID, review-before-download redacted support bundle, persisted bounded observations and clear/disable handling. Beta remains independent. No extra manifest permissions.
- Embedded Worker6 protocol1 source-read/write/read-back/cleanup observations. Existing safe Worker5 remains supported; collection never deploys or repairs it. Provider binding declaration is evidence of a declaration, **not independently verified provider configuration**.
- Legacy exact404 message adapter retains numeric status without inventing Worker evidence.
- Attaching a domain or changing public configuration refreshes already-open matching bucket/preview URL disclosures, shares a bucket snapshot, preserves expanded state and leaves private media in place. Constructed/configured URLs are not labeled independently verified accessibility.

## Coverage and blind spots

| Operations | Implemented evidence | Remaining boundary |
|---|---|---|
| Copy/move/rename/delete/folder | UI/message/background correlation; Worker6 stage events and exact identity comparisons | Installed/deployed/live behavior unverified; Worker5 lacks protocol1 detail |
| Preview/download | UI boundary and OAuth HTTP status/identity; native download callback observations | No claim of downloaded byte hash or installed Chrome result |
| Listing/pagination/search/refresh/navigation/selection | UI/message boundaries, source/state map | Not every internal async callback has full parentage; counts are inspection snapshots |
| Upload/archive | Existing message/UI boundaries | Not every streaming/chunk/provider step instrumented |
| Properties/public URLs/clipboard | UI/message boundaries and configuration model | Clipboard fixture is mocked; configured URL is not public object verification |
| Account/bucket/auth/readiness | State/message/version observations where available | No comprehensive OAuth lifecycle or provider binding-settings inspection |

All23 names in `agent/explorer/model.json` are source navigation, not a promise of complete runtime tracing. Retained descendants may have missing parents. Collector receipt time is not Worker stage duration. Offline CLI cannot execute storage actions. Independent asynchronous UI continuations are not assigned guessed parents.

## Verification

Final suite:258 tests,251 pass,7 known baseline failures (six historical frozen project/debug/semantic evidence failures and the removed Nested drag-handle expectation). Assertions/frozen evidence were not weakened or refreshed. See `verification/tests.log`. Syntax check passes. Explorer: two schemas valid,17 simulated bundles pass, unredacted field rejected. Runtime schema conformance passes (two schemas, five responses, one bundle; oversized rejected); runtime conformance command exits0. Current Explorer architecture resolves all anchors after merge; this is freshness, not runtime proof.

Ordinary Chromium154 local HTML fixtures pass at1366 and390 widths: inspector controls, trace selection, copy-ID mock, reviewed bundle flow, Normal-mode gate, existing storage containment/reduced motion/mode checks, and already-open preview URLs after mocked Attach. These use real UI code with mocked extension/cloud responses, not an installed extension or live Cloudflare. Narrow inspector screenshot was rendered and visually examined; other screenshot artifacts were captured by the harness. JSON reports are retained here. No live customer objects were modified.

Local Node collector microbenchmark is in `verification/benchmark.json`; it measures collector calls only, not Chrome input responsiveness. Audit-only package contains33 allowlisted files for0.5.14; root/bundled license mismatch still blocks normal release certification. No store publication performed.

Installed unpacked extension testing remains blocked by Chromium administrator policy; do not bypass it. Installed extension version, deployed Worker version, actual provider binding, cross-Worker route outcome and live file byte integrity remain unverified.

## Next safe investigation

1. Update/reload extension0.5.14 in an approved Chrome environment; enable Debug Mode, independently of Beta.
2. Reproduce Preview/Download and one failing Copy using a disposable authorized object. In Settings → Debug → File Explorer diagnostics, Inspect operations, Show failures, select the operation, Inspect trace, and copy its diagnostic ID.
3. Generate the support bundle, review its redacted contents, then download/share it. Clear records when finished. A Worker5 trace may be partial; do not silently deploy for diagnostics. Use explicit existing Repair only with appropriate authorization.
4. Compare same-scope API/Worker account/bucket/key fingerprints, observed/expected origins, deployed version/protocol and binding declarations. Read actual Cloudflare script binding configuration only when authorized; do not equate declaration with provider truth.
5. Fix only the demonstrated mismatch. Run disposable Copy, independently read/hash destination and confirm source retained; then test Move verification-before-deletion and Paste. Never blindly retry ambiguous writes.

## Reproduction commands

```sh
npm run check
npm test
node agent/explorer/cli.mjs describeExplorer
node agent/explorer/cli.mjs explainOperation --input '{"name":"copy"}'
node agent/explorer/cli.mjs validateArchitecture
node agent/explorer/cli.mjs diagnoseOperation --bundle /path/reviewed-bundle.json --input '{"id":"operation-uuid"}'
python tests/explorer-diagnostic-schema.py
node scripts/explorer-diagnostics-preview.mjs work/explorer-diagnostics-preview
node scripts/storage-signals-preview.mjs work/explorer-url-refresh
```

After deliberate source edits, `node scripts/explorer-architecture.mjs --write` refreshes only the new current-source Explorer map. Never use it to replace frozen historical evidence.

## Continuation — routing configuration and preset smoke tests

See [PROBES_AND_SMOKE.md](PROBES_AND_SMOKE.md) for the0.5.15 continuation, actual provider settings read-back, named Debug-only read probes, corrected batch identity diagnoses and fixed local smoke presets. All13 connected REDOWN Workers now have the explicit public-fetch routing flag, with bindings/date preserved. This is settings verification, not closure of the original Copy/Move/Paste404. The incident remains open; current new suite269/262/7 retains the prior seven failures. New proxy code/extension installation remain separate deployment boundaries.

Get URL/status follow-up: [GET_URL_AND_STATUS.md](GET_URL_AND_STATUS.md) documents the0.5.16 implementation, exact baseline, URL/clipboard diagnostic codes, source/async guards and native-Chrome verification gap. Use `npm run explorer:smoke -- --preset urls-and-status`. Current full suite288/281/7; smoke163/163. Get URL only reads configured public addresses; never enable public access, modify provider settings or claim verified public object accessibility from this UI.


## Project diagnostic/reliability entrance

See [reliability foundation](../reliability/README.md). `agent/diagnostics/cli.mjs` now provides one offline entrance to current subsystem navigation, existing Explorer traces/test plans and recorded release blockers. `scripts/reliability-check.mjs` runs syntax/architecture/full regressions and distinguishes known debt from new failures. This does not close Copy404 or establish installed/cloud acceptance.


## Unified inspection milestone

All five offline namespaces now route through `agent/diagnostics/cli.mjs` with qualified IDs, explicit ownership, isolated bundle imports and native provenance preservation. Start at [the unified contract](../reliability/UNIFIED_AGENT_API.md). Registry/version drift is a required reliability stage; no new live execution authority or incident closure is implied.
