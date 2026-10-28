# Legacy ↔ Beta Explorer action matrix

Status: **AUDITED / implementation and installed acceptance open**. Updated 2026-10-28 (America/Chicago). Inspected `beta-explorer` at `a7effa80b20a4d12f9e6837486ff1d7f7e52ebd9`. Owner: REDOWN maintainer; subsequent operation authors maintain these references.

## Reading the matrix

All availability comparisons are **CODE-INFERRED**, unless a row explicitly names a local VERIFIED test. Installed Chrome/live R2 are **UNVERIFIED** after current code changes. “Available” means an actual dispatch chain, not release acceptance. `P0` protects truthful results/data; `P1` restores existing parity; `P2` improves robustness; `P3` is superiority/future work. Rows sharing a backend inherit the exact limits in the [register](EXPLORER-FILE-SIZE-AND-HARD-LIMIT-REGISTER.md), not a universal max file size.

Source shorthand (line numbers at inspected revision): **L** = [options.js](../../extension/options.js); **B** = [beta/explorer.mjs](../../extension/beta/explorer.mjs); **A** = [r2-adapter.mjs](../../extension/beta/r2-adapter.mjs); **U** = [file-api.mjs](../../extension/beta/file-api.mjs); **G** = [background.js](../../extension/background.js), including embedded STORAGE Worker; **C** = [cloudflare-api.js](../../extension/cloudflare-api.js); **S** = [search-session.js](../../extension/search-session.js). Function names identify exact implementation even if lines drift. Unless otherwise noted, provider is Cloudflare R2 REST for listing/local PUT; shared STORAGE binding Worker for mutations; Chrome downloads for disk writes. Shared operations tested in `tests/explorer-worker.test.mjs`, `tests/explorer-copy.test.mjs`, Beta paths in `tests/beta-explorer.test.mjs`, auth/download in `tests/cloudflare-files.test.mjs`. Test existence does not imply complete row coverage.

## Navigation, discovery, presentation

