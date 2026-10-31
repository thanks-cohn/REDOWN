# History GO TO and V3 Setup repair

30 October 2026, America/Chicago. Branch `codex/v3-parity-first-reconstruction`. Source baseline `46b03c66735aef6efd7395b19f4d8c02484ae947`.

Implementation commit: `0e49a5c4f730d528e1201b720f571ab0409701c6`. Delivery documentation follows in a separate commit. Protected checkpoints `V3-MENU-MODES-BEFORE-HISTORY-REPAIR` and `BASE-v3` are retained.

## Delivered scope and boundaries

Eligible successful Shelf History entries now have an always-visible GO TO button on the primary row, including inside a collapsed long-entry summary. The Legacy Options success table receives the same action. The button stops click propagation/default disclosure behavior, has a native keyboard-accessible button and an object-specific accessible name. No element or placeholder is created for ineligible entries. Existing date grouping, Today expansion and provenance/details remain owned by the original History renderer.

Settings adds `History GO TO opens in:` with New Tab as the default and Side Panel as the alternative. The existing `chrome.storage.local` owns `historyGoToMode` (`tab` or `side`); no migration or second settings system is introduced. Other preview and toolbar preferences are unchanged.

## Changed files

| File | Purpose |
| --- | --- |
| `extension/history-navigation.js` | Shared eligibility/locator validation, persisted opening preference, new-tab creation, immediate side-panel opening, expiring handoff, scoped Shelf relay and explicit fallback |
| `extension/shelf-history.js` | Conditional primary-row GO TO insertion only |
| `extension/shelf.html` | Existing Settings control, shared script and separate navigation error/status surface |
| `extension/shelf.css` | GO TO button styling and empty navigation-status collapse; existing CSS remains a byte-identical prefix |
| `extension/options.js` | Same GO TO on successful rows; newly completed direct uploads retain their exact destination |
| `extension/options.html` | Load shared History navigation script |
| `extension/background.js` | Retain returned remote-save destination in ordinary ingest receipts and narrowly whitelist direct-upload destination fields; unsupported requests identify the requested operation and recovery step |
| `extension/beta/explorer.html` | Load shared locator/handoff script |
| `extension/beta/history-target.mjs` | Exact-object lookup using existing File API `stat` and existing R2 pagination |
| `extension/beta/explorer.mjs` | Initialization barrier, scoped handoff consumption, exact account/bucket/folder loading, selection/scroll/focus and existing preview invocation |
| `extension/beta/right-click-v3.css` | Remove reserved header/control heights, hide empty statuses and override enclosing Setup minimum height |
| `extension/beta/right-click-v3-ui.js` | Remove the two routine status strings; explain an older background's unsupported request rather than claiming initialization succeeded |
| `scripts/syntax-targets.json` | Include the two new JavaScript modules in required syntax checks |
| `tests/history-go-to.test.mjs` | Receipt, DOM preservation, opening, setting, exact lookup, lifecycle integration and unsupported-message regressions |
| `tests/right-click-v3.test.mjs` | Update the one assertion that explicitly required the owner-rejected routine engine text; retain engine events/reload/tree assertions |

No dependency, manifest permission, provider connector, Worker transport, transfer algorithm or preview renderer was added.

## Receipt and identity contract

A locator requires `ok:true`, no error, no explicit unverified/uncertain flag, no pending/cancelled/failed/started/accepted/incomplete status, and a destination containing nonempty `accountId`, `bucketName` and exact `key`. A record must also have verified completion or the existing successful recorded-location shape. Historical exact receipts remain usable; records without a reliable locator remain unchanged. Optional recorded `prefix` must match the exact key's parent and have the correct type. Unsupported provider identity, directory keys, controls and malformed path segments fail closed.

The derived credential-free locator is `{provider:'cloudflare-r2', accountId, bucketName, key, prefix, filename}`. Here `accountId` identifies the saved Cloudflare account, not whichever account happens to be selected. `prefix` and `filename` come from the receipt's returned exact key, never from the source URL or display name. V3's existing `verified:true`, destination bytes/read-back and returned key remain unchanged. Ordinary ingest now retains the same existing returned receipt instead of discarding it. Direct-upload success retains the exact submitted and acknowledged destination; this does not upgrade its existing verification strength. No credentials or Worker tokens enter the handoff or URL.

Keep Both already uses the existing Worker's unique-key logic. GO TO consumes its returned key, so `example (2).webp` remains distinct from `example.webp`. Original History entries are never rewritten by navigation.

## Opening and lifecycle

New Tab stores an expiring session intent under `historyNavigation:<UUID>`, then calls `chrome.tabs.create` with the existing Explorer URL, opaque UUID fragment and `active:true`. It always creates a new tab. No private object identifiers or tokens appear in the URL.

Side Panel calls `chrome.sidePanel.open` synchronously in the click gesture, before awaiting any storage/window operations. It reuses the existing Shelf panel configured by the existing toolbar implementation. The intent is scoped to the browser window. A Shelf running in a tab refuses to redirect; only a side-panel Shelf navigates its own extension document to the existing Explorer. An already-open Explorer panel consumes the same window-scoped intent. No tab creation, tab update, webpage navigation or window activation runs in the successful side-panel path. Late older opening results are discarded. A 12-second acknowledgement bound reports a panel that opened without an Explorer consumer. A rejected/unavailable panel shows an explicit New Tab fallback button; it never takes that fallback automatically or rewrites the preference.

Chrome controls panel side placement. The extension does not claim to force the left side. Official API reference consulted: https://developer.chrome.com/docs/extensions/reference/api/sidePanel (user gesture, global/window panel context and user-controlled side placement).

