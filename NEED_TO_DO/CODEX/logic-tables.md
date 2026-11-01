# REDOWN V3 — RIGHT-CLICK LOGIC TABLES AND PROOF OBLIGATIONS

**Date:** 2026-11-01  
**Repository:** thanks-cohn/REDOWN  
**Required branch:** `codex/v3-parity-first-reconstruction`  
**Status:** NORMATIVE SPECIFICATION, NOT COMPLETED CODE OR VERIFIED CHROME BEHAVIOR  
**Companion:** [Explanation.md](Explanation.md)  
**Issue register:** [November 1 NEED TO DO](../11012026.md)  
**Existing P0 handoff:** [CURRENT-first native menu architecture](../../docs/CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md)

## 0. Precedence and meaning

This document states the latest owner-approved right-click semantics and supersedes contradictory older examples in `NEED_TO_DO/fundamentals.md`, `NEED_TO_DO/10312026.md` and the prior handoff **only on the corrected Home ordering and provider-wide Home convention**. In particular, the old “REDOWN default bucket FIRST” instruction is REVOKED. Preserve all unrelated commitments: Simple and Nested/Narrow/Depth, CURRENT-first durability, independent cloud records, crash recovery, default privacy, and working V3 APIs. Codex must reconcile older files during implementation.

A **provider connection** P includes exact provider kind, connection ID, endpoint/account/tenant and authorization scope. A **target** T includes P, native container ID and native folder ID or exact prefix. Labels never grant access or determine routing. `Home(P)` means **save the clicked web object to P's verified default target**; it is not the existing REDOWN application's `redown-go-home` navigation action.

### Symbols

| Symbol | Definition |
|---|---|
| P, Q | Two distinct provider/connection identities, even if they share the same cloud product |
| D(P) | One verified, authorized and unambiguous default writable target in P; otherwise null |
| E(P) | Ordered eligible non-default Simple destination actions in P (configured shortcuts and eligible participating bucket roots) |
| S(P) | Enabled and explicitly configured eligible Narrow destinations in P |
| Anc(S) | Natural bucket/container roots and exact structural path ancestors needed to reach S |
| K(P) | All durable known nodes for P in CURRENT, subject to status/authorization |
| Part(P) | Explicitly participating containers for Nested/Depth; separate from Narrow shortcuts |
| Depth(P,d) | Eligible known/discovered nodes inside Part(P) at bucket-relative level ≤ d, d=1..10 |
| H(P) | Last submenu child “Home”, exact action route to D(P), only when D(P) is verified |
| R | Pure derived native menu plan with stable IDs, types, ordered parents and exact action mapping |
| desired/applied | Latest committed desired projection generation / Chrome-acknowledged generation |
| CURRENT | Latest committed mutable working graph pointer, not a discovery cache |
| BACKUP/WORKING | Immutable dated period anchor / mutable dated working version |
| JSONL | Append-only log of verified semantic mutations with provider-specific identities |

**Eligible(T)** requires an actual implemented, authorized adapter and verified exact target. Stored historical records are allowed to remain when authorization expires, but actionable native save routes must fail closed.

## 1. Twenty mandatory invariants

