# P0 Split View, Nested/Depth and verified Save Changes

30 October 2026, America/Chicago. Branch: `codex/v3-parity-first-reconstruction`.

Implemented and locally verified. Installed Chrome, native geometry, visual/accessibility acceptance, and live provider acceptance remain unverified. This is not release certification.

## Commits and inspection

Source baseline: `223775c` (latest published branch, including the preceding natural hierarchy/bucket participation reconstruction). Fresh pre-edit focused baseline: 66 passing tests. Protected checkpoint objects are recorded unchanged in `split-save-evidence/protected-tags.json`.

Published implementation commits prepared through connected GitHub:

- `c326ba00b796bc77a47568ac02edf6e69ba82db7`: native Split View and Shelf preservation; identical tree to local tested commit `c20d37f888e9840c7a511eb319b706dd2b26df8c`.
- `b2c26948122ff125d3e6fc149bfc3b6c1eff4571`: compact controls and acknowledged menu application; identical tree to local final tested implementation `937a8c8d8209308c3e719c0204f653842fa04412`.

Concurrent documentation-only commit `036247cc7b52a08f47b36bb5b393f7ede123de12` added an open native-menu diagnostic-warning report to `bugs/README.md`; it is preserved in the final merge. That separate issue is not claimed fixed here. No source or test changes arrived in that commit.

This report and evidence follow in the documentation delivery commit. Its SHA is supplied in the delivery response and branch history. Git CLI push lacks credentials; connected GitHub publishes the exact tested trees, without forcing the branch or moving tags.

Inspection covered AGENTS.md, unified diagnostics/start/readiness/registry/issue discovery, Forever current-state and discovery, existing engineering/architecture/message/operation reports, current handoff, History implementation and instance-reuse reports, menu implementation/reconstruction, actual navigation/editor/background/manifest sources and existing tests. The preceding branch already supplies the required Simple/Narrow/Level semantics; this change preserves that implementation rather than replacing it.

## Changed source and tests

| File | Result |
| --- | --- |
| `extension/history-navigation.js` | Tab selection in the current window, native Split View creation/pairing/reuse and order checks, side-to-split preference migration, explicit fallback |
| `extension/beta/explorer.mjs` | Remove old side-panel intents; retain the shared exact-file receiver and preview pipeline |
| `extension/shelf.html` | GO TO setting becomes Open in Tab (Default) / Open in Split View (Left) |
| `extension/background.js` | Sender-gated `applyRightClickV3` in existing serialized save lane; opaque application receipts; applying/partial/superseded/failed status |
| `extension/beta/explorer.html` | Left header context and status, fixed-width Save Changes and accessible apply status |
| `extension/beta/right-click-v3-ui.js` | Bucket disclosure, retained/retryable scope drafts, confirmed apply button state, pending glow hooks, edit epochs and reconciliation |
| `extension/beta/right-click-v3.css` | Compact depth/bucket controls, floating bucket surface, thin scrollbars, responsive header and restrained static glow |
| `tests/history-go-to.test.mjs` | Replace superseded Side Panel expectations with migration and Split View regressions |
| `tests/right-click-v3.test.mjs` | Real UI/dispatcher/background apply tests; Web Crypto in background fixture and asynchronous digest settling |

## Chrome API evidence and navigation contract

Official reference checked during implementation: https://developer.chrome.com/docs/extensions/reference/api/tabs

The reference marks `tabs.create`'s `splitWithTabId` and `tabs.createSplit([id,id])` as Chrome 155+. A new split tab must share its window with the target, which must not already be split; an explicit index must be adjacent and determines relative position. Existing tabs paired with `createSplit` must be adjacent, unsplit and have matching window, pin and group states. `Tab.splitViewId` exposes membership; tab indices expose strip order.

Runtime checks require `tabs.createSplit` and reject a known Chrome/Chromium version below 155. A browser without the method gets an actionable error, even if its reported version is newer. No undocumented API or Side Panel substitute is used.

For Tab mode, probe only exact REDOWN Explorer URLs in the current window, preferring the active instance, then stable tab ID order. Activate and navigate a ready receiver without URL replacement. The existing Beta Dashboard lives in that same Explorer document, so it transitions using existing internal navigation and preserves the document. Tabs in unrelated splits are not repurposed. Other windows are never raided. Activate a discarded/frozen eligible Explorer for its readiness probe; if existing candidates remain unready, show recovery guidance instead of adding duplicates.

