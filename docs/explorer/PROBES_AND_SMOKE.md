# Explorer probes and smoke tests — 22 October 2026

The continuation starts at main `e9f2dc8`. All 37 remote branch heads were inspected; none was newer. No older branch was blindly merged. This change is extension 0.5.15, additive Explorer diagnostic API 1.0 fields and queries, and an optional Worker6 `readOnlyProbe` capability. Capability discovery, not the version number, determines whether the proxy probe is supported.

## Concrete correction and live boundary

REDOWN copies between Workers using public HTTPS fetch. The provisioning metadata omitted `global_fetch_strictly_public`. Cloudflare's [compatibility flag documentation](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#global-fetch-strictly-public) documents its routing semantics; the [error reference](https://developers.cloudflare.com/workers/observability/errors/) describes same-zone Worker subrequest restrictions. The date alone does not enable this explicit flag.

Provider API inspection found all 13 REDOWN Workers in the connected account had an empty compatibility-flags list. All 13 were patched through the settings endpoint to add only this flag. Subsequent GETs confirmed the flag, unchanged complete bindings and unchanged compatibility date. The sanitized report is [routing-settings-repair.json](verification/routing-settings-repair.json). No object operations or code replacements were run. Rollback removes this flag only, retaining all other settings. New provisioning includes the flag so an explicit later Repair does not regress it.

This establishes a corrected configuration defect. It does **not** establish that the user's original HTTP404 had this sole cause or that Copy/Move/Paste now work in their installation. The incident remains open until that exact route and file identity are retested and destination bytes independently verified. Do not treat same-zone fetch documentation as proof that every404 is a routing error.

## Explicit read-only probe

Enable Debug independently of Beta. In File Explorer select one ordinary file, then Settings → Debug → File Explorer diagnostics → **Probe selected / copied file**. To compare two buckets, first Copy one ordinary file into REDOWN's clipboard, browse its intended destination bucket, then run the probe. A single copied file takes precedence over the current selection. Folders, virtual archive entries, and search selections are not expanded by probes.

The background message contract is:

```js
{
  type: 'explorerDiagnosticsV1',
  operation: 'runReadOnlyProbe',
  input: {
    source: { accountId, bucketName },
    destination: { accountId, bucketName },
    key // exact object key, <= 1024 UTF-8 bytes
  }
}
```

The stored Debug flag and an exact options.html sender are both required. This is an internal extension channel, not an Internet endpoint or a remote agent execution service. The offline agent API cannot invoke it. Saved profiles supply endpoints and credentials; input cannot override tokens or destinations with arbitrary URLs. No raw input identities are returned or persisted by diagnostics.

The result contains a diagnostic operation ID, `readOnly: true`, and named checks with `passed`, `failed`, `unknown` or `unsupported` states:

| Check | Observation | Limit |
|---|---|---|
| source.provider-settings / destination.provider-settings | Actual provider STORAGE binding name and routing flag | May be unavailable with existing OAuth scopes; observes configuration, not running code identity |
| source.api-read | Existing authenticated objects API GET with bytes=0-0; body canceled without buffering | Headers/status only; not a byte hash; a zero-byte object or unsupported range may need interpretation |
| source.direct-head | Authenticated exact-key HEAD from the extension to the source Worker | Does not prove destination Worker routing |
| source.via-destination-head | Destination Worker authenticates to the source using HEAD | Explicit capability required; old code reports unsupported; never falls back to transferBatch |

The proxy is authenticated, workers.dev-only, bounded, rejects redirect following, and performs no R2 get/put/delete. Remote bodies are canceled. No preparation, provisioning, Repair, source deletion, copying or ambiguous-write retry is used. Existing authentication may renew its token and the shared API may retry safe reads. One probe runs at a time. Individual reads have deadlines; no new steps are scheduled after Debug disable or Clear. An in-flight read may finish; results are discarded after disable/clear rather than scheduling further steps. These are sequential checks, not a simultaneous storage snapshot.

