# V3 Simple / Nested menu presentation handoff

30 October 2026, America/Chicago. **Implemented and locally tested; installed Chrome, visual/accessibility and live Cloudflare acceptance remain open.** Branch `codex/v3-parity-first-reconstruction`.

Implementation commit: **`906c0493af021d2c1387840b0cdf57d95ab19b23`**. Source start: `a1bd4d1d99d7a9bc38a5dfb3db8fc10082d237c4`. Protected `BASE-v3` remains annotated object `322358123d78cebad75ee4503f30c33cfa34459c`, peeled `209a52cd1515d44f0dab005e26b738e678c29b65`. No protected tag or release branch changes. The connected GitHub app publishes a commit with the identical verified source tree (`e5bb84f563333d017a9620265d4946ca6dbe7b55`) because command-line push credentials were unavailable. The original local implementation commit is `c0a328ae4025ee32f4100578eb16f53a3a2c18e8`. The following documentation-only delivery commit contains this handoff and evidence; its exact SHA is reported in the delivery response and can be read from branch history.

See [implementation, changed-file inventory, semantics, architecture and evidence limits](MENU_PRESENTATION_IMPLEMENTATION.md). Previous tree/focus work remains described in [TREE_EDITOR_IMPLEMENTATION.md](TREE_EDITOR_IMPLEMENTATION.md), with its historical evidence unchanged.

## Delivered behavior

- One existing V3 destination editor. Compact Simple/Nested header controls reveal Narrow/Level, then Depth 1–10. Fixed control slots, a bounded status area, restrained 200ms motion and reduced-motion support. Native fieldsets/radios/number input. Rapid edits queue while preserving focus; presentation updates do not redraw the tree.
- Simple defaults to flat configured eligible shortcuts, custom labels and saved ordering. Nested/Narrow uses saved hierarchy and identities, with `Save here` on parent targets. Duplicate labels never merge.
- Nested/Level uses actual bucket/folder names and exact prefixes. Roots are enabled top-level V3 destinations in prepared matching profiles; unrelated active buckets are not included. Overlapping authorized roots collapse. Root is depth zero; selected depth counts discovered directory levels beneath it. Subfolder roots retain a non-writable true bucket heading.
- Preferences persist independently of destinations and Legacy mode; Simple retains the prior nested choice/depth. Preference transactions are sender-gated and stale-window guarded. No migration, destination reset, virtual hierarchy or new editor.
- Level inventory is read-only, persisted, timestamped and single-flight: 5-minute TTL, 500 nodes, 80 pages, 20-second traversal budget, at most 8 seconds per page, depth 1–10, 300 V3 native entries. Existing utility/status entries are additional. Limits or failures produce explicit partial status in Setup and a disabled native-menu explanation. Exact-prefix restrictions remain those of the existing save contract.
- Existing paged listing and serialized native registration are reused. Startup/configuration changes and a Level-only five-minute alarm refresh stale inventory; Reload explicitly refreshes. Profile changes invalidate inventory before rebuilding. Late observations are discarded when authority changes. No native-menu-open network discovery. One existing read may settle after a timeout because the reused listing API has no cancellation parameter; traversal stops instead of issuing more reads.
- Click resolution rechecks current mode, selectable projected ID, current authorization and cache TTL, then returns the existing profile/owner/exact-prefix contract. The existing save engine, byte read-back and History listener remain unchanged. Stale/unselectable actions fail closed.

## Verification

Evidence directory: `menu-presentation-evidence/`.

- **59 focused tests pass, zero failures**, including **38 V3 tests**, existing editor focus/form/plus/rename/checkbox cases, Legacy flat menu and ordering tests, and public-address tests. See `focused-final.log`.
- Broader focused run including Get URL: **73 pass, one failure** in the existing `switching files while enabling cannot reopen the old file or overwrite current choices` test. It is also in the prior full failure set. The subsequent two added inventory-maintenance tests pass in the final 59-test focused run. No URL code was changed.
- Final required `npm run reliability:check`: **605 pass, 69 failed names, incomplete**. Syntax, API registry and issue inventory stages pass. Architecture freshness fails. All 69 failed names also occur in the archived prior V3 report; **zero additional failed names** in that comparison. This is an archived-report comparison, not a fresh pristine-baseline rerun, and not a green release certificate. The runner still has an unseen obsolete Nested drag-handle baseline expectation.
- `final-reliability.json` retains exact stages/failures and source hashes. All recorded source hashes match the implementation commit's tested files (`regression-comparison.json`: no mismatches). The code was tested before its commit; the report therefore records the starting HEAD plus dirty-source hashes, not a fabricated post-commit test run.
- `preservation.json`: 13 unchanged regions/files, including full tree renderer, original editor CSS/DOM, click/save/History listener, exact ingest and existing folder listing, Legacy engine, URL and Explorer sources. `BASE-v3` remote tag object checked unchanged.
- Installed-Chrome probe: **blocked, `CHROME_NOT_AVAILABLE_ENOENT`, zero assertions**. No browser screenshots, rendered width/animation checks, actual native menu proof or screen-reader proof. JSDOM proves interaction/state only. Native keyboard defaults and visual polish require real-browser acceptance.
- **No live Cloudflare verification performed.** Synthetic folder pages/provider failures and mocked Chrome callbacks are explicitly distinct from real accounts, native submenu behavior, remote-save read-back and MV3 interruption.
- Required onboarding diagnostics/Forever describe and dependency installation completed. No dependencies changed. Frozen hashes, historical assertions and release gates were not weakened.

## Remaining acceptance

Install in an approved Chrome environment and verify native parent/child menus, parent saving, all mode transitions, restart/interruption and saved identity routing. Visually check desktop/narrow widths, stable editor position, focus, radio keyboard operation, number-input errors, reduced motion and screen-reader output. Use explicitly authorized disposable R2 roots for sibling/depth/pagination/cache refresh and end-to-end source → exact target → read-back → History → Explorer verification. Review the disclosed scoped-root placement for multi-segment roots and the 300-entry product bound on representative large buckets.

Existing unrelated test/architecture debt remains open. Full browser/live P0 acceptance is not claimed by these local passes. No separate user permission is required for these authorized implementation changes; future real-provider mutation/testing must respect the selected account/root and existing consent boundaries.
