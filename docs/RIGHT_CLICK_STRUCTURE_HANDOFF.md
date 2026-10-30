# Right-click structure repair: audit and handoff

30 October 2026. Source and local simulation evidence only. Installed Chrome and live Cloudflare acceptance remain open.

## Page 1: audit and implementation

### A. Starting state

Canonical repository: `thanks-cohn/REDOWN`. Required branch: `release/cloudflare-true-remote`. Starting local and remote head: `2018b6bd269fd79d4a9f14cdba6da1ac13d07df2`; working tree clean. Verified `515c272`, `16dad07` and `2018b6bd` in its history. Reused the existing isolated checkout; no worktree, reset or unrelated-file edits. The mandatory diagnostic entrypoints were run before implementation. Release readiness already reported blocked; the historical source maps are stale.

### B. Confirmed findings

The latest authority repair already prevents the old settings editor from saving destination definitions. No installed-browser evidence establishes that legacy configuration is currently overriding it. Its versioned migration, backup, sender checks, serialized saves and optimistic signature checks were preserved.

A separate native hierarchy defect was confirmed directly: `addNestedLocations` attached descendants beyond the second folder to their first folder ancestor, concatenated their path into the label, and provided parent saving only at shallow levels. An existing test explicitly required that flattening. That assertion was replaced with immediate-parent and concise-label assertions; exact storage-prefix assertions remain.

Visual disorder came from repeated label/reorder controls, repeated creation fields, hidden headings, generic wrapping and a wide-viewport rule splitting root controls from their children even when the Explorer panel was narrow. The useful legacy principle is explicit ownership of selection, creation and actions, rather than importing its old destination writers or styles.

### C. Architecture and authority classification

| Mechanism | Classification and disposition |
|---|---|
| Explorer `destinations.js`, `saveDestinationConfig` | Active and necessary: sole destination-definition editor/save path. Saves validate menu-only patches against current profiles. |
| Profiles and prepared account/bucket credentials | Active and necessary: existing destination store and authorization; no second database. |
| `simpleOptions`, `nestedMenu`, `rightClickMode` | Active and necessary: retained inactive definitions; one selected layout. The existing native mode control and immediate Explorer mode switching are preserved. |
| `menuTree`, migration and backup | Compatibility only: old definitions can seed a versioned draft, never independently generate current destinations. Empty modern models win. |
| Legacy settings handlers and inert compatibility IDs | Compatibility only: visible menu controls replaced with the Explorer navigation entry; storage/domain/GitHub preferences remain. Sender-restricted `saveStoragePreferences` cannot write destination fields. |
| Deep-menu flattening branch | Conflicting with the requested hierarchy: replaced by the shared parent-first plan. |
| Old `tree:` destination IDs | Obsolete authority: rejected by existing routing; not generated. |
| Profile provisioning/synchronization | Necessary infrastructure: existing merge protections retained; tests protect against delayed writers resurrecting deleted definitions. |

Flow: editor interaction → existing profile-backed draft → validated optimistic save → authoritative storage → `RedownNestedLocations.menuEntries` → awaited Chrome creation → `RedownDestinationConfig.resolve` → existing `ingestCloudflareAtPrefix` transfer path. Preview calls the same `menuEntries` function. Parent branches receive an explicit Send here child at every depth. A removed Send here action is now rejected when its parent no longer has children. Renaming changes display labels, not bucket/prefix identity. Sibling reordering leaves destination paths intact. Removing a branch removes its menu descendants, never R2 storage.

### D. Presentation and Any Shape rules

Four regions identify configuration, prepared accounts/buckets, hierarchy, and preview/commit. Account IDs disambiguate duplicate display names. Nested group inclusion/removal stays with its clearly identified group. Native details/summary disclosures contain secondary entry and group operations; creation uses a named action and an explicit submission. Root creation is unavailable in the modern Nested editor. Add child adds a menu row; Create folder makes a real folder and verifies discovery before selecting it.

The setup panel is an inline-size query container. Above 480px its related regions use explicit grid columns; at 480px or less they stack in semantic order. This threshold concerns actual panel width, including Shelf constraints, not the viewport. Tree indentation is bounded after two ancestor guides, while the DOM and native model retain all ancestry. Preview indentation is also bounded. Existing surface, line, text, accent and danger tokens own the styling. No resize event mutates configuration.

| Invariants | Rule and evidence boundary |
|---|---|
| A, E, I | Actions have named owners; secondary actions use disclosures; removal and creation have different labels and handlers. DOM interaction tests cover access and cancellation. |
| B, H | For each depth d > 0, parent(d) = d − 1. One parent-first plan supplies preview and native destination entries. Eight-level tests cover parent IDs, labels, Send here and exact prefixes. |
| C, D | CSS changes presentation only; controls remain in the DOM. Container and bounded-indent rules are source-verified. Rendered widths and assistive technology still need acceptance. |
| F, G, J | Theme tokens, stable saved order and one container transition define deterministic arrangements. No viewport split or unbounded indentation remains. Per-theme appearance and aesthetic quality are not mathematically proved or browser-certified. |