| Action | Legacy actual path | Beta actual path | Limits / gap / classification / next repair |
|---|---|---|---|
| Connect / renew / disconnect | L Settings → shared auth and cfConnect/cfDisconnect | B loadAccounts/controls → U connect/disconnect → A → same background | BETA-PARITY; OAuth/scopes/session expiry shared; P2 live renewal acceptance. |
| Browse accounts | L loadExplorerInventory (2549) → cfAccounts | B loadAccounts (213) → U accounts → cfAccounts | BETA-PARITY; accessible accounts only; errors not an empty-success list. |
| Browse buckets across accounts | L inventory / account filters → cfBuckets | B loadBuckets (201), account sidebar → buckets | BETA-PARITY; account cache/pagination shape requires live huge-inventory check. |
| Browse prefixes / deep folders | L browseWorkspace (2610 vicinity) → cfObjects → listObjectsPage | B navigate/listing (80/88) → list → A page | BETA-PARITY; 1024 UTF-8 key bytes, no ordinary depth constant; prefixes synthetic. |
| Listing continuation | L browseWorkspace/load more + visible-page navigation | B More → listing(true) → provider cursor | BETA-PARITY on reachability; provider 1000/page; repeated/missing cursor fails Beta. |
| Visible page controls / file count per page | L renderFileItems (2684), EXPLORER_PAGE_SIZES | B appends all fetched rows on More | BETA-REGRESSION R1 (presentation/scalability); P2 retain proven paging UI or bounded rendering; no pagination changes in audit. |
| Sort name ascending / descending | L sortedVisibleItems (2047), header toggles | B visible (40), name/name-desc | BETA-PARITY within loaded rows, not global provider sort. |
| Sort size/date ascending | L generic field + direction | B size/date always descending | BETA-REGRESSION R2; P2 reuse field/direction semantics. |
| Sort type | L explorerSort field type | No type sort choice in B | LEGACY-ONLY R2; P2 add same semantics without engine work. |
| Filter loaded filenames | L search changes remote search state, not identical local-only filter | B visible → loaded names only, case-insensitive | BETA-ONLY convenience; not a substitute for remote search. |
| Search remote paths/names | L runExplorerSearch (2085) → cfSearchStart/Step/Cancel | No search API operation; filter cannot find unloaded/nested objects | LEGACY-ONLY / BETA-REGRESSION R3; P1 wrap S behind U, preserve caps/errors. |
| Search account/all-bucket scope | L explorerSearchTargets (2068) → S | No scope / recursive search | LEGACY-ONLY R3; P1 same existing session backend. |
| Navigate search result parent / preview | L goToSearchResult + source-aware preview | No search result model | LEGACY-ONLY R3; P1 preserve source identity; destructive search actions intentionally blocked in L. |
| Refresh current folder | L browseWorkspace, stale-request protection | B refreshConnection (234) → status/list | BETA-PARITY; no automatic Beta setup. |
| Refresh connection discovery | L refresh inventory/account setup controls | B refreshConnection fallback loadAccounts | BETA-PARITY; cached bucket state vs actual discovery distinguished. |
| Breadcrumb root / immediate parent / arbitrary ancestor | L renderExplorerChrome / goLocation | B render/navigate breadcrumbs | BETA-PARITY; Test It requires immediate parent for its exercise, ordinary browsing does not. |
| Back / Forward / Up | L explorerHistory / goLocation | B history/historyIndex, up | BETA-PARITY; page-local history, no persistent operation undo. |
| Enter folder path | L path/breadcrumb location controls | B path dialog → prefix validation | BETA-PARITY; reserved path segments restricted. |
| Saved destination profiles | L profile editors, bucket/default prefixes, nested destinations | B loadProfiles (255) → U profiles; select existing R2 location | BETA-PARITY for opening R2 saved locations; provider/menu editing stays in Settings. |
| Last location after page reopen | L storage workspace state | B betaExplorerLocation → navigate(restore) | BETA-PARITY; missing saved prefix falls to root; not offline byte access. |
| File selection / Ctrl or Cmd toggle | L selectExplorerItem (2950) | B render row click (41) | BETA-PARITY; identities retained by exact key within current source. |
| Range / Select All | L shift anchor + keyboard A over loaded sorted items | B shift click and Ctrl+A over visible loaded items | BETA-PARITY; neither selects all unseen provider objects. |
| Arrow/Enter/Space/F2/Delete/clipboard shortcuts | L keyboard handlers (3725+) | B keydown (179), invokeCommand | BETA-PARITY for core commands; Legacy Ctrl+F search focus absent (R3), Backspace means history-back in Legacy and Up in Beta; no OS clipboard file transfer contract. |
| List / grid | L view state/renderFileItems | B view class toggle (174) | BETA-PARITY in affordance; actual responsive visual acceptance UNVERIFIED. |
| Touch long-press context menu | L row touch timer 550 ms (2880) | B contextmenu event only | BETA-REGRESSION R4; P2 native device test, small shared interaction helper if required. |
| Docked/window preview, resize/expand/minimize/reopen | L workspace preview controls | B previewMode/sideState/layoutPreview | BETA-BETTER in explicit mode/state design; local DOM tests VERIFIED, rendering UNVERIFIED. |

## Writes, clipboard, transfers and conflicts

