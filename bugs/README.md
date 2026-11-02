## Latest paired P0 implementation — 31 October 2026

The Simple Cloudflare structure and false REDOWN toolbar warnings are now repaired in production source and tested together. [Implementation, permission ownership, evidence and remaining foundation phases](../FOREVER_WORKS/v3/SIMPLE_CLOUDFLARE_AND_TOOLBAR_BRANDING_REPAIR.md). Normal Simple uses Cloudflare, preserving the verified redown root and flat exact targets; launch pending/unknown/late-success states keep a friendly title and never write `!`. Global/tab cleanup preserves valid transfer feedback. Chrome-owned site-access notices are unaffected. Depth/partial Reload retention is also implemented as a bounded first foundation phase. **Installed Chrome/visual/live-provider acceptance remains pending; original clean-profile incident is not closed.** Older owner reports below are retained as history, not the latest implementation status.

## P0 — CURRENT/indexedDB authority and native right-click recovery not yet implemented as a unified system

**Required behavior:** Chrome native menu is pre-registered from CURRENT, not loaded from a JSON file or cloud scan when right-clicking. On a verified user change, transactionally update only affected CURRENT/WORKING records + journal, then immediately reconcile the registered menu; an incomplete inventory, MV3 restart or temporary cache failure cannot erase untouched known authorized branches. Daily default has immutable BACKUP and mutable WORKING with CURRENT always latest. Maintain Cloudflare as provider heading for future sibling Google Drive/OneDrive/S3 implementations; no fake connected providers. [Canonical production implementation handoff](../docs/CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md). **New architecture is specified, not yet demonstrated in installed Chrome.**

---

# REDOWN bugs

## P0 — Dropbox reconnect fails namespace verification; earlier saved files not visible (2026-11-01)

**Status:** OPEN, owner reproduced in installed Chrome; exact Dropbox root guard identified in `extension/dropbox-auth.js`; no live Dropbox files inspected and no repair claimed. REDOWN reports `Dropbox connection needs attention. Reconnect or try again.`; every reconnect yields `This Dropbox namespace is restricted or ambiguous. A Full Dropbox user root is required.`; previously saved files cannot be located. Current code rejects non-`user` roots or `root_namespace_id !== home_namespace_id` without testing the effective authorized root and hides Open Dropbox during reconnect. Distinguish an unsupported app-folder/restricted grant from an authorized team namespace; preserve `dropbox:jobs` and History, reconcile exact completed receipts remotely and do not assume file deletion or retry uncertain commits. **Required:** evidence-preserving account/root diagnostics, correct authorized namespace handling, actionable errors, always-accessible Open Dropbox, and installed-Chrome/live-provider acceptance. [Full critical P0 bug, precise reproduction and tests](CRITICAL/2026-11-01_P0_DROPBOX_RECONNECT_NAMESPACE_REJECTION_AND_MISSING_SAVED_FILES.md). [Dated task P0.8](../NEED_TO_DO/11012026.md).

---

## P1 — Dropbox naming, broken cross-cloud SAVE-IMPACT pulse and temporary themed SUCCESS! (2026-11-02)

**Status: OPEN, owner reported after the last Codex run; filename issue needs more testing, and no installed-Chrome/live-provider/visual acceptance is claimed.** Four separately verifiable corrections: **(1)** Dropbox must prefer the real safe file name **with extension**, retaining the existing numerical collision fallback and sending no new source/page/History metadata to Dropbox; **(2) LATEST OWNER CORRECTION:** the falling ball **WORKS** and must stay intact; it is the separate **SAVE-IMPACT pulse at the Shelf edge** that no longer triggers across Cloudflare, Google Drive, Dropbox and OneDrive. Audit `launchSaveDroplet` arrival, `redownShelfImpact`, Shelf event listener/CSS and all provider right-click dispatch routes, with real installed Chrome evidence; **(3)** NEON provider-card save counts must start **large and aesthetically integrated**, then shrink their font **only as increasing digits require more space**, while the confirmed count persists; **(4)** SUCCESS! is always temporary and theme-specific: in **NEON**, the full word flashes in **money-green + yellow dual-color shadow/offset** and disappears (NO non-Neon letter-by-letter/third-hold requirement); in **other themes only**, it uses a **professional Roman/classical-inspired italic serif**, **appears letter by letter, flashes on/off twice, appears a third time, holds briefly, then disappears**. **At rest** all cards have NO SUCCESS! or active ball, only their normal provider identity/controls/status and the durable provider save number; NEON's number starts BIG and shrinks solely as extra digits require. Each genuinely new verified save retriggers the full sequence; only the count remains. Only genuinely verified new file saves trigger either celebration. The permanent count and transient celebration are distinct. Require actual installed Chrome/provider save receipts, visual recordings, theme/responsive tests and no false success on error/retry/restore. [Focused Codex implementation request](../NEED_TO_DO/CODEX/CODEX_REQUEST_P1_ALL_CLOUD_SAVE_IMPACT_AND_THEME_SUCCESS_2026-11-02.md). [Full November 2 bug report, design contract and test matrix](2026-11-02_P1_DROPBOX_FILENAME_AND_SHELF_PROVIDER_CELEBRATION_REGRESSIONS.md). [November 2 to-do](../NEED_TO_DO/11022026.md).

---

## P0 — Simple menu shows Buckets and places custom labels beside it (2026-10-31)

**CORRECTED OWNER MODE HIERARCHY (supersedes mistaken assistant three-peer proposal):** Keep **TWO top-level modes, Simple and Nested**; Nested offers **Narrow** (only explicitly configured destinations in their natural hierarchy, no bucket-wide discovery) **OR Depth** (actual authorized discovered directory hierarchy with depth 1–10). Do NOT move Narrow outside Nested, create three peer modes, erase old saved submode values or change the current polished selector needlessly. Internal `nested:'narrow'` remains Narrow and `nested:'level'` remains Depth. Recheck UI, mode switching and native menu routing with regression tests. [Corrected canonical P0 work request](../docs/CODEX_V3_P0_SIMPLE_CLOUDFLARE_AND_RIGHT_CLICK_FOUNDATION.md).


**Latest important state transition:** After **any** additional labeled child is configured or another eligible Cloudflare bucket is discovered, `Cloudflare` becomes a submenu with `REDOWN` as its **first directly actionable leaf** (exact root of verified bucket `redown`), plus other custom-label or bucket-name leaves as flat siblings. The original default must not disappear. Collapse back to direct `REDOWN → Cloudflare` only when there are no other eligible children/buckets. No `Buckets` heading, no third Simple navigation level and no duplicate `REDOWN` leaf. [Canonical urgent Codex contract](../docs/CODEX_V3_P0_SIMPLE_CLOUDFLARE_AND_RIGHT_CLICK_FOUNDATION.md).

**Owner observation:** Native V3 Simple right-click currently shows a separate `Buckets` submenu for globally activated buckets and puts newly added Simple locations at REDOWN's root alongside Buckets. **Expected latest behavior (latest owner clarification):** with only the default bucket and no other eligible discovered buckets/custom locations, only `REDOWN → Cloudflare` direct save to the **verified root of the actual lowercase R2 bucket `redown` (`prefix: ''`)** for the established account, regardless of Explorer selection; with one or more custom labels, `REDOWN → Cloudflare → Menu Label` siblings, never deeper, and never a Buckets submenu in Simple. Cloudflare is the provider display name, not a literal bucket identity.

**Source-confirmed mechanism:** `extension/right-click-v3.js:project()` builds Simple entries with `parentId:root` and unconditionally prepends a `v3:buckets` menu for activated buckets in its non-Level path. `resolve()` and `background.js:buildMenus()` must be updated consistently to preserve exact save targets. Older flat-Simple docs are superseded by this owner's newest hierarchy rule. **Implementation request:** [urgent Codex V3 Simple Cloudflare fix and right-click reliability foundation](../docs/CODEX_V3_P0_SIMPLE_CLOUDFLARE_AND_RIGHT_CLICK_FOUNDATION.md). **Not fixed by documentation; installed-Chrome verification pending.**

---




## P1 visual trust — false redown toolbar exclamation and technical hover title (2026-10-31)


**Latest P0 prioritization:** The owner requires this fixed **in the SAME urgent Codex delivery** as the Simple Cloudflare right-click restructuring: [complete combined implementation contract](../docs/CODEX_V3_P0_SIMPLE_CLOUDFLARE_AND_RIGHT_CLICK_FOUNDATION.md) (section 6A). `SHELF_READINESS_UNKNOWN` / `SHELF_OPEN_PENDING` are not license for `!` or an alarming raw hover tooltip. Repair late-success, generation and per-tab/global badge/title cleanup and preserve the Shelf-first/attached-pop-out-only/no-both rule. Genuine errors belong in local diagnostics/recovery UI; do not claim control over Chrome-owned site-access notices. **Not implemented by this documentation.**


**OWNER REPRODUCTION:** The Shelf and REDOWN functionality appear to work, but the Chrome toolbar icon displays an unwanted exclamation badge and hover includes `Chrome accepted the Shelf request; local readiness is unconfirmed. No second panel was opened.` followed by `Wants access to this site`.

**CONFIRMED CODE CAUSE:** `extension/entry-bootstrap.js:56–61` explicitly sets the literal `!` badge and arbitrary title from `launchIndication`. At `entry-bootstrap.js:126`, a resolved Shelf opening with failed readiness handshake invokes that misleading warning. At `entry-bootstrap.js:112–119`, a 2.5-second pending timer also triggers `!` and invalidates its generation so a successful late Shelf result can fail to clear it. Thus functional UI can appear broken. **The Chrome phrase `Wants access to this site` is a separate browser-managed site-permissions string** and must be diagnosed without suppressing Chrome security indicators or broadening grants.

**REQUIRED WORK FIX:** [Focused Codex audit/implementation specification](../docs/CODEX_P1_TOOLBAR_BRANDING_BADGE_TOOLTIP_PERMISSION_AUDIT.md). Neutral/unverified is not a failure. Restore branded icon/title for accepted, pending, late success, and actually ready Shelf; preserve private Diagnostics and genuine actionable error/recovery state, clean per-tab/global badge/title overrides, respect Chrome-owned permission notices and preserve Shelf-first/attached-pop-out-only/no-double-interface behavior. Native Chrome visual acceptance remains open. **Not implemented by this documentation.**

---

## P0 toolbar fallback correction — native attached panel only (2026-10-31)

**Status:** corrective production implementation and local regression tests complete; **installed Chrome acceptance unavailable; original fresh-profile incident remains open**. The prior `1aa1d0e` launcher created a detached `windows.create({type:'popup'})` window and could treat readiness/timeouts as failure. This violated the clarified owner contract. It now attempts native `action.openPopup` only after definite Shelf rejection, arms an explicit next-click native recovery route when rejected/unavailable, and never automatically creates a window/tab or changes the saved mode. Accepted or pending Shelf requests never trigger an automatic second interface. Explicit Popup preferences are restored/preserved. [Architecture, limitations and evidence](../docs/reliability/ATTACHED_TOOLBAR_POPOUT_CORRECTION.md).

## EMERGENCY P0 — clean Chrome profile REDOWN toolbar click opens nothing (2026-10-31)

