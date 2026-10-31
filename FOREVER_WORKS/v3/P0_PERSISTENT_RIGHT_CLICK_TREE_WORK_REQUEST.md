# REDOWN V3 P0 — Persistent Right-Click Directory Memory, Incremental Deltas, Resumable Discovery, and Time Machine Foundation

**Date:** 2026-10-31 · **Owner direction:** recorded and consolidated from the October 31 discussion.  
**Repository:** thanks-cohn/REDOWN · **Mandatory branch:** `codex/v3-parity-first-reconstruction`.  
**Status:** **SPECIFICATION / WORK HANDOFF ONLY — NOT IMPLEMENTED OR VERIFIED IN INSTALLED CHROME.**  
**Protected history/checkpoints:** preserve `base-V3-2.0.0`, `BASE-v3`, `V3-BEFORE-NARROW-DEPTH-RECONSTRUCTION`, `V3-MENU-MODES-BEFORE-HISTORY-REPAIR`, and existing user data. Do not move tags.  
**Scope:** the *existing* V3 right-click Level/Depth discovery, storage, native menu projection and limited supporting UI. Future Time Machine UI and other cloud providers are explicitly separate.

## 0. One defining requirement — owner's intended experience

> **The user sees their confirmed changes immediately, while all other previously known, still-authorized branches remain accessible from persistent storage. Discovery only adds or reconciles verified differences; no Reload, Save, Depth selection, OAuth timeout or MV3 restart erases deeper branches merely because the latest scan was partial.**

The user wants the **full known directory tree** to be retained indefinitely subject to their chosen retention/deletion and authorization controls—not a disposable cached subset. The *native Chrome menu* should offer all eligible known branches **within Chrome's menu limits**; the entire untruncated graph remains accessible via a REDOWN folder picker/browse fallback when the native context menu cannot physically hold every node. Never promise that Chrome can show unlimited native entries.

This specification is about a **reliable live right-click menu first**, with a shared historical data foundation for Time Machine later. Do not turn this into a full Time Machine implementation before fixing native right-click reliability.

### Owner-reported defect (separate from proposed solution)

With Nested → Level → Depth 5 and approximately 18 selected buckets, repeated Save/Reload has **not** progressively exposed deeper folders. The latest Reload reportedly made the menu only three levels deep, despite prior deeper discovery. The supplied screenshot shows the Setup selection/tree, not a measured list of all native Chrome menu entries. **Reproduce in installed Chrome** and distinguish editor tree from native right-click projection.

## 1. Confirmed source mechanisms to repair

The existing production implementation is **not yet** this design:

1. `extension/background.js:refreshV3Inventory(force)` currently calls `discover(..., force ? null : s.rightClickV3Inventory)`, allowing a force refresh to start with no previous inventory and replace a richer tree with a smaller partial result.
2. `extension/right-click-v3.js:inventoryKey()` includes **Depth**; `discover()` restricts reuse when Depth changes, and `levelProjection()` drops to bucket roots when the inventory key/TTL is stale. Depth/TTL are presentation/freshness concerns, not proof that known paths vanished.
3. `chrome.storage.local['right-click.json']` currently exists as a **schema-v1 logical snapshot**, containing the current inventory, not an independently protected full known-path graph or versioned append-only history. Snapshot persistence can carry forward the result of a destructive scan.
4. `refreshV3Inventory()` currently shares one in-flight promise across different Depth generations. A new explicit refresh can be absorbed by work for an older Depth; latest-generation correctness must be guaranteed.
5. Native `buildMenus()` currently does `chrome.contextMenus.removeAll()` followed by recreation. It does **not** currently apply node-level menu diffs, so atomically patching only one Chrome-native menu entry cannot be assumed. Menu updates must preserve/recover the usable menu as far as the Chrome API allows and truthfully acknowledge partial/native failures.
6. Existing scan/projection budgets are **Depth 1–10, 500 discovered folder nodes, 80 page attempts, 20-second scans, and 300 projected entries**. Eighteen buckets can exhaust these before deep paths are reached. **Neither these budgets nor Depth may truncate/delete the durable graph.**
7. `extension/beta/right-click-v3-ui.js:draw()` shows configured destinations and a separate on-demand folder map, **not necessarily** the same full native Level projection; user-facing labels must distinguish them.

These are source-backed design problems, **not proof of one unique cause of the owner's installed-browser symptoms**. Test rather than infer.

## 2. Core data model: current tree + immutable history + transactionally committed deltas

Maintain three logically separate but consistent states:

