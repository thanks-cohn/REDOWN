# Simple versus Nested/Narrow versus Nested/Depth

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## Current model and shared picker

The saved presentation is `{style:'simple'|'nested', nested:'narrow'|'level', depth:1..10}`. UI says Depth; internal Level is a Nested submode. The separate shared `rightClickV3.destinations` array contains all Simple and Narrow enabled flags, labels, order and explicit parent links. Switching presentation does not clone or replace it. The same editor outline/form serves both modes. Depth reads `rightClickV3LevelScopes` and inventory instead; it does not require a manual destination tree. Sources: [extension/right-click-v3.js:1–300](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-v3.js#L1-L300); [extension/beta/right-click-v3-ui.js:19–113](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/beta/right-click-v3-ui.js#L19-L113).

IF a shared destination is renamed in Simple, THEN Narrow sees the same new label. IF it is disabled, THEN both projections lose its action (and explicit parent-linked children can become ineligible). IF presentation switches, THEN the destination array remains intact. ELSE Depth uses its separate bucket scope set and numeric depth, not those manual checkmarks.

### One input, three expressions

Checked records `w = Art/Photography/Weddings` (label Weddings) and `p = Art/Photography/Portraits` (label Portraits), both parentId null:

```text
Simple: Cloudflare [NAV ONLY]
          Weddings [SAVE v3:w]
          Portraits [SAVE v3:p]
          separator
          Home [SAVE default redown root, only if ready]
Narrow: Cloudflare [NAV ONLY]
          bucket [NAV ONLY]
            Art [NAV ONLY]
              Photography [NAV ONLY]
                Weddings [SAVE v3:w]
                Portraits [SAVE v3:p]
          separator / Home if ready
Depth:  Cloudflare → participating bucket at 0
          every discovered folder at 1, then 2, then … selected depth
          branches [NAV ONLY] with explicit Save here; boundary leaves [SAVE]
```

Depth is not another rendering of these two checked destinations. It may expose other known folders from authorized participating buckets. Picker reuse does not establish independent per-mode state.

## Simple: actual default and flat siblings

Call trace: `buildMenus → project → simpleProjection → simpleTargets → eligible/prepared`; click `resolveActiveRightClick → resolve → simpleTargets/prepared`. [extension/right-click-v3.js:191–227](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-v3.js#L191-L227).

IF exactly one ready lowercase `redown` bucket exists (or stored default explicitly selects a ready one), THEN it is the primary. IF primary exists and no extras exist, THEN Cloudflare itself is the exact root-save leaf. IF extras exist, THEN Cloudflare becomes a parent, extras appear first, separator then Home last. ELSE a missing primary yields a setup leaf or extras without a false Home.

Ready means matching stored Cloudflare profile with workerUrl and token; it is not a fresh provider permission check. Multiple ready default candidates without explicit selection give no primary. Extra manual records preserve array order; activated bucket roots append afterward, deduplicated by account+bucket. Duplicate titles are presentation-suffixed (`· 2`, etc.), cross-account duplicates include account text. A manually named alias to the chosen default root is suppressed entirely by `simpleTargets`, so “all aliases always selectable” is not true today. Root alias remains available in Narrow.

Connecting Google Drive/Dropbox/OneDrive adds a sibling provider fragment, and does not itself turn Cloudflare from leaf into submenu. Other eligible Cloudflare activated bucket roots can do so. `redown-go-home` is dashboard navigation; `v3:provider:cloudflare:default` is SAVE. The historical contract says REDOWN first; current logic-tables and current source use Home last. This conflict is documented, not resolved by silently citing the old contract.

## Narrow: exact configured targets and natural ancestry

Call trace: `project → narrowEntries → eligible → bucket tuple Map → split('/') trie → walk`; resolution `resolve(current leaf) → narrowResolve → prepared`. [extension/right-click-v3.js:7–70](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-v3.js#L7-L70).

IF paths share exact segments within the same profile/account/bucket, THEN their ancestors coalesce. IF only a synthetic ancestor is visible, THEN it has no exact save route. IF a single selected target also has children, THEN its branch gets `v3:id:send` titled Save here. IF multiple records share the same path, THEN the path becomes a synthetic branch with separate `v3:id` alias leaves.

Explicit parentId is used for validation, eligibility, editor outline and cascading removal; it is not the trie builder's visual branching key. Natural path segments determine native structure. A disabled record does not suppress a separately selected descendant with parentId null, but a child explicitly linked to it is ineligible. A single selected path node uses the custom label even if it is a branch; multiple aliases use the real segment label above alias actions. Native order follows original array insertion and Map insertion, not alphabetic sorting. Whole-plan entry budget truncates the finished Narrow plan; the 300-entry budget is an application bound, not a claim about Chrome's absolute platform capacity.

## Depth: bounded discovery and durable knowledge

Call trace: presentation/scope edit or 5-minute alarm → `refreshV3Inventory → discover(listObjectsPage) → commitV3Current → rebuildMenus → levelProjection`; click `resolve → current plan leaf → nodeId → prepared`. [extension/right-click-v3.js:75–189](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-v3.js#L75-L189); [extension/background.js:2319–2347](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/background.js#L2319-L2347); [extension/background.js:2731–2765](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/background.js#L2731-L2765).

IF a bucket participates, THEN its root is level 0 and the provider heading consumes no directory depth. IF depth is 3, THEN known level-4/5 nodes remain remembered but are not projected. IF a scan fails or is bounded, THEN warnings/frontier retain partial status rather than imply exhaustive discovery. IF depth changes 5→3→5, THEN remembered authorized nodes can be reused rather than deleted.

Limits: depth 10; 300 projected entries; 500 new folder budget; 5000 known nodes; 80 attempted pages; 20s scan budget; each listing race up to 8s; inventory TTL 5min and root-observation reuse up to 60min. Per-bucket allocation limits prevent a single broad root taking everything. Root/parent Save here reservation and breadth-first allocation apply before outer wrapper overhead. The synthetic 5→3→5 fixture retains six nodes throughout; [observations](evidence/observations.json) records exact calls. No native arbitrary submenu-hover fetch is wired: registration uses cached data, while explicit refresh/alarm owns discovery.

A stale remembered folder can remain a route if its scope/profile remains prepared; actual remote authorization is deferred to the provider operation. This is not proof that a folder still exists or that an expired token can write. Prefix folders may disappear naturally when empty; no complete-scan deletion inference exists here.

## V3+1 mode-state alternatives — proposed, not installed

| Option | State design | Benefit | Migration risk / cost |
|---|---|---|---|
| A recommended | shared exact location identity; separate per-mode shortcut IDs, aliases, enabled and order | one picker and reusable cloud knowledge with independent menu editing | copy old target selections into both modes with migration provenance; preserve old IDs until route transition |
| B | separate full mode configurations referencing shared identity | clearest independent revision/rollback | duplicates config metadata; same real location must still not become duplicated cloud records |
| C minimal | shared targets plus per-mode overrides for selected/label/order | smallest schema delta | implicit inheritance hard to explain; deletions and alias multiplicity become awkward |

None is approved by this audit. Proposed alias records cannot live solely on a cloud location, because a location can have two names in one mode and different labels/order in another. Proposed revisions should be separate for cloud observations and each mode's draft; presentation switching should not overwrite unsaved edits in another mode. Existing serialized last-desired presentation loop, revision conflicts, retained session drafts and Apply epoch checks are useful mechanisms to preserve. Multiwindow browser races, canceled changes after autosave, and request deadline outcomes remain acceptance gates, not complete transactional editing proof.
