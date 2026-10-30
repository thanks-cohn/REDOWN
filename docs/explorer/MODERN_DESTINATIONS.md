# Modern Explorer destination studio

Implemented on `release/cloudflare-true-remote`, starting at `670fdd9de69c671e8d3f14b02bca0d37e4958312`. The protected `BASE-102926` tag is unchanged.

The existing Cloud Control / Right-click setup tab now contains a compact keyboard-operated Simple/Nested switch, an account/prepared-bucket selector for additions, a + Location action, Save menu, and Reload. Both views share a fixed-height scrollport and Explorer theme tokens. Reduced motion is supported. Bucket URLs and the NEON startup surface keep their existing behavior.

## Current message addition

The frozen historical message inventory remains unchanged. Its coverage test also checks this current addition, preserving all 37 original entries and requiring the new branch explicitly.

| Message | Sender | Inputs | Result and side effects |
|---|---|---|---|
| `saveDestinationConfig` | Exact modern Explorer extension page | expected menu signature, mode, menu-only profile projections | Validates and merges local profile menu fields, saves mode, awaits the existing serialized native menu rebuild; returns signature and menuUpdated, or an actionable error. No Cloudflare mutation. |

| `saveStoragePreferences` | Exact legacy options page | profile preferences | Copies only unrelated whitelisted preferences through the shared save lane; preserves modern menu fields, authorization and profile membership. |

## Ownership and persistence

- `beta/destinations.js` presents Simple cards and mounts the existing `RedownNestedEditor`. There is no second persistent destination database. Unassigned first-run cards are local drafts until a prepared profile can own them.
- The original `profiles`, `simpleOptions`, `nestedMenu` and global `rightClickMode` remain authoritative. Existing profile IDs and option/node IDs drive the original `quick:`, `simple-option:` and `nested:` handlers.
- `destination-config.js` supplies the menu-only projection, optimistic comparison signature and active-layout validation shared by the page and service worker. Account/bucket identities participate in comparison; credentials do not leave the profile store or become writable menu fields.
- `saveDestinationConfig` accepts only the modern Explorer sender and serializes comparison, menu-field merge, persistence and `rebuildMenus`. It rereads current profiles to retain refreshed credentials, unrelated profile fields, and newly discovered profiles. A stale second window must Reload rather than overwrite a newer configuration.
- Save freezes editor controls; location verification must finish first. Storage failure keeps the draft. Native create callback failures and a five-second callback deadline produce a saved-but-menu-not-updated status; Save retries rebuilding. Existing storage listeners share the same rebuild lane, so they cannot interleave removeAll/parent creation.
- Keystrokes and adding cards remain drafts. Mode switching persists the shared mode immediately while preserving unsaved definitions. Save menu commits both destination configurations. The inactive layout is retained without requiring it to pass active-layout validation.

## Simple editor

Each + adds one independent local card, including before first-time setup. Cards have a label, account, bucket, paged folder chooser, explicit bucket-root action, final prefix, removal and keyboard-operated up/down controls. Folder browsing reuses `RedownDestinationMenus` and `cfDestinationFolders`, including continuation pages. Adding a card appends only its own DOM, preserving the other cards and their focus/scroll state. Bucket discovery is shared per account during the editing session. Unprepared discovered buckets are marked as requiring setup; the editor never provisions them automatically.

Existing primary entries retain `quick:<profileId>`. Legacy automatic-by-file-type destinations are labelled honestly until the user explicitly chooses a folder or bucket root; label-only edits retain their original routing. Removing one sets `simplePrimaryEnabled:false` without deleting its profile, Worker connection, folders or other entries. Extra entries retain their original `simpleOptions` identifiers. New optional `simplePrimaryOrder` and option `order` values allow ordering across profile sections. Absent values retain original section/option order. Changing an entry's account moves its same identifier to the selected account's prepared profile; a primary becomes an additional option and its old quick entry is suppressed.

## Nested editor

The existing location model/editor owns root and child selection, parent validation, inherited paths and children. Modern presentation hides remote bucket/folder creation; users choose existing locations. Optional root/node `label` fields affect menu text only, never R2 paths. Up/down controls reorder siblings. Initially collapsed branches materialize children on expansion; collapsing preserves descendants. Sendable intermediate nodes retain native Send here entries. Disabled or unselected nodes never become transfer targets.

