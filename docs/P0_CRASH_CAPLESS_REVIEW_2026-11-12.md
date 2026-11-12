# Review: P0 crash diagnostics and confirmed CAPLESS recording

**Root cause of REDOWN becoming unavailable until Reload remains unresolved. This is not a crash-fix certification.**

Completed:

- Compared both owner ZIPs; retained the SECURE original and redacted/hash evidence, keeping private RAW out of public Git.
- Reproduced and repaired two late-storage serialization defects and redundant per-event health writes.
- Added small pre-import checkpoints and explicitly retained incident envelopes; recording failures remain visible.
- Added CAPLESS LOGGING, OFF by default, with explicit confirmation, append-only disk-backed JSONL segments, recovery, privacy modes and complete streamed/multipart export. Existing History, credentials, destinations, original diagnostic buttons and seven-file bundle remain preserved.
- Passed 93 focused tests, 950 simulated native saves and 100k synthetic-event stress in Node and real Linux Chromium. Focused syntax, import closure and source fingerprint checks passed.

Incomplete / blocked:

- Installed extension acceptance is administrator-blocked here; Chromium tests use mocked extension APIs and do not prove Windows or live-provider behavior.
- Actual disappearance cause, Windows process/GPU/low-disk contribution, unavailable-Options acceptance and real provider saves remain unverified.
- The repository reliability wrapper started an unrequested full run; it was stopped and its incomplete failures were preserved. A separate old OAuth mock-import failure is recorded. No full-suite pass is claimed.
- Earlier pruned evidence cannot be recovered. Finite browser quota and hard termination can still interrupt recording; RAW is private plaintext in the profile.

[Full investigation, exact evidence, tests, privacy limits and manual Windows acceptance](P0_CRASH_CAPLESS_REPORT_2026-11-12.md).

The owner subsequently requested pushing the completed work to main. The implementation branch is preserved. Integration does not certify the P0 disappearance fixed. No store publication, provider deployment, storage reset or live cloud write is part of this work.