Support bundles now retain allowlisted `probe`, `durationMs`, `bindingMatches`, `publicFetchEnabled`, `expectedKey` and per-file request IDs. Timings are local elapsed observations, not provider CPU measurements. Generate a support bundle and review it before download/share as before.

## Reliable diagnoses

Previously, arbitrary source identities in a batch were compared pairwise. Two legitimate different files could become a false key mismatch. Correlation now requires the same operation, HMAC scope and per-item request ID, or an explicit expected-key fingerprint carried across the authenticated Worker wire. Uncorrelated legacy batches stay uncertain. Mismatch comparison is linear in retained identities rather than comparing every pair.

Evidence references now include operation ID and sequence, so descendant events cannot collide with parent sequence numbers. Expired traces are pruned before diagnosis. An unrelated file's successful preview cannot be used to explain another file's404. Named API/proxy checks in a single explicit probe can expose path divergence without claiming a root cause. Transport timeouts/network failures retain structured codes instead of losing them in generic error text. Worker copy subrequests also decline redirect following.

## Discoverable smoke presets

```sh
node agent/explorer/cli.mjs listSmokePresets
node agent/explorer/cli.mjs getSmokePlan --input '{"preset":"transfers"}'
node agent/explorer/cli.mjs getConnectorCapabilities
npm run explorer:smoke -- --list
npm run explorer:smoke -- --preset all
```

| Preset | Coverage |
|---|---|
| diagnostics | Correlation, privacy, schema/import boundaries, diagnostic rules, Debug controls, read-only probes |
| transfers | Actual embedded Worker and background with in-memory storage: exact keys, copy/move/rename, conflicts, verification and source preservation |
| navigation | Destination menus, paging/search, lightbox, private preview/download |
| connections | OAuth login/session/renewal/reconnect, runtime reliability |

The runner accepts only preset names from a checked-in catalog. It has a fixed test-file allowlist, a process timeout, no shell interpolation, and a nonzero exit for failures. Tests use local code and mocked providers/in-memory storage. A green preset never certifies installed Chrome, live Cloudflare, or full release readiness. The seven pre-existing historical/Nested failures remain in `npm test`; presets do not replace the full suite.

Connector discovery reports R2 implemented, local partial (upload/download, no generic filesystem connector/probe executor), and GitHub planned. A future connector must declare its actual implemented read/write/probe capabilities, exact identity encoding and consistency/version semantics. Implement a named adapter and bounded fault tests before advertising probes. Credentials remain inside that connector. Preserve unsupported and unknown states, source retention on uncertain moves, explicit verification receipts, and evidence provenance. This is an extensible starting point, not a promise to diagnose every future defect automatically.

## Verification

- Fixed preset suite: 137 passed, 0 failed after new correlation/probe/UI cases.
- Full suite: 269 tests, 262 passed, the same seven known baseline failures. Assertions and frozen historical hashes were not weakened/refreshed. Exact output: [tests.log](verification/probes/tests.log).
- Syntax check passes; current Explorer source map resolves all anchors.
- Two Explorer schemas valid; all17 simulated bundles pass, new probe fields pass, unredacted fields and unknown probes rejected. Runtime conformance exits0.
- New UI probe interaction tested in JSDOM, including Debug gate, context capture and duplicate-click protection. Ordinary Chromium preview was attempted but the executable could not start in this environment. No new rendered/installed browser pass is claimed; existing historical screenshots are not evidence for these controls.
- Audit-only 0.5.15 package builds with33 allowlisted runtime files; existing root/bundled license mismatch continues to block normal certification. No store upload.
- Live evidence covers provider settings only. New Worker proxy code and extension0.5.15 are source/package changes; they have not been installed/deployed into the user's running session.

## Next incident action

Retest one authorized disposable Copy after the live settings correction. If it still fails, load0.5.15 in an approved extension environment and run the named read-only probe. Unsupported proxy capability requires an explicit Worker code upgrade via existing Repair; collection must not trigger that upgrade. Inspect the redacted checks and operation trace before any additional correction. Independently read/hash the copied destination and confirm source retention, then test Move and Paste. Do not replay an uncertain write automatically.
