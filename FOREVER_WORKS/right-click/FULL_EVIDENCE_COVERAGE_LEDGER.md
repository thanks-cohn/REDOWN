# Phase 2 evidence and coverage ledger

[Route](README.md) · [machine index](PHASE_2_SOURCE_INDEX.json) · [main differential](FORENSIC_LEGACY_VS_MODERN_ROOT_CAUSE.md)

Source **2e65ba137a35e1656b691fd2fdbf95082a0cdf4e**, branch release/cloudflare-true-remote, Linux Node24.19.0, Chromium154.0.8037.57. Test and fixture evidence is local/mock unless explicitly stated; **no INSTALLED_CHROME or LIVE_PROVIDER pass exists**. No100% or exhaustive dynamic closure claim.

## Provenance vocabulary

OWNER_REPORT/OWNER_INTENT: owner's experienced reliability/design/default-name statements and future requirements. SOURCE_INSPECTED: current code or environment policy. HISTORICAL_SOURCE: pinned515c272 code, not current behavior. LOCAL_TEST: VM/jsdom/HTML fixture and named assertions. INSTALLED_CHROME: none (policy blocks arbitrary installation). LIVE_PROVIDER: none (not authorized). INFERENCE/UNKNOWN: mechanism-to-owner causal attribution without matching runtime evidence. PASS/FAIL/PARTIAL/BLOCKED/NOT_TESTED are separate status labels.

The seven original references in Phase1 VERIFICATION_SESSION were recovered. Historical timestamps/results stay historical; fresh runs are pinned here. Raw evidence plus SHA256 in phase-two index provides independent recoverability; index is non-normative, no Forever schema/authority promotion.

## Explicit scope counts

| Scope | Located/inspected | Execution/unknown boundary |
|---|---|---|
| Enumerated source paths | 26, all exact paths/line counts/SHA256 in index | No claim every line was dynamically exercised; omitted transitive/library/site sources uninspected in depth |
| Named functions | 447 lexical declarations | Worker-string and extension realms differ; anonymous callbacks/dynamic edges not a full AST call graph |
| Event/storage/API sites | 243 lexical anchors | Includes unrelated event sites; not243 menu writers |
| Background literal message branches | 47 | Regex-dispatched gallery messages and dynamically supplied types separately inspected;47 is not total possible messages |
| Existing focused cases |88 enumerated,85 PASS/3 FAIL | VM/jsdom/synthetic provider; no native/live certification |
| New bounded differential observations |11, D1 modern+historical plus D2–D10; exit0 | Actual extracted source assertions, not11 installed-extension tests |
| Required workflow rows |17 A–Q, each source/evidence/counterexample/gap/proposal | Not every A–Q action executed historically/current in a real browser; rowsL/O/M have important runtime gaps |
| Fresh full reliability regression |686 cases/634 PASS/52 FAIL/0skip | Same52 names as recovered Phase1; source and tests unchanged |
| Fresh standalone layouts |9 PNG cases,6 Modern/3 historical | Real CSS/renderer, mocked Chrome/provider, wrapper modifies outer document; no native Chrome menu |
| Recovered prior evidence |24 files in evidence/phase-1-recovered | Preserved bytes; old e621ef2 source pin, not fresh tests |
| Canonical model records |253 validated structurally | Combined freshness fails222 source-drift occurrences; no hashes regenerated |
| Installed Chrome/native parity |0 | BLOCKED/NOT_TESTED; managed blocklist wildcard, no bypass |
| Provider writes/accounts |0 | LIVE_PROVIDER NOT_TESTED; no cloud mutation/login |

Source paths are enumerated in PHASE_2_SOURCE_INDEX; all initial Phase1 chapters were read and retained, with append-only Phase2 navigation/corrections. Original canonical records and SOURCE_INDEX remain unchanged. Additional required reports/bug material are historical leads; no historical status is silently upgraded.

## Commands / expected / observed / exit / raw output

