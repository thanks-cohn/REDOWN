# Explorer parity acceptance and regression plan

Status: **AUDITED / implementation and installed acceptance open**. Updated 2026-10-28 (America/Chicago). Inspected `beta-explorer` at `a7effa80b20a4d12f9e6837486ff1d7f7e52ebd9`. Owner: REDOWN maintainer; subsequent operation authors maintain these references.

## What this audit actually verified

Local Linux / Node 24.19.0; npm dependencies installed using lockfile and project cache. No cloud credentials, user-file sources/destinations or remote mutations were used. Browser tooling found Chrome/154.0.8037.57, but unpacked extension loading is blocked by administrator policy: `CDP_-32600: Loading of unpacked extensions is disabled by the administrator.` Zero installed-extension assertions; no bypass attempted. This is different from prior handoffs' Chrome-not-available environment.

[evidence/verification.json](evidence/verification.json) is the exact command/result index. Logs are retained, including failed baseline names. Initial attempted test run before npm ci failed because jsdom was absent; it is not counted as a product regression. Dependencies were installed, then fresh tests ran. The 556-test run was on unmodified inspected production/test code; the final run includes six audit characterization tests, without changing existing assertions. Reliability is not green; no frozen source hashes were refreshed.

New [audit characterization tests](../../tests/explorer-parity-audit.test.mjs) are non-destructive and run with `node --test tests/explorer-parity-audit.test.mjs`:

- Local upload metadata at 0, 1, 1 KiB, 1 MiB, 16 MiB, 100 MiB, 300 MB−1, 300 MB, +1, 1 GiB, 5 GiB and 1 TiB; ≤300 MB reaches a sentinel before any network transfer, >300 MB fails before HTTP. **VERIFIED gate routing**, not successful upload at all these sizes.
- Real streamed local 0 B/1 B/16 MiB−1/16 MiB independent SHA-256; +1 metadata denied before body; lying metadata with +1 actual body denied. **VERIFIED inspect budget**, no remote file.
- Copy/download metadata at the same representative sizes dispatched to mocked endpoints without inheriting local upload/inspect cap; URL-only ingest sends no source bytes. **VERIFIED adapter dispatch**, no large copy/download success claim.
- Binary preview budget at 63/64/65 bytes using a reduced configured budget, and independent text truncation; **VERIFIED boundary mechanics**, default 64 MiB inferred from O constant.
- Actual 1024/1025-byte ASCII and multibyte key boundaries, reserved path rejection; **VERIFIED validator**.

Existing focused suite runs Beta ordinary and active Test It actual handlers in jsdom, adapter/background and embedded Worker over memory storage, shared download/auth, cloud Worker and runtime fixtures. It does not reproduce Cloudflare RAM/CPU/subrequests or native Chrome disk/network behavior. Existing Beta tests cover actual 0 B, 50 MiB and 51 MiB binary uploads in memory (not a 50 MiB cap). Benchmark memory buckets buffer intentionally in test code; this cannot prove production streaming memory.

## Final command results

| Check | Actual result |
|---|---|
| Untouched inspected revision full suite | 556 tests: **546 pass / 10 fail / 0 skipped** |
| Existing focused operation suites | **229 pass / 0 fail** |
| New audit boundary characterization | **6 pass / 0 fail** |
| Final full suite | 562 tests: **552 pass / 10 fail / 0 skipped**, exact same ten failure names as fresh baseline |
| Syntax / registry / issue inventory | Passed |
| Reliability / architecture freshness | Failed; existing architecture/evidence failures remain, not release certified |
| Relative document links / source snapshot hashes / diff whitespace | Passed; see verification.json for counts |
| Installed Chrome / live R2 | Policy-blocked with zero browser assertions / UNVERIFIED |

The ten retained failures: offline catalog discovery; catalog IDs/evidence/hash consistency; debug discovery/history; pinned original Markdown preservation; current Explorer architecture references; explicit issue labels; removed Nested drag-handle expectation; provisioning UI fixture; semantic vertical contract; semantic finite coverage. Exact test names and before/after outputs are retained in evidence. No assertions, catalog baselines or frozen hashes were changed.

