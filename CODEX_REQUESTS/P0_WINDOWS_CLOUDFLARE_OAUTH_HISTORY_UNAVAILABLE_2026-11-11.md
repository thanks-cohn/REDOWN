# P0 — Investigate installed-Windows Cloudflare OAuth and multi-provider HISTORY_UNAVAILABLE

**Status:** OPEN. Root cause not established. REDOWN main baseline `237356b`, extension 0.5.27, Chrome 156 / Windows 11.

## Owner observations
- Four Cloudflare authorizations completed in the browser, but REDOWN remained at LOGIN!/Check sign-in and "Finish Cloudflare sign-in in the window that opens."
- Google Drive: fetching / PROVIDER_FAILED; Dropbox and OneDrive: blocked / HISTORY_UNAVAILABLE; Cloudflare: blocked / HISTORY_UNAVAILABLE.
- Cards may still display "save verified": distinguish past verified saves from current attempt outcomes. Do not demote real verified remote success because local History fails.
- Windows C: reported 415,735,808 bytes free initially, later 705,335,296 bytes; installed RAM 4,101,320,704 bytes, pagefile 5,399,265,280 bytes. Low disk space is a hypothesis, **not a proven cause**, and even 700 MB should ordinarily be adequate for small auth/History writes.

## Owner diagnostic ZIPs
Keep three **real owner exports** separate from the synthetic/sample ZIPs already in `docs/verification/visible-queue-2026-11-11/`.
Required evidence folder: `docs/verification/owner-windows-2026-11-11/`
Expected files:
- `REDOWN-BEFORE.zip` — sha256 `f62939ef20e4931ed7584af243ff67d82faa91448f6d7d4a373c817a7323c26b`
- `REDOWN-DIAGNOSTIC-2026-11-11.zip` — sha256 `4e7b0d3263cfa2fec11302051321f7c8c6f8bdde572b98b096cd9fe1adfbc6eb`
- `REDOWN-DIAGNOSTIC-2026-11-11(1).zip` — sha256 `6ad9ffcd49c220a32c8efce0810fffe1f4c6361b767fc7bea6eaabab8b2222f0`

**Do not claim these files have been committed until they actually appear.** The owner authorized uploading these exports. Verify the byte hashes, inspect their privacy metadata, then use them for a before/after correlation. Never conflate baseline fake fixture ZIPs with these real captures.

## First findings to verify from owner exports
Earlier analysis of the locally uploaded exports found successful retained Google/Dropbox/OneDrive receipts, some blocked HISTORY_UNAVAILABLE records, and later Cloudflare `credentialPresent=true` with `expired=true`, `reconnectRequired=true`, `refreshAvailable=false`. Cloudflare Worker HTTP 200 observations must not be treated as independently verified R2 saves. Work directly from ZIP JSON, not this summary; retention is bounded and a missing record is not proof an event did not happen.

## Codex tasks
1. **Cloudflare OAuth:** trace LOGIN click -> popup -> callback delivery -> state/PKCE -> code exchange -> credential persist -> account verify -> Worker readiness -> UI projection. Identify first failed transition and whether the failed callback is lost, token is expired/rejected, scopes insufficient, storage failed, or UI stale. Never log secrets/tokens/full URLs.
2. **History persistence:** locate exact cause of `HISTORY_UNAVAILABLE` (exception name, IDB/storage.local error, quota, transaction abort, schema, archival lock, promise race). Determine how failure propagates to Google/Dropbox/OneDrive/Cloudflare. A verified cloud save must remain verified; pending receipt must be reconciled safely, not resent.
3. **Low-space matrix:** reproduce at ample free space, ~700 MB, ~400 MB and simulated quota/IDB failures; assess whether separate Chrome quota can fail despite OS free bytes. Preserve browser profile data.
4. **Queue and UI consistency:** align most recent attempt indicator with historical verified-save label; no false success, no false permanent failure, no confusing LOGIN! while authenticated.
5. **API-first trace:** instrument stable redacted causal checkpoint IDs across login, auth state, save admission, remote verify, History, counters and cards. Identify common/shared root before making changes. Add focused regression reproducer and negative tests.
6. **Validation:** use owner ZIP evidence, exact baseline reproduction, new deterministic fixtures, installed Windows Chrome if available, one Cloudflare OAuth and genuine test saves across providers, independent remote object verification. Keep existing 111 failing names and reliability gate visible; do not redefine expected failures as green.
7. Produce `ROOT_CAUSE_OAUTH_HISTORY.md`, `FIX_REPORT_OAUTH_HISTORY.md` and evidence receipts. Isolate changes in branch; no credential resets, bucket deletion, History wiping, OAuth scope expansion, Chrome policy bypass, deployment or publication.

**Priority:** root cause and safe minimal repair, not new feature development.