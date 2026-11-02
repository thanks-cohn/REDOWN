# OPEN BUGS — Dropbox original filename, multi-provider ball animation, Neon card numbering, and transient SUCCESS!

**Reported by owner:** 2026-11-02  
**Repository / working branch:** `thanks-cohn/REDOWN` / `codex/v3-parity-first-reconstruction`  
**Status:** OPEN — owner observations after the last Codex work; no fresh installed-Chrome reproduction, final design approval, production fix, or live-provider pass is claimed in this report.  
**Priority:** P1 for Dropbox saved-file naming and verified-save UX correctness; P1/P2 for cross-provider celebration consistency and Neon aesthetic polish. Do not displace P0 provider connection, safe saving, V3 right-click, BOOT or data-integrity work.

## BUG-2026-11-02-A — Dropbox filename convention appears still incorrect after the last Codex run

**Owner report:** "The Dropbox naming conventions weren't fixed in the last Codex run, as far as I can tell. We need to test more." Treat this as an **unresolved suspected regression requiring actual re-testing**, not as a proved root cause or a completed fix.

**Required behavior:**
- On Dropbox right-click save, try to recover the **real original file name** and its genuine extension from the clicked object/source, where available and trustworthy. Do not default to opaque or meaningless generated numbering if a safe meaningful filename can be obtained.
- **Keep the previously working collision-number convention** (e.g. append the existing numeric suffix increment behavior when genuine names conflict); do not abolish numbering or force replacement. Use a safe fallback for sources with no trustworthy name. Preserve the file extension, make the resulting filename valid for the provider and record the exact final saved path/name in REDOWN History.
- **Dropbox gets only what the current approved upload already sends, plus the necessary real filename/name correction.** Do NOT add original page URL, image/source URL, frame URL, link URL, REDOWN browsing context, history provenance, or other new tracking metadata to Dropbox. Source provenance stays inside REDOWN. Do not broaden OAuth scopes or add unwanted directories just to repair naming.
- Keep Keep Both and non-destructive collision handling. Do not confuse the **provider's saved file name** with the **local Shelf card's display label**. Confirm filename *at the actual remote object*, not by changing text in the Shelf alone.

**Retest matrix:** direct images, linked files, ambiguous URLs, names with and without extensions, redirect/content-disposition cases where accessible, UTF-8/unusual names, URLs ending in numeric IDs, duplicate names, explicit conflict suffix, reconnect/restart, actual Dropbox root listing and independent metadata/read-back. Confirm no unexpected upload metadata. Preserve existing Dropbox namespace/reconnect/missing-files P0 evidence; do not blind-retry uncertain prior transfers.

## BUG-2026-11-02-B — P1 REGRESSION: Little-ball save animation no longer triggers for ANY cloud provider

**LATEST OWNER REPORT (2026-11-02, supersedes the earlier partial-rollout observation):** **NONE of the cloud providers trigger the little ball effect anymore.** This includes the existing provider where the effect used to work. Treat this as an **all-provider missing celebration regression**, not merely missing animation parity in Dropbox/Google/OneDrive. **Status: OPEN; owner-reported in installed Chrome; root cause and live success-event acceptance not yet confirmed.**

**Required behavior:** Restore a single recognizable, playful **little-ball save/arrival animation** on the correct provider card for **every genuinely verified successful cloud save** across Cloudflare R2, Google Drive, Dropbox and OneDrive (and future authorized providers). The animation is part of REDOWN's signature ritual, not a perpetual idle ornament. It appears **only in response to a newly verified completion**, visually cooperates with the separate theme-specific SUCCESS! celebration and retracts/settles fully afterward. Each provider keeps its visual identity.

**Audit / investigate first:** Track the last Codex changes and identify whether a shared verified-save event/receipt contract, provider-specific dispatch, listener registration, CSS animation class/state, keyframe definition, animation-end reset, reduced-motion gating, race/DOM replacement, Shelf visibility or theme switching removed the ball trigger. Do **not** assume the animation code was deleted or a save completed just because a counter/label changed. Capture actual event-to-DOM lifecycle and the regression commit if reproducible.

**Acceptance:** Real successful saves to each provider visibly trigger ball animation, including when Shelf is already open and when a new completion is delivered to a live Shelf. Nothing triggers on pending/failed/cancelled/uncertain transfers, OAuth login, replayed receipts, old History, count hydration or re-opening Shelf. For completed saves while Shelf was closed, decide explicitly whether to show a one-time deferred celebration on reopen; **never fake a new live success**. Repeated separate saves may restart the ball when truly new receipts arrive. Provide before/after screen recordings, regression tests, reduced-motion behavior and PASS/FAIL/NOT_TESTED per provider. Do not alter verified-save truth or upload authority merely to force an animation.

