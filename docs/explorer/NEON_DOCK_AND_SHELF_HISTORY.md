# NEON entrance, Explorer dock and Shelf History

Implemented on `release/cloudflare-true-remote`, based on `a50737259afa0fa69f12a13b004ea0230b5c9497`. The owner’s October 29 master request authorizes the entrance and navigation work separately from the earlier Ideas-only proposal. The unified brand icon and procedural geometry proposals remain deferred. `BASE-102926` is unchanged (tag object `bd1927696e4e22dd8ee075e361be63485fd907b9`).

## Behavior

When the effective saved Explorer palette is NEON, supported foreground browsers show the final NEON layout with a white architectural presentation. A one-second iridescent beam moves from right to left. At 1.05 seconds the existing 4.1-second, bottom-left / delayed top-right View Transition reveals the final palette and real content spatially. White changes colors and shadows only, preserving final fonts, spacing, borders and geometry. It is not the Porcelain palette. The bundled Explorer font is preloaded; font readiness is bounded to 700 ms and a still-loading font bypasses the cinematic entrance.

One temporary SVG contains at most 40 visible container outlines. A separate snapshot in the same View Transition uses the same wave radii with a narrow annular mask, lighting edges at the arrival boundary. No per-control timers, JavaScript frame loop, particles, external animation dependency or duplicate interactive DOM is introduced. Completion removes the SVG, timers, entrance attributes and cosmetic event listeners. Reduced motion, missing rendering capabilities, a hidden tab, errors, resize, scroll, keyboard or pointer activity reveal the correct finished palette directly. A 6.5-second watchdog bounds the entrance; a 2.5-second storage watchdog prevents permanent boot hiding. Late resolved preferences remain authoritative. Ordinary palette changes keep the existing liquid transition without replaying the white/shimmer introduction.

The sidebar uses a sticky viewport-height flex container, one independently scrolling upper region, and a three-item bottom dock: **History, Destinations, Settings**. Narrow windows use a bounded-height sidebar and compact horizontal dock. Three small SVG icons are generated once from local primitives and use Explorer palette tokens. Bucket setup, transfer preferences and logout remain in the upper sidebar. The account recovery action retains the existing connect handler; there is no Connect Cloudflare dock button.

History and Settings synchronously call the existing side-panel API within the user gesture and send a short-lived, window-scoped `shelfOpenIntent`. An already open Shelf consumes the request in place. Missing or failed side-panel support falls back to a Shelf tab, reusing an existing tab when found. Destinations opens the existing `options.html#right-click-presets` manager, also reusing an existing options tab. No destination settings or provider operations were replaced.

Shelf now has Remote Cloud, History and Settings routes. History reads only `chrome.storage.local.transferHistory`, grouping numeric timestamps by local year, month and day, newest first. Year/month disclosure groups use native keyboard-accessible details/summary elements. Invalid dates appear under Unknown date. Metadata is rendered as text, never HTML. Recorded failures stay failures; accepted operations without an existing delivery location are explicitly completion-unverified. A recorded success is not presented as fresh cloud verification.

Persistence is unchanged: the existing writer retains up to 50 records and may replace recent same-source failures after success. This is not a complete audit or durable transfer journal. Older discarded records cannot be recovered. Explorer uploads/copies that do not enter this store are not invented. The screen states these limits. Rendering is lazy on the History route, cached across unrelated Shelf updates and paged in increments of 100 DOM rows if an unusually large retained dataset exists. The original records are not rewritten.

## CSS and performance audit

Removed the unused old sidebar Settings accordion styles, old lower-sidebar styles and obsolete Settings launcher styles. Removed the broad color/background/border/shadow transition blanket: the existing root View Transition already owns palette transitions. Kept deliberate theme-specific heading/brand/file-icon rules, account-discovery feedback and file-operation/test states. Restricted white-state shadows to major containers. No claim is made that stylesheet length measures runtime cost.

The Shelf theme controller and its liquid theme animation are unchanged. The brand assets, Cloudflare Worker, OAuth, destination persistence, transfer writer and file-operation API are unchanged. The previous History JSON modal handler is removed in favor of the Shelf route.

## Executed verification

Linux, Node 24.22.1; installed dependencies using the committed lockfile, with no lockfile changes.

- Pre-change `npm test`: **581 tests, 549 passed, 32 failed**.
- Final `npm test`: **595 tests, 563 passed, the same 32 failing test names**, no skips. Direct before/after comparison found no new failures or resolved baseline failures.
- `node --test tests/explorer-neon-history.test.mjs tests/explorer-first-paint-and-url-cards.test.mjs tests/explorer-release-appearance.test.mjs`: **21 passed, zero failed**. Fourteen new tests cover match/custom startup, sequence, fallbacks, lifecycle cleanup, theme interruption, scoped Shelf intents, dock routing/fallback, real-record sorting/status, local-midnight grouping, empty/error/retry and bounded large-history rendering. Existing first-paint and URL-card checks remain passing.
- `npm run check`: passed, including the new History script.
- `npm run explorer:smoke -- --preset all`: **217 tests, 199 passed, 18 failed**; all 18 names also fail in the pre-change full baseline.
- `npm run reliability:check`: **failed**, not release-certified. Syntax, API registry and issue inventory stages pass; the pre-existing stale Explorer architecture references fail. Its stored regression allowlist is older than this branch’s actual 32-failure baseline and therefore labels some already-existing failures “new.” No frozen hashes, original assertions or baseline allowlist were refreshed to conceal that debt.
- Required diagnostic onboarding queries and Forever Works describe completed. Release-readiness inspection reports blocked beta, release candidate and public launch gates.
- `git diff --check`: passed.

These are Node/VM/JSDOM and source-contract checks, not rendered-browser proof. No Chrome executable was present. Playwright Chromium installation was attempted, but the download repeatedly produced an invalid/truncated archive and failed. Installed-extension rendering, first-frame screenshots, actual side-panel gestures, subjective shimmer/glow quality, frame timing, memory, throttled/4 GB hardware and live Cloudflare operations remain **unverified**. No cloud mutation, Worker deployment or provider acceptance test was performed. The implementation needs actual Chrome visual acceptance before claiming the requested cinematic quality or low-end performance is proven.
