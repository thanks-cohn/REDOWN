# Fix report and handoff — Windows OAuth / History investigation

November 11, 2026. Branch: `investigate/windows-oauth-history-2026-11-11`.
Main `237356b` and the owner's uploaded evidence commit `69b6207` are preserved. Delivery is a commit/push to this investigation branch only. **No merge or deployment.**

## Changes delivered

| Component | Minimal repair / observed reason |
| --- | --- |
| `cloudflare-auth.js` | Persist a validated token-exchange result before separate account connectivity checks. Keep account denial/unavailability/rejection distinct. Preserve PKCE, exact callback/tab matching, cross-context claim locks, explicit navigation and existing scopes. Add bounded session checkpoints and typed token-write failure; optional diagnostic-write failure is nonfatal. |
| `transfer-counter.js` | Keep the existing provider-proof validator authoritative. Annotate local accounting errors with safe operation/exception names and whether the remote receipt is already verified. Use stable delivery-based IDs for **new** verified archive rows; replay cannot create a second new row for one receipt. Existing atomic receipt/daily/lifetime updates and deduplication remain. |
| `background.js` | Preserve verified completion when accounting fails; don't create a false failed-upload entry or “failed” notification. Cloudflare's provider-specific pending-receipt map is reconciled at worker startup and before its next save, under a lock. Replay calls only the existing local recorder, never ingestion or remote verification. A prior receipt's error cannot make the next attempt look verified. |
| `onedrive-provider.js` | A failed pending-receipt write cannot skip the independent recorder. Preserve completed/verified state and expose accounting pending; keep the existing receipt replay and admission release. |
| `history-archive.js` | Close/invalidate cached IDB connections on version change/abnormal close or failed transaction creation. Close abandoned late open results. Keep database name/version/schema and all records. |
| Existing recorder, Queue, Shelf and bundle | Completed-with-accounting-pending remains verified, amber/attention-visible and inspectable. Reconciliation updates the same attempt without duplicating its terminal. Separate historical “last recorded save verified” from current attempt status. Valid saved credentials with unavailable account access show **Check access**, whose action opens access review, rather than another OAuth request. |
| Existing offline exporter | Whitelist safe storage causes, last session OAuth checkpoints, last observed account result and browser quota estimates. No worker activation, remote probe, permission request or raw storage dump. No code/verifier/token/URL/error text exported. OS free bytes remain unavailable. |

Google/Dropbox upload state machines and source/provider APIs are unchanged. TRUE REMOTE Cloudflare ingestion is unchanged. Saved destinations, settings, credentials and prior History are retained. No counter advances from diagnostic stages or animations. No historical error record is silently rewritten into success.

## Verification

**Final results:** 112 focused tests passed; all 17 new defect tests passed. Against the exact baseline, those 17 tests had 16 failures and one pass. Full regression: **1,076 passes / 111 failures**, compared with 1,058 / 111 before; no added or removed failing names. The full gate remains failed. Chromium page-fixture rendering passed 42 assertions.

The final machine-readable [validation receipt](docs/verification/windows-oauth-history-2026-11-11/validation.json) is authoritative for counts and unchanged failure names. Evidence includes:

- Exact byte hashes and before/after correlation for all three real Windows ZIPs, separate from simulated fixtures.
- New tests run against the exact request baseline using read-only `git show`, without resetting the checkout. Negative tests demonstrate token loss, local accounting misclassification, duplicate archival and connection lifecycle/diagnostic gaps. After repair, all new tests pass.
- Extended focused tests covering these defects plus existing P0 lifecycle/restart recovery, repeated 1/2/3/5/10/20/21 saves, queue limits, privacy/ZIP bounds, BOOT, native menu, verified counters and Shelf feedback. These are deterministic fixtures, not genuine provider acceptance.
- Real Chromium rendering of actual Shelf files with mocked Chrome/provider APIs: 42 assertions, themes/widths, navigation/focus/scroll, failure signals, and normal/worker-unavailable offline ZIP downloads.
- Full reliability runner, syntax/import closure, API registry, issue inventory, BOOT/gateway/Explorer/runtime schema checks and audit packaging. The stale architecture map, stale saved regression expectation and existing 111 failing names remain visible. An intermediate concurrent run also exposed a DND timing failure; it is preserved as an intermediate result rather than hidden.
- Installed-extension attempt: **BLOCKED**, `CDP_-32600: Loading of unpacked extensions is disabled by the administrator.`
- Physical low-space Windows matrix: **BLOCKED**. Real Linux origin-quota-fault induction also remains **BLOCKED**; the attempted override did not cause a failed write. Controlled quota/IDB failures remain explicitly simulated.

