# Permanent Laboratory results, summary contract v1

Implemented on `fix/lab-result-codes`, starting at `fix/lab-pairing-visibility`
`2d06b4fbf897640b445ad4703742fce693007ef4`. Python client 0.5.5.
Extension manifest remains 0.5.26; verify the Git SHA and reload the unpacked
extension, rather than using manifest version alone to identify this change.

This is an additive projection of Adaptive report 2.8.0, not a new error system.
Operation failures retain `redown.diagnostic.v1` and their original lifecycle codes.
File evidence stays in canonical coordinator receipts/checkpoints and Python source,
returned-byte and disk hashes. Python owns acceptance; `labSummary` and
`failureAnalysis` are derived from its report. Historical reports remain readable;
no migration or reinterpretation of old PASS rows is performed. New verification
flags apply only to newly executed tests. Old PASS alone never supplies new codes.

## Codes and required evidence

Each result contains `code`, `name`, `outcome`, one-sentence `explanation`, numeric
`measurements`, bounded report-relative `evidenceRefs`, `nextAction` (nullable), and
`certainty` (`confirmed`, `inferred`, `unknown`). Confirmation is within the stated
source/provider boundary, not proof that fixture data came from live Cloudflare.
Repeated conditions produce one code with actual counts, not one code per file.

| Stable code | Meaning and evidence requirement |
| --- | --- |
| LAB-001 INVENTORY_COMPLETE | Scan complete, no exclusions, all discovered eligible files hashed. Counts reference inventory. Format validity is not claimed. |
| LAB-002 SCOPE_AUTHORIZED | Selected root is in the authenticated extension's explicitly approved write scope. This verifies grant scope, not every provider permission; each provider request still checks permissions. |
| LAB-003 UPLOAD_VERIFIED | Completed upload plus correlated canonical evidence with content-sha256 receipt and matching source hash/size checkpoint. HTTP acknowledgement alone is insufficient. |
| LAB-004 READ_VERIFIED | Completed read; source size/hash match returned bytes and independently hashed temporary disk file; evidence/Atlas correlation succeeds. |
| LAB-005 METADATA_VERIFIED | Completed metadata operation and expected source size equals observed object size. Size is the required metadata field in this bounded version; MIME, timestamps and arbitrary attributes are not certified. |
| LAB-006 COVERAGE_LIMITED | Scan/plan exclusions, unsupported operations, extra untested roots or explicitly untested coverage exist. Reports give excluded-file counts by reason and the negotiated byte ceiling. |
| LAB-007 AUTH_INTERRUPTED | Original connection error or operation lifecycle code identifies interruption. It does not establish provider-side revocation or its cause. |
| LAB-008 WRITE_UNCERTAIN | A recorded upload/copy/mkdir is indeterminate, or a final report retains pending mutation intent. Certainty is unknown; never replay. An active pre-dispatch checkpoint alone is not a failed mutation. |
| LAB-009 RECOVERY_REQUIRED | Blocked work, an authentication/connection interruption or uncertain mutation requires explicit recovery. |
| LAB-010 ACCEPTANCE_INCOMPLETE | Python's required acceptance conditions remain unsatisfied, even when all selected cases pass. |

`verifiedBytes` counts successfully verified read bytes, including deliberate repeat
reads, not network/billing bytes or unique bytes. Upload-code bytes describe verified
upload payloads separately. `counts` classifies planned operation cases. `excludedFiles`
classifies files not selected for those cases; these denominators must not be added
or confused. `failureAnalysis` groups every failed, blocked, indeterminate and
untested case by outcome/operation/original safe code, with counts and representative
result indexes. Local `results` and `plan.missing` retain the full item list.

## Existing native connection, bounded presentation

`describe.methods` advertises optional `labReport`. Python sends it only when
advertised. Existing clients/other session transports do not need it. The native
relay allowlist forwards it, requiring the same completed pairing as other methods.
The existing grant handles these two read-only presentation messages:

- `{summary: <redown.lab.summary.v1>}`: at most 16 KiB, ten codes, twenty finding
  groups, four representative evidence references per code; at most eight displayed
  reports. Additional finding groups remain in the saved report with an explicit
  omitted count. One update per second at most, plus the final summary.