| Action | Legacy actual path | Beta actual path | Limits / gap / classification / next repair |
|---|---|---|---|
| New folder | L create folder → cfCreateFolder → ensurePrefixes | B mkdir → U/A mkdir → same cfCreateFolder | BETA-PARITY; .redown zero-byte marker; ordinary route, no Test It create-only prerequisite. |
| Single local upload | L uploadLocalFiles → direct REST PUT | B upload → U upload → A staging PUT/read-back/final move | BETA-BETTER verification, same 300,000,000 B gate; Beta additionally needs ready Worker to commit. |
| Local upload to authorized bucket without REDOWN Worker | L direct REST PUT works without preparedProfile/ensureWorker | B run ensureWorker then staged final move needs Worker5+ | BETA-REGRESSION R14 availability/prerequisite; P1 explicit supported route without automatic provisioning; preserve stronger conflict/integrity semantics. |
| Bulk local upload | L serial queue, explicit outcomes, safe pre-write retries | B U batch upload, default concurrency 1 | BETA-PARITY core; Beta no pre-write retry queue R5; P2 reuse retry policy, never replay unknown PUT. |
| Folder picker / directory hierarchy upload | L FileList uploaded by file.name, no webkitRelativePath consumer in uploadLocalFiles | B folder-picker webkitRelativePath, explicit relative keys | BETA-ONLY improvement; preserves file paths, not empty directories. |
| External file drag/drop | L drop FileList → uploadLocalFiles | B collectDroppedFiles (dropped-files.mjs) → U batch upload | BETA-BETTER folder traversal; iterative handles, no whole payload buffer; arrays still O(file count). |
| Empty external folder upload | No explicit directory serialization | B says “Empty folders were not uploaded” | BOTH-INCOMPLETE; P3 deliberate limitation; use mkdir for desired empty prefix. |
| Download one file | L explorerDownload → C download | B U/A download → same C download + await terminal | BETA-PARITY transport, no upload/inspect size ceiling; B busy until terminal or 30 min. |
| Bulk selected file download | L menu loops selected non-folders | B api.batch(download), serial by default | BETA-PARITY reachability; Beta serial wait can take 30 min/item; P2 launch bounded nonblocking tracked downloads. |
| Folder / ZIP directory download | explorerDownload returns for folder | B controls disabled / adapter throws | BOTH-INCOMPLETE, not Legacy parity debt. |
| Copy clipboard / Paste | L setExplorerClipboard (3066) / pasteExplorer (3091) | B actions.copy/paste → U batch copy → cfTransferObjects | BETA-PARITY; clipboard page-local; no writes until Paste. |
| Cut / Paste | Same clipboard with move | B cut stages; Paste invokes move | BETA-PARITY; sources preserved until verified copy and deletion receipt. |
| Copy to / Move to folder | L lazy paged destination submenus, Here and folder browsing | B chooseDestination (420), account/bucket + typed prefix | BETA-PARITY execution; BETA-REGRESSION R6 destination folder discovery UX; P1 reuse cfDestinationFolders picker behind U. |
| Duplicate same folder | No dedicated duplicate menu; ordinary same-key paste reaches G source==destination rejection before conflict resolution | B duplicate → copy/paste keep; A '(copy)' key then shared uniqueKey | BETA-BETTER; explicit adapter remapping enables same-folder duplication; Legacy Keep Both applies to other colliding destination keys, not self-key rejection. |
| Rename file | L beginExplorerRename (3234) → cfRenameEntry | B rename → same ordinary route | BETA-PARITY; copy-verify-delete, conflict skip, no atomic delete promise. |
| Rename populated folder | L cfRenameEntry → expand → transfer | B same route, not restricted to individual files in ordinary mode | BETA-PARITY; Test It excludes recursive folders. |
| Delete file / folder recursively | L deleteSelection → cfDeleteObjects → expand/deleteKeys | B api.batch(delete) → same route | BETA-PARITY; 100 keys/request, preflight/absence checks; direct delete unconditional. |
| Mixed folders/files copy/move/delete | L shared expansion deduplicates keys per dispatch | B per-selection U batch → shared per-entry expansion | BETA-PARITY normal disjoint roots; overlapping root/child across separate Beta calls UNVERIFIED (can yield partial/not-found); P0 targeted characterization before claiming identical batch semantics. |
| Same-folder move / descendant folder move | G rejects self and descendants | A rejects direct self, G rejects descendant | BETA-PARITY; preserve safeguards. |
| Same-bucket cross-folder copy/move | Shared G transferBatch/deleteKeys | Same G path | BETA-PARITY; stream, no local 300 MB cap. |
| Cross-bucket copy/move | Shared source/destination prepared profiles, routing + storage binding checks | Same G with betaNoProvision | BETA-PARITY when already prepared, source Worker stream needs length/ETag; live UNVERIFIED. |
| Cross-account R2 copy/move | G distinct account profiles and Worker secrets | B chooseDestination includes accounts, same route | BETA-PARITY code path, live credentials/routing UNVERIFIED. |
| Cloud → local | C authenticated download to Chrome destination | Same C | BETA-PARITY; browser-selected save path, no local filesystem adapter. |
| Local → cloud | Direct REST PUT | Staged REST PUT + verification | BETA-PARITY size, stronger Beta final collision control. |
| URL → R2 TRUE REMOTE | Right-click/popup → ingestCloudflareAtPrefix | B remote → U remoteIngest → exact same ingest | BETA-PARITY; 300 MiB default Worker budget, unknown-length buffer; no client relay. |
| Remote R2 → remote R2 | G Worker transfer with stream | Same G | BETA-PARITY; separate from arbitrary remote provider support. |
| Arbitrary remote provider → remote provider | No general Explorer route | No provider adapter | BOTH-INCOMPLETE / NOT IMPLEMENTED; URL to R2 is narrower. |
| Keep Both | G uniqueKey / folder rename planning | A same-folder '(copy)' then G keep | BETA-PARITY; bounded collision attempts, no infinite names. |
| Skip / Replace | G skip or conditional destination replace | B conflict selector, explicit Replace confirmation → same G | BETA-PARITY cloud writes; Test It blocks Replace intentionally. |
| Local upload conflict skip/replace/keep | L existing objects skipped, no ordinary replace UI in uploadLocalFiles | B staged final conditional policy | BETA-BETTER; final receipt not independent final SHA-256. |
| Bulk failures / per-object receipts | G completed/errors/conflicts/partialMove, L status | B U per-entry results → outcome, remaining move clipboard | BETA-PARITY intent; array error entries and unknown writes must not be labelled success. |
| Cancellation | L search cancel, preview abort, no general cloud job cancellation | B AbortController + stops undispatched batch items | BETA-BETTER local cancellation; cannot undo/cancel an already dispatched Worker mutation; Chrome download not cancelled by AbortSignal. |
| Retry / resume | L upload pre-write checks retry ≤4; search sessions resume in memory | B manual refresh/reconcile; Test It journal; no durable ordinary job resume | BETA-REGRESSION R5 pre-write retries; BOTH-INCOMPLETE durable byte resume. |
| Progress / status | L ticketed RedownExplorerStatus and transfer history | B U progress → local status/progress, honest uncertainty | BETA-PARITY basic; upload no network-byte progress until verification; no durable ordinary outcome log. |
| Download while continuing file management | L returns after download ID, ticketed callbacks | B run remains busy awaiting terminal callback | BETA-REGRESSION R7; P1 preserve terminal evidence with independent per-download status, release file-management lock. |
| Undo / trash / version restore | Not implemented | Not implemented | BOTH-INCOMPLETE; no restore promise after delete. |

