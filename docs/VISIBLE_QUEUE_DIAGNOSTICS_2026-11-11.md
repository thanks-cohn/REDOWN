# Visible Shelf Queue and diagnostic bundle

Implementation branch: `fix/p0-visible-queue-diagnostic-bundle-2026-11-11`.
Base: `main` at `ad9a8f9aa05b857d724c8e5035a1db763edd1e4c`, including the P0 lifecycle repairs at `c2be0d1`. Request copied unchanged from `feat/history-shelf-search-queue-vision-2026-11-10` at `810caeba60f55680e8139f0b48ae670e2986edba`. That branch's separate History/drag work remains unmerged and untouched. Delivery preserves the separate implementation branch and merges it to main at the owner’s request. No deployment, provider resource creation or Click2Cloud change was performed.

The visible Queue, provider-specific Debug signals, canonical local API, ZIP exporter and bounded source repairs are implemented. **The owner's installed-Chrome freeze and Cloudflare OAuth incident remain unresolved; real-provider acceptance is BLOCKED.** Local fixtures are not a substitute for the required 50+ genuine browser/provider attempts.

## User-visible behavior

The Shelf keeps FILES / REMOTES / HISTORY / SETTINGS and adds QUEUE with a live count of pending or unreviewed attention-needed attempts. Verified completions and cancelled attempts are excluded. At narrow widths the first four labels remain on one row and Queue becomes an adjacent compact second-row pill. Home is the original top-right button, with its original markup and action.

Queue has a separate outlined diagonal Back arrow, five state filters and optional provider grouping. It renders at most 100 rows from existing jobs, attempt traces and recent History. Unknown names, totals and destinations are explicitly unavailable. Rows distinguish attempt-only intent, admitted jobs, source bytes acquired, uploaded bytes, verification, local receipt reconciliation and verified completion. View History targets the exact attempt in the bounded recent archive search; trace disclosure and connection guidance stay local.

Back restores the actual previous Shelf section, scroll and focus without rebuilding Explorer. Direct links without prior navigation fall back to REMOTES. Browser back/forward remains functional. Repeated entry while already in Queue replaces that Queue location instead of stacking loops.

Debug Mode adds a per-provider status control. New definitive failures pulse twice red, then retain an outline/control; hydration shows a static signal without replaying old flashes. Uncertain/interrupted/stalled states are amber, queued/active states neutral. Reduced motion suppresses animation. A later metadata fingerprint does not restart a failure pulse. The most recently observed outcome/state for that provider wins; verified success still uses the unchanged verifier-backed success/counter path. Debug off removes these card signals while retaining the existing failure laser and programmatic recorder.

“Mark reviewed” records only a UI acknowledgement tied to the observed outcome version. It does not remove History, change a provider job or retry a transfer. A later outcome requires review again.

## Canonical API and state ownership

`extension/transfer-queue.js` is a read-only projection, not an upload engine. The Shelf uses its client and subscription adapter; the background exposes `transferQueueV1` with `list`, `get`, `eligibleActions`, and a UI-only `acknowledge` operation. There is no second job scheduler, generic replay or new provider mutation command. Existing provider-specific controls remain authoritative. The module is a browser runtime API, separate from the existing offline diagnostics gateway; that gateway does not gain a hidden Chrome transport.

Only this extension's top-level `shelf.html` and `options.html` contexts can access Queue and bundle messages. Foreign IDs, websites, lookalike paths and subframes are rejected. The runtime handler does not issue provider requests. Ordinary worker activation can perform the existing owners’ authorized recovery; the export control therefore uses the same projector directly over local storage and never messages or activates the worker. The client subscribes to relevant storage changes; a visible Shelf polls pending work every ten seconds to expose elapsed stalls.

Projection precedence is explicit: current owner job state overrides an observer's restart interruption; a newer active job is not overwritten by old failed History; definitive verified History reconciles the same attempt. Google owner-reported completed proofs outside the 50-row compatibility window stay completed, not falsely pending. Queue position counts pending owner jobs, not retained completed entries. Raw local destination references are available only to trusted GUI callers and are stripped from exports.

Stall thresholds are observational, not retry timers: received/queued 120 seconds, fetching/active/verifying 90 seconds, uploading 180 seconds, waiting-for-login ten minutes. A real future owner backoff defers attention. These deadlines change only the projection to `needs-attention`; they never declare an uncertain file absent or resubmit bytes. Dropbox wake/pump/resume observations, real HTTP throttling deadlines and available resume-alarm schedules are included. Unknown alarm/retry state remains unavailable rather than invented.

