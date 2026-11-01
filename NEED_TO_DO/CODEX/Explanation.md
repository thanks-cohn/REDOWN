# Explanation — REDOWN's complete right-click system

**Date:** 2026-11-01  
**Repository:** `thanks-cohn/REDOWN` · **Mandatory implementation branch:** `codex/v3-parity-first-reconstruction`  
**Document type:** Canonical user-facing behavior and engineering explanation; not a claim of shipped/verified functionality.  
**Companion formal contract:** [logic-tables.md](logic-tables.md) · **Today:** [NEED TO DO — 11/01](../11012026.md)  
**Existing P0 request:** [CURRENT-first native-menu and multi-cloud foundation](../../docs/CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md)

## 1. REDOWN's objective in one sentence

Right-click any supported web item in Chrome, select **REDOWN → your connected cloud → an exact destination**, and save it immediately and reliably **without opening a separate application first**, while REDOWN remembers the authorized cloud directories through normal browser interruptions and can recover from total local-data loss **only when a separate verified backup exists**.

The right-click menu is not a novelty UI drawn inside REDOWN. It is the actual Chrome-native context menu created by the extension. REDOWN's polished “Right-click Setup” interface edits its configuration and shows a preview of the actual native menu that should be registered.

The system needs to be comprehensible to a first-time user and stable enough for a future programmatic cloud explorer/API. The architectural goal is **one predictable interface, independently owned cloud connections, exact routing and durable known folder structure**.

## 2. The user's three interactions

1. **Saving:** On a normal webpage, right-click an eligible object (image, link, video, audio or page), hover REDOWN, choose provider/destination, and have the object sent to the verified cloud target. A verified completion receipt belongs in History; failures must be visible and recoverable.
2. **Configuring:** Open REDOWN's Right-click Setup pop-out/editor, choose Simple or Nested, configure destinations or participating containers as appropriate, organize labels and Apply. Once Chrome acknowledges the latest configuration, the actual native menu matches the editor's intended plan. Editing a label cannot change a remote bucket.
3. **Exploring/recovering:** Browse known cloud folders in Nested/Depth or REDOWN Explorer. A remembered folder can remain known when cloud discovery pauses, but a stored folder name alone does **not** grant permission to save. On another computer, restore from independently backed-up metadata and reauthorize the exact cloud connections.

**A login alone does not guarantee that cloud root permissions, a default destination and remote-save capability have been configured.** REDOWN must distinguish “connected”, “authorized to list”, “prepared to save”, “default verified”, “native menu applied” and “transfer verified”. It must not treat one as proof of all the others.

## 3. The fixed, permanent mode selector

Exactly these two top-level modes:

```text
Right-click Menu
  ( ) Simple
  (•) Nested
        (•) Narrow
        ( ) Depth
             Depth: [1 ... 10]
```

The UI may choose Simple by default or retain a saved preference; it must not convert Narrow into a third top-level peer. Existing internal values `style:'simple'`, `style:'nested'`, `nested:'narrow'` and `nested:'level'` (user-facing Depth) stay compatible during migration.

**Simple** is a convenient set of direct save targets. **Narrow** is a curated tree of selected paths. **Depth** is a remembered hierarchy of actual directories. All belong to the **same** underlying authorized connection and directory memory architecture, but they project it differently.

## 4. Simple: direct-save when alone, sensible submenu when expanded

### One verified Cloudflare default

```text
Right-click object
  REDOWN ▶
    Cloudflare      [click now = SAVE object]
```

Once the exact Cloudflare account's default R2 bucket `redown` (lowercase, empty prefix) is verified writable and configured as default, Cloudflare is a **clickable provider leaf**. It saves to that target, not the currently highlighted Explorer folder.

This is especially important for a first-time user. Clicking Cloudflare **must not unexpectedly navigate to REDOWN's Explorer Home**. If no default writable target is actually verified, REDOWN must explain the needed connection/setup instead of pretending the click can save.

### Two or more eligible Cloudflare destinations

```text
REDOWN ▶
  Cloudflare ▶
    Photography
    Projects
    Archive
    ─────────────
    Home
```

The provider becomes a submenu parent because native Chrome submenu parents cannot double as ordinary direct-save leaf actions. **Each sibling is a flat direct-save destination.** After all its extra destinations, one real native separator appears and **Home is LAST**. Clicking Home saves to the exact same original default bucket root that clicking the one-child Cloudflare leaf used before expansion.

If the user removes or disables all additional eligible destinations, Cloudflare reverts to its direct-save leaf. No default target changes during the transition. No “Buckets” intermediary in Simple. No extra path hierarchy in Simple.

**Important naming distinction:**

