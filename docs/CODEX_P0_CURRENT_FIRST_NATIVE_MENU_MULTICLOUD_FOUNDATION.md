> November 1 flat-provider supersession: `CODEX_REQUEST_CLOUDFLARE_ONLY_NESTED_MENU_FLAT_OTHER_PROVIDERS_2026-11-01.md` overrides older non-Cloudflare submenu proposals below. Google Drive, Dropbox and OneDrive each use one direct native leaf; only Cloudflare retains V3 nested menus. Implementation and verification: `docs/FLAT_PROVIDER_MENUS_REPORT.md`.

> November 1 supersession: [logic-tables.md](../NEED_TO_DO/CODEX/logic-tables.md) and Explanation.md control menu semantics. Expanded providers use configured siblings, a native separator, then **Home last**, saving to the verified provider default. Older default-first examples below are historical.

# REDOWN V3 EMERGENCY P0 — CURRENT-FIRST INSTANT NATIVE RIGHT-CLICK, DAILY DUAL-COPY MEMORY, CRASH RECOVERY, AND PROVIDER-FIRST MULTI-CLOUD FOUNDATION

**Repository:** `thanks-cohn/REDOWN`  
**MANDATORY working branch:** `codex/v3-parity-first-reconstruction`  
**Owner-approved direction:** 2026-10-31  
**Execution:** INSPECT → REPRODUCE → IMPLEMENT → FAULT-TEST → VERIFY → DOCUMENT → COMMIT → PUSH.  
**THIS IS A PRODUCTION IMPLEMENTATION REQUEST, NOT AN AUDIT-ONLY TASK.**  
**Protected checkpoint tags:** `BASE-v3`, `base-V3-2.0.0`, `V3-BEFORE-NARROW-DEPTH-RECONSTRUCTION`, `V3-MENU-MODES-BEFORE-HISTORY-REPAIR`. Never change/move/delete them.

## 0. READ AND HONOR THE EXISTING APPROVED SPECIFICATION

**Authoritative source of product semantics:** `NEED_TO_DO/fundamentals.md`. Read it in full, then read `AGENTS.md`, `FOREVER_WORKS/README.md`, `FOREVER_WORKS/CURRENT_STATE.md`, `FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md`, `docs/CODEX_V3_P0_SIMPLE_CLOUDFLARE_AND_RIGHT_CLICK_FOUNDATION.md`, `NEED_TO_DO/10312026.md`, and `bugs/README.md`.

**Never reinterpret the mode hierarchy.** Two top-level choices only: **Simple** and **Nested**. Inside Nested: **Narrow** (only chosen destinations, grouped by natural hierarchy) OR **Depth** (actual discovered directories, numeric Depth 1–10). Internal stored `nested:'level'` may continue to mean the user-facing Depth submode. All provider branches start at the provider entry below REDOWN.

**This request is about building a fast, crash-tolerant CURRENT source of truth and its native-menu projection, while preserving the approved menu.** Future multi-cloud support must not derail the urgent Cloudflare reliability fix.

### The absolute product invariant

> **The user's newly confirmed change appears in the Chrome right-click menu as soon as native registration acknowledges it. Every untouched, previously known, still-authorized directory remains accessible through Nested (in the native projection within Chrome limits, otherwise in REDOWN's full browse chooser). Neither a stale cache nor an incomplete cloud scan may erase, replace or hide CURRENT.**

The ordinary act of right-clicking must NEVER wait for a full IndexedDB read, JSON file parsing, network listing, cloud token refresh or folder discovery. Chrome must already have the valid native menu registered.

## 1. FINAL VISUAL CONTRACT — PROVIDER-FIRST AND FUTURE-PROOF

### 1A. Today: Cloudflare R2

With the sole verified default bucket `redown`, no other Cloudflare destination:

```text
REDOWN
└── Cloudflare     [direct save to verified R2 bucket "redown", prefix ""]
```

When additional selected locations or additional eligible Cloudflare buckets exist, Cloudflare becomes a **provider submenu**:

```text
REDOWN
└── Cloudflare
    ├── REDOWN           [ALWAYS FIRST; exact default redown bucket ROOT]
    ├── Photography      [custom Menu Label → exact account/bucket/prefix]
    ├── Projects         [custom Menu Label → exact account/bucket/prefix]
    └── other-bucket     [eligible verified bucket ROOT]
```

No separate `Buckets` intermediary in **Simple**. Simple children are direct-save siblings and **do not grow further folder levels**. If no other eligible Cloudflare children exist, Cloudflare becomes a direct-save leaf again. Never drop/relabel the existing default `redown` root or use Explorer's currently selected bucket as a substitute. Do not duplicate the default bucket when inventory includes it.

### 1B. Tomorrow: other providers ALONGSIDE Cloudflare

**The user's specific additional requirement:** Keep the **Cloudflare provider-entry level** because Google Drive, OneDrive, connected S3 storage and other providers may eventually appear **at that same level**. Do not remove, flatten or special-case away this provider-root architecture to save one menu click.

```text
REDOWN
├── Cloudflare           [existing R2 semantics]
│   ├── REDOWN
│   ├── Photography
│   └── other-bucket
├── Google Drive         [ONLY once genuinely connected and supported]
├── OneDrive             [ONLY once genuinely connected and supported]
└── S3                   [ONLY once genuinely connected and supported]
```

These are **illustrative future-capability rows**, NOT permission to display fake connected providers or ship unimplemented click actions. Unconnected/unsupported providers are excluded from normal native save choices; Settings/onboarding may offer explicit connection options separately.

