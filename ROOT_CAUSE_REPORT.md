# Right-click save investigation — P0 remains open

Baseline: `44ed072b974aabdfe62c6cc28ba2f561f08ec004` (`main`). Investigation date: 2026-11-11.

**The owner's first failing installed-Chrome click has NOT been captured. No common cause for the multi-provider, counter and Cloudflare login symptoms is established.** Six independent source mechanisms were reproduced in controlled local tests, then repaired. There is no demonstrated hard limit of two saves in any inspected provider. This is separate from Issue #47's disappearing-menu symptom.

## Observed source mechanisms

Line references below distinguish the baseline from the candidate. Tests load the exact baseline modules with `git show`, without resetting the checkout.

| Path | First demonstrated failure | Evidence and candidate repair |
| --- | --- | --- |
| Google | Baseline `google-drive-provider.js:61` returns when the persisted projection says `connecting`. No enqueue, provider request or History outcome follows. | Inject `connecting`, invoke the real provider dispatcher: zero uploads before, one after. Candidate `extension/google-drive-provider.js:54` joins the worker's actual connect promise instead of trusting the persisted phase. Live occurrence of this legacy state is unproven; the current stream client itself does not set this phase. |
| OneDrive stale state | Baseline `onedrive-provider.js:93` returns on `connecting`, even with durable authorization available. | Dispatcher fixture with persisted auth: zero uploads before, one after. Candidate `extension/onedrive-provider.js:90` distinguishes a real in-flight login from a stale projection, and revalidates existing identity through `auth.ready`. Pending login without usable auth is explicitly blocked and recorded. |
| OneDrive admission | Baseline `onedrive-provider.js:50-55` sets `busy=true` and awaits a storage write outside its cleanup block. A rejected write leaves busy set for every later click in that worker. | Inject exactly one failed initial transfer-state write: next click still uploads zero files before; next click succeeds after. Candidate `extension/onedrive-provider.js:50` puts the initial write inside the transfer try/finally and guarantees lock release even if receipt persistence throws. This failure needs no two-save threshold: it begins at whichever click encounters the failed write. |
| Dropbox pump | Baseline `dropbox-provider.js:24` iterates a snapshot. A second click admitted while upload one waits calls wake, but joins the existing pump; its job is outside that snapshot. | Hold upload one, admit click two, release: one completion before; two in the same pump after. Candidate `extension/dropbox-provider.js:21` reads fresh pending jobs with a per-pass attempted-ID set. The old periodic alarm could eventually resume the second job; this is a demonstrated delay, not proof of permanent stoppage. |
| Dropbox accounting | Baseline `dropbox-provider.js:38` records completion before saving its terminal checkpoint. History rejection leaves an active stored job even though upload returned verified proof. | Fail only the completed History callback: baseline retains `active`; candidate retains `completed`. Candidate `extension/dropbox-provider.js:40` saves completion before History. The next pump replays the receipt only, with zero additional uploads. |
| Dropbox admission | Baseline `dropbox-provider.js:44` returns null at eight pending/unreported jobs. The UI status changes, but no rejected-attempt History is produced. | Fill eight jobs, click once: zero rejected History entries before, one blocked entry after; still eight jobs and zero new writes. Candidate dispatch also records a pending-auth rejection and no longer treats queue/accounting errors as an instruction to open OAuth. |

Exact failing assertions: [baseline-reproductions.log](docs/verification/right-click-p0/baseline-reproductions.log). All six selected tests fail on baseline; all pass on the candidate. Existing authentication, upload, conflict, verification and counter algorithms remain the owners of their behavior.

## Cloudflare and History boundaries

Baseline `background.js:2965-2969` reads profiles and resolves the durable V3 destination outside the save-specific catch. A rejected storage/migration/configuration read can escape without a failed transfer record. Candidate `extension/background.js:2945` starts a correlation trace synchronously, before those reads, catches dispatch/preflight failures, records blocked History when storage permits, and sets the existing failure indicator. Invalid routes are explicitly rejected rather than counted.

Candidate `extension/background.js:2044` observes the existing prepared-profile/Worker path. `verifyCloudflareReceipt` independently calls `headObject`, checks exact returned key, byte size, ETag and source metadata, then binds proof to the current OAuth session. A completed POST is insufficient. A written object followed by failed readback is now `uncertain`, not a definite failed write inviting replay. No automatic Cloudflare write retry was added.

`transfer-counter.js:88` remains unchanged: verifier-backed provider receipts deduplicate by delivery ID and commit `providerSaveReceipts`, the local calendar-day badge, lifetime counter and recent History together under the existing history lock. IndexedDB archival precedes that local-storage commit, but archive exceptions are explicitly swallowed by the existing implementation (`transfer-counter.js:118`). Thus `HISTORY_COMMIT` proves the recent durable compatibility window, **not** that IndexedDB archival succeeded. Archive-first/local-storage-failed states and lack of a Cloudflare durable verified-receipt replay journal remain limitations; this patch does not claim to solve all storage-loss cases.

