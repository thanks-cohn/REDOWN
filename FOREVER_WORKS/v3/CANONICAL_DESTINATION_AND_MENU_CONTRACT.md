# Canonical V3 destination contract

Storage key `rightClickV3`: `{version:1, revision:nonnegativeInteger, destinations:[]}`. No automatic import. Each record contains only `id, profileId, accountId, bucketName, parentId, prefix, label, enabled`. Background copies this allowlist; credentials remain in existing profiles and are not returned in setup snapshots.

IDs are stable ASCII identifiers, 1–80 characters; new UI entries use UUIDs. Array order is authoritative among siblings. `parentId:null` means top level. Children must use the same prepared profile and a strict descendant prefix. Labels are independent of paths. Different stable IDs can deliberately point to the same target; duplicate IDs reject. Orphans, cycles, unavailable/cross-account targets, more than 200 records or eight levels reject. All records, including disabled ones, validate; revoked profiles require correction before saving/registering.

Prefixes are exact bucket-relative strings, empty for root, bounded to 900 UTF-8 bytes; backslash, controls, empty/dot segments reject. This bound leaves room for ordinary filenames; provider object-key limits still apply to the complete filename. It does not prove a folder exists or authorize remote access.

Save requires the last loaded integer revision. Background increments it under the shared lane; stale concurrent saves reject and preserve the draft. No retry rebases an old draft. Delete removes a destination and all descendants in memory, with one in-session Undo. Save persists that result; it never deletes remote folders or objects.

Projection uses `v3:ID`; branches have a child `v3:ID:send` for their own target and retain genuine immediate-child nesting. Only eligible leaves and Send here actions resolve. Disabled ancestors suppress their complete subtree. Every click rechecks current configuration and account/bucket readiness. Registration plans and click routing use the same domain functions.
