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

## BUG-2026-11-02-B — Little ball save animation is not shared by the other cloud providers

**Owner report:** The small ball animation/flourish present in part of REDOWN was not carried across to the other cloud-provider save cards.

**Required behavior:** The same recognizable little-ball save/arrival animation family should be available in **all applicable provider cards** (Cloudflare R2, Google Drive, Dropbox and OneDrive, when connected and supported), themed consistently but without erasing each card's identity. Trigger only on a **new, genuinely verified successful save**. A reconnect, login, attempted/failed/cancelled/uncertain transfer, duplicate event, History rerender, Shelf reopening or refreshed count must not produce a false celebration. Preserve independent provider event identity, no duplicated flashes, accessibility/reduced-motion and mute settings. The flourish must not block upload or file navigation.

**Test:** Capture before/after visual recordings of each provider, with successful, failed, uncertain and resumed/deduplicated cases; verify listener wiring, animation DOM/CSS and lifecycle, both when Shelf is open and when it opens after a completed save.

## BUG-2026-11-02-C — NEON provider-card counter appears as an ugly bare number

**Owner report:** Each provider's NEON theme card currently shows a lone number without cohesive visual styling, making the card look unfinished.

**Required behavior:** Keep a **persistent, truthful cumulative count of confirmed saves** for each supported provider card, but redesign how the number is framed/positioned/typographically displayed in NEON so it looks intentionally integrated into the arcade/SNES-inspired theme, not like a stranded integer. Use complementary original pixel/retro-futuristic art direction, refined spacing/contrast/outline/shadow treatment and maintain readability within the card. Other themes need their own aesthetically harmonious typography rather than inheriting an inappropriate Neon-only effect. **Count continues increasing; digits must not be clipped as the value grows.** Allow text to scale or layout to adapt for very large counts, without arbitrary resetting or fake saves.

**Tests:** 0, 1, 9, 10, 99, 999, 10,000 and much larger values; all providers, narrow Shelf widths, Neon/Porcelain/Midnight, reduced motion/zoom, persistent reload and deduplicated receipt counts. Owner should visually approve final appearance instead of counting DOM presence as visual acceptance.

## BUG-2026-11-02-D — SUCCESS! is incorrectly treated as a permanent label instead of temporary SNES-like save flash

**Owner correction:** The green **SUCCESS!** with bright yellow shadow/offset/double-impression is a **short, flashing, SNES-era celebration** that appears **when a file has been saved**, then **disappears**. It must NOT remain permanently on the card. A persistent provider save counter and a transient `SUCCESS!` announcement are two different UI elements with different lifetimes.

**Required behavior:**
- When a verified transfer first completes, briefly flash the green `SUCCESS!` text with an original yellow drop-shadow/doubled-offset treatment reminiscent of classic console-game success feedback. Use a short, legible animation (a few beats) and a clean automatic exit, returning the card to its ordinary resting state.
- Keep the label **inside the relevant provider card**, without replacing GO TO, FREE GB, provider status or the durable number. Earlier owner layout direction: Neon can place its temporary text beneath FREE GB; other card themes can use the region between GO TO and FREE GB if this fits without collision. Final placement should be checked in actual screenshots rather than interpreted as a permanent extra row.
- If the owner has not selected the precise yellow shadow variant, show small alternative treatments for visual approval. Do not lock in a generic unstyled text label or permanent glowing success badge.
- No flash for login, authentication, network start, progress, failed/cancelled/uncertain writes, retry without a newly verified commit, merely viewing History, or restoring prior counts. Preserve truthful UI status and a non-flashing reduced-motion alternative; avoid repetitive screen-reader announcements.

**Test:** Verify newly completed saves for each provider; multiple back-to-back saves; opening/closing Shelf during transfer; repeated receipts; verified completion while Shelf is closed; narrow/theme/zoom layouts; correct removal after animation; persistent counter remains; no stale SUCCESS! on reopening.

## Delivery and non-regression requirements

1. Audit the **actual most recent Codex changes**, existing Shelf provider-card templates, save notification/ball animation dispatch, counter persistence, Dropbox filename resolution and provider upload requests. Record exact source files, baseline/screenshots and root-cause findings. Do not claim that a prior Codex pass proved these UX requirements.
2. Keep filename correctness, permanent save counting, temporary celebration, and ball flourish as **four independently tested concerns**; implement shared presentation hooks where appropriate instead of duplicating inconsistent per-provider behavior. Respect provider-specific source-fetch constraints and leave provider credentials/remote-upload semantics isolated.
3. Run targeted unit/integration tests and **real installed Chrome plus genuine provider tests**. Publish visual proof for Neon card art and timed SUCCESS! flash. Record PASS / FAIL / NOT_TESTED honestly.
4. Preserve the protected V3 native menu engine, Cloudflare TRUE REMOTE route, Google/Dropbox/OneDrive authorization, private REDOWN-owned provenance, History receipts, Keep Both behavior and user destinations. Do not use this UX report to reset remote files or introduce unrelated provider changes.

**Tracking:** Also added to `NEED_TO_DO/11022026.md`. Bug status remains OPEN until the relevant code and live/visual acceptance prove it.
