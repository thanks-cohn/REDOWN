# Interface-to-wiring contract — primary reconstruction boundary

[Navigation](README.md) · [control bindings](CURRENT_MODERN_END_TO_END.md) · [acceptance](REGRESSION_AND_ACCEPTANCE_MATRIX.md).

**CURRENT FACT** at `b7178442c26c7723a9a650613ef65ba38ce26b21` unless marked **PROPOSED**. This is documentation of existing functions/messages, not a new Right-click API. No callable API or interface is implemented by this audit.

## One authority map

| Responsibility | Existing owner / actual entry point | Reuse limit |
|---|---|---|
| Read saved profiles | `chrome.storage.local.get(['profiles','rightClickMode'])`; runtime `{type:'profiles'}` → `getProfiles` | Private extension state can contain tokens. Project/diagnostic API is offline, not this GUI endpoint. Do not export raw profiles |
| Draft lifecycle | `beta/destinations.js load/changed/update/rows/setMode/mountNested` | Closure-private, not exported methods. Future view may replace these, retaining semantics |
| Folder path semantics | `RedownNestedLocations.name/path/setLocation/invalidate` | Single segment name, true ancestry; never fabricate ready:true |
| Draft migration | `RedownNestedLocations.initialize/fromLegacy` | In-memory versioned import only; no remote writes; existing modern empty model always wins |
| Project/sign/validate | `RedownDestinationConfig.project/signature/prefix/validate` | Pure helpers; signature is JSON string, not a cryptographic lock; active-layout validation and grammar/byte gaps remain |
| Commit definitions/mode | runtime `saveDestinationConfig` → background `saveDestinationConfig(message,sender)` | Sole ordinary definition mutation endpoint; exact Explorer sender; optimistic signature; no new profile/credentials authority |
| Preference persistence | `saveStoragePreferences(message,sender)` | Exact options sender, allowlisted unrelated fields only; cannot replace menu save |
| Infrastructure merge | `setProfiles(profiles,menuProfileId=null)` | Background-private; serialized with saves; fresh menu fields win unless explicit setup profile exemption |
| Pure plan | `RedownNestedLocations.menuEntries(profiles,mode,'redown')` → `nestedEntries/destinations` | R2-specific selected profiles; no native registration or remote effects |
| Native registration | `rebuildMenus` → serialized `buildMenus` → Chrome APIs | Background-private. UI must obtain this through save, not another builder |
| Click authority | `RedownDestinationConfig.resolve(menuId,freshProfiles,activeMode)` | Fresh saved identity; never draft, cached DOM, historical tree or label parsing |
| Native transfer | background `onClicked` → `selectedUrl` → `ingestCloudflareAtPrefix` | Existing Worker remote URL ingestion, not generic browser bytes; provider receipt separate |

