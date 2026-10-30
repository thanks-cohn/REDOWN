# Fresh setup surface

One `#v3-setup` owns all `v3-` controls. No historical editor DOM, cards, singleton context, CSS classes, event delegation or draft adapter is reused. Existing URL tabs are shared navigation, not a setup renderer.

The outline groups saved records by account and bucket, then recursively renders their meaningful folder parents with native keyboard-operable `details/summary`. Labels are editable independently; inclusion, sibling up/down, Add child, explicit red Delete and one-step deletion Undo remain visible. Search retains matching ancestors. A separate Add form chooses activated storage, outline parent, label and exact folder path. Browse uses read-only paged discovery. Creation of actual buckets/folders remains in existing Explorer controls.

Styles are scoped below `#v3-setup`; the form collapses to one column at a 500px container. Native inputs, explicit labels, focus outlines and live status are present. No new animation or dependency is introduced. The existing palette and typography are shared product foundations, not transplanted setup CSS.

Ordinary Chromium webpage fixture at 1100px and 390px: one mount, no horizontal document overflow, red Delete computed as rgb(197,34,50), no JavaScript page errors. Screenshots and metrics are in `evidence/`. This isolates the new setup using actual styles/UI code and synthetic data; it does not certify installed full-app themes, screen readers, all zoom levels or native Chrome menus.

Incomplete polish/parity: no drag reordering, inline reassignment of an existing target, durable Undo, native menu preview or separate flat V3 layout. Targets can be replaced through delete/add; V3 hierarchy is the current implemented menu shape. No old editor is reintroduced for these gaps.
