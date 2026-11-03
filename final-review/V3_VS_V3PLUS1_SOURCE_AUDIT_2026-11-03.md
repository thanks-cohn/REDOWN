# Final Review — REDOWN V3 vs. Click2Cloud V3+1
## Preserve the proven foundations. Discard the coupling. Prevent another right-click rewrite.

**Date:** November 3, 2026  
**Purpose:** Source-backed assessment of whether current REDOWN V3 contains valuable features and engineering protections missing from V3+1. This is a review, **not an instruction to transplant or modify any engine.**  
**REDOWN reference revision (main before report):** `79946ff101a6ef3121acee3f0c61ed58d7fabae4`  
**Click2Cloud reference revision:** `816722a2d6640720c5e57113389bf68478d430fe`  
**Evidence limitation:** Static source and test-file inspection. Existing tests were inspected but **not run during this review**. Installed Chrome behavior and live end-to-end R2 saves were not freshly verified. A documented design requirement is not an implemented capability.

## Executive decision

**Yes: REDOWN V3 has an unexpectedly sophisticated *operational infrastructure* that V3+1 does not yet implement.** V3+1 is the better proposed *long-term mode architecture*, but the current Click2Cloud code is still a narrowly scoped prototype. Simply replacing V3 with its cleaner Simple/Narrow/Depth compiler today would regress durable state, retry semantics, menu registration, bucket discovery, migration, overflow handling, receipt verification and provider interoperability.

**Do not cancel V3+1 and do not plan a V4.** Preserve V3's mechanisms behind stable interfaces, improve or isolate the known flaws, then validate the V3+1 replacement in a real Chrome extension before transplanting it into REDOWN.

The crucial distinction is **keep the real service / protocol / reliability invariant, not necessarily the old menu implementation or user interface**. Where REDOWN already has a functioning owner of a behavior (one native Chrome menu registrar, one Cloudflare activation service, one verified transfer/History path), V3+1 should adapt to that authority rather than create an incompatible duplicate.

## 1. Verified source inventory

### REDOWN files reviewed

