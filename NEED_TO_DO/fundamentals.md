> November 1 flat-provider supersession: `CODEX_REQUEST_CLOUDFLARE_ONLY_NESTED_MENU_FLAT_OTHER_PROVIDERS_2026-11-01.md` overrides older non-Cloudflare submenu proposals below. Google Drive, Dropbox and OneDrive each use one direct native leaf; only Cloudflare retains V3 nested menus. Implementation and verification: `docs/FLAT_PROVIDER_MENUS_REPORT.md`.

> November 1 supersession: [logic-tables.md](../NEED_TO_DO/CODEX/logic-tables.md) and Explanation.md control menu semantics. Expanded providers use configured siblings, a native separator, then **Home last**, saving to the verified provider default. Older default-first examples below are historical.

# NEED_TO_DO:fundamentals

**REDOWN V3 — authoritative owner-approved right-click behavior and durable directory memory**  
**Recorded:** 2026-10-31  
**Repository:** `thanks-cohn/REDOWN`  
**Mandatory branch:** `codex/v3-parity-first-reconstruction`  
**Status:** SPECIFICATION — not proof of code implementation, Chrome verification or a working backup.  
**Precedence:** This file controls the fundamentals when older plans conflict, particularly the two-stage mode selector, Cloudflare-first native menu, user-first immediate updates, and immutable dated snapshots.

## OWNER-APPROVED CURRENT-FIRST CONTRACT — SUPERSEDES VAGUE "ONE DAILY SNAPSHOT" WORDING

**Defaults and state identity:** Settings starts at **Daily**. For EACH eligible active calendar day, REDOWN makes **TWO logically distinct dated states**:

1. **DAILY BACKUP (immutable):** a protected snapshot of the last committed complete known state at that day's actual rollover/capture moment. This backup **never changes** as the user works that day.
2. **DAILY WORKING (mutable):** a separate editable working state initially based on that same complete known graph. This is the copy REDOWN updates whenever it verifies a user edit or new authorized discovery.
3. **CURRENT (always latest):** a stable, globally resolvable **durable pointer/view to the active DAILY WORKING version**, not a stale cache and not an additional independent full copy. Its referenced version/generation advances atomically with each confirmed edit. Callers always resolve CURRENT, not "whichever scan result arrived last." If an implementation materializes `CURRENT/right-click.json` for reads/export, it must reflect the same acknowledged database generation and never become a diverging second authority.
4. **APPEND-ONLY DELTA JOURNAL:** the versioned event stream recording exactly which entries changed; its committed generation must match the change applied to the working graph and CURRENT.

```text
                   FIRST ACTIVE USE OF A NEW DAY
                                |
                      CAPTURE VERIFIED CURRENT
                         /             \
                        /               \
            YYYY-MM-DD/BACKUP       YYYY-MM-DD/WORKING
              IMMUTABLE                  MUTABLE  <── verified edits + new discoveries
                                              |
                                    CURRENT ──┘ (latest generation)
                                              |
                          REGISTRATION OF NESTED CHROME MENU
                                              ^
                                read from CURRENT only

      Every verified modification also APPENDS to right-click.jsonl
      No changed/untouched branches are dropped on a partial scan.
```

**The core atomicity rule:** Provider-reported cloud change must be confirmed first; then a **single IndexedDB readwrite transaction** updates the affected WORKING graph node(s), the matching journal event(s), the scan/menu generation and CURRENT's active version/generation pointer. If storage commit fails, don't claim the edit is durably incorporated, and reconcile truthful provider outcome on retry. A local menu label/configuration edit can be committed directly with that transaction. On transaction success, **immediately (no full scan) reconcile the Chrome-native right-click menu using CURRENT** and acknowledge the applied registration generation. Menu APIs are separate browser operations, not part of an IndexedDB transaction: if registration fails, retain CURRENT, preserve the last usable menu as far as supported, retry/reconcile and visibly report the pending native Apply rather than claiming two separate APIs committed atomically.

**MOST IMPORTANT:** Untouched, previously known, authorized branches are **not reinitialized, discarded, compacted away, overwritten or made inaccessible** by a user editing another branch, a failed cache lookup, incomplete provider discovery, service-worker restart, delayed native registration, TTL expiry, or changing Depth. Nested → Narrow projects only deliberately configured routes from CURRENT; Nested → Depth projects all eligible known authorized routes within selected depth from CURRENT. **Both start `REDOWN → Cloudflare`.** If Chrome's native menu cannot fit every stored route, REDOWN's authorized full-tree chooser must remain accessible; do not falsely claim unlimited native Chrome entries.

