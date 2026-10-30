# Historical Legacy presentation and usability evidence

[Route](README.md) · [Modern comparison](MODERN_PRESENTATION_AND_BEHAVIOR.md) · [Map V](PRESENTATION_AND_CSS.md)

Historical source515c272c48f89eb3f509fa2c7a5a02e0db53f66b is a reference checkpoint, **not a verified universal working installation**. OWNER_REPORT says Legacy worked for this owner. Current Legacy renderProfiles no longer emits those menu editors; it links to Modern and renders storage/domain/GitHub preferences. Historical renderers were extracted only into isolated fixtures.

## What made Legacy intuitive — observable structure, not invented preference

- A Simple level visibly grouped existing-folder dropdown, separate new-directory input, explicit Create, +Child and × in one row. Dropdown did not populate creation input. These controls made selection versus creation and their parent scope observable.
- Simple row × cleared selected segment and dependent values while keeping lower blank rows available. It did not remove cloud data; this differs from Modern whole-card deletion.
- Nested column headings explicitly separated Existing location, Create a new location here and Actions. Bucket/folder input and Create belonged to the same row. The selected full path appeared directly below it.
- Existing selection called autosave; D1 reproduces saved prefix photos after debounce without a separate Save-menu click. That fits an immediate apply expectation, but is not proof of perfect asynchronous registration.
- Expanded recursive rendering exposed descendants and initiated discovery; Modern lazy collapse can hide an unready imported child that still blocks validation.
- Legacy whole-profile autosave could overwrite unrelated concurrent edits; deep native builder flattened beyond shallow folder depth; old tree authority could revive old definitions. These are weaknesses, not usable parts to restore.

## HTML/CSS ownership

options.html inline styles own Legacy; Modern explorer.css never inherits them. Historical Simple .simple-location-row uses five-column scoped grid with compact Create/Child/clear. At<=650px selectors/inputs span full row and actions reflow. .nested-columns/.nested-location-row use three columns, two at<=800px and one at<=520px, headings hidden at narrow width; indentation reduces at deeper levels. Focus uses legacy purple token. Some fixed navy colors contrast with current token-based variants. Source declarations are not aesthetic approval or measured contrast.

Current source preserves these unused legacy selectors/callbacks as evidence/private compatibility material; absence from current render tree does not invalidate historical functionality. Restore control ownership principles only after owner review, not all old CSS, autosave or writers.

## Captured reconstruction and limits

[Wide](evidence/phase-2/legacy-wide.png), [narrow](evidence/phase-2/legacy-narrow.png), [panel-constrained](evidence/phase-2/legacy-panel.png); [measurements](evidence/phase-2/legacy-layout-measurements.json). Chromium154 isolated HTML, historical inline stylesheet, actual extracted Simple primary constructor and historical Nested renderer, synthetic account/bucket, denied mutations. It is not the full historical dashboard or installed native menu.

Viewport1440×1000 /320×800 /wide viewport with320px fixture wrapper yielded panel1100/273/320px and no document horizontal overflow in these captures. Wrapper display:block/16px padding and scrollbars affect sizes. Long account text and multi-level selection were included; five laid-out remove/clear controls counted across Simple and Nested. They are not all guaranteed visible in a scrolling viewport. No screen-reader/fulltheme/touch acceptance is claimed.

[Reproduction source](evidence/phase-2/REPRODUCTION.md) preserves extraction commands and capture scripts as non-executing documentation. Current screenshots do not override the owner's reported dissatisfaction.
