# FILES layout, bottom dock, scroll stability and History GO TO

Owner request: [latest overrides](../../latest-1132026/IMPORTANT/P0_CODEX_CHUTEY_EXACT_LAYOUT_REDOWN_CLOUD_API_NATURAL_DRAG.md), November 4, 2026, America/Chicago. This report supersedes the earlier 36%/multi-column/inline-preview layout descriptions in [CHUTEY_PARITY_IMPLEMENTATION.md](CHUTEY_PARITY_IMPLEMENTATION.md); their transport findings and historical evidence remain intact.

PR #54 was reviewed at `25a57384dba253282a5310dacbd32033cfcd6f2e`. Its navigation order, REMOTES default, separate opt-in resume setting and final copy are retained. Two completion commits were pushed to its existing branch: `d117e7e` makes navigation sizing uniform even under Neon's more specific font rule; `0277ccb` replaces the obsolete subtitle expectation with assertions that the requested subtitle and paragraph are absent. The follow-up PR is stacked on #54, not an instruction to merge either PR.

## Implemented behavior and ownership

| Surface | Final behavior / owning source |
|---|---|
| Shelf navigation | FILES / REMOTES / HISTORY / SETTINGS, one row across themes; internal routes remain unchanged. Startup shell remains REMOTES, with opt-in last-view restoration and explicit navigation precedence. `shelf.css`, `shelf.js`, `shelf.html`. |
| Two-pane FILES | Fresh entry resets to 50/50, ignoring legacy saved 36%; pointer/keyboard adjustments persist during folder navigation. Tree and file pane retain independent scrollports. `shelf-explorer.mjs:setActive`, `setFolderWidth`. |
| Media | Default media mode has one full-width image per row; decoded aspect ratios feed prefix-sum row geometry. Images keep natural proportions; filenames appear on hover/focus and remain accessible names. Non-image rows retain names/icons. Existing list preference remains available. |
| Preview | Permanent sibling dock below both panes, initially 33% of FILES height, pointer/keyboard resizing, close and bounded maximum. Tabs anchor the top; branding/counter collapse in FILES. Shared renderer, cancellation, byte limits and separate double-click Window Preview remain. |
| Scroll | One right-pane scrollport, permanent full-height canvas, absolutely positioned bounded row slice, prefix-sum offsets for variable aspect images, current-item anchoring when geometry changes. Scroll/resize updates coalesce into animation frames; unchanged ranges skip replacement. Hidden panes cannot rerender at zero width; focus moves to the list when its virtual row leaves the slice. |
| History Dashboard | Existing `tab` preference continues opening/reusing `beta/explorer.html` and its exact saved-item verifier. Legacy `side` still migrates to `split`; Split View remains an explicitly labeled legacy option. |
| History Shelf FILES | New persistent `shelf` preference. Current Shelf switches in place; an outside caller invokes the existing Chrome side-panel API synchronously under the click gesture. Window-scoped session intent binds in-place requests to the exact Shelf recipient and carries validated locator metadata, never a source/page URL in a hash. One-use consumption, expiry, acknowledgment/result, bounded timeout and cleanup; File API independently authorizes account/bucket and stats the exact key. Missing or mismatched items fail without selecting a same-named substitute. Tree expansion follows only the authorized path. |

The Chutey-derived DOM/tree/8px splitter, selection, context menu, lazy thumbnail queue and natural drag handlers remain in the existing component. The owner's new overrides intentionally replace Chutey's original 36% split, auto-fit grid and inline preview; paired screenshots show this deliberate divergence, not literal parity with the old preview location.

No Universal File API, R2 adapter, drag transport/content receiver, OAuth/native permissions, toolbar opener, BOOT coordinator, native menu engine, History archive or save counter implementation was replaced. No cloud deployment or provider mutation was performed.

## Scroll incident: what was and was not established

The before trace in `layout-followup-evidence/scroll-before.json` runs PR #54's actual component with mocked provider/Chrome boundaries. It confirms preview DOM leaves the list as selection moves outside the virtual window. It **does not reproduce** the owner's halfway wall: the sampled offsets reached item 10,001. Therefore neither this report nor the PR claims an installed-Windows root cause or incident closure.