| Source | Actual responsibility |
|---|---|
| [`extension/right-click-v3.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/right-click-v3.js) | Validation, canonical V3 identities, Simple/Narrow/Level projections, discovery budgets, resolution, migration |
| [`extension/beta/right-click-v3-ui.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/beta/right-click-v3-ui.js) | Tree/editor, optimistic revisions, drafts, focus, undo, explicit Apply |
| [`extension/background.js:2153–2635`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/background.js#L2153-L2635) | Serialized configuration writes, activation, cache restoration, native Chrome registration |
| [`extension/background.js:2785–3019`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/background.js#L2785-L3019) | MV3 startup/alarms, provider click routing, special capture, right-click save |
| [`extension/background.js:2038–2107`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/background.js#L2038-L2107) | Cloudflare Worker ingest, exact-path validation, independent object HEAD receipt |
| [`extension/right-click-current.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/right-click-current.js) | IndexedDB CURRENT, journal, per-namespace graph, generations, backup periods |
| [`extension/right-click-backup.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/right-click-backup.js) | Validated encrypted portable export/restore without credentials |
| [`extension/right-click-engine-settings.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/right-click-engine-settings.js) | Sanitized migration-recovery export |
| [`extension/google-drive-menu.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/google-drive-menu.js), [`dropbox-menu.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/dropbox-menu.js), [`onedrive-menu.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/onedrive-menu.js) | Independent flat provider menu declarations and revision/ownership checks |
| [`extension/right-click-chooser.js`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/right-click-chooser.js), [background chooser handler](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/extension/background.js#L3050-L3074) | Overflow destination search, one-use click intent, authority recheck |
| [`tests/right-click-v3.test.mjs`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/tests/right-click-v3.test.mjs), [`tests/global-bucket-activation.test.mjs`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/tests/global-bucket-activation.test.mjs), [`tests/right-click-current.test.mjs`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/tests/right-click-current.test.mjs), [`tests/right-click-backup.test.mjs`](https://github.com/thanks-cohn/REDOWN/blob/79946ff101a6ef3121acee3f0c61ed58d7fabae4/tests/right-click-backup.test.mjs) | Focused regression fixtures and expectations; **not executed in this review** |

### Click2Cloud files reviewed

| Source | Current state |
|---|---|
| [`src/core/menu-compiler.mjs`](https://github.com/thanks-cohn/Click2Cloud/blob/816722a2d6640720c5e57113389bf68478d430fe/src/core/menu-compiler.mjs) | Pure, deterministic single-file compiler with Simple/Narrow/Depth branches and one Cloudflare bucket |
| [`src/core/save-dispatcher.mjs`](https://github.com/thanks-cohn/Click2Cloud/blob/816722a2d6640720c5e57113389bf68478d430fe/src/core/save-dispatcher.mjs) | Minimal complete-byte-array upload call; trusts adapter's `confirmed:true` |
| [`src/explorer/index.mjs`](https://github.com/thanks-cohn/Click2Cloud/blob/816722a2d6640720c5e57113389bf68478d430fe/src/explorer/index.mjs) | Imported REDOWN Universal File API facade, real injected transport required |
| [`src/dashboard/controls.mjs`](https://github.com/thanks-cohn/Click2Cloud/blob/816722a2d6640720c5e57113389bf68478d430fe/src/dashboard/controls.mjs), [`redown-bridge.mjs`](https://github.com/thanks-cohn/Click2Cloud/blob/816722a2d6640720c5e57113389bf68478d430fe/src/dashboard/redown-bridge.mjs) | Refresh/activation adapters; standalone Click2Cloud page lacks authorized REDOWN sender |
| [`docs/CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md`](https://github.com/thanks-cohn/Click2Cloud/blob/816722a2d6640720c5e57113389bf68478d430fe/docs/CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md) | Planned implementation request |
| [`docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md`](https://github.com/thanks-cohn/Click2Cloud/blob/816722a2d6640720c5e57113389bf68478d430fe/docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md) | Autonomous run requirements |
| [`docs/V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md`](https://github.com/thanks-cohn/Click2Cloud/blob/816722a2d6640720c5e57113389bf68478d430fe/docs/V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md) | Broad target API and behavior contract; **not implementation proof** |

## 2. Most important existing V3 mechanisms: purpose, proof, safest disposition

**KEEP** = preserve behavior/underlying working service; **ADAPT** = preserve principle using a new provider-neutral interface; **REJECT** = exclude the harmful coupling/UX; **VERIFY** = current code suggests it works but browser/live evidence still required.

| V3 mechanism | Its purpose / source-confirmed working logic | Best disposition in V3+1 | Hazards / required proof |
|---|---|---|---|
| **P0: IndexedDB CURRENT transaction** | Commits `state`, `records`, `journal`, `pointers` and `backups` atomically; updates Chrome-storage mirror on next startup. `right-click-current.js:23–96` | **KEEP/ADAPT** as shared durable infrastructure | Mode-specific storage namespaces; abort and cold-restart tests; no shared mutable destinations |
| **P0: Desired vs. applied generations** | Records current desired config and Chrome-acknowledged application separately; stale acknowledgements cannot mark newer edits applied. `background.js:2423–2494` | **KEEP** | Distinguish `saved`, `registered`, `inventory complete` and `cloud verified`; injected lost callbacks |
| **P0: Single native Chrome registrar** | Serializes menu changes, builds parent-first descriptors, handles update/create/remove callbacks, retains root/Manage on failures. `background.js:2437–2619` | **KEEP/ADAPT**, one REDOWN host authority | No duplicate root/listener; actual installed Chrome, reorders, errors and restart |
| **P0: Exact live click resolution** | Re-resolves menu ID against current persisted model and prepared profile, not stale title. `right-click-v3.js:251–269` | **KEEP** | Canonical provider/connection/account/bucket/prefix; fail closed on revoked authorization |
| **P0: Verified R2 receipt** | Worker POST returns exact key/bytes, Worker HEAD verifies key, size, etag, source metadata and live session before completed record. `background.js:2038–2107` | **KEEP/ADAPT** receipt method | New privacy mode must not rely on transmitting source URL metadata; verify HEAD/readback independently |
| **P0: Provider identity in routing** | Tuples include `profileId/accountId/bucketName/prefix`; identical folder labels do not confer identity. `right-click-v3.js:32–33,167` | **KEEP/ADAPT** for S3 | No shared-account collisions; add provider and connection identity; secret-free IDs |
| **P0: Startup/MV3 repair** | Registers on install/startup/every worker load; alarms resume activation and refresh Level. `background.js:2785–2822` | **KEEP** | Real service worker suspension and restart proof |
| **P1: Mutation journal** | JSONL of prior/new semantic changes per namespace, not just a last-value JSON file. `right-click-current.js:47–95` | **KEEP/ADAPT** | Redact secrets; per-mode state; journal replay integrity |
| **P1: Immutable dated backup anchors** | Daily/weekly/off policy with immutable period backup and mutable WORKING state. `right-click-current.js:18–22,78–93` | **KEEP** | Recovery/rollover tests, profile deletion limits |
| **P1: Portable encrypted restore** | Validates graph and journal, AES-GCM + PBKDF2-SHA256 210k, refuses credential fields and restoring into populated graph. `right-click-backup.js` | **KEEP/ADAPT** | Support new schema/migrations; user reconnects, never copy secrets |
| **P1: Resumable Depth inventory** | Stores listed/partial/observedAt, repeated-cursor guards, pending frontier; retains historical folders and resumes partial scan. `right-click-v3.js:113–166` | **KEEP/ADAPT** read-only service | Versioned immutable inventory shared by 3 modes; no mode preference mutation |
| **P1: Bounded discovery budget** | Limits depth 10, ~20s, 80 pages, 500 new folders, 5000 known nodes, 300 menu entries, TTL 5m, per-call timeout. `right-click-v3.js:68–69,121–165` | **KEEP** as configurable safety, not permanent product ceiling | Huge dataset, partial visibility and cancellation tests; 10+ depth possible if safe |
| **P1: Per-bucket fair projection** | Breadth-first Level planning reserves root/menu capacity for later buckets. `right-click-v3.js:174–189` | **KEEP** | One giant bucket must not starve others |
| **P1: Cache is not authority** | Reuses nodes only with matching authenticated profile/account/bucket/Worker and denies revoked routes. `right-click-v3.js:113–120,168–174` | **KEEP** | Known folder ≠ current writable folder; live auth/capability checks |
| **P1: Concurrent editor revisions** | Optimistic expected destination/scope/presentation versions, serializes saves; refuses stale edits, retains unsaved drafts in sessionStorage, supports Undo. `right-click-v3-ui.js:79–113,229–254` | **KEEP/ADAPT** | Per-mode CAS; multiple tabs; no overwrite of inactive modes |
| **P1: Keyboard editor behavior** | Arrow/Home/End, F2, Delete, Space, tree-focused typeahead, inline focus restore, Escape, expansion/scroll retention. `right-click-v3-ui.js:108–228` | **KEEP behavior**, replace visual tree UI | Preserve keyboard access in path + Parent/Sibling/Child pills |
| **P1: Default Simple leaf → submenu** | Cloudflare is directly actionable with one verified default; extras make submenu; native separator then Home saves to same default. `right-click-v3.js:191–249` | **KEEP** | Keep separate REDOWN “Go Home” navigation; no accidental default changes |
| **P1: Save here on actionable branches** | Native Chrome submenus cannot simultaneously be direct-save leaves; V3 emits a dedicated actionable child. `right-click-v3.js:45–54,180–188` | **KEEP** | Never make structural-only ancestor a save target |
| **P1: Native overflow escape hatch** | Bounded menu can expose More destinations; chooser rechecks authorization, preserves original right-click context for 10 min and consumes intent once. `background.js:3050–3074` | **KEEP mechanism, REDESIGN UX** | Popup/tab conflicts with no-tab goal; never hide destinations without alternative |
| **P1: All-bucket activation state machine** | Account/bucket enumeration, per-bucket Worker preparation, partial failure, retry healthy vs failed, session checks, alarms and registration verification. `background.js:2259–2348` | **KEEP**, behind authenticated shared service | **Do not** auto-write Depth scopes; no cloud billing approval bypass |
| **P1: Flat provider fragments** | Google/Dropbox/OneDrive each has own native direct leaf and dispatch; one invalid fragment does not rewrite all provider config. `background.js:2525–2547,2935–2946` | **KEEP** original providers | Avoid hardcoded provider order for future independent S3 adapters |
| **P2: Migration recovery** | Imports old destinations with original paths/labels retained for review if invalid; separate safe export. `right-click-v3.js:272–299` | **KEEP/ADAPT** | Migrate into isolated mode configs; source snapshots retained |
| **P2: Specialty capture** | Site-specific generated gallery ZIP blob capture, avoids saving HTML instead; bounded persisted retry queue. `background.js:2638–2782,2971–3001` | **KEEP as source-acquisition strategy** | Don't put site-specific logic in menu compiler; not general-size-cap proof |
| **P2: Graceful partial menu** | Chrome-acknowledged partial Depth projection doesn't falsely assert full inventory, while usable Simple remains enabled. `background.js:2465–2480` | **KEEP** | Independent axes: menu registered, scan complete, Worker healthy, save verified |

These are **source-confirmed mechanisms**, not 24 separately run production validations. In V3+1, implementation choices should first be judged by whether they preserve a verified invariant; never create a second service just to make code look modular.

## 3. V3 weaknesses that must NOT contaminate V3+1

| Existing V3 assumption / issue | Why it is wrong for future V3+1 | Correct boundary |
|---|---|---|
| Simple and Narrow use the same `rightClickV3.destinations` | Editing a shared destination can alter both modes | Independent config, revision, validator, projector and tests for each mode |
| Activation appends to `rightClickV3LevelScopes` | Preparing a bucket silently changes user menu participation | Shared activation service must not mutate any mode preference |
| Cloudflare-specific `prepared()` checks stored Worker URL/token | Stored fields aren't a live OAuth entitlement or Worker capability proof | Separately verified connection/worker status with explicit freshness |
| Compiler hardcodes Cloudflare and R2 profile | Incompatible with adding arbitrary independent S3 providers | Provider/connection-neutral canonical target and capability model |
| Separate seven-edge parent hierarchy cap; Depth limit 10 | Arbitrary semantics when user's paths exceed these | Flexible depth constrained by safe runtime budget and Chrome limits |
| Folder list only expanded after Browse gate in editor | Hides ordinary discoverable tree; poor intuition | Auto-display known inventory, lazy-fetch deeper when needed |
| Legacy Worker remote ingest sends source URL | Distinct from privacy design browser-capturing bytes | Two named transfer strategies; don't claim no-origin disclosure for legacy path |
| Metadata receipt requires source URL | Conflicts with minimal metadata to destination providers | Independent provider object readback, provenance separate |
| Activated buckets may automatically appear as Simple extras | Creates menu clutter after infrastructure actions | Explicit menu participation and stable default |
| More chooser opens a tab | Violates preferred “just right-click save” experience | Controlled bounded-native alternatives, preserving reachability |
| Old checkbox for nested mode still emitted but click ignored | Misleading inert control | Only one authoritative mode selector in new engine |
| Provider order has fixed predecessor assumption | Future providers/S3 may cause order conflicts | Declarative namespace ownership and ordering |
| Page-specific activation sender `beta/explorer.html` | Separate V3+1 page can't invoke even trusted operation | New authorized host/service, **not spoofing the sender** |
| Critical configuration changes are in one combined V3 module | Replacing Nested could regress Simple/Depth | Three independent replaceable modules, shared immutable inventory |
| Invalid unprepared saved records filtered in projection | Can silently disappear from current menu view | Explicit quarantined/inactive definitions; no silent deletion or false ready |

**Important policy:** “Remove barriers to automation” must mean removing unnecessary GUI-location coupling and duplicated manual steps **while preserving permissions**. It must never mean bypassing OAuth, stealing tokens, automatically accepting R2 billing terms, or publishing private buckets.

## 4. Current Click2Cloud gaps that would be actual regressions if transplanted now

1. **No true mode-module separation yet.** `src/core/menu-compiler.mjs` branches inside a single `compileMenu()`. All three modes cannot currently be independently transplanted or modified as separate tested packages.
2. **Only one bucket string in compiler input.** `compileMenu({mode,bucket,folders,config,flatProviders})` lacks full account/connection ID, and `intentFor()` returns only `{provider:'cloudflare',bucket,path}`. This can cross-route two same-named buckets in different accounts.
3. **No durable CURRENT parity.** There is no comparable IndexedDB transactional state+journal/backups/generation system in Click2Cloud code as examined.
4. **No real resumable inventory planner.** The compiler accepts caller-provided `folders[]`, not an independently owned paginated, timestamped, per-account/bucket read-only inventory.
5. **No complete native Chrome installer/reconciler.** The compiler produces nodes, but the installed-extension registrar, one click handler, callback ACK and crash repair have not yet been implemented in the lab.
6. **A Boolean receipt is not a verified R2 object.** `dispatchSave()` accepts adapter-returned `confirmed:true`, while V3 explicitly performs independent HEAD/readback. Also current dispatcher requires a whole `Uint8Array` instead of supporting long streams.
7. **The current Refresh/Activate workbench is gated by missing trusted host integration.** The bridge intentionally only accepts the original REDOWN Explorer sender; it is not yet an independently authorized Click2Cloud extension.
8. **The Worker's lab build is not a native menu or save receipt.** Service bindings to existing REDOWN Workers do not grant OAuth scopes, Worker secrets, or automatically verified upload rights.
9. **No operational proof that Google/Dropbox/OneDrive will survive replacement unchanged.** Flat logical names are not equivalent to preserving their actual registered native leaves and provider-specific dispatchers.
10. **Migration is specified, not proven.** Legacy labels, disabled records, exact destinations, backups, History GO TO, and rollback still need reversible acceptance.

## 5. Recommended architecture: extract good without reinventing V3

```text
REDOWN — existing trusted production host
 ├── Cloudflare authorization / R2 activation / Worker lifecycle
 ├── Universal File API + existing R2 and future S3 adapters
 ├── CURRENT durable graph, journal, dated backup, encrypted export
 ├── shared authorized, versioned, read-only folder inventory
 ├── actual native Chrome menu registrar + generation ACK
 ├── one click dispatcher + specialized source capture strategies
 ├── provider verified save receipts + REDOWN History / counters
 │
 └── V3+1 pure destination engine (new part)
      ├── Simple  — own config / validator / projector / migration / tests
      ├── Nested  — own config / validator / projector / migration / tests
      └── Depth   — own config / validator / projector / migration / tests
                 ↓
          one validated MenuSpec + immutable SaveIntent
```

The **activation service is independent from all menu modes**. “Worker verified” does not write Simple shortcuts or Depth selections. **Inventory is immutable, shared, provider-scoped and read-only** to the mode projections. The **MenuSpec is deterministic, versioned, stable and credential-free**. The **native writer and click dispatcher remain singletons**. REDOWN's real Transfer/History subsystem remains the receiving side for verified receipts; do not reconstruct the Explorer, Google/Dropbox/OneDrive integrations, or the Shelf.

This is an *interface-level* transplant: replace Cloudflare V3's current configuration/projection/resolution with V3+1 while preserving production capabilities. A separate Click2Cloud lab may implement an authenticated narrow testing host but must not automatically mutate REDOWN production.

## 6. Proposed KEEP / ADAPT / REJECT implementation sequence

| Stage | Deliverable | Unavoidable tests |
|---|---|---|
| 0 — Snapshot | Pin both repositories' source/blobs, record baseline failures, protected modules, existing menu output | No application code changed |
| 1 — Formal contract | Canonical target + capability + MenuSpec + SaveIntent and stable identity | Same names in separate accounts, deterministic projections, collision rejection |
| 2 — Mode isolation | Separate Simple/Nested/Depth modules and persisted revisions | Editing one mode leaves other two exact config hashes unchanged |
| 3 — CURRENT adapter | Durable graph, journal, snapshots, encrypted backup/restore, applied generation | Aborted write, concurrent tabs, cold restart, corrupted restore |
| 4 — Shared inventory | Bounded paginated/TTL-aware R2 discovery, resumable frontier, per-bucket fairness | Partial/failed listing, repeated cursors, 16-deep spine, wide buckets |
| 5 — Native host | One authorized Chrome registrar with callback and application-generation ACK | One root, flat siblings, restructure, failed create/update, MV3 restart |
| 6 — Automatic activation | Reuse REDOWN's verified Worker and bucket preparation through trusted host | No R2 billing auto-consent, no mode preference mutations |
| 7 — Real save | Exact destination, provider readback, one receipt, stable History/GO TO identity | Real disposable R2 object HEAD and failed/uncertain case |
| 8 — Transplant acceptance | Feature-flagged migration and rollback into REDOWN; provider parity | Installed Chrome, scope isolation, original menus restored on rollback |

**Never** count a passing mocked `npm test` or Worker Build as live browser/upload evidence. If cloud permissions or installed browser are unavailable, mark precisely **BLOCKED** and continue safe independent engineering.

## 7. Non-negotiable collision-avoidance rules

- Never add a second REDOWN native root, menu registrar, context click handler, provider OAuth service, file API, Explorer, History writer, Worker-provisioner or transfer counter.
- Never copy old Cloudflare-only mode state as a new permanent provider-neutral data model.
- Never allow Simple, Nested and Depth to import one another's private implementation or write one another's config/revisions.
- Never derive a save destination from a visible label. Identity must bind provider, connection/account, bucket/container and exact prefix.
- Never allow an activation job to alter mode participation. Newly activated buckets are *available* for selection, not necessarily selected.
- Never treat cached/fetched folders as fresh write authorization. Verify current capabilities before dispatch.
- Never expose source URLs, page URLs or navigation provenance to new destination-provider byte APIs; distinguish REDOWN's historical Worker-fetch mode.
- Never claim “Saved” until a trustworthy provider-specific receipt/readback, or “Applied” until Chrome's matching native ACK.
- Never automatically accept Cloudflare billing terms or new OAuth permissions, and never place tokens into repositories, menus, logs or backups.
- Never modify REDOWN runtime code for review/documentation-only work. Treat review recommendations as proposals until a separate explicit engineering task begins.

## 8. Acceptance checklist before dropping V3

| Gate | Expected result | Review status |
|---|---|---|
| Mode isolation | Three independent source modules, isolated stored configs and strict no-cross-mode changes | **NOT IMPLEMENTED** in current Click2Cloud |
| Canonical identity | Same-name buckets/paths from distinct accounts cannot collide | **NOT IMPLEMENTED** in current Click2Cloud compiler |
| Durability | CURRENT journal, backup/restore, generation and crash recovery preserved | **NOT IMPLEMENTED** in current Click2Cloud |
| Depth discovery | Resumable, paginated, bounded, true account-specific bucket tree | Source exists in REDOWN; Click2Cloud not integrated |
| Native Chrome | Actual menu ACK, single writer, provider leaves and Home semantics | Not proven for Click2Cloud |
| Real activation | Auto-setup after authorized R2, distinct Enable R2 / Refresh / Activate Buckets | Not proven in Click2Cloud |
| Real R2 save | Source capture → intended exact prefix → provider HEAD/readback → History | Not proven in Click2Cloud |
| Other providers | Google/Dropbox/OneDrive unchanged flat direct native rows | Needs real installed Chrome acceptance |
| Existing captures | Specialized generated-blob/ZIP and failed source behavior preserved | Needs test parity |
| Rollback | Lossless old-state snapshot, one-feature-flag reversal and no object deletion | Not proven |

## 9. How to use this report in the next Codex request

Add a **V3 Preservation and Parity Appendix** to the Click2Cloud Codex request, referencing this file. Codex should be instructed to examine **actual source**, verify the mechanism still exists, reuse it *without duplicating production services*, and produce a row-by-row matrix recording (a) purpose, (b) existing viable mechanism and source path/lines, (c) safe ownership and extraction boundary, (d) source/binary collision hazards, (e) REDOWN tests and new V3+1 tests, and (f) implementation PASS/FAIL/BLOCKED.

The appendix must explicitly distinguish:

1. **KEEP AS-IS:** REDOWN production hosts/services, original per-provider upload/History paths, single native registrar and auth flows wherever feasible.
2. **ADAPT / EXTRACT:** CURRENT, exact IDs, inventory, saved-versus-applied revisions, bounded discovery, backup and receipts into shared, versioned, provider-neutral interfaces; preserve outputs and failure semantics.
3. **REJECT / REWRITE ONLY THE FAULTY BOUNDARY:** shared mode destinations, activation-to-menu coupling, page-specific GUI trust dependency, confusing inactive controls and old clunky destination editor.
4. **TEST BEFORE TRANSPLANT:** a real Chrome right-click and exact saved object across all supported modes, partial activation, failures, restarts, other-provider leaves and a reversible rollback.

**Conclusion:** V3's longevity mechanisms are stronger than they first appear. A high-quality V3+1 must **inherit that reliability and operational truth while replacing the problematic coupling**. The goal is no V4, not no changes ever. Avoid treating a documentation promise as a functioning replacement.
