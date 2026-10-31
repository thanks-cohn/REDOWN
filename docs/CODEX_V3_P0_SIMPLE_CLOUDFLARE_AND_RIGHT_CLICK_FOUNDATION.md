# REDOWN V3 EMERGENCY P0 — SIMPLE MUST STAY SIMPLE: CLOUDFLARE-FIRST RIGHT-CLICK AND RELIABLE DIRECTORY FOUNDATION

**Repository:** `thanks-cohn/REDOWN`  
**Mandatory branch:** `codex/v3-parity-first-reconstruction`  
**Owner-approved latest direction:** 2026-10-31  
**Priority:** P0 — user-visible right-click regression and new-user activation experience.  
**Execution:** INSPECT → REPRODUCE → IMPLEMENT → TEST → DOCUMENT → COMMIT → PUSH.  
**THIS IS AN IMPLEMENTATION REQUEST. DO NOT STOP AFTER AN AUDIT OR A PROPOSAL.**  
**Protected tags:** `BASE-v3`, `base-V3-2.0.0`, `V3-BEFORE-NARROW-DEPTH-RECONSTRUCTION`, `V3-MENU-MODES-BEFORE-HISTORY-REPAIR`. Do not move or delete them.

## 0. PRIMARY DIRECTIVE AND PRIORITY ORDER

The owner wants REDOWN to feel **obvious to a complete newcomer** while retaining powerful modes for experienced users.

**Deliver in this order:**
1. **P0, IMMEDIATE:** Repair V3 **Simple** to show **Cloudflare**, never the separate **Buckets** heading, with user-configured labels **under Cloudflare**, never beside it. Resolve labels, activation, save routing, settings and native registered menu together. Ship this narrow functional slice before tackling the deeper index.
2. **P0 NEXT:** Preserve known folder depths and eliminate non-destructive Reload/Save race bugs for Nested → Level. Maintain Native Simple/Narrow parity.
3. **P0/P1 NEXT:** Incremental persistent directory graph, journal, OAuth/MV3 checkpoints, scoped Refresh Folder Listing and efficient menu reconciliation.
4. **P1 LATER:** Daily-default/Weekly/Off historical snapshots, exports and Time Machine queries, built on the same graph; no separate crawler and no premature full Time Machine UI.
Each phase must have independent tests, truthful status, and commits. **Do not attempt one giant speculative rewrite or delay the user's Simple fix until Time Machine is done.**

## 1. LATEST SIMPLE CONTRACT — SUPERSEDES OLDER FLAT-SIMPLE DOCUMENTS

The previous requirement `REDOWN → [every destination as direct siblings]` is now **SUPERSEDED**. The owner's latest decision is a **single fixed provider label: Cloudflare**.

### Case A: only the default `redown` bucket; no other children or discovered buckets

Native page/link/image/video/audio right-click menu:

```text
REDOWN
└── Cloudflare   [CLICK: save DIRECTLY to R2 bucket redown, prefix ""]
```

- When the verified default `redown` bucket is the **sole available destination**, **Cloudflare is a directly clickable save leaf** at the REDOWN root, not a submenu.
- **Never:** `REDOWN → Buckets → [bucket names]`.
- No unrelated diagnostic entries, duplicate destination labels, unexpected setup shortcuts or extra hierarchy.
- Cloudflare is a **provider display label**, not a literal bucket name. **OWNER CLARIFICATION (2026-10-31): With zero custom children, clicking Cloudflare MUST save directly to the ROOT (empty prefix) of the Cloudflare R2 bucket whose literal name is `redown` (lowercase), in the verified/default connected account.** It must NEVER target whichever bucket is highlighted in Explorer, an arbitrary active bucket, a non-root folder, or an older unrelated default path. For an existing user with a separately configured prior default, preserve that record without silently overwriting it; don't let it hijack this new Simple zero-child leaf. If `redown` is not verified/usable, show an honest setup/authorization path rather than treating a different bucket as a substitute.
- If the account is not yet authorized, the Cloudflare action should lead to the existing connection/activation onboarding in a supported user-initiated REDOWN UI, **not** pretend a save occurred. Do not expose unauthorized destination details.
- Preserve a safe route to Settings/repair in the Shelf; standard Simple should not be cluttered with unrelated utility rows. If native recovery requires a minimal management entry in a true failure state, justify and test this exception explicitly.

