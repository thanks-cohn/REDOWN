# BUG-020 — Remote save normalizes selected folder paths — attempt01

Recorded: 2026-10-23T00:55:30+00:00 (UTC). Baseline remote main: `3f595320fd8f0c305d3174196fff300a41389dd4`.
Authority: source-confirmed defect found while implementing optional popup folder levels;
not a new user-observed runtime incident or an explanation of the separate Copy404 case.

Historical Worker remote ingestion uses cleanPrefix, which trims segments, removes empty
segments and replaces Unicode/reserved characters. Selecting a real existing folder could
therefore write under a different key prefix; background detects the mismatch only after
writing. Exact folder selection requires avoiding this normalization before the write.

The embedded Worker now advertises exactIngestPaths and supports the additive exactFolder
request flag. Validation preserves the exact folder string while retaining key length/NUL
and dot-segment checks. Background checks capability before sending a path an older Worker
would alter; unsupported Workers request explicit Repair before any upload. Standard legacy
ASCII paths remain compatible. No live Worker was deployed or customer object modified here.

Actual embedded Worker/in-memory R2 regression preserves Unicode, reserved characters and
repeated separators. Background regression rejects an incapable Worker before any write.
Popup message tests preserve explicit root and exact deep prefix while old category clients
retain their route. See docs/popup/FOLDER_DROPDOWNS.md and verification.json.

Status: source/automated correction implemented in0.5.18; installed unusual-path delivery and
Repair acceptance remain unverified. This does not claim recovery of previously misplaced data.