For Split mode, use the current window's active webpage, or recover its peer when the active tab is already a paired REDOWN Explorer. An existing matching split must have an authenticated ready receiver and confirmed Explorer-before-webpage index order. Refuse an unrelated split or a reversed arrangement, with explicit recovery guidance.

For a compatible existing unsplit Explorer, move only REDOWN adjacent to the original webpage and call `tabs.createSplit`. For a new Explorer, call `tabs.create` with `splitWithTabId`, the original tab's index/window and pin state. Re-query actual tabs to require matching split membership, current window, and Explorer index lower than the webpage. Group/pin mismatch is never repaired by changing the webpage; compatible existing states are supported, and creation/API failures are reported. Creation with grouped or pinned pages still needs native Chrome acceptance.

Index/membership read-back is API-level evidence for the intended left/right arrangement, not a screenshot proving rendered geometry. The original webpage is never navigated or reloaded. Missing tab, moved window, unrelated split, unready receiver, API rejection, or unconfirmed arrangement leaves an error and an explicit Open in Tab action. Fallback does not run automatically or change the stored preference. A failed pairing may leave an Explorer tab moved or newly created; no original tab is closed, unpinned, ungrouped or unsplit to recover from it.

Existing `side` preferences map to `split` and are migrated in existing local storage. Default remains `tab`. No other Settings or side-panel registration changes.

## Shelf and exact-file preservation

There is no remaining `chrome.sidePanel.open`, Shelf `location.href`, Shelf relay, or `historySideNavigation` path in GO TO. Shelf keeps its document, History and Settings. The only Shelf HTML change is the two GO TO preference options, verified byte-for-byte after that substitution.

Both modes deliver the same expiring opaque UUID handoff to the same receiver. Provider/account/bucket, final Keep Both object key, paginated exact-key lookup, containing folder, selection/scroll/focus and existing preview are preserved. Credentials and object paths never enter tab URLs. Probe and acceptance/completion acknowledgements remain session-backed, independent of MV3 worker suspension. Web Locks serialize instance selection across same-origin extension pages; the existing local lane serializes requests within a page. New requests supersede old selections and previews using the existing receiving epochs/abort rules.

Actual MV3 suspension/restart and cross-page Web Locks behavior still require installed Chrome. This does not claim durable navigation after extension reload; expired/missing handoffs retain existing recovery behavior. Navigation errors never rewrite History records. Failed/cancelled/incomplete rows and their original URLs/retry/details remain unchanged, with exact DOM equality covered by regression.

## Menu semantics and bounded discovery

`extension/right-click-v3.js` is byte-identical to the preceding implementation:

- Simple: ordered flat configured destinations, labels and exact routing unchanged.
- Narrow: natural configured-path hierarchy, synthetic nonwritable ancestors, configured-only save targets, stable IDs and disabled-ancestor behavior.
- Level: explicitly selected bucket roots, including real unconfigured folders, depth counted from bucket root zero, exact identity/prefix routing.

The bucket disclosure is wired to `rightClickV3LevelScopes`; it never silently enables all buckets. Account identity is visible, with profile ID added for duplicate account/bucket profiles. Selections survive failed persistence within the page; rapid changes serialize through the existing background writer. Lost acknowledgements are reconciled only when the saved bucket set matches the retained choice. Foreign conflicting edits remain reviewable rather than silently rebased.

Depth remains an independent numeric 1–10 input. Native number entry/arrow keys, segmented radio keys, native checkbox keyboard behavior and Escape-to-summary focus are retained. Header explanation/status uses left space; the floating disclosure contains bucket rows, not depth or miscellaneous setup controls. It uses a bounded scrollport, thin rounded thumb, ordinary keyboard scrolling and no horizontal overflow. The glow is static, has text/status equivalents, visible focus, and transition removal under reduced motion. Save labels use a fixed-width surface. Narrow layouts stack the header while retaining essential controls.

Inventory limits remain 500 folders, 80 pages, 20-second total discovery budget, per-read deadline, 300 projected entries and five-minute cache lifetime. Failed/partial/stale discovery stays explicitly partial. No safeguard or cloud transport was removed.

## Save Changes state machine and acknowledgment

