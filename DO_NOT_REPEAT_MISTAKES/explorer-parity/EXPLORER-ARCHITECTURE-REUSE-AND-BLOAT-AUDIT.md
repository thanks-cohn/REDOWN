# Explorer architecture, reuse and bloat audit

Status: **AUDITED / implementation and installed acceptance open**. Updated 2026-10-28 (America/Chicago). Inspected `beta-explorer` at `a7effa80b20a4d12f9e6837486ff1d7f7e52ebd9`. Owner: REDOWN maintainer; subsequent operation authors maintain these references.

## Actual engines and byte routes

| Route | Actual call chain and verification | Reuse / boundary |
|---|---|---|
| Legacy local upload | `options.js:uploadLocalFiles` (1405) → `RedownCloudflareApi.request` → REST object PUT; response size, absent-before lookup, recent history | Same direct endpoint as Beta. No integrated multipart uploader; unsafe to call this a larger-file escape hatch. Queue retains File handles only while page lives. |
| Beta local upload | `explorer.mjs:upload` (150) / dropped folder collector → `file-api.mjs:batch/run` → `r2-adapter.mjs:upload` (171) → REST PUT to random staging key → metadata → `verifyUpload` (59) streams local/remote bytes → shared `cfTransferObjects` move to final key | Already stronger byte verification and conditional final conflict handling. Keep this orchestration; add only a supported large-write strategy later. Staging leftovers are explicit recovery keys. |
| Ordinary cloud copy/move/rename | Both UIs → `cfTransferObjects`/`cfRenameEntry` → `background.js:transferExplorerObjects` (1689), expansion/planning → Worker `transferBatch` → `copyVerifiedObject` (115) → `verifiedObjectPut` (107); move → `deleteKeys` with source/destination metadata checks → absence check | One shared production engine already exists. Streaming R2 get/body/put, conditional destination, optional MD5 validation, receipt + independent head; no client full-file hash, no 16 MiB/300 MB gate. Final delete is unconditional after preflights, not atomic object-version deletion. |
| Download | Legacy `explorerDownload` (3331) and Beta adapter `download` (215) → shared `cloudflare-api.js:download` (143) → authenticated Chrome downloads | Already browser-to-disk streaming, terminal ID events, no JS payload buffering/size gate. Beta waits ≤30 minutes; Legacy returns control while callback continues. Neither proves downloaded SHA-256. |
| TRUE REMOTE | Right-click `contextMenus.onClicked` / popup and Beta `remoteIngest` → `ingestCloudflareAtPrefix` (1892) → embedded Worker remote fetch → STORAGE | Reused by Beta, URL-only messages. Known length → FixedLengthStream; unknown length → chunks + combined allocation. Shared 300 MiB env budget. Not multipart, not arbitrary unlimited streaming. |
| Preview | Legacy `showWorkspacePreview` (1575) → shared `preview/readableResponse`; Beta `showPreview` (356) → adapter preview | Deliberate second orchestration adds effective configurable memory/text bounds but misses shared 403 public fallback and Legacy renderer coverage. Adapt shared reader with options; retain Beta presentation modes. |
| Archive | Legacy `openArchive`, `previewArchiveEntry`, `extractArchiveSelection`, archive clipboard → `cfArchive*` → embedded Worker range index/entry/decompression | Beta reuses list/extract but not entry URL / cross-bucket extraction routes. Wire these behind same API. Never import options.js wholesale (it installs a whole Settings UI). |

Source: [Legacy UI](../../extension/options.js), [Beta UI](../../extension/beta/explorer.mjs), [adapter](../../extension/beta/r2-adapter.mjs), [API](../../extension/beta/file-api.mjs), [shared client](../../extension/cloudflare-api.js), [embedded Worker + background](../../extension/background.js).

## Duplication and smallest integration