**Status:** **OWNER-REPRODUCED IN INSTALLED CHROME / ROOT CAUSE UNKNOWN / NOT FIXED.** Fresh Chrome profile, newly installed REDOWN, click extension toolbar icon: no visible Shelf, popup or other UI. This is a first-run release blocker even when there is no Cloudflare OAuth state. Previous source repair of `sidePanel.open()` rejection to local Shelf tab was mock-tested but never installed-Chrome-accepted. It does not cover the click never reaching the worker listener.

**Required investigation and implementation:** [Full P0 Codex Work specification](../docs/CODEX_EMERGENCY_P0_FRESH_PROFILE_TOOLBAR_NOOP_AND_FAILSAFE.md). Inspect cold worker evaluation/handler registration, manifest and packaged files, action popup-versus-onClicked conflicts, async preference setup, tab/window and user-gesture rules, side-panel API and UI paint, popup and local-tab/Options fallback. Implement a proven Shelf-first launcher with **only the existing Chrome toolbar-anchored REDOWN mini-dashboard pop-out** as an automatic alternative. **A standalone popup window, tab or detached interface is explicitly forbidden** as a replacement. Preserve user preference, source code and privacy-safe diagnostics; investigate Chrome's popup-vs-onClicked gesture limitations rather than promising an unsupported same-click action. An actual clean installed-profile first-click result is mandatory for acceptance; do not mark fixed from mock tests.

---

## P0 V3 Level Depth saved, but native menu does not promptly show updated folders (2026-10-31)

**Status:** Owner-reported in installed Chrome; source inspection establishes asynchronous discovery/generation-reconciliation hazards, but exact first-Reload timeline is **not yet reproduced**. **Code fix not yet implemented.**

**Reproduction report:** User changed Level Depth from its prior value (menu initially showed Depth 2), clicked Save Changes, and saw no expected menu change. First Reload appeared to do nothing; a further depth change, Save and Reload finally produced updated folder entries. The exact new Depth values and elapsed timing were not captured; do not invent them.

**Source mechanism:** Depth `onchange` writes `setRightClickV3Presentation` immediately; Save Changes only confirms `applyRightClickV3` menu registration. `buildMenus()` starts `refreshV3Inventory()` as detached background work. A changed Depth invalidates the old inventory key, so the immediate projection contains roots but not deeper folders until discovery completes. `refreshV3Inventory(force)` returns any existing in-flight `v3InventoryRefresh` regardless of generation; Reload can therefore await an old-depth operation rather than guarantee a latest-depth scan. Superseded discovery schedules another rebuild later. Current UI does not make the intermediate state visible.

**Expected:** Save latest Depth, register a truthful immediate menu projection, then progressively add deeper authorized folder entries on discovery completion. Show clear 'saved / loading / ready / partial' state and guarantee an up-to-date generation after overlapping Save/Reload requests. Do not require a second manual Reload or present a stale tree as complete.

**Acceptance/tests:** Hold an old-depth scan in flight, change Depth, click Save and Reload, then release the old scan; verify latest-depth inventory eventually registers without extra user action. Test rapid changes and partial/time-limited requests, preserve settings/drafts, run installed Chrome checks. See the bottom section of [the 2026-10-31 roadmap](../NEED_TO_DO/10312026.md) for the complete implementation scope.

## P0 V3 Setup does not automatically reflect global bucket activation (2026-10-31)

**Status:** Source-level UI refresh patch committed; installed-Chrome acceptance pending. **Priority:** P0 onboarding correctness.

**Owner reproduction:** After signing in and clicking **Activate Buckets**, the backend can successfully prepare multiple buckets and update Chrome's V3 right-click menu, yet the already-open **Right-click Setup** tree and bucket chooser keep showing the old pre-activation state until the user manually reloads. This misleadingly suggests activation failed.

**Source-confirmed cause:** `extension/beta/explorer.mjs` already emits `redown:destinations-ready` after activation and uses storage changes to track global activation. The `extension/beta/right-click-v3-ui.js` tree did **not subscribe to that event** or react to `profiles` / `rightClickActivatedBuckets` storage updates. It only refreshed the V3 configuration for unrelated storage keys or when the user manually clicked Reload.

**Implemented patch:** The existing V3 Setup now listens for activation completion and relevant storage updates, fetches the authoritative `rightClickV3Snapshot` from the current background, repaints the account/bucket outline, bucket chooser, Level-scope checkboxes and acknowledged Apply status **in place**, preserving current search, selection, expanded nodes, scroll and unfinished form values. It does not reload the page, enumerate Cloudflare buckets again or overwrite unsaved destination drafts. Rapid duplicate notifications are serialized/coalesced. If snapshot reconciliation fails, Setup keeps the existing state and offers its existing manual Reload fallback.

**Regression coverage:** Added tests to `tests/global-bucket-activation.test.mjs` for event-driven activation refresh and preservation of search/form/scroll on storage-triggered refresh. **This environment has not executed Node tests or installed Chrome; test outcomes are unverified.** Validate on the user's installed Chrome: after global activation, all prepared account/bucket roots and dropdown options appear immediately in the currently open V3 Setup, without page reload; partial activation shows available buckets; switching menu modes continues working; unfinished user inputs are retained.

## P0 global activation / Legacy default regression (2026-10-31)

**Status:** Source causes repaired and locally tested; installed Chrome/live acceptance pending. [Complete repair and recovery report](../FOREVER_WORKS/v3/P0_V3_ONLY_GLOBAL_BUCKET_ACTIVATION.md). Implementation `139711a9de89d289a2bb7d4c4887120149e8d3bc`.

The old button used selected Explorer `context()` and per-bucket `cfProvision`, without seeding V3 destinations. Missing engine settings selected Legacy. V3 is now unconditional, migrated automatically and has no runtime selector/warning. Global activation enumerates all accessible account/bucket pages, verifies private profiles, preserves custom shortcuts, commits activated roots/default deep participation and requires acknowledged root coverage. Root access is independent of folder inventory and Explorer selection. Partial failures retain successful buckets and offer retry; saved preparation work resumes through existing alarms/startup. The green prerequisite button reflects global state and respects reduced motion. Migration has a retained original snapshot and credential-free Settings recovery export.

Focused 140/140 plus three targeted fixture regressions pass; full reliability 679 pass / the same 69 failed names / incomplete. Syntax/registry/issues pass, architecture freshness fails. Installed Chrome unavailable, zero assertions; no live Cloudflare mutations. Existing pagination/store/native projection budgets and unverified native/provider acceptance remain explicit limitations. Prior toolbar incident uncertainty is unchanged.

## P0 incident: toolbar opens nothing and native REDOWN menu disappears (2026-10-31)

**Status:** Source-confirmed failure mechanisms repaired and locally tested; original installed trigger and Chrome acceptance remain open. [Emergency report, implementation commit and exact manual tests](../FOREVER_WORKS/v3/P0_TOOLBAR_AND_CONTEXT_MENU_EMERGENCY_REPAIR.md).

A native-create failure after `removeAll()` previously erased every entry again, with no recovery root. Worker-only restart did not necessarily rebuild. Toolbar panel rejection only logged a warning; panel setup failure blocked popup preference application. Repairs preserve/restore root and existing Manage action in the serialized lane, reconcile worker activation, supply the manifest Shelf path, and fall back to the existing local Shelf/Options when panel opening fails. No startup exception is reproduced with real imports; do not attribute the owner incident to a fabricated shared crash.

Published implementation: `22a86c65ea46b9f67c93a38ad4e302693ebd4431`. Focused 98/98; full reliability 662 pass / 69 unchanged failed names / incomplete. Installed Chrome attempted but unavailable (`CHROME_NOT_AVAILABLE_ENOENT`, zero assertions). No live provider verification or future repair/support subsystem. Configurations, accounts, destinations and History are preserved by the local regressions; installed acceptance remains pending.

## BUG — V3 Level inventory diagnostics leak into native right-click menu (2026-10-30)

**Status:** Open, owner-reported; source-level investigation required. **Priority: P0 menu polish and diagnostic separation.** Documentation-only report; no production fix or installed-Chrome verification claimed.

**Observed:** When using the V3 right-click menu, the owner sees disabled or explanatory menu entries resembling `Not all folders could be loaded` and `Some folders could not be read; inventory is incomplete.` Exact visible phrasing may differ. These are internal folder-discovery/inventory status messages, not destinations or actions, and make the native menu appear like a debug console.

**Expected:** Chrome's native REDOWN menu shows only legitimate save actions, navigational bucket/folder entries, and other intentional user commands. No inventory-incomplete, timeout, pagination, cache, or registration warning rows appear. Valid verified destinations remain usable during partial discovery, and missing/unreadable folders are never invented. Do not present partial inventory as complete.

**Diagnostics and recovery:** Preserve the underlying failure and completeness state in REDOWN's existing Debug/Diagnostics facilities, including safe account/bucket context, operation, counts, limits, timestamps, sanitized reason and retry guidance. If necessary, show a discreet actionable status in V3 Right-click Setup, not as a Chrome menu item. The planned `Save Changes`/Apply state must never claim full Level coverage when inventory is partial. Provide a legitimate refresh/retry path in Setup.

**Investigation leads (not established root cause):** Inspect `extension/right-click-v3.js` `levelProjection()` and `discover()`, plus `extension/background.js` native menu registration and menu-status projection. Determine exactly where warning strings become disabled native menu items; investigate root scope, listing/pagination, time and node/entry limits, incomplete cache and authorization. Keep error reporting separate from context-menu action projection.

**Acceptance and regression tests:** Synthetic and installed-Chrome checks for (1) no warning or diagnostic menu items in complete, partial, stale and failed discovery, (2) correct selectable IDs and exact save routing for valid entries, (3) warning/completeness information retained in Debug, (4) no false success in Save Changes, (5) refresh/retry behavior, (6) no inadvertent unauthorized folder exposure, and (7) Simple/Narrow/Level functionality preserved. Do not claim installed Chrome evidence from mocks.

### URGENT follow-up: exact warning, persistent menu snapshot, silent discovery and Save shimmer (2026-10-30)

**Exact owner-observed text:**

> Some folders could not be read; inventory is incomplete. Depth 10 · 40 known folders · 5/5 bucket roots checked. Explorer shows the full paged directory.

**Severity:** URGENT P0. This text should appear **neither inside Chrome's native right-click menu nor as noisy status text in Right-click Setup after Save**. Maintain meaningful error details in Debug/Diagnostics and a discoverable error/retry affordance only if a user action truly needs intervention.

**Desired behavior:** A successful initial menu registration should remain functional while discovery continues incrementally and quietly in the background, using bounded, cancellable, rate-limited work, retries/backoff and correct authorization boundaries. Do not stall Save waiting for a complete exhaustive Depth-10 traversal, and do not claim all paths are present when they are not. The Explorer's paged directory and Chrome's bounded native context-menu inventory are distinct: a partial menu must not falsely imply the Explorer lacks folders.

