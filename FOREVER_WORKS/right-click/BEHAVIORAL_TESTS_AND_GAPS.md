# Tests, evidence and remaining gaps

[Route](README.md). Local Linux/Node24.19.0,30 October2026, source e621ef2dcf11cad3042e5b268a83470df606b85d. Production files remained unchanged. **Raw logs/screenshots were written locally but became inaccessible when the workspace failed.** This delivery preserves observed command results, not replacement fabricated logs. See [session observations](VERIFICATION_SESSION.json).

## Commands and actual results

| Command | Exit | Provenance/status/result |
|---|---|---|
| npm ci --cache /workspace/.npm-cache --no-audit --no-fund |0|PASS dependencies installed; no tracked lock/package changes |
| Focused tests, initial attempt |1|BLOCKED missing jsdom for six suites; other tests executed |
| Focused tests after install |1|LOCAL_TEST_FAIL,88 total/85 pass/3 fail/0 skipped |
| npm test |1|LOCAL_TEST_FAIL,686 total/634 pass/52 fail/0 skipped/0 cancelled |
| npm run reliability:check |1|FAIL; syntax/API registry/issues pass, architecture freshness/regression fail; release blocked;634/52 |
| npm run diagnostics -- getStartGuide |0|PASS offline query only |
| npm run diagnostics -- validateRegistry |0|PASS, no findings |
| npm run diagnostics -- listIssues |0|PASS query; recorded/needs-revalidation issues retained |
| npm run diagnostics -- getReleaseReadiness |0|PARTIAL result with blockers; exit0 is not readiness |
| node FOREVER_WORKS/tools/query.mjs describe |0|PASS discovery actual model/API0.1 |
| node FOREVER_WORKS/tools/query.mjs validateModel |0|PASS structural reference model |
| python3 FOREVER_WORKS/tools/validate.py |1|FAIL combined source freshness;253 records,222 source-drift occurrences, no other errors |
| node FOREVER_WORKS/tools/check-preservation.mjs |0|PASS documentation evaluator negative/unknown/reference fixtures |
| Standalone Chromium captures |0|Bounded layout observations at6 Modern/3 historical cases; no installed extension/provider proof; delivery PARTIAL due inaccessible assets |

Focused command: node --test tests/modern-destinations.test.mjs tests/nested-locations.test.mjs tests/simple-menu-flat.test.mjs tests/menu-reorder.test.mjs tests/popup-destinations.test.mjs tests/explorer-destination-menu.test.mjs tests/destination-search-regression.test.mjs

Historical tests/simple-location-rows.test.mjs is absent in this source revision. Do not pretend it ran. Earlier structure handoff reported677/636/41; this source has686/634/52. Those are different revisions/scopes: no same-failures or causal-regression attribution is made. Current failure names/results were observed before any production change; this audit made none.

## Focused failures, preserved

1. modern-destinations:308, “right-click editor uses product-facing status and keeps dedicated bucket setup optional”: expects Right-click layout updated after switch, actual Unsaved changes · Save menu to apply them. Readiness/mount callbacks can supersede status; exact cause/product resolution remains scoped follow-up. Earlier optional-closed assertions passed.
2. nested-locations:218, “Nested drag-handle keyboard move saves sibling order with descendants and paths intact”: missing .reorder-handle yields null dispatchEvent. Current source removed grips; explicit up/down has separate passing coverage. Historical expectation retained, not weakened.
3. popup-destinations:14, “green zero-delivery state reads READY! and Dashboard opens the existing options page”: expected1 options-page open, observed0. Launcher/Shelf design requires separate requirements disposition; not evidence resolver failed.

## Passing behavior evidence

Individual88 test names and source lines are indexed. Results are session-observed; raw output unavailable. These are local VM/jsdom/synthetic responses, not complete-feature or live certification.

