# Comprehensive R2 Laboratory: owner incident and recovery gate (2026-10-26)

**Evidence source:** owner-provided full local `REDOWN-Comprehensive-2451-15367.json` (schema 2.8.0; 11 MB); **retain raw report privately**, not in Git due to local paths, filenames, object keys, large checkpoint content and possibly sensitive diagnostics. This record does not contain credentials or raw object identities.

- **Run ID:** `c18390bb-a468-4fa1-bd27-8dac458f71d4`
- **Exact commit embedded by Python report:** `f60c189bf721ae52a615dd7a760f98a5fb132388` (`repositoryDirty: false`)
- **Client/platform:** 0.5.5 / Windows 11; `test-1-new`; Comprehensive, Balanced.
- **Inventory:** 2,221 files, 157,571,693 bytes, all hashed. 192 over 65,536-byte transfer limit excluded. Plan: 6,292 cases.
- **Final saved outcome:** `INCOMPLETE`, `finished:false`, `blocked:true`; coverage `PASS 1737 / FAIL 28 / INDETERMINATE 1 / NOT_TESTED 2422`. Completed/assigned checkpoint count **4,188** includes cases subsequently marked NOT_TESTED; **1,765** returned ordinary PASS/FAIL results before interruption, and **one** dispatched upload is indeterminate. Therefore don't display 4,188 as verified completed operations.
- **Independent file verification:** 569 uploads, 569 reads and 569 metadata checks; 3,720,944 verified upload/read bytes.
- **28 copy failures:** `SOURCE_CHANGED`, with representative references `results/4`, `results/66`, `results/128`. Copy source/revision/pinning and error classification need reproduction. Do **not** assume original local source changed without evidence.
- **One uncertain upload:** `OAUTH_REFRESH_UNAVAILABLE`, `results/1765`; final report records `reportingError: OAUTH_REFRESH_UNAVAILABLE`. Preserve the private full report's operation key, checkpoint and intent. **Do not automatically replay** or overwrite; read-only reconcile only after fresh authorization.
- **Skipped after interruption:** 78 copies, 781 metadata, 782 reads, 781 uploads explicitly `CANCELLED_OR_PRIOR_UNCERTAINTY`. These add to 2,422 NOT_TESTED. Transport success never counts as SHA-256 verification.
- **Recovery:** `retryRecovery.automaticWriteRetries: 0`, `resume: READ_ONLY_RECONCILIATION`; fresh namespace required for any later mutation continuation. Never touch historical uncertain namespace without separately approved read-only reconciliation.

## OAuth cadence is not a guarantee

In `extension/lab-session.mjs`, the Laboratory describes OAuth renewal with `intervalSeconds:2400` (40 min). The method `renewAuthorization` is **rate-limited** by `nextRenewal = clock() + 40 * 60000` and invokes an injected provider renewal function; this is **not proof that it schedules an autonomous refresh**. The extension may also refresh credentials per API request when available. A refresh credential can be absent or rejected; a cadence cannot synthesize a missing credential. Reported `OAUTH_REFRESH_UNAVAILABLE` does not alone prove why credentials were absent, and it must not be replaced with a successful result or bypass authorization.

**Investigation questions:** Did a 40-minute renewal request actually fire? Does Python schedule it from `describe.oauthRenewal`? Was it rejected by a 40-minute rate limit, absent refresh token, OAuth connection reinitialization, or session-grant change? What were provider token expiry, renewal attempt/result and grant expiry **without exposing secrets**? Does an OAuth error cause a bounded final report/checkpoint and clear GUI status?

## Next Work repair acceptance

1. Reproduce the 28 copy `SOURCE_CHANGED` failures against a deterministic adapter with expected source identity/version, including a negative test for truly changed objects; fix only confirmed mismatch.
2. Trace per-request OAuth refresh vs scheduled 40-minute renewal. Handle missing refresh credential via actionable reconnect (not unauthorized persistence or retry). Preserve session isolation/approval scope; do not weaken expiry or require dashboard activity.
3. Prevent indefinite Python waiting after disconnection: bounded timeout/cancellation, fsynced checkpoint, accurate final counts and GUI terminal state. Verify report-to-extension reconciliation when `labReport` fails.
4. Before any write retest, reconcile the single indeterminate destination read-only with fresh owner-approved access; do not reuse historic test namespace.
5. Add targeted tests for copy, renewal credential absent/rejected, connection revoked during reporting and correct recovery classifications. Preserve Quick 926/926 as historical owner-observed baseline, not a claim about repaired HEAD.
6. Re-run Comprehensive with fresh permission only after repairs, then address >64 KiB transfer. Do not deploy Worker changes or modify provider scopes absent authorization.

**Reference:** [Quick baseline](QUICK-R2-OWNER-BASELINE-2026-10-26.md), [tested HEADs](TESTED-HEADS-2026-10-26.md), [release milestones](../roadmap/LATEST-RELEASE-MILESTONES.md).
