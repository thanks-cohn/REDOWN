# Storage pop-out: measured causes and fixes

## Findings

The reported lag is consistent with the rendering structure reproduced locally at baseline `fb28366`. Earlier checks established stable tile dimensions, but did not measure the cost of painting/compositing the tile array. This investigation recorded actual Chromium traces and counters before choosing a fix.

1. **Nested 3D surfaces multiplied the layer tree.** Each stone used perspective, preserve-3d, four rotated/clipped sides, a raised face, a separately raised repair control and signal outline, plus filtered glyphs. The 12-bucket fixture created **173 layer-tree nodes**; 120 buckets created **1,687**. The view is directly overhead, so these separate 3D planes were unnecessary to present the visible bevel shape. A diagnostic flattened variant substantially reduced the layer count and frame gaps.
2. **The 220 ms height animation still recalculated page layout.** Keeping the inner grid fixed did not remove work caused by changing its ancestor's height. In the final comparison, the original 12-bucket open performed a median seven layouts. Making that height change instantaneous in a separate ablation retained the large layer tree and long frame gaps: shortening/removing the duration alone was insufficient.
3. **Animated clipping was also costly here.** A prototype with projected faces and an inset-clip animation removed most layers but still incurred significant raster work. A transform/opacity entrance performed better and was selected instead.
4. **Every cached bucket initially pulsed its circle and outline.** This was avoidable simultaneous filter animation during list loading. Source inspection confirmed this additional work; its isolated contribution was not separately quantified. Offscreen buckets also retained expensive rendering structures. The benchmark deliberately settled signals to idle to isolate expansion cost, so its improvement figures do not include eliminating the initial pulse wave.

No Cloudflare call is made on hover. This was a local rendering problem in the reproduced fixture, not demonstrated cloud latency. The user's installed browser/hardware has not been profiled, so this is not proof of every contributor on that machine.

## Implementation

- Render the same top-down square silhouette and sloping bevels as projected 2D faces. Keep stone veining, glaze, shadows, signal colors, selection and the independently clickable repair circle. Remove nested perspective/translateZ contexts and the tiny filtered glyph shadow.
- Use native `content-visibility:auto` with an intrinsic size for offscreen buckets. All real bucket DOM, accessible names, event handlers and scroll positions remain; no mock data or virtual replacement controls enter production.
- Keep the one-row anchor fixed. The scrollable expansion now **floats over following content**, rather than pushing the page down. This is an intentional interaction change to eliminate animated page reflow. It closes when hover/focus leaves; Escape returns focus to Refresh, and clicking outside releases focus. Clipped rows cannot intercept controls underneath.
- Open immediately, with a **100 ms transform/opacity entrance**. Height and clip boundaries are not interpolated. The expanded grid has one prepared transform layer, rather than a persistent layer for every face. Reduced motion disables the entrance.
- Fit the expansion to the content and available window height, avoiding empty extra space and offscreen controls. Geometry is read on entry/resize, never in an animation-frame measurement loop; unchanged fitted values are not rewritten.
- Cached/unverified buckets start with steady amber signals. A later attention transition following an operation still pulses briefly; repair, working and verified-success signals retain their behavior. Debug-only simulation and independent Beta/Debug settings remain unchanged.

## Same-process before/after measurements

Headless **Chrome 154.0.8037.57**, 1366 × 900, GPU disabled in this environment, synthetic 12/120-bucket fixtures, three focus-triggered opens per case, 480 ms sampling windows. Keyboard focus exercises the same CSS open state as hover. Both versions were measured in the same browser process, with a fresh page for each version/count and the final expansion controller explicitly checked; original signals were settled to idle for isolation. Reported numbers are medians across those three samples.

| Buckets | Measure | Before | After |
| --- | --- | ---: | ---: |
| 12 | Layer-tree nodes | 173 | 5 |
| 12 | Main-thread task time in sample | 41.88 ms | 26.84 ms |
| 12 | Layout count | 7 | 0 |
| 12 | Sample p95 frame spacing | 50.0 ms | 16.8 ms |
| 120 | Layer-tree nodes | 1,687 | 40 |
| 120 | Main-thread task time in sample | 191.14 ms | 95.84 ms |
| 120 | Layout count | 4 | 2 |
| 120 | Sample p95 frame spacing | 150.0 ms | 33.31 ms |