### Case B: user adds any child OR an additional Cloudflare bucket is discovered

```text
REDOWN
└── Cloudflare             [SUBMENU PARENT — no direct save]
    ├── REDOWN             [CLICK: default R2 bucket "redown", prefix ""]
    ├── Photography        [CLICK: exact custom destination]
    ├── Projects           [CLICK: exact custom destination]
    └── Other Bucket       [CLICK: that bucket root, once activated/authorized]
```

- **THIS IS THE LATEST OWNER OVERRIDE (2026-10-31):** Cloudflare becomes a submenu when either **(a)** at least one additional named/child destination exists **OR (b)** at least one distinct bucket has been discovered and is eligible to appear. In that state the default `redown` bucket MUST remain directly clickable as the first leaf labeled **`REDOWN`** under Cloudflare, **even if the user did not manually create a "REDOWN" shortcut**. It must never vanish just because Cloudflare gained children.
- Additional verified/discovered buckets are represented as **direct sibling bucket-name leaves** under Cloudflare; there is **no separate "Buckets" heading**. If a discovered bucket is not yet activated for safe saving, either indicate its unavailable/setup state without granting a false save route, or defer its actionable leaf until activation, documenting precisely when submenu promotion occurs. Do not infer account permission merely from a cached name.
- Custom Menu Label destinations and eligible bucket leaves remain **flat siblings directly under Cloudflare**; there is no further right-click folder depth in Simple.
- Avoid creating two indistinguishable `REDOWN` leaves if the default bucket also appears in discovered buckets; deduplicate by canonical account+bucket identity while preserving intentionally distinct custom target records.
- When multiple accounts expose the same bucket label, disambiguate visible labels while preserving exact identities.
- The label must come from the user's saved **Menu Label**, or established blank-label fallback when absent. The label does not change the actual destination identity.
- Each labeled item resolves to the correct **provider + account ID + bucket + exact folder prefix**, regardless of underlying prefix depth.
- Never render the user's real directory hierarchy in Simple. A path `works/projects/illustrations/final` can appear as one item `Artwork`, saving directly to the full prefix.
- **Critical Chrome native-menu rule:** Once Cloudflare has children (custom locations **or** other discovered eligible buckets), Cloudflare itself becomes navigation, not a direct-save leaf. **The original default always remains actionable as the first `REDOWN` child**, pointing to the verified `redown` root. Do not require the user to add that child manually. When it has no children beyond its own default, Cloudflare itself is the direct-save leaf.
- **Never** put a custom label beside Cloudflare or the former Buckets heading at REDOWN root.
- All configured children must be visible up to bounded Chrome menu capacity; if too many, use one clear `More destinations…` *inside* Cloudflare that opens a supported REDOWN chooser, not drop records silently.
- Handle exact duplicate display labels deterministically and accessibly without merging destinations. Preserve stable IDs, saved order and precise routing.
- If a saved destination becomes unauthorized, disable or hide its actionable route appropriately; do not delete its saved configuration merely because a token expired.

### Explicit limits

- `REDOWN → Cloudflare` (direct save to **verified `redown` root**, `prefix: ''`) is the **only-one-bucket and no-other-child** path.
- If **any other configured child OR eligible discovered bucket exists**, `REDOWN → Cloudflare` becomes a submenu containing **`REDOWN` first** (same default root), followed by other bucket names and user-configured labeled leaves. Every leaf clicks directly to its exact account/bucket/prefix, without a deeper submenu.
- **No third destination depth** in Simple. **No `Buckets` anywhere in Simple's normal native destination menu.**
- Do not affect Nested/Narrow and Nested/Level/Depth navigation.
- The REDOWN toolbar Shelf/popup opening is a completely different interface: do not confuse the Chrome extension's toolbar-attached popup with a **right-click submenu**.

## 2. REPRODUCE AND FIX THE EXACT PRESENT CODE DEFECT

Start with `AGENTS.md`, `FOREVER_WORKS/v3/HANDOFF_LATEST.md`, `NEED_TO_DO/10312026.md`, `bugs/README.md` and the implementation sources.

