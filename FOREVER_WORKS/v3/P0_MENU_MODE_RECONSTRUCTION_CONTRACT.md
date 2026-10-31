# P0 menu mode reconstruction contract

**Implementation-ready proposal; not implemented by this audit.** Source baseline `10bd512093e44f09d0b60676f89d1688c44b82ff`. Read [audit](P0_MENU_MODE_AND_DEPTH_AUDIT.md), [raw cases](menu-mode-depth-audit-evidence/projections.json) and existing canonical contract first. Owner's clarified mode requirements govern future implementation. Preserve historical reports and tag refs.

## Mode invariants

| Mode | Membership / hierarchy | Save authority / labels |
|---|---|---|
| Simple | Existing eligible configured records, flat saved array order | Existing exact IDs/targets/custom labels; unchanged |
| Nested/Narrow | Same eligible configured records, exact natural path trie under canonical buckets | Only configured records saveable; synthetic ancestors navigational only; custom labels retained |
| Nested/Level | Actual folder inventory beneath explicitly participating authorized bucket roots | Bucket root and observed in-scope folders saveable; real cloud names; depth from bucket root |

No mode changes destinations, transfer logic, storage folders, engine selection, Legacy mode, public URL settings, Explorer or History. Simple/Narrow never enumerate cloud folders. Display labels never identify a target. Current explicit disabled-ancestor suppression is evaluated **before** building Narrow; no inferred disabled ancestor relationship is created.

## Natural ancestry algorithm, deterministic reconciliation

1. Validate canonical records and compute existing eligibility first. Preserve existing Simple validation behavior. Handle revoked participating scopes independently in Level so one unavailable bucket cannot authorize fallback. Do not silently broaden existing config validation in this change.
2. Partition eligible records by exact `(profileId, accountId, bucketName)`. No merging by label/account display name. Group bucket headings by that identity. For colliding bucket titles show account display name (account ID fallback) and, if still ambiguous, stable profile ID as a display suffix. Targets remain unchanged.
3. Split exact canonical prefix on `/`. Empty prefix maps to the bucket node. Build an in-memory trie of every segment from bucket root to configured target. Do not trim, case-fold, decode URI, Unicode-normalize or reconstruct from menu labels. Existing validation remains the exact path gate. No provider reads.
4. Reconcile parentId as a **required ancestor constraint**, not necessarily direct menu parent. Valid explicit parent must be strict same-profile path ancestor. Insert any missing segments between them. More-specific natural ancestors, configured or synthetic, become immediate menu parents. Thus explicit x → x/y/z becomes x → y → z. If x/y is independently configured, it occupies y. Preserve x as an ancestor and all its inclusion/disable semantics. Invalid/cross-scope/cyclic relationships reject with existing repair guidance, never rewrite storage or guess. This deterministic interpretation preserves every valid stored parent relationship transitively while expressing real directories. Report inserted intermediate hierarchy as derived presentation, not a saved editor move.
5. At one path with one eligible configured record, use its trimmed custom label on that trie node. At an unconfigured node use exact segment, bucket title at root. Multiple configured records at the identical path must remain separate shortcuts: use real folder segment as navigational node and one custom-labelled action per configured ID inside it, in array order. Do not merge IDs, silently drop labels or choose an arbitrary winner. An empty-prefix record uses its custom label as an action inside the true bucket heading. This deliberately keeps bucket identity visible and avoids relabelling the bucket to a shortcut name.
6. Order bucket groups and sibling trie nodes by minimum original array index among their eligible descendant records; exact prefix/identity as deterministic ties. Duplicate actions at one path use original array index. Explicit sibling ordering is retained where compatible with natural ancestry. Moving a branch ahead of another cannot violate parent-first rendering. Never sort by label. Simple remains exact global array order.
7. IDs: preserve configured leaf `v3:ID` and branch action `v3:ID:send` where their roles permit. Synthetic trie headings use an unambiguous namespace `v3:path:` plus encoded canonical identity tuple and exact prefix (encode the JSON tuple, not concatenated unescaped fields). Bucket headings use the same identity scheme. Duplicate same-path record actions retain configured IDs and are not trie headings. Maintain an ephemeral action map `{id -> configuredId,target}`; rebuild it from current store, never trust a title or stale menu payload.
8. Every configured node with displayed children has explicit Save here mapped to its exact configured ID/prefix. Synthetic headings have no Save here. Leaf configured nodes are direct save actions. Duplicate same-path actions use each custom label, not repeated indistinguishable Save here titles. At any node, reserve configured action(s) before children; omit a whole structural unit when budget cannot fit it. Warn if configured records are omitted by new hierarchy overhead.

