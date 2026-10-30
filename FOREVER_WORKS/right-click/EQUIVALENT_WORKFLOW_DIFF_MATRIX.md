# Equivalent-workflow differential: A–Q

[Route](README.md) · [main diagnosis](FORENSIC_LEGACY_VS_MODERN_ROOT_CAUSE.md) · [raw D1–D10](evidence/phase-2/differential.json)

All17 required actions are represented. P/A/B/R/N/S are synthetic profile/account/bucket/root/node/option identities, not customer identifiers. Historical=515c272, current=2e65ba137a35e1656b691fd2fdbf95082a0cdf4e. Each row separates expectation, source, saved state, descriptor/target, effects, first divergence, counterexample, confidence/gap and a later proposal. Full per-row execution is not claimed: existing focused tests and eleven custom observations cover portions; installed/live rows remain unknown.

## A. Select connected account/prepared bucket

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Use existing account/bucket immediately |
| Historical Legacy | Legacy profile and bucket selectors use saved accountId/bucketName; storage preparation separate |
| Modern current | Modern usable() requires Cloudflare account, selectors may show bucket setup required; validation additionally requires workerUrl/token |
| Persisted fields | profiles identity / prepared target |
| Native ID/order/parent + exact target | quick:P → accountA/bucketB/prefix |
| Side effects / observed test output | SOURCE + existing account-edit/activation tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Discovery/authorization versus menu inclusion; not proof native menu updated |
| Counterexample | Valid already-prepared profile works |
| Confidence/proof gap | NOT_TESTED installed account session |
| Future repair | PROPOSAL ONLY: Keep explicit target selection; no forced Explorer for future providers |

## B. Add primary + second Simple

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Both destinations appear in Chrome |
| Historical Legacy | Primary location edits autosave; extra option persisted by saveProfiles |
| Modern current | +Location creates draft extra; primary represents profile and can be suppressed; Save needed |
| Persisted fields | simplePrimaryEnabled/defaultPrefix/simpleOptions |
| Native ID/order/parent + exact target | quick:P, simple-option:P:S flat under redown |
| Side effects / observed test output | D1 actual callback/current UI; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Draft→persistence; 3 cards/2 saved actions before Save |
| Counterexample | After Save3 actions correctly planned |
| Confidence/proof gap | LOCAL_TEST; no installed registration |
| Future repair | PROPOSAL ONLY: Review commit affordance/autosave expectation, not restore Legacy writer |

## C. Rename/reorder/save

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Name/order match without target change |
| Historical Legacy | Field scheduleSave and saved arrays/menuOrder; fallback preference |
| Modern current | Input update draft; global primary/item order; explicit Save; path untouched |
| Persisted fields | menuLabel/simplePrimaryOrder/options.order |
| Native ID/order/parent + exact target | Stable quick/option IDs; order changes only |
| Side effects / observed test output | D6 naming; focused ordering/label tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Automatic label differs even for same target; explicit edit waits Save |
| Counterexample | Explicit custom label still wins |
| Confidence/proof gap | LOCAL_TEST; UI focus not complete |
| Future repair | PROPOSAL ONLY: Bucket automatic naming, preserve custom labels/path |

## D. Choose existing deep folder

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Select exact parent/child path |
| Historical Legacy | Per-level scoped dropdown; autosave prefix |
| Modern current | Simple lazy picker selects whole prefix; Nested single-segment selectors, child invalidation |
| Persisted fields | defaultPrefix or nested names/ready |
| Native ID/order/parent + exact target | Prefix photos/final; Simple flat; Nested immediate parents |
| Side effects / observed test output | Focused picker/deep tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Selection UI/commit boundary, no implicit creation |
| Counterexample | Existing saved ready hierarchy produces correct plan |
| Confidence/proof gap | LOCAL_TEST; native depth rendering unverified |
| Future repair | PROPOSAL ONLY: Retain scoped path and distinct selector/creator |

## E. Create cloud folder vs add menu child

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Know which changes storage |
| Historical Legacy | Create sends cfCreateFolder; Child inserts row; Simple prefix autosaves |
| Modern current | Create does precheck/mutation/read-back, adopts draft; Child blank draft only |
| Persisted fields | Nested node plus real marker; betaNoProvision |
| Native ID/order/parent + exact target | Exact captured parent prefix; no menu Save yet |
| Side effects / observed test output | Focused Simple/Nested creation tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Remote object may exist while menu remains unsaved |
| Counterexample | Selecting folder never calls Create |
| Confidence/proof gap | Mock provider only; no live mutation |
| Future repair | PROPOSAL ONLY: Keep explicit real creation and explain remote/draft split |

## F. Nested root + eight levels

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Hierarchy and Send here match |
| Historical Legacy | Eager render/discovery; historical deep native builder flattens to first-folder ancestor |
| Modern current | Root/child drafts, startCollapsed lazy reads, eight-level limit; shared parent-first plan |
| Persisted fields | nestedMenu roots/children/name/ready |
| Native ID/order/parent + exact target | nested:P:R:N and :send at every branch |
| Side effects / observed test output | D2 + eight-level shared plan test; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Legacy-only/no-ready draft gate and changed deep parent plan |
| Counterexample | Valid modern tree passes all eight levels |
| Confidence/proof gap | LOCAL_TEST plus isolated HTML, not installed native |
| Future repair | PROPOSAL ONLY: Preserve actual parent identity/folder outline |