| ID | Property that must always hold | Reject if... |
|---|---|---|
| I01 | Menu modes are **Simple** OR **Nested**. Nested has **Narrow** OR **Depth 1–10**. Keep internal `nested:'level'` compatibility for Depth. | Three top-level modes appear. |
| I02 | Every provider appears directly under REDOWN; its own contents stay below it. | Bucket, folder or destination appears as a peer of Cloudflare. |
| I03 | In Simple, D(P) verified and E(P)=∅ ⇒ P is a clickable leaf that directly SAVES to D(P). | P launches Explorer/Home/setup without need. |
| I04 | In Simple, E(P) nonempty ⇒ P is a NON-actionable parent; extras ordered first, one native separator, then H(P) LAST if verified. | Default called “REDOWN” appears first; parent itself saves; separator follows Home. |
| I05 | Leaf→submenu→leaf preserves the exact default canonical target D(P) and save semantics. | Home opens Explorer, saves to selected Explorer bucket, changes account. |
| I06 | Expansion of P is determined only by P's own extras, not by additional provider Q. | Connecting Google Drive expands Cloudflare. |
| I07 | Narrow renders **S(P) ∪ Anc(S(P))**, not the whole bucket or Depth inventory. | Checking a bucket displays all cloud folders. |
| I08 | Multiple Narrow buckets remain distinct container branches; account collision is disambiguated. | A folder from bucket A appears under B. |
| I09 | Narrow leaf action is backed by an explicitly configured eligible target; structural ancestors are not implicitly save actions. | Unselected ancestor is an actionable save. |
| I10 | If a configured save destination has child branches, retain its exact action as a separate `Save here` child. | Parent with children falsely acts as direct save. |
| I11 | Depth renders real authorized known/discovered nodes in participating containers, up to numeric 1–10. Provider heading does NOT count toward depth. | User Menu Labels masquerade as real folder names; off-by-one depth. |
| I12 | Mode/Depth/edit view changes **never delete known CURRENT nodes** merely by projecting fewer rows. | Depth 5→3→5 loses level-5 nodes. |
| I13 | Actionable native menu IDs resolve to exactly one canonical, currently authorized provider + account + container + location. | Route inferred from label, selected Explorer bucket, or stale plan. |
| I14 | Provider Home is a save, REDOWN dashboard Go Home is navigation. They have different IDs, handlers and tests. | Clicking one invokes the other. |
| I15 | Incomplete scan, TTL expiry, OAuth failure or limited Chrome menu capacity is NOT proof of folder deletion. | Bucket 2 times out and bucket 1 disappears. |
| I16 | Confirmed edits update CURRENT + matching JSONL/checkpoint atomically **locally**, then reconcile native Chrome registration separately. | Claims that IndexedDB + Chrome menu APIs share one atomic transaction. |
| I17 | Provider-specific CURRENT/WORKING/BACKUP/JSON/JSONL/checkpoints/auth/native routes have collision-proof identities. | Two clouds with bucket `photos` merge or authorize each other. |
| I18 | Beyond native menu limits, provide an authorized full-tree chooser; keep underlying CURRENT complete. Reserve space for Home. | Menu overflow silently discards known folder nodes or Home. |
| I19 | Actual deletion of extension-origin storage/profile destroys local copies: guarantee recovery **only if an independent user-authorized backup has been verified**. | Local cache or IndexedDB alone advertised as uninstall-proof. |
| I20 | Existing Shelf, History GO TO, Explorer, upload/transfer safety and private-by-default behavior remain working. | A right-click fix damages unrelated flows. |

## 2. SIMPLE: complete state and transition tables

All logic applies **per provider connection** P, independently of the presence of Q.

| State | D(P) | \|E(P)\| | Exact Chrome representation | On click |
|---|---|---:|---|---|
| S0 | Missing/unverified | 0 | Non-save Setup/Manage as appropriate | Configure; **zero remote saves** |
| S1 | Verified | 0 | `REDOWN → Provider` as single clickable leaf | Save to D(P) |
| S2 | Verified | 1 | `Provider → E1, separator, Home` | E1 saves to E1; Home saves D(P) |
| S3 | Verified | 2+ | `Provider → E1…En, separator, Home` | Each exact route; Home LAST |
| S4 | Missing/unverified | ≥1 | Eligible extras only; optional Setup/Choose default; **no false Home** | Only exact eligible actions save |
| S5 | Revoked/expired | any | Routes suppressed/disabled or safely fail closed | Never fall back to different identity |
| S6 | Verified | 0; unrelated provider has many routes | Identical to S1 | Connecting Q does not affect P |
| S7 | Verified | More extras than native capacity | Bounded extras + Browse more BEFORE separator + Home | Chooser reaches omitted extras |
| S8 | Several accounts with ambiguous default | any | Require explicit default binding; keep eligible account-qualified extras | Never infer account from Explorer |
| S9 | Configured shortcut named Home | ≥1 | Projection-only disambiguation for custom label; synthetic Home remains last | Distinct stable IDs and targets |

