# CODEX IMPLEMENTATION REQUEST — REDOWN V3 P0 RIGHT-CLICK RECONSTRUCTION

**Repository:** `thanks-cohn/REDOWN`  
**Mandatory existing branch:** `codex/v3-parity-first-reconstruction`  
**Priority:** EMERGENCY P0 (actual Chrome saving, reliable native registration, and correct provider routing) followed by controlled durability/recovery phases.  
**Execution:** Inspect → reproduce → implement → test/fault-inject → validate in installed Chrome when possible → document → commit → push.  
**Directive:** **IMPLEMENT PRODUCTION CODE. DO NOT STOP AFTER AN AUDIT, UI MOCKUP, DOCUMENTATION UPDATE, OR TEST-ONLY CHANGE.**

## 0. Before writing a single line of production code

Read these two NEW CANONICAL owner-approved contracts **in full, in this order**:

1. `NEED_TO_DO/CODEX/logic-tables.md` — exact decision states, invariants I01–I20, proofs P01–P10, tests T01–T28 and counterexamples. Treat their latest owner menu decisions as authoritative.
2. `NEED_TO_DO/CODEX/Explanation.md` — complete user interaction and engineering semantics.

Then read `NEED_TO_DO/11012026.md`, `NEED_TO_DO/fundamentals.md`, `AGENTS.md`, `FOREVER_WORKS/README.md`, `FOREVER_WORKS/CURRENT_STATE.md`, `FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md`, `docs/CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md`, `docs/CODEX_V3_P0_SIMPLE_CLOUDFLARE_AND_RIGHT_CLICK_FOUNDATION.md`, current test suites, and actual source.

**Conflict precedence:** New `logic-tables.md` and `Explanation.md` override any old example that says the default `REDOWN` destination appears FIRST inside expanded Cloudflare. The only approved arrangement is **eligible siblings → native separator → Home LAST**; Home is a **provider-local default SAVE**, not the application's dashboard. Preserve every non-conflicting earlier requirement. Correct stale prose/fixtures as part of implementation. Do not replace the carefully designed V3 editor.

**Protected baseline:** Preserve `BASE-v3`, `base-V3-2.0.0`, `V3-BEFORE-NARROW-DEPTH-RECONSTRUCTION` and `V3-MENU-MODES-BEFORE-HISTORY-REPAIR` tags; never reset/move/rewrite them. Work and commit only on the mandatory branch, using the existing checkout unless environment policy requires otherwise.

## 1. FIRST FIX THE ACTUAL OWNER-REPORTED INCIDENT

A new computer / fresh extension installation reportedly shows this failure: right-click a web object, choose REDOWN → Cloudflare while logged into Cloudflare, and the click unexpectedly leads to REDOWN Explorer/Home rather than saving.

**This report is not yet a confirmed root cause.** Inspect and reproduce, first in actual installed Chrome if permitted, otherwise the closest faithful extension/service-worker/native-menu harness and mark live proof OPEN.

Trace the entire chain:

- Loaded source commit/version and `extension/manifest.json`, native menu registration on install/start/wake, root and child IDs, actionable row kind and parent.
- Cloudflare OAuth “logged in” versus active prepared/authorized bucket profile, worker health, default `redown` bucket verification and available token/session/permissions. A clean Chrome profile does not inherit `chrome.storage.local` or secrets from a Git branch checkout.
- `extension/right-click-v3.js`: `simpleTargets`, `simpleProjection`, `narrowEntries`, `levelProjection`, `project`, `resolve`, account identity and route stability.
- `extension/background.js`: `buildMenus`, `ensureMenuAccess`, `addMenuControls`, native create/update/remove and acknowledgment, `resolveActiveRightClick`, `chrome.contextMenus.onClicked`, `redown-go-home`/`openRedownHome`, `launchSaveDroplet`, `ingestCloudflareAtPrefix` and transfer confirmation.
- Search for duplicate dispatch, stale IDs, accidental setup fallthrough, residual Legacy menu paths, misleading status UI and destructive native rebuilds. Do not claim any of these as the cause until proven.

**Immediate deliverable:** with one verified default, `REDOWN → Cloudflare` **saves** to exact Cloudflare account / R2 bucket literally `redown` / empty prefix. If not configured or not actually writable, provide explicit supported setup/reconnection and no false save. A click on Cloudflare must never silently turn into Explorer Home navigation. One native save click causes at most one remote transfer and truthful receipt.

## 2. EXACT SIMPLE CHROME MENU; NO MORE REINTERPRETATION