1. Listing envelope parsing is duplicated between `listObjectsPage` and adapter `page`; both request 1000 objects, but differ on malformed/truncated cursors and RFIS observation. Do not merge during this audit. Later extract a tested read-only decoder if needed, without changing pagination.
2. Preview repeats bounded chunk collection and Blob creation. Reuse `readableResponse` including public fallback with per-operation budgets; keep memory limits separate from transfer capacity. Consolidate MIME mapping (Legacy honors metadata; Beta is extension-only).
3. Metadata lookups repeat prefix scans: Beta `stat` can scan 1000 pages, Legacy properties reads one page, Worker has authenticated `headObject` and ranged `/object`. An adapter read-only stat integration could avoid full prefix walks but must retain exact keys, metadata shape and no provisioning.
4. Capability checks occur in GUI `ensureWorker`, adapter `connectionStatus`, background `preparedProfile`, and cross-bucket settings checks. These protect different freshness/authorization boundaries; do not simply delete them. Measure calls before introducing a bounded invalidatable cache. Explicit setup remains intentional.
5. Test It repeatedly hashes originals/current copies for provenance; this is separate from ordinary Worker copy verification and Beta staging byte comparison. Keep session policy out of the engine; use its existing policy hook. Do not restore obsolete atomic-delete prerequisite or add a second practice engine.
6. Beta sends one API operation per selected object; background then batches expanded folder contents by 25/100. This adds preflight/network overhead for many small selected files. Reuse existing multi-entry transfer method when evidence/correlation and partial identity accounting are preserved. Do not silently raise Worker request budgets.
7. GUI and background keep distinct navigation/clipboard/history/receipt state. Navigation history is not a durable mutation journal. Test It provenance is not general operation recovery. Prefer a compact outcome record to another observer subsystem.
8. Public URL construction already has `RedownPublicAddresses.popover`; Beta uses it. Add its missing explicit enable action only after extending sender checks correctly; reuse established confirmation/read-back.

## Existing large-file implementations: what is and is not reusable

**Legacy can CODE-INFERRED download existing 1 GiB+ objects through Chrome and copy/move/rename objects above 300 MB through shared Worker streams**, subject to single-write/provider/runtime limits and 25/30-second deadlines. Beta already uses the same routes. This is not a confirmed ordinary Beta file-size regression. Legacy local uploads are also capped at 300,000,000 bytes. TRUE REMOTE can CODE-INFERRED accept 300,000,001–314,572,800 bytes with known length under default MAX_BYTES, and Beta reuses it; it is not a local-file route.

No active `createMultipartUpload`, `uploadPart`, `completeMultipartUpload` or multipart resume implementation was found in extension, worker, local or Windows source. `FixedLengthStream`, HTTP ranges, directory batches, gallery chunks and resumable *search* are not multipart uploads. Worker archive range reads already avoid loading a whole archive merely to list it; entry extraction still buffers. Provider-native multipart APIs are a future integration dependency, not existing REDOWN behavior.

`worker/src/index.js` is a separate ASSETS sample (100 MiB default, only 2d/3d/files destinations), not the extension's deployed STORAGE engine. `local/bridge.mjs` forwards URL JSON, not filesystem bytes or a sync engine; popup currently calls background directly. Windows CMake references missing `windows/src/main.c`. GitHub Actions fetches remotely to a repository but is not an Explorer provider/large R2 uploader. No integrated CLI/native route removes the local upload ceiling.

## Measurable baseline and anti-bloat gate

[evidence/source-baseline.json](evidence/source-baseline.json) records exact line/byte counts and SHA-256 per active source; [source limit candidates](evidence/source-limit-candidates.txt) is a reproducible search inventory, not an alternate implementation. Existing Test It benchmark retains six copy inspections, four journal writes and one progress write per 20 calls in its local fixture (see prior handoff); no new performance claim was made here.

Next repairs must report net production lines/dependencies, shared routes reused, request counts per operation and peak buffered bytes. Target: zero new engines; zero new dependencies for search/archive/public-link wiring; payload memory proportional to chunks for ordinary transfers. Archive/preview buffers must remain explicitly budgeted. Any new multipart route must have abort/reconcile/expiry tests and preserve the existing final commit/conflict path.

Installed behavior, actual memory peaks, provider throughput, and durable recovery remain UNVERIFIED. A mocked large size is not a large transfer. Maintain with the [index checklist](README.md).