| Transition | Before → After | Mandatory preservation |
|---|---|---|
| Verify unique default | S0 → S1 | Existing records; exact account |
| Add first eligible extra | S1 → S2 | Original D(P) moves to synthetic Home unchanged |
| Add more extras | S2 → S3 | Deterministic order and stable route IDs |
| Disable/remove last extra | S2 → S1 | Restores direct provider save, no separator |
| Connect unrelated Q | S1 → S1 | Byte-equivalent P route projection modulo unrelated global ordering |
| Authorization expires | S3 → S5 | Preserve historical graph but deny writes |
| Chrome loses native rows | Any → rebuilding | CURRENT remains authoritative; applied generation lags desired |
| Delete extension data | Any → locally unknown | External verified backup required for reconstruction |

### Golden native Chrome Simple examples

```text
Case S1:
REDOWN
└── Cloudflare [click = remote save to verified account A / bucket "redown" / prefix ""]

Case S3:
REDOWN
└── Cloudflare
    ├── Photography [configured exact target]
    ├── Work        [configured exact target]
    ├── More destinations… [only if menu capacity requires]
    ├── ──────────  [actual type:"separator" under Cloudflare]
    └── Home        [LAST = exact original default "redown" bucket root]

Future capable providers:
REDOWN
├── Cloudflare     [keeps leaf if it has no own extra destinations]
├── Google Drive   [adapter-native default/folder IDs]
└── Dropbox        [adapter-native default/folder IDs]
```

**No separate Buckets intermediate in Simple.** “Home” is ALWAYS the default provider **save destination** when an expanded provider has a valid default, not a REDOWN dashboard shortcut.

## 3. NESTED / NARROW: multiple buckets truth table

Narrow is **configured-path-driven**. Bucket selection is an organizational scope/eligibility filter, not permission to browse every unconfigured folder. The actual existing `levelScopes` participation controls are for Depth/Level; a checkmark in the Depth selector must not cause a Narrow branch by itself.

| Container | Explicit eligible Narrow endpoints | Real unselected folders also exist | Expected Narrow projection |
|---|---|---|---|
| R2 `redown` | `photography/portraits/Best Portraits`, `photography/street/Street Selects` | Yes | redown → photography → portraits/Best Portraits, street/Street Selects |
| R2 `works` | `clients/acme/Deliverables`, `portfolio/web/Launch Assets` | Yes | works → clients → acme/Deliverables; portfolio → web/Launch Assets |
| R2 `archive` | `2025/photos/Favorites` | Yes | archive → 2025 → photos → Favorites |
| R2 `screenshots` | None, only Depth-enabled | Yes | **No Narrow row** unless root explicitly configured |
| R2 `backups` | Explicitly configured bucket-root save | Yes | Actionable bucket-root target, or branch with `Save here` where required |
| R2 `works` | A folder and its descendant both configured as save targets | Yes | Parent submenu + `Save here` + child branch; two separate exact destinations |
| Two accounts: `works/clients` | Configured target in each | Yes | Two provider/account-qualified branches; never merge |

### Golden multi-bucket Narrow menu

```text
REDOWN
└── Cloudflare
    ├── redown
    │   └── photography
    │       ├── portraits
    │       │   └── Best Portraits [save exact configured target]
    │       └── street
    │           └── Street Selects [save exact configured target]
    ├── works
    │   ├── clients
    │   │   └── acme
    │   │       └── Deliverables [save exact configured target]
    │   └── portfolio
    │       └── web
    │           └── Launch Assets [save exact configured target]
    ├── archive
    │   └── 2025
    │       └── photos
    │           └── Favorites [save exact configured target]
    ├── ───────────── [native separator]
    └── Home [default verified Cloudflare root save]
```

