# Independent cold-agent follow-up

2026-10-23. Narrow recheck of three documentation/tool corrections only. Initial transcript remains unchanged. No production/cloud/extension actions, package installs or full drill rerun.

| Correction | Actual local result | Residual boundary |
|---|---|---|
| Adapter discovery | `node FOREVER_WORKS/tools/query.mjs help` exits0 and separates `publicApi.operations` from `documentationOperations:[currentState,issues,help]`, explicitly distinguishing these from Forever API. Source default operation is now help. | `describe` intentionally remains canonical-only; caller must use help/default for adapter discovery. |
| Embedded executor replacement obligations | Dependency JSON now names seven capability/invariant pairs: remote-ingest, copy, move, rename, delete, folder.create, archive. Five named requirements have explicit definitions under extensions.org.redown.replacementCriteria: exact destination, verified copy before delete, conflict/directory identity, truthful partial/uncertain outcomes, protocol/privacy compatibility. | Behavior-derived and unreviewed; criterion prose is not executable acceptance evidence or a complete source-independent protocol. |
| Compatibility source references | Independently read every `forever/compatibility/*.json` and checked current file SHA256 plus presence of each supplied symbol: **11 refs checked, zero failures, zero records missing refs**. Worker-transfer specifically points at options pasteExplorer and background cfTransferObjects. | Hash/symbol presence establishes current navigation, not correctness or full behavior coverage; deeper executor proof still requires source/tests and authorized installed/provider acceptance. |

Executed replacement query:

```sh
node FOREVER_WORKS/tools/query.mjs evaluateReplacement redown.dependency.r2-worker redown.implementation.dependency.r2-worker
node FOREVER_WORKS/tools/check-preservation.mjs
```

First exits0 and returns **partial** with20 unknown checks: seven capabilities, seven invariants, five named criteria, one compatibility contract; each says “No candidate evidence supplied”. Second exits0, valid:true; assertions establish actual model validation, missing-proof partial, deliberately failed protected obligation fail, unknown-field preservation and broken canonical-reference rejection. This remains a documentation-evaluator check, not runtime transfer proof.

Other exact inspection commands:

```sh
node FOREVER_WORKS/tools/query.mjs help
cat forever/dependencies/redown.dependency.r2-worker.json
cat forever/compatibility/redown.compatibility.worker-transfer.json
cat FOREVER_WORKS/tools/query.mjs
```

For the reference recheck, a fixed local `node --input-type=module` script used fs/promises readdir/readFile over forever/compatibility, then crypto.createHash('sha256') against each sourceRefs.sha256 and text.includes(sourceRefs.symbol). Output: `{"checkedSourceRefs":11,"failures":[]}`.

All three targeted defects are addressed for maintenance navigation. Initial broader limits remain: no installed/live verification, no accepted owner intent, no full source-independent reconstruction experiment; stale generic reports and remaining test failures are outside this narrow recheck. No new runtime-success claim or expanded drill score is made.
