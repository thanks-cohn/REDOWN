# IDEA: AMOEBE — Contextual Shape-Shifting Liquid Chrome Mascot

**Status:** Owner's product idea, November 1, 2026. **NOT implemented or approved for production.**
**Scope:** REDOWN mascot and future tooltip/action illustrations; independent from download, Explorer, V3, Boot and cloud-provider functionality.
**Name as newly proposed:** **AMOEBE**. This note does not automatically rename or remove existing ODR/other mascot branding.

## The character

AMOEBE lives in an **amorphous, floating, elastic pool of liquid chrome**. The metal continually shifts, flows, gleams and reflects **rainbow light and tiny iridescent glitter**. It can be poked: it squishes, giggles, flows around the poke, catches the light and bounces back into its recognizable silhouette. It should feel alive, cute, mischievous and futuristic, not like a rigid clipart assistant.

**Signature:** Every shape retains a recognizable shimmering liquid-chrome core, spectral rainbow reflections and tiny prismatic glints. AMOEBE does not swap into an unrelated static icon; it **morphs** into a recognizable prop or gesture appropriate to the action, then melts gracefully back to itself.

## Contextual tooltip and action ideas

| User action or tooltip | AMOEBE transformation | Emotional beat |
| --- | --- | --- |
| Rename a file or folder | Bends and stretches into a **pencil**, with a luminous tip, draws a small squiggle, then flows back | Curious, proud |
| Move or relocate something | Folds into a tiny **moving box** (or handcart carrying a box), jostles and wiggles toward the target | Helpful, busy |
| Copy | Splits into two playful chrome droplets; the original remains and the duplicate flashes into place | Little "ta-da" |
| Paste | Turns into an open box that releases a glowing shape into place | Satisfying landing |
| Save / Right2Click | Becomes a little travelling chrome ball/drop, arcs toward the selected cloud, and lands with a soft plop | Anticipation and joy |
| Upload / transfer | Mimics a small capsule or buoyant parcel while the real transfer continues separately | Determined and patient |
| Success | Becomes a sparkling coin/bubble, flashes rainbow chrome and does a restrained happy wobble | Delighted |
| Failure / retry | Sags into a soft puddle, looks puzzled, reforms into a hopeful droplet | Friendly, not alarmist |
| Search / find | Extends into a little magnifying lens, peers around, then retracts | Curious |
| Delete / trash | Forms a small bin or eraser shape **only when the operation is actually confirmed** | Clear, respectful |

The move prop is **experimental**: a moving box or miniature trolley are options, not locked artwork. Let tooltip context guide the form rather than requiring a separate mascot asset for every action.

## Motion and technical guardrails

- Keep morphs short and responsive; hover may reveal the shape, click can trigger a small extra reaction. Return to the hovering amorphous resting state after focus/hover ends, or after a brief finished reaction.
- Prevent the mascot from covering actionable text, stealing focus, hijacking pointer events or creating an extra confirmation. A tooltip is still readable without the mascot.
- Base the animation on real action state. A cute gesture is **not** proof of a successful rename, upload, save or move.
- Use a shared material/shader or reusable 2D fallback. Budget for Chrome Shelf/popup/side panel performance and avoid large GPU/CPU drain.
- Support reduced motion and a mute/reaction-off preference. Keyboard/touch users receive equivalent readable labels, not hover-only function.
- Verify tiny tooltip scale and larger Shelf view in Porcelain, Midnight and Neon; preserve contrast and clarity before adding glitter.
- Keep the shape system isolated in a future bounded skin/mascot API; it must not change V3 native menu registration, provider dispatch, OAuth, transfers, file ownership or History.

## First proof of concept

Implement only **two** behaviors on a disposable test surface: idle floating liquid-chrome orb → rename pencil → idle, and idle → move box → idle. Visual review must confirm a fluid *continuous transformation*, strong rainbow reflections and a recognizably consistent character, rather than toggling between two static icons. Expand the vocabulary after these are proven delightful, smooth and reliable.