Existing autosave remains the persistence owner. The button does not create a second writer or falsely label persisted settings unsaved. It explicitly applies/retries Chrome registration after any outstanding persistence.

| State | Button | Meaning |
| --- | --- | --- |
| Pending/unapplied | Save Changes, soft glow | Current choices require explicit application confirmation; persistence status remains separate |
| Applying | Applying…, disabled | Wait for destination, presentation and bucket saves, reconcile retained edits, then send apply request |
| Confirmed | Saved, no glow | Matching application receipt, active V3 engine, registered and complete projection |
| Failure/unknown/partial | Retry Apply, pending glow and text | Retain choices, explain error, allow deliberate retry |

`applyRightClickV3` is restricted to the actual Explorer sender and uses `destinationSaveQueue`. It checks expected destination revision, bucket-scope revision and presentation. It refreshes Level inventory through existing bounded discovery, then uses the existing serialized native rebuild. Save never rewrites destination revisions merely to retry registration.

Each native rebuild first reports applying, then awaits `contextMenus.removeAll` and every actual creation callback, including Chrome lastError checks and existing timeouts. An opaque SHA-256 application key binds the persisted engine, Legacy projection settings, destinations/revision, presentation, participating buckets, inventory and profile inputs. Raw credentials never leave the background through that receipt. The key is checked again after registration; changed inputs produce superseded, incomplete inventory produces partial, failure produces failed. Snapshot returns the current expected key separately from the acknowledged receipt.

The button requires a complete registered receipt matching the current expected key. An edit epoch prevents older Apply responses from clearing newer pending state. Background status events never clear a local pending edit by themselves. Restarts/reloads reconcile through current snapshots; old receipts without keys remain pending, and expired Level inventories return to pending. Foreign destination revisions need review; transient persistence failures or a lost response with identical saved content can be retried without discarding the local draft. Native failures do not roll back persisted configuration.

## Evidence and verification

Evidence directory: `split-save-evidence/`.

- Fresh focused baseline: **66 pass, zero fail**.
- Final focused suite: **78 pass, zero fail**, normal test completion without force-exit. Includes existing natural hierarchy/discovery, actual UI/dispatcher state stability and tree focus regressions, plus split pairing/creation/reuse, explicit fallback, Shelf preservation, native callback delay, edits during Apply, failed registration/retry, partial inventory, bucket persistence retry, sender gates and application identity.
- Final required reliability run: **645 pass, 69 failed names, incomplete**. Identical failed names to the preceding published reconstruction report; no additional or resolved failed names. Syntax/API registry/issue inventory pass; architecture freshness fails. This is an archived full-report comparison, not a fresh full pristine baseline. Frozen evidence assertions/hashes were not weakened or refreshed.
- Source hashes and unchanged-region checks cover the tested final implementation. Manifest, History renderer/CSS, exact-key adapter, File API, menu domain, Legacy domain, public URL module, archive, odometer counter and Dashboard CSS remain unchanged. The entire tree `draw()` renderer is unchanged.
- Installed Chrome check: **blocked, `CHROME_NOT_AVAILABLE_ENOENT`, zero assertions**. No native split geometry, installed context menu, real keyboard/screen reader, actual MV3 lifecycle, desktop/narrow visual screenshots or live Cloudflare proof is claimed.

No before/after screenshots are fabricated. Design before/after is inspectable in the HTML/CSS/JS commit diff: inline scrolling bucket fieldset becomes a floating bucket-only disclosure; large depth field becomes compact numeric input; status moves left; explicit acknowledged Save button is added. Pixel-level visual quality remains an acceptance task.

## Remaining acceptance

In an approved Chrome 155+ environment, verify Explorer physically left and original webpage right, Shelf still present and functional, repeated GO TO without new tabs, exact saved-file selection/preview including Keep Both, multiple windows, grouped/pinned pages, discarded/moved/closed tabs and MV3/extension restart. Verify unsupported/API-failure fallback requires a click.

Capture actual desktop/narrow before/after screenshots, keyboard/screen-reader behavior, natural scrolling and reduced motion. Change destinations/labels/order/enabled states/modes/depth/bucket scopes, press Save Changes, inspect the real native menu, induce registration/provider failure, retry, and check that pending/newer edits are never falsely confirmed. Large inventories remain bounded and truthfully partial. Existing full-suite/architecture debt remains open.