**Default only:** `REDOWN → Cloudflare` is a direct-click leaf that saves immediately.

**After eligible Cloudflare siblings exist:**

```text
REDOWN
└── Cloudflare
    ├── Sibling A      [exact configured destination]
    ├── Sibling B      [exact configured destination]
    ├── Browse more…   [only if required by native item budget]
    ├── ─────────────  [type:"separator", under Cloudflare]
    └── Home           [LAST: exact old default R2 "redown" bucket root]
```

- No separate Buckets intermediary, and no arbitrary deep subfolders in Simple.
- Chrome provider parent with children is navigation-only; its default save moves into Home (with stable exact target identity), then moves back into the clickable provider leaf when no extras remain.
- Home is not `redown-go-home`. Keep these two command paths distinct.
- Preserve configured labels and IDs. Duplicate custom Home/Projects labels are display-disambiguated only; never silently rename stored records or repoint targets.
- Do not duplicate the default bucket/root when activated inventory contains it.
- Unverified/ambiguous default ⇒ no fake actionable Home. Authorized extra targets may still be available independently.
- Adding another provider never expands Cloudflare unless Cloudflare gained its **own** eligible children.
- Allocate room for native separator + Home and a bounded Browse more path before using all Chrome item capacity.

**Every future capable provider** follows the same per-provider Home-last convention when expanded, but does not share Cloudflare's bucket account or permissions. A provider with only one verified writable default remains a direct-save leaf. Providers without a genuine functioning adapter MUST NOT be presented as working native save entries.

## 3. DO NOT BOTCH NESTED — ONLY TWO MODES, TWO NESTED SUBMODES

Keep top-level **Simple** and **Nested**. Inside Nested, preserve **Narrow** or **Depth 1–10** (`nested:'level'` internal compatibility). Never introduce three peer modes.

**Narrow = curated explicitly configured endpoints + their natural bucket/folder ancestors.** Example three buckets with eligible shortcuts:

```text
REDOWN
└── Cloudflare
    ├── redown
    │   └── photography
    │       ├── portraits
    │       │   └── Best Portraits
    │       └── street
    │           └── Street Selects
    ├── works
    │   ├── clients
    │   │   └── acme
    │   │       └── Deliverables
    │   └── portfolio
    │       └── web
    │           └── Launch Assets
    ├── archive
    │   └── 2025
    │       └── photos
    │           └── Favorites
    ├── ─────────────
    └── Home
```

Selected bucket in Depth setup **does not** expose all its folders in Narrow. Narrow bucket branch appears only when a configured eligible endpoint (including an explicitly configured bucket root) needs it. Structural path ancestors are not invented save endpoints. Exact user Menu Labels belong to configured endpoints; actual folder ancestors use natural names. Parent with children that is itself configured as a save must have a separate `Save here` child. Cross-account identical paths never merge. No whole-bucket crawl for Narrow.

**Depth = actual known/discovered authorized directory hierarchy** from participating containers, bucket-relative levels 1–10, using actual provider-native folder names and IDs. Provider header does not consume depth. Depth 5→3→5 must never destroy level-5 CURRENT records, and incomplete scans do not delete paths. Depth must reproject known authorized records immediately, subject to Chrome menu capacity, without mandatory cloud listing on right-click. Only providers with actual listChildren capabilities may offer working Depth.

Home follows the same final verified-provider-default convention within expanded Nested submenus. Preserve all existing Narrow/Level user configuration and tree editor styling.

## 4. PROVIDER-LOCAL CAPABILITY AND ROUTE FOUNDATION

Design a provider-neutral **interface**; do NOT invent Google Drive, Dropbox, OneDrive, GCS, MEGA S4 or arbitrary S3 production integrations to satisfy an architectural fixture.

Every adapter reports its own actual auth, writable-default verification, listRoots, listChildren, target resolution, remote save, pagination, and directory capabilities, with explicit supported/unsupported/unavailable/error states.

Canonical identity must include `providerKind + connectionId + account/tenant/endpoint + native container ID + native folder ID or exact object prefix`. Cloudflare R2, Google Cloud Storage, Google Drive, MEGA S4, OneDrive, Dropbox and multiple custom S3 endpoints must never collide. No raw secrets in IDs, menu labels, logs or exports. Drive-native IDs cannot be coerced into fake S3 prefixes.

Provider P's edits advance P's CURRENT/journal/checkpoints/native subtree only; provider Q's records remain byte-equivalent unless a genuinely shared global setting changes. Introduce synthetic isolated fixtures to prove this without claiming those providers are connected.