**Source evidence, verified 2026-10-31:**
- `extension/right-click-v3.js:project()` maps eligible Simple destinations with **`parentId: root`**, placing them immediately under REDOWN.
- The same non-Level branch then **unshifts `v3:buckets`** and all activated bucket roots into **Simple**, creating the unwanted **Buckets** submenu and making custom locations peers of it.
- `extension/right-click-v3.js:resolve()` handles activated bucket IDs and individual destinations, but the new provider-parent/default-leaf IDs need precise, well-tested routing. Never return a default profile by guessing from the currently selected Explorer bucket.
- `extension/background.js:buildMenus()` registers the V3 projection, routes IDs, and adds normal utility controls. Fix registration, routing, and UI configuration together; changing only `title: 'Buckets'` to `'Cloudflare'` is **not a fix**.
- `setupRedownQuickDestination(accountId,'Cloudflare')` already checks/creates `redown` and prepares a profile. Audit/reuse safely; beware legacy-era profile mutations and idempotency.
- Older `docs/SIMPLE_RIGHT_CLICK_MENU_CONTRACT.md` explicitly calls for flat peers underneath REDOWN. **That historical rule is superseded by THIS provider-parent structure.** Update that doc's header and tests instead of treating both instructions as active requirements.

Inspect all relevant native `chrome.contextMenus.create/update/remove`, stable ID routing, configuration revisions and the right-click editor. Identify whether old and new configuration stores cause duplicates, omission or mode mismatch. **One V3 source of truth; do not reintroduce Legacy.**

## 3. FIRST-RUN ONBOARDING AND EXISTING USER SAFETY

The intended onboarding is **Connect Cloudflare → verify/reuse or safely create one default `redown` R2 bucket → Activate Buckets once → right-click REDOWN → Cloudflare to save**.

- Reuse existing account's `redown` if already present, without modifying its contents or public visibility. Only create the bucket after complete, authorized verification of absence; uncertain listing/create outcomes are not permission to create repeatedly. Idempotent across worker restarts/concurrent events.
- Keep the already established **one global Activate Buckets action**, which activates all eligible buckets; this is independent of whichever bucket Explorer highlights.
- Only one chosen default account+bucket for quick-save. Multiple accounts require a stored explicit default/established identity, not random selection. Do not create `redown` separately in every account.
- Preserve custom destinations and each profile's labels, order, activation, selected account, prefix and existing data through migrations, mode switching and extension reload.
- Fresh installs default to Simple. Existing users with explicit Nested selection must retain it. Existing customized Simple locations must migrate safely to the Cloudflare parent, **not be deleted, renamed in storage, or silently redirected to `redown`**.
- Make required settings choices clear but do not redesign the established polished V3 tree editor. **Adding a location in Simple puts it under Cloudflare immediately after acknowledged Apply**; no repeated Reload.
- Cloudflare save action must invoke existing verified transfer execution; a menu registration acknowledgement does not establish a completed file save. Preserve Keep Both default and protected cloud/private access.

## 4. PRESERVE THE OTHER TWO MENU MODES — TEST REGRESSIONS

**Nested → Narrow:** Generate a natural hierarchy from the user's deliberately configured destinations only. Maintain existing descendant relationships, intermediate ancestors, `Save here` semantics where supported, labels, ordering, keyboard reachability and original exact routes. Do not force Cloudflare's Simple-only provider submenu into Narrow.

**Nested → Level → Depth 1–10:** Expose the real known authorized bucket roots and their discovered folder structure to the selected Depth. Depth is a *view projection*, not a destructive data filter. Preserve actual bucket participation, private activation, folders and advanced scope controls. The previously reported `Depth 5 → Reload → only Depth 3 remains` regression is forbidden. When Depth changes 5→3→5, known branches must reappear immediately and further discovery merge safely.

**All modes:** No debug inventory strings among Chrome's native destination choices; a partial scan must retain still-authorized usable paths; navigation/selection should be stable; no duplicate entry IDs or hidden intentional save destinations; exact save receipt and provider route must match clicked leaf. Respect actual Chrome menu size/behavior limits instead of claiming infinite entries.

## 5. APPLY / RELOAD / RIGHT-CLICK RELIABILITY (P0 FOLLOW-UP)

