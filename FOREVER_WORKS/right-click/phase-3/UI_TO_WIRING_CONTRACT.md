# Interface-to-menu wiring contract

30 October 2026. **AUDIT ONLY.** Source `b7178442c26c7723a9a650613ef65ba38ce26b21`. All implementation facts below are pinned source inspection unless a named local fixture is cited. No installed Chrome or live-provider verification. Proposed boundaries are documentation, not existing APIs or accepted Forever intent.

## The implementation boundary to keep

**CURRENT FACT:** There is no generic Right-click API. There are extension-internal messages, pure browser globals, and private background functions. Rebuild only the view and its draft adapter in a later task; use the existing authority below. [SOURCE_INDEX](SOURCE_INDEX.json) gives exact revision/line links for every named function.

| Responsibility | Current callable / owning file | Input and output | Compatibility obligation |
|---|---|---|---|
| Load | destinations.js `load`; runtime message `profiles`; storage.local get profiles/rightClickMode | Clone full profiles internally, infer mode, record `C.signature` BEFORE draft initialize | Never export secrets; preserve saved baseline separately from normalized draft |
| Normalize legacy draft | `M.initialize(profile)` / `fromLegacy` in nested-locations.js | Missing pre-v1 model imports menuTree as unready roots/segments; modern model or menuConfigVersion>=1 wins | No silent persistence or resurrection; empty means empty |
| List accounts/buckets | `cfAccounts`, `cfBuckets {accountId}` | accounts / buckets responses | Discovery is not preparation; auth refresh can write local auth |
| Pick Simple folder | `RedownDestinationMenus.create(...).attach(...)`; `cfDestinationFolders {accountId,bucketName,prefix,cursor}` | paged immediate folders with exact prefix; picker onChoose | Current picker strips final slash before draft adoption; never infer target from label |
| Pick Nested segment | `RedownNestedEditor.mount`; `cfFolderChildren {accountId,bucketName,parentPrefix,limit}` | child names; setLocation/invalidate | Preserve true parent path, invalidation and readiness; listing can be capped |
| Local validation | `C.validate(fullDraftProfiles,mode)` | throws user-readable Error or returns undefined | Does not persist or prove Chrome/provider success |
| Projection | `C.project(fullDraftProfiles)` | Cloudflare menu-only patches plus IDs/accountId/bucketName | Credential-free projection is a patch, not a replacement profile store |
| Commit | runtime `saveDestinationConfig {expected,mode,profiles}` → background function of same name | success `{ok:true,signature,menuUpdated,error?}`; rejection becomes `{ok:false,error}` at message listener | Exact Explorer sender; expected must match latest saved signature; no direct profiles set |
| Plan | `M.menuEntries(profiles,mode,'redown')` | ordered native destination descriptors | Pure plan, neither registration nor provider proof |
| Native apply | private background `rebuildMenus` → `buildMenus` | queued complete plan/removeAll/create callbacks | UI must not create native menus or duplicate planner |
| Click resolve | `C.resolve(id,freshSavedProfiles,activeMode)` | `{profile:preparedTarget,owner,prefix}` or null | No fallback to defaults/old tree/previous menu snapshot |
| Transfer | actual onClicked listener → `selectedUrl` → `ingestCloudflareAtPrefix` | source URL + exact target → checked Worker receipt/history | Existing R2 transport stays separate from UI; not a browser-byte upload API |

C = RedownDestinationConfig, M = RedownNestedLocations. These globals are loaded by explorer.html before destinations.js. The shared Nested editor's `context.save` is NOT a persisted save: Modern supplies a callback that only marks dirty.

## Persisted contract and allowed writes

Background saveDestinationConfig:2072 owns definition commits. `destinationSaveQueue` serializes it with saveStoragePreferences, setProfiles and native mode operations. Sender URL, with query/hash removed, must equal chrome.runtime.getURL('beta/explorer.html'). No arbitrary caller/CLI is authorized by this contract.