- **Live known directory graph (authoritative local materialization):** one record per canonical identity `provider/accountId/bucketName/exactPrefix`, with parent prefix, firstObservedAt, lastVerifiedAt, observations/coverage, authorization-related identity, stable node ID, live state, lastAppliedGeneration, and any needed bounded discovery metadata. Prefixes preserve exact case, Unicode and identity; do not invent paths. R2 "folders" are virtual object-key prefixes, not guaranteed physical directories.
- **Append-only verified change journal:** durable events for discovered prefix, confirmed modification, explicit acknowledged REDOWN mutation, verified removal/tombstone, scope-observation changes, suspension/resumption and authorization state. Use idempotency keys and precise **observedAt** timestamps; don't assert actual external creation/deletion dates without evidence. **Unchanged paths produce no change event** and are not rewritten merely because a scan repeats.
- **Versioned, reconstructable historical restore points:** immutable original baseline, dated snapshots linked to exact materialized generations and their journal ranges. Store shared records/content hashes or snapshots plus deltas so unchanged days/weeks don't duplicate full trees.

The user asked whether an appended `right-click.jsonl` could feed the JSON tree. **Preserve that concept as an append-only journal with a portable, versioned JSONL representation/export; don't depend on physically appending to a bundled extension file or intentionally leave half-written JSONL lines after a crash.** Use transactional IndexedDB (or justified equivalent) as durable primary graph, journal, snapshot, checkpoint store; an exportable versioned `right-click.json` is the manifest and read model. Use atomic transactions to commit the changed nodes + journal events + scan checkpoint together. An interrupted transaction leaves no partially committed event line and replays from the last acknowledged checkpoint. A monolithic JSON object rewritten after every individual change is **not** the desired architecture.

Separate **schema version** (e.g. migration from current `right-click.json` schema v1), **live tree generation**, **discovery job generation**, and **dated historical snapshot version**. Ensure idempotent migration and rollback/recovery without destroying the last usable v1 inventory. Do not copy credentials or private object bytes to the history store.

### Owner's "two copies" and versioning

1. **Original baseline / weekly recovery lineage:** preserve the original verified history baseline and recoverable weekly points.
2. **Newest live copy:** continuously updated as confirmed changes arrive.
3. **Delta journal:** records exactly which paths were added/updated/confirmed removed; supplies history without full-tree rewrites.

**Final frequency decision supersedes earlier draft:** **Daily is DEFAULT**, and Settings choices are exactly **Daily / Weekly / Off** for *dated historical restore points*. In Daily, each eligible day's immutable reconstruction point also serves weekly recovery so identical tree content isn't duplicated. Weekly gives weekly restore points. Off stops **future historical points**, not the mandatory working tree/delta consistency needed for the right-click system; disabling snapshots must not silently delete existing history. Provide explicit history deletion/export separately, with transparent retention and space usage. The initial baseline/recovery safeguards and user-controlled historical erasure need clear policy; no secret permanent copy after an explicit delete request.

No claim that scheduled snapshots were captured while Chrome was closed. An actual snapshot created on return records its **real capture time** and separately the latest observation time. Daily history does **not** demand daily full cloud rescanning.

## 3. Runtime behavior — immediate change + non-destructive background checking

**A. Change made through REDOWN:** after a confirmed successful cloud operation and exact destination readback where required, apply the affected records and journal event **immediately** (not a fixed next-scan wait). Refresh/patch the relevant native-menu projection using supported Chrome APIs. No optimistic "verified" record before the provider actually confirms the operation. Do not weaken existing safe-move/delete checks.

**B. Change made outside REDOWN:** without a provider change stream, REDOWN cannot know instantly. Discover it during bounded maintenance or user-targeted **Refresh Folder Listing…**. Compare actual observed scope with the last persisted generation. Only verified differences change node records or the journal. Rechecking an unchanged complete scope produces **zero node mutations / zero change events**, though freshness/checkpoint metadata may advance.

**C. Reload/Save/Depth change:** restore and display authorized known branches first; revalidate and merge asynchronously. `Reload` means **check**, never **forget**. Lowering Depth only limits projection; increasing it reveals already known levels immediately. A failed/partial scan, expired TTL, or elapsed time **cannot** remove recorded branches. A scan of Depth 3 may not invalidate previously known Depth 5. Menu registration success and cloud discovery completeness must be reported separately.

**D. Remove only with credible evidence:** exact REDOWN-confirmed delete/rename/move or complete, stable, authorized listing of the relevant parent scope proving absence; never infer deletions from one partial page, timed-out search, auth disconnection, newly added scope, different Depth, or a changed/expired cursor. Preserve historical tombstones after current entries are removed. Distinguish a directory prefix that no longer has objects from a true intentional folder marker.

**E. User-requested two automatic refreshes:** after a real Level Depth Save, reconcile once promptly and schedule one ~30-second follow-up through MV3-safe mechanisms, **without losing the existing tree or creating a repeat loop**. A newer Save supersedes older scheduled refreshes. Completed checks should not be requeued pointlessly.

## 4. OAuth, large collections and MV3 service-worker interruption

