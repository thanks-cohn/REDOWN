# Optional Files entrance, responsive panes, explicit Preview and reliable Chutey staging

Implementation branch: `feat/shelf-preview-splitter-chutey-reliability`.
Base: `8a3c5e1e041832d16bac09d75a765d202b27e3a0`.
November 5, 2026 (America/Chicago). Implementation and controlled acceptance; **installed/live/Windows acceptance remains open**. No merge, release, deployment, native installation or real cloud mutation was performed.

The [source-first inventory](P0_SLIDE_PREVIEW_DRAG_AUDIT.md) was committed before structural changes. The owner [specification](../../latest-1132026/IMPORTANT/CODEX_P0_OPTIONAL_FILES_SLIDE_PREVIEW_SPLITTER_IMAGE_MODES_DRAG_RELIABILITY_2026-11-05.md) governs the gesture changes; earlier single-click Preview descriptions are historical.

## Changes and ownership

| Boundary | Result |
|---|---|
| A: entrance (`shelf.js/html`) | Validated `shelfFilesEntranceV1`, Normal by default. Only an explicit FILES click can animate after preference readiness. Actual measured Explorer rises continuously from below; once it reaches the old tabs, it pushes the same navigation upward to the existing final position. No clone/framework. Hash/startup/GO TO bypass animation; reduced motion switches immediately. Route cancellation and resizing cancel animations. |
| B: geometry (`shelf-explorer.mjs/css`) | Real 0–100 split with two fractional tracks excluding the existing 8px gutter. Both extremes retain the focusable separator; Home/End, 5-point arrows, double-click reset and visible ½ reset with accessible 50/50 label. Hidden pane becomes inert; collapsed file pane does not rebuild geometry or reset its scroll. Fresh entry stays 50/50. Duplicate active-route notifications no longer reset a live split. |
| B: views | Obvious Detailed / Large Images button reuses the existing renderer, mode preference and sorted/filtered location. Prefix offsets retain the logical anchor; small original-image resources remain limited to <=256 KiB each, three reads and sixteen URLs. Portrait/landscape/ultrawide dimensions use decoded aspect ratios; media no longer inherits Detailed's 48px minimum. Cached prefix coefficients avoid repeated type/aspect work for all 10,000 entries on every divider frame. |
| C: Preview | Selection, Space and closed-dock arrows perform no bottom Preview request. Double-click/Enter explicitly opens the existing dock. Open-image arrows skip folders/non-images in visible sorted order, select and update the same dock; epochs and abort signals discard stale reads. Folder double-click still navigates. Open in Window is a separate dock/context-menu action using the existing Window Preview. |
| C: Expand/Restore | Opposing diagonal triangles change direction and accessible name. The existing panel covers the FILES host beneath all four tabs; other children remain mounted and inert. Restore uses the captured dock pixel height and the same media DOM, without refetch; manual resize, close, focus recovery and reduced motion remain. Window shrink still imposes the existing physical maximum so an oversized restored dock cannot consume the entire short Shelf. |
| D: transport | Same Universal File API stat/readStream/stat → existing private IndexedDB → existing Chutey worker/content receiver. No provider engine, public URL, native helper, permission expansion, History-success writer or save counter was added. |

## Drag failure classification and repair

**Confirmed in source and controlled tests:** old reserve/put cleared the entire store and could delete another Shelf's live transfer; finish removed the only byte copy on both failure and unverified dispatch; preparation and claim expiry shared a race boundary; an outside drop before asynchronous reserve returned had no handle to cancel. These owning-layer defects are repaired. New reservations preserve active leases. One 60-second deadline covers metadata/read/metadata; transfer lease is 90 seconds and claim wait is bounded to 75 seconds, with a five-second registration grace. An opaque handle exists synchronously for cancellation even before the private reservation finishes.

**Not established:** the specific installed incident described as “REDOWN could not download this.” Provider auth/revocation, actual site rejection and installed worker lifecycle could independently cause it. No real credentials or disposable authorized cloud source were available. This PR does not close that incident or issue #51 by assertion.

Diagnostics record a bounded 32-event session trace of layer/state/allowlisted code/time. Source failures distinguish HTTP status, size/version change, storage and broker errors. Cleanup storage failures cannot swallow the original failure classification or produce an unhandled gesture promise. Receiver traces distinguish claim from dispatch/failure. Provider error strings, names, source/page URLs, credentials and bytes are excluded. Trace writes serialize, are best effort, and cannot change a transfer outcome. A receipt may identify its opaque lease to update its Shelf; that consumed capability never rearms.

## Queue, retry and retention policy

