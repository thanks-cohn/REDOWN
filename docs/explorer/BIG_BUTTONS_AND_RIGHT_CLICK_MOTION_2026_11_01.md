# REDOWN Explorer — Normal / Big Buttons and right-click motion

**Date:** 2026-11-01
**Branch:** `codex/v3-parity-first-reconstruction`
**Status:** Navigation-size preference implemented in source. Installed-Chrome visual verification OPEN. Right-click motion variation is only documented as future work.

## Problem observed in real Chrome

With the REDOWN Shelf docked on the right, the Explorer's main viewport is narrower. The 48 px glossy Back, Forward and Up directory controls take more room than necessary, forcing the breadcrumbs to wrap awkwardly while preserving little horizontal space for the current folder name.

The owner likes the **size-independent glossy styling, color and centered solid-arrow artwork**, but wants the default buttons to be as compact as ordinary toolbar controls. The larger presentation should be an explicit choice.

A separate observation: on some Chrome profiles, the context-menu Cloudflare item unexpectedly navigated to Home or appeared broken until REDOWN reloaded; later it suddenly worked without cache clearing or reinstalls. No verified causal connection to the most recent changes is established. Preserve the open startup/menu-registration investigation; do not assert that changing the navigation-size preference repairs the native menu.

## Shipped design contract

| Setting | Default | Buttons affected | Exact presentation |
|---|---|---|---|
| **Normal** (Big Buttons unchecked) | YES for new and legacy/undefined profiles | Only Explorer `#back`, `#forward`, `#up` | **36 × 36 px** filled, centered SVG; 20 × 20 px icon; existing glossy theme-dependent surface |
| **Big** (Big Buttons checked) | NO | Same three controls | **48 × 48 px** filled SVG; 24 × 24 px icon; original glossy theme-dependent surface |

- **Shelf Settings → Explorer appearance → Big Buttons** is the one source of truth.
- Stored under `chrome.storage.local.explorerBigNavigationButtons` as a Boolean. **Only explicit `true`** opts in. Missing, false or invalid values use Normal.
- Shared `extension/explorer-theme.js` reads this alongside existing appearance preferences, sets `document.documentElement.dataset.explorerNavigationSize` to `normal` or `big` inside Explorer, listens for Chrome storage changes and immediately updates all open Explorer tabs.
- CSS preserves the existing 48px theme-aware button design and applies only the smaller 36px dimensions and 20px SVG to Normal. The compact CSS is the **default even before preference hydration**, so a fresh profile does not flash large controls.
- **No change to arrow shapes, colors, weights, direction, hover, press, focus, disabled state or navigation commands.** Other buttons, breadcrumbs, files, Shelf, Right-click Setup and Chrome's native menu are not resized.
- This is the first choice in a possible future **Easy Navigation** group of accessibility controls; do not preemptively add more toggles or separate product editions.
- Breadcrumb wrapping should be checked in a window with Shelf docked open, narrow screens and different theme fonts. The size preference frees room but cannot guarantee a single-line breadcrumb at every viewport width. Preserve natural breadcrumb wrapping instead of clipping paths.
- Use standard keyboard operation and visible focus ring. At a reduced size, consider device-scale/zoom and accessible hit-target enhancements in a separately scoped follow-up if usability tests require it; do not silently force large controls against user preference.

## Source mapping

- `extension/shelf.html`: checkbox inside Explorer appearance.
- `extension/shelf.css`: checked/hover/focus styles matching existing settings controls.
- `extension/explorer-theme.js`: preference persistence, hydration and cross-tab live update.
- `extension/beta/explorer.css`: compact 36px default, original 48px big mode.
- `tests/explorer-navigation-size.test.mjs`: code-level/persistence regression tests (execute in Node test harness; real installed-Chrome visual validation remains required).
- `NEED_TO_DO/11012026.md`: P1.3/P1.3A and the P2.8 right-click animation follow-up.

## Right-click motion-speed future requirement (NOT implemented)

The user also requests that right-click-related animations **vary in speed**, using elegant anticipation, faster travel/response and settling, rather than one constant robotic speed. Implement this in REDOWN-controlled elements: Right-click Setup, animation feedback for Apply/save, or optional navigation/onboarding guidance. Timing may vary across themes if it remains coherent, and must honor `prefers-reduced-motion`.

**Chrome's actual native context menu is rendered by Chrome**, not REDOWN's HTML/CSS; CSS cannot change its animation speed. Do not claim to animate it. The future design should introduce documented, testable REDOWN motion tokens and keep actual save operations and native menu registration independent of visual animation delays.

## Pending validation / acceptance

1. New/old profile missing setting: 36px Back/Forward/Up on first paint; no large-button flash.
2. Toggle Big on Shelf: immediately 48px in open Explorer without reload or changing path; persists on reopen.
3. Toggle back Off: immediately 36px, original glossy colors and SVG retained.
4. Multiple Explorer tabs and supported themes: all reflect persistent choice, with no cross-tab race.
5. Compact/split/narrow screens: breadcrumb readable and usable, no clipping or accidental regressions.
6. Back, Forward and Up commands and keyboard/focus behaviors unchanged.
7. Real installed Chrome screenshot comparison required to close visual acceptance; source assertions alone are insufficient.
