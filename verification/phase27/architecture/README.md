# One-click architecture implementation evidence

Starting latest main: `cc86080c8142e06d2a6218f39232a4254baeacb5`.
Acceptance remains **INCOMPLETE**. No cloud mutations, deployments or policy changes
were attempted. Windows, installed Chrome/native-host and authenticated live R2
acceptance remain **NOT_TESTED**. This Linux session has Tkinter but no interactive
Windows/display environment; clipboard callback tests use a recording widget.

## Implemented and exercised

- Recursive streaming inventory, deterministic size quantiles with depth/path tie
  breaks, distinct hashes within extensions, explicit exclusions and visible limits.
  All 60 tracked files (32 extensions) selected unchanged: 316,343 bytes, minimum
  11, maximum 103,698 bytes. `fixture-inventory.json` contains every selected hash,
  byte count, original case and relative path. No media-decoding claim is made.
- Synthetic nested directory: 423 PNG / 3 PDF / 1 HEIC selects 5 / 3 / 1. A separate
  75-extension directory selects 75 files, proving no overall sixty-file cap.
  Tests cover duplicate bytes, links outside root, cycles, zero bytes, case
  collisions, limits, cancellation, Unicode, serialization and deterministic reruns.
- GUI picker/preview, authorized bucket selection, run/cancel, progress, exact copy
  and JSON/Markdown save; existing advanced runner/conformance retained. Windows
  layout, actual OS clipboard lifetime and native-host behavior require live testing.
- Canonical scoped discovery/list/pagination/prefix/metadata/read, source/download
  SHA-256, receipt/operation/Atlas correlation, invalid and unauthorized inputs.
  Native integration launches actual Python/helper processes with an injected HTTP
  provider through the real coordinator and adapter. It verifies source-readback
  PASS and no mutations. Configured providerEvidence is **not live R2 proof**.
- Actual provider adapter rejects oversized or invalid declared lengths before
  reading response bytes; unknown-length bodies remain bounded by the existing cap.
- Stable schema 1.0.0, six statuses, hashed scope/job IDs, partial CLI checkpoints,
  honest nonzero exit codes and always INCOMPLETE architecture acceptance.

## Commands and outcomes

| Command | Result |
| --- | --- |
| `PYTHONPATH=clients/python python -m unittest discover -s clients/python/tests -v` | 26 pass |
| `npm run lab:test` | 11 pass; independent report schema validates six statuses and rejects four controls |
| `npm run providers:test` | 15 pass |
| `npm run file:verify` | 30 unit tests and 45 schema fixtures pass; preservation fails existing engine source drift |
| `npm run aac:test` | 18 pass with required Python format dependencies installed |
| `npm run resources:schema` | 78 independent schema cases, 3 JS tests pass |
| `npm run check`, Python compileall, `git diff --check` | pass |
| `node FOREVER_WORKS/tools/check-preservation.mjs` | reference/evaluator preservation pass |
| `python FOREVER_WORKS/tools/validate.py` | historical source drift remains; no frozen hashes refreshed |
| `npm run reliability:check` | 460 pass, 9 fail; syntax/architecture/API-registry/issue-inventory stages pass |
| `python -m redown.lab scan --directory test-fixtures/architecture-samples --report …` | 0; complete local inventory |
| `python -m redown.lab architecture --offline --directory test-fixtures/architecture-samples --report …` | 2; all cloud-dependent cases blocked/unsupported/untested, zero cloud successes |

The nine full-suite failures are seven known historical assertions plus the two
issue-inventory/provisioning failures already documented before this assignment.
An untouched `git archive` of starting main reproduced both additional failures,
the same file-preservation engine drift, and historical Forever source validation
drift. Captured baseline and current logs are retained here. No worktree, weakened
assertion, baseline reset or frozen hash refresh was used. The suite is not green.

An initial AAC subset had 17 pass / 1 failure (`independent invalid date`) because
optional Python format validation dependencies were absent. Installing the required
`jsonschema[format]==4.26.0` resolved it without code/assertion changes; this failed
attempt remains recorded in `status.json`.

Read limits remain 64 KiB and 100 executions per approved session. Large files are
retained in the inventory and reported unsupported rather than silently omitted.
Objects are read only at selected original relative keys; missing objects cannot
establish source integrity. Mutation, range, versioning, overwrite safety and durable
recovery receive no passing credit. Fault/expiry/revoke/media cases are explicitly
untested in each architecture report; separate security fixtures are separate proof.
Default retains all remote data; no cleanup is performed or needed.

Reproduce GUI/CLI with [the Windows runbook](../../../docs/phase27/ONE_CLICK_RUNBOOK.md).