## BUG-2026-11-02-C — NEON provider-card counter is aesthetically bare and starts too small

**Owner report and latest explicit correction (2026-11-02):** Each provider's NEON theme card currently shows a lonely, unattractive number. The per-provider saved-file count should be **BIG from the start**, not a tiny counter that is merely allowed to grow.

**Required behavior:**
- Keep a **permanent, truthful, cumulative count of confirmed saves** for each applicable provider card, distinct from any temporary save celebration. Do not invent, reset, cap or double-count successes.
- In **NEON specifically**, start with a large, prominent, beautifully composed numeric readout that fits the available card space at low counts. **As the count gains more digits, progressively reduce the font size only as needed to fit**, preserving a visually generous size for as long as possible. Do not start small, and do not shrink simply because a new save occurs if the text still fits. Use responsive measurement/fit rules or tested thresholds; avoid clipping, overflow or abrupt unrelated layout jumps.
- Style the number as an intentional NEON arcade/SNES-era feature with attractive complementary typography, framing, accent treatment and spacing, rather than a bare integer. Non-Neon themes receive their own complementary visual typography, not the forced NEON numeral treatment.
- Keep actual count values and provider identity intact across browser restarts, theme switches, narrow widths, large counts, zoom and re-rendering. A counter change must not fake a new SUCCESS! event.

**Tests:** Verify NEON numbers at 0, 1, 9, 10, 99, 999, 10,000, 1,000,000 and larger values. The first digit(s) must be deliberately **large**; later digits trigger only necessary fit-down scaling. Compare low-count and high-count real screenshots across each provider, available Shelf width and relevant zoom values. Owner must approve the aesthetic from actual renders, not DOM assertions.

## BUG-2026-11-02-D — Theme-dependent SUCCESS! choreography: NEON money-green flashing vs. letter-by-letter other themes

**Latest owner-approved correction (2026-11-02), superseding any earlier single generic SUCCESS! animation:** `SUCCESS!` is **never permanent**. It appears **only when the relevant provider successfully saves the file**, performs a distinct entrance/flash for the active theme, then **disappears completely**. The permanent per-provider numeric counter is a separate component.

### Permanent resting / idle card contract (ALL themes, when no file is being saved)

- **No idle SUCCESS!, no flickering word and no active ball animation.** The rest state is a composed, polished provider card, not an endless completion party. The little-ball element is absent, settled or discreetly invisible until a real event triggers it.
- **Every card retains its provider identity** (logo/name and connected/disconnected/reconnect status as truthful), ordinary user controls such as GO TO when valid, and the existing FREE GB/free-tier information where shown. Do not fabricate live quota from a provider's advertised free-tier allowance. Idle state must not misleadingly imply a file is saving.
- The **per-provider confirmed-save count is persistent** and stays visible after celebration ends. In **NEON** it is an intentionally **LARGE** number from the first digit, framed in glossy arcade/SNES-like complementary styling and automatically reduced **only when extra digits actually require more room**; do not leave a lonely bare numeral. In **Porcelain**, use refined, clear red/white-aligned typography; in **Midnight**, dark premium contrast with restrained red highlights. No forced NEON money-green/yellow labels in other themes.
- Normal in-progress saving may show accurate activity/progress feedback, but it must be visually distinct from an already-confirmed SUCCESS! celebration. On failure/uncertainty, display real status without a success ball/flash.
- After an animation completes, **return exactly to the ordinary idle layout**: no reserved permanent SUCCESS! row, flashing leftover, overlay, or stuck ball. The durable number is the only success-display element that necessarily remains.

### NEON theme — dual-color money-green SUCCESS!

- Present the entire `SUCCESS!` word as a deliberate **two-color composition**, with vivid **money green** as the primary letters and a bright **yellow** offset/double-impression shadow or complementary layer. Both colors must visibly participate in the flash. The green is a money-green arcade celebration, not a dull generic success badge or plain text.
- **Flash/blink the dual-color word** briefly with a punchy, classic SNES-inspired timing, then remove it cleanly so the card returns to its ordinary resting state. **Do not use the non-Neon letter-by-letter entrance** for this theme unless the owner later explicitly chooses that.
- Place the temporary treatment **inside the NEON provider card**, following the previously requested space under FREE GB where it fits, without displacing GO TO, the growing prominent numeral, other status/controls or creating a persistent row.