**Daily rollover:** At the first actual authorized activation/transaction of each new local calendar day, reconcile the prior day's latest CURRENT, seal yesterday's WORKING as a historical state, create today's new **immutable BACKUP** and separately addressable **mutable WORKING**, and atomically redirect CURRENT to today's WORKING. Preserve identical node records through immutable structural sharing/copy-on-write; "two" means two independently reconstructable logical states, not wasteful full rewrites of identical data. Record the *real* capture time and period label; never fabricate a midnight capture while Chrome was closed. Make rollover idempotent across simultaneous tabs/windows/service-worker startup and power loss. At least one restorable daily backup and one current working state are required for each eligible active day.

**Cadence settings:** Daily creates BACKUP + WORKING for each eligible active day (**default**). Weekly creates a stable weekly BACKUP and a mutable working-period state, with CURRENT still moving on *every* verified edit. Off disables new dated historical backups, **not CURRENT, the live graph or the journal**. Changing cadence must not corrupt CURRENT, retroactively rewrite old immutable dated backups, or silently erase old history.

**Cache crash rule:** On startup or any cache miss, recover the latest consistent CURRENT pointer and graph from durable storage before consulting cloud inventory. Rebuild native menu projection from CURRENT immediately subject to current authorization. Partial scans may add verified changes, never replace CURRENT with a thinner cache. If CURRENT is damaged, validate and reconstruct it from the latest good immutable backup plus committed journal, preserving exact sequence/generation and flagging any genuinely unrecoverable data; never silently reset to empty. This reconstruction protects against local cache/transaction errors, **not** full Chrome-profile/extension-data deletion: independent user-authorized off-device backup remains necessary for that threat.

## FULL IMPLEMENTATION HANDOFF — INSTANT CURRENT + MULTI-CLOUD PROVIDER ROOTS

**Canonical full Codex implementation request:** [`CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md`](../docs/CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md).

**Latest owner-approved extensibility rule:** Today all currently working provider branches start `REDOWN → Cloudflare`; this Cloudflare heading is intentional, since genuinely connected **Google Drive, OneDrive and S3/S3-compatible** providers may later appear as **sibling provider headings** directly below REDOWN. Each implemented provider should support the same **Simple / Nested → Narrow or Depth** presentation where its real API capabilities permit it. A new provider connection MUST NOT silently change Cloudflare's leaf/submenu state or redirect its `redown` root. Future providers are a capability contract, not invented connected accounts or authorization to fake saves.

**Urgent operation:** Chrome displays previously registered native menu items; CURRENT in IndexedDB drives the precomputed registration and exact click routing. A verified edit updates only affected CURRENT/WORKING records, commits a journal delta, then immediately reconciles and acknowledges the Chrome menu. No full scan while right-clicking; no wiping untouched branches during partial discovery, cache failure or worker restart. **Daily DEFAULT** creates immutable BACKUP + mutable WORKING; CURRENT points at the latest committed working generation.

---

## PROVIDER-ISOLATED JSON + JSONL FUNDAMENTAL — ONE REDOWN, INDEPENDENT CLOUD MEMORIES

**Owner's latest requirement (2026-10-31):** Current Cloudflare records must be explicitly identified as **Cloudflare R2**, not anonymous S3. REDOWN will support a shared object-storage protocol where possible, but **each provider AND each separate connected account/endpoint has its OWN logical CURRENT, dated BACKUP and WORKING, `right-click.json`, `right-click.jsonl`, scan checkpoint/event cursor, authorization boundary, native menu subtree and history**. Two clouds with a bucket `photos` must never share an ID or overwrite the other cloud's directory memory.

```text
REDOWN — unified native menu + future programming API
├── Cloudflare R2 / account A
│   ├── CURRENT → latest active WORKING generation
│   ├── 2026-10-31/BACKUP + 2026-10-31/WORKING
│   ├── right-click.json  [logical CURRENT export]
│   ├── right-click.jsonl [append-only verified deltas]
│   └── independent discovery checkpoints
├── Google Cloud Storage / connection B
│   └── separate CURRENT/BACKUP/WORKING/JSON/JSONL/checkpoints
├── MEGA S4 / connection C
│   └── separate CURRENT/BACKUP/WORKING/JSON/JSONL/checkpoints
└── Custom S3 / connection D
    └── separate CURRENT/BACKUP/WORKING/JSON/JSONL/checkpoints
```

