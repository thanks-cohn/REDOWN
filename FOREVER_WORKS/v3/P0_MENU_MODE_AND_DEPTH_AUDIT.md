# P0 menu mode and depth audit

30 October 2026, America/Chicago. **Audit only. No production changes.**

Audited source: `10bd512093e44f09d0b60676f89d1688c44b82ff`, branch `codex/v3-parity-first-reconstruction`. `V3-BEFORE-NARROW-DEPTH-RECONSTRUCTION` peels to exactly that commit. Protected tag objects/targets are captured in [tags-before.txt](menu-mode-depth-audit-evidence/tags-before.txt); no tag update is authorized. Earlier BASE-v3 and V3-MENU-MODES-BEFORE-HISTORY-REPAIR remain unchanged. The checkout was clean after clone completed.

## Executive findings

1. **Confirmed semantic mismatch, P0:** Narrow walks `parentId`, not cloud path segments. Independently added nested prefixes remain siblings. No native parent registration defect is needed to explain this. The editor's bucket + and cloud-folder + call `add(p)` / `add(p,null,path)`, yielding null parents; contextual child + supplies a parent. This is intentional current form behavior, not evidence that it lost a supplied parent.
2. **Confirmed discovery-root mismatch, P0:** Level's `roots()` chooses enabled top-level configured shortcuts and removes overlapping roots within a profile. If the broadest is `Images/Photography`, no request for bucket root is made. Siblings, other root folders, and intermediate Images are absent. Depth is relative to Photography. Current tests explicitly enforce that restricted policy. They prove the implementation's old contract, not the clarified requirement.
3. **Current state-switch foundation exists, original incident unresolved:** the current dispatcher handles the presentation message; optimistic UI restores acknowledged state on request error. The presentation implementation commit already handled the message while its fallback said Unknown request. A stale installed worker is plausible but unproved. The later fallback improvement is diagnostic recovery, not proof of the incident's root cause.
4. **Preserve Simple:** configured eligible records, flat, custom labels, exact destination IDs, saved array order. Do not infer paths or add bucket authorizations in this mode.
5. **Discovery is bounded and may be incomplete:** 500 inventory nodes including roots; 80 successful pages; 20 seconds traversal; 8 seconds per read race; 300 projected entries; five-minute TTL; maximum requested depth 10. These are REDOWN safeguards, not Chrome submenu guarantees.

The [reconstruction contract](P0_MENU_MODE_RECONSTRUCTION_CONTRACT.md) resolves the intended hierarchy, ordering, participation, counting, routing and partial-status policy. It is a proposal for the next implementation, not a claim these changes exist.

## Source and evidence

[Source index](menu-mode-depth-audit-evidence/source-index.json) pins hashes and line anchors for required production files and tests. Domain: `validate`, `eligible`, `narrowEntries`, `roots`, `inventoryKey`, `childPrefixes`, `discover`, `levelProjection`, `project`, `resolve`. Background: `listObjectsPage` (1413), transaction (2077), inventory refresh (2113), build/register (2159), alarm/storage hooks (2394), dispatcher (2784). UI: `savePresentation`, `add`, cloud +, form submission and storage listener. CSS/HTML inspected: progressive native controls and existing scoped tree, no cloud hierarchy logic in styling.

Read current V3 handoff, canonical destination contract, MENU_PRESENTATION_IMPLEMENTATION, Phase 3 UI_TO_WIRING_CONTRACT and WIRING_DIFF_AND_ROOT_CAUSES. Historical reports remain historical; this audit supersedes their proposed product semantics only where explicitly stated. Repository onboarding commands and Forever describe are captured alongside evidence. No accepted Forever intent model was rewritten.

Run from repository root:

```sh
node FOREVER_WORKS/v3/menu-mode-depth-audit-evidence/reproduce.mjs
node --test tests/right-click-v3.test.mjs tests/history-go-to.test.mjs
npm run reliability:check
```

The first command executes actual unchanged domain and actual REST adapter in isolated VM contexts with synthetic pages. [Raw projections](menu-mode-depth-audit-evidence/projections.json) contain full descriptors, identities, input stores and discovery calls. These are native **descriptor projections**, not observed Chrome menus. Focused suite: **54 pass, zero fail**. See [focused.log](menu-mode-depth-audit-evidence/focused.log). Whole-repository results are separately recorded in reliability.log; never infer a green full suite from focused success.

## Simple preservation contract

`project` validates the entire config, then filters `eligible`. Eligibility follows explicit parents, requiring every ancestor enabled and prepared. All qualifying records appear directly under REDOWN in saved array order, with trimmed custom labels, contexts link/image/video/audio/page, IDs `v3:ID`. Duplicate labels and duplicate targets remain distinct records. Maximum config size is 200, so the 300-entry cap cannot truncate a valid Simple store. No discovery, folder existence check or implicit ancestor action occurs.