- `Save Changes` must durably save the latest revision **and** acknowledge native Chrome menu application. Show restrained perimeter shimmer while really applying, stop on success/failure, with `Retry Apply` for actionable failures. No user-facing scan/debug dump.
- On a real Level Depth Save, perform the existing bounded refresh promptly and at most one delayed ~30-second follow-up for the current generation, via MV3-safe scheduling. An unchanged Save or right-click opening must not restart all bucket scans.
- Fix old in-flight generation promises swallowing the latest Depth request. Superseded scans cannot clobber newer menu state. Repeated Reload must **reconcile**, never destructively replace the complete known tree.
- Keep the original registered REDOWN root usable through recoverable provider/listing failures; preserve existing menu-recovery architecture and separate it from toolbar Shelf/popup opening.
- No focus losses, deleted draft forms, text-input hijacking or full Right-click Setup rerenders during small changes. Activated buckets update the editor without a page reload.

## 6. PERSISTENT TREE AND INTERRUPTED SCANS — FOLLOW THE EXISTING CANONICAL SPEC

Implement after the Simple slice using `FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md`, not a second incompatible architecture.

- Durable **complete known authorized graph** independent of Depth, cache TTL and native menu budget.
- Transactional current tree + **append-only verified delta journal** (portable JSONL representation/export) + per-account/bucket/prefix discovery checkpoints + reconstructable historical versions. IndexedDB or justified equivalent; do not write to packaged extension files.
- A confirmed REDOWN-created/renamed/deleted folder updates its affected branch promptly after cloud acknowledgement. Unchanged branches aren't rewritten, and incomplete listings never manufacture deletions.
- OAuth disconnect and MV3 suspension **pause** the affected scan and preserve the last committed page/frontier. Reconnect same validated account and resume when cursor valid; if invalid, restart only the affected listing segment. Avoid endless retries and credential leaks.
- **Refresh Folder Listing…** verifies only the selected authorized folder (immediate children by default, optional bounded recursive scan); compare against persistent tree, merge verified changes, and preserve all other branches. Place advanced refresh in nested/utility/Explorer surfaces so **Simple's single Cloudflare entry stays clean**.
- Respect Chrome native-menu limits: persist more than is currently projected, with bounded/fair menu coverage and a browse-further fallback instead of silently losing full graph content.
- History policy **Daily DEFAULT / Weekly / Off** controls historical restore points only. Live directory memory stays enabled in all modes. No fabricated offline snapshot dates, duplicated full copies for unchanged trees, or claims that directory metadata restores deleted file bytes. Full Time Machine UI may follow separately.

## 7. EXACT REQUIRED ACCEPTANCE MATRIX

**P0 Simple (MUST PASS FIRST):**
1. Fresh install, one authorized Cloudflare account and verified R2 bucket literally named `redown`: visible destination structure is exactly `REDOWN → Cloudflare`, with **no Buckets** submenu and no custom peer nodes. Click Cloudflare → verified save to **that account's `redown` bucket ROOT (`prefix: ''`)**, regardless of Explorer's selected bucket or last-used folder. If that bucket is not yet verified, the click must initiate an honest setup/connection route, not an arbitrary upload.
2. Add one existing folder with Menu Label `Photography`: now `REDOWN → Cloudflare → REDOWN` (saves to default `redown` ROOT) **and** `REDOWN → Cloudflare → Photography` (saves to exact configured prefix). Two sibling leaves; it is not a deeper folder tree.
3. Add `Projects` and `Backups`: Cloudflare children are `REDOWN`, `Photography`, `Projects`, `Backups` in stable deterministic order. No `REDOWN → Projects` peer and no `Buckets` heading. An additional authorized/activated discovered `other-bucket` shows as another direct sibling leaf named `other-bucket` (or disambiguated display name).
4. One custom destination points to a 6+ segment remote folder: native Simple still exposes **one labeled child leaf** and click writes to the full exact prefix.
5. Blank label fallback, explicit label, duplicate labels, rename/reorder/delete *menu configuration only*, invalid/unauthorized account and partially activated buckets all behave correctly. Removing the last custom child restores direct Cloudflare leaf **only when no other eligible discovered bucket remains**. Otherwise keep the `Cloudflare → REDOWN` default and other bucket child(ren). Do not alter underlying cloud objects or configured defaults.
6. Migration with existing V3 custom Simple destinations preserves IDs/owner/prefix and makes them Cloudflare children. Switching Simple↔Narrow↔Level restores each mode and does not erase configured destinations.
7. Existing `redown` bucket with objects is reused unchanged; account creation not repeated after timeouts or multiple logins. Multi-account identity cannot redirect a save.
8. Right-click on a link/image/page/video invokes the correct existing save handler and produces an actual verified receipt (use disposable test objects when permission permits).

