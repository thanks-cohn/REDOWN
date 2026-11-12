# Review handoff — cloud recovery and incident preservation

**The original disappearance/unavailable-Options cause remains unresolved. This is not a crash-fix certification.**

Completed:

- Kept GO TO independent of extension authorization and added accessible reconnect icons for Google Drive, OneDrive and Dropbox, with Options/Popup fallback.
- Reused existing official auth flows; verified Google authorization before native admission, coalesced concurrent checks, preserved specific codes/phases and original account/connection bindings.
- Classified Graph 503/network as temporary unavailability with bounded backoff; preserved credentials and uncertain jobs. Existing explicit Dropbox receipt reconciliation remains awaitable and never repeats an upload.
- Preserved legacy 16/16 incident envelopes, added append-only fault history with a bounded reference index, stopped routine epoch pinning and separated active archive stalls from historical incomplete capture.
- Added complete paginated incident export, privacy-safe frame evidence and focused/full regression comparison. Original CAPLESS backend, cloud upload verifiers, History/counters, permissions and seven-file bundle builders remain preserved.

Validation and blockers:

- Focused regression and real Chromium UI/IndexedDB fixture results are recorded in the [full report](P0_AUTH_RECONNECT_CRASH_FOLLOWUP_2026-11-12.md) and [evidence index](verification/p0-auth-reconnect-2026-11-12/README.md).
- Full regression is **not green**; baseline failures and the architecture gate remain visible. No newly failing file/test names were found relative to the untouched starting main; already-failing assertions can mask other differences.
- Installed Windows Chrome/live OAuth/provider acceptance remains blocked/unverified. No real cloud writes, deployment, store publication, reset or RAW publication occurred.
- Incident schema migration is additive but older v1 incident readers cannot open the v2 DB after rollback. Keep reviewed local exports; never erase it to downgrade. Browser quota and hard termination still limit capture.

The working branch starts from latest main at f9f6d0d and is prepared for review. **Do not merge or deploy from this handoff.** Windows verification steps and the remaining root-cause evidence needed are in the report.