**Persistent snapshot proposal:** Design a durable, versioned `right-click.json` logical artifact holding a sanitized snapshot of configured destinations, selected authorized bucket roots, per-root discovery progress/cursors/freshness and the last successfully applied native-menu projection. Use Chrome-supported extension-writable storage (e.g. a serialized JSON object in extension storage or an explicitly created user-managed file where supported), **not a claim that MV3 can freely overwrite a packaged extension file**. Restore the last safe menu immediately on restart, reconcile changes in the background, atomically replace only complete validated projection generations and avoid full rescans on every right-click/Save. Never store provider secrets; invalidate affected roots on changes, and ensure stale cache cannot expose revoked destinations. Chrome native menu limits require bounded projections.

**Save interaction:** After clicking Save Changes, show no diagnostic text dump or inventory-count warnings in the normal Right-click Setup. Animate only a tasteful **circularly traveling shimmer around the Save button outline** while real persistence/apply work is in progress, with a readable static `Applying…` state, reduced-motion fallback, and completion acknowledgement; make it stop on verified completion, but never hide failures or falsely mark incomplete discovery as complete. If an actionable failure persists, disclose it through a concise accessible status/Retry and Debug details, not a silent infinite shimmer.

**Regression tests:** exact warning string absent from both native context menu and routine Save surface; partial discovery keeps working menu entries; staged snapshot restore after MV3 restart; freshness/authorization invalidation; new bucket/folder discovery without full re-enumeration; no duplicate or stale menu entries; no overlapping background scans; explicit error recovery; Save shimmer stops and status remains truthful; low-power/reduced-motion behavior; real Chrome testing clearly distinguished from mocks.

---

## BUG — Simple/Nested right-click destinations show duplicate “Files” labels and omit configured item (2026-10-22)

**Status:** Open; user-reported, source inspected, not reproduced against installed Chrome settings. **Priority: P1 menu reliability.** No application code changed in this investigation.

**Observed:** User enabled **Menu Label** naming, but the right-click destination menu showed two entries both named `Files`. Three destinations were configured/saved, yet only two were visible. User also described confusion between Simple and Nested menu behavior. The precise saved profile state and active mode were not available for inspection.

**Source findings / hypotheses (not proven causes):**
- `extension/background.js` `buildMenus()` computes Simple names with `displayName(label,prefix,bucket)`. When `simpleLabelFallback === "menu"`, an explicit nonempty label is used; otherwise it falls back to the deepest prefix segment or bucket. Two distinct entries pointing to a `Files` directory can therefore have indistinguishable titles if explicit labels are missing or not persisted as expected. Duplicate displayed labels are not detected.
- Additional Simple entries are silently skipped by `if (!item?.id || typeof item.prefix !== "string") continue;`. An invalid or incompletely saved entry may not render, without any user-facing diagnostic.
- `buildMenus()` also filters profiles using `showInContextMenu`, `explorerManaged`, and active mode. Nested destinations use `RedownNestedLocations.destinations(profile.nestedMenu)` and `item.name`, not Simple's `menuLabel` display rules; the **Menu Label** selector does not govern Nested mode.
- `extension/options.js` `simplePrimaryLocationField()`, `simpleExtraOptions()`, and `saveProfiles()` are relevant to whether the chosen labels, prefixes, IDs, and bucket selections persist. The additional row editor binds each `item.label`; the primary editor uses `p.menuLabel`.

**Investigation plan:** Compare sanitized `chrome.storage.local` values for `profiles`, `rightClickMode`, and `simpleLabelFallback` with all visible configured rows and actual Chrome menu IDs/titles. Never collect Cloudflare tokens or secrets. For every saved destination, log whether it is eligible, displayed, filtered, skipped, or failed creation, with explicit reason and stable ID. Check for duplicate IDs, missing or non-string prefixes, blank labels, stale settings, competing extensions, and menu rebuild races. Correlate rendered item ID to exact account/bucket/prefix and test actual transfer routing. Determine whether the report concerns Simple, Nested, or a mode-switch transition.

**Expected:** In Simple mode, all valid configured destinations are present as one-level menu siblings. With **Menu Label** selected, their explicit labels are respected; blank labels use the documented fallback. Never silently omit a saved destination; provide actionable validation or diagnostic evidence. Distinct destinations with identical displayed names must remain distinguishable, without changing user-defined labels behind their back. Nested naming remains explicit and consistent with its own configuration, and mode switches never corrupt or discard either configuration.

**Acceptance / regression tests:** Three saved options produce three correctly targeted menu items; verify primary + multiple additional options, labels, blank labels, same-named directories, distinct and duplicate IDs, malformed prefixes, visibility toggles, mode switches and reopening Chrome. Confirm exact destination bindings on click, and add menu-count reconciliation plus omission reasons to the agent debug surface. Report Chrome verification separately from unit tests.

**Source inspected:** `extension/background.js` `buildMenus()` and `addNestedLocations()`; `extension/options.js` `simpleExtraOptions()` and `simplePrimaryLocationField()`; `docs/SIMPLE_RIGHT_CLICK_MENU_CONTRACT.md`. This entry records an investigation, not a completed fix.

---


## Watch item — Asset domain hostname versus generated URL (2026-10-22)

**Status:** Not reproduced conclusively; preserve for investigation if reported again. No configuration or code changes made for this report.

**User observation:** Earlier file delivery used a subdomain, e.g. `https://cdn.9127000.xyz/7684.png`, whereas a newer file address was observed on the apex hostname, e.g. `https://webrev.online/when-people-get-their-facial-hair-removed-and-end-up-v0-5m5l1bk6lhth1.jpeg`. The user suspects the prefix supplied during setup might sometimes be dropped.

**Evidence checked:** Current `extension/background.js` uses `normalizeWebOrigin()` and `configureAssetDomain()`; the code derives `hostname = new URL(origin).hostname` and stores `customAssetDomain: hostname`, without intentionally stripping subdomains. Cloudflare's Workers-domain associations include `cdn.webrev.online` (Worker `redown-new-404399`), `test.webrev.online`, `cdn-2.webrev.online`, `cdn-6.webrev.online` (Worker `redown-extended-404399`), plus `new.webrev.online`, `ozempic.webrev.online`, and `4chan.webrev.online` on other bucket Workers. This confirms some subdomains have been registered but does **not** establish which subsystem generated the reported apex URL.

**Where to investigate next time:**
- `extension/options.js` → `assetCorsControl()`, input sent as `cfSetAssetDomain`, and displayed `result.hostname`.
- `extension/background.js` → `normalizeWebOrigin()`, `configureAssetDomain()`, stored `customAssetDomain`/`publicBaseUrl`, and `cfPublicAddresses` discovery.
- `extension/public-addresses.js` → constructed public URL labels and concatenation of exact object keys.
- Compare **input hostname**, Cloudflare **zone** (apex), Workers **domain association**, R2 **custom domain**, and final **generated URL** separately; ensure a parent-zone label is not mistaken for the registered hostname.
- Check whether the example URL came from REDOWN Worker `/assets/` serving, direct R2 CDN serving, or another link-generation workflow; don't treat an unrelated apex URL as evidence of a subdomain rewrite.

**Reproduction and acceptance:** Record the exact field value entered, UI status returned, selected bucket, copied URL, and Cloudflare domain read-back. Enter `cdn.example.com` for an authorized test zone and verify the full hostname is retained end-to-end without changing another bucket's routes. Ensure existing subdomain mappings remain untouched.

---


## BUG — R2 triple-dot directory object retrieval (2026-10-22)

**Status:** Source mitigation committed to `main`; Chrome end-to-end verification pending.

**Reproduction:** Cloudflare R2 bucket `extended`, key `works/...2/chapter_1/001.webp` (also `003.webp`). Cloudflare API object listing returns these real objects, but authenticated Cloudflare management API GET on that exact key returns HTTP 403 with an HTML `Attention Required!` page. The ordinary `works/-/chapter_1/001.webp` key returns HTTP 200. The user reports both configured public object URLs work, while REDOWN preview returns 403 and Chrome download reports the file unavailable.

**Before-change main commit:** `11a1da2c16c4b67fa34a4103b3dac08f2e517426`.

**Implementation commits:** `841fd090e41c6b14a3c790fe265f2eb5efa56f88` (source), `ad244f8a6623d960828b86427687a53abcd052f3` (manifest host permission), `ade9b2efd09cdffa066121a82a285095cf1c0654` (regression tests).

**After-change source/test commit:** `ade9b2efd09cdffa066121a82a285095cf1c0654`. The documentation commit that introduces this entry follows that commit; its hash is available in the GitHub history.

**Mitigation:** If an authenticated preview read returns 403, REDOWN asks Cloudflare for the bucket's managed public-domain configuration. Only if public delivery is explicitly enabled and the hostname matches Cloudflare's expected `pub-*.r2.dev` shape does it retry preview anonymously there. For keys containing triple-dot segments, download probes the authenticated route and uses the same public endpoint on 403. Otherwise the existing authenticated download route is preserved. No API tokens are sent to the public URL. Private buckets have no fallback.

**Caveats:** This is a guarded compatibility mitigation, not an explanation of the Cloudflare security rule. It cannot repair a private bucket's 403 or an inaccessible public hostname. Actual Chrome extension testing, download completion, and public-host permissions remain to be verified. Test source is committed but tests could not be executed here because the checkout was unavailable from the execution environment.

**Acceptance checks:** In installed unpacked extension, open and download `works/...2/chapter_1/001.webp` and `003.webp`; verify image bytes, no credential leakage to public endpoint, private-bucket denial remains denied, normal downloads are unchanged, and the expected observer/debug event records a management-route 403 with successful fallback.

---


Open reports recorded on October 3, 2026 (America/Chicago), against the v0.5.12 interface. These are reports and acceptance criteria, not completed fixes.

## Fixed — DBG-001: Nested editor cannot continue adding deep children (human testing pending)

**Status:** Fixed in source (`538006a`), regression tests added (`2a5e061`); **human Chrome testing pending**. Automated tests have not been run in this session because the checkout could not be retrieved from GitHub in the execution environment.

The Nested editor's asynchronous `run()` handler used to restore an outdated snapshot of disabled buttons after folder selection/creation. Its `+ Child` action could therefore remain disabled although the folder was ready. Row-specific eligibility is now recalculated after task completion for root selection/creation and folder selection/creation. Added regression tests for selection and multi-level creation. This is a **source fix**, not a verified browser outcome; do not infer that other Chrome context-menu depth constraints or R2 issues have been resolved.

**Human acceptance:** Reload the extension, select and create descendants at least five levels deep without reselecting the bucket, verify the full right-click menu hierarchy and exact destination after a safe test transfer, then report any unexpected errors. See [DBG-001](../docs/debug/DBG-001_NESTED_CHILD_DEPTH_DISABLED_STATE.md).

## BUG-001 — Bucket root must be a selectable nested destination

**Status:** Open · user-reported behavior / usability defect

The nested right-click menu does not provide the bucket's top-level location as the direct destination the user expects. A bucket must remain a valid destination even when it contains child folders; it must not require choosing a folder or adding a placeholder location.

**Expected behavior:** Clicking the bucket targets its root. In R2 terms, the destination prefix is empty (`""`), so a file is stored as `filename.ext`, rather than `files/filename.ext` or another child prefix. Hovering the bucket reveals its configured children.

