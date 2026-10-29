# Celestial Shelf theme selection

Implemented on `release/cloudflare-true-remote`, extending destination-studio commit `284d83079f4be52757cfc1e1caf40f47fc241af1`. `BASE-102926` remains `bd1927696e4e22dd8ee075e361be63485fd907b9`.

## Destination foundation reused

The existing modern Right-click setup tab, Simple/Nested switch, local draft cards, `simpleOptions`, `nestedMenu`, `RedownNestedEditor`, shared destination validation and serialized `rebuildMenus()` remain authoritative. The destination implementation is documented in [MODERN_DESTINATIONS.md](MODERN_DESTINATIONS.md). This change does not replace that engine or introduce provider mutations. The Destinations dock and native Manage destinations route remain modern Explorer routes.

## Animation ownership

`shelf-celestial.js` installs adjacent theme buttons around the existing moon. The three alternatives always exclude the applied palette. Pointer hover and keyboard focus expose the tray; Escape dismisses it. Touch first reveals the tray, and a subsequent moon activation toggles light/dark. Buttons remain siblings, never nested controls. The moon describes the current palette to assistive technology.

The bounded director captures the target palette before starting. It removes the source ring, creates one pointer-transparent fixed overlay, and animates a colored core using Web Animations. Moon activation uses an SVG crescent, a narrow gradient sweep clipped to that exact shape, temporary red illumination, and a normalized circumference stroke. The moon's original control keeps its layout position.

The active view supplies the actual inline target: Future in Remote Cloud, PERSONAL in History, HOME in the existing small Settings eyebrow. Endpoint rectangles are read before flight. `flightModel()` integrates vertical position and velocity analytically with 560 px/s² downward gravity. It replaces all cubic trajectory control points and global path easing. A small first rise has a one-pixel, 100 px/s² apex band; the rebound uses a maximum five-pixel, 45 px/s² apex band. Velocity stays continuous at band boundaries and passes through zero at both apexes. This explicit artistic gravity adjustment creates suspension without frozen frames. Outside those tiny regions, both falls accelerate under constant gravity.

The rebound energy is bounded by a 0.68 restitution factor and available headroom. The bottom of the 24 px object meets the measured word top. A 105 ms contact pose compresses the object by 12%, widens it by 9%, and shifts its center slightly to keep its lower edge against the reacting word. Word displacement and the glint start at the same exact document-timeline collision epoch as the flight's contact frame. The word reaches maximum displacement at maximum ball compression. A brief 140 ms maximum launch impulse creates lateral momentum, followed by constant horizontal velocity until impact. No artificial sideways acceleration or braking occurs while airborne; rebound drift remains modest. The final fall reaches a center 40 px below the viewport before a cancellable 150 ms pause, overlay cleanup, and the existing `setTheme()` call. A representative 390×780 geometry takes about 4.29 seconds of flight/contact, plus preparation and the final pause. Timing adapts to actual distances rather than fixed path playback durations.

Both objects use this same model. Lunar shimmer/red illumination (520 ms) and circumference tracing (540 ms) are preserved. Playback uses one precomputed transform animation, sampled at 120 Hz with exact segment/apex/contact boundaries, plus two bounded collision effects. There is no physics dependency or permanent rendering loop. Existing view transitions, saved dark preference, icon styling and Explorer-follow behavior remain in `shelf-theme.js` and `explorer-theme.js`.

Reduced motion and missing animation APIs commit directly. Additional clicks during a sequence are ignored. Settings palette choices and external saved-theme updates invalidate an older sequence so it cannot overwrite them. Resize, visual viewport resize, route changes or backgrounding terminate decoration and finish the captured selection; pagehide cancels without a delayed commit. Geometry is not recalculated every frame. Missing or offscreen titles skip the decorative impact. Every temporary animation, overlay, transient event listener and pause timer is cancelled or removed. Storage failures use the existing rollback/status mechanism. Independent Explorer palette fields are never written by this feature.

