# Right-click save reliability patch

**Result: six demonstrated source defects repaired; owner P0 and live acceptance remain OPEN/BLOCKED.** Baseline: `44ed072b974aabdfe62c6cc28ba2f561f08ec004`. See [ROOT_CAUSE_REPORT.md](ROOT_CAUSE_REPORT.md) for mechanisms, line references and the distinction between source reproduction and the unresolved installed-browser incident.

## Changes

- `extension/google-drive-provider.js`: remove the stale persisted-connecting silent return, retain the existing in-worker OAuth promise deduplication, record preflight/admission failures in History, carry the attempt correlation ID through the existing job and receipt.
- `extension/onedrive-provider.js`: put the initial transfer-state write inside guaranteed cleanup; release busy/controller state even when receipt persistence fails; observe rejected background promises; distinguish live OAuth from stale connecting state; revalidate durable auth instead of silently discarding the click. Pending login, sign-in-only and busy outcomes are explicit blocked receipts. Reconcile the existing pending verified receipt before accepting another upload, so a new completion does not overwrite it.
- `extension/dropbox-provider.js`: drain newly admitted jobs instead of a fixed snapshot, with each ID attempted at most once per pump; checkpoint terminal completion before calling History; record full-queue and pending-login rejections. Limit OAuth recovery to authentication failures rather than swallowing admission/accounting errors inside the auth fallback.
- `extension/background.js`: begin trace collection synchronously in the existing single native listener, before asynchronous configuration reads; catch resolution/storage/preflight exceptions; reject stale routes visibly; correlate existing History/counter outcomes. A Cloudflare request that was dispatched but lacks confirmation is uncertain. No automatic write retry is added. Failure/uncertainty sets the existing Shelf History indicator even if later accounting fails.
- `extension/runtime-diagnostics.js`: extend the existing diagnostics module with a durable ring of the last 100 save attempts, fixed stage/outcome/reason enums, coalesced best-effort writes, one-second diagnostic-storage deadlines, restart interruption marking and an in-memory fallback indicator. At most 24 fixed-field stage observations per retained attempt. No raw menu IDs, URLs, error strings, filenames, account/bucket/path identifiers or credentials enter this export.
- `extension/options.html` / `options.js`: add **Inspect save attempts** and **Export save attempts** beside existing Debug controls. The trusted `runtimeDiagnosticsV1` message accepts `saveAttempts` only from this extension's exact options page with Debug enabled. The separate `redown-save-attempts.json` export preserves the original runtime support-bundle schema and frozen offline APIs.

The ring records only fixed save-attempt metadata even when Debug is closed; viewing/exporting it requires Debug Mode. The attempt recorder lives in the existing diagnostics infrastructure. It neither admits jobs nor uploads, retries or verifies files. Stage entry marks the local phase boundary, not proof that Chrome/provider executed a remote operation. Startup `INTERRUPTED` means the observer restarted; the original provider job/receipt remains authoritative. If diagnostic persistence fails, saving continues and the fixed console warning plus in-memory snapshot reports unavailable persistence. If all extension storage is failing, the Debug message's settings check may also fail; the worker console snapshot remains the fallback.

The native menu owner, V3/CURRENT model, Universal File API, provider transports, OAuth scopes, original counters and IndexedDB schema are preserved. No production deployment, bucket creation, non-disposable write, account reset or database deletion was performed.

## Why this does not add duplicate saves

1. Dropbox's fresh-queue drain excludes terminal reported jobs and keeps an attempted-ID set. Completion is checkpointed first. A completed/unreported job is reconciled through History, not upload. Restart recovery is covered using a fresh provider instance and retained storage.
2. OneDrive's retained verified receipt is replayed by its existing stable delivery ID before another upload. The counter's existing deduplication remains authoritative. Releasing a stuck admission flag does not replay the failed click.
3. Google retains its existing durable queue, preallocated file-ID/resumable-session and remote proof behavior. The stale-state correction does not relax identity checks or retry an uncertain create.
4. Cloudflare performs its existing exact HEAD verification and session binding. A timeout/lost response or failed verification never produces a successful counter increment and is never automatically resubmitted by this patch.

## Verification