- Maximum **four** private entries and **32 MiB aggregate** reserved/stored budget. The existing low-memory bridge uses **8 MiB**, including its admission check. No file-size limit was raised. Expired/inactive entries may be evicted; another live lease is never silently replaced.
- Each explicit drag gets a fresh random, one-use arm/claim capability. Claims/chunks/finish bind tab, frame and origin, with ordered offsets. No automatic destination retry or write replay occurs.
- Reuse requires fresh Universal File API authorization/stat and a strong provider etag/version, exact source identity, size and version equality, plus a final stat. Reusable Blob ownership moves atomically to the fresh reservation. Its bytes stay unavailable to the receiver until the final check completes. Same-size mutation, revoked access and Clear cannot resurrect a reservation. Without a strong version, bytes are freshly read and ineligible for long retention.
- **Keep files prepared for uploading is OFF by default.** Ambiguous dispatch/failure retains a consumed copy for **30 seconds** of manual retry grace. Dispatch never means accepted attachment or verified upload. Explicit cancellation deletes its lease.
- With opt-in, eligible bytes can remain **ten minutes** for later manual reuse, including across Shelf closure. Settings exposes count/space, ceiling/expiry explanation and **Clear Prepared Files**. Opening/focusing Settings refreshes usage. Retention never grants provider access or uploads automatically.
- Incomplete reads cancel on closure/navigation. A materialized in-flight receiver can finish its already authorized handoff; retained eligible bytes expire normally. Folder navigation cancels the current source lease; other opted-in prepared entries remain private, bounded and must revalidate before reuse. Clear, logout/auth changes and opt-out purge the queue; Clear also signals open producers to abort. Browser startup clears old staging. This intentionally does not promise durable uploads across restart.
- Every read rejects expired records immediately; existing alarm/wake cleanup removes their stored bytes. Browser data cleanup can erase prepared files. Cloud originals are never deleted.

## Verification and reproducible commands

All evidence below is under [p0-2026-11-05-evidence](p0-2026-11-05-evidence/). Historic catalogs, source hashes and prior evidence were not refreshed or weakened. [Source receipt](p0-2026-11-05-evidence/source-receipt.json) lists exact implementation commits, file hashes and platform policy; [failure comparison](p0-2026-11-05-evidence/failure-comparison.json) lists all failing names.

| Command | Actual result |
|---|---|
| `npm test` in clean archived base, same installed dependencies | 1,085 tests; 974 pass; 111 fail |
| `npm test` candidate | 1,096 tests; 985 pass; **the same 111 failing names**, zero introduced or resolved |
| `node --test tests/shelf-mini-explorer.test.mjs tests/shelf-splitter-modes.test.mjs tests/shelf-preview-gestures.test.mjs tests/chutey-retry-queue.test.mjs tests/shelf-files-entrance.test.mjs` | 29/29 pass |
| `npm run check` | Syntax and manifest worker import closure pass, including the additional browser-case module |
| `npm run reliability:check` | Remains failed: pre-existing architecture findings and obsolete registered failure baseline. Syntax, API registry and issue inventory stages pass. The retained reliability receipt is pinned to `f4db70e`, before the final geometry/cleanup changes; final full-suite and syntax/package receipts are separate. Its “newFailures” is relative to that older baseline, not this PR; use the fresh name comparison above. |
| `npm run explorer:smoke -- --preset all` | 224 tests; 197 pass; 27 baseline failures |
| `python3 tests/boot-schema-conformance.py` | 6 valid fixtures; 3 invalid rejected |
| `PYTHONPATH=chute-reference/src python3 -m unittest discover -s chute-reference/tests` | 76 tests; zero failures; 9 Windows skips |
| `python3 scripts/package_chrome_store.py --audit-only` | 128 allowlisted runtime files; audit-only artifact under work; no release or publication |
| `SHELF_P0=1 SHELF_EVIDENCE_DIR=work/p0/pr-browser node scripts/shelf-mini-explorer-browser.mjs` | Controlled P0 interaction/geometry/receiver matrix; see `p0-browser.json` |
| `SHELF_EVIDENCE_DIR=work/p0/pr-regression node scripts/shelf-mini-explorer-browser.mjs` | Existing full ordinary-browser regression passes in both memory-policy classes; see `browser-regression.json` |

The browser harness loads actual Shelf routing, Explorer, File API/R2 adapter, staging, worker and content receiver. Only provider/Chrome boundaries are fixtures. Both policies run on the **same Linux machine**, not different RAM hardware. P0 checks 160 width/theme/split cells (320/390/700/900 × four themes × 0/25/50/75/100 × two policies), plus Detailed/Large Images, closed/open/expanded dock, exact restore pixels, reduced motion, rapid routes, original bytes and manual reuse. Media tests cover 0/1/100/10,000 rows, long non-image filenames, portrait/landscape/ultrawide and the final logical row after collapse/reopen. The original regression covers 320/360/390/540/700/900 widths, 192 scroll configurations, both modes, both scrollports, paging, simulated auth/offline recovery, manual dock resizing and separate Window Preview.

