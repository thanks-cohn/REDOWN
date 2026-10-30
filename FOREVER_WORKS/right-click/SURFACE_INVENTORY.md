# Four separate surfaces

[Route](README.md)

| Surface | Owner/purpose/audience | Entry/lifecycle | Input → rendered/saved output | Authority/effects | Evidence |
|---|---|---|---|---|---|
| A Legacy settings | options.html/options.js; original dashboard/storage consumer | Options load and storage listeners; renderProfiles | Profiles/auth/mode → preference cards + Explorer link | Active allowlisted storage/domain/GitHub preferences; menu callbacks inert/not mounted | Source + isolation tests; historical source for former editor |
| B Modern setup | beta/explorer.html + destinations.js + shared Nested editor | #explorer-destinations / #quick-panel-setup; load, edit, Save/Reload | Cloned profile draft + discovery → cards; saved profiles/mode/backup | Active definition editor; explicit setup/activation can mutate infrastructure | jsdom/background mocks; actual installed parity NOT_TESTED |
| C Native Chrome | Background buildMenus and contextMenus.onClicked | Install/startup/storage/Save rebuild; click fresh resolve | Saved profiles/mode → descriptors, native menu owned by Chrome | Background defines IDs/parents/routing; Chrome owns flyout geometry; remote ingestion | Native callback mocks; no installed native verification |
| D Explorer file grid | Modern explorer.mjs showMenu; Legacy options.js showExplorerMenu | Row/empty-grid contextmenu, selection and busy/listing state | Current objects/clipboard → HTML command menu | Real copy/move/rename/delete etc; separate from menu setup | Explorer fixtures; provider acceptance open |

## DOM and module ownership

Modern HTML: quick-tab-setup / quick-tab-urls form tablist; quick-panel-setup is tabpanel. destination-mode, destination-profile, destination-add, destination-save, destination-reload form toolbar. destination-status is live status; destination-stage scrolls destination-simple / destination-nested. destination-first-setup is optional closed disclosure. HTML loads nested-locations, destination-config, nested-menu-editor, explorer-destination-menu, then destinations.js. quick-links.js owns setup tabs/dedicated-bucket/public-URL controls.

Legacy #right-click-presets visibly links to Explorer. Old mode/add controls are inside hidden/inert/aria-hidden container. #simple-menu-editor now renders Storage preferences; #nested-menu-editor-panel remains hidden. Imports do not imply active mount or writer authority.

Modern menu#context and destination-dialog/destination-form belong to **file-grid commands / Copy or Move to**, not native-menu configuration. Shared names are not shared authority. RedownDestinationMenus is an HTML lazy folder-picker used by Modern Simple selection and Legacy Explorer Move/Copy. Modern file-grid Copy/Move currently uses its own account/bucket/prefix dialog. Shared Worker/auth code does not make these one menu system.
