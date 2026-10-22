# Three-stage repair — 22 October 2026

## Stage 1: contained expansion

Root cause: the previous performance patch absolutely positioned the full grid over a fixed one-row parent and raised the Storage stacking context. The next section never received space for expanded content.

The scrollport now participates in normal document flow. Its parent grows with it; following sections move by the same height delta. A long collection scrolls inside that region. Removed Storage stacking overrides and clipping overlay. Retained the projected bevels, stone surfaces, tile dimensions, signals, primary/repair actions, one-row rest, focus/hover behavior, Escape, and 100ms transform/opacity entrance. No per-frame height transition or layout loop. Fitting uses the first row as its minimum, so resizing an already open collection can shrink it.

Validation: `npm run check` passed; scoped storage-signals/options-debug-display tests passed. `node scripts/storage-signals-preview.mjs work/three-stage/stage1` passed ordinary installed Chromium rendering/interaction checks with **mocked messages/storage**, not an installed extension. Tested one, 12 and 120 buckets at 1366×768 and 12/120 at 390×844. Containment, downstream displacement, unchanged tile geometry, last-row access, Escape, reduced motion, existing signals, simulation isolation and independent modes passed. Inspected the desktop rendered image; screenshots and exact assertions are under `runtime/verification/three-stage/stage1/`. No installed-extension or live Cloudflare result is claimed. Existing administrator policy still blocks unpacked extension installation.

Stage 1 changes: `options.html`, `storage-signals.js`, local preview harness and geometry regression test, this report and current AGENTS guidance. Historical performance report describes the earlier overlay and is superseded for layout only by this correction.