| Obligation | Representative exact test |
|---|---|
| Simple flat output | Simple menu places default and extra destinations immediately under REDOWN, never inside a preset submenu |
| Legacy preference isolation | Legacy bucket-label preference cannot override modern path-derived labels or explicit names |
| Exact routing | production click listener resolves exact active account, bucket and prefix and rejects stale IDs |
| Deep parents | eight-level shared plan preserves immediate parents, parent save actions and preview parity |
| Immediate removal | Simple and Nested cards expose immediate red X without tooltips or cloud deletion |
| Group/zero/Undo | Nested full-group removal, Undo, final-root removal and save/reload preserve storage and intentional emptiness |
| Simple zero | deleting all Simple rows remains empty with legacy data through rebuild and readdition |
| Conflict/storage | stale concurrent saves reject rather than overwrite newer changes; storage failures leave old config intact |
| Chrome callbacks | native Chrome callback errors preserve saved configuration and successful retry rebuilds it |
| Serialization | native creations await parent callbacks and later rebuild wins over an older snapshot |
| Migration | versioned migration is repeat-safe and its menu-only backup preserves original definitions |
| Delayed writer | delayed Worker/domain persistence cannot resurrect a deleted menu or discard other profiles |
| Dirty mode | mode switch persists without committing a dirty destination label; external mode-only changes preserve and rebase draft |
| Select/create | existing folder picker routes exact prefix without creating folders or provisioning |
| Folder creation | Simple inline plus creates and verifies exact parent, saves stable routing and Escape cancels |
| Nested creation | Nested plus exposes focused inline creation and keeps siblings while saving the verified child |
| Picker keyboard | keyboard arrows navigate menus and Escape returns to parent without changing Explorer |
| Late reply | folder pages append via More folders and closed menus ignore late replies |

## Incidents and history

[DBG-001](../../docs/debug/DBG-001_NESTED_CHILD_DEPTH_DISABLED_STATE.md) documents stale disabled-state/depth cause historically. Current reconcile/depth fixtures pass locally; installed deep select/create/native transfer still open. [DBG-002](../../docs/debug/DBG-002_SIMPLE_LOCATION_ROWS.md) records segment-clear/draft/focus contract; Modern UI differs and old suite absent. [Bug inventory](../../bugs/README.md) retains missing destination/duplicated labels reports. Passing current model tests does not close live omissions.

Historical deep flattening is source-confirmed and superseded by current immediate-parent tests; installed Chrome depth/platform constraints remain unknown. Copy404 belongs to separate Explorer file-grid path and remains open. No historical snapshots/journals/hashes were rewritten.

## Gates

| Gate | Status | Minimum remaining evidence |
|---|---|---|
| Current source/authority/history map |PARTIAL|Core inspected; complete transitive dynamic caller graph not claimed |
| Current/historical standalone widths |PARTIAL|Measurements observed, raw PNG/JSON recovery pending |
| Full Shelf/themes/reduced motion/screen reader/touch |NOT_TESTED|Approved runtime, computed contrast/motion/focus and actual panel widths |
| Installed Chrome native output/click/error |NOT_TESTED|Saved model→plan→registered/rendered menu, every target/built-in |
| Restart/two windows/interrupted rebuild |NOT_TESTED|Dirty draft/native switch/kill-restart/retry at exact revision |
| Real Cloudflare create/provision/ingest/bytes |NOT_TESTED|Separately authorized disposable resources and exact target/read-back |
| Gallery/Hitomi full session security |PARTIAL|Core branch traced, full buffering/auth/suspension acceptance incomplete |
| Accepted Forever intent |NOT_TESTED|Owner review; no new canonical records promoted |
| Release/full reliability |FAIL/BLOCKED|Disposition52 current failures/stale maps in separate implementation work |
| Independent cold-agent reconstruction drill |NOT_TESTED|Recipe provided, no fresh-agent reconstruction executed |

Next first action: recover local work and logs from /workspace/REDOWN/FOREVER_WORKS/right-click and work/right-click if environment returns. Preserve both versions; reconcile carefully against the remote audit. Do not overwrite richer local files with shorter recovery chapters blindly.

## Phase 2 addendum — 30 October 2026

Recovery succeeded. Historical logs/assets are now preserved under evidence/phase-1-recovered; fresh source2e65ba1 results again85/88 focused and634/686 full, same52 names. See [fresh coverage/results](FULL_EVIDENCE_COVERAGE_LEDGER.md). Original report is preserved as historical, not retroactively rewritten.