## Required comparison protocol

Run both explorers against the same disposable exact source/destination namespace, provider profile/Worker version, source bytes, conflict state and permissions. Establish baseline object size/metadata/version and independently computed SHA-256 outside the UI. Use isolated copies; never move/delete originals or adopt filenames as ownership evidence. Large live transfer/cost experiments require an approved disposable namespace and size budget. This audit only defines those experiments.

For each operation record: inspected commit, extension build/version, browser/OS, Worker version/hash/configuration identity, account/bucket pseudonym, source/destination exact private keys in protected participant evidence, invocation (toolbar/context/keyboard/drop), Test It active/inactive, request/Chrome ID, start/terminal time, receipts, independent postcondition and unchanged originals. Public/redacted reports must not include bearer tokens, signed URLs or file contents. Retain source/destination identity correlation across partial results and guide history/retry.

Verdicts: VERIFIED with environment and evidence path; CODE-INFERRED; BLOCKED with cause; UNVERIFIED/NOT_TESTED. “Started”/successful dispatch/green exercise UI is not completed transfer evidence. Only the initiating exercise/operation gets late completion, even after navigating or closing the guide.

## GUI/API and operation permutations

| Test family / matrix IDs | Required cases and expected evidence | Current status / reuse |
|---|---|---|
| Discovery/navigation | Expired/revoked OAuth, 401/403/404, disconnect during list, empty account, unprepared bucket, root/deep prefix, missing saved location, out-of-order account/list response, back/forward/breadcrumb immediate parent | Focused local partial coverage VERIFIED; installed/live UNVERIFIED. No diagnostic read may deploy/repair. |
| Listing/search R1/R3 | 999/1000/1001 objects; repeated/missing cursor; second page only match; nested and other-account target; no match; 2000/2001 matches; session expiry; target error and service-worker restart | Existing Legacy search budget tests; Beta search NOT IMPLEMENTED. Must distinguish loaded-name filter from remote search. Pagination unchanged by audit. |
| Selection/sorting R2/R4 | Single/toggle/range/select all loaded, hidden filtered selection, type sort, size/date directions, grid/list, keyboard focus, touch long-press; selection changes during preview | Actual target bounds and no accidental mutation; current Beta sorting/touch gaps source-confirmed. |
| Local upload / readiness R14 | 0 B/1 B, raw binary, valid Unicode/space/#/% name, folder relative paths, empty folder, unprepared authorized bucket, all conflict policies, staging corruption, lost PUT receipt, read-back stall/abort | Verify bytes and exact final key, source local bytes unchanged; no false success or write replay; staging recovery key remains actionable. Current Beta Worker prerequisite differs from Legacy. |
| Copy/move/rename/delete | Same folder, sibling/deep folder, same/cross bucket, cross account, file/folder/mixed/overlapping root+child, conflict at source/destination after preflight; repeated suffix collisions, source changed, deletion unconfirmed | Receipt count equals request/expanded unique keys. Verify all bytes/destination/source absence; unknown move retains explicit partial/uncertain result; external delete race documented, never claim atomicity. |
| Drag/drop/shortcuts | Ctrl+C/X/V, toolbar/context Copy/Cut/Move, internal move vs modifier-copy, external File/folder drop, destination folder drop, guide active/inactive | One U route per operation, correct invocation evidence, no cut-as-move success. Local DOM tests partial VERIFIED; native interactions UNVERIFIED. |
| Download R7 | Private/public/API-403 fallback, 0 B and >300 MB, two concurrent IDs, complete/interrupted/cancelled, event before registration, browser disk failure, 30-min observation, page reload | Independently hash saved bytes; Chrome complete alone is only browser completion. Browsing must remain usable in parity repair; no started-as-pass. No current durable reload recovery. |
| Preview R8/R9 | Image/PDF/audio/video/text/MOV/GLB/glTF; metadata MIME differs from extension; no extension; malformed codec/file; header absent/false; managed-public fallback allowed/disabled; window/side/lightbox, next/previous/Escape/resize | Verify correct rendering and memory budget; remote references in 3D may fail independently. Native visual/codecs are UNVERIFIED. |
| Archives R10 | Stored/deflate ZIP/CBZ, nested folder selection, entry preview/download, same/cross bucket extract, duplicate target; malicious traversal/drive/backslash; 64/65 components; 10000/10001 entries; 4 MiB index ±1; 512 MiB entry ±1; ratio 200±epsilon; ZIP64/encrypted/unsupported method | Correct safe rejection before write/large allocation; cardinality includes >1000 requested entries. Existing safety tests local; large entries and live memory UNVERIFIED. |
| Public links R11 | Disabled/enabled managed domain, Worker custom domain / R2 custom domain exact /assets vs root; enable Yes/Cancel; stale selection; unauthorized Beta sender | Shared read-only discovery and explicit authorization/read-back. Beta missing enable hook cannot be called accepted. |
| History/properties R12 | Exact stat vs prefix lookalike; 1024-byte prefix needs appended slash; normalized metadata; object missing/stale; history 50/51; location navigation and rename | No provisioning from properties; history is recent observations, not truth or durable job list. |
| TRUE REMOTE | Known/unknown/lying length, 0 B, redirects 5/6, unsafe scheme/private host, 300 MB±1 and 300 MiB±1, disconnect after dispatch, wrong returned folder | Worker fetches bytes; browser sends URL only. Unknown-length memory and MAX_BYTES prove no unlimited claim. No remote source fetched during audit. |
| Provider/security/offline | Unauthorized account/bucket, wrong Worker binding/secret, outdated Worker, missing routing flag, metadata/header quota; disconnect→restart→reconnect | No cross-account leaks or silent setup; ordinary offline file edits/sync and other-provider Explorer NOT IMPLEMENTED. |
| Test It all 60 | Repeat owner's current acceptance sequence ordinary and active, exact current-session originals/copies, attempted-but-blocked verdicts, question Previous/history/retry/late receipt/Restart/export | Current definitions retained. Earlier owner traversal 38 passed/22 NOT_TESTED is historical; no post-repair installed acceptance or 60/60 claim. Source hashing limited to 16 MiB by design. |

