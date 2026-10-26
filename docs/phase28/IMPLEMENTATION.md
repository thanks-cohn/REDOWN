# Implementation and review boundary

Base main: `bea19528dbdad5827edaf305789b6b190841cfc4` (the preserved annotated
`v0.4.4-python-lab-readonly` tag peels to the same commit).

## Changes

The existing embedded `WORKER_SOURCE` gains one authenticated `lab-create` branch
and a capabilities bit. It bounds bytes before `STORAGE.put` and always uses
`onlyIf: If-None-Match: *`. No parallel filesystem coordinator, new Worker service,
cloud deployment, Python provider client, S3 credentials or OAuth scope change is
introduced. The legacy upload/Explorer routes retain their original behavior.

The extension adapter accepts a trusted conditional-create transport while retaining
OAuth reads. `lab-worker.mjs` resolves the saved profile inside REDOWN and verifies
fresh OAuth script settings (`STORAGE` bucket and jurisdiction) and the account's
workers.dev subdomain before capabilities negotiation. Unknown Workers fail before
mutation. Grant activity is checked again after preflight, immediately before
creation. A write response is never automatically replayed.

The browser approval defaults to read-only; a separate unchecked control permits
writes only in the existing four laboratory buckets and an extension-generated UUID
prefix. Every source/destination passes the same scoped facade and coordinator
checks. No caller selects the grant prefix. Revocation, OAuth session changes,
expiry, cross-account/bucket/prefix attempts, and missing Worker setup fail closed.
Delete/move/rename are never authorized. Conditional create is distinct from R2's
unsupported revision-conditioned deletion.

The scoped facade's explicit operation budget ceiling is extended from 100 to
100,000 (default unchanged); write grants select the higher budget. Payload-bearing
terminal jobs are kept in a small ring. Idempotency hashes survive pruning; the
coordinator now rejects expired job history rather than dereferencing or replaying
it. Existing coordinator verification/receipts/Atlas remain authoritative. Python
persists completed evidence outside the volatile session. Nothing advertises durable
cloud resume.

Python adds an adaptive inventory mode to the existing scanner, preserving its old
sampling default for read-only architecture reports. The new runner inventories all
files within explicit user limits; comprehensive tests do not deduplicate or cap by
extension. It validates source hashes again before upload, creates disjoint upload
and copy paths, downloads through the existing SDK to an exclusive temporary file,
and checks both disk SHA-256 and returned bytes. It checks evidence/Atlas operation
ID correlation, checkpoints JSON and Markdown atomically, and records failures,
unsupported files, cancellation and incomplete coverage. Source files are untouched.

Preflight and profile controls are in the existing Tk GUI, alongside its old
connection, read-only conformance, advanced CLI and export controls. The primary
button runs the whole bounded plan; ordinary users enter no JSON. The existing
native host and Windows registration are reused.

## Self-review findings corrected before delivery

- Rejected an OAuth HEAD-then-unconditional-PUT implementation: documented REST PUT
  lacks conditional-create guarantees. Existing binding conditional creation is used.
- Added fresh provider settings/account-host verification to reject a saved Worker
  bound to an unrelated bucket before writing.
- Added a revocation check between asynchronous Worker preflight and mutation.
- Separated `uploads/` and `copies/` paths to avoid collisions with user filenames.
- Retained idempotency tombstones after bounded journal eviction; expired operations
  fail explicitly rather than silently replaying.
- Kept GUI checkpoint messages small; copy/export reads the atomically persisted
  report while a run is active. Requested resource settings and effective serialized
  transport behavior are both visible.
- Verified all eligible duplicate-content files are attempted in comprehensive mode.
- Updated only the current Explorer source map for changed background source hashes
  and shifted source anchors. Frozen historical hashes/evidence were not refreshed.

## Not implemented / acceptance remaining

This is deliberately a **small-file write milestone**, not completion of every
Phase 2.8 requirement. See README for the 64 KiB limit, serialized transport, limited
Stress mode, resource-target limitations, missing corruption decoding, missing
hosted diagnostic packs, unsupported destructive operations and no automatic cleanup.
No local authenticated Chrome session is available here. A no-display Tcl error
prevents actual desktop GUI startup. Windows registration contracts are mocked;
installed Windows/native Chrome/R2 proof must come from the runbook's manual test.

The new path is reviewed against source and fixtures; this is not independent human
review, full AAC certification, a release gate waiver or live acceptance. Exact local
results and baseline comparison are retained in `verification/phase28`.