## Read, archive, metadata and provider surfaces

| Action | Legacy actual path | Beta actual path | Limits / gap / classification / next repair |
|---|---|---|---|
| Image / PDF / audio/video preview | L objectContentType + C preview, DOM renderer | B previewType + A preview + DOM | BETA-PARITY for mapped extensions and supported browsers; both buffer by default ≤64 MiB. |
| MOV / MIME-metadata-only recognized media | L objectContentType honors metadata, MOV mapping | B previewType ignores metadata and lacks mov | BETA-REGRESSION R8; P1 shared type resolver, native codecs still UNVERIFIED. |
| GLB / glTF 3D viewer + reset | L showWorkspacePreview → bundled model-viewer (1675) | No previewType or renderer | LEGACY-ONLY R8; P1 reuse bundled dependency, do not add renderer library. External model assets permissions/relative URLs remain UNVERIFIED. |
| Text preview ≤512 KiB | L preview fetch whole capped Blob, then local range/text | B bounded 512 KiB text stream truncation | BETA-BETTER actual memory truncation when no disqualifying Content-Length; false oversized-header rejection shared B preview budget still applies. |
| Preview management API 403 valid dot-like key | C readableResponse → explicit enabled managed-domain fallback | A preview directly calls REST, lacks fallback | BETA-REGRESSION R9; P1 reuse C reader with budgets and auth/privacy rules. Download already uses C fallback. |
| Lightbox + previous/next | L image preview controls/navigation | B window/side/lightbox, arrows, stale epoch checks | BETA-PARITY supported formats; DOM interaction VERIFIED, rendered Chrome UNVERIFIED. |
| ZIP/CBZ list and hierarchy | L openArchive → G listArchive and folder rows | B archive dialog shows flat full names → A archiveEntries | BETA-PARITY index reachability; BETA-REGRESSION R10 folder navigation/selection ergonomics; P1 adapt existing model. |
| Archive entry preview | L cfArchiveEntryUrl → signed entry endpoint → renderer | No API method or UI action | LEGACY-ONLY R10; P1 wrap existing route, preserve no-provisioning. |
| Archive entry download | L signed URL + chrome.downloads | No API/UI route | LEGACY-ONLY R10; P1 same signed entry read and terminal tracking. |
| Archive selection extract to same bucket | L cfExtractArchive → extractArchiveEntries | B U batch extractArchiveEntry → same route | BETA-PARITY, one entry/request in Beta avoids shared silent 1000-entry slice but repeats index reads. |
| Archive-folder clipboard expansion | L clipboardEntries expands descendants from archive index | No archive clipboard model | LEGACY-ONLY R10; P1 expand selected logical entries, no second ZIP parser. |
| Archive entry transfer/extract cross-bucket/account | L cfTransferArchive → receiveArchiveEntries | No adapter API or destination account/bucket in archive modal | LEGACY-ONLY R10; P1 reuse existing Worker route, review shared buffers/limits. |
| TAR/RAR/7z/encrypted/ZIP64 support | G only ZIP/CBZ methods 0/8 with 32-bit ZIP fields | Same backend | BOTH-INCOMPLETE; not supported by merely having archive file preview/download. |
| Public Get URL | L RedownPublicAddresses.popover → cfPublicAddresses | Same popover via U publicUrls | BETA-PARITY read/disclosure; configured URL is not verified object access. |
| Enable managed r2.dev from Get URL | L popover enable → cfEnablePublicAccess, exact options sender, confirmation/read-back | B passes load/onState only, no enable callback/API method | LEGACY-ONLY R11; P1 extend same action safely; do not spoof options sender. |
| Custom serving domain/CORS configuration | L Settings assetCorsControl → cfSetAssetDomain | Not in Beta workspace; Settings remains accessible | LEGACY-ONLY in workspace surface, intentional Settings ownership; P2 link existing Settings, no duplicate config. |
| File properties | L cfObjectProperties → fresh metadata, normalized fields and formatted UI | B stat → metadata JSON | BETA-PARITY data retrieval; B stat pages further; header parity/empty folders live UNVERIFIED. |
| Transfer history | L detailed downloads/errors, open location and renameTransfer | B menu transferHistory renders recent read-only text | BETA-REGRESSION R12 history actions/detail; P2 wrap existing actions through U; not operation-journal proof. |
| Setup/create bucket | L create + preparedProfile may provision implicitly | B createBucket/prepareBucket explicit controls, ensureWorker before writes | BETA-PARITY explicitly; no-provision-on-read is intentional improvement, not removal of setup capability. |
| Simple/Nested right-click URL capture | Extension-wide background + Settings editors | Same extension remains installed; Beta prepareBucket makes saved destinations | BETA-PARITY shared service, not reimplemented in workspace. |
| Gallery capture | background/hitomi-capture bounded browser ZIP relay | Shared extension feature, no Beta-specific file API | UNVERIFIED live; browser relay is not TRUE REMOTE; no reason to duplicate. |
| GitHub workflow ingest | Shared popup/Settings Beta-enabled profile, workflow dispatch | Beta Explorer profiles deliberately filter cloudflare-r2 | NOT an implemented Legacy filesystem Explorer provider; intentional R2 scope, future multi-provider NOT IMPLEMENTED. |
| S3/Drive/OneDrive/MEGA adapter | No Legacy filesystem implementation | No Beta adapter | BOTH-INCOMPLETE / NOT IMPLEMENTED; roadmaps are not current capability. |
| Authentication/secrets/host permissions | OAuth shared client, profile Worker bearer, manifest permissions | Same principal; Beta UI strips secrets from profiles results | BETA-PARITY; cross-account auth and sender restrictions remain required. |
| Offline bytes / edits / synchronization | RFIS observed metadata and gallery pending jobs only | Last location/preferences/session ledger only | BOTH-INCOMPLETE / NOT IMPLEMENTED as general file offline/sync; no icons prove cached bytes. |
| Native helper / Python filesystem API | Local URL bridge; Windows native source absent; offline agent CLI is inspection | No filesystem provider or Python mutation API | BOTH-INCOMPLETE / NOT IMPLEMENTED; no large-file route to reuse here. |