**Natural ancestors** use actual path segments; configured endpoints may display the user's own Menu Labels. For any path with an exact configured destination and child branches, Chrome's parent is navigational; add separate `Save here` action. In Narrow, nothing from a background folder scan becomes an extra leaf unless explicitly configured.

**Narrow projection algorithm:**

```text
selected = eligible explicitly configured endpoints of exact provider P
group by (provider kind, connection, account/endpoint, container native ID)
for each selected endpoint:
  insert container root and each required natural ancestor
  record endpoint as exact save route, with configured display label
emit bucket groups and structural ancestors in deterministic order
if endpoint has children: emit separate child "Save here" to retain action
do not add unrelated inventory descendants
if provider parent expanded and D(P) verified:
  append native separator, then Home LAST
reserve overflow Browse more before separator; never delete selected metadata
```

### Narrow special cases

| Condition | Required behavior |
|---|---|
| Zero configured endpoints, D(P) verified | Expose a reachable direct provider default save, rather than empty fake tree |
| Unverified default, configured other endpoints | Show only eligible exact endpoints; no fake Home |
| Same human-readable bucket name in separate accounts | Qualified distinct branches or provider-connection headers |
| Duplicate custom labels | Show distinguishing suffix, never rewrite stored label or target |
| A configured folder is also a structural ancestor | Navigational parent + separate `Save here` direct-save action |
| A configured bucket-root also contains configured child | Parent container plus `Save here`, then child hierarchy |
| An unselected sibling folder exists remotely | Do not display it (unless necessary as a structural ancestor) |

## 4. NESTED / DEPTH: separate mode with real directories

| Attribute | Simple | Nested/Narrow | Nested/Depth |
|---|---|---|---|
| Selection basis | Default and eligible explicit flat extras | Explicit configured endpoint paths + ancestors only | Real known authorized folders in participating containers |
| Structure | Flat siblings under provider | Provider → bucket → natural path trie | Provider → bucket → actual folder hierarchy |
| User Menu Labels | For configured destinations | Only configured endpoints | Real provider directory/bucket names |
| Unconfigured folder can appear | No, except eligible bucket-root extra | Only as required ancestor, not arbitrary save leaf | Yes, if known, authorized, within d |
| Folder discovery needed on context-menu open | NO | NO | NO — pre-register from CURRENT |
| Depth control | Not applicable | Not applicable | d = integer 1…10 |
| Provider heading counts as folder level | No | No | NO |
| Multiple containers | Flat configured choices | Distinct selected-path bucket branches | Distinct participating bucket roots |
| Changing mode/depth may delete CURRENT nodes | NEVER | NEVER | NEVER |
| Provider Home with valid default | Last if expanded | Last after separator | Last after separator |
| Too many items | Browse more, preserve CURRENT | Browse more, preserve CURRENT | Browse more, preserve CURRENT |

Bucket roots are depth level 0; first folder below a bucket is level 1. Depth 2 means root, immediate children and grandchildren, using existing bucket-relative semantics. Depth 5→3→5 must restore already known authorized depth-5 paths immediately in native menu or authenticated full chooser, without a forced full scan. A failed scan never deletes untouched directories. Providers that cannot list child folders cannot pretend to implement Depth; actual Drive folder IDs are not S3 prefixes.

## 5. Native node kinds and routing state

| Native kind | Submenu? | Can save? | Exact result |
|---|---|---|---|
| Provider leaf with valid D(P) | No | Yes | Save D(P) |
| Provider submenu | Yes | No | Navigation only |
| Structural bucket/folder with children | Yes | No | Navigation only |
| Configured endpoint leaf | No | Yes | Save its exact canonical target |
| Configured ancestor with children | Yes | No | Separate `Save here` child saves ancestor |
| Provider Home | No | Yes if verified | Save exact D(P), NOT Explorer dashboard |
| Separator | No | No | Nothing |
| Browse more | No | No direct save | Authorized searchable chooser |
| Setup/Manage | No | No | Appropriate configuration |
| REDOWN Go Home | No | No remote save | REDOWN Explorer dashboard |