**Cloudflare leaf behavior remains provider-local:** Adding Google Drive next to Cloudflare does not automatically force Cloudflare's own leaf to turn into a submenu if Cloudflare still only has its single default destination. Cloudflare changes leaf→submenu only when Cloudflare itself gains additional eligible children. An optional provider's own single default save destination may be a direct-save provider leaf only if that target is explicitly verified and unambiguous; otherwise its provider entry must offer valid location choices/setup in a user-initiated supported interface.

### 1C. Nested: preserve the original two submodes for EACH provider

```text
REDOWN
└── Cloudflare
    └── REDOWN
        └── photography
            └── portraits
                └── Best Portraits   [chosen destination's Menu Label]
```

**Nested → Narrow:** Only manually selected/configured destinations, connected by natural ancestor paths. Menu Labels are for configured destination leaves. Do not enumerate unselected folders. Provider name sits before that provider's bucket/drive/container/path structure.

```text
REDOWN
├── Cloudflare
│   └── REDOWN
│       ├── photography
│       └── projects
└── S3
    └── my-archive-bucket
        ├── photos
        └── receipts
```

**Nested → Depth:** Authorized actual known/discovered directories of each *participating* connected provider/container, to selected Depth 1–10. Use real folder/container names, not configured Menu Labels, for actual directory navigation. Provider header is not counted in the provider-relative folder-depth limit; do not quietly change established bucket-relative semantics. Decreasing Depth must not delete deeper CURRENT paths; increasing it reveals known paths immediately.

For future Google Drive / OneDrive, provider-native folder IDs, drives/sites and account identities must be represented rather than pretending those systems use S3 string prefixes. For future S3-compatible storage, include endpoint/provider instance, account/credential scope, bucket and exact object prefix identity; never collapse all distinct S3 endpoints into the same account/bucket key. Two S3 connections must remain distinguishable without exposing secret connection strings in native labels.

**Preserve currently working Cloudflare, existing activated-bucket scopes and V3 destination editing.** Design the provider-neutral contract now; implement only truly available provider adapters. A new native menu label is not a substitute for a functioning OAuth/credentials/transfer implementation.

## 2. FAST PATH: PRE-REGISTER NATIVE ITEMS; DO NOT QUERY INDEXEDDB WHEN THE MENU OPENS

### Native Chrome menu = already prepared view; CURRENT = authority

1. REDOWN owns a durable, complete **CURRENT working graph** in extension IndexedDB. The graph includes every known retained authorized path and the full configured destination state. Backup and journal records never compete with CURRENT as read authority.
2. A deterministic projector maps CURRENT + user-selected mode/submode + provider participation + verified authorization into a bounded **Chrome native menu plan** with stable IDs, parent-first order, route mapping, generation and projection checksum.
3. An incremental native registrar calls `chrome.contextMenus.update/create/remove` **ahead of right-click** as needed. Registration is serialized, awaits real Chrome acknowledgment and reports the latest acknowledged plan generation.
4. **At actual right-click time, Chrome displays its existing registered entries.** No `onShown` blocking discovery, no opening of an extra custom popup, no load-the-entire-JSON or cloud API call simply to render choices.
5. When `chrome.contextMenus.onClicked` fires, resolve stable clicked ID → latest committed CURRENT route, recheck exact provider/account/container and authorization, then invoke the existing verified save pipeline. Never trust the click label, the previously selected Explorer bucket or an obsolete native plan as routing authority.
6. Keep the REDOWN root and a usable Manage/Recovery entry during recoverable failures where Chrome permits. A submenu/chooser fallback must make all eligible known paths reachable even if the native menu has entry limits.

Do not claim a live Chrome menu can dynamically render unlimited thousands of rows or that a menu already physically open will redraw instantly in-place. The user should see the acknowledged latest version on the **next opening**, with the minimum supported propagation delay.

### Real source evidence that must be audited before editing

- `extension/background.js` already has `ensureMenuAccess()`, `nativeMenuIds`, `nativeMenuPlan`, `acknowledgeMenu()`, `rebuildMenus()` and incremental `chrome.contextMenus.update()` support. **Reuse and repair them**; don't build a second registration framework.
- As inspected, `buildMenus()` and `resolveActiveRightClick()` still depend on `chrome.storage.local` V3 configuration/`rightClickV3Inventory`; `writeV3MenuSnapshot()` persists a schema-v1 logical `chrome.storage.local['right-click.json']`. That is NOT yet the desired authoritative transactional CURRENT graph.
- The current `buildMenus()` can call `removeNativeMenus()` / `chrome.contextMenus.removeAll()` when stored native state is unknown. Audit this fallback carefully; **do not clear a functioning menu just because an in-memory registration list was lost**.
- A newer branch may have changed any of these details: inspect live source/tests and reproduce behavior before committing; do not assume this evidence is a current line number or a completed feature.

## 3. ATOMIC CURRENT TRANSACTIONS: ONE CHANGE UPDATES STORAGE THEN CHROME

**On a user editing a destination, changing a menu label, selecting a location, or completing a verified REDOWN directory operation:**