**Never route by displayed label, recently used Explorer bucket, saved UI position or obsolete native menu snapshot.** On click, resolve exact committed CURRENT action and recheck current provider/account authorization, then call the genuine adapter.

## 5. PRE-REGISTER NATIVE CHROME ITEMS; DO NOT SCAN ON RIGHT-CLICK

The actual native menu must be ready BEFORE right-click. CURRENT is the authoritative graph; the Chrome menu is a derived, bounded, deterministic projection and a separate applied-generation read model.

Implement/stabilize:

- Parent-first native menu IDs and registration, provider-specific action routes, native separator type, exact stable ID and a plan checksum/generation.
- Serialized reconciliation that preserves last usable root/Manage entries where Chrome permits. Do not use `removeAll` as a casual destructive rebuild. Handle create/update/remove failures and stale asynchronous generations.
- Desired versus Chrome-acknowledged applied generation, honest Save Changes/Apply/Retry Apply, atomic local model commit followed by separately acknowledged native menu operation.
- MV3 sleep/wake, startup, install and interrupted registration recovery from CURRENT **before** running remote discovery.
- Bounded native projection that cannot starve later buckets; accessible authenticated full-tree Browse more for saved eligible nodes outside Chrome's limits.

Do not confuse quick visual registration with transfer completion. Measure cold/warm Apply/launch p50/p95 from actual tests; don't invent universal latency claims.

## 6. PERSISTENT CURRENT, JSONL, RECONCILIATION, AND DAILY COPIES

After immediate right-click correctness is secured, implement the authoritative per-provider CURRENT-first model required by the existing P0 handoff, in small verified commits.

- Store known authorized graph, exact configured route IDs, provider/account/container identity, discovery checkpoints and freshness/coverage metadata in durable extension IndexedDB.
- One confirmed edit changes only affected WORKING/CURRENT records and the matching provider-specific JSONL semantic event/checkpoint/pointer **within one IndexedDB transaction**. Do not falsely report a remote operation as confirmed before provider success.
- Chrome native menu registration happens AFTER local transaction and is not part of it. A crash between them means desired>applied; recover deterministically.
- Partial scans merge verified additions and meaningful confirmed removals. Failed/unread scopes, stale TTL and temporary OAuth expiry do not imply deletions. Identical complete observations produce zero semantic journal events and avoid pointless native churn.
- On actual first active use in new eligible period: immutable dated BACKUP plus distinct mutable WORKING; CURRENT points to newest. Daily default, Weekly and Off history policy, idempotent rollover across DST/offline gaps/multiple tabs/crash. **No automatic daily full-cloud crawl**.
- Connection-specific logical JSON, JSONL, BACKUP, WORKING, CURRENT, scan checkpoints and native subtree, with collision-proof identity. Do not require separate physical databases/files where one IndexedDB schema safely maintains namespaces.
- Permit targeted “Refresh Folder Listing” and bounded resumable scans, without changing unrelated buckets.

**Durability truth:** IndexedDB and Chrome extension-local snapshots cannot survive deletion of ALL extension-origin data by themselves.

## 7. EXTERNAL BACKUP OUTSIDE BROWSER-ORIGIN DELETION

The user explicitly wants an independent long-lived record that is **outside the reach of deleting browser cache, extension storage or the Chrome profile**.

Build a safe explicit user-authorized backup/export and recovery path as a distinct implementation phase (not a marketing claim or no-op settings toggle):

1. Versioned, integrity-checked, provider-namespaced portable metadata for CURRENT + configured destinations + necessary journals/checkpoints + dated anchors. No plaintext tokens/cookies/passwords or hidden public URLs.
2. User chooses a supported independent local export or private cloud destination and authorizes any cloud metadata writes. Do not provision buckets, enable public access, or add costs silently.
3. Mark external backup **verified** only when separate storage success AND integrity/read-back are confirmed; retain actual timestamp and failure state. A local copy alone is NOT external safety.
4. On new profile/computer, explicit validated restore/import, schema/conflict handling, reconnection of exact cloud providers and current authorization checks before enabling any saves. Importing an index never grants remote cloud permission.
5. Keep external cadence/consent separate from local Daily/Weekly/Off snapshot cadence. If no independent backup exists, honestly report unrecoverable deletion.

If platform or permissions prohibit an external write/restore in the working environment, implement safe offline export/import and its tests, mark live independent write/read-back as OPEN, and do not claim that total-deletion recovery has been proven.