`resolve` reprojects current saved state and rejects missing or nonselectable IDs; exact account/bucket/profile/prefix flows into existing ingestion. Custom titles never construct keys. Disabling an explicit parent hides enabled descendants in Simple too. A disabled natural ancestor with no explicit relationship does not hide independent records. Invalid or revoked records, even disabled ones, cause whole-store validation to fail, potentially preventing the entire new plan, not merely omitting that row. Prepared credentials are local readiness, not verified live rights.

`buildMenus` validates parent-first descriptors before removeAll, serializes rebuilds, awaits each create callback, checks runtime.lastError and clears partial creates on failure. A removeAll failure occurs before creates; create failure can leave no menu after cleanup. Saved preference/config can remain committed when native registration fails. Registration status must remain distinct from persistence. Stored vs actual native rendering cannot be verified here.

## Simple versus current Narrow, A–G

Each sequence below describes children under REDOWN. Indentation is expressed by parent relationships; exact descriptor IDs are in projections.json.

| Case | Simple projection | Current Narrow projection | Expected natural Narrow |
|---|---|---|---|
| A independent Photography, Portraits, Comics | photo, portrait, comic siblings | identical siblings | My Bucket / Images / photo / portrait; Comics sibling under bucket; photo has Save here |
| B x, x/y, x/y/z all null parents | a, b, c siblings | byte-equivalent projection | bucket / a / b / c, Save here at a and b |
| C explicit a → b → c | a, b, c siblings | a → b → c; a and b Save here | same chain with bucket heading and any skipped path segments filled |
| D Same labels at x and y | Same, Same, distinct IDs | Same, Same, distinct IDs | bucket / Same and Same, distinct x/y identities |
| E one/two/three only | a | a | bucket / one / two / a; only a saveable |
| F disabled x explicit parent of enabled x/y | empty | empty | empty; preserve explicit suppression before deriving hierarchy |
| G accounts a and b, same bucket/folder names | a, b siblings | a, b siblings | distinct canonical account/bucket groups, no merging by title |

Current `narrowEntries` filters children by exact parentId and registers them under the immediate descriptor parent. Branch adds `:send`, leaf uses `v3:ID`. `narrowResolve` rechecks branch shape. There is no path-derived trie. Validation ensures explicit parent strict prefix ancestry and same profile, prevents cycles/orphans and more than seven parent edges; it does not require adjacent real directories. Thus even explicit nesting can skip real intermediary folders. No evidence suggests CSS or Chrome flattened an otherwise nested descriptor in these fixtures.

## Level roots, traversal and projection

`roots()` considers only eligible parentId-null destinations, removes same-profile duplicate/contained roots, retains disjoint subfolder roots. No configured empty prefix means no bucket-root traversal. `inventoryKey` binds config revision, requested depth, roots' profile/account/bucket/prefix/worker URL. Credential changes invalidate inventory through the profile listener and full-profile post-discovery comparison; raw tokens are not in the key.

`discover()` seeds level-zero roots, breadth-first appends child prefixes and lists each parent below chosen depth. `levelProjection` filters against current authorized roots and fresh key, sorts profile/path, adds a nonwritable bucket heading for subfolder-only roots. It shows the last segment of a multi-segment root directly beneath that heading. Multiple equal basename roots are ambiguous visually but distinct IDs. Custom shortcut labels do not apply. Roots originating from configured shortcuts can be shown without remote existence proof, including after provider listing failure.

Concrete fixture: only Images/Photography configured, depth 2. Actual requests: Images/Photography/ and Images/Photography/Portraits/. Actual projection: My Bucket → Photography → Portraits, with Photography Save here. No Images ancestor, Comics sibling or Research branch. Intended bucket-wide depth 2 begins request prefix empty, includes Images at 1, Photography at 2, Comics and Research at 1; Portraits requires depth 3. Partial scoped discovery must never be described as complete bucket coverage.

## Actual R2 adapter and edge behavior

The adapter uses Cloudflare REST `/accounts/{account}/r2/buckets/{bucket}/objects`, per_page 1000 and delimiter `/`, not a Worker R2 binding. It accepts result arrays or result.objects, normalizes result_info.delimited, cursor and is_truncated. Actual adapter fixture output feeds actual discovery in reproduce.mjs.

| Input / condition | Current result / implication |
|---|---|
| REST result_info.delimited strings ending slash | Correct immediate child extraction; official REST example matches this shape |
| Direct plain object key | No folder fabricated |
| Nested object key / marker `日本/.redown`, `empty/` | First slash yields immediate folder; Unicode preserved, duplicates collapse |
| Prefix Images versus Images-extra | Slash boundary prevents cross-scope inclusion |
| Object-valued delimited entry or bare Images without slash | Silently ignored, may still report complete; fixtures show robustness gap for unsupported formats, not proof live REST returns them |
| Files-only page with cursor | Continues; existing test proves next folder page retained |
| truncated without cursor / repeated cursor | Incomplete warning, traversal stops that node |
| Permission error / parse error | Generic incomplete warning; provider private text not persisted |
| Timeout | Promise race stops further traversal; underlying request is not cancelled by the domain race |
| Empty logical folder without marker/object | Cannot be inferred from object storage; marked empty folders can be observed |
| Unsupported controls/backslash/dot/oversized folder | Throws on child parsing, entire page's child list discarded; incomplete warning |
| Cache expiry / wrong depth / changed root | Projection empty and resolver fails closed; native stale display may remain until scheduled rebuild |