1. Confirm that a cloud mutation actually succeeded before asserting provider success (and reconcile uncertain outcomes); local configuration edits may commit directly.
2. In one bounded IndexedDB `readwrite` transaction update **only the changed canonical node/configuration records**, the matching journal event(s), scan checkpoint if applicable, the monotonically increasing `desiredGeneration` and the durable CURRENT pointer to the latest WORKING generation. Keep all untouched records.
3. Await transaction **commit**. Do not hold an IndexedDB transaction open while awaiting remote cloud APIs or Chrome menu registration; IndexedDB has its own transaction lifecycle.
4. Immediately compute the new deterministic menu plan from CURRENT. Diff against last acknowledged native plan; change only affected nodes when feasible, preserving all authorized ancestors and unrelated branches.
5. Await Chrome API acknowledgments; only then persist `appliedGeneration`/`appliedPlanHash` and report **Applied**. The native API is **not** part of the IndexedDB transaction: no false global-atomicity claim.
6. If Chrome rejects the update or the worker is killed mid-reconciliation, CURRENT remains correct, the most recently registered usable menu/root remains where possible, and `desiredGeneration > appliedGeneration` triggers safe replay/repair on the next supported wake/startup, Settings open or bounded alarm. No silent rollback of CURRENT and no clearing untouched locations.
7. After a delayed old scan returns, check its generation and authorization scope before any commit. Never replace newer CURRENT or newer native registration with old results.

**Desired goal:** A confirmed local UI edit should become usable in the registered Chrome menu without any provider-wide scan. Measure edit→IndexedDB commit and commit→native acknowledgment separately and report cold/warm p50/p95 timing in repeatable tests; optimize them rather than asserting a universal unverified millisecond guarantee.

## 4. DAILY DEFAULT: TWO DATED STATES + CURRENT + APPEND-ONLY JSONL

**Settings choices:** `Daily` **DEFAULT**, `Weekly`, `Off` (historic cadence only).

On each eligible **active** local day, establish TWO independently reconstructable logical dated states:

- **`YYYY-MM-DD/BACKUP` — immutable.** Today's unchanged base capture of the most recently verified/committed complete CURRENT graph. Never rewrite that day's BACKUP after edits.
- **`YYYY-MM-DD/WORKING` — mutable.** Seeded from that whole known graph, updated with every confirmed edit/newly verified discovered difference.
- **`CURRENT` — stable durable pointer/view to the newest committed WORKING generation.** This is the single authoritative source for native menu projection and routing. Avoid a redundant third mutable full tree.
- **`right-click.jsonl` — append-only, ordered, versioned logical delta journal.** One verified meaningful change becomes one idempotently recorded event (or a deliberately grouped transaction event), with canonical subject identity, before/after metadata as appropriate, observation timestamp, generation, sequence and idempotency key. No change = no change event.

Use **transactional extension IndexedDB** as the primary store (or a justified equivalent). Treat `right-click.json` and `right-click.jsonl` as portable materialized views/exports, **not literal files that can be appended inside the packaged extension**. Share unchanged nodes through copy-on-write/deduplicated state rather than copying 10,000 entries twice every day.

**New-period rollover:** When the extension actually becomes active for the first time in a new local calendar period, seal yesterday's final reconstructable WORKING generation, create the new immutable BACKUP and separate WORKING, atomically advance CURRENT, and never invent a midnight capture when Chrome was closed. Protect against concurrent tabs, duplicate worker starts, DST changes, clock/zone changes and crashes during rollover; verify policy for the user's chosen/local time zone.

**Weekly** creates weekly stable BACKUP+WORKING period states while CURRENT/journal still update per verified edit; **Off** disables *new dated historic points*, not CURRENT, working persistence or the journal. Retained history requires explicit deletion/retention controls; don't secretly preserve deleted snapshots.

**Invariant:** Twenty confirmed edits in one day → today's BACKUP unchanged; WORKING/CURRENT reflect all twenty changes; journal contains twenty real unique changes; every unedited authorized node remains accessible. Snapshot creation must not block the urgent menu update.

## 5. FULL-TREE SURVIVAL: SCANS MERGE VERIFIED DELTAS, NEVER REPLACE CURRENT

- **CURRENT is the complete known graph**, not the latest scan's subset. Repeated Reload, changing Depth, stale TTL, time/page budget exhaustion, disabled network, transient OAuth expiry and worker restart cannot cause a partial inventory to overwrite/downgrade CURRENT.
- When the user creates, renames, moves or deletes a directory through REDOWN, update precisely the verified affected branch and menu projection immediately after provider acknowledgment, never after a global rescan. Preserve optimistic pending UI but do not claim final provider success early.
- External changes can only be observed when checked. Use scoped/bounded `Refresh Folder Listing` and periodic authorized discovery where appropriate; do not invent instantaneous external change detection without provider events.
- A verified removal/tombstone requires exact acknowledged REDOWN mutation or a complete authorized parent-scope listing with adequate consistency evidence, never a partial page, 401, expired cursor, a missing record in the shallow Depth scan or an in-memory cache miss.
- Keep per-provider/account/container/prefix checkpoints, completed pages, cursors/frontiers, observation coverage and bounded retries; an interrupted page replays idempotently from last committed checkpoint and does not duplicate journal events.
- Depth 5→3→5: reveal already-known authorized depth-five records immediately from CURRENT, regardless of incomplete recent scans. Narrow never leaks unrelated unselected siblings into its presentation. Both nested submodes remain Cloudflare/provider-first.
- Native Chrome item limits do not truncate CURRENT. Use deterministic bounded projection plus a searchable **Browse more destinations…** in REDOWN for all eligible nodes not displayed natively. Do not promise every record fits within Chrome's native submenu limits.
- When only one configured node is changed among 18 activated buckets, none of the other 17 participating bucket branches can be destroyed, reinitialized, made unactionable without an authorization reason or dropped from CURRENT.