**Acceptance criteria:**

- The nested destination configuration offers the bucket root as an explicit location option.
- Both an empty bucket and a bucket with configured children can be targeted at the root.
- A bucket-root transfer does not substitute a default folder or create a new folder.
- Selecting a child still targets that child's full path.

**Related:** BUG-002. The existing `Send here` workaround does not satisfy the requested direct-click interaction.

## BUG-002 — Replace “Send here” with click-to-send and hover-to-expand

**Status:** Open · interaction requirement

The user does not want a separate `Send here` menu item. It adds another step and makes the location hierarchy less intuitive.

**Expected behavior:** Every displayed bucket or folder is itself a destination. Clicking its name sends to that exact location. Hovering a location with children opens its submenu; hovering alone must never start a transfer. Leaves remain directly clickable.

**Acceptance criteria:**

- No `Send here` entry is needed or displayed.
- Parent and leaf locations are both directly selectable as transfer destinations.
- Child menus open on hover and retain a usable pointer path between levels.
- Simple and Nested remain mutually exclusive active modes.
- The same destination actions remain usable with a keyboard.

**Implementation constraint:** The current Chrome extension context-menu API renders a parent with children as a native submenu, rather than an actionable parent. The previous release retained `Send here` for that reason. Investigate a custom REDOWN menu surface to satisfy the requested interaction; do not remove parent-target access merely to hide the workaround. A custom solution must explicitly account for how it is opened from the page and how it interacts with Chrome's native menu.

## BUG-003 — Upload from computer: Add child produces a cramped, misaligned row

**Status:** CSS fix committed (2026-10-10); awaiting visual Chrome verification at 1366×768 and deeper nested paths

In **Upload from computer**, clicking **Add child** produces the layout shown in `image(20261004-040836).png`: beneath the selected `works` location, an indented child row contains an existing-child dropdown, a new-child field, another plus button, and a remove button. The existing-child label is clipped, and the action buttons extend to the right of the parent dropdown's width. The controls do not form a clear, consistently aligned hierarchy.

The screenshot shows `Upload destination: /works` while the new child row is still unselected. It does not establish that a child folder was created or that a transfer used the wrong path.

**Expected behavior:** Adding a child produces a readable row inside the selected parent, with existing-location selection and new-name creation clearly separated. Controls must fit the available panel width and remain understandable at the reported 1366 × 768 viewport.

**Acceptance criteria:**

- Parent and child rows align consistently; labels, fields, and actions remain readable.
- Adding further levels does not clip controls, cause horizontal overflow, or push actions out of their layout.
- Selecting an existing child does not populate the new-name field.
- Adding an empty child row does not create a remote folder.
- Once a child is selected or explicitly created, the displayed upload destination includes the complete parent/child path.

## BUG-004 — Nested dropdown interaction rebuilds and rearranges the whole editor

**Status:** Open · user-reported behavior with a confirmed full-render code path

In the **Nested · Cloudflare locations** settings panel, the user reports that clicking a dropdown makes the whole section appear to reload and rearrange itself. Selecting a location currently runs a full nested-editor render rather than updating only the affected row. Opening a dropdown without changing its value has not been independently verified to trigger a reload.

**Expected behavior:** Opening or selecting a dropdown feels local to that row. Update the selected row and, when its parent path changes, only its dependent descendant rows. Unrelated branches and account/preset cards must remain stable.

**Acceptance criteria:**

- Opening and closing a dropdown without changing its value does not rebuild the editor or fetch locations again.
- A changed selection updates only that row and the descendant locations that depend on it.
- Unrelated rows keep their position, collapse state, typed drafts, and loading state.
- Scroll position and focus remain stable; the entire section does not disappear and repopulate.
- The adjacent new-name field is never filled with the selected location's name.

**Relevant code:** `extension/nested-menu-editor.js` currently calls `render(context.profiles())` from selection handling / operation completion and replaces the container's children. Treat that as an investigation point, not proof of every aspect of the user's reported movement.


## Source fix — Simple location row clearing and explicit directory creation (human testing pending)

**Status:** Source implementation committed (`7c1b0d6`, `3ac4496`, `376d933`); regression tests added (`b6f2cda`); **automated test execution and human Chrome testing pending**.

The primary and additional Simple right-click destinations now share a small row-based path editor. Every row has an `×` that clears the selected segment and invalidates deeper selections **without removing the lower rows** or deleting R2 data. Lower rows remain available to choose children beneath a replacement parent. Every row also exposes a separate new-directory input and explicit `Create` button. Selection from a dropdown never copies the existing folder name into that input. Only the relevant path subtree is rebuilt; surrounding presets and settings controls remain mounted.

**Review limitations:** This is an initial implementation, not an independently executed/browser-verified correction. Regression tests were committed but not run in the current session because the execution container could not resolve GitHub to obtain a checkout. Existing issues concerning multiple independent presets, wider Simple panel rendering, real R2 path semantics, asynchronous interactions and UI polish require Chrome acceptance.

**Human acceptance:** Under Simple Mode, open a destination `bucket/one/two/three`, click `×` on `one`, verify three folder rows remain visible with no selections, reselect a different root folder and its immediate child without reloading the entire settings page. Create a new folder at both root and deeper levels; verify the creation input is initially blank, no folder is created by selection alone, and the right-click option points to the intended full path. Verify persistence after reopening the extension. Related: BUG-005, BUG-016 and the [debugging case](../docs/debug/DBG-002_SIMPLE_LOCATION_ROWS.md).

### Canonical Simple menu behavior — October 10 clarification

**Exactly ONE pop-out:** `REDOWN → [direct destination items]`. No extra preset submenu and no R2-folder-depth pop-outs. **Label:** explicit Menu label if entered; otherwise use the user-selected automatic-label rule: **lowest/deepest directory (default)** or **highest/root bucket name**. The fallback setting must be selectable in Simple settings; changing the displayed name must not change the actual transfer path. The flat-menu source fix (`c172731`) and default deepest-directory fallback are committed, but the **configurable bucket-name override is not implemented yet**. Ordering is a separate issue: preset Order exists; independent per-extra-option ordering does not.

See [canonical Simple Mode specification and verification matrix](../docs/SIMPLE_MENU_CANONICAL_SPEC_AND_STATUS.md). Do not mark unexecuted regression tests or Chrome verification as passed.

## BUG-005 — Cloudflare Simple mode cannot add multiple independent locations

**Status:** Open · source-confirmed editor limitation / user-reported requirement

The Cloudflare **Simple** right-click preset editor exposes one default-location builder per saved profile. Its **+ Child** control adds a deeper path segment; it does not create another independent saved destination. Users need multiple sibling destinations under Simple mode without having to confuse child folders with separate presets.

**Expected behavior:** Provide an explicit **+ Add location** control in Simple mode. Each destination independently selects an existing bucket and folder path (or explicitly creates a new location), has an editable menu label, and can be removed without deleting Cloudflare data. Keep Simple and Nested mutually exclusive as active right-click modes; retain both configurations when switching modes.

**Acceptance criteria:**
- Add, edit, reorder, and remove several independent Simple destinations, including paths such as `/images/`, `/videos/`, and `/projects/`.
- Adding a child extends only that destination's path; adding a location creates a separate destination.
- Every saved Simple destination appears in the right-click menu and sends to its exact R2 path, including the bucket root.
- Changing one destination does not reset another; changes survive reload and a new browser session.
- No remote folder or bucket is deleted merely by removing a menu entry.

**Relevant code:** `extension/options.js` `renderProfiles()` and `defaultLocationField()` currently render only a single Cloudflare default-location builder per profile. The menu-tree editor is rendered only for non-Cloudflare profiles.

### October 10 follow-up — remove any location row and create a directory at any level

**Status:** Requested Simple Mode enhancement; implementation and human testing pending.

Each folder/location row in the **Simple right-click menu editor** needs two independent, obvious operations:

1. **`×` Remove row:** Remove that previously selected location segment from this preset configuration, letting the user redirect its destination. Removal MUST NOT delete the R2 folder or objects. Removing a parent row must never silently leave descendants attached to an invalid path: either remove its dependent configured rows as a single explicitly explained configuration operation, or allow the user to reselect the parent while preserving the subordinate drafts in a clearly invalid/pending state. Do not remove unrelated presets or siblings.
2. **Create new location here:** Every row provides a separate new-folder name input and an explicit Create action scoped to that row's *currently selected parent path*. Existing-location dropdown selection and new-location text entry must be separate state. Selecting an existing folder MUST NOT populate the creation input. After confirmed remote creation, make the created directory available and selected at the correct level, allowing further child rows immediately.

**Acceptance criteria:**
- A visible, keyboard-accessible `×` exists for every removable Simple Mode location row; its label/tooltip explains **Remove location from menu**, not delete folder.
- The selected bucket remains explicitly represented. Removing a folder segment can redirect the preset to its valid parent/root; never silently redirect an upload to a different bucket.
- An inline creation field is available for every eligible folder level, including directly beneath the selected bucket and at deeper child levels; new folders are created only after an explicit Create action.
- Folder creation uses the exact account, bucket and parent prefix; failure or uncertain remote outcome does not report success or add a fictitious folder.
- Selection of an existing directory leaves the adjacent creation field empty unless an independently typed draft already exists; drafts are not copied from dropdowns.
- Adding, removing, or creating one row does not cause the whole Simple settings panel to rerender, lose scroll/focus, overwrite other drafts, or reset unrelated selections (see BUG-016).
- Configuration changes persist across reopening settings and rebuilding the right-click menu; actual destination paths are verified in tests.
- Retain the compact, functioning Simple Mode layout; add small `×`, `+` and input affordances rather than redesigning the editor.
- Add DOM regression coverage for middle-row removal, descendant invalidation/reparenting, create at root and deep parent, async create failure, selection/creation separation, and stable unrelated DOM.

**Preferred parent-row removal semantics (follow-up):** Keep descendant rows **in place as reusable empty selectors** rather than immediately deleting them. When a selected upper-level folder is removed with `×`, clear that selection and invalidate the full dependent path. All lower rows remain visible, retaining their layout but no longer claiming their previous folder choices are valid. The user can select a new parent and then reselect valid immediate child folders from the updated dropdowns. Never automatically reuse stale child selections or send to the old path. Disable transfer/save as a fully resolved location until the chain is valid, with a clear prompt such as **Choose a parent to continue**. An explicit **Remove this row and its descendants** action may additionally be offered to discard the whole tail. This is a configuration-only change; no R2 folders or objects are deleted. Test middle/top-row removal, stale asynchronous listing rejection, descendant reselection, sibling preservation and no full-panel rebuild.

**Related:** BUG-014 (dropdown must not fill new-name input), BUG-016 (Simple panel rerender), BUG-005 (independent Simple destinations). This request concerns **Simple right-click menu configuration**, not Upload from Computer or the Nested editor.


## BUG-006 — Explorer file list expands downward instead of paginating in a bounded scroll area

**Status:** Implemented on default branch (2026-10-10); awaiting installed-Chrome verification, especially large R2 cursor results and keyboard selection