## Source/provider repairs

| Source path | Change and evidence |
| --- | --- |
| OneDrive unknown/invalid length or compressed response | Before any Graph upload session, stream the decoded source into a shared **16 MiB retained-byte RAM budget**, measure actual length, then use the original upload/proof path. No source bytes are persisted. Larger reliable fixed-length responses retain the original 5 MiB range streaming; an 18 MiB fixture exercises that path. Buffer/network/upload overhead is additional to the retained-byte budget. Over-limit unknown sources stop with `ONEDRIVE_SOURCE_BUFFER_LIMIT`, before Graph, and offer a fixed-length source/original-file recovery path. |
| Google and Dropbox HTML mismatch | The shared acquisition guard records safe response categories, samples a bounded prefix, and rejects declared HTML or HTML bytes mislabeled as an image before upload-session creation. XML/comment preambles are handled. Actual file chunks are replayed exactly to the existing stream reader; byte-preservation fixtures cover all three browser-mediated providers. |
| Dropbox queued/stalled | Existing durable queue and alarm owners remain. Progress timestamps and wake/pump/recovery evidence distinguish admission from an upload, throttling/backoff and a lack of progress. The P0 fresh-queue drain and receipt checkpoint repairs are preserved. A stalled row becomes amber with `QUEUE_STALLED`, never a fabricated success. |
| OneDrive receipt/progress | Attempt/job IDs, source-acquisition totals and activity timestamps stay associated with the original owner. A cosmetic completed-state write failure does not demote a verified upload. Existing pending-receipt reconciliation and busy cleanup are retained. |
| Cloudflare | TRUE REMOTE remains the existing Worker fetch. Only safe Worker response categories are added. No browser buffering, local-source fetch, Worker deployment, new scopes or OAuth replacement was introduced. Token presence, expiry/reconnect state, account API access and Worker readiness are separate in the export; account/Worker access is explicitly unverified by a local snapshot. |

Three source-length tests were run against the exact baseline OneDrive implementation using read-only `git show`: all three failed with the original unknown-length/encoding errors. The same cases pass on this branch. This establishes those source repairs, not the cause of the owner's original system-wide freeze.

The guard does not bypass cookies, hotlink protection, login gates, redirects, paywalls or browser permissions. Some sites remain unsupported. It does not promise that every image signature or misleading response can be recognized from a small prefix. No uncertain final write is automatically replayed.

## One-click forensic ZIP and privacy

Shelf Settings and Dashboard's former support-export control now offer one **Export Diagnostic Bundle** action. The original runtime/save-attempt inspection RPCs remain available; the ordinary export is a single ZIP named `REDOWN-DIAGNOSTIC-YYYY-MM-DD.zip`. It is downloaded locally, never uploaded automatically. The UI discloses its metadata fields and bounds: at most **512 KiB ZIP / 2 MiB expanded metadata**.

Seven files are produced: `SUMMARY.md`, `attempts.json`, `queue.json`, `history-reconciliation.json`, `environment.json`, `source-and-provider-failures.json`, and `README.md`. The automatic summary uses observed outcome times for last-success/first-later-failure transitions, counts failures by provider/code, reports stalls/incomplete traces and correlates same-asset observations where fingerprints exist. Missing delivery, unavailable storage, missing source IDs, missing archive/receipt links and unknown provider readiness are evidence gaps, not inferred successes.

The recorder retains the last 100 attempts, the first received-click observation plus recent transitions (24 stages total), and 20 recent observations per attempt. A separate whitelisted acquisition summary preserves initial source headers/sniff facts after long uploads evict intermediate observations. Durations and terminal decisions are explicit. Source identifiers are installation-keyed HMACs of the exact source URL without fragment. Raw origins, paths, query values and the HMAC key are never exported. Different query-selected files do not falsely match; rotated signatures can prevent matching the same underlying asset, and equal fingerprints do not prove unchanged bytes. Collection stays independent of visual Debug Mode and cannot block a save if diagnostic storage fails. A crash before a local journal write commits can still leave an evidence gap; this is not a claim of 100% durable click accounting under failed storage or abrupt termination.

