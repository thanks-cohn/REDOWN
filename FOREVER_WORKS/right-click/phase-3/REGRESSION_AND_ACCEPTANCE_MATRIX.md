# Regression and acceptance requirements

30 October 2026. **AUDIT ONLY.** Source `b7178442c26c7723a9a650613ef65ba38ce26b21`. All implementation facts below are pinned source inspection unless a named local fixture is cited. No installed Chrome or live-provider verification. Proposed boundaries are documentation, not existing APIs or accepted Forever intent.

Current local evidence is not a universal release certificate. P = new actual-source parity harness; D = prior differential reexecuted at this pin; focused tests are unchanged repository fixtures. [Reproduction](evidence/REPRODUCTION.md) includes the exact independent harness, with Chrome/storage/provider mocked.

| Required fixture / input | Exact expectation | Evidence / remaining boundary |
|---|---|---|
| Prepared a/art profile p, primary + extra S | quick:p and simple-option:p:S flat under redown; account a/art with each exact prefix | P1; existing additions/flat fixtures; installed NOT_TESTED |
| Same intent choose bucket → photos/final → add second → remove original | primary quick:p remains a/art/photos/final; only new extra survives; no cloud calls | P1 actual historical/current callbacks/builders, full arrays; differing UUID/default New location recorded |
| Blank label at root/deep/files, explicit label | current deepest/fallback bucket vs old bucket preference; labels never alter prefix | D6/P1, focused label tests; owner future default-bucket change separate |
| Root r plus eight segment chain d1..d8 | nested:p:r:r under redown; d1 under root; each dN under d(N-1); :send for parents; d8 prefix level1/.../level8 | P8 full descriptors/resolved targets; current deep fixture; native platform depth NOT_TESTED |
| Historical third-folder ancestry | old parent first-folder vs current second-folder | P4 actual builders, not a simulated approximation |
| Rename/reorder | stable IDs and exact target; title/order only changes | unchanged named ordering/label tests; browser keyboard/focus incomplete |
| Remove primary/extra/branch/root/group; Undo; zero then reload/rebuild | primary false; filter extra; subtree absent; group roots=[]; stable Undo; no provider delete; setup-only destinations after all removed | P7/P8 and unchanged group/Undo/empty/readd tests; true extension restart NOT_TESTED |
| Legacy-only menuTree pre-v1 | no current native tree output; draft import unready, expand/discover then explicit Save | D2/D7; zero model must never resurrect old tree |
| Version1 empty modern model plus old tree | no import/reappearance even repeated initialize/rebuild | P7 and migration/backup tests |
| Collapsed imported unready descendants | Save rejects, no false-ready write; expansion/read then valid Save | D2; failed reads need actionable UI, don't fabricate ready=true |
| Two editors, one stale expected | first commit persists; stale rejects and doesn't overwrite; dirty mode-only rebases expected mode | P5 + unchanged concurrency/mode tests; real event interleavings NOT_TESTED |
| Storage failure | reject/no commit, draft remains; distinguish uncertain IPC timeout | unchanged storage test, no false success |
| Chrome create failure | saved signature + menuUpdated=false, cleanup attempts, retry | D3 + unchanged callback tests; injected mechanism only |
| Chrome initial removeAll rejection | saved label survives; ok:true/menuUpdated:false; no create for attempted plan | P2; separate from partial-create cleanup |
| Missing prepared profile/token or duplicate names | descriptor may exist in corrupt state but resolver null; two same-title valid profiles target distinct buckets | P9/D4/D9; valid Save normally rejects unprepared |
| Stale/malformed/deleted IDs, wrong mode, old tree, obsolete :send | resolver null, no fallback ingest | P3/P8/P9/P10 + listener fixture; D8 colon ID intentionally reveals current validation gap |
| Page/link/image/video click | selectedUrl srcUrl > linkUrl > pageUrl; exact account/bucket/prefix forwarded; deleted item no provider call | P10 actual listener with stubbed ingest; no real byte receipt |
| Oversized Unicode key | current C.prefix passes 600 é while Worker exactObjectKey rejects 1200 bytes; later design must account filename too | D10 confirms failure case; never count as successful provider-safe path |
| Short ASCII / spaces and exact receipt | correct parent prefix; wrong returned parent rejected | unchanged destination-search-regression ingest fixture; live read-back NOT_TESTED |
| Delayed Worker/domain persistence after delete | setProfiles preserves newest menu fields and other newly added profiles | unchanged delayed merge fixture; no resurrection |
| Activation/dedicated setup vs add menu row | explicit confirmation for actual provisioning; no create for prepared +Location | unchanged setup/add fixtures; no live provisioning performed |
| Tabs/outline/red × in constrained panel | all needed controls reachable, clean predictable red action slot, no tooltips/hover-only reveal, true ancestry | prior standalone captures + unchanged DOM/CSS tests; current full-app/Shelf/all themes/assistive tech NOT_TESTED |
| Extension reload/suspend mid-build | saved definitions survive, latest plan re-registers or explicit truthful failure; no silent success | SOURCE-MODELED / NOT_TESTED; requires administrator-approved disposable runtime |
| Browser-permitted bytes/provider receipt | exact destination, correct bytes, defined conflict policy and completion | NOT_TESTED and live writes unauthorized; future providers not implemented |

## Required acceptance protocol for a later interface

Freeze source revision and isolated inputs. Compare full descriptors and separately resolve each actionable ID to exact account/bucket/prefix. Retain before/after save baseline, draft, callback failures and deterministic order. New UI must match current supported valid-state fixtures, then explicitly handle the known negative cases. Do not delete old tests to erase failures or update frozen hashes to manufacture freshness.

For approved installed acceptance, capture matching installed fingerprint, same saved model/mode, actual native menu and click target at every boundary, with redacted private evidence. Test dirty/clean windows, actual service-worker termination, lifecycle rebuilds, callback errors and real constrained panels separately from local mocks. Separately authorized provider tests need real receipt and independent byte/target checks. Until then final answer to universal reconstruction acceptance is PARTIAL.
