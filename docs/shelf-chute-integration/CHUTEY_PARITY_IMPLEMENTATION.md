> Latest owner override and verification: [FILES layout / History follow-up](FILES_LAYOUT_HISTORY_FOLLOWUP.md). The 36% split, auto-fit grid and inline preview below are historical.

# Chutey layout and natural cloud drag — P0 implementation

Owner request: `latest-1132026/IMPORTANT/P0_CODEX_CHUTEY_EXACT_LAYOUT_REDOWN_CLOUD_API_NATURAL_DRAG.md`.
Base: `add8748235921fe5418ec913ba01a5cd5103a259` (current main at branch creation).
Branch: `feat/chutey-exact-explorer-natural-drag`. Reference remains the tracked
Chute snapshot `3f9033b261667a2ad90af4a13c45701ae717ab12`; no submodule,
second clone, backend replacement, provider deployment or native install.
Recorded November 4, 2026 America/Chicago.

The Shelf now uses Chutey's compact toolbar/filter, persistent 36% folder pane,
8px pointer/keyboard splitter, independent scrollports, list/auto-fit grid and
preview inserted below the selected list item or completed grid row. Both panes
remain visible at 320/360/390px. Existing REDOWN themes and File API remain the
visual and cloud authorities. Context menus replace the permanent action wall.
Existing double-click/Enter Window Preview remains separate; a single click opens
the inline preview. This is an explicit reconciliation of the two products'
preview gestures. Inline preview has Chutey's horizontal pointer/keyboard grip.

A first drag now registers an opaque reference synchronously and reads the selected
file asynchronously. The receiver can claim it before cloud bytes arrive and waits
for bounded materialization. There is no preparation button or file-read prerequisite.
Only an actual drag stages transport bytes; browsing does not stage every file.

## Source-to-source mapping and difference ledger

| Actual Chutey source | REDOWN adaptation / prior divergence corrected |
|---|---|
| `extension/explorer-view.js` host markup and toolbar | `extension/shelf-explorer.mjs:mountExplorer`: compact Back/Forward/Parent/Roots/Refresh/breadcrumb/grid; removed oversized heading, separate navigation row and visible operation wall |
| `extension/explorer-view.css` final `.ex-workspace` override | `shelf-explorer.css`: copied three-track 36% / 8px / remaining grid; removed 390px drawer and 700px fixed tree override |
| `setFolderWidth`, pointer capture, ArrowLeft/Right/Home/End | Same 15–75% clamp and five-point keyboard step; saved only in existing local `shelfExplorerV1` preferences |
| `.ex-tree`, `branch` and lazy `treePage` | Authorized R2 account/bucket/folder nodes; separate disclosure and navigation controls; independently scrollable, long names horizontally reachable; File API retains paging/cache ownership |
| `.ex-grid`, row/name/icon markup and selection | Direct size/composition adaptation, 110px auto-fit minimum (clamped only when the entire pane is narrower), 64px grid thumbnails, modifier/range selection and row keyboard navigation |
| `positionPreview(row)` | Same remove-before-measure pattern; inserts after selected row or last same-offsetTop card. Panel stays inside the right file layout, never across the tree or in a third pane |
| `.ex-preview`, `.ex-resize`, resize handlers | Same flow, default 280px height, bounded pointer/keyboard sizing, close control and resource disposal; REDOWN retains its shared media renderer/Window Preview |
| lazy thumbnail observer/three-request pump | Same observer/queue pattern through File API `preview`; only images whose listed original size is <=256 KiB, max 16 cached URLs, three concurrent reads; larger images keep truthful type icons because this adapter has no thumbnail service |
| Explorer dragstart → opaque registration → original-byte read | `chute-drag.mjs:start`: synchronous opaque UUID, reserve/arm, then existing Universal File API stat/readStream/stat and staged Blob; `chute-worker.js` waits for fulfillment after one-use claim |
| `content.js`, `drop-lifecycle.js`, `direct-drop-google-yandex.js` | Existing attributed REDOWN content adapter retained; original File/DataTransfer reconstruction, trusted-drop guard, site-specific image heuristics, no text/URL fallback or invented acceptance |
| local/native `src/chute/explorer/{native,interop}.py` | Inspected but not used as a cloud adapter. Disabled `NATIVE_CONSENT_REQUIRED` remains a boundary; see separate RFC |

`createFileApi(createR2Adapter())` remains the only cloud engine. Cloud mutations,
exact account/bucket/key identity, verification, auth and scopes are unchanged.
Drive, Dropbox, OneDrive and generic S3 do not acquire fabricated browsing trees:
Connections opens existing Remotes. R2 remains identified as Cloudflare R2.
BOOT, native menus, the full Explorer, History/GO TO/Quick Glance and save counters
are untouched. Existing file operations retain single-item capability limits.

## Resource ownership and transport lifecycle

Navigation/auth changes cancel prior reads, close previews, release URLs and cancel
the drag lease. Switching Shelf routes retains mounted navigation/selection, grid,
split and remembered scroll; leaving Explorer cancels active byte handoff. Reload
revalidates saved account/bucket access before restoring its location.