## Names, counts and adverse conditions

| Condition | Legacy path/behavior | Beta path/behavior | Classification / next repair |
|---|---|---|---|
| Unicode/spaces/%/#/? names in normal cloud copy | cleanExplorerKey + segment/query encoding, G exact keys | U key + A same G routes | BETA-PARITY ordinary valid paths, fixture Unicode VERIFIED; remote ingest filename sanitizer is narrower in both. |
| Existing backslash or literal dot-segment keys | Legacy exact file key accepts more than U; URL path normalization/provider policy can still reject | U rejects backslash and exact . / .. segments before route | BETA-REGRESSION R13 at contract acceptance, successful Legacy transport for these keys UNVERIFIED; P2 characterize direct Worker exact-key paths before widening validation. |
| Leading/trailing spaces in new names | L cleanExplorerName trims | U name explicitly rejects | Intentional explicit error vs Legacy silent normalization; not a proven successful-name capability regression. |
| Repeated slash/Unicode prefixes | G exact path capability; remote route checks older Workers | U preserves repeated slash, A exact key | BETA-PARITY; prefix() appends slash after validating can create a 1025-byte value from 1024 bytes, P0 add final-key boundary test/fix later. |
| Very long UTF-8 names / nesting | G key ≤1024 bytes, ordinary no depth cap | U ≤1024, archive ≤64 components shared | BETA-PARITY limits; 1024 JS characters are not 1024 UTF-8 bytes. |
| Zero-byte objects | Local PUT / Worker get/body, no size >0 check for ordinary copy | U upload accepts 0; read-back matches no bytes | BETA-PARITY; local fixtures VERIFIED, gallery zero bytes separately rejected. |
| Huge file counts | L cursor browse + rendering pages, G expansion holds all objects ≤1000 pages | B More holds all loaded rows; batch arrays and expansion | BETA-REGRESSION R1 rendering; shared memory/request budgets remain; no infinite-count claim. |
| Partial/unknown writes | G verified receipts + errors; L no auto replay after write attempt | U uncertain and halted batch, recovery staging key | BETA-PARITY intent; remoteIngest underlying raw fetch may outlive message timeout; independent reconciliation still required. |
| Offline/network interruption | Shared HTTP failure handling; no ordinary durable job | Same + Test It ownership journal | BOTH-INCOMPLETE recovery after page/worker restart; P0 preserve truthful unknown state. |
| Idempotent retry | Conditional create/replace; ambiguous writes not automatically replayed | Same plus staging identity; no durable idempotency tokens | BOTH-INCOMPLETE general idempotence; P2 reconcile before repeat. |
| External concurrent replacement | G conditional destination and pre-delete identity checks | Same ordinary G + practice preflights | BETA-PARITY known residual race: R2 delete unconditional; do not reinstate an impossible atomic-delete gate. |

