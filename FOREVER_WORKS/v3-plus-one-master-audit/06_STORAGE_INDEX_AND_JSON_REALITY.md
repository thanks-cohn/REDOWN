# Persistence, CURRENT and JSON reality

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## Actual stores and owners

The surprising current fact is that CURRENT is implemented, not merely a roadmap item. [extension/right-click-current.js:1–124](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-current.js#L1-L124) defines database `redown-right-click-current` version 1 with `state`, `records`, `journal`, `pointers`, `backups`, all keyed by `id`. `commitPatch` changes graph records, journal deltas, state values and pointers in one readwrite transaction. `commitV3Current` then writes the compatibility chrome.storage.local patch. `restoreDurableV3` restores that mirror on wake/use. Sources: [extension/background.js:2153–2182](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/background.js#L2153-L2182). [Current tests](evidence/focused-tests.log) exercise rollback, cross-instance durable read, unchanged semantic records and period rollover.

| Key/store | Writer → reader | Shape/revision/lifetime and limitation |
|---|---|---|
| local `rightClickV3` | transaction, migration, default bucket provisioning → builder/resolver/UI | version 1/revision integer/destinations/defaultBucket; shared Simple+Narrow |
| local `rightClickV3Presentation` | expected-presentation transaction/migration → UI/project/discovery | style,nested,depth; serialized equality conflict token, no numeric revision |
| local `rightClickV3LevelScopes` | expected revision transaction/global activation → roots/discovery/UI | version 1/revision/buckets; separate from manual aliases |
| local `rightClickActivatedBuckets` | global activation → Simple extras/default gating | version 1/revision/buckets; account+bucket dedupe in activation |
| local `rightClickV3Inventory` | refresh commit/restore/profile invalidation → project/resolve | version 2/key/at/depth/nodes/frontier/observations/warnings/completeness |
| local `right-click.json` | writeV3MenuSnapshot after reconcile → restore snapshot/refresh | logical object, not packaged file; configurationRevision, presentation, scopes, destinations, inventory, projection/appliedGeneration |
| local `rightClickMenuStatus` | reconcile → UI/BOOT/activation/logical snapshot | applying/registered/superseded/failed; applicationKey and desired/applied generation |
| local `rightClickNativeIds` | registrar → restart reconcile | up to 2048 restored string IDs; in-memory plan string is not persisted |
| local `rightClickEngine`, `rightClickMode` | migration/compatibility paths → builders | V3 forced; old mode remains compatibility input, not independent engine support |
| local migration/recovery | ensureV3Only → Setup/settings recovery | original profiles/config retained; may contain sensitive original profile data; never export raw in audit |
| local `profiles`, `cloudflareAuth` | provisioning/auth/settings → prepared/list/transfer | actual Worker secrets/session auth; excluded from synthetic evidence |
| local global activation | activate/resume → UI/alarm | job/sessionId/pending-ready-failed/account errors; can mutate cloud; not an audit read |
| local `rightClickHistoryPolicy` | backup settings → commit/restore | daily(default), weekly, off; period rollover on actual use |
| IDB state | commitPatch → readState | five selected V3 configuration fields; inventory nodes separated from metadata |
| IDB records | commitPatch → readState/dump | namespace+kind+record ID; semantic directory observations retained across partial scans; removals get tombstones |
| IDB journal | commitPatch → dump | append transactional deltas; JSONL generated at export, not continuous filesystem writes |
| IDB pointers | commitPatch/acknowledge → generations/dump | per-namespace generation/period/working/desired/applied; acknowledge only matching desired generation |
| IDB backups | commitPatch rollover → dump/restore | immutable prior graph snapshot once per namespace/new period; initial snapshot can be empty |
| sessionStorage recovery | UI change/flush/load → same window reload | `redown-v3-recovery`; holds draft; not chrome.storage.session and not cross-window rollback |
| in-page Map/Set | browse/draw/load → picker | folders by profileId:prefix; expanded keys; no TTL, no persistence |
| chrome.storage.session chooser | More destinations click → chooser | `rightClickChoice:<UUID>` holds source info/tab/time; sensitive runtime context; not cloud index |
| transfer History | recordTransfer → History/Shelf | local compatibility window plus `redown-transfer-archive/records` IndexedDB, independent of directory transaction |
| provider state/jobs | independent auth/provider modules → fragments/dispatch | googleDriveState/Transfer + session jobs; dropbox:auth/state/jobs/transfer/oauth; onedrive auth/state/jobs/transfer/oauth; not V3 index data |
| diagnostics/RFIS | entry/bootstrap/runtime/BOOT/RFIS → support queries | separate bounded observations/optional object index; not destination approval or authoritative provider object truth |

Exact literal storage sites across non-vendor extension code are in [source-census.json](evidence/source-census.json); do not treat this table as authorization to read browser data. Other unrelated UI preferences are navigable there; they are not CURRENT inputs. History/RFIS/diagnostic records have different ownership and freshness.

## What CURRENT/WORKING/BACKUP really mean

Namespace is serialized `['cloudflare-r2',profileId,accountId,workerUrl,bucketName]` or `settings`. `records` is the live graph; `state` stores current configuration and inventory metadata/verifications. `pointers.working` is a string `[namespace,date,'WORKING']`, not a separate object store containing a second mutable copy. CURRENT is a logical database model, not a physical current.json or a literal CURRENT pointer record. `backups` stores the previous namespace records when a new period is encountered. Off switches period to live and retains journal; it does not turn off all durability.

Period uses JavaScript local date methods; daily/weekly depends on the browser's timezone, weekly starts Monday. No every-midnight task is implemented. No daily/weekly filesystem writer or automatic independent external backup exists. `dump()` does produce a portable JSON object with a journalJSONL string. Backup UI uses current module plus separate `right-click-backup.js` for validated encrypted files selected/downloaded by the user; AES-GCM with PBKDF2, requires reconnect on restore, empty-profile guard. It is not automatic cloud storage. [extension/right-click-backup.js:1–69](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-backup.js#L1-L69).

IF a semantic record is unchanged, THEN its directory journal need not grow just because observedAt changes. IF a partial scan omits a known path, THEN retained directory records are not deleted. IF IDB commits but storage.local fails, THEN recovery restores the durable version on a later wake/use. IF browser data is erased or extension uninstalled, THEN local CURRENT/history are lost absent an independently saved verified backup.

## Durability limitations that must survive the handoff

Not every writer uses commitV3Current: initial ensureV3Only migration writes local directly, provisioning of defaultBucket writes local, profile-change inventory invalidation writes local, and logical snapshot restore writes local. The “IDB is authority” comment does not make these out-of-lane writes transactional. A later durable restore can overwrite a newer mirror-only value. This is a SOURCE-CONFIRMED competing-authority risk with a narrower LOCAL-REPRODUCED counterexample: [authority-observation.json](evidence/authority-observation.json) seeds real durable state at revision 3, applies a synthetic storage.local-only defaultBucket patch at revision 4 matching the existing direct-writer shape, then invokes actual restoreDurableV3. Restore returns revision 3 and removes that defaultBucket. No provisioning was performed; the full owner-facing provisioning race remains unverified. Source anchors: background 1059–1060, 2187–2197, 2295–2298, 2751–2760 versus 2161–2181.

There is no automatic pruning of journal/backups, no demonstrated backup+journal replay reconstruction API, and no atomic commit spanning Chrome registration, directory DB and cloud writes. `safe()` filters sensitive *field names* recursively; it retains endpoint URLs in namespace/key strings and legitimate private folder names. This is not a general privacy scrubber. Exporting real directory data would need explicit owner review; this audit only serializes synthetic names.

## Three future index choices

| Candidate | Compatibility/cost | Recommendation |
|---|---|---|
| reuse only local V3 inventory | cheapest projection compatibility; mixes cache and persisted knowledge | insufficient alone for per-connection history and independent mode revisions |
| evolve real CURRENT | existing transactions, journal and rollback; namespace hardcoded Cloudflare and coupled config fields | preferred starting point after fixing all-writer authority and defining schema version migration |
| new provider-scoped index contract | clean adapter boundary/frontier/history semantics; highest dual-write/migration risk | define contract first; justify new database only if evolving CURRENT fails required invariants |

Proposed connection index record: schemaVersion, connectionId, locationId, container native identity, exact prefix/native folder ID, parent identity, observation source, generation, observedAt, freshness, complete/partial/stale, cursor/frontier and capability/scope generation. Keep credentials and page provenance outside. Keep mode aliases in separate records/revisions. Partial failures retain observations but never infer deletion; current authorization must still be checked at save. Add bounded retention/pruning, crash recovery and versioned export/restore tests. Reuse IDB transactions where sufficient. Rotation is event-driven on eligible actual use/alarm; an optional backend scheduler is a separately authorized system, never a claim of perpetual MV3 execution.