**One physical IndexedDB database may implement this** with composite `providerKind + connectionId + endpoint/account identity + bucket/container + exact prefix/folder ID` keys, and namespaced records. Do not create a separate physical JSON file or database unless there's a demonstrated need; the **logical isolation is mandatory**. Every JSONL event includes its provider/connection identity. Cloudflare R2, Google Cloud Storage's S3-interoperable XML API and MEGA S4 may share tested protocol utilities but have distinct providers, credential scopes, endpoint behaviors and capability limits. **Google Cloud Storage is NOT Google Drive; MEGA S4 is NOT ordinary MEGA Drive**. Never swap folder IDs for object prefixes or assume all providers have the same features.

**Each provider's CURRENT changes independently.** Editing Cloudflare must update just its own WORKING + journal transaction, then reproject the relevant Cloudflare native menu entries. Every other provider's CURRENT, unchanged directories, daily backup, journal sequence and checkpoints remain untouched. The unified `REDOWN → [Provider]` menu is a derived authorized union, not a single merged authority. The same global Simple / Nested → Narrow or Depth selection applies to capable connected providers while preserving each provider's native folder semantics and eligibility.

**Future programmable API:** A single REDOWN API can list providers, inspect `CURRENT` for one provider connection, query its `JSONL` changes, save to exact destinations and perform explicit aggregated searches with fully qualified identities. An identical folder name never authorizes guessing which provider to use. Per-provider exports/import and independent user-authorized backups ensure vendor portability; real provider adapters are implemented only when verified, not fabricated.

**Full implementation acceptance and technical schema:** [`CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md` §7A](../docs/CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md).

---

## 0. The highest priority invariant — the user sees their changes immediately; untouched directories remain

> **When a user makes a confirmed change through REDOWN, the intended right-click destination and local live tree update immediately, without waiting for a full provider scan. ALL untouched, previously known, still-authorized directories stay accessible through Nested. Reload, Depth, OAuth interruption, a partial scan, Chrome native menu refresh or an MV3 service-worker restart must NEVER erase or hide still-authorized known branches merely because the latest scan did not visit them.**

The user-facing outcome is the priority; storage exists to protect it. A saved menu change is shown in the native Chrome menu as soon as Chrome acknowledges registration. A cloud mutation (create/rename/move/delete) is displayed as **pending** while in flight and as **confirmed** immediately on authoritative provider success and the required durable transaction. Do not lie about success, silently omit old branches, or hold up confirmed local changes for a 20-second/18-bucket rescan.

**Reload = recheck and merge. Never = forget and rebuild from whatever partial results arrived.** An absent listing page, stale TTL or smaller Depth is not proof that known folders no longer exist.

Retain everything previously known and still authorized outside the changed scope. Removing a path requires an explicit verified REDOWN mutation or a genuinely complete, authoritative and authorized scope check proving its absence; incomplete scans and OAuth expiry never create synthetic deletions.

## 1. The exact two-tier mode selector (do not reinvent it)

There are **two top-level modes, Simple and Nested**. Inside Nested there are **two submodes, Narrow and Depth**:

```text
Right-click Menu Mode
  ○ Simple
  ● Nested
      ○ Narrow       only the destinations the user selected/configured
      ● Depth        actual cloud folders, with numeric Depth 1–10
          Depth: 5   example
```

Never replace this with three peer modes. Preserve existing internal V3 presentation encodings: `style:'simple'`, `style:'nested',nested:'narrow'`, and `style:'nested',nested:'level'` (the stored `level` represents user-facing Depth). Preserve the existing polished tree editor and saved state.

**Across all three presentations of this two-tier system, the Cloudflare provider is the first level below REDOWN: `REDOWN → Cloudflare`.** Do not begin Native Narrow or Depth directly at an unexplained `Buckets` heading or place selected destinations next to Cloudflare.

## 2. Simple — direct save when alone; flat children when alternatives exist

### Default and no other eligible children

```text
REDOWN
└── Cloudflare             [CLICK SAVES to verified R2 bucket "redown", prefix ""]
```

The user never has to know what an R2 bucket is. Clicking Cloudflare saves to the **root of the actual lowercase R2 bucket named `redown`** in the established authorized Cloudflare account. Never use the currently selected Explorer bucket as an accidental substitute. If the bucket is not verified or authorized, guide setup rather than fabricate a save.

### After another eligible bucket is discovered or a custom location is added

```text
REDOWN
└── Cloudflare
    ├── REDOWN                [ALWAYS FIRST; CLICK saves to bucket "redown" root]
    ├── Photography           [User-defined Menu Label for an exact location]
    ├── Projects              [User-defined Menu Label for an exact location]
    └── other-bucket          [Another verified, authorized eligible bucket root]
```

