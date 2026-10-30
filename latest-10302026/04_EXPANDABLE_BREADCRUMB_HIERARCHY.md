# PROPOSAL: Expandable Ordered Breadcrumb Hierarchy

**Status:** REJECTED AND SUPERSEDED. The experiment was reverted at `24d0df1`. Do not implement the initial/expandable-row model below. [The Phase 1 handoff](09_PHASE_1_IMPLEMENTATION_HANDOFF.md) documents its standardized replacement. The remaining text is historical.
**Origin:** Earlier October 30 discussion, included here so all current Explorer presentation proposals live together.
**Problem:** Long directory names and Chrome's wide Shelf leave the modern Explorer breadcrumb control wrapping into disconnected lines and colliding visually with navigation and filter controls.

## Presentation model

- Separate Back/Forward/Up/Refresh, address hierarchy and folder filter into predictable regions. Breadcrumbs cannot push buttons into arbitrary rows.
- Default compressed path: show the first ancestor in full when practical, show the first meaningful word for the next two ancestors, shorten deeper ancestors to an initial, and give the **current folder its own full-name row**.
- Use container-width measurements, not only viewport media queries. When even abbreviations exceed the space, introduce an accessible overflow menu; never scatter individual letters across multiple uncontrolled lines.
- Each compressed ancestor is its own control. Clicking its abbreviated label expands its **complete original name into a dedicated row at that exact location** in the sequence. It does not navigate.
- Multiple ancestors may be expanded simultaneously; expansion order is always the actual directory order, **not** the order in which the user clicked them.
- Clicking any expanded ancestor again collapses only that segment back to its shortened form.
- When every ancestor is expanded, the UI becomes an ordered stack of full-name rows; no initials or filler characters are required between rows.
- Keep a separate, clearly labeled Open/Navigate affordance for each ancestor. Do not conflate expansion with navigation.
- Show full path on demand in an editable/copyable control. Preserve exact object prefix, URL encoding, permissions and navigation target separate from display abbreviation.
- Long expanded names wrap *inside their own row*. Layout height grows gracefully and scrolls inside a suitable bounded region if necessary.

## State model and correctness

- Model the path as ordered immutable segments: `{id, fullName, prefix, depth}`.
- Maintain a Set of expanded segment IDs for the **current path identity**. Render the sequence from the immutable ordered array each time; never reorder by click time.
- Reset or reconcile expansions when navigating to another path, respecting a saved preference only if implemented intentionally.
- Clicking expansion must be keyboard operable with `aria-expanded`; provide a separate navigation action and accessible full-name descriptions.
- Test duplicate folder names, Unicode, very long names, prefix changes, empty prefixes and Side Panel resizing.

## Acceptance tests

1. A single click expands one ancestor between its true neighbors.
2. Expanding third, then first, then fourth results in first/third/fourth rows in directory order.
3. Clicking the third row again collapses only the third, leaving first and fourth expanded.
4. Expanding all ancestors yields a fully readable stacked path with no middle initials.
5. Current folder stays distinct and complete. Back/Forward/Up/Refresh/Filter remain stable.
6. Original bucket/prefix identity remains byte-for-byte unchanged by abbreviation or expansion.
