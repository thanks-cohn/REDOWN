# Commands and evidence ledger

Run from repository root on `codex/v3-parity-first-reconstruction`, audited source `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Linux / Node24.19.0. All provider/browser objects in executed fixtures are simulated. No real Chrome handlers, live listing, auth, deployment or provider writes were invoked.

| Command | Observed result / artifact |
|---|---|
| `git fetch origin codex/v3-parity-first-reconstruction:refs/remotes/origin/codex/v3-parity-first-reconstruction` then `git switch -c codex/v3-parity-first-reconstruction origin/codex/v3-parity-first-reconstruction` | Exact required branch from remote; clean initial tracked status. First `--track` attempt rejected because remote fetch config only mapped main; plain switch succeeded. |
| `npm run diagnostics -- getStartGuide` | diagnostics-getStartGuide.log; read-only gateway |
| `npm run diagnostics -- validateRegistry` | available, no registry findings; diagnostics-validateRegistry.log |
| `npm run diagnostics -- listIssues` | diagnostics-listIssues.log; historical issue state, not live incident closure |
| `npm run diagnostics -- getReleaseReadiness` | diagnostics-getReleaseReadiness.log; no release certification |
| `node FOREVER_WORKS/tools/query.mjs describe` | forever-describe.log; API/model0.1 |
| `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` | npm-ci.log; locked dependencies installed; no tracked package/lock changes |
| `npm run reliability:check` (initial) | reliability-pre-install.log/json; started before dependencies finished; incomplete; not final baseline |
| `npm test` | full-tests.log;1001 tests,904 pass,97 fail,0 skipped/canceled; exit1 |
| `npm run reliability:check` (post-install) | reliability.log + reliability-report.json; syntax/registry/issues pass, architecture fails;904 pass/97 failure events;6 registered+91 other current failures; one unseen baseline expectation; exit1 |
| `node --test tests/right-click-v3.test.mjs tests/right-click-current.test.mjs tests/right-click-backup.test.mjs tests/entry-point-reliability.test.mjs tests/boot.test.mjs tests/right-click-dispatch.test.mjs tests/simple-menu-flat.test.mjs tests/menu-reorder.test.mjs tests/worker-bootstrap-first-install.test.mjs` | focused-tests.log;125 total,109 pass,16 fail,0 skipped; exit1 |
| `node FOREVER_WORKS/tools/check-preservation.mjs` | preservation.log; valid documentary evaluator checks; does not establish source freshness |
| `node FOREVER_WORKS/tools/query.mjs validateModel` | forever-validation.log; valid=true/errors=[] |
| `python3 tests/boot-schema-conformance.py` | boot-schema.log;6 valid fixtures/3 invalid rejected |
| `python3 FOREVER_WORKS/v3-plus-one-master-audit/evidence/census.py` | source-census.json;74 non-vendor source files, hashes/literal wiring; read-only static census |
| `node FOREVER_WORKS/v3-plus-one-master-audit/evidence/reproduce.mjs` | reproduction.log + observations.json;15 path inputs, actual current projections/resolvers/UI; no assertion framework/production changes |
| `node FOREVER_WORKS/v3-plus-one-master-audit/evidence/bootstrap-observation.mjs` | bootstrap-observation.log/json; actual guarded wrapper, early/late imports fail;one toolbar listener; no core menus |
| `node FOREVER_WORKS/v3-plus-one-master-audit/evidence/authority-observation.mjs` | authority-observation.log/json; actual durable restore overwrites synthetic local-only default patch; no provisioning invoked |
| `git ls-remote origin 'refs/tags/*checkpoint*' 'refs/heads/checkpoint/*' 'refs/heads/main' 'refs/heads/release/*'` | protected-remote-refs.log; read-only protected ref capture |
| all tracked files versus baseline blobs, `git ls-files --eol build-windows.bat`, `git check-attr -a -- build-windows.bat`, `git diff --check` | preservation-files.json:1833 files, no Git tracked diff; only pre-existing checkout CRLF conversion differs from blob bytes |

Raw full-suite output preserves actual failure stacks and post-test asynchronous errors. FAILURES.md/failure-ledger.json list every observed failure event. Historical source evidence hashes and baseline registry were not refreshed. A known baseline register is not an exhaustive description of current debt.

## Reproduce safely

Install locked dependencies, then run the three audit .mjs observation scripts above from repository root. They use real current domain/UI/background source with JSDOM/VM/fake IndexedDB and synthetic identities. They write only their own audit observation files. They do not launch Chrome or use real provider credentials. These are evidence recipes, not new runtime modules or replacements for repository tests.

Re-running the census after a source change records a *new* observation; retain this pinned audit separately. Do not overwrite frozen historical hashes. `source-census.json` records line references and imports, not proof every literal reference is reachable; reviewed call ownership is in chapters01–02. The separate authority fixture models the direct writer shape and invokes actual restoration; it does not reproduce the real cloud provisioning workflow.

Installed recipe: see chapter05 and stage8 in chapter10. Use an administrator-approved environment and a version/hash-matched build; record visible native menus, one toolbar gesture, cold tree expansion, multiwindow/stale ID and worker suspension. No real-provider step is implied by local test authorization. Disposable provider setup/write/readback needs its own explicit scope.

## Concurrent branch integration

Initial normal `git push origin HEAD:refs/heads/codex/v3-parity-first-reconstruction` was rejected because the owner had added five documentation-only commits. Explicit branch fetch showed26e1d70 as remote HEAD; its difference from audited1f85185 was only166 lines added to NEED_TO_DO/11-3.md. The complete new proposal was read and compared in chapter13. `git rebase refs/remotes/origin/codex/v3-parity-first-reconstruction` preserved those commits; executable source/tests were compared and remained unchanged. No force push, tag update, source repair or test modification was performed. Source-pin/test evidence remains1f85185; the audit delivery commit includes the documentary addendum.
