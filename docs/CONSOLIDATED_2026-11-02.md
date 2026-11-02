# REDOWN CONSOLIDATED — November 2, 2026 integration and main promotion notes

**Source branch:** `CONSOLIDATED`  
**Target:** the repository's actual `main` branch  
**Baseline:** `codex/v3-parity-first-reconstruction` at `eada2c0e53132064cf63525b7be236104904515a`  
**Additional source:** `codex/flat-provider-native-menus` at `398ff8c306e7b625250fbcdb63f8db070e0047ad`  
**Pre-fix owner checkpoint:** `PRE-DAILY-BADGE-AND-AUTH-BALLS-11022026` at `d8b627f445dead1a72c1d09df913a370e3fb59db` (owner pushed tag).

This document describes what is **implemented in source**, what is **automatically tested**, and what remains **unverified in a real installed Chrome extension**. It is not a claim that all remote providers or Chrome context-menu behaviors have passed live acceptance.

## Architecture preserved

- **One V3 native right-click registration engine:** Cloudflare R2 is the only provider with nested bucket/folder menus. Google Drive, Dropbox and OneDrive are flat sibling provider actions. Existing V3 Explorer, Shelf, true-remote R2 Worker transfer logic, context-menu destinations, themes, History and global odometer remain the intended foundation.
- **Provider privacy:** REDOWN retains original source/page/hosting URLs in REDOWN-owned History. Browser-mediated third-party provider uploads disclose only file bytes, destination identity and necessary filename/extension/required provider metadata, not REDOWN's proprietary source provenance.
- **Authentication boundaries:** OAuth identity is not a successful save. Logged-out or failed Cloudflare account access should not produce animated dispatch balls. Cloudflare's attempted-save ball uses a live account access check; other clouds require their connected account/grant state. A ball for an authorized attempt is **not** proof of completion.
- **Shared verified-save contract:** Count and SUCCESS! are authorized only by a new, unique, durable provider-confirmed `ok: true`, `verified: true`, `completed` receipt. Cloudflare uses an exact R2 object HEAD check (key, size, ETag, metadata) linked to the active OAuth session; Google Drive reads back file identity/name/size and parent; Dropbox uses account/namespace/root-bound metadata, revision/hash/size; OneDrive uses Microsoft Graph exact-item/drive/parent/size readback. Pending, failed, uncertain and duplicate delivery IDs cannot earn a new count.
- **Accounting separation:** provider-specific permanent numbers, the cumulative lifetime odometer and the toolbar's **daily verified-save badge** all use authoritative stored receipts. The daily badge resets at local midnight, not the lifetime count. The toolbar completion flash follows a newly committed verified receipt rather than a URL or a timer. OneDrive confirmed receipts can be reconciled if local History persistence was interrupted, without reuploading.
- **Presentation separation:** temporary SUCCESS! appears inside the corresponding provider card only after a verified event. Its timeouts control letter materialization and flashes **after** the verified event; they must never create a success themselves. Classic themes use the italic-serif sequential type-in / two short flashes / longer third hold; Neon has its larger SNES-style green treatment. Energy balls/impact effects remain a separate save-attempt animation.
- **Cloudflare action layout:** the large Cloudflare card retains its heading/connection status, but its bottom action uses the same visual pattern as the other cards: **Manage** with a gear icon (no external arrow), a permanent verified-save number, and **Free 10 GB**. A verifier-triggered SUCCESS! overlay fills that action's actual bounds, not an arbitrary strip on the card. Neon keeps its hot-pink square number bezel; Porcelain/Midnight/Ocean use polished theme-specific instrument-style number displays.
- **Copy and History:** the logo subtitle is **Your Cloud Companion**, the primary tab is **REMOTES**, and the Cloudflare heading says **Your Privacy**. History bottom lines show one provider plus a truthful slash-style saved destination, without repeating bucket/profile names. Dropbox uses verified saved paths, OneDrive its known root/file, Google Drive its known folder path or ID and file, Cloudflare its exact bucket/key. Only genuine provider-owned file links are shown; Cloudflare requires an explicitly Worker-returned public URL rather than a constructed URL for a potentially private object. History GO TO keeps its existing authorization and exact-location rules.

