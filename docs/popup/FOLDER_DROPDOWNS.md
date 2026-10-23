# Optional popup folder levels — 0.5.18

Baseline main: `3f595320fd8f0c305d3174196fff300a41389dd4`; the owner's detailed0.5.17
checkpoint remains unchanged. Only the toolbar popup's destination presentation is restyled;
production options/Explorer palette, menus and drag conventions are preserved.

The existing saved destination selector emphasizes the R2 bucket name. Cloudflare now has
one native folder dropdown starting at Bucket root, with an optional Go deeper control.
Selecting a folder enables another requested level. There is no two-level limit. Each added
level can remove itself and descendants; changing a parent discards descendants. A compact
Save to line reflects the exact selected destination. GitHub remains Beta-gated and retains
its category selector. This selects existing saved connections; it does not discover/provision
every account bucket merely by opening the popup. Existing Settings setup remains available.

Folder reads use the existing paged `cfDestinationFolders` handler. Each requested level
loads one page; Load more appends choices. Reads have a12-second UI deadline and generic
Retry feedback. Requests never create folders or deploy Workers. Bucket generation and
level identity reject stale responses; unrelated profile metadata updates retain the path.
Send is disabled while a folder read is pending. Native selects, named remove controls,
keyboard focus treatment and a bounded scrolling level area keep the popup compact.
No custom combobox framework, new dependencies or additional extension permissions.

The existing `ingest` message accepts an optional string `prefix` for Cloudflare. Explicit
empty string means bucket root; omission preserves the legacy category route. GitHub
continues using categories. The popup captures the destination at Send time. No navigation
click writes data, changes the stored profile or automatically transfers a file.

Related accuracy correction: historical remote-ingest Workers normalized folder paths,
including Unicode/reserved characters and repeated separators. Updated embedded Worker6
advertises the additive `exactIngestPaths` capability and honors `exactFolder:true` without
rewriting the supplied folder. Background checks this capability before writing paths that
an older Worker would normalize; unsupported Workers request explicit Repair before any
upload. Ordinary compatible legacy ASCII paths continue working. Existing filename handling,
collision protection and the post-ingest destination check remain. No live Worker was deployed
by this implementation session. Actual unusual-path use may require the owner's Repair action.

Architecture references and navigation smoke tests are discoverable through the existing
unified diagnostic gateway. Current menu-label and directory-safety assessments were
re-inspected and their current evidence deliberately revalidated; frozen historical evidence
and the seven baseline failures were preserved.

Verification: popup DOM/message regressions exercise deep nesting, removal/parent reset,
bucket and parent races, path retention after profile refresh, pagination/retry, explicit root,
GitHub/Beta compatibility and exact-path capability blocking before writes. The actual embedded
Worker is exercised against in-memory R2 for unusual-path preservation. See verification.json
for final counts. This environment did not verify the installed Chrome popup's native selects,
visual appearance, clipboard or live provider delivery; DOM/style checks are not visual or
installed-extension acceptance. Existing browser administrator-policy restrictions remain.
