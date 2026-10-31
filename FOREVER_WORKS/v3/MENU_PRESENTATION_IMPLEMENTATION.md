# V3 menu presentation implementation

30 October 2026, America/Chicago. Scope: V3 presentation, native projection, bounded read-only inventory, and necessary existing routing integration. Source start `a1bd4d1d99d7a9bc38a5dfb3db8fc10082d237c4`. Protected `BASE-v3` annotated object `322358123d78cebad75ee4503f30c33cfa34459c`, peeled commit `209a52cd1515d44f0dab005e26b738e678c29b65`. The checkpoint is an ancestor of the start. No tag or release branch is updated.

Implementation commit: `906c0493af021d2c1387840b0cdf57d95ab19b23`.

## Reused boundaries and changed files

Inspection covered AGENTS, the unified diagnostic entrance, agent architecture/operation/message/change reports, the current-state corpus, V3 canonical/architecture/acceptance/engine contracts, and the Phase 3 UI-to-wiring, divergence and native registration audits. Those audits describe historical source, not proof that proposed functions exist. The starting source had a tree-only V3 projection, no presentation preference or Level inventory. The current V3 store, sender gate, shared serialized persistence lane, native rebuild queue, R2 listing, exact save path, byte read-back, History and engine selector are retained.

| File | Change |
| --- | --- |
| `extension/right-click-v3.js` | Independent preferences, flat and saved-tree projections, authorized roots, inventory traversal/freshness, bounded Level projection and current-target resolution |
| `extension/background.js` | Sender-gated preference transaction/snapshot/refresh, persisted inventory, projection registration/status, exact discovered-target resolution, invalidation and Level-only alarm maintenance |
| `extension/beta/explorer.html` | Existing setup title wrapped with the single compact header control group |
| `extension/beta/right-click-v3.css` | Appended header-only styles, fixed control slots/status scrollport, 200ms entrance and reduced-motion rule |
| `extension/beta/right-click-v3-ui.js` | Independent control binding/persistence and status; queued rapid preference edits; explicit Reload inventory refresh; no tree redraw on preference/status changes |
| `tests/right-click-v3.test.mjs` | Existing tree projection test explicitly selects Narrow; added presentation/inventory/background/UI regression cases and extended local harness |
| `FOREVER_WORKS/v3/CANONICAL_DESTINATION_AND_MENU_CONTRACT.md` | Current projection contract linked to this implementation |
| `FOREVER_WORKS/v3/HANDOFF_LATEST.md` | Current evidence, limits, gaps and delivery references |
| `FOREVER_WORKS/v3/menu-presentation-evidence/` | Diagnostic, focused, full-suite, browser-block and preservation evidence |

The existing tree renderer, CSS prefix and DOM beneath the header are byte-identical. The active click/save/History listener, ingest function, existing listing function, Legacy engine, public-address library, Cloudflare client, Explorer module, Options, History module and engine selector are byte-identical. See `menu-presentation-evidence/preservation.json`. No second editor, alternate destination store, new provider abstraction, dependency, manifest permission, Worker or remote mutation was added.

## Preferences and mode semantics

`rightClickV3Presentation = {style:'simple'|'nested', nested:'narrow'|'level', depth:1..10}`. Missing preference defaults to Simple, Narrow, depth 1. All fields persist together; selecting Simple retains the last nested choice and depth. This key is independent of `rightClickV3`, destination revision, Legacy `rightClickMode`, and `rightClickEngine`. Neither mode changes nor inventory reads write destination records or infrastructure profiles.

`setRightClickV3Presentation` accepts only the exact existing Explorer sender, validates positive integer depth 1–10, and compares `expectedPresentation` with the serialized saved preference under the existing transaction lane. Stale windows reject rather than overwriting. The UI queues rapid changes behind acknowledged preferences while native radio focus stays active. Unknown outcomes display the error; Reload reconciles. Legacy remains independently selected in Settings. Presentation preferences can be saved while Legacy is active, without changing Legacy's menu semantics.