Cloudflare becomes a submenu when it has alternatives. Because a Chrome native parent with children cannot simultaneously be a direct-save leaf, the original direct-save operation **moves to the permanent first child REDOWN**. That child points to exactly the same real `redown` root; it **must never disappear** just because more choices exist. The additional entries are **flat siblings only**—not a remote folder hierarchy. If the extras are removed or cease to be eligible, Cloudflare becomes a direct-save leaf again.

Use the configured **Menu Label** for custom destinations, with established fallback naming when blank; use real/display bucket names for eligible other bucket roots, disambiguated across accounts. Exact account/bucket/prefix identity always determines save routing; labels never determine which data is modified. Do not duplicate the default `redown` entry when the inventory also contains it. Do not make unauthorized bucket roots clickable.

No separate native **Buckets** heading in Simple. No custom items beside Cloudflare. No deeper folder navigation in Simple. Preserve all configured destinations and profiles through mode switching/migration.

## 3. Nested → Narrow — selected locations only, Cloudflare first

```text
REDOWN
└── Cloudflare
    └── REDOWN
        └── photography
            └── portraits
                └── Best Portraits   [configured destination label / exact save]
```

Narrow follows the **natural ancestor path of only locations the user selected or configured**. It may include structural ancestors necessary to reach chosen locations; it **must not enumerate unselected sibling folders**. An R2 folder `photography/cats` that exists but was not configured must not appear merely because the configured path is `photography/portraits/favorites`.

Narrow **uses Menu Labels on explicitly configured destination entries**; connecting ancestors use their natural directory names, subject to stable collision handling. Do not confuse a renamed presentation label with a new physical path. Do not trigger bucket-wide discovery simply by entering Narrow.

The Cloudflare provider header precedes the existing authorized bucket/selected-path hierarchy. That provider wrapper is a *presentation change*, not a reason to rewrite configured destinations, lose selected locations or enable unrelated buckets.

## 4. Nested → Depth — real discovered folders, Cloudflare first

```text
REDOWN
└── Cloudflare
    ├── REDOWN
    │   ├── photography
    │   │   ├── portraits
    │   │   └── landscapes
    │   └── projects
    └── other-bucket
        └── archives
```

Depth navigates the **actual previously known and newly discovered authorized directory hierarchy** of participating buckets, including folders the user never explicitly configured. The real bucket and folder names are the navigational labels. **Do not substitute Menu Labels for the directory tree.**

**Depth 1–10** is a *view/discovery projection*, not a destructive retention setting. Cloudflare, the provider header, **does not count as a folder-depth level**. Bucket-root identity and the existing bucket-relative Depth semantics remain intact. Depth 5→3→5 immediately restores known authorized depth-five paths, even if a recent scan only reached depth three. New folders are appended/reconciled progressively.

No old branch should vanish because another bucket exhausted a page/time budget, one OAuth token expired, a newer Depth was chosen, an inventory TTL expired, or Chrome's native menu reached an entry limit. Keep the full durable tree and offer a searchable REDOWN browse-more fallback for nodes that cannot fit into the native menu.

## 5. CURRENT + daily dual-copy + append-only JSONL — authoritative model

There are **two dated working/safety artifacts per active day** plus the **CURRENT** reference and the journal. All menu reads derive their data from the CURRENT working graph, never a frozen backup or a disposable discovery cache.

| Logical artifact | Role | Editing / lifecycle |
|---|---|---|
| `YYYY-MM-DD/BACKUP` | Today's stable safety anchor | Created once from prior committed CURRENT; **immutable** |
| `YYYY-MM-DD/WORKING` | Today's complete editable known-tree version | Receives small, verified changes throughout the day |
| `CURRENT` | Globally stable pointer/manifest to active WORKING + latest committed generation | Advances **atomically** on each verified edit |
| `right-click.jsonl` | Append-only verified deltas + sequence/idempotency keys | Records only real changes; unchanged scans produce no change event |
| `right-click.json` | Exportable materialized JSON read model of CURRENT and safe metadata | Regenerated or incrementally materialized from authority; never a conflicting second truth |

A tested transactional IndexedDB layout is preferred, with named stores such as `liveNodes`, `workingVersions`, `dailyBackups`, `journal`, `scanCheckpoints`, and `meta/current` inside **one database and one transaction scope** for updates that must commit together. Exact store names are illustrative, not a demand to reinvent existing code; migrations from `chrome.storage.local['right-click.json']` must preserve all verified known paths before switching authority.