Explicit parents remain editor relationships; this run does not replace the editor with the derived menu trie. Keep folder outline, tabs, labels, red deletion, focus and existing form interactions. A small explanatory preview/status may clarify derived hierarchy; no new destination editor.

## Exact proposed Narrow examples

Configured Photography at Images/Photography, Portraits at Images/Photography/Portraits, Comics at Comics, all parentId null:

| Native item | Parent | Save target |
|---|---|---|
| My Bucket | REDOWN | none |
| Images | My Bucket | none |
| Photography | Images | none, submenu |
| Save here | Photography | exact configured Images/Photography |
| Portraits | Photography | exact configured Images/Photography/Portraits |
| Comics | My Bucket | exact configured Comics |

Only one deep target one/two/three: bucket → one → two → custom label; one and two are headings, no Save here. Two Same labels at x and y stay separate children with separate IDs and prefixes. Disabled explicit parent with enabled child produces neither; independent enabled shortcut beneath a disabled prefix but without parentId remains eligible under current rules.

## Bucket participation and authorization

Smallest safe additive authority: separate local key `rightClickV3LevelScopes = {version:1, revision:0, buckets:[]}`. Each entry `{id,profileId,accountId,bucketName,enabled}` uses stable scope ID. Explicit opt-in in existing Level controls selects among prepared profiles returned by the existing sender-gated snapshot. Selection text must state that it exposes the bucket root and all discoverable folders as save destinations, subject to depth/bounds. Unchecking revokes participation and immediately invalidates old action IDs. No automatic opt-in from credentials, connected accounts or nested shortcut paths.

Initial missing key means no participating buckets, including upgrades. Existing legacy scoped inventory is never reused as bucket-wide. Show Select buckets in Level; leave configured shortcuts and Simple/Narrow untouched. Do not repurpose empty-prefix configured destinations as hidden authorization toggles. This additional small authority record avoids changing the canonical destination schema or automatically widening old subfolder scope.

Background owns scope validation and a new exact-Explorer-sender transaction `setRightClickV3LevelScopes`, sharing the existing serialized persistence lane. Compare expected scope revision; validate exact profile/account/bucket and readiness, unique scope IDs and tuples, bound bucket count to 200 (existing config scale). Deduplicate one bucket per prepared profile/account/bucket tuple. No credential values returned. Profile removal or identity mismatch marks scope unavailable and nonselectable without rewriting destination records. No provisioning, bucket creation or public access changes. Prepared profile is only local readiness; listing/write authorization can still fail remotely.

Bucket-wide root is always prefix empty, level zero. Every included folder and root is authorized for existing save operation by explicit bucket opt-in, not by discovery alone. Provider rights remain authoritative. Do not use this opt-in as permission for other accounts, scopes or APIs. If future subfolder-only traversal is needed, add explicitly labelled scope kind/prefix with separate authorization; it is out of the smallest bucket-only implementation. Never relabel old configured subfolder discovery as bucket-wide.

## Depth, inventory, refresh and completeness

Depth D in {1..10} lists root and nodes at levels less than D; nodes at D are shown but not listed. Root is 0, Images 1, Photography 2, Portraits 3, Weddings 4. Fixtures must prove D 1,2,3,5,10 with a chain at least 11 deep and unconfigured siblings. Empty root is allowed as save target even for an empty bucket once explicitly opted in. Logical empty directories require marker evidence; do not manufacture cloud folders.

Retain exact REST `listObjectsPage(...,prefixWithSlash,cursor,'/')` adapter, no Worker deployment. Normalize only the documented REST shape; malformed delimited field/type, invalid object shape or impossible cursor state must produce incomplete/error, never silently claim full coverage. Accept string common prefixes, reject unsupported shapes with redacted status. Preserve exact Unicode and similar-prefix boundary checks. Do not import Workers `delimitedPrefixes` semantics into the REST consumer without an explicit adapter/test change.

Keep initial safeguards: 500 nodes total including roots, 80 page reads per run, 20-second run budget, maximum 8-second read deadline, 300 native domain entries, TTL five minutes, depth cap 10. Count all attempted requests against budget, not only successful ones. Abort transport where existing client safely supports it; otherwise stop further calls after timeout and reject late results. No mutation retry implied by listing failure.