| Mode | Projection | Routing |
| --- | --- | --- |
| Simple | Every eligible configured record directly under REDOWN, in saved array order, using its custom label | `v3:ID`, revalidated against current saved configuration |
| Nested / Narrow | Existing parent relationships and sibling ordering; duplicate labels remain distinct; parents with children gain `Save here` | Leaf `v3:ID`; branch target `v3:ID:send` |
| Nested / Level | Actual bucket/folder names from authorized inventory, sorted by exact profile ID/path, including discovered siblings | Encoded profile ID and exact prefix identify inventory nodes; current authorized root/profile and inventory are rechecked |

Existing V3 inclusion semantics remain: disabled ancestors suppress their subtree. All canonical records still validate, including disabled records. A revoked/malformed target cannot silently fall back to a default bucket. Simple performs no directory discovery. Narrow performs no directory discovery. Level does not use custom labels. Switching modes rejects obsolete branch/action IDs that are not selectable in the current projection.

## Level root policy and directory depth

Only **enabled, top-level canonical V3 destinations in prepared Cloudflare profiles** authorize traversal. Profile readiness still means matching profile/account/bucket plus existing Worker URL/token, not a successful provider probe. Merely having another active profile does not expose it. No new account/bucket enumeration or preparation is performed.

Within each profile, duplicate/overlapping roots collapse to the broadest authorized prefix; slash-boundary containment prevents `photos` from authorizing `photos-private`. A bucket-root destination authorizes that bucket's real children. An authorized subfolder exposes only itself and its descendants. Subfolder roots sit beneath their true bucket heading; that heading is not a save action outside the authorized root. For a multi-segment authorized root, its true final folder name is shown directly beneath the bucket; ancestors outside the authorized root are not fabricated as writable directories. Two roots with equal final names remain distinct by exact prefix.

The authorized root is depth zero. Depth 1 discovers immediate children; depth 2 discovers children and grandchildren, through depth 10 subject to bounds. Parent directories remain saveable using `Save here`. At the selected depth boundary, a directory can be a direct save leaf even if deeper cloud descendants exist. No remote read is necessary to save to a configured root; its existence is configuration intent, while discovered children are observed prefixes.

## Read-only inventory and bounds

Discovery reuses existing `listObjectsPage(accountId,bucketName,prefix,cursor,'/')`, the same paged read used by `cfDestinationFolders`. Existing RFIS opt-in observation behavior is retained. It never calls preparation, folder creation, upload, rename, delete, domain or public-enable handlers. R2 directory names are exact prefixes derived from delimiter results and folder marker/object keys. Objects alone do not imply pagination completion. Unusable/repeated cursors and truncated pages without a cursor produce incomplete status.

| Bound | Value and behavior |
| --- | --- |
| Directory depth | Integer 1–10, validated in UI and background |
| Inventory nodes | 500, including configured roots |
| Listing pages | 80 total per inventory, sequential across roots |
| Traversal deadline | 20 seconds; each page wait at most 8 seconds or remaining budget |
| Native projection | 300 V3 entries including headings and `Save here`; REDOWN and existing utility/status controls are additional |
| Cache lifetime | 5 minutes from inventory completion, including partial inventories |
| Prefix eligibility | Existing exact-save contract: at most 900 UTF-8 bytes; no backslash, controls or empty/dot segments |

A page timeout stops the entire traversal, preventing accumulation of unresolved reads. The reused listing API has no cancellation parameter: one already-issued read may settle after timeout. Its result is ignored by the completed traversal. Single-flight refresh prevents parallel traversals while a refresh is running. No remote work runs in a native-menu-open handler.

The persisted `rightClickV3Inventory` contains version, root/depth/revision/Worker-location key, observation timestamp, credential-free nodes, page count, completeness and sanitized warnings. Credentials and raw provider errors are never included. Deterministic sorting occurs after traversal. Given a bounded partial provider result, sorting is deterministic; different live provider contents can of course change the next inventory.

Destination revisions, selected depth and Worker/target identity invalidate the key. Profile changes clear inventory before rebuilding, including credential/activation changes with unchanged paths. Refresh rechecks profiles and root keys before publishing results; late discovery is discarded and another build is scheduled. User Reload explicitly refreshes Level. Startup, presentation/configuration changes and the five-minute Level-only alarm reconcile menus; registration uses only the current cached projection and schedules discovery separately. Simple, Narrow and Legacy have no periodic menu rebuild from the new alarm. There is no automatic mutation-triggered directory refresh from Explorer; freshness is timestamped, expires after five minutes, or can be refreshed with Reload.