Each click dispatches **exactly one** action of {save, chooser, setup, dashboard, noAction/failClosed}. There must be **at most one** transfer initiated per menu click. Click-time resolution uses latest committed CURRENT and rechecks exact provider capabilities/authorization; it may NOT derive bucket or target from visible label or current Explorer selection.

Current source audit candidates: `extension/right-click-v3.js` (`simpleTargets`, `simpleProjection`, `narrowEntries`, `levelProjection`, `project`, `resolve`); `extension/background.js` (`buildMenus`, `addMenuControls`, `chrome.contextMenus.onClicked`, `resolveActiveRightClick`, `launchSaveDroplet`). Investigate possible duplicate handler side effects by test; do not assert they are proven bugs without reproduction.

## 6. Ten logic proofs and counterexamples

### P01 — Provider independence
Assume every record/action/event keyed by P and global presentation unchanged. Changing Q only mutates Q's namespace. P's projection reads only P. Thus `Project(P, afterChangeToQ) = Project(P, beforeChangeToQ)`, modulo unrelated global layout ordering. **Reject:** connecting Google Drive creates Cloudflare's submenu.

### P02 — Narrow soundness
The only Narrow save leaves constructed from paths are elements of S(P); structural Anc(S) are navigational, not saves, unless separately configured. Therefore every Narrow save leaf resolves to exactly one configured authorized destination (plus synthetic Home when verified). **Reject:** a Depth bucket checkbox exposes all its folders in Narrow.

### P03 — Narrow completeness, modulo Chrome native limits
Each configured eligible target d inserts its bucket/root and every ancestor into a trie, then its endpoint. By induction over its path segments, a route from provider to d exists. If Chrome cannot fit d, d remains in CURRENT and is reachable through the authorized Browse more chooser. **Reject:** bucket A uses all 300 rows and makes bucket B's curated target inaccessible.

### P04 — Home conservation under transition
Let T0 = D(P). In Simple S1 provider leaf routes to T0. When first extra appears, provider becomes parent and H(P) routes to T0. When last extra disappears, remove H(P) and restore direct provider→T0. The **default remote destination is invariant** through every transition. **Reject:** Home opens `beta/explorer.html`, or saves to whichever Explorer bucket was last selected.

### P05 — Depth and mode non-destructiveness
Mode/Depth changes only presentation predicate, not stored graph. Hence `Graph(CURRENT_after) = Graph(CURRENT_before)` aside from separately stored display preference. A 5→3→5 sequence cannot destroy level-5 nodes. **Reject:** smaller Depth clears deep database records.

### P06 — Incomplete scan cannot prove deletion
For persisted graph G and verified additions Δ+, an incomplete scan can yield G' = G ∪ Δ+ and verification metadata; it cannot justify Δ−. Removal requires explicit confirmed mutation or a truly complete and authoritative authorized scope observation of absence. **Reject:** OAuth timeout deletes older records or paths in another bucket.

### P07 — Route isolation and label independence
Canonical route includes providerKind, connectionId, account/endpoint, container ID and exact folder identity. Labels are not keys. Thus equal labels across two providers cannot merge targets or grant cross-cloud authorization. **Reject:** two “archive” menu rows both resolve to Cloudflare.

### P08 — Crash honesty
Put the node mutation, matching JSONL event, generation pointer and checkpoint into one IndexedDB readwrite transaction: either all persist or none do. Chrome contextMenus registration is a separate asynchronous operation. Crash after durable commit but before native acknowledgment means `desired > applied`; reconcile from CURRENT next supported wake, report pending until acknowledged. **Reject:** claiming IndexedDB+Chrome updates were one atomic transaction.

### P09 — Independent-backup necessity
If browser/profile/extension deletion removes all extension-origin IndexedDB/local storage, all local BACKUP/WORKING/JSONL disappear as well. By information loss, local-only reconstruction is impossible. A recovery guarantee requires a previously verified independent, user-authorized external copy, integrity check, schema migration and exact-provider reauthorization. **Reject:** promising offline local snapshot survives uninstall automatically.