Use versioned inventory v2 keyed by scope revision/identities, requested depth, provider/adapter version and per-profile non-secret authorization generation. Do not store token in inventory. Profiles change, scope change, relevant folder mutations and adapter change invalidate affected roots. Config custom-label/order edits do not need new cloud reads. Persist per-root observation time, completeThroughDepth, frontier with exact cursor, per-node listing status, pages attempted/succeeded, reason codes, omitted counts where known and unknown-remaining flag. Do not infer zero omitted folders from absence of counts.

Fair breadth-first round-robin roots; first reserve root nodes for eligible scopes within inventory bounds, then schedule one page per root/frontier turn. A single broad bucket must not consume all pages before other roots receive a turn. Prioritize shallow coverage before deep discovery. Resume bounded persisted frontier on explicit Refresh or scheduled maintenance, validating key/generation and cursor; if provider cursor is expired, restart that root and mark prior snapshot stale. Avoid endless automatic immediate retries for permanent permission errors; next manual refresh or existing five-minute maintenance may retry.

Publish observations only if same engine/mode, requested depth, scope revision and authorization generation still apply. Keep single-flight and superseded-result guards. A switch to Simple during a read must not publish Level menu state. Partial inventory can present observed valid folders but status must say incomplete. Freshness is not completeness. Expired snapshots cannot resolve save IDs until refreshed; menu update should proactively reflect this at maintenance. Native menu is a bounded view, existing Explorer is the full paginated navigation fallback.

## Level native projection and routing

Use real bucket/folder names. Namespace scope IDs plus exact encoded tuple/prefix; no labels in identity. Root headings appear before descendants, and each authorized parent with shown children gets Save here before children. At requested-depth boundary a folder is a direct action even if unseen deeper children exist. Its target is that exact prefix, never parent prefix or inferred default category. A branch without children due to truncation can retain Save here and a partial indicator, not pretend a complete listing.

First reserve each scope's bucket heading/root action, then assign remaining native capacity fairly across breadth-first folders while emitting parent-first descriptors. Count headings, actions and partial markers; retain room for shared root/status/manage controls outside the 300-domain cap. No orphan IDs or branch action omission. Show global disabled native summary and per-bucket partial status where applicable; full reason/detail appears in existing Setup status. Include requested depth, observation age, roots checked/total, known nodes, budget reason and refresh/manage route. No fake numerical percentage when denominator unknown.

Example depth 2 inventory Images/Photography/Portraits and Comics/Manga: REDOWN → bucket submenu, Save here (empty prefix), Images submenu with Save here (Images) and Photography direct action (Images/Photography); Comics submenu with Save here (Comics) and Manga direct action (Comics/Manga). Portraits is absent at depth 2. At depth 3 Photography becomes submenu with Save here plus Portraits. Bucket opt-out, revoked profile, stale inventory or unregistered/omitted item resolves null with recovery feedback and no fallback write.

`resolve` must rebuild current permitted projection/action map and reject headings, stale/old-mode actions, wrong scope generations and omitted actions. Before network transfer pass unchanged `{profile,owner,prefix}` into existing listener/ingest. Parent-first ancestry, not historical Legacy flattened parent strings, governs native registration. Registration remains callback-acknowledged, serialized, clean-on-failure; saved preferences must survive registration failure with failed status.

## State stability and Unknown request regression contract

Retain independent presentation preference, expected acknowledged signature, shared transaction lane, requested versus acknowledged UI states, serialized rapid changes, hidden Level/depth retention and no tree remount. Recognize unsupported request explicitly with reload guidance; do not silently write fallback Simple. If request result is unknown/lost after persistence, show Outcome unknown and reconcile via fresh snapshot before retry; do not assume no write. On error, distinguish confirmed rejection from unknown outcome. On concurrent-window conflict preserve desired preference as a retryable draft and reload actual saved state. Suppressed storage events during local save must be reconciled with snapshot after pending edits finish, including another window's later commit. Registration failure is not preference rejection.

Add a combined harness using actual dispatcher, actual transaction and real UI controller. Assert `setRightClickV3Presentation` is dispatched, sender gate rejects foreign pages, stale expected signature rejects without write, and a successful Nested ack remains selected across restart. Inject literal historical Unknown request, current UNSUPPORTED_REQUEST, undefined response, 30-second timeout, lost ack after write, late storage event and rapid switch/restart. Verify error is visible and persisted state is reconciled without false success or silent downgrade. These tests prevent known mechanisms; they do not establish the original installed incident's cause.

## Change map and preservation