### E. Every modified file

- `extension/nested-locations.js`: shared Simple/Nested plan, correct immediate parents, concise labels and parent Send here entries.
- `extension/background.js`: consumes the shared plan; preserves Chrome callback/error handling and existing transfers.
- `extension/destination-config.js`: rejects stale parent Send here IDs after their last child is removed.
- `extension/nested-menu-editor.js`: named contextual disclosures, explicit creation/removal, stable account identity and group ordering controls.
- `extension/beta/destinations.js`: shared-plan preview, account IDs, Simple entry disclosures and explicit folder actions.
- `extension/beta/explorer.html`: four semantic regions, preview, save/reload feedback.
- `extension/beta/explorer.css`: coherent grid/container rules, bounded ancestry, token-based controls; removes competing viewport split rules.
- `extension/options.html`: visible legacy menu controls become navigation to the authoritative Explorer; inert IDs preserve script compatibility.
- `tests/modern-destinations.test.mjs`: correct-depth assertions, relocated removal selectors, eight-level plan/routing, preview parity, disclosure access and stale Send here coverage.
- `tests/simple-menu-flat.test.mjs`, `tests/menu-reorder.test.mjs`: existing native-builder harnesses load the actual shared model instead of a partial menuMode-only stub; behavior assertions remain.
- `docs/RIGHT_CLICK_STRUCTURE_HANDOFF.md`: this audit, rules, delivery and remaining acceptance work.
- `docs/verification/right-click-structure/baseline.json`, `local.json`: starting failure inventory and final local verification summary; no frozen historical hashes rewritten.

## Page 2: verification and delivery

### F. Automated results

Final complete run: **677 tests, 636 passing, 41 failing, zero skipped; no additional failing test names compared with the starting commit**. Focused menu run: **61 tests, 60 passing, one pre-existing missing drag-handle failure**. The modern destination subset passes **34/34**. Syntax, API registry and issue inventory stages pass; architecture freshness fails. Exact results and matching final-source fingerprint are recorded in `docs/verification/right-click-structure/local.json`. The starting-commit archive reproduced **673 tests: 632 passing, 41 failing**. This is a fresh comparison, not the older seven-failure registry baseline. Focused modern destination tests cover saves, reload, empty configurations, account changes, stale windows, mode switching, migration, delayed storage writers, native creation failures, deep ancestry and routing. All such tests use mocked Chrome/provider responses or DOM simulation.

The complete reliability command was run. Existing source-map freshness and full-regression failures remain visible. No assertion or historical source hash was weakened to make the project appear release-ready.

### G. Visual verification

No browser executable was available: Playwright is installed, but its configured Chromium executable is absent, and no Chrome, Chromium or Firefox binary was found. No rendered screenshots, tested pixel widths, tested theme appearance or installed-extension parity result is claimed. The 480px panel transition and existing theme-token use were inspected in source; DOM tests exercise named controls, lazy expansion, creation/cancellation and preview structure. These are not visual acceptance.

### H. Preservation

No authentication, provisioning, public-access, upload, file-operation, archive, preview, Shelf, history, URL, gallery or conflict-policy engine was modified. Menu storage continues to use existing profiles and stable IDs. Tests exercise preservation of inactive modes, original legacy backups, credentials, exact account/bucket/prefix routing, intentional emptiness and deletion safety. The broader failing baseline means unrelated functionality is not certified healthy.

### I. Incomplete acceptance

Required follow-up in an approved extension runtime: perform the complete editor-to-native matrix, restart/reconnect checks, two-window saves, interrupted rebuilds and exact-destination transfer with a verified receipt. Test actual panels at 320/480/640/960px, all themes, eight folder levels, long labels, duplicate account names, keyboard traversal, and Shelf opening/closing. No live transfer or remote storage mutation was attempted here.

Chrome's official contextMenus reference documents parentId, callback/runtime.lastError handling and a six-item **extension action** top-level limit. That is not a general six-destination page-menu limit. REDOWN's 500 active locations/eight folder levels are application validation limits, not claims about Chrome's maximum supported hierarchy. Native rendering and platform constraints still require real-browser testing. Reference: https://developer.chrome.com/docs/extensions/reference/api/contextMenus

### J. Git delivery

Starting commit: `2018b6bd269fd79d4a9f14cdba6da1ac13d07df2`. Branch: `release/cloudflare-true-remote`. The implementation commit and push result are reported in the final delivery message; a commit cannot embed its own hash. This handoff is not a release certificate.