Explorer visually extends farther and farther down the settings page as file rows accumulate. The current `renderFileItems()` slices by `explorerVisibleLimit` and increases that limit on **Show more**, appending additional rows instead of replacing a numbered page. The actual viewport/scroll CSS impact still requires browser verification.

**Expected behavior:** Explorer behaves like a desktop file manager: its file table scrolls **inside a bounded pane**, while location navigation, headers, and pagination remain accessible. Use real pagination rather than making the entire settings page taller.

**Acceptance criteria:**
- Default to 50 visible entries per page, with 25/50/100 choices and previous/next page controls.
- Changing pages replaces rendered rows rather than cumulatively expanding them.
- File-list pane has viewport-aware bounded height and independent vertical scrolling; header and pagination stay accessible.
- No unintended whole-page vertical growth or horizontal overflow at 1366×768.
- Integrate R2 cursor-based retrieval for large folders without assuming all remote objects are preloaded; present honest counts when total size is unknown.
- Preserve navigation, selection, sorting, filtering, keyboard handling, and file operations across page changes.

**Relevant code:** `extension/options.js` `EXPLORER_RENDER_LIMIT`, `explorerVisibleLimit`, `renderFileItems()`, `explorerNextCursor`; `extension/options.html` `#workspace-objects`.

## BUG-007 — Explorer lightbox fails to display selected file reliably

**Status:** Open · user-reported broken feature / suspect implementation identified; exact rendering failure not yet reproduced

The user reports that the Explorer **Lightbox** does not work. `setWorkspacePreviewLightbox()` clones `.preview-media` or `.text-preview` into a separate overlay using `cloneNode(true)`. Cloning existing preview markup is not a substitute for a fully managed media renderer; the live root cause still needs reproduction (including URL validity, image loading, CSS sizing, lifecycle, and media-specific behavior).

**Expected behavior:** Opening Lightbox reliably presents the selected file at a legible, viewport-fitted size, with usable navigation and clear loading/error states.

**Acceptance criteria:**
- Selected images actually render, preserving aspect ratio with `object-fit: contain`; no blank overlays.
- Previous/next buttons and keyboard arrows move among supported files; Escape, close button, and backdrop exit predictably.
- Preview URL lifetime and asynchronous loading are managed correctly; revoking/replacing one preview cannot blank the active lightbox.
- Media-specific handling for images, video, PDF, and text is deliberate and tested rather than relying solely on cloned markup.
- Loading errors show actionable messages and a retry option; focus returns appropriately on close.
- Verify on a real Chrome extension page with several files and repeated open/close/navigation cycles.

**Relevant code:** `extension/options.js` `showWorkspacePreview()`, `setWorkspacePreviewLightbox()`, preview URL/AbortController state, and lightbox styles.

## BUG-008 — Clicking a Downloads location does not locate, select, and preview that file in Explorer

**Status:** Fix implemented on default branch (2026-10-10), pending Chrome extension end-to-end verification; very large folders and unavailable files need testing

The Downloads table shows a clickable location for some Cloudflare R2 transfers. `openTransferLocation(item,parts)` currently derives the parent folder and calls `goLocation(...)`, then scrolls toward `#local-tools`. It does **not** find, highlight, scroll to, or preview the transferred file. The user further reports that clicking the location does not successfully return them to the expected Explorer view; investigate profile resolution, target availability, visibility, and navigation errors.

**Expected behavior:** Clicking a saved download's location switches to Explorer, selects the correct Cloudflare account, bucket, and full containing folder, then highlights and previews that exact downloaded object.

**Acceptance criteria:**
- Downloads location is an accessible clickable control and clearly indicates navigation.
- Clicking opens Explorer in the matching account/bucket/path, not merely the upload form or a different last-used location.
- Fetch pages/cursors as needed to find the exact object, select it, scroll it into view, and open its preview; allow Lightbox immediately afterward.
- Root-level objects and deeply nested paths work, including folder names with unusual characters.
- A missing profile, moved/deleted object, or authorization failure yields a clear explanation instead of silent navigation failure.
- Downloads and Explorer navigation retain correct back/forward behavior.

**Relevant code:** `extension/options.js` `transferDisplayParts()`, `renderHistory()`, `openTransferLocation()`, `goLocation()`, `showWorkspacePreview()`.

## BUG-009 — Cloudflare authorization expires inconsistently across sections and browser sessions

**Status:** Open · recurring user-reported authentication failure / refresh-token error path confirmed

The user frequently sees the exact message:

```text
Cloudflare session expired. Connect Cloudflare again.
```

The issue appears **section-specific**: some ReDown panels continue to function while other actions say permissions/session expired. Reopening Chrome or starting a new browser session reportedly often requires signing into Cloudflare again. The issue may involve missing refresh tokens, token renewal, uneven authentication handling, stale UI state, or different credentials/requests across sections. Do **not** assume that all of these causes are proven, nor conflate OAuth expiration with missing R2/Worker permissions.

**Source observations:**
- `extension/cloudflare-auth.js` persists `accessToken`, optional `refreshToken`, and `expiresAt` in `chrome.storage.local`.
- `extension/cloudflare-api.js` contains refresh-token logic and retries an API response on HTTP 401 when a refresh token is present.
- The quoted error is explicitly thrown when that renewal path finds no `refreshToken`.
- `extension/options.js` tests for presence of an access token when deciding whether Cloudflare panels appear; presence alone does not establish token validity.
- Existing refresh behavior is not proof that refresh tokens are always issued, remain valid, or are used consistently by every operation.

**Expected behavior:** An authorized ReDown connection remains usable across browser restarts for as long as Cloudflare permits it, using securely persisted credentials and automatic renewal where supported. Individual sections should not incorrectly appear disconnected while the connection is recoverable.

**Acceptance criteria:**
- Trace token acquisition and record whether a refresh token is actually returned (never log secrets); review required OAuth scopes/consent and Cloudflare's supported refresh semantics.
- Audit **all** Cloudflare-dependent panels and operations for consistent authenticated requests, including buckets, Explorer, uploads, right-click downloads, nested destinations, and Worker setup.
- Proactively refresh shortly before known expiration where supported; handle 401 once with coordinated renewal/retry, preventing racing refreshes across simultaneous calls.
- Confirm credentials survive an ordinary Chrome/browser restart via appropriate extension storage; do not depend on a transient tab or service-worker lifetime.
- Distinguish expiration/missing renewal credentials from 403 insufficient permissions, Worker failures, expired sessions in other systems, and connectivity errors.
- Do not erase valid profiles, destinations, or saved configuration when renewal fails; show a single understandable reconnect action only when genuinely necessary.
- Do not prolong provider-imposed expiration, bypass consent/security controls, or store permanent credentials insecurely.
- Test after restarting Chrome and after access-token expiration, including mixed-section usage, concurrent requests, absent refresh tokens, revoked refresh tokens, and permission failures.

**Relevant code:** `extension/cloudflare-auth.js`, `extension/cloudflare-api.js` (including the literal error), `extension/options.js` `refreshCloudflare()`, and Cloudflare operations in `extension/background.js`.


## BUG-010 — Simple and Nested menu settings should share one unified section

**Status:** Fix implemented on default branch (2026-10-10), pending visual and interaction testing

The right-click menu settings currently make **Simple** and **Nested** feel like separate sections. Instead, provide a single **Right-click menu** settings area with two side-by-side checkable mode choices at its top:

- **☑ Use Simple Menu**    **☐ Use Nested Menu**
- Selecting **Nested Menu** changes the selection to **☐ Use Simple Menu**    **☑ Use Nested Menu**.

These should look like checkmarked options, but behave as **one active choice** (mutually exclusive), not two independently active menus. The corresponding configuration editor appears directly beneath the choices in the **same section**, rather than being presented as an unrelated second area.

**Expected behavior:** A tidy, unified settings page where the user chooses which right-click menu to use and edits that mode immediately below the selector. Switching modes does not discard either mode's saved destinations.

**Acceptance criteria:**
- Display **Use Simple Menu** and **Use Nested Menu** side by side at the top of the unified Right-click menu section.
- Both choices have clear checked/unchecked states; only one mode can be active at a time.
- Show the active mode's configuration under the same heading, hiding the inactive editor without clearing its data.
- Switching is immediate, accessible via keyboard, and persisted across settings reloads and browser sessions.
- Eliminate redundant scattered mode controls, duplicated headings, and separate Simple/Nested sections, while retaining all destination-editing functionality.
- Remain usable on smaller windows with sensible wrapping.

**Relevant code:** `extension/options.html`, `extension/options.js` (`renderRightClickMode()`, `renderProfiles()`), `extension/nested-menu-editor.js`; existing `rightClickMode` storage.

## Implementation triage — October 10, 2026

**Implemented, not yet verified in an installed Chrome extension:**
- **BUG-010:** Settings now show side-by-side checkmarked Simple/Nested choices, preserve saved configuration, and show only the active editor. Modified `extension/options.html` and `extension/options.js`.
- **BUG-008:** Downloads location attempts Explorer navigation, exact-object lookup through bounded additional R2 cursor pages, selected-row highlighting, and preview. Modified `extension/options.js`. Existing user-observed navigation failures are not yet proven resolved. The 50-page safeguard prevents unlimited fetches; files beyond that search window may not be located.

**Next candidate fixes and risks:**
- **BUG-006:** Replace cumulative 400-row **Show more** with paginated, scroll-contained rendering. This touches cursor loading, sorting, selection, keyboard behavior, layout CSS and archive listing. Test large folders to avoid breaking operations.
- **BUG-007:** Lightbox must manage preview resource lifetime, media rendering, navigation and CSS together. A cloned node alone is a suspicion, not proof of root cause. Reproduce in Chrome before changing URL ownership or media behavior.
- **BUG-003:** Fix the responsive upload-child row after inspecting CSS and testing nested levels at 1366×768; do not disturb path creation semantics.
- **BUG-004:** Nested editor full rerenders are confirmed; changing them requires carefully preserving async folder fetches, collapse state, pending changes, draft fields and correct data persistence.
- **BUG-005:** Multiple Simple R2 destinations require a data-model and background context-menu mapping change, not just another settings button.
- **BUG-009:** The OAuth refresh-token missing branch is confirmed. Inspect why renewal credentials aren't always available, and audit API/Worker paths before touching authentication; do not replace scoped OAuth with long-lived insecure credentials.
- **BUG-001/002:** Native Chrome parent context-menu entries cannot simultaneously act as a direct-click destination and a hover submenu under the current API. A custom menu surface would need separate design and accessibility testing.

**Validation note:** Repository updates were committed, but the installed extension has not been exercised; runtime/browser and automated tests remain outstanding.

### October 10 — BUG-003 first-pass layout fix

Updated `extension/options.html` upload-path CSS to bound rows to their parent width, use flexible min-width-zero selection/input columns, stack the new-child input below the existing-child dropdown, constrain indentation, and keep action buttons in fixed-width columns. Commit `78aaa0f`. This is a stylesheet-only change; no remote directory operations were changed. Visual confirmation in the installed extension remains necessary, especially at 1366×768 and several child levels.

**Pause point:** The next remaining Explorer pagination task (BUG-006) is more substantial because it interacts with remote cursor pages, sorting, selection, keyboard navigation, and current load-more state. Do not treat it as a pure CSS change.