`expected` equals JSON.stringify([activeMode,C.project(savedProfiles)]). It is order-sensitive serialized state, not a monotonic or cryptographic revision and not an installed-menu fingerprint. Retain the exact baseline from load or successful response. Do not calculate it from the modified draft. Reject stale commits rather than retrying with a newly read signature over an old draft.

Only known cloudflare-r2 profile IDs can be patched. Identity `id/accountId/bucketName` is preserved from background state; patch accountId/bucketName do not authorize reassignment. Reassignment moves an option to an existing target profile in the draft. Duplicate patches reject. Allowed fields, exactly:

`menuConfigVersion, menuLabel, defaultPrefix, simpleBucketName, simpleOptions, simplePrimaryEnabled, simplePrimaryOrder, explorerManaged, showInContextMenu, menuOrder, nestedMenu`.

For each patched profile, an omitted allowed field is DELETED, not left alone. Use project on the full retained draft. Unpatched profiles remain. Background forces menuConfigVersion=1 and supplies missing empty disabled nestedMenu. Authorization/infrastructure/name fields are never overwritten by the menu patch. First menuConfigurationBackupV1 preserves projected menu fields and original legacy trees/mode without copying secrets. Keep backup and legacy evidence; never promote them back into authority after deletion.

Simple option: stable id, label, bucketName, prefix, order. Primary: stable profile id, menuLabel/defaultPrefix/simpleBucketName, enabled/order. Nested: version/enabled/roots; root id,bucketName,ready,label?,children; child id,name,ready,label?,children. `name` is one path segment; `label` is display text. Disabled layout definitions remain independently stored.

Validation currently checks unique profile IDs; unique extra/root/node IDs; active labels <=60 trimmed characters/no controls; prefixes <=1024 JS characters/no backslash/control/dot segments; prepared same-account bucket with workerUrl AND token; active ready roots/children; <=8 folder levels; <=500 active locations. Inactive definitions are not fully validated. It does NOT guarantee ID grammar, UTF-8 total object-key size, actual folder existence, Chrome rendering or usable remote credentials. See D8/D10 and regression gates before claiming safe universal reuse.

## Save and mode semantics

`Save menu`: validate → lock controls → project → guarded message → storage.local.set → rebuild. `ok:true` means SAVED even if menuUpdated=false. Adopt returned signature in BOTH successful cases and retain a registration-failed state when false. A rejected save retains draft and old baseline. A UI timeout would mean outcome unknown, not safe retry/proof of no write. Current UI has no overall explicit timeout; Chrome create uses a 5-second per-entry timeout.

Mode button sends profiles:[] with next mode and current expected. This immediately persists mode without committing draft definitions; background validates the current saved definitions for the selected mode. Then UI mounts Nested if needed. Native `redown-nested-mode` checkbox is a separate mode-only writer in the same queue, without full validation. Dirty-window mode-only events rebase expected's mode; profile changes require Reload. Events arriving while saving/activating are ignored by this page. True browser event permutations remain an acceptance gate.

`setProfiles` merges latest menu fields and new profiles over late infrastructure results under the same queue. `menuProfileId` is an exceptional explicit setup seed. `saveStoragePreferences` requires options.html sender, allows name/folders/defaultCategory/repository/branch/workflowFile/paths/defaultPath and GitHub token only. Do not revive Legacy saveProfiles as a menu writer.

## Native descriptor and resolver contract

| Saved active item | Native ID / parent | Exact target |
|---|---|---|
| Primary | quick:P / redown | owner P account, simpleBucketName or bucketName, defaultPrefix or empty |
| Extra S | simple-option:P:S / redown | owner P account, option bucketName or profile bucket, option prefix |
| Nested root R | nested:P:R:R / redown | owner account, root bucket, empty prefix |
| Nested child N | nested:P:R:N / immediate parent nested:P:R:parentNode | joined ancestor names, never labels |
| Nested branch action | same ID + :send / branch ID | same prefix as branch; valid only while a direct child exists |