**Not literal bundled files:** `right-click.json` and `right-click.jsonl` are **portable export formats and logical read models**. A Manifest V3 extension cannot append to its packaged source files. Maintain the journal transactionally, export ordered JSONL lines when requested. Keep immutable backups/reconstructable snapshot references and journal ranges with integrity metadata; use copy-on-write structural sharing to avoid copying 10,000 unchanged entries each day.

### A. BACKUP: today's stable unchanging starting state

- On the first eligible active use of a day, snapshot the last committed full CURRENT generation into the dated BACKUP. Keep this BACKUP invariant even after twenty or two thousand edits later that same day.
- Save a timestamp, base generation, journal boundary and integrity checksum. An unchanged day can share stable content with prior dates while retaining a separate logical restore point.
- Never label a newly captured backup as having existed at midnight while Chrome was closed. Once yesterday's WORKING closes, retain its reconstructable final generation as history according to policy.
- Settings choose Daily (**default**), Weekly or Off. This governs immutable historical frequency; never disables CURRENT's persistence and live-menu behavior.

### B. WORKING and CURRENT: the latest version is always the one projected

- Today's WORKING is seeded from the full prior CURRENT and carries **all previously known still-authorized branches**, including those that a new scan has not checked.
- CURRENT is the single authoritative lookup key to that WORKING's most recent committed generation. Every accepted local configuration change and confirmed cloud mutation advances the working graph/CURRENT in one atomic transaction.
- Immediately after commit, update the Chrome native menu to reflect the changed entries. Read **the entire known eligible state** from CURRENT when necessary, not only the latest scan's incomplete subset. Do not wait for new cloud scanning to show the user's just-confirmed changes.
- If Chrome's menu API rejects or delays registration, keep the newly committed CURRENT and last usable menu, retry the latest generation and report accurate progress. Do not overwrite a newer CURRENT from a late old result.
- A CURRENT cache miss means **read/recover persisted CURRENT**, not `new empty tree` and not `list all buckets then discard everything not returned`. On worker restart, recover CURRENT before initiating discovery.

### C. JSONL: the detailed differences

Each real change adds a uniquely identified, ordered event; scans returning the same verified contents do not add fake changes. Example export entries, illustrative only:

```jsonl
{"schema":1,"seq":101,"generation":42,"op":"prefix-added","account":"ACCOUNT_X","bucket":"redown","prefix":"photography/portraits","observedAt":"2026-10-31T20:00:00Z","verified":true}
{"schema":1,"seq":102,"generation":43,"op":"menu-label-updated","destinationId":"DEST_X","before":"Photos","after":"Portraits","observedAt":"2026-10-31T20:03:00Z","verified":true}
```

Node edits, journal events, scan progress/checkpoints and CURRENT generation commit together; if the MV3 worker terminates midway, the transaction fails atomically and retries idempotently. The export can reconstruct the state between stable backup points. Do not invent external file-creation times from later observations. Never commit deletion/tombstone from partial scans, timeouts or authorization loss. Compact journal/storage without invalidating references for retained immutable backup or closed working versions.

### D. Authorization, browser limits, recovery and off-device safety

- Native Chrome context menu is a **projection of CURRENT**, not its storage backend. Live route clicks recheck account/bucket authorization and exact destination identity, and no known authorized branch is removed merely for missing in a partial scan.
- Chrome's native entry limits may prevent displaying every path simultaneously; keep all in CURRENT, provide explicit full-tree browse/search access from REDOWN and truthfully note limits.
- IndexedDB and `chrome.storage.local` surviving ordinary restarts does not mean survival after uninstall, removed profile or erased extension origin data. For that case, only a **separately stored, verified, user-authorized** export or encrypted remote backup can restore a missing CURRENT; importing requires reconnect/revalidate.

### E. IndexedDB overwrites changed CURRENT values — NOT untouched paths

**Owner confirmation (2026-10-31):** A new verified value for an already-known destination **overwrites that record's previous CURRENT working-state value** under its canonical stable key; creating a destination inserts only that new key; a confirmed remove marks/removes only the verified affected key under the journal and history policy. In IndexedDB terms the write path uses a transactional `put`/equivalent key update, not `clear()`, whole-store replacement, or a rewrite of all nested paths.

**CURRENT is not Chrome's disposable cache:** CURRENT resolves to the most recently committed WORKING generation in durable IndexedDB. Chrome-native context menus and any short-lived discovery caches are **derived from CURRENT**, not a replacement authority. A cache miss triggers a CURRENT read; a service-worker restart reads committed CURRENT. If a partial scan sees only 3 of 18 buckets, preserve all previously verified authorized nodes of the other 15 buckets; an incomplete observation does not permit deleting them.