Virtual rendering scales with viewport height and actual right-pane grid columns,
with six overscan rows above/below. Padding accounts for inline-preview height;
preview DOM/URLs survive virtual row replacement, parked outside the scrollport
in a hidden container when its selected row is not mounted. No permanent third
pane is involved. Row rendering is held stable for the active native drag gesture.
Thumbnails own separate controllers/URLs and never lend them to media previews.

Browser drag stages one file: 32 MiB normally, 8 MiB for deviceMemory <=4. Negative,
unknown, changing or oversized lengths fail safely. Original filename, MIME and
bytes are preserved. Stat identity checks bracket streaming where available.
A private IndexedDB reservation is atomically replaced across Shelf instances;
fulfillment cannot resurrect an expired, cancelled or replaced reservation.
Its one-minute lease starts at the gesture, not at a preparation click. Cloud reads
have existing timeouts and cancellation; keep the source Shelf open while pending.
Memory is bounded, but a Blob/chunk transport is not a zero-copy native stream.

Only the exact Shelf sender can arm. A drop must carry its own valid reference; there is no all-tab broadcast fallback. Protected dragover recognizes the private MIME without needing early registration, while byte access remains gated on the subsequent claim. A trusted receiver claims once; chunks and
finish bind tab, frame **and origin** with ordered offsets. A navigated origin or
second claimant is rejected. Claims can wait for slow materialization; unarmed
registration gets only a bounded grace period. Records/claims survive worker
recreation, but interruption of an in-flight messaging response can require a
fresh drag. No durable source-page byte producer is claimed across page closure.
Expired/orphaned reservations are cleaned by existing alarm/wake purge.

Source states are drag_started, preparing and prepared. Receiver dispatch is
recorded only after actual File/input or synthetic-drop delivery, rather than at
claim time. Neither target_accepted nor verified_complete is synthesized. A drag
never creates a cloud History entry, save count, success animation, public URL or
upload-complete claim. An unsupported/outside drop offers Download/file-picker
fallback; cancellation clears the bounded staged file. Unrelated drags are ignored.

## Observable parity and test receipts

Run `node scripts/shelf-mini-explorer-browser.mjs` (PLAYWRIGHT_MODULE and
CHROMIUM_PATH can select installed tools). The HTTP harness loads the actual
Shelf markup, router, Explorer, Universal File API/R2 adapter, stage, worker and
content adapter. Provider responses and Chrome messaging are fixture boundaries.
The comparison runs **the actual tracked Chutey JS/CSS**, with only its local/native
API mocked. Its local folder-consent strip is hidden for comparable read-view
captures; all Explorer structure/gestures come from its source. Equivalent host
width/height is set from the real REDOWN component, not an invented wireframe.

Paired list and grid screenshots exist at 320, 360, 390, 540, 700 and 900px in
[parity-evidence](parity-evidence/). Each capture expands the inline preview.
Full Shelf captures show actual shell containment; four theme shots show Porcelain,
Midnight, Ocean and Neon. The fixtures use synthetic 1px PNGs, so white media
areas are expected. The final recorded browser JSON and source-hash receipt are
adjacent to screenshots.

Browser assertions cover no horizontal page overflow, both panes visible, 8px
splitter, keyboard/pointer split changes, persistence writes, independent right
scrolling, actual completed-grid-row preview insertion, keyboard preview resizing,
list/grid toggles, tab-switch scroll retention, pointer preview resizing, both pane scrollports, paged append, simulated HTTP 401/offline recovery, Window Preview, bounded rendering
and 1/10/100/1,000/10,000 metadata listing measurements. The first gesture deliberately
delays registration 150ms and cloud bytes 700ms and requires **no prior select/prepare click**, then independently
reads the file input's actual original 68 bytes, name and MIME. This proves a
controlled input accepted the reconstructed file; it proves no remote upload.

Node focused tests cover actual File API streams, cancellation, same-size object
replacement, expiry, worker recreation, one-use claims, tab/frame/origin isolation,
ordered chunks, navigation/cache races and unrelated/synthetic drops. New tests
specifically exercise a receiver claiming before materialization and cancellation
before fulfillment; neither can be replaced by a source-text assertion.

Exact commands/results and all 111 baseline failing names are in
`parity-evidence/regression-comparison.json`, `focused.log`, `syntax.json`,
`reliability.json`, `native-tests.log`, `boot-schema.log` and `package.json`.
The complete local logs are retained under `work/chutey-parity/` while the workspace
exists. Historical catalog hashes, the original failure policy and old evidence
have not been refreshed or weakened. Reliability's old seven-failure baseline is
not today's 111-failure baseline; its "newFailures" field must be interpreted
against the fresh name comparison, not as PR-attributable regressions.

Local verification on the final implementation:

