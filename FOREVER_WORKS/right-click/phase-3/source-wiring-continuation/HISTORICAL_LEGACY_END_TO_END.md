# Historical Legacy: exact edit → save → menu → click map

[Navigation](README.md) · [contract](UI_TO_WIRING_CONTRACT.md). HISTORICAL_SOURCE at `515c272c48f89eb3f509fa2c7a5a02e0db53f66b`; owner success is an OWNER_REPORT, not universal historical Chrome proof.

## Entry and controls

Historical `extension/options.html` loaded `nested-locations.js`, `nested-menu-editor.js` and `options.js`. `refreshProfiles` read saved profiles/mode; `renderProfiles` built per-profile configuration, mode visibility and the Nested editor. `renderRightClickMode` toggled Simple and Nested hosts; `chooseRightClickMode` disabled controls, wrote `rightClickMode` immediately and restored old mode on storage error. Inactive configuration stayed saved. A single prepared profile could receive +Location directly; multiple profiles opened `add-location-dialog` with stable profile IDs; no accounts produced “Use a storage bucket first.”

| Historical control / callback | State and persistence | Native consequence / effect boundary |
|---|---|---|
| Default bucket / `simplePrimaryLocationField` | `simpleBucketName`; clear `defaultPrefix`; `scheduleSave`; reset segment editor | `quick:P` resolves selected same-account prepared bucket |
| Existing segment dropdown / `simpleFolderPathEditor` | Set segment; clear descendants; `commit` contiguous prefix; primary callback `scheduleSave` | Exact prefix; no remote creation. Descendant blank rows remain reusable |
| + Child | Insert a blank selector after selected segment | No new folder; no path beyond last contiguous selection |
| Segment red × | Blank segment and all dependent selections; redraw from that level | Menu path clears to selected ancestor; **no remote deletion** |
| Separate new-directory input + Create | Typed drafts by level; validate one name; `cfCreateFolder(account,bucket,parentPrefix,name)`; 60s UI wait; stale generation/parent/bucket checks | Real marker creation can precede save; timeout warns to inspect before retrying. Does not inherit dropdown into input |
| Extra +Location / `simpleExtraOptions.addLocation` | UUID, blank label, owner bucket, empty prefix; whole-profile `saveProfiles` immediately | Flat `simple-option:P:S` |
| Extra label / `field` | Mutate label; scheduleSave | Label changes presentation only |
| Extra bucket/prefix | Bucket resets prefix; segment callback `saveProfiles` immediately | Stable option ID, exact selected bucket/prefix |
| Remove option | Filter option array; immediate `saveProfiles` | Remove native action; profile/storage remain |
| Reorder / `RedownReorder.attach` | Saved profile/option sibling order, descendants retained | Stable IDs, sorted output; pointer/keyboard utility |
| `menuTree` label/target/suggestions/add/remove | `renderTreeNode`, `findNode`, `removeNode`; debounce whole profiles; leaf prefix/category/path | Old `preset:P` → `tree:P:SANITIZED_CHAIN` hierarchy; only leaf transfers; old category/GitHub paths differ from modern R2-only path |
| Nested include / root/folder select, child add/remove/label | Shared Nested model; `saveNestedMenu` serialized fresh read, patch only model, preserve recent credentials/Explorer profiles | `nested:P:R:N`; ready ancestry required; menu-only child versus real Create are distinct |
| Make New Bucket | Confirm; `cfCreateBucket` then `cfProvision`; refresh | Real infrastructure writes, not destination-only edits |
| Default/fallback | Stored `defaultPrefix`; old `simpleLabelFallback` bucket/deepest/menu handling in old builder | Blank label can use bucket preference; naming cannot change target |