**Advanced P0/P1 regression (after Simple):**
9. Nested/Narrow configured hierarchy and Nested/Level selected bucket/depth remain unchanged; Level Depth 5→3→5 retains known branches.
10. Partial/expired/failed scanning and Reload cannot erase deeper known paths; a new-generation Save always wins.
11. Confirmed REDOWN change propagates promptly; external change appears after targeted refresh; unchanged refresh yields no path mutation/journal change.
12. OAuth failure after thousands of recorded entries, MV3 stop mid-page and expired cursor resume without global restart, duplicate events or data loss.
13. Native Chrome registration failure retains a root/management recovery route where possible; successful Apply is truthfully acknowledged, with no inventory warning menu rows.
14. Daily/Weekly/Off snapshot policies and compaction work after underlying graph is built; historical observations are honestly timestamped.
15. Real **installed Chrome** right-click menu screenshots and click-to-destination transfer proof for no-custom and multi-custom Simple, plus Narrow/Level smoke checks. Mock-only tests **do not** certify actual Chrome behavior.

## 8. IMPLEMENTATION AND DELIVERY DISCIPLINE

1. Read `AGENTS.md`, `docs/SIMPLE_RIGHT_CLICK_MENU_CONTRACT.md` (historical, now superseded for hierarchy), `NEED_TO_DO/10312026.md`, `FOREVER_WORKS/v3/HANDOFF_LATEST.md`, `FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md`, `docs/reliability/ATTACHED_TOOLBAR_POPOUT_CORRECTION.md`, `extension/right-click-v3.js`, `extension/background.js`, `extension/beta/right-click-v3-ui.js` and existing V3/menu tests. Inspect actual latest branch sources and protected tags before modifications.
2. First commit a focused **Simple Cloudflare-only provider subtree and exact routing** fix with regression tests. Make sure Simple's initial case and custom submenu both work. Do not defer this behind a migration to IndexedDB.
3. Then address Depth/Save invariants and add durable index/recovery in **separately testable increments**. Do not turn a small menu bug into a high-risk reimplementation. Do not stop after an audit.
4. Keep a root-cause/evidence report per significant repaired behavior in `FOREVER_WORKS/v3/`; update `bugs/README.md`, the Need To Do list, and **put the 2026-10-31 supersession at the top of older Simple documentation**.
5. Run focused unit/domain/whole-worker tests, `npm run reliability:check`, and installed-Chrome end-to-end verification where authorized/available. State exact pass/fail and historical baseline differences; no masking failures by rewriting tests. **Never** report live R2 object saves as tested if no live provider action occurred.
6. Preserve V3-only architecture, existing Shelf-first toolbar/attached-action-pop-out emergency fallback, toolbar branding correction, all other Explorer/History functions, user preferences, private R2 defaults, and protected checkpoint tags. No unsolicited popup windows or new browser tabs as launcher fallback.
7. Commit and push implemented code, tests and documentation to the mandatory branch. Report each implemented phase and what remains open; no false “everything is complete” release claim.

### FINAL OWNER ACCEPTANCE

**A brand-new user sees:** `REDOWN → Cloudflare`.

**When additional labeled locations or buckets exist:** `REDOWN → Cloudflare → REDOWN` (default bucket ROOT) **plus sibling** `Menu Label` and/or discovered bucket-name leaves. **Never a separate Buckets heading or another submenu depth.**

**A power user can still switch to Narrow or Level and traverse genuinely authorized folders without losing remembered directory knowledge when REDOWN refreshes or disconnects.**

**FIX SIMPLE FIRST. PRESERVE WHAT WORKS. THEN BUILD THE RELIABLE FOUNDATION.**
