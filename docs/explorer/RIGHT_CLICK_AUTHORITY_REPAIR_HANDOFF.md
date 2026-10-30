# REDOWN right-click authority repair handoff

**30 October 2026. Branch:** `release/cloudflare-true-remote`. **Audited starting point:** `515c272c48f89eb3f509fa2c7a5a02e0db53f66b`.

## Page 1: implementation and ownership

**Completed:** full Nested group removal, draft Undo, final-root card removal, compact empty states, persistent intentional emptiness, legacy native-menu isolation, active-ID routing checks, serialized callback-confirmed native rebuilds, and protection against delayed storage-preparation writes resurrecting deleted definitions. No cloud resources were deleted or changed during this task.

**Confirmed causes:** the old renderer created an account card for every eligible profile even when `nestedMenu.roots` was empty. Removing roots removed only their DOM groups. `fromLegacy` also created an empty bucket root even without a legacy tree. Separately, `buildMenus` qualified profiles using `menuTree`, called `addPresetTree`, and retained legacy tree click routing. Simple click handlers could still execute removed or excluded IDs. Worker/domain preparation could overwrite newer menu definitions with an earlier profile snapshot.

**Authoritative path:** modern Explorer draft → shared projection and active-layout validation → optimistic, serialized background transaction → local `profiles` plus shared `rightClickMode` → deterministic native description → parent-first Chrome creation with checked callbacks → current active saved-ID resolution → established exact-prefix transfer engine. The description includes destination identity and operation; only Chrome API presentation fields are submitted to Chrome. Rebuilds are serialized. Partial creation failure clears the partial menu, retains saved configuration, and asks the user to retry Save. A successful Save message requires successful native callbacks.

`addPresetTree`, native legacy qualification, tree routing, gallery legacy routing, and the old label-fallback setting's native influence are removed. Legacy settings link to Explorer. Storage/domain and experimental GitHub preferences remain available; unrelated legacy saves use an exact-sender-checked whitelist in the same save lane. Legacy GitHub trees no longer generate native destinations, since the modern editor currently owns Cloudflare destinations only. Existing non-menu GitHub ingestion remains intact.

**Removal semantics:** a card owns a profile's Nested roots. Remove clears those definitions, removes the card, marks the draft dirty, and offers Undo. The profile, credentials, buckets, Worker and objects remain. Include preserves definitions while disabling their menu. Removing the final root removes its card; Reload cancels an unsaved removal. Blank unfinished active rows fail validation rather than becoming apparently configured saved destinations. New Nested additions do not implicitly enable a Simple primary destination.

Repeated visible account names are distinguished with bucket context and stable profile IDs. No live user configuration was available, so the screenshot's individual cards cannot be classified as duplicate authorization records. No account-name deduplication or profile deletion was attempted. Duplicate profile/menu IDs fail validation.

**Migration:** `menuConfigVersion:1` marks modern initialization. Existing Nested models, including empty roots, always win. Missing unversioned models may import legacy paths into the modern draft, persisted only on explicit Save. Missing versioned models initialize empty. The first save preserves a menu-only `menuConfigurationBackupV1`, including obsolete trees but excluding credentials; that backup is never a menu-generation source. Blank labels derive from the deepest folder or bucket. Undefined old automatic primary prefixes become the displayed bucket-root destination in a saved modern draft. New legacy storage provisioning cannot seed native destinations; only explicit modern activation can do so.

## Page 2: verification, files and remaining work

| Verification | Result |
|---|---|
| Baseline full suite, archived `515c272` source | 661 tests: 619 pass, 42 fail |
| Final full suite via reliability runner | 673 tests: 632 pass, 41 fail; zero skips |
| Focused modern editor, Simple parity and reconnect suite | 38/38 pass |
| Compared with audited baseline | No newly failing tests; production routing regression now passes |
| Syntax, API registry, issue inventory | Pass |
| Reliability overall / architecture freshness | Failed; architecture references remain stale and existing suite debt remains |
| Real Chromium extension attempt | Blocked: `CHROME_NOT_AVAILABLE_ENOENT`; zero real-browser assertions |