## Historical verification before gravity repair

- `node --test tests/shelf-celestial.test.mjs tests/modern-destinations.test.mjs`: 21 passed, zero failed. Tests execute production director/theme scripts and the destination page/save/menu functions with mocked browser/provider interfaces.
- Seven new tests cover all three target words, commit ordering, alternative palettes, keyboard dismissal, shape-clipped lunar shimmer and tracing, bounded re-entry, interruption/supersession, cleanup, reduced motion, absent APIs, independent Explorer settings, remembered dark palette, storage rollback, touch reveal, view changes and page closure.
- The broader menu/auth selection executes 54 tests: 37 passed, 17 failed, identical to the unchanged `284d830` checkout. Failures include stale importScripts harness assumptions and the removed Nested drag-handle expectation. These do not establish live authentication or transfer success.
- The existing Shelf suite has three failures on both changed and unchanged source: obsolete provider order, obsolete Explorer controls and toolbar side-panel expectations.
- The unchanged full suite executes 623 tests: 530 pass and 93 fail. `npm run reliability:check` executes the updated suite with 536 pass and the same 93 failure names; syntax, architecture, API registry and issue inventory stages pass. Its overall result is failed/release blocked, because its older recorded baseline recognizes only seven of those existing failures. The seventh new scenario was added afterward and passes in the 21-test focused run. Exact evidence is in `verification/celestial-themes/results.json`.
- `npm run check` passes. Direct syntax checks cover the director, theme integration and browser preview script.
- `scripts/shelf-celestial-preview.mjs` prepares a nine-case ordinary Chromium fixture at 320/390/480 px across all views, checking tray bounds, target impact, overlay removal before persistence and zero remaining animations. Its attempted execution failed at browser launch because `/usr/lib/chromium/chromium` is absent. No screenshots, visual acceptance, browser performance measurements, installed-extension native context-menu verification or live Cloudflare transfers are claimed.

Performance is structurally bounded: one temporary overlay, short transform/opacity/SVG animations, a fixed set of geometry reads, no animation framework, no permanent requestAnimationFrame loop, and no ongoing decorative work after cleanup. Low-end hardware responsiveness and aesthetic timing still require real Chrome review. Fixture results are not a release certificate.


## Historical two-arc refinement, 29 October 2026 (superseded and rejected)

The sphere and crescent share the same geometry and lifecycle. The approach crest is constrained to remain inside the top of the viewport. Rebound direction points toward the roomier half of the Shelf; lateral travel adapts to its width. Each curve has 61 transform keyframes, generated once. No physics dependency or permanent rendering loop was added. Lunar shimmer/illumination now takes 520 ms, followed by a 540 ms circumference trace, before either arc begins. Existing menu, Cloudflare, theme persistence and Explorer independence implementations are untouched.

Focused production-script tests: 22/22 pass, including the existing Simple/Nested destination suite. Assertions now cover curve sample counts and timing, the exact contact endpoint, upward travel, a rebound apex, a below-viewport endpoint and nonzero lateral motion in the last segment. Existing interruption, reduced-motion, save-failure and independent-theme tests pass. The ordinary-browser fixture now asserts both curved trajectories at every size/view; it remains unexecuted because this host has no Chrome/Chromium binary. A Playwright browser installation was attempted but returned invalid/truncated archives. No real-browser aesthetic or low-end hardware verification is claimed, and visual acceptance remains pending.


The refinement reliability run completed with 537 passing tests and 93 failures. Syntax, architecture, API registry and issue inventory stages passed. The failure count matches the earlier documented 93-failure checkpoint, but no fresh unchanged-branch comparison was run; this does not prove every failure is baseline. The regression policy classifies 86 as outside its old seven-failure baseline, so overall reliability remains failed/release blocked. Final curve polishing and the additional dimension test were validated with a fresh 22-test focused run and syntax checks after that broader run.


