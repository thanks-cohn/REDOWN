# BUG — Side Preview Lightbox label is cramped/overflows at narrow widths

**Observed:** 2026-10-31 (owner's Chrome screenshot, Shelf open at right)
**Repository:** `thanks-cohn/REDOWN` · **Branch:** `codex/v3-parity-first-reconstruction`
**Severity:** P1 visual usability · **Status:** OPEN, documentation only
**Surface:** REDOWN Explorer → Side Preview → preview header

## Observed behavior

With REDOWN Explorer sharing horizontal space with the Chrome Shelf and a file selected for Side Preview (example: `images.jpg`), the preview header contains a mode selector ("Side Preview"), minimize, **Lightbox**, and close controls. At this width the **Lightbox text is clipped/cramped** and appears as a truncated button jammed between the other controls.

The owner wants the **Side Preview header's Lightbox action to become a compact, premium icon**, not a word shoved into insufficient space. This is a narrower-surface presentation requirement. It does not revoke the owner-approved goal that the immersive action be recognizable as Lightbox.

**Evidence:** Owner-provided Chrome screenshot in the 2026-10-31 conversation, Explorer with Shelf occupying the right side of the browser. Screenshot is not stored in this Git repository by this documentation-only change.

## Expected behavior

- **In Side Preview:** the Lightbox action should use an attractive, dedicated, easily distinguished **icon-only visual treatment** when space is limited, rather than long text that overflows.
- Retain `aria-label="Open Lightbox"` (or equivalently clear name), `title="Lightbox"`, accessible focus and a tooltip; tooltip/text label can appear in broader layouts or elsewhere if useful.
- The icon must remain an actual functional Lightbox action opening immersive dark media, not an icon for Window Preview or an ordinary expansion.
- Do not let mode dropdown, minimize, Lightbox or close controls overlap, clip each other, or cause horizontal overflow.
- Use graceful adaptive spacing, prevent controls from shrinking below legibility, keep the selected file title accessible/wrappable, and preserve keyboard/focus behavior.
- Match active REDOWN theme; keep the bespoke premium visual character, including hover and press states.
- No changes to preview lifecycle, selection, provider IDs, media loading, scrollbar behavior or file navigation just to fix the header.

## Reproduction

1. Open REDOWN Explorer in Chrome and keep the REDOWN Shelf side panel visible.
2. Set Explorer to Side Preview; select an image so the preview header is populated.
3. At the narrow central workspace width, inspect controls immediately beside the Side Preview selector.
4. Observe the visible Lightbox label truncating/crowding the minimize/close controls.

## Regression/acceptance criteria

1. Test wide Explorer, narrow Explorer with Shelf open, resized Side Preview, browser zoom at 100/125/150%, and every existing theme.
2. In narrow Side Preview, Lightbox has an icon, a full accessible name and a working tooltip with **zero** cropped text, collisions, clipped buttons or sideways scrolling.
3. Lightbox opens the immersive viewer; closing returns to the intact Side Preview.
4. Keyboard and screen reader users can find and activate Lightbox.
5. Window Preview and immersive Lightbox header/close controls still function and need not use the same compact-only treatment.

## Implementation guidance (future Codex repair, not executed here)

Inspect `extension/beta/explorer.html`, `extension/beta/explorer.css`, the current side/window preview controller and any later overrides. Prefer a small responsive icon/label rule and an intentional flex/grid layout over widening the Side Preview by force. Verify visual output in installed Chrome; a test for element existence is insufficient.

**Scope of this commit:** BUG REPORT ONLY. No app code or tests executed by recording this report.