The replacement removes inline-preview height accounting and transient empty-row reconstruction from the scroll-height contract. During controlled browser testing we reproduced a separate route-restoration defect: a queued resize rendered the hidden pane at zero width, then reinterpreted its saved position on return. Hidden-pane rendering is now blocked, and the current route's remembered offset is restored after layout.

## Verification and evidence

See `layout-followup-evidence/verification.json`, `failure-comparison.json`, `browser.json` and `postflight.json` for exact commands, outcomes and classifications. Screenshots are controlled HTTP fixtures of actual Shelf/Chutey components, with mocked Chrome messaging and provider data; they are **not installed-extension, Windows, native, cross-origin or live-provider proof**.

The full controlled browser matrix covers 320/360/390/540/700/900px, Porcelain/Midnight/Ocean/Neon, list/media, dock open/closed, normal and low-memory class simulation, final-item/back scrolling, keyboard and wheel events, pointer/keyboard splitters and dock sizing, route restoration, paging and auth/offline recovery. Original-byte natural drag to a controlled HTML input still verifies exact filename/MIME/bytes; delayed registration and source delivery remain exercised. Postflight adds short 480/700/1000px heights, actual divider-left image enlargement, selection offset preservation, portrait aspect ratio and REMOTES width/copy checks.

Final focused acceptance: **67 passed / 0 failed**. Full candidate: **1,085 tests / 974 passed / 111 failed**, with no introduced failing names compared with the reviewed #54 head. Browser matrix: **192 scroll configuration cells**, each sampling nine forward/back positions and then checking item 10,001; both memory-class simulations passed.

The original #54 baseline is 1,080 tests / 968 pass / 112 fail. One failure was its stale expectation that the owner-removed subtitle still existed. Updating that assertion is a requirement change, not a waiver of a failing runtime assertion. Remaining failures are listed by name; no historical evidence hashes or frozen baselines were refreshed. The reliability runner remains failed: its pre-existing architecture report has the same 80 findings, and its older registered failure baseline is incomplete. A local suite is not a release certificate.

## Remaining acceptance and limits

- Installed Chrome cannot be tested here: managed `ExtensionInstallBlocklist: ["*"]` blocks unpacked installation. Policy was inspected and not bypassed. This host is Linux, not Windows 11.
- Windows wheel/trackpad/scrollbar behavior and the reported halfway wall need owner-device reproduction with timestamps, scroll geometry, row ranges, resize/render counts and target receipts. Local wheel/keyboard/geometry tests do not prove physical trackpad behavior.
- ChatGPT, Google Lens, Google Image Search and Yandex Images remain separately live-unverified; native/OS and multi-file delivery remain unsupported under the existing bridge. Dispatch is never promoted to upload success. See [destination matrix](DESTINATION_COMPATIBILITY.md).
- Thumbnails retain the existing <=256 KiB-original, three-request and sixteen-URL budget; larger images retain type icons and use the bounded selected preview. The adapter still has no separate thumbnail service. Real low-RAM hardware was not available.
- Browsable File API destinations remain authorized R2. Other providers retain verified provider-owned link routing/fallback; no fabricated provider trees or same-name lookup.
- Session intent expiry is checked before consumption and stale pending intents are purged on recipient initialization. Sender result timeout cleans abandoned requests; a browser shutdown can discard session state. No durable transfer or OS-native broker is claimed.

Licensing: existing Chute attribution and `extension/CHUTE-LICENSE.txt` are preserved. This patch modifies already-adapted code; it adds no newly copied reference source. Chute remains source-available/non-commercial, not MIT. Commercial redistribution still requires appropriate rights; no store/npm publication or commercial package was produced. The separate [one-install Rcomplex worker RFC](RCOMPLEX_UNIVERSAL_WORKER_RFC.md) remains the future design track; no second helper was installed.

Rollback: revert the follow-up implementation commit to return to #54's inline preview/virtualization/History routing. Old `tab`, `side` and `split` preference values remain understood. A stored new `shelf` value safely falls back to the old code's Dashboard default after rollback. Navigation/font and subtitle-test completion commits on #54 can be reviewed independently. Do not merge or publish without owner approval.
