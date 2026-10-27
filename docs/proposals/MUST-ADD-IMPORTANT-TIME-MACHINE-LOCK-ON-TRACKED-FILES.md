# MUST ADD — IMPORTANT: REDOWN Time Machine, Lock On, and Tracked Files

**Date:** October 27, 2026  
**Repository:** thanks-cohn/REDOWN  
**Status:** REQUIRED PRODUCT PROPOSAL (not yet implemented)  
**Priority:** IMPORTANT / MUST ADD  
**Scope:** REDOWN Explorer and authorized local/cloud storage

## 1. Product intent

Deliver the kind of filesystem memory that personal computers should have had all along. Users explicitly authorize directories for historical indexing. REDOWN remembers what files occupied those directories on past dates, helps users rediscover them, and, when access permits, navigates to their current locations.

The official feature name is **Time Machine**. Do not use “ZOOM IN, ZOOM IN” as a product name; that was only a Futurama joke.

Introduce **Lock On** as the memorable, science-fiction-inspired name of the per-file tracking action. The destination in the Explorer sidebar must remain plainly named **Tracked Files**.

**Sidebar placement is mandatory:** Favorites, then Tracked Files immediately adjacent/below, with Time Machine as a separate destination.

## 2. Core user flows

### A. Time Machine: see a directory in the past
1. User explicitly chooses directory roots and grants index permission.
2. REDOWN performs an initial inventory and incrementally records subsequent observations.
3. User opens Time Machine and selects a directory and historical year/month/day or exact available snapshot.
4. REDOWN displays the files and subdirectories observed at that point in time, clearly marking observation dates and incomplete scan coverage.
5. Selecting an old entry offers **Go to Current Location**, **View Location History**, and relevant historical metadata.
6. If the file cannot currently be found, show **Last Known Location** and a truthful state, not a fabricated match.

### B. Lock On: track a specific file
- Every file discovered inside a Time Machine-authorized directory has **Lock On enabled by default**. This is an explicit foundational product requirement.
- A right-click/context menu lets the user **Lock On** or **Release Lock** for an individual file.
- Explicitly locking an outside file can request separate permission when necessary; it must never bypass access rules.
- Lock On persists file identity, last known location, status, relevant observations, and movement/rename history when verifiable.
- Release Lock stops future individual tracking, without deleting the underlying file; history deletion is a separate, explicit action.
- Per-file overrides persist and must not be turned back on by subsequent rescans merely because the file remains inside a default-tracked directory.

### C. Tracked Files: find everything again
- Place **Tracked Files immediately beside/below Favorites** in the normal Explorer navigation.
- Show a searchable, filterable, sortable file-result list containing tracked filenames, path, source/storage provider, last seen, and current status.
- Selecting a located item goes directly to its current containing folder and highlights the file.
- Offer **Go to Current Location**, **View Location History**, and **Release Lock** in row/context actions.
- Missing, offline, permission-denied, and unverified records remain discoverable with accurate status and last-known paths, rather than silently disappearing.
- The Tracked Files view aggregates automatically tracked files and individually locked files, without confusing those entries with Favorites.

## 3. Historical and identity semantics

Track a stable logical file record with provider-specific identity wherever possible. File paths alone are not file identities.

Consider NTFS identifiers and USN journal for Windows where supported; provider object identifiers/version metadata when available; and cautious size, timestamps, and hashes as secondary evidence. Hash/name/size matches can be ambiguous, so label them as tentative rather than silently claiming the same file. Handle renames, moves, copied files, hard links, duplicate content, case sensitivity, disconnected drives, inaccessible directories, and deletion.

Moving outside all authorized roots cannot be followed reliably unless REDOWN has separate access to the destination. Preserve last observed metadata and report that visibility has been lost.

Historical results represent what the index actually observed, not an omniscient reconstruction of events between scans.

## 4. Data model and storage

Use an efficient local index (for example SQLite in a native companion) for regular queries and incremental updates. Provide versioned JSON export/import for durable, human-inspectable tracking state. Do not rewrite one enormous JSON document on every filesystem event.