## Automated test status (not live proof)

- The focused `CONSOLIDATED verified-card receipt and animation contract` GitHub Actions workflow has passed on the latest November 2 source: the suite covers verified counts, daily badge rollover/deduplication, logged-out animation gating, Cloudflare-session-bound SUCCESS!, provider-card overlay placement, and History destination display. Workflow: `.github/workflows/consolidated-verified-cards.yml`.
- **The broader Reliability regression gate is failing** on the source branch and has not been declared release-ready. Resolve individual failures instead of treating a focused green workflow as complete project acceptance.
- **NOT TESTED HERE:** real installed Chrome authenticated saves for all providers; Cloudflare R2 Worker and OAuth live verification; Dropbox OAuth window and namespace recovery; V3 native menu behavior on existing installation state; full History GO TO/browser split view behavior; pixel-accurate narrow Shelf screenshots across all themes; background worker restart and multi-window races.
- The separate bugs and acceptance plans remain open under `bugs/CRITICAL/` and `NEED_TO_DO/11022026.md`. No claim that the broader P0s are closed.

## The latest ideas, explicitly **not implemented**

1. **SKI API, a design-time layout compiler:** map Shelf text and containers to the Shelf's dimensions, refine positions mathematically, then export responsive, ordinary CSS. Do not run a heavyweight positioning engine at runtime or replace real accessibility/layout constraints with rigid pixels. See `IDEAS/SKI_API_DESIGN_TIME_LAYOUT_COMPILER_2026-11-02.md`.
2. **The Unseen Odometer:** keep the real lifetime count updating on *every* verified save, but let the visually presented odometer remain at its last truly seen number while the Shelf is closed/hidden. When reopened after, for example, 2,000 verified saves accumulated over weeks, animate an approximately ten-second mechanical catch-up to the true stored total. Store last-visible presentation separately; preserve current count, History, daily badge, and no fake SUCCESS! events.
3. **Save-velocity special effects:** greater numbers of actual verified saves in a bounded time window produce progressively richer theme-specific effects; count real receipts, not animation frames or historical hydration.
4. **Millionth-save rollover:** when crossing the real `999,999 → 1,000,000` threshold, shake the odometer, reveal an additional glowing **leftmost** digit tile, roll that tile to **1**, roll the previous six digits to **000000**, and cycle briefly through the palette before returning to the selected theme. The cumulative authoritative count never resets. Support a once-only reveal if this threshold was crossed while the Shelf was closed, plus reduced-motion/mute safeguards.

Ideas 2–4 are documented in `IDEAS/TO IMPLEMENT.md` and `NEED_TO_DO/11022026.md`. No source implementation is implied by their addition.

## Main-branch history preservation

At the start of this promotion, `main` and `CONSOLIDATED` had diverged. Main had **nine commits** not present in CONSOLIDATED, including proprietor-source licensing/owner-only installation disclosures, AMOEBE ideas and a flat-menu change subsequently reverted. Promotion should be performed by a **non-force merge** that retains those main-side changes and adds the CONSOLIDATED work. In particular, preserve main's newer **Proprietary Source License 2.1** in `LICENSE` and `extension/LICENSE`, the owner-only setup/disclaimer in `README.md`, and the existing main-only ideas and to-do entries. Do not overwrite main with a force push or replace its historical commits.

## Owner local checkout

The user's Windows checkout was still on `CONSOLIDATED` and behind the newest remote commits in the supplied terminal transcript. Untracked local laboratory/report files are intentionally **outside** this remote promotion and must not be added automatically. To switch to promoted main once the remote merge is confirmed:

```bat
git fetch origin
git switch main
git pull --ff-only origin main
```

If a local `main` branch does not exist, use `git switch -c main --track origin/main`. Do not use `git add .` to solve local untracked-file warnings.

**Release acceptance:** Merge source history and preserve documents first, then run complete reliability tests and installed-Chrome smoke tests. The merge itself is not production validation.
