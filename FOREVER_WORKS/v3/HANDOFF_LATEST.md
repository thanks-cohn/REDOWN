# V3 tree editor handoff, 30 October 2026

**Implemented bounded conventional-editor increment; full acceptance remains incomplete.** Branch `codex/v3-parity-first-reconstruction`. Start `0e33d7ef9a477652a2fd25e2bd831e00d8dc4e03`. Protected checkpoint `right-click-v3-before-tree-ui` remains `7f127abe9fcc2fa275e645cfc53c1c3a658a616d`. No release branch, engine, provider or transfer changes.

The setup now uses selected account/bucket/folder rows, chevrons, inclusion checkboxes, contextual +, confirmed inline naming, F2, red Delete, Move Up/Down, Undo, folder browsing and search. Saves run automatically through existing revision-guarded background transactions. Acknowledged configuration persistence and Chrome registration failure are distinguished; unknown outcomes block automatic replay. Confirmed edits are retained in session recovery until acknowledged. Legacy/V3 remain independently selectable in Settings and both use this V3 editor.

See [implementation, source inventory, references and limitations](TREE_EDITOR_IMPLEMENTATION.md). Exact local evidence is in `tree-editor-evidence/`; earlier foundation evidence remains unchanged in `evidence/`.

## Verification and classifications

- Required onboarding diagnostics and Forever describe completed; no release certificate.
- Locked dependency install passed, no dependency changes.
- Focused V3 + URL + consent + Legacy ordering tests: **44 passed, 0 failed**, including **20 V3 tests**. Actual background functions are exercised with mock Chrome callbacks, persistence and restart fixtures. This proves local contracts, not installed Chrome registration or native rendering.
- Syntax check passed. No Explorer, URL, History, background, Settings or transfer production source modified.
- First full run: **584 pass, 69 failures, incomplete**. All 69 failed names already occur in the preceding archived V3 final report. Original historical baseline expectations still make reliability red. Architecture freshness is red; registry, issues and syntax pass. Final full run: **587 pass, 69 failures, incomplete**. A subsequent rename-validation guard was verified by all 20 focused V3 tests; the full report predates that small guard.
- `regression-classification.json` marks historical evidence failures, obsolete setup-specific candidates and unrelated existing defects provisionally. Individual investigation and migration of the wider retired-editor suites remain unfinished. Two directly affected editor cases were migrated without restoring retired UI. No frozen hashes, assertion disabling or baseline expectations changed.
- Genuine new V3 regression: none observed in focused checks. This is not a claim that untested behavior works.
- **Untested live behavior:** installed Chrome, MV3 interruption, exact supported webpage resource → authorized Cloudflare target/read-back → History → Explorer acceptance, and real multi-window/native interactions.
- **Visual/accessibility limitation:** no Chromium binary exists here; Playwright browser download returned invalid ZIP archives. No new screenshots, rendered overflow checks or screen-reader results are claimed. DOM keyboard/focus tests pass. New `tree-editor-evidence/visual-fixture.mjs` is ready for desktop/narrow rendering in a browser-enabled environment. Earlier screenshots show the preceding editor.

## Remaining work

Complete visual review and live acceptance before calling this P0 finished. Review the compact More disclosures and contextual add form with keyboard/touch/screen reader. Add comprehensive empty-state, pagination, deep nesting and reload recovery acceptance. Picker filtering is page-local, tree folder discovery is explicitly requested, and automatic conflict merging is not implemented. Retained local edits require deliberate reload/reconciliation after unknown outcomes. Audit and migrate the remaining obsolete tests individually; do not weaken unrelated domain assertions or resurrect retired setup code.

The separate future Simple/Nested proposal is in the implementation document. No second editor or model was introduced.