- Cloudflare **Home** = save to this cloud's configured default destination.
- REDOWN Explorer **Go Home** = navigate to REDOWN's own home/dashboard.
- These are different commands, different route IDs and different tests; reusing the label “Home” cannot justify reusing the handler.

### Every supported provider eventually gets Home

The same **leaf if only one verified default, or siblings → separator → Home last** convention applies to each genuinely supported provider independently. A connection to Google Drive, Dropbox, S3-compatible cloud, OneDrive, Google Cloud Storage or MEGA S4 must not change Cloudflare's own Simple expansion.

A Drive default may be its actual authorized My Drive root or a chosen Drive folder identified by Google-native IDs. An S3-style default must be a specific authorized endpoint, account, bucket and exact prefix. Do not fabricate universal bucket semantics for Drive or assume every connected provider has a writable root.

Other providers appear as working save entries only after their real authenticated adapters support the operation. Synthetic test fixtures are useful for architecture but do not prove a connection/upload works in production.

## 5. Nested/Narrow: chosen destinations in their natural hierarchy

Narrow answers: **“Show me the handful of destinations I deliberately chose, nested under their real buckets and parent folders.”**

Example: three different Cloudflare buckets and five curated targets.

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

**Three rules prevent confusion:**

1. A checked/enabled bucket in Depth setup does **not** mean Narrow should reveal all its cloud folders. Narrow only shows explicitly configured eligible save destinations and their required ancestor paths. A bucket with no selected destination does not get a Narrow branch unless its **root itself is explicitly configured** as a save target.
2. Bucket/container names are structural separation. The path to a configured destination is built from actual folder ancestry. The final configured item may use the user's custom Menu Label. Unselected sibling folders are not invented.
3. A folder that is both a configured save destination and the parent of another configured destination cannot be a clickable submenu parent and direct-save item simultaneously. The system must expose a separate **Save here** child to preserve the exact parent's save action.

Multiple buckets with the same display name across accounts must be distinguished by connection/account identity without leaking secrets. Nothing in one bucket may be silently moved or saved under another because their folder names resemble each other.

Narrow does not require a live whole-bucket crawl. It projects the already confirmed, configured paths; the menu is already registered before a right-click.

## 6. Nested/Depth: actual cloud folder structure up to 1–10 levels

Depth answers: **“Show the actual authorized folders REDOWN already knows or can incrementally discover inside the participating containers.”**

```text
Nested → Depth 2

REDOWN
└── Cloudflare
    ├── redown          [bucket root, level 0]
    │   ├── photography [level 1]
    │   │   ├── portraits  [level 2]
    │   │   └── landscapes [level 2]
    │   └── projects    [level 1]
    └── works
        └── clients     [level 1]
    ─────────────
    Home                [separate default save action]
```

Depth uses real known/discovered directory names. **Custom shortcut labels do not replace the directory tree**. The provider label “Cloudflare” doesn't count as a folder-depth level. Bucket-root depth 0, first folder level 1 and so on preserve the established bucket-relative semantics.

If someone chooses Depth 5, switches down to 3 and later returns to 5, the previously remembered level-4/5 folders must appear again immediately where the latest authorization and Chrome capacity permit, or remain reachable in a full REDOWN chooser. The act of showing fewer rows never deletes the directory records.

Depth is not allowed to block the native menu while enumerating clouds. Folder discovery runs separately in bounded pages, persists checkpoints, and merges verified changes into CURRENT. It resumes after MV3 worker suspension, transient errors or expired cursors without destroying untouched branches.

If a provider cannot list nested folders with its current adapter and permissions, REDOWN must not advertise Depth as fully implemented for it.

## 7. How the pop-out editor relates to the native menu

The editor should use the same deterministic projection logic as native registration; it must not be a disconnected “looks right” preview.

The editor lets the user select mode/submode/depth, choose appropriate provider participation and exact destinations, assign optional Menu Labels, and review the projected structure. **Save Changes/Apply** should:

1. Validate each destination against the correct provider connection and capability contract.
2. Commit configuration and the changed CURRENT/WORKING records with their matching journal event where applicable.
3. Compute the newest deterministic menu plan from committed CURRENT and saved presentation.
4. Reconcile Chrome's native context menu in a serialized, parent-first way.
5. Mark **Applied** only after Chrome acknowledges the corresponding generation; otherwise show pending/retry and retain the durable draft/graph.

Native separators must be actual separator rows, and a non-leaf parent is not an implicit save. When a folder is explicitly saved as a destination and also has child branches, show a separate **Save here** action.

When Chrome has menu item/level limits, preserve all known destinations and let users open a searchable **Browse more destinations…** chooser. It is not acceptable to silently delete a bucket from CURRENT merely because Chrome cannot display all entries.