No OAuth token, cookie, private key, source/page URL, signed URL, account/bucket/path identifier, filename or file content is exported. Only enumerated codes, safe header categories/statuses, byte counts, timestamps and opaque IDs survive. Counter reconciliation checks actual local receipt IDs inside the newest 2,000-ID window, exporting only linkage/counts. It does not infer verified files from totals or animations. Archive and compatibility-window commits remain distinct. The export control always uses a local stored snapshot, even if the worker is unresponsive: it neither sends a runtime message nor activates a worker that could recover queued writes. Trace persistence is labeled `stored-only`, not a live writer-health claim; uncommitted/volatile events are an explicit evidence gap. Existing BOOT observations are sanitized. It neither instantiates a second attempt recorder nor marks provider jobs interrupted. Snapshots span separate reads/stores and are not an atomic cross-store transaction. The ZIP uses pinned `fflate@0.8.2`; its MIT notice is included in the extension package.

Sample **actually downloaded by the Chromium fixture UI**: [REDOWN-DIAGNOSTIC-2026-11-11.zip](verification/visible-queue-2026-11-11/REDOWN-DIAGNOSTIC-2026-11-11.zip). It explicitly declares simulated scope, distinguishes Google HTML, OneDrive source length, Dropbox stalls and post-write uncertainty, and contains no genuine cloud-transfer evidence.

## Validation and remaining gates

Exact counts and failure names are recorded in [validation.json](verification/visible-queue-2026-11-11/validation.json). Focused tests include new queue/source/privacy/UI tests plus the main P0, BOOT/menu, History/Explorer routing and receipt/counter preservation checks. The test change to `shelf-mini-explorer.test.mjs` updates its four-tab expectation to the requested fifth Queue route and exercises it; no baseline failure or frozen hash was rewritten.

Real Chromium page rendering and both normal/worker-unavailable downloads passed 42 assertions across Porcelain, Neon, Ocean and Midnight at 260/320/420 px: no page or label overflow, keyboard Queue entry, Back/Home separation, browser back/forward, focus/scroll restoration, exact-attempt navigation, two-pulse isolation, amber uncertainty, reduced motion, Debug off and a seven-file downloaded ZIP. These are **mocked Chrome API/provider page fixtures**, not installed-extension acceptance. [Browser evidence](verification/visible-queue-2026-11-11/browser.json), [Neon narrow view](verification/visible-queue-2026-11-11/queue-neon-260.png), [standard view](verification/visible-queue-2026-11-11/queue-porcelain-320.png).

Syntax/import closure, native API registry, issue inventory, gateway/Explorer/runtime/BOOT schema checks and audit packaging pass. Packaging remains blocked for release by the existing root/bundled license drift and live/publisher gates; audit mode preserves all licenses. The full reliability gate still **FAILS** with the same 111 failing test names as the initial application-source baseline. It also reports the stale architecture map and an absent historical Nested test in the saved ratchet. Matching failure names do not certify behavior inside already failing tests or erase existing debt.

The new installed-Chrome attempt was **BLOCKED** by `Loading of unpacked extensions is disabled by the administrator.` No policy bypass was attempted. This test run had no authenticated disposable provider sessions. Consequently, the requested 50+ genuine saves, real browser restart/suspension across authenticated sessions, independent cloud-object checks, Cloudflare OAuth callback/account/Worker/R2 acceptance, site-specific accessibility and recovery across actual network interruptions remain **BLOCKED**, not passed. The root cause of the owner's original missing/native-event sequence and Cloudflare login-recognition failure remains open.

Generic per-row retry/pause/cancel/remove commands were deliberately not invented: the Queue is read-only first, and the existing owners do not expose a uniform safe per-job mutation contract. Existing provider controls remain available; uncertain writes require destination review before any new save. No jobs or History were erased to make the Queue look healthy.

Reproduction:

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
node --test tests/visible-queue.test.mjs tests/shelf-queue.test.mjs tests/queue-background-api.test.mjs tests/diagnostic-download.test.mjs
node --test tests/save-attempt-lifecycle.test.mjs tests/save-attempt-diagnostics.test.mjs
node scripts/visible-queue-browser.mjs work/visible-queue/browser
npm run reliability:check
python scripts/package_chrome_store.py --audit-only

# Expected failure: exact baseline source-length reproductions, without resetting the checkout.
REDOWN_VISIBLE_QUEUE_BASELINE=1 node --test \
  --test-name-pattern='OneDrive determines decoded byte count' tests/visible-queue.test.mjs
```
