# CODEX P0: Verify and repair REAL Chrome native right-click menus; Cloudflare-only nesting

**Owner request, 2026-11-02.** This is an IMPLEMENTATION + BROWSER-VERIFICATION task, not a mock-only audit.

**Repository:** thanks-cohn/REDOWN  
**Starting feature branch:** codex/flat-provider-native-menus  
**Starting commit:** d692a0da878268d504f1ab9e5a9e130919f65043  
**Original pre-feature baseline:** 34b5f73de064172da915832d51c235bb110d7914  
**Current main:** reverted the feature through 455911af99ced82058588e57efd406236ae16192  
**Protected checkpoint:** checkpoint/2026-11-01-amoebe-before-flat-provider-menus (annotated tag 049542becd50a1e04a0ebfe2ecb6fbfa764d8f80). Do not rewrite, move or delete it.

**Branch discipline:** Work on codex/flat-provider-native-menus (or a new explicitly named child repair branch). First fetch and check the branch/head, verify the working tree, then inspect. Do not reset or force-push, and do not merge or push changes to main. Preserve all owner work; commit and push to the feature branch only when a real solution is implemented and verified. The owner locally checked out d692a0d, but did not observe a visible difference. The exact menu/screenshot/state from that observation is NOT yet known. Do not invent it.

## 1. User-visible, non-negotiable product contract

Only **Cloudflare** may be hierarchical/nested. Google Drive, Dropbox and OneDrive must be **flat, single, directly clickable native menu rows** under REDOWN in every state. No provider nested menu, no second-click Connect/Save child, no duplicate row. Preserve provider independence and isolated OAuth/transfer engines.

Desired structure when Cloudflare has multiple configured eligible destinations:

~~~text
REDOWN
  Cloudflare     > [existing V3 Simple or Nested hierarchy, unchanged]
  Google Drive     [ONE direct action, never arrow]
  Dropbox          [ONE direct action, never arrow]
  OneDrive         [ONE direct action, never arrow]
  ---------------- [existing eligible controls, if any]
  Home/Manage      [existing navigation semantics; resolve approved final order]
~~~

If Cloudflare itself has only a verified single destination, follow its *existing approved V3 leaf semantics*; introducing other providers must NOT force Cloudflare into a submenu. If Cloudflare has no configured destination, preserve V3 setup affordances. Cloudflare Simple and Nested/Narrow/Depth(=internal Level) must remain correct, including verified root defaults and exact prefix resolution. The one-click non-Cloudflare rows are visible even while disconnected if the existing approved design uses them to initiate explicit connection. During a connecting/busy state, a single row can be disabled; it must never be replaced with a child. If an unusable provider state requires reauthentication, the same row must route into the existing authorized connect/reconnect mechanism. Never treat an attempted login as a verified save.

**Important ambiguity to resolve against authoritative current specs:** older documents sometimes say a separator then 'Home last'; current code renders 'Go Home' and 'Manage destinations…' as distinct controls, and Simple may not add that separator. Preserve the user's actual current approved controls, but document and test the agreed final order. Do not silently delete Manage or redesign Cloudflare to make screenshots look simpler.

## 2. Investigation already conducted for this handoff: grounded source map

Read source at feature commit d692a0d; do not assume later branches or historical design reports are runtime truth.