## 8. The exact source and destination of one right-click

**Source selection:** Chrome reports the selected context, such as a link URL, image source, video URL, audio URL or page. REDOWN must validate supported URLs/context and its permitted access; it must not guess arbitrary local or protected-resource access. Non-HTTPS or inaccessible URLs need truthful error handling through supported ingestion paths.

**Destination resolution:** Menu ID maps to an action kind and a canonical target including providerKind, connectionId/account, exact container ID, exact folder ID or prefix, and required authorization. The displayed label is never used to derive the remote path. A currently selected Explorer folder is also never the routing source.

**Click dispatch:** A given menu click produces **one** of save, open chooser, open setup, open dashboard, or no action/fail closed. Never perform two saves, never combine save and dashboard navigation, and never use a stale menu route to save into a different provider.

**Transfer completion:** The correct adapter performs the save, checks/records actual provider confirmation and writes a truthful History receipt. Existing Cloudflare R2 Worker/provisioning/remote-ingest code must be preserved and audited rather than replaced with mock transfers.

The fresh-user report that clicking Cloudflare led to Explorer is **an observation, not a verified source cause**. Reproduce with a clean Chrome profile and inspect the exact clicked ID, prepared bucket/default state, extension source version, authorization, registration plan and Chrome events before changing the handler.

## 9. One provider kind can have several independent connections

Cloudflare account A and Cloudflare account B must not be collapsed. Equally, two custom S3 endpoints might both have a bucket called `photos`. Cloudflare R2 and Google Cloud Storage might expose compatible object-storage operations without being the same provider. Google Drive is NOT Google Cloud Storage; MEGA S4 is NOT ordinary MEGA Drive.

Every stored route and record carries at minimum:

```text
providerKind
connectionId
accountId / tenant / endpoint identity
nativeContainerId (bucket, drive, site, etc.)
nativeFolderIdOrPrefix
stable destination/action ID
capability + authorization scope
```

Real identities are used for comparison; labels and friendly aliases are only a presentation aid. An operation on P must not advance Q's CURRENT generation, journal sequence, discovery checkpoint or backup period.

Provider-neutrality means **shared interfaces, not identical backends**. An adapter advertises real implemented operations such as resolving a writable default, validating auth, listing roots, listing children, resolving a target, saving, and optional discovery. A logged-in but read-only provider is not advertised as a working upload route.

## 10. The durable record: CURRENT, WORKING, BACKUP and JSONL

REDOWN needs to behave like a persistent directory index, not a volatile menu-render cache.

```text
Each exact provider connection
  CURRENT → newest committed WORKING generation
  ├── verified known directory graph
  ├── configured destinations and default target identity
  ├── scan checkpoints, freshness and coverage markers
  └── generation used to project provider native menu
  WORKING [mutable period state]
  BACKUP  [immutable dated period anchor]
  right-click.json  [versioned logical portable state]
  right-click.jsonl [append-only verified semantic change journal]
```

A confirmed remote mutation must first be verified with the provider. Then a single local IndexedDB transaction updates only its affected CURRENT/WORKING nodes, corresponding journal events, checkpoints and pointer/generation. For purely local menu edits, commit local changes directly. After the local commit, register/reconcile affected Chrome-native rows separately.

**Never claim that updating IndexedDB and updating Chrome's contextMenus API are a single atomic transaction.** If a crash occurs between them, CURRENT is ahead of Chrome. REDOWN needs a recoverable desired-versus-applied registration generation and should fix the menu on the next supported activation without losing unaffected entries.

### Daily snapshots, with actual time and no daily recrawl

Default setting: **Daily**. On the first eligible actual activation of a new local calendar period, seal the prior WORKING and make two new logically separate dated period states: immutable BACKUP and mutable WORKING, then point CURRENT to the newest WORKING. Do not fabricate a midnight operation when Chrome was closed.

Weekly changes the historical period cadence; Off disables creation of new dated anchors, **not** live CURRENT or the semantic change log. A new day never mandates a full list of every bucket. Identical verified listings yield zero semantic JSONL events.

Untouched branches remain known. Failed scans, expired TTL, OAuth timeouts and switching modes provide no evidence that paths were deleted. A node should be removed only after the user explicitly confirmed a successful provider deletion/move, or a complete authoritative authorized scope observation proved the node absent.

## 11. Storage outside the reach of clearing browser cache

**Two fundamentally different events:**

