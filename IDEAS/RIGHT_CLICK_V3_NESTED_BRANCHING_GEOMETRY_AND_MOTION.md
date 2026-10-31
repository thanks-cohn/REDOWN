# IDEA — Nested-mode branching: geometrically consistent progressive disclosure

**Status:** Design idea only; NOT authorized for implementation.  
**Project:** REDOWN V3 Right-click Setup  
**Scope:** One existing tree editor; preserve all existing working UI, API, Explorer, URL and transfer behavior.

## Owner intent

Simple/Narrow is the default and **must remain exactly as it is**. Nested is selected using a small, obvious mode switch on the existing screen. Selecting Nested introduces new affordances: an elegantly animated `+` by each applicable bucket row to create additional logical branches under the same bucket. It should fade in and settle gently, visually explaining that Nested offers greater capability. Do not change the underlying actual R2 directories, and do not rebuild the entire editor.

The interface must make **geometric, semantic and logical sense**. Align columns and tree indentation consistently; neither the button's appearance nor its exit should cause the bucket name, chevron, icon, sibling row, or rest of the tree to jump.

## Geometry and composition

A proposed consistent row grid, responsive to available width:
- Column 1: tree indent and chevron (fixed according to depth).
- Column 2: icon (fixed width).
- Column 3: main label and optional subdued actual path (flex).
- Column 4: selected/included indicator, if applicable (fixed).
- Column 5: contextual actions, in a stable trailing action slot (fixed).
- Nested-only `+` appears in that **reserved trailing action slot**, not inserted to the left of the bucket label where it displaces indentation or breaks alignment. If a leading `+` is desirable as a visual identity, reserve an equal-width action slot for both modes and ensure the connecting tree rails/indent remain continuous.
- All sibling rows have uniform heights and column baselines. Descendant indentation is an exact repeated increment. A virtual branch must appear *beneath* its owning bucket, visually connected with the same established tree indentation and disclosure rules.
- Inline creation occupies one whole row at the expected child depth, with text field, check ✓, cancel × aligned to the same grid. Focusing it must not activate tree typeahead.
- User should never confuse `+` with creation of a real cloud bucket/folder. Label the action **Add menu branch** or **Add menu destination**, as appropriate.

## Motion as meaning

On switching Simple → Nested:
- Nested-only `+` controls become available at the precise row(s) where new branches may be added.
- Fade opacity 0→1 with gentle ~4px translateY, ease-out, about 180–220 ms.
- Reserve geometry before animation; animate opacity/transform only, not width/height/padding. No layout shift or collapsing sibling rows.
- The affordance remains visible and keyboard-focusable after arrival, with descriptive accessible name and tooltip; no hidden hover-only essential actions.
- Nested → Simple animates out, then becomes non-interactive and removed from tab order. Respect `prefers-reduced-motion` (instant state change).
- Keep overall editor styling, color, typography and current premium desktop character; only the affordance is new.

## Data and semantics

- One canonical configuration and tree. Simple and Nested are **different projections**, not competing editors or destructive modes.
- Default mode Simple/Narrow; persist chosen setting.
- Simple exactly preserves its current selected-destination behavior and custom menu labels.
- Nested may permit multiple separately named **virtual menu branches** under one physical bucket, each pointing to existing or explicitly chosen authorized cloud prefixes. Multiple virtual branches may target the same bucket without renaming or creating physical folders.
- Menu labels are useful at **every level** of Nested, not just leaves. Editing display names never renames or moves an R2 object/folder.
- Preserve identities, paths, user labels, selections, ordering and branches when switching modes; Simple should show only its intended flattened active selections, without deleting Nested-specific metadata.
- Explicitly distinguish group nodes from actionable save destinations; parent group can be a non-save submenu, or support an explicitly labeled **Save here** action if intended. No ambiguous click target.
- A portable exportable versioned JSON representation of the virtual hierarchy is a **future design requirement**, with stable IDs, parent links, labels and logical target refs. Export never contains secrets or tokens; importing requires account mapping and validation. No export implementation in this phase.

## Acceptance criteria for a later implementation

1. Toggle Simple/Nested and see only the appropriate branch `+` affordances change, without visual movement of existing tree columns or labels.
2. Simple remains pixel/behavior consistent with its present implementation.
3. In Nested, click bucket `+` to create a virtual branch in the same bucket; type freely; Enter/✓ confirm; Escape/× cancel; focus stays in input.
4. Nested allows multiple branches in the same physical bucket with independent display labels and no R2 folder changes.
5. Switching modes and restarting restores each view, with no loss of virtual hierarchy data.
6. All controls usable by mouse, keyboard and touch; accessible names, correct focus return, no accidental tree typeahead.
7. Test desktop and narrow widths, reduced motion, long labels and deep hierarchy without geometry shifts.
8. No changes to unrelated Explorer, URL, transfers or existing Cloudflare/provider contracts.

## Design philosophy

Use the golden age of Mac and Windows desktop UI craft as the benchmark: disciplined alignment, deliberate visual rhythm, restrained dimensional polish, instantly recognizable conventions and functional clarity. Geometric uniformity is not decorative; it makes the structure understandable. **Simple is familiar. Nested reveals additional power without disturbing what is already there.**

Do not implement this idea until explicitly requested.