### Every other theme — letter-by-letter entrance, TWO quick flashes, THIRD appearance holds briefly, then disappears

- On a new verified successful save, reveal `SUCCESS!` **one character at a time**, as an intentional, polished short typographic animation. No text should appear as a permanent static label.
- Once the letters have fully assembled, **flash the completed word visibly ON/OFF twice**. On the **third appearance**, let the complete word **STICK / HOLD** noticeably longer, then fade or snap away cleanly until **no SUCCESS! text remains**. This is an arcade/16-bit RPG victory-notification rhythm, not a permanently displayed status or a single generic toast. Do not start with the NEON all-at-once dual-color blink; this is a **different animation sequence**.
- Style the text, letter cadence, entrance and exit harmoniously with each existing non-Neon theme (e.g. Porcelain and Midnight). Use the appropriate theme palette and visual personality, not forced NEON money-green/yellow on every theme. Earlier guidance suggested the region between GO TO and FREE GB for non-Neon cards when space permits; verify actual layout, not assumed CSS geometry.

### Shared correctness and accessibility

- Trigger only from a **new verified completed transfer receipt** for that specific cloud provider/card. Never celebrate login/connect, attempted/failed/cancelled/uncertain saves, replayed events, historical count hydration or merely re-opening Shelf.
- All themes must automatically clear the SUCCESS! element/state at the end of their sequence; no stale text after reopen/re-render. The numeric count stays visible and persists independently.
- **Every separate newly verified save must retrigger the theme's complete celebration from the beginning** (including the first letter in non-Neon themes), even if an earlier SUCCESS! sequence recently finished. For multiple rapid valid saves, use a safe bounded retrigger/queue policy so distinct completions are acknowledged, without overlapping messages, replaying duplicate receipts, inventing saves or leaving a permanent SUCCESS!.
- Honor reduced motion and seizure-safety considerations: where flashing or staggered animation is disabled, show a brief static accessible confirmation then remove it, without obscuring verified status or generating unnecessary screen-reader spam.
- Confirm actual display and motion with short **installed-Chrome video captures**, not screenshots of a single frame alone. Obtain owner approval for the money-green/yellow pairing, exact offset treatment and the non-Neon letter sequence.

**Timing clarification:** The **letter-by-letter → two flashes → third held appearance → disappear** choreography applies **ONLY to non-NEON themes**. Do NOT silently impose this sequence on NEON; NEON uses its own full-word dual-color money-green/yellow flashing exit. An additional independently verified save repeats the relevant theme's full animation; otherwise the default idle card with its persistent number stays visible.

**Test matrix:** For NEON, full-word dual-color flash and disappearance, plus large-to-fit count shrink. For each other theme, characters appear sequentially, the completed word flashes **two times**, a **third appearance holds for a deliberate beat**, then disappears. The next separate verified save starts the whole sequence again; the permanent saved-file count stays behind. Repeat for Cloudflare, Google Drive, Dropbox and OneDrive on new verified successful saves; failure/uncertain outcome; multiple saves; reopening Shelf; theme switching; small widths; reduced motion; and persistence of the independent counter.

## Delivery and non-regression requirements

1. Audit the **actual most recent Codex changes**, existing Shelf provider-card templates, save notification/ball animation dispatch, counter persistence, Dropbox filename resolution and provider upload requests. Record exact source files, baseline/screenshots and root-cause findings. Do not claim that a prior Codex pass proved these UX requirements.
2. Keep filename correctness, permanent save counting, temporary celebration, and ball flourish as **four independently tested concerns**; implement shared presentation hooks where appropriate instead of duplicating inconsistent per-provider behavior. Respect provider-specific source-fetch constraints and leave provider credentials/remote-upload semantics isolated.
3. Run targeted unit/integration tests and **real installed Chrome plus genuine provider tests**. Publish visual proof for Neon card art and timed SUCCESS! flash. Record PASS / FAIL / NOT_TESTED honestly.
4. Preserve the protected V3 native menu engine, Cloudflare TRUE REMOTE route, Google/Dropbox/OneDrive authorization, private REDOWN-owned provenance, History receipts, Keep Both behavior and user destinations. Do not use this UX report to reset remote files or introduce unrelated provider changes.

**Tracking:** Also added to `NEED_TO_DO/11022026.md`. Bug status remains OPEN until the relevant code and live/visual acceptance prove it.
