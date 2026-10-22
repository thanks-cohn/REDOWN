# Explorer context menus and Nested refresh cleanup

Implemented on top of `7c452ac`, code commits `581599c` and `abf5cca`. This report supplements earlier frozen evidence; it does not refresh historical hashes or imply installed Chrome/live Cloudflare verification.

## Behavior

Explorer's custom in-page context menu now follows the nested destination pattern:

```text
Move to / Copy to
  bucket (account suffix when needed)
    Move here / Copy here
    folder
      Move here / Copy here
      deeper folder …
```

The current bucket is included, allowing sibling/deeper folder destinations. The bucket root is selectable with the “here” command. Same source-directory transfers are disabled, but that directory can still be expanded to reach deeper folders. Selected folders cannot be transferred into their own subtree. Existing conflict handling and original-retention/deletion behavior are unchanged: Copy keeps the source; Move removes it after successful transfer. The old ambiguous Send to label is removed.

Folders load lazily, one listing page on expansion. `cfDestinationFolders` performs delimiter-based object listing, without Worker preparation/deployment; it returns immediate folder names/full prefixes and continuation cursor. “More folders…” loads additional pages rather than silently truncating. Target loading has retry state. Closed/replaced menus ignore late results. Destinations retain exact account/bucket/prefix and selected-source snapshot. There is no arbitrary UI depth limit; provider key-length/access limits still apply.

Menus support pointer hover, click/touch expansion, Up/Down/Home/End, Right to expand, Left/Escape to return, visible keyboard focus, viewport edge flipping and scrollable panels. They are HTML menus in the extension, not native operating-system menus. Native system-wide clipboard file transfer is not implemented.

Copy/Cut continue to use REDOWN's internal session clipboard and now confirm “copied/cut in REDOWN” with Paste instructions. Copy also has an explanatory tooltip. Menu action errors are awaited and displayed. Download falls back to the clicked file if selection is empty and multi-file requests are awaited in order. Chrome download interruption events and immediate interrupted states are now surfaced; listeners are removed on completion/failure or after a 30-minute observation window. Starting a browser download is not claimed as completion.

**The user's specific “Download does nothing” cause is still unconfirmed.** These changes fix locally reproduced missing feedback/error handling, not a proven live Cloudflare/browser transport cause. Downloaded bytes, installed behavior, archive-entry download behavior and browser-dialog visibility remain unverified. The authenticated download transport is unchanged and no implicit provisioning fallback was added. A browser retest is still required; report the resulting visible Chrome error if it persists.

In the Nested right-click preset editor, per-profile Refresh locations footers are removed. The existing top-right section-header Refresh locations button remains and still invokes shared refresh across editors, preserving drafts/selections through the existing flow.

## Evidence

- Pre-fix focused reproductions: 2 expected failures (missing Copy confirmation; uncaught action failure). See runtime/verification/explorer-menu-reproductions.txt.
- `npm run check`: passed, including new destination-menu module.
- Final `npm test`: **182 tests, 176 pass, six fail**, no skips/cancellations. Same six baseline frozen catalog/debug/semantic evidence failures; no newly failing test names. Raw output: runtime/verification/explorer-menu-full-tests.txt.
- New DOM/mock tests exercise five folder levels, exact prefixes, current-bucket sibling destination, disabled same-folder target, pagination, stale-close suppression, keyboard return, load retry, actual background folder-page mapping, internal Copy confirmation and delayed/immediate Chrome interruption. Existing Nested editor, transfer/destination, preview and auth regressions remain covered by full suite.
- Installed-extension tests remain blocked by previously observed administrator policy; no bypass attempted. Live Cloudflare writes/moves/deletions were not run. No store branch changes, submission, customer deployment or source deletion.
- Audit-only allowlist package contains 28 files, including explorer-destination-menu.js; SHA-256 `d16671ec76ec81b33ecaeeb3743ccd281c36a57d3b77d64867b529dcdcaf2e07`. Manifest in runtime/verification/explorer-menu-package.json binds committed runtime bytes. License drift still blocks release; this archive is not a store candidate and has no installation pass.

Next verification: pull main and reload the extension in the user's authorized browser. Test Copy to / Move to with a disposable benign file and exact destination, keyboard/hover navigation, top-right refresh, then Download. Use the surfaced error to diagnose remaining browser behavior; do not treat this mock suite as installed/cloud evidence.