## 5A. NO DAILY RESCAN — ADAPTIVE INCREMENTAL RECONCILIATION CONTRACT

**Owner clarification (2026-10-31):** Daily BACKUP+WORKING rollover **MUST NOT** trigger a mandatory full provider or bucket crawl. At login/startup, load CURRENT and restore the already-registered menu immediately. Background verification is a separate, bounded, interruptible activity with its own persisted checkpoints. There is no requirement to synchronize all Cloudflare buckets before the user can use the existing authorized paths.

**Discovery work queue priorities (design, test and implement safely):**
1. **Highest:** a user-requested `Refresh Folder Listing` on an exact authorized scope, or reconciliation necessary after an explicit confirmed REDOWN edit; a confirmed in-product change is already known and must not be blocked waiting for this scan.
2. **Next:** unfinished or never-verified participating scopes that have valid persisted checkpoints, recently used paths, and scopes whose freshness has genuinely expired. Ensure fair progress across accounts/buckets rather than starving deep/older scopes indefinitely.
3. **Lower:** routine maintenance of long-untouched directories and safety checks for missed external modifications. Limit work by real provider quotas, paging, elapsed time, worker lifecycle and account authorization. Avoid aggressive perpetual scanning.

For every checked folder store `lastVerifiedAt`, `lastAttemptAt`, `coverageComplete`, `checkpoint/cursor`, and provider/account/scope identity. **Separate checking from changing**: re-observing an identical complete scope updates verification metadata only, producing zero semantic JSONL events and no pointless native menu rebuild. Do not assume the JSONL journal can discover external changes; it only records **verified differences already observed**. CURRENT is the read-optimized materialized graph, so **normal startup does NOT replay every historical journal line**; the journal is used for crash repair/reconstruction/history or as needed for migration. Resume at the last valid scan checkpoint after interruption; retry only the affected scope if a provider cursor is expired.

**Optional separate future extension:** Cloudflare R2 object-change notifications through Queues/Workers may eventually inform targeted verification when explicitly configured and authorized. This is NOT a required provider integration for this P0 request, is not guaranteed to detect all changes or deliver live notifications to a suspended browser, and does not replace periodic bounded reconciliation. Do not provision Queues/Workers or introduce new costs without authorization.

**Acceptance:** Startup after an offline day loads CURRENT and shows retained registered destinations **without listing any Cloudflare bucket**. Daily rollover creates the two logical dated versions locally; no provider crawl. A confirmed in-app change yields one CURRENT+journal update and targeted menu reconciliation without full rescanning. An external change in one chosen folder is recognized on scoped refresh and other directories remain intact. A repeated identical complete listing generates no semantic delta and no native registration churn. A scan interrupted on bucket 3/18 resumes without resetting the other 15.

---

## 6. FATAL ERRORS, CACHE FAILURES, BROWSER RESTARTS, REBUILD STRATEGY

A production recovery strategy must clearly separate these cases:

1. **MV3 worker suspended or restarted:** Its globals disappear, committed IndexedDB and Chrome's existing native context-menu registration normally remain. Event handler wakes, reads CURRENT for route on click; startup checks needed registration generation. No full scan.
2. **In-memory cache miss:** Read the persisted CURRENT pointer and nodes from IndexedDB; never initialize a fresh empty graph because a JavaScript variable disappeared.
3. **IndexedDB temporary read / transaction failure:** Keep existing registered native menu where possible; display concise actionable repair status in REDOWN Health & Repair. Do not replace valid entries with an empty tree.
4. **CURRENT pointer/index corrupted but backup + journal valid:** Validate checksums/generations, reconstruct the newest consistent state from immutable BACKUP and committed journal using safe migration/replay, **without discarding verified untouched nodes**. Require fault-injection tests before auto-repair writes.
5. **IndexedDB commit succeeds, Chrome API fails:** CURRENT wins; retain existing menu/root and `desiredGeneration`; retry latest generation on supported next wake. Persist clear desired/applied mismatch. Do not pretend two APIs are atomic.
6. **Chrome native menu entries lost but CURRENT intact:** Register REDOWN root + provider skeleton first, then repopulate from CURRENT in bounded deterministic parent-first order; verify each callback result. Avoid destructive `removeAll()` except as a last-resort fully justified/supported recovery path. Never rebuild from a shallow partial scan.
7. **Chrome disabled, extension uninstalled, profile reset, browser unable to run extension, or all extension-origin storage deleted:** REDOWN cannot guarantee an instant native menu or recover purely from IndexedDB/`chrome.storage.local`. An **independently stored and verified** user-authorized backup/export is necessary; reauthorize exact provider identity on import and don't restore stale privilege from directory metadata.

**Bootstrap / retry policy:** Initialize event listeners synchronously in the service worker's global scope, honor Chrome MV3 lifecycle, seed minimal REDOWN root/Manage path on install/startup when needed; avoid unbounded self-restarting retry storms or permanently awake workers. Persist repair intents and make recovery idempotent. A root menu can only be guaranteed when Chrome is functioning, the extension is enabled and the browser APIs permit registration.

## 7. PROVIDER-NEUTRAL DESTINATION CONTRACT (CLOUDFLARE NOW; OTHERS LATER)

Create or refine a **small, focused extension seam** around the existing V3 projection and transfer engine, not a second engine or mock cloud integration.

### Canonical route and provider capability model

