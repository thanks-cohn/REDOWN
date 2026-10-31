# IDEA — Simple / Nested Chrome menu presentation (revised)

**Status:** Design proposal only; no runtime implementation authorized by this document.  
**Project:** REDOWN V3 Right-click Setup  
**Supersedes:** The earlier nested-only plus-sign, animated branch creation and virtual hierarchy extension proposals in this file. Those were based on a mistaken assumption that V3 could not add multiple destinations under one bucket.

## Corrected owner decision

**The existing Right-click Setup interface already permits multiple locations within the same bucket. Nothing about its controls or hierarchy needs to change for Simple/Nested.**

Keep the complete existing setup UI exactly as it is: tree, folder outline, existing plus controls, creation flows, menu label fields, checkboxes, alignment, styling and functionality. Do not add any new `+` buttons, fade-in animations, duplicate location editors or special Nested-only configuration capabilities.

**Only one new choice is needed: Simple versus Nested.** This selects how the **Chrome native right-click menu** displays the already-configured destinations. It does not change what destinations exist or how they are edited.

## Mode behavior

### Simple (default)
- Preserve the established flat/direct right-click destination entries, using each selected destination's saved **menu label**.
- No folder submenus are introduced by Simple. The existing setup interface remains identical.
- Default for fresh installations, with a persisted user mode preference after explicit selection.

### Nested
- Use the **same configured destinations and the same saved menu labels**.
- Display them in Chrome as a conventional expandable submenu hierarchy representing configured parent/child organization.
- Use native Chrome context-menu submenus, not new application pop-ups or a redesigned Right-click Setup.
- Existing configured multiple locations in one bucket must continue to work; do not create more destinations just to enable Nested.
- Preserve the option to save directly to an actionable parent when it has children by using a clear, separate **Save here** submenu entry if required by Chrome's native parent/submenu behavior.

## Invariants

1. One canonical destination store; both modes are pure projections of the same configuration.
2. Switching Simple ↔ Nested is non-destructive and reversible: no lost paths, custom labels, order, enabled flags, or destination IDs.
3. **Menu labels remain available in BOTH modes and at relevant hierarchy depths.** Labels change display text only; they never rename/move cloud buckets or folders.
4. The Right-click Setup UI has no mode-specific added controls except a modest Simple/Nested switch and any concise mode status indicator. No animated `+` entrance; no layout shifts; no extra virtual grouping system.
5. Native Chrome submenu layout is generated deterministically, with correct parent-first registration, supported depth and count limits, resolved leaf targets, distinct actionable parent handling, and clean rebuild after switches.
6. The Legacy engine fallback and its distinct configuration stay intact. The existing File Explorer API, Explorer UI, Cloudflare transfers, URL system, History, auth and neon intro remain untouched.
7. Existing setup-level creation/editing must never be conflated with actual cloud folder creation.
8. No automatic discovery of every physical folder or unbounded browsing is implied. Nested uses the explicitly configured hierarchy only.
9. Mode switching should disclose applied state and registration failures honestly, including across extension restart.

## Illustrative example

Saved configured destinations and labels:
- bucket `4chan`, path `images/memes`, label `Memes`
- bucket `4chan`, path `images/artwork`, label `Art`
- bucket `4chan`, path `videos/clips`, label `Clips`

**Simple Chrome right-click:** REDOWN → Memes / Art / Clips (direct entries).

**Nested Chrome right-click:** REDOWN → 4chan → Images → Memes / Art; and REDOWN → 4chan → Videos → Clips, with labels from the configured menu nodes as applicable. Do not fabricate or rename actual storage paths; determine parent display nodes using existing configuration and documented menu projection rules.

## Later acceptance tests (when implementation is requested)

- Confirm the existing setup screenshot/visual layout is unchanged apart from the compact mode selector.
- Create multiple destinations under one bucket in the existing editor and verify both menu presentations.
- Verify custom menu labels in Simple and Nested, including configured parent nodes.
- Toggle and restart repeatedly; confirm the same destination IDs, labels, paths, enablement and order survive.
- Verify parent/child native menu registration and click routing using installed Chrome when permitted.
- Verify failures/recovery and ensure switching does not touch Explorer, URLs or cloud folder structure.

## Aesthetic and usability principle

Maintain the premium, geometrically aligned desktop design inspired by the golden age of polished Mac and Windows interfaces. **Do not redesign what already works merely to add a mode switch.** The distinction should be instantly obvious from the Chrome menu presentation, not from changing the editor.

**Simple = direct entries. Nested = expandable Chrome submenus. Same destinations, same labels, same interface.**