### P10 — Right-click latency boundary
Chrome can render already registered native rows independent of provider/network discovery. Generate and reconcile plans from CURRENT at prior install/update/wake, not when right-click occurs. A click can still take time to transfer a file. **Reject:** right-click waits for 18-bucket cloud enumeration.

## 7. Storage and recovery truth tables

| Event | CURRENT/WORKING | JSONL | Immutable BACKUP | Native menu |
|---|---|---|---|---|
| Confirmed configuration edit | Update affected exact record | One meaningful event | Unchanged | Reconcile affected route after commit; await acknowledgment |
| Verified remote folder mutation | Exact affected records only | Exact provider-scoped event | Unchanged | Updated matching provider subtree |
| Failed or incomplete scan | Keep unchecked records | No invented deletions | Unchanged | Preserve last safe known rows as allowed |
| Identical complete authorized scan | Refresh verification metadata only | ZERO semantic deltas | Unchanged | Avoid unnecessary churn |
| First actual active use of new calendar day | New mutable working state; CURRENT advances | Period marker if needed | New independent immutable anchor | No mandatory full-cloud rescan |
| Depth 5→3→5 | Graph unchanged | Optional setting event | Unchanged | Deterministic reprojection |
| OAuth expiry | Retain metadata; mark inactive | Auth state/checkpoint if relevant | Retain history | No unauthorized saves |
| MV3/Chrome restart | Reload latest durable CURRENT | No full journal replay on normal startup | Available | Recover missing native entries and desired/applied divergence |
| Clear ordinary browsing cache | Usually distinct from extension storage; verify specific browser behavior | As stored | As stored | Verify and rehydrate if necessary |
| Delete extension data/profile/uninstall | Local CURRENT gone | Local JSONL gone | Local BACKUP gone | Nothing local can fully recover |
| Verified independent backup available after deletion | Restore through explicit import and validate | Restore authentic journal/checkpoints | Recover anchors | Require reauthorization before enabling saves |

**Independent external backup contract:** user explicitly opts in or selects export destination; choose separate durable user-authorized local file or private cloud namespace; versioned provider-namespaced schema; integrity/read-back verification; encryption for sensitive metadata where appropriate; never include raw tokens, passwords or cookies; never silently provision public buckets; restore through validated import and exact account reauthorization; refuse stale privilege; show “last verified external backup” only after actual confirmed storage and read-back. Daily local BACKUP is distinct from external backup cadence. Cloud deletion and backups both lost ⇒ no recovery guarantee.

## 8. Native Chrome menu constraints

1. Register root, provider parents, structural parents before child rows; use true `type:"separator"` inside the correct provider; Home always the LAST child where present.
2. A native submenu parent is not a second clickable save destination. Preserve parent saves via `Save here` child for configured ancestor paths.
3. Reserve capacity for separator/Home and overflow chooser **before** allocating rows; a full first bucket must not starve later eligible buckets. Chrome limits affect projection, not CURRENT.
4. Stable IDs/route mappings survive label edits, reorders, language differences, reloads and mode changes; don't use menu titles to infer targets.
5. Do not duplicate the default root if it also appears in activated inventory. Custom shortcut labels colliding with “Home” remain preserved in stored records but get display-only qualification.
6. Recheck click-time auth, endpoint identity and latest CURRENT route. Unknown/stale IDs are recoverable errors, not fallback saves.
7. Avoid destructive `removeAll` in ordinary recovery; serialize latest-generation registration; preserve root and Manage where Chrome API allows.
8. No unsupported provider appears as a real native saving action. Synthetic fixtures test integration seams without claiming OAuth or transfers work.

## 9. Executable acceptance cases (convert to tests before declaring done)