### October 10 — BUG-006 pagination implementation

Replaced the cumulative `Show more` rendering in `extension/options.js` with 25/50/100 entry page sizes (50 by default), Previous/Next controls, visible-range count, and page navigation that replaces rather than appends rendered rows. `extension/options.html` now contains a pagination footer and CSS for bounded internal file-list scrolling. Changing folders/search resets the page; selecting a file can navigate to its containing loaded page. Next loads additional R2 cursor batches when necessary (bounded to 20 additional batches per click). Source changes: `1d9e108`, `dafdbf3`, `5745d68`.

**Manual verification required before closing:** At 1366×768, test 25/50/100 entries per page; check scrolling, buttons, folder transitions, sorting, keyboard selection, multi-select, search, archive contents, Downloads-to-Explorer jumps, and remote folders containing more entries than an initial R2 cursor response. File counts are counts of loaded items (a `+` indicates more available), not a guaranteed total until all remote results are fetched. This does not implement server-side global sorting of all unseen R2 objects.

### October 10 — Numbered Explorer pages refinement

Explorer footer now uses **‹ 1 2 3 … [current-page neighborhood] … [last loaded page] ›** instead of only Previous/Next text buttons. Current page is highlighted; page-size choices remain 25/50/100. When an R2 continuation cursor exists, the true final page is unknown, so the final numbered button represents the **last loaded page**, with a **More pages available** indicator and forward navigation fetching more batches. Do not label that as the ultimate last page until the cursor is exhausted. Implementation commits `818652e` and `bd60fa3`. Manual installed-Chrome validation remains pending.


## BUG-011 — Right-click video transfers fail on some websites

**Status:** Open · user-reported site-specific compatibility; root cause unverified

The user can right-click media and send it to a REDOWN destination from ordinary websites (including 4chan), but reports that videos from `watchpeoplelive.tv` do not transfer successfully. It is not yet known whether the site exposes a direct media URL, whether the video uses HLS/DASH segments or browser `blob:` URLs, or whether the source enforces access restrictions. Do not characterize the failure as a Cloudflare permission problem without evidence.

**Source observations:**
- `extension/background.js` selects `info.srcUrl || info.linkUrl || info.pageUrl` as the source, and recognizes `info.mediaType === "video"` when categorizing files.
- The remote-ingest fetch path expects an accessible public HTTPS URL and may reject a failed HTTP response, a missing response body, private/insecure addresses, or files beyond configured size limits.
- Some embedded players provide a playlist, segmented stream, expiring signed URL, or `blob:` reference rather than a standalone downloadable video. Source-side session, Referer, anti-hotlink, or authorization requirements are also possible. These are hypotheses, not confirmed findings for the named website.

**Expected behavior:** REDOWN distinguishes direct downloadable media files from embedded/segmented/unsupported streams, succeeds on publicly accessible media where possible, and reports a specific, accurate reason for failure instead of implying a Cloudflare permission fault.

**Acceptance criteria:**
- Reproduce using a permitted, non-DRM video from an ordinary direct-file site and a failing embedded-video site; record the context menu input (`mediaType`, URL scheme, file extension only), HTTP status, and which stage fails without logging access tokens or sensitive signed query parameters.
- Detect `blob:`, non-HTTPS, HLS `.m3u8`, and DASH `.mpd` URLs, and distinguish them from ordinary `.mp4` / `.webm` transfers.
- Preserve working downloads from straightforward image/video hosts.
- Show a meaningful failure message for inaccessible, signed-expired, 401/403, segmented-stream, oversized, or unsupported sources.
- If implementing support for an authorized, unprotected segmented-media source, separately design assembly, size/time/cost limits, consent, and streaming behavior. Do not bypass DRM, authentication, or site access controls.
- Confirm whether the user's failure occurs before transfer begins, during source fetch, or during Cloudflare upload; document the exact cause once reproduced.

**Relevant code:** `extension/background.js` `selectedUrl()`, `categoryForContext()`, `checkedFetch()`, remote ingest and error recording; Downloads error surface in `extension/options.js`.


## BUG-012 — Nested destination dropdowns show incorrect folder hierarchy or omit children

**Status:** Open · screenshot-supported user report; exact cause not yet reproduced

In the **Nested · Cloudflare locations** editor, the user selects bucket `extended` and clicks **+ Child**, but the first child selection offers `extended` again rather than the immediate folders they expect under the bucket. A further level offers `animeplex.lol`, and the next dropdown does not show the expected children of that folder. The displayed path becomes `extended/extended/animeplex.lol/`, apparently introducing an unwanted duplicate level. The screenshot shows an unassigned final child row. We must confirm the actual R2 keys/folder markers before deciding whether the duplicate is a real folder, stale saved configuration, or a discovery/path bug.

**Expected behavior:** The bucket is selected once as the root. Every **+ Child** dropdown lists only the immediate existing folders under the exact selected parent prefix, without inserting or suggesting a duplicate bucket name unless that is genuinely an existing folder. For example, `extended` bucket → `animeplex.lol` → actual children inside `animeplex.lol/`. Creation of a new folder must remain a separate explicit action.

**Acceptance criteria:**
- Query immediate folders under the bucket's empty prefix for the first child; under `animeplex.lol/` for its child; and so on at arbitrary depth.
- Do not mistake the bucket name for a folder name, prepend an extra `extended/`, or list top-level buckets in child selectors.
- Differentiate a genuine same-named folder (if R2 actually contains `extended/`) from an accidental duplicate; never silently modify or delete existing R2 data.
- On selecting a parent, update descendants using its correct full prefix, preserve the selection and typed drafts, and show loading/errors explicitly.
- Verify with actual R2 directory prefixes, existing marker objects, and folders represented only by object keys; test three or more depths.
- Ensure saved nested-menu paths match the dropdown hierarchy and right-click destinations.
- Test together with BUG-004 (full-editor rerenders) because asynchronous fetching and rerenders could cause stale or misleading child options.

**Relevant code:** `extension/nested-menu-editor.js` `folderRow()`, `rootRow()`, `repaint()`; `extension/background.js` `listFolderChildren()`, `cfFolderChildren`; `extension/nested-locations.js` `path()` and `setLocation()`.

**Evidence:** User screenshot provided October 10, 2026, showing `extended` bucket → `extended` folder → `animeplex.lol` → unassigned child dropdown.


## BUG-013 — Upload from Computer child-folder dropdown omits or fails to load existing subfolders

**Status:** Open · screenshot-supported user report; separate from right-click nested menu BUG-012

In **Upload from computer**, after choosing the Cloudflare R2 bucket `works`, the user reports that the successive **Location / + Child** dropdowns do not reliably enumerate the real immediate child folders. Only one or a few options appear, and deeper existing folders may be unavailable even though the user expects them in R2. The screenshot shows the root selection `Komochi_Tsuma_no_Arai-san_Arai-san_a_wife_with_a_child`, then `chapter_1`, a second input also containing `chapter_1`, and an additional empty **Choose an existing child…** row. This is **not** the same panel as the nested right-click menu; do not treat fixing BUG-012 as sufficient.

**Expected behavior:** Selecting bucket `works` displays *all* actual top-level folders in that bucket. Selecting a parent folder then lists all its immediate existing children from R2; the next level is scoped to that exact parent path. Existing-folder selection is separate from the new-folder text field. The UI must honestly indicate loading, incomplete results, and errors rather than showing a partial list as complete.

**Code-level investigation points:**
- `extension/options.js`: `fetchUploadBuilderChildren()` requests `cfFolderChildren` with `limit:250` but silently returns `[]` on a failed response; this can make an authorization or API error look like an empty folder.
- `uploadBuilderChildren()` derives entries from cached `uploadLocationPrefixes` and may show previously cached entries while the live request is still pending.
- `renderUploadLocationBuilder()` asynchronously populates dropdown options; investigate stale requests, bucket changes, and whether previous selections/new-folder drafts are being displayed as separate path levels.
- `extension/background.js` `listFolderChildren()` loops through R2 delimiter/cursor pages but stops at the requested limit; check missing subfolders, folder-marker representation, and whether the provider returns all prefixes.
- The screenshot does **not** prove Cloudflare connectivity is broken or that all expected child folders exist remotely. Compare actual R2 object keys and directory markers before assigning the root cause.

**Acceptance criteria:**
- List immediate child folders accurately under the selected account/bucket/parent prefix, including directories represented only by deeper object keys and folders with marker objects.
- Fetch additional result pages as needed and show a clear **Loading folders…** / **Loading more folders…** indicator. If results are capped, label them as incomplete and offer further loading.
- Expose per-row fetch failures and a **Retry** action; distinguish empty folder from authorization/Worker/API error instead of silently returning an empty list.
- Ensure asynchronous results from a previous bucket or parent cannot overwrite the new selection.
- Selecting an existing folder does not copy its name into **Create new child** input or produce an unintended duplicate path segment.
- Ensure an empty child row does not create a folder, and upload destination always reflects the exact selected hierarchy.
- Test with a bucket containing many siblings (more than 250), deep folders (3+ levels), and with temporary Cloudflare failures.
- Preserve the layout improvement from BUG-003 without reintroducing overflow at 1366×768.

**Evidence:** User screenshot October 10, 2026 of Upload from Computer showing `works` and a partly populated multi-level location builder.


### October 10 follow-up — misleading top-right locations after selecting a bucket

**Additional screenshot:** The left **Bucket** selector was set to `extended`, while the right **Location** selector offered `works` and allowed a path beneath it. The user reports that the child list under this combination is incomplete, whereas selecting the corresponding real bucket in the **left** selector leads to correctly enumerated children. The user reasonably interprets the right-hand option as another bucket; the UI must not present a cached or unrelated path as if it is a verified folder belonging to the selected bucket.

**Confirmed code-level contamination risk:** `loadUploadLocations()` in `extension/options.js` combines live `cfFolderChildren` results for the selected bucket with values from `uploadProfile()?.folders`, without verifying those saved prefixes against the live bucket hierarchy. It also preserves a previously selected `local-prefix` value even after changing the bucket. These mechanisms can make a path from an earlier preset or selection appear under a different bucket. This is a concrete suspect mechanism, not yet runtime proof of every option shown in the screenshot.

**Fix requirements:**
- Bind the Location options, cached prefixes and selected path strictly to the selected **account ID + bucket name**, resetting them on bucket changes unless the path is actually validated in the newly selected bucket.
- Populate the first location dropdown from verified *immediate* children of that bucket. Never mix other bucket names or unverified profile defaults into the verified list.
- If a saved preset references a missing path, show it separately as **Saved path — not verified in this bucket**; don't silently present it as an existing folder.
- Clear or validate old selections before rendering descendants, and discard stale asynchronous responses if bucket selection changes while loading.
- Preserve a visible **Loading folders…** state, distinguish incomplete results from empty folders, and surface lookup failures with retry.
- Compare results from the left-selected `works` bucket against those for `extended` with `works` selected on the right, to reproduce and isolate the mismatch.


### Clarification — strict separation of Bucket and Location selectors (October 10, 2026)

