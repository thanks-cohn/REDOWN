# Preservation, failure graph and verification

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## Evidence policy and Forever Works mapping

SOURCE-CONFIRMED means exact executable anchors at the pinned HEAD. LOCAL-REPRODUCED means actual current code exercised with captured synthetic inputs/output. INSTALLED-CHROME-OBSERVED and LIVE-PROVIDER-VERIFIED are **not obtained in this audit**. DOCUMENTED-CLAIM and OWNER-INTENT remain distinct. UNKNOWN/BLOCKED identify the missing observable gate. Passing a DOM/VM test never promotes it to a native or provider observation.

The installed preservation corpus pins upstream standard/schema/Public API 0.1 at `f76056aa59942935cad5ab53f26a78cefedff77d`. See [upstream pin](../upstream/forever-works/UPSTREAM.json), [policy](../POLICY.md), [manifest](../../forever/manifest.json), and [describe observation](evidence/forever-describe.log). Normative kinds are intent, capability, invariant, constraint, dependency, decision, compatibility, migration, implementation and evidence. This dossier invents no normative Mechanics Atlas entity type and changes no canonical record. Its matrices are documentary observations and agent-proposed preservation requirements, not accepted intent.

| Preservation subject | Mechanics evidence | Proper future Forever mapping (after review) |
|---|---|---|
| exact click target, no label routing | domain case routes + resolver anchors | capability/invariant with implementation/evidence links |
| shared original toolbar survival | wrapper source + bootstrap-observation | dependency on Chrome capability; invariant candidate |
| atomic directory delta/journal | CURRENT source + current tests | implementation evidence for durability capability; browser/cloud atomicity excluded |
| mode/alias compatibility | serialized scenarios and migration caveats | compatibility/migration obligations, never inferred approval |
| localized failures and rollback | fault matrix + native reconciliation | dependency rationale and unknown/pass/fail claims only for measured gates |

Upstream's missing-evidence result is unknown, not pass. Frozen earlier evidence hashes remain untouched even though current source has changed. The preservation checker is run as-is; failures are recorded, not fixed by refreshing hashes. Forever Works does not mean zero future bugs: it makes a proposed localized change's obligations and blast radius inspectable.

## Failure dependencies

```text
core import fault → later provider installs/menus unavailable → wrapper toolbar/BOOT recovery
V3 validation/projection fault → combined plan fails → base root/manage repair
storage failure → config/receipt unavailable → toolbar gesture still independent
native callback failure → pending/failed registration → current directory data retained
list timeout/partial page → inventory incomplete + remembered paths → bounded cached menu
provider ingest/HEAD failure → failed/unconfirmed History → no verified success assertion
History failure after write → provider may contain object; UI result can still fail
```

All independent-provider failure behavior needs tests at shared worker bootstrap and registrar boundaries, not merely separate source files. A structural order change recreates destination rows across providers; no `removeAll` is used, but this still has a broad temporary native effect. Chrome's API is non-atomic. update failure falling back to create is an attempt, not guaranteed repair of arbitrary Chrome denial.

## Safe fault-injection matrix