Non-destructive legacy conversion runs in memory only when `nestedMenu` is absent and persists on explicit Save. Existing `nestedMenu` is never flattened or replaced when changing modes. The quick REDOWN setup operation no longer writes `rightClickMode:"simple"`.

The editor supports up to 500 locations in the active layout and eight folder levels. These are explicit implementation budgets, not claims about universal Chrome limits. Invalid paths, missing prepared buckets, duplicate IDs and unsupported hierarchy depth are rejected with actionable messages. Native platform failures are separately reported after persistence. Ordinary labels and destination edits perform no bucket creation, Worker deployment, public-access changes or object mutations. Preparing REDOWN storage remains a separate explicitly confirmed existing action.

## Navigation and compatibility

The sidebar Destinations dock continues opening this existing tab. Native Manage destinations and Set up a destination open modern Explorer at `#explorer-destinations`. A narrowly labelled legacy link appears only for existing experimental GitHub destinations, whose editor has not been migrated. The Cloudflare flow requires no Legacy visit.

The frozen historical project/debug/semantic evidence is not rewritten. Only the current Explorer architecture snapshot is refreshed with its supported generator.

## Verification

See `verification/modern-destinations/results.json` for exact commands, final focused counts and comparison with the unchanged starting source. Tests execute the production page scripts, shared model, service-worker save/rebuild functions and actual Simple/Nested click branches with local fixtures. They cover storage failures, stale concurrent windows, native callback failures/retry, exact transfer targets, primary suppression, account reassignment, inactive-layout preservation, folder browsing, first-run additions, labels versus paths, lazy hierarchy, sibling reorder and a 100-card single-discovery fixture.

No browser executable is installed at Playwright's configured Chromium path. Therefore installed Chrome native right-click interaction, screenshot/visual acceptance in all four themes, authenticated Cloudflare account discovery and live R2 transfers were not performed. Local menu callbacks and in-memory routing are not substitutes for those acceptance checks. No Cloudflare infrastructure or files were changed during verification. The wider suite has pre-existing failures and is not release-certified.

## Authoritative menu configuration repair (2026-10-30)


Explorer Right-click setup owns destination definitions and mode. The legacy settings page links to it, retaining storage/domain preferences and experimental GitHub configuration for other consumers. Legacy `menuTree` generation and click routing are removed from Chrome menus, including the gallery route. GitHub presets are no longer fabricated by Chrome; existing non-menu GitHub ingest remains available.

A missing Nested model is migrated into an editable draft once using `menuConfigVersion:1`. An existing empty model always wins. Explicit Save persists the version and model; a missing model on a versioned profile initializes empty. The first save also creates `menuConfigurationBackupV1`, containing only original menu fields and legacy trees, without credentials. This snapshot is never read to generate destinations. No migration writes remote folders or removes storage profiles. Old label-fallback preferences no longer override modern labels; blank labels derive from the deepest folder or bucket root. Existing undefined automatic primary prefixes become the explicitly displayed bucket root in the saved modern draft.

The builder collects a deterministic parent-first description, including stable identity and operation, before calling Chrome. Each creation callback must succeed before its descendants are created. Rebuilds remain serialized; partial creation failure clears the partial menu and Save reports that retry is needed. Clicks resolve current active saved definitions, exact account/bucket/prefix and a prepared storage profile; deleted, excluded, inactive-mode and legacy IDs cannot fall back to another destination.

A group is a profile's Nested menu definition, not the authorization record. Remove clears its roots and offers draft Undo; removing its last root removes the card. Include retains definitions while disabling them. Reload cancels unsaved deletion. Same-name accounts display bucket context and retain their stable IDs; authorization profiles are never deduplicated by label.

External mode-only updates rebase the editor's saved revision while retaining unsaved definitions. Profile-definition changes still require reload and fail stale optimistic saves. Tests and remaining browser limits are recorded in RIGHT_CLICK_AUTHORITY_REPAIR_HANDOFF.md.
