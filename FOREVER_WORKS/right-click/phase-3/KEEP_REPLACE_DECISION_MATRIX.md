# Keep, replace and review decisions

30 October 2026. **AUDIT ONLY.** Source `b7178442c26c7723a9a650613ef65ba38ce26b21`. All implementation facts below are pinned source inspection unless a named local fixture is cited. No installed Chrome or live-provider verification. Proposed boundaries are documentation, not existing APIs or accepted Forever intent.

All future implementation remains separately authorized. Current code stays intact in this audit.

| Unit / selector or rule | Disposition | Reason / required preservation |
|---|---|---|
| profiles / prepared R2 account,bucket,prefix,UUIDs | KEEP | existing identity and auth store; no second database or silent migration |
| destination-config project/signature/validate/resolve | KEEP with REVIEW REQUIRED | central allowlist/conflict/resolution; ID grammar/UTF-8 gaps require explicit tests/disposition |
| nested-locations menuEntries/nestedEntries/path | KEEP | shared parent-first plan, exact prefixes, labels independent |
| initialize/fromLegacy | COMPATIBILITY READER ONLY, REVIEW REQUIRED | draft migration/no-resurrection mandatory; hidden readiness UX unresolved |
| background saveDestinationConfig/save queues/backup | KEEP | single guarded definition authority, partial receipt semantics |
| setProfiles/saveStoragePreferences | KEEP | prevent delayed infrastructure/Legacy preference overwrites |
| buildMenus/rebuildMenus/onClicked | KEEP, browser verification required | native application and fresh resolver; no view-owned Chrome API |
| preparedProfile/ingestCloudflareAtPrefix/Worker | KEEP outside view | R2 execution may deploy/repair; no copy into adapter |
| destinations.js renderSimple/load/mount adapter | FUTURE REBUILD | replace view coupling while preserving exact commit and error semantics |
| nested-menu-editor rootRow/folderRow | CONCEPTUALLY REUSE, review singleton | useful selection/create/invalidation and hierarchy; UI strings/save callback conflate draft/persisted; don't expose duplicate writer |
| #quick-tab-setup/#quick-tab-urls + quick-links selectTab | PRESERVE | owner separated tabs; keyboard/ARIA behavior |
| folder outline .nested-children/.nested-collapse/data-depth | PRESERVE + IMPROVE LATER | authentic ancestry and lazy bounded discovery; narrow guides must not flatten model |
| .destination-remove-x/.nested-remove/.nested-inline-remove | PRESERVE | permanent red ×, fixed clean location, no tooltip/hover-only reveal; configuration only |
| .destination-toolbar/.destination-stage/card-fields | IMPROVE LATER | coherent spacing/sections; preserve all controls at actual panel widths |
| .nested-heading/.meta hidden | IMPROVE LATER | distinguish account/bucket/profile without duplicate-looking titles |
| Current #destination-preview absence | PROVEN DORMANT | do not claim present; restore only if explicitly designed later |
| Old four-stage studio/container-query rules | PROVEN OBSOLETE at current compact pin | older handoff not active HTML/CSS; do not rebuild wrong baseline |
| Root bucket creation form existingOnly:true | HIDDEN SHARED CAPABILITY, REVIEW REQUIRED | not active Modern menu action; must not accidentally reenable provision |
| options.js old constructors/menuTree renderer/tree: routes | PROVEN OBSOLETE current authority | compatibility study only, no native generator/writer restoration |
| Legacy whole-profile saveProfiles | CANNOT SAFELY REUSE | historical stale-writer/membership/auth overwrite risk; current preference adapter stays |
| menu-reorder grips | PROVEN ABSENT Modern loader | explicit ↑↓ available; old fixture expectation fails; owner decision if grips desired later |
| Automatic bucket default label | OWNER-DIRECTED FUTURE CHANGE | current deepest fallback differs; must preserve explicit labels/exact prefix and resolve conflicting historical preferences |
| Autosave vs explicit Save | OWNER DECISION REQUIRED for later UX | preserve single save authority; never silently restore whole-profile debounce |
| Simple/child Undo and remove focus | IMPROVE LATER / owner scope review | current Undo only full Nested group; focus/accessibility acceptance open |
| Theme tokens/reduced motion/focus outlines | PRESERVE | premium restrained direction; measured fixture is not universal aesthetic approval |
| Chrome native styling | CANNOT REUSE Modern CSS | Chrome owns flyout layout; changing CSS cannot fix native planner/registration |
