# CODEX IMPLEMENTATION REQUEST: Restore Shelf SAVE-IMPACT pulse across ALL cloud providers and deliver theme-specific SUCCESS! typography

**Date:** 2026-11-02  
**Repository:** `thanks-cohn/REDOWN`  
**Required working branch:** `codex/v3-parity-first-reconstruction`  
**Priority:** P1, owner-observed Shelf presentation regression, below unresolved P0 reliability/data safety.  
**Status:** Implementation request / NOT DONE / no live Chrome results claimed.
**Tracking:** [2026-11-02 bug report](../../bugs/2026-11-02_P1_DROPBOX_FILENAME_AND_SHELF_PROVIDER_CELEBRATION_REGRESSIONS.md) and [daily NEED_TO_DO](../11022026.md).

## Scope: two related Shelf UX repairs, NO unrelated features

1. Repair the **save-impact pulse / impact glow at the Shelf edge**, which **is no longer triggering for any cloud provider** according to the owner. Restore it across **Cloudflare R2, Google Drive, Dropbox, OneDrive**, using the same shared presentation semantics and safe provider-specific delivery routing.
2. Build an elegant, verified-save-only **SUCCESS!** moment on each provider card, plus the permanent themed save-counter design. Particularly **non-Neon** SUCCESS! needs a **professional, Roman/classical-inspired italic serif** feel, not generic sans, gaudy novelty text, or the Neon 8-bit font.
3. Keep all functionality isolated to Shelf/notification presentation and existing authoritative transfer receipts. Do not change filename rules, provider OAuth, data access, navigation, V3 native menu architecture or actual upload semantics as a shortcut.

**CRITICAL OWNER CORRECTION: THE FALLING BALL ITSELF WORKS. DO NOT “FIX”, REWRITE, REPLACE OR RE-ANIMATE THE FALLING BALL.** The failing element is the **separate SAVE-IMPACT pulse** when the orb arrives at the Shelf edge. Also preserve the existing celestial/theming selector's falling-ball work. There are multiple animations with similar appearances; distinguish them by source and lifecycle before touching code.

## Verified source landmarks (source inspection only, not a live result)

- `extension/background.js`: `launchSaveDroplet(info, tab)` injects a small orb into the **source page** via `chrome.scripting.executeScript`, animates it to the right edge on a native save intent, creates an expanding impact ring on the source page, then attempts `chrome.storage.local.set({redownShelfImpact:Date.now()})`. The call site in `saveResolvedRightClick(info,tab,resolved,profiles)` starts the orb for one right-click path. Inspect whether **other cloud providers use different native menu dispatch paths** and bypass this shared effect. Do not assume a return from `launchSaveDroplet` indicates remote upload completion.
- `extension/shelf.js`: `pulseSaveImpact()` watches `chrome.storage.onChanged` for local `redownShelfImpact` and sets `document.documentElement.dataset.saveImpact='true'` for about 850 ms. It ignores events older than three seconds. Investigate background-to-Shelf observation, same-value update, event timing, listener lifetime, impact timer, destroyed Shelf, and reduced-motion behavior. Do not mark a fix verified merely because CSS exists.
- `extension/shelf.css`: `.shell::before` and `[data-save-impact="true"] .shell::before` run `shelf-save-droplet-impact` for about .78 s at the Shelf inner edge. This is **a glow/impact pulse**, not the falling ball's orbit/flight. It must not be masked by themes, transparency, clipping, stacking contexts or another layout.
- `extension/shelf-celestial.js` / `tests/shelf-celestial.test.mjs`: a distinct **theme-switch falling-ball/lunar collision** effect. Preserve it unchanged unless a demonstrable narrow compatibility edit is essential.
- `extension/shelf.html`: **Cloudflare** uses `article.provider.remote.cloudflare-hero[data-provider="cloudflare"]`; **Google/Dropbox/OneDrive** live as `.destinations-grid .destination-tile[data-provider]`. All FOUR must be covered despite different DOM, including correct animation placement and responsive card geometry.
- `extension/background.js` `recordTransfer()`, `extension/transfer-counter.js`, `extension/history-archive.js`, `extension/shelf-odometer.js`, and provider completion/receipt producers are the starting points for verified save logic. Note: the current `transferCounter` may be a global total and history may have a bounded legacy window; **do not fabricate per-provider lifetime counts** from limited local evidence. Implement accurate provider attribution or clearly label a measured scope.

