# Chrome registration: independently check each truth

[Navigation](README.md) · [contract](UI_TO_WIRING_CONTRACT.md) · [raw full plans/diffs](evidence/parity.json).

| Truth / owner | Exact artifact to compare | What local audit proves | Remaining proof |
|---|---|---|---|
| Intent / owner | Same selected account, bucket, folder, custom/automatic name, active mode | P1 same deep target/add/remove; owner visual requirements recorded | One concrete owner installed failure not supplied |
| Editor / destinations.js, Nested renderer | Stable profile/row/root/node IDs, draft projection, expected, dirty/ready/collapsed | Actual current DOM and historical callbacks in jsdom; P1 before/after | Installed focus/layout/status timing NOT_TESTED |
| Saved / background save lane | C.project and signature of persisted profiles+mode; backup/version | Explicit save, stale rejection, storage fail and menu fail fixtures | Actual private saved state not read; uncertain termination NOT_TESTED |
| Planned / M.menuEntries + background buildMenus | Entire ordered descriptors (id,parentId,title,contexts), exact resolved target | P1 exact Simple destination descriptor diff=[]; P3 full deliberate Nested diffs | Complete browser-limit compatibility not proved |
| Registered / chrome.contextMenus | removeAll result, each create callback/lastError, installed build + revision correlation | Mock callback order/error/clear and P2 removeAll reject | Actual registration callbacks/native item enumeration unavailable; no durable current registered-version record |
| Rendered / Chrome platform | Visible native item under page/link/image/video/audio with exact ancestry | No installed result | Managed ExtensionInstallBlocklist=*; approved environment required |
| Click resolved / current C.resolve | Fresh owner ID/account/bucket/prefix and active mode | P4 actual listeners + existing stale/malformed/mismatched fixtures | Real click timing and suspension NOT_TESTED |
| Provider receipt / ingest + Worker + history | Source URL/bytes, key folder, response, history/counter | Dispatch stub exact target; in-memory regression Worker tests only where named | Live target/bytes NOT_TESTED and not authorized |

## Exact known descriptor equivalence

P1 synthetic fixture: profile `p`, account `a`, bucket `art`, selected `photos/deep`, primary label `Art`; add stable `parity-added`, blank extra label at bucket root; remove old `extra`. Historical actual bucket/select/+Child/extra.addLocation/remove callbacks persist; Modern actual bucket/picker/+Location/red × then Save persists.

Destination descriptors in **both** builders after persistence, in order (all contexts link,image,video,audio,page):

| ID | Parent | Title | Fresh target |
|---|---|---|---|
| quick:p | redown | Art | owner p / account a / art / photos/deep |
| simple-option:p:parity-added | redown | art | owner p / account a / art / empty prefix |

`evidence/parity.json` records full models, full native descriptions (including controls), resolved projections and timing. P1 destination diff is empty. Native controls are also captured, but only destination equivalence was asserted; do not infer all historical built-ins identical. The UUID is fixed by the fixture only; no real IDs/state changed. Modern before Save still has its old extra and no deep prefix.

P3 root `nested:p:r:r` → `:send`, `level1` → `:send`, … `level8`. Current every child parent is immediate predecessor; branches at each level have Send here first. Old level3+ parents flatten to level1 and labels accumulate path; old deep send children are absent. Raw full descriptorDiff includes missing historical entries as null. These are **expected safety improvements**, not a parity failure to reverse.

P4 genuine historical/current listeners choose page when only pageUrl, link when linkUrl, media srcUrl ahead of wrapped link for image/video. Both deliver valid Simple fixture to `a/art/photos`; current rejects after mode change, deletion and malformed ID. No actual bytes are fetched; “mock-receipt” is not a provider receipt. P1/P3 resolved projections use current C.resolve on the historical models; P4 supplies the actual historical click evidence separately.

## Current registration algorithm and failure contract

`buildMenus` reads saved profiles/mode, infers/stores missing mode if needed, constructs complete parent-first plan and validates duplicate/missing-parent IDs **before removeAll**. It enriches an internal description with destination+remote-save metadata where C.resolve succeeds, then strips that metadata before Chrome create. Do not pass internal destination fields as Chrome options or invent a public plan endpoint.

It awaits removeAll; then awaits every create callback with 5000ms per-entry deadline (with runtime.id present). runtime.lastError or throw rejects; later create failure triggers cleanup removeAll and throws. There is no total build deadline. `rebuildMenus` serializes whole builds; a later build follows even after an earlier rejects. Callback acknowledgment does not prove native visual rendering or provider correctness.

| Failure | Saved state | Registered state in fixtures | Current feedback/recovery |
|---|---|---|---|
| Invalid draft/stale signature | Old | Old | Error, draft preserved; reload/reconcile stale |
| Storage set throws | Old in storage mock | Old | Not saved; draft remains |
| Plan invalid before removeAll | New if save already committed | Old may remain | ok:true/menuUpdated:false; retry after diagnosis |
| Initial removeAll rejects | New | **P2 retains prior menu** in mock | Partial-save error; no cleanup in this pre-loop branch; real side effects unknown |
| Create callback fails | New | Partial build cleared when cleanup succeeds | D3 native0; partial-save error, retry Save using returned signature |
| Cleanup removeAll also fails | New | Partial/unknown | Cleanup swallowed; never promise empty or correct menu |
| Callback never arrives | New | Partial then cleanup after per-item timeout | Failed registration; later callback/lifecycle effects unverified |
| Worker termination after storage before receipt | Could be new | Unknown | Current no durable receipt; privately reread, do not assume rollback |
| Storage-triggered rebuild failure | Saved external change | Old/empty/partial/unknown | Listener catches without per-editor receipt; Save can retry |

Installed/startup trigger rebuild; profiles/rightClickMode storage events queue rebuild and catch failures; native checkbox shares save lane and rebuilds; explicit save rebuilds after storage. Duplicate triggers may enqueue multiple builds but do not interleave create/remove sequences. In-memory queues do not survive MV3 termination. Chrome menus may outlive worker memory; source alone does not establish restart rendering.

## Reproducible installed acceptance plan — NOT_TESTED

Use an administrator-approved disposable environment with the exact extension build and synthetic prepared fixtures. Do not bypass this environment's wildcard install blocklist. Record extension version/source fingerprint/platform, saved projection signature and fixture identity privately; do not export credentials or private paths. Observe native page/link/image/video/audio menus for P1/P3; verify labels, parents, count, mode checkbox and all controls; click valid/stale/deleted IDs with transfer interception or separately authorized disposable provider. Repeat extension reload/browser restart/worker idle shutdown, two editors and changing mode during a save. Capture real callback errors if observable with authorized test tooling. Browser receipt/visual proof must be source-revision-correlated; current code has no inspection API exposing a durable registration version, so that is an explicit evidence gap.

Only a separately authorized provider test can assert account/bucket/key/bytes. Never prepare/deploy to obtain “read-only diagnostics.” None of these installed/live steps was performed here.