Pinned anchors: [config helpers](https://github.com/thanks-cohn/REDOWN/blob/b7178442c26c7723a9a650613ef65ba38ce26b21/extension/destination-config.js#L3), [save lane](https://github.com/thanks-cohn/REDOWN/blob/b7178442c26c7723a9a650613ef65ba38ce26b21/extension/background.js#L2072), [builder](https://github.com/thanks-cohn/REDOWN/blob/b7178442c26c7723a9a650613ef65ba38ce26b21/extension/background.js#L2109), [click](https://github.com/thanks-cohn/REDOWN/blob/b7178442c26c7723a9a650613ef65ba38ce26b21/extension/background.js#L2423), [transfer](https://github.com/thanks-cohn/REDOWN/blob/b7178442c26c7723a9a650613ef65ba38ce26b21/extension/background.js#L1970). SOURCE_INDEX maps exact symbols, hashes and linked claims.

## Reads, draft ownership and remote effect boundaries

Clone latest profiles, read stored mode, normalize with `M.menuMode`, calculate expected signature **before** `M.initialize` and default normalization. `load` prefers background profiles if available; raw storage is fallback. Profile and mode reads are not an atomic cross-message snapshot; a concurrent change may yield a safe stale-save rejection, not permission to overwrite.

Allowed existing discovery messages used here: `profiles`, `cfAccounts`, `cfBuckets{accountId}`, `cfDestinationFolders{accountId,bucketName,prefix,cursor}`, `cfFolderChildren{accountId,bucketName,parentPrefix,limit}`. These are current GUI messages; Cloudflare auth can refresh tokens on reads. They are not offline or zero-effect project diagnostics. Use stable identity and epoch/request checks on replies. Never use `cfPrepareBucket` or `preparedProfile` to simulate read-only discovery: those can deploy.

Draft state: profile menu projection, mode, expected signature, dirty/saving/reads/activation flags, account/bucket display metadata, typed creation drafts, collapsed IDs, pending locks, epoch/renderVersion and short-lived picker caches. Labels/collapse/CSS do not define remote target. A collapsed unready child still blocks active Nested Save. UI must reveal the offending path rather than silently mark it ready or delete it.

`+ Location` adds a menu entry/root. `+ Child` adds a blank unready menu child, not a folder. Selecting existing folder is discovery + draft change. `cfCreateFolder{accountId,bucketName,prefix,name,betaNoProvision:true}` is a **real remote marker mutation**, with discovery verification and separate user action; it occurs before Save, and Reload cannot undo it. Bucket activation `cfProvision` deploys/updates private Worker and may seed menu state. Dedicated `cfSetupRedownQuick` may create/reuse bucket and provision; requires exact Modern sender and `confirmed:true`. File upload is a further separate operation. Red × never calls delete APIs.

## Exact commit protocol

DOCUMENTARY wire example (existing message shape, not new API):

```json
{"type":"saveDestinationConfig","expected":"<exact C.signature(savedProfiles,savedMode)>","mode":"simple","profiles":[{"id":"p","accountId":"a","bucketName":"art","menuLabel":"Art","defaultPrefix":"photos/deep","simplePrimaryEnabled":true,"simpleOptions":[],"nestedMenu":{"version":1,"enabled":false,"roots":[]}}]}
```

1. Sender URL without query/hash must equal `chrome.runtime.getURL('beta/explorer.html')`. Rehosting under another URL fails; a future interface should remain there unless a separately reviewed sender-policy change is authorized. No `confirmed:true` is required by this ordinary save endpoint.
2. Work queues on `destinationSaveQueue`, reads latest profiles/mode/backup, computes current normalized mode/signature, rejects unequal `expected` with “Destinations changed in another window. Reload…”. Never rebase definitions silently or blindly retry stale saves.
3. `mode` must be simple/nested; `profiles` is an array of patches for **existing R2 profile IDs**. Duplicate/unknown patch IDs reject. AccountId/bucketName in the projection are identity context; only `C.fields` are assigned. No arbitrary account, bucket or credentials patch is accepted through this endpoint. It does not add/remove profiles.
4. Each supplied profile patch is a **replacement of its menu-field projection**, not a sparse merge: omitted allowed fields are deleted. Send complete `C.project(draftProfiles)` for a definition commit. `profiles:[]` deliberately commits only mode while validating the newly active **saved** layout; it does not commit dirty definitions.
5. Allowed fields exactly: `menuConfigVersion, menuLabel, defaultPrefix, simpleBucketName, simpleOptions, simplePrimaryEnabled, simplePrimaryOrder, explorerManaged, showInContextMenu, menuOrder, nestedMenu`. Background stamps menuConfigVersion1 and default empty disabled nestedMenu if absent. Preserve profile id/type/accountId/bucketName/authorization/infrastructure and all unrelated fields.
6. Validate latest merged profiles in requested mode. Reject missing/duplicate profile/location IDs, invalid paths/labels, unprepared same-account buckets, active unready/blank Nested children, >8 folder levels, >500 active locations. Inactive definitions remain retained and may be invalid. **Known limits:** identifier grammar does not reject colon-bearing profile IDs; prefix limit uses JS length, not full UTF-8 key bytes including filename. Additional actual-source negative fixtures P5/P6 prove assembled Nested prefix can exceed the resolver limit despite valid individual names, and Nested validation can reject an enabled explorerManaged profile excluded by the planner. Reuse must retain explicit failure handling while these gaps receive separate review. Do not silently migrate these IDs/paths; compatibility policy and negative tests must precede later repair.
7. First backup `menuConfigurationBackupV1` stores prior menu projection, legacy tree snapshots, old mode; no secrets. Existing backup is retained. Storage set writes profiles/mode/backup before attempting rebuild. Failed storage does not count as saved; draft stays.
8. Successful storage + native rebuild yields `{ok:true,signature,menuUpdated:true}`. Failed rebuild yields `{ok:true,signature,menuUpdated:false,error:'Saved, but Chrome could not update its menu. Retry Save to rebuild.'}`. This is **saved with registration failure**, not rollback. UI must adopt returned signature so a retry does not falsely conflict with its own committed state.
9. UI current `request` rejects `ok:false`; background errors are returned by message dispatcher. Current Save clears dirty after ok:true, including menuUpdated:false, and locks/restores controls. No overall request timeout or durable registered-version receipt exists. MV3 termination after write but before reply can make save result uncertain: reread before retry, preserve draft, do not assume nothing happened.

`signature` includes mode and menu projection order/identity, not credentials. Infrastructure updates preserve menu under the same lane. Preferences allow `name,folders,defaultCategory,repository,branch,workflowFile,paths,defaultPath` plus GitHub token only; response may be private, not safe logging. Exceptional writers: native checkbox writes mode without full validation; missing-mode builder inference writes mode; explicit Modern provisioning/setup can seed one menu profile; raw extension storage access is not prevented by endpoint guards. “One authority” means guarded ownership, not one physical call to storage.set.

## Model, descriptors and targets that must remain compatible

Simple primary: owner profile fields `defaultPrefix/simpleBucketName/menuLabel/simplePrimaryEnabled/simplePrimaryOrder`. Extra: `{id,label,bucketName,prefix,order}` in `simpleOptions`. Nested: `{version:1,enabled,roots:[{id,bucketName,ready,label?,children:[{id,name,ready,label?,children:[]}]}]}`. Root's prefix is empty; folder prefixes are concatenated ancestor names, never labels. `name` changes invalidate descendants; sibling order changes do not change paths. Configuration deletion does not delete profiles or old historical menuTree.

Simple plans contain `quick:P` and `simple-option:P:S`, direct children of `redown`, globally sorted primary/item order after profile menuOrder ordering (stable ties). Current fallback is trimmed explicit label → deepest prefix segment → bucket → Destination. Owner requires bucket automatic naming later; that is an explicit future behavior delta, not current parity and not permission to change explicit custom labels or prefix.

Nested root `nested:P:R:R` directly under `redown`; node `nested:P:R:N` under its actual immediate parent; branch adds `:send` as first child titled Send here. Every depth has its own Send here when it has a ready immediate child. Leaf has no send child. Renaming/reordering preserves IDs and exact prefixes; after deleting last child an old `:send` must not resolve. Five contexts: link,image,video,audio,page. Current build adds root/setup-if-empty/separator/native checkbox/saved-URLs/manage controls; editor HTML/CSS cannot style these native flyouts.

Click handler rereads profiles and mode and resolves current ID. `resolve` rejects stale/deleted/inactive/unprepared/obsolete `tree:`; same-account prepared target requires workerUrl and token. `owner` identifies the saved menu profile, `profile` identifies prepared target bucket. Keep both distinct in history. A still-active ID may resolve to a newly saved target after an old menu was registered; the current model is authority. A change after resolve does not cancel a transfer already underway.

## PROPOSED thin view boundary — documentary examples only

No new persistence engine, store, runtime namespace or transport is proposed for the editor. Possible private adapter signatures, **not existing exported functions**:

```text
loadEditorSnapshot() -> {draftProfiles, mode, expected, status}
selectExisting(rowIdentity, exactFolderSelection) -> local draft
addLocation(ownerId) / addChild(rootId,parentId) / removeMenuBranch(id) -> local draft
setLabel(id,label) / reorderSibling(id,delta) -> local draft
validateDraft() -> errors with exact visible path
saveDraft() -> existing saveDestinationConfig receipt
changeLayout(mode) -> existing mode-only guarded save
reloadDraft(discardConfirmed) -> fresh saved snapshot
renderView(snapshot) -> DOM/CSS only
```

Adapter translates UI events into the existing profile fields; planner and resolver remain shared. Typed creation is a separately authorized command, not a side effect of selection/save/render. A future view can reuse `RedownNestedEditor` via `context.save` as draft notification, or replace its DOM while using M helpers and the same save endpoint; it must not claim closure-private `destinations.js` methods are a public API. All new implementation requires separate authorization.

## PROPOSED honest status and recovery

| State | Required evidence / proposed concise copy | Recovery |
|---|---|---|
| Unsaved | Draft differs from saved projection / “Unsaved changes” | Save or confirm discard |
| Saving | Commit sent, response pending / “Saving…” | Preserve draft; uncertain reply requires fresh read |
| Saved | Storage receipt/signature acknowledged / “Saved” | Do not infer native rendering |
| Registering | Build pending (currently not separately reported to UI) / “Updating Chrome menu…” | New visibility would require later implementation |
| Registered | All create callbacks acknowledged / “Chrome menu updated” | Still requires native rendering acceptance; no current durable registered revision |
| Registration failed | menuUpdated:false / “Saved; Chrome menu update failed” | Retry from returned signature; don't rebuild via a parallel writer |
| Transfer succeeded/failed/uncertain | Actual existing provider path/receipt/history or ambiguity | Never infer from Save, droplet, URL opening or started upload |

Protect Save result from later readiness/mode callback messages; current single status text is lossy. Proposed status model is not current product copy or an installed registration receipt. Contract tests and installed/native acceptance remain mandatory before declaring a reconstructed interface compatible.
