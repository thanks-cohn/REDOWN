# IDEA — SKI API: design-time mathematical layout and static layout export

**Owner concept:** 2026-11-02  
**Project:** REDOWN Shelf and potential future theme/Skin API  
**Working name:** **SKI API** (preserve this name until owner chooses another)  
**Status:** IDEA ONLY. No production implementation, theme rewrite, or UI repositioning authorized by this note.

## Owner's core vision

Instead of repeatedly hand-adjusting text and containers through trial and error, give **every visible text element its own layout container**. Measure the Shelf itself and map each container's position and size against the Shelf dimensions. Use the resulting coordinates and relationships to establish the desired visual composition, then **rewrite/export the layout into ordinary production code**.

The mathematical positioning exists as a **design instrument**. Once a design is settled, the Shelf should not need to run a complicated mathematical layout engine merely to display it.

**Pipeline:** Discover all visible text → identify its container → measure container and Shelf → experiment with proportional coordinates and spacing → approve the aesthetic composition → compile/export conventional CSS/layout → validate across themes and viewport sizes.

## Potential process

1. **Inventory.** Identify each actual text node and visible label in the Shelf, including the REDOWN wordmark, tagline, REMOTES tab, provider controls, card numbers, and temporary SUCCESS! elements. Associate each with a stable container/component identity. Handle dynamically added text explicitly.
2. **Measure.** Record Shelf width/height, usable regions, safe areas, text bounds, container bounds, font size, line height, and relationship to surrounding elements. A possible normalized coordinate system is `x = left / shelfWidth`, `y = top / shelfHeight`, `w = width / shelfWidth`, `h = height / shelfHeight`. These are **design coordinates**, not mandatory absolute positioning at runtime.
3. **Compose.** Use guides, constraints, alignment, spacing, ratios, typography bounds and theme-specific rules to place and size each text/container group. Make it obvious which controls are siblings, belong to a row/card, and should remain together.
4. **Approve.** Visually check the result at several Shelf widths, long labels, large counts, reduced motion, zoom levels, font fallbacks and all themes. Treat dynamic elements (LOGIN/RETRY, ERROR, GO TO, SUCCESS!, connection states) as states of the same component.
5. **Export/freeze.** Generate or rewrite ordinary CSS (prefer Grid, Flexbox, `gap`, `minmax`, `clamp`, container queries and design tokens; absolute positioning only for genuine overlays). Retain the approved proportions as inspectable rules or tokens, not a continuous runtime coordinate calculation.
6. **Verify.** Compare the exported production rendering against the approved design using screenshot/dimension checks at multiple widths. Repeat a design-time pass only when revising the theme or layout.

## Why this is interesting

- Makes aesthetic refinement more systematic: every movement has an observable relationship to the whole Shelf.
- Can find cramped areas, inconsistent padding, text overlap, uneven visual rhythm and poor alignment before committing permanent CSS.
- Lets different themes share a logical layout but use different fonts, scales, spacing and decoration without rebuilding their behavior.
- Could become an optional foundation for a later Skin API: skin authors position and style known components through safe design constraints; the generated production CSS is reviewed/validated before shipment.
- Reduces the risk of the mathematical design system becoming expensive or fragile during actual everyday operation.

## Important limitations and guardrails

- **Do not turn measured percentages into rigid per-element left/top pixels** for production. Text changes width with translations, font loading, user zoom, accessibility settings, content, dynamic values and window resizing. Prefer encoding *relationships and constraints* in standard responsive CSS.
- Keep logical document order, keyboard navigation, labels, focus outlines, accessibility and hit targets intact. A visual layout tool must not break semantic behavior.
- Do not wrap every text node unnecessarily if doing so damages inline flow or existing semantics; use existing component wrappers or a stable logical mapping where possible.
- Avoid performance-heavy permanent `ResizeObserver`/DOM polling just to draw what static CSS can draw.
- Never allow a visual layout exporter to alter verified-save state, lifetime counters, provider auth, right-click routing, History, or the actual success signal.
- Compile separate responsive layout rules or breakpoints from multiple measured samples, not from one fixed-size screenshot. Test small and large Shelf, different browser zoom, and different UI themes.
- Maintain a reversible, source-controlled design export so an approved CSS layout can be compared to the old one.

## Suggested proof of concept (not implementation approval)

Prototype on a *copy* of the Shelf's provider-card region. Map the text/number/badges, calculate positions relative to the Shelf, adjust spacing visually, and export a self-contained CSS patch. Compare the generated CSS in Porcelain and Neon at multiple sizes. Demonstrate that the export still looks right after the live math/editor is removed.

**Owner's central distinction:** Use math to *design* the aesthetically correct locations, then write code to keep those locations. **Do not require the math engine to run forever just to display text.**