## 8. PRESERVE THE WHOLE APP

Do not break the V3 Setup tree, inputs/typeahead, configured labels, menu mode migrations, active Cloudflare Workers, private-by-default URLs, verified transfer receipts, Explorer, Shelf-first toolbar and its attached-popup fallback, branded icon state, History GO TO exact-file navigation, Keep Both/conflict handling, or existing message contracts. No active second Legacy context-menu engine.

Do not roll P1 Window View/Lightbox/navigation cosmetics into the P0 right-click patch unless an unavoidable shared issue requires it. Those are separately tracked in `NEED_TO_DO/11012026.md`.

## 9. TEST REQUIREMENTS ARE NOT OPTIONAL

Implement and run corresponding automated tests for **T01–T28** in `NEED_TO_DO/CODEX/logic-tables.md` plus the listed property/metamorphic tests. Include:

- Fresh install direct Cloudflare save and verified read-back when authorized; never unexpected Explorer navigation.
- Cloudflare 0/1/2+ extra state transitions, sibling order, native separator, Home-last exact target and restoration after last child removal.
- Five explicitly configured Narrow save routes across three buckets; no unselected paths despite real inventory; configured parent/descendant `Save here` correctness.
- Depth 1/2/5, bucket-level off-by-one, Depth 5→3→5 without graph deletion, one bucket incomplete among 18.
- Provider isolation, multiple accounts/endpoints/identical container names, labels named Home, auth revocation, stale clicked IDs, unsupported provider capability.
- Crash after IndexedDB commit before Chrome applied, failed native create/update/remove, concurrent Apply/worker restart, duplicate-save guard.
- No-click-time cloud scan, bounded projection under 300+ entries, authenticated chooser and Home retention.
- Daily rollover and JSONL idempotence; external backup corruption, missing backup, valid import/reconnect, absence of exported secrets.
- Fresh/upgrade installed Chrome, actual native screenshot/IDs, source context types, real provider operation and timing where environment permits.

Read and run `AGENTS.md`-mandated diagnostics/reliability checks as far as permitted. Record baseline failures independently, don't “fix” tests by weakening assertions or overwriting frozen history. **If installed Chrome is blocked, mark browser evidence NOT VERIFIED; mocks are not proof.** No cloud-mutating test without actual authorization.

## 10. Required delivery and execution order

**Phase A — first mandatory functioning code:** reproduce incident; fix native Simple provider leaf/submenu/Home-last routing, canonical save actions, safe setup when not ready, and native registration/dispatch. Execute focused integration and clean-profile browser tests where possible. Commit.

**Phase B — nested correctness:** correct provider-first Narrow multi-bucket trie and real participating-bucket Depth, exact save-here, Home placement, stable IDs, native capacity and Apply acknowledgment. Execute targeted and regression tests. Commit.

**Phase C — durable CURRENT hot path:** atomic records/journal, scope-local updates, desired/applied generations, non-destructive partial scans and MV3 recovery; preserve all previously known authorized nodes. Crash-injection tests. Commit.

**Phase D — dated/local history and provider-neutral capability seams:** Daily BACKUP/WORKING/CURRENT with journal, no daily crawl, namespaced providers, synthetic multi-provider fixtures and measured performance. Commit.

**Phase E — actual independent export/recovery safety:** opt-in external backup/export, integrity verification, explicit restore/reconnect and truthful UI. If full live integration unavailable, provide tested safe offline export/import and explicitly open the blocked independent read-back acceptance. Commit.

These phases may require more than one commit. **Do not stop after a proposal or documentation.** If some phases cannot be safely completed, ship tested working vertical slices and explicitly mark the remainder incomplete; do not falsely claim full success. Fix P0 first rather than letting future provider integration overwhelm it.

Final report MUST provide: root cause evidence versus hypotheses, code paths changed, before/after real native structure, exact canonical save target receipts, tests/pass/fail (including baseline and gaps), timing, backup/restore proof and limitations, every pushed commit SHA, and which T01–T28 remain OPEN. If live Chrome or real Cloudflare verification was unavailable, state that plainly.

**NON-NEGOTIABLE OWNER ACCEPTANCE:** Right-click REDOWN opens a correctly pre-registered native menu; its Simple/Narrow/Depth structures behave exactly as the two canonical docs specify; Home is always the correct provider-default save when applicable; no click goes to the wrong cloud or dashboard; no saved authorized folder disappears after unrelated changes; and full browser-data deletion is recoverable only through an actually verified independent backup.