**Two required outcomes for each successful edit:** (1) the affected CURRENT graph record is durably updated (with the journal and generation atomically); (2) the registered native right-click menu is promptly reconciled from CURRENT and the new menu generation acknowledged by Chrome. These are two sequential systems: IndexedDB transaction commits first; Chrome's menu APIs cannot be included in that transaction. If Chrome registration fails, CURRENT remains correct and REDOWN must retry latest projection and show an accurate Apply-pending status instead of pretending the native menu is current. A background scan must not race to restore stale values.

**The backup is never overwritten.** DAILY BACKUP remains the exact prior committed state at the day's actual capture, DAILY WORKING is edited, and CURRENT points at the newest working revision. The append-only journal preserves the old→new change for history. This is record-level mutation plus a moving CURRENT pointer, not physical rewriting of a whole JSON document for each edit.

---

## 5A. INSTANT NATIVE MENU AND CRASH-SAFE HOT PATH — PRE-REGISTER FROM CURRENT, NEVER BUILD ON RIGHT-CLICK

**Owner requirement:** Chrome's right-click opens the last fully registered, valid REDOWN menu immediately; the user must never need to wait for IndexedDB, network access, a full directory scan or a JSON file import **at right-click time**. Source of truth remains **CURRENT in durable IndexedDB**, but **Chrome's native context-menu registration is the prepared display projection**, not a dynamic view that reads IndexedDB while the menu opens.

**Correct paths:**

1. **Install / update / repair:** register `REDOWN` root and a working `Manage destinations…` recovery path as early as Chrome supports. Read verified CURRENT from IndexedDB (or migrate the previous `chrome.storage.local['right-click.json']` data once, non-destructively). Build a deterministic, bounded native menu projection with stable IDs, exact authorized targets and a generation/hash; call `chrome.contextMenus.create/update/remove` to register it **before any user right-click**. Save its last successfully acknowledged native generation and IDs for verification/recovery.
2. **Normal right-click HOT PATH:** **No IndexedDB scan and no cloud request to render the menu.** Chrome already owns the registered items and shows them through native UI. `chrome.contextMenus.onClicked` awakens the MV3 worker as needed; look up stable clicked ID → CURRENT destination/identity, validate authorization, then send the file using REDOWN's existing transfer pipeline.
3. **Confirmed edit HOT PATH:** Commit affected CURRENT/WORKING records, append the matching change event(s), update CURRENT generation in one IndexedDB transaction; **then immediately** derive the latest menu projection from CURRENT and update only affected Chrome native entries whenever API constraints allow. This is **sequential**, not an impossible atomic transaction across IndexedDB and Chrome menu APIs. Only mark “Applied” once the Chrome registration acknowledges the newest generation.
4. **Crash after IndexedDB commit but before Chrome menu update:** CURRENT is intact and authoritative; the last acknowledged Chrome menu remains the display fallback. Keep a durable `desiredMenuGeneration` and `appliedMenuGeneration`; on next legitimate worker wake/startup/Settings open/recovery alarm, compare them and reconcile to CURRENT. Do not mark “Applied” while generations disagree or silently roll back the user's confirmed change. An already displayed old entry must validate its destination against latest CURRENT on click.
5. **Crash during menu reconciliation:** Prefer supported per-entry `update/create/remove` with stable IDs and serialized parent-before-child updates. **Do not habitually `removeAll()`** or replace the complete menu with a partial scan; only use a carefully justified serialized last-resort rebuild if native state is inconsistent. Keep the REDOWN root and a user-accessible Manage/recovery command intact when possible. On recovery read CURRENT (never reconstruct from a diminished in-memory/cache scan), regenerate the full eligible projection and repair native entries.
6. **Lost IndexedDB object/cache but extension-owned durable data survives:** Recover CURRENT using its immutable verified daily backup plus committed journal and last working generation. A *transient in-memory cache miss* simply re-reads IndexedDB. Never create an empty CURRENT just because a JavaScript object, index, worker instance or cloud listing is missing. Authorization must still be checked before save routes become actionable.
7. **Chrome/extension disabled, fatal browser crash, broken service-worker script or profile data erased:** No extension can guarantee its native menu is shown while the browser/extension itself cannot run. Chrome normally persists registered context-menu entries across service-worker suspension and restarts, but actual extension disable/uninstall/profile deletion and corrupted registration are different. A root recovery entry can be repaired **when Chrome can execute the extension**; total local data deletion needs a separately verified, user-authorized backup. Do not promise a zero-time native repair while Chrome itself is down.