- `{progress: {stage, completed}}`: fixed stage enumeration and nonnegative hashed
  file count; no unknown-denominator percentage. Inventory emits at most once per
  second. No file paths, file bytes, free-form messages or credentials are displayed.

`extension/lab-report.mjs` is the strict, allowlisted presentation projection.
`clients/python/redown/lab_results.py` produces the additive report fields.
No new server, database, provider client, authentication manager or background
polling is added. The callback never grants execution or mutation permissions.
The existing engine journal remains authoritative for operations. Reporting
failure is recorded as `reportingError`; it never upgrades acceptance or retries a
mutation. Native disconnection can also stop later transport work.

Approval authorizes a client, not an arbitrary truth claim. The extension accumulates
canonical completed coordinator evidence per run UUID within the granted namespace.
It rejects claimed verified upload/read counts above those observed for that exact
run, deduplicates operation IDs, and requires observed metadata before LAB-005.
Counters and IDs are session-only, capped by the existing 100,000-execution grant;
there is no persistent second evidence database. Eight observed runs per grant is
the display budget; re-pair for more. Unknown or disconnected clients cannot submit.

The projection replaces free-form client descriptions/actions with fixed safe text,
accepts only canonical/local allowlisted failure codes and safe report-relative
references, drops unknown measurement/exclusion labels, and never copies raw payloads.
Python local/source and disk hashing and overall acceptance remain **approved-client
assertions**, explicitly labeled separately from extension coordinator evidence.
A malicious approved client cannot manufacture verified coordinator counters, but
is not cryptographically attested Python code. The extension does not attest its
local corpus. Provider fixture evidence is not live acceptance.

The current Adaptive report always has INCOMPLETE acceptance because required
coverage is missing. This v1 display contract rejects COMPLETE rather than accepting
an unsupported client success claim. A future accepted runner must explicitly extend
the versioned contract and tests; the UI never calculates acceptance from counts.

## Progress and checkpoint behavior

The sticky right sidebar and its independent scroll remain. Preflight uses animated
CSS dots while active; reduced-motion preferences show static dots. Testing uses
completed cases / planned cases, real verified bytes, bucket and blocked state.
A 100% case percentage can still have INCOMPLETE acceptance. Finalized means the
runner stopped and saved its report, not full product acceptance. A returned
`describe`/`doctor` response clears its spinner and waits for Python progress.
Disconnect/revoke displays stale-report/interruption state and clears animation.

JSON checkpoints still flush/fsync and atomically replace before mutation dispatch
and after results. Markdown is rendered only for the final report, avoiding repeated
full Markdown serialization on every checkpoint; JSON is the crash-recovery source.
Failures to write a checkpoint remain errors, never permission to dispatch without
saved intent. GUI's existing exception wrapper and first-checkpoint contract remain.

## Limits and expansion gate

All 2,221 owner files can be inventoried within current defaults (subject to actual
filesystem access). Quick samples eligible files by extension/size/name/depth, rather
than uploading every file. Comprehensive transfers every eligible file, including
duplicates. Objects above negotiated 65,536 bytes remain explicitly UNSUPPORTED;
smaller files continue. No silent truncation, streaming, multipart, destructive
operations, automatic cleanup or write resumption across new grants is added.
Directory creation has no separate success code for file-content verification.

Keep the historical uncertain namespace untouched:
`test-1-new/__redown_test__/f5bd82cf-6161-4c3d-84e1-fa087e91868f/`.
Only separately approved read-only reconciliation may inspect its uncertain writes.
Fresh write approvals mint new namespaces. Never overwrite/replay an uncertain write.

Proceed from Quick to Comprehensive only after reviewing actual Quick failures,
blockers and uncertainty, checking the reported negotiated limit, and obtaining fresh
write approval. Comprehensive is broader small-file coverage, not large-file support.
See [owner CMD runbook](RESULT_CODES_CMD.md) and
[actual verification](../../verification/lab-result-codes/RESULTS.md).