| File/functions | Required future change |
|---|---|
| extension/right-click-v3.js: narrowEntries / narrowResolve | Natural trie + configured-only action map; preserve Simple branch and eligibility semantics |
| roots / inventoryKey / discover / levelProjection / resolve | Explicit Level scope roots, depth-zero bucket policy, v2 completeness/frontier, fair bounded projection, exact current action validation |
| extension/background.js: v3MenuTransaction / snapshot / refreshV3Inventory | Scope transaction/snapshot, key invalidation, reconciliation, no stale publication |
| background menu registration / listeners | Preserve queue/callback safety; add scopes/authorization generations to invalidation and status, maintain Level-only scheduling |
| extension/beta/right-click-v3-ui.js + existing header HTML/CSS | Minimal participation controls/status and state reconciliation; preserve tree/form/outline/tabs/styles elsewhere |
| tests/right-click-v3.test.mjs + targeted integration fixture | Keep Simple golden expectations; replace old scoped-Level product assertions with explicit bucket policy, retain subfolder negative fixture |

Preserve transfer listener, ingestion, conflict policy, receipt/History GO TO, public URL behavior, Cloudflare client/provider write APIs, manifests/permissions, Legacy engine, protected tags and frozen Forever evidence. No new dependency or alternate folder editor is needed. Leave global revoked-destination validation redesign to separately scoped reliability work; classify its existing effect in tests rather than silently changing Simple.

## Regression and acceptance matrix

| Requirement | Unit evidence required | Integration evidence required | Installed Chrome / live cloud gate |
|---|---|---|---|
| Simple preservation | Exact golden IDs/order/titles/targets, duplicate IDs/labels, enabled ancestors | Save/rebuild/click through actual dispatcher | Observe native menu and exact save receipt |
| Natural Narrow A–G | Full trie and action maps; skipped ancestors; same-path duplicates; x vs x-extra; multiple accounts | Existing editor creates null-parent entries, natural menu appears without editor rebuild | Native submenus/keyboard, only configured targets save |
| Level participation | Missing store none; opt-in exact identity; opt-out/revoke invalid IDs | Scope revision conflicts, no unrelated list calls, no provisioning calls | Select one authorized bucket; verify no others exposed |
| Depth 1,2,3,5,10 | Eleven-level chain plus broad unconfigured siblings, root 0 | Actual REST adapter recorded synthetic wire pages | Known disposable real hierarchy and unconfigured siblings |
| Save here / exact routing | Parent, leaf, boundary, duplicates, empty root, no headings resolve | Native descriptor IDs to existing resolver and ingest stub; Keep Both exact receipt | Save to parent and leaf, verify final object/key through existing Explorer |
| Pagination / malformed / marker / Unicode | Empty pages, repeated/missing cursor, truncated, marker/no marker, unsupported path | Actual cfFetch adapter schema fixtures and provider errors | Real paginated R2 bucket and expired permissions |
| Bounds and partial | 500 nodes, 80 attempts, 20s/8s, 300 entries; atomic branches; fair roots | Late response, stale cache, resume frontier, auth invalidation | Responsiveness and truthful incomplete feedback at large hierarchy |
| State stability | Signature/serialization; retained hidden values | Actual UI → dispatcher → storage → receipt, faults above; restart/rapid events | Two windows, real MV3 restart, extension reload, no unsupported rollback |
| Registration failures | Plan no orphans/collisions | removeAll/create/timeout injection, persisted settings survive | Native callback/platform failure recovery where reproducible |

Existing local evidence: 54 focused tests pass plus new audit projections; no future trie/scope algorithm tests have been implemented. No installed Chrome or live-cloud result is claimed. Full reliability result is retained separately, including baseline debt. Future implementation must run focused tests and reliability check, compare failed names to this baseline without weakening assertions, and record actual browser/cloud gates separately.

## Next Work conversation handoff

Work on mandatory branch; read AGENTS then audit and this contract. Verify protected tag and latest HEAD (audit documentation may be newer than source baseline). Implement only when authorized. First lock Simple golden projections. Implement/test Natural Narrow, then scope store + actual bucket traversal, then partial-state and mode reconciliation. Commit in reviewable steps; never move protected tags. No interface reconstruction, cloud mutation or extension permissions expansion is authorized by this audit itself.

Completion means: A–G expected projections pass, only configured Narrow targets save, explicit bucket Level reaches real siblings through requested depth or declares partial coverage, all stale/revoked IDs fail closed, parent Save here is exact, Simple is unchanged, current presentation dispatch is tested end-to-end, original incident attribution remains honest, and browser/cloud acceptance is explicitly recorded rather than inferred.