**User requirement:** The **left** selector is the **only bucket selector**. The **right** selector is **not another bucket selector** and MUST contain exclusively the verified **immediate child folder names** of the bucket selected on the left. It MUST NOT list bucket names, unrelated account locations, stale profile defaults, or folders from any other bucket as choices.

**Required semantics and tests:**
- Left: select an account/bucket. Right: query that exact account + bucket at root prefix `""` and display only its immediate child folders.
- The right selector must not provide alternative bucket selection, even if an actual child folder happens to share a bucket's name. Treat such a value strictly as a verified folder from the selected bucket, not a bucket; never substitute cached bucket names for directory results.
- Descending into a selected right-side folder reveals only its own immediate children at the next location level. Do not flatten grandchildren into the initial selector.
- On left bucket change, discard stale child options and selections, show a clear loading state, then repopulate from the new bucket's verified immediate children. Ignore late responses for old bucket requests.
- For an empty bucket, show an honest empty-folder state; for lookup failure, show the error and Retry rather than using bucket lists or stale options as a fallback.
- Test two buckets with overlapping folder names and distinct trees; ensure the right dropdown contains only the correct immediate children before/after rapid bucket switching.
- Preserve **Create new location** as a separate empty draft field. Selecting an existing folder on the right must not copy the selection into the draft (see BUG-014).

**Scope:** This tightens BUG-013's wrong-bucket/mixed-prefix report. No implementation change or browser verification has yet occurred for this clarification.

## Upload from Computer — tree connectors and bounded depth (visual testing pending)

**Source styling committed:** `61b7069`, `5b0abb1`. The L-shaped guide for each Upload location level now spans **both** the existing-folder dropdown and its adjacent new-child input, visually treating them as one level. Directory levels step right for the first three child depths, then further depths have **no additional horizontal indentation** and their guide continues vertically. A path 150+ levels deep cannot disappear solely because of cumulative left padding; this is a visual indentation cap, **not** a cap on folder nesting or Cloudflare directory depth. Deeper levels still have selectable folders and creation fields.

**Verification:** CSS/JavaScript source changes only; browser rendering at 1366×768, narrow windows, and very deep paths remains to be manually checked. No provider/transfer logic changed.

## Source patch — Upload from Computer location separation (human testing pending)

**Status:** Source changes `79c90c4` and new regression tests `74896f4` committed; automated test execution and installed Chrome testing **pending**.

- Existing folder selections no longer initialize the adjacent creation input. Typing into that input no longer changes the selected upload destination or creates a remote location until an explicit `+` action.
- Selecting an existing child no longer invokes the folder-materialization call. Bucket-scoped location loading now excludes unverified saved preset prefixes, resets when the left bucket changes, and ignores stale responses from previously selected buckets.
- Added tests for blank creation inputs after selection, immediate child lists isolated to the selected bucket, and out-of-order bucket lookup responses.
- **Limits:** The Upload builder still rerenders its own rows when the user changes a selected folder; broader layout, pagination and public URL features are separate issues. Regression tests are committed but **not run** in this session because the execution container cannot reach GitHub. No Chrome/provider outcome is asserted.

**History:** [DBG-003](../docs/debug/DBG-003_UPLOAD_LOCATION_BINDING.md).

## Canonical Simple Menu contract — one popup and configurable automatic labels

**Requirement (2026-10-10):** Simple right-click mode must have **exactly ONE REDOWN popup level**: `REDOWN → directly clickable destination`, never `REDOWN → preset → location`, regardless of remote folder depth.

The destination's **Menu label** takes precedence. When the label is empty, a persistent user setting chooses the automatic label: **lowest/deepest directory (DEFAULT)** or **highest/root bucket name**. At the bucket root, both modes show the bucket name. Both choices are now implemented in source (`70a7c26`, `22d7ed9`); human Chrome testing remains pending. The **Order** field controls preset order, not submenu depth; additional options now have Move up/down controls within their preset (`22d7ed9`); global ordering across presets is still missing.

**Complete specification and acceptance:** [Simple right-click menu contract](../docs/SIMPLE_RIGHT_CLICK_MENU_CONTRACT.md).

**Latest source work (2026-10-11):** Persisted label preference (deepest directory by default or bucket name), additional-option Move up/down controls, and a new label fallback regression test (`e896f3b`). Fixes committed; automated and human Chrome verification pending.

## Source fix — Flat Simple right-click destinations (human testing pending)

**Status:** Implementation committed `c172731` with focused test `0f88e43`; automated and installed-Chrome verification pending.

The supplied screenshot showed **REDOWN → preset → Default location / named option** even though Simple Mode is intended as one destination popup. The source used a `simple:<profile>` grouping menu whenever a preset had extra destinations. The updated menu registers the default destination and all additional Simple options directly under `REDOWN`; directory depth does not create submenu depth. Existing `quick:` and `simple-option:` IDs are preserved for click routing.

**Name fallback:** A nonempty explicit label wins. Otherwise show the lowest/deepest selected directory name; when targeting the bucket root, show the bucket name. The depth of the destination does not affect its placement in the menu.

**Ordering distinction:** A preset's existing `Order` field still sorts presets. Extra Simple options retain their saved array order **within** that preset and currently have **no independent Order field**. A future drag/reorder control for individual options is a separate enhancement, not part of this flat-menu fix.

**Human acceptance:** Reload the unpacked extension and right-click an image; verify the one-level REDOWN destination list, custom and default labels, correct remote destination on click, and existing menu order. Do not claim Chrome verification from a source-only patch.

## BUG-014 — Upload from Computer: choosing an existing location fills the new-name input

**Status:** Open · user-reported regression (October 10, 2026); runtime mechanism not yet verified

In the **Upload from Computer** location builder, selecting an existing folder from a dropdown also fills the adjacent text input intended for **creating** a new folder. The selected existing location appears twice in different roles, creating confusion and potentially implying that a duplicate directory will be created. This is distinct from the earlier cramped-layout defect and overlaps BUG-013's separation-of-selection requirement.

**Expected behavior:** The dropdown represents the *existing selected location*. The text field represents an *optional, new, not-yet-created child name*. Selecting an existing folder MUST NOT copy its name into this text field. It should remain empty unless the user explicitly typed a draft.

**Acceptance criteria:**
- Select a bucket, then an existing location at any depth; the adjacent **New location / Create child** input stays empty.
- If a user has manually typed a draft, selecting another existing location must not silently populate or overwrite it; if its parent changes, handle the draft explicitly and predictably.
- The selected path appears once as a chosen existing destination; no duplicate segment is appended by selection alone.
- Creating a new location requires explicit user action and must use the exact currently selected account/bucket/parent path.
- Reopening and changing dropdowns does not generate extra folders, duplicate input text, or unintended Cloudflare writes.
- Add a deterministic DOM regression for existing location selection and independent draft preservation in **Upload from Computer**, not merely in the Nested editor.

**Investigation:** Inspect `extension/options.js` upload location state, row rendering, dropdown change handlers, `local-prefix`, cached prefixes, and new-name draft binding. Keep existing dropdowns and compact layout; do not redesign the panel to fix a data-binding bug. Cross-reference BUG-013 and its stale bucket/profile cache risk.

## BUG-015 — Explorer and file previews should show a verified public URL alongside local blob preview URLs

**Status:** Open · requested capability (October 10, 2026); bucket-by-bucket eligibility unknown

A preview currently may have a browser-local `blob:` URL, useful for rendering locally, but it is not a durable publicly shareable address. For objects in a Cloudflare R2 bucket configured for public access with a resolvable public base/custom-domain URL, also show the **actual public URL**, without removing the blob-based preview option.

**Expected behavior:** Expose distinct, plainly labeled **Local preview URL (blob)** and **Public URL** where applicable. A private bucket or inaccessible object must not display a fabricated public URL; show **Public URL unavailable — bucket/object not publicly accessible or not configured** when that is the supported finding.

**Acceptance criteria:**
- A local `blob:` preview can continue functioning for eligible files regardless of whether the bucket is public; label it as temporary and browser-local, not a sharable public link.
- Where an R2 bucket has a verified public-domain/base URL and the object key is eligible, display its canonical object URL separately, with copy/open controls and correct URL encoding for nested keys and special characters.
- Never assume `https://<bucket>.<provider-domain>/...` is public merely because a bucket exists. Resolve and verify configured public URL metadata and distinguish configured/verified/unverified/unavailable states.
- Do not mistake authenticated Worker download/preview URLs or short-lived signed URLs for unrestricted public URLs. Do not leak credentials or private access tokens in UI, logs, or copied links.
- A private bucket displays no invented public URL; do not automatically enable public bucket access merely to provide a link.
- If public access changes, or an object is missing/blocked, present appropriate status and errors rather than promising a working public URL.
- Preserve current preview/lightbox behavior and object identity. Test public/custom-domain, private, missing-domain, nested/Unicode key, and cross-account cases.

**Investigation:** Inspect `extension/options.js` Explorer/preview URL handling, Cloudflare R2 bucket public endpoint metadata, profile configuration, stored per-object URLs, and authenticated blob creation. If public URL verification requires an extra network request, use an explicit bounded, safe check and honest freshness indication. This feature is **additive**, not a requirement to convert private objects into public files.

## BUG-016 — Simple Mode settings unnecessarily rerender the entire panel after small edits

**Status:** Open · user-reported UX/state regression (October 10, 2026); exact triggering handlers still to be traced

In the **Simple right-click menu** settings panel, a small change to an existing selection or configuration causes the wider editor to reload/rebuild. This interrupts interaction and may reset focus, scroll, dropdown openness, draft names, or sibling row state.

**Expected behavior:** Simple Mode should update only the changed row and dependent descendants. A dropdown selection or text-field change must not destroy and recreate unrelated settings UI. Preserve the already simple and usable design.

**Acceptance criteria:**
- Opening/closing a dropdown without changing its value causes no panel rerender or unnecessary location fetch.
- Changing a bucket or existing folder updates only the affected row and dependent path segments; other destinations and profiles remain mounted and stable.
- Typing in a new-name field does not recreate the panel, overwrite the draft, change scroll position, or lose keyboard focus.
- Async completion, save failure and stale responses cannot undo more recent user selections or disable valid controls.
- Updates to menu configuration persist and are reflected in the right-click menu without rebuilding the entire settings page unnecessarily.
- Add DOM regression tests for rerender counts, focus/draft preservation, sibling identity and async out-of-order operations, including nested paths.
- Preserve existing Simple Mode aesthetics and interaction patterns; prefer a narrowly scoped update/reconciliation over a redesign.

**Investigation:** Trace `extension/options.js` Simple Mode rendering and profile save/refresh paths, relevant callbacks and bucket/folder fetches; distinguish a necessary native context-menu rebuild from an avoidable settings-panel DOM rebuild. Related but independent: BUG-004 (Nested Mode full-editor refresh), BUG-005 (multiple independent Simple destinations).


## BUG-017 — Simple and Nested location editors are visually cluttered and difficult to decipher

**Status:** Open · user-reported usability/design defect · recorded October 21, 2026

**User report:** Both location editors feel cluttered, insufficiently aesthetic, and hard for a new user to understand. REDOWN needs simplicity and elegance that inspire trust. Consolidating Add new location into one toolbar button reduces repetition, but does not resolve the broader layout and hierarchy problem.