| Command | Expected evidence, not assumed product health | Observed / exit | Recoverable raw |
|---|---|---|---|
| node --test tests/modern-destinations.test.mjs tests/nested-locations.test.mjs tests/simple-menu-flat.test.mjs tests/menu-reorder.test.mjs tests/popup-destinations.test.mjs tests/explorer-destination-menu.test.mjs tests/destination-search-regression.test.mjs | Execute focused named assertions |88/85/3, exit1 | [focused.log](evidence/phase-2/focused.log) |
| node work/phase2/forensic.mjs | Isolated actual-source differential assertions |11 observations, all assertions complete, exit0; no stderr | [differential.json](evidence/phase-2/differential.json), [stderr](evidence/phase-2/differential.stderr), [source reconstruction](evidence/phase-2/REPRODUCTION.md) |
| npm run reliability:check | Syntax/architecture/registry/issues/full regression |FAIL/release blocked, exit1; syntax/registry/issues pass, architecture/regression fail;634/52 | [log](evidence/phase-2/reliability.log), [structured report](evidence/phase-2/reliability.json) |
| npm run diagnostics -- getStartGuide | Offline entry route |available, exit0 | [guide](evidence/phase-2/start-guide.log) |
| npm run diagnostics -- validateRegistry | Registry findings |none, exit0 | [registry](evidence/phase-2/registry.log) |
| npm run diagnostics -- listIssues | Existing reports not incident closure |records returned, exit0 | [issues](evidence/phase-2/issues.log) |
| npm run diagnostics -- getReleaseReadiness | Existing readiness availability |partial/blocked underlying gates, exit0 | [readiness](evidence/phase-2/readiness.log) |
| node FOREVER_WORKS/tools/query.mjs describe | Actual pinned API discovery |API/model0.1, exit0 | [describe](evidence/phase-2/forever-describe.json) |
| node FOREVER_WORKS/tools/query.mjs validateModel | Structural upstream model validity |valid:true, exit0 | [model](evidence/phase-2/forever-model.json) |
| node FOREVER_WORKS/tools/check-preservation.mjs | Negative/unknown/reference fixtures |valid:true, exit0 | [preservation](evidence/phase-2/preservation.json) |
| python3 FOREVER_WORKS/tools/validate.py | Published schema/domain/upstream/source checks |exit1;253 records,222 source-drift occurrences; source freshness not hidden | [validator](evidence/phase-2/forever-validation.log) |
| node work/phase2/capture.mjs; node work/phase2/capture-legacy.mjs | Bounded CSS geometry/PNG capture |exit0; no document overflow in tested wrappers | [current measurements](evidence/phase-2/layout-measurements.json), [historical](evidence/phase-2/legacy-layout-measurements.json) |
| Official primary document GETs | Read references without provider actions |Chrome/Drive/Graph/Dropbox URLs200, R2 reference403; Dropbox first guide delivered landing content | [fetches](evidence/phase-2/official-fetches.json), [excerpts/hashes](evidence/phase-2/official-excerpts.json) |

Full52-name comparison is independently recorded [here](evidence/phase-2/baseline-comparison.json); fresh run has zero newly failing or disappearing names relative to recovered e621ef2 log. Previous claim “raw unavailable” is now historical: files recovered and preserved, not retroactively recreated. npm ci was not needed this phase; dependencies recovered. Phase1 missing-jsdom failure remains in recovery corpus.

## Three focused failures explicitly re-investigated

1. **Mode success/status overwritten:** modern-destinations:308 expects Right-click layout updated, gets Unsaved changes. D5 confirms stored mode nested; source mount/initialize/readiness→context.save→changed explains overwrite. This is status/draft ambiguity, not proof mode/native registration failed.
2. **Removed Nested grip:** nested-locations:218 dispatches keyboard event on null .reorder-handle; Modern doesn't load optional reorder script. Up/down alternatives pass their independent fixtures. Old assertion preserved, not patched away.
3. **Popup Dashboard expectation:** popup-destinations:14 expects one options-page open, observes0; current Shelf/launcher flow differs from old expectation. That failing requirement/test does not diagnose missing native menu entries; needs separate owner launcher review.

## Gaps, confidence and stop conditions

- Owner-specific first failure: UNKNOWN without permitted same-revision draft/saved/registered/rendered trace. Local mechanisms are confirmed; owner attribution is not.
- Current ordinary valid R2 model and exact ID routes have passing local counterexamples; neither total runtime failure nor total health follows.
- Full native context/platform hierarchy, service-worker termination, multiple installed windows, cancellation/provisioning races, original browser-authenticated source bytes and real provider receipts remain NOT_TESTED.
- Complete gallery/session threat model and every provisioning/Explorer transitive branch remain PARTIAL. Core source, size/session/queue/receipt boundaries documented; no security certification.
- Dropbox endpoint upload/session limits remain UNVERIFIED from fetched landing content. No future provider feature promoted to current implementation.
- Independent cold-agent drill NOT_TESTED; recipe is provided. User-report aesthetic success requires owner review, not a passing geometry fixture.

Next evidence should discriminate competing hypotheses using the read-only decision tree, not rewrite storage/CSS or provision infrastructure. Any later fix requires separate implementation authorization and scoped regression/installed acceptance.

Reference recovery: direct R2 documentation HTTP403 was not bypassed. The read-only Cloudflare docs connector successfully returned the same official Workers API reference. Its retrieved put/head/get/onlyIf semantics corroborate the binding boundary; no Cloudflare account API or resource was read/mutated. Optional BeautifulSoup parsing was unavailable; standard-library HTMLParser was used instead, without installing dependencies.

Document verification note: a staging-time checker initially treated a newly added index as an existing HEAD file and failed with missing-path status. It was corrected to compare modified existing documents against the fixed starting revision and reran PASS. Full Git whitespace checking flags unchanged raw Node assertion-log whitespace; those raw bytes are intentionally preserved. Authored reproduction Markdown trailing whitespace was removed; chapter/document whitespace check excludes raw logs. These are documentary tooling outcomes, not product failures.

Delivery race: initial normal push rejected because remote advanced to40aeef1 with changes only in two Ideas Markdown files. A normal merge preserves that unrelated remote history; no product/tests source changed, so this source-pinned test boundary remains applicable. No force/reset/rebase used.