## Gravity repair, 29 October 2026

Repaired in place from `9d0fa0fffc70db238cae2a59496d29ced3964023`. Protected tags remain `BASE-102926` → `bd1927696e4e22dd8ee075e361be63485fd907b9` and `PRE-CELESTIAL-ARCS-102926` → `c22102159d0dbd834f60aa72cf4acbbbb693975e`. No destination editor, provider/account code, HTML, CSS, or theme engine changes.

Fresh focused verification: `node --test tests/shelf-celestial.test.mjs tests/modern-destinations.test.mjs`: **23 pass, 0 fail**. `npm run check`, direct preview-script syntax, and `git diff --check` pass. Production-model tests check downward acceleration, zero apex velocities, continuous ascent/descent around the longer apex, measured impact, downward/upward reversal, bounded restitution, offscreen exit, and widths 320/390/480 with heights 520/780/900. Director tests check shared animation epoch/delays, exact collision frame, persistence ordering, cancellation during flight and the post-exit pause, cleanup, reduced motion, touch, route/page interruption, lunar preparation, and independent Explorer preferences/storage rollback. These tests do not establish aesthetic acceptance.

**Real Chrome was not used. Aesthetic acceptance remains unverified.** The local browser fixture fails to launch because no browser binary is installed. A Playwright Chromium installation was attempted and failed with invalid/truncated ZIP archives. No screenshot/video/performance success is claimed.

### Reproducible visual review

With Playwright available to Node (installed locally or through `CODEX_PRIMARY_RUNTIME_NODE_MODULES`), run:

```sh
# Optional when a local browser is already installed:
CHROMIUM_PATH=/absolute/path/to/chrome node scripts/shelf-celestial-preview.mjs
# Or install Playwright's browser first, then:
node scripts/shelf-celestial-preview.mjs
```

The ordinary-browser fixture uses actual Shelf HTML/CSS/director/theme scripts and mocked storage only. It prepares **18 cases**: both orb and crescent on FUTURE/PERSONAL/HOME at 320/390/480 px. Each case records a WebM and selector/fall screenshots in `work/celestial-preview/`, checks collision-frame alignment and post-cleanup persistence, then checks no animations remain. Watch each recording at normal speed to judge both suspensions, fall acceleration, contact, rebound, final exit and overall charm. This workflow has not completed here; it is not installed-extension or live-provider verification.


Broader `npm run reliability:check`: **539 pass, 93 fail**, completed without timeout. Syntax, architecture, API registry and issue inventory stages pass; overall reliability fails and release remains blocked. The failure count matches earlier documentation, but no fresh unchanged-checkout comparison was performed, so identical baseline failure membership is not claimed. The focused suite was rerun after final assertion/geometry hardening and still passes 23/23. Exact failure names and scope are recorded in [gravity-results.json](verification/celestial-themes/gravity-results.json).


## Initial arc inertia polish, 29 October 2026

The owner reported that the restored animation still looked as if an invisible hand were dragging the sphere sideways. The cause was the approach's cubic smoothstep horizontal interpolation: it accelerated the object horizontally halfway through the fall and artificially braked just before impact. This refinement removes that midair steering. A short (up to 140 ms) acceleration at release supplies horizontal momentum; thereafter X moves at a constant speed, while existing gravity alone changes vertical velocity. The initial rise uses up to 20 px of visible clearance above the source center rather than 14 px. Flight still lands precisely on the measured title, with the synchronized squash/glint, suspended apexes, rebound, exit, existing lunar prelude, persistence and cancellation unchanged.

A targeted model regression test covers early mostly-vertical motion, constant horizontal momentum through impact and correct targeting at 320/390/480 px widths and 520/780/900 px heights in both horizontal directions. Isolated model assertions are possible without a browser, but final visual smoothness requires a real Chrome review. No new real-browser verification is claimed by this documentation.