Tests exercise child and parent deletion, group deletion, last-root removal, all-empty Simple/Nested configurations, Undo/Reload, save/reload and fresh editor/background contexts, readdition without resurrection, same-account groups, exact account/bucket/prefix routing, stale/deleted/inactive IDs, versioned migration, backup preservation, native callback failures/retry, parent callback ordering, later rebuild precedence, stale-window rejection, and delayed Worker/domain writes. External mode-only updates preserve and rebase unsaved edits; actual profile changes still reject stale saves. These are jsdom and mocked Chrome/transfer tests, not installed-extension or live R2 proof.

**Incomplete:** genuine Chrome labels/order/flyout interaction, browser restart persistence, actual remote-save receipts, narrow-screen visual acceptance and live authentication/Worker readiness. No live Cloudflare mutation was performed. The full suite still includes the pre-existing removed Nested drag-handle expectation, stale login harness imports, historical source/evidence failures and unrelated Explorer/history/Shelf assertions. The evidence JSON lists every remaining failure. The older reliability registry recognizes only seven of them; its other 34 failures also occur at the audited baseline. Frozen historical evidence was retained.

Existing toolbar New Folder, default-off per-folder plus controls, Upload Folder styling, Activate Buckets placement, Keep Both, Image Reader/archive browsing/extraction and file-operation implementations were not rewritten. The full suite ran their existing coverage, with baseline failures retained; this does not certify every requested regression protection as passing.

**Every changed file and purpose:**

| File | Purpose |
|---|---|
| `extension/background.js` | Remove competing generation/routing; deterministic callback-checked builds; shared save lane; menu backup; legacy preference isolation; modern activation gate; preserve current menus during delayed profile writes. |
| `extension/destination-config.js` | Version field, duplicate/unfinished-row validation and shared active exact-destination resolver. |
| `extension/nested-locations.js` | Repeat-safe draft initialization, no empty legacy bucket fabrication, no legacy mode fallback. |
| `extension/nested-menu-editor.js` | Full removal/Undo, final-root cleanup, bucket context, distinct Child action and keyboard focus. |
| `extension/beta/destinations.js` | Versioned drafts, honest empty state, explicit primary paths, external mode rebase and retained inactive definitions. |
| `extension/beta/explorer.css` | Compact themed groups, restrained removal, focus states, wide-screen first-level columns and capped responsive indentation. |
| `extension/options.js` | Redirect legacy menu editing; retain storage preferences; delegate unrelated writes safely. |
| `extension/options.html` | Update legacy section guidance. |
| `tests/modern-destinations.test.mjs` | Production listener, deletion/persistence/parity/migration/race/provisioning regressions. |
| `tests/nested-locations.test.mjs` | Parent deletion and new legacy read-only contract; retain existing drag-handle failure. |
| `tests/simple-menu-flat.test.mjs` | Assert obsolete label preference cannot override modern labels. |
| `tests/cloudflare-reconnect.test.mjs` | Expect legacy read-only status after reconnect. |
| `tests/agent-api.test.mjs` | Require the additive preferences handler without changing the frozen 37-entry inventory. |
| `docs/explorer/MODERN_DESTINATIONS.md` | Current message, migration, ownership and mode documentation. |
| `docs/explorer/evidence/right-click-authority-2026-10-30.json` | Exact counts, remaining failures, baseline comparison and real-browser block. |
| `docs/explorer/RIGHT_CLICK_AUTHORITY_REPAIR_HANDOFF.md` | This handoff and delivery record. |

**Next actions:** retest scenarios A–F in an approved Chrome extension environment using an isolated profile; verify actual remote receipts against the selected bucket and prefix; inspect narrow and themed layouts. Address baseline suite debt separately. Local green focused tests do not constitute final live acceptance.

**Delivery record:** implementation commit and push results are recorded below after publication.