| Fault | Current source response | This run's evidence / remaining gate |
|---|---|---|
| stale/deleted/native branch ID | current plan leaf check rejects | observations.json stale routes; domain tests pass |
| duplicate labels / same path | unique alias IDs, coalesced ancestry | 15 scenario fixture outputs; installed duplicate usability OPEN |
| duplicate record ID / invalid prefix | validate rejects | fixture explicit error |
| missing/revoked profile | prepared filter + resolve null | synthetic revoked case; real provider revocation OPEN |
| native update/create/remove error | 5s bounded ack, update→create, root recovery | entry-point/BOOT focused tests; some V3 sliced harness failures retained |
| lost native callback | timeout, unknown native outcome, retry reconcile | BOOT/entry tests pass; installed callback lifecycle OPEN |
| storage read/write rejection | toolbar independent; config or reconcile fails | entry-point tests pass; mirror-after-IDB failure coverage partly V3-harness blocked |
| IDB transaction abort | all involved stores roll back | current tests pass |
| worker import failure | original toolbar/BOOT fallback, no core menus | bootstrap-observation.json; existing helper.ready failures retained |
| Shelf while V3 core fails | gesture path independent | local wrapper/entry evidence; native visible Shelf OPEN |
| Depth timeout | bounded race stops traversal, partial/frontier | existing domain tests pass; underlying fetch cancellation absent |
| repeated cursor | discovery rejects repeated/seen cursor | existing domain tests pass; picker only immediate repeated guard |
| corrupt cache | invalid nodes/key filtered or projection fails, base retained | entry/domain tests; malformed valid-looking parent links not fully fuzzed |
| changed account/connection | profile-dependent prepared match/key invalidation; late discovery guard | source + domain tests; live expiration OPEN |
| interrupted/stopped scan | frontier retained, bounded observation; no durable job resume promise | source + focused tests; MV3 real suspension OPEN |
| two concurrent saves | one serialized lane; expected revision conflict | existing concurrent transaction test passes |
| two setup windows | storage changes block retained conflicting draft | source + existing UI checks; real two-window native interaction OPEN |
| adapter list failure | no generic adapter exists | fictional contract gate PROPOSAL ONLY |
| provider contribution/import failure | composer guards some fragments; boot still shared | source dependency risk; full cross-provider injected matrix OPEN |

IF a proof was not run, THEN it stays OPEN. IF a harness fails before the asserted feature, THEN preserve that failure and classify its cause rather than claim feature closure. IF a directory commit succeeds and native registration fails, THEN preserve current data and truthful pending acknowledgment. ELSE a local pass applies only to the inputs and boundaries recorded.

## Verification record

[Verification summary](evidence/verification-summary.json), [full tests](evidence/full-tests.log), [focused tests](evidence/focused-tests.log), [reliability](evidence/reliability.log), [preservation](evidence/preservation.log), and [command ledger](evidence/COMMANDS.md) are the observed record. Full-suite and reliability stages remain failed; exact final counts are in the summary and Start Here. Existing frozen catalog/debug/semantic debt, newly exposed current harness expectations, UI expectation failures and real uncertainty are not collapsed into one “known seven” label.

The initial reliability command started before npm dependencies were fully installed. Its incomplete result is retained as `reliability-pre-install.*` and superseded by the completed post-install run. It must not be quoted as the final baseline. No test file/assertion or registry baseline was edited. The isolated bootstrap observation deliberately avoids helper.ready(), which assumes menuRebuildQueue exists even when the core import failed; the unchanged test fails at that assumption before its intended toolbar assertions.

## Release / preservation gates

Require source tree unchanged outside this new folder; exact source/tag hashes before and after; all current failures accounted for without rewritten expectations; verified migration and backup restore before schema changes; adapter conformance with fictional failures; real approved installed Chrome startup/menu/first-open/multiwindow/suspension acceptance; separately authorized disposable provider writes and readback; no credential or private folder material in support exports. No package, deployment, new engine or release certificate is produced here.

## Existing canonical records, not new authority

Existing `redown.capability.destinations`, `redown.invariant.destinations`, `redown.implementation.destinations` and `redown.compatibility.destination-state` are the relevant baseline preservation records. Their source revision is 424f29e, their provenance is inferred/unreviewed, and their hashes/meaning are not updated by this dossier. The old compatibility statement “Preserve configured Simple and Nested modes independently” is a historical preservation statement; it does not prove current Simple/Narrow destination state is independent. `redown.capability.remote-ingest`, `redown.capability.delivery-counter`, `redown.dependency.chrome` and `redown.dependency.cloudflare` provide other existing graph entry points. Refer to their actual records through the query tool before any later accepted model change.

[preservation-files.json](evidence/preservation-files.json) compares all1833 pre-existing tracked files to baseline blobs. Git reports no tracked changes. One raw-byte difference is the declared LF-index/CRLF-checkout conversion of build-windows.bat; normalized bytes match and the audit did not edit it. The preservation evaluator and canonical model validation pass as scoped documentary checks. They are not a full frozen-source freshness pass. Remote protected branch/tag refs are captured in protected-remote-refs.log; the audit issues no protected-ref updates.