This is a central owner requirement: **If OAuth disconnects after discovering many files or paths, do not throw away progress or restart scanning every bucket.**

- Store independent per-account/bucket/folder **scan jobs and checkpoints**: exact scope, generation, cursor (if valid), completed page boundary, queue/frontier, coverage status, last successful transaction and retry/backoff state. An account with 100,000 objects must not require restarting every folder after one token expiry.
- Commit a fully processed page's changed records + journal entries + next checkpoint **atomically**. If Chrome stops during page 47, page 47 replays safely from the last committed state; **no malformed half-line is relied on for recovery**. Retry/replay is idempotent and must not emit duplicated "added" events.
- On refreshable OAuth expiry, attempt authorized refresh once through existing auth flow. On persistent 401/403 or user disconnect, **pause** affected jobs and stop retry storms. Preserve known paths and checkpoints, mark their live verification/auth as unavailable, and disable unauthorized save actions. Do not silently retain an actionable native save route after revocation.
- On reconnection, verify the **same provider/account/bucket identity** and permissions; then resume the last valid per-scope checkpoint. When a provider pagination cursor expires or ceases to be valid after changes, restart **only the affected listing segment** and reconcile with the retained graph; never restart the entire global inventory unless unavoidable and explicitly evidenced.
- Apply exponential backoff/limits for transient network failures and resumption of unfinished scopes. Favor already-known folders and selectively scan never-verified/stale branches; avoid an endless rapid retry of the same inaccessible page. A user-directed refresh can raise priority but must not bypass authorization checks.
- Stop accepting results from superseded generations before commit. Transaction-bound generation checks, scoped job identity and serialized native menu application prevent old results from clobbering newer evidence.
- Account removal/deactivation and actual credential revocation differ from a temporary disconnected state: **fail closed for active operations** while preserving history only according to user choice and applicable privacy policy. Never disclose unauthorized saved path names via menus to an account that has changed identity.

## 5. Targeted manual repair: "Refresh Folder Listing…" from REDOWN right-click

Place a utility item **REDOWN → Refresh Folder Listing…**. Since native Chrome menus cannot host a full searchable form, open a small REDOWN chooser populated from saved **authorized** account → bucket → folder identities. Provide a direct **Refresh This Folder** action within Explorer when it has a selected folder. Avoid crowding every Chrome native folder node with one utility action because menu entry limits are already binding.

**Default:** scan the chosen folder's **immediate child prefixes only**. Optional clearly labeled **Include subfolders** performs bounded recursive reconciliation. Compare each complete observed scope with the live index; stage safe additions immediately; defer negative conclusions until *all pages for that scope* and relevant consistency checks are complete. A nonrecursive refresh cannot prove anything about descendants. Show honest per-scope progress and last observed time, not raw inventory/debug warnings in the native menu. The result updates only that branch's persisted differences and registered native menu projection; all other branches retain their previous depths.

Users can therefore repair external edits without REDOWN repeatedly recrawling all 18 buckets. **Refresh unchanged directory → no path writes and no journal change event.**

## 6. Projection into Chrome is not the data store

The full known graph is the source of truth, independent of `Depth`, scans, UI state and Chrome's practical native menu constraints.

- Build a deterministic native menu **projection** of authorized known paths. Reserve roots, ensure ancestor/child validity and stable IDs. Explicitly surface that menu limits and Depth may hide *some* stored paths; provide a "Browse more destinations…" flow to reach the rest rather than pretending all 10,000 items fit natively.
- Investigate reducing the current `removeAll() → recreate every entry` behavior via a **differential native menu registrar** that can update/create/remove supported items without unnecessary whole-menu clearing. Respect Chromium API parent dependencies and callback acknowledgement. Chrome-native menu updates are not one atomic database transaction; when a safe partial patch is impossible, perform a serialized recoverable rebuild **without ever destroying the persisted graph**.
- Ensure live routing rechecks authorization and target identity at invocation time. A stored prefix is a valid routing *address*, not an independent guarantee of a present folder or permissions.
- Distinguish stable configured destinations, discovered folder browser results, the native menu's currently rendered subset, and historical Time Machine records. Do not let the Setup editor's `draw()` imply more than actual registered menu state.

## 7. Documentation, product controls and privacy