| ID | Scenario | Must assert |
|---|---|---|
| T01 | Fresh authorized Cloudflare with only default | Native REDOWN→Cloudflare direct click saves once to literal R2 `redown` root, no Explorer |
| T02 | Add one configured extra | Extra, separator, Home last; exact default preserved |
| T03 | Add 2+ extras | All extras ordered; separator immediately before Home; exact routes |
| T04 | Remove last extra | Cloudflare direct-save leaf restored |
| T05 | Connect capable Google Drive with own extras | Cloudflare leaf/submenu unchanged |
| T06 | Provider default absent but extra valid | No fake Home; extra usable; setup if needed |
| T07 | Two accounts identical bucket names / two S3 endpoints | Different IDs and authorized routes |
| T08 | Narrow: three buckets, five configured leaves, many other folders | Exactly five configured save routes plus valid Home; only required ancestors |
| T09 | Bucket merely enabled in Depth, zero Narrow destinations | Does not appear in Narrow |
| T10 | Configured ancestor and descendant | Distinct parent `Save here` and child save |
| T11 | Depth 5→3→5 with incomplete recent scan | Previously known level-five nodes retained and visible/chooser |
| T12 | Depth 2 and provider root | Correct bucket-relative level and real folder names |
| T13 | Image/link/video/audio/page input | Correct URL/context, single transfer per click |
| T14 | Parent/separator/Setup/Browse clicked | Never accidental transfer |
| T15 | Stale menu ID and revoked auth | Fail closed, never wrong-account fallback |
| T16 | Parallel Apply, failed create/update/remove, service-worker restart | Latest-generation native registration, truthful applied acknowledgment |
| T17 | One label edit in 18 buckets | One scoped CURRENT+journal change, other 17 intact |
| T18 | Failed/partial scan, TTL expiry, OAuth error | No invented deletions, retained graph |
| T19 | Repeated identical complete listing | Zero semantic JSONL events and no needless rebuild |
| T20 | Daily rollover across missed dates/DST/concurrent tabs | Real dated immutable BACKUP and mutable WORKING, no full scan |
| T21 | Native rows lost but IndexedDB intact | Rebuild from CURRENT before network crawl |
| T22 | All extension data deleted, no external backup | Honest irrecoverability; no false restoration |
| T23 | External verified backup imported after deletion | Integrity/schema/reconnect checks; no secrets or guessed targets |
| T24 | Large 300+ native rows / many buckets | Bounded plan, Home last, full chooser reaches omitted entries |
| T25 | Disconnect Q | Other provider P unchanged; Q ineligible |
| T26 | Custom label “Home” / duplicate “Projects” | Display disambiguation without changing records |
| T27 | Explorer currently browsing different bucket | Home saves to configured default, not selected Explorer location |
| T28 | Actual installed fresh and upgraded Chrome profiles | Screenshot and menu IDs, click routing, restart, auth checks; mark unavailable unverified |

**Property-based/metamorphic obligations:** permutation of other providers does not alter P's route graph; re-projection of identical CURRENT is deterministic; depth monotonic visibility for a fixed graph (before native cap); Narrow actions remain subset of configured routes; user label edit does not change canonical target; event replay is idempotent; every native click yields zero or one save; H(P) when present is exactly final child and immediately follows a separator; a partial scan cannot reduce another provider's durable graph.

## 10. Verification evidence and source anchors

Existing source anchors are `extension/right-click-v3.js` (Simple, Narrow, Level/Depth projector and resolver), `extension/background.js` (native registration, action routing, activation and transfer), settings/tree UI and `tests/right-click-v3.test.mjs`. Existing Simple source currently puts an uppercase `REDOWN` default child FIRST, inconsistent with this new contract. There is no source-backed claim here that the new CURRENT/daily backup/external restore architecture already shipped.

Codex must report: exact implementation diff, source and generated IDs, tests T01–T28, provider isolation and authorization results, cold/warm Apply timing, MV3 and crash fault injection, real installed-Chrome evidence when permitted, provider save read-back receipts only with real authorization, limitations marked OPEN/NOT VERIFIED, and pushed commits. Passing fixtures alone is NOT live browser or provider proof.

**Final gate:** This is a contract for the **actual Chrome native right-click menu**. A fake in-app screenshot of a menu does not satisfy it.