## A. Restore the save-impact pulse while protecting the working falling-ball

**Two different stages, two different meanings:**

```text
USER ACTIVATES A SUPPORTED RIGHT-CLICK SAVE:
  working source-page falling orb / flight -> source-page edge
  -> Shelf-edge SAVE-IMPACT pulse once per genuine dispatch/arrival event
  (an effect acknowledging the dispatched operation, NOT proof of cloud commit).

ACTUAL CLOUD SAVE COMMIT IS INDEPENDENTLY VERIFIED:
  canonical success receipt -> correctly attributed provider-card SUCCESS! typography
  + update confirmed-save count exactly once
  (genuine success only; no fake success from an orb or an impact pulse).
```

- Audit all provider-specific right-click dispatchers and the shared native menu composer/writer without changing routing. Ensure the existing `redownShelfImpact` pulse reaches the open Shelf for all four connected providers on supported eligible user saves, including theme and visibility variations. Preserve source-page orb operation and never duplicate it as a workaround.
- Diagnose whether the orb's own completion sends the storage event; if source-page injection is disallowed (Chrome restricted pages, script permission, CSP/platform limits) the app must **not** claim a visual pulse occurred, broaden host permissions invisibly or fake a verified success. Provide a supported, truthful in-Shelf effect fallback only if technically justified, with a clear distinction from remote success.
- The pulse should be visible within the actual side panel or attached popup, short, polished, and nonblocking; it must not stay on, obscure targets or steal keyboard focus. Handle normal/reduced motion, rapid successive saves, and loss/recreation of the Shelf UI. Preserve original runtime/session constraints and privacy.
- An effect dispatch is not the same as transfer commit. If the owner later chooses to sync the pulse strictly to verified completion, that is a separate product decision; **do not silently change or invert event semantics in this implementation**.
- No unrelated Chrome permission requests, source URL disclosure to Dropbox/OneDrive/Google or provider metadata changes.

## B. Theme-specific SUCCESS! confirmation, exclusively on verified cloud commit

**Idle state:** Normal provider logo/name, honest connection/status, GO TO when valid, existing FREE GB copy and durable count. No visible `SUCCESS!`, no pulsing overlay, no stuck success class. On failed/blocked/cancelled/uncertain save, show truthful failure/uncertainty, never a success celebration.

### NEON — monetary green and yellow, not classical typography

- The *whole* `SUCCESS!` displays simultaneously in prominent **money green** with **bright yellow offset/double-impression/shadow**. It briefly **flashes in its DUAL-COLOR state**, and **completely disappears**. No letter-by-letter introduction, and **no non-Neon two-flash-plus-third-held choreography**.
- NEON's **persistent per-provider numeric count must begin BIG** and be a complementary designed arcade/SNES-like readout, not a tiny orphan digit. Reduce only as the actual number of digits increases beyond available width, preferably using text measurement or robust tested fit rules. Must work for 0, 1, 10, 999, 10,000 and much larger values, and across responsive Shelf/card widths.
- Preserve provider-specific brand accent and actions. The flashy word is a timed celebration, **never a permanent status badge or an eternal decorative row**. Previous owner layout preference: NEON success briefly inside its card below FREE GB if it fits.

### ALL non-Neon palettes — classically sophisticated italic serif

- `SUCCESS!` should appear **elegant, tasteful, professional, italic**, borrowing the character of **Roman inscription/classical print typography**, but not as shouty faux-Roman or cartoon faux script. Prefer a **refined high-quality italic serif**, e.g. the look of classic book typography with subtly calligraphic stroke modulation, comfortable readable letterspacing, good weight and theme-appropriate contrast. Porcelain is clean and graceful with restrained ruby/warm accents; Midnight uses elegant pale/chrome-ink contrast with subdued red highlight; Ocean should harmonize with its existing sea/teal palette. Avoid gaudy outlines, randomly mixed fonts, fake bold, clipped italic overhangs, and an excessive letter spacing that hurts readability.
- **Exact choreography:** build letter by letter `S` → `SU` → `SUC` ... → `SUCCESS!`; then completed word **ON → OFF** (first flash); **ON → OFF** (second flash); **ON and HOLD** for a distinct longer beat (third appearance); then fade/snap away leaving **NO SUCCESS!** element or permanent reserved label. A new independently verified save **starts again from S**, even after the previous run. Keep timing smooth, polished, short and accessible.
- Use existing licensed/system font stacks if possible (possible system fallbacks `Iowan Old Style`, `Palatino Linotype`, `Book Antiqua`, `Georgia`, `serif` with italic CSS). If an additional bundled typeface is genuinely required, verify font redistribution rights and bundle legally; do not fetch remote Google Fonts dynamically or ship an unlicensed commercial font. **Do not commit to one font choice without showing owner a side-by-side real-rendered preview** of a few tasteful options.
- Place temporary text **inside the correct provider card** without covering GO TO, FREE GB, status or count; earlier owner preference suggested between GO TO and FREE GB for non-Neon when the layout permits. The card returns to its original resting geometry after cleanup.

