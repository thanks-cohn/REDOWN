# BUG: Shelf mascot ball click fails; ball disappears and/or changes color after delay

**Reported:** 2026-11-01 (owner observation)  
**Repository / branch:** `thanks-cohn/REDOWN` / `codex/v3-parity-first-reconstruction`  
**Priority:** P1, interactive Shelf UX regression (provisional)  
**Status:** OPEN — reported, NOT independently reproduced or fixed  
**Surface:** Chrome REDOWN Shelf, clickable mascot/orb/ball control

## Owner-reported behavior

In the latest REDOWN the **ball on the Shelf does not respond correctly to a click**. The owner says it **disappears** and, after a few seconds, **only changes color**. The owner is unsure why this happens. The exact order, timing and conditions of disappearing versus color-changing have not been independently established; preserve both symptoms, do not guess an underlying cause.

## Expected behavior

- Clicking the Shelf ball reliably triggers its intended visible and interactive response, as defined by the current implemented mascot behavior.
- The ball must not unexpectedly disappear, become unclickable, silently reset, or change color after a delay unless an intentional, documented animation calls for it.
- The Shelf remains usable across its open/close lifecycle, current themes, and extension restarts. Mascot reactions should not block or delay unrelated navigation, transfers, or controls.
- If a color response is intentional, the click outcome must be perceptible, coherent and correctly timed; if a toy/interaction feature has not been implemented yet, avoid displaying a misleading active affordance.

## Reproduction to confirm in installed Chrome

1. Open the latest REDOWN Chrome extension and the Shelf.
2. Locate the mascot ball/orb; observe whether it renders consistently on initial load.
3. Click the ball once, then repeatedly under normal and changed themes; record what happens immediately and at 1, 3, 5 and 10 seconds.
4. Observe whether the ball disappears, changes color after a delay, loses its hit target, or fails to fire the intended interaction.
5. Close/reopen Shelf and restart extension service worker/browser; retest in applicable themes and narrower window sizes.
6. Compare behavior with current interaction specification and last verified working build. Capture console errors and timing only if safely reproducible.

## Investigation guidance (no diagnosis established)

Inspect Shelf mascot DOM/CSS and click handlers, pointer-events/z-index and overlays, animation opacity/display/visibility, theme transition delays, event listener registration / re-render, and timers or state transitions after Shelf activation. Investigate whether the delayed color change is a separate theme/animation behavior rather than the click reaction. Verify that the element's effective bounding box and listener survive rerender.

## Acceptance

1. Ball remains visible, focusable/clickable and correctly positioned when expected.
2. A click invokes the intended action once and gives immediate, understandable feedback; no unplanned disappearance or arbitrary delayed color-only response.
3. Works after Shelf open/close, extension reload, across all existing themes and keyboard activation if presented as a control.
4. No side effects on saving, history, V3 right-click menu authority, provider/OAuth integrations or the existing Boot engine.
5. Confirm in real installed Chrome; automated unit checks alone are insufficient.

**Scope:** Bug record only. No executable code changes, root-cause claim, or claim of testing/fix.