If no inventory exists, the cache is stale, a page fails, or any bound is reached, native menus contain a disabled explanation and the setup status reports the limitation. Registration status is `partial`, never full success. Known configured roots and successfully observed folders may remain available in a partial fresh inventory. Expired inventories fail closed at click resolution even if an old native menu is still visible. A new background wake/rebuild/periodic alarm replaces the stale native projection. A service worker stopped mid-discovery has no committed partial result from that run; existing key/TTL rules apply on restart.

## Native registration and existing save engine

The existing serialized `removeAll` / parent-first `create` queue remains authoritative. Callback `runtime.lastError` and timeouts remain checked. A native failure clears the failed build, retains saved settings and reports `menuUpdated:false`. Completeness is independent of registration acknowledgement. Limits never rewrite the canonical destination list, merge labels or create discovered destination records. A branch is not truncated immediately before its own `Save here` action.

Cloud IDs encode profile identity and exact prefix, never the visible label. The shared resolver returns the existing `{profile,owner,prefix}` contract only for selectable entries in the current projection. The existing listener recognizes `v3:` actions, calls the same non-provisioning exact-prefix ingestion operation and verifies destination object bytes/metadata before History success. No transfer, URL or provider-authentication implementation changed.

## Header behavior and evidence boundaries

The primary Simple/Nested native radio group is always present; Narrow/Level appears beneath it only for Nested; the native number control appears beneath Level. Hidden choices remain persisted. Fieldsets/legends, labels and the number input's accessible name use native semantics. Three fixed-height slots and a bounded scrollable status area keep the editor's position stable during disclosure; narrow containers stack the header predictably. Entrance uses opacity and a four-pixel settle over 200ms with reduced-motion opt-out. Existing editor CSS and tree behavior are unchanged. External presentation/status changes do not redraw the tree or steal editing focus; hiding a focused presentation control restores focus within the primary group.

DOM/mock testing establishes state, persistence, selected radio values, numeric validation, focus ownership and lack of tree remounting. It does **not** prove rendered widths, animation quality, native arrow-key defaults, accessibility-tree output or screen-reader announcements. No browser screenshots or rendered macOS/Windows acceptance are claimed. The installed-Chrome script records `CHROME_NOT_AVAILABLE_ENOENT` with zero assertions. No live Cloudflare reads, saves or mutations were performed for verification.

Primary references consulted: [Chrome contextMenus](https://developer.chrome.com/docs/extensions/reference/api/contextMenus), [WAI radio pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), and [Cloudflare R2 listing guidance](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/). The 300-entry cap is a REDOWN product bound, not an assertion of Chrome's hard submenu maximum. Existing repository REST listing normalization is reused; Workers binding documentation is reference guidance, not a claim that this implementation uses a new binding or endpoint.

## Verification and remaining acceptance

See the current handoff for exact final counts and commit references. Focused tests exercise actual domain and sliced background registration/routing functions with synthetic callbacks/storage/provider pages, plus the real setup controller in JSDOM. Existing focus/plus/rename/form/checkbox regression cases remain active. New coverage includes modes, duplicates, parent saving, all depths 1–10, roots, siblings, pagination, broken cursors, failures, all bounds, cache serialization/expiry, stale IDs, service-worker fixture restart, late reads, single-flight, Level-only alarms, credential invalidation and rapid control persistence.

Required remaining acceptance: install the packaged extension in an approved Chrome environment; inspect actual native submenu rendering/callback behavior and service-worker interruption; visually review desktop/narrow/reduced-motion geometry; run keyboard and screen-reader acceptance; verify authorized disposable R2 folders, remote saves and read-back through History/Explorer. Resolve or classify the existing broader test debt and architecture freshness independently. Source/mock passes do not close those gates.

## Subsequent owner-semantics reconstruction

See [Natural Narrow / participating-bucket Level](NARROW_DEPTH_RECONSTRUCTION_IMPLEMENTATION.md)
for the newer implementation. Earlier parentId-only Narrow and configured-prefix
Level semantics above are historical, superseded descriptions.