- extension/manifest.json: Manifest V3, actual background.service_worker is **service-worker.js**, version 0.5.27. All loaded extension files must come from the feature branch's extension/ directory.
- extension/service-worker.js: invokes background.js by importScripts; only the fallback toolbar bootstrap runs if core loading fails. A fallback toolbar is NOT proof the native menu writer loaded.
- extension/background.js:1 and extension/entry-bootstrap.js: toolbar starts before other dependency imports. The native menu registration path is later and can fail independently.
- extension/background.js:903-946: many imports and provider initializations occur before native menu listener/reconciliation installation. Any import/evaluation failure here can leave toolbar recovery working while menus do not register.
- extension/background.js:2358-2371: menuApplicationKey includes a 'v3-flat-providers-1' revision string plus provider states, so previous acknowledgement should be invalidated.
- extension/background.js:2372-2429: rebuildMenus and reconcileMenus: serialized rebuild, first ensureMenuAccess, status 'applying', V3 migration/snapshot, deterministic build, callback acknowledgement, state 'registered'/'superseded' or 'failed'.
- extension/background.js:2431-2453: callback-bound Chrome contextMenus update/create/remove and ROOT 'redown' plus 'redown-manage' access.
- extension/background.js:2454-2556: the ONE shared native writer. Cloudflare V3.project generates its branch. Google Drive compose, Dropbox composeSibling, OneDrive compose add top-level rows. Every old child ID is removed by obsolete(); the ordered structure is reconciled through native callbacks and cached rightClickNativeIds. No removeAll was added by d692a0d.
- extension/background.js:2721-2733: register onInstalled, onStartup **and on every worker load**, after dependencies evaluate.
- extension/background.js:2855-2892: changes to provider state trigger rebuildMenus; ONE contextMenus.onClicked listener delegates to OneDrive, Dropbox, Google Drive by namespace, then Cloudflare V3. Click action and visible menu shape must be verified separately.
- extension/google-drive-menu.js: fragment emits exactly provider:google-drive with parent redown, compose inserts after Cloudflare subtree. Old :connect and :save-redown are obsolete.
- extension/dropbox-menu.js: fragment emits exactly provider:dropbox; old :connect obsolete; insertion uses Google Drive's shared composeSibling.
- extension/onedrive-menu.js: fragment emits exactly provider:onedrive; compose requires Dropbox predecessor; old :connect and :save-root obsolete.
- extension/google-drive-provider.js:19-21 connected + valid folder ID -> save via existing transfer page; otherwise connect. No new seamless/background transfer implementation.
- extension/dropbox-provider.js:43-66 direct row dispatch; source-host permissions.request currently runs before reading provider state, even on the connect path. This may cause prompts or block clicks and must be separately truthfully documented, not hidden by a menu-only fix.
- extension/onedrive-provider.js:60-76 direct row dispatch; disconnected -> existing auth.connect, connected -> source snapshot, auth.ready and upload; stale child ID receives explicit error.
- tests/flat-provider-menus.test.mjs: mock source tests assert exact native IDs, 125 state combinations, no child IDs, upgrade cleanup, click dispatch and status variants. These tests passed in the reported run, **but a mock Map is NOT Chrome's visible menu**.
- tests/helpers/background-worker.mjs: Chrome native calls are mocked by an in-memory Map, including simplified callback/error semantics. Test assertions cannot establish real native rendering or extension policy behavior.
- docs/FLAT_PROVIDER_MENUS_REPORT.md and docs/verification/flat-provider-menus/{results.json,native-trees.json,installed-chrome.json}: prior implementation report and evidence. Do not promote synthetic native-trees.json entries to actual Chrome screen evidence.

## 3. Confirmed verification gap and concrete harness defects

The prior installed Chrome attempt was **BLOCKED**, not a failed menu simulation and not a successful browser test: Linux Chrome 154 returned 'Loading of unpacked extensions is disabled by the administrator'. No installed-native arrows, actual user click, transfer receipts or visual screenshots were verified.

There is ALSO a separately inspectable harness mismatch: scripts/installed-chrome.mjs currently searches for a Target.getTargets service_worker target ending in **/background.js**; the actual manifest entrypoint is **/service-worker.js**. Fix this assertion before interpreting any future installed-worker result. This mismatch has NOT yet been exercised past the policy blocker, so do not label it the original cause of the owner's observed menu problem.

The same installed-chrome.mjs script only checks options/worker/debug/persistence and does not assert the visual native context-menu tree or actual menu-click routing. Add a scoped real-browser test path where browser policy allows, and a Windows manual verification protocol for cases where native menu UI cannot be automated. Do not bypass administrator policy or simulate successful installation. Browser policy, headless limitations and native menu automation limitations must be reported precisely.

## 4. Root-cause hypotheses; DISPROVE OR CONFIRM, do not assume

H1. User primarily inspected Cloudflare. Cloudflare was deliberately unchanged in d692a0d, so 'no visual difference' there is expected and not a failure. Establish what provider submenu the user saw and on what right-click target.

H2. Wrong extension/build/profile loaded (old unpacked copy, duplicate installed Store+unpacked REDOWN, stale extension ID/path/profile, worker not reloaded). Compare chrome://extensions unpacked path, extension ID and manifest version against checked out commit. Report without exposing tokens.

H3. Native menu rebuild never successfully finished. Check actual core import, rightClickMenuStatus.state / desiredGeneration / appliedGeneration / applicationKey, lastAcknowledgedAt, entryPointEvidence, worker console errors and BOOT diagnostics. 'registered' means APIs acknowledged a projection, NOT proof of human-visible rows. Confirm all on fresh profile and upgraded profile.

