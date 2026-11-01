# UX IDEA (NOT A BUG) — Helpful Comments for ZIP/CBZ reader navigation

**Proposed:** 2026-10-31
**Repository:** `thanks-cohn/REDOWN` · **Branch:** `codex/v3-parity-first-reconstruction`
**Status:** IDEA / DEFERRED — documentation only; not approved to implement automatically
**Related actual bug:** [ZIP/CBZ Double-click and Keyboard Navigation](ZIP_CBZ_DOUBLE_CLICK_WINDOW_PREVIEW_AND_KEYBOARD_NAV_2026_10_31.md)

## Owner's intent

The owner imagines a first-use **Helpful Comments** system (the proposal assumes **ON by default** unless changed by a later product decision) that gently explains unfamiliar archive-reader shortcuts when the user seems to be trying to leave a CBZ/ZIP with the wrong keys.

Potential signal: repeated rapid Left/Right presses while the reader is at a boundary or the user repeatedly attempts navigation that cannot progress. **Do not label a user as "panicked"; keyboard patterns cannot reliably prove mental state or intent.** Do not record behavioral profiling or user identity; use local, short-lived, anonymous interaction counters only if this feature is eventually approved.

## Desired hint

A small, original, **pencil-scribble / handwritten** annotation with tasteful flashing or brief motion and a little arrow, e.g.:

> **It's the Down Arrow Key :)** ↓

It explains that **Down** goes to the next outer Explorer item while reading within a ZIP/CBZ; **Up** goes to the preceding outer item. Optional second hint:

> **It's the Up Arrow Key :(** ↑

These are **illustrative creative concepts**, not mandatory final copy. The owner is concerned that unsolicited emotional or anthropomorphic messages may feel odd or irritating. A future mascot/orb could make a handwritten tip feel intentional and playful, but do **not** ship unsolicited mascot characterization just to enable hints.

## Product/interaction guardrails

1. **First correct the archive reader itself:** Left/Right internal pages and Up/Down outer items. Hinting must not paper over broken keys.
2. Trigger only on **strong objective cues** such as a repeated no-op boundary key pattern, not ordinary quick comic-reading; debounce and cap to one hint per logical frustration period.
3. The annotation should be brief and legible with a clear down/up arrow; make it easy to dismiss and suppress for the session once dismissed. No flashing that risks seizure or repeated visual demands; prefer a single soft pulse and honor `prefers-reduced-motion`.
4. No interruption of reading, autofocus, lost keyboard input, blocking pointer events, audio surprise or unexpected navigation. Keep hint away from page artwork and toolbar actions.
5. Expose **Helpful Comments ON/OFF** where appropriate if/when the overall feature ships. The owner proposes ON for new users; verify the product-wide default and existing setting architecture before implementing, do not claim it exists now.
6. Provide a non-anthropomorphic first-run hint as the safe default, perhaps a neutral tooltip. The mascot-style handwritten note may be evaluated later.
7. If measuring success, use only non-sensitive local metrics (e.g. dismissals, hints shown, subsequent successful outer navigation), with a clear privacy boundary; no behavioral inference from "panic".
8. Accessibility: screen-reader text, keyboard dismissal, adequate contrast, no trapped focus.

## Future acceptance study

- Inside archive at last page, repeated futile Right presses can surface **at most one** context hint; normally reading Left/Right never triggers it.
- Hint explains the accurate outer-item navigation direction, shows no false promise at the outer list boundary, and disappears after the user acts or a short inactivity period.
- Helpful Comments Off suppresses all hints; reduced-motion preference suppresses motion but not accessible help.
- No hint when not reading ZIP/CBZ or while typing in a focused input.
- Visual QA includes all REDOWN themes and narrow Side Preview layout.

## Scope

This is a **feature idea recorded alongside the related reader bug for traceability**, not a confirmed application defect. **Do not implement this in the current bug-recording step.**