## G. Remove child/last child/root/group/save/reload

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Only intended menu definition removed |
| Historical Legacy | Old segment × clears path; node removal autosaves subtree |
| Modern current | Simple suppression/option removal; Nested subtree removal; group roots=[] Undo; Save then Reload |
| Persisted fields | simplePrimaryEnabled/options/nested roots |
| Native ID/order/parent + exact target | Removed ID absent; stale branch :send rejects after last child |
| Side effects / observed test output | Existing remove/Undo/stale-send focused tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Modern draft delete not persisted until Save; scoped X meaning differs |
| Counterexample | Save persists zero root; no cloud delete |
| Confidence/proof gap | LOCAL_TEST; remove focus visual gap |
| Future repair | PROPOSAL ONLY: Keep visible red X and non-destructive meaning |

## H. Remove all; legacy tree retained

| Field | Differential evidence |
|---|---|
| Owner/user expectation | No deleted destination returns |
| Historical Legacy | Historical old tree could remain independent output source |
| Modern current | Versioned empty model overrides old tree; no tree: generator/resolver |
| Persisted fields | menuConfigVersion=1, empty roots/options/primary suppressed |
| Native ID/order/parent + exact target | No native destinations; setup+built-ins |
| Side effects / observed test output | Focused zero/readd/migration tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Current compatibility deliberately refuses legacy fallback |
| Counterexample | Modern nonempty selected configuration still works |
| Confidence/proof gap | LOCAL_TEST; restart installed not tested |
| Future repair | PROPOSAL ONLY: Never reenable old tree writer/generator |

## I. Dashboard/native mode, dirty/clean

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Switch layout without losing work |
| Historical Legacy | Legacy wrote mode immediately; autosave definitions |
| Modern current | Modern mode-only profiles:[] save; native checkbox shares lane; dirty rebase retains draft |
| Persisted fields | rightClickMode + expected signature |
| Native ID/order/parent + exact target | Only selected layout descriptors |
| Side effects / observed test output | D5 + mode-only/dirty tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Nested normalization may overwrite success status; native switch lacks full validate |
| Counterexample | Persisted mode still correct in failing status test |
| Confidence/proof gap | LOCAL_TEST; real windows unverified |
| Future repair | PROPOSAL ONLY: Retain mode independence; reduce ambiguous status |

## J. Two editors; stale save

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Never overwrite newer setup |
| Historical Legacy | Whole-profile autosave risk; old Nested merge only specialized |
| Modern current | Expected signature rejects stale definitions; dirty page requires Reload |
| Persisted fields | signature over mode/projection |
| Native ID/order/parent + exact target | Newest saved model governs plan/resolver |
| Side effects / observed test output | Focused stale concurrent/external tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Modern rejection is protection, can look like UI not applying |
| Counterexample | Fresh expected signature saves normally |
| Confidence/proof gap | LOCAL_TEST; actual multiwindow event ordering pending |
| Future repair | PROPOSAL ONLY: Preserve optimistic guard; show actionable conflict |

## K. Storage/Worker/prepared/menu failure

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Clear error, no false success |
| Historical Legacy | Whole-profile save/storage failures, older builder aggregated errors |
| Modern current | Storage failure no save; unprepared rejected; creation uses noProvision; create error after persistence clears native menu |
| Persisted fields | profiles/mode may saved while registration fails |
| Native ID/order/parent + exact target | D3 saved label/native0; D4 descriptor/no resolver in corrupt state |
| Side effects / observed test output | D3/D4 + callback/storage/validation tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Saved→registered or prepared→resolvable; classify each separately |
| Counterexample | Healthy callback/target gives correct results |
| Confidence/proof gap | Injected faults; owner Chrome cause unresolved |
| Future repair | PROPOSAL ONLY: Expose distinct saved/build/target outcomes without weakening gates |

## L. Reload/restart/suspend

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Saved setup returns and Chrome matches |
| Historical Legacy | Startup/storage triggers rebuild; no durable build journal |
| Modern current | Same triggers/serialized rebuild; queues/signature in memory; load reconstructs draft |
| Persisted fields | Persistent profiles/mode vs ephemeral queue/draft |
| Native ID/order/parent + exact target | Regenerated plan, actual Chrome unknown |
| Side effects / observed test output | Reload fixtures; source startup/suspension review; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Restart proof is missing; no durable last registered receipt |
| Counterexample | Clean mock rebuild deterministic |
| Confidence/proof gap | PARTIAL; actual MV3 kill/restart NOT_TESTED |
| Future repair | PROPOSAL ONLY: Plan non-mutating diagnostic evidence before durability changes |

