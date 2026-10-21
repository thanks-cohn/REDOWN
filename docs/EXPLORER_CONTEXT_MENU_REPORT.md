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
