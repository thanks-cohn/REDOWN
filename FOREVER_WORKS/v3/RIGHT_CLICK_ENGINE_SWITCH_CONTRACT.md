# Engine ownership

Settings → Right-click engine offers persisted `legacy` and `v3`, with an explicit Apply button. Every engine displays the same V3 Setup in Explorer. Legacy status explicitly states V3 edits do not control its menu. Existing release behavior remains the default until the user selects V3.

`setRightClickEngine` accepts only the exact extension Shelf, Options or Explorer page URL (query/hash excluded). `saveRightClickV3` accepts only Explorer. Both serialize with infrastructure/menu preference transactions through `destinationSaveQueue`. V3 saves never write Legacy profile menu fields; switching never rewrites either configuration.

One queued native builder removes old entries and awaits parent-first Chrome callbacks. Engine-specific IDs are resolved against fresh stored engine/configuration at click time. Old-engine, deleted, disabled, stale branch-action and unsupported IDs cannot fall back to a default destination. Native layout checkbox only changes Legacy layout and is absent/ignored for V3.

Receipt `{ok:true, revision, engine, menuUpdated}` distinguishes saved settings from registration. A failure after persistence returns `menuUpdated:false`; Apply/Save can retry registration. `rightClickMenuStatus` records registered/failed state for restart-visible Settings feedback. Registered means callbacks acknowledged, not actual native rendering. Restart rebuilds the selected saved engine. Failed rebuilds can leave an empty menu; there is no claim of atomic Chrome menu replacement or automatic rollback.

Pre-v1 Legacy trees use saved node IDs and explicit leaf prefixes only when no versioned nested model exists. Existing versioned emptiness wins. Parent containers do not dispatch. No legacy setup UI or setup writer is loaded to support this boundary.
