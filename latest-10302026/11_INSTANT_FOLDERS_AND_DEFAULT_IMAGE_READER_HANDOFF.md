# REDOWN implementation handoff: inline folders, menus and archive reader

30 October 2026. Branch: `release/cloudflare-true-remote`.
Baseline: `fef0b08d8d44cddd76749b39c06139a3e2b5b569`.

## Completed behavior

Explorer now presents **More → Upload folder**, **New folder → Keep both**, and **Grid/List → Activate Buckets**. Each pair stays together when the toolbar wraps. Upload folder uses the existing primary class shared with Upload Files. The prior Activate Buckets copy beside Refresh is removed. Activation logic, reduced-motion treatment, private access, explicit confirmation, and the distinct red Delete action are retained. Keep both remains selected by default. DOM tests verify all three adjacencies and unique activation control; rendered appearance is not certified.

New folder opens a compact inline form with automatic focus, confirmation, cancellation, progress and local errors. Each Explorer folder also has a + targeting that folder directly. Enter submits through the normal form, Escape cancels without writing, and invalid input remains editable. The operation captures the account, bucket and parent prefix, uses the existing mkdir/cfCreateFolder route and checks the child listing before presenting success. The current listing updates locally when applicable; a child created inside another visible folder does not appear at the wrong level. Existing mutation readiness checks remain in force.

Simple destination cards now have an inline + creator. It checks existing children, creates through cfCreateFolder without implicit provisioning, independently checks children again, and adds the verified path to the pending destination. Its stable destination ID is preserved. Save menu remains the explicit step that publishes destination edits to Chrome. Errors preserve the input. Nested setup retains the existing editor/creation engine, removes its modern folder-creation restriction, focuses the new child input, adds cancel controls, and verifies creation before marking the node ready. Sibling locations remain intact. Existing bucket creation is still separately gated; + folder does not create a bucket.

The Dashboard mode selector now persists Simple/Nested immediately through the existing revision-checked save transaction. It does not commit pending destination edits merely to switch layout. Native Chrome checkbox changes use the same serialized save lane, then await menu rebuilding. Clean Dashboard windows reload storage changes; dirty windows reflect the external mode while retaining their draft and rejecting stale saves. Existing stable menu IDs, exact routing, serialized rebuilding, Chrome callback error reporting and retry-by-Save are preserved. Native deep destinations flatten under the first folder tier with path-qualified labels and unchanged destination IDs. Dashboard indentation is capped after the initial levels, with full paths retained.

ZIP/CBZ **Image Reader is the new default**. Selecting an archive loads its first supported image in the shared Side or Window Preview. Images across nested folders use deterministic natural path ordering. Existing Previous/Next and focused reader arrows move within the archive, with disabled boundaries and a Page N of M label. Switching preview presentation retains the page and DOM. Window image lightbox remains available. Ordinary file preview resumes after closing or changing selection.

The reader uses archiveEntries/cfArchiveEntries and archiveEntryUrl/cfArchiveEntryUrl with no implicit provisioning. It requests only the current image, with no whole-archive extraction, background prefetch or accumulation of page URLs. Cancellation and session/request tickets reject late index/page results. Page failures retain navigation and offer Retry page for a fresh signed URL; index failures offer Retry archive. Archives without images offer Browse Archive. Explorer preferences now persist Image Reader versus Folder Browser (Classic), including storage notifications. Saved Classic choices survive reopening. Browse Archive temporarily opens the existing virtual folder dialog without changing the preference. Classic breadcrumbs, Up, individual previews, selection and explicit Extract Selected remain intact.

## Exact changed files and purpose

| File | Change |
| --- | --- |
| `extension/beta/explorer.html` | Toolbar pairs, inline folder form and archive preference. |
| `extension/beta/dashboard.css` | Keep toolbar pairs together during wrapping. |
| `extension/beta/explorer.css` | Compact creators, folder +, capped nesting and reader metadata controls. |
| `extension/beta/explorer.mjs` | Inline creation, shared archive-reader state, cancellation, navigation, selection and preferences. |
| `extension/beta/destinations.js` | Simple creation, modern Nested creation enablement, immediate mode persistence and draft-safe synchronization. |
| `extension/nested-menu-editor.js` | Reuse existing child creation with focus/cancel, read-back verification and depth metadata. |
| `extension/background.js` | Serialize native mode changes with saves and cap native flyout nesting. |
| `tests/beta-explorer.test.mjs` | Update intentional interaction changes; add six reader/toolbar/inline/cancellation regressions. |
| `tests/modern-destinations.test.mjs` | Update mode contract; add four creation, draft and deep-menu regressions. |
| `tests/nested-locations.test.mjs` | Supply/assert serialized rebuild dependencies in native checkbox fixture. |
| `docs/verification/instant-folders-reader/results.json` | Baseline/final failure-name comparison and gate results. |
| `docs/verification/instant-folders-reader/reader.log` | Six passing focused interaction tests. |
| `docs/verification/instant-folders-reader/menus.log` | 31 passing menu tests and two retained baseline failures. |
| This handoff | Implementation, limitations and delivery record. |

## Verification and remaining work

Baseline full suite: **650 tests, 609 passed, 41 failed**. Final full suite: **660 tests, 619 passed, 41 failed**, with the exact same failing names. Ten new tests pass. No assertions were weakened to hide historical failures. Old modal/archive-default tests now exercise inline creation or explicitly select Classic, preserving their original operation checks.

Focused reader checks: **6/6 pass**, including Side/Window pages, natural chapter sorting, unchanged archive hash, no extraction messages, mode switching, focused arrows, cancellation, out-of-order responses, fresh URL retry, exact child creation and saved Classic. Menu checks: **31/33 pass**; the two existing failures concern an incomplete transfer-click harness and the removed legacy drag handle. Simple and Nested creation tests verify exact parent messages and resulting saved configuration; native-menu mocks verify actual create calls and stable IDs, not merely editor appearance.

`npm run check` passes. `npm run reliability:check` remains failed: syntax, API registry and issue inventory pass; architecture freshness fails. The full regression stage retains baseline failures. Diagnostic onboarding commands and Forever model discovery were executed. Frozen evidence hashes and unrelated baseline defects were not rewritten.

**Incomplete acceptance:** no installed Chrome context-menu click or real R2 write/read was performed. There is no local browser executable, so visual QA at narrow widths, real focus/Enter behavior, theme appearance, activation animations and rendered signed images need browser acceptance. Mock menu registration is not proof Chrome accepted the installed extension's menu. MemoryBucket and message assertions are not live R2 confirmation. Real expired signatures, provider permissions, very large/corrupt archives and unsupported image decoding require live follow-up. The reader has bounded current-page requests and index validation, but no new large-index performance benchmark. Other Legacy folder-selection surfaces were preserved, not comprehensively restyled with the new creator. Chrome-native inline text inputs were not attempted.

Retest in an authorized installed environment: create consecutive children in Explorer/Simple/Nested; verify their R2 keys; rename/reorder/remove destinations and save; toggle both mode controls with multiple windows and dirty drafts; click actual native entries and verify destinations; select a multichapter CBZ in both Preview modes, use buttons/arrows, retry an expired URL, switch presentation and close during a read; choose Classic and selectively extract into a disposable destination. Confirm original archive hashes and public-access settings remain unchanged.

## Git delivery

Implementation and this report are committed together on the mandatory branch. The exact final commit SHA and push result are provided in the delivery response, since a commit cannot embed its own SHA. No merge, destructive cleanup, Worker deployment, bucket/public-access mutation or store publication was performed. Existing untracked fixture-download residue was left outside the commit.