## Test It: harness, not production capacity

[Current session policy](../../extension/beta/test-it-session.mjs) and [60 exercises](../../extension/beta/test-it.mjs) reuse U through a policy hook. Legacy has no equivalent (**BETA-ONLY**). Exercise definitions and progress/history do not constitute 60 verified operational capabilities. Current ordinary practice rename/move/delete route is enabled after the superseded contract gate was removed; the earlier handoff's blocked-atomicity paragraphs are historical. Test It uses individual files ≤16 MiB, independent SHA-256 and ledger identity, excludes originals/unowned files, Replace/recursive folders/upload/remote acquisition/provisioning; mkdir uses its ordinary special journal path. Normal Explorer does not invoke inspect unless practice asks for it. No Test It size leak was found in ordinary upload/copy/move/download.

The [consolidated Chrome report](../../docs/beta/BUGS-TEST-IT-REAL-CHROME-2026-10-28.md) records owner traversal **38 PASSED / 22 NOT_TESTED** before repairs; some NOT_TESTED were attempted and blocked. Current post-repair installed/live acceptance remains open. Local capability-provider/DOM tests cannot close these reports. Question history/retry adds no undo, provider engine or broader file capacity.

## Confirmed Beta regressions: complete findings list for this audit

R1 visible-page controls and unbounded loaded-row rendering; R2 type/ascending size/date sort; R3 remote scoped search and result navigation; R4 explicit touch long-press; R5 Legacy safe pre-write retry queue absent; R6 browsable destination-folder picker absent; R7 ordinary Explorer blocked while downloads await terminal state; R8 metadata-based/MOV/3D preview coverage; R9 read fallback absent for managed-domain-readable API-403 objects; R10 archive hierarchy/entry preview/download/clipboard/cross-bucket transfer; R11 managed public enable action absent; R12 actionable transfer-history presentation; R13 narrower existing-key contract (Legacy end-to-end success unverified); R14 local upload requires a ready Worker where Legacy direct upload does not. These are source-confirmed regressions in surfaces/contracts, not claims that all Legacy live paths currently pass. Larger local upload capacity is **shared debt**, not an established Legacy-only capability. Five highest-priority repairs are in the [roadmap](BETA-EXPLORER-PARITY-ROADMAP.md).

Maintain each row with the [index checklist](README.md). Every row's actual cloud behavior remains subject to [acceptance](EXPLORER-PARITY-ACCEPTANCE-AND-REGRESSION-PLAN.md).