Source anchors: [old options save/timer](https://github.com/thanks-cohn/REDOWN/blob/515c272c48f89eb3f509fa2c7a5a02e0db53f66b/extension/options.js#L51), [mode/path editor](https://github.com/thanks-cohn/REDOWN/blob/515c272c48f89eb3f509fa2c7a5a02e0db53f66b/extension/options.js#L433), [primary](https://github.com/thanks-cohn/REDOWN/blob/515c272c48f89eb3f509fa2c7a5a02e0db53f66b/extension/options.js#L591), [extras](https://github.com/thanks-cohn/REDOWN/blob/515c272c48f89eb3f509fa2c7a5a02e0db53f66b/extension/options.js#L621). See SOURCE_INDEX for exact discovered function lines; links are revision-pinned.

## Why the observed interactions felt connected

`simplePrimaryLocationField` assigns `defaultPrefix` then `scheduleSave`; `scheduleSave` cancels the prior timer and runs `saveProfiles` after **180ms**. Extra select/add/remove save immediately. Shared Nested callbacks save through a separate serialized model merge. The background storage listener rebuilds on profile/mode change. Thus normal selection did not require a second “Save menu” action. P1 executes actual historical dropdown/child/add/remove callbacks, waits 240ms and captures the resulting persisted model and actual historical builder descriptors. D1 independently repeats the primary debounce path.

Separate existing dropdown, typed creation input, explicit Create, child action, clear button and full path made destination ownership visible. Historical Nested columns explicitly distinguished existing selection/creation/actions; expanded children initiated readiness discovery. That is source-supported interaction structure. “Premium/intuitive” and preference for Legacy remain owner judgments; a screenshot cannot prove reliable routing.

## Actual native builder and listener

Old `buildMenus` removes all, collects callback promises (5s each), then emits `redown`, chosen layout and controls. Old Simple is flat and sorted by primary/option order; historical bucket fallback differs from current. Old Nested uses `nestedMenu` when present, otherwise `menuTree`; missing mode can infer Nested from old trees. It creates legacy tree parents and leaves, whereas current code refuses old trees as native authority.

Historical `addNestedLocations` attaches deep descendants to the first folder ancestor, concatenates deep path into titles, and offers Send here only at shallow levels. **P3** executes eight actual old/current levels: deepest old `nested:p:r:level8` has parent `nested:p:r:level1`; current parent is `nested:p:r:level7`. Same folder target does not mean equivalent visual ancestry. Do not restore flattening.

Old click listener freshly reads profiles but parses `simple-option`, `quick`, `nested` and `tree` in separate branches. Quick uses explicit `defaultPrefix` if present, otherwise category folder fallback; extra uses exact item prefix and prepared same-account bucket; Nested enumerates ready destinations and constructs a target bucket; tree traverses sanitized IDs and only acts on leaves. Then shared `ingestCloudflareAtPrefix` prepares Worker, fetches remote URL, checks returned folder and records history/notification.

**P4 uses the genuine old listener**, not current resolve as a stand-in: page/link/image/video select the same source/target as current for valid Simple state; a Simple ID can still transfer after switching to Nested. Current refuses that stale inactive action. P1/P3 `resolved` fields are explicitly current-resolver compatibility projections over old snapshots; P4 is the historical dispatch proof. No bytes/provider call occurs.

## Reliability limits and reuse ruling

Whole-profile `saveProfiles` can overwrite another window's menu/profile changes. Primary debounce offers no robust per-change save receipt/error UI. Old Nested merge preserves infrastructure but is not the current signature-checked single save lane. Concurrent Modern/Legacy writers existed at the historical pin. Old ready/discovery state, empty groups, missing buckets and deep paths were not universally reliable; bugs DBG-001/002 record narrower prior failures, not current closure.

Keep conceptual selection/Create separation, exact parent path, sibling order, invalidation and immediate feedback. Keep current shared `name/path/setLocation/destinations` semantics with fresh verification. Historical autosave, direct mode writer, whole profiles writer, native tree generator, old click branches and deep flattening **must never regain runtime authority**. Current Legacy preference adapter remains active for unrelated settings; dormant functions are evidence, not reconnectable hooks.

History verified: `16dad07d248d6f9be52392fdc9b4a067350dadbf` authority repair; `2018b6bd269fd79d4a9f14cdba6da1ac13d07df2` handoff; `45e1c7178d4732a7c9cbb6be4cbe575a3252ab19` shared hierarchy; compact restores `947b0cc9dcb4834848244660d5528bdc80fa7dd7` and `0c39d305777cd2daf7c854aa62b09405d0de781e`. Current tag is not the historical Legacy implementation.
