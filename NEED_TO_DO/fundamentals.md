# NEED_TO_DO:fundamentals

**REDOWN V3 — authoritative owner-approved right-click behavior and durable directory memory**  
**Recorded:** 2026-10-31  
**Repository:** `thanks-cohn/REDOWN`  
**Mandatory branch:** `codex/v3-parity-first-reconstruction`  
**Status:** SPECIFICATION — not proof of code implementation, Chrome verification or a working backup.  
**Precedence:** This file controls the fundamentals when older plans conflict, particularly the two-stage mode selector, Cloudflare-first native menu, user-first immediate updates, and immutable dated snapshots.

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

## 5. The three distinct memory artifacts — stable snapshot, live JSON, delta journal

**Conceptual layout:**

```text
       VERIFIED CHANGE / DISCOVERY
                    │
                    ▼
      ONE ATOMIC LOCAL TRANSACTION
      ┌─────────────┴──────────────┐
      ▼                            ▼
  LIVE WORKING GRAPH          APPEND-ONLY JOURNAL
  right-click.json            right-click.jsonl
  current generation          verified changed records
      │                            │
      └─────────────┬──────────────┘
                    ▼
       DAILY or WEEKLY STABLE
       IMMUTABLE RESTORE POINT
       (plus original baseline)
                    │
                    ▼
        REBUILD / AUDIT HISTORY
```

**Names `right-click.json` and `right-click.jsonl` describe portable logical formats and exports.** An extension must not assume it can append to a JSONL file inside its packaged installation. The **durable authority** should be IndexedDB (or a carefully justified transactional equivalent) with separate node, append-only event, discovery-checkpoint and immutable snapshot stores. A JSON manifest/materialized read model can be exported from it; portable JSONL can be streamed from the event store. The actual Chrome native context menu is only a **projection** of this database, never the authoritative store.

### A. Stable dated JSON snapshot — NEVER mutate an existing dated point

- On the first eligible **actual capture** of the user's chosen calendar day (Daily; **default**) or eligible week (Weekly), create an **immutable, reconstructable snapshot reference** to a **verified committed generation** of the graph, or a compact baseline + journal range.
- Once saved, that day's/week's anchor **does not change** when the user edits a folder or menu later. Later confirmed changes go to the **live working graph and journal**, and the current menu reflects them immediately.
- On the next eligible day/week create another immutable point. Unchanged days/weeks should share unchanged graph content rather than duplicate large files. Retain an initial verified baseline and weekly recovery lineage without extra redundant full copies.
- If Chrome was closed or off during the scheduled capture, **do not fake a midnight snapshot**. On resumption create a point with its real capture timestamp; separately record the last observation time.
- Settings: **Daily (default) / Weekly / Off** control new *historical dated points only*. Off does not disable the live graph, journal, or safe current menu. Changing cadence never deletes existing history without explicit user choice.

### B. Live editable JSON — the current working version

- Current snapshot/materialized graph includes canonical `provider/account/bucket/prefix`, parent ID, enabled/authorization state, stable node ID, verified/observed times, source, generation, saved configured labels and menu preferences as appropriate.
- This is continuously reconstructed/updated from committed deltas. A confirmed change updates only its affected records immediately, without rewriting an entire huge JSON file on each event.
- Untouched branches retain their records, depth, identities, latest known verification and accessibility when still authorized.
- Preserve privacy. Folder paths can be sensitive; the live file must not contain OAuth tokens or private object bytes.

### C. Append-only JSONL journal — record exactly what changed

Example conceptual export (illustrative record values, NOT real user data):

```jsonl
{"schema":1,"seq":101,"generation":42,"op":"prefix-added","account":"ACCOUNT_X","bucket":"redown","prefix":"photography/portraits","observedAt":"2026-10-31T20:00:00Z","verified":true}
{"schema":1,"seq":102,"generation":43,"op":"menu-label-updated","destinationId":"DEST_X","before":"Photos","after":"Portraits","observedAt":"2026-10-31T20:03:00Z","verified":true}
```

- Each event has a stable sequence, idempotency key, generation, canonical subject identity, operation, reason/source and **observedAt**. A real external creation date cannot be invented from a later discovery timestamp.
- **No meaningful change = no new change event and no pointless record rewrite.** Updated `lastCheckedAt` is checkpoint/observation metadata, not proof that a directory changed.
- Exactly one transaction commits **the changed graph records + any required journal events + scan checkpoint/generation**. Crash mid-write rolls the whole transaction back; replay is idempotent and never creates corrupt partial JSONL lines.
- Verification is mandatory before marking a cloud operation successful or declaring a deletion. A partial or unauthorized listing must never create a tombstone.
- Compact redundant physical representation without destroying the journal chain/immutable references needed to reconstruct chosen historical points; test hash/checksum and revision integrity.

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
7. Daily immutable anchor survives twenty edits that day without being overwritten. Live working graph changes twenty times; journal logs only twenty actual changes. Next eligible day gets a new immutable point. Weekly/Off behave correctly.
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

**Final acceptance:** **User sees their confirmed change immediately. All other untouched, still-authorized paths remain accessible through Nested. Today's/this week's immutable snapshot remains stable; the live version evolves; the journal records only verified differences.**
