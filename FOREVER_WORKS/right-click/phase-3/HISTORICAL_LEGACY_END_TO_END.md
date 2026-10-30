# Historical Legacy end-to-end chain

30 October 2026. **AUDIT ONLY.** Source `b7178442c26c7723a9a650613ef65ba38ce26b21`. All implementation facts below are pinned source inspection unless a named local fixture is cited. No installed Chrome or live-provider verification. Proposed boundaries are documentation, not existing APIs or accepted Forever intent.

Verified historical revision 515c272c48f89eb3f509fa2c7a5a02e0db53f66b. It is a comparison fixture, never a reset/rollback target. Exact line anchors are in [SOURCE_INDEX](SOURCE_INDEX.json).

## What made it feel connected

options.html loaded options.js, shared nested-locations/editor and reorder utilities. renderProfiles constructed profile cards, primary location, extras and Nested mount against the same profiles object consumed by save callbacks. Existing saved account/bucket/prefix values seeded the controls. Primary bucket selector reset prefix; per-level folder selectors kept parent-scoped names, invalidated lower selections and called persistence. Separate input/Create and +Child made real folder creation versus selection visibly distinct. These action-ownership facts support the owner's reliability report; intuitiveness/aesthetic satisfaction remains OWNER_REPORT/inference.

| Historical event/control | Actual function/callback | Persistence and resulting native action |
|---|---|---|
| Primary bucket change | simplePrimaryLocationField, bucket change | simpleBucketName, defaultPrefix=''; scheduleSave |
| Primary folder segment | simpleFolderPathEditor persist callback | defaultPrefix; scheduleSave resets a 180ms timer |
| Primary name/preferences | field input callback | menuLabel etc. → scheduleSave |
| Additional destination | simpleExtraOptions.addLocation | UUID, blank label, bucketName, prefix=''; immediate saveProfiles |
| Extra folder/bucket | per-row persist/change | option prefix/bucketName, immediate saveProfiles |
| Remove extra | Remove option listener | splice by object identity, remove DOM, immediate saveProfiles |
| Segment × | simpleFolderPathEditor remove | clears that and dependent selections, retains blank descendant rows; not whole-card/cloud deletion |
| Nested selection/create/add/remove | shared editor context.save → saveNestedMenu | serialized latest stored profile's nestedMenu replacement; credentials/profile additions merged |
| Mode selection | chooseRightClickMode | immediate rightClickMode; saved/default inferred nested also from menuTree |
| Reorder | RedownReorder callbacks; arrays/menuOrder | persisted ordering; paths remain independent |
| Folder creation | cfCreateFolder | remote marker write before menu commit; no atomic rollback |

Historical saveProfiles:51 wrote WHOLE profiles directly to storage.local. scheduleSave:83 debounced 180ms. saveNestedMenu:53 had a specialized merge to protect newer workerUrl/workerVersion/token/publicBaseUrl/scriptName and Explorer-managed additions. That did not make all whole-profile writers safe. Current saveProfiles is a restricted preference adapter and saveNestedMenu throws. Never transplant the historical writer into a rebuilt UI.

## Persistence through native Chrome and actual destination

storage.onChanged profiles/mode and startup/install triggered historical rebuildMenus/buildMenus. Historical builder removed all menus, created items while collecting callback promises, then aggregated errors. It was not a durable or atomic apply. Simple used quick:P and simple-option:P:S flat under redown; historical simpleLabelFallback preference could choose bucket instead of deepest path when label blank. Nested model produced nested IDs; absent model with menuTree used preset:P/tree:P:path IDs. Multiple sources of authority were accepted then.

Historical native listener parsed quick/extra/tree/nested IDs with distinct branches; extra selected same-account prepared bucket then ingestCloudflareAtPrefix. Nested path came from model destinations. Quick had broader category/default routes and legacy tree recursion remained. Current single C.resolve is deliberately narrower: stale IDs cannot fallback. Owner historical success does not justify restoring old tree routing or GitHub behavior to current R2 definitions.

**Historical defect proved again:** deeper Nested nodes attached to first-folder ancestor and concatenated remainder into title; Send here existed only at shallow levels. P4 compares actual old/new builders: third folder parent was first folder, now second. Keeping the current immediate-parent planner is essential.

## Concrete equivalence experiment

[P1 raw](evidence/parity.json): prepared profile p, account a, bucket art; select art, choose photos then +Child/final in actual historical DOM callbacks; add an extra; remove original extra. Legacy writes immediately/debounced and generates quick:p → a/art/photos/final plus one new extra. Current actual picker chooses synthetic photos/final, +Location, red × removes original extra, Save invokes actual guarded background and builder. Primary ID/parent/account/bucket/prefix match. Added destination ID is generated and default label differs: historical blank fallback art; Modern explicit New location. Full descriptor arrays and targets are retained, not claimed byte-identical.

[D1–D10](evidence/prior-differential.json) additionally reexecute historical autosave, tree-only generation, mode inference and bucket-label fallback. No production profile or remote folder was touched.

No accounts: setup/no destinations rather than usable target. Multiple profiles can share labels without shared identity. Old-only trees/empty groups/deep paths were less strictly guarded; source is not evidence of universal historical correctness. Historical errors, two-window overwrites and old-only versus versioned modern emptiness must remain explicit in the reconstruction review.

P11 executes both actual historical/current native quick listeners for the same photos/final target and media URL. Their stubbed provider calls match field-for-field; actual provider delivery remains NOT_TESTED.