Suggested logical entities:
- authorized_roots: root ID, provider, scope, permission, schedule, retention;
- snapshots: snapshot ID, time, root, scan coverage and completion state;
- file_records: stable REDOWN ID, provider identifiers, first/last seen, current status, current/last-known path;
- observations: file ID, snapshot/time, path, size, timestamps, optional fingerprint;
- tracking_preferences: file ID, enabled, source (directory-default or explicit), explicit override;
- movement_events: old/new locations, evidence, confidence and timestamps.

Schema and exported JSON must be versioned, migration-safe, and free of secrets. Sample:

```json
{
  "schema_version": 1,
  "file_id": "redown-file-000184",
  "tracking_enabled": true,
  "tracking_source": "directory_default",
  "first_seen": "2026-04-12T10:00:00Z",
  "last_seen": "2026-10-27T13:00:00Z",
  "current_status": "located",
  "current_path": "D:/Pictures/Family/photo.png",
  "location_history": [
    {"observed_at": "2026-04-12T10:00:00Z", "path": "C:/Users/Photos/photo.png"},
    {"observed_at": "2026-10-27T13:00:00Z", "path": "D:/Pictures/Family/photo.png"}
  ]
}
```

This is **metadata history, not file-content backup or recovery**. Never promise restoration of deleted bytes unless a separate, explicitly implemented backup capability exists.

## 5. Permission, privacy, and reliability

- Opt-in by directory/root; track files by default **within that approved scope only**.
- Show what roots are being indexed, when scans occurred, disk/database usage, and whether coverage is partial or stale.
- Support pause/resume, directory exclusion, per-file Release Lock, retention limits, full history deletion, and revocation of root permission.
- Avoid content ingestion by default. Optional hashes must have clear purpose and performance bounds.
- Keep indexes local by default, encrypted at rest where feasible; do not upload historical metadata to a cloud service without explicit consent.
- Use bounded scans, incremental processing, checkpointing, cancellation, and recovery. Do not block Explorer startup or degrade cloud transfers.
- A browser extension alone may not have reliable continuous local filesystem observation. Use an appropriately permissioned native companion where required; cloud indices must use existing authorized provider adapters.

## 6. Suggested implementation stages

1. **MVP:** permissioned roots, snapshot inventories, historical directory browser, default Lock On, persisted per-file overrides, Tracked Files beside Favorites, navigate to known current paths.
2. **Identity improvements:** robust rename/move linking, confidence levels, disconnected/offline detection, fast indexed search, incremental change capture.
3. **Advanced:** richer history diffs, JSON portability, retention controls, scalable cross-provider tracking, optional user-authorized outside-root discovery.

Do not jeopardize the current Beta Explorer, Cloudflare R2 functionality, TRUE REMOTE operations, or production Legacy Explorer. Plan and integrate this feature after core file-management reliability is secured.

## 7. Acceptance criteria (MUST PASS)

1. A user can authorize a root; only that root is indexed.
2. All newly discovered files under that root are Lock On by default.
3. Release Lock persists across repeated scans and application restarts.
4. Tracked Files appears immediately next to Favorites and shows automatically and explicitly tracked entries.
5. Search and selection can open a verified present-day location and highlight the file.
6. Historical snapshots accurately show previously observed files for selected dates.
7. Rename/move records preserve identity when provable, otherwise indicate uncertainty.
8. Deleted, offline, and inaccessible files retain searchable last-known metadata.
9. JSON export retains identities, observations, preferences, and schema version.
10. Users can stop monitoring, revoke root permission, and remove collected history.
11. Neither the extension nor any cloud adapter claims to track outside its authorization.
12. Normal Explorer/TRUE REMOTE operations remain functional with no material performance regression.

**Non-negotiable terminology:** Time Machine = historical directory navigation; Lock On = file tracking toggle; Tracked Files = aggregate search destination; Favorites = user shortcuts. These four concepts are distinct.