**Expected experience:** A new user can understand the selected account/bucket, existing destination, creation draft, and next action at a glance. The interface should feel calm, polished, predictable and trustworthy, with deliberate grouping rather than a dense wall of competing controls.

**Design requirements and acceptance criteria:**

- Establish clear visual hierarchy between mode selection, account/bucket context, destination rows, folder levels and contextual actions. Make parent/child relationships legible without decoding repeated labels.
- Use purposeful containers, consistent internal padding, spacing between groups and aligned controls. Avoid excessive nested borders/cards, cramped rows, arbitrary gaps, and visually ambiguous ownership of buttons.
- Give important actions distinctive palettes that complement the overall REDOWN aesthetic. **Red text on a silver button for Add new location is a user-suggested direction to explore, not an approved final palette.** Action emphasis should be consistent and deliberate; do not give every control equal visual weight or make routine creation look destructive.
- Preserve the established green next-step treatment for onboarding. Keep destructive, primary and secondary actions distinguishable using labels and hierarchy as well as color, with readable contrast and clear hover/focus/disabled states.
- Retain the single toolbar-level Add new location action and the existing functionality of both modes; improve presentation without removing needed folder creation, selection, ordering or hierarchy controls.
- Validate layout at narrow and wide viewports, long bucket/folder names, empty states, and deep hierarchies. Controls must wrap predictably with adequate spacing and no clipping or overlap.
- Review loading, error and success states as part of the design so feedback stays close to the relevant action and does not rearrange the editor unexpectedly.
- Assess the result with a fresh-user walkthrough: choose a mode, identify the destination, add a location and explain where a file will go without Debug Mode or external guidance.

**Scope:** Record this as a future focused UX/design pass. No palette selection, redesign implementation, visual acceptance or usability-test result is claimed by this report. Related: BUG-003, BUG-004, BUG-010 and BUG-016.


## Get URL / operation status — native Chrome acceptance pending (22 October 2026)

Implemented in0.5.16: stable Get URL context action, configured-address pop-out with whole-row clipboard copying, disabled/unverified labeling, source/generation guards, redacted URL/clipboard diagnostics and shared neutral/green/red/amber operation feedback. Automated smoke163/163; full suite281/288 with the seven retained historical failures. Details and exact implementation baseline: [GET_URL_AND_STATUS.md](../docs/explorer/GET_URL_AND_STATUS.md).

Remaining verification: load0.5.16 in an approved Chrome extension environment; right-click `works/...2/chapter_1/001.webp`, inspect r2.dev/custom subdomain/Worker addresses, copy each row and paste into a plain text field to verify the full URL. Check Escape/outside/keyboard behavior and popup fit at1366px/390px. Check native clipboard denial and native download completion/cancellation states. Desktop/narrow visual rendering and installed-extension tests could not run here because the Chromium download was invalid/truncated. Do not call JSDOM geometry fixtures native Chrome evidence. No new cloud configuration is required for Get URL; unavailable endpoints should remain unavailable.

Adjacent correction: the prior managed public-host fallback had overescaped regex dots; it now matches only the intended enabled `pub-<hex>.r2.dev` hosts. Unusual-key preview/download and private-bucket guard regression tests pass, but the existing installed-Chrome403 incident remains open pending the checks above. Virtual archive entries still do not have independently configured public file URLs; Get URL applies to stored objects, including the archive file itself.


### Get URL invisible panel / nested submenu (22 October 2026)

User reported Get URL produced no visible result. Confirmed source defect: generated `.url-popover` had no production CSS, leaving it in normal body flow. Corrected with a fixed styled overlay anchored as a child menu beside Get URL; parent action remains visible. DOM regression includes production computed styles and actual parent click → child row → Copied flow. Installed Chrome visual/native clipboard retest remains pending; this source fix is not live acceptance.


### Enable public URL — browser retest pending (22 October 2026)

Get URL now offers inline bucket-wide confirmation and explicit managed r2.dev enablement for disabled buckets, then verifies the setting and refreshes choices. Local DOM and mocked provider regressions cover success/cancel/permission failure/read-back failure/stale selection. Installed Chrome/OAuth, public propagation and native clipboard have not been verified here. No live bucket visibility was changed during implementation. If interrupted, reopen URL choices to inspect the setting before retrying.


### Reliability foundation — external acceptance remains blocked (22 October 2026)

Unified offline diagnostics and repeatable CI regression reporting are implemented; see docs/reliability/README.md. The seven historical failures remain visible and release checks remain blocked by installed Chrome/live provider/package readiness. Current CI and audit packaging workflows require their first remote execution. Copy/Move404, real-session soak, durable recovery and root/bundled license drift are not resolved by this milestone. No production data or cloud configuration was mutated.


### Unified agent inspection — remaining boundaries (22 October 2026)

The offline gateway now routes all five existing inspection APIs and detects registration/ownership drift. Browser/live-provider evidence, complete runtime span correlation, durable recovery and release1 acceptance remain separate work. The project/semantic catalogs retain visible historical/proposed freshness limitations and the seven known regression failures; accepted Forever Works authority is not implemented. See docs/reliability/UNIFIED_AGENT_API.md for ownership and collision audit.
## Windows reliability run: paths, CRLF fixtures and symlink permissions — 2026-10-22

User evidence after f487af7: diagnostic API 1.2.0 discovery/registry/inventory worked; full Windows run reported 234 passing tests, 59 unexpected failures, four matched baseline failures and incomplete execution. This is not release acceptance. Focused stacks showed lightbox fixtures running beyond their intended source boundary, options fixtures evaluating startup code without browser mocks, semantic queries missing data, and file-symlink creation denied with EPERM.

Source corrections: normalize CRLF only in the two affected UI fixture readers (never in frozen byte evidence); normalize native path separators after realpath containment in the semantic reader; exercise external-directory and excluded-credential aliases using Windows junctions, without elevation or skipped security assertions. Added a scoped-reader regression and expanded Windows CI with the affected UI contracts.

Remaining: the user's existing checkout may contain CRLF bytes from before .gitattributes. Architecture/hash and historical byte assertions remain exact and must not be made green by rewriting their expected evidence. Compare against a separate fresh clone with npm ci before altering an existing working directory. Complete Windows regression and installed-extension testing remain separate acceptance requirements; this patch does not certify all 59 failures as resolved. npm install-script warnings for esbuild/sharp/workerd are not, by themselves, proof of these JavaScript test failures.

Verification and next steps: docs/reliability/WINDOWS_PORTABILITY.md.


## BUG-018 — Explorer Copy/Paste and Move to recurrence; remediation round 05

**Status:** source/DOM-confirmed clipboard, stale menu and transport-observability defects corrected; installed transfer outcome remains open.

**Recorded:** 2026-10-22T23:56:43+00:00. See [timestamped attempt ledger, causes, solution and acceptance boundary](fixes/BUG-018-explorer-transfer-recurrence-attempt-05.md). Related live incident EXPLORER-COPY-404-2026-10 is not closed by local tests.


### BUG-018 continuation — Cross-bucket routing discrepancy; round06

**Status:** one user-confirmed failed destination had pre-routing-fix code and lacked its public fetch flag. Setting corrected/read back with bindings/date preserved. Creation and cross-bucket settings checks added; installed transfer verification remains open. See [round06 evidence and solution](fixes/BUG-018-explorer-routing-attempt-06.md).

## BUG-019 — Directory Keep both merges into an existing destination directory

**Status:** critical owner data-safety report; source-confirmed folder merging and lost directory retry identity corrected. Actual installed byte overwrite/recovery remains unverified.

**Recorded:** 2026-10-23T00:21:42+00:00. **Attempt:**01 for this distinct directory conflict. See [cause, correction and acceptance boundary](fixes/BUG-019-directory-keep-both-attempt-01.md).


## BUG-020 — Remote save normalizes an exact selected folder path

**Status:** source-confirmed while building optional popup dropdown levels; additive exact-path support and pre-write compatibility guard implemented. Installed delivery/Repair acceptance remains pending.

**Recorded:** 2026-10-23T00:55:30+00:00. **Attempt:**01. See [cause, correction and verification boundary](fixes/BUG-020-popup-exact-folder-attempt-01.md). This is distinct from the existing cross-bucket404 incident.

- BUG-021: [popup destination readability/persistence, attempt 01](fixes/BUG-021-popup-destination-attempt-01.md); automated regressions pass, native Chrome acceptance pending.

- Popup delivery counter (0.5.22): historical totals cannot reconstruct discarded entries beyond the old fifty-entry history cap; uninstrumented paths and MV3 completion-to-local-commit gaps can undercount. See [counter boundaries and remaining acceptance](../docs/popup/DASHBOARD_LAUNCHER.md). Installed Chrome odometer/login acceptance remains pending.

- Odometer roll-up (0.5.23): deterministic animation, sound, mute and cancellation regressions pass. Actual Chrome motion, audio volume/autoplay policy and interrupted-popup preference persistence still need installed acceptance; see [presentation boundaries](../docs/popup/DASHBOARD_LAUNCHER.md).


## BUG-021 — Electric rainbow outline after-effect becomes detached when the outline moves (2026-10-29)

**Status:** Open; user-reported visual mismatch. **Priority: P2 visual polish.** No fix or installed-Chrome verification is claimed by this entry.

**Observed:** During the theme/outline reveal animation, a small electric, rainbow-colored light pass sweeps along the outline as an after-effect. If the outline moves after the effect's geometry has been established, the rainbow sweep still travels along the outline's **previous position** instead of its **current on-screen position**. The animation continues, but its glowing trace appears detached or offset from the visible border, making the transition look slightly wrong.

**Reproduction to verify:** Trigger the outline reveal, then change the outline's position during the after-effect (for example, while a panel translates, reflows, or resizes). Compare the rainbow pass with the border's actual location on every frame. Exact theme, browser conditions, and movement timing remain to be confirmed in an installed build.

**Expected:** The electric/rainbow sweep remains precisely aligned with the **currently rendered outline** throughout movement, resizing, and the transition; it never draws over where the border used to be. If the outline is animated, the effect must track the same live geometry or transform without visible lag or jumps.

**Investigation lead, not proven cause:** The sweep may be following an earlier measured outline path or a separate animation layer whose coordinates/transforms are not updated in sync with the moving border. Inspect the animation's coordinate space, transform origin, resize/reflow behavior, and timing before changing the implementation.

**Acceptance:** In real Chrome, repeatedly move/reposition the outline during the electric pass at normal and reduced animation speed and at narrow/wide viewport widths. The sweep must coincide with the visible border in every frame, without displaced ghost traces or a one-frame snap. Preserve the existing aesthetic and animation timing unless a change is necessary to correct alignment.

### November 1 right-click implementation evidence — incident remains OPEN

The owner-approved Home-last/provider hierarchy and CURRENT/export foundation have
production changes and local fault-injection coverage. Fresh installed Chromium
rejects unpacked extensions by administrator policy, so the first-install
Cloudflare→Explorer report has no verified live root cause or closure. Full
acceptance gaps and exact test evidence are recorded in
`FOREVER_WORKS/v3/RIGHT_CLICK_IMPLEMENTATION_2026_11_01.md`.
