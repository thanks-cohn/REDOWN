# Setup removal audit

Compared with starting commit `bfbca3b185e1e81b81910c2fb2df7a7d3d99f79e`. Prior phase-3 control censuses remain frozen evidence; current source wins for implementation. `evidence/setup-retirement.json` enumerates actual removed function names and mount/style/event lines with historical source references.

| Old mount/import/style/event path | Disposition |
|---|---|
| `beta/destinations.js`: load, draft initialization, Simple/Nested mount, input handlers, Save/Reload/mode, activation callbacks, storage subscription | Source deleted; no HTML import; excluded from package; entirely new V3 view and transaction |
| `nested-menu-editor.js`: singleton mount/context, nested rows, add/create/delete, Undo, refresh/order, readiness and discovery callbacks | Source deleted; Options/Explorer imports removed; no compatibility display path |
| `beta/explorer.html`: `destination-*` toolbar, mode toggle, select/add/save/reload/status, Simple/Nested hosts, optional dedicated bucket controls, Legacy fallback link | DOM deleted, not hidden; old `quick-panel-setup` wrapper also deleted; single fresh `section#v3-setup` |
| `options.html`: old `right-click-presets` mount, hidden/inert mode controls, add-location dialog, Simple/Nested hosts, statuses, old editor/reorder/model imports | Removed; ordinary storage/domain preferences have their own `storage-preferences` section; navigation links to fresh V3 Setup |
| `options.js`: tree editor, Simple folder path editor/primary/extras, bucket creator, default-location builder, mode/add/dialog/order handlers, shared-editor refresh and setup caches | Removed rather than no-op hiding; upload's independently used folder/remote-prefix functions remain |
| `beta/explorer.css` / inline Options CSS: destination cards, toolbar, mode, stage, Nested cards/rows/outline/Undo/delete, old tree and setup reorder selectors | Rules removed; shared selector arms preserved only for ordinary upload/Explorer controls. New stylesheet uses only `#v3-setup` ownership |
| `beta/quick-links.js`: old dedicated REDOWN setup button/account/label/controller and setup completion dispatch | Setup-only writer removed. Existing account picker moved into URL tab. Tab controller maps setup to new root; URL methods, consent and URL tab remain |
| `menu-reorder.js` | No active page imports; excluded from package; source retained solely for existing standalone tests/history, never mounted by V3 |
| Background `saveDestinationConfig` message, function, profile projection/signature/old setup validators | Old UI commit entry point and setup adapters removed. V3 has its own revisioned transaction. Existing storage preference sender contract preserved |
| `destination-config.js` | Engine-only field preservation, path check and release click resolver retained; old setup projection/signature/validator removed |
| `nested-locations.js` | Runtime path/destination/menu projection and mode retained; blank/invalidation/selection/import/draft initialization adapters removed |
| Native `redown-nested-mode`, startup/storage menu rebuild and Legacy tree IDs | Engine-only; layout control unavailable/ignored under V3; fresh active-engine resolution prevents cross-engine dispatch |
| `explorer-destination-menu.js`, ordinary copy/move dialogs, upload path builders | Shared Explorer functionality retained. V3 setup does not import/use the old menu-picker presentation |
| `public-addresses.js`, domain/public-access handlers, URL selection/storage events, `quick-panel-urls`, Get URL workflows | Preserved shared/non-setup contracts. Exact comparisons in `url-preservation.json` |
| Sidebar destinations navigation, saved-object URL navigation, shared cloud-control tabs | Retained navigation contract pointing exclusively to V3 setup or unchanged URL tab; cannot mount retired editors |

The automated suite tests both engine settings, tab navigation, Reload, restart reconstruction, storage engine events and a single setup mount. Source checks reject retired identifiers/hooks and the real packager rejects any static dependency on deleted editor files. The actual ZIP includes the new domain/view/styles, Legacy runtime and Shelf Settings and excludes old setup/reorder code.

This establishes source/package isolation, not installed Chrome proof. Existing old UI tests remain visible failures and require dedicated test migration. No historical checkpoint, original audit, frozen evidence hash or tag was rewritten to conceal the change.