## Boundary, time and resource gates

For **every register row** add below/equal/above checks (numeric N−1/N/N+1; UTF-8 bytes, not code units; elapsed immediately before/after). Avoid huge allocations by metadata-only sentinels, injected clocks, generated streams and instrumented memory bindings; label those as gate/algorithm proof. Full large-payload transfer and peak-memory proof require an actual streaming storage fixture or approved provider run, not a fake size field.

Priority remaining local cases: final prefixed key validation at 1024 bytes; overlapping selected folder/child; archive requested-vs-returned 1000/1001; cancellation after dispatch during rename/mkdir (GUI does not pass signal in all callbacks); delayed Worker response beyond 25/30s; same-key 429; stale/private MIME fallback. Existing tests are partial, so these are requirements, not fabricated passes.

For future multipart, cover minimum/maximum/equal-size part rules, 10000/10001 parts, source modification, lost part/complete receipt, checksum mismatch, token/Worker restart, persistence failure, 7-day lifecycle expiry/abort, and destination collision at final commit. Only bounded parts in memory; exact source/destination bytes must match. No multipart test is represented as passing in this audit.

## Completion metrics

- Every action row has a concrete path or NOT IMPLEMENTED, a bound reference, a priority and an evidence label.
- Zero unexplained Beta losses from supported Legacy behavior; intentional differences explicitly approved, not assumed.
- Zero universal 16 MiB/300 MB claims; each error identifies its method/resource budget accurately.
- No success without required terminal receipt/postcondition; no blind ambiguous write retry; no unintended original deletion/overwrite.
- Measured memory scales with chunk/part for transfer paths; archive/preview allocation stays within documented budgets. Net code/dependency delta reported for repairs; zero second engines.
- All new regressions pass focused tests; full suite retains exact baseline classifications until separately repaired. Live/browser gates remain open until evidence exists.

Maintain with [README checklist](README.md); update the matrix/register and matching tests in the same implementation commit.