The final 120-sample pointer traces recorded 114 coalesced row replacements and eight mounted rows at the last item. Normal/low-memory-policy runs measured scripting **441.8 / 502.8 ms**, layout **319.0 / 351.8 ms**, and style **258.5 / 292.8 ms** in aggregate. Automated pointer wall times were 4.42 / 5.08 seconds, including Playwright input pacing. Earlier uncached runs recorded 2.13 / 2.66 seconds of scripting; host load differed, so this is supporting evidence, not a controlled speedup ratio or physical 60-fps/4-GB certification. Both raw traces are retained. No timing outliers were removed. The existing navigation benchmark measured 404 ms for 10,000 rows in the normal-policy run, exceeding the prior 200 ms goal (low-memory-policy simulation: 87 ms). That navigation budget remains open; neither policy class represents a hardware RAM comparison.

[Video excerpts](p0-2026-11-05-evidence/controlled-browser-excerpts.mp4) show actual browser gestures and tab movement, with [capture/edit receipt](p0-2026-11-05-evidence/video-receipt.json). [Split fully left](p0-2026-11-05-evidence/split-320-0.png), [50/50](p0-2026-11-05-evidence/split-320-50.png), [fully right](p0-2026-11-05-evidence/split-320-100.png), [expanded Preview](p0-2026-11-05-evidence/preview-expanded.png), [decoded media](p0-2026-11-05-evidence/portrait-landscape-media.png), and slide [during](p0-2026-11-05-evidence/slide-during.png)/[after](p0-2026-11-05-evidence/slide-after.png) are controlled fixture screenshots. Larger images are synthetic test patterns, not user cloud content.

Earlier retained failed receipts document the real ultrawide minimum and duplicate-route defects. Expanded media measurements also found fixture reads holding detached virtual DOM nodes; the harness now measures current connected nodes atomically and waits for decoded geometry, rather than asserting zero dimensions from a stale handle. The retry fixture now waits for durable receiver receipts and byte reception rather than transient status text; rapid animation cancellation uses explicit keyboard activation of the moving Settings tab. A temporary usage-polling timer was removed after it kept test windows alive. Incomplete exploratory runs remain under work; they are not counted as full-suite passes.

## Destination compatibility and remaining acceptance

Browser: **Chromium 154.0.8037.57 / Debian 13**. Managed policy has `ExtensionInstallBlocklist: ["*"]`, no install sources. No bypass was attempted. Chrome 155+, installed-extension trusted cross-window/side-panel/popup delivery and actual Windows 11 acceptance were unavailable.

| Destination | Source/action | Observed receiver / acceptance | Verified upload |
|---|---|---|---|
| Controlled HTML file input | Mock-authorized R2 original; actual trusted browser drag, delayed arm/read | Input independently read exact `file-00000.png`, image/png, 68 bytes; SHA-256 `8c88f2741daaf1be8bded5a81ecfc672ca818fac04310380099745b8f937a5a8`. Explicit second drag reused bytes after stat checks. | No remote upload performed |
| Controlled custom drop target | Same original and actual initiating drag | Receiver reconstructed File; custom handler independently read identical bytes. Target receives synthetic File drop (`isTrusted:false`). | No remote upload performed |
| ChatGPT attachments | Existing Chutey File/drop path | **Live unverified**; fixture acceptance is not site acceptance | Unverified |
| Google Lens | Existing image adapter | **Live unverified**, independently of Google Image Search | Unverified |
| Google Image Search | Existing image adapter | **Live unverified** | Unverified |
| Yandex Images | Existing image adapter | **Live unverified** | Unverified |
| Browser-restricted pages / no receiver / desktop OS / multi-file / over budget | No authorized browser relay/native path | Unsupported in this transport; Download + destination picker fallback | Not claimed |

Further gates: real provider timeout/auth mutation, actual browser storage quota exhaustion, service-worker suspension/restart in installed Chrome, revoked host permission, real cross-origin navigation during delivery, physical low-RAM pressure, screen reader and Windows drag/trackpad acceptance. VM/fake IndexedDB tests prove the broker/store code paths, not those platform outcomes. The adapter has no separate thumbnail service: >256 KiB originals keep type placeholders until explicit bounded Preview; it does not fabricate full-resolution thumbnails.

## Privacy, packaging and rollback

Universal File API remains cloud authority. Staged data contains original bytes/name/MIME, opaque identity/version hashes and lease/receiver state, never provider credentials or source/page provenance. Destination receives an opaque drag reference and then a legitimate File where browser policy permits. Redacted diagnostics never contain file bytes, names or URLs. Verified save counters and History remain owned by existing authoritative save flows.

Existing Chute attribution and `CHUTE-LICENSE.txt` remain. No new dependency or reference code copy was added. Audit-only packaging does not waive the existing Chute non-commercial/commercial-authorization or installed/live release gates.

Rollback: stop/cancel active handoffs, turn retention OFF and use Clear Prepared Files **before** reverting the PR commits newest-first. The old broker does not understand consumed retained capabilities, so clear the private `redown-chute-v1` store before a downgrade. No cloud/OAuth/native migration is required; old code ignores new preference keys. Never delete cloud originals as cleanup. The independent entrance, geometry, Preview and transport feature commits, followed by narrow regression fixes, are enumerated in the source receipt. Do not merge or deploy as part of this PR.