The shared receiver waits for normal Explorer initialization, checks authorization, discovers the recorded account/bucket, loads its parent directory through existing navigation and verifies the exact object through existing `stat`. R2's existing exact-prefix lookup follows opaque cursors and requires exact full-key equality. A found item outside the first displayed page is inserted into the current directory view with provider metadata, selected and scrolled/focused, without exhaustively loading unrelated pages. It then calls the unchanged `showPreview`.

Intents expire after two minutes; a receiver has a 90-second navigation deadline. A newer request aborts the prior exact read and invalidates old selection work. Directory epoch checks reject stale reads after manual navigation or authentication changes. MV3 suspension does not own the handoff: session storage and the receiving Explorer do. Extension reload clears session handoffs; an expired/missing URL intent reports interruption and tells the user to use GO TO again. No durable cloud job/resume claim is made. Missing/moved/renamed/deleted files, account/bucket unavailability, authorization and provider read errors produce a recovery message without selecting a similarly named object.

Unsupported formats still select the exact object and use the existing preview-unavailable/Download presentation. Existing image, text, media, PDF and ZIP/CBZ behavior remains unchanged. The current Beta Explorer has no GLB/GLTF inline route; no new one was created. Preview request errors remain local to the existing preview component and do not falsely change the History record to failure.

## Error-row preservation

`history-navigation-evidence/preservation.json` confirms the entire Shelf History renderer is byte-identical to the checkpoint after removing only the conditional GO TO insertion. All existing History CSS is a byte-identical prefix. The new DOM regression compares failed-row outerHTML with navigation enabled/disabled, including long source URL and technical error disclosure: exact equality. Source URL, timestamps, error text, disclosure and existing grouping remain owned by untouched code. Failed Options rendering is not edited.

The preview function, tree renderer, Cloudflare client, public-address logic, archive, transfer counter, V3/Legacy domain and manifest are unchanged according to the preservation checks.

## Setup geometry and statuses

Source-confirmed blank-space causes were `.v3-header` minimum heights of 156/224px, `.v3-presentation` fixed 30/30/30/44px tracks, an explicit fourth status track, and the enclosing `.quick-links-content` minimum height. The header now sizes to visible content, progressive controls keep their row order, empty status nodes collapse and Setup alone overrides the enclosing minimum. No negative margins or replacement editor were introduced. The existing tree's row geometry, indentation, forms, plus/checkbox/delete actions, focus and autosave are preserved. Progressive controls intentionally move content by their actual visible height instead of reserving empty space. Reduced-motion rules remain.

The exact routine strings `Saved configuration loaded. Chrome readiness has not been checked.` and `New Right-click (V3) controls Chrome.` are removed. Legacy-mode warnings, save failures, stale changes, discovery limitations and other actionable errors remain visible.

These are source and DOM findings. No computed-layout screenshot or rendered desktop/narrow-width acceptance is claimed without a browser.

## Unknown request investigation: owner incident remains unconfirmed

The originating generic text is the final fallback of the single background `runtime.onMessage` dispatcher. Current Setup sends `rightClickV3Snapshot`, `setRightClickV3Presentation`, `saveRightClickV3`, `refreshRightClickV3Inventory` and `cfDestinationFolders`; each has a literal current-background handler. The snapshot and mutations use the existing Explorer/sender gates and existing serialized menu lane. Folder discovery reuses the existing read-only listing route. There is no second current background listener or new message-registration subsystem.

The regression executes the actual current dispatcher: `rightClickV3Snapshot` acknowledges successfully; an unsupported operation returns `UNSUPPORTED_REQUEST`, identifies the request type and gives an extension/page reload step. The Setup sender also translates the exact generic reply from an older running background into an operation-specific recovery message, while leaving initialization failed and preserving actionable errors. It does not hide the error or pretend state loaded.

**The owner's exact failing request and installed service-worker version were not available, and the generic error cannot be reproduced for a known current Setup request here. A stale installed background is a hypothesis, not a proven root cause.** The owner-reported incident is not closed by this regression. An installed retest must capture the named failing operation if it recurs; no claim of a fully reproduced and corrected original mismatch is made.

## Verification and acceptance limits

Final focused run: **54 pass / 0 fail**, comprising 16 new History/navigation/message tests and 38 existing V3 tests. Final required reliability run: **621 pass / 69 failed names / incomplete**; syntax, registry and issue inventory pass, architecture freshness fails. All 69 failed names occur in the archived preceding V3 full report, with no additional failed names. This comparison is not a fresh pristine full rerun. Recorded final source hashes match the committed tested source, with zero mismatches. See `history-navigation-evidence/` and the latest handoff. Evidence distinguishes actual source/DOM/provider fixtures from installed Chrome and live Cloudflare. The four broader Shelf/History failures were freshly reproduced from an archive of the protected checkpoint: 5 pass / 4 fail. Existing assertions were not weakened; only the explicitly removed routine-text assertion was changed.

The installed Chrome probe is blocked with `CHROME_NOT_AVAILABLE_ENOENT`, zero assertions. No screenshots, actual tab/panel lifecycle, native keyboard/screen-reader acceptance, service-worker suspension or live Cloudflare transfers were verified. Mocked Chrome calls and in-memory provider pages are not live evidence. The full reliability suite retains historical failures and architecture freshness debt; this is not release certification.

Remaining P0 acceptance: installed Chrome visual/narrow-width checks; exact saved file and preview using an authorized live disposable R2 save, including Keep Both; true panel tab preservation and explicit failure fallback; extension reload and MV3 lifecycle; keyboard/screen-reader review; capture and close the owner's exact unsupported Setup request if it recurs. Do not treat this implementation as proof that those external gates passed.