Shelf reads `providerSaveReceipts` and validates live Cloudflare/Dropbox session context before celebrating (`shelf-save-feedback.js:23,158`). History reads the archive with the compatibility-window fallback (`shelf-history.js:394`). No provider counter was manually incremented, backfilled, reset or inferred from animation. No owner profile, OAuth record, settings or existing database was erased.

## Cloudflare OAuth: source trace, live result BLOCKED

The current flow opens an about:blank popup (`cloudflare-auth.js:89`), persists PKCE/state/tab/expiry in session storage, navigates to the authorization URL, and registers top-level webNavigation callbacks synchronously (`cloudflare-auth.js:240`). Callback matching checks frame, exact origin/path and tab; a cross-context lock claims the one-use code (`cloudflare-auth.js:158`). It validates state/expiry/code, exchanges the code, then requests `/accounts?per_page=50`. Transport-only follow-up failures retry and may defer account verification while retaining an issued token. HTTP permission failures still reject finalization before durable token storage. This distinction predates this patch; OAuth was not replaced and scopes were not broadened.

Token issuance, successful account API access, usable R2 permissions, Worker readiness and a verified save are separate facts. The existing [false connected report](bugs/CRITICAL/2026-11-02_P0_CLOUDFLARE_FALSE_CONNECTED_AFTER_ACTIVATE_BUCKETS.md) already describes differing Shelf/Explorer projections. The [Dropbox false-success report](bugs/CRITICAL/2026-11-02_P0_DROPBOX_FALSE_SUCCESS_HISTORY_AND_COUNTER.md) concerns receipt truth, a different observation from the newly reproduced queue delay. Neither incident is closed here.

Chrome documents `identity.launchWebAuthFlow` as the managed flow completing on the extension's chromiumapp redirect. Merely obtaining the same redirect with `getRedirectURL` does not prove the manually opened window receives callbacks correctly in installed Chrome. An attempt to retrieve the current official identity reference returned HTTP 403 in this environment; current documentation and real browser behavior were not independently revalidated. The existing manual flow is preserved pending live evidence.

## Timeline and first missing stage

1. Verified checkout/HEAD, clean initial Git status, Node 24.22.1, Python 3.12.14 and Git LFS; installed the lockfile and CI-pinned Python schema dependency.
2. Ran diagnostics and the full baseline reliability runner **before source edits**. It already failed: 1,002 pass, 111 reported failures, stale architecture validation and a stale regression baseline.
3. Attempted isolated installed Chromium 156.0.8078.79. It rejected extension loading: `Loading of unpacked extensions is disabled by the administrator.` No native Chrome click, OAuth attempt or real provider transfer was observed. No policy bypass was attempted.
4. Reproduced the six source failures using baseline modules. Implemented small changes in their owning providers and the existing background/diagnostics paths.
5. Exercised sequential local saves through 21 and rapid admission, including independent Cloudflare fixture HEADs and an injected readback failure. Generated [ATTEMPT_TRACE.json](ATTEMPT_TRACE.json).
6. Reran focused, BOOT/menu, receipt/counter, schema and full reliability checks. Full-suite failures remain visible; no frozen hash or saved baseline was rewritten.

In the controlled Cloudflare comparison, clicks 2, 3 and 21 complete; click 22 writes the fixture object but fails at **REMOTE_VERIFY**, yields UNCERTAIN History, and leaves all success counters at 21. This deliberately injected failure is not the owner's first failed click. In the OneDrive persistence reproduction, the first failed click stops before SOURCE_REQUEST; the next click previously stopped at admission because busy remained true.

## What still needs installed evidence

All four providers' 20 genuine consecutive native saves, click 21, browser restart/suspension, Shelf open/closed, slow real sources, token refresh/expiration and disposable remote-object readback remain **BLOCKED**. Permission to test was granted, but this machine cannot load the extension; it also has no configured provider sessions. No live resources or writes were created.

On an administrator-approved Chrome installation, use Debug Mode → **Inspect save attempts** / **Export save attempts**, preserving the existing profile and provider sessions. Capture a successful click, the first failed click and the following click; correlate each locally with the exact selected destination, provider job, remote readback, History and all receipt/counter stores. Obtain provider-specific OAuth/account/Worker observations for Cloudflare separately. The export intentionally contains no raw destination, source or account identity; those must be checked locally, not added to support exports. Missing CLICK_RECEIVED is evidence of missing delivery only when collection itself was available. This evidence is needed to attribute or close the owner's P0.