Each destination/routing record must retain:
- `providerKind` (e.g. `cloudflare-r2`, future `google-drive`, `onedrive`, `s3-compatible`), `connectionId`, and exact `accountId`/tenant identity;
- Provider-native `containerId` (Cloudflare/S3 bucket; Drive ID, shared drive ID, OneDrive drive/item identity, etc.); provider-native stable folder identity (R2/S3 prefix string; Drive/OneDrive folder ID); optional human-readable hierarchical display path;
- Stable REDOWN destination ID, parent ID, user Menu Label where relevant, authorized/enabled/activated state, participation scopes, and version/generation;
- Capabilities supported by the real adapter: `listRoots`, `listChildren`, `resolveTarget`, `saveRemote`, `createFolder` where implemented/authorized, `verifyIdentity`, `health` and provider-specific pagination/cursor semantics. A capability absent from the adapter must not be shown as a working button.
- **No access tokens, OAuth refresh tokens, AWS secret keys, private signed URLs or account secrets** in exported `right-click.json`, `right-click.jsonl`, native menu titles or diagnostic logs. Secure connections and redacted identity references must remain separate from portable directory history.

**Provider semantics:**
- **Cloudflare R2:** retain established verified `redown` default, global activation, private-by-default policy and exact account+bucket+prefix save behavior.
- **Generic S3/S3-compatible:** user explicitly connects endpoint/account, bucket/location; REDOWN can show valid connected S3 destinations and allow their Nested Narrow/Depth folder-prefix hierarchy through a real implemented S3 adapter. Do NOT fabricate an S3 `redown` default bucket or copy Cloudflare provisioning/auth behavior. Handle host/region/endpoint identity, exact prefixes, credentials scope, pagination, object-storage virtual folders and collision policies.
- **Google Drive:** future authenticated Drive-specific connection and native folder IDs; do not treat Drive paths as R2 prefixes or invent current approval/scope/transfer support. Respect actual OAuth grants and provider API semantics.
- **OneDrive:** future Microsoft account/tenant/drive/item identities, API capabilities and permissions; no fake ready state.
- **Future providers:** new adapters join `REDOWN → [Provider]` without altering the two top-level Right-click Setup modes or duplicating persistence/journal/menu projection engines.

**Important sequencing:** The *provider-root/menu projection data contract* should be implemented/tested as part of the current V3 repair, including at least one non-Cloudflare **synthetic fixture** to demonstrate sibling-provider isolation. The actual production connections and saving to Google Drive, OneDrive and generic S3 are **separate future integrations unless existing authorized, tested adapters already exist**; do not mark them complete or request external OAuth permissions automatically. Do not build three large new provider implementations and hold the urgent CURRENT/reliability fix hostage.

**Provider-local expansion rule:** Different connected providers are peers under REDOWN. Each provider can be a verified direct-save leaf when it has exactly one unambiguous default destination and its actual adapter supports the save. It becomes a submenu when it has multiple selectable destinations. A change in one provider's children must not alter another provider's leaf/submenu state, account selection or location hierarchy.

## 7A. PROVIDER-NAMESPACED CURRENT / JSON / JSONL — EACH CLOUD INDEPENDENT, ONE REDOWN API

**LATEST OWNER REQUIREMENT (2026-10-31) — MANDATORY DESIGN CONTRACT:** The `CURRENT`, `right-click.json` logical read model, `right-click.jsonl` change journal, daily immutable `BACKUP`, mutable `WORKING`, authorization state, directory graph, event/checkpoint history, applied native-menu generation and future provider change-feed cursor **MUST BE DISTINCTLY NAMESPACED FOR EVERY CONNECTED PROVIDER INSTANCE/ACCOUNT**. Current Cloudflare records must be explicitly branded and typed **Cloudflare R2**. The same folder/bucket names at different clouds must NEVER collide, merge, overwrite, reroute or inherit each other's permissions or scan progress.

**Provider names versus S3 transport:** Use `providerKind` / `providerLabel` to identify the actual product, and `adapterKind` to identify the *shared protocol implementation*. For example:
- `cloudflare-r2` / `Cloudflare`, transport `s3-compatible` or existing R2 worker adapter.
- `google-cloud-storage` / `Google Cloud Storage`, transport `gcs-xml-s3-interoperability` where implemented; GCS XML/HMAC interoperability **is not** the same service as `google-drive`.
- `mega-s4` / `MEGA S4`, transport `s3-compatible` with verified MEGA S4-specific differences; **not** ordinary MEGA cloud drive.
- `aws-s3` / `Amazon S3` and `s3-compatible` / user-approved custom provider, with explicit endpoint/region/credentials scope.
- `google-drive` and `onedrive` remain separate native-file-provider adapters with provider-native folder/item IDs, not S3 prefixes.

**Identity is never only the bucket name or URI path.** Each node, configured destination, event, checkpoint, historical anchor, audit status and native menu routing ID is associated with a typed canonical namespace such as:
```text
namespace = providerKind + connectionId + remoteAccountOrTenantIdentity + endpointIdentity
objectId  = namespace + containerIdentity + exactNativePrefixOrFolderId
```
Use unambiguous structured composite keys / stable opaque IDs instead of unsafe raw string concatenation. `connectionId` distinguishes two customer connections to the **same provider**, including same-named buckets, and survives user-friendly display-label changes. Endpoint identity distinguishes generic S3 services/regions as appropriate; provider-specific native IDs and exact key case remain intact. Never reveal credentials in `connectionId`, exported endpoint metadata, JSONL, menu labels or telemetry. A cloud connection can be renamed in the UI without changing its persistent identity.

**Logical storage shape — illustrative only, not a requirement for physically separate IndexedDB databases/files:**
```text
REDOWN global catalog / provider registry          [provider list and authorization references]
├── cloudflare-r2 / connection-A
│   ├── CURRENT -> 2026-10-31/WORKING@revision
│   ├── 2026-10-31/BACKUP        [immutable]
│   ├── 2026-10-31/WORKING       [mutable]
│   ├── right-click.json        [portable CURRENT projection]
│   ├── right-click.jsonl       [provider-scoped delta events]
│   └── scan/checkpoints + provider event cursor
├── google-cloud-storage / connection-B
│   └── [its OWN CURRENT/BACKUP/WORKING/JSON/JSONL/checkpoints]
├── mega-s4 / connection-C
│   └── [its OWN CURRENT/BACKUP/WORKING/JSON/JSONL/checkpoints]
└── s3-compatible / connection-D
    └── [its OWN CURRENT/BACKUP/WORKING/JSON/JSONL/checkpoints]

REDOWN GLOBAL RIGHT-CLICK PLAN = authorized union/projection of each CURRENT
REDOWN PROGRAMMATIC API       = provider-scoped calls OR explicit aggregate queries
```

A **single IndexedDB database with composite namespace keys and per-namespace stores/indexes is acceptable and probably preferable** to many physical DBs; isolation is LOGICAL and TRANSACTIONAL, not necessarily separate database files. Export the global provider manifest plus optional independent `<provider>/<connection>/right-click.json` and `right-click.jsonl` artifacts. JSONL record fields include `providerKind`, `connectionId`, canonical container and operation identity. The aggregate menu/export is a *derived view*; it must not become a second competing editable tree.

**Independent daily rollover:** Global Settings `Daily` is DEFAULT, but each actively participating connection maintains its own reconstructable immutable BACKUP and separate WORKING for the selected period. CURRENT for that connection advances immediately on its own verified changes. An edit in Cloudflare only advances Cloudflare's CURRENT/journal generation and affected global native menu subtree; Google Cloud Storage and MEGA S4 working generations, journals, backups and checkpoints are untouched. The optional overall REDOWN view/aggregate generation changes only to mark that one provider projection changed. A provider in an offline/unconnected state retains its local historical identity without fabricating successful cloud verification or keeping revoked destinations clickable.

**Independent scanning and future change feeds:** Provider-specific observation/checkpoint logic is scoped to provider instance and affected container/folder. R2/MEGA S4/S3 may use bounded S3-style prefix listings with provider-specific differences and optional events where actually supported; Google Cloud Storage XML/listing or future notifications as actually supported; Google Drive or OneDrive use their own change-token/delta APIs when supported. Never reuse pagination tokens/cursors, OAuth state, events or deletion evidence across providers. The journal records discovered verified differences, not a magical externally authoritative feed. One provider's partial scan/outage must not delete, refresh, or invalidate unrelated providers' CURRENT.

**One user-facing system, no false merging:**
```text
REDOWN
├── Cloudflare             [Cloudflare's independently projected CURRENT]
├── Google Cloud Storage   [ONLY when real adapter + authorization available]
├── MEGA S4                [ONLY when real adapter + authorization available]
└── Other S3               [ONLY when real adapter + authorization available]
```
Each ready provider has independent Simple/Nested→Narrow or Depth projection based on the **same selected global menu mode** and its own authorized CURRENT. Provider is always the first submenu level; Cloudflare's single-default direct-save exception remains provider-local. Custom Menu Labels belong to configured destinations within the correct provider only. Do not display placeholders as actionable native save entries.

**Unified programmatic API, scoped by default:** Offer a single future REDOWN API interface to list connected providers, query an exact connection's CURRENT, read its journal since a generation, list folders and submit actions through the corresponding real adapter. Global aggregated search/list is explicitly requested and tagged by provider+connection, never silently resolves two identically named objects to one. Cross-provider copy/move cannot be falsely described as one atomic cloud operation; record separate confirmed source/destination phases and compensate/report partial failures. Only update a provider's CURRENT after its specific operation is verified, and preserve source data until a safe move commits. API automation cannot bypass authorization or enable new provider credentials.

**Real implementation limits:** This P0 round MUST implement Cloudflare's provider namespace and provider-agnostic schema/projection boundary, plus test doubles for at least two same-named buckets across different S3-compatible providers and two connections of one provider. Other real connectors are future work unless already implemented and verifiably authorized. **Never require new provider credentials, deploy provider services, or claim Google Cloud / MEGA / Google Drive / OneDrive is operational solely from schema or mocks.**

**Acceptance tests for provider isolation:**
1. Distinct `Cloudflare/connection-A/photos`, `GCS/connection-B/photos`, and `MEGA-S4/connection-C/photos` remain separate CURRENT node IDs, daily BACKUP+WORKING, JSONL sequences/checkpoints and menu routes despite identical bucket names and folder prefixes.
2. Cloudflare label change / folder mutation modifies only its CURRENT/journal and only its native subtree, leaving other providers' recorded generations, history, discovery state and routes unchanged.
3. Two Cloudflare accounts, two custom S3 endpoints, and same bucket/folder display names never collide. User-visible account disambiguation doesn't expose secrets.
4. Cloudflare disconnect affects only Cloudflare actionable routes; GCS/MEGA/S3 connected routes remain available where truly authorized; no auto-deletion of disconnected historical metadata.
5. Export Cloudflare-only memory and import/reconnect later without corrupting GCS history, or export an aggregate manifest without merging distinct histories.
6. The global API's `getCurrent(connectionId)` and `getChanges(connectionId,since)` return isolated results; explicit aggregate results include provider/connection identity and cannot silently choose wrong remote target.
7. S3 protocol reuse honors per-provider capability matrix; non-S3 Google Drive/OneDrive folder IDs remain distinct. No fake connected/cloud-transfer test claims.
8. Daily per-provider BACKUP is immutable; provider-specific WORKING and journal changes propagate to global Chrome native menu without replaying or rescanning all other providers.

