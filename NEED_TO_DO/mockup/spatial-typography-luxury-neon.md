# REDOWN mockup — Spatial Typography / Luxury Neon
**Date:** November 3, 2026  
**State:** Owner-approved visual direction for later exploration — **NOT implemented in the extension**  
**Category:** Shelf / Neon / visual design study  
**Visual source:** [Open the self-contained HTML mockup](spatial-typography-luxury-neon.html)

> **Luxury when idle, spectacle when activated.**

## Why this study exists
The earlier Shelf treatment preserves useful provider information, but the controls, numbers, typography, and effects feel too ordinary or visually crowded. The owner specifically preferred the *spatial typography* version over the previous two luxury Neon studies and wants this direction saved for a later return.

**Primary concept:** Treat typography as architecture. Assume text can be positioned anywhere in the Shelf. Use **mathematical asymmetry and optical balance** instead of reflexively left-aligning everything.

This is a visual exploration, not a request to modify runtime code now.

## Composition — the approved mockup
1. **Masthead:** Center REDOWN as the identity anchor, with tiny balanced micro-labels at opposing edges: `YOUR SPACE / YOUR CONTROL` and `YOUR CLOUD / COMPANION`. A short metallic hairline subtly underlines the wordmark.
2. **Navigation:** REMOTES / HISTORY / SETTINGS as small, precisely spaced labels. State should be legible without loud pill-like treatments.
3. **Hero:** Start `Click2Cloud,` from the left and place italic `anywhere.` larger at the right, lower on the page. Together they imply movement across the Shelf. Small `PRIVATE BY DESIGN / 01` balances the upper right. `Your Passions.` sits lower left, `RIGHT HERE.` lower right.
4. **Collection:** Put `YOUR CLOUD COLLECTION` on the vertical left margin. Put `THREE DESTINATIONS · ONE SPACE` at the upper right. This introduces a secondary axis without taking space away from provider data.
5. **Provider cards:** Preserve the icon, name, auth/status, lifetime verified count, GO TO or LOGIN, available free-capacity label, and contextual three-dot affordance. The count lives at the upper right as **serif instrument numerals**, with tiny `SAVES` labeling—**not a big hot-pink button**. Actions and storage metadata live on a restrained lower baseline.
6. **Closing phrase:** `The future` aligned left, then `is now.` in larger italic type on the right, lower than the first phrase. The diagonal is a deliberate visual rhythm, not a random stagger.
7. **System footer:** A tiny indicator and short provider connection message, with a quiet REDOWN/NEON edition label.

## Underlying mathematical geometry
- Approximate horizontal anchors at **14%, 50%, 86%** of the usable width, adjusted for optical weight, not imposed mechanically.
- Expressive asymmetry above and below **a disciplined repeating grid** in the functional cards.
- Let negative space balance serif headlines, miniature uppercase labels, and numerals.
- Use bounded line heights, tabular numerals where appropriate, and optical rather than purely geometric centering.
- Keep the Shelf narrow and information-dense; do not make it taller or wider solely to create empty space.

## Material / typography direction
- **Mood:** Haute luxury, editorial typography, precision watchmaking, black lacquer, platinum hardware, pink-pearl illumination.
- **Neon:** A precious material and an occasional accent—not constant glowing decoration.
- **Type:** Small crisp technical sans-serif for controls, microcopy and status; elegant literary serif/italic for expressive statements and counters.
- **Counters:** Instrument readouts, not badges or buttons; support growing numbers without overlaps or visual jumps.
- **GO TO:** A refined control that still clearly behaves as a control; premium styling must not sacrifice usability.
- **Card hierarchy:** Provider name and action readable at a glance, storage and status quieter but not hidden.
- **Animation:** Restrained at rest. Momentary flourishes on actual interaction. Do not make the interface constantly move.

## Safety and implementation guardrails (for a later Work session)
- **Concept only**: HTML mockup uses sample counts and connection states. Do not treat these as live provider facts, upload receipts, or production UI.
- Trace existing Shelf DOM/CSS/JS and theme classes before editing. Remove proven obsolete rules rather than stacking new overrides.
- Avoid selector collisions with Porcelain, Midnight, mascot animation, counters, upload feedback and other themes. Use scoped design tokens and component classes.
- Preserve provider semantics, V3 Click2Cloud right-click behavior, GO TO, History, free-capacity information, and existing accessibility/focus requirements.
- Use responsive positioning rather than unbounded absolute positions for production. The HTML mockup uses deliberate absolute geometry **only as an artistic study**; adapt to variable locale, font sizes, zoom, long translated strings, narrow panels, and large counts before implementation.
- Interactive elements in a future implementation must be real buttons/links with focus, keyboard activation, and suitable hit targets. The mockup deliberately has no runtime interactions.
- Keep initial click feedback immediate and separate from verified upload success/failure; do not let a cosmetic redesign reintroduce authentication gating.
- Test overflow, reduced motion, contrast, Chrome Shelf widths, larger text, themes and rapid consecutive saves.

## Future iteration questions
- Should the masthead stay perfectly centered while the hero remains diagonal?
- Should the `SAVES` instrument numeral be one weight lighter, with more refined monospaced/tabular treatment?
- Could a hairline grid or brushed-metal edge create materiality without adding clutter?
- Which asymmetrical placements improve scanability versus merely looking decorative?

## Preservation instruction
The companion [HTML mockup](spatial-typography-luxury-neon.html) is the **visual reference**. This Markdown document records **why** those choices were made. Keep both so future design work can compare the owner-approved study against the actual Shelf without misrepresenting it as implemented.
