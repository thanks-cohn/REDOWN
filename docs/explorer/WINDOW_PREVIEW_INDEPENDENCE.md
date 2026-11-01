# Independent Window Preview and explicit Lightbox

Implementation branch: `codex/v3-parity-first-reconstruction`.
Inspected baseline: `8267986`. Integrated upstream documentation commit: `5572079`.

## Cause and implementation

The original `presentPreview()` moved one `#preview-viewer` between the side panel
and modal. Both presentations shared the item, abort controller, generation and
object URL. Opening or closing one could therefore consume or destroy the other.

Supported file double-clicks, including the existing Enter opening shortcut, now
invoke an independent Window Preview in the existing `#preview-dialog`. Single
click and selection remain separate. Opening does not write the saved preview
mode. Selection is painted and synchronized before opening, including keyboard
and programmatic double-clicks that did not deliver preceding click events.

`extension/beta/window-preview.mjs` owns each modal's controller, generation,
exact source/item, DOM, return focus and URL. `renderPreview()` is shared with the
existing side renderer, preserving the existing secure preview API and renderer
format choices. A stale read releases only its own late URL. Closing unloads
modal audio/video and revokes modal URLs. Opening pauses side media without
unloading it or resetting its playback position. Side content, requests, width,
scroll and open/minimized/closed state remain owned by the existing panel.

The side's labeled **Lightbox** button independently loads the current image in
`#immersive-preview-dialog`. This also supports folder and ZIP/CBZ reader pages
through their existing read APIs, with collection-local image navigation. Side
and archive resources are never lent to that dialog. Unsupported content disables
the action. Window Preview's own Lightbox action changes its non-destructive
presentation; Escape exits Lightbox first, then closes Window Preview. The
secondary dialog allows a collection reader to remain underneath its Lightbox.

Existing archive opening and reader navigation remain in place. Collection modal
keyboard handling remains scoped to the original reader. Tour/Test It observers
recognize independent window content and actual rendered events; test fixture
queries resolve the active surface, while explicit `#side-preview` queries remain
available to assert independent ownership.

Back, Forward and Up retain their handlers, IDs and accessible labels. Their
scoped 48px buttons now use 24px inline SVG arrows, accent-token filled gradients,
internal highlights, borders and shadows, plus hover, press, disabled and keyboard
focus states. Reduced motion disables transitions. Existing responsive toolbar
wrapping and side splitter remain in place. No dependency, framework, permissions,
transfer implementation, cloud configuration or protected tag was changed.

## Verification and evidence boundary

- Focused lifecycle/appearance command: **15 passed, 0 failed**.
- Focused production UI command: **5 passed, 0 failed**, including both archive
  reader modes, double-click/Enter across all three side states, a pending side
  read surviving window cancellation, and a side Lightbox returning to its exact
  image and opener.
- Complete requested-file comparison: original branch **142 tests, 123 passed,
  19 failed**; implementation **151 tests, 138 passed, 13 failed** before the final
  additional side-Lightbox test. All 13 failures were also present at baseline.
- Full unmodified branch: **805 tests, 734 passed, 71 failed**. The final full-suite
  and reliability comparison is recorded in the accompanying JSON. Historical
  source/evidence hashes and unrelated failing tests were not weakened or refreshed.

The focused commands were:

```sh
node --test tests/window-preview-independence.test.mjs tests/explorer-release-appearance.test.mjs
node --test --test-name-pattern='Side Preview Lightbox|double-click and Enter|opening and cancelling|default archive Image Reader' tests/beta-explorer.test.mjs
npm run reliability:check
```

These are Node/jsdom interactions and source assertions, not installed-Chrome,
real media codec, pixel/screenshot, contrast-measurement or live Cloudflare proof.
No Chrome binary was available in this execution environment. Actual supported-
theme and compact-viewport visual acceptance, installed-extension acceptance and
real-provider acceptance remain open. In particular the separate upstream
P1.2A premium Lightbox visual-overhaul note remains OPEN; this change does not
claim its required visual review or close its checklist.
