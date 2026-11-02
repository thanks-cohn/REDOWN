# Cloudflare-only nested native menus

Implemented the November 1, 2026 owner directive on top of main `34b5f73`.
The protected annotated tag `checkpoint/2026-11-01-amoebe-before-flat-provider-menus`
remains `049542becd50a1e04a0ebfe2ecb6fbfa764d8f80`, resolving to
`8af5607c79619b5f0e0836c3dbb792576cddde1b`. No tag or main update is part of this work.

## Source audit and implementation

Previously Google Drive declared `provider:google-drive` with `:save-redown` or
`:connect`; OneDrive declared `provider:onedrive` with `:save-root` or `:connect`.
Dropbox declared `provider:dropbox` plus `:connect` while disconnected.
The Google shared composer accepted child fragments; OneDrive required two entries.

Each fragment now emits exactly one leaf directly under `redown`, keeping the
names Google Drive, Dropbox and OneDrive. Both composers reject multi-entry
provider fragments. Connecting disables that same row. Ordering remains Cloudflare,
Google Drive, Dropbox, OneDrive, then existing controls. No V3 engine, tree editor,
Shelf, authentication implementation, permissions, transfer API, destinations or
receipt implementation was changed.

The sole background `contextMenus.onClicked` listener still delegates each exact
provider namespace to its owner. Only the provider ID initiates an action:

| Provider | Connected click | Disconnected/reconnect/expired click |
| --- | --- | --- |
| Google Drive | Existing transfer-page save, using current verified-folder state | Existing transfer-page connect |
| Dropbox | Existing queued root save, with original identity checks | Existing authorized login/pending-click flow |
| OneDrive | Existing source snapshot, forced auth/root revalidation and root upload | Existing explicit Microsoft connect |

Connecting clicks do not start another login. Existing auth adapters retain consent,
account checks and token refresh. Old children are inert in Google/Dropbox dispatch;
OneDrive reports `ONEDRIVE_STALE_MENU`. Namespace ownership prevents stale IDs from
falling into Cloudflare saves. Google source selection now also preserves pageUrl as
fallback after media/link; source validation and HTML rejection remain in its engine.

The background shared native writer remains the only registration authority. Its
existing `obsolete()` removal list covers all five retired IDs. Removal uses native
callbacks, tolerates missing IDs, propagates other failures and retries after restart.
Persisted known IDs still govern reverse removal and sibling ordering. No `removeAll`
was added. Root/Manage recovery and failed/pending versus acknowledged registration
remain intact. The menu application-key format is versioned to invalidate cached
acknowledgements for the old submenu layout.

## Verification boundaries

`tests/flat-provider-menus.test.mjs` exercises 125 combinations of provider states,
exact provider ordering, no provider children, unchanged Cloudflare projection and
saved V3 settings, upgrade with/without persisted IDs, failed child removal,
restart/reapply, direct dispatch, busy states, retired IDs and provider-specific
save/connect receipts through test doubles. Existing provider, BOOT and V3 tests
also exercise transfer integrity and native callback handling. Obsolete submenu
assertions were changed; frozen historical evidence files were not refreshed.
Historical hash assertions explicitly exempt only the newly authorized provider
menu/dispatch modules; unrelated baseline hash failures remain visible.

Installed Chrome was attempted using `node scripts/installed-chrome.mjs
/workspace/REDOWN/extension work/installed-chrome-flat.json`. Chrome 154 refused:
`Loading of unpacked extensions is disabled by the administrator.` No policy bypass
was attempted. Native visual arrows, real browser click gestures, OAuth, live provider
receipts and live Cloudflare saves are **NOT VERIFIED**. Local native registry mocks
are not installed-browser proof.

Google Drive still uses its existing browser-mediated transfer tab, verified REDOWN
folder, size/source restrictions and optional source-host permission workflow. The
separate seamless-save task remains open; this patch creates no folder during menu
projection and does not rewrite the transfer page. Dropbox keeps its existing source
permission behavior and root/commit/recovery limitations. OneDrive keeps its existing
Microsoft setup, consent and upload-host/uncertain-commit limitations. Connecting a
provider is not itself a successful save. No live cloud data was mutated.

## Exact local results

- `npm run check`: passed.
- Required diagnostics: getStartGuide, validateRegistry, listIssues and
  getReleaseReadiness executed. Start guide/registry report available; issue list
  and release readiness report partial, with release gates still blocked.
- Provider files plus the new flat-menu tests: 114 tests, 112 pass, two existing
  historical hash failures (`shelf-google-drive.js` in Dropbox preservation and
  `extension/LICENSE` in OneDrive preservation).
- Broader provider/V3/BOOT/composer selection: 196 tests, 180 pass, 16 failures;
  every failing test name also fails on unchanged main.
- Full unchanged-main archive: 980 tests, 883 pass, 97 fail. Candidate: 985 tests,
  888 pass, the same 97 failing test names, zero newly failing names. The five
  additional tests pass. These failures include existing UI/source assertions and
  stale architecture/historical evidence, not just the older documented six.
- `npm run reliability:check`: failed; syntax, API registry and issue inventory
  pass, architecture fails and the historical regression baseline rejects existing
  main failures. This is not a green release certificate.

See `docs/verification/flat-provider-menus/results.json` for exact counts and the
full unchanged failure list, `native-trees.json` for synthetic acknowledged plans,
and `installed-chrome.json` for the real installation blocker. No live transfer
receipts were fabricated. Browser acceptance remains open.