## Empty Simple destinations panel follow-up

User screenshots showed a large empty card below Include in Simple mode / Remove preset. `simpleExtraOptions` always appended its card and even an empty section-head divider when no additional options existed. The panel now uses the existing `[hidden]` styling when its option list is empty, becomes visible through + Add new location, and hides again after the last option is removed. Empty heading/divider nodes are no longer appended for profiles without an intro. Saved destinations and the shared Add location entrypoint are preserved.

Verification: `node --check extension/options.js` passed; existing `tests/simple-location-rows.test.mjs` and `tests/add-menu-location.test.mjs`: **9/9 passed** (local DOM/mock scope). `git diff --check` passed. No installed-browser layout or live Cloudflare verification claimed; full suite not rerun for this small presentation change.

## Copy here delay/error follow-up

The user clarified that the stall happens **after clicking Copy here**. Current source had an unbounded `fetch` in `callBucketWorker`; the 120-second UI message timeout did not stop the underlying Worker request. A failed response from a conflict-resolution retry was not rechecked and could appear as “0 files copied.” Successful files from the initial pass were also omitted from the retry's total. A missing per-file result array could likewise become an empty successful outcome. These are source/mock-confirmed defects; the user's exact deployed/browser cause is still unknown.

Corrections:

- Bucket requests use the shared abortable 30-second fetch, covering response-body parsing too. Timeout/network/malformed successful responses report **unconfirmed**, instructing destination inspection before retry. They do not automatically replay a potentially committed write. Existing explicit authentication-repair behavior remains. This per-request deadline does not make long folder enumeration/provisioning or large transfers instantaneous; a durable job/progress protocol remains unfinished.
- Transfer batches require one distinct recognized result for each requested source file; copied results must carry a destination key. Missing/incomplete receipts fail before move-source deletion, rather than becoming successful zero counts. Receipt validation still is not byte/hash verification.
- Conflict retry failures remain failed; totals include earlier successes. Copy/move status and final results/errors are visible near the file list, instead of relying solely on the footer. Existing destination conflict policy is unchanged.
- Independently reproduced submenu delay: Copy here / Move here was withheld until child-folder listing completed, and reopening repeated reads. The “here” action now appears immediately and remains usable if deeper-folder discovery fails. Bounded 64-page, 10-second per-context cache deduplicates pending reads; failed reads evict, listing waits time out after 12 seconds, and explicit refresh/auth changes/transfers invalidate cache. These are directory metadata reads only, not automatic copies. Already dispatched listing requests may finish after the menu stops waiting; stale panels ignore them.

Evidence: `copy-menu-before.txt` contains two expected pre-fix failures; `copy-receipt-before.txt` records missing receipt rejection failing before its correction. New mock/DOM/VM regressions verify immediate destination choice, cache reuse/invalidation, Worker deadline with no write replay, conflict errors and totals, and incomplete receipt rejection. Final `npm test`: **188 tests, 182 pass, the same six historical failures**, no skipped/cancelled tests. `npm run check` and `git diff --check` pass. Full outputs are under docs/runtime/verification/copy-reliability-*. No installed-extension or live Cloudflare copy was executed; existing administrator-policy and scoped-resource blockers remain. No Worker was deployed by this development session.

Next user retest: reload the updated extension, use a benign file, choose Copy to → bucket/folder → Copy here, and inspect the visible status. If it reports unconfirmed, refresh the destination before retrying to avoid duplicate copies. If it still fails, retain the exact message/correlation evidence; do not call the live issue closed on these mocks alone.


## Simple explicit-label precedence — 22 October 2026

Before implementation: main `34270b47e72554e7011f45d3eedaf0395cca1b6e`. An explicit non-whitespace Menu label now always wins for Simple primary and extra destinations. Only empty/whitespace labels use the existing selected automatic naming: lowest directory by default, or bucket name when selected; a root location falls back to its bucket. New extra destinations start with an empty label, and an empty primary label field no longer displays the profile name as though it were an explicit label. Existing saved labels are preserved. The automatic-label selector now contains only the two actual fallback choices; legacy menu settings retain lowest-directory fallback behavior.

12 focused Simple/reorder tests pass; syntax and current architecture checks pass. Full reliability run:306 tests /299 pass /7 historical failures /0 new failures. Actual native Chrome context-menu retest remains pending. No routing IDs, destination paths, Nested menu behavior or cloud configuration were changed.