Contexts are link/image/video/audio/page. Simple is flat; explicit per-entry order globally sorts primary/extras after profile-order selection. Nested uses profile menuOrder and root/child array order, depth first, parent then Send here then children. Labels: explicit trimmed Simple label → deepest prefix segment → bucket → Destination. Owner's future default-bucket requirement is a proposed behavior change, not current fact. Nested labels override name/bucket without target edits. Full plan adds redown root, setup when empty, separator, checkbox, saved URLs and manage controls.

Background attaches private destination metadata to its plan, then strips destination/operation before Chrome.create. There is no exposed persisted plan/build receipt. Native callback success is not rendered-menu observation. Click resolver uses fresh profiles/mode, filters inactive owner, finds exact item and a prepared SAME-ACCOUNT target bucket. Stale/removed/wrong-mode/obsolete tree: returns null, no transfer. A completed resolve captures target before async provider work; subsequent removal does not cancel that already-started transfer.

## Distinct actions and authority

Adding Location/Child changes menu draft only with prepared profiles. First-use +Location may explicitly confirm cfProvision and deploy/update a Worker; preserve this distinction or move it into a separately named activation flow later. `cfCreateFolder` is a REAL marker write followed by discovery/read-back, using betaNoProvision:true in Modern. Cancel/Reload cannot undo a folder already created. `cfCreateBucket` is provisioning, not adding a menu root. Dedicated quick setup uses cfSetupRedownQuick and confirmed:true, exact Explorer sender. Existing bucket activation, cloud folder creation and upload must not share an ambiguous plus operation. No deletion control here may call cfDeleteObjects or a provider delete API.

## Proposed thin view adapter, NOT IMPLEMENTED

Documentary signatures only: `readEditorSnapshot() -> {savedBaseline,draft,mode,signature}`; `applyDraftIntent(intent) -> {draft,dirty,validation}`; `selectAuthorizedFolder(identity) -> selection`; `commitMenuDraft({expected,mode,projection}) -> existingSaveReceipt`; `presentOutcome({draft,saved,registration,transfer})`.

These would be local view abstractions delegating to the current functions above. They are NOT advertised runtime messages or a second database/API. Keep CSS/DOM state (expanded IDs, focus, selected tab, typed creator text) separate from durable menu fields. Discovery observations may update draft readiness but must not silently persist or imply provider permission. View unmount must release singleton shared-editor context and reject late discovery; multi-mount currently requires review.

Proposed status states: Unsaved; Saving; Saved/registration pending; Registered (only acknowledged build); Saved/registration failed; Save rejected/conflict; Outcome unknown; Transfer succeeded/failed. Do not show a generic success over a persistence or registration failure. Transfer status is independently sourced from actual operation outcomes, never from saving settings. This state model is a future design obligation, not current UI copy.

## Reuse gate

For valid prepared R2 fixtures, preserve exact current IDs/order/parents/context/targets before/after view replacement. Run no-resurrection, red ×/Undo, inactive-mode retention, stale signature, delayed infrastructure merge, current click listener, failure and narrow-layout gates. Resolve or explicitly exclude malformed IDs, excessive UTF-8 keys and unverified migration readiness before claiming all destinations supported. Preserve owner-directed folder outline, separated tabs, permanent red deletion controls and premium responsive hierarchy. No production implementation occurs in Phase 3.

## Independent source-wiring continuation

The [expanded interface-to-wiring contract](source-wiring-continuation/UI_TO_WIRING_CONTRACT.md) details full-field replacement versus mode-only save, exact sender/private/exported boundaries, exceptional writers, multi-window signatures and proposed status/view boundary. [Additional P5/P6 evidence](source-wiring-continuation/evidence/parity.json) reproduces assembled Nested prefix and hidden-managed validator/planner gaps; do not infer universal validation/resolution equivalence.