---

## 8. MIGRATION, BACKWARD COMPATIBILITY AND NONDESTRUCTIVE ROLLOUT

- Inspect existing V3 `chrome.storage.local['right-click.json']` schema-v1 snapshot, `rightClickV3Inventory`, `rightClickV3`, mode/submode presentation, level scope, activated buckets, profile IDs, saved menu labels, `rightClickNativeIds` and actual native routing code.
- First create a **verified non-destructive migration** from all existing known authorized V3 destinations/inventory to IndexedDB CURRENT with stable IDs and exact provider identity; do not silently lose paths whose most recent scan was partial.
- Preserve old storage values as **recovery source** through proven migration; do not wipe prior data on a new schema version or use a one-time `removeAll()` to hide legacy discrepancy. Avoid dual-writer split-brain; name a single post-migration authority and make the legacy read model derived or read-only after switchover.
- Guard against corrupt/malformed old records and ambiguous account+bucket identities: quarantine unsafe entries for review, but keep legitimate unaffected records and menus. Do not attach a saved prefix to whichever bucket Explorer happens to select.
- Keep backward-compatible message contracts, V3-only engine, current Shelf-first toolbar launch and icon-attached popup recovery, History GO TO/Explorer features, private URLs and transfer conflict/Keep Both behavior.
- Keep **false toolbar `!` and technical hover strings removed**—do not reintroduce development diagnostics on normal icon hover. Chrome-owned site-permission UI remains outside REDOWN's control.
- Use staged feature gates / reversible migration where appropriate, without leaving an active second legacy context-menu implementation.

## 9. TESTS THAT MUST BLOCK COMPLETION

**A. Native hot-path and correctness**
1. Fresh connected Cloudflare account: exact `REDOWN → Cloudflare` when only verified `redown` default; direct save to that bucket root.
2. Add named location or activate eligible second bucket: `REDOWN → Cloudflare → REDOWN` remains first; other direct leaves under Cloudflare, no `Buckets` intermediate in Simple.
3. Nested → Narrow includes only explicitly configured destinations/required ancestor rows with correct Menu Labels; unconfigured siblings never appear.
4. Nested → Depth includes actual authorized folders up to 1–10, starting after `REDOWN → Cloudflare → [bucket]`, real folder names and preserved depth.
5. Browser native right-click menu opens using already registered items while MV3 worker sleeps. **No cloud/IndexedDB full-tree fetch before the menu is drawn**. Click wakes and resolves correct CURRENT route before save.
6. One local label edit in an 18-bucket dataset changes one stored record + journal event, immediately updates correct native entry after Chrome acknowledgment, and all 17 other buckets remain accessible.
7. Stable provider-root entries, exact clickable IDs/routes; menu entry cap invokes browse-more fallback without removing unprojected CURRENT nodes.

**B. Crash / atomicity / restart**
8. Crash before IndexedDB commit → no partial node/journal/current pointer update. Crash after commit but before native registration → CURRENT latest, desired > applied, repair next supported wake without losing rest of menu.
9. Crash halfway through native create/update/remove → deterministic idempotent repair, always-available root/Manage where Chrome permits; never misroute stale click IDs.
10. Power cycle / profile restart / MV3 suspension, maliciously delayed older scan, OAuth expiry/reconnection, cursor invalidation, read failure and stale inventory TTL do not replace CURRENT with a smaller partial tree.
11. Depth 5→3→5 and a deliberately incomplete scan spanning 18 buckets retain all known still-authorized deeper routes, in native menu within Chrome limits or full chooser.
12. Simulated native menu registration loss + intact CURRENT recovers from CURRENT before network discovery, with a truthful applied-generation receipt. Test corrupted CURRENT restored from validated immutable backup + journal where feasible.
13. Offline, no Cloudflare auth, revoked auth and wrong provider account must not make unauthorized old routes actionable.

**C. Daily dual-copy, journal and integrity**
14. Daily is default; each actual active day has exactly one immutable BACKUP and separately addressable mutable WORKING, CURRENT pointer always newest and transactionally advanced; twenty edits cannot change BACKUP.
15. Weekly and Off preserve CURRENT/journal per edit and do not delete old history; rollover with timezone/DST changes, offline days, simultaneous tabs and crash is idempotent with real capture times only.
16. Unchanged verified scan adds zero semantic delta events; meaningful verified changes produce one unique event each and consistent generation/sequence, even after replay.
17. 10K+ nodes, more than 18 buckets and 300 projected menu-entry scenarios: bounded memory/runtime and recoverable multi-bucket access. Measure p50/p95 warm/cold Apply and launch-registration acknowledgment.
18. Export/import validation preserves configured destinations, exact IDs, history/snapshots and provider-native identities without secrets; explicitly verify that **deleting all Chrome extension data cannot be recovered without a separate external backup**.

