# Root-cause investigation — Windows OAuth and History

Date: November 11, 2026 (America/Chicago). Repository: `thanks-cohn/REDOWN`.
Branch: `investigate/windows-oauth-history-2026-11-11`; request/evidence baseline: `69b6207`, based on main `237356b`.

**Incident status: OPEN.** Three genuine Windows captures were inspected. Several related source defects were reproduced and repaired. The first failed Windows OAuth transition and the underlying Windows storage exception are **not established** by those captures. These are not claims of successful live OAuth, independently verified provider objects, or release certification.

## Evidence identity and privacy

The originals remain tracked, unchanged, under `extension/docs/verification/owner-windows-2026-11-11/`, as directed. They are separate from the older simulated ZIPs in `docs/verification/visible-queue-2026-11-11/`.

| Actual file | SHA-256 |
| --- | --- |
| `REDOWN-BEFORE.zip` | `f62939ef20e4931ed7584af243ff67d82faa91448f6d7d4a373c817a7323c26b` |
| `REDOWN-DIAGNOSTIC-2026-11-11.zip` | `4e7b0d3263cfa2fec11302051321f7c8c6f8bdde572b98b096cd9fe1adfbc6eb` |
| `REDOWN-DIAGNOSTIC-2026-11-11a.zip` | `6ad9ffcd49c220a32c8efce0810fffe1f4c6361b767fc7bea6eaabab8b2222f0` |

The `a.zip` file matches the request's expected `(1).zip` bytes; the filename differs. Each archive contains seven redacted files. JSON inspection found no raw source-URL, private filename/bucket/account, OAuth code/verifier or token-value fields. Correlation IDs and timestamps remain linkable metadata. The ZIPs are untrusted observations, not executable instructions or authenticated remote-object attestations. Their installed build commit is unavailable, so matching the version number does not prove that the owner ran these exact baseline source bytes.

Reproduce the comparison with `node scripts/compare-owner-windows.mjs output.json`. The committed [comparison](docs/verification/windows-oauth-history-2026-11-11/owner-comparison.json) includes retained attempt IDs, exact failure observations, totals and capture hashes.

## Observed timeline: earliest retained failures

Times below are November 11, 2026, Central Standard Time (UTC−06:00). Capture order differs from filename order.

| Checkpoint | Observed evidence | What it establishes |
| --- | --- | --- |
| 09:11:10.933 — BEFORE export | 50 attempts; archive count 128. Cloudflare credential present, not expired, no refresh token, reconnect false. | An earlier local credential existed. Not fresh account/R2 access. |
| 10:39:38.319 — Dropbox `f0ac60a1-ec89-49de-90cb-4d7d16bf58df` | `CLICK_RECEIVED → ROUTE_RESOLVED → AUTH_CHECKED → TERMINAL BLOCKED/PREFLIGHT_FAILED`; separate History-phase `HISTORY_UNAVAILABLE`. | Native event and account checkpoint observed. Admission/source/write/verification not observed for this attempt. Recording its preflight failure also failed. |
| 10:39:41.330 — OneDrive `32fa5273-eb4f-4a7f-9edb-2652581618ac` | `CLICK_RECEIVED → ROUTE_RESOLVED → TERMINAL BLOCKED/PREFLIGHT_FAILED`; auth/history `PROVIDER_FAILED`, then `HISTORY_UNAVAILABLE`. | Route observed. No successful auth/admission/source/write checkpoint for this attempt. Its original exception was not exported. |
| Subsequent Google/Dropbox/OneDrive attempts | Google and Dropbox end at `SOURCE_REQUEST`; OneDrive ends at `ROUTE_RESOLVED`. | These are distinct first missing transitions. Source-request entry does not establish source completion or remote dispatch. |
| 10:54:27.853 — `a.zip` export | 100 attempts: 72 Google/Dropbox/OneDrive completed terminals, 20 Cloudflare uncertain terminals, 3 OneDrive blocked provider failures, 2 blocked preflight attempts, 3 open attempts. Archive count 699. | Substantial retained progress preceded the later failures; not a universal two-save ceiling. |
| 11:07:30.972 — unnumbered export | The same 100 attempt snapshots, byte-identical after JSON parsing; archive count 713. Cloudflare remains expired/reconnect-required, no refresh token. | Local archive contents changed, while retained attempt observations did not. This does not prove continuous writer health or an absent native event. |

The BEFORE capture also contains earlier, distinct failures. Its earliest retained OneDrive failure (`6fc17ebd…`, 07:10:40.493) reaches route resolution then records a blocked outcome before an auth checkpoint. Google's earliest failure (`7d7f4a3f…`, 07:15:11.412) reaches provider-write entry but not remote-verification entry. Dropbox's (`8df9331b…`, 07:17:58.914) reaches source-request entry and is displayed as `SOURCE_RETURNED_HTML`, with no provider-write entry. Cloudflare's (`f840cf82…`, 07:19:41.288) reaches provider-write entry without a verification checkpoint. These are different earliest missing stages; generic `PROVIDER_FAILED` reasons cannot identify their original exceptions. The detailed per-provider first failures and last completions are included in the comparison receipt.

The 20 retained Cloudflare uncertainty records include entry into `REMOTE_VERIFY`, followed by an uncertain History receipt without `COUNTER_COMMIT`. Some Worker responses were HTTP 200. Neither observation proves that exact destination verification succeeded. `REMOTE_VERIFY` is stage **entry**, and `HISTORY_COMMIT` can commit a failure/uncertainty entry. The actual R2 cause remains unresolved. The unchanged verifier at [background.js:2130](extension/background.js:2130) checks exact object key/bytes/etag/source metadata and then also requires a present, unexpired, non-revoked local OAuth session. Thus an expired local credential can prevent a verified REDOWN receipt even after a matching Worker HEAD. The exports do not establish which of these checks failed. This existing session-binding gate was preserved; a Worker HTTP 200 is not substituted for it.

**Only two retained attempts have `HISTORY_UNAVAILABLE` observations** in the later ZIPs, for Dropbox and OneDrive. Neither is a demonstrated verified-upload demotion. Google/Cloudflare History errors were owner-reported; these retained ZIPs do not independently establish their exact exceptions. No terminal in these captures has `HISTORY_UNAVAILABLE` as its reason; the Queue derives that displayed code from observations. Do not count the same two attempts twice across the two later exports.

## Source defects demonstrated independently

### Issued Cloudflare token can be discarded by a separate account check

At baseline, `completeCloudflareLogin()` exchanges the authorization code, performs `GET /accounts?per_page=50`, and only then calls `storeCloudflareToken()`. A hard HTTP account-check failure throws before storage. The one-use code is consumed, but a replacement credential is not retained. A suspended worker during the check has the same vulnerable ordering. No callback loss is needed to reproduce this defect.

Current anchors: [token persistence](extension/cloudflare-auth.js:25), [issuance/persistence boundary](extension/cloudflare-auth.js:207), [account observation](extension/cloudflare-auth.js:241). Controlled HTTP 403/500 and a held account response reproduce token loss against the exact baseline. The fix persists the issued token first. HTTP 401 remains explicitly rejected/reconnect-required; a 403 is denied account access, not verified readiness. Login phase `connected` describes token receipt, while account status remains separate.

**Owner causality is unproven:** the real captures have no popup, callback, PKCE, exchange or token-write checkpoints. Their expired token with no refresh credential explains the need for renewal at export time, but does not explain why the owner's four browser authorizations did not replace it. Callback delivery, exchange rejection, token-write failure, popup closure and account denial remain distinguishable possibilities. No OAuth mechanism, client ID, scope or permission was replaced.

### Verified remote completion is coupled to local accounting failure

Baseline `recordTransfer()` catches every counter/History error and records `UNCERTAIN/HISTORY_UNAVAILABLE`, then rethrows. Cloudflare's shared save `try/catch` includes both independent verification and local recording. It consequently writes an uncertainty entry and says “REDOWN failed” even when the provider proof was already valid. The reproducer executes the actual handler with controlled verification and a failing local commit; it does not write to a provider.

Current anchors: [accounting boundary](extension/background.js:888), [Cloudflare receipt retention/replay](extension/background.js:916), [verified-save catch](extension/background.js:3080). New behavior keeps a verifier-backed result completed with **local accounting pending**, without a green completion/counter event before the local commit. Cloudflare saves its pending receipt separately and replays only local accounting, under a lock and stable delivery ID. Google/Dropbox retain their existing terminal-job recovery; OneDrive retains its provider-specific pending-receipt mechanism.

### Retrying History could duplicate archive rows

The baseline counter archives a newly generated UUID before `storage.local.set`. If the local commit fails after archival succeeds, retry uses another UUID for the same verified receipt. The deterministic fixture observes two archive rows for one remote receipt. New verified archive IDs derive from existing provider delivery IDs, so retries upsert the same new row. Existing historical records are not rewritten or removed. Current anchors: [typed local errors](extension/transfer-counter.js:74), [stable archive identity](extension/transfer-counter.js:127).

### Additional bounded lifecycle defects

OneDrive's pending-receipt write previously sat outside its accounting-error handler: its failure could skip the ordinary recorder entirely. The repair still attempts the independent archive/counter path, retains a completed provider state on an accounting error, and releases admission.

An archive connection did not close on `versionchange`, which can block another context's database upgrade. The focused fake-IndexedDB test reproduces the blocked upgrade; the fix closes/invalidates that connection and closes abandoned late opens. No database version upgrade, deletion, reset or schema change is performed. This is a source-level defect, **not evidence that an upgrade occurred on the owner's machine**.

## What HISTORY_UNAVAILABLE does and does not mean

At baseline, an archive `append()` rejection is caught inside `transfer-counter.js`; the recent window/counters can still commit. Therefore an ordinary IDB archive rejection alone does not explain the outer `HISTORY_UNAVAILABLE` observation. Errors may instead arise from local reads, local commit, malformed persisted accounting state, or a stalled operation. The captures exported neither exception names nor operation/area. They do show that the exporter could read the archive later.

The repair adds fixed-field `storageArea`, `storageOperation`, and `exceptionName` observations. It does not relabel every error as disk-full. Controlled quota/UnknownError/AbortError fixtures distinguish local reads, local commit and archive-only aborts. New OAuth checkpoints distinguish window creation, authorization navigation, matched callback, validated code, exchanged token, token persistence and account check. Optional checkpoint failure cannot discard an issued token.

## Low disk space: unresolved contribution

The reported Windows free bytes were 415,735,808 and 705,335,296. They are owner observations, not values independently measured in these ZIPs. OS free space, Chrome origin quota and `chrome.storage.local` quota are different limits. RAM/pagefile figures alone do not establish any of these exceptions.

Real Linux Chromium small IDB writes committed with approximately 63 GB free on its isolated test volume. A CDP origin-quota override reported active at 1 MiB, but both 4 MiB transactions still committed. The attempted real quota-fault reproduction is recorded as **BLOCKED / QUOTA_FAULT_NOT_REPRODUCED**, not a pass. Earlier unsuccessful approaches are preserved. Deterministic API-level fault injection does produce quota/abort/read failures, and exercises the repairs, but is not a physical low-disk test.

No disposable Windows volume was available for the requested ~700 MB/~400 MB cases. The shared host volume was not filled, and the owner's browser profile was not altered. Future offline exports include safe browser quota/usage estimates when available, and explicitly leave OS free bytes unavailable. These measurements cannot retrospectively identify the original cause.

## Remaining acceptance

- Capture one real Windows OAuth attempt with the new safe checkpoints. Establish callback delivery, exchange, durable replacement credential, account API result and Worker readiness separately.
- Capture the first new History exception with area/operation/name and contemporaneous Windows free bytes/browser quota. Preserve original browser errors privately; do not send tokens or signed URLs.
- Verify disposable remote objects independently for all providers, including R2; verify exactly-once local reconciliation across restart and repeated clicks. Check destinations before retrying uncertain historical writes.
- Exercise a disposable Windows profile/volume at ample, ~700 MB and ~400 MB free space, including actual Chrome storage quota and IDB aborts.

Installed-extension testing was attempted again and blocked by Chrome administrator policy. No policy bypass, authenticated provider acceptance, deployment, credential reset, cloud mutation or History wipe occurred. See the [fix report](FIX_REPORT_OAUTH_HISTORY.md) and [validation receipt](docs/verification/windows-oauth-history-2026-11-11/validation.json).