A first schema command used a nonexistent filename; its failure log is retained. The corrected Explorer schema command passed. No baseline assertions, historical hashes or failure ratchet were refreshed. Shelf's relevant account-state assertions were intentionally updated to the new **Check access** behavior, with a new action test; unrelated failing tests were left in place.

## Why local replay does not upload twice

Google/Dropbox retain completed owner jobs for existing receipt recovery. OneDrive retains its existing pending verified receipt. Cloudflare retains only its already verified receipt, keyed by its stable delivery ID, and replays `recordTransfer()` under `redown-cloudflare-receipts`. None of these receipt paths calls ingestion/upload. The existing history lock and provider receipt-ID ledger reject duplicate increments. New archive IDs upsert the same verified receipt on a retry after a failed local commit.

The tests inject a post-verification local-commit failure, recover local storage, replay twice, and require one ingestion, one archive row, one History completion and one provider/daily/lifetime increment. Unverified/uncertain proof cannot take this route. These tests prove the local code path, not the existence of an owner's remote object.

## Remaining limitations and safe continuation

The original Windows OAuth/storage causes remain unresolved. Retained owner attempts do not prove verified saves were demoted on that machine; the source defect is separately reproduced. No physical disk threshold, OAuth callback behavior, account permission or real remote-object result is inferred from the fixture results.

If both local receipt retention and accounting storage fail, durable recovery cannot be guaranteed across a crash. An independently committed archive can preserve metadata, but no automatic generic archive scan/re-upload engine was added. Pending local accounting can prevent further admission through an existing provider owner; it remains visible rather than being cleared by destroying state. An IDB-only archive failure still uses the existing recent-window fallback; it does not promise automatic repair of every missing older archive entry. Stable IDs apply to future rows and do not erase duplicate historical rows created by earlier versions.

Next maintainer: use [ROOT_CAUSE_OAUTH_HISTORY.md](ROOT_CAUSE_OAUTH_HISTORY.md), the comparison/validation receipts and preserved investigation logs. In an administrator-approved Windows Chrome session, capture the first actual failed checkpoint and storage exception, verify disposable provider objects independently, test restart/reconciliation and repeat saves. Preserve the browser profile and existing destinations. Do not reset storage, replace OAuth or expand scopes based on the current missing evidence.

## Reproduction commands

```sh
node scripts/compare-owner-windows.mjs work/windows-oauth-history/owner-comparison.json
node --test tests/windows-oauth-history.test.mjs
# Expected to fail against the original source:
REDOWN_WINDOWS_BASELINE=1 node --test tests/windows-oauth-history.test.mjs
npm run reliability:check
node scripts/visible-queue-browser.mjs work/windows-oauth-history/browser
node scripts/windows-storage-browser.mjs work/windows-oauth-history/storage.json
node scripts/installed-chrome.mjs extension work/windows-oauth-history/installed.json
python3 scripts/package_chrome_store.py --audit-only
```

The last three browser/storage commands are not interchangeable: page-fixture rendering can pass while quota induction and installed-extension acceptance remain blocked. Preserve unsuccessful results. Full logs, sample fixture ZIPs and intermediate results are in [WORKING_EVIDENCE.tar.gz](docs/verification/windows-oauth-history-2026-11-11/WORKING_EVIDENCE.tar.gz), with a hash manifest. Original owner ZIPs are already committed separately and are not replaced by samples.