- **Ordinary browser cache clearing / service-worker sleep / transient app errors:** Persistent extension storage may remain available. CURRENT can be reconstructed and the native menu re-registered from the last committed local graph.
- **Chrome profile deleted, extension removed with data erased, or all extension-origin data cleared:** local IndexedDB and local snapshots can be gone. REDOWN cannot recover those bytes from the same deleted browser origin.

To protect the user from the second category, REDOWN needs an **independently retained backup** outside the extension origin, with explicit user authorization. Choices may include a versioned encrypted export to a user-chosen filesystem location or supported private cloud backup folder. This must be a real file/object with an actual successful write and integrity/read-back verification, not a checkbox implying protection.

An independent backup should include recoverable, versioned, provider-namespaced directory and configuration metadata, an appropriate checkpoint/journal range, exact identities, checksums, encryption where appropriate and a verified timestamp. Do **not** export plaintext OAuth refresh/access tokens, passwords or cookies. Do not silently enable public R2 URLs, create buckets, incur costs or override user-selected storage destinations.

On reinstall or a new computer, user explicitly imports or restores a verified independent copy, REDOWN validates version/integrity, then the user reauthorizes each matching provider/connection. Known folder structure and preferences may be restored promptly; actionable native saves require current authorization and exact target validation. A backup does not bypass permissions.

**Honest status language:** “Local record available”, “External backup verified on [real date]”, “External backup not configured”, “Restore requires reconnect”, or “Local records unavailable; no verified independent backup”. No “always recoverable” promises without the independent artifact.

## 12. Fast path versus background discovery

The browser's native menu exists already; Chrome draws it without waiting for REDOWN to inspect 18 buckets. A confirmed change should make the new label/destination available immediately after the local transaction and acknowledgment of native registration, subject to browser/platform constraints.

Discovery is bounded, incremental, resumable and per provider/container/folder. Maintain checkpoints, cursors, coverage, timestamps and retries. Prefer affected branches and explicitly requested Refresh Folder Listing. Never turn a partial listing into a global replacement or require every bucket to finish before one known destination becomes usable.

The authoritative record is CURRENT, not a stale transient `rightClickV3Inventory` or Explorer's currently selected folder. The journal records changes *after they are verified*; it is not magic external change detection. External modifications require actual provider observation/events or scoped refresh.

Native menu capacity is finite; a bounded projection plus an accessible full chooser is mandatory for large directories. Registration failure should leave the last usable root/Manage surface where Chrome allows and preserve CURRENT for retry.

## 13. Privacy, safety and the boundary of future integrations

Cloud storage remains private by default. Neither a right-click menu nor a directory export implies authorization to make cloud files public. No provider credentials or private object URLs appear in logs, native menu labels, screen captures or export bundles.

No forced provider-wide discovery merely from the user opening REDOWN, no forced external-backup storage cost without consent, no fabricated connected Google Drive/Dropbox/S3 functions. A provider adapter is a capability boundary and a permissions boundary.

Keep source/mock, installed Chrome, and real cloud operations as separate evidence classes. If an environment blocks unpacked Chrome or cloud authorization, report that verification as **NOT VERIFIED**.

## 14. Product invariants that must survive implementation

- The right-click engine remains **V3 only**. Do not resurrect a second active Legacy writer.
- Preserve the polished right-click tree editor and exact configured destinations through data migrations.
- Save Changes reflects actual acknowledged Chrome registration, not just a successful form submission.
- Keep Shelf-first toolbar behavior with its existing icon-attached fallback and no false technical danger badges.
- Keep History GO TO exact-file navigation, Explorer instance reuse, upload conflict/Keep Both behavior and verified transfer receipts.
- Preserve protected branch tags/checkpoints. Do not hide failing tests, alter histories or call an untested migration release-ready.
- Adopt the universal provider-local Home last convention across Simple and expanded Nested provider submenus where applicable, subject to a **verified** default.
- Existing source currently includes an older default-first `REDOWN` Simple child. That is a **known design mismatch** to repair, not a reason to disregard the new owner's instructions.

## 15. Deliverable checklist for Codex

Read [logic-tables.md](logic-tables.md) and implement every invariant I01–I20, testing T01–T28 and metamorphic rules in that companion. Inspect `AGENTS.md` and the existing P0 handoff; reproduce the clean-profile Cloudflare click before claiming a cause.

Make minimum safe changes for immediate native right-click correctness first, then deliver independently tested CURRENT transaction/journal, incremental discovery, daily anchors, recovery, and independently verified external-backup workflow. Keep future cloud adapters as real capability seams with synthetic tests, not invented production integrations. Record actual files, tests, install/browser results, verified provider receipts and open blockers, and push code to the required branch.

**A passing in-page preview is not acceptance. The real Chrome-native right-click menu and safe exact save behavior are acceptance.**