**Implementation-specific checkpoint (source observed 2026-10-31):** `extension/background.js` already has `ensureMenuAccess()` for REDOWN root/Manage, `nativeMenuIds` and `nativeMenuPlan`, incremental `chrome.contextMenus.update`, and fallback `removeNativeMenus()` when persisted native state is unknown. Its current `buildMenus()` gets `rightClickV3Inventory` and configuration from `chrome.storage.local` rather than the future authoritative IndexedDB CURRENT graph. Preserve proven behavior but move projection generation to CURRENT, handle unknown native state without avoidable blank-menu resets, and track desired-vs-applied generations. The menu is **registered from CURRENT**, not drawn directly from a JSON file at right-click time.

**Mandatory fault tests:** cold right-click while worker sleeps; edit → commit → immediate native update; crash after commit/before registration; crash halfway through native update; stale worker generation; browser restart with known menu; partial bucket scan; damaged/in-memory-only cache; deliberately lost native registrations; genuine local extension-data erasure. Require stable user-accessible fallback where Chrome APIs permit it, zero accidental loss of untouched authorized CURRENT paths and truthful recovery messages.

---

## 6. How the user gets immediate changes without losing the other 18 buckets

1. User chooses a different Menu Label, bucket or location and presses **Save Changes**. Validate and commit their requested configuration. Reproject only the affected native entries as Chrome permits and acknowledge actual registration. The user sees the new choice **now**; there is no requirement to re-scan every bucket.
2. User successfully creates/renames/moves a folder through REDOWN. Show a truthful pending state during the provider request. On confirmed provider acknowledgement/readback as appropriate, atomically commit a small graph delta + journal event, then immediately reconcile the affected part of the native menu. Do not report final save success before the provider confirms it.
3. All **other** known, still-authorized bucket directories continue to display with their last verified state. No temporary incomplete scan can make them disappear from the persistent graph or usable native projection.
4. A background bounded scan discovers new nodes and merges them incrementally. If the scan fails halfway through, keep all previously recorded paths. Only well-grounded verified changes alter the graph.
5. **Nested → Narrow** projects configured path ancestors only. **Nested → Depth** projects real known authorized paths up to Depth. Both begin **REDOWN → Cloudflare** and use the same stable directory memory for authorization/identities when relevant.
6. Chrome menu APIs have finite limits. Register the largest useful valid subset, preserving stable ancestor relationships and fair multi-bucket access, and provide an explicit **Browse more destinations…** route to REDOWN's full local tree. Do not claim every known folder fits simultaneously into Chrome's native menu.

## 7. OAuth, MV3 restarts and Chrome data deletion are DIFFERENT failures

### Ordinary interruptions — restore locally

- A suspended MV3 service worker loses in-memory variables, **not properly committed persistent IndexedDB/extension storage**. On restart load latest acknowledged generation, journal tail and per-scope scan checkpoint. Continue rather than rebuild from zero.
- OAuth expiry/disconnection pauses only affected account/bucket scan work and **does not delete remembered directory records**. However do **not** leave unauthorized routes clickable; on reconnect verify same account/bucket and resume at last valid cursor/page. If a cursor expired, retry just the affected segment.
- An incomplete or stale scan may mark verification freshness as stale/pending; never infer confirmed deletion or erase full-depth directory knowledge.

### Actual Chrome deletion — local data alone CANNOT guarantee survival

**Chrome can delete all extension-owned local data when an extension is uninstalled, its profile is removed/reset, or extension data is explicitly cleared.** `chrome.storage.local` is cleared when the extension is removed. IndexedDB and other extension-origin stores are still tied to the Chrome extension/profile; using two local APIs does **not** make independent off-device backup. Regular Chrome cache clearing is different and normally does not erase extension data; storage eviction/quota behavior is also a distinct risk.

**To be truly protected against Chrome erasing the local copy, an independent user-authorized backup is REQUIRED:**
- Provide **Export REDOWN Directory Memory**: portable `right-click.json` + `right-click.jsonl` + verified snapshot manifest/checksums, packaged in one versioned ZIP with recovery instructions, no tokens, secret credentials or private object bytes. Explicit user-initiated download is the initial safest path.
- Provide **Import/Restore** with integrity validation, schema migration, preview/dry run, account reauthorization and exact identity matching. Do not silently activate stale unauthorized routes.
- Optionally provide **Automatic Backup** only after explicit user consent: save encrypted/versioned snapshots and journal checkpoints to a user-authorized Cloudflare R2 prefix (or other authorized provider later), or to a folder explicitly chosen by the user through supported browser APIs. No silent write to arbitrary local directories, no auto-public R2, no assumption that a connected account automatically authorizes private metadata backup.
- Confirm backup readback and a restore test before saying **Protected**. Track last successful **external** backup date separately from latest local snapshot. If automatic backup fails, say so without blocking use of the live tree.
- Losing local Chrome data between two verified external backups can still lose unbacked-up newer edits. Offer a transparent recovery-point objective; never promise **zero loss** without a matching actually working durable sync/backup guarantee.
- On explicit Delete History/backup opt-out, honor user choice across local and managed off-device backups as authorized, with truthful deletion status. Don't keep secret immutable copies contrary to deletion choices.