No live authorized R2 access used. REST schema compatibility and synthetic extraction are established; actual user bucket pages, permission behavior and rendered native menus remain unverified. The adapter's optional RFIS observation writes local observations if enabled; fixtures leave it disabled, with no provider writes.

## Platform and scale

Official sources consulted 30 October 2026:

- [Chrome contextMenus reference](https://developer.chrome.com/docs/extensions/reference/api/contextMenus): parentId refers to previously added item; creation errors may arrive in callback. Its six-item ACTION_MENU_TOP_LEVEL_LIMIT applies to the extension action menu, not a general page submenu budget. The reference exposes onClicked, no submenu-opening/onShown network hook. Do not borrow Firefox menus hooks or promise synchronous fetch on native opening.
- [Cloudflare REST List Objects](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/list/): result_info carries string common prefixes, pagination cursor and truncation. This is the applicable schema.

Chrome does not document a universal 300-child/depth-10 limit here. REDOWN's safeguards limit cost and usability. A deep narrow chain may fit while a shallow broad tree exhausts entries. Branch costs two entries, leaf one; bucket headings also cost entries, root/status/control overhead is outside the domain cap. Current DFS truncation can consume most budget in early branches and omit other roots. Current discovery global budget similarly favors earlier roots. Parent + Save here is reserved atomically, preventing a branch without its action, but omitted children can leave a displayed branch containing only Save here. Warnings are global; no per-root completeness or resumable frontier exists.

Smallest practical next design: retain limits, pre-discover with fair root scheduling, persist per-root bounded cursors/frontiers and completeness, reserve headings/actions before adding children, show accurate partial status with setup refresh. Native full coverage cannot be promised for huge buckets. Persistent indexing, larger separately approved budgets, prioritized roots and optional explicit subfolder scopes are future optimizations. Existing Explorer remains the complete paged browser fallback. No unsupported menu-opening fetch.

## Earlier Nested rollback

Confirmed chain: radio onchange → optimistic `menuPresentation` → paint → `setRightClickV3Presentation` with acknowledged expected signature → exact Explorer sender gate → shared serialized queue → validated storage write → rebuild → current stored presentation receipt. Storage listener ignores presentation events while saving; rapid desired changes queue behind acknowledgements. Error catch restores `acknowledgedPresentation` and repaints, matching the observed visual rollback if the request rejected. Registration failure returns ok:true/menuUpdated:false and should retain saved mode.

At 906c049 the dispatcher already listed this message; generic fallback was Unknown request. At current HEAD fallback identifies unsupported type with UNSUPPORTED_REQUEST and recovery text. This disproves a simple assertion that the source implementation universally lacked a handler. No captured installed request payload/version/worker trace identifies what failed for the owner. Stale background, mismatched frontend, or another unsupported operation remain hypotheses. Worker startup import failure is not established and need not produce that exact response.

Coverage: sliced real transaction tests verify expected-state conflict, sender denial, persistence/restart; JSDOM tests rapid radio/depth changes and retained focus; real dispatcher fixture tests snapshot and unsupported request, **not the presentation operation end-to-end through dispatcher**. No combined real-dispatcher + UI rejection/reload/event-permutation test establishes incident closure. Ignored storage events during a save and lost acknowledgements warrant reconciliation tests. The next contract specifies them.

## Risks and remaining evidence

P0 product gaps: natural Narrow and selected-bucket Level scope. P1 reliability gaps: whole-store revocation blast radius, malformed provider shapes mistaken complete, starvation/partial frontier reporting, late/lost state acknowledgements, stale native items after TTL. P2 usability: identical account/bucket/folder titles, global generic warnings. They are audit findings or risks, not production fixes in this delivery.

All six final acceptance questions are answered by source explanation and the next implementation contract. This does not mean six live behaviors pass: installed Chrome, live cloud and original incident attribution remain explicitly open. Next agent must implement only after receiving implementation authorization, preserve Simple and protected tags, and use the contract without redesigning the editor.

### Full verification result

Fresh `npm run reliability:check`: **621 passing, 69 failed names, incomplete**, exit 1. Syntax, API registry and issue inventory passed; architecture freshness failed. [Comparison](menu-mode-depth-audit-evidence/regression-comparison.json) finds no additional failed names versus the prior History delivery's archived full run. The runner calls 63 failures new relative to its older internal baseline; that label does not mean this documentation audit introduced them. No production/test assertions or historical hashes were changed.