H4. Prior native children survive upgrade because the old ID inventory is missing or callbacks fail; previous menu versions/half-removed nested children remain. Test native deletion order, missing callbacks, 'not found', duplicate IDs, transient loss and restart. Never claim removeAll is a safe universal repair. Retired IDs are:
  provider:google-drive:connect
  provider:google-drive:save-redown
  provider:dropbox:connect
  provider:onedrive:connect
  provider:onedrive:save-root

H5. Parent/child or sibling-order composition diverges in real Chrome from the in-memory Map or from the requested final menu. Compare expected projection, actual registered IDs, callbacks and screenshot; make no assumption that Chrome supports querying all menu items. Note conditions when root/setup, separators, 'Go Home' and Manage render differently. Audit contexts ['link','image','video','audio','page'] against the clicked DOM target.

H6. Listener registration/evaluation ordering or background crash: if any imported module fails before onClicked/addListener, the toolbar fallback may work but menus do not. Introduce only minimal safe startup/reconciliation hardening; preserve single authority.

H7. State transition introduces unexpected disable/false save: provider phase 'connecting', stale/missing folder/root identity, previous transfer tab, permissions prompt. Verify a menu leaf exists separately from whether saving actually starts, and from whether transfer completes.

H8. The existing documentation/test contracts are inconsistent (older nested-other-provider proposals versus November 1 supersession; 'Home last' vs current Manage). Establish precedence using owner-approved November 1 text, not historical tests.

Make an evidence table of H1-H8 with observed proof (file:line, real logs/screenshots, test output), result CONFIRMED/REFUTED/UNVERIFIED, effect and actual fix. Identify the root cause(s) before changing production code.

## 5. Required implementation architecture

**Do not rebuild the V3 engine.** Keep extension/background.js as sole chrome.contextMenus writer and the sole onClicked dispatcher, with provider-owned pure fragments and provider-owned dispatchers. Use deterministic validation to guarantee:
1. For each of the three non-Cloudflare providers, EXACTLY one entry with id provider:<provider>, parentId redown, type normal, no other native entry with parentId that provider ID. No generic provider can ask for nested children. Reject extra children even if another module proposes them.
2. Cloudflare-only V3.project may produce descendants; preserve destination identity, user-selected prefix, CURRENT/INDEXEDDB authority, Simple / Narrow / Depth, registration and repair.
3. Flat provider order Cloudflare, Google Drive, Dropbox, OneDrive, then existing approved controls; parent-first creation, child-first removal, strict namespace routing, no collision.
4. Reliable migration of all five historical child IDs and unknown old registrations without using an unsafe global removeAll; storage cache is advisory, not proof an ID exists. Explain behavior when callback fails midway and worker reloads.
5. A verified application key, native acknowledgements, retryable failure, stable in-worker plan caching, explicit user-facing pending/failed state without claiming 'applied' prematurely.
6. Button click chooses connected save vs disconnected connect; proper busy/reconnect/expired state. No implicit multi-provider login, no unauthorized save, no silent source permission scope expansion.
7. Never leak source pageUrl/srcUrl/frameUrl/linkUrl or browsing/history provenance to Google/Dropbox/Microsoft cloud APIs; if a provider needs source bytes, browser-mediated retrieval is REDOWN-owned. Preserve correct destination filename/extension and limited necessary metadata. DO NOT rewrite OAuth, cloud transfer transport or privacy boundaries merely to fix menu display. Separately identify existing permission-dialog/transfer limitations.

Do not put any provider menu builder in a second service worker, page, extension script or independent registrar. Keep Cloudflare namespace and Chrome menu ownership unchanged. Refactor only if tests prove it is necessary.

## 6. Real verification: required matrix

A. **Fresh clean profile, clean extension install**, no cloud connections: real right-click on image, link, video, audio, page. REDOWN exists; each of Google Drive/Dropbox/OneDrive is a direct leaf (no right arrow); Cloudflare correctly exposes setup/eligible V3 choices. Clicking one non-Cloudflare row initiates ONLY that provider's existing authorized connect path, never another provider. Capture screenshot/video or independently witnessed native tree and service-worker logs.

B. **Existing/upgraded profile**: install prior pre-flat build (34b5f73) in an isolated copy, create legacy menu/ID state, then upgrade to candidate with same extension ID and profile. Verify all five stale children disappear; parent row is actionable; no duplicate menu ID or stray submenu. Reload extension, restart Chrome and terminate/restart MV3 worker; verify re-registration and persistence.

C. **Connected**: with consented test accounts only, each leaf triggers exactly one appropriate save action with valid filename/extension and verified provider-specific destination. Record actual provider receipt; do not claim end-to-end PASS from fake API responses. Test identity mismatch, expired auth and reconnect; failed/uncertain transfer does not become success.

