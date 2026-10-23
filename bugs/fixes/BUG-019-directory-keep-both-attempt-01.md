# BUG-019 — Directory Keep both merges into existing directory — attempt01

Recorded: **2026-10-23T00:21:42+00:00 (UTC)**. Priority: **critical data-safety report**.
Before remote main: `70301260af6fb377e28d154b45e710710fb017f4`.

Owner reports dragging a directory into another bucket overwrites the other directory even
after typing Keep both. This records the reported overwrite faithfully; live byte loss or
recovery has not been established and this development session did not modify object data.

## Reproduced cause

Folder transfers flattened their children into the existing destination prefix before resolving
conflicts. Nonconflicting files entered that prefix immediately. The later prompt operated on
individual object collisions; Keep both renamed individual leaves, not the directory. Retry
also explicitly converted every conflict to `folder:false`, losing directory identity. Thus a
folder could be merged before the user answered, and no separate sibling tree was created.
The current verified Worker uses conditional writes, so these source findings do not prove
that original destination bytes were overwritten in the owner's installed run.

## Correction

- Check directory-prefix existence before writing its children. A collision returns one typed
  directory conflict without any writes/deletion for that tree.
- Preserve directory identity and destination root through the existing conflict prompt/retry.
- Keep both chooses one unused sibling (`Photos (2)/`, then `(3)/`, etc.) for the entire incoming
  tree. It checks virtual directories and marker objects, preserves internal exact key suffixes,
  and reserves names within the request. Allocation is bounded to64 candidates and a10-second
  planning deadline; unknown/incomplete listings fail before writes.
- Replace explicitly merges and replaces matching objects; it does not delete unmatched files.
  The prompt now explains the directory behavior. Skip/Cancel do not merge the colliding tree.
- Existing per-object conditional writes and destination/read-back verification remain required;
  Move cleans up only verified copies. Directory operations are **not atomic transactions**
  across competing external writers; a race can still produce a reported conflict/partial result.

Six new boundary/pipeline checks failed on pre-change source; actual embedded Worker/in-memory
R2 tests now preserve byte snapshots of the existing tree, copy every incoming child into the
same sibling, preserve directory identity, verify Move cleanup, reject unknown listings and
bound allocation. A provisioning regression separately rejects bad read-back before ready.
See [verification summary](BUG-018-round-06-verification.json).

Status: **source/automated fix implemented; installed-extension acceptance pending**.
Use disposable directories to check Copy/Move/drag-and-drop, Skip/Cancel/Keep both/Replace,
original source retention for Copy, and original destination tree hashes. This is attempt01
for the distinct directory-level conflict report, not a reset of the ongoing cross-bucket404 ledger.