| Check | Observed result |
| --- | --- |
| Six selected lifecycle reproductions against exact baseline modules | **0 pass / 6 fail**, as expected. The same tests pass against candidate code. |
| New lifecycle and diagnostics suites | **22 pass / 0 fail / 0 skipped**. [Log](docs/verification/right-click-p0/focused.log). |
| Existing BOOT, CURRENT/backup native-menu, Cloudflare-session, counter/daily-badge, Shelf feedback and OneDrive diagnostic tests | **56 pass / 0 fail / 0 skipped**. [Log](docs/verification/right-click-p0/compatibility.log). |
| Additional guarded-worker first-install checks | 1 pass / 2 pre-existing fixture failures (`menuRebuildQueue` missing after deliberately failed core import). Retained in full-suite results. |
| Syntax/import closure, registry and issue validation | Pass. Full reliability runner includes these stages. |
| Gateway, Explorer, runtime and BOOT schema checks | Pass: 59 gateway fixtures, 17 simulated Explorer bundles, five runtime responses plus a bundle; six BOOT fixtures accepted and three invalid fixtures rejected. |
| Python owner-lab regression | **18 pass** during setup; no Python code changed. |
| Full reliability runner | **FAILED**, not release-ready. Baseline already had 1,002 passes and 111 reported failures (six matching saved debt and 105 outside the stale saved ratchet). Candidate has 1,024 passes and the same 111 failure names. The current architecture map fails, and the saved ratchet references an absent Nested test, so it marks execution incomplete. See [regression comparison](docs/verification/right-click-p0/regression-comparison.json) for exact current counts and failure names. No frozen evidence or baseline was refreshed. |
| Existing Explorer all-presets smoke | **FAILED** both before and after: 197 pass / 27 fail / 0 skipped, including extraction fixtures missing `verifyCloudflareReceipt`. It cannot certify live saving. |
| Installed Chrome / genuine provider writes / OAuth | **BLOCKED**. [Actual Chromium result](docs/verification/right-click-p0/installed-chrome.json): administrator policy disables unpacked extension loading. No native click or real OAuth/provider acceptance was observed. |

Reproduce focused evidence from repository root:

```sh
# Read-only extraction of exact baseline modules; intentionally exits nonzero.
REDOWN_P0_BASELINE=1 node --test \
  --test-name-pattern='stale connecting|initial storage|Dropbox full queue|Dropbox completed checkpoint|Dropbox drains' \
  tests/save-attempt-lifecycle.test.mjs

node --test tests/save-attempt-lifecycle.test.mjs tests/save-attempt-diagnostics.test.mjs
npm run reliability:check
```

Optional trace regeneration is explicit: `REDOWN_P0_TRACE=/absolute/path/ATTEMPT_TRACE.json node --test tests/save-attempt-diagnostics.test.mjs`. Normal tests do not overwrite the delivered trace.

## Acceptance matrix and limits

| Requested case | Local evidence | Installed/provider result |
| --- | --- | --- |
| 1, 2, 3, 5, 10, 20 and 21 sequential saves | All four local paths reach 21 without Shelf. Cloudflare uses the actual native handler, exact fixture-object HEAD and real local archive/counter. Other provider dispatch tests inject provider APIs returning verified fixture results, so they do not prove actual remote bytes. | BLOCKED for every provider. |
| Ten rapid clicks | Google and Dropbox admit eight under their existing bounds, record two explicit rejections, then complete eight. OneDrive preserves its one-active-save contract, records nine busy outcomes and completes one. | BLOCKED. |
| Same/different sources, same/unique names | Provider fixtures repeat one image URL/name; Cloudflare fixture uses unique URLs/keys. Not the full cross-product. | BLOCKED. |
| Cold/warm, suspension, browser restart, Shelf open/closed | Stale persisted state, real in-flight auth distinction, fresh Dropbox provider instance with retained completed checkpoint, diagnostic restart and saves without Shelf covered locally. Actual browser lifecycle and Shelf rendering matrix unrun. | BLOCKED. |
| Token expiry/account refresh | Existing Cloudflare session tests pass; real OneDrive OAuth-diagnostic contracts pass. No new live login or complete multi-provider expiry matrix. | BLOCKED. |
| Slow source/interrupted write | Slow-upload admission and ambiguous Cloudflare dispatch/readback failure fixtures covered. No live slow-source or network-cut acceptance. | BLOCKED. |
| Storage/queue/History failures | Initial OneDrive storage failure, Google/Dropbox full queues, Dropbox/OneDrive History failure and nonblocking diagnostic-storage failure covered. Full persistent-storage loss and all IndexedDB-archival failure permutations remain unverified. | BLOCKED. |

`ATTEMPT_TRACE.json` compares successful local clicks 2, 3 and 21 with an intentionally unconfirmed click 22. It contains no owner's browser trace and no live-cloud certification. The reports explicitly retain the existing archive/local-storage split and missing Cloudflare durable-receipt replay guarantee as limitations. A matching set of existing failed test names is not proof of zero regressions inside already failing checks.

## Environment setup handoff

Node lockfile dependencies, Python `jsonschema==4.26.0` in `/workspace/.venvs/redown`, Git LFS and GitHub read access were verified. No provider credentials are configured. Reusable environment draft reads failed twice, and the draft save returned `INVALID_ARGUMENT` with persistence unconfirmed; nothing was published. Fallback instructions are at `/workspace/redown-environment/install.sh` and `/workspace/redown-environment/START.md`. These local files do not substitute for a saved environment `install_script`/`start_skill`; reusable configuration remains outstanding until the platform draft service can persist it.