D. **Connecting/busy/error states**: disabled/inert when appropriate; no duplicate login, no stale submenu, bounded retry and honest error.

E. **Cloudflare isolation**: V3 Simple default leaf/subtree, Nested Narrow, Nested Level/Depth 1-10, user-configured siblings, exact bucket/prefix, Apply and native acknowledgement, restarts and independent child click. Snapshot V3 config and verify unchanged after provider menu repairs.

F. **Fault injection**: contextMenus.create/update/remove failures, callback lastError, callback never invoked/timeouts, missing parent, stale rightClickNativeIds, storage failure, core import failure, concurrent Apply + provider auth change, forced MV3 worker restart. Ensure no false green. Retain usable root/Manage recovery.

G. **Browser duplication/cache isolation**: prove which Chrome profile, extension path, extension ID, manifest version and commit is loaded. Avoid assuming a new Chrome profile removes enterprise policies or the browser's restrictions. Test reload and cache separately; do not attribute to 'cache' without proof.

H. **Expected controls**: verify separators and Home/Manage arrangement under both Simple and Nested. The three flat provider rows never change to submenus under any state.

Run relevant node tests, npm run check, npm test and npm run reliability:check, with exact baseline comparisons and unfiltered counts. The previous full baseline 980 tests / 883 pass / 97 fail; candidate was 985 / 888 pass / 97 fail with zero newly failing names. These 97 are PRE-EXISTING and **NOT evidence that the flat feature caused them**. Do not 'repair' historical assertions just to greenwash; classify any newly failing tests and clearly separate unrelated 97.

## 7. Diagnostic additions required (safe and bounded)

Add a debug-only, read-only, sanitized 'Native Menu Truth' inspection/export (or extend BOOT's existing diagnostic lane) that distinguishes:
- expected projection (root+parent-child IDs, names, states, configuration revision) calculated in extension
- most recently attempted vs acknowledged native operations (method, stable ID, success/error category, time, generation)
- stored menu status and ID cache, manifest version/worker epoch/extension ID (only if safe)
- last dispatch ID/owner/action type/blocked reason, with no URLs/tokens/private filenames
- 'Chrome's actually displayed menu' = UNKNOWN until real-browser visual evidence; do not manufacture a native inventory API.

No source URLs, access tokens, OAuth codes, account IDs, bucket secrets, private history, file names or raw page data in diagnostics. Avoid adding a second authority or excessive persistent events. Make exporting/debugging opt-in, disabled normally, preserve user privacy.

## 8. Required handoff and receipts

Produce an evidence-backed report in docs/ with:
- architecture diagram: browser activation -> service-worker.js -> background imports -> rebuildMenus -> shared writer -> Chrome native tree -> one onClicked -> provider adapter or Cloudflare V3 -> verified receipt
- exact bug root cause with file:line, minimal reproduction and before/after source/installed evidence
- evidence table for H1-H8 (CONFIRMED/REFUTED/UNVERIFIED)
- screenshot(s) or truthful reason unavailable; a clean-profile screenshot of the submenu is mandatory for **browser-verified** status
- unit/mock matrix and real-browser matrix, distinct PASS/FAIL/BLOCKED/NOT_TESTED columns, installed Chrome/OS/version/profile/build details (sanitized)
- full command logs, SHA/commit, test names introduced/resolved, reliability result, baseline failure accounting
- explicit limitations of Google Drive transfer-page save, Dropbox permissions, OneDrive upload-host issues not solved by flat menus
- final change inventory, preserved V3 identity/config proof, protected tag proof, exact commit SHA/feature branch
- practical Windows test instructions for the owner and a minimal screenshot/error bundle request only if Codex cannot run real Chrome.
- commit and push completed repair only on the feature branch; NEVER merge into main absent the owner's later explicit approval.

**Acceptance criterion:** An actual, properly identified Chrome installation on d692a0d+repair shows REDOWN -> Cloudflare (its authorized V3) + Google Drive/Dropbox/OneDrive (each EXACTLY one direct native leaf), and direct clicks route correctly after fresh install, upgrade, and worker restart. If browser verification is policy-blocked, report the implementation as unverified and prepare a reproducible owner-run Windows verification protocol; do not claim the incident resolved.

**Process:** INSPECT -> REPRODUCE -> ROOT-CAUSE -> MINIMAL PATCH -> NEGATIVE/REGRESSION TESTS -> REAL CHROME PROOF -> REPORT -> COMMIT -> PUSH TO FEATURE BRANCH. No force push, reset, tag changes or unrequested main merge.
