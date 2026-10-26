# Adaptive Laboratory: operation acknowledgements were not file results

Status: source repairs and local deterministic/native-process evidence. Owner
Windows/Chrome and live R2 acceptance remain NOT TESTED. No merge authorization.
Start: `fix/lab-pairing-visibility` at `2d06b4f`.

## Observed gap and confirmed source findings

The extension retained only descriptions of command responses, while Python owned
the actual inventory, test results, hashes and acceptance. Transport PASS labels
could be mistaken for verified files. The runner accepted completed metadata jobs
without comparing expected values, and counted completed upload jobs without
requiring their exported content-checkpoint evidence. These are source-confirmed
classification weaknesses, not proof that the owner's previous provider transfer
corrupted data. Previous 183 PASS / 1 BLOCKED / 1 INDETERMINATE / 741 NOT_TESTED
observations remain historical and are not reclassified without their evidence.

## Repair and ownership

[Permanent code contract](../../docs/phase28/RESULT_CODES.md) defines LAB-001 through
LAB-010 with evidence gates and safe references. The existing Adaptive report gains
`labSummary` and grouped `failureAnalysis`; raw diagnostic codes are preserved.
The existing paired native relay and revocable session add optional, bounded
`labReport` presentation messages. Python owns acceptance; the extension checks
claimed verified counts/bytes against coordinator observations for the same run
and labels approved-client assertions separately. No new telemetry service,
authentication manager, provider engine or write authority is introduced.

Metadata checks source size. Upload codes require matching source hash/size in a
correlated canonical content receipt/checkpoint. Read codes require source, returned
bytes and disk hash agreement. An available command response is RESPONSE_RECEIVED,
not a file PASS. UI presents aggregate codes, outcomes, exact exclusion reasons,
grouped blockers and next actions above expandable operation responses. Copy exports
only the strict safe projection. Progress uses real cases/bytes or indeterminate
CSS dots, without polling or fabricated duration; reduced motion is supported.

## Preservation obligations and open gates

JSON intent checkpoints remain fsynced before mutation; full Markdown rendering
moves to finalization to avoid repeated report work. No uncertain write is replayed.
New write grants retain fresh isolated namespaces. The protected historical prefix
`test-1-new/__redown_test__/f5bd82cf-6161-4c3d-84e1-fa087e91868f/`
was neither read nor written in implementation/testing.

The 65,536-byte conditional-create/native transport limit, Quick sampling, incomplete
coverage, missing destructive operations and no automatic write continuation remain
explicit. No Worker was deployed or repaired. Pairing/auth recovery security tests
are regressions, not proof that the original dashboard/session incident is closed.
See [actual verification](../../verification/lab-result-codes/RESULTS.md) and
[CMD reproduction](../../docs/phase28/RESULT_CODES_CMD.md).
