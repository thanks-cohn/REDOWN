# BUG-018 — Copy/Paste and Move to recurrence — remediation round 05

Recorded: **2026-10-22T23:56:43+00:00 (UTC)**. Priority: P1, core interaction reliability.
Before: `6ed876ebeec59db4a1bc14b37dbff03abaa02591` (remote main; local equivalent tree at `58a2fdf`).
Related incident: `EXPLORER-COPY-404-2026-10` — **open**.

## Report and evidence boundary

Owner again reports Copy/Paste and Move to not working. No new installed-extension error,
selected identity or reviewed diagnostic bundle was supplied. The unified API start guide,
registry, issue inventory, release readiness, copy contract and transfer smoke plan were used.
These are repository/imported-evidence queries, not a connection to the owner's Chrome.
The previous HTTP404 remains an observation with unknown live root cause. This round fixes
reproduced UI/diagnostic defects; it does not establish that those defects caused that404.

## Attempt accounting

Round numbers count evidenced related implementation/remediation rounds, not user retries,
JSONL events, successful fixes, or an assertion that earlier work solved the live failure.

| Round | Evidence | Work / remaining boundary |
| --- | --- | --- |
| 01 | `581599c`, 2026-10-21 11:32:44 UTC | Lazy nested destination menus and action feedback. |
| 02 | `773622b`, 2026-10-21 11:50:42 UTC | Worker deadline, receipts, conflict retries, immediate Here action. Live stall unverified. |
| 03 | `d7953fd`, 2026-10-22 03:49:59 UTC | Exact-key and verified-transfer safety. Reported404 subsequently remained open. |
| 04 | incident sequence3, 2026-10-22 07:06:41 UTC | Routing flags read back corrected on13 Workers; read-only probes added. No live transfer acceptance. |
| **05** | **this record, 2026-10-22T23:56:43+00:00** | Clipboard/menu ownership and transport observability corrections below. Installed outcome pending. |

`f2868d4` expanded fault fixtures/evidence; it is not counted as a separate verified repair.
This ledger is the traceable count available in this checkout, not an invented all-time count.

## Source-confirmed defects and solution

1. `setExplorerClipboard` published mutable global state before session storage succeeded.
   Persistence failure left a clipboard that looked available without confirmed persistence.
   Publish only after successful persistence; return the exact captured clipboard; failed writes
   carry `EXPLORER_CLIPBOARD_FAILED` and preserve the previous clipboard.
2. Destination actions awaited Copy and then pasted the global clipboard regardless of Copy's
   result. A refused selection could paste the previous selection; concurrent clipboard changes
   could substitute another request. Move to/Copy to and drop transfer now require a returned
   clipboard and pass that exact snapshot into Paste.
3. Root-menu Copy/Cut/Paste resolved selection/source/destination at click time. An open menu
   could act on a newer location. Capture menu selection, source, destination and clipboard when
   opening it; bucket Paste also captures its clipboard. Preserve home-without-bucket behavior.
4. Empty Paste silently returned. Missing destination and empty selection/clipboard now have
   actionable messages and registered structured codes. No transfer is dispatched.
5. Rejected transport bypassed Paste's normal result handling, leaving operation feedback
   working; keyboard promises had no rejection handler. Paste ends the status on rejection,
   retains the original error for diagnostics, preserves the clipboard and never retries writes.
   Keyboard copy/cut/paste handles rejections and suppresses conflicting native clipboard keys.
6. `send` recorded replies but not rejected requests. The existing bridge now terminates failed
   message traces using only allowlisted error codes; timeouts have an explicit code. Context
   menu invocation uses the existing collector's `context.menu` operation. Confirmed invocation
   means the menu function completed, not that any transfer completed. No URLs, file names,
   clipboard contents or exception messages are added to traces.

No parallel transfer framework, palette change, cloud visibility change, Worker deployment,
write replay, relaxed move verification or deletion of source data was introduced.

## Verification

Six new checks failed against pre-change options code (19 checks:13 pass/6 fail) and pass with
these corrections. Added regressions cover transactional clipboard publication, refused Move to,
explicit operation snapshots, stale menu destination, empty clipboard, missing destination,
transport rejection/status, Explorer home, diagnostic transport privacy and actual `send` routing.
The transfer smoke preset now includes menu/clipboard and nested destination tests.

Final machine-readable results: [verification summary](BUG-018-verification.json).
Existing Get URL test fixture now supplies the real workspaceTarget dependency; its assertions
remain intact. Syntax, current architecture, unified registry and issue inventory must pass.
The seven frozen/baseline failures remain visible; a partial reliability report is not release
certification. No actual installed Chrome or live Cloudflare transfer was executed here.

## Next evidence needed to close the live incident

Reload the extension after updating. Enable Debug, copy one ordinary benign file, open the
intended destination, and run **Settings → Debug → File Explorer diagnostics → Probe selected /
copied file**. Export/review the support bundle with the failed operation ID. The existing
source API read / direct Worker HEAD / destination-proxied HEAD / provider settings comparison
can distinguish object identity, route, binding, authorization and capabilities without copying,
deleting or deploying. If a write was unconfirmed, refresh the destination before retrying.
Keep the live incident open until an installed run establishes the cause and verifies the fix.