- Settings: **Directory history: Daily (default) / Weekly / Off**; explicit Export, Delete History and Show Storage Usage controls (later UI phases where appropriate). Changing this choice does not affect live folder memory, immediate right-click updates, or depth persistence.
- Time Machine's eventual "What Was Here?", "What Changed?", and "Find This File?" should consume the same journal and historical restore points, retaining **first observed** versus **actual file created** semantics. A path-history record cannot restore missing object bytes; that requires separate backed-up data or provider object versions.
- Folder names, object names and source URLs may be private even when no file contents are saved. No automatic upload of journal/snapshots. Use optional user-controlled exports or authorized backup destinations. Browser uninstall, profile reset, extension data eviction or explicitly clearing all extension data can destroy local-only history; don't claim local persistence is off-device backup.
- Storage policy: avoid full JSON rewrite per record; avoid unbounded journal growth, unbounded checkpoints, or unbounded retries. Use compression/dedupe/compaction with reference-safe historical reconstruction, user-visible space budgeting and conformance tests on 10K+ and larger path sets. Keep exact paths and working native menu IDs portable across schema upgrades where possible.
- Honesty: a current Level scan's **500 inventory-node / 300 native-menu-entry** budget is not a bound on *all persisted history*; never silently throw away the rest or misstate "complete" when not all scoped pages were checked.
- Preserve existing Simple/Narrow modes, managed/activated bucket semantics, Cloudflare privacy-by-default, right-click transfers, Shelf/Explorer UI and protected commits.

## 8. Implementation phases (do not let Time Machine delay P0)

**Phase 1 — Fix the disappearing live Depth:** implement non-destructive known-prefix retention, latest-generation race safety, safe snapshot migration and stable projection; preserve known depth under partial failures and Depth 5→3→5. Confirm installed Chrome right-click behavior.

**Phase 2 — Durable delta index and checkpoint resume:** transactional node/journal/checkpoint storage, OAuth pause/resume, scoped backoff/idempotency and targeted Refresh Folder Listing. Prove a restarted worker does not begin global discovery from zero.

**Phase 3 — Native menu efficiency and fair coverage:** bounded delta menu registrar where feasible, deterministic multiple-bucket fairness, deep-folder browse fallback and no flashing or clearing the whole menu on an ordinary single-folder update.

**Phase 4 — Daily/Weekly/Off snapshot catalogue and exports:** immutable baseline, daily default, weekly recovery references, Off, retention/deletion, compaction/validation, Time Machine-compatible historical queries. Full Time Machine UI remains a future task.

Do not claim a feature is implemented or tested because this specification was committed.

## 9. Non-negotiable acceptance tests

1. **Known depth five → partial reload depth three:** still-authorized known level-five paths stay usable; no partial scan deletes them; native menu projection remains valid.
2. **Depth 5→3→5:** existing deeper paths return immediately at the selected presentation limit without a new full scan.
3. **Confirmed REDOWN change:** one new/changed/deleted folder is reflected immediately after provider acknowledgement, with one corresponding durable journal event; unaffected branches don't change.
4. **External change:** scoped Refresh Folder Listing identifies it when verified; a repeated unchanged refresh yields no node writes and no duplicate delta events; incomplete listing never deletes entries.
5. **Interrupted scan:** simulate MV3 stop and OAuth disconnect mid-page after thousands of recorded entries, then reconnect to same account; continue from last committed scope/page when valid; cursor invalidation restarts only one affected segment; no repeated full-tree restart or tight retry storm.
6. **Auth revoked or account switched:** historical privacy preserved, all unauthorized live actions disabled; no stale route can trigger a save.
7. **18+ participating buckets and beyond-native-menu capacity:** maintain untruncated persistent graph and deterministic menu subset with discoverable browse fallback. No bucket permanently starved; no orphaned native entries.
8. **Newer generation wins:** concurrent Save/Reload/Depth change and late provider responses must not replace the live tree or registered menu with an older state.
9. **Snapshot policy:** Daily default; Weekly, Off and changing frequency work; restore points reconstruct unchanged/deleted prior branches; no false offline timestamp; no silent deletion; compaction never corrupts retained versions.
10. **Crash atomicity:** no partial journal line/event, duplicate event, mismatched checkpoint, or half-applied graph after transaction failure. Validate checksums/generations and recovery.
11. **Installed Chrome acceptance:** real native menu navigation/click routing, stable UI, correct destination saved and accurate per-scope progress; compare actual behavior against tests. State clearly when browser/provider verification is unavailable.

## 10. Delivery requirements for Work/Codex

Read `AGENTS.md`, this handoff, `NEED_TO_DO/10312026.md`, `FOREVER_WORKS/v3/P0_RIGHT_CLICK_THREE_FIX_REPAIR.md`, current implementation sources and tests. Inspect before changing. Implement in focused stages with a small reversible migration. Run appropriate source/domain/integration tests and installed Chrome where available. Report exact evidence and pending blockers. Document confirmed causes, schema version, transactional invariant, migration/rollback, retry behavior, native menu constraints, privacy and storage estimates. Commit and push only authorized work; do not modify protected checkpoint tags.

**One-line acceptance:** **Immediate confirmed changes; all other previously known authorized branches remain accessible; interruptions resume; Reload only reconciles verified deltas; Daily history is the default.**
