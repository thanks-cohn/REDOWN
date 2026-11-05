# MEGA S4 initial vertical slice — evidence and limits

The read-only preflight passed with the privately supplied region `ca-west-1`:
signed ListBuckets returned HTTP 200 and bucket `test`; bounded ListObjectsV2
returned HTTP 200. This proves this endpoint/credential/region combination,
not an official region mapping for every endpoint. Cloudflare's previously
verified read-only preflight was not repeated.

The generic S3 adapter uses maintained `aws4fetch` 1.0.20 (MIT, vendored browser
module with its license; npm lock includes integrity metadata). Only the explicit
MEGA endpoint family is currently enabled. The Universal File API owns results;
the provider router fences exact identities; the existing Explorer owns GUI.
R2 adapter, embedded Worker, BOOT engine and native-menu implementation are unchanged.

## Live evidence

`scripts/mega-s4-live.mjs --approved-disposable-write` executed the actual adapter
against MEGA using the inherited proxy with CA verification. It passed bucket and
delimiter listing; new empty-folder marker and empty-folder listing; conditional
binary upload; independent GET byte comparison; readStream byte comparison;
bounded no-disk remote acquisition via a short-lived GET URL for the new test
object; destination byte verification; and cleanup with independent absence checks.
Only new objects under the approved `test/__redown_mega_test__/` scope were written.
This is Node-hosted adapter/provider evidence, not installed-Chrome proof.

## Capability matrix

| Universal File API operation | Status | Evidence / limits |
|---|---|---|
| connect, accounts, buckets | SUPPORTED | Live signed bucket discovery; one memory-only connection |
| connectionStatus | PARTIAL | Cached verified connection; next request detects invalid credentials |
| list | SUPPORTED | Live delimiter listing, empty-folder marker; pagination guards unit-tested |
| listRaw | PARTIAL | Same listing backend without delimiter; multi-page live traversal not verified |
| stat | SUPPORTED | Live HEAD and absence checks |
| readStream | SUPPORTED | Live byte comparison; bounded timeout/cancellation; consumer owns memory |
| upload | PARTIAL | Live conditional keep-both PUT + byte readback; 32 MiB, no overwrite/multipart |
| mkdir | SUPPORTED | Live zero-byte folder marker and empty-folder listing |
| delete | PARTIAL | Live exact-object delete/absence; folder recursion disabled |
| download | PARTIAL | Bounded blob path; reports started; browser completion unverified |
| preview | NOT_VERIFIED | Bounded blob path implemented; installed browser not tested |
| remoteIngest | PARTIAL | Live adapter no-disk acquisition/readback; 32 MiB buffering, no redirects |
| transferHistory | PARTIAL | Last 50 verified receipts in page memory; no source URL; not existing Shelf History/GO TO integration |
| profiles | PARTIAL | Empty result; MEGA saved presets not implemented |
| copy, move, rename | UNSUPPORTED | Disabled; no unverified copy-delete semantics |
| publicUrls, createBucket, prepareBucket | UNSUPPORTED | No public-access, bucket creation, R2 provisioning or deployment |
| archiveEntries, archiveEntryUrl, extractArchiveEntry, inspect | UNSUPPORTED | Not advertised by MEGA adapter |
| cross-provider transfer, native context-menu destination | UNSUPPORTED | Explicitly fenced; existing native R2 behavior retained |

## TRUE REMOTE / Worker feasibility

The browser fallback has no intentional intermediate OS-disk download and uses
the same conditional writer and independent verification as uploads. It buffers
up to 32 MiB per object, with multiple bounded copies during signing/readback.
It is not an unlimited browser-stream implementation. Source fetch uses omitted
credentials/referrer and refuses redirects; source provenance is not sent as
destination headers or metadata. The extension page must remain open.

The actual embedded `WORKER_SOURCE` in `extension/background.js` routes ingest to
`env.STORAGE` with source validation and existing safe-transfer checks. It is not
a generic S3 writer. Workers can technically perform HTTPS fetch and Web Crypto
SigV4 signing, but customer credentials must not be added to public source or
ordinary configuration. A future optional Worker route requires an exact approved
Worker, secure bindings or expiring scoped signing grants, destination fencing,
multipart/cancellation, and independent readback. **worker-direct: NOT_VERIFIED**;
no such deployment was authorized or performed. The native Windows C scaffold
is incomplete; **native-stream: unavailable**. MEGA works without Cloudflare.

## Validation boundaries

Seven new adapter/router tests pass, including identity fencing, conditional
writes, corruption/uncertain results, no replay, cap enforcement and provenance
exclusion. The actual Explorer popup/tab test passes with simulated providers.
Those simulations do not establish installed native behavior.

The syntax check passes. BOOT schema validation accepts six valid fixtures and
rejects three invalid fixtures. Unmodified-HEAD comparison reproduces nine
Explorer failures and two startup fixture failures. Full regression, Explorer
smoke and reliability commands are not green; historical/source-fixture failures
are retained, not rewritten. The full in-process run executed 1,111 tests: 1,000 passed and 111 failed. An unmodified HEAD archive executed 1,094 tests: 983 passed and 111 failed; failure names are not perfectly identical because OneDrive/package fixtures depend on archive layout and ordering. The focused Explorer/login/activation run executed 144 tests: 135 passed and the same nine baseline Explorer failures remained. The new router/adapter suite subsequently expanded to seven passing tests. Reliability remains blocked by the existing architecture anchor `extension/options.js:presetLocationCache` as well as release gates. These results do not establish a green regression baseline. No frozen
catalog/checkpoint hashes were refreshed and no assertions were weakened.

Installed Chrome/Windows acceptance, adversarial endpoint behavior, large-object
multipart, Worker-direct relay, source redirects, durable credentials/jobs/history,
cross-cloud transfer, native-menu MEGA destinations and all-provider release
certification remain outstanding. This is an initial usable vertical slice,
not completion of every P0 acceptance gate.