## M. Right-click supported source/media

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Upload intended bytes to exact target |
| Historical Legacy | Historical native routes classify/source-prefix transfer |
| Modern current | srcUrl > linkUrl > pageUrl; fresh exact resolver; special gallery branch |
| Persisted fields | History source and destination receipt separate |
| Native ID/order/parent + exact target | quick/option/nested ID → A/B/prefix; filename inferred |
| Side effects / observed test output | Existing click/destination-search tests; source Worker; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Reference may not be usable bytes; not necessarily menu-planning defect |
| Counterexample | Public accessible HTTPS media can follow Worker route |
| Confidence/proof gap | LOCAL_TEST; byte/live-source proof missing |
| Future repair | PROPOSAL ONLY: First-class browser bytes transport separately scoped |

## N. Click stale/removed ID

| Field | Differential evidence |
|---|---|
| Owner/user expectation | No accidental fallback upload |
| Historical Legacy | Historical tree/default routes existed |
| Modern current | Fresh mode/model resolve null; tree: rejected; no old default substitute |
| Persisted fields | No transfer mutation from null resolve |
| Native ID/order/parent + exact target | ID absent/inactive, optional notification only |
| Side effects / observed test output | Focused click/stale-send/obsolete tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Click→resolve intentional rejection; may seem silent notifications-off |
| Counterexample | Current valid ID resolves exact path |
| Confidence/proof gap | LOCAL_TEST; native feedback NOT_TESTED |
| Future repair | PROPOSAL ONLY: Preserve rejection, review visible feedback |

## O. Duplicate names/buckets/groups/orphans

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Distinct accounts stay distinguishable |
| Historical Legacy | Display/profile names and saved ordering; source had weaker duplicate-ID validation |
| Modern current | Selectors include IDs/bucket; profile uniqueness guard; empty group not rendered; shared labels may duplicate |
| Persisted fields | Stable profile/account/root/node identity |
| Native ID/order/parent + exact target | Duplicate names can share title but not ID; wrong/corrupt IDs reject |
| Side effects / observed test output | Focused same-account group/removal/account tests; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Names are not identity; stale/duplicate profile ambiguity needs snapshot |
| Counterexample | Distinct valid stable IDs route correctly |
| Confidence/proof gap | PARTIAL; no owner profile export |
| Future repair | PROPOSAL ONLY: Redacted identity-aware diagnostics; no invented dedup migration |

## P. First run vs activate; all + controls

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Use existing storage with obvious minimum steps |
| Historical Legacy | Bucket creation/provisioning available in Legacy editor |
| Modern current | Optional dedicated setup confirm creates/reuses redown; activation deploys existing bucket; Location/Child draft |
| Persisted fields | Prepared profile/new seed; defaultPrefix may files |
| Native ID/order/parent + exact target | Primary auto label may files; added option New location |
| Side effects / observed test output | Activation tests + D6 + source setup construction; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Infrastructure defaults feed Modern; no active Legacy editor required |
| Counterexample | Custom label or empty prefix changes naming outcome |
| Confidence/proof gap | LOCAL_TEST+SOURCE; no actual provisioning |
| Future repair | PROPOSAL ONLY: Bucket default name; preserve current storage path; minimize setup complexity |

## Q. Notifications off/save rebuild failure

| Field | Differential evidence |
|---|---|
| Owner/user expectation | Know whether request saved/rendered/completed |
| Historical Legacy | Optional notifications and old status; not universal success proof |
| Modern current | Notify returns early when off; Save returns menuUpdated false; status may be replaced; toolbar separate |
| Persisted fields | Persistent model/history vs transient notification/status |
| Native ID/order/parent + exact target | D3 native0 after saved; invalid target no notification |
| Side effects / observed test output | D3/D5; notify/recordTransfer source; source details in [census](FULL_CALL_AND_WRITER_CENSUS.md), results in [ledger](FULL_EVIDENCE_COVERAGE_LEDGER.md) |
| First divergence / causal interpretation | Feedback can obscure first failure boundary |
| Counterexample | Healthy Save provides menuUpdated true in fixture |
| Confidence/proof gap | LOCAL_TEST/SOURCE; installed visibility unverified |
| Future repair | PROPOSAL ONLY: Honest bounded state feedback, no fake completion |

## Additional targeted counterexamples

D7 applies to row I/H: only when saved mode is absent/invalid, historical tree-only state infers nested while current infers simple. Explicit mode is the counterexample. D8 applies to O/N/K: imported colon-bearing profile IDs can save/build but cannot resolve. Generated UUIDs are the counterexample. Both are documented negative/compatibility cases, not attributed to owner state. See raw differential JSON for exact synthetic results.

D9 applies to row O: two prepared bucket profiles under the same account render two account-titled Nested groups. The metadata that contains identity/bucket details is hidden by current CSS, while bucket selectors remain visible. Repeated headings are confirmed DOM/presentation structure, not proof a ghost profile or competing writer exists.

D10 applies to K/M: menu prefix character-count acceptance can differ from Worker UTF-8 total-key limit; synthetic600 two-byte characters are accepted by menu validator and rejected by Worker key guard. Short ASCII is the counterexample. This is a negative transfer-boundary case, not attributed to a missing owner menu item.
