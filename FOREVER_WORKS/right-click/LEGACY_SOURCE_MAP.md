# Legacy historical and current source map

[Route](README.md) · [Comparison](SIDE_BY_SIDE_MATRIX.md)

## Verified landmarks

| Revision | Inspected meaning |
|---|---|
| 515c272c48f89eb3f509fa2c7a5a02e0db53f66b | Whole-profile Legacy saveProfiles wrote storage directly; saveNestedMenu serialized hierarchy writes; mode controls persisted. Modern also existed, giving competing editors. |
| 16dad07d248d6f9be52392fdc9b4a067350dadbf | Authority repair isolated Legacy menu writes and strengthened guarded Modern save. |
| 2018b6bd269fd79d4a9f14cdba6da1ac13d07df2 | Related handoff baseline after authority repair, not current source. |
| 45e1c7178d4732a7c9cbb6be4cbe575a3252ab19 | Shared immediate-parent/deep Send here plan and structured editor presentation. |
| 947b0cc9dcb4834848244660d5528bdc80fa7dd7 / 0c39d305777cd2daf7c854aa62b09405d0de781e | Selective compact HTML/CSS restoration from515c272; not wholesale runtime rollback. |
| 5913a5c / 9272fe2 / b981b68 / 5c2c959 | Later Simple/Nested visible red ×, spacing and regression coverage, preserved at current pin. |

All landmarks were resolved in local history before workspace loss. Historical reconstruction command: git show 515c272:extension/options.js; inspect functions below without executing/restoring them.

## Functionality and authority classification

| Mechanism | Historical functionality / fields | Current source status |
|---|---|---|
| options.js saveProfiles:51 | Whole-profile autosave, debounce180ms via scheduleSave | **ACTIVE AND NECESSARY** private preference adapter: sends saveStoragePreferences, no direct destination persistence. |
| saveNestedMenu:58 | Nested autosave preserving credentials/profile additions | **OBSOLETE/INERT** writer: throws instruction to use Explorer. No current Legacy Nested mount. |
| renderRightClickMode:418 / chooseRightClickMode | Two mode controls persisted rightClickMode | **OBSOLETE/INERT** mode writer: disables old controls and explains delegation. |
| renderProfiles:705 | Profile/menu editor cards, defaultPrefix, simpleOptions, menuTree, menuOrder, Nested editor | **ACTIVE AND NECESSARY** current storage/domain/GitHub preference renderer + Explorer link; does not mount old menu constructors. |
| simpleFolderPathEditor / simplePrimaryLocationField / simpleExtraOptions | Per-parent segment dropdown, separate Create input, + Child, row ×, label, bucket, option order | **OBSOLETE/INERT** as current menu UI; definitions retained but not called by current renderProfiles. |
| renderTree / renderTreeNode | menuTree categories/prefixes, tree selection/materialization | Renderer **OBSOLETE/INERT**; some prefix-read helpers **COMPATIBILITY ONLY** or storage utility. No current tree native generator. |
| nested-locations / nested-menu-editor imports | Shared hierarchy/selection/create machinery | **ACTIVE AND NECESSARY** in Modern; import alone does not give Legacy authority. |
| menu-reorder.js | Keyboard/pointer sibling order/rollback | Private utility retained, but Modern does not load script; explicit up/down replaces grips. Missing-grip fixture fails. |
| options storage listener | Profiles/auth/mode/history refresh, caches | **ACTIVE AND NECESSARY** reader, not menu-definition writer. |
| menuTree/fromLegacy/initialize | Old prefixes split into real folder-segment ancestry | **COMPATIBILITY ONLY** versioned draft conversion; original fields retained. |
| tree: IDs | Historical native target routes | **OBSOLETE/INERT** target authority; cosmetic prefix recognition remains but resolve returns null. |

## Private reuse and prohibited restoration

Retain shared auth/API access, prepared Worker/profile adapters, exact-prefix discovery, bounded lazy folder picker, versioned conversion and current merge safeguards. Historical selection-versus-creation ownership is a useful interaction principle. It is not permission to transplant all Legacy CSS/logic.

Never restore whole-profile menu autosave, old native tree generation or duplicate mode writers. Legacy menu read-only does not mean the entire settings page is read-only: domain setup, provisioning, storage and Beta GitHub preferences still have effects.

Historical Simple rows clear a selected segment and retain blank descendant selectors; Modern removes a card or selects an entire prefix. Historical Nested native builder flattened descendants beyond shallow levels to first-folder ancestors with concatenated labels; current plan preserves immediate parents. Source/history and [DBG-001](../../docs/debug/DBG-001_NESTED_CHILD_DEPTH_DISABLED_STATE.md), [DBG-002](../../docs/debug/DBG-002_SIMPLE_LOCATION_ROWS.md) remain distinct from live closure.