### Shared success correctness

- Verify a **canonical provider-tagged, final successful transfer receipt** before celebrating. Deduplicate by a stable per-save delivery ID; do not increment counters from login, start, failed upload, retries without proof, history loading, storage hydration, or Shelf reopening.
- Preserve and reuse existing global odometer / History receipts. If a lifetime count for an individual cloud cannot be reconstructed honestly, do not claim it is complete; use verified existing data or introduce properly documented future recording without pretending past counts exist.
- Theme switching, navigation, reopened Shelf, rapid sequential saves and worker restarts may not strand success text or drop valid persistence. Consider responsive layout, high zoom, `prefers-reduced-motion`, meaningful accessible status announcements without repetitive screen-reader blinking.
- Preserve provider card actions and all existing theme/brand geometry; changes should be small, composable, isolated and visually premium, not a Shelf redesign.

## C. Testing matrix and actual proof required

1. **Baseline:** show exact branch/head, relevant existing source and last Codex changes. Identify with evidence why save-impact is absent and whether the shared event is written/listened to on each cloud route. Note the working falling ball and confirm it still works.
2. **Provider matrix:** Cloudflare R2, Google Drive, Dropbox, OneDrive. For each: authenticated supported right-click dispatch, arrival pulse (when browser permissions permit), genuinely verified completion, failure, cancelled/uncertain, OAuth/connection without saving, and repeated different jobs. Document `PASS / FAIL / NOT_TESTED` per case.
3. **Events:** Ensure `redownShelfImpact` storage and/or justified replacement route works across side panel and attached popup, Shelf open/hidden, delayed completion, late listener, consecutive saves, duplicate notifications, worker restart, reduced motion. Do not use playback of past History as proof of real dispatch.
4. **Theme visuals:** Porcelain, Midnight, Ocean, NEON. Validate non-Neon italic styles, letter-by-letter/two OFF states/third hold/exact disappearance; NEON two-color flashing and no letter sequence; counts starting LARGE then shrink-to-fit only; 320px and 390px Shelf, zoom and larger totals.
5. **Evidence:** exact tests and commands, readable source diff, no weakened tests or faked passing receipts, visual screenshots and a few seconds of recorded real browser animation showing start and cleanup; record environment restrictions if installed Chrome unavailable. Test the existing celestial theme selector falling ball to show zero regression.

## D. Safety and scope locks

**ABSOLUTELY DO NOT** rebuild/modify the protected V3 right-click engine, native menu topology or authority, Cloudflare TRUE REMOTE transfer route, provider OAuth/connect scopes, privacy design, filename metadata contracts, bucket provisioning, archive consistency, source provenance, or unrelated Explorer functionality. Preserve existing checkpoints and do not edit `main` or blindly merge a divergent branch. Change only necessary Shelf presentation and narrow event-dispatch wiring; no unreviewed uploads, migrations or destructive cloud actions.

**Deliverable:** focused working implementation on the required branch; tests, changed-file inventory and justification, evidence screenshots/recordings, PASS/FAIL/NOT_TESTED matrix, correct git commit/push on working branch and concise operator acceptance steps. If real provider acceptance isn't available, state `NOT_TESTED`, not PASS.

**Explicitly excluded:** new archive-download features, mascot image creation and broader desktop/cloud Explorer roadmap. This work is only save-impact pulse restoration, themed SUCCESS! confirmation and persistent card counter presentation.
