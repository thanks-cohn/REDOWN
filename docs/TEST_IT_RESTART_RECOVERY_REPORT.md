# Test It restart recovery repair

Scope: `beta-explorer`, based on `2d0809e546715e53882b2776154828d41dbf70a9`.

## Cause and repair

Restart called strict Retry reconciliation. A missing source, changed tracked copy,
present destination, failed read or unfinished deletion threw before a fresh run
could be persisted. The participant remained stuck on an old pending action.

Restart now excludes concurrent mutations, reports genuinely active operations
instead of clearing them, drains existing saves, and attempts reconciliation in
read-only mode. It retains the exact previous session, including pending entries,
destinations, receipts, results and ownership, in `betaExplorerTestItRecovery`.
Reconciliation failures are recorded as `needs-review`, never successful writes
or confirmed deletions. No uncertain operation is retried.

A single Chrome storage set saves the recovery history, combined ownership ledger
and fresh active session together. Only after that promise resolves does the
in-memory session change. Rejected persistence leaves the old session intact and
provides storage restoration/export/retry guidance. The fresh run starts at index
zero with a new UUID and empty ownership, approvals and results. The reopened
guide initializes its sixty NOT_TESTED exercise records.

Ordinary saves and browser reload preserve the separate recovery history. Export
JSON downloads the active report and, when present, a separate recovery report.
Old records never become active exercise results. Archived object and pending
destination identities are reserved against new destructive operations or reuse
as destinations, including apparently absent destinations where a delayed remote
operation could still materialize. Reading an old object as a new Copy source
requires fresh identity verification and explicit source approval. It never
confers destructive ownership of that source.

The universal file API, Legacy Explorer, exercise definitions, gripper, layout,
styles and drop-up menu implementation are unchanged. Restart uses inspect/stat
only and dispatches no cloud mutations.

## Validation

`node --test tests/test-it-session.test.mjs tests/test-it-copy.test.mjs tests/test-it-tools.test.mjs`
passed **38/38**, with no skips. Coverage includes completed exercises, Copy
clipboard before Paste, verified Paste, failed/uncertain Copy, interrupted
Rename/Move/Delete, failed destination stat, reload with pending operations,
repeated restart/reload/save, rejected persistence followed by successful retry,
mutation exclusion during restart, active-operation refusal, preservation of exact
recovery and ownership, reserved destinations, blocked old-object deletion,
unchanged remote object maps/call counts, fresh UI instructions/results, separate
JSON exports and the ordinary Copy/Paste/verification workflow. Existing gripper
and menu fixtures pass unchanged.

`npm run reliability:check`: **478 passed, 10 failed, zero skipped**.
Syntax, API registry and issue inventory stages pass. Architecture freshness
fails. The untouched base was also executed: **464 passed, the same 10 failed,
zero skipped**. The failing tests are the existing two agent catalog checks, two
debug corpus checks, Explorer architecture fixture, issue-label expectation,
Nested drag-handle expectation, provisioning editor fixture, and two semantic
catalog checks. The reliability policy labels three of these as new relative to
its older baseline; direct execution of this task's untouched base establishes
that all ten predate this patch. Historical evidence hashes were not refreshed.
`git diff --check` passes. Diagnostics start guide, registry validation, issue
inventory, release readiness and Forever describe were also executed.

## Remaining boundaries

These are local in-memory provider and jsdom tests, not installed Chrome or live
Cloudflare proof. Genuine operations in flight require the participant to wait
and choose Restart again. Uncertain provider outcomes remain uncertain and may
need manual review; no automatic old-session cleanup or ownership adoption is
provided. Recovery history is intentionally retained without pruning; browser
storage quota failure blocks restart safely. Exporting both reports can require
Chrome permission for multiple downloads. Recovery remains saved even if a
download is blocked. Concurrent independent Explorer tabs are not coordinated by
this session-local lock, as before this repair.