| Command | Result |
|---|---|
| `npm test` | 1,079 tests: 968 pass, the identical 111 failing names from 1,077 / 966 / 111 baseline; zero new or removed failures |
| `node --test tests/shelf-mini-explorer.test.mjs` | 15/15 pass, including hidden-selection clearing when filtering and cold slow drag |
| `npm run check` | Syntax and worker import closure pass |
| `npm run reliability:check` | Syntax, registry and issue inventory pass; existing architecture/regression policy remains red |
| `npm run explorer:smoke -- --preset all` | 224 tests: 197 pass / 27 baseline failures |
| `PYTHONPATH=chute-reference/src python3 -m unittest discover -s chute-reference/tests` | 76 tests, 9 Windows skips, zero failures |
| `python3 tests/boot-schema-conformance.py` | 6 valid fixtures, 3 invalid fixtures rejected |
| `python3 scripts/package_chrome_store.py --audit-only` | 128 runtime files, matching REDOWN licenses, full Chute notice, zero reference files; release blocked |

The final browser run measured 100 synchronous scroll/render updates in 1,226ms
(normal policy) and 913.8ms (low-memory policy), or 12.26ms and 9.14ms per update.
Normal-policy navigation measured 139–228ms; the 1,000/10,000-entry cases were
202/228ms and exceeded the prior 200ms local navigation goal. Low-memory-policy
navigation measured 96–178ms. These runs overlapped local regression checks;
the policy classes run on the same Linux machine and are not a RAM comparison.
Browser PASS labels assert interaction correctness and bounded rendering, not
that every performance target passed. Physical Windows/media-load acceptance
and the navigation budget remain open; no timing samples were discarded.

## Interoperability and remaining acceptance

| Surface / requirement | Outcome and evidence boundary |
|---|---|
| Ordinary HTML file input, cold slow drag | PASS in controlled Linux Chromium, original bytes/name/MIME independently read; no installed extension or remote upload proof |
| ChatGPT | Existing browser File/drop path; real attachment and completion UNVERIFIED |
| Google Lens | Existing image adapter; real attachment UNVERIFIED separately |
| Google Image Search | Existing image adapter; real attachment UNVERIFIED separately from Lens |
| Yandex Images | Existing image adapter; real attachment UNVERIFIED |
| Drive / Gemini | Image-search heuristics excluded; ordinary drop acceptance UNVERIFIED, no Google-wide claim |
| Other drop handlers | Can reject synthetic events; dispatch alone is not acceptance |
| Cross-window / popup / attached / expanded extension surfaces | DOM widths tested; actual installed/shell lifecycle and cross-window trusted drops BLOCKED by managed Chromium extension policy |
| Desktop/Windows native, multiple files, huge files | UNSUPPORTED by browser v1; Download and target picker fallback. No enrolled REDOWN native transport exists |
| Physical 4 GB Windows, HD media pressure, multi-monitor | UNVERIFIED; deviceMemory simulation only chooses the smaller byte budget |
| Live R2 auth/revoke/offline recovery, real cloud mutations | UNVERIFIED; no credentials or disposable authorized provider test data in this environment |
| Nested live-folder pagination / screen reader | Controlled paging and both scrollports pass; real provider folder pagination and human screen-reader acceptance remain UNVERIFIED |
| BOOT / V3 / History / counters / provider regression | Full local suite rerun and baseline compared; installed acceptance remains open |

The read-only administrator policy receipt is `parity-evidence/installed-chrome.json`:
`ExtensionInstallBlocklist: ["*"]` and no install sources. No policy bypass or
administrator configuration change was attempted. Existing [issue #51](https://github.com/thanks-cohn/REDOWN/issues/51)
remains open; this PR must not close it by assertion. PR #52 and its merged
baseline were inspected. This is an implementation/evidence PR, not full P0
live/Windows acceptance or permission to merge/publish.

## Licensing, package assessment and rollback

Inspected exact `chute-reference/LICENSE`, matching `extension/CHUTE-LICENSE.txt`,
root LICENSE, bundled LICENSE and existing credits. Chute's non-commercial
source-available terms cover the adapted Chute portions; root REDOWN proprietary
terms do not override those terms or grant commercial rights. Existing notices
are retained, and modifications are identified in source headers. Commercial
redistribution is **not cleared** by this source-development PR. Obtain separate
written authorization from applicable Chute rights holders before commercial
packaging/distribution; a tracked reference or owner request alone is not a new
third-party commercial license. No commercial release/store publishing occurs.

Audit-only packaging includes the existing runtime allowlist and full Chute notice,
with zero `chute-reference/` files. Current root/bundled REDOWN licenses match
(`licenseDrift:false`), superseding the old PR #52 evidence about drift. This does
not waive Chute commercial authorization or the installed/live release gates.
The audit-only ZIP stays under work; it is not a released deliverable.

Rollback: revert this PR's feature commits. No provider/OAuth/native migration is
needed. Old preferences tolerate added `grid`/`folderWidth`; the prior version
ignores them. Cancel pending drags before reverting. Private database
`redown-chute-v1` contains only short-lived handoff bytes; delete it only when no
handoff is active if immediate cleanup is needed. Alarm/wake purge otherwise
expires leases. Never delete customer cloud objects as part of rollback.

The one-install future architecture and migration/test/rollback gates are separate:
[RCOMPLEX_UNIVERSAL_WORKER_RFC.md](RCOMPLEX_UNIVERSAL_WORKER_RFC.md).