### Privacy defaults

Private by default. Local folder names and old path histories can be sensitive even when object contents aren't included. Avoid OAuth tokens in JSON or JSONL, avoid automatic remote uploads, use authenticated encrypted backup when offered, and never reconstruct unauthorized remote access solely from a stale local path.

## 8. Non-negotiable acceptance tests

1. Confirmed local menu label change appears in the native menu as soon as acknowledged, without a full folder crawl; other already-known bucket paths remain accessible.
2. Confirmed REDOWN cloud folder change updates its exact branch and produces one journal event, no duplicate on retry; untouched branches are unchanged.
3. Stored Depth 5 → provider scan only reaches 3 → Depth 5 paths remain in graph and usable authorized projection. Depth 5→3→5 restores known deeper branches immediately.
4. New discovered sibling appears only after verified discovery; an unselected sibling never leaks into Narrow.
5. Only default bucket Simple saves via `REDOWN → Cloudflare`; additional children/buckets switch to `REDOWN → Cloudflare → REDOWN` first, followed by flat alternatives.
6. Nested → Narrow / Nested → Depth both start with `REDOWN → Cloudflare` and preserve correct label semantics.
7. **Daily dual-copy invariant:** On each eligible active day create exactly one immutable BACKUP and separately addressable mutable WORKING seeded from the prior full CURRENT. CURRENT always resolves to the latest committed working generation; twenty edits preserve unchanged BACKUP and all untouched branches, advance CURRENT twenty times and append only twenty actual deltas. At next rollover, seal prior WORKING and create the next BACKUP+WORKING without fabricated offline timestamps. Weekly/Off retain CURRENT and journal.
8. Crash between updates cannot leave graph updated without matching required journal/checkpoint, or vice versa; replay is idempotent.
9. Service-worker restart and OAuth disconnect/reconnect preserve acknowledged graph and resume valid per-scope scan progress; revoked accounts have no actionable native save routes.
10. After clearing/removing local extension data in a disposable test profile, **no recovery is promised without a verified external backup**. Import of a test backup restores history and configured paths after reauthorization and account reconciliation, without recreating provider data blindly.
11. No full native menu reset of untouched branches during ordinary isolated change if a safe delta registration is supported; if a serialized rebuild is unavoidable, recover from the persistent complete graph with acknowledged registration.
12. Keep the dedicated branding P0: no false `!` toolbar badge or raw readiness diagnostics on hover; Shelf first, attached action pop-out only on definite failure where Chrome supports it, never both or a detached popup window.

## 9. Canonical supporting specifications and implementation order

- [Urgent current combined Codex request: Simple provider tree, toolbar branding and V3 reliability](../docs/CODEX_V3_P0_SIMPLE_CLOUDFLARE_AND_RIGHT_CLICK_FOUNDATION.md)
- [Persistent right-click directory graph, atomic JSONL, OAuth resume and historical snapshots](../FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md)
- [Detailed toolbar warning/branding fix](../docs/CODEX_P1_TOOLBAR_BRANDING_BADGE_TOOLTIP_PERMISSION_AUDIT.md)
- [Current dated roadmap](10312026.md)

**Order:** (1) User-facing Simple/Nested provider hierarchy, immediate menu Apply and false-toolbar-warning fix; (2) no-loss known-depth preservation and latest-generation native reconciliation; (3) transactional live graph + journal + resume checkpoints + targeted folder refresh; (4) stable Daily/Weekly/Off history references; (5) opt-in verifiable export/backup/restore protection against actual local Chrome data deletion. Do not confuse local operational durability with off-device disaster recovery.

**Final acceptance:** **Every eligible Daily period has TWO distinct dated states: unchanging BACKUP and editable WORKING. CURRENT ALWAYS resolves to the latest committed WORKING state, which drives the immediately updated Nested Chrome menu. Untouched, still-authorized paths remain available. JSONL records only verified changes; a partial scan/cache failure can never replace the complete CURRENT tree.**