**D. Provider extension point**
19. Synthetic provider fixture appears as sibling alongside Cloudflare only when enabled/connected/adapter-capable; Cloudflare's own direct-leaf/submenu transition remains independent. No fake provider save action.
20. Synthetic S3 fixture proves distinct endpoints/accounts/buckets/prefixes and Nested Narrow/Depth path projection; real provider is never claimed connected without actual credentialed tests. Drive/OneDrive future IDs are not coerced into S3 paths.
21. Preserve Shelf-first/attached-popup/no-dual-interface and normal branded icon without false warning, plus existing history/Explorer and transfers.

**Required real-browser evidence:** Test with a clean installed Chrome profile and an upgraded existing profile (sanitized). Show before/after menus and exactly which native IDs and generations were acknowledged; measure startup and edit-to-menu timing. If installed Chrome, authorized R2 or other cloud providers are unavailable, explicitly label those rows **NOT VERIFIED**, do not invent passing screenshots or provider receipts.

## 10. STAGED IMPLEMENTATION — FIX THE URGENT USER EXPERIENCE FIRST

**Phase A (P0, required first):** Diagnose latest installed/source state; keep existing working V3 menu, correct Cloudflare-first Simple and Nested provider wrapper if not already done, register native menu before right-click, protect root/Manage. Complete false toolbar-warning/hover issue without damaging Shelf-first fallback. Focused real/native tests.

**Phase B (P0, required):** Build/migrate authoritative IndexedDB CURRENT and transactional delta journal, stable native projection and desired/applied generations; immediate incremental menu reconciliation after edits. Test 18-bucket partial scan, worker restart and crash boundary. Do NOT postpone CURRENT hot path behind Time Machine.

**Phase C (P0/P1, required for durable reliability):** Daily immutable BACKUP + mutable WORKING with CURRENT pointer; Weekly/Off, idempotent rollover, non-destructive scoped reconciliation/checkpoints and recovery from backup+journal. Preserve all untouched authorized paths.

**Phase D (minimal seam now, integrations later):** Implement a clean provider-local root/capability/route projection abstraction and synthetic S3/Drive/OneDrive isolation tests. Actual Google/Microsoft/S3 OAuth/credential implementation and live saving are separate work unless already supported. Do not auto-create buckets or request broad scopes for hypothetical providers.

**Phase E (later explicit work):** Optional encrypted, verified independent external backup/restore for Chrome-origin/profile deletion, full historical Time Machine UI, performance tuning beyond measured blockers. Document these honestly as future work rather than falsely calling local snapshots off-device protection.

**For each phase:** Implement production code and focused tests, document exact source diff/behavior, record commit, and do not call phase complete from mock-only verification if installed Chrome evidence is available/required. If a phase proves too large, ship a functional smaller vertical slice with unfinished acceptance items marked OPEN; no giant untested rewrite.

## 11. RELEASE HYGIENE, PROOF AND FINAL RESPONSE

1. Read `AGENTS.md` and mandated docs above. Inspect real latest branch source and existing tests before editing. Use existing isolated checkout; no new worktree unless instructed.
2. Run project-prescribed diagnostics (`npm run diagnostics -- getStartGuide`, `validateRegistry`, `listIssues`, `getReleaseReadiness`), `npm run reliability:check`, focused V3/native-menu tests and available full tests. Record exact existing failures separately from new regressions; do not conceal failures by weakening assertions.
3. Prove actual Chrome `contextMenus` callback outcomes and service-worker behavior, not just pure projection functions. Prefer incremental APIs over `removeAll()`; if an irrecoverable Chrome state requires resetting native registration, preserve CURRENT and rebuild from the complete latest authorized view, not from partial inventory.
4. Record architectural decisions: schema version, copy-on-write rules, immutable BACKUP, mutable WORKING, CURRENT pointer, journal idempotency, provider identity, authorized projection bounds, native-menu transaction gap, crash recovery, retention/privacy and realistic backup guarantees.
5. Update `NEED_TO_DO/fundamentals.md`, `NEED_TO_DO/10312026.md`, `bugs/README.md`, relevant older specs and `FOREVER_WORKS/v3/` source-backed handoff with acceptance results. Keep owner-approved design verbatim; remove or explicitly supersede contradictory three-peer-mode or flat-Simple claims rather than letting them reappear.
6. **Commit and push** the actual code, tests and docs on `codex/v3-parity-first-reconstruction`. Preserve all protected checkpoint tags and user data. Report commit hashes, test commands/results, any installed-browser/cloud-provider proof and explicit remaining limitations.
7. Do not install/sync/backup personal directories or connect cloud providers without the user's appropriate authorization. Live test transfers must use consented disposable objects, not production bucket mutation by inference.

### NON-NEGOTIABLE FINAL OWNER ACCEPTANCE

**One verified user change → one atomic CURRENT/WORKING+journal commit → immediately acknowledged Chrome native menu update; all untouched, previously known authorized directories remain available.**

**Right-click itself is instantaneous from previously registered Chrome items; it does not read a huge JSON or discover folders.**

**Daily starts by default with TWO distinct logical states: immutable BACKUP and editable WORKING. CURRENT always points to the newest working generation; crashes or shallow scans never replace it with an empty tree.**

**REDOWN → Cloudflare is deliberately the provider-first foundation. Google Drive, OneDrive and S3 can later sit beside it and receive the same Simple / Nested → Narrow / Depth behavior through genuine connected adapters, not fake entries.**

**IMPLEMENT, FAULT-TEST, DOCUMENT, COMMIT, PUSH. NEVER CLAIM BROWSER OR CLOUD VERIFICATION YOU DID NOT ACTUALLY PERFORM.**