That is approximately **36% / 50% less main-thread work** and **97% / 98% fewer layer-tree nodes** in the 12/120-bucket cases. The remaining layouts include one-time fitting and newly visible content, rather than a page-height animation loop. Layer count is not a GPU-memory measurement.

The retained [complete samples](runtime/verification/storage-popout-performance/comparison.json) include first callback delay, outliers and trace aggregates. The 120-bucket after case still had a median maximum frame gap of **66.7 ms** in this software-rendered run. This is a substantial reduction, not a claim of zero lag, guaranteed 60 FPS, measured INP, or a field Core Web Vitals result. Short windows, tracing overhead, shared host load and disabled GPU limit absolute timing conclusions. The first-rAF delay is a scheduling proxy, not paint latency.

## Verification and reproduction

- **21 focused tests pass**. After preserving concurrent main changes through `c1b8a86`, full suite: **205 tests, 198 pass, seven fail**, no skips/cancellations. Six are historical catalog/debug/semantic failures; the seventh is the pre-existing Nested drag-handle test now failing because upstream `6c83427` intentionally removed the handles. The failure is a null `.reorder-handle` in `tests/nested-locations.test.mjs:229`; this performance change does not touch that implementation or weaken its test. Before integrating those upstream changes, the same performance implementation had 199/205 passing with only the six historical failures. Assertions and frozen evidence hashes were not refreshed. Syntax and whitespace checks pass.
- Ordinary Chromium rendered and exercised the actual UI handler functions with mock responses at 1366px and 390px. The following content and anchor moved **zero pixels**; the pop-out fit within the window. Tested real square/repair handlers against mocks, steady initial attention, success fade, all mode combinations, Debug-only practice, Escape/focus return, reduced motion, scrolling/focusing the last of 120 buckets, and non-interception by clipped rows.
- [Desktop resting](runtime/verification/storage-popout-performance/rest-1366.png), [desktop open](runtime/verification/storage-popout-performance/expanded-1366.png), [narrow open](runtime/verification/storage-popout-performance/expanded-390.png), [last row](runtime/verification/storage-popout-performance/long-list-last-row.png), [browser checks](runtime/verification/storage-popout-performance/browser-report.json), [focused tests](runtime/verification/storage-popout-performance/focused-tests.txt), [full suite](runtime/verification/storage-popout-performance/full-tests.txt).
- `npm run storage:preview` runs UI checks and screenshots. `npm run storage:benchmark` generates a current local fixture and records traces/counters in `work/storage-expansion-profile`. Both require local Chromium (override executable with `CHROMIUM_PATH`). Neither loads the extension nor accesses cloud services.
- Archived [before](runtime/verification/storage-popout-performance/before-fixture.html.gz) and [after](runtime/verification/storage-popout-performance/after-fixture.html.gz) HTML fixtures are fictional mocks with embedded copies of the existing bundled font (license: `extension/fonts/OFL.txt`). Decompress with Python/gzip to local files, then reproduce the comparison with `node scripts/storage-expansion-benchmark.mjs /path/after.html work/comparison --compare /path/before.html`. Fixture digests are in the report. This archives a new experiment; it does not update frozen project evidence.
- Representative first stress-case traces: [before](runtime/verification/storage-popout-performance/120-before-first-trace.json.gz), [after](runtime/verification/storage-popout-performance/120-after-first-trace.json.gz). Decompress and load in Chromium's Performance panel. All twelve sample summaries and the separate [causal ablations](runtime/verification/storage-popout-performance/diagnostic-ablations.json) are retained; the benchmark regenerates raw traces for every sample.

Installed-extension loading remains blocked by administrator policy; it was not bypassed. No live Cloudflare/GitHub operations, release deployment or user-hardware performance pass is claimed. Existing license/release blockers remain in [readiness](runtime/READINESS.